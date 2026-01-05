/**
 * Prometheus Metrics Service
 * Phase 14: Observability & Monitoring
 *
 * Provides metrics for:
 * - HTTP request latency and count
 * - LLM API usage and costs
 * - Database query performance
 * - System health indicators
 */

const promClient = require('prom-client');

// Create a Registry
const register = new promClient.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: 'i360_',
});

// ==============================================
// HTTP METRICS
// ==============================================

// HTTP request duration histogram
const httpRequestDuration = new promClient.Histogram({
  name: 'i360_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// HTTP request counter
const httpRequestTotal = new promClient.Counter({
  name: 'i360_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Active connections gauge
const activeConnections = new promClient.Gauge({
  name: 'i360_active_connections',
  help: 'Number of active HTTP connections',
  registers: [register],
});

// ==============================================
// LLM API METRICS
// ==============================================

// LLM API call duration
const llmRequestDuration = new promClient.Histogram({
  name: 'i360_llm_request_duration_seconds',
  help: 'Duration of LLM API requests in seconds',
  labelNames: ['provider', 'model'],
  buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],
  registers: [register],
});

// LLM API call counter
const llmRequestTotal = new promClient.Counter({
  name: 'i360_llm_requests_total',
  help: 'Total number of LLM API requests',
  labelNames: ['provider', 'model', 'status'],
  registers: [register],
});

// LLM token usage counter
const llmTokensTotal = new promClient.Counter({
  name: 'i360_llm_tokens_total',
  help: 'Total number of LLM tokens used',
  labelNames: ['provider', 'model', 'type'], // type: input, output
  registers: [register],
});

// Estimated LLM cost counter (in cents)
const llmCostTotal = new promClient.Counter({
  name: 'i360_llm_cost_cents_total',
  help: 'Estimated LLM API cost in cents',
  labelNames: ['provider', 'model'],
  registers: [register],
});

// ==============================================
// DATABASE METRICS
// ==============================================

// Database query duration
const dbQueryDuration = new promClient.Histogram({
  name: 'i360_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['table', 'operation'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

// Database query counter
const dbQueryTotal = new promClient.Counter({
  name: 'i360_db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['table', 'operation', 'status'],
  registers: [register],
});

// ==============================================
// BUSINESS METRICS
// ==============================================

// Agent executions counter
const agentExecutionsTotal = new promClient.Counter({
  name: 'i360_agent_executions_total',
  help: 'Total number of agent executions',
  labelNames: ['agent_id', 'status'],
  registers: [register],
});

// Action executions counter
const actionExecutionsTotal = new promClient.Counter({
  name: 'i360_action_executions_total',
  help: 'Total number of action executions',
  labelNames: ['action_id', 'status'],
  registers: [register],
});

// Active users gauge
const activeUsers = new promClient.Gauge({
  name: 'i360_active_users',
  help: 'Number of active users in the last 5 minutes',
  registers: [register],
});

// ==============================================
// HELPER FUNCTIONS
// ==============================================

// Token pricing (per 1M tokens, in cents)
const TOKEN_PRICING = {
  'claude-sonnet-4-5-20250929': { input: 300, output: 1500 },
  'claude-opus-4-5-20251101': { input: 1500, output: 7500 },
  'claude-sonnet-4-20250514': { input: 300, output: 1500 },
  'gpt-4o': { input: 250, output: 1000 },
  'gpt-4o-mini': { input: 15, output: 60 },
  'gpt-4-turbo': { input: 1000, output: 3000 },
  default: { input: 100, output: 500 },
};

/**
 * Record HTTP request metrics
 */
const recordHttpRequest = (method, route, statusCode, durationMs) => {
  const durationSec = durationMs / 1000;
  const normalizedRoute = normalizeRoute(route);

  httpRequestDuration.observe(
    { method, route: normalizedRoute, status_code: statusCode },
    durationSec
  );
  httpRequestTotal.inc({ method, route: normalizedRoute, status_code: statusCode });
};

/**
 * Record LLM API call metrics
 */
const recordLLMRequest = (provider, model, inputTokens, outputTokens, durationMs, success = true) => {
  const durationSec = durationMs / 1000;
  const status = success ? 'success' : 'error';

  llmRequestDuration.observe({ provider, model }, durationSec);
  llmRequestTotal.inc({ provider, model, status });

  if (inputTokens > 0) {
    llmTokensTotal.inc({ provider, model, type: 'input' }, inputTokens);
  }
  if (outputTokens > 0) {
    llmTokensTotal.inc({ provider, model, type: 'output' }, outputTokens);
  }

  // Calculate estimated cost
  const pricing = TOKEN_PRICING[model] || TOKEN_PRICING.default;
  const costCents =
    (inputTokens * pricing.input) / 1000000 + (outputTokens * pricing.output) / 1000000;
  llmCostTotal.inc({ provider, model }, costCents);
};

/**
 * Record database query metrics
 */
const recordDbQuery = (table, operation, durationMs, success = true) => {
  const durationSec = durationMs / 1000;
  const status = success ? 'success' : 'error';

  dbQueryDuration.observe({ table, operation }, durationSec);
  dbQueryTotal.inc({ table, operation, status });
};

/**
 * Record agent execution
 */
const recordAgentExecution = (agentId, success = true) => {
  const status = success ? 'success' : 'error';
  agentExecutionsTotal.inc({ agent_id: agentId, status });
};

/**
 * Record action execution
 */
const recordActionExecution = (actionId, success = true) => {
  const status = success ? 'success' : 'error';
  actionExecutionsTotal.inc({ action_id: actionId, status });
};

/**
 * Update active connections gauge
 */
const setActiveConnections = (count) => {
  activeConnections.set(count);
};

/**
 * Update active users gauge
 */
const setActiveUsers = (count) => {
  activeUsers.set(count);
};

/**
 * Normalize route path for metrics (replace IDs with placeholders)
 */
const normalizeRoute = (route) => {
  if (!route) return 'unknown';

  return route
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id')
    .split('?')[0]; // Remove query params
};

/**
 * Get metrics in Prometheus format
 */
const getMetrics = async () => {
  return register.metrics();
};

/**
 * Get content type for metrics response
 */
const getContentType = () => {
  return register.contentType;
};

module.exports = {
  register,
  recordHttpRequest,
  recordLLMRequest,
  recordDbQuery,
  recordAgentExecution,
  recordActionExecution,
  setActiveConnections,
  setActiveUsers,
  getMetrics,
  getContentType,
};
