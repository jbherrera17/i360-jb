-- ============================================
-- Phase 87d: Reactivate Phase 86 Deactivated Modules (REQ-003)
-- ============================================
-- Phase 86 set is_active=FALSE on a set of candidate modules ahead
-- of MVP cuts. Some of those candidate IDs may not exist in the
-- platform_modules table (Phase 86's UPDATEs were no-ops for those).
-- This migration:
--   1. Discovers which candidates actually exist in the DB
--   2. Reactivates only the ones that exist
--   3. Verifies tier_module_access has rows for the existing ones
--   4. RAISEs NOTICEs (not exceptions) for any candidates that don't
--      exist — those need follow-up via the admin UI module catalog
--
-- Candidate modules:
--   - align120, execute120, s2e, strategy_governance  (strategy triad + governance)
--   - thought_leadership                              (Optional@Starter, Core@Business+)
--   - research_studio                                 (None@Starter, Core@Business+)
--   - briefing                                        (None@Starter, Core@Business+)
--   - ai_digest                                       (preserves prior tier gating)
--   - social_publishing                               (preserves prior tier gating)
--
-- Intentionally NOT in candidate list:
--   - prompt_transformer  (Phase 86 noted "page doesn't exist" — keeps off)
--
-- Run AFTER: phase87c-tier-marketing-copy-seed.sql
--
-- Source: REQ-003-tier-config-overhaul.md
-- ============================================

BEGIN;

-- ============================================
-- 1. DISCOVER + REACTIVATE EXISTING MODULES
-- ============================================
-- The UPDATE is naturally a no-op for non-existent IDs, so this is safe.
-- The DO block below reports which IDs landed and which were skipped.

UPDATE platform_modules
SET is_active = TRUE
WHERE id IN (
    'align120', 'execute120', 's2e', 'strategy_governance',
    'thought_leadership', 'research_studio', 'briefing',
    'ai_digest', 'social_publishing'
);

DO $$
DECLARE
    v_candidates TEXT[] := ARRAY[
        'align120','execute120','s2e','strategy_governance',
        'thought_leadership','research_studio','briefing','ai_digest','social_publishing'
    ];
    v_existing  TEXT[];
    v_missing   TEXT[];
BEGIN
    -- Which candidates exist in platform_modules
    SELECT array_agg(id ORDER BY id) INTO v_existing
    FROM platform_modules
    WHERE id = ANY(v_candidates);

    -- Which candidates do NOT exist (set difference)
    SELECT array_agg(c ORDER BY c) INTO v_missing
    FROM unnest(v_candidates) AS c
    WHERE c NOT IN (SELECT id FROM platform_modules WHERE id = ANY(v_candidates));

    RAISE NOTICE 'Reactivated % existing modules: %',
        COALESCE(array_length(v_existing, 1), 0),
        COALESCE(array_to_string(v_existing, ', '), '(none)');

    IF v_missing IS NOT NULL AND array_length(v_missing, 1) > 0 THEN
        RAISE NOTICE 'Skipped % candidate IDs not present in platform_modules: %',
            array_length(v_missing, 1),
            array_to_string(v_missing, ', ');
        RAISE NOTICE 'These need to be created via the admin UI module catalog or a follow-up migration.';
    END IF;
END $$;


-- ============================================
-- 2. VERIFY tier_module_access COVERAGE FOR EXISTING MODULES ONLY
-- ============================================
-- For modules that DO exist, every customer tier must have a row.
-- (For modules that don't exist, there's nothing to verify.)

DO $$
DECLARE
    v_candidates TEXT[] := ARRAY[
        'align120','execute120','s2e','strategy_governance',
        'thought_leadership','research_studio','briefing','ai_digest','social_publishing'
    ];
    v_existing      TEXT[];
    v_missing_pairs INT;
BEGIN
    SELECT array_agg(id) INTO v_existing
    FROM platform_modules
    WHERE id = ANY(v_candidates);

    IF v_existing IS NULL THEN
        RAISE NOTICE 'No reactivation candidates exist in platform_modules. Nothing to verify.';
        RETURN;
    END IF;

    -- Count tier × existing-module pairs that are missing from tier_module_access
    SELECT count(*) INTO v_missing_pairs
    FROM (
        SELECT t.id AS tier_id, m_id AS module_id
        FROM subscription_tiers t
        CROSS JOIN unnest(v_existing) AS m_id
        WHERE t.id IN ('starter','business','enterprise','agency')
        EXCEPT
        SELECT tier_id, module_id
        FROM tier_module_access
        WHERE module_id = ANY(v_existing)
    ) missing;

    IF v_missing_pairs > 0 THEN
        RAISE EXCEPTION
            'Existing reactivated modules missing tier_module_access rows for % tier/module pairs. Re-run phase87b. ROLLING BACK.',
            v_missing_pairs;
    END IF;

    RAISE NOTICE 'Verified % existing modules have tier_module_access rows for all 4 customer tiers.',
        array_length(v_existing, 1);
END $$;

COMMIT;


-- ============================================
-- POST-MIGRATION REVIEW QUERIES
-- ============================================
-- 1. See which candidate modules actually exist and their access by tier:
--
--    SELECT m.id AS module, m.is_active,
--           MAX(CASE WHEN tma.tier_id = 'starter'    THEN tma.access_type END) AS starter,
--           MAX(CASE WHEN tma.tier_id = 'business'   THEN tma.access_type END) AS business,
--           MAX(CASE WHEN tma.tier_id = 'enterprise' THEN tma.access_type END) AS enterprise,
--           MAX(CASE WHEN tma.tier_id = 'agency'     THEN tma.access_type END) AS agency
--    FROM platform_modules m
--    LEFT JOIN tier_module_access tma ON tma.module_id = m.id
--    WHERE m.id IN (
--        'align120','execute120','s2e','strategy_governance',
--        'thought_leadership','research_studio','briefing','ai_digest','social_publishing'
--    )
--    GROUP BY m.id, m.is_active
--    ORDER BY m.id;
--
-- 2. Identify candidate IDs that don't exist (need creation):
--
--    SELECT c FROM unnest(ARRAY[
--        'align120','execute120','s2e','strategy_governance',
--        'thought_leadership','research_studio','briefing','ai_digest','social_publishing'
--    ]) AS c
--    WHERE c NOT IN (SELECT id FROM platform_modules);
