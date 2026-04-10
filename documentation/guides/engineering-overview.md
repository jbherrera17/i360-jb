# Insight 360 — Engineering Overview & Frontend Integration Guide

**Audience:** Frontend engineering team building the new React + Vite client against the existing Insight 360 backend
**Status:** Living document — update in place, do not create dated copies
**Last Updated:** 2026-04-09

---

## How to use this document

You have cloned the Insight 360 repository and are rebuilding the frontend in React + Vite. **The backend is the source of truth.** Your job is to bind a new UI to the existing Express API without weakening the guarantees the backend enforces (multi-tenant isolation, module gating, auth, RLS).

This document is a **reference**, not a tutorial. Read Parts 1–4 end-to-end once (≈30 minutes). After that, use it as a lookup for specific endpoints, contracts, and patterns.

If something here conflicts with code you read in the repo, **trust the code and update this doc**.

---

## Table of Contents

1. [What Insight 360 Is](#1-what-insight-360-is)
2. [What You Are Inheriting](#2-what-you-are-inheriting)
3. [Non-Negotiables](#3-non-negotiables)
4. [System Architecture](#4-system-architecture)
5. [Authentication & Session Model](#5-authentication--session-model)
6. [Multi-Tenancy Contract](#6-multi-tenancy-contract)
7. [Authorization: Tiers, Modules, Roles](#7-authorization-tiers-modules-roles)
8. [API Reference](#8-api-reference)
9. [Server-Sent Events (Streaming Chat)](#9-server-sent-events-streaming-chat)
10. [Data Models](#10-data-models)
11. [Database Reference](#11-database-reference)
12. [Key Feature Subsystems](#12-key-feature-subsystems)
13. [UI/UX Requirements](#13-uiux-requirements)
14. [Recommended React + Vite Architecture](#14-recommended-react--vite-architecture)
15. [Local Development](#15-local-development)
16. [Integration Playbook](#16-integration-playbook)
17. [Testing & Verification](#17-testing--verification)
18. [Deployment & Environments](#18-deployment--environments)
19. [Glossary](#19-glossary)
20. [Appendix: Reference Links](#20-appendix-reference-links)

---

## 1. What Insight 360 Is

Insight 360 (I-360) is a **values-based AI command center and multi-LLM orchestration platform**. It gives organizations a personality-driven AI collaborator that operates within clearly defined values, bright lines, and governance rules.

### The north star
I-360's vision is Apple's 1987 **Knowledge Navigator** — a conversational, agentic AI that knows the organization it works for. Every org gets its own personalized collaborator. **Higgins** is the embodiment of that collaborator; **Soul Config** is the personality engine that defines how it behaves.

### Core concepts (one-liners — full definitions in the [Glossary](#19-glossary))
- **Higgins** — the conversational agent the user talks to
- **Soul Config** — the hierarchical values/voice/bright-lines configuration that defines Higgins' personality for a given org
- **Parthenon** — the governance framework: processes, policies, OKRs, roles
- **Context Assets** — reusable knowledge chunks injected into LLM prompts at runtime
- **Align120 / Strategy120 / Execute120** — the strategy-to-execution pipeline
- **Modules** — feature bundles gated by subscription tier and user role
- **Bright Lines** — immutable rules the AI will never cross
- **Guardrails** — softer, advisory rules the AI should respect
- **SCU Ethics Framework** — Santa Clara University's six ethical lenses used for decision auditing

### Subscription tiers

| Tier | Members | Clients | Agents | Workflows | Key Features |
|---|---|---|---|---|---|
| Starter | 3 | 0 | 5 | 3 | Basic modules only |
| Business | 10 | 0 | 25 | 15 | + Align120, Research Studio, Thought Leadership |
| Enterprise | 100 | 0 | 100 | 50 | + SSO, Priority Support |
| Agency | 50 | 100 | 200 | 100 | + White-label, Client Portal |

### Hierarchy

```
Synergi (Platform Owner)
    └── Organizations (Clients / Agencies)
            ├── Departments
            │       └── Users (with business roles)
            └── Clients (Agency tier only)
```

---

## 2. What You Are Inheriting

- A production Express backend (`server/`) with ~60 route files, ~25 service modules, and a PostgreSQL schema layered across 85+ phase migration files in `db/`
- Supabase for auth, database, and RLS
- Integrations with Anthropic, OpenAI, Perplexity, plus Brave/Tavily/Google search
- A vanilla-JS reference frontend in `public/` — **do not port this**. Use it only as a reference for *intent* (what each screen does, what data it displays, what actions it exposes).
- A full test suite in `__tests__/` (Jest, 50% coverage threshold)
- Design and UX specifications under `documentation/design/` and `documentation/specs/`

**What you are building:** A new React + Vite SPA that binds to this backend. You own everything under your new frontend repo/directory. You do **not** modify `server/`, `db/`, or `public/` except to:
- Add or extend an endpoint (coordinate with the backend team first)
- Fix a bug you discover in the backend (same — coordinate first)

---

## 3. Non-Negotiables

These are backend-enforced guarantees. Your UI must cooperate with all of them. Violating any one of these is a production incident.

1. **Every `/api/*` request carries `Authorization: Bearer <token>` and `x-org-id: <orgId>`.** The only exceptions are `/api/auth/login`, `/api/auth/refresh`, and a small number of public endpoints (documented below).
2. **Org switching clears all cached data.** The user must never see data from a previous org after switching.
3. **The navigation is dynamic.** It is built from `GET /api/modules`, not hardcoded. If a user lacks access to a module, the link must not appear.
4. **Module gating is rendered in the UI but enforced on the server.** Never trust client-side checks alone — the backend will return 403 if the user hits a route they should not access. The UI's job is to hide unreachable features, not to protect them.
5. **Resource limits are real.** When `POST` endpoints return a `limit_exceeded` error, surface it cleanly (e.g., "You've reached your agent limit for the Business tier — upgrade or delete an agent").
6. **SSE streams must be consumed with `fetch` + `ReadableStream`,** not `EventSource`. `EventSource` cannot send `Authorization` or `x-org-id` headers, so it will fail auth on every I-360 streaming endpoint.
7. **Human-First.** Every UX decision starts with "does this make the user's job easier?" If a design adds complexity without reducing user friction, push back.

---

## 4. System Architecture

### High-level flow

```
React + Vite SPA
    │
    │  authFetch (token + x-org-id)
    ▼
Express (server/index.js)
    │  Middleware: auth → orgContext → moduleAccess → resourceLimits
    ▼
Routes (server/routes/*)
    │
    ▼
Services (server/services/*)
    │
    ├──► Supabase (Postgres + RLS)
    ├──► Anthropic / OpenAI / Perplexity (via llmRegistry + circuit breaker)
    └──► External integrations (Notion, Slack, search providers)
```

### Backend layers

- **`server/index.js`** — Express app entry. Helmet CSP, CORS, compression (skips SSE streams), cookie parser, route registration.
- **`server/middleware/`** — Auth, `requireOrgContext`, `moduleAccess`, resource limits.
- **`server/routes/*`** — ~60 route files, one per domain. Each exports a factory `module.exports = function(supabase) { ... return router; }`.
- **`server/services/*`** — Business logic. LLM wrappers, agent execution, context injection, reliability (retry + circuit breaker), Soul config, ethical evaluation, etc.
- **`server/utils/orgScope.js`** — The `scopeToOrg()` helper that enforces org-scoped queries (throws on null orgId — no silent fallbacks).

### Reliability patterns (`server/services/reliability.js`)
- `withRetry()` — exponential backoff
- `CircuitBreaker` — CLOSED → OPEN → HALF_OPEN state machine, prevents cascading LLM failures
- `withTimeout()` — request timeout wrapper

---

## 5. Authentication & Session Model

I-360 uses a **hybrid auth model**: short-lived access token stored in JS, long-lived refresh token stored in an HttpOnly cookie. This is the right pattern for an SPA — do not replace it with pure cookie auth or pure localStorage auth.

### The contract

| Item | Where | Lifetime | How sent |
|---|---|---|---|
| Access token | `localStorage['insight360_token']` | Short (Supabase default ~1h) | `Authorization: Bearer <token>` header on every request |
| Access token expiry | `localStorage['insight360_token_expires_at']` | Matches token | Used by the proactive refresh timer |
| Refresh token | HttpOnly cookie (set by backend on login) | Long | Sent automatically to `/api/auth/refresh` via `credentials: 'include'` |
| Active org | `localStorage['insight360_org_id']` | Until org switch or logout | `x-org-id` header on every request |
| User profile | `localStorage['insight360_user']` | Until logout | Not sent — UI state only |

### Auth endpoints

| Method | Path | Purpose | Auth required |
|---|---|---|---|
| `POST` | `/api/auth/login` | Exchange credentials for access token + refresh cookie | No |
| `POST` | `/api/auth/refresh` | Exchange refresh cookie for new access token | No (uses cookie) |
| `POST` | `/api/auth/logout` | Invalidate refresh cookie, clear session | Yes |
| `GET` | `/api/auth/me` | Current user profile | Yes |

### Refresh flow (required behavior — replicate exactly)

1. On app load, if a token exists in localStorage, schedule a proactive refresh at **80% of remaining TTL** (minimum 30s from now).
2. On every 401 response, call `/api/auth/refresh` **once** (deduplicate concurrent refresh calls — multiple parallel fetches all hitting 401 must share a single in-flight refresh promise).
3. If refresh succeeds, retry the original request with the new token.
4. If refresh fails (or the retry also returns 401), clear `localStorage`, clear the `auth_token` cookie, and redirect to `/login?expired=true`.

The reference implementation in `public/js/auth-fetch.js` is worth reading before you write your React version. It handles all the edge cases (dedup, proactive refresh, redirect loop prevention).

### React implementation guidance

- Put the access token, user, and active org in **React Context**, hydrated from `localStorage` on mount.
- Wrap `fetch` in a single `apiClient.ts` module that injects both headers. Never call raw `fetch` for `/api/*` outside this module.
- Use a **single refresh promise variable** (`let refreshPromise: Promise<boolean> | null`) at module scope to dedupe concurrent refreshes.
- On refresh failure, call a logout function that clears context, clears localStorage, and navigates to `/login` via React Router.
- **React 18 Strict Mode caveat**: the auth bootstrap effect will run twice in dev. Make it idempotent (check `_initialized` flag or use a ref).

---

## 6. Multi-Tenancy Contract

**This is the single most important section of the document.** Cross-org data leakage is a security incident. The backend enforces isolation through `requireOrgContext` middleware, the `scopeToOrg()` utility, and Postgres RLS. Your frontend must cooperate.

### What the frontend must do

1. **Attach `x-org-id` on every `/api/*` request.** No exceptions except the auth endpoints.
2. **Never cache cross-org data in a shared store.** If you use TanStack Query (recommended), include `orgId` in every query key:
   ```ts
   queryKey: ['agents', orgId]        // GOOD
   queryKey: ['agents']                // BAD — will leak across orgs
   ```
3. **On org switch, invalidate all queries.** With TanStack Query: `queryClient.clear()` or `queryClient.invalidateQueries()`. With any other store: clear it.
4. **Re-fetch the user's module list after org switch.** A user may have different module access in different orgs.
5. **Re-fetch the user's role after org switch.** Business roles are per-org.

### What the backend enforces (so you can trust it)

- `requireOrgContext(supabase)` middleware validates that the user is a member of the org in `x-org-id`. If not, 403.
- `scopeToOrg(query, orgId)` **throws** if `orgId` is null. There is no silent "return everything" fallback.
- Postgres RLS policies on every org-scoped table gate reads/writes by `org_id`.
- Ownership validation on `/:id` endpoints: the backend checks that the record belongs to the requesting user's org before returning it.

### Platform admin mode

Synergi platform admins can access cross-org data on explicitly-opted-in routes. These use:
```js
requireOrgContext(supabase, { allowPlatformAdmin: true })
```
The frontend handles this by:
1. Checking `user.isPlatformAdmin` (returned from `/api/auth/me`)
2. Showing a platform admin context switcher in the UI
3. Setting a special `x-org-id` value (or omitting it, depending on the route — see per-route docs)

### The Synergi org

Synergi itself is an org (`org_id: 57234ef8-5a4d-40e7-aec3-ca02e44db9ce`). Platform admins are members of it. When Synergi users work on their own content (not cross-org platform admin tasks), they use the Synergi `x-org-id` like any other org.

### Anti-patterns (never do these)

```js
// BAD: returns all data when orgId is null
if (orgId) query.eq('org_id', orgId);

// BAD: shared cache across orgs
useQuery({ queryKey: ['agents'], queryFn: fetchAgents });

// BAD: raw fetch without auth
fetch('/api/agents');

// BAD: storing orgId in a prop-drilled variable that stays stale after switch
const [orgId] = useState(localStorage.getItem('insight360_org_id'));
```

---

## 7. Authorization: Tiers, Modules, Roles

I-360 has three overlapping authorization dimensions. The UI must respect all three.

### Dimension 1: Subscription tier
Determines resource limits and which modules are available **at all**. See the tier table in §1.

### Dimension 2: Module access
A module is a feature bundle (e.g., `research_studio`, `align120`, `thought_leadership`). Access depends on:
- Tier minimum (`min_tier` on `platform_modules`)
- Role-to-module mapping (`role_module_access`)
- Per-org overrides (`org_module_access`)
- A-la-carte purchases (`org_module_purchases`, Phase 57)

### Dimension 3: Business role
Roles include: `executive`, `director`, `manager`, `supervisor`, and others. Assigned per-org via `organization_members`.

### How the UI gets the answer

**Do not reimplement the gating logic.** Call the backend:

- `GET /api/modules` — returns the list of modules the current user can access in the current org, with metadata (`id`, `name`, `description`, `icon`, `route_path`, `nav_group`, `display_order`). **Build the navigation from this response.**
- `GET /api/auth/me` — returns the user, their role, their platform admin status, and their active org context.
- Backend middleware `requireModule('module_id')` returns 403 if the user tries to access a module they lack. Your UI's job is to not show the link in the first place.

### Recommended React wrappers

Create guard components that mirror the backend middleware:

```tsx
<RequireModule moduleId="research_studio">
  <ResearchStudioPage />
</RequireModule>

<RequireTier minTier="business">
  <Align120Page />
</RequireTier>

<RequirePlatformAdmin>
  <PlatformAdminDashboard />
</RequirePlatformAdmin>
```

These guards check against the module list and user profile cached in context. On miss, they render a "not available in your plan" state — never a raw 403.

### Resource limits

Some `POST` endpoints enforce limits (e.g., creating an agent when the org has hit its cap). When the backend returns a limit-exceeded error, the UI should show:
- What the limit is (e.g., "Starter tier allows 5 agents")
- How to resolve it (upgrade, delete, contact sales)
- A clear CTA

Never show a generic "request failed" for a limit error.

---

## 8. API Reference

The API is grouped by domain. All routes are prefixed with `/api/`. All require `Authorization` + `x-org-id` unless noted. All responses are JSON unless noted (SSE streams use `text/event-stream`).

### Response envelope

Most endpoints use this shape (verify per-route — some return raw data):

```json
{
  "success": true,
  "data": { /* payload */ }
}
```

Errors:

```json
{
  "success": false,
  "error": "Human-readable message",
  "code": "ERROR_CODE"
}
```

Common error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `LIMIT_EXCEEDED`, `MODULE_NOT_ACCESSIBLE`, `INTERNAL_ERROR`.

### Route catalog (by domain)

**Authentication & user identity**
- `server/routes/auth.js` → `/api/auth/*` (login, refresh, logout, me)
- `server/routes/user-profile.js` → `/api/user-profile/*`
- `server/routes/users.js` → `/api/users/*`
- `server/routes/org-members.js` → `/api/org-members/*`

**Organizations & hierarchy**
- `server/routes/organizations.js` → `/api/organizations/*`
- `server/routes/departments.js` → `/api/departments/*`
- `server/routes/business-roles.js` → `/api/business-roles/*`
- `server/routes/department-roles.js` → `/api/department-roles/*`
- `server/routes/clients.js` → `/api/clients/*` (Agency tier)
- `server/routes/clientPortal.js` → `/api/client-portal/*`

**Agents & chat**
- `server/routes/agents.js` → `/api/agents/*` (CRUD, execution, department assignment)
- `server/routes/chat.js` → `/api/chat/*` (streaming via SSE)
- `server/routes/conversations.js` → `/api/conversations/*`
- `server/routes/conversationReview.js` → `/api/conversation-review/*`
- `server/routes/model-availability.js` → `/api/model-availability/*`

**Context & knowledge**
- `server/routes/context.js` → `/api/context/*` (context assets)
- `server/routes/injection.js` → `/api/injection/*` (context injection rules)
- `server/routes/tags.js` → `/api/tags/*`

**Parthenon (governance)**
- `server/routes/parthenon.js` → `/api/parthenon/*` (processes, policies, OKRs, roles)
- `server/routes/governance.js` → `/api/governance/*`
- `server/routes/integrity.js` → `/api/integrity/*`

**Soul configuration & ethics**
- `server/routes/soulConfig.js` → `/api/soul-config/*` (config, versions, SCU lenses, values alignment)

**Strategy-to-execution pipeline**
- `server/routes/align120.js` → `/api/align120/*`
- `server/routes/strategy120.js` → `/api/strategy120/*`
- `server/routes/execute120.js` → `/api/execute120/*`
- `server/routes/s2e.js` → `/api/s2e/*`
- `server/routes/department-strategy.js` → `/api/department-strategy/*`

**Workflows & actions**
- `server/routes/workflows.js` → `/api/workflows/*`
- `server/routes/actions.js` → `/api/actions/*` (Parthenon action framework)
- `server/routes/easyStart.js` → `/api/easy-start/*`

**Modules, tiers, platform admin**
- `server/routes/modules.js` → `/api/modules` (dynamic nav)
- `server/routes/platformAdmin.js` → `/api/platform/*` (Synergi only)
- `server/routes/pricing.js` → `/api/pricing/*`
- `server/routes/resourceAccess.js` → `/api/resource-access/*`
- `server/routes/roleAudit.js` → `/api/role-audit/*`

**Content generation & media**
- `server/routes/blog.js` → `/api/blog/*`
- `server/routes/thought-leadership.js` → `/api/thought-leadership/*`
- `server/routes/researchStudio.js` → `/api/research-studio/*`
- `server/routes/social-publish.js` → `/api/social-publish/*`
- `server/routes/digest.js` → `/api/digest/*`
- `server/routes/visualizations.js` → `/api/visualizations/*`
- `server/routes/prompts.js` → `/api/prompts/*`

**Integrations & external**
- `server/routes/connections.js` → `/api/connections/*`
- `server/routes/integrations.js` → `/api/integrations/*`
- `server/routes/oauth.js` → `/api/oauth/*`
- `server/routes/mcp.js` / `platformMcp.js` → `/api/mcp/*`
- `server/routes/openBrain.js` → `/api/open-brain/*`
- `server/routes/webhooks.js` → `/api/webhooks/*`
- `server/routes/synerginexus.js` → `/api/synerginexus/*`

**Widgets & embeds**
- `server/routes/widgets.js` → `/api/widgets/*`
- `server/routes/widgetChat.js` → `/api/widget-chat/*` (public, tenant-scoped via widget token)

**Onboarding & admin**
- `server/routes/onboarding.js` → `/api/onboarding/*`
- `server/routes/orgCustomization.js` → `/api/org-customization/*`
- `server/routes/agencyAnalytics.js` → `/api/agency-analytics/*`

**Support & ops**
- `server/routes/support.js` → `/api/support/*`
- `server/routes/supportActions.js` → `/api/support-actions/*`
- `server/routes/bugs.js` → `/api/bugs/*`
- `server/routes/briefing.js` → `/api/briefing/*`
- `server/routes/artifacts.js` → `/api/artifacts/*`
- `server/routes/skills.js` → `/api/skills/*`
- `server/routes/health.js` → `/api/health` (public)
- `server/routes/health-stream.js` → `/api/health/stream` (SSE)
- `server/routes/docs.js` → `/api/docs/*` (user guide markdown, whitelisted)

### How to learn a specific endpoint

Each route file is readable in 5–10 minutes. When you need the exact contract for an endpoint:
1. Open `server/routes/<file>.js`
2. Find the handler for the HTTP verb + path
3. Read what middleware it uses (`requireOrgContext`, `requireModule`, `checkResourceLimit`)
4. Read what it pulls from `req.body` / `req.query` / `req.params`
5. Read the service it calls in `server/services/`
6. Read what it returns

**This is the authoritative source.** Do not rely on hand-written API docs that may drift.

---

## 9. Server-Sent Events (Streaming Chat)

Chat responses stream from the backend via SSE. This is the single most error-prone part of the frontend rewrite. Read this section carefully.

### Why not `EventSource`?

`EventSource` is the "obvious" API for SSE, but it **cannot send custom headers** — no `Authorization`, no `x-org-id`. It also can't `POST`. It is unusable for I-360's streaming endpoints.

**Use `fetch` with a `ReadableStream` reader instead.**

### Server contract

- Endpoint: `POST /api/chat/stream` (and similar streaming endpoints on other routes)
- Request: normal JSON body
- Response: `Content-Type: text/event-stream`
- Compression: **the backend skips compression for SSE** (don't override `Accept-Encoding` on the client — just consume the stream)
- Event format: lines prefixed with `data: ` followed by a JSON payload, terminated by `\n\n`
- End of stream: either a `data: [DONE]` sentinel, or connection close — check the specific route

### React hook pattern

```ts
// useChatStream.ts
import { useCallback, useRef, useState } from 'react';
import { apiClient } from '@/lib/api/client';

export function useChatStream() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (body: ChatRequest) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);

    try {
      const response = await apiClient.fetch('/api/chat/stream', {
        method: 'POST',
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Stream failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') {
            setIsStreaming(false);
            return;
          }
          try {
            const event = JSON.parse(payload);
            // Dispatch to your message state
            handleStreamEvent(event, setMessages);
          } catch {
            // Malformed chunk — log and continue
          }
        }
      }
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return { messages, isStreaming, sendMessage, stop };
}
```

### Gotchas

- **Strict Mode double-mount**: wrap the stream start in a ref guard or only fire in response to user action, never as a mount effect, or you will open two streams in dev.
- **AbortController on unmount**: always abort the stream in a cleanup effect or when the user navigates away.
- **Buffer across chunks**: an SSE event may be split across multiple `reader.read()` chunks. The buffer-and-split pattern above handles this.
- **Token refresh mid-stream**: if the token expires during a long stream, the stream does not auto-refresh. Handle the specific error event from the backend and restart if needed.

---

## 10. Data Models

The backend does not publish TypeScript types. You will need to maintain your own `src/types/api.ts` file, matching the shapes returned by the API. Here are the major entities and their essential fields. Treat this as a starting point — verify against actual responses.

### User

```ts
interface User {
  id: string;                    // UUID
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  is_platform_admin: boolean;
  default_org_id?: string;
  created_at: string;             // ISO
}
```

### Organization

```ts
interface Organization {
  id: string;
  name: string;
  slug: string;
  tier: 'starter' | 'business' | 'enterprise' | 'agency';
  parent_org_id?: string;         // For agency → client relationships
  logo_url?: string;
  created_at: string;
}
```

### Department

```ts
interface Department {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}
```

### Agent

```ts
interface Agent {
  id: string;
  org_id: string;
  name: string;
  description: string;
  system_prompt: string;
  model: string;                  // e.g., 'claude-sonnet-4-6'
  provider: 'anthropic' | 'openai' | 'perplexity';
  temperature: number;
  max_tokens: number;
  department_ids: string[];       // Many-to-many via department_agents junction
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**Note:** Agents use the `department_agents` junction table — they are NOT linked via a direct `department_id` column. Most endpoints return `department_ids` as an array.

### Context Asset

```ts
interface ContextAsset {
  id: string;
  org_id: string;
  title: string;
  content_text: string;
  asset_type: 'document' | 'url' | 'snippet' | 'dataset' | string;
  tags: string[];
  token_count: number;
  is_active: boolean;
  created_at: string;
}
```

### Module (for navigation)

```ts
interface PlatformModule {
  id: string;                     // e.g., 'research_studio'
  name: string;                   // Display name
  description: string;
  icon: string;                   // Lucide icon name
  category: string;
  min_tier: 'starter' | 'business' | 'enterprise' | 'agency';
  is_active: boolean;
  is_beta: boolean;
  route_path: string;             // e.g., '/research-studio'
  nav_group: string;              // e.g., 'Strategy', 'Governance'
  display_order: number;
}
```

### Conversation & Message

```ts
interface Conversation {
  id: string;
  org_id: string;
  agent_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  token_count?: number;
  created_at: string;
}
```

### Soul Configuration

```ts
interface SoulConfig {
  id: string;
  scope: 'platform' | 'organization' | 'department' | 'agent';
  scope_id: string;
  parent_id?: string;
  identity: { ... };
  core_values: { ... };
  bright_lines: string[];
  guardrails: string[];
  voice: { ... };
  domain: { ... };
  stakeholders: { ... };
  escalation: { ... };
  completeness_score: number;     // 0–100
  version: number;
  created_at: string;
  updated_at: string;
}
```

See `server/services/soulConfigService.js` for the full shape and inheritance resolution logic.

### Parthenon entities

```ts
interface Process {
  id: string;
  department_id: string;          // Scoped via department, NOT directly via org_id
  name: string;
  description: string;
  steps: ProcessStep[];
  is_active: boolean;
}

interface OKR {
  id: string;
  org_id: string;
  department_id?: string;
  objective: string;
  key_results: KeyResult[];
  quarter: string;
  status: string;
}
```

**Scoping note:** `processes` and some Parthenon tables do NOT have an `org_id` column. They scope via `department_id` → `departments.org_id`. The backend handles this — the frontend just consumes the API responses.

---

## 11. Database Reference

You will not access the database directly. The backend is the only safe entry point (RLS enforces this). But understanding the schema helps you understand API responses.

### How the schema is organized

- `db/schema.sql` — core tables (users, orgs, agents, conversations, messages)
- `db/phase3-schema.sql` … `db/phase82-*.sql` — layered feature additions
- `db/seed.sql` — initial data (starter agents, default modules)

Current phase: **Phase 82+** (tenant isolation hardening, in progress). The blueprint lists all phases — see `documentation/blueprints/I360-Blueprint-CURRENT.md`.

### Key phase files to know

| File | What it adds |
|---|---|
| `db/schema.sql` | Core auth, orgs, agents, chat |
| `db/phase44-enterprise-multitenancy.sql` | Tiers, modules, platform admins, module access |
| `db/phase54-soul-configuration.sql` | Soul config hierarchy, SCU ethics, values alignment |
| `db/phase57-*.sql` | A-la-carte module purchases |
| `db/phase82-*.sql` | Tenant isolation hardening |

### Helper functions (called by the backend, not the frontend)

- `can_access_module(user_id, module_id, org_id)` → boolean
- `get_user_modules(user_id, org_id)` → module list (this powers `GET /api/modules`)
- `check_org_limits(org_id, resource_type)` → limit check
- `is_platform_admin(user_id)` → boolean

### RLS model

Every org-scoped table has an RLS policy that requires the requesting user to be a member of the org. Platform admins have a bypass path on explicitly-opted-in tables. This is why:
- The backend **must** use `scopeToOrg()` and `requireOrgContext` — without them, the query runs with an anon key and returns nothing
- The frontend **never** talks to Supabase directly with user-scoped data

### Gotchas

- **Soul completeness race**: the `calculate_soul_completeness` trigger reads the OLD row in a BEFORE trigger, so completeness is one update behind. The backend works around this with a dummy second update. If you see completeness that looks stale after an edit, it's this.
- **Junction tables**: `department_agents`, `org_module_access`, `role_module_access`, `org_module_purchases`.
- **zsh URL quoting**: if you're hitting the API from the command line with query params, quote the URL — unquoted `?limit=100` breaks in zsh.

---

## 12. Key Feature Subsystems

### Higgins (chat)
The main conversational surface. Multi-LLM, streaming, model selection, context injection, automatic fallback on provider failure. Backed by `/api/chat/*` and `server/routes/chat.js`. Context is assembled at runtime by `contextInjection.js` with token-aware budgeting.

### Agents
CRUD + execution. Agents are assigned to one or more departments via the `department_agents` junction table. Created at `/api/agents/*`. See `server/services/agentService.js`.

### Context Assets
Reusable knowledge chunks with tags, types, and token counts. Injected into prompts at runtime based on rules in `injection.js`. Create/manage at `/api/context/*`.

### Parthenon (governance)
- **Processes** — step-by-step workflows, department-scoped
- **Policies** — rules and constraints
- **OKRs** — objectives and key results
- **Roles** — role definitions within departments

All managed through `/api/parthenon/*`. Cross-references: Context Assets can point to policies, agents can be assigned to processes, Soul Config guardrails can reference policies.

### Soul Configuration & SCU Ethics
Hierarchical personality/values config: **Platform (Synergi, immutable) → Organization → Department → Agent**. Each level inherits from its parent and can override specific fields. Completeness is scored 0–100 across 8 sections.

The **SCU Ethics Framework** adds six ethical lenses (Rights, Justice, Utilitarian, Common Good, Virtue, Care Ethics) used for decision auditing when the agent faces high-stakes choices. See `server/services/ethicalContextService.js`.

### Align120 / Strategy120 / Execute120
The strategy-to-execution pipeline. Align120 captures alignment (mission, values, OKRs), Strategy120 defines the plan, Execute120 tracks the work. Gated behind Business tier+.

### Workflows Engine
YAML/JSON workflows executed by `workflowEngine.js`. Supports multi-step agent orchestration with conditional branching.

### Skills
Reusable agent capabilities. Managed via `/api/skills/*`. Skills can be assigned to agents and invoked during execution.

### Briefings
Scheduled, org-scoped summaries generated by `/api/briefing/*`. Used for daily executive briefings.

### Research Studio
Deep research mode with multi-source search (Brave, Tavily, Perplexity, Google). Business tier+.

### Thought Leadership & Blog
Content generation pipelines. Business tier+.

### Widgets
Embeddable chat widgets for customer-facing use (e.g., Annie). Scoped by widget token, not user auth. `/api/widget-chat/*`.

---

## 13. UI/UX Requirements

These are **specifications of intent**, not CSS to copy. The new frontend should honor the principles below and use the existing design system spec (`documentation/design/design-system-specification.md`) as the source of truth for visual language.

### Design principles (must survive the rewrite)

1. **Human-First** — every decision starts with "does this make the user's job easier?"
2. **Workflow-first, not feature-first** — organize pages by what the user is trying to do next, not by system capability. Lead with the current task, one primary CTA, results inline, config secondary.
3. **Direct navigation / deep linking** — always link users to the exact tab/filter where they can act. Never dump them at a generic page.
4. **No stub buttons** — every button must be functional. If we know what it should do, implement it. Never ship "coming soon" for known behavior.
5. **Structured display formatting** — never dump unstyled raw markdown, concatenated lists, or CSS classes with no styles. All dynamic content must be properly formatted.
6. **Visual consistency in multi-step flows** — wizards must use the same card/input pattern for all steps. Never mix styled cards with unstyled inline elements.
7. **Unmistakable loading states** — skeleton loaders, spinners, or progress bars. Never leave a dead UI.
8. **Image preview first, markdown rendered** — content generation flows show the rendered output, not the raw prompt or source.
9. **Actionable quality gates** — when a quality check fails, tell the user *what* to do about it.
10. **Lucide icons only, no emojis** in UI chrome (emojis are fine in user-generated content).

### Knowledge Navigator vision (the design north star)

Higgins should feel like a collaborator, not a chatbot. This means:
- **Voice-first** interaction where appropriate
- **Live 3D avatar** (planned — see Higgins 2.0 design decisions)
- **Multi-modal artifact composition** — text, images, charts, documents in one response
- **Floating card-based panels**, not fixed sidebars
- **Personality-driven** responses shaped by Soul Config

The design system spec (7 parts) is at `documentation/design/design-system-specification.md`. Read Part 1 (Foundations) first.

### Required screens (minimum viable v1)

These are the screens the new frontend must ship. Map each to your wireframe and the API endpoints it needs.

| Screen | Purpose | Key endpoints |
|---|---|---|
| **Login** | Auth | `POST /api/auth/login` |
| **Higgins Chat** | Main conversational surface | `POST /api/chat/stream`, `GET /api/conversations`, `GET /api/agents` |
| **Agents** | List, create, edit agents | `/api/agents/*` |
| **Context Assets** | Knowledge management | `/api/context/*` |
| **Parthenon** | Governance (processes, policies, OKRs, roles) | `/api/parthenon/*` |
| **Soul Configuration** | Values, voice, bright lines, guardrails (wizard + management) | `/api/soul-config/*` |
| **Modules / Navigation** | Dynamic nav, driven by user's module access | `GET /api/modules` |
| **Organizations** | Org switcher, member management | `/api/organizations/*`, `/api/org-members/*` |
| **Onboarding** | Two-phase: wizard (platform admin) → checklist (client admin) | `/api/onboarding/*`, `/api/soul-config/*` |
| **Administrator dashboard** | Tiles for every admin-managed page | Multiple — see existing `public/administrator.html` for the reference set |
| **Platform admin** | Synergi-only: tiers, modules, orgs | `/api/platform/*` |

### Onboarding flow (two-phase)

- **Phase 1 — Wizard (platform admin creates a new org)**: 7-step Soul Config wizard. Reference: `public/soul-wizard.html`. Each step must use the same card pattern.
- **Phase 2 — Checklist (client admin onboards their team)**: grouped by priority (Required / Recommended / Optional). Reference: `public/onboarding-checklist.html` (or equivalent).

### Reference documents (read these)

- `documentation/design/design-system-specification.md` — visual language, components, tokens
- `documentation/design/ui-specification-v1.md` — current production UI spec
- `documentation/design/ui-ux-principles.md` — the principles above, with examples
- `public/administrator.html` — reference for the admin tile layout
- `public/soul-wizard.html` — reference for the Soul Config wizard flow

**Use these for intent, not for code.** The new React implementation should express the same ideas in idiomatic React + your chosen component library.

---

## 14. Recommended React + Vite Architecture

This is a **recommendation**, not a mandate. Adjust to your team's preferences, but the patterns here are tuned to I-360's specific constraints.

### Stack

- **React 18** + **Vite 5**
- **TypeScript** (non-negotiable for a multi-tenant app — you want type safety on org IDs and module gates)
- **React Router v6** — data router mode for loader-based data fetching
- **TanStack Query (React Query) v5** — server state, org-scoped cache keys
- **Zustand** (or Jotai) — client state (sidebar open, theme, modal state)
- **Tailwind CSS** or **CSS Modules** — your call, but be consistent
- **Radix UI** or **shadcn/ui** — accessible primitives for modals, dropdowns, tooltips
- **Lucide React** — icons (mandatory, to match the rest of I-360)
- **Vitest** + **React Testing Library** + **MSW** — testing

### Folder structure

```
src/
  lib/
    api/
      client.ts            # apiClient.fetch() — the single chokepoint
      auth.ts              # login, refresh, logout
      types.ts             # shared API types
      endpoints/           # one file per domain, typed wrappers
        agents.ts
        chat.ts
        parthenon.ts
        soulConfig.ts
        modules.ts
        ...
    auth/
      AuthContext.tsx      # user, token, refresh
      OrgContext.tsx       # active org, modules, switch
      guards.tsx           # RequireModule, RequireTier, RequirePlatformAdmin
    hooks/
      useChatStream.ts     # SSE consumer
      useModules.ts        # wraps the modules query
      useOrgSwitch.ts
  features/
    chat/
      HiggingsChat.tsx
      MessageList.tsx
      Composer.tsx
    agents/
      AgentsList.tsx
      AgentEditor.tsx
    context/
    parthenon/
    soul/
    onboarding/
    platform-admin/
  components/
    ui/                    # primitives (Button, Modal, Toast, ...)
    layout/                # AppShell, Sidebar, Header
  routes/                  # React Router route config
  types/
    api.ts                 # all API entity types
  App.tsx
  main.tsx
```

### The `apiClient` pattern

This is the single most important file in your frontend. It enforces the multi-tenant contract.

```ts
// src/lib/api/client.ts
const TOKEN_KEY = 'insight360_token';
const ORG_ID_KEY = 'insight360_org_id';
const EXPIRY_KEY = 'insight360_token_expires_at';

let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.success || !data.access_token) return false;
    localStorage.setItem(TOKEN_KEY, data.access_token);
    if (data.expires_at) localStorage.setItem(EXPIRY_KEY, String(data.expires_at));
    return true;
  } catch {
    return false;
  }
}

function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export const apiClient = {
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      redirectToLogin();
      throw new Error('Not authenticated');
    }

    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('Authorization', `Bearer ${token}`);

    const orgId = localStorage.getItem(ORG_ID_KEY);
    if (orgId) headers.set('x-org-id', orgId);

    let response = await fetch(url, { ...options, headers, credentials: 'include' });

    if (response.status === 401) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        const newToken = localStorage.getItem(TOKEN_KEY)!;
        headers.set('Authorization', `Bearer ${newToken}`);
        response = await fetch(url, { ...options, headers, credentials: 'include' });
      }
      if (response.status === 401) {
        redirectToLogin();
        throw new Error('Session expired');
      }
    }

    return response;
  },

  async json<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await this.fetch(url, options);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiError(err.error || 'Request failed', res.status, err.code);
    }
    return res.json();
  },
};

function redirectToLogin() {
  if (window.location.pathname.includes('/login')) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  localStorage.removeItem('insight360_user');
  window.location.href = '/login?expired=true';
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}
```

### TanStack Query with org-scoped keys

```ts
// src/lib/api/endpoints/agents.ts
import { apiClient } from '../client';
import { useQuery } from '@tanstack/react-query';
import { useActiveOrg } from '@/lib/auth/OrgContext';

export function useAgents() {
  const orgId = useActiveOrg();
  return useQuery({
    queryKey: ['agents', orgId],           // <-- org in the key
    queryFn: () => apiClient.json<{ data: Agent[] }>('/api/agents'),
    enabled: !!orgId,
  });
}
```

On org switch:

```ts
// src/lib/hooks/useOrgSwitch.ts
export function useOrgSwitch() {
  const queryClient = useQueryClient();
  return (newOrgId: string) => {
    localStorage.setItem('insight360_org_id', newOrgId);
    queryClient.clear();                    // <-- nuke all cached data
    // Re-fetch modules + user profile, then navigate
  };
}
```

### Route guards

```tsx
// src/lib/auth/guards.tsx
export function RequireModule({ moduleId, children }: { moduleId: string; children: ReactNode }) {
  const { modules, isLoading } = useModules();
  if (isLoading) return <FullPageLoader />;
  if (!modules.some(m => m.id === moduleId)) return <ModuleNotAvailable />;
  return <>{children}</>;
}

export function RequirePlatformAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user?.is_platform_admin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
```

### Dynamic navigation

```tsx
// src/components/layout/Sidebar.tsx
export function Sidebar() {
  const { data: modules } = useModules();                      // GET /api/modules
  const grouped = groupBy(modules ?? [], m => m.nav_group);

  return (
    <aside>
      {Object.entries(grouped).map(([group, items]) => (
        <NavGroup key={group} title={group}>
          {items.sort((a, b) => a.display_order - b.display_order).map(m => (
            <NavLink key={m.id} to={m.route_path} icon={m.icon}>{m.name}</NavLink>
          ))}
        </NavGroup>
      ))}
    </aside>
  );
}
```

**Never hardcode the navigation.** It breaks the tier/module/role model.

### Vite config (dev proxy to Express backend)

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // SSE support — do NOT set secure: false or buffer responses
      },
    },
  },
});
```

This lets you run `npm run dev` in the frontend and the Express backend separately, and avoid CORS during development. In production, either deploy same-origin or configure `ALLOWED_ORIGINS` on the backend.

### Environment variables

```bash
# .env.development
VITE_API_BASE_URL=/api         # proxied by Vite dev server

# .env.production
VITE_API_BASE_URL=/api         # same-origin deploy
```

Use `import.meta.env.VITE_API_BASE_URL` in code.

---

## 15. Local Development

### Prerequisites
- Node.js 18+
- Access to the shared Supabase project (or a local Supabase instance seeded from `db/`)
- LLM API keys (at least Anthropic or OpenAI)

### Backend setup (from the cloned repo)

```bash
cd insight-360
cp .env.example .env          # fill in keys
npm ci                        # NOT npm install — see gotcha below
npm run dev                   # starts Express on port 3000 with nodemon
```

**Gotcha — server hangs on startup:** if `npm run dev` prints the env line but never finishes loading, it's almost always stale `node_modules`. Fix: `rm -rf node_modules && npm ci`. Do not debug individual requires — go straight to `npm ci`.

### Database bootstrap

In Supabase SQL Editor, in order:
1. `db/schema.sql`
2. Phase files you need (at minimum: `phase44`, `phase54`, current phase)
3. `db/seed.sql`

### Frontend setup (your new React repo)

```bash
cd insight-360-frontend            # or whatever you call it
npm install
npm run dev                         # Vite dev server, typically port 5173
```

With the Vite proxy configured, `/api/*` from the frontend hits the Express backend on port 3000.

### Seeded test IDs (use these for local dev)

| Entity | ID |
|---|---|
| Synergi org | `57234ef8-5a4d-40e7-aec3-ca02e44db9ce` |
| James's Workspace (starter) | `79e4d3bc-2b40-4412-bf63-cdbbb195c412` |
| HealthyLifeCoach (agency) | `0c181115-41b8-4651-9a9f-b7d716a9bd4d` |
| Primary user | `71fb8dfe-7469-4540-9a58-b96caa638da4` |

Department IDs are in the project memory — ask the backend team if you need them.

---

## 16. Integration Playbook

The highest-leverage section of this doc. **For every screen in your wireframe, follow this recipe.**

### Step-by-step: binding a wireframe screen to the backend

1. **Identify the screen** in the wireframe. What is the user trying to do?
2. **Find the matching endpoint(s)** in the [Route Catalog](#route-catalog-by-domain). Open the route file and read the handler.
3. **Confirm auth & gating**:
   - Does it use `requireOrgContext`? (Almost certainly yes.)
   - Does it use `requireModule('...')`? If yes, wrap the screen in `<RequireModule>`.
   - Does it use `checkResourceLimit`? If yes, handle the `LIMIT_EXCEEDED` error.
4. **Type the request and response.** Add to `src/types/api.ts`.
5. **Write a typed endpoint wrapper** in `src/lib/api/endpoints/<domain>.ts`.
6. **Write a TanStack Query hook** with `orgId` in the query key.
7. **Handle all four states** in the UI:
   - Loading (skeleton or spinner)
   - Empty (no data, with a CTA to create)
   - Error (typed — distinguish auth, limit, validation, generic)
   - Data (the happy path)
8. **Test with a non-platform-admin user in a non-Synergi org.** This is the only way to catch tenant isolation bugs.
9. **Verify the nav link** for this screen comes from `/api/modules`, not hardcoded.
10. **Add E2E test** hitting the route with a real token (see §17).

### What to do when the backend is missing something

1. **Do not work around it in the frontend.** (No hardcoded data, no parallel data fetching from Supabase directly, no mock responses.)
2. **File a request** with the backend team describing what you need and why.
3. **Coordinate on the API contract** before implementation — request shape, response shape, error cases.
4. **Pair on the first call** from frontend to the new endpoint to catch mismatches early.

### Common pitfalls

- ❌ Raw `fetch` without `apiClient` → missing auth, missing org context
- ❌ Query key without `orgId` → cross-org data leakage after switch
- ❌ Hardcoded nav → breaks tier/module/role model
- ❌ `EventSource` for chat streaming → can't send auth headers
- ❌ Ignoring `LIMIT_EXCEEDED` → generic "request failed" error
- ❌ Storing the token in a React state variable only → lost on refresh
- ❌ Not debouncing org switch → race condition with in-flight requests
- ❌ Trusting client-side gating alone → user hits 403 on a route that shouldn't be reachable

---

## 17. Testing & Verification

### Unit tests (Vitest + React Testing Library)
- Component rendering
- Hook behavior (including `useChatStream` — mock `fetch` with a ReadableStream)
- Guard components (RequireModule, RequireTier)

### Integration tests (MSW)
- Mock `/api/*` responses at the network level
- Test full user flows (login → switch org → create agent → chat)
- **Required test: org switching clears cached data.** Create an agent in org A, switch to org B, verify org A's agents are NOT in the cache.

### E2E tests
- Use Playwright or Cypress against a real backend
- At minimum: login, dynamic navigation, create an agent, start a chat, stream a response, switch org, verify isolation

### Multi-tenant verification checklist
Before shipping any feature:
- [ ] Tested as a non-platform-admin in a non-Synergi org
- [ ] Switching orgs shows completely different data
- [ ] Module gates hide unreachable features
- [ ] Resource limits surface clearly
- [ ] SSE streams abort on unmount

---

## 18. Deployment & Environments

### Backend
- **Railway deploys from `develop` branch.** Push to `develop` = push to production.
- `main` is stale (Phase 3 era) — historical only.
- Every backend merge to `develop` requires a **GO verdict from pm-release-coord (Jordan)**. Patch Review (Tier 1) for small fixes; Full Launch Readiness (Tier 2) for anything user-facing.

### Frontend (your new repo)
- Coordinate deployment strategy with the backend team
- Options: same-origin (serve the built Vite bundle from Express), separate Vercel deploy with `ALLOWED_ORIGINS` configured on the backend, or CDN + API proxy
- Environment variables: `VITE_API_BASE_URL` — set per environment

### Deployment verification (mandatory post-deploy)
1. Wait for deployment status = success
2. Test the live URL, not local
3. Verify at least one full user flow end-to-end (login → chat → message → logout)
4. Verify at least one non-chat flow (create an agent, edit a context asset)
5. Verify module gating still works for a non-admin user

### Coordination on API changes
The backend ships fast. To avoid breaking the frontend:
- Backend team notifies frontend before changing any endpoint
- Additive changes (new fields, new endpoints) are safe
- Breaking changes (renamed fields, removed endpoints) require a coordination window
- Frontend should be defensive: unknown fields are ignored, missing optional fields are handled

---

## 19. Glossary

- **Higgins** — The conversational AI surface. The voice of I-360 for the user.
- **Parthenon** — The governance framework: processes, policies, OKRs, roles. Named after the pillars of the Greek temple — each pillar holds up the org.
- **Soul Config** — Hierarchical values/voice/bright-lines/guardrails configuration. Defines the personality of Higgins for a given org.
- **Bright Lines** — Immutable rules the AI will never cross (e.g., "never recommend medical dosages"). Enforced at Platform level by Synergi.
- **Guardrails** — Softer, advisory rules. "Prefer this, avoid that."
- **SCU Ethics Framework** — Santa Clara University Markkula Center for Applied Ethics framework with six lenses: Rights, Justice, Utilitarian, Common Good, Virtue, Care Ethics. Used for high-stakes decision auditing.
- **Context Assets** — Reusable knowledge chunks (documents, URLs, snippets, datasets) injected into prompts at runtime.
- **Align120** — The 120-day alignment process: define mission, values, OKRs.
- **Strategy120** — The 120-day strategy process: plan how to hit the OKRs.
- **Execute120** — The 120-day execution tracking: did we do it?
- **S2E** — Strategy to Execution (the pipeline connecting Align → Strategy → Execute).
- **Modules** — Feature bundles gated by tier + role + per-org overrides.
- **Platform Admin** — Synergi-only super-admin. Can access cross-org data on opted-in routes.
- **Tier** — Subscription level: Starter, Business, Enterprise, Agency.
- **Business Role** — User role within an org: executive, director, manager, supervisor, etc.
- **RLS** — Row-Level Security. Postgres feature that gates row access by policy.
- **scopeToOrg()** — Backend utility that enforces `org_id` on every query. Throws on null.
- **authFetch** — The vanilla-JS reference implementation of the auth-aware fetch in `public/js/auth-fetch.js`.
- **Knowledge Navigator** — Apple's 1987 conceptual video of a conversational AI collaborator. I-360's north star.

---

## 20. Appendix: Reference Links

### Must-read code (in priority order)
1. `public/js/auth-fetch.js` — the auth contract, in one file
2. `server/index.js` — the middleware pipeline and route registration
3. `server/middleware/orgContext.js` — the multi-tenant enforcement
4. `server/utils/orgScope.js` — `scopeToOrg()` helper
5. `server/routes/auth.js` — login/refresh/logout/me
6. `server/routes/modules.js` — dynamic navigation source
7. `server/routes/chat.js` — streaming chat contract
8. `server/services/llmRegistry.js` — LLM provider registry
9. `server/services/contextInjection.js` — runtime context assembly
10. `server/services/soulConfigService.js` — Soul Config inheritance

### Must-read documentation
- `CLAUDE.md` — project conventions, engineering processes, frontend guidelines, integration checklists
- `documentation/blueprints/I360-Blueprint-CURRENT.md` — living blueprint, current phase
- `documentation/roadmap/I360-ROADMAP-CURRENT.md` — living roadmap
- `documentation/design/design-system-specification.md` — visual language (7 parts)
- `documentation/design/ui-specification-v1.md` — current production UI spec
- `documentation/design/ui-ux-principles.md` — design principles with examples
- `documentation/release-notes/` — recent release notes

### Reference pages (in `public/` — for intent, not code)
- `public/administrator.html` — admin dashboard tile reference
- `public/soul-wizard.html` — 7-step Soul Config wizard reference
- `public/chat.html` + `public/js/chat.js` — Higgins chat reference
- `public/context.html` + `public/js/context.js` — context asset management reference

---

**Questions, corrections, gaps?** This is a living document. File an issue or open a PR against it. Do not let it go stale.
