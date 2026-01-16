# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Insight 360 is a values-based AI command center and multi-LLM orchestration platform. It provides agent management, context injection, integrity metrics, workflow automation, and the Parthenon governance framework.

**Tech Stack:** Node.js 18+ / Express, Supabase (PostgreSQL), Anthropic Claude, OpenAI GPT, Perplexity

## Commands

```bash
npm start           # Production server (port 3000)
npm run dev         # Development with nodemon auto-reload
npm test            # Run Jest test suite
npm test -- --watch # Watch mode for tests
npm run lint        # ESLint validation
npm run lint -- --fix # Auto-fix lint issues
```

## Architecture

### Server Structure (`server/`)

**Entry Point:** `server/index.js` (v2.31.0) - Express app with Helmet CSP, CORS, compression, cookie auth

**Routes (31 files in `server/routes/`):**
- `chat.js` - Multi-LLM chat with streaming (SSE)
- `agents.js` - Agent CRUD and execution
- `actions.js` - Parthenon action framework
- `context.js` - Context asset management
- `align120.js`, `strategy120.js`, `execute120.js` - Strategy-to-Execution pipeline
- `skills.js` - Agent skills management
- `briefing.js` - Daily briefing generation
- `workflows.js` - Workflow engine operations

**Services (25 files in `server/services/`):**
- `anthropic.js`, `openai.js`, `perplexity.js` - LLM API wrappers with circuit breaker
- `llmRegistry.js` - Centralized model definitions and capabilities
- `agentService.js` - Agent execution engine
- `contextInjection.js` - Runtime context assembly with token budgeting
- `reliability.js` - Retry logic, circuit breaker (CLOSED → OPEN → HALF_OPEN), timeout wrappers
- `notionService.js` - Notion API integration
- `workflowEngine.js` - YAML/JSON workflow execution

### Frontend (`public/`)

Vanilla JavaScript architecture with 34 HTML pages. Key files:
- `js/chat.js` (46KB) - Multi-model chat UI with streaming
- `js/context.js` (67KB) - Context asset management UI
- `js/navigation.js` - Sidebar and routing
- `css/styles.css` (43KB) - Main stylesheet with theme system

### Database (`db/`)

85+ SQL migration files with progressive schema evolution:
- `schema.sql` - Core tables (users, agents, conversations, messages)
- `phase3-schema.sql` through `phase25-schema.sql` - Feature-specific extensions
- `seed.sql` - Initial data including starter agents

Core tables use Row Level Security (RLS) for multi-tenancy.

### Tests (`__tests__/`)

Jest with 50% coverage threshold. Test structure:
- `unit/` - Service and middleware tests (8 files)
- `integration/` - Route tests (7 files)
- `setup/jest.setup.js` - Test configuration

Run a single test file:
```bash
npm test -- __tests__/unit/services/anthropic.test.js
```

## Key Patterns

### Multi-LLM Orchestration
Models are registered in `llmRegistry.js` with capabilities (vision, streaming, function calling). Services in `anthropic.js`/`openai.js` implement provider-specific logic with automatic fallback.

### Context Injection
`contextInjection.js` assembles runtime context with:
- Token-aware budgeting
- Priority-based ordering
- Conditional injection rules
- ReDoS-safe regex validation

### Reliability
`reliability.js` provides:
- `withRetry()` - Exponential backoff with configurable attempts
- `CircuitBreaker` - Prevents cascade failures
- `withTimeout()` - Request timeout wrapper

### Streaming Responses
Chat uses Server-Sent Events (SSE). Compression middleware skips SSE streams. Frontend handles `data:` events in `public/js/chat.js`.

## Environment Variables

Required in `.env` (see `.env.example`):
```
PORT=3000
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...    # Required for admin operations
ANTHROPIC_API_KEY=...       # At least one LLM key required
OPENAI_API_KEY=...
ALLOWED_ORIGINS=http://localhost:3000
```

Optional: `BRAVE_SEARCH_API_KEY`, `TAVILY_API_KEY`, `PERPLEXITY_API_KEY`, `GOOGLE_API_KEY`

## Database Setup

In Supabase SQL Editor:
1. Run `db/schema.sql`
2. Run phase schemas as needed (`phase3-schema.sql` through `phase25-schema.sql`)
3. Run `db/seed.sql` for starter agents

## Documentation

Versioned blueprints in `documentation/blueprints/` (v2.8 through v3.8). Current version: v3.8 "Chronicle" covering 26 development phases.
