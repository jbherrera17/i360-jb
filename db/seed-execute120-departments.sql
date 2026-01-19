-- ============================================
-- Execute120 Department Personalization Seed Data
-- Seeds department-entity mappings for all 8 departments
-- ============================================

-- ============================================
-- 1. WORKFLOW DEPARTMENT ASSIGNMENTS
-- Update workflows.department_id based on category
-- ============================================

-- Marketing workflows
UPDATE workflows
SET department_id = (SELECT id FROM departments WHERE LOWER(name) = 'marketing' LIMIT 1)
WHERE LOWER(category) IN ('marketing', 'content', 'campaign', 'brand')
  AND department_id IS NULL;

-- Sales workflows
UPDATE workflows
SET department_id = (SELECT id FROM departments WHERE LOWER(name) = 'sales' LIMIT 1)
WHERE LOWER(category) IN ('sales', 'proposal', 'pipeline')
  AND department_id IS NULL;

-- Operations workflows
UPDATE workflows
SET department_id = (SELECT id FROM departments WHERE LOWER(name) = 'operations' LIMIT 1)
WHERE LOWER(category) IN ('operations', 'process', 'sop')
  AND department_id IS NULL;

-- Finance workflows
UPDATE workflows
SET department_id = (SELECT id FROM departments WHERE LOWER(name) = 'finance' LIMIT 1)
WHERE LOWER(category) IN ('finance', 'budget', 'investment', 'analysis')
  AND department_id IS NULL;

-- Executive workflows
UPDATE workflows
SET department_id = (SELECT id FROM departments WHERE LOWER(name) = 'executive' LIMIT 1)
WHERE LOWER(category) IN ('executive', 'strategy', 'board')
  AND department_id IS NULL;

-- HR workflows
UPDATE workflows
SET department_id = (SELECT id FROM departments WHERE LOWER(name) = 'hr' LIMIT 1)
WHERE LOWER(category) IN ('hr', 'hiring', 'onboarding', 'performance')
  AND department_id IS NULL;

-- Development workflows
UPDATE workflows
SET department_id = (SELECT id FROM departments WHERE LOWER(name) = 'development' LIMIT 1)
WHERE LOWER(category) IN ('development', 'engineering', 'technical', 'code')
  AND department_id IS NULL;

-- Legal workflows
UPDATE workflows
SET department_id = (SELECT id FROM departments WHERE LOWER(name) = 'legal' LIMIT 1)
WHERE LOWER(category) IN ('legal', 'compliance', 'contract', 'policy')
  AND department_id IS NULL;

-- Thought leadership goes to Marketing (content creation)
UPDATE workflows
SET department_id = (SELECT id FROM departments WHERE LOWER(name) = 'marketing' LIMIT 1)
WHERE LOWER(category) = 'thought_leadership'
  AND department_id IS NULL;

-- ============================================
-- 2. DEPARTMENT-AGENT MAPPINGS
-- Map agents to departments based on category/suite
-- ============================================

-- Clear existing mappings to avoid duplicates (optional - comment out if you want to preserve existing)
-- DELETE FROM department_agents;

-- Executive Department Agents
INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
SELECT
    d.id as department_id,
    a.id as agent_id,
    CASE WHEN a.category = 'strategy' THEN true ELSE false END as is_featured,
    ROW_NUMBER() OVER (ORDER BY
        CASE WHEN a.category = 'strategy' THEN 0
             WHEN a.category = 'governance' THEN 1
             ELSE 2 END,
        a.name
    ) as sort_order,
    CASE
        WHEN a.category = 'strategy' THEN 'Strategic planning and analysis'
        WHEN a.category = 'governance' THEN 'Governance and compliance oversight'
        WHEN a.category = 'corporate' THEN 'Corporate communications'
        ELSE 'Executive decision support'
    END as use_case_summary
FROM departments d, agents a
WHERE LOWER(d.name) = 'executive'
  AND a.is_active = true
  AND (
    a.category IN ('strategy', 'governance', 'corporate')
    OR a.suite = 'strategy'
    OR a.name ILIKE '%board%'
    OR a.name ILIKE '%executive%'
    OR a.name ILIKE '%strategic%'
  )
ON CONFLICT (department_id, agent_id) DO UPDATE SET
    is_featured = EXCLUDED.is_featured,
    sort_order = EXCLUDED.sort_order,
    use_case_summary = EXCLUDED.use_case_summary;

-- Marketing Department Agents
INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
SELECT
    d.id as department_id,
    a.id as agent_id,
    CASE WHEN a.category IN ('content', 'thought_leadership') THEN true ELSE false END as is_featured,
    ROW_NUMBER() OVER (ORDER BY
        CASE WHEN a.category = 'content' THEN 0
             WHEN a.category = 'thought_leadership' THEN 1
             WHEN a.category = 'communication' THEN 2
             ELSE 3 END,
        a.name
    ) as sort_order,
    CASE
        WHEN a.category = 'content' THEN 'Content creation and optimization'
        WHEN a.category = 'thought_leadership' THEN 'Thought leadership development'
        WHEN a.category = 'communication' THEN 'Marketing communications'
        WHEN a.category = 'research' THEN 'Market research and analysis'
        ELSE 'Marketing support'
    END as use_case_summary
FROM departments d, agents a
WHERE LOWER(d.name) = 'marketing'
  AND a.is_active = true
  AND (
    a.category IN ('content', 'thought_leadership', 'communication')
    OR a.name ILIKE '%content%'
    OR a.name ILIKE '%marketing%'
    OR a.name ILIKE '%brand%'
    OR a.name ILIKE '%campaign%'
  )
ON CONFLICT (department_id, agent_id) DO UPDATE SET
    is_featured = EXCLUDED.is_featured,
    sort_order = EXCLUDED.sort_order,
    use_case_summary = EXCLUDED.use_case_summary;

-- Sales Department Agents
INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
SELECT
    d.id as department_id,
    a.id as agent_id,
    CASE WHEN a.category = 'sales' THEN true ELSE false END as is_featured,
    ROW_NUMBER() OVER (ORDER BY
        CASE WHEN a.category = 'sales' THEN 0
             WHEN a.category = 'communication' THEN 1
             ELSE 2 END,
        a.name
    ) as sort_order,
    CASE
        WHEN a.category = 'sales' THEN 'Sales enablement and pipeline support'
        WHEN a.category = 'communication' THEN 'Sales communications'
        WHEN a.category = 'research' THEN 'Competitive research'
        ELSE 'Sales support'
    END as use_case_summary
FROM departments d, agents a
WHERE LOWER(d.name) = 'sales'
  AND a.is_active = true
  AND (
    a.category = 'sales'
    OR a.name ILIKE '%sales%'
    OR a.name ILIKE '%proposal%'
    OR a.name ILIKE '%objection%'
    OR a.name ILIKE '%pipeline%'
    OR a.name ILIKE '%deal%'
  )
ON CONFLICT (department_id, agent_id) DO UPDATE SET
    is_featured = EXCLUDED.is_featured,
    sort_order = EXCLUDED.sort_order,
    use_case_summary = EXCLUDED.use_case_summary;

-- Finance Department Agents
INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
SELECT
    d.id as department_id,
    a.id as agent_id,
    CASE WHEN a.category = 'analysis' THEN true ELSE false END as is_featured,
    ROW_NUMBER() OVER (ORDER BY a.name) as sort_order,
    CASE
        WHEN a.category = 'analysis' THEN 'Financial analysis and reporting'
        WHEN a.category = 'assessment' THEN 'Risk assessment'
        ELSE 'Finance support'
    END as use_case_summary
FROM departments d, agents a
WHERE LOWER(d.name) = 'finance'
  AND a.is_active = true
  AND (
    a.category = 'analysis'
    OR a.name ILIKE '%finance%'
    OR a.name ILIKE '%budget%'
    OR a.name ILIKE '%investment%'
    OR a.name ILIKE '%cost%'
    OR a.name ILIKE '%roi%'
  )
ON CONFLICT (department_id, agent_id) DO UPDATE SET
    is_featured = EXCLUDED.is_featured,
    sort_order = EXCLUDED.sort_order,
    use_case_summary = EXCLUDED.use_case_summary;

-- Operations Department Agents
INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
SELECT
    d.id as department_id,
    a.id as agent_id,
    CASE WHEN a.category = 'operations' THEN true ELSE false END as is_featured,
    ROW_NUMBER() OVER (ORDER BY a.name) as sort_order,
    CASE
        WHEN a.category = 'operations' THEN 'Operations optimization'
        WHEN a.category = 'productivity' THEN 'Process efficiency'
        ELSE 'Operations support'
    END as use_case_summary
FROM departments d, agents a
WHERE LOWER(d.name) = 'operations'
  AND a.is_active = true
  AND (
    a.category IN ('operations', 'productivity')
    OR a.name ILIKE '%process%'
    OR a.name ILIKE '%sop%'
    OR a.name ILIKE '%workflow%'
    OR a.name ILIKE '%vendor%'
    OR a.name ILIKE '%operations%'
  )
ON CONFLICT (department_id, agent_id) DO UPDATE SET
    is_featured = EXCLUDED.is_featured,
    sort_order = EXCLUDED.sort_order,
    use_case_summary = EXCLUDED.use_case_summary;

-- HR Department Agents
INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
SELECT
    d.id as department_id,
    a.id as agent_id,
    false as is_featured,
    ROW_NUMBER() OVER (ORDER BY a.name) as sort_order,
    CASE
        WHEN a.category = 'communication' THEN 'HR communications'
        WHEN a.category = 'productivity' THEN 'HR process efficiency'
        ELSE 'HR support'
    END as use_case_summary
FROM departments d, agents a
WHERE LOWER(d.name) = 'hr'
  AND a.is_active = true
  AND (
    a.name ILIKE '%hr%'
    OR a.name ILIKE '%hiring%'
    OR a.name ILIKE '%onboarding%'
    OR a.name ILIKE '%performance%'
    OR a.name ILIKE '%employee%'
    OR a.name ILIKE '%talent%'
    OR a.name ILIKE '%upskilling%'
    OR a.name ILIKE '%training%'
  )
ON CONFLICT (department_id, agent_id) DO UPDATE SET
    is_featured = EXCLUDED.is_featured,
    sort_order = EXCLUDED.sort_order,
    use_case_summary = EXCLUDED.use_case_summary;

-- Development Department Agents
INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
SELECT
    d.id as department_id,
    a.id as agent_id,
    CASE WHEN a.category = 'development' THEN true ELSE false END as is_featured,
    ROW_NUMBER() OVER (ORDER BY a.name) as sort_order,
    CASE
        WHEN a.category = 'development' THEN 'Development productivity'
        WHEN a.category = 'assessment' THEN 'Technical assessment'
        ELSE 'Development support'
    END as use_case_summary
FROM departments d, agents a
WHERE LOWER(d.name) = 'development'
  AND a.is_active = true
  AND (
    a.category = 'development'
    OR a.name ILIKE '%code%'
    OR a.name ILIKE '%technical%'
    OR a.name ILIKE '%engineering%'
    OR a.name ILIKE '%developer%'
    OR a.name ILIKE '%architecture%'
  )
ON CONFLICT (department_id, agent_id) DO UPDATE SET
    is_featured = EXCLUDED.is_featured,
    sort_order = EXCLUDED.sort_order,
    use_case_summary = EXCLUDED.use_case_summary;

-- Legal Department Agents
INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
SELECT
    d.id as department_id,
    a.id as agent_id,
    CASE WHEN a.category = 'governance' THEN true ELSE false END as is_featured,
    ROW_NUMBER() OVER (ORDER BY a.name) as sort_order,
    CASE
        WHEN a.category = 'governance' THEN 'Governance and compliance'
        WHEN a.category = 'assessment' THEN 'Risk assessment'
        ELSE 'Legal support'
    END as use_case_summary
FROM departments d, agents a
WHERE LOWER(d.name) = 'legal'
  AND a.is_active = true
  AND (
    a.category = 'governance'
    OR a.name ILIKE '%compliance%'
    OR a.name ILIKE '%risk%'
    OR a.name ILIKE '%legal%'
    OR a.name ILIKE '%contract%'
    OR a.name ILIKE '%policy%'
  )
ON CONFLICT (department_id, agent_id) DO UPDATE SET
    is_featured = EXCLUDED.is_featured,
    sort_order = EXCLUDED.sort_order,
    use_case_summary = EXCLUDED.use_case_summary;

-- ============================================
-- 3. ACTION-DEPARTMENT MAPPINGS
-- Map actions to departments based on suite
-- ============================================

-- Executive gets strategy suite actions
INSERT INTO action_departments (action_id, department_id, relationship, is_primary, priority)
SELECT
    a.id as action_id,
    d.id as department_id,
    'serves' as relationship,
    true as is_primary,
    1 as priority
FROM actions a, departments d
WHERE LOWER(d.name) = 'executive'
  AND a.status = 'active'
  AND a.suite = 'strategy'
ON CONFLICT (action_id, department_id) DO NOTHING;

-- All departments get execute suite actions (general purpose)
INSERT INTO action_departments (action_id, department_id, relationship, is_primary, priority)
SELECT
    a.id as action_id,
    d.id as department_id,
    'serves' as relationship,
    false as is_primary,
    5 as priority
FROM actions a, departments d
WHERE a.status = 'active'
  AND a.suite = 'execute'
  AND d.is_active = true
ON CONFLICT (action_id, department_id) DO NOTHING;

-- Marketing gets content-related actions
INSERT INTO action_departments (action_id, department_id, relationship, is_primary, priority)
SELECT
    a.id as action_id,
    d.id as department_id,
    'serves' as relationship,
    true as is_primary,
    1 as priority
FROM actions a, departments d
WHERE LOWER(d.name) = 'marketing'
  AND a.status = 'active'
  AND (a.slug ILIKE '%content%' OR a.slug ILIKE '%marketing%' OR a.slug ILIKE '%brand%')
ON CONFLICT (action_id, department_id) DO NOTHING;

-- Sales gets sales-related actions
INSERT INTO action_departments (action_id, department_id, relationship, is_primary, priority)
SELECT
    a.id as action_id,
    d.id as department_id,
    'serves' as relationship,
    true as is_primary,
    1 as priority
FROM actions a, departments d
WHERE LOWER(d.name) = 'sales'
  AND a.status = 'active'
  AND (a.slug ILIKE '%sales%' OR a.slug ILIKE '%proposal%')
ON CONFLICT (action_id, department_id) DO NOTHING;

-- ============================================
-- 4. CONTEXT ASSET DEPARTMENT ASSIGNMENTS
-- Assign department-specific context assets
-- Most stay NULL (global), specific types get assigned
-- ============================================

-- Sales-specific context assets
UPDATE context_assets
SET department_id = (SELECT id FROM departments WHERE LOWER(name) = 'sales' LIMIT 1)
WHERE asset_type IN ('competitive_landscape', 'objection_handling', 'sales_playbook')
  AND department_id IS NULL;

-- Marketing-specific context assets
UPDATE context_assets
SET department_id = (SELECT id FROM departments WHERE LOWER(name) = 'marketing' LIMIT 1)
WHERE asset_type IN ('voice_dna', 'brand_guidelines', 'icp', 'content_calendar')
  AND department_id IS NULL;

-- Executive-specific context assets
UPDATE context_assets
SET department_id = (SELECT id FROM departments WHERE LOWER(name) = 'executive' LIMIT 1)
WHERE asset_type IN ('strategic_plan', 'board_deck', 'investor_update')
  AND department_id IS NULL;

-- HR-specific context assets
UPDATE context_assets
SET department_id = (SELECT id FROM departments WHERE LOWER(name) = 'hr' LIMIT 1)
WHERE asset_type IN ('employee_handbook', 'job_descriptions', 'org_chart')
  AND department_id IS NULL;

-- ============================================
-- 5. ROLE-BASED RESTRICTIONS
-- Set up role filtering for executive-only items
-- ============================================

-- Executive-only workflows (board prep, strategic planning)
INSERT INTO workflow_roles (workflow_id, role_level)
SELECT w.id, 'executive'
FROM workflows w
WHERE (
    w.category = 'executive'
    OR w.name ILIKE '%board%'
    OR w.name ILIKE '%investor%'
    OR w.name ILIKE '%strategic%'
)
AND NOT EXISTS (SELECT 1 FROM workflow_roles WHERE workflow_id = w.id)
ON CONFLICT (workflow_id, role_level) DO NOTHING;

-- Director+ can also access executive workflows
INSERT INTO workflow_roles (workflow_id, role_level)
SELECT w.id, 'director'
FROM workflows w
WHERE w.category = 'executive'
AND NOT EXISTS (SELECT 1 FROM workflow_roles wr WHERE wr.workflow_id = w.id AND wr.role_level = 'director')
ON CONFLICT (workflow_id, role_level) DO NOTHING;

-- Manager+ workflows (team management, resource planning)
INSERT INTO workflow_roles (workflow_id, role_level)
SELECT w.id, brl.id
FROM workflows w
CROSS JOIN business_role_levels brl
WHERE (
    w.name ILIKE '%team%'
    OR w.name ILIKE '%resource%'
    OR w.name ILIKE '%planning%'
)
AND brl.level >= 3  -- manager and above
AND NOT EXISTS (SELECT 1 FROM workflow_roles wr WHERE wr.workflow_id = w.id AND wr.role_level = brl.id)
ON CONFLICT (workflow_id, role_level) DO NOTHING;

-- Executive-only agents (strategy agents)
INSERT INTO agent_roles (agent_id, role_level)
SELECT a.id, 'executive'
FROM agents a
WHERE (
    a.category = 'governance'
    OR a.name ILIKE '%board%'
    OR a.name ILIKE '%executive%'
)
AND a.is_active = true
AND NOT EXISTS (SELECT 1 FROM agent_roles WHERE agent_id = a.id)
ON CONFLICT (agent_id, role_level) DO NOTHING;

-- Director+ can also access governance agents
INSERT INTO agent_roles (agent_id, role_level)
SELECT a.id, 'director'
FROM agents a
WHERE a.category = 'governance'
AND a.is_active = true
AND NOT EXISTS (SELECT 1 FROM agent_roles ar WHERE ar.agent_id = a.id AND ar.role_level = 'director')
ON CONFLICT (agent_id, role_level) DO NOTHING;

-- ============================================
-- 6. ENSURE MINIMUM AGENTS PER DEPARTMENT
-- Add research agents to departments that may have few matches
-- ============================================

-- Ensure each department has at least some general-purpose agents
INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
SELECT
    d.id as department_id,
    a.id as agent_id,
    false as is_featured,
    100 as sort_order,  -- Lower priority
    'General purpose research and analysis'
FROM departments d
CROSS JOIN agents a
WHERE d.is_active = true
  AND a.is_active = true
  AND a.category = 'research'
  AND NOT EXISTS (
    SELECT 1 FROM department_agents da
    WHERE da.department_id = d.id AND da.agent_id = a.id
  )
  -- Only add if department has fewer than 3 agents
  AND (
    SELECT COUNT(*) FROM department_agents da2 WHERE da2.department_id = d.id
  ) < 3
ON CONFLICT (department_id, agent_id) DO NOTHING;

-- ============================================
-- 7. VERIFICATION QUERIES (run after seeding)
-- ============================================

-- Check agent counts per department
-- SELECT d.name, COUNT(da.id) as agent_count
-- FROM departments d
-- LEFT JOIN department_agents da ON d.id = da.department_id
-- WHERE d.is_active = true
-- GROUP BY d.name
-- ORDER BY d.name;

-- Check workflow counts per department
-- SELECT d.name, COUNT(w.id) as workflow_count
-- FROM departments d
-- LEFT JOIN workflows w ON d.id = w.department_id
-- WHERE d.is_active = true
-- GROUP BY d.name
-- ORDER BY d.name;

-- Check role restrictions
-- SELECT
--     w.name as workflow_name,
--     array_agg(wr.role_level) as required_roles
-- FROM workflows w
-- JOIN workflow_roles wr ON w.id = wr.workflow_id
-- GROUP BY w.id, w.name
-- ORDER BY w.name;
