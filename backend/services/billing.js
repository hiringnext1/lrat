/**
 * LRAT Billing Service
 * Handles plan logic, Stripe integration, and subscription management.
 */
const { getDb } = require('../config/database');

// ── Plan Definitions ──────────────────────────────────────────────────────────
const PLANS = {
  trial: {
    label: 'Free Trial',
    accounts_limit: 1,
    campaigns_limit: 2,
    daily_connections: 25,
    price_usd_monthly: 0,
    stripe_price_id_monthly: null,
    stripe_price_id_yearly: null,
  },
  starter: {
    label: 'Starter Playbook',
    accounts_limit: 1,
    campaigns_limit: 5,
    daily_connections: 25,
    price_usd_monthly: 39,
    stripe_price_id_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || null,
    stripe_price_id_yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || null,
  },
  professional: {
    label: 'Professional Engine',
    accounts_limit: 3,
    campaigns_limit: 20,
    daily_connections: 25,
    price_usd_monthly: 119,
    stripe_price_id_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || null,
    stripe_price_id_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || null,
  },
  enterprise: {
    label: 'Enterprise Cluster',
    accounts_limit: 10,
    campaigns_limit: 9999,
    daily_connections: 25,
    price_usd_monthly: 349,
    stripe_price_id_monthly: process.env.STRIPE_PRICE_ENT_MONTHLY || null,
    stripe_price_id_yearly: process.env.STRIPE_PRICE_ENT_YEARLY || null,
  },
  // Grandfathered/manual plan for existing users
  free: {
    label: 'Free (Grandfathered)',
    accounts_limit: 3,
    campaigns_limit: 10,
    daily_connections: 25,
    price_usd_monthly: 0,
    stripe_price_id_monthly: null,
    stripe_price_id_yearly: null,
  },
};

// Trial duration: 14 days
const TRIAL_DAYS = 14;

/**
 * Get plan limits for a given plan type.
 */
function getPlanLimits(planType) {
  return PLANS[planType] || PLANS.trial;
}

/**
 * Get all available plans (for frontend display).
 */
function getAllPlans() {
  return PLANS;
}

/**
 * Check if a user's trial has expired.
 */
function isTrialExpired(user) {
  if (user.plan_type !== 'trial') return false;
  if (!user.trial_ends_at) return false;
  return new Date(user.trial_ends_at) < new Date();
}

/**
 * Check if a user has an active (billable) subscription.
 * Trial, active, and trialing statuses are all "active" for feature access.
 */
function isSubscriptionActive(user) {
  if (!user) return false;

  // Free/grandfathered users always active
  if (user.plan_type === 'free') return true;

  // Trial: check expiry
  if (user.plan_type === 'trial') {
    return !isTrialExpired(user);
  }

  // Paid plans: check status
  return ['active', 'trialing'].includes(user.plan_status);
}

/**
 * Get days remaining in trial.
 */
function getTrialDaysRemaining(user) {
  if (user.plan_type !== 'trial' || !user.trial_ends_at) return 0;
  const diff = new Date(user.trial_ends_at) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Check if a user can add more LinkedIn accounts.
 * Returns { allowed: bool, current: number, limit: number }
 */
function canAddAccount(userId) {
  const db = getDb();
  const user = db.prepare('SELECT plan_type, plan_status, plan_accounts_limit, trial_ends_at FROM users WHERE id = ?').get(userId);
  if (!user) return { allowed: false, current: 0, limit: 0, reason: 'User not found' };

  const currentCount = db.prepare('SELECT COUNT(*) as c FROM accounts WHERE user_id = ?').get(userId).c;
  const limit = user.plan_accounts_limit || getPlanLimits(user.plan_type).accounts_limit;

  if (currentCount >= limit) {
    return {
      allowed: false,
      current: currentCount,
      limit,
      plan: user.plan_type,
      reason: `Your ${getPlanLimits(user.plan_type).label} plan allows ${limit} LinkedIn account(s).`,
    };
  }

  return { allowed: true, current: currentCount, limit, plan: user.plan_type };
}

/**
 * Activate trial for a newly verified user (called from auth route on verify-signup).
 */
function activateTrial(userId) {
  const db = getDb();
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    `UPDATE users SET plan_type = 'trial', plan_status = 'trialing', plan_accounts_limit = 1, trial_ends_at = ? WHERE id = ?`
  ).run(trialEndsAt, userId);
  console.log(`[Billing] Trial activated for user ${userId} — expires ${trialEndsAt}`);
}

/**
 * Upgrade a user's plan after successful Stripe payment.
 * Called from webhook handler.
 */
function upgradePlan(userId, planType, stripeData = {}) {
  const db = getDb();
  const plan = getPlanLimits(planType);

  db.prepare(`
    UPDATE users SET
      plan_type = ?,
      plan_status = 'active',
      plan_accounts_limit = ?,
      stripe_customer_id = COALESCE(?, stripe_customer_id),
      stripe_subscription_id = COALESCE(?, stripe_subscription_id),
      stripe_price_id = COALESCE(?, stripe_price_id),
      current_period_end = COALESCE(?, current_period_end),
      cancel_at_period_end = 0
    WHERE id = ?
  `).run(
    planType,
    plan.accounts_limit,
    stripeData.customerId || null,
    stripeData.subscriptionId || null,
    stripeData.priceId || null,
    stripeData.currentPeriodEnd || null,
    userId
  );

  console.log(`[Billing] User ${userId} upgraded to ${planType} plan`);
}

/**
 * Update plan status (e.g., past_due, canceled) from webhook.
 */
function updatePlanStatus(userId, status, extraData = {}) {
  const db = getDb();
  db.prepare(`
    UPDATE users SET
      plan_status = ?,
      current_period_end = COALESCE(?, current_period_end),
      cancel_at_period_end = COALESCE(?, cancel_at_period_end)
    WHERE id = ?
  `).run(status, extraData.currentPeriodEnd || null, extraData.cancelAtPeriodEnd ?? null, userId);
  console.log(`[Billing] User ${userId} plan status updated to: ${status}`);
}

/**
 * Find a user by Stripe customer ID.
 */
function getUserByStripeCustomer(stripeCustomerId) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?').get(stripeCustomerId);
}

/**
 * Log a billing event (for audit trail).
 */
function logBillingEvent(userId, eventType, gateway, stripeEventId, payload) {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO billing_events (user_id, event_type, gateway, stripe_event_id, payload) VALUES (?, ?, ?, ?, ?)`
    ).run(userId, eventType, gateway, stripeEventId || null, JSON.stringify(payload));
  } catch (err) {
    console.error('[Billing] Failed to log billing event:', err.message);
  }
}

/**
 * Resolve plan_type from a Stripe Price ID.
 * Maps price IDs back to plan names.
 */
function getPlanFromPriceId(priceId) {
  if (!priceId) return 'starter';
  const priceMap = {
    [process.env.STRIPE_PRICE_STARTER_MONTHLY]: 'starter',
    [process.env.STRIPE_PRICE_STARTER_YEARLY]: 'starter',
    [process.env.STRIPE_PRICE_PRO_MONTHLY]: 'professional',
    [process.env.STRIPE_PRICE_PRO_YEARLY]: 'professional',
    [process.env.STRIPE_PRICE_ENT_MONTHLY]: 'enterprise',
    [process.env.STRIPE_PRICE_ENT_YEARLY]: 'enterprise',
  };
  return priceMap[priceId] || 'starter';
}

module.exports = {
  PLANS,
  TRIAL_DAYS,
  getPlanLimits,
  getAllPlans,
  isTrialExpired,
  isSubscriptionActive,
  getTrialDaysRemaining,
  canAddAccount,
  activateTrial,
  upgradePlan,
  updatePlanStatus,
  getUserByStripeCustomer,
  logBillingEvent,
  getPlanFromPriceId,
};
