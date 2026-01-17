-- ============================================================================
-- INSIGHT 360 - Phase 32: Execute 120 Strategy Integration Schema
-- Version: 1.0.0
-- Date: January 17, 2026
--
-- This schema creates the integration layer between Execute 120 (workflows)
-- and Strategy 120 (initiatives, OKRs, decisions) to enable closed-loop
-- strategy execution tracking.
-- ============================================================================

-- ============================================================================
-- WORKFLOW-INITIATIVE MAPPINGS
-- Links workflows to the strategic initiatives they support
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_initiative_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    initiative_id UUID NOT NULL REFERENCES strategy_initiatives(id) ON DELETE CASCADE,

    -- Contribution type describes how the workflow supports the initiative
    contribution_type TEXT NOT NULL DEFAULT 'supports'
        CHECK (contribution_type IN ('supports', 'implements', 'measures', 'enables')),

    -- Weight of this workflow's contribution to initiative progress (0-100)
    contribution_weight INTEGER DEFAULT 10 CHECK (contribution_weight >= 0 AND contribution_weight <= 100),

    -- Optional description of how this workflow supports the initiative
    description TEXT,

    -- Active flag for soft-disable
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate mappings
    UNIQUE(workflow_id, initiative_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_wim_user ON workflow_initiative_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_wim_workflow ON workflow_initiative_mappings(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wim_initiative ON workflow_initiative_mappings(initiative_id);
CREATE INDEX IF NOT EXISTS idx_wim_active ON workflow_initiative_mappings(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- INITIATIVE PROGRESS TRACKING
-- Tracks how workflow executions contribute to initiative progress
-- ============================================================================

CREATE TABLE IF NOT EXISTS initiative_progress_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    initiative_id UUID NOT NULL REFERENCES strategy_initiatives(id) ON DELETE CASCADE,

    -- Source of progress update
    source_type TEXT NOT NULL DEFAULT 'workflow_execution'
        CHECK (source_type IN ('workflow_execution', 'manual', 'milestone', 'okr_update')),

    -- Reference to workflow execution (if applicable)
    workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,

    -- Progress details
    progress_increment NUMERIC(5,2) DEFAULT 0 CHECK (progress_increment >= 0 AND progress_increment <= 100),
    previous_progress NUMERIC(5,2) DEFAULT 0,
    new_progress NUMERIC(5,2) DEFAULT 0,

    -- Description of what was accomplished
    description TEXT,

    -- Optional business impact from the execution
    business_impact JSONB DEFAULT '{}',

    -- Timestamps
    recorded_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate entries for same execution
    UNIQUE(initiative_id, workflow_execution_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ipe_user ON initiative_progress_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ipe_initiative ON initiative_progress_entries(initiative_id);
CREATE INDEX IF NOT EXISTS idx_ipe_execution ON initiative_progress_entries(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_ipe_source ON initiative_progress_entries(source_type);
CREATE INDEX IF NOT EXISTS idx_ipe_recorded ON initiative_progress_entries(recorded_at DESC);

-- ============================================================================
-- WORKFLOW-OKR MAPPINGS
-- Links workflows to OKRs they help achieve
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_okr_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    okr_id UUID NOT NULL,  -- References okrs table

    -- How this workflow contributes to the OKR
    contribution_type TEXT NOT NULL DEFAULT 'supports'
        CHECK (contribution_type IN ('supports', 'measures', 'drives')),

    -- Weight of contribution (0-100)
    contribution_weight INTEGER DEFAULT 10 CHECK (contribution_weight >= 0 AND contribution_weight <= 100),

    -- Active flag
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicates
    UNIQUE(workflow_id, okr_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wom_user ON workflow_okr_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_wom_workflow ON workflow_okr_mappings(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wom_okr ON workflow_okr_mappings(okr_id);

-- ============================================================================
-- DEPARTMENT-INITIATIVE ASSIGNMENTS
-- Assigns strategic initiatives to departments for execution
-- ============================================================================

CREATE TABLE IF NOT EXISTS department_initiative_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    initiative_id UUID NOT NULL REFERENCES strategy_initiatives(id) ON DELETE CASCADE,

    -- Assignment details
    assignment_type TEXT NOT NULL DEFAULT 'contributor'
        CHECK (assignment_type IN ('owner', 'contributor', 'stakeholder', 'informed')),

    -- Department's responsibility weight (0-100)
    responsibility_weight INTEGER DEFAULT 25 CHECK (responsibility_weight >= 0 AND responsibility_weight <= 100),

    -- Optional notes about department's role
    notes TEXT,

    -- Active flag
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicates
    UNIQUE(department_id, initiative_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dia_user ON department_initiative_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_dia_department ON department_initiative_assignments(department_id);
CREATE INDEX IF NOT EXISTS idx_dia_initiative ON department_initiative_assignments(initiative_id);
CREATE INDEX IF NOT EXISTS idx_dia_type ON department_initiative_assignments(assignment_type);

-- ============================================================================
-- EXTEND EXISTING TABLES
-- ============================================================================

-- Add initiative tracking to workflow_executions
ALTER TABLE workflow_executions
ADD COLUMN IF NOT EXISTS initiative_id UUID REFERENCES strategy_initiatives(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS related_decision_id UUID,  -- References decision_log
ADD COLUMN IF NOT EXISTS business_impact JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS progress_contribution NUMERIC(5,2) DEFAULT 0;

-- Add strategic alignment to workflows
ALTER TABLE workflows
ADD COLUMN IF NOT EXISTS supports_initiative_types TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS related_perspective TEXT CHECK (related_perspective IN ('financial', 'customer', 'internal_process', 'learning_growth', NULL)),
ADD COLUMN IF NOT EXISTS expected_outcome TEXT,
ADD COLUMN IF NOT EXISTS success_criteria JSONB DEFAULT '{}';

-- Add progress tracking to strategy_initiatives
ALTER TABLE strategy_initiatives
ADD COLUMN IF NOT EXISTS current_progress NUMERIC(5,2) DEFAULT 0 CHECK (current_progress >= 0 AND current_progress <= 100),
ADD COLUMN IF NOT EXISTS progress_updated_at TIMESTAMPTZ;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_we_initiative ON workflow_executions(initiative_id);
CREATE INDEX IF NOT EXISTS idx_workflows_perspective ON workflows(related_perspective);
CREATE INDEX IF NOT EXISTS idx_si_progress ON strategy_initiatives(current_progress);

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- Department strategic overview: Shows initiatives assigned to each department
CREATE OR REPLACE VIEW department_strategic_overview AS
SELECT
    d.id AS department_id,
    d.name AS department_name,
    d.slug,
    COUNT(DISTINCT dia.initiative_id) AS initiative_count,
    COUNT(DISTINCT CASE WHEN si.status = 'in_progress' THEN si.id END) AS active_initiatives,
    AVG(si.current_progress) AS avg_initiative_progress,
    COUNT(DISTINCT w.id) AS workflow_count,
    COUNT(DISTINCT we.id) FILTER (WHERE we.status = 'completed') AS completed_executions
FROM departments d
LEFT JOIN department_initiative_assignments dia ON d.id = dia.department_id AND dia.is_active = TRUE
LEFT JOIN strategy_initiatives si ON dia.initiative_id = si.id
LEFT JOIN department_agents da ON d.id = da.department_id
LEFT JOIN workflows w ON w.department_id = d.id
LEFT JOIN workflow_executions we ON w.id = we.workflow_id
GROUP BY d.id, d.name, d.slug;

-- Initiative execution summary: Shows workflow execution stats per initiative
CREATE OR REPLACE VIEW initiative_execution_summary AS
SELECT
    si.id AS initiative_id,
    si.name AS initiative_name,
    si.status,
    si.current_progress,
    si.priority,
    COUNT(DISTINCT wim.workflow_id) AS linked_workflows,
    COUNT(DISTINCT we.id) AS total_executions,
    COUNT(DISTINCT we.id) FILTER (WHERE we.status = 'completed') AS completed_executions,
    MAX(we.completed_at) AS last_execution_at,
    SUM(ipe.progress_increment) AS total_progress_from_workflows
FROM strategy_initiatives si
LEFT JOIN workflow_initiative_mappings wim ON si.id = wim.initiative_id AND wim.is_active = TRUE
LEFT JOIN workflow_executions we ON wim.workflow_id = we.workflow_id
LEFT JOIN initiative_progress_entries ipe ON si.id = ipe.initiative_id
GROUP BY si.id, si.name, si.status, si.current_progress, si.priority;

-- Workflow strategic alignment: Shows which workflows support which initiatives
CREATE OR REPLACE VIEW workflow_strategic_alignment AS
SELECT
    w.id AS workflow_id,
    w.name AS workflow_name,
    w.category,
    w.related_perspective,
    si.id AS initiative_id,
    si.name AS initiative_name,
    si.perspective_type AS initiative_perspective,
    wim.contribution_type,
    wim.contribution_weight,
    d.name AS department_name
FROM workflows w
LEFT JOIN workflow_initiative_mappings wim ON w.id = wim.workflow_id AND wim.is_active = TRUE
LEFT JOIN strategy_initiatives si ON wim.initiative_id = si.id
LEFT JOIN departments d ON w.department_id = d.id
WHERE w.is_active = TRUE;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE workflow_initiative_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiative_progress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_okr_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_initiative_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for workflow_initiative_mappings
CREATE POLICY wim_select ON workflow_initiative_mappings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY wim_insert ON workflow_initiative_mappings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY wim_update ON workflow_initiative_mappings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY wim_delete ON workflow_initiative_mappings FOR DELETE USING (auth.uid() = user_id);

-- Policies for initiative_progress_entries
CREATE POLICY ipe_select ON initiative_progress_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ipe_insert ON initiative_progress_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ipe_update ON initiative_progress_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY ipe_delete ON initiative_progress_entries FOR DELETE USING (auth.uid() = user_id);

-- Policies for workflow_okr_mappings
CREATE POLICY wom_select ON workflow_okr_mappings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY wom_insert ON workflow_okr_mappings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY wom_update ON workflow_okr_mappings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY wom_delete ON workflow_okr_mappings FOR DELETE USING (auth.uid() = user_id);

-- Policies for department_initiative_assignments
CREATE POLICY dia_select ON department_initiative_assignments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY dia_insert ON department_initiative_assignments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY dia_update ON department_initiative_assignments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY dia_delete ON department_initiative_assignments FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to new tables
DROP TRIGGER IF EXISTS update_wim_updated_at ON workflow_initiative_mappings;
CREATE TRIGGER update_wim_updated_at BEFORE UPDATE ON workflow_initiative_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wom_updated_at ON workflow_okr_mappings;
CREATE TRIGGER update_wom_updated_at BEFORE UPDATE ON workflow_okr_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dia_updated_at ON department_initiative_assignments;
CREATE TRIGGER update_dia_updated_at BEFORE UPDATE ON department_initiative_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE workflow_initiative_mappings IS 'Links workflows to strategic initiatives they support';
COMMENT ON TABLE initiative_progress_entries IS 'Tracks progress updates to initiatives from various sources';
COMMENT ON TABLE workflow_okr_mappings IS 'Links workflows to OKRs they help achieve';
COMMENT ON TABLE department_initiative_assignments IS 'Assigns strategic initiatives to departments';

COMMENT ON VIEW department_strategic_overview IS 'Shows initiative and workflow stats per department';
COMMENT ON VIEW initiative_execution_summary IS 'Shows workflow execution metrics per initiative';
COMMENT ON VIEW workflow_strategic_alignment IS 'Shows which workflows support which initiatives';
