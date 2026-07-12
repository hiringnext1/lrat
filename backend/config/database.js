const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

// ─── S4: Encryption for sensitive settings ───────────────────────────────────
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const SENSITIVE_KEYS = new Set([
  'UNIPILE_API_KEY', 'NVIDIA_API_KEY', 'SMTP_PASS', 'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET', 'UNIPILE_WEBHOOK_SECRET', 'CLAUDE_API_KEY'
]);

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) return null;
  // Derive a 32-byte key from the env variable
  return crypto.createHash('sha256').update(key).digest();
}

function encryptValue(plaintext) {
  const key = getEncryptionKey();
  if (!key) return plaintext; // No encryption key set — store plaintext (backward compat)
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  // Format: enc:v1:<iv>:<authTag>:<ciphertext>
  return `enc:v1:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decryptValue(storedValue) {
  if (!storedValue || !storedValue.startsWith('enc:v1:')) return storedValue;
  const key = getEncryptionKey();
  if (!key) return storedValue; // Can't decrypt without key
  try {
    const parts = storedValue.split(':');
    const iv = Buffer.from(parts[2], 'hex');
    const authTag = Buffer.from(parts[3], 'hex');
    const ciphertext = parts[4];
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error('[Settings] Decryption failed for a setting — returning raw value');
    return storedValue;
  }
}

const DB_PATH = path.join(__dirname, '../db/lrat.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unipile_account_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      photo_url TEXT,
      status TEXT DEFAULT 'active',
      is_active INTEGER DEFAULT 1,
      daily_limit INTEGER DEFAULT 20,
      weekly_limit INTEGER DEFAULT 150,
      warmup_week INTEGER DEFAULT 0,
      warmup_started_at TEXT,
      today_connections INTEGER DEFAULT 0,
      today_messages INTEGER DEFAULT 0,
      week_connections INTEGER DEFAULT 0,
      last_action_at TEXT,
      last_reset_at TEXT,
      next_action_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      headline TEXT,
      company TEXT,
      designation TEXT,
      location TEXT,
      linkedin_url TEXT UNIQUE NOT NULL,
      linkedin_member_id TEXT,
      profile_photo_url TEXT,
      status TEXT DEFAULT 'pending_connection',
      campaign_id INTEGER,
      account_id_used INTEGER,
      connection_sent_at TEXT,
      accepted_at TEXT,
      jd_sent_at TEXT,
      follow_up_1_date TEXT,
      follow_up_1_sent_at TEXT,
      follow_up_2_date TEXT,
      follow_up_2_sent_at TEXT,
      reply_received INTEGER DEFAULT 0,
      reply_received_at TEXT,
      is_read INTEGER DEFAULT 0,
      ai_score INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      connection_note_template TEXT DEFAULT '',
      jd_message_template TEXT DEFAULT '',
      follow_up_1_template TEXT DEFAULT '',
      follow_up_2_template TEXT DEFAULT '',
      daily_limit_per_account INTEGER DEFAULT 20,
      working_hours_start TEXT DEFAULT '09:00',
      working_hours_end TEXT DEFAULT '18:00',
      working_days TEXT DEFAULT '[1,2,3,4,5]',
      follow_up_1_days INTEGER DEFAULT 3,
      follow_up_2_days INTEGER DEFAULT 6,
      total_leads INTEGER DEFAULT 0,
      connections_sent INTEGER DEFAULT 0,
      accepted INTEGER DEFAULT 0,
      jd_sent INTEGER DEFAULT 0,
      replied INTEGER DEFAULT 0,
      flow_json TEXT DEFAULT '{}',
      jd_summary TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaign_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER,
      lead_id INTEGER,
      campaign_id INTEGER,
      action_type TEXT,
      message_preview TEXT,
      status TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS canned_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      company_name TEXT,
      company_website TEXT,
      designation TEXT,
      webhook_url TEXT,
      webhook_enabled INTEGER DEFAULT 0,
      webhook_trigger_type TEXT DEFAULT 'positive_reply',
      slack_webhook_url TEXT,
      slack_alerts_enabled INTEGER DEFAULT 0,
      email_digest_enabled INTEGER DEFAULT 1,
      timezone TEXT DEFAULT 'Asia/Kolkata',
      is_verified INTEGER DEFAULT 0,
      verification_code TEXT,
      verification_expires_at TEXT,
      reset_code TEXT,
      reset_expires_at TEXT,
      business_type TEXT DEFAULT 'general',
      business_context TEXT DEFAULT '',
      ai_persona TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS billing_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      gateway TEXT DEFAULT 'stripe',
      stripe_event_id TEXT,
      payload TEXT,
      processed_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sourcing_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      campaign_id INTEGER NOT NULL,
      search_url TEXT,
      total_imported INTEGER DEFAULT 0,
      status TEXT DEFAULT 'processing',
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS blacklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'profile', 'company', or 'domain'
      value TEXT NOT NULL,
      reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_leads_linkedin_member_id ON leads(linkedin_member_id);
    CREATE INDEX IF NOT EXISTS idx_leads_linkedin_url ON leads(linkedin_url);
    CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_activity_log_account_id ON activity_log(account_id);
    CREATE INDEX IF NOT EXISTS idx_activity_log_lead_id ON activity_log(lead_id);
  `);

  try { db.exec("ALTER TABLE campaigns ADD COLUMN flow_json TEXT DEFAULT '{}'"); } catch (_) {}
  try { db.exec("ALTER TABLE campaigns ADD COLUMN jd_summary TEXT DEFAULT ''"); } catch (_) {}
  try { db.exec("ALTER TABLE leads ADD COLUMN flow_executions TEXT DEFAULT '[]'"); } catch (_) {}
  try { db.exec("ALTER TABLE leads ADD COLUMN is_read INTEGER DEFAULT 0"); } catch (_) {}
  try { db.exec("ALTER TABLE leads ADD COLUMN ai_sentiment TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE accounts ADD COLUMN current_day_limit INTEGER"); } catch (_) {}
  try { db.exec("ALTER TABLE leads ADD COLUMN is_enriched INTEGER DEFAULT 0"); } catch (_) {}
  try { db.exec("ALTER TABLE leads ADD COLUMN profile_json TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE accounts ADD COLUMN health_score INTEGER DEFAULT 100"); } catch (_) {}
  try { db.exec("ALTER TABLE accounts ADD COLUMN consecutive_failures INTEGER DEFAULT 0"); } catch (_) {}
  try { db.exec("ALTER TABLE leads ADD COLUMN next_action_at TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE accounts ADD COLUMN next_action_at TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE accounts ADD COLUMN linkedin_url TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE leads ADD COLUMN profile_viewed_at TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE leads ADD COLUMN fit_score INTEGER DEFAULT 0"); } catch (_) {}
  try { db.exec("ALTER TABLE leads ADD COLUMN enrichment_attempts INTEGER DEFAULT 0"); } catch (_) {}
  try { db.exec("ALTER TABLE leads ADD COLUMN enrichment_failed INTEGER DEFAULT 0"); } catch (_) {}
  try { db.exec("ALTER TABLE leads ADD COLUMN ai_draft_reply TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE leads ADD COLUMN ai_draft_status TEXT DEFAULT 'none'"); } catch (_) {}
  try { db.exec("ALTER TABLE accounts ADD COLUMN user_id INTEGER"); } catch (_) {}
  try { db.exec("ALTER TABLE campaigns ADD COLUMN user_id INTEGER"); } catch (_) {}
  try { db.exec("ALTER TABLE leads ADD COLUMN user_id INTEGER"); } catch (_) {}
  try { db.exec("ALTER TABLE activity_log ADD COLUMN user_id INTEGER"); } catch (_) {}
  try { db.exec("ALTER TABLE canned_messages ADD COLUMN user_id INTEGER"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN company_name TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN company_website TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN designation TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN webhook_url TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN webhook_enabled INTEGER DEFAULT 0"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN webhook_trigger_type TEXT DEFAULT 'positive_reply'"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN slack_webhook_url TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN slack_alerts_enabled INTEGER DEFAULT 0"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN email_digest_enabled INTEGER DEFAULT 1"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN verification_code TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN verification_expires_at TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN reset_code TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN reset_expires_at TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'Asia/Kolkata'"); } catch (_) {}

  // ── Billing / Subscription columns ──────────────────────────────────────────
  try { db.exec("ALTER TABLE users ADD COLUMN plan_type TEXT DEFAULT 'trial'"); } catch (_) {}
  // 'trial' | 'starter' | 'professional' | 'enterprise' | 'free'
  try { db.exec("ALTER TABLE users ADD COLUMN plan_status TEXT DEFAULT 'trialing'"); } catch (_) {}
  // 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'
  try { db.exec("ALTER TABLE users ADD COLUMN plan_accounts_limit INTEGER DEFAULT 1"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN trial_ends_at TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN stripe_customer_id TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN stripe_price_id TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN current_period_end TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN cancel_at_period_end INTEGER DEFAULT 0"); } catch (_) {}
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Onboarding / Roles columns ───────────────────────────────────────────────
  try { db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN onboarding_completed INTEGER DEFAULT 0"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN onboarding_step TEXT DEFAULT 'welcome'"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN last_login TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN business_type TEXT DEFAULT 'general'"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN business_context TEXT DEFAULT ''"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN ai_persona TEXT DEFAULT ''"); } catch (_) {}

  // ── Campaign Date Scheduling Columns ─────────────────────────────────────────
  try { db.exec("ALTER TABLE campaigns ADD COLUMN starts_at TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE campaigns ADD COLUMN ends_at TEXT"); } catch (_) {}

  // ── A/B Testing Variant Columns ──────────────────────────────────────────────
  try { db.exec("ALTER TABLE campaigns ADD COLUMN connection_note_b_template TEXT DEFAULT ''"); } catch (_) {}
  try { db.exec("ALTER TABLE campaigns ADD COLUMN jd_message_b_template TEXT DEFAULT ''"); } catch (_) {}
  try { db.exec("ALTER TABLE campaigns ADD COLUMN follow_up_1_b_template TEXT DEFAULT ''"); } catch (_) {}
  try { db.exec("ALTER TABLE campaigns ADD COLUMN follow_up_2_b_template TEXT DEFAULT ''"); } catch (_) {}
  try { db.exec("ALTER TABLE leads ADD COLUMN message_variant TEXT DEFAULT 'A'"); } catch (_) {}

  // Set default admin role
  try {
    db.prepare("UPDATE users SET role = 'admin' WHERE email = 'admin@lrat.com'").run();
  } catch (_) {}
  // ─────────────────────────────────────────────────────────────────────────────

  try { db.exec("CREATE INDEX IF NOT EXISTS idx_billing_events_user_id ON billing_events(user_id)"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id)"); } catch (_) {}

  // Create indexes on user_id columns after they are guaranteed to exist
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id)"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id)"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)"); } catch (_) {}

  // ─── E1: Additional performance indexes ────────────────────────────────────
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_activity_log_campaign_id ON activity_log(campaign_id)"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at)"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_leads_account_id_used ON leads(account_id_used)"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_leads_reply_received ON leads(reply_received)"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_campaign_accounts_compound ON campaign_accounts(campaign_id, account_id)"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_leads_status_campaign ON leads(status, campaign_id)"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_leads_member_account ON leads(linkedin_member_id, account_id_used)"); } catch (_) {}
  // ─────────────────────────────────────────────────────────────────────────────

  const existing = db.prepare("SELECT COUNT(*) as c FROM canned_messages").get();
  if (existing.c === 0) {
    const insert = db.prepare("INSERT INTO canned_messages (title, content) VALUES (?, ?)");
    insert.run('Thanks for Connecting', 'Hi {{name}}, thanks for connecting! I\'d love to learn more about your work at {{company}}.');
    insert.run('Share Our Offering', 'Hi {{name}}, I wanted to share something that might be valuable for {{company}}. Would you be open to a quick chat?');
    insert.run('Schedule a call', 'Hi {{name}}, would you be available for a quick 15-minute call this week to explore mutual synergy?');
  }

  const scoringWeights = db.prepare("SELECT COUNT(*) as c FROM settings WHERE key = 'LEAD_SCORING_WEIGHTS'").get();
  if (scoringWeights.c === 0) {
    const defaultWeights = {
      seniority: { executive: 40, manager: 30, senior: 20, junior: 10 },
      companySize: { large: 30, medium: 20, small: 10 },
      responsiveness: { replied: 30 }
    };
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
      .run('LEAD_SCORING_WEIGHTS', JSON.stringify(defaultWeights));
  }
}

function loadSettingsIntoEnv() {
  try {
    const database = getDb();
    const rows = database.prepare('SELECT key, value FROM settings').all();
    for (const row of rows) {
      if (row.value && row.value.trim()) {
        // S4: Decrypt sensitive values before loading into env
        const val = SENSITIVE_KEYS.has(row.key) ? decryptValue(row.value.trim()) : row.value.trim();
        process.env[row.key] = val;
      }
    }
  } catch (e) {
    console.error('[Settings] Failed to load settings from DB:', e.message);
  }
}

function getSetting(key) {
  try {
    const database = getDb();
    const row = database.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (row?.value) {
      // S4: Decrypt if this is a sensitive key
      return SENSITIVE_KEYS.has(key) ? decryptValue(row.value) : row.value;
    }
    return process.env[key] || '';
  } catch {
    return process.env[key] || '';
  }
}

function setSetting(key, value) {
  const database = getDb();
  const now = new Date().toISOString();
  // S4: Encrypt sensitive keys before storing
  const storedValue = SENSITIVE_KEYS.has(key) ? encryptValue(value) : value;
  database.prepare(
    'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
  ).run(key, storedValue, now);
  process.env[key] = value; // Keep plaintext in env for runtime use
}

module.exports = { getDb, loadSettingsIntoEnv, getSetting, setSetting };
