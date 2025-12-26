# Insight 360 Blueprint v2.15

**Version:** 2.15
**Date:** December 25, 2024
**Status:** Phase 4.7 | Model Override & Conversation Tracking

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.15

- **Runtime Model Override** — Users can now select a different LLM model at runtime in the Agent Runner
  - Dropdown selector in header shows current model
  - Override indicator when using non-default model
  - Seamless switching between Anthropic and OpenAI models
- **Conversation Tracking** — Enhanced execution logging with model metadata
  - Tracks agent default model vs runtime model
  - Records whether model was overridden by user
  - Session ID for grouping related conversations
- **Improved Model Display** — Friendly model names throughout the UI
  - `claude-opus-4-5-20251101` displays as "Claude Opus 4.5"
  - Legacy model names resolve and display correctly

---

## Model Override System

### User Interface

The Agent Runner header now includes a model selector dropdown:

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back  | Agent Name                                        │
│         | native | Claude Sonnet 4.5 ▼        | Theme     │
│                   └── Dropdown opens:                       │
│                       ┌─────────────────────────┐           │
│                       │ AGENT DEFAULT           │           │
│                       │ ✓ Claude Sonnet 4.5     │           │
│                       ├─────────────────────────┤           │
│                       │ ANTHROPIC CLAUDE        │           │
│                       │   Claude Opus 4.5       │           │
│                       │   Claude Sonnet 4.5     │           │
│                       │   Claude Haiku 4.5      │           │
│                       │   Claude Opus 4         │           │
│                       │   Claude Sonnet 4       │           │
│                       ├─────────────────────────┤           │
│                       │ OPENAI GPT              │           │
│                       │   GPT-4.1               │           │
│                       │   GPT-4.1 Mini          │           │
│                       │   GPT-4o                │           │
│                       │   GPT-4o Mini           │           │
│                       └─────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Visual Indicators

| State | Button Style | Display Text |
|-------|-------------|--------------|
| Default | Normal border | "Claude Sonnet 4.5" |
| Overridden | Orange/warning border | "Claude Opus 4.5 (override)" |

### API Changes

The `/api/agents/:id/execute/stream` endpoint now accepts additional parameters:

```javascript
// Request body
{
  "message": "User prompt text",
  "conversation_history": [],
  "model_override": "claude-opus-4-5-20251101",  // Optional
  "session_id": "sess_1703547600_abc123"         // Optional
}

// Response (SSE complete event)
{
  "type": "complete",
  "execution_id": "uuid",
  "agent_model": "claude-sonnet-4-5-20250929",    // Configured default
  "runtime_model": "claude-opus-4-5-20251101",   // Actually used
  "model_overridden": true,
  "usage": { ... },
  "duration_ms": 1234
}
```

---

## Conversation Tracking

### Execution Log Fields

The `agent_executions` table now includes:

| Column | Type | Description |
|--------|------|-------------|
| `agent_model` | TEXT | Model configured by agent author |
| `runtime_model` | TEXT | Model actually used at execution |
| `model_overridden` | BOOLEAN | True if user selected different model |
| `session_id` | TEXT | Browser session ID for grouping |

### Session Management

- Session IDs are generated client-side and stored in localStorage
- Format: `sess_{timestamp}_{random}`
- Enables grouping related executions without authentication
- Persists across page refreshes within the same browser

---

## LLM Model Configuration

### Available Claude Models

| Model ID | Display Name | Tier |
|----------|-------------|------|
| `claude-opus-4-5-20251101` | Claude Opus 4.5 | Premium |
| `claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 | Default |
| `claude-haiku-4-5-20251001` | Claude Haiku 4.5 | Fast |
| `claude-opus-4-1-20250805` | Claude Opus 4.1 | Premium |
| `claude-opus-4-20250514` | Claude Opus 4 | Premium |
| `claude-sonnet-4-20250514` | Claude Sonnet 4 | Standard |

### Available OpenAI Models

| Model ID | Display Name | Tier |
|----------|-------------|------|
| `gpt-4.1` | GPT-4.1 | Flagship |
| `gpt-4.1-mini` | GPT-4.1 Mini | Efficient |
| `gpt-4o` | GPT-4o | Default |
| `gpt-4o-mini` | GPT-4o Mini | Efficient |
| `o3` | o3 | Reasoning |
| `o4-mini` | o4-mini | Reasoning |
| `o3-mini` | o3-mini | Reasoning |

### Model Resolution

Legacy model names are automatically resolved:

```javascript
'claude-3-5-sonnet-20241022' → 'claude-sonnet-4-20250514'
'claude-3-opus'              → 'claude-opus-4-20250514'
'claude-3-haiku'             → 'claude-haiku-4-5-20251001'
```

---

## Phase Overview (Updated)

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 1 | Foundation & Setup | ✅ Complete |
| Phase 2 | Core Chat & Features | ✅ Complete (v2.1.4) |
| Phase 3 | Agent Framework & Context | ✅ Complete (v2.10) |
| Phase 3.5 | Parthenon + Agent Reorganization | ✅ Complete (v2.11) |
| Phase 4 | Actions Framework + Integrity | ✅ Complete (v2.12) |
| Phase 4.5 | Agent Runner & Quick Launch | ✅ Complete (v2.13) |
| Phase 4.6 | Agent Runner Enhancements | ✅ Complete (v2.14) |
| **Phase 4.7** | **Model Override & Tracking** | **✅ Complete (v2.15)** |
| Phase 5 | Daily Briefing & Workflows | 📋 Planned |
| Phase 6 | Polish, Scale & Production | 📋 Planned |

---

## File Structure (Updated)

```
insight-360/
├── server/
│   ├── services/
│   │   ├── agentService.js      # Model override + execution logging
│   │   ├── anthropic.js         # Claude models (source of truth)
│   │   └── openai.js            # OpenAI models
│   └── routes/
│       ├── agents.js            # Stream API with model_override param
│       ├── chat.js              # Multi-LLM chat
│       ├── context.js           # Context assets
│       ├── parthenon.js         # Parthenon CRUD
│       └── actions.js           # Actions framework
├── public/
│   ├── agent-runner.html        # Model selector dropdown
│   ├── agents.html              # Agent library
│   ├── index.html               # Dashboard
│   └── ...
├── db/
│   └── phase4.5-model-override.sql  # Migration for tracking columns
└── documentation/
    └── I360 Blueprint v2-15.md  # This document
```

---

## Database Migration

Run the following SQL to add model tracking columns:

```sql
-- Add model tracking columns
ALTER TABLE agent_executions
ADD COLUMN IF NOT EXISTS agent_model TEXT,
ADD COLUMN IF NOT EXISTS runtime_model TEXT,
ADD COLUMN IF NOT EXISTS model_overridden BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agent_executions_session_id
ON agent_executions(session_id) WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_executions_model_overridden
ON agent_executions(model_overridden) WHERE model_overridden = TRUE;
```

Full migration script: `db/phase4.5-model-override.sql`

---

## API Endpoints

### Agent Execution (Updated)

- `POST /api/agents/:id/execute/stream` — Stream agent response
  - New params: `model_override`, `session_id`
  - Returns: `agent_model`, `runtime_model`, `model_overridden` in completion

### All Other Endpoints

See v2.14 documentation for complete API reference.

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
| **v2.15** | **Dec 25, 2024** | **Model override dropdown, conversation tracking, session IDs** |
| v2.14 | Dec 25, 2024 | Auto-start execution, LLM model resolution, complete model sync |
| v2.13 | Dec 25, 2024 | Agent Runner page, Quick Launch dropdown, Recent Agents widget |
| v2.12 | Dec 24, 2024 | Integrity system fixes, Thought Leadership action |
| v2.11 | Dec 24, 2024 | Parthenon model, Agent suites, Actions framework |
| v2.10 | Dec 23, 2024 | Resizable preview, JSON editor fixes |

---

*"Technology should augment human brilliance—not replace it."*

**Synergi AI** | Insight 360 Blueprint v2.15 | December 25, 2024
