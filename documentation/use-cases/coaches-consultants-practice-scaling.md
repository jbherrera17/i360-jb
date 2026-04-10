# Use Case: Scaling a Leadership Coaching Practice with AI

**ICP:** Coaches & Consultants (Solo-to-Small Practice)
**Practice Profile:** 4-person executive coaching firm, $1.2M revenue, 28 active clients, Business-tier Insight 360 customer
**Last Updated:** 2026-03-18

---

## The Problem

Sarah runs Catalyst Leadership Group — a 4-person executive coaching firm (Sarah + 2 associate coaches + 1 operations coordinator). They're good at what they do. Too good. The waitlist is 3 months long, they're turning away $400K/year in potential revenue, and Sarah spends 40% of her time on non-coaching work: session prep, content creation, program design, and business development.

She can't hire fast enough — qualified executive coaches take 6 months to onboard — and she can't clone herself. She needs to scale her *capacity*, not just her headcount.

**The question:** How do you make a 4-person coaching firm operate like a 15-person one without sacrificing the personal touch that makes coaching work?

---

## Overview

This use case walks through the complete Align 120 → Strategy 120 → Execute 120 pipeline for an executive coaching practice launching an AI-augmented service model. It demonstrates how the platform's agent teams coordinate to help Sarah scale from 28 to 60+ active clients while maintaining the deeply personal quality her clients pay premium rates for.

---

## Phase 1: Strategic Decision (Strategy 120)

### Step 1: Strategic Assessment with Alfred

**Prompt:** `/exec-strategic-advisor` — "I run a 4-person executive coaching firm at $1.2M revenue. We're capacity-constrained with a 3-month waitlist. I want to use AI to scale to 60+ clients without hiring more coaches in the short term. Is this viable without undermining the personal nature of coaching?"

**Alfred produces:**
- Market analysis of AI-augmented coaching (BetterUp, CoachHub, Torch — what's working, what's not)
- Risk assessment: where AI helps coaching vs. where it destroys trust
- Three scaling models with trade-offs:
  - **Model A:** AI handles all admin/prep, coaches focus 100% on sessions → 40% capacity gain
  - **Model B:** AI adds between-session touchpoints (check-ins, resource curation, progress tracking) → 60% capacity gain
  - **Model C:** AI delivers group program content, coaches handle 1:1 only → 100%+ capacity gain
- Kill criteria: if client satisfaction (NPS) drops below 70 or coach burnout increases

**Key insight Alfred surfaces:** The biggest bottleneck isn't session time — it's the 2.5 hours of *surrounding work* per client per week (session prep, note synthesis, resource curation, progress reports for sponsors). AI can compress this to 30 minutes without the client ever seeing a difference. Model B is the sweet spot: clients actually get *more* touchpoints (AI-curated between sessions) while coaches reclaim 75% of their non-session time.

### Step 2: Cross-Department Coordination with Higgins

**Prompt:** `/exec-orchestrator` — "Based on Alfred' assessment, we want to pursue Model B: AI handles session prep, note synthesis, between-session touchpoints, and progress reporting. Coaches focus on live sessions and high-stakes moments. Coordinate the plan."

**Higgins delegates:**
- **Kendall** (`/biz-pricing`) — restructure pricing. Current: $3,500/month per client for 4 sessions. New model should reflect the increased touchpoints (clients get more value).
- **Cameron** (`/biz-finance`) — model the economics. What's the revenue at 60 clients vs. 28? What are the AI platform costs? When does ROI cross over?
- **Morgan-L** (`/biz-legal`) — review confidentiality implications. Coaching conversations are deeply personal. What disclosures are needed? How do we handle data retention?
- **Dakota** (`/mkt-orchestrator`) — reposition the practice. "AI-augmented coaching" could scare clients or excite them. Develop messaging that leads with the benefit.
- **Tatum** (`/sales-orchestrator`) — the waitlist is 3 months. Build a conversion plan that turns waitlisted prospects into the first cohort of the new model.
- **Ellis** (`/biz-strategy`) — cascade this into quarterly OKRs. What does Q2 look like? Q3?

**Higgins flags a tension:** Marketing wants to emphasize "more touchpoints between sessions" but Legal wants to minimize how much AI interaction is highlighted. Higgins proposes the frame: "Your coach's insight, available between sessions" — which is accurate (AI is synthesizing the *coach's* framework) without overpromising.

### Step 3: Decision Documentation with Jarvis

**Prompt:** `/exec-chief-of-staff` — "Document the decision to launch AI-augmented coaching model. Sarah approves Model B with phased rollout starting with 5 existing clients."

**Jarvis produces:**
- **Decision Record** (DEC-2026-007) with rationale
- **Values Alignment Check:**
  - Human-centered: Coaches remain the relationship. AI is invisible infrastructure.
  - Radical Transparency: Every client gets a clear explanation of what's AI-assisted.
  - Quality-first: The AI model actually increases touchpoints — clients get *more* attention.
- **Rollout Plan:**
  - Phase 1 (Weeks 1-4): Build and configure. 0 clients.
  - Phase 2 (Weeks 5-8): Pilot with 5 hand-picked existing clients. Measure NPS, time savings, coach satisfaction.
  - Phase 3 (Weeks 9-16): Expand to all 28 clients + begin converting waitlist.
  - Phase 4 (Month 5+): Scale to 60+ clients. Evaluate hiring associate coaches to go further.
- **Action Items** routed to **Marley** (`/biz-follow-up`) with trigger dates

---

## Phase 2: Execution (Execute 120)

Each team member sees their personalized command center:

- **Sarah (Founder/Lead Coach):** Strategic overview, client health dashboard, content approval queue
- **Associate Coaches:** Session prep cards, client progress summaries, between-session touchpoint drafts for review
- **Operations Coordinator:** Workflow status, client onboarding pipeline, scheduling optimization

---

### Stream 1: Finance (Marlowe's Team)

**Initiative owner:** Sarah (Founder)

| Week | Task | Agent | Execute 120 Surface |
|------|------|-------|-------------------|
| 1-2 | Model economics: 28 clients @ $3,500/mo = $98K/mo current. At 60 clients with new pricing, what's the target? Factor in $299/mo platform cost. | **Cameron** (`/biz-finance`) | Quick Action: "Model practice scaling ROI" |
| 2 | Price the new offering. More touchpoints = more value. Should price increase, stay flat, or offer tiers? | **Kendall** (`/biz-pricing`) | Context Asset: Coaching market pricing data |
| 3 | Set up revenue tracking: new model vs. legacy clients | **Harley** (`/fin-revenue-ops`) | My Agent: Revenue Tracker |
| Ongoing | Monthly P&L with AI platform costs broken out | **Noel** (`/fin-budget-forecast`) | Workflow: "Monthly coaching P&L" |

**Kendall's pricing output:**
- **Current:** $3,500/mo (4 live sessions, email support)
- **New "Catalyst+" tier:** $4,200/mo (4 live sessions + AI-curated between-session check-ins + weekly progress insights + resource recommendations)
- **Justification:** Clients get 3x more touchpoints. The $700/mo increase is 20% higher, but the *perceived value* increase is 200%+. Comparable AI-augmented coaching services (BetterUp Enterprise) charge $5,000-$8,000/mo.
- **Revenue projection:** 60 clients × $4,200 = $252K/mo ($3.02M/yr) — up from $1.2M. Even at 45 clients, it's $2.27M.
- **Margin:** Platform cost ~$299/mo + ~$50/client/mo in AI usage = $3,299/mo total. At 60 clients grossing $252K/mo, margin is 98.7% on the AI layer.

---

### Stream 2: Legal & Compliance (Morgan-L)

**Initiative owner:** Sarah

| Week | Task | Agent | Execute 120 Surface |
|------|------|-------|-------------------|
| 1 | Review coaching confidentiality implications. What data can AI process? What are the boundaries? | **Morgan-L** (`/biz-legal`) | Quick Action: "Confidentiality review" |
| 1-2 | Draft AI-augmented coaching addendum to client agreements | **Morgan-L** | Context Asset: Client agreement template |
| 2 | Data retention policy: session notes, AI summaries, progress data. What stays? What gets purged? | **Morgan-L** | Workflow: "Data governance setup" |
| 2 | ICF (International Coaching Federation) ethics review — does AI assistance comply with ICF standards? | **Morgan-L** | Quick Action: "Professional standards review" |

**Critical outputs:**
- **Client Disclosure (1-page):** "Between sessions, our AI assistant prepares personalized resources and check-ins based on your coach's notes and your stated goals. Your coach reviews all AI-generated content before it reaches you. You can opt out at any time."
- **Data Boundaries:** AI processes session summaries (not recordings), stated goals, and progress metrics. It never sees raw session transcripts unless the client explicitly consents.
- **ICF Compliance:** Confirmed. AI as a preparation and follow-up tool doesn't violate ICF Code of Ethics — the coach maintains the relationship and all coaching decisions.

---

### Stream 3: Marketing (Dakota's Team)

**Initiative owner:** Sarah / Operations Coordinator

| Week | Task | Agent | Execute 120 Surface |
|------|------|-------|-------------------|
| 2 | Calibrate voice for coaching audience: warm, direct, empowering — not corporate | **Harper** (`/mkt-brand-voice`) | Context Asset: Catalyst Leadership Voice DNA |
| 2-3 | Write positioning: "Catalyst+" as the premium evolution, not a pivot | **Sage** (`/mkt-campaign`) | Workflow: "Service launch campaign" |
| 3 | Draft announcement email for existing clients: "Your coaching is getting an upgrade" | **River** (`/mkt-content`) | Quick Action: "Client announcement email" |
| 3 | Adapt messaging: HR Directors (buying coaching for their leaders) vs. individual executives (buying for themselves) | **Avery-M** (`/mkt-icp-adapt`) | My Agent: ICP Adapter |
| 3-4 | Write 3 LinkedIn posts for Sarah: thought leadership on "the future of executive coaching" | **Rowan** (`/mkt-thought-leadership`) | Workflow: "Thought leadership series" |
| 4 | Competitive positioning: why Catalyst+ vs. BetterUp, CoachHub, or going it alone | **Blake** (`/mkt-competitive`) | Context Asset: Competitive battlecard |
| 4 | Final QA on all content | **Emery** (`/mkt-brand-review`) | Workflow: "Brand review gate" |

**Dakota's sequence:**
1. Harper sets the voice (warm, coaching-native — never sounds like enterprise software marketing)
2. Sage builds the campaign strategy (who hears what, when, through which channel)
3. River creates the content
4. Avery-M adapts for the two buyer types (HR sponsors vs. individual execs)
5. Rowan writes Sarah's thought leadership (this is where her personal brand gets amplified)
6. Emery QAs everything

**Rowan's thought leadership angle for Sarah:**
> "I spent 15 years telling leaders to delegate better. Then I realized I was the worst offender. I was spending 40% of my time on tasks that didn't require my expertise — session prep, note synthesis, resource hunting. AI didn't replace my coaching. It replaced the work that was preventing me from coaching more."

---

### Stream 4: Sales (Tatum's Team)

**Initiative owner:** Sarah / Operations Coordinator

| Week | Task | Agent | Execute 120 Surface |
|------|------|-------|-------------------|
| 3 | Convert the waitlist: build a "Catalyst+ Early Access" pitch for the 15 waitlisted prospects | **Drew** (`/sales-proposal`) | Workflow: "Waitlist conversion" |
| 3-4 | Objection handling: "I'm paying for Sarah, not a robot" / "Is my data safe?" / "Will this feel less personal?" | **Reese-S** (`/sales-enablement`) | Context Asset: Objection playbook |
| 4 | Research the 15 waitlisted prospects: who are they, what are their coaching goals, who's paying? | **Kieran** (`/sales-account-research`) | My Agent: Account Researcher |
| 4 | Personalized outreach to each waitlisted prospect | **Remy** (`/sales-outreach`) | Workflow: "Waitlist outreach" |
| 5 | Prep Sarah for the first 5 conversion calls | **Jules** (`/sales-call-prep`) | Quick Action: "Prep for meeting" |
| Ongoing | Track: waitlist conversion rate, new inquiry volume, pipeline health | **Hayden** (`/sales-pipeline`) | My Agent: Pipeline Analyst |

**Tatum's approach:** The waitlist is gold. These people already *want* to work with Catalyst. The pitch isn't "buy coaching" — it's "your wait is over, and the experience is even better than what you were waiting for." Logan (`/sales-deal-strategy`) qualifies each with values alignment: are they open to an AI-augmented model, or do they specifically want traditional-only?

**Key objection handling (Reese-S):**

| Objection | Response Framework |
|-----------|-------------------|
| "I want Sarah, not AI" | "You get Sarah. AI handles the prep work so Sarah walks into every session more prepared. Think of it as Sarah having a full-time research assistant dedicated to your growth." |
| "Is my data safe?" | "Absolutely. AI only sees session summaries and your stated goals — never raw session recordings. You control what's shared, and you can opt out anytime. Here's our data policy." |
| "This feels less personal" | "You'll actually get *more* personal attention — curated resources between sessions, progress check-ins, and a coach who arrives at every session fully briefed instead of spending the first 10 minutes reviewing notes." |

---

### Stream 5: Operations (Riley-O's Team)

**Initiative owner:** Operations Coordinator

| Week | Task | Agent | Execute 120 Surface |
|------|------|-------|-------------------|
| 1-2 | Design the AI-augmented coaching workflow: What happens before, during, and after each session? | **Kai** (`/ops-process-analyst`) | Workflow: "SOP design" |
| 2 | Capacity model: how many clients can each coach handle under the new model? (Target: 20 per coach, up from 9) | **Nico** (`/ops-resource-planner`) | My Agent: Resource Planner |
| 2-3 | Evaluate and configure the Insight 360 agents for coaching workflows | **Sage-O** (`/ops-vendor-manager`) | Quick Action: "Platform setup" |
| 3 | Define SLAs: between-session check-in within 24 hours of session, progress report to sponsors by Friday, etc. | **Devon** (`/ops-sla-monitor`) | Context Asset: Coaching SLA template |
| Ongoing | Track time-per-client (target: 2.5 hrs → 0.5 hrs non-session work) | **Rowan-O** (`/ops-cost-analyst`) | My Agent: Cost Analyst |

**Kai's coaching workflow (the key deliverable):**

```
PRE-SESSION (AI-driven, coach reviews)
──────────────────────────────────────
1. AI pulls client's goals, recent progress, last session notes
2. AI generates session prep brief: "Here's where [Client] is,
   here's what to focus on, here's what they might be avoiding"
3. Coach reviews brief (5 min vs. 30 min of manual prep)
4. AI queues relevant resources (articles, frameworks, exercises)

DURING SESSION (100% human)
──────────────────────────────
5. Coach runs the session. No AI involvement.
6. Coach takes lightweight notes (or voice-records summary after)

POST-SESSION (AI-driven, coach reviews)
───────────────────────────────────────
7. AI synthesizes session notes into structured summary
8. AI generates 2-3 between-session actions for the client
9. AI drafts a follow-up message with resources
10. Coach reviews and approves (5 min)
11. Client receives personalized follow-up within 4 hours

BETWEEN SESSIONS (AI-driven, coach monitors)
─────────────────────────────────────────────
12. AI sends mid-week check-in: "How's [action item] going?"
13. AI curates one relevant resource based on client's current focus
14. If client responds with a concern, AI flags coach for review
15. AI compiles weekly progress snapshot for sponsor (if applicable)

MONTHLY (AI-drafted, coach delivers)
─────────────────────────────────────
16. AI generates progress report with metrics, themes, growth areas
17. Coach adds personal observations and recommendations
18. Report sent to client (and sponsor if applicable)
```

---

### Stream 6: Support (Sloan's Team)

**Initiative owner:** Operations Coordinator

| Week | Task | Agent | Execute 120 Surface |
|------|------|-------|-------------------|
| 3-4 | Build onboarding guide for clients: "What to expect from Catalyst+" | **Kris** (`/sup-knowledge-manager`) | Workflow: "Client onboarding KB" |
| 4 | Escalation playbook: when a client says "I don't want the AI stuff" — how to gracefully offer traditional-only | **Toni** (`/sup-escalation-handler`) | Context Asset: Opt-out playbook |
| 4 | Define policy: when does AI flag a coach vs. handle autonomously? (e.g., client expresses distress → immediate coach alert) | **Dallas** (`/sup-policy-tuner`) | Quick Action: "Safety threshold review" |
| Ongoing | Monitor client feedback on between-session touchpoints | **Frankie** (`/sup-quality-reviewer`) | My Agent: Quality Reviewer |
| Ongoing | Analyze: which between-session touchpoints get engagement? Which get ignored? | **Corey** (`/sup-ticket-analyst`) | My Agent: Engagement Analyst |

**Dallas's safety policy (critical for coaching):**
- **Immediate coach alert:** Client mentions crisis, self-harm, major life disruption, or requests emergency session
- **24-hour coach review:** Client expresses frustration with coaching, misses 2+ check-ins, or reports no progress
- **AI handles autonomously:** Routine check-in responses ("going well"), resource requests, scheduling questions
- **Never AI-handled:** Emotional support, advice on personal decisions, anything that feels like a "session" happening over text

---

## Executive Tracking: Higgins + Jarvis

### Weekly Briefing (Jarvis)

```
EXECUTIVE BRIEFING
───────────────────────────
Date: Week 4 of Catalyst+ Initiative
Prepared For: Sarah, Founder

─── TOP OF MIND ───
1. Pilot launched with 5 clients — first between-session check-ins sent
2. All 5 pilot clients confirmed: "This feels like I have Sarah's
   attention all week, not just during sessions"
3. Time savings confirmed: prep time dropped from 2.5 hrs to 35 min/client

─── DEPARTMENT PULSE ───
| Department     | Status  | On Track? |
|---------------|:-------:|:---------:|
| Finance       | Green   | Revenue model validated at 60 clients |
| Legal         | Green   | Client addendums signed by all 5 pilot clients |
| Marketing     | Green   | Announcement email drafted, LinkedIn series ready |
| Sales         | Green   | 8 of 15 waitlisted prospects confirmed interest |
| Operations    | Green   | Workflow SOP finalized, SLAs defined |
| Support       | Green   | Onboarding guide + safety policy complete |

─── KEY METRICS (Pilot Week 1) ───
| Metric | Target | Actual |
|--------|--------|--------|
| Client NPS | ≥70 | 92 |
| Session prep time | ≤45 min | 35 min |
| Between-session engagement | ≥50% | 80% (4/5 responded to check-ins) |
| Coach satisfaction | ≥8/10 | 9/10 ("I feel more prepared than ever") |

─── DECISIONS PENDING ───
1. Approve full rollout to all 28 clients (recommended: yes)
2. Set go-live date for waitlist conversion (proposed: Week 9)

─── FOLLOW-UPS DUE (from Marley) ───
- Pricing finalization: $4,200/mo confirmed — DONE
- Client addendum signatures: 5/5 collected — DONE
- LinkedIn thought leadership posts: scheduled for Weeks 5-7 — ON TRACK
- Waitlist outreach: begins Week 5 — ON TRACK
```

---

## The Numbers: Before and After

```
BEFORE (Manual Practice)              AFTER (AI-Augmented with I-360)
────────────────────────              ──────────────────────────────
28 active clients                     60+ active clients (target)
$1.2M annual revenue                  $3.0M annual revenue (projected)
3-month waitlist                      <2 weeks to start
2.5 hrs/client non-session work       0.5 hrs/client non-session work
4 touchpoints/month per client        12+ touchpoints/month per client
No sponsor reporting                  Automated weekly progress reports
Sarah coaches + does everything       Sarah coaches + leads strategy
$3,500/mo per client                  $4,200/mo per client (20% increase)
                                      (clients get 3x more touchpoints)
```

---

## Pipeline Summary

```
ALIGN 120                    STRATEGY 120                EXECUTE 120
─────────                    ────────────                ───────────
"Who are we?"                "What should we do?"        "Who does what, by when?"

Values: Human-first,         Initiative: AI-Augmented    6 department streams
  Radical Transparency         Coaching Model (B)        22 agent tasks
Brand: Warm, empowering      Business case: $3M/yr      8 workflows triggered
Coach identity preserved      at 60 clients              Weekly Jarvis briefings
AI = invisible infra         3-model analysis            Marley tracks 18 follow-ups
                             Decision: DEC-2026-007      Higgins resolves tensions

        ──────────>                  ──────────>
    Practice identity            Initiatives +           Personalized dashboards:
    feeds Strategy               OKRs feed               Sarah sees strategy,
    agent context                Execute overview         coaches see prep,
                                                         ops sees workflows
```

---

## Key Takeaways

1. **A 4-person coaching practice gets enterprise-scale operations** — coordinated across 6 department functions, 25+ specialized agents, with full decision documentation and accountability tracking. Sarah didn't hire a COO, a marketing director, and a sales manager — she got all three through the platform.

2. **The AI is invisible to clients — and that's the point.** Clients experience more touchpoints, more personalization, more attention. They don't experience "AI coaching." The coach's expertise is amplified, not replaced. This is the core of the human-centered value.

3. **Revenue more than doubles while quality increases.** $1.2M → $3.0M isn't just about volume. Clients pay 20% more because they're getting 3x more touchpoints. The 80% between-session engagement rate in the pilot proves clients *want* this.

4. **The waitlist becomes a sales pipeline.** 15 prospects already want in. Tatum's team converts them with "your wait is over, and it's even better than what you were waiting for." No cold outreach needed for the first wave.

5. **Coach burnout drops.** The silent killer of coaching practices isn't lack of clients — it's the 60% of work that isn't coaching. Dropping non-session work from 2.5 hours to 30 minutes per client means coaches spend their energy on what they're actually good at.

6. **Values alignment is the safety net.** Dallas's safety policy ensures AI never crosses into territory that requires human judgment. The ICF compliance review ensures professional standards are maintained. Morgan-L's data boundaries ensure client trust is preserved. This isn't just ethics — it's business-critical.

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
| **Ellis** | Strategic Planner | `/biz-strategy` |
| **Marley** | Follow-Up Manager | `/biz-follow-up` |

### Department Agents Used
| Agent | Department | Skill |
|-------|-----------|-------|
| **Noel** | Finance | `/fin-budget-forecast` |
| **Harley** | Finance | `/fin-revenue-ops` |
| **Harper** | Marketing | `/mkt-brand-voice` |
| **Sage** | Marketing | `/mkt-campaign` |
| **River** | Marketing | `/mkt-content` |
| **Avery-M** | Marketing | `/mkt-icp-adapt` |
| **Rowan** | Marketing | `/mkt-thought-leadership` |
| **Blake** | Marketing | `/mkt-competitive` |
| **Emery** | Marketing | `/mkt-brand-review` |
| **Drew** | Sales | `/sales-proposal` |
| **Reese-S** | Sales | `/sales-enablement` |
| **Kieran** | Sales | `/sales-account-research` |
| **Remy** | Sales | `/sales-outreach` |
| **Jules** | Sales | `/sales-call-prep` |
| **Hayden** | Sales | `/sales-pipeline` |
| **Logan** | Sales | `/sales-deal-strategy` |
| **Kai** | Operations | `/ops-process-analyst` |
| **Nico** | Operations | `/ops-resource-planner` |
| **Sage-O** | Operations | `/ops-vendor-manager` |
| **Devon** | Operations | `/ops-sla-monitor` |
| **Rowan-O** | Operations | `/ops-cost-analyst` |
| **Kris** | Support | `/sup-knowledge-manager` |
| **Toni** | Support | `/sup-escalation-handler` |
| **Dallas** | Support | `/sup-policy-tuner` |
| **Frankie** | Support | `/sup-quality-reviewer` |
| **Corey** | Support | `/sup-ticket-analyst` |
