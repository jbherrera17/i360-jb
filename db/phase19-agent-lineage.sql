-- Phase 19: Agent Lineage Tracking
-- Enables tracking of duplicated/forked agents back to their source

-- Add lineage columns to agents table
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS parent_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS forked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS forked_from_version INTEGER DEFAULT 1;

-- Add index for efficient lineage queries
CREATE INDEX IF NOT EXISTS idx_agents_parent_agent_id ON agents(parent_agent_id);

-- Update agent_summary view to include lineage and system info
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

COMMENT ON COLUMN agents.parent_agent_id IS 'Reference to the agent this was duplicated from';
COMMENT ON COLUMN agents.forked_at IS 'Timestamp when this agent was forked/duplicated';
COMMENT ON COLUMN agents.forked_from_version IS 'Version number of parent agent at time of fork';
