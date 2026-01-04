# Insight 360 Blueprint v2.28

**Version:** 2.28
**Date:** January 3, 2026
**Status:** Phase 10 | Execute 120 - Department-Focused Execution Hub

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.28

### Phase 10: Execute 120 - Department-Focused Execution Hub

Phase 10 introduces **Execute 120**, a department-centric execution module with workflow wizards that guide users through complex multi-step tasks. This phase completes the "Three Pillars" architecture: Align 120 (Values), Strategy 120 (Planning), and Execute 120 (Action).

---

### Execute 120 Architecture

Execute 120 provides a role-based interface where each department sees relevant agents, workflows, and quick actions tailored to their function.

```
┌─────────────────────────────────────────────────────────────┐
│                     Execute 120 Hub                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │Marketing│  │  Sales  │  │  Ops    │  │Executive│        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
│  ┌────▼────────────▼────────────▼────────────▼────┐        │
│  │         Department-Specific Agents              │        │
│  │  (Featured agents per department with           │        │
│  │   use case summaries and priority ordering)     │        │
│  └────┬────────────┬────────────┬────────────┬────┘        │
│       │            │            │            │              │
│  ┌────▼────────────▼────────────▼────────────▼────┐        │
│  │              Workflow Wizards                   │        │
│  │   Multi-step guided workflows with:             │        │
│  │   - User input collection                       │        │
│  │   - AI agent processing                         │        │
│  │   - Review and refinement                       │        │
│  │   - Final output generation                     │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

### New Database Schema

#### Department-Agent Mappings

Links agents to departments with featured status and display ordering.

```sql
CREATE TABLE department_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id),
    agent_id UUID REFERENCES agents(id),
    is_featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 50,
    use_case_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(department_id, agent_id)
);
```

#### Workflows Table

Multi-step executable workflows for department-specific tasks.

```sql
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    department_id UUID REFERENCES departments(id),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'zap',
    color TEXT DEFAULT '#6366f1',
    category TEXT DEFAULT 'general',
    estimated_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Workflow Steps Table

Individual steps within a workflow with type-specific configuration.

```sql
CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id),
    step_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    step_type TEXT NOT NULL CHECK (step_type IN (
        'agent_chat', 'user_input', 'review',
        'decision', 'output', 'context_load'
    )),
    agent_id UUID REFERENCES agents(id),
    prompt_template TEXT,
    input_fields JSONB DEFAULT '[]',
    output_variable TEXT,
    UNIQUE(workflow_id, step_number)
);
```

#### Workflow Executions Table

Tracks active and completed workflow runs.

```sql
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id),
    user_id UUID REFERENCES users(id),
    status TEXT CHECK (status IN ('in_progress', 'completed', 'cancelled', 'failed')),
    current_step INTEGER DEFAULT 1,
    variables JSONB DEFAULT '{}',
    step_outputs JSONB DEFAULT '{}'
);
```

---

### New Agents (16 Total)

#### Core Agents (8)

| Agent | Suite | Category | Model |
|-------|-------|----------|-------|
| Daily Briefer | strategy | research | claude-sonnet-4-5 |
| Email Triager | execute | communication | claude-haiku-4-5 |
| Research Assistant | strategy | research | claude-sonnet-4-5 |
| Meeting Prep | execute | productivity | claude-sonnet-4-5 |
| First Principles Thinker | strategy | analysis | claude-opus-4-5 |
| Code Reviewer | execute | development | claude-sonnet-4-5 |
| Writing Coach | execute | communication | claude-sonnet-4-5 |
| Strategic Advisor | strategy | analysis | claude-opus-4-5 |

#### Integrity Agents (3)

| Agent | Suite | Category | Model |
|-------|-------|----------|-------|
| Integrity Auditor | align | governance | claude-opus-4-5 |
| Risk Sentinel | align | governance | claude-sonnet-4-5 |
| Counterfactual Analyst | strategy | analysis | claude-sonnet-4-5 |

#### Department Agents (5)

| Agent | Suite | Category | Model |
|-------|-------|----------|-------|
| Proposal Generator | strategy | sales | claude-sonnet-4-5 |
| Competitive Intelligence Analyst | strategy | research | claude-sonnet-4-5 |
| Executive Communication Specialist | strategy | communication | claude-opus-4-5 |
| Campaign Strategist | strategy | marketing | claude-sonnet-4-5 |
| Process Documenter | strategy | operations | claude-sonnet-4-5 |

---

### System Workflows (5)

Pre-built multi-step workflows for common department tasks:

#### 1. Campaign Strategy Builder (Marketing)
**Estimated Time:** 30 minutes

| Step | Type | Description |
|------|------|-------------|
| 1 | user_input | Define Campaign Objective (goal, budget, timeline) |
| 2 | user_input | Identify Target Audience (persona, pain points, buying stage) |
| 3 | agent_chat | Generate Campaign Strategy (Campaign Strategist) |
| 4 | review | Review and Refine |
| 5 | output | Generate Campaign Brief |

#### 2. Proposal Builder (Sales)
**Estimated Time:** 20 minutes

| Step | Type | Description |
|------|------|-------------|
| 1 | user_input | Prospect Information (company, industry, contact) |
| 2 | user_input | Pain Points & Requirements |
| 3 | agent_chat | Generate Proposal (Proposal Generator) |
| 4 | review | Review and Customize |

#### 3. SOP Creator (Operations)
**Estimated Time:** 25 minutes

| Step | Type | Description |
|------|------|-------------|
| 1 | user_input | Process Overview (name, purpose, owner, frequency) |
| 2 | user_input | Process Steps (current steps, tools, pain points) |
| 3 | agent_chat | Generate SOP Document (Process Documenter) |
| 4 | review | Review and Finalize |

#### 4. Board Meeting Prep (Executive)
**Estimated Time:** 45 minutes

| Step | Type | Description |
|------|------|-------------|
| 1 | user_input | Meeting Context (date, type, topics, decisions) |
| 2 | user_input | Performance Data (revenue, metrics, highlights) |
| 3 | agent_chat | Generate Board Materials (Executive Comm Specialist) |
| 4 | agent_chat | Anticipate Questions (First Principles Thinker) |
| 5 | review | Final Review |

#### 5. Investment Analysis (Finance)
**Estimated Time:** 30 minutes

| Step | Type | Description |
|------|------|-------------|
| 1 | user_input | Investment Overview (name, type, amount, timeline) |
| 2 | user_input | Expected Returns (benefits, revenue impact, savings) |
| 3 | agent_chat | Generate Investment Analysis (First Principles Thinker) |
| 4 | agent_chat | Risk Deep Dive (Risk Sentinel) |
| 5 | review | Final Review |

---

### UI Updates

#### Navigation Rename

- "Strategy" category renamed to **"I360 Systems"** in sidebar navigation
- Contains: Align 120, Strategy (S2E), Strategy 120

#### Department Extensions

Departments now support Execute 120-specific fields:

```javascript
{
    tagline: "Craft magnetic stories that convert",
    metrics: [{ name: "MQLs", target: 500, unit: "leads" }],
    quick_prompts: ["Draft campaign brief...", "Analyze competitor..."],
    use_guide_url: "/documentation/use-cases/marketing.html"
}
```

---

### Row Level Security (RLS)

All Execute 120 tables have RLS policies:

- **department_agents:** Viewable by department owner or if public
- **workflows:** Users can view own or public/system workflows
- **workflow_steps:** Inherit permissions from parent workflow
- **workflow_executions:** Users can only view/manage own executions

---

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `db/phase10-execute120.sql` | Execute 120 schema and seed data |
| `db/seed-department-agents.sql` | Department-specific agents |
| `public/execute120.html` | Execute 120 frontend |
| `server/routes/execute120.js` | Execute 120 API routes |
| `documentation/design/execute-120-design.md` | Design document |
| `documentation/use-cases/*.md` | Department use case guides |

### Modified Files

| File | Changes |
|------|---------|
| `db/seed.sql` | Updated to current schema with system_prompt column |
| `db/seed-integrity-agents-v2.sql` | Fixed UUID format |
| `db/seed-agent-suites.sql` | Fixed UUID format |
| `public/js/navigation.js` | Renamed "Strategy" to "I360 Systems" |

---

## Three Pillars Complete

With Execute 120, the Three Pillars architecture is now complete:

| Pillar | Module | Focus | Status |
|--------|--------|-------|--------|
| **Align** | Align 120 | Values & Ethics | Complete |
| **Strategy** | Strategy 120 | Planning & Decision | Complete |
| **Execute** | Execute 120 | Action & Delivery | **NEW** |

---

## Production Readiness Score

**Updated Score: 6.0/10** (improved from 5.8/10)

| Area | Previous | Current | Change |
|------|----------|---------|--------|
| Architecture | 7/10 | 7.5/10 | +0.5 |
| Security | 7/10 | 7/10 | - |
| Error Handling | 7/10 | 7/10 | - |
| Database | 6.5/10 | 7/10 | +0.5 |
| Testing | 0/10 | 0/10 | - |
| Observability | 1.5/10 | 1.5/10 | - |
| Documentation | 5.5/10 | 6/10 | +0.5 |

---

## Next Steps (Phase 11)

- [ ] Implement Execute 120 frontend workflow UI
- [ ] Add workflow execution API endpoints
- [ ] Create department dashboard widgets
- [ ] Implement workflow templates
- [ ] Add structured logging with Winston/Pino

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.28 | Jan 3, 2026 | Execute 120 schema, 16 agents, 5 system workflows |
| v2.27 | Jan 2, 2026 | Security fixes, RLS policy fix, user management |
| v2.26 | Jan 2, 2026 | Navigation redesign, UI consistency |
| v2.25 | Jan 1, 2026 | Help system & documentation hub |
| v2.24 | Jan 1, 2026 | User management & RBAC |
| v2.23 | Dec 31, 2025 | Strategy 120 enhancements |
