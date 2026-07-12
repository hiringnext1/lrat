const axios = require('axios');

/**
 * Sends a webhook payload to the user's custom Zapier/Make DSN URL
 * @param {Object} user - The authenticated user config row
 * @param {string} eventType - Webhook event type (e.g. 'positive_reply', 'all_replies')
 * @param {Object} lead - The lead DB row
 * @param {string} messageText - The latest message content
 */
async function triggerOutboundWebhook(user, eventType, lead, messageText) {
  if (!user.webhook_enabled || !user.webhook_url || !user.webhook_url.trim()) {
    return;
  }

  console.log(`[Integrations] Dispatching Outbound Webhook [${eventType}] to ${user.webhook_url} for user ID ${user.id}`);
  
  let parsedTags = [];
  try {
    parsedTags = JSON.parse(lead.tags || '[]');
  } catch (_) {}

  const payload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    },
    lead: {
      id: lead.id,
      full_name: lead.full_name,
      linkedin_url: lead.linkedin_url,
      designation: lead.designation,
      company: lead.company,
      location: lead.location,
      fit_score: lead.fit_score || 0,
      tags: parsedTags,
      ai_sentiment: lead.ai_sentiment || 'neutral'
    },
    message: {
      text: messageText,
      timestamp: new Date().toISOString()
    }
  };

  try {
    await axios.post(user.webhook_url, payload, { timeout: 8000 });
    console.log(`[Integrations] Outbound Webhook dispatched successfully`);
  } catch (err) {
    console.error(`[Integrations] Outbound Webhook failed:`, err.message);
  }
}

/**
 * Sends a real-time Slack channel notification to the user's specific Slack webhook
 * @param {Object} user - The authenticated user config row
 * @param {Object} lead - The lead DB row
 * @param {string} messageText - The prospect's response text
 */
async function sendUserSlackNotification(user, lead, messageText) {
  if (!user.slack_alerts_enabled || !user.slack_webhook_url || !user.slack_webhook_url.trim()) {
    return;
  }

  console.log(`[Integrations] Dispatching Slack Alert for user ID ${user.id}`);

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const inboxLink = `${frontendUrl}/dashboard/inbox`;

  let parsedTags = [];
  try {
    parsedTags = JSON.parse(lead.tags || '[]');
  } catch (_) {}

  const payload = {
    text: `🔥 *New Hot Lead Alert: ${lead.full_name}*`,
    attachments: [
      {
        color: '#10b981', // green accent
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${lead.full_name}* (${lead.designation || 'LinkedIn Professional'} at *${lead.company || 'Unknown'}*) has responded positively to your outreach.`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Reply Preview:*\n> _${messageText.slice(0, 200)}${messageText.length > 200 ? '...' : ''}_`
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Fit Score:*\n${lead.fit_score || 0}%`
              },
              {
                type: 'mrkdwn',
                text: `*Tags:*\n${parsedTags.length > 0 ? parsedTags.map(t => `\`${t}\``).join(', ') : 'None'}`
              }
            ]
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: '💬 Open Inbox Conversation'
                },
                url: inboxLink,
                style: 'primary'
              }
            ]
          }
        ]
      }
    ]
  };

  try {
    await axios.post(user.slack_webhook_url, payload, { timeout: 6000 });
    console.log(`[Integrations] Slack notification sent successfully`);
  } catch (err) {
    console.error(`[Integrations] Slack notification failed:`, err.message);
  }
}

module.exports = {
  triggerOutboundWebhook,
  sendUserSlackNotification
};
