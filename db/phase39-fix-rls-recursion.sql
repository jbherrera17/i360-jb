-- ============================================
-- Phase 39 Fix: RLS Policy Recursion Fix
-- Fixes infinite recursion in organization_members policies
-- ============================================
--
-- The problem: RLS policies on organization_members that check
-- organization_members cause infinite recursion.
--
-- The fix: Use SECURITY DEFINER functions that bypass RLS when
-- checking membership, then use those functions in policies.
-- ============================================

-- Step 1: Create helper functions that bypass RLS (SECURITY DEFINER)
-- These functions run with the privileges of the function owner (postgres)
-- and thus bypass RLS policies.

-- Function to check if a user is a member of an organization (bypasses RLS)
CREATE OR REPLACE FUNCTION auth_is_org_member(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM organization_members
        WHERE user_id = p_user_id
        AND org_id = p_org_id
        AND status = 'active'
    );
$$;

-- Function to check if a user is an admin/owner of an organization (bypasses RLS)
CREATE OR REPLACE FUNCTION auth_is_org_admin(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM organization_members
        WHERE user_id = p_user_id
        AND org_id = p_org_id
        AND role IN ('owner', 'admin')
        AND status = 'active'
    );
$$;

-- Function to get org_ids a user is a member of (bypasses RLS)
CREATE OR REPLACE FUNCTION auth_user_org_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT org_id FROM organization_members
    WHERE user_id = p_user_id
    AND status = 'active';
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION auth_is_org_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auth_is_org_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auth_user_org_ids(UUID) TO authenticated;

-- Step 2: Drop ALL existing policies on organization_members (except service role)
DROP POLICY IF EXISTS "Members can view org members" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage org members" ON organization_members;
DROP POLICY IF EXISTS "Org owners and admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update org members" ON organization_members;
DROP POLICY IF EXISTS "Admins can delete org members" ON organization_members;

-- Step 3: Create new policies using the SECURITY DEFINER functions

-- SELECT: Members can view their org's members
CREATE POLICY "Members can view org members"
ON organization_members FOR SELECT
TO authenticated
USING (
    -- User is viewing their own membership
    user_id = auth.uid()
    -- OR user is a member of this organization (using safe function)
    OR auth_is_org_member(auth.uid(), org_id)
);

-- INSERT: Owner can add first member, admins can add subsequent members
CREATE POLICY "Org owners and admins can add members"
ON organization_members FOR INSERT
TO authenticated
WITH CHECK (
    -- The user is the organization owner (check via organizations table - no recursion)
    EXISTS (
        SELECT 1 FROM organizations o
        WHERE o.id = org_id
        AND o.owner_id = auth.uid()
    )
    -- OR the user is already an admin of the organization (using safe function)
    OR auth_is_org_admin(auth.uid(), org_id)
);

-- UPDATE: Admins can update members
CREATE POLICY "Admins can update org members"
ON organization_members FOR UPDATE
TO authenticated
USING (auth_is_org_admin(auth.uid(), org_id))
WITH CHECK (auth_is_org_admin(auth.uid(), org_id));

-- DELETE: Admins can delete members
CREATE POLICY "Admins can delete org members"
ON organization_members FOR DELETE
TO authenticated
USING (auth_is_org_admin(auth.uid(), org_id));

-- Step 4: Fix organizations INSERT policy
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;

CREATE POLICY "Users can create organizations"
ON organizations FOR INSERT
TO authenticated
WITH CHECK (true);  -- Allow any authenticated user to create an org

-- Step 5: Add comments
COMMENT ON FUNCTION auth_is_org_member(UUID, UUID) IS
'SECURITY DEFINER function to check org membership without triggering RLS recursion';

COMMENT ON FUNCTION auth_is_org_admin(UUID, UUID) IS
'SECURITY DEFINER function to check org admin status without triggering RLS recursion';

COMMENT ON POLICY "Org owners and admins can add members" ON organization_members IS
'Allows org owner (via organizations.owner_id) to add first member, and existing admins to add subsequent members';
