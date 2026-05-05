-- ============================================
-- Phase 88: Per-Org Configuration Overrides (REQ-003)
-- ============================================
-- Lets the platform admin (JB) override resource limits and module
-- access for individual organizations on top of their tier defaults.
-- The org keeps paying their standard tier price; overrides are
-- concessions/negotiations applied manually.
--
-- Three new override tables (platform-admin-only RLS):
--   org_module_overrides       — per-(org, module) access type override
--   org_resource_overrides     — per-(org, field) resource limit override
--   org_config_change_log      — audit trail of every override change
--   tier_default_change_alerts — surfaces "tier default changed; you have an override"
--
-- Helper functions redefined:
--   check_org_limits  — consults org_resource_overrides via COALESCE
--   can_access_module — consults org_module_overrides BEFORE tier check
--
-- Run AFTER: phase87d-reactivate-modules.sql
-- Source: REQ-003-tier-config-overhaul.md
-- ============================================

BEGIN;

-- ============================================
-- 1. org_module_overrides
-- ============================================
-- Per-org override of a module's access type. Wins over tier_module_access.
-- access_type values mirror tier_module_access:
--   'core'     — granted at no extra cost
--   'optional' — available as an add-on (price not stored here; orgs on
--                overrides typically get the addon for free or via a
--                separate negotiated billing line)
--   'none'     — explicitly denied (override of a tier 'core' or 'optional')

CREATE TABLE IF NOT EXISTS org_module_overrides (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    module_id   TEXT NOT NULL REFERENCES platform_modules(id) ON DELETE CASCADE,
    access_type TEXT NOT NULL CHECK (access_type IN ('core','optional','none')),

    -- Per-org sub-limits for this module (e.g., {"conversations_per_month": 5000})
    resource_overrides JSONB DEFAULT '{}'::jsonb,

    -- Why this override exists. HARD-REQUIRED (Decision #12).
    override_reason TEXT NOT NULL,

    created_by  UUID REFERENCES auth.users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(org_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_omo_org    ON org_module_overrides(org_id);
CREATE INDEX IF NOT EXISTS idx_omo_module ON org_module_overrides(module_id);

COMMENT ON TABLE org_module_overrides IS 'Per-org module access overrides applied by platform admin. Wins over tier_module_access.';
COMMENT ON COLUMN org_module_overrides.override_reason IS 'Required justification — used in audit log and admin UI history panel.';


-- ============================================
-- 2. org_resource_overrides
-- ============================================
-- Per-(org, field) override of a resource limit. -1 = unlimited
-- (matches Phase 52 sentinel convention).

CREATE TABLE IF NOT EXISTS org_resource_overrides (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    field           TEXT NOT NULL CHECK (field IN (
        'max_members','max_agents','max_workflows','max_skills',
        'max_context_assets','max_research_studios',
        'max_monthly_api_calls','max_storage_gb','max_clients'
    )),
    override_value  INTEGER NOT NULL,
    override_reason TEXT NOT NULL,

    created_by  UUID REFERENCES auth.users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(org_id, field)
);

CREATE INDEX IF NOT EXISTS idx_oro_org   ON org_resource_overrides(org_id);
CREATE INDEX IF NOT EXISTS idx_oro_field ON org_resource_overrides(field);

COMMENT ON TABLE org_resource_overrides IS 'Per-org resource limit overrides applied by platform admin.';


-- ============================================
-- 3. org_config_change_log (audit trail)
-- ============================================

CREATE TABLE IF NOT EXISTS org_config_change_log (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    changed_by_user_id   UUID REFERENCES auth.users(id),
    change_type          TEXT NOT NULL CHECK (change_type IN ('resource','module','reset')),
    field                TEXT NOT NULL,    -- resource field name OR module_id
    old_value            JSONB,
    new_value            JSONB,
    reason               TEXT NOT NULL,
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_occl_org_created ON org_config_change_log(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_occl_user        ON org_config_change_log(changed_by_user_id);

COMMENT ON TABLE org_config_change_log IS 'Append-only audit log of every per-org config override change.';


-- ============================================
-- 4. tier_default_change_alerts (Decision #11)
-- ============================================
-- When a tier default changes for a module that an org has an override
-- on, we surface an alert to the platform admin (badge on the org config
-- page). 'lateral' = same access type, different price; 'up' = more
-- inclusive (none→optional→core); 'down' = less inclusive.

CREATE TABLE IF NOT EXISTS tier_default_change_alerts (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    module_id                TEXT NOT NULL REFERENCES platform_modules(id) ON DELETE CASCADE,
    tier_id                  TEXT NOT NULL REFERENCES subscription_tiers(id) ON DELETE CASCADE,

    change_type              TEXT NOT NULL CHECK (change_type IN ('lateral','up','down')),

    old_access_type          TEXT,
    new_access_type          TEXT,
    old_addon_price_monthly  NUMERIC(10,2),
    new_addon_price_monthly  NUMERIC(10,2),

    acknowledged_by_user_id  UUID REFERENCES auth.users(id),
    acknowledged_at          TIMESTAMPTZ,
    created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Partial index speeds the badge query ("how many unacknowledged?")
CREATE INDEX IF NOT EXISTS idx_tdca_org_unack
    ON tier_default_change_alerts(org_id)
    WHERE acknowledged_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tdca_created ON tier_default_change_alerts(created_at DESC);

COMMENT ON TABLE tier_default_change_alerts IS 'Surfaces "tier default changed for a module you have an override on" to platform admin.';


-- ============================================
-- 5. updated_at triggers
-- ============================================

CREATE OR REPLACE FUNCTION update_org_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_omo_updated_at ON org_module_overrides;
CREATE TRIGGER trg_omo_updated_at
    BEFORE UPDATE ON org_module_overrides
    FOR EACH ROW EXECUTE FUNCTION update_org_overrides_updated_at();

DROP TRIGGER IF EXISTS trg_oro_updated_at ON org_resource_overrides;
CREATE TRIGGER trg_oro_updated_at
    BEFORE UPDATE ON org_resource_overrides
    FOR EACH ROW EXECUTE FUNCTION update_org_overrides_updated_at();


-- ============================================
-- 6. ROW LEVEL SECURITY (Decision #10 — platform admin only)
-- ============================================
-- All four tables: service_role full access; authenticated users only
-- if is_platform_admin(auth.uid()) returns TRUE. Org members do NOT see
-- their own override history.

ALTER TABLE org_module_overrides       ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_resource_overrides     ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_config_change_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_default_change_alerts ENABLE ROW LEVEL SECURITY;

-- org_module_overrides
DROP POLICY IF EXISTS omo_service_role_all ON org_module_overrides;
CREATE POLICY omo_service_role_all ON org_module_overrides
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS omo_platform_admin_all ON org_module_overrides;
CREATE POLICY omo_platform_admin_all ON org_module_overrides
    FOR ALL TO authenticated
    USING (is_platform_admin(auth.uid()))
    WITH CHECK (is_platform_admin(auth.uid()));

-- org_resource_overrides
DROP POLICY IF EXISTS oro_service_role_all ON org_resource_overrides;
CREATE POLICY oro_service_role_all ON org_resource_overrides
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS oro_platform_admin_all ON org_resource_overrides;
CREATE POLICY oro_platform_admin_all ON org_resource_overrides
    FOR ALL TO authenticated
    USING (is_platform_admin(auth.uid()))
    WITH CHECK (is_platform_admin(auth.uid()));

-- org_config_change_log
DROP POLICY IF EXISTS occl_service_role_all ON org_config_change_log;
CREATE POLICY occl_service_role_all ON org_config_change_log
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS occl_platform_admin_all ON org_config_change_log;
CREATE POLICY occl_platform_admin_all ON org_config_change_log
    FOR ALL TO authenticated
    USING (is_platform_admin(auth.uid()))
    WITH CHECK (is_platform_admin(auth.uid()));

-- tier_default_change_alerts
DROP POLICY IF EXISTS tdca_service_role_all ON tier_default_change_alerts;
CREATE POLICY tdca_service_role_all ON tier_default_change_alerts
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS tdca_platform_admin_all ON tier_default_change_alerts;
CREATE POLICY tdca_platform_admin_all ON tier_default_change_alerts
    FOR ALL TO authenticated
    USING (is_platform_admin(auth.uid()))
    WITH CHECK (is_platform_admin(auth.uid()));


-- ============================================
-- 7. REDEFINE check_org_limits TO CONSULT OVERRIDES
-- ============================================
-- Strategy: after computing v_max from the tier, look up an override
-- for the same field. If present, replace v_max with the override.
-- Field names map directly: resource_type 'agents' → field 'max_agents'.

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
    v_field TEXT;
    v_override INTEGER;
BEGIN
    -- Get org tier
    SELECT subscription_tier INTO v_tier FROM organizations WHERE id = p_org_id;
    IF v_tier IS NULL THEN v_tier := 'starter'; END IF;

    -- Get tier limits
    SELECT * INTO v_limits FROM subscription_tiers WHERE id = v_tier;

    -- Resolve resource_type → tier column name + count query
    CASE p_resource_type
        WHEN 'members' THEN
            SELECT COUNT(*) INTO v_count FROM organization_members WHERE org_id = p_org_id AND status = 'active';
            v_max := v_limits.max_members;
            v_field := 'max_members';
        WHEN 'clients' THEN
            SELECT COUNT(*) INTO v_count FROM clients WHERE org_id = p_org_id AND status != 'archived';
            v_max := v_limits.max_clients;
            v_field := 'max_clients';
        WHEN 'agents' THEN
            SELECT COUNT(*) INTO v_count FROM agents WHERE org_id = p_org_id;
            v_max := v_limits.max_agents;
            v_field := 'max_agents';
        WHEN 'workflows' THEN
            SELECT COUNT(*) INTO v_count FROM workflows WHERE org_id = p_org_id;
            v_max := v_limits.max_workflows;
            v_field := 'max_workflows';
        WHEN 'skills' THEN
            SELECT COUNT(*) INTO v_count FROM skills WHERE org_id = p_org_id;
            v_max := v_limits.max_skills;
            v_field := 'max_skills';
        WHEN 'context_assets' THEN
            SELECT COUNT(*) INTO v_count FROM context_assets WHERE org_id = p_org_id;
            v_max := v_limits.max_context_assets;
            v_field := 'max_context_assets';
        WHEN 'research_studios' THEN
            SELECT COUNT(*) INTO v_count FROM research_studios WHERE org_id = p_org_id;
            v_max := v_limits.max_research_studios;
            v_field := 'max_research_studios';
        ELSE
            v_count := 0;
            v_max := 0;
            v_field := NULL;
    END CASE;

    -- Phase 88: apply org_resource_overrides if present
    IF v_field IS NOT NULL THEN
        SELECT override_value INTO v_override
        FROM org_resource_overrides
        WHERE org_id = p_org_id AND field = v_field;

        IF v_override IS NOT NULL THEN
            v_max := v_override;
        END IF;
    END IF;

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
-- 8. REDEFINE can_access_module TO CONSULT OVERRIDES
-- ============================================
-- Strategy: after the platform-admin shortcut, check org_module_overrides
-- FIRST. If present, the override decides ('core'/'optional' → TRUE,
-- 'none' → FALSE). Falls through to existing tier/role logic only when
-- no override exists.
--
-- This deliberately bypasses the tier display_order check, allowing JB
-- to grant a Starter org access to a Business-tier module.

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
    v_override_access TEXT;
BEGIN
    -- Platform admins see everything
    IF is_platform_admin(p_user_id) THEN
        RETURN TRUE;
    END IF;

    -- Resolve org context
    IF p_org_id IS NULL THEN
        SELECT default_org_id INTO v_org_id FROM users WHERE id = p_user_id;
    ELSE
        v_org_id := p_org_id;
    END IF;

    IF v_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Phase 88: org-level override wins over tier defaults
    SELECT access_type INTO v_override_access
    FROM org_module_overrides
    WHERE org_id = v_org_id AND module_id = p_module_id;

    IF v_override_access IS NOT NULL THEN
        RETURN v_override_access IN ('core', 'optional');
    END IF;

    -- Fall through to tier/role logic (preserved from Phase 44)
    SELECT subscription_tier INTO v_tier FROM organizations WHERE id = v_org_id;
    IF v_tier IS NULL THEN v_tier := 'starter'; END IF;

    SELECT business_role INTO v_business_role FROM users WHERE id = p_user_id;
    IF v_business_role IS NULL THEN v_business_role := 'ic'; END IF;

    SELECT * INTO v_module FROM platform_modules WHERE id = p_module_id;
    IF NOT FOUND OR NOT v_module.is_active THEN
        RETURN FALSE;
    END IF;

    -- Tier check
    IF v_module.min_tier IS NOT NULL THEN
        SELECT display_order INTO v_min_tier_order FROM subscription_tiers WHERE id = v_module.min_tier;
        SELECT display_order INTO v_tier_order     FROM subscription_tiers WHERE id = v_tier;
        IF v_tier_order IS NULL OR v_min_tier_order IS NULL OR v_tier_order < v_min_tier_order THEN
            RETURN FALSE;
        END IF;
    END IF;

    -- Business role check
    IF v_module.min_business_role IS NOT NULL THEN
        SELECT level INTO v_min_role_level FROM business_role_levels WHERE id = v_module.min_business_role;
        SELECT level INTO v_role_level     FROM business_role_levels WHERE id = v_business_role;
        IF v_role_level IS NULL OR v_min_role_level IS NULL OR v_role_level < v_min_role_level THEN
            RETURN FALSE;
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_access_module(UUID, TEXT, UUID) TO authenticated;


-- ============================================
-- 9. VERIFICATION
-- ============================================

DO $$
DECLARE
    v_table_count INTEGER;
BEGIN
    SELECT count(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
          'org_module_overrides',
          'org_resource_overrides',
          'org_config_change_log',
          'tier_default_change_alerts'
      );

    IF v_table_count <> 4 THEN
        RAISE EXCEPTION 'Expected 4 Phase 88 tables, found %. ROLLING BACK.', v_table_count;
    END IF;

    RAISE NOTICE 'Phase 88 applied: 4 override tables created, helper functions redefined.';
END $$;

COMMIT;


-- ============================================
-- POST-MIGRATION VERIFICATION QUERIES
-- ============================================
-- 1. Confirm tables + RLS:
--    SELECT tablename, rowsecurity FROM pg_tables
--    WHERE tablename IN ('org_module_overrides','org_resource_overrides','org_config_change_log','tier_default_change_alerts');
--
-- 2. Confirm helper functions accept overrides (no rows yet → no behavior change):
--    SELECT * FROM check_org_limits('<an org_id>'::uuid, 'agents');
--    SELECT can_access_module('<a user_id>'::uuid, 'chat', '<an org_id>'::uuid);
--
-- 3. Smoke-test an override (replace IDs):
--    INSERT INTO org_resource_overrides (org_id, field, override_value, override_reason, created_by)
--    VALUES ('<org_id>'::uuid, 'max_agents', 99, 'smoke test', '<user_id>'::uuid);
--    SELECT * FROM check_org_limits('<org_id>'::uuid, 'agents');  -- expect max_allowed = 99
--    DELETE FROM org_resource_overrides WHERE org_id = '<org_id>'::uuid AND field = 'max_agents';
