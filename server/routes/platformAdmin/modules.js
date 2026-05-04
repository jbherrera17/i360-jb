/**
 * Platform Admin — Platform Modules.
 *
 * requirePlatformAdmin is applied by the coordinator. requireAdminWrite is per-route.
 */

const express = require('express');

module.exports = function (supabase, requireAdminWrite) {
    const router = express.Router();


    // ============================================
    // PLATFORM MODULES
    // ============================================

    /**
     * GET /api/platform/modules
     * List all platform modules
     */
    router.get('/modules', async (req, res) => {
        try {
            const { category } = req.query;

            let query = supabase
                .from('platform_modules')
                .select('*')
                .order('display_order');

            if (category) {
                query = query.eq('category', category);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error fetching modules:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/platform/modules
     * Create a new platform module
     */
    router.post('/modules', requireAdminWrite, async (req, res) => {
        try {
            const {
                id,
                name,
                description,
                icon,
                route_path,
                min_tier,
                min_business_role,
                requires_modules,
                category,
                nav_group,
                display_order,
                is_active,
                is_beta
            } = req.body;

            // Validate required fields
            if (!id || !name) {
                return res.status(400).json({
                    success: false,
                    error: 'Module ID and name are required'
                });
            }

            // Validate ID format (lowercase, underscores only)
            if (!/^[a-z][a-z0-9_]*$/.test(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Module ID must start with a letter and contain only lowercase letters, numbers, and underscores'
                });
            }

            // Get max display_order if not provided
            let orderValue = display_order;
            if (orderValue === undefined) {
                const { data: maxOrder } = await supabase
                    .from('platform_modules')
                    .select('display_order')
                    .order('display_order', { ascending: false })
                    .limit(1)
                    .single();
                orderValue = (maxOrder?.display_order || 0) + 10;
            }

            const insertData = {
                id,
                name,
                description: description || null,
                icon: icon || 'puzzle',
                route_path: route_path || null,
                min_tier: min_tier || 'starter',
                min_business_role: min_business_role || null,
                requires_modules: requires_modules || null,
                category: category || 'tools',
                nav_group: nav_group || null,
                display_order: orderValue,
                is_active: is_active !== false,
                is_beta: is_beta || false
            };

            const { data, error } = await supabase
                .from('platform_modules')
                .insert(insertData)
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    return res.status(409).json({
                        success: false,
                        error: 'A module with this ID already exists'
                    });
                }
                throw error;
            }

            res.status(201).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error creating module:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/platform/modules/:id
     * Update a platform module
     */
    router.put('/modules/:id', requireAdminWrite, async (req, res) => {
        try {
            const { id } = req.params;
            const {
                name,
                description,
                icon,
                route_path,
                min_tier,
                min_business_role,
                requires_modules,
                category,
                nav_group,
                display_order,
                is_active,
                is_beta
            } = req.body;

            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (description !== undefined) updateData.description = description;
            if (icon !== undefined) updateData.icon = icon;
            if (route_path !== undefined) updateData.route_path = route_path;
            if (min_tier !== undefined) updateData.min_tier = min_tier;
            if (min_business_role !== undefined) updateData.min_business_role = min_business_role;
            if (requires_modules !== undefined) updateData.requires_modules = requires_modules;
            if (category !== undefined) updateData.category = category;
            if (nav_group !== undefined) updateData.nav_group = nav_group;
            if (display_order !== undefined) updateData.display_order = display_order;
            if (is_active !== undefined) updateData.is_active = is_active;
            if (is_beta !== undefined) updateData.is_beta = is_beta;

            const { data, error } = await supabase
                .from('platform_modules')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error updating module:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/platform/modules/:id
     * Delete or deactivate a platform module
     * By default, soft-deletes (sets is_active = false)
     * Use ?hard=true for permanent deletion
     */
    router.delete('/modules/:id', requireAdminWrite, async (req, res) => {
        try {
            const { id } = req.params;
            const { hard } = req.query;

            // Check if module exists
            const { data: existing, error: checkError } = await supabase
                .from('platform_modules')
                .select('id, name')
                .eq('id', id)
                .single();

            if (checkError || !existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Module not found'
                });
            }

            if (hard === 'true') {
                // Hard delete - permanently remove
                const { error } = await supabase
                    .from('platform_modules')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                res.json({
                    success: true,
                    message: `Module "${existing.name}" permanently deleted`
                });
            } else {
                // Soft delete - deactivate
                const { data, error } = await supabase
                    .from('platform_modules')
                    .update({ is_active: false })
                    .eq('id', id)
                    .select()
                    .single();

                if (error) throw error;

                res.json({
                    success: true,
                    message: `Module "${existing.name}" deactivated`,
                    data
                });
            }
        } catch (error) {
            console.error('Error deleting module:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
};
