-- Phase 60: Social Media Publishing via Postiz Integration
-- Adds social_publishing module, org-level Postiz configuration, and publishing tables.

BEGIN;

-- ============================================
-- 1. Register social_publishing module
-- ============================================
INSERT INTO platform_modules (id, name, description, icon, route_path, min_tier, min_business_role, category, nav_group, display_order, is_active)
VALUES (
    'social_publishing',
    'Social Media',
    'Multi-platform social media publishing powered by Postiz. Schedule and publish to YouTube, Instagram, TikTok, Twitter/X, Facebook, LinkedIn, Pinterest, and Threads.',
    'share-2',
    '/social-media.html',
    'business',
    NULL,
    'tools',
    'modules',
    36,
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    route_path = EXCLUDED.route_path,
    display_order = EXCLUDED.display_order;

-- ============================================
-- 2. Add Postiz config columns to organizations
-- ============================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS postiz_org_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS postiz_api_key_encrypted TEXT;

-- ============================================
-- 3. Social publishing posts table
-- ============================================
CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),

    -- Content
    content_text TEXT NOT NULL,
    media_urls TEXT[] DEFAULT '{}',

    -- Platform targeting
    platforms TEXT[] NOT NULL DEFAULT '{}',
    platform_post_ids JSONB DEFAULT '{}',

    -- Scheduling
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,

    -- Postiz reference
    postiz_post_id TEXT,

    -- Content source (link to TL module)
    source_type TEXT CHECK (source_type IN ('manual', 'thought_leadership', 'workflow')),
    source_id UUID,

    -- Adapted content per platform (from contentAdapterService)
    platform_content JSONB DEFAULT '{}',

    -- Error tracking
    last_error TEXT,
    retry_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_posts_org ON social_posts(org_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_user ON social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_posts(scheduled_at) WHERE status = 'scheduled';

-- ============================================
-- 4. Social platform connections (org-scoped)
-- ============================================
CREATE TABLE IF NOT EXISTS social_platform_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    connected_by UUID NOT NULL REFERENCES auth.users(id),

    platform TEXT NOT NULL,
    platform_account_id TEXT,
    platform_account_name TEXT,
    platform_profile_url TEXT,

    -- Postiz integration reference
    postiz_integration_id TEXT,

    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disconnected', 'error', 'expired')),
    last_error TEXT,
    last_used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(org_id, platform, platform_account_id)
);

CREATE INDEX IF NOT EXISTS idx_social_platform_connections_org ON social_platform_connections(org_id);

-- ============================================
-- 5. Social publishing analytics
-- ============================================
CREATE TABLE IF NOT EXISTS social_post_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,

    impressions INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,

    raw_metrics JSONB DEFAULT '{}',
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_post_analytics_post ON social_post_analytics(post_id);

-- ============================================
-- 6. RLS Policies
-- ============================================

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_post_analytics ENABLE ROW LEVEL SECURITY;

-- Social posts: org members can view, creators can edit
CREATE POLICY "social_posts_select" ON social_posts FOR SELECT
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "social_posts_insert" ON social_posts FOR INSERT
    WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "social_posts_update" ON social_posts FOR UPDATE
    USING (user_id = auth.uid() OR org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid() AND business_role IN ('owner', 'admin')
    ));

CREATE POLICY "social_posts_delete" ON social_posts FOR DELETE
    USING (user_id = auth.uid() OR org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid() AND business_role IN ('owner', 'admin')
    ));

-- Platform connections: org admins manage, members view
CREATE POLICY "social_connections_select" ON social_platform_connections FOR SELECT
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "social_connections_manage" ON social_platform_connections FOR ALL
    USING (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid() AND business_role IN ('owner', 'admin')
    ));

-- Analytics: org members can view
CREATE POLICY "social_analytics_select" ON social_post_analytics FOR SELECT
    USING (post_id IN (
        SELECT id FROM social_posts WHERE org_id IN (
            SELECT org_id FROM org_members WHERE user_id = auth.uid()
        )
    ));

-- ============================================
-- 7. Tier-based platform limits
-- ============================================
-- NOTE: Social media pricing and usage limits are configured in
-- phase60b-social-media-pricing.sql which adds proper columns
-- (max_social_posts_monthly, max_social_channels) to subscription_tiers
-- and extends check_org_limits() to support social_posts and social_channels.

COMMIT;
