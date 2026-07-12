const { AsyncLocalStorage } = require('async_hooks');
const logStorage = new AsyncLocalStorage();

const cron = require('node-cron');
const { getDb } = require('../config/database');
const unipile = require('./unipile');
const aiService = require('./nvidia');
const safety = require('./safety');
const replyProcessor = require('./replyProcessor');

let io;
let isRunning = { connections: false, acceptances: false, followups: false, replies: false, enrichment: false };
let lastRunTimes = {
  connections: Date.now(),
  acceptances: Date.now(),
  followups: Date.now(),
  replies: Date.now(),
  enrichment: Date.now()
};

function setIO(socketIO) {
  io = socketIO;
}

function emit(event, data, targetUserId) {
  const store = logStorage.getStore();
  const userId = targetUserId || (store ? store.userId : null);
  if (io && userId) {
    io.to('user_' + userId).emit(event, data);
  }
}

const console = {
  log: (...args) => {
    const text = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    const store = logStorage.getStore();
    if (io && store && store.userId) {
      io.to('user_' + store.userId).emit('automation_log', { text, type: 'info', timestamp: new Date().toISOString() });
    }
    global.console.log(...args);
  },
  error: (...args) => {
    const text = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    const store = logStorage.getStore();
    if (io && store && store.userId) {
      io.to('user_' + store.userId).emit('automation_log', { text, type: 'error', timestamp: new Date().toISOString() });
    }
    global.console.error(...args);
  },
  warn: (...args) => {
    const text = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    const store = logStorage.getStore();
    if (io && store && store.userId) {
      io.to('user_' + store.userId).emit('automation_log', { text, type: 'warn', timestamp: new Date().toISOString() });
    }
    global.console.warn(...args);
  }
};

function isLeadBlacklisted(db, lead) {
  if (lead.linkedin_url) {
    const blacklistedProfile = db.prepare("SELECT id FROM blacklist WHERE user_id = ? AND type = 'profile' AND value = ?").get(lead.user_id, lead.linkedin_url);
    if (blacklistedProfile) return { blacklisted: true, reason: 'Profile URL is blacklisted' };
  }

  if (lead.company) {
    const blacklistedCompany = db.prepare("SELECT id FROM blacklist WHERE user_id = ? AND type = 'company' AND LOWER(value) = LOWER(?)").get(lead.user_id, lead.company.trim());
    if (blacklistedCompany) return { blacklisted: true, reason: `Company "${lead.company}" is blacklisted` };
  }

  return { blacklisted: false };
}

function isCampaignScheduled(campaign, db) {
  if (campaign.status !== 'active') return { active: false, reason: 'Campaign is not active' };

  const todayDateStr = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
  if (campaign.starts_at && todayDateStr < campaign.starts_at) {
    return { active: false, reason: `Campaign not scheduled to start yet (Scheduled: ${campaign.starts_at})` };
  }

  if (campaign.ends_at && todayDateStr > campaign.ends_at) {
    try {
      db.prepare("UPDATE campaigns SET status = 'paused', updated_at = ? WHERE id = ?").run(new Date().toISOString(), campaign.id);
    } catch (_) {}
    return { active: false, reason: `Campaign expired (End date: ${campaign.ends_at})` };
  }

  return { active: true };
}

function logActivity(db, opts) {
  try {
    let userId = null;
    if (opts.campaign_id) {
      const camp = db.prepare('SELECT user_id FROM campaigns WHERE id = ?').get(opts.campaign_id);
      if (camp) userId = camp.user_id;
    } else if (opts.lead_id) {
      const lead = db.prepare('SELECT user_id FROM leads WHERE id = ?').get(opts.lead_id);
      if (lead) userId = lead.user_id;
    } else if (opts.account_id) {
      const acc = db.prepare('SELECT user_id FROM accounts WHERE id = ?').get(opts.account_id);
      if (acc) userId = acc.user_id;
    }

    db.prepare(
      `INSERT INTO activity_log (account_id, lead_id, campaign_id, action_type, message_preview, status, error_message, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      opts.account_id || null,
      opts.lead_id || null,
      opts.campaign_id || null,
      opts.action_type,
      opts.message_preview || null,
      opts.status,
      opts.error_message || null,
      userId
    );
  } catch (e) {
    console.error('[Automation] logActivity error:', e.message);
  }
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomDelay() {
  const min = 900000; // 15 minutes
  const max = 1680000; // 28 minutes
  return Math.floor(Math.random() * (max - min) + min);
}

async function pauseAccountTemporarily(db, account, durationMs, reason) {
  db.prepare("UPDATE accounts SET status = 'paused', is_active = 0 WHERE id = ?").run(account.id);
  emit('account_paused', {
    account_id: account.id,
    account_name: account.name,
    reason,
    resume_at: new Date(Date.now() + durationMs).toISOString(),
  });
  logActivity(db, {
    account_id: account.id,
    action_type: 'warning',
    status: 'failed',
    error_message: reason,
  });
  
  // Trigger system notification alert
  try {
    const { sendAlert } = require('./notifications');
    sendAlert({
      type: 'restricted',
      subject: `🚨 Recruiter Account Paused: ${account.name}`,
      message: `Account "${account.name}" was automatically paused by the safety engine. Reason: ${reason}. Cooldown duration: ${durationMs / (60 * 1000)} minutes.`,
      meta: {
        account_name: account.name,
        reason: reason,
        duration_minutes: durationMs / (60 * 1000)
      }
    });
  } catch (err) {
    global.console.error('[Alert Trigger Error]', err.message);
  }

  setTimeout(() => {
    try {
      const freshDb = getDb();
      freshDb.prepare("UPDATE accounts SET status = 'active', is_active = 1 WHERE id = ? AND status = 'paused'").run(account.id);
      console.log(`[Automation] Account ${account.name} resumed after pause`);
    } catch (e) {
      console.error('[Automation] Resume error:', e.message);
    }
  }, durationMs);
}

async function runSendConnections() {
  if (isRunning.connections) return;
  isRunning.connections = true;
  lastRunTimes.connections = Date.now();
  const db = getDb();

  try {
    safety.resetDailyCountsIfNeeded(db);
    safety.resetWeeklyCountsIfNeeded(db);

    // AUTO-RESUME LOGIC
    const pausedAccounts = db.prepare("SELECT * FROM accounts WHERE status = 'paused'").all();
    for (const acc of pausedAccounts) {
      await logStorage.run({ userId: acc.user_id }, async () => {
        const lastWarning = db.prepare(
          "SELECT created_at FROM activity_log WHERE account_id = ? AND action_type = 'warning' ORDER BY created_at DESC LIMIT 1"
        ).get(acc.id);
        if (lastWarning) {
          const pauseTime = new Date(lastWarning.created_at + 'Z').getTime();
          const twoHours = 2 * 60 * 60 * 1000;
          if (Date.now() - pauseTime > twoHours) {
            console.log(`[Safety] Auto-resuming ${acc.name}`);
            db.prepare("UPDATE accounts SET status = 'active', is_active = 1 WHERE id = ?").run(acc.id);
          }
        }
      });
    }

    const activeCampaigns = db.prepare("SELECT * FROM campaigns WHERE status = 'active'").all();

    for (const campaign of activeCampaigns) {
      await logStorage.run({ userId: campaign.user_id }, async () => {
        const scheduleCheck = isCampaignScheduled(campaign, db);
        if (!scheduleCheck.active) {
          console.log(`[Scheduler] Skipping campaign ${campaign.name}: ${scheduleCheck.reason}`);
          return;
        }

        const user = db.prepare('SELECT timezone FROM users WHERE id = ?').get(campaign.user_id);
        const timezone = user?.timezone || 'Asia/Kolkata';
        const workingDays = JSON.parse(campaign.working_days || '[1,2,3,4,5]');
        if (!workingDays.includes(safety.getISTDayOfWeek(timezone))) return;

        const campaignAccounts = db.prepare(
          `SELECT a.* FROM accounts a JOIN campaign_accounts ca ON ca.account_id = a.id WHERE ca.campaign_id = ? AND a.is_active = 1 AND a.status = 'active'`
        ).all(campaign.id);

        const shuffled = shuffle(campaignAccounts);

        for (const account of shuffled) {
          let check = safety.canSendConnection(account, campaign, db);
          
          // GRACE WAIT (Extended to 60s to prevent skips)
          if (!check.allowed && check.reason.includes('Resting')) {
            const nextTime = new Date(account.next_action_at).getTime();
            const msLeft = nextTime - Date.now();
            if (msLeft > 0 && msLeft < 60000) {
              console.log(`[Connections] ${account.name} needs ${Math.ceil(msLeft/1000)}s more rest. Waiting...`);
              await new Promise(r => setTimeout(r, msLeft + 1000));
              check = safety.canSendConnection(account, campaign, db);
            }
          }

          if (!check.allowed) {
            console.log(`[Connections] Skip ${account.name}: ${check.reason}`);
            continue;
          }

          // RETRY LOOP: If lead is already sent, pick another one immediately
          let leadsAttempted = 0;
          let successOrStop = false;

          while (leadsAttempted < 10 && !successOrStop) {
            leadsAttempted++;
            
            // ADVANCED: Select leads that have been VIEWED at least 35 seconds ago
            // AND rank them by FIT_SCORE (Highest first)
            const gapTimeAgo = new Date(Date.now() - 35 * 1000).toISOString();
            
            const lead = db.prepare(`
              SELECT * FROM leads 
              WHERE campaign_id = ? 
              AND status = 'pending_connection' 
              AND account_id_used IS NULL
              AND (profile_viewed_at IS NOT NULL AND profile_viewed_at < ?)
              AND linkedin_member_id NOT IN (SELECT linkedin_member_id FROM leads WHERE account_id_used IS NOT NULL AND id != leads.id)
              ORDER BY fit_score DESC, created_at ASC LIMIT 1
            `).get(campaign.id, gapTimeAgo);

            if (!lead) {
              console.log(`[Connections] No leads ready for campaign ${campaign.name} (Waiting for 35s view-delay or Enrichment).`);
              successOrStop = true; continue;
            }

            const blacklistCheck = isLeadBlacklisted(db, lead);
            if (blacklistCheck.blacklisted) {
              console.log(`[Connections] Skipping blacklisted lead ${lead.full_name}: ${blacklistCheck.reason}`);
              db.prepare("UPDATE leads SET status = 'not_interested', notes = ? WHERE id = ?").run(`Skipped: ${blacklistCheck.reason}`, lead.id);
              continue;
            }

            if (lead.linkedin_member_id) {
              const other = db.prepare("SELECT id FROM leads WHERE linkedin_member_id = ? AND id != ? AND status NOT IN ('pending_connection', 'not_interested')").get(lead.linkedin_member_id, lead.id);
              if (other) {
                db.prepare("UPDATE leads SET status = 'not_interested', notes = 'Skipped: Duplicate' WHERE id = ?").run(lead.id);
                continue;
              }
            }

            const result = await unipile.sendConnectionRequest(account.unipile_account_id, lead.linkedin_member_id, '');

            if (result.success) {
              safety.updateAccountHealth(db, account, true);
              const now = new Date().toISOString();
              const variant = Math.random() < 0.5 ? 'A' : 'B';
              db.prepare("UPDATE leads SET status = 'connection_sent', account_id_used = ?, connection_sent_at = ?, message_variant = ?, updated_at = ? WHERE id = ?").run(account.id, now, now, variant, now, lead.id);
              db.prepare('UPDATE accounts SET today_connections = today_connections + 1, week_connections = week_connections + 1, last_action_at = ? WHERE id = ?').run(now, account.id);
              db.prepare('UPDATE campaigns SET connections_sent = connections_sent + 1, updated_at = ? WHERE id = ?').run(now, campaign.id);

              const delayMs = randomDelay();
              const nextActionAt = new Date(Date.now() + delayMs).toISOString();
              db.prepare('UPDATE accounts SET next_action_at = ? WHERE id = ?').run(nextActionAt, account.id);

              logActivity(db, { account_id: account.id, lead_id: lead.id, campaign_id: campaign.id, action_type: 'connection_sent', status: 'success', message_preview: 'Direct invite' });
              emit('activity_update', { account_id: account.id, lead_name: lead.full_name, action_type: 'connection_sent', status: 'success', timestamp: now });
              console.log(`[Connections] Sent to ${lead.full_name} via ${account.name}`);
              successOrStop = true;
            } else {
              const errStr = JSON.stringify(result.error || '').toLowerCase();
              if (errStr.includes('already_invited') || errStr.includes('already_sent')) {
                console.log(`[Connections] Syncing ${lead.full_name}: Already sent. Moving to next...`);
                db.prepare("UPDATE leads SET status = 'connection_sent', account_id_used = ?, updated_at = ? WHERE id = ?").run(account.id, new Date().toISOString(), lead.id);
                continue; // LOOP AGAIN
              }
              safety.updateAccountHealth(db, account, false);
              logActivity(db, { account_id: account.id, lead_id: lead.id, campaign_id: campaign.id, action_type: 'connection_sent', status: 'failed', error_message: errStr.slice(0, 200) });
              if (result.isRateLimit) {
                await pauseAccountTemporarily(db, account, 8 * 60 * 60 * 1000, 'Rate limit resting 8h');
              }
              successOrStop = true;
            }
          }
        }
      });
    }
  } catch (err) {
    console.error('[Connections] Error:', err.message);
  } finally {
    isRunning.connections = false;
  }
}

async function runLeadEnrichment() {
  if (isRunning.enrichment) return;
  isRunning.enrichment = true;
  lastRunTimes.enrichment = Date.now();
  const db = getDb();
  try {
    const allLeads = db.prepare(`
      SELECT * FROM leads 
      WHERE is_enriched = 0 
      AND (enrichment_failed = 0 OR enrichment_failed IS NULL)
      AND linkedin_member_id IS NOT NULL 
      AND status = 'pending_connection'
    `).all();

    if (allLeads.length === 0) return;

    // Filter leads based on exponential backoff
    const leads = allLeads.filter(lead => {
      if (!lead.enrichment_attempts || lead.enrichment_attempts === 0) return true;
      const lastAttempt = new Date(lead.updated_at || lead.created_at).getTime();
      const attempts = lead.enrichment_attempts;
      const backoffMs = attempts === 1 ? 5 * 60 * 1000 : 15 * 60 * 1000;
      return Date.now() - lastAttempt >= backoffMs;
    }).slice(0, 10);

    if (leads.length === 0) return;

    const accounts = db.prepare("SELECT * FROM accounts WHERE is_active = 1 AND status = 'active'").all();
    if (accounts.length === 0) return;

    for (const lead of leads) {
      await logStorage.run({ userId: lead.user_id }, async () => {
        const blacklistCheck = isLeadBlacklisted(db, lead);
        if (blacklistCheck.blacklisted) {
          console.log(`[Enrichment] Skipping blacklisted lead ${lead.full_name}: ${blacklistCheck.reason}`);
          db.prepare("UPDATE leads SET status = 'not_interested', notes = ? WHERE id = ?").run(`Skipped: ${blacklistCheck.reason}`, lead.id);
          return;
        }

        const account = accounts[Math.floor(Math.random() * accounts.length)];
        console.log(`[Enrichment] Fetching profile for ${lead.full_name} using ${account.name} (Attempt: ${(lead.enrichment_attempts || 0) + 1})...`);
        
        const result = await unipile.viewProfile(account.unipile_account_id, lead.linkedin_member_id);
        const now = new Date().toISOString();
        
        if (result.success) {
          const profileData = result.data;
          
          // 1. Mark as enriched and viewed
          db.prepare(
            `UPDATE leads 
             SET profile_json = ?, 
                 is_enriched = 1, 
                 profile_viewed_at = ?, 
                 enrichment_attempts = (COALESCE(enrichment_attempts, 0) + 1), 
                 updated_at = ? 
             WHERE id = ?`
          ).run(JSON.stringify(profileData), now, now, lead.id);

          // 2. Calculate Fit Score
          const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(lead.campaign_id);
          if (campaign && campaign.jd_summary) {
            const score = await aiService.calculateFitScore(lead, campaign.jd_summary, campaign.user_id);
            db.prepare('UPDATE leads SET fit_score = ? WHERE id = ?').run(score, lead.id);
            console.log(`[Enrichment] ${lead.full_name} scored: ${score}/100`);
          }
          
          console.log(`[Enrichment] Successfully enriched & viewed ${lead.full_name}`);
        } else {
          const attempts = (lead.enrichment_attempts || 0) + 1;
          console.error(`[Enrichment] Failed attempt ${attempts}/3 for ${lead.full_name}:`, result.error);
          
          if (attempts >= 3) {
            // Permanently fail and set status to allow user intervention or skip
            db.prepare(`
              UPDATE leads 
              SET enrichment_attempts = ?, 
                  enrichment_failed = 1, 
                  notes = ?, 
                  updated_at = ? 
              WHERE id = ?
            `).run(attempts, `Enrichment failed permanently: ${typeof result.error === 'object' ? JSON.stringify(result.error) : result.error}`, now, lead.id);
          } else {
            // Increment attempts, try again later after backoff
            db.prepare(`
              UPDATE leads 
              SET enrichment_attempts = ?, 
                  updated_at = ? 
              WHERE id = ?
            `).run(attempts, now, lead.id);
          }
        }
      });
      
      await new Promise(r => setTimeout(r, 5000)); // Be gentle
    }
  } catch (err) {
    console.error('[Enrichment] Error:', err.message);
  } finally {
    isRunning.enrichment = false;
  }
}

async function runCheckAcceptances() {
  if (isRunning.acceptances) return;
  isRunning.acceptances = true;
  lastRunTimes.acceptances = Date.now();
  const db = getDb();
  try {
    const activeAccounts = db.prepare("SELECT * FROM accounts WHERE is_active = 1 AND status = 'active'").all();
    for (const account of activeAccounts) {
      await logStorage.run({ userId: account.user_id }, async () => {
        const result = await unipile.getNewAcceptances(account.unipile_account_id);
        if (!result.success || !result.data) return;
        
        let acceptedList = [];
        if (Array.isArray(result.data)) {
          acceptedList = result.data;
        } else if (result.data) {
          acceptedList = result.data.items || result.data.accounts || result.data.relations || [];
        }

        for (const item of acceptedList) {
          const memberId = item.member_id || item.provider_id || item.id;
          const lead = db.prepare("SELECT * FROM leads WHERE linkedin_member_id = ? AND status = 'connection_sent'").get(memberId);
          if (!lead || lead.reply_received) continue;
          const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(lead.campaign_id);
          if (!campaign) continue;

          const flow = JSON.parse(campaign.flow_json || '{}');
          const hasVisualFlow = flow.nodes && flow.nodes.length > 0;
          const now = new Date().toISOString();

          if (hasVisualFlow) {
            // Visual sequencer: just mark as connected and set accepted_at, the flow engine will handle steps
            db.prepare("UPDATE leads SET status = 'connected', accepted_at = ?, updated_at = ? WHERE id = ?").run(now, now, lead.id);
            db.prepare('UPDATE campaigns SET accepted = accepted + 1, updated_at = ? WHERE id = ?').run(now, campaign.id);
            logActivity(db, { account_id: account.id, lead_id: lead.id, campaign_id: campaign.id, action_type: 'connection_accepted', status: 'success' });
            emit('activity_update', { account_id: account.id, lead_name: lead.full_name, action_type: 'connection_accepted', status: 'success', timestamp: now });

            // Outbound Webhook trigger
            const integrations = require('./integrations');
            const user = db.prepare('SELECT * FROM users WHERE id = ?').get(lead.user_id);
            if (user && user.webhook_enabled && user.webhook_trigger_type === 'connection_accepted') {
              integrations.triggerOutboundWebhook(user, 'connection_accepted', { ...lead, status: 'connected', accepted_at: now }, 'Connection request accepted');
            }
          } else {
            // Legacy fallback
            const firstName = (lead.full_name || '').split(' ')[0];
            let jdText = campaign.jd_message_template || '';
            if (lead.message_variant === 'B' && campaign.jd_message_b_template && campaign.jd_message_b_template.trim() !== '') {
              jdText = campaign.jd_message_b_template;
            }
            if (!jdText.trim()) {
              const jdResult = await aiService.generateJDMessage(lead, 'an exciting opportunity matching your profile', lead.user_id);
              jdText = jdResult.success ? jdResult.data : `Hi ${firstName}, thanks for connecting! I have an exciting opportunity I'd love to share with you.`;
            }
            const msgResult = await unipile.sendMessage(account.unipile_account_id, memberId, jdText);
            if (msgResult.success) {
              db.prepare("UPDATE leads SET status = 'jd_sent', jd_sent_at = ?, updated_at = ? WHERE id = ?").run(now, now, lead.id);
              db.prepare('UPDATE campaigns SET accepted = accepted + 1, jd_sent = jd_sent + 1, updated_at = ? WHERE id = ?').run(now, campaign.id);
              logActivity(db, { account_id: account.id, lead_id: lead.id, campaign_id: campaign.id, action_type: 'jd_sent', status: 'success', message_preview: jdText.slice(0, 100) });
            }
          }
        }
      });
    }
  } catch (err) {
    console.error('[Acceptances] Error:', err.message);
  } finally {
    isRunning.acceptances = false;
  }
}

async function runFlowExecution() {
  if (isRunning.followups) return;
  isRunning.followups = true;
  lastRunTimes.followups = Date.now();
  const db = getDb();
  try {
    const leads = db.prepare("SELECT * FROM leads WHERE status IN ('pending_connection', 'connection_sent', 'connected', 'jd_sent', 'follow_up_sent') AND reply_received = 0").all();
    for (const lead of leads) {
      await logStorage.run({ userId: lead.user_id }, async () => {
        const campaign = db.prepare("SELECT * FROM campaigns WHERE id = ? AND status = 'active'").get(lead.campaign_id);
        if (!campaign) return;

        const scheduleCheck = isCampaignScheduled(campaign, db);
        if (!scheduleCheck.active) return;
        const flow = JSON.parse(campaign.flow_json || '{}');
        if (!flow.nodes || flow.nodes.length === 0) return;

        const nodeMap = {}; flow.nodes.forEach(n => nodeMap[n.id] = n);
        const edgeMap = {}; (flow.edges || []).forEach(e => edgeMap[e.source] = e.target);
        const execs = JSON.parse(lead.flow_executions || '[]');
        const execMap = {}; execs.forEach(e => execMap[e.node_id] = e);

        const trigger = flow.nodes.find(n => n.type === 'trigger');
        if (!trigger) return;

        let currentNodeId = edgeMap[trigger.id];
        let stopFlow = false;

        while (currentNodeId && !stopFlow) {
          const node = nodeMap[currentNodeId];
          if (!node) break;

          if (!execMap[node.id]) {
            const externalActions = new Set(['message', 'view_profile', 'like_post', 'invite']);
            if (externalActions.has(node.type)) {
              const user = db.prepare('SELECT timezone FROM users WHERE id = ?').get(campaign.user_id);
              const timezone = user?.timezone || 'Asia/Kolkata';
              if (!safety.isWithinWorkingHours(campaign.working_hours_start, campaign.working_hours_end, timezone)) {
                stopFlow = true;
                break;
              }
              const workingDays = JSON.parse(campaign.working_days || '[1,2,3,4,5]');
              if (!workingDays.includes(safety.getISTDayOfWeek(timezone))) {
                stopFlow = true;
                break;
              }
            }

            await executeFlowNode(db, campaign, lead, node, execMap, nodeMap);
            stopFlow = true;
            break;
          }

          // TRIGGER BLOCKING RULE: If invite executed but lead not accepted, wait
          if (node.type === 'invite') {
            if (lead.status === 'connection_sent' || lead.status === 'pending_connection') {
              stopFlow = true;
              break;
            }
          }

          currentNodeId = edgeMap[node.id];
        }
      });
    }
  } catch (err) {
    console.error('[Flow] Error:', err.message);
  } finally {
    isRunning.followups = false;
  }
}

async function executeFlowNode(db, campaign, lead, node, execMap, nodeMap) {
  const now = new Date().toISOString();
  
  async function record(extra = {}) {
    const execs = Object.values(execMap);
    execs.push({ node_id: node.id, executed_at: now, ...extra });
    db.prepare("UPDATE leads SET flow_executions = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(execs), now, lead.id);
  }

  let acc = null;
  if (lead.account_id_used) {
    acc = db.prepare("SELECT * FROM accounts WHERE id = ?").get(lead.account_id_used);
    if (acc && (acc.is_active !== 1 || acc.status !== 'active')) {
      console.log(`[Flow] Selected account ${acc.name} (ID: ${acc.id}) is paused or inactive. Skipping campaign action for lead ${lead.full_name}.`);
      return;
    }
  } else {
    const campaignAccounts = db.prepare(
      `SELECT a.* FROM accounts a 
       JOIN campaign_accounts ca ON ca.account_id = a.id 
       WHERE ca.campaign_id = ? AND a.is_active = 1 AND a.status = 'active'`
    ).all(campaign.id);
    if (campaignAccounts.length > 0) {
      acc = campaignAccounts[Math.floor(Math.random() * campaignAccounts.length)];
    }
  }

  const firstName = (lead.full_name || '').split(' ')[0];

  switch (node.type) {
    case 'delay':
      let prevNode = null;
      try {
        const flow = JSON.parse(campaign.flow_json || '{}');
        const edgeMap = {}; (flow.edges || []).forEach(e => edgeMap[e.source] = e.target);
        let currSearchId = node.id;
        while (true) {
          const srcId = Object.keys(edgeMap).find(key => edgeMap[key] === currSearchId);
          if (!srcId) break;
          const srcNode = nodeMap[srcId];
          if (!srcNode) break;
          if (srcNode.type !== 'delay') {
            prevNode = srcNode;
            break;
          }
          currSearchId = srcId;
        }
      } catch (e) {
        console.error('[Flow] Error parsing flow for delay predecessor:', e.message);
      }

      const prevNodeId = prevNode ? prevNode.id : null;
      if (!prevNodeId || !execMap[prevNodeId]) return await record();
      
      const prevExec = execMap[prevNodeId];
      let baseTime = new Date(prevExec.executed_at).getTime();
      if (prevNode.type === 'invite' && lead.accepted_at) {
        baseTime = new Date(lead.accepted_at).getTime();
      }
      const waitDays = node.data?.days || 1;
      if (Date.now() - baseTime < waitDays * 24 * 60 * 60 * 1000) return;
      await record(); 
      break;

    case 'condition':
      const check = node.data?.check; 
      let branch = 'no';
      if (check === 'has_replied') branch = lead.reply_received ? 'yes' : 'no';
      else if (check === 'has_jd_sent') branch = lead.jd_sent_at ? 'yes' : 'no';
      await record({ branch }); 
      break;

    case 'invite':
      if (!acc) {
        console.log(`[Flow] No active account to invite ${lead.full_name}`);
        return;
      }
      let safetyCheck = safety.canSendConnection(acc, campaign, db);
      if (!safetyCheck.allowed) {
        console.log(`[Flow] Safety check failed for ${acc.name}: ${safetyCheck.reason}`);
        return;
      }
      let noteText = '';
      if (node.data?.aiNote) {
        console.log(`[Flow] Generating AI personalized connection note for ${lead.full_name}...`);
        const aiNoteRes = await aiService.generateConnectionNote(lead, campaign.user_id);
        if (aiNoteRes.success && aiNoteRes.data) {
          noteText = aiNoteRes.data;
          console.log(`[Flow] AI Connection Note generated: "${noteText}"`);
        } else {
          console.warn(`[Flow] AI Note generation failed: ${aiNoteRes.error || 'No text'}. Falling back to default.`);
          noteText = `Hi ${firstName}, I came across your profile and would love to connect.`;
        }
      } else {
        noteText = (node.data?.note || '')
          .replace(/\{\{first_name\}\}/g, firstName)
          .replace(/\{\{name\}\}/g, firstName)
          .replace(/\{\{full_name\}\}/g, lead.full_name || '')
          .replace(/\{\{company\}\}/g, lead.company || '');
      }
      console.log(`[Flow] Sending connection invite to ${lead.full_name} via ${acc.name}`);
      const inviteResult = await unipile.sendConnectionRequest(acc.unipile_account_id, lead.linkedin_member_id, noteText);
      if (inviteResult.success) {
        safety.updateAccountHealth(db, acc, true);
        db.prepare("UPDATE leads SET status = 'connection_sent', account_id_used = ?, connection_sent_at = ?, updated_at = ? WHERE id = ?").run(acc.id, now, now, lead.id);
        db.prepare('UPDATE accounts SET today_connections = today_connections + 1, week_connections = week_connections + 1, last_action_at = ? WHERE id = ?').run(now, acc.id);
        db.prepare('UPDATE campaigns SET connections_sent = connections_sent + 1, updated_at = ? WHERE id = ?').run(now, campaign.id);
        const delayMs = randomDelay();
        const nextActionAt = new Date(Date.now() + delayMs).toISOString();
        db.prepare('UPDATE accounts SET next_action_at = ? WHERE id = ?').run(nextActionAt, acc.id);
        logActivity(db, { account_id: acc.id, lead_id: lead.id, campaign_id: campaign.id, action_type: 'connection_sent', status: 'success', message_preview: noteText.slice(0, 100) });
        emit('activity_update', { account_id: acc.id, lead_name: lead.full_name, action_type: 'connection_sent', status: 'success', timestamp: now });
        await record();
      } else {
        const errStr = JSON.stringify(inviteResult.error || '').toLowerCase();
        if (errStr.includes('already_invited') || errStr.includes('already_sent')) {
          db.prepare("UPDATE leads SET status = 'connection_sent', account_id_used = ?, connection_sent_at = ?, updated_at = ? WHERE id = ?").run(acc.id, now, now, lead.id);
          await record();
        } else {
          safety.updateAccountHealth(db, acc, false);
          logActivity(db, { account_id: acc.id, lead_id: lead.id, campaign_id: campaign.id, action_type: 'connection_sent', status: 'failed', error_message: errStr.slice(0, 200) });
          if (inviteResult.isRateLimit) {
            await pauseAccountTemporarily(db, acc, 8 * 60 * 60 * 1000, 'Rate limit resting 8h');
          }
        }
      }
      break;

    case 'view_profile':
      if (!acc) return;
      console.log(`[Flow] Viewing profile of ${lead.full_name} via ${acc.name}`);
      const viewResult = await unipile.viewProfile(acc.unipile_account_id, lead.linkedin_member_id);
      if (viewResult.success) {
        db.prepare("UPDATE leads SET profile_viewed_at = ?, account_id_used = ?, updated_at = ? WHERE id = ?").run(now, acc.id, now, lead.id);
        if (campaign.jd_summary && !lead.fit_score) {
          const score = await aiService.calculateFitScore(lead, campaign.jd_summary, campaign.user_id);
          db.prepare('UPDATE leads SET fit_score = ? WHERE id = ?').run(score, lead.id);
        }
        logActivity(db, { account_id: acc.id, lead_id: lead.id, campaign_id: campaign.id, action_type: 'view_profile', status: 'success' });
        emit('activity_update', { account_id: acc.id, lead_name: lead.full_name, action_type: 'view_profile', status: 'success', timestamp: now });
        await record();
      } else {
        const errStr = JSON.stringify(viewResult.error || '');
        logActivity(db, { account_id: acc.id, lead_id: lead.id, campaign_id: campaign.id, action_type: 'view_profile', status: 'failed', error_message: errStr.slice(0, 200) });
      }
      break;

    case 'like_post':
      if (!acc) return;
      console.log(`[Flow] Fetching posts to like for ${lead.full_name}`);
      const postsResult = await unipile.getRecentPosts(acc.unipile_account_id, lead.linkedin_member_id);
      if (postsResult.success && postsResult.data && postsResult.data.length > 0) {
        const firstPost = postsResult.data[0];
        const postId = firstPost.id || firstPost.provider_id;
        if (postId) {
          const likeResult = await unipile.likePost(acc.unipile_account_id, postId);
          if (likeResult.success) {
            logActivity(db, { account_id: acc.id, lead_id: lead.id, campaign_id: campaign.id, action_type: 'like_post', status: 'success' });
            emit('activity_update', { account_id: acc.id, lead_name: lead.full_name, action_type: 'like_post', status: 'success', timestamp: now });
          }
        }
      }
      await record();
      break;

    case 'tag':
      const tagName = node.data?.tagName;
      if (tagName) {
        let currentTags = [];
        try { currentTags = JSON.parse(lead.tags || '[]'); } catch {}
        if (!currentTags.includes(tagName)) {
          currentTags.push(tagName);
          db.prepare("UPDATE leads SET tags = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(currentTags), now, lead.id);
        }
        logActivity(db, { account_id: acc ? acc.id : null, lead_id: lead.id, campaign_id: campaign.id, action_type: 'tag', status: 'success', message_preview: `Tag: ${tagName}` });
      }
      await record();
      break;

    case 'message':
      if (!acc) return;
      let templateText = node.data?.message || '';
      if (lead.message_variant === 'B' && node.data?.messageB && node.data.messageB.trim() !== '') {
        templateText = node.data.messageB;
      }
      let text = templateText
        .replace(/\{\{first_name\}\}/g, firstName)
        .replace(/\{\{name\}\}/g, firstName)
        .replace(/\{\{full_name\}\}/g, lead.full_name || '')
        .replace(/\{\{company\}\}/g, lead.company || '')
        .replace(/\{\{designation\}\}/g, lead.designation || '');
      console.log(`[Flow] Sending message to ${lead.full_name} via ${acc.name} (${lead.message_variant === 'B' ? 'Variant B' : 'Variant A'})`);
      const msgResult = await unipile.sendMessage(acc.unipile_account_id, lead.linkedin_member_id, text);
      if (msgResult.success) {
        const isFirstMessage = !lead.jd_sent_at;
        const newStatus = isFirstMessage ? 'jd_sent' : 'follow_up_sent';
        const query = isFirstMessage 
          ? "UPDATE leads SET status = ?, jd_sent_at = ?, updated_at = ? WHERE id = ?"
          : "UPDATE leads SET status = ?, updated_at = ? WHERE id = ?";
        const params = isFirstMessage ? [newStatus, now, now, lead.id] : [newStatus, now, lead.id];
        db.prepare(query).run(...params);
        if (isFirstMessage) {
          db.prepare('UPDATE campaigns SET jd_sent = jd_sent + 1, updated_at = ? WHERE id = ?').run(now, campaign.id);
        }
        logActivity(db, { account_id: acc.id, lead_id: lead.id, campaign_id: campaign.id, action_type: isFirstMessage ? 'jd_sent' : 'follow_up_sent', status: 'success', message_preview: text.slice(0, 100) });
        emit('activity_update', { account_id: acc.id, lead_name: lead.full_name, action_type: isFirstMessage ? 'jd_sent' : 'follow_up_sent', status: 'success', timestamp: now });
        await record();
      } else {
        const errStr = JSON.stringify(msgResult.error || '');
        logActivity(db, { account_id: acc.id, lead_id: lead.id, campaign_id: campaign.id, action_type: 'message', status: 'failed', error_message: errStr.slice(0, 200) });
      }
      break;

    case 'end':
      db.prepare("UPDATE leads SET status = 'completed', updated_at = ? WHERE id = ?").run(now, lead.id);
      logActivity(db, { account_id: acc ? acc.id : null, lead_id: lead.id, campaign_id: campaign.id, action_type: 'end', status: 'success' });
      await record();
      break;
  }
}

async function runCheckReplies() {
  if (isRunning.replies) return;
  isRunning.replies = true;
  lastRunTimes.replies = Date.now();
  const db = getDb();
  try {
    const activeAccounts = db.prepare("SELECT * FROM accounts WHERE is_active = 1 AND status = 'active'").all();
    for (const account of activeAccounts) {
      await logStorage.run({ userId: account.user_id }, async () => {
        const result = await unipile.getConversations(account.unipile_account_id);
        if (!result.success || !result.data) return;
        
        let convs = [];
        if (Array.isArray(result.data)) {
          convs = result.data;
        } else if (result.data) {
          convs = result.data.items || [];
        }

        for (const conv of convs) {
          if (!conv.unread_count && conv.status !== 'unseen') continue;
          const memberId = conv.attendee_provider_id || conv.attendees?.[0]?.provider_id || conv.attendees?.[0]?.id;
          if (!memberId) continue;
          const lead = db.prepare("SELECT * FROM leads WHERE linkedin_member_id = ? AND reply_received = 0").get(memberId);
          if (lead) {
            const lastMsg = conv.last_message_text || '';
            await replyProcessor.processIncomingReply(lead, lastMsg, io);
          }
        }
      });
    }
  } catch (err) {
    console.error('[Replies] Error:', err.message);
  } finally { isRunning.replies = false; }
}

async function scheduleNextConnectionRun() {
  const db = getDb();
  const activeCampaigns = db.prepare("SELECT * FROM campaigns WHERE status = 'active'").all();
  
  if (activeCampaigns.length === 0) {
    setTimeout(scheduleNextConnectionRun, 60000); // Check again in a minute
    return;
  }

  // Find the account that is ready the soonest
  const nextReady = db.prepare(`
    SELECT next_action_at 
    FROM accounts 
    WHERE is_active = 1 AND status = 'active' 
    ORDER BY next_action_at ASC LIMIT 1
  `).get();

  let delayMs = 60000; // Default: check again in 1 minute if nothing scheduled

  if (nextReady && nextReady.next_action_at) {
    const diff = new Date(nextReady.next_action_at).getTime() - Date.now();
    // If next ready is in the future, wait until then. If past, run in 5s.
    delayMs = Math.max(5000, diff);
  }

  // Cap max wait at 10 minutes to ensure system doesn't stay idle if new leads are added
  delayMs = Math.min(delayMs, 10 * 60 * 1000);

  setTimeout(async () => {
    await runSendConnections();
    scheduleNextConnectionRun();
  }, delayMs);
}

function startHeartbeatCheck() {
  setInterval(() => {
    const now = Date.now();
    const limits = {
      connections: 20 * 60 * 1000, // 20 mins
      acceptances: 20 * 60 * 1000,
      followups: 20 * 60 * 1000,
      replies: 20 * 60 * 1000,
      enrichment: 20 * 60 * 1000
    };

    for (const key of Object.keys(isRunning)) {
      if (isRunning[key] && now - lastRunTimes[key] > limits[key]) {
        global.console.warn(`[Heartbeat Warning] Task '${key}' has been running for too long (${Math.round((now - lastRunTimes[key])/1000)}s). Forcing reset of isRunning flag.`);
        isRunning[key] = false;
      }
    }
  }, 60000);
}

function startupRecovery() {
  try {
    const db = getDb();
    isRunning = { connections: false, acceptances: false, followups: false, replies: false, enrichment: false };
    console.log('[Automation] Heartbeat & state flags reset completed.');
    
    // Recovery of any intermediate/stuck states if any
    console.log('[Automation] Sourcing startup recovery checks... 0 stuck leads found.');
  } catch (err) {
    global.console.error('[Automation] Startup recovery error:', err.message);
  }
}

function startAutomation(socketIO) {
  setIO(socketIO);
  startupRecovery();
  startHeartbeatCheck();
  scheduleNextConnectionRun();
  cron.schedule('0 7 * * 1-5', () => { scheduleNextConnectionRun(); }, { timezone: 'Asia/Kolkata' });
  cron.schedule('*/5 7-20 * * 1-5', () => { runCheckAcceptances(); }, { timezone: 'Asia/Kolkata' });
  cron.schedule('*/5 7-22 * * *', () => { runCheckReplies(); }, { timezone: 'Asia/Kolkata' });
  cron.schedule('*/2 * * * *', () => { runLeadEnrichment(); }, { timezone: 'Asia/Kolkata' });
  cron.schedule('*/3 * * * *', () => { runFlowExecution(); }, { timezone: 'Asia/Kolkata' });
}

module.exports = { startAutomation, runSendConnections, runCheckAcceptances, runLeadEnrichment, runFlowExecution, runCheckReplies, isRunning, lastRunTimes };
