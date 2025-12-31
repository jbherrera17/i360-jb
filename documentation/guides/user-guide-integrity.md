# Integrity Dashboard User Guide

**Insight 360 — Making the Invisible Visible**

---

## What is the Integrity Dashboard?

The Integrity Dashboard helps you measure and track your organization's ethical health. It answers the question most metrics can't: **"What problems didn't happen because we did the right thing?"**

Traditional metrics show you what went wrong. The Integrity Dashboard shows you what went right — the lawsuits you avoided, the customers who stayed, the crises that never happened.

---

## Quick Start

### First-Time Setup (30 minutes)

1. **Navigate to Integrity** — Click "Integrity" in the sidebar
2. **Start with Bright Lines** — Define your non-negotiables first
3. **Map Your Values** — Document stated vs. stress values
4. **Begin the Close Call Log** — Start documenting near-misses

That's enough to get started. The other assets can be added over time.

---

## Understanding the Dashboard

### The Integrity Yield Score

The large circular gauge shows your overall integrity posture on a 0-100 scale.

| Score | Status | What It Means |
|-------|--------|---------------|
| 80-100 | **Strong** | Systems aligned with stated values |
| 60-79 | **Adequate** | Room for improvement, but fundamentals solid |
| 40-59 | **Gaps** | Significant issues need attention |
| Below 40 | **Critical** | Immediate action required |

The score combines four components, each weighted differently:

### Component Breakdown

**Trust Velocity (30%)**
Are your relationships strengthening or eroding?
- Customer tenure trends
- Forgiveness rates after failures
- Referrals from long-term customers
- Employee retention in judgment-heavy roles

**Intervention Effectiveness (25%)**
Is human oversight actually working?
- Veto rate on AI decisions
- Escalation frequency
- Pause-to-proceed ratios
- Close calls documented

**Alignment Audit (25%)**
Do your actions match your stated values?
- Front Page Pass Rate
- Values Drift Score
- Pressure Decision variance
- Bright Line hold rate

**Counterfactual Value (20%)**
What has your integrity saved you?
- Compliance costs avoided
- Industry incident comparison
- Close call valuations
- ROI on integrity investments

---

## The Seven Integrity Assets

### Foundation Layer

These define *what* you stand for.

#### 1. Bright Lines

**What it is:** Your non-negotiable ethical boundaries — things you won't do regardless of business pressure.

**Example entries:**
- "We never sell customer data, even anonymized"
- "We never use dark patterns to trick users"
- "We never ship without security review, regardless of deadline"

**How to populate:**
1. Go to Context Assets → Create New → Bright Lines
2. For each bright line, define:
   - The boundary itself
   - A test question (e.g., "Would this decision require us to explain ourselves?")
   - Examples of violations
   - Who enforces it

**Update frequency:** Review annually, update when tested

---

#### 2. Values Map

**What it is:** The gap between your *stated* values (what you claim) and your *stress* values (what you actually do under pressure).

**Example entry:**
```
Value: Customer First

Normal behavior:
- We respond to support tickets within 4 hours
- We proactively reach out about known issues
- We give refunds without hassle

Stress behavior (quarter-end):
- Support tickets deprioritized for sales calls
- Known issues not communicated to avoid churn
- Refunds require manager approval

Alignment Score: 3/5 (Partially Aligned)
```

**How to populate:**
1. List your 3-5 core values
2. For each, document what it looks like on a normal Tuesday
3. Then document what it looks like during quarter-end, a crisis, or resource crunch
4. Score alignment honestly (1-5)

**Update frequency:** Quarterly assessment

---

### Measurement Layer

These track *how* you're performing.

#### 3. Intervention Metrics

**What it is:** Evidence that your human-in-the-loop checkpoints are working.

**Key metrics to track:**
- **Veto Rate:** What % of AI decisions get overridden by humans?
- **Escalation Rate:** How often do automated systems flag for human review?
- **Deliberation Rate:** What % of decisions require human approval vs. auto-proceed?

**Healthy ranges:**
- Veto Rate: 5-10% (too low = rubber-stamping; too high = AI misconfigured)
- Escalation Rate: 1-3% (system appropriately flagging edge cases)
- Deliberation Rate: 10-20% (meaningful oversight without bottleneck)

**How to populate:**
1. Identify all AI-influenced decision points
2. Track reviews and overrides for 30 days
3. Calculate rates
4. Document reasons for overrides

**Update frequency:** Monthly

---

#### 4. Trust Velocity Metrics

**What it is:** Whether trust is compounding (good) or eroding (bad) in your key relationships.

**Key metrics:**
- **Relationship Longevity Index:** Average customer tenure — is it growing?
- **Forgiveness Rate:** When things go wrong, what % of customers stay?
- **Referral-from-Tenure:** Are your longest customers your biggest advocates?
- **Employee Values Retention:** Are people in judgment roles leaving faster than average?

**What to watch for:**
- RLI declining during growth = new customers masking retention problems
- Forgiveness rate < 70% = relationships are transactional, not trust-based
- EVR Delta negative = insiders see values drift before outsiders do

**How to populate:**
1. Pull customer tenure data from CRM
2. Identify service failures from past 12 months
3. Track retention post-failure
4. Segment referrals by customer tenure

**Update frequency:** Quarterly

---

#### 5. Close Call Log

**What it is:** Documentation of near-misses — the crises that didn't happen because someone intervened.

**Example entry:**
```
Date: 2025-12-15
Category: Data Privacy
Severity: Severe

What almost happened:
Customer export accidentally included other customers' email addresses

How it was caught:
QA spotted the issue during routine pre-send review

Who intervened:
Sarah (QA Lead)

Estimated impact avoided:
- Financial: $50K+ (notification costs, potential fines)
- Reputational: Significant (trust breach)
- Legal: Moderate (GDPR implications)

Corrective action:
Added automated PII detection to export pipeline
```

**How to populate:**
Weekly team check-in: "What almost went wrong this week?"

Format: "I stopped [X] from happening because [Y]"

**Update frequency:** Ongoing (weekly aggregation)

---

### Comparison Layer

These benchmark you against *what could have been*.

#### 6. Industry Baseline

**What it is:** A database of integrity incidents in your industry — what happens to companies that don't invest in integrity.

**What to track:**
- Regulatory actions and fines
- Lawsuits and settlements
- PR crises and their costs
- Data breaches
- Compliance failures

**How to populate:**
1. Quarterly scan of industry news
2. Search: "[your industry] lawsuit", "[your industry] fine", "[your industry] data breach"
3. Document company, incident, outcome, estimated cost
4. Calculate incident rates (incidents / companies in segment)

**"We Don't Have That Problem" Analysis:**

For each common industry problem you've avoided, ask: *Why?*

- **Systemic (S):** We have controls that prevent this
- **Cultural (C):** Our values prevent this
- **Luck (L):** We just haven't faced the trigger conditions yet

The "L" items are your vulnerabilities.

**Update frequency:** Quarterly

---

### Composite Layer

#### 7. Integrity Yield

**What it is:** The calculated composite score that appears on your dashboard.

**You don't manually populate this.** It's calculated from the other assets.

**Formula:**
```
Integrity Yield =
  (Trust Velocity × 0.30) +
  (Intervention Effectiveness × 0.25) +
  (Alignment Audit × 0.25) +
  (Counterfactual Value × 0.20)
```

**Update frequency:** Automatically recalculated when component data changes

---

## Using the Integrity Agents

Three AI agents are pre-configured to help you operationalize the framework.

### Integrity Auditor

**Use for:** Evaluating specific decisions against your values

**Example prompts:**
- "Review this customer communication for alignment with our values"
- "Perform a Front Page Test on our new pricing policy"
- "Analyze our Q4 decisions for values drift"

**What it does:**
- Applies the "newspaper test" to decisions
- Scores alignment with each stated value
- Identifies bright lines being approached
- Compares normal vs. pressure period decisions

---

### Risk Sentinel

**Use for:** Monitoring trends and getting early warnings

**Example prompts:**
- "Review our leading indicators for the past quarter"
- "What patterns do you see in our escalation data?"
- "Are there any warning signs I should be concerned about?"

**What it does:**
- Analyzes trends across your metrics
- Distinguishes concerning patterns from noise
- Provides alert levels (Green/Yellow/Red)
- Suggests investigation steps

---

### Counterfactual Analyst

**Use for:** Quantifying the value of your integrity investments

**Example prompts:**
- "Calculate our estimated compliance cost avoidance"
- "What's the ROI on our integrity investments?"
- "Value the close calls we documented this quarter"

**What it does:**
- Estimates costs avoided based on industry baselines
- Calculates ROI on human oversight investment
- Values documented near-misses
- Creates executive-ready reports

---

## Leading vs. Lagging Indicators

The dashboard separates indicators into two categories:

### Leading Indicators (Act on these)
These predict problems *before* they become crises:

- Escalation frequency trending up
- EVR Delta turning negative
- Front Page Pass Rate dropping
- Bright Line Incidents increasing
- Values Drift Score declining

**When you see yellow or red:** Investigate immediately. These are your early warning system.

### Lagging Indicators (Learn from these)
These confirm problems *after* they've occurred:

- Customer complaints filed
- Lawsuits or regulatory actions
- Employee departures
- Revenue decline from trust loss

**When you see these:** The damage is done. Use them to validate your leading indicators and improve detection.

---

## Best Practices

### Weekly (15 minutes)
- Log any close calls
- Quick scan of leading indicators

### Monthly (1 hour)
- Update intervention metrics
- Review close call patterns
- Check leading indicator trends

### Quarterly (half day)
- Full values alignment assessment
- Update trust velocity metrics
- Research industry incidents
- Calculate Integrity Yield
- Executive briefing

### Annually (full day)
- Review and update Bright Lines
- Deep values map reassessment
- Recalculate baseline ROI
- Strategic integrity planning

---

## Interpreting Your Results

### If Your Score is High (80+)
- Document what's working for institutional memory
- Look for areas of complacency
- Share findings with stakeholders to reinforce investment

### If Your Score is Adequate (60-79)
- Identify top 2 improvement areas
- Focus on leading indicators showing yellow
- Build the case for targeted investment

### If Your Score Shows Gaps (40-59)
- Prioritize Bright Lines and Values Map work
- Increase human oversight touchpoints
- Consider external audit

### If Your Score is Critical (Below 40)
- Executive attention required
- Immediate values clarification needed
- Consider pausing AI automation until alignment improves

---

## FAQ

**Q: What if I don't have data for some metrics?**

Start with what you have. Even partial data is valuable. The act of trying to measure often reveals insights. Mark gaps and prioritize filling them over time.

**Q: How do I calculate industry baselines for my niche industry?**

Use proxies from related industries. If exact data isn't available, use conservative estimates and document your assumptions. The Counterfactual Analyst agent can help with research.

**Q: Is a high veto rate good or bad?**

It depends. 5-10% suggests healthy human oversight. Near 0% might mean rubber-stamping. Above 20% might mean your AI systems need recalibration.

**Q: How do I get my team to log close calls?**

Make it easy and rewarding. Create a dedicated Slack channel. Format: "I stopped [X] because [Y]." Celebrate catches publicly. Review weekly.

**Q: What if our stress values are significantly different from stated values?**

That's the point of measuring. The gap tells you where to focus. Start with the biggest gaps. Small improvements compound.

---

## Getting Help

- **Integrity Auditor agent** — For decision review and values alignment
- **Risk Sentinel agent** — For trend analysis and early warnings
- **Counterfactual Analyst agent** — For ROI and cost avoidance calculations

For technical support with the dashboard, see the main Insight 360 documentation.

---

*"The return on integrity isn't moral superiority. It's survivability, trust, and alignment — when it matters most."*
