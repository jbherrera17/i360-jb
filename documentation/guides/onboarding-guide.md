# Insight 360 Onboarding Guide

**The Complete Pre-Onboarding & Onboarding Process**

**For:** New Prospects & Implementation Teams
**Last Updated:** January 2, 2026

---

## Overview

Insight 360 onboarding is a structured journey that establishes three foundational layers before users can effectively leverage AI-powered workflows:

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: PARTHENON (Structure)                                 │
│  "Who are you organizationally?"                                │
│  └── Departments → Roles → OKRs → Processes                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: GOVERNANCE (Strategy)                                 │
│  "What are you trying to achieve?"                              │
│  └── Vision/Mission → BSC Objectives → Strategic Links          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: INTEGRITY (Values)                                    │
│  "What lines won't you cross?"                                  │
│  └── Bright Lines → Values Map → Intervention Rules             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  OUTCOME: Values-Aligned AI                                     │
│  Agents understand your structure, support your strategy,       │
│  and respect your ethical boundaries.                           │
└─────────────────────────────────────────────────────────────────┘
```

**Why This Matters:** Organizations that skip foundational setup experience:
- AI outputs that sound generic or off-brand
- Decisions that contradict stated values
- No way to measure if AI is helping or hurting strategy
- Compliance and governance gaps

---

## Pre-Onboarding Phase

### Discovery Call Objectives

Before beginning onboarding, conduct a discovery session to:

1. **Assess AI Maturity**
   - What AI tools are currently in use?
   - Are there documented AI policies?
   - What's the leadership appetite for AI adoption?

2. **Understand Pain Points**
   - What problems should AI solve first?
   - Where is content/communication inconsistent?
   - What decisions need better support?

3. **Identify Stakeholders**
   - Who will be the admin/owner?
   - Which departments will use the system first?
   - Who needs to approve AI governance decisions?

4. **Evaluate Readiness**
   - Do they have documented values?
   - Is there an existing brand voice guide?
   - Are OKRs or strategic goals defined?

### Pre-Work Checklist

Before the first onboarding session, the prospect should gather:

```
ORGANIZATIONAL DOCUMENTS
□ Org chart (departments, reporting lines)
□ Key roles and job descriptions
□ Current OKRs, KPIs, or strategic goals
□ Documented business processes (even informal)

BRAND & IDENTITY
□ Mission and vision statements
□ Core values documentation (even if informal)
□ Brand voice guidelines (if any)
□ "What makes us different" positioning

CUSTOMER CONTEXT
□ Target customer descriptions / ICPs
□ Common customer pain points
□ Sales messaging or pitch decks

ETHICS & GOVERNANCE
□ Existing AI policies or guidelines
□ Compliance requirements (industry-specific)
□ "What we'd never do" list (ethical boundaries)
□ Past ethical dilemmas or close calls
```

**Readiness Assessment Score:**

| Score | Criteria | Recommendation |
|-------|----------|----------------|
| **High** | Has 80%+ of materials ready | Start with manual entry path |
| **Medium** | Has 40-80% of materials | Use Align 120 AI-assisted discovery |
| **Low** | Has <40% of materials | Extended Align 120 workshop required |

---

## Onboarding Phase 1: Account & Parthenon Setup

**Duration:** Day 1 (2-3 hours)
**Who:** Admin + Operations/HR lead
**Goal:** Establish organizational structure that agents can reference

### Step 1.1: Account Creation

1. Navigate to the Login page
2. Click **Create Account**
3. Enter email, password, display name
4. First user is automatically assigned `admin` role
5. Verify email if required

**API Reference:**
```
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
```

### Step 1.2: Company Profile

1. Navigate to **Align 120** in the sidebar
2. Click **Start New Session**
3. Enter company name, industry, size
4. This creates your Company Profile record

**Minimum Required Fields:**
- Company name
- Industry category
- Company size (startup/small/medium/enterprise)

### Step 1.3: Seed Default Departments

1. Navigate to **Parthenon** in the sidebar
2. Click **Seed Defaults** button
3. System creates 8 standard departments:
   - Executive
   - Finance
   - Operations
   - Sales
   - Marketing
   - Production/Product
   - Service/Support
   - Stakeholder Relations

**API Reference:**
```
POST /api/parthenon/seed-defaults
```

### Step 1.4: Customize Organizational Structure

**Departments:**
1. Review seeded departments
2. Rename to match your terminology (e.g., "Product" instead of "Production")
3. Add missing departments
4. Remove irrelevant departments
5. Set parent relationships for hierarchical structures

**For each department, define:**
- Name and description
- Icon and color (for UI)
- Parent department (if nested)

### Step 1.5: Create Key Roles

Create roles for users who will interact with the system:

**Essential First Roles:**
1. CEO / Executive Leader
2. Department Heads (one per active department)
3. Primary AI Users (who will use agents daily)

**For each role, define:**

| Field | Description | Example |
|-------|-------------|---------|
| `title` | Job title | "VP of Marketing" |
| `level` | Hierarchy level | executive / director / manager / individual |
| `department_id` | Parent department | Marketing |
| `reports_to` | Direct manager | CEO |
| `responsibilities` | Key duties (array) | ["Brand strategy", "Demand generation"] |
| `authority` | Decision scope (JSON) | `{"budget": "$500K", "hiring": true}` |
| `required_skills` | Competencies needed | ["Marketing strategy", "AI literacy"] |

**API Reference:**
```
POST /api/parthenon/roles
GET /api/parthenon/roles?department_id=xxx
```

### Step 1.6: Create Company-Level OKRs

Start with 2-3 company-level objectives:

**OKR Structure:**
```json
{
  "title": "Achieve $5M ARR",
  "description": "Grow recurring revenue to $5M by end of year",
  "scope": "company",
  "period": "2026",
  "key_results": [
    {"title": "Close 50 new customers", "current": 12, "target": 50, "unit": "customers"},
    {"title": "Increase ACV to $40K", "current": 28000, "target": 40000, "unit": "USD"},
    {"title": "Reduce churn to <5%", "current": 8, "target": 5, "unit": "percent"}
  ],
  "status": "active"
}
```

**Recommended Starting OKRs:**
1. Revenue/Growth objective
2. Customer/Market objective
3. Operational/Efficiency objective

**API Reference:**
```
POST /api/parthenon/okrs
GET /api/parthenon/okrs?scope=company
```

### Step 1.7: Document Key Processes

Document 3-5 critical business processes:

**Recommended First Processes:**
1. Sales process (lead → close)
2. Customer onboarding
3. Content approval workflow
4. Escalation/support process

**Process Structure:**
```json
{
  "name": "Sales Process",
  "type": "workflow",
  "department_id": "sales-dept-uuid",
  "owner_role_id": "sales-director-uuid",
  "steps": [
    {"order": 1, "name": "Lead Qualification", "description": "..."},
    {"order": 2, "name": "Discovery Call", "description": "..."},
    {"order": 3, "name": "Solution Presentation", "description": "..."}
  ],
  "inputs": ["Inbound lead", "Referral"],
  "outputs": ["Signed contract", "Qualified out"],
  "status": "active"
}
```

### Phase 1 Checkpoint

Before proceeding, verify:

```
□ Company profile created
□ Departments reflect actual org structure
□ Key roles created with reporting hierarchy
□ 2-3 company OKRs defined
□ At least one process documented

Verification:
GET /api/parthenon/overview
→ Should return non-zero counts for all components
```

---

## Onboarding Phase 2: Governance Setup

**Duration:** Day 2 (2-3 hours)
**Who:** Executive sponsor + Strategy owner
**Goal:** Establish strategic foundation that measures alignment

### Step 2.1: Create Strategic Foundation

Navigate to **Strategy 120** or **Governance** dashboard.

**Define Your Foundation:**

| Field | Description | Example |
|-------|-------------|---------|
| `vision` | Where you're going (future state) | "The trusted AI partner for values-driven organizations" |
| `vision_horizon` | Timeframe for vision | "2030" |
| `mission` | Why you exist (purpose) | "We help organizations deploy AI that amplifies their values" |
| `core_values` | 3-7 organizational values | ["Integrity", "Innovation", "Impact", "Inclusion"] |
| `planning_period` | Current strategic cycle | "2026" |

**API Reference:**
```
POST /api/s2e/foundations
GET /api/s2e/foundations/current
```

### Step 2.2: Define Core Values

For each core value, provide:

1. **Name**: Single word or short phrase
2. **Definition**: What this value means to your organization
3. **Behaviors**: How the value manifests in decisions
4. **Anti-patterns**: What violating this value looks like

**Example:**
```
Value: Integrity
Definition: We do the right thing even when no one is watching
Behaviors:
  - Admit mistakes quickly
  - Keep commitments
  - Give honest feedback
Anti-patterns:
  - Hiding problems from customers
  - Overpromising to close deals
  - Taking credit for others' work
```

### Step 2.3: Establish Balanced Scorecard Objectives

Create 2-3 objectives per BSC perspective:

**Financial Perspective:**
- Revenue growth
- Profitability
- Unit economics

**Customer Perspective:**
- Customer satisfaction (NPS)
- Retention rate
- Market share

**Internal Process Perspective:**
- Operational efficiency
- Quality metrics
- Innovation rate

**Learning & Growth Perspective:**
- Employee engagement
- Skills development
- AI adoption rate

### Step 2.4: Link OKRs to Strategy

Connect Parthenon OKRs to BSC objectives:

1. Navigate to an OKR detail page
2. Click **Add Strategic Link**
3. Select the BSC objective it supports
4. Define link type:
   - `supports` - OKR contributes to objective
   - `measures` - OKR directly measures objective
   - `drives` - OKR is a leading indicator
5. Set alignment score (0-100)

**API Reference:**
```
POST /api/parthenon/okrs/:id/strategic-links
GET /api/parthenon/alignment-summary
```

### Step 2.5: Run First Health Check

Generate a baseline governance health check:

1. Navigate to Governance Dashboard
2. Click **Run Health Check**
3. System analyzes:
   - **Alignment Health**: % of OKRs linked to strategy
   - **Execution Health**: Progress vs. targets
   - **Learning Health**: Adaptation metrics
4. Review any observations (drift, gaps, conflicts)

**API Reference:**
```
POST /api/s2e/health-checks
GET /api/s2e/alignment-report
```

### Phase 2 Checkpoint

Before proceeding, verify:

```
□ Strategic foundation created (vision, mission, values)
□ Core values defined with behaviors
□ BSC objectives established (at least 4)
□ OKRs linked to BSC objectives
□ First health check completed

Verification:
GET /api/s2e/alignment-report
→ Should show alignment percentage > 0%
```

---

## Onboarding Phase 3: Integrity Framework

**Duration:** Day 3-5 (3-4 hours)
**Who:** Leadership team + Compliance/Legal (if applicable)
**Goal:** Establish ethical guardrails and monitoring

### Step 3.1: Define Bright Lines

**What Are Bright Lines?**
Non-negotiable ethical boundaries that AI must never cross, regardless of business pressure.

**Workshop Exercise: The "What Would We Never Do" Session**

Gather leadership and ask:
1. "What would we never do, even if it was profitable?"
2. "What actions would cause us to fire someone immediately?"
3. "What would make us refuse a customer's money?"

**Create Bright Lines Context Asset:**

Navigate to **Context Assets** → Create New → Type: `bright_lines`

```markdown
# Bright Lines: [Company Name]

## Data & Privacy
- NEVER sell or share customer data with third parties without explicit consent
- NEVER use customer data to train external AI models without disclosure
- NEVER store sensitive data (PII, financial) without encryption

## Customer Interactions
- NEVER deceive customers about AI-generated content
- NEVER make false claims about capabilities or results
- NEVER pressure vulnerable customers into purchases

## Internal Operations
- NEVER discriminate in hiring based on protected characteristics
- NEVER retaliate against employees who raise ethical concerns
- NEVER falsify financial records or metrics

## AI-Specific
- NEVER deploy AI that could cause physical harm
- NEVER use AI to generate content that could be mistaken for real individuals
- NEVER automate decisions that require human judgment without oversight
```

### Step 3.2: Build Values Map

**What Is a Values Map?**
A document showing how each value behaves under normal conditions versus under pressure.

**For Each Core Value, Document:**

| Condition | Value Strength | Behaviors | Warning Signs |
|-----------|----------------|-----------|---------------|
| Normal | 5/5 | [How value shows up daily] | N/A |
| Under Time Pressure | 3/5 | [How value erodes] | [Early indicators] |
| Under Financial Pressure | 2/5 | [How value erodes] | [Early indicators] |
| Under Competitive Pressure | 4/5 | [How value holds or erodes] | [Early indicators] |

**Create Values Map Context Asset:**

Navigate to **Context Assets** → Create New → Type: `values_map`

```markdown
# Values Map: [Company Name]

## Integrity

### Normal Operations (5/5)
- Proactively disclose limitations to customers
- Promptly address mistakes with full transparency
- Decisions pass the "front page test" easily

### Under Time Pressure (3/5)
- May skip documentation steps
- Less thorough in explaining limitations
- **Warning Signs**: Shortcuts in QA, rushed approvals

### Under Financial Pressure (2/5)
- Tempted to overstate capabilities
- May delay admitting problems
- **Warning Signs**: "Just this once" language, avoided questions

### Under Competitive Pressure (4/5)
- Generally maintains honesty in positioning
- May emphasize strengths more than weaknesses
- **Warning Signs**: Feature claims without evidence

---

## Innovation
[Repeat structure for each value]
```

### Step 3.3: Set Intervention Baselines

**What Are Intervention Metrics?**
Measurements of human oversight effectiveness in AI operations.

**Key Metrics to Establish:**

| Metric | Definition | Target Baseline | Warning Threshold |
|--------|------------|-----------------|-------------------|
| **Veto Rate** | % of AI decisions overridden by humans | 5-15% | <2% (too much automation) or >30% (AI not working) |
| **Escalation Frequency** | Decisions requiring human review per day | 1-3 per day | 0 (no oversight) or >10 (too much friction) |
| **Pause-to-Proceed Ratio** | Deliberate vs. auto-approved decisions | 1:10 | <1:50 (rubber stamping) |
| **Close Call Count** | Near-miss incidents documented per month | 2-5 | 0 (underreporting) or >10 (systemic issues) |

**Create Intervention Metrics Asset:**

Navigate to **Context Assets** → Create New → Type: `intervention_metrics`

```markdown
# Intervention Metrics Baseline: [Company Name]

## Targets

| Metric | Current | Target | Alert Threshold |
|--------|---------|--------|-----------------|
| Veto Rate | TBD | 8% | <3% or >25% |
| Escalation Frequency | TBD | 2/day | 0 or >8/day |
| Pause-to-Proceed | TBD | 1:10 | <1:30 |
| Close Calls/Month | TBD | 3 | 0 or >8 |

## Escalation Triggers
Decisions that MUST escalate to human review:
- Any customer refund > $1,000
- Any content mentioning competitors by name
- Any response to legal/compliance questions
- Any commitment beyond standard offerings

## Review Cadence
- Daily: Review escalations and vetoes
- Weekly: Analyze patterns, update thresholds
- Monthly: Close call retrospective
- Quarterly: Full integrity audit
```

### Step 3.4: Configure Integrity Agents

**Activate the Integrity Auditor:**

1. Navigate to **Agents** page
2. Find "Integrity Auditor" (seeded agent)
3. Verify it's active
4. Configure context mappings:
   - Map `bright_lines` asset (always inject)
   - Map `values_map` asset (always inject)
   - Map `core_values` asset (always inject)

**Activate the Risk Sentinel:**

1. Find "Risk Sentinel" agent
2. Verify it's active
3. Configure alert thresholds
4. Set notification preferences

### Step 3.5: Establish Close Call Log

**Create Close Call Log Template:**

Navigate to **Context Assets** → Create New → Type: `close_call_log`

```markdown
# Close Call Log: [Company Name]

## Template for Documenting Near-Misses

### Incident: [Brief Title]
**Date:** YYYY-MM-DD
**Reported By:** [Name/Role]
**Severity:** Low / Medium / High / Critical

**What Happened:**
[Description of the situation]

**What Could Have Happened:**
[Potential negative outcome if not caught]

**How It Was Caught:**
[Detection mechanism - human review, automated check, customer feedback]

**Root Cause:**
[Why this happened]

**Corrective Action:**
[What was done to prevent recurrence]

**Values Involved:**
[Which core values were at risk]

**Bright Lines Approached:**
[Any bright lines that were nearly crossed]

---

## Log Entries

### [Date]: [Title]
[Entry following template above]
```

### Step 3.6: Calculate Initial Integrity Yield

Navigate to **Integrity Dashboard** to view your baseline score:

**Integrity Yield Formula:**
```
Integrity Yield =
  (Trust Velocity Score × 0.30) +
  (Intervention Effectiveness × 0.25) +
  (Alignment Audit Score × 0.25) +
  (Counterfactual Value × 0.20)
```

**Initial Setup:**
- Trust Velocity: Based on NPS, retention, referral data (if available)
- Intervention: Will populate as system is used
- Alignment: Based on Values Drift assessments
- Counterfactual: Estimated crisis avoidance value

### Phase 3 Checkpoint

Before proceeding, verify:

```
□ Bright lines documented (at least 10 statements)
□ Values map created for each core value
□ Intervention baselines set
□ Integrity Auditor agent configured and active
□ Risk Sentinel agent configured and active
□ Close call log template created
□ Initial integrity yield score visible on dashboard

Verification:
Navigate to Integrity Dashboard
→ Should show Integrity Yield score and component breakdown
```

---

## Onboarding Phase 4: First Value Delivery

**Duration:** Day 5-7 (2-3 hours)
**Who:** Primary AI users + Admin
**Goal:** Demonstrate value with a working agent

### Step 4.1: Create First Context Assets

Before building agents, create essential content context:

**Required Assets:**
1. `voice_dna` - Brand voice guidelines
2. `company_description` - What the company does
3. `icp` - Primary ideal customer profile

**Voice DNA Example:**
```markdown
# Brand Voice: [Company Name]

## Tone
- Professional yet approachable
- Confident but not arrogant
- Helpful and solution-oriented

## Vocabulary
- Use: Clear business language, industry terms with explanation
- Avoid: Jargon, buzzwords, hyperbole, ALL CAPS

## Personality Traits
- Knowledgeable advisor (not salesperson)
- Patient teacher (not condescending expert)
- Trusted partner (not vendor)

## Do's
- Use "you" and "we"
- Ask clarifying questions
- Provide value before asking for anything
- Acknowledge limitations

## Don'ts
- Make promises we can't keep
- Criticize competitors directly
- Use pressure tactics
- Ignore difficult questions
```

### Step 4.2: Create First Agent with Full Context

**Recommended First Agent: Communication Assistant**

1. Navigate to **Agents** → Create New
2. Configure:
   - **Name**: "Communication Assistant"
   - **Description**: "Helps draft professional communications aligned with brand voice"
   - **LLM Provider**: Anthropic
   - **Model**: Claude Sonnet
   - **Temperature**: 0.7

3. Set System Prompt:
```markdown
You are a communication assistant for [Company Name]. Your role is to help team members draft professional communications that:

1. Reflect our brand voice and values
2. Are appropriate for our target audience
3. Are clear, concise, and actionable

For each request:
- Ask clarifying questions if context is missing
- Provide 2-3 options when appropriate
- Explain your reasoning
- Flag any potential issues

Always prioritize clarity and authenticity over polish.
```

4. Map Context Assets:
   - `voice_dna` → Injection: Always
   - `company_description` → Injection: Always
   - `icp` → Injection: On Demand (keyword: "customer", "prospect", "client")
   - `core_values` → Injection: Always
   - `bright_lines` → Injection: Always

### Step 4.3: Test Agent with Real Task

Run a real task to demonstrate value:

**Test Prompt:**
```
I need to write an email to a prospect who attended our webinar last week
but hasn't responded to my follow-up. They're a VP of Marketing at a
mid-size B2B company. Help me write a second follow-up that's persistent
but not pushy.
```

**Evaluate Output For:**
- [ ] Matches documented brand voice
- [ ] Appropriate for ICP
- [ ] Respects bright lines (not pushy/manipulative)
- [ ] Reflects core values
- [ ] Professional quality

### Step 4.4: Demonstrate With vs. Without Context

Show stakeholders the difference:

**Without Context (Generic):**
Create a temporary agent with no context mappings and run the same prompt.

**With Context (Aligned):**
Use the configured Communication Assistant.

**Compare:**
| Aspect | Without Context | With Context |
|--------|-----------------|--------------|
| Brand voice | Generic professional | Matches voice_dna |
| Customer focus | Generic B2B | Speaks to ICP pain points |
| Values alignment | Neutral | Reflects stated values |
| Bright line safety | Unknown | Verified safe |

### Step 4.5: Review Integrity Check

After the test interaction:

1. Navigate to Integrity Dashboard
2. Review any flags from Integrity Auditor
3. Check if any bright lines were approached
4. Verify values alignment in output

### Phase 4 Checkpoint

Before completing onboarding:

```
□ Core context assets created (voice_dna, company_description, icp)
□ First agent configured with context mappings
□ Agent tested with real task
□ Stakeholder demo completed (with/without comparison)
□ Integrity check reviewed
□ User can create and test agents independently

Verification:
User completes a task end-to-end without assistance
```

---

## Onboarding Phase 5: Team Expansion

**Duration:** Week 2 (ongoing)
**Who:** Admin + Department leads
**Goal:** Extend access to team members

### Step 5.1: Create User Accounts

Navigate to **Admin** → User Management

**For Each Team Member:**
1. Click **Create User**
2. Enter email, display name
3. Assign role:
   - `admin` - Full access, can manage users and system config
   - `user` - Full feature access, scoped to own data
   - `viewer` - Read-only access for stakeholders

**API Reference:**
```
POST /api/auth/admin/users
GET /api/auth/admin/users
```

### Step 5.2: Create Department-Specific Agents

**Sales Department:**
- Sales Email Writer
- Objection Handler
- Proposal Assistant

**Marketing Department:**
- Content Creator
- Social Media Assistant
- Campaign Planner

**Support Department:**
- Response Drafter
- Knowledge Base Updater
- Escalation Analyzer

### Step 5.3: Train Users on Integrity Monitoring

**Training Topics:**
1. How to interpret Integrity Yield score
2. When to escalate decisions
3. How to log close calls
4. What triggers Integrity Auditor review

### Step 5.4: Establish Review Cadence

| Frequency | Activity | Participants |
|-----------|----------|--------------|
| Daily | Review escalations and vetoes | AI users |
| Weekly | Analyze patterns, adjust context | Department leads |
| Monthly | Close call retrospective | Leadership + users |
| Quarterly | Full integrity audit, health check | Executive sponsor |

---

## Post-Onboarding Success Metrics

### Week 1 Targets
- [ ] 10+ agent interactions completed
- [ ] 3+ team members active
- [ ] 0 bright line violations
- [ ] Integrity Yield score established

### Month 1 Targets
- [ ] 100+ agent interactions
- [ ] All departments have at least one agent
- [ ] First close call properly documented
- [ ] Health check shows improved alignment
- [ ] User satisfaction >80%

### Quarter 1 Targets
- [ ] 500+ agent interactions
- [ ] Context assets regularly updated
- [ ] Integrity Yield trending positive
- [ ] OKR progress supported by AI activities
- [ ] ROI demonstrated

---

## Quick Reference: Onboarding Checklist

```
PRE-ONBOARDING
□ Discovery call completed
□ Readiness assessment scored
□ Pre-work materials gathered
□ Stakeholders identified
□ Admin user identified

PHASE 1: PARTHENON (Day 1)
□ Admin account created
□ Company profile created
□ Default departments seeded
□ Org structure customized
□ Key roles created (5+)
□ Reporting hierarchy set
□ Company OKRs created (2-3)
□ Key processes documented (3-5)

PHASE 2: GOVERNANCE (Day 2)
□ Strategic foundation created
□ Vision and mission defined
□ Core values documented (3-7)
□ BSC objectives established (8+)
□ OKRs linked to BSC
□ First health check run

PHASE 3: INTEGRITY (Day 3-5)
□ Bright lines defined (10+)
□ Values map created
□ Intervention baselines set
□ Integrity Auditor configured
□ Risk Sentinel configured
□ Close call log created
□ Initial Integrity Yield calculated

PHASE 4: FIRST VALUE (Day 5-7)
□ Core context assets created
□ First agent configured
□ Agent tested with real task
□ With/without demo completed
□ Integrity check reviewed

PHASE 5: TEAM EXPANSION (Week 2+)
□ Team accounts created
□ Department agents created
□ Users trained on integrity
□ Review cadence established
```

---

## Troubleshooting Common Issues

### "Agents give generic responses"
- **Cause**: Context assets not mapped or not injecting
- **Fix**: Verify agent context mappings, check injection modes

### "Values don't seem reflected in output"
- **Cause**: Values documented but not in context assets
- **Fix**: Create `core_values` context asset, map to agents

### "Integrity dashboard shows no data"
- **Cause**: Integrity agents not active or not receiving decisions
- **Fix**: Activate Integrity Auditor, configure audit triggers

### "Health check shows low alignment"
- **Cause**: OKRs not linked to BSC objectives
- **Fix**: Navigate to OKRs, add strategic links

### "Users can't see each other's agents"
- **Cause**: Row-level security (by design)
- **Fix**: Use public/shared agents for team access

---

## Related Documentation

| Guide | Purpose | Link |
|-------|---------|------|
| How To Use Insight 360 | Core concepts | [how-to-use-insight-360.md](./how-to-use-insight-360.md) |
| Parthenon Guide | Org structure details | [parthenon-user-guide.md](./parthenon-user-guide.md) |
| Governance Guide | Strategy setup | [governance-user-guide.md](./governance-user-guide.md) |
| Integrity Guide | Values monitoring | [integrity-user-guide.md](./integrity-user-guide.md) |
| Align 120 Guide | AI-assisted discovery | [align120-user-guide.md](./align120-user-guide.md) |
| Agents Guide | Agent configuration | [agents-user-guide.md](./agents-user-guide.md) |
| Context Guide | Context assets | [context-user-guide.md](./context-user-guide.md) |

---

## Appendix A: Sample Pre-Work Templates

### A.1 Org Chart Template

```
[Company Name] Organizational Structure

EXECUTIVE
├── CEO
│   ├── COO
│   │   ├── VP Operations
│   │   └── VP Customer Success
│   ├── CFO
│   │   └── Finance Manager
│   ├── CTO
│   │   ├── VP Engineering
│   │   └── VP Product
│   └── CMO
│       ├── Director Marketing
│       └── Director Sales

[Continue for all departments]
```

### A.2 Values Discovery Questions

1. What do we celebrate when someone does it well?
2. What would cause us to fire someone even if they hit their numbers?
3. How do we make decisions when there's no clear right answer?
4. What do our best customers say about working with us?
5. What makes us different from competitors beyond features/price?
6. What would we never do, even if profitable?
7. How do we want people to feel when they interact with us?

### A.3 Bright Lines Discovery Questions

1. What customer data practices would cross a line?
2. What sales tactics are off-limits?
3. What claims would we never make?
4. What competitive practices are unacceptable?
5. What employee treatment is non-negotiable?
6. What AI uses would violate our principles?
7. What legal risks are we unwilling to take?

---

## Appendix B: API Quick Reference

### Authentication
```
POST /api/auth/register     - Create account
POST /api/auth/login        - Login
GET  /api/auth/me           - Current user
POST /api/auth/admin/users  - Create user (admin)
```

### Parthenon
```
POST /api/parthenon/seed-defaults        - Seed departments
GET  /api/parthenon/overview             - Counts summary
POST /api/parthenon/departments          - Create department
POST /api/parthenon/roles                - Create role
POST /api/parthenon/okrs                 - Create OKR
POST /api/parthenon/okrs/:id/strategic-links - Link OKR to BSC
POST /api/parthenon/processes            - Create process
```

### Governance
```
POST /api/s2e/foundations    - Create strategic foundation
GET  /api/s2e/foundations/current - Active foundation
POST /api/s2e/health-checks  - Run health check
GET  /api/s2e/alignment-report - Alignment summary
```

### Context & Agents
```
POST /api/context            - Create context asset
GET  /api/context/types      - List asset types
POST /api/agents             - Create agent
POST /api/agents/:id/context-mappings - Map context to agent
```

---

*This guide is maintained by the Insight 360 team. Last updated: January 2, 2026*
