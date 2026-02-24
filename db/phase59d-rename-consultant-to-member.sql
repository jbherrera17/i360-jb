-- Phase 59d: Rename 'consultant' role to 'member' in organization_members
-- This standardizes org member roles to: owner, admin, member, viewer
-- 'Owner' only applies to agency-tier organizations

BEGIN;

-- Step 1: Drop existing CHECK constraint on role column
ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check;

-- Step 2: Update all existing 'consultant' roles to 'member'
UPDATE organization_members SET role = 'member' WHERE role = 'consultant';

-- Step 3: Add new CHECK constraint with 'member' replacing 'consultant'
ALTER TABLE organization_members
    ADD CONSTRAINT organization_members_role_check
    CHECK (role IN ('owner', 'admin', 'member', 'viewer'));

-- Step 4: Update default value
ALTER TABLE organization_members ALTER COLUMN role SET DEFAULT 'member';

-- Step 5: Update column comment
COMMENT ON COLUMN organization_members.role IS 'owner=full control (agency only), admin=manage members/clients, member=active team member, viewer=read-only';

-- Step 6: Update RLS policies that reference 'consultant'
-- Drop and recreate client management policies

-- Policy: Admins and members can manage clients
DROP POLICY IF EXISTS "Admins and consultants can manage clients" ON clients;
CREATE POLICY "Admins and members can manage clients"
    ON clients
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE user_id = auth.uid()
            AND org_id = clients.org_id
            AND role IN ('owner', 'admin', 'member')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE user_id = auth.uid()
            AND org_id = clients.org_id
            AND role IN ('owner', 'admin', 'member')
        )
    );

-- Update client_users policies if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_users' AND table_schema = 'public') THEN
        -- Drop old policies that reference consultant
        DROP POLICY IF EXISTS "Org admins and consultants can manage client users" ON client_users;
        DROP POLICY IF EXISTS "Org admins and consultants can view client users" ON client_users;
        -- Recreate with 'member' instead of 'consultant'
        CREATE POLICY "Org admins and members can manage client users"
            ON client_users
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM organization_members om
                    JOIN clients c ON c.org_id = om.org_id
                    WHERE om.user_id = auth.uid()
                    AND c.id = client_users.client_id
                    AND om.role IN ('owner', 'admin', 'member')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM organization_members om
                    JOIN clients c ON c.org_id = om.org_id
                    WHERE om.user_id = auth.uid()
                    AND c.id = client_users.client_id
                    AND om.role IN ('owner', 'admin', 'member')
                )
            );
    END IF;
END $$;

-- Update client_portal_access policies if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_portal_access' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Org admins and consultants can manage portal access" ON client_portal_access;
        CREATE POLICY "Org admins and members can manage portal access"
            ON client_portal_access
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM organization_members om
                    JOIN clients c ON c.org_id = om.org_id
                    WHERE om.user_id = auth.uid()
                    AND c.id = client_portal_access.client_id
                    AND om.role IN ('owner', 'admin', 'member')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM organization_members om
                    JOIN clients c ON c.org_id = om.org_id
                    WHERE om.user_id = auth.uid()
                    AND c.id = client_portal_access.client_id
                    AND om.role IN ('owner', 'admin', 'member')
                )
            );
    END IF;
END $$;

COMMIT;
