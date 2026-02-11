# Insight 360 — Platform Setup Process

**Purpose:** Complete guide for onboarding a new organization onto the Insight 360 multi-tenant platform.
**Audience:** Platform administrators (Synergi), system administrators (org-level), client success managers.
**Last Updated:** February 10, 2026 | Version 2.1

---

## Architecture Context

Insight 360 is a **multi-tenant platform**. One deployed instance serves all organizations. There are no per-org schema migrations, no per-org seed data, and no per-org infrastructure.

**What lives at the platform level (shared):**
- Database schema and migrations
- API keys and environment configuration
- Platform seed data: 6 departments, 18 context asset types, 4 BSC perspectives, 23 agents, 5 workflows, 11 dept-agent mappings

**What lives at the organization level (independent):**
- Cloned departments (customizable copies of platform departments)
- Cloned workflows (linked to cloned departments)
- Cloned dept-agent mappings (linked to cloned departments)
- Context asset instances (org-specific content)
- Company profile and strategic foundations
- Soul configuration (values, bright lines, guardrails)
- Users, roles, and department assignments
- Branding (logo, colors)
- OKRs, strategic themes, BSC objectives

**Clone Model:** When an organization is provisioned, the platform's standard departments, workflows, and dept-agent mappings are **cloned** into org-scoped copies. The org owns these copies and can rename, customize, or delete them without affecting other organizations or the platform templates.

---

## Roles

| Role | Scope | Responsibilities |
|------|-------|-----------------|
| **Platform Administrator** | Synergi | Provisions orgs, assigns system admins, manages tiers, maintains platform seed data |
| **System Administrator** | Organization | Runs setup wizard, manages departments/agents/workflows, invites users |
| **End User** | Organization | Uses chat, runs workflows, creates context assets |

---

## Process Overview

| Phase | Name | Who | Duration | Key Outcome |
|-------|------|-----|----------|-------------|
| 1 | Pre-Deployment | Client + Platform Admin | Before Day 1 | Client info collected, org provisioned |
| 2 | Organization Setup Wizard | System Admin | Day 1 | Departments, company profile, context, soul config |
| 3 | User Setup | System Admin | Day 2 | Team accounts, roles, department assignments |
| 4 | Agent & Workflow Review | System Admin | Days 2-3 | Agents reviewed, workflows customized |
| 5 | Strategic Setup | System Admin + Leadership | Days 3-5 | Themes, BSC, OKRs |
| 6 | Training & Handoff | Client Success | Days 5-10 | Team trained, KPIs established |

---

## Phase 1: Pre-Deployment

> **Who:** Client provides information → Platform Administrator provisions the org

### 1.1 Client Information Checklist

The client must provide the following **before** their organization is created. This checklist should be sent to the client contact as a form or intake document.

#### Required Information

| # | Category | Item | Example | Notes |
|---|----------|------|---------|-------|
| 1 | **Organization** | Company name | "Acme Corporation" | Legal or brand name |
| 2 | **Organization** | Industry | "Technology" | Primary industry |
| 3 | **Organization** | Industry segment | "B2B SaaS" | Specific niche |
| 4 | **Organization** | Company size | "medium" (51-500) | startup / small / medium / enterprise |
| 5 | **Organization** | Employee count | 150 | Current headcount |
| 6 | **Organization** | Founding year | 2018 | Year established |
| 7 | **Organization** | Headquarters | "Austin, TX" | Primary location |
| 8 | **System Admin** | Full name | "Jane Smith" | Person who will configure the platform |
| 9 | **System Admin** | Email address | "jane@acme.com" | Must be a real, accessible email |
| 10 | **Subscription** | Selected tier | "Business" | Starter / Business / Enterprise / Agency |
| 11 | **Strategic** | Vision statement | "To be the leading..." | Even a rough draft is fine |
| 12 | **Strategic** | Mission statement | "We help companies..." | Why the company exists |
| 13 | **Strategic** | Core values (3-5) | "Integrity, Innovation, Excellence" | Principles that guide decisions |
| 14 | **Branding** | Logo file | PNG/SVG | Optional at this stage |
| 15 | **Branding** | Primary brand color | "#6366f1" | Hex code |

#### Optional (Accelerates Setup)

| # | Category | Item | Notes |
|---|----------|------|-------|
| 16 | **Departments** | Department list | Which of the 6 standard they want; any renames; any custom additions |
| 17 | **Context** | Company description | About us page, elevator pitch |
| 18 | **Context** | Products & services overview | Product sheets, feature lists |
| 19 | **Context** | Voice/tone guidelines | Brand book, writing style guide |
| 20 | **Context** | Ideal customer profile | Customer segments, personas |
| 21 | **Context** | Competitor list | Top 3-5 competitors |
| 22 | **Users** | Team member list | Names, emails, departments, roles for initial users |

### 1.2 Platform Administrator Actions

> **Mode: Automated (from signup/provisioning)**

When the client signs up or the platform admin provisions the org:

| Action | Mode | What Happens |
|--------|------|-------------|
| Create organization record | **Automated** | Org name, slug, owner_id set from signup |
| Assign subscription tier | **Automated** | Tier set from plan selection |
| Create owner membership | **Automated** | Signup user becomes org owner |
| Assign system administrator | **Manual** | Platform admin adds the client's designated system admin |

#### Assigning the System Administrator

> **Status: Manual**

1. Go to **Administrator** → **Team Members** (`/admin-org-members.html`)
2. Select the new organization
3. Click **Invite Member**
4. Enter the system admin's name and email from the checklist (items #8 and #9)
5. Set role to **admin**
6. The system admin will receive access and can begin the Setup Wizard

### 1.3 Platform Data Cloning

> **Mode: Automated (on org provisioning)**
> This is the clone step — platform templates are copied into org-scoped records.

When an organization is provisioned, the following platform resources are cloned:

| Resource | Platform Source | What Gets Cloned | Org Can Customize |
|----------|---------------|-------------------|-------------------|
| **Departments (6)** | Platform departments | Full copy: name, description, icon, color, tagline, metrics, quick_prompts, sort_order | Rename, adjust metrics/taglines, add/remove |
| **Workflows (5)** | Platform workflows | Full copy: all steps, agent references; department_id updated to cloned dept IDs | Rename steps, adjust prompts, add/remove steps |
| **Dept-Agent Mappings (11)** | Platform mappings | Full copy: department_id updated to cloned dept IDs; agent_id references platform agents | Add/remove agent mappings |
| **Context Asset Types (18)** | *Not cloned — referenced* | Org uses global types directly | Cannot modify type definitions |
| **BSC Perspectives (4)** | *Not cloned — referenced* | Org uses global perspectives directly | Cannot modify perspective definitions |
| **Agents (23)** | *Not cloned — referenced initially* | Org accesses platform public agents via dept-agent mappings | Can clone individual agents later for prompt customization |

**Clone cascade logic:**
1. Clone all 6 platform departments → set `org_id` on each copy
2. Clone all 5 platform workflows → set `org_id`, update `department_id` to point to cloned departments
3. Clone all 11 dept-agent mappings → update `department_id` to point to cloned departments, keep `agent_id` pointing to platform agents

**Result:** The org starts with a full working set of departments, workflows, and agent mappings that it owns and can freely customize.

---

## Phase 2: Organization Setup Wizard

> **Who:** System Administrator (the client's designated admin)
> **Mode: Wizard-guided**
> **Location:** Administrator → Setup tab

The system admin logs in and runs the Setup Wizard. The wizard uses pre-deployment checklist data where available and prompts for anything missing.

### Step 1: Company Foundation

> **Pre-filled from:** Checklist items #1-7, #11-13

| Field | Source | Editable? |
|-------|--------|-----------|
| Company name | Checklist #1 (also from org record) | Yes |
| Industry | Checklist #2 | Yes |
| Industry segment | Checklist #3 | Yes |
| Company size | Checklist #4 | Yes |
| Employee count | Checklist #5 | Yes |
| Founding year | Checklist #6 | Yes |
| Headquarters | Checklist #7 | Yes |
| Vision | Checklist #11 | Yes |
| Mission | Checklist #12 | Yes |
| Core values | Checklist #13 | Yes |

**What this creates:**
- `company_profiles` record linked to the org
- `strategic_foundations` record linked to the org

### Step 2: Department Setup

> **Pre-filled from:** Cloned platform departments + Checklist #16

The wizard presents the 6 cloned departments in a checklist/card view. For each department the admin can:

| Action | Description |
|--------|-------------|
| **Enable/Disable** | Toggle which departments are active for this org |
| **Rename** | Change "Sales" → "Revenue", "HR" → "People & Culture", etc. |
| **Edit tagline** | Adjust the department's one-line description |
| **Edit metrics** | Change metric names and targets to match their KPIs |
| **Edit quick prompts** | Customize the 4 quick-action prompts per department |
| **Add custom department** | Create a new department not in the standard 6 |
| **Reorder** | Drag to set display order |

**What the admin sees for each department:**

```
┌─────────────────────────────────────────────┐
│ [✓] Sales                            [Edit] │
│     "Close deals and drive revenue growth"  │
│     Metrics: Pipeline Value, Win Rate,      │
│              Deals Closed                   │
│     Agents: Proposal Generator              │
│     Workflow: Proposal Builder              │
└─────────────────────────────────────────────┘
```

Disabled departments and their associated workflows/agent mappings are soft-deleted (marked inactive), not removed — they can be re-enabled later.

### Step 3: Context Population

> **Pre-filled from:** Checklist items #17-21 (if provided)

The wizard walks through the 8 core context asset types and prompts the admin to create an instance of each. This is the highest-impact step — context assets power every AI interaction.

| # | Asset Type | What to Enter | Required? |
|---|-----------|---------------|-----------|
| 1 | **Company Description** | Who they are — mission, history, elevator pitch | Yes |
| 2 | **Products & Services** | Offerings, features, benefits, pricing | Yes |
| 3 | **Voice DNA** | Brand voice, tone, style rules, words to use/avoid | Yes |
| 4 | **Ideal Customer Profile** | Target customer demographics, psychographics, behaviors | Yes |
| 5 | **Core Values** | Values with behavioral examples (mirrors soul config) | Yes |
| 6 | **Pain Points** | Customer challenges they solve | Recommended |
| 7 | **Why We Win** | Competitive differentiators, unique value prop | Recommended |
| 8 | **Custom Processes** | Internal methodologies, proprietary frameworks | Optional |

**Tips for the system admin:**
- If the client provided documents in the checklist, paste them directly
- Even a rough draft is better than empty — it can be refined later
- The wizard should allow "Skip for now" on each asset with a reminder to complete later
- Context quality directly correlates with AI output quality

**What this creates:**
- `context_assets` records linked to the org, one per type

### Step 4: Soul Configuration

> **Pre-filled from:** Checklist #11-13 (vision, mission, values are reused)

The wizard embeds the Soul Configuration flow (currently a separate 7-step wizard at `/soul-wizard.html`):

| Sub-step | What to Configure | Pre-filled? |
|----------|-------------------|-------------|
| Organization Profile | Industry, size, description | Yes (from Step 1) |
| Core Values | Values with descriptions and behavioral examples | Yes (from Step 1 + context) |
| Bright Lines | Non-negotiable ethical boundaries | No — must be defined |
| Guardrails | Operational constraints | No — must be defined |
| Voice | Communication style, formality, personality | Partial (from Voice DNA context) |
| Domain | Industry-specific rules, compliance | No — must be defined |
| Review | Verify completeness, aim for 100% | — |

**Guidance for bright lines** (provide these examples to the admin):
- "Never make claims about product capabilities that aren't verified"
- "Never share customer data in generated content"
- "Always disclose when content is AI-generated in client-facing materials"
- "Never provide specific legal, medical, or financial advice without disclaimers"

**Guidance for guardrails:**
- "Include data sources when citing statistics"
- "Match the client's brand voice in all generated content"
- "Flag potential compliance issues in regulated industries"

**What this creates:**
- `soul_configurations` record linked to the org
- `ethical_lenses` configuration (uses platform defaults)

### Step 5: Branding

> **Pre-filled from:** Checklist items #14-15

| Field | Description |
|-------|-------------|
| Logo | Upload company logo (PNG/SVG) |
| Primary color | Brand color for UI theming |
| Secondary color | Accent color (optional) |

**What this creates:**
- Updates `organizations.settings` with branding configuration

### Step 6: Review & Complete

The wizard shows a summary of everything configured:

| Section | Status | Action |
|---------|--------|--------|
| Company Profile | Complete / Incomplete | Edit |
| Departments | X of Y enabled | Edit |
| Context Assets | X of 8 core populated | Edit |
| Soul Configuration | X% completeness | Edit |
| Branding | Configured / Not set | Edit |

**On completion:**
- All data is saved
- System admin is directed to invite team members (Phase 3)
- Onboarding checklist on the Administrator page reflects progress

---

## Phase 3: User Setup

> **Who:** System Administrator
> **Mode: Manual**

### 3.1 Invite Team Members

**Location:** Team Members (`/admin-org-members.html`)

For each team member from Checklist #22 (or gathered post-deployment):

1. Click **Invite Member**
2. Enter name and email
3. Assign role:

| Role | Access Level | Typical User |
|------|-------------|--------------|
| `owner` | Full access + billing | Founder, CEO |
| `admin` | Full access, can manage system | Department heads, IT |
| `consultant` | Can work with clients and content | Team leads, specialists |
| `viewer` | Read-only access | Stakeholders, observers |

4. Assign to department

### 3.2 Verify Admin Access

Confirm admin users can:
- [ ] Access all pages in the sidebar
- [ ] Create and edit agents
- [ ] Manage context assets
- [ ] View all departments in Execute 120
- [ ] Run any workflow
- [ ] Access Administrator page

### 3.3 Schedule Onboarding Sessions

| Session | Duration | Audience |
|---------|----------|----------|
| Admin Training | 2 hours | System admins |
| User Training | 1 hour | All users |
| Executive Overview | 30 min | Leadership |
| Department Deep-Dives | 1 hour each | Dept teams |

---

## Phase 4: Agent & Workflow Review

> **Who:** System Administrator (with department leads)
> **Mode: Manual**

### 4.1 Review Inherited Agents

Platform agents are accessible to the org through dept-agent mappings. Review with department leads:

**Per Department:**

| Department | Featured Agents | Workflow |
|-----------|----------------|----------|
| Sales | Proposal Generator | Proposal Builder |
| Marketing | Campaign Strategist, Brand Strategist | Campaign Strategy Builder |
| Operations | Process Documenter, Process Miner | SOP Creator |
| Finance | Financial Analyst, Unit Economics Analyst | Investment Analysis |
| HR | Values Excavator | *(none — consider creating)* |
| Executive | Executive Communicator, Strategy Analyst, Stakeholder Mapper | Board Meeting Prep |

**Cross-department agents** (available to all via chat):
Daily Briefer, Email Triager, Research Assistant, Meeting Prep, First Principles Thinker, Code Reviewer, Writing Coach, Strategic Advisor

For each department, confirm:
- [ ] Featured agents are relevant to the org's work
- [ ] Agent descriptions make sense in their context
- [ ] Remove any irrelevant mappings (e.g., Code Reviewer for non-tech orgs)

### 4.2 Customize Agents (Optional)

If an agent's system prompt needs org-specific tuning (industry terminology, specific frameworks, tone adjustments):

1. Go to **Agents** (`/agents.html`)
2. Clone the platform agent into the org's namespace
3. Edit the cloned agent's system prompt
4. Update the dept-agent mapping to point to the cloned agent

Common customizations:
- Add industry-specific terminology to prompts
- Reference the org's proprietary frameworks
- Adjust tone to match Voice DNA

### 4.3 Review Workflows

For each of the 5 cloned workflows, review with the relevant department lead:

| What to Review | How |
|----------------|-----|
| Step names and descriptions | Do they match the org's terminology? |
| Input fields | Are the right questions being asked? |
| Agent assignments | Are the right agents running each step? |
| Context asset references | Are the right assets being pulled in? |
| Estimated time | Does it match their expectation? |

**Location:** Execute 120 (`/execute120.html`) → select department → run a test workflow

### 4.4 Create Custom Agents or Workflows (Optional)

Common additions:
- Industry-specific agents (e.g., "Healthcare Compliance Advisor")
- Role-specific assistants (e.g., "Sales Development Rep Coach")
- Client-specific helpers (agency model — per-client agent)
- Custom approval workflows
- Industry compliance workflows

---

## Phase 5: Strategic Setup (Optional)

> **Who:** System Administrator + Leadership Team
> **Mode: Manual**
> For organizations using the full Strategy-to-Execution pipeline.

### 5.1 Strategic Themes

**Location:** Strategy 120 (`/strategy120.html`)

Define 2-4 strategic themes with leadership:

| Example Theme | Description | Timeframe |
|---------------|-------------|-----------|
| Market Expansion | Enter 3 new geographic markets | 18 months |
| Product Innovation | Launch 2 new product lines | 12 months |
| Operational Excellence | Reduce operational costs by 15% | 12 months |
| Customer Success | Increase retention to 95% | 12 months |

### 5.2 Balanced Scorecard Objectives

For each of the 4 BSC perspectives (inherited from platform), set 2-3 objectives:

| Perspective | Example Objectives |
|-------------|-------------------|
| **Financial** | Revenue growth 20% YoY, Gross margin > 65% |
| **Customer** | NPS > 50, Retention 95%, New logos 20/quarter |
| **Internal Process** | Deploy cycle < 2 weeks, 99.9% uptime |
| **Learning & Growth** | Training hours > 40/year, eNPS > 50 |

### 5.3 OKRs

1. **Company OKRs** — 3-5 objectives with 2-4 key results each
2. **Department OKRs** — 2-3 per department, aligned to company OKRs
3. **Link to Strategic Themes** — each OKR maps to at least one theme

---

## Phase 6: Training & Handoff

> **Who:** Client Success Manager
> **Mode: Manual**

### 6.1 Training Sessions

| Session | Duration | Audience | Covers |
|---------|----------|----------|--------|
| Admin Training | 2 hours | System admins | Full platform walkthrough, agent management, context editing |
| User Training | 1 hour | All users | Dashboard, chat, running workflows, using agents |
| Executive Overview | 30 min | Leadership | Strategy 120, BSC, company dashboard |
| Department Deep-Dives | 1 hour each | Dept teams | Dept agents, workflows, metrics |

### 6.2 Documentation Handoff

- [ ] Platform URL and login instructions
- [ ] System admin credentials confirmed working
- [ ] In-app help available (help button on every page)
- [ ] Support contact information provided

### 6.3 Adoption KPIs (First 30 Days)

| Metric | Target | How to Track |
|--------|--------|-------------|
| Weekly active users | 80% of team | Company Dashboard |
| Workflows completed | 10+/week | Dashboard widgets |
| Context assets populated | All 8 core types | Context page |
| AI queries processed | 50+/week | Chat analytics |
| Soul config completeness | 100% | Soul Configuration page |
| Onboarding checklist | 100% | Administrator → Onboarding tab |

### 6.4 Ongoing Support

| Level | Response Time | Channel |
|-------|---------------|---------|
| Critical (platform down) | 4 hours | Email + Phone |
| High (feature broken) | 24 hours | Email |
| Normal (questions, how-to) | 48 hours | Email |

---

## Appendix A: Automation Status Matrix

| Item | Mode | Trigger |
|------|------|---------|
| Organization record | **Automated** | Client signup / plan selection |
| Subscription tier | **Automated** | Plan selection |
| Owner membership | **Automated** | Signup |
| System admin assignment | **Manual** | Platform admin invites from checklist |
| Department cloning (6, enriched) | **Automated** | Org provisioning |
| Workflow cloning (5, with steps) | **Automated** | Org provisioning |
| Dept-agent mapping cloning (11) | **Automated** | Org provisioning |
| Context asset types (18) | **Inherited** | Global platform reference, not cloned |
| BSC perspectives (4) | **Inherited** | Global platform reference, not cloned |
| Platform agents (23) | **Inherited** | Global platform reference, not cloned |
| Company profile | **Wizard** | Setup Wizard Step 1 |
| Strategic foundations | **Wizard** | Setup Wizard Step 1 |
| Department customization | **Wizard** | Setup Wizard Step 2 |
| Context asset instances (8 core) | **Wizard** | Setup Wizard Step 3 |
| Soul configuration | **Wizard** | Setup Wizard Step 4 |
| Branding | **Wizard** | Setup Wizard Step 5 |
| User accounts | **Manual** | System admin invites in Phase 3 |
| Role assignments | **Manual** | System admin sets in Phase 3 |
| Agent customization | **Manual** | Phase 4 review |
| Workflow customization | **Manual** | Phase 4 review |
| Strategic themes | **Manual** | Phase 5 (optional) |
| BSC objectives | **Manual** | Phase 5 (optional) |
| OKRs | **Manual** | Phase 5 (optional) |

---

## Appendix B: What Gets Cloned vs Referenced vs Created

| Resource | Model | Why |
|----------|-------|-----|
| **Departments** | Clone | Orgs rename, adjust metrics, add custom depts — must be independent |
| **Workflows** | Clone | Steps reference cloned dept IDs; orgs customize steps and prompts |
| **Dept-Agent Mappings** | Clone | Reference cloned dept IDs; orgs add/remove agent mappings |
| **Agents** | Reference (clone on customize) | Most orgs use standard agents as-is; only clone when prompt needs tuning |
| **Context Asset Types** | Reference | Type definitions are universal; orgs create instances of these types |
| **BSC Perspectives** | Reference | Four standard perspectives are universal |

**Clone cascade on org provisioning:**

```
Platform Departments (6)
    ├── Clone → Org Departments (org_id set)
    │
Platform Workflows (5)
    ├── Clone → Org Workflows (org_id set, department_id → cloned dept)
    │   └── Clone → Org Workflow Steps (workflow_id → cloned workflow)
    │
Platform Dept-Agent Mappings (11)
    └── Clone → Org Dept-Agent Mappings (department_id → cloned dept, agent_id → platform agent)
```

---

## Appendix C: Verification Checklist

Run after Phases 1-4 are complete:

### Setup Progress Check

Go to **Organization Settings** (`/admin-org-settings.html`). The Setup Progress panel shows 8 items. All should show "Configured" (green checkmark):

| # | Item | Check Logic | API Source | Links To |
|---|------|------------|------------|----------|
| 1 | **Organization Created** | Org record exists | Current org data | *(stays on page)* |
| 2 | **Subscription Tier** | Tier is set and not `none` | Current org data | `admin-platform.html` (platform admins only) |
| 3 | **Admin User** | At least one member with `admin` or `owner` role | `GET /api/org-members/:orgId` | `admin-org-members.html` |
| 4 | **Departments** | At least one department exists | `GET /api/departments` | `admin-departments.html` |
| 5 | **Roles Defined** | At least one department role/title exists | `GET /api/roles` | `roles.html` |
| 6 | **Team Members** | At least one org member exists | `GET /api/org-members/:orgId` | `admin-org-members.html` |
| 7 | **Branding** | Logo URL or primary color is set in org settings | Current org data | *(stays on page)* |
| 8 | **Resources** | At least one agent exists | `GET /api/agents?limit=1` | `admin-resource-access.html` |

All data is loaded in parallel via `Promise.allSettled`, so individual failures don't block other checks.

### Functional Spot Checks

| Page | What to Verify |
|------|---------------|
| Dashboard (`/`) | Widgets load, stats reflect org data |
| Chat (`/chat.html`) | AI responses reflect company context and voice |
| Agents (`/agents.html`) | Platform agents visible, org agents if any |
| Context (`/context.html`) | 8 core assets populated |
| Execute 120 (`/execute120.html`) | Department tabs with agents and workflows |
| Strategy 120 (`/strategy120.html`) | Themes, BSC visible (if Phase 5 done) |
| Align 120 (`/align120.html`) | Company profile and strategic foundations |
| Soul Config (`/soul-configuration.html`) | 100% completeness score |
| Administrator (`/administrator.html`) | Onboarding 100%, all sections accessible |

---

## Appendix D: Implementation Requirements

The following platform changes are needed to support this process:

### Must Build

1. **Clone service** — API endpoint or database function that clones platform departments, workflows (with steps), and dept-agent mappings into org-scoped records on provisioning
2. **Enhanced Setup Wizard** — Rewrite the 5-step wizard as a 6-step wizard (Company Foundation → Departments → Context → Soul Config → Branding → Review)
3. **Pre-fill from checklist** — Wizard accepts pre-deployment data and pre-fills fields
4. **Department customization UI in wizard** — Card-based view of cloned departments with enable/disable, rename, edit metrics inline
5. **Context population step** — Guided walkthrough of 8 core asset types with skip-and-remind
6. **Soul config embed** — Integrate soul wizard into setup wizard or link seamlessly

### Nice to Have

7. **Automated admin invitation email** — Send email on system admin assignment
8. **Pre-deployment intake form** — Web form that captures checklist items and feeds into provisioning
9. **Clone-on-customize for agents** — One-click clone of a platform agent into org namespace when editing
10. **Progress persistence** — Allow wizard to be saved mid-flow and resumed later

---

*This document supersedes setup-guide.md and client-onboarding-steps.md.*
*Version: 2.1 | February 2026*
