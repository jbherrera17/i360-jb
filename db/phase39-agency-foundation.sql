-- ============================================
-- Phase 39: Agency Foundation - Multi-Tenant Architecture
-- Database Schema for Organizations, Members, and Clients
-- ============================================
--
-- This schema enables the agency product model where:
-- - Agencies (organizations) license Insight 360
-- - Agencies have team members (consultants)
-- - Agencies serve multiple clients
-- - Data is isolated between organizations
--
-- ============================================

-- ============================================
-- 1. CORE AGENCY TABLES
-- ============================================

-- Organizations table (Agencies/Tenants)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,                           -- URL-friendly identifier (e.g., 'acme-consulting')
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- Primary admin

    -- Subscription & Billing
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'trial', 'suspended', 'cancelled')),
    trial_ends_at TIMESTAMPTZ,

    -- Settings & Branding (for future white-label support)
    settings JSONB DEFAULT '{}'::jsonb,                  -- General settings
    branding JSONB DEFAULT '{}'::jsonb,                  -- Logo, colors, etc. (future)

    -- Limits
    max_members INTEGER DEFAULT 5,                       -- Member limit by tier
    max_clients INTEGER DEFAULT 10,                      -- Client limit by tier

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE organizations IS 'Agencies/tenants that license Insight 360';
COMMENT ON COLUMN organizations.slug IS 'URL-friendly unique identifier for the organization';
COMMENT ON COLUMN organizations.settings IS 'JSON object for org-level settings';
COMMENT ON COLUMN organizations.branding IS 'JSON object for white-label branding (future)';


-- Organization Members table (Agency team)
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Role within organization
    role TEXT NOT NULL DEFAULT 'consultant' CHECK (role IN ('owner', 'admin', 'consultant', 'viewer')),

    -- Invitation tracking
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ DEFAULT NOW(),

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'removed')),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_org_members_active ON organization_members(status) WHERE status = 'active';

COMMENT ON TABLE organization_members IS 'Users who belong to an organization (agency team members)';
COMMENT ON COLUMN organization_members.role IS 'owner=full control, admin=manage members/clients, consultant=work with clients, viewer=read-only';


-- Clients table (Agency's customers)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Client info
    name TEXT NOT NULL,
    slug TEXT,                                           -- URL-friendly identifier
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,

    -- Client settings
    settings JSONB DEFAULT '{}'::jsonb,

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('prospect', 'active', 'paused', 'archived')),

    -- Engagement tracking
    engagement_started_at TIMESTAMPTZ,
    engagement_ended_at TIMESTAMPTZ,

    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(org_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(org_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_org_active ON clients(org_id, status) WHERE status = 'active';

COMMENT ON TABLE clients IS 'Agency customers/clients that the organization serves';
COMMENT ON COLUMN clients.slug IS 'URL-friendly identifier unique within the organization';


-- ============================================
-- 2. ADD ORG_ID TO EXISTING TABLES
-- ============================================

-- Add org_id to users table for default organization context
ALTER TABLE users
ADD COLUMN IF NOT EXISTS default_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

COMMENT ON COLUMN users.default_org_id IS 'User''s default organization context when they belong to multiple orgs';

-- Add org_id to company_profiles
ALTER TABLE company_profiles
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_company_profiles_org ON company_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_company_profiles_client ON company_profiles(client_id);

COMMENT ON COLUMN company_profiles.org_id IS 'Organization that owns this company profile';
COMMENT ON COLUMN company_profiles.client_id IS 'Client this profile belongs to (for agency model)';

-- Add org_id to agents
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agents_org ON agents(org_id);

COMMENT ON COLUMN agents.org_id IS 'Organization that owns this agent';

-- Add org_id to workflows
ALTER TABLE workflows
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workflows_org ON workflows(org_id);

COMMENT ON COLUMN workflows.org_id IS 'Organization that owns this workflow';

-- Add org_id to skills
ALTER TABLE skills
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_skills_org ON skills(org_id);

COMMENT ON COLUMN skills.org_id IS 'Organization that owns this skill';

-- Add org_id to context_assets
ALTER TABLE context_assets
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_context_assets_org ON context_assets(org_id);

COMMENT ON COLUMN context_assets.org_id IS 'Organization that owns this context asset';

-- Add org_id and client_id to align120_sessions
ALTER TABLE align120_sessions
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_ephemeral BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ephemeral_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS report_format TEXT DEFAULT 'standard';

CREATE INDEX IF NOT EXISTS idx_align120_sessions_org ON align120_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_align120_sessions_client ON align120_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_align120_sessions_ephemeral ON align120_sessions(is_ephemeral) WHERE is_ephemeral = TRUE;

COMMENT ON COLUMN align120_sessions.org_id IS 'Organization that owns this session';
COMMENT ON COLUMN align120_sessions.client_id IS 'Client this session is for (agency model)';
COMMENT ON COLUMN align120_sessions.is_ephemeral IS 'If true, session is report-only and will be purged';
COMMENT ON COLUMN align120_sessions.ephemeral_expires_at IS 'When ephemeral session data should be purged';
COMMENT ON COLUMN align120_sessions.report_format IS 'Report template to use for generation';

-- Add org_id to conversations
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(org_id);

COMMENT ON COLUMN conversations.org_id IS 'Organization context for this conversation';

-- Add org_id to departments (allow org-level departments)
ALTER TABLE departments
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_departments_org ON departments(org_id);

COMMENT ON COLUMN departments.org_id IS 'Organization that owns this department';

-- Add org_id to okrs
ALTER TABLE okrs
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_okrs_org ON okrs(org_id);

COMMENT ON COLUMN okrs.org_id IS 'Organization that owns this OKR';


-- ============================================
-- 3. SESSION REPORTS TABLE
-- For versioned report export from Align 120
-- ============================================

CREATE TABLE IF NOT EXISTS session_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES align120_sessions(id) ON DELETE CASCADE,

    -- Report metadata
    report_type TEXT NOT NULL CHECK (report_type IN ('alignment_brief', 'governance_pack', 'portfolio', 'executive_summary')),
    format TEXT NOT NULL DEFAULT 'json' CHECK (format IN ('json', 'html', 'pdf', 'docx')),
    version INTEGER DEFAULT 1,

    -- Report content
    content JSONB,                                       -- Structured report data
    file_path TEXT,                                      -- Path to generated file (if applicable)

    -- Generation tracking
    generated_by UUID REFERENCES auth.users(id),
    generated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_reports_session ON session_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_session_reports_type ON session_reports(report_type);

COMMENT ON TABLE session_reports IS 'Versioned reports generated from Align 120 sessions';
COMMENT ON COLUMN session_reports.report_type IS 'Type of report: alignment_brief, governance_pack, portfolio, executive_summary';
COMMENT ON COLUMN session_reports.format IS 'Output format: json (raw), html, pdf, docx';


-- ============================================
-- 4. HELPER FUNCTIONS
-- ============================================

-- Function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(p_user_id UUID)
RETURNS TABLE (
    org_id UUID,
    org_name TEXT,
    org_slug TEXT,
    user_role TEXT,
    is_default BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.name,
        o.slug,
        om.role,
        (u.default_org_id = o.id) as is_default
    FROM organizations o
    JOIN organization_members om ON o.id = om.org_id
    LEFT JOIN users u ON u.id = p_user_id
    WHERE om.user_id = p_user_id
    AND om.status = 'active'
    AND o.is_active = TRUE
    ORDER BY (u.default_org_id = o.id) DESC, o.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is member of organization
CREATE OR REPLACE FUNCTION is_org_member(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE user_id = p_user_id
        AND org_id = p_org_id
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in organization
CREATE OR REPLACE FUNCTION get_org_role(p_user_id UUID, p_org_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role
    FROM organization_members
    WHERE user_id = p_user_id
    AND org_id = p_org_id
    AND status = 'active';

    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can manage organization
CREATE OR REPLACE FUNCTION can_manage_org(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
BEGIN
    v_role := get_org_role(p_user_id, p_org_id);
    RETURN v_role IN ('owner', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_reports ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to organizations"
ON organizations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to organization_members"
ON organization_members FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to clients"
ON clients FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to session_reports"
ON session_reports FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Organizations: Members can view their organizations
CREATE POLICY "Members can view their organizations"
ON organizations FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid()
        AND status = 'active'
    )
);

-- Organizations: Owners can update their organizations
CREATE POLICY "Admins can update their organizations"
ON organizations FOR UPDATE
TO authenticated
USING (
    id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
)
WITH CHECK (
    id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
);

-- Organizations: Users can create organizations (become owner)
CREATE POLICY "Users can create organizations"
ON organizations FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Organization Members: Members can view other members in their orgs
CREATE POLICY "Members can view org members"
ON organization_members FOR SELECT
TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
        AND om.status = 'active'
    )
);

-- Organization Members: Admins can manage members
CREATE POLICY "Admins can manage org members"
ON organization_members FOR ALL
TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
)
WITH CHECK (
    org_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
);

-- Clients: Org members can view their org's clients
CREATE POLICY "Org members can view clients"
ON clients FOR SELECT
TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid()
        AND status = 'active'
    )
);

-- Clients: Admins and consultants can manage clients
CREATE POLICY "Admins and consultants can manage clients"
ON clients FOR ALL
TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'consultant')
        AND status = 'active'
    )
)
WITH CHECK (
    org_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'consultant')
        AND status = 'active'
    )
);

-- Session Reports: Users can view reports for sessions they can access
CREATE POLICY "Users can view accessible session reports"
ON session_reports FOR SELECT
TO authenticated
USING (
    session_id IN (
        SELECT id FROM align120_sessions
        WHERE user_id = auth.uid()
        OR org_id IN (
            SELECT org_id FROM organization_members
            WHERE user_id = auth.uid()
            AND status = 'active'
        )
    )
);

-- Session Reports: Users can create reports for their sessions
CREATE POLICY "Users can create session reports"
ON session_reports FOR INSERT
TO authenticated
WITH CHECK (
    session_id IN (
        SELECT id FROM align120_sessions
        WHERE user_id = auth.uid()
        OR org_id IN (
            SELECT org_id FROM organization_members
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'consultant')
            AND status = 'active'
        )
    )
);


-- ============================================
-- 6. UPDATED_AT TRIGGERS
-- ============================================

-- Trigger function for updated_at (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to new tables
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;
CREATE TRIGGER update_organization_members_updated_at
    BEFORE UPDATE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 7. VIEWS FOR COMMON QUERIES
-- ============================================

-- View: Organization summary with member and client counts
CREATE OR REPLACE VIEW organization_summary AS
SELECT
    o.id,
    o.name,
    o.slug,
    o.subscription_tier,
    o.subscription_status,
    o.is_active,
    o.created_at,
    COUNT(DISTINCT om.user_id) FILTER (WHERE om.status = 'active') as member_count,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active') as active_client_count,
    o.max_members,
    o.max_clients
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.org_id
LEFT JOIN clients c ON o.id = c.org_id
GROUP BY o.id;

COMMENT ON VIEW organization_summary IS 'Organization overview with member and client counts';

-- View: User's organization memberships with details
CREATE OR REPLACE VIEW user_org_memberships AS
SELECT
    om.user_id,
    om.org_id,
    o.name as org_name,
    o.slug as org_slug,
    om.role,
    om.status,
    om.joined_at,
    u.default_org_id = o.id as is_default,
    o.subscription_tier
FROM organization_members om
JOIN organizations o ON om.org_id = o.id
LEFT JOIN users u ON om.user_id = u.id
WHERE o.is_active = TRUE;

COMMENT ON VIEW user_org_memberships IS 'User organization memberships with organization details';


-- ============================================
-- 8. MIGRATION: CREATE PERSONAL ORGANIZATIONS
-- FOR EXISTING USERS
-- ============================================

-- This function creates a personal organization for existing users
-- who don't have any organization membership
-- IMPORTANT: Only migrates users that exist in auth.users (real authenticated users)
-- Seed/test users that only exist in the users table are skipped
CREATE OR REPLACE FUNCTION migrate_users_to_personal_orgs()
RETURNS INTEGER AS $$
DECLARE
    v_user RECORD;
    v_org_id UUID;
    v_count INTEGER := 0;
BEGIN
    -- Find users without any organization membership
    -- ONLY include users that exist in auth.users (FK constraint requires this)
    FOR v_user IN
        SELECT u.id, u.email, u.display_name
        FROM users u
        INNER JOIN auth.users au ON u.id = au.id  -- Only real auth users
        LEFT JOIN organization_members om ON u.id = om.user_id
        WHERE om.id IS NULL
    LOOP
        -- Create personal organization
        INSERT INTO organizations (
            name,
            slug,
            owner_id,
            subscription_tier,
            subscription_status,
            settings
        ) VALUES (
            COALESCE(v_user.display_name, split_part(v_user.email, '@', 1)) || '''s Workspace',
            'personal-' || replace(v_user.id::text, '-', ''),
            v_user.id,
            'free',
            'active',
            '{"is_personal": true}'::jsonb
        )
        RETURNING id INTO v_org_id;

        -- Add user as owner
        INSERT INTO organization_members (
            org_id,
            user_id,
            role,
            status,
            joined_at
        ) VALUES (
            v_org_id,
            v_user.id,
            'owner',
            'active',
            NOW()
        );

        -- Set as default org
        UPDATE users
        SET default_org_id = v_org_id
        WHERE id = v_user.id;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION migrate_users_to_personal_orgs() IS 'Creates personal organizations for existing users without org membership. Call once after migration.';

-- Note: To run the migration, execute:
-- SELECT migrate_users_to_personal_orgs();


-- ============================================
-- 9. GRANT PERMISSIONS
-- ============================================

-- Grant usage on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_organizations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_org_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_role(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_org(UUID, UUID) TO authenticated;

-- Grant select on views
GRANT SELECT ON organization_summary TO authenticated;
GRANT SELECT ON user_org_memberships TO authenticated;
