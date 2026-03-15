-- ===========================================
-- PHASE 72: Thought Leadership Publishing Pipeline
-- ===========================================
-- Adds blog publishing, Notion full-page publishing, Substack integration,
-- multi-model image support, and pre-flight check infrastructure.

-- ============================================
-- 1. BLOG ARTICLES TABLE (public-facing)
-- ============================================

CREATE TABLE IF NOT EXISTS blog_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_entry_id UUID REFERENCES content_calendar_entries(id) ON DELETE SET NULL,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    article_html TEXT NOT NULL,
    article_markdown TEXT NOT NULL,
    header_image_url TEXT,
    author_name TEXT NOT NULL,
    author_bio TEXT,
    pillar TEXT,
    pillar_color TEXT,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    seo_title TEXT,
    seo_description TEXT,
    og_image_url TEXT,
    tags TEXT[] DEFAULT '{}',
    is_published BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT blog_articles_slug_unique UNIQUE(slug)
);

CREATE INDEX IF NOT EXISTS idx_blog_articles_org ON blog_articles(org_id);
CREATE INDEX IF NOT EXISTS idx_blog_articles_published ON blog_articles(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_articles_slug ON blog_articles(slug) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_blog_articles_calendar ON blog_articles(calendar_entry_id);

COMMENT ON TABLE blog_articles IS 'Published thought leadership articles for public blog pages';

-- RLS: Public read for published articles, write requires auth + org match
ALTER TABLE blog_articles ENABLE ROW LEVEL SECURITY;

-- Public can read published articles
DROP POLICY IF EXISTS blog_articles_public_read ON blog_articles;
CREATE POLICY blog_articles_public_read ON blog_articles
    FOR SELECT USING (is_published = TRUE);

-- Authenticated users can manage their org's articles
DROP POLICY IF EXISTS blog_articles_org_write ON blog_articles;
CREATE POLICY blog_articles_org_write ON blog_articles
    FOR ALL USING (
        org_id IN (
            SELECT default_org_id FROM users WHERE id = auth.uid()
        )
    );

-- ============================================
-- 2. EXTEND CONTENT_CALENDAR_ENTRIES
-- ============================================

ALTER TABLE content_calendar_entries
    ADD COLUMN IF NOT EXISTS blog_slug TEXT,
    ADD COLUMN IF NOT EXISTS blog_published_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS blog_published BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS notion_content_synced BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS notion_content_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN content_calendar_entries.blog_slug IS 'URL slug for the published blog page';
COMMENT ON COLUMN content_calendar_entries.blog_published IS 'Whether article is live on the public blog';
COMMENT ON COLUMN content_calendar_entries.notion_content_synced IS 'Whether full page content (not just metadata) was published to Notion';

-- ============================================
-- 3. EXTEND THOUGHT_LEADERSHIP_PROFILES
-- ============================================

ALTER TABLE thought_leadership_profiles
    ADD COLUMN IF NOT EXISTS preferred_image_model TEXT DEFAULT 'gpt-image-1.5',
    ADD COLUMN IF NOT EXISTS preferred_image_style TEXT DEFAULT 'professional',
    ADD COLUMN IF NOT EXISTS substack_publication_url TEXT,
    ADD COLUMN IF NOT EXISTS author_bio TEXT;

COMMENT ON COLUMN thought_leadership_profiles.preferred_image_model IS 'Preferred image generation model (gpt-image-1.5, dall-e-3, dall-e-2)';
COMMENT ON COLUMN thought_leadership_profiles.preferred_image_style IS 'Default image style (professional, abstract, illustrative, minimalist, futuristic)';
COMMENT ON COLUMN thought_leadership_profiles.substack_publication_url IS 'Substack publication URL for publishing';

-- ============================================
-- 4. SUBSTACK CREDENTIALS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS substack_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    configured_by UUID REFERENCES users(id),
    publication_url TEXT NOT NULL,
    publication_name TEXT,
    cookie_encrypted TEXT NOT NULL,
    cookie_expires_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
    last_used_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id)
);

CREATE INDEX IF NOT EXISTS idx_substack_credentials_org ON substack_credentials(org_id);

COMMENT ON TABLE substack_credentials IS 'Substack session cookies for automated publishing (beta). Cookies encrypted with AES-256-GCM.';

ALTER TABLE substack_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS substack_credentials_org ON substack_credentials;
CREATE POLICY substack_credentials_org ON substack_credentials
    FOR ALL USING (
        org_id IN (
            SELECT default_org_id FROM users WHERE id = auth.uid()
        )
    );

-- ============================================
-- 5. THOUGHT LEADERSHIP ADD-ON PRICING
-- ============================================
-- Starter tier orgs can purchase TL as a standalone add-on.
-- Pricing: $49/mo | $490/yr (94.4% margin at median usage)
-- Competitive refs: Jasper Pro $59, Writesonic Lite $49, ContentStudio+Postiz $68

UPDATE platform_modules SET
    is_addon_purchasable = TRUE,
    addon_price_monthly = 49.00,
    addon_price_yearly = 490.00,
    addon_description = 'AI-powered thought leadership for Starter teams. Generate one article per week with your brand voice, header images, a 5-part LinkedIn series, and publish across 8+ social channels. Includes Notion calendar sync and AI visibility research.'
WHERE id = 'thought_leadership';

-- ============================================
-- 5b. TL ARTICLE LIMITS PER TIER
-- ============================================

ALTER TABLE subscription_tiers
    ADD COLUMN IF NOT EXISTS max_tl_articles_monthly INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_tl_linkedin_posts_monthly INTEGER DEFAULT 0;

COMMENT ON COLUMN subscription_tiers.max_tl_articles_monthly IS 'Maximum AI-generated TL articles per month (0=not included, -1=unlimited)';
COMMENT ON COLUMN subscription_tiers.max_tl_linkedin_posts_monthly IS 'Maximum AI-generated LinkedIn posts per month via TL module (0=not included, -1=unlimited)';

-- Starter: TL not included in base tier. Add-on grants 4 articles/mo, 20 posts/mo.
UPDATE subscription_tiers SET max_tl_articles_monthly = 0, max_tl_linkedin_posts_monthly = 0 WHERE id = 'starter';
-- Business ($99/mo): 16 articles/mo (4/week), 80 LinkedIn posts
UPDATE subscription_tiers SET max_tl_articles_monthly = 16, max_tl_linkedin_posts_monthly = 80 WHERE id = 'business';
-- Enterprise and above: unlimited
UPDATE subscription_tiers SET max_tl_articles_monthly = -1, max_tl_linkedin_posts_monthly = -1 WHERE id = 'enterprise';
UPDATE subscription_tiers SET max_tl_articles_monthly = -1, max_tl_linkedin_posts_monthly = -1 WHERE id = 'agency_starter';
UPDATE subscription_tiers SET max_tl_articles_monthly = -1, max_tl_linkedin_posts_monthly = -1 WHERE id = 'agency_professional';
UPDATE subscription_tiers SET max_tl_articles_monthly = -1, max_tl_linkedin_posts_monthly = -1 WHERE id = 'agency_enterprise';
UPDATE subscription_tiers SET max_tl_articles_monthly = -1, max_tl_linkedin_posts_monthly = -1 WHERE id = 'platform';

-- Optional: settings column on org_module_purchases for per-purchase limits
ALTER TABLE org_module_purchases ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN org_module_purchases.settings IS 'Module-specific settings and limits for this purchase (e.g., article caps for TL add-on)';

-- ============================================
-- 6. PUBLICATION HISTORY EXTENSIONS
-- ============================================
-- Ensure publication_history supports new platform types

-- Add platform values if the table uses an enum or check constraint
-- (publication_history.platform is TEXT, so no constraint changes needed)

-- ============================================
-- 7. BLOG VIEW COUNT INCREMENT FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION increment_blog_view_count(p_slug TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE blog_articles
    SET view_count = view_count + 1,
        updated_at = NOW()
    WHERE slug = p_slug
    AND is_published = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_blog_view_count IS 'Atomically increment view count for a published blog article';
