# PM Agent Team — Executive Summary

**Platform:** Insight 360
**Last Updated:** 2026-03-13

---

## Overview

The PM Agent Team is an 11-member autonomous product management unit built into the Insight 360 development workflow. Each agent is a Claude Code skill with a defined persona, responsibilities, and output format. Together they provide structured product governance — from spec writing through launch readiness — without requiring a dedicated human PM for every decision.

The team is coordinated by a central **Orchestrator** that decomposes work, delegates to specialists, reviews outputs, and assembles deliverables for human approval.

---

## The Team at a Glance

| Agent | Persona | Core Responsibility | Criticality |
|-------|---------|---------------------|-------------|
| **Orchestrator** | Avery | Coordination, delegation, quality gates | Mission-critical |
| **Spec Writer** | Reese | PRDs, implementation briefs, acceptance criteria | Mission-critical |
| **QA Analyst** | Morgan | Test plans, verification checklists, access control validation | Mission-critical |
| **Metrics Analyst** | Quinn | Measurement frameworks, SLOs/SLIs, observability | Mission-critical |
| **Release Coordinator** | Jordan | Launch checklists, rollback plans, readiness assessments | Mission-critical |
| **Incident Commander** | Sam | Incident classification, post-mortems, root cause analysis | Mission-critical |
| **Compliance Auditor** | Riley | Regulatory mapping, audit trails, data governance | Mission-critical |
| **Security Analyst** | Alex | STRIDE threat modeling, auth review, input validation | Standard |
| **Bug Triager** | Casey | Severity scoring, root cause mapping, engineering briefs | Standard |
| **Docs Sync** | Parker | Documentation chain, drift detection, help system | Standard |
| **UI/UX Manager** | Taylor | Frontend standards, design system, accessibility | Standard |

---

## Role Details and Benefits

### Avery — PM Orchestrator

**What they do:** Receives high-level product tasks and breaks them into delegated subtasks for the specialist agents. Reviews all outputs, resolves conflicts between agents, and assembles consolidated reports with audit logs.

**Benefits:**
- Single entry point for all product work — no need to know which specialist to engage
- Enforces consistent quality gates across all workflows
- Produces audit trails showing every decision and delegation
- Prevents work from falling through cracks by tracking all open items

---

### Reese — Spec Writer

**What they do:** Transforms problem statements into structured PRDs and implementation briefs. Defines acceptance criteria, traces data flows, identifies downstream impact, maps failure scenarios, and produces gap analyses.

**Benefits:**
- Ensures every feature starts with clear requirements before code is written
- Reduces scope creep by documenting what is and isn't included
- Identifies edge cases and failure modes early, before they become bugs
- Produces component inventories that feed directly into FMEA workflows

---

### Morgan — QA Analyst

**What they do:** Creates test plans, writes verification checklists, validates access control across roles/tiers/organizations, reviews test results, defines performance criteria, plans destructive tests, and verifies rollback procedures.

**Benefits:**
- Catches access control gaps across the multi-tenant hierarchy before they reach production
- Ensures every feature has a documented verification path
- Destructive testing identifies what breaks when things go wrong, not just when they go right
- Rollback verification gives confidence that failed releases can be reversed safely

---

### Quinn — Metrics Analyst

**What they do:** Designs measurement frameworks, defines north-star metrics and guardrail thresholds, sets SLOs/SLIs, creates observability runbooks, sets alert thresholds, and identifies observability failure modes.

**Benefits:**
- Every feature ships with measurable success criteria, not just subjective assessments
- Guardrail metrics prevent optimization of one metric from degrading others
- SLOs/SLIs create shared language between product and engineering for reliability
- Observability runbooks ensure on-call teams know exactly what to check when alerts fire

---

### Jordan — Release Coordinator

**What they do:** Prepares launch checklists, writes rollback plans, conducts readiness assessments, evaluates risk registers, designs progressive rollout protocols, assesses blast radius, and verifies incident response readiness.

**Benefits:**
- Structured go/no-go process prevents premature launches
- Progressive rollout protocols limit blast radius when issues emerge post-deploy
- Rollback plans are written before launch, not improvised during incidents
- Risk registers create institutional memory of what has gone wrong before

---

### Sam — Incident Commander

**What they do:** Classifies production incidents by severity, coordinates response, builds incident timelines, conducts post-mortems, analyzes root causes, tracks follow-up actions, and detects patterns across multiple incidents.

**Benefits:**
- Consistent severity classification ensures the right level of response
- Structured timelines and post-mortems turn incidents into learning opportunities
- Pattern detection across incidents reveals systemic issues that individual fixes miss
- Follow-up tracking prevents "we'll fix that later" from becoming "we forgot about that"

---

### Riley — Compliance Auditor

**What they do:** Maps regulatory requirements to features, verifies audit trails, reviews data governance (PII handling, retention, deletion), checks consent and disclosure requirements, validates access control for compliance, and assesses data exposure after incidents.

**Benefits:**
- Compliance is checked continuously, not just before audits
- PII handling and data retention policies are verified against actual implementation
- Audit trails are validated to ensure they capture what regulators require
- Post-incident data exposure assessments happen immediately, not as an afterthought

---

### Alex — Security Analyst

**What they do:** Performs STRIDE threat modeling, reviews authentication and authorization implementations, audits input validation, checks data exposure across tenant boundaries, and reviews dependency vulnerabilities.

**Benefits:**
- STRIDE threat modeling provides systematic coverage rather than ad-hoc security reviews
- Multi-tenant boundary checks are critical for a platform serving multiple organizations
- Input validation audits catch injection vectors before they reach production
- Dependency reviews flag known vulnerabilities in third-party packages

---

### Casey — Bug Triager

**What they do:** Normalizes bug reports into a consistent format, assigns severity scores with rationale, maps root causes to specific modules and files, proposes fix approaches, and produces engineering-ready briefs.

**Benefits:**
- Consistent severity scoring prevents all bugs from being treated as "urgent"
- Root cause mapping to specific files accelerates developer triage
- Engineering-ready briefs mean developers can start fixing immediately, not investigating
- Normalized format makes it easy to track bug trends over time

---

### Parker — Docs Sync

**What they do:** Syncs roadmap and blueprint docs after releases, detects documentation drift, updates user and technical guides, ensures help system registration, and verifies the four-point documentation chain (user guide, help registry, ALLOWED_DOCS whitelist, technical guide).

**Benefits:**
- Documentation stays current with actual features, not months behind
- Drift detection catches when code changes aren't reflected in docs
- The four-point chain verification ensures the in-app help system actually works
- Release summaries provide stakeholders with clear changelogs

---

### Taylor — UI/UX Manager

**What they do:** Audits frontend standards compliance, reviews visual consistency, evaluates new UI patterns, checks accessibility, enforces design system integrity, and can directly fix violations found during review.

**Benefits:**
- Consistent user experience across all 34+ HTML pages
- Accessibility issues are caught during development, not after user complaints
- Design system enforcement prevents visual fragmentation as the platform grows
- Auto-invoked after frontend changes, so nothing ships without review

---

## How They Work Together

### Workflow System

The team operates through 8 structured workflows, each with defined inputs, agent assignments, and deliverables:

| Workflow | Purpose | Key Agents |
|----------|---------|------------|
| **WF-01: Feature Planning** | PRD through implementation brief | Reese, Morgan, Quinn, Alex |
| **WF-02: Docs Sync** | Post-release documentation updates | Parker, Taylor |
| **WF-03: Bug Intake** | Triage through engineering brief | Casey, Morgan |
| **WF-04: Launch Readiness** | Go/no-go assessment | Jordan, Morgan, Riley, Quinn, Alex |
| **WF-05: Feature Iteration** | Spec updates for existing features | Reese, Morgan, Quinn |
| **WF-06: Feature Review** | Audit and remediation of shipped features | Morgan, Riley, Alex, Taylor |
| **WF-07: FMEA** | Failure mode and effects analysis | All agents contribute failure modes from their domain |
| **WF-08: Post-Incident Review** | Structured post-mortems | Sam, Riley, Quinn |

### Collaboration Pattern

```
Human Request
    │
    ▼
┌──────────┐
│  Avery   │  Orchestrator decomposes the task
│ (Orch.)  │  and identifies which specialists are needed
└────┬─────┘
     │
     ├──► Reese (Spec)  ──► Morgan (QA)    Spec feeds test plans
     ├──► Quinn (Metrics)                   Metrics inform SLOs
     ├──► Alex (Security)                   Threat model informs guardrails
     ├──► Riley (Compliance)                Compliance gates launch
     │
     ▼
┌──────────┐
│  Avery   │  Reviews all outputs, resolves conflicts,
│ (Orch.)  │  assembles consolidated deliverable
└────┬─────┘
     │
     ▼
Human Approval
```

### Shared Context Assets

All agents draw from 8 shared context assets to ensure consistency:

1. **Platform Access Model** — Subscription tiers, roles, module gating
2. **Codebase Architecture** — Tech stack, directory structure, deployment
3. **Active Constraints** — Known issues, technical debt, conventions
4. **Product Roadmap** — Phase tracking, active initiatives
5. **Module Registry** — All modules with tier requirements
6. **Test Infrastructure** — Jest/Playwright setup and commands
7. **Documentation Map** — Guide locations, help system structure
8. **Stakeholder Profiles** — Communication templates for different audiences

---

## Key Design Principles

1. **Specialization over generalization** — Each agent has a focused domain, producing deeper analysis than a single generalist could
2. **Orchestrator pattern** — Avery prevents coordination overhead from falling on the human; one request triggers the right specialists automatically
3. **Audit by default** — Every workflow produces an audit log showing what was checked, by whom, and what was decided
4. **Auto-invocation** — Docs Sync and UI/UX Manager trigger automatically after relevant changes, catching drift without manual intervention
5. **Human-in-the-loop** — Agents produce deliverables for human approval; they advise and prepare, but don't ship autonomously
