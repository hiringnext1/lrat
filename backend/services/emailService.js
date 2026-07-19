const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const { getSetting } = require('../config/database');

// ─── Email Provider Selection ────────────────────────────────────────────────
// Railway blocks outbound SMTP ports (465, 587). We use Resend HTTP API 
// (port 443) as primary provider for production. SMTP is kept as fallback 
// for local development.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gets the active Resend client instance, or null if not configured.
 */
function getResendClient() {
  const apiKey = getSetting('RESEND_API_KEY') || process.env.RESEND_API_KEY;
  if (apiKey && apiKey.startsWith('re_')) {
    return new Resend(apiKey);
  }
  return null;
}

/**
 * Gets the "from" address for Resend emails.
 * Resend requires a verified domain or 'onboarding@resend.dev' for testing.
 */
function getResendFromAddress() {
  return getSetting('RESEND_FROM_EMAIL') || process.env.RESEND_FROM_EMAIL || 'LRAT <onboarding@resend.dev>';
}

/**
 * Sends an email via Resend HTTP API.
 * @returns {Object} { success: boolean, provider: 'resend', error?: string }
 */
async function sendViaResend({ from, to, subject, html }) {
  const resend = getResendClient();
  if (!resend) return { success: false, provider: 'resend', error: 'Not configured' };

  try {
    const { data, error } = await resend.emails.send({ from, to, subject, html });
    if (error) {
      console.error(`[Email/Resend] API error:`, error);
      return { success: false, provider: 'resend', error: error.message || JSON.stringify(error) };
    }
    console.log(`[Email/Resend] ✅ Email sent to ${to} (id: ${data?.id})`);
    return { success: true, provider: 'resend', id: data?.id };
  } catch (err) {
    console.error(`[Email/Resend] Failed:`, err.message);
    return { success: false, provider: 'resend', error: err.message };
  }
}

/**
 * Creates a nodemailer transporter using global SMTP settings.
 * Used as fallback when Resend is not configured (e.g., local development).
 */
function createTransporter() {
  const smtpHost = getSetting('SMTP_HOST') || process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(getSetting('SMTP_PORT') || process.env.SMTP_PORT || '587');
  const smtpUser = getSetting('SMTP_USER') || process.env.SMTP_USER;
  const smtpPass = getSetting('SMTP_PASS') || process.env.SMTP_PASS;

  if (smtpUser && smtpPass) {
    console.log(`[Email/SMTP] Creating transporter: host=${smtpHost}, port=${smtpPort}, user=${smtpUser}`);

    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
      family: 4,                       // Force IPv4
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  // Fallback jsonTransport for mock/logs testing
  console.log('[Email/SMTP] ⚠️  SMTP is NOT configured. Falling back to log preview transport.');
  return nodemailer.createTransport({ jsonTransport: true });
}

/**
 * Sends an email via SMTP (nodemailer).
 * @returns {Object} { success: boolean, provider: 'smtp', error?: string, isJsonTransport?: boolean }
 */
async function sendViaSMTP({ from, to, subject, html }) {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({ from, to, subject, html });

    if (info.message) {
      // JSON Transport fallback (local dev without SMTP configured)
      return { success: true, provider: 'smtp-mock', isJsonTransport: true };
    }
    console.log(`[Email/SMTP] ✅ Email sent to ${to}`);
    return { success: true, provider: 'smtp' };
  } catch (err) {
    console.error(`[Email/SMTP] Failed to send to ${to}:`, err.message);
    return { success: false, provider: 'smtp', error: err.message };
  }
}

async function sendEmail({ from, fromName, to, subject, html }) {
  const resendFrom = fromName ? `${fromName} <${getResendFromAddress().replace(/.*<(.+)>/, '$1')}>` : getResendFromAddress();
  
  // Resolve SMTP From address (ensure we don't use Brevo login username like b2811d001@smtp-brevo.com as From header)
  const smtpUser = getSetting('SMTP_USER') || process.env.SMTP_USER || 'noreply@lrat.local';
  let defaultSender = smtpUser;
  if (smtpUser.includes('smtp-brevo.com') || smtpUser.includes('brevo.com')) {
    defaultSender = getSetting('SENDER_EMAIL') || process.env.SENDER_EMAIL || 'hiringnext1@gmail.com';
  }
  const smtpFrom = from || `"${fromName || 'LRAT'}" <${defaultSender}>`;

  // 1. Try Resend (HTTP API — works on Railway/cloud hosts)
  const resend = getResendClient();
  if (resend) {
    const result = await sendViaResend({ from: resendFrom, to, subject, html });
    if (result.success) return result;
    console.warn(`[Email] Resend failed, falling back to SMTP: ${result.error}`);
  }

  // 2. Fallback to SMTP (works locally, may fail on Railway)
  return sendViaSMTP({ from: smtpFrom, to, subject, html });
}


// ─── Verify email connectivity at startup ────────────────────────────────────

/**
 * Verifies email sending capability on startup. Call once during server boot.
 */
async function verifySmtpConnection() {
  // Check Resend first
  const resendKey = getSetting('RESEND_API_KEY') || process.env.RESEND_API_KEY;
  if (resendKey && resendKey.startsWith('re_')) {
    console.log('[Email Service] ✅ Resend API key configured — emails will be sent via Resend HTTP API.');
    return true;
  }

  // Check SMTP
  const smtpUser = getSetting('SMTP_USER') || process.env.SMTP_USER;
  const smtpPass = getSetting('SMTP_PASS') || process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.warn('[Email Service] ⚠️  No email provider configured (RESEND_API_KEY or SMTP_USER/SMTP_PASS).');
    console.warn('[Email Service]    Verification emails will NOT be delivered!');
    return false;
  }

  // Check for placeholder values
  const placeholders = ['YOUR_GMAIL_ADDRESS', 'PASTE_', 'your_', 'paste_'];
  if (placeholders.some(p => smtpUser.includes(p) || smtpPass.includes(p))) {
    console.error('[Email Service] ❌ SMTP credentials contain PLACEHOLDER values! Email will NOT work.');
    return false;
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('[Email Service] ✅ SMTP connection verified — emails will be delivered via SMTP.');
    return true;
  } catch (err) {
    console.error(`[Email Service] ❌ SMTP connection FAILED: ${err.message}`);
    console.error(`[Email Service]    Consider using Resend API (set RESEND_API_KEY) — SMTP ports may be blocked on this host.`);
    return false;
  }
}


// ─── Specific email functions ────────────────────────────────────────────────

/**
 * Sends a verification code to a user during signup.
 */
async function sendVerificationEmail(email, name, code) {
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

  const result = await sendEmail({
    fromName: 'LRAT Security',
    to: email,
    subject: `🔑 Verify your LRAT account — ${code}`,
    html: htmlContent
  });

  if (result.isJsonTransport) {
    console.log(`\n======================================================`);
    console.log(`[Email Mock Logger] Verification email sent to ${email}`);
    console.log(`CODE: ${code}`);
    console.log(`======================================================\n`);
  }

  return result.success;
}

/**
 * Sends a password reset pin to a user.
 */
async function sendPasswordResetEmail(email, name, code) {
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

  const result = await sendEmail({
    fromName: 'LRAT Security',
    to: email,
    subject: `🔒 Reset your LRAT password — ${code}`,
    html: htmlContent
  });

  if (result.isJsonTransport) {
    console.log(`\n======================================================`);
    console.log(`[Email Mock Logger] Password Reset email sent to ${email}`);
    console.log(`CODE: ${code}`);
    console.log(`======================================================\n`);
  }

  return result.success;
}

/**
 * Billing: Welcome email after successful subscription.
 */
async function sendSubscriptionWelcomeEmail(email, name, planType) {
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

  await sendEmail({
    fromName: 'LRAT',
    to: email,
    subject: `🎉 Welcome to LRAT ${planLabel} Plan!`,
    html: htmlContent
  });
}

/**
 * Billing: Payment failed dunning email.
 */
async function sendPaymentFailedEmail(email, name) {
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

  await sendEmail({
    fromName: 'LRAT Billing',
    to: email,
    subject: `⚠️ Action required: LRAT payment failed`,
    html: htmlContent
  });
}

/**
 * Billing: Subscription canceled email.
 */
async function sendSubscriptionCanceledEmail(email, name) {
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

  await sendEmail({
    fromName: 'LRAT Billing',
    to: email,
    subject: `Your LRAT subscription has been canceled`,
    html: htmlContent
  });
}

module.exports = {
  createTransporter,
  sendEmail,
  verifySmtpConnection,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendSubscriptionWelcomeEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
};
