-- ============================================
-- PHASE 45: RESOURCE ACCESS CONTROL
-- Per-user access controls for context assets, skills, agents, and workflows
-- Uses visibility-based system with department/role inheritance
-- Includes module-gated system resources
-- ============================================

-- ============================================
-- PART 1: ADD MODULE ID AND VISIBILITY COLUMNS
-- ============================================

-- 1.1 Add module_id for system resource gating
ALTER TABLE agents ADD COLUMN IF NOT EXISTS module_id VARCHAR(50);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS module_id VARCHAR(50);
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS module_id VARCHAR(50);
ALTER TABLE context_assets ADD COLUMN IF NOT EXISTS module_id VARCHAR(50);

-- 1.2 Add visibility to agents (currently uses is_public boolean)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private';

-- Migrate existing is_public to visibility for agents
UPDATE agents
SET visibility = CASE
    WHEN is_public = true THEN 'public'
    WHEN is_public = false THEN 'private'
    ELSE 'private'
END
WHERE visibility IS NULL OR visibility = 'private';

-- 1.3 Add department_id to resources that don't have it
ALTER TABLE context_assets ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);
-- Note: agents use department_agents junction table, no direct department_id

-- ============================================
-- PART 2: ADD INDEXES FOR ACCESS CONTROL QUERIES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_context_assets_visibility ON context_assets(visibility);
CREATE INDEX IF NOT EXISTS idx_context_assets_user_org ON context_assets(user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_context_assets_dept ON context_assets(department_id);
CREATE INDEX IF NOT EXISTS idx_context_assets_module ON context_assets(module_id) WHERE module_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_skills_visibility ON skills(visibility);
CREATE INDEX IF NOT EXISTS idx_skills_user_org ON skills(user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_skills_dept ON skills(department_id);
CREATE INDEX IF NOT EXISTS idx_skills_module ON skills(module_id) WHERE module_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agents_visibility ON agents(visibility);
CREATE INDEX IF NOT EXISTS idx_agents_user_org ON agents(user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_agents_module ON agents(module_id) WHERE module_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflows_user_org ON workflows(user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_workflows_module ON workflows(module_id) WHERE module_id IS NOT NULL;

-- ============================================
-- PART 3: VISIBILITY CONSTRAINTS
-- ============================================

-- Ensure visibility column has valid values
ALTER TABLE context_assets DROP CONSTRAINT IF EXISTS context_assets_visibility_check;
ALTER TABLE context_assets ADD CONSTRAINT context_assets_visibility_check
    CHECK (visibility IN ('private', 'team', 'organization', 'public'));

ALTER TABLE skills DROP CONSTRAINT IF EXISTS skills_visibility_check;
ALTER TABLE skills ADD CONSTRAINT skills_visibility_check
    CHECK (visibility IN ('private', 'team', 'organization', 'public'));

ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_visibility_check;
ALTER TABLE agents ADD CONSTRAINT agents_visibility_check
    CHECK (visibility IN ('private', 'team', 'organization', 'public'));

-- ============================================
-- PART 4: TIER-BASED DEFAULT VISIBILITY SETTINGS
-- ============================================

-- Add default visibility settings to subscription tiers
ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS default_resource_visibility VARCHAR(20) DEFAULT 'organization';
ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS allow_public_resources BOOLEAN DEFAULT false;

-- Update tier defaults
UPDATE subscription_tiers SET
    default_resource_visibility = 'organization',
    allow_public_resources = false
WHERE id = 'starter';

UPDATE subscription_tiers SET
    default_resource_visibility = 'organization',
    allow_public_resources = false
WHERE id = 'business';

UPDATE subscription_tiers SET
    default_resource_visibility = 'organization',
    allow_public_resources = true
WHERE id = 'enterprise';

UPDATE subscription_tiers SET
    default_resource_visibility = 'organization',
    allow_public_resources = true
WHERE id = 'agency';

-- ============================================
-- PART 5: DEPARTMENT-ROLE RESOURCE ACCESS TABLE
-- ============================================

-- For role-based resource visibility (e.g., Manager+ can see certain resources)
CREATE TABLE IF NOT EXISTS role_resource_visibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL, -- 'agent', 'skill', 'context_asset', 'workflow'
    resource_id UUID NOT NULL,
    min_business_role VARCHAR(20) NOT NULL, -- 'ic', 'supervisor', 'manager', 'director', 'executive'
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(resource_id, resource_type)
);

CREATE INDEX IF NOT EXISTS idx_role_resource_visibility_resource ON role_resource_visibility(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_role_resource_visibility_org ON role_resource_visibility(org_id);

-- ============================================
-- PART 6: BUSINESS ROLE LEVELS TABLE
-- ============================================

-- Note: business_role_levels table already exists from Phase 13
-- with schema: id TEXT PRIMARY KEY, name TEXT, level INTEGER
-- We just ensure the data is present (upsert)

INSERT INTO business_role_levels (id, name, level) VALUES
    ('ic', 'Individual Contributor', 1),
    ('supervisor', 'Supervisor', 2),
    ('manager', 'Manager', 3),
    ('director', 'Director', 4),
    ('executive', 'Executive', 5)
ON CONFLICT (id) DO UPDATE SET
    level = EXCLUDED.level,
    name = EXCLUDED.name;

-- ============================================
-- PART 7: ACCESS CHECK HELPER FUNCTION
-- ============================================

-- Helper function to check if user can access a resource
-- This function implements the two-layer access control:
-- Layer 1: Module check (system resources only)
-- Layer 2: Visibility check (all resources)
CREATE OR REPLACE FUNCTION can_access_resource(
    p_user_id UUID,
    p_resource_type VARCHAR,
    p_resource_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_resource RECORD;
    v_user RECORD;
    v_user_dept_ids UUID[];
    v_min_role VARCHAR;
    v_role_level INT;
    v_user_role_level INT;
    v_module_id VARCHAR;
    v_is_system BOOLEAN;
BEGIN
    -- Get user info
    SELECT u.id, u.default_org_id, u.business_role,
           COALESCE(
               (SELECT array_agg(DISTINCT dr.department_id)
                FROM user_roles ur
                JOIN department_roles dr ON ur.role_id = dr.id
                WHERE ur.user_id = u.id),
               ARRAY[]::UUID[]
           ) as dept_ids
    INTO v_user
    FROM users u WHERE u.id = p_user_id;

    IF v_user IS NULL THEN
        RETURN false;
    END IF;

    v_user_dept_ids := v_user.dept_ids;

    -- Get resource based on type
    IF p_resource_type = 'agent' THEN
        SELECT user_id, org_id, visibility, module_id, is_system,
               (SELECT array_agg(department_id) FROM department_agents WHERE agent_id = a.id) as dept_ids
        INTO v_resource FROM agents a WHERE id = p_resource_id;
        v_module_id := v_resource.module_id;
        v_is_system := COALESCE(v_resource.is_system, false);
    ELSIF p_resource_type = 'skill' THEN
        SELECT user_id, org_id, visibility, module_id, ARRAY[department_id] as dept_ids
        INTO v_resource FROM skills WHERE id = p_resource_id;
        v_module_id := v_resource.module_id;
        v_is_system := (v_resource.user_id IS NULL); -- Skills are system if no user_id
    ELSIF p_resource_type = 'context_asset' THEN
        SELECT user_id, org_id, visibility, module_id, ARRAY[department_id] as dept_ids
        INTO v_resource FROM context_assets WHERE id = p_resource_id;
        v_module_id := v_resource.module_id;
        v_is_system := false; -- Context assets are always user-created
    ELSIF p_resource_type = 'workflow' THEN
        SELECT user_id, org_id, module_id,
               CASE WHEN is_public THEN 'public' ELSE 'private' END as visibility,
               ARRAY[department_id] as dept_ids
        INTO v_resource FROM workflows WHERE id = p_resource_id;
        v_module_id := v_resource.module_id;
        v_is_system := false; -- Workflows are user-created
    ELSE
        RETURN false;
    END IF;

    IF v_resource IS NULL THEN
        RETURN false;
    END IF;

    -- LAYER 1: Module check (system resources only)
    IF v_is_system AND v_module_id IS NOT NULL THEN
        IF NOT can_access_module(p_user_id, v_module_id, v_user.default_org_id) THEN
            RETURN false;
        END IF;
    END IF;

    -- LAYER 2: Visibility check (all resources)

    -- Check 1: Owner always has access
    IF v_resource.user_id = p_user_id THEN
        RETURN true;
    END IF;

    -- Check 2: Public visibility
    IF v_resource.visibility = 'public' THEN
        RETURN true;
    END IF;

    -- Check 3: Organization visibility (same org)
    IF v_resource.visibility IN ('organization', 'team') AND v_resource.org_id = v_user.default_org_id THEN
        -- For 'organization' visibility, org membership is enough
        IF v_resource.visibility = 'organization' THEN
            RETURN true;
        END IF;

        -- For 'team' visibility, must be in same department
        IF v_resource.visibility = 'team' AND v_resource.dept_ids IS NOT NULL THEN
            IF v_user_dept_ids && v_resource.dept_ids THEN
                RETURN true;
            END IF;
        END IF;
    END IF;

    -- Check 4: System resources with null user_id accessible to org members
    IF v_resource.user_id IS NULL AND v_resource.org_id IS NULL THEN
        -- System-wide resources (no specific org) are accessible if module check passed
        RETURN true;
    END IF;

    -- Check 5: Role-based access
    SELECT min_business_role INTO v_min_role
    FROM role_resource_visibility
    WHERE resource_type = p_resource_type AND resource_id = p_resource_id;

    IF v_min_role IS NOT NULL THEN
        -- Get role levels
        SELECT level INTO v_role_level FROM business_role_levels WHERE id = v_min_role;
        SELECT level INTO v_user_role_level FROM business_role_levels WHERE id = v_user.business_role;

        IF v_user_role_level IS NOT NULL AND v_role_level IS NOT NULL AND v_user_role_level >= v_role_level THEN
            RETURN true;
        END IF;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 8: UPDATE SYSTEM AGENTS WITH MODULE IDS
-- ============================================

-- Map system agents to their modules
UPDATE agents SET module_id = 'research_studio' WHERE is_system = true AND name ILIKE '%research%analyst%';
UPDATE agents SET module_id = 'thought_leadership' WHERE is_system = true AND name ILIKE '%thought%leader%';
UPDATE agents SET module_id = 'strategy120' WHERE is_system = true AND name ILIKE '%strategy%advisor%';
UPDATE agents SET module_id = 'align120' WHERE is_system = true AND (name ILIKE '%integrity%auditor%' OR name ILIKE '%risk%sentinel%');
UPDATE agents SET module_id = 'execute120' WHERE is_system = true AND (name ILIKE '%content%writer%' OR name ILIKE '%email%composer%');
UPDATE agents SET module_id = 'briefing' WHERE is_system = true AND name ILIKE '%briefer%';

-- Map skills to their modules (skills use user_id IS NULL to identify system/default skills)
UPDATE skills SET module_id = 'research_studio' WHERE user_id IS NULL AND (name ILIKE '%market%research%' OR name ILIKE '%competitive%analysis%');
UPDATE skills SET module_id = 'thought_leadership' WHERE user_id IS NULL AND (name ILIKE '%article%generator%' OR name ILIKE '%linkedin%');
UPDATE skills SET module_id = 'strategy120' WHERE user_id IS NULL AND (name ILIKE '%strategic%planning%' OR name ILIKE '%swot%');
UPDATE skills SET module_id = 'align120' WHERE user_id IS NULL AND (name ILIKE '%alignment%check%' OR name ILIKE '%values%audit%');
UPDATE skills SET module_id = 'execute120' WHERE user_id IS NULL AND (name ILIKE '%content%creation%' OR name ILIKE '%email%draft%');
UPDATE skills SET module_id = 'briefing' WHERE user_id IS NULL AND name ILIKE '%executive%summary%';

-- ============================================
-- PART 9: SET DEFAULT VISIBILITY FOR EXISTING RESOURCES
-- ============================================

-- Set organization visibility for system resources (they'll still be module-gated)
UPDATE agents SET visibility = 'organization' WHERE is_system = true AND visibility IS NULL;
UPDATE skills SET visibility = 'organization' WHERE user_id IS NULL AND visibility IS NULL;

-- Set private visibility for user-created resources without visibility
UPDATE context_assets SET visibility = 'private' WHERE visibility IS NULL;
UPDATE skills SET visibility = 'private' WHERE user_id IS NOT NULL AND visibility IS NULL;
UPDATE agents SET visibility = 'private' WHERE is_system = false AND visibility IS NULL;

-- ============================================
-- PART 10: GRANT PERMISSIONS
-- ============================================

-- Grant access to the new table
GRANT SELECT, INSERT, UPDATE, DELETE ON role_resource_visibility TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON role_resource_visibility TO service_role;

GRANT SELECT ON business_role_levels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON business_role_levels TO service_role;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Run this migration in Supabase
-- 2. Create server/utils/resourceAccess.js
-- 3. Update routes to use access filters
-- 4. Create admin UI for resource management
