-- ============================================================================
-- INSIGHT 360 - User Roles Migration
-- Adds role-based access control for admin/user distinction
-- ============================================================================

-- 1. Add role column to users table
-- ============================================================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
CHECK (role IN ('admin', 'user', 'viewer'));

-- Add index for role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Create user_roles enum type for clarity (optional, using CHECK instead)
-- ============================================================================
-- Using CHECK constraint above instead of enum for flexibility

-- 3. Function to check if current user is admin
-- ============================================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to get current user's role
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM users
    WHERE id = auth.uid();

    RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update agents RLS policies for role-based access
-- ============================================================================

-- Drop existing policies (both old and new names to be safe)
DROP POLICY IF EXISTS "Users can view own agents or public agents" ON agents;
DROP POLICY IF EXISTS "Users can create own agents" ON agents;
DROP POLICY IF EXISTS "Users can update own agents" ON agents;
DROP POLICY IF EXISTS "Users can delete own agents" ON agents;
DROP POLICY IF EXISTS "Select agents policy" ON agents;
DROP POLICY IF EXISTS "Insert agents policy" ON agents;
DROP POLICY IF EXISTS "Update agents policy" ON agents;
DROP POLICY IF EXISTS "Delete agents policy" ON agents;

-- New SELECT policy: Everyone can view public agents or their own
CREATE POLICY "Select agents policy"
ON agents FOR SELECT
USING (
    is_public = true
    OR user_id = auth.uid()
    OR user_id IS NULL  -- System agents (no owner) are viewable by all
);

-- New INSERT policy: Authenticated users can create agents
CREATE POLICY "Insert agents policy"
ON agents FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id = auth.uid() OR user_id IS NULL)
);

-- New UPDATE policy:
--   - Users can update their own non-system agents
--   - Admins can update any agent including system agents
CREATE POLICY "Update agents policy"
ON agents FOR UPDATE
USING (
    (user_id = auth.uid() AND is_system = false)
    OR is_admin()
)
WITH CHECK (
    (user_id = auth.uid() AND is_system = false)
    OR is_admin()
);

-- New DELETE policy:
--   - Users can delete their own non-system agents
--   - Admins can delete any agent including system agents
CREATE POLICY "Delete agents policy"
ON agents FOR DELETE
USING (
    (user_id = auth.uid() AND is_system = false)
    OR is_admin()
);

-- 6. Create admin user helper function
-- ============================================================================
CREATE OR REPLACE FUNCTION make_user_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    affected_rows INT;
    auth_user_id UUID;
BEGIN
    -- First try to update existing user
    UPDATE users SET role = 'admin' WHERE email = user_email;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    -- If no rows updated, try to find user in auth.users and create profile
    IF affected_rows = 0 THEN
        -- Look up user ID from Supabase auth
        SELECT id INTO auth_user_id
        FROM auth.users
        WHERE email = user_email;

        IF auth_user_id IS NOT NULL THEN
            -- Insert new user profile with admin role
            INSERT INTO users (id, email, role, display_name)
            VALUES (auth_user_id, user_email, 'admin', split_part(user_email, '@', 1))
            ON CONFLICT (id) DO UPDATE SET role = 'admin';

            RETURN true;
        END IF;

        RETURN false;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create view for user roles management
-- ============================================================================
CREATE OR REPLACE VIEW user_roles_view AS
SELECT
    u.id,
    u.email,
    u.display_name,
    u.role,
    u.created_at,
    COUNT(a.id) FILTER (WHERE a.user_id = u.id) as agent_count,
    COUNT(DISTINCT c.id) as conversation_count
FROM users u
LEFT JOIN agents a ON a.user_id = u.id
LEFT JOIN conversations c ON c.user_id = u.id
GROUP BY u.id, u.email, u.display_name, u.role, u.created_at
ORDER BY u.created_at DESC;

-- 8. Create roles summary view
-- ============================================================================
CREATE OR REPLACE VIEW roles_summary AS
SELECT
    role,
    COUNT(*) as user_count
FROM users
GROUP BY role
ORDER BY
    CASE role
        WHEN 'admin' THEN 1
        WHEN 'user' THEN 2
        WHEN 'viewer' THEN 3
    END;

-- 9. Verification queries
-- ============================================================================
-- Uncomment to run after migration:

-- Check users table has role column
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'users' AND column_name = 'role';

-- Check policies on agents table
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'agents';

-- Test is_admin function
-- SELECT is_admin();

-- View all users with roles
-- SELECT * FROM user_roles_view;

-- ============================================================================
-- POST-MIGRATION: Set initial admin
-- Run this manually to make your first admin:
-- SELECT make_user_admin('your-email@example.com');
-- ============================================================================
