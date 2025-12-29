-- =====================================================
-- PHASE 6: DAILY BRIEFING & WORKFLOWS
-- Insight 360 - Database Schema
-- Version: 2.19
-- Date: December 28, 2024
-- =====================================================

-- =====================================================
-- TABLE: briefing_configs
-- User configuration for daily briefings
-- =====================================================

CREATE TABLE IF NOT EXISTS briefing_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,

    -- Schedule configuration
    is_enabled BOOLEAN DEFAULT true,
    schedule_time TIME NOT NULL DEFAULT '06:00:00',
    timezone TEXT DEFAULT 'America/New_York',

    -- Status tracking
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_run_status TEXT CHECK (last_run_status IN ('success', 'partial', 'failed')),
    next_run_at TIMESTAMP WITH TIME ZONE,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- One config per user
    UNIQUE(user_id)
);

-- =====================================================
-- TABLE: briefing_sections
-- Configures which agents generate which sections
-- =====================================================

CREATE TABLE IF NOT EXISTS briefing_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES briefing_configs(id) ON DELETE CASCADE,

    -- Section identity
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'file-text',

    -- Agent assignment
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    prompt_template TEXT,

    -- Context configuration
    context_assets UUID[] DEFAULT '{}',

    -- Output configuration
    max_tokens INTEGER DEFAULT 2000,

    -- Ordering and status
    sort_order INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique slug per config
    UNIQUE(config_id, slug)
);

-- =====================================================
-- EXTEND: briefings table
-- Add status tracking columns
-- =====================================================

-- Add status column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'briefings' AND column_name = 'status'
    ) THEN
        ALTER TABLE briefings ADD COLUMN status TEXT DEFAULT 'completed'
            CHECK (status IN ('pending', 'generating', 'completed', 'failed'));
    END IF;
END $$;

-- Add generation timing columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'briefings' AND column_name = 'generation_started_at'
    ) THEN
        ALTER TABLE briefings ADD COLUMN generation_started_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'briefings' AND column_name = 'generation_completed_at'
    ) THEN
        ALTER TABLE briefings ADD COLUMN generation_completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add metrics columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'briefings' AND column_name = 'total_tokens_used'
    ) THEN
        ALTER TABLE briefings ADD COLUMN total_tokens_used INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'briefings' AND column_name = 'sections_generated'
    ) THEN
        ALTER TABLE briefings ADD COLUMN sections_generated INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'briefings' AND column_name = 'error_message'
    ) THEN
        ALTER TABLE briefings ADD COLUMN error_message TEXT;
    END IF;
END $$;

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_briefing_configs_user
    ON briefing_configs(user_id);

CREATE INDEX IF NOT EXISTS idx_briefing_configs_enabled
    ON briefing_configs(is_enabled) WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_briefing_configs_next_run
    ON briefing_configs(next_run_at) WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_briefing_sections_config
    ON briefing_sections(config_id);

CREATE INDEX IF NOT EXISTS idx_briefing_sections_agent
    ON briefing_sections(agent_id) WHERE agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_briefing_sections_order
    ON briefing_sections(config_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_briefings_status
    ON briefings(status) WHERE status IN ('pending', 'generating');

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE briefing_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefing_sections ENABLE ROW LEVEL SECURITY;

-- Briefing configs: users can only access their own
DROP POLICY IF EXISTS "Users can view own briefing configs" ON briefing_configs;
CREATE POLICY "Users can view own briefing configs" ON briefing_configs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own briefing configs" ON briefing_configs;
CREATE POLICY "Users can insert own briefing configs" ON briefing_configs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own briefing configs" ON briefing_configs;
CREATE POLICY "Users can update own briefing configs" ON briefing_configs
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own briefing configs" ON briefing_configs;
CREATE POLICY "Users can delete own briefing configs" ON briefing_configs
    FOR DELETE USING (auth.uid() = user_id);

-- Briefing sections: users can access sections for their configs
DROP POLICY IF EXISTS "Users can view own briefing sections" ON briefing_sections;
CREATE POLICY "Users can view own briefing sections" ON briefing_sections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM briefing_configs bc
            WHERE bc.id = briefing_sections.config_id
            AND bc.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own briefing sections" ON briefing_sections;
CREATE POLICY "Users can insert own briefing sections" ON briefing_sections
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM briefing_configs bc
            WHERE bc.id = briefing_sections.config_id
            AND bc.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own briefing sections" ON briefing_sections;
CREATE POLICY "Users can update own briefing sections" ON briefing_sections
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM briefing_configs bc
            WHERE bc.id = briefing_sections.config_id
            AND bc.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own briefing sections" ON briefing_sections;
CREATE POLICY "Users can delete own briefing sections" ON briefing_sections
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM briefing_configs bc
            WHERE bc.id = briefing_sections.config_id
            AND bc.user_id = auth.uid()
        )
    );

-- =====================================================
-- VIEWS
-- =====================================================

-- View: User's briefing configuration with section count
CREATE OR REPLACE VIEW briefing_config_summary AS
SELECT
    bc.*,
    COUNT(bs.id) FILTER (WHERE bs.is_enabled = true) as active_sections,
    COUNT(bs.id) as total_sections,
    ARRAY_AGG(bs.name ORDER BY bs.sort_order) FILTER (WHERE bs.is_enabled = true) as section_names
FROM briefing_configs bc
LEFT JOIN briefing_sections bs ON bc.id = bs.config_id
GROUP BY bc.id;

-- View: Recent briefings with status
CREATE OR REPLACE VIEW recent_briefings AS
SELECT
    b.*,
    COALESCE(jsonb_array_length(b.content->'sections'), 0) as section_count
FROM briefings b
ORDER BY b.date DESC
LIMIT 30;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_briefing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_briefing_configs_updated_at ON briefing_configs;
CREATE TRIGGER trigger_briefing_configs_updated_at
    BEFORE UPDATE ON briefing_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_briefing_updated_at();

DROP TRIGGER IF EXISTS trigger_briefing_sections_updated_at ON briefing_sections;
CREATE TRIGGER trigger_briefing_sections_updated_at
    BEFORE UPDATE ON briefing_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_briefing_updated_at();

-- =====================================================
-- SEED DATA: Default section templates
-- These are template suggestions, not actual sections
-- =====================================================

-- Note: Actual sections are created per-user when they set up their briefing
-- This comment documents the recommended default section types:
--
-- 1. Executive Summary (slug: executive-summary)
--    - Quick overview of key items
--    - Agent: General purpose summarizer
--
-- 2. Industry News (slug: industry-news)
--    - Relevant news from configured topics
--    - Agent: News analyst agent
--
-- 3. Market Intelligence (slug: market-intel)
--    - Competitor and market updates
--    - Agent: Market research agent
--
-- 4. Action Items (slug: action-items)
--    - Tasks and priorities for the day
--    - Agent: Task prioritization agent
--
-- 5. Key Metrics (slug: key-metrics)
--    - Important numbers and trends
--    - Agent: Analytics agent

-- =====================================================
-- GRANTS (for service role)
-- =====================================================

GRANT ALL ON briefing_configs TO service_role;
GRANT ALL ON briefing_sections TO service_role;
GRANT SELECT ON briefing_config_summary TO service_role;
GRANT SELECT ON recent_briefings TO service_role;
