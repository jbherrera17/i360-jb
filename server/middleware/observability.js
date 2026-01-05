/**
 * Observability Middleware
 * Phase 14: Observability & Monitoring
 *
 * Provides:
 * - Request correlation IDs
 * - Request/response logging
 * - Metrics collection
 * - Response time tracking
 */

const crypto = require('crypto');
const logger = require('../services/logger');
const metrics = require('../services/metrics');

// Generate UUID v4 using Node's crypto module
const generateUUID = () => crypto.randomUUID();

// Store for tracking active connections
let connectionCount = 0;

/**
 * Correlation ID Middleware
 * Adds a unique ID to each request for tracing
 */
const correlationId = (req, res, next) => {
  // Use existing correlation ID from header or generate new one
  const correlationId = req.headers['x-correlation-id'] || req.headers['x-request-id'] || generateUUID();

  // Attach to request
  req.correlationId = correlationId;

  // Set global for logger access (simple approach)
  global.correlationId = correlationId;

  // Add to response headers
  res.setHeader('X-Correlation-ID', correlationId);

  next();
};

/**
 * Request Logging & Metrics Middleware
 * Logs requests and collects metrics
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Track connection
  connectionCount++;
  metrics.setActiveConnections(connectionCount);

  // Log incoming request (debug level)
  logger.debug('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  // Override res.end to capture response
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    // Restore original end
    res.end = originalEnd;

    // Calculate duration
    const duration = Date.now() - startTime;

    // Record metrics
    metrics.recordHttpRequest(req.method, req.originalUrl, res.statusCode, duration);

    // Log request completion
    logger.logRequest(req, res, duration);

    // Update connection count
    connectionCount--;
    metrics.setActiveConnections(connectionCount);

    // Clear global correlation ID
    global.correlationId = null;

    // Call original end
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Skip logging for certain paths
 */
const shouldSkipLogging = (req) => {
  const skipPaths = ['/health', '/ready', '/metrics', '/favicon.ico'];
  return skipPaths.some((path) => req.path === path || req.path.startsWith(path));
};

/**
 * Combined observability middleware with skip logic
 */
const observabilityMiddleware = (req, res, next) => {
  // Always add correlation ID
  const cid = req.headers['x-correlation-id'] || req.headers['x-request-id'] || generateUUID();
  req.correlationId = cid;
  global.correlationId = cid;
  res.setHeader('X-Correlation-ID', cid);

  // Skip detailed logging for health/metrics endpoints
  if (shouldSkipLogging(req)) {
    return next();
  }

  // Apply request logging
  const startTime = Date.now();
  connectionCount++;
  metrics.setActiveConnections(connectionCount);

  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    res.end = originalEnd;
    const duration = Date.now() - startTime;

    metrics.recordHttpRequest(req.method, req.originalUrl, res.statusCode, duration);
    logger.logRequest(req, res, duration);

    connectionCount--;
    metrics.setActiveConnections(connectionCount);
    global.correlationId = null;

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Error logging middleware
 * Should be added after routes
 */
const errorLogger = (err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    userId: req.userId,
  });

  next(err);
};

module.exports = {
  correlationId,
  requestLogger,
  observabilityMiddleware,
  errorLogger,
};
