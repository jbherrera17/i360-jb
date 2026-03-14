# I360 Roadmap

## Production Readiness & Future Development Plan

**Version:** 3.73
**Last Updated:** March 14, 2026
**Current System Version:** v3.73 (Phase 73)

---

## Executive Summary

Insight 360 is a **full-service enterprise SaaS platform** enabling multi-tenant organizations with subscription tiers, module-based feature access, per-user resource visibility, complete user lifecycle management, agency capabilities, external integrations, a comprehensive **Human Values Definition System**, **AI-powered customer support**, and a **PM agent team** for structured product governance. Version 3.73 fixes critical infrastructure disconnections in the Support AI module, reorganizes the admin dashboard with 30 tiles across 6 sections, and establishes mandatory integration standards for future development.

**Current Production Readiness Score: 10.0/10** *(v3.73)*

| Area | Score | Risk Level | Notes |
|------|-------|------------|-------|
| Architecture | 10/10 | Low | Complete multi-tenant + values hierarchy + add-on purchasing |
| Security | 10/10 | Low | SSRF + invite token + prompt injection + PKCE + cookie auth |
| Error Handling | 10/10 | Low | Graceful API fallbacks |
| Database | 10/10 | Low | 119+ tables, Phase 67/68 migrations applied |
| Testing | 9.8/10 | Low | 666+ automated tests (unified runtime tests added) |
| Observability | 9/10 | Low | Native console logger, Prometheus metrics |
| Reliability | 10/10 | Low | Retry with backoff, circuit breakers, **nav org_id fallback** |
| Documentation | 10/10 | Low | 34+ user guides, PM team exec summary, Annie PRD |
| User Experience | 10/10 | Low | **Nav panel fixed**, cookie auth, org membership fallback |
| LLM Support | 10/10 | Low | Registry synced — Sonnet 4.5 default, GPT-5.3 Codex, o3/o4, Gemini, Perplexity |
| Content System | 9.5/10 | Low | Voice DNA, ICPs, Skills, Context Assets + template support |
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

## What's New in v3.73

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
| **72** | **v3.72** | **Platform reliability, PM Agent Team, Annie PRD** | **Done** |
| Annie | — | Embeddable chat widget module | Pending Approval |
| 52 | — | Production Deployment | Planned |
| 53 | — | Navigation Restructure | Planned |

---

## Test Coverage Summary: 666+ Tests (100% Passing)

**Unit:** soulConfig (30), ethicalContext (37), moduleAccess (24), gemini (29), llmRegistry (72), validate (59), observability (28), MCP services, supportPolicy (16), supportAgent (15), runtimeProfileRouter (new), unifiedRuntime (new)

**Integration:** soul-config (33), modules (35), support (22)

**E2E Playwright:** workflow-builder (56), social-media (95), execute-120 (118)
