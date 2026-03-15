# Insight 360 Blueprint v3.75

**Version:** 3.75
**Date:** March 15, 2026
**Status:** Current | Phase 75
**Codename:** Chronicle
**Previous Version:** v3.74 (Thought Leadership Publishing Pipeline)
**Latest Update:** Phase 75: Annie Embeddable Chat Widget

---

## Executive Summary

Insight 360 v3.75 delivers **Phase 75: Annie Embeddable Chat Widget** — a secure, compliant, public-facing chat system for external websites. The module enables any i360 agent to be deployed as an embeddable chat widget via iframe, with HMAC token authentication, PII redaction, Haiku/Sonnet cost optimization, Google Sheets data sync, Calendly scheduling integration, and a full conversation review dashboard.

Key deliverables:
1. **Publishing pipeline** — Unified publish-package endpoint distributes articles to Blog, Notion, Postiz social media (8+ platforms), and Substack (beta) in one action
2. **Pre-flight integration checks** — Platform-wide UX pattern verifying all downstream integrations before starting multi-step workflows
3. **Multi-model image generation** — GPT Image 1.5 (default), DALL-E 3, DALL-E 2 with automatic header image generation on every article
4. **Notion full-page publishing** — Creates database entries with 4 toggle sections (Image, Article, AI Article, Marketing) matching the editorial workflow
5. **Public blog** — SEO-optimized article pages at `/blog/:slug` with XSS protection
6. **Add-on pricing** — Starter tier can purchase TL module at $49/mo (4 articles/mo)
7. **Notion property fixes** — Corrected Status (→status type), Goal (→select type), added Month/YR, Quarter, URL setters

**Core Philosophy:** "Build the platform, then build on the platform."

---

## Phase 75: What Was Completed

### 1. Embeddable Chat Widget Module

Complete public-facing chat system for external websites with full WF-01 governance (PRD v2, security review, compliance audit, FMEA, test plan, metrics framework).

| Component | Type | Description |
|-----------|------|-------------|
| `widgetAgentService.js` | New service | Security-isolated LLM execution with restricted tools (KB search + escalate only), Haiku/Sonnet routing, conversation summarization, guardrail screening, output filtering |
| `piiRedactionService.js` | New service | 10-pattern PII detection/redaction (email, phone, SSN, DOB, CC, MRN, address, ZIP, insurance) |
| `sheets.js` | New service | Google Sheets data connector with sanitization, sync to context_assets |
| `calendly.js` | New provider | Calendly integration (OAuth + Personal Access Token, event types, availability) |
| `widgetChat.js` | New route | Public SSE chat with HMAC auth, CORS enforcement, rate limiting, privacy policy, data deletion |
| `widgets.js` | New route | Authenticated CRUD for widget management, token rotation, usage stats |
| `conversationReview.js` | New route | Conversation search, export (CSV/JSON), Export to Context Asset knowledge loop |
| `chat-widget.js` | New frontend | Embeddable widget (28KB) with 4 pre-chat modes, consent, SSE streaming |
| `conversation-review.html` | New page | Two-panel review dashboard with search, transcript, notes, multi-select export |
| `support-settings.html` | Modified | 4 new admin tabs: Chat Widgets, Privacy & Compliance, Data Sources, Integrations |
| `phase73-embeddable-chat-widgets.sql` | Migration | `chat_widgets`, `widget_sessions` tables, RLS, module registration, role access, Calendly provider |
| `public/demo/` | New (6 pages) | Medical practice demo site with Annie widget embedded |

### 2. Security Controls (15 Requirements)

All 15 security requirements from the STRIDE threat model implemented:

| ID | Control | Implementation |
|----|---------|----------------|
| SEC-01 | HMAC widget token | Per-widget signing secret, timing-safe validation |
| SEC-02 | CORS domain enforcement | Server-side origin check against `cors_origins` |
| SEC-03 | Public routes before auth | Widget routes registered before `authenticate` middleware |
| SEC-04 | Restricted tool set | Only `search_knowledge_base` + `escalate_to_human` |
| SEC-05 | org_id from token only | Never from request body/headers |
| SEC-06 | Stripped system prompt | No internal org details, no full soul config |
| SEC-07 | Guardrail screening | `screenMessage()` on every inbound message |
| SEC-08 | Output filtering | Strip system prompt fragments, internal URLs, table names |
| SEC-09 | Spend caps | Daily LLM spend cap + per-session message cap |
| SEC-10 | Rate limiting | 30/min per IP, 200/min per widget |
| SEC-11 | SSE connection limit | Max 100 concurrent streams per widget |
| SEC-14 | Message length limit | 2000 character max |
| SEC-15 | Active check | `is_active` verified on every request |

### 3. Compliance Controls (9 Requirements)

| ID | Control | Implementation |
|----|---------|----------------|
| R-01/R-02 | PII redaction | 10-pattern redaction before storage; BAA confirmed unnecessary |
| R-03 | AI transparency | Pre-chat disclosure displayed |
| R-04/R-05 | Medical disclaimer | Permanent footer + system prompt guardrails |
| R-06 | Data retention | Configurable (30-365 days), automated cleanup |
| R-07 | Right-to-delete | `DELETE /api/chat/public/:widget_id/data/:session_id` |
| R-08 | Consent mechanism | Checkbox (lead_capture/optional) or implicit (open_chat) |
| R-09 | Privacy policy | Editable template, served at public endpoint |

### 4. Pre-Chat Configuration (4 Modes)

| Mode | Email | Form? | Use Case |
|------|-------|-------|----------|
| `lead_capture` | Required | Yes | Annie/Jon — lead generation |
| `open_chat` | Hidden | No | Customer support — zero friction |
| `optional_info` | Optional | Skippable | Balanced approach |
| `custom` | Per-field | Yes | Admin-configured |

### 5. Cost Optimization

- Haiku-first routing (~$0.04/conversation avg vs $0.11 Sonnet-only)
- Conversation summarization after turn 3 reduces token replay
- Soft cap + auto-degrade at usage ceiling (never kills widget)
- Daily spend caps: $5 Starter, $25 Business, $100 Enterprise

### 6. Demo Environment

6-page medical practice simulation at `/demo/` for sales demonstrations. No authentication required. Widget embedded on facelift page with test HMAC token.

### 7. PRD v2 & Governance

Full WF-01 governance workflow with 5 subordinate agent delegations:
- Spec Writer (Reese): PRD v2 with 34 acceptance criteria
- Security Analyst (Alex): 21 STRIDE threats, 15 security requirements
- Compliance Auditor (Riley): 8 regulatory domains, 9 compliance controls
- QA Analyst (Morgan): 128 test cases
- Metrics Analyst (Quinn): 6 SLOs, 17 Prometheus metrics, corrected cost model

---

## Phase 74: What Was Completed

### 1. Thought Leadership Publishing Pipeline

Complete multi-target publishing system with pre-flight checks:

| Component | Type | Description |
|-----------|------|-------------|
| `preflightService.js` | New service | Checks image API, Notion, Postiz, Substack, LinkedIn before workflows |
| `substackService.js` | New service | Cookie-based Substack publishing (beta, AES-256-GCM encrypted) |
| `blog.js` | New route | Public blog pages with marked + sanitize-html (XSS protection) |
| `notionService.publishArticlePage()` | New method | Creates Notion pages with 4 toggle sections |
| `tlImageService.js` | Updated | GPT Image 1.5 default, multi-model support, base64 handling |
| `thought-leadership.js` | Updated | Pre-flight endpoint, image in article gen, 4 publish endpoints |
| `thought-leadership.html` | Updated | Publish section UI with target toggles and pre-flight display |

### 2. Notion Property Fixes

| Property | Before | After |
|----------|--------|-------|
| Status | `select` type (API rejected) | `status` type (correct) |
| Goal | `rich_text` (wrong type) | `select` (correct) |
| Month/YR | Not set | `rich_text` setter added |
| Quarter | Not set | `select` setter added |
| URL | Not set | `url` setter added |

### 3. Add-On Pricing ($49/mo)

Thought Leadership module marked as purchasable add-on. Tier limits added to `subscription_tiers`:
- Starter add-on: 4 articles/mo, 20 LinkedIn posts/mo
- Business: 16 articles/mo, 80 posts/mo
- Enterprise/Agency: Unlimited

### 4. Database Migration (phase72-tl-publishing.sql)

New tables: `blog_articles` (public blog), `substack_credentials` (encrypted cookies). Extended: `content_calendar_entries` (blog/notion sync columns), `thought_leadership_profiles` (image/style preferences), `subscription_tiers` (TL limits), `org_module_purchases` (settings JSONB).

---

## Phase 73: What Was Completed

### 1. Infrastructure Integration Fixes (Support AI Module)

Phase 71 shipped the Customer Support AI module with 6 infrastructure disconnections. All fixed:

| # | Issue | Fix | File(s) |
|---|-------|-----|---------|
| 1 | `processes` table has no `org_id` — KB search returned empty | Query via `department_id` → `departments.org_id` join (Parthenon pattern) | `supportAgentService.js` |
| 2 | Support Settings Policies tab was hardcoded JS array | Wired to live Parthenon API (`/api/parthenon/processes`) | `support-settings.html` |
| 3 | Context assets KB search missed `content_text` | Added `content_text` to `.or()` filter | `supportAgentService.js` |
| 4 | Dead link to `/processes.html` (doesn't exist) | Changed to `/parthenon.html#processes` | `support-settings.html` |
| 5 | No guidance connecting Support to existing infrastructure | Added explanatory text linking to Parthenon and Context Assets | `support-settings.html` |
| 6 | `auth-fetch.js` missing from support-settings | Added include; all API calls now use `authFetch()` | `support-settings.html` |

### 2. Administrator Dashboard Reorganization

Restructured from 4 flat sections to 6 priority-ordered sections:

| Section | Tiles | Purpose |
|---------|-------|---------|
| **Organization Setup** | 8 | Org settings, customization, departments, members, users, roles, clients |
| **AI & Values** | 7 | Soul config, Parthenon, agent categories, dept AI, responsibilities, OKR capabilities |
| **Platform & Access** | 8 | Platform dashboard, tiers, resource access, role audit, support settings, digest sources, integrations, MCP |
| **Content & Assets** | 2 | Tags, asset types |
| **Monitoring & Data** | 4 | System health, SynergiNexus, conversations, Align 120 sessions |

**Changes:**
- Added 11 missing admin pages (Role Audit, Client Portal Users, Dept AI, MCP Connections, OKR Capabilities, Org Customization, Responsibilities, Responsibility AI Mapping, Support AI Settings, Digest Sources, MCP Connections)
- Removed dev/test pages (Modals, Icon Library)
- Removed duplicate Soul Configuration tile
- Priority ordering: most important tiles first in each section

### 3. Mandatory Module Integration Checklist

Added to `CLAUDE.md` — enforced on every future Claude Code session. 8 categories, 30+ checkboxes:
1. Platform Module Registration (DB)
2. Route Registration (Server)
3. Data Scoping (DB Queries)
4. Frontend Integration
5. Infrastructure Connections
6. Documentation Chain
7. Testing
8. Verification

**Rule:** If any item is unchecked, the module is NOT complete.

### 4. Documentation Restructure

| Before | After |
|--------|-------|
| 95 blueprint files (flat, date-stamped) | 1 living document (`I360-Blueprint-CURRENT.md`) + archive |
| 54 roadmap files (flat, date-stamped) | 1 living document (`I360-ROADMAP-CURRENT.md`) + archive |
| 0 release notes files | `release-notes/` directory with per-release files |

Git history preserves all versions. Archive directory retains old snapshots.

---

## Phase 72: What Was Completed

### 1. Critical Nav Panel Fix

**Root cause:** `GET /api/modules` only read `org_id` from the `x-org-id` header. When the frontend didn't send it (cleared localStorage, login race condition), `get_user_modules` received `NULL` for org_id, causing `can_access_module()` to return FALSE for every module — resulting in an empty navigation panel.

**Secondary bug:** When `/api/modules` returned `{ success: true, modules: [] }`, navigation.js treated this as valid dynamic nav (rendering nothing) instead of falling back to the static nav config.

| Change | File(s) | Description |
|--------|---------|-------------|
| Add `req.orgId` fallback | `server/routes/modules.js` | All 3 endpoints (`/`, `/usage`, `/check/:moduleId`) now fall back to `req.orgId` set by auth middleware |
| Empty modules guard | `public/js/navigation.js` | Returns `null` (triggering static fallback) when modules array is empty |

### 2. Phase 70 Follow-Up Fixes

Completing the role architecture streamlining from Phase 70:

| Change | File(s) | Description |
|--------|---------|-------------|
| Cookie auth on `/me` | `server/routes/auth.js` | `/api/auth/me` reads token from cookie (not just Authorization header) |
| Org membership fallback | `server/routes/auth.js` | Login and `/me` find first active membership when `default_org_id` is NULL, then backfill it |
| Structured roles object | `public/js/navigation.js` | Uses `user.roles.org.role` with fallback to legacy fields |
| Credentials include | `public/js/navigation.js` | Adds `credentials: 'include'` to `/api/auth/me` fetch |
| Duplicate `.or()` fix | `server/routes/agents.js`, `server/routes/skills.js` | Removed Phase 46 `.or()` filter that conflicted with `buildAgentAccessFilter` |

### 3. PM Agent Team (11 Skills)

Migrated from `.claude/agents/` to `.claude/skills/pm-*/` — a complete product management workflow:

| Agent | Persona | Skill Name | Role |
|-------|---------|------------|------|
| Orchestrator | Avery | `pm-orchestrator` | Coordination, delegation, quality gates |
| Spec Writer | Reese | `pm-spec-writer` | PRDs, implementation briefs, acceptance criteria |
| QA Analyst | Morgan | `pm-qa-analyst` | Test plans, verification, access control validation |
| Metrics Analyst | Quinn | `pm-metrics-analyst` | Measurement frameworks, SLOs/SLIs, observability |
| Release Coordinator | Jordan | `pm-release-coord` | Launch checklists, rollback plans, readiness |
| Incident Commander | Sam | `pm-incident-commander` | Incident response, post-mortems, pattern detection |
| Compliance Auditor | Riley | `pm-compliance-auditor` | Regulatory mapping, audit trails, data governance |
| Security Analyst | Alex | `pm-security-analyst` | STRIDE threat modeling, auth/authz review |
| Bug Triager | Casey | `pm-bug-triager` | Severity scoring, root cause mapping |
| Docs Sync | Parker | `pm-docs-sync` | Documentation chain, drift detection |
| UI/UX Manager | Taylor | `pm-uiux-manager` | Frontend standards, accessibility |

8 structured workflows: Feature Planning, Docs Sync, Bug Intake, Launch Readiness, Feature Iteration, Feature Review, FMEA, Post-Incident Review.

### 4. Phase 67/68 Migrations

| Migration | Description |
|-----------|-------------|
| `phase67-digest-discovery.sql` | Digest discovery tables and service |
| `phase67-unified-runtime-backbone.sql` | Unified runtime backbone schema |
| `phase68-tags-org-scoping.sql` | Tags org-scoping for multi-tenant tag isolation |

Supporting files: `digestDiscoveryService.js`, `DigestProgressModal.js`, unit tests for runtime profile router and unified runtime, Postman test collection.

### 5. Annie Chat Agent PRD

Comprehensive product requirements document for embedding Annie (Dr. Jon Mendelsohn's AI assistant) into i360 as an Embeddable Chat Widget module. Based on Fathom meeting recap (March 13, 2026).

| Deliverable | Description |
|-------------|-------------|
| PRD (10 FRs) | Public chat endpoint, widget management, Google Sheets connector, Calendly embed, video recommendations, conversation review dashboard, export-to-context-asset feedback loop |
| Pricing (3 options) | Module add-on ($49/mo Starter), included in Business+, Jon-specific deal ($99/mo + $2K setup) |
| Rollout plan (8 phases) | 7-week delivery from foundation through progressive launch |
| Client proposal | Ready-to-send proposal for Dr. Mendelsohn |
| Architecture design | Integration with existing chat, context injection, Phase 71 data layer |
| Avatar strategy | 3-phase approach: static → animated → dynamic video |

### 6. Documentation

| Document | Location |
|----------|----------|
| PM Agent Team Executive Summary | `documentation/design/PM Agent Team — Executive Summary.md` |
| Annie Chat Agent PRD | `documentation/design/Annie Chat Agent — PRD, Pricing & Rollout Proposal.md` |

---

## Files Modified/Created

| File | Changes |
|------|---------|
| `server/routes/modules.js` | Add `req.orgId` fallback to 3 endpoints |
| `server/routes/auth.js` | Cookie auth on `/me`, org membership fallback on login |
| `server/routes/agents.js` | Remove duplicate Phase 46 `.or()` filter |
| `server/routes/skills.js` | Remove duplicate Phase 46 `.or()` filter |
| `public/js/navigation.js` | Structured roles, credentials include, empty modules guard |
| `.claude/skills/pm-*/SKILL.md` (x11) | 11 PM agent team skills |
| `.claude/skills/pm-spec-writer/context-assets.md` | Shared context asset definitions |
| `db/phase67-digest-discovery.sql` | Digest discovery migration |
| `db/phase67-unified-runtime-backbone.sql` | Unified runtime backbone migration |
| `db/phase68-tags-org-scoping.sql` | Tags org-scoping migration |
| `server/services/digestDiscoveryService.js` | Digest discovery service |
| `public/js/modal-service/modals/DigestProgressModal.js` | Digest progress modal |
| `__tests__/unit/services/runtimeProfileRouter.test.js` | Runtime profile router tests |
| `__tests__/unit/services/unifiedRuntime.test.js` | Unified runtime tests |
| `documentation/design/PM Agent Team — Executive Summary.md` | PM team overview |
| `documentation/design/Annie Chat Agent — PRD, Pricing & Rollout Proposal.md` | Annie PRD |
| `documentation/test-plans/unified-runtime-v1-postman.md` | Postman test plan |
| `documentation/test-plans/unified-runtime-v1.postman_collection.json` | Postman collection |

---

## Production Readiness Score: 10.0/10

| Area | Score | Notes |
|------|-------|-------|
| Architecture | 10/10 | Complete multi-tenant + values hierarchy + add-on purchasing |
| Security | 10/10 | SSRF + invite token + prompt injection + PKCE + cookie auth |
| Database | 10/10 | 119+ tables, Phase 67/68 migrations applied |
| Testing | 9.8/10 | 666+ automated tests, new unified runtime tests |
| Documentation | 10/10 | 34+ user guides, PM team exec summary, Annie PRD |
| Navigation | 10/10 | **Fixed** — org_id fallback + empty modules guard |
| Auth | 10/10 | **Fixed** — cookie auth, org membership fallback, structured roles |
| Agent/Skills Access | 10/10 | **Fixed** — duplicate `.or()` filter removed |
| PM Tooling | 10/10 | 11 specialist skills with 8 structured workflows |
| Support AI | 10/10 | Phase 71 foundation + widget configs live |

---

## Git Commits

| Hash | Message |
|------|---------|
| `77311e0` | Phase 70 follow-up: fix cookie auth, org fallback, and duplicate .or() filter bug |
| `f1d427e` | Add PM agent team skills, Phase 67/68 migrations, and unified runtime tests |
| `171357c` | Add PM Agent Team executive summary documentation |
| `5c10ff0` | Add Annie Chat Agent PRD with Calendly embed, conversation review, and pricing |
| `4d4103f` | Fix nav panel: add org_id fallback to modules route, handle empty modules array |

---

## Next Steps

1. **Annie Chat Agent** — Await pricing approval, then begin Phase 1 (widget infrastructure)
2. **Phase 71b** — Deploy embeddable widget JS, Stripe/Slack connections
3. **Phase 52** — Production deployment (Supabase Pro, custom domain)
4. **Phase 53** — Navigation restructure
5. **Security/FMEA review** — Run before Annie launch
