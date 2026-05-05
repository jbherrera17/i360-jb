-- ============================================
-- Phase 87b: Tier Module Matrix Backfill + Pricing Update (REQ-003)
-- ============================================
-- Three things in one transaction:
--   1. Collapse Agency tier (Decision #1) — restore single 'agency' row,
--      deactivate agency_starter / agency_professional / agency_enterprise,
--      migrate any orgs on those sub-tiers back to 'agency'.
--   2. Apply strategist-recommended prices ($49 / $249 / $799 / $999)
--      and resource limits per the new four-tier model.
--   3. Backfill tier_module_access via CROSS JOIN of active tiers ×
--      active modules, deriving access_type from legacy min_tier and
--      is_addon_purchasable. Then apply strategist-specific overrides
--      for named modules.
--
-- Run AFTER: phase87-tier-module-matrix.sql
-- Run BEFORE: phase87c-tier-marketing-copy-seed.sql, phase87d-reactivate-modules.sql
--
-- Source: REQ-003-tier-config-overhaul.md
-- ============================================

BEGIN;

-- ============================================
-- 1. RESTORE SINGLE AGENCY TIER (Decision #1)
-- ============================================
-- Phase 55 split 'agency' into 3 sub-tiers. The original 'agency' row
-- may have been deactivated, deleted, or modified by intervening
-- phases — UPSERT handles all three cases. The sub-tiers (handled
-- below) stay in the schema with is_active=FALSE / is_public=FALSE so
-- existing references survive.

INSERT INTO subscription_tiers (
    id, name, description, display_order,
    price_monthly, price_yearly,
    max_members, max_clients, max_agents, max_workflows, max_skills,
    max_context_assets, max_research_studios, max_monthly_api_calls, max_storage_gb,
    features, allow_self_upgrade, tier_group, is_active, is_public
)
VALUES (
    'agency',
    'Agency',
    'For agencies serving multiple clients. White-label, client portal, cross-client analytics, per-client Soul Configuration. 50 agency members, 100 client orgs, 200 agents.',
    4,
    999.00, 9990.00,
    50, 100, 200, 100, 500,
    1000, 50, 40000, 500.0,
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
    'standard',
    TRUE,
    TRUE
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
    is_active = EXCLUDED.is_active,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

-- Deactivate the three Phase 55 sub-tiers and exclude from public sync
UPDATE subscription_tiers
SET
    is_active = FALSE,
    is_public = FALSE,
    tier_group = 'legacy',
    updated_at = NOW()
WHERE id IN ('agency_starter', 'agency_professional', 'agency_enterprise');

-- Migrate any orgs on the sub-tiers back to single 'agency' tier
UPDATE organizations
SET subscription_tier = 'agency'
WHERE subscription_tier IN ('agency_starter', 'agency_professional', 'agency_enterprise');

-- Restore platform_modules.min_tier references that Phase 55 changed to 'agency_starter'
UPDATE platform_modules
SET min_tier = 'agency'
WHERE min_tier IN ('agency_starter', 'agency_professional', 'agency_enterprise');

-- Update the organizations.subscription_tier CHECK constraint to drop sub-tiers
DO $$
BEGIN
    ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subscription_tier_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE organizations
ADD CONSTRAINT organizations_subscription_tier_check
CHECK (subscription_tier IN ('starter', 'business', 'enterprise', 'agency', 'platform'));


-- ============================================
-- 2. APPLY STRATEGIST PRICING + LIMITS (Decisions #1 + #3)
-- ============================================
-- Stripe price IDs are intentionally NOT updated here — Decision #3
-- says JB regenerates them manually in Stripe and updates via the
-- existing tier admin UI to avoid Stripe price desync.

UPDATE subscription_tiers
SET
    price_monthly = 49.00,
    price_yearly = 490.00,
    max_members = 3,
    max_clients = 0,
    max_agents = 5,
    max_workflows = 0,
    max_skills = 10,
    max_context_assets = 25,
    max_research_studios = 0,
    max_monthly_api_calls = 500,
    max_storage_gb = 1.0,
    description = 'For individuals and small teams. Multi-LLM chat, agent management, and context assets. 3 members, 5 agents.',
    is_public = TRUE,
    updated_at = NOW()
WHERE id = 'starter';

UPDATE subscription_tiers
SET
    price_monthly = 249.00,
    price_yearly = 2490.00,
    max_members = 10,
    max_clients = 0,
    max_agents = 25,
    max_workflows = 15,
    max_skills = 50,
    max_context_assets = 150,
    max_research_studios = 5,
    max_monthly_api_calls = 3000,
    max_storage_gb = 10.0,
    description = 'For growing teams. Full strategy pipeline (Align120 → Strategy120 → Execute120), Research Studio, Thought Leadership, Soul Configuration, and Workflows. 10 members, 25 agents.',
    is_public = TRUE,
    is_featured = TRUE,
    updated_at = NOW()
WHERE id = 'business';

UPDATE subscription_tiers
SET
    price_monthly = 799.00,
    price_yearly = 7990.00,
    max_members = 100,
    max_clients = 0,
    max_agents = 100,
    max_workflows = 50,
    max_skills = 200,
    max_context_assets = 500,
    max_research_studios = 20,
    max_monthly_api_calls = 15000,
    max_storage_gb = 100.0,
    description = 'For large organizations. SSO, advanced governance, values alignment audit, department-level Soul Configuration, priority support. 100 members, 100 agents.',
    is_public = TRUE,
    updated_at = NOW()
WHERE id = 'enterprise';

-- Ensure the 'platform' (Synergi internal) tier stays out of the public sync
UPDATE subscription_tiers
SET is_public = FALSE
WHERE id = 'platform';


-- ============================================
-- 3. BACKFILL tier_module_access FROM LEGACY FIELDS
-- ============================================
-- For every (active customer tier × active module), derive access_type:
--   - 'core'     if module.min_tier is NULL OR tier.display_order >=
--                  display_order of module.min_tier
--   - 'optional' if module.is_addon_purchasable AND tier doesn't get core
--   - 'none'     otherwise
--
-- This preserves current behavior as the floor. Strategist-specific
-- overrides apply in section 4 below.

INSERT INTO tier_module_access (
    tier_id, module_id, access_type,
    addon_price_monthly, addon_price_yearly, addon_description
)
SELECT
    t.id AS tier_id,
    m.id AS module_id,
    CASE
        WHEN m.min_tier IS NULL THEN 'core'
        WHEN t.display_order >= COALESCE(
            (SELECT display_order FROM subscription_tiers WHERE id = m.min_tier),
            999
        ) THEN 'core'
        WHEN m.is_addon_purchasable = TRUE THEN 'optional'
        ELSE 'none'
    END AS access_type,
    CASE
        WHEN (m.min_tier IS NULL OR t.display_order >= COALESCE(
            (SELECT display_order FROM subscription_tiers WHERE id = m.min_tier), 999
        )) THEN NULL
        WHEN m.is_addon_purchasable = TRUE THEN m.addon_price_monthly
        ELSE NULL
    END AS addon_price_monthly,
    CASE
        WHEN (m.min_tier IS NULL OR t.display_order >= COALESCE(
            (SELECT display_order FROM subscription_tiers WHERE id = m.min_tier), 999
        )) THEN NULL
        WHEN m.is_addon_purchasable = TRUE THEN m.addon_price_yearly
        ELSE NULL
    END AS addon_price_yearly,
    CASE
        WHEN (m.min_tier IS NULL OR t.display_order >= COALESCE(
            (SELECT display_order FROM subscription_tiers WHERE id = m.min_tier), 999
        )) THEN NULL
        WHEN m.is_addon_purchasable = TRUE THEN m.addon_description
        ELSE NULL
    END AS addon_description
FROM subscription_tiers t
CROSS JOIN platform_modules m
WHERE t.id IN ('starter', 'business', 'enterprise', 'agency')
ON CONFLICT (tier_id, module_id) DO NOTHING;


-- ============================================
-- 4. STRATEGIST MATRIX OVERRIDES (named modules only)
-- ============================================
-- Targeted UPDATEs for cells where the strategist's recommendation
-- differs from the backfill. Modules not listed here keep their
-- backfill-derived access. After this seed, JB can fine-tune any
-- cell via the admin UI matrix editor.
--
-- Helper note: UPDATEs that change access_type from 'core' or 'none'
-- to 'optional' MUST set addon_price_monthly (constraint enforces).
-- UPDATEs that change to 'core' or 'none' MUST null out price columns.

-- Thought Leadership: Optional+$39 at Starter, Core at Business+
UPDATE tier_module_access
SET access_type = 'optional', addon_price_monthly = 39.00, addon_price_yearly = 390.00,
    addon_description = 'Thought Leadership content engine — 4 articles/mo'
WHERE tier_id = 'starter' AND module_id = 'thought_leadership';

UPDATE tier_module_access
SET access_type = 'core', addon_price_monthly = NULL, addon_price_yearly = NULL, addon_description = NULL
WHERE tier_id IN ('business','enterprise','agency') AND module_id = 'thought_leadership';

-- Research Studio: None at Starter, Core at Business+
UPDATE tier_module_access
SET access_type = 'none', addon_price_monthly = NULL, addon_price_yearly = NULL, addon_description = NULL
WHERE tier_id = 'starter' AND module_id = 'research_studio';

UPDATE tier_module_access
SET access_type = 'core', addon_price_monthly = NULL, addon_price_yearly = NULL, addon_description = NULL
WHERE tier_id IN ('business','enterprise','agency') AND module_id = 'research_studio';

-- Strategy triad (Align120 / Strategy120 / Execute120 / S2E): None at Starter, Core at Business+
UPDATE tier_module_access
SET access_type = 'none', addon_price_monthly = NULL, addon_price_yearly = NULL, addon_description = NULL
WHERE tier_id = 'starter' AND module_id IN ('align120','strategy120','execute120','s2e');

UPDATE tier_module_access
SET access_type = 'core', addon_price_monthly = NULL, addon_price_yearly = NULL, addon_description = NULL
WHERE tier_id IN ('business','enterprise','agency') AND module_id IN ('align120','strategy120','execute120','s2e');

-- Briefing: None at Starter, Core at Business+
UPDATE tier_module_access
SET access_type = 'none', addon_price_monthly = NULL, addon_price_yearly = NULL, addon_description = NULL
WHERE tier_id = 'starter' AND module_id = 'briefing';

UPDATE tier_module_access
SET access_type = 'core', addon_price_monthly = NULL, addon_price_yearly = NULL, addon_description = NULL
WHERE tier_id IN ('business','enterprise','agency') AND module_id = 'briefing';

-- Strategy Governance: None at Starter/Business, Core at Enterprise+
UPDATE tier_module_access
SET access_type = 'none', addon_price_monthly = NULL, addon_price_yearly = NULL, addon_description = NULL
WHERE tier_id IN ('starter','business') AND module_id = 'strategy_governance';

UPDATE tier_module_access
SET access_type = 'core', addon_price_monthly = NULL, addon_price_yearly = NULL, addon_description = NULL
WHERE tier_id IN ('enterprise','agency') AND module_id = 'strategy_governance';

-- Customer Support AI: Optional at all four tiers with different conversation caps
-- (Strategist matrix uses resource_overrides JSONB to express per-tier caps)
UPDATE tier_module_access
SET access_type = 'optional', addon_price_monthly = 49.00, addon_price_yearly = 490.00,
    addon_description = '500 conversations/mo',
    resource_overrides = '{"conversations_per_month": 500}'::jsonb
WHERE tier_id = 'starter' AND module_id = 'customer_support_ai';

UPDATE tier_module_access
SET access_type = 'optional', addon_price_monthly = 99.00, addon_price_yearly = 990.00,
    addon_description = '2,000 conversations/mo',
    resource_overrides = '{"conversations_per_month": 2000}'::jsonb
WHERE tier_id = 'business' AND module_id = 'customer_support_ai';

UPDATE tier_module_access
SET access_type = 'optional', addon_price_monthly = 199.00, addon_price_yearly = 1990.00,
    addon_description = 'Unlimited conversations',
    resource_overrides = '{"conversations_per_month": -1}'::jsonb
WHERE tier_id = 'enterprise' AND module_id = 'customer_support_ai';

UPDATE tier_module_access
SET access_type = 'optional', addon_price_monthly = 49.00, addon_price_yearly = 490.00,
    addon_description = '500 conversations/client/mo',
    resource_overrides = '{"conversations_per_client_per_month": 500}'::jsonb
WHERE tier_id = 'agency' AND module_id = 'customer_support_ai';

-- Workflows: None at Starter, Core at Business+
UPDATE tier_module_access
SET access_type = 'none', addon_price_monthly = NULL, addon_price_yearly = NULL, addon_description = NULL
WHERE tier_id = 'starter' AND module_id = 'workflows';

UPDATE tier_module_access
SET access_type = 'core', addon_price_monthly = NULL, addon_price_yearly = NULL, addon_description = NULL
WHERE tier_id IN ('business','enterprise','agency') AND module_id = 'workflows';

-- Soul Configuration: Org-level at Business, full hierarchy at Enterprise+
UPDATE tier_module_access
SET access_type = 'none', addon_price_monthly = NULL, addon_price_yearly = NULL, addon_description = NULL
WHERE tier_id = 'starter' AND module_id = 'soul_configuration';

UPDATE tier_module_access
SET access_type = 'core', addon_price_monthly = NULL, addon_price_yearly = NULL, addon_description = NULL
WHERE tier_id IN ('business','enterprise','agency') AND module_id = 'soul_configuration';

-- White-label features: Agency only
UPDATE tier_module_access
SET access_type = 'core', addon_price_monthly = NULL, addon_price_yearly = NULL, addon_description = NULL
WHERE tier_id = 'agency' AND module_id IN (
    'agency_dashboard','client_portal','agency_customization','client_comparison','clients_admin'
);

UPDATE tier_module_access
SET access_type = 'none', addon_price_monthly = NULL, addon_price_yearly = NULL, addon_description = NULL
WHERE tier_id IN ('starter','business','enterprise') AND module_id IN (
    'agency_dashboard','client_portal','agency_customization','client_comparison','clients_admin'
);

-- Department Strategy: Business+
UPDATE tier_module_access
SET access_type = 'none', addon_price_monthly = NULL, addon_price_yearly = NULL, addon_description = NULL
WHERE tier_id = 'starter' AND module_id = 'department_strategy';

UPDATE tier_module_access
SET access_type = 'core', addon_price_monthly = NULL, addon_price_yearly = NULL, addon_description = NULL
WHERE tier_id IN ('business','enterprise','agency') AND module_id = 'department_strategy';

-- Conversation Review: Business+
UPDATE tier_module_access
SET access_type = 'none', addon_price_monthly = NULL, addon_price_yearly = NULL, addon_description = NULL
WHERE tier_id = 'starter' AND module_id = 'conversation_review';

UPDATE tier_module_access
SET access_type = 'core', addon_price_monthly = NULL, addon_price_yearly = NULL, addon_description = NULL
WHERE tier_id IN ('business','enterprise','agency') AND module_id = 'conversation_review';


-- ============================================
-- 5. VERIFICATION (transactional — ROLLBACK on assertion failure)
-- ============================================
-- After the backfill+overrides, every (active customer tier × active
-- module) pair must have a row in tier_module_access. Anything else
-- indicates a backfill bug.

DO $$
DECLARE
    v_expected INT;
    v_actual   INT;
    v_active_tiers INT;
    v_active_modules INT;
BEGIN
    SELECT count(*) INTO v_active_tiers
    FROM subscription_tiers
    WHERE id IN ('starter','business','enterprise','agency');

    SELECT count(*) INTO v_active_modules
    FROM platform_modules;  -- includes inactive/deactivated; matrix is exhaustive

    v_expected := v_active_tiers * v_active_modules;

    SELECT count(*) INTO v_actual
    FROM tier_module_access
    WHERE tier_id IN ('starter','business','enterprise','agency');

    IF v_actual <> v_expected THEN
        RAISE EXCEPTION
            'tier_module_access row count mismatch: expected % (= % tiers × % modules), got %. ROLLING BACK.',
            v_expected, v_active_tiers, v_active_modules, v_actual;
    END IF;

    RAISE NOTICE 'tier_module_access backfill verified: % rows across % tiers × % modules.',
        v_actual, v_active_tiers, v_active_modules;
END $$;

-- Sanity-check: no constraint violations exist (the constraint should
-- have caught these mid-INSERT, but assert anyway).
DO $$
DECLARE
    v_bad INT;
BEGIN
    SELECT count(*) INTO v_bad
    FROM tier_module_access
    WHERE (access_type = 'optional' AND addon_price_monthly IS NULL)
       OR (access_type <> 'optional' AND addon_price_monthly IS NOT NULL);

    IF v_bad > 0 THEN
        RAISE EXCEPTION 'tier_module_access has % rows violating addon_price_only_when_optional. ROLLING BACK.', v_bad;
    END IF;
END $$;

COMMIT;


-- ============================================
-- POST-MIGRATION REVIEW QUERIES (run manually)
-- ============================================
-- 1. Inspect the matrix for the four customer tiers:
--    SELECT t.name, m.name, tma.access_type, tma.addon_price_monthly, tma.addon_description
--    FROM tier_module_access tma
--    JOIN subscription_tiers t ON t.id = tma.tier_id
--    JOIN platform_modules m ON m.id = tma.module_id
--    WHERE t.id IN ('starter','business','enterprise','agency')
--    ORDER BY t.display_order, m.display_order;
--
-- 2. Verify pricing updates landed:
--    SELECT id, name, price_monthly, price_yearly, is_public, is_featured
--    FROM subscription_tiers
--    WHERE is_active = TRUE
--    ORDER BY display_order;
--
-- 3. Verify Stripe IDs are NOT yet updated (per Decision #3):
--    SELECT id, price_monthly, stripe_price_id_monthly
--    FROM subscription_tiers
--    WHERE id IN ('starter','business','enterprise','agency');
--    -- Expect: prices new, stripe IDs old. JB regenerates Stripe Prices manually
--    -- and updates via admin UI before re-enabling new sign-ups.
--
-- 4. Verify no orgs orphaned by the agency collapse:
--    SELECT subscription_tier, count(*) FROM organizations GROUP BY subscription_tier;
--    -- All rows should be in: starter, business, enterprise, agency, platform
