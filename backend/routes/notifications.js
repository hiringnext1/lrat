const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const feed = require('../services/notificationFeed');

// Everything the bell shows, plus the unread count since it was last opened
router.get('/', (req, res) => {
  try {
    res.json({ success: true, ...feed.getNotifications(getDb(), req.userId) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Opening the bell marks everything currently listed as seen
router.post('/seen', (req, res) => {
  try {
    res.json({ success: true, seen_at: feed.markSeen(getDb(), req.userId) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
