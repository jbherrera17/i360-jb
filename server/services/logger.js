/**
 * Winston Logger Service
 * Phase 14: Observability & Monitoring
 *
 * Provides structured logging with:
 * - Environment-specific log levels
 * - Request correlation IDs
 * - JSON format for production (log aggregation)
 * - Pretty format for development
 */

const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on environment
const getLogLevel = () => {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'test') return 'error'; // Minimal logging in tests
  if (env === 'production') return process.env.LOG_LEVEL || 'info';
  return 'debug'; // Development
};

// Custom format for adding correlation ID
const correlationFormat = winston.format((info) => {
  // Correlation ID is added via asyncLocalStorage in middleware
  if (global.correlationId) {
    info.correlationId = global.correlationId;
  }
  return info;
});

// Development format (colorized, readable)
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  correlationFormat(),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
    const cid = correlationId ? `[${correlationId.substring(0, 8)}]` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level} ${cid} ${message}${metaStr}`;
  })
);

// Production format (JSON for log aggregation)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  correlationFormat(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports based on environment
const getTransports = () => {
  const env = process.env.NODE_ENV || 'development';
  const transports = [];

  // Console transport (always)
  transports.push(
    new winston.transports.Console({
      format: env === 'production' ? prodFormat : devFormat,
    })
  );

  // File transport for production
  if (env === 'production') {
    const logDir = process.env.LOG_DIR || 'logs';

    // Error logs
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: prodFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
      })
    );

    // Combined logs
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        format: prodFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
      })
    );
  }

  return transports;
};

// Create the logger instance
const logger = winston.createLogger({
  level: getLogLevel(),
  levels,
  transports: getTransports(),
  exitOnError: false,
});

// Add convenience methods for logging with context
logger.withContext = (context) => {
  return {
    error: (message, meta = {}) => logger.error(message, { ...context, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { ...context, ...meta }),
    info: (message, meta = {}) => logger.info(message, { ...context, ...meta }),
    http: (message, meta = {}) => logger.http(message, { ...context, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { ...context, ...meta }),
  };
};

// HTTP request logging helper
logger.logRequest = (req, res, duration) => {
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
    logger.error('HTTP Request Error', meta);
  } else if (res.statusCode >= 400) {
    logger.warn('HTTP Request Warning', meta);
  } else {
    logger.http('HTTP Request', meta);
  }
};

// LLM API call logging helper
logger.logLLMCall = (provider, model, tokens, duration, error = null) => {
  const meta = {
    provider,
    model,
    tokens,
    duration: `${duration}ms`,
  };

  if (error) {
    logger.error('LLM API Error', { ...meta, error: error.message });
  } else {
    logger.info('LLM API Call', meta);
  }
};

// Database query logging helper
logger.logQuery = (table, operation, duration, error = null) => {
  const meta = {
    table,
    operation,
    duration: `${duration}ms`,
  };

  if (error) {
    logger.error('Database Error', { ...meta, error: error.message });
  } else {
    logger.debug('Database Query', meta);
  }
};

module.exports = logger;
