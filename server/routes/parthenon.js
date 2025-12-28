/**
 * INSIGHT 360 - Parthenon API Routes
 * Version: 1.0.0
 *
 * Organizational structure management:
 *   - Departments (8 endpoints)
 *   - Roles (8 endpoints)
 *   - OKRs (8 endpoints)
 *   - Processes (8 endpoints)
 */

const express = require('express');
const { randomUUID: uuidv4 } = require('crypto');

/**
 * Parthenon Routes Factory
 * @param {object} supabase - Supabase client instance
 * @returns {Router} Express router
 */
module.exports = function(supabase) {
    const router = express.Router();

    // Get user ID helper
    const getUserId = (req) => req.user?.id || process.env.DEV_USER_ID || null;

    // ============================================================================
    // DEPARTMENTS ENDPOINTS
    // ============================================================================

    /**
     * GET /api/parthenon/departments
     * List all departments with optional hierarchy
     */
    router.get('/departments', async (req, res) => {
        try {
            const {
                include_children = 'false',
                active_only = 'true'
            } = req.query;

            let query = supabase
                .from('departments')
                .select('*')
                .order('sort_order');

            if (active_only === 'true') {
                query = query.eq('is_active', true);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Build hierarchy if requested
            let result = data || [];
            if (include_children === 'true') {
                result = buildHierarchy(data, null);
            }

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Error listing departments:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/parthenon/departments/:id
     * Get single department with roles
     */
    router.get('/departments/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data: department, error: deptError } = await supabase
                .from('departments')
                .select('*')
                .eq('id', id)
                .single();

            if (deptError) throw deptError;
            if (!department) {
                return res.status(404).json({
                    success: false,
                    error: 'Department not found'
                });
            }

            // Get roles in this department
            const { data: roles } = await supabase
                .from('roles')
                .select('*')
                .eq('department_id', id)
                .eq('is_active', true)
                .order('sort_order');

            // Get child departments
            const { data: children } = await supabase
                .from('departments')
                .select('id, name, icon, color')
                .eq('parent_id', id)
                .eq('is_active', true);

            res.json({
                success: true,
                data: {
                    ...department,
                    roles: roles || [],
                    children: children || []
                }
            });

        } catch (error) {
            console.error('Error getting department:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/parthenon/departments
     * Create new department
     */
    router.post('/departments', async (req, res) => {
        try {
            const {
                name,
                description,
                icon = 'building-2',
                color = '#6366f1',
                parent_id = null,
                sort_order = 0
            } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Name is required'
                });
            }

            const userId = getUserId(req);

            const departmentData = {
                id: uuidv4(),
                user_id: userId,
                name,
                description,
                icon,
                color,
                parent_id,
                sort_order: parseInt(sort_order),
                is_active: true
            };

            const { data, error } = await supabase
                .from('departments')
                .insert(departmentData)
                .select()
                .single();

            if (error) throw error;

            res.status(201).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error creating department:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/parthenon/departments/:id
     * Update department
     */
    router.put('/departments/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Remove protected fields
            delete updates.id;
            delete updates.user_id;
            delete updates.created_at;

            const { data, error } = await supabase
                .from('departments')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error updating department:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/parthenon/departments/:id
     * Delete department (soft delete)
     */
    router.delete('/departments/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { hard = 'false' } = req.query;

            if (hard === 'true') {
                const { error } = await supabase
                    .from('departments')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('departments')
                    .update({ is_active: false })
                    .eq('id', id);
                if (error) throw error;
            }

            res.json({
                success: true,
                message: `Department ${hard === 'true' ? 'permanently deleted' : 'deactivated'}`
            });

        } catch (error) {
            console.error('Error deleting department:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // ROLES ENDPOINTS
    // ============================================================================

    /**
     * GET /api/parthenon/roles
     * List all roles with optional filters
     */
    router.get('/roles', async (req, res) => {
        try {
            const {
                department_id,
                level,
                active_only = 'true'
            } = req.query;

            let query = supabase
                .from('roles')
                .select(`
                    *,
                    departments (id, name, icon, color)
                `)
                .order('sort_order');

            if (department_id) {
                query = query.eq('department_id', department_id);
            }
            if (level) {
                query = query.eq('level', level);
            }
            if (active_only === 'true') {
                query = query.eq('is_active', true);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({
                success: true,
                data: data || []
            });

        } catch (error) {
            console.error('Error listing roles:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/parthenon/roles/:id
     * Get single role with reporting structure
     */
    router.get('/roles/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data: role, error: roleError } = await supabase
                .from('roles')
                .select(`
                    *,
                    departments (id, name, icon, color)
                `)
                .eq('id', id)
                .single();

            if (roleError) throw roleError;
            if (!role) {
                return res.status(404).json({
                    success: false,
                    error: 'Role not found'
                });
            }

            // Get reports_to role
            let reportsTo = null;
            if (role.reports_to) {
                const { data } = await supabase
                    .from('roles')
                    .select('id, title, level')
                    .eq('id', role.reports_to)
                    .single();
                reportsTo = data;
            }

            // Get direct reports
            const { data: directReports } = await supabase
                .from('roles')
                .select('id, title, level')
                .eq('reports_to', id)
                .eq('is_active', true);

            // Get associated OKRs
            const { data: okrs } = await supabase
                .from('okrs')
                .select('id, title, status, progress')
                .eq('role_id', id)
                .eq('status', 'active');

            res.json({
                success: true,
                data: {
                    ...role,
                    reports_to_role: reportsTo,
                    direct_reports: directReports || [],
                    okrs: okrs || []
                }
            });

        } catch (error) {
            console.error('Error getting role:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/parthenon/roles
     * Create new role
     */
    router.post('/roles', async (req, res) => {
        try {
            const {
                title,
                description,
                department_id,
                level = 'individual',
                reports_to = null,
                responsibilities = [],
                authority = {},
                required_skills = [],
                icon = 'user',
                sort_order = 0
            } = req.body;

            if (!title || !department_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Title and department_id are required'
                });
            }

            const userId = getUserId(req);

            const roleData = {
                id: uuidv4(),
                user_id: userId,
                title,
                description,
                department_id,
                level,
                reports_to,
                responsibilities,
                authority,
                required_skills,
                icon,
                sort_order: parseInt(sort_order),
                is_active: true
            };

            const { data, error } = await supabase
                .from('roles')
                .insert(roleData)
                .select()
                .single();

            if (error) throw error;

            res.status(201).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error creating role:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/parthenon/roles/:id
     * Update role
     */
    router.put('/roles/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            delete updates.id;
            delete updates.user_id;
            delete updates.created_at;

            const { data, error } = await supabase
                .from('roles')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error updating role:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/parthenon/roles/:id
     * Delete role (soft delete)
     */
    router.delete('/roles/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { hard = 'false' } = req.query;

            if (hard === 'true') {
                const { error } = await supabase
                    .from('roles')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('roles')
                    .update({ is_active: false })
                    .eq('id', id);
                if (error) throw error;
            }

            res.json({
                success: true,
                message: `Role ${hard === 'true' ? 'permanently deleted' : 'deactivated'}`
            });

        } catch (error) {
            console.error('Error deleting role:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // OKRs ENDPOINTS
    // ============================================================================

    /**
     * GET /api/parthenon/okrs
     * List all OKRs with optional filters
     */
    router.get('/okrs', async (req, res) => {
        try {
            const {
                scope,
                department_id,
                role_id,
                period,
                status,
                include_children = 'false'
            } = req.query;

            let query = supabase
                .from('okrs')
                .select(`
                    *,
                    departments (id, name),
                    roles (id, title)
                `)
                .order('created_at', { ascending: false });

            if (scope) query = query.eq('scope', scope);
            if (department_id) query = query.eq('department_id', department_id);
            if (role_id) query = query.eq('role_id', role_id);
            if (period) query = query.eq('period', period);
            if (status) query = query.eq('status', status);

            const { data, error } = await query;

            if (error) throw error;

            // Build hierarchy if requested
            let result = data || [];
            if (include_children === 'true') {
                result = buildOKRHierarchy(data, null);
            }

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Error listing OKRs:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/parthenon/okrs/:id
     * Get single OKR with children
     */
    router.get('/okrs/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data: okr, error: okrError } = await supabase
                .from('okrs')
                .select(`
                    *,
                    departments (id, name),
                    roles (id, title)
                `)
                .eq('id', id)
                .single();

            if (okrError) throw okrError;
            if (!okr) {
                return res.status(404).json({
                    success: false,
                    error: 'OKR not found'
                });
            }

            // Get parent OKR
            let parentOKR = null;
            if (okr.parent_okr_id) {
                const { data } = await supabase
                    .from('okrs')
                    .select('id, title, scope, progress')
                    .eq('id', okr.parent_okr_id)
                    .single();
                parentOKR = data;
            }

            // Get child OKRs
            const { data: children } = await supabase
                .from('okrs')
                .select('id, title, scope, progress, status')
                .eq('parent_okr_id', id);

            res.json({
                success: true,
                data: {
                    ...okr,
                    parent_okr: parentOKR,
                    child_okrs: children || []
                }
            });

        } catch (error) {
            console.error('Error getting OKR:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/parthenon/okrs
     * Create new OKR
     */
    router.post('/okrs', async (req, res) => {
        try {
            const {
                title,
                description,
                scope = 'company',
                department_id = null,
                role_id = null,
                parent_okr_id = null,
                period,
                start_date = null,
                end_date = null,
                key_results = [],
                status = 'draft'
            } = req.body;

            if (!title || !period) {
                return res.status(400).json({
                    success: false,
                    error: 'Title and period are required'
                });
            }

            const userId = getUserId(req);

            const okrData = {
                id: uuidv4(),
                user_id: userId,
                title,
                description,
                scope,
                department_id,
                role_id,
                parent_okr_id,
                period,
                start_date,
                end_date,
                key_results,
                status,
                progress: 0
            };

            const { data, error } = await supabase
                .from('okrs')
                .insert(okrData)
                .select()
                .single();

            if (error) throw error;

            res.status(201).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error creating OKR:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/parthenon/okrs/:id
     * Update OKR
     */
    router.put('/okrs/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            delete updates.id;
            delete updates.user_id;
            delete updates.created_at;

            // Calculate progress if key_results updated
            if (updates.key_results && Array.isArray(updates.key_results)) {
                const completed = updates.key_results.filter(kr =>
                    kr.current >= kr.target
                ).length;
                updates.progress = Math.round((completed / updates.key_results.length) * 100) || 0;
            }

            const { data, error } = await supabase
                .from('okrs')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error updating OKR:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/parthenon/okrs/:id
     * Delete OKR
     */
    router.delete('/okrs/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('okrs')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({
                success: true,
                message: 'OKR deleted'
            });

        } catch (error) {
            console.error('Error deleting OKR:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // PROCESSES ENDPOINTS
    // ============================================================================

    /**
     * GET /api/parthenon/processes
     * List all processes with optional filters
     */
    router.get('/processes', async (req, res) => {
        try {
            const {
                department_id,
                type,
                status,
                tags,
                search
            } = req.query;

            let query = supabase
                .from('processes')
                .select(`
                    *,
                    departments (id, name),
                    roles!processes_owner_role_id_fkey (id, title)
                `)
                .order('name');

            if (department_id) query = query.eq('department_id', department_id);
            if (type) query = query.eq('type', type);
            if (status) query = query.eq('status', status);
            if (tags) query = query.contains('tags', [tags]);
            if (search) {
                query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({
                success: true,
                data: data || []
            });

        } catch (error) {
            console.error('Error listing processes:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/parthenon/processes/:id
     * Get single process with details
     */
    router.get('/processes/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data: process, error: procError } = await supabase
                .from('processes')
                .select(`
                    *,
                    departments (id, name),
                    roles!processes_owner_role_id_fkey (id, title)
                `)
                .eq('id', id)
                .single();

            if (procError) throw procError;
            if (!process) {
                return res.status(404).json({
                    success: false,
                    error: 'Process not found'
                });
            }

            res.json({
                success: true,
                data: process
            });

        } catch (error) {
            console.error('Error getting process:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/parthenon/processes
     * Create new process
     */
    router.post('/processes', async (req, res) => {
        try {
            const {
                name,
                description,
                department_id = null,
                type = 'procedure',
                owner_role_id = null,
                steps = [],
                inputs = [],
                outputs = [],
                related_assets = [],
                tags = [],
                status = 'draft',
                version = '1.0'
            } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Name is required'
                });
            }

            const userId = getUserId(req);

            const processData = {
                id: uuidv4(),
                user_id: userId,
                name,
                description,
                department_id,
                type,
                owner_role_id,
                steps,
                inputs,
                outputs,
                related_assets,
                tags,
                status,
                version
            };

            const { data, error } = await supabase
                .from('processes')
                .insert(processData)
                .select()
                .single();

            if (error) throw error;

            res.status(201).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error creating process:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/parthenon/processes/:id
     * Update process
     */
    router.put('/processes/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            delete updates.id;
            delete updates.user_id;
            delete updates.created_at;

            const { data, error } = await supabase
                .from('processes')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error updating process:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/parthenon/processes/:id
     * Delete process
     */
    router.delete('/processes/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { hard = 'false' } = req.query;

            if (hard === 'true') {
                const { error } = await supabase
                    .from('processes')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('processes')
                    .update({ status: 'archived' })
                    .eq('id', id);
                if (error) throw error;
            }

            res.json({
                success: true,
                message: `Process ${hard === 'true' ? 'permanently deleted' : 'archived'}`
            });

        } catch (error) {
            console.error('Error deleting process:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // UTILITY ENDPOINTS
    // ============================================================================

    /**
     * GET /api/parthenon/overview
     * Get organizational overview (counts and summaries)
     */
    router.get('/overview', async (req, res) => {
        try {
            // Get counts in parallel
            const [
                { count: deptCount },
                { count: roleCount },
                { count: okrCount },
                { count: processCount }
            ] = await Promise.all([
                supabase.from('departments').select('*', { count: 'exact', head: true }).eq('is_active', true),
                supabase.from('roles').select('*', { count: 'exact', head: true }).eq('is_active', true),
                supabase.from('okrs').select('*', { count: 'exact', head: true }).eq('status', 'active'),
                supabase.from('processes').select('*', { count: 'exact', head: true }).eq('status', 'active')
            ]);

            res.json({
                success: true,
                data: {
                    departments: deptCount || 0,
                    roles: roleCount || 0,
                    active_okrs: okrCount || 0,
                    active_processes: processCount || 0
                }
            });

        } catch (error) {
            console.error('Error getting overview:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/parthenon/seed-defaults
     * Seed default departments (for new users)
     */
    router.post('/seed-defaults', async (req, res) => {
        try {
            const userId = getUserId(req);

            const defaultDepartments = [
                { name: 'Executive', description: 'Executive leadership and strategy', icon: 'crown', color: '#8b5cf6', sort_order: 1 },
                { name: 'Finance', description: 'Financial operations and planning', icon: 'banknote', color: '#10b981', sort_order: 2 },
                { name: 'Operations', description: 'Business operations and logistics', icon: 'settings', color: '#6366f1', sort_order: 3 },
                { name: 'Sales', description: 'Sales and revenue generation', icon: 'trending-up', color: '#f59e0b', sort_order: 4 },
                { name: 'Marketing', description: 'Marketing and brand management', icon: 'megaphone', color: '#ec4899', sort_order: 5 },
                { name: 'Production', description: 'Product development and delivery', icon: 'package', color: '#3b82f6', sort_order: 6 },
                { name: 'Service', description: 'Customer service and support', icon: 'headphones', color: '#14b8a6', sort_order: 7 },
                { name: 'Stakeholder Relations', description: 'External stakeholder management', icon: 'users', color: '#8b5cf6', sort_order: 8 }
            ];

            const departmentsWithIds = defaultDepartments.map(dept => ({
                ...dept,
                id: uuidv4(),
                user_id: userId,
                is_active: true
            }));

            const { data, error } = await supabase
                .from('departments')
                .insert(departmentsWithIds)
                .select();

            if (error) throw error;

            res.status(201).json({
                success: true,
                message: `${data.length} default departments created`,
                data
            });

        } catch (error) {
            console.error('Error seeding defaults:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    /**
     * Build hierarchical tree from flat list
     */
    function buildHierarchy(items, parentId) {
        return items
            .filter(item => item.parent_id === parentId)
            .map(item => ({
                ...item,
                children: buildHierarchy(items, item.id)
            }));
    }

    /**
     * Build OKR cascade hierarchy
     */
    function buildOKRHierarchy(items, parentId) {
        return items
            .filter(item => item.parent_okr_id === parentId)
            .map(item => ({
                ...item,
                children: buildOKRHierarchy(items, item.id)
            }));
    }

    return router;
};
