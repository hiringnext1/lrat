const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { requireActiveSubscription } = require('../middleware/planGuard');

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const campaigns = db.prepare('SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);

    const enriched = campaigns.map((c) => {
      const accountCount = db.prepare('SELECT COUNT(*) as c FROM campaign_accounts ca JOIN accounts a ON a.id = ca.account_id WHERE ca.campaign_id = ? AND a.user_id = ?').get(c.id, req.userId).c;
      const activeAccountCount = db.prepare(`
        SELECT COUNT(*) as c FROM campaign_accounts ca
        JOIN accounts a ON a.id = ca.account_id
        WHERE ca.campaign_id = ? AND a.is_active = 1 AND a.status = 'active' AND a.user_id = ?
      `).get(c.id, req.userId).c;
      
      const leadCount = db.prepare('SELECT COUNT(*) as c FROM leads WHERE campaign_id = ? AND user_id = ?').get(c.id, req.userId).c;
      
      return { 
        ...c, 
        account_count: accountCount, 
        active_account_count: activeAccountCount,
        is_stalled: c.status === 'active' && activeAccountCount === 0,
        lead_count: leadCount 
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', requireActiveSubscription, (req, res) => {
  try {
    const db = getDb();
    const {
      name,
      connection_note_template,
      jd_message_template,
      follow_up_1_template,
      follow_up_2_template,
      daily_limit_per_account,
      working_hours_start,
      working_hours_end,
      working_days,
      follow_up_1_days,
      follow_up_2_days,
      account_ids,
      status,
      flow_json,
      jd_summary,
      starts_at,
      ends_at,
      connection_note_b_template,
      jd_message_b_template,
      follow_up_1_b_template,
      follow_up_2_b_template,
    } = req.body;

    if (!name) return res.status(400).json({ success: false, error: 'Campaign name is required' });

    const now = new Date().toISOString();
    const result = db.prepare(
      `INSERT INTO campaigns (
        name, status, connection_note_template, jd_message_template,
        follow_up_1_template, follow_up_2_template,
        connection_note_b_template, jd_message_b_template,
        follow_up_1_b_template, follow_up_2_b_template,
        daily_limit_per_account,
        working_hours_start, working_hours_end, working_days,
        follow_up_1_days, follow_up_2_days, flow_json, jd_summary, starts_at, ends_at, user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      name,
      status || 'draft',
      connection_note_template || '',
      jd_message_template || '',
      follow_up_1_template || '',
      follow_up_2_template || '',
      connection_note_b_template || '',
      jd_message_b_template || '',
      follow_up_1_b_template || '',
      follow_up_2_b_template || '',
      Math.min(daily_limit_per_account || 20, 25),
      working_hours_start || '09:00',
      working_hours_end || '18:00',
      JSON.stringify(working_days || [1, 2, 3, 4, 5]),
      follow_up_1_days || 3,
      follow_up_2_days || 6,
      flow_json ? JSON.stringify(flow_json) : '{}',
      jd_summary || '',
      starts_at || null,
      ends_at || null,
      req.userId,
      now,
      now
    );

    const campaignId = result.lastInsertRowid;

    if (account_ids && account_ids.length > 0) {
      const insertCA = db.prepare('INSERT INTO campaign_accounts (campaign_id, account_id) VALUES (?, ?)');
      for (const aid of account_ids) {
        // Double check the account actually belongs to this user before mapping
        const accCheck = db.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?').get(aid, req.userId);
        if (accCheck) {
          insertCA.run(campaignId, aid);
        }
      }
    }

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(campaignId, req.userId);
    res.json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

    const accounts = db.prepare(
      `SELECT a.* FROM accounts a
       JOIN campaign_accounts ca ON ca.account_id = a.id
       WHERE ca.campaign_id = ? AND a.user_id = ?`
    ).all(req.params.id, req.userId);

    const leadCount = db.prepare('SELECT COUNT(*) as c FROM leads WHERE campaign_id = ? AND user_id = ?').get(req.params.id, req.userId).c;

    res.json({ success: true, data: { ...campaign, accounts, lead_count: leadCount } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', requireActiveSubscription, (req, res) => {
  try {
    const db = getDb();
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

    const {
      name, connection_note_template, jd_message_template,
      follow_up_1_template, follow_up_2_template, daily_limit_per_account,
      working_hours_start, working_hours_end, working_days, follow_up_1_days, follow_up_2_days, account_ids, flow_json, jd_summary,
      starts_at, ends_at,
      connection_note_b_template, jd_message_b_template, follow_up_1_b_template, follow_up_2_b_template,
    } = req.body;

    const now = new Date().toISOString();
    db.prepare(
      `UPDATE campaigns SET
        name = ?, connection_note_template = ?, jd_message_template = ?,
        follow_up_1_template = ?, follow_up_2_template = ?,
        connection_note_b_template = ?, jd_message_b_template = ?,
        follow_up_1_b_template = ?, follow_up_2_b_template = ?,
        daily_limit_per_account = ?, working_hours_start = ?, working_hours_end = ?,
        working_days = ?, follow_up_1_days = ?, follow_up_2_days = ?,
        flow_json = ?, jd_summary = ?, starts_at = ?, ends_at = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`
    ).run(
      name ?? campaign.name,
      connection_note_template ?? campaign.connection_note_template,
      jd_message_template ?? campaign.jd_message_template,
      follow_up_1_template ?? campaign.follow_up_1_template,
      follow_up_2_template ?? campaign.follow_up_2_template,
      connection_note_b_template ?? campaign.connection_note_b_template,
      jd_message_b_template ?? campaign.jd_message_b_template,
      follow_up_1_b_template ?? campaign.follow_up_1_b_template,
      follow_up_2_b_template ?? campaign.follow_up_2_b_template,
      Math.min(daily_limit_per_account ?? campaign.daily_limit_per_account, 25),
      working_hours_start ?? campaign.working_hours_start,
      working_hours_end ?? campaign.working_hours_end,
      working_days ? JSON.stringify(working_days) : campaign.working_days,
      follow_up_1_days ?? campaign.follow_up_1_days,
      follow_up_2_days ?? campaign.follow_up_2_days,
      flow_json ? JSON.stringify(flow_json) : (campaign.flow_json || '{}'),
      jd_summary ?? campaign.jd_summary,
      starts_at !== undefined ? starts_at : campaign.starts_at,
      ends_at !== undefined ? ends_at : campaign.ends_at,
      now,
      req.params.id,
      req.userId
    );

    if (account_ids) {
      db.prepare('DELETE FROM campaign_accounts WHERE campaign_id = ?').run(req.params.id);
      const insertCA = db.prepare('INSERT INTO campaign_accounts (campaign_id, account_id) VALUES (?, ?)');
      for (const aid of account_ids) {
        const accCheck = db.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?').get(aid, req.userId);
        if (accCheck) {
          insertCA.run(req.params.id, aid);
        }
      }
    }

    const updated = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', requireActiveSubscription, (req, res) => {
  try {
    const db = getDb();
    const campaignId = req.params.id;
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(campaignId, req.userId);
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

    // 1. Delete associated accounts mapping
    db.prepare('DELETE FROM campaign_accounts WHERE campaign_id = ?').run(campaignId);
    
    // 2. Delete all leads associated with this campaign
    const leadDeleteResult = db.prepare('DELETE FROM leads WHERE campaign_id = ? AND user_id = ?').run(campaignId, req.userId);
    console.log(`[Cleanup] Deleted ${leadDeleteResult.changes} leads for campaign: ${campaign.name}`);

    // 3. Delete from activity_log
    db.prepare('DELETE FROM activity_log WHERE campaign_id = ? AND user_id = ?').run(campaignId, req.userId);

    // 4. Delete from sourcing_jobs
    db.prepare('DELETE FROM sourcing_jobs WHERE campaign_id = ? AND user_id = ?').run(campaignId, req.userId);

    // 5. Delete the campaign itself
    db.prepare('DELETE FROM campaigns WHERE id = ? AND user_id = ?').run(campaignId, req.userId);

    res.json({ success: true, message: 'Campaign and associated leads deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id/status', requireActiveSubscription, (req, res) => {
  try {
    const db = getDb();
    const { status } = req.body;
    const allowed = ['draft', 'active', 'paused', 'completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

    db.prepare('UPDATE campaigns SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(
      status, new Date().toISOString(), req.params.id, req.userId
    );

    const updated = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/accounts', requireActiveSubscription, (req, res) => {
  try {
    const db = getDb();
    const { account_ids } = req.body;
    if (!account_ids || !Array.isArray(account_ids)) {
      return res.status(400).json({ success: false, error: 'account_ids array required' });
    }

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

    db.prepare('DELETE FROM campaign_accounts WHERE campaign_id = ?').run(req.params.id);
    const insert = db.prepare('INSERT INTO campaign_accounts (campaign_id, account_id) VALUES (?, ?)');
    for (const aid of account_ids) {
      const accCheck = db.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?').get(aid, req.userId);
      if (accCheck) {
        insert.run(req.params.id, aid);
      }
    }

    res.json({ success: true, message: `${account_ids.length} accounts assigned` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST duplicate/clone a campaign
router.post('/:id/clone', requireActiveSubscription, (req, res) => {
  try {
    const db = getDb();
    const campaignId = req.params.id;

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(campaignId, req.userId);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const now = new Date().toISOString();
    const result = db.prepare(
      `INSERT INTO campaigns (
        name, status, connection_note_template, jd_message_template,
        follow_up_1_template, follow_up_2_template,
        connection_note_b_template, jd_message_b_template,
        follow_up_1_b_template, follow_up_2_b_template,
        daily_limit_per_account,
        working_hours_start, working_hours_end, working_days,
        follow_up_1_days, follow_up_2_days, flow_json, jd_summary, starts_at, ends_at, user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      `${campaign.name} (Copy)`,
      'draft',
      campaign.connection_note_template || '',
      campaign.jd_message_template || '',
      campaign.follow_up_1_template || '',
      campaign.follow_up_2_template || '',
      campaign.connection_note_b_template || '',
      campaign.jd_message_b_template || '',
      campaign.follow_up_1_b_template || '',
      campaign.follow_up_2_b_template || '',
      campaign.daily_limit_per_account || 20,
      campaign.working_hours_start || '09:00',
      campaign.working_hours_end || '18:00',
      campaign.working_days || '[1,2,3,4,5]',
      campaign.follow_up_1_days || 3,
      campaign.follow_up_2_days || 6,
      campaign.flow_json || '{}',
      campaign.jd_summary || '',
      campaign.starts_at || null,
      campaign.ends_at || null,
      req.userId,
      now,
      now
    );

    const newCampaignId = result.lastInsertRowid;

    // Clone linked accounts
    const linkedAccounts = db.prepare('SELECT account_id FROM campaign_accounts WHERE campaign_id = ?').all(campaignId);
    if (linkedAccounts.length > 0) {
      const insertCA = db.prepare('INSERT INTO campaign_accounts (campaign_id, account_id) VALUES (?, ?)');
      for (const row of linkedAccounts) {
        insertCA.run(newCampaignId, row.account_id);
      }
    }

    const newCampaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(newCampaignId);
    res.json({ success: true, message: 'Campaign duplicated successfully', data: newCampaign });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
