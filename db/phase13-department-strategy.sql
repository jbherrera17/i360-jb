-- ============================================
-- PHASE 13: DEPARTMENT STRATEGY SCHEMA
-- ============================================
-- This schema implements department-level strategy cascading:
-- - Department objectives linked to company objectives
-- - Department-specific KPIs and key results
-- - Progress tracking per department
--
-- Run: Execute this SQL in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. DEPARTMENT OBJECTIVES
-- ============================================
-- Objectives set by department leadership, linked to company objectives

CREATE TABLE IF NOT EXISTS department_objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,

    -- Link to company objective (optional cascade)
    -- Links to BSC objectives from the S2E (Strategy-to-Execution) module
    parent_company_objective_id UUID REFERENCES bsc_objectives(id) ON DELETE SET NULL,

    -- Objective details
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'strategic', -- 'strategic', 'operational', 'tactical'

    -- Ownership
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Status and timeline
    status TEXT DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed', 'cancelled'
    target_date DATE,
    start_date DATE DEFAULT CURRENT_DATE,

    -- Priority
    priority INTEGER DEFAULT 3, -- 1=highest, 5=lowest

    -- Progress
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dept_objectives_department ON department_objectives(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_objectives_status ON department_objectives(status);
CREATE INDEX IF NOT EXISTS idx_dept_objectives_parent ON department_objectives(parent_company_objective_id);

-- ============================================
-- 2. DEPARTMENT KEY RESULTS
-- ============================================
-- Measurable outcomes for department objectives

CREATE TABLE IF NOT EXISTS department_key_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id UUID NOT NULL REFERENCES department_objectives(id) ON DELETE CASCADE,

    -- Key result details
    title TEXT NOT NULL,
    description TEXT,

    -- Measurement
    metric_type TEXT DEFAULT 'number', -- 'number', 'percentage', 'currency', 'boolean'
    target_value NUMERIC,
    current_value NUMERIC DEFAULT 0,
    unit TEXT, -- 'users', '%', '$', 'deals', etc.

    -- Owner
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Status
    status TEXT DEFAULT 'pending', -- 'pending', 'on_track', 'at_risk', 'behind', 'completed'

    -- Timeline
    target_date DATE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dept_key_results_objective ON department_key_results(objective_id);
CREATE INDEX IF NOT EXISTS idx_dept_key_results_owner ON department_key_results(owner_id);

-- ============================================
-- 3. DEPARTMENT STRATEGY NOTES
-- ============================================
-- Discussion and updates on department strategy

CREATE TABLE IF NOT EXISTS department_strategy_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,

    -- Optional link to specific objective
    objective_id UUID REFERENCES department_objectives(id) ON DELETE CASCADE,

    -- Note content
    note_type TEXT DEFAULT 'update', -- 'update', 'blocker', 'win', 'decision', 'risk'
    content TEXT NOT NULL,

    -- Authorship
    created_by UUID REFERENCES users(id),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dept_notes_department ON department_strategy_notes(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_notes_objective ON department_strategy_notes(objective_id);

-- ============================================
-- 4. DEPARTMENT STRATEGY ACCESS
-- ============================================
-- Track who can view/edit each department's strategy

CREATE TABLE IF NOT EXISTS department_strategy_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Access level
    can_view BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT false,
    can_approve BOOLEAN DEFAULT false,

    -- Grant info
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration

    UNIQUE(department_id, user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_dept_access_user ON department_strategy_access(user_id);

-- ============================================
-- 5. RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE department_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_strategy_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_strategy_access ENABLE ROW LEVEL SECURITY;

-- Department objectives: View based on permissions
CREATE POLICY "Users can view department objectives based on permissions"
ON department_objectives FOR SELECT
TO authenticated
USING (
    -- User is in this department
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.department_id = department_objectives.department_id
    )
    OR
    -- User has explicit access
    EXISTS (
        SELECT 1 FROM department_strategy_access
        WHERE department_strategy_access.department_id = department_objectives.department_id
        AND department_strategy_access.user_id = auth.uid()
        AND department_strategy_access.can_view = true
    )
    OR
    -- User has cross-department view permission
    EXISTS (
        SELECT 1 FROM user_effective_permissions
        WHERE user_effective_permissions.user_id = auth.uid()
        AND user_effective_permissions.can_view_other_depts = true
    )
    OR
    -- Admin
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Department objectives: Edit based on permissions
CREATE POLICY "Users can edit department objectives based on permissions"
ON department_objectives FOR ALL
TO authenticated
USING (
    -- User is owner
    owner_id = auth.uid()
    OR
    -- User has explicit edit access
    EXISTS (
        SELECT 1 FROM department_strategy_access
        WHERE department_strategy_access.department_id = department_objectives.department_id
        AND department_strategy_access.user_id = auth.uid()
        AND department_strategy_access.can_edit = true
    )
    OR
    -- User has edit permission for own department
    EXISTS (
        SELECT 1 FROM users u
        JOIN user_effective_permissions uep ON u.id = uep.user_id
        WHERE u.id = auth.uid()
        AND u.department_id = department_objectives.department_id
        AND uep.can_edit_dept_strategy = true
    )
    OR
    -- Admin
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Key results: Follow same pattern as objectives
CREATE POLICY "Users can view key results if they can view the objective"
ON department_key_results FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM department_objectives dept_obj
        WHERE dept_obj.id = department_key_results.objective_id
        AND (
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND users.department_id = dept_obj.department_id
            )
            OR EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND users.role = 'admin'
            )
        )
    )
);

CREATE POLICY "Users can edit key results if they can edit the objective"
ON department_key_results FOR ALL
TO authenticated
USING (
    owner_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM department_objectives dept_obj
        JOIN department_strategy_access dsa ON dsa.department_id = dept_obj.department_id
        WHERE dept_obj.id = department_key_results.objective_id
        AND dsa.user_id = auth.uid()
        AND dsa.can_edit = true
    )
    OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Strategy notes: Similar permissions
CREATE POLICY "Users can view strategy notes for their department"
ON department_strategy_notes FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.department_id = department_strategy_notes.department_id
    )
    OR EXISTS (
        SELECT 1 FROM department_strategy_access
        WHERE department_strategy_access.department_id = department_strategy_notes.department_id
        AND department_strategy_access.user_id = auth.uid()
        AND department_strategy_access.can_view = true
    )
    OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

CREATE POLICY "Users can create strategy notes for accessible departments"
ON department_strategy_notes FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.department_id = department_strategy_notes.department_id
    )
    OR EXISTS (
        SELECT 1 FROM department_strategy_access
        WHERE department_strategy_access.department_id = department_strategy_notes.department_id
        AND department_strategy_access.user_id = auth.uid()
        AND department_strategy_access.can_edit = true
    )
    OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Access table: Only admins can manage
CREATE POLICY "Admins can manage department strategy access"
ON department_strategy_access FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

CREATE POLICY "Users can view their own access grants"
ON department_strategy_access FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- 6. TRIGGERS FOR UPDATED_AT
-- ============================================

DROP TRIGGER IF EXISTS update_dept_objectives_updated_at ON department_objectives;
CREATE TRIGGER update_dept_objectives_updated_at
    BEFORE UPDATE ON department_objectives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dept_key_results_updated_at ON department_key_results;
CREATE TRIGGER update_dept_key_results_updated_at
    BEFORE UPDATE ON department_key_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. HELPER FUNCTION: Calculate objective progress
-- ============================================

CREATE OR REPLACE FUNCTION calculate_objective_progress(objective_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    total_krs INTEGER;
    progress_sum NUMERIC;
    avg_progress INTEGER;
BEGIN
    SELECT
        COUNT(*),
        COALESCE(SUM(
            CASE
                WHEN target_value > 0 THEN (current_value / target_value * 100)
                WHEN metric_type = 'boolean' AND current_value > 0 THEN 100
                ELSE 0
            END
        ), 0)
    INTO total_krs, progress_sum
    FROM department_key_results
    WHERE objective_id = objective_uuid;

    IF total_krs = 0 THEN
        RETURN 0;
    END IF;

    avg_progress := ROUND(progress_sum / total_krs);
    RETURN LEAST(avg_progress, 100);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. VIEW: Department Strategy Summary
-- ============================================

CREATE OR REPLACE VIEW department_strategy_summary AS
SELECT
    d.id AS department_id,
    d.name AS department_name,
    d.icon AS department_icon,
    d.color AS department_color,

    -- Objective counts
    COUNT(DISTINCT dept_obj.id) FILTER (WHERE dept_obj.status = 'active') AS active_objectives,
    COUNT(DISTINCT dept_obj.id) FILTER (WHERE dept_obj.status = 'completed') AS completed_objectives,
    COUNT(DISTINCT dept_obj.id) AS total_objectives,

    -- Average progress
    ROUND(AVG(dept_obj.progress_percentage) FILTER (WHERE dept_obj.status = 'active'), 0) AS avg_progress,

    -- Key results
    COUNT(DISTINCT dkr.id) AS total_key_results,
    COUNT(DISTINCT dkr.id) FILTER (WHERE dkr.status = 'completed') AS completed_key_results,

    -- Recent activity
    MAX(GREATEST(dept_obj.updated_at, dkr.updated_at)) AS last_activity

FROM departments d
LEFT JOIN department_objectives dept_obj ON d.id = dept_obj.department_id
LEFT JOIN department_key_results dkr ON dept_obj.id = dkr.objective_id
GROUP BY d.id, d.name, d.icon, d.color;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check department objectives
-- SELECT * FROM department_objectives WHERE department_id = 'your-dept-id';

-- Check department strategy summary
-- SELECT * FROM department_strategy_summary;

-- Calculate progress for an objective
-- SELECT calculate_objective_progress('objective-uuid');

-- ============================================
-- END OF PHASE 13 DEPARTMENT STRATEGY SCHEMA
-- ============================================
