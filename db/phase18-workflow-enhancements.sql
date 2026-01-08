-- ============================================
-- Insight 360 - Phase 18: Enhanced Workflow System
-- Version: 1.0
-- Date: January 2026
-- Description: Extends workflows with Skills integration and HITL modes
-- ============================================

-- ============================================
-- PART 1: EXTEND WORKFLOW_STEPS FOR SKILLS & HITL
-- ============================================

-- Add new columns to workflow_steps for skills and execution modes
ALTER TABLE workflow_steps
ADD COLUMN IF NOT EXISTS skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS execution_mode TEXT DEFAULT 'auto'
    CHECK (execution_mode IN ('auto', 'review', 'gate')),
ADD COLUMN IF NOT EXISTS gate_message TEXT,
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS timeout_minutes INTEGER,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fallback_action TEXT;

COMMENT ON COLUMN workflow_steps.skill_id IS 'Optional skill to provide instructions for this step';
COMMENT ON COLUMN workflow_steps.execution_mode IS 'auto=run without stopping, review=run then show for approval, gate=full stop until human action';
COMMENT ON COLUMN workflow_steps.gate_message IS 'Message shown when step requires human interaction';
COMMENT ON COLUMN workflow_steps.requires_approval IS 'If true, output must be approved before proceeding';
COMMENT ON COLUMN workflow_steps.timeout_minutes IS 'Max time to wait for step completion';
COMMENT ON COLUMN workflow_steps.retry_count IS 'Number of times to retry on failure';
COMMENT ON COLUMN workflow_steps.fallback_action IS 'What to do if step fails (skip, abort, prompt_user)';

-- Add new step types to support more workflow patterns
-- First drop the old constraint and create a new one
ALTER TABLE workflow_steps DROP CONSTRAINT IF EXISTS workflow_steps_step_type_check;
ALTER TABLE workflow_steps ADD CONSTRAINT workflow_steps_step_type_check
    CHECK (step_type IN (
        'agent_chat',        -- Chat with an agent (existing)
        'user_input',        -- Collect user input (existing)
        'review',            -- Review previous output (existing)
        'decision',          -- Make a choice (existing)
        'output',            -- Generate final output (existing)
        'context_load',      -- Load context assets (existing)
        'skill_execution',   -- Execute a skill with optional agent
        'research',          -- Deep research step (uses Perplexity)
        'human_gate',        -- Stop and wait for human action
        'context_creation',  -- Create a new context asset
        'parallel',          -- Run multiple sub-steps in parallel
        'conditional',       -- Conditional branching
        'loop',              -- Loop over items
        'artifact_generation' -- Generate document/file output
    ));

-- ============================================
-- PART 2: WORKFLOW_STEP_EXECUTIONS TABLE
-- Track individual step executions separately
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_step_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,

    -- Execution state
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'waiting_approval', 'approved', 'rejected', 'completed', 'skipped', 'failed')),

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

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_step_executions_execution ON workflow_step_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_step_executions_step ON workflow_step_executions(step_id);
CREATE INDEX IF NOT EXISTS idx_step_executions_status ON workflow_step_executions(status);
CREATE INDEX IF NOT EXISTS idx_step_executions_gate ON workflow_step_executions(gate_status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_workflow_step_executions_updated_at ON workflow_step_executions;
CREATE TRIGGER update_workflow_step_executions_updated_at
    BEFORE UPDATE ON workflow_step_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE workflow_step_executions IS 'Individual step execution records within a workflow execution';

-- ============================================
-- PART 3: WORKFLOW_TEMPLATES TABLE
-- Reusable workflow templates
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_templates (
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
    template_definition JSONB NOT NULL,  -- Full workflow definition as JSON

    -- Configuration
    estimated_minutes INTEGER,
    difficulty_level TEXT DEFAULT 'intermediate'
        CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    version TEXT DEFAULT '1.0.0',

    -- Usage
    usage_count INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(name)
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_suite ON workflow_templates(suite);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_tags ON workflow_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_active ON workflow_templates(is_active);

DROP TRIGGER IF EXISTS update_workflow_templates_updated_at ON workflow_templates;
CREATE TRIGGER update_workflow_templates_updated_at
    BEFORE UPDATE ON workflow_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE workflow_templates IS 'Reusable workflow templates that users can instantiate';

-- ============================================
-- PART 4: WORKFLOW_CONTEXT_ASSETS TABLE
-- Link workflows to required context assets
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_context_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    context_asset_type TEXT NOT NULL,  -- 'brand_guidelines', 'voice_dna', etc.

    -- Configuration
    is_required BOOLEAN DEFAULT true,
    inject_at_steps INTEGER[] DEFAULT '{}',  -- Which steps to inject at (empty = all)
    max_tokens INTEGER,

    -- Mapping
    context_asset_id UUID REFERENCES context_assets(id) ON DELETE SET NULL,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(workflow_id, context_asset_type)
);

CREATE INDEX IF NOT EXISTS idx_workflow_context_workflow ON workflow_context_assets(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_context_type ON workflow_context_assets(context_asset_type);

COMMENT ON TABLE workflow_context_assets IS 'Maps context asset requirements to workflows';

-- ============================================
-- PART 5: EXTEND WORKFLOWS TABLE
-- Add more configuration options
-- ============================================

ALTER TABLE workflows
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES workflow_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS suite TEXT DEFAULT 'execute'
    CHECK (suite IN ('align', 'strategy', 'execute')),
ADD COLUMN IF NOT EXISTS prerequisites JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS outputs JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS default_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}';

COMMENT ON COLUMN workflows.template_id IS 'Template this workflow was created from';
COMMENT ON COLUMN workflows.suite IS 'Which suite this workflow belongs to';
COMMENT ON COLUMN workflows.prerequisites IS 'Prerequisites that must be met before starting';
COMMENT ON COLUMN workflows.outputs IS 'Expected outputs from this workflow';
COMMENT ON COLUMN workflows.default_agent_id IS 'Default agent for steps without specific agent';
COMMENT ON COLUMN workflows.notification_settings IS 'Settings for notifications (email, webhook, etc.)';

-- ============================================
-- PART 6: ROW LEVEL SECURITY
-- ============================================

ALTER TABLE workflow_step_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_context_assets ENABLE ROW LEVEL SECURITY;

-- Workflow Step Executions (inherit from parent execution)
CREATE POLICY "Users can view own step executions" ON workflow_step_executions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workflow_executions we
            WHERE we.id = workflow_step_executions.execution_id
            AND we.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own step executions" ON workflow_step_executions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM workflow_executions we
            WHERE we.id = workflow_step_executions.execution_id
            AND we.user_id = auth.uid()
        )
    );

-- Workflow Templates (public read, admin write)
CREATE POLICY "Anyone can view active templates" ON workflow_templates
    FOR SELECT USING (is_active = true);

-- Workflow Context Assets (inherit from workflow)
CREATE POLICY "Users can view workflow context assets" ON workflow_context_assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workflows w
            WHERE w.id = workflow_context_assets.workflow_id
            AND (w.user_id = auth.uid() OR w.is_public = true OR w.user_id IS NULL)
        )
    );

CREATE POLICY "Users can manage own workflow context assets" ON workflow_context_assets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM workflows w
            WHERE w.id = workflow_context_assets.workflow_id
            AND w.user_id = auth.uid()
        )
    );

-- ============================================
-- PART 7: VIEWS
-- ============================================

-- Workflow with full step details
CREATE OR REPLACE VIEW workflow_full AS
SELECT
    w.id,
    w.user_id,
    w.department_id,
    w.name,
    w.description,
    w.icon,
    w.color,
    w.category,
    w.suite,
    w.tags,
    w.estimated_minutes,
    w.is_active,
    w.is_public,
    w.is_system,
    w.template_id,
    w.prerequisites,
    w.outputs,
    w.default_agent_id,
    w.usage_count,
    w.created_at,
    w.updated_at,
    COALESCE(
        json_agg(
            jsonb_build_object(
                'id', ws.id,
                'step_number', ws.step_number,
                'name', ws.name,
                'description', ws.description,
                'step_type', ws.step_type,
                'execution_mode', ws.execution_mode,
                'agent_id', ws.agent_id,
                'agent_name', a.name,
                'skill_id', ws.skill_id,
                'skill_name', s.display_name,
                'prompt_template', ws.prompt_template,
                'input_fields', ws.input_fields,
                'output_variable', ws.output_variable,
                'requires_approval', ws.requires_approval,
                'gate_message', ws.gate_message
            ) ORDER BY ws.step_number
        ) FILTER (WHERE ws.id IS NOT NULL),
        '[]'
    ) as steps,
    COUNT(DISTINCT ws.id) as step_count,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'type', wca.context_asset_type,
                'is_required', wca.is_required,
                'asset_id', wca.context_asset_id
            )
        ) FILTER (WHERE wca.id IS NOT NULL),
        '[]'
    ) as context_requirements
FROM workflows w
LEFT JOIN workflow_steps ws ON w.id = ws.workflow_id
LEFT JOIN agents a ON ws.agent_id = a.id
LEFT JOIN skills s ON ws.skill_id = s.id
LEFT JOIN workflow_context_assets wca ON w.id = wca.workflow_id
GROUP BY w.id;

COMMENT ON VIEW workflow_full IS 'Complete workflow with all steps and context requirements';

-- Execution progress view
CREATE OR REPLACE VIEW workflow_execution_progress AS
SELECT
    we.id as execution_id,
    we.workflow_id,
    w.name as workflow_name,
    we.user_id,
    we.status as execution_status,
    we.current_step,
    COUNT(DISTINCT ws.id) as total_steps,
    COUNT(DISTINCT wse.id) FILTER (WHERE wse.status = 'completed') as completed_steps,
    COUNT(DISTINCT wse.id) FILTER (WHERE wse.status = 'waiting_approval') as pending_approvals,
    we.variables,
    we.started_at,
    we.completed_at,
    EXTRACT(EPOCH FROM (COALESCE(we.completed_at, NOW()) - we.started_at))::INTEGER as elapsed_seconds,
    COALESCE(
        json_agg(
            jsonb_build_object(
                'step_number', wse.step_number,
                'step_name', ws.name,
                'status', wse.status,
                'gate_status', wse.gate_status,
                'started_at', wse.started_at,
                'completed_at', wse.completed_at
            ) ORDER BY wse.step_number
        ) FILTER (WHERE wse.id IS NOT NULL),
        '[]'
    ) as step_progress
FROM workflow_executions we
JOIN workflows w ON we.workflow_id = w.id
LEFT JOIN workflow_steps ws ON w.id = ws.workflow_id
LEFT JOIN workflow_step_executions wse ON we.id = wse.execution_id AND ws.id = wse.step_id
GROUP BY we.id, w.id;

COMMENT ON VIEW workflow_execution_progress IS 'Execution progress with step-by-step status';

-- ============================================
-- PART 8: UPDATE SKILLS TABLE FOR WORKFLOW CONTEXT
-- Add workflow-specific fields to skills
-- ============================================

ALTER TABLE skills
ADD COLUMN IF NOT EXISTS is_workflow_skill BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS produces_context_type TEXT,
ADD COLUMN IF NOT EXISTS research_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS research_provider TEXT
    CHECK (research_provider IS NULL OR research_provider IN ('perplexity', 'brave', 'tavily', 'serper'));

COMMENT ON COLUMN skills.is_workflow_skill IS 'True if this skill is designed for workflow integration';
COMMENT ON COLUMN skills.produces_context_type IS 'Context asset type this skill produces (e.g., brand_guidelines)';
COMMENT ON COLUMN skills.research_enabled IS 'Whether this skill can use web research';
COMMENT ON COLUMN skills.research_provider IS 'Preferred research provider for this skill';

-- Update the brand-guidelines-generator skill to be a workflow skill
UPDATE skills
SET
    is_workflow_skill = true,
    produces_context_type = 'brand_guidelines'
WHERE name = 'brand-guidelines-generator';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'PHASE 18: WORKFLOW ENHANCEMENTS COMPLETE';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'New Tables:';
    RAISE NOTICE '  - workflow_step_executions (individual step tracking)';
    RAISE NOTICE '  - workflow_templates (reusable templates)';
    RAISE NOTICE '  - workflow_context_assets (context requirements)';
    RAISE NOTICE '';
    RAISE NOTICE 'Extended workflow_steps with:';
    RAISE NOTICE '  - skill_id (link to skills)';
    RAISE NOTICE '  - execution_mode (auto/review/gate)';
    RAISE NOTICE '  - gate_message, requires_approval';
    RAISE NOTICE '  - timeout_minutes, retry_count, fallback_action';
    RAISE NOTICE '';
    RAISE NOTICE 'New step types:';
    RAISE NOTICE '  - skill_execution, research, human_gate';
    RAISE NOTICE '  - context_creation, parallel, conditional';
    RAISE NOTICE '  - loop, artifact_generation';
    RAISE NOTICE '';
    RAISE NOTICE 'Extended skills with:';
    RAISE NOTICE '  - is_workflow_skill, produces_context_type';
    RAISE NOTICE '  - research_enabled, research_provider';
    RAISE NOTICE '';
    RAISE NOTICE 'Views:';
    RAISE NOTICE '  - workflow_full (complete workflow with steps)';
    RAISE NOTICE '  - workflow_execution_progress (execution tracking)';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
