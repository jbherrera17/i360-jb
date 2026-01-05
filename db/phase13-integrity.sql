-- ============================================
-- PHASE 13: INTEGRITY TRACKING SCHEMA
-- ============================================
-- This schema implements component integrity tracking:
-- - Component health monitoring
-- - Metric collection and thresholds
-- - Alert and incident tracking
-- - Performance trends
--
-- Run: Execute this SQL in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. COMPONENTS REGISTRY
-- ============================================
-- All tracked system components

CREATE TABLE IF NOT EXISTS integrity_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Component identity
    component_key TEXT NOT NULL UNIQUE, -- e.g., 'llm_anthropic', 'db_supabase', 'agent_strategy'
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'system', -- 'system', 'integration', 'feature', 'agent'

    -- Dependencies
    depends_on TEXT[], -- Array of component_keys this depends on

    -- Display
    icon TEXT DEFAULT 'box',
    color TEXT DEFAULT '#6366f1',

    -- Status
    is_monitored BOOLEAN DEFAULT true,
    is_critical BOOLEAN DEFAULT false, -- Critical components trigger alerts

    -- Health check configuration
    health_check_interval INTEGER DEFAULT 60, -- Seconds between checks
    health_check_endpoint TEXT, -- Optional URL to ping

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_integrity_components_key ON integrity_components(component_key);
CREATE INDEX IF NOT EXISTS idx_integrity_components_category ON integrity_components(category);

-- ============================================
-- 2. COMPONENT METRICS
-- ============================================
-- Metric definitions for each component

CREATE TABLE IF NOT EXISTS integrity_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id UUID NOT NULL REFERENCES integrity_components(id) ON DELETE CASCADE,

    -- Metric identity
    metric_key TEXT NOT NULL, -- e.g., 'response_time', 'error_rate', 'uptime'
    name TEXT NOT NULL,
    description TEXT,

    -- Measurement
    unit TEXT, -- 'ms', '%', 'count', 'bytes'
    metric_type TEXT DEFAULT 'gauge', -- 'gauge', 'counter', 'histogram'

    -- Thresholds
    warning_threshold NUMERIC,
    critical_threshold NUMERIC,
    threshold_direction TEXT DEFAULT 'above', -- 'above', 'below'

    -- Display
    display_format TEXT, -- '0.2f', '0%', etc.

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(component_id, metric_key)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_integrity_metrics_component ON integrity_metrics(component_id);

-- ============================================
-- 3. METRIC VALUES (Time-series data)
-- ============================================
-- Actual metric values over time

CREATE TABLE IF NOT EXISTS integrity_metric_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_id UUID NOT NULL REFERENCES integrity_metrics(id) ON DELETE CASCADE,

    -- Value
    value NUMERIC NOT NULL,
    status TEXT DEFAULT 'normal', -- 'normal', 'warning', 'critical'

    -- Context
    context JSONB DEFAULT '{}', -- Additional data points

    -- Timestamp
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for time-series queries
CREATE INDEX IF NOT EXISTS idx_metric_values_metric ON integrity_metric_values(metric_id);
CREATE INDEX IF NOT EXISTS idx_metric_values_time ON integrity_metric_values(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_metric_values_status ON integrity_metric_values(status) WHERE status != 'normal';

-- Partition hint: Consider partitioning by month for large datasets
-- CREATE TABLE integrity_metric_values_YYYY_MM PARTITION OF integrity_metric_values
-- FOR VALUES FROM ('YYYY-MM-01') TO ('YYYY-MM+1-01');

-- ============================================
-- 4. COMPONENT STATUS (Current state)
-- ============================================
-- Latest status for each component

CREATE TABLE IF NOT EXISTS integrity_component_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id UUID NOT NULL REFERENCES integrity_components(id) ON DELETE CASCADE UNIQUE,

    -- Status
    status TEXT DEFAULT 'healthy', -- 'healthy', 'degraded', 'unhealthy', 'unknown'
    status_message TEXT,

    -- Health score (0-100)
    health_score INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),

    -- Timestamps
    last_check_at TIMESTAMP WITH TIME ZONE,
    last_healthy_at TIMESTAMP WITH TIME ZONE,
    status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Uptime tracking
    uptime_percentage NUMERIC(5,2) DEFAULT 100.00, -- Last 30 days
    consecutive_failures INTEGER DEFAULT 0,

    -- Metadata
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_component_status_status ON integrity_component_status(status);

-- ============================================
-- 5. INCIDENTS
-- ============================================
-- Track incidents and outages

CREATE TABLE IF NOT EXISTS integrity_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id UUID REFERENCES integrity_components(id) ON DELETE SET NULL,

    -- Incident details
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'

    -- Status
    status TEXT DEFAULT 'investigating', -- 'investigating', 'identified', 'monitoring', 'resolved'

    -- Timeline
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    identified_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,

    -- Impact
    affected_components TEXT[], -- Array of component_keys
    impact_description TEXT,

    -- Resolution
    resolution_notes TEXT,
    root_cause TEXT,

    -- Owner
    assigned_to UUID REFERENCES users(id),

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_incidents_component ON integrity_incidents(component_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON integrity_incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON integrity_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_started ON integrity_incidents(started_at DESC);

-- ============================================
-- 6. INCIDENT UPDATES
-- ============================================
-- Updates/comments on incidents

CREATE TABLE IF NOT EXISTS integrity_incident_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES integrity_incidents(id) ON DELETE CASCADE,

    -- Update content
    update_type TEXT DEFAULT 'update', -- 'update', 'status_change', 'resolution'
    content TEXT NOT NULL,

    -- Status at time of update
    new_status TEXT,

    -- Authorship
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_incident_updates_incident ON integrity_incident_updates(incident_id);

-- ============================================
-- 7. ALERTS
-- ============================================
-- Alert configuration and history

CREATE TABLE IF NOT EXISTS integrity_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id UUID REFERENCES integrity_components(id) ON DELETE SET NULL,
    metric_id UUID REFERENCES integrity_metrics(id) ON DELETE SET NULL,

    -- Alert details
    alert_type TEXT NOT NULL, -- 'threshold', 'availability', 'error_rate'
    severity TEXT DEFAULT 'warning', -- 'info', 'warning', 'error', 'critical'
    message TEXT NOT NULL,

    -- Context
    threshold_value NUMERIC,
    actual_value NUMERIC,

    -- Status
    status TEXT DEFAULT 'active', -- 'active', 'acknowledged', 'resolved'
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alerts_component ON integrity_alerts(component_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON integrity_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered ON integrity_alerts(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON integrity_alerts(severity);

-- ============================================
-- 8. RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE integrity_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrity_metric_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrity_component_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrity_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrity_incident_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrity_alerts ENABLE ROW LEVEL SECURITY;

-- Components: Viewable by all authenticated, editable by admins
CREATE POLICY "All users can view components"
ON integrity_components FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage components"
ON integrity_components FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Metrics: Same as components
CREATE POLICY "All users can view metrics"
ON integrity_metrics FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage metrics"
ON integrity_metrics FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Metric values: Viewable by all, insertable by system
CREATE POLICY "All users can view metric values"
ON integrity_metric_values FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can insert metric values"
ON integrity_metric_values FOR INSERT
TO authenticated
WITH CHECK (true);

-- Component status: Viewable by all
CREATE POLICY "All users can view component status"
ON integrity_component_status FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can update component status"
ON integrity_component_status FOR ALL
TO authenticated
USING (true);

-- Incidents: Viewable by managers+, editable by admins
CREATE POLICY "Managers can view incidents"
ON integrity_incidents FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_effective_permissions
        WHERE user_effective_permissions.user_id = auth.uid()
        AND user_effective_permissions.business_role_level >= 3
    )
    OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

CREATE POLICY "Admins can manage incidents"
ON integrity_incidents FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Incident updates: Same as incidents
CREATE POLICY "Managers can view incident updates"
ON integrity_incident_updates FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_effective_permissions
        WHERE user_effective_permissions.user_id = auth.uid()
        AND user_effective_permissions.business_role_level >= 3
    )
    OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

CREATE POLICY "Managers can add incident updates"
ON integrity_incident_updates FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_effective_permissions
        WHERE user_effective_permissions.user_id = auth.uid()
        AND user_effective_permissions.business_role_level >= 3
    )
    OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Alerts: Viewable by all, manageable by admins
CREATE POLICY "All users can view alerts"
ON integrity_alerts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage alerts"
ON integrity_alerts FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- ============================================
-- 9. TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_integrity_components_updated_at ON integrity_components;
CREATE TRIGGER update_integrity_components_updated_at
    BEFORE UPDATE ON integrity_components
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_integrity_status_updated_at ON integrity_component_status;
CREATE TRIGGER update_integrity_status_updated_at
    BEFORE UPDATE ON integrity_component_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_integrity_incidents_updated_at ON integrity_incidents;
CREATE TRIGGER update_integrity_incidents_updated_at
    BEFORE UPDATE ON integrity_incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_integrity_alerts_updated_at ON integrity_alerts;
CREATE TRIGGER update_integrity_alerts_updated_at
    BEFORE UPDATE ON integrity_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. SEED DEFAULT COMPONENTS
-- ============================================

INSERT INTO integrity_components (component_key, name, description, category, icon, color, is_critical)
VALUES
    -- System Components
    ('api_server', 'API Server', 'Main Express.js API server', 'system', 'server', '#3b82f6', true),
    ('db_supabase', 'Supabase Database', 'PostgreSQL database via Supabase', 'system', 'database', '#10b981', true),
    ('auth_service', 'Authentication', 'User authentication service', 'system', 'shield', '#8b5cf6', true),

    -- LLM Integrations
    ('llm_anthropic', 'Anthropic Claude', 'Claude AI integration', 'integration', 'brain', '#f59e0b', true),
    ('llm_openai', 'OpenAI GPT', 'GPT integration', 'integration', 'brain', '#10b981', false),

    -- Features
    ('feature_s2e', 'Strategy to Execution', 'S2E module', 'feature', 'target', '#6366f1', false),
    ('feature_execute120', 'Execute 120', 'Department execution hub', 'feature', 'play', '#ec4899', false),
    ('feature_align120', 'Align 120', 'Company alignment', 'feature', 'compass', '#f59e0b', false),
    ('feature_briefing', 'Daily Briefing', 'Automated briefings', 'feature', 'newspaper', '#3b82f6', false),
    ('feature_agents', 'Agent Library', 'AI agent management', 'feature', 'bot', '#8b5cf6', false),

    -- Search Integrations
    ('search_brave', 'Brave Search', 'Brave web search API', 'integration', 'search', '#f97316', false),
    ('search_tavily', 'Tavily Search', 'Tavily AI search', 'integration', 'search', '#06b6d4', false)
ON CONFLICT (component_key) DO NOTHING;

-- Seed default metrics for critical components
INSERT INTO integrity_metrics (component_id, metric_key, name, unit, warning_threshold, critical_threshold, threshold_direction)
SELECT
    c.id,
    m.metric_key,
    m.name,
    m.unit,
    m.warning_threshold,
    m.critical_threshold,
    m.threshold_direction
FROM integrity_components c
CROSS JOIN (
    VALUES
        ('response_time', 'Response Time', 'ms', 500, 2000, 'above'),
        ('error_rate', 'Error Rate', '%', 1, 5, 'above'),
        ('uptime', 'Uptime', '%', 99.5, 99, 'below')
) AS m(metric_key, name, unit, warning_threshold, critical_threshold, threshold_direction)
WHERE c.is_critical = true
ON CONFLICT (component_id, metric_key) DO NOTHING;

-- Initialize component status
INSERT INTO integrity_component_status (component_id, status, health_score, last_healthy_at)
SELECT id, 'healthy', 100, NOW()
FROM integrity_components
ON CONFLICT (component_id) DO NOTHING;

-- ============================================
-- 11. VIEWS
-- ============================================

-- System Health Overview
CREATE OR REPLACE VIEW integrity_system_health AS
SELECT
    c.component_key,
    c.name,
    c.category,
    c.icon,
    c.color,
    c.is_critical,
    cs.status,
    cs.health_score,
    cs.uptime_percentage,
    cs.last_check_at,
    cs.status_changed_at,
    (
        SELECT COUNT(*)
        FROM integrity_alerts a
        WHERE a.component_id = c.id
        AND a.status = 'active'
    ) AS active_alerts
FROM integrity_components c
LEFT JOIN integrity_component_status cs ON c.id = cs.component_id
WHERE c.is_monitored = true
ORDER BY c.is_critical DESC, c.name;

-- Active Incidents
CREATE OR REPLACE VIEW integrity_active_incidents AS
SELECT
    i.*,
    c.name AS component_name,
    c.icon AS component_icon,
    u.display_name AS assigned_to_name
FROM integrity_incidents i
LEFT JOIN integrity_components c ON i.component_id = c.id
LEFT JOIN users u ON i.assigned_to = u.id
WHERE i.status != 'resolved'
ORDER BY
    CASE i.severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        ELSE 4
    END,
    i.started_at DESC;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check system health
-- SELECT * FROM integrity_system_health;

-- Check active incidents
-- SELECT * FROM integrity_active_incidents;

-- Check recent alerts
-- SELECT * FROM integrity_alerts WHERE status = 'active' ORDER BY triggered_at DESC;

-- ============================================
-- END OF PHASE 13 INTEGRITY SCHEMA
-- ============================================
