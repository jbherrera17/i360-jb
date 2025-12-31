# Insight 360 Blueprint v2.16

**Version:** 2.16
**Date:** December 26, 2024
**Status:** Phase 4.8 | Agent Library UI Improvements

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.16

- **Reorganized Agent Library Filters** — Improved filter order and functionality
  - New filter order: Suite → Status → Category → Platform
  - Added Status filter (Active/Inactive) using `is_active` column
  - Fixed Category dropdown displaying "undefined" (now uses `display_name`)
  - Fixed Platform filter to use correct `type` column
- **Improved Edit Agent Form** — Better field organization
  - Suite and Category fields moved above Description
  - Suite and Category are now required fields
  - Removed non-existent fields (tags, department)
- **Database Schema Alignment** — Form fields now match actual database columns
  - Removed references to non-existent `source_type`, `department`, `status`, `tags` columns
  - Platform uses `type` column (values: `custom`, `mindstudio`, `llm`)
  - Status uses `is_active` boolean column
- **Theme Sync Fix** — All pages now use consistent `insight360-theme` localStorage key

---

## Agent Library Filters

### Filter Order

The sidebar filters are now organized in a logical hierarchy:

```
┌─────────────────────┐
│ Filters             │
├─────────────────────┤
│ Suite               │
│ ┌─────────────────┐ │
│ │ All Suites    ▼ │ │
│ │ • Align 120     │ │
│ │ • Strategy 120  │ │
│ │ • Execute 120   │ │
│ └─────────────────┘ │
├─────────────────────┤
│ Status              │
│ ┌─────────────────┐ │
│ │ All Status    ▼ │ │
│ │ • Active        │ │
│ │ • Inactive      │ │
│ └─────────────────┘ │
├─────────────────────┤
│ Category            │
│ ┌─────────────────┐ │
│ │ All Categories▼ │ │
│ │ (from database) │ │
│ └─────────────────┘ │
├─────────────────────┤
│ Platform            │
│ ┌─────────────────┐ │
│ │ All Platforms ▼ │ │
│ │ • Custom(Native)│ │
│ │ • MindStudio    │ │
│ │ • LLM Direct    │ │
│ └─────────────────┘ │
└─────────────────────┘
```

### Filter API Parameters

| Filter | Query Parameter | Column | Values |
|--------|----------------|--------|--------|
| Suite | `suite` | `suite` | `align`, `strategy`, `execute` |
| Status | `active` | `is_active` | `true`, `false` |
| Category | `category` | `category` | Category keys from `agent_categories` |
| Platform | `platform_type` | `type` | `custom`, `mindstudio`, `llm` |

---

## Edit Agent Form

### Field Layout

The edit agent modal now has an improved field order:

1. **Name** (required) + **Icon**
2. **Suite** (required) + **Category** (required)
3. **Description**
4. **Platform** (required) + **Status**
5. Platform-specific fields (Native config or Embed config)

### Required Fields

| Field | Required | Default |
|-------|----------|---------|
| Name | Yes | — |
| Suite | Yes | — |
| Category | Yes | — |
| Platform | Yes | `custom` |
| Status | No | `draft` (inactive) |
| Description | No | — |

### Platform Types

| Value | Display Name | Configuration |
|-------|-------------|---------------|
| `custom` | Custom (Native) | System prompt, Model, Temperature |
| `mindstudio` | MindStudio | External ID, Embed URL |
| `llm` | LLM Direct | System prompt, Model, Temperature |

---

## Database Schema Reference

### Agents Table Columns (Used)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Agent name |
| `description` | TEXT | Agent description |
| `icon` | TEXT | Emoji or icon identifier |
| `type` | TEXT | Platform type: `custom`, `mindstudio`, `llm` |
| `suite` | TEXT | Suite: `align`, `strategy`, `execute` |
| `category` | TEXT | Category key reference |
| `is_active` | BOOLEAN | Active status |
| `is_public` | BOOLEAN | Public visibility |
| `llm_provider` | TEXT | `anthropic` or `openai` |
| `llm_model` | TEXT | Model identifier |
| `system_prompt` | TEXT | System prompt for native agents |
| `temperature` | NUMERIC | Model temperature (0-2) |
| `max_tokens` | INTEGER | Max response tokens |
| `config` | JSONB | Additional configuration |
| `mindstudio_workflow_id` | TEXT | External workflow ID |

### Columns NOT in Schema

The following columns do not exist and have been removed from the UI:
- `source_type` (use `type` instead)
- `department` (removed)
- `status` (use `is_active` boolean instead)
- `tags` (removed)
- `embed_config` (use `config` JSONB instead)
- `external_id` (use `mindstudio_workflow_id` instead)

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
| Phase 4.7 | Model Override & Tracking | ✅ Complete (v2.15) |
| **Phase 4.8** | **Agent Library UI Improvements** | **✅ Complete (v2.16)** |
| Phase 5 | Daily Briefing & Workflows | 📋 Planned |
| Phase 6 | Polish, Scale & Production | 📋 Planned |

---

## File Changes in v2.16

### Modified Files

| File | Changes |
|------|---------|
| `public/agents.html` | Reorganized filters, updated form layout, removed unused code |
| `public/agent-runner.html` | Fixed theme localStorage key |
| `server/routes/agents.js` | Fixed filter parameters to match database schema |

### Removed Code

- `fetchDepartments()` function
- `populateDepartmentSelects()` function
- `renderTags()` function
- `departments` state variable
- `tags` state variable
- Tag input HTML and event listeners
- Department filter and form fields

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
| **v2.16** | **Dec 26, 2024** | **Agent Library UI improvements, filter reorganization, form field updates** |
| v2.15 | Dec 25, 2024 | Model override dropdown, conversation tracking, session IDs |
| v2.14 | Dec 25, 2024 | Auto-start execution, LLM model resolution, complete model sync |
| v2.13 | Dec 25, 2024 | Agent Runner page, Quick Launch dropdown, Recent Agents widget |
| v2.12 | Dec 24, 2024 | Integrity system fixes, Thought Leadership action |
| v2.11 | Dec 24, 2024 | Parthenon model, Agent suites, Actions framework |
| v2.10 | Dec 23, 2024 | Resizable preview, JSON editor fixes |

---

*"Technology should augment human brilliance—not replace it."*

**Synergi AI** | Insight 360 Blueprint v2.16 | December 26, 2024
