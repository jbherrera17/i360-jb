-- ============================================
-- Insight 360 - Phase 3.2: Fix All RLS Production Bugs
-- Version: 3.2
-- Date: January 10, 2026
-- Description: Comprehensive RLS policy fixes for all tables
--              experiencing RLS violations in production
-- ============================================

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
-- FIX COMPANY_PROFILES TABLE RLS
-- ============================================

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

-- ============================================
-- FIX AI_MATURITY_ASSESSMENTS TABLE RLS
-- ============================================

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

-- ============================================
-- FIX BUSINESS_FUNDAMENTALS TABLE RLS
-- ============================================

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
-- FIX STRATEGIC_FOUNDATIONS TABLE RLS
-- ============================================

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

-- ============================================
-- FIX BSC_PERSPECTIVES TABLE RLS
-- ============================================

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
-- FIX CONTEXT_ASSETS TABLE RLS
-- ============================================

DROP POLICY IF EXISTS "Users can view own context_assets" ON context_assets;
DROP POLICY IF EXISTS "Users can insert own context_assets" ON context_assets;
DROP POLICY IF EXISTS "Users can update own context_assets" ON context_assets;
DROP POLICY IF EXISTS "Users can delete own context_assets" ON context_assets;
DROP POLICY IF EXISTS "Allow service role full access to context_assets" ON context_assets;
DROP POLICY IF EXISTS "Users can view accessible context_assets" ON context_assets;
DROP POLICY IF EXISTS "Users can insert context_assets" ON context_assets;

-- Service role has full access
CREATE POLICY "Allow service role full access to context_assets" ON context_assets
    FOR ALL USING (auth.role() = 'service_role');

-- Users can view their own assets or shared ones
CREATE POLICY "Users can view accessible context_assets" ON context_assets
    FOR SELECT USING (
        auth.uid() = user_id
        OR visibility = 'public'
        OR (visibility = 'department' AND department_id IN (
            SELECT id FROM departments WHERE user_id = auth.uid()
        ))
    );

-- Users can insert assets
CREATE POLICY "Users can insert context_assets" ON context_assets
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR auth.role() = 'service_role'
    );

-- Users can update their own assets
CREATE POLICY "Users can update own context_assets" ON context_assets
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own assets
CREATE POLICY "Users can delete own context_assets" ON context_assets
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FIX TEAM_READINESS_ASSESSMENTS TABLE RLS
-- ============================================

DROP POLICY IF EXISTS "Users can view own team_readiness_assessments" ON team_readiness_assessments;
DROP POLICY IF EXISTS "Users can insert own team_readiness_assessments" ON team_readiness_assessments;
DROP POLICY IF EXISTS "Users can update own team_readiness_assessments" ON team_readiness_assessments;
DROP POLICY IF EXISTS "Users can delete own team_readiness_assessments" ON team_readiness_assessments;
DROP POLICY IF EXISTS "Allow service role full access to team_readiness_assessments" ON team_readiness_assessments;

CREATE POLICY "Allow service role full access to team_readiness_assessments" ON team_readiness_assessments
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own team_readiness_assessments" ON team_readiness_assessments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own team_readiness_assessments" ON team_readiness_assessments
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own team_readiness_assessments" ON team_readiness_assessments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own team_readiness_assessments" ON team_readiness_assessments
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FIX BRAND_ALIGNMENT_ASSESSMENTS TABLE RLS
-- ============================================

DROP POLICY IF EXISTS "Users can view own brand_alignment_assessments" ON brand_alignment_assessments;
DROP POLICY IF EXISTS "Users can insert own brand_alignment_assessments" ON brand_alignment_assessments;
DROP POLICY IF EXISTS "Users can update own brand_alignment_assessments" ON brand_alignment_assessments;
DROP POLICY IF EXISTS "Users can delete own brand_alignment_assessments" ON brand_alignment_assessments;
DROP POLICY IF EXISTS "Allow service role full access to brand_alignment_assessments" ON brand_alignment_assessments;

CREATE POLICY "Allow service role full access to brand_alignment_assessments" ON brand_alignment_assessments
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own brand_alignment_assessments" ON brand_alignment_assessments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brand_alignment_assessments" ON brand_alignment_assessments
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own brand_alignment_assessments" ON brand_alignment_assessments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own brand_alignment_assessments" ON brand_alignment_assessments
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FIX CORPORATE_ALIGNMENTS TABLE RLS
-- ============================================

DROP POLICY IF EXISTS "Users can view own corporate_alignments" ON corporate_alignments;
DROP POLICY IF EXISTS "Users can insert own corporate_alignments" ON corporate_alignments;
DROP POLICY IF EXISTS "Users can update own corporate_alignments" ON corporate_alignments;
DROP POLICY IF EXISTS "Users can delete own corporate_alignments" ON corporate_alignments;
DROP POLICY IF EXISTS "Allow service role full access to corporate_alignments" ON corporate_alignments;

CREATE POLICY "Allow service role full access to corporate_alignments" ON corporate_alignments
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own corporate_alignments" ON corporate_alignments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own corporate_alignments" ON corporate_alignments
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own corporate_alignments" ON corporate_alignments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own corporate_alignments" ON corporate_alignments
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FIX CONVERSATIONS TABLE RLS
-- ============================================

DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
DROP POLICY IF EXISTS "Allow service role full access to conversations" ON conversations;

CREATE POLICY "Allow service role full access to conversations" ON conversations
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own conversations" ON conversations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON conversations
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- VERIFY CHANGES
-- ============================================

-- Show all updated policies
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE tablename IN (
    'align120_sessions',
    'company_profiles',
    'ai_maturity_assessments',
    'business_fundamentals',
    'strategic_foundations',
    'bsc_perspectives',
    'context_assets',
    'team_readiness_assessments',
    'brand_alignment_assessments',
    'corporate_alignments',
    'conversations'
)
ORDER BY tablename, policyname;
