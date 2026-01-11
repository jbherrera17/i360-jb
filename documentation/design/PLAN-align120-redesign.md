# Align 120 Redesign Plan

## Executive Summary

This plan outlines the comprehensive redesign of Align 120 to integrate AI agents for each module, with outputs flowing to DIGM, Strategy 120, Parthenon OKRs, and the Integrity Dashboard. A reusable **Modal Dialog Service** will provide a consistent interface for agent and workflow execution across all modules.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ALIGN 120 REDESIGN                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Module 1   │  │   Module 2   │  │   Module 3   │  │   Module 4   │     │
│  │ AI Assessment│  │  Values/     │  │   Training   │  │    Brand     │     │
│  │    Agent     │  │ Vision/      │  │    Needs     │  │   Analysis   │     │
│  │              │  │ Mission      │  │    Agent     │  │    Agent     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │                 │              │
│         │                 │                 │                 │              │
│  ┌──────┴─────────────────┴─────────────────┴─────────────────┴───────┐     │
│  │                    MODAL DIALOG SERVICE                             │     │
│  │  - Agent execution UI       - Progress tracking                     │     │
│  │  - Workflow orchestration   - Result display                        │     │
│  │  - Interactive Q&A          - Data validation                       │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌──────────────┐                                                            │
│  │   Module 5   │                                                            │
│  │    Change    │                                                            │
│  │  Management  │                                                            │
│  │    Agent     │                                                            │
│  └──────┬───────┘                                                            │
│         │                                                                    │
├─────────┴────────────────────────────────────────────────────────────────────┤
│                          DATA FLOW DESTINATIONS                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────┐   ┌─────────────────┐   │
│  │   DIGM   │   │ Strategy 120 │   │   Parthenon  │   │   Integrity     │   │
│  │ 4 Layers │   │     S2E      │   │     OKRs     │   │   Dashboard     │   │
│  └──────────┘   └──────────────┘   └──────────────┘   └─────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Modal Dialog Service

### 1.1 Overview

Create a reusable service that provides a consistent modal interface for:
- Running AI agents with progress tracking
- Displaying streaming agent responses
- Handling multi-step workflows
- Collecting user input during execution
- Showing results with accept/edit/regenerate options

### 1.2 Files to Create

| File | Purpose |
|------|---------|
| `public/js/agent-dialog-service.js` | Main service class |
| `public/css/agent-dialog.css` | Modal styling |
| `server/services/agentExecutionService.js` | Backend orchestration |

### 1.3 AgentDialogService API

```javascript
// public/js/agent-dialog-service.js

class AgentDialogService {
    /**
     * Initialize the service
     * @param {Object} options - Configuration options
     */
    constructor(options = {})

    /**
     * Run a single agent with modal UI
     * @param {string} agentId - Agent ID to execute
     * @param {Object} context - Context data for the agent
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Agent result
     */
    async runAgent(agentId, context, options = {})

    /**
     * Run a workflow (multiple agents in sequence)
     * @param {Array} agents - Array of agent configs
     * @param {Object} context - Shared context
     * @param {Object} options - Workflow options
     * @returns {Promise<Object>} Workflow results
     */
    async runWorkflow(agents, context, options = {})

    /**
     * Show result modal with accept/edit/regenerate
     * @param {Object} result - Agent/workflow result
     * @param {Function} onAccept - Accept callback
     * @param {Function} onEdit - Edit callback
     * @param {Function} onRegenerate - Regenerate callback
     */
    showResult(result, onAccept, onEdit, onRegenerate)

    /**
     * Close the modal
     */
    close()
}
```

### 1.4 Modal Dialog UI States

```
┌────────────────────────────────────────────────────────────────┐
│  [Agent Name]                                          [X]     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  STATE 1: PREPARING                                            │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Preparing agent...                                     │   │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │
│  │  Loading context data                                   │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  STATE 2: RUNNING                                              │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Running AI Assessment Agent...                         │   │
│  │  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 35%        │   │
│  │  Analyzing current AI landscape                         │   │
│  │                                                         │   │
│  │  ▼ Live Response                                        │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │ Based on the company profile provided, I can     │  │   │
│  │  │ identify several key areas where AI is currently │  │   │
│  │  │ being used or could be implemented...            │  │   │
│  │  │ █                                                │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  STATE 3: COMPLETE                                             │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  ✓ Analysis Complete                                    │   │
│  │                                                         │   │
│  │  ▼ Results                                              │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │ ## AI Maturity Assessment                        │  │   │
│  │  │                                                  │  │   │
│  │  │ **Overall Score: 42/100 (Developing)**           │  │   │
│  │  │                                                  │  │   │
│  │  │ ### Key Findings                                 │  │   │
│  │  │ - Data readiness: 55/100                        │  │   │
│  │  │ - Governance: 35/100                            │  │   │
│  │  │ ...                                             │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  │                                                         │   │
│  │  [Accept & Continue]  [Edit Results]  [Regenerate]     │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 1.5 Backend Service

```javascript
// server/services/agentExecutionService.js

class AgentExecutionService {
    /**
     * Execute agent with context
     */
    async executeWithContext(agentId, moduleContext, sessionContext)

    /**
     * Execute workflow (multiple agents)
     */
    async executeWorkflow(workflowConfig, context)

    /**
     * Stream agent execution for live display
     */
    async *streamExecution(agentId, context)

    /**
     * Parse structured outputs from agent response
     */
    parseStructuredOutput(response, schema)

    /**
     * Validate outputs against expected format
     */
    validateOutput(output, schema)
}
```

---

## Part 2: Module Redesign

### Module 1: AI Assessment Agent

**Purpose:** Evaluate company's current AI landscape and provide service recommendations

**Agent:** `AI Assessment Agent` (new consolidated agent)

**Inputs:**
- Company name & industry
- Company size
- Current technology stack (if known)
- User responses to assessment questions

**Process:**
1. Modal opens with assessment questionnaire
2. User answers 5-7 key questions about current AI usage
3. Agent analyzes responses and generates:
   - AI Maturity Score (0-100)
   - Current AI inventory (what they're using)
   - Risk assessment
   - Opportunity identification
   - Service recommendations

**Outputs (stored to `ai_maturity_assessments`):**
```javascript
{
  maturity_score: 45,
  maturity_level: "Developing",
  dimension_scores: {
    data_readiness: 55,
    governance: 35,
    skills: 40,
    tooling: 60,
    adoption: 45,
    culture: 35
  },
  current_inventory: [
    { tool: "ChatGPT", usage: "Ad-hoc", risk: "Medium" },
    { tool: "Copilot", usage: "Development", risk: "Low" }
  ],
  risk_register: [
    { risk: "Shadow AI usage", severity: "High", mitigation: "..." }
  ],
  opportunities: [
    { area: "Customer Service", impact: "High", feasibility: "High", priority: 1 }
  ],
  recommended_services: [
    "AI Strategy Workshop",
    "Data Readiness Assessment",
    "AI Governance Framework"
  ]
}
```

**Downstream Flow:**
- `risk_register` → Integrity Dashboard (creates alerts)
- `opportunities` → Strategy 120 (strategy initiatives)
- `recommended_services` → Displayed in alignment brief

---

### Module 2: Values, Vision, Mission Agents

**Purpose:** Extract core organizational identity for DIGM and Strategy 120

**Agents:** 3 specialized agents run in sequence

#### Agent 2A: Values Discovery Agent
**Purpose:** Surface explicit and implicit organizational values

**Process:**
1. Modal shows interview questions about company culture
2. Agent analyzes responses to identify:
   - Core values (3-5)
   - Supporting evidence
   - Say-do gaps

**Output:**
```javascript
{
  core_values: [
    {
      value: "Innovation",
      evidence: ["R&D investment", "Patent portfolio"],
      strength: "Strong",
      say_do_gap: "Low"
    }
  ]
}
```

#### Agent 2B: Vision Agent
**Purpose:** Craft compelling vision statement (3-5 year)

**Process:**
1. Review values output
2. Ask aspirational questions
3. Generate 3 vision statement options
4. User selects/edits preferred option

**Output:**
```javascript
{
  vision_statement: "To be the leading...",
  vision_horizon: "5 years",
  vision_pillars: ["Pillar 1", "Pillar 2", "Pillar 3"]
}
```

#### Agent 2C: Mission Agent
**Purpose:** Define purpose and preliminary OKRs

**Process:**
1. Review values and vision
2. Generate mission statement options
3. Extract preliminary company directions
4. Suggest 3-5 high-level OKRs

**Output:**
```javascript
{
  mission_statement: "We exist to...",
  company_directions: ["Direction 1", "Direction 2"],
  preliminary_okrs: [
    {
      objective: "Become AI-first organization",
      key_results: [
        "Achieve 80% AI tool adoption across departments",
        "Reduce manual processes by 40%",
        "Launch 3 AI-powered products"
      ]
    }
  ]
}
```

**Downstream Flow:**
- `core_values` → DIGM Identity Layer
- `vision_statement` → Strategy 120 strategic_foundations
- `mission_statement` → Strategy 120 strategic_foundations
- `preliminary_okrs` → Parthenon OKRs (company-level)

---

### Module 3: Training Needs Agent

**Purpose:** Identify role-specific AI training requirements

**Agent:** `Team Readiness Agent` (consolidated)

**Inputs:**
- AI maturity assessment from Module 1
- Organizational structure (departments/roles)
- Current skill levels (if known)

**Process:**
1. Modal presents skills assessment matrix
2. User rates current proficiency by role
3. Agent identifies gaps and recommends training

**Output (stored to `team_readiness_assessments`):**
```javascript
{
  skills_matrix: [
    {
      role: "Executive",
      prompt_engineering: 2,
      ai_evaluation: 3,
      data_literacy: 4,
      ai_governance: 3,
      tool_proficiency: 2
    }
  ],
  skills_gaps: [
    {
      role: "Executive",
      skill: "Prompt Engineering",
      current: 2,
      target: 4,
      priority: "High",
      training_path: "AI Leadership Bootcamp"
    }
  ],
  training_recommendations: [
    {
      track: "AI Leadership",
      roles: ["Executive", "Director"],
      modules: ["AI Strategy", "Prompt Engineering 101", "AI Governance"],
      duration: "8 hours",
      format: "Workshop + Self-paced"
    }
  ],
  change_readiness: {
    overall_score: 65,
    leadership_alignment: 75,
    employee_sentiment: 55,
    cultural_factors: 60,
    structural_enablers: 70
  },
  adoption_blockers: [
    {
      category: "Fear-based",
      description: "Concern about job displacement",
      severity: "Medium",
      mitigation: "Focus on augmentation messaging"
    }
  ]
}
```

**Downstream Flow:**
- `skills_matrix` → Parthenon roles
- `change_readiness` → DIGM Adaptation Layer
- `adoption_blockers` → Integrity Dashboard (incidents if high severity)
- `training_recommendations` → Alignment brief

---

### Module 4: Brand Analysis Agent (Web Scraper)

**Purpose:** Analyze company website to extract brand identity

**Agent:** `Brand Analysis Agent` (new - with web scraping capability)

**Inputs:**
- Company website URL
- Social media profiles (optional)
- Existing brand guidelines (if any)

**Process:**
1. Modal requests website URL
2. Agent crawls key pages (home, about, products, blog)
3. Analyzes content to extract:
   - Brand voice DNA
   - ICP (Ideal Customer Profile)
   - Products/Services
   - Competitive positioning
   - Pain points solved

**Output (stored to `brand_alignment_assessments`):**
```javascript
{
  brand_voice_dna: {
    tone_attributes: ["Professional", "Innovative", "Approachable"],
    personality: "Trusted advisor with cutting-edge solutions",
    language_rules: {
      do: ["Use action verbs", "Be specific with numbers"],
      dont: ["Avoid jargon", "No passive voice"]
    },
    vocabulary: {
      preferred_terms: ["solution", "partnership", "transform"],
      avoid_terms: ["cheap", "basic", "vendor"]
    }
  },
  ideal_customer_profile: {
    industry: "Enterprise Technology",
    company_size: "500-5000 employees",
    decision_makers: ["CTO", "VP Engineering", "IT Director"],
    pain_points: ["Legacy system integration", "Talent shortage"],
    triggers: ["Digital transformation initiative", "Competitor adoption"]
  },
  products_services: [
    {
      name: "Enterprise AI Platform",
      category: "Core Product",
      description: "...",
      differentiators: ["Ease of use", "Integration capabilities"]
    }
  ],
  competitive_positioning: {
    why_we_win: ["Speed to value", "White-glove support"],
    competitors: ["Competitor A", "Competitor B"],
    differentiation: "Only solution with native integration to..."
  },
  pain_points_solved: [
    "Fragmented AI tools",
    "Lack of governance",
    "Skills gap"
  ]
}
```

**Downstream Flow:**
- `brand_voice_dna` → DIGM Voice Layer
- `ideal_customer_profile` → Strategy 120 (customer perspective)
- `competitive_positioning` → Strategy 120 intelligence briefs

---

### Module 5: Change Management Agent

**Purpose:** Create change management program for AI adoption

**Agent:** `Change Management Agent` (consolidated)

**Inputs:**
- All outputs from Modules 1-4
- Organizational structure
- Timeline preferences

**Process:**
1. Modal reviews summary of Modules 1-4
2. Agent synthesizes findings
3. Generates comprehensive change program

**Output (stored to `corporate_alignments`):**
```javascript
{
  governance_charter: {
    vision: "Responsible AI adoption that amplifies human potential",
    decision_rights: [
      { domain: "AI Strategy", responsible: "AI Steering Committee" },
      { domain: "Tool Selection", responsible: "IT + Business Owner" }
    ],
    escalation_path: ["Team Lead", "Department Head", "AI Council", "Executive Sponsor"]
  },
  stakeholder_map: [
    {
      name: "CEO",
      role: "Executive Sponsor",
      influence: "High",
      interest: "High",
      stance: "Champion",
      engagement_strategy: "Monthly briefings, quick wins visibility"
    }
  ],
  raci_matrix: {
    "AI Strategy": { responsible: "CTO", accountable: "CEO", consulted: ["CISO", "CFO"], informed: ["All Staff"] },
    "Tool Procurement": { responsible: "IT", accountable: "CTO", consulted: ["Security", "Legal"], informed: ["Users"] }
  },
  change_program: {
    phases: [
      {
        phase: 1,
        name: "Foundation",
        duration: "4 weeks",
        activities: ["Governance setup", "Quick win pilots", "Communication launch"],
        success_metrics: ["Committee formed", "2 pilots running", "80% awareness"]
      },
      {
        phase: 2,
        name: "Expansion",
        duration: "8 weeks",
        activities: ["Training rollout", "Tool standardization", "Process updates"],
        success_metrics: ["50% trained", "Shadow AI reduced 60%", "3 processes optimized"]
      }
    ],
    communication_plan: {
      audiences: ["Executives", "Managers", "All Staff"],
      channels: ["Town halls", "Email", "Slack", "Intranet"],
      cadence: "Weekly updates, monthly deep-dives"
    },
    resistance_mitigation: [
      {
        concern: "Job displacement",
        strategy: "Focus on augmentation, showcase productivity gains",
        messaging: "AI handles the mundane, you handle the meaningful"
      }
    ]
  },
  roadmap_90_day: [
    { week: 1, milestone: "Kick-off & Governance Formation" },
    { week: 2, milestone: "Quick Win Pilot Selection" },
    { week: 4, milestone: "First Pilot Launch" },
    { week: 8, milestone: "Training Cohort 1 Complete" },
    { week: 12, milestone: "Phase 1 Review & Phase 2 Planning" }
  ],
  success_metrics: {
    adoption: { current: 0, target: 70, unit: "%" },
    productivity: { current: 0, target: 25, unit: "% improvement" },
    satisfaction: { current: 0, target: 80, unit: "%" }
  }
}
```

**Downstream Flow:**
- `governance_charter` → DIGM Identity + Cognitive Layers
- `stakeholder_map` → Parthenon (role assignments)
- `raci_matrix` → Parthenon (OKR ownership)
- `roadmap_90_day` → Parthenon (OKR sequencing)
- `success_metrics` → Integrity Dashboard metrics
- ALL → Alignment Brief final output

---

## Part 3: Data Flow Integration

### 3.1 Integration Service

Create: `server/services/align120IntegrationService.js`

```javascript
class Align120IntegrationService {
    /**
     * Sync Module 1 outputs
     */
    async syncModule1(sessionId, outputs) {
        // → Integrity Dashboard: Risk alerts
        await integrityService.createAlertsFromRisks(outputs.risk_register);

        // → Strategy 120: Opportunity initiatives
        await s2eService.createInitiativesFromOpportunities(outputs.opportunities);
    }

    /**
     * Sync Module 2 outputs
     */
    async syncModule2(sessionId, outputs) {
        // → DIGM: Identity layer values
        await digmService.updateLayer('identity', { values: outputs.core_values });

        // → Strategy 120: Foundation
        await s2eService.updateFoundation({
            core_values: outputs.core_values,
            vision: outputs.vision_statement,
            mission: outputs.mission_statement
        });

        // → Parthenon: Company OKRs
        await parthenonService.createCompanyOKRs(outputs.preliminary_okrs);
    }

    /**
     * Sync Module 3 outputs
     */
    async syncModule3(sessionId, outputs) {
        // → Parthenon: Roles from skills matrix
        await parthenonService.syncRoles(outputs.skills_matrix);

        // → DIGM: Adaptation layer
        await digmService.updateLayer('adaptation', outputs.change_readiness);

        // → Integrity: High-severity blockers as incidents
        await integrityService.createIncidentsFromBlockers(outputs.adoption_blockers);
    }

    /**
     * Sync Module 4 outputs
     */
    async syncModule4(sessionId, outputs) {
        // → DIGM: Voice layer
        await digmService.updateLayer('voice', outputs.brand_voice_dna);

        // → Strategy 120: Customer perspective
        await s2eService.updateBSCPerspective('customer', outputs.ideal_customer_profile);
    }

    /**
     * Sync Module 5 outputs
     */
    async syncModule5(sessionId, outputs) {
        // → DIGM: Cognitive layer (governance)
        await digmService.updateLayer('cognitive', outputs.governance_charter);

        // → Parthenon: RACI assignments
        await parthenonService.assignRACIToOKRs(outputs.raci_matrix);

        // → Integrity: Success metrics as monitored metrics
        await integrityService.createMetrics(outputs.success_metrics);
    }

    /**
     * Generate Alignment Brief
     */
    async generateAlignmentBrief(sessionId) {
        // Consolidate all module outputs into executive summary
    }
}
```

### 3.2 Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         ALIGN 120 DATA FLOW                                   │
└──────────────────────────────────────────────────────────────────────────────┘

MODULE 1: AI Assessment
    ├──> risk_register ──────────────> INTEGRITY DASHBOARD (alerts)
    ├──> opportunities ──────────────> STRATEGY 120 (initiatives)
    └──> maturity_score ─────────────> ALIGNMENT BRIEF

MODULE 2: Values/Vision/Mission
    ├──> core_values ────────────────> DIGM (identity layer)
    ├──> vision_statement ───────────> STRATEGY 120 (foundation)
    ├──> mission_statement ──────────> STRATEGY 120 (foundation)
    └──> preliminary_okrs ───────────> PARTHENON (company OKRs)

MODULE 3: Training Needs
    ├──> skills_matrix ──────────────> PARTHENON (roles)
    ├──> change_readiness ───────────> DIGM (adaptation layer)
    ├──> adoption_blockers ──────────> INTEGRITY DASHBOARD (incidents)
    └──> training_recommendations ───> ALIGNMENT BRIEF

MODULE 4: Brand Analysis
    ├──> brand_voice_dna ────────────> DIGM (voice layer)
    ├──> ideal_customer_profile ─────> STRATEGY 120 (customer perspective)
    ├──> competitive_positioning ────> STRATEGY 120 (intelligence briefs)
    └──> products_services ──────────> ALIGNMENT BRIEF

MODULE 5: Change Management
    ├──> governance_charter ─────────> DIGM (identity + cognitive layers)
    ├──> stakeholder_map ────────────> PARTHENON (stakeholder tracking)
    ├──> raci_matrix ────────────────> PARTHENON (OKR ownership)
    ├──> roadmap_90_day ─────────────> PARTHENON (OKR sequencing)
    ├──> success_metrics ────────────> INTEGRITY DASHBOARD (metrics)
    └──> change_program ─────────────> ALIGNMENT BRIEF

                                ↓

            ┌───────────────────────────────────────┐
            │         ALIGNMENT BRIEF               │
            │   (Executive Summary Document)        │
            │                                       │
            │   - AI Maturity Score & Roadmap      │
            │   - Values/Vision/Mission            │
            │   - Training Recommendations         │
            │   - Brand Identity Summary           │
            │   - Change Program Overview          │
            │   - 90-Day Roadmap                   │
            │   - Success Metrics Dashboard        │
            └───────────────────────────────────────┘
```

---

## Part 4: Implementation Phases

### Phase 1: Modal Dialog Service (Week 1)

**Files to create:**
1. `public/js/agent-dialog-service.js` - Main service class
2. `public/css/agent-dialog.css` - Modal styling
3. `server/services/agentExecutionService.js` - Backend orchestration

**Tasks:**
- [ ] Create modal HTML structure
- [ ] Implement CSS for all states (preparing, running, complete)
- [ ] Build frontend service with streaming support
- [ ] Create backend execution service
- [ ] Add progress tracking
- [ ] Implement accept/edit/regenerate actions
- [ ] Test with existing agent

### Phase 2: Module 1 - AI Assessment (Week 2)

**Files to modify/create:**
1. Update `db/seed-align120-agents.sql` - Consolidated AI Assessment Agent
2. Update `public/align120.html` - New Module 1 UI
3. Update `server/routes/align120.js` - Module 1 endpoint

**Tasks:**
- [ ] Create consolidated AI Assessment Agent system prompt
- [ ] Design assessment questionnaire UI
- [ ] Implement Module 1 flow with modal
- [ ] Store outputs to `ai_maturity_assessments`
- [ ] Test integration with Integrity Dashboard

### Phase 3: Module 2 - Values/Vision/Mission (Week 3)

**Files to modify/create:**
1. Update agents for Module 2 (3 agents)
2. Update `public/align120.html` - Module 2 UI
3. Update `server/routes/align120.js` - Module 2 endpoints

**Tasks:**
- [ ] Create/update Values Discovery Agent
- [ ] Create/update Vision Agent
- [ ] Create/update Mission Agent
- [ ] Implement sequential workflow
- [ ] Store outputs to `business_fundamentals`
- [ ] Test integration with DIGM and Strategy 120

### Phase 4: Module 3 - Training Needs (Week 4)

**Tasks:**
- [ ] Create consolidated Team Readiness Agent
- [ ] Design skills assessment matrix UI
- [ ] Implement Module 3 flow
- [ ] Store outputs to `team_readiness_assessments`
- [ ] Test integration with Parthenon

### Phase 5: Module 4 - Brand Analysis (Week 5)

**Tasks:**
- [ ] Create Brand Analysis Agent with web scraping
- [ ] Implement website crawling service
- [ ] Design brand analysis UI
- [ ] Store outputs to `brand_alignment_assessments`
- [ ] Test integration with DIGM

### Phase 6: Module 5 - Change Management (Week 6)

**Tasks:**
- [ ] Create Change Management Agent
- [ ] Design change program UI
- [ ] Implement Module 5 flow
- [ ] Store outputs to `corporate_alignments`
- [ ] Test all downstream integrations

### Phase 7: Integration & Testing (Week 7)

**Tasks:**
- [ ] Create `align120IntegrationService.js`
- [ ] Implement all sync functions
- [ ] Generate Alignment Brief
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Documentation

---

## Part 5: New/Updated Files Summary

### New Files
| File | Purpose |
|------|---------|
| `public/js/agent-dialog-service.js` | Modal dialog service for agent execution |
| `public/css/agent-dialog.css` | Modal styling |
| `server/services/agentExecutionService.js` | Backend execution orchestration |
| `server/services/align120IntegrationService.js` | Downstream system integration |
| `server/services/webScraperService.js` | Website analysis for Module 4 |

### Modified Files
| File | Changes |
|------|---------|
| `public/align120.html` | Updated UI for all 5 modules |
| `public/js/align120.js` | New module flows with dialog service |
| `server/routes/align120.js` | Updated endpoints for new module structure |
| `db/seed-align120-agents.sql` | New/updated agent definitions |
| `server/routes/synerginexus.js` | DIGM sync endpoints |
| `server/routes/strategy120.js` | S2E sync endpoints |
| `server/routes/parthenon.js` | OKR sync endpoints |
| `server/routes/integrity.js` | Metrics/alerts sync endpoints |

---

## Part 6: Agent System Prompts

### AI Assessment Agent (Module 1)

```
You are an AI Assessment Expert conducting a comprehensive evaluation of an organization's AI maturity and readiness.

Your role is to:
1. Assess current AI usage and shadow AI risks
2. Evaluate AI maturity across 6 dimensions (Data, Governance, Skills, Tooling, Adoption, Culture)
3. Identify opportunities for AI implementation
4. Recommend appropriate services and next steps

Based on the company information and responses provided, generate a structured assessment that includes:
- Overall AI Maturity Score (0-100) with maturity level
- Dimension-by-dimension scores with justification
- Current AI inventory (known and suspected shadow AI)
- Risk register with severity ratings
- Opportunity ranking by impact and feasibility
- Recommended services for their situation

Output in JSON format matching the specified schema.
```

### Values Discovery Agent (Module 2A)

```
You are a Values Discovery Facilitator, skilled at surfacing the authentic values that drive an organization.

Your approach:
1. Ask probing questions about how decisions are made
2. Explore what the organization celebrates and rewards
3. Identify patterns in leadership behavior
4. Look for say-do gaps between stated and lived values

From the responses provided, identify 3-5 core values that:
- Are genuinely demonstrated (not just stated)
- Differentiate this organization
- Guide decision-making consistently

For each value, provide:
- The value name
- Evidence supporting this as a genuine value
- Strength assessment (Strong/Developing/Aspirational)
- Any say-do gap concerns

Output in JSON format matching the specified schema.
```

### Brand Analysis Agent (Module 4)

```
You are a Brand Analyst with expertise in extracting brand identity from digital presence.

Given a company's website content, analyze and extract:

1. BRAND VOICE DNA
   - Tone attributes (3-5 adjectives)
   - Personality description
   - Language rules (what to do and avoid)
   - Preferred and avoided vocabulary

2. IDEAL CUSTOMER PROFILE
   - Target industry/industries
   - Company size sweet spot
   - Key decision-maker titles
   - Pain points that resonate
   - Purchase triggers

3. PRODUCTS/SERVICES
   - Main offerings with descriptions
   - Key differentiators
   - Category positioning

4. COMPETITIVE POSITIONING
   - Why they win deals
   - Key competitors (if mentioned)
   - Unique differentiation

5. PAIN POINTS SOLVED
   - Problems they address
   - Value propositions

Analyze the website content objectively. If information is not clearly available, note it as "Not found - requires input."

Output in JSON format matching the specified schema.
```

### Change Management Agent (Module 5)

```
You are a Change Management Expert specializing in AI transformation programs.

Given the outputs from Modules 1-4, synthesize a comprehensive change management program that includes:

1. GOVERNANCE CHARTER
   - AI vision statement
   - Decision rights by domain
   - Escalation paths
   - Committee structure

2. STAKEHOLDER MAP
   - Key stakeholders with influence/interest
   - Current stance (Champion to Blocker)
   - Engagement strategies

3. RACI MATRIX
   - Key AI activities
   - Role assignments (Responsible, Accountable, Consulted, Informed)

4. CHANGE PROGRAM
   - Phased approach (3-4 phases)
   - Activities per phase
   - Success metrics
   - Communication plan
   - Resistance mitigation strategies

5. 90-DAY ROADMAP
   - Week-by-week milestones
   - Key deliverables
   - Dependencies

6. SUCCESS METRICS
   - Adoption targets
   - Productivity targets
   - Satisfaction targets

Consider the organization's maturity level, culture, and readiness when designing the program. Make it practical and achievable.

Output in JSON format matching the specified schema.
```

---

## Approval Checklist

Before implementation, please confirm:

- [ ] Modal Dialog Service approach is approved
- [ ] Module agent structure is approved
- [ ] Data flow to DIGM, Strategy 120, Parthenon, and Integrity Dashboard is approved
- [ ] Agent system prompts direction is approved
- [ ] Implementation phases timeline is acceptable

---

*Plan created: January 10, 2026*
*Ready for user approval*
