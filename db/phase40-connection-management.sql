-- ============================================
-- Phase 40: Connection Management Infrastructure
-- Organizational → AI Capability Connections
-- ============================================
--
-- This phase creates the junction tables and views needed to connect:
-- - Skills to roles, tags, and OKRs
-- - Responsibilities to AI capabilities (agents, skills, workflows)
-- - Individual user overrides for AI capability access
--
-- IMPORTANT: Run this AFTER phase39-agency-foundation.sql and phase39-rls-org-aware.sql
-- ============================================

-- ============================================
-- 1. SKILL ROLES - Role-Based Skill Access
-- ============================================
-- Mirrors the pattern from workflow_roles in Phase 37

CREATE TABLE IF NOT EXISTS skill_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    role_level TEXT NOT NULL REFERENCES business_role_levels(id) ON DELETE CASCADE,
    permission TEXT NOT NULL DEFAULT 'execute' CHECK (permission IN ('view', 'execute')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(skill_id, role_level)
);

CREATE INDEX IF NOT EXISTS idx_skill_roles_skill ON skill_roles(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_roles_role ON skill_roles(role_level);

COMMENT ON TABLE skill_roles IS 'Junction table for role-based skill access control';
COMMENT ON COLUMN skill_roles.permission IS 'view = can see skill, execute = can use skill';


-- ============================================
-- 2. SKILL TAGS - Tag-Based Skill Matching
-- ============================================
-- Mirrors agent_tags and workflow_tags patterns

CREATE TABLE IF NOT EXISTS skill_tags (
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (skill_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_tags_skill ON skill_tags(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_tags_tag ON skill_tags(tag_id);

COMMENT ON TABLE skill_tags IS 'Tags assigned to skills for role-based matching';


-- ============================================
-- 3. SKILL OKR MAPPINGS - Skills to OKRs
-- ============================================
-- Mirrors workflow_okr_mappings pattern from Phase 32

CREATE TABLE IF NOT EXISTS skill_okr_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    okr_id UUID NOT NULL REFERENCES okrs(id) ON DELETE CASCADE,
    contribution_type TEXT NOT NULL DEFAULT 'supports'
        CHECK (contribution_type IN ('supports', 'measures', 'drives')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(skill_id, okr_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_okr_mappings_skill ON skill_okr_mappings(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_okr_mappings_okr ON skill_okr_mappings(okr_id);
CREATE INDEX IF NOT EXISTS idx_skill_okr_mappings_user ON skill_okr_mappings(user_id);

COMMENT ON TABLE skill_okr_mappings IS 'Maps skills to OKRs they support';
COMMENT ON COLUMN skill_okr_mappings.contribution_type IS 'supports = helps achieve, measures = tracks progress, drives = primary driver';


-- ============================================
-- 4. RESPONSIBILITY AI MAPPINGS
-- Direct recommendations of AI capabilities per responsibility
-- ============================================

-- Responsibility → Agents
CREATE TABLE IF NOT EXISTS responsibility_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    responsibility_id UUID NOT NULL REFERENCES responsibilities(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    recommendation_strength TEXT DEFAULT 'suggested'
        CHECK (recommendation_strength IN ('required', 'recommended', 'suggested')),
    use_case_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(responsibility_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_responsibility_agents_resp ON responsibility_agents(responsibility_id);
CREATE INDEX IF NOT EXISTS idx_responsibility_agents_agent ON responsibility_agents(agent_id);

COMMENT ON TABLE responsibility_agents IS 'Direct agent recommendations for responsibilities';
COMMENT ON COLUMN responsibility_agents.recommendation_strength IS 'required = must use, recommended = should use, suggested = optional';

-- Responsibility → Skills
CREATE TABLE IF NOT EXISTS responsibility_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    responsibility_id UUID NOT NULL REFERENCES responsibilities(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    recommendation_strength TEXT DEFAULT 'suggested'
        CHECK (recommendation_strength IN ('required', 'recommended', 'suggested')),
    use_case_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(responsibility_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_responsibility_skills_resp ON responsibility_skills(responsibility_id);
CREATE INDEX IF NOT EXISTS idx_responsibility_skills_skill ON responsibility_skills(skill_id);

COMMENT ON TABLE responsibility_skills IS 'Direct skill recommendations for responsibilities';

-- Responsibility → Workflows
CREATE TABLE IF NOT EXISTS responsibility_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    responsibility_id UUID NOT NULL REFERENCES responsibilities(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    recommendation_strength TEXT DEFAULT 'suggested'
        CHECK (recommendation_strength IN ('required', 'recommended', 'suggested')),
    use_case_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(responsibility_id, workflow_id)
);

CREATE INDEX IF NOT EXISTS idx_responsibility_workflows_resp ON responsibility_workflows(responsibility_id);
CREATE INDEX IF NOT EXISTS idx_responsibility_workflows_workflow ON responsibility_workflows(workflow_id);

COMMENT ON TABLE responsibility_workflows IS 'Direct workflow recommendations for responsibilities';


-- ============================================
-- 5. USER AI ASSIGNMENTS - Individual Overrides
-- ============================================
-- Allows admins to grant/revoke/feature AI capabilities for specific users

CREATE TABLE IF NOT EXISTS user_ai_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('agent', 'skill', 'workflow', 'action')),
    entity_id UUID NOT NULL,
    assignment_type TEXT NOT NULL DEFAULT 'granted'
        CHECK (assignment_type IN ('granted', 'revoked', 'featured')),
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_user_ai_assignments_user ON user_ai_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ai_assignments_entity ON user_ai_assignments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_user_ai_assignments_type ON user_ai_assignments(assignment_type);
CREATE INDEX IF NOT EXISTS idx_user_ai_assignments_expires ON user_ai_assignments(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE user_ai_assignments IS 'Individual user overrides for AI capability access';
COMMENT ON COLUMN user_ai_assignments.assignment_type IS 'granted = extra access, revoked = blocked, featured = pinned/highlighted';
COMMENT ON COLUMN user_ai_assignments.expires_at IS 'Optional expiration for temporary assignments';


-- ============================================
-- 6. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE skill_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_okr_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE responsibility_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE responsibility_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE responsibility_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_assignments ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to skill_roles"
ON skill_roles FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to skill_tags"
ON skill_tags FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to skill_okr_mappings"
ON skill_okr_mappings FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to responsibility_agents"
ON responsibility_agents FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to responsibility_skills"
ON responsibility_skills FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to responsibility_workflows"
ON responsibility_workflows FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to user_ai_assignments"
ON user_ai_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read role/tag assignments (needed for filtering)
CREATE POLICY "Authenticated can read skill_roles"
ON skill_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read skill_tags"
ON skill_tags FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read skill_okr_mappings"
ON skill_okr_mappings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read responsibility_agents"
ON responsibility_agents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read responsibility_skills"
ON responsibility_skills FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read responsibility_workflows"
ON responsibility_workflows FOR SELECT TO authenticated USING (true);

-- User can read their own AI assignments
CREATE POLICY "Users can read own ai_assignments"
ON user_ai_assignments FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Admins can manage AI assignments (checked at API level)
CREATE POLICY "Users can manage own skill_okr_mappings"
ON skill_okr_mappings FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- ============================================
-- 7. UNIFIED VIEWS
-- ============================================

-- View: What can a user access?
-- Aggregates all access paths into one view
CREATE OR REPLACE VIEW user_full_capabilities AS
WITH user_role AS (
    SELECT
        u.id as user_id,
        u.business_role as role_level,
        u.department_id
    FROM users u
),
-- Agents accessible via role level
role_agents AS (
    SELECT DISTINCT
        ur.user_id,
        'agent' as entity_type,
        ar.agent_id as entity_id,
        'role_level' as access_source
    FROM user_role ur
    JOIN agent_roles ar ON ar.role_level = ur.role_level
),
-- Agents accessible via responsibility
responsibility_agents_access AS (
    SELECT DISTINCT
        ures.user_id,
        'agent' as entity_type,
        ra.agent_id as entity_id,
        'responsibility' as access_source
    FROM user_responsibilities ures
    JOIN responsibility_agents ra ON ra.responsibility_id = ures.responsibility_id
),
-- Agents accessible via individual assignment
assigned_agents AS (
    SELECT
        uaa.user_id,
        'agent' as entity_type,
        uaa.entity_id,
        'individual' as access_source
    FROM user_ai_assignments uaa
    WHERE uaa.entity_type = 'agent'
    AND uaa.assignment_type = 'granted'
    AND (uaa.expires_at IS NULL OR uaa.expires_at > NOW())
),
-- Skills accessible via role level
role_skills AS (
    SELECT DISTINCT
        ur.user_id,
        'skill' as entity_type,
        sr.skill_id as entity_id,
        'role_level' as access_source
    FROM user_role ur
    JOIN skill_roles sr ON sr.role_level = ur.role_level
),
-- Skills accessible via responsibility
responsibility_skills_access AS (
    SELECT DISTINCT
        ures.user_id,
        'skill' as entity_type,
        rs.skill_id as entity_id,
        'responsibility' as access_source
    FROM user_responsibilities ures
    JOIN responsibility_skills rs ON rs.responsibility_id = ures.responsibility_id
),
-- Skills accessible via individual assignment
assigned_skills AS (
    SELECT
        uaa.user_id,
        'skill' as entity_type,
        uaa.entity_id,
        'individual' as access_source
    FROM user_ai_assignments uaa
    WHERE uaa.entity_type = 'skill'
    AND uaa.assignment_type = 'granted'
    AND (uaa.expires_at IS NULL OR uaa.expires_at > NOW())
),
-- Workflows accessible via role level
role_workflows AS (
    SELECT DISTINCT
        ur.user_id,
        'workflow' as entity_type,
        wr.workflow_id as entity_id,
        'role_level' as access_source
    FROM user_role ur
    JOIN workflow_roles wr ON wr.role_level = ur.role_level
),
-- Workflows accessible via responsibility
responsibility_workflows_access AS (
    SELECT DISTINCT
        ures.user_id,
        'workflow' as entity_type,
        rw.workflow_id as entity_id,
        'responsibility' as access_source
    FROM user_responsibilities ures
    JOIN responsibility_workflows rw ON rw.responsibility_id = ures.responsibility_id
),
-- Workflows accessible via individual assignment
assigned_workflows AS (
    SELECT
        uaa.user_id,
        'workflow' as entity_type,
        uaa.entity_id,
        'individual' as access_source
    FROM user_ai_assignments uaa
    WHERE uaa.entity_type = 'workflow'
    AND uaa.assignment_type = 'granted'
    AND (uaa.expires_at IS NULL OR uaa.expires_at > NOW())
),
-- Combine all access paths
all_access AS (
    SELECT * FROM role_agents
    UNION SELECT * FROM responsibility_agents_access
    UNION SELECT * FROM assigned_agents
    UNION SELECT * FROM role_skills
    UNION SELECT * FROM responsibility_skills_access
    UNION SELECT * FROM assigned_skills
    UNION SELECT * FROM role_workflows
    UNION SELECT * FROM responsibility_workflows_access
    UNION SELECT * FROM assigned_workflows
)
SELECT
    aa.user_id,
    aa.entity_type,
    aa.entity_id,
    array_agg(DISTINCT aa.access_source) as access_sources,
    -- Check if revoked
    NOT EXISTS (
        SELECT 1 FROM user_ai_assignments uaa
        WHERE uaa.user_id = aa.user_id
        AND uaa.entity_type = aa.entity_type
        AND uaa.entity_id = aa.entity_id
        AND uaa.assignment_type = 'revoked'
        AND (uaa.expires_at IS NULL OR uaa.expires_at > NOW())
    ) as is_accessible,
    -- Check if featured
    EXISTS (
        SELECT 1 FROM user_ai_assignments uaa
        WHERE uaa.user_id = aa.user_id
        AND uaa.entity_type = aa.entity_type
        AND uaa.entity_id = aa.entity_id
        AND uaa.assignment_type = 'featured'
        AND (uaa.expires_at IS NULL OR uaa.expires_at > NOW())
    ) as is_featured
FROM all_access aa
GROUP BY aa.user_id, aa.entity_type, aa.entity_id;

COMMENT ON VIEW user_full_capabilities IS 'Unified view of all AI capabilities accessible to each user';


-- View: What supports a given OKR?
-- NOTE: Includes workflow_okr_mappings only if that table exists (from phase32)
-- For now, only actions and skills are included
CREATE OR REPLACE VIEW okr_supporting_capabilities AS
SELECT
    o.id as okr_id,
    o.title as okr_title,
    o.scope as okr_scope,
    'action' as capability_type,
    ao.action_id as capability_id,
    a.name as capability_name,
    ao.relationship as contribution_type
FROM okrs o
JOIN action_okrs ao ON ao.okr_id = o.id
JOIN actions a ON a.id = ao.action_id

UNION ALL

SELECT
    o.id as okr_id,
    o.title as okr_title,
    o.scope as okr_scope,
    'skill' as capability_type,
    som.skill_id as capability_id,
    s.name as capability_name,
    som.contribution_type
FROM okrs o
JOIN skill_okr_mappings som ON som.okr_id = o.id
JOIN skills s ON s.id = som.skill_id
WHERE som.is_active = true;

COMMENT ON VIEW okr_supporting_capabilities IS 'All AI capabilities (actions, workflows, skills) that support each OKR';


-- View: AI recommendations for responsibilities
CREATE OR REPLACE VIEW responsibility_ai_recommendations AS
SELECT
    r.id as responsibility_id,
    r.name as responsibility_name,
    'agent' as capability_type,
    ra.agent_id as capability_id,
    a.name as capability_name,
    a.description as capability_description,
    ra.recommendation_strength,
    ra.use_case_note
FROM responsibilities r
JOIN responsibility_agents ra ON ra.responsibility_id = r.id
JOIN agents a ON a.id = ra.agent_id

UNION ALL

SELECT
    r.id as responsibility_id,
    r.name as responsibility_name,
    'skill' as capability_type,
    rs.skill_id as capability_id,
    s.name as capability_name,
    s.description as capability_description,
    rs.recommendation_strength,
    rs.use_case_note
FROM responsibilities r
JOIN responsibility_skills rs ON rs.responsibility_id = r.id
JOIN skills s ON s.id = rs.skill_id

UNION ALL

SELECT
    r.id as responsibility_id,
    r.name as responsibility_name,
    'workflow' as capability_type,
    rw.workflow_id as capability_id,
    w.name as capability_name,
    w.description as capability_description,
    rw.recommendation_strength,
    rw.use_case_note
FROM responsibilities r
JOIN responsibility_workflows rw ON rw.responsibility_id = r.id
JOIN workflows w ON w.id = rw.workflow_id;

COMMENT ON VIEW responsibility_ai_recommendations IS 'AI capability recommendations for each responsibility';


-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Function to get user's accessible capabilities
CREATE OR REPLACE FUNCTION get_user_capabilities(p_user_id UUID, p_entity_type TEXT DEFAULT NULL)
RETURNS TABLE (
    entity_type TEXT,
    entity_id UUID,
    entity_name TEXT,
    access_sources TEXT[],
    is_featured BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ufc.entity_type,
        ufc.entity_id,
        CASE
            WHEN ufc.entity_type = 'agent' THEN (SELECT name FROM agents WHERE id = ufc.entity_id)
            WHEN ufc.entity_type = 'skill' THEN (SELECT name FROM skills WHERE id = ufc.entity_id)
            WHEN ufc.entity_type = 'workflow' THEN (SELECT name FROM workflows WHERE id = ufc.entity_id)
        END as entity_name,
        ufc.access_sources,
        ufc.is_featured
    FROM user_full_capabilities ufc
    WHERE ufc.user_id = p_user_id
    AND ufc.is_accessible = true
    AND (p_entity_type IS NULL OR ufc.entity_type = p_entity_type)
    ORDER BY ufc.is_featured DESC, ufc.entity_type, entity_name;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_user_capabilities(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION get_user_capabilities IS 'Returns all AI capabilities accessible to a user, optionally filtered by type';


-- Function to check if user can access a specific capability
CREATE OR REPLACE FUNCTION user_can_access_capability(
    p_user_id UUID,
    p_entity_type TEXT,
    p_entity_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_full_capabilities
        WHERE user_id = p_user_id
        AND entity_type = p_entity_type
        AND entity_id = p_entity_id
        AND is_accessible = true
    );
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION user_can_access_capability(UUID, TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION user_can_access_capability IS 'Checks if a user can access a specific AI capability';


-- ============================================
-- 9. SAMPLE DATA / GRANTS
-- ============================================

-- Grant select on views to authenticated users
GRANT SELECT ON user_full_capabilities TO authenticated;
GRANT SELECT ON okr_supporting_capabilities TO authenticated;
GRANT SELECT ON responsibility_ai_recommendations TO authenticated;
