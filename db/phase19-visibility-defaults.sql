-- ============================================
-- Insight 360 - Phase 19: Default Visibility Settings
-- Version: 1.0
-- Date: January 2026
-- Description: Add default_visibility to business role defaults
-- ============================================

-- ============================================
-- PART 1: ADD DEFAULT_VISIBILITY COLUMN
-- ============================================

ALTER TABLE business_role_defaults
ADD COLUMN IF NOT EXISTS default_visibility TEXT DEFAULT 'team'
    CHECK (default_visibility IN ('private', 'team', 'public'));

COMMENT ON COLUMN business_role_defaults.default_visibility IS
    'Default visibility for items created by users with this business role. private=only creator, team=department members, public=everyone';

-- ============================================
-- PART 2: UPDATE EXISTING ROWS WITH DEFAULTS
-- ============================================

-- Executive: Can create public items
UPDATE business_role_defaults
SET default_visibility = 'public'
WHERE business_role = 'executive' AND default_visibility IS NULL;

-- Director: Can create team-visible items (default)
UPDATE business_role_defaults
SET default_visibility = 'team'
WHERE business_role = 'director' AND default_visibility IS NULL;

-- Manager: Team-visible items
UPDATE business_role_defaults
SET default_visibility = 'team'
WHERE business_role = 'manager' AND default_visibility IS NULL;

-- Supervisor: Team-visible items
UPDATE business_role_defaults
SET default_visibility = 'team'
WHERE business_role = 'supervisor' AND default_visibility IS NULL;

-- IC: Team-visible items (can be changed to private if desired)
UPDATE business_role_defaults
SET default_visibility = 'team'
WHERE business_role = 'ic' AND default_visibility IS NULL;

-- ============================================
-- PART 3: UPDATE THE EFFECTIVE PERMISSIONS VIEW
-- ============================================

-- Must drop with CASCADE due to dependent RLS policies
-- The policies will be recreated after the view
DROP VIEW IF EXISTS user_effective_permissions CASCADE;

CREATE VIEW user_effective_permissions AS
SELECT
    u.id AS user_id,
    u.email,
    u.display_name,
    u.business_role,
    brl.name AS business_role_name,
    brl.level AS business_role_level,
    u.department_id,
    d.name AS department_name,

    -- Effective permissions (override if not null, else default)
    COALESCE(upo.can_view_own_dept, brd.can_view_own_dept) AS can_view_own_dept,
    COALESCE(upo.can_edit_own_dept, brd.can_edit_own_dept) AS can_edit_own_dept,
    COALESCE(upo.can_view_other_depts, brd.can_view_other_depts) AS can_view_other_depts,
    COALESCE(upo.can_edit_other_depts, brd.can_edit_other_depts) AS can_edit_other_depts,
    COALESCE(upo.can_view_company_strategy, brd.can_view_company_strategy) AS can_view_company_strategy,
    COALESCE(upo.can_edit_company_strategy, brd.can_edit_company_strategy) AS can_edit_company_strategy,
    COALESCE(upo.can_edit_dept_strategy, brd.can_edit_dept_strategy) AS can_edit_dept_strategy,
    COALESCE(upo.can_run_workflows, brd.can_run_workflows) AS can_run_workflows,
    COALESCE(upo.can_create_workflows, brd.can_create_workflows) AS can_create_workflows,
    COALESCE(upo.can_access_all_agents, brd.can_access_all_agents) AS can_access_all_agents,

    -- Default visibility setting
    COALESCE(brd.default_visibility, 'team') AS default_visibility,

    -- Department-specific overrides
    COALESCE(upo.department_overrides, '{}') AS department_overrides,

    -- Override info
    upo.override_reason,
    CASE WHEN upo.id IS NOT NULL THEN true ELSE false END AS has_overrides

FROM users u
LEFT JOIN business_role_levels brl ON u.business_role = brl.id
LEFT JOIN business_role_defaults brd ON u.business_role = brd.business_role
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN user_permission_overrides upo ON u.id = upo.user_id;

-- ============================================
-- PART 4: RECREATE DEPENDENT RLS POLICIES
-- ============================================

-- These policies were dropped by CASCADE, recreate them

-- Department objectives policies
CREATE POLICY "Users can view department objectives based on permissions"
ON department_objectives FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_effective_permissions uep
        WHERE uep.user_id = auth.uid()
        AND (
            uep.can_view_own_dept = true AND department_objectives.department_id = uep.department_id
            OR uep.can_view_other_depts = true
        )
    )
);

CREATE POLICY "Users can edit department objectives based on permissions"
ON department_objectives FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_effective_permissions uep
        WHERE uep.user_id = auth.uid()
        AND (
            uep.can_edit_own_dept = true AND department_objectives.department_id = uep.department_id
            OR uep.can_edit_other_depts = true
        )
    )
);

-- Compliance requirements policy
CREATE POLICY "Managers can view compliance requirements"
ON compliance_requirements FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_effective_permissions uep
        WHERE uep.user_id = auth.uid()
        AND uep.business_role_level >= 3
    )
);

-- Integrity incidents policies
CREATE POLICY "Managers can view incidents"
ON integrity_incidents FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_effective_permissions uep
        WHERE uep.user_id = auth.uid()
        AND uep.business_role_level >= 3
    )
);

CREATE POLICY "Managers can view incident updates"
ON integrity_incident_updates FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_effective_permissions uep
        WHERE uep.user_id = auth.uid()
        AND uep.business_role_level >= 3
    )
);

CREATE POLICY "Managers can add incident updates"
ON integrity_incident_updates FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_effective_permissions uep
        WHERE uep.user_id = auth.uid()
        AND uep.business_role_level >= 3
    )
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check the new column
-- SELECT business_role, default_visibility FROM business_role_defaults;

DO $$
BEGIN
    RAISE NOTICE 'Phase 19: Default visibility settings added successfully';
END $$;
