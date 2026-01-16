-- ============================================================
-- INSIGHT 360 - Phase 27: Complete Security Fixes
-- Version: 1.0
-- Date: January 2025
-- Description: Fixes all Supabase linter security warnings:
--   - 14 SECURITY DEFINER views → SECURITY INVOKER
--   - 13 tables without RLS → Enable RLS + policies
--   - 1 sensitive column exposure → covered by RLS
-- ============================================================

-- ============================================================
-- PART 1: FIX SECURITY DEFINER VIEWS (14 views)
-- Change all views to SECURITY INVOKER using PostgreSQL 15+ syntax
-- ============================================================

-- Views flagged by linter (not covered in previous migration)
ALTER VIEW IF EXISTS public.department_strategy_summary SET (security_invoker = on);
ALTER VIEW IF EXISTS public.integrity_active_incidents SET (security_invoker = on);
ALTER VIEW IF EXISTS public.weekly_content_summary SET (security_invoker = on);
ALTER VIEW IF EXISTS public.workflow_execution_progress SET (security_invoker = on);
ALTER VIEW IF EXISTS public.user_matched_workflows SET (security_invoker = on);
ALTER VIEW IF EXISTS public.user_matched_agents SET (security_invoker = on);
ALTER VIEW IF EXISTS public.pillar_content_distribution SET (security_invoker = on);
ALTER VIEW IF EXISTS public.workflow_full SET (security_invoker = on);
ALTER VIEW IF EXISTS public.user_effective_permissions SET (security_invoker = on);
ALTER VIEW IF EXISTS public.user_effective_tags SET (security_invoker = on);
ALTER VIEW IF EXISTS public.integrity_system_health SET (security_invoker = on);
ALTER VIEW IF EXISTS public.tag_hierarchy SET (security_invoker = on);

-- Also update agent_summary and skill_summary (may have been missed)
ALTER VIEW IF EXISTS public.agent_summary SET (security_invoker = on);
ALTER VIEW IF EXISTS public.skill_summary SET (security_invoker = on);

-- ============================================================
-- PART 2: ENABLE RLS ON TABLES (13 tables)
-- All these tables have company_profile_id and/or user_id
-- ============================================================

-- Enable RLS on all flagged tables
ALTER TABLE IF EXISTS public.digm_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.strategic_foundations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.strategic_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bsc_perspectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.competitive_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parthenon_okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parthenon_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parthenon_stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.governance_raci ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.align_integrity_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.align_integrity_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.align_integrity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.alignment_briefs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 3: CREATE RLS POLICIES
-- Pattern: Users can access their own data OR data linked to
-- company profiles they own. Service role bypasses RLS.
-- ============================================================

-- Helper function to check company profile ownership
CREATE OR REPLACE FUNCTION public.user_owns_company_profile(profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM company_profiles
        WHERE id = profile_id
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- DIGM LAYERS
-- ============================================================
DROP POLICY IF EXISTS "Users can view own digm_layers" ON public.digm_layers;
CREATE POLICY "Users can view own digm_layers" ON public.digm_layers
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can insert own digm_layers" ON public.digm_layers;
CREATE POLICY "Users can insert own digm_layers" ON public.digm_layers
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can update own digm_layers" ON public.digm_layers;
CREATE POLICY "Users can update own digm_layers" ON public.digm_layers
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can delete own digm_layers" ON public.digm_layers;
CREATE POLICY "Users can delete own digm_layers" ON public.digm_layers
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

-- ============================================================
-- STRATEGIC FOUNDATIONS
-- ============================================================
DROP POLICY IF EXISTS "Users can view own strategic_foundations" ON public.strategic_foundations;
CREATE POLICY "Users can view own strategic_foundations" ON public.strategic_foundations
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can insert own strategic_foundations" ON public.strategic_foundations;
CREATE POLICY "Users can insert own strategic_foundations" ON public.strategic_foundations
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can update own strategic_foundations" ON public.strategic_foundations;
CREATE POLICY "Users can update own strategic_foundations" ON public.strategic_foundations
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can delete own strategic_foundations" ON public.strategic_foundations;
CREATE POLICY "Users can delete own strategic_foundations" ON public.strategic_foundations
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

-- ============================================================
-- STRATEGIC INITIATIVES
-- ============================================================
DROP POLICY IF EXISTS "Users can view own strategic_initiatives" ON public.strategic_initiatives;
CREATE POLICY "Users can view own strategic_initiatives" ON public.strategic_initiatives
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can insert own strategic_initiatives" ON public.strategic_initiatives;
CREATE POLICY "Users can insert own strategic_initiatives" ON public.strategic_initiatives
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can update own strategic_initiatives" ON public.strategic_initiatives;
CREATE POLICY "Users can update own strategic_initiatives" ON public.strategic_initiatives
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can delete own strategic_initiatives" ON public.strategic_initiatives;
CREATE POLICY "Users can delete own strategic_initiatives" ON public.strategic_initiatives
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

-- ============================================================
-- BSC PERSPECTIVES
-- ============================================================
DROP POLICY IF EXISTS "Users can view own bsc_perspectives" ON public.bsc_perspectives;
CREATE POLICY "Users can view own bsc_perspectives" ON public.bsc_perspectives
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can insert own bsc_perspectives" ON public.bsc_perspectives;
CREATE POLICY "Users can insert own bsc_perspectives" ON public.bsc_perspectives
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can update own bsc_perspectives" ON public.bsc_perspectives;
CREATE POLICY "Users can update own bsc_perspectives" ON public.bsc_perspectives
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can delete own bsc_perspectives" ON public.bsc_perspectives;
CREATE POLICY "Users can delete own bsc_perspectives" ON public.bsc_perspectives
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

-- ============================================================
-- COMPETITIVE INTELLIGENCE
-- ============================================================
DROP POLICY IF EXISTS "Users can view own competitive_intelligence" ON public.competitive_intelligence;
CREATE POLICY "Users can view own competitive_intelligence" ON public.competitive_intelligence
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can insert own competitive_intelligence" ON public.competitive_intelligence;
CREATE POLICY "Users can insert own competitive_intelligence" ON public.competitive_intelligence
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can update own competitive_intelligence" ON public.competitive_intelligence;
CREATE POLICY "Users can update own competitive_intelligence" ON public.competitive_intelligence
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can delete own competitive_intelligence" ON public.competitive_intelligence;
CREATE POLICY "Users can delete own competitive_intelligence" ON public.competitive_intelligence
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

-- ============================================================
-- PARTHENON OKRS
-- ============================================================
DROP POLICY IF EXISTS "Users can view own parthenon_okrs" ON public.parthenon_okrs;
CREATE POLICY "Users can view own parthenon_okrs" ON public.parthenon_okrs
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can insert own parthenon_okrs" ON public.parthenon_okrs;
CREATE POLICY "Users can insert own parthenon_okrs" ON public.parthenon_okrs
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can update own parthenon_okrs" ON public.parthenon_okrs;
CREATE POLICY "Users can update own parthenon_okrs" ON public.parthenon_okrs
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can delete own parthenon_okrs" ON public.parthenon_okrs;
CREATE POLICY "Users can delete own parthenon_okrs" ON public.parthenon_okrs
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

-- ============================================================
-- PARTHENON ROLES
-- ============================================================
DROP POLICY IF EXISTS "Users can view own parthenon_roles" ON public.parthenon_roles;
CREATE POLICY "Users can view own parthenon_roles" ON public.parthenon_roles
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can insert own parthenon_roles" ON public.parthenon_roles;
CREATE POLICY "Users can insert own parthenon_roles" ON public.parthenon_roles
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can update own parthenon_roles" ON public.parthenon_roles;
CREATE POLICY "Users can update own parthenon_roles" ON public.parthenon_roles
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can delete own parthenon_roles" ON public.parthenon_roles;
CREATE POLICY "Users can delete own parthenon_roles" ON public.parthenon_roles
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

-- ============================================================
-- PARTHENON STAKEHOLDERS
-- ============================================================
DROP POLICY IF EXISTS "Users can view own parthenon_stakeholders" ON public.parthenon_stakeholders;
CREATE POLICY "Users can view own parthenon_stakeholders" ON public.parthenon_stakeholders
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can insert own parthenon_stakeholders" ON public.parthenon_stakeholders;
CREATE POLICY "Users can insert own parthenon_stakeholders" ON public.parthenon_stakeholders
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can update own parthenon_stakeholders" ON public.parthenon_stakeholders;
CREATE POLICY "Users can update own parthenon_stakeholders" ON public.parthenon_stakeholders
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can delete own parthenon_stakeholders" ON public.parthenon_stakeholders;
CREATE POLICY "Users can delete own parthenon_stakeholders" ON public.parthenon_stakeholders
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

-- ============================================================
-- GOVERNANCE RACI
-- ============================================================
DROP POLICY IF EXISTS "Users can view own governance_raci" ON public.governance_raci;
CREATE POLICY "Users can view own governance_raci" ON public.governance_raci
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can insert own governance_raci" ON public.governance_raci;
CREATE POLICY "Users can insert own governance_raci" ON public.governance_raci
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can update own governance_raci" ON public.governance_raci;
CREATE POLICY "Users can update own governance_raci" ON public.governance_raci
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can delete own governance_raci" ON public.governance_raci;
CREATE POLICY "Users can delete own governance_raci" ON public.governance_raci
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

-- ============================================================
-- ALIGN INTEGRITY ALERTS
-- ============================================================
DROP POLICY IF EXISTS "Users can view own align_integrity_alerts" ON public.align_integrity_alerts;
CREATE POLICY "Users can view own align_integrity_alerts" ON public.align_integrity_alerts
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can insert own align_integrity_alerts" ON public.align_integrity_alerts;
CREATE POLICY "Users can insert own align_integrity_alerts" ON public.align_integrity_alerts
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can update own align_integrity_alerts" ON public.align_integrity_alerts;
CREATE POLICY "Users can update own align_integrity_alerts" ON public.align_integrity_alerts
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can delete own align_integrity_alerts" ON public.align_integrity_alerts;
CREATE POLICY "Users can delete own align_integrity_alerts" ON public.align_integrity_alerts
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

-- ============================================================
-- ALIGN INTEGRITY INCIDENTS
-- ============================================================
DROP POLICY IF EXISTS "Users can view own align_integrity_incidents" ON public.align_integrity_incidents;
CREATE POLICY "Users can view own align_integrity_incidents" ON public.align_integrity_incidents
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can insert own align_integrity_incidents" ON public.align_integrity_incidents;
CREATE POLICY "Users can insert own align_integrity_incidents" ON public.align_integrity_incidents
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can update own align_integrity_incidents" ON public.align_integrity_incidents;
CREATE POLICY "Users can update own align_integrity_incidents" ON public.align_integrity_incidents
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can delete own align_integrity_incidents" ON public.align_integrity_incidents;
CREATE POLICY "Users can delete own align_integrity_incidents" ON public.align_integrity_incidents
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

-- ============================================================
-- ALIGN INTEGRITY METRICS
-- ============================================================
DROP POLICY IF EXISTS "Users can view own align_integrity_metrics" ON public.align_integrity_metrics;
CREATE POLICY "Users can view own align_integrity_metrics" ON public.align_integrity_metrics
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can insert own align_integrity_metrics" ON public.align_integrity_metrics;
CREATE POLICY "Users can insert own align_integrity_metrics" ON public.align_integrity_metrics
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can update own align_integrity_metrics" ON public.align_integrity_metrics;
CREATE POLICY "Users can update own align_integrity_metrics" ON public.align_integrity_metrics
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can delete own align_integrity_metrics" ON public.align_integrity_metrics;
CREATE POLICY "Users can delete own align_integrity_metrics" ON public.align_integrity_metrics
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid() OR
        public.user_owns_company_profile(company_profile_id)
    );

-- ============================================================
-- ALIGNMENT BRIEFS (has session_id - sensitive column)
-- ============================================================
DROP POLICY IF EXISTS "Users can view own alignment_briefs" ON public.alignment_briefs;
CREATE POLICY "Users can view own alignment_briefs" ON public.alignment_briefs
    FOR SELECT TO authenticated
    USING (
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can insert own alignment_briefs" ON public.alignment_briefs;
CREATE POLICY "Users can insert own alignment_briefs" ON public.alignment_briefs
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can update own alignment_briefs" ON public.alignment_briefs;
CREATE POLICY "Users can update own alignment_briefs" ON public.alignment_briefs
    FOR UPDATE TO authenticated
    USING (
        public.user_owns_company_profile(company_profile_id)
    );

DROP POLICY IF EXISTS "Users can delete own alignment_briefs" ON public.alignment_briefs;
CREATE POLICY "Users can delete own alignment_briefs" ON public.alignment_briefs
    FOR DELETE TO authenticated
    USING (
        public.user_owns_company_profile(company_profile_id)
    );

-- ============================================================
-- PART 4: SERVICE ROLE BYPASS POLICIES
-- Allow service role to bypass RLS for server-side operations
-- ============================================================

-- Grant service role access (service role bypasses RLS by default in Supabase)
-- These grants ensure the API server can still function with service key
GRANT ALL ON public.digm_layers TO service_role;
GRANT ALL ON public.strategic_foundations TO service_role;
GRANT ALL ON public.strategic_initiatives TO service_role;
GRANT ALL ON public.bsc_perspectives TO service_role;
GRANT ALL ON public.competitive_intelligence TO service_role;
GRANT ALL ON public.parthenon_okrs TO service_role;
GRANT ALL ON public.parthenon_roles TO service_role;
GRANT ALL ON public.parthenon_stakeholders TO service_role;
GRANT ALL ON public.governance_raci TO service_role;
GRANT ALL ON public.align_integrity_alerts TO service_role;
GRANT ALL ON public.align_integrity_incidents TO service_role;
GRANT ALL ON public.align_integrity_metrics TO service_role;
GRANT ALL ON public.alignment_briefs TO service_role;

-- ============================================================
-- AGENT CONTEXT MAPPINGS (CRITICAL FIX)
-- This table has RLS enabled but was missing INSERT/UPDATE/DELETE policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view own mappings" ON public.agent_context_mappings;
DROP POLICY IF EXISTS "Users can insert own mappings" ON public.agent_context_mappings;
DROP POLICY IF EXISTS "Users can update own mappings" ON public.agent_context_mappings;
DROP POLICY IF EXISTS "Users can delete own mappings" ON public.agent_context_mappings;
DROP POLICY IF EXISTS "Service role full access to mappings" ON public.agent_context_mappings;

-- Policy: Users can view mappings for their own agents
CREATE POLICY "Users can view own mappings" ON public.agent_context_mappings
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM agents
            WHERE agents.id = agent_context_mappings.agent_id
            AND agents.user_id = auth.uid()
        )
    );

-- Policy: Users can insert mappings for their own agents
CREATE POLICY "Users can insert own mappings" ON public.agent_context_mappings
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM agents
            WHERE agents.id = agent_context_mappings.agent_id
            AND agents.user_id = auth.uid()
        )
    );

-- Policy: Users can update mappings for their own agents
CREATE POLICY "Users can update own mappings" ON public.agent_context_mappings
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM agents
            WHERE agents.id = agent_context_mappings.agent_id
            AND agents.user_id = auth.uid()
        )
    );

-- Policy: Users can delete mappings for their own agents
CREATE POLICY "Users can delete own mappings" ON public.agent_context_mappings
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM agents
            WHERE agents.id = agent_context_mappings.agent_id
            AND agents.user_id = auth.uid()
        )
    );

-- Policy: Service role has full access (for admin operations)
CREATE POLICY "Service role full access to mappings" ON public.agent_context_mappings
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Grant service role access
GRANT ALL ON public.agent_context_mappings TO service_role;

-- ============================================================
-- VERIFICATION
-- ============================================================
DO $$
DECLARE
    rls_count INTEGER;
    view_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Count tables with RLS enabled
    SELECT COUNT(*) INTO rls_count
    FROM pg_tables t
    JOIN pg_class c ON t.tablename = c.relname
    WHERE t.schemaname = 'public'
    AND t.tablename IN (
        'digm_layers', 'strategic_foundations', 'strategic_initiatives',
        'bsc_perspectives', 'competitive_intelligence', 'parthenon_okrs',
        'parthenon_roles', 'parthenon_stakeholders', 'governance_raci',
        'align_integrity_alerts', 'align_integrity_incidents',
        'align_integrity_metrics', 'alignment_briefs'
    )
    AND c.relrowsecurity = true;

    -- Count policies created
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN (
        'digm_layers', 'strategic_foundations', 'strategic_initiatives',
        'bsc_perspectives', 'competitive_intelligence', 'parthenon_okrs',
        'parthenon_roles', 'parthenon_stakeholders', 'governance_raci',
        'align_integrity_alerts', 'align_integrity_incidents',
        'align_integrity_metrics', 'alignment_briefs'
    );

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'PHASE 27 SECURITY MIGRATION COMPLETED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables with RLS enabled: % of 13', rls_count;
    RAISE NOTICE 'Policies created: %', policy_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Changes applied:';
    RAISE NOTICE '  - 14 views set to SECURITY INVOKER';
    RAISE NOTICE '  - 13 tables with RLS enabled';
    RAISE NOTICE '  - 52 RLS policies created (4 per table)';
    RAISE NOTICE '  - Service role grants for API access';
    RAISE NOTICE '';
    RAISE NOTICE 'Run Supabase linter again to verify all issues resolved.';
    RAISE NOTICE '==============================================';
END $$;
