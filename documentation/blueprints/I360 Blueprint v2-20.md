# Insight 360 Blueprint v2.20

**Version:** 2.20
**Date:** December 30, 2025
**Status:** Phase 5.1 | Strategy-to-Execution Enhancement

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.20

### Strategy-to-Execution (S2E) Module Enhancement

This release significantly enhances the S2E module with a comprehensive service layer, automated health scoring, governance features, and deep Parthenon integration.

### S2E Service Layer
- **Centralized Business Logic** — Extracted 1,500+ lines of business logic from routes into `s2eService.js`
- **Validation Helpers** — Comprehensive validation for all S2E entities (foundations, themes, perspectives, objectives)
- **Strategy Map Assembly** — Full strategy map with OKR links and progress metrics

### Automated Health Scoring
- **Alignment Score** — Measures % of OKRs linked to strategic objectives (0-100%)
- **Execution Score** — Weighted average of linked OKR progress with at-risk penalties
- **Learning Score** — Progress of Learning & Growth perspective OKRs
- **Overall Score** — Weighted combination (40% alignment, 40% execution, 20% learning)

### Health Analysis Engine
Automatic detection of strategic issues:
- **DRIFT** — OKR progress < 30% when > 50% through period
- **OVERLOAD** — Objective has > 5 linked OKRs
- **CONFLICT** — Multiple OKRs with competing metrics
- **GAP** — Perspective has 0 linked OKRs

### Scheduled Health Checks
- **Weekly/Monthly Scheduling** — Configurable automated health check generation
- **Schedule Configuration** — Day of week/month, timezone support
- **Manual Trigger** — On-demand health check generation

### Governance Dashboard
- **New Page:** `strategy-governance.html`
- **Score Cards** — Alignment, Execution, Learning, and Overall scores
- **Trend Visualization** — Historical score chart
- **Observations Panel** — Strategic issues with severity badges
- **Recommendations Tracker** — Actionable items with completion status
- **Health Check History** — Browse past health checks

### Parthenon Bi-Directional Integration
- **Strategic Links on OKRs** — View and manage strategy links from Parthenon
- **Link Management UI** — Add, edit, delete links from OKR detail modal
- **Alignment Banner** — OKR tab shows alignment summary stats
- **Strategy Badges** — Each OKR card shows link status

### Briefing Integration
- **S2E Summary Endpoint** — Generate strategy summary for daily briefings
- **Briefing Metrics** — Condensed S2E metrics for LLM context

---

## S2E Architecture

### Health Scoring Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      HEALTH SCORING ENGINE                          │
│                                                                     │
│  ┌──────────────────┐                                              │
│  │  Strategic       │                                              │
│  │  Foundation      │                                              │
│  └────────┬─────────┘                                              │
│           │                                                        │
│           ▼                                                        │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    LINKED OKRs                              │   │
│  │  (via okr_strategic_links table)                           │   │
│  └────────────────────────────────────────────────────────────┘   │
│           │                                                        │
│           ├──────────────────┬──────────────────┐                 │
│           ▼                  ▼                  ▼                 │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐      │
│  │ Alignment      │  │ Execution      │  │ Learning       │      │
│  │ Score (40%)    │  │ Score (40%)    │  │ Score (20%)    │      │
│  │                │  │                │  │                │      │
│  │ % linked OKRs  │  │ Avg progress   │  │ L&G progress   │      │
│  │ × quality      │  │ - penalties    │  │                │      │
│  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘      │
│           │                   │                   │               │
│           └───────────────────┼───────────────────┘               │
│                               ▼                                   │
│                    ┌────────────────────┐                         │
│                    │  Overall Score     │                         │
│                    │  (Weighted Avg)    │                         │
│                    └────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
```

### Health Analysis Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      HEALTH ANALYSIS ENGINE                         │
│                                                                     │
│  Foundation Data                                                    │
│       │                                                            │
│       ├──▶ Check Each Objective                                    │
│       │         │                                                  │
│       │         ├──▶ Link count > 5? ──▶ OVERLOAD observation     │
│       │         ├──▶ No links? ────────▶ GAP observation          │
│       │         └──▶ At-risk OKRs? ────▶ DRIFT observation        │
│       │                                                            │
│       ├──▶ Check Each Perspective                                  │
│       │         │                                                  │
│       │         └──▶ Zero linked OKRs? ▶ GAP observation          │
│       │                                                            │
│       └──▶ Check For Conflicts                                     │
│                 │                                                  │
│                 └──▶ Competing OKRs? ──▶ CONFLICT observation     │
│                                                                    │
│       ┌────────────────────────────────────────────────────┐      │
│       │              OBSERVATIONS                           │      │
│       │  [{ type, description, severity, affected_items }] │      │
│       └──────────────────────┬─────────────────────────────┘      │
│                              │                                     │
│                              ▼                                     │
│       ┌────────────────────────────────────────────────────┐      │
│       │           RECOMMENDATIONS                           │      │
│       │  Generated based on observation types               │      │
│       └────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Existing Tables (Enhanced)

#### okr_strategic_links
Links between Parthenon OKRs and S2E Strategic Objectives.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `okr_id` | UUID | Reference to okrs table |
| `objective_id` | UUID | Reference to bsc_objectives |
| `link_type` | TEXT | supports/drives/enables/measures |
| `is_primary` | BOOLEAN | Primary strategic link for OKR |
| `alignment_score` | DECIMAL | Link quality score (0-1) |
| `notes` | TEXT | Link rationale/notes |
| `created_at` | TIMESTAMP | Creation timestamp |

### New Tables

#### s2e_schedule_config
User configuration for automated health check generation.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner reference |
| `weekly_enabled` | BOOLEAN | Enable weekly checks |
| `weekly_day` | INTEGER | Day of week (0=Sunday, 1=Monday, etc.) |
| `monthly_enabled` | BOOLEAN | Enable monthly checks |
| `monthly_day` | INTEGER | Day of month (1-28) |
| `timezone` | TEXT | IANA timezone string |
| `last_weekly_run` | TIMESTAMP | Last weekly check timestamp |
| `last_monthly_run` | TIMESTAMP | Last monthly check timestamp |
| `next_scheduled_run` | TIMESTAMP | Next scheduled check |

---

## API Endpoints

### S2E Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/s2e/strategy-map` | Full strategy map with OKR links |
| GET | `/api/s2e/alignment-report` | Alignment metrics and coverage |
| GET | `/api/s2e/health-scores/:foundationId` | Calculate health scores |
| GET | `/api/s2e/health-analysis/:foundationId` | Get observations and recommendations |

### Health Check Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/s2e/health-checks/latest` | Get most recent health check |
| GET | `/api/s2e/health-checks/trend` | Historical scores for trending |
| POST | `/api/s2e/health-checks/generate` | Auto-generate health check |
| GET | `/api/s2e/health-checks/schedule` | Get schedule configuration |
| PUT | `/api/s2e/health-checks/schedule` | Update schedule configuration |
| POST | `/api/s2e/health-checks/:id/recommendations/:index/complete` | Mark recommendation done |

### Cause-Effect Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/s2e/objectives/:id/causes` | Update cause objectives |
| PUT | `/api/s2e/objectives/:id/effects` | Update effect objectives |

### Briefing Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/s2e/briefing-summary` | Generate strategy summary for briefing |
| GET | `/api/s2e/briefing-metrics` | Condensed S2E metrics for context |

### Parthenon Strategic Link Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/parthenon/okrs/:id/strategic-links` | Get links for OKR |
| POST | `/api/parthenon/okrs/:id/strategic-links` | Create strategic link |
| PUT | `/api/parthenon/okrs/:okrId/strategic-links/:linkId` | Update link |
| DELETE | `/api/parthenon/okrs/:okrId/strategic-links/:linkId` | Delete link |
| GET | `/api/parthenon/alignment-summary` | OKR alignment stats |
| GET | `/api/parthenon/objectives-for-linking` | Objectives dropdown data |

---

## Services

### s2eService.js (New)

Core business logic for S2E module.

**Validation Helpers:**
- `validateFoundation(data)`
- `validateTheme(data)`
- `validatePerspective(data)`
- `validateObjective(data)`
- `validateOKRLink(data)`
- `validateIndicator(data)`
- `validateHealthCheck(data)`

**Core Functions:**
- `getCurrentFoundationWithHierarchy(userId)` — Fetch foundation with full hierarchy
- `setCurrentFoundation(userId, foundationId)` — Set active foundation
- `initializeDefaultPerspectives(userId, foundationId)` — Create 4 BSC perspectives
- `buildStrategyMap(userId)` — Assemble strategy map with metrics
- `generateAlignmentReport(userId)` — Calculate alignment coverage

**Scoring Functions:**
- `calculateAlignmentScore(foundationId)` — OKR linkage score
- `calculateExecutionScore(foundationId)` — OKR progress score
- `calculateLearningScore(foundationId)` — L&G perspective score
- `calculateHealthScores(foundationId)` — All scores combined

**Health Analysis:**
- `analyzeStrategyHealth(foundationId)` — Detect issues
- `generateRecommendations(observations)` — Action items
- `generateHealthCheck(userId, foundationId, checkType)` — Create health check

**Cause-Effect:**
- `updateObjectiveCauses(objectiveId, causeIds)`
- `updateObjectiveEffects(objectiveId, effectIds)`
- `getObjectiveCausalChain(objectiveId)`

**Briefing Integration:**
- `generateBriefingSummary(userId)` — Full strategy summary text
- `getBriefingMetrics(userId)` — Condensed metrics object

### schedulerService.js (Enhanced)

Added S2E health check scheduling.

**New Functions:**
- `initializeS2EScheduler()` — Load and schedule all health checks
- `scheduleS2EHealthChecks(userId, config, timezone)` — Schedule weekly/monthly
- `cancelS2ESchedule(userId)` — Cancel scheduled checks
- `triggerManualHealthCheck(userId, checkType)` — Manual trigger
- `getS2ESchedulerStatus()` — Health check scheduler status

---

## Frontend Pages

### strategy-governance.html (New)

Governance dashboard for strategy health monitoring.

**Features:**
- Score cards with visual indicators
- Trend chart (bar visualization)
- Observations list with severity badges
- Recommendations tracker with completion
- Health check history table
- Schedule configuration panel

### parthenon.html (Enhanced)

OKR management with strategic linking.

**New Features:**
- Strategy Alignment stat card (5th card)
- Alignment banner in OKRs tab
- Strategy link badges on OKR cards
- Strategy Links panel in OKR edit modal
- Add/edit/delete strategic links
- Primary link toggle

### navigation.js (Enhanced)

Updated sidebar navigation.

**New Items:**
- Governance link: `/strategy-governance.html` with `shield-check` icon

---

## Health Scoring Thresholds

| Threshold | Value | Description |
|-----------|-------|-------------|
| `HEALTHY` | ≥ 70% | Score is in good range |
| `WARNING` | 50-69% | Score needs attention |
| `CRITICAL` | < 50% | Score requires immediate action |

### Scoring Weights

| Score Type | Weight | Calculation |
|------------|--------|-------------|
| Alignment | 40% | (linked OKRs / total OKRs) × avg link quality |
| Execution | 40% | avg progress of linked OKRs - at-risk penalty |
| Learning | 20% | avg progress of L&G perspective OKRs |

---

## Files Modified

### New Files
- `server/services/s2eService.js` — 1,500+ lines of business logic
- `public/strategy-governance.html` — Governance dashboard
- `db/phase5.1-s2e-schedule-schema.sql` — Schedule config table

### Modified Files
- `server/routes/s2e.js` — Version 2.1.0, refactored + new endpoints
- `server/routes/parthenon.js` — Strategic link endpoints
- `server/services/schedulerService.js` — S2E health check scheduling
- `public/parthenon.html` — Alignment UI, strategy links panel
- `public/js/navigation.js` — Added Governance nav item

---

## Implementation Notes

### Balanced Scorecard Perspectives

The S2E module implements the classic BSC four-perspective model:

1. **Financial** — "How must we perform financially to sustain the mission?"
2. **Customer & Stakeholder** — "Who must trust us, and why?"
3. **Internal Processes** — "What must we excel at operationally?"
4. **Learning & Growth** — "How do we continuously improve and create value?"

### Strategic Linking Best Practices

- Each OKR should link to at least one strategic objective
- Mark one link as "Primary" for focus
- Use link types to indicate relationship:
  - **Supports** — OKR contributes to objective
  - **Drives** — OKR is primary driver
  - **Enables** — OKR provides capability
  - **Measures** — OKR tracks objective metric

### Health Check Cadence

Recommended scheduling:
- **Weekly** — Quick pulse check on execution
- **Monthly** — Deep analysis of alignment and trends
- **Ad-hoc** — Before major planning sessions

---

## Next Steps

- **Phase 5.2** — Strategy visualization with cause-effect arrows
- **Phase 5.3** — AI-powered strategy recommendations
- **Phase 5.4** — Strategy change impact analysis
