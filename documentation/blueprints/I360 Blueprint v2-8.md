# Insight 360 Blueprint v2.8

**Version:** 2.8
**Date:** December 22, 2025
**Status:** Phase 3 Complete | Agent Launcher Live

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.8

- ✅ **Agent Launcher UI** — Slide-in panel to execute agents with streaming responses
- ✅ **Context Preview** — See injected context assets and token counts before execution
- ✅ **Conversation Starters** — Quick-start buttons for common agent tasks
- ✅ **Execution History** — View recent agent runs with status, tokens, and duration
- ✅ **Multi-Turn Conversations** — Continue conversations within launcher session
- ✅ **Copy Message** — Copy agent responses to clipboard with visual feedback
- ✅ **Agent Library Fixes** — Proper icon rendering for Lucide icons, provider badges
- ✅ **User Documentation** — Agent Library user guide added

### Previous (v2.7)

- Conversation Persistence, Copy Message, Rename/Delete Conversations
- Loading Spinner (Synergi Swirls), Dashboard Light Mode Fix
- Conversation API (Full CRUD)

---

## Platform Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         INSIGHT 360 PLATFORM                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Dashboard  │  │    Chat     │  │   Agents    │  │  Integrity  │    │
│  │  (index)    │  │  Interface  │  │   Library   │  │  Dashboard  │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │            │
│         └────────────────┼────────────────┼────────────────┘            │
│                          ▼                ▼                              │
│                 ┌─────────────────────────────────┐                     │
│                 │      Context Assets Layer       │                     │
│                 │  (25 Asset Types + 7 Integrity) │                     │
│                 └─────────────────┬───────────────┘                     │
│                                   │                                      │
│                 ┌─────────────────┼───────────────┐                     │
│                 ▼                 ▼               ▼                     │
│         ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│         │   Claude    │  │   OpenAI    │  │   Future    │              │
│         │  (Opus/     │  │   (GPT-4o/  │  │  Providers  │              │
│         │   Sonnet/   │  │    o1)      │  │             │              │
│         │   Haiku)    │  │             │  │             │              │
│         └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase Overview

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 1 | Foundation & Setup | ✅ Complete |
| Phase 2 | Core Chat & Features | ✅ Complete (v2.1.4) |
| Phase 3 | Agent Framework & Context | ✅ Complete (v2.8) |
| Phase 4 | Daily Briefing & Workflows | 📋 Planned |
| Phase 5 | Polish, Scale & Production | 📋 Planned |

---

## Phase 3 Progress: 100% Complete

```
████████████████████ 100%
```

| Step | Task | Status |
|------|------|--------|
| 3.1 | Deploy Context Asset Schema | ✅ Complete |
| 3.2 | Seed Asset Types (18 core types) | ✅ Complete |
| 3.3 | Context API Routes | ✅ Complete |
| 3.4 | Context Admin UI | ✅ Complete |
| 3.5 | JSON Editor Component | ✅ Complete |
| 3.6 | Version History System | ✅ Complete |
| 3.7 | Agent Management API | ✅ Complete |
| 3.8 | Agent-Context Mapping | ✅ Complete |
| 3.9 | Context Injection Service | ✅ Complete |
| 3.10 | Agent Execution Engine | ✅ Complete |
| 3.11 | Agent Launcher UI | ✅ Complete |

---

## Chat Interface Features (v2.7)

### Conversation Management

The chat interface now includes full conversation persistence:

| Feature | Description |
|---------|-------------|
| **Auto-Save** | Conversations auto-saved on first message |
| **Conversation List** | Sidebar shows recent conversations sorted by date |
| **Load Conversation** | Click to restore full conversation with history |
| **Rename** | Pencil icon to edit conversation title |
| **Delete** | Trash icon with confirmation dialog |
| **New Chat** | Start fresh conversation at any time |

### Message Actions

| Feature | Description |
|---------|-------------|
| **Copy Message** | Hover reveals copy button on each message |
| **Clipboard Feedback** | Icon changes to checkmark for 2 seconds |
| **Markdown Rendering** | Code blocks, bold, italic, links |

### Loading State

| Component | Description |
|-----------|-------------|
| **Synergi Swirls Spinner** | Animated SVG with 3 rotating gradient ellipses |
| **Dual Theme Support** | Visible in both light and dark modes |
| **"Thinking..." Text** | Status indicator during response generation |

---

## Conversation API Endpoints (7 Total)

### Conversations
- `GET /api/conversations` — List conversations (paginated)
- `POST /api/conversations` — Create new conversation
- `GET /api/conversations/:id` — Get conversation with messages
- `PUT /api/conversations/:id` — Update conversation (title, model)
- `DELETE /api/conversations/:id` — Delete conversation (cascade)

### Messages
- `GET /api/conversations/:id/messages` — Get messages (paginated)
- `POST /api/conversations/:id/messages` — Add message to conversation

---

## Starter Agents (6 Deployed)

| Agent | Category | Context Assets | Tokens |
|-------|----------|----------------|--------|
| ✍️ Content Writer | content | VoiceDNA, Brand Guidelines, Core Values | ~1,940 |
| 💼 Sales Assistant | sales | Products, ICP, Why We Win, VoiceDNA | ~2,500 |
| 🎯 Strategy Advisor | strategy | Core Values, Company Description, Products, Why We Win | ~2,200 |
| 📋 Daily Briefer | productivity | ICP, Company Description | ~1,100 |
| 📧 Email Composer | communication | VoiceDNA, Brand Guidelines | ~1,500 |
| 🔬 Research Analyst | research | Company Description, ICP, Why We Win | ~1,800 |

---

## Integrity Module (Staged)

### Overview

The Integrity Module transforms abstract ethical concepts into measurable, trackable assets that power governance AI agents.

### Asset Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRITY ASSET HIERARCHY                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FOUNDATION LAYER          MEASUREMENT LAYER                    │
│  ┌──────────────────┐      ┌──────────────────┐                 │
│  │ • Bright Lines   │      │ • Intervention   │                 │
│  │ • Values Map     │      │   Metrics        │                 │
│  └────────┬─────────┘      │ • Trust Velocity │                 │
│           │                │   Metrics        │                 │
│           │                └────────┬─────────┘                 │
│           │                         │                            │
│           └───────────┬─────────────┘                            │
│                       ▼                                          │
│           COMPARISON LAYER                                       │
│           ┌──────────────────────┐                               │
│           │ • Industry Baselines │                               │
│           │ • Close Call Log     │                               │
│           └──────────┬───────────┘                               │
│                      ▼                                           │
│           COMPOSITE LAYER                                        │
│           ┌──────────────────────┐                               │
│           │ • Integrity Yield    │                               │
│           └──────────────────────┘                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Integrity Asset Types (7 Types)

| Asset Type | Layer | Purpose |
|------------|-------|---------|
| `bright_lines` | Foundation | Non-negotiable ethical boundaries |
| `values_map` | Foundation | Stated vs. practiced values with alignment scores |
| `intervention_metrics` | Measurement | Veto rates, escalation frequency, pause-to-proceed |
| `trust_velocity_metrics` | Measurement | Customer tenure, forgiveness rates, employee retention |
| `close_call_log` | Comparison | Documented near-misses with severity assessment |
| `industry_baseline` | Comparison | Sector incident rates, estimated costs avoided |
| `integrity_yield` | Composite | Calculated 0-100 score combining all metrics |

### Integrity Agents (3 Agents)

| Agent | Model | Role | Context Inputs |
|-------|-------|------|----------------|
| 🛡️ Integrity Auditor | Claude Opus 4.5 | Front Page Test, Values Drift Analysis, Bright Line Monitoring | Bright Lines, Values Map, Core Values |
| 🚨 Risk Sentinel | Claude Sonnet 4.5 | Leading indicator monitoring, drift detection | Intervention Metrics, Trust Velocity, Close Call Log |
| 📊 Counterfactual Analyst | Claude Sonnet 4.5 | ROI calculation, compliance cost avoidance | Industry Baseline, Close Call Log |

---

## Agent API Endpoints (17 Total)

### Agent CRUD
- `GET /api/agents` — List all agents with filters
- `GET /api/agents/categories` — List 8 agent categories
- `GET /api/agents/stats` — Usage statistics
- `GET /api/agents/:id` — Get single agent
- `POST /api/agents` — Create new agent
- `PUT /api/agents/:id` — Update agent
- `DELETE /api/agents/:id` — Delete agent
- `POST /api/agents/:id/duplicate` — Duplicate agent

### Context Mapping
- `GET /api/agents/:id/context` — Get agent's context mappings
- `POST /api/agents/:id/context` — Add context mapping
- `PUT /api/agents/:id/context/:mappingId` — Update mapping
- `DELETE /api/agents/:id/context/:mappingId` — Remove mapping
- `POST /api/agents/:id/context/preview` — Preview assembled context

### Execution
- `POST /api/agents/:id/execute` — Execute agent (non-streaming)
- `POST /api/agents/:id/stream` — Execute agent (streaming SSE)
- `GET /api/agents/:id/executions` — Get execution history
- `GET /api/agents/:id/executions/:execId` — Get single execution

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js, Express |
| **Database** | Supabase (PostgreSQL) |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Icons** | Lucide |
| **LLM Providers** | Anthropic Claude (Opus/Sonnet/Haiku), OpenAI GPT |
| **Voice** | OpenAI Whisper (STT), OpenAI TTS |
| **Search** | Brave, Tavily, Serper |

---

## File Structure

```
insight-360/
├── server/
│   ├── index.js                 # Express server
│   ├── routes/
│   │   ├── agents.js            # Agent CRUD & execution
│   │   ├── context.js           # Context asset management
│   │   ├── conversations.js     # Conversation management (new)
│   │   ├── injection.js         # Context injection API
│   │   └── ...
│   ├── services/
│   │   ├── contextInjection.js  # Context assembly service
│   │   ├── agentExecution.js    # Multi-provider execution
│   │   ├── conversationService.js # Conversation CRUD (new)
│   │   └── ...
│   └── middleware/
├── public/
│   ├── index.html               # Dashboard
│   ├── chat.html                # Chat interface
│   ├── context.html             # Context asset management
│   ├── agents.html              # Agent library
│   ├── integrity.html           # Integrity dashboard
│   ├── briefing.html            # Daily briefing (Phase 4)
│   ├── assets/
│   │   ├── loading-spinner.svg  # Animated Synergi Swirls (new)
│   │   └── SSynergi Swirls.png  # Source logo
│   ├── css/
│   │   ├── styles.css           # Main styles
│   │   ├── loading-spinner.css  # Spinner animations (new)
│   │   ├── dashboard-styles.css # Dashboard-specific styles
│   │   └── integrity-styles.css # Integrity module styles
│   └── js/
│       └── chat.js              # Chat interface logic (enhanced)
├── db/
│   ├── schema.sql               # Core schema
│   ├── phase3-schema.sql        # Agent & context schema
│   ├── seed-integrity-asset-types.sql  # 7 integrity types
│   └── seed-integrity-agents.sql       # 3 integrity agents
├── docs/
│   ├── integrity-assets-architecture.md
│   └── integrity-acquisition-wizard.md
└── documentation/
    ├── I360 Blueprint v2-7.md   # This document
    ├── integrity-metrics-framework.md
    └── user-guide-integrity.md
```

---

## Next Steps: Recommended Path

### Complete Phase 3 First (Agent Launcher UI)

**Rationale:** Finish what's started before adding new capabilities.

**Scope:**
1. Agent Library page — Browse/filter agents by category
2. Agent execution interface — Run agents with streaming responses
3. Context preview panel — Show injected context before execution
4. Execution history view — Browse and review past runs

**Value:** Unlocks full agent ecosystem for all 6 starter agents + 3 integrity agents

### Recommended Sequence

```
Integrity Sprint (Recommended Next)
    │
    ├── I.1: Run database seeds
    ├── I.2: Integrity asset API endpoints
    ├── I.3: Integrity Dashboard UI
    ├── I.4: Acquisition wizards (Bright Lines, Values Map)
    └── I.5: Wire integrity agents
          │
          ▼
Phase 4: Daily Briefing
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.8 | Dec 22, 2025 | Agent Launcher UI, context preview, execution history, Phase 3 complete |
| v2.7 | Dec 21, 2025 | Conversation persistence, copy message, rename/delete, loading spinner |
| v2.6 | Dec 20, 2025 | Integrity module staged, blueprint updated with strategic options |
| v2.5 | Dec 13, 2025 | Agent Launcher API complete (Steps 3.7-3.10) |
| v2.1.4 | Dec 2025 | Theme system complete coverage |
| v2.1.0 | Dec 2025 | Core chat, multi-LLM, voice, search |

---

*"Technology should augment human brilliance—not replace it."*

**Synergi AI** | Insight 360 Blueprint v2.8 | December 22, 2025
