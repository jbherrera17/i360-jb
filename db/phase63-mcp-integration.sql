-- ============================================
-- PHASE 63: MCP INTEGRATION SYSTEM
-- Adds a generic MCP (Model Context Protocol) connection manager
-- allowing platform admins to catalog MCP servers and
-- org admins to connect them for agent/chat tool use.
-- ============================================

BEGIN;

-- ============================================
-- 1. MCP SERVER CATALOG
-- Platform admin managed. Defines available MCP servers.
-- ============================================

CREATE TABLE IF NOT EXISTS mcp_server_catalog (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    icon            TEXT DEFAULT 'plug',

    -- Transport
    transport_type  TEXT NOT NULL CHECK (transport_type IN ('streamable_http', 'stdio')),

    -- Streamable HTTP config
    default_url     TEXT,
    auth_type       TEXT CHECK (auth_type IN ('api_key', 'oauth2', 'none', 'bearer')),
    auth_config     JSONB DEFAULT '{}',

    -- Stdio config
    command         TEXT,
    args            TEXT[] DEFAULT '{}',
    env_schema      JSONB DEFAULT '{}',

    -- Cached capabilities (refreshed on test)
    tool_schemas        JSONB DEFAULT '[]',
    resource_schemas    JSONB DEFAULT '[]',
    prompt_schemas      JSONB DEFAULT '[]',

    -- Platform admin controls
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    rejection_reason TEXT,
    min_tier        TEXT REFERENCES subscription_tiers(id),
    platform_admin_only BOOLEAN DEFAULT FALSE,

    -- Meta
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_catalog_status ON mcp_server_catalog(status);
CREATE INDEX IF NOT EXISTS idx_mcp_catalog_slug ON mcp_server_catalog(slug);

COMMENT ON TABLE mcp_server_catalog IS 'Platform-managed catalog of available MCP servers';
COMMENT ON COLUMN mcp_server_catalog.auth_config IS 'JSON schema describing required credentials (e.g., {"fields": [{"name": "api_key", "label": "API Key", "type": "password", "required": true}]})';
COMMENT ON COLUMN mcp_server_catalog.env_schema IS 'For stdio: env vars required at spawn time (e.g., {"GITHUB_TOKEN": {"label": "GitHub Token", "required": true}})';

-- ============================================
-- 2. MCP ORG CONNECTIONS
-- Org admin managed. Active connections to catalog servers.
-- ============================================

CREATE TABLE IF NOT EXISTS mcp_org_connections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    catalog_id      UUID NOT NULL REFERENCES mcp_server_catalog(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,

    -- Credentials (AES-256-GCM encrypted at app layer)
    credentials_encrypted TEXT,

    -- Runtime state
    status          TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connected', 'error', 'disabled')),
    last_connected_at   TIMESTAMPTZ,
    last_error      TEXT,
    error_count     INTEGER DEFAULT 0,

    -- Discovered capabilities (refreshed on connect)
    discovered_tools        JSONB DEFAULT '[]',
    discovered_resources    JSONB DEFAULT '[]',
    discovered_prompts      JSONB DEFAULT '[]',
    capabilities_refreshed_at TIMESTAMPTZ,

    -- Settings
    enabled_tool_ids        TEXT[] DEFAULT '{}',
    auto_inject_resources   BOOLEAN DEFAULT FALSE,

    -- Audit
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(org_id, catalog_id)
);

CREATE INDEX IF NOT EXISTS idx_mcp_connections_org ON mcp_org_connections(org_id);
CREATE INDEX IF NOT EXISTS idx_mcp_connections_status ON mcp_org_connections(status);

COMMENT ON TABLE mcp_org_connections IS 'Per-org connections to approved MCP servers with encrypted credentials';

-- ============================================
-- 3. MCP TOOL INVOCATION LOG
-- Immutable audit trail of MCP tool calls.
-- ============================================

CREATE TABLE IF NOT EXISTS mcp_tool_invocation_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id   UUID REFERENCES mcp_org_connections(id) ON DELETE SET NULL,
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id),
    agent_id        UUID,
    conversation_id UUID,
    tool_name       TEXT NOT NULL,
    tool_input      JSONB,
    tool_result     JSONB,
    status          TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
    duration_ms     INTEGER,
    error_message   TEXT,
    invoked_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_invocations_org ON mcp_tool_invocation_log(org_id);
CREATE INDEX IF NOT EXISTS idx_mcp_invocations_connection ON mcp_tool_invocation_log(connection_id);
CREATE INDEX IF NOT EXISTS idx_mcp_invocations_date ON mcp_tool_invocation_log(invoked_at);

COMMENT ON TABLE mcp_tool_invocation_log IS 'Audit trail of all MCP tool invocations';

-- ============================================
-- 4. MCP RESOURCE CACHE
-- Cached resource contents for context injection.
-- ============================================

CREATE TABLE IF NOT EXISTS mcp_resource_cache (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id   UUID NOT NULL REFERENCES mcp_org_connections(id) ON DELETE CASCADE,
    resource_uri    TEXT NOT NULL,
    content         TEXT,
    mime_type       TEXT,
    fetched_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),

    UNIQUE(connection_id, resource_uri)
);

CREATE INDEX IF NOT EXISTS idx_mcp_resource_cache_conn ON mcp_resource_cache(connection_id);

-- ============================================
-- 5. MCP USAGE STATS
-- Monthly roll-up for tier enforcement.
-- ============================================

CREATE TABLE IF NOT EXISTS mcp_usage_stats (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    connection_id   UUID REFERENCES mcp_org_connections(id) ON DELETE SET NULL,
    month_year      TEXT NOT NULL,
    tool_calls      INTEGER DEFAULT 0,
    resource_fetches INTEGER DEFAULT 0,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(org_id, connection_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_mcp_usage_org_month ON mcp_usage_stats(org_id, month_year);

-- ============================================
-- 6. ADD MCP LIMIT COLUMNS TO SUBSCRIPTION_TIERS
-- ============================================

ALTER TABLE subscription_tiers
    ADD COLUMN IF NOT EXISTS max_mcp_connections INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_mcp_calls_monthly INTEGER DEFAULT 0;

COMMENT ON COLUMN subscription_tiers.max_mcp_connections IS 'Maximum MCP server connections per org (0=not included, -1=unlimited)';
COMMENT ON COLUMN subscription_tiers.max_mcp_calls_monthly IS 'Maximum MCP tool calls per month (0=not included, -1=unlimited)';

-- Set limits per tier
-- Starter: not included
UPDATE subscription_tiers SET max_mcp_connections = 0, max_mcp_calls_monthly = 0 WHERE id = 'starter';
-- Business: 3 connections, 1000 calls/month
UPDATE subscription_tiers SET max_mcp_connections = 3, max_mcp_calls_monthly = 1000 WHERE id = 'business';
-- Enterprise: 10 connections, 5000 calls/month
UPDATE subscription_tiers SET max_mcp_connections = 10, max_mcp_calls_monthly = 5000 WHERE id = 'enterprise';
-- Agency Starter: 5 connections, 2000 calls/month
UPDATE subscription_tiers SET max_mcp_connections = 5, max_mcp_calls_monthly = 2000 WHERE id = 'agency_starter';
-- Agency Professional: 15 connections, 10000 calls/month
UPDATE subscription_tiers SET max_mcp_connections = 15, max_mcp_calls_monthly = 10000 WHERE id = 'agency_professional';
-- Agency Enterprise: unlimited
UPDATE subscription_tiers SET max_mcp_connections = -1, max_mcp_calls_monthly = -1 WHERE id = 'agency_enterprise';
-- Platform (Synergi): unlimited
UPDATE subscription_tiers SET max_mcp_connections = -1, max_mcp_calls_monthly = -1 WHERE id = 'platform';

-- ============================================
-- 7. UPDATE check_org_limits FOR MCP
-- ============================================

DROP FUNCTION IF EXISTS check_org_limits(UUID, TEXT);

CREATE OR REPLACE FUNCTION check_org_limits(
    p_org_id UUID,
    p_resource_type TEXT
)
RETURNS TABLE (
    current_count INTEGER,
    max_allowed INTEGER,
    within_limits BOOLEAN,
    usage_percent NUMERIC(5,2)
) AS $$
DECLARE
    v_tier TEXT;
    v_limits RECORD;
    v_count INTEGER;
    v_max INTEGER;
    v_addon_max INTEGER;
BEGIN
    SELECT subscription_tier INTO v_tier FROM organizations WHERE id = p_org_id;
    IF v_tier IS NULL THEN v_tier := 'starter'; END IF;

    SELECT * INTO v_limits FROM subscription_tiers WHERE id = v_tier;

    CASE p_resource_type
        WHEN 'members' THEN
            SELECT COUNT(*) INTO v_count FROM organization_members WHERE org_id = p_org_id AND status = 'active';
            v_max := v_limits.max_members;
        WHEN 'clients' THEN
            SELECT COUNT(*) INTO v_count FROM clients WHERE org_id = p_org_id AND status != 'archived';
            v_max := v_limits.max_clients;
        WHEN 'agents' THEN
            SELECT COUNT(*) INTO v_count FROM agents WHERE org_id = p_org_id;
            v_max := v_limits.max_agents;
        WHEN 'workflows' THEN
            SELECT COUNT(*) INTO v_count FROM workflows WHERE org_id = p_org_id;
            v_max := v_limits.max_workflows;
        WHEN 'skills' THEN
            SELECT COUNT(*) INTO v_count FROM skills WHERE org_id = p_org_id;
            v_max := v_limits.max_skills;
        WHEN 'context_assets' THEN
            SELECT COUNT(*) INTO v_count FROM context_assets WHERE org_id = p_org_id;
            v_max := v_limits.max_context_assets;
        WHEN 'research_studios' THEN
            SELECT COUNT(*) INTO v_count FROM research_studios WHERE org_id = p_org_id;
            v_max := v_limits.max_research_studios;
        WHEN 'social_posts' THEN
            SELECT COUNT(*) INTO v_count FROM social_posts
            WHERE org_id = p_org_id
              AND created_at >= date_trunc('month', NOW())
              AND status NOT IN ('cancelled');
            v_max := COALESCE(v_limits.max_social_posts_monthly, 0);
            IF v_max = 0 THEN
                v_max := get_social_addon_limit(p_org_id, 'social_posts_monthly');
            END IF;
        WHEN 'social_channels' THEN
            SELECT COUNT(*) INTO v_count FROM social_platform_connections
            WHERE org_id = p_org_id AND status = 'active';
            v_max := COALESCE(v_limits.max_social_channels, 0);
            IF v_max = 0 THEN
                v_max := get_social_addon_limit(p_org_id, 'social_channels');
            END IF;
        WHEN 'mcp_connections' THEN
            SELECT COUNT(*) INTO v_count FROM mcp_org_connections
            WHERE org_id = p_org_id AND status != 'disabled';
            v_max := COALESCE(v_limits.max_mcp_connections, 0);
        WHEN 'mcp_calls' THEN
            SELECT COALESCE(SUM(tool_calls), 0) INTO v_count FROM mcp_usage_stats
            WHERE org_id = p_org_id AND month_year = to_char(NOW(), 'YYYY-MM');
            v_max := COALESCE(v_limits.max_mcp_calls_monthly, 0);
        ELSE
            v_count := 0;
            v_max := 0;
    END CASE;

    RETURN QUERY SELECT
        v_count,
        v_max,
        CASE WHEN v_max = -1 THEN TRUE ELSE v_count < v_max END,
        CASE
            WHEN v_max = -1 THEN 0.00
            WHEN v_max > 0 THEN ROUND((v_count::NUMERIC / v_max) * 100, 2)
            ELSE 0.00
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_org_limits(UUID, TEXT) TO authenticated;

-- ============================================
-- 8. HELPER: GET ORG MCP TOOLS
-- Returns all enabled tool definitions for an org.
-- ============================================

CREATE OR REPLACE FUNCTION get_org_mcp_tools(p_org_id UUID)
RETURNS TABLE (
    connection_id UUID,
    connection_name TEXT,
    catalog_slug TEXT,
    tool_def JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS connection_id,
        c.name AS connection_name,
        cat.slug AS catalog_slug,
        tool.value AS tool_def
    FROM mcp_org_connections c
    JOIN mcp_server_catalog cat ON cat.id = c.catalog_id
    CROSS JOIN LATERAL jsonb_array_elements(c.discovered_tools) AS tool(value)
    WHERE c.org_id = p_org_id
      AND c.status = 'connected'
      AND tool.value->>'name' = ANY(c.enabled_tool_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_org_mcp_tools(UUID) TO authenticated;

-- ============================================
-- 9. INSERT MCP INTEGRATIONS MODULE
-- ============================================

INSERT INTO platform_modules (
    id, name, description, icon, route_path,
    min_tier, min_business_role, category, nav_group,
    display_order, is_active, platform_admin_only
)
VALUES (
    'mcp_integrations',
    'MCP Connections',
    'Connect external MCP servers to enable AI agent tool use',
    'plug-zap',
    '/mcp-connections.html',
    'business',
    NULL,
    'tool',
    'tools',
    70,
    TRUE,
    FALSE
)
ON CONFLICT (id) DO UPDATE SET
    name                = EXCLUDED.name,
    description         = EXCLUDED.description,
    icon                = EXCLUDED.icon,
    route_path          = EXCLUDED.route_path,
    min_tier            = EXCLUDED.min_tier,
    category            = EXCLUDED.category,
    nav_group           = EXCLUDED.nav_group,
    display_order       = EXCLUDED.display_order,
    is_active           = EXCLUDED.is_active,
    platform_admin_only = EXCLUDED.platform_admin_only;

-- Platform admin catalog management page
INSERT INTO platform_modules (
    id, name, description, icon, route_path,
    min_tier, min_business_role, category, nav_group,
    display_order, is_active, platform_admin_only
)
VALUES (
    'mcp_catalog_admin',
    'MCP Catalog',
    'Manage the platform MCP server catalog',
    'server',
    '/admin-mcp-catalog.html',
    NULL,
    NULL,
    'admin',
    'admin',
    64,
    TRUE,
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    name                = EXCLUDED.name,
    description         = EXCLUDED.description,
    icon                = EXCLUDED.icon,
    route_path          = EXCLUDED.route_path,
    category            = EXCLUDED.category,
    nav_group           = EXCLUDED.nav_group,
    display_order       = EXCLUDED.display_order,
    is_active           = EXCLUDED.is_active,
    platform_admin_only = EXCLUDED.platform_admin_only;

-- ============================================
-- 10. RLS POLICIES
-- ============================================

ALTER TABLE mcp_server_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_org_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_tool_invocation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_resource_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_usage_stats ENABLE ROW LEVEL SECURITY;

-- Catalog: all authenticated can read approved; platform admins can manage all
CREATE POLICY mcp_catalog_select ON mcp_server_catalog FOR SELECT TO authenticated
    USING (status = 'approved' OR is_platform_admin(auth.uid()));

CREATE POLICY mcp_catalog_insert ON mcp_server_catalog FOR INSERT TO authenticated
    WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY mcp_catalog_update ON mcp_server_catalog FOR UPDATE TO authenticated
    USING (is_platform_admin(auth.uid()));

CREATE POLICY mcp_catalog_delete ON mcp_server_catalog FOR DELETE TO authenticated
    USING (is_platform_admin(auth.uid()));

-- Connections: org members can manage their org's connections
CREATE POLICY mcp_connections_select ON mcp_org_connections FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY mcp_connections_insert ON mcp_org_connections FOR INSERT TO authenticated
    WITH CHECK (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY mcp_connections_update ON mcp_org_connections FOR UPDATE TO authenticated
    USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY mcp_connections_delete ON mcp_org_connections FOR DELETE TO authenticated
    USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'));

-- Invocation log: org members can read their org's logs
CREATE POLICY mcp_invocations_select ON mcp_tool_invocation_log FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY mcp_invocations_insert ON mcp_tool_invocation_log FOR INSERT TO authenticated
    WITH CHECK (TRUE);

-- Resource cache: via connection's org
CREATE POLICY mcp_resource_cache_all ON mcp_resource_cache FOR ALL TO authenticated
    USING (connection_id IN (
        SELECT id FROM mcp_org_connections WHERE org_id IN (
            SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'
        )
    ));

-- Usage stats: org members can read
CREATE POLICY mcp_usage_stats_select ON mcp_usage_stats FOR SELECT TO authenticated
    USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY mcp_usage_stats_insert ON mcp_usage_stats FOR INSERT TO authenticated
    WITH CHECK (TRUE);

CREATE POLICY mcp_usage_stats_update ON mcp_usage_stats FOR UPDATE TO authenticated
    USING (TRUE);

-- ============================================
-- 11. UPDATED_AT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_mcp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mcp_catalog_updated_at
    BEFORE UPDATE ON mcp_server_catalog
    FOR EACH ROW EXECUTE FUNCTION update_mcp_updated_at();

CREATE TRIGGER trg_mcp_connections_updated_at
    BEFORE UPDATE ON mcp_org_connections
    FOR EACH ROW EXECUTE FUNCTION update_mcp_updated_at();

-- ============================================
-- VERIFY
-- ============================================

SELECT id, name, nav_group, display_order, platform_admin_only, route_path
FROM platform_modules
WHERE id IN ('mcp_integrations', 'mcp_catalog_admin')
ORDER BY display_order;

SELECT id, max_mcp_connections, max_mcp_calls_monthly
FROM subscription_tiers
ORDER BY display_order;

COMMIT;
