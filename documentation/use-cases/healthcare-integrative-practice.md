# Use Case: AI-Coordinated Care for an Integrative Health Practice

**ICP:** Healthcare (Multi-Provider Wellness Practice)
**Practice Profile:** 12-person integrative health clinic, $3.4M revenue, 420 active patients, Business-tier Insight 360 customer
**Last Updated:** 2026-03-18

---

## The Problem

Dr. Maya Chen runs **Thrive Integrative Health** — a 12-person clinic with 4 therapists (2 LCSW, 1 psychologist, 1 marriage & family therapist), 3 nutritionists, 2 health coaches, 1 nurse practitioner, and 2 front desk/admin staff. They treat the whole person: a patient dealing with anxiety might see a therapist weekly, a nutritionist monthly, and a health coach bi-weekly.

It's great care. It's also an operational nightmare.

**The coordination problem:** When a patient sees 3 providers, each one operates in their own silo. The therapist doesn't know the nutritionist recommended eliminating caffeine. The health coach doesn't know the therapist is working on sleep hygiene. The nutritionist doesn't know the patient told the health coach they stopped taking supplements. Each provider spends 15-20 minutes per shared patient *just trying to stay in sync* — reading each other's notes, sending internal messages, or catching up in hallway conversations that never quite happen.

**The engagement gap:** Between appointments, patients are on their own. The therapist assigns homework, the nutritionist gives a meal plan, the health coach sets movement goals — and patients forget, mix things up, or feel overwhelmed by three sets of instructions from three providers. No one coordinates the between-visit experience.

**The admin burden:** Dr. Chen spends 30% of her time on non-clinical work. Treatment summaries for insurance, employer wellness program reports, care plan documentation, and the endless task of making sure nothing falls through the cracks across 420 patients and 9 providers.

**The question:** How do you make 9 providers feel like one unified care team — to each other *and* to the patient — without tripling the admin staff?

---

## Overview

This use case walks through the complete Align 120 → Strategy 120 → Execute 120 pipeline for an integrative health practice launching AI-coordinated care. It demonstrates how the platform helps a multi-provider clinic deliver unified, continuous patient experiences while cutting coordination overhead by 80% and opening a new revenue stream through employer wellness partnerships.

---

## Phase 1: Strategic Decision (Strategy 120)

### Step 1: Strategic Assessment with Alfred

**Prompt:** `/exec-strategic-advisor` — "I run a 12-person integrative health clinic with 420 patients. Our providers work in silos — therapists, nutritionists, and health coaches don't coordinate well between visits. Patients get fragmented care. I want to use AI to unify the care experience and reduce provider admin time. Is this viable in healthcare's regulatory environment?"

**Alfred produces:**
- Market analysis of AI in integrative health (Welkin Health, Healthie, SimplePractice — what they do and don't solve)
- Regulatory landscape: HIPAA constraints on AI processing patient data, state-by-state telehealth/AI rules
- Risk assessment: where AI genuinely helps healthcare vs. where it creates liability
- Three models with trade-offs:
  - **Model A:** AI coordinates provider-to-provider only (internal sync, no patient-facing AI) → solves silos, doesn't help engagement
  - **Model B:** AI coordinates providers AND delivers between-visit patient touchpoints (check-ins, reminders, resource curation) → solves both problems
  - **Model C:** AI adds predictive care (flags patients at risk of dropping out, suggests treatment adjustments) → maximum impact, maximum regulatory complexity
- Kill criteria: if provider adoption falls below 60%, or if any patient data breach occurs during pilot

**Key insight Alfred surfaces:** The biggest win isn't fancy AI — it's *unified care summaries*. Right now, a patient who sees three providers gets three separate sets of instructions. AI can synthesize those into one coherent care plan: "Here's what your whole team wants you to focus on this week." That single capability — which is technically simple — transforms the patient experience from fragmented to integrated. **Model B** is the right fit: internal coordination plus patient-facing unified touchpoints, without crossing into clinical decision-making territory.

### Step 2: Cross-Department Coordination with Higgins

**Prompt:** `/exec-orchestrator` — "Based on Alfred' assessment, we want to pursue Model B: AI coordinates care across providers internally and delivers unified between-visit touchpoints to patients. Coordinate the plan."

**Higgins delegates:**
- **Kendall** (`/biz-pricing`) — design pricing for the "Thrive Connected" patient experience. Should it be included in visit fees or an add-on membership?
- **Cameron** (`/biz-finance`) — model the economics. What does coordination overhead cost us today in provider time? What's the ROI of reclaiming that time?
- **Morgan-L** (`/biz-legal`) — HIPAA deep dive. What can AI process? Where does PHI live? What BAAs (Business Associate Agreements) do we need? State-specific rules?
- **Dakota** (`/mkt-orchestrator`) — position "Thrive Connected" to patients and to employer wellness programs (the B2B angle)
- **Tatum** (`/sales-orchestrator`) — 420 patients is a start, but the real growth is employer wellness partnerships. Companies pay for coordinated care for their employees.
- **Ellis** (`/biz-strategy`) — cascade into OKRs. This isn't just a service upgrade — it's a new business model.
- **Peyton** (`/biz-customer-success`) — design patient health scoring. Which patients are engaged, at risk of dropping off, or underutilizing their care team?

**Higgins flags a critical tension:** Legal needs maximum data minimization. The care coordination vision needs data sharing across providers. Higgins proposes the resolution: AI processes *care plan summaries and stated goals only* — never raw session transcripts or clinical notes. Providers review and approve all patient-facing content. The AI sees what a care coordinator would see, not what a clinician documents privately.

### Step 3: Decision Documentation with Jarvis

**Prompt:** `/exec-chief-of-staff` — "Document the decision to launch 'Thrive Connected' — our AI-coordinated care model. Dr. Chen approves Model B with a 30-patient pilot starting with multi-provider patients."

**Jarvis produces:**
- **Decision Record** (DEC-2026-011) with rationale
- **Values Alignment Check:**
  - Human-centered: Providers own all clinical decisions. AI coordinates, never recommends treatment.
  - Radical Transparency: Patients get a clear one-pager explaining what AI does and doesn't do.
  - Quality-first: Every patient-facing message is provider-reviewed before delivery.
  - Do No Harm: AI never processes raw clinical notes. Operates on care plan summaries only.
- **Rollout Plan:**
  - Phase 1 (Weeks 1-6): Build, configure, HIPAA compliance verification. 0 patients.
  - Phase 2 (Weeks 7-10): Pilot with 30 multi-provider patients. Measure coordination time, patient satisfaction, provider adoption.
  - Phase 3 (Weeks 11-18): Expand to all 420 patients. Begin employer wellness outreach.
  - Phase 4 (Month 6+): Scale employer partnerships. Target 3 corporate accounts.
- **Action Items** routed to **Marley** (`/biz-follow-up`) with trigger dates

---

## Phase 2: Execution (Execute 120)

Each team member sees their personalized command center:

- **Dr. Chen (Founder/NP):** Strategic overview, patient health scores, employer partnership pipeline, care coordination dashboard
- **Therapists/Nutritionists/Coaches:** Unified patient view (what other providers are working on), AI-drafted between-visit touchpoints for review, care plan sync alerts
- **Front Desk/Admin:** Patient onboarding status, scheduling optimization, insurance/wellness program reporting queue

---

### Stream 1: Finance (Marlowe's Team)

**Initiative owner:** Dr. Chen

| Week | Task | Agent | Execute 120 Surface |
|------|------|-------|-------------------|
| 1-2 | Calculate current coordination cost: 9 providers × 15 min/shared patient × avg 2.3 shared patients/provider/day = X hours/month of lost clinical time | **Cameron** (`/biz-finance`) | Quick Action: "Calculate coordination overhead" |
| 2 | Price "Thrive Connected": membership add-on vs. bundled vs. employer-paid models | **Kendall** (`/biz-pricing`) | Context Asset: Healthcare membership pricing |
| 3 | Model employer wellness revenue: what do companies pay per employee for coordinated care? | **Cameron** + **Kendall** | Workflow: "B2B revenue model" |
| 3 | Set up financial tracking: coordination time reclaimed, patient retention, new revenue | **Harley** (`/fin-revenue-ops`) | My Agent: Revenue Tracker |
| Ongoing | Monthly P&L with AI platform costs, membership revenue, employer contracts | **Noel** (`/fin-budget-forecast`) | Workflow: "Monthly healthcare P&L" |

**Kendall's pricing output:**
- **Coordination cost today:** 9 providers × 15 min × 2.3 patients × 22 days = ~114 hours/month of provider time spent on coordination. At an average $120/hr blended rate, that's **$13,680/month in lost clinical capacity** — visits that could be happening but aren't.
- **"Thrive Connected" membership:** $89/month per patient (covers AI coordination, between-visit touchpoints, unified care summaries, priority scheduling)
- **Employer wellness tier:** $149/employee/month (adds quarterly wellness reports, HR dashboard access, aggregate anonymized health trends)
- **Revenue projection:**
  - Patient memberships: 300 patients × $89 = $26,700/mo ($320K/yr)
  - Employer partnerships: 3 companies × 50 employees × $149 = $22,350/mo ($268K/yr)
  - Reclaimed clinical time: 114 hours → ~90 additional patient visits/month at avg $180/visit = $16,200/mo ($194K/yr)
  - **Total new revenue: $782K/yr** — taking the practice from $3.4M to $4.2M
- Passes 65% margin floor: platform cost $299/mo + ~$20/patient/mo AI usage. At 300 patients, margin is **92%** on the membership layer.

---

### Stream 2: Legal & Compliance (Morgan-L)

**Initiative owner:** Dr. Chen / Compliance Lead

| Week | Task | Agent | Execute 120 Surface |
|------|------|-------|-------------------|
| 1-2 | HIPAA compliance framework: what constitutes PHI in AI processing? What's the minimum necessary standard? | **Morgan-L** (`/biz-legal`) | Quick Action: "HIPAA AI assessment" |
| 2 | Draft Business Associate Agreement (BAA) for AI platform provider | **Morgan-L** | Context Asset: BAA template |
| 2-3 | State-specific review: does the clinic's state have additional AI-in-healthcare rules? | **Morgan-L** | Workflow: "State regulatory scan" |
| 3 | Patient consent form: opt-in for AI-coordinated care with granular data sharing preferences | **Morgan-L** | Context Asset: Patient consent template |
| 3-4 | HIPAA risk assessment: identify and score all PHI touchpoints in the AI workflow | **Riley** (`/pm-compliance-auditor`) | Workflow: "PHI risk assessment" |
| 4 | Data retention and destruction policy: when AI summaries are purged, audit trail requirements | **Morgan-L** + **Riley** | Quick Action: "Data lifecycle policy" |

**Critical outputs:**

**Data Architecture (the most important legal deliverable):**
- **What AI processes:** Care plan summaries (provider-approved), stated patient goals, appointment history, between-visit check-in responses, provider-to-provider care coordination notes
- **What AI NEVER sees:** Raw session transcripts, clinical assessments, psychiatric evaluations, diagnostic codes, medication lists, insurance information
- **Where PHI lives:** AI processes within a HIPAA-compliant environment. Summaries are encrypted at rest and in transit. No PHI stored in AI model memory beyond the active session.
- **Patient control:** Patients can view exactly what data AI has access to, revoke consent at any time, request data deletion within 30 days

**Patient Consent Form (2-page, plain language):**
- Page 1: "What Thrive Connected does" — written at an 8th-grade reading level
- Page 2: Granular checkboxes — patients can opt into care coordination (provider sync) without opting into between-visit AI touchpoints, or vice versa
- "This is not therapy, medical advice, or a substitute for seeing your provider. It's a coordination service that helps your care team work together more effectively."

---

### Stream 3: Marketing (Dakota's Team)

**Initiative owner:** Dr. Chen / Admin Lead

| Week | Task | Agent | Execute 120 Surface |
|------|------|-------|-------------------|
| 2 | Calibrate voice for healthcare audience: caring, clear, never clinical — talk like a trusted friend, not a doctor | **Harper** (`/mkt-brand-voice`) | Context Asset: Thrive Voice DNA |
| 3 | Campaign strategy: two tracks — patient launch + employer wellness outreach | **Sage** (`/mkt-campaign`) | Workflow: "Dual-track launch campaign" |
| 3-4 | Patient-facing content: "Meet Thrive Connected" — email + in-office handout | **River** (`/mkt-content`) | Quick Action: "Patient announcement" |
| 4 | Adapt messaging: patients (personal health journey) vs. HR Directors (employee wellness ROI) vs. benefits consultants (vendor comparison) | **Avery-M** (`/mkt-icp-adapt`) | My Agent: ICP Adapter |
| 4-5 | Write Dr. Chen's thought leadership: "Why your healthcare team should feel like one person, not three strangers" | **Rowan** (`/mkt-thought-leadership`) | Workflow: "Thought leadership series" |
| 5 | Competitive positioning: Thrive Connected vs. SimplePractice (no coordination) vs. Welkin (enterprise-only) vs. going it alone | **Blake** (`/mkt-competitive`) | Context Asset: Competitive battlecard |
| 5 | Employer wellness one-pager: ROI-focused, data-driven, speaks to CFO and HR Director | **River** + **Avery-M** | Quick Action: "B2B one-pager" |
| 6 | Final QA on all content — extra scrutiny for healthcare claims compliance | **Emery** (`/mkt-brand-review`) | Workflow: "Brand review gate" |

**Dakota's two-track approach:**

**Track 1 — Patients:** Warm, personal. "Your care team is about to feel like one person." Focus on the experience: fewer conflicting instructions, someone remembering what you told your nutritionist when you see your therapist, weekly unified check-ins.

**Track 2 — Employers:** ROI-driven. "Coordinated care reduces absenteeism by X%. Employees using integrative health services report Y% higher satisfaction. Here's the dashboard where you'll see anonymized health trends for your workforce."

**Rowan's thought leadership angle for Dr. Chen:**
> "We built Thrive because we believe the whole person matters — not just their anxiety, or their diet, or their fitness. But here's our dirty secret: our providers barely talked to each other. The nutritionist didn't know the therapist was working on emotional eating. The health coach didn't know the patient had just had a breakthrough in therapy. We were treating the whole person in theory and three strangers in practice. AI didn't replace our clinicians. It gave them something they never had: a shared brain."

---

### Stream 4: Sales (Tatum's Team)

**Initiative owner:** Dr. Chen / Business Development

| Week | Task | Agent | Execute 120 Surface |
|------|------|-------|-------------------|
| 4 | Build "Thrive Connected for Employers" proposal template with ROI projections | **Drew** (`/sales-proposal`) | Workflow: "Employer partnership proposal" |
| 4-5 | Objection handling: "Is patient data safe?" / "What if employees don't want AI?" / "How is this different from an EAP?" | **Reese-S** (`/sales-enablement`) | Context Asset: Employer objection playbook |
| 5 | Research 10 target employers: companies with 50-500 employees, existing wellness programs, benefits renewal timing | **Kieran** (`/sales-account-research`) | My Agent: Account Researcher |
| 5-6 | Personalized outreach to HR Directors and benefits consultants at target companies | **Remy** (`/sales-outreach`) | Workflow: "Employer outreach campaign" |
| 6 | Prep Dr. Chen for first employer pitch meetings | **Jules** (`/sales-call-prep`) | Quick Action: "Prep for employer meeting" |
| Ongoing | Track employer pipeline: outreach → meeting → pilot → contract | **Hayden** (`/sales-pipeline`) | My Agent: Pipeline Analyst |

**Tatum's approach:** Healthcare sales is relationship-first. The pitch isn't "buy our AI product" — it's "your employees already have fragmented healthcare. We unify it." Logan (`/sales-deal-strategy`) qualifies employer prospects on three dimensions: (1) Do they already invest in employee wellness? (2) Are they in benefits renewal season? (3) Does the company culture support integrative/holistic health?

**Key differentiation from EAPs (Employee Assistance Programs):**

| Dimension | Traditional EAP | Thrive Connected |
|-----------|----------------|------------------|
| Scope | Mental health referral (reactive) | Integrated care coordination (proactive) |
| Provider relationship | Random assignment, no continuity | Dedicated multi-provider team |
| Between visits | Nothing | Weekly unified touchpoints |
| Employer visibility | Utilization % only | Anonymized wellness trends, engagement metrics |
| Employee experience | "Call this number if you need help" | "Your care team is always in sync" |

---

### Stream 5: Operations (Riley-O's Team)

**Initiative owner:** Admin Lead / Office Manager

| Week | Task | Agent | Execute 120 Surface |
|------|------|-------|-------------------|
| 1-3 | Design the AI-coordinated care workflow: what happens when a patient sees multiple providers? | **Kai** (`/ops-process-analyst`) | Workflow: "Care coordination SOP" |
| 2 | Capacity model: with coordination overhead reduced, how many more patients can each provider see? | **Nico** (`/ops-resource-planner`) | My Agent: Resource Planner |
| 3-4 | Configure I-360 agents for healthcare workflows (extra security, HIPAA logging) | **Sage-O** (`/ops-vendor-manager`) | Quick Action: "Platform setup" |
| 4 | Define SLAs: unified care summary within 2 hours of any visit, between-visit check-in by Wednesday, provider sync alert within 1 hour of a conflict | **Devon** (`/ops-sla-monitor`) | Context Asset: Healthcare SLA template |
| Ongoing | Track coordination time (target: 15 min → 3 min per shared patient), patient visit capacity | **Rowan-O** (`/ops-cost-analyst`) | My Agent: Cost Analyst |

**Kai's care coordination workflow (the key deliverable):**

```
AFTER EACH VISIT (AI-driven, provider reviews)
───────────────────────────────────────────────
1. Provider completes visit and enters care summary
   (goals, recommendations, homework assigned)
2. AI compares new summary against other providers' active care plans
3. AI flags conflicts or synergies:
   - CONFLICT: "Therapist assigned journaling before bed.
     Health coach assigned evening workouts. Patient reports
     trouble sleeping. These may compete for the same time slot."
   - SYNERGY: "Nutritionist's anti-inflammatory diet aligns with
     therapist's work on stress reduction. Reinforce connection."
4. Flagged items appear in other providers' dashboards within 1 hour
5. Providers acknowledge or adjust (2-min task vs. 15-min note search)

UNIFIED PATIENT TOUCHPOINT (AI-drafted, provider-approved)
──────────────────────────────────────────────────────────
6. AI synthesizes all active care plans into one weekly message:
   "Here's what your care team wants you to focus on this week:
    - From your therapist: Practice the 5-4-3-2-1 grounding exercise
    - From your nutritionist: Try 2 new anti-inflammatory recipes
    - From your coach: 3 walks this week, 20 min each
    Your next appointments: Therapy Tue 2pm, Nutrition Fri 10am"
7. Primary provider reviews and approves (3 min)
8. Patient receives unified message (email or patient portal)

MID-WEEK CHECK-IN (AI-driven, provider monitors)
─────────────────────────────────────────────────
9. AI sends simple check-in: "How are things going this week?
   Which goals felt manageable? Which felt like a stretch?"
10. Patient responds (free text or quick rating)
11. AI categorizes response and routes to relevant provider:
    - Positive: logged for next session prep
    - Struggling: flagged to relevant provider for review
    - Concerning: immediate alert to primary provider

CARE TEAM SYNC (AI-generated, weekly)
─────────────────────────────────────
12. AI generates weekly care team digest for each multi-provider patient:
    - What each provider is working on
    - Patient's between-visit engagement (responded to check-ins?)
    - Flags: missed appointments, conflicting recommendations, stalled goals
13. Providers review in 5 min (replaces 15-min chart review per patient)

MONTHLY REPORTING
─────────────────
14. For patients: AI generates progress report across all providers
15. For employer wellness programs: anonymized aggregate report
    (engagement rates, wellness trends, utilization by service type)
16. For insurance: treatment summary with goals and outcomes documented
```

---

### Stream 6: Support (Sloan's Team)

**Initiative owner:** Admin Lead

| Week | Task | Agent | Execute 120 Surface |
|------|------|-------|-------------------|
| 4-5 | Build patient onboarding guide: "What is Thrive Connected and how does it work?" — in-office handout + digital version | **Kris** (`/sup-knowledge-manager`) | Workflow: "Patient onboarding KB" |
| 5 | Escalation playbook: patient uncomfortable with AI ("I don't want a computer involved in my healthcare") — empathetic, zero-pressure opt-out | **Toni** (`/sup-escalation-handler`) | Context Asset: Patient opt-out playbook |
| 5-6 | Safety policy: when does AI alert a provider immediately vs. log for next session? | **Dallas** (`/sup-policy-tuner`) | Quick Action: "Clinical safety thresholds" |
| Ongoing | Monitor patient feedback on between-visit touchpoints | **Frankie** (`/sup-quality-reviewer`) | My Agent: Quality Reviewer |
| Ongoing | Analyze: which touchpoints drive engagement? Which care team configurations get best outcomes? | **Corey** (`/sup-ticket-analyst`) | My Agent: Engagement Analyst |

**Dallas's safety policy (critical — healthcare-specific):**

| Tier | Trigger | Action | Response Time |
|------|---------|--------|---------------|
| **RED — Immediate** | Patient mentions self-harm, suicidal ideation, abuse, or acute crisis in any check-in response | Alert primary provider AND therapist immediately via phone + in-app. Do NOT respond with AI-generated content. | < 5 minutes |
| **ORANGE — Urgent** | Patient reports medication side effects, severe symptom changes, or requests emergency appointment | Alert relevant provider. AI acknowledges: "I'm letting your care team know right away." | < 1 hour |
| **YELLOW — Monitor** | Patient misses 2+ check-ins, reports no progress for 3+ weeks, or expresses frustration with care | Flag for provider review at next sync. Suggest proactive outreach. | < 24 hours |
| **GREEN — Routine** | Positive check-in responses, goal completion updates, scheduling questions | AI handles autonomously. Logged for session prep. | Standard |
| **NEVER** | Clinical advice, diagnosis hints, medication suggestions, therapeutic interventions, interpretation of symptoms | AI never generates this content. If patient asks, redirect: "That's a great question for your [provider] at your next visit." | N/A |

---

## Executive Tracking: Higgins + Jarvis

### Weekly Briefing (Jarvis)

```
EXECUTIVE BRIEFING
───────────────────────────
Date: Week 8 of Thrive Connected Initiative
Prepared For: Dr. Maya Chen, Founder

─── TOP OF MIND ───
1. Pilot running with 30 patients — care coordination working across
   all provider combinations (therapy+nutrition, therapy+coaching,
   full trio)
2. Provider feedback: "I haven't read another provider's notes to prep
   for a shared patient in 3 weeks. The AI digest tells me everything."
3. First employer meeting scheduled — local tech company (180 employees),
   HR Director is a current patient

─── DEPARTMENT PULSE ───
| Department     | Status  | On Track? |
|---------------|:-------:|:---------:|
| Finance       | Green   | Membership model validated, employer pricing confirmed |
| Legal         | Green   | BAA signed, HIPAA risk assessment complete, 0 findings |
| Marketing     | Green   | Patient launch email ready, employer one-pager drafted |
| Sales         | Green   | 10 employer targets identified, 3 meetings scheduled |
| Operations    | Green   | Care coordination SOP finalized, SLAs exceeded |
| Support       | Green   | Onboarding guide complete, safety policy live |

─── KEY METRICS (Pilot Month 1) ───
| Metric | Target | Actual |
|--------|--------|--------|
| Patient NPS | ≥70 | 88 |
| Care coordination time | ≤5 min/patient | 3 min/patient (was 15 min) |
| Between-visit engagement | ≥40% | 72% (22/30 respond to check-ins) |
| Provider adoption | ≥60% | 100% (all 9 providers using daily) |
| Conflict flags resolved | 100% within SLA | 100% (14 flags, all resolved <1 hr) |
| Safety escalations | Handled per policy | 2 yellow flags — both routed correctly |

─── DECISIONS PENDING ───
1. Approve full rollout to all 420 patients (recommended: phased, 50/week)
2. Approve employer pilot terms (proposed: 90-day free pilot for first partner)
3. Hire a care coordinator to manage the AI-assisted workflow at scale?

─── FOLLOW-UPS DUE (from Marley) ───
- Employer pilot proposal: sent to TechCorp HR — AWAITING RESPONSE
- Full patient rollout timeline: proposed Week 11 start — ON TRACK
- Provider training refresh: scheduled Week 9 — ON TRACK
- Insurance reporting template: drafted, under legal review — ON TRACK
```

---

## The Numbers: Before and After

```
BEFORE (Siloed Practice)               AFTER (AI-Coordinated with I-360)
────────────────────────               ──────────────────────────────────
420 active patients                    420+ (growing with employer partnerships)
$3.4M annual revenue                   $4.2M projected (+$782K new revenue)
15 min coordination per shared patient  3 min coordination per shared patient
Providers work in silos                 Unified care team view per patient
4 visits/month touchpoints only         12+ touchpoints/month per patient
Patients get 3 separate instruction     Patients get 1 unified weekly plan
  sets from 3 providers
No between-visit engagement             72% between-visit engagement rate
No employer wellness offering           3 corporate accounts (target Year 1)
Manual insurance reporting              Automated treatment summaries
Dr. Chen: clinician + admin firefighter Dr. Chen: clinician + growth strategist
```

---

## Pipeline Summary

```
ALIGN 120                    STRATEGY 120                EXECUTE 120
─────────                    ────────────                ───────────
"Who are we?"                "What should we do?"        "Who does what, by when?"

Values: Whole-person care,   Initiative: AI-Coordinated  6 department streams
  Do No Harm, Transparency     Care (Model B)            28 agent tasks
Brand: Caring, clear,        Business case: +$782K/yr    10 workflows triggered
  never clinical               new revenue               Weekly Jarvis briefings
AI = care coordinator,       3-model analysis            Marley tracks 22 follow-ups
  not clinician              Decision: DEC-2026-011      Higgins resolves tensions
HIPAA first, everything      Kill criteria: <60%
  second                       provider adoption

        ──────────>                  ──────────>
    Practice identity            Initiatives +           Personalized dashboards:
    feeds Strategy               OKRs feed               Dr. Chen sees strategy,
    agent context                Execute overview         providers see patients,
                                                         admin sees operations
```

---

## Key Takeaways

1. **A 12-person clinic gets enterprise health system coordination.** Multi-provider care coordination is a problem that typically requires a dedicated care coordinator ($60K+/year) or an enterprise platform ($50K+/year). Thrive gets both capabilities through the platform at a fraction of the cost, with 30 specialized agents handling everything from HIPAA compliance to employer sales.

2. **The "shared brain" transforms patient experience.** Patients stop feeling like they're managing three separate healthcare relationships. One unified weekly message. One set of priorities. One care team that actually knows what the others are doing. The 72% between-visit engagement rate proves patients want this connection.

3. **Coordination overhead drops 80%.** Provider time spent on coordination goes from 15 minutes to 3 minutes per shared patient. At 114 hours/month of reclaimed time, that's ~90 additional patient visits — revenue that was being burned on internal logistics.

4. **The employer wellness channel is a new growth engine.** The practice goes from B2C only ($3.4M) to B2C + B2B ($4.2M) by offering coordinated care as an employer benefit. HR Directors get a dashboard, employees get better care, and the practice gets recurring contract revenue.

5. **HIPAA compliance is designed in, not bolted on.** Morgan-L's data architecture ensures AI processes only care plan summaries and stated goals — never raw clinical notes, diagnoses, or medication lists. Patient consent is granular and revocable. This isn't "we hope it's compliant" — it's "here's exactly what the AI can and cannot see, and the patient controls the boundary."

6. **The safety policy is non-negotiable.** Dallas's tiered escalation ensures AI never crosses clinical boundaries. RED tier (self-harm, crisis) triggers immediate provider alerts. AI never offers clinical advice, interprets symptoms, or suggests treatment. The phrase "That's a great question for your [provider] at your next visit" is a hard-coded guardrail, not a suggestion.

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
| **Peyton** | Customer Success | `/biz-customer-success` |
| **Marley** | Follow-Up Manager | `/biz-follow-up` |

### Department Agents Used
| Agent | Department | Skill |
|-------|-----------|-------|
| **Noel** | Finance | `/fin-budget-forecast` |
| **Harley** | Finance | `/fin-revenue-ops` |
| **Riley** | Product (Compliance) | `/pm-compliance-auditor` |
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
