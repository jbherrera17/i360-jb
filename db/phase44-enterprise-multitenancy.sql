-- ============================================
-- Phase 44: Enterprise Multi-Tenancy Enhancement
-- Tier System, Module Access Control, Platform Administration
-- ============================================
--
-- This schema extends Phase 39's agency foundation with:
-- - Four-tier subscription system (Starter, Business, Enterprise, Agency)
-- - Module-based feature access control
-- - Platform administration for Synergi
-- - Role-based module visibility
-- - Resource limit enforcement
--
-- ============================================

-- ============================================
-- 1. SUBSCRIPTION TIERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_tiers (
    id TEXT PRIMARY KEY,  -- 'starter', 'business', 'enterprise', 'agency'
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,

    -- Pricing (for display, actual billing via Stripe)
    price_monthly NUMERIC(10,2),
    price_yearly NUMERIC(10,2),
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly TEXT,

    -- Resource limits
    max_members INTEGER DEFAULT 5,
    max_clients INTEGER DEFAULT 0,        -- 0 = no clients (not an agency)
    max_agents INTEGER DEFAULT 10,
    max_workflows INTEGER DEFAULT 5,
    max_skills INTEGER DEFAULT 20,
    max_context_assets INTEGER DEFAULT 50,
    max_research_studios INTEGER DEFAULT 3,
    max_monthly_api_calls INTEGER DEFAULT 1000,
    max_storage_gb NUMERIC(5,2) DEFAULT 1.0,

    -- Feature flags
    features JSONB DEFAULT '{}'::jsonb,
    -- Example structure:
    -- {
    --   "white_label": false,
    --   "custom_branding": false,
    --   "api_access": false,
    --   "sso": false,
    --   "priority_support": false,
    --   "advanced_analytics": false,
    --   "custom_integrations": false
    -- }

    -- Self-service upgrade allowed
    allow_self_upgrade BOOLEAN DEFAULT TRUE,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_tiers_active ON subscription_tiers(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_subscription_tiers_order ON subscription_tiers(display_order);

COMMENT ON TABLE subscription_tiers IS 'Subscription tier definitions with resource limits and features';
COMMENT ON COLUMN subscription_tiers.id IS 'Tier identifier: starter, business, enterprise, agency';
COMMENT ON COLUMN subscription_tiers.features IS 'JSON object of feature flags enabled for this tier';
COMMENT ON COLUMN subscription_tiers.allow_self_upgrade IS 'If true, orgs can upgrade to this tier via Stripe. Agency requires manual approval.';


-- ============================================
-- 2. PLATFORM MODULES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS platform_modules (
    id TEXT PRIMARY KEY,  -- 'research_studio', 'briefing', 'thought_leadership', etc.
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,            -- Lucide icon name
    route_path TEXT,      -- '/research-studio.html'

    -- Access requirements
    min_tier TEXT REFERENCES subscription_tiers(id),  -- NULL = available to all tiers
    min_business_role TEXT REFERENCES business_role_levels(id),  -- NULL = all roles

    -- Dependencies
    requires_modules TEXT[],  -- Other modules that must be enabled first

    -- Categorization
    category TEXT CHECK (category IN ('dashboard', 'system', 'tool', 'agency', 'admin')),
    nav_group TEXT,       -- Navigation group ID for frontend

    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_beta BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_modules_category ON platform_modules(category);
CREATE INDEX IF NOT EXISTS idx_platform_modules_tier ON platform_modules(min_tier);
CREATE INDEX IF NOT EXISTS idx_platform_modules_active ON platform_modules(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE platform_modules IS 'Platform modules/features with tier and role requirements';
COMMENT ON COLUMN platform_modules.min_tier IS 'Minimum subscription tier required. NULL means all tiers.';
COMMENT ON COLUMN platform_modules.min_business_role IS 'Minimum business role level required. NULL means all roles.';
COMMENT ON COLUMN platform_modules.nav_group IS 'Frontend navigation group: primary, systems, tools, agency, admin';


-- ============================================
-- 3. ORGANIZATION MODULE ACCESS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS org_module_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL REFERENCES platform_modules(id) ON DELETE CASCADE,

    is_enabled BOOLEAN DEFAULT TRUE,
    enabled_at TIMESTAMPTZ,
    enabled_by UUID REFERENCES auth.users(id),
    disabled_at TIMESTAMPTZ,
    disabled_by UUID REFERENCES auth.users(id),

    -- Custom settings per module for this org
    settings JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(org_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_org_module_access_org ON org_module_access(org_id);
CREATE INDEX IF NOT EXISTS idx_org_module_access_module ON org_module_access(module_id);
CREATE INDEX IF NOT EXISTS idx_org_module_access_enabled ON org_module_access(org_id, is_enabled) WHERE is_enabled = TRUE;

COMMENT ON TABLE org_module_access IS 'Per-organization module enable/disable overrides';
COMMENT ON COLUMN org_module_access.settings IS 'Organization-specific settings for this module';


-- ============================================
-- 4. PLATFORM ADMINS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS platform_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'support')),
    -- super_admin: Full platform control, can manage other admins
    -- admin: Manage orgs, tiers, modules, users
    -- support: Read-only access for customer support

    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),

    notes TEXT,  -- Why this person has admin access

    is_active BOOLEAN DEFAULT TRUE,
    last_access_at TIMESTAMPTZ,

    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_admins_user ON platform_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_admins_role ON platform_admins(role);
CREATE INDEX IF NOT EXISTS idx_platform_admins_active ON platform_admins(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE platform_admins IS 'Synergi platform administrators with elevated access';
COMMENT ON COLUMN platform_admins.role IS 'super_admin=full control, admin=manage platform, support=read-only';


-- ============================================
-- 5. ROLE MODULE ACCESS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS role_module_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,  -- NULL = global default
    business_role TEXT NOT NULL REFERENCES business_role_levels(id),
    module_id TEXT NOT NULL REFERENCES platform_modules(id) ON DELETE CASCADE,

    can_access BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(org_id, business_role, module_id)
);

CREATE INDEX IF NOT EXISTS idx_role_module_access_org ON role_module_access(org_id);
CREATE INDEX IF NOT EXISTS idx_role_module_access_role ON role_module_access(business_role);
CREATE INDEX IF NOT EXISTS idx_role_module_access_module ON role_module_access(module_id);

COMMENT ON TABLE role_module_access IS 'Business role to module access mapping. NULL org_id means global default.';


-- ============================================
-- 6. PLATFORM CONFIGURATION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS platform_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Platform identity
    platform_name TEXT DEFAULT 'Insight 360',
    platform_owner_org_id UUID REFERENCES organizations(id),  -- Synergi's org

    -- Global defaults
    default_tier TEXT DEFAULT 'starter' REFERENCES subscription_tiers(id),
    trial_duration_days INTEGER DEFAULT 14,

    -- Feature flags (global)
    feature_flags JSONB DEFAULT '{}'::jsonb,

    -- Maintenance mode
    maintenance_mode BOOLEAN DEFAULT FALSE,
    maintenance_message TEXT,
    maintenance_ends_at TIMESTAMPTZ,

    -- Stripe configuration
    stripe_enabled BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE platform_config IS 'Global platform configuration (singleton table)';


-- ============================================
-- 7. ENHANCE ORGANIZATIONS TABLE
-- ============================================

-- Add new columns to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS org_type TEXT DEFAULT 'standard'
    CHECK (org_type IN ('platform', 'agency', 'standard', 'client')),
ADD COLUMN IF NOT EXISTS parent_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_platform_owner BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS billing_email TEXT;

CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(org_type);
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON organizations(parent_org_id);
CREATE INDEX IF NOT EXISTS idx_organizations_platform_owner ON organizations(is_platform_owner) WHERE is_platform_owner = TRUE;

COMMENT ON COLUMN organizations.org_type IS 'platform=Synergi, agency=serves clients, standard=regular org, client=agency sub-client';
COMMENT ON COLUMN organizations.parent_org_id IS 'For client orgs, references the parent agency';
COMMENT ON COLUMN organizations.is_platform_owner IS 'True for Synergi (the platform owner org)';

-- Update subscription_tier constraint to allow new tiers
-- First drop the old constraint if it exists
DO $$
BEGIN
    ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subscription_tier_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Add new constraint with all tier options
ALTER TABLE organizations
ADD CONSTRAINT organizations_subscription_tier_check
CHECK (subscription_tier IN ('free', 'starter', 'business', 'enterprise', 'agency', 'pro'));


-- ============================================
-- 8. SEED SUBSCRIPTION TIERS
-- ============================================

INSERT INTO subscription_tiers (id, name, description, display_order,
    price_monthly, price_yearly,
    max_members, max_clients, max_agents, max_workflows, max_skills,
    max_context_assets, max_research_studios, max_monthly_api_calls, max_storage_gb,
    features, allow_self_upgrade)
VALUES
    ('starter', 'Starter', 'Perfect for individuals and small teams getting started with AI-powered strategy',
     1, 29.00, 290.00,
     3, 0, 5, 3, 10, 25, 1, 500, 1.0,
     '{"white_label": false, "custom_branding": false, "api_access": false, "sso": false, "priority_support": false, "advanced_analytics": false}'::jsonb,
     TRUE),

    ('business', 'Business', 'For growing teams that need more power, flexibility, and advanced modules',
     2, 99.00, 990.00,
     10, 0, 25, 15, 50, 150, 5, 5000, 10.0,
     '{"white_label": false, "custom_branding": true, "api_access": true, "sso": false, "priority_support": false, "advanced_analytics": true}'::jsonb,
     TRUE),

    ('enterprise', 'Enterprise', 'For large organizations with advanced security, compliance, and support needs',
     3, 299.00, 2990.00,
     100, 0, 100, 50, 200, 500, 20, 50000, 100.0,
     '{"white_label": false, "custom_branding": true, "api_access": true, "sso": true, "priority_support": true, "advanced_analytics": true}'::jsonb,
     TRUE),

    ('agency', 'Agency', 'For agencies and consultancies serving multiple clients with white-label capabilities',
     4, 499.00, 4990.00,
     50, 100, 200, 100, 500, 1000, 50, 100000, 500.0,
     '{"white_label": true, "custom_branding": true, "api_access": true, "sso": true, "priority_support": true, "advanced_analytics": true, "client_portal": true}'::jsonb,
     FALSE)  -- Requires manual approval
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    max_members = EXCLUDED.max_members,
    max_clients = EXCLUDED.max_clients,
    max_agents = EXCLUDED.max_agents,
    max_workflows = EXCLUDED.max_workflows,
    max_skills = EXCLUDED.max_skills,
    max_context_assets = EXCLUDED.max_context_assets,
    max_research_studios = EXCLUDED.max_research_studios,
    max_monthly_api_calls = EXCLUDED.max_monthly_api_calls,
    max_storage_gb = EXCLUDED.max_storage_gb,
    features = EXCLUDED.features,
    allow_self_upgrade = EXCLUDED.allow_self_upgrade,
    updated_at = NOW();


-- ============================================
-- 9. SEED PLATFORM MODULES
-- ============================================

INSERT INTO platform_modules (id, name, description, icon, route_path, min_tier, min_business_role, category, nav_group, display_order)
VALUES
    -- Dashboards (available to all)
    ('dashboard', 'Dashboard', 'Main overview dashboard', 'layout-dashboard', '/', NULL, NULL, 'dashboard', 'primary', 1),
    ('company_dashboard', 'Company Dashboard', 'Company metrics and KPIs', 'building', '/company-dashboard.html', NULL, NULL, 'dashboard', 'primary', 2),
    ('integrity', 'Integrity Dashboard', 'AI integrity and governance monitoring', 'activity', '/integrity.html', NULL, 'manager', 'dashboard', 'primary', 3),
    ('governance', 'Strategy Governance', 'Strategic governance and compliance', 'shield-check', '/strategy-governance.html', 'enterprise', 'director', 'dashboard', 'primary', 4),

    -- Core Systems
    ('higgins', 'Higgins', 'AI assistant chat interface', 'graduation-cap', '/chat.html', NULL, NULL, 'system', 'primary', 10),
    ('agents', 'Agent Library', 'Manage AI agents and capabilities', 'bot', '/agents.html', NULL, NULL, 'system', 'systems', 11),
    ('strategy_agents', 'Strategy Agents', 'Strategy-focused AI agents', 'brain', '/strategy120.html', NULL, NULL, 'system', 'systems', 12),

    -- I360 Strategy Systems (Business+ tiers)
    ('align120', 'Align 120', 'Strategic alignment assessment and planning', 'compass', '/align120.html', 'business', NULL, 'system', 'systems', 20),
    ('strategy120', 'Strategy (S2E)', 'Strategy to Execution pipeline', 'milestone', '/strategy.html', 'business', NULL, 'system', 'systems', 21),
    ('execute120', 'Execute 120', 'Quarterly execution management', 'rocket', '/execute120.html', 'business', NULL, 'system', 'systems', 22),

    -- Components/Assets
    ('context_assets', 'Context Assets', 'Manage context data and knowledge', 'database', '/context.html', NULL, NULL, 'tool', 'components', 30),
    ('actions', 'Actions', 'Action workflows and Parthenon framework', 'zap', '/actions.html', NULL, NULL, 'tool', 'components', 31),
    ('skills', 'Skills', 'Agent skills and capabilities library', 'wand-2', '/skills.html', NULL, NULL, 'tool', 'components', 32),
    ('workflows', 'Workflows', 'Automation and workflow builder', 'git-branch', '/workflows.html', 'business', 'manager', 'tool', 'components', 33),
    ('prompts', 'Prompt Transformer', 'Prompt editing and enhancement tools', 'file-code', '/prompt-editor.html', NULL, NULL, 'tool', 'components', 34),

    -- Tools (Business+ for advanced)
    ('research_studio', 'Research Studio', 'AI-powered deep research and analysis', 'book-open-text', '/research-studio.html', 'business', NULL, 'tool', 'tools', 40),
    ('briefing', 'Briefing', 'Daily briefings and intelligence reports', 'newspaper', '/briefing.html', NULL, NULL, 'tool', 'tools', 41),
    ('thought_leadership', 'Thought Leadership', 'Content creation and thought leadership system', 'lightbulb', '/thought-leadership.html', 'business', NULL, 'tool', 'tools', 42),
    ('guides', 'Guides', 'How-to guides and documentation', 'book-open', '/guides.html', NULL, NULL, 'tool', 'tools', 43),

    -- Agency Features (Agency tier only)
    ('agency_dashboard', 'Agency Dashboard', 'Multi-client overview and management', 'gauge', '/agency-dashboard.html', 'agency', 'director', 'agency', 'agency', 50),
    ('agency_customization', 'Customization', 'White-label and branding settings', 'palette', '/admin-org-customization.html', 'agency', 'director', 'agency', 'agency', 51),
    ('client_portal_admin', 'Portal Users', 'Client portal user management', 'user-check', '/admin-client-users.html', 'agency', NULL, 'agency', 'agency', 52),
    ('client_comparison', 'Client Comparison', 'Cross-client analytics and benchmarks', 'bar-chart-3', '/client-comparison.html', 'agency', 'manager', 'agency', 'agency', 53),

    -- Administration
    ('admin', 'Administrator', 'System administration and settings', 'shield', '/administrator.html', NULL, NULL, 'admin', 'admin', 60),
    ('org_settings', 'Organization Settings', 'Organization configuration', 'building-2', '/admin-org-settings.html', NULL, NULL, 'admin', 'admin', 61),
    ('team_members', 'Team Members', 'Team and member management', 'users', '/admin-org-members.html', NULL, NULL, 'admin', 'admin', 62),
    ('clients_admin', 'Clients', 'Client management', 'briefcase', '/admin-clients.html', 'agency', NULL, 'admin', 'admin', 63),
    ('roles_admin', 'Roles & Responsibilities', 'Role and permission management', 'shield-check', '/responsibilities.html', NULL, 'director', 'admin', 'admin', 64),
    ('capabilities_admin', 'My Capabilities', 'Personal capabilities and skills', 'sparkles', '/my-capabilities.html', NULL, NULL, 'admin', 'admin', 65)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    route_path = EXCLUDED.route_path,
    min_tier = EXCLUDED.min_tier,
    min_business_role = EXCLUDED.min_business_role,
    category = EXCLUDED.category,
    nav_group = EXCLUDED.nav_group,
    display_order = EXCLUDED.display_order;


-- ============================================
-- 10. SEED ROLE MODULE ACCESS (GLOBAL DEFAULTS)
-- ============================================

-- Clear existing global defaults
DELETE FROM role_module_access WHERE org_id IS NULL;

-- Insert default role-module mappings
INSERT INTO role_module_access (org_id, business_role, module_id, can_access)
SELECT
    NULL,  -- Global default
    brl.id,
    pm.id,
    CASE
        -- Executives see everything
        WHEN brl.id = 'executive' THEN TRUE
        -- Directors see most things except some admin
        WHEN brl.id = 'director' AND pm.category IN ('dashboard', 'system', 'tool', 'agency') THEN TRUE
        WHEN brl.id = 'director' AND pm.id IN ('admin', 'org_settings', 'team_members', 'roles_admin') THEN TRUE
        -- Managers see operational modules
        WHEN brl.id = 'manager' AND pm.category IN ('dashboard', 'system', 'tool') THEN TRUE
        WHEN brl.id = 'manager' AND pm.id IN ('org_settings', 'capabilities_admin') THEN TRUE
        -- Supervisors see limited modules
        WHEN brl.id = 'supervisor' AND pm.category IN ('dashboard', 'system') THEN TRUE
        WHEN brl.id = 'supervisor' AND pm.id IN ('context_assets', 'actions', 'skills', 'briefing', 'capabilities_admin') THEN TRUE
        -- ICs see basic modules
        WHEN brl.id = 'ic' AND pm.id IN ('dashboard', 'higgins', 'agents', 'context_assets', 'actions', 'briefing', 'guides', 'capabilities_admin') THEN TRUE
        ELSE FALSE
    END
FROM business_role_levels brl
CROSS JOIN platform_modules pm;


-- ============================================
-- 11. HELPER FUNCTIONS
-- ============================================

-- Check if user is a platform admin
CREATE OR REPLACE FUNCTION is_platform_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM platform_admins
        WHERE user_id = p_user_id
        AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get platform admin role
CREATE OR REPLACE FUNCTION get_platform_admin_role(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role
    FROM platform_admins
    WHERE user_id = p_user_id
    AND is_active = TRUE;

    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can access a specific module
CREATE OR REPLACE FUNCTION can_access_module(
    p_user_id UUID,
    p_module_id TEXT,
    p_org_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_tier TEXT;
    v_business_role TEXT;
    v_module RECORD;
    v_role_level INTEGER;
    v_min_role_level INTEGER;
    v_tier_order INTEGER;
    v_min_tier_order INTEGER;
    v_can_access BOOLEAN;
BEGIN
    -- Platform admins can access everything
    IF is_platform_admin(p_user_id) THEN
        RETURN TRUE;
    END IF;

    -- Get user's org if not provided
    IF p_org_id IS NULL THEN
        SELECT default_org_id INTO v_org_id FROM users WHERE id = p_user_id;
    ELSE
        v_org_id := p_org_id;
    END IF;

    -- No org context, deny access to org-specific features
    IF v_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Get org's tier
    SELECT subscription_tier INTO v_tier FROM organizations WHERE id = v_org_id;
    IF v_tier IS NULL THEN v_tier := 'starter'; END IF;

    -- Get user's business role
    SELECT business_role INTO v_business_role FROM users WHERE id = p_user_id;
    IF v_business_role IS NULL THEN v_business_role := 'ic'; END IF;

    -- Get module requirements
    SELECT * INTO v_module FROM platform_modules WHERE id = p_module_id AND is_active = TRUE;
    IF v_module IS NULL THEN RETURN FALSE; END IF;

    -- Check tier requirement
    IF v_module.min_tier IS NOT NULL THEN
        SELECT display_order INTO v_tier_order FROM subscription_tiers WHERE id = v_tier;
        SELECT display_order INTO v_min_tier_order FROM subscription_tiers WHERE id = v_module.min_tier;
        IF v_tier_order IS NULL OR v_min_tier_order IS NULL THEN
            RETURN FALSE;
        END IF;
        IF v_tier_order < v_min_tier_order THEN RETURN FALSE; END IF;
    END IF;

    -- Check business role requirement
    IF v_module.min_business_role IS NOT NULL THEN
        SELECT level INTO v_role_level FROM business_role_levels WHERE id = v_business_role;
        SELECT level INTO v_min_role_level FROM business_role_levels WHERE id = v_module.min_business_role;
        IF v_role_level IS NULL OR v_min_role_level IS NULL THEN
            RETURN FALSE;
        END IF;
        IF v_role_level < v_min_role_level THEN RETURN FALSE; END IF;
    END IF;

    -- Check org-specific module override (explicit disable)
    IF EXISTS (
        SELECT 1 FROM org_module_access
        WHERE org_id = v_org_id AND module_id = p_module_id AND is_enabled = FALSE
    ) THEN
        RETURN FALSE;
    END IF;

    -- Check role-based access (org-specific first, then global)
    SELECT can_access INTO v_can_access
    FROM role_module_access
    WHERE (org_id = v_org_id OR org_id IS NULL)
    AND business_role = v_business_role
    AND module_id = p_module_id
    ORDER BY org_id NULLS LAST
    LIMIT 1;

    RETURN COALESCE(v_can_access, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all accessible modules for a user
CREATE OR REPLACE FUNCTION get_user_modules(
    p_user_id UUID,
    p_org_id UUID DEFAULT NULL
)
RETURNS TABLE (
    module_id TEXT,
    module_name TEXT,
    description TEXT,
    route_path TEXT,
    icon TEXT,
    category TEXT,
    nav_group TEXT,
    display_order INTEGER,
    is_beta BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pm.id,
        pm.name,
        pm.description,
        pm.route_path,
        pm.icon,
        pm.category,
        pm.nav_group,
        pm.display_order,
        pm.is_beta
    FROM platform_modules pm
    WHERE pm.is_active = TRUE
    AND can_access_module(p_user_id, pm.id, p_org_id)
    ORDER BY pm.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if organization is within resource limits
CREATE OR REPLACE FUNCTION check_org_limits(
    p_org_id UUID,
    p_resource_type TEXT  -- 'members', 'clients', 'agents', 'workflows', 'skills', 'context_assets', 'research_studios'
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
BEGIN
    -- Get org tier
    SELECT subscription_tier INTO v_tier FROM organizations WHERE id = p_org_id;
    IF v_tier IS NULL THEN v_tier := 'starter'; END IF;

    -- Get tier limits
    SELECT * INTO v_limits FROM subscription_tiers WHERE id = v_tier;

    -- Get current count based on resource type
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
        ELSE
            v_count := 0;
            v_max := 0;
    END CASE;

    RETURN QUERY SELECT
        v_count,
        v_max,
        v_count < v_max,
        CASE WHEN v_max > 0 THEN ROUND((v_count::NUMERIC / v_max) * 100, 2) ELSE 0 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get organization tier details
CREATE OR REPLACE FUNCTION get_org_tier_details(p_org_id UUID)
RETURNS TABLE (
    org_id UUID,
    org_name TEXT,
    org_type TEXT,
    subscription_tier TEXT,
    tier_name TEXT,
    tier_description TEXT,
    max_members INTEGER,
    max_clients INTEGER,
    max_agents INTEGER,
    max_workflows INTEGER,
    max_skills INTEGER,
    max_context_assets INTEGER,
    features JSONB,
    current_members INTEGER,
    current_clients INTEGER,
    current_agents INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.name,
        o.org_type,
        o.subscription_tier,
        st.name,
        st.description,
        st.max_members,
        st.max_clients,
        st.max_agents,
        st.max_workflows,
        st.max_skills,
        st.max_context_assets,
        st.features,
        (SELECT COUNT(*)::INTEGER FROM organization_members om WHERE om.org_id = o.id AND om.status = 'active'),
        (SELECT COUNT(*)::INTEGER FROM clients c WHERE c.org_id = o.id AND c.status != 'archived'),
        (SELECT COUNT(*)::INTEGER FROM agents a WHERE a.org_id = o.id)
    FROM organizations o
    LEFT JOIN subscription_tiers st ON o.subscription_tier = st.id
    WHERE o.id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 12. VIEWS
-- ============================================

-- View: Organization with tier details
CREATE OR REPLACE VIEW org_tier_details AS
SELECT
    o.id,
    o.name,
    o.slug,
    o.org_type,
    o.parent_org_id,
    o.is_platform_owner,
    o.subscription_tier,
    o.subscription_status,
    st.name AS tier_name,
    st.description AS tier_description,
    st.max_members,
    st.max_clients,
    st.max_agents,
    st.max_workflows,
    st.max_skills,
    st.max_context_assets,
    st.features AS tier_features,
    st.price_monthly,
    st.price_yearly,
    (SELECT COUNT(*) FROM organization_members om WHERE om.org_id = o.id AND om.status = 'active') AS current_members,
    (SELECT COUNT(*) FROM clients c WHERE c.org_id = o.id AND c.status != 'archived') AS current_clients,
    (SELECT COUNT(*) FROM agents a WHERE a.org_id = o.id) AS current_agents,
    (SELECT COUNT(*) FROM workflows w WHERE w.org_id = o.id) AS current_workflows,
    (SELECT COUNT(*) FROM skills s WHERE s.org_id = o.id) AS current_skills,
    (SELECT COUNT(*) FROM context_assets ca WHERE ca.org_id = o.id) AS current_context_assets
FROM organizations o
LEFT JOIN subscription_tiers st ON o.subscription_tier = st.id;

COMMENT ON VIEW org_tier_details IS 'Organization details with tier limits and current usage';


-- ============================================
-- 13. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on new tables
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_module_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_module_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to subscription_tiers" ON subscription_tiers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to platform_modules" ON platform_modules FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to org_module_access" ON org_module_access FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to platform_admins" ON platform_admins FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to role_module_access" ON role_module_access FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to platform_config" ON platform_config FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Subscription tiers: Everyone can view active tiers
CREATE POLICY "Everyone can view active subscription_tiers"
ON subscription_tiers FOR SELECT TO authenticated
USING (is_active = TRUE);

-- Platform admins can manage tiers
CREATE POLICY "Platform admins can manage subscription_tiers"
ON subscription_tiers FOR ALL TO authenticated
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

-- Platform modules: Everyone can view active modules
CREATE POLICY "Everyone can view active platform_modules"
ON platform_modules FOR SELECT TO authenticated
USING (is_active = TRUE);

-- Platform admins can manage modules
CREATE POLICY "Platform admins can manage platform_modules"
ON platform_modules FOR ALL TO authenticated
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

-- Org module access: Org members can view their org's access
CREATE POLICY "Org members can view org_module_access"
ON org_module_access FOR SELECT TO authenticated
USING (
    org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
);

-- Org admins can manage their org's module access
CREATE POLICY "Org admins can manage org_module_access"
ON org_module_access FOR ALL TO authenticated
USING (
    org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
)
WITH CHECK (
    org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
);

-- Platform admins table: Only super admins can manage
CREATE POLICY "Platform admins can view platform_admins"
ON platform_admins FOR SELECT TO authenticated
USING (is_platform_admin(auth.uid()));

CREATE POLICY "Super admins can manage platform_admins"
ON platform_admins FOR ALL TO authenticated
USING (get_platform_admin_role(auth.uid()) = 'super_admin')
WITH CHECK (get_platform_admin_role(auth.uid()) = 'super_admin');

-- Role module access: Everyone can view global defaults
CREATE POLICY "Everyone can view global role_module_access"
ON role_module_access FOR SELECT TO authenticated
USING (org_id IS NULL);

-- Org members can view their org's role access
CREATE POLICY "Org members can view their role_module_access"
ON role_module_access FOR SELECT TO authenticated
USING (
    org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
);

-- Org admins can manage their org's role access
CREATE POLICY "Org admins can manage role_module_access"
ON role_module_access FOR ALL TO authenticated
USING (
    org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
)
WITH CHECK (
    org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
);

-- Platform config: Everyone can view, only platform admins can modify
CREATE POLICY "Everyone can view platform_config"
ON platform_config FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Platform admins can manage platform_config"
ON platform_config FOR ALL TO authenticated
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));


-- ============================================
-- 14. UPDATED_AT TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_subscription_tiers_updated_at ON subscription_tiers;
CREATE TRIGGER update_subscription_tiers_updated_at
    BEFORE UPDATE ON subscription_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_module_access_updated_at ON org_module_access;
CREATE TRIGGER update_org_module_access_updated_at
    BEFORE UPDATE ON org_module_access
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_platform_config_updated_at ON platform_config;
CREATE TRIGGER update_platform_config_updated_at
    BEFORE UPDATE ON platform_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 15. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION is_platform_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_admin_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_module(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_modules(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_org_limits(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_tier_details(UUID) TO authenticated;

GRANT SELECT ON org_tier_details TO authenticated;


-- ============================================
-- 16. INITIALIZE PLATFORM CONFIG
-- ============================================

INSERT INTO platform_config (platform_name, default_tier, trial_duration_days)
VALUES ('Insight 360', 'starter', 14)
ON CONFLICT DO NOTHING;


-- ============================================
-- 17. MIGRATION: UPDATE EXISTING ORGS
-- ============================================

-- Migrate 'free' tier to 'starter'
UPDATE organizations
SET subscription_tier = 'starter'
WHERE subscription_tier = 'free';

-- Migrate 'pro' tier to 'business'
UPDATE organizations
SET subscription_tier = 'business'
WHERE subscription_tier = 'pro';

-- Set org_type for existing organizations
UPDATE organizations
SET org_type = 'standard'
WHERE org_type IS NULL;

-- Mark organizations with clients as agencies (if they have agency tier capabilities)
UPDATE organizations o
SET org_type = 'agency'
WHERE EXISTS (
    SELECT 1 FROM clients c WHERE c.org_id = o.id
)
AND o.org_type = 'standard';
