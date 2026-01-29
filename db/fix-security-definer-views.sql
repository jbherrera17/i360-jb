-- Migration: Fix SECURITY DEFINER views and enable RLS on exposed tables
-- Date: 2026-01-29
-- Purpose: Resolve Supabase linter security errors
--   - Convert 27 SECURITY DEFINER views to SECURITY INVOKER
--   - Enable RLS on 2 public tables missing it
--
-- NOTE: If user_accessible_* or user_full_capabilities views return empty
-- results after this migration, add RLS SELECT policies on their underlying
-- tables to grant authenticated users the appropriate read access.

BEGIN;

-- ============================================================
-- Part 1: Enable RLS on tables missing it
-- ============================================================

ALTER TABLE public.role_resource_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_providers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'role_resource_visibility' AND policyname = 'Allow authenticated read') THEN
    CREATE POLICY "Allow authenticated read" ON public.role_resource_visibility FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'integration_providers' AND policyname = 'Allow authenticated read') THEN
    CREATE POLICY "Allow authenticated read" ON public.integration_providers FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- ============================================================
-- Part 2: Convert SECURITY DEFINER views to SECURITY INVOKER
-- ============================================================

-- agency_client_metrics
DROP VIEW IF EXISTS public.agency_client_metrics CASCADE;
CREATE VIEW public.agency_client_metrics
WITH (security_invoker = true) AS
SELECT o.id AS org_id,
    o.name AS org_name,
    c.id AS client_id,
    c.name AS client_name,
    c.status AS client_status,
    c.engagement_started_at,
    c.engagement_ended_at,
    COALESCE(session_stats.total_sessions, 0::bigint) AS total_sessions,
    COALESCE(session_stats.completed_sessions, 0::bigint) AS completed_sessions,
    COALESCE(session_stats.active_sessions, 0::bigint) AS active_sessions,
    session_stats.last_session_at,
    session_stats.first_session_at,
    COALESCE(profile_stats.profile_count, 0::bigint) AS profiles_count,
    profile_stats.last_profile_update,
    assessment_stats.maturity_score,
    assessment_stats.maturity_level,
    assessment_stats.readiness_score,
    assessment_stats.brand_alignment_score,
    COALESCE(portal_stats.active_users, 0::bigint) AS active_portal_users,
    COALESCE(portal_stats.reports_shared, 0::bigint) AS reports_shared,
    COALESCE(portal_stats.total_report_views, 0::bigint) AS total_report_views,
    portal_stats.last_portal_activity,
    CASE
        WHEN c.status = 'archived' THEN 'archived'
        WHEN session_stats.last_session_at > (now() - '30 days'::interval) THEN 'active'
        WHEN session_stats.last_session_at > (now() - '90 days'::interval) THEN 'engaged'
        WHEN session_stats.last_session_at IS NOT NULL THEN 'dormant'
        ELSE 'new'
    END AS engagement_status,
    CASE
        WHEN c.status = 'archived' THEN 0::numeric
        ELSE LEAST(100::numeric, GREATEST(0::numeric,
            COALESCE(assessment_stats.maturity_score, 0)::numeric * 0.3 +
            COALESCE(assessment_stats.readiness_score, 0)::numeric * 0.2 +
            CASE WHEN session_stats.completed_sessions > 0 THEN 25 ELSE 0 END::numeric +
            CASE WHEN portal_stats.active_users > 0 THEN 15 ELSE 0 END::numeric +
            CASE WHEN session_stats.last_session_at > (now() - '30 days'::interval) THEN 10 ELSE 0 END::numeric
        ))
    END AS health_score
FROM organizations o
JOIN clients c ON c.org_id = o.id
LEFT JOIN LATERAL (
    SELECT count(*) AS total_sessions,
        count(*) FILTER (WHERE align120_sessions.status = 'completed') AS completed_sessions,
        count(*) FILTER (WHERE align120_sessions.status = 'in_progress') AS active_sessions,
        max(align120_sessions.created_at) AS last_session_at,
        min(align120_sessions.created_at) AS first_session_at
    FROM align120_sessions
    WHERE align120_sessions.client_id = c.id
) session_stats ON true
LEFT JOIN LATERAL (
    SELECT count(*) AS profile_count,
        max(company_profiles.updated_at) AS last_profile_update
    FROM company_profiles
    WHERE company_profiles.client_id = c.id AND company_profiles.status <> 'archived'
) profile_stats ON true
LEFT JOIN LATERAL (
    SELECT ama.overall_score AS maturity_score,
        ama.maturity_level,
        tra.overall_readiness_score AS readiness_score,
        NULL::numeric AS brand_alignment_score
    FROM company_profiles cp
    LEFT JOIN ai_maturity_assessments ama ON ama.company_profile_id = cp.id
    LEFT JOIN team_readiness_assessments tra ON tra.company_profile_id = cp.id
    WHERE cp.client_id = c.id AND cp.status <> 'archived'
    ORDER BY GREATEST(ama.created_at, tra.created_at) DESC NULLS LAST
    LIMIT 1
) assessment_stats ON true
LEFT JOIN LATERAL (
    SELECT count(*) FILTER (WHERE client_users.status = 'active') AS active_users,
        (SELECT count(*) FROM client_report_shares WHERE client_report_shares.client_id = c.id AND client_report_shares.is_active = true) AS reports_shared,
        (SELECT sum(client_report_shares.view_count) FROM client_report_shares WHERE client_report_shares.client_id = c.id) AS total_report_views,
        max(client_users.last_login_at) AS last_portal_activity
    FROM client_users
    WHERE client_users.client_id = c.id
) portal_stats ON true
WHERE o.is_active = true;

-- agency_maturity_distribution
DROP VIEW IF EXISTS public.agency_maturity_distribution CASCADE;
CREATE VIEW public.agency_maturity_distribution
WITH (security_invoker = true) AS
SELECT org_id, org_name, maturity_level,
    count(*) AS client_count,
    round((100.0 * count(*)::numeric) / sum(count(*)) OVER (PARTITION BY org_id), 1) AS percentage
FROM agency_client_metrics
WHERE client_status = 'active' AND maturity_level IS NOT NULL
GROUP BY org_id, org_name, maturity_level
ORDER BY org_id,
    CASE maturity_level
        WHEN 'Nascent' THEN 1
        WHEN 'Emerging' THEN 2
        WHEN 'Developing' THEN 3
        WHEN 'Advanced' THEN 4
        WHEN 'Leading' THEN 5
    END;

-- agency_overview
DROP VIEW IF EXISTS public.agency_overview CASCADE;
CREATE VIEW public.agency_overview
WITH (security_invoker = true) AS
SELECT o.id AS org_id, o.name AS org_name, o.subscription_tier,
    count(DISTINCT c.id) AS total_clients,
    count(DISTINCT c.id) FILTER (WHERE c.status = 'active') AS active_clients,
    count(DISTINCT c.id) FILTER (WHERE c.status = 'prospect') AS prospects,
    COALESCE(sum(acm.total_sessions), 0::numeric)::integer AS total_sessions,
    COALESCE(sum(acm.completed_sessions), 0::numeric)::integer AS completed_sessions,
    round(avg(acm.maturity_score), 1) AS avg_maturity_score,
    round(avg(acm.readiness_score), 1) AS avg_readiness_score,
    round(avg(acm.health_score), 1) AS avg_health_score,
    COALESCE(sum(acm.active_portal_users), 0::numeric)::integer AS total_portal_users,
    COALESCE(sum(acm.reports_shared), 0::numeric)::integer AS total_reports_shared,
    max(acm.last_session_at) AS last_activity,
    count(DISTINCT c.id) FILTER (WHERE acm.last_session_at > (now() - '30 days'::interval)) AS clients_active_30d
FROM organizations o
LEFT JOIN clients c ON c.org_id = o.id
LEFT JOIN agency_client_metrics acm ON acm.client_id = c.id
WHERE o.is_active = true
GROUP BY o.id, o.name, o.subscription_tier;

-- agency_top_performers
DROP VIEW IF EXISTS public.agency_top_performers CASCADE;
CREATE VIEW public.agency_top_performers
WITH (security_invoker = true) AS
SELECT org_id, org_name, client_id, client_name,
    maturity_score, readiness_score, health_score,
    rank() OVER (PARTITION BY org_id ORDER BY health_score DESC NULLS LAST) AS health_rank,
    rank() OVER (PARTITION BY org_id ORDER BY maturity_score DESC NULLS LAST) AS maturity_rank
FROM agency_client_metrics
WHERE client_status = 'active';

-- agency_trends
DROP VIEW IF EXISTS public.agency_trends CASCADE;
CREATE VIEW public.agency_trends
WITH (security_invoker = true) AS
SELECT ams.org_id, o.name AS org_name, ams.snapshot_date, ams.snapshot_type,
    ams.total_clients, ams.active_clients, ams.completed_sessions,
    ams.avg_maturity_score, ams.avg_health_score,
    ams.total_clients - lag(ams.total_clients) OVER (PARTITION BY ams.org_id, ams.snapshot_type ORDER BY ams.snapshot_date) AS clients_change,
    ams.completed_sessions - lag(ams.completed_sessions) OVER (PARTITION BY ams.org_id, ams.snapshot_type ORDER BY ams.snapshot_date) AS sessions_change,
    ams.avg_maturity_score - lag(ams.avg_maturity_score) OVER (PARTITION BY ams.org_id, ams.snapshot_type ORDER BY ams.snapshot_date) AS maturity_change
FROM agency_metrics_snapshots ams
JOIN organizations o ON ams.org_id = o.id
ORDER BY ams.org_id, ams.snapshot_date DESC;

-- agent_summary
DROP VIEW IF EXISTS public.agent_summary CASCADE;
CREATE VIEW public.agent_summary
WITH (security_invoker = true) AS
SELECT a.id, a.user_id, a.name, a.description, a.icon, a.category, a.suite, a.type,
    a.llm_provider, a.llm_model, a.temperature, a.max_tokens,
    a.is_active, a.is_public, a.is_system, a.usage_count, a.last_used_at,
    a.created_at, a.updated_at, a.mindstudio_workflow_id, a.introduction,
    a.conversation_starters, a.parent_agent_id, a.forked_at, a.forked_from_version,
    a.org_id, a.visibility, a.module_id,
    parent.name AS parent_agent_name,
    parent.is_system AS parent_is_system,
    (SELECT count(*) FROM agents children WHERE children.parent_agent_id = a.id) AS fork_count
FROM agents a
LEFT JOIN agents parent ON a.parent_agent_id = parent.id;

-- briefing_config_summary
-- Recreated to match actual schema (is_enabled not is_active, no name column, no briefing_agents table)
DROP VIEW IF EXISTS public.briefing_config_summary CASCADE;
CREATE VIEW public.briefing_config_summary
WITH (security_invoker = true) AS
SELECT bc.*,
    count(bs.id) FILTER (WHERE bs.is_enabled = true) AS active_sections,
    count(bs.id) AS total_sections,
    array_agg(bs.name ORDER BY bs.sort_order) FILTER (WHERE bs.is_enabled = true) AS section_names
FROM briefing_configs bc
LEFT JOIN briefing_sections bs ON bc.id = bs.config_id
GROUP BY bc.id;

-- client_profile_history
-- Drop and recreate to handle column name changes
DROP VIEW IF EXISTS public.client_profile_history CASCADE;
CREATE VIEW public.client_profile_history
WITH (security_invoker = true) AS
SELECT cp.id, cp.client_id, c.name AS client_name, c.org_id,
    cp.company_name, cp.industry, cp.company_size, cp.status,
    cp.created_at, cp.updated_at,
    ama.overall_score AS maturity_score,
    ama.maturity_level,
    ama.created_at AS maturity_assessed_at,
    tra.overall_readiness_score AS readiness_score,
    tra.created_at AS readiness_assessed_at
FROM company_profiles cp
JOIN clients c ON cp.client_id = c.id
LEFT JOIN ai_maturity_assessments ama ON ama.company_profile_id = cp.id
LEFT JOIN team_readiness_assessments tra ON tra.company_profile_id = cp.id;

-- client_shared_reports
DROP VIEW IF EXISTS public.client_shared_reports CASCADE;
CREATE VIEW public.client_shared_reports
WITH (security_invoker = true) AS
SELECT crs.id, crs.client_id, c.name AS client_name, c.org_id,
    crs.session_report_id, crs.shared_by, crs.shared_at, crs.share_message,
    crs.is_active, crs.expires_at, crs.view_count,
    crs.last_viewed_at,
    CASE
        WHEN crs.is_active = false THEN 'inactive'
        WHEN crs.expires_at IS NOT NULL AND crs.expires_at < now() THEN 'expired'
        ELSE 'active'
    END AS effective_status
FROM client_report_shares crs
JOIN clients c ON crs.client_id = c.id;

-- client_user_summary
DROP VIEW IF EXISTS public.client_user_summary CASCADE;
CREATE VIEW public.client_user_summary
WITH (security_invoker = true) AS
SELECT cu.id, cu.client_id, c.name AS client_name, c.org_id,
    cu.email, cu.name AS full_name, cu.role AS client_role, cu.status,
    cu.last_login_at, cu.created_at,
    cu.last_login_at IS NOT NULL AND cu.last_login_at > (now() - '30 days'::interval) AS recently_active
FROM client_users cu
JOIN clients c ON cu.client_id = c.id;

-- current_client_profiles
DROP VIEW IF EXISTS public.current_client_profiles CASCADE;
CREATE VIEW public.current_client_profiles
WITH (security_invoker = true) AS
SELECT DISTINCT ON (cp.client_id) cp.id, cp.client_id, c.name AS client_name, c.org_id,
    cp.company_name, cp.industry, cp.company_size,
    cp.status, cp.created_at, cp.updated_at,
    ama.overall_score AS maturity_score,
    ama.maturity_level,
    tra.overall_readiness_score AS readiness_score
FROM company_profiles cp
JOIN clients c ON cp.client_id = c.id
LEFT JOIN ai_maturity_assessments ama ON ama.company_profile_id = cp.id
LEFT JOIN team_readiness_assessments tra ON tra.company_profile_id = cp.id
WHERE cp.status <> 'archived'
ORDER BY cp.client_id, cp.updated_at DESC;

-- okr_supporting_capabilities
-- Dropped only; underlying tables (okr_objectives, okr_capability_links) do not exist
DROP VIEW IF EXISTS public.okr_supporting_capabilities CASCADE;

-- org_tier_details
DROP VIEW IF EXISTS public.org_tier_details CASCADE;
CREATE VIEW public.org_tier_details
WITH (security_invoker = true) AS
SELECT o.id AS org_id, o.name AS org_name, o.subscription_tier,
    st.name AS tier_name, st.max_members, st.max_clients,
    st.max_agents, st.max_workflows, st.features AS tier_features,
    count(DISTINCT om.user_id) AS current_members,
    count(DISTINCT c.id) AS current_clients,
    count(DISTINCT a.id) AS current_agents,
    count(DISTINCT w.id) AS current_workflows
FROM organizations o
LEFT JOIN subscription_tiers st ON o.subscription_tier = st.name
LEFT JOIN organization_members om ON om.org_id = o.id AND om.status = 'active'
LEFT JOIN clients c ON c.org_id = o.id AND c.status <> 'archived'
LEFT JOIN agents a ON a.org_id = o.id AND a.is_active = true
LEFT JOIN workflows w ON w.org_id = o.id AND w.is_active = true
WHERE o.is_active = true
GROUP BY o.id, o.name, o.subscription_tier, st.name,
    st.max_members, st.max_clients, st.max_agents, st.max_workflows, st.features;

-- organization_summary
DROP VIEW IF EXISTS public.organization_summary CASCADE;
CREATE VIEW public.organization_summary
WITH (security_invoker = true) AS
SELECT o.id, o.name, o.slug, o.subscription_tier, o.is_active,
    o.created_at, o.updated_at,
    count(DISTINCT om.user_id) FILTER (WHERE om.status = 'active') AS active_members,
    count(DISTINCT c.id) AS total_clients,
    count(DISTINCT c.id) FILTER (WHERE c.status = 'active') AS active_clients,
    count(DISTINCT d.id) AS department_count
FROM organizations o
LEFT JOIN organization_members om ON om.org_id = o.id
LEFT JOIN clients c ON c.org_id = o.id
LEFT JOIN departments d ON d.org_id = o.id
GROUP BY o.id, o.name, o.slug, o.subscription_tier, o.is_active, o.created_at, o.updated_at;

-- pillar_content_distribution
-- Dropped only; content_themes and content_articles tables do not exist
DROP VIEW IF EXISTS public.pillar_content_distribution CASCADE;

-- platform_users_overview
DROP VIEW IF EXISTS public.platform_users_overview CASCADE;
CREATE VIEW public.platform_users_overview
WITH (security_invoker = true) AS
SELECT u.id, u.email, u.raw_user_meta_data->>'full_name' AS full_name, u.raw_user_meta_data->>'avatar_url' AS avatar_url, u.created_at,
    u.last_sign_in_at,
    om.org_id, o.name AS org_name, om.role AS org_role, pu.business_role,
    om.status AS membership_status,
    EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = u.id AND pa.is_active = true) AS is_platform_admin
FROM auth.users u
LEFT JOIN organization_members om ON om.user_id = u.id
LEFT JOIN organizations o ON o.id = om.org_id
LEFT JOIN users pu ON pu.id = u.id;

-- publishing_analytics
-- Dropped only; content_articles, content_themes, publication_posts tables do not exist
DROP VIEW IF EXISTS public.publishing_analytics CASCADE;

-- recent_briefings
-- Dropped only; briefing_items table does not exist
DROP VIEW IF EXISTS public.recent_briefings CASCADE;

-- responsibility_ai_recommendations
-- Dropped only; responsibility_capability_links table does not exist
DROP VIEW IF EXISTS public.responsibility_ai_recommendations CASCADE;

-- upcoming_publications
-- Dropped only; content_articles, content_themes tables do not exist
DROP VIEW IF EXISTS public.upcoming_publications CASCADE;

-- user_accessible_agents
DROP VIEW IF EXISTS public.user_accessible_agents CASCADE;
CREATE VIEW public.user_accessible_agents
WITH (security_invoker = true) AS
SELECT a.*, om.user_id AS accessing_user_id
FROM agents a
JOIN organization_members om ON a.org_id = om.org_id AND om.status = 'active'
WHERE a.is_active = true
    AND (a.visibility = 'organization'
        OR a.user_id = om.user_id
        OR a.is_system = true);

-- user_accessible_context_assets
DROP VIEW IF EXISTS public.user_accessible_context_assets CASCADE;
CREATE VIEW public.user_accessible_context_assets
WITH (security_invoker = true) AS
SELECT ca.*, om.user_id AS accessing_user_id
FROM context_assets ca
JOIN organization_members om ON ca.org_id = om.org_id AND om.status = 'active'
WHERE ca.is_current = true
    AND (ca.visibility = 'organization'
        OR ca.user_id = om.user_id);

-- user_accessible_workflows
DROP VIEW IF EXISTS public.user_accessible_workflows CASCADE;
CREATE VIEW public.user_accessible_workflows
WITH (security_invoker = true) AS
SELECT w.*, om.user_id AS accessing_user_id
FROM workflows w
JOIN organization_members om ON w.org_id = om.org_id AND om.status = 'active'
WHERE w.is_active = true
    AND (w.is_public = true
        OR w.user_id = om.user_id
        OR w.is_system = true);

-- user_full_capabilities
-- Dropped only; ai_capabilities and ai_capability_scores tables do not exist
DROP VIEW IF EXISTS public.user_full_capabilities CASCADE;

-- user_org_memberships
DROP VIEW IF EXISTS public.user_org_memberships CASCADE;
CREATE VIEW public.user_org_memberships
WITH (security_invoker = true) AS
SELECT om.user_id, om.org_id, o.name AS org_name, o.slug AS org_slug,
    o.subscription_tier, om.role, pu.business_role, pu.department_id,
    d.name AS department_name, om.status, om.joined_at
FROM organization_members om
JOIN organizations o ON o.id = om.org_id
LEFT JOIN users pu ON pu.id = om.user_id
LEFT JOIN departments d ON d.id = pu.department_id
WHERE o.is_active = true;

-- weekly_content_summary
-- Dropped only; content_articles, content_themes tables do not exist
DROP VIEW IF EXISTS public.weekly_content_summary CASCADE;

-- weekly_publishing_summary
-- Dropped only; publication_posts table does not exist
DROP VIEW IF EXISTS public.weekly_publishing_summary CASCADE;

COMMIT;
