const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const unipile = require('../services/unipile');
const aiService = require('../services/nvidia');

const nameCache = {};

router.get('/unread-count', (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) as count FROM leads WHERE reply_received = 1 AND is_read = 0 AND user_id = ?').get(req.userId);
    res.json({ success: true, count: row.count || 0 });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/conversations', async (req, res) => {
  try {
    const db = getDb();
    const { account_id, campaign_id, sort } = req.query;

    let accounts = db.prepare("SELECT * FROM accounts WHERE is_active = 1 AND user_id = ?").all(req.userId);
    if (account_id) accounts = accounts.filter((a) => a.id === parseInt(account_id));

    const allConversations = [];

    for (const account of accounts) {
      const result = await unipile.getConversations(account.unipile_account_id);
      if (!result.success) continue;

      for (const conv of result.data) {
        let memberId = conv.attendee_provider_id;
        
        // Fallback for different Unipile versions/structures
        if (!memberId) {
           let attendees = [];
           if (Array.isArray(conv.attendees) && conv.attendees.length > 0) attendees = conv.attendees;
           else if (Array.isArray(conv.participants) && conv.participants.length > 0) attendees = conv.participants;
           else if (conv.attendee) attendees = [conv.attendee];

           const otherParty = attendees.find((a) => a.id !== account.unipile_account_id) || attendees[0];
           memberId = otherParty?.provider_id || otherParty?.id;
        }

        if (!memberId) continue;

        // 1. Try Database matching
        let lead = db.prepare('SELECT * FROM leads WHERE linkedin_member_id = ? AND user_id = ?').get(memberId, req.userId);
        
        // ONLY display conversations that exist in our Leads database
        if (!lead) continue;
        
        if (campaign_id && String(lead.campaign_id) !== String(campaign_id)) continue;

        // 2. Resolve Name (Database -> Cache -> Unipile API Fallback)
        let attendeeName = 'Unknown User';
        
        if (lead?.full_name) {
          attendeeName = lead.full_name;
        } else if (nameCache[memberId]) {
          attendeeName = nameCache[memberId];
        } else {
          try {
            const attRes = await unipile.getAttendee(memberId);
            if (attRes.success && (attRes.data.display_name || attRes.data.name)) {
              attendeeName = attRes.data.display_name || attRes.data.name;
              nameCache[memberId] = attendeeName;
            }
          } catch (e) {
             console.error(`[Inbox] Failed to resolve name for ${memberId}`);
          }
        }

        allConversations.push({
          ...conv,
          account_id: account.id,
          account_name: account.name,
          attendee_name: attendeeName,
          lead: lead || null,
        });
      }
    }

    if (sort === 'score' || sort === 'fit_score') {
      allConversations.sort((a, b) => {
        const aScore = a.lead?.fit_score || 0;
        const bScore = b.lead?.fit_score || 0;
        if (bScore !== aScore) {
          return bScore - aScore;
        }
        const aTime = a.last_message_at || a.updated_at || a.timestamp || '';
        const bTime = b.last_message_at || b.updated_at || b.timestamp || '';
        return bTime.localeCompare(aTime);
      });
    } else {
      allConversations.sort((a, b) => {
        const aTime = a.last_message_at || a.updated_at || a.timestamp || '';
        const bTime = b.last_message_at || b.updated_at || b.timestamp || '';
        return bTime.localeCompare(aTime);
      });
    }

    res.json({ success: true, data: allConversations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/conversations/:chatId/messages', async (req, res) => {
  try {
    const result = await unipile.getMessages(req.params.chatId);
    if (!result.success) {
      return res.status(502).json({ success: false, error: 'Failed to fetch messages', details: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/conversations/:chatId/reply', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'message is required' });

    const result = await unipile.sendReply(req.params.chatId, message);
    if (!result.success) {
      return res.status(502).json({ success: false, error: 'Failed to send reply', details: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/conversations/:chatId/read', (req, res) => {
  try {
    const db = getDb();
    const { lead_id } = req.body;
    if (!lead_id) return res.status(400).json({ success: false, error: 'lead_id is required' });

    db.prepare('UPDATE leads SET is_read = 1, updated_at = ? WHERE id = ? AND user_id = ?').run(
      new Date().toISOString(), lead_id, req.userId
    );
    res.json({ success: true, message: 'Lead marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/leads/:leadId/tags', (req, res) => {
  try {
    const db = getDb();
    const { tags } = req.body;
    if (!Array.isArray(tags)) return res.status(400).json({ success: false, error: 'tags must be an array' });

    const lead = db.prepare('SELECT id FROM leads WHERE id = ? AND user_id = ?').get(req.params.leadId, req.userId);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

    db.prepare('UPDATE leads SET tags = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(
      JSON.stringify(tags), new Date().toISOString(), req.params.leadId, req.userId
    );

    const updated = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(req.params.leadId, req.userId);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/canned', (req, res) => {
  try {
    const db = getDb();
    const messages = db.prepare('SELECT * FROM canned_messages WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC').all(req.userId);
    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/canned', (req, res) => {
  try {
    const db = getDb();
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ success: false, error: 'title and content are required' });

    const result = db.prepare('INSERT INTO canned_messages (title, content, user_id) VALUES (?, ?, ?)').run(title, content, req.userId);
    const message = db.prepare('SELECT * FROM canned_messages WHERE id = ? AND user_id = ?').get(result.lastInsertRowid, req.userId);
    res.json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/canned/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM canned_messages WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ success: true, message: 'Canned message deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/conversations/:chatId/approve-draft', async (req, res) => {
  try {
    const db = getDb();
    const { lead_id, message } = req.body;
    if (!lead_id || !message) {
      return res.status(400).json({ success: false, error: 'lead_id and message are required' });
    }

    const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(lead_id, req.userId);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

    // 1. Send the message via Unipile
    const result = await unipile.sendReply(req.params.chatId, message);
    if (!result.success) {
      return res.status(502).json({ success: false, error: 'Failed to send reply', details: result.error });
    }

    const now = new Date().toISOString();

    // 2. Update lead's draft status to 'approved' and clear draft content
    db.prepare(
      `UPDATE leads SET 
        ai_draft_status = 'approved',
        ai_draft_reply = '',
        updated_at = ? 
       WHERE id = ? AND user_id = ?`
    ).run(now, lead_id, req.userId);

    // 3. Log the activity
    db.prepare(
      `INSERT INTO activity_log (account_id, lead_id, campaign_id, action_type, message_preview, status, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      lead ? lead.account_id_used : null,
      lead_id,
      lead ? lead.campaign_id : null,
      'ai_draft_approved',
      message.slice(0, 100),
      'success',
      req.userId
    );

    res.json({ success: true, message: 'Draft approved and sent successfully', data: result.data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/leads/:leadId/reject-draft', (req, res) => {
  try {
    const db = getDb();
    const lead = db.prepare('SELECT id FROM leads WHERE id = ? AND user_id = ?').get(req.params.leadId, req.userId);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

    db.prepare(
      `UPDATE leads SET 
        ai_draft_status = 'rejected',
        ai_draft_reply = '',
        updated_at = ? 
       WHERE id = ? AND user_id = ?`
    ).run(new Date().toISOString(), req.params.leadId, req.userId);
    res.json({ success: true, message: 'Draft rejected/dismissed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/ai-reply-suggestions', async (req, res) => {
  try {
    const db = getDb();
    const { lead_id, last_message, conversation_history } = req.body;

    if (!lead_id || !last_message) {
      return res.status(400).json({ success: false, error: 'lead_id and last_message are required' });
    }

    const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(lead_id, req.userId);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

    const result = await aiService.generateAIReply(lead, conversation_history || [], last_message);
    res.json({ success: true, data: result.data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
