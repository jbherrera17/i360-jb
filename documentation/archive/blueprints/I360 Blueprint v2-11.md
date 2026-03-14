# Insight 360 Blueprint v2.11

**Version:** 2.11
**Date:** December 24, 2024
**Status:** Phase 3.5 Planning | Parthenon + Actions Architecture

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.11

- **Parthenon Organizational Model** — Departments, Roles, OKRs, and Processes as structured data
- **Agent Suite Reorganization** — Agents categorized into Align 120 / Strategy 120 / Execute 120
- **Actions Framework** — Composable web app experiences that combine context, roles, and AI
- **External AI Integration** — Support for Pickaxe and MindStudio embeds alongside native agents
- **Thought Leadership Action** — First action implementation planned

---

## The Three Pillars: Align → Strategy → Execute

Insight 360 follows a cyclical methodology derived from the Synergi AI framework:

```
                    ┌─────────────────┐
                    │                 │
            ┌───────►   ALIGN 120    ├───────┐
            │       │   Foundation    │       │
            │       └────────┬────────┘       │
            │                │                │
            │                ▼                │
    ┌───────┴────────┐              ┌────────▼───────┐
    │                │              │                │
    │  EXECUTE 120   │◄─────────────│ STRATEGY 120   │
    │    Action      │              │   Planning     │
    │                │              │                │
    └────────────────┘              └────────────────┘

              VALUES-DRIVEN AI INSIGHTS
                  AND FRAMEWORKS
```

| Phase | Suite | Purpose | Focus |
|-------|-------|---------|-------|
| **Align 120** | Diagnostic & Alignment | Harmonize foundational concepts | WHO we are |
| **Strategy 120** | Strategic Planning | Design workflows & operational excellence | WHERE we're going |
| **Execute 120** | Automation & Action | Bridge strategy to action | HOW we get there |

---

## Align 120 - Foundation Layer

**Purpose:** Comprehensive diagnostic and alignment AI Agents, AI Utilities and services that harmonize your foundational concepts.

### AI Agents & Utilities

| Agent/Tool | Description | Context Assets |
|------------|-------------|----------------|
| AI Audit & Assessment | Evaluate current AI readiness and gaps | Company Description, Tech Stack |
| Business Fundamentals AI | Core business model analysis | Core Values, Company Description |
| Business Fundamentals Workshop | Interactive alignment session | All foundational assets |
| Team UpSkilling Audit AI | Assess team capabilities | Role definitions, Processes |
| Team UpSkilling Workshop | Training curriculum builder | Skills inventory, Gap analysis |
| Context Asset AIs | Asset creation and refinement | All asset types |
| Brand Messaging AI | Consistent messaging generator | Voice DNA, Brand Guidelines |
| Brand Alignment AI | Brand consistency checker | Brand Guidelines, Core Values |
| Brand Alignment Workshop | Collaborative brand session | All brand assets |

### Align 120 Context Assets

- Voice DNA
- Brand Guidelines
- Core Values
- Company Description
- Mission/Vision
- Bright Lines (Integrity)
- Values Map (Integrity)

---

## Strategy 120 - Planning Layer

**Purpose:** AI Agents and AI Tools that automate the processes of designing your workflows, strategic planning and operational excellence.

### AI Agents & Tools

| Agent/Tool | Description | Context Assets |
|------------|-------------|----------------|
| Tech Stack Analysis AI | Evaluate and recommend technology | Tech Stack, Requirements |
| Deep Research Market AI | Market analysis and trends | ICP, Industry data |
| Deep Research Competition AI | Competitive intelligence | Competitors, Why We Win |
| Process Workflow AIs | Design and optimize workflows | Processes, Procedures |
| Resource Definition AIs | Resource planning and allocation | OKRs, Budgets |
| First Principle Thinking AI | Strategic reasoning from fundamentals | Core Values, Objectives |
| Company OKR AI | Company-level objective setting | Vision, Strategy |
| Department OKR AI | Department objective alignment | Dept context, Company OKRs |
| Process UpSkilling Workshop | Process improvement training | Workflows, Best practices |

### Strategy 120 Context Assets

- ICP (Ideal Customer Profile)
- Buyer Personas
- Why We Win
- Products/Services
- Competitive Analysis
- OKRs (Company & Department)
- Process Definitions

---

## Execute 120 - Action Layer

**Purpose:** AI Agents, AI Utilities and AI Automations that bridge the gap between strategy and action. All AI Agents are connected inside SynergiNexus.

### AI Automations & Agents

| Agent/Tool | Description | Context Assets |
|------------|-------------|----------------|
| Outbound Marketing AIs | Campaign creation, content generation | Voice DNA, ICP, Products |
| Inbound Marketing Workflow AIs | Lead nurturing, content strategy | Buyer Personas, Processes |
| Outbound Sales AI Training | Sales enablement and coaching | Why We Win, Objections |
| Inbound Sales Workflow AIs | Lead qualification, follow-up | ICP, Sales processes |
| Finance Workflow AIs | Financial operations automation | Budgets, Procedures |
| Operations Workflow AIs | Operational task automation | Processes, Standards |
| Company Performance AIs | KPI tracking and analysis | OKRs, Metrics |

### Execute 120 Context Assets

- Custom Processes
- Workflow Definitions
- Templates
- Automation Rules
- Performance Metrics

---

## The Parthenon Organizational Model

The Parthenon represents your organizational structure as structured data that contextualizes AI interactions.

```
                         ┌─────────────┐
                         │  Insight    │
                         │    360      │
                         └──────┬──────┘
                                │
    ┌───────────────────────────┼───────────────────────────┐
    │                           │                           │
    ▼                           ▼                           ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Stakeholder│ │Finance │ │  Ops   │ │ Sales  │ │Marketing│ │Service │
│Relations │ │        │ │        │ │        │ │        │ │        │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
    │           │          │          │          │          │
    └───────────┴──────────┴──────────┴──────────┴──────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
            ┌─────────────┐         ┌─────────────┐
            │   ROLES     │         │    OKRs     │
            │             │         │             │
            │ - Executive │         │ - Company   │
            │ - Manager   │         │ - Dept      │
            │ - Individual│         │ - Team      │
            └─────────────┘         └─────────────┘
                    │                       │
                    └───────────┬───────────┘
                                ▼
                    ┌───────────────────────┐
                    │      FOUNDATION       │
                    │                       │
                    │  Standards • OKRs     │
                    │  Policies • Processes │
                    │      Procedures       │
                    └───────────────────────┘
```

### Parthenon Data Model

#### Departments Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR | Department name |
| description | TEXT | Department purpose |
| parent_id | UUID | Parent department (for hierarchy) |
| head_role_id | UUID | FK to department head role |
| created_at | TIMESTAMP | Creation date |

#### Roles Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| title | VARCHAR | Role title |
| department_id | UUID | FK to department |
| level | ENUM | executive, manager, individual |
| responsibilities | JSONB | Array of responsibility strings |
| authority | JSONB | Decision-making authority |
| reports_to | UUID | FK to supervisor role |
| created_at | TIMESTAMP | Creation date |

#### OKRs Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| title | VARCHAR | Objective title |
| description | TEXT | Objective description |
| scope | ENUM | company, department, team, individual |
| department_id | UUID | FK to department (if scoped) |
| role_id | UUID | FK to role (if individual) |
| key_results | JSONB | Array of key results with targets |
| period | VARCHAR | Q1 2024, H1 2024, etc. |
| status | ENUM | draft, active, completed |
| created_at | TIMESTAMP | Creation date |

#### Processes Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR | Process name |
| description | TEXT | Process purpose |
| department_id | UUID | FK to department |
| owner_role_id | UUID | FK to process owner role |
| type | ENUM | standard, policy, procedure |
| steps | JSONB | Ordered array of process steps |
| inputs | JSONB | Required inputs |
| outputs | JSONB | Expected outputs |
| created_at | TIMESTAMP | Creation date |

---

## Actions Framework

**Actions** are composable web app experiences that combine:
1. **Context Assets** — The knowledge (Voice DNA, ICP, etc.)
2. **Parthenon Context** — The organizational role (Department, Role, Responsibilities)
3. **AI Engine** — The intelligence (Native agent, Pickaxe, or MindStudio)
4. **UX Components** — The interface (Forms, workflows, outputs)

```
┌─────────────────────────────────────────────────────────────────────┐
│                           ACTION                                     │
│                    (e.g., "Thought Leadership")                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│   │  CONTEXT     │    │  PARTHENON   │    │  AI ENGINE   │         │
│   │  ASSETS      │    │  CONTEXT     │    │              │         │
│   │              │    │              │    │  ┌────────┐  │         │
│   │  - Voice DNA │    │  - Dept      │    │  │Native  │  │         │
│   │  - ICP       │    │  - Role      │    │  │Agent   │  │         │
│   │  - Why We Win│    │  - OKRs      │    │  ├────────┤  │         │
│   │  - Personas  │    │  - Authority │    │  │Pickaxe │  │         │
│   │  - Processes │    │  - Reports   │    │  ├────────┤  │         │
│   │              │    │              │    │  │Mind    │  │         │
│   │              │    │              │    │  │Studio  │  │         │
│   └──────────────┘    └──────────────┘    │  └────────┘  │         │
│                                           └──────────────┘         │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                        UX COMPONENTS                                 │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│   │   Input    │  │  Workflow  │  │   Output   │  │  History   │   │
│   │   Forms    │  │   Steps    │  │  Display   │  │   Log      │   │
│   └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Actions Data Model

#### Actions Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR | Action name |
| slug | VARCHAR | URL-friendly identifier |
| description | TEXT | What this action does |
| suite | ENUM | align, strategy, execute |
| icon | VARCHAR | Lucide icon name |
| context_assets | JSONB | Array of required asset type slugs |
| parthenon_context | JSONB | Required role/dept context |
| ai_engine | JSONB | AI configuration (see below) |
| ux_config | JSONB | UI component configuration |
| created_at | TIMESTAMP | Creation date |

#### AI Engine Configuration

```json
{
  "type": "native | pickaxe | mindstudio",
  "native": {
    "agent_id": "uuid",
    "model": "claude-sonnet-4",
    "temperature": 0.7
  },
  "pickaxe": {
    "embed_url": "https://embed.pickaxe.com/...",
    "pickaxe_id": "abc123"
  },
  "mindstudio": {
    "embed_url": "https://app.mindstudio.ai/...",
    "workspace_id": "xyz789"
  }
}
```

---

## Example Action: Thought Leadership

The first Action to be implemented, demonstrating the full architecture.

### Configuration

```yaml
name: Thought Leadership
slug: thought-leadership
suite: execute
description: Create thought leadership content aligned with brand voice and audience needs

context_assets:
  - voice_dna
  - icp
  - why_we_win
  - buyer_persona
  - custom_processes

parthenon_context:
  departments: [marketing, executive]
  roles: [content_strategist, marketing_director, ceo]
  requires_okrs: true

ai_engine:
  type: native
  agent_id: thought-leadership-agent
  fallback:
    type: pickaxe
    embed_url: https://embed.pickaxe.com/thought-leader

ux_components:
  - topic_ideation
  - content_drafting
  - brand_alignment_check
  - publishing_workflow
```

### User Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    THOUGHT LEADERSHIP ACTION                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. SELECT CONTEXT                                                   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Role: [Content Strategist ▼]  Dept: [Marketing ▼]           │    │
│  │ Voice: [Primary Brand Voice ▼]  Audience: [Enterprise ICP ▼]│    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  2. IDEATION                                                         │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ What topic or theme would you like to explore?              │    │
│  │ ┌─────────────────────────────────────────────────────────┐ │    │
│  │ │ AI ethics in enterprise software                        │ │    │
│  │ └─────────────────────────────────────────────────────────┘ │    │
│  │                                                             │    │
│  │ [Generate Ideas] → AI suggests angles based on:            │    │
│  │   • Your Why We Win differentiators                        │    │
│  │   • ICP pain points                                         │    │
│  │   • Current industry trends                                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  3. DRAFT                                                            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Selected angle: "Values-first AI adoption framework"       │    │
│  │                                                             │    │
│  │ Format: [LinkedIn Article ▼]  Length: [~1200 words ▼]      │    │
│  │                                                             │    │
│  │ [Generate Draft]                                            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  4. REVIEW & ALIGN                                                   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ ┌─────────────────────┐  ┌─────────────────────┐           │    │
│  │ │ Draft Content       │  │ Alignment Check     │           │    │
│  │ │                     │  │                     │           │    │
│  │ │ [AI-generated       │  │ ✅ Voice match: 94% │           │    │
│  │ │  content here...]   │  │ ✅ Values aligned   │           │    │
│  │ │                     │  │ ⚠️ Consider ICP     │           │    │
│  │ │                     │  │    pain point #3    │           │    │
│  │ └─────────────────────┘  └─────────────────────┘           │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  5. PUBLISH                                                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ [Copy to Clipboard] [Export to Notion] [Save Draft]        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Platform Architecture (Updated)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INSIGHT 360 PLATFORM                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                          USER ACTIONS LAYER                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │  Thought    │  │   Sales     │  │  Strategy   │  │  Custom   │  │
│  │ Leadership  │  │ Enablement  │  │  Planning   │  │  Actions  │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘  │
│         └────────────────┼────────────────┼────────────────┘        │
│                          ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    ACTIONS FRAMEWORK                         │   │
│  │         Context Assets + Parthenon + AI Engine              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                          │                                          │
│         ┌────────────────┼────────────────┐                        │
│         ▼                ▼                ▼                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │  ALIGN 120  │  │STRATEGY 120 │  │ EXECUTE 120 │                │
│  │   Agents    │  │   Agents    │  │   Agents    │                │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                │
│         └────────────────┼────────────────┘                        │
│                          ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   PARTHENON LAYER                            │   │
│  │        Departments │ Roles │ OKRs │ Processes               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                          │                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  CONTEXT ASSETS LAYER                        │   │
│  │     25 Asset Types (18 Core + 7 Integrity) + AI Import      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                          │                                          │
│         ┌────────────────┼────────────────┐                        │
│         ▼                ▼                ▼                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │   Claude    │  │   OpenAI    │  │  External   │                │
│  │  (Native)   │  │  (Native)   │  │  (Pickaxe/  │                │
│  │             │  │             │  │ MindStudio) │                │
│  └─────────────┘  └─────────────┘  └─────────────┘                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase Overview (Updated)

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 1 | Foundation & Setup | ✅ Complete |
| Phase 2 | Core Chat & Features | ✅ Complete (v2.1.4) |
| Phase 3 | Agent Framework & Context | ✅ Complete (v2.10) |
| **Phase 3.5** | **Parthenon + Agent Reorganization** | **🔄 In Progress** |
| Phase 4 | Actions Framework + First Actions | 📋 Planned |
| Phase 5 | Daily Briefing & Workflows | 📋 Planned |
| Phase 6 | Polish, Scale & Production | 📋 Planned |

---

## Phase 3.5: Parthenon + Agent Reorganization

```
████████░░░░░░░░░░░░ 40% (Planning)
```

### Steps

| Step | Task | Status |
|------|------|--------|
| 3.5.1 | Design Parthenon schema | 📋 Planned |
| 3.5.2 | Create database migrations | 📋 Planned |
| 3.5.3 | Build Parthenon API routes | 📋 Planned |
| 3.5.4 | Parthenon Admin UI | 📋 Planned |
| 3.5.5 | Reorganize agents into suites | 📋 Planned |
| 3.5.6 | Update Agent Library UI with suite tabs | 📋 Planned |
| 3.5.7 | Agent-Parthenon linking | 📋 Planned |

### Deliverables

1. **Database Schema** — `phase3.5-schema.sql`
2. **API Routes** — `/api/parthenon/*` (departments, roles, okrs, processes)
3. **Admin UI** — New Parthenon management page
4. **Agent Library** — Tabbed by Align/Strategy/Execute

---

## Phase 4: Actions Framework

### Steps

| Step | Task | Status |
|------|------|--------|
| 4.1 | Design Actions schema | 📋 Planned |
| 4.2 | Create Actions API routes | 📋 Planned |
| 4.3 | Build Action runtime engine | 📋 Planned |
| 4.4 | External AI embed support | 📋 Planned |
| 4.5 | Action Builder UI | 📋 Planned |
| 4.6 | Implement Thought Leadership action | 📋 Planned |
| 4.7 | Action marketplace/library | 📋 Planned |

---

## Current Agents → Suite Mapping

### Align 120 Agents

| Agent | Current | Suite Fit |
|-------|---------|-----------|
| ✍️ Content Writer | content | Align (Brand voice alignment) |
| 📧 Email Composer | communication | Align (Voice consistency) |
| 🛡️ Integrity Auditor | integrity | Align (Values alignment) |

### Strategy 120 Agents

| Agent | Current | Suite Fit |
|-------|---------|-----------|
| 🎯 Strategy Advisor | strategy | Strategy (Planning) |
| 🔬 Research Analyst | research | Strategy (Market research) |
| 🚨 Risk Sentinel | integrity | Strategy (Risk planning) |

### Execute 120 Agents

| Agent | Current | Suite Fit |
|-------|---------|-----------|
| 💼 Sales Assistant | sales | Execute (Sales automation) |
| 📋 Daily Briefer | productivity | Execute (Operational) |
| 📊 Counterfactual Analyst | integrity | Execute (Performance) |

---

## New Agents to Build

### Align 120 (Planned)

- AI Audit & Assessment Agent
- Business Fundamentals Agent
- Brand Alignment Agent
- Team UpSkilling Audit Agent

### Strategy 120 (Planned)

- Tech Stack Analysis Agent
- Deep Research Market Agent
- Deep Research Competition Agent
- OKR Planning Agent
- Process Design Agent

### Execute 120 (Planned)

- Outbound Marketing Agent
- Inbound Sales Workflow Agent
- Operations Workflow Agent
- Company Performance Agent

---

## File Structure (Updated)

```
insight-360/
├── server/
│   ├── routes/
│   │   ├── agents.js            # Agent CRUD (with suite field)
│   │   ├── context.js           # Context assets
│   │   ├── parthenon.js         # NEW: Parthenon CRUD
│   │   ├── actions.js           # NEW: Actions framework
│   │   └── ...
│   ├── services/
│   │   ├── actionRuntime.js     # NEW: Action execution engine
│   │   ├── externalAI.js        # NEW: Pickaxe/MindStudio integration
│   │   └── ...
├── public/
│   ├── parthenon.html           # NEW: Parthenon admin
│   ├── actions.html             # NEW: Actions library
│   ├── action/                  # NEW: Individual action UIs
│   │   └── thought-leadership.html
│   ├── js/
│   │   ├── parthenon.js         # NEW
│   │   ├── actions.js           # NEW
│   │   └── ...
├── db/
│   ├── phase3.5-schema.sql      # NEW: Parthenon tables
│   ├── phase4-schema.sql        # NEW: Actions tables
│   └── ...
└── documentation/
    └── I360 Blueprint v2-11.md  # This document
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| **v2.11** | **Dec 24, 2024** | **Parthenon model, Agent suites (Align/Strategy/Execute), Actions framework, External AI support** |
| v2.10 | Dec 23, 2024 | Resizable preview, JSON editor fixes, import fixes |
| v2.9 | Dec 23, 2024 | AI Content Import, tabbed modal, auto-type detection |
| v2.8 | Dec 22, 2024 | Agent Launcher UI, Phase 3 complete |
| v2.7 | Dec 21, 2024 | Conversation persistence, copy message |
| v2.6 | Dec 20, 2024 | Integrity module staged |
| v2.5 | Dec 13, 2024 | Agent Launcher API complete |

---

## Appendix: Image Assets Reference

The following visual assets in `/public/assets/I360 Context Images/` define the framework:

| File | Description |
|------|-------------|
| `Insight 360 AI.png` | Overview of Align/Strategy/Execute cycle |
| `Align 120.png` | Align suite agents and utilities |
| `Strategy 120.png` | Strategy suite agents and tools |
| `Execute 120.png` | Execute suite automations + SynergiNexus |
| `25-08-27 - I360 Parthenon-T.png` | Parthenon organizational structure |
| `25-10-29 - TInsight 360.png` | Full journey: Align → Strategy → Execute |

---

*"Technology should augment human brilliance—not replace it."*

**Synergi AI** | Insight 360 Blueprint v2.11 | December 24, 2024
