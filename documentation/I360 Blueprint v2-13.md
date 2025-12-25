# Insight 360 Blueprint v2.13

**Version:** 2.13
**Date:** December 25, 2024
**Status:** Phase 4.5 | Agent Runner & Quick Launch

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.13

- **Agent Runner Page** — New dedicated page (`/agent-runner.html`) for running any agent from the library
  - Native agents: Full chat interface with streaming responses
  - MindStudio/Pickaxe agents: Full-screen iframe embedding
- **Quick Launch Dropdown** — Sidebar navigation flyout for instant agent access
- **Recent Agents Dashboard Widget** — Run agents directly from the Dashboard
- **Improved Agent Library UX** — "Run Agent" button opens dedicated runner page

---

## Agent Runner System

### Overview

The Agent Runner provides a unified interface for executing any agent type:

```
┌─────────────────────────────────────────────────┐
│ Header: Agent Name | Type Badge | Back Button   │
├─────────────────────────────────────────────────┤
│                                                 │
│  IF native:                                     │
│    Chat interface with streaming                │
│    - Context preview (collapsible)              │
│    - Messages area                              │
│    - Input field                                │
│                                                 │
│  IF mindstudio/pickaxe:                         │
│    Full-screen iframe                           │
│    - embed_url loaded directly                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### URL Structure

```
/agent-runner.html?id={agent-uuid}
```

### Agent Type Detection

The runner auto-detects agent type from the `source_type` field:

| Type | Behavior |
|------|----------|
| `native` (default) | Chat UI with streaming via `/api/agents/:id/execute/stream` |
| `mindstudio` | Full iframe from `embed_config.embed_url` |
| `pickaxe` | Full iframe from `embed_config.embed_url` |

### Features

**Native Agent Chat:**
- Context assets preview (collapsible)
- Conversation starters
- Real-time streaming responses
- Markdown formatting (code, bold, links)
- Copy message to clipboard
- Theme sync (dark/light)

**Embedded Agents:**
- Full-screen iframe
- Sandbox permissions: scripts, same-origin, forms, popups
- Microphone/camera access allowed
- Error handling for missing URLs

---

## Quick Launch System

### Sidebar Dropdown

Located between "Context Assets" and "Agent Library" in the navigation:

```
┌──────────────────────────┐
│ 🚀 Quick Launch      ▼  │
└──────────────────────────┘
        │
        ▼
┌──────────────────────────┐
│ RECENT AGENTS            │
├──────────────────────────┤
│ 🤖 Agent Name            │
│    type                  │
├──────────────────────────┤
│ 🤖 Agent Name            │
│    type                  │
├──────────────────────────┤
│ ─────────────────────    │
│ 📊 View All Agents       │
└──────────────────────────┘
```

**Behavior:**
- Click to toggle flyout menu
- Shows up to 6 recent agents
- Click agent to open in Agent Runner (new tab)
- "View All Agents" links to Agent Library

### Dashboard Widget

The "Recent Agents" card on the Dashboard:

```
┌─────────────────────────────────────┐
│ 🤖 Recent Agents       View All    │
├─────────────────────────────────────┤
│ ┌───┐ Agent Name                    │
│ │ 🤖│ native • 12 runs        [▶]  │
│ └───┘                               │
├─────────────────────────────────────┤
│ ┌───┐ Agent Name                    │
│ │ 🤖│ mindstudio • 8 runs     [▶]  │
│ └───┘                               │
└─────────────────────────────────────┘
```

**Features:**
- Shows 5 most recently used agents
- Type badge (native/mindstudio/pickaxe)
- Usage count
- Hover reveals play button
- Click to open Agent Runner

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

| Asset Type | Description |
|------------|-------------|
| **Bright Lines** | Non-negotiable ethical boundaries |
| **Values Map** | Stated vs stress behavior analysis |
| **Intervention Metrics** | Human oversight effectiveness |
| **Trust Velocity Metrics** | Trust compounding/erosion tracking |
| **Close Call Log** | Near-miss incident documentation |
| **Industry Baseline** | Counterfactual comparison data |
| **Integrity Yield** | Composite integrity score |

---

## Phase Overview (Updated)

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 1 | Foundation & Setup | ✅ Complete |
| Phase 2 | Core Chat & Features | ✅ Complete (v2.1.4) |
| Phase 3 | Agent Framework & Context | ✅ Complete (v2.10) |
| Phase 3.5 | Parthenon + Agent Reorganization | ✅ Complete (v2.11) |
| Phase 4 | Actions Framework + Integrity | ✅ Complete (v2.12) |
| **Phase 4.5** | **Agent Runner & Quick Launch** | **✅ Complete (v2.13)** |
| Phase 5 | Daily Briefing & Workflows | 📋 Planned |
| Phase 6 | Polish, Scale & Production | 📋 Planned |

---

## File Structure (Updated)

```
insight-360/
├── server/
│   └── routes/
│       ├── agents.js            # Agent CRUD + execution streaming
│       ├── context.js           # Context assets
│       ├── parthenon.js         # Parthenon CRUD
│       └── actions.js           # Actions framework
├── public/
│   ├── agent-runner.html        # NEW: Universal agent runner
│   ├── agents.html              # Agent library (updated Run button)
│   ├── index.html               # Dashboard (Quick Launch + Recent Agents)
│   ├── integrity.html           # Integrity dashboard
│   ├── parthenon.html           # Parthenon admin
│   ├── actions.html             # Actions library
│   └── context.html             # Context assets
└── documentation/
    └── I360 Blueprint v2-13.md  # This document
```

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
- `POST /api/agents/:id/execute/stream` — Stream agent response
- `GET /api/agents/:id/context/preview` — Preview context for agent

### Actions

- `GET /api/actions` — List all actions
- `GET /api/actions/:id` — Get action details
- `GET /api/actions/templates/list` — List action templates

### Parthenon

- `GET /api/parthenon/overview` — Organization summary
- `GET /api/parthenon/departments` — List departments
- `GET /api/parthenon/roles` — List roles
- `GET /api/parthenon/okrs` — List OKRs
- `GET /api/parthenon/processes` — List processes

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
| **v2.13** | **Dec 25, 2024** | **Agent Runner page, Quick Launch dropdown, Recent Agents widget** |
| v2.12 | Dec 24, 2024 | Integrity system fixes, Thought Leadership action, agent context mappings |
| v2.11 | Dec 24, 2024 | Parthenon model, Agent suites, Actions framework |
| v2.10 | Dec 23, 2024 | Resizable preview, JSON editor fixes |
| v2.9 | Dec 23, 2024 | AI Content Import, auto-type detection |
| v2.8 | Dec 22, 2024 | Agent Launcher UI, Phase 3 complete |
| v2.7 | Dec 21, 2024 | Conversation persistence |
| v2.6 | Dec 20, 2024 | Integrity module staged |

---

*"Technology should augment human brilliance—not replace it."*

**Synergi AI** | Insight 360 Blueprint v2.13 | December 25, 2024
