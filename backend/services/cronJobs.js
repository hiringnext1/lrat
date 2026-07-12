const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { getDb, getSetting } = require('../config/database');

/**
 * Compiles and sends the Daily Email Digest for a specific user.
 * @param {number} userId - The target user ID
 */
async function sendDailyDigest(userId) {
  const db = getDb();
  
  // 1. Fetch user info
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user || !user.email) return;

  console.log(`[Digest Service] Generating daily digest for ${user.email}...`);

  // 2. Query outreach metrics in the last 24 hours
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const connectionsSent = db.prepare(
    "SELECT COUNT(*) as c FROM activity_log WHERE user_id = ? AND action_type = 'connection_sent' AND created_at >= ?"
  ).get(userId, since24h).c;

  const connectionsAccepted = db.prepare(
    "SELECT COUNT(*) as c FROM activity_log WHERE user_id = ? AND action_type = 'connection_accepted' AND created_at >= ?"
  ).get(userId, since24h).c;

  const repliesReceived = db.prepare(
    "SELECT COUNT(*) as c FROM leads WHERE user_id = ? AND reply_received = 1 AND reply_received_at >= ?"
  ).get(userId, since24h).c;

  const positiveReplies = db.prepare(
    "SELECT COUNT(*) as c FROM leads WHERE user_id = ? AND reply_received = 1 AND ai_sentiment = 'positive' AND reply_received_at >= ?"
  ).get(userId, since24h).c;

  const activeCampaigns = db.prepare(
    "SELECT COUNT(*) as c FROM campaigns WHERE user_id = ? AND status = 'active'"
  ).get(userId).c;

  const activeSenders = db.prepare(
    "SELECT COUNT(*) as c FROM accounts WHERE user_id = ? AND is_active = 1 AND status = 'active'"
  ).get(userId).c;

  // 3. Setup Nodemailer Transporter using system credentials
  const smtpHost = getSetting('SMTP_HOST') || process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(getSetting('SMTP_PORT') || process.env.SMTP_PORT || '587');
  const smtpUser = getSetting('SMTP_USER') || process.env.SMTP_USER;
  const smtpPass = getSetting('SMTP_PASS') || process.env.SMTP_PASS;

  let transporter;
  if (smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass }
    });
  } else {
    // Fallback logger transport
    console.log('[Digest Service] SMTP not configured. Printing HTML preview payload to logs.');
    transporter = nodemailer.createTransport({
      jsonTransport: true
    });
  }

  // 4. HTML Template
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; text-align: left; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; bg: #ffffff; background-color: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);">
        
        // Header banner
        <div style="background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 35px 30px; text-align: center; color: white;">
          <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: #93c5fd;">Outreach Performance Report</p>
          <h1 style="margin: 5px 0 0 0; font-size: 22px; font-weight: 900; letter-spacing: -0.025em;">Your Daily Outreach Digest</h1>
          <p style="margin: 8px 0 0 0; font-size: 11px; font-weight: 500; color: #bfdbfe;">${todayStr}</p>
        </div>

        // Content Area
        <div style="padding: 35px 30px;">
          <p style="margin-top: 0; font-size: 13px; line-height: 1.6; color: #475569;">Hi ${user.name || 'there'},</p>
          <p style="font-size: 13px; line-height: 1.6; color: #475569; margin-bottom: 25px;">Here is the outreach summary and campaign metrics recorded for your LinkedIn workspace over the last 24 hours.</p>
          
          // Grid Stats
          <table style="width: 100%; border-collapse: separate; border-spacing: 12px; margin-left: -12px; margin-right: -12px;">
            <tr>
              <td style="width: 50%; background-color: #f1f5f9; padding: 18px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center;">
                <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Invites Sent</p>
                <h2 style="margin: 6px 0 0 0; font-size: 28px; font-weight: 900; color: #1e293b;">${connectionsSent}</h2>
              </td>
              <td style="width: 50%; background-color: #f1f5f9; padding: 18px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center;">
                <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Connections Accepted</p>
                <h2 style="margin: 6px 0 0 0; font-size: 28px; font-weight: 900; color: #10b981;">${connectionsAccepted}</h2>
              </td>
            </tr>
            <tr>
              <td style="width: 50%; background-color: #f1f5f9; padding: 18px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center;">
                <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Replies Received</p>
                <h2 style="margin: 6px 0 0 0; font-size: 28px; font-weight: 900; color: #3b82f6;">${repliesReceived}</h2>
              </td>
              <td style="width: 50%; background-color: #ecfdf5; padding: 18px; border-radius: 16px; border: 1px solid #a7f3d0; text-align: center;">
                <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #059669; letter-spacing: 0.05em;">Positive Sentiment</p>
                <h2 style="margin: 6px 0 0 0; font-size: 28px; font-weight: 900; color: #059669;">🔥 ${positiveReplies}</h2>
              </td>
            </tr>
          </table>

          // Workspace Summary Section
          <h4 style="margin: 25px 0 10px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">Active Infrastructure</h4>
          <table style="width: 100%; font-size: 12px;">
            <tr>
              <td style="padding: 6px 0; color: #475569;">Active LinkedIn Senders</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #1e293b;">${activeSenders} accounts</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #475569;">Active Campaigns</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #1e293b;">${activeCampaigns} campaigns</td>
            </tr>
          </table>

          // Call to Action
          <div style="margin-top: 35px; text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);">Open Dashboard</a>
          </div>

        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px; text-align: center; font-size: 10px; color: #94a3b8;">
          <p style="margin: 0;">This email summary is automatically generated by your LRAT Workspace.</p>
          <p style="margin: 5px 0 0 0;">Want to unsubscribe or change notifications? Go to settings page in your dashboard.</p>
        </div>

      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"LRAT Outreach Summary" <${smtpUser || 'digest@lrat.local'}>`,
      to: user.email,
      subject: `📊 LRAT Daily Outreach Digest — ${todayStr}`,
      html: htmlContent
    });
    console.log(`[Digest Service] Daily digest successfully dispatched to: ${user.email}`);
  } catch (err) {
    console.error(`[Digest Service] Failed to send email to ${user.email}:`, err.message);
  }
}

/**
 * Initializes the daily cron schedule (ticks daily at midnight).
 */
function initDigestScheduler() {
  console.log('[Digest Service] Registering daily email digest cron schedule (at 00:00)...');
  
  // Schedule to run every day at midnight (0 0 * * *)
  cron.schedule('0 0 * * *', async () => {
    console.log('[Digest Service] Triggering daily digest cron job...');
    const db = getDb();
    try {
      const users = db.prepare('SELECT id FROM users WHERE email_digest_enabled = 1').all();
      for (const row of users) {
        try {
          await sendDailyDigest(row.id);
        } catch (innerErr) {
          console.error(`[Digest Service] Error dispatching to user ID ${row.id}:`, innerErr.message);
        }
      }
    } catch (err) {
      console.error('[Digest Service] Cron execution error:', err.message);
    }
  });
}

module.exports = {
  initDigestScheduler,
  sendDailyDigest // exported for testing purposes
};
