const express = require('express');
const router = express.Router();
const { getDb, getSetting } = require('../config/database');
const aiService = require('../services/nvidia');
const { sendAlert } = require('../services/notifications');
const { calculateScore } = require('../services/leadScoring');
const crypto = require('crypto');
const replyProcessor = require('../services/replyProcessor');

function verifyUnipileSignature(req, res, next) {
  const secret = getSetting('UNIPILE_WEBHOOK_SECRET') || process.env.UNIPILE_WEBHOOK_SECRET;
  
  if (!secret) {
    console.warn('[Webhook] Webhook signature verification bypassed (UNIPILE_WEBHOOK_SECRET not configured).');
    return next();
  }

  const signature = req.headers['x-unipile-signature'] || req.headers['x-unipile-signature-sha256'];
  if (!signature) {
    console.error('[Webhook] Missing webhook signature header');
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing signature header' });
  }

  const rawBody = req.rawBody;
  if (!rawBody) {
    console.error('[Webhook] Missing raw request body buffer');
    return res.status(400).json({ success: false, error: 'Bad Request: Missing raw body buffer' });
  }

  try {
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature, 'utf8');
    const computedBuffer = Buffer.from(computedSignature, 'utf8');

    if (signatureBuffer.length !== computedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, computedBuffer)) {
      console.error('[Webhook] Signature verification failed (mismatch)');
      return res.status(401).json({ success: false, error: 'Unauthorized: Signature verification failed' });
    }

    console.log('[Webhook] Webhook signature verified successfully');
    next();
  } catch (err) {
    console.error('[Webhook] Signature verification error:', err.message);
    return res.status(500).json({ success: false, error: 'Internal signature verification failed' });
  }
}

router.post('/unipile', verifyUnipileSignature, async (req, res) => {
  const payload = req.body;
  const io = req.app.get('io');
  const db = getDb();

  console.log(`[Webhook] Received Unipile event: ${payload.event}`);

  try {
    // 1. Handle New Message Received (Replies & Chats)
    if (payload.event === 'message.received') {
      const message = payload.data;
      const accountId = payload.account_id;
      
      // Ignore messages sent by us
      if (message.is_from_me) {
        return res.json({ success: true, message: 'Ignored outgoing message' });
      }

      const senderMemberId = message.sender_id;
      
      // Find the lead in our database
      const lead = db.prepare(
        'SELECT * FROM leads WHERE linkedin_member_id = ? AND reply_received = 0'
      ).get(senderMemberId);

      if (lead) {
        const messageText = message.text || '';
        const io = req.app.get('io');
        await replyProcessor.processIncomingReply(lead, messageText, io);
      }
    }

    // 2. Handle Connection Acceptance Webhooks (relation.updated, etc.)
    if (
      payload.event === 'relation.updated' ||
      payload.event === 'relation.created' ||
      payload.event === 'chat.relation.updated'
    ) {
      const data = payload.data;
      if (data && (data.status === 'CONNECTED' || data.status === 'accepted')) {
        const memberId = data.provider_id || data.id;
        const accountId = payload.account_id;
        
        // Find internal account
        const account = db.prepare('SELECT * FROM accounts WHERE unipile_account_id = ?').get(accountId);
        if (account) {
          // Find lead with status connection_sent
          const lead = db.prepare("SELECT * FROM leads WHERE linkedin_member_id = ? AND status = 'connection_sent'").get(memberId);
          
          if (lead) {
            const now = new Date().toISOString();
            
            // Transition status to 'connected'
            db.prepare(
              `UPDATE leads SET 
                status = 'connected', 
                accepted_at = ?,
                updated_at = ? 
               WHERE id = ?`
            ).run(now, now, lead.id);

            // Notify UI of acceptance
            if (io) {
              io.to('user_' + lead.user_id).emit('new_acceptance', {
                lead_id: lead.id,
                lead_name: lead.full_name,
                account_name: account.name,
              });
            }

            console.log(`[Webhook] Connection accepted for lead: ${lead.full_name} via ${account.name}`);
            
            db.prepare(
              `INSERT INTO activity_log (account_id, lead_id, campaign_id, action_type, status, user_id)
               VALUES (?, ?, ?, ?, ?, ?)`
            ).run(
              account.id,
              lead.id,
              lead.campaign_id,
              'acceptance_received',
              'success',
              lead.user_id
            );

            // Fetch campaign to send a JD message automatically
            const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(lead.campaign_id);
            if (campaign) {
              const flow = JSON.parse(campaign.flow_json || '{}');
              const hasVisualFlow = flow.nodes && flow.nodes.length > 0;

              if (!hasVisualFlow) {
                const firstName = (lead.full_name || '').split(' ')[0];
                let jdText = campaign.jd_message_template || '';
                if (!jdText.trim()) {
                  const jdResult = await aiService.generateJDMessage(lead, 'an exciting opportunity matching your profile', lead.user_id);
                  jdText = jdResult.success ? jdResult.data : `Hi ${firstName}, thanks for connecting! I have an exciting opportunity I'd love to share with you.`;
                }

                // Send message via Unipile
                const unipileService = require('../services/unipile');
                const msgResult = await unipileService.sendMessage(account.unipile_account_id, memberId, jdText);
                
                if (msgResult.success) {
                  db.prepare(
                    `UPDATE leads SET 
                      status = 'jd_sent', 
                      jd_sent_at = ?, 
                      updated_at = ? 
                     WHERE id = ?`
                  ).run(now, now, lead.id);

                  db.prepare(
                    'UPDATE campaigns SET accepted = accepted + 1, jd_sent = jd_sent + 1, updated_at = ? WHERE id = ?'
                  ).run(now, campaign.id);

                  db.prepare(
                    `INSERT INTO activity_log (account_id, lead_id, campaign_id, action_type, message_preview, status, user_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`
                  ).run(
                    account.id,
                    lead.id,
                    lead.campaign_id,
                    'jd_sent',
                    jdText.slice(0, 100),
                    'success',
                    lead.user_id
                  );

                  console.log(`[Webhook] Sent automated JD to ${lead.full_name}`);
                } else {
                  console.error(`[Webhook] Failed to send automated JD to ${lead.full_name}:`, msgResult.error);
                }
              } else {
                // If campaign uses visual flowchart, only increment the accepted count (since the flow executor handles message steps)
                db.prepare(
                  'UPDATE campaigns SET accepted = accepted + 1, updated_at = ? WHERE id = ?'
                ).run(now, campaign.id);
              }
            }

            // Trigger stats refresh in UI
            if (io) {
              const stats = db.prepare(
                `SELECT 
                   COUNT(*) as total_today,
                   ROUND(CAST(SUM(CASE WHEN status != 'pending_connection' AND status != 'connection_sent' THEN 1 ELSE 0 END) AS REAL) / MAX(COUNT(*), 1) * 100, 1) as acceptance_rate,
                   ROUND(CAST(SUM(CASE WHEN reply_received = 1 THEN 1 ELSE 0 END) AS REAL) / MAX(COUNT(*), 1) * 100, 1) as reply_rate
                 FROM leads WHERE user_id = ?`
              ).get(lead.user_id);
              io.to('user_' + lead.user_id).emit('stats_update', stats);
            }
          }
        }
      }
    }

    // 3. Handle Account Status Changes (Disconnected, Restricted, etc.)
    if (payload.event === 'account.status.updated') {
      const { account_id, status } = payload.data;
      const internalAccount = db.prepare('SELECT * FROM accounts WHERE unipile_account_id = ?').get(account_id);
      
      if (internalAccount) {
        let newStatus = 'active';
        if (status === 'OFFLINE' || status === 'DISCONNECTED') newStatus = 'offline';
        if (status === 'REJECTED' || status === 'BANNED') newStatus = 'restricted';

        db.prepare('UPDATE accounts SET status = ?, updated_at = ? WHERE id = ?').run(
          newStatus, new Date().toISOString(), internalAccount.id
        );

        // Trigger notification warnings for offline/restricted accounts
        if (newStatus === 'restricted' || newStatus === 'offline') {
          await sendAlert({
            type: 'restricted',
            subject: `🚨 Recruiter Node Alert: ${internalAccount.name} is ${newStatus.toUpperCase()}`,
            message: `Attention required: Account "${internalAccount.name}" status changed to ${status} in Unipile. Background outreach tasks are suspended for this account.`,
            meta: {
              account_name: internalAccount.name,
              unipile_account_id: account_id,
              current_status: status
            }
          });
        }

        if (io) {
          io.to('user_' + internalAccount.user_id).emit('account_status_changed', {
            account_id: internalAccount.id,
            account_name: internalAccount.name,
            status: newStatus
          });
        }
        console.log(`[Webhook] Account ${internalAccount.name} status updated to: ${newStatus}`);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Webhook Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
