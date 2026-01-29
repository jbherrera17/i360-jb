# Strategy 120 & Execute 120 Agent Architecture

> Version: 1.0 | December 2024
> Part of the Insight 360 Three-Lane AI Transformation Framework

---

## Overview

This document defines the agent architecture for **Strategy 120** and **Execute 120**, the second and third lanes of the I360 AI transformation framework.

### The Three-Lane Framework

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     I360 AI TRANSFORMATION FRAMEWORK                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │ ALIGN 120     │ Foundation & Readiness                                      │ │
│  │               │ Outputs: Company Profile, Values, Maturity Score            │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │ STRATEGY 120  │ Planning & Decision-Making                                  │ │
│  │               │ Outputs: BSC, OKRs, Strategy Map, Investment Cases          │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │ EXECUTE 120   │ Delivery & Operations                                       │ │
│  │               │ Outputs: Content, Actions, Workflows, Monitoring            │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Strategy 120: Planning & Decision-Making

### Purpose
Transform alignment outputs into actionable strategic plans, investment decisions, and governance frameworks.

### Inputs from Align 120
- Company Profile (vision, mission, values)
- AI Maturity Assessment
- Business Fundamentals (process inventory, economics)
- Team Readiness Assessment
- Brand Alignment Guidelines
- Corporate Alignment (stakeholders, governance)

### Strategy 120 Modules

---

### Module 1: Strategic Planning

**Purpose**: Translate vision into structured strategic framework (BSC + OKRs)

| Agent | Function | Model | Output |
|-------|----------|-------|--------|
| **Strategy Map Designer** | Creates BSC perspectives and objectives, maps cause-effect relationships | opus | BSC structure, strategy map |
| **OKR Architect** | Designs OKRs aligned to BSC objectives, ensures measurability | sonnet | OKR hierarchy |
| **Strategic Theme Synthesizer** | Identifies 2-4 major strategic themes from inputs | sonnet | Strategic themes |
| **Leading/Lagging Indicator Classifier** | Categorizes key results as leading or lagging | haiku | Indicator classifications |

**Dashboard Output**: Strategy Map, BSC Dashboard, OKR Tree

---

### Module 2: AI Investment Planning

**Purpose**: Build business cases and prioritize AI investments

| Agent | Function | Model | Output |
|-------|----------|-------|--------|
| **Business Case Builder** | Creates ROI models for AI initiatives | sonnet | Investment business cases |
| **Scenario Modeler** | Models best/worst/likely scenarios for initiatives | sonnet | Scenario analyses |
| **Resource Planner** | Estimates people, budget, timeline requirements | sonnet | Resource plans |
| **Dependency Mapper** | Maps initiative dependencies and sequences | haiku | Dependency graph |

**Dashboard Output**: Investment Portfolio, Business Cases, Resource Forecast

---

### Module 3: Research & Intelligence

**Purpose**: Continuous market and competitive intelligence

| Agent | Function | Model | Output |
|-------|----------|-------|--------|
| **Market Intelligence Scout** | Monitors market trends and opportunities | sonnet | Market intelligence briefs |
| **Technology Radar Analyst** | Tracks emerging AI technologies and vendors | sonnet | Technology radar |
| **Regulatory Monitor** | Tracks AI regulations and compliance requirements | sonnet | Regulatory updates |
| **Best Practice Researcher** | Identifies industry best practices and case studies | haiku | Best practice library |

**Dashboard Output**: Intelligence Dashboard, Tech Radar, Regulatory Tracker

---

### Module 4: Decision Support

**Purpose**: Support high-quality strategic decisions

| Agent | Function | Model | Output |
|-------|----------|-------|--------|
| **Decision Framer** | Structures decisions with options, criteria, trade-offs | opus | Decision frameworks |
| **Risk-Benefit Analyzer** | Analyzes risks and benefits of strategic options | sonnet | Risk-benefit matrices |
| **Assumption Tester** | Challenges assumptions and identifies blind spots | sonnet | Assumption tests |
| **Second Opinion Generator** | Provides alternative perspectives on decisions | opus | Counter-arguments |

**Dashboard Output**: Decision Log, Options Analysis, Risk Register

---

### Module 5: Strategy Governance

**Purpose**: Ensure strategic execution stays on track

| Agent | Function | Model | Output |
|-------|----------|-------|--------|
| **Strategy Health Monitor** | Conducts periodic strategy health checks | sonnet | Health check reports |
| **Drift Detector** | Identifies strategic drift and misalignment | sonnet | Drift alerts |
| **Quarterly Review Facilitator** | Prepares and synthesizes quarterly strategy reviews | sonnet | QBR materials |
| **Strategy Communicator** | Creates strategy communication materials | haiku | Strategy communications |

**Dashboard Output**: Strategy Health Dashboard, Drift Alerts, QBR Reports

---

### Strategy 120 Cross-Cutting Agents

| Agent | Function | Model |
|-------|----------|-------|
| **Strategy 120 Orchestrator** | Guides through strategy process, synthesizes outputs | opus |
| **Strategic Context Assembler** | Pulls relevant context for strategy decisions | haiku |
| **Strategy Document Generator** | Creates formatted strategy documents | sonnet |

---

### Strategy 120 Agent Count

| Module | Agents |
|--------|--------|
| Strategic Planning | 4 |
| AI Investment Planning | 4 |
| Research & Intelligence | 4 |
| Decision Support | 4 |
| Strategy Governance | 4 |
| Cross-Cutting | 3 |
| **TOTAL** | **23** |

---

## Execute 120: Delivery & Operations

### Purpose
Transform strategic plans into operational execution through AI-powered content, workflows, and monitoring.

### User Profile Personalization (Phase 37)

Execute 120 now automatically personalizes content based on the user's profile:

| Feature | Description |
|---------|-------------|
| **Auto-Department Selection** | Page selects user's assigned department on load |
| **Role-Based Filtering** | Content filtered by business role level (IC → Executive) |
| **Department Briefings** | Daily briefings scoped to user's department |
| **Executive Cards** | Strategy Overview card visible only to executives/directors |

**New Content Cards:**
- Context Assets (filtered by dept + role)
- Quick Actions (filtered by dept + role)
- Daily Briefing (department-specific)
- Strategic Overview (executive role only)

### Inputs from Strategy 120
- BSC Objectives and Strategy Map
- OKRs with Key Results
- Prioritized AI Initiative Portfolio
- Investment Business Cases
- Governance Framework

### Execute 120 Modules

---

### Module 1: Content Production

**Purpose**: AI-powered content creation aligned with brand and strategy

| Agent | Function | Model | Output |
|-------|----------|-------|--------|
| **Content Strategist** | Plans content calendar aligned to OKRs | sonnet | Content calendar |
| **Article Writer** | Creates long-form thought leadership content | opus | Articles, blog posts |
| **Social Media Composer** | Creates platform-specific social content | haiku | Social posts |
| **Email Campaign Builder** | Designs email sequences and campaigns | sonnet | Email campaigns |
| **Presentation Designer** | Creates slide decks and presentations | sonnet | Presentations |
| **Report Generator** | Creates formatted reports and documents | sonnet | Business reports |

**Dashboard Output**: Content Calendar, Content Library, Performance Metrics

---

### Module 2: Customer Operations

**Purpose**: AI-powered customer-facing operations

| Agent | Function | Model | Output |
|-------|----------|-------|--------|
| **Customer Response Agent** | Handles customer inquiries with brand voice | sonnet | Customer responses |
| **Support Ticket Classifier** | Triages and routes support tickets | haiku | Ticket classifications |
| **FAQ Generator** | Creates and maintains FAQ content | haiku | FAQ database |
| **Customer Journey Optimizer** | Identifies and fixes customer journey friction | sonnet | Journey improvements |
| **Feedback Synthesizer** | Analyzes customer feedback into insights | sonnet | Feedback reports |

**Dashboard Output**: Support Dashboard, CSAT Tracking, Journey Analytics

---

### Module 3: Sales Enablement

**Purpose**: AI-powered sales support and acceleration

| Agent | Function | Model | Output |
|-------|----------|-------|--------|
| **Proposal Generator** | Creates customized sales proposals | sonnet | Proposals |
| **Competitive Battle Card Creator** | Creates competitive positioning materials | sonnet | Battle cards |
| **Objection Handler** | Prepares responses to common objections | sonnet | Objection scripts |
| **Deal Analyzer** | Analyzes deals and recommends strategies | sonnet | Deal analysis |
| **Pipeline Coach** | Provides coaching on pipeline opportunities | sonnet | Coaching insights |

**Dashboard Output**: Sales Dashboard, Win Rate Analytics, Pipeline Health

---

### Module 4: Operations & Workflow

**Purpose**: AI-powered operational workflows

| Agent | Function | Model | Output |
|-------|----------|-------|--------|
| **Daily Briefer** | Creates personalized daily intelligence briefings | sonnet | Daily briefings |
| **Meeting Prep Assistant** | Prepares briefing materials for meetings | sonnet | Meeting prep docs |
| **Email Triager** | Prioritizes and drafts email responses | haiku | Email triage, drafts |
| **Task Orchestrator** | Breaks down projects into tasks, tracks progress | sonnet | Task lists, status |
| **Process Automator** | Identifies and implements workflow automations | sonnet | Automation workflows |

**Dashboard Output**: Operations Dashboard, Productivity Metrics, Automation ROI

---

### Module 5: Performance Monitoring

**Purpose**: Track AI and business performance

| Agent | Function | Model | Output |
|-------|----------|-------|--------|
| **OKR Progress Tracker** | Monitors OKR progress and forecasts | sonnet | OKR progress reports |
| **AI Performance Monitor** | Tracks AI system performance and quality | haiku | AI performance dashboards |
| **ROI Calculator** | Calculates realized ROI from AI investments | sonnet | ROI reports |
| **Anomaly Detector** | Identifies unusual patterns requiring attention | haiku | Anomaly alerts |
| **Lessons Learned Synthesizer** | Captures and organizes learnings | sonnet | Lessons learned database |

**Dashboard Output**: Performance Dashboard, ROI Tracking, Health Metrics

---

### Module 6: Continuous Improvement

**Purpose**: Drive ongoing optimization and learning

| Agent | Function | Model | Output |
|-------|----------|-------|--------|
| **Retrospective Facilitator** | Conducts and synthesizes retrospectives | sonnet | Retro summaries |
| **Process Improvement Identifier** | Identifies improvement opportunities | sonnet | Improvement backlog |
| **A/B Test Designer** | Designs experiments to test improvements | sonnet | Experiment designs |
| **Knowledge Base Curator** | Maintains and improves knowledge assets | haiku | Knowledge updates |

**Dashboard Output**: Improvement Pipeline, Experiment Results, Knowledge Health

---

### Execute 120 Cross-Cutting Agents

| Agent | Function | Model |
|-------|----------|-------|
| **Execute 120 Orchestrator** | Coordinates execution activities, ensures alignment | opus |
| **Quality Assurance Agent** | Reviews outputs for quality and brand alignment | sonnet |
| **Escalation Handler** | Manages exceptions and escalations | sonnet |

---

### Execute 120 Agent Count

| Module | Agents |
|--------|--------|
| Content Production | 6 |
| Customer Operations | 5 |
| Sales Enablement | 5 |
| Operations & Workflow | 5 |
| Performance Monitoring | 5 |
| Continuous Improvement | 4 |
| Cross-Cutting | 3 |
| **TOTAL** | **33** |

---

## Complete Framework Summary

### Agent Totals by Lane

| Lane | Modules | Agents | Primary Function |
|------|---------|--------|------------------|
| **Align 120** | 5 + platform | 28 | Foundation & Readiness |
| **Strategy 120** | 5 + platform | 23 | Planning & Decision-Making |
| **Execute 120** | 6 + platform | 33 | Delivery & Operations |
| **TOTAL** | **16** | **84** | |

### Agent Distribution by Model

| Model | Count | Use Case |
|-------|-------|----------|
| opus | ~12 | Complex reasoning, synthesis, orchestration |
| sonnet | ~55 | Core analysis and generation |
| haiku | ~17 | High-volume, quick tasks |

### Data Flow Between Lanes

```
ALIGN 120 OUTPUTS                    STRATEGY 120 OUTPUTS
─────────────────                    ────────────────────
Company Profile       ─────────────> BSC + Strategy Map
AI Maturity Score     ─────────────> OKR Hierarchy
Business Fundamentals ─────────────> Investment Portfolio
Team Readiness        ─────────────> Resource Plans
Brand Guidelines      ─────────────> Decision Framework
Corporate Alignment   ─────────────> Governance Model
                                            │
                                            ↓
                                    EXECUTE 120 OUTPUTS
                                    ────────────────────
                                    Content Library
                                    Customer Operations
                                    Sales Enablement
                                    Workflow Automation
                                    Performance Dashboards
                                    Continuous Improvement
```

---

## Implementation Recommendations

### Phase 1: Foundation (Align 120)
1. Deploy company profile schema
2. Seed Align 120 agents
3. Build Align 120 dashboard
4. Run pilot assessments

### Phase 2: Strategy (Strategy 120)
1. Extend S2E schema for Strategy 120 outputs
2. Seed Strategy 120 agents
3. Build Strategy Dashboard
4. Integrate with Align 120 outputs

### Phase 3: Execution (Execute 120)
1. Build execution tracking schema
2. Seed Execute 120 agents
3. Build Operations Dashboard
4. Integrate with Strategy 120 OKRs

### Phase 4: Integration
1. Build cross-lane workflows
2. Create unified dashboard
3. Implement feedback loops
4. Enable continuous improvement

---

## Database Schema Extensions Needed

### For Strategy 120
- `strategy_initiatives` - AI initiative tracking
- `business_cases` - Investment business cases
- `scenario_models` - Scenario analysis storage
- `decision_log` - Decision documentation
- `intelligence_briefs` - Market intelligence storage

### For Execute 120
- `content_library` - Content asset management
- `content_calendar` - Content planning
- `workflow_executions` - Workflow tracking
- `performance_metrics` - KPI tracking
- `improvement_backlog` - Continuous improvement queue
- `experiment_results` - A/B test tracking

### For Execute 120 Personalization (Phase 37)
- `workflow_roles` - Role-based workflow access control
- `agent_roles` - Role-based agent access control
- `context_asset_roles` - Role-based context asset access control
- `briefing_configs.department_id` - Department-specific briefings
- `user_accessible_workflows` (view) - Workflows filtered by user dept + role
- `user_accessible_agents` (view) - Agents filtered by user dept + role
- `user_accessible_context_assets` (view) - Context assets filtered by user dept + role

---

## Next Steps

1. **Review and approve** this architecture with stakeholders
2. **Prioritize** which Strategy 120 and Execute 120 modules to build first
3. **Create database schemas** for Strategy 120 and Execute 120
4. **Seed agents** in priority order
5. **Build dashboards** to visualize outputs
6. **Test end-to-end** flow from Align → Strategy → Execute

---

*Document generated for Insight 360 v2.23*
*Updated January 2026 - Phase 37: Execute 120 User Profile Personalization*
