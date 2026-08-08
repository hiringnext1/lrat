const nodemailer = require('nodemailer');
const axios = require('axios');
const { getSetting } = require('../config/database');

// ─── Email Provider Selection ────────────────────────────────────────────────
// Railway blocks outbound SMTP ports (465, 587). We use Brevo (Sendinblue) 
// HTTP API (port 443) as primary provider for production. SMTP is kept as fallback 
// for local development.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gets the active Brevo API key if configured.
 * We prioritize the SMTP_PASS if it is a Brevo API key (starts with xsmtpsib-).
 */
function getBrevoApiKey() {
  // Brevo has two different credentials:
  //   xkeysib-…   → HTTP API key  (api.brevo.com/v3, port 443)
  //   xsmtpsib-…  → SMTP key      (smtp-relay.brevo.com, only valid for SMTP auth)
  // Sending an xsmtpsib- key to the HTTP API returns "Key not found", which is
  // exactly the error production was failing with, so only xkeysib- counts here.
  const dedicated = getSetting('BREVO_API_KEY') || process.env.BREVO_API_KEY;
  if (dedicated && dedicated.startsWith('xkeysib-')) return dedicated;

  const smtpPass = getSetting('SMTP_PASS') || process.env.SMTP_PASS;
  if (smtpPass && smtpPass.startsWith('xkeysib-')) return smtpPass;

  return null;
}

/**
 * Gets the verified sender email address.
 */
function getSenderEmail() {
  return getSetting('SENDER_EMAIL') || process.env.SENDER_EMAIL || 'hiringnext1@gmail.com';
}

/**
 * Sends an email via Brevo HTTP API (Port 443 — bypasses Railway port blocking).
 */
async function sendViaBrevoAPI({ fromName, to, subject, html }) {
  const apiKey = getBrevoApiKey();
  const senderEmail = getSenderEmail();
  
  if (!apiKey) {
    return { success: false, provider: 'brevo-api', error: 'Brevo API key not found' };
  }

  try {
    const payload = {
      sender: { name: fromName || 'GrowLeadz', email: senderEmail },
      to: [{ email: to }],
      subject: subject,
      htmlContent: html
    };

    const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10s timeout
    });

    if (response.data && (response.data.messageId || response.data.messageIds)) {
      console.log(`[Email/BrevoAPI] ✅ Email sent to ${to} (MessageId: ${response.data.messageId})`);
      return { success: true, provider: 'brevo-api', id: response.data.messageId };
    }
    return { success: false, provider: 'brevo-api', error: 'Unexpected API response' };
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.response?.data || err.message;
    console.error(`[Email/BrevoAPI] ❌ Failed to send to ${to}:`, errorMsg);
    return { success: false, provider: 'brevo-api', error: typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg };
  }
}

/**
 * Creates a nodemailer transporter using global SMTP settings.
 * Used as fallback when Brevo HTTP API is not configured.
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
      family: 4,
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
 * Sends an email via SMTP.
 */
async function sendViaSMTP({ from, to, subject, html }) {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({ from, to, subject, html });

    if (info.message) {
      return { success: true, provider: 'smtp-mock', isJsonTransport: true };
    }
    console.log(`[Email/SMTP] ✅ Email sent to ${to}`);
    return { success: true, provider: 'smtp' };
  } catch (err) {
    console.error(`[Email/SMTP] Failed to send to ${to}:`, err.message);
    return { success: false, provider: 'smtp', error: err.message };
  }
}

/**
 * Universal send function: tries Brevo HTTP API first, falls back to SMTP.
 */
async function sendEmail({ from, fromName, to, subject, html }) {
  const brevoKey = getBrevoApiKey();
  const senderEmail = getSenderEmail();

  // 1. Try Brevo HTTP API (Works flawlessly on Railway port blockages)
  if (brevoKey) {
    const result = await sendViaBrevoAPI({ fromName, to, subject, html });
    if (result.success) return result;
    console.warn(`[Email] Brevo API failed, falling back to SMTP: ${result.error}`);
  }

  // 2. SMTP fallback (For local setup)
  const smtpUser = getSetting('SMTP_USER') || process.env.SMTP_USER || 'noreply@lrat.local';
  let defaultSender = smtpUser;
  if (smtpUser.includes('smtp-brevo.com') || smtpUser.includes('brevo.com')) {
    defaultSender = senderEmail;
  }
  const smtpFrom = from || `"${fromName || 'GrowLeadz'}" <${defaultSender}>`;

  return sendViaSMTP({ from: smtpFrom, to, subject, html });
}

/**
 * Verifies email sending capability on startup.
 */
async function verifySmtpConnection() {
  const brevoKey = getBrevoApiKey();
  if (brevoKey) {
    // Don't just check the prefix — an expired, deleted or IP-blocked key looks
    // identical until the first send fails. Production silently dropped every
    // verification email for days because this only logged "key detected".
    try {
      const res = await axios.get('https://api.brevo.com/v3/account', {
        headers: { 'api-key': brevoKey, accept: 'application/json' },
        timeout: 10000,
      });
      console.log(`[Email Service] ✅ Brevo API key valid (account: ${res.data?.email || 'unknown'}). Sending via HTTP API.`);
      return true;
    } catch (err) {
      const detail = err?.response?.data?.message || err.message;
      console.error(`[Email Service] ❌ Brevo API key REJECTED: ${detail}`);
      console.error('[Email Service] ❌ Verification / password-reset emails will NOT be delivered until this is fixed.');
      if (String(detail).toLowerCase().includes('unrecognised ip')) {
        console.error('[Email Service] → Brevo has IP authorisation enabled. Add this server\'s IP in Brevo → Security → Authorised IPs, or disable the restriction.');
      }
      return false;
    }
  }

  // SMTP Check
  const smtpUser = getSetting('SMTP_USER') || process.env.SMTP_USER;
  const smtpPass = getSetting('SMTP_PASS') || process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.warn('[Email Service] ⚠️ No email provider configured. Verification emails will NOT be delivered!');
    return false;
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('[Email Service] ✅ SMTP connection verified successfully.');
    return true;
  } catch (err) {
    console.error(`[Email Service] ❌ SMTP connection FAILED: ${err.message}`);
    return false;
  }
}

/**
 * Sends a verification code to a user during signup.
 */
async function sendVerificationEmail(email, name, code) {
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 18px; border-radius: 12px; font-weight: bold; font-size: 18px;">GrowLeadz</div>
      </div>
      <h2 style="font-size: 20px; font-weight: 800; text-align: center; margin-top: 0; color: #0f172a;">Verify Your Email Address</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">Hi ${name || 'there'},</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">Thank you for registering on GrowLeadz! To complete your registration and activate your account, please enter the 6-digit verification code below on the signup page:</p>
      <div style="text-align: center; margin: 25px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 900; background-color: #f1f5f9; padding: 10px 24px; border-radius: 12px; letter-spacing: 0.1em; color: #2563eb;">${code}</span>
      </div>
      <p style="font-size: 12px; color: #64748b; line-height: 1.5;">This verification code is valid for 15 minutes. If you did not request this code, please ignore this email.</p>
      <div style="border-top: 1px solid #f1f5f9; margin-top: 30px; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8;">
        &copy; 2026 GrowLeadz Outreach Automation Platform.
      </div>
    </div>
  `;

  const result = await sendEmail({
    fromName: 'GrowLeadz Security',
    to: email,
    subject: `🔑 Verify your GrowLeadz account — ${code}`,
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
        <div style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 18px; border-radius: 12px; font-weight: bold; font-size: 18px;">GrowLeadz</div>
      </div>
      <h2 style="font-size: 20px; font-weight: 800; text-align: center; margin-top: 0; color: #0f172a;">Reset Your Password</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">Hi ${name || 'there'},</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">We received a request to reset the password for your GrowLeadz account. Please enter this 6-digit recovery code to complete the process:</p>
      <div style="text-align: center; margin: 25px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 900; background-color: #f1f5f9; padding: 10px 24px; border-radius: 12px; letter-spacing: 0.1em; color: #ef4444;">${code}</span>
      </div>
      <p style="font-size: 12px; color: #64748b; line-height: 1.5;">This recovery code is valid for 15 minutes. If you did not make this request, you can safely ignore this email; your password will remain unchanged.</p>
      <div style="border-top: 1px solid #f1f5f9; margin-top: 30px; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8;">
        &copy; 2026 GrowLeadz Outreach Automation Platform.
      </div>
    </div>
  `;

  const result = await sendEmail({
    fromName: 'GrowLeadz Security',
    to: email,
    subject: `🔒 Reset your GrowLeadz password — ${code}`,
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
        <div style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 18px; border-radius: 12px; font-weight: bold; font-size: 18px;">GrowLeadz</div>
      </div>
      <h2 style="font-size: 20px; font-weight: 800; text-align: center; margin-top: 0; color: #0f172a;">Welcome to the ${planLabel} Plan! 🎉</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">Hi ${name || 'there'},</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">Your GrowLeadz <strong>${planLabel}</strong> subscription is now active. Your LinkedIn outreach automation is ready to run at full power.</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" style="background-color: #2563eb; color: white; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; text-decoration: none;">Open Dashboard →</a>
      </div>
      <div style="border-top: 1px solid #f1f5f9; margin-top: 30px; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8;">© 2026 GrowLeadz Outreach Automation Platform.</div>
    </div>
  `;

  await sendEmail({
    fromName: 'GrowLeadz',
    to: email,
    subject: `🎉 Welcome to GrowLeadz ${planLabel} Plan!`,
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
        <div style="display: inline-block; background-color: #ef4444; color: white; padding: 10px 18px; border-radius: 12px; font-weight: bold; font-size: 18px;">GrowLeadz</div>
      </div>
      <h2 style="font-size: 20px; font-weight: 800; text-align: center; margin-top: 0; color: #0f172a;">Payment Failed ⚠️</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">Hi ${name || 'there'},</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">We were unable to process your GrowLeadz subscription payment. Your campaigns will continue running for now, but please update your payment method to avoid interruption.</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/billing" style="background-color: #ef4444; color: white; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; text-decoration: none;">Update Payment Method →</a>
      </div>
      <div style="border-top: 1px solid #f1f5f9; margin-top: 30px; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8;">© 2026 GrowLeadz Outreach Automation Platform.</div>
    </div>
  `;

  await sendEmail({
    fromName: 'GrowLeadz Billing',
    to: email,
    subject: `⚠️ Action required: GrowLeadz payment failed`,
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
        <div style="display: inline-block; background-color: #64748b; color: white; padding: 10px 18px; border-radius: 12px; font-weight: bold; font-size: 18px;">GrowLeadz</div>
      </div>
      <h2 style="font-size: 20px; font-weight: 800; text-align: center; margin-top: 0; color: #0f172a;">Subscription Canceled</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">Hi ${name || 'there'},</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">Your GrowLeadz subscription has been canceled. <strong>Your data is safe and preserved for 30 days.</strong> If you change your mind, you can reactivate anytime.</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/billing" style="background-color: #2563eb; color: white; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; text-decoration: none;">Reactivate Subscription →</a>
      </div>
      <div style="border-top: 1px solid #f1f5f9; margin-top: 30px; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8;">© 2026 GrowLeadz Outreach Automation Platform.</div>
    </div>
  `;

  await sendEmail({
    fromName: 'GrowLeadz Billing',
    to: email,
    subject: `Your GrowLeadz subscription has been canceled`,
    html: htmlContent
  });
}

/**
 * Admin Alert: Sends email to admin whenever a new user registers.
 */
async function sendAdminNewSignupAlert(user) {
  const adminEmail = process.env.ADMIN_EMAIL || getSetting('ADMIN_EMAIL') || 'freelance.vishal22@gmail.com';
  const registrationTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; border: 1px solid #3b82f6; padding: 25px; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; padding: 16px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 800;">👤 New User Registered!</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">GrowLeadz Real-time Admin Alert</p>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 120px;">Full Name:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${user.name || 'Not Provided'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Email Address:</td>
            <td style="padding: 6px 0; color: #2563eb; font-weight: 700;">${user.email}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Company:</td>
            <td style="padding: 6px 0; color: #0f172a;">${user.company_name || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Designation:</td>
            <td style="padding: 6px 0; color: #0f172a;">${user.designation || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Registration Time:</td>
            <td style="padding: 6px 0; color: #0f172a;">${registrationTime} (IST)</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin-top: 20px;">
        <a href="${process.env.FRONTEND_URL || 'https://growleadz.co'}/admin" style="background-color: #0f172a; color: white; padding: 12px 24px; border-radius: 10px; font-weight: bold; font-size: 13px; text-decoration: none;">View Admin Dashboard →</a>
      </div>

      <div style="margin-top: 25px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px;">
        Automated admin notification sent by GrowLeadz Platform.
      </div>
    </div>
  `;

  try {
    await sendEmail({
      fromName: 'GrowLeadz Admin Alerts',
      to: adminEmail,
      subject: `👤 New User Registration — ${user.name || user.email}`,
      html: htmlContent
    });
    console.log(`[Admin Alert] New signup email notification sent to ${adminEmail}`);
  } catch (err) {
    console.error(`[Admin Alert] Failed to send signup email:`, err.message);
  }
}

/**
 * Admin Alert: Sends email to admin whenever a user buys/upgrades a subscription.
 */
async function sendAdminNewSubscriptionAlert(user, planType, amount) {
  const adminEmail = process.env.ADMIN_EMAIL || getSetting('ADMIN_EMAIL') || 'freelance.vishal22@gmail.com';
  const paymentTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });

  const planLabels = { starter: 'Starter Playbook ($5 Offer)', professional: 'Professional Engine', enterprise: 'Enterprise Cluster' };
  const planLabel = planLabels[planType] || planType;

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; border: 1px solid #10b981; padding: 25px; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 16px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 22px; font-weight: 800;">🎉 NEW SUBSCRIPTION SALE! 💰</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">GrowLeadz Revenue Notification</p>
      </div>

      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #047857; font-weight: 600; width: 130px;">Plan Purchased:</td>
            <td style="padding: 6px 0; color: #065f46; font-weight: 800; font-size: 16px;">${planLabel}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #047857; font-weight: 600;">Amount Paid:</td>
            <td style="padding: 6px 0; color: #047857; font-weight: 800; font-size: 16px;">$${amount || '5.00'} USD</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #047857; font-weight: 600;">Customer Name:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${user.name || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #047857; font-weight: 600;">Customer Email:</td>
            <td style="padding: 6px 0; color: #2563eb; font-weight: 700;">${user.email}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #047857; font-weight: 600;">Payment Time:</td>
            <td style="padding: 6px 0; color: #0f172a;">${paymentTime} (IST)</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin-top: 20px;">
        <a href="${process.env.FRONTEND_URL || 'https://growleadz.co'}/admin" style="background-color: #059669; color: white; padding: 12px 24px; border-radius: 10px; font-weight: bold; font-size: 13px; text-decoration: none;">View Revenue Dashboard →</a>
      </div>

      <div style="margin-top: 25px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px;">
        Automated revenue alert sent by GrowLeadz Billing Engine.
      </div>
    </div>
  `;

  try {
    await sendEmail({
      fromName: 'GrowLeadz Revenue Alerts',
      to: adminEmail,
      subject: `💰 NEW SALE: GrowLeadz ${planLabel} — ${user.name || user.email}`,
      html: htmlContent
    });
    console.log(`[Admin Alert] New subscription email notification sent to ${adminEmail}`);
  } catch (err) {
    console.error(`[Admin Alert] Failed to send subscription email:`, err.message);
  }
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
  sendAdminNewSignupAlert,
  sendAdminNewSubscriptionAlert,
};
