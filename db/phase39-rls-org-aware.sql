-- ============================================
-- Phase 39: Organization-Aware RLS Policies
-- Updates existing RLS policies to support multi-tenant access
-- ============================================
--
-- This file updates existing RLS policies to allow access when:
-- 1. User owns the resource (user_id = auth.uid()) - Original behavior
-- 2. User is member of the organization that owns the resource - New behavior
--
-- IMPORTANT: Run this AFTER phase39-agency-foundation.sql
-- ============================================

-- ============================================
-- HELPER: Check if user can access org's data
-- ============================================

-- Function to check if user has access to org data
CREATE OR REPLACE FUNCTION user_has_org_access(p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE user_id = auth.uid()
        AND org_id = p_org_id
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION user_has_org_access(UUID) TO authenticated;


-- ============================================
-- 1. AGENTS TABLE - Org-Aware Policies
-- ============================================

-- Drop existing policies (both old and new names to handle re-runs)
DROP POLICY IF EXISTS "Users can view own agents" ON agents;
DROP POLICY IF EXISTS "Users can insert own agents" ON agents;
DROP POLICY IF EXISTS "Users can update own agents" ON agents;
DROP POLICY IF EXISTS "Users can delete own agents" ON agents;
DROP POLICY IF EXISTS "Users can view public agents" ON agents;
DROP POLICY IF EXISTS "Users can view own or org agents" ON agents;
DROP POLICY IF EXISTS "Users can insert agents" ON agents;
DROP POLICY IF EXISTS "Users can update own or org agents" ON agents;

-- New org-aware policies
CREATE POLICY "Users can view own or org agents"
ON agents FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()                              -- Own agents
    OR is_public = TRUE                               -- Public agents
    OR user_has_org_access(org_id)                    -- Org agents
);

CREATE POLICY "Users can insert agents"
ON agents FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND (org_id IS NULL OR user_has_org_access(org_id))
);

CREATE POLICY "Users can update own or org agents"
ON agents FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
)
WITH CHECK (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
);

CREATE POLICY "Users can delete own agents"
ON agents FOR DELETE
TO authenticated
USING (user_id = auth.uid());


-- ============================================
-- 2. WORKFLOWS TABLE - Org-Aware Policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own workflows" ON workflows;
DROP POLICY IF EXISTS "Users can insert own workflows" ON workflows;
DROP POLICY IF EXISTS "Users can update own workflows" ON workflows;
DROP POLICY IF EXISTS "Users can delete own workflows" ON workflows;
DROP POLICY IF EXISTS "Users can view public workflows" ON workflows;
DROP POLICY IF EXISTS "Users can view own or org workflows" ON workflows;
DROP POLICY IF EXISTS "Users can insert workflows" ON workflows;
DROP POLICY IF EXISTS "Users can update own or org workflows" ON workflows;

CREATE POLICY "Users can view own or org workflows"
ON workflows FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR is_public = TRUE
    OR user_has_org_access(org_id)
);

CREATE POLICY "Users can insert workflows"
ON workflows FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND (org_id IS NULL OR user_has_org_access(org_id))
);

CREATE POLICY "Users can update own or org workflows"
ON workflows FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
)
WITH CHECK (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
);

CREATE POLICY "Users can delete own workflows"
ON workflows FOR DELETE
TO authenticated
USING (user_id = auth.uid());


-- ============================================
-- 3. SKILLS TABLE - Org-Aware Policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own skills" ON skills;
DROP POLICY IF EXISTS "Users can insert own skills" ON skills;
DROP POLICY IF EXISTS "Users can update own skills" ON skills;
DROP POLICY IF EXISTS "Users can delete own skills" ON skills;
DROP POLICY IF EXISTS "Users can view public skills" ON skills;
DROP POLICY IF EXISTS "Users can view own or org skills" ON skills;
DROP POLICY IF EXISTS "Users can insert skills" ON skills;
DROP POLICY IF EXISTS "Users can update own or org skills" ON skills;

CREATE POLICY "Users can view own or org skills"
ON skills FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR visibility = 'public'
    OR user_has_org_access(org_id)
);

CREATE POLICY "Users can insert skills"
ON skills FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND (org_id IS NULL OR user_has_org_access(org_id))
);

CREATE POLICY "Users can update own or org skills"
ON skills FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
)
WITH CHECK (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
);

CREATE POLICY "Users can delete own skills"
ON skills FOR DELETE
TO authenticated
USING (user_id = auth.uid());


-- ============================================
-- 4. CONTEXT_ASSETS TABLE - Org-Aware Policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own context_assets" ON context_assets;
DROP POLICY IF EXISTS "Users can insert own context_assets" ON context_assets;
DROP POLICY IF EXISTS "Users can update own context_assets" ON context_assets;
DROP POLICY IF EXISTS "Users can delete own context_assets" ON context_assets;
DROP POLICY IF EXISTS "Users can view public context_assets" ON context_assets;
DROP POLICY IF EXISTS "Users can view own or org context_assets" ON context_assets;
DROP POLICY IF EXISTS "Users can insert context_assets" ON context_assets;
DROP POLICY IF EXISTS "Users can update own or org context_assets" ON context_assets;

CREATE POLICY "Users can view own or org context_assets"
ON context_assets FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR visibility = 'public'
    OR user_has_org_access(org_id)
);

CREATE POLICY "Users can insert context_assets"
ON context_assets FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND (org_id IS NULL OR user_has_org_access(org_id))
);

CREATE POLICY "Users can update own or org context_assets"
ON context_assets FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
)
WITH CHECK (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
);

CREATE POLICY "Users can delete own context_assets"
ON context_assets FOR DELETE
TO authenticated
USING (user_id = auth.uid());


-- ============================================
-- 5. COMPANY_PROFILES TABLE - Org-Aware Policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own company_profiles" ON company_profiles;
DROP POLICY IF EXISTS "Users can insert own company_profiles" ON company_profiles;
DROP POLICY IF EXISTS "Users can update own company_profiles" ON company_profiles;
DROP POLICY IF EXISTS "Users can delete own company_profiles" ON company_profiles;
DROP POLICY IF EXISTS "Users can view own or org company_profiles" ON company_profiles;
DROP POLICY IF EXISTS "Users can insert company_profiles" ON company_profiles;
DROP POLICY IF EXISTS "Users can update own or org company_profiles" ON company_profiles;

CREATE POLICY "Users can view own or org company_profiles"
ON company_profiles FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
);

CREATE POLICY "Users can insert company_profiles"
ON company_profiles FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND (org_id IS NULL OR user_has_org_access(org_id))
);

CREATE POLICY "Users can update own or org company_profiles"
ON company_profiles FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
)
WITH CHECK (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
);

CREATE POLICY "Users can delete own company_profiles"
ON company_profiles FOR DELETE
TO authenticated
USING (user_id = auth.uid());


-- ============================================
-- 6. ALIGN120_SESSIONS TABLE - Org-Aware Policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own align120_sessions" ON align120_sessions;
DROP POLICY IF EXISTS "Users can insert own align120_sessions" ON align120_sessions;
DROP POLICY IF EXISTS "Users can update own align120_sessions" ON align120_sessions;
DROP POLICY IF EXISTS "Users can delete own align120_sessions" ON align120_sessions;
-- Also drop new names for re-run safety
DROP POLICY IF EXISTS "Users can view own or org align120_sessions" ON align120_sessions;
DROP POLICY IF EXISTS "Users can insert align120_sessions" ON align120_sessions;
DROP POLICY IF EXISTS "Users can update own or org align120_sessions" ON align120_sessions;

CREATE POLICY "Users can view own or org align120_sessions"
ON align120_sessions FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
);

CREATE POLICY "Users can insert align120_sessions"
ON align120_sessions FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND (org_id IS NULL OR user_has_org_access(org_id))
);

CREATE POLICY "Users can update own or org align120_sessions"
ON align120_sessions FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
)
WITH CHECK (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
);

CREATE POLICY "Users can delete own align120_sessions"
ON align120_sessions FOR DELETE
TO authenticated
USING (user_id = auth.uid());


-- ============================================
-- 7. CONVERSATIONS TABLE - Org-Aware Policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
-- Also drop new names for re-run safety
DROP POLICY IF EXISTS "Users can view own or org conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own or org conversations" ON conversations;

CREATE POLICY "Users can view own or org conversations"
ON conversations FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
);

CREATE POLICY "Users can insert conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND (org_id IS NULL OR user_has_org_access(org_id))
);

CREATE POLICY "Users can update own or org conversations"
ON conversations FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
)
WITH CHECK (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
);

CREATE POLICY "Users can delete own conversations"
ON conversations FOR DELETE
TO authenticated
USING (user_id = auth.uid());


-- ============================================
-- 8. DEPARTMENTS TABLE - Org-Aware Policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own departments" ON departments;
DROP POLICY IF EXISTS "Users can view seeded departments" ON departments;
DROP POLICY IF EXISTS "Users can insert own departments" ON departments;
DROP POLICY IF EXISTS "Users can update own departments" ON departments;
DROP POLICY IF EXISTS "Users can delete own departments" ON departments;
-- Also drop new names for re-run safety
DROP POLICY IF EXISTS "Users can view own or org or seeded departments" ON departments;
DROP POLICY IF EXISTS "Users can insert departments" ON departments;
DROP POLICY IF EXISTS "Users can update own or org departments" ON departments;

CREATE POLICY "Users can view own or org or seeded departments"
ON departments FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR user_id IS NULL                                -- Seeded/system departments
    OR user_has_org_access(org_id)
);

CREATE POLICY "Users can insert departments"
ON departments FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND (org_id IS NULL OR user_has_org_access(org_id))
);

CREATE POLICY "Users can update own or org departments"
ON departments FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
)
WITH CHECK (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
);

CREATE POLICY "Users can delete own departments"
ON departments FOR DELETE
TO authenticated
USING (user_id = auth.uid());


-- ============================================
-- 9. OKRS TABLE - Org-Aware Policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own okrs" ON okrs;
DROP POLICY IF EXISTS "Users can insert own okrs" ON okrs;
DROP POLICY IF EXISTS "Users can update own okrs" ON okrs;
DROP POLICY IF EXISTS "Users can delete own okrs" ON okrs;
-- Also drop new names for re-run safety
DROP POLICY IF EXISTS "Users can view own or org okrs" ON okrs;
DROP POLICY IF EXISTS "Users can insert okrs" ON okrs;
DROP POLICY IF EXISTS "Users can update own or org okrs" ON okrs;

CREATE POLICY "Users can view own or org okrs"
ON okrs FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
);

CREATE POLICY "Users can insert okrs"
ON okrs FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND (org_id IS NULL OR user_has_org_access(org_id))
);

CREATE POLICY "Users can update own or org okrs"
ON okrs FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
)
WITH CHECK (
    user_id = auth.uid()
    OR user_has_org_access(org_id)
);

CREATE POLICY "Users can delete own okrs"
ON okrs FOR DELETE
TO authenticated
USING (user_id = auth.uid());


-- ============================================
-- 10. MESSAGES TABLE - Org-Aware (via conversation)
-- ============================================

-- Messages inherit access from their conversation
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON messages;
-- Also drop new names for re-run safety
DROP POLICY IF EXISTS "Users can view messages in accessible conversations" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in accessible conversations" ON messages;

CREATE POLICY "Users can view messages in accessible conversations"
ON messages FOR SELECT
TO authenticated
USING (
    conversation_id IN (
        SELECT id FROM conversations
        WHERE user_id = auth.uid()
        OR user_has_org_access(org_id)
    )
);

CREATE POLICY "Users can insert messages in accessible conversations"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
    conversation_id IN (
        SELECT id FROM conversations
        WHERE user_id = auth.uid()
        OR user_has_org_access(org_id)
    )
);


-- ============================================
-- 11. BRIEFINGS TABLE - Org-Aware Policies
-- ============================================

-- Check if briefings table exists and has org_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefings' AND column_name = 'user_id') THEN
        -- Add org_id if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'briefings' AND column_name = 'org_id') THEN
            ALTER TABLE briefings ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
            CREATE INDEX IF NOT EXISTS idx_briefings_org ON briefings(org_id);
        END IF;

        -- Drop and recreate policies (both old and new names for re-run safety)
        DROP POLICY IF EXISTS "Users can view own briefings" ON briefings;
        DROP POLICY IF EXISTS "Users can insert own briefings" ON briefings;
        DROP POLICY IF EXISTS "Users can update own briefings" ON briefings;
        DROP POLICY IF EXISTS "Users can view own or org briefings" ON briefings;
        DROP POLICY IF EXISTS "Users can insert briefings" ON briefings;
        DROP POLICY IF EXISTS "Users can update own or org briefings" ON briefings;

        EXECUTE 'CREATE POLICY "Users can view own or org briefings"
        ON briefings FOR SELECT
        TO authenticated
        USING (
            user_id = auth.uid()
            OR user_has_org_access(org_id)
        )';

        EXECUTE 'CREATE POLICY "Users can insert briefings"
        ON briefings FOR INSERT
        TO authenticated
        WITH CHECK (
            user_id = auth.uid()
            AND (org_id IS NULL OR user_has_org_access(org_id))
        )';

        EXECUTE 'CREATE POLICY "Users can update own or org briefings"
        ON briefings FOR UPDATE
        TO authenticated
        USING (
            user_id = auth.uid()
            OR user_has_org_access(org_id)
        )';
    END IF;
END $$;


-- ============================================
-- NOTE: Service role policies already exist
-- from previous migrations - they allow full
-- access for server-side operations
-- ============================================
