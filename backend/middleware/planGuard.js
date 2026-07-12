/**
 * LRAT Plan Guard Middleware
 * Use to protect routes that require an active subscription.
 */
const billing = require('../services/billing');
const { getDb } = require('../config/database');

/**
 * Middleware: Requires an active subscription (trial or paid).
 * Blocks if trial has expired or subscription is canceled.
 */
function requireActiveSubscription(req, res, next) {
  try {
    const db = getDb();
    const user = db.prepare(
      'SELECT plan_type, plan_status, trial_ends_at FROM users WHERE id = ?'
    ).get(req.userId);

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    if (!billing.isSubscriptionActive(user)) {
      const reason = billing.isTrialExpired(user)
        ? 'Your 14-day free trial has expired. Please upgrade to continue.'
        : 'Your subscription is inactive. Please renew your plan to continue.';

      return res.status(402).json({
        success: false,
        error: reason,
        subscription_required: true,
        plan_type: user.plan_type,
        plan_status: user.plan_status,
      });
    }

    // Attach plan info to request for use in route handlers
    req.userPlan = {
      type: user.plan_type,
      status: user.plan_status,
      isActive: true,
      limits: billing.getPlanLimits(user.plan_type),
    };

    next();
  } catch (err) {
    console.error('[Plan Guard] Error:', err.message);
    next(); // Fail open — don't block on middleware errors
  }
}

/**
 * Middleware: Requires a specific plan tier or higher.
 * Usage: planGuard.requirePlan('professional')
 *
 * Plan hierarchy: trial < starter < professional < enterprise
 */
function requirePlan(minimumPlan) {
  const hierarchy = ['trial', 'starter', 'professional', 'enterprise', 'free'];

  return (req, res, next) => {
    try {
      const db = getDb();
      const user = db.prepare('SELECT plan_type, plan_status, trial_ends_at FROM users WHERE id = ?').get(req.userId);
      if (!user) return res.status(401).json({ success: false, error: 'User not found' });

      if (!billing.isSubscriptionActive(user)) {
        return res.status(402).json({
          success: false,
          error: 'Your subscription is not active.',
          subscription_required: true,
        });
      }

      const userLevel = hierarchy.indexOf(user.plan_type);
      const requiredLevel = hierarchy.indexOf(minimumPlan);

      // 'free' users bypass plan-level checks (grandfathered)
      if (user.plan_type === 'free') return next();

      if (userLevel < requiredLevel) {
        const requiredPlanLimits = billing.getPlanLimits(minimumPlan);
        return res.status(403).json({
          success: false,
          error: `This feature requires the ${requiredPlanLimits.label} plan or higher.`,
          upgrade_required: true,
          required_plan: minimumPlan,
          current_plan: user.plan_type,
        });
      }

      next();
    } catch (err) {
      console.error('[Plan Guard] Error:', err.message);
      next();
    }
  };
}

module.exports = { requireActiveSubscription, requirePlan };
