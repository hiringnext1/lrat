const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');
const authenticateJWT = require('../middleware/authMiddleware');
const emailService = require('../services/emailService');
const { createLogger } = require('../services/logger');
const {
  signupSchema, loginSchema, verifySignupSchema,
  resendVerificationSchema, forgotPasswordSchema, resetPasswordSchema,
  profileUpdateSchema, onboardingCompleteSchema, validate,
} = require('../middleware/validation');

const log = createLogger('Auth');

// S1: No hardcoded fallback — validated at startup in server.js
const JWT_SECRET = process.env.JWT_SECRET;

// Register User
router.post('/signup', validate(signupSchema), async (req, res) => {
  try {
    const db = getDb();
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existing = db.prepare('SELECT id, is_verified FROM users WHERE email = ?').get(email);
    if (existing) {
      if (existing.is_verified === 1) {
        return res.status(400).json({ success: false, error: 'Email is already registered' });
      }
      
      // If user exists but is NOT verified, we overwrite details and send a fresh verification code
      const passwordHash = await bcrypt.hash(password, 10);
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      db.prepare(
        'UPDATE users SET password_hash = ?, name = ?, company_name = ?, company_website = ?, designation = ?, verification_code = ?, verification_expires_at = ?, is_verified = 0 WHERE id = ?'
      ).run(
        passwordHash,
        name || null,
        req.body.company_name || null,
        req.body.company_website || null,
        req.body.designation || null,
        verificationCode,
        verificationExpiresAt,
        existing.id
      );

      // Send Verification Email
      await emailService.sendVerificationEmail(email, name, verificationCode);

      return res.status(200).json({
        success: true,
        message: 'Verification code resent. Please verify your email.',
        email
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate Verification Code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Insert user (unverified)
    db.prepare(
      'INSERT INTO users (email, password_hash, name, company_name, company_website, designation, is_verified, verification_code, verification_expires_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)'
    ).run(
      email,
      passwordHash,
      name || null,
      req.body.company_name || null,
      req.body.company_website || null,
      req.body.designation || null,
      verificationCode,
      verificationExpiresAt
    );

    // Send Verification Email (Asynchronously in background to prevent request hanging)
    emailService.sendVerificationEmail(email, name, verificationCode)
      .then(sent => {
        if (!sent) {
          console.warn(`[Auth] Verification email failed to send to ${email} (Non-blocking fallback)`);
        }
      })
      .catch(err => {
        console.error(`[Auth] Async email error for ${email}:`, err.message);
      });

    res.status(201).json({
      success: true,
      message: 'Registration initiated. Verification code sent.',
      email
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// Verify Email Signup
router.post('/verify-signup', validate(verifySignupSchema), async (req, res) => {
  try {
    const db = getDb();
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and verification code are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.is_verified === 1) {
      return res.status(400).json({ success: false, error: 'Email is already verified' });
    }

    if (user.verification_code !== code) {
      return res.status(400).json({ success: false, error: 'Invalid verification code' });
    }

    const expiresAt = new Date(user.verification_expires_at);
    if (expiresAt < new Date()) {
      return res.status(400).json({ success: false, error: 'Verification code has expired' });
    }

    // Check if this is the first verified user in the system to run migrations
    const verifiedCount = db.prepare('SELECT COUNT(*) as c FROM users WHERE is_verified = 1').get().c;
    let migrated = false;

    // We do the update now
    db.prepare('UPDATE users SET is_verified = 1, verification_code = NULL, verification_expires_at = NULL WHERE id = ?')
      .run(user.id);

    // Activate 14-day trial for this user
    try {
      const billing = require('../services/billing');
      billing.activateTrial(user.id);
    } catch (_) {}

    if (verifiedCount === 0) {
      // First verified user - migrate all existing orphan database records to this user
      db.prepare('UPDATE accounts SET user_id = ? WHERE user_id IS NULL').run(user.id);
      db.prepare('UPDATE campaigns SET user_id = ? WHERE user_id IS NULL').run(user.id);
      db.prepare('UPDATE leads SET user_id = ? WHERE user_id IS NULL').run(user.id);
      db.prepare('UPDATE activity_log SET user_id = ? WHERE user_id IS NULL').run(user.id);
      db.prepare('UPDATE canned_messages SET user_id = ? WHERE user_id IS NULL').run(user.id);
      migrated = true;
      console.log(`[Auth] First verified user registered. Migrated existing records to user ID ${user.id}`);
    }

    // Seed default canned messages for this user if none exist
    const cannedCount = db.prepare('SELECT COUNT(*) as c FROM canned_messages WHERE user_id = ?').get(user.id).c;
    if (cannedCount === 0) {
      const insert = db.prepare("INSERT INTO canned_messages (title, content, user_id) VALUES (?, ?, ?)");
      insert.run('Thanks for Connecting', 'Hi {{name}}, thanks for connecting! I\'d love to learn more about your work at {{company}}.', user.id);
      insert.run('Share Our Offering', 'Hi {{name}}, I wanted to share something that might be valuable for {{company}}. Would you be open to a quick chat?', user.id);
      insert.run('Schedule a call', 'Hi {{name}}, would you be available for a quick 15-minute call this week to explore mutual synergy?', user.id);
    }

    // Update last login
    db.prepare("UPDATE users SET last_login = ? WHERE id = ?").run(new Date().toISOString(), user.id);

    // Generate JWT Token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      success: true,
      message: 'Email verification successful',
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role || 'user', 
        onboarding_completed: user.onboarding_completed || 0,
        onboarding_step: user.onboarding_step || 'welcome',
        migrated 
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Resend Verification Code
router.post('/resend-verification', validate(resendVerificationSchema), async (req, res) => {
  try {
    const db = getDb();
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.is_verified === 1) {
      return res.status(400).json({ success: false, error: 'Email is already verified' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    db.prepare('UPDATE users SET verification_code = ?, verification_expires_at = ? WHERE id = ?')
      .run(verificationCode, verificationExpiresAt, user.id);

    // Send Verification Email (Asynchronously in background)
    emailService.sendVerificationEmail(user.email, user.name, verificationCode)
      .catch(err => console.error(`[Auth] Async resend-email error:`, err.message));

    res.json({
      success: true,
      message: 'Verification code resent successfully.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Forgot Password - Send Code
router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res) => {
  try {
    const db = getDb();
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.json({ success: true, message: 'If the email is registered, a password recovery code has been sent.' });
    }

    // Generate Reset Code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    db.prepare('UPDATE users SET reset_code = ?, reset_expires_at = ? WHERE id = ?')
      .run(resetCode, resetExpiresAt, user.id);

    // Send Reset Email (Asynchronously in background)
    emailService.sendPasswordResetEmail(user.email, user.name, resetCode)
      .catch(err => console.error(`[Auth] Async reset-email error:`, err.message));

    res.json({
      success: true,
      message: 'If the email is registered, a password recovery code has been sent.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// Reset Password - Apply new password using code
router.post('/reset-password', validate(resetPasswordSchema), async (req, res) => {
  try {
    const db = getDb();
    const { email, code, new_password } = req.body;

    if (!email || !code || !new_password) {
      return res.status(400).json({ success: false, error: 'Email, code, and new password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid email or code' });
    }

    if (!user.reset_code || user.reset_code !== code) {
      return res.status(400).json({ success: false, error: 'Invalid or incorrect recovery code' });
    }

    const expiresAt = new Date(user.reset_expires_at);
    if (expiresAt < new Date()) {
      return res.status(400).json({ success: false, error: 'Recovery code has expired' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(new_password, 10);

    // Update user
    db.prepare('UPDATE users SET password_hash = ?, reset_code = NULL, reset_expires_at = NULL WHERE id = ?')
      .run(passwordHash, user.id);

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Login User
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const db = getDb();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid email or password' });
    }

    if (user.is_verified === 0) {
      return res.status(403).json({
        success: false,
        error: 'Email is not verified. Please verify your email first.',
        requiresVerification: true,
        email: user.email
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ success: false, error: 'Invalid email or password' });
    }

    // Update last login
    db.prepare("UPDATE users SET last_login = ? WHERE id = ?").run(new Date().toISOString(), user.id);

    // Generate JWT Token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        role: user.role || 'user',
        onboarding_completed: user.onboarding_completed || 0,
        onboarding_step: user.onboarding_step || 'welcome'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// Get profile details
router.get('/me', authenticateJWT, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, email, name, company_name, company_website, designation, webhook_url, webhook_enabled, webhook_trigger_type, slack_webhook_url, slack_alerts_enabled, email_digest_enabled, created_at, role, onboarding_completed, onboarding_step, last_login, business_type, business_context, ai_persona FROM users WHERE id = ?').get(req.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update profile details
router.put('/profile', authenticateJWT, validate(profileUpdateSchema), (req, res) => {
  try {
    const db = getDb();
    const { 
      name, 
      company_name, 
      company_website, 
      designation,
      webhook_url,
      webhook_enabled,
      webhook_trigger_type,
      slack_webhook_url,
      slack_alerts_enabled,
      email_digest_enabled,
      timezone,
      business_type,
      business_context,
      ai_persona
    } = req.body;

    db.prepare(`
      UPDATE users 
      SET name = ?, company_name = ?, company_website = ?, designation = ?,
          webhook_url = ?, webhook_enabled = ?, webhook_trigger_type = ?,
          slack_webhook_url = ?, slack_alerts_enabled = ?, email_digest_enabled = ?,
          timezone = ?, business_type = ?, business_context = ?, ai_persona = ?
      WHERE id = ?
    `).run(
      name || null,
      company_name || null,
      company_website || null,
      designation || null,
      webhook_url || null,
      webhook_enabled !== undefined ? (webhook_enabled ? 1 : 0) : 0,
      webhook_trigger_type || 'positive_reply',
      slack_webhook_url || null,
      slack_alerts_enabled !== undefined ? (slack_alerts_enabled ? 1 : 0) : 0,
      email_digest_enabled !== undefined ? (email_digest_enabled ? 1 : 0) : 1,
      timezone || 'Asia/Kolkata',
      business_type || 'general',
      business_context || '',
      ai_persona || '',
      req.userId
    );

    const user = db.prepare('SELECT id, email, name, company_name, company_website, designation, webhook_url, webhook_enabled, webhook_trigger_type, slack_webhook_url, slack_alerts_enabled, email_digest_enabled, timezone, created_at, role, onboarding_completed, onboarding_step, business_type, business_context, ai_persona FROM users WHERE id = ?').get(req.userId);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update onboarding step progress
router.put('/onboarding/step', authenticateJWT, (req, res) => {
  try {
    const db = getDb();
    const { step } = req.body;
    db.prepare('UPDATE users SET onboarding_step = ? WHERE id = ?').run(step || 'welcome', req.userId);
    res.json({ success: true, message: 'Onboarding step updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Complete onboarding flow
router.post('/onboarding/complete', authenticateJWT, validate(onboardingCompleteSchema), (req, res) => {
  try {
    const db = getDb();
    const { name, company_name, company_website, designation, daily_limit, business_type, business_context } = req.body;
    
    db.prepare(`
      UPDATE users 
      SET name = ?, company_name = ?, company_website = ?, designation = ?, business_type = ?, business_context = ?, onboarding_completed = 1, onboarding_step = 'done'
      WHERE id = ?
    `).run(
      name || null,
      company_name || null,
      company_website || null,
      designation || null,
      business_type || 'general',
      business_context || '',
      req.userId
    );

    // Also update any of this user's linked accounts with their preferred daily_limit
    if (daily_limit) {
      db.prepare('UPDATE accounts SET daily_limit = ? WHERE user_id = ?').run(daily_limit, req.userId);
    }

    const updatedUser = db.prepare('SELECT id, email, name, role, onboarding_completed, onboarding_step, business_type, business_context, ai_persona FROM users WHERE id = ?').get(req.userId);

    res.json({
      success: true,
      message: 'Onboarding completed successfully',
      user: updatedUser
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
