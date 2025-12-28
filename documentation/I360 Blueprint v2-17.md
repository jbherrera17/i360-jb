# Insight 360 Blueprint v2.17

**Version:** 2.17
**Date:** December 27, 2024
**Status:** Phase 4.9 | MindStudio Integration

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.17

### MindStudio Integration
- **Full MindStudio Support** — Create and run MindStudio agents with both API and Embed execution modes
- **Signed URL Generation** — Backend endpoint generates authenticated embed URLs for secure iframe embedding
- **MindStudio Service** — New `mindstudioService.js` handles all MindStudio API interactions
- **Health Check Update** — MindStudio service status now shown in system health

### Agent Library Enhancements
- **Resizable Right Panel** — Drag-to-resize sidebar with localStorage persistence
- **Improved Panel Styling** — Consistent dark theme styling between left and right panels
- **MindStudio Form Fields** — App ID, Workflow Name, Execution Mode, Embed URL fields

### Agent Runner Updates
- **Embed View Support** — MindStudio agents can now load as authenticated iframes
- **Dynamic URL Generation** — Fetches signed embed URLs from backend before loading
- **Execution Mode Routing** — Automatically routes to embed or chat view based on agent config

### Bug Fixes
- **ESM/CommonJS Compatibility** — Fixed `uuid` v13+ ESM-only error by using Node's built-in `crypto.randomUUID()`
- **CSP Update** — Added `frame-src` and `connect-src` for MindStudio domains
- **MindStudio Agent Creation** — Fixed 400 error by handling NOT NULL constraints for MindStudio agents

---

## MindStudio Integration Architecture

### Execution Modes

| Mode | Description | Implementation |
|------|-------------|----------------|
| **API** | Backend executes MindStudio workflow | `POST /api/agents/:id/execute/stream` → `mindstudioService.executeAgent()` |
| **Embed** | Authenticated iframe loads MindStudio app | `POST /api/agents/:id/embed-url` → iframe with signed URL |

### Signed URL Flow

```
┌─────────────┐    1. Request embed URL    ┌─────────────────┐
│   Browser   │ ──────────────────────────▶│ Insight 360 API │
│             │                            │                 │
│             │                            │ POST /embed-url │
└─────────────┘                            └────────┬────────┘
       ▲                                            │
       │                                            │ 2. Generate signed URL
       │                                            ▼
       │                               ┌─────────────────────────┐
       │                               │    MindStudio API       │
       │                               │                         │
       │                               │ generate-signed-access  │
       │                               └────────────┬────────────┘
       │                                            │
       │  3. Return signed URL                      │
       └────────────────────────────────────────────┘

       4. Load iframe with signed URL
       ┌─────────────┐
       │   iframe    │ ──▶ https://app.mindstudio.ai/agents/...?SignedAccessKey=...
       └─────────────┘
```

### API Endpoints

#### POST /api/agents/:id/embed-url
Generate a signed embed URL for MindStudio agents.

**Request:**
```json
{
  "user_id": "optional-user-id"
}
```

**Response:**
```json
{
  "success": true,
  "embed_url": "https://app.mindstudio.ai/agents/xxx/run?SignedAccessKey=...",
  "agent_id": "insight-360-agent-uuid",
  "mindstudio_app_id": "mindstudio-app-uuid"
}
```

---

## New Files

### server/services/mindstudioService.js

MindStudio API client service with the following functions:

| Function | Description |
|----------|-------------|
| `executeApp()` | Execute a MindStudio workflow via API |
| `executeAgent()` | Execute agent and normalize response for Insight 360 |
| `generateSignedEmbedUrl()` | Generate authenticated embed URL |
| `validateConnection()` | Validate MindStudio API key |
| `isConfigured()` | Check if MindStudio is configured |
| `getEmbedUrl()` | Get static embed URL from agent config |

---

## Configuration

### Environment Variables

```env
# MindStudio AI
MINDSTUDIO_API_KEY=sk...  # From https://app.mindstudio.ai/
```

### Agent Configuration for MindStudio

```json
{
  "type": "mindstudio",
  "mindstudio_workflow_id": "app-uuid-from-mindstudio",
  "config": {
    "execution_mode": "embed",  // or "api"
    "mindstudio_app_id": "app-uuid",
    "mindstudio_workflow": "optional-workflow-name",
    "embed_url": "optional-static-embed-url"
  }
}
```

---

## Content Security Policy

Updated CSP directives for MindStudio support:

```javascript
contentSecurityPolicy: {
  directives: {
    // ... existing directives ...
    connectSrc: [
      "'self'",
      "https://api.anthropic.com",
      "https://api.openai.com",
      "https://*.supabase.co",
      "https://unpkg.com",
      "https://api.mindstudio.ai"  // NEW
    ],
    frameSrc: [                     // NEW
      "'self'",
      "https://app.mindstudio.ai",
      "https://*.mindstudio.ai"
    ]
  }
}
```

---

## Database Schema Updates

### MindStudio Agent Fields

| Column | Type | Description |
|--------|------|-------------|
| `type` | TEXT | Set to `mindstudio` |
| `mindstudio_workflow_id` | TEXT | MindStudio App ID (required) |
| `config` | JSONB | Execution mode and additional settings |
| `llm_provider` | TEXT | Set to `mindstudio` (placeholder for NOT NULL) |
| `llm_model` | TEXT | Set to `mindstudio-workflow` (placeholder) |
| `system_prompt` | TEXT | Set to placeholder text (NOT NULL constraint) |

---

## Phase Overview (Updated)

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 1 | Foundation & Setup | Complete |
| Phase 2 | Core Chat & Features | Complete (v2.1.4) |
| Phase 3 | Agent Framework & Context | Complete (v2.10) |
| Phase 3.5 | Parthenon + Agent Reorganization | Complete (v2.11) |
| Phase 4 | Actions Framework + Integrity | Complete (v2.12) |
| Phase 4.5 | Agent Runner & Quick Launch | Complete (v2.13) |
| Phase 4.6 | Agent Runner Enhancements | Complete (v2.14) |
| Phase 4.7 | Model Override & Tracking | Complete (v2.15) |
| Phase 4.8 | Agent Library UI Improvements | Complete (v2.16) |
| **Phase 4.9** | **MindStudio Integration** | **Complete (v2.17)** |
| Phase 5 | Daily Briefing & Workflows | Planned |
| Phase 6 | Polish, Scale & Production | Planned |

---

## File Changes in v2.17

### New Files

| File | Description |
|------|-------------|
| `server/services/mindstudioService.js` | MindStudio API client service |

### Modified Files

| File | Changes |
|------|---------|
| `public/agents.html` | Resizable sidebar, MindStudio form fields, panel styling |
| `public/agent-runner.html` | Embed view with signed URL support |
| `server/index.js` | CSP updates for MindStudio domains |
| `server/routes/agents.js` | MindStudio agent validation, embed-url endpoint |
| `server/routes/health.js` | MindStudio service health check |
| `server/routes/actions.js` | Fixed ESM uuid import |
| `server/routes/parthenon.js` | Fixed ESM uuid import |
| `server/services/agentService.js` | MindStudio execution routing |

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
| **v2.17** | **Dec 27, 2024** | **MindStudio integration, signed embed URLs, resizable sidebar** |
| v2.16 | Dec 26, 2024 | Agent Library UI improvements, filter reorganization |
| v2.15 | Dec 25, 2024 | Model override dropdown, conversation tracking |
| v2.14 | Dec 25, 2024 | Auto-start execution, LLM model resolution |
| v2.13 | Dec 25, 2024 | Agent Runner page, Quick Launch dropdown |
| v2.12 | Dec 24, 2024 | Integrity system fixes, Thought Leadership action |
| v2.11 | Dec 24, 2024 | Parthenon model, Agent suites, Actions framework |
| v2.10 | Dec 23, 2024 | Resizable preview, JSON editor fixes |

---

*"Technology should augment human brilliance—not replace it."*

**Synergi AI** | Insight 360 Blueprint v2.17 | December 27, 2024
