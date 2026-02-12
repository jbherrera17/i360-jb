# Insight 360 — Platform Setup Process

**Purpose:** Complete guide for onboarding a new organization onto the Insight 360 multi-tenant platform.
**Audience:** Platform administrators (Synergi), system administrators (org-level), client success managers.
**Last Updated:** February 10, 2026 | Version 2.1

---

## Status Legend

Throughout this document, each feature or step is annotated with its current implementation status:

| Symbol | Meaning |
|--------|---------|
| **BUILT** | Fully implemented and working in the codebase |
| **PARTIAL** | Some infrastructure exists but not fully wired up |
| **TO BUILD** | Not yet implemented — described as target state |

---

## Architecture Context

Insight 360 is a **multi-tenant platform**. One deployed instance serves all organizations. There are no per-org schema migrations, no per-org seed data, and no per-org infrastructure.

**What lives at the platform level (shared):**
- Database schema and migrations
- API keys and environment configuration
- Platform seed data: 6 departments, 18 context asset types, 4 BSC perspectives, 23 agents, 5 workflows, 11 dept-agent mappings
- 36 platform modules with tier-based access control

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

**Multi-Tenancy Schema Support (Phase 39):** The following tables have `org_id` columns and are ready for org-scoped data: `agents`, `workflows`, `skills`, `context_assets`, `departments`, `okrs`, `conversations`, `company_profiles`, `align120_sessions`. The `department_agents` junction table does not have a direct `org_id` but is org-scoped through its `department_id` and `agent_id` references.

> **Note:** `strategic_foundations` currently has `user_id` only and lacks `org_id`. This needs a migration to support multi-tenant org-scoped strategic foundations.

---

## Platform Seed Data Inventory

| Category | Count | Source File | Details |
|----------|-------|-------------|---------|
| **Departments** | 6 | `db/seeds/master-seed.sql` | Sales, Marketing, Operations, Finance, HR, Executive — each with description, icon, color, tagline, metrics (3 per dept), quick_prompts (4 per dept) |
| **Context Asset Types** | 18 | `db/seeds/master-seed.sql` | 8 core (Company Description, Why We Win, Products, Pain Points, Voice DNA, ICP, Core Values, Custom Processes) + 10 extended (Competitors, Case Studies, FAQs, Team Bios, Industry Context, Terminology, Templates, Pricing, Brand Guidelines, Personas) |
| **BSC Perspectives** | 4 | `db/seeds/master-seed.sql` | Financial, Customer, Internal Process, Learning & Growth |
| **Utility Agents** | 8 | `db/seed.sql` | Daily Briefer, Email Triager, Research Assistant, Meeting Prep, First Principles Thinker, Code Reviewer, Writing Coach, Strategic Advisor |
| **Suite Agents** | 15 | `db/seeds/master-seed.sql` | 5 Align (Values Excavator, Process Miner, Unit Economics Analyst, Brand Strategist, Stakeholder Mapper) + 5 Strategy (Strategy Analyst, Risk Sentinel, Scenario Modeler, Market Intelligence Agent, Decision Support Agent) + 5 Execute (Campaign Strategist, Proposal Generator, Process Documenter, Executive Communicator, Financial Analyst) |
| **Workflows** | 5 | `db/seeds/master-seed.sql` | Campaign Strategy Builder (Marketing, 5 steps), Proposal Builder (Sales, 4 steps), SOP Creator (Operations, 4 steps), Board Meeting Prep (Executive, 5 steps), Investment Analysis (Finance, 5 steps) |
| **Dept-Agent Mappings** | 11 | `db/seeds/master-seed.sql` | Sales: 1, Marketing: 2, Operations: 2, Finance: 2, HR: 1, Executive: 3 |
| **Subscription Tiers** | 4 | `db/phase44-enterprise-multitenancy.sql` | Starter ($29/mo), Business ($99/mo), Enterprise ($299/mo), Agency ($499/mo) |
| **Platform Modules** | 36 | `db/phase44-enterprise-multitenancy.sql` | Dashboard, core systems, strategy pipeline, tools, agency, admin modules |
| **SCU Ethics Lenses** | 6 | `db/phase54-soul-configuration.sql` | Rights, Justice, Utilitarian, Common Good, Virtue, Care Ethics |

---

## Roles

| Role | Scope | Responsibilities |
|------|-------|-----------------|
| **Platform Administrator** | Synergi | Provisions orgs, assigns system admins, manages tiers, maintains platform seed data |
| **System Administrator** | Organization | Runs setup wizard, manages departments/agents/workflows, invites users |
| **End User** | Organization | Uses chat, runs workflows, creates context assets |

**Organization Member Roles** (in `organization_members` table): **BUILT**
- `owner` — Full control including billing
- `admin` — Manage members, clients, and configuration
- `consultant` — Work with clients and content
- `viewer` — Read-only access

**Business Role Levels** (in `business_role_levels` table): **BUILT**
- `ic` (Individual Contributor), `manager`, `director`, `vp`, `c-level`

---

## Current State (What Exists Today)

### Existing Setup Wizard — **BUILT** (`public/js/setup-wizard.js`)

The current wizard has **5 steps**:

| Step | Title | What It Does |
|------|-------|-------------|
| 1 | Organization Details | Collects org name, slug, description |
| 2 | Select Tier | Shows 4 subscription tiers with member/agent limits |
| 3 | Admin User | Collects admin email and name (invitation email is **TODO — not sent**) |
| 4 | Departments | Optional: select from 5 hardcoded defaults or add custom |
| 5 | Complete | Review summary, create org via `POST /api/organizations` |

**On completion**, the wizard:
1. Creates the org via `POST /api/organizations` (creates org record + owner membership)
2. Creates each selected department via `POST /api/departments` with `x-org-id` header
3. Redirects to `admin-org-settings.html`

**Current wizard gaps:**
- Department defaults are hardcoded as 5 basic names (Marketing, Sales, Engineering, Operations, Human Resources) — these **do not match** the 6 enriched seed departments (Sales, Marketing, Operations, Finance, HR, Executive) and lack taglines, metrics, quick_prompts
- No company profile or strategic foundations step
- No context asset population step
- No soul configuration step
- No branding step
- No clone cascade of platform data (departments, workflows, dept-agent mappings)
- Admin invitation email is TODO

### Existing Onboarding Checklist — **BUILT** (`public/js/onboarding-checklist.js`)

8-item checklist with org selector and platform admin toggle:

| Item | Check Condition | Links To |
|------|-----------------|----------|
| Organization Created | Org record exists | `admin-org-settings.html` |
| Admin User Assigned | Member with role admin or owner | `admin-org-members.html` |
| Subscription Tier Configured | Tier is not 'none' | `admin-tier-setup.html` |
| Departments Created | At least 1 department | `admin-org-settings.html#departments` |
| Roles Defined | At least 1 role | `admin-org-settings.html#roles` |
| Team Members | At least 1 member | `admin-org-members.html` |
| Branding Configured | Logo URL or primary color set | `admin-org-customization.html` |
| Resources Configured | At least 1 agent accessible | `admin-resource-access.html` |

### Existing Platform Admin Features — **BUILT** (`server/routes/platformAdmin.js`)

- `GET /api/platform/config` — Platform configuration
- `PUT /api/platform/config` — Update configuration
- `GET /api/platform/organizations` — List all organizations
- `GET /api/platform/organizations/:id` — Org details
- `GET /api/platform/tiers` — List subscription tiers
- Platform admin roles: `super_admin`, `admin`, `support`

### Department Management — **BUILT** (`server/routes/departments.js`, `public/admin-departments.html`)

Full CRUD API with fields: name, description, icon, color, tagline, metrics (JSONB), quick_prompts (TEXT[]), sort_order, is_active, org_id.

### Soul Configuration — **BUILT** (Phase 54)

Complete implementation including:
- Hierarchy: platform → organization → department → client → agent
- 8 sections: identity, values, bright_lines, guardrails, voice, domain, stakeholders, escalation
- Version history, cloning between scopes, ethical evaluations
- 7-step wizard at `/soul-wizard.html`
- Completeness scoring (0-100%)
- SCU Ethics Framework (6 lenses)

### Module Access Control — **BUILT** (Phase 44)

- 36 platform modules with tier-based access
- `can_access_module()`, `get_user_modules()`, `check_org_limits()` functions
- Dynamic navigation based on tier + role

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

> **Status: PARTIAL — Org creation is BUILT, admin invitation is TO BUILD**

The platform admin runs the Setup Wizard from the Administrator page to create the organization:

| Action | Status | What Happens |
|--------|--------|-------------|
| Create organization record | **BUILT** | `POST /api/organizations` creates org with name, slug, tier, owner membership |
| Assign subscription tier | **BUILT** | Set from tier selection in wizard Step 2 |
| Create owner membership | **BUILT** | Wizard runner becomes org owner automatically |
| Assign system administrator | **TO BUILD** | Platform admin should add the client's designated system admin and send invitation email |

#### Assigning the System Administrator

> **Status: PARTIAL** — Member management page exists, but invitation email is not yet implemented

1. Go to **Administrator** → **Team Members** (`/admin-org-members.html`)
2. Select the new organization
3. Click **Invite Member**
4. Enter the system admin's name and email from the checklist (items #8 and #9)
5. Set role to **admin**
6. The system admin will receive access and can begin configuration

### 1.3 Platform Data Cloning

> **Status: TO BUILD — The clone service does not exist yet.**
> The schema supports org-scoped data (`org_id` on departments, workflows, agents, etc. via Phase 39), but no automated cloning occurs on org provisioning today.

When an organization is provisioned, the following platform resources should be cloned:

| Resource | Platform Source | What Gets Cloned | Org Can Customize |
|----------|---------------|-------------------|-------------------|
| **Departments (6)** | Platform departments | Full copy: name, description, icon, color, tagline, metrics, quick_prompts, sort_order | Rename, adjust metrics/taglines, add/remove |
| **Workflows (5)** | Platform workflows | Full copy: all steps, agent references; department_id updated to cloned dept IDs | Rename steps, adjust prompts, add/remove steps |
| **Dept-Agent Mappings (11)** | Platform mappings | Full copy: department_id updated to cloned dept IDs; agent_id references platform agents | Add/remove agent mappings |
| **Context Asset Types (18)** | *Not cloned — referenced* | Org uses global types directly | Cannot modify type definitions |
| **BSC Perspectives (4)** | *Not cloned — referenced* | Org uses global perspectives directly | Cannot modify perspective definitions |
| **Agents (23)** | *Not cloned — referenced initially* | Org accesses platform public agents via dept-agent mappings | Can clone individual agents later for prompt customization |

**Clone cascade logic:**
1. Clone all 6 platform departments → set `org_id` on each copy, clear `user_id`
2. Clone all 5 platform workflows → set `org_id`, update `department_id` to point to cloned departments
3. Clone all workflow steps → update `workflow_id` to point to cloned workflows
4. Clone all 11 dept-agent mappings → update `department_id` to point to cloned departments, keep `agent_id` pointing to platform agents

**Result:** The org starts with a full working set of departments, workflows, and agent mappings that it owns and can freely customize.

---

## Phase 2: Organization Setup Wizard

> **Who:** System Administrator (the client's designated admin)
> **Status: TO BUILD — Target design for the enhanced 6-step wizard. Current wizard is 5 steps (see Current State section above).**
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
- `company_profiles` record linked to the org (table has `org_id` — **BUILT**)
- `strategic_foundations` record (table currently has `user_id` only — **needs `org_id` migration**)

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
+---------------------------------------------+
| [x] Sales                            [Edit] |
|     "Close deals and drive revenue growth"   |
|     Metrics: Pipeline Value, Win Rate,       |
|              Deals Closed                    |
|     Agents: Proposal Generator               |
|     Workflow: Proposal Builder               |
+---------------------------------------------+
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
- `context_assets` records linked to the org (table has `org_id` — **BUILT**), one per type

### Step 4: Soul Configuration

> **Pre-filled from:** Checklist #11-13 (vision, mission, values are reused)

The wizard embeds the Soul Configuration flow (the existing 7-step wizard at `/soul-wizard.html` — **BUILT**):

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
- `soul_configurations` record linked to the org (scope_type: 'organization' — **BUILT**)
- Inherits platform bright lines automatically

### Step 5: Branding

> **Pre-filled from:** Checklist items #14-15

| Field | Description |
|-------|-------------|
| Logo | Upload company logo (PNG/SVG) |
| Primary color | Brand color for UI theming |
| Secondary color | Accent color (optional) |

**What this creates:**
- Updates `organizations.branding` JSONB field (column exists — **BUILT**)

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
> **Status: BUILT** — Member management page and role assignment exist

### 3.1 Invite Team Members

**Location:** Team Members (`/admin-org-members.html`)

For each team member from Checklist #22 (or gathered post-deployment):

1. Click **Invite Member**
2. Enter name and email
3. Assign org membership role:

| Role | Access Level | Typical User |
|------|-------------|--------------|
| `owner` | Full access + billing | Founder, CEO |
| `admin` | Full access, can manage system | Department heads, IT |
| `consultant` | Can work with clients and content | Team leads, specialists |
| `viewer` | Read-only access | Stakeholders, observers |

4. Assign to department
5. Set business role level (ic, manager, director, vp, c-level)

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
> **Status: BUILT** — Agent management, department pages, and workflow execution exist. This phase is manual review.

### 4.1 Review Inherited Agents

Platform agents are accessible to the org through dept-agent mappings. Review with department leads:

**Per Department (from seed data):**

| Department | Featured Agents | Workflow |
|-----------|----------------|----------|
| Sales | Proposal Generator | Proposal Builder (4 steps) |
| Marketing | Campaign Strategist, Brand Strategist | Campaign Strategy Builder (5 steps) |
| Operations | Process Documenter, Process Miner | SOP Creator (4 steps) |
| Finance | Financial Analyst, Unit Economics Analyst | Investment Analysis (5 steps) |
| HR | Values Excavator | *(no workflow — consider creating)* |
| Executive | Executive Communicator, Strategy Analyst, Stakeholder Mapper | Board Meeting Prep (5 steps) |

**Cross-department utility agents** (available to all via chat):
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
> **Status: BUILT** — Align 120, Strategy 120, Execute 120 pages and APIs all exist
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
> **Status: Manual process** — Platform features exist, training materials need preparation

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
- [ ] In-app help available (help button on every page — **BUILT**, with user guides served via `/api/docs/`)
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

| Item | Target Mode | Current Status | Trigger |
|------|-------------|----------------|---------|
| Organization record | **Automated** | **BUILT** | Setup Wizard → `POST /api/organizations` |
| Subscription tier | **Automated** | **BUILT** | Wizard Step 2 tier selection |
| Owner membership | **Automated** | **BUILT** | Created automatically on org creation |
| System admin assignment | **Manual** | **PARTIAL** — member add works, invitation email is TODO | Platform admin invites from checklist |
| Department cloning (6, enriched) | **Automated** | **TO BUILD** — current wizard creates basic dept names only | Org provisioning clone service |
| Workflow cloning (5, with steps) | **Automated** | **TO BUILD** | Org provisioning clone service |
| Dept-agent mapping cloning (11) | **Automated** | **TO BUILD** | Org provisioning clone service |
| Context asset types (18) | **Inherited** | **BUILT** — global types, no cloning needed | Platform reference |
| BSC perspectives (4) | **Inherited** | **BUILT** — global perspectives, no cloning needed | Platform reference |
| Platform agents (23) | **Inherited** | **BUILT** — public agents accessible via dept-agent mappings | Platform reference |
| Company profile | **Wizard** | **TO BUILD** — wizard step doesn't exist yet | Setup Wizard Step 1 (target) |
| Strategic foundations | **Wizard** | **TO BUILD** — wizard step doesn't exist; table also needs `org_id` migration | Setup Wizard Step 1 (target) |
| Department customization | **Wizard** | **TO BUILD** — current wizard only offers basic name selection | Setup Wizard Step 2 (target) |
| Context asset instances (8 core) | **Wizard** | **TO BUILD** — wizard step doesn't exist yet | Setup Wizard Step 3 (target) |
| Soul configuration | **Wizard** | **PARTIAL** — soul wizard exists (`/soul-wizard.html`) but not integrated into setup wizard | Setup Wizard Step 4 (target) |
| Branding | **Wizard** | **TO BUILD** — wizard step doesn't exist; `organizations.branding` column exists | Setup Wizard Step 5 (target) |
| User accounts | **Manual** | **BUILT** — member management page works | System admin invites in Phase 3 |
| Role assignments | **Manual** | **BUILT** — org roles + business roles work | System admin sets in Phase 3 |
| Agent customization | **Manual** | **BUILT** — agent CRUD and cloning work | Phase 4 review |
| Workflow customization | **Manual** | **BUILT** — workflow CRUD works | Phase 4 review |
| Strategic themes | **Manual** | **BUILT** — Strategy 120 page works | Phase 5 (optional) |
| BSC objectives | **Manual** | **BUILT** — BSC management works | Phase 5 (optional) |
| OKRs | **Manual** | **BUILT** — OKR management works | Phase 5 (optional) |

---

## Appendix B: What Gets Cloned vs Referenced vs Created

| Resource | Model | Why |
|----------|-------|-----|
| **Departments** | Clone | Orgs rename, adjust metrics, add custom depts — must be independent |
| **Workflows** | Clone | Steps reference cloned dept IDs; orgs customize steps and prompts |
| **Workflow Steps** | Clone | Steps belong to cloned workflows; orgs customize input fields and agent references |
| **Dept-Agent Mappings** | Clone | Reference cloned dept IDs; orgs add/remove agent mappings |
| **Agents** | Reference (clone on customize) | Most orgs use standard agents as-is; only clone when prompt needs tuning |
| **Context Asset Types** | Reference | Type definitions are universal; orgs create instances of these types |
| **BSC Perspectives** | Reference | Four standard perspectives are universal |
| **SCU Ethics Lenses** | Reference | Six lenses are universal |

**Clone cascade on org provisioning:**

```
Platform Departments (6)
    +-- Clone --> Org Departments (org_id set, user_id null)
    |
Platform Workflows (5)
    +-- Clone --> Org Workflows (org_id set, department_id --> cloned dept)
    |   +-- Clone --> Org Workflow Steps (workflow_id --> cloned workflow)
    |
Platform Dept-Agent Mappings (11)
    +-- Clone --> Org Dept-Agent Mappings (department_id --> cloned dept, agent_id --> platform agent)
```

---

## Appendix C: Verification Checklist

Run after Phases 1-4 are complete:

### Onboarding Tab Check

Go to Administrator → Onboarding tab. All 8 items should be complete:
- [x] Organization Created
- [x] Admin User Assigned
- [x] Subscription Tier Configured
- [x] Departments Created
- [x] Roles Defined
- [x] Team Members
- [x] Branding Configured
- [x] Resources Configured

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

The following platform changes are needed to fully support this process. Items are ordered by priority.

### Must Build

1. **Clone service** — API endpoint or database function that clones platform departments (with all enriched fields), workflows (with all steps), and dept-agent mappings into org-scoped records on provisioning.
   - *Starting point:* Schema supports `org_id` on all relevant tables (Phase 39). Soul config already has a clone endpoint (`POST /api/soul-config/:id/clone`). Use as pattern.
   - *Key logic:* Clone cascade — departments first, then workflows with remapped `department_id`, then dept-agent mappings with remapped `department_id`.

2. **Enhanced Setup Wizard** — Rewrite the current 5-step wizard (`public/js/setup-wizard.js`) as a 6-step wizard (Company Foundation → Departments → Context → Soul Config → Branding → Review).
   - *Starting point:* Current wizard handles org creation, tier selection, and basic department selection. Extend from here.
   - *Key change:* Department step must present cloned enriched departments (with taglines, metrics, quick prompts) instead of 5 hardcoded names.

3. **Department customization UI in wizard** — Card-based view of cloned departments with enable/disable, rename, edit metrics inline, reorder.
   - *Starting point:* `admin-departments.html` has department card rendering and CRUD. Adapt for inline wizard editing.

4. **Context population step** — Guided walkthrough of 8 core asset types with skip-and-remind.
   - *Starting point:* Context asset CRUD exists (`server/routes/context.js`, `public/context.html`). Need a guided sequential UI.

5. **Soul config integration** — Embed the soul wizard (`/soul-wizard.html`) into the setup wizard or link seamlessly with pre-filled data from Step 1.
   - *Starting point:* Soul wizard is fully built with 7 steps. Need integration point to pass company profile data.

6. **`strategic_foundations` org_id migration** — Add `org_id` column to `strategic_foundations` table for multi-tenant support.
   - *Starting point:* Follow the Phase 39 pattern used for other tables.

### Nice to Have

7. **Automated admin invitation email** — Send email on system admin assignment (currently TODO in setup wizard).

8. **Pre-deployment intake form** — Web form that captures checklist items and feeds into provisioning.

9. **Clone-on-customize for agents** — One-click clone of a platform agent into org namespace when editing.

10. **Progress persistence** — Allow wizard to be saved mid-flow and resumed later.

11. **Pre-fill from checklist** — Wizard accepts pre-deployment data and pre-fills fields from intake form.

---

*This document supersedes setup-guide.md and client-onboarding-steps.md.*
*Version: 2.1 | February 2026*
