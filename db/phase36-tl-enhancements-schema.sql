/**
 * INSIGHT 360 - Phase 36: Thought Leadership Enhancements
 *
 * Adds:
 * 1. Image generation support for articles
 * 2. Social platform connections (OAuth)
 * 3. Scheduled publications
 * 4. Publication history tracking
 *
 * Run after phase24-thought-leadership-schema.sql
 */

-- ============================================
-- FEATURE 1: Article Image Generation
-- ============================================

-- Add image fields to content_calendar_entries
ALTER TABLE content_calendar_entries
ADD COLUMN IF NOT EXISTS header_image_url TEXT,
ADD COLUMN IF NOT EXISTS header_image_prompt TEXT,
ADD COLUMN IF NOT EXISTS header_image_style TEXT DEFAULT 'professional',
ADD COLUMN IF NOT EXISTS header_image_generated_at TIMESTAMP WITH TIME ZONE;

-- Image generation history for auditing and regeneration
CREATE TABLE IF NOT EXISTS tl_image_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    calendar_entry_id UUID REFERENCES content_calendar_entries(id) ON DELETE CASCADE,

    -- Prompt Details
    prompt TEXT NOT NULL,
    revised_prompt TEXT,                    -- DALL-E 3 returns revised prompts

    -- Generation Settings
    model TEXT DEFAULT 'dall-e-3',
    size TEXT DEFAULT '1792x1024',
    quality TEXT DEFAULT 'standard',
    style TEXT DEFAULT 'professional',

    -- Result
    image_url TEXT NOT NULL,                -- Permanent Supabase Storage URL
    dalle_url TEXT,                         -- Original DALL-E URL (expires)
    is_current BOOLEAN DEFAULT true,

    -- Metadata
    generation_time_ms INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for image generations
CREATE INDEX IF NOT EXISTS idx_tl_image_gen_user ON tl_image_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_tl_image_gen_entry ON tl_image_generations(calendar_entry_id);
CREATE INDEX IF NOT EXISTS idx_tl_image_gen_current ON tl_image_generations(calendar_entry_id, is_current) WHERE is_current = true;

-- ============================================
-- FEATURE 2: Social Platform Connections
-- ============================================

-- OAuth connections for social platforms
CREATE TABLE IF NOT EXISTS social_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Platform Identification
    platform TEXT NOT NULL
        CHECK (platform IN ('linkedin', 'x', 'substack', 'facebook', 'medium', 'buffer')),
    platform_user_id TEXT,                  -- Platform's user/page ID
    platform_username TEXT,                 -- Display name on platform
    platform_profile_url TEXT,              -- Link to profile

    -- OAuth Tokens (encrypted at application level)
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    scopes TEXT[],

    -- LinkedIn Specific
    linkedin_person_urn TEXT,               -- For personal posts (urn:li:person:xxx)
    linkedin_org_urn TEXT,                  -- For company page posts (urn:li:organization:xxx)

    -- Status
    status TEXT DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'revoked', 'error')),
    last_used_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- One connection per platform per user
    UNIQUE(user_id, platform)
);

-- Indexes for social connections
CREATE INDEX IF NOT EXISTS idx_social_conn_user ON social_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_social_conn_platform ON social_connections(platform);
CREATE INDEX IF NOT EXISTS idx_social_conn_status ON social_connections(status);

-- ============================================
-- FEATURE 3: Scheduled Publications
-- ============================================

-- Scheduled publication queue
CREATE TABLE IF NOT EXISTS scheduled_publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    calendar_entry_id UUID REFERENCES content_calendar_entries(id) ON DELETE SET NULL,
    output_id UUID REFERENCES thought_leadership_outputs(id) ON DELETE SET NULL,

    -- Platform & Scheduling
    platform TEXT NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone TEXT DEFAULT 'America/New_York',

    -- Content
    content_type TEXT NOT NULL
        CHECK (content_type IN ('article', 'linkedin_post', 'thread', 'note', 'newsletter')),
    content_text TEXT NOT NULL,
    content_json JSONB,                     -- For structured content (threads, carousels)
    media_urls TEXT[],                      -- Images, videos to attach

    -- Optimal Time Recommendation
    was_optimal_time BOOLEAN DEFAULT false, -- User accepted recommended time
    optimal_time_reason TEXT,               -- Why this time was recommended

    -- Status
    status TEXT DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'queued', 'publishing', 'published', 'failed', 'cancelled')),

    -- Result
    published_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    platform_post_id TEXT,                  -- Platform's ID for the post

    -- Error Handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_retry_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for scheduled publications
CREATE INDEX IF NOT EXISTS idx_sched_pub_user ON scheduled_publications(user_id);
CREATE INDEX IF NOT EXISTS idx_sched_pub_status ON scheduled_publications(status);
CREATE INDEX IF NOT EXISTS idx_sched_pub_scheduled_at ON scheduled_publications(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_sched_pub_calendar ON scheduled_publications(calendar_entry_id);

-- ============================================
-- FEATURE 4: Publication History & Analytics
-- ============================================

-- Publication history for analytics and tracking
CREATE TABLE IF NOT EXISTS publication_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_publication_id UUID REFERENCES scheduled_publications(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    calendar_entry_id UUID REFERENCES content_calendar_entries(id) ON DELETE SET NULL,

    -- Publication Details
    platform TEXT NOT NULL,
    content_type TEXT NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    published_url TEXT,
    platform_post_id TEXT,

    -- Content Snapshot
    content_preview TEXT,                   -- First 500 chars for reference
    media_count INTEGER DEFAULT 0,

    -- Engagement Metrics (updated via polling or webhooks)
    impressions INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5, 2),          -- Calculated engagement %
    last_engagement_update TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for publication history
CREATE INDEX IF NOT EXISTS idx_pub_history_user ON publication_history(user_id);
CREATE INDEX IF NOT EXISTS idx_pub_history_platform ON publication_history(platform);
CREATE INDEX IF NOT EXISTS idx_pub_history_published_at ON publication_history(published_at);
CREATE INDEX IF NOT EXISTS idx_pub_history_calendar ON publication_history(calendar_entry_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on new tables
ALTER TABLE tl_image_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data

-- Image generations
CREATE POLICY tl_image_gen_user_policy ON tl_image_generations
    FOR ALL USING (user_id = auth.uid());

-- Social connections
CREATE POLICY social_conn_user_policy ON social_connections
    FOR ALL USING (user_id = auth.uid());

-- Scheduled publications
CREATE POLICY sched_pub_user_policy ON scheduled_publications
    FOR ALL USING (user_id = auth.uid());

-- Publication history
CREATE POLICY pub_history_user_policy ON publication_history
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- VIEWS
-- ============================================

-- View: Upcoming scheduled publications
CREATE OR REPLACE VIEW upcoming_publications AS
SELECT
    sp.id,
    sp.user_id,
    sp.platform,
    sp.content_type,
    sp.scheduled_at,
    sp.timezone,
    sp.status,
    sp.was_optimal_time,
    cce.title AS calendar_entry_title,
    LEFT(sp.content_text, 200) AS content_preview
FROM scheduled_publications sp
LEFT JOIN content_calendar_entries cce ON sp.calendar_entry_id = cce.id
WHERE sp.status = 'scheduled'
  AND sp.scheduled_at > NOW()
ORDER BY sp.scheduled_at ASC;

-- View: Publishing analytics by platform
CREATE OR REPLACE VIEW publishing_analytics AS
SELECT
    user_id,
    platform,
    COUNT(*) AS total_posts,
    SUM(impressions) AS total_impressions,
    SUM(likes) AS total_likes,
    SUM(comments) AS total_comments,
    SUM(shares) AS total_shares,
    AVG(engagement_rate) AS avg_engagement_rate,
    MAX(published_at) AS last_published
FROM publication_history
GROUP BY user_id, platform;

-- View: Weekly publishing summary
CREATE OR REPLACE VIEW weekly_publishing_summary AS
SELECT
    user_id,
    DATE_TRUNC('week', published_at) AS week_start,
    platform,
    COUNT(*) AS posts_count,
    SUM(impressions) AS impressions,
    SUM(likes + comments + shares) AS total_engagement
FROM publication_history
WHERE published_at > NOW() - INTERVAL '12 weeks'
GROUP BY user_id, DATE_TRUNC('week', published_at), platform
ORDER BY week_start DESC;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Mark previous images as non-current when new one is generated
CREATE OR REPLACE FUNCTION mark_previous_images_non_current()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_current = true THEN
        UPDATE tl_image_generations
        SET is_current = false
        WHERE calendar_entry_id = NEW.calendar_entry_id
          AND id != NEW.id
          AND is_current = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-marking previous images
DROP TRIGGER IF EXISTS trg_mark_previous_images ON tl_image_generations;
CREATE TRIGGER trg_mark_previous_images
    AFTER INSERT ON tl_image_generations
    FOR EACH ROW
    EXECUTE FUNCTION mark_previous_images_non_current();

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trg_social_conn_updated ON social_connections;
CREATE TRIGGER trg_social_conn_updated
    BEFORE UPDATE ON social_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sched_pub_updated ON scheduled_publications;
CREATE TRIGGER trg_sched_pub_updated
    BEFORE UPDATE ON scheduled_publications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- GRANTS (for service role)
-- ============================================

-- Grant access to service role for all new tables
GRANT ALL ON tl_image_generations TO service_role;
GRANT ALL ON social_connections TO service_role;
GRANT ALL ON scheduled_publications TO service_role;
GRANT ALL ON publication_history TO service_role;

-- Grant access to views
GRANT SELECT ON upcoming_publications TO authenticated;
GRANT SELECT ON publishing_analytics TO authenticated;
GRANT SELECT ON weekly_publishing_summary TO authenticated;
