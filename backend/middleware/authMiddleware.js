const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');
const billing = require('../services/billing');
const { createLogger } = require('../services/logger');

const log = createLogger('Auth');

// S1: No hardcoded fallback — JWT_SECRET MUST be set in .env
const JWT_SECRET = process.env.JWT_SECRET;

function authenticateJWT(req, res, next) {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }

  if (!JWT_SECRET) {
    log.fatal('JWT_SECRET not configured — cannot verify tokens');
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;

    // E2: Attach billing plan info to req (requires already at module level)
    try {
      const db = getDb();
      const user = db.prepare(
        'SELECT plan_type, plan_status, plan_accounts_limit, trial_ends_at, role, onboarding_completed FROM users WHERE id = ?'
      ).get(decoded.userId);

      if (user) {
        req.userRole = user.role || 'user';
        req.userOnboardingCompleted = user.onboarding_completed || 0;
        req.userPlan = {
          type: user.plan_type || 'trial',
          status: user.plan_status || 'trialing',
          accountsLimit: user.plan_accounts_limit || 1,
          isActive: billing.isSubscriptionActive(user),
          trialDaysLeft: billing.getTrialDaysRemaining(user),
          limits: billing.getPlanLimits(user.plan_type || 'trial'),
        };
      }
    } catch (_) {
      // Billing info attachment is non-blocking
    }

    next();
  } catch (err) {
    log.warn({ err: err.message, ip: req.ip }, 'Invalid token presented');
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }
}

module.exports = authenticateJWT;
