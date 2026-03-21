# Insight 360 Blueprint v3.85

**Version:** 3.85
**Date:** March 21, 2026
**Status:** Current | Phase 85
**Codename:** Chronicle
**Previous Version:** v3.82 (Multi-Tenant Data Isolation)
**Latest Update:** Phase 85: Artifact System + Strategy 120 Deprecation

---

## Executive Summary

Insight 360 v3.85 delivers **Phase 85** — the Artifact System for persistent storage of agent, skill, and workflow deliverables, plus the deprecation of Strategy 120 (superseded by Execute 120 and Claude Code skills).

Key deliverables:
1. **Artifact Bundles** — Parent containers with source tracking, versioning, generation metadata, visibility controls
2. **Compound Parts** — Multiple content pieces per bundle: markdown, images, PDFs, spreadsheets, code, audio/video
3. **Supabase Storage** — Binary files stored with signed download URLs (1-hour expiry)
4. **Full Browse UI** — `artifacts.html` with search, filter chips, card grid, detail modal, pagination
5. **Execute 120 Integration** — "My Artifacts" card showing 5 most recent deliverables
6. **Strategy 120 Deprecated** — Nav removed, page redirects to Execute 120, module deactivated
7. **18 New Tests** — 10 unit (artifactService) + 8 integration (routes)

**Core Philosophy:** "Build the platform, then build on the platform."

---

## Phase 85: What Was Completed

### 1. Artifact System (New Module)

Two new tables with full multi-tenant isolation:

| Table | Key Columns | Purpose |
|-------|------------|---------|
| `artifact_bundles` | org_id, user_id, source_type, tags[], visibility, version, is_current | Parent container for deliverables |
| `artifact_parts` | bundle_id, part_type, content_text, content_json, file_path, file_size | Child content with dual storage (inline + Storage) |

10 REST API endpoints at `/api/artifacts/*` with `requireOrgContext` + `requireModule('artifacts')`:
- CRUD: list (paginated), get, create, update, delete
- Parts: add text part, upload binary (multer, 50MB), signed download URL
- Versioning: create new version (clone + increment)

### 2. Strategy 120 Deprecation

| Change | Detail |
|--------|--------|
| Navigation | Removed from sidebar (static + dynamic) |
| Page | Replaced with meta-refresh redirect to `/execute120.html` |
| Module | `platform_modules.is_active = false` for `strategy_agents` |
| Execute 120 | Strategy overview card and CSS removed |
| Route file | `server/routes/strategy120.js` preserved (no user data) |
| Server route | `GET /strategy120` returns 301 redirect |

### 3. Execute 120 Integration

"My Artifacts" card added after Quick Actions, showing 5 most recent artifacts with source type icons and "View All" link to `/artifacts.html`.

### 4. Documentation Chain

User guide, technical guide, help registry entry, docs whitelist — all complete.

---

## Phase 81: What Was Completed

### 1. Module Gating (All 5 Route Files)

Added `requireModule()` middleware from `moduleAccess.js` to enforce tier/role restrictions:

| Route File | Module ID | Additional |
|-----------|-----------|------------|
| `agents.js` | `agents` | Added `checkResourceLimit` import |
| `skills.js` | `skills` | — |
| `actions.js` | `actions` | Replaced custom inline middleware with standard `requireModule` |
| `parthenon.js` | `parthenon` | Was completely unprotected before Phase 81 |
| `workflows.js` | `workflows` | Converted to factory pattern; added `checkResourceLimit('workflows')` on POST |

### 2. Ownership & Org Checks (Single-Record Endpoints)

Every GET/PUT/DELETE /:id endpoint now verifies the requesting user has access:

| Check | Passes If |
|-------|-----------|
| Owner | `record.user_id === req.userId` |
| Same org | `record.org_id === orgId` |
| Public | `record.visibility === 'public'` or `record.is_public === true` |
| System | `record.user_id IS NULL` |

Added `verifyWorkflowOwnership()` helper for workflow step CRUD guards. Parthenon uses dept→org chain verification for roles, OKRs, and processes.

### 3. Frontend authFetch Migration

Replaced 39 raw `fetch('/api/...')` calls with `authFetch()` across 4 pages:

| Page | Calls Migrated |
|------|---------------|
| `agents.html` | 15 |
| `actions.html` | 10 |
| `skills.html` | 7 |
| `workflows.html` | 7 |

### 4. Schema & Route Fixes

| Fix | Details |
|-----|---------|
| `skill_summary` view | DROP + CREATE with `org_id` and `module_id` columns added |
| `workflow_executions` | Added `org_id` column with backfill from parent workflow |
| Route ordering | Moved `GET /executions` before `GET /:id` to prevent Express collision |
| Phase 50 wiring | `skill_departments` junction table queried in dept filter; `filterByBusinessRole()` applied |

### 5. System Resource org_id Backfill

All system resources (user_id IS NULL) backfilled with Synergi org_id:

| Table | Effect |
|-------|--------|
| `agents` | 79 system agents now org-scoped |
| `skills` | System skills now org-scoped |
| `actions` | System actions now org-scoped |
| `workflows` | System workflows now org-scoped |

---

## Phase 80: What Was Completed

### 1. In-Memory Health Cache & 5-Minute Interval

`modelAvailabilityService.js` now maintains a `providerStatusCache` (in-memory) alongside the existing database persistence:

| Export | Purpose |
|--------|---------|
| `isProviderHealthy(provider)` | Reads cache, returns boolean; empty cache = assume healthy (startup grace) |
| `updateProviderStatus(provider, status, error)` | Updates cache, emits `status-change` event if status changed |
| `getProviderStatusCache()` | Returns full cache snapshot for API/SSE consumers |
| `healthEventEmitter` | Node EventEmitter — emits `status-change` with `{ provider, oldStatus, newStatus, error, updatedAt }` |

5-minute `setInterval` replaces the daily cron as the primary health check mechanism. Daily cron retained as secondary (admin-configurable). Initial check runs on startup (non-blocking).

### 2. Circuit Breaker → Health Bridge

`CircuitBreaker` class in `reliability.js` now supports `onStateChange(callback)`. Provider services register callbacks:

- `CLOSED→OPEN` or `HALF_OPEN→OPEN`: marks provider unavailable
- `HALF_OPEN→CLOSED`: marks provider available

This gives **instant detection** — a provider outage is caught the moment the circuit breaker trips from real user traffic.

### 3. Fallback Resolution

22-model `FALLBACK_MAP` in `llmRegistry.js` with cross-provider fallback chains:

| Pattern | Example |
|---------|---------|
| Anthropic → OpenAI → Google | Sonnet 4.5 → GPT-4o → Gemini 2.5 Pro |
| OpenAI → Anthropic → Google | GPT-4o → Sonnet 4.5 → Gemini 2.5 Pro |
| Google → Anthropic → OpenAI | Gemini 2.5 Pro → Sonnet 4.5 → GPT-4o |
| Perplexity → None | No fallback (unique search capability) |

`fallbackService.js` provides `resolveModelWithFallback()` which returns the effective model+provider, applied at all 5 dispatch points in `chat.js` (3) and `agentService.js` (2).

### 4. SSE Health Stream

`GET /api/health/stream` (authenticated, compression-skipped):
- `event: init` — full cache on connection
- `event: status-change` — real-time provider transitions
- `:heartbeat` — 30-second keep-alive
- Auto-cleanup on client disconnect

### 5. Frontend Health Module

`public/js/llm-health.js` included on 6 pages (chat, agents, agent-runner, thought-leadership, research-studio, system-health):

| Feature | Implementation |
|---------|---------------|
| SSE auto-connect | Exponential backoff reconnect (max 30s) |
| `window.LLMHealth` API | `isProviderAvailable()`, `getProviderStatus()`, `getAllStatuses()` |
| `llm-health-change` event | Custom DOM event for UI component updates |
| Toast notifications | Provider DOWN/UP transitions shown via `showToast()` |
| Model dropdown graying | Unavailable options disabled with "(unavailable)" suffix, auto-restores |
| Fallback toast | Streaming: `type: 'fallback'` SSE event; Non-streaming: `data.fallback` in JSON |

---

## Phase 79: What Was Completed

### 1. Platform Admin Org Scope Selector (Context Page)

Platform admins now see an organization dropdown on the context assets page, enabling cross-org asset management:

| Feature | Description |
|---------|-------------|
| Org dropdown | Populated from `/api/organizations`, shown only for verified platform admins |
| "All Organizations" mode | Shows assets across all orgs (admin only) |
| Per-org filtering | Select a specific org to see only their assets |
| Impersonation lock | During impersonation, dropdown locks to the impersonated org |
| Default behavior | Non-admin users see no change; scoping via `currentOrgId` as before |

### 2. Org Chart Documentation Update

Updated `Insight-Org-Chart.md` to reflect the complete Parthenon agent rollout:

| Change | Before | After |
|--------|--------|-------|
| Named agent skills | 52 | 58 |
| Total skills | 78 | 84 |
| Executive team | Partial | Complete (Higgins, Jarvis, Alfred) |
| Cross-functional team | 5 agents | 8 agents (+Marley, Skyler, Jordan-B) |

---

## Phase 78: What Was Completed

### 1. Context Asset Consumer Remediation

Audited 20+ locations where context assets are consumed. Fixed stale-cache pattern across all frontend consumers:

| Page | Fix |
|------|-----|
| `agents.html` | Re-fetches on context modal open + `authFetch()` |
| `agent-runner.html` | Switched to `authFetch()` |
| `thought-leadership.html` | Clears selects before repopulating + `authFetch()` |
| `digest-sources.html` | Re-fetches on source add/edit + `authFetch()` |
| `digest.html` | Re-fetches on section add + `authFetch()` |

Backend fixes:
- `GET /api/context/assets/:id` — org ownership check (allows null-org platform assets)
- `GET /api/digest/context-assets` — fixed column: `type` → `asset_type`
- `digestPipeline.js` — fixed columns: `type, content` → `asset_type, content_text` (was silently empty)

### 2. Chat Save as Context Asset (Broken → Fixed)

`saveAsContextAsset()` in `chat.js` was posting to `/api/context` (non-existent) with invalid fields. Corrected to `/api/context/assets` with `asset_type: 'i360_knowledge'` and `content_json` via `authFetch()`.

### 3. Open Brain Visual Dashboard Redesign

Complete page rebuild with visual dashboard layout. Route converted to factory pattern with Supabase injection and `requireModule()` middleware. Help system integrated (user guide, help-registry, ALLOWED_DOCS).

### 4. Marketing Skills Team (First Parthenon Dept Rollout)

9 specialized Claude Code skills: orchestrator (Dakota), brand-voice (Harper), content (River), campaign (Sage), competitive (Blake), analytics (Finley), thought-leadership (Rowan), brand-review (Emery), icp-adapt (Avery-M). Shared context in `mkt-shared/synergi-context.md`.

### 5. Chat/Conversation Enhancements

Conversation route and service improvements with `chat.html` UI updates.

---

## Phase 77: What Was Completed

### 1. Two-Mode Page Restructure

Replaced the 7-section scrolling dashboard with a two-mode workflow cockpit:

| Mode | Components | Access |
|------|-----------|--------|
| **This Week** (default) | Content Card, Generate Card, Results Card, Upcoming, Recent | Page load |
| **Settings** (gear icon) | 5 tabs: Position, Pillars, Calendar, Visibility, Publishing & Integrations | Header gear icon |

### 2. Content Card Auto-Population

Current week's editorial calendar entry loaded automatically with:
- Title, pillar badge (4px left border in pillar color), format badge, status
- Series name and editorial context
- Empty state with "Go to Calendar Settings" CTA when no entry exists

### 3. Generate Card with Live Progress

- Ambient pre-flight dots loaded on page open (no button click required)
- 5-step pipeline: Article → AI Version → Image → LinkedIn → Quality
- 4 visual states per step: empty, in-progress (spinning + elapsed time), complete (check), failed (X + retry)
- ~90 second time estimate

### 4. Inline Results & Content Review

Results Card shows per-output rows with actions:
- Article: word count, Preview (rendered markdown), Edit (ModalService textarea)
- AI Version: Preview
- Image: thumbnail, Preview, Regenerate
- LinkedIn: post count, Preview (5 daily posts with hashtags)
- Quality checklist with pass/fail gates
- Publish targets (Blog, Notion, Social, Substack) with Publish Package button

**Content Review:** Navigating to a past week with stored content auto-populates the Results Card. Users review article, image, and marketing posts in one place.

### 5. Week Navigation

Clicking any week in Upcoming or Recent:
- Updates Content Card to selected week
- Updates header to show selected week number and date range
- Loads existing content into Results Card if available
- Changes Generate button to "Regenerate Package"

### 6. Publishing Streak

Simple counter ("10 weeks in a row") calculated from consecutive published weeks in the Recent section.

### 7. XSS Mitigation

Added sanitization to `renderPackageMarkdown()`: strips script tags, dangerous elements (iframe/object/embed/form), and neutralizes inline event handlers.

### 8. Accessibility

- `aria-live="polite"` on generation progress region
- `role="tablist"` / `role="tab"` / `role="tabpanel"` on settings tabs
- Focus management: Settings → first tab, This Week → generate CTA
- All status indicators have text labels (not just color)

---

## Phase 76: What Was Completed

### 1. TL Content Creation Workflow (tlContentService.js)

Ports the proven VS Code Content Creation System workflow into the Insight 360 web UI:

| Component | Description |
|-----------|-------------|
| `resolveEditorialContext()` | Resolves full editorial hierarchy from calendar entry: annual theme, quarterly pillar, monthly theme, series, cornerstone linking |
| `buildArticlePrompt()` | Format-specific structure templates (long: 7 sections, medium: 5, short: 4) with word targets per section |
| `buildLinkedInPrompt()` | Per-day templates (Mon=Insight Launch, Tue=Problem Spotlight, Wed=Framework Reveal, Thu=Story, Fri=Reflect) with brand hashtag rotation |
| `buildAiOptimizedPrompt()` | YAML front matter spec, self-contained paragraphs, inline definitions, author attribution, cross-links |
| `ensureYamlFrontMatter()` | Programmatic YAML construction from editorial context (never relies on LLM to produce valid YAML) |
| `runQualityGates()` | 7 checks: format length, voice patterns, cornerstone link, AI optimization, LinkedIn char limits, hashtag compliance, actionable insights |

### 2. Guardrail Enforcement Fix (Critical — All Agents)

Fixed systemic false positives: bright line keywords included common English words (human, safety, first, provide, information). Added 50+ high-frequency words to stop filter and length-normalized match threshold. Fixed broken incident logging (CHECK constraint mismatch).

### 3. Generation Settings (Phase 76b)

LLM model and context asset selection with saved preferences on `thought_leadership_profiles`. Cascade: request override → saved preference → agent default.

### 4. Frontend: Generate Weekly Package Modal

Full generation UI with editorial context preview, collapsible generation settings, progress overlay, rendered markdown tabs, image preview with prompt/regenerate, and quality checklist with actionable fix hints.

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

### 8. Post-Build Remediation (2026-03-15)

Support Settings page audit and bug fixes following initial deployment:

| # | Issue | Fix | File(s) |
|---|-------|-----|---------|
| 1 | Policies tab crash: `inputs.map is not a function` | `Array.isArray()` guard for non-array process data | `support-settings.html` |
| 2 | Chat Widgets tab 400 error: `org_id required` | Added `req.orgId` to fallback chain (matches auth middleware pattern) | `widgets.js` |
| 3 | Privacy tab invisible: toggle-slider covered entire page | Changed `<label class="toggle">` to `<label class="toggle-switch">` | `support-settings.html` |
| 4 | Help modal overlay blocked content in some browsers | Moved `backdrop-filter` and `pointer-events` to `.open` state only | `help-modal.css` |
| 5 | Privacy tab had no API persistence | Added `loadPrivacySettings()` and wired `savePrivacySettings()` to widget API | `support-settings.html` |
| 6 | Policy badge colors hardcoded | Changed to `var(--primary)` and `var(--success)` theme variables | `support-settings.html` |
| 7 | Stale "Phase 2" notice on Widget Config tab | Updated to reference Chat Widgets tab | `support-settings.html` |

### 9. Support Department & Deep Linking

- **Support department** added as standard department #7 (icon: `headset`, color: `#0ea5e9`)
- **Parthenon deep linking** — `handleDeepLink()` added to `parthenon.html` supporting `#tabName?dept=DeptName` URL format
- **Policies tab link** updated to `/parthenon.html#processes?dept=Support` for direct navigation
- **UX rule established**: always deep-link to exact tab/filter where user can act; minimize cross-page navigation

### 10. Taylor UI/UX Compliance Audit

**Verdict: COMPLIANT WITH CAVEATS (97%)**
- 28/31 checks passed, 1 low-severity accessibility caveat (toggle `aria-label`), 2 N/A
- All required includes present (styles, navigation, ModalService, help system, Lucide)
- Standard page header pattern, spacing variables, theme variables all correct
- ModalService used for all dialogs; `showToast()` for all notifications

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

## Files Modified/Created (Phase 85)

| File | Changes |
|------|---------|
| `db/phase85-artifact-system.sql` | Tables, indexes, RLS, triggers, module registration, strategy120 deactivation |
| `server/services/artifactService.js` | CRUD + storage service (factory pattern) |
| `server/routes/artifacts.js` | 10 REST endpoints with multer upload |
| `server/index.js` | Route wiring, strategy120 removal, artifacts registration |
| `public/artifacts.html` | Full browse/search/preview/upload page |
| `public/execute120.html` | My Artifacts card, strategy card removal |
| `public/strategy120.html` | Redirect to Execute 120 |
| `public/js/navigation.js` | Strategy120 nav entry removed |
| `public/js/help-registry.js` | Strategy120 removed, artifacts added |
| `server/routes/docs.js` | Artifacts guides added to whitelist |
| `__tests__/setup/testApp.js` | Artifacts route registration |
| `__tests__/unit/services/artifactService.test.js` | 10 unit tests |
| `__tests__/integration/routes/artifacts.test.js` | 8 integration tests |
| `documentation/guides/artifacts-user-guide.md` | User documentation |
| `documentation/guides/artifacts-technical-guide.md` | Technical documentation |

## Files Modified/Created (Phase 72-82)

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
| Testing | 9.8/10 | 684+ automated tests, artifact system tests added |
| Documentation | 10/10 | 36+ user guides, PM team exec summary, Annie PRD |
| Navigation | 10/10 | **Fixed** — org_id fallback + empty modules guard |
| Auth | 10/10 | **Fixed** — cookie auth, org membership fallback, structured roles |
| Agent/Skills Access | 10/10 | **Fixed** — duplicate `.or()` filter removed |
| PM Tooling | 10/10 | 11 specialist skills with 8 structured workflows |
| Support AI | 10/10 | Phase 71 foundation + widget configs live |

---

## Git Commits

| Hash | Message |
|------|---------|
| `a42938f` | Add platform admin org scope selector to context page, update org chart |
| `728c2bc` | Add Marketing Skills Team — 9 mkt-* Claude Code skills for Synergi marketing dept |
| `3362cda` | Open Brain Visual Dashboard Redesign — factory pattern, auth, module access |
| `d21b20e` | Chat & conversation enhancements + fix broken Save as Context Asset |
| `100be16` | Fix stale context asset dropdowns across all consumers |
| `3817eb4` | Add missing admin tiles: Embeddable Chat Widget, Customer Support AI, Open Brain, MCP Catalog |

---

## Next Steps

1. **Extend org scope to other admin pages** — Apply the same org selector pattern to agents, skills, and other admin-facing pages
2. **EventBus for cross-page asset updates** — Consider BroadcastChannel API for real-time context asset sync across open tabs
3. **Monitor digest context quality** — Previously empty context blocks should now contain actual content
4. **Phase 52** — Production deployment (Supabase Pro, custom domain)
5. **Phase 53** — Navigation restructure
