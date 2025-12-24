-- ============================================
-- Insight 360 - Phase 3.5: Parthenon Schema
-- Version: 1.0
-- Date: December 2024
-- Description: Organizational structure model
-- ============================================

-- ============================================
-- AGENT SUITE ENUM (for categorization)
-- ============================================

-- Add suite column to existing agents table
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS suite TEXT DEFAULT 'execute'
CHECK (suite IN ('align', 'strategy', 'execute'));

-- Add category for more granular classification
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS category TEXT;

COMMENT ON COLUMN agents.suite IS 'Agent suite: align (foundation), strategy (planning), execute (action)';
COMMENT ON COLUMN agents.category IS 'Agent category within suite (e.g., content, sales, research)';

-- Index for suite filtering
CREATE INDEX IF NOT EXISTS idx_agents_suite ON agents(suite);

-- ============================================
-- DEPARTMENTS TABLE
-- Organizational departments (Parthenon pillars)
-- ============================================
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Basic info
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'building-2',
    color TEXT DEFAULT '#6366f1', -- Brand color for UI

    -- Hierarchy
    parent_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_departments_user ON departments(user_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE departments IS 'Organizational departments (Parthenon pillars)';

-- ============================================
-- ROLES TABLE
-- Job roles within departments
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,

    -- Basic info
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'user',

    -- Level in hierarchy
    level TEXT NOT NULL DEFAULT 'individual'
        CHECK (level IN ('executive', 'director', 'manager', 'individual')),

    -- Reporting structure
    reports_to UUID REFERENCES roles(id) ON DELETE SET NULL,

    -- Responsibilities & Authority
    responsibilities JSONB DEFAULT '[]', -- Array of responsibility strings
    authority JSONB DEFAULT '{}', -- Decision-making authority definitions

    -- Skills & Requirements
    required_skills JSONB DEFAULT '[]',

    -- Status
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_roles_user ON roles(user_id);
CREATE INDEX IF NOT EXISTS idx_roles_department ON roles(department_id);
CREATE INDEX IF NOT EXISTS idx_roles_level ON roles(level);
CREATE INDEX IF NOT EXISTS idx_roles_reports_to ON roles(reports_to);
CREATE INDEX IF NOT EXISTS idx_roles_active ON roles(is_active);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE roles IS 'Job roles within departments with responsibilities and authority';

-- ============================================
-- OKRs TABLE
-- Objectives and Key Results
-- ============================================
CREATE TABLE IF NOT EXISTS okrs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Basic info
    title TEXT NOT NULL,
    description TEXT,

    -- Scope
    scope TEXT NOT NULL DEFAULT 'company'
        CHECK (scope IN ('company', 'department', 'team', 'individual')),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,

    -- Parent OKR (for cascading)
    parent_okr_id UUID REFERENCES okrs(id) ON DELETE SET NULL,

    -- Time period
    period TEXT NOT NULL, -- e.g., 'Q1 2025', 'H1 2025', '2025'
    start_date DATE,
    end_date DATE,

    -- Key Results (array of objects with target, current, unit)
    key_results JSONB DEFAULT '[]',

    -- Status
    status TEXT DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_okrs_user ON okrs(user_id);
CREATE INDEX IF NOT EXISTS idx_okrs_scope ON okrs(scope);
CREATE INDEX IF NOT EXISTS idx_okrs_department ON okrs(department_id);
CREATE INDEX IF NOT EXISTS idx_okrs_role ON okrs(role_id);
CREATE INDEX IF NOT EXISTS idx_okrs_period ON okrs(period);
CREATE INDEX IF NOT EXISTS idx_okrs_status ON okrs(status);
CREATE INDEX IF NOT EXISTS idx_okrs_parent ON okrs(parent_okr_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_okrs_updated_at ON okrs;
CREATE TRIGGER update_okrs_updated_at
    BEFORE UPDATE ON okrs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE okrs IS 'Objectives and Key Results at company, department, team, or individual level';

-- ============================================
-- PROCESSES TABLE
-- Business processes, standards, and procedures
-- ============================================
CREATE TABLE IF NOT EXISTS processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,

    -- Basic info
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'workflow',

    -- Type classification
    type TEXT NOT NULL DEFAULT 'procedure'
        CHECK (type IN ('standard', 'policy', 'procedure', 'workflow', 'checklist')),

    -- Ownership
    owner_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,

    -- Process definition
    steps JSONB DEFAULT '[]', -- Ordered array of step objects
    inputs JSONB DEFAULT '[]', -- Required inputs
    outputs JSONB DEFAULT '[]', -- Expected outputs

    -- Related assets
    related_assets JSONB DEFAULT '[]', -- Array of context asset IDs

    -- Status
    status TEXT DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'deprecated', 'archived')),
    version TEXT DEFAULT '1.0',

    -- Tags for filtering
    tags TEXT[] DEFAULT '{}',

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_processes_user ON processes(user_id);
CREATE INDEX IF NOT EXISTS idx_processes_department ON processes(department_id);
CREATE INDEX IF NOT EXISTS idx_processes_type ON processes(type);
CREATE INDEX IF NOT EXISTS idx_processes_owner ON processes(owner_role_id);
CREATE INDEX IF NOT EXISTS idx_processes_status ON processes(status);
CREATE INDEX IF NOT EXISTS idx_processes_tags ON processes USING GIN(tags);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_processes_updated_at ON processes;
CREATE TRIGGER update_processes_updated_at
    BEFORE UPDATE ON processes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE processes IS 'Business processes, standards, policies, and procedures';

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE processes ENABLE ROW LEVEL SECURITY;

-- Departments policies
CREATE POLICY "Users can view own departments" ON departments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own departments" ON departments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own departments" ON departments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own departments" ON departments
    FOR DELETE USING (auth.uid() = user_id);

-- Roles policies
CREATE POLICY "Users can view own roles" ON roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roles" ON roles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own roles" ON roles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own roles" ON roles
    FOR DELETE USING (auth.uid() = user_id);

-- OKRs policies
CREATE POLICY "Users can view own okrs" ON okrs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own okrs" ON okrs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own okrs" ON okrs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own okrs" ON okrs
    FOR DELETE USING (auth.uid() = user_id);

-- Processes policies
CREATE POLICY "Users can view own processes" ON processes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own processes" ON processes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own processes" ON processes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own processes" ON processes
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- SEED DATA: Default Departments
-- ============================================

-- Note: Run this separately or comment out if not needed
-- INSERT INTO departments (user_id, name, description, icon, color, sort_order) VALUES
-- (NULL, 'Executive', 'Executive leadership and strategy', 'crown', '#8b5cf6', 1),
-- (NULL, 'Finance', 'Financial operations and planning', 'banknote', '#10b981', 2),
-- (NULL, 'Operations', 'Business operations and logistics', 'settings', '#6366f1', 3),
-- (NULL, 'Sales', 'Sales and revenue generation', 'trending-up', '#f59e0b', 4),
-- (NULL, 'Marketing', 'Marketing and brand management', 'megaphone', '#ec4899', 5),
-- (NULL, 'Production', 'Product development and delivery', 'package', '#3b82f6', 6),
-- (NULL, 'Service', 'Customer service and support', 'headphones', '#14b8a6', 7),
-- (NULL, 'Stakeholder Relations', 'External stakeholder management', 'users', '#8b5cf6', 8);

-- ============================================
-- VIEWS
-- ============================================

-- Department hierarchy view
CREATE OR REPLACE VIEW department_hierarchy AS
WITH RECURSIVE dept_tree AS (
    -- Base case: top-level departments
    SELECT
        id, name, description, parent_id, user_id,
        0 as depth,
        ARRAY[name] as path
    FROM departments
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive case: child departments
    SELECT
        d.id, d.name, d.description, d.parent_id, d.user_id,
        dt.depth + 1,
        dt.path || d.name
    FROM departments d
    JOIN dept_tree dt ON d.parent_id = dt.id
)
SELECT * FROM dept_tree;

-- Role hierarchy view
CREATE OR REPLACE VIEW role_hierarchy AS
WITH RECURSIVE role_tree AS (
    -- Base case: top-level roles (no reports_to)
    SELECT
        r.id, r.title, r.department_id, r.level, r.reports_to, r.user_id,
        d.name as department_name,
        0 as depth,
        ARRAY[r.title] as path
    FROM roles r
    LEFT JOIN departments d ON r.department_id = d.id
    WHERE r.reports_to IS NULL

    UNION ALL

    -- Recursive case: reporting roles
    SELECT
        r.id, r.title, r.department_id, r.level, r.reports_to, r.user_id,
        d.name as department_name,
        rt.depth + 1,
        rt.path || r.title
    FROM roles r
    LEFT JOIN departments d ON r.department_id = d.id
    JOIN role_tree rt ON r.reports_to = rt.id
)
SELECT * FROM role_tree;

-- OKR cascade view
CREATE OR REPLACE VIEW okr_cascade AS
WITH RECURSIVE okr_tree AS (
    -- Base case: company-level OKRs
    SELECT
        o.id, o.title, o.scope, o.department_id, o.role_id,
        o.parent_okr_id, o.progress, o.status, o.period, o.user_id,
        0 as depth,
        ARRAY[o.title] as path
    FROM okrs o
    WHERE o.parent_okr_id IS NULL

    UNION ALL

    -- Recursive case: child OKRs
    SELECT
        o.id, o.title, o.scope, o.department_id, o.role_id,
        o.parent_okr_id, o.progress, o.status, o.period, o.user_id,
        ot.depth + 1,
        ot.path || o.title
    FROM okrs o
    JOIN okr_tree ot ON o.parent_okr_id = ot.id
)
SELECT * FROM okr_tree;

COMMENT ON VIEW department_hierarchy IS 'Recursive view of department hierarchy with depth';
COMMENT ON VIEW role_hierarchy IS 'Recursive view of role reporting structure with depth';
COMMENT ON VIEW okr_cascade IS 'Recursive view of OKR cascade from company to individual';
