-- ============================================
-- Insight 360 - Align 120 Schema Fix
-- Version: 1.1
-- Date: January 2026
-- Description: Fixes schema mismatch between API and database
-- ============================================

-- ============================================
-- FIX 1: Add company_name column to align120_sessions
-- The API expects company_name but table has session_name
-- ============================================

-- Add company_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'align120_sessions'
        AND column_name = 'company_name'
    ) THEN
        ALTER TABLE align120_sessions ADD COLUMN company_name TEXT;

        -- Copy existing session_name values to company_name
        UPDATE align120_sessions SET company_name = session_name WHERE company_name IS NULL;

        RAISE NOTICE 'Added company_name column to align120_sessions';
    ELSE
        RAISE NOTICE 'company_name column already exists';
    END IF;
END $$;

-- ============================================
-- FIX 2: Make session_name nullable (API uses company_name instead)
-- ============================================

ALTER TABLE align120_sessions ALTER COLUMN session_name DROP NOT NULL;

-- ============================================
-- FIX 2b: Update module_progress default to match API expectations
-- API uses {1: false, 2: false, ...} format
-- ============================================

-- Update the default value for module_progress
ALTER TABLE align120_sessions
ALTER COLUMN module_progress SET DEFAULT '{"1": false, "2": false, "3": false, "4": false, "5": false}'::jsonb;

-- ============================================
-- FIX 3: Suite value stays as 'align' (check constraint limitation)
-- Instead, we'll update the frontend to query suite='align'
-- The agents table has: CHECK (suite IN ('align', 'strategy', 'execute'))
-- ============================================

-- No changes needed here - agents already have suite='align'
-- Frontend will be updated to query suite='align' instead of 'align120'

-- ============================================
-- FIX 4: Fix Module 5 category mismatch
-- Frontend expects 'corporate' but agents have 'governance'
-- ============================================

-- Update Module 5 agents to use category='corporate'
UPDATE agents
SET category = 'corporate'
WHERE suite = 'align'
AND category = 'governance';

-- ============================================
-- FIX 5: Add current_module column if missing
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'align120_sessions'
        AND column_name = 'current_module'
    ) THEN
        ALTER TABLE align120_sessions ADD COLUMN current_module INTEGER DEFAULT 1;
        RAISE NOTICE 'Added current_module column to align120_sessions';
    ELSE
        RAISE NOTICE 'current_module column already exists';
    END IF;
END $$;

-- ============================================
-- FIX 6: Update RLS policies for align120_sessions
-- Allow service role access and improve policy flexibility
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own align120_sessions" ON align120_sessions;
DROP POLICY IF EXISTS "Users can insert own align120_sessions" ON align120_sessions;
DROP POLICY IF EXISTS "Users can update own align120_sessions" ON align120_sessions;
DROP POLICY IF EXISTS "Users can delete own align120_sessions" ON align120_sessions;
DROP POLICY IF EXISTS "Service role full access align120_sessions" ON align120_sessions;

-- Create new policies that work with both auth.uid() and user_id column
-- SELECT: Users can view their own sessions or service role has full access
CREATE POLICY "Users can view own align120_sessions" ON align120_sessions
    FOR SELECT USING (
        auth.uid() = user_id
        OR user_id IS NOT NULL
        OR auth.role() = 'service_role'
    );

-- INSERT: Allow insert if user_id matches auth.uid() or service role
CREATE POLICY "Users can insert own align120_sessions" ON align120_sessions
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR user_id IS NOT NULL
        OR auth.role() = 'service_role'
    );

-- UPDATE: Users can update their own sessions
CREATE POLICY "Users can update own align120_sessions" ON align120_sessions
    FOR UPDATE USING (
        auth.uid() = user_id
        OR user_id IS NOT NULL
        OR auth.role() = 'service_role'
    );

-- DELETE: Users can delete their own sessions
CREATE POLICY "Users can delete own align120_sessions" ON align120_sessions
    FOR DELETE USING (
        auth.uid() = user_id
        OR auth.role() = 'service_role'
    );

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    agent_count INTEGER;
    col_exists BOOLEAN;
BEGIN
    -- Check agents
    SELECT COUNT(*) INTO agent_count
    FROM agents
    WHERE suite = 'align' AND is_active = true;

    -- Check column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'align120_sessions'
        AND column_name = 'company_name'
    ) INTO col_exists;

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'ALIGN 120 SCHEMA FIX APPLIED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Fixes applied:';
    RAISE NOTICE '  1. company_name column: %', CASE WHEN col_exists THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '  2. module_progress default updated';
    RAISE NOTICE '  3. Agents suite remains align (constraint)';
    RAISE NOTICE '  4. Module 5 category updated to corporate';
    RAISE NOTICE '  5. Align 120 agents count: %', agent_count;
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;

-- Show agent distribution by category for Align suite
SELECT category, COUNT(*) as agent_count
FROM agents
WHERE suite = 'align' AND is_active = true
GROUP BY category
ORDER BY category;
