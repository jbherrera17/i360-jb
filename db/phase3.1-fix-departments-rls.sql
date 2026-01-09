-- ============================================
-- Insight 360 - Phase 3.1: Fix Departments RLS
-- Version: 3.0
-- Date: January 2026
-- Description: Fix RLS policies for departments table
--              and add is_seed column for system seeding
-- ============================================

-- ============================================
-- ADD is_seed COLUMN TO DEPARTMENTS
-- ============================================

-- Add is_seed column to mark system-seeded departments
ALTER TABLE departments
ADD COLUMN IF NOT EXISTS is_seed BOOLEAN DEFAULT false;

COMMENT ON COLUMN departments.is_seed IS 'Marks departments as system-seeded for client onboarding';

-- ============================================
-- DROP EXISTING RESTRICTIVE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own departments" ON departments;
DROP POLICY IF EXISTS "Users can insert own departments" ON departments;
DROP POLICY IF EXISTS "Users can update own departments" ON departments;
DROP POLICY IF EXISTS "Users can delete own departments" ON departments;
DROP POLICY IF EXISTS "Allow service role full access to departments" ON departments;
DROP POLICY IF EXISTS "Users can view accessible departments" ON departments;
DROP POLICY IF EXISTS "Users can insert departments" ON departments;

-- ============================================
-- CREATE SERVICE ROLE BYPASS POLICY
-- ============================================

-- Service role has full access (for server-side operations)
CREATE POLICY "Allow service role full access to departments" ON departments
    FOR ALL USING (
        auth.role() = 'service_role'
    );

-- ============================================
-- CREATE USER POLICIES WITH NULL USER_ID SUPPORT
-- ============================================

-- Users can view:
-- 1. Their own departments (user_id matches)
-- 2. Seeded/system departments (is_seed = true)
-- 3. Departments with no owner (user_id IS NULL) - for shared/global departments
CREATE POLICY "Users can view accessible departments" ON departments
    FOR SELECT USING (
        auth.uid() = user_id
        OR is_seed = true
        OR user_id IS NULL
    );

-- Users can insert departments with their user_id or NULL (for server operations)
CREATE POLICY "Users can insert departments" ON departments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR user_id IS NULL
    );

-- Users can update their own departments
-- Seeded departments can only be updated by service role (handled above)
CREATE POLICY "Users can update own departments" ON departments
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- Users can delete their own departments (not seeded ones)
CREATE POLICY "Users can delete own departments" ON departments
    FOR DELETE USING (
        auth.uid() = user_id
        AND (is_seed = false OR is_seed IS NULL)
    );

-- ============================================
-- FIX ROLES TABLE RLS (Same pattern)
-- ============================================

DROP POLICY IF EXISTS "Users can view own roles" ON roles;
DROP POLICY IF EXISTS "Users can insert own roles" ON roles;
DROP POLICY IF EXISTS "Users can update own roles" ON roles;
DROP POLICY IF EXISTS "Users can delete own roles" ON roles;
DROP POLICY IF EXISTS "Allow service role full access to roles" ON roles;
DROP POLICY IF EXISTS "Users can view accessible roles" ON roles;
DROP POLICY IF EXISTS "Users can insert roles" ON roles;

-- Service role bypass
CREATE POLICY "Allow service role full access to roles" ON roles
    FOR ALL USING (
        auth.role() = 'service_role'
    );

-- Users can view roles in accessible departments
CREATE POLICY "Users can view accessible roles" ON roles
    FOR SELECT USING (
        auth.uid() = user_id
        OR user_id IS NULL
        OR EXISTS (
            SELECT 1 FROM departments d
            WHERE d.id = roles.department_id
            AND (d.user_id = auth.uid() OR d.is_seed = true OR d.user_id IS NULL)
        )
    );

-- Users can insert roles
CREATE POLICY "Users can insert roles" ON roles
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR user_id IS NULL
    );

-- Users can update own roles
CREATE POLICY "Users can update own roles" ON roles
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- Users can delete own roles
CREATE POLICY "Users can delete own roles" ON roles
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- ============================================
-- FIX OKRs TABLE RLS (Same pattern)
-- ============================================

DROP POLICY IF EXISTS "Users can view own OKRs" ON okrs;
DROP POLICY IF EXISTS "Users can insert own OKRs" ON okrs;
DROP POLICY IF EXISTS "Users can update own OKRs" ON okrs;
DROP POLICY IF EXISTS "Users can delete own OKRs" ON okrs;
DROP POLICY IF EXISTS "Users can view own okrs" ON okrs;
DROP POLICY IF EXISTS "Users can insert own okrs" ON okrs;
DROP POLICY IF EXISTS "Users can update own okrs" ON okrs;
DROP POLICY IF EXISTS "Users can delete own okrs" ON okrs;
DROP POLICY IF EXISTS "Allow service role full access to okrs" ON okrs;
DROP POLICY IF EXISTS "Users can view accessible okrs" ON okrs;
DROP POLICY IF EXISTS "Users can insert okrs" ON okrs;

-- Service role bypass
CREATE POLICY "Allow service role full access to okrs" ON okrs
    FOR ALL USING (
        auth.role() = 'service_role'
    );

-- Users can view OKRs:
-- 1. Their own OKRs
-- 2. Company-level OKRs (scope = 'company')
-- 3. Department OKRs in accessible departments
-- 4. OKRs with no owner
CREATE POLICY "Users can view accessible okrs" ON okrs
    FOR SELECT USING (
        auth.uid() = user_id
        OR user_id IS NULL
        OR scope = 'company'
        OR EXISTS (
            SELECT 1 FROM departments d
            WHERE d.id = okrs.department_id
            AND (d.user_id = auth.uid() OR d.is_seed = true OR d.user_id IS NULL)
        )
    );

-- Users can insert OKRs
CREATE POLICY "Users can insert okrs" ON okrs
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR user_id IS NULL
    );

-- Users can update own OKRs
CREATE POLICY "Users can update own okrs" ON okrs
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- Users can delete own OKRs
CREATE POLICY "Users can delete own okrs" ON okrs
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- ============================================
-- FIX PROCESSES TABLE RLS (Same pattern)
-- ============================================

DROP POLICY IF EXISTS "Users can view own processes" ON processes;
DROP POLICY IF EXISTS "Users can insert own processes" ON processes;
DROP POLICY IF EXISTS "Users can update own processes" ON processes;
DROP POLICY IF EXISTS "Users can delete own processes" ON processes;
DROP POLICY IF EXISTS "Allow service role full access to processes" ON processes;
DROP POLICY IF EXISTS "Users can view accessible processes" ON processes;
DROP POLICY IF EXISTS "Users can insert processes" ON processes;

-- Service role bypass
CREATE POLICY "Allow service role full access to processes" ON processes
    FOR ALL USING (
        auth.role() = 'service_role'
    );

-- Users can view processes in accessible departments
CREATE POLICY "Users can view accessible processes" ON processes
    FOR SELECT USING (
        auth.uid() = user_id
        OR user_id IS NULL
        OR EXISTS (
            SELECT 1 FROM departments d
            WHERE d.id = processes.department_id
            AND (d.user_id = auth.uid() OR d.is_seed = true OR d.user_id IS NULL)
        )
    );

-- Users can insert processes
CREATE POLICY "Users can insert processes" ON processes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR user_id IS NULL
    );

-- Users can update own processes
CREATE POLICY "Users can update own processes" ON processes
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- Users can delete own processes
CREATE POLICY "Users can delete own processes" ON processes
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- ============================================
-- UPDATE EXISTING SEED DEPARTMENTS
-- ============================================

-- Mark existing seeded departments as is_seed = true
UPDATE departments
SET is_seed = true
WHERE name IN (
    'Executive', 'Finance', 'Operations', 'Sales',
    'Marketing', 'Production', 'Service', 'Stakeholder Relations',
    'HR'
) AND user_id IS NULL;

-- ============================================
-- VERIFY CHANGES
-- ============================================

-- Show updated departments
SELECT id, name, is_seed, user_id, is_active
FROM departments
ORDER BY sort_order;

-- Show policy count
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('departments', 'roles', 'okrs', 'processes')
ORDER BY tablename, policyname;
