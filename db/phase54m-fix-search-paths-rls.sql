-- Phase 54m: Database Security Hardening - Function Search Paths & RLS Policies
-- Date: 2026-02-13
-- Fixes Supabase linter warnings:
--   1. function_search_path_mutable (53 functions) - Set search_path = public
--   2. rls_policy_always_true (10 policies) - Remove/scope overly permissive policies
--   3. auth_leaked_password_protection - Enable in Supabase Dashboard → Auth → Settings
--
-- SAFETY NOTE: The Express backend uses SUPABASE_SERVICE_KEY (service_role) which
-- bypasses RLS entirely. These RLS fixes are defense-in-depth against direct
-- Supabase REST API access. No application-level behavior changes expected.

-- ============================================================
-- PART 1: Set search_path on all public functions
-- ============================================================
-- Without an explicit search_path, a malicious user could theoretically
-- redirect function calls to a different schema. Setting search_path = public
-- makes the implicit default explicit and eliminates the warning.

DO $$
DECLARE
    func_record RECORD;
    fixed_count INTEGER := 0;
BEGIN
    FOR func_record IN
        SELECT n.nspname AS schema_name,
               p.proname AS function_name,
               pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND (p.proconfig IS NULL OR NOT EXISTS (
            SELECT 1 FROM unnest(p.proconfig) AS c WHERE c LIKE 'search_path=%'
        ))
    LOOP
        EXECUTE format(
            'ALTER FUNCTION %I.%I(%s) SET search_path = public',
            func_record.schema_name,
            func_record.function_name,
            func_record.args
        );
        fixed_count := fixed_count + 1;
        RAISE NOTICE 'Fixed search_path for %.%(%)',
            func_record.schema_name, func_record.function_name, func_record.args;
    END LOOP;
    RAISE NOTICE 'Total functions fixed: %', fixed_count;
END$$;


-- ============================================================
-- PART 2: Fix overly permissive RLS policies
-- ============================================================

-- 2a. align120_sessions: Drop legacy catch-all from phase7
-- Superseded by org-aware policies added in phase39:
--   "Users can view own or org align120_sessions" (SELECT)
--   "Users can insert align120_sessions" (INSERT)
--   "Users can update own or org align120_sessions" (UPDATE)
--   "Users can delete own align120_sessions" (DELETE)
DROP POLICY IF EXISTS "Allow all operations on align120_sessions" ON align120_sessions;

-- 2b. company_profiles: Drop legacy catch-all from phase7
-- Superseded by org-aware policies added in phase39:
--   "Users can view own or org company_profiles" (SELECT)
--   "Users can insert company_profiles" (INSERT)
--   "Users can update own or org company_profiles" (UPDATE)
--   "Users can delete own company_profiles" (DELETE)
DROP POLICY IF EXISTS "Allow all operations on company_profiles" ON company_profiles;

-- 2c. skill_departments: Drop ALL-roles policy
-- This applied to ALL roles (including anon) with no restrictions.
-- Authenticated SELECT already exists. Writes go through service_role.
DROP POLICY IF EXISTS "Service role full access skill_departments" ON skill_departments;

-- 2d. skill_roles: Drop ALL-roles policy (same reasoning)
DROP POLICY IF EXISTS "Service role full access skill_roles" ON skill_roles;

-- 2e. workflow_departments: Drop ALL-roles policy (same reasoning)
DROP POLICY IF EXISTS "Service role full access workflow_departments" ON workflow_departments;

-- 2f. integrity_component_status: Remove overly permissive ALL policy
-- System-wide monitoring data with no user/org scoping.
-- Authenticated users only need read access (existing SELECT policy remains).
-- Writes go through service_role.
DROP POLICY IF EXISTS "System can update component status" ON integrity_component_status;

-- 2g. integrity_metric_values: Remove permissive INSERT policy
-- Time-series system data with no user/org scoping.
-- Authenticated users only need read access (existing SELECT policy remains).
-- Writes go through service_role.
DROP POLICY IF EXISTS "System can insert metric values" ON integrity_metric_values;

-- 2h. audit_log: Scope INSERT to user's own audit entries
-- Previously: any authenticated user could insert any entry.
-- Now: authenticated users can only insert entries with their own user_id.
-- Backend uses service_role for audit logging (bypasses RLS), so no impact.
DROP POLICY IF EXISTS "System can insert audit log entries" ON audit_log;
CREATE POLICY "Authenticated users can insert own audit entries"
    ON audit_log FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 2i. organizations: Scope INSERT to own organizations
-- Previously: any authenticated user could insert with any owner_id.
-- Now: owner_id must match the authenticated user.
-- Backend org creation uses service_role, so no impact.
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
CREATE POLICY "Users can create own organizations"
    ON organizations FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

-- 2j. users: Scope INSERT to own profile and require authentication
-- Previously: both authenticated AND anon could insert any user row.
-- Now: only authenticated users can insert their own profile (id = auth.uid()).
-- Backend user creation uses service_role (Supabase Admin API), so no impact.
DROP POLICY IF EXISTS "users_insert_new" ON users;
CREATE POLICY "Users can create own profile"
    ON users FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());


-- ============================================================
-- PART 3: Leaked Password Protection
-- ============================================================
-- This is a Supabase Dashboard setting, not a SQL migration.
-- To enable:
--   1. Go to Supabase Dashboard → Authentication → Settings
--   2. Under "Password Security", enable "Leaked Password Protection"
--   3. This checks passwords against HaveIBeenPwned.org on signup/password change
--
-- No SQL changes needed for this fix.


-- ============================================================
-- VERIFICATION: Run after migration to confirm fixes
-- ============================================================
-- Check remaining function_search_path_mutable warnings:
--   SELECT p.proname, pg_get_function_identity_arguments(p.oid)
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public'
--   AND (p.proconfig IS NULL OR NOT EXISTS (
--       SELECT 1 FROM unnest(p.proconfig) AS c WHERE c LIKE 'search_path=%'
--   ));
-- Expected result: 0 rows
