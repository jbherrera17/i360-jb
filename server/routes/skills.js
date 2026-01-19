/**
 * INSIGHT 360 - Skills API Routes
 * Version: 1.0.0
 *
 * Endpoints:
 *   - Skill CRUD (7 endpoints)
 *   - Skill Files (4 endpoints)
 *   - Skill Versions (3 endpoints)
 *   - Skill Execution & Testing (2 endpoints)
 *   - Import/Export (2 endpoints)
 */

const express = require('express');
const { randomUUID: uuidv4 } = require('crypto');

/**
 * Skills Routes Factory
 * @param {object} supabase - Supabase client instance
 * @returns {Router} Express router
 */
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
        try {
            const {
                category,
                suite,
                status = 'active',
                visibility,
                search,
                required_context,
                department_id,
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
                    `display_name.ilike.%${search}%,description.ilike.%${search}%,name.ilike.%${search}%`
                );
            }
            if (required_context) {
                query = query.contains('required_context_types', [required_context]);
            }
            // Filter by department (show skills for this dept OR skills with no dept)
            if (department_id) {
                query = query.or(`department_id.eq.${department_id},department_id.is.null`);
            }

            // Sorting
            const validSortColumns = ['display_name', 'created_at', 'usage_count', 'agents_using', 'updated_at'];
            const sortColumn = validSortColumns.includes(sort) ? sort : 'display_name';
            query = query.order(sortColumn, { ascending: order === 'asc' });

            // Pagination
            query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            const { data, error, count } = await query;

            if (error) throw error;

            res.json({
                success: true,
                data: data || [],
                pagination: {
                    total: count,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            });

        } catch (error) {
            console.error('Error listing skills:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/skills/categories
     * List skill categories with counts
     */
    router.get('/categories', async (req, res) => {
        try {
            // Get categories from table
            const { data: categories, error: catError } = await supabase
                .from('skill_categories')
                .select('*')
                .eq('is_active', true)
                .order('sort_order');

            if (catError) throw catError;

            // Get counts per category (count all skills, not just active)
            const { data: skills, error: skillError } = await supabase
                .from('skills')
                .select('category, status');

            if (skillError) throw skillError;

            const counts = {};
            const activeCounts = {};
            (skills || []).forEach(s => {
                counts[s.category] = (counts[s.category] || 0) + 1;
                if (s.status === 'active') {
                    activeCounts[s.category] = (activeCounts[s.category] || 0) + 1;
                }
            });

            // Add counts to categories
            const categoriesWithCounts = (categories || []).map(cat => ({
                ...cat,
                count: counts[cat.category_key] || 0,
                active_count: activeCounts[cat.category_key] || 0
            }));

            // Add any categories found in skills but not in categories table
            const knownKeys = new Set((categories || []).map(c => c.category_key));
            const dynamicCategories = Object.keys(counts)
                .filter(key => key && !knownKeys.has(key))
                .map((key, idx) => ({
                    id: `dynamic-${key}`,
                    category_key: key,
                    display_name: key.charAt(0).toUpperCase() + key.slice(1),
                    description: `${key} skills`,
                    icon: 'folder',
                    color: '#6b7280',
                    sort_order: 100 + idx,
                    is_active: true,
                    count: counts[key] || 0,
                    active_count: activeCounts[key] || 0
                }));

            res.json({
                success: true,
                data: [...categoriesWithCounts, ...dynamicCategories]
            });

        } catch (error) {
            console.error('Error getting skill categories:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/skills/stats
     * Get skill statistics overview
     */
    router.get('/stats', async (req, res) => {
        try {
            const { data: skills, error } = await supabase
                .from('skills')
                .select('id, status, category, suite');

            if (error) throw error;

            const stats = {
                total_skills: skills?.length || 0,
                active_skills: skills?.filter(s => s.status === 'active').length || 0,
                draft_skills: skills?.filter(s => s.status === 'draft').length || 0,
                by_category: {},
                by_suite: {}
            };

            skills?.forEach(skill => {
                const cat = skill.category || 'custom';
                const suite = skill.suite || 'execute';
                stats.by_category[cat] = (stats.by_category[cat] || 0) + 1;
                stats.by_suite[suite] = (stats.by_suite[suite] || 0) + 1;
            });

            res.json({ success: true, data: stats });

        } catch (error) {
            console.error('Error getting skill stats:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/skills/:id
     * Get single skill with files and version history
     */
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Get skill
            const { data: skill, error: skillError } = await supabase
                .from('skills')
                .select('*')
                .eq('id', id)
                .single();

            if (skillError) {
                if (skillError.code === 'PGRST116') {
                    return res.status(404).json({ success: false, error: 'Skill not found' });
                }
                throw skillError;
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
                .select('id, name, icon, is_active, skill_version')
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

        } catch (error) {
            console.error('Error getting skill:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/skills
     * Create new skill
     */
    router.post('/', async (req, res) => {
        try {
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
                status = 'draft',
                department_id = null
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
                context_token_budget: parseInt(context_token_budget),
                trigger_phrases,
                conversation_starters,
                examples,
                templates,
                version: '1.0.0',
                visibility,
                status,
                created_by: userId,
                department_id: department_id || null
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
                throw error;
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

        } catch (error) {
            console.error('Error creating skill:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/skills/:id
     * Update skill (creates new version if instructions change)
     */
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;
            const userId = req.user?.id || null;

            // Get current skill
            const { data: current, error: getError } = await supabase
                .from('skills')
                .select('*')
                .eq('id', id)
                .single();

            if (getError) {
                if (getError.code === 'PGRST116') {
                    return res.status(404).json({ success: false, error: 'Skill not found' });
                }
                throw getError;
            }

            // Check if instructions changed (requires new version)
            const instructionsChanged = updates.instructions &&
                updates.instructions !== current.instructions;

            // Remove fields that shouldn't be updated directly
            delete updates.id;
            delete updates.user_id;
            delete updates.created_at;
            delete updates.created_by;
            delete updates.usage_count;

            // Parse numeric fields
            if (updates.context_token_budget !== undefined) {
                updates.context_token_budget = parseInt(updates.context_token_budget);
            }

            // If instructions changed, increment version
            if (instructionsChanged) {
                const currentVersion = current.version || '1.0.0';
                const versionParts = currentVersion.split('.').map(Number);
                versionParts[1]++; // Increment minor version
                versionParts[2] = 0; // Reset patch
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

            if (error) throw error;

            // Update agents with auto_update_skill = true
            if (instructionsChanged) {
                await supabase
                    .from('agents')
                    .update({ skill_version: updates.version })
                    .eq('skill_id', id)
                    .eq('auto_update_skill', true);
            }

            res.json({ success: true, data });

        } catch (error) {
            console.error('Error updating skill:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/skills/:id
     * Delete skill (archive by default)
     */
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { hard = false } = req.query;

            // Check if skill is in use
            const { data: agents } = await supabase
                .from('agents')
                .select('id, name')
                .eq('skill_id', id);

            if (agents && agents.length > 0 && hard !== 'true') {
                return res.status(400).json({
                    success: false,
                    error: `Skill is used by ${agents.length} agent(s): ${agents.map(a => a.name).join(', ')}. Detach them first or use hard=true to force delete.`,
                    agents_using: agents
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

                if (error) throw error;

                res.json({ success: true, message: 'Skill permanently deleted' });
            } else {
                const { error } = await supabase
                    .from('skills')
                    .update({ status: 'archived' })
                    .eq('id', id);

                if (error) throw error;

                res.json({ success: true, message: 'Skill archived' });
            }

        } catch (error) {
            console.error('Error deleting skill:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/skills/:id/duplicate
     * Duplicate a skill
     */
    router.post('/:id/duplicate', async (req, res) => {
        try {
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
                if (error.code === '23505') {
                    return res.status(409).json({
                        success: false,
                        error: 'A skill with this name already exists'
                    });
                }
                throw error;
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

            // Create initial version for duplicate
            await supabase.from('skill_versions').insert({
                id: uuidv4(),
                skill_id: data.id,
                version_number: 1,
                version_label: '1.0.0',
                instructions: data.instructions,
                output_format: data.output_format,
                required_context_types: data.required_context_types,
                optional_context_types: data.optional_context_types,
                examples: data.examples,
                templates: data.templates,
                change_summary: `Duplicated from ${original.display_name}`,
                created_by: userId
            });

            res.status(201).json({ success: true, data });

        } catch (error) {
            console.error('Error duplicating skill:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // SKILL FILES ENDPOINTS
    // ============================================================================

    /**
     * GET /api/skills/:id/files
     * List files for a skill
     */
    router.get('/:id/files', async (req, res) => {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('skill_files')
                .select('*')
                .eq('skill_id', id)
                .order('sort_order');

            if (error) throw error;

            res.json({ success: true, data: data || [] });

        } catch (error) {
            console.error('Error getting skill files:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/skills/:id/files
     * Add file to skill
     */
    router.post('/:id/files', async (req, res) => {
        try {
            const { id } = req.params;
            const { filename, file_type, content, description, mime_type, sort_order = 0 } = req.body;

            if (!filename || !file_type) {
                return res.status(400).json({
                    success: false,
                    error: 'filename and file_type are required'
                });
            }

            const fileData = {
                id: uuidv4(),
                skill_id: id,
                filename,
                file_type,
                content,
                description,
                mime_type: mime_type || 'text/markdown',
                sort_order: parseInt(sort_order)
            };

            const { data, error } = await supabase
                .from('skill_files')
                .insert(fileData)
                .select()
                .single();

            if (error) throw error;

            res.status(201).json({ success: true, data });

        } catch (error) {
            console.error('Error adding skill file:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/skills/:id/files/:fileId
     * Update skill file
     */
    router.put('/:id/files/:fileId', async (req, res) => {
        try {
            const { fileId } = req.params;
            const updates = req.body;

            // Only allow specific fields
            const allowedFields = ['filename', 'file_type', 'content', 'description', 'mime_type', 'sort_order'];
            const sanitizedUpdates = {};

            Object.keys(updates).forEach(key => {
                if (allowedFields.includes(key)) {
                    sanitizedUpdates[key] = updates[key];
                }
            });

            if (sanitizedUpdates.sort_order !== undefined) {
                sanitizedUpdates.sort_order = parseInt(sanitizedUpdates.sort_order);
            }

            const { data, error } = await supabase
                .from('skill_files')
                .update(sanitizedUpdates)
                .eq('id', fileId)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });

        } catch (error) {
            console.error('Error updating skill file:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/skills/:id/files/:fileId
     * Delete skill file
     */
    router.delete('/:id/files/:fileId', async (req, res) => {
        try {
            const { fileId } = req.params;

            const { error } = await supabase
                .from('skill_files')
                .delete()
                .eq('id', fileId);

            if (error) throw error;

            res.json({ success: true, message: 'File deleted' });

        } catch (error) {
            console.error('Error deleting skill file:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // SKILL VERSIONS ENDPOINTS
    // ============================================================================

    /**
     * GET /api/skills/:id/versions
     * Get version history
     */
    router.get('/:id/versions', async (req, res) => {
        try {
            const { id } = req.params;
            const { limit = 20, offset = 0 } = req.query;

            const { data, error, count } = await supabase
                .from('skill_versions')
                .select('*', { count: 'exact' })
                .eq('skill_id', id)
                .order('version_number', { ascending: false })
                .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            if (error) throw error;

            res.json({
                success: true,
                data: data || [],
                pagination: {
                    total: count,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            });

        } catch (error) {
            console.error('Error getting skill versions:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/skills/:id/versions/:versionId
     * Get specific version
     */
    router.get('/:id/versions/:versionId', async (req, res) => {
        try {
            const { versionId } = req.params;

            const { data, error } = await supabase
                .from('skill_versions')
                .select('*')
                .eq('id', versionId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return res.status(404).json({ success: false, error: 'Version not found' });
                }
                throw error;
            }

            res.json({ success: true, data });

        } catch (error) {
            console.error('Error getting skill version:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/skills/:id/versions/:versionId/rollback
     * Rollback to specific version
     */
    router.post('/:id/versions/:versionId/rollback', async (req, res) => {
        try {
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
            versionParts[2] = 0;
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

            if (error) throw error;

            // Create new version record for the rollback
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

            // Update agents with auto_update_skill = true
            await supabase
                .from('agents')
                .update({ skill_version: newVersion })
                .eq('skill_id', id)
                .eq('auto_update_skill', true);

            res.json({
                success: true,
                data,
                message: `Rolled back to version ${version.version_label}`
            });

        } catch (error) {
            console.error('Error rolling back skill version:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // EXECUTION & TESTING ENDPOINTS
    // ============================================================================

    /**
     * POST /api/skills/:id/test
     * Test skill execution with sample context
     */
    router.post('/:id/test', async (req, res) => {
        try {
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
            let contextTokens = 0;

            if (context_asset_ids.length > 0) {
                const { data: assets } = await supabase
                    .from('context_assets')
                    .select('name, asset_type, content_text, content_json')
                    .in('id', context_asset_ids);

                if (assets) {
                    contextText = assets.map(a => {
                        const content = a.content_text || JSON.stringify(a.content_json, null, 2);
                        return `## ${a.name} (${a.asset_type})\n\n${content}`;
                    }).join('\n\n---\n\n');

                    // Rough token estimate
                    contextTokens = Math.ceil(contextText.length / 4);
                }
            }

            // Build system prompt from skill
            let systemPrompt = skill.instructions;

            if (contextText) {
                systemPrompt += `\n\n# Context Information\n\n${contextText}`;
            }

            if (skill.output_format) {
                systemPrompt += `\n\n# Expected Output Format\n\n${skill.output_format}`;
            }

            // Execute via Anthropic
            const Anthropic = require('@anthropic-ai/sdk');
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
            const totalTokens = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

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
                context_tokens_used: contextTokens,
                model_used: model,
                total_tokens: totalTokens,
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
                    tokens_used: {
                        input: response.usage?.input_tokens || 0,
                        output: response.usage?.output_tokens || 0,
                        total: totalTokens
                    },
                    context_tokens: contextTokens,
                    duration_ms: duration,
                    context_assets_used: context_asset_ids.length
                }
            });

        } catch (error) {
            console.error('Error testing skill:', error);

            // Record failed execution
            const userId = req.user?.id || null;
            await supabase.from('skill_executions').insert({
                id: uuidv4(),
                skill_id: req.params.id,
                user_id: userId,
                input_message: req.body.message,
                status: 'failed',
                error_message: error.message
            });

            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/skills/:id/executions
     * Get execution history for skill
     */
    router.get('/:id/executions', async (req, res) => {
        try {
            const { id } = req.params;
            const { limit = 20, offset = 0 } = req.query;

            const { data, error, count } = await supabase
                .from('skill_executions')
                .select('*', { count: 'exact' })
                .eq('skill_id', id)
                .order('created_at', { ascending: false })
                .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            if (error) throw error;

            res.json({
                success: true,
                data: data || [],
                pagination: {
                    total: count,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            });

        } catch (error) {
            console.error('Error getting skill executions:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // IMPORT/EXPORT ENDPOINTS
    // ============================================================================

    /**
     * GET /api/skills/:id/export
     * Export skill as SKILL.md format or JSON
     */
    router.get('/:id/export', async (req, res) => {
        try {
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
                const requiredContext = skill.required_context_types || [];
                const optionalContext = skill.optional_context_types || [];
                const triggers = skill.trigger_phrases || [];
                const starters = skill.conversation_starters || [];
                const examples = skill.examples || [];

                const markdown = `---
name: ${skill.name}
description: "${(skill.description || '').replace(/"/g, '\\"')}"
version: ${skill.version}
category: ${skill.category}
suite: ${skill.suite}
required_context: [${requiredContext.map(t => `"${t}"`).join(', ')}]
optional_context: [${optionalContext.map(t => `"${t}"`).join(', ')}]
context_token_budget: ${skill.context_token_budget}
---

# ${skill.display_name}

${skill.description || ''}

## Instructions

${skill.instructions}

${skill.output_format ? `## Output Format\n\n${skill.output_format}\n` : ''}
${triggers.length > 0 ? `## Trigger Phrases\n\n${triggers.map(t => `- "${t}"`).join('\n')}\n` : ''}
${starters.length > 0 ? `## Conversation Starters\n\n${starters.map(s => `- ${s}`).join('\n')}\n` : ''}
${examples.length > 0 ? `## Examples\n\n${examples.map((e, i) => `### Example ${i + 1}\n\n**Input:** ${e.input}\n\n**Output:**\n${e.output}`).join('\n\n')}\n` : ''}
`;

                res.setHeader('Content-Type', 'text/markdown');
                res.setHeader('Content-Disposition', `attachment; filename="${skill.name}-SKILL.md"`);
                res.send(markdown);
            }

        } catch (error) {
            console.error('Error exporting skill:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/skills/import
     * Import skill from SKILL.md or JSON
     */
    router.post('/import', async (req, res) => {
        try {
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
                        error: 'Invalid SKILL.md format: missing frontmatter (---)'
                    });
                }

                // Parse YAML-like frontmatter
                const frontmatter = {};
                frontmatterMatch[1].split('\n').forEach(line => {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex > 0) {
                        const key = line.substring(0, colonIndex).trim();
                        let value = line.substring(colonIndex + 1).trim();

                        // Handle arrays
                        if (value.startsWith('[') && value.endsWith(']')) {
                            try {
                                value = JSON.parse(value.replace(/'/g, '"'));
                            } catch {
                                value = [];
                            }
                        }
                        // Handle quoted strings
                        else if (value.startsWith('"') && value.endsWith('"')) {
                            value = value.slice(1, -1);
                        }
                        // Handle numbers
                        else if (!isNaN(value) && value !== '') {
                            value = Number(value);
                        }

                        frontmatter[key] = value;
                    }
                });

                // Extract body content
                const body = content.slice(frontmatterMatch[0].length).trim();

                // Extract instructions section
                const instructionsMatch = body.match(/## Instructions\n\n([\s\S]*?)(?=\n## |$)/);
                const instructions = instructionsMatch
                    ? instructionsMatch[1].trim()
                    : body.replace(/^#[^\n]*\n+/, '').replace(/^[^\n]*\n+/, ''); // Fallback: use body minus title

                // Extract output format
                const outputMatch = body.match(/## Output Format\n\n([\s\S]*?)(?=\n## |$)/);
                const outputFormat = outputMatch ? outputMatch[1].trim() : null;

                // Extract trigger phrases
                const triggersMatch = body.match(/## Trigger Phrases\n\n([\s\S]*?)(?=\n## |$)/);
                const triggers = triggersMatch
                    ? triggersMatch[1].split('\n')
                        .filter(l => l.startsWith('- '))
                        .map(l => l.replace(/^- "?|"?$/g, ''))
                    : [];

                // Extract conversation starters
                const startersMatch = body.match(/## Conversation Starters\n\n([\s\S]*?)(?=\n## |$)/);
                const starters = startersMatch
                    ? startersMatch[1].split('\n')
                        .filter(l => l.startsWith('- '))
                        .map(l => l.replace(/^- /, ''))
                    : [];

                skillData = {
                    name: frontmatter.name,
                    display_name: frontmatter.name?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    description: frontmatter.description || '',
                    category: frontmatter.category || 'custom',
                    suite: frontmatter.suite || 'execute',
                    required_context_types: frontmatter.required_context || [],
                    optional_context_types: frontmatter.optional_context || [],
                    context_token_budget: frontmatter.context_token_budget || 8000,
                    instructions,
                    output_format: outputFormat,
                    trigger_phrases: triggers,
                    conversation_starters: starters,
                    version: frontmatter.version || '1.0.0'
                };
            }

            // Validate required fields
            if (!skillData.name || !skillData.instructions) {
                return res.status(400).json({
                    success: false,
                    error: 'Skill must have a name and instructions'
                });
            }

            // Add metadata
            skillData.id = uuidv4();
            skillData.user_id = userId;
            skillData.created_by = userId;
            skillData.status = 'draft';
            skillData.visibility = 'private';
            skillData.usage_count = 0;

            // Store source path if provided
            if (source_path) {
                skillData.tags = [...(skillData.tags || []), `imported:${source_path}`];
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
                throw error;
            }

            // Create initial version
            await supabase.from('skill_versions').insert({
                id: uuidv4(),
                skill_id: data.id,
                version_number: 1,
                version_label: data.version || '1.0.0',
                instructions: data.instructions,
                output_format: data.output_format,
                required_context_types: data.required_context_types,
                optional_context_types: data.optional_context_types,
                examples: data.examples || [],
                templates: data.templates || [],
                change_summary: source_path ? `Imported from ${source_path}` : 'Imported skill',
                created_by: userId
            });

            res.status(201).json({
                success: true,
                data,
                message: 'Skill imported successfully'
            });

        } catch (error) {
            console.error('Error importing skill:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};
