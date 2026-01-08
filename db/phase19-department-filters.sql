-- ============================================
-- Insight 360 - Phase 19: Department Filter Support
-- Version: 1.0
-- Date: January 2026
-- Description: Add department_id columns for filtering
-- ============================================

-- ============================================
-- PART 1: ADD DEPARTMENT_ID TO SKILLS TABLE
-- ============================================

ALTER TABLE skills
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_skills_department ON skills(department_id);

COMMENT ON COLUMN skills.department_id IS 'Optional department assignment for filtering. NULL means available to all.';

-- ============================================
-- PART 2: ADD DEPARTMENT_ID TO CONTEXT_ASSETS TABLE
-- ============================================

ALTER TABLE context_assets
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_context_assets_department ON context_assets(department_id);

COMMENT ON COLUMN context_assets.department_id IS 'Optional department assignment for filtering. NULL means available to all.';

-- ============================================
-- PART 3: UPDATE VIEWS (if any reference these tables)
-- ============================================

-- Update skill_summary view to include department info
DROP VIEW IF EXISTS skill_summary;

CREATE OR REPLACE VIEW skill_summary AS
SELECT
    s.id,
    s.user_id,
    s.name,
    s.display_name,
    s.description,
    s.icon,
    s.color,
    s.category,
    s.suite,
    s.tags,
    s.version,
    s.visibility,
    s.status,
    s.required_context_types,
    s.optional_context_types,
    s.context_token_budget,
    s.trigger_phrases,
    s.conversation_starters,
    s.usage_count,
    s.last_used_at,
    s.created_at,
    s.updated_at,
    s.department_id,
    d.name as department_name,
    COUNT(DISTINCT a.id) as agents_using,
    COUNT(DISTINCT se.id) as total_executions,
    COALESCE(AVG(se.duration_ms), 0) as avg_execution_ms
FROM skills s
LEFT JOIN departments d ON s.department_id = d.id
LEFT JOIN agents a ON a.skill_id = s.id AND a.is_active = true
LEFT JOIN skill_executions se ON se.skill_id = s.id
GROUP BY s.id, d.name;

-- ============================================
-- PART 4: NOTES
-- ============================================
--
-- For AGENTS and ACTIONS:
-- These use junction tables (department_agents, action_departments)
-- for many-to-many relationships, which is the correct approach.
-- The frontend filters can work by:
-- 1. Querying the junction table for agent/action IDs by department
-- 2. Or using JOIN queries in the API routes
--
-- The API routes need to be updated to support the department_id
-- query parameter for skills and context_assets.
--
-- ============================================

-- Verification queries (run manually to check)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'department_id';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'context_assets' AND column_name = 'department_id';

DO $$
BEGIN
    RAISE NOTICE 'Phase 19: Department filter columns added successfully';
END $$;
