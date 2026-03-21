-- ============================================
-- Phase 85: Artifact System
-- Persistent storage for agent/skill/workflow outputs
-- ============================================

-- ============================================
-- 1. ARTIFACT BUNDLES (parent container)
-- ============================================

CREATE TABLE IF NOT EXISTS artifact_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Identity
    name TEXT NOT NULL,
    description TEXT,

    -- Source tracking
    source_type TEXT NOT NULL DEFAULT 'manual_upload'
        CHECK (source_type IN ('agent_execution', 'workflow_run', 'skill_output', 'manual_upload', 'api', 'chat')),
    source_id UUID,                    -- polymorphic FK to source record
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,

    -- Classification
    tags TEXT[] DEFAULT '{}',
    visibility TEXT NOT NULL DEFAULT 'private'
        CHECK (visibility IN ('private', 'team', 'org')),
    status TEXT NOT NULL DEFAULT 'complete'
        CHECK (status IN ('pending', 'generating', 'complete', 'error')),

    -- Versioning
    version INTEGER NOT NULL DEFAULT 1,
    is_current BOOLEAN NOT NULL DEFAULT true,
    previous_version_id UUID REFERENCES artifact_bundles(id) ON DELETE SET NULL,

    -- Generation metadata
    model_used TEXT,
    tokens_used INTEGER,
    generation_time_ms INTEGER,
    context_assets_used UUID[] DEFAULT '{}',
    skill_used TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 2. ARTIFACT PARTS (child content pieces)
-- ============================================

CREATE TABLE IF NOT EXISTS artifact_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID NOT NULL REFERENCES artifact_bundles(id) ON DELETE CASCADE,

    -- Identity
    name TEXT NOT NULL,
    part_type TEXT NOT NULL
        CHECK (part_type IN ('markdown', 'html', 'json', 'code', 'image', 'pdf', 'spreadsheet', 'audio', 'video', 'csv', 'text')),

    -- Dual content: inline for text, file_path for binary
    content_text TEXT,              -- inline text content
    content_json JSONB,             -- structured data
    file_path TEXT,                 -- Supabase Storage path for binary files
    file_size BIGINT,               -- file size in bytes
    mime_type TEXT,                 -- MIME type

    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 3. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_artifact_bundles_org_id ON artifact_bundles(org_id);
CREATE INDEX IF NOT EXISTS idx_artifact_bundles_user_current ON artifact_bundles(user_id, is_current);
CREATE INDEX IF NOT EXISTS idx_artifact_bundles_source ON artifact_bundles(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_artifact_bundles_agent ON artifact_bundles(agent_id);
CREATE INDEX IF NOT EXISTS idx_artifact_bundles_department ON artifact_bundles(department_id);
CREATE INDEX IF NOT EXISTS idx_artifact_bundles_tags ON artifact_bundles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_artifact_bundles_created ON artifact_bundles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artifact_parts_bundle_order ON artifact_parts(bundle_id, sort_order);

-- ============================================
-- 4. UPDATED_AT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_artifact_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_artifact_bundles_updated ON artifact_bundles;
CREATE TRIGGER trg_artifact_bundles_updated
    BEFORE UPDATE ON artifact_bundles
    FOR EACH ROW EXECUTE FUNCTION update_artifact_updated_at();

DROP TRIGGER IF EXISTS trg_artifact_parts_updated ON artifact_parts;
CREATE TRIGGER trg_artifact_parts_updated
    BEFORE UPDATE ON artifact_parts
    FOR EACH ROW EXECUTE FUNCTION update_artifact_updated_at();

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE artifact_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifact_parts ENABLE ROW LEVEL SECURITY;

-- Bundles: owner has full access
CREATE POLICY artifact_bundles_owner_all ON artifact_bundles
    FOR ALL USING (auth.uid() = user_id);

-- Bundles: org members can read org-visible bundles
CREATE POLICY artifact_bundles_org_read ON artifact_bundles
    FOR SELECT USING (
        visibility = 'org' AND
        org_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Bundles: team members can read team-visible bundles (same dept)
CREATE POLICY artifact_bundles_team_read ON artifact_bundles
    FOR SELECT USING (
        visibility = 'team' AND
        department_id IN (
            SELECT da.department_id FROM department_agents da
            JOIN organization_members om ON om.organization_id = artifact_bundles.org_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

-- Parts: inherit access from bundle
CREATE POLICY artifact_parts_read ON artifact_parts
    FOR SELECT USING (
        bundle_id IN (SELECT id FROM artifact_bundles WHERE user_id = auth.uid())
        OR bundle_id IN (
            SELECT id FROM artifact_bundles
            WHERE visibility IN ('org', 'team')
            AND org_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid() AND is_active = true
            )
        )
    );

CREATE POLICY artifact_parts_owner_write ON artifact_parts
    FOR ALL USING (
        bundle_id IN (SELECT id FROM artifact_bundles WHERE user_id = auth.uid())
    );

-- Service role bypass
CREATE POLICY artifact_bundles_service ON artifact_bundles
    FOR ALL USING (current_setting('request.jwt.claim.role', true) = 'service_role');

CREATE POLICY artifact_parts_service ON artifact_parts
    FOR ALL USING (current_setting('request.jwt.claim.role', true) = 'service_role');

-- ============================================
-- 6. MODULE REGISTRATION
-- ============================================

INSERT INTO platform_modules (id, name, description, icon, category, min_tier, is_active, is_beta, route_path, nav_group, display_order)
VALUES (
    'artifacts',
    'Artifacts',
    'Browse, search, and manage deliverables produced by agents, skills, and workflows',
    'archive',
    'tool',
    'starter',
    true,
    false,
    '/artifacts.html',
    'ai-systems',
    65
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    min_tier = EXCLUDED.min_tier,
    is_active = EXCLUDED.is_active,
    is_beta = EXCLUDED.is_beta,
    route_path = EXCLUDED.route_path,
    nav_group = EXCLUDED.nav_group,
    display_order = EXCLUDED.display_order;

-- Role access for all business roles
INSERT INTO role_module_access (role, module_id, can_access)
VALUES
    ('executive', 'artifacts', true),
    ('director', 'artifacts', true),
    ('manager', 'artifacts', true),
    ('supervisor', 'artifacts', true),
    ('team_lead', 'artifacts', true),
    ('specialist', 'artifacts', true),
    ('analyst', 'artifacts', true),
    ('coordinator', 'artifacts', true)
ON CONFLICT (role, module_id) DO UPDATE SET can_access = EXCLUDED.can_access;

-- Add artifact_bundle to user_favorites entity_type constraint if it exists
DO $$
BEGIN
    -- Check if the constraint exists and try to update it
    ALTER TABLE user_favorites DROP CONSTRAINT IF EXISTS user_favorites_entity_type_check;
    ALTER TABLE user_favorites ADD CONSTRAINT user_favorites_entity_type_check
        CHECK (entity_type IN ('agent', 'workflow', 'action', 'context_asset', 'prompt', 'skill', 'artifact_bundle'));
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not update user_favorites entity_type constraint: %', SQLERRM;
END;
$$;

-- ============================================
-- 7. STRATEGY 120 DEPRECATION
-- ============================================

UPDATE platform_modules SET is_active = false WHERE id = 'strategy_agents';

-- ============================================
-- 8. SUPABASE STORAGE BUCKET
-- ============================================
-- Run in Supabase Dashboard > Storage:
-- Create bucket 'artifacts' with:
--   Public: false
--   File size limit: 50MB
--   Allowed MIME types: *
-- Path convention: {org_id}/{user_id}/{bundle_id}/{part_id}/{filename}

-- Note: Storage bucket creation is handled via Supabase Dashboard or API,
-- not via SQL. The artifactService.js handles upload/download operations.
