-- ============================================
-- PHASE 50: ROLE-BASED RESOURCE ASSIGNMENT
-- ============================================
-- Connects business roles and departments to agents, actions, skills,
-- and workflows so Execute 120 shows role-appropriate resources.
--
-- Run: Execute this SQL in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ENRICH ROLE DESCRIPTIONS (3 bullet points each)
-- ============================================

UPDATE business_role_levels SET description = '• Set company vision, strategy, and cross-org priorities
• Access all agents, workflows, and executive dashboards
• Approve budgets, partnerships, and board-level decisions'
WHERE id = 'executive';

UPDATE business_role_levels SET description = '• Lead department strategy and cross-team coordination
• Access strategic planning agents and advanced workflows
• Manage team performance, budgets, and department OKRs'
WHERE id = 'director';

UPDATE business_role_levels SET description = '• Orchestrate team workflows and project execution
• Access content creation, reporting, and coaching agents
• Track team metrics and escalate blockers'
WHERE id = 'manager';

UPDATE business_role_levels SET description = '• Execute assigned workflows and review team output
• Access operational agents and task-level tools
• Monitor daily metrics and flag issues'
WHERE id = 'supervisor';

UPDATE business_role_levels SET description = '• Execute personal tasks with productivity agents
• Use assigned skills for day-to-day work
• Follow established workflows and processes'
WHERE id = 'ic';

-- ============================================
-- 2. CREATE MISSING JUNCTION TABLES
-- ============================================

-- skill_roles: Maps skills to minimum business role levels
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

-- skill_departments: Maps skills to departments
CREATE TABLE IF NOT EXISTS skill_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(skill_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_departments_skill ON skill_departments(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_departments_dept ON skill_departments(department_id);

-- workflow_departments: Multi-department support for workflows
CREATE TABLE IF NOT EXISTS workflow_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workflow_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_departments_workflow ON workflow_departments(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_departments_dept ON workflow_departments(department_id);

-- ============================================
-- 3. RLS POLICIES
-- ============================================

ALTER TABLE skill_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_departments ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "Authenticated users can read skill_roles"
ON skill_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read skill_departments"
ON skill_departments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read workflow_departments"
ON workflow_departments FOR SELECT TO authenticated USING (true);

-- Service role full access
CREATE POLICY "Service role full access skill_roles"
ON skill_roles FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access skill_departments"
ON skill_departments FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access workflow_departments"
ON workflow_departments FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 4. SEED: AGENT → ROLE MAPPINGS
-- ============================================
-- Only map agents that require elevated roles.
-- Unmapped agents are accessible to all roles.

-- First Principles Thinker → Manager+ (strategic analysis)
INSERT INTO agent_roles (agent_id, role_level)
SELECT id, 'manager' FROM agents WHERE name = 'First Principles Thinker'
ON CONFLICT DO NOTHING;

-- Strategic Advisor → Director+ (executive counsel)
INSERT INTO agent_roles (agent_id, role_level)
SELECT id, 'director' FROM agents WHERE name = 'Strategic Advisor'
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. SEED: AGENT → DEPARTMENT MAPPINGS
-- ============================================
-- Map agents to the departments they serve.

-- Universal agents → All departments
INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
SELECT d.id, a.id, false, 10, 'Daily news and priority briefing'
FROM departments d CROSS JOIN agents a
WHERE a.name = 'Daily Briefer'
ON CONFLICT (department_id, agent_id) DO NOTHING;

INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
SELECT d.id, a.id, false, 20, 'Triage and prioritize incoming email'
FROM departments d CROSS JOIN agents a
WHERE a.name = 'Email Triager'
ON CONFLICT (department_id, agent_id) DO NOTHING;

INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
SELECT d.id, a.id, false, 30, 'Deep research on any topic'
FROM departments d CROSS JOIN agents a
WHERE a.name = 'Research Assistant'
ON CONFLICT (department_id, agent_id) DO NOTHING;

INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
SELECT d.id, a.id, false, 40, 'Prepare agendas and talking points'
FROM departments d CROSS JOIN agents a
WHERE a.name = 'Meeting Prep'
ON CONFLICT (department_id, agent_id) DO NOTHING;

-- Writing Coach → Marketing, Executive, Sales
INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
SELECT d.id, a.id, true, 5, 'Polish writing and improve communication'
FROM departments d CROSS JOIN agents a
WHERE a.name = 'Writing Coach' AND d.name IN ('Marketing', 'Executive', 'Sales')
ON CONFLICT (department_id, agent_id) DO NOTHING;

-- Code Reviewer → Operations
INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
SELECT d.id, a.id, true, 5, 'Review code quality and suggest improvements'
FROM departments d CROSS JOIN agents a
WHERE a.name = 'Code Reviewer' AND d.name = 'Operations'
ON CONFLICT (department_id, agent_id) DO NOTHING;

-- First Principles Thinker → Executive, Operations, Finance
INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
SELECT d.id, a.id, true, 3, 'Break down complex problems to fundamentals'
FROM departments d CROSS JOIN agents a
WHERE a.name = 'First Principles Thinker' AND d.name IN ('Executive', 'Operations', 'Finance')
ON CONFLICT (department_id, agent_id) DO NOTHING;

-- Strategic Advisor → Executive, Sales, Marketing, Operations
INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
SELECT d.id, a.id, true, 1, 'Executive-level strategic counsel'
FROM departments d CROSS JOIN agents a
WHERE a.name = 'Strategic Advisor' AND d.name IN ('Executive', 'Sales', 'Marketing', 'Operations')
ON CONFLICT (department_id, agent_id) DO NOTHING;

-- ============================================
-- 6. SEED: SKILL → ROLE MAPPINGS
-- ============================================

-- Weekly Article Package → Manager+ (content strategy ownership)
INSERT INTO skill_roles (skill_id, role_level, permission)
SELECT id, 'manager', 'execute' FROM skills WHERE name = 'weekly-article-package'
ON CONFLICT DO NOTHING;

-- AI Article Formatter and Notion Calendar Sync → no mapping = all roles

-- ============================================
-- 7. SEED: SKILL → DEPARTMENT MAPPINGS
-- ============================================

-- Weekly Article Package → Marketing, Executive
INSERT INTO skill_departments (skill_id, department_id, is_primary, priority)
SELECT s.id, d.id, (d.name = 'Marketing'), CASE WHEN d.name = 'Marketing' THEN 100 ELSE 80 END
FROM skills s CROSS JOIN departments d
WHERE s.name = 'weekly-article-package' AND d.name IN ('Marketing', 'Executive')
ON CONFLICT DO NOTHING;

-- AI Article Formatter → Marketing
INSERT INTO skill_departments (skill_id, department_id, is_primary, priority)
SELECT s.id, d.id, true, 100
FROM skills s CROSS JOIN departments d
WHERE s.name = 'ai-article-formatter' AND d.name = 'Marketing'
ON CONFLICT DO NOTHING;

-- Notion Calendar Sync → Marketing, Operations
INSERT INTO skill_departments (skill_id, department_id, is_primary, priority)
SELECT s.id, d.id, (d.name = 'Marketing'), CASE WHEN d.name = 'Marketing' THEN 100 ELSE 80 END
FROM skills s CROSS JOIN departments d
WHERE s.name = 'notion-calendar-sync' AND d.name IN ('Marketing', 'Operations')
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. SEED: WORKFLOW → ROLE MAPPINGS
-- ============================================

-- Thought Leadership Content Pipeline → Manager+
INSERT INTO workflow_roles (workflow_id, role_level, permission)
SELECT id, 'manager', 'execute' FROM workflows
WHERE name ILIKE '%Thought Leadership%'
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. SEED: WORKFLOW → DEPARTMENT MAPPINGS
-- ============================================

-- Migrate existing workflows.department_id to junction table
INSERT INTO workflow_departments (workflow_id, department_id, is_primary, priority)
SELECT id, department_id, true, 100
FROM workflows WHERE department_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Thought Leadership Pipeline → Marketing, Executive
INSERT INTO workflow_departments (workflow_id, department_id, is_primary, priority)
SELECT w.id, d.id, (d.name = 'Marketing'), CASE WHEN d.name = 'Marketing' THEN 100 ELSE 80 END
FROM workflows w CROSS JOIN departments d
WHERE w.name ILIKE '%Thought Leadership%' AND d.name IN ('Marketing', 'Executive')
ON CONFLICT DO NOTHING;

-- ============================================
-- 10. SEED: ACTION → ROLE MAPPING (business role level)
-- ============================================
-- action_roles uses Parthenon organizational role_id, but we also
-- want business role level filtering. Add a role_level column if missing.

ALTER TABLE action_roles ADD COLUMN IF NOT EXISTS role_level TEXT REFERENCES business_role_levels(id);

-- Thought Leadership Studio → Manager+
-- Set role_level on existing action_roles rows
UPDATE action_roles SET role_level = 'manager'
WHERE action_id IN (SELECT id FROM actions WHERE slug = 'thought-leadership-studio')
  AND role_level IS NULL;
