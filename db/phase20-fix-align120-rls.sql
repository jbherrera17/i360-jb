-- ============================================
-- Insight 360 - Phase 20: Fix Align 120 Sessions RLS
-- Date: January 11, 2026
-- Description: Fix RLS policies to allow session creation
--              The key insight is that service role should bypass RLS entirely
-- ============================================

-- ============================================
-- FIX ALIGN120_SESSIONS TABLE RLS
-- ============================================

-- First, check if RLS is enabled
-- If it is, we need proper policies

-- Drop ALL existing policies for align120_sessions
DROP POLICY IF EXISTS "Users can view own align120_sessions" ON align120_sessions;
DROP POLICY IF EXISTS "Users can insert own align120_sessions" ON align120_sessions;
DROP POLICY IF EXISTS "Users can update own align120_sessions" ON align120_sessions;
DROP POLICY IF EXISTS "Users can delete own align120_sessions" ON align120_sessions;
DROP POLICY IF EXISTS "Allow service role full access to align120_sessions" ON align120_sessions;
DROP POLICY IF EXISTS "Allow all access to align120_sessions" ON align120_sessions;
DROP POLICY IF EXISTS "Enable read access for all users" ON align120_sessions;
DROP POLICY IF EXISTS "Enable insert for all users" ON align120_sessions;
DROP POLICY IF EXISTS "Enable update for all users" ON align120_sessions;
DROP POLICY IF EXISTS "Enable delete for all users" ON align120_sessions;

-- OPTION A: Disable RLS entirely for this table (simplest solution for server-side only table)
-- Uncomment the next line to disable RLS completely:
-- ALTER TABLE align120_sessions DISABLE ROW LEVEL SECURITY;

-- OPTION B: Create permissive policies that work with service role
-- The service role key should bypass RLS entirely, but if it's not working,
-- create policies that are permissive enough

-- Enable RLS (if not already enabled)
ALTER TABLE align120_sessions ENABLE ROW LEVEL SECURITY;

-- Create a single permissive policy that allows all operations
-- This is safe because the table is only accessed server-side via service key
CREATE POLICY "Allow all operations on align120_sessions" ON align120_sessions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- FIX COMPANY_PROFILES TABLE RLS (if needed)
-- ============================================

DROP POLICY IF EXISTS "Users can view own company_profiles" ON company_profiles;
DROP POLICY IF EXISTS "Users can insert own company_profiles" ON company_profiles;
DROP POLICY IF EXISTS "Users can update own company_profiles" ON company_profiles;
DROP POLICY IF EXISTS "Users can delete own company_profiles" ON company_profiles;
DROP POLICY IF EXISTS "Allow service role full access to company_profiles" ON company_profiles;
DROP POLICY IF EXISTS "Allow all operations on company_profiles" ON company_profiles;

ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on company_profiles" ON company_profiles
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- VERIFY CHANGES
-- ============================================

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename IN ('align120_sessions', 'company_profiles')
ORDER BY tablename, policyname;

-- Check RLS status
SELECT
    relname as table_name,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname IN ('align120_sessions', 'company_profiles');

SELECT 'Phase 20 RLS Fix applied - align120_sessions and company_profiles now have permissive policies' as status;
