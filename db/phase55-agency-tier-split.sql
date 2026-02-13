-- ============================================
-- Phase 55: Agency Tier Split + Soft Limit Infrastructure
-- ============================================
-- Splits the single 'agency' tier into 3 graduated tiers:
--   agency_starter, agency_professional, agency_enterprise
-- Adds tier_group column for UI grouping.
-- ============================================

-- ============================================
-- 1. ADD TIER GROUP COLUMN
-- ============================================

ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS tier_group TEXT DEFAULT 'standard';

COMMENT ON COLUMN subscription_tiers.tier_group IS 'Groups tiers for UI display: standard, agency, platform, legacy';

-- Set tier_group for existing tiers
UPDATE subscription_tiers SET tier_group = 'standard' WHERE id IN ('starter', 'business', 'enterprise');
UPDATE subscription_tiers SET tier_group = 'platform' WHERE id = 'platform';

-- ============================================
-- 2. INSERT 3 NEW AGENCY TIERS
-- ============================================

INSERT INTO subscription_tiers (
    id, name, description, display_order,
    price_monthly, price_yearly,
    max_members, max_clients, max_agents, max_workflows, max_skills,
    max_context_assets, max_research_studios, max_monthly_api_calls, max_storage_gb,
    features, allow_self_upgrade, tier_group
)
VALUES
    (
        'agency_starter',
        'Agency Starter',
        'For solo consultants and small agencies getting started with client management',
        4, 499.00, 4990.00,
        5, 5, 25, 15, 50,
        50, 3, 2000, 5.0,
        '{
            "white_label": false,
            "custom_branding": true,
            "api_access": false,
            "sso": false,
            "priority_support": false,
            "advanced_analytics": true,
            "client_portal": true
        }'::jsonb,
        TRUE,
        'agency'
    ),
    (
        'agency_professional',
        'Agency Professional',
        'For growing agencies that need white-label branding, API access, and higher limits',
        5, 1499.00, 14990.00,
        15, 25, 100, 50, 200,
        250, 15, 25000, 50.0,
        '{
            "white_label": true,
            "custom_branding": true,
            "api_access": true,
            "sso": true,
            "priority_support": true,
            "advanced_analytics": true,
            "client_portal": true
        }'::jsonb,
        TRUE,
        'agency'
    ),
    (
        'agency_enterprise',
        'Agency Enterprise',
        'For large agencies and consultancies with enterprise-grade needs and unlimited scale',
        6, 4999.00, 49990.00,
        999, 999, 500, 200, 500,
        1000, 50, 100000, 500.0,
        '{
            "white_label": true,
            "custom_branding": true,
            "api_access": true,
            "sso": true,
            "priority_support": true,
            "advanced_analytics": true,
            "client_portal": true
        }'::jsonb,
        FALSE,
        'agency'
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    max_members = EXCLUDED.max_members,
    max_clients = EXCLUDED.max_clients,
    max_agents = EXCLUDED.max_agents,
    max_workflows = EXCLUDED.max_workflows,
    max_skills = EXCLUDED.max_skills,
    max_context_assets = EXCLUDED.max_context_assets,
    max_research_studios = EXCLUDED.max_research_studios,
    max_monthly_api_calls = EXCLUDED.max_monthly_api_calls,
    max_storage_gb = EXCLUDED.max_storage_gb,
    features = EXCLUDED.features,
    allow_self_upgrade = EXCLUDED.allow_self_upgrade,
    tier_group = EXCLUDED.tier_group,
    updated_at = NOW();

-- ============================================
-- 3. DEACTIVATE OLD AGENCY TIER
-- ============================================

UPDATE subscription_tiers
SET is_active = FALSE, tier_group = 'legacy', updated_at = NOW()
WHERE id = 'agency';

-- ============================================
-- 4. MIGRATE EXISTING ORGS ON OLD 'agency' TIER
-- ============================================

UPDATE organizations
SET subscription_tier = 'agency_starter'
WHERE subscription_tier = 'agency';

-- ============================================
-- 5. UPDATE MODULE MIN_TIER REFERENCES
-- ============================================
-- Change modules that required 'agency' to require 'agency_starter'
-- so all 3 agency tiers (display_order 4/5/6) can access them.

UPDATE platform_modules
SET min_tier = 'agency_starter'
WHERE min_tier = 'agency';

-- ============================================
-- 6. UPDATE CHECK CONSTRAINT ON ORGANIZATIONS
-- ============================================

DO $$
BEGIN
    ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subscription_tier_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE organizations
ADD CONSTRAINT organizations_subscription_tier_check
CHECK (subscription_tier IN (
    'free', 'starter', 'business', 'enterprise',
    'agency', 'agency_starter', 'agency_professional', 'agency_enterprise',
    'pro', 'platform'
));

-- ============================================
-- ROADMAP COMMENTS (Not built now)
-- ============================================

-- Option B — Overage Billing:
--   ADD COLUMN allow_overage BOOLEAN DEFAULT FALSE to subscription_tiers
--   ADD COLUMN overage_rates JSONB DEFAULT '{}' to subscription_tiers
--     e.g. {"agents": 5.00, "workflows": 3.00, "api_calls": 0.01}
--   CREATE TABLE billing_overages (org_id, resource_type, quantity, rate, period_start, period_end, stripe_invoice_item_id)
--   Stripe metered billing integration in server/services/stripeService.js

-- Option C — API Metering:
--   CREATE TABLE api_usage_log (org_id, user_id, endpoint, tokens_used, model, created_at)
--   Middleware to log API calls per org
--   Monthly aggregation view: api_usage_monthly
--   Enforce max_monthly_api_calls in chat/agent routes
--   Dashboard widget showing API usage trends
