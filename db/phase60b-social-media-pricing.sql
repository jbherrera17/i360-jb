-- ============================================
-- Phase 60b: Social Media Publishing - Pricing & Usage Limits
-- ============================================
-- Adds post volume and channel limits to subscription tiers.
-- Key metric: how many times the customer uses i360 (post volume).
--
-- Pricing Strategy:
--   - Post volume is the primary usage metric (monthly posts)
--   - Connected channels is the secondary limit
--   - Starter tier: not included, available as add-on ($29/mo)
--   - Business+: included with tier-appropriate limits
--   - Agency tiers: generous limits scaled per client
--   - -1 = unlimited
--
-- Competitive benchmarks:
--   Buffer: $5-10/channel/mo, Hootsuite: $99-249/mo,
--   Sprout Social: $199-499/seat, SocialBee: $29-99/mo
--   Postiz Cloud: $29-99/mo
-- ============================================

BEGIN;

-- ============================================
-- 1. ADD SOCIAL LIMIT COLUMNS TO SUBSCRIPTION_TIERS
-- ============================================

ALTER TABLE subscription_tiers
    ADD COLUMN IF NOT EXISTS max_social_posts_monthly INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_social_channels INTEGER DEFAULT 0;

COMMENT ON COLUMN subscription_tiers.max_social_posts_monthly IS 'Maximum social media posts per month (0=not included, -1=unlimited)';
COMMENT ON COLUMN subscription_tiers.max_social_channels IS 'Maximum connected social media channels (0=not included, -1=unlimited)';

-- ============================================
-- 2. SET LIMITS PER TIER
-- ============================================

-- Starter: Social not included (0 posts, 0 channels)
-- Available as add-on for $29/mo (100 posts, 3 channels)
UPDATE subscription_tiers
SET max_social_posts_monthly = 0,
    max_social_channels = 0
WHERE id = 'starter';

-- Business ($99/mo): 500 posts/mo, 5 channels
-- Social is a key value-add at this tier
UPDATE subscription_tiers
SET max_social_posts_monthly = 500,
    max_social_channels = 5
WHERE id = 'business';

-- Enterprise ($299/mo): 2000 posts/mo, 15 channels
-- High volume for large teams
UPDATE subscription_tiers
SET max_social_posts_monthly = 2000,
    max_social_channels = 15
WHERE id = 'enterprise';

-- Agency Starter ($499/mo): 1000 posts/mo, 15 channels
-- ~200 posts per client (5 clients)
UPDATE subscription_tiers
SET max_social_posts_monthly = 1000,
    max_social_channels = 15
WHERE id = 'agency_starter';

-- Agency Professional ($1499/mo): 5000 posts/mo, 50 channels
-- ~200 posts per client (25 clients), 2 channels each
UPDATE subscription_tiers
SET max_social_posts_monthly = 5000,
    max_social_channels = 50
WHERE id = 'agency_professional';

-- Agency Enterprise ($4999/mo): Unlimited
-- No restrictions at this level
UPDATE subscription_tiers
SET max_social_posts_monthly = -1,
    max_social_channels = -1
WHERE id = 'agency_enterprise';

-- Platform tier: Unlimited (Synergi internal)
UPDATE subscription_tiers
SET max_social_posts_monthly = -1,
    max_social_channels = -1
WHERE id = 'platform';

-- ============================================
-- 3. CONFIGURE ADDON PRICING FOR SOCIAL MODULE
-- ============================================
-- Starter-tier orgs can purchase social publishing as an add-on.
-- $29/mo gets 100 posts and 3 channels.

UPDATE platform_modules
SET is_addon_purchasable = TRUE,
    addon_price_monthly = 29.00,
    addon_price_yearly = 290.00,
    addon_description = 'Publish to 8+ social platforms. Includes 100 posts/month and 3 connected channels. Schedule posts, track analytics, and adapt content per platform.'
WHERE id = 'social_publishing';

-- ============================================
-- 4. FIX PHASE 60 RESOURCE_LIMITS REFERENCES
-- ============================================
-- Phase 60 used resource_limits JSONB with wrong tier slugs.
-- Replace with proper column-based limits and correct slug names.
-- Also update social_platforms in resource_limits to match new columns.

DO $$
BEGIN
    -- Clean up incorrect resource_limits entries from phase60
    UPDATE subscription_tiers
    SET resource_limits = COALESCE(resource_limits, '{}'::jsonb) - 'social_platforms'
    WHERE resource_limits ? 'social_platforms';
EXCEPTION
    WHEN undefined_column THEN
        RAISE NOTICE 'resource_limits column not found, skipping cleanup';
END $$;

-- ============================================
-- 5. ADD SOCIAL POSTS TO check_org_limits()
-- ============================================
-- Extend the function to support 'social_posts' and 'social_channels'

DROP FUNCTION IF EXISTS check_org_limits(UUID, TEXT);

CREATE OR REPLACE FUNCTION check_org_limits(
    p_org_id UUID,
    p_resource_type TEXT
)
RETURNS TABLE (
    current_count INTEGER,
    max_allowed INTEGER,
    within_limits BOOLEAN,
    usage_percent NUMERIC(5,2)
) AS $$
DECLARE
    v_tier TEXT;
    v_limits RECORD;
    v_count INTEGER;
    v_max INTEGER;
BEGIN
    -- Get org tier
    SELECT subscription_tier INTO v_tier FROM organizations WHERE id = p_org_id;
    IF v_tier IS NULL THEN v_tier := 'starter'; END IF;

    -- Get tier limits
    SELECT * INTO v_limits FROM subscription_tiers WHERE id = v_tier;

    -- Get current count and max based on resource type
    CASE p_resource_type
        WHEN 'members' THEN
            SELECT COUNT(*) INTO v_count FROM organization_members WHERE org_id = p_org_id AND status = 'active';
            v_max := v_limits.max_members;
        WHEN 'clients' THEN
            SELECT COUNT(*) INTO v_count FROM clients WHERE org_id = p_org_id AND status != 'archived';
            v_max := v_limits.max_clients;
        WHEN 'agents' THEN
            SELECT COUNT(*) INTO v_count FROM agents WHERE org_id = p_org_id;
            v_max := v_limits.max_agents;
        WHEN 'workflows' THEN
            SELECT COUNT(*) INTO v_count FROM workflows WHERE org_id = p_org_id;
            v_max := v_limits.max_workflows;
        WHEN 'skills' THEN
            SELECT COUNT(*) INTO v_count FROM skills WHERE org_id = p_org_id;
            v_max := v_limits.max_skills;
        WHEN 'context_assets' THEN
            SELECT COUNT(*) INTO v_count FROM context_assets WHERE org_id = p_org_id;
            v_max := v_limits.max_context_assets;
        WHEN 'research_studios' THEN
            SELECT COUNT(*) INTO v_count FROM research_studios WHERE org_id = p_org_id;
            v_max := v_limits.max_research_studios;
        WHEN 'social_posts' THEN
            -- Count posts created this calendar month
            SELECT COUNT(*) INTO v_count FROM social_posts
            WHERE org_id = p_org_id
              AND created_at >= date_trunc('month', NOW())
              AND status NOT IN ('cancelled');
            v_max := COALESCE(v_limits.max_social_posts_monthly, 0);
        WHEN 'social_channels' THEN
            SELECT COUNT(*) INTO v_count FROM social_platform_connections
            WHERE org_id = p_org_id AND status = 'active';
            v_max := COALESCE(v_limits.max_social_channels, 0);
        ELSE
            v_count := 0;
            v_max := 0;
    END CASE;

    -- Return results: -1 means unlimited (always within limits, 0% usage)
    RETURN QUERY SELECT
        v_count,
        v_max,
        CASE WHEN v_max = -1 THEN TRUE ELSE v_count < v_max END,
        CASE
            WHEN v_max = -1 THEN 0.00
            WHEN v_max > 0 THEN ROUND((v_count::NUMERIC / v_max) * 100, 2)
            ELSE 0.00
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_org_limits(UUID, TEXT) TO authenticated;

-- ============================================
-- 6. ADD ADDON LIMITS TABLE FOR OVERRIDES
-- ============================================
-- When Starter orgs purchase the social add-on, they get specific limits.
-- Store these in a dedicated column on org_module_purchases.

ALTER TABLE org_module_purchases
    ADD COLUMN IF NOT EXISTS addon_limits JSONB DEFAULT '{}';

COMMENT ON COLUMN org_module_purchases.addon_limits IS 'Resource limits granted by this add-on purchase (e.g., {"social_posts_monthly": 100, "social_channels": 3})';

-- ============================================
-- 7. UPDATE check_org_limits FOR ADDON OVERRIDES
-- ============================================
-- If an org has an addon purchase for social_publishing, use those limits
-- instead of tier defaults when tier defaults are 0.

CREATE OR REPLACE FUNCTION get_social_addon_limit(
    p_org_id UUID,
    p_limit_key TEXT
)
RETURNS INTEGER AS $$
DECLARE
    v_limit INTEGER;
BEGIN
    SELECT (addon_limits->>p_limit_key)::INTEGER INTO v_limit
    FROM org_module_purchases
    WHERE org_id = p_org_id
      AND module_id = 'social_publishing'
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > NOW());

    RETURN COALESCE(v_limit, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now re-create check_org_limits with addon support
DROP FUNCTION IF EXISTS check_org_limits(UUID, TEXT);

CREATE OR REPLACE FUNCTION check_org_limits(
    p_org_id UUID,
    p_resource_type TEXT
)
RETURNS TABLE (
    current_count INTEGER,
    max_allowed INTEGER,
    within_limits BOOLEAN,
    usage_percent NUMERIC(5,2)
) AS $$
DECLARE
    v_tier TEXT;
    v_limits RECORD;
    v_count INTEGER;
    v_max INTEGER;
    v_addon_max INTEGER;
BEGIN
    -- Get org tier
    SELECT subscription_tier INTO v_tier FROM organizations WHERE id = p_org_id;
    IF v_tier IS NULL THEN v_tier := 'starter'; END IF;

    -- Get tier limits
    SELECT * INTO v_limits FROM subscription_tiers WHERE id = v_tier;

    -- Get current count and max based on resource type
    CASE p_resource_type
        WHEN 'members' THEN
            SELECT COUNT(*) INTO v_count FROM organization_members WHERE org_id = p_org_id AND status = 'active';
            v_max := v_limits.max_members;
        WHEN 'clients' THEN
            SELECT COUNT(*) INTO v_count FROM clients WHERE org_id = p_org_id AND status != 'archived';
            v_max := v_limits.max_clients;
        WHEN 'agents' THEN
            SELECT COUNT(*) INTO v_count FROM agents WHERE org_id = p_org_id;
            v_max := v_limits.max_agents;
        WHEN 'workflows' THEN
            SELECT COUNT(*) INTO v_count FROM workflows WHERE org_id = p_org_id;
            v_max := v_limits.max_workflows;
        WHEN 'skills' THEN
            SELECT COUNT(*) INTO v_count FROM skills WHERE org_id = p_org_id;
            v_max := v_limits.max_skills;
        WHEN 'context_assets' THEN
            SELECT COUNT(*) INTO v_count FROM context_assets WHERE org_id = p_org_id;
            v_max := v_limits.max_context_assets;
        WHEN 'research_studios' THEN
            SELECT COUNT(*) INTO v_count FROM research_studios WHERE org_id = p_org_id;
            v_max := v_limits.max_research_studios;
        WHEN 'social_posts' THEN
            -- Count posts created this calendar month
            SELECT COUNT(*) INTO v_count FROM social_posts
            WHERE org_id = p_org_id
              AND created_at >= date_trunc('month', NOW())
              AND status NOT IN ('cancelled');
            v_max := COALESCE(v_limits.max_social_posts_monthly, 0);
            -- Check addon override if tier limit is 0
            IF v_max = 0 THEN
                v_max := get_social_addon_limit(p_org_id, 'social_posts_monthly');
            END IF;
        WHEN 'social_channels' THEN
            SELECT COUNT(*) INTO v_count FROM social_platform_connections
            WHERE org_id = p_org_id AND status = 'active';
            v_max := COALESCE(v_limits.max_social_channels, 0);
            -- Check addon override if tier limit is 0
            IF v_max = 0 THEN
                v_max := get_social_addon_limit(p_org_id, 'social_channels');
            END IF;
        ELSE
            v_count := 0;
            v_max := 0;
    END CASE;

    -- Return results: -1 means unlimited (always within limits, 0% usage)
    RETURN QUERY SELECT
        v_count,
        v_max,
        CASE WHEN v_max = -1 THEN TRUE ELSE v_count < v_max END,
        CASE
            WHEN v_max = -1 THEN 0.00
            WHEN v_max > 0 THEN ROUND((v_count::NUMERIC / v_max) * 100, 2)
            ELSE 0.00
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_org_limits(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_social_addon_limit(UUID, TEXT) TO authenticated;

COMMIT;
