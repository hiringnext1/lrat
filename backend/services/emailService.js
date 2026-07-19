const nodemailer = require('nodemailer');
const { getSetting } = require('../config/database');

/**
 * Creates a nodemailer transporter using global SMTP settings.
 * 
 * IMPORTANT: We do NOT use `service: 'gmail'` because nodemailer's service 
 * presets internally force port 465 + SSL, and the `family: 4` (IPv4) option
 * gets ignored. Railway's IPv6 routing is broken (ENETUNREACH), so we MUST 
 * use explicit host/port/tls config where family: 4 is respected.
 */
function createTransporter() {
  const smtpHost = getSetting('SMTP_HOST') || process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(getSetting('SMTP_PORT') || process.env.SMTP_PORT || '587');
  const smtpUser = getSetting('SMTP_USER') || process.env.SMTP_USER;
  const smtpPass = getSetting('SMTP_PASS') || process.env.SMTP_PASS;

  if (smtpUser && smtpPass) {
    console.log(`[Email Service] Creating transporter: host=${smtpHost}, port=${smtpPort}, user=${smtpUser}`);

    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,       // true for 465 (SSL), false for 587 (STARTTLS)
      auth: { user: smtpUser, pass: smtpPass },
      family: 4,                       // Force IPv4 — Railway IPv6 is broken
      tls: {
        rejectUnauthorized: false      // Allow self-signed certs on cloud VMs
      },
      connectionTimeout: 10000,        // 10s connection timeout
      greetingTimeout: 10000,          // 10s SMTP greeting timeout
      socketTimeout: 15000,            // 15s socket timeout
    });
  }

  // Fallback jsonTransport for mock/logs testing
  console.log('[Email Service] ⚠️  SMTP is NOT configured (SMTP_USER/SMTP_PASS missing). Falling back to log preview transport.');
  console.log(`[Email Service] DEBUG: SMTP_USER=${smtpUser || '(empty)'}, SMTP_PASS=${smtpPass ? '***set***' : '(empty)'}`);
  return nodemailer.createTransport({
    jsonTransport: true
  });
}

/**
 * Verifies SMTP connection on startup. Call this once during server boot.
 * Logs clear diagnostics so production misconfigurations are caught early.
 */
async function verifySmtpConnection() {
  const smtpUser = getSetting('SMTP_USER') || process.env.SMTP_USER;
  const smtpPass = getSetting('SMTP_PASS') || process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.warn('[Email Service] ⚠️  SMTP NOT CONFIGURED — verification emails will NOT be delivered!');
    console.warn('[Email Service]    Set SMTP_USER and SMTP_PASS in .env / .env.production or via Settings UI.');
    return false;
  }

  // Check for placeholder values that indicate unconfigured production env
  const placeholders = ['YOUR_GMAIL_ADDRESS', 'PASTE_', 'your_', 'paste_'];
  if (placeholders.some(p => smtpUser.includes(p) || smtpPass.includes(p))) {
    console.error('[Email Service] ❌ SMTP credentials contain PLACEHOLDER values! Email will NOT work.');
    console.error(`[Email Service]    SMTP_USER="${smtpUser}" — update .env.production with real Gmail address.`);
    return false;
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('[Email Service] ✅ SMTP connection verified successfully — emails will be delivered.');
    return true;
  } catch (err) {
    console.error(`[Email Service] ❌ SMTP connection FAILED: ${err.message}`);
    console.error(`[Email Service]    Host: ${getSetting('SMTP_HOST') || process.env.SMTP_HOST || 'smtp.gmail.com'}`);
    console.error(`[Email Service]    User: ${smtpUser}`);
    console.error('[Email Service]    Check: Gmail App Password, 2-Step Verification enabled, firewall/port 587 open.');
    return false;
  }
}



/**
 * Sends a verification code to a user during signup.
 * @param {string} email - Recipient email address
 * @param {string} name - User's name
 * @param {string} code - 6-digit verification pin
 */
async function sendVerificationEmail(email, name, code) {
  const transporter = createTransporter();
  const smtpUser = getSetting('SMTP_USER') || process.env.SMTP_USER || 'noreply@lrat.local';

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 18px; border-radius: 12px; font-weight: bold; font-size: 18px;">LRAT</div>
      </div>
      <h2 style="font-size: 20px; font-weight: 800; text-align: center; margin-top: 0; color: #0f172a;">Verify Your Email Address</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">Hi ${name || 'there'},</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">Thank you for registering on LRAT! To complete your registration and activate your account, please enter the 6-digit verification code below on the signup page:</p>
      <div style="text-align: center; margin: 25px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 900; background-color: #f1f5f9; padding: 10px 24px; border-radius: 12px; letter-spacing: 0.1em; color: #2563eb;">${code}</span>
      </div>
      <p style="font-size: 12px; color: #64748b; line-height: 1.5;">This verification code is valid for 15 minutes. If you did not request this code, please ignore this email.</p>
      <div style="border-top: 1px solid #f1f5f9; margin-top: 30px; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8;">
        &copy; 2026 LRAT Outreach Automation Platform.
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"LRAT Security" <${smtpUser}>`,
      to: email,
      subject: `🔑 Verify your LRAT account — ${code}`,
      html: htmlContent
    });

    if (info.message) {
      // JSON Transport fallback: output to server console log
      console.log(`\n======================================================`);
      console.log(`[Email Mock Logger] Verification email sent to ${email}`);
      console.log(`CODE: ${code}`);
      console.log(`======================================================\n`);
    } else {
      console.log(`[Email Service] Verification email sent successfully to ${email}`);
    }
    return true;
  } catch (err) {
    console.error(`[Email Service] Failed to send verification email to ${email}:`, err.message);
    return false;
  }
}

/**
 * Sends a password reset pin to a user.
 * @param {string} email - Recipient email address
 * @param {string} name - User's name
 * @param {string} code - 6-digit password reset pin
 */
async function sendPasswordResetEmail(email, name, code) {
  const transporter = createTransporter();
  const smtpUser = getSetting('SMTP_USER') || process.env.SMTP_USER || 'noreply@lrat.local';

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 18px; border-radius: 12px; font-weight: bold; font-size: 18px;">LRAT</div>
      </div>
      <h2 style="font-size: 20px; font-weight: 800; text-align: center; margin-top: 0; color: #0f172a;">Reset Your Password</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">Hi ${name || 'there'},</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">We received a request to reset the password for your LRAT account. Please enter this 6-digit recovery code to complete the process:</p>
      <div style="text-align: center; margin: 25px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 900; background-color: #f1f5f9; padding: 10px 24px; border-radius: 12px; letter-spacing: 0.1em; color: #ef4444;">${code}</span>
      </div>
      <p style="font-size: 12px; color: #64748b; line-height: 1.5;">This recovery code is valid for 15 minutes. If you did not make this request, you can safely ignore this email; your password will remain unchanged.</p>
      <div style="border-top: 1px solid #f1f5f9; margin-top: 30px; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8;">
        &copy; 2026 LRAT Outreach Automation Platform.
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"LRAT Security" <${smtpUser}>`,
      to: email,
      subject: `🔒 Reset your LRAT password — ${code}`,
      html: htmlContent
    });

    if (info.message) {
      // JSON Transport fallback
      console.log(`\n======================================================`);
      console.log(`[Email Mock Logger] Password Reset email sent to ${email}`);
      console.log(`CODE: ${code}`);
      console.log(`======================================================\n`);
    } else {
      console.log(`[Email Service] Password reset email sent successfully to ${email}`);
    }
    return true;
  } catch (err) {
    console.error(`[Email Service] Failed to send password reset email to ${email}:`, err.message);
    return false;
  }
}

/**
 * Billing: Welcome email after successful subscription.
 */
async function sendSubscriptionWelcomeEmail(email, name, planType) {
  const transporter = createTransporter();
  const smtpUser = getSetting('SMTP_USER') || process.env.SMTP_USER || 'noreply@lrat.local';
  const planLabels = { starter: 'Starter Playbook', professional: 'Professional Engine', enterprise: 'Enterprise Cluster', trial: 'Trial' };
  const planLabel = planLabels[planType] || planType;

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 18px; border-radius: 12px; font-weight: bold; font-size: 18px;">LRAT</div>
      </div>
      <h2 style="font-size: 20px; font-weight: 800; text-align: center; margin-top: 0; color: #0f172a;">Welcome to the ${planLabel} Plan! 🎉</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">Hi ${name || 'there'},</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">Your LRAT <strong>${planLabel}</strong> subscription is now active. Your LinkedIn outreach automation is ready to run at full power.</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" style="background-color: #2563eb; color: white; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; text-decoration: none;">Open Dashboard →</a>
      </div>
      <div style="border-top: 1px solid #f1f5f9; margin-top: 30px; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8;">© 2026 LRAT Outreach Automation Platform.</div>
    </div>
  `;
  try {
    await transporter.sendMail({ from: `"LRAT" <${smtpUser}>`, to: email, subject: `🎉 Welcome to LRAT ${planLabel} Plan!`, html: htmlContent });
  } catch (err) {
    console.error('[Email] Failed to send welcome email:', err.message);
  }
}

/**
 * Billing: Payment failed dunning email.
 */
async function sendPaymentFailedEmail(email, name) {
  const transporter = createTransporter();
  const smtpUser = getSetting('SMTP_USER') || process.env.SMTP_USER || 'noreply@lrat.local';

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #fecaca; padding: 30px; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="display: inline-block; background-color: #ef4444; color: white; padding: 10px 18px; border-radius: 12px; font-weight: bold; font-size: 18px;">LRAT</div>
      </div>
      <h2 style="font-size: 20px; font-weight: 800; text-align: center; margin-top: 0; color: #0f172a;">Payment Failed ⚠️</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">Hi ${name || 'there'},</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">We were unable to process your LRAT subscription payment. Your campaigns will continue running for now, but please update your payment method to avoid interruption.</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/billing" style="background-color: #ef4444; color: white; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; text-decoration: none;">Update Payment Method →</a>
      </div>
      <div style="border-top: 1px solid #f1f5f9; margin-top: 30px; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8;">© 2026 LRAT Outreach Automation Platform.</div>
    </div>
  `;
  try {
    await transporter.sendMail({ from: `"LRAT Billing" <${smtpUser}>`, to: email, subject: `⚠️ Action required: LRAT payment failed`, html: htmlContent });
  } catch (err) {
    console.error('[Email] Failed to send payment failed email:', err.message);
  }
}

/**
 * Billing: Subscription canceled email.
 */
async function sendSubscriptionCanceledEmail(email, name) {
  const transporter = createTransporter();
  const smtpUser = getSetting('SMTP_USER') || process.env.SMTP_USER || 'noreply@lrat.local';

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="display: inline-block; background-color: #64748b; color: white; padding: 10px 18px; border-radius: 12px; font-weight: bold; font-size: 18px;">LRAT</div>
      </div>
      <h2 style="font-size: 20px; font-weight: 800; text-align: center; margin-top: 0; color: #0f172a;">Subscription Canceled</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">Hi ${name || 'there'},</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">Your LRAT subscription has been canceled. <strong>Your data is safe and preserved for 30 days.</strong> If you change your mind, you can reactivate anytime.</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/billing" style="background-color: #2563eb; color: white; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; text-decoration: none;">Reactivate Subscription →</a>
      </div>
      <div style="border-top: 1px solid #f1f5f9; margin-top: 30px; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8;">© 2026 LRAT Outreach Automation Platform.</div>
    </div>
  `;
  try {
    await transporter.sendMail({ from: `"LRAT Billing" <${smtpUser}>`, to: email, subject: `Your LRAT subscription has been canceled`, html: htmlContent });
  } catch (err) {
    console.error('[Email] Failed to send cancelation email:', err.message);
  }
}

module.exports = {
  createTransporter,
  verifySmtpConnection,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendSubscriptionWelcomeEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
};
