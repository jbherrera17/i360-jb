-- ============================================
-- Insight 360 - Phase 28: Add align120_completed and final report columns
-- Version: 1.1
-- Date: January 2026
-- Description: Adds missing columns for Align 120 completion and final reports
-- ============================================

-- Add align120_completed column to company_profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'company_profiles'
        AND column_name = 'align120_completed'
    ) THEN
        ALTER TABLE company_profiles
        ADD COLUMN align120_completed BOOLEAN DEFAULT false;

        RAISE NOTICE 'Added align120_completed column to company_profiles';
    ELSE
        RAISE NOTICE 'Column align120_completed already exists';
    END IF;
END $$;

-- Add index for the new column
CREATE INDEX IF NOT EXISTS idx_company_profiles_align120_completed
ON company_profiles(align120_completed);

-- Add final_report column to align120_sessions if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'align120_sessions'
        AND column_name = 'final_report'
    ) THEN
        ALTER TABLE align120_sessions
        ADD COLUMN final_report TEXT;

        RAISE NOTICE 'Added final_report column to align120_sessions';
    ELSE
        RAISE NOTICE 'Column final_report already exists';
    END IF;
END $$;

-- Add final_report_conversation column to align120_sessions if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'align120_sessions'
        AND column_name = 'final_report_conversation'
    ) THEN
        ALTER TABLE align120_sessions
        ADD COLUMN final_report_conversation JSONB;

        RAISE NOTICE 'Added final_report_conversation column to align120_sessions';
    ELSE
        RAISE NOTICE 'Column final_report_conversation already exists';
    END IF;
END $$;

-- Verification
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'PHASE 28: ALIGN120 SCHEMA UPDATES COMPLETE';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Columns added:';
    RAISE NOTICE '  - company_profiles.align120_completed';
    RAISE NOTICE '  - align120_sessions.final_report';
    RAISE NOTICE '  - align120_sessions.final_report_conversation';
    RAISE NOTICE '';
END $$;
