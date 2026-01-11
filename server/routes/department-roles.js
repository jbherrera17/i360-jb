/**
 * Insight 360 - Department Roles API Routes
 * Phase 3.4: Role Management
 *
 * Provides CRUD operations for department roles, responsibilities,
 * and role-tag assignments
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = function(supabase) {
    const router = express.Router();

    // ==========================================
    // DEPARTMENT ROLES
    // ==========================================

    /**
     * GET /api/roles
     * List all department roles with optional filtering
     */
    router.get('/', async (req, res) => {
        try {
            const {
                department_id,
                role_level,
                is_system_template,
                search,
                include_inactive = 'false',
                sort = 'sort_order',
                order = 'asc',
                limit = 100,
                offset = 0
            } = req.query;

            let query = supabase
                .from('department_roles')
                .select(`
                    *,
                    department:department_id(id, name, icon, color)
                `, { count: 'exact' });

            // Apply filters
            if (department_id) {
                query = query.eq('department_id', department_id);
            }

            if (role_level) {
                query = query.eq('role_level', role_level);
            }

            if (is_system_template !== undefined) {
                query = query.eq('is_system_template', is_system_template === 'true');
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

            // Get tag counts for each role
            const roleIds = (data || []).map(r => r.id);
            const { data: tagCounts } = await supabase
                .from('role_tags')
                .select('role_id')
                .in('role_id', roleIds);

            const tagCountMap = {};
            (tagCounts || []).forEach(rt => {
                tagCountMap[rt.role_id] = (tagCountMap[rt.role_id] || 0) + 1;
            });

            const rolesWithCounts = (data || []).map(role => ({
                ...role,
                tag_count: tagCountMap[role.id] || 0
            }));

            res.json({
                success: true,
                data: rolesWithCounts,
                pagination: {
                    total: count,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            });
        } catch (error) {
            console.error('Error listing roles:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/roles/templates
     * Get system role templates (department-agnostic)
     */
    router.get('/templates', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('department_roles')
                .select('name, description, role_level')
                .eq('is_system_template', true)
                .eq('is_active', true)
                .order('sort_order');

            if (error) throw error;

            // Get unique templates
            const uniqueTemplates = [];
            const seen = new Set();

            (data || []).forEach(role => {
                const key = `${role.name}-${role.role_level}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueTemplates.push(role);
                }
            });

            res.json({ success: true, data: uniqueTemplates });
        } catch (error) {
            console.error('Error getting role templates:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/roles/levels
     * Get available role levels
     */
    router.get('/levels', async (req, res) => {
        res.json({
            success: true,
            data: [
                { value: 'ic', label: 'Individual Contributor', order: 1 },
                { value: 'manager', label: 'Manager', order: 2 },
                { value: 'director', label: 'Director', order: 3 },
                { value: 'vp', label: 'Vice President', order: 4 },
                { value: 'c-level', label: 'C-Level Executive', order: 5 }
            ]
        });
    });

    /**
     * GET /api/roles/responsibilities
     * List all responsibilities (must be before /:id route)
     */
    router.get('/responsibilities', async (req, res) => {
        try {
            const { parent_id, search } = req.query;

            let query = supabase
                .from('responsibilities')
                .select('*, parent:parent_id(id, name)')
                .eq('is_active', true);

            if (parent_id === 'null') {
                query = query.is('parent_id', null);
            } else if (parent_id) {
                query = query.eq('parent_id', parent_id);
            }

            if (search) {
                query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
            }

            const { data, error } = await query.order('name');

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error listing responsibilities:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/roles/:id
     * Get single role with full details
     */
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data: role, error } = await supabase
                .from('department_roles')
                .select(`
                    *,
                    department:department_id(id, name, icon, color)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;

            if (!role) {
                return res.status(404).json({
                    success: false,
                    error: 'Role not found'
                });
            }

            // Get assigned tags
            const { data: roleTags } = await supabase
                .from('role_tags')
                .select('tag_id, tags(id, name, category, description)')
                .eq('role_id', id);

            // Get assigned responsibilities
            const { data: roleResponsibilities } = await supabase
                .from('role_responsibilities')
                .select('responsibility_id, responsibilities(id, name, description, parent_id)')
                .eq('role_id', id);

            // Get user count
            const { count: userCount } = await supabase
                .from('user_roles')
                .select('*', { count: 'exact', head: true })
                .eq('role_id', id);

            res.json({
                success: true,
                data: {
                    ...role,
                    tags: (roleTags || []).map(rt => rt.tags),
                    responsibilities: (roleResponsibilities || []).map(rr => rr.responsibilities),
                    user_count: userCount || 0
                }
            });
        } catch (error) {
            console.error('Error getting role:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/roles
     * Create new department role
     */
    router.post('/', async (req, res) => {
        try {
            const {
                department_id,
                name,
                description,
                role_level = 'ic',
                is_system_template = false,
                sort_order = 0,
                tag_ids = [],
                responsibility_ids = []
            } = req.body;

            // Validation
            if (!department_id || !name) {
                return res.status(400).json({
                    success: false,
                    error: 'Department ID and name are required'
                });
            }

            const validLevels = ['ic', 'manager', 'director', 'vp', 'c-level'];
            if (!validLevels.includes(role_level)) {
                return res.status(400).json({
                    success: false,
                    error: `Role level must be one of: ${validLevels.join(', ')}`
                });
            }

            // Create role
            const roleId = uuidv4();
            const roleData = {
                id: roleId,
                department_id,
                name,
                description: description || null,
                role_level,
                is_system_template,
                sort_order,
                is_active: true
            };

            const { data: role, error } = await supabase
                .from('department_roles')
                .insert(roleData)
                .select(`
                    *,
                    department:department_id(id, name, icon, color)
                `)
                .single();

            if (error) throw error;

            // Assign tags if provided
            if (tag_ids.length > 0) {
                const tagAssignments = tag_ids.map(tag_id => ({
                    role_id: roleId,
                    tag_id
                }));

                await supabase.from('role_tags').insert(tagAssignments);
            }

            // Assign responsibilities if provided
            if (responsibility_ids.length > 0) {
                const respAssignments = responsibility_ids.map(responsibility_id => ({
                    role_id: roleId,
                    responsibility_id
                }));

                await supabase.from('role_responsibilities').insert(respAssignments);
            }

            res.status(201).json({ success: true, data: role });
        } catch (error) {
            console.error('Error creating role:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/roles/:id
     * Update department role
     */
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description, role_level, sort_order, is_active } = req.body;

            const updates = { updated_at: new Date().toISOString() };

            if (name !== undefined) updates.name = name;
            if (description !== undefined) updates.description = description;
            if (role_level !== undefined) updates.role_level = role_level;
            if (sort_order !== undefined) updates.sort_order = sort_order;
            if (is_active !== undefined) updates.is_active = is_active;

            const { data, error } = await supabase
                .from('department_roles')
                .update(updates)
                .eq('id', id)
                .select(`
                    *,
                    department:department_id(id, name, icon, color)
                `)
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating role:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/roles/:id/tags
     * Assign tags to role (replaces existing)
     */
    router.post('/:id/tags', async (req, res) => {
        try {
            const { id } = req.params;
            const { tag_ids = [] } = req.body;

            // Remove existing tag assignments
            await supabase
                .from('role_tags')
                .delete()
                .eq('role_id', id);

            // Add new assignments
            if (tag_ids.length > 0) {
                const tagAssignments = tag_ids.map(tag_id => ({
                    role_id: id,
                    tag_id
                }));

                const { error } = await supabase
                    .from('role_tags')
                    .insert(tagAssignments);

                if (error) throw error;
            }

            // Return updated tags
            const { data: roleTags } = await supabase
                .from('role_tags')
                .select('tag_id, tags(id, name, category)')
                .eq('role_id', id);

            res.json({
                success: true,
                data: (roleTags || []).map(rt => rt.tags)
            });
        } catch (error) {
            console.error('Error assigning tags to role:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/roles/:id/responsibilities
     * Assign responsibilities to role (replaces existing)
     */
    router.post('/:id/responsibilities', async (req, res) => {
        try {
            const { id } = req.params;
            const { responsibility_ids = [] } = req.body;

            // Remove existing responsibility assignments
            await supabase
                .from('role_responsibilities')
                .delete()
                .eq('role_id', id);

            // Add new assignments
            if (responsibility_ids.length > 0) {
                const respAssignments = responsibility_ids.map(responsibility_id => ({
                    role_id: id,
                    responsibility_id
                }));

                const { error } = await supabase
                    .from('role_responsibilities')
                    .insert(respAssignments);

                if (error) throw error;
            }

            // Return updated responsibilities
            const { data: roleResps } = await supabase
                .from('role_responsibilities')
                .select('responsibility_id, responsibilities(id, name, description)')
                .eq('role_id', id);

            res.json({
                success: true,
                data: (roleResps || []).map(rr => rr.responsibilities)
            });
        } catch (error) {
            console.error('Error assigning responsibilities to role:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/roles/:id
     * Delete or deactivate role
     */
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { hard = 'false' } = req.query;

            // Check for assigned users
            const { count: userCount } = await supabase
                .from('user_roles')
                .select('*', { count: 'exact', head: true })
                .eq('role_id', id);

            if (userCount > 0 && hard === 'true') {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot permanently delete role with assigned users. Remove users first.'
                });
            }

            if (hard === 'true') {
                // Delete related records first
                await supabase.from('role_tags').delete().eq('role_id', id);
                await supabase.from('role_responsibilities').delete().eq('role_id', id);

                const { error } = await supabase
                    .from('department_roles')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('department_roles')
                    .update({ is_active: false, updated_at: new Date().toISOString() })
                    .eq('id', id);

                if (error) throw error;
            }

            res.json({
                success: true,
                message: hard === 'true' ? 'Role permanently deleted' : 'Role deactivated'
            });
        } catch (error) {
            console.error('Error deleting role:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ==========================================
    // RESPONSIBILITIES
    // ==========================================

    /**
     * GET /api/roles/responsibilities/all
     * List all responsibilities
     */
    router.get('/responsibilities/all', async (req, res) => {
        try {
            const { parent_id, search } = req.query;

            let query = supabase
                .from('responsibilities')
                .select('*, parent:parent_id(id, name)')
                .eq('is_active', true);

            if (parent_id === 'null') {
                query = query.is('parent_id', null);
            } else if (parent_id) {
                query = query.eq('parent_id', parent_id);
            }

            if (search) {
                query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
            }

            const { data, error } = await query.order('name');

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error listing responsibilities:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/roles/responsibilities
     * Create new responsibility
     */
    router.post('/responsibilities', async (req, res) => {
        try {
            const { name, description, parent_id, tag_ids = [] } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Name is required'
                });
            }

            const respId = uuidv4();
            const respData = {
                id: respId,
                name,
                description: description || null,
                parent_id: parent_id || null,
                is_active: true
            };

            const { data, error } = await supabase
                .from('responsibilities')
                .insert(respData)
                .select('*, parent:parent_id(id, name)')
                .single();

            if (error) throw error;

            // Assign tags if provided
            if (tag_ids.length > 0) {
                const tagAssignments = tag_ids.map(tag_id => ({
                    responsibility_id: respId,
                    tag_id
                }));

                await supabase.from('responsibility_tags').insert(tagAssignments);
            }

            res.status(201).json({ success: true, data });
        } catch (error) {
            console.error('Error creating responsibility:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/roles/responsibilities/:id
     * Get a single responsibility by ID
     */
    router.get('/responsibilities/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('responsibilities')
                .select('*, parent:parent_id(id, name)')
                .eq('id', id)
                .single();

            if (error) throw error;

            if (!data) {
                return res.status(404).json({
                    success: false,
                    error: 'Responsibility not found'
                });
            }

            // Get role usage count
            const { count: roleCount } = await supabase
                .from('role_responsibilities')
                .select('*', { count: 'exact', head: true })
                .eq('responsibility_id', id);

            res.json({
                success: true,
                data: {
                    ...data,
                    role_count: roleCount || 0
                }
            });
        } catch (error) {
            console.error('Error getting responsibility:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/roles/responsibilities/:id
     * Update an existing responsibility
     */
    router.put('/responsibilities/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description, parent_id } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Name is required'
                });
            }

            // Prevent circular reference
            if (parent_id === id) {
                return res.status(400).json({
                    success: false,
                    error: 'A responsibility cannot be its own parent'
                });
            }

            const updates = {
                name,
                description: description || null,
                parent_id: parent_id || null,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('responsibilities')
                .update(updates)
                .eq('id', id)
                .select('*, parent:parent_id(id, name)')
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating responsibility:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/roles/responsibilities/:id
     * Delete a responsibility (soft delete by default)
     */
    router.delete('/responsibilities/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { hard = 'false' } = req.query;

            // Check if responsibility is used by any roles
            const { count: roleCount } = await supabase
                .from('role_responsibilities')
                .select('*', { count: 'exact', head: true })
                .eq('responsibility_id', id);

            if (hard === 'true') {
                if (roleCount > 0) {
                    return res.status(400).json({
                        success: false,
                        error: `Cannot delete responsibility that is assigned to ${roleCount} title(s). Remove from titles first.`
                    });
                }

                // Delete related records first
                await supabase.from('responsibility_tags').delete().eq('responsibility_id', id);
                await supabase.from('user_responsibilities').delete().eq('responsibility_id', id);

                const { error } = await supabase
                    .from('responsibilities')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('responsibilities')
                    .update({ is_active: false, updated_at: new Date().toISOString() })
                    .eq('id', id);

                if (error) throw error;
            }

            res.json({
                success: true,
                message: hard === 'true' ? 'Responsibility permanently deleted' : 'Responsibility deactivated'
            });
        } catch (error) {
            console.error('Error deleting responsibility:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};
