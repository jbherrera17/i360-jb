# Insight 360 Blueprint v2.18

**Version:** 2.18
**Date:** December 28, 2024
**Status:** Phase 5 | Skills Framework

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.18

### Skills Framework (Phase 5)
- **Reusable AI Skills** — Define portable instruction sets that can be attached to any agent
- **SKILL.md Format** — Import/export skills using a standardized markdown format with YAML frontmatter
- **Context Requirements** — Skills declare required and optional context types for validation
- **Skill-Powered Agents** — Agents can inherit behavior from skills with automatic version tracking

### Skills Library Page
- **Skills Grid** — Visual library of all skills with filtering by suite (Align/Strategy/Execute)
- **Category Filters** — Filter by content, research, analysis, workflow, or custom categories
- **Search** — Full-text search across skill names and descriptions
- **Import/Export** — Import skills from SKILL.md files, export for sharing

### Skill Creator Wizard
- **7-Step Wizard** — Guided skill creation with real-time preview
  1. **Identity** — Name, description, icon, color
  2. **Classification** — Suite, category, tags
  3. **Context** — Required/optional context types, token budget
  4. **Instructions** — Main skill instructions (markdown)
  5. **Output** — Format description, trigger phrases, conversation starters
  6. **Examples** — Input/output pairs for few-shot learning
  7. **Review** — Preview card and SKILL.md markdown before saving
- **Draft Saving** — Save work-in-progress skills as drafts
- **Edit Mode** — Return to edit existing skills

### Backend Services
- **Skills API** — Full CRUD operations plus test execution and import/export
- **Skill Service** — Utilities for prompt building, context validation, execution recording
- **Agent Integration** — Skill-aware execution in agentService

### Navigation Updates
- **Skills Nav Item** — Added to sidebar navigation on all pages
- **Shared Navigation Component** — Created `navigation.js` for consistent nav across pages

---

## Skills Architecture

### Skill vs Agent Relationship

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SKILLS (Reusable)                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ Article Writer  │  │ Research Analyst│  │ Code Reviewer   │     │
│  │ - Instructions  │  │ - Instructions  │  │ - Instructions  │     │
│  │ - Output Format │  │ - Output Format │  │ - Output Format │     │
│  │ - Examples      │  │ - Examples      │  │ - Examples      │     │
│  │ - Required:     │  │ - Required:     │  │ - Required:     │     │
│  │   voice_dna     │  │   icp           │  │   guidelines    │     │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │
└───────────┼─────────────────────┼─────────────────────┼─────────────┘
            │                     │                     │
            │ Attached to         │ Attached to         │ Attached to
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AGENTS (Configured)                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ Marketing Agent │  │ Strategy Agent  │  │ Dev Agent       │     │
│  │ + Skill: Writer │  │ + Skill: Analyst│  │ + Skill: Review │     │
│  │ + Context Maps  │  │ + Context Maps  │  │ + Context Maps  │     │
│  │ + Model Config  │  │ + Model Config  │  │ + Model Config  │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

### Workflow Comparison

#### Standard Agent (No Skill)
```
User Message → Agent → System Prompt → Context Injection → LLM → Response
```

#### Skill-Powered Agent
```
User Message → Agent → Skill Instructions → Context Validation → Context Injection → LLM → Response
                         ↓
                   Output Format
                   + Examples
```

---

## Database Schema

### New Tables

#### skills
Core skill definitions with instructions and metadata.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner reference |
| `name` | TEXT | URL-safe slug |
| `display_name` | TEXT | Human-readable name |
| `description` | TEXT | Skill description |
| `icon` | TEXT | Lucide icon name |
| `color` | TEXT | Hex color code |
| `category` | TEXT | content, research, analysis, workflow, custom |
| `suite` | TEXT | align, strategy, execute |
| `tags` | TEXT[] | Searchable tags |
| `instructions` | TEXT | Main skill instructions (markdown) |
| `output_format` | TEXT | Expected output structure |
| `required_context_types` | TEXT[] | Must-have context types |
| `optional_context_types` | TEXT[] | Nice-to-have context types |
| `context_token_budget` | INTEGER | Max tokens for context (default: 8000) |
| `trigger_phrases` | TEXT[] | Auto-suggest triggers |
| `conversation_starters` | TEXT[] | UI prompt suggestions |
| `examples` | JSONB | Array of {input, output} pairs |
| `version` | TEXT | Semantic version |
| `status` | TEXT | draft, active, archived |
| `usage_count` | INTEGER | Execution count |

#### skill_versions
Version history for skills.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `skill_id` | UUID | Parent skill reference |
| `version_number` | INTEGER | Sequential version |
| `version_label` | TEXT | Semantic version label |
| `instructions` | TEXT | Snapshot of instructions |
| `change_summary` | TEXT | What changed |

#### skill_executions
Track skill usage across agents.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `skill_id` | UUID | Skill reference |
| `skill_version` | TEXT | Version used |
| `agent_id` | UUID | Agent that executed |
| `input_message` | TEXT | User input |
| `output_content` | TEXT | LLM response |
| `context_assets_used` | UUID[] | Assets injected |
| `model_used` | TEXT | LLM model |
| `duration_ms` | INTEGER | Execution time |
| `status` | TEXT | completed, failed |

### Agents Table Updates

| Column | Type | Description |
|--------|------|-------------|
| `skill_id` | UUID | Reference to attached skill |
| `skill_version` | TEXT | Pinned skill version |
| `auto_update_skill` | BOOLEAN | Auto-update when skill changes |

---

## API Endpoints

### Skills CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/skills` | List skills with filters |
| GET | `/api/skills/:id` | Get skill by ID |
| POST | `/api/skills` | Create new skill |
| PUT | `/api/skills/:id` | Update skill |
| DELETE | `/api/skills/:id` | Delete skill |
| PATCH | `/api/skills/:id/status` | Update skill status |

### Skills Utilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/skills/categories` | List skill categories |
| POST | `/api/skills/:id/test` | Test skill execution |
| GET | `/api/skills/:id/export` | Export as SKILL.md |
| POST | `/api/skills/import` | Import from SKILL.md |
| GET | `/api/skills/:id/versions` | Get version history |
| GET | `/api/skills/:id/files` | Get skill files |

---

## SKILL.md Format

Skills can be imported/exported using a standardized markdown format:

```markdown
---
name: article-generator
description: "Creates thought leadership articles"
version: 1.0.0
category: content
suite: execute
required_context: ["voice_dna"]
optional_context: ["icp", "positioning"]
context_token_budget: 8000
---

# Article Generator

Creates engaging thought leadership articles with consistent voice.

## Instructions

You are an expert content writer. Create engaging articles that:
1. Hook readers with a compelling opening
2. Deliver actionable insights
3. Use the provided voice DNA for consistent tone
4. End with a clear call to action

## Output Format

# [Title]

[Hook paragraph]

## Key Points
...

## Conclusion
...

## Trigger Phrases

- "write an article"
- "create content"

## Conversation Starters

- Write an article about AI in marketing
- Create a thought leadership piece on innovation

## Examples

### Example 1

**Input:** Write about the future of work

**Output:**
# The Future of Work: Embracing Change
...
```

---

## New Files

### Database
| File | Description |
|------|-------------|
| `db/phase5-skills-schema.sql` | Skills tables, indexes, RLS policies, views |

### Backend
| File | Description |
|------|-------------|
| `server/routes/skills.js` | Skills API routes (700+ lines) |
| `server/services/skillService.js` | Skill utilities and helpers |

### Frontend
| File | Description |
|------|-------------|
| `public/skills.html` | Skills Library page |
| `public/skill-creator.html` | 7-step Skill Creator wizard |
| `public/js/navigation.js` | Shared navigation component |

### Documentation
| File | Description |
|------|-------------|
| `documentation/skills/SKILL-WORKFLOWS.md` | Workflow diagrams |
| `documentation/skills/IMPLEMENTATION-PLAN.md` | Implementation plan |

---

## Modified Files

| File | Changes |
|------|---------|
| `server/index.js` | Skills routes registration, /skills page route |
| `public/index.html` | Added Skills nav item |
| `public/chat.html` | Added Skills nav item |
| `public/context.html` | Added Skills nav item |
| `public/actions.html` | Added Skills nav item |
| `public/parthenon.html` | Added Skills nav item |
| `public/integrity.html` | Added Skills nav item |
| `public/briefing.html` | Added Skills nav item + missing nav items |

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
| **Phase 5** | **Skills Framework** | **Complete (v2.18)** |
| Phase 6 | Daily Briefing & Workflows | Planned |
| Phase 7 | Polish, Scale & Production | Planned |

---

## Next Steps: Phase 6

### Daily Briefing & Workflows

| Step | Task | Priority |
|------|------|----------|
| 6.1 | Daily Briefing agent with skill attachment | High |
| 6.2 | Scheduled briefing generation | High |
| 6.3 | Workflow automation triggers | Medium |
| 6.4 | Skill marketplace/sharing | Medium |
| 6.5 | Email/Slack delivery integration | Low |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| **v2.18** | **Dec 28, 2024** | **Skills framework, Skill Creator wizard, SKILL.md import/export** |
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

**Synergi AI** | Insight 360 Blueprint v2.18 | December 28, 2024
