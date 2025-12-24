-- ============================================
-- Insight 360 - Phase 4.2: Integrity System Fixes
-- Version: 1.0
-- Date: December 2024
-- Description: Adds missing schema objects for Integrity system
-- Run AFTER: phase3.5-schema.sql, phase4-schema.sql
-- ============================================

-- ============================================
-- AGENT TABLE - ENSURE ALL COLUMNS EXIST
-- Fix any missing columns from schema.sql and extensions
-- ============================================

-- Core columns from schema.sql that might be missing
ALTER TABLE agents ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'custom';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS mindstudio_workflow_id TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'bot';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Columns from phase3.5-schema.sql
ALTER TABLE agents ADD COLUMN IF NOT EXISTS suite TEXT DEFAULT 'execute';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS category TEXT;

-- New LLM configuration columns
ALTER TABLE agents ADD COLUMN IF NOT EXISTS llm_provider TEXT DEFAULT 'anthropic';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS llm_model TEXT DEFAULT 'claude-sonnet-4-5-20250929';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS system_prompt TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS temperature NUMERIC(3,2) DEFAULT 0.7;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 4096;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tools JSONB DEFAULT '[]';

-- Comments
COMMENT ON COLUMN agents.type IS 'Agent type: mindstudio, custom, or llm';
COMMENT ON COLUMN agents.suite IS 'Agent suite: align (foundation), strategy (planning), execute (action)';
COMMENT ON COLUMN agents.category IS 'Agent category within suite (e.g., content, sales, research)';
COMMENT ON COLUMN agents.llm_provider IS 'LLM provider: anthropic, openai, google, or custom';
COMMENT ON COLUMN agents.llm_model IS 'Specific model identifier (e.g., claude-opus-4-5-20251101)';
COMMENT ON COLUMN agents.system_prompt IS 'System prompt injected at conversation start';
COMMENT ON COLUMN agents.temperature IS 'Model temperature (0-2, lower = more deterministic)';
COMMENT ON COLUMN agents.max_tokens IS 'Maximum tokens in response';
COMMENT ON COLUMN agents.tools IS 'Array of tool configurations available to this agent';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agents_llm_provider ON agents(llm_provider);
CREATE INDEX IF NOT EXISTS idx_agents_category ON agents(category);
CREATE INDEX IF NOT EXISTS idx_agents_suite ON agents(suite);

-- ============================================
-- AGENT CATEGORIES TABLE
-- Categorization for agent organization
-- ============================================

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS agent_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'folder',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add color column if it doesn't exist (for existing tables)
ALTER TABLE agent_categories
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_categories_key ON agent_categories(key);
CREATE INDEX IF NOT EXISTS idx_agent_categories_active ON agent_categories(is_active);

COMMENT ON TABLE agent_categories IS 'Categories for organizing agents (governance, analysis, content, etc.)';

-- Seed default categories
INSERT INTO agent_categories (id, key, display_name, description, icon, color, sort_order, is_active) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'governance', 'Governance', 'Agents for organizational governance, risk management, and values alignment', 'shield', '#8b5cf6', 10, true),
    ('c0000000-0000-0000-0000-000000000002', 'analysis', 'Analysis', 'Agents for data analysis, research, and insights', 'chart-bar', '#3b82f6', 20, true),
    ('c0000000-0000-0000-0000-000000000003', 'content', 'Content', 'Agents for content creation and management', 'file-text', '#10b981', 30, true),
    ('c0000000-0000-0000-0000-000000000004', 'sales', 'Sales', 'Agents for sales enablement and customer engagement', 'trending-up', '#f59e0b', 40, true),
    ('c0000000-0000-0000-0000-000000000005', 'operations', 'Operations', 'Agents for operational tasks and automation', 'settings', '#6366f1', 50, true),
    ('c0000000-0000-0000-0000-000000000006', 'custom', 'Custom', 'User-created custom agents', 'sparkles', '#ec4899', 100, true)
ON CONFLICT (key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    sort_order = EXCLUDED.sort_order;

-- ============================================
-- AGENT CONTEXT MAPPINGS TABLE
-- Links agents to context assets for injection
-- ============================================

CREATE TABLE IF NOT EXISTS agent_context_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES context_assets(id) ON DELETE CASCADE,

    -- Injection behavior
    injection_mode TEXT NOT NULL DEFAULT 'always'
        CHECK (injection_mode IN ('always', 'on_demand', 'conditional')),

    -- For conditional injection
    trigger_keywords TEXT[] DEFAULT '{}',

    -- Priority (order of injection, higher = first)
    priority INTEGER DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),

    -- Max tokens from this asset
    max_tokens INTEGER,

    -- Is this asset required for the agent to function?
    is_required BOOLEAN DEFAULT false,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate mappings
    UNIQUE(agent_id, asset_id)
);

-- Add columns if they don't exist (for existing tables)
ALTER TABLE agent_context_mappings ADD COLUMN IF NOT EXISTS trigger_keywords TEXT[] DEFAULT '{}';
ALTER TABLE agent_context_mappings ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 50;
ALTER TABLE agent_context_mappings ADD COLUMN IF NOT EXISTS max_tokens INTEGER;
ALTER TABLE agent_context_mappings ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_context_mappings_agent ON agent_context_mappings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_context_mappings_asset ON agent_context_mappings(asset_id);
CREATE INDEX IF NOT EXISTS idx_agent_context_mappings_mode ON agent_context_mappings(injection_mode);

COMMENT ON TABLE agent_context_mappings IS 'Junction table linking agents to context assets for prompt injection';

-- RLS for agent_context_mappings
ALTER TABLE agent_context_mappings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view mappings for accessible agents" ON agent_context_mappings;
DROP POLICY IF EXISTS "Users can manage mappings for own agents" ON agent_context_mappings;

CREATE POLICY "Users can view mappings for accessible agents" ON agent_context_mappings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents a
            WHERE a.id = agent_id
            AND (a.user_id = auth.uid() OR a.is_public = true)
        )
    );

CREATE POLICY "Users can manage mappings for own agents" ON agent_context_mappings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM agents a
            WHERE a.id = agent_id
            AND a.user_id = auth.uid()
        )
    );

-- ============================================
-- AGENT SUMMARY VIEW
-- Aggregated view for agent listing
-- ============================================

-- Drop existing view first to allow column changes
DROP VIEW IF EXISTS agent_summary;

CREATE VIEW agent_summary AS
SELECT
    a.id,
    a.user_id,
    a.name,
    a.description,
    a.type,
    a.icon,
    a.is_active,
    a.is_public,
    a.suite,
    a.category,
    a.llm_provider,
    a.llm_model,
    a.temperature,
    a.max_tokens,
    a.created_at,
    a.updated_at,
    ac.display_name as category_display_name,
    ac.icon as category_icon,
    ac.color as category_color,
    COUNT(DISTINCT acm.asset_id) as context_asset_count,
    COALESCE(
        json_agg(DISTINCT jsonb_build_object(
            'id', ca.id,
            'name', ca.name,
            'asset_type', ca.asset_type,
            'injection_mode', acm.injection_mode
        )) FILTER (WHERE ca.id IS NOT NULL),
        '[]'
    ) as connected_assets
FROM agents a
LEFT JOIN agent_categories ac ON a.category = ac.key
LEFT JOIN agent_context_mappings acm ON a.id = acm.agent_id
LEFT JOIN context_assets ca ON acm.asset_id = ca.id AND ca.is_current = true
GROUP BY a.id, ac.display_name, ac.icon, ac.color;

COMMENT ON VIEW agent_summary IS 'Aggregated agent view with category info and connected asset counts';

-- ============================================
-- INTEGRITY METRICS VIEW
-- Aggregated view for integrity dashboard
-- ============================================

CREATE OR REPLACE VIEW integrity_dashboard_summary AS
SELECT
    -- Latest Integrity Yield score
    (
        SELECT content_json->>'composite_score'
        FROM context_assets
        WHERE asset_type = 'integrity_yield'
        AND is_current = true
        ORDER BY updated_at DESC
        LIMIT 1
    )::numeric as composite_score,

    -- Latest interpretation
    (
        SELECT content_json->>'interpretation'
        FROM context_assets
        WHERE asset_type = 'integrity_yield'
        AND is_current = true
        ORDER BY updated_at DESC
        LIMIT 1
    ) as interpretation,

    -- Count of bright lines defined
    (
        SELECT COALESCE(jsonb_array_length(content_json->'bright_lines'), 0)
        FROM context_assets
        WHERE asset_type = 'bright_lines'
        AND is_current = true
        ORDER BY updated_at DESC
        LIMIT 1
    ) as bright_lines_count,

    -- Count of values mapped
    (
        SELECT COALESCE(jsonb_array_length(content_json->'values'), 0)
        FROM context_assets
        WHERE asset_type = 'values_map'
        AND is_current = true
        ORDER BY updated_at DESC
        LIMIT 1
    ) as values_mapped_count,

    -- Count of close calls logged
    (
        SELECT COALESCE(jsonb_array_length(content_json->'close_calls'), 0)
        FROM context_assets
        WHERE asset_type = 'close_call_log'
        AND is_current = true
        ORDER BY updated_at DESC
        LIMIT 1
    ) as close_calls_count,

    -- Asset completion status
    (
        SELECT json_agg(jsonb_build_object(
            'type', t.type_key,
            'display_name', t.display_name,
            'has_data', EXISTS (
                SELECT 1 FROM context_assets ca
                WHERE ca.asset_type = t.type_key
                AND ca.is_current = true
            )
        ))
        FROM context_asset_types t
        WHERE t.type_key IN (
            'bright_lines', 'values_map', 'intervention_metrics',
            'trust_velocity_metrics', 'close_call_log', 'industry_baseline', 'integrity_yield'
        )
    ) as asset_status;

COMMENT ON VIEW integrity_dashboard_summary IS 'Summary view for integrity dashboard with key metrics and asset status';

-- ============================================
-- FUNCTION: Get Agent Full Context
-- Assembles all context for agent execution
-- ============================================

CREATE OR REPLACE FUNCTION get_agent_context(p_agent_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'agent', jsonb_build_object(
            'id', a.id,
            'name', a.name,
            'system_prompt', a.system_prompt,
            'llm_provider', a.llm_provider,
            'llm_model', a.llm_model,
            'temperature', a.temperature,
            'max_tokens', a.max_tokens,
            'tools', a.tools
        ),
        'context_assets', COALESCE(
            (
                SELECT json_agg(
                    jsonb_build_object(
                        'id', ca.id,
                        'name', ca.name,
                        'asset_type', ca.asset_type,
                        'content_json', ca.content_json,
                        'content_text', ca.content_text,
                        'injection_mode', acm.injection_mode,
                        'priority', acm.priority
                    ) ORDER BY acm.priority DESC
                )
                FROM agent_context_mappings acm
                JOIN context_assets ca ON acm.asset_id = ca.id
                WHERE acm.agent_id = a.id
                AND ca.is_current = true
                AND acm.injection_mode = 'always'
            ),
            '[]'::json
        )
    ) INTO v_result
    FROM agents a
    WHERE a.id = p_agent_id;

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_agent_context IS 'Assembles full context (agent config + assets) for agent execution';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    col_count INTEGER;
    table_count INTEGER;
    view_count INTEGER;
BEGIN
    -- Check agent columns
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'agents'
    AND column_name IN ('llm_provider', 'llm_model', 'system_prompt', 'temperature', 'max_tokens');

    -- Check new tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_name IN ('agent_categories', 'agent_context_mappings');

    -- Check views
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views
    WHERE table_name IN ('agent_summary', 'integrity_dashboard_summary');

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'PHASE 4.2 - INTEGRITY FIXES APPLIED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Agent columns added: % of 5', col_count;
    RAISE NOTICE 'New tables created: % of 2', table_count;
    RAISE NOTICE 'New views created: % of 2', view_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Schema additions:';
    RAISE NOTICE '  - agents table: llm_provider, llm_model, system_prompt, temperature, max_tokens';
    RAISE NOTICE '  - agent_categories table: Category organization';
    RAISE NOTICE '  - agent_context_mappings table: Agent-asset connections';
    RAISE NOTICE '  - agent_summary view: Aggregated agent listing';
    RAISE NOTICE '  - integrity_dashboard_summary view: Dashboard metrics';
    RAISE NOTICE '  - get_agent_context() function: Context assembly';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
