-- Phase 59d: Fix check_org_limits column name mismatch
-- The function returns 'within_limit' but all server code reads 'within_limits' (with 's')
-- This caused ALL resource limit checks to always fail (blocking creates even when under limit)

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
