-- ===========================================
-- Phase 48: Integration Framework
-- External integrations architecture for i360
-- ===========================================

-- ===========================================
-- INTEGRATION PROVIDERS (Platform-defined)
-- ===========================================
CREATE TABLE IF NOT EXISTS integration_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Provider identity
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,

    -- OAuth configuration
    auth_type TEXT NOT NULL,
    oauth_auth_url TEXT,
    oauth_token_url TEXT,
    default_scopes TEXT[],

    -- Provider metadata
    icon_url TEXT,
    documentation_url TEXT,
    capabilities JSONB,

    -- Pricing
    addon_category TEXT,
    base_monthly_price DECIMAL(10,2),

    -- Status
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- USER INTEGRATIONS (Per-user OAuth connections)
-- ===========================================
CREATE TABLE IF NOT EXISTS user_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES integration_providers(id),
    org_id UUID REFERENCES organizations(id),

    -- Provider-side identity
    external_user_id TEXT,
    external_email TEXT,
    external_profile JSONB,

    -- Credentials (encrypted at application level)
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes TEXT[],

    -- For API key auth
    api_key_encrypted TEXT,
    api_endpoint TEXT,

    -- Status tracking
    status TEXT DEFAULT 'active',
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,
    error_count INTEGER DEFAULT 0,

    -- Metadata
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, provider_id)
);

-- ===========================================
-- ORG INTEGRATIONS (Shared organization-level)
-- ===========================================
CREATE TABLE IF NOT EXISTS org_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES integration_providers(id),

    -- Connection details
    instance_url TEXT,
    instance_name TEXT,

    -- Admin credentials (encrypted)
    admin_api_key_encrypted TEXT,
    admin_credentials_encrypted JSONB,

    -- OAuth app credentials
    oauth_client_id TEXT,
    oauth_client_secret_encrypted TEXT,

    -- Status
    status TEXT DEFAULT 'active',
    last_health_check TIMESTAMPTZ,
    health_status TEXT,

    -- Configuration
    sync_settings JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(org_id, provider_id)
);

-- ===========================================
-- INTEGRATION SUBSCRIPTIONS (Billing tracking)
-- ===========================================
CREATE TABLE IF NOT EXISTS integration_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES integration_providers(id),

    addon_type TEXT NOT NULL,
    monthly_price DECIMAL(10,2) NOT NULL,
    setup_fee DECIMAL(10,2) DEFAULT 0,
    billing_status TEXT DEFAULT 'active',

    -- Usage tracking
    api_calls_this_month INTEGER DEFAULT 0,
    api_call_limit INTEGER,
    users_connected INTEGER DEFAULT 0,
    user_limit INTEGER,

    -- Dates
    started_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    next_billing_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(org_id, provider_id)
);

-- ===========================================
-- SYNC LOG (Audit trail for data sync)
-- ===========================================
CREATE TABLE IF NOT EXISTS integration_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    integration_id UUID,
    integration_type TEXT,
    provider_slug TEXT NOT NULL,

    sync_type TEXT NOT NULL,
    direction TEXT NOT NULL,
    entity_type TEXT,

    -- Results
    status TEXT NOT NULL,
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_details JSONB,

    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    user_id UUID,
    org_id UUID
);

-- ===========================================
-- CRM ENTITY MAPPING
-- ===========================================
CREATE TABLE IF NOT EXISTS crm_entity_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),

    i360_entity_type TEXT NOT NULL,
    i360_entity_id UUID NOT NULL,

    crm_provider TEXT NOT NULL,
    crm_entity_type TEXT NOT NULL,
    crm_entity_id TEXT NOT NULL,

    last_sync_at TIMESTAMPTZ,
    sync_direction TEXT DEFAULT 'bidirectional',

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(i360_entity_type, i360_entity_id, crm_provider)
);

-- ===========================================
-- CRM ACTIVITIES
-- ===========================================
CREATE TABLE IF NOT EXISTS crm_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),

    crm_provider TEXT NOT NULL,
    crm_activity_id TEXT NOT NULL,
    crm_activity_type TEXT NOT NULL,

    client_id UUID,
    contact_id UUID,
    deal_id UUID,

    subject TEXT,
    description TEXT,
    status TEXT,
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    assigned_to UUID REFERENCES users(id),

    raw_data JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(crm_provider, crm_activity_id, org_id)
);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_entity_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY user_integrations_policy ON user_integrations
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY org_integrations_policy ON org_integrations
    FOR ALL USING (
        org_id IN (
            SELECT org_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY integration_subscriptions_policy ON integration_subscriptions
    FOR ALL USING (
        org_id IN (
            SELECT org_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY sync_log_policy ON integration_sync_log
    FOR ALL USING (
        user_id = auth.uid()
        OR org_id IN (
            SELECT org_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY crm_entity_mapping_policy ON crm_entity_mapping
    FOR ALL USING (
        org_id IN (
            SELECT org_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY crm_activities_policy ON crm_activities
    FOR ALL USING (
        org_id IN (
            SELECT org_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX idx_user_integrations_user ON user_integrations(user_id);
CREATE INDEX idx_user_integrations_provider ON user_integrations(provider_id);
CREATE INDEX idx_org_integrations_org ON org_integrations(org_id);
CREATE INDEX idx_integration_subscriptions_org ON integration_subscriptions(org_id);
CREATE INDEX idx_sync_log_provider ON integration_sync_log(provider_slug);
CREATE INDEX idx_sync_log_status ON integration_sync_log(status);
CREATE INDEX idx_crm_entity_mapping_org ON crm_entity_mapping(org_id);
CREATE INDEX idx_crm_activities_org ON crm_activities(org_id);
CREATE INDEX idx_crm_activities_client ON crm_activities(client_id);

-- ===========================================
-- SEED: Default Integration Providers
-- ===========================================
INSERT INTO integration_providers (slug, name, category, auth_type, addon_category, base_monthly_price, capabilities, status)
VALUES
    ('google', 'Google Workspace', 'productivity', 'oauth2', 'productivity', 99.00,
     '{"entities": ["emails", "files", "events", "documents"], "operations": ["read", "write"], "features": ["oauth", "webhooks"]}',
     'active'),
    ('microsoft', 'Microsoft 365', 'productivity', 'oauth2', 'productivity', 99.00,
     '{"entities": ["emails", "files", "events", "teams"], "operations": ["read", "write"], "features": ["oauth", "webhooks"]}',
     'beta'),
    ('salesforce', 'Salesforce', 'crm', 'oauth2', 'client_system', 299.00,
     '{"entities": ["contacts", "accounts", "opportunities", "activities"], "operations": ["read", "write", "sync"], "features": ["oauth", "webhooks", "batch"]}',
     'active'),
    ('hubspot', 'HubSpot', 'crm', 'oauth2', 'client_system', 299.00,
     '{"entities": ["contacts", "companies", "deals", "activities"], "operations": ["read", "write", "sync"], "features": ["oauth", "webhooks"]}',
     'active'),
    ('slack', 'Slack', 'communication', 'oauth2', 'productivity', 99.00,
     '{"entities": ["messages", "channels"], "operations": ["read", "write"], "features": ["oauth", "webhooks"]}',
     'beta'),
    ('espocrm', 'EspoCRM', 'crm', 'api_key', 'client_system', 0,
     '{"entities": ["contacts", "accounts", "leads", "opportunities", "activities"], "operations": ["read", "write", "sync"], "features": ["api_key", "webhooks"]}',
     'active'),
    ('strapi', 'Strapi CMS', 'cms', 'api_key', 'productivity', 0,
     '{"entities": ["content_types", "entries", "media"], "operations": ["read", "write"], "features": ["api_key"]}',
     'active')
ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- REGISTER MODULE
-- ===========================================
INSERT INTO platform_modules (id, name, description, icon, route_path, category, nav_group, display_order, is_active)
VALUES (
    'integrations',
    'Integrations',
    'Connect external services like Google Workspace, CRM, and more',
    'plug',
    '/integrations.html',
    'tool',
    'tools',
    50,
    TRUE
)
ON CONFLICT (id) DO NOTHING;
