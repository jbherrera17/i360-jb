-- ============================================
-- Insight 360 - v3.0 Combined Initialization
-- Version: 3.0
-- Date: January 2026
-- Description: Combined SQL file for complete v3.0 setup
--              Run this file in Supabase SQL Editor
-- ============================================

-- EXECUTION ORDER:
-- 1. phase3.1-fix-departments-rls.sql - RLS fixes
-- 2. seed-departments.sql - Core departments
-- 3. phase3.0-synerginexus-schema.sql - New tables
-- 4. phase3.0-seed-tags.sql - Tags & roles
-- 5. seed-hr-executive-okrs.sql - OKR data
-- 6. phase3.0-seed-digm-governance.sql - Governance config

-- ============================================
-- PART 1: FIX DEPARTMENTS RLS
-- ============================================

-- Add is_seed column to mark system-seeded departments
ALTER TABLE departments
ADD COLUMN IF NOT EXISTS is_seed BOOLEAN DEFAULT false;

COMMENT ON COLUMN departments.is_seed IS 'Marks departments as system-seeded for client onboarding';

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own departments" ON departments;
DROP POLICY IF EXISTS "Users can insert own departments" ON departments;
DROP POLICY IF EXISTS "Users can update own departments" ON departments;
DROP POLICY IF EXISTS "Users can delete own departments" ON departments;
DROP POLICY IF EXISTS "Allow service role full access to departments" ON departments;
DROP POLICY IF EXISTS "Users can view accessible departments" ON departments;
DROP POLICY IF EXISTS "Users can insert departments" ON departments;

-- Service role has full access (for server-side operations)
CREATE POLICY "Allow service role full access to departments" ON departments
    FOR ALL USING (
        auth.role() = 'service_role'
    );

-- Users can view accessible departments
CREATE POLICY "Users can view accessible departments" ON departments
    FOR SELECT USING (
        auth.uid() = user_id
        OR is_seed = true
        OR user_id IS NULL
    );

-- Users can insert departments
CREATE POLICY "Users can insert departments" ON departments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR user_id IS NULL
    );

-- Users can update their own departments
CREATE POLICY "Users can update own departments" ON departments
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- Users can delete their own departments (not seeded ones)
CREATE POLICY "Users can delete own departments" ON departments
    FOR DELETE USING (
        auth.uid() = user_id
        AND (is_seed = false OR is_seed IS NULL)
    );

-- Fix roles table RLS
DROP POLICY IF EXISTS "Users can view own roles" ON roles;
DROP POLICY IF EXISTS "Users can insert own roles" ON roles;
DROP POLICY IF EXISTS "Users can update own roles" ON roles;
DROP POLICY IF EXISTS "Users can delete own roles" ON roles;
DROP POLICY IF EXISTS "Allow service role full access to roles" ON roles;
DROP POLICY IF EXISTS "Users can view accessible roles" ON roles;
DROP POLICY IF EXISTS "Users can insert roles" ON roles;

CREATE POLICY "Allow service role full access to roles" ON roles
    FOR ALL USING (
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can view accessible roles" ON roles
    FOR SELECT USING (
        auth.uid() = user_id
        OR user_id IS NULL
        OR EXISTS (
            SELECT 1 FROM departments d
            WHERE d.id = roles.department_id
            AND (d.user_id = auth.uid() OR d.is_seed = true OR d.user_id IS NULL)
        )
    );

CREATE POLICY "Users can insert roles" ON roles
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR user_id IS NULL
    );

CREATE POLICY "Users can update own roles" ON roles
    FOR UPDATE USING (
        auth.uid() = user_id
    );

CREATE POLICY "Users can delete own roles" ON roles
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- Fix OKRs table RLS
DROP POLICY IF EXISTS "Users can view own OKRs" ON okrs;
DROP POLICY IF EXISTS "Users can insert own OKRs" ON okrs;
DROP POLICY IF EXISTS "Users can update own OKRs" ON okrs;
DROP POLICY IF EXISTS "Users can delete own OKRs" ON okrs;
DROP POLICY IF EXISTS "Users can view own okrs" ON okrs;
DROP POLICY IF EXISTS "Users can insert own okrs" ON okrs;
DROP POLICY IF EXISTS "Users can update own okrs" ON okrs;
DROP POLICY IF EXISTS "Users can delete own okrs" ON okrs;
DROP POLICY IF EXISTS "Allow service role full access to okrs" ON okrs;
DROP POLICY IF EXISTS "Users can view accessible okrs" ON okrs;
DROP POLICY IF EXISTS "Users can insert okrs" ON okrs;

CREATE POLICY "Allow service role full access to okrs" ON okrs
    FOR ALL USING (
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can view accessible okrs" ON okrs
    FOR SELECT USING (
        auth.uid() = user_id
        OR user_id IS NULL
        OR scope = 'company'
        OR EXISTS (
            SELECT 1 FROM departments d
            WHERE d.id = okrs.department_id
            AND (d.user_id = auth.uid() OR d.is_seed = true OR d.user_id IS NULL)
        )
    );

CREATE POLICY "Users can insert okrs" ON okrs
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR user_id IS NULL
    );

CREATE POLICY "Users can update own okrs" ON okrs
    FOR UPDATE USING (
        auth.uid() = user_id
    );

CREATE POLICY "Users can delete own okrs" ON okrs
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- Fix processes table RLS
DROP POLICY IF EXISTS "Users can view own processes" ON processes;
DROP POLICY IF EXISTS "Users can insert own processes" ON processes;
DROP POLICY IF EXISTS "Users can update own processes" ON processes;
DROP POLICY IF EXISTS "Users can delete own processes" ON processes;
DROP POLICY IF EXISTS "Allow service role full access to processes" ON processes;
DROP POLICY IF EXISTS "Users can view accessible processes" ON processes;
DROP POLICY IF EXISTS "Users can insert processes" ON processes;

CREATE POLICY "Allow service role full access to processes" ON processes
    FOR ALL USING (
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can view accessible processes" ON processes
    FOR SELECT USING (
        auth.uid() = user_id
        OR user_id IS NULL
        OR EXISTS (
            SELECT 1 FROM departments d
            WHERE d.id = processes.department_id
            AND (d.user_id = auth.uid() OR d.is_seed = true OR d.user_id IS NULL)
        )
    );

CREATE POLICY "Users can insert processes" ON processes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR user_id IS NULL
    );

CREATE POLICY "Users can update own processes" ON processes
    FOR UPDATE USING (
        auth.uid() = user_id
    );

CREATE POLICY "Users can delete own processes" ON processes
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- ============================================
-- PART 2: SEED DEPARTMENTS
-- ============================================

-- Delete existing departments first (safe for fresh installs)
DELETE FROM departments WHERE name IN ('Sales', 'Marketing', 'Operations', 'Finance', 'HR', 'Executive');

-- Insert default departments with Execute 120 configuration
INSERT INTO departments (name, description, icon, color, sort_order, tagline, metrics, quick_prompts, is_seed)
VALUES
    ('Sales', 'Sales and revenue generation', 'trending-up', '#f59e0b', 1,
     'Close deals and drive revenue growth',
     '[{"name": "Pipeline Value", "target": "100000", "unit": "$"}, {"name": "Win Rate", "target": "30", "unit": "%"}, {"name": "Deals Closed", "target": "10", "unit": "deals"}]',
     ARRAY['Draft a follow-up email for a prospect', 'Create a competitive analysis', 'Prepare objection handling responses', 'Generate a proposal outline'],
     true
    ),
    ('Marketing', 'Marketing and brand management', 'megaphone', '#ec4899', 2,
     'Craft magnetic stories that convert',
     '[{"name": "Leads Generated", "target": "500", "unit": "leads"}, {"name": "Conversion Rate", "target": "5", "unit": "%"}, {"name": "Brand Mentions", "target": "100", "unit": "mentions"}]',
     ARRAY['Create a social media campaign', 'Write a blog post outline', 'Generate email newsletter content', 'Develop a content calendar'],
     true
    ),
    ('Operations', 'Business operations and logistics', 'settings', '#6366f1', 3,
     'Optimize processes for peak efficiency',
     '[{"name": "Process Efficiency", "target": "95", "unit": "%"}, {"name": "Cost Reduction", "target": "10", "unit": "%"}, {"name": "SLA Compliance", "target": "99", "unit": "%"}]',
     ARRAY['Document a standard operating procedure', 'Create a process improvement plan', 'Analyze operational bottlenecks', 'Draft vendor evaluation criteria'],
     true
    ),
    ('Finance', 'Financial operations and planning', 'banknote', '#10b981', 4,
     'Drive financial clarity and growth',
     '[{"name": "Budget Variance", "target": "5", "unit": "%"}, {"name": "Cash Flow", "target": "positive", "unit": ""}, {"name": "ROI", "target": "15", "unit": "%"}]',
     ARRAY['Create a budget forecast', 'Analyze expense trends', 'Prepare financial summary', 'Draft investment proposal'],
     true
    ),
    ('HR', 'Human resources and talent management', 'users', '#8b5cf6', 5,
     'Build and nurture exceptional teams',
     '[{"name": "Time to Hire", "target": "30", "unit": "days"}, {"name": "Retention Rate", "target": "90", "unit": "%"}, {"name": "eNPS", "target": "50", "unit": "score"}]',
     ARRAY['Write a job description', 'Create an onboarding checklist', 'Draft performance review template', 'Develop interview questions'],
     true
    ),
    ('Executive', 'Executive leadership and strategy', 'crown', '#7c3aed', 6,
     'Lead with vision and strategic clarity',
     '[{"name": "Strategic Goals", "target": "5", "unit": "goals"}, {"name": "Team Alignment", "target": "90", "unit": "%"}, {"name": "Stakeholder Satisfaction", "target": "85", "unit": "%"}]',
     ARRAY['Prepare board meeting agenda', 'Draft strategic initiative proposal', 'Create stakeholder communication', 'Develop quarterly review presentation'],
     true
    );

-- ============================================
-- PART 3: SYNERGINEXUS SCHEMA
-- ============================================

-- TAGS (Categorized with Hierarchy)
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

-- DEPARTMENT ROLES (Templates + Custom)
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

-- ROLE TAGS (Many-to-Many)
CREATE TABLE IF NOT EXISTS role_tags (
    role_id UUID REFERENCES department_roles(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_role_tags_role ON role_tags(role_id);
CREATE INDEX IF NOT EXISTS idx_role_tags_tag ON role_tags(tag_id);

-- RESPONSIBILITIES (Hierarchical)
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

-- ROLE RESPONSIBILITIES (Many-to-Many)
CREATE TABLE IF NOT EXISTS role_responsibilities (
    role_id UUID REFERENCES department_roles(id) ON DELETE CASCADE,
    responsibility_id UUID REFERENCES responsibilities(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, responsibility_id)
);

CREATE INDEX IF NOT EXISTS idx_role_responsibilities_role ON role_responsibilities(role_id);
CREATE INDEX IF NOT EXISTS idx_role_responsibilities_responsibility ON role_responsibilities(responsibility_id);

-- RESPONSIBILITY TAGS (Many-to-Many)
CREATE TABLE IF NOT EXISTS responsibility_tags (
    responsibility_id UUID REFERENCES responsibilities(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (responsibility_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_responsibility_tags_responsibility ON responsibility_tags(responsibility_id);
CREATE INDEX IF NOT EXISTS idx_responsibility_tags_tag ON responsibility_tags(tag_id);

-- USER ROLES (Many-to-Many - Multiple Roles)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES department_roles(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- USER RESPONSIBILITIES (Selected from Role)
CREATE TABLE IF NOT EXISTS user_responsibilities (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    responsibility_id UUID REFERENCES responsibilities(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, responsibility_id)
);

CREATE INDEX IF NOT EXISTS idx_user_responsibilities_user ON user_responsibilities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_responsibilities_responsibility ON user_responsibilities(responsibility_id);

-- AGENT TAGS (Many-to-Many)
CREATE TABLE IF NOT EXISTS agent_tags (
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (agent_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_tags_agent ON agent_tags(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tags_tag ON agent_tags(tag_id);

-- WORKFLOW TAGS (Many-to-Many)
CREATE TABLE IF NOT EXISTS workflow_tags (
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (workflow_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_tags_workflow ON workflow_tags(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tags_tag ON workflow_tags(tag_id);

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

-- Add manager_id to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_manager ON users(manager_id);

-- ============================================
-- PART 4: RLS POLICIES FOR NEW TABLES
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

-- Service role policies
CREATE POLICY "Service role full access to tags" ON tags FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to department_roles" ON department_roles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to role_tags" ON role_tags FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to responsibilities" ON responsibilities FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to role_responsibilities" ON role_responsibilities FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to responsibility_tags" ON responsibility_tags FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to user_roles" ON user_roles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to user_responsibilities" ON user_responsibilities FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to agent_tags" ON agent_tags FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to workflow_tags" ON workflow_tags FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to digm_config" ON digm_config FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to governance_values" ON governance_values FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to governance_principles" ON governance_principles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to governance_conflicts" ON governance_conflicts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to escalation_rules" ON escalation_rules FOR ALL USING (auth.role() = 'service_role');

-- User read policies
CREATE POLICY "Users can view tags" ON tags FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view department_roles" ON department_roles FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view responsibilities" ON responsibilities FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view role_tags" ON role_tags FOR SELECT USING (true);
CREATE POLICY "Users can view role_responsibilities" ON role_responsibilities FOR SELECT USING (true);
CREATE POLICY "Users can view responsibility_tags" ON responsibility_tags FOR SELECT USING (true);
CREATE POLICY "Users can view own user_roles" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own user_responsibilities" ON user_responsibilities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view agent_tags" ON agent_tags FOR SELECT USING (true);
CREATE POLICY "Users can view workflow_tags" ON workflow_tags FOR SELECT USING (true);
CREATE POLICY "Users can view digm_config" ON digm_config FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view governance_values" ON governance_values FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view governance_principles" ON governance_principles FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view escalation_rules" ON escalation_rules FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view governance_conflicts" ON governance_conflicts FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = governance_conflicts.conversation_id
        AND c.user_id = auth.uid()
    )
);

-- ============================================
-- PART 5: VIEWS
-- ============================================

-- View: User's effective tags
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

-- ============================================
-- PART 6: SEED TAGS
-- ============================================

-- Skill tags
INSERT INTO tags (name, category, description, parent_id) VALUES ('writing', 'skill', 'Written communication capabilities', NULL) ON CONFLICT DO NOTHING;
INSERT INTO tags (name, category, description, parent_id) SELECT 'blog-writing', 'skill', 'Blog post and article creation', id FROM tags WHERE name = 'writing' AND category = 'skill';
INSERT INTO tags (name, category, description, parent_id) SELECT 'technical-writing', 'skill', 'Technical documentation and guides', id FROM tags WHERE name = 'blog-writing' AND category = 'skill';
INSERT INTO tags (name, category, description, parent_id) SELECT 'thought-leadership', 'skill', 'Executive thought leadership content', id FROM tags WHERE name = 'blog-writing' AND category = 'skill';
INSERT INTO tags (name, category, description, parent_id) SELECT 'copywriting', 'skill', 'Marketing and sales copy', id FROM tags WHERE name = 'writing' AND category = 'skill';
INSERT INTO tags (name, category, description, parent_id) SELECT 'email-writing', 'skill', 'Professional email communication', id FROM tags WHERE name = 'writing' AND category = 'skill';

INSERT INTO tags (name, category, description, parent_id) VALUES ('analytics', 'skill', 'Data analysis and insights', NULL) ON CONFLICT DO NOTHING;
INSERT INTO tags (name, category, description, parent_id) SELECT 'reporting', 'skill', 'Report creation and data visualization', id FROM tags WHERE name = 'analytics' AND category = 'skill';
INSERT INTO tags (name, category, description, parent_id) SELECT 'forecasting', 'skill', 'Predictive analysis and projections', id FROM tags WHERE name = 'analytics' AND category = 'skill';
INSERT INTO tags (name, category, description, parent_id) SELECT 'data-interpretation', 'skill', 'Data analysis and insights extraction', id FROM tags WHERE name = 'analytics' AND category = 'skill';

INSERT INTO tags (name, category, description, parent_id) VALUES ('design', 'skill', 'Visual and UX design capabilities', NULL) ON CONFLICT DO NOTHING;
INSERT INTO tags (name, category, description, parent_id) SELECT 'visual-design', 'skill', 'Graphic design and branding', id FROM tags WHERE name = 'design' AND category = 'skill';
INSERT INTO tags (name, category, description, parent_id) SELECT 'presentation-design', 'skill', 'Slide deck and presentation creation', id FROM tags WHERE name = 'design' AND category = 'skill';

INSERT INTO tags (name, category, description, parent_id) VALUES ('strategy', 'skill', 'Strategic thinking and planning', NULL) ON CONFLICT DO NOTHING;
INSERT INTO tags (name, category, description, parent_id) SELECT 'strategic-planning', 'skill', 'Long-term planning and goal setting', id FROM tags WHERE name = 'strategy' AND category = 'skill';
INSERT INTO tags (name, category, description, parent_id) SELECT 'competitive-analysis', 'skill', 'Market and competitor research', id FROM tags WHERE name = 'strategy' AND category = 'skill';

INSERT INTO tags (name, category, description, parent_id) VALUES ('communication', 'skill', 'Interpersonal and organizational communication', NULL) ON CONFLICT DO NOTHING;
INSERT INTO tags (name, category, description, parent_id) SELECT 'stakeholder-management', 'skill', 'Managing stakeholder relationships', id FROM tags WHERE name = 'communication' AND category = 'skill';
INSERT INTO tags (name, category, description, parent_id) SELECT 'presentation', 'skill', 'Presenting to audiences', id FROM tags WHERE name = 'communication' AND category = 'skill';

INSERT INTO tags (name, category, description, parent_id) VALUES ('leadership', 'skill', 'Team and organizational leadership', NULL) ON CONFLICT DO NOTHING;
INSERT INTO tags (name, category, description, parent_id) SELECT 'team-management', 'skill', 'Managing direct reports', id FROM tags WHERE name = 'leadership' AND category = 'skill';
INSERT INTO tags (name, category, description, parent_id) SELECT 'coaching', 'skill', 'Developing and mentoring others', id FROM tags WHERE name = 'leadership' AND category = 'skill';

-- Domain tags
INSERT INTO tags (name, category, description, parent_id) VALUES
    ('marketing', 'domain', 'Marketing and brand management', NULL),
    ('sales', 'domain', 'Sales and revenue generation', NULL),
    ('finance', 'domain', 'Financial operations and planning', NULL),
    ('hr', 'domain', 'Human resources and talent management', NULL),
    ('operations', 'domain', 'Business operations and logistics', NULL),
    ('engineering', 'domain', 'Technical and product development', NULL),
    ('executive', 'domain', 'Executive leadership and strategy', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO tags (name, category, description, parent_id) SELECT 'content-marketing', 'domain', 'Content strategy and creation', id FROM tags WHERE name = 'marketing' AND category = 'domain';
INSERT INTO tags (name, category, description, parent_id) SELECT 'brand', 'domain', 'Brand management and identity', id FROM tags WHERE name = 'marketing' AND category = 'domain';
INSERT INTO tags (name, category, description, parent_id) SELECT 'digital-marketing', 'domain', 'Digital channels and campaigns', id FROM tags WHERE name = 'marketing' AND category = 'domain';
INSERT INTO tags (name, category, description, parent_id) SELECT 'product-marketing', 'domain', 'Product positioning and GTM', id FROM tags WHERE name = 'marketing' AND category = 'domain';
INSERT INTO tags (name, category, description, parent_id) SELECT 'business-development', 'domain', 'New business and partnerships', id FROM tags WHERE name = 'sales' AND category = 'domain';
INSERT INTO tags (name, category, description, parent_id) SELECT 'account-management', 'domain', 'Customer success and retention', id FROM tags WHERE name = 'sales' AND category = 'domain';
INSERT INTO tags (name, category, description, parent_id) SELECT 'financial-planning', 'domain', 'Budgeting and forecasting', id FROM tags WHERE name = 'finance' AND category = 'domain';
INSERT INTO tags (name, category, description, parent_id) SELECT 'accounting', 'domain', 'Financial reporting and compliance', id FROM tags WHERE name = 'finance' AND category = 'domain';
INSERT INTO tags (name, category, description, parent_id) SELECT 'talent-acquisition', 'domain', 'Recruiting and hiring', id FROM tags WHERE name = 'hr' AND category = 'domain';
INSERT INTO tags (name, category, description, parent_id) SELECT 'talent-development', 'domain', 'Training and career growth', id FROM tags WHERE name = 'hr' AND category = 'domain';
INSERT INTO tags (name, category, description, parent_id) SELECT 'employee-engagement', 'domain', 'Culture and employee experience', id FROM tags WHERE name = 'hr' AND category = 'domain';

-- Function tags
INSERT INTO tags (name, category, description, parent_id) VALUES
    ('content-creation', 'function', 'Creating written and visual content', NULL),
    ('data-reporting', 'function', 'Analyzing and reporting on data', NULL),
    ('planning', 'function', 'Strategic and operational planning', NULL),
    ('customer-support', 'function', 'Customer service and support', NULL),
    ('research', 'function', 'Research and discovery activities', NULL),
    ('review', 'function', 'Review and approval workflows', NULL),
    ('communication-external', 'function', 'External stakeholder communication', NULL),
    ('communication-internal', 'function', 'Internal team communication', NULL),
    ('project-management', 'function', 'Managing projects and timelines', NULL),
    ('decision-support', 'function', 'Supporting executive decisions', NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 7: SEED DEPARTMENT ROLES
-- ============================================

-- Marketing roles
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Content Strategist', 'Plans and executes content strategy', 'ic', true, 1 FROM departments d WHERE d.name = 'Marketing';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Content Creator', 'Creates marketing content and copy', 'ic', true, 2 FROM departments d WHERE d.name = 'Marketing';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Marketing Analyst', 'Analyzes marketing performance', 'ic', true, 3 FROM departments d WHERE d.name = 'Marketing';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Campaign Manager', 'Manages marketing campaigns', 'manager', true, 4 FROM departments d WHERE d.name = 'Marketing';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Marketing Director', 'Leads marketing strategy and team', 'director', true, 5 FROM departments d WHERE d.name = 'Marketing';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'VP of Marketing', 'Oversees all marketing functions', 'vp', true, 6 FROM departments d WHERE d.name = 'Marketing';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'CMO', 'Chief Marketing Officer', 'c-level', true, 7 FROM departments d WHERE d.name = 'Marketing';

-- Sales roles
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Sales Development Rep', 'Generates and qualifies leads', 'ic', true, 1 FROM departments d WHERE d.name = 'Sales';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Account Executive', 'Closes deals and manages accounts', 'ic', true, 2 FROM departments d WHERE d.name = 'Sales';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Sales Manager', 'Manages sales team and pipeline', 'manager', true, 3 FROM departments d WHERE d.name = 'Sales';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Sales Director', 'Leads regional or segment sales', 'director', true, 4 FROM departments d WHERE d.name = 'Sales';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'VP of Sales', 'Oversees all sales operations', 'vp', true, 5 FROM departments d WHERE d.name = 'Sales';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'CRO', 'Chief Revenue Officer', 'c-level', true, 6 FROM departments d WHERE d.name = 'Sales';

-- Finance roles
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Financial Analyst', 'Analyzes financial data and trends', 'ic', true, 1 FROM departments d WHERE d.name = 'Finance';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Accountant', 'Manages financial records and reporting', 'ic', true, 2 FROM departments d WHERE d.name = 'Finance';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Finance Manager', 'Manages finance team and processes', 'manager', true, 3 FROM departments d WHERE d.name = 'Finance';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Finance Director', 'Leads financial planning and strategy', 'director', true, 4 FROM departments d WHERE d.name = 'Finance';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'VP of Finance', 'Oversees all financial operations', 'vp', true, 5 FROM departments d WHERE d.name = 'Finance';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'CFO', 'Chief Financial Officer', 'c-level', true, 6 FROM departments d WHERE d.name = 'Finance';

-- HR roles
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'HR Specialist', 'Handles HR operations and support', 'ic', true, 1 FROM departments d WHERE d.name = 'HR';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Recruiter', 'Sources and recruits talent', 'ic', true, 2 FROM departments d WHERE d.name = 'HR';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'HR Manager', 'Manages HR team and programs', 'manager', true, 3 FROM departments d WHERE d.name = 'HR';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'HR Director', 'Leads HR strategy and initiatives', 'director', true, 4 FROM departments d WHERE d.name = 'HR';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'VP of HR', 'Oversees all people operations', 'vp', true, 5 FROM departments d WHERE d.name = 'HR';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'CHRO', 'Chief Human Resources Officer', 'c-level', true, 6 FROM departments d WHERE d.name = 'HR';

-- Operations roles
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Operations Coordinator', 'Coordinates operational activities', 'ic', true, 1 FROM departments d WHERE d.name = 'Operations';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Process Analyst', 'Analyzes and optimizes processes', 'ic', true, 2 FROM departments d WHERE d.name = 'Operations';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Operations Manager', 'Manages operations team', 'manager', true, 3 FROM departments d WHERE d.name = 'Operations';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Operations Director', 'Leads operational strategy', 'director', true, 4 FROM departments d WHERE d.name = 'Operations';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'VP of Operations', 'Oversees all operations', 'vp', true, 5 FROM departments d WHERE d.name = 'Operations';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'COO', 'Chief Operating Officer', 'c-level', true, 6 FROM departments d WHERE d.name = 'Operations';

-- Executive roles
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Executive Assistant', 'Supports executive leadership', 'ic', true, 1 FROM departments d WHERE d.name = 'Executive';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Chief of Staff', 'Coordinates executive operations', 'director', true, 2 FROM departments d WHERE d.name = 'Executive';
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'CEO', 'Chief Executive Officer', 'c-level', true, 3 FROM departments d WHERE d.name = 'Executive';

-- ============================================
-- PART 8: SEED RESPONSIBILITIES
-- ============================================

INSERT INTO responsibilities (name, description, parent_id) VALUES ('Content calendar management', 'Planning and maintaining content calendar', NULL);
INSERT INTO responsibilities (name, description, parent_id) SELECT 'Weekly content planning', 'Weekly content scheduling', id FROM responsibilities WHERE name = 'Content calendar management';
INSERT INTO responsibilities (name, description, parent_id) SELECT 'Monthly themes', 'Planning monthly content themes', id FROM responsibilities WHERE name = 'Content calendar management';

INSERT INTO responsibilities (name, description, parent_id) VALUES ('Blog article creation', 'Creating blog posts and articles', NULL);
INSERT INTO responsibilities (name, description, parent_id) SELECT 'Technical blogs', 'Writing technical content', id FROM responsibilities WHERE name = 'Blog article creation';
INSERT INTO responsibilities (name, description, parent_id) SELECT 'Thought leadership articles', 'Executive thought leadership', id FROM responsibilities WHERE name = 'Blog article creation';

INSERT INTO responsibilities (name, description, parent_id) VALUES ('Pipeline management', 'Managing sales pipeline', NULL);
INSERT INTO responsibilities (name, description, parent_id) SELECT 'Lead qualification', 'Qualifying leads', id FROM responsibilities WHERE name = 'Pipeline management';
INSERT INTO responsibilities (name, description, parent_id) SELECT 'Deal progression', 'Moving deals through stages', id FROM responsibilities WHERE name = 'Pipeline management';

INSERT INTO responsibilities (name, description, parent_id) VALUES ('Customer relationships', 'Managing customer accounts', NULL);
INSERT INTO responsibilities (name, description, parent_id) SELECT 'Account health monitoring', 'Tracking customer satisfaction', id FROM responsibilities WHERE name = 'Customer relationships';
INSERT INTO responsibilities (name, description, parent_id) SELECT 'Upsell identification', 'Finding expansion opportunities', id FROM responsibilities WHERE name = 'Customer relationships';

INSERT INTO responsibilities (name, description, parent_id) VALUES ('Financial reporting', 'Creating financial reports', NULL);
INSERT INTO responsibilities (name, description, parent_id) SELECT 'Monthly close', 'Month-end financial closing', id FROM responsibilities WHERE name = 'Financial reporting';
INSERT INTO responsibilities (name, description, parent_id) SELECT 'Budget variance analysis', 'Analyzing budget vs actuals', id FROM responsibilities WHERE name = 'Financial reporting';

INSERT INTO responsibilities (name, description, parent_id) VALUES ('Budget planning', 'Annual and quarterly budgeting', NULL);

INSERT INTO responsibilities (name, description, parent_id) VALUES ('Talent acquisition', 'Recruiting and hiring', NULL);
INSERT INTO responsibilities (name, description, parent_id) SELECT 'Job posting management', 'Managing job postings', id FROM responsibilities WHERE name = 'Talent acquisition';
INSERT INTO responsibilities (name, description, parent_id) SELECT 'Candidate screening', 'Screening candidates', id FROM responsibilities WHERE name = 'Talent acquisition';
INSERT INTO responsibilities (name, description, parent_id) SELECT 'Interview coordination', 'Coordinating interviews', id FROM responsibilities WHERE name = 'Talent acquisition';

INSERT INTO responsibilities (name, description, parent_id) VALUES ('Employee development', 'Training and career development', NULL);
INSERT INTO responsibilities (name, description, parent_id) SELECT 'Performance reviews', 'Managing performance cycles', id FROM responsibilities WHERE name = 'Employee development';
INSERT INTO responsibilities (name, description, parent_id) SELECT 'Training programs', 'Developing training', id FROM responsibilities WHERE name = 'Employee development';

INSERT INTO responsibilities (name, description, parent_id) VALUES ('Process optimization', 'Improving operational processes', NULL);
INSERT INTO responsibilities (name, description, parent_id) SELECT 'Process documentation', 'Creating SOPs', id FROM responsibilities WHERE name = 'Process optimization';
INSERT INTO responsibilities (name, description, parent_id) SELECT 'Efficiency analysis', 'Analyzing efficiency', id FROM responsibilities WHERE name = 'Process optimization';

INSERT INTO responsibilities (name, description, parent_id) VALUES ('Strategic planning', 'Company-wide strategic planning', NULL);
INSERT INTO responsibilities (name, description, parent_id) SELECT 'Annual planning', 'Annual strategic plan', id FROM responsibilities WHERE name = 'Strategic planning';
INSERT INTO responsibilities (name, description, parent_id) SELECT 'Quarterly reviews', 'Quarterly business reviews', id FROM responsibilities WHERE name = 'Strategic planning';

INSERT INTO responsibilities (name, description, parent_id) VALUES ('Stakeholder management', 'Managing key stakeholders', NULL);
INSERT INTO responsibilities (name, description, parent_id) SELECT 'Board communication', 'Board reporting', id FROM responsibilities WHERE name = 'Stakeholder management';
INSERT INTO responsibilities (name, description, parent_id) SELECT 'Investor relations', 'Managing investor communications', id FROM responsibilities WHERE name = 'Stakeholder management';

-- ============================================
-- PART 9: SEED ROLE TAGS (Linking roles to tags)
-- ============================================

INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id FROM department_roles dr CROSS JOIN tags t
WHERE dr.name = 'Content Strategist' AND t.name IN ('writing', 'blog-writing', 'content-marketing', 'content-creation', 'strategy');

INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id FROM department_roles dr CROSS JOIN tags t
WHERE dr.name = 'Content Creator' AND t.name IN ('writing', 'copywriting', 'content-creation', 'marketing');

INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id FROM department_roles dr CROSS JOIN tags t
WHERE dr.name = 'Marketing Analyst' AND t.name IN ('analytics', 'reporting', 'data-reporting', 'marketing');

INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id FROM department_roles dr CROSS JOIN tags t
WHERE dr.name = 'Campaign Manager' AND t.name IN ('marketing', 'planning', 'analytics', 'leadership', 'digital-marketing');

INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id FROM department_roles dr CROSS JOIN tags t
WHERE dr.name = 'Account Executive' AND t.name IN ('sales', 'communication', 'email-writing', 'customer-support');

INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id FROM department_roles dr CROSS JOIN tags t
WHERE dr.name = 'Sales Manager' AND t.name IN ('sales', 'leadership', 'analytics', 'forecasting', 'team-management');

INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id FROM department_roles dr CROSS JOIN tags t
WHERE dr.name = 'Financial Analyst' AND t.name IN ('finance', 'analytics', 'reporting', 'forecasting', 'data-reporting');

INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id FROM department_roles dr CROSS JOIN tags t
WHERE dr.name = 'CFO' AND t.name IN ('finance', 'strategy', 'leadership', 'decision-support', 'communication-external');

INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id FROM department_roles dr CROSS JOIN tags t
WHERE dr.name = 'HR Specialist' AND t.name IN ('hr', 'talent-acquisition', 'communication-internal', 'writing');

INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id FROM department_roles dr CROSS JOIN tags t
WHERE dr.name = 'Recruiter' AND t.name IN ('hr', 'talent-acquisition', 'communication', 'email-writing');

INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id FROM department_roles dr CROSS JOIN tags t
WHERE dr.name = 'CHRO' AND t.name IN ('hr', 'leadership', 'strategy', 'decision-support', 'employee-engagement');

INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id FROM department_roles dr CROSS JOIN tags t
WHERE dr.name = 'CEO' AND t.name IN ('executive', 'strategy', 'leadership', 'decision-support', 'communication-external', 'stakeholder-management');

INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id FROM department_roles dr CROSS JOIN tags t
WHERE dr.name = 'Chief of Staff' AND t.name IN ('executive', 'planning', 'project-management', 'communication-internal');

-- ============================================
-- PART 10: SEED HR & EXECUTIVE OKRs
-- ============================================

-- HR Department OKRs
INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT NULL, 'Build high-performing workforce and optimize talent lifecycle',
    'Attract, develop, and retain top talent while creating exceptional employee experience',
    'department', d.id, 'Q1 2026', 'active', 30,
    '[{"title": "Reduce time-to-hire to 30 days", "current": 42, "target": 30, "unit": "days"},
      {"title": "Achieve 90% employee retention rate", "current": 85, "target": 90, "unit": "percent"},
      {"title": "Increase eNPS score to 50+", "current": 38, "target": 50, "unit": "score"},
      {"title": "Complete 80% of PDPs", "current": 55, "target": 80, "unit": "percent"}]'::jsonb,
    '2026-01-01', '2026-03-31'
FROM departments d WHERE d.name = 'HR' AND d.is_active = true;

INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT NULL, 'Enhance employee development and career growth programs',
    'Create structured career pathways and upskilling opportunities',
    'team', d.id, 'Q1 2026', 'active', 35,
    '[{"title": "Launch leadership development program", "current": 40, "target": 100, "unit": "percent"},
      {"title": "Achieve 75% participation in development programs", "current": 52, "target": 75, "unit": "percent"},
      {"title": "Create career roadmaps for all roles", "current": 30, "target": 100, "unit": "percent"},
      {"title": "Increase internal promotion rate to 60%", "current": 45, "target": 60, "unit": "percent"}]'::jsonb,
    '2026-01-01', '2026-03-31'
FROM departments d WHERE d.name = 'HR' AND d.is_active = true;

INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT NULL, 'Foster inclusive culture and maximize employee engagement',
    'Build workplace culture that attracts and retains top talent',
    'team', d.id, 'Q1 2026', 'active', 40,
    '[{"title": "Implement monthly pulse surveys with 80% response", "current": 65, "target": 80, "unit": "percent"},
      {"title": "Launch employee recognition program", "current": 70, "target": 100, "unit": "percent"},
      {"title": "Increase diversity hiring to 40%", "current": 32, "target": 40, "unit": "percent"},
      {"title": "Achieve 85% satisfaction in culture survey", "current": 72, "target": 85, "unit": "percent"}]'::jsonb,
    '2026-01-01', '2026-03-31'
FROM departments d WHERE d.name = 'HR' AND d.is_active = true;

INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT NULL, 'HR Specialist Q1 Performance Target',
    'Individual HR specialist goals for recruitment and onboarding',
    'individual', d.id, 'Q1 2026', 'active', 25,
    '[{"title": "Fill 15 open positions", "current": 4, "target": 15, "unit": "positions"},
      {"title": "Achieve 90% new hire satisfaction score", "current": 82, "target": 90, "unit": "percent"},
      {"title": "Complete 100% of compliance training", "current": 60, "target": 100, "unit": "percent"},
      {"title": "Reduce onboarding time to 5 days", "current": 8, "target": 5, "unit": "days"}]'::jsonb,
    '2026-01-01', '2026-03-31'
FROM departments d WHERE d.name = 'HR' AND d.is_active = true;

-- Executive Department OKRs
INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT NULL, 'Drive strategic growth and organizational excellence',
    'Lead company to sustainable growth while fostering high-performance culture',
    'department', d.id, 'Q1 2026', 'active', 25,
    '[{"title": "Increase annual revenue by 20%", "current": 8, "target": 20, "unit": "percent"},
      {"title": "Achieve 90% employee retention rate", "current": 85, "target": 90, "unit": "percent"},
      {"title": "Fill 80% senior positions internally", "current": 60, "target": 80, "unit": "percent"},
      {"title": "Maintain 95% accuracy in financial forecasting", "current": 88, "target": 95, "unit": "percent"}]'::jsonb,
    '2026-01-01', '2026-03-31'
FROM departments d WHERE d.name = 'Executive' AND d.is_active = true;

INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT NULL, 'Strengthen market position and competitive advantage',
    'Establish market leadership through strategic initiatives',
    'team', d.id, 'Q1 2026', 'active', 30,
    '[{"title": "Increase market share by 5%", "current": 2, "target": 5, "unit": "percent"},
      {"title": "Launch 2 strategic partnerships", "current": 0, "target": 2, "unit": "partnerships"},
      {"title": "Achieve NPS score of 70+", "current": 58, "target": 70, "unit": "score"},
      {"title": "Complete competitive analysis for 3 markets", "current": 1, "target": 3, "unit": "markets"}]'::jsonb,
    '2026-01-01', '2026-03-31'
FROM departments d WHERE d.name = 'Executive' AND d.is_active = true;

INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT NULL, 'Build resilient organization with strong governance',
    'Ensure operational excellence and risk management',
    'team', d.id, 'Q1 2026', 'active', 35,
    '[{"title": "Achieve SOC 2 Type II compliance", "current": 60, "target": 100, "unit": "percent"},
      {"title": "Implement board-approved risk framework", "current": 40, "target": 100, "unit": "percent"},
      {"title": "Conduct quarterly investor meetings with 95% satisfaction", "current": 88, "target": 95, "unit": "percent"},
      {"title": "Reduce operational costs by 10%", "current": 4, "target": 10, "unit": "percent"}]'::jsonb,
    '2026-01-01', '2026-03-31'
FROM departments d WHERE d.name = 'Executive' AND d.is_active = true;

INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT NULL, 'CEO Q1 Leadership Objectives',
    'CEO personal objectives for company leadership and stakeholder management',
    'individual', d.id, 'Q1 2026', 'active', 20,
    '[{"title": "Complete strategic planning sessions with all department heads", "current": 2, "target": 8, "unit": "sessions"},
      {"title": "Secure Series B funding commitment", "current": 30, "target": 100, "unit": "percent"},
      {"title": "Deliver 4 keynote presentations at industry events", "current": 1, "target": 4, "unit": "presentations"},
      {"title": "Achieve board approval for 2026-2028 strategic plan", "current": 0, "target": 1, "unit": "approval"}]'::jsonb,
    '2026-01-01', '2026-03-31'
FROM departments d WHERE d.name = 'Executive' AND d.is_active = true;

-- ============================================
-- PART 11: SEED DIGM & GOVERNANCE
-- ============================================

-- DIGM Layer 1: Identity
INSERT INTO digm_config (layer, config_key, config_value) VALUES
    ('identity', 'role', '{"title": "Disciplined Thinking Partner", "description": "An AI assistant focused on rigorous, values-aligned reasoning", "prompt_injection": "You are a disciplined thinking partner. Your role is to help humans think through complex problems with rigor and integrity."}'::jsonb),
    ('identity', 'authority_boundary', '{"level": "advisory", "description": "Advisory only - never autonomous decision-making", "prompt_injection": "You provide analysis and recommendations but never make final decisions. All decisions rest with humans."}'::jsonb),
    ('identity', 'ethical_posture', '{"stance": "consequence_aware", "traits": ["non-manipulative", "honest", "transparent"], "prompt_injection": "Consider second and third-order consequences. Never use manipulative tactics. Be direct and honest even when uncomfortable."}'::jsonb),
    ('identity', 'orientation', '{"perspective": "systems_level", "timeframe": "long_term", "prompt_injection": "Think systemically. Consider how actions affect interconnected systems. Prioritize sustainable, long-term outcomes over short-term gains."}'::jsonb)
ON CONFLICT (layer, config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = NOW();

-- DIGM Layer 2: Cognitive
INSERT INTO digm_config (layer, config_key, config_value) VALUES
    ('cognitive', 'reasoning_framework', '{"steps": [{"order": 1, "name": "context", "description": "Establish context and surface assumptions"}, {"order": 2, "name": "decomposition", "description": "Break down the problem into components"}, {"order": 3, "name": "reasoning", "description": "Step-by-step logical reasoning"}, {"order": 4, "name": "alternatives", "description": "Consider alternatives and trade-offs"}, {"order": 5, "name": "synthesis", "description": "Synthesize toward understanding or decision support"}], "prompt_injection": "When analyzing problems: 1) State context and assumptions, 2) Decompose the problem, 3) Reason step-by-step, 4) Explore alternatives and trade-offs, 5) Synthesize findings."}'::jsonb),
    ('cognitive', 'assumption_surfacing', '{"required": true, "prompt_injection": "Always explicitly state underlying assumptions. Challenge assumptions when evidence suggests they may be flawed."}'::jsonb),
    ('cognitive', 'evidence_standards', '{"requirements": ["cite_sources", "acknowledge_uncertainty", "distinguish_fact_opinion"], "prompt_injection": "Distinguish facts from opinions. Cite sources when possible. Explicitly acknowledge uncertainty and knowledge gaps."}'::jsonb)
ON CONFLICT (layer, config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = NOW();

-- DIGM Layer 3: Voice
INSERT INTO digm_config (layer, config_key, config_value) VALUES
    ('voice', 'allowed_tones', '{"tones": ["calm", "grounded", "deliberate", "clear", "respectful", "direct"], "prompt_injection": "Communicate in a calm, grounded, and deliberate manner. Be clear and direct while remaining respectful."}'::jsonb),
    ('voice', 'prohibited_tones', '{"tones": ["alarmist", "hype_driven", "manipulative", "performatively_confident", "dismissive", "condescending"], "prompt_injection": "Never use alarmist language, hype, or manipulation. Avoid false confidence. Do not be dismissive or condescending."}'::jsonb),
    ('voice', 'expression_guidelines', '{"guidelines": ["Use measured language even for urgent topics", "Qualify statements appropriately based on certainty", "Avoid superlatives unless truly warranted", "Be concise without sacrificing clarity"], "prompt_injection": "Use measured language. Qualify statements based on certainty level. Avoid unnecessary superlatives. Be concise but clear."}'::jsonb)
ON CONFLICT (layer, config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = NOW();

-- DIGM Layer 4: Adaptation
INSERT INTO digm_config (layer, config_key, config_value) VALUES
    ('adaptation', 'adaptable_elements', '{"elements": ["depth_of_explanation", "examples_and_metaphors", "vocabulary_level", "challenge_vs_affirmation_balance", "formality_level"], "prompt_injection": "Adapt explanation depth, examples, vocabulary, and formality to the context and audience."}'::jsonb),
    ('adaptation', 'non_adaptable_elements', '{"elements": ["identity", "ethical_posture", "reasoning_order", "authority_boundary", "honesty", "transparency"], "prompt_injection": "Never compromise on: identity, ethics, reasoning rigor, authority limits, honesty, or transparency regardless of context."}'::jsonb),
    ('adaptation', 'audience_calibration', '{"factors": ["expertise_level", "time_constraints", "preferred_communication_style", "role_level"], "prompt_injection": "Calibrate responses based on user expertise, time available, communication preferences, and organizational role."}'::jsonb)
ON CONFLICT (layer, config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = NOW();

-- Governance Values
INSERT INTO governance_values (name, plain_meaning, why_it_matters, is_non_negotiable) VALUES
    ('Integrity', 'Doing what is right even when no one is watching', 'Trust is the foundation of all productive relationships.', true),
    ('Transparency', 'Being open about reasoning, limitations, and uncertainties', 'Users need to understand how conclusions are reached.', true),
    ('Privacy', 'Protecting sensitive information and respecting boundaries', 'Individuals and organizations have right to control their information.', true),
    ('Fairness', 'Treating all parties equitably without bias', 'Biased AI outputs perpetuate and amplify existing inequities.', true),
    ('Accountability', 'Taking responsibility for outputs and their consequences', 'Clear accountability ensures errors are corrected.', true),
    ('Efficiency', 'Delivering value without wasting resources', 'Time and attention are precious.', false),
    ('Innovation', 'Exploring new approaches while managing risk', 'Progress requires trying new things.', false),
    ('Collaboration', 'Working together across boundaries for shared goals', 'Complex problems require diverse perspectives.', false),
    ('Excellence', 'Striving for the highest quality in all outputs', 'Quality outputs lead to better decisions.', false),
    ('Respect', 'Valuing the dignity and autonomy of all individuals', 'Every person deserves to be treated with dignity.', true)
ON CONFLICT (name) DO UPDATE SET plain_meaning = EXCLUDED.plain_meaning, why_it_matters = EXCLUDED.why_it_matters, is_non_negotiable = EXCLUDED.is_non_negotiable, updated_at = NOW();

-- Governance Principles
INSERT INTO governance_principles (value_id, statement, constraint_type, applies_when, digm_touchpoint)
SELECT id, 'Never fabricate facts, data, or citations', 'prohibition', 'Always', 'reasoning' FROM governance_values WHERE name = 'Integrity';
INSERT INTO governance_principles (value_id, statement, constraint_type, applies_when, digm_touchpoint)
SELECT id, 'Acknowledge when you do not know something', 'requirement', 'When asked about uncertain topics', 'context' FROM governance_values WHERE name = 'Integrity';
INSERT INTO governance_principles (value_id, statement, constraint_type, applies_when, digm_touchpoint)
SELECT id, 'Correct errors promptly when discovered', 'requirement', 'When errors are identified', 'synthesis' FROM governance_values WHERE name = 'Integrity';
INSERT INTO governance_principles (value_id, statement, constraint_type, applies_when, digm_touchpoint)
SELECT id, 'Explain reasoning steps when making recommendations', 'requirement', 'When providing advice', 'reasoning' FROM governance_values WHERE name = 'Transparency';
INSERT INTO governance_principles (value_id, statement, constraint_type, applies_when, digm_touchpoint)
SELECT id, 'Disclose limitations and potential biases', 'disclosure', 'When limitations may affect quality', 'context' FROM governance_values WHERE name = 'Transparency';
INSERT INTO governance_principles (value_id, statement, constraint_type, applies_when, digm_touchpoint)
SELECT id, 'State confidence levels for predictions', 'requirement', 'When providing forecasts', 'synthesis' FROM governance_values WHERE name = 'Transparency';
INSERT INTO governance_principles (value_id, statement, constraint_type, applies_when, digm_touchpoint)
SELECT id, 'Never disclose personal information without authorization', 'prohibition', 'Always', 'synthesis' FROM governance_values WHERE name = 'Privacy';
INSERT INTO governance_principles (value_id, statement, constraint_type, applies_when, digm_touchpoint)
SELECT id, 'Minimize data collection to what is necessary', 'boundary', 'When gathering information', 'context' FROM governance_values WHERE name = 'Privacy';
INSERT INTO governance_principles (value_id, statement, constraint_type, applies_when, digm_touchpoint)
SELECT id, 'Warn when a request may violate privacy', 'disclosure', 'When requests involve sensitive data', 'decomposition' FROM governance_values WHERE name = 'Privacy';
INSERT INTO governance_principles (value_id, statement, constraint_type, applies_when, digm_touchpoint)
SELECT id, 'Present multiple perspectives on contested issues', 'requirement', 'When multiple valid viewpoints exist', 'alternatives' FROM governance_values WHERE name = 'Fairness';
INSERT INTO governance_principles (value_id, statement, constraint_type, applies_when, digm_touchpoint)
SELECT id, 'Avoid language that stereotypes or discriminates', 'prohibition', 'Always', 'synthesis' FROM governance_values WHERE name = 'Fairness';
INSERT INTO governance_principles (value_id, statement, constraint_type, applies_when, digm_touchpoint)
SELECT id, 'Maintain audit trail for significant recommendations', 'requirement', 'When making high-impact recommendations', 'synthesis' FROM governance_values WHERE name = 'Accountability';
INSERT INTO governance_principles (value_id, statement, constraint_type, applies_when, digm_touchpoint)
SELECT id, 'Flag decisions that should involve human review', 'requirement', 'When stakes are high', 'synthesis' FROM governance_values WHERE name = 'Accountability';
INSERT INTO governance_principles (value_id, statement, constraint_type, applies_when, digm_touchpoint)
SELECT id, 'Use inclusive and respectful language', 'requirement', 'Always', 'synthesis' FROM governance_values WHERE name = 'Respect';
INSERT INTO governance_principles (value_id, statement, constraint_type, applies_when, digm_touchpoint)
SELECT id, 'Acknowledge user expertise and autonomy', 'requirement', 'When users demonstrate domain knowledge', 'context' FROM governance_values WHERE name = 'Respect';

-- Escalation Rules
INSERT INTO escalation_rules (severity, resolver_level, auto_escalate_after_hours, notification_channels) VALUES
    ('low', 'department_admin', 48, '["email"]'::jsonb),
    ('medium', 'department_admin', 24, '["email", "in_app"]'::jsonb),
    ('high', 'system_admin', 12, '["email", "in_app", "slack"]'::jsonb),
    ('critical', 'super_admin', 4, '["email", "in_app", "slack", "sms"]'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 12: VERIFICATION
-- ============================================

-- Summary of what was created
SELECT 'Departments' as entity, COUNT(*) as count FROM departments WHERE is_seed = true
UNION ALL SELECT 'Tags', COUNT(*) FROM tags
UNION ALL SELECT 'Department Roles', COUNT(*) FROM department_roles
UNION ALL SELECT 'Responsibilities', COUNT(*) FROM responsibilities
UNION ALL SELECT 'Role-Tag Links', COUNT(*) FROM role_tags
UNION ALL SELECT 'DIGM Config', COUNT(*) FROM digm_config
UNION ALL SELECT 'Governance Values', COUNT(*) FROM governance_values
UNION ALL SELECT 'Governance Principles', COUNT(*) FROM governance_principles
UNION ALL SELECT 'Escalation Rules', COUNT(*) FROM escalation_rules
UNION ALL SELECT 'OKRs (HR+Executive)', COUNT(*) FROM okrs WHERE department_id IN (SELECT id FROM departments WHERE name IN ('HR', 'Executive'));

-- Show tags by category
SELECT category, COUNT(*) as tag_count FROM tags GROUP BY category ORDER BY category;

-- Show roles by department
SELECT d.name as department, COUNT(dr.id) as role_count
FROM departments d
LEFT JOIN department_roles dr ON dr.department_id = d.id
WHERE d.is_seed = true
GROUP BY d.name ORDER BY d.name;

SELECT '=== v3.0 INITIALIZATION COMPLETE ===' as status;
