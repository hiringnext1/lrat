const nodemailer = require('nodemailer');
const axios = require('axios');
const { getSetting } = require('../config/database');
const emailService = require('./emailService');


/**
 * Sends a system alert to configured channels (Slack, Email)
 * @param {Object} params
 * @param {('restricted'|'hot_lead'|'system_error')} params.type - Alert type
 * @param {string} params.subject - Alert title/subject
 * @param {string} params.message - Alert detail/message
 * @param {Object} [params.meta] - Additional JSON metadata (account name, lead details, etc.)
 */
async function sendAlert({ type, subject, message, meta = {} }) {
  console.log(`[Alert System] Triggering alert [${type}] - ${subject}`);

  // Fetch alert endpoints from DB settings or process env
  const slackWebhookUrl = getSetting('ALERT_SLACK_WEBHOOK') || process.env.ALERT_SLACK_WEBHOOK;
  const emailRecipient = getSetting('ALERT_EMAIL_RECIPIENT') || process.env.ALERT_EMAIL_RECIPIENT;

  // 1. Deliver Slack Notification
  if (slackWebhookUrl && slackWebhookUrl.trim()) {
    try {
      const color = type === 'hot_lead' ? '#10b981' : type === 'restricted' ? '#ef4444' : '#f59e0b';
      const emoji = type === 'hot_lead' ? '🔥' : type === 'restricted' ? '🚨' : '⚠️';
      
      const payload = {
        attachments: [
          {
            color,
            title: `${emoji} ${subject}`,
            text: message,
            fields: Object.keys(meta).map(key => ({
              title: key.replace(/_/g, ' ').toUpperCase(),
              value: typeof meta[key] === 'object' ? JSON.stringify(meta[key]) : String(meta[key]),
              short: true
            })),
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      };

      await axios.post(slackWebhookUrl, payload, { timeout: 5000 });
      console.log('[Alert System] Slack alert dispatched successfully');
    } catch (err) {
      console.error('[Alert System] Slack webhook failed:', err.message);
    }
  } else {
    console.log('[Alert System] Slack alerts skipped: ALERT_SLACK_WEBHOOK not set.');
  }

  // 2. Deliver Email Notification via Nodemailer
  if (emailRecipient && emailRecipient.trim()) {
    try {
      const transporter = emailService.createTransporter();
      const smtpUser = getSetting('SMTP_USER') || process.env.SMTP_USER || 'alerts@lrat.local';

      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
          <div style="background: ${type === 'hot_lead' ? '#10b981' : type === 'restricted' ? '#ef4444' : '#f59e0b'}; padding: 15px; text-align: center; border-radius: 8px 8px 0 0; color: white;">
            <h2 style="margin: 0; font-size: 20px;">LRAT System Alert</h2>
          </div>
          <div style="padding: 20px; color: #1e293b;">
            <h3 style="margin-top: 0; color: #0f172a;">${subject}</h3>
            <p style="font-size: 14px; line-height: 1.6;">${message}</p>
            
            ${Object.keys(meta).length > 0 ? `
              <h4 style="border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; margin-top: 20px;">Metadata Details</h4>
              <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                ${Object.entries(meta).map(([key, val]) => `
                  <tr>
                    <td style="padding: 6px 0; font-weight: bold; color: #64748b; width: 40%; text-transform: uppercase;">${key.replace(/_/g, ' ')}</td>
                    <td style="padding: 6px 0; color: #0f172a;">${typeof val === 'object' ? JSON.stringify(val) : val}</td>
                  </tr>
                `).join('')}
              </table>
            ` : ''}
          </div>
          <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px;">
            This is an automated alert from LRAT Outreach Automation Platform.
          </div>
        </div>
      `;

      const info = await transporter.sendMail({
        from: `"LRAT Outreach Engine" <${smtpUser || 'alerts@lrat.local'}>`,
        to: emailRecipient,
        subject: `[LRAT ALERT] ${subject}`,
        html: htmlContent
      });

      if (info.message) {
        console.log('[Alert System] Email preview content logged (JSON Transport)');
      } else {
        console.log('[Alert System] Email alert sent successfully to:', emailRecipient);
      }
    } catch (err) {
      console.error('[Alert System] Email delivery failed:', err.message);
    }
  } else {
    console.log('[Alert System] Email alerts skipped: ALERT_EMAIL_RECIPIENT not set.');
  }
}

module.exports = { sendAlert };
