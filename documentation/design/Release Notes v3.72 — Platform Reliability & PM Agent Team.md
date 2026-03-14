# Release Notes: Phase 72 — Platform Reliability, PM Agent Team & Annie PRD (v3.72)

**Version:** v3.72 | **Date:** March 14, 2026 | **Branch:** develop

---

## Summary

Four major areas shipped in this release:

1. **Critical Bug Fixes** — Nav panel and auth reliability restored
2. **PM Agent Team** — 11 specialist Claude Code skills for structured product governance
3. **Phase 67/68 Migrations** — Digest discovery, unified runtime, tags org-scoping
4. **Annie Chat Agent PRD** — Full product requirements for embeddable chat widget

---

## Critical Bug Fixes

### Nav Panel Empty Navigation (Critical)

**Symptom:** Users saw a minimal or empty navigation panel after login.

**Root cause:** The `/api/modules` endpoint only read `org_id` from the `x-org-id` header. When the frontend didn't send this header (cleared localStorage, login timing), the database function blocked all module access, resulting in an empty nav.

**Fix:** All three module endpoints now fall back to `req.orgId` (set by auth middleware from `users.default_org_id`). Additionally, navigation.js now falls back to the static nav config when the modules array is empty.

**Files:** `server/routes/modules.js`, `public/js/navigation.js`

### Auth & Role Architecture (Phase 70 Follow-Up)

| Fix | Description |
|-----|-------------|
| Cookie auth on `/me` | `/api/auth/me` now reads token from cookies, not just the Authorization header |
| Org membership fallback | Login finds first active org membership when `default_org_id` is NULL and backfills it |
| Structured roles | Navigation uses `user.roles.org.role` with fallback to legacy fields |
| Duplicate `.or()` fix | Removed Phase 46 org filter on agents and skills routes that conflicted with the access filter |

**Files:** `server/routes/auth.js`, `server/routes/agents.js`, `server/routes/skills.js`, `public/js/navigation.js`

---

## PM Agent Team (11 Skills)

A complete product management workflow built as Claude Code skills, coordinated by an orchestrator pattern:

| Agent | Role | Key Outputs |
|-------|------|-------------|
| **Avery** (Orchestrator) | Decomposes work, delegates, reviews, assembles reports | Consolidated reports with audit logs |
| **Reese** (Spec Writer) | PRDs, acceptance criteria, gap analysis | Implementation briefs, failure scenarios |
| **Morgan** (QA Analyst) | Test plans, access control validation | Verification checklists, destructive tests |
| **Quinn** (Metrics) | SLOs/SLIs, observability runbooks | Measurement frameworks, alert thresholds |
| **Jordan** (Release Coord) | Launch checklists, rollback plans | Readiness assessments, blast radius analysis |
| **Sam** (Incident Cmdr) | Post-mortems, root cause analysis | Incident timelines, pattern detection |
| **Riley** (Compliance) | Regulatory mapping, audit trails | Data governance reviews |
| **Alex** (Security) | STRIDE threat modeling, auth review | Security review artifacts |
| **Casey** (Bug Triage) | Severity scoring, root cause mapping | Engineering-ready bug briefs |
| **Parker** (Docs Sync) | Documentation chain management | Drift reports, release summaries |
| **Taylor** (UI/UX) | Frontend standards, accessibility | Compliance audits, direct fixes |

**8 Workflows:** Feature Planning, Docs Sync, Bug Intake, Launch Readiness, Feature Iteration, Feature Review, FMEA, Post-Incident Review

**Files:** `.claude/skills/pm-*/SKILL.md` (11 files), `documentation/design/PM Agent Team — Executive Summary.md`

---

## Phase 67/68 Migrations

| Migration | What It Does |
|-----------|-------------|
| `phase67-digest-discovery.sql` | Tables and indexes for the digest discovery system |
| `phase67-unified-runtime-backbone.sql` | Unified runtime backbone schema for agent runtime profiles |
| `phase68-tags-org-scoping.sql` | Org-scoped tags for multi-tenant tag isolation |

**Supporting files:** `server/services/digestDiscoveryService.js`, `public/js/modal-service/modals/DigestProgressModal.js`, unit tests, Postman test collection

---

## Annie Chat Agent PRD

Comprehensive product requirements for integrating Annie (Dr. Jon Mendelsohn's AI assistant) into i360 as an embeddable chat widget. Based on client meeting (March 13, 2026).

### What's Planned

- **Embeddable chat widget** — Public-facing, no auth, iframe deployment on surgical procedure pages
- **Google Sheets connector** — External data source for 5 procedures + video links
- **Calendly embed** — Appointment scheduling within the chat (reusing existing Calendly Professional)
- **Conversation review dashboard** — Search, filter, sentiment tracking, export (CSV/JSON/PDF)
- **Export to Context Asset** — One-click knowledge base update from conversation insights
- **Branded avatar** — HeyGen-generated static image, with animated and dynamic video phases planned

### Pricing Recommendation

- **Platform module:** Included in Business+ tiers, $49/mo add-on for Starter
- **Jon's deal:** $99/mo Business tier + $2,000 one-time setup (saves $912/year vs. standalone)

### Timeline

8 phases over ~7 weeks, from infrastructure through progressive deployment on 5 surgical pages.

**File:** `documentation/design/Annie Chat Agent — PRD, Pricing & Rollout Proposal.md`

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

## No Action Required

All fixes are deployed automatically via the develop branch to Railway. Users should see the full navigation panel immediately after the deploy completes. No database migrations are needed for this release (Phase 67/68 migrations are additive and can be run when ready).
