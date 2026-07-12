const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');

router.get('/overview', (req, res) => {
  try {
    const db = getDb();
    const safety = require('../services/safety');
    const campaignId = req.query.campaign_id ? parseInt(req.query.campaign_id) : null;

    const user = db.prepare('SELECT timezone FROM users WHERE id = ?').get(req.userId);
    const timezone = user?.timezone || 'Asia/Kolkata';
    const { hoursModifier, minutesModifier } = safety.getSqliteTimezoneModifiers(timezone);
    const istDate = safety.getISTDateString(timezone);

    let totalLeadsQuery = 'SELECT COUNT(*) as c FROM leads WHERE user_id = ?';
    let sentLeadsQuery = "SELECT COUNT(*) as c FROM leads WHERE status != 'pending_connection' AND user_id = ?";
    let acceptedLeadsQuery = "SELECT COUNT(*) as c FROM leads WHERE status NOT IN ('pending_connection', 'connection_sent') AND user_id = ?";
    let repliedLeadsQuery = 'SELECT COUNT(*) as c FROM leads WHERE reply_received = 1 AND user_id = ?';
    let todayConnQuery = `SELECT COUNT(*) as c FROM activity_log WHERE action_type = 'connection_sent' AND status = 'success' AND user_id = ? AND date(created_at, '${hoursModifier}', '${minutesModifier}') = ?`;
    let totalConnQuery = "SELECT COUNT(*) as c FROM activity_log WHERE action_type = 'connection_sent' AND status = 'success' AND user_id = ?";

    let paramsLeads = [req.userId];
    let paramsTodayConn = [req.userId, istDate];
    let paramsTotalConn = [req.userId];

    if (campaignId) {
      totalLeadsQuery += ' AND campaign_id = ?';
      sentLeadsQuery += ' AND campaign_id = ?';
      acceptedLeadsQuery += ' AND campaign_id = ?';
      repliedLeadsQuery += ' AND campaign_id = ?';
      todayConnQuery += ' AND campaign_id = ?';
      totalConnQuery += ' AND campaign_id = ?';

      paramsLeads.push(campaignId);
      paramsTodayConn.push(campaignId);
      paramsTotalConn.push(campaignId);
    }

    const totalLeads = db.prepare(totalLeadsQuery).get(...paramsLeads).c;
    const sentLeads = db.prepare(sentLeadsQuery).get(...paramsLeads).c;
    const acceptedLeads = db.prepare(acceptedLeadsQuery).get(...paramsLeads).c;
    const repliedLeads = db.prepare(repliedLeadsQuery).get(...paramsLeads).c;
    const connectionsToday = db.prepare(todayConnQuery).get(...paramsTodayConn).c;
    const connectionsTotal = db.prepare(totalConnQuery).get(...paramsTotalConn).c;

    const acceptanceRate = sentLeads > 0 ? ((acceptedLeads / sentLeads) * 100).toFixed(1) : 0;
    const replyRate = acceptedLeads > 0 ? ((repliedLeads / acceptedLeads) * 100).toFixed(1) : 0;

    let dailyGoal = 0;
    let nextActionAt = null;
    let isWorkingDayToday = false;
    let activeCampaignsCount = 0;
    let activeAccountsCount = 0;
    const dayNum = safety.getISTDayOfWeek(timezone);

    if (campaignId) {
      const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(campaignId, req.userId);
      if (campaign) {
        activeCampaignsCount = campaign.status === 'active' ? 1 : 0;
        const campaignAccounts = db.prepare(
          `SELECT a.* FROM accounts a JOIN campaign_accounts ca ON ca.account_id = a.id WHERE ca.campaign_id = ? AND a.status IN ('active', 'paused')`
        ).all(campaignId);
        activeAccountsCount = campaignAccounts.length;

        const workingDays = JSON.parse(campaign.working_days || '[1,2,3,4,5]');
        if (workingDays.includes(dayNum)) {
          isWorkingDayToday = campaign.status === 'active';
        }

        for (const acc of campaignAccounts) {
          dailyGoal += campaign.daily_limit_per_account || safety.getEffectiveDailyLimit(acc);
          if (acc.next_action_at) {
            if (!nextActionAt || acc.next_action_at < nextActionAt) {
              nextActionAt = acc.next_action_at;
            }
          }
        }
      }
    } else {
      const activeCampaignsList = db.prepare("SELECT * FROM campaigns WHERE status = 'active' AND user_id = ?").all(req.userId);
      activeCampaignsCount = activeCampaignsList.length;

      if (activeCampaignsCount > 0) {
        for (const campaign of activeCampaignsList) {
          const workingDays = JSON.parse(campaign.working_days || '[1,2,3,4,5]');
          if (workingDays.includes(dayNum)) {
            isWorkingDayToday = true;
            break;
          }
        }
      }

      const accounts = db.prepare("SELECT * FROM accounts WHERE status IN ('active', 'paused') AND user_id = ?").all(req.userId);
      activeAccountsCount = accounts.length;

      for (const acc of accounts) {
        dailyGoal += safety.getEffectiveDailyLimit(acc);
        if (acc.next_action_at) {
          if (!nextActionAt || acc.next_action_at < nextActionAt) {
            nextActionAt = acc.next_action_at;
          }
        }
      }
    }

    const isRestingDay = activeCampaignsCount > 0 && !isWorkingDayToday;

    res.json({
      success: true,
      data: {
        total_leads: totalLeads,
        sent_leads: sentLeads,
        accepted_leads: acceptedLeads,
        replied_leads: repliedLeads,
        connections_today: connectionsToday,
        connections_total: connectionsTotal,
        daily_goal: dailyGoal, 
        acceptance_rate: parseFloat(acceptanceRate),
        reply_rate: parseFloat(replyRate),
        active_campaigns: activeCampaignsCount,
        active_accounts: activeAccountsCount,
        next_action_at: nextActionAt,
        is_resting_day: isRestingDay,
        timezone: timezone
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/daily', (req, res) => {
  try {
    const db = getDb();
    const days = parseInt(req.query.days || 30);
    const campaignId = req.query.campaign_id ? parseInt(req.query.campaign_id) : null;

    let query = `
      SELECT date(created_at) as date, COUNT(*) as connections_sent
      FROM activity_log
      WHERE action_type = 'connection_sent' AND status = 'success' AND user_id = ?
        AND created_at >= date('now', '-${days} days')
    `;
    const params = [req.userId];
    if (campaignId) {
      query += ' AND campaign_id = ?';
      params.push(campaignId);
    }
    query += ' GROUP BY date(created_at) ORDER BY date ASC';

    const rows = db.prepare(query).all(...params);

    const allDates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      allDates.push(d.toISOString().split('T')[0]);
    }

    const rowMap = {};
    for (const row of rows) rowMap[row.date] = row.connections_sent;

    const data = allDates.map((date) => ({ date, connections_sent: rowMap[date] || 0 }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/campaigns', (req, res) => {
  try {
    const db = getDb();
    const campaigns = db.prepare(
      `SELECT id, name, connections_sent, accepted, jd_sent, replied,
              CASE WHEN connections_sent > 0 THEN ROUND(CAST(accepted AS REAL) / connections_sent * 100, 1) ELSE 0 END as acceptance_rate
       FROM campaigns WHERE user_id = ? ORDER BY connections_sent DESC`
    ).all(req.userId);

    res.json({ success: true, data: campaigns });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/accounts', (req, res) => {
  try {
    const db = getDb();
    const accounts = db.prepare(
      `SELECT id, name, today_connections, week_connections, daily_limit, weekly_limit, status, warmup_week
       FROM accounts WHERE user_id = ? ORDER BY week_connections DESC`
    ).all(req.userId);

    res.json({ success: true, data: accounts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/activity-log', (req, res) => {
  try {
    const db = getDb();
    const limit = parseInt(req.query.limit || 100);
    const { account_id, campaign_id, action_type } = req.query;

    let sql = `SELECT al.*, a.name as account_name, l.full_name as lead_name, c.name as campaign_name
               FROM activity_log al
               LEFT JOIN accounts a ON a.id = al.account_id
               LEFT JOIN leads l ON l.id = al.lead_id
               LEFT JOIN campaigns c ON c.id = al.campaign_id
               WHERE al.user_id = ?`;
    const params = [req.userId];

    if (account_id) { sql += ' AND al.account_id = ?'; params.push(account_id); }
    if (campaign_id) { sql += ' AND al.campaign_id = ?'; params.push(campaign_id); }
    if (action_type) { sql += ' AND al.action_type = ?'; params.push(action_type); }

    sql += ' ORDER BY al.created_at DESC LIMIT ?';
    params.push(limit);

    const logs = db.prepare(sql).all(...params).map(log => ({
      ...log,
      created_at: log.created_at ? (log.created_at.includes('Z') ? log.created_at : log.created_at.replace(' ', 'T') + 'Z') : null
    }));
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/trends', (req, res) => {
  try {
    const db = getDb();
    const campaignId = req.query.campaign_id ? parseInt(req.query.campaign_id) : null;
    const days = 7;
    const trends = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      let query = `
        SELECT 
          COUNT(CASE WHEN connection_sent_at LIKE ? THEN 1 END) as sent,
          COUNT(CASE WHEN accepted_at LIKE ? THEN 1 END) as accepted,
          COUNT(CASE WHEN reply_received_at LIKE ? THEN 1 END) as replied
        FROM leads 
        WHERE user_id = ?
      `;
      const params = [`${dateStr}%`, `${dateStr}%`, `${dateStr}%`, req.userId];
      if (campaignId) {
        query += ' AND campaign_id = ?';
        params.push(campaignId);
      }
      
      const stats = db.prepare(query).get(...params);

      trends.push({
        date: new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        sent: stats.sent || 0,
        accepted: stats.accepted || 0,
        replied: stats.replied || 0
      });
    }

    res.json({ success: true, data: trends });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/engine-status', (req, res) => {
  try {
    const db = getDb();
    const safety = require('../services/safety');
    
    const activeAccounts = db.prepare("SELECT COUNT(*) as c FROM accounts WHERE is_active = 1 AND user_id = ?").get(req.userId).c;
    const activeCampaigns = db.prepare("SELECT * FROM campaigns WHERE status = 'active' AND user_id = ?").all(req.userId);
    
    if (activeAccounts === 0) {
      return res.json({ 
        success: true, 
        status: 'OFFLINE', 
        message: 'No LinkedIn accounts linked',
        color: 'text-rose-500' 
      });
    }

    if (activeCampaigns.length === 0) {
      return res.json({ 
        success: true, 
        status: 'IDLE', 
        message: 'No active campaigns',
        color: 'text-gray-400'
      });
    }

    const dayNum = safety.getISTDayOfWeek();
    const isWorkingDayToday = activeCampaigns.some(c => {
      const workingDays = JSON.parse(c.working_days || '[1,2,3,4,5]');
      return workingDays.includes(dayNum);
    });

    if (!isWorkingDayToday) {
      return res.json({ 
        success: true, 
        status: 'RESTING', 
        message: 'Weekend/Off-day Pause (Resting today)',
        color: 'text-amber-500' 
      });
    }

    const isAnyCampaignActiveNow = activeCampaigns.some(c => {
      const within = safety.isWithinWorkingHours(c.working_hours_start, c.working_hours_end);
      return within;
    });

    if (!isAnyCampaignActiveNow) {
      return res.json({ 
        success: true, 
        status: 'SLEEPING', 
        message: 'Safety Gating (Paused until 07:00 AM IST)',
        color: 'text-indigo-500' 
      });
    }

    res.json({ 
      success: true, 
      status: 'ACTIVE', 
      message: 'System running',
      color: 'text-green-500'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CSV Export Endpoint
router.get('/export', (req, res) => {
  try {
    const db = getDb();
    const type = req.query.type || 'leads';
    
    if (type === 'campaigns') {
      const campaigns = db.prepare(`
        SELECT 
          id, 
          name, 
          status, 
          total_leads, 
          connections_sent, 
          accepted, 
          jd_sent, 
          replied,
          CASE WHEN connections_sent > 0 THEN ROUND(CAST(accepted AS REAL) / connections_sent * 100, 1) ELSE 0 END as acceptance_rate,
          CASE WHEN accepted > 0 THEN ROUND(CAST(replied AS REAL) / accepted * 100, 1) ELSE 0 END as reply_rate,
          created_at
        FROM campaigns 
        WHERE user_id = ?
        ORDER BY created_at DESC
      `).all(req.userId);

      const headers = ['Campaign ID', 'Name', 'Status', 'Total Leads', 'Connections Sent', 'Accepted', 'Acceptance Rate (%)', 'JD Sent', 'Replied', 'Reply Rate (%)', 'Created At'];
      const rows = campaigns.map(c => [
        c.id,
        `"${c.name.replace(/"/g, '""')}"`,
        c.status,
        c.total_leads,
        c.connections_sent,
        c.accepted,
        c.acceptance_rate,
        c.jd_sent,
        c.replied,
        c.reply_rate,
        c.created_at
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="campaigns_outreach_report.csv"');
      return res.send(csvContent);
    } else {
      const leads = db.prepare(`
        SELECT 
          l.id,
          l.full_name,
          l.headline,
          l.company,
          l.designation,
          l.location,
          l.linkedin_url,
          l.status,
          c.name as campaign_name,
          l.connection_sent_at,
          l.accepted_at as connected_at,
          l.jd_sent_at,
          l.reply_received,
          l.reply_received_at,
          l.ai_sentiment,
          l.fit_score
        FROM leads l
        LEFT JOIN campaigns c ON c.id = l.campaign_id
        WHERE l.user_id = ?
        ORDER BY l.created_at DESC
      `).all(req.userId);

      const headers = [
        'Lead ID', 'Full Name', 'Headline', 'Company', 'Designation', 
        'Location', 'LinkedIn URL', 'Status', 'Campaign', 
        'Connection Sent At', 'Connected At', 'JD Sent At', 
        'Replied', 'Replied At', 'AI Sentiment', 'Fit Score'
      ];
      const rows = leads.map(l => [
        l.id,
        `"${(l.full_name || '').replace(/"/g, '""')}"`,
        `"${(l.headline || '').replace(/"/g, '""')}"`,
        `"${(l.company || '').replace(/"/g, '""')}"`,
        `"${(l.designation || '').replace(/"/g, '""')}"`,
        `"${(l.location || '').replace(/"/g, '""')}"`,
        `"${(l.linkedin_url || '').replace(/"/g, '""')}"`,
        l.status,
        `"${(l.campaign_name || '').replace(/"/g, '""')}"`,
        l.connection_sent_at || '',
        l.connected_at || '',
        l.jd_sent_at || '',
        l.reply_received ? 'YES' : 'NO',
        l.reply_received_at || '',
        l.ai_sentiment || '',
        l.fit_score || 0
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="leads_outreach_report.csv"');
      return res.send(csvContent);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PDF / Print Report Generator Route
router.get('/print', (req, res) => {
  try {
    const db = getDb();
    
    // Fetch Summary Metrics
    const totalLeads = db.prepare('SELECT COUNT(*) as c FROM leads WHERE user_id = ?').get(req.userId).c;
    const sentLeads = db.prepare("SELECT COUNT(*) as c FROM leads WHERE status != 'pending_connection' AND user_id = ?").get(req.userId).c;
    const acceptedLeads = db.prepare("SELECT COUNT(*) as c FROM leads WHERE status NOT IN ('pending_connection', 'connection_sent') AND user_id = ?").get(req.userId).c;
    const repliedLeads = db.prepare('SELECT COUNT(*) as c FROM leads WHERE reply_received = 1 AND user_id = ?').get(req.userId).c;
    const acceptanceRate = sentLeads > 0 ? ((acceptedLeads / sentLeads) * 100).toFixed(1) : 0;
    const replyRate = acceptedLeads > 0 ? ((repliedLeads / acceptedLeads) * 100).toFixed(1) : 0;

    // Fetch Campaign Breakdown
    const campaigns = db.prepare(`
      SELECT name, status, total_leads, connections_sent, accepted, replied
      FROM campaigns WHERE user_id = ? ORDER BY connections_sent DESC LIMIT 10
    `).all(req.userId);

    // Fetch Recent Activity Log
    const logs = db.prepare(`
      SELECT al.created_at, al.action_type, al.status, l.full_name as lead_name, a.name as account_name
      FROM activity_log al
      LEFT JOIN leads l ON l.id = al.lead_id
      LEFT JOIN accounts a ON a.id = al.account_id
      WHERE al.user_id = ?
      ORDER BY al.created_at DESC LIMIT 15
    `).all(req.userId);

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>LRAT Performance Analytics Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; margin: 0; background: #ffffff; }
          .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
          .title { font-size: 24px; font-weight: 800; tracking-tight; color: #0f172a; }
          .date { font-size: 12px; color: #64748b; font-weight: 600; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 40px; }
          .stat-card { border: 1px solid #f1f5f9; background: #fafafa; border-radius: 12px; padding: 20px; }
          .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #64748b; }
          .stat-value { font-size: 28px; font-weight: 900; color: #0f172a; margin-top: 5px; }
          .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 15px; border-left: 4px solid #3b82f6; padding-left: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 13px; }
          th { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 12px 8px; text-align: left; font-weight: 600; color: #475569; }
          td { border-bottom: 1px solid #f1f5f9; padding: 10px 8px; color: #334155; }
          .badge { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; display: inline-block; }
          .badge-active { background: #ecfdf5; color: #059669; }
          .badge-draft { background: #f1f5f9; color: #64748b; }
          .badge-success { background: #dcfce7; color: #166534; }
          .badge-failed { background: #fee2e2; color: #991b1b; }
          @media print {
            body { padding: 0; }
            .stat-card { border: 1px solid #e2e8f0; background: none; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">LRAT Outreach Performance Report</div>
            <div style="font-size: 12px; color: #94a3b8; font-weight: 500; margin-top: 3px;">LinkedIn Outreach Automation Platform Analytics</div>
          </div>
          <div class="date">Report Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)</div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Pipeline Leads</div>
            <div class="stat-value">${totalLeads}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Connections Sent</div>
            <div class="stat-value">${sentLeads}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Acceptance Rate</div>
            <div class="stat-value">${acceptanceRate}%</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Reply Rate (Conversion)</div>
            <div class="stat-value">${replyRate}%</div>
          </div>
        </div>

        <div class="section-title">Active Outreach Campaigns Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Campaign Name</th>
              <th>Status</th>
              <th>Total Leads</th>
              <th>Sent</th>
              <th>Accepted</th>
              <th>Replies</th>
            </tr>
          </thead>
          <tbody>
            ${campaigns.map(c => `
              <tr>
                <td style="font-weight: 600;">${c.name}</td>
                <td><span class="badge ${c.status === 'active' ? 'badge-active' : 'badge-draft'}">${c.status.toUpperCase()}</span></td>
                <td>${c.total_leads}</td>
                <td>${c.connections_sent}</td>
                <td>${c.accepted}</td>
                <td>${c.replied}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-title">Recent System Automation Log</div>
        <table>
          <thead>
            <tr>
              <th>Timestamp (IST)</th>
              <th>Sender Account</th>
              <th>Prospect Name</th>
              <th>Action Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(l => `
              <tr>
                <td>${l.created_at ? new Date(l.created_at + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}</td>
                <td>${l.account_name || 'System Engine'}</td>
                <td>${l.lead_name || 'N/A'}</td>
                <td style="text-transform: capitalize; font-family: monospace;">${l.action_type.replace(/_/g, ' ')}</td>
                <td><span class="badge ${l.status === 'success' ? 'badge-success' : 'badge-failed'}">${l.status.toUpperCase()}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 800);
          }
        </script>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (err) {
    res.status(500).send(`Error generating printable report: ${err.message}`);
  }
});

// GET Advanced Analytics comparisons and template performances
router.get('/advanced', (req, res) => {
  try {
    const db = getDb();
    
    // 1. Template Performance A/B comparison
    const campaigns = db.prepare(`
      SELECT id, name, status, connection_note_template, connections_sent, accepted, replied
      FROM campaigns 
      WHERE user_id = ?
      ORDER BY connections_sent DESC
    `).all(req.userId);

    const templateStats = campaigns.map(c => {
      const acceptanceRate = c.connections_sent > 0 ? parseFloat(((c.accepted / c.connections_sent) * 100).toFixed(1)) : 0;
      const replyRate = c.accepted > 0 ? parseFloat(((c.replied / c.accepted) * 100).toFixed(1)) : 0;
      return {
        id: c.id,
        name: c.name,
        template: c.connection_note_template || 'No Connection Message',
        connections_sent: c.connections_sent,
        accepted: c.accepted,
        replied: c.replied,
        acceptance_rate: acceptanceRate,
        reply_rate: replyRate
      };
    });

    // 2. Account-wise comparisons
    const accounts = db.prepare(`
      SELECT id, name, status, is_active
      FROM accounts 
      WHERE user_id = ?
    `).all(req.userId);

    const accountStats = accounts.map(acc => {
      const stats = db.prepare(`
        SELECT 
          COUNT(CASE WHEN action_type = 'connection_sent' AND status = 'success' THEN 1 END) as sent,
          COUNT(CASE WHEN action_type = 'connection_accepted' THEN 1 END) as accepted,
          COUNT(CASE WHEN action_type = 'reply_received' THEN 1 END) as replied
        FROM activity_log 
        WHERE account_id = ? AND user_id = ?
      `).get(acc.id, req.userId);

      return {
        id: acc.id,
        name: acc.name,
        status: acc.status,
        is_active: acc.is_active,
        sent: stats.sent || 0,
        accepted: stats.accepted || 0,
        replied: stats.replied || 0
      };
    });

    res.json({
      success: true,
      data: {
        templates: templateStats,
        accounts: accountStats
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET AI-Powered Outreach Insights
router.get('/ai-insights', (req, res) => {
  try {
    const db = getDb();
    const insights = [];

    // 1. Analyze Template length vs Acceptance rate
    const c = db.prepare(`
      SELECT name, connection_note_template, connections_sent, accepted, replied
      FROM campaigns 
      WHERE user_id = ? AND connections_sent > 10
      ORDER BY id DESC LIMIT 1
    `).get(req.userId);

    if (c) {
      const len = (c.connection_note_template || '').length;
      const rate = c.connections_sent > 0 ? (c.accepted / c.connections_sent) * 100 : 0;
      if (rate < 25 && len > 220) {
        insights.push({
          type: 'warning',
          title: 'Connection Note is Too Long',
          message: `Your campaign "${c.name}" has an acceptance rate of ${rate.toFixed(1)}%. The connection note is ${len} characters long. Try shortening it to under 150 characters to reduce friction and improve conversions.`
        });
      } else if (rate >= 30) {
        insights.push({
          type: 'success',
          title: 'High Acceptance Rate detected',
          message: `Your campaign "${c.name}" note length is optimal (${len} characters), contributing to a strong ${rate.toFixed(1)}% acceptance rate.`
        });
      } else {
        insights.push({
          type: 'info',
          title: 'Optimize outreach templates',
          message: 'Short connection notes (<150 chars) focusing on shared industry topics typically convert 22% better than generic pitches.'
        });
      }
    } else {
      insights.push({
        type: 'info',
        title: 'Template optimization insights',
        message: 'A/B template testing connection messages between 100-150 characters generally yields the highest network growth.'
      });
    }

    // 2. Analyze Best Time to Send Connections
    const peakHour = db.prepare(`
      SELECT strftime('%H', created_at) as hour, COUNT(*) as c 
      FROM activity_log 
      WHERE action_type = 'connection_sent' AND status = 'success' AND user_id = ?
      GROUP BY hour ORDER BY c DESC LIMIT 1
    `).get(req.userId);

    if (peakHour && peakHour.c > 0) {
      const hourNum = parseInt(peakHour.hour, 10);
      let period = 'AM';
      let hour12 = hourNum;
      if (hourNum >= 12) {
        period = 'PM';
        hour12 = hourNum > 12 ? hourNum - 12 : 12;
      }
      if (hourNum === 0) hour12 = 12;
      
      insights.push({
        type: 'info',
        title: 'Best Sourcing Hours',
        message: `Based on your logs, your outreach is highly active around ${hour12} ${period} IST. Sending connection requests between 10:00 AM and 2:00 PM local time maximizes connection rates.`
      });
    } else {
      insights.push({
        type: 'info',
        title: 'Optimal sending schedules',
        message: 'LinkedIn users check notifications most frequently around 11:30 AM and 3:30 PM. Focus campaign schedules during these slots.'
      });
    }

    // 3. Analyze Prospect Persona replies
    const topPersonas = db.prepare(`
      SELECT designation, COUNT(*) as c 
      FROM leads 
      WHERE reply_received = 1 AND user_id = ? AND designation IS NOT NULL
      GROUP BY designation ORDER BY c DESC LIMIT 1
    `).get(req.userId);

    if (topPersonas && topPersonas.c > 0) {
      insights.push({
        type: 'success',
        title: 'Top Persona Engaged',
        message: `Prospects with the title "${topPersonas.designation}" have responded most frequently to your templates. Prioritize targeting this specific persona.`
      });
    } else {
      insights.push({
        type: 'info',
        title: 'Prospect persona feedback',
        message: 'Seniority and tech-focused headlines respond 3x faster to outreach notes specifying offer details in the second follow-up.'
      });
    }

    res.json({
      success: true,
      data: insights
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
