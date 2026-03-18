# Insight 360 — AI Agent Org Chart

**Last Updated:** 2026-03-17

---

## Overview

Insight 360 operates with **58 named AI agent skills** organized into seven department teams, one cross-functional team, and utility skills. All agents follow an **orchestrator-to-specialist** delegation pattern aligned with the Parthenon governance framework.

```
                          ┌───────────────┐
                          │   Human PM    │
                          │   (James)     │
                          └──────┬────────┘
                                 │
                          ┌──────┴──────┐
                          │  Executive  │
                          │  exec-*(3)  │
                          │  Morgan-E   │
                          └──────┬──────┘
                                 │
       ┌──────┬──────┬──────┬────┴─┬──────┬──────┬────────────┐
       │      │      │      │      │      │      │            │
  ┌────┴───┐┌─┴────┐┌┴─────┐┌┴─────┐┌┴─────┐┌┴─────┐┌─┴──────────┐
  │Product ││Mktg  ││Sales ││Financ││Supprt││  Ops ││Cross-Funct.│
  │pm-(11) ││mkt(9)││sal(8)││fin(6)││sup(6)││ops(6)││ biz-* (8)  │
  │ Avery  ││Dakota││Tatum ││Marlow││Sloan ││RilyO ││(Any Orch)  │
  └────┬───┘└──┬───┘└──┬───┘└──┬───┘└──┬───┘└──┬───┘└──┬─────────┘
       │       │       │       │       │       │       │
   [10 agt][8 agt] [7 agt] [5 agt] [5 agt] [5 agt] [8 shared]
```

---

## Product Management Team

Led by **Avery** (PM Orchestrator). Responsible for feature planning, security, QA, compliance, documentation, metrics, incident response, and release coordination.

| Agent | Persona | Skill ID | Role | Mission-Critical |
|-------|---------|----------|------|:----------------:|
| **Avery** | Senior PM | `pm-orchestrator` | Orchestrator — decomposes work, delegates, reviews, assembles deliverables, logs decisions | -- |
| **Reese** | Spec Writer | `pm-spec-writer` | PRDs, implementation briefs, acceptance criteria, gap analysis, failure scenarios | Yes |
| **Morgan** | QA Analyst | `pm-qa-analyst` | Test plans, verification checklists, access control validation, destructive testing | Yes |
| **Alex** | Security Analyst | `pm-security-analyst` | STRIDE threat modeling, auth/authz audits, input validation, data exposure review | -- |
| **Riley** | Compliance Auditor | `pm-compliance-auditor` | Regulatory mapping, audit trails, data governance (PII), consent verification | Yes |
| **Quinn** | Metrics Analyst | `pm-metrics-analyst` | Measurement frameworks, SLOs/SLIs, observability runbooks, alert thresholds | Yes |
| **Sam** | Incident Commander | `pm-incident-commander` | Severity classification, incident timelines, post-mortems, pattern detection | Yes |
| **Jordan** | Release Coordinator | `pm-release-coord` | Launch checklists, rollback plans, readiness assessments, progressive rollout | Yes |
| **Parker** | Docs Sync Manager | `pm-docs-sync` | Documentation chain management, drift detection, help system registration | -- |
| **Taylor** | UI/UX Manager | `pm-uiux-manager` | Design system enforcement, frontend standards audits, accessibility, visual consistency | -- |
| **Casey** | Bug Triager | `pm-bug-triager` | Bug normalization, severity scoring, root-cause mapping, engineering-ready briefs | -- |

### PM Workflows

| ID | Workflow | Trigger |
|----|----------|---------|
| WF-01 | Feature Planning (PRD to Implementation) | New feature request |
| WF-02 | Documentation Sync | Post-release |
| WF-03 | Bug Intake | Bug report |
| WF-04 | Launch Readiness | Pre-launch |
| WF-05 | Feature Iteration | Enhancement request |
| WF-06 | Feature Review & Remediation | Audit existing feature |
| WF-07 | Failure Mode & Effects Analysis (FMEA) | Pre-launch (mandatory) |
| WF-08 | Post-Incident Review | After production incident |

---

## Marketing Team

Led by **Dakota** (Marketing Orchestrator). Responsible for content creation, brand voice, competitive intelligence, campaign strategy, analytics, and thought leadership.

| Agent | Persona | Skill ID | Role | Marketplace Map |
|-------|---------|----------|------|:---------------:|
| **Dakota** | Marketing Director | `mkt-orchestrator` | Orchestrator — coordinates marketing work, delegates, reviews, assembles deliverables | -- |
| **River** | Content Creator | `mkt-content` | Deployment-ready content: emails, blog posts, LinkedIn, landing pages, case studies | `/content-creation` |
| **Harper** | Brand Voice Guardian | `mkt-brand-voice` | Enforces JB's Voice DNA, calibrates tone, audits voice consistency across channels | `/brand-voice` |
| **Emery** | Brand Reviewer | `mkt-brand-review` | Final QA gate — voice compliance, values alignment, bright lines, accuracy | `/brand-review` |
| **Sage** | Campaign Strategist | `mkt-campaign` | Campaign planning, audience targeting, channel mix, messaging frameworks | `/campaign-planning` |
| **Blake** | Competitive Intelligence | `mkt-competitive` | Competitor research, battlecards, positioning analysis, 'Why We Win' framework | `/competitive-analysis` |
| **Finley** | Performance Analyst | `mkt-analytics` | Marketing ROI, attribution reports, channel performance, optimization strategies | `/performance-analytics` |
| **Rowan** | Thought Leadership | `mkt-thought-leadership` | JB's signature content: articles, LinkedIn authority posts, keynotes, podcasts | *(Synergi-specific)* |
| **Avery-M** | ICP Adapter | `mkt-icp-adapt` | Adapts content for 8 buyer personas across 3 ICP segments | *(Synergi-specific)* |

### Marketing Workflows

| ID | Workflow | Trigger |
|----|----------|---------|
| WF-M01 | Campaign Planning (End-to-End) | New campaign need |
| WF-M02 | Content Creation (Single Piece) | Content request |
| WF-M03 | Thought Leadership | JB authority content |
| WF-M04 | Competitive Intelligence | Competitor tracking |
| WF-M05 | Performance Review | Metrics analysis |
| WF-M06 | Brand Voice Calibration | Voice audit |
| WF-M07 | Multi-Persona Content Adaptation | Persona-specific versions |

### Marketing Buyer Personas (Avery-M targets)

| Persona | Role | ICP Segment |
|---------|------|-------------|
| Victor | CEO | Coaches/Consultants, Professional Services, Healthcare |
| Emma | COO | Coaches/Consultants, Professional Services, Healthcare |
| Taylor | CTO | Professional Services, Healthcare |
| Alex | CFO | Professional Services, Healthcare |
| Charlie | Dept Head | All segments |
| Bella | Marketing | All segments |
| Ryan | Sales | All segments |
| Patricia | HR | Professional Services, Healthcare |

---

## Sales Team

Led by **Tatum** (Sales Orchestrator). Responsible for pipeline management, deal strategy, account research, outreach, proposals, and sales enablement. Uses Synergi's **Align-Prove-Partner** methodology.

| Agent | Persona | Skill ID | Role | Marketplace Map |
|-------|---------|----------|------|:---------------:|
| **Tatum** | Sales Director | `sales-orchestrator` | Orchestrator — coordinates sales team, manages deal flow | -- |
| **Kieran** | Account Researcher | `sales-account-research` | Company intel, stakeholder mapping, engagement opportunities | `account research` |
| **Jules** | Call Prep | `sales-call-prep` | Meeting agendas, discovery questions, post-call summaries | `call prep` + `call summary` |
| **Remy** | Outreach Creator | `sales-outreach` | Personalized email sequences, LinkedIn messages, follow-ups | `outreach drafting` + `daily briefings` |
| **Hayden** | Pipeline Analyst | `sales-pipeline` | Pipeline health, weighted forecasts, deal risk flagging | `pipeline review` + `sales forecast` |
| **Drew** | Proposal Writer | `sales-proposal` | Proof-of-Value proposals, SOWs, subscription recommendations | `asset creation` |
| **Logan** | Deal Strategist | `sales-deal-strategy` | MEDDIC + Values qualification, win strategy, stalled deal diagnosis | *(Synergi-specific)* |
| **Reese-S** | Sales Enablement | `sales-enablement` | Deal-specific battlecards, talk tracks, objection handling | `competitive intelligence` |

### Sales Workflows

| ID | Workflow | Trigger |
|----|----------|---------|
| WF-S01 | New Lead Processing | Inbound/outbound lead |
| WF-S02 | Call Preparation | Upcoming meeting |
| WF-S03 | Proposal Development | Qualified opportunity |
| WF-S04 | Pipeline Review | Weekly cadence |
| WF-S05 | Outreach Campaign | Target segment |
| WF-S06 | Deal Strategy Session | Active deal needs strategy |
| WF-S07 | Post-Call Follow-Up | After meeting |

### Cross-Team Connections
- Blake (mkt-competitive) provides market-level competitive intelligence → Reese-S adapts for deal-specific situations
- Kendall (biz-pricing) provides pricing analysis → Drew includes in proposals
- Morgan-L (biz-legal) reviews contract terms → Drew references in SOWs

---

## Finance Team

Led by **Marlowe** (Finance Orchestrator). Responsible for financial operations: month-end close, budgeting, SaaS revenue metrics, financial reporting, and compliance.

| Agent | Persona | Skill ID | Role | Marketplace Map |
|-------|---------|----------|------|:---------------:|
| **Marlowe** | Finance Director | `fin-orchestrator` | Orchestrator — close, budgets, reporting, compliance | -- |
| **Sasha** | Financial Controller | `fin-controller` | GL, journal entries, account reconciliation, P&L, balance sheet | `month-end close` + `reconciliation` + `statements` |
| **Noel** | Budget & Forecast | `fin-budget-forecast` | Budgets, rolling forecasts, variance analysis, scenario planning | `budget variance` + `rolling forecasts` |
| **Harley** | Revenue Operations | `fin-revenue-ops` | MRR/ARR tracking, churn, LTV, CAC, cohort analysis | *(Synergi-specific)* |
| **Wren** | Financial Reporting | `fin-reporting` | Board packages, executive dashboards, investor reports | `statements` (presentation) |
| **Oakley** | Financial Compliance | `fin-compliance` | Tax prep, SOX readiness, regulatory calendar, audit workpapers | `SOX compliance` |

### Finance Workflows

| ID | Workflow | Trigger |
|----|----------|---------|
| WF-F01 | Month-End Close | Monthly cadence |
| WF-F02 | Budget Cycle | Quarterly/annual |
| WF-F03 | Revenue Review | Weekly cadence |
| WF-F04 | Board/Investor Package | Quarterly |
| WF-F05 | Compliance Cycle | Quarterly/annual |

### Cross-Team Connections
- Cameron (biz-finance) handles ad-hoc business cases; fin-* handles operational finance
- Kendall (biz-pricing) provides pricing strategy; Marlowe validates with actual cost data
- Harley sends churn risk alerts to both Marlowe AND Tatum (Sales)

---

## Support Team

Led by **Sloan** (Support Orchestrator). Manages the human operations layer AROUND the I-360 Support AI module. sup-* skills never replace I-360 or talk to customers directly.

| Agent | Persona | Skill ID | Role |
|-------|---------|----------|------|
| **Sloan** | Support Ops Director | `sup-orchestrator` | Orchestrator — coordinates support operations team |
| **Corey** | Ticket Analyst | `sup-ticket-analyst` | Conversation patterns, intent distribution, volume trends, recurring issues |
| **Toni** | Escalation Handler | `sup-escalation-handler` | Prepares humans for escalated conversations with context and de-escalation guidance |
| **Kris** | Knowledge Manager | `sup-knowledge-manager` | KB maintenance, FAQ gap identification, article creation |
| **Frankie** | Quality Reviewer | `sup-quality-reviewer` | AI conversation quality audit, CSAT analysis, improvement recommendations |
| **Dallas** | Policy Tuner | `sup-policy-tuner` | Refund/escalation/tier-change policy effectiveness and threshold adjustment |

### Support Workflows

| ID | Workflow | Trigger |
|----|----------|---------|
| WF-SUP01 | Weekly Operations Review | Weekly cadence |
| WF-SUP02 | Escalation Support | Conversation escalated by AI |
| WF-SUP03 | Knowledge Base Update | KB gap identified |
| WF-SUP04 | Policy Review | Override rate high or CSAT dropping |
| WF-SUP05 | Quality Improvement | Periodic audit |

### I-360 Integration
- **Reads from:** `support_conversations`, `support_messages`, `support_actions` tables
- **Improves:** Knowledge base quality (feeds `search_knowledge_base` tool), policy rules (feeds `supportPolicyService.js`)
- **Bridges:** Escalation handoff — I-360 `escalate_to_human` → Toni prepares the human agent

---

## Operations Team

Led by **Riley-O** (Operations Orchestrator). Responsible for platform reliability, process optimization, vendor management, capacity planning, cost analysis, and SLA monitoring.

| Agent | Persona | Skill ID | Role |
|-------|---------|----------|------|
| **Riley-O** | Operations Director | `ops-orchestrator` | Orchestrator — coordinates operations team, delegates, reviews, assembles deliverables |
| **Kai** | Process Analyst | `ops-process-analyst` | Process audits, maturity assessment, SOP drafting, automation opportunities, post-mortems |
| **Sage-O** | Vendor Manager | `ops-vendor-manager` | Vendor evaluation, RFP drafting, performance reviews, contract analysis |
| **Nico** | Resource Planner | `ops-resource-planner` | Capacity planning, resource allocation, growth modeling, scaling recommendations |
| **Rowan-O** | Cost Analyst | `ops-cost-analyst` | Spend tracking, cost optimization, budget variance, unit economics |
| **Devon** | SLA Monitor | `ops-sla-monitor` | SLA compliance tracking, uptime analysis, incident impact, performance reporting |

### Operations Workflows

| ID | Workflow | Trigger |
|----|----------|---------|
| WF-OPS01 | Weekly Operations Review | Weekly cadence |
| WF-OPS02 | Vendor Management Cycle | New vendor or renewal |
| WF-OPS03 | Process Improvement Initiative | Audit or metrics trigger |
| WF-OPS04 | Incident Response Coordination | Production incident |
| WF-OPS05 | Capacity Planning & Scaling | Growth milestone or bottleneck |
| WF-OPS06 | Operational Health Audit | Periodic or on-demand |

### Cross-Team Connections
- Rowan-O (ops-cost-analyst) complements Cameron (biz-finance) — ops-level cost tracking vs. ad-hoc business cases
- Devon (ops-sla-monitor) feeds incident data to Sam (pm-incident-commander) for post-mortems
- Nico (ops-resource-planner) validates capacity for Jordan (pm-release-coord) launch readiness
- Sage-O (ops-vendor-manager) provides vendor data to Kendall (biz-pricing) for cost modeling

---

## Executive Team

Led by **Morgan-E** (Executive Orchestrator). Sits ABOVE department orchestrators — coordinates cross-department strategic decisions, prepares JB for CEO-level decisions, and ensures departments work as one company.

| Agent | Persona | Skill ID | Role |
|-------|---------|----------|------|
| **Morgan-E** | Executive Orchestrator | `exec-orchestrator` | Cross-dept coordination, strategic decisions, board prep, initiative prioritization |
| **Quinn-E** | Chief of Staff | `exec-chief-of-staff` | Decision tracking, meeting prep, status consolidation, action item follow-through |
| **Sage-E** | Strategic Advisor | `exec-strategic-advisor` | Market vision, scenario planning, competitive moats, innovation radar, strategic narrative |

### Executive Workflows

| ID | Workflow | Trigger |
|----|----------|---------|
| WF-EXEC01 | Strategic Planning Session | Quarterly or on-demand |
| WF-EXEC02 | Cross-Department Decision | Inter-dept conflict or shared initiative |
| WF-EXEC03 | Executive Review Preparation | Weekly/bi-weekly cadence |
| WF-EXEC04 | Board/Investor Preparation | Quarterly or fundraising |
| WF-EXEC05 | Initiative Prioritization | New initiative proposals |
| WF-EXEC06 | Partnership Evaluation | Partnership opportunity |

### Distinction: Sage-E vs. Ellis
- **Ellis** (`biz-strategy`): Tactical strategy — OKR cascading, initiative prioritization, BSC, resource allocation. Thinks in quarters.
- **Sage-E** (`exec-strategic-advisor`): Visionary strategy — market positioning, competitive moats, scenario planning, disruption radar. Thinks in years.

---

## Cross-Functional Team (`biz-*`)

No orchestrator — accessible by ANY department orchestrator (Avery, Dakota, Tatum, Marlowe, Sloan, Riley-O, Morgan-E). Shared resources for capabilities that span multiple departments.

| Agent | Persona | Skill ID | Role | Accessed By |
|-------|---------|----------|------|-------------|
| **Kendall** | Pricing Strategist | `biz-pricing` | Tier design, margin analysis, competitive pricing, packaging | All orchestrators |
| **Morgan-L** | Legal Advisor | `biz-legal` | Claims review, contracts, compliance (HIPAA/SOC 2/GDPR), IP | All orchestrators |
| **Cameron** | Finance Analyst | `biz-finance` | Ad-hoc business cases, unit economics, P&L projections | All orchestrators |
| **Ellis** | Strategic Planner | `biz-strategy` | OKR cascading, initiative prioritization, BSC, strategic alignment | All orchestrators |
| **Peyton** | Customer Success | `biz-customer-success` | Customer health scores, churn risk, retention, QBR prep | All orchestrators |
| **Marley** | Follow-Up Manager | `biz-follow-up` | Scheduled follow-ups, drift signals, trigger tracking, deadline monitoring | All orchestrators |
| **Skyler** | Data Analyst | `biz-data` | Cross-dept dashboards, KPI analysis, trend detection, correlation analysis | All orchestrators |
| **Jordan-B** | Partnerships & BD | `biz-partnerships` | Partner evaluation, integration opportunities, channel strategy, co-marketing | All orchestrators |

---

## Utility Skills (Insight 360)

| Skill ID | Type | Description |
|----------|------|-------------|
| `xlsx` | Tool | Excel/CSV creation, formulas, formatting, financial models, data analysis |
| `feature-dev` | Tool | Guided feature development with codebase understanding and architecture focus |

---

## Content Creation System Skills

23 utility/tool skills (no agent personas) located at `/Content Creation System/.claude/skills/`:

### Writing & Content
| Skill | Description |
|-------|-------------|
| `ai-article-formatter` | AI-optimized article structuring |
| `weekly-article-package` | Complete weekly packages (article + 5 LinkedIn posts) |
| `substack-notes` | High-performing Substack notes |
| `social-media-bio-generator` | LinkedIn/X/Instagram bios |
| `internal-comms` | Status reports, newsletters, FAQs |
| `doc-coauthoring` | Structured doc workflow (3 stages) |

### Document Processing
| Skill | Description |
|-------|-------------|
| `docx` | Word document creation/editing |
| `pdf` | PDF extraction, creation, form filling |
| `pptx` | Presentation creation/editing |
| `xlsx` | Advanced spreadsheet operations |

### Design & Visual
| Skill | Description |
|-------|-------------|
| `canvas-design` | Visual art (.png/.pdf) using design philosophy |
| `algorithmic-art` | Generative art (p5.js, flow fields, particles) |
| `frontend-design` | Production-grade web components (React, Tailwind, shadcn/ui) |
| `theme-factory` | 10+ professional theming packages |
| `brand-guidelines` | Anthropic brand colors/typography reference |
| `slack-gif-creator` | Slack-optimized GIFs (128x128 or 480x480) |

### Analysis & Development
| Skill | Description |
|-------|-------------|
| `key-messages-analysis` | Extracts insights from content |
| `prompt-transformer` | Converts prompts to Skills/Context Assets/Agents |
| `skill-creator` | Meta-skill for creating new skills |
| `mcp-builder` | Guide for MCP server development |
| `web-artifacts-builder` | React/Tailwind/shadcn artifacts |
| `webapp-testing` | Playwright testing toolkit |

---

## Claude Skills Repository (Marketplace)

2 reusable/shareable skills at `/claude-skills/.claude/skills/`:

| Skill | Description |
|-------|-------------|
| `article-generator` | Thought leadership article generation (GenAI Divide format) |
| `skill-creator` | Master skill development framework (meta-tool) |

---

## Shared Context Files

| File | Location | Used By |
|------|----------|---------|
| Synergi Marketing Context | `.claude/skills/mkt-shared/synergi-context.md` | All `mkt-*`, `biz-*`, `sales-*` skills |
| Synergi Business Context | `.claude/skills/biz-shared/synergi-business-context.md` | All `biz-*`, `fin-*` skills |
| Synergi Sales Context | `.claude/skills/sales-shared/synergi-sales-context.md` | All `sales-*` skills |
| Synergi Finance Context | `.claude/skills/fin-shared/synergi-finance-context.md` | All `fin-*` skills |
| Synergi Support Context | `.claude/skills/sup-shared/synergi-support-context.md` | All `sup-*` skills |
| Synergi Operations Context | `.claude/skills/ops-shared/synergi-operations-context.md` | All `ops-*` skills |
| Synergi Executive Context | `.claude/skills/exec-shared/synergi-executive-context.md` | All `exec-*` skills |
| PM Context Assets | `.claude/skills/pm-spec-writer/context-assets.md` | `pm-*` skills |

---

## Parthenon Department Coverage

| # | Parthenon Pillar | Status | Namespace | Orchestrator |
|---|-----------------|:------:|:---------:|:------------:|
| 1 | Stakeholder Relations | Deferred | `sr-*` | TBD |
| 2 | **Finance** | **Complete** | `fin-*` | Marlowe |
| 3 | **Operations** | **Complete** | `ops-*` | Riley-O |
| 4 | **Sales** | **Complete** | `sales-*` | Tatum |
| 5 | **Marketing** | **Complete** | `mkt-*` | Dakota |
| 6 | Production | Covered by PM + Ops | — | Avery + Riley-O |
| 7 | **Support (Service)** | **Complete** | `sup-*` | Sloan |
| 8 | **Executive** | **Complete** | `exec-*` | Morgan-E |

**Product Management** (`pm-*`, Avery) predates the Parthenon rollout but is fully operational.
**Cross-Functional** (`biz-*`, 5 skills) serves all pillars.
**Foundation** (Standards, OKRs, Policies, Processes, Procedures) managed by Ellis (`biz-strategy`).

---

## Architecture Patterns

### Delegation Model
All teams use the same pattern:
1. **Human PM** provides a task or decision
2. **Orchestrator** (Morgan-E, Avery, Dakota, Tatum, Marlowe, Sloan, or Riley-O) decomposes and delegates to specialists
3. **Specialists** produce structured outputs per their role
4. **Orchestrator** reviews, resolves conflicts, assembles consolidated report
5. **Human PM** approves or requests changes

### Escalation Tiers
| Tier | Action | Examples |
|------|--------|---------|
| 1 — Inform After | Low risk, reversible | Doc updates, minor fixes |
| 2 — Checkpoint | Multi-module scope | Roadmap shifts, UX changes |
| 3 — Hard Stop | High risk, irreversible | Security critical, pricing, launch dates, SEV-1 |

### Deployment Targets
All skills are designed for three deployment targets:

| Target | Status | Format |
|--------|:------:|--------|
| **Claude Code** | LIVE | `.claude/skills/*/SKILL.md` |
| **Claude App** | Planned | Custom instructions / project knowledge |
| **Insight 360 Agents** | Planned | In-platform agents with system prompts + context assets |

---

## Agent Count Summary

| Location | Named Agents | Utility Skills | Total |
|----------|:------------:|:--------------:|:-----:|
| Insight 360 — Executive Team | 3 | -- | 3 |
| Insight 360 — PM Team | 11 | -- | 11 |
| Insight 360 — Marketing Team | 9 | -- | 9 |
| Insight 360 — Sales Team | 8 | -- | 8 |
| Insight 360 — Finance Team | 6 | -- | 6 |
| Insight 360 — Support Team | 6 | -- | 6 |
| Insight 360 — Operations Team | 6 | -- | 6 |
| Insight 360 — Cross-Functional | 8 | -- | 8 |
| Insight 360 — Utilities | -- | 2 | 2 |
| Content Creation System | -- | 23 | 23 |
| Claude Skills (Marketplace) | -- | 2 | 2 |
| **Total** | **57** | **27** | **84** |
