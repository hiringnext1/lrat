/**
 * The notification feed behind the header bell.
 *
 * Derived from tables that already hold the truth (leads, accounts, campaigns,
 * sourcing_jobs, users) rather than a separate notifications table that the
 * engine would have to write to from a dozen places and keep in sync.
 *
 * Two rules keep this useful:
 *   1. Only things that need attention or are genuinely new. Routine actions
 *      (~80 connection requests a day) belong in the activity feed, not here —
 *      a noisy bell is one nobody looks at.
 *   2. Everything is scoped to the signed-in user.
 */

const MAX_ITEMS = 25;

function iso(value) {
  if (!value) return null;
  // SQLite CURRENT_TIMESTAMP has no timezone marker; treat it as UTC
  const s = String(value);
  const normalised = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s) ? s.replace(' ', 'T') + 'Z' : s;
  const d = new Date(normalised);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function buildFeed(db, userId) {
  const items = [];
  const push = (item) => { if (item.at) items.push(item); };

  // ── Replies ────────────────────────────────────────────────────────────────
  for (const lead of db.prepare(
    `SELECT id, full_name, ai_sentiment, reply_received_at, is_read
       FROM leads WHERE user_id = ? AND reply_received = 1
       ORDER BY reply_received_at DESC LIMIT 12`
  ).all(userId)) {
    const hot = lead.ai_sentiment === 'positive';
    push({
      id: `reply-${lead.id}`,
      type: 'reply',
      severity: hot ? 'success' : 'info',
      title: hot ? `🔥 ${lead.full_name} replied` : `${lead.full_name} replied`,
      body: hot ? 'Positive reply — worth answering first' : 'New reply in your inbox',
      at: iso(lead.reply_received_at),
      link: '/dashboard/inbox',
    });
  }

  // ── Acceptances ────────────────────────────────────────────────────────────
  for (const lead of db.prepare(
    `SELECT id, full_name, accepted_at FROM leads
      WHERE user_id = ? AND accepted_at IS NOT NULL
      ORDER BY accepted_at DESC LIMIT 8`
  ).all(userId)) {
    push({
      id: `accept-${lead.id}`,
      type: 'acceptance',
      severity: 'info',
      title: `${lead.full_name} accepted your request`,
      body: 'They are now a connection — the sequence continues',
      at: iso(lead.accepted_at),
      link: '/dashboard/leads',
    });
  }

  // ── Sender accounts that need attention ────────────────────────────────────
  for (const acc of db.prepare(
    `SELECT id, name, status, health_score, is_active, updated_at, created_at FROM accounts
      WHERE user_id = ? AND (status IN ('paused','warning','restricted','offline') OR health_score < 70)`
  ).all(userId)) {
    const restricted = ['restricted', 'warning'].includes(acc.status);
    push({
      id: `account-${acc.id}-${acc.status}`,
      type: 'account',
      severity: restricted ? 'error' : 'warning',
      title: `${acc.name}: ${restricted ? 'needs attention' : acc.status}`,
      body: restricted
        ? 'LinkedIn flagged this sender — open Accounts to check'
        : `Sending is paused for this account (health ${acc.health_score ?? '—'})`,
      at: iso(acc.updated_at || acc.created_at) || new Date().toISOString(),
      link: '/dashboard/accounts',
    });
  }

  // ── Campaigns that cannot send ─────────────────────────────────────────────
  for (const c of db.prepare(
    `SELECT c.id, c.name, c.updated_at FROM campaigns c
      WHERE c.user_id = ? AND c.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM campaign_accounts ca JOIN accounts a ON a.id = ca.account_id
           WHERE ca.campaign_id = c.id AND a.is_active = 1 AND a.status = 'active'
        )`
  ).all(userId)) {
    push({
      id: `campaign-stalled-${c.id}`,
      type: 'campaign',
      severity: 'warning',
      title: `"${c.name}" is not sending`,
      body: 'No active sender is linked to this campaign',
      at: iso(c.updated_at) || new Date().toISOString(),
      link: '/dashboard/campaigns',
    });
  }

  // ── Lead imports ───────────────────────────────────────────────────────────
  for (const job of db.prepare(
    `SELECT id, status, total_imported, error_message, updated_at FROM sourcing_jobs
      WHERE user_id = ? AND status IN ('failed','interrupted','completed')
      ORDER BY updated_at DESC LIMIT 5`
  ).all(userId)) {
    const bad = job.status !== 'completed';
    push({
      id: `import-${job.id}-${job.status}`,
      type: 'import',
      severity: bad ? 'warning' : 'success',
      title: bad ? `Lead import ${job.status}` : `Lead import finished — ${job.total_imported} leads`,
      body: bad ? (job.error_message || 'Run the import again to continue').slice(0, 120) : 'Prospects are queued for outreach',
      at: iso(job.updated_at),
      link: '/dashboard/leads',
    });
  }

  // ── Provider availability ──────────────────────────────────────────────────
  // The two-day Unipile outage was invisible in the product; this surfaces it.
  try {
    const { unipileBreaker } = require('./circuitBreaker');
    const breaker = unipileBreaker.getStatus();
    if (breaker.state !== 'CLOSED') {
      push({
        id: `provider-${breaker.state}`,
        type: 'system',
        severity: 'error',
        title: 'LinkedIn provider unavailable',
        body: 'Actions are paused and will resume automatically when the provider responds',
        at: iso(breaker.lastFailureTime) || new Date().toISOString(),
        link: '/dashboard/accounts',
      });
    }
  } catch (_) {}

  // ── Billing ────────────────────────────────────────────────────────────────
  const user = db.prepare('SELECT plan_type, plan_status, trial_ends_at FROM users WHERE id = ?').get(userId);
  if (user?.trial_ends_at) {
    const daysLeft = Math.ceil((new Date(user.trial_ends_at).getTime() - Date.now()) / 86400000);
    if (daysLeft <= 7) {
      push({
        id: `trial-${daysLeft}`,
        type: 'billing',
        severity: daysLeft <= 0 ? 'error' : 'warning',
        title: daysLeft <= 0 ? 'Your trial has ended' : `Trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
        body: daysLeft <= 0 ? 'Choose a plan to keep your campaigns running' : 'Pick a plan to avoid interruption',
        at: new Date().toISOString(),
        link: '/dashboard/billing',
      });
    }
  }

  items.sort((a, b) => b.at.localeCompare(a.at));
  return items.slice(0, MAX_ITEMS);
}

/** Feed plus how many items arrived since the user last opened the bell. */
function getNotifications(db, userId) {
  const items = buildFeed(db, userId);
  const row = db.prepare('SELECT notifications_seen_at FROM users WHERE id = ?').get(userId);
  const seenAt = row?.notifications_seen_at || null;

  const unread = seenAt ? items.filter(i => i.at > seenAt).length : items.length;
  return { items, unread, seen_at: seenAt };
}

function markSeen(db, userId) {
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET notifications_seen_at = ? WHERE id = ?').run(now, userId);
  return now;
}

module.exports = { getNotifications, markSeen, buildFeed };
