/**
 * SQLite snapshot backups.
 *
 * The whole product lives in one SQLite file on a Railway volume, with no copy
 * anywhere. This takes consistent snapshots using SQLite's online backup API
 * (safe while the app is writing — unlike copying the file), keeps a rotating
 * set next to the database, and exposes them to an admin for download.
 *
 * Protects against: bad migrations, accidental deletes, app bugs that corrupt
 * rows, human error. It does NOT protect against losing the volume itself —
 * for that, download a copy off-site (see routes/admin.js) or add object
 * storage once a bucket exists.
 */
const fs = require('fs');
const path = require('path');
const { getDb } = require('../config/database');
const { createLogger } = require('./logger');

const log = createLogger('Backup');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../db/lrat.db');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(path.dirname(DB_PATH), 'backups');
const KEEP = parseInt(process.env.BACKUP_KEEP || '7', 10);

function ensureDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/** Newest first. */
function listBackups() {
  try {
    ensureDir();
    return fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('lrat-') && f.endsWith('.db'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return { file: f, path: path.join(BACKUP_DIR, f), size_bytes: stat.size, created_at: stat.mtime.toISOString() };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  } catch (err) {
    log.error({ err: err.message }, 'Could not list backups');
    return [];
  }
}

function rotate() {
  const backups = listBackups();
  for (const old of backups.slice(KEEP)) {
    try {
      fs.unlinkSync(old.path);
      log.info({ file: old.file }, 'Removed old backup');
    } catch (err) {
      log.warn({ file: old.file, err: err.message }, 'Could not remove old backup');
    }
  }
}

/**
 * Takes a snapshot and rotates older ones.
 * @returns {Promise<{file: string, size_bytes: number}|null>}
 */
async function createSnapshot(reason = 'scheduled') {
  ensureDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = `lrat-${stamp}.db`;
  const dest = path.join(BACKUP_DIR, file);

  try {
    const db = getDb();
    // SQLite's online backup — consistent even while the app is writing
    await db.backup(dest);

    const { size } = fs.statSync(dest);
    if (size === 0) {
      fs.unlinkSync(dest);
      throw new Error('snapshot was empty');
    }

    // A snapshot that cannot be opened is worse than no snapshot: verify it
    const Database = require('better-sqlite3');
    const check = new Database(dest, { readonly: true });
    const users = check.prepare('SELECT COUNT(*) AS c FROM users').get().c;
    const leads = check.prepare('SELECT COUNT(*) AS c FROM leads').get().c;
    check.close();

    log.info({ file, sizeKB: Math.round(size / 1024), users, leads, reason }, 'Backup created');
    rotate();
    return { file, size_bytes: size, users, leads };
  } catch (err) {
    log.error({ err: err.message, reason }, 'BACKUP FAILED');
    try { if (fs.existsSync(dest)) fs.unlinkSync(dest); } catch (_) {}
    return null;
  }
}

/** Daily snapshot at 03:30 IST, plus one shortly after boot. */
function startBackupSchedule() {
  const cron = require('node-cron');

  cron.schedule('30 3 * * *', () => { createSnapshot('daily'); }, { timezone: 'Asia/Kolkata' });

  // A deploy is the most likely moment to break data, so capture the state
  // just before the new build starts working on it.
  setTimeout(() => {
    const latest = listBackups()[0];
    const ageMs = latest ? Date.now() - new Date(latest.created_at).getTime() : Infinity;
    if (ageMs > 6 * 60 * 60 * 1000) createSnapshot('startup');
    else log.info({ latest: latest.file }, 'Recent backup exists, skipping startup snapshot');
  }, 60 * 1000);

  log.info({ dir: BACKUP_DIR, keep: KEEP }, 'Backup schedule registered (daily 03:30 IST)');
}

module.exports = { createSnapshot, listBackups, startBackupSchedule, BACKUP_DIR };
