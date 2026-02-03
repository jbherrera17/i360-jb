-- ============================================
-- PHASE 52: PLATFORM TIER (UNLIMITED RESOURCES)
-- ============================================
-- Adds a "platform" tier for Synergi/Forte Energy with unlimited resources
-- Uses -1 to represent unlimited in database, updates check function to handle it
-- ============================================

-- 1. Add the platform tier
INSERT INTO subscription_tiers (id, name, description, display_order,
    price_monthly, price_yearly,
    max_members, max_clients, max_agents, max_workflows, max_skills,
    max_context_assets, max_research_studios, max_monthly_api_calls, max_storage_gb,
    features, allow_self_upgrade)
VALUES
    ('platform', 'Platform', 'Internal platform tier with unlimited resources for Synergi and strategic partners',
     0, 0.00, 0.00,  -- display_order 0 = hidden from self-service, $0 = internal only
     -1, -1, -1, -1, -1, -1, -1, -1, -1,  -- -1 = unlimited
     '{"white_label": true, "custom_branding": true, "api_access": true, "sso": true, "priority_support": true, "advanced_analytics": true, "client_portal": true, "unlimited": true}'::jsonb,
     FALSE)  -- Cannot self-upgrade to platform tier
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
    updated_at = NOW();

-- 2. Update check_org_limits function to handle -1 as unlimited
-- Must drop first due to return type change
DROP FUNCTION IF EXISTS check_org_limits(UUID, TEXT);

CREATE OR REPLACE FUNCTION check_org_limits(
    p_org_id UUID,
    p_resource_type TEXT  -- 'members', 'clients', 'agents', 'workflows', 'skills', 'context_assets', 'research_studios'
)
RETURNS TABLE (
    current_count INTEGER,
    max_allowed INTEGER,
    within_limit BOOLEAN,
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
        ELSE
            v_count := 0;
            v_max := 0;
    END CASE;

    -- Return results: -1 means unlimited (always within limit, 0% usage)
    RETURN QUERY SELECT
        v_count,
        v_max,
        CASE WHEN v_max = -1 THEN TRUE ELSE v_count < v_max END,  -- -1 = unlimited = always within limit
        CASE
            WHEN v_max = -1 THEN 0.00  -- Unlimited = 0% usage
            WHEN v_max > 0 THEN ROUND((v_count::NUMERIC / v_max) * 100, 2)
            ELSE 0.00
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update get_org_tier_details to handle unlimited display
-- Must drop first due to return type change
DROP FUNCTION IF EXISTS get_org_tier_details(UUID);

CREATE OR REPLACE FUNCTION get_org_tier_details(p_org_id UUID)
RETURNS TABLE (
    tier_id TEXT,
    tier_name TEXT,
    max_members INTEGER,
    max_clients INTEGER,
    max_agents INTEGER,
    max_workflows INTEGER,
    features JSONB
) AS $$
DECLARE
    v_tier TEXT;
BEGIN
    SELECT subscription_tier INTO v_tier FROM organizations WHERE id = p_org_id;
    IF v_tier IS NULL THEN v_tier := 'starter'; END IF;

    RETURN QUERY
    SELECT
        st.id,
        st.name,
        st.max_members,
        st.max_clients,
        st.max_agents,
        st.max_workflows,
        st.features
    FROM subscription_tiers st
    WHERE st.id = v_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add comment
COMMENT ON COLUMN subscription_tiers.max_agents IS 'Maximum agents allowed. -1 = unlimited (platform tier only)';
COMMENT ON COLUMN subscription_tiers.max_members IS 'Maximum team members. -1 = unlimited (platform tier only)';
COMMENT ON COLUMN subscription_tiers.max_skills IS 'Maximum skills allowed. -1 = unlimited (platform tier only)';
COMMENT ON COLUMN subscription_tiers.max_context_assets IS 'Maximum context assets. -1 = unlimited (platform tier only)';
