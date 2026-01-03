-- ============================================
-- Insight 360 - Users Table RLS Policy Fix
-- Version: 1.0
-- Description: Adds missing INSERT and admin policies for users table
-- ============================================

-- Problem: The users table has RLS enabled but no INSERT policy,
-- which prevents new users from being added to the public.users table.
-- When Supabase Auth creates a user in auth.users, the trigger or
-- admin operation that should create the corresponding public.users
-- record fails due to missing RLS policy.

-- Solution: Add policies that allow:
-- 1. Service role / system operations to insert users
-- 2. Admins to manage all users
-- 3. Users to read their own profiles (already exists)

-- ============================================
-- ADD INSERT POLICY FOR USER CREATION
-- ============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow service role to manage users" ON public.users;
DROP POLICY IF EXISTS "Allow admin to manage all users" ON public.users;
DROP POLICY IF EXISTS "Allow user creation via trigger" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated to read users" ON public.users;

-- Policy: Allow authenticated users to read any user (needed for admin panel)
-- This replaces the restrictive "Users can view own profile" for admin purposes
CREATE POLICY "Allow authenticated to read users" ON public.users
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow inserts for new users
-- This is needed when the handle_new_user trigger fires on auth.users INSERT
-- The trigger runs with SECURITY DEFINER, so we need to allow inserts
CREATE POLICY "Allow user creation via trigger" ON public.users
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- Policy: Allow admins to update/delete any user
CREATE POLICY "Allow admin to manage all users" ON public.users
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- Note: The service role key should bypass RLS entirely, but if it's not working,
-- this policy ensures the system can still function with the anon key.

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'users';

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'USERS TABLE RLS POLICY FIX COMPLETED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Total policies on users table: %', policy_count;
    RAISE NOTICE '';
    RAISE NOTICE 'New policies added:';
    RAISE NOTICE '  - Allow authenticated to read users (SELECT)';
    RAISE NOTICE '  - Allow user creation via trigger (INSERT)';
    RAISE NOTICE '  - Allow admin to manage all users (ALL)';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: Ensure SUPABASE_SERVICE_KEY is set in .env';
    RAISE NOTICE 'The service role key bypasses RLS entirely.';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
