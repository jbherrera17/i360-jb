# Integrity Asset Acquisition Wizard

**Guided Interview Scripts for Populating Integrity Assets**

Use these prompts in sequence to acquire the data needed for each integrity asset type. Each section can be run as a conversation with an AI agent or facilitated as a workshop.

---

## Asset 1: Bright Lines

**Duration:** 60-90 minutes (workshop) or 30 minutes (individual)

### Opening Frame

> "Bright lines are your non-negotiables — the ethical boundaries you won't cross regardless of business pressure. These aren't aspirations; they're hard limits. Let's identify yours."

### Core Questions

**Question 1: The Ultimate Refusal**
> "What would you never do, even if refusing meant losing your biggest client or going out of business? Give me 2-3 specific examples."

*Probe deeper:*
- "What makes this non-negotiable for you?"
- "Has this ever been tested? What happened?"

**Question 2: Customer Treatment Boundaries**
> "What treatment of customers is unacceptable in your organization, regardless of the revenue at stake? Think of practices that would get someone fired immediately."

*Probe deeper:*
- "How would you know if this was happening?"
- "What's the enforcement mechanism?"

**Question 3: Data Practices**
> "What data practices are completely off-limits for your organization, even if competitors do them or they would be profitable?"

*Examples to prompt:*
- Selling customer data
- Tracking without consent
- Dark patterns for data collection
- Using data for unintended purposes

**Question 4: Automation Limits**
> "What would you refuse to automate, no matter how efficient it would make things? Where must a human always be in the loop?"

*Probe deeper:*
- "Why is human judgment essential here?"
- "What could go wrong if this was automated?"

**Question 5: The Test Question**
> "For each bright line we've identified, what's the question someone should ask themselves to know if they're approaching the line?"

*Example:* "Would I be comfortable if this decision was reported in the news tomorrow?"

### Output Template

For each bright line identified:
```json
{
  "id": "BL-001",
  "name": "[Short descriptive name]",
  "description": "[Full description of the boundary]",
  "category": "[customer_treatment | data_privacy | financial_integrity | employee_welfare | environmental | legal_compliance | other]",
  "test_question": "[The question to ask before acting]",
  "violation_examples": ["Example 1", "Example 2"],
  "enforcement_mechanism": "[How violations are handled]",
  "escalation_path": "[Who to contact if boundary is at risk]"
}
```

---

## Asset 2: Values Map

**Duration:** 90-120 minutes (team workshop) or 45 minutes (individual)

### Opening Frame

> "Every organization has two value systems: the values on the wall (stated values) and the values under pressure (stress values). Let's map both so we can see where the gaps are."

### For Each Core Value

**Step 1: State the Value**
> "What is the value as you've defined it? Give me the name and your official definition."

**Step 2: Normal Behaviors**
> "When things are going well — you have time, resources, and no crises — how does this value show up in daily operations? Give me 3-5 specific behaviors or decisions that demonstrate this value."

*Probe:*
- "Give me a recent example."
- "How would an outsider see this value in action?"

**Step 3: Stress Behaviors**
> "Now think about high-pressure situations — quarter-end pushes, crisis mode, resource constraints, tight deadlines. How does this value actually show up then? Be honest about what really happens."

*Probe:*
- "What corners get cut?"
- "What gets deprioritized?"
- "What would you rather not admit?"

**Step 4: Alignment Score**
> "On a scale of 1-5, how aligned is your stress behavior with your stated value?"
>
> - 5 = Fully aligned (we hold this even under maximum pressure)
> - 4 = Mostly aligned (minor compromises under extreme pressure)
> - 3 = Partially aligned (noticeable gaps when stressed)
> - 2 = Poorly aligned (the value often gets sacrificed under pressure)
> - 1 = Misaligned (stress behavior contradicts the stated value)

**Step 5: Gap Analysis**
> "What's the biggest gap between your stated value and your stress behavior? What would need to change to close it?"

### Pressure Indicators

> "What triggers 'stress mode' in your organization? What conditions cause values to slip?"

*Common triggers to explore:*
- Quarter/month/week end
- Key client demands
- Resource constraints
- Leadership pressure
- Competitive threats
- Crisis response

### Output Template

```json
{
  "organization_name": "[Your org]",
  "assessment_date": "2025-12-19",
  "values": [
    {
      "value_name": "[Value name]",
      "stated_definition": "[Official definition]",
      "normal_behaviors": ["Behavior 1", "Behavior 2", "Behavior 3"],
      "stress_behaviors": ["Behavior 1", "Behavior 2", "Behavior 3"],
      "alignment_score": 4,
      "gap_description": "[Description of the gap]",
      "improvement_actions": ["Action 1", "Action 2"]
    }
  ],
  "pressure_indicators": ["Quarter-end", "Key client escalations", "..."],
  "overall_drift_score": 3.8
}
```

---

## Asset 3: Intervention Metrics

**Duration:** 30 minutes (data gathering)

### Opening Frame

> "Let's measure your 'moral friction' — the human oversight that keeps automated systems aligned with your values."

### Data Gathering Questions

**Veto Metrics**
> "In the past [month/quarter]:
> 1. How many AI-generated or automated decisions were reviewed by a human?
> 2. Of those, how many were overridden, modified, or rejected?
> 3. What were the most common reasons for overrides?"

**Escalation Metrics**
> "For your automated processes:
> 1. What triggers an escalation to human review?
> 2. How many escalations occurred in the past [period]?
> 3. What was the total number of automated decisions in that period?"

**Pause-to-Proceed**
> "Of all decisions in your workflow:
> 1. How many required human review before proceeding?
> 2. How many were auto-approved without human intervention?
> 3. What determines which decisions need review?"

### If No Data Exists

> "Let's establish a baseline. For the next 30 days:
> 1. Track every AI-influenced decision that gets reviewed
> 2. Note any overrides and why
> 3. Count escalations and their triggers
>
> This creates your intervention baseline."

### Output Template

```json
{
  "period": "December 2025",
  "period_start": "2025-12-01",
  "period_end": "2025-12-31",
  "veto_metrics": {
    "ai_decisions_reviewed": 200,
    "decisions_overridden": 15,
    "veto_rate_percent": 7.5,
    "veto_reasons": [
      {"reason": "Customer context missing", "count": 6},
      {"reason": "Tone inappropriate", "count": 5},
      {"reason": "Factual error", "count": 4}
    ]
  },
  "escalation_metrics": {
    "total_automated_decisions": 3000,
    "escalations_triggered": 45,
    "escalation_rate_percent": 1.5,
    "avg_escalations_per_day": 1.5
  },
  "pause_to_proceed": {
    "decisions_requiring_review": 150,
    "auto_approved_decisions": 850,
    "deliberation_rate_percent": 15,
    "ratio_display": "1:5.67"
  }
}
```

---

## Asset 4: Trust Velocity Metrics

**Duration:** 45 minutes (data analysis)

### Opening Frame

> "Trust compounds or erodes. Let's measure which direction you're heading with your key stakeholders."

### Customer Relationship Data

**Relationship Longevity**
> "From your CRM or customer database:
> 1. How many active customers do you have?
> 2. What's the average customer tenure in months?
> 3. What was the average tenure 12 months ago?
> 4. Is the trend up (compounding) or down (eroding)?"

**Forgiveness Rate**
> "Looking at the past 12 months:
> 1. How many customers experienced a significant service failure or complaint?
> 2. Of those, how many are still active customers today (90-180 days later)?
> 3. What types of failures do customers forgive vs. not forgive?"

**Referral Analysis**
> "For your referral data:
> 1. How many new customer referrals in the past 12 months?
> 2. How many came from customers with 2+ years tenure?
> 3. Are your longest customers your strongest advocates?"

### Employee Trust Data

**Values Retention**
> "For employees in judgment-heavy roles (customer-facing, QA, compliance, management):
> 1. How many were in these roles at the start of the year?
> 2. How many have left?
> 3. What's the retention rate vs. overall company retention?
> 4. If judgment-role retention is lower than overall, that's a warning sign."

### Output Template

```json
{
  "period": "2025",
  "period_start": "2025-01-01",
  "period_end": "2025-12-31",
  "relationship_longevity": {
    "total_active_customers": 500,
    "avg_tenure_months": 18,
    "prior_period_avg_tenure": 16,
    "rli_velocity_percent": 12.5
  },
  "forgiveness_rate": {
    "customers_experiencing_failure": 100,
    "customers_retained_post_failure": 85,
    "forgiveness_rate_percent": 85
  },
  "referral_from_tenure": {
    "total_referrals": 60,
    "referrals_from_2plus_years": 25,
    "rft_rate_percent": 12.5,
    "rft_share_percent": 41.7
  },
  "employee_values_retention": {
    "judgment_role_employees_start": 20,
    "judgment_role_departures": 3,
    "evr_percent": 85,
    "overall_retention_percent": 78,
    "evr_delta": 7
  },
  "trust_trajectory": "compounding"
}
```

---

## Asset 5: Close Call Log

**Duration:** Ongoing (weekly 10-minute check-ins)

### Opening Frame

> "Near-misses are invisible wins. Let's make them visible by documenting what almost went wrong but didn't."

### Weekly Team Question

> "This week, complete this sentence: 'I stopped ______ from happening because ______.'"

*Examples:*
- "I stopped an email with confidential data from going to the wrong client because I double-checked the recipient list."
- "I stopped a pricing error from reaching customers because the QA process caught it."
- "I stopped a potentially offensive post from publishing because something felt off and I escalated."

### For Each Close Call

**Basic Documentation**
1. What almost happened?
2. What category? (customer impact, data privacy, compliance, reputation, financial, employee welfare)
3. How severe could it have been? (minor, moderate, severe, critical)
4. How was it caught?
5. Who intervened?

**Deeper Analysis (for severe/critical)**
6. What system or process was involved?
7. What was the root cause?
8. What corrective action was taken?
9. What could have been the financial/reputational/legal impact?
10. What did we learn?

### Monthly Aggregation

> "Review the month's close calls:
> - How many total?
> - Which categories had the most?
> - Is the count going up (better detection) or down (fewer risks)?
> - What patterns are emerging?"

---

## Asset 6: Industry Baseline

**Duration:** 2-3 hours (quarterly research)

### Opening Frame

> "To know what you've avoided, you need to know what happens to others. Let's build your industry risk baseline."

### Research Questions

**Industry Incidents**
> "Search industry news, trade publications, and regulatory databases for the past 12 months. Document:
> 1. Regulatory actions against companies in your sector
> 2. Lawsuits filed or settled
> 3. PR crises and reputation damage
> 4. Data breaches or security incidents
> 5. Notable compliance failures"

**For Each Incident**
- Company name
- What happened
- Outcome (fine, settlement, reputation damage)
- Estimated cost
- Date

**Calculate Rates**
> "Based on estimated companies in your segment:
> - What's the annual incident rate per category?
> - What's the average cost per incident type?"

### "We Don't Have That Problem" Analysis

> "List common industry problems you haven't experienced. For each:
> 1. Is it because of your systems (you have controls)?
> 2. Is it because of your culture (your values prevent it)?
> 3. Is it luck (you haven't faced the trigger conditions)?
>
> The 'luck' items are your vulnerabilities."

### Compliance Cost Avoidance Calculation

> "Using the formula:
> CCA = Industry Avg Cost × Industry Rate × Years Operating
>
> Calculate your estimated avoided costs per category, then sum for total."

---

## Asset 7: Integrity Yield

**Duration:** 30 minutes (calculation + interpretation)

### Prerequisites

Before calculating Integrity Yield, you need:
- Trust Velocity Metrics (normalized 0-100)
- Intervention Metrics (normalized 0-100)
- Front Page Pass Rate (from alignment audits)
- Pressure Decision Audit variance
- Compliance Cost Avoidance
- Total Integrity Investment (time + money)

### Normalization Guide

**Trust Velocity Score (0-100)**
```
Base score from:
- RLI Velocity: +10 per percentage point positive, -10 per point negative
- Forgiveness Rate: direct mapping (85% = 85 points)
- EVR Delta: +5 per positive point, -5 per negative

Average the three, cap at 0-100
```

**Intervention Effectiveness (0-100)**
```
- Veto Rate 5-10% = 80-100 (healthy range)
- Escalation Rate 1-3% = 80-100 (appropriate triggers)
- Close Call documentation: +20 if actively logging

Score based on whether metrics are in healthy ranges
```

**Alignment Audit Pass Rate**
```
Direct use of Front Page Pass Rate
Subtract Pressure Decision Audit variance

Example: 92% FPPR - 14% variance = 78 score
```

**Counterfactual Value**
```
ROI = Compliance Cost Avoidance / Integrity Investment
Normalize: ROI of 3x = 100, scale linearly below
```

### The Calculation

```
Integrity Yield =
    (Trust Velocity × 0.30) +
    (Intervention Effectiveness × 0.25) +
    (Alignment Audit × 0.25) +
    (Counterfactual Value × 0.20)
```

### Interpretation

| Score | Status | Action |
|-------|--------|--------|
| 80-100 | Strong | Maintain and document for stakeholders |
| 60-79 | Adequate | Identify top 2 improvement areas |
| 40-59 | Gaps | Prioritize alignment work immediately |
| <40 | Critical | Executive attention required |

### Leading Indicator Check

Review these signals:
- [ ] Escalation frequency trending up? (yellow/red if sudden spike)
- [ ] EVR Delta turning negative? (red if lower than overall retention)
- [ ] Front Page Pass Rate dropping? (yellow if <90%, red if <80%)
- [ ] Close call count increasing? (yellow if pattern, context-dependent)
- [ ] Bright Line Incidents increasing? (red if any held <90% firm)

---

## Quick-Start: Minimum Viable Acquisition

If you're starting from scratch and need to move fast:

### Week 1: Foundation
1. **Bright Lines** (1 hour) — Answer questions 1-5, document 3-5 lines
2. **Values Map** (1 hour) — Map 3 core values only

### Week 2: Measurement
3. **Close Call Log** (15 min) — Set up the channel, document any known near-misses
4. **Intervention Metrics** (30 min) — Gather whatever data exists, establish baseline plan

### Week 3: Trust Data
5. **Trust Velocity** (1 hour) — Pull CRM data, calculate core metrics

### Week 4: Benchmarking
6. **Industry Baseline** (2 hours) — Research 5-10 industry incidents
7. **Integrity Yield** (30 min) — Calculate first score, establish baseline

**Total Time: ~7 hours over 4 weeks**

---

*This wizard transforms the Integrity Metrics Framework from theory into operational data.*
