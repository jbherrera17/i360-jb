# Insight 360 Blueprint v2.32

**Version:** 2.32
**Date:** January 5, 2026
**Status:** Phase 14 | Observability & Monitoring

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.32

### Phase 14: Observability & Monitoring

Phase 14 implements production-grade observability with structured logging, Prometheus metrics, request correlation IDs, and comprehensive health check endpoints. This provides the foundation for monitoring, debugging, and operating the system at scale.

---

### Structured Logging (Winston)

A comprehensive logging service using Winston with environment-aware configuration.

#### Log Levels

| Level | Value | Color | Usage |
|-------|-------|-------|-------|
| error | 0 | Red | System failures, exceptions |
| warn | 1 | Yellow | Potential issues, deprecations |
| info | 2 | Green | Important events, startup |
| http | 3 | Magenta | HTTP requests |
| debug | 4 | Blue | Detailed debugging |

#### Environment Configuration

| Environment | Default Level | Format |
|-------------|--------------|--------|
| Production | `info` | JSON (structured) |
| Development | `debug` | Colorized console |
| Test | `warn` | Console |

Override via `LOG_LEVEL` environment variable.

#### Features

- **Correlation IDs**: Every request tagged with UUID for tracing
- **Contextual Logging**: `withContext()` adds metadata to all logs
- **Request Logging**: `logRequest()` formats HTTP request details
- **LLM Logging**: `logLLMCall()` tracks provider, model, tokens, duration
- **Query Logging**: `logQuery()` monitors database operations

---

### Prometheus Metrics

Full Prometheus-compatible metrics endpoint at `/metrics`.

#### HTTP Metrics

| Metric | Type | Labels |
|--------|------|--------|
| `i360_http_request_duration_seconds` | Histogram | method, route, status |
| `i360_http_request_total` | Counter | method, route, status |

Route normalization replaces UUIDs and numeric IDs with `:id` for cardinality control.

#### LLM Metrics

| Metric | Type | Labels |
|--------|------|--------|
| `i360_llm_request_duration_seconds` | Histogram | provider, model |
| `i360_llm_request_total` | Counter | provider, model, status |
| `i360_llm_tokens_total` | Counter | provider, model, direction |
| `i360_llm_cost_cents_total` | Counter | provider, model |

Token pricing for cost estimation:
- Claude 4 Opus: $15/$75 per 1M tokens (input/output)
- Claude 4 Sonnet: $3/$15 per 1M tokens
- GPT-4o: $2.50/$10 per 1M tokens
- GPT-4o-mini: $0.15/$0.60 per 1M tokens

#### Database Metrics

| Metric | Type | Labels |
|--------|------|--------|
| `i360_db_query_duration_seconds` | Histogram | table, operation |
| `i360_db_query_total` | Counter | table, operation, status |

#### Application Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `i360_agent_execution_total` | Counter | Agent execution count |
| `i360_action_execution_total` | Counter | Action execution count |
| `i360_active_connections` | Gauge | Current WebSocket connections |
| `i360_active_users` | Gauge | Current active users |

---

### Request Correlation IDs

Every HTTP request receives a unique correlation ID for distributed tracing.

#### Headers

- **Request**: `X-Correlation-ID` (optional, client-provided)
- **Response**: `X-Correlation-ID` (always returned)

If not provided by client, a UUID v4 is generated server-side.

#### Flow

```
Client Request → Correlation ID Added → All Logs Tagged → Response Header
```

All subsequent operations (LLM calls, database queries, errors) include the correlation ID for end-to-end tracing.

---

### Health Check Endpoints

Kubernetes-compatible health probes for container orchestration.

#### GET /api/health

Overall system health with service statuses.

**Response:**
```json
{
  "success": true,
  "status": "operational",
  "uptime": 3600.5,
  "services": {
    "anthropic": "configured",
    "openai": "configured",
    "supabase": "connected"
  },
  "version": "2.32",
  "timestamp": "2026-01-05T12:00:00.000Z"
}
```

Status values: `operational`, `partial`, `error`

#### GET /api/health/ping

Simple uptime check for load balancers.

**Response:**
```json
{
  "success": true,
  "message": "pong",
  "timestamp": "2026-01-05T12:00:00.000Z"
}
```

#### GET /api/health/live

Kubernetes liveness probe. Returns 200 if server process is running.

**Response:**
```json
{
  "alive": true,
  "timestamp": "2026-01-05T12:00:00.000Z",
  "uptime": 3600.5
}
```

#### GET /api/health/ready

Kubernetes readiness probe. Returns 200 when ready to accept traffic, 503 during startup or shutdown.

**Response (ready):**
```json
{
  "ready": true,
  "timestamp": "2026-01-05T12:00:00.000Z"
}
```

**Response (not ready):**
```json
{
  "ready": false,
  "message": "Service is starting up"
}
```

#### GET /api/health/detailed

Comprehensive health information including system resources.

**Response:**
```json
{
  "status": "operational",
  "timestamp": "2026-01-05T12:00:00.000Z",
  "uptime": 3600.5,
  "version": "2.32",
  "environment": "production",
  "node": "v20.10.0",
  "memory": {
    "heapUsed": 50.5,
    "heapTotal": 100.2,
    "rss": 120.8,
    "external": 5.2,
    "unit": "MB"
  },
  "cpu": {
    "user": 12345678,
    "system": 2345678
  },
  "database": {
    "status": "connected"
  },
  "externalApis": {
    "anthropic": true,
    "openai": true
  }
}
```

---

### Observability Middleware

Central middleware that integrates all observability features.

#### Features

1. **Correlation ID Injection**: Adds/propagates correlation ID
2. **Request Timing**: Measures request duration
3. **Request Logging**: Logs all HTTP requests
4. **Metrics Recording**: Records HTTP metrics
5. **Response Headers**: Adds correlation ID to response

#### Configuration

The middleware runs after static file serving but before route handlers:

```javascript
app.use(observabilityMiddleware);
```

---

### Graceful Shutdown

Server handles shutdown signals properly for container orchestration.

#### Signals Handled

- `SIGINT` (Ctrl+C)
- `SIGTERM` (container orchestration)

#### Shutdown Sequence

1. Mark server as not ready (503 on `/ready`)
2. Stop accepting new connections
3. Allow in-flight requests to complete
4. Close server
5. Exit process

---

### New Files

| File | Purpose |
|------|---------|
| `server/services/logger.js` | Winston structured logging service |
| `server/services/metrics.js` | Prometheus metrics service |
| `server/middleware/observability.js` | Correlation ID and request tracking middleware |
| `__tests__/unit/services/logger.test.js` | Logger service tests (18 tests) |
| `__tests__/unit/services/metrics.test.js` | Metrics service tests (24 tests) |
| `__tests__/integration/routes/health.test.js` | Health endpoint tests (17 tests) |

### Modified Files

| File | Changes |
|------|---------|
| `server/index.js` | Integrated observability middleware, logger, metrics endpoint, graceful shutdown |
| `server/routes/health.js` | Added /ready, /live, /detailed endpoints, markReady/markNotReady |
| `__tests__/setup/testApp.js` | Added health routes support |
| `package.json` | Added winston, prom-client dependencies |

---

### Production Readiness Score

**Score: 8.2/10** (+0.2)

| Area | Score | Change | Notes |
|------|-------|--------|-------|
| Architecture | 8/10 | - | Enterprise permission model |
| Security | 7/10 | - | RLS for all tables |
| Error Handling | 7/10 | - | Good coverage |
| Database | 8/10 | - | Comprehensive schema |
| Testing | 8/10 | - | 576 tests (unit, integration, E2E, performance) |
| Observability | 8/10 | +5 | Winston logging, Prometheus metrics, health probes |
| Documentation | 8/10 | - | API routes documented |
| User Experience | 7.5/10 | - | Admin UX, health dashboard |

---

### Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| `winston` | ^3.x | Structured logging |
| `prom-client` | ^15.x | Prometheus metrics |

---

### Test Summary

**Total Tests: 576** (+65 from Phase 14)

| Category | Tests | New |
|----------|-------|-----|
| Unit Tests | 352 | +42 |
| Integration Tests | 198 | +17 |
| E2E Tests | 6 | - |
| Performance Tests | 20 | +6 |

#### New Test Files

- `logger.test.js` - 18 tests (Winston mock patterns, log methods, context logging)
- `metrics.test.js` - 24 tests (HTTP, LLM, DB, agent metrics)
- `health.test.js` - 17 tests (all health endpoints)

---

### Next Steps (Phase 16)

- [ ] Implement retry logic with exponential backoff
- [ ] Add circuit breakers for LLM APIs
- [ ] Handle partial failures gracefully
- [ ] Add fallback responses when services fail
- [ ] Implement timeout configurations

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.32 | Jan 5, 2026 | Winston logging, Prometheus metrics, health probes, 576 tests |
| v2.31 | Jan 5, 2026 | Business roles, department strategy, governance, system health |
| v2.30 | Jan 4, 2026 | Navigation restructure, Agent Library UX, category data fix |
| v2.29 | Jan 4, 2026 | User onboarding wizard, profile page, new client setup system |
| v2.28 | Jan 3, 2026 | Execute 120 schema, 16 agents, 5 system workflows |
| v2.27 | Jan 2, 2026 | Security fixes, RLS policy fix, user management |
| v2.26 | Jan 2, 2026 | Navigation redesign, UI consistency |
