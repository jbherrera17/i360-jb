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
const { getUserId } = require('../utils/auth');
const { requireOrgContext } = require('../middleware/orgContext');

/**
 * Parthenon Routes Factory
 * @param {object} supabase - Supabase client instance
 * @returns {Router} Express router
 */
module.exports = function(supabase) {
    const router = express.Router();
    const createModuleAccessMiddleware = require('../middleware/moduleAccess');
    const { requireModule } = createModuleAccessMiddleware(supabase);

    // Phase 81: Module gating — enforce tier/role access for parthenon module
    router.use(requireModule('parthenon'));

    // Phase 82: Multi-tenant org context — validate org membership on all routes
    router.use(requireOrgContext(supabase));

    /**
     * Get department IDs belonging to an org
     */
    async function getOrgDepartmentIds(orgId) {
        const { data } = await supabase
            .from('departments')
            .select('id')
            .eq('org_id', orgId);
        return (data || []).map(d => d.id);
    }

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

            // Org-scope: only show departments belonging to this org
            const orgId = req.verifiedOrgId;
            if (orgId) {
                query = query.eq('org_id', orgId);
            }

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
            const orgId = req.verifiedOrgId;

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
            if (orgId) departmentData.org_id = orgId;

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

            // Phase 81: Verify org ownership before allowing update
            const orgId = req.verifiedOrgId;
            const { data: existing } = await supabase.from('departments').select('org_id').eq('id', id).maybeSingle();
            if (!existing) {
                return res.status(404).json({ success: false, error: 'Department not found' });
            }
            if (existing.org_id && orgId && existing.org_id !== orgId) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }

            // Backfill org_id if missing
            if (orgId && !existing.org_id) {
                updates.org_id = orgId;
            }

            const { data, error } = await supabase
                .from('departments')
                .update(updates)
                .eq('id', id)
                .select()
                .maybeSingle();

            if (error) throw error;
            if (!data) {
                return res.status(404).json({ success: false, error: 'Department not found' });
            }

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

            // Phase 81: Verify org ownership before delete
            const orgId = req.verifiedOrgId;
            const { data: dept } = await supabase.from('departments').select('org_id').eq('id', id).maybeSingle();
            if (!dept) {
                return res.status(404).json({ success: false, error: 'Department not found' });
            }
            if (dept.org_id && orgId && dept.org_id !== orgId) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }

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

            // Org-scope: filter roles to departments in this org
            const orgId = req.verifiedOrgId;
            if (orgId && !department_id) {
                const deptIds = await getOrgDepartmentIds(orgId);
                if (deptIds.length > 0) {
                    query = query.in('department_id', deptIds);
                } else {
                    return res.json({ success: true, data: [] });
                }
            }

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

            // Phase 81: Verify org ownership via dept->org chain
            const orgId = req.verifiedOrgId;
            if (orgId) {
                const { data: role } = await supabase.from('roles').select('department_id').eq('id', id).maybeSingle();
                if (role?.department_id) {
                    const { data: dept } = await supabase.from('departments').select('org_id').eq('id', role.department_id).maybeSingle();
                    if (dept?.org_id && dept.org_id !== orgId) {
                        return res.status(403).json({ success: false, error: 'Access denied' });
                    }
                }
            }

            const { data, error } = await supabase
                .from('roles')
                .update(updates)
                .eq('id', id)
                .select()
                .maybeSingle();

            if (error) throw error;
            if (!data) return res.status(404).json({ success: false, error: 'Role not found' });

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

            // Org-scope: filter OKRs to departments in this org
            const orgId = req.verifiedOrgId;
            if (orgId && !department_id) {
                const deptIds = await getOrgDepartmentIds(orgId);
                if (deptIds.length > 0) {
                    query = query.in('department_id', deptIds);
                } else {
                    return res.json({ success: true, data: [] });
                }
            }

            if (scope) query = query.eq('scope', scope);
            if (department_id) query = query.eq('department_id', department_id);
            if (role_id) query = query.eq('role_id', role_id);
            if (period) query = query.eq('period', period);
            if (status) query = query.eq('status', status);

            const { data, error } = await query;

            if (error) throw error;

            // Fetch strategic links for all OKRs
            let result = data || [];
            if (result.length > 0) {
                const okrIds = result.map(o => o.id);
                const { data: links, error: linksError } = await supabase
                    .from('okr_strategic_links')
                    .select('id, okr_id, objective_id, link_type, is_primary')
                    .in('okr_id', okrIds);

                if (!linksError && links) {
                    // Group links by okr_id
                    const linksByOkr = {};
                    links.forEach(link => {
                        if (!linksByOkr[link.okr_id]) linksByOkr[link.okr_id] = [];
                        linksByOkr[link.okr_id].push(link);
                    });

                    // Attach strategic_links to each OKR
                    result = result.map(okr => ({
                        ...okr,
                        strategic_links: linksByOkr[okr.id] || []
                    }));
                }
            }

            // Build hierarchy if requested
            if (include_children === 'true') {
                result = buildOKRHierarchy(result, null);
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
     * Get single OKR with children and strategic links
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

            // Get strategic links (S2E integration)
            const { data: strategicLinks } = await supabase
                .from('okr_strategic_links')
                .select(`
                    id,
                    link_type,
                    is_primary,
                    alignment_score,
                    contribution_description,
                    bsc_objectives (
                        id,
                        name,
                        description,
                        bsc_perspectives (
                            id,
                            name,
                            perspective_type,
                            color
                        )
                    )
                `)
                .eq('okr_id', id);

            // Transform strategic links for cleaner response
            const formattedLinks = (strategicLinks || []).map(link => ({
                id: link.id,
                objective_id: link.bsc_objectives?.id,
                objective_name: link.bsc_objectives?.name,
                objective_description: link.bsc_objectives?.description,
                perspective_id: link.bsc_objectives?.bsc_perspectives?.id,
                perspective_name: link.bsc_objectives?.bsc_perspectives?.name,
                perspective_type: link.bsc_objectives?.bsc_perspectives?.perspective_type,
                perspective_color: link.bsc_objectives?.bsc_perspectives?.color,
                link_type: link.link_type,
                is_primary: link.is_primary,
                alignment_score: link.alignment_score,
                contribution_description: link.contribution_description
            }));

            res.json({
                success: true,
                data: {
                    ...okr,
                    parent_okr: parentOKR,
                    child_okrs: children || [],
                    strategic_links: formattedLinks
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

            // Phase 81: Verify org ownership via dept->org chain
            const orgId = req.verifiedOrgId;
            if (orgId) {
                const { data: okr } = await supabase.from('okrs').select('department_id').eq('id', id).maybeSingle();
                if (okr?.department_id) {
                    const { data: dept } = await supabase.from('departments').select('org_id').eq('id', okr.department_id).maybeSingle();
                    if (dept?.org_id && dept.org_id !== orgId) {
                        return res.status(403).json({ success: false, error: 'Access denied' });
                    }
                }
            }

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
                .maybeSingle();

            if (error) throw error;
            if (!data) return res.status(404).json({ success: false, error: 'OKR not found' });

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

            // Org-scope: filter processes to departments in this org
            const orgId = req.verifiedOrgId;
            if (orgId && !department_id) {
                const deptIds = await getOrgDepartmentIds(orgId);
                if (deptIds.length > 0) {
                    query = query.in('department_id', deptIds);
                } else {
                    return res.json({ success: true, data: [] });
                }
            }

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

            // Phase 81: Verify org ownership via dept->org chain
            const orgId = req.verifiedOrgId;
            if (orgId) {
                const { data: proc } = await supabase.from('processes').select('department_id').eq('id', id).maybeSingle();
                if (proc?.department_id) {
                    const { data: dept } = await supabase.from('departments').select('org_id').eq('id', proc.department_id).maybeSingle();
                    if (dept?.org_id && dept.org_id !== orgId) {
                        return res.status(403).json({ success: false, error: 'Access denied' });
                    }
                }
            }

            const { data, error } = await supabase
                .from('processes')
                .update(updates)
                .eq('id', id)
                .select()
                .maybeSingle();

            if (error) throw error;
            if (!data) return res.status(404).json({ success: false, error: 'Process not found' });

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
            // Phase 81: Scope overview counts to org
            const orgId = req.verifiedOrgId;
            let deptQuery = supabase.from('departments').select('*', { count: 'exact', head: true }).eq('is_active', true);
            if (orgId) deptQuery = deptQuery.eq('org_id', orgId);

            // For roles, okrs, processes: scope via department_ids
            let deptIds = [];
            if (orgId) {
                deptIds = await getOrgDepartmentIds(orgId);
            }

            let roleQuery = supabase.from('roles').select('*', { count: 'exact', head: true }).eq('is_active', true);
            let okrQuery = supabase.from('okrs').select('*', { count: 'exact', head: true }).eq('status', 'active');
            let processQuery = supabase.from('processes').select('*', { count: 'exact', head: true }).eq('status', 'active');

            if (orgId && deptIds.length > 0) {
                roleQuery = roleQuery.in('department_id', deptIds);
                okrQuery = okrQuery.in('department_id', deptIds);
                processQuery = processQuery.in('department_id', deptIds);
            } else if (orgId && deptIds.length === 0) {
                // Org has no departments — return zeros
                return res.json({
                    success: true,
                    data: { departments: 0, roles: 0, active_okrs: 0, active_processes: 0 }
                });
            }

            const [
                { count: deptCount },
                { count: roleCount },
                { count: okrCount },
                { count: processCount }
            ] = await Promise.all([deptQuery, roleQuery, okrQuery, processQuery]);

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
     * Seed default departments (for new users/clients)
     * Creates shared departments with is_seed=true and user_id=null
     */
    router.post('/seed-defaults', async (req, res) => {
        try {
            const defaultDepartments = [
                { name: 'Executive', description: 'Executive leadership and strategy', icon: 'crown', color: '#8b5cf6', sort_order: 1 },
                { name: 'Finance', description: 'Financial operations and planning', icon: 'banknote', color: '#10b981', sort_order: 2 },
                { name: 'Operations', description: 'Business operations and logistics', icon: 'settings', color: '#6366f1', sort_order: 3 },
                { name: 'Sales', description: 'Sales and revenue generation', icon: 'trending-up', color: '#f59e0b', sort_order: 4 },
                { name: 'Marketing', description: 'Marketing and brand management', icon: 'megaphone', color: '#ec4899', sort_order: 5 },
                { name: 'Production', description: 'Product development and delivery', icon: 'package', color: '#3b82f6', sort_order: 6 },
                { name: 'Service', description: 'Customer service and support', icon: 'headphones', color: '#14b8a6', sort_order: 7 },
                { name: 'Stakeholder Relations', description: 'External stakeholder management', icon: 'users', color: '#8b5cf6', sort_order: 8 },
                { name: 'HR', description: 'Human resources and talent management', icon: 'user-check', color: '#f97316', sort_order: 9 }
            ];

            // Check if departments already exist
            const { data: existing } = await supabase
                .from('departments')
                .select('name')
                .in('name', defaultDepartments.map(d => d.name));

            const existingNames = new Set((existing || []).map(d => d.name));
            const newDepartments = defaultDepartments.filter(d => !existingNames.has(d.name));

            if (newDepartments.length === 0) {
                return res.json({
                    success: true,
                    message: 'All default departments already exist',
                    data: []
                });
            }

            // Phase 81: Attach org_id so seeded departments belong to the requesting org
            const orgId = req.verifiedOrgId;

            // Create departments with is_seed=true and user_id=null (shared/system departments)
            const departmentsWithIds = newDepartments.map(dept => ({
                ...dept,
                id: uuidv4(),
                user_id: null,  // Null for shared/seeded departments
                org_id: orgId || null,  // Phase 81: Associate with requesting org
                is_seed: true,  // Mark as system-seeded
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
    // OKR STRATEGIC LINKS ENDPOINTS (S2E Integration)
    // ============================================================================

    /**
     * GET /api/parthenon/okrs/:id/strategic-links
     * Get strategic links for an OKR
     */
    router.get('/okrs/:id/strategic-links', async (req, res) => {
        try {
            const { id } = req.params;

            const { data: links, error } = await supabase
                .from('okr_strategic_links')
                .select(`
                    id,
                    link_type,
                    is_primary,
                    alignment_score,
                    contribution_description,
                    created_at,
                    bsc_objectives (
                        id,
                        name,
                        description,
                        bsc_perspectives (
                            id,
                            name,
                            perspective_type,
                            color
                        )
                    )
                `)
                .eq('okr_id', id)
                .order('is_primary', { ascending: false });

            if (error) throw error;

            // Transform for cleaner response
            const formattedLinks = (links || []).map(link => ({
                id: link.id,
                objective_id: link.bsc_objectives?.id,
                objective_name: link.bsc_objectives?.name,
                objective_description: link.bsc_objectives?.description,
                perspective_id: link.bsc_objectives?.bsc_perspectives?.id,
                perspective_name: link.bsc_objectives?.bsc_perspectives?.name,
                perspective_type: link.bsc_objectives?.bsc_perspectives?.perspective_type,
                perspective_color: link.bsc_objectives?.bsc_perspectives?.color,
                link_type: link.link_type,
                is_primary: link.is_primary,
                alignment_score: link.alignment_score,
                contribution_description: link.contribution_description,
                created_at: link.created_at
            }));

            res.json({
                success: true,
                data: formattedLinks
            });

        } catch (error) {
            console.error('Error getting OKR strategic links:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/parthenon/okrs/:id/strategic-links
     * Create strategic link for an OKR
     */
    router.post('/okrs/:id/strategic-links', async (req, res) => {
        try {
            const { id } = req.params;
            const userId = getUserId(req);
            const {
                bsc_objective_id,
                link_type = 'supports',
                contribution_description,
                is_primary = false,
                alignment_score = 100
            } = req.body;

            if (!bsc_objective_id) {
                return res.status(400).json({
                    success: false,
                    error: 'bsc_objective_id is required'
                });
            }

            // If setting as primary, unset other primary links for this OKR
            if (is_primary) {
                await supabase
                    .from('okr_strategic_links')
                    .update({ is_primary: false })
                    .eq('okr_id', id);
            }

            const { data, error } = await supabase
                .from('okr_strategic_links')
                .insert({
                    user_id: userId,
                    okr_id: id,
                    bsc_objective_id,
                    link_type,
                    contribution_description,
                    is_primary,
                    alignment_score
                })
                .select(`
                    id,
                    link_type,
                    is_primary,
                    alignment_score,
                    contribution_description,
                    bsc_objectives (
                        id,
                        name,
                        bsc_perspectives (
                            id,
                            name,
                            perspective_type,
                            color
                        )
                    )
                `)
                .single();

            if (error) throw error;

            // Format response
            const formattedLink = {
                id: data.id,
                objective_id: data.bsc_objectives?.id,
                objective_name: data.bsc_objectives?.name,
                perspective_id: data.bsc_objectives?.bsc_perspectives?.id,
                perspective_name: data.bsc_objectives?.bsc_perspectives?.name,
                perspective_type: data.bsc_objectives?.bsc_perspectives?.perspective_type,
                perspective_color: data.bsc_objectives?.bsc_perspectives?.color,
                link_type: data.link_type,
                is_primary: data.is_primary,
                alignment_score: data.alignment_score,
                contribution_description: data.contribution_description
            };

            res.status(201).json({
                success: true,
                data: formattedLink
            });

        } catch (error) {
            console.error('Error creating OKR strategic link:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/parthenon/okrs/:okrId/strategic-links/:linkId
     * Update a strategic link
     */
    router.put('/okrs/:okrId/strategic-links/:linkId', async (req, res) => {
        try {
            const { okrId, linkId } = req.params;
            const { link_type, contribution_description, is_primary, alignment_score } = req.body;

            // If setting as primary, unset other primary links for this OKR
            if (is_primary) {
                await supabase
                    .from('okr_strategic_links')
                    .update({ is_primary: false })
                    .eq('okr_id', okrId)
                    .neq('id', linkId);
            }

            const updateData = {};
            if (link_type !== undefined) updateData.link_type = link_type;
            if (contribution_description !== undefined) updateData.contribution_description = contribution_description;
            if (is_primary !== undefined) updateData.is_primary = is_primary;
            if (alignment_score !== undefined) updateData.alignment_score = alignment_score;

            const { data, error } = await supabase
                .from('okr_strategic_links')
                .update(updateData)
                .eq('id', linkId)
                .eq('okr_id', okrId)
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error updating OKR strategic link:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/parthenon/okrs/:okrId/strategic-links/:linkId
     * Delete a strategic link
     */
    router.delete('/okrs/:okrId/strategic-links/:linkId', async (req, res) => {
        try {
            const { okrId, linkId } = req.params;

            const { error } = await supabase
                .from('okr_strategic_links')
                .delete()
                .eq('id', linkId)
                .eq('okr_id', okrId);

            if (error) throw error;

            res.json({
                success: true,
                message: 'Strategic link removed'
            });

        } catch (error) {
            console.error('Error deleting OKR strategic link:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/parthenon/alignment-summary
     * Get strategic alignment summary for all OKRs
     */
    router.get('/alignment-summary', async (req, res) => {
        try {
            // Get all OKRs
            const { data: okrs, error: okrError } = await supabase
                .from('okrs')
                .select('id, title, status')
                .in('status', ['active', 'draft']);

            if (okrError) throw okrError;

            // Get all strategic links
            const { data: links, error: linkError } = await supabase
                .from('okr_strategic_links')
                .select('okr_id, bsc_objectives(bsc_perspectives(perspective_type))');

            if (linkError) throw linkError;

            // Calculate stats
            const totalOKRs = okrs?.length || 0;
            const linkedOKRIds = new Set((links || []).map(l => l.okr_id));
            const linkedCount = linkedOKRIds.size;
            const unlinkedCount = totalOKRs - linkedCount;

            // Count by perspective
            const byPerspective = {
                financial: 0,
                customer: 0,
                internal_process: 0,
                learning_growth: 0
            };

            (links || []).forEach(link => {
                const perspType = link.bsc_objectives?.bsc_perspectives?.perspective_type;
                if (perspType && byPerspective.hasOwnProperty(perspType)) {
                    byPerspective[perspType]++;
                }
            });

            // Get unlinked OKRs
            const unlinkedOKRs = (okrs || []).filter(okr => !linkedOKRIds.has(okr.id));

            res.json({
                success: true,
                data: {
                    total_okrs: totalOKRs,
                    linked: linkedCount,
                    unlinked: unlinkedCount,
                    alignment_rate: totalOKRs > 0 ? Math.round((linkedCount / totalOKRs) * 100) : 0,
                    by_perspective: byPerspective,
                    unlinked_okrs: unlinkedOKRs.slice(0, 10) // Limit to first 10
                }
            });

        } catch (error) {
            console.error('Error getting alignment summary:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/parthenon/objectives-for-linking
     * Get all BSC objectives available for linking (used in UI dropdown)
     */
    router.get('/objectives-for-linking', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('bsc_objectives')
                .select(`
                    id,
                    name,
                    description,
                    status,
                    bsc_perspectives (
                        id,
                        name,
                        perspective_type,
                        color
                    )
                `)
                .eq('status', 'active')
                .order('name');

            if (error) throw error;

            // Group by perspective for easier UI consumption
            const grouped = {};
            (data || []).forEach(obj => {
                const perspType = obj.bsc_perspectives?.perspective_type || 'other';
                if (!grouped[perspType]) {
                    grouped[perspType] = {
                        perspective_name: obj.bsc_perspectives?.name || 'Other',
                        perspective_color: obj.bsc_perspectives?.color || '#666',
                        objectives: []
                    };
                }
                grouped[perspType].objectives.push({
                    id: obj.id,
                    name: obj.name,
                    description: obj.description
                });
            });

            res.json({
                success: true,
                data: {
                    all: data || [],
                    grouped
                }
            });

        } catch (error) {
            console.error('Error getting objectives for linking:', error);
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
