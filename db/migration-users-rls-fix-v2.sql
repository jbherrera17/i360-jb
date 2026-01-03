-- ============================================
-- Insight 360 - Users Table RLS Policy Fix v2
-- Version: 2.0
-- Description: Fixes infinite recursion in RLS policies
-- ============================================

-- Problem: The "Allow admin to manage all users" policy causes infinite recursion
-- because it queries public.users to check if the current user is an admin,
-- which triggers the same policy check again.

-- Solution:
-- 1. For SELECT: Allow all authenticated users to read (needed for login profile fetch)
-- 2. For INSERT: Allow authenticated users and anon (for registration)
-- 3. For UPDATE/DELETE: Use a SECURITY DEFINER function to check admin status
--    OR simplify to "users can update own profile"

-- ============================================
-- DROP ALL EXISTING POLICIES ON USERS TABLE
-- ============================================

DROP POLICY IF EXISTS "Allow service role to manage users" ON public.users;
DROP POLICY IF EXISTS "Allow admin to manage all users" ON public.users;
DROP POLICY IF EXISTS "Allow user creation via trigger" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated to read users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow users to read own profile" ON public.users;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.users;

-- ============================================
-- CREATE SECURITY DEFINER FUNCTION FOR ADMIN CHECK
-- This function bypasses RLS when checking admin status
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = user_id AND role = 'admin'
    );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- ============================================
-- CREATE NEW RLS POLICIES (NO RECURSION)
-- ============================================

-- Policy 1: SELECT - All authenticated users can read any user
-- This is necessary for the login profile fetch and admin panel
CREATE POLICY "users_select_authenticated" ON public.users
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: INSERT - Allow inserts for new users
-- Needed for registration and admin user creation
CREATE POLICY "users_insert_new" ON public.users
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- Policy 3: UPDATE - Users can update their own profile OR admins can update anyone
-- Uses the security definer function to avoid recursion
CREATE POLICY "users_update_own_or_admin" ON public.users
    FOR UPDATE
    TO authenticated
    USING (
        id = auth.uid()
        OR public.is_admin(auth.uid())
    )
    WITH CHECK (
        id = auth.uid()
        OR public.is_admin(auth.uid())
    );

-- Policy 4: DELETE - Only admins can delete users
-- Uses the security definer function to avoid recursion
CREATE POLICY "users_delete_admin_only" ON public.users
    FOR DELETE
    TO authenticated
    USING (
        public.is_admin(auth.uid())
    );

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
    policy_count INTEGER;
    function_exists BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'users';

    SELECT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'is_admin'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) INTO function_exists;

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'USERS TABLE RLS POLICY FIX v2 COMPLETED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Total policies on users table: %', policy_count;
    RAISE NOTICE 'is_admin function created: %', function_exists;
    RAISE NOTICE '';
    RAISE NOTICE 'Policies created:';
    RAISE NOTICE '  - users_select_authenticated (SELECT)';
    RAISE NOTICE '  - users_insert_new (INSERT)';
    RAISE NOTICE '  - users_update_own_or_admin (UPDATE)';
    RAISE NOTICE '  - users_delete_admin_only (DELETE)';
    RAISE NOTICE '';
    RAISE NOTICE 'The is_admin() function uses SECURITY DEFINER';
    RAISE NOTICE 'to bypass RLS and prevent infinite recursion.';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
