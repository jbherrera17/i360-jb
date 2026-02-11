/**
 * Logger Service
 * Phase 14: Observability & Monitoring
 *
 * Drop-in replacement for Winston logger using native console.
 * Provides structured logging with:
 * - Environment-specific log levels
 * - Request correlation IDs
 * - JSON format for production (log aggregation)
 * - Colorized format for development
 */

const path = require('path');
const fs = require('fs');

// Define log levels (lower number = higher priority)
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// ANSI color codes
const colors = {
  error: '\x1b[31m',   // red
  warn: '\x1b[33m',    // yellow
  info: '\x1b[32m',    // green
  http: '\x1b[35m',    // magenta
  debug: '\x1b[34m',   // blue
  reset: '\x1b[0m',
};

// Determine log level based on environment
const getLogLevel = () => {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'test') return 'error';
  if (env === 'production') return process.env.LOG_LEVEL || 'info';
  return 'debug';
};

const currentLevel = getLogLevel();
const currentLevelNum = levels[currentLevel] !== undefined ? levels[currentLevel] : 4;
const isProduction = process.env.NODE_ENV === 'production';

// File logging for production
let errorStream = null;
let combinedStream = null;

if (isProduction) {
  const logDir = process.env.LOG_DIR || 'logs';
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    errorStream = fs.createWriteStream(path.join(logDir, 'error.log'), { flags: 'a' });
    combinedStream = fs.createWriteStream(path.join(logDir, 'combined.log'), { flags: 'a' });
  } catch (e) {
    console.error('Failed to initialize log files:', e.message);
  }
}

function formatDev(level, message, meta) {
  const now = new Date();
  const timestamp = now.toTimeString().substring(0, 8);
  const color = colors[level] || '';
  const cid = meta.correlationId ? `[${meta.correlationId.substring(0, 8)}]` : '';
  const rest = { ...meta };
  delete rest.correlationId;
  const metaStr = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
  return `${timestamp} ${color}${level}${colors.reset} ${cid} ${message}${metaStr}`;
}

function formatProd(level, message, meta) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  });
}

function log(level, message, meta = {}) {
  if (levels[level] === undefined || levels[level] > currentLevelNum) return;

  // Add global correlation ID if available
  if (global.correlationId && !meta.correlationId) {
    meta.correlationId = global.correlationId;
  }

  const formatted = isProduction ? formatProd(level, message, meta) : formatDev(level, message, meta);

  // Console output
  if (level === 'error') {
    console.error(formatted);
  } else if (level === 'warn') {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }

  // File output in production
  if (isProduction) {
    const jsonLine = (typeof formatted === 'string' && formatted.startsWith('{'))
      ? formatted
      : formatProd(level, message, meta);

    if (combinedStream) combinedStream.write(jsonLine + '\n');
    if (level === 'error' && errorStream) errorStream.write(jsonLine + '\n');
  }
}

// Create the logger instance with the same API as Winston
const logger = {
  level: currentLevel,
  levels,

  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  http: (message, meta) => log('http', message, meta),
  debug: (message, meta) => log('debug', message, meta),

  // Context-based child logger
  withContext: (context) => ({
    error: (message, meta = {}) => log('error', message, { ...context, ...meta }),
    warn: (message, meta = {}) => log('warn', message, { ...context, ...meta }),
    info: (message, meta = {}) => log('info', message, { ...context, ...meta }),
    http: (message, meta = {}) => log('http', message, { ...context, ...meta }),
    debug: (message, meta = {}) => log('debug', message, { ...context, ...meta }),
  }),

  // HTTP request logging helper
  logRequest: (req, res, duration) => {
    const meta = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection?.remoteAddress,
      userId: req.userId || 'anonymous',
    };

    if (res.statusCode >= 500) {
      log('error', 'HTTP Request Error', meta);
    } else if (res.statusCode >= 400) {
      log('warn', 'HTTP Request Warning', meta);
    } else {
      log('http', 'HTTP Request', meta);
    }
  },

  // LLM API call logging helper
  logLLMCall: (provider, model, tokens, duration, error = null) => {
    const meta = { provider, model, tokens, duration: `${duration}ms` };
    if (error) {
      log('error', 'LLM API Error', { ...meta, error: error.message });
    } else {
      log('info', 'LLM API Call', meta);
    }
  },

  // Database query logging helper
  logQuery: (table, operation, duration, error = null) => {
    const meta = { table, operation, duration: `${duration}ms` };
    if (error) {
      log('error', 'Database Error', { ...meta, error: error.message });
    } else {
      log('debug', 'Database Query', meta);
    }
  },
};

module.exports = logger;
