-- ============================================
-- Insight 360 - Phase 5: Skills Framework Schema
-- Version: 1.0
-- Date: December 2024
-- Description: Reusable AI skill definitions
-- ============================================

-- ============================================
-- SKILLS TABLE
-- Core skill definitions
-- ============================================
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Identity
    name TEXT NOT NULL,                    -- 'article-generator'
    display_name TEXT NOT NULL,            -- 'Article Generator'
    description TEXT,
    icon TEXT DEFAULT 'wand-2',
    color TEXT DEFAULT '#8b5cf6',

    -- Classification
    category TEXT DEFAULT 'custom',        -- 'content', 'research', 'analysis', 'workflow'
    suite TEXT DEFAULT 'execute'           -- 'align', 'strategy', 'execute'
        CHECK (suite IN ('align', 'strategy', 'execute')),
    tags TEXT[] DEFAULT '{}',

    -- Skill Content (SKILL.md equivalent)
    instructions TEXT NOT NULL,            -- Main skill instructions (markdown)
    output_format TEXT,                    -- Expected output structure description

    -- Context Requirements
    required_context_types TEXT[] DEFAULT '{}',  -- ['voice_dna', 'icp']
    optional_context_types TEXT[] DEFAULT '{}',  -- ['products', 'competitors']
    context_token_budget INTEGER DEFAULT 8000,   -- Max tokens for context injection

    -- Triggers & Starters
    trigger_phrases TEXT[] DEFAULT '{}',         -- When to suggest this skill
    conversation_starters TEXT[] DEFAULT '{}',   -- Shown to user in UI

    -- Examples & Templates (stored as JSONB)
    examples JSONB DEFAULT '[]',           -- Array of {input, output} examples
    templates JSONB DEFAULT '[]',          -- Array of {name, content} templates

    -- Versioning
    version TEXT DEFAULT '1.0.0',
    changelog TEXT,

    -- Visibility
    visibility TEXT DEFAULT 'private'
        CHECK (visibility IN ('private', 'team', 'public')),
    is_featured BOOLEAN DEFAULT false,

    -- Status
    status TEXT DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'archived')),

    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    -- Unique constraint on name per user
    UNIQUE(user_id, name)
);

-- ============================================
-- SKILL_VERSIONS TABLE
-- Version history for skills
-- ============================================
CREATE TABLE IF NOT EXISTS skill_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,

    version_number INTEGER NOT NULL,
    version_label TEXT,                    -- '1.0.0', '1.1.0', etc.

    -- Snapshot of skill content at this version
    instructions TEXT NOT NULL,
    output_format TEXT,
    required_context_types TEXT[],
    optional_context_types TEXT[],
    examples JSONB,
    templates JSONB,

    -- Change tracking
    change_summary TEXT,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    UNIQUE(skill_id, version_number)
);

-- ============================================
-- SKILL_FILES TABLE
-- Supporting files (templates, examples, assets)
-- ============================================
CREATE TABLE IF NOT EXISTS skill_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,

    filename TEXT NOT NULL,
    file_type TEXT NOT NULL              -- 'template', 'example', 'asset', 'documentation'
        CHECK (file_type IN ('template', 'example', 'asset', 'documentation')),
    mime_type TEXT,

    -- Content (text files stored directly, binary as reference)
    content TEXT,                         -- For text-based files
    storage_path TEXT,                    -- For binary files (S3/storage reference)

    -- Metadata
    description TEXT,
    sort_order INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SKILL_EXECUTIONS TABLE
-- Track skill usage across agents
-- ============================================
CREATE TABLE IF NOT EXISTS skill_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
    skill_version TEXT,                   -- Version used at execution time
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Execution details
    input_message TEXT,
    output_content TEXT,

    -- Context used
    context_assets_used UUID[],
    context_tokens_used INTEGER,

    -- Performance
    model_used TEXT,
    total_tokens INTEGER,
    duration_ms INTEGER,

    -- Status
    status TEXT DEFAULT 'completed'
        CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    error_message TEXT,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- EXTEND AGENTS TABLE
-- Add skill reference columns
-- ============================================
ALTER TABLE agents ADD COLUMN IF NOT EXISTS skill_id UUID REFERENCES skills(id) ON DELETE SET NULL;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS skill_version TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS auto_update_skill BOOLEAN DEFAULT true;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_skills_user ON skills(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_suite ON skills(suite);
CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status);
CREATE INDEX IF NOT EXISTS idx_skills_visibility ON skills(visibility);
CREATE INDEX IF NOT EXISTS idx_skills_tags ON skills USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_skills_required_context ON skills USING GIN(required_context_types);

CREATE INDEX IF NOT EXISTS idx_skill_versions_skill ON skill_versions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_files_skill ON skill_files(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_executions_skill ON skill_executions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_executions_agent ON skill_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_skill_executions_created ON skill_executions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agents_skill ON agents(skill_id);

-- ============================================
-- TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_skills_updated_at ON skills;
CREATE TRIGGER update_skills_updated_at
    BEFORE UPDATE ON skills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_skill_files_updated_at ON skill_files;
CREATE TRIGGER update_skill_files_updated_at
    BEFORE UPDATE ON skill_files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_executions ENABLE ROW LEVEL SECURITY;

-- Skills policies
CREATE POLICY "Users can view own skills" ON skills
    FOR SELECT USING (auth.uid() = user_id OR visibility = 'public');

CREATE POLICY "Users can insert own skills" ON skills
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skills" ON skills
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own skills" ON skills
    FOR DELETE USING (auth.uid() = user_id);

-- Skill versions policies
CREATE POLICY "Users can view own skill versions" ON skill_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM skills
            WHERE skills.id = skill_versions.skill_id
            AND (skills.user_id = auth.uid() OR skills.visibility = 'public')
        )
    );

CREATE POLICY "Users can insert skill versions" ON skill_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM skills
            WHERE skills.id = skill_versions.skill_id
            AND skills.user_id = auth.uid()
        )
    );

-- Skill files policies
CREATE POLICY "Users can view own skill files" ON skill_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM skills
            WHERE skills.id = skill_files.skill_id
            AND (skills.user_id = auth.uid() OR skills.visibility = 'public')
        )
    );

CREATE POLICY "Users can manage own skill files" ON skill_files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM skills
            WHERE skills.id = skill_files.skill_id
            AND skills.user_id = auth.uid()
        )
    );

-- Skill executions policies
CREATE POLICY "Users can view own skill executions" ON skill_executions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skill executions" ON skill_executions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- VIEWS
-- ============================================

-- Skill summary with usage stats
CREATE OR REPLACE VIEW skill_summary AS
SELECT
    s.id,
    s.user_id,
    s.name,
    s.display_name,
    s.description,
    s.icon,
    s.color,
    s.category,
    s.suite,
    s.tags,
    s.version,
    s.visibility,
    s.status,
    s.required_context_types,
    s.optional_context_types,
    s.context_token_budget,
    s.trigger_phrases,
    s.conversation_starters,
    s.usage_count,
    s.last_used_at,
    s.created_at,
    s.updated_at,
    COUNT(DISTINCT a.id) as agents_using,
    COUNT(DISTINCT se.id) as total_executions,
    COALESCE(AVG(se.duration_ms), 0) as avg_execution_ms
FROM skills s
LEFT JOIN agents a ON a.skill_id = s.id AND a.is_active = true
LEFT JOIN skill_executions se ON se.skill_id = s.id
GROUP BY s.id;

-- ============================================
-- SEED DATA: Skill Categories
-- ============================================
CREATE TABLE IF NOT EXISTS skill_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_key TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO skill_categories (category_key, display_name, description, icon, color, sort_order)
VALUES
    ('content', 'Content', 'Content creation and writing skills', 'file-text', '#3b82f6', 1),
    ('research', 'Research', 'Research and information gathering skills', 'search', '#10b981', 2),
    ('analysis', 'Analysis', 'Data analysis and insights skills', 'bar-chart-2', '#f59e0b', 3),
    ('workflow', 'Workflow', 'Multi-step workflow automation skills', 'git-branch', '#8b5cf6', 4),
    ('custom', 'Custom', 'User-defined custom skills', 'puzzle', '#6b7280', 5)
ON CONFLICT (category_key) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE skills IS 'Reusable AI skill definitions with instructions and context requirements';
COMMENT ON TABLE skill_versions IS 'Version history for skills';
COMMENT ON TABLE skill_files IS 'Supporting files for skills (templates, examples, assets)';
COMMENT ON TABLE skill_executions IS 'Execution history for skills';
COMMENT ON TABLE skill_categories IS 'Predefined skill categories';

COMMENT ON COLUMN skills.instructions IS 'Main skill instructions in markdown format';
COMMENT ON COLUMN skills.required_context_types IS 'Context asset types that must be mapped for this skill';
COMMENT ON COLUMN skills.optional_context_types IS 'Context asset types that can enhance skill results';
COMMENT ON COLUMN skills.trigger_phrases IS 'Phrases that should suggest using this skill';
COMMENT ON COLUMN skills.examples IS 'JSON array of {input, output} example pairs for few-shot learning';
COMMENT ON COLUMN skills.templates IS 'JSON array of {name, content} reusable templates';
COMMENT ON COLUMN agents.skill_id IS 'Reference to skill providing system prompt and context requirements';
COMMENT ON COLUMN agents.auto_update_skill IS 'Whether to automatically update when skill version changes';
