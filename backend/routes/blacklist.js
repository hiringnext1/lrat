const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { requireActiveSubscription } = require('../middleware/planGuard');

// GET all blacklist entries for the current user
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const entries = db.prepare('SELECT * FROM blacklist WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
    res.json({ success: true, data: entries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST add a blacklist entry
router.post('/', requireActiveSubscription, (req, res) => {
  try {
    const db = getDb();
    const { type, value, reason } = req.body;

    if (!type || !value) {
      return res.status(400).json({ success: false, error: 'Type and value are required' });
    }

    const allowedTypes = ['profile', 'company', 'domain'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid blacklist type' });
    }

    const cleanValue = value.trim();

    // Check if duplicate entry already exists for this user
    const existing = db.prepare('SELECT id FROM blacklist WHERE user_id = ? AND type = ? AND value = ?').get(req.userId, type, cleanValue);
    if (existing) {
      return res.status(400).json({ success: false, error: 'This entry is already blacklisted' });
    }

    db.prepare('INSERT INTO blacklist (user_id, type, value, reason) VALUES (?, ?, ?, ?)')
      .run(req.userId, type, cleanValue, reason || '');

    const entries = db.prepare('SELECT * FROM blacklist WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
    res.json({ success: true, message: 'Added to blacklist successfully', data: entries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE a blacklist entry
router.delete('/:id', requireActiveSubscription, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const entry = db.prepare('SELECT * FROM blacklist WHERE id = ? AND user_id = ?').get(id, req.userId);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Blacklist entry not found' });
    }

    db.prepare('DELETE FROM blacklist WHERE id = ? AND user_id = ?').run(id, req.userId);

    const entries = db.prepare('SELECT * FROM blacklist WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
    res.json({ success: true, message: 'Removed from blacklist successfully', data: entries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST bulk import from CSV/JSON payload
router.post('/import', requireActiveSubscription, (req, res) => {
  try {
    const db = getDb();
    const { entries } = req.body; // Expect an array of objects: [{ value, type, reason }]

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid entries payload' });
    }

    const allowedTypes = ['profile', 'company', 'domain'];
    const insertStmt = db.prepare('INSERT OR IGNORE INTO blacklist (user_id, type, value, reason) VALUES (?, ?, ?, ?)');
    const checkDuplicate = db.prepare('SELECT id FROM blacklist WHERE user_id = ? AND type = ? AND value = ?');

    let importedCount = 0;
    const transaction = db.transaction(() => {
      for (const entry of entries) {
        const type = entry.type || 'profile';
        const value = (entry.value || '').trim();
        const reason = entry.reason || 'Bulk imported';

        if (!value || !allowedTypes.includes(type)) continue;

        const existing = checkDuplicate.get(req.userId, type, value);
        if (!existing) {
          insertStmt.run(req.userId, type, value, reason);
          importedCount++;
        }
      }
    });

    transaction();

    const currentEntries = db.prepare('SELECT * FROM blacklist WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
    res.json({ 
      success: true, 
      message: `Successfully imported ${importedCount} entries to blacklist`, 
      importedCount,
      data: currentEntries
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
