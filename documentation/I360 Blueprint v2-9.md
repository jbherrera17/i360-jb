# Insight 360 Blueprint v2.9

**Version:** 2.9
**Date:** December 23, 2025
**Status:** Phase 3 Complete | AI Content Import Live

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.9

- **AI-Powered Content Import** — Convert any business content into structured context assets
- **Tabbed Create Modal** — Generate New vs Import Content workflows
- **Auto-Type Detection** — AI analyzes content and selects best asset type from 18 options
- **File Upload Support** — Drag-and-drop upload for .txt, .md, .json, .csv files
- **Confidence Scoring** — AI returns confidence level (0-1) for parsed content
- **Review Fields Tracking** — Highlights fields needing human verification
- **Context Asset Generator Prompt** — Standalone prompt for use with any LLM

### Previous (v2.8)

- Agent Launcher UI, Context Preview, Execution History
- Multi-Turn Conversations, Copy Message
- Agent Library Fixes, User Documentation

---

## AI Content Import Feature

### Overview

The new Content Import feature allows users to convert any unstructured business content (SOPs, process documents, product descriptions, team bios, etc.) into properly structured Context Assets using AI.

### How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CONTENT IMPORT FLOW                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   Raw        │    │   Claude     │    │  Structured  │          │
│  │   Content    │───▶│   Sonnet 4   │───▶│   Asset      │          │
│  │   (any text) │    │   AI Parser  │    │   (JSON)     │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│         │                   │                   │                   │
│         │                   ▼                   │                   │
│         │         ┌──────────────┐             │                   │
│         │         │ • Detects    │             │                   │
│         │         │   asset type │             │                   │
│         │         │ • Extracts   │             │                   │
│         │         │   fields     │             │                   │
│         │         │ • Validates  │             │                   │
│         │         │   schema     │             │                   │
│         │         └──────────────┘             │                   │
│         │                                      │                   │
│         └───────────────────────────────────────┘                   │
│                                                                      │
│  Input: Paste text or upload file (.txt, .md, .json, .csv)         │
│  Output: Structured context asset ready for review and save         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### UI Components

| Component | Description |
|-----------|-------------|
| **Tabbed Modal** | Generate New / Import Content tabs |
| **Type Selector** | Optional - Auto-detect or force specific type |
| **Source Field** | Document origin for metadata tracking |
| **Content Textarea** | Paste raw content (min 50 characters) |
| **File Upload Area** | Drag-and-drop with visual feedback |
| **Status Indicator** | "Analyzing and structuring content..." |

### API Endpoint

```
POST /api/context/parse

Request:
{
  "content": "string (required, min 50 chars)",
  "preferred_type": "string (optional)",
  "source": "string (optional)"
}

Response:
{
  "success": true,
  "asset": {
    "asset_type": "custom_processes",
    "name": "Sales Onboarding Process",
    "description": "Week 1 onboarding workflow...",
    "tags": ["onboarding", "sales"],
    "content_json": { ... }
  },
  "metadata": {
    "source": "Sales Playbook",
    "confidence": 0.95,
    "needs_review": []
  },
  "usage": {
    "input_tokens": 1234,
    "output_tokens": 567
  }
}
```

### Supported Asset Types (18 Total)

The AI parser understands all 18 context asset types:

**Core Types (8)**
1. company_description — Who we are, mission, history, and vision
2. why_we_win — Competitive differentiation and unique value proposition
3. products — Offerings, features, benefits, and pricing
4. pain_points — Customer problems we address
5. voice_dna — Brand voice, tone, style rules, and writing guidelines
6. icp — Target customer segments and profiles
7. core_values — Guiding principles and organizational beliefs
8. custom_processes — Internal workflows, methodologies, and procedures

**Extended Types (10)**
9. competitors — Competitive landscape and analysis
10. case_studies — Success stories and customer testimonials
11. faqs — Common questions and objection handling
12. team_bios — Key people, expertise, and backgrounds
13. industry_context — Market trends, regulations, and landscape
14. terminology — Domain-specific glossary and definitions
15. templates — Email, proposal, and content templates
16. pricing — Pricing structure, packages, and terms
17. brand_guidelines — Visual identity, colors, and usage rules
18. personas — Detailed buyer personas for targeting

### Standalone Prompt

A standalone Context Asset Generator prompt is available for use with any LLM:

```
docs/prompts/context-asset-generator.md
```

This prompt can be used to generate context assets outside of Insight 360.

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
│                 │  + AI Content Import (NEW)      │                     │
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
| Phase 3 | Agent Framework & Context | ✅ Complete (v2.9) |
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
| 3.12 | AI Content Import | ✅ Complete |

---

## Context Assets API Endpoints (9 Total)

### Asset CRUD
- `GET /api/context/types` — List all asset types
- `GET /api/context/assets` — List all assets with filters
- `GET /api/context/assets/:id` — Get single asset
- `POST /api/context/assets` — Create new asset
- `PUT /api/context/assets/:id` — Update asset
- `DELETE /api/context/assets/:id` — Delete asset

### AI Generation
- `POST /api/context/generate` — Generate asset content with AI
- `POST /api/context/parse` — Parse raw content into structured asset (NEW)

### Export
- `GET /api/context/export` — Export all assets as JSON

---

## Chat Interface Features (v2.7)

### Conversation Management

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

| Agent | Model | Role |
|-------|-------|------|
| 🛡️ Integrity Auditor | Claude Opus 4.5 | Front Page Test, Values Drift Analysis |
| 🚨 Risk Sentinel | Claude Sonnet 4.5 | Leading indicator monitoring, drift detection |
| 📊 Counterfactual Analyst | Claude Sonnet 4.5 | ROI calculation, compliance cost avoidance |

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
│   │   ├── context.js           # Context asset management + AI parse
│   │   ├── conversations.js     # Conversation management
│   │   ├── injection.js         # Context injection API
│   │   └── ...
│   ├── services/
│   │   ├── contextInjection.js  # Context assembly service
│   │   ├── agentExecution.js    # Multi-provider execution
│   │   ├── conversationService.js # Conversation CRUD
│   │   └── ...
│   └── middleware/
├── public/
│   ├── index.html               # Dashboard
│   ├── chat.html                # Chat interface
│   ├── context.html             # Context asset management (enhanced)
│   ├── agents.html              # Agent library
│   ├── integrity.html           # Integrity dashboard
│   ├── briefing.html            # Daily briefing (Phase 4)
│   ├── assets/
│   │   ├── loading-spinner.svg  # Animated Synergi Swirls
│   │   └── SSynergi Swirls.png  # Source logo
│   ├── css/
│   │   └── styles.css           # Main styles
│   └── js/
│       ├── chat.js              # Chat interface logic
│       └── context.js           # Context admin (enhanced with import)
├── db/
│   ├── schema.sql               # Core schema
│   ├── phase3-schema.sql        # Agent & context schema
│   ├── seed-asset-types.sql     # 18 asset types with schemas
│   └── seed-integrity-*.sql     # Integrity types and agents
├── docs/
│   ├── prompts/
│   │   └── context-asset-generator.md  # Standalone AI prompt (NEW)
│   ├── integrity-assets-architecture.md
│   └── integrity-acquisition-wizard.md
└── documentation/
    └── I360 Blueprint v2-9.md   # This document
```

---

## Next Steps: Recommended Path

### Integrity Sprint (Recommended Next)

**Rationale:** The Integrity Module is staged and ready for implementation.

**Scope:**
1. Run database seeds for integrity asset types
2. Integrity asset API endpoints
3. Integrity Dashboard UI
4. Acquisition wizards (Bright Lines, Values Map)
5. Wire integrity agents to execution engine

### Phase 4: Daily Briefing

Following Integrity Sprint:
1. Daily Briefing generator agent
2. Scheduled execution system
3. Email/notification delivery
4. Briefing customization UI

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.9 | Dec 23, 2025 | AI Content Import, tabbed modal, auto-type detection, file upload |
| v2.8 | Dec 22, 2025 | Agent Launcher UI, context preview, execution history, Phase 3 complete |
| v2.7 | Dec 21, 2025 | Conversation persistence, copy message, rename/delete, loading spinner |
| v2.6 | Dec 20, 2025 | Integrity module staged, blueprint updated with strategic options |
| v2.5 | Dec 13, 2025 | Agent Launcher API complete (Steps 3.7-3.10) |
| v2.1.4 | Dec 2025 | Theme system complete coverage |
| v2.1.0 | Dec 2025 | Core chat, multi-LLM, voice, search |

---

*"Technology should augment human brilliance—not replace it."*

**Synergi AI** | Insight 360 Blueprint v2.9 | December 23, 2025
