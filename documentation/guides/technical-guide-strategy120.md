# Strategy 120 Technical Guide

## Overview

Strategy 120 is the AI-powered strategic planning module within Insight 360. It implements the OKR-BSC (Objectives & Key Results - Balanced Scorecard) Fusion Model to provide deep strategic alignment between long-term vision (BSC) and agile execution (OKRs).

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    STRATEGY 120 MODULE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Frontend  │  │  API Layer  │  │     Database Layer      │ │
│  │             │  │             │  │                         │ │
│  │ strategy120 │──│ /api/       │──│ phase8-strategy120-     │ │
│  │ .html       │  │ strategy120 │  │ schema.sql              │ │
│  │             │  │             │  │                         │ │
│  │ strategy    │  │ /api/agents │  │ seed-strategy120-       │ │
│  │ .html       │  │             │  │ agents-part1.sql        │ │
│  │ (AI Panel)  │  │             │  │ seed-strategy120-       │ │
│  │             │  │             │  │ agents-part2.sql        │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    35 AI AGENTS                             ││
│  │  Orchestration | Planning | BSC Perspectives | Investment   ││
│  │  Intelligence | Decision Support | Governance               ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### OKR-BSC Cascade Flow

```
                    ┌─────────────────────────┐
                    │      COMPANY VISION     │
                    │      & MISSION          │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │   BALANCED SCORECARD    │
                    │   Strategic Themes      │
                    └───────────┬─────────────┘
                                │
        ┌───────────┬───────────┼───────────┬───────────┐
        ▼           ▼           ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
   │FINANCIAL│ │CUSTOMER │ │INTERNAL │ │LEARNING │
   │   BSC   │ │   BSC   │ │ PROCESS │ │& GROWTH │
   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
        │           │           │           │
        ▼           ▼           ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
   │COMPANY  │ │COMPANY  │ │COMPANY  │ │COMPANY  │
   │  OKRs   │ │  OKRs   │ │  OKRs   │ │  OKRs   │
   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
        │           │           │           │
        ▼           ▼           ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
   │  DEPT   │ │  DEPT   │ │  DEPT   │ │  DEPT   │
   │  OKRs   │ │  OKRs   │ │  OKRs   │ │  OKRs   │
   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
        │           │           │           │
        ▼           ▼           ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
   │INDIVIDUAL│ │INDIVIDUAL│ │INDIVIDUAL│ │INDIVIDUAL│
   │  OKRs   │ │  OKRs   │ │  OKRs   │ │  OKRs   │
   └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

## Database Schema

### Tables (Phase 8)

| Table | Purpose |
|-------|---------|
| `strategy_initiatives` | AI initiative tracking with BSC perspective alignment |
| `business_cases` | Investment ROI models and financial projections |
| `scenario_models` | Best/worst/likely analysis for business cases |
| `decision_log` | Strategic decision documentation with rationale |
| `intelligence_briefs` | Market, competitive, and technology intelligence |
| `okr_cascade_tracking` | BSC→Company→Dept→Individual alignment tracking |
| `bsc_perspective_scores` | Weighted BSC performance scores |
| `strategy_initiative_dependencies` | Initiative dependency mapping |

### Views

| View | Purpose |
|------|---------|
| `strategy_map_cascade_view` | Full BSC→OKR cascade visualization |
| `alignment_score_view` | Cross-level alignment metrics |
| `perspective_performance_view` | BSC scores with OKR progress |
| `initiative_portfolio_view` | Initiative portfolio summary |
| `decision_timeline_view` | Decision log timeline |

### Key Relationships

```sql
-- Cascade tracking links OKRs hierarchically
okr_cascade_tracking
  ├── parent_okr_id → okrs(id)
  ├── child_okr_id → okrs(id)
  ├── cascade_level: 'bsc_to_company' | 'company_to_department' | 'department_to_individual'
  └── perspective_type: 'financial' | 'customer' | 'internal_process' | 'learning_growth'

-- Initiatives link to themes and perspectives
strategy_initiatives
  ├── strategic_theme_id → strategic_themes(id)
  ├── perspective_type: BSC perspective alignment
  └── related_okr_ids: UUID[] array linking to okrs
```

## API Endpoints

### Base URL: `/api/strategy120`

#### Initiatives

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/initiatives` | List all initiatives with filters |
| GET | `/initiatives/:id` | Get initiative with dependencies |
| POST | `/initiatives` | Create new initiative |
| PUT | `/initiatives/:id` | Update initiative |
| DELETE | `/initiatives/:id` | Delete initiative |

#### Business Cases

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/business-cases` | List business cases |
| GET | `/business-cases/:id` | Get case with scenarios |
| POST | `/business-cases` | Create business case |
| PUT | `/business-cases/:id` | Update business case |
| DELETE | `/business-cases/:id` | Delete business case |

#### Scenarios

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/scenarios` | List scenario models |
| POST | `/scenarios` | Create scenario |
| PUT | `/scenarios/:id` | Update scenario |
| DELETE | `/scenarios/:id` | Delete scenario |

#### Decisions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/decisions` | List decisions with filters |
| GET | `/decisions/:id` | Get decision details |
| POST | `/decisions` | Log new decision |
| PUT | `/decisions/:id` | Update decision |
| DELETE | `/decisions/:id` | Delete decision |

#### Intelligence

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/intelligence` | List intelligence briefs |
| GET | `/intelligence/:id` | Get brief details |
| POST | `/intelligence` | Create brief |
| PUT | `/intelligence/:id` | Update brief |
| DELETE | `/intelligence/:id` | Delete brief |

#### Cascade Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cascade` | Get OKR cascade relationships |
| POST | `/cascade` | Create cascade relationship |
| PUT | `/cascade/:id` | Update cascade |
| DELETE | `/cascade/:id` | Delete cascade |

#### Perspective Scores

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/perspective-scores` | Get BSC perspective scores |
| GET | `/perspective-scores/latest` | Get latest scores for all perspectives |
| POST | `/perspective-scores` | Record new score |

#### Views

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/portfolio` | Initiative portfolio view |
| GET | `/decision-timeline` | Decision timeline view |
| GET | `/cascade-map` | Full cascade map view |
| GET | `/alignment-scores` | Alignment scores view |

## AI Agent Architecture

### Agent Categories (35 Total)

#### Orchestration (3 agents)
| ID | Agent | Model | Purpose |
|----|-------|-------|---------|
| 321 | Strategy 120 Orchestrator | Opus | Master coordinator |
| 322 | Strategic Context Assembler | Haiku | Pulls Align 120 outputs |
| 323 | Strategy Document Generator | Sonnet | Creates formatted documents |

#### Planning (4 agents)
| ID | Agent | Model | Purpose |
|----|-------|-------|---------|
| 301 | Strategy Map Designer | Opus | Creates BSC strategy maps |
| 302 | Strategic Theme Synthesizer | Sonnet | Identifies strategic themes |
| 303 | BSC-OKR Cascade Validator | Sonnet | Validates cascade alignment |
| 304 | Leading/Lagging Indicator Classifier | Haiku | Classifies key results |

#### Financial Perspective (4 agents)
| ID | Agent | Model | Purpose |
|----|-------|-------|---------|
| 331 | Revenue OKR Generator | Sonnet | Creates revenue objectives |
| 332 | Profitability Tracker | Sonnet | Monitors margin KRs |
| 333 | Cash Flow Optimizer | Haiku | Aligns liquidity goals |
| 334 | ROI Measurement Agent | Sonnet | Tracks investment returns |

#### Customer Perspective (4 agents)
| ID | Agent | Model | Purpose |
|----|-------|-------|---------|
| 335 | Customer Satisfaction Analyzer | Sonnet | Tracks NPS, CSAT metrics |
| 336 | Retention OKR Generator | Sonnet | Creates loyalty objectives |
| 337 | Market Share Tracker | Sonnet | Monitors competitive positioning |
| 338 | Customer Lifetime Value Agent | Haiku | Optimizes CLV key results |

#### Process Perspective (4 agents)
| ID | Agent | Model | Purpose |
|----|-------|-------|---------|
| 339 | Process Efficiency Analyzer | Sonnet | Identifies bottlenecks |
| 340 | Quality OKR Generator | Sonnet | Creates quality objectives |
| 341 | Cycle Time Optimizer | Haiku | Reduces process duration |
| 342 | Operational Excellence Agent | Sonnet | Benchmarks best practices |

#### Learning & Growth Perspective (4 agents)
| ID | Agent | Model | Purpose |
|----|-------|-------|---------|
| 343 | Skills Gap OKR Analyzer | Sonnet | Maps capability needs |
| 344 | AI Upskilling OKR Generator | Sonnet | Creates AI training objectives |
| 345 | Culture & Engagement Tracker | Haiku | Monitors employee satisfaction |
| 346 | Innovation Capacity Agent | Sonnet | Tracks innovation KRs |

#### Investment Planning (4 agents)
| ID | Agent | Model | Purpose |
|----|-------|-------|---------|
| 305 | Business Case Builder | Sonnet | Creates ROI models |
| 306 | Scenario Modeler | Sonnet | Models scenarios |
| 307 | Resource Planner | Sonnet | Estimates resources |
| 308 | Dependency Mapper | Haiku | Maps dependencies |

#### Research & Intelligence (4 agents)
| ID | Agent | Model | Purpose |
|----|-------|-------|---------|
| 309 | Market Intelligence Scout | Sonnet | Monitors market trends |
| 310 | Technology Radar Analyst | Sonnet | Tracks emerging tech |
| 311 | Regulatory Monitor | Sonnet | Tracks regulations |
| 312 | Best Practice Researcher | Haiku | Identifies best practices |

#### Decision Support (4 agents)
| ID | Agent | Model | Purpose |
|----|-------|-------|---------|
| 313 | Decision Framer | Opus | Structures decisions |
| 314 | Risk-Benefit Analyzer | Sonnet | Analyzes trade-offs |
| 315 | Assumption Tester | Sonnet | Challenges assumptions |
| 316 | Second Opinion Generator | Opus | Provides alternatives |

#### Strategy Governance (4 agents)
| ID | Agent | Model | Purpose |
|----|-------|-------|---------|
| 317 | Strategy Health Monitor | Sonnet | Conducts health checks |
| 318 | Drift Detector | Sonnet | Identifies strategic drift |
| 319 | Quarterly Review Facilitator | Sonnet | Prepares QBR materials |
| 320 | Strategy Communicator | Haiku | Creates communications |

### Agent UUID Pattern

All Strategy 120 agents follow a deterministic UUID pattern:
- Core agents (301-323): `a0000000-0000-0000-0000-0000000003XX`
- Perspective agents (331-346): `a0000000-0000-0000-0000-00000000033X`

### Context Injection

Agents receive context through the `agent_context_mappings` table:

```sql
-- Example: Strategy Map Designer receives BSC and theme context
INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority)
SELECT
    'a0000000-0000-0000-0000-000000000301'::uuid,
    id,
    'always',
    100
FROM context_assets
WHERE asset_type IN ('bsc_objectives', 'strategic_themes', 'vision_mission');
```

Injection modes:
- `always` - Inject on every agent invocation
- `conditional` - Inject when trigger_keywords match user query
- `on_demand` - Only inject when explicitly requested

## Frontend Integration

### Strategy Dashboard (strategy.html)

The AI Agent Panel is embedded in the Strategy (S2E) dashboard:

```html
<!-- AI Agent Panel -->
<div class="ai-agent-panel">
    <div class="ai-panel-header" onclick="toggleAIPanel()">
        <span>Strategy 120 AI Agents</span>
        <span>(<span id="agentCount">0</span> agents)</span>
    </div>
    <div class="ai-panel-body">
        <div id="agentCategories"><!-- Categories --></div>
        <div id="agentsGrid"><!-- Agent cards --></div>
    </div>
</div>
```

Key functions:
- `loadStrategy120Agents()` - Fetches agents from `/api/agents?suite=strategy`
- `filterByCategory(category)` - Filters agents by BSC category
- `openAgentChat(agentId)` - Opens chat modal with selected agent
- `buildStrategyContext()` - Builds context from current strategy data

### Strategy 120 Page (strategy120.html)

Dedicated page with full features:
- Category sidebar with agent counts
- Tabbed interface: Agents | Initiatives | Decisions | Intelligence
- Full-screen chat modal
- Initiative management
- Decision logging
- Intelligence brief viewer

## Installation & Setup

### 1. Database Migration

Run the SQL files in order:

```bash
# 1. Create tables and views
psql $DATABASE_URL -f db/phase8-strategy120-schema.sql

# 2. Seed Part 1 agents (23 agents)
psql $DATABASE_URL -f db/seed-strategy120-agents-part1.sql

# 3. Seed Part 2 agents (12 agents)
psql $DATABASE_URL -f db/seed-strategy120-agents-part2.sql

# 4. Create context mappings function
psql $DATABASE_URL -f db/seed-strategy120-context-mappings.sql

# 5. Run context mappings (after seeding context assets)
psql $DATABASE_URL -c "SELECT setup_strategy120_agent_mappings();"
```

### 2. Verify Installation

```sql
-- Check agent count
SELECT COUNT(*) FROM agents WHERE suite = 'strategy';
-- Expected: 35

-- Check by category
SELECT category, COUNT(*) FROM agents WHERE suite = 'strategy' GROUP BY category;

-- Verify mapping summary
SELECT * FROM strategy120_mapping_summary;
```

### 3. Start Server

```bash
npm run dev
```

Access:
- Strategy Dashboard: http://localhost:3000/strategy.html
- Strategy 120 Page: http://localhost:3000/strategy120

## Troubleshooting

### Agents Not Loading

1. Check if agents are seeded:
```sql
SELECT COUNT(*) FROM agents WHERE suite = 'strategy';
```

2. Verify API response:
```bash
curl http://localhost:3000/api/agents?suite=strategy
```

3. Check browser console for errors

### Context Not Injecting

1. Verify context assets exist:
```sql
SELECT asset_type, COUNT(*) FROM context_assets GROUP BY asset_type;
```

2. Check mappings:
```sql
SELECT * FROM agent_context_mappings WHERE agent_id = 'a0000000-0000-0000-0000-000000000321';
```

3. Run setup function again:
```sql
SELECT setup_strategy120_agent_mappings();
```

### API Errors

1. Check server logs for route registration:
```
✅ Strategy 120 routes registered
```

2. Verify route file exists:
```bash
ls -la server/routes/strategy120.js
```

## Performance Considerations

- Agent list is cached on frontend load
- Context is assembled on-demand per chat request
- Token budgets prevent context overflow (default: 8000 tokens)
- Streaming disabled for simpler error handling

## Security

- All tables have Row Level Security (RLS) enabled
- User-scoped data access via `user_id` foreign keys
- Public agents (user_id = NULL) are readable by all
- API endpoints inherit Supabase auth context
