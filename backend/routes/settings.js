const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');

/**
 * Per-user settings.
 *
 * This route used to read and write the PLATFORM's credentials (Unipile,
 * NVIDIA, SMTP…) from the shared `settings` table while being mounted behind
 * authenticateJWT only. Any signed-up customer could therefore repoint the
 * platform's Unipile DSN — breaking every other tenant — or point SMTP at a
 * server they controlled and collect other users' password-reset codes.
 *
 * Those keys now live in routes/admin.js (admin-only). What is left here is
 * genuinely the signed-in user's own configuration.
 */

const DEFAULT_SCORING_WEIGHTS = {
  seniority: { executive: 40, manager: 30, senior: 20, junior: 10 },
  companySize: { large: 30, medium: 20, small: 10 },
  responsiveness: { replied: 30 },
};

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT lead_scoring_weights FROM users WHERE id = ?').get(req.userId);

    let weights = null;
    if (row?.lead_scoring_weights) {
      try { weights = JSON.parse(row.lead_scoring_weights); } catch (_) {}
    }

    res.json({
      success: true,
      data: {
        // Kept as a JSON string for backwards compatibility with the existing UI
        LEAD_SCORING_WEIGHTS: JSON.stringify(weights || DEFAULT_SCORING_WEIGHTS),
        is_default: !weights,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/', (req, res) => {
  try {
    const db = getDb();
    const { LEAD_SCORING_WEIGHTS } = req.body;

    if (LEAD_SCORING_WEIGHTS === undefined) {
      return res.status(400).json({ success: false, error: 'Nothing to update' });
    }

    // Validate before storing: bad weights would silently score every lead 0
    let parsed;
    try {
      parsed = typeof LEAD_SCORING_WEIGHTS === 'string' ? JSON.parse(LEAD_SCORING_WEIGHTS) : LEAD_SCORING_WEIGHTS;
    } catch (_) {
      return res.status(400).json({ success: false, error: 'Scoring weights must be valid JSON' });
    }
    for (const group of ['seniority', 'companySize', 'responsiveness']) {
      if (!parsed?.[group] || typeof parsed[group] !== 'object') {
        return res.status(400).json({ success: false, error: `Scoring weights are missing "${group}"` });
      }
      for (const [key, value] of Object.entries(parsed[group])) {
        if (typeof value !== 'number' || value < 0 || value > 100) {
          return res.status(400).json({ success: false, error: `${group}.${key} must be a number between 0 and 100` });
        }
      }
    }

    db.prepare('UPDATE users SET lead_scoring_weights = ? WHERE id = ?')
      .run(JSON.stringify(parsed), req.userId);

    res.json({ success: true, message: 'Scoring weights saved' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
