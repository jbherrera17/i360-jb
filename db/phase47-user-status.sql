-- ============================================
-- Phase 47: User Account Status Management
-- ============================================
-- Adds status field to users table for account lifecycle management.
-- Enables suspending users when their organization is deleted.
-- ============================================

-- Add status column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
CHECK (status IN ('active', 'suspended', 'inactive', 'pending_deletion'));

-- Add suspended_at timestamp for audit
ALTER TABLE users
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

-- Add suspended_reason for context
ALTER TABLE users
ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_status_active ON users(status) WHERE status = 'active';

-- ============================================
-- Helper function to check if user has active org memberships
-- ============================================
CREATE OR REPLACE FUNCTION user_has_active_orgs(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM organization_members om
        JOIN organizations o ON o.id = om.org_id
        WHERE om.user_id = p_user_id
        AND om.status = 'active'
        AND o.is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function to suspend orphaned users after org deletion
-- ============================================
CREATE OR REPLACE FUNCTION suspend_orphaned_users(p_org_id UUID, p_reason TEXT DEFAULT 'Organization deleted')
RETURNS TABLE(user_id UUID, email TEXT) AS $$
BEGIN
    -- Find users who were members of this org and have no other active memberships
    RETURN QUERY
    WITH affected_users AS (
        SELECT DISTINCT om.user_id
        FROM organization_members om
        WHERE om.org_id = p_org_id
        AND om.status = 'active'
    ),
    orphaned_users AS (
        SELECT au.user_id
        FROM affected_users au
        WHERE NOT EXISTS (
            SELECT 1
            FROM organization_members om2
            JOIN organizations o ON o.id = om2.org_id
            WHERE om2.user_id = au.user_id
            AND om2.org_id != p_org_id
            AND om2.status = 'active'
            AND o.is_active = TRUE
        )
    )
    UPDATE users u
    SET
        status = 'suspended',
        suspended_at = NOW(),
        suspended_reason = p_reason,
        updated_at = NOW()
    FROM orphaned_users ou
    WHERE u.id = ou.user_id
    AND u.status = 'active'
    RETURNING u.id AS user_id, u.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function to reactivate a suspended user
-- ============================================
CREATE OR REPLACE FUNCTION reactivate_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated BOOLEAN;
BEGIN
    UPDATE users
    SET
        status = 'active',
        suspended_at = NULL,
        suspended_reason = NULL,
        updated_at = NOW()
    WHERE id = p_user_id
    AND status = 'suspended';

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- View for platform admin: Users by organization
-- ============================================
CREATE OR REPLACE VIEW platform_users_overview AS
SELECT
    u.id,
    u.email,
    u.display_name,
    u.role,
    u.status,
    u.suspended_at,
    u.suspended_reason,
    u.created_at,
    u.updated_at,
    COALESCE(
        (
            SELECT json_agg(json_build_object(
                'org_id', o.id,
                'org_name', o.name,
                'org_slug', o.slug,
                'member_role', om.role,
                'member_status', om.status,
                'is_personal', COALESCE((o.settings->>'is_personal')::boolean, o.slug LIKE 'personal-%')
            ))
            FROM organization_members om
            JOIN organizations o ON o.id = om.org_id
            WHERE om.user_id = u.id
        ),
        '[]'::json
    ) AS organizations,
    (
        SELECT COUNT(*)::INTEGER
        FROM organization_members om
        WHERE om.user_id = u.id AND om.status = 'active'
    ) AS active_org_count,
    EXISTS (
        SELECT 1 FROM platform_admins pa WHERE pa.user_id = u.id AND pa.is_active = TRUE
    ) AS is_platform_admin
FROM users u
ORDER BY u.created_at DESC;

-- Grant access to the view
GRANT SELECT ON platform_users_overview TO authenticated;

-- ============================================
-- Update existing users to have 'active' status
-- ============================================
UPDATE users SET status = 'active' WHERE status IS NULL;

-- ============================================
-- Comments
-- ============================================
COMMENT ON COLUMN users.status IS 'Account status: active, suspended, inactive, pending_deletion';
COMMENT ON COLUMN users.suspended_at IS 'Timestamp when account was suspended';
COMMENT ON COLUMN users.suspended_reason IS 'Reason for suspension (e.g., org deleted, admin action)';
COMMENT ON FUNCTION suspend_orphaned_users IS 'Suspends users who have no remaining active org memberships after an org is deleted';
COMMENT ON FUNCTION reactivate_user IS 'Reactivates a suspended user account';
COMMENT ON VIEW platform_users_overview IS 'Platform admin view showing all users with their organization memberships';
