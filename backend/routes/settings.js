const express = require('express');
const router = express.Router();
const { getSetting, setSetting } = require('../config/database');
const axios = require('axios');

const KEYS = [
  'UNIPILE_API_KEY', 'UNIPILE_DSN', 'UNIPILE_WEBHOOK_SECRET', 'NVIDIA_API_KEY',
  'ALERT_SLACK_WEBHOOK', 'ALERT_EMAIL_RECIPIENT',
  'RESEND_API_KEY', 'RESEND_FROM_EMAIL',
  'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS',
  'LEAD_SCORING_WEIGHTS'
];

router.get('/', (req, res) => {
  try {
    const data = {};
    for (const key of KEYS) {
      const val = getSetting(key);
      // Mask API keys, secrets, passwords and webhook URLs
      if ((key.includes('API_KEY') || key.includes('SECRET') || key.includes('PASS') || key.includes('WEBHOOK')) && val) {
        data[key] = val.length > 6 ? '•'.repeat(val.length - 6) + val.slice(-6) : '••••••';
      } else {
        data[key] = val;
      }
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/', (req, res) => {
  try {
    const updated = [];
    for (const key of KEYS) {
      if (req.body[key] !== undefined && req.body[key] !== null) {
        const val = String(req.body[key]).trim();
        if (val && !val.startsWith('•')) {
          setSetting(key, val);
          updated.push(key);
        }
      }
    }
    res.json({ success: true, updated, message: `${updated.length} setting(s) saved` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/test-unipile', async (req, res) => {
  try {
    const apiKey = getSetting('UNIPILE_API_KEY');
    const dsn = getSetting('UNIPILE_DSN');

    if (!apiKey || !dsn) {
      return res.json({ success: false, error: 'Unipile API Key and DSN are required' });
    }

    const response = await axios.get(`${dsn}/api/v1/accounts`, {
      headers: { 'X-API-KEY': apiKey },
      timeout: 8000,
    });

    const items = response.data?.items || response.data?.accounts || response.data || [];
    const linkedinCount = Array.isArray(items)
      ? items.filter((a) => a.type === 'LINKEDIN' || a.provider === 'LINKEDIN').length
      : 0;

    res.json({ success: true, message: `Connected! Found ${linkedinCount} LinkedIn account(s) in Unipile.` });
  } catch (err) {
    const detail = err?.response?.data?.message || err?.response?.data || err.message;
    res.json({ success: false, error: `Connection failed: ${typeof detail === 'object' ? JSON.stringify(detail) : detail}` });
  }
});

router.post('/test-nvidia', async (req, res) => {
  try {
    const apiKey = getSetting('NVIDIA_API_KEY');
    if (!apiKey) return res.json({ success: false, error: 'Nvidia API Key is required' });

    const response = await axios.post(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        model: 'meta/llama-3.1-70b-instruct',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Reply with OK' }],
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    res.json({ success: true, message: 'Nvidia API connected successfully!' });
  } catch (err) {
    const detail = err?.response?.data?.error?.message || err?.response?.data?.message || err.message;
    res.json({ success: false, error: `Connection failed: ${detail}` });
  }
});
router.post('/test-smtp', async (req, res) => {
  try {
    const { verifySmtpConnection } = require('../services/emailService');
    const smtpUser = getSetting('SMTP_USER') || process.env.SMTP_USER;
    const smtpPass = getSetting('SMTP_PASS') || process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      return res.json({ success: false, error: 'SMTP_USER and SMTP_PASS are not configured. Set them in Settings or .env file.' });
    }

    const ok = await verifySmtpConnection();
    if (ok) {
      res.json({ success: true, message: `SMTP connected successfully! Emails will be sent from ${smtpUser}` });
    } else {
      res.json({ success: false, error: `SMTP connection failed. Check credentials for ${smtpUser}. Ensure Gmail 2-Step Verification is ON and you are using an App Password.` });
    }
  } catch (err) {
    res.json({ success: false, error: `SMTP test failed: ${err.message}` });
  }
});

module.exports = router;
