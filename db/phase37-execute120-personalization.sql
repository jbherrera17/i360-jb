-- ============================================
-- Phase 37: Execute120 User Profile Personalization
-- Database Schema Extensions
-- ============================================

-- ============================================
-- 1. ROLE JUNCTION TABLES
-- Enable role-based filtering for entities
-- ============================================

-- Workflow role filtering
-- Allows workflows to be restricted to specific business role levels
CREATE TABLE IF NOT EXISTS workflow_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    role_level TEXT NOT NULL REFERENCES business_role_levels(id) ON DELETE CASCADE,
    permission TEXT NOT NULL DEFAULT 'execute' CHECK (permission IN ('view', 'execute')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workflow_id, role_level)
);

CREATE INDEX IF NOT EXISTS idx_workflow_roles_workflow ON workflow_roles(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_roles_role ON workflow_roles(role_level);

COMMENT ON TABLE workflow_roles IS 'Junction table for role-based workflow access control';
COMMENT ON COLUMN workflow_roles.permission IS 'view = can see but not run, execute = can run workflow';

-- Agent role filtering
-- Allows agents to be restricted to specific business role levels
CREATE TABLE IF NOT EXISTS agent_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    role_level TEXT NOT NULL REFERENCES business_role_levels(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, role_level)
);

CREATE INDEX IF NOT EXISTS idx_agent_roles_agent ON agent_roles(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_roles_role ON agent_roles(role_level);

COMMENT ON TABLE agent_roles IS 'Junction table for role-based agent access control';

-- Context asset role filtering
-- Allows context assets to be restricted to specific business role levels
CREATE TABLE IF NOT EXISTS context_asset_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES context_assets(id) ON DELETE CASCADE,
    role_level TEXT NOT NULL REFERENCES business_role_levels(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(asset_id, role_level)
);

CREATE INDEX IF NOT EXISTS idx_context_asset_roles_asset ON context_asset_roles(asset_id);
CREATE INDEX IF NOT EXISTS idx_context_asset_roles_role ON context_asset_roles(role_level);

COMMENT ON TABLE context_asset_roles IS 'Junction table for role-based context asset access control';

-- ============================================
-- 2. DEPARTMENT BRIEFINGS
-- Add department support to briefing system
-- ============================================

-- Add department_id to briefing_configs for department-specific briefings
ALTER TABLE briefing_configs
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_briefing_configs_department ON briefing_configs(department_id);

COMMENT ON COLUMN briefing_configs.department_id IS 'Optional department for department-specific briefings. NULL = user-global briefing';

-- ============================================
-- 3. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on new tables
ALTER TABLE workflow_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_asset_roles ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role has full access to workflow_roles"
ON workflow_roles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to agent_roles"
ON agent_roles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to context_asset_roles"
ON context_asset_roles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated users can read all role assignments (needed for filtering)
CREATE POLICY "Authenticated users can read workflow_roles"
ON workflow_roles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read agent_roles"
ON agent_roles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read context_asset_roles"
ON context_asset_roles FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- 4. USEFUL VIEWS
-- ============================================

-- View: Get workflows accessible to a specific user based on department + role
-- Usage: SELECT * FROM user_accessible_workflows WHERE user_id = 'xxx'
CREATE OR REPLACE VIEW user_accessible_workflows AS
SELECT
    w.id,
    w.name,
    w.description,
    w.icon,
    w.color,
    w.category,
    w.department_id,
    w.estimated_minutes,
    w.is_active,
    w.is_public,
    u.id as user_id
FROM workflows w
CROSS JOIN users u
WHERE w.is_active = true
  -- Department filter: user's dept OR global (null department_id)
  AND (w.department_id = u.department_id OR w.department_id IS NULL)
  -- Role filter: no restrictions OR user's role level meets minimum
  AND (
    NOT EXISTS (SELECT 1 FROM workflow_roles WHERE workflow_id = w.id)
    OR EXISTS (
      SELECT 1 FROM workflow_roles wr
      JOIN business_role_levels brl ON wr.role_level = brl.id
      JOIN business_role_levels user_brl ON user_brl.id = u.business_role
      WHERE wr.workflow_id = w.id AND brl.level <= user_brl.level
    )
  );

COMMENT ON VIEW user_accessible_workflows IS 'Workflows filtered by user department and business role level';

-- View: Get agents accessible to a specific user based on department + role
CREATE OR REPLACE VIEW user_accessible_agents AS
SELECT
    a.id,
    a.name,
    a.description,
    a.type,
    a.suite,
    a.category,
    a.icon,
    a.is_active,
    da.department_id,
    da.is_featured,
    da.sort_order,
    da.use_case_summary,
    u.id as user_id
FROM agents a
CROSS JOIN users u
LEFT JOIN department_agents da ON a.id = da.agent_id AND da.department_id = u.department_id
WHERE a.is_active = true
  -- Department filter: has department mapping for user's dept OR has no dept mappings (global)
  AND (
    da.id IS NOT NULL
    OR NOT EXISTS (SELECT 1 FROM department_agents WHERE agent_id = a.id)
  )
  -- Role filter: no restrictions OR user's role level meets minimum
  AND (
    NOT EXISTS (SELECT 1 FROM agent_roles WHERE agent_id = a.id)
    OR EXISTS (
      SELECT 1 FROM agent_roles ar
      JOIN business_role_levels brl ON ar.role_level = brl.id
      JOIN business_role_levels user_brl ON user_brl.id = u.business_role
      WHERE ar.agent_id = a.id AND brl.level <= user_brl.level
    )
  );

COMMENT ON VIEW user_accessible_agents IS 'Agents filtered by user department and business role level';

-- View: Get context assets accessible to a specific user based on department + role
CREATE OR REPLACE VIEW user_accessible_context_assets AS
SELECT
    ca.id,
    ca.name,
    ca.asset_type,
    ca.description,
    ca.department_id,
    ca.tags,
    ca.is_current,
    ca.updated_at,
    u.id as user_id
FROM context_assets ca
CROSS JOIN users u
WHERE ca.is_current = true
  -- Department filter: user's dept OR global (null department_id)
  AND (ca.department_id = u.department_id OR ca.department_id IS NULL)
  -- Role filter: no restrictions OR user's role level meets minimum
  AND (
    NOT EXISTS (SELECT 1 FROM context_asset_roles WHERE asset_id = ca.id)
    OR EXISTS (
      SELECT 1 FROM context_asset_roles car
      JOIN business_role_levels brl ON car.role_level = brl.id
      JOIN business_role_levels user_brl ON user_brl.id = u.business_role
      WHERE car.asset_id = ca.id AND brl.level <= user_brl.level
    )
  );

COMMENT ON VIEW user_accessible_context_assets IS 'Context assets filtered by user department and business role level';

-- ============================================
-- 5. HELPER FUNCTION
-- Get user's role level number for comparison
-- ============================================

CREATE OR REPLACE FUNCTION get_user_role_level(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_level INTEGER;
BEGIN
    SELECT brl.level INTO v_level
    FROM users u
    JOIN business_role_levels brl ON u.business_role = brl.id
    WHERE u.id = p_user_id;

    RETURN COALESCE(v_level, 1); -- Default to IC level (1) if not found
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_role_level IS 'Returns the numeric level of a user''s business role (1=IC, 5=Executive)';
