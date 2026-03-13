-- ============================================================================
-- Phase 68: Tags Organization Scoping
-- ============================================================================
-- Adds org_id to tags table so tag taxonomies are organization-specific.
-- Existing tags (seeded without org) become available to all orgs as templates.
-- New tags created by users are scoped to their organization.
-- ============================================================================

-- 1. Add org_id column to tags table
ALTER TABLE tags ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 2. Add index for org-scoped queries
CREATE INDEX IF NOT EXISTS idx_tags_org_id ON tags(org_id);

-- 3. Update unique constraint: tags are unique per name+category+org
--    Drop old constraint if it exists, then add new composite one
DO $$
BEGIN
    -- Drop existing unique index/constraint on (name, category) if present
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'tags' AND indexname = 'tags_name_category_key'
    ) THEN
        DROP INDEX tags_name_category_key;
    END IF;

    -- Drop any unique constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'tags' AND constraint_name = 'tags_name_category_key'
    ) THEN
        ALTER TABLE tags DROP CONSTRAINT tags_name_category_key;
    END IF;
END $$;

-- New uniqueness: same name+category is allowed across different orgs
-- NULL org_id = platform template; non-null = org-specific
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_name_category_org
    ON tags(name, category, COALESCE(org_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 4. Drop and recreate the tag_hierarchy view to include org_id
--    (CREATE OR REPLACE fails when column order changes)
DROP VIEW IF EXISTS tag_hierarchy;
CREATE VIEW tag_hierarchy AS
WITH RECURSIVE tag_tree AS (
    SELECT
        id,
        name,
        category,
        parent_id,
        org_id,
        name AS path,
        0 AS depth
    FROM tags
    WHERE parent_id IS NULL AND is_active = true
    UNION ALL
    SELECT
        t.id,
        t.name,
        t.category,
        t.parent_id,
        t.org_id,
        tt.path || ' > ' || t.name AS path,
        tt.depth + 1
    FROM tags t
    JOIN tag_tree tt ON t.parent_id = tt.id
    WHERE t.is_active = true
)
SELECT * FROM tag_tree ORDER BY category, path;

-- 5. Ensure security_invoker is set on the view
ALTER VIEW IF EXISTS public.tag_hierarchy SET (security_invoker = on);

-- 6. Add RLS policy for org-scoped tag access
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Tags: read own org or platform" ON tags;
DROP POLICY IF EXISTS "Tags: insert own org" ON tags;
DROP POLICY IF EXISTS "Tags: update own org" ON tags;
DROP POLICY IF EXISTS "Tags: delete own org" ON tags;
DROP POLICY IF EXISTS "Tags: service role full access" ON tags;

-- Service role bypass (for server-side operations)
CREATE POLICY "Tags: service role full access"
    ON tags FOR ALL
    USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Read: users can see their org's tags + platform templates (org_id IS NULL)
CREATE POLICY "Tags: read own org or platform"
    ON tags FOR SELECT
    USING (
        org_id IS NULL
        OR org_id IN (
            SELECT om.org_id FROM organization_members om
            WHERE om.user_id = auth.uid() AND om.status = 'active'
        )
    );

-- Insert: users can create tags for their org only
CREATE POLICY "Tags: insert own org"
    ON tags FOR INSERT
    WITH CHECK (
        org_id IN (
            SELECT om.org_id FROM organization_members om
            WHERE om.user_id = auth.uid() AND om.status = 'active'
        )
    );

-- Update: users can update their org's tags (not platform templates)
CREATE POLICY "Tags: update own org"
    ON tags FOR UPDATE
    USING (
        org_id IS NOT NULL
        AND org_id IN (
            SELECT om.org_id FROM organization_members om
            WHERE om.user_id = auth.uid() AND om.status = 'active'
        )
    );

-- Delete: users can delete their org's tags (not platform templates)
CREATE POLICY "Tags: delete own org"
    ON tags FOR DELETE
    USING (
        org_id IS NOT NULL
        AND org_id IN (
            SELECT om.org_id FROM organization_members om
            WHERE om.user_id = auth.uid() AND om.status = 'active'
        )
    );

-- ============================================================================
-- DONE: Existing seed tags remain with org_id = NULL (platform templates).
-- New tags created through the API will be assigned the user's org_id.
-- All queries should filter: org_id = user's org OR org_id IS NULL
-- ============================================================================
