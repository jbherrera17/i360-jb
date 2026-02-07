# Insight 360 Test Plan

**Version:** 1.0
**Date:** February 6, 2026
**Coverage Target:** Increase from 24% to 60% (Phase 1), 80% (Phase 2)

---

## Executive Summary

This test plan provides a comprehensive strategy for testing the Insight 360 platform based on the current codebase state. The application is a values-based AI command center with multi-LLM orchestration, featuring 47 route files (200+ endpoints), 51+ service files, and 4 middleware modules.

### Current State
| Metric | Value |
|--------|-------|
| Test Files | 43 |
| Lines of Test Code | ~20,000 |
| Coverage Threshold | 24% (lines), 23% (branches) |
| Test Framework | Jest 29.7 + Playwright 1.57 |
| E2E Tests | 2 files (workflows, performance) |

---

## 1. Test Architecture

### 1.1 Test Categories

```
__tests__/
├── unit/                    # Isolated function/class tests
│   ├── middleware/          # Auth, validation, module access
│   ├── services/            # LLM providers, business logic
│   └── utils/               # Helper functions
├── integration/             # Route/API tests with mocked DB
│   └── routes/              # HTTP endpoint testing
├── e2e/                     # End-to-end flows (Jest)
│   ├── workflows.test.js    # Multi-step workflow execution
│   └── performance.test.js  # Response time benchmarks
└── e2e-ui/                  # Playwright browser tests
    └── *.spec.js            # User journey tests
```

### 1.2 Test Infrastructure

| Component | File | Purpose |
|-----------|------|---------|
| Jest Setup | `__tests__/setup/jest.setup.js` | Fake timers, env vars, console suppression |
| Test App Factory | `__tests__/setup/testApp.js` | Express app with auth injection |
| Supabase Mock | `__tests__/setup/mockSupabase.js` | Chainable query builder mock |
| LLM Mocks | `__tests__/setup/mockLLMClients.js` | Anthropic/OpenAI/Perplexity mocks |
| Fixtures | `__tests__/fixtures/testData.js` | Reusable test objects |

---

## 2. Unit Test Coverage Plan

### 2.1 Core LLM Services (CRITICAL)

| Service | Current | Target | Priority | Notes |
|---------|---------|--------|----------|-------|
| anthropic.js | Tested | 80% | P0 | Add vision, PDF, tool use edge cases |
| openai.js | Tested | 80% | P0 | Add image gen, audio, o-series reasoning |
| perplexity.js | Partial | 70% | P1 | Add citation parsing, deprecated models |
| gemini.js | None | 70% | P1 | New tests for streaming, vision |
| llmRegistry.js | None | 90% | P1 | Data-only, easy to test completely |
| reliability.js | Tested | 85% | P0 | Critical for production stability |

**Test Scenarios for LLM Services:**
- [ ] Successful chat completion (all models)
- [ ] Streaming with multiple chunks
- [ ] Token counting and limits
- [ ] Vision input handling (images, PDFs)
- [ ] Tool/function calling
- [ ] Error responses (rate limit, invalid key, timeout)
- [ ] Circuit breaker state transitions (CLOSED → OPEN → HALF_OPEN → CLOSED)
- [ ] Retry with exponential backoff
- [ ] Model alias resolution

### 2.2 Agent & Execution Services (CRITICAL)

| Service | Current | Target | Priority |
|---------|---------|--------|----------|
| agentService.js | Partial | 75% | P0 |
| agentExecutionService.js | None | 70% | P1 |
| conversationService.js | None | 70% | P2 |

**Test Scenarios:**
- [ ] Agent execution with each provider (Claude, GPT, Perplexity, Gemini)
- [ ] Context injection during execution
- [ ] Streaming with progress callbacks
- [ ] Execution logging to database
- [ ] Workflow step execution
- [ ] Structured output parsing and validation

### 2.3 Context & Configuration Services (HIGH)

| Service | Current | Target | Priority |
|---------|---------|--------|----------|
| contextInjection.js | Tested | 80% | P0 |
| soulConfigService.js | Tested | 75% | P1 |
| ethicalContextService.js | Tested | 75% | P1 |
| valuesAlignmentService.js | None | 70% | P2 |

**Test Scenarios:**
- [ ] Token budget calculation and truncation
- [ ] Conditional injection rules
- [ ] ReDoS regex protection
- [ ] Soul config inheritance (Platform → Org → Dept → Agent)
- [ ] Version rollback
- [ ] soul.md generation and parsing
- [ ] Ethical stakes detection (Critical/High/Medium/Low)
- [ ] 6-lens ethical analysis
- [ ] Values drift detection

### 2.4 Workflow Engine (HIGH)

| Service | Current | Target | Priority |
|---------|---------|--------|----------|
| workflowEngine.js | Tested | 80% | P0 |

**Test Scenarios for 9 Step Types:**
- [ ] user_input - Form input handling
- [ ] agent_chat - Agent execution within workflow
- [ ] skill_execution - Skill invocation
- [ ] research - Web search integration
- [ ] human_gate - HITL approval/rejection
- [ ] context_creation - Asset creation
- [ ] review - Review step handling
- [ ] artifact_generation - Output generation
- [ ] output - Final output formatting

### 2.5 Middleware (CRITICAL)

| Middleware | Current | Target | Priority |
|------------|---------|--------|----------|
| auth.js | Tested | 90% | P0 |
| moduleAccess.js | Tested | 85% | P0 |
| validate.js | Partial | 80% | P1 |
| observability.js | None | 70% | P2 |

**Test Scenarios:**
- [ ] JWT token extraction (cookie, header)
- [ ] Token validation (valid, expired, malformed)
- [ ] Role-based access (admin, user, viewer)
- [ ] Impersonation flow
- [ ] Rate limiting (window tracking, cleanup)
- [ ] Module access by tier (Starter, Business, Enterprise, Agency)
- [ ] Resource limit enforcement
- [ ] Platform admin verification
- [ ] Zod schema validation (all schemas)
- [ ] Correlation ID generation
- [ ] Request logging

---

## 3. Integration Test Coverage Plan

### 3.1 Core API Routes (CRITICAL)

| Route | Current | Target | Endpoints |
|-------|---------|--------|-----------|
| agents.js | Tested | 85% | 25+ endpoints |
| chat.js | Tested | 80% | Streaming focus |
| context.js | Tested | 85% | Asset CRUD, versions |
| auth.js | Tested | 90% | Registration, login, roles |
| actions.js | Tested | 80% | Execute, templates, linking |

### 3.2 Governance Routes (HIGH)

| Route | Current | Target | Endpoints |
|-------|---------|--------|-----------|
| parthenon.js | Tested | 75% | Governance framework |
| soulConfig.js | Tested | 80% | Soul config CRUD |
| governance.js | None | 70% | NEW |

### 3.3 Strategy Routes (MEDIUM)

| Route | Current | Target | Endpoints |
|-------|---------|--------|-----------|
| align120.js | None | 70% | Sessions, modules, profiles |
| strategy120.js | None | 70% | Planning pipeline |
| execute120.js | None | 70% | Execution pipeline |
| s2e.js | None | 65% | Strategy-to-Execution |

### 3.4 Multi-Tenancy Routes (HIGH)

| Route | Current | Target | Endpoints |
|-------|---------|--------|-----------|
| organizations.js | Tested | 80% | Org CRUD |
| org-members.js | Tested | 75% | Membership |
| clients.js | Tested | 75% | Client management |
| modules.js | None | 80% | Module access |
| platformAdmin.js | None | 80% | Platform admin |

### 3.5 Integration Routes (MEDIUM)

| Route | Current | Target | Endpoints |
|-------|---------|--------|-----------|
| integrations.js | Tested | 70% | OAuth, credentials |
| webhooks.js | Partial | 70% | Webhook delivery |

---

## 4. End-to-End Test Plan

### 4.1 Critical User Journeys (Playwright)

| Journey | Priority | Status |
|---------|----------|--------|
| User Registration → Login → Chat | P0 | NEW |
| Create Agent → Execute → View Results | P0 | NEW |
| Create Workflow → Execute Steps → Complete | P0 | Exists |
| Soul Config → Publish → Verify Inheritance | P1 | NEW |
| Align 120 Session → Run Modules → Generate Profile | P1 | NEW |
| Admin: Create Org → Assign Tier → Add Members | P1 | NEW |

### 4.2 E2E Test Scenarios

```javascript
// Example: User Journey Test Structure
describe('Agent Creation and Execution', () => {
  test('user can create agent with context', async ({ page }) => {
    // 1. Login
    // 2. Navigate to Agents
    // 3. Create agent with name, model, system prompt
    // 4. Add context mapping
    // 5. Execute agent with test input
    // 6. Verify response appears
  });
});
```

### 4.3 Performance Benchmarks

| Metric | Target | Current |
|--------|--------|---------|
| API Response (p95) | < 200ms | Measured |
| Chat First Token | < 500ms | Measured |
| Agent Execution | < 5s | Measured |
| Workflow Step | < 3s | Measured |
| Page Load | < 2s | Measured |

---

## 5. Test Data Strategy

### 5.1 Fixtures Structure

```javascript
// __tests__/fixtures/testData.js
module.exports = {
  users: {
    admin: { id: 'uuid', email: 'admin@test.com', role: 'admin' },
    user: { id: 'uuid', email: 'user@test.com', role: 'user' },
    viewer: { id: 'uuid', email: 'viewer@test.com', role: 'viewer' }
  },
  agents: {
    basic: { id: 'uuid', name: 'Test Agent', model: 'claude-sonnet-4-20250514' },
    withContext: { /* agent with context mappings */ },
    streaming: { /* agent configured for streaming */ }
  },
  organizations: {
    starter: { tier: 'starter', max_agents: 5 },
    business: { tier: 'business', max_agents: 25 },
    enterprise: { tier: 'enterprise', max_agents: 100 },
    agency: { tier: 'agency', max_clients: 100 }
  },
  soulConfigs: {
    platform: { scope: 'platform', values: [...] },
    organization: { scope: 'organization', values: [...] }
  }
};
```

### 5.2 Database Seeding

- Test database: Uses `.env.test` with separate Supabase project or local container
- Seed before test suite: Run `db/seed-test.sql` (to be created)
- Clean after each test: Transaction rollback or truncate pattern

---

## 6. Mocking Strategy

### 6.1 External Services

| Service | Mock Location | Strategy |
|---------|---------------|----------|
| Anthropic API | mockLLMClients.js | Full response mocking |
| OpenAI API | mockLLMClients.js | Full response mocking |
| Perplexity API | mockLLMClients.js | Citation-aware mocking |
| Supabase | mockSupabase.js | Chainable query builder |
| Web Search | Manual | Return canned results |
| Google APIs | Manual | OAuth + data mocking |

### 6.2 Mock Response Patterns

```javascript
// __tests__/setup/testApp.js - mockResponses object
mockResponses.agentList(mockSupabase, agents);
mockResponses.singleAgent(mockSupabase, agent);
mockResponses.authSuccess(mockSupabase, user);
mockResponses.moduleAccessAllowed(mockSupabase, modules);
mockResponses.resourceLimitCheck(mockSupabase, limits);
```

---

## 7. Security Testing

### 7.1 Authentication Tests

- [ ] JWT token expiration handling
- [ ] Invalid token rejection
- [ ] Cookie security (httpOnly, secure, sameSite)
- [ ] Session invalidation on logout
- [ ] Password reset token expiration
- [ ] Impersonation audit trail

### 7.2 Authorization Tests

- [ ] Role-based access enforcement
- [ ] Module access by subscription tier
- [ ] Resource ownership verification
- [ ] Cross-org data isolation
- [ ] Platform admin escalation prevention

### 7.3 Input Validation Tests

- [ ] SQL injection attempts (parameterized queries)
- [ ] XSS in user input (HTML escaping)
- [ ] ReDoS regex patterns (contextInjection.js)
- [ ] File upload validation
- [ ] JSON payload size limits

---

## 8. Test Execution Strategy

### 8.1 CI/CD Pipeline

```yaml
# .github/workflows/test.yml
test:
  - npm run lint
  - npm test -- --coverage
  - npm run test:e2e

# Fail if coverage drops below threshold
# Current: 24% → Target: 60%
```

### 8.2 Test Commands

| Command | Purpose |
|---------|---------|
| `npm test` | Run all Jest tests |
| `npm test -- --watch` | Watch mode for development |
| `npm test -- --coverage` | Generate coverage report |
| `npm test -- path/to/test.js` | Run single test file |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run test:all` | Jest + Playwright |

### 8.3 Test Execution Order

1. **Unit tests first** - Fast feedback on logic errors
2. **Integration tests** - API contract verification
3. **E2E tests last** - Full system validation

---

## 9. Coverage Improvement Roadmap

### Phase 1: Foundation (Target: 60%)

| Week | Focus Area | Expected Gain |
|------|------------|---------------|
| 1-2 | LLM services (gemini.js, llmRegistry.js) | +5% |
| 3-4 | Missing route tests (modules, platform, strategy) | +10% |
| 5-6 | Workflow engine step handlers | +8% |
| 7-8 | Auth and middleware edge cases | +5% |
| 9-10 | Soul config and ethical services | +8% |

### Phase 2: Comprehensive (Target: 80%)

| Week | Focus Area | Expected Gain |
|------|------------|---------------|
| 11-12 | Integration routes (align120, strategy120) | +8% |
| 13-14 | E2E user journeys (Playwright) | +5% |
| 15-16 | Error handling and edge cases | +7% |

---

## 10. Test File Templates

### 10.1 Unit Test Template

```javascript
// __tests__/unit/services/myService.test.js
const { createMockSupabase } = require('../../setup/mockSupabase');

describe('MyService', () => {
  let mockSupabase;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    jest.clearAllMocks();
  });

  describe('functionName', () => {
    it('should handle success case', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [...], error: null })
        })
      });

      // Act
      const result = await functionName(input);

      // Assert
      expect(result).toEqual(expected);
    });

    it('should handle error case', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Error' } })
        })
      });

      await expect(functionName(input)).rejects.toThrow('Error');
    });
  });
});
```

### 10.2 Integration Test Template

```javascript
// __tests__/integration/routes/myRoute.test.js
const request = require('supertest');
const { createAuthenticatedTestApp, mockResponses } = require('../../setup/testApp');

describe('GET /api/my-route', () => {
  let app, mockSupabase;

  beforeEach(() => {
    const testApp = createAuthenticatedTestApp({ userId: 'test-user' });
    app = testApp.app;
    mockSupabase = testApp.mockSupabase;
  });

  it('returns 200 with valid data', async () => {
    mockResponses.resourceList(mockSupabase, [{ id: '1', name: 'Test' }]);

    const response = await request(app)
      .get('/api/my-route')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
  });

  it('returns 401 without authentication', async () => {
    // Use unauthenticated app
    const { app: unauthApp } = createTestApp();

    await request(unauthApp)
      .get('/api/my-route')
      .expect(401);
  });
});
```

### 10.3 E2E Test Template (Playwright)

```javascript
// __tests__/e2e-ui/myFeature.spec.js
const { test, expect } = require('@playwright/test');

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('user can perform action', async ({ page }) => {
    await page.goto('/my-feature');
    await page.click('button:has-text("Create")');
    await page.fill('[name="name"]', 'Test Item');
    await page.click('button:has-text("Save")');

    await expect(page.locator('.success-toast')).toBeVisible();
  });
});
```

---

## 11. Gap Analysis: Missing Tests

### 11.1 Routes Without Tests

| Route File | Endpoints | Priority |
|------------|-----------|----------|
| align120.js | 25+ | P1 |
| strategy120.js | 15+ | P2 |
| execute120.js | 10+ | P2 |
| modules.js | 10+ | P1 |
| platformAdmin.js | 15+ | P1 |
| researchStudio.js | 10+ | P2 |
| governance.js | 8+ | P2 |
| s2e.js | 10+ | P2 |

### 11.2 Services Without Tests

| Service File | Functions | Priority |
|--------------|-----------|----------|
| gemini.js | 6 | P1 |
| conversationService.js | 11 | P2 |
| valuesAlignmentService.js | 10+ | P2 |
| briefingService.js | 8+ | P2 |
| mindstudioService.js | 5+ | P3 |
| notionService.js | 10+ | P3 |

### 11.3 Middleware Without Tests

| Middleware | Priority |
|------------|----------|
| observability.js | P2 |
| validate.js (full coverage) | P1 |

---

## 12. Appendix

### A. Environment Variables for Testing

```bash
# .env.test
NODE_ENV=test
PORT=3001
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_KEY=test-service-key
ANTHROPIC_API_KEY=test-anthropic-key
OPENAI_API_KEY=test-openai-key
PERPLEXITY_API_KEY=test-perplexity-key
DEV_AUTH_BYPASS=false
```

### B. Jest Configuration Reference

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  maxWorkers: 1,
  coverageThreshold: {
    global: { lines: 24, statements: 24, functions: 23, branches: 23 }
  }
};
```

### C. Key File Locations

| Purpose | Path |
|---------|------|
| Jest Config | `jest.config.js` |
| Test Setup | `__tests__/setup/jest.setup.js` |
| Test App Factory | `__tests__/setup/testApp.js` |
| Supabase Mock | `__tests__/setup/mockSupabase.js` |
| LLM Mocks | `__tests__/setup/mockLLMClients.js` |
| Fixtures | `__tests__/fixtures/testData.js` |
| Playwright Config | `playwright.config.js` |

---

*This test plan should be reviewed and updated quarterly as the codebase evolves.*
