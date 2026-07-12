const { getDb } = require('../config/database');
const aiService = require('./nvidia');
const { calculateScore } = require('./leadScoring');
const { sendAlert } = require('./notifications');
const integrations = require('./integrations');

async function processIncomingReply(lead, messageText, io) {
  const db = getDb();
  const now = new Date().toISOString();

  // Fetch User settings
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(lead.user_id);

  // AI Sentiment Analysis
  const sentiment = await aiService.categorizeMessage(messageText, lead.user_id);

  // Fetch Campaign to access templates
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(lead.campaign_id);
  const jdTemplate = campaign ? campaign.jd_message_template : '';

  // Generate auto-draft reply
  let draftReply = '';
  let newStatus = 'replied';
  let newTags = [];
  try {
    if (lead.tags) {
      newTags = JSON.parse(lead.tags);
    }
  } catch (_) {}

  if (sentiment === 'negative') {
    newStatus = 'not_interested';
    if (!newTags.includes('Excluded')) {
      newTags.push('Excluded');
    }
  }

  // AI Auto-Tagging & Classification
  try {
    const detectedTags = await aiService.getAutoTags(lead, messageText, lead.user_id);
    for (const tag of detectedTags) {
      if (!newTags.includes(tag)) {
        newTags.push(tag);
      }
    }
  } catch (tagErr) {
    global.console.error(`[ReplyProcessor] AI Auto-Tagging failed:`, tagErr.message);
  }

  const draftResult = await aiService.generateAutoDraft(lead, messageText, jdTemplate, lead.user_id);
  if (draftResult.success) {
    draftReply = draftResult.data;
  }

  const score = calculateScore({
    ...lead,
    reply_received: 1
  });

  db.prepare(
    `UPDATE leads SET 
      reply_received = 1, 
      reply_received_at = ?, 
      status = ?, 
      ai_sentiment = ?,
      ai_draft_reply = ?,
      ai_draft_status = ?,
      tags = ?,
      fit_score = ?,
      updated_at = ? 
     WHERE id = ?`
  ).run(
    now, 
    newStatus, 
    sentiment, 
    draftReply, 
    'pending_review', 
    JSON.stringify(newTags),
    score,
    now, 
    lead.id
  );

  db.prepare(
    'UPDATE campaigns SET replied = replied + 1, updated_at = ? WHERE id = ?'
  ).run(now, lead.campaign_id);

  db.prepare(
    `INSERT INTO activity_log (account_id, lead_id, campaign_id, action_type, message_preview, status, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    null,
    lead.id,
    lead.campaign_id,
    'reply_detected',
    messageText.slice(0, 100),
    'success',
    lead.user_id
  );

  // Trigger positive reply alerts
  if (sentiment === 'positive') {
    try {
      await sendAlert({
        type: 'hot_lead',
        subject: `🔥 Hot Lead Replied: ${lead.full_name}`,
        message: `Prospect ${lead.full_name} (${lead.company || 'Unknown Company'}) responded positively to your outreach. Message preview: "${messageText.slice(0, 120)}..."`,
        meta: {
          candidate_name: lead.full_name,
          headline: lead.headline,
          company: lead.company,
          sentiment: 'Positive',
          reply_text: messageText
        }
      });
    } catch (err) {
      global.console.error('[Alert Trigger Error]', err.message);
    }
  }

  // Trigger user-specific integrations
  if (user) {
    if (sentiment === 'positive' && user.slack_alerts_enabled) {
      integrations.sendUserSlackNotification(user, { ...lead, tags: JSON.stringify(newTags), ai_sentiment: sentiment }, messageText);
    }

    if (user.webhook_enabled) {
      let shouldTrigger = false;
      if (user.webhook_trigger_type === 'all_replies') {
        shouldTrigger = true;
      } else if (user.webhook_trigger_type === 'positive_reply' && sentiment === 'positive') {
        shouldTrigger = true;
      }
      
      if (shouldTrigger) {
        integrations.triggerOutboundWebhook(user, 'candidate_reply', { ...lead, tags: JSON.stringify(newTags), ai_sentiment: sentiment }, messageText);
      }
    }
  }

  // Notify UI in real-time
  if (io) {
    io.to('user_' + lead.user_id).emit('new_reply', {
      lead_id: lead.id,
      lead_name: lead.full_name,
      message_preview: messageText.slice(0, 80),
      sentiment,
      ai_draft_reply: draftReply,
      ai_draft_status: 'pending_review',
    });
    
    // Trigger a stats refresh
    const stats = db.prepare(
      `SELECT 
         COUNT(*) as total_today,
         ROUND(CAST(SUM(CASE WHEN status != 'pending_connection' AND status != 'connection_sent' THEN 1 ELSE 0 END) AS REAL) / MAX(COUNT(*), 1) * 100, 1) as acceptance_rate,
         ROUND(CAST(SUM(CASE WHEN reply_received = 1 THEN 1 ELSE 0 END) AS REAL) / MAX(COUNT(*), 1) * 100, 1) as reply_rate
       FROM leads WHERE user_id = ?`
    ).get(lead.user_id);
    io.to('user_' + lead.user_id).emit('stats_update', stats);
  }

  global.console.log(`[ReplyProcessor] Reply processed for lead: ${lead.full_name} (${sentiment})`);
  return { sentiment, tags: newTags, draftReply };
}

module.exports = { processIncomingReply };
