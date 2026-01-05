-- ============================================
-- PHASE 13: BUSINESS ROLES SCHEMA
-- ============================================
-- This schema implements a two-tier role system:
-- - System Role: Platform permissions (admin, user, viewer)
-- - Business Role: Organizational hierarchy (executive, director, manager, supervisor, ic)
--
-- Run: Execute this SQL in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. BUSINESS ROLE LEVELS (Reference Table)
-- ============================================

CREATE TABLE IF NOT EXISTS business_role_levels (
    id TEXT PRIMARY KEY,           -- 'executive', 'director', 'manager', 'supervisor', 'ic'
    name TEXT NOT NULL,            -- Display name
    level INTEGER NOT NULL,        -- Hierarchy level (5=highest, 1=lowest)
    description TEXT,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default levels
INSERT INTO business_role_levels (id, name, level, description, icon, color) VALUES
    ('executive', 'Executive', 5, 'C-suite and VP level leadership', 'crown', '#7c3aed'),
    ('director', 'Director', 4, 'Department heads and directors', 'briefcase', '#6366f1'),
    ('manager', 'Manager', 3, 'Team and functional managers', 'users', '#3b82f6'),
    ('supervisor', 'Supervisor', 2, 'Team leads and supervisors', 'user-check', '#10b981'),
    ('ic', 'Individual Contributor', 1, 'Individual contributors', 'user', '#6b7280')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    level = EXCLUDED.level,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color;

-- ============================================
-- 2. ADD BUSINESS ROLE TO USERS TABLE
-- ============================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS business_role TEXT REFERENCES business_role_levels(id) DEFAULT 'ic';

-- Index for queries filtering by business role
CREATE INDEX IF NOT EXISTS idx_users_business_role ON users(business_role);

-- ============================================
-- 3. BUSINESS ROLE DEFAULTS (Permissions per role)
-- ============================================

CREATE TABLE IF NOT EXISTS business_role_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_role TEXT NOT NULL REFERENCES business_role_levels(id) ON DELETE CASCADE,

    -- Department access
    can_view_own_dept BOOLEAN DEFAULT true,
    can_edit_own_dept BOOLEAN DEFAULT false,
    can_view_other_depts BOOLEAN DEFAULT false,
    can_edit_other_depts BOOLEAN DEFAULT false,

    -- Strategy access
    can_view_company_strategy BOOLEAN DEFAULT false,
    can_edit_company_strategy BOOLEAN DEFAULT false,
    can_edit_dept_strategy BOOLEAN DEFAULT false,

    -- Workflow access
    can_run_workflows BOOLEAN DEFAULT true,
    can_create_workflows BOOLEAN DEFAULT false,

    -- Agent access
    can_access_all_agents BOOLEAN DEFAULT false,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(business_role)
);

-- Seed default permissions for each role
INSERT INTO business_role_defaults
    (business_role, can_view_own_dept, can_edit_own_dept, can_view_other_depts, can_edit_other_depts,
     can_view_company_strategy, can_edit_company_strategy, can_edit_dept_strategy,
     can_run_workflows, can_create_workflows, can_access_all_agents)
VALUES
    -- Executive: Full access to everything
    ('executive', true, true, true, true, true, true, true, true, true, true),
    -- Director: Own dept edit, cross-dept view, dept strategy edit
    ('director', true, true, true, false, true, false, true, true, true, true),
    -- Manager: Own dept edit, limited cross-dept view
    ('manager', true, true, true, false, true, false, false, true, true, false),
    -- Supervisor: Own team within dept, view dept strategy
    ('supervisor', true, false, false, false, true, false, false, true, false, false),
    -- IC: View own dept only, execute workflows
    ('ic', true, false, false, false, false, false, false, true, false, false)
ON CONFLICT (business_role) DO UPDATE SET
    can_view_own_dept = EXCLUDED.can_view_own_dept,
    can_edit_own_dept = EXCLUDED.can_edit_own_dept,
    can_view_other_depts = EXCLUDED.can_view_other_depts,
    can_edit_other_depts = EXCLUDED.can_edit_other_depts,
    can_view_company_strategy = EXCLUDED.can_view_company_strategy,
    can_edit_company_strategy = EXCLUDED.can_edit_company_strategy,
    can_edit_dept_strategy = EXCLUDED.can_edit_dept_strategy,
    can_run_workflows = EXCLUDED.can_run_workflows,
    can_create_workflows = EXCLUDED.can_create_workflows,
    can_access_all_agents = EXCLUDED.can_access_all_agents,
    updated_at = NOW();

-- ============================================
-- 4. USER PERMISSION OVERRIDES
-- ============================================
-- Admin can override default permissions for specific users

CREATE TABLE IF NOT EXISTS user_permission_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Override specific permissions (NULL = use default from business role)
    can_view_own_dept BOOLEAN,
    can_edit_own_dept BOOLEAN,
    can_view_other_depts BOOLEAN,
    can_edit_other_depts BOOLEAN,
    can_view_company_strategy BOOLEAN,
    can_edit_company_strategy BOOLEAN,
    can_edit_dept_strategy BOOLEAN,
    can_run_workflows BOOLEAN,
    can_create_workflows BOOLEAN,
    can_access_all_agents BOOLEAN,

    -- Department-specific overrides (JSONB for flexibility)
    -- Example: {"dept-uuid-1": {"can_view": true, "can_edit": false}}
    department_overrides JSONB DEFAULT '{}',

    -- Metadata
    override_reason TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id)
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_overrides_user ON user_permission_overrides(user_id);

-- ============================================
-- 5. RLS POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE business_role_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_role_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- Business role levels: Everyone can read
CREATE POLICY "Business role levels are viewable by all authenticated users"
ON business_role_levels FOR SELECT
TO authenticated
USING (true);

-- Business role defaults: Everyone can read, only admins can modify
CREATE POLICY "Business role defaults are viewable by all authenticated users"
ON business_role_defaults FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify business role defaults"
ON business_role_defaults FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- User permission overrides: Users can see their own, admins can see all
CREATE POLICY "Users can view their own permission overrides"
ON user_permission_overrides FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

CREATE POLICY "Only admins can modify permission overrides"
ON user_permission_overrides FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- ============================================
-- 6. HELPER VIEW FOR EFFECTIVE PERMISSIONS
-- ============================================

CREATE OR REPLACE VIEW user_effective_permissions AS
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
-- 7. TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS update_business_role_defaults_updated_at ON business_role_defaults;
CREATE TRIGGER update_business_role_defaults_updated_at
    BEFORE UPDATE ON business_role_defaults
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_permission_overrides_updated_at ON user_permission_overrides;
CREATE TRIGGER update_user_permission_overrides_updated_at
    BEFORE UPDATE ON user_permission_overrides
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check business role levels
-- SELECT * FROM business_role_levels ORDER BY level DESC;

-- Check business role defaults
-- SELECT * FROM business_role_defaults;

-- Check user effective permissions
-- SELECT * FROM user_effective_permissions WHERE user_id = 'your-user-id';

-- ============================================
-- END OF PHASE 13 BUSINESS ROLES SCHEMA
-- ============================================
