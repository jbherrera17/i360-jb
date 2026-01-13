-- ============================================
-- Insight 360 - Phase 24: Thought Leadership Schema
-- Version: 1.0
-- Date: January 2026
-- Description: Thought Leadership module tables for
--   niche discovery, content pillars, calendar sync,
--   and content generation tracking
-- ============================================

-- ============================================
-- THOUGHT LEADERSHIP PROFILES
-- Core TL configuration per user
-- ============================================
CREATE TABLE IF NOT EXISTS thought_leadership_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Core Strategy Elements
    core_thesis TEXT,                           -- The main thesis/anchor
    atomic_claim TEXT,                          -- Single sentence claim
    positioning_framework JSONB DEFAULT '{}',  -- Full positioning data

    -- Setup Progress
    setup_completed BOOLEAN DEFAULT false,
    setup_step INTEGER DEFAULT 0,               -- Current step in niche discovery
    setup_data JSONB DEFAULT '{}',              -- Data collected during setup

    -- Notion Integration
    notion_database_id TEXT,                    -- Content Calendar database ID
    notion_last_sync TIMESTAMP WITH TIME ZONE,

    -- Publishing Configuration
    default_publish_targets TEXT[] DEFAULT '{}', -- ['substack', 'linkedin', 'x']
    weekly_publish_day TEXT DEFAULT 'wednesday',

    -- Metadata
    status TEXT DEFAULT 'setup'
        CHECK (status IN ('setup', 'active', 'paused')),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id)
);

-- ============================================
-- AI VISIBILITY RESEARCH
-- Track visibility tests for self and competitors
-- ============================================
CREATE TABLE IF NOT EXISTS ai_visibility_research (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES thought_leadership_profiles(id) ON DELETE CASCADE,

    -- Research Type
    research_type TEXT NOT NULL
        CHECK (research_type IN ('personal', 'competitor')),
    subject_name TEXT NOT NULL,                 -- Person/company researched

    -- Results
    visibility_score INTEGER,                   -- 0-100
    key_findings JSONB DEFAULT '[]',            -- Array of findings
    topics_found TEXT[],                        -- Topics AI associated with subject
    recommended_actions JSONB DEFAULT '[]',     -- Suggested improvements

    -- Raw Data
    prompts_used TEXT[],                        -- What prompts were tested
    raw_responses JSONB DEFAULT '{}',           -- Full API responses

    -- Metadata
    research_source TEXT DEFAULT 'perplexity',  -- AI used for research

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONTENT PILLARS
-- Strategic content themes (4-5 per user)
-- ============================================
CREATE TABLE IF NOT EXISTS content_pillars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES thought_leadership_profiles(id) ON DELETE CASCADE,

    -- Identity
    name TEXT NOT NULL,                         -- 'Values-Driven Leadership'
    description TEXT,
    icon TEXT DEFAULT 'bookmark',
    color TEXT DEFAULT '#3b82f6',

    -- Strategy
    quarterly_focus TEXT[],                     -- Which quarters this pillar is primary
    monthly_themes JSONB DEFAULT '{}',          -- Month-by-month theme breakdown

    -- Content Guidance
    key_topics TEXT[] DEFAULT '{}',             -- Specific topics under this pillar
    hashtags TEXT[] DEFAULT '{}',               -- Hashtags for this pillar
    sample_titles TEXT[] DEFAULT '{}',          -- Example article titles

    -- Notion Mapping
    notion_pillar_value TEXT,                   -- Value in Notion select field

    -- Ordering
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONTENT CALENDAR ENTRIES
-- Local cache of Notion content calendar
-- ============================================
CREATE TABLE IF NOT EXISTS content_calendar_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES thought_leadership_profiles(id) ON DELETE CASCADE,
    pillar_id UUID REFERENCES content_pillars(id) ON DELETE SET NULL,

    -- Content Identity
    title TEXT NOT NULL,
    description TEXT,

    -- Scheduling
    scheduled_date DATE,
    week_number INTEGER,                        -- ISO week number
    year INTEGER,

    -- Classification
    event_type TEXT DEFAULT 'article'
        CHECK (event_type IN ('article', 'linkedin_series', 'newsletter', 'video', 'podcast', 'other')),
    monthly_topic TEXT,
    goal TEXT,

    -- Status Tracking
    status TEXT DEFAULT 'planned'
        CHECK (status IN ('planned', 'researching', 'drafting', 'review', 'ready', 'published', 'skipped')),

    -- Publishing Targets (checkboxes)
    publish_substack BOOLEAN DEFAULT false,
    publish_x BOOLEAN DEFAULT false,
    publish_li_page BOOLEAN DEFAULT false,
    publish_li_personal BOOLEAN DEFAULT false,
    publish_website BOOLEAN DEFAULT false,
    publish_facebook_personal BOOLEAN DEFAULT false,
    publish_facebook_page BOOLEAN DEFAULT false,
    publish_facebook_group BOOLEAN DEFAULT false,

    -- Generated Content (stored after generation)
    article_markdown TEXT,                      -- Human-readable article
    article_ai_optimized TEXT,                  -- AI-optimized version
    linkedin_posts JSONB DEFAULT '[]',          -- Array of 5 LinkedIn posts

    -- Notion Sync
    notion_page_id TEXT UNIQUE,                 -- Notion page ID
    notion_url TEXT,
    sync_status TEXT DEFAULT 'pending'
        CHECK (sync_status IN ('pending', 'synced', 'conflict', 'local_only')),
    last_synced_at TIMESTAMP WITH TIME ZONE,
    notion_last_edited TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- THOUGHT LEADERSHIP OUTPUTS
-- Generated artifacts with versioning
-- ============================================
CREATE TABLE IF NOT EXISTS thought_leadership_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    calendar_entry_id UUID REFERENCES content_calendar_entries(id) ON DELETE CASCADE,

    -- Output Classification
    output_type TEXT NOT NULL
        CHECK (output_type IN (
            'article_human',      -- Human-readable article
            'article_ai',         -- AI-optimized article
            'linkedin_post',      -- Individual LinkedIn post
            'linkedin_series',    -- Full 5-post series
            'substack_note',      -- Substack Note
            'twitter_thread',     -- X/Twitter thread
            'newsletter',         -- Email newsletter
            'complete_package'    -- Full weekly package
        )),

    -- Content
    title TEXT,
    content TEXT NOT NULL,
    content_format TEXT DEFAULT 'markdown'
        CHECK (content_format IN ('markdown', 'html', 'json', 'yaml')),

    -- For LinkedIn posts
    post_day TEXT,                              -- 'monday', 'tuesday', etc.
    post_theme TEXT,                            -- 'insight_launch', 'problem_spotlight', etc.

    -- Versioning
    version INTEGER DEFAULT 1,
    is_current BOOLEAN DEFAULT true,
    previous_version_id UUID REFERENCES thought_leadership_outputs(id),

    -- Generation Metadata
    model_used TEXT,
    tokens_used INTEGER,
    generation_time_ms INTEGER,
    context_assets_used UUID[],                 -- Which context assets were injected
    skill_used UUID,                            -- Which skill was used

    -- Publishing
    published_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- NEW CONTEXT ASSET TYPES
-- For thought leadership specific assets
-- ============================================
INSERT INTO context_asset_types (type_key, display_name, description, icon, sort_order)
VALUES
    ('core_thesis', 'Core Thesis', 'Your main thought leadership thesis/anchor statement', 'compass', 30),
    ('atomic_claim', 'Atomic Claim', 'Single-sentence claim that defines your unique perspective', 'target', 31),
    ('content_pillars', 'Content Pillars', 'Strategic themes for content organization', 'columns', 32),
    ('positioning_framework', 'Positioning Framework', 'Complete positioning strategy document', 'map', 33),
    ('ai_visibility_report', 'AI Visibility Report', 'Results from AI visibility research', 'eye', 34)
ON CONFLICT (type_key) DO NOTHING;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tl_profiles_user ON thought_leadership_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_tl_profiles_status ON thought_leadership_profiles(status);

CREATE INDEX IF NOT EXISTS idx_ai_visibility_user ON ai_visibility_research(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_visibility_profile ON ai_visibility_research(profile_id);
CREATE INDEX IF NOT EXISTS idx_ai_visibility_type ON ai_visibility_research(research_type);

CREATE INDEX IF NOT EXISTS idx_content_pillars_user ON content_pillars(user_id);
CREATE INDEX IF NOT EXISTS idx_content_pillars_profile ON content_pillars(profile_id);
CREATE INDEX IF NOT EXISTS idx_content_pillars_active ON content_pillars(is_active);

CREATE INDEX IF NOT EXISTS idx_calendar_entries_user ON content_calendar_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_entries_profile ON content_calendar_entries(profile_id);
CREATE INDEX IF NOT EXISTS idx_calendar_entries_pillar ON content_calendar_entries(pillar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_entries_date ON content_calendar_entries(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_calendar_entries_week ON content_calendar_entries(year, week_number);
CREATE INDEX IF NOT EXISTS idx_calendar_entries_status ON content_calendar_entries(status);
CREATE INDEX IF NOT EXISTS idx_calendar_entries_notion ON content_calendar_entries(notion_page_id);
CREATE INDEX IF NOT EXISTS idx_calendar_entries_sync ON content_calendar_entries(sync_status);

CREATE INDEX IF NOT EXISTS idx_tl_outputs_user ON thought_leadership_outputs(user_id);
CREATE INDEX IF NOT EXISTS idx_tl_outputs_entry ON thought_leadership_outputs(calendar_entry_id);
CREATE INDEX IF NOT EXISTS idx_tl_outputs_type ON thought_leadership_outputs(output_type);
CREATE INDEX IF NOT EXISTS idx_tl_outputs_current ON thought_leadership_outputs(is_current);

-- ============================================
-- TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_tl_profiles_updated_at ON thought_leadership_profiles;
CREATE TRIGGER update_tl_profiles_updated_at
    BEFORE UPDATE ON thought_leadership_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_content_pillars_updated_at ON content_pillars;
CREATE TRIGGER update_content_pillars_updated_at
    BEFORE UPDATE ON content_pillars
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_calendar_entries_updated_at ON content_calendar_entries;
CREATE TRIGGER update_calendar_entries_updated_at
    BEFORE UPDATE ON content_calendar_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE thought_leadership_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_visibility_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE thought_leadership_outputs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Users can view own TL profile" ON thought_leadership_profiles;
DROP POLICY IF EXISTS "Users can insert own TL profile" ON thought_leadership_profiles;
DROP POLICY IF EXISTS "Users can update own TL profile" ON thought_leadership_profiles;
DROP POLICY IF EXISTS "Users can delete own TL profile" ON thought_leadership_profiles;

DROP POLICY IF EXISTS "Users can view own visibility research" ON ai_visibility_research;
DROP POLICY IF EXISTS "Users can insert own visibility research" ON ai_visibility_research;
DROP POLICY IF EXISTS "Users can delete own visibility research" ON ai_visibility_research;

DROP POLICY IF EXISTS "Users can view own pillars" ON content_pillars;
DROP POLICY IF EXISTS "Users can insert own pillars" ON content_pillars;
DROP POLICY IF EXISTS "Users can update own pillars" ON content_pillars;
DROP POLICY IF EXISTS "Users can delete own pillars" ON content_pillars;

DROP POLICY IF EXISTS "Users can view own calendar entries" ON content_calendar_entries;
DROP POLICY IF EXISTS "Users can insert own calendar entries" ON content_calendar_entries;
DROP POLICY IF EXISTS "Users can update own calendar entries" ON content_calendar_entries;
DROP POLICY IF EXISTS "Users can delete own calendar entries" ON content_calendar_entries;

DROP POLICY IF EXISTS "Users can view own TL outputs" ON thought_leadership_outputs;
DROP POLICY IF EXISTS "Users can insert own TL outputs" ON thought_leadership_outputs;
DROP POLICY IF EXISTS "Users can update own TL outputs" ON thought_leadership_outputs;
DROP POLICY IF EXISTS "Users can delete own TL outputs" ON thought_leadership_outputs;

-- Thought Leadership Profiles policies
CREATE POLICY "Users can view own TL profile" ON thought_leadership_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own TL profile" ON thought_leadership_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own TL profile" ON thought_leadership_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own TL profile" ON thought_leadership_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- AI Visibility Research policies
CREATE POLICY "Users can view own visibility research" ON ai_visibility_research
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own visibility research" ON ai_visibility_research
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own visibility research" ON ai_visibility_research
    FOR DELETE USING (auth.uid() = user_id);

-- Content Pillars policies
CREATE POLICY "Users can view own pillars" ON content_pillars
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pillars" ON content_pillars
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pillars" ON content_pillars
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pillars" ON content_pillars
    FOR DELETE USING (auth.uid() = user_id);

-- Content Calendar Entries policies
CREATE POLICY "Users can view own calendar entries" ON content_calendar_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar entries" ON content_calendar_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar entries" ON content_calendar_entries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar entries" ON content_calendar_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Thought Leadership Outputs policies
CREATE POLICY "Users can view own TL outputs" ON thought_leadership_outputs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own TL outputs" ON thought_leadership_outputs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own TL outputs" ON thought_leadership_outputs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own TL outputs" ON thought_leadership_outputs
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- VIEWS
-- ============================================

-- Weekly Content Summary
CREATE OR REPLACE VIEW weekly_content_summary AS
SELECT
    cce.user_id,
    cce.year,
    cce.week_number,
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE cce.status = 'published') as published_count,
    COUNT(*) FILTER (WHERE cce.status IN ('planned', 'researching', 'drafting')) as in_progress_count,
    COUNT(*) FILTER (WHERE cce.article_markdown IS NOT NULL) as articles_generated,
    COUNT(*) FILTER (WHERE cce.linkedin_posts::text != '[]') as linkedin_series_generated,
    MIN(cce.scheduled_date) as week_start,
    MAX(cce.scheduled_date) as week_end
FROM content_calendar_entries cce
GROUP BY cce.user_id, cce.year, cce.week_number;

-- Pillar Content Distribution
CREATE OR REPLACE VIEW pillar_content_distribution AS
SELECT
    cp.id as pillar_id,
    cp.user_id,
    cp.name as pillar_name,
    cp.color,
    COUNT(cce.id) as total_entries,
    COUNT(cce.id) FILTER (WHERE cce.status = 'published') as published_count,
    COUNT(tlo.id) as total_outputs,
    MAX(cce.scheduled_date) as last_scheduled,
    MAX(tlo.published_at) as last_published
FROM content_pillars cp
LEFT JOIN content_calendar_entries cce ON cce.pillar_id = cp.id
LEFT JOIN thought_leadership_outputs tlo ON tlo.calendar_entry_id = cce.id AND tlo.is_current = true
WHERE cp.is_active = true
GROUP BY cp.id, cp.user_id, cp.name, cp.color;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE thought_leadership_profiles IS 'Core thought leadership configuration and setup progress per user';
COMMENT ON TABLE ai_visibility_research IS 'AI visibility test results for personal brand and competitors';
COMMENT ON TABLE content_pillars IS 'Strategic content themes (4-5) that organize all content';
COMMENT ON TABLE content_calendar_entries IS 'Content calendar with Notion sync, stores generated content';
COMMENT ON TABLE thought_leadership_outputs IS 'Versioned generated content artifacts';

COMMENT ON COLUMN thought_leadership_profiles.core_thesis IS 'Main thought leadership thesis/anchor - the big idea';
COMMENT ON COLUMN thought_leadership_profiles.atomic_claim IS 'Single sentence claim defining unique perspective';
COMMENT ON COLUMN thought_leadership_profiles.setup_step IS 'Current step in the Niche Discovery workflow (0-12)';
COMMENT ON COLUMN content_pillars.quarterly_focus IS 'Which quarters this pillar is primary focus (Q1, Q2, etc)';
COMMENT ON COLUMN content_calendar_entries.notion_page_id IS 'Notion page ID for bidirectional sync';
COMMENT ON COLUMN content_calendar_entries.sync_status IS 'pending=needs sync, synced=up to date, conflict=needs resolution';
COMMENT ON COLUMN thought_leadership_outputs.output_type IS 'Type of content: article_human, article_ai, linkedin_post, etc.';
