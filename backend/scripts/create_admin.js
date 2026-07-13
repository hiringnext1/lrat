/**
 * Admin User Creation Script
 * Run on Railway: railway run node backend/scripts/create_admin.js
 */
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = process.env.NODE_ENV === 'production'
  ? '/app/backend/db/lrat.db'
  : path.join(__dirname, '../db/lrat.db');

const ADMIN_EMAIL = 'admin@lrat.com';
const ADMIN_NAME  = 'Vishal Patel';
const ADMIN_PASS  = 'Admin@Lrat2024';

try {
  const db = new Database(DB_PATH);
  const hash = bcrypt.hashSync(ADMIN_PASS, 10);

  // Upsert admin user (insert if not exists, update password + verified if exists)
  db.prepare(`
    INSERT INTO users (email, password_hash, name, role, is_verified, trial_ends_at)
    VALUES (?, ?, ?, 'admin', 1, datetime('now', '+30 days'))
    ON CONFLICT(email) DO UPDATE SET
      password_hash = excluded.password_hash,
      role = 'admin',
      is_verified = 1
  `).run(ADMIN_EMAIL, hash, ADMIN_NAME);

  const user = db.prepare('SELECT id, email, role, is_verified FROM users WHERE email = ?').get(ADMIN_EMAIL);
  console.log('\n✅ Admin user ready:');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Role:', user.role);
  console.log('   Verified:', user.is_verified === 1 ? 'YES' : 'NO');
  console.log('\n🔑 Login Credentials:');
  console.log('   Email:', ADMIN_EMAIL);
  console.log('   Password:', ADMIN_PASS);
  console.log('\n🌐 Login URL: https://lrat-production.up.railway.app/login\n');

  db.close();
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
