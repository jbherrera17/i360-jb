-- ===========================================
-- PHASE 57: Module Add-on Pricing
-- ===========================================
-- Enables individual modules to be priced and purchased as add-ons
-- on top of tier bundles. Also supports nav-group-aligned pricing display.

-- ============================================
-- 1. ADD PRICING COLUMNS TO PLATFORM_MODULES
-- ============================================

ALTER TABLE platform_modules
    ADD COLUMN IF NOT EXISTS addon_price_monthly NUMERIC(10,2) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS addon_price_yearly NUMERIC(10,2) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS is_addon_purchasable BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS addon_description TEXT DEFAULT NULL;

COMMENT ON COLUMN platform_modules.addon_price_monthly IS 'Monthly price when purchased as standalone add-on (NULL = not sold individually)';
COMMENT ON COLUMN platform_modules.addon_price_yearly IS 'Yearly price when purchased as standalone add-on';
COMMENT ON COLUMN platform_modules.is_addon_purchasable IS 'Whether this module can be purchased outside its tier';
COMMENT ON COLUMN platform_modules.addon_description IS 'Short marketing description for pricing pages';

-- ============================================
-- 2. ORG MODULE PURCHASES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS org_module_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL REFERENCES platform_modules(id) ON DELETE CASCADE,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    purchased_by UUID REFERENCES users(id),
    billing_period TEXT DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),
    price_at_purchase NUMERIC(10,2),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    cancelled_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_org_module_purchases_org ON org_module_purchases(org_id);
CREATE INDEX IF NOT EXISTS idx_org_module_purchases_active ON org_module_purchases(org_id, status) WHERE status = 'active';

COMMENT ON TABLE org_module_purchases IS 'Tracks add-on module purchases per organization';

-- ============================================
-- 3. UPDATE can_access_module() FUNCTION
-- ============================================
-- Add check for add-on purchases: if org purchased the module,
-- skip the tier gate (still enforce role + org override checks).

CREATE OR REPLACE FUNCTION can_access_module(
    p_user_id UUID,
    p_module_id TEXT,
    p_org_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_tier TEXT;
    v_business_role TEXT;
    v_module RECORD;
    v_role_level INTEGER;
    v_min_role_level INTEGER;
    v_tier_order INTEGER;
    v_min_tier_order INTEGER;
    v_can_access BOOLEAN;
    v_has_addon BOOLEAN;
BEGIN
    -- Platform admins can access everything
    IF is_platform_admin(p_user_id) THEN
        RETURN TRUE;
    END IF;

    -- Get user's org if not provided
    IF p_org_id IS NULL THEN
        SELECT default_org_id INTO v_org_id FROM users WHERE id = p_user_id;
    ELSE
        v_org_id := p_org_id;
    END IF;

    -- No org context, deny access to org-specific features
    IF v_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Get org's tier
    SELECT subscription_tier INTO v_tier FROM organizations WHERE id = v_org_id;
    IF v_tier IS NULL THEN v_tier := 'starter'; END IF;

    -- Get user's business role
    SELECT business_role INTO v_business_role FROM users WHERE id = p_user_id;
    IF v_business_role IS NULL THEN v_business_role := 'ic'; END IF;

    -- Get module requirements
    SELECT * INTO v_module FROM platform_modules WHERE id = p_module_id AND is_active = TRUE;
    IF v_module IS NULL THEN RETURN FALSE; END IF;

    -- Check tier requirement (with add-on purchase bypass)
    IF v_module.min_tier IS NOT NULL THEN
        SELECT display_order INTO v_tier_order FROM subscription_tiers WHERE id = v_tier;
        SELECT display_order INTO v_min_tier_order FROM subscription_tiers WHERE id = v_module.min_tier;
        IF v_tier_order IS NULL OR v_min_tier_order IS NULL THEN
            RETURN FALSE;
        END IF;
        IF v_tier_order < v_min_tier_order THEN
            -- Tier insufficient: check if org purchased this module as an add-on
            SELECT EXISTS (
                SELECT 1 FROM org_module_purchases
                WHERE org_id = v_org_id
                AND module_id = p_module_id
                AND status = 'active'
                AND (expires_at IS NULL OR expires_at > NOW())
            ) INTO v_has_addon;

            IF NOT v_has_addon THEN
                RETURN FALSE;
            END IF;
            -- Add-on purchased, continue to role/override checks
        END IF;
    END IF;

    -- Check business role requirement
    IF v_module.min_business_role IS NOT NULL THEN
        SELECT level INTO v_role_level FROM business_role_levels WHERE id = v_business_role;
        SELECT level INTO v_min_role_level FROM business_role_levels WHERE id = v_module.min_business_role;
        IF v_role_level IS NULL OR v_min_role_level IS NULL THEN
            RETURN FALSE;
        END IF;
        IF v_role_level < v_min_role_level THEN RETURN FALSE; END IF;
    END IF;

    -- Check org-specific module override (explicit disable)
    IF EXISTS (
        SELECT 1 FROM org_module_access
        WHERE org_id = v_org_id AND module_id = p_module_id AND is_enabled = FALSE
    ) THEN
        RETURN FALSE;
    END IF;

    -- Check role-based access (org-specific first, then global)
    SELECT can_access INTO v_can_access
    FROM role_module_access
    WHERE (org_id = v_org_id OR org_id IS NULL)
    AND business_role = v_business_role
    AND module_id = p_module_id
    ORDER BY org_id NULLS LAST
    LIMIT 1;

    RETURN COALESCE(v_can_access, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. HELPER: GET PRICING MODULES
-- ============================================
-- Returns all active modules with pricing info for public display

CREATE OR REPLACE FUNCTION get_pricing_modules()
RETURNS TABLE (
    module_id TEXT,
    module_name TEXT,
    module_description TEXT,
    icon TEXT,
    nav_group TEXT,
    display_order INTEGER,
    min_tier TEXT,
    is_addon_purchasable BOOLEAN,
    addon_price_monthly NUMERIC,
    addon_price_yearly NUMERIC,
    addon_description TEXT,
    category TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pm.id,
        pm.name,
        pm.description,
        pm.icon,
        pm.nav_group,
        pm.display_order,
        pm.min_tier,
        pm.is_addon_purchasable,
        pm.addon_price_monthly,
        pm.addon_price_yearly,
        pm.addon_description,
        pm.category
    FROM platform_modules pm
    WHERE pm.is_active = TRUE
    ORDER BY pm.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
