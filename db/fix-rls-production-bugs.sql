-- ============================================
-- Insight 360 - Fix RLS Production Bugs
-- Date: January 10, 2026
-- Description: Fix RLS policies for departments and align120_sessions tables
--              to allow server-side operations via service role
-- ============================================

-- ============================================
-- FIX DEPARTMENTS TABLE RLS
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own departments" ON departments;
DROP POLICY IF EXISTS "Users can insert own departments" ON departments;
DROP POLICY IF EXISTS "Users can update own departments" ON departments;
DROP POLICY IF EXISTS "Users can delete own departments" ON departments;
DROP POLICY IF EXISTS "Allow service role full access to departments" ON departments;
DROP POLICY IF EXISTS "Users can view accessible departments" ON departments;
DROP POLICY IF EXISTS "Users can insert departments" ON departments;

-- Add is_seed column if it doesn't exist
ALTER TABLE departments
ADD COLUMN IF NOT EXISTS is_seed BOOLEAN DEFAULT false;

-- Service role has full access (for server-side operations)
CREATE POLICY "Allow service role full access to departments" ON departments
    FOR ALL USING (
        auth.role() = 'service_role'
    );

-- Users can view accessible departments
CREATE POLICY "Users can view accessible departments" ON departments
    FOR SELECT USING (
        auth.uid() = user_id
        OR is_seed = true
        OR user_id IS NULL
    );

-- Users can insert departments (including server operations with user_id)
CREATE POLICY "Users can insert departments" ON departments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR user_id IS NULL
        OR auth.role() = 'service_role'
    );

-- Users can update their own departments
CREATE POLICY "Users can update own departments" ON departments
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- Users can delete their own departments (not seeded ones)
CREATE POLICY "Users can delete own departments" ON departments
    FOR DELETE USING (
        auth.uid() = user_id
        AND (is_seed = false OR is_seed IS NULL)
    );

-- ============================================
-- FIX ALIGN120_SESSIONS TABLE RLS
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own align120_sessions" ON align120_sessions;
DROP POLICY IF EXISTS "Users can insert own align120_sessions" ON align120_sessions;
DROP POLICY IF EXISTS "Users can update own align120_sessions" ON align120_sessions;
DROP POLICY IF EXISTS "Users can delete own align120_sessions" ON align120_sessions;
DROP POLICY IF EXISTS "Allow service role full access to align120_sessions" ON align120_sessions;

-- Service role has full access (for server-side operations)
CREATE POLICY "Allow service role full access to align120_sessions" ON align120_sessions
    FOR ALL USING (
        auth.role() = 'service_role'
    );

-- Users can view their own sessions
CREATE POLICY "Users can view own align120_sessions" ON align120_sessions
    FOR SELECT USING (
        auth.uid() = user_id
    );

-- Users can insert their own sessions (server can insert on behalf of user)
CREATE POLICY "Users can insert own align120_sessions" ON align120_sessions
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR auth.role() = 'service_role'
    );

-- Users can update their own sessions
CREATE POLICY "Users can update own align120_sessions" ON align120_sessions
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- Users can delete their own sessions
CREATE POLICY "Users can delete own align120_sessions" ON align120_sessions
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- ============================================
-- FIX RELATED ALIGN120 TABLES
-- ============================================

-- Company Profiles
DROP POLICY IF EXISTS "Users can view own company_profiles" ON company_profiles;
DROP POLICY IF EXISTS "Users can insert own company_profiles" ON company_profiles;
DROP POLICY IF EXISTS "Users can update own company_profiles" ON company_profiles;
DROP POLICY IF EXISTS "Users can delete own company_profiles" ON company_profiles;
DROP POLICY IF EXISTS "Allow service role full access to company_profiles" ON company_profiles;

CREATE POLICY "Allow service role full access to company_profiles" ON company_profiles
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own company_profiles" ON company_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own company_profiles" ON company_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own company_profiles" ON company_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own company_profiles" ON company_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- AI Maturity Assessments
DROP POLICY IF EXISTS "Users can view own ai_maturity_assessments" ON ai_maturity_assessments;
DROP POLICY IF EXISTS "Users can insert own ai_maturity_assessments" ON ai_maturity_assessments;
DROP POLICY IF EXISTS "Users can update own ai_maturity_assessments" ON ai_maturity_assessments;
DROP POLICY IF EXISTS "Users can delete own ai_maturity_assessments" ON ai_maturity_assessments;
DROP POLICY IF EXISTS "Allow service role full access to ai_maturity_assessments" ON ai_maturity_assessments;

CREATE POLICY "Allow service role full access to ai_maturity_assessments" ON ai_maturity_assessments
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own ai_maturity_assessments" ON ai_maturity_assessments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai_maturity_assessments" ON ai_maturity_assessments
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own ai_maturity_assessments" ON ai_maturity_assessments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ai_maturity_assessments" ON ai_maturity_assessments
    FOR DELETE USING (auth.uid() = user_id);

-- Business Fundamentals
DROP POLICY IF EXISTS "Users can view own business_fundamentals" ON business_fundamentals;
DROP POLICY IF EXISTS "Users can insert own business_fundamentals" ON business_fundamentals;
DROP POLICY IF EXISTS "Users can update own business_fundamentals" ON business_fundamentals;
DROP POLICY IF EXISTS "Users can delete own business_fundamentals" ON business_fundamentals;
DROP POLICY IF EXISTS "Allow service role full access to business_fundamentals" ON business_fundamentals;

CREATE POLICY "Allow service role full access to business_fundamentals" ON business_fundamentals
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own business_fundamentals" ON business_fundamentals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own business_fundamentals" ON business_fundamentals
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own business_fundamentals" ON business_fundamentals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own business_fundamentals" ON business_fundamentals
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FIX S2E TABLES RLS
-- ============================================

-- Strategic Foundations
DROP POLICY IF EXISTS "Users can view own strategic_foundations" ON strategic_foundations;
DROP POLICY IF EXISTS "Users can insert own strategic_foundations" ON strategic_foundations;
DROP POLICY IF EXISTS "Users can update own strategic_foundations" ON strategic_foundations;
DROP POLICY IF EXISTS "Users can delete own strategic_foundations" ON strategic_foundations;
DROP POLICY IF EXISTS "Allow service role full access to strategic_foundations" ON strategic_foundations;

CREATE POLICY "Allow service role full access to strategic_foundations" ON strategic_foundations
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own strategic_foundations" ON strategic_foundations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strategic_foundations" ON strategic_foundations
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own strategic_foundations" ON strategic_foundations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strategic_foundations" ON strategic_foundations
    FOR DELETE USING (auth.uid() = user_id);

-- BSC Perspectives
DROP POLICY IF EXISTS "Users can view own bsc_perspectives" ON bsc_perspectives;
DROP POLICY IF EXISTS "Users can insert own bsc_perspectives" ON bsc_perspectives;
DROP POLICY IF EXISTS "Users can update own bsc_perspectives" ON bsc_perspectives;
DROP POLICY IF EXISTS "Users can delete own bsc_perspectives" ON bsc_perspectives;
DROP POLICY IF EXISTS "Allow service role full access to bsc_perspectives" ON bsc_perspectives;

CREATE POLICY "Allow service role full access to bsc_perspectives" ON bsc_perspectives
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own bsc_perspectives" ON bsc_perspectives
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bsc_perspectives" ON bsc_perspectives
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own bsc_perspectives" ON bsc_perspectives
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bsc_perspectives" ON bsc_perspectives
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- VERIFY CHANGES
-- ============================================

-- Show updated policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('departments', 'align120_sessions', 'company_profiles', 'ai_maturity_assessments', 'business_fundamentals', 'strategic_foundations', 'bsc_perspectives')
ORDER BY tablename, policyname;
