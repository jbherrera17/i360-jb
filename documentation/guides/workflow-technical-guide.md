# Workflow System Technical Guide

## Overview

The Workflow System in Insight 360 (Phase 18) provides a flexible, extensible framework for building and executing multi-step automated processes. It integrates with the Skills system, supports human-in-the-loop (HITL) patterns, and provides comprehensive execution tracking.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW SYSTEM (Phase 18)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │    Frontend      │  │    API Layer     │  │   Database Layer     │  │
│  │                  │  │                  │  │                      │  │
│  │ workflow-builder │──│ /api/workflows   │──│ workflows            │  │
│  │ .html            │  │                  │  │ workflow_steps       │  │
│  │                  │  │ /api/workflows/  │  │ workflow_executions  │  │
│  │ workflow-run     │  │ executions       │  │ workflow_step_       │  │
│  │ .html            │  │                  │  │   executions         │  │
│  │                  │  │                  │  │ workflow_templates   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                    INTEGRATIONS                                     ││
│  │  Skills | Agents | Context Assets | Actions | LLM Services          ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### Execution Flow

```
                    ┌─────────────────────┐
                    │   User Initiates    │
                    │   Workflow          │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Create Execution   │
                    │  Record             │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        ┌───────────┐   ┌───────────┐   ┌───────────┐
        │ User Input│   │Agent Chat │   │Human Gate │
        │   Step    │   │   Step    │   │   Step    │
        └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
              │               │               │
              │         ┌─────▼─────┐         │
              │         │ LLM Call  │         │
              │         │ w/Context │         │
              │         └─────┬─────┘         │
              │               │               │
              └───────────────┼───────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Save Step Result │
                    │  to Execution     │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Next Step or     │
                    │  Complete         │
                    └───────────────────┘
```

## Database Schema

### Core Tables

#### workflows
Main workflow definitions.

```sql
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Identity
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'git-branch',
    color TEXT DEFAULT '#8b5cf6',

    -- Classification
    category TEXT DEFAULT 'general',
    suite TEXT DEFAULT 'execute'
        CHECK (suite IN ('align', 'strategy', 'execute')),
    department_id UUID REFERENCES departments(id),

    -- Configuration
    estimated_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### workflow_steps
Individual steps within a workflow.

```sql
CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,

    -- Identity
    name TEXT NOT NULL,
    description TEXT,
    step_number INTEGER NOT NULL,

    -- Step type and configuration
    step_type TEXT NOT NULL CHECK (step_type IN (
        'agent_chat',        -- Chat with an agent
        'user_input',        -- Collect user input
        'review',            -- Review previous output
        'decision',          -- Make a choice
        'output',            -- Generate final output
        'context_load',      -- Load context assets
        'skill_execution',   -- Execute a skill
        'research',          -- Deep research (Perplexity)
        'human_gate',        -- Stop for human action
        'context_creation',  -- Create new context asset
        'parallel',          -- Run sub-steps in parallel
        'conditional',       -- Conditional branching
        'loop',              -- Loop over items
        'artifact_generation' -- Generate document/file
    )),

    -- Configuration (JSON)
    config JSONB DEFAULT '{}',

    -- Skills & HITL integration
    skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
    execution_mode TEXT DEFAULT 'auto'
        CHECK (execution_mode IN ('auto', 'review', 'gate')),
    gate_message TEXT,
    requires_approval BOOLEAN DEFAULT false,
    timeout_minutes INTEGER,
    retry_count INTEGER DEFAULT 0,
    fallback_action TEXT,

    -- Agent reference
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(workflow_id, step_number)
);
```

#### workflow_executions
Track workflow execution instances.

```sql
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Execution state
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),
    current_step INTEGER DEFAULT 1,

    -- Data
    inputs JSONB DEFAULT '{}',
    outputs JSONB DEFAULT '{}',
    context JSONB DEFAULT '{}',

    -- Performance
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### workflow_step_executions
Individual step execution records.

```sql
CREATE TABLE workflow_step_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,

    -- Execution state
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'waiting_approval',
                          'approved', 'rejected', 'completed', 'skipped', 'failed')),

    -- Input/Output
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    output_content TEXT,

    -- Agent/Skill used
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
    model_used TEXT,

    -- For human gates
    gate_status TEXT
        CHECK (gate_status IS NULL OR gate_status IN ('waiting', 'approved', 'rejected', 'bypassed')),
    gate_response TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,

    -- Performance tracking
    tokens_used INTEGER,
    duration_ms INTEGER,
    retry_attempts INTEGER DEFAULT 0,

    -- Error handling
    error_message TEXT,
    error_details JSONB,

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### workflow_templates
Reusable workflow templates.

```sql
CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'git-branch',
    color TEXT DEFAULT '#8b5cf6',

    -- Classification
    category TEXT DEFAULT 'general',
    suite TEXT DEFAULT 'execute'
        CHECK (suite IN ('align', 'strategy', 'execute')),
    tags TEXT[] DEFAULT '{}',

    -- Prerequisites
    required_context_types TEXT[] DEFAULT '{}',
    required_skills TEXT[] DEFAULT '{}',

    -- Template content
    template_definition JSONB NOT NULL,

    -- Configuration
    estimated_minutes INTEGER,
    difficulty_level TEXT DEFAULT 'intermediate'
        CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,

    -- Usage tracking
    usage_count INTEGER DEFAULT 0,

    -- Audit
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

### Base URL: `/api/workflows`

#### Workflow CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all workflows (filtered by user) |
| GET | `/:id` | Get workflow with steps |
| POST | `/` | Create new workflow |
| PUT | `/:id` | Update workflow |
| DELETE | `/:id` | Delete workflow |

#### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/templates` | List available templates |
| POST | `/from-template/:templateId` | Create workflow from template |

#### Steps

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/:id/steps` | Add step to workflow |
| PUT | `/:id/steps/:stepId` | Update step |
| DELETE | `/:id/steps/:stepId` | Delete step |
| PUT | `/:id/steps/reorder` | Reorder steps |

#### Executions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/:id/execute` | Start workflow execution |
| GET | `/executions` | List user's executions |
| GET | `/executions/:executionId` | Get execution details |
| PUT | `/executions/:executionId` | Update execution |
| POST | `/executions/:executionId/steps/:stepNumber` | Execute specific step |
| POST | `/executions/:executionId/cancel` | Cancel execution |

### Request/Response Examples

#### Create Workflow

```javascript
// POST /api/workflows
{
    "name": "Customer Proposal Builder",
    "description": "Generate comprehensive customer proposals",
    "icon": "file-text",
    "color": "#10b981",
    "category": "sales",
    "suite": "execute",
    "estimated_minutes": 30
}

// Response
{
    "success": true,
    "data": {
        "id": "uuid...",
        "name": "Customer Proposal Builder",
        // ... all fields
    }
}
```

#### Add Step

```javascript
// POST /api/workflows/:id/steps
{
    "name": "Gather Customer Info",
    "step_type": "user_input",
    "step_number": 1,
    "config": {
        "fields": [
            {
                "name": "customer_name",
                "label": "Customer Name",
                "type": "text",
                "required": true
            },
            {
                "name": "industry",
                "label": "Industry",
                "type": "select",
                "options": ["Technology", "Finance", "Healthcare"]
            }
        ]
    }
}
```

#### Execute Step

```javascript
// POST /api/workflows/executions/:executionId/steps/:stepNumber
{
    "input": {
        "customer_name": "Acme Corp",
        "industry": "Technology"
    }
}

// Response (for agent_chat step)
{
    "success": true,
    "data": {
        "step_execution_id": "uuid...",
        "status": "completed",
        "output": "Generated proposal content...",
        "tokens_used": 1500,
        "duration_ms": 3200
    }
}
```

## Step Type Configurations

### user_input

```json
{
    "step_type": "user_input",
    "config": {
        "fields": [
            {
                "name": "field_name",
                "label": "Display Label",
                "type": "text|textarea|select|checkbox|number|date",
                "required": true,
                "placeholder": "Enter value...",
                "options": ["option1", "option2"],
                "validation": {
                    "min": 0,
                    "max": 100,
                    "pattern": "regex"
                }
            }
        ]
    }
}
```

### agent_chat

```json
{
    "step_type": "agent_chat",
    "agent_id": "uuid...",
    "config": {
        "prompt_template": "Generate a {{document_type}} for {{customer_name}}",
        "include_previous_outputs": true,
        "context_asset_ids": ["uuid1", "uuid2"],
        "temperature": 0.7,
        "max_tokens": 4000
    }
}
```

### human_gate

```json
{
    "step_type": "human_gate",
    "execution_mode": "gate",
    "gate_message": "Please review the generated proposal before proceeding.",
    "config": {
        "require_comment": true,
        "allowed_actions": ["approve", "reject", "request_changes"],
        "timeout_action": "notify_admin"
    }
}
```

### skill_execution

```json
{
    "step_type": "skill_execution",
    "skill_id": "uuid...",
    "config": {
        "input_mapping": {
            "topic": "{{step1.customer_industry}}",
            "context": "{{step2.output}}"
        },
        "output_format": "markdown"
    }
}
```

### research

```json
{
    "step_type": "research",
    "config": {
        "query_template": "Market analysis for {{industry}} in {{region}}",
        "search_depth": "comprehensive",
        "sources": ["web", "academic", "news"],
        "max_results": 10
    }
}
```

## Frontend Integration

### Workflow Builder (workflow-builder.html)

Key JavaScript functions:

```javascript
// Load workflow for editing
async function loadWorkflow(workflowId) {
    const response = await fetch(`/api/workflows/${workflowId}`);
    // ...
}

// Save workflow
async function saveWorkflow() {
    const response = await fetch(`/api/workflows/${workflow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow)
    });
    // ...
}

// Add step
function addStep(stepType) {
    const step = {
        id: generateTempId(),
        name: `New ${stepType} Step`,
        step_type: stepType,
        step_number: workflow.steps.length + 1,
        config: getDefaultConfig(stepType)
    };
    workflow.steps.push(step);
    renderCanvas();
}

// Drag and drop handling
function handleDrop(event) {
    const stepType = event.dataTransfer.getData('step-type');
    addStep(stepType);
}
```

### Workflow Runner (workflow-run.html)

Key JavaScript functions:

```javascript
// Start execution
async function startExecution(workflowId) {
    const response = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: 'POST'
    });
    const { data: execution } = await response.json();
    loadExecution(execution.id);
}

// Execute current step
async function executeStep(stepNumber, input) {
    const response = await fetch(
        `/api/workflows/executions/${executionId}/steps/${stepNumber}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input })
        }
    );
    // Handle response, update UI, move to next step
}

// Handle human gate approval
async function approveGate(stepNumber, approved, comment) {
    const response = await fetch(
        `/api/workflows/executions/${executionId}/steps/${stepNumber}`,
        {
            method: 'POST',
            body: JSON.stringify({
                gate_action: approved ? 'approve' : 'reject',
                gate_comment: comment
            })
        }
    );
}
```

## Integration with Other Systems

### Skills Integration

Steps can reference Skills for instructions:

```javascript
// When executing a skill_execution step
const skill = await getSkill(step.skill_id);
const prompt = buildPromptFromSkill(skill, stepInput);
const response = await executeWithAgent(step.agent_id, prompt);
```

### Context Assets Integration

Load context dynamically during execution:

```javascript
// For context_load steps
const contextAssets = await loadContextAssets(step.config.asset_ids);
execution.context = {
    ...execution.context,
    ...contextAssets
};
```

### Actions Integration

Workflows can trigger Actions on completion:

```javascript
// On workflow completion
if (workflow.config.on_complete_action_id) {
    await triggerAction(workflow.config.on_complete_action_id, {
        workflow_id: workflow.id,
        execution_id: execution.id,
        outputs: execution.outputs
    });
}
```

## Security

### Row Level Security (RLS)

All workflow tables have RLS enabled:

```sql
-- Users can only see their own workflows (or public ones)
CREATE POLICY "Users can view own workflows" ON workflows
    FOR SELECT USING (
        user_id = auth.uid()
        OR is_public = true
        OR user_id IS NULL
    );

-- Users can only modify their own workflows
CREATE POLICY "Users can modify own workflows" ON workflows
    FOR ALL USING (user_id = auth.uid());
```

### Execution Permissions

- Users can only execute workflows they have access to
- Human gates can specify required approvers
- Sensitive outputs can be redacted from logs

## Performance Considerations

- **Streaming**: Agent chat steps support streaming for real-time feedback
- **Caching**: Template definitions and workflow metadata are cached
- **Async**: Long-running steps can be executed asynchronously
- **Token Budgets**: LLM calls respect configured token limits
- **Retry Logic**: Failed steps can auto-retry with exponential backoff

## Error Handling

```javascript
// Step execution with error handling
try {
    const result = await executeStep(step);
    await updateStepExecution(stepExecution.id, {
        status: 'completed',
        output_data: result
    });
} catch (error) {
    await updateStepExecution(stepExecution.id, {
        status: 'failed',
        error_message: error.message,
        error_details: { stack: error.stack }
    });

    // Check fallback action
    if (step.fallback_action === 'skip') {
        return moveToNextStep();
    } else if (step.fallback_action === 'prompt_user') {
        return showErrorToUser(error);
    } else {
        throw error; // Abort workflow
    }
}
```

## Monitoring & Observability

Workflow executions log to the standard logging system:

```javascript
logger.info('Workflow step executed', {
    workflow_id: workflow.id,
    execution_id: execution.id,
    step_number: step.step_number,
    step_type: step.step_type,
    duration_ms: result.duration_ms,
    tokens_used: result.tokens_used
});
```

Metrics available via `/api/metrics`:
- `workflow_executions_total` - Total executions by status
- `workflow_step_duration_ms` - Step execution duration histogram
- `workflow_tokens_used` - Token usage by workflow

## Migration & Setup

### Run Database Migrations

```bash
# Apply Phase 18 schema
psql $DATABASE_URL -f db/phase18-workflow-enhancements.sql

# Seed sample templates (optional)
psql $DATABASE_URL -f db/seed-thought-leadership-workflow.sql
```

### Verify Installation

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'workflow%';

-- Verify step types
SELECT DISTINCT step_type FROM workflow_steps;

-- Check template count
SELECT COUNT(*) FROM workflow_templates WHERE is_active = true;
```
