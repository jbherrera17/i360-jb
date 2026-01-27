-- ============================================
-- PHASE 46: MODULE MANAGEMENT & RESOURCE ORG
-- Backfills org_id for existing resources
-- Adds indexes for org-based filtering
-- ============================================

-- ============================================
-- PART 0: ADD ORG_ID COLUMN TO ACTIONS TABLE
-- (This column exists on other tables but was missing from actions)
-- ============================================

ALTER TABLE actions
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- ============================================
-- PART 1: BACKFILL ORG_ID FOR EXISTING RESOURCES
-- ============================================

-- 1.1 Backfill context_assets org_id based on user's default organization
UPDATE context_assets ca
SET org_id = (SELECT default_org_id FROM users u WHERE u.id = ca.user_id)
WHERE ca.org_id IS NULL
AND ca.user_id IS NOT NULL
AND EXISTS (SELECT 1 FROM users u WHERE u.id = ca.user_id AND u.default_org_id IS NOT NULL);

-- 1.2 Backfill agents org_id
UPDATE agents a
SET org_id = (SELECT default_org_id FROM users u WHERE u.id = a.user_id)
WHERE a.org_id IS NULL
AND a.user_id IS NOT NULL
AND EXISTS (SELECT 1 FROM users u WHERE u.id = a.user_id AND u.default_org_id IS NOT NULL);

-- 1.3 Backfill skills org_id
UPDATE skills s
SET org_id = (SELECT default_org_id FROM users u WHERE u.id = s.user_id)
WHERE s.org_id IS NULL
AND s.user_id IS NOT NULL
AND EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id AND u.default_org_id IS NOT NULL);

-- 1.4 Backfill workflows org_id
UPDATE workflows w
SET org_id = (SELECT default_org_id FROM users u WHERE u.id = w.user_id)
WHERE w.org_id IS NULL
AND w.user_id IS NOT NULL
AND EXISTS (SELECT 1 FROM users u WHERE u.id = w.user_id AND u.default_org_id IS NOT NULL);

-- 1.5 Backfill actions org_id
UPDATE actions a
SET org_id = (SELECT default_org_id FROM users u WHERE u.id = a.user_id)
WHERE a.org_id IS NULL
AND a.user_id IS NOT NULL
AND EXISTS (SELECT 1 FROM users u WHERE u.id = a.user_id AND u.default_org_id IS NOT NULL);

-- ============================================
-- PART 2: ADD INDEXES FOR ORG FILTERING
-- ============================================

-- 2.1 Context assets org filter index
CREATE INDEX IF NOT EXISTS idx_context_assets_org_filter
ON context_assets(org_id) WHERE org_id IS NOT NULL;

-- 2.2 Agents org filter index
CREATE INDEX IF NOT EXISTS idx_agents_org_filter
ON agents(org_id) WHERE org_id IS NOT NULL;

-- 2.3 Skills org filter index
CREATE INDEX IF NOT EXISTS idx_skills_org_filter
ON skills(org_id) WHERE org_id IS NOT NULL;

-- 2.4 Workflows org filter index
CREATE INDEX IF NOT EXISTS idx_workflows_org_filter
ON workflows(org_id) WHERE org_id IS NOT NULL;

-- 2.5 Actions org filter index
CREATE INDEX IF NOT EXISTS idx_actions_org_filter
ON actions(org_id) WHERE org_id IS NOT NULL;

-- ============================================
-- PART 3: UPDATE AGENT_SUMMARY VIEW
-- Add org_id and visibility columns for Phase 45/46 filtering
-- ============================================

DROP VIEW IF EXISTS agent_summary;
CREATE VIEW agent_summary AS
SELECT
    a.id,
    a.user_id,
    a.name,
    a.description,
    a.icon,
    a.category,
    a.suite,
    a.type,
    a.llm_provider,
    a.llm_model,
    a.temperature,
    a.max_tokens,
    a.is_active,
    a.is_public,
    a.is_system,
    a.usage_count,
    a.last_used_at,
    a.created_at,
    a.updated_at,
    a.mindstudio_workflow_id,
    a.introduction,
    a.conversation_starters,
    -- Lineage fields
    a.parent_agent_id,
    a.forked_at,
    a.forked_from_version,
    -- Phase 45/46 access control fields
    a.org_id,
    a.visibility,
    a.module_id,
    -- Parent agent info (for display)
    parent.name AS parent_agent_name,
    parent.is_system AS parent_is_system,
    -- Count of agents forked from this one
    (SELECT COUNT(*) FROM agents children WHERE children.parent_agent_id = a.id) AS fork_count
FROM agents a
LEFT JOIN agents parent ON a.parent_agent_id = parent.id;

-- Grant access to the view
GRANT SELECT ON agent_summary TO authenticated;
GRANT SELECT ON agent_summary TO anon;

COMMENT ON VIEW agent_summary IS 'Aggregated agent view with lineage and access control fields';

-- ============================================
-- PART 4: VERIFICATION QUERY
-- ============================================
-- Run this to verify the backfill results:
/*
SELECT
    'context_assets' as table_name,
    COUNT(*) FILTER (WHERE org_id IS NOT NULL) as with_org,
    COUNT(*) FILTER (WHERE org_id IS NULL) as without_org
FROM context_assets
UNION ALL
SELECT 'agents', COUNT(*) FILTER (WHERE org_id IS NOT NULL), COUNT(*) FILTER (WHERE org_id IS NULL) FROM agents
UNION ALL
SELECT 'skills', COUNT(*) FILTER (WHERE org_id IS NOT NULL), COUNT(*) FILTER (WHERE org_id IS NULL) FROM skills
UNION ALL
SELECT 'workflows', COUNT(*) FILTER (WHERE org_id IS NOT NULL), COUNT(*) FILTER (WHERE org_id IS NULL) FROM workflows
UNION ALL
SELECT 'actions', COUNT(*) FILTER (WHERE org_id IS NOT NULL), COUNT(*) FILTER (WHERE org_id IS NULL) FROM actions;
*/

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
