-- ============================================
-- Insight 360 - Phase 26: Add Category to Asset Types
-- Version: 1.0
-- Date: January 2026
--
-- Purpose: Add category column to context_asset_types table
-- to support core/extended classification in the UI
-- ============================================

-- Add category column if it doesn't exist
ALTER TABLE context_asset_types
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'extended';

-- Add check constraint for valid categories
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'context_asset_types_category_check'
    ) THEN
        ALTER TABLE context_asset_types
        ADD CONSTRAINT context_asset_types_category_check
        CHECK (category IN ('core', 'extended'));
    END IF;
END $$;

-- Update existing core types with correct category
UPDATE context_asset_types
SET category = 'core'
WHERE type_key IN (
    'company_description',
    'why_we_win',
    'products',
    'pain_points',
    'voice_dna',
    'icp',
    'core_values',
    'custom_processes'
);

-- Update existing extended types with correct category
UPDATE context_asset_types
SET category = 'extended'
WHERE type_key IN (
    'competitors',
    'case_studies',
    'faqs',
    'team_bios',
    'industry_context',
    'terminology',
    'templates',
    'pricing',
    'brand_guidelines',
    'personas'
);

-- Add comment
COMMENT ON COLUMN context_asset_types.category IS 'Classification: core (essential) or extended (optional)';

-- Verification
DO $$
DECLARE
    core_count INTEGER;
    extended_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO core_count FROM context_asset_types WHERE category = 'core';
    SELECT COUNT(*) INTO extended_count FROM context_asset_types WHERE category = 'extended';
    RAISE NOTICE '✅ Category column added to context_asset_types';
    RAISE NOTICE '   Core types: %', core_count;
    RAISE NOTICE '   Extended types: %', extended_count;
END $$;
