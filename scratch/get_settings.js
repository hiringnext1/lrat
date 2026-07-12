const { getDb } = require('../backend/config/database');
const db = getDb();
const settings = db.prepare('SELECT * FROM settings').all();
console.log('Settings:', settings);
