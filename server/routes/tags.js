/**
 * Insight 360 - Tags API Routes
 * Phase 3.3: Tag Management
 *
 * Provides CRUD operations for the categorized tag taxonomy
 * Categories: skill, domain, function
 */

const express = require('express');
const crypto = require('crypto');

module.exports = function(supabase) {
    const router = express.Router();

    /**
     * GET /api/tags
     * List all tags with optional filtering
     */
    router.get('/', async (req, res) => {
        try {
            const {
                category,
                parent_id,
                search,
                include_inactive = 'false',
                sort = 'name',
                order = 'asc',
                limit = 100,
                offset = 0
            } = req.query;

            let query = supabase
                .from('tags')
                .select('*, parent:parent_id(id, name, category)', { count: 'exact' });

            // Apply filters
            if (category) {
                query = query.eq('category', category);
            }

            if (parent_id === 'null') {
                query = query.is('parent_id', null);
            } else if (parent_id) {
                query = query.eq('parent_id', parent_id);
            }

            if (search) {
                query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
            }

            if (include_inactive !== 'true') {
                query = query.eq('is_active', true);
            }

            // Apply sorting and pagination
            query = query
                .order(sort, { ascending: order === 'asc' })
                .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

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
            console.error('Error listing tags:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/tags/hierarchy
     * Get tag hierarchy tree by category
     */
    router.get('/hierarchy', async (req, res) => {
        try {
            const { category } = req.query;

            let query = supabase
                .from('tag_hierarchy')
                .select('*');

            if (category) {
                query = query.eq('category', category);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Build tree structure
            const buildTree = (items, parentId = null, depth = 0) => {
                return items
                    .filter(item => item.parent_id === parentId && item.depth === depth)
                    .map(item => ({
                        ...item,
                        children: buildTree(items, item.id, depth + 1)
                    }));
            };

            // Group by category
            const grouped = {};
            const categories = ['skill', 'domain', 'function'];

            categories.forEach(cat => {
                const categoryItems = (data || []).filter(d => d.category === cat);
                grouped[cat] = buildTree(categoryItems);
            });

            res.json({
                success: true,
                data: category ? grouped[category] || [] : grouped
            });
        } catch (error) {
            console.error('Error getting tag hierarchy:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/tags/stats
     * Get tag usage statistics
     */
    router.get('/stats', async (req, res) => {
        try {
            // Get counts by category
            const { data: categoryStats, error: catError } = await supabase
                .from('tags')
                .select('category')
                .eq('is_active', true);

            if (catError) throw catError;

            const categoryCounts = {
                skill: 0,
                domain: 0,
                function: 0
            };

            (categoryStats || []).forEach(tag => {
                if (categoryCounts.hasOwnProperty(tag.category)) {
                    categoryCounts[tag.category]++;
                }
            });

            // Get usage counts
            const { data: roleTagCount } = await supabase
                .from('role_tags')
                .select('tag_id', { count: 'exact', head: true });

            const { data: agentTagCount } = await supabase
                .from('agent_tags')
                .select('tag_id', { count: 'exact', head: true });

            const { data: workflowTagCount } = await supabase
                .from('workflow_tags')
                .select('tag_id', { count: 'exact', head: true });

            res.json({
                success: true,
                data: {
                    total: Object.values(categoryCounts).reduce((a, b) => a + b, 0),
                    byCategory: categoryCounts,
                    usage: {
                        roles: roleTagCount?.length || 0,
                        agents: agentTagCount?.length || 0,
                        workflows: workflowTagCount?.length || 0
                    }
                }
            });
        } catch (error) {
            console.error('Error getting tag stats:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/tags/:id
     * Get single tag by ID
     */
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('tags')
                .select('*, parent:parent_id(id, name, category)')
                .eq('id', id)
                .single();

            if (error) throw error;

            if (!data) {
                return res.status(404).json({
                    success: false,
                    error: 'Tag not found'
                });
            }

            // Get children
            const { data: children } = await supabase
                .from('tags')
                .select('id, name, category, description')
                .eq('parent_id', id)
                .eq('is_active', true);

            // Get usage counts
            const { count: roleCount } = await supabase
                .from('role_tags')
                .select('*', { count: 'exact', head: true })
                .eq('tag_id', id);

            const { count: agentCount } = await supabase
                .from('agent_tags')
                .select('*', { count: 'exact', head: true })
                .eq('tag_id', id);

            res.json({
                success: true,
                data: {
                    ...data,
                    children: children || [],
                    usage: {
                        roles: roleCount || 0,
                        agents: agentCount || 0
                    }
                }
            });
        } catch (error) {
            console.error('Error getting tag:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/tags
     * Create new tag
     */
    router.post('/', async (req, res) => {
        try {
            const { name, category, parent_id, description } = req.body;

            // Validation
            if (!name || !category) {
                return res.status(400).json({
                    success: false,
                    error: 'Name and category are required'
                });
            }

            const validCategories = ['skill', 'domain', 'function'];
            if (!validCategories.includes(category)) {
                return res.status(400).json({
                    success: false,
                    error: `Category must be one of: ${validCategories.join(', ')}`
                });
            }

            // Check for duplicate name in same category
            const { data: existing } = await supabase
                .from('tags')
                .select('id')
                .eq('name', name)
                .eq('category', category)
                .single();

            if (existing) {
                return res.status(409).json({
                    success: false,
                    error: 'A tag with this name already exists in this category'
                });
            }

            // If parent_id provided, verify it exists and is same category
            if (parent_id) {
                const { data: parent, error: parentError } = await supabase
                    .from('tags')
                    .select('id, category')
                    .eq('id', parent_id)
                    .single();

                if (parentError || !parent) {
                    return res.status(400).json({
                        success: false,
                        error: 'Parent tag not found'
                    });
                }

                if (parent.category !== category) {
                    return res.status(400).json({
                        success: false,
                        error: 'Parent tag must be in the same category'
                    });
                }
            }

            const tagData = {
                id: crypto.randomUUID(),
                name: name.toLowerCase().replace(/\s+/g, '-'),
                category,
                parent_id: parent_id || null,
                description: description || null,
                is_active: true
            };

            const { data, error } = await supabase
                .from('tags')
                .insert(tagData)
                .select('*, parent:parent_id(id, name, category)')
                .single();

            if (error) throw error;

            res.status(201).json({ success: true, data });
        } catch (error) {
            console.error('Error creating tag:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/tags/:id
     * Update tag
     */
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description, parent_id, is_active } = req.body;

            // Build update object
            const updates = { updated_at: new Date().toISOString() };

            if (name !== undefined) {
                updates.name = name.toLowerCase().replace(/\s+/g, '-');
            }

            if (description !== undefined) {
                updates.description = description;
            }

            if (parent_id !== undefined) {
                // Prevent circular reference
                if (parent_id === id) {
                    return res.status(400).json({
                        success: false,
                        error: 'Tag cannot be its own parent'
                    });
                }
                updates.parent_id = parent_id || null;
            }

            if (is_active !== undefined) {
                updates.is_active = is_active;
            }

            const { data, error } = await supabase
                .from('tags')
                .update(updates)
                .eq('id', id)
                .select('*, parent:parent_id(id, name, category)')
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating tag:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/tags/:id
     * Delete or deactivate tag
     */
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { hard = 'false' } = req.query;

            // Check for children
            const { data: children } = await supabase
                .from('tags')
                .select('id')
                .eq('parent_id', id)
                .eq('is_active', true);

            if (children && children.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot delete tag with active children. Delete or reassign children first.'
                });
            }

            // Check for usage
            const { count: usageCount } = await supabase
                .from('role_tags')
                .select('*', { count: 'exact', head: true })
                .eq('tag_id', id);

            if (hard === 'true') {
                if (usageCount > 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Cannot permanently delete tag that is in use. Remove from roles first.'
                    });
                }

                const { error } = await supabase
                    .from('tags')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('tags')
                    .update({ is_active: false, updated_at: new Date().toISOString() })
                    .eq('id', id);

                if (error) throw error;
            }

            res.json({
                success: true,
                message: hard === 'true' ? 'Tag permanently deleted' : 'Tag deactivated'
            });
        } catch (error) {
            console.error('Error deleting tag:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};
