# Insight 360 Blueprint v2.33

**Version:** 2.33
**Date:** January 5, 2026
**Status:** Phase 16 | Reliability & Resilience

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.33

### Phase 16: Reliability & Resilience

Phase 16 implements production-grade reliability patterns including retry with exponential backoff, circuit breakers for LLM APIs, timeout wrappers, and fallback handling. These patterns ensure graceful degradation when external services fail and automatic recovery when they become available again.

---

### Retry with Exponential Backoff

Automatic retry logic with configurable exponential backoff and jitter to prevent thundering herd problems.

#### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `maxRetries` | 3 | Maximum number of retry attempts |
| `initialDelayMs` | 1000 | Initial delay before first retry |
| `maxDelayMs` | 30000 | Maximum delay cap |
| `backoffMultiplier` | 2 | Exponential multiplier |
| `jitterFactor` | 0.1 | Random jitter (±10%) |

#### Retryable Conditions

**Network Error Codes:**
- `ECONNRESET`, `ETIMEDOUT`, `ECONNREFUSED`
- `EPIPE`, `ENOTFOUND`, `ENETUNREACH`, `EAI_AGAIN`

**HTTP Status Codes:**
- `408` (Request Timeout)
- `429` (Too Many Requests)
- `500`, `502`, `503`, `504` (Server Errors)

**Message Patterns:**
- "Rate limit" messages
- "Overloaded" messages (Claude-specific)

#### Usage

```javascript
const { withRetry } = require('./services/reliability');

const result = await withRetry(
  () => externalApiCall(),
  {
    operationName: 'api-call',
    maxRetries: 3,
    initialDelayMs: 1000,
    onRetry: (error, attempt) => console.log(`Retry ${attempt}`)
  }
);
```

---

### Circuit Breaker Pattern

Prevents cascading failures by detecting failing services and temporarily blocking requests to allow recovery.

#### Circuit States

| State | Description | Behavior |
|-------|-------------|----------|
| `CLOSED` | Normal operation | Requests pass through |
| `OPEN` | Service failing | Requests rejected immediately |
| `HALF_OPEN` | Testing recovery | Limited requests allowed |

#### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `failureThreshold` | 5 | Failures to open circuit |
| `successThreshold` | 2 | Successes to close from half-open |
| `timeout` | 30000ms | Time before recovery attempt |
| `volumeThreshold` | 5 | Minimum requests for percentage calc |
| `errorPercentageThreshold` | 50 | Error % to trigger opening |

#### Circuit Breaker Registry

Named circuit breakers are managed through a central registry:

```javascript
const { getCircuitBreaker } = require('./services/reliability');

// Get or create a circuit breaker
const cb = getCircuitBreaker('anthropic', {
  failureThreshold: 5,
  timeout: 60000
});

// Execute through circuit breaker
const result = await cb.execute(() => apiCall());
```

#### Health Endpoints

**GET /api/health/circuits**

Returns status of all circuit breakers.

```json
{
  "success": true,
  "circuits": {
    "anthropic": {
      "name": "anthropic",
      "state": "CLOSED",
      "failures": 0,
      "successes": 0,
      "failureRate": "0.0%",
      "lastFailure": null,
      "nextAttempt": null
    },
    "openai": {
      "name": "openai",
      "state": "CLOSED",
      "failures": 0,
      "successes": 0,
      "failureRate": "0.0%",
      "lastFailure": null,
      "nextAttempt": null
    }
  },
  "timestamp": "2026-01-05T12:00:00.000Z"
}
```

**POST /api/health/circuits/reset**

Manually reset all circuit breakers to CLOSED state.

```json
{
  "success": true,
  "message": "All circuit breakers reset",
  "timestamp": "2026-01-05T12:00:00.000Z"
}
```

---

### Timeout Wrapper

Wraps async operations with a configurable timeout to prevent hanging requests.

```javascript
const { withTimeout } = require('./services/reliability');

const result = await withTimeout(
  () => slowOperation(),
  30000,  // 30 second timeout
  'slow-operation'
);
```

On timeout, throws an error with:
- `code: 'ETIMEDOUT'`
- `timeout: <configured ms>`

---

### Fallback Handler

Provides graceful degradation when primary operations fail.

#### Static Fallback Value

```javascript
const { withFallback } = require('./services/reliability');

const result = await withFallback(
  () => fetchFromCache(),
  { data: 'default' }  // Static fallback
);
```

#### Function Fallback

```javascript
const result = await withFallback(
  () => primaryApi(),
  (error) => secondaryApi(error)  // Function receives error
);
```

#### Async Fallback

```javascript
const result = await withFallback(
  () => fastApi(),
  async () => slowBackupApi()  // Async function supported
);
```

---

### Combined Resilience Wrapper

The `withResilience()` function combines all patterns for comprehensive protection.

```javascript
const { withResilience } = require('./services/reliability');

const result = await withResilience(
  () => llmApiCall(),
  {
    operationName: 'llm-chat',
    timeout: 120000,
    circuitBreaker: 'anthropic',
    circuitBreakerOptions: {
      failureThreshold: 5,
      timeout: 60000
    },
    retryOptions: {
      maxRetries: 3,
      initialDelayMs: 1000
    },
    fallback: { error: 'Service temporarily unavailable' }
  }
);
```

#### Execution Order

1. **Timeout** - Wraps operation with timeout
2. **Circuit Breaker** - Checks circuit state, rejects if OPEN
3. **Retry** - Retries on failure with exponential backoff
4. **Fallback** - Returns fallback on final failure

---

### LLM Service Integration

Both Anthropic and OpenAI services now use reliability wrappers.

#### Anthropic Configuration

```javascript
const ANTHROPIC_CIRCUIT_CONFIG = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,
  volumeThreshold: 3,
  errorPercentageThreshold: 50,
};

const ANTHROPIC_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};
```

#### OpenAI Configuration

```javascript
const OPENAI_CIRCUIT_CONFIG = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,
  volumeThreshold: 3,
  errorPercentageThreshold: 50,
};

const OPENAI_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};
```

#### New Service Methods

Both services expose circuit breaker status:

```javascript
const anthropic = require('./services/anthropic');
const status = anthropic.getCircuitStatus();
anthropic.resetCircuit();
```

---

### New Files

| File | Purpose |
|------|---------|
| `server/services/reliability.js` | Retry, circuit breaker, timeout, fallback utilities |
| `__tests__/unit/services/reliability.test.js` | Reliability service tests (50 tests) |

### Modified Files

| File | Changes |
|------|---------|
| `server/services/anthropic.js` | Added reliability wrappers, circuit breaker config |
| `server/services/openai.js` | Added reliability wrappers, circuit breaker config |
| `server/routes/health.js` | Added /circuits and /circuits/reset endpoints |
| `server/middleware/observability.js` | Fixed uuid ESM compatibility issue |

---

### Production Readiness Score

**Score: 8.4/10** (+0.2)

| Area | Score | Change | Notes |
|------|-------|--------|-------|
| Architecture | 8/10 | - | Enterprise permission model |
| Security | 7/10 | - | RLS for all tables |
| Error Handling | 8/10 | +1 | Retry, circuit breaker, fallback |
| Database | 8/10 | - | Comprehensive schema |
| Testing | 8/10 | - | 626 tests (unit, integration, E2E, performance) |
| Observability | 8/10 | - | Winston logging, Prometheus metrics, health probes |
| Reliability | 8/10 | NEW | Retry, circuit breakers, timeouts, fallbacks |
| Documentation | 8/10 | - | API routes documented |
| User Experience | 7.5/10 | - | Admin UX, health dashboard |

---

### Test Summary

**Total Tests: 626** (+50 from Phase 16)

| Category | Tests | New |
|----------|-------|-----|
| Unit Tests | 402 | +50 |
| Integration Tests | 198 | - |
| E2E Tests | 6 | - |
| Performance Tests | 20 | - |

#### New Test Coverage

- `calculateDelay` - Exponential backoff, max cap, jitter (3 tests)
- `isRetryableError` - Error codes, status codes, messages (12 tests)
- `CircuitBreaker` - States, execute, reset, thresholds (22 tests)
- `Registry` - Get, status, reset all (5 tests)
- `Fallback` - Values, functions, async, null (8 tests)

---

### API Reference

#### Health Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Overall system health |
| `/api/health/ping` | GET | Simple uptime check |
| `/api/health/live` | GET | Kubernetes liveness |
| `/api/health/ready` | GET | Kubernetes readiness |
| `/api/health/detailed` | GET | Comprehensive health info |
| `/api/health/circuits` | GET | Circuit breaker statuses |
| `/api/health/circuits/reset` | POST | Reset all circuit breakers |

---

### Next Steps (Phase 17)

- [ ] Implement database migrations with rollback
- [ ] Add data validation at persistence layer
- [ ] Create backup and restore procedures
- [ ] Implement point-in-time recovery

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.33 | Jan 5, 2026 | Retry with backoff, circuit breakers, timeouts, fallbacks, 626 tests |
| v2.32 | Jan 5, 2026 | Winston logging, Prometheus metrics, health probes, 576 tests |
| v2.31 | Jan 5, 2026 | Business roles, department strategy, governance, system health |
| v2.30 | Jan 4, 2026 | Navigation restructure, Agent Library UX, category data fix |
| v2.29 | Jan 4, 2026 | User onboarding wizard, profile page, new client setup system |
| v2.28 | Jan 3, 2026 | Execute 120 schema, 16 agents, 5 system workflows |
| v2.27 | Jan 2, 2026 | Security fixes, RLS policy fix, user management |
| v2.26 | Jan 2, 2026 | Navigation redesign, UI consistency |
