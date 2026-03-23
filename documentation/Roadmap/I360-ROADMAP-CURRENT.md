# I360 Roadmap

## Production Readiness & Future Development Plan

**Version:** 3.86
**Last Updated:** March 22, 2026
**Current System Version:** v3.86 (Phase 86)

---

## Executive Summary

Insight 360 is a **full-service enterprise SaaS platform** enabling multi-tenant organizations with subscription tiers, module-based feature access, per-user resource visibility, complete user lifecycle management, agency capabilities, external integrations, a comprehensive **Human Values Definition System**, **AI-powered customer support**, a **PM agent team** for structured product governance, a **workflow-first thought leadership content engine**, a **persistent Artifact System** for agent/skill/workflow deliverables, and a **58-agent AI workforce** organized across 7 department teams plus cross-functional support. Version 3.85 adds the Artifact System for compound deliverable persistence and deprecates Strategy 120 in favor of Execute 120 and Claude Code skills.

**Current Production Readiness Score: 10.0/10** *(v3.80)*

| Area | Score | Risk Level | Notes |
|------|-------|------------|-------|
| Architecture | 10/10 | Low | Complete multi-tenant + values hierarchy + add-on purchasing |
| Security | 10/10 | Low | SSRF + invite token + prompt injection + PKCE + cookie auth |
| Error Handling | 10/10 | Low | Graceful API fallbacks |
| Database | 10/10 | Low | 119+ tables, Phase 67/68 migrations applied |
| Testing | 9.8/10 | Low | 666+ automated tests (unified runtime tests added) |
| Observability | 9/10 | Low | Native console logger, Prometheus metrics |
| Reliability | 10/10 | Low | Retry, circuit breakers, **auto-fallback across LLM providers**, SSE health stream |
| Documentation | 10/10 | Low | 34+ user guides, PM team exec summary, Annie PRD |
| User Experience | 10/10 | Low | **Model dropdowns gray unavailable providers**, fallback toast notifications |
| LLM Support | 10/10 | Low | Registry synced — Sonnet 4.5 default, GPT-5.3 Codex, o3/o4, Gemini, Perplexity, **22-model fallback map** |
| Content System | 10/10 | Low | Voice DNA, ICPs, Skills, Context Assets + **publishing pipeline** (blog, Notion, social, Substack) |
| Strategy-Execution | 10/10 | Low | Closed-loop tracking, OKR integration, personal command center |
| Multi-Tenant | 10/10 | Low | Full agency model with clients + add-on modules |
| Agency Features | 10/10 | Low | 3 graduated agency tiers |
| Enterprise Features | 10/10 | Low | Route integration + impersonation |
| Resource Access | 10/10 | Low | 5-layer access control, **duplicate .or() filter fixed** |
| User Management | 10/10 | Low | Email invitations + PKCE + resend + accept + activate lifecycle |
| Admin Experience | 10/10 | Low | **30-tile admin dashboard**, tier-aware visibility, platform admin gating |
| Integrations | 9.5/10 | Low | Provider registry, OAuth, sync, webhooks |
| DB Security | 10/10 | Low | All views SECURITY INVOKER, RLS on all tables |
| Auth Infrastructure | 10/10 | Low | **HttpOnly cookies + Bearer token**, email invitations + PKCE, org membership fallback |
| Support AI | 10/10 | Low | AI agent + policy engine + 5 admin pages + 53 tests, **infrastructure integrated** |
| PM Tooling | 10/10 | Low | **11 specialist skills, 8 workflows, orchestrator pattern** |

---

## What's New in v3.86

### Phase 86: Agent Library UX Overhaul + Context Route Isolation

| Component | Description | Impact |
|-----------|-------------|--------|
| `agents.html` rewrite | 2-panel master-detail, tabbed modal (Settings/Context/History), keyboard nav | 46% code reduction, unified edit experience |
| `agents.css` (new) | Extracted page styles from inline | Maintainability, theme consistency |
| Context route isolation | Factory pattern + `scopeToOrg()` on `/api/context/assets` | Platform admins scoped to org, no cross-org leakage |
| XSS hardening | `escapeHtml()` on asset names in 5 rendering paths | Closes pre-existing injection vector |
| `chat.js` production fix | `await initNavigation()` before `loadModels()` | Models load correctly on production |
| Playwright tests (17) | E2E coverage: layout, CRUD, tabs, keyboard, org-scoping, dialogs | Regression protection |

---

## What Was New in v3.85

### Phase 85: Artifact System + Strategy 120 Deprecation

| Component | Description | Impact |
|-----------|-------------|--------|
| `artifact_bundles` table | Parent container with source tracking, versioning, generation metadata | Persistent storage for all AI deliverables |
| `artifact_parts` table | Child content pieces with dual storage (inline text + Supabase Storage) | Compound artifacts: text + images + files in one bundle |
| `artifactService.js` | Service layer: createBundle, uploadPart, versioning, signed downloads | Programmatic API for agents/workflows/skills |
| `artifacts.js` routes | 10 REST endpoints with requireOrgContext + requireModule | Full CRUD + file upload (50MB) + signed download URLs |
| `artifacts.html` | Browse page with search, filter chips, card grid, detail modal, pagination | Full artifact management UI |
| Execute 120 integration | "My Artifacts" card showing 5 most recent deliverables | Quick access from command center |
| Strategy 120 deprecated | Nav removed, page redirects to Execute 120, module deactivated | Superseded by Execute 120 + Claude Code skills |
| Documentation chain | User guide, technical guide, help registry, docs whitelist | Complete help system integration |
| Tests | 10 unit + 8 integration (18 total) | Service + route coverage |

---

## What Was New in v3.82

### Phase 82: Platform-Wide Multi-Tenant Data Isolation

| Component | Description | Impact |
|-----------|-------------|--------|
| `requireOrgContext` Middleware | Validates `x-org-id` header against user's org membership | Spoofed org headers now rejected with 403 |
| `scopeToOrg()` Helper | Standardized query scoping that throws on null orgId | Eliminates "return everything" fallback anti-pattern |
| `authFetch` x-org-id | `authFetch()` now auto-attaches org context from localStorage | Every API call carries org identity |
| `auth-fetch-loader.js` | Synchronous loader ensures authFetch available before page init | Fixes race condition where pages fired raw fetch first |
| Frontend Migration | 500+ raw `fetch('/api/')` → `authFetch()` across 60+ files | Zero unauthenticated API calls remain |
| Backend Route Hardening | execute120, agents, conversations, departments routes scoped | Cross-org data leakage eliminated on all critical routes |
| ESLint Prevention | Custom `no-raw-fetch` plugin blocks `fetch('/api/')` at commit time | Structural prevention — cannot recur |
| CLAUDE.md Rules | Mandatory multi-tenant scoping rules for all new code | Developer guidance codified |
| Login Org Storage | Invite acceptance path now stores org_id in localStorage | New users get org context from first login |
| Setup Wizard Fixes | Admin auto-assigned executive role + Executive department | Org admins have full visibility from day one |

### Phase 81: Infrastructure Integrity Remediation

| Component | Description | Impact |
|-----------|-------------|--------|
| Module Gating | `requireModule()` on all 5 route files (agents, skills, actions, parthenon, workflows) | Tier/role restrictions enforced on all features |
| Ownership Checks | Org/user verification on every single-record endpoint | Cross-org data exposure eliminated |
| Frontend authFetch | 39 raw `fetch()` calls replaced with `authFetch()` across 4 pages | `x-org-id` header sent on all API calls |
| Workflow Factory | Converted workflows to factory pattern with supabase injection | Consistent with all other route files |
| Route Fix | `GET /executions` moved before `GET /:id` | `/api/workflows/executions` endpoint no longer dead |
| Schema Updates | `skill_summary` view updated; `workflow_executions.org_id` added | Org-scoped queries work correctly |
| Phase 50 Wiring | `skill_departments` junction table + `filterByBusinessRole()` | Department/role filtering for skills now functional |
| org_id Backfill | System agents, skills, actions, workflows assigned to Synergi org | System resources visible in org-scoped queries |

### Phase 80: LLM Health Monitoring & Automatic Fallback

| Component | Description | Impact |
|-----------|-------------|--------|
| Health Cache | In-memory provider status with EventEmitter broadcast | Instant health state available to all services |
| 5-Min Interval | 1-token pings to all 4 providers every 5 minutes | Proactive outage detection without user traffic |
| Circuit Breaker Bridge | Provider circuit breakers push state changes to health cache | Instant detection from real traffic — no polling delay |
| Fallback Map | 22-model cross-provider fallback hierarchy | Automatic failover: Claude → GPT → Gemini and back |
| SSE Health Stream | `GET /api/health/stream` pushes status to frontends | Real-time UI updates without polling |
| Dropdown Graying | Unavailable provider options disabled + "(unavailable)" suffix | Users see which models are down before selecting |
| Fallback Toast | Toast notification when fallback activates | Transparent — users know which model is responding |
| Perplexity Exception | No fallback for Perplexity (unique search) | Clear 503 message instead of degraded experience |

---

## What Was New in v3.79

### Phase 79: Platform Admin Org Scope + Org Chart Updates

| Component | Description | Impact |
|-----------|-------------|--------|
| Org Scope Selector | Platform admin dropdown on context page for cross-org asset filtering | Admins manage assets across all organizations from one page |
| All-Orgs Mode | `x-org-id: all` header support in context assets API | Backend supports cross-org visibility for admins |
| Impersonation Lock | Org selector auto-locks during impersonation sessions | Prevents scope confusion during admin impersonation |
| Org Chart Complete | Executive team (3), cross-functional expanded to 8, totals: 58/84 | Documentation reflects completed agent workforce |

---

## What Was New in v3.78

### Phase 78: Context Asset Remediation + Open Brain + Marketing Skills

| Component | Description | Impact |
|-----------|-------------|--------|
| Stale Cache Fix | Context asset dropdowns re-fetch on every modal/panel open | 5 pages fixed, no more stale data |
| Chat Save Fix | Broken Save as Context Asset repaired (endpoint + fields + auth) | Feature restored to working state |
| Org Ownership | `GET /assets/:id` checks org membership | Defense-in-depth cross-tenant prevention |
| Digest Pipeline | Fixed wrong column names causing silently empty context | Digest content blocks now populate correctly |
| Open Brain | Visual dashboard rebuild with factory pattern route | Module access + help system integrated |
| Marketing Skills | 9 mkt-* Claude Code skills launched | First Parthenon department rollout |

---

## What Was New in v3.77

### Phase 77: TL Page UX Redesign

| Component | Description | Impact |
|-----------|-------------|--------|
| Two-Mode Interface | "This Week" execution + "Settings" configuration | 95% of visits need just one CTA |
| Content Card | Auto-populated from editorial calendar for current week | No manual topic recall needed |
| Live Generation | 5-step pipeline with 4 states, elapsed time, per-step retry | Transparent 90-second workflow |
| Inline Results | Article, AI version, image, LinkedIn with Preview/Edit/Regen | Review everything in one place |
| Content Review | Navigate to past weeks, auto-load stored content | Article + image + marketing all visible |
| Settings Tabs | 5 tabs: Position, Pillars, Calendar, Visibility, Publishing | Configuration hidden when not needed |
| Publishing Streak | Consecutive-week counter in Recent section | Motivates consistency |
| XSS Mitigation | Markdown renderer hardened against script injection | Security improvement |
| Page Size | 4,197 → 2,470 lines (41% reduction) | Cleaner, faster loading |

---

## What Was New in v3.76

### Phase 76: TL Content Creation Workflow

| Component | Description | Impact |
|-----------|-------------|--------|
| Content Pipeline | Editorial context hierarchy injected into generation | Articles match calendar strategy |
| Format Templates | Long/medium/short with section-by-section specs | Consistent article structure |
| LinkedIn Themes | 5 daily post templates with hashtag rotation | Professional daily cadence |
| Quality Gates | 7-check engine with actionable fix guidance | Quality assurance before publish |
| Guardrail Fix | Eliminated systemic false positives in keyword matching | All agents work correctly |

---

## What Was New in v3.74

### Phase 74: Thought Leadership Publishing Pipeline

| Component | Description | Impact |
|-----------|-------------|--------|
| Publishing Pipeline | One-click publish to Blog, Notion, Social Media, Substack | Complete content distribution from single UI |
| Pre-flight Checks | Verify all integrations before workflows start | Users know upfront what will/won't work |
| Multi-Model Images | GPT Image 1.5 (default), DALL-E 3/2, auto-generation | Every article gets a header image automatically |
| Public Blog | SEO-optimized pages at `/blog/:slug` with XSS protection | Professional public-facing content |
| Notion Full Pages | 4 toggle sections (Image, Article, AI Article, Marketing) | Matches editorial workflow exactly |
| Substack (Beta) | Reverse-engineered API with encrypted cookie auth | Automated newsletter publishing |
| Add-On Pricing | $49/mo for Starter tier, 4 articles/mo limit | Revenue from smaller orgs |
| Notion Bug Fixes | Status→status type, Goal→select type, +3 property setters | Calendar sync works correctly |

---

## What Was New in v3.73

### Phase 73: Infrastructure Integration & Admin Reorganization

| Component | Description | Impact |
|-----------|-------------|--------|
| KB Search Fix | Processes query uses dept-based org-scoping (was broken `.eq('org_id')`) | Support AI can now search org policies |
| Policies Tab | Wired to live Parthenon API (was hardcoded JS array) | Admins see real policies, not static defaults |
| Content Search | Added `content_text` to KB `.or()` filter | AI finds answers in full content, not just titles |
| Dead Link Fix | `/processes.html` → `/parthenon.html#processes` | No more 404s from Support Settings |
| Admin Dashboard | 6 sections, 30 tiles, priority-ordered | All admin pages discoverable from one place |
| 11 Missing Pages | Role Audit, Dept AI, MCP, Support Settings, etc. | Complete admin surface area |
| Integration Checklist | 30+ mandatory checks in CLAUDE.md | Prevents isolated module development |
| Doc Restructure | Living documents + archive + release notes dir | Sustainable documentation workflow |

---

## What Was New in v3.72

### Phase 72: Platform Reliability, PM Agent Team & Annie PRD

| Component | Description | Impact |
|-----------|-------------|--------|
| **Nav panel fix** | Modules route falls back to `req.orgId` from auth middleware; empty modules array triggers static fallback | **Critical** — resolves empty navigation for all users |
| **Cookie auth on /me** | `/api/auth/me` reads token from cookie, not just Authorization header | Login works reliably with cookie-based auth |
| **Org membership fallback** | Login and `/me` find first active membership when `default_org_id` is NULL, backfill it | Users without default org now get correct access |
| **Duplicate .or() fix** | Removed Phase 46 `.or()` filter conflicting with `buildAgentAccessFilter` on agents and skills routes | Correct agent/skill visibility |
| **PM Agent Team (11 skills)** | Orchestrator + 10 specialists covering spec writing, QA, security, compliance, metrics, release, incident, bug triage, docs sync, UI/UX | Structured product governance with audit trails |
| **Phase 67/68 migrations** | Digest discovery, unified runtime backbone, tags org-scoping | Foundation for digest system and runtime profiles |
| **Annie Chat Agent PRD** | Full PRD (10 FRs), pricing (3 options), 8-phase rollout, client proposal, architecture, avatar strategy | Strategic product expansion into embeddable chat widgets |
| **Executive summary doc** | PM Agent Team roles, responsibilities, workflows, collaboration patterns | Team reference documentation |

---

## What's New in v3.71

### Phase 71: Customer Support Agent System

| Component | Description | Impact |
|-----------|-------------|--------|
| Database foundation | 6 tables with RLS, indexes, atomic seq generation | Complete data model for support operations |
| Policy service | Refund/escalation/tier-change evaluation | Configurable, rules-based decision engine |
| AI agent service | Anthropic tool_use loop with 5 tools, conversation locking | Core AI engine with FMEA-driven reliability |
| 15 API endpoints | Conversation CRUD + messaging + SSE + actions | Complete REST API for support operations |
| 5 admin pages | Dashboard, Conversations, Detail, Actions, Settings | Full admin interface for support management |
| 53 automated tests | 16 policy + 15 agent + 22 integration | High test coverage from launch |

---

## Roadmap: Upcoming Phases

### Annie Chat Widget (Next — Pending Approval)

| Feature | Description |
|---------|-------------|
| Embeddable widget | Public-facing chat via iframe, no auth required |
| Google Sheets connector | External data source for procedure knowledge base |
| Calendly embed | Appointment scheduling within chat |
| Conversation review | Dashboard with search, filters, export |
| Knowledge feedback loop | Export conversations to context assets |

### Phase 71b: Support Widget & Integrations (Planned)

| Feature | Description |
|---------|-------------|
| Widget JS | Embeddable customer-facing chat widget |
| Stripe connection | Automated refund processing |
| Slack connection | Escalation notifications |

### Phase 52: Production Deployment (Planned)

| Feature | Description |
|---------|-------------|
| Supabase Pro | Production database tier |
| Custom domain | `app.insight360.com` or similar |
| SSL + CDN | Production-grade hosting |

### Phase 53: Navigation Restructure (Planned)

| Feature | Description |
|---------|-------------|
| Dynamic nav groups | Server-driven navigation grouping |
| Module ordering | Admin-configurable display order |

---

## Development Phases Complete

| Phase | Version | Description | Status |
|-------|---------|-------------|--------|
| 1-3 | v1.x | Core foundation, agents, context | Done |
| 4-43 | v2.0-3.24 | Parthenon, workflows, strategy, agency model | Done |
| 44-51 | v3.25-3.34 | Enterprise multi-tenancy, security hardening | Done |
| 54-61d | v3.35-3.60 | Soul Config, branding, social publishing, Execute 120 | Done |
| 62-65 | v3.61-3.63 | Open Brain, branding fix, Integrity Dashboard | Done |
| 67-68 | — | Digest discovery, unified runtime, tags org-scoping | Done |
| 70 | v3.70 | Role architecture streamlining | Done |
| 71 | v3.71 | Customer Support Agent System | Done |
| **85** | **v3.85** | **Artifact System + Strategy 120 Deprecation** | **Done** |
| **79** | **v3.79** | **Platform Admin Org Scope + Org Chart Updates** | **Done** |
| 78 | v3.78 | Context Asset Remediation + Open Brain + Marketing Skills | Done |
| 77 | v3.77 | TL Page UX Redesign — Two-Mode Workflow Cockpit | Done |
| 76 | v3.76 | TL Content Creation Workflow + Guardrail Fix | Done |
| 75 | v3.75 | Annie Embeddable Chat Widget | Done |
| 74 | v3.74 | Thought Leadership Publishing Pipeline | Done |
| 72 | v3.72 | Platform reliability, PM Agent Team, Annie PRD | Done |
| Annie | — | Embeddable chat widget module | Pending Approval |
| 52 | — | Production Deployment | Planned |
| 53 | — | Navigation Restructure | Planned |

---

## Test Coverage Summary: 684+ Tests (100% Passing)

**Unit:** soulConfig (30), ethicalContext (37), moduleAccess (24), gemini (29), llmRegistry (72), validate (59), observability (28), MCP services, supportPolicy (16), supportAgent (15), runtimeProfileRouter (new), unifiedRuntime (new)

**Integration:** soul-config (33), modules (35), support (22)

**E2E Playwright:** workflow-builder (56), social-media (95), execute-120 (118)
