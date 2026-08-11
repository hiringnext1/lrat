/**
 * Daily outreach digest.
 *
 * Sent at 20:00 in each user's OWN timezone. The previous version used
 * cron.schedule('0 0 * * *') with no timezone, so it fired at midnight UTC —
 * 5:30 AM for an Indian user — and at that same instant for everyone on earth.
 *
 * The scheduler therefore ticks every 15 minutes (not hourly: India is +5:30,
 * Nepal +5:45, parts of Australia +9:30) and decides per user.
 */
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');
const emailService = require('./emailService');

const DIGEST_HOUR = 20; // 8 PM local

/** Local calendar date and hour for a timezone, without pulling in a date lib. */
function localParts(timezone, now = new Date()) {
  const tz = timezone || 'Asia/Kolkata';
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      hour: parseInt(parts.hour, 10) % 24,
    };
  } catch (_) {
    // Unknown timezone string — fall back rather than skip the user forever
    return localParts('Asia/Kolkata', now);
  }
}

/** UTC instant of local midnight for the given local date. */
function localDayStartUtc(timezone, now = new Date()) {
  const { date } = localParts(timezone, now);
  // Find the offset by comparing the same instant rendered in UTC and in the tz
  const asUtc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const asLocal = new Date(now.toLocaleString('en-US', { timeZone: timezone || 'Asia/Kolkata' }));
  const offsetMs = asLocal.getTime() - asUtc.getTime();
  return new Date(new Date(`${date}T00:00:00Z`).getTime() - offsetMs).toISOString();
}

/**
 * Pure decision function so the schedule can be tested without waiting for 8 PM.
 * @returns {{send: boolean, reason: string, localDate: string}}
 */
function shouldSendDigest(user, now = new Date()) {
  if (!user?.email) return { send: false, reason: 'no email', localDate: null };
  if (!user.email_digest_enabled) return { send: false, reason: 'digest disabled', localDate: null };

  const { date, hour } = localParts(user.timezone, now);
  if (hour !== DIGEST_HOUR) return { send: false, reason: `local hour ${hour}, not ${DIGEST_HOUR}`, localDate: date };
  if (user.last_digest_date === date) return { send: false, reason: 'already sent today', localDate: date };

  return { send: true, reason: 'due', localDate: date };
}

/** Numbers for the user's own day so far, plus anything needing attention. */
function collectDigestData(db, user, now = new Date()) {
  const since = localDayStartUtc(user.timezone, now);
  const uid = user.id;

  const count = (sql, ...params) => db.prepare(sql).get(...params).c;

  const data = {
    connectionsSent: count(
      "SELECT COUNT(*) as c FROM activity_log WHERE user_id = ? AND action_type = 'connection_sent' AND status = 'success' AND created_at >= ?",
      uid, since),
    accepted: count(
      'SELECT COUNT(*) as c FROM leads WHERE user_id = ? AND accepted_at >= ?', uid, since),
    replies: count(
      'SELECT COUNT(*) as c FROM leads WHERE user_id = ? AND reply_received = 1 AND reply_received_at >= ?', uid, since),
    positiveReplies: count(
      "SELECT COUNT(*) as c FROM leads WHERE user_id = ? AND reply_received = 1 AND ai_sentiment = 'positive' AND reply_received_at >= ?", uid, since),
    messagesSent: count(
      "SELECT COUNT(*) as c FROM activity_log WHERE user_id = ? AND action_type IN ('jd_sent','follow_up_sent') AND status = 'success' AND created_at >= ?",
      uid, since),
    activeCampaigns: count("SELECT COUNT(*) as c FROM campaigns WHERE user_id = ? AND status = 'active'", uid),
    activeSenders: count("SELECT COUNT(*) as c FROM accounts WHERE user_id = ? AND is_active = 1 AND status = 'active'", uid),
    pendingQueue: count("SELECT COUNT(*) as c FROM leads WHERE user_id = ? AND status = 'pending_connection'", uid),
  };

  // Reuse the bell's feed so the email flags the same problems as the app
  let attention = [];
  try {
    const { buildFeed } = require('./notificationFeed');
    attention = buildFeed(db, uid).filter(i => ['error', 'warning'].includes(i.severity)).slice(0, 5);
  } catch (_) {}

  data.attention = attention;
  data.hasActivity = data.connectionsSent + data.accepted + data.replies + data.messagesSent > 0;
  return data;
}

function unsubscribeUrl(userId) {
  const base = process.env.FRONTEND_URL || 'https://growleadz.co';
  try {
    const token = jwt.sign({ userId, purpose: 'digest_unsubscribe' }, process.env.JWT_SECRET, { expiresIn: '365d' });
    return `${base}/api/auth/unsubscribe?token=${token}`;
  } catch (_) {
    return `${base}/dashboard/settings`;
  }
}

function renderDigest(user, data, localDate) {
  const dateLabel = new Date(`${localDate}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const tile = (label, value, color) => `
    <td style="width:25%;background-color:#f1f5f9;padding:16px 8px;border-radius:14px;border:1px solid #e2e8f0;text-align:center;">
      <p style="margin:0;font-size:9px;font-weight:800;text-transform:uppercase;color:#64748b;letter-spacing:0.05em;">${label}</p>
      <h2 style="margin:6px 0 0 0;font-size:26px;font-weight:900;color:${color};">${value}</h2>
    </td>`;

  const attentionBlock = data.attention.length ? `
    <div style="margin-top:26px;padding:16px 18px;background-color:#fffbeb;border:1px solid #fde68a;border-radius:14px;">
      <p style="margin:0 0 8px 0;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:#b45309;">Needs your attention</p>
      ${data.attention.map(a => `
        <p style="margin:0 0 6px 0;font-size:12px;color:#78350f;line-height:1.5;">
          <strong>${a.title}</strong><br/>
          <span style="color:#92400e;font-size:11px;">${a.body}</span>
        </p>`).join('')}
    </div>` : '';

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f8fafc;padding:40px 20px;color:#1e293b;">
    <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:24px;border:1px solid #e2e8f0;overflow:hidden;">

      <div style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:32px 30px;text-align:center;color:#ffffff;">
        <p style="margin:0;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.15em;color:#93c5fd;">Daily Outreach Summary</p>
        <h1 style="margin:6px 0 0 0;font-size:22px;font-weight:900;">Here's your day on LinkedIn</h1>
        <p style="margin:8px 0 0 0;font-size:11px;color:#bfdbfe;">${dateLabel}</p>
      </div>

      <div style="padding:32px 30px;">
        <p style="margin-top:0;font-size:13px;line-height:1.6;color:#475569;">Hi ${user.name || 'there'},</p>
        <p style="font-size:13px;line-height:1.6;color:#475569;margin-bottom:22px;">Everything your senders did today, in your local time.</p>

        <table style="width:100%;border-collapse:separate;border-spacing:8px;margin:0 -8px;">
          <tr>
            ${tile('Invites sent', data.connectionsSent, '#1e293b')}
            ${tile('Accepted', data.accepted, '#10b981')}
            ${tile('Messages', data.messagesSent, '#6366f1')}
            ${tile('Replies', data.replies, '#3b82f6')}
          </tr>
        </table>

        ${data.positiveReplies > 0 ? `
        <div style="margin-top:18px;padding:14px 18px;background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:14px;">
          <p style="margin:0;font-size:13px;color:#065f46;font-weight:700;">🔥 ${data.positiveReplies} positive ${data.positiveReplies === 1 ? 'reply' : 'replies'} waiting in your inbox</p>
        </div>` : ''}

        ${attentionBlock}

        <h4 style="margin:26px 0 10px 0;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;border-bottom:1px solid #f1f5f9;padding-bottom:8px;">Workspace</h4>
        <table style="width:100%;font-size:12px;">
          <tr><td style="padding:5px 0;color:#475569;">Active senders</td><td style="padding:5px 0;text-align:right;font-weight:bold;">${data.activeSenders}</td></tr>
          <tr><td style="padding:5px 0;color:#475569;">Active campaigns</td><td style="padding:5px 0;text-align:right;font-weight:bold;">${data.activeCampaigns}</td></tr>
          <tr><td style="padding:5px 0;color:#475569;">Prospects queued</td><td style="padding:5px 0;text-align:right;font-weight:bold;">${data.pendingQueue}</td></tr>
        </table>

        <div style="margin-top:32px;text-align:center;">
          <a href="${process.env.FRONTEND_URL || 'https://growleadz.co'}/dashboard" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:12px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;">Open dashboard</a>
        </div>
      </div>

      <div style="background-color:#f8fafc;border-top:1px solid #f1f5f9;padding:18px;text-align:center;font-size:10px;color:#94a3b8;">
        <p style="margin:0;">Sent by GrowLeadz at 8:00 PM your time.</p>
        <p style="margin:6px 0 0 0;"><a href="${unsubscribeUrl(user.id)}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe from daily summaries</a></p>
      </div>

    </div>
  </div>`;
}

/**
 * Builds and sends one user's digest.
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
async function sendDailyDigest(userId, now = new Date(), { force = false } = {}) {
  const db = getDb();
  const user = db.prepare(
    'SELECT id, email, name, timezone, email_digest_enabled, last_digest_date FROM users WHERE id = ?'
  ).get(userId);
  if (!user || !user.email) return { sent: false, reason: 'user not found' };

  const { date } = localParts(user.timezone, now);

  // The scheduler already checks this, but the guard belongs here too: any
  // other caller (a manual trigger, a retry) must not be able to send a
  // second digest for the same local day.
  if (!force && user.last_digest_date === date) {
    return { sent: false, reason: 'already sent today' };
  }
  const data = collectDigestData(db, user, now);

  // A daily "everything is zero" email is how people learn to ignore the digest
  if (!data.hasActivity && data.attention.length === 0) {
    db.prepare('UPDATE users SET last_digest_date = ? WHERE id = ?').run(date, userId);
    return { sent: false, reason: 'nothing to report' };
  }

  try {
    await emailService.sendEmail({
      fromName: 'GrowLeadz',
      to: user.email,
      subject: `Your LinkedIn summary — ${data.connectionsSent} invites, ${data.accepted} accepted, ${data.replies} replies`,
      html: renderDigest(user, data, date),
    });
    db.prepare('UPDATE users SET last_digest_date = ? WHERE id = ?').run(date, userId);
    console.log(`[Digest] Sent to ${user.email} (${data.connectionsSent}/${data.accepted}/${data.replies})`);
    return { sent: true };
  } catch (err) {
    console.error(`[Digest] Failed for ${user.email}:`, err.message);
    return { sent: false, reason: err.message };
  }
}

/** Ticks every 15 minutes and sends to whoever has just reached 20:00 locally. */
function initDigestScheduler() {
  console.log(`[Digest] Scheduler registered — sends at ${DIGEST_HOUR}:00 in each user's own timezone`);

  cron.schedule('*/15 * * * *', async () => {
    const db = getDb();
    const now = new Date();
    try {
      const users = db.prepare(
        'SELECT id, email, name, timezone, email_digest_enabled, last_digest_date FROM users WHERE email_digest_enabled = 1'
      ).all();

      for (const user of users) {
        const decision = shouldSendDigest(user, now);
        if (!decision.send) continue;
        try {
          await sendDailyDigest(user.id, now);
        } catch (err) {
          console.error(`[Digest] Error for user ${user.id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[Digest] Scheduler error:', err.message);
    }
  });
}

module.exports = {
  initDigestScheduler,
  sendDailyDigest,
  shouldSendDigest,
  collectDigestData,
  localParts,
  localDayStartUtc,
  DIGEST_HOUR,
};
