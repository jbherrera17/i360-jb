-- ============================================
-- Insight 360 - Phase 4.1: Action-Parthenon Integration
-- Version: 1.0
-- Date: December 2024
-- Description: Junction tables connecting Actions to Parthenon structures
-- ============================================

-- ============================================
-- ACTION_OKRS TABLE
-- Links actions to OKRs they support
-- ============================================
CREATE TABLE IF NOT EXISTS action_okrs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    okr_id UUID NOT NULL REFERENCES okrs(id) ON DELETE CASCADE,

    -- Relationship type
    relationship TEXT NOT NULL DEFAULT 'supports'
        CHECK (relationship IN ('supports', 'measures', 'drives', 'reports')),

    -- How this action contributes to the OKR
    contribution_description TEXT,

    -- Priority/weight of this connection
    priority INTEGER DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),

    -- Is this OKR required context for the action?
    is_required BOOLEAN DEFAULT false,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate connections
    UNIQUE(action_id, okr_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_action_okrs_action ON action_okrs(action_id);
CREATE INDEX IF NOT EXISTS idx_action_okrs_okr ON action_okrs(okr_id);
CREATE INDEX IF NOT EXISTS idx_action_okrs_relationship ON action_okrs(relationship);
CREATE INDEX IF NOT EXISTS idx_action_okrs_required ON action_okrs(is_required);

COMMENT ON TABLE action_okrs IS 'Junction table linking actions to the OKRs they support or measure';

-- ============================================
-- ACTION_DEPARTMENTS TABLE
-- Links actions to departments they serve
-- ============================================
CREATE TABLE IF NOT EXISTS action_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,

    -- Relationship type
    relationship TEXT NOT NULL DEFAULT 'serves'
        CHECK (relationship IN ('serves', 'owned_by', 'collaborates', 'reports_to')),

    -- Is this the primary department?
    is_primary BOOLEAN DEFAULT false,

    -- Priority/weight
    priority INTEGER DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate connections
    UNIQUE(action_id, department_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_action_departments_action ON action_departments(action_id);
CREATE INDEX IF NOT EXISTS idx_action_departments_dept ON action_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_action_departments_relationship ON action_departments(relationship);
CREATE INDEX IF NOT EXISTS idx_action_departments_primary ON action_departments(is_primary);

COMMENT ON TABLE action_departments IS 'Junction table linking actions to departments they serve';

-- ============================================
-- ACTION_PROCESSES TABLE
-- Links actions to processes/procedures they execute
-- ============================================
CREATE TABLE IF NOT EXISTS action_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,

    -- Relationship type
    relationship TEXT NOT NULL DEFAULT 'executes'
        CHECK (relationship IN ('executes', 'automates', 'guides', 'references', 'creates_output_for')),

    -- Which steps of the process this action handles (if applicable)
    step_numbers INTEGER[] DEFAULT '{}',

    -- Is this process required context?
    is_required BOOLEAN DEFAULT false,

    -- Priority/weight
    priority INTEGER DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate connections
    UNIQUE(action_id, process_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_action_processes_action ON action_processes(action_id);
CREATE INDEX IF NOT EXISTS idx_action_processes_process ON action_processes(process_id);
CREATE INDEX IF NOT EXISTS idx_action_processes_relationship ON action_processes(relationship);
CREATE INDEX IF NOT EXISTS idx_action_processes_required ON action_processes(is_required);

COMMENT ON TABLE action_processes IS 'Junction table linking actions to processes they execute or automate';

-- ============================================
-- ACTION_ROLES TABLE
-- Links actions to roles that can use them
-- ============================================
CREATE TABLE IF NOT EXISTS action_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

    -- Permission level
    permission TEXT NOT NULL DEFAULT 'execute'
        CHECK (permission IN ('view', 'execute', 'configure', 'admin')),

    -- Is this the primary/owning role?
    is_owner BOOLEAN DEFAULT false,

    -- Should role context be injected when this role uses the action?
    inject_context BOOLEAN DEFAULT true,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate connections
    UNIQUE(action_id, role_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_action_roles_action ON action_roles(action_id);
CREATE INDEX IF NOT EXISTS idx_action_roles_role ON action_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_action_roles_permission ON action_roles(permission);
CREATE INDEX IF NOT EXISTS idx_action_roles_owner ON action_roles(is_owner);

COMMENT ON TABLE action_roles IS 'Junction table linking actions to roles with permissions';

-- ============================================
-- ACTION_CONTEXT_ASSETS TABLE
-- Links actions to specific context assets
-- ============================================
CREATE TABLE IF NOT EXISTS action_context_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES context_assets(id) ON DELETE CASCADE,

    -- Injection behavior
    injection_mode TEXT NOT NULL DEFAULT 'always'
        CHECK (injection_mode IN ('always', 'on_demand', 'conditional')),

    -- For conditional injection
    trigger_keywords TEXT[] DEFAULT '{}',

    -- Is this asset required?
    is_required BOOLEAN DEFAULT false,

    -- Priority (order of injection)
    priority INTEGER DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),

    -- Max tokens to include from this asset
    max_tokens INTEGER,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate connections
    UNIQUE(action_id, asset_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_action_context_assets_action ON action_context_assets(action_id);
CREATE INDEX IF NOT EXISTS idx_action_context_assets_asset ON action_context_assets(asset_id);
CREATE INDEX IF NOT EXISTS idx_action_context_assets_mode ON action_context_assets(injection_mode);
CREATE INDEX IF NOT EXISTS idx_action_context_assets_required ON action_context_assets(is_required);

COMMENT ON TABLE action_context_assets IS 'Junction table linking actions to context assets for injection';

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE action_okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_context_assets ENABLE ROW LEVEL SECURITY;

-- Action OKRs policies (inherit from parent action)
CREATE POLICY "Users can view action_okrs for own actions" ON action_okrs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM actions a WHERE a.id = action_id AND (a.user_id = auth.uid() OR a.is_public = true))
    );

CREATE POLICY "Users can manage action_okrs for own actions" ON action_okrs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM actions a WHERE a.id = action_id AND a.user_id = auth.uid())
    );

-- Action Departments policies
CREATE POLICY "Users can view action_departments for own actions" ON action_departments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM actions a WHERE a.id = action_id AND (a.user_id = auth.uid() OR a.is_public = true))
    );

CREATE POLICY "Users can manage action_departments for own actions" ON action_departments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM actions a WHERE a.id = action_id AND a.user_id = auth.uid())
    );

-- Action Processes policies
CREATE POLICY "Users can view action_processes for own actions" ON action_processes
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM actions a WHERE a.id = action_id AND (a.user_id = auth.uid() OR a.is_public = true))
    );

CREATE POLICY "Users can manage action_processes for own actions" ON action_processes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM actions a WHERE a.id = action_id AND a.user_id = auth.uid())
    );

-- Action Roles policies
CREATE POLICY "Users can view action_roles for own actions" ON action_roles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM actions a WHERE a.id = action_id AND (a.user_id = auth.uid() OR a.is_public = true))
    );

CREATE POLICY "Users can manage action_roles for own actions" ON action_roles
    FOR ALL USING (
        EXISTS (SELECT 1 FROM actions a WHERE a.id = action_id AND a.user_id = auth.uid())
    );

-- Action Context Assets policies
CREATE POLICY "Users can view action_context_assets for own actions" ON action_context_assets
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM actions a WHERE a.id = action_id AND (a.user_id = auth.uid() OR a.is_public = true))
    );

CREATE POLICY "Users can manage action_context_assets for own actions" ON action_context_assets
    FOR ALL USING (
        EXISTS (SELECT 1 FROM actions a WHERE a.id = action_id AND a.user_id = auth.uid())
    );

-- ============================================
-- VIEWS: Action Context Assembly
-- ============================================

-- Full action context view (all connected Parthenon elements)
CREATE OR REPLACE VIEW action_full_context AS
SELECT
    a.id as action_id,
    a.name as action_name,
    a.slug as action_slug,
    a.suite,
    a.status,

    -- Connected OKRs
    COALESCE(
        json_agg(DISTINCT jsonb_build_object(
            'id', o.id,
            'title', o.title,
            'scope', o.scope,
            'period', o.period,
            'progress', o.progress,
            'key_results', o.key_results,
            'relationship', ao.relationship,
            'is_required', ao.is_required
        )) FILTER (WHERE o.id IS NOT NULL),
        '[]'
    ) as connected_okrs,

    -- Connected Departments
    COALESCE(
        json_agg(DISTINCT jsonb_build_object(
            'id', d.id,
            'name', d.name,
            'description', d.description,
            'icon', d.icon,
            'color', d.color,
            'relationship', ad.relationship,
            'is_primary', ad.is_primary
        )) FILTER (WHERE d.id IS NOT NULL),
        '[]'
    ) as connected_departments,

    -- Connected Processes
    COALESCE(
        json_agg(DISTINCT jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'type', p.type,
            'steps', p.steps,
            'relationship', ap.relationship,
            'step_numbers', ap.step_numbers,
            'is_required', ap.is_required
        )) FILTER (WHERE p.id IS NOT NULL),
        '[]'
    ) as connected_processes,

    -- Connected Roles
    COALESCE(
        json_agg(DISTINCT jsonb_build_object(
            'id', r.id,
            'title', r.title,
            'level', r.level,
            'responsibilities', r.responsibilities,
            'department_id', r.department_id,
            'permission', ar.permission,
            'is_owner', ar.is_owner,
            'inject_context', ar.inject_context
        )) FILTER (WHERE r.id IS NOT NULL),
        '[]'
    ) as connected_roles,

    -- Connected Context Assets
    COALESCE(
        json_agg(DISTINCT jsonb_build_object(
            'id', ca.id,
            'name', ca.name,
            'asset_type', ca.asset_type,
            'injection_mode', aca.injection_mode,
            'is_required', aca.is_required,
            'priority', aca.priority
        )) FILTER (WHERE ca.id IS NOT NULL),
        '[]'
    ) as connected_assets

FROM actions a
LEFT JOIN action_okrs ao ON a.id = ao.action_id
LEFT JOIN okrs o ON ao.okr_id = o.id
LEFT JOIN action_departments ad ON a.id = ad.action_id
LEFT JOIN departments d ON ad.department_id = d.id
LEFT JOIN action_processes ap ON a.id = ap.action_id
LEFT JOIN processes p ON ap.process_id = p.id
LEFT JOIN action_roles ar ON a.id = ar.action_id
LEFT JOIN roles r ON ar.role_id = r.id
LEFT JOIN action_context_assets aca ON a.id = aca.action_id
LEFT JOIN context_assets ca ON aca.asset_id = ca.id
GROUP BY a.id;

COMMENT ON VIEW action_full_context IS 'Complete action context with all connected Parthenon elements';

-- Action summary with context counts
CREATE OR REPLACE VIEW action_context_summary AS
SELECT
    a.id,
    a.name,
    a.slug,
    a.suite,
    a.status,
    a.usage_count,
    a.last_used_at,
    COUNT(DISTINCT ao.okr_id) as okr_count,
    COUNT(DISTINCT ad.department_id) as department_count,
    COUNT(DISTINCT ap.process_id) as process_count,
    COUNT(DISTINCT ar.role_id) as role_count,
    COUNT(DISTINCT aca.asset_id) as asset_count,
    (COUNT(DISTINCT ao.okr_id) + COUNT(DISTINCT ad.department_id) +
     COUNT(DISTINCT ap.process_id) + COUNT(DISTINCT ar.role_id) +
     COUNT(DISTINCT aca.asset_id)) as total_connections
FROM actions a
LEFT JOIN action_okrs ao ON a.id = ao.action_id
LEFT JOIN action_departments ad ON a.id = ad.action_id
LEFT JOIN action_processes ap ON a.id = ap.action_id
LEFT JOIN action_roles ar ON a.id = ar.action_id
LEFT JOIN action_context_assets aca ON a.id = aca.action_id
GROUP BY a.id;

COMMENT ON VIEW action_context_summary IS 'Action summary with counts of connected Parthenon elements';

-- OKR actions view (which actions support each OKR)
CREATE OR REPLACE VIEW okr_actions AS
SELECT
    o.id as okr_id,
    o.title as okr_title,
    o.scope,
    o.period,
    o.progress,
    o.status,
    COALESCE(
        json_agg(jsonb_build_object(
            'id', a.id,
            'name', a.name,
            'slug', a.slug,
            'suite', a.suite,
            'relationship', ao.relationship,
            'contribution', ao.contribution_description
        )) FILTER (WHERE a.id IS NOT NULL),
        '[]'
    ) as supporting_actions,
    COUNT(a.id) as action_count
FROM okrs o
LEFT JOIN action_okrs ao ON o.id = ao.okr_id
LEFT JOIN actions a ON ao.action_id = a.id
GROUP BY o.id;

COMMENT ON VIEW okr_actions IS 'OKRs with their supporting actions';

-- Department actions view
CREATE OR REPLACE VIEW department_actions AS
SELECT
    d.id as department_id,
    d.name as department_name,
    d.icon,
    d.color,
    COALESCE(
        json_agg(jsonb_build_object(
            'id', a.id,
            'name', a.name,
            'slug', a.slug,
            'suite', a.suite,
            'relationship', ad.relationship,
            'is_primary', ad.is_primary
        )) FILTER (WHERE a.id IS NOT NULL),
        '[]'
    ) as actions,
    COUNT(a.id) as action_count
FROM departments d
LEFT JOIN action_departments ad ON d.id = ad.department_id
LEFT JOIN actions a ON ad.action_id = a.id
GROUP BY d.id;

COMMENT ON VIEW department_actions IS 'Departments with their associated actions';

-- Process actions view
CREATE OR REPLACE VIEW process_actions AS
SELECT
    p.id as process_id,
    p.name as process_name,
    p.type,
    p.status,
    COALESCE(
        json_agg(jsonb_build_object(
            'id', a.id,
            'name', a.name,
            'slug', a.slug,
            'suite', a.suite,
            'relationship', ap.relationship,
            'step_numbers', ap.step_numbers
        )) FILTER (WHERE a.id IS NOT NULL),
        '[]'
    ) as actions,
    COUNT(a.id) as action_count
FROM processes p
LEFT JOIN action_processes ap ON p.id = ap.process_id
LEFT JOIN actions a ON ap.action_id = a.id
GROUP BY p.id;

COMMENT ON VIEW process_actions IS 'Processes with their associated actions';
