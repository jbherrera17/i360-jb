# Skills Framework Implementation Plan

**Version:** 1.0
**Date:** December 2024
**Status:** Draft

---

## Executive Summary

This document outlines the implementation plan for adding Claude Skills support to Insight 360. The Skills Framework enables reusable, versioned AI instruction sets that can be attached to agents, providing structured prompts with enforced context requirements.

---

## Table of Contents

1. [Phase 1: Database Schema](#phase-1-database-schema)
2. [Phase 2: API Routes](#phase-2-api-routes)
3. [Phase 3: Backend Services](#phase-3-backend-services)
4. [Phase 4: Frontend - Skill Library](#phase-4-frontend---skill-library)
5. [Phase 5: Frontend - Skill Creator](#phase-5-frontend---skill-creator)
6. [Phase 6: Agent Integration](#phase-6-agent-integration)
7. [Phase 7: Import/Export](#phase-7-importexport)
8. [File Structure](#file-structure)
9. [Migration Path](#migration-path)

---

## Phase 1: Database Schema

### New File: `db/phase5-skills-schema.sql`

```sql
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

-- Index for skill lookup
CREATE INDEX IF NOT EXISTS idx_agents_skill ON agents(skill_id);

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
    s.usage_count,
    s.last_used_at,
    s.created_at,
    s.updated_at,
    COUNT(DISTINCT a.id) as agents_using,
    COUNT(DISTINCT se.id) as total_executions,
    AVG(se.duration_ms) as avg_execution_ms
FROM skills s
LEFT JOIN agents a ON a.skill_id = s.id
LEFT JOIN skill_executions se ON se.skill_id = s.id
GROUP BY s.id;

-- Agent summary with skill info (extend existing view)
CREATE OR REPLACE VIEW agent_summary AS
SELECT
    a.*,
    s.name as skill_name,
    s.display_name as skill_display_name,
    s.version as skill_version,
    s.required_context_types as skill_required_context
FROM agents a
LEFT JOIN skills s ON a.skill_id = s.id;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE skills IS 'Reusable AI skill definitions with instructions and context requirements';
COMMENT ON TABLE skill_versions IS 'Version history for skills';
COMMENT ON TABLE skill_files IS 'Supporting files for skills (templates, examples, assets)';
COMMENT ON TABLE skill_executions IS 'Execution history for skills';

COMMENT ON COLUMN skills.instructions IS 'Main skill instructions in markdown format';
COMMENT ON COLUMN skills.required_context_types IS 'Context asset types that must be mapped for this skill';
COMMENT ON COLUMN skills.trigger_phrases IS 'Phrases that should suggest using this skill';
COMMENT ON COLUMN agents.skill_id IS 'Reference to skill providing system prompt and context requirements';
COMMENT ON COLUMN agents.auto_update_skill IS 'Whether to automatically update when skill version changes';
```

---

## Phase 2: API Routes

### New File: `server/routes/skills.js`

```javascript
/**
 * INSIGHT 360 - Skills API Routes
 * Version: 1.0.0
 *
 * Endpoints:
 *   - Skill CRUD (6 endpoints)
 *   - Skill Files (4 endpoints)
 *   - Skill Versions (3 endpoints)
 *   - Skill Execution (2 endpoints)
 *   - Import/Export (2 endpoints)
 */

const express = require('express');
const { randomUUID: uuidv4 } = require('crypto');

module.exports = function(supabase) {
    const router = express.Router();

    // ============================================================================
    // SKILL CRUD ENDPOINTS
    // ============================================================================

    /**
     * GET /api/skills
     * List all skills with filters
     */
    router.get('/', async (req, res) => {
        const {
            category,
            suite,
            status = 'active',
            visibility,
            search,
            required_context,
            sort = 'display_name',
            order = 'asc',
            limit = 50,
            offset = 0
        } = req.query;

        let query = supabase
            .from('skill_summary')
            .select('*');

        // Apply filters
        if (category && category !== 'all') {
            query = query.eq('category', category);
        }
        if (suite && suite !== 'all') {
            query = query.eq('suite', suite);
        }
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }
        if (visibility && visibility !== 'all') {
            query = query.eq('visibility', visibility);
        }
        if (search) {
            query = query.or(
                `display_name.ilike.%${search}%,description.ilike.%${search}%`
            );
        }
        if (required_context) {
            query = query.contains('required_context_types', [required_context]);
        }

        // Sorting
        const sortColumn = ['display_name', 'created_at', 'usage_count', 'agents_using']
            .includes(sort) ? sort : 'display_name';
        query = query.order(sortColumn, { ascending: order === 'asc' });

        // Pagination
        query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        const { data, error, count } = await query;

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        res.json({
            success: true,
            data: data || [],
            pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) }
        });
    });

    /**
     * GET /api/skills/categories
     * List skill categories with counts
     */
    router.get('/categories', async (req, res) => {
        const { data, error } = await supabase
            .from('skills')
            .select('category')
            .eq('status', 'active');

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        const counts = {};
        (data || []).forEach(s => {
            counts[s.category] = (counts[s.category] || 0) + 1;
        });

        const categories = [
            { id: 'content', name: 'Content', icon: 'file-text', count: counts.content || 0 },
            { id: 'research', name: 'Research', icon: 'search', count: counts.research || 0 },
            { id: 'analysis', name: 'Analysis', icon: 'bar-chart-2', count: counts.analysis || 0 },
            { id: 'workflow', name: 'Workflow', icon: 'git-branch', count: counts.workflow || 0 },
            { id: 'custom', name: 'Custom', icon: 'puzzle', count: counts.custom || 0 }
        ];

        res.json({ success: true, data: categories });
    });

    /**
     * GET /api/skills/:id
     * Get single skill with files and version history
     */
    router.get('/:id', async (req, res) => {
        const { id } = req.params;

        // Get skill
        const { data: skill, error: skillError } = await supabase
            .from('skills')
            .select('*')
            .eq('id', id)
            .single();

        if (skillError || !skill) {
            return res.status(404).json({ success: false, error: 'Skill not found' });
        }

        // Get files
        const { data: files } = await supabase
            .from('skill_files')
            .select('*')
            .eq('skill_id', id)
            .order('sort_order');

        // Get recent versions
        const { data: versions } = await supabase
            .from('skill_versions')
            .select('id, version_number, version_label, change_summary, created_at')
            .eq('skill_id', id)
            .order('version_number', { ascending: false })
            .limit(10);

        // Get agents using this skill
        const { data: agents } = await supabase
            .from('agents')
            .select('id, name, icon, is_active')
            .eq('skill_id', id);

        res.json({
            success: true,
            data: {
                ...skill,
                files: files || [],
                versions: versions || [],
                agents_using: agents || []
            }
        });
    });

    /**
     * POST /api/skills
     * Create new skill
     */
    router.post('/', async (req, res) => {
        const {
            name,
            display_name,
            description,
            icon = 'wand-2',
            color = '#8b5cf6',
            category = 'custom',
            suite = 'execute',
            tags = [],
            instructions,
            output_format,
            required_context_types = [],
            optional_context_types = [],
            context_token_budget = 8000,
            trigger_phrases = [],
            conversation_starters = [],
            examples = [],
            templates = [],
            visibility = 'private',
            status = 'draft'
        } = req.body;

        // Validation
        if (!name || !instructions) {
            return res.status(400).json({
                success: false,
                error: 'Name and instructions are required'
            });
        }

        // Validate name format (lowercase, hyphens only)
        if (!/^[a-z0-9-]+$/.test(name)) {
            return res.status(400).json({
                success: false,
                error: 'Name must be lowercase with hyphens only (e.g., article-generator)'
            });
        }

        const userId = req.user?.id || null;

        const skillData = {
            id: uuidv4(),
            user_id: userId,
            name,
            display_name: display_name || name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            description,
            icon,
            color,
            category,
            suite,
            tags,
            instructions,
            output_format,
            required_context_types,
            optional_context_types,
            context_token_budget,
            trigger_phrases,
            conversation_starters,
            examples,
            templates,
            version: '1.0.0',
            visibility,
            status,
            created_by: userId
        };

        const { data, error } = await supabase
            .from('skills')
            .insert(skillData)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({
                    success: false,
                    error: 'A skill with this name already exists'
                });
            }
            return res.status(500).json({ success: false, error: error.message });
        }

        // Create initial version record
        await supabase.from('skill_versions').insert({
            id: uuidv4(),
            skill_id: data.id,
            version_number: 1,
            version_label: '1.0.0',
            instructions,
            output_format,
            required_context_types,
            optional_context_types,
            examples,
            templates,
            change_summary: 'Initial version',
            created_by: userId
        });

        res.status(201).json({ success: true, data });
    });

    /**
     * PUT /api/skills/:id
     * Update skill (creates new version if instructions change)
     */
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const updates = req.body;
        const userId = req.user?.id || null;

        // Get current skill
        const { data: current, error: getError } = await supabase
            .from('skills')
            .select('*')
            .eq('id', id)
            .single();

        if (getError || !current) {
            return res.status(404).json({ success: false, error: 'Skill not found' });
        }

        // Check if instructions changed (requires new version)
        const instructionsChanged = updates.instructions &&
            updates.instructions !== current.instructions;

        // Remove fields that shouldn't be updated
        delete updates.id;
        delete updates.user_id;
        delete updates.created_at;
        delete updates.created_by;
        delete updates.usage_count;

        // If instructions changed, increment version
        if (instructionsChanged) {
            const currentVersion = current.version || '1.0.0';
            const versionParts = currentVersion.split('.').map(Number);
            versionParts[1]++; // Increment minor version
            updates.version = versionParts.join('.');
            updates.changelog = updates.changelog || 'Updated instructions';

            // Get latest version number
            const { data: latestVersion } = await supabase
                .from('skill_versions')
                .select('version_number')
                .eq('skill_id', id)
                .order('version_number', { ascending: false })
                .limit(1)
                .single();

            const nextVersionNumber = (latestVersion?.version_number || 0) + 1;

            // Create version record
            await supabase.from('skill_versions').insert({
                id: uuidv4(),
                skill_id: id,
                version_number: nextVersionNumber,
                version_label: updates.version,
                instructions: updates.instructions,
                output_format: updates.output_format || current.output_format,
                required_context_types: updates.required_context_types || current.required_context_types,
                optional_context_types: updates.optional_context_types || current.optional_context_types,
                examples: updates.examples || current.examples,
                templates: updates.templates || current.templates,
                change_summary: updates.changelog,
                created_by: userId
            });
        }

        const { data, error } = await supabase
            .from('skills')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        // Update agents with auto_update_skill = true
        if (instructionsChanged) {
            await supabase
                .from('agents')
                .update({ skill_version: updates.version })
                .eq('skill_id', id)
                .eq('auto_update_skill', true);
        }

        res.json({ success: true, data });
    });

    /**
     * DELETE /api/skills/:id
     * Delete skill (archive by default)
     */
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        const { hard = false } = req.query;

        // Check if skill is in use
        const { data: agents } = await supabase
            .from('agents')
            .select('id')
            .eq('skill_id', id);

        if (agents && agents.length > 0 && hard !== 'true') {
            return res.status(400).json({
                success: false,
                error: `Skill is used by ${agents.length} agent(s). Detach them first or use hard delete.`
            });
        }

        if (hard === 'true') {
            // Detach from agents first
            await supabase
                .from('agents')
                .update({ skill_id: null, skill_version: null })
                .eq('skill_id', id);

            const { error } = await supabase
                .from('skills')
                .delete()
                .eq('id', id);

            if (error) {
                return res.status(500).json({ success: false, error: error.message });
            }
        } else {
            const { error } = await supabase
                .from('skills')
                .update({ status: 'archived' })
                .eq('id', id);

            if (error) {
                return res.status(500).json({ success: false, error: error.message });
            }
        }

        res.json({
            success: true,
            message: hard === 'true' ? 'Skill permanently deleted' : 'Skill archived'
        });
    });

    /**
     * POST /api/skills/:id/duplicate
     * Duplicate a skill
     */
    router.post('/:id/duplicate', async (req, res) => {
        const { id } = req.params;
        const { name: newName } = req.body;
        const userId = req.user?.id || null;

        const { data: original, error: getError } = await supabase
            .from('skills')
            .select('*')
            .eq('id', id)
            .single();

        if (getError || !original) {
            return res.status(404).json({ success: false, error: 'Skill not found' });
        }

        const duplicateName = newName || `${original.name}-copy`;
        const duplicateData = {
            ...original,
            id: uuidv4(),
            name: duplicateName,
            display_name: newName
                ? newName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                : `${original.display_name} (Copy)`,
            user_id: userId,
            created_by: userId,
            version: '1.0.0',
            usage_count: 0,
            last_used_at: null,
            status: 'draft',
            visibility: 'private',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('skills')
            .insert(duplicateData)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        // Duplicate files
        const { data: files } = await supabase
            .from('skill_files')
            .select('*')
            .eq('skill_id', id);

        if (files && files.length > 0) {
            const newFiles = files.map(f => ({
                ...f,
                id: uuidv4(),
                skill_id: data.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));

            await supabase.from('skill_files').insert(newFiles);
        }

        res.status(201).json({ success: true, data });
    });

    // ============================================================================
    // SKILL FILES ENDPOINTS
    // ============================================================================

    /**
     * GET /api/skills/:id/files
     * List files for a skill
     */
    router.get('/:id/files', async (req, res) => {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('skill_files')
            .select('*')
            .eq('skill_id', id)
            .order('sort_order');

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        res.json({ success: true, data: data || [] });
    });

    /**
     * POST /api/skills/:id/files
     * Add file to skill
     */
    router.post('/:id/files', async (req, res) => {
        const { id } = req.params;
        const { filename, file_type, content, description, mime_type } = req.body;

        if (!filename || !file_type || !content) {
            return res.status(400).json({
                success: false,
                error: 'filename, file_type, and content are required'
            });
        }

        const fileData = {
            id: uuidv4(),
            skill_id: id,
            filename,
            file_type,
            content,
            description,
            mime_type: mime_type || 'text/markdown'
        };

        const { data, error } = await supabase
            .from('skill_files')
            .insert(fileData)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        res.status(201).json({ success: true, data });
    });

    /**
     * PUT /api/skills/:id/files/:fileId
     * Update skill file
     */
    router.put('/:id/files/:fileId', async (req, res) => {
        const { fileId } = req.params;
        const updates = req.body;

        delete updates.id;
        delete updates.skill_id;
        delete updates.created_at;

        const { data, error } = await supabase
            .from('skill_files')
            .update(updates)
            .eq('id', fileId)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        res.json({ success: true, data });
    });

    /**
     * DELETE /api/skills/:id/files/:fileId
     * Delete skill file
     */
    router.delete('/:id/files/:fileId', async (req, res) => {
        const { fileId } = req.params;

        const { error } = await supabase
            .from('skill_files')
            .delete()
            .eq('id', fileId);

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        res.json({ success: true, message: 'File deleted' });
    });

    // ============================================================================
    // SKILL VERSIONS ENDPOINTS
    // ============================================================================

    /**
     * GET /api/skills/:id/versions
     * Get version history
     */
    router.get('/:id/versions', async (req, res) => {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('skill_versions')
            .select('*')
            .eq('skill_id', id)
            .order('version_number', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        res.json({ success: true, data: data || [] });
    });

    /**
     * GET /api/skills/:id/versions/:versionId
     * Get specific version
     */
    router.get('/:id/versions/:versionId', async (req, res) => {
        const { versionId } = req.params;

        const { data, error } = await supabase
            .from('skill_versions')
            .select('*')
            .eq('id', versionId)
            .single();

        if (error || !data) {
            return res.status(404).json({ success: false, error: 'Version not found' });
        }

        res.json({ success: true, data });
    });

    /**
     * POST /api/skills/:id/versions/:versionId/rollback
     * Rollback to specific version
     */
    router.post('/:id/versions/:versionId/rollback', async (req, res) => {
        const { id, versionId } = req.params;
        const userId = req.user?.id || null;

        // Get version to rollback to
        const { data: version, error: versionError } = await supabase
            .from('skill_versions')
            .select('*')
            .eq('id', versionId)
            .single();

        if (versionError || !version) {
            return res.status(404).json({ success: false, error: 'Version not found' });
        }

        // Get current skill
        const { data: current } = await supabase
            .from('skills')
            .select('version')
            .eq('id', id)
            .single();

        // Calculate new version
        const currentVersion = current?.version || '1.0.0';
        const versionParts = currentVersion.split('.').map(Number);
        versionParts[1]++;
        const newVersion = versionParts.join('.');

        // Update skill with version content
        const { data, error } = await supabase
            .from('skills')
            .update({
                instructions: version.instructions,
                output_format: version.output_format,
                required_context_types: version.required_context_types,
                optional_context_types: version.optional_context_types,
                examples: version.examples,
                templates: version.templates,
                version: newVersion,
                changelog: `Rolled back to version ${version.version_label}`
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        // Create new version record
        const { data: latestVersion } = await supabase
            .from('skill_versions')
            .select('version_number')
            .eq('skill_id', id)
            .order('version_number', { ascending: false })
            .limit(1)
            .single();

        await supabase.from('skill_versions').insert({
            id: uuidv4(),
            skill_id: id,
            version_number: (latestVersion?.version_number || 0) + 1,
            version_label: newVersion,
            instructions: version.instructions,
            output_format: version.output_format,
            required_context_types: version.required_context_types,
            optional_context_types: version.optional_context_types,
            examples: version.examples,
            templates: version.templates,
            change_summary: `Rolled back to version ${version.version_label}`,
            created_by: userId
        });

        res.json({ success: true, data });
    });

    // ============================================================================
    // EXECUTION & TESTING ENDPOINTS
    // ============================================================================

    /**
     * POST /api/skills/:id/test
     * Test skill execution with sample context
     */
    router.post('/:id/test', async (req, res) => {
        const { id } = req.params;
        const {
            message,
            context_asset_ids = [],
            model = 'claude-sonnet-4-5-20250929'
        } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        // Get skill
        const { data: skill, error: skillError } = await supabase
            .from('skills')
            .select('*')
            .eq('id', id)
            .single();

        if (skillError || !skill) {
            return res.status(404).json({ success: false, error: 'Skill not found' });
        }

        // Assemble context from provided asset IDs
        let contextText = '';
        if (context_asset_ids.length > 0) {
            const { data: assets } = await supabase
                .from('context_assets')
                .select('name, asset_type, content_text')
                .in('id', context_asset_ids);

            if (assets) {
                contextText = assets.map(a =>
                    `## ${a.name} (${a.asset_type})\n${a.content_text || JSON.stringify(a.content_json)}`
                ).join('\n\n---\n\n');
            }
        }

        // Build system prompt from skill
        const systemPrompt = `${skill.instructions}

${contextText ? `# Context Information\n\n${contextText}` : ''}

${skill.output_format ? `# Expected Output Format\n\n${skill.output_format}` : ''}`;

        // Execute via LLM service (simplified for example)
        // In production, use the full agentService
        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        const anthropic = new Anthropic();

        const startTime = Date.now();
        const response = await anthropic.messages.create({
            model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: message }]
        });
        const duration = Date.now() - startTime;

        const output = response.content[0]?.text || '';

        // Record execution
        const userId = req.user?.id || null;
        await supabase.from('skill_executions').insert({
            id: uuidv4(),
            skill_id: id,
            skill_version: skill.version,
            user_id: userId,
            input_message: message,
            output_content: output,
            context_assets_used: context_asset_ids,
            context_tokens_used: contextText.length / 4, // rough estimate
            model_used: model,
            total_tokens: response.usage?.input_tokens + response.usage?.output_tokens,
            duration_ms: duration,
            status: 'completed'
        });

        // Update usage count
        await supabase
            .from('skills')
            .update({
                usage_count: skill.usage_count + 1,
                last_used_at: new Date().toISOString()
            })
            .eq('id', id);

        res.json({
            success: true,
            data: {
                output,
                model_used: model,
                tokens_used: response.usage,
                duration_ms: duration,
                context_assets_used: context_asset_ids.length
            }
        });
    });

    /**
     * GET /api/skills/:id/executions
     * Get execution history for skill
     */
    router.get('/:id/executions', async (req, res) => {
        const { id } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        const { data, error, count } = await supabase
            .from('skill_executions')
            .select('*', { count: 'exact' })
            .eq('skill_id', id)
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        res.json({
            success: true,
            data: data || [],
            pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) }
        });
    });

    // ============================================================================
    // IMPORT/EXPORT ENDPOINTS
    // ============================================================================

    /**
     * GET /api/skills/:id/export
     * Export skill as SKILL.md format
     */
    router.get('/:id/export', async (req, res) => {
        const { id } = req.params;
        const { format = 'markdown' } = req.query;

        const { data: skill, error } = await supabase
            .from('skills')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !skill) {
            return res.status(404).json({ success: false, error: 'Skill not found' });
        }

        if (format === 'json') {
            // Export as JSON
            res.json({ success: true, data: skill });
        } else {
            // Export as SKILL.md format
            const markdown = `---
name: ${skill.name}
description: "${skill.description || ''}"
version: ${skill.version}
category: ${skill.category}
suite: ${skill.suite}
required_context: [${skill.required_context_types.map(t => `"${t}"`).join(', ')}]
optional_context: [${skill.optional_context_types.map(t => `"${t}"`).join(', ')}]
---

# ${skill.display_name}

${skill.description || ''}

## Instructions

${skill.instructions}

${skill.output_format ? `## Output Format\n\n${skill.output_format}` : ''}

${skill.trigger_phrases.length > 0 ? `## Triggers\n\n${skill.trigger_phrases.map(t => `- "${t}"`).join('\n')}` : ''}

${skill.conversation_starters.length > 0 ? `## Conversation Starters\n\n${skill.conversation_starters.map(s => `- ${s}`).join('\n')}` : ''}

${skill.examples.length > 0 ? `## Examples\n\n${skill.examples.map((e, i) => `### Example ${i + 1}\n\n**Input:** ${e.input}\n\n**Output:**\n${e.output}`).join('\n\n')}` : ''}
`;

            res.setHeader('Content-Type', 'text/markdown');
            res.setHeader('Content-Disposition', `attachment; filename="${skill.name}-SKILL.md"`);
            res.send(markdown);
        }
    });

    /**
     * POST /api/skills/import
     * Import skill from SKILL.md or JSON
     */
    router.post('/import', async (req, res) => {
        const { content, format = 'markdown', source_path } = req.body;
        const userId = req.user?.id || null;

        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Content is required'
            });
        }

        let skillData;

        if (format === 'json') {
            skillData = typeof content === 'string' ? JSON.parse(content) : content;
        } else {
            // Parse SKILL.md format
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
            if (!frontmatterMatch) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid SKILL.md format: missing frontmatter'
                });
            }

            // Parse YAML frontmatter (simplified)
            const frontmatter = {};
            frontmatterMatch[1].split('\n').forEach(line => {
                const [key, ...valueParts] = line.split(':');
                if (key && valueParts.length) {
                    let value = valueParts.join(':').trim();
                    // Handle arrays
                    if (value.startsWith('[')) {
                        value = JSON.parse(value.replace(/'/g, '"'));
                    }
                    // Handle quoted strings
                    if (value.startsWith('"') && value.endsWith('"')) {
                        value = value.slice(1, -1);
                    }
                    frontmatter[key.trim()] = value;
                }
            });

            // Extract instructions section
            const body = content.slice(frontmatterMatch[0].length).trim();
            const instructionsMatch = body.match(/## Instructions\n\n([\s\S]*?)(?=\n## |$)/);
            const instructions = instructionsMatch ? instructionsMatch[1].trim() : body;

            // Extract output format
            const outputMatch = body.match(/## Output Format\n\n([\s\S]*?)(?=\n## |$)/);
            const outputFormat = outputMatch ? outputMatch[1].trim() : null;

            skillData = {
                name: frontmatter.name,
                display_name: frontmatter.name?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                description: frontmatter.description,
                category: frontmatter.category || 'custom',
                suite: frontmatter.suite || 'execute',
                required_context_types: frontmatter.required_context || [],
                optional_context_types: frontmatter.optional_context || [],
                instructions,
                output_format: outputFormat,
                version: frontmatter.version || '1.0.0'
            };
        }

        // Add metadata
        skillData.id = uuidv4();
        skillData.user_id = userId;
        skillData.created_by = userId;
        skillData.status = 'draft';
        skillData.visibility = 'private';

        if (source_path) {
            skillData.config = { source_path };
        }

        const { data, error } = await supabase
            .from('skills')
            .insert(skillData)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({
                    success: false,
                    error: 'A skill with this name already exists'
                });
            }
            return res.status(500).json({ success: false, error: error.message });
        }

        res.status(201).json({ success: true, data });
    });

    return router;
};
```

---

## Phase 3: Backend Services

### Modify: `server/services/agentService.js`

Add skill-aware execution:

```javascript
/**
 * Build system prompt for agent
 * If agent has skill attached, use skill instructions
 */
async function buildSystemPrompt(agent, contextResult, supabase) {
    let basePrompt = agent.system_prompt;

    // If agent has a skill, use skill instructions
    if (agent.skill_id) {
        const { data: skill } = await supabase
            .from('skills')
            .select('instructions, output_format, version')
            .eq('id', agent.skill_id)
            .single();

        if (skill) {
            basePrompt = skill.instructions;

            if (skill.output_format) {
                basePrompt += `\n\n# Expected Output Format\n\n${skill.output_format}`;
            }
        }
    }

    // Append context
    if (contextResult?.assembledContext) {
        basePrompt += `\n\n# Context Information\n\n${contextResult.assembledContext}`;
    }

    return basePrompt;
}

/**
 * Validate context requirements for skill-powered agents
 */
async function validateSkillContext(agent, supabase) {
    if (!agent.skill_id) {
        return { valid: true };
    }

    const { data: skill } = await supabase
        .from('skills')
        .select('required_context_types, display_name')
        .eq('id', agent.skill_id)
        .single();

    if (!skill || !skill.required_context_types?.length) {
        return { valid: true };
    }

    // Get agent's mapped context types
    const { data: mappings } = await supabase
        .from('agent_context_mappings')
        .select('context_assets(asset_type)')
        .eq('agent_id', agent.id)
        .eq('is_active', true);

    const mappedTypes = new Set(
        mappings?.map(m => m.context_assets?.asset_type).filter(Boolean) || []
    );

    const missingTypes = skill.required_context_types.filter(
        type => !mappedTypes.has(type)
    );

    if (missingTypes.length > 0) {
        return {
            valid: false,
            error: `Skill "${skill.display_name}" requires context types: ${missingTypes.join(', ')}`,
            missing_types: missingTypes
        };
    }

    return { valid: true };
}
```

---

## Phase 4: Frontend - Skill Library

### New File: `public/skills.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Skills Library - Insight 360</title>
    <link rel="stylesheet" href="/css/shared.css">
    <link rel="stylesheet" href="/css/skills.css">
</head>
<body>
    <div class="app-container">
        <!-- Sidebar -->
        <nav class="sidebar" id="sidebar">
            <!-- ... navigation ... -->
        </nav>

        <!-- Main Content -->
        <main class="main-content">
            <header class="page-header">
                <div class="header-content">
                    <h1>Skills Library</h1>
                    <p class="subtitle">Reusable AI instruction sets</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-secondary" onclick="importSkill()">
                        <i data-lucide="upload"></i> Import
                    </button>
                    <button class="btn btn-primary" onclick="createSkill()">
                        <i data-lucide="plus"></i> Create Skill
                    </button>
                </div>
            </header>

            <!-- Filters -->
            <div class="filters-bar">
                <div class="search-box">
                    <i data-lucide="search"></i>
                    <input type="text" id="search-input" placeholder="Search skills...">
                </div>
                <div class="filter-group">
                    <select id="category-filter">
                        <option value="all">All Categories</option>
                        <option value="content">Content</option>
                        <option value="research">Research</option>
                        <option value="analysis">Analysis</option>
                        <option value="workflow">Workflow</option>
                        <option value="custom">Custom</option>
                    </select>
                    <select id="suite-filter">
                        <option value="all">All Suites</option>
                        <option value="align">Align 120</option>
                        <option value="strategy">Strategy 120</option>
                        <option value="execute">Execute 120</option>
                    </select>
                    <select id="status-filter">
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="all">All Status</option>
                    </select>
                </div>
            </div>

            <!-- Skills Grid -->
            <div class="skills-grid" id="skills-grid">
                <!-- Populated by JavaScript -->
            </div>
        </main>
    </div>

    <!-- Skill Card Template -->
    <template id="skill-card-template">
        <div class="skill-card" data-skill-id="">
            <div class="skill-header">
                <div class="skill-icon"></div>
                <div class="skill-meta">
                    <span class="skill-version"></span>
                    <span class="skill-suite"></span>
                </div>
            </div>
            <h3 class="skill-name"></h3>
            <p class="skill-description"></p>
            <div class="skill-context">
                <span class="context-label">Required context:</span>
                <div class="context-tags"></div>
            </div>
            <div class="skill-stats">
                <span class="stat"><i data-lucide="bot"></i> <span class="agents-count">0</span> agents</span>
                <span class="stat"><i data-lucide="play"></i> <span class="executions-count">0</span> runs</span>
            </div>
            <div class="skill-actions">
                <button class="btn btn-sm btn-secondary" onclick="editSkill(this)">Edit</button>
                <button class="btn btn-sm btn-secondary" onclick="duplicateSkill(this)">Duplicate</button>
                <button class="btn btn-sm btn-primary" onclick="createAgentFromSkill(this)">Create Agent</button>
            </div>
        </div>
    </template>

    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="/js/skills.js"></script>
</body>
</html>
```

---

## Phase 5: Frontend - Skill Creator

### New File: `public/skill-creator.html`

Multi-step wizard for creating/editing skills:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Skill Creator - Insight 360</title>
    <link rel="stylesheet" href="/css/shared.css">
    <link rel="stylesheet" href="/css/skill-creator.css">
</head>
<body>
    <div class="creator-container">
        <!-- Progress Steps -->
        <div class="progress-steps">
            <div class="step active" data-step="1">
                <span class="step-number">1</span>
                <span class="step-label">Identity</span>
            </div>
            <div class="step" data-step="2">
                <span class="step-number">2</span>
                <span class="step-label">Context</span>
            </div>
            <div class="step" data-step="3">
                <span class="step-number">3</span>
                <span class="step-label">Instructions</span>
            </div>
            <div class="step" data-step="4">
                <span class="step-number">4</span>
                <span class="step-label">Triggers</span>
            </div>
            <div class="step" data-step="5">
                <span class="step-number">5</span>
                <span class="step-label">Examples</span>
            </div>
            <div class="step" data-step="6">
                <span class="step-number">6</span>
                <span class="step-label">Test</span>
            </div>
            <div class="step" data-step="7">
                <span class="step-number">7</span>
                <span class="step-label">Publish</span>
            </div>
        </div>

        <!-- Step Content -->
        <div class="step-content">
            <!-- Step 1: Identity -->
            <section class="step-panel active" data-step="1">
                <h2>Skill Identity</h2>
                <p class="step-description">Define basic information about your skill.</p>

                <div class="form-group">
                    <label for="skill-name">Skill Name (slug)</label>
                    <input type="text" id="skill-name" placeholder="e.g., article-generator"
                           pattern="[a-z0-9-]+" required>
                    <small>Lowercase letters, numbers, and hyphens only</small>
                </div>

                <div class="form-group">
                    <label for="skill-display-name">Display Name</label>
                    <input type="text" id="skill-display-name" placeholder="e.g., Article Generator">
                </div>

                <div class="form-group">
                    <label for="skill-description">Description</label>
                    <textarea id="skill-description" rows="3"
                              placeholder="What does this skill do? When should it be used?"></textarea>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="skill-category">Category</label>
                        <select id="skill-category">
                            <option value="content">Content</option>
                            <option value="research">Research</option>
                            <option value="analysis">Analysis</option>
                            <option value="workflow">Workflow</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="skill-suite">Suite</label>
                        <select id="skill-suite">
                            <option value="execute">Execute 120</option>
                            <option value="strategy">Strategy 120</option>
                            <option value="align">Align 120</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="skill-tags">Tags</label>
                    <input type="text" id="skill-tags" placeholder="content, writing, marketing">
                    <small>Comma-separated tags for search</small>
                </div>
            </section>

            <!-- Step 2: Context Requirements -->
            <section class="step-panel" data-step="2">
                <h2>Context Requirements</h2>
                <p class="step-description">Define which context assets this skill needs.</p>

                <div class="context-section">
                    <h3>Required Context Types</h3>
                    <p>These must be mapped when creating an agent from this skill.</p>
                    <div class="context-checkboxes" id="required-context">
                        <!-- Populated dynamically -->
                    </div>
                </div>

                <div class="context-section">
                    <h3>Optional Context Types</h3>
                    <p>These can be added for enhanced results.</p>
                    <div class="context-checkboxes" id="optional-context">
                        <!-- Populated dynamically -->
                    </div>
                </div>

                <div class="form-group">
                    <label for="token-budget">Context Token Budget</label>
                    <input type="number" id="token-budget" value="8000" min="1000" max="100000">
                    <small>Maximum tokens allocated for context injection</small>
                </div>
            </section>

            <!-- Step 3: Instructions -->
            <section class="step-panel" data-step="3">
                <h2>Skill Instructions</h2>
                <p class="step-description">Write the core instructions for this skill.</p>

                <div class="editor-toolbar">
                    <button type="button" onclick="insertHeading()">H2</button>
                    <button type="button" onclick="insertBold()">B</button>
                    <button type="button" onclick="insertList()">List</button>
                    <button type="button" onclick="insertCode()">Code</button>
                    <span class="toolbar-divider"></span>
                    <button type="button" class="ai-assist" onclick="aiAssist()">
                        <i data-lucide="sparkles"></i> AI Assist
                    </button>
                </div>

                <textarea id="skill-instructions" class="code-editor" rows="20"
                          placeholder="## Purpose

You are an expert...

## Process

1. First, analyze...
2. Then, structure...
3. Finally, generate...

## Guidelines

- Always maintain...
- Never include..."></textarea>

                <div class="form-group">
                    <label for="output-format">Output Format (optional)</label>
                    <textarea id="output-format" rows="5"
                              placeholder="Describe the expected output structure..."></textarea>
                </div>
            </section>

            <!-- Step 4: Triggers & Starters -->
            <section class="step-panel" data-step="4">
                <h2>Triggers & Conversation Starters</h2>
                <p class="step-description">Define when this skill should be suggested.</p>

                <div class="form-group">
                    <label>Trigger Phrases</label>
                    <p class="field-description">Phrases that should suggest using this skill.</p>
                    <div id="trigger-phrases" class="tag-input-container">
                        <input type="text" class="tag-input" placeholder="Type and press Enter">
                    </div>
                </div>

                <div class="form-group">
                    <label>Conversation Starters</label>
                    <p class="field-description">Suggestions shown to users in the UI.</p>
                    <div id="conversation-starters" class="list-input-container">
                        <div class="list-item">
                            <input type="text" placeholder="e.g., Create an article about [topic]">
                            <button type="button" class="remove-btn">×</button>
                        </div>
                        <button type="button" class="add-btn" onclick="addStarter()">+ Add Starter</button>
                    </div>
                </div>
            </section>

            <!-- Step 5: Examples & Templates -->
            <section class="step-panel" data-step="5">
                <h2>Examples & Templates</h2>
                <p class="step-description">Add examples and templates to improve results.</p>

                <div class="examples-section">
                    <h3>Example Outputs</h3>
                    <p>Show the skill what good output looks like (few-shot learning).</p>
                    <div id="examples-container">
                        <!-- Examples added here -->
                    </div>
                    <button type="button" class="add-btn" onclick="addExample()">+ Add Example</button>
                </div>

                <div class="templates-section">
                    <h3>Templates</h3>
                    <p>Reusable structures the skill can reference.</p>
                    <div id="templates-container">
                        <!-- Templates added here -->
                    </div>
                    <button type="button" class="add-btn" onclick="addTemplate()">+ Add Template</button>
                </div>
            </section>

            <!-- Step 6: Test -->
            <section class="step-panel" data-step="6">
                <h2>Test Your Skill</h2>
                <p class="step-description">Try out the skill with sample context.</p>

                <div class="test-config">
                    <div class="form-group">
                        <label>Select Context Assets</label>
                        <select id="test-context" multiple>
                            <!-- Populated dynamically -->
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="test-input">Test Message</label>
                        <textarea id="test-input" rows="3"
                                  placeholder="Enter a test message..."></textarea>
                    </div>

                    <button type="button" class="btn btn-primary" onclick="runTest()">
                        <i data-lucide="play"></i> Run Test
                    </button>
                </div>

                <div class="test-results" id="test-results">
                    <!-- Test output displayed here -->
                </div>
            </section>

            <!-- Step 7: Publish -->
            <section class="step-panel" data-step="7">
                <h2>Save & Publish</h2>
                <p class="step-description">Review and publish your skill.</p>

                <div class="form-row">
                    <div class="form-group">
                        <label for="skill-version">Version</label>
                        <input type="text" id="skill-version" value="1.0.0" pattern="\d+\.\d+\.\d+">
                    </div>
                    <div class="form-group">
                        <label for="skill-visibility">Visibility</label>
                        <select id="skill-visibility">
                            <option value="private">Private</option>
                            <option value="team">Team</option>
                            <option value="public">Public</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="skill-changelog">Changelog</label>
                    <textarea id="skill-changelog" rows="2"
                              placeholder="What changed in this version?"></textarea>
                </div>

                <div class="publish-actions">
                    <button type="button" class="btn btn-secondary" onclick="saveDraft()">
                        Save as Draft
                    </button>
                    <button type="button" class="btn btn-primary" onclick="publishSkill()">
                        <i data-lucide="check"></i> Save & Publish
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="exportSkill()">
                        <i data-lucide="download"></i> Export SKILL.md
                    </button>
                </div>
            </section>
        </div>

        <!-- Navigation -->
        <div class="step-navigation">
            <button type="button" class="btn btn-secondary" id="prev-btn" onclick="prevStep()" disabled>
                <i data-lucide="arrow-left"></i> Previous
            </button>
            <button type="button" class="btn btn-primary" id="next-btn" onclick="nextStep()">
                Next <i data-lucide="arrow-right"></i>
            </button>
        </div>
    </div>

    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="/js/skill-creator.js"></script>
</body>
</html>
```

---

## Phase 6: Agent Integration

### Modify: Agent Creation Flow

Update the agent creation UI to support skill selection:

```javascript
// In agents-create.js or similar

async function loadSkillSelector() {
    const { data: skills } = await fetch('/api/skills?status=active').then(r => r.json());

    const selector = document.getElementById('skill-selector');
    selector.innerHTML = `
        <option value="">No skill (custom prompt)</option>
        ${skills.map(s => `
            <option value="${s.id}"
                    data-required-context="${s.required_context_types.join(',')}"
                    data-version="${s.version}">
                ${s.display_name} (v${s.version})
            </option>
        `).join('')}
    `;
}

function onSkillSelect(skillId) {
    if (!skillId) {
        // Show custom prompt editor
        document.getElementById('prompt-section').style.display = 'block';
        document.getElementById('skill-info').style.display = 'none';
        return;
    }

    // Hide prompt editor, show skill info
    document.getElementById('prompt-section').style.display = 'none';
    document.getElementById('skill-info').style.display = 'block';

    // Show required context warning
    const option = document.querySelector(`option[value="${skillId}"]`);
    const requiredContext = option.dataset.requiredContext.split(',').filter(Boolean);

    if (requiredContext.length > 0) {
        showContextRequirements(requiredContext);
    }
}

function showContextRequirements(types) {
    const container = document.getElementById('context-requirements');
    container.innerHTML = `
        <div class="alert alert-info">
            <strong>Required Context:</strong> This skill requires the following context types:
            <ul>
                ${types.map(t => `<li>${t}</li>`).join('')}
            </ul>
            Please map context assets for each type below.
        </div>
    `;

    // Auto-filter context asset selector to show compatible assets
    filterContextAssets(types);
}
```

---

## Phase 7: Import/Export

### Import from File System

```javascript
// Utility to import existing .claude/skills/ directories

async function importSkillsFromDirectory(directoryPath) {
    const fs = require('fs').promises;
    const path = require('path');

    const skillDirs = await fs.readdir(directoryPath);
    const results = [];

    for (const dir of skillDirs) {
        const skillPath = path.join(directoryPath, dir, 'SKILL.md');

        try {
            const content = await fs.readFile(skillPath, 'utf8');

            const response = await fetch('/api/skills/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    format: 'markdown',
                    source_path: skillPath
                })
            });

            const result = await response.json();
            results.push({ skill: dir, success: result.success, data: result.data });

        } catch (error) {
            results.push({ skill: dir, success: false, error: error.message });
        }
    }

    return results;
}
```

---

## File Structure

```
insight-360/
├── db/
│   └── phase5-skills-schema.sql          # NEW: Skills tables
│
├── server/
│   ├── routes/
│   │   ├── skills.js                     # NEW: Skills API routes
│   │   └── agents.js                     # MODIFIED: Add skill support
│   │
│   └── services/
│       ├── agentService.js               # MODIFIED: Skill-aware execution
│       └── skillService.js               # NEW: Skill utilities
│
├── public/
│   ├── skills.html                       # NEW: Skills library
│   ├── skill-creator.html                # NEW: Skill creator wizard
│   │
│   ├── css/
│   │   ├── skills.css                    # NEW: Skills library styles
│   │   └── skill-creator.css             # NEW: Creator wizard styles
│   │
│   └── js/
│       ├── skills.js                     # NEW: Skills library logic
│       └── skill-creator.js              # NEW: Creator wizard logic
│
└── documentation/
    └── skills/
        ├── SKILL-WORKFLOWS.md            # CREATED: Workflow documentation
        └── IMPLEMENTATION-PLAN.md        # THIS FILE
```

---

## Migration Path

### Step 1: Schema Migration
```bash
# Run the schema migration
psql $DATABASE_URL < db/phase5-skills-schema.sql
```

### Step 2: Register Routes
```javascript
// In server/index.js, add:
const skillsRoutes = require('./routes/skills');
app.use('/api/skills', skillsRoutes(supabase));
```

### Step 3: Update Navigation
Add Skills link to sidebar navigation in all dashboard pages.

### Step 4: Import Existing Skills (Optional)
```bash
# Import skills from Content Creation System
node scripts/import-skills.js ../Content\ Creation\ System/.claude/skills/
```

---

## Summary

This implementation plan covers:

1. **Database**: New `skills`, `skill_versions`, `skill_files`, `skill_executions` tables + agent extensions
2. **API**: Full CRUD for skills, versions, files, testing, import/export
3. **Frontend**: Skills library + multi-step skill creator wizard
4. **Integration**: Skill-aware agent execution with context validation
5. **Import/Export**: SKILL.md format compatibility

The framework maintains compatibility with the existing Content Creation System's skill format while adding database persistence, versioning, and UI management.
