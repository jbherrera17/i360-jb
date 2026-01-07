-- ============================================
-- Insight 360 - Phase 17: Align 120 Module Results
-- Version: 1.0
-- Date: January 2026
-- Description: Add module_results column to store agent execution results
-- ============================================

-- ============================================
-- ADD module_results COLUMN
-- Stores the actual results from agent executions per module
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'align120_sessions'
        AND column_name = 'module_results'
    ) THEN
        ALTER TABLE align120_sessions ADD COLUMN module_results JSONB DEFAULT '{}'::jsonb;

        COMMENT ON COLUMN align120_sessions.module_results IS 'Stores agent execution results per module: {1: {completed_at, agents_run, results: [{agent_id, agent_name, response, execution_id}]}, ...}';

        RAISE NOTICE 'Added module_results column to align120_sessions';
    ELSE
        RAISE NOTICE 'module_results column already exists';
    END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'align120_sessions'
        AND column_name = 'module_results'
    ) INTO col_exists;

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'PHASE 17: ALIGN 120 MODULE RESULTS';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'module_results column: %', CASE WHEN col_exists THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
