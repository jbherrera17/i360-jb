# Insight 360 Blueprint v2.12

**Version:** 2.12
**Date:** December 24, 2024
**Status:** Phase 4 Implementation | Integrity System + Actions Framework

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.12

- **Integrity System Fully Operational** — Fixed schema, seeded example assets, dashboard wired to real data
- **Thought Leadership Action Implemented** — Complete action with topic ideation, drafting, integrity check, and variations
- **Agent Context Mappings** — Agents linked to context assets for automatic prompt injection
- **7 Integrity Asset Instances** — Example data for Bright Lines, Values Map, Intervention Metrics, Trust Velocity, Close Calls, Industry Baseline, and Integrity Yield
- **8 Core Company Asset Templates** — Templates for company profile, values, voice, ICP, products, and thought leadership topics

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

## Integrity System

The Integrity System provides values-aligned AI governance through three specialized agents and seven asset types.

### Integrity Agents

| Agent | Purpose | Key Capabilities |
|-------|---------|------------------|
| **Integrity Auditor** | Values alignment checking | Front Page Test, Bright Lines validation, authenticity scoring |
| **Risk Sentinel** | Proactive risk identification | Pressure pattern detection, drift warnings, escalation triggers |
| **Counterfactual Analyst** | "We Don't Have That Problem" analysis | Industry comparisons, protection attribution, ROI calculation |

### Integrity Asset Types

| Asset Type | Description | Example Content |
|------------|-------------|-----------------|
| **Bright Lines** | Non-negotiable ethical boundaries | No deceptive AI, data privacy, no high-pressure sales |
| **Values Map** | Stated vs stress behavior analysis | Values drift scores under pressure |
| **Intervention Metrics** | Human oversight effectiveness | Veto rates, escalation frequency, pause-to-proceed ratios |
| **Trust Velocity Metrics** | Trust compounding/erosion tracking | Relationship longevity, forgiveness rates, referral-from-tenure |
| **Close Call Log** | Near-miss incident documentation | What almost happened, how caught, lessons learned |
| **Industry Baseline** | Counterfactual comparison data | Industry incident rates, avoided costs |
| **Integrity Yield** | Composite integrity score | Weighted score (0-100) with interpretation |

### Integrity Dashboard

The dashboard at `/integrity.html` displays:
- Composite Integrity Yield score with interpretation (Exemplary/Strong/Adequate/Concerning/Critical)
- Component scores (Trust Velocity, Intervention Effectiveness, Alignment Audit, Counterfactual Value)
- Leading indicators with status (green/yellow/red)
- Asset population status with last updated timestamps
- Action items from the latest assessment

---

## Actions Framework

**Actions** are composable web app experiences that combine context, organizational role, and AI intelligence.

### Thought Leadership Action (Implemented)

The first production action, demonstrating the full architecture.

**Action ID:** `a1000000-0000-0000-0001-000000000001`

#### Components

| Component | Type | Purpose |
|-----------|------|---------|
| Topic Ideation | Generator | Create topic ideas aligned with strategic themes |
| Content Drafting | Editor | Draft content with brand voice and format options |
| Integrity Check | Validator | Validate against values and Bright Lines |
| Variation Generator | Generator | Create A/B test variations |

#### Context Assets Required

- `voice_dna` — Brand voice guidelines (always injected)
- `icp` — Ideal customer profile (on-demand)
- `why_we_win` — Competitive differentiation (on-demand)
- `thought_leadership_topics` — Strategic themes (on-demand)
- `core_values` — Organizational values (always injected)
- `bright_lines` — Ethical boundaries (always injected)

#### System Prompt Principles

1. **Authenticity Over Virality** — Never sacrifice accuracy for engagement
2. **Value Creation** — Lead with insight, not self-promotion
3. **Integrity Alignment** — Pass the Front Page Test
4. **Brand Voice Consistency** — Match VoiceDNA precisely
5. **Audience-Centric Approach** — Write for ICP problems and goals

#### Output Formats

- LinkedIn Post (100-300 words)
- Blog Article (800-1500 words)
- Newsletter (500-800 words)
- Twitter/X Thread (5-10 tweets)
- Speaking Points (bullet format)

#### Associated Process

**Thought Leadership Content Workflow** (8 steps):
1. Topic Selection
2. Research & Outline
3. Draft Creation
4. Integrity Review
5. Stakeholder Review
6. Final Edit
7. Publication
8. Performance Tracking

---

## Database Schema Updates (Phase 4.2)

### Agent Table Extensions

Added columns for LLM configuration:
- `llm_provider` — anthropic, openai, google, custom
- `llm_model` — Specific model ID
- `system_prompt` — Injected at conversation start
- `temperature` — 0-2 (lower = more deterministic)
- `max_tokens` — Response limit
- `tools` — Array of tool configurations

### New Tables

| Table | Purpose |
|-------|---------|
| `agent_categories` | Agent organization (governance, analysis, content, sales, operations, custom) |
| `agent_context_mappings` | Links agents to context assets for injection |
| `action_context_assets` | Links actions to context assets |
| `action_processes` | Links actions to processes |

### New Views

| View | Purpose |
|------|---------|
| `agent_summary` | Aggregated agent listing with category and asset counts |
| `integrity_dashboard_summary` | Dashboard metrics from integrity assets |

### New Functions

| Function | Purpose |
|----------|---------|
| `get_agent_context(uuid)` | Assembles agent config + assets for execution |
| `setup_integrity_agent_mappings()` | Links integrity agents to their assets |

---

## Phase Overview (Updated)

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 1 | Foundation & Setup | ✅ Complete |
| Phase 2 | Core Chat & Features | ✅ Complete (v2.1.4) |
| Phase 3 | Agent Framework & Context | ✅ Complete (v2.10) |
| Phase 3.5 | Parthenon + Agent Reorganization | ✅ Complete (v2.11) |
| **Phase 4** | **Actions Framework + Integrity** | **✅ Complete (v2.12)** |
| Phase 5 | Daily Briefing & Workflows | 📋 Planned |
| Phase 6 | Polish, Scale & Production | 📋 Planned |

---

## Phase 4: Actions Framework (Complete)

```
████████████████████ 100%
```

### Completed Steps

| Step | Task | Status |
|------|------|--------|
| 4.1 | Design Actions schema | ✅ Complete |
| 4.2 | Fix Integrity system schema | ✅ Complete |
| 4.3 | Seed Integrity agents | ✅ Complete |
| 4.4 | Create core company asset templates | ✅ Complete |
| 4.5 | Seed Integrity asset instances | ✅ Complete |
| 4.6 | Implement Thought Leadership action | ✅ Complete |
| 4.7 | Wire Integrity dashboard to real data | ✅ Complete |

### SQL Files Created

| File | Purpose |
|------|---------|
| `phase4.2-integrity-fixes.sql` | Schema fixes for agents, categories, mappings, views |
| `seed-integrity-agents-v2.sql` | 3 integrity agents with proper configuration |
| `seed-core-company-assets.sql` | 8 company asset templates |
| `seed-integrity-asset-instances.sql` | 7 example integrity assets |
| `seed-thought-leadership-action.sql` | Thought Leadership action + workflow |

---

## API Endpoints

### Context Assets

- `GET /api/context/assets` — List assets (with `?type=` filter)
- `GET /api/context/assets/:id` — Get single asset
- `POST /api/context/assets` — Create asset
- `PUT /api/context/assets/:id` — Update asset
- `DELETE /api/context/assets/:id` — Delete asset

### Agents

- `GET /api/agents` — List all agents
- `GET /api/agents/:id` — Get agent with context
- `GET /api/agents/categories` — List agent categories
- `POST /api/agents/:id/chat` — Chat with agent

### Actions

- `GET /api/actions` — List all actions
- `GET /api/actions/:id` — Get action details
- `GET /api/actions/templates/list` — List action templates
- `GET /api/actions/stats/overview` — Action statistics

### Parthenon

- `GET /api/parthenon/overview` — Organization summary
- `GET /api/parthenon/departments` — List departments
- `GET /api/parthenon/roles` — List roles
- `GET /api/parthenon/okrs` — List OKRs
- `GET /api/parthenon/processes` — List processes

---

## File Structure (Updated)

```
insight-360/
├── server/
│   ├── routes/
│   │   ├── agents.js            # Agent CRUD with suite & LLM config
│   │   ├── context.js           # Context assets with type filtering
│   │   ├── parthenon.js         # Parthenon CRUD
│   │   ├── actions.js           # Actions framework
│   │   └── ...
├── public/
│   ├── integrity.html           # Integrity dashboard (wired to API)
│   ├── parthenon.html           # Parthenon admin
│   ├── actions.html             # Actions library
│   ├── context.html             # Context assets management
│   └── ...
├── db/
│   ├── schema.sql               # Base schema
│   ├── phase3.5-schema.sql      # Parthenon tables
│   ├── phase4-schema.sql        # Actions tables
│   ├── phase4.1-action-parthenon.sql  # Action-Parthenon junction tables
│   ├── phase4.2-integrity-fixes.sql   # Schema fixes
│   ├── seed-integrity-agents-v2.sql   # Integrity agents
│   ├── seed-core-company-assets.sql   # Company templates
│   ├── seed-integrity-asset-instances.sql  # Example integrity data
│   └── seed-thought-leadership-action.sql  # Thought Leadership action
└── documentation/
    ├── I360 Blueprint v2-11.md
    └── I360 Blueprint v2-12.md  # This document
```

---

## Next Steps: Phase 5

### Daily Briefing & Workflows

| Step | Task | Priority |
|------|------|----------|
| 5.1 | Daily Briefing agent with context injection | High |
| 5.2 | Scheduled briefing generation | High |
| 5.3 | Workflow automation triggers | Medium |
| 5.4 | Performance dashboard | Medium |
| 5.5 | Email/Slack delivery integration | Low |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| **v2.12** | **Dec 24, 2024** | **Integrity system fixes, Thought Leadership action, agent context mappings, 15 seeded assets** |
| v2.11 | Dec 24, 2024 | Parthenon model, Agent suites, Actions framework, External AI support |
| v2.10 | Dec 23, 2024 | Resizable preview, JSON editor fixes, import fixes |
| v2.9 | Dec 23, 2024 | AI Content Import, tabbed modal, auto-type detection |
| v2.8 | Dec 22, 2024 | Agent Launcher UI, Phase 3 complete |
| v2.7 | Dec 21, 2024 | Conversation persistence, copy message |
| v2.6 | Dec 20, 2024 | Integrity module staged |
| v2.5 | Dec 13, 2024 | Agent Launcher API complete |

---

*"Technology should augment human brilliance—not replace it."*

**Synergi AI** | Insight 360 Blueprint v2.12 | December 24, 2024
