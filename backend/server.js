// Load environment: .env.production in production, .env in development
const path = require('path');
const envFile = process.env.NODE_ENV === 'production' ? '../.env.production' : '../.env';
require('dotenv').config({ path: path.join(__dirname, envFile) });

// Force IPv4 DNS resolution first to prevent ENETUNREACH / Timeout on cloud hosts (Railway IPv6 routing issue)
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}


const express = require('express');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createLogger } = require('./services/logger');
const { unipileBreaker, nvidiaBreaker } = require('./services/circuitBreaker');


const log = createLogger('Server');

// ─── S1: Validate JWT_SECRET at startup ──────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  log.fatal('FATAL: JWT_SECRET is not set or too short (min 32 chars). Set a secure JWT_SECRET in .env');
  log.fatal('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

const { getDb, loadSettingsIntoEnv } = require('./config/database');
const { startAutomation } = require('./services/automation');

const accountsRouter = require('./routes/accounts');
const campaignsRouter = require('./routes/campaigns');
const leadsRouter = require('./routes/leads');
const inboxRouter = require('./routes/inbox');
const analyticsRouter = require('./routes/analytics');
const settingsRouter = require('./routes/settings');
const webhooksRouter = require('./routes/webhooks');
const authRouter = require('./routes/auth');
const automationRouter = require('./routes/automation');
const billingRouter = require('./routes/billing');
const adminRouter = require('./routes/admin');
const blacklistRouter = require('./routes/blacklist');
const authenticateJWT = require('./middleware/authMiddleware');
const isAdmin = require('./middleware/adminMiddleware');

const isProduction = process.env.NODE_ENV === 'production';
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

// ─── S3: Helmet Security Headers ────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false, // Disable CSP in dev for Vite HMR
  crossOriginEmbedderPolicy: false, // Allow embedded resources
}));

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));

// ─── S2: Rate Limiting on Auth Endpoints ─────────────────────────────────────
const rateLimitDefaults = { standardHeaders: true, legacyHeaders: false, validate: { xForwardedForHeader: false } };
const authLoginLimiter = rateLimit({
  ...rateLimitDefaults,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per window
  message: { success: false, error: 'Too many login attempts. Please try again after 15 minutes.' },
});

const authSignupLimiter = rateLimit({
  ...rateLimitDefaults,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // 5 signups per hour per IP
  message: { success: false, error: 'Too many signup attempts. Please try again later.' },
});

const authForgotLimiter = rateLimit({
  ...rateLimitDefaults,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // 5 requests per hour
  message: { success: false, error: 'Too many password reset requests. Please try again later.' },
});

const authVerifyLimiter = rateLimit({
  ...rateLimitDefaults,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,                   // 15 verify attempts
  message: { success: false, error: 'Too many verification attempts. Please try again after 15 minutes.' },
});

const apiGeneralLimiter = rateLimit({
  ...rateLimitDefaults,
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120,                 // 120 requests per minute per IP
  message: { success: false, error: 'Too many requests. Please slow down.' },
});

// ─── Body Parsing ────────────────────────────────────────────────────────────
// S5: Raw body capture must happen BEFORE express.json() for Stripe webhook
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// ─── Apply general rate limit to all API routes ──────────────────────────────
app.use('/api/', apiGeneralLimiter);

// ─── S2: Auth routes with SPECIFIC rate limiters ─────────────────────────────
// Mount rate-limited auth sub-routes BEFORE the general auth router
app.post('/api/auth/login', authLoginLimiter);
app.post('/api/auth/signup', authSignupLimiter);
app.post('/api/auth/forgot-password', authForgotLimiter);
app.post('/api/auth/reset-password', authForgotLimiter);
app.post('/api/auth/verify-signup', authVerifyLimiter);
app.post('/api/auth/resend-verification', authVerifyLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/accounts', authenticateJWT, accountsRouter);
app.use('/api/campaigns', authenticateJWT, campaignsRouter);
app.use('/api/leads', authenticateJWT, leadsRouter);
app.use('/api/inbox', authenticateJWT, inboxRouter);
app.use('/api/analytics', authenticateJWT, analyticsRouter);
app.use('/api/settings', authenticateJWT, settingsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/automation', authenticateJWT, automationRouter);
// S5: Stripe webhook route — uses rawBody from verify() above
app.use('/api/billing', billingRouter);
app.use('/api/blacklist', authenticateJWT, blacklistRouter);
app.use('/api/admin', authenticateJWT, isAdmin, adminRouter);

// ─── Health Check (enhanced) ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  let dbOk = false;
  try {
    const db = getDb();
    db.prepare('SELECT 1').get();
    dbOk = true;
  } catch (_) {}

  const memUsage = process.memoryUsage();

  res.json({
    status: dbOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.1.0',
    uptime: Math.floor(process.uptime()),
    memory: {
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      rssMB: Math.round(memUsage.rss / 1024 / 1024),
    },
    database: dbOk ? 'connected' : 'error',
    circuitBreakers: {
      unipile: unipileBreaker.getStatus(),
      nvidia: nvidiaBreaker.getStatus(),
    },
  });
});

// ─── Static Files ────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// ─── S11/R2: Global Error Handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  const errorId = Date.now().toString(36);
  log.error({ err, errorId, path: req.path, method: req.method }, 'Unhandled Express error');

  if (isProduction) {
    res.status(500).json({ success: false, error: 'An internal error occurred', errorId });
  } else {
    res.status(500).json({ success: false, error: err.message, errorId });
  }
});

// ─── S8: Socket.io Authentication Middleware ─────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    // Allow connection but mark as unauthenticated — they can authenticate later
    socket.userId = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    return next();
  } catch (e) {
    // Allow connection but log the failure
    log.warn({ socketId: socket.id, err: e.message }, 'Socket.io token verification failed');
    socket.userId = null;
    return next();
  }
});

io.on('connection', (socket) => {
  log.debug({ socketId: socket.id, userId: socket.userId }, 'Socket.io client connected');

  // If already authenticated via middleware, join room immediately
  if (socket.userId) {
    socket.join(`user_${socket.userId}`);
  }

  // Allow late authentication via event
  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      socket.join(`user_${decoded.userId}`);
      log.debug({ socketId: socket.id, userId: decoded.userId }, 'Socket.io late authentication successful');
    } catch (e) {
      log.warn({ socketId: socket.id, err: e.message }, 'Socket.io late authentication failed');
    }
  });

  socket.on('disconnect', () => {
    log.debug({ socketId: socket.id }, 'Socket.io client disconnected');
  });
});

// ─── R2: Process-level Error Handlers ────────────────────────────────────────
process.on('uncaughtException', (err) => {
  log.fatal({ err }, 'Uncaught exception — shutting down');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log.fatal({ reason: reason instanceof Error ? reason.message : reason }, 'Unhandled promise rejection');
  // Don't exit immediately — give logger time to flush
  setTimeout(() => process.exit(1), 1000);
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
async function gracefulShutdown(signal) {
  log.info({ signal }, 'Received shutdown signal — closing gracefully');
  
  server.close(() => {
    log.info('HTTP server closed');
    try {
      const db = getDb();
      db.close();
      log.info('Database connection closed');
    } catch (_) {}
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    log.warn('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 15000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  log.info(`\n====================================`);
  log.info(`  LRAT Backend running on port ${PORT}`);
  log.info(`  http://localhost:${PORT}/api/health`);
  log.info(`====================================\n`);

  try {
    getDb();
    log.info('SQLite database initialized');
    loadSettingsIntoEnv();
    log.info('Loaded API keys from database');
  } catch (err) {
    log.fatal({ err }, 'Failed to initialize database');
    process.exit(1);
  }

  // Verify SMTP configuration at startup so misconfiguration is caught early
  const { verifySmtpConnection } = require('./services/emailService');
  verifySmtpConnection().catch(err => log.error({ err }, 'SMTP verification error'));

  startAutomation(io);
  
  try {
    const { initDigestScheduler } = require('./services/cronJobs');
    initDigestScheduler();
  } catch (cronErr) {
    log.error({ err: cronErr }, 'Failed to initialize digest scheduler');
  }
});

module.exports = { app, io };
