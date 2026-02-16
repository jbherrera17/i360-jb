-- ===========================================
-- PHASE 57b: Delete Legacy 'agency' Tier
-- ===========================================
-- Phase 55 already:
--   - Marked 'agency' as is_active=FALSE, tier_group='legacy'
--   - Migrated orgs to 'agency_starter'
--   - Updated platform_modules min_tier from 'agency' to 'agency_starter'
--
-- This migration completes the cleanup by:
--   1. Deleting the 'agency' row from subscription_tiers
--   2. Removing 'agency' from the organizations CHECK constraint

-- ============================================
-- 1. DELETE THE LEGACY TIER ROW
-- ============================================

DELETE FROM subscription_tiers WHERE id = 'agency';

-- ============================================
-- 2. UPDATE CHECK CONSTRAINT (remove 'agency')
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
    'agency_starter', 'agency_professional', 'agency_enterprise',
    'pro', 'platform'
));
