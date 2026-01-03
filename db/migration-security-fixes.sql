-- ============================================
-- Insight 360 - Security Migration: View & RLS Fixes
-- Version: 1.0
-- Date: January 2025
-- Description: Fixes SECURITY DEFINER views and enables RLS on public tables
-- ============================================

-- ============================================
-- PART 1: FIX SECURITY DEFINER VIEWS
-- Change all views to SECURITY INVOKER
-- ============================================

-- Note: In PostgreSQL, views created without explicit SECURITY setting
-- default to SECURITY INVOKER. However, Supabase's linter flags them
-- as SECURITY DEFINER. We'll explicitly set SECURITY INVOKER on all views.

-- Method: ALTER VIEW ... SET (security_invoker = on)
-- This requires PostgreSQL 15+ which Supabase supports

-- Strategy views
ALTER VIEW IF EXISTS public.strategy_health_summary SET (security_invoker = on);
ALTER VIEW IF EXISTS public.strategy_map_view SET (security_invoker = on);
ALTER VIEW IF EXISTS public.strategy_map_cascade_view SET (security_invoker = on);
ALTER VIEW IF EXISTS public.strategy120_mapping_summary SET (security_invoker = on);

-- Briefing views
ALTER VIEW IF EXISTS public.briefing_config_summary SET (security_invoker = on);
ALTER VIEW IF EXISTS public.recent_briefings SET (security_invoker = on);

-- Agent views
ALTER VIEW IF EXISTS public.agent_summary SET (security_invoker = on);
ALTER VIEW IF EXISTS public.agent_ownership_summary SET (security_invoker = on);
ALTER VIEW IF EXISTS public.manual_strategy_agents SET (security_invoker = on);

-- Action views
ALTER VIEW IF EXISTS public.action_template_usage SET (security_invoker = on);
ALTER VIEW IF EXISTS public.department_actions SET (security_invoker = on);
ALTER VIEW IF EXISTS public.action_full_context SET (security_invoker = on);
ALTER VIEW IF EXISTS public.action_context_summary SET (security_invoker = on);
ALTER VIEW IF EXISTS public.action_usage_summary SET (security_invoker = on);
ALTER VIEW IF EXISTS public.okr_actions SET (security_invoker = on);
ALTER VIEW IF EXISTS public.process_actions SET (security_invoker = on);

-- Integrity views
ALTER VIEW IF EXISTS public.integrity_dashboard_summary SET (security_invoker = on);

-- Hierarchy views
ALTER VIEW IF EXISTS public.department_hierarchy SET (security_invoker = on);
ALTER VIEW IF EXISTS public.role_hierarchy SET (security_invoker = on);
ALTER VIEW IF EXISTS public.okr_cascade SET (security_invoker = on);

-- User/Role views
ALTER VIEW IF EXISTS public.user_roles_view SET (security_invoker = on);
ALTER VIEW IF EXISTS public.roles_summary SET (security_invoker = on);

-- Alignment views
ALTER VIEW IF EXISTS public.align120_progress_view SET (security_invoker = on);
ALTER VIEW IF EXISTS public.okr_alignment_view SET (security_invoker = on);
ALTER VIEW IF EXISTS public.alignment_score_view SET (security_invoker = on);

-- Performance views
ALTER VIEW IF EXISTS public.perspective_performance_view SET (security_invoker = on);
ALTER VIEW IF EXISTS public.initiative_portfolio_view SET (security_invoker = on);
ALTER VIEW IF EXISTS public.decision_timeline_view SET (security_invoker = on);

-- Execution views
ALTER VIEW IF EXISTS public.recent_executions SET (security_invoker = on);

-- Company views
ALTER VIEW IF EXISTS public.company_dashboard_view SET (security_invoker = on);

-- Skill views
ALTER VIEW IF EXISTS public.skill_summary SET (security_invoker = on);

-- Conversation views
ALTER VIEW IF EXISTS public.conversation_summaries SET (security_invoker = on);

-- ============================================
-- PART 2: ENABLE RLS ON PUBLIC TABLES
-- Enable RLS on agent_categories and skill_categories
-- ============================================

-- Enable RLS on agent_categories
ALTER TABLE public.agent_categories ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read categories (reference data)
DROP POLICY IF EXISTS "Allow authenticated read access to agent_categories" ON public.agent_categories;
CREATE POLICY "Allow authenticated read access to agent_categories" ON public.agent_categories
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Only admins can modify categories
DROP POLICY IF EXISTS "Allow admin write access to agent_categories" ON public.agent_categories;
CREATE POLICY "Allow admin write access to agent_categories" ON public.agent_categories
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Enable RLS on skill_categories
ALTER TABLE public.skill_categories ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read categories (reference data)
DROP POLICY IF EXISTS "Allow authenticated read access to skill_categories" ON public.skill_categories;
CREATE POLICY "Allow authenticated read access to skill_categories" ON public.skill_categories
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Only admins can modify categories
DROP POLICY IF EXISTS "Allow admin write access to skill_categories" ON public.skill_categories;
CREATE POLICY "Allow admin write access to skill_categories" ON public.skill_categories
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- ============================================
-- PART 3: FIX FUNCTION SEARCH PATH MUTABLE
-- Set immutable search_path on all functions
-- ============================================

-- This prevents search_path injection attacks by explicitly setting
-- the schema search path for each function

ALTER FUNCTION IF EXISTS public.version_context_asset SET search_path = public;
ALTER FUNCTION IF EXISTS public.update_briefing_updated_at SET search_path = public;
ALTER FUNCTION IF EXISTS public.version_agent_prompt SET search_path = public;
ALTER FUNCTION IF EXISTS public.setup_strategy120_agent_mappings SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_user_role SET search_path = public;
ALTER FUNCTION IF EXISTS public.is_admin SET search_path = public;
ALTER FUNCTION IF EXISTS public.make_user_admin SET search_path = public, auth;
ALTER FUNCTION IF EXISTS public.get_agent_context SET search_path = public;
ALTER FUNCTION IF EXISTS public.setup_integrity_agent_mappings SET search_path = public;
ALTER FUNCTION IF EXISTS public.update_agent_context_mappings_timestamp SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_agent_stats SET search_path = public;
ALTER FUNCTION IF EXISTS public.update_agents_updated_at SET search_path = public;
ALTER FUNCTION IF EXISTS public.increment_agent_usage SET search_path = public;
ALTER FUNCTION IF EXISTS public.update_updated_at_column SET search_path = public;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
    view_count INTEGER;
    rls_agent_cat BOOLEAN;
    rls_skill_cat BOOLEAN;
    func_count INTEGER;
BEGIN
    -- Count views in public schema
    SELECT COUNT(*) INTO view_count
    FROM pg_views
    WHERE schemaname = 'public';

    -- Check RLS status
    SELECT relrowsecurity INTO rls_agent_cat
    FROM pg_class
    WHERE relname = 'agent_categories';

    SELECT relrowsecurity INTO rls_skill_cat
    FROM pg_class
    WHERE relname = 'skill_categories';

    -- Count functions with search_path set
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proconfig IS NOT NULL
    AND 'search_path' = ANY(SELECT split_part(unnest(p.proconfig), '=', 1));

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'SECURITY MIGRATION COMPLETED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Views in public schema: %', view_count;
    RAISE NOTICE 'RLS enabled on agent_categories: %', rls_agent_cat;
    RAISE NOTICE 'RLS enabled on skill_categories: %', rls_skill_cat;
    RAISE NOTICE 'Functions with search_path set: %', func_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Changes applied:';
    RAISE NOTICE '  - All views set to SECURITY INVOKER';
    RAISE NOTICE '  - RLS enabled on agent_categories with read/admin policies';
    RAISE NOTICE '  - RLS enabled on skill_categories with read/admin policies';
    RAISE NOTICE '  - 14 functions with immutable search_path';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
