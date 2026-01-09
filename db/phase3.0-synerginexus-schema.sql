-- ============================================
-- Insight 360 - Phase 3.0: SynergiNexus Schema
-- Version: 3.0
-- Date: January 2026
-- Description: Core tables for SynergiNexus governance
--              and role-based user model
-- ============================================

-- Note: Run AFTER phase3.1-fix-departments-rls.sql
-- Dependencies: departments, users, agents, workflows, conversations tables

-- ============================================
-- TAGS (Categorized with Hierarchy)
-- ============================================

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('skill', 'domain', 'function')),
    parent_id UUID REFERENCES tags(id) ON DELETE SET NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_parent_id ON tags(parent_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

COMMENT ON TABLE tags IS 'Categorized tag taxonomy for role-based resource matching';
COMMENT ON COLUMN tags.category IS 'Tag category: skill, domain, or function';
COMMENT ON COLUMN tags.parent_id IS 'Parent tag for hierarchical structure';

-- ============================================
-- DEPARTMENT ROLES (Templates + Custom)
-- ============================================

CREATE TABLE IF NOT EXISTS department_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    role_level TEXT NOT NULL DEFAULT 'ic'
        CHECK (role_level IN ('ic', 'manager', 'director', 'vp', 'c-level')),
    is_system_template BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_department_roles_department ON department_roles(department_id);
CREATE INDEX IF NOT EXISTS idx_department_roles_level ON department_roles(role_level);

COMMENT ON TABLE department_roles IS 'Job roles within departments with level hierarchy';
COMMENT ON COLUMN department_roles.role_level IS 'Hierarchy level: ic, manager, director, vp, c-level';
COMMENT ON COLUMN department_roles.is_system_template IS 'True for system-provided templates, false for custom roles';

-- ============================================
-- ROLE TAGS (Many-to-Many)
-- ============================================

CREATE TABLE IF NOT EXISTS role_tags (
    role_id UUID REFERENCES department_roles(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_role_tags_role ON role_tags(role_id);
CREATE INDEX IF NOT EXISTS idx_role_tags_tag ON role_tags(tag_id);

COMMENT ON TABLE role_tags IS 'Junction table linking roles to their associated tags';

-- ============================================
-- RESPONSIBILITIES (Hierarchical)
-- ============================================

CREATE TABLE IF NOT EXISTS responsibilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES responsibilities(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_responsibilities_parent ON responsibilities(parent_id);
CREATE INDEX IF NOT EXISTS idx_responsibilities_name ON responsibilities(name);

COMMENT ON TABLE responsibilities IS 'Hierarchical responsibility definitions';
COMMENT ON COLUMN responsibilities.parent_id IS 'Parent responsibility for nested structure';

-- ============================================
-- ROLE RESPONSIBILITIES (Many-to-Many)
-- ============================================

CREATE TABLE IF NOT EXISTS role_responsibilities (
    role_id UUID REFERENCES department_roles(id) ON DELETE CASCADE,
    responsibility_id UUID REFERENCES responsibilities(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, responsibility_id)
);

CREATE INDEX IF NOT EXISTS idx_role_responsibilities_role ON role_responsibilities(role_id);
CREATE INDEX IF NOT EXISTS idx_role_responsibilities_responsibility ON role_responsibilities(responsibility_id);

COMMENT ON TABLE role_responsibilities IS 'Junction table linking roles to responsibilities';

-- ============================================
-- RESPONSIBILITY TAGS (Many-to-Many)
-- ============================================

CREATE TABLE IF NOT EXISTS responsibility_tags (
    responsibility_id UUID REFERENCES responsibilities(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (responsibility_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_responsibility_tags_responsibility ON responsibility_tags(responsibility_id);
CREATE INDEX IF NOT EXISTS idx_responsibility_tags_tag ON responsibility_tags(tag_id);

COMMENT ON TABLE responsibility_tags IS 'Junction table linking responsibilities to tags';

-- ============================================
-- USER ROLES (Many-to-Many - Multiple Roles)
-- ============================================

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES department_roles(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

COMMENT ON TABLE user_roles IS 'Assigns roles to users (supports multiple roles per user)';
COMMENT ON COLUMN user_roles.is_primary IS 'True if this is the user primary role';

-- ============================================
-- USER RESPONSIBILITIES (Selected from Role)
-- ============================================

CREATE TABLE IF NOT EXISTS user_responsibilities (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    responsibility_id UUID REFERENCES responsibilities(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, responsibility_id)
);

CREATE INDEX IF NOT EXISTS idx_user_responsibilities_user ON user_responsibilities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_responsibilities_responsibility ON user_responsibilities(responsibility_id);

COMMENT ON TABLE user_responsibilities IS 'Responsibilities selected by users from their assigned roles';

-- ============================================
-- AGENT TAGS (Many-to-Many)
-- ============================================

CREATE TABLE IF NOT EXISTS agent_tags (
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (agent_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_tags_agent ON agent_tags(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tags_tag ON agent_tags(tag_id);

COMMENT ON TABLE agent_tags IS 'Tags assigned to agents for role-based matching';

-- ============================================
-- WORKFLOW TAGS (Many-to-Many)
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_tags (
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (workflow_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_tags_workflow ON workflow_tags(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tags_tag ON workflow_tags(tag_id);

COMMENT ON TABLE workflow_tags IS 'Tags assigned to workflows for role-based matching';

-- ============================================
-- SYNERGINEXUS GOVERNANCE TABLES
-- ============================================

-- DIGM Configuration (4 Layers)
CREATE TABLE IF NOT EXISTS digm_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layer TEXT NOT NULL CHECK (layer IN ('identity', 'cognitive', 'voice', 'adaptation')),
    config_key TEXT NOT NULL,
    config_value JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (layer, config_key)
);

CREATE INDEX IF NOT EXISTS idx_digm_config_layer ON digm_config(layer);

COMMENT ON TABLE digm_config IS 'Disciplined Intelligence Governance Model configuration';
COMMENT ON COLUMN digm_config.layer IS 'DIGM layer: identity, cognitive, voice, or adaptation';

-- Values Definition
CREATE TABLE IF NOT EXISTS governance_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    plain_meaning TEXT,
    why_it_matters TEXT,
    is_non_negotiable BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_governance_values_name ON governance_values(name);

COMMENT ON TABLE governance_values IS 'Organizational values that govern AI interactions';
COMMENT ON COLUMN governance_values.is_non_negotiable IS 'True for values that cannot be overridden';

-- Principles (translated from values)
CREATE TABLE IF NOT EXISTS governance_principles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    value_id UUID REFERENCES governance_values(id) ON DELETE CASCADE,
    statement TEXT NOT NULL,
    constraint_type TEXT NOT NULL
        CHECK (constraint_type IN ('prohibition', 'requirement', 'disclosure', 'boundary')),
    applies_when TEXT,
    digm_touchpoint TEXT CHECK (digm_touchpoint IN ('context', 'decomposition', 'reasoning', 'alternatives', 'synthesis')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_governance_principles_value ON governance_principles(value_id);
CREATE INDEX IF NOT EXISTS idx_governance_principles_type ON governance_principles(constraint_type);

COMMENT ON TABLE governance_principles IS 'Enforceable principles derived from values';
COMMENT ON COLUMN governance_principles.constraint_type IS 'Type of constraint: prohibition, requirement, disclosure, or boundary';
COMMENT ON COLUMN governance_principles.digm_touchpoint IS 'Which DIGM step this principle applies to';

-- Conflict Log
CREATE TABLE IF NOT EXISTS governance_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id),
    agent_id UUID REFERENCES agents(id),
    conflict_description TEXT NOT NULL,
    values_involved UUID[] DEFAULT '{}',
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'escalated', 'resolved', 'dismissed')),
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_governance_conflicts_status ON governance_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_governance_conflicts_severity ON governance_conflicts(severity);
CREATE INDEX IF NOT EXISTS idx_governance_conflicts_conversation ON governance_conflicts(conversation_id);

COMMENT ON TABLE governance_conflicts IS 'Log of detected value conflicts for human review';
COMMENT ON COLUMN governance_conflicts.values_involved IS 'Array of value IDs involved in the conflict';

-- Escalation Rules
CREATE TABLE IF NOT EXISTS escalation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    resolver_level TEXT NOT NULL
        CHECK (resolver_level IN ('department_admin', 'system_admin', 'super_admin')),
    auto_escalate_after_hours INTEGER DEFAULT 24,
    notification_channels JSONB DEFAULT '["email"]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE escalation_rules IS 'Rules for conflict escalation based on severity';
COMMENT ON COLUMN escalation_rules.auto_escalate_after_hours IS 'Hours before auto-escalation to next level';

-- ============================================
-- MODIFY USERS TABLE (Add manager_id)
-- ============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_manager ON users(manager_id);

COMMENT ON COLUMN users.manager_id IS 'Direct manager for reporting hierarchy';

-- ============================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE responsibility_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE digm_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_principles ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;

-- Service role has full access to all governance tables
CREATE POLICY "Service role full access to tags" ON tags
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to department_roles" ON department_roles
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to role_tags" ON role_tags
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to responsibilities" ON responsibilities
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to role_responsibilities" ON role_responsibilities
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to responsibility_tags" ON responsibility_tags
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to user_roles" ON user_roles
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to user_responsibilities" ON user_responsibilities
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to agent_tags" ON agent_tags
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to workflow_tags" ON workflow_tags
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to digm_config" ON digm_config
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to governance_values" ON governance_values
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to governance_principles" ON governance_principles
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to governance_conflicts" ON governance_conflicts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to escalation_rules" ON escalation_rules
    FOR ALL USING (auth.role() = 'service_role');

-- Users can view tags, roles, responsibilities (public read)
CREATE POLICY "Users can view tags" ON tags
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view department_roles" ON department_roles
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view responsibilities" ON responsibilities
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view role_tags" ON role_tags
    FOR SELECT USING (true);

CREATE POLICY "Users can view role_responsibilities" ON role_responsibilities
    FOR SELECT USING (true);

CREATE POLICY "Users can view responsibility_tags" ON responsibility_tags
    FOR SELECT USING (true);

-- Users can view their own assignments
CREATE POLICY "Users can view own user_roles" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own user_responsibilities" ON user_responsibilities
    FOR SELECT USING (auth.uid() = user_id);

-- Users can view agent/workflow tags for matching
CREATE POLICY "Users can view agent_tags" ON agent_tags
    FOR SELECT USING (true);

CREATE POLICY "Users can view workflow_tags" ON workflow_tags
    FOR SELECT USING (true);

-- Users can view governance config (public read for enforcement)
CREATE POLICY "Users can view digm_config" ON digm_config
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view governance_values" ON governance_values
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view governance_principles" ON governance_principles
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view escalation_rules" ON escalation_rules
    FOR SELECT USING (is_active = true);

-- Users can view conflicts they created or are involved in
CREATE POLICY "Users can view governance_conflicts" ON governance_conflicts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = governance_conflicts.conversation_id
            AND c.user_id = auth.uid()
        )
    );

-- ============================================
-- USEFUL VIEWS
-- ============================================

-- View: User's effective tags (from roles + responsibilities)
CREATE OR REPLACE VIEW user_effective_tags AS
SELECT DISTINCT
    ur.user_id,
    t.id AS tag_id,
    t.name AS tag_name,
    t.category AS tag_category,
    'role' AS source
FROM user_roles ur
JOIN role_tags rt ON rt.role_id = ur.role_id
JOIN tags t ON t.id = rt.tag_id
WHERE t.is_active = true
UNION
SELECT DISTINCT
    ures.user_id,
    t.id AS tag_id,
    t.name AS tag_name,
    t.category AS tag_category,
    'responsibility' AS source
FROM user_responsibilities ures
JOIN responsibility_tags rest ON rest.responsibility_id = ures.responsibility_id
JOIN tags t ON t.id = rest.tag_id
WHERE t.is_active = true;

COMMENT ON VIEW user_effective_tags IS 'Computed view of all tags applicable to a user';

-- View: Matched agents for a user
CREATE OR REPLACE VIEW user_matched_agents AS
SELECT DISTINCT
    uet.user_id,
    a.id AS agent_id,
    a.name AS agent_name,
    a.suite,
    a.category
FROM user_effective_tags uet
JOIN agent_tags at ON at.tag_id = uet.tag_id
JOIN agents a ON a.id = at.agent_id
WHERE a.is_active = true;

COMMENT ON VIEW user_matched_agents IS 'Agents matched to users based on their effective tags';

-- View: Matched workflows for a user
CREATE OR REPLACE VIEW user_matched_workflows AS
SELECT DISTINCT
    uet.user_id,
    w.id AS workflow_id,
    w.name AS workflow_name,
    w.description
FROM user_effective_tags uet
JOIN workflow_tags wt ON wt.tag_id = uet.tag_id
JOIN workflows w ON w.id = wt.workflow_id
WHERE w.is_active = true;

COMMENT ON VIEW user_matched_workflows IS 'Workflows matched to users based on their effective tags';

-- View: Tag hierarchy
CREATE OR REPLACE VIEW tag_hierarchy AS
WITH RECURSIVE tag_tree AS (
    SELECT
        id,
        name,
        category,
        parent_id,
        name AS path,
        0 AS depth
    FROM tags
    WHERE parent_id IS NULL AND is_active = true
    UNION ALL
    SELECT
        t.id,
        t.name,
        t.category,
        t.parent_id,
        tt.path || ' > ' || t.name AS path,
        tt.depth + 1
    FROM tags t
    JOIN tag_tree tt ON t.parent_id = tt.id
    WHERE t.is_active = true
)
SELECT * FROM tag_tree ORDER BY category, path;

COMMENT ON VIEW tag_hierarchy IS 'Hierarchical view of tags with computed path';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Show all new tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'tags', 'department_roles', 'role_tags', 'responsibilities',
    'role_responsibilities', 'responsibility_tags', 'user_roles',
    'user_responsibilities', 'agent_tags', 'workflow_tags',
    'digm_config', 'governance_values', 'governance_principles',
    'governance_conflicts', 'escalation_rules'
)
ORDER BY table_name;

-- Show policy count for new tables
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN (
    'tags', 'department_roles', 'role_tags', 'responsibilities',
    'role_responsibilities', 'responsibility_tags', 'user_roles',
    'user_responsibilities', 'agent_tags', 'workflow_tags',
    'digm_config', 'governance_values', 'governance_principles',
    'governance_conflicts', 'escalation_rules'
)
GROUP BY tablename
ORDER BY tablename;
