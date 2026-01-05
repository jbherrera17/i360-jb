/**
 * Health Check Routes - Insight 360
 * Phase 14: Observability & Monitoring
 *
 * Provides:
 * - /api/health - Basic health check with dependency status (existing)
 * - /api/health/ping - Simple ping (existing)
 * - /api/health/ready - Kubernetes readiness probe (new)
 * - /api/health/live - Kubernetes liveness probe (new)
 * - /api/health/detailed - Detailed health with metrics (new)
 *
 * Version: 2.31.0
 */

const express = require('express');
const router = express.Router();
const metrics = require('../services/metrics');
const logger = require('../services/logger');

// Health check state
const startTime = Date.now();
let isReady = false;
let lastDbCheck = null;
let lastDbStatus = { status: 'unknown' };

/**
 * Check database connectivity with caching
 */
const checkDatabase = async (supabase) => {
  // Cache check for 10 seconds
  if (lastDbCheck && Date.now() - lastDbCheck < 10000) {
    return lastDbStatus;
  }

  if (!supabase) {
    lastDbStatus = { status: 'unavailable', message: 'No database client' };
    lastDbCheck = Date.now();
    return lastDbStatus;
  }

  try {
    const start = Date.now();
    const { error } = await supabase.from('users').select('id').limit(1);
    const latency = Date.now() - start;

    if (error) {
      lastDbStatus = { status: 'unhealthy', message: error.message, latency };
    } else {
      lastDbStatus = { status: 'healthy', latency };
    }
  } catch (err) {
    lastDbStatus = { status: 'unhealthy', message: err.message };
  }

  lastDbCheck = Date.now();
  return lastDbStatus;
};

/**
 * GET /api/health
 * Returns system health status (existing endpoint, enhanced)
 */
router.get('/', async (req, res) => {
  const services = {
    anthropic: false,
    openai: false,
    mindstudio: false,
    voice: false,
    search: false,
    supabase: false,
  };

  // Check Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    services.anthropic = true;
  }

  // Check OpenAI
  if (process.env.OPENAI_API_KEY) {
    services.openai = true;
    services.voice = true; // Voice uses OpenAI
  }

  // Check MindStudio
  if (process.env.MINDSTUDIO_API_KEY) {
    services.mindstudio = true;
  }

  // Check Search (Brave, Tavily, or Serper)
  if (
    process.env.BRAVE_SEARCH_API_KEY ||
    process.env.BRAVE_API_KEY ||
    process.env.TAVILY_API_KEY ||
    process.env.SERPER_API_KEY
  ) {
    services.search = true;
  }

  // Check Supabase
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    services.supabase = true;

    // Actually test the connection
    if (req.supabase) {
      try {
        const { error } = await req.supabase.from('conversations').select('id').limit(1);
        services.supabase = !error;
      } catch (e) {
        // If query fails, still mark as configured
        services.supabase = true;
      }
    }
  }

  // Calculate overall status
  const activeCount = Object.values(services).filter(Boolean).length;
  const totalCount = Object.keys(services).length;

  res.json({
    success: true,
    status: activeCount === totalCount ? 'operational' : activeCount > 0 ? 'partial' : 'error',
    services: services,
    timestamp: new Date().toISOString(),
    version: '2.31.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
});

/**
 * GET /api/health/ping
 * Simple ping endpoint
 */
router.get('/ping', (req, res) => {
  res.json({ success: true, message: 'pong', timestamp: new Date().toISOString() });
});

/**
 * GET /api/health/ready
 * Kubernetes readiness probe
 * Returns 200 when the service is ready to accept traffic
 */
router.get('/ready', async (req, res) => {
  // Check if service is initialized
  if (!isReady) {
    return res.status(503).json({
      ready: false,
      message: 'Service is starting up',
    });
  }

  // Quick database ping
  const dbStatus = await checkDatabase(req.supabase);
  if (dbStatus.status === 'unhealthy') {
    return res.status(503).json({
      ready: false,
      message: 'Database unavailable',
      database: dbStatus,
    });
  }

  res.status(200).json({
    ready: true,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/health/live
 * Kubernetes liveness probe
 * Returns 200 if the process is running
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
});

/**
 * GET /api/health/detailed
 * Detailed health check with system metrics
 */
router.get('/detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: process.env.npm_package_version || '2.31.0',
    environment: process.env.NODE_ENV || 'development',
    node: process.version,
  };

  // Memory usage
  const memUsage = process.memoryUsage();
  health.memory = {
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    rss: Math.round(memUsage.rss / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024),
    unit: 'MB',
  };

  // CPU usage (rough estimate)
  const cpuUsage = process.cpuUsage();
  health.cpu = {
    user: Math.round(cpuUsage.user / 1000),
    system: Math.round(cpuUsage.system / 1000),
    unit: 'ms',
  };

  // Database check
  health.database = await checkDatabase(req.supabase);

  // External APIs configuration
  health.externalApis = {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    mindstudio: !!process.env.MINDSTUDIO_API_KEY,
    brave: !!process.env.BRAVE_SEARCH_API_KEY || !!process.env.BRAVE_API_KEY,
    tavily: !!process.env.TAVILY_API_KEY,
    serper: !!process.env.SERPER_API_KEY,
  };

  // Determine overall status
  if (health.database.status === 'unhealthy') {
    health.status = 'degraded';
  }

  // Memory warning
  const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  if (heapUsedPercent > 90) {
    health.status = 'warning';
    health.warnings = health.warnings || [];
    health.warnings.push('High memory usage');
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'warning' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * Mark service as ready
 * Call this after initialization is complete
 */
const markReady = () => {
  isReady = true;
  logger.info('Service marked as ready');
};

/**
 * Mark service as not ready
 * Call this during shutdown or when dependencies fail
 */
const markNotReady = () => {
  isReady = false;
  logger.warn('Service marked as not ready');
};

// Export router and helper functions
module.exports = router;
module.exports.markReady = markReady;
module.exports.markNotReady = markNotReady;
