/**
 * Input Validation Schemas (R4)
 * 
 * Zod schemas for all auth endpoints with a reusable validate() middleware.
 * Rejects invalid payloads with 400 status and detailed error messages.
 */
const { z } = require('zod');

// ─── Auth Schemas ────────────────────────────────────────────────────────────

const signupSchema = z.object({
  email: z.string().email('Invalid email format').max(255, 'Email too long').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password too long'),
  name: z.string().max(100, 'Name too long').trim().optional().nullable(),
  company_name: z.string().max(200, 'Company name too long').trim().optional().nullable(),
  company_website: z.string().url('Invalid URL format').max(500).optional().nullable().or(z.literal('')),
  designation: z.string().max(100, 'Designation too long').trim().optional().nullable(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format').max(255).trim().toLowerCase(),
  password: z.string().min(1, 'Password is required').max(128, 'Password too long'),
});

const verifySignupSchema = z.object({
  email: z.string().email('Invalid email format').max(255).trim().toLowerCase(),
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d{6}$/, 'Code must be numeric'),
});

const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email format').max(255).trim().toLowerCase(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format').max(255).trim().toLowerCase(),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email format').max(255).trim().toLowerCase(),
  code: z.string().length(6, 'Recovery code must be 6 digits').regex(/^\d{6}$/, 'Code must be numeric'),
  new_password: z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password too long'),
});

const profileUpdateSchema = z.object({
  name: z.string().max(100).trim().optional().nullable(),
  company_name: z.string().max(200).trim().optional().nullable(),
  company_website: z.string().max(500).trim().optional().nullable(),
  designation: z.string().max(100).trim().optional().nullable(),
  webhook_url: z.string().url().max(1000).optional().nullable().or(z.literal('')),
  webhook_enabled: z.boolean().optional(),
  webhook_trigger_type: z.enum(['positive_reply', 'all_replies', 'connection_accepted']).optional(),
  slack_webhook_url: z.string().url().max(1000).optional().nullable().or(z.literal('')),
  slack_alerts_enabled: z.boolean().optional(),
  email_digest_enabled: z.boolean().optional(),
  timezone: z.string().max(50).optional(),
  business_type: z.string().max(100).optional().nullable(),
  business_context: z.string().max(2000).optional().nullable(),
  ai_persona: z.string().max(2000).optional().nullable(),
});

const onboardingCompleteSchema = z.object({
  name: z.string().max(100).trim().optional().nullable(),
  company_name: z.string().max(200).trim().optional().nullable(),
  company_website: z.string().max(500).trim().optional().nullable(),
  designation: z.string().max(100).trim().optional().nullable(),
  daily_limit: z.number().int().min(1).max(25).optional(),
  business_type: z.string().max(100).optional().nullable(),
  business_context: z.string().max(2000).optional().nullable(),
});

// ─── Middleware Factory ──────────────────────────────────────────────────────

/**
 * Express middleware that validates req.body against a Zod schema.
 * On failure, returns 400 with detailed error messages.
 * On success, replaces req.body with the parsed (sanitized) data.
 *
 * Usage: router.post('/signup', validate(signupSchema), handler);
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({
        success: false,
        error: errors[0]?.message || 'Validation failed',
        details: errors,
      });
    }
    // Replace body with parsed + sanitized data
    req.body = result.data;
    next();
  };
}

module.exports = {
  signupSchema,
  loginSchema,
  verifySignupSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  profileUpdateSchema,
  onboardingCompleteSchema,
  validate,
};
