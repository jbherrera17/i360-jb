# Feature Planning — Consolidated Report

**Feature:** Annie Embeddable Chat Widget
**Workflow:** WF-01 (Feature Planning — PRD to Implementation Brief)
**Date:** 2026-03-14
**Orchestrator:** Avery
**Status:** COMPLETE — NEEDS DECISION on 0 items (all decisions made)

---

## Executive Summary

The Annie Chat Widget was assessed through a full WF-01 governance workflow with 5 subordinate agent delegations (Spec Writer, Security Analyst, Compliance Auditor, QA Analyst, Metrics Analyst) plus a complete FMEA. The existing PRD (v1) is directionally sound but requires a v2 revision incorporating 13 security requirements, 9 compliance controls, architectural decisions, and corrected cost modeling before implementation begins.

Key findings:
- **13 security launch blockers** (Alex) — all addressable with specified controls
- **9 compliance launch blockers** (Riley) — all addressable with privacy/consent/retention mechanisms
- **9 FMEA launch blockers** (RPN > 200) — all mitigatable to acceptable levels
- **LLM cost model discrepancy** — PRD estimated $12-18/mo; actual is ~$344/mo at 25K messages. Mitigated by Haiku tiering strategy (approved by human PM)
- **PHI storage contradiction** — resolved: PII redaction before storage (approved by human PM)

## Recommendation

**FIX REQUIRED — then SHIP**

The PRD needs a v2 revision before any code is written. All blockers have clear mitigation paths. No fundamental architecture change is needed. The feature is viable and strategically important.

**Rationale:** All 9 FMEA launch blockers have mitigation plans that reduce RPN below 200. Two residual High risks (prompt injection RPN 108, hallucination RPN 108) are inherent LLM risks that require ongoing monitoring but do not block launch. Security and compliance requirements are well-defined and implementable within the proposed 7-week timeline.

---

## Decisions Made by Human PM (JB)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| PHI handling | Redact PII before storage | Avoids BAA requirement; preserves review dashboard |
| LLM cost strategy | Haiku for simple FAQs, Sonnet for complex | Reduces cost from ~$0.11 to ~$0.04/conversation |
| Pricing | Keep $49/mo Starter add-on | Widget drives platform adoption; margin hit acceptable |
| Usage ceiling | Soft cap + auto-degrade | Notify at 80%, degrade to Haiku at 100%, never kill widget |
| Execution path | Dedicated `widgetAgentService.js` | Security isolation — restricted tool set |
| Sheets integration | Sync to context_asset every 15 min | Uses existing injection path; no code changes to contextInjection.js |
| Database schema | New `chat_widgets` table | Separate from `widget_configs`; supports multi-widget per org |
| Pre-chat fields | Configurable; email required by default | Lead capture preserved; PII stored separately from messages |
| Overage behavior | Soft cap + auto-degrade at ceiling | At 80%: notify. At 100%: Haiku-only + notify with projected cost |

---

## Subordinate Agent Reports

### Reese (Spec Writer) — PRD Gap Analysis
**Status:** Accepted
**Confidence:** High

**Component Inventory:** 34 components mapped (new + existing + modified).

**17 Failure Scenarios** covering:
- External dependency failures (5): Sheets API quota, spreadsheet deletion, Anthropic outage, Calendly nested iframe, Vimeo CSP
- Infrastructure failures (3): SSE disconnect, CORS misconfiguration, rate limit bypass
- Data integrity failures (3): RLS blocks public writes, message ordering race, session expiry
- UX failures (3): incorrect procedure info, hallucinated medical advice, broken video links
- Security failures (3): prompt injection, token extraction, visitor PHI disclosure

**8 Critical PRD Gaps:**
1. PHI storage contradiction — RESOLVED (redact before storage)
2. RLS blocks public writes — requires service key with explicit WHERE clauses
3. CORS design missing — requires server-side origin validation
4. `chat_widgets` vs `widget_configs` overlap — RESOLVED (new table)
5. Annie's execution path — RESOLVED (dedicated service)
6. Sheets integration — RESOLVED (sync to context_asset)
7. Session sliding expiry — requires schema update
8. Prompt injection defense — specified in security requirements

**Missing Acceptance Criteria identified:** 9 gaps (auth bypass verification, concurrent sessions, sliding expiry, LLM fallback, data freshness, prompt injection, PHI handling, nested iframe, token rotation)

**Missing NFRs:** Data retention, accessibility (WCAG), cold start latency, error tracking, PDF export library

---

### Alex (Security Analyst) — STRIDE Threat Model
**Status:** Accepted
**Confidence:** High

**21 threats identified** across 6 STRIDE categories:
- Spoofing: 3 (token forgery, origin spoofing, IP spoofing)
- Tampering: 3 (prompt injection, config tampering, Sheets poisoning)
- Repudiation: 2 (anonymous conversations, audit gaps)
- Information Disclosure: 4 (system prompt leak, cross-org exposure, credentials, cross-session)
- Denial of Service: 3 (rate limit bypass, SSE exhaustion, cost amplification)
- Elevation of Privilege: 3 (authenticated data access, tool execution, UUID extraction)

**13 launch blockers** (6 Critical + 7 High)

**15 security requirements (SEC-01 through SEC-15):**
- SEC-01: HMAC widget token with dedicated signing secret
- SEC-02: Server-side `allowed_domains` enforcement
- SEC-03: Public routes registered before `authenticate` middleware
- SEC-04: Restricted tool set (KB search + escalate only)
- SEC-05: `org_id` derived exclusively from widget token
- SEC-06: Stripped-down system prompt (no full soul config)
- SEC-07: `guardrailEnforcement.screenMessage()` on every public message
- SEC-08: LLM output filtering for prompt leakage
- SEC-09: Per-widget daily LLM spend cap + per-session message cap
- SEC-10: Per-widget aggregate rate limit
- SEC-11: Max concurrent SSE connections per widget
- SEC-12: Google Sheets data sanitization on import
- SEC-13: Sheets credentials never exposed to client
- SEC-14: Visitor message length limit (2000 chars)
- SEC-15: Widget token `is_active` check on every request

---

### Riley (Compliance Auditor) — Regulatory Review
**Status:** Accepted
**Confidence:** High

**8 regulatory domains reviewed:** HIPAA, FTC Health Claims, State Medical Practice, GDPR, CCPA, CAN-SPAM, ADA/WCAG, AI Transparency

**9 launch blockers:**
- R-01/R-02: HIPAA incidental PHI — RESOLVED (PII redaction + no BAA needed if redaction is effective)
- R-03: AI transparency disclosure required
- R-04/R-05: Medical disclaimer + individualized advice guardrails
- R-06: Data retention policy (recommend 90 days)
- R-07: Data deletion API endpoint
- R-08: Affirmative consent checkbox
- R-09: Privacy policy for widget

**Compliance Controls Required:**
1. Privacy policy covering widget data collection
2. Terms of service additions (AI disclosure, liability limitation)
3. Pre-chat disclaimer (specific language provided)
4. Data retention policy (90 days recommended)
5. Right-to-delete implementation
6. Consent mechanism with checkbox and privacy policy link

---

### Morgan (QA Analyst) — Test Plan
**Status:** Accepted
**Confidence:** High

**128 test cases** across 8 categories:
- Access control matrix: 15 tests (7 actor/role combinations)
- Data integrity: 25 tests (message ordering, session expiry, cache scenarios, export)
- Performance criteria: 8 tests (load, latency, concurrency, rate limiting)
- Destructive tests: 12 tests (API failures, widget deactivation, oversized messages)
- Rollback verification: 5 scenarios
- Security tests: 14 tests (prompt injection vectors, token attacks, DoS)
- Compliance tests: 13 tests (AI disclosure, consent, deletion, retention)
- FMEA functional failure modes: 25 modes

**Key new findings:**
- `widget_configs` UNIQUE(org_id) blocks multi-widget — resolved by new `chat_widgets` table
- `conversationLocks` Map cleanup has comparison bug causing memory leak
- No message length validation in `support.js`
- 13 architecture blockers synthesized

---

### Quinn (Metrics Analyst) — Measurement Framework
**Status:** Accepted with caveat (cost model requires PRD revision)
**Confidence:** High

**North Star Metric:** Scheduling Conversion Rate (SCR) — target 15% within 90 days

**6 SLOs:**
| SLO | Target |
|-----|--------|
| Availability | 99.5% (30-day rolling) |
| Time to First Token (p95) | < 3 seconds |
| Time to Complete Response (p95) | < 15 seconds |
| Error Rate | < 1% |
| Response Relevance | > 95% on-topic |
| Hallucination Rate | < 2% |

**17 new Prometheus metrics** to instrument
**7 runbook alerts** with escalation paths
**10 observability failure modes** for FMEA

**Critical finding — Cost Model Discrepancy:**
- PRD estimate: $12-18/month for 25K messages
- Actual estimate: ~$344/month (full conversation history replayed each turn)
- Root cause: `supportAgentService.js` sends cumulative history on every LLM call
- Resolution: Haiku tiering (approved) + conversation summarization after turn 3

**Recommended daily LLM spend caps:** $5/day Starter, $25/day Business, $100/day Enterprise

---

## Cross-Agent Findings

| Finding | Identified By | Corroborated By | Severity | Resolution |
|---------|--------------|-----------------|----------|------------|
| PHI storage contradiction | Reese (F-17) | Riley (R-01) | Critical | RESOLVED — PII redaction before storage |
| RLS blocks all public writes | Reese (F-09) | Morgan (DT-12) | Critical | Service key with explicit WHERE clauses |
| Prompt injection undefended | Alex (T-01, E-02) | Reese (F-15), Morgan (SEC tests) | Critical | Guardrail screening + restricted tools + output filtering |
| No LLM spend cap | Alex (D-03) | Quinn (cost model) | Critical | Daily budget per widget + auto-degrade |
| CORS design missing | Reese (F-07) | Alex (S-02), Quinn (FM-O006) | Critical | Server-side domain enforcement |
| LLM cost model wrong by 20x | Quinn (Section 9.3) | Unique | Critical | Haiku tiering + conversation summarization |
| Session sliding expiry missing | Reese (F-11) | Morgan (DI-05) | Medium | Schema update: extend expires_at on activity |
| 1 widget per org limit | Morgan (appendix) | Reese (gap #4) | High | New `chat_widgets` table (RESOLVED) |
| No data retention/deletion | Riley (R-06, R-07) | Unique | High | 90-day retention + DELETE endpoint |
| No AI transparency disclosure | Riley (R-03) | Unique | High | Pre-chat disclosure required |
| Full soul config exposed | Alex (I-01) | Reese (component) | Critical | Stripped-down system prompt |
| Sheets data not sanitized | Alex (T-03) | Quinn (FM-O002) | High | Schema validation + injection scanning |

---

## Risk Summary

| Category | Status | Blocking? | Details |
|----------|--------|-----------|---------|
| Security | REQUIRES MITIGATION | Yes (13 items) | 6 Critical + 7 High findings. All have specified mitigations (SEC-01 through SEC-15). |
| Compliance | REQUIRES MITIGATION | Yes (9 items) | HIPAA (PII redaction), AI disclosure, consent, privacy policy, retention, deletion. All have specified controls. |
| FMEA | REQUIRES MITIGATION | Yes (9 items) | 9 failure modes with RPN > 200. All mitigatable below threshold. 2 residual High (108) — inherent LLM risks. |
| Testing | NOT YET STARTED | Yes | 128 test cases defined. Must pass before launch. |
| Documentation | NOT YET STARTED | Yes | User guide (Jon), technical guide (Kevin), help-registry, ALLOWED_DOCS needed. |
| UI/UX Compliance | NOT YET ASSESSED | No (deferred to post-implementation gate) | 2 new admin pages + widget UI need Taylor's review after build. |
| Access Control | REQUIRES IMPLEMENTATION | Yes | Public endpoint auth model, org isolation, role-based conversation access. |

---

## Open Items

| # | Item | Owner | Deadline | Blocking? |
|---|------|-------|----------|-----------|
| 1 | PRD v2 revision with security/compliance/FMEA requirements | Reese (delegated) | Before implementation | Yes |
| 2 | BAA evaluation — confirm PII redaction eliminates BAA need | JB + legal | Before launch | Yes |
| 3 | Kevin (Jon's web dev) introduction for integration testing | JB | Before Phase 7 | Yes |
| 4 | Jon's Google Sheets API credentials | JB | Before Phase 3 | Yes |
| 5 | Privacy policy creation for widget | JB + legal | Before launch | Yes |
| 6 | Calendly embed URLs per procedure | Jon | Before Phase 5 | Yes |

---

## Follow-Up Actions

| # | Action | Owner | Deadline | Depends On |
|---|--------|-------|----------|-----------|
| 1 | Revise PRD v2 incorporating all findings | Avery → Reese | Next session | All decisions (DONE) |
| 2 | Write implementation brief with phased security controls | Avery → Reese | After PRD v2 | PRD v2 |
| 3 | Build Phase 1 (public API + widget auth + security controls) | Engineering | Week 1-2 | Implementation brief |
| 4 | Run FMEA mitigation Phase 1 concurrently with build | Engineering | Week 1 | FMEA report |
| 5 | Commission red-team prompt injection testing | Alex | Before beta | Phase 1 complete |
| 6 | Implement PII redaction library | Engineering | Week 1 | PRD v2 |
| 7 | Create privacy policy and consent mechanism | JB + legal | Week 2 | PRD v2 |
| 8 | Post-implementation: Taylor UI/UX audit | Avery → Taylor | After Phase 6 | Widget manager + review pages built |
| 9 | Post-implementation: Parker docs sync | Avery → Parker | After Phase 6 | User guide, help-registry, ALLOWED_DOCS |
| 10 | Pre-launch: WF-04 (Launch Readiness) review | Avery | Before Phase 8 | All phases complete |

---

## FMEA Summary

**Total failure modes analyzed:** 38
**Launch blockers (RPN > 200):** 9 — all with mitigation plans

| Risk Level | Count | Mitigated | Unmitigated |
|-----------|-------|-----------|-------------|
| Critical (RPN > 200) | 9 | 9 | 0 |
| High (RPN 101-200) | 19 | 19 | 0 |
| Medium (RPN 51-100) | 6 | N/A (accept) | 6 |
| Low (RPN 1-50) | 4 | N/A (accept) | 4 |

**Residual risks after mitigation:**
- FM-07 (Prompt injection): RPN 108 — inherent LLM risk, ongoing monitoring
- FM-10 (Hallucination): RPN 108 — inherent LLM risk, ongoing monitoring
- All other mitigated items: RPN < 50

**FMEA verdict:** PASS with ongoing monitoring for FM-07 and FM-10.

---

## Audit Log

```yaml
audit_log:
  workflow: WF-01
  feature: Annie Embeddable Chat Widget
  initiated_by: human PM (JB)
  timestamp_start: "2026-03-14T14:00:00Z"
  timestamp_end: "2026-03-14T18:30:00Z"

  delegations:
    - agent: reese (spec-writer)
      task_type: PRD gap analysis + component inventory + failure scenarios
      timestamp: "2026-03-14T14:15:00Z"
      status: accepted
      retries: 0
      findings_count: 17 failure scenarios, 8 critical gaps, 9 missing ACs
      critical_findings: 3 (PHI contradiction, RLS blocking, CORS design)
      notes: Comprehensive analysis. All gaps actionable.

    - agent: alex (security-analyst)
      task_type: STRIDE threat model
      timestamp: "2026-03-14T14:15:00Z"
      status: accepted
      retries: 0
      findings_count: 21
      critical_findings: 6
      notes: 13 launch blockers. 15 security requirements defined.

    - agent: riley (compliance-auditor)
      task_type: Regulatory and data governance review
      timestamp: "2026-03-14T14:15:00Z"
      status: accepted
      retries: 0
      findings_count: 18
      critical_findings: 2 (HIPAA PHI, no BAA)
      notes: 9 launch blockers. 6 compliance controls specified.

    - agent: morgan (qa-analyst)
      task_type: Test plan + functional failure modes
      timestamp: "2026-03-14T15:30:00Z"
      status: accepted
      retries: 0
      findings_count: 128 test cases, 25 failure modes
      critical_findings: 3 (multi-widget constraint, memory leak, no message length validation)
      notes: Comprehensive test plan ready for execution.

    - agent: quinn (metrics-analyst)
      task_type: Measurement framework + SLOs + observability runbook
      timestamp: "2026-03-14T15:30:00Z"
      status: accepted
      retries: 0
      findings_count: 6 SLOs, 17 metrics, 7 alerts, 10 observability failure modes
      critical_findings: 1 (cost model 20x discrepancy)
      notes: Cost model finding escalated to Tier 3. Resolved by human PM.

  decisions:
    - decision: PII redaction before storage (not BAA, not no-persist)
      rationale: Preserves review dashboard while avoiding HIPAA BAA requirement
      alternatives_considered: [execute BAA + store, don't persist messages]
      timestamp: "2026-03-14T16:00:00Z"
      escalated: true (Tier 3 — compliance)

    - decision: Haiku for simple FAQs, keep $49/mo pricing
      rationale: Reduces cost ~75%. Widget drives platform adoption — margin hit acceptable.
      alternatives_considered: [raise price to $99, Sonnet-only with summarization, combination]
      timestamp: "2026-03-14T16:00:00Z"
      escalated: true (Tier 3 — pricing)

    - decision: Soft cap + auto-degrade at usage ceiling
      rationale: Widget never goes dark on client site. Notify + degrade preserves UX.
      alternatives_considered: [hard stop, soft cap only, degraded mode only]
      timestamp: "2026-03-14T16:30:00Z"
      escalated: true (Tier 3 — billing)

    - decision: Dedicated widgetAgentService.js
      rationale: Security isolation — Critical finding E-02 (tool leakage) mitigated structurally
      alternatives_considered: [extend supportAgentService with mode param]
      timestamp: "2026-03-14T16:30:00Z"
      escalated: false

    - decision: Sync Sheets to context_asset every 15 min
      rationale: Simplest path — no changes to contextInjection.js. Medical info doesn't change frequently.
      alternatives_considered: [runtime fetch from Sheets API]
      timestamp: "2026-03-14T16:30:00Z"
      escalated: false

    - decision: New chat_widgets table (separate from widget_configs)
      rationale: Different auth models, different tool sets, different data flows. Supports multi-widget.
      alternatives_considered: [extend widget_configs]
      timestamp: "2026-03-14T16:30:00Z"
      escalated: false

    - decision: Pre-chat fields configurable, email required by default
      rationale: Lead capture is business value. Email stored separately from conversation content.
      alternatives_considered: [both optional, both required, configurable with different defaults]
      timestamp: "2026-03-14T16:30:00Z"
      escalated: false

  escalations:
    - tier: 3
      reason: "LLM cost model 20x discrepancy — $49/mo pricing viability at risk"
      resolution: "Human PM approved Haiku tiering + kept $49/mo pricing. Margin hit accepted."
      timestamp: "2026-03-14T16:00:00Z"

    - tier: 3
      reason: "PHI storage contradiction — compliance blocker"
      resolution: "Human PM chose PII redaction before storage"
      timestamp: "2026-03-14T16:00:00Z"

    - tier: 3
      reason: "Overage billing model — pricing decision"
      resolution: "Human PM chose soft cap + auto-degrade with overage notification"
      timestamp: "2026-03-14T16:30:00Z"

  quality_gates:
    - gate: PRD completeness
      status: fail
      notes: "PRD v1 has 8 critical gaps, 9 missing ACs, 6 missing NFRs. v2 revision required."
    - gate: Security review
      status: fail
      notes: "13 launch blockers identified. All have mitigations but none implemented yet."
    - gate: Compliance review
      status: fail
      notes: "9 launch blockers. Privacy policy, consent mechanism, retention policy needed."
    - gate: FMEA
      status: pass
      notes: "9 launch blockers all have mitigation plans reducing RPN below 200. 2 residual High (108) accepted with monitoring."
    - gate: Test plan
      status: pass
      notes: "128 test cases defined. Ready for execution post-implementation."
    - gate: Metrics/observability
      status: pass
      notes: "6 SLOs, 17 metrics, 7 alerts defined. Cost model discrepancy identified and resolved."

  outcome:
    status: completed
    deliverables:
      - "PRD gap analysis (Reese)"
      - "STRIDE threat model (Alex)"
      - "Compliance review (Riley)"
      - "Test plan — 128 cases (Morgan)"
      - "Measurement framework + SLOs + runbook (Quinn)"
      - "FMEA matrix — 38 failure modes"
      - "Consolidated report (this document)"
    open_items:
      - "PRD v2 revision"
      - "BAA evaluation with legal"
      - "Privacy policy creation"
      - "Kevin introduction"
      - "Google Sheets credentials"
      - "Calendly embed URLs"
    follow_ups:
      - action: "PRD v2 revision"
        owner: "Avery → Reese"
        deadline: "next session"
      - action: "Implementation brief"
        owner: "Avery → Reese"
        deadline: "after PRD v2"
      - action: "WF-04 Launch Readiness"
        owner: "Avery"
        deadline: "before Phase 8"

  security_summary:
    overall_risk: HIGH
    findings: {critical: 6, high: 7, medium: 5, low: 3, info: 0}
    blocking: true

  compliance_summary:
    status: non_compliant
    violations: 9
    blocking: true

  fmea_summary:
    total_failure_modes: 38
    critical_rpn: 9
    unmitigated_critical: 0
    blocking: false

  uiux_summary:
    pages_reviewed: 0
    compliance_percentage: N/A
    fixes_applied: 0
    critical_violations: 0
    verdict: "DEFERRED — post-implementation gate"
    blocking: false

  documentation_summary:
    chain_complete: false
    guides_created: 0
    guides_updated: 0
    drift_found: 0
    drift_resolved: 0
    blocking_drift: 0
    blocking: true
```
