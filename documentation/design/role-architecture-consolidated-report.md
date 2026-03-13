# WF-06: Feature Review & Remediation — Consolidated Report

**Feature:** Organization Setup & Role Management Streamlining
**Workflow:** WF-06
**Date:** 2026-03-13
**Orchestrator:** Avery
**Status:** ESCALATED — Critical security finding requires immediate fix before proceeding

---

## Executive Summary

Insight 360 has accumulated four overlapping role systems across its schema evolution (Phases 13, 39, 44), causing confusion in org setup, user management, and access control. The audit identified 7 architectural issues, 3 Critical security vulnerabilities (including an active privilege escalation vector), and a broken invite flow. This report provides a 4-phase remediation plan with implementation brief, threat model, and test plan.

## Recommendation

**FIX REQUIRED — with CRITICAL security hotfix first**

1. **Immediate hotfix:** Add `requirePlatformAdmin()` middleware to all `/api/users` routes (V-02)
2. **Then execute 4-phase streamlining** in order: deprecate `users.role` → fix `/me` response → fix invite flow → move `business_role` per-org

**Rationale:** The `/api/users` privilege escalation (V-02) is an active vulnerability independent of the streamlining work. The 4-phase plan addresses all 7 architectural issues with a safe migration path that preserves backward compatibility during transition.

---

## Subordinate Agent Reports

### Reese (Spec Writer) — Implementation Brief
**Status:** Accepted
**Confidence:** High

**Key Findings:**
- `users.role` is actively read in 15+ locations across middleware, routes, and utils
- Two duplicate `requireAdmin` implementations with different logic
- Invite flow confirmed broken: `org-members.js` lines 267 and 286 both set `status: 'active'` immediately
- `can_access_module()` reads `business_role` from `users` table (org-agnostic)

**Deliverable:** 4-phase implementation brief with exact file-by-file change lists, new `requireOrgAdmin()` middleware spec, new `/me` response shape, pre-migration audit queries, failure scenarios with mitigations, and acceptance criteria per phase.

**Full output:** `documentation/design/role-architecture-streamlining-brief.md`

---

### Alex (Security Analyst) — STRIDE Threat Model
**Status:** Accepted with CRITICAL escalation
**Confidence:** High

**Findings by Severity:**
- **3 Critical:** V-02 (`/api/users` routes unprotected — privilege escalation), V-01 (`is_admin` conflation), E-01 (migration window privilege gap)
- **5 High:** V-03 (duplicate `requireAdmin`), V-04 (premature invite activation), V-05 (impersonation without audit), R-01 (no role change audit trail), D-01 (premature `users.role` removal risk)
- **4 Medium:** V-06 (search parameter injection), V-07 (`requirePageAuth` bypass when Supabase unavailable), S-02 (cached profile staleness), E-02 (`business_role` move access gap)
- **3 Low:** I-01 (role architecture leakage in `/me` response), I-02 (error messages expose module requirements), dev bypass flag

**CRITICAL FINDING — V-02:**
> `/api/users` routes (`server/routes/users.js`) have NO authorization middleware. Any authenticated user can call `PUT /api/users/:id/assignments` with `{ "platform_admin": { "role": "super_admin" } }` to grant themselves full platform admin access. This is verified in the code — the route is mounted at `/api/users` in `index.js` with no middleware applied.

**Migration Risk Assessment:** Alex recommends a 4-step safe order: Prepare (no breaking changes) → Dual-Write → Migrate Checks → Cleanup. Feature flags recommended for auth check migration. 30-day observation period before dropping deprecated columns.

---

### Morgan (QA Analyst) — Test Plan
**Status:** Accepted
**Confidence:** High

**Deliverables:**
- 14 primary test personas (P1-P14) covering every role combination
- 6 compound edge cases for cross-cutting scenarios
- Access control verification for every protected route (before/after)
- Regression matrix mapping all personas against key operations
- Pre/post migration SQL verification queries
- 14 destructive test cases including privilege escalation attempts
- Phase-by-phase verification checklists with specific file:line references
- Recommended new test files and test case specifications

**Key Risk Identified:** P1 (Legacy Admin with `users.role='admin'` but not in `platform_admins`) will lose all admin access after Phase 1 unless migrated first. This is the highest-risk regression.

**Full output:** `documentation/test-plans/role-architecture-streamlining-test-plan.md`

---

## Cross-Agent Findings

| Finding | Identified By | Corroborated By | Severity | Resolution |
|---------|--------------|-----------------|----------|------------|
| `/api/users` routes have no auth guards | Alex (V-02) | Reese (file audit) | **CRITICAL** | Immediate hotfix: add `requirePlatformAdmin()` |
| `is_admin` boolean conflates 3 admin concepts | Reese, Alex (V-01) | Morgan (Phase 2 tests) | **CRITICAL** | Phase 2: structured `roles` object |
| Legacy admins not in `platform_admins` will lose access | Reese (failure scenario) | Morgan (P1 persona, regression matrix) | **HIGH** | Pre-migration audit query + backfill |
| Invited users get immediate `active` org membership | Reese (code audit) | Alex (V-04), Morgan (P9 persona) | **HIGH** | Phase 3: set `status: 'pending'` |
| `business_role` is per-user, not per-org | Reese (architecture) | Alex (E-02) | **MEDIUM** | Phase 4: move to `organization_members` |
| No audit trail for role changes | Alex (R-01) | Unique | **HIGH** | Create `role_change_audit` table |
| Impersonation has no persistent audit | Alex (V-05) | Unique | **HIGH** | Persist impersonation sessions to DB |
| Org admin can self-promote to owner | Morgan (D14) | Unique | **MEDIUM** | Design decision needed |

---

## Risk Summary

| Category | Status | Blocking? | Details |
|----------|--------|-----------|---------|
| Security | **FAIL** | **YES** | V-02: Active privilege escalation via `/api/users`. 3 Critical, 5 High findings. |
| Compliance | N/A | No | Not invoked — no PII/regulatory scope in this review |
| FMEA | N/A | No | Not invoked — remediation, not new feature launch |
| Testing | **FAIL** | **YES** | No tests exist for role migration. Test plan produced but not yet implemented. |
| Documentation | PASS | No | Implementation brief and test plan produced |
| Access Control | **FAIL** | **YES** | Multiple routes have inconsistent or missing auth checks |

---

## Open Items

| # | Item | Owner | Deadline | Blocking? |
|---|------|-------|----------|-----------|
| 1 | Fix `/api/users` privilege escalation (V-02) | Engineering | **Immediately** | **YES** |
| 2 | Decision: Should org admins be able to self-promote to owner? (D14) | Human PM | Before Phase 3 | No |
| 3 | Pre-migration audit: identify all `users.role='admin'` users not in `platform_admins` | Engineering | Before Phase 1 | YES |
| 4 | Decision: Create `role_change_audit` table? (R-01) | Human PM | Before Phase 1 | No |
| 5 | Decision: Feature flag approach for auth migration? (Alex recommendation) | Engineering | Before Phase 1 | No |

---

## Follow-Up Actions

| # | Action | Owner | Deadline | Depends On |
|---|--------|-------|----------|-----------|
| 1 | Hotfix: Add `requirePlatformAdmin()` to `/api/users` routes | Engineering | 2026-03-14 | None |
| 2 | Run pre-migration audit queries (Section 6 of brief) | Engineering | Before Phase 1 | #1 |
| 3 | Backfill `platform_admins` for all `users.role='admin'` users | Engineering | Before Phase 1 | #2 |
| 4 | Phase 1: Deprecate `users.role` (3-4 days) | Engineering | TBD | #3 |
| 5 | Phase 2: Fix `/me` response shape (1-2 days) | Engineering | TBD | #4 |
| 6 | Phase 3: Fix invite flow (1 day) | Engineering | TBD | #4 |
| 7 | Phase 4: Move `business_role` to `organization_members` (2-3 days) | Engineering | TBD | #4 |
| 8 | Implement test cases per Morgan's test plan | Engineering | Per phase | Each phase |

---

## Audit Log

```yaml
audit_log:
  workflow: WF-06
  feature: Organization Setup & Role Management
  initiated_by: human PM
  timestamp_start: 2026-03-13T00:00:00Z
  timestamp_end: 2026-03-13T00:00:00Z

  delegations:
    - agent: reese (spec-writer)
      task_type: implementation_brief
      status: accepted
      retries: 0
      findings_count: 7
      critical_findings: 0
      notes: "Comprehensive brief with 4-phase plan, 15+ file audit, exact line references"

    - agent: alex (security-analyst)
      task_type: stride_threat_model
      status: accepted
      retries: 0
      findings_count: 15
      critical_findings: 3
      notes: "V-02 escalated as Tier 3. Migration risk assessment included."

    - agent: morgan (qa-analyst)
      task_type: test_plan
      status: accepted
      retries: 0
      findings_count: 14
      critical_findings: 0
      notes: "14 personas, 14 destructive tests, phase-by-phase checklists"

  decisions:
    - decision: "Escalate V-02 (/api/users unprotected) as Tier 3 immediate fix"
      rationale: "Active privilege escalation vector in production"
      alternatives_considered: ["Bundle into Phase 1"]
      escalated: true

    - decision: "Accept 4-phase sequential migration plan"
      rationale: "Phases have dependencies; parallel execution risks data integrity"
      alternatives_considered: ["Big-bang migration", "Parallel phases"]
      escalated: false

  escalations:
    - tier: 3
      reason: "V-02: /api/users routes have no authorization. Any authenticated user can grant themselves super_admin."
      resolution: "pending — awaiting human PM decision"

  quality_gates:
    - gate: "Spec completeness"
      status: pass
      notes: "All 4 phases specified with file-level detail"
    - gate: "Security review"
      status: fail
      notes: "3 Critical findings — V-02 blocks proceeding"
    - gate: "Test plan completeness"
      status: pass
      notes: "Full coverage across personas, phases, edge cases"

  outcome:
    status: escalated_to_human
    deliverables:
      - "documentation/design/role-architecture-streamlining-brief.md"
      - "documentation/test-plans/role-architecture-streamlining-test-plan.md"
      - "documentation/design/role-architecture-consolidated-report.md"
    open_items:
      - "V-02 hotfix required before Phase 1"
      - "Design decision on org admin self-promotion to owner"
      - "Decision on role_change_audit table"
    follow_ups:
      - "Hotfix /api/users routes — Engineering — 2026-03-14"
      - "Run pre-migration audit queries — Engineering — before Phase 1"
      - "Execute 4-phase plan — Engineering — TBD"

  security_summary:
    overall_risk: CRITICAL
    findings: {critical: 3, high: 5, medium: 4, low: 3, info: 0}
    blocking: true
```
