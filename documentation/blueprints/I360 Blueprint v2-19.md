# Insight 360 Blueprint v2.19

**Version:** 2.19
**Date:** December 28, 2024
**Status:** Phase 6 | Daily Briefing & Workflows

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.19

### Daily Briefing System (Phase 6)
- **Multi-Agent Briefings** — Configure multiple agents to generate different sections of your daily briefing
- **Scheduled Generation** — Automatic briefing generation at your chosen time using node-cron
- **Streaming Progress** — Real-time SSE updates during briefing generation
- **Briefing History** — Browse and review past briefings with pagination

### Briefing Configuration
- **Section Management** — Add, edit, reorder, and delete briefing sections
- **Agent Assignment** — Assign any active agent to generate a section
- **Custom Prompts** — Override default prompts per section
- **Schedule Settings** — Set time, timezone, and enable/disable automation

### Briefing UI
- **Three-Tab Interface** — Today's Briefing, History, and Configuration
- **Collapsible Sections** — Expand/collapse briefing sections for easy reading
- **Progress Indicators** — Live progress bar during generation
- **Status Tracking** — See completion status (complete, partial, failed)

### Backend Services
- **Briefing Service** — Orchestrates multi-agent execution sequentially
- **Scheduler Service** — Node-cron integration with timezone support
- **Briefing Routes** — Full CRUD API + streaming generation endpoint

### Navigation Updates
- **Briefing Nav Item** — Added to sidebar navigation on all pages

---

## Daily Briefing Architecture

### Briefing Generation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      BRIEFING GENERATION                             │
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │  Section 1   │───▶│  Section 2   │───▶│  Section N   │          │
│  │ (Agent A)    │    │ (Agent B)    │    │ (Agent X)    │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│         │                   │                   │                   │
│         ▼                   ▼                   ▼                   │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │              Assembled Briefing (JSONB)                   │      │
│  │  {                                                        │      │
│  │    "sections": [                                          │      │
│  │      { "name": "...", "content": "...", "tokens": N },   │      │
│  │      ...                                                  │      │
│  │    ],                                                     │      │
│  │    "metadata": { "generation_time_ms": N }               │      │
│  │  }                                                        │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

### Scheduler Architecture

```
┌─────────────────┐    ┌─────────────────────────────────────┐
│  Server Start   │───▶│  schedulerService.initializeScheduler()  │
└─────────────────┘    └────────────────┬────────────────────┘
                                        │
                                        ▼
                       ┌─────────────────────────────────────┐
                       │  Load enabled briefing_configs      │
                       │  from database                      │
                       └────────────────┬────────────────────┘
                                        │
                       ┌────────────────┴────────────────┐
                       ▼                                 ▼
              ┌─────────────────┐             ┌─────────────────┐
              │ User A Schedule │             │ User B Schedule │
              │ 06:00 EST       │             │ 07:30 PST       │
              │ (cron job)      │             │ (cron job)      │
              └────────┬────────┘             └────────┬────────┘
                       │                               │
                       ▼                               ▼
              ┌─────────────────────────────────────────────────┐
              │         briefingService.generateBriefing()      │
              └─────────────────────────────────────────────────┘
```

---

## Database Schema

### New Tables

#### briefing_configs
User configuration for daily briefings.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner reference |
| `is_enabled` | BOOLEAN | Schedule enabled |
| `schedule_time` | TIME | Daily run time (default: 06:00) |
| `timezone` | TEXT | User timezone |
| `last_run_at` | TIMESTAMP | Last execution time |
| `last_run_status` | TEXT | success/partial/failed |
| `next_run_at` | TIMESTAMP | Next scheduled run |

#### briefing_sections
Configures which agents generate which sections.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `config_id` | UUID | Reference to briefing_configs |
| `name` | TEXT | Section display name |
| `slug` | TEXT | URL-safe identifier |
| `description` | TEXT | Section description |
| `icon` | TEXT | Lucide icon name |
| `agent_id` | UUID | Agent that generates this section |
| `prompt_template` | TEXT | Custom prompt override |
| `context_assets` | UUID[] | Additional context to inject |
| `max_tokens` | INTEGER | Token limit (default: 2000) |
| `sort_order` | INTEGER | Display order |
| `is_enabled` | BOOLEAN | Section active |

### Extended: briefings Table

| Column | Type | Description |
|--------|------|-------------|
| `status` | TEXT | pending/generating/completed/failed |
| `generation_started_at` | TIMESTAMP | When generation began |
| `generation_completed_at` | TIMESTAMP | When generation finished |
| `total_tokens_used` | INTEGER | Total tokens across all sections |
| `sections_generated` | INTEGER | Number of successful sections |
| `error_message` | TEXT | Error details if failed |

---

## API Endpoints

### Briefing Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/briefing/latest` | Get most recent briefing |
| GET | `/api/briefing/today` | Get today's briefing |
| GET | `/api/briefing/history` | Paginated briefing history |
| GET | `/api/briefing/:id` | Get specific briefing |
| POST | `/api/briefing/generate` | Trigger manual generation |
| GET | `/api/briefing/generate/stream` | SSE streaming generation |

### Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/briefing/config` | Get briefing config with sections |
| PUT | `/api/briefing/config` | Update schedule settings |
| GET | `/api/briefing/scheduler/status` | Scheduler health status |

### Sections

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/briefing/sections` | List all sections |
| POST | `/api/briefing/sections` | Add new section |
| PUT | `/api/briefing/sections/:id` | Update section |
| DELETE | `/api/briefing/sections/:id` | Delete section |
| POST | `/api/briefing/sections/reorder` | Reorder sections |
| GET | `/api/briefing/agents` | Get available agents |

---

## New Files

### Database
| File | Description |
|------|-------------|
| `db/phase6-briefing-schema.sql` | Briefing tables, indexes, RLS policies, views |

### Backend
| File | Description |
|------|-------------|
| `server/services/briefingService.js` | Multi-agent briefing orchestration |
| `server/services/schedulerService.js` | Node-cron scheduler management |
| `server/routes/briefing.js` | Briefing API routes |

### Frontend
| File | Description |
|------|-------------|
| `public/briefing.html` | Full briefing dashboard (replaces placeholder) |

---

## Modified Files

| File | Changes |
|------|---------|
| `server/index.js` | Briefing routes registration, scheduler initialization, /briefing page route |
| `public/js/navigation.js` | Added Briefing nav item |
| `package.json` | Added node-cron dependency |

---

## Dependencies Added

```json
{
  "node-cron": "^3.0.3"
}
```

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
| Phase 4.9 | MindStudio Integration | Complete (v2.17) |
| Phase 5 | Skills Framework | Complete (v2.18) |
| **Phase 6** | **Daily Briefing & Workflows** | **Complete (v2.19)** |
| Phase 7 | Polish, Scale & Production | Planned |

---

## Next Steps: Phase 7

### Polish, Scale & Production

| Step | Task | Priority |
|------|------|----------|
| 7.1 | Email/Slack delivery for briefings | Medium |
| 7.2 | Skill marketplace/sharing | Medium |
| 7.3 | Performance optimization & caching | Medium |
| 7.4 | User authentication & multi-tenancy | High |
| 7.5 | Production deployment guide | High |
| 7.6 | API documentation (OpenAPI) | Medium |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| **v2.19** | **Dec 28, 2024** | **Daily Briefing system, scheduled generation, multi-agent orchestration** |
| v2.18 | Dec 28, 2024 | Skills framework, Skill Creator wizard, SKILL.md import/export |
| v2.17 | Dec 27, 2024 | MindStudio integration, signed embed URLs, resizable sidebar |
| v2.16 | Dec 26, 2024 | Agent Library UI improvements, filter reorganization |
| v2.15 | Dec 25, 2024 | Model override dropdown, conversation tracking |
| v2.14 | Dec 25, 2024 | Auto-start execution, LLM model resolution |
| v2.13 | Dec 25, 2024 | Agent Runner page, Quick Launch dropdown |
| v2.12 | Dec 24, 2024 | Integrity system fixes, Thought Leadership action |
| v2.11 | Dec 24, 2024 | Parthenon model, Agent suites, Actions framework |
| v2.10 | Dec 23, 2024 | Resizable preview, JSON editor fixes |

---

*"Technology should augment human brilliance—not replace it."*

**Synergi AI** | Insight 360 Blueprint v2.19 | December 28, 2024
