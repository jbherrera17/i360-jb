-- ============================================
-- Insight 360 - Phase 10: Execute 120
-- Department-Focused Execution Hub with Workflow Wizards
-- Version: 1.0
-- Date: January 2026
-- ============================================

-- ============================================
-- PART 1: EXTEND DEPARTMENTS FOR EXECUTE 120
-- Add execute-specific fields to departments table
-- ============================================

-- Add Execute 120 specific columns to departments
ALTER TABLE departments
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS quick_prompts TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS use_guide_url TEXT;

COMMENT ON COLUMN departments.tagline IS 'Short inspirational tagline for department (e.g., "Craft magnetic stories that convert")';
COMMENT ON COLUMN departments.metrics IS 'Key metrics array for department dashboard [{name, target, unit}]';
COMMENT ON COLUMN departments.quick_prompts IS 'Ready-to-use prompt templates for this department';
COMMENT ON COLUMN departments.use_guide_url IS 'URL to use case documentation for this department';

-- ============================================
-- PART 2: DEPARTMENT-AGENT MAPPINGS
-- Link agents to departments with priority
-- ============================================

CREATE TABLE IF NOT EXISTS department_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

    -- Display configuration
    is_featured BOOLEAN DEFAULT false,  -- Show prominently
    sort_order INTEGER DEFAULT 50,       -- Display order (lower = first)

    -- Usage hints
    use_case_summary TEXT,               -- Brief description of how to use for this dept

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicates
    UNIQUE(department_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_department_agents_dept ON department_agents(department_id);
CREATE INDEX IF NOT EXISTS idx_department_agents_agent ON department_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_department_agents_featured ON department_agents(is_featured);

COMMENT ON TABLE department_agents IS 'Maps agents to departments with featured status and ordering';

-- ============================================
-- PART 3: WORKFLOW WIZARDS
-- Multi-step executable workflows
-- ============================================

CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,

    -- Basic info
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'zap',
    color TEXT DEFAULT '#6366f1',

    -- Classification
    category TEXT DEFAULT 'general',
    tags TEXT[] DEFAULT '{}',

    -- Estimated time
    estimated_minutes INTEGER,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,  -- Available to all users
    is_system BOOLEAN DEFAULT false,  -- System-provided workflow

    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_user ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_department ON workflows(department_id);
CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category);
CREATE INDEX IF NOT EXISTS idx_workflows_active ON workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflows_public ON workflows(is_public);
CREATE INDEX IF NOT EXISTS idx_workflows_system ON workflows(is_system);
CREATE INDEX IF NOT EXISTS idx_workflows_tags ON workflows USING GIN(tags);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_workflows_updated_at ON workflows;
CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE workflows IS 'Multi-step executable workflows for department-specific tasks';

-- ============================================
-- WORKFLOW STEPS
-- Individual steps within a workflow
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,

    -- Step ordering
    step_number INTEGER NOT NULL,

    -- Step info
    name TEXT NOT NULL,
    description TEXT,
    instructions TEXT,  -- Detailed instructions for this step

    -- Step type
    step_type TEXT NOT NULL DEFAULT 'agent_chat'
        CHECK (step_type IN (
            'agent_chat',     -- Chat with an agent
            'user_input',     -- Collect user input
            'review',         -- Review previous output
            'decision',       -- Make a choice
            'output',         -- Generate final output
            'context_load'    -- Load context assets
        )),

    -- Agent configuration (for agent_chat type)
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    prompt_template TEXT,      -- Template with {{variables}}
    suggested_prompts TEXT[],  -- Alternative prompts

    -- Input configuration (for user_input type)
    input_fields JSONB DEFAULT '[]',  -- [{name, type, label, required, placeholder}]

    -- Decision configuration (for decision type)
    decision_options JSONB DEFAULT '[]',  -- [{label, next_step, description}]

    -- Context configuration (for context_load type)
    context_asset_ids UUID[] DEFAULT '{}',

    -- Output configuration
    output_variable TEXT,      -- Variable name to store output
    output_format TEXT,        -- Expected format (text, json, markdown)

    -- Conditional logic
    condition TEXT,            -- JavaScript-like condition for showing step
    skip_if TEXT,              -- Condition to skip this step

    -- UI configuration
    show_previous_output BOOLEAN DEFAULT true,
    collapsible BOOLEAN DEFAULT false,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure unique step numbers per workflow
    UNIQUE(workflow_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow ON workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_agent ON workflow_steps(agent_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_type ON workflow_steps(step_type);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_order ON workflow_steps(workflow_id, step_number);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_workflow_steps_updated_at ON workflow_steps;
CREATE TRIGGER update_workflow_steps_updated_at
    BEFORE UPDATE ON workflow_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE workflow_steps IS 'Individual steps within a workflow with type-specific configuration';

-- ============================================
-- WORKFLOW EXECUTIONS
-- Track active and completed workflow runs
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Execution state
    status TEXT NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'completed', 'cancelled', 'failed')),
    current_step INTEGER DEFAULT 1,

    -- Variables collected during execution
    variables JSONB DEFAULT '{}',

    -- Step outputs
    step_outputs JSONB DEFAULT '{}',  -- {step_number: output_content}

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Error handling
    error_message TEXT,
    error_step INTEGER,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user ON workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started ON workflow_executions(started_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_workflow_executions_updated_at ON workflow_executions;
CREATE TRIGGER update_workflow_executions_updated_at
    BEFORE UPDATE ON workflow_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE workflow_executions IS 'Active and completed workflow execution instances';

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE department_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- Department Agents (viewable by department owner or if public)
CREATE POLICY "Users can view department agent mappings" ON department_agents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM departments d
            WHERE d.id = department_agents.department_id
            AND (d.user_id = auth.uid() OR d.user_id IS NULL)
        )
    );

CREATE POLICY "Users can manage own department agent mappings" ON department_agents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM departments d
            WHERE d.id = department_agents.department_id
            AND d.user_id = auth.uid()
        )
    );

-- Workflows
CREATE POLICY "Users can view own or public workflows" ON workflows
    FOR SELECT USING (user_id = auth.uid() OR is_public = true OR user_id IS NULL);

CREATE POLICY "Users can insert own workflows" ON workflows
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own workflows" ON workflows
    FOR UPDATE USING (user_id = auth.uid() AND is_system = false);

CREATE POLICY "Users can delete own workflows" ON workflows
    FOR DELETE USING (user_id = auth.uid() AND is_system = false);

-- Workflow Steps (inherit from workflow)
CREATE POLICY "Users can view workflow steps" ON workflow_steps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workflows w
            WHERE w.id = workflow_steps.workflow_id
            AND (w.user_id = auth.uid() OR w.is_public = true OR w.user_id IS NULL)
        )
    );

CREATE POLICY "Users can manage own workflow steps" ON workflow_steps
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM workflows w
            WHERE w.id = workflow_steps.workflow_id
            AND w.user_id = auth.uid()
            AND w.is_system = false
        )
    );

-- Workflow Executions
CREATE POLICY "Users can view own executions" ON workflow_executions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own executions" ON workflow_executions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own executions" ON workflow_executions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own executions" ON workflow_executions
    FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- SEED DATA: SYSTEM WORKFLOWS
-- Pre-built workflows for common tasks
-- ============================================

-- Marketing: Campaign Strategy Workflow
INSERT INTO workflows (id, user_id, department_id, name, description, icon, color, category, estimated_minutes, is_active, is_public, is_system)
VALUES (
    'f0000001-0000-4000-a000-000000000001',
    NULL,
    NULL,  -- Will be linked to Marketing department
    'Campaign Strategy Builder',
    'Develop a comprehensive campaign strategy from objective to measurement plan',
    'layout',
    '#ec4899',
    'marketing',
    30,
    true,
    true,
    true
);

-- Campaign Strategy Steps
INSERT INTO workflow_steps (workflow_id, step_number, name, description, step_type, instructions, input_fields, output_variable, output_format) VALUES
('f0000001-0000-4000-a000-000000000001', 1, 'Define Campaign Objective',
 'Start by clarifying what you want to achieve',
 'user_input',
 'A clear objective is the foundation of any successful campaign. Be specific about the business outcome you want.',
 '[
   {"name": "objective", "type": "textarea", "label": "Campaign Objective", "required": true, "placeholder": "e.g., Generate 500 MQLs for our new product launch"},
   {"name": "budget", "type": "text", "label": "Budget Range", "required": false, "placeholder": "e.g., $50,000"},
   {"name": "timeline", "type": "text", "label": "Timeline", "required": true, "placeholder": "e.g., Q2 2026 (3 months)"}
 ]'::jsonb,
 'campaign_brief',
 'json'
),
('f0000001-0000-4000-a000-000000000001', 2, 'Identify Target Audience',
 'Define who you want to reach with this campaign',
 'user_input',
 'The more specific your audience definition, the more targeted and effective your campaign will be.',
 '[
   {"name": "primary_persona", "type": "text", "label": "Primary Persona", "required": true, "placeholder": "e.g., VP of Marketing at mid-market SaaS companies"},
   {"name": "pain_points", "type": "textarea", "label": "Key Pain Points", "required": true, "placeholder": "What problems does this audience face?"},
   {"name": "buying_stage", "type": "select", "label": "Target Buying Stage", "required": true, "options": ["Awareness", "Consideration", "Decision"]}
 ]'::jsonb,
 'audience_profile',
 'json'
);

INSERT INTO workflow_steps (workflow_id, step_number, name, description, step_type, agent_id, prompt_template, output_variable, output_format) VALUES
('f0000001-0000-4000-a000-000000000001', 3, 'Generate Campaign Strategy',
 'AI will develop a comprehensive campaign strategy based on your inputs',
 'agent_chat',
 'a0000001-0000-4000-a000-000000000204',  -- Campaign Strategist
 'Create a comprehensive campaign strategy based on the following:

**Objective:** {{campaign_brief.objective}}
**Budget:** {{campaign_brief.budget}}
**Timeline:** {{campaign_brief.timeline}}

**Target Audience:**
- Primary Persona: {{audience_profile.primary_persona}}
- Pain Points: {{audience_profile.pain_points}}
- Buying Stage: {{audience_profile.buying_stage}}

Please provide:
1. Campaign theme and big idea
2. Key messaging framework
3. Channel recommendations with rationale
4. Content requirements
5. Success metrics and KPIs
6. High-level timeline',
 'campaign_strategy',
 'markdown'
),
('f0000001-0000-4000-a000-000000000001', 4, 'Review and Refine',
 'Review the generated strategy and request any refinements',
 'review',
 NULL,
 'Review the campaign strategy above. You can ask follow-up questions or request specific refinements.',
 'refined_strategy',
 'markdown'
),
('f0000001-0000-4000-a000-000000000001', 5, 'Generate Campaign Brief',
 'Create a shareable campaign brief document',
 'output',
 NULL,
 NULL,
 'final_brief',
 'markdown'
);

-- Sales: Proposal Generator Workflow
INSERT INTO workflows (id, user_id, department_id, name, description, icon, color, category, estimated_minutes, is_active, is_public, is_system)
VALUES (
    'f0000001-0000-4000-a000-000000000002',
    NULL,
    NULL,
    'Proposal Builder',
    'Create a customized proposal for a prospect',
    'file-text',
    '#10b981',
    'sales',
    20,
    true,
    true,
    true
);

INSERT INTO workflow_steps (workflow_id, step_number, name, description, step_type, instructions, input_fields, output_variable, output_format) VALUES
('f0000001-0000-4000-a000-000000000002', 1, 'Prospect Information',
 'Enter details about the prospect',
 'user_input',
 'Provide key information about the prospect to customize the proposal.',
 '[
   {"name": "company_name", "type": "text", "label": "Company Name", "required": true},
   {"name": "industry", "type": "text", "label": "Industry", "required": true},
   {"name": "company_size", "type": "text", "label": "Company Size", "required": false, "placeholder": "e.g., 500 employees"},
   {"name": "main_contact", "type": "text", "label": "Main Contact & Title", "required": true}
 ]'::jsonb,
 'prospect_info',
 'json'
),
('f0000001-0000-4000-a000-000000000002', 2, 'Pain Points & Requirements',
 'Capture the prospect''s specific needs',
 'user_input',
 'The more specific you are about their pain points, the more compelling the proposal will be.',
 '[
   {"name": "pain_points", "type": "textarea", "label": "Key Pain Points", "required": true, "placeholder": "What problems are they trying to solve?"},
   {"name": "requirements", "type": "textarea", "label": "Specific Requirements", "required": false, "placeholder": "Any must-have features or constraints?"},
   {"name": "decision_criteria", "type": "textarea", "label": "Decision Criteria", "required": false, "placeholder": "What factors will influence their decision?"},
   {"name": "competition", "type": "text", "label": "Competition", "required": false, "placeholder": "Who else are they considering?"}
 ]'::jsonb,
 'requirements',
 'json'
);

INSERT INTO workflow_steps (workflow_id, step_number, name, description, step_type, agent_id, prompt_template, output_variable, output_format) VALUES
('f0000001-0000-4000-a000-000000000002', 3, 'Generate Proposal',
 'AI will create a customized proposal',
 'agent_chat',
 'a0000001-0000-4000-a000-000000000201',  -- Proposal Generator
 'Create a compelling proposal for this prospect:

**Company:** {{prospect_info.company_name}}
**Industry:** {{prospect_info.industry}}
**Size:** {{prospect_info.company_size}}
**Contact:** {{prospect_info.main_contact}}

**Their Pain Points:**
{{requirements.pain_points}}

**Specific Requirements:**
{{requirements.requirements}}

**Decision Criteria:**
{{requirements.decision_criteria}}

**Competition:**
{{requirements.competition}}

Please create a complete proposal including:
1. Executive Summary
2. Understanding of Their Challenges
3. Recommended Solution
4. Implementation Approach
5. Timeline
6. Investment Summary
7. Why Choose Us',
 'proposal_draft',
 'markdown'
),
('f0000001-0000-4000-a000-000000000002', 4, 'Review and Customize',
 'Review and refine the proposal',
 'review',
 NULL,
 'Review the proposal. Request any changes or additions.',
 'final_proposal',
 'markdown'
);

-- Operations: SOP Creator Workflow
INSERT INTO workflows (id, user_id, department_id, name, description, icon, color, category, estimated_minutes, is_active, is_public, is_system)
VALUES (
    'f0000001-0000-4000-a000-000000000003',
    NULL,
    NULL,
    'SOP Creator',
    'Document a standard operating procedure step by step',
    'clipboard-list',
    '#8b5cf6',
    'operations',
    25,
    true,
    true,
    true
);

INSERT INTO workflow_steps (workflow_id, step_number, name, description, step_type, instructions, input_fields, output_variable, output_format) VALUES
('f0000001-0000-4000-a000-000000000003', 1, 'Process Overview',
 'Define the process you want to document',
 'user_input',
 'Start with a high-level description of the process.',
 '[
   {"name": "process_name", "type": "text", "label": "Process Name", "required": true, "placeholder": "e.g., Customer Onboarding"},
   {"name": "process_purpose", "type": "textarea", "label": "Purpose", "required": true, "placeholder": "What does this process accomplish?"},
   {"name": "process_owner", "type": "text", "label": "Process Owner", "required": true, "placeholder": "Role responsible for this process"},
   {"name": "frequency", "type": "select", "label": "Frequency", "required": true, "options": ["Daily", "Weekly", "Monthly", "As Needed", "Per Event"]}
 ]'::jsonb,
 'process_overview',
 'json'
),
('f0000001-0000-4000-a000-000000000003', 2, 'Process Steps',
 'Describe the steps in this process',
 'user_input',
 'List the main steps. You can describe them informally - the AI will structure them properly.',
 '[
   {"name": "current_steps", "type": "textarea", "label": "Current Process Steps", "required": true, "placeholder": "Describe each step, even informally. e.g., First we check the email, then we verify the customer exists in our system..."},
   {"name": "tools_used", "type": "textarea", "label": "Tools & Systems Used", "required": false, "placeholder": "What software, tools, or systems are involved?"},
   {"name": "pain_points", "type": "textarea", "label": "Known Issues or Pain Points", "required": false, "placeholder": "What commonly goes wrong or causes delays?"}
 ]'::jsonb,
 'process_details',
 'json'
);

INSERT INTO workflow_steps (workflow_id, step_number, name, description, step_type, agent_id, prompt_template, output_variable, output_format) VALUES
('f0000001-0000-4000-a000-000000000003', 3, 'Generate SOP Document',
 'AI will create a professional SOP',
 'agent_chat',
 'a0000001-0000-4000-a000-000000000205',  -- Process Documenter
 'Create a comprehensive Standard Operating Procedure (SOP) document for:

**Process:** {{process_overview.process_name}}
**Purpose:** {{process_overview.process_purpose}}
**Owner:** {{process_overview.process_owner}}
**Frequency:** {{process_overview.frequency}}

**Current Steps (as described):**
{{process_details.current_steps}}

**Tools & Systems:**
{{process_details.tools_used}}

**Known Pain Points:**
{{process_details.pain_points}}

Please create a complete SOP with:
1. Document header (title, version, owner, date)
2. Purpose and scope
3. Prerequisites
4. Step-by-step procedure (numbered, with clear actions)
5. Decision points and criteria
6. Exception handling
7. Quality checkpoints
8. Troubleshooting section
9. Related documents placeholder
10. Revision history template',
 'sop_draft',
 'markdown'
),
('f0000001-0000-4000-a000-000000000003', 4, 'Review and Finalize',
 'Review the SOP and make any adjustments',
 'review',
 NULL,
 'Review the SOP. Add any missing details or request changes.',
 'final_sop',
 'markdown'
);

-- Executive: Board Prep Workflow
INSERT INTO workflows (id, user_id, department_id, name, description, icon, color, category, estimated_minutes, is_active, is_public, is_system)
VALUES (
    'f0000001-0000-4000-a000-000000000004',
    NULL,
    NULL,
    'Board Meeting Prep',
    'Prepare comprehensive materials for board meetings',
    'presentation',
    '#6366f1',
    'executive',
    45,
    true,
    true,
    true
);

INSERT INTO workflow_steps (workflow_id, step_number, name, description, step_type, instructions, input_fields, output_variable, output_format) VALUES
('f0000001-0000-4000-a000-000000000004', 1, 'Meeting Context',
 'Set the context for this board meeting',
 'user_input',
 'Provide context about this specific board meeting.',
 '[
   {"name": "meeting_date", "type": "text", "label": "Meeting Date", "required": true},
   {"name": "meeting_type", "type": "select", "label": "Meeting Type", "required": true, "options": ["Regular Quarterly", "Annual", "Special Session", "Strategy Review"]},
   {"name": "key_topics", "type": "textarea", "label": "Key Topics to Address", "required": true, "placeholder": "What are the main items for discussion?"},
   {"name": "decisions_needed", "type": "textarea", "label": "Decisions Needed", "required": false, "placeholder": "What decisions do you need from the board?"}
 ]'::jsonb,
 'meeting_context',
 'json'
),
('f0000001-0000-4000-a000-000000000004', 2, 'Performance Data',
 'Enter key performance data',
 'user_input',
 'Provide the key metrics and performance data.',
 '[
   {"name": "revenue", "type": "text", "label": "Revenue (Actual vs Plan)", "required": true, "placeholder": "e.g., $5.2M vs $5.0M plan"},
   {"name": "key_metrics", "type": "textarea", "label": "Other Key Metrics", "required": true, "placeholder": "List other important KPIs and their status"},
   {"name": "highlights", "type": "textarea", "label": "Key Highlights", "required": true, "placeholder": "Major wins, milestones, accomplishments"},
   {"name": "challenges", "type": "textarea", "label": "Challenges & Risks", "required": true, "placeholder": "Current challenges and how you''re addressing them"}
 ]'::jsonb,
 'performance_data',
 'json'
);

INSERT INTO workflow_steps (workflow_id, step_number, name, description, step_type, agent_id, prompt_template, output_variable, output_format) VALUES
('f0000001-0000-4000-a000-000000000004', 3, 'Generate Board Materials',
 'AI will create comprehensive board materials',
 'agent_chat',
 'a0000001-0000-4000-a000-000000000203',  -- Executive Communication Specialist
 'Create comprehensive board meeting materials for:

**Meeting Date:** {{meeting_context.meeting_date}}
**Meeting Type:** {{meeting_context.meeting_type}}
**Key Topics:** {{meeting_context.key_topics}}
**Decisions Needed:** {{meeting_context.decisions_needed}}

**Performance Data:**
- Revenue: {{performance_data.revenue}}
- Key Metrics: {{performance_data.key_metrics}}
- Highlights: {{performance_data.highlights}}
- Challenges: {{performance_data.challenges}}

Please create:
1. Executive Summary (1 page max)
2. Financial Performance narrative
3. Operational highlights
4. Strategic progress update
5. Risk and opportunity assessment
6. Forward-looking guidance
7. Decision items with recommendations
8. Appendix outline for supporting data
9. Anticipated board questions with suggested responses',
 'board_materials',
 'markdown'
),
('f0000001-0000-4000-a000-000000000004', 4, 'Anticipate Questions',
 'Generate likely board questions',
 'agent_chat',
 'a0000001-0000-4000-a000-000000000005',  -- First Principles Thinker
 'Based on this board meeting context, what questions are board members likely to ask?

**Context:**
{{board_materials}}

Please provide:
1. Top 10 likely questions
2. Suggested responses for each
3. Supporting data points to have ready
4. Potential follow-up questions',
 'qa_prep',
 'markdown'
),
('f0000001-0000-4000-a000-000000000004', 5, 'Final Review',
 'Review all materials',
 'review',
 NULL,
 'Review the complete board prep materials. Make any final adjustments.',
 'final_materials',
 'markdown'
);

-- Finance: Investment Analysis Workflow
INSERT INTO workflows (id, user_id, department_id, name, description, icon, color, category, estimated_minutes, is_active, is_public, is_system)
VALUES (
    'f0000001-0000-4000-a000-000000000005',
    NULL,
    NULL,
    'Investment Analysis',
    'Analyze a potential investment or major expenditure',
    'trending-up',
    '#f59e0b',
    'finance',
    30,
    true,
    true,
    true
);

INSERT INTO workflow_steps (workflow_id, step_number, name, description, step_type, instructions, input_fields, output_variable, output_format) VALUES
('f0000001-0000-4000-a000-000000000005', 1, 'Investment Overview',
 'Describe the investment opportunity',
 'user_input',
 'Provide details about the investment you want to analyze.',
 '[
   {"name": "investment_name", "type": "text", "label": "Investment/Project Name", "required": true},
   {"name": "investment_type", "type": "select", "label": "Type", "required": true, "options": ["Capital Expenditure", "Software/Technology", "Hiring/Team", "M&A", "Marketing Campaign", "Other"]},
   {"name": "amount", "type": "text", "label": "Investment Amount", "required": true, "placeholder": "e.g., $500,000"},
   {"name": "timeline", "type": "text", "label": "Investment Timeline", "required": true, "placeholder": "e.g., 18 months"},
   {"name": "description", "type": "textarea", "label": "Description", "required": true, "placeholder": "What is this investment and why are we considering it?"}
 ]'::jsonb,
 'investment_overview',
 'json'
),
('f0000001-0000-4000-a000-000000000005', 2, 'Expected Returns',
 'Define expected benefits and returns',
 'user_input',
 'Quantify the expected returns as specifically as possible.',
 '[
   {"name": "expected_benefits", "type": "textarea", "label": "Expected Benefits", "required": true, "placeholder": "What value will this create? Be specific."},
   {"name": "revenue_impact", "type": "text", "label": "Revenue Impact (if applicable)", "required": false, "placeholder": "e.g., +$2M ARR"},
   {"name": "cost_savings", "type": "text", "label": "Cost Savings (if applicable)", "required": false, "placeholder": "e.g., -$300K/year"},
   {"name": "strategic_value", "type": "textarea", "label": "Strategic Value", "required": false, "placeholder": "Non-financial strategic benefits"}
 ]'::jsonb,
 'expected_returns',
 'json'
);

INSERT INTO workflow_steps (workflow_id, step_number, name, description, step_type, agent_id, prompt_template, output_variable, output_format) VALUES
('f0000001-0000-4000-a000-000000000005', 3, 'Generate Investment Analysis',
 'AI will create a comprehensive analysis',
 'agent_chat',
 'a0000001-0000-4000-a000-000000000005',  -- First Principles Thinker
 'Analyze this investment opportunity:

**Investment:** {{investment_overview.investment_name}}
**Type:** {{investment_overview.investment_type}}
**Amount:** {{investment_overview.amount}}
**Timeline:** {{investment_overview.timeline}}
**Description:** {{investment_overview.description}}

**Expected Returns:**
- Benefits: {{expected_returns.expected_benefits}}
- Revenue Impact: {{expected_returns.revenue_impact}}
- Cost Savings: {{expected_returns.cost_savings}}
- Strategic Value: {{expected_returns.strategic_value}}

Please provide:
1. Investment Summary
2. Financial Analysis
   - ROI calculation
   - Payback period
   - NPV considerations
3. Risk Assessment
   - Key risks
   - Probability and impact
   - Mitigation strategies
4. Strategic Alignment
   - How does this fit our strategy?
   - Opportunity cost
5. Sensitivity Analysis
   - Best case scenario
   - Base case scenario
   - Worst case scenario
6. Recommendation with conditions',
 'investment_analysis',
 'markdown'
),
('f0000001-0000-4000-a000-000000000005', 4, 'Risk Deep Dive',
 'Identify and assess risks',
 'agent_chat',
 'a0000001-0000-4000-a000-000000000102',  -- Risk Sentinel
 'Perform a detailed risk assessment for this investment:

**Investment:** {{investment_overview.investment_name}}
**Amount:** {{investment_overview.amount}}

**Initial Analysis:**
{{investment_analysis}}

Please identify:
1. Financial risks
2. Operational risks
3. Market/competitive risks
4. Execution risks
5. Regulatory/compliance risks
6. Reputation risks

For each, provide:
- Probability (High/Medium/Low)
- Impact (High/Medium/Low)
- Early warning indicators
- Mitigation strategies',
 'risk_assessment',
 'markdown'
),
('f0000001-0000-4000-a000-000000000005', 5, 'Final Review',
 'Review the complete analysis',
 'review',
 NULL,
 'Review the investment analysis and risk assessment. Request any additional analysis.',
 'final_analysis',
 'markdown'
);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    workflow_count INTEGER;
    step_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO workflow_count FROM workflows WHERE is_system = true;
    SELECT COUNT(*) INTO step_count FROM workflow_steps;

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'EXECUTE 120 SCHEMA CREATED SUCCESSFULLY';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'New Tables:';
    RAISE NOTICE '  - department_agents (department-agent mappings)';
    RAISE NOTICE '  - workflows (multi-step workflow definitions)';
    RAISE NOTICE '  - workflow_steps (individual steps in workflows)';
    RAISE NOTICE '  - workflow_executions (execution tracking)';
    RAISE NOTICE '';
    RAISE NOTICE 'Department Extensions:';
    RAISE NOTICE '  - tagline, metrics, quick_prompts, use_guide_url';
    RAISE NOTICE '';
    RAISE NOTICE 'System Workflows Created: %', workflow_count;
    RAISE NOTICE 'Total Steps Created: %', step_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Workflows:';
    RAISE NOTICE '  1. Campaign Strategy Builder (Marketing)';
    RAISE NOTICE '  2. Proposal Builder (Sales)';
    RAISE NOTICE '  3. SOP Creator (Operations)';
    RAISE NOTICE '  4. Board Meeting Prep (Executive)';
    RAISE NOTICE '  5. Investment Analysis (Finance)';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
