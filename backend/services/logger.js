/**
 * LRAT Structured Logger (R1)
 * 
 * Centralized Pino-based logging with:
 * - JSON output in production, pretty print in development
 * - Log levels: fatal, error, warn, info, debug, trace
 * - Automatic timestamps
 * - Child loggers with context (module, requestId)
 */
const pino = require('pino');

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  // In dev, use pino-pretty for readable output
  transport: !isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          messageFormat: '{module} | {msg}',
        },
      }
    : undefined,
});

/**
 * Creates a child logger with module context
 * Usage: const log = createLogger('automation');
 *        log.info('Connection sent');
 *        log.error({ err, leadId: 123 }, 'Failed to send connection');
 */
function createLogger(moduleName) {
  return logger.child({ module: `[${moduleName}]` });
}

module.exports = { logger, createLogger };
