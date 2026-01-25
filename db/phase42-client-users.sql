-- ============================================
-- Phase 42: Client Self-Service Portal
-- Client users, authentication, and report sharing
-- ============================================
--
-- This schema enables client self-service:
-- - Client user accounts (separate from agency users)
-- - Magic link / passwordless authentication
-- - Report sharing and access control
-- - Activity tracking
--
-- ============================================

-- ============================================
-- 1. CLIENT USERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS client_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

    -- Auth linkage (optional - for Supabase auth integration)
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Contact info
    email TEXT NOT NULL,
    name TEXT,
    title TEXT,
    phone TEXT,
    avatar_url TEXT,

    -- Permissions within client portal
    role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
    -- admin: can manage other client users, view all reports
    -- viewer: read-only access to shared reports

    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'removed')),

    -- Invitation tracking
    invited_by UUID REFERENCES auth.users(id),  -- Agency user who invited
    invited_at TIMESTAMPTZ,
    invitation_token_hash TEXT,  -- For email verification
    invitation_expires_at TIMESTAMPTZ,

    -- Activation
    activated_at TIMESTAMPTZ,
    activation_method TEXT,  -- 'magic_link', 'password', 'sso'

    -- Login tracking
    last_login_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,

    -- Settings
    notification_prefs JSONB DEFAULT '{
        "email_on_new_report": true,
        "email_digest": "weekly"
    }'::jsonb,
    timezone TEXT DEFAULT 'UTC',
    locale TEXT DEFAULT 'en',

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(client_id, email)
);

CREATE INDEX IF NOT EXISTS idx_client_users_client ON client_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_users_email ON client_users(email);
CREATE INDEX IF NOT EXISTS idx_client_users_auth ON client_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_client_users_status ON client_users(status);
CREATE INDEX IF NOT EXISTS idx_client_users_active ON client_users(client_id, status) WHERE status = 'active';

COMMENT ON TABLE client_users IS 'Users who can access the client self-service portal';
COMMENT ON COLUMN client_users.role IS 'admin=manage users and full access, viewer=read-only report access';
COMMENT ON COLUMN client_users.auth_user_id IS 'Optional link to Supabase auth user for SSO/password auth';


-- ============================================
-- 2. CLIENT ACCESS TOKENS
-- ============================================

CREATE TABLE IF NOT EXISTS client_access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_user_id UUID NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,

    -- Token identification
    token_hash TEXT NOT NULL,  -- SHA256 hash of the token
    token_type TEXT DEFAULT 'magic_link' CHECK (token_type IN (
        'magic_link',     -- One-time login link
        'session',        -- Active session token
        'api',            -- API access token
        'invitation'      -- Initial invitation token
    )),

    -- Validity
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES auth.users(id),

    -- Usage tracking
    ip_address INET,
    user_agent TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_access_tokens_user ON client_access_tokens(client_user_id);
CREATE INDEX IF NOT EXISTS idx_client_access_tokens_hash ON client_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_client_access_tokens_type ON client_access_tokens(token_type);
CREATE INDEX IF NOT EXISTS idx_client_access_tokens_valid ON client_access_tokens(token_hash, expires_at)
    WHERE used_at IS NULL AND revoked_at IS NULL;

COMMENT ON TABLE client_access_tokens IS 'Authentication tokens for client portal access';
COMMENT ON COLUMN client_access_tokens.token_hash IS 'SHA256 hash of the actual token (never store plaintext)';


-- ============================================
-- 3. CLIENT REPORT SHARES
-- ============================================

CREATE TABLE IF NOT EXISTS client_report_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    session_report_id UUID NOT NULL REFERENCES session_reports(id) ON DELETE CASCADE,

    -- Sharing metadata
    shared_by UUID REFERENCES auth.users(id),  -- Agency user who shared
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    share_message TEXT,  -- Optional message to client

    -- Access control
    expires_at TIMESTAMPTZ,  -- Optional expiry date
    max_views INTEGER,       -- Optional view limit
    requires_auth BOOLEAN DEFAULT TRUE,  -- Require login vs public link

    -- Permissions
    can_download BOOLEAN DEFAULT TRUE,
    can_print BOOLEAN DEFAULT TRUE,
    can_share_link BOOLEAN DEFAULT FALSE,  -- Can client create sub-shares

    -- Tracking
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    last_viewed_by UUID REFERENCES client_users(id),
    first_viewed_at TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(client_id, session_report_id)
);

CREATE INDEX IF NOT EXISTS idx_client_report_shares_client ON client_report_shares(client_id);
CREATE INDEX IF NOT EXISTS idx_client_report_shares_report ON client_report_shares(session_report_id);
CREATE INDEX IF NOT EXISTS idx_client_report_shares_active ON client_report_shares(client_id, is_active)
    WHERE is_active = TRUE;

COMMENT ON TABLE client_report_shares IS 'Controls which reports are shared with which clients';
COMMENT ON COLUMN client_report_shares.requires_auth IS 'If false, report can be accessed via public link';


-- ============================================
-- 4. CLIENT ACTIVITY LOG
-- ============================================

CREATE TABLE IF NOT EXISTS client_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_user_id UUID REFERENCES client_users(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

    -- Activity details
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'login',
        'logout',
        'view_report',
        'download_report',
        'view_profile',
        'update_settings',
        'invite_user',
        'failed_login'
    )),
    resource_type TEXT,  -- 'report', 'profile', 'settings'
    resource_id UUID,    -- ID of the resource accessed

    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id UUID,

    -- Additional data
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_activity_log_user ON client_activity_log(client_user_id);
CREATE INDEX IF NOT EXISTS idx_client_activity_log_client ON client_activity_log(client_id);
CREATE INDEX IF NOT EXISTS idx_client_activity_log_type ON client_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_client_activity_log_date ON client_activity_log(created_at);

COMMENT ON TABLE client_activity_log IS 'Audit log of all client portal activity';


-- ============================================
-- 5. CLIENT PORTAL SESSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS client_portal_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_user_id UUID NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,

    -- Session token
    session_token_hash TEXT NOT NULL,

    -- Validity
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),

    -- Context
    ip_address INET,
    user_agent TEXT,

    -- Status
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_client_portal_sessions_user ON client_portal_sessions(client_user_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_sessions_token ON client_portal_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_client_portal_sessions_active ON client_portal_sessions(client_user_id, is_active)
    WHERE is_active = TRUE;

COMMENT ON TABLE client_portal_sessions IS 'Active client portal sessions';


-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Create magic link for client user
CREATE OR REPLACE FUNCTION create_client_magic_link(
    p_client_user_id UUID,
    p_token_hash TEXT,
    p_expires_minutes INTEGER DEFAULT 15
)
RETURNS UUID AS $$
DECLARE
    v_token_id UUID;
BEGIN
    -- Revoke any existing unused magic links
    UPDATE client_access_tokens
    SET revoked_at = NOW()
    WHERE client_user_id = p_client_user_id
    AND token_type = 'magic_link'
    AND used_at IS NULL
    AND revoked_at IS NULL;

    -- Create new token
    INSERT INTO client_access_tokens (
        client_user_id,
        token_hash,
        token_type,
        expires_at
    ) VALUES (
        p_client_user_id,
        p_token_hash,
        'magic_link',
        NOW() + (p_expires_minutes || ' minutes')::interval
    )
    RETURNING id INTO v_token_id;

    RETURN v_token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate and consume magic link
CREATE OR REPLACE FUNCTION validate_client_magic_link(p_token_hash TEXT)
RETURNS TABLE (
    valid BOOLEAN,
    client_user_id UUID,
    client_id UUID,
    email TEXT,
    name TEXT,
    role TEXT,
    error_message TEXT
) AS $$
DECLARE
    v_token RECORD;
    v_user RECORD;
BEGIN
    -- Find token
    SELECT * INTO v_token
    FROM client_access_tokens
    WHERE token_hash = p_token_hash
    AND token_type = 'magic_link'
    AND used_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > NOW();

    IF v_token.id IS NULL THEN
        RETURN QUERY SELECT
            FALSE,
            NULL::UUID,
            NULL::UUID,
            NULL::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            'Invalid or expired token'::TEXT;
        RETURN;
    END IF;

    -- Get user
    SELECT * INTO v_user
    FROM client_users
    WHERE id = v_token.client_user_id
    AND status IN ('pending', 'active');

    IF v_user.id IS NULL THEN
        RETURN QUERY SELECT
            FALSE,
            NULL::UUID,
            NULL::UUID,
            NULL::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            'User not found or inactive'::TEXT;
        RETURN;
    END IF;

    -- Mark token as used
    UPDATE client_access_tokens
    SET used_at = NOW()
    WHERE id = v_token.id;

    -- Activate user if pending
    IF v_user.status = 'pending' THEN
        UPDATE client_users
        SET status = 'active',
            activated_at = NOW(),
            activation_method = 'magic_link'
        WHERE id = v_user.id;
    END IF;

    -- Update login stats
    UPDATE client_users
    SET last_login_at = NOW(),
        login_count = login_count + 1
    WHERE id = v_user.id;

    RETURN QUERY SELECT
        TRUE,
        v_user.id,
        v_user.client_id,
        v_user.email,
        v_user.name,
        v_user.role,
        NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if client user can access a report
CREATE OR REPLACE FUNCTION can_client_user_access_report(
    p_client_user_id UUID,
    p_session_report_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_client_id UUID;
    v_share RECORD;
BEGIN
    -- Get client_id for user
    SELECT client_id INTO v_client_id
    FROM client_users
    WHERE id = p_client_user_id
    AND status = 'active';

    IF v_client_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check for active share
    SELECT * INTO v_share
    FROM client_report_shares
    WHERE client_id = v_client_id
    AND session_report_id = p_session_report_id
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_views IS NULL OR view_count < max_views);

    RETURN v_share.id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record report view
CREATE OR REPLACE FUNCTION record_report_view(
    p_client_user_id UUID,
    p_session_report_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_client_id UUID;
BEGIN
    -- Get client_id
    SELECT client_id INTO v_client_id
    FROM client_users
    WHERE id = p_client_user_id;

    -- Update share stats
    UPDATE client_report_shares
    SET view_count = view_count + 1,
        last_viewed_at = NOW(),
        last_viewed_by = p_client_user_id,
        first_viewed_at = COALESCE(first_viewed_at, NOW())
    WHERE client_id = v_client_id
    AND session_report_id = p_session_report_id;

    -- Log activity
    INSERT INTO client_activity_log (
        client_user_id,
        client_id,
        activity_type,
        resource_type,
        resource_id
    ) VALUES (
        p_client_user_id,
        v_client_id,
        'view_report',
        'report',
        p_session_report_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_client_magic_link(UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION validate_client_magic_link(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION can_client_user_access_report(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION record_report_view(UUID, UUID) TO service_role;


-- ============================================
-- 7. VIEWS
-- ============================================

-- Client user summary for agency view
CREATE OR REPLACE VIEW client_user_summary AS
SELECT
    cu.id,
    cu.client_id,
    c.name AS client_name,
    c.org_id,
    cu.email,
    cu.name,
    cu.title,
    cu.role,
    cu.status,
    cu.last_login_at,
    cu.login_count,
    cu.invited_at,
    cu.activated_at,
    (
        SELECT COUNT(*)
        FROM client_report_shares crs
        WHERE crs.client_id = cu.client_id
        AND crs.is_active = TRUE
    ) AS available_reports,
    (
        SELECT MAX(cal.created_at)
        FROM client_activity_log cal
        WHERE cal.client_user_id = cu.id
    ) AS last_activity_at
FROM client_users cu
JOIN clients c ON cu.client_id = c.id;

COMMENT ON VIEW client_user_summary IS 'Summary view of client users with activity stats';

-- Shared reports for client view
CREATE OR REPLACE VIEW client_shared_reports AS
SELECT
    crs.id AS share_id,
    crs.client_id,
    sr.id AS report_id,
    sr.report_type,
    sr.format,
    sr.version,
    sr.generated_at,
    s.company_name,
    s.id AS session_id,
    crs.shared_at,
    crs.share_message,
    crs.expires_at,
    crs.can_download,
    crs.can_print,
    crs.view_count,
    crs.first_viewed_at,
    crs.last_viewed_at,
    CASE
        WHEN crs.expires_at IS NOT NULL AND crs.expires_at < NOW() THEN 'expired'
        WHEN crs.max_views IS NOT NULL AND crs.view_count >= crs.max_views THEN 'view_limit_reached'
        WHEN crs.is_active = FALSE THEN 'revoked'
        ELSE 'active'
    END AS share_status
FROM client_report_shares crs
JOIN session_reports sr ON crs.session_report_id = sr.id
JOIN align120_sessions s ON sr.session_id = s.id
WHERE crs.is_active = TRUE;

COMMENT ON VIEW client_shared_reports IS 'Reports shared with clients, including access status';

GRANT SELECT ON client_user_summary TO service_role;
GRANT SELECT ON client_shared_reports TO service_role;


-- ============================================
-- 8. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_report_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_sessions ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to client_users"
ON client_users FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to client_access_tokens"
ON client_access_tokens FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to client_report_shares"
ON client_report_shares FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to client_activity_log"
ON client_activity_log FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to client_portal_sessions"
ON client_portal_sessions FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Agency members can view/manage client users for their clients
CREATE POLICY "Org members can view client users"
ON client_users FOR SELECT TO authenticated
USING (
    client_id IN (
        SELECT c.id FROM clients c
        JOIN organization_members om ON c.org_id = om.org_id
        WHERE om.user_id = auth.uid()
        AND om.status = 'active'
    )
);

CREATE POLICY "Org admins can manage client users"
ON client_users FOR ALL TO authenticated
USING (
    client_id IN (
        SELECT c.id FROM clients c
        JOIN organization_members om ON c.org_id = om.org_id
        WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'consultant')
        AND om.status = 'active'
    )
)
WITH CHECK (
    client_id IN (
        SELECT c.id FROM clients c
        JOIN organization_members om ON c.org_id = om.org_id
        WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'consultant')
        AND om.status = 'active'
    )
);

-- Client users can view their own reports
CREATE POLICY "Client users can view their shared reports"
ON session_reports FOR SELECT TO authenticated
USING (
    id IN (
        SELECT crs.session_report_id
        FROM client_report_shares crs
        JOIN client_users cu ON crs.client_id = cu.client_id
        WHERE cu.auth_user_id = auth.uid()
        AND cu.status = 'active'
        AND crs.is_active = TRUE
        AND (crs.expires_at IS NULL OR crs.expires_at > NOW())
    )
);

-- Agency members can manage report shares for their clients
CREATE POLICY "Org members can manage report shares"
ON client_report_shares FOR ALL TO authenticated
USING (
    client_id IN (
        SELECT c.id FROM clients c
        JOIN organization_members om ON c.org_id = om.org_id
        WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'consultant')
        AND om.status = 'active'
    )
)
WITH CHECK (
    client_id IN (
        SELECT c.id FROM clients c
        JOIN organization_members om ON c.org_id = om.org_id
        WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'consultant')
        AND om.status = 'active'
    )
);

-- Agency members can view activity logs for their clients
CREATE POLICY "Org members can view client activity"
ON client_activity_log FOR SELECT TO authenticated
USING (
    client_id IN (
        SELECT c.id FROM clients c
        JOIN organization_members om ON c.org_id = om.org_id
        WHERE om.user_id = auth.uid()
        AND om.status = 'active'
    )
);


-- ============================================
-- 9. UPDATED_AT TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_client_users_updated_at ON client_users;
CREATE TRIGGER update_client_users_updated_at
    BEFORE UPDATE ON client_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_report_shares_updated_at ON client_report_shares;
CREATE TRIGGER update_client_report_shares_updated_at
    BEFORE UPDATE ON client_report_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 10. CLEANUP FUNCTION FOR EXPIRED TOKENS
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_client_tokens()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    -- Delete expired tokens older than 24 hours
    DELETE FROM client_access_tokens
    WHERE expires_at < NOW() - INTERVAL '24 hours';

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    -- Delete expired sessions
    DELETE FROM client_portal_sessions
    WHERE expires_at < NOW() - INTERVAL '24 hours'
    OR (is_active = FALSE AND last_activity_at < NOW() - INTERVAL '7 days');

    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_client_tokens IS 'Cleanup job for expired tokens and sessions. Should be run daily.';
