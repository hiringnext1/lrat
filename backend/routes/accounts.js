const express = require('express');
const router = express.Router();
const { getDb, getSetting } = require('../config/database');
const unipile = require('../services/unipile');
const billing = require('../services/billing');
const { requireActiveSubscription } = require('../middleware/planGuard');

router.post('/connect-link', requireActiveSubscription, async (req, res) => {
  try {
    const { redirect_url } = req.body;
    const apiKey = getSetting('UNIPILE_API_KEY');
    const dsn = getSetting('UNIPILE_DSN');

    if (!apiKey || apiKey.includes('paste_your')) {
      return res.status(400).json({ success: false, error: 'Unipile API Key is missing or invalid. Please check Settings.' });
    }

    console.log(`[Unipile Debug] Using API Key (last 4): ${apiKey.slice(-4)}`);
    console.log(`[Unipile Debug] Using DSN: ${dsn}`);
    
    const successUrl = redirect_url || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/accounts?connected=1`;
    const failUrl = redirect_url || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/accounts?connected=0`;

    // Unipile V1 requires an expiry date, type, and providers array
    const expiresOn = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const requestBody = {
      type: 'create',
      providers: ['LINKEDIN'],
      api_url: dsn,
      expiresOn: expiresOn,
      success_redirect_url: successUrl,
      failure_redirect_url: failUrl,
      notify_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/api/accounts/webhook`,
      name: 'LRAT LinkedIn Account',
    };

    console.log('[Unipile Debug] Sending Request Body:', JSON.stringify(requestBody, null, 2));

    const axios = require('axios');
    const response = await axios.post(
      `${dsn}/api/v1/hosted/accounts/link`,
      requestBody,
      {
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const authUrl = response.data?.url || response.data?.link || response.data;
    if (!authUrl) {
      console.error('[Unipile] No URL in response:', response.data);
      return res.status(502).json({ success: false, error: 'Unipile did not return a connect URL' });
    }

    res.json({ success: true, url: authUrl });
  } catch (err) {
    const detail = err?.response?.data || err.message;
    console.error('[Unipile] Link Generation Failed:', detail);
    res.status(502).json({ success: false, error: 'Failed to generate connect link', details: detail });
  }
});

function calcHealthScore(acc, acceptanceRate) {
  if (acc.status === 'banned') return 0;
  let score = 100;
  if (acc.warmup_week === 0) score -= 40;
  else if (acc.warmup_week === 1) score -= 25;
  else if (acc.warmup_week === 2) score -= 15;
  else if (acc.warmup_week === 3) score -= 5;
  if (acc.status === 'warning') score -= 30;
  if (acc.status === 'paused') score -= 10;
  if (!acc.is_active) score -= 15;
  if (acceptanceRate !== null) {
    if (acceptanceRate < 15) score -= 25;
    else if (acceptanceRate < 25) score -= 10;
    else if (acceptanceRate >= 50) score += 5;
  }
  const effectiveLimit = acc.warmup_week === 0 ? 1
    : acc.warmup_week === 1 ? 5
    : acc.warmup_week === 2 ? 10
    : acc.warmup_week === 3 ? 15
    : (acc.daily_limit || 20);
  if (acc.today_connections > effectiveLimit * 0.9) score -= 10;
  return Math.max(0, Math.min(100, score));
}

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const accounts = db.prepare(`
      SELECT a.*,
        COUNT(CASE WHEN l.connection_sent_at IS NOT NULL THEN 1 END) as total_sent,
        COUNT(CASE WHEN l.accepted_at IS NOT NULL THEN 1 END) as total_accepted,
        COUNT(CASE WHEN l.reply_received = 1 THEN 1 END) as total_replied
      FROM accounts a
      LEFT JOIN leads l ON l.account_id_used = a.id
      WHERE a.user_id = ?
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `).all(req.userId);

    const enriched = accounts.map(acc => {
      const acceptanceRate = acc.total_sent > 0 ? Math.round((acc.total_accepted / acc.total_sent) * 100) : null;
      const replyRate = acc.total_accepted > 0 ? Math.round((acc.total_replied / acc.total_accepted) * 100) : null;
      const healthScore = calcHealthScore(acc, acceptanceRate);
      
      const campaigns = db.prepare(`
        SELECT c.id, c.name, c.status
        FROM campaigns c
        JOIN campaign_accounts ca ON ca.campaign_id = c.id
        WHERE ca.account_id = ?
      `).all(acc.id);

      return { 
        ...acc, 
        acceptance_rate: acceptanceRate, 
        reply_rate: replyRate, 
        health_score: healthScore,
        campaigns: campaigns
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/sync', requireActiveSubscription, async (req, res) => {
  try {
    const db = getDb();

    // ── Plan limit check ──────────────────────────────────────────────────────
    const canAdd = billing.canAddAccount(req.userId);
    if (!canAdd.allowed) {
      return res.status(402).json({
        success: false,
        error: canAdd.reason,
        upgrade_required: true,
        current: canAdd.current,
        limit: canAdd.limit,
        plan: canAdd.plan,
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    const result = await unipile.getAccounts();

    if (!result.success) {
      return res.status(502).json({ success: false, error: 'Failed to fetch accounts from Unipile', details: result.error });
    }

    let synced = 0;
    const upsert = db.prepare(`
      INSERT INTO accounts (unipile_account_id, name, email, photo_url, status, linkedin_url, user_id)
      VALUES (?, ?, ?, ?, 'active', ?, ?)
      ON CONFLICT(unipile_account_id) DO UPDATE SET
        name = excluded.name,
        email = excluded.email,
        photo_url = excluded.photo_url,
        linkedin_url = excluded.linkedin_url,
        user_id = excluded.user_id
    `);

    for (const acc of result.data) {
      const publicId = acc.public_identifier || acc.username || '';
      const url = publicId ? `https://www.linkedin.com/in/${publicId}` : '';
      
      upsert.run(
        acc.id || acc.account_id,
        acc.name || acc.username || acc.display_name || 'LinkedIn Account',
        acc.email || acc.username || '',
        acc.profile_picture_url || acc.photo || '',
        url,
        req.userId
      );
      synced++;
    }

    const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
    res.json({ success: true, synced, data: accounts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', requireActiveSubscription, (req, res) => {
  try {
    const db = getDb();
    const { daily_limit, weekly_limit, is_active, status, warmup_week } = req.body;
    const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

    const effectiveDailyLimit = Math.min(daily_limit ?? account.daily_limit, 25);

    db.prepare(
      `UPDATE accounts SET
        daily_limit = ?,
        current_day_limit = ?,
        weekly_limit = ?,
        is_active = ?,
        status = ?,
        warmup_week = ?
       WHERE id = ? AND user_id = ?`
    ).run(
      effectiveDailyLimit,
      effectiveDailyLimit, // Keep current day limit in sync with saved limit
      weekly_limit ?? account.weekly_limit,
      is_active ?? account.is_active,
      status ?? account.status,
      warmup_week ?? account.warmup_week,
      req.params.id,
      req.userId
    );

    // Emit socket update for real-time dashboard sync
    const io = req.app.get('io');
    if (io) {
      const safety = require('../services/safety');
      const updatedAcc = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
      
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as total_today,
          ROUND(CAST(SUM(CASE WHEN status != 'pending_connection' AND status != 'connection_sent' THEN 1 ELSE 0 END) AS REAL) / MAX(COUNT(*), 1) * 100, 1) as acceptance_rate,
          ROUND(CAST(SUM(CASE WHEN reply_received = 1 THEN 1 ELSE 0 END) AS REAL) / MAX(COUNT(*), 1) * 100, 1) as reply_rate
        FROM leads WHERE user_id = ?
      `).get(req.userId);

      // Recalculate global daily goal
      const allActive = db.prepare("SELECT * FROM accounts WHERE status IN ('active', 'paused') AND user_id = ?").all(req.userId);
      let dailyGoal = 0;
      for (const a of allActive) {
        dailyGoal += safety.getEffectiveDailyLimit(a);
      }

      const user = db.prepare('SELECT timezone FROM users WHERE id = ?').get(req.userId);
      const timezone = user?.timezone || 'Asia/Kolkata';
      const { hoursModifier, minutesModifier } = safety.getSqliteTimezoneModifiers(timezone);
      const todayStr = safety.getISTDateString(timezone);

      io.to('user_' + req.userId).emit('stats_update', { 
        ...stats, 
        daily_goal: dailyGoal,
        total_today: db.prepare(`SELECT COUNT(*) as c FROM activity_log WHERE action_type = 'connection_sent' AND status = 'success' AND user_id = ? AND date(created_at, '${hoursModifier}', '${minutesModifier}') = ?`).get(req.userId, todayStr).c
      });
    }

    // NEW: Auto-pause campaigns if no active accounts left
    const affectedCampaigns = db.prepare('SELECT campaign_id FROM campaign_accounts WHERE account_id = ?').all(req.params.id);
    for (const { campaign_id } of affectedCampaigns) {
      const activeCount = db.prepare(`
        SELECT COUNT(*) as c FROM campaign_accounts ca
        JOIN accounts a ON a.id = ca.account_id
        WHERE ca.campaign_id = ? AND a.is_active = 1 AND a.status = 'active'
      `).get(campaign_id).c;
      
      if (activeCount === 0) {
        db.prepare("UPDATE campaigns SET status = 'paused', updated_at = ? WHERE id = ? AND status = 'active'").run(new Date().toISOString(), campaign_id);
        console.log(`[Auto-Pause] Campaign ${campaign_id} paused due to no active accounts.`);
      }
    }

    const updated = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/warmup/start', requireActiveSubscription, (req, res) => {
  try {
    const db = getDb();
    const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

    const now = new Date().toISOString();
    db.prepare(
      'UPDATE accounts SET warmup_week = 1, warmup_started_at = ? WHERE id = ? AND user_id = ?'
    ).run(now, req.params.id, req.userId);

    const updated = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    res.json({ success: true, data: updated, message: 'Warmup started — Week 1 (5 connections/day)' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/stats', (req, res) => {
  try {
    const db = getDb();
    const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

    const recentActivity = db.prepare(
      `SELECT * FROM activity_log WHERE account_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 20`
    ).all(req.params.id, req.userId);

    res.json({
      success: true,
      data: {
        today_connections: account.today_connections,
        today_messages: account.today_messages,
        week_connections: account.week_connections,
        daily_limit: account.daily_limit,
        weekly_limit: account.weekly_limit,
        warmup_week: account.warmup_week,
        last_action_at: account.last_action_at,
        recent_activity: recentActivity,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', requireActiveSubscription, async (req, res) => {
  try {
    const db = getDb();
    const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

    // NEW: Find campaigns using this account before deleting
    const affectedCampaigns = db.prepare('SELECT campaign_id FROM campaign_accounts WHERE account_id = ?').all(req.params.id);

    // 1. Delete from Unipile first
    console.log(`[Unipile] Deleting account from provider: ${account.unipile_account_id}`);
    const result = await unipile.deleteAccount(account.unipile_account_id);
    
    if (!result.success) {
      console.warn(`[Unipile] Could not delete from provider (might already be gone):`, result.error);
    }

    // 2. Delete from local database
    db.prepare('UPDATE leads SET account_id_used = NULL WHERE account_id_used = ? AND user_id = ?').run(req.params.id, req.userId);
    db.prepare('DELETE FROM accounts WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    db.prepare('DELETE FROM campaign_accounts WHERE account_id = ?').run(req.params.id);
    db.prepare('DELETE FROM activity_log WHERE account_id = ? AND user_id = ?').run(req.params.id, req.userId);

    // 3. Re-check those campaigns
    for (const { campaign_id } of affectedCampaigns) {
      const activeCount = db.prepare(`
        SELECT COUNT(*) as c FROM campaign_accounts ca
        JOIN accounts a ON a.id = ca.account_id
        WHERE ca.campaign_id = ? AND a.is_active = 1 AND a.status = 'active'
      `).get(campaign_id).c;
      
      if (activeCount === 0) {
        db.prepare("UPDATE campaigns SET status = 'paused', updated_at = ? WHERE id = ? AND status = 'active'").run(new Date().toISOString(), campaign_id);
        console.log(`[Auto-Pause] Campaign ${campaign_id} paused after account deletion.`);
      }
    }

    res.json({ success: true, message: 'Account deleted successfully from LRAT and Unipile' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
