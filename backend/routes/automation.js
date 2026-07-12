const express = require('express');
const router = express.Router();
const { runCheckAcceptances, runCheckReplies, isRunning, lastRunTimes } = require('../services/automation');
const { getDb } = require('../config/database');

/**
 * GET /api/automation/engine-status
 * Returns real-time health, last run times, queues, and issues.
 */
router.get('/engine-status', async (req, res) => {
  try {
    const db = getDb();
    
    // Count user-specific queued prospects
    const pendingConnections = db.prepare(
      "SELECT COUNT(*) as count FROM leads WHERE user_id = ? AND status = 'pending_connection' AND account_id_used IS NULL"
    ).get(req.userId).count;

    const pendingEnrichment = db.prepare(
      "SELECT COUNT(*) as count FROM leads WHERE user_id = ? AND status = 'pending_connection' AND is_enriched = 0 AND (enrichment_failed = 0 OR enrichment_failed IS NULL)"
    ).get(req.userId).count;

    // Get sender accounts with warnings or paused
    const accountIssues = db.prepare(
      "SELECT name, status, health_score FROM accounts WHERE user_id = ? AND (status = 'paused' OR status = 'warning' OR health_score < 70)"
    ).all(req.userId);

    res.json({
      success: true,
      data: {
        isRunning,
        lastRunTimes,
        queued: {
          pending_connections: pendingConnections,
          pending_enrichment: pendingEnrichment
        },
        accountIssues
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/automation/sync
 * Manually triggers acceptance check + reply check immediately.
 * Used by the frontend "Sync Now" button.
 */
router.post('/sync', async (req, res) => {
  try {
    console.log(`[Manual Sync] Triggered by user ${req.userId} at ${new Date().toISOString()}`);

    // Run both checks in parallel, non-blocking
    runCheckAcceptances();
    runCheckReplies();

    res.json({
      success: true,
      message: 'Sync triggered. Checking for new acceptances and replies from LinkedIn...'
    });
  } catch (err) {
    console.error('[Manual Sync] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
