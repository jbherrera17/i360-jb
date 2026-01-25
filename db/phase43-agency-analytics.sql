-- ============================================
-- Phase 43: Agency Analytics & Reporting
-- Cross-client metrics, trends, and dashboards
-- ============================================
--
-- This schema enables agency-level insights:
-- - Aggregate metrics across all clients
-- - Time-series data for trending
-- - Client health scoring
-- - Benchmark comparisons
--
-- ============================================

-- ============================================
-- 1. AGENCY CLIENT METRICS VIEW (Real-time)
-- ============================================

CREATE OR REPLACE VIEW agency_client_metrics AS
SELECT
    o.id AS org_id,
    o.name AS org_name,
    c.id AS client_id,
    c.name AS client_name,
    c.status AS client_status,
    c.engagement_started_at,
    c.engagement_ended_at,

    -- Session metrics
    COALESCE(session_stats.total_sessions, 0) AS total_sessions,
    COALESCE(session_stats.completed_sessions, 0) AS completed_sessions,
    COALESCE(session_stats.active_sessions, 0) AS active_sessions,
    session_stats.last_session_at,
    session_stats.first_session_at,

    -- Profile metrics
    COALESCE(profile_stats.profile_count, 0) AS profiles_count,
    profile_stats.last_profile_update,

    -- Assessment scores
    assessment_stats.maturity_score,
    assessment_stats.maturity_level,
    assessment_stats.readiness_score,
    assessment_stats.brand_alignment_score,

    -- Client portal metrics
    COALESCE(portal_stats.active_users, 0) AS active_portal_users,
    COALESCE(portal_stats.reports_shared, 0) AS reports_shared,
    COALESCE(portal_stats.total_report_views, 0) AS total_report_views,
    portal_stats.last_portal_activity,

    -- Engagement health
    CASE
        WHEN c.status = 'archived' THEN 'archived'
        WHEN session_stats.last_session_at > NOW() - INTERVAL '30 days' THEN 'active'
        WHEN session_stats.last_session_at > NOW() - INTERVAL '90 days' THEN 'engaged'
        WHEN session_stats.last_session_at IS NOT NULL THEN 'dormant'
        ELSE 'new'
    END AS engagement_status,

    -- Health score (0-100)
    CASE
        WHEN c.status = 'archived' THEN 0
        ELSE LEAST(100, GREATEST(0,
            COALESCE(assessment_stats.maturity_score, 0) * 0.3 +
            COALESCE(assessment_stats.readiness_score, 0) * 0.2 +
            CASE WHEN session_stats.completed_sessions > 0 THEN 25 ELSE 0 END +
            CASE WHEN portal_stats.active_users > 0 THEN 15 ELSE 0 END +
            CASE WHEN session_stats.last_session_at > NOW() - INTERVAL '30 days' THEN 10 ELSE 0 END
        ))
    END AS health_score

FROM organizations o
JOIN clients c ON c.org_id = o.id

-- Session statistics
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) AS total_sessions,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_sessions,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS active_sessions,
        MAX(created_at) AS last_session_at,
        MIN(created_at) AS first_session_at
    FROM align120_sessions
    WHERE client_id = c.id
) session_stats ON true

-- Profile statistics
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) AS profile_count,
        MAX(updated_at) AS last_profile_update
    FROM company_profiles
    WHERE client_id = c.id AND status != 'archived'
) profile_stats ON true

-- Assessment statistics (latest scores)
LEFT JOIN LATERAL (
    SELECT
        ama.overall_score AS maturity_score,
        ama.maturity_level,
        tra.overall_readiness_score AS readiness_score,
        NULL::NUMERIC AS brand_alignment_score  -- Can be extended
    FROM company_profiles cp
    LEFT JOIN ai_maturity_assessments ama ON ama.company_profile_id = cp.id
    LEFT JOIN team_readiness_assessments tra ON tra.company_profile_id = cp.id
    WHERE cp.client_id = c.id AND cp.status != 'archived'
    ORDER BY GREATEST(ama.created_at, tra.created_at) DESC NULLS LAST
    LIMIT 1
) assessment_stats ON true

-- Portal statistics
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) FILTER (WHERE status = 'active') AS active_users,
        (SELECT COUNT(*) FROM client_report_shares WHERE client_id = c.id AND is_active = TRUE) AS reports_shared,
        (SELECT SUM(view_count) FROM client_report_shares WHERE client_id = c.id) AS total_report_views,
        MAX(last_login_at) AS last_portal_activity
    FROM client_users
    WHERE client_id = c.id
) portal_stats ON true

WHERE o.is_active = TRUE;

COMMENT ON VIEW agency_client_metrics IS 'Real-time aggregate metrics for each client in an organization';


-- ============================================
-- 2. AGENCY METRICS SNAPSHOTS (Historical)
-- ============================================

CREATE TABLE IF NOT EXISTS agency_metrics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Snapshot timing
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    snapshot_type TEXT DEFAULT 'daily' CHECK (snapshot_type IN ('daily', 'weekly', 'monthly')),

    -- Client counts
    total_clients INTEGER DEFAULT 0,
    active_clients INTEGER DEFAULT 0,
    new_clients_period INTEGER DEFAULT 0,
    churned_clients_period INTEGER DEFAULT 0,

    -- Session counts
    total_sessions INTEGER DEFAULT 0,
    completed_sessions INTEGER DEFAULT 0,
    sessions_this_period INTEGER DEFAULT 0,

    -- Score averages
    avg_maturity_score NUMERIC(5,2),
    avg_readiness_score NUMERIC(5,2),
    avg_health_score NUMERIC(5,2),

    -- Score distributions
    maturity_distribution JSONB DEFAULT '{}'::jsonb,
    -- Example: {"nascent": 2, "emerging": 5, "developing": 8, "advanced": 3, "leading": 1}

    -- Portal metrics
    total_portal_users INTEGER DEFAULT 0,
    active_portal_users INTEGER DEFAULT 0,
    reports_shared_period INTEGER DEFAULT 0,
    report_views_period INTEGER DEFAULT 0,

    -- Revenue/value metrics (future)
    total_revenue NUMERIC(12,2),
    mrr NUMERIC(12,2),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(org_id, snapshot_date, snapshot_type)
);

CREATE INDEX IF NOT EXISTS idx_agency_snapshots_org ON agency_metrics_snapshots(org_id);
CREATE INDEX IF NOT EXISTS idx_agency_snapshots_date ON agency_metrics_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_agency_snapshots_org_date ON agency_metrics_snapshots(org_id, snapshot_date DESC);

COMMENT ON TABLE agency_metrics_snapshots IS 'Historical metrics snapshots for trend analysis';


-- ============================================
-- 3. CLIENT SCORE HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS client_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Score date
    score_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Scores
    maturity_score NUMERIC(5,2),
    readiness_score NUMERIC(5,2),
    health_score NUMERIC(5,2),

    -- Score changes
    maturity_change NUMERIC(5,2),
    readiness_change NUMERIC(5,2),
    health_change NUMERIC(5,2),

    -- Session activity
    sessions_count INTEGER DEFAULT 0,
    completed_sessions INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(client_id, score_date)
);

CREATE INDEX IF NOT EXISTS idx_client_score_history_client ON client_score_history(client_id);
CREATE INDEX IF NOT EXISTS idx_client_score_history_org ON client_score_history(org_id);
CREATE INDEX IF NOT EXISTS idx_client_score_history_date ON client_score_history(score_date);

COMMENT ON TABLE client_score_history IS 'Daily score tracking per client for trend charts';


-- ============================================
-- 4. SNAPSHOT CAPTURE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION capture_agency_metrics_snapshot(
    p_snapshot_type TEXT DEFAULT 'daily'
)
RETURNS INTEGER AS $$
DECLARE
    v_org RECORD;
    v_count INTEGER := 0;
    v_period_start DATE;
BEGIN
    -- Determine period start based on type
    v_period_start := CASE p_snapshot_type
        WHEN 'daily' THEN CURRENT_DATE - INTERVAL '1 day'
        WHEN 'weekly' THEN CURRENT_DATE - INTERVAL '7 days'
        WHEN 'monthly' THEN CURRENT_DATE - INTERVAL '30 days'
        ELSE CURRENT_DATE - INTERVAL '1 day'
    END;

    -- Capture for each organization
    FOR v_org IN SELECT id FROM organizations WHERE is_active = TRUE
    LOOP
        INSERT INTO agency_metrics_snapshots (
            org_id,
            snapshot_date,
            snapshot_type,
            total_clients,
            active_clients,
            new_clients_period,
            total_sessions,
            completed_sessions,
            sessions_this_period,
            avg_maturity_score,
            avg_readiness_score,
            avg_health_score,
            maturity_distribution,
            total_portal_users,
            active_portal_users,
            reports_shared_period,
            report_views_period
        )
        SELECT
            v_org.id,
            CURRENT_DATE,
            p_snapshot_type,
            COUNT(DISTINCT c.id),
            COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active'),
            COUNT(DISTINCT c.id) FILTER (WHERE c.created_at >= v_period_start),
            COALESCE(SUM(acm.total_sessions), 0),
            COALESCE(SUM(acm.completed_sessions), 0),
            (SELECT COUNT(*) FROM align120_sessions s
             JOIN clients cl ON s.client_id = cl.id
             WHERE cl.org_id = v_org.id AND s.created_at >= v_period_start),
            AVG(acm.maturity_score),
            AVG(acm.readiness_score),
            AVG(acm.health_score),
            jsonb_build_object(
                'nascent', COUNT(*) FILTER (WHERE acm.maturity_level = 'Nascent'),
                'emerging', COUNT(*) FILTER (WHERE acm.maturity_level = 'Emerging'),
                'developing', COUNT(*) FILTER (WHERE acm.maturity_level = 'Developing'),
                'advanced', COUNT(*) FILTER (WHERE acm.maturity_level = 'Advanced'),
                'leading', COUNT(*) FILTER (WHERE acm.maturity_level = 'Leading')
            ),
            (SELECT COUNT(*) FROM client_users cu
             JOIN clients cl ON cu.client_id = cl.id
             WHERE cl.org_id = v_org.id AND cu.status != 'removed'),
            (SELECT COUNT(*) FROM client_users cu
             JOIN clients cl ON cu.client_id = cl.id
             WHERE cl.org_id = v_org.id AND cu.status = 'active'
             AND cu.last_login_at >= v_period_start),
            (SELECT COUNT(*) FROM client_report_shares crs
             JOIN clients cl ON crs.client_id = cl.id
             WHERE cl.org_id = v_org.id AND crs.shared_at >= v_period_start),
            (SELECT COALESCE(SUM(crs.view_count), 0) FROM client_report_shares crs
             JOIN clients cl ON crs.client_id = cl.id
             WHERE cl.org_id = v_org.id AND crs.last_viewed_at >= v_period_start)
        FROM clients c
        LEFT JOIN agency_client_metrics acm ON acm.client_id = c.id
        WHERE c.org_id = v_org.id
        ON CONFLICT (org_id, snapshot_date, snapshot_type) DO UPDATE SET
            total_clients = EXCLUDED.total_clients,
            active_clients = EXCLUDED.active_clients,
            new_clients_period = EXCLUDED.new_clients_period,
            total_sessions = EXCLUDED.total_sessions,
            completed_sessions = EXCLUDED.completed_sessions,
            sessions_this_period = EXCLUDED.sessions_this_period,
            avg_maturity_score = EXCLUDED.avg_maturity_score,
            avg_readiness_score = EXCLUDED.avg_readiness_score,
            avg_health_score = EXCLUDED.avg_health_score,
            maturity_distribution = EXCLUDED.maturity_distribution,
            total_portal_users = EXCLUDED.total_portal_users,
            active_portal_users = EXCLUDED.active_portal_users,
            reports_shared_period = EXCLUDED.reports_shared_period,
            report_views_period = EXCLUDED.report_views_period;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION capture_agency_metrics_snapshot IS 'Captures metrics snapshot for all organizations. Should be run daily via cron.';


-- ============================================
-- 5. CLIENT SCORE HISTORY CAPTURE
-- ============================================

CREATE OR REPLACE FUNCTION capture_client_score_history()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    INSERT INTO client_score_history (
        client_id,
        org_id,
        score_date,
        maturity_score,
        readiness_score,
        health_score,
        maturity_change,
        readiness_change,
        health_change,
        sessions_count,
        completed_sessions
    )
    SELECT
        acm.client_id,
        acm.org_id,
        CURRENT_DATE,
        acm.maturity_score,
        acm.readiness_score,
        acm.health_score,
        acm.maturity_score - COALESCE(prev.maturity_score, acm.maturity_score),
        acm.readiness_score - COALESCE(prev.readiness_score, acm.readiness_score),
        acm.health_score - COALESCE(prev.health_score, acm.health_score),
        acm.total_sessions,
        acm.completed_sessions
    FROM agency_client_metrics acm
    LEFT JOIN client_score_history prev ON prev.client_id = acm.client_id
        AND prev.score_date = CURRENT_DATE - INTERVAL '1 day'
    WHERE acm.client_status != 'archived'
    ON CONFLICT (client_id, score_date) DO UPDATE SET
        maturity_score = EXCLUDED.maturity_score,
        readiness_score = EXCLUDED.readiness_score,
        health_score = EXCLUDED.health_score,
        maturity_change = EXCLUDED.maturity_change,
        readiness_change = EXCLUDED.readiness_change,
        health_change = EXCLUDED.health_change,
        sessions_count = EXCLUDED.sessions_count,
        completed_sessions = EXCLUDED.completed_sessions;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION capture_client_score_history IS 'Captures daily score history for all clients. Should be run daily.';


-- ============================================
-- 6. AGENCY OVERVIEW VIEW
-- ============================================

CREATE OR REPLACE VIEW agency_overview AS
SELECT
    o.id AS org_id,
    o.name AS org_name,
    o.subscription_tier,

    -- Client summary
    COUNT(DISTINCT c.id) AS total_clients,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active') AS active_clients,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'prospect') AS prospects,

    -- Session summary
    COALESCE(SUM(acm.total_sessions), 0)::INTEGER AS total_sessions,
    COALESCE(SUM(acm.completed_sessions), 0)::INTEGER AS completed_sessions,

    -- Score averages
    ROUND(AVG(acm.maturity_score), 1) AS avg_maturity_score,
    ROUND(AVG(acm.readiness_score), 1) AS avg_readiness_score,
    ROUND(AVG(acm.health_score), 1) AS avg_health_score,

    -- Portal usage
    COALESCE(SUM(acm.active_portal_users), 0)::INTEGER AS total_portal_users,
    COALESCE(SUM(acm.reports_shared), 0)::INTEGER AS total_reports_shared,

    -- Activity
    MAX(acm.last_session_at) AS last_activity,
    COUNT(DISTINCT c.id) FILTER (
        WHERE acm.last_session_at > NOW() - INTERVAL '30 days'
    ) AS clients_active_30d

FROM organizations o
LEFT JOIN clients c ON c.org_id = o.id
LEFT JOIN agency_client_metrics acm ON acm.client_id = c.id
WHERE o.is_active = TRUE
GROUP BY o.id, o.name, o.subscription_tier;

COMMENT ON VIEW agency_overview IS 'High-level overview metrics per organization';


-- ============================================
-- 7. MATURITY DISTRIBUTION VIEW
-- ============================================

CREATE OR REPLACE VIEW agency_maturity_distribution AS
SELECT
    org_id,
    org_name,
    maturity_level,
    COUNT(*) AS client_count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY org_id), 1) AS percentage
FROM agency_client_metrics
WHERE client_status = 'active'
AND maturity_level IS NOT NULL
GROUP BY org_id, org_name, maturity_level
ORDER BY org_id, CASE maturity_level
    WHEN 'Nascent' THEN 1
    WHEN 'Emerging' THEN 2
    WHEN 'Developing' THEN 3
    WHEN 'Advanced' THEN 4
    WHEN 'Leading' THEN 5
END;

COMMENT ON VIEW agency_maturity_distribution IS 'Distribution of clients across maturity levels per organization';


-- ============================================
-- 8. TOP PERFORMERS VIEW
-- ============================================

CREATE OR REPLACE VIEW agency_top_performers AS
SELECT
    org_id,
    org_name,
    client_id,
    client_name,
    maturity_score,
    readiness_score,
    health_score,
    RANK() OVER (PARTITION BY org_id ORDER BY health_score DESC NULLS LAST) AS health_rank,
    RANK() OVER (PARTITION BY org_id ORDER BY maturity_score DESC NULLS LAST) AS maturity_rank
FROM agency_client_metrics
WHERE client_status = 'active';

COMMENT ON VIEW agency_top_performers IS 'Client rankings by health and maturity scores';


-- ============================================
-- 9. TREND ANALYSIS VIEW
-- ============================================

CREATE OR REPLACE VIEW agency_trends AS
SELECT
    ams.org_id,
    o.name AS org_name,
    ams.snapshot_date,
    ams.snapshot_type,
    ams.total_clients,
    ams.active_clients,
    ams.completed_sessions,
    ams.avg_maturity_score,
    ams.avg_health_score,

    -- Period over period changes
    ams.total_clients - LAG(ams.total_clients) OVER (
        PARTITION BY ams.org_id, ams.snapshot_type ORDER BY ams.snapshot_date
    ) AS clients_change,
    ams.completed_sessions - LAG(ams.completed_sessions) OVER (
        PARTITION BY ams.org_id, ams.snapshot_type ORDER BY ams.snapshot_date
    ) AS sessions_change,
    ams.avg_maturity_score - LAG(ams.avg_maturity_score) OVER (
        PARTITION BY ams.org_id, ams.snapshot_type ORDER BY ams.snapshot_date
    ) AS maturity_change

FROM agency_metrics_snapshots ams
JOIN organizations o ON ams.org_id = o.id
ORDER BY ams.org_id, ams.snapshot_date DESC;

COMMENT ON VIEW agency_trends IS 'Trend data with period-over-period changes';


-- ============================================
-- 10. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE agency_metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_score_history ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to agency_metrics_snapshots"
ON agency_metrics_snapshots FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to client_score_history"
ON client_score_history FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Org members can view their org's metrics
CREATE POLICY "Org members can view agency metrics"
ON agency_metrics_snapshots FOR SELECT TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid() AND status = 'active'
    )
);

CREATE POLICY "Org members can view client score history"
ON client_score_history FOR SELECT TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid() AND status = 'active'
    )
);

-- Grant view access
GRANT SELECT ON agency_client_metrics TO authenticated;
GRANT SELECT ON agency_client_metrics TO service_role;
GRANT SELECT ON agency_overview TO authenticated;
GRANT SELECT ON agency_overview TO service_role;
GRANT SELECT ON agency_maturity_distribution TO authenticated;
GRANT SELECT ON agency_maturity_distribution TO service_role;
GRANT SELECT ON agency_top_performers TO authenticated;
GRANT SELECT ON agency_top_performers TO service_role;
GRANT SELECT ON agency_trends TO authenticated;
GRANT SELECT ON agency_trends TO service_role;

-- Grant function execution
GRANT EXECUTE ON FUNCTION capture_agency_metrics_snapshot(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION capture_client_score_history() TO service_role;
