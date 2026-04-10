# Use Case: AI-Assisted Tax Prep for Professional Services Firm

**ICP:** Professional Services (Small CPA Firm)
**Firm Profile:** 35-person accounting firm, $8M revenue, Business-tier Insight 360 customer
**Last Updated:** 2026-03-18

---

## Overview

This use case walks through the complete Align 120 → Strategy 120 → Execute 120 pipeline for a small accounting firm evaluating and launching AI-assisted tax preparation as a new service line. It demonstrates how the executive agent team (Higgins, Jarvis, Alfred) coordinates with all seven department teams to move from strategic decision to daily execution.

---

## Phase 1: Strategic Decision (Strategy 120)

### Step 1: Strategic Assessment with Alfred

**Prompt:** `/exec-strategic-advisor` — "We're a 35-person CPA firm considering adding AI-assisted tax prep as a service line for next tax season. Evaluate whether this strengthens or weakens our competitive position."

**Alfred produces:**
- Market landscape analysis (who else offers AI-assisted tax prep, where it's heading)
- Competitive moat assessment (does this differentiate us or commoditize our core service?)
- Three strategic options with upside/downside/reversibility
- Kill criteria (signals that should make us abandon the path)

**Key insight Alfred surfaces:** The real moat isn't "AI does your taxes" — it's "AI handles the routine returns so your senior CPAs spend 100% of their time on complex advisory work." The firm should position it as a quality upgrade, not a cost reduction.

### Step 2: Cross-Department Coordination with Higgins

**Prompt:** `/exec-orchestrator` — "Based on Alfred' assessment, we want to pursue AI-assisted tax prep positioned as a quality upgrade. Coordinate what each department needs to do."

**Higgins delegates:**
- **Kendall** (`/biz-pricing`) — price the new service tier. Should it be bundled or add-on? What's the margin at different price points?
- **Cameron** (`/biz-finance`) — model the investment: software licensing, training time, expected revenue lift
- **Morgan-L** (`/biz-legal`) — review compliance implications. Can AI touch client tax data under their engagement letters? E&O insurance implications?
- **Dakota** (`/mkt-orchestrator`) — develop positioning for existing clients. How do we announce this without spooking clients who want "their CPA"?
- **Tatum** (`/sales-orchestrator`) — build a pitch for prospects. This is a differentiator in new business conversations.

**Higgins assembles** a consolidated recommendation with all department inputs, flags tensions (e.g., Legal wants a cautious rollout, Sales wants a big launch), and presents options to the managing partners.

### Step 3: Decision Documentation with Jarvis

**Prompt:** `/exec-chief-of-staff` — "Document the decision to proceed with AI-assisted tax prep as a phased rollout. Capture the rationale and next steps."

**Jarvis produces:**
- **Decision Record** (DEC-2026-014) with full rationale
- **Decision Quality Check** — values alignment (human-centered: CPAs still review everything), financial viability (positive ROI by month 4), reversibility (easy — just stop offering the service)
- **Communication Plan** — who needs to know, how, by when
- **Action Items** with owners and deadlines:
  - Kendall: Final pricing by April 1
  - Legal: Updated engagement letter template by April 15
  - Dakota: Client announcement email by May 1
  - Operations: Software procurement and setup by May 15
  - Training: Staff certification program by June 1

**Jarvis routes all action items to Marley** (`/biz-follow-up`) for persistent tracking with trigger dates.

---

## Phase 2: Execution (Execute 120)

Execute 120 is the personalized command center where each department sees their slice of the work. When a user logs in, they see:

- **My Agents** — agents assigned to their department
- **My Workflows** — department workflows + global ones
- **Context Assets** — knowledge docs relevant to their role
- **Quick Actions** — one-click tasks
- **Quick Start with Alfred** — pre-written prompts tailored to their department

Executives also see a **Strategic Overview card** showing active initiative counts and progress from Strategy 120.

**Key principle:** Strategy 120 produces initiatives. Execute 120 breaks them into department-level daily work.

---

### Stream 1: Finance (Marlowe's Team)

**Initiative owner:** Managing Partner / CFO

| Week | Task | Agent | Execute 120 Surface |
|------|------|-------|-------------------|
| 1-2 | Model investment: AI software licensing ($X/mo), training hours (Y hrs x $Z/hr), expected revenue lift per return | **Cameron** (`/biz-finance`) | Quick Action: "Model new service line ROI" |
| 2-3 | Price the service: bundled vs. add-on, margin analysis at 3 price points | **Kendall** (`/biz-pricing`) | Context Asset: competitor pricing research |
| 3 | Build budget variance tracking for the initiative | **Noel** (`/fin-budget-forecast`) | Workflow: "Initiative Budget Setup" |
| Ongoing | Track actual spend vs. forecast monthly | **Harley** (`/fin-revenue-ops`) | My Agent: Revenue dashboard |

**Kendall's pricing output:**
- Bundle option: $150/return add-on (simple), $350/return (complex) — positions as premium
- The firm's current average billing is $400/return manually. AI-assisted drops prep time 60%, so effective margin jumps from 35% to 58%
- Passes the 65% gross margin floor when factoring in the AI platform cost at scale (50+ returns/month)

---

### Stream 2: Legal & Compliance (Morgan-L)

**Initiative owner:** Compliance Partner

| Week | Task | Agent | Execute 120 Surface |
|------|------|-------|-------------------|
| 1 | Review engagement letter implications — can AI touch client tax data under existing terms? | **Morgan-L** (`/biz-legal`) | Quick Action: "Compliance review for new service" |
| 2 | Draft updated engagement letter addendum for AI-assisted services | **Morgan-L** | Context Asset: engagement letter template |
| 2 | Check E&O insurance coverage for AI-assisted work product | **Morgan-L** | Workflow: "Insurance coverage gap analysis" |
| 3 | Review data handling — where does client PII flow? Retention policy? | **Riley** (`/pm-compliance-auditor`) | Quick Action: "Data governance review" |

**Critical output:** A one-page client disclosure: "Your return is prepared with AI assistance and reviewed by a licensed CPA. Here's exactly what the AI does and doesn't do." — Radical Transparency value in action.

---

### Stream 3: Marketing (Dakota's Team)

**Initiative owner:** Marketing Manager / Partner

| Week | Task | Agent | Execute 120 Surface |
|------|------|-------|-------------------|
| 2-3 | Position the service: "Your CPA, amplified" — not "robot does your taxes" | **Harper** (`/mkt-brand-voice`) | Context Asset: Voice DNA for professional services |
| 3-4 | Draft client announcement email (existing clients) | **River** (`/mkt-content`) then **Avery-M** (`/mkt-icp-adapt`) | Workflow: "Client communication package" |
| 3-4 | Adapt messaging for each persona — the firm's managing partners (Victor), the ops managers (Emma), the IT lead (Taylor) | **Avery-M** (`/mkt-icp-adapt`) | My Agent: ICP Adapter |
| 4 | Create FAQ page for the firm's website | **River** (`/mkt-content`) | Quick Action: "Generate FAQ content" |
| 4-5 | Build competitive positioning vs. firms NOT using AI | **Blake** (`/mkt-competitive`) | Context Asset: Competitive battlecard |
| 5 | Final QA on all content before publish | **Emery** (`/mkt-brand-review`) | Workflow: "Brand review gate" |

**Dakota orchestrates the sequence:** Voice calibration first (Harper), then content creation (River), then persona adaptation (Avery-M), then QA gate (Emery). No content ships without passing Emery.

---

### Stream 4: Sales (Tatum's Team)

**Initiative owner:** Business Development Partner

| Week | Task | Agent | Execute 120 Surface |
|------|------|-------|-------------------|
| 3 | Build pitch deck for new prospects: "Why AI-assisted tax prep is better for you" | **Drew** (`/sales-proposal`) | Workflow: "New service pitch development" |
| 3-4 | Create objection handling guide: "Is AI safe with my tax data?" / "Will I still talk to a real CPA?" | **Reese-S** (`/sales-enablement`) | Context Asset: Objection handling playbook |
| 4 | Identify 20 target prospects who'd benefit most (complex returns, high volume) | **Kieran** (`/sales-account-research`) | My Agent: Account Researcher |
| 4-5 | Draft outreach sequences for the 20 targets | **Remy** (`/sales-outreach`) | Workflow: "Outreach campaign" |
| 5 | Prep for first pitch meetings | **Jules** (`/sales-call-prep`) | Quick Action: "Prep for meeting" |
| Ongoing | Track pipeline: how many prospects engaged, conversion rate | **Hayden** (`/sales-pipeline`) | My Agent: Pipeline Analyst |

**Tatum's methodology:** Align (do they share our values about AI transparency?) then Prove (offer a 3-return pilot) then Partner (convert to ongoing engagement). Logan (`/sales-deal-strategy`) qualifies each opportunity with MEDDIC + Values.

---

### Stream 5: Operations (Riley-O's Team)

**Initiative owner:** IT / Operations Manager

| Week | Task | Agent | Execute 120 Surface |
|------|------|-------|-------------------|
| 1-2 | Evaluate AI tax prep vendors (3 options) against requirements | **Sage-O** (`/ops-vendor-manager`) | Workflow: "Vendor evaluation RFP" |
| 2-3 | Capacity plan: how many concurrent AI-assisted returns can we handle? | **Nico** (`/ops-resource-planner`) | My Agent: Resource Planner |
| 3 | Draft SOP for AI-assisted tax prep workflow (intake, AI prep, CPA review, client delivery) | **Kai** (`/ops-process-analyst`) | Quick Action: "Draft new SOP" |
| 4 | Define SLAs: turnaround time for AI-assisted vs. traditional returns | **Devon** (`/ops-sla-monitor`) | Context Asset: SLA template |
| Ongoing | Track cost per return (AI-assisted vs. manual) | **Rowan-O** (`/ops-cost-analyst`) | My Agent: Cost Analyst |

---

### Stream 6: Support (Sloan's Team)

**Initiative owner:** Client Services Manager

| Week | Task | Agent | Execute 120 Surface |
|------|------|-------|-------------------|
| 4 | Build knowledge base: "What is AI-assisted tax prep?" FAQ for client-facing staff | **Kris** (`/sup-knowledge-manager`) | Workflow: "KB article creation" |
| 4-5 | Create escalation playbook: when a client is uncomfortable with AI involvement | **Toni** (`/sup-escalation-handler`) | Context Asset: Escalation playbook |
| 5 | Define policy: when can staff override AI recommendation and go fully manual? | **Dallas** (`/sup-policy-tuner`) | Quick Action: "Policy threshold review" |
| Ongoing | Monitor client sentiment about the new service | **Frankie** (`/sup-quality-reviewer`) | My Agent: Quality Reviewer |

---

## Executive Tracking: Higgins + Jarvis

### Weekly Briefing (Jarvis)

```
EXECUTIVE BRIEFING
───────────────────────────
Date: Week 3 of AI Tax Prep Initiative
Prepared For: Managing Partners

─── TOP OF MIND ───
1. Legal cleared engagement letter addendum — ready for partner review
2. Vendor evaluation complete — recommending Option B ($2,400/mo)
3. Marketing content in QA gate — launches next week

─── DEPARTMENT PULSE ───
| Department     | Status  | On Track? |
|---------------|:-------:|:---------:|
| Finance       | Green   | Yes — ROI model shows 67% margin at scale |
| Legal         | Green   | Yes — addendum drafted, E&O confirmed |
| Marketing     | Yellow  | Slight delay — persona adaptation taking longer |
| Sales         | Green   | Yes — 20 targets identified, outreach ready |
| Operations    | Green   | Yes — SOP drafted, vendor selected |
| Support       | Green   | Yes — KB articles in progress |

─── DECISIONS PENDING ───
1. Approve vendor selection (Option B) — need partner vote by Friday
2. Approve client announcement timing — May 1 or delay to May 15?

─── FOLLOW-UPS DUE (from Marley) ───
- Kendall: Final pricing confirmation (due April 1) — ON TRACK
- Morgan-L: E&O insurance confirmation letter — RECEIVED
- Dakota: Content QA completion — AT RISK (2 days behind)
```

**Higgins coordinates** when streams conflict. Example: Sales wants to pitch before Marketing has finished the website FAQ. Higgins flags this to Jarvis, who logs the decision: "Sales can pitch with a 1-pager; full website content launches May 1."

---

## Pipeline Summary

```
ALIGN 120                    STRATEGY 120                EXECUTE 120
─────────                    ────────────                ───────────
"Who are we?"                "What should we do?"        "Who does what, by when?"

AI Maturity: 2/5             Initiative: AI Tax Prep     6 department streams
Values: Transparency,        Perspective: Customer +     47 agent tasks
  Human-centered              Financial                  12 workflows triggered
Skills gap: AI literacy      Business case: 67% margin   Weekly Jarvis briefings
Brand: Trust-first           Scenario: base/best/worst   Marley tracks 23 follow-ups
RACI: Partners decide        Decision: DEC-2026-014      Higgins resolves conflicts

        ──────────>                  ──────────>
    Company Profile              Initiatives +           Department command
    feeds Strategy               OKRs feed               centers with
    agent context                Execute overview         personalized cards
```

---

## Key Takeaways

1. **A 35-person firm gets Fortune 500-quality strategic planning** — coordinated across 6 departments, 20+ specialized agents, with full decision documentation and accountability tracking.

2. **Every agent has a specific role and handoff** — no duplication, no gaps. Higgins ensures nothing falls between departments.

3. **The Proof-of-Value guarantee removes adoption friction** — the firm can pilot with 3 returns before committing. If it doesn't work, they stop. Reversibility was evaluated in the Decision Quality Check.

4. **Values alignment is baked into every step** — from Alfred' strategic assessment (human-centered positioning) to Morgan-L's client disclosure (radical transparency) to Tatum's qualification process (values-based selling).

5. **Execute 120 makes strategy tangible** — instead of a strategic plan gathering dust, every person in the firm sees their department's tasks, agents, and workflows on their personalized dashboard.

---

## Agents Referenced

### Executive Team
| Agent | Role | Skill |
|-------|------|-------|
| **Higgins** | Executive Orchestrator | `/exec-orchestrator` |
| **Jarvis** | Chief of Staff | `/exec-chief-of-staff` |
| **Alfred** | Strategic Advisor | `/exec-strategic-advisor` |

### Cross-Functional Team
| Agent | Role | Skill |
|-------|------|-------|
| **Kendall** | Pricing Strategist | `/biz-pricing` |
| **Cameron** | Finance Analyst | `/biz-finance` |
| **Morgan-L** | Legal Advisor | `/biz-legal` |
| **Marley** | Follow-Up Manager | `/biz-follow-up` |

### Department Agents Used
| Agent | Department | Skill |
|-------|-----------|-------|
| **Noel** | Finance | `/fin-budget-forecast` |
| **Harley** | Finance | `/fin-revenue-ops` |
| **Riley** | Product (Compliance) | `/pm-compliance-auditor` |
| **Harper** | Marketing | `/mkt-brand-voice` |
| **River** | Marketing | `/mkt-content` |
| **Avery-M** | Marketing | `/mkt-icp-adapt` |
| **Blake** | Marketing | `/mkt-competitive` |
| **Emery** | Marketing | `/mkt-brand-review` |
| **Drew** | Sales | `/sales-proposal` |
| **Reese-S** | Sales | `/sales-enablement` |
| **Kieran** | Sales | `/sales-account-research` |
| **Remy** | Sales | `/sales-outreach` |
| **Jules** | Sales | `/sales-call-prep` |
| **Hayden** | Sales | `/sales-pipeline` |
| **Logan** | Sales | `/sales-deal-strategy` |
| **Sage-O** | Operations | `/ops-vendor-manager` |
| **Nico** | Operations | `/ops-resource-planner` |
| **Kai** | Operations | `/ops-process-analyst` |
| **Devon** | Operations | `/ops-sla-monitor` |
| **Rowan-O** | Operations | `/ops-cost-analyst` |
| **Kris** | Support | `/sup-knowledge-manager` |
| **Toni** | Support | `/sup-escalation-handler` |
| **Dallas** | Support | `/sup-policy-tuner` |
| **Frankie** | Support | `/sup-quality-reviewer` |
