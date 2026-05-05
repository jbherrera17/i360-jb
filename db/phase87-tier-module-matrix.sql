-- ============================================
-- Phase 87: Tier Configuration Overhaul (REQ-003)
-- ============================================
-- Introduces per-tier-per-module access matrix, marketing-copy fields
-- for the public pricing page, trial timestamps, and the audit trail
-- for the Insight 360 → synergi-website pricing sync.
--
-- Companion files (run in order):
--   phase87b-tier-module-seed.sql        — backfill + strategist matrix + new prices
--   phase87c-tier-marketing-copy-seed.sql — placeholder marketing copy per tier
--   phase87d-reactivate-modules.sql      — re-enable Phase 86 deactivated modules
--
-- Source: REQ-003-tier-config-overhaul.md
-- ============================================

BEGIN;

-- ============================================
-- 1. MARKETING-COPY + VISIBILITY ON subscription_tiers
-- ============================================
-- The public Synergi pricing page consumes these fields.
-- is_public = false keeps a tier in the schema (e.g., legacy or
-- deactivated sub-tiers) but excludes it from the synced JSON.

ALTER TABLE subscription_tiers
    ADD COLUMN IF NOT EXISTS tagline TEXT,
    ADD COLUMN IF NOT EXISTS target_customer TEXT,
    ADD COLUMN IF NOT EXISTS feature_highlights JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS cta_label TEXT DEFAULT 'Get Started',
    ADD COLUMN IF NOT EXISTS cta_url TEXT,
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN subscription_tiers.tagline IS 'Short marketing line shown under the tier name on pricing.html';
COMMENT ON COLUMN subscription_tiers.target_customer IS 'Paragraph describing who this tier is for';
COMMENT ON COLUMN subscription_tiers.feature_highlights IS 'JSONB array of marketing bullet points (4-6 items)';
COMMENT ON COLUMN subscription_tiers.cta_label IS 'Call-to-action button label (e.g., "Start free trial", "Book a demo")';
COMMENT ON COLUMN subscription_tiers.cta_url IS 'Call-to-action destination URL';
COMMENT ON COLUMN subscription_tiers.is_featured IS 'If true, render with "Most Popular" badge on pricing.html';
COMMENT ON COLUMN subscription_tiers.is_public IS 'If false, tier exists in DB but is excluded from public pricing sync';

-- Index to speed the sync query that filters public tiers
CREATE INDEX IF NOT EXISTS idx_subscription_tiers_public
    ON subscription_tiers(is_public, display_order)
    WHERE is_public = TRUE AND is_active = TRUE;


-- ============================================
-- 2. TRIAL TIMESTAMPS ON organizations (Decision #2 = Option B)
-- ============================================
-- Trial overlay is runtime: while trial_expires_at > NOW(), the
-- effectiveConfigResolver overrides the org's tier to Business.
-- No row in subscription_tiers — keeps the marketing matrix to
-- exactly the four paid tiers.

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN organizations.trial_started_at IS 'When the org started its trial. NULL = no trial ever started.';
COMMENT ON COLUMN organizations.trial_expires_at IS 'When the trial ends. While > NOW(), runtime grants Business-tier access regardless of the assigned tier.';

CREATE INDEX IF NOT EXISTS idx_organizations_active_trial
    ON organizations(trial_expires_at)
    WHERE trial_expires_at IS NOT NULL;


-- ============================================
-- 3. tier_module_access — the per-tier-per-module matrix
-- ============================================
-- The authoritative source for "what does this tier include" going
-- forward. Replaces the implicit gate via platform_modules.min_tier
-- and the single-value is_addon_purchasable / addon_price_* columns.
--
-- access_type semantics:
--   'core'     — included in tier base price, no extra cost
--   'optional' — available as a paid add-on (price in addon_price_*)
--   'none'     — not available at this tier
--
-- The constraint at the bottom enforces: pricing columns are populated
-- if and only if access_type = 'optional'.

CREATE TABLE IF NOT EXISTS tier_module_access (
    tier_id     TEXT NOT NULL REFERENCES subscription_tiers(id) ON DELETE CASCADE,
    module_id   TEXT NOT NULL REFERENCES platform_modules(id)   ON DELETE CASCADE,
    access_type TEXT NOT NULL CHECK (access_type IN ('core','optional','none')),

    addon_price_monthly    NUMERIC(10,2),
    addon_price_yearly     NUMERIC(10,2),
    addon_description      TEXT,

    -- Per-tier sub-limits for a module. Example: Customer Support AI
    -- is Optional at every tier but with different conversation caps —
    -- {"conversations_per_month": 500} at Starter vs {"...": 2000} at Business.
    resource_overrides     JSONB DEFAULT '{}'::jsonb,

    -- Optional override of the module's display_order specifically for
    -- this tier's marketing card (e.g., spotlight TL on Business).
    display_order_override INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (tier_id, module_id),

    CONSTRAINT addon_price_only_when_optional CHECK (
        (access_type = 'optional' AND addon_price_monthly IS NOT NULL)
        OR (access_type <> 'optional' AND addon_price_monthly IS NULL AND addon_price_yearly IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_tma_tier   ON tier_module_access(tier_id);
CREATE INDEX IF NOT EXISTS idx_tma_module ON tier_module_access(module_id);
CREATE INDEX IF NOT EXISTS idx_tma_access ON tier_module_access(tier_id, access_type);

COMMENT ON TABLE tier_module_access IS 'Per-tier-per-module access matrix. Authoritative source replacing platform_modules.min_tier as of Phase 87.';
COMMENT ON COLUMN tier_module_access.access_type IS 'core=included in base price, optional=paid add-on, none=not available at this tier';
COMMENT ON COLUMN tier_module_access.resource_overrides IS 'Per-tier sub-limits for this module (e.g., conversation caps). JSONB.';

-- Updated_at trigger (mirrors Phase 44 pattern)
CREATE OR REPLACE FUNCTION update_tier_module_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tma_updated_at ON tier_module_access;
CREATE TRIGGER trg_tma_updated_at
    BEFORE UPDATE ON tier_module_access
    FOR EACH ROW
    EXECUTE FUNCTION update_tier_module_access_updated_at();


-- ============================================
-- 4. pricing_sync_history — audit trail for the website sync
-- ============================================
-- Every sync attempt (including idempotent skips) writes one row.
-- The payload_sha256 column powers idempotency: if the new payload
-- hashes to the same value as the most recent row, the sync route
-- short-circuits with status='skipped' and opens no PR.

CREATE TABLE IF NOT EXISTS pricing_sync_history (
    id BIGSERIAL PRIMARY KEY,

    triggered_by_user_id UUID REFERENCES auth.users(id),
    triggered_by_email   TEXT,

    payload        JSONB NOT NULL,
    payload_sha256 TEXT  NOT NULL,
    diff_markdown  TEXT,

    pr_url      TEXT,
    pr_number   INTEGER,
    branch_name TEXT,

    status TEXT NOT NULL CHECK (status IN ('pending','opened','merged','closed','failed','skipped')),
    error  TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psh_created   ON pricing_sync_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_psh_sha       ON pricing_sync_history(payload_sha256);
CREATE INDEX IF NOT EXISTS idx_psh_status    ON pricing_sync_history(status, created_at DESC);

COMMENT ON TABLE pricing_sync_history IS 'Audit trail for every pricing sync attempt to the synergi-website repo.';
COMMENT ON COLUMN pricing_sync_history.payload_sha256 IS 'SHA-256 of the JSON payload. Used to short-circuit no-op syncs.';
COMMENT ON COLUMN pricing_sync_history.status IS 'pending=in-flight, opened=PR opened, merged=PR merged, closed=PR closed unmerged, failed=PR creation errored, skipped=hash matched prior sync';

DROP TRIGGER IF EXISTS trg_psh_updated_at ON pricing_sync_history;
CREATE TRIGGER trg_psh_updated_at
    BEFORE UPDATE ON pricing_sync_history
    FOR EACH ROW
    EXECUTE FUNCTION update_tier_module_access_updated_at();


-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================
-- tier_module_access:    readable by authenticated (powers /api/pricing/comparison)
--                        writable by platform admin only
-- pricing_sync_history:  platform admin only (read + write)

ALTER TABLE tier_module_access  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_sync_history ENABLE ROW LEVEL SECURITY;

-- tier_module_access policies
DROP POLICY IF EXISTS tma_service_role_all ON tier_module_access;
CREATE POLICY tma_service_role_all ON tier_module_access
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS tma_authenticated_read ON tier_module_access;
CREATE POLICY tma_authenticated_read ON tier_module_access
    FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS tma_platform_admin_write ON tier_module_access;
CREATE POLICY tma_platform_admin_write ON tier_module_access
    FOR ALL TO authenticated
    USING (is_platform_admin(auth.uid()))
    WITH CHECK (is_platform_admin(auth.uid()));

-- pricing_sync_history policies
DROP POLICY IF EXISTS psh_service_role_all ON pricing_sync_history;
CREATE POLICY psh_service_role_all ON pricing_sync_history
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS psh_platform_admin_all ON pricing_sync_history;
CREATE POLICY psh_platform_admin_all ON pricing_sync_history
    FOR ALL TO authenticated
    USING (is_platform_admin(auth.uid()))
    WITH CHECK (is_platform_admin(auth.uid()));


-- ============================================
-- 6. DEPRECATION COMMENTS ON LEGACY COLUMNS
-- ============================================
-- These columns remain functional for one release cycle so the
-- tier_module_access_authoritative runtime flag can roll back.
-- Phase 89 drops them once two release cycles confirm no readers.

COMMENT ON COLUMN platform_modules.min_tier IS
    'DEPRECATED Phase 87 (REQ-003). Authoritative source: tier_module_access. Scheduled for removal in Phase 89.';

COMMENT ON COLUMN platform_modules.is_addon_purchasable IS
    'DEPRECATED Phase 87 (REQ-003). Use tier_module_access.access_type. Scheduled for removal in Phase 89.';

COMMENT ON COLUMN platform_modules.addon_price_monthly IS
    'DEPRECATED Phase 87 (REQ-003). Use tier_module_access.addon_price_monthly. Scheduled for removal in Phase 89.';

COMMENT ON COLUMN platform_modules.addon_price_yearly IS
    'DEPRECATED Phase 87 (REQ-003). Use tier_module_access.addon_price_yearly. Scheduled for removal in Phase 89.';


-- ============================================
-- VERIFICATION QUERIES (run manually after migration)
-- ============================================
-- 1. Confirm columns exist:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'subscription_tiers'
--      AND column_name IN ('tagline','target_customer','feature_highlights','cta_label','cta_url','is_featured','is_public');
--
-- 2. Confirm tier_module_access table exists and is empty (seeded in 87b):
--    SELECT count(*) FROM tier_module_access;  -- expect 0
--
-- 3. Confirm constraint blocks bad inputs:
--    INSERT INTO tier_module_access (tier_id, module_id, access_type, addon_price_monthly)
--    VALUES ('starter','chat','core',49);  -- expect ERROR (price set when not optional)

COMMIT;
