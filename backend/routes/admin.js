const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');

// Plan value configuration for MRR calculation
const PLAN_VALUES = {
  starter: 49,
  solo: 49,
  professional: 99,
  agency: 99,
  enterprise: 199,
  scale: 199,
  free: 0,
  trial: 0
};

// GET SaaS KPIs and System Metrics
router.get('/metrics', (req, res) => {
  try {
    const db = getDb();
    
    // 1. Calculate MRR
    const paidUsers = db.prepare(`
      SELECT plan_type 
      FROM users 
      WHERE plan_status = 'active' 
        AND plan_type IS NOT NULL 
        AND plan_type NOT IN ('free', 'trial')
    `).all();
    
    let mrr = 0;
    paidUsers.forEach(u => {
      const plan = u.plan_type.toLowerCase();
      mrr += PLAN_VALUES[plan] || 0;
    });

    // 2. Total Subscribers (active paid plans)
    const activeSubscribers = paidUsers.length;

    // 3. Churn Rate calculation
    const canceledSubscribers = db.prepare("SELECT COUNT(*) as c FROM users WHERE plan_status = 'canceled'").get().c;
    const totalSubscribers = activeSubscribers + canceledSubscribers;
    const churnRate = totalSubscribers > 0 ? parseFloat(((canceledSubscribers / totalSubscribers) * 100).toFixed(1)) : 0;

    // 4. System health indicators
    const totalUsers = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
    const activeCampaigns = db.prepare("SELECT COUNT(*) as c FROM campaigns WHERE status = 'active' OR status = 'running'").get().c;
    const totalLeads = db.prepare("SELECT COUNT(*) as c FROM leads").get().c;
    const activeAccounts = db.prepare("SELECT COUNT(*) as c FROM accounts WHERE is_active = 1").get().c;

    res.json({
      success: true,
      data: {
        mrr,
        churnRate,
        totalSubscribers,
        totalUsers,
        activeCampaigns,
        totalLeads,
        activeAccounts
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET All Users
router.get('/users', (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare(`
      SELECT id, email, name, company_name, designation, 
             plan_type, plan_status, plan_accounts_limit, trial_ends_at,
             role, onboarding_completed, onboarding_step, last_login, created_at 
      FROM users 
      ORDER BY id DESC
    `).all();

    // Enrich users with account counts and campaign counts
    const enrichedUsers = users.map(user => {
      const accountsCount = db.prepare("SELECT COUNT(*) as c FROM accounts WHERE user_id = ?").get(user.id).c;
      const campaignsCount = db.prepare("SELECT COUNT(*) as c FROM campaigns WHERE user_id = ?").get(user.id).c;
      return {
        ...user,
        accountsCount,
        campaignsCount
      };
    });

    res.json({
      success: true,
      data: enrichedUsers
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT Modify user plan & limits manually
router.put('/users/:id/plan', (req, res) => {
  try {
    const db = getDb();
    const userId = req.params.id;
    const { plan_type, plan_status, plan_accounts_limit, trial_ends_at } = req.body;

    if (!plan_type || !plan_status) {
      return res.status(400).json({ success: false, error: 'Plan type and status are required' });
    }

    db.prepare(`
      UPDATE users 
      SET plan_type = ?, plan_status = ?, plan_accounts_limit = ?, trial_ends_at = ? 
      WHERE id = ?
    `).run(
      plan_type,
      plan_status,
      plan_accounts_limit !== undefined ? parseInt(plan_accounts_limit, 10) : 1,
      trial_ends_at || null,
      userId
    );

    res.json({
      success: true,
      message: 'User plan updated successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT Modify user role manually
router.put('/users/:id/role', (req, res) => {
  try {
    const db = getDb();
    const userId = req.params.id;
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid or missing role' });
    }

    // A user cannot demote themselves to prevent losing access to admin features
    if (parseInt(userId, 10) === req.userId && role !== 'admin') {
      return res.status(400).json({ success: false, error: 'You cannot demote yourself from admin role' });
    }

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);

    res.json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
