const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const billing = require('../services/billing');
const emailService = require('../services/emailService');
const authenticateJWT = require('../middleware/authMiddleware');

// Lazy-load Stripe to avoid crash if STRIPE_SECRET_KEY is not set yet
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes('sk_test_paste') || key.includes('sk_live_paste')) {
    return null;
  }
  return require('stripe')(key);
}

// ─── GET /api/billing/status ─────────────────────────────────────────────────
// Returns current user's full plan status, usage, trial info
router.get('/status', authenticateJWT, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare(
      `SELECT id, email, name, plan_type, plan_status, plan_accounts_limit,
              trial_ends_at, stripe_customer_id, stripe_subscription_id,
              current_period_end, cancel_at_period_end
       FROM users WHERE id = ?`
    ).get(req.userId);

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const planLimits = billing.getPlanLimits(user.plan_type);
    const accountsUsed = db.prepare('SELECT COUNT(*) as c FROM accounts WHERE user_id = ?').get(req.userId).c;
    const campaignsUsed = db.prepare('SELECT COUNT(*) as c FROM campaigns WHERE user_id = ?').get(req.userId).c;
    const isActive = billing.isSubscriptionActive(user);
    const trialDaysLeft = billing.getTrialDaysRemaining(user);
    const trialExpired = billing.isTrialExpired(user);

    res.json({
      success: true,
      data: {
        plan: {
          type: user.plan_type,
          status: user.plan_status,
          label: planLimits.label,
          isActive,
          trialDaysLeft,
          trialExpired,
          trialEndsAt: user.trial_ends_at,
          currentPeriodEnd: user.current_period_end,
          cancelAtPeriodEnd: !!user.cancel_at_period_end,
        },
        usage: {
          accounts: { used: accountsUsed, limit: user.plan_accounts_limit || planLimits.accounts_limit },
          campaigns: { used: campaignsUsed, limit: planLimits.campaigns_limit },
        },
        limits: planLimits,
        hasStripe: !!user.stripe_customer_id,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/billing/create-checkout ───────────────────────────────────────
// Creates a Stripe Checkout Session and returns the URL
router.post('/create-checkout', authenticateJWT, async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: 'Stripe is not configured yet. Please add STRIPE_SECRET_KEY to your .env file.',
      });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const { priceId, planType, billingCycle } = req.body;
    if (!priceId && !planType) {
      return res.status(400).json({ success: false, error: 'priceId or planType is required' });
    }

    // Resolve price ID from planType + billingCycle if not directly provided
    let resolvedPriceId = priceId;
    if (!resolvedPriceId && planType) {
      const plan = billing.getPlanLimits(planType);
      resolvedPriceId = billingCycle === 'yearly'
        ? plan.stripe_price_id_yearly
        : plan.stripe_price_id_monthly;
    }

    if (!resolvedPriceId) {
      return res.status(400).json({
        success: false,
        error: 'No Stripe Price ID configured for this plan. Please check your .env file.',
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Create or reuse Stripe customer
    let stripeCustomerId = user.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || user.email,
        metadata: { lrat_user_id: String(user.id) },
      });
      stripeCustomerId = customer.id;
      db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(stripeCustomerId, user.id);
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: user.plan_type === 'trial' ? 14 : undefined,
        metadata: { lrat_user_id: String(user.id), plan_type: planType || 'starter' },
      },
      success_url: `${frontendUrl}/dashboard/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/dashboard/billing?status=canceled`,
      client_reference_id: String(user.id),
      allow_promotion_codes: true,
      metadata: { lrat_user_id: String(user.id), plan_type: planType || 'starter' },
    });

    res.json({ success: true, checkout_url: session.url, session_id: session.id });
  } catch (err) {
    console.error('[Billing] Checkout session error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/billing/create-portal ─────────────────────────────────────────
// Creates a Stripe Customer Portal session (manage billing, cancel, download invoices)
router.post('/create-portal', authenticateJWT, async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ success: false, error: 'Stripe is not configured.' });
    }

    const db = getDb();
    const user = db.prepare('SELECT stripe_customer_id FROM users WHERE id = ?').get(req.userId);
    if (!user?.stripe_customer_id) {
      return res.status(400).json({
        success: false,
        error: 'No billing account found. Please subscribe to a plan first.',
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${frontendUrl}/dashboard/billing`,
    });

    res.json({ success: true, portal_url: portalSession.url });
  } catch (err) {
    console.error('[Billing] Portal session error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/billing/invoices ────────────────────────────────────────────────
// Lists past invoices from Stripe
router.get('/invoices', authenticateJWT, async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.json({ success: true, data: [] });

    const db = getDb();
    const user = db.prepare('SELECT stripe_customer_id FROM users WHERE id = ?').get(req.userId);
    if (!user?.stripe_customer_id) return res.json({ success: true, data: [] });

    const invoices = await stripe.invoices.list({
      customer: user.stripe_customer_id,
      limit: 12,
    });

    const simplified = invoices.data.map(inv => ({
      id: inv.id,
      number: inv.number,
      amount: inv.amount_paid / 100,
      currency: inv.currency.toUpperCase(),
      status: inv.status,
      date: new Date(inv.created * 1000).toISOString(),
      pdf: inv.invoice_pdf,
      hosted_url: inv.hosted_invoice_url,
    }));

    res.json({ success: true, data: simplified });
  } catch (err) {
    console.error('[Billing] Invoices fetch error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/billing/webhook ────────────────────────────────────────────────
// Stripe Webhook endpoint — NO JWT auth, uses Stripe signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.json({ received: true }); // silent accept if not configured

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[Billing Webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  const db = getDb();
  console.log(`[Billing Webhook] Event received: ${event.type}`);

  try {
    switch (event.type) {
      // ── Checkout completed (first subscription purchase) ──
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = parseInt(session.client_reference_id || session.metadata?.lrat_user_id);
        const planType = billing.getPlanFromPriceId(session?.subscription) || session.metadata?.plan_type || 'starter';

        if (userId) {
          // Fetch full subscription details
          let subData = {};
          if (session.subscription) {
            const sub = await stripe.subscriptions.retrieve(session.subscription);
            const priceId = sub.items.data[0]?.price?.id;
            const resolvedPlan = billing.getPlanFromPriceId(priceId);
            subData = {
              customerId: session.customer,
              subscriptionId: session.subscription,
              priceId,
              currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
            };
            billing.upgradePlan(userId, resolvedPlan, subData);
          } else {
            billing.upgradePlan(userId, planType, { customerId: session.customer });
          }

          billing.logBillingEvent(userId, 'checkout.session.completed', 'stripe', event.id, session);
          console.log(`[Billing Webhook] ✅ User ${userId} subscribed — plan upgraded`);

          // Send welcome email
          try {
            const user = db.prepare('SELECT email, name FROM users WHERE id = ?').get(userId);
            if (user) await emailService.sendSubscriptionWelcomeEmail(user.email, user.name, planType);
          } catch (_) {}
        }
        break;
      }

      // ── Invoice paid (recurring renewal) ──
      case 'invoice.paid': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const user = billing.getUserByStripeCustomer(customerId);
        if (user) {
          // Update period end from subscription
          if (invoice.subscription) {
            const sub = await stripe.subscriptions.retrieve(invoice.subscription);
            const priceId = sub.items.data[0]?.price?.id;
            const planType = billing.getPlanFromPriceId(priceId);
            billing.upgradePlan(user.id, planType, {
              subscriptionId: invoice.subscription,
              priceId,
              currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
            });
          }
          billing.logBillingEvent(user.id, 'invoice.paid', 'stripe', event.id, invoice);
          console.log(`[Billing Webhook] 💰 Invoice paid for user ${user.id}`);
        }
        break;
      }

      // ── Payment failed ──
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const user = billing.getUserByStripeCustomer(invoice.customer);
        if (user) {
          billing.updatePlanStatus(user.id, 'past_due');
          billing.logBillingEvent(user.id, 'invoice.payment_failed', 'stripe', event.id, invoice);
          console.log(`[Billing Webhook] ⚠️ Payment failed for user ${user.id}`);

          // Send payment failed email
          try {
            await emailService.sendPaymentFailedEmail(user.email, user.name);
          } catch (_) {}
        }
        break;
      }

      // ── Subscription updated (plan change, cancel schedule) ──
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const user = billing.getUserByStripeCustomer(sub.customer);
        if (user) {
          const priceId = sub.items.data[0]?.price?.id;
          const planType = billing.getPlanFromPriceId(priceId);
          billing.upgradePlan(user.id, planType, {
            subscriptionId: sub.id,
            priceId,
            currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
          });
          billing.updatePlanStatus(user.id, sub.status, {
            cancelAtPeriodEnd: sub.cancel_at_period_end ? 1 : 0,
          });
          billing.logBillingEvent(user.id, 'customer.subscription.updated', 'stripe', event.id, sub);
          console.log(`[Billing Webhook] 🔄 Subscription updated for user ${user.id} → ${planType}`);
        }
        break;
      }

      // ── Subscription deleted/cancelled ──
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const user = billing.getUserByStripeCustomer(sub.customer);
        if (user) {
          billing.updatePlanStatus(user.id, 'canceled');
          billing.logBillingEvent(user.id, 'customer.subscription.deleted', 'stripe', event.id, sub);
          console.log(`[Billing Webhook] ❌ Subscription canceled for user ${user.id}`);

          // Send cancellation email
          try {
            await emailService.sendSubscriptionCanceledEmail(user.email, user.name);
          } catch (_) {}
        }
        break;
      }

      default:
        console.log(`[Billing Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('[Billing Webhook] Error processing event:', err.message);
    billing.logBillingEvent(0, `error.${event.type}`, 'stripe', event.id, { error: err.message });
  }

  res.json({ received: true });
});

// ─── GET /api/billing/plans ───────────────────────────────────────────────────
// Public endpoint — returns all plan definitions for frontend pricing display
router.get('/plans', (req, res) => {
  const plans = billing.getAllPlans();
  res.json({ success: true, data: plans });
});

module.exports = router;
