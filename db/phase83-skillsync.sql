-- ============================================
-- Insight 360 - Phase 83: SkillSync Schema
-- Version: 1.0
-- Date: March 2026
-- Description: Skill lifecycle & sync support
-- ============================================

-- ============================================
-- EXTEND SKILLS TABLE
-- Add sync metadata for change detection
-- ============================================

-- Content hash for change detection (SHA-256 of SKILL.md content)
ALTER TABLE skills ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Source path in Claude Code repo (e.g., '.claude/skills/mkt-content')
ALTER TABLE skills ADD COLUMN IF NOT EXISTS source_path TEXT;

-- How this skill was created/synced
ALTER TABLE skills ADD COLUMN IF NOT EXISTS sync_source TEXT DEFAULT 'manual'
    CHECK (sync_source IN ('manual', 'claude_code', 'import'));

-- Last time this skill was synced from source
ALTER TABLE skills ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- EXTEND SKILL_VERSIONS TABLE
-- Add lineage tracking for provenance
-- ============================================

-- Where this version came from: 'original', 'PM-Skills', 'expert:hormozi', etc.
ALTER TABLE skill_versions ADD COLUMN IF NOT EXISTS lineage_source TEXT;

-- Hash of SKILL.md content at sync time (ties version to specific file state)
ALTER TABLE skill_versions ADD COLUMN IF NOT EXISTS source_hash TEXT;

-- ============================================
-- NEW CONTEXT ASSET TYPE: Expert Framework
-- For expert methodologies (Hormozi, Ziglar, etc.)
-- ============================================

INSERT INTO context_asset_types (type_key, display_name, description, icon, sort_order, json_schema)
VALUES ('expert_framework', 'Expert Framework', 'Methodology or framework from a domain expert', 'brain', 205,
'{
  "type": "object",
  "properties": {
    "expert_name": {"type": "string"},
    "domain": {"type": "string"},
    "framework_name": {"type": "string"},
    "principles": {"type": "array", "items": {"type": "string"}},
    "techniques": {"type": "array", "items": {"type": "object"}},
    "application_notes": {"type": "string"}
  },
  "required": ["expert_name", "domain", "principles"]
}'::jsonb)
ON CONFLICT (type_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    json_schema = EXCLUDED.json_schema;

-- ============================================
-- INDEXES
-- ============================================

-- Fast lookup by source path (for sync tool)
CREATE INDEX IF NOT EXISTS idx_skills_source_path ON skills(source_path);

-- Fast lookup by content hash (for change detection)
CREATE INDEX IF NOT EXISTS idx_skills_content_hash ON skills(content_hash);

-- Fast lookup by sync source
CREATE INDEX IF NOT EXISTS idx_skills_sync_source ON skills(sync_source);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN skills.content_hash IS 'SHA-256 hash of SKILL.md content for change detection';
COMMENT ON COLUMN skills.source_path IS 'Path to source SKILL.md in Claude Code repo (e.g., .claude/skills/mkt-content)';
COMMENT ON COLUMN skills.sync_source IS 'How this skill was created: manual, claude_code (sync tool), or import';
COMMENT ON COLUMN skills.last_synced_at IS 'Last time this skill was synced from its source';
COMMENT ON COLUMN skill_versions.lineage_source IS 'Provenance of this version: original, PM-Skills, expert:name, etc.';
COMMENT ON COLUMN skill_versions.source_hash IS 'SHA-256 hash of source SKILL.md at the time this version was created';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'skills'
      AND column_name IN ('content_hash', 'source_path', 'sync_source', 'last_synced_at');

    RAISE NOTICE 'Phase 83 SkillSync: % of 4 new skills columns added', col_count;

    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'skill_versions'
      AND column_name IN ('lineage_source', 'source_hash');

    RAISE NOTICE 'Phase 83 SkillSync: % of 2 new skill_versions columns added', col_count;

    IF EXISTS (SELECT 1 FROM context_asset_types WHERE type_key = 'expert_framework') THEN
        RAISE NOTICE 'Phase 83 SkillSync: expert_framework context asset type created';
    END IF;
END $$;
