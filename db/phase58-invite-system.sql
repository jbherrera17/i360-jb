-- ===========================================
-- PHASE 58: Email Invitation System
-- ===========================================
-- Extends user status to support 'invited' state
-- Adds invitation tracking columns
-- Updates platform_users_overview view
-- ===========================================

-- ============================================
-- 1. EXTEND USER STATUS CONSTRAINT
-- ============================================

-- Drop the existing constraint (from phase47)
DO $$
BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Re-add with 'invited' included
ALTER TABLE users
ADD CONSTRAINT users_status_check
CHECK (status IN ('active', 'suspended', 'inactive', 'pending_deletion', 'invited'));

-- ============================================
-- 2. ADD INVITATION TRACKING COLUMNS
-- ============================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS invited_by UUID;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMPTZ;

-- Index for finding pending invitations
CREATE INDEX IF NOT EXISTS idx_users_status_invited
ON users(status) WHERE status = 'invited';

-- ============================================
-- 3. ACTIVATE INVITED USER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION activate_invited_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE users
    SET
        status = 'active',
        invitation_accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_user_id
    AND status = 'invited';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. UPDATE PLATFORM_USERS_OVERVIEW VIEW
-- ============================================

DROP VIEW IF EXISTS public.platform_users_overview CASCADE;
CREATE VIEW public.platform_users_overview
WITH (security_invoker = true) AS
SELECT u.id, u.email, u.raw_user_meta_data->>'full_name' AS full_name,
    u.raw_user_meta_data->>'avatar_url' AS avatar_url, u.created_at,
    u.last_sign_in_at,
    om.org_id, o.name AS org_name, om.role AS org_role, pu.business_role,
    om.status AS membership_status,
    pu.status AS user_status,
    pu.invited_at,
    pu.invited_by,
    pu.invitation_accepted_at,
    EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = u.id AND pa.is_active = true) AS is_platform_admin
FROM auth.users u
LEFT JOIN organization_members om ON om.user_id = u.id
LEFT JOIN organizations o ON o.id = om.org_id
LEFT JOIN users pu ON pu.id = u.id;

GRANT SELECT ON platform_users_overview TO authenticated;

-- ============================================
-- 5. COMMENTS
-- ============================================

COMMENT ON COLUMN users.invited_at IS 'Timestamp when invitation email was sent';
COMMENT ON COLUMN users.invited_by IS 'User ID of admin who sent the invitation';
COMMENT ON COLUMN users.invitation_accepted_at IS 'Timestamp when user accepted invitation and set password';
COMMENT ON FUNCTION activate_invited_user IS 'Activates a user after they accept their email invitation and set a password';
