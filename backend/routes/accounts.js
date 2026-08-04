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

    const db = getDb();

    // Store a pending connection record so the webhook knows which user initiated this
    const pendingResult = db.prepare(
      `INSERT INTO pending_connections (user_id, status, created_at) VALUES (?, 'pending', ?)`
    ).run(req.userId, new Date().toISOString());
    const pendingId = pendingResult.lastInsertRowid;

    const baseUrl = process.env.FRONTEND_URL || (process.env.RAILWAY_STATIC_URL ? `https://${process.env.RAILWAY_STATIC_URL}` : 'https://growleadz.co');
    
    const successUrl = redirect_url || `${baseUrl}/accounts?connected=1`;
    const failUrl = redirect_url || `${baseUrl}/accounts?connected=0`;
    const notifyUrl = `${baseUrl}/api/webhooks/unipile`;

    // Short 10-minute expiry for fresh auth session
    const expiresOn = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const requestBody = {
      type: 'create',
      providers: ['LINKEDIN'],
      api_url: dsn,
      expiresOn: expiresOn,
      success_redirect_url: successUrl,
      failure_redirect_url: failUrl,
      notify_url: notifyUrl,
      name: `GrowLeadz_User_${req.userId}`,
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
      // Clean up pending record
      db.prepare('DELETE FROM pending_connections WHERE id = ?').run(pendingId);
      return res.status(502).json({ success: false, error: 'Unipile did not return a connect URL' });
    }

    res.json({ success: true, url: authUrl, pendingId });
  } catch (err) {
    const detail = err?.response?.data || err.message;
    console.error('[Unipile] Link Generation Failed:', detail);
    res.status(502).json({ success: false, error: 'Failed to generate connect link', details: detail });
  }
});

// Alias Webhook handler if Unipile posts to /api/accounts/webhook
router.post('/webhook', async (req, res) => {
  console.log('[Accounts Webhook Triggered]', req.body);
  try {
    const db = getDb();
    const io = req.app.get('io');
    const payload = req.body || {};
    const accountId = payload.account_id || payload.data?.account_id;

    if (accountId) {
      // Fetch ONLY this specific account from Unipile
      const axios = require('axios');
      const apiKey = getSetting('UNIPILE_API_KEY');
      const dsn = getSetting('UNIPILE_DSN');

      if (apiKey && dsn) {
        try {
          const accRes = await axios.get(`${dsn}/api/v1/accounts/${accountId}`, {
            headers: { 'X-API-KEY': apiKey },
            timeout: 8000,
          });
          const acc = accRes.data;
          if (acc) {
            const unipileId = acc.id || acc.account_id || accountId;
            const accName = acc.name || acc.username || acc.display_name || 'LinkedIn Account';
            const publicId = acc.public_identifier || acc.username || '';
            const url = publicId ? `https://www.linkedin.com/in/${publicId}` : '';

            // Check if already in DB
            const existing = db.prepare('SELECT id, user_id FROM accounts WHERE unipile_account_id = ?').get(unipileId);
            if (existing) {
              db.prepare(`
                UPDATE accounts SET
                  name = COALESCE(NULLIF(?, ''), name),
                  email = COALESCE(NULLIF(?, ''), email),
                  photo_url = COALESCE(NULLIF(?, ''), photo_url),
                  linkedin_url = COALESCE(NULLIF(?, ''), linkedin_url),
                  status = 'active'
                WHERE id = ?
              `).run(accName, acc.email || '', acc.profile_picture_url || acc.photo || '', url, existing.id);
              
              if (io && existing.user_id) {
                io.to(`user_${existing.user_id}`).emit('linkedin_account_connected', { message: 'Account synced from webhook' });
              }
            } else {
              // New account — determine user from name tag or pending_connections
              let userId = null;
              const nameMatch = accName.match(/GrowLeadz_User_(\d+)/);
              if (nameMatch) userId = parseInt(nameMatch[1], 10);

              if (!userId) {
                const pending = db.prepare(
                  `SELECT user_id FROM pending_connections WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1`
                ).get();
                if (pending) userId = pending.user_id;
              }

              if (userId) {
                db.prepare(`
                  INSERT INTO accounts (unipile_account_id, name, email, photo_url, status, is_active, linkedin_url, user_id, warmup_week, warmup_started_at)
                  VALUES (?, ?, ?, ?, 'active', 1, ?, ?, 4, CURRENT_TIMESTAMP)
                `).run(unipileId, accName, acc.email || '', acc.profile_picture_url || acc.photo || '', url, userId);

                // Mark pending as completed
                db.prepare(`UPDATE pending_connections SET status = 'completed', unipile_account_id = ? WHERE user_id = ? AND status = 'pending'`).run(unipileId, userId);

                const newAcc = db.prepare('SELECT * FROM accounts WHERE unipile_account_id = ?').get(unipileId);
                if (io) {
                  io.to(`user_${userId}`).emit('linkedin_account_connected', { account: newAcc });
                }
                console.log(`[Accounts Webhook] Created new account for user ${userId}: ${accName}`);
              }
            }
          }
        } catch (e) {
          console.error('[Accounts Webhook] Error fetching account:', e.message);
        }
      }
    }
  } catch (err) {
    console.error('[Accounts Webhook Error]', err);
  }
  res.json({ success: true });
});

// ⚡ 1-Click Direct Cookie (li_at) Connect Endpoint (3-Second Connect)
router.post('/connect-cookie', requireActiveSubscription, async (req, res) => {
  try {
    const { cookie_value } = req.body;
    if (!cookie_value || !cookie_value.trim()) {
      return res.status(400).json({ success: false, error: 'Please enter a valid li_at cookie value' });
    }

    const apiKey = getSetting('UNIPILE_API_KEY');
    const dsn = getSetting('UNIPILE_DSN');

    if (!apiKey || apiKey.includes('paste_your')) {
      return res.status(400).json({ success: false, error: 'Unipile API Key is missing or invalid. Please check Settings.' });
    }

    const cleanCookie = cookie_value.trim().replace(/^"|"$/g, '');

    const axios = require('axios');
    const response = await axios.post(
      `${dsn}/api/v1/accounts`,
      {
        provider: 'LINKEDIN',
        access_token: cleanCookie,
      },
      {
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );

    const unipileAccount = response.data;
    if (!unipileAccount || (!unipileAccount.id && !unipileAccount.account_id)) {
      return res.status(502).json({ success: false, error: 'Failed to connect LinkedIn account with cookie' });
    }

    const db = getDb();
    const unipileId = unipileAccount.id || unipileAccount.account_id;
    const name = unipileAccount.name || unipileAccount.username || 'LinkedIn Account';
    const email = unipileAccount.email || '';
    const photo = unipileAccount.profile_picture_url || unipileAccount.photo || '';
    const publicId = unipileAccount.public_identifier || unipileAccount.username || '';
    const url = publicId ? `https://www.linkedin.com/in/${publicId}` : '';

    const initialNextAction = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min warm-up before first automation run

    db.prepare(`
      INSERT INTO accounts (unipile_account_id, name, email, photo_url, status, is_active, linkedin_url, user_id, warmup_week, warmup_started_at, next_action_at)
      VALUES (?, ?, ?, ?, 'active', 1, ?, ?, 4, CURRENT_TIMESTAMP, ?)
      ON CONFLICT(unipile_account_id) DO UPDATE SET
        name = excluded.name,
        email = excluded.email,
        photo_url = excluded.photo_url,
        linkedin_url = excluded.linkedin_url,
        status = 'active',
        is_active = 1,
        user_id = COALESCE(accounts.user_id, excluded.user_id),
        next_action_at = COALESCE(accounts.next_action_at, excluded.next_action_at)
    `).run(unipileId, name, email, photo, url, req.userId, initialNextAction);

    const account = db.prepare('SELECT * FROM accounts WHERE unipile_account_id = ?').get(unipileId);

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${req.userId}`).emit('linkedin_account_connected', { account });
    }

    res.json({ success: true, account, message: 'LinkedIn account connected instantly!' });
  } catch (err) {
    const detail = err?.response?.data || err.message;
    console.error('[Unipile Cookie Connect Error]', detail);
    const errText = detail?.detail || detail?.message || (typeof detail === 'string' ? detail : 'Invalid or expired li_at cookie value');
    res.status(400).json({ success: false, error: errText });
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

router.post('/sync', async (req, res) => {
  try {
    const db = getDb();
    const axios = require('axios');
    const apiKey = getSetting('UNIPILE_API_KEY');
    const dsn = getSetting('UNIPILE_DSN');
    let synced = 0;

    // ── Step 1: Check for pending connections belonging to THIS user ──
    // When a user connects via Hosted Auth, we saved a pending_connections record.
    // Now we check if any new Unipile accounts appeared that match this user's pending request.
    const pendingRecords = db.prepare(
      `SELECT * FROM pending_connections WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 5`
    ).all(req.userId);

    if (pendingRecords.length > 0 && apiKey && dsn) {
      // Fetch current Unipile accounts to find the newly connected one
      const existingIds = db.prepare('SELECT unipile_account_id FROM accounts WHERE user_id = ?')
        .all(req.userId)
        .map(a => a.unipile_account_id);

      try {
        const unipileRes = await axios.get(`${dsn}/api/v1/accounts`, {
          headers: { 'X-API-KEY': apiKey },
          timeout: 10000,
        });

        const items = unipileRes.data?.items || unipileRes.data?.accounts || (Array.isArray(unipileRes.data) ? unipileRes.data : []);

        for (const acc of items) {
          const unipileId = acc.id || acc.account_id;
          if (!unipileId) continue;

          // Check if this is a LinkedIn account
          const type = (acc.type || acc.provider || '').toUpperCase();
          if (type && !type.includes('LINKEDIN')) continue;

          // Check if this account belongs to this user via name tag OR is truly new
          const accName = acc.name || acc.username || acc.display_name || '';
          const belongsToUser = accName.includes(`GrowLeadz_User_${req.userId}`);

          // Skip if this account already exists in ANY user's DB (prevent stealing)
          const existsInDb = db.prepare('SELECT id, user_id FROM accounts WHERE unipile_account_id = ?').get(unipileId);
          if (existsInDb) {
            // Only update if it belongs to this user
            if (existsInDb.user_id === req.userId) {
              const publicId = acc.public_identifier || acc.username || '';
              const url = publicId ? `https://www.linkedin.com/in/${publicId}` : '';
              db.prepare(`
                UPDATE accounts SET
                  name = COALESCE(NULLIF(?, ''), name),
                  email = COALESCE(NULLIF(?, ''), email),
                  photo_url = COALESCE(NULLIF(?, ''), photo_url),
                  linkedin_url = COALESCE(NULLIF(?, ''), linkedin_url),
                  status = 'active',
                  is_active = 1,
                  consecutive_failures = 0,
                  next_action_at = NULL
                WHERE id = ?
              `).run(
                accName || '', acc.email || '', acc.profile_picture_url || acc.photo || '', url, existsInDb.id
              );
              synced++;
            }
            continue;
          }

          // New account — assign to this user if belongsToUser OR user has a pending connection OR single user DB
          const shouldAssign = belongsToUser || pendingRecords.length > 0 || (db.prepare('SELECT COUNT(*) as c FROM users').get()?.c === 1);

          if (shouldAssign) {
            const publicId = acc.public_identifier || acc.username || '';
            const url = publicId ? `https://www.linkedin.com/in/${publicId}` : '';
            const cleanName = accName.includes('GrowLeadz_User_') ? (acc.username || acc.email || 'LinkedIn Account') : (accName || 'LinkedIn Account');

            db.prepare(`
              INSERT INTO accounts (unipile_account_id, name, email, photo_url, status, is_active, linkedin_url, user_id, warmup_week, warmup_started_at)
              VALUES (?, ?, ?, ?, 'active', 1, ?, ?, 4, CURRENT_TIMESTAMP)
            `).run(
              unipileId,
              cleanName,
              acc.email || acc.username || '',
              acc.profile_picture_url || acc.photo || '',
              url,
              req.userId
            );

            // Mark pending as completed
            for (const p of pendingRecords) {
              db.prepare(`UPDATE pending_connections SET status = 'completed', unipile_account_id = ? WHERE id = ?`).run(unipileId, p.id);
            }
            synced++;
            console.log(`[Sync] Created new account for user ${req.userId}: ${cleanName} (${unipileId})`);
          }
        }
      } catch (e) {
        console.error('[Sync] Unipile fetch error during pending check:', e.message);
      }
    }

    // ── Step 2: Refresh existing accounts for THIS user only ──
    const userAccounts = db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(req.userId);
    if (apiKey && dsn) {
      for (const localAcc of userAccounts) {
        if (!localAcc.unipile_account_id) continue;
        try {
          const accRes = await axios.get(`${dsn}/api/v1/accounts/${localAcc.unipile_account_id}`, {
            headers: { 'X-API-KEY': apiKey },
            timeout: 8000,
          });
          const acc = accRes.data;
          if (acc) {
            const accName = acc.name || acc.username || acc.display_name || localAcc.name;
            const publicId = acc.public_identifier || acc.username || '';
            const url = publicId ? `https://www.linkedin.com/in/${publicId}` : '';
            db.prepare(`
              UPDATE accounts SET
                name = COALESCE(NULLIF(?, ''), name),
                email = COALESCE(NULLIF(?, ''), email),
                photo_url = COALESCE(NULLIF(?, ''), photo_url),
                linkedin_url = COALESCE(NULLIF(?, ''), linkedin_url),
                status = 'active',
                consecutive_failures = 0,
                next_action_at = NULL
              WHERE id = ? AND user_id = ?
            `).run(accName, acc.email || '', acc.profile_picture_url || acc.photo || '', url, localAcc.id, req.userId);
          }
        } catch (e) {
          // Individual account fetch failed — mark as offline if 404
          if (e?.response?.status === 404) {
            db.prepare("UPDATE accounts SET status = 'offline' WHERE id = ? AND user_id = ?").run(localAcc.id, req.userId);
          }
        }
      }
    }

    const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
    
    const io = req.app.get('io');
    if (io && synced > 0 && accounts.length > 0) {
      io.to(`user_${req.userId}`).emit('linkedin_account_connected', { account: accounts[0] });
    }

    res.json({ success: true, synced, data: accounts });
  } catch (err) {
    console.error('[Sync Error]', err.message);
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

// ⚡ Endpoint to toggle account pause / active status
router.put('/:id/status', requireActiveSubscription, (req, res) => {
  try {
    const db = getDb();
    const { is_active, status } = req.body;
    const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

    const newActive = is_active !== undefined ? (is_active ? 1 : 0) : account.is_active;
    const newStatus = status ? status : (newActive ? 'active' : 'paused');

    db.prepare('UPDATE accounts SET is_active = ?, status = ? WHERE id = ? AND user_id = ?').run(
      newActive,
      newStatus,
      req.params.id,
      req.userId
    );

    const updated = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    res.json({ success: true, data: updated, message: `Account status set to ${newStatus}` });
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

    res.json({ success: true, message: 'Account deleted successfully from GrowLeads and Unipile' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
