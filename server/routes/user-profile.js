/**
 * Insight 360 - User Profile API Routes
 * Phase 3.5: User Profile Enhancement
 *
 * Provides endpoints for user role assignments, responsibility selection,
 * and matched resources (agents/workflows by tags)
 */

const express = require('express');
const crypto = require('crypto');

module.exports = function(supabase) {
    const router = express.Router();

    /**
     * GET /api/user-profile/:id
     * Get user profile with roles, responsibilities, and matched resources
     */
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Get user basic info
            const { data: user, error: userError } = await supabase
                .from('users')
                .select(`
                    id, email, display_name, avatar_url, department_id, business_role,
                    manager_id,
                    department:department_id(id, name, icon, color),
                    manager:manager_id(id, email, display_name)
                `)
                .eq('id', id)
                .single();

            if (userError) throw userError;

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Get user's roles
            const { data: userRoles } = await supabase
                .from('user_roles')
                .select(`
                    is_primary,
                    assigned_at,
                    role:role_id(
                        id, name, description, role_level,
                        department:department_id(id, name, color)
                    )
                `)
                .eq('user_id', id);

            // Get user's responsibilities
            const { data: userResps } = await supabase
                .from('user_responsibilities')
                .select(`
                    responsibility:responsibility_id(
                        id, name, description,
                        parent:parent_id(id, name)
                    )
                `)
                .eq('user_id', id);

            // Get user's effective tags
            const { data: effectiveTags } = await supabase
                .from('user_effective_tags')
                .select('*')
                .eq('user_id', id);

            res.json({
                success: true,
                data: {
                    ...user,
                    roles: (userRoles || []).map(ur => ({
                        ...ur.role,
                        is_primary: ur.is_primary,
                        assigned_at: ur.assigned_at
                    })),
                    responsibilities: (userResps || []).map(ur => ur.responsibility),
                    effective_tags: effectiveTags || []
                }
            });
        } catch (error) {
            console.error('Error getting user profile:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/user-profile/:id/roles
     * Get user's assigned roles
     */
    router.get('/:id/roles', async (req, res) => {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('user_roles')
                .select(`
                    is_primary,
                    assigned_at,
                    role:role_id(
                        id, name, description, role_level,
                        department:department_id(id, name, icon, color)
                    )
                `)
                .eq('user_id', id);

            if (error) throw error;

            res.json({
                success: true,
                data: (data || []).map(ur => ({
                    ...ur.role,
                    is_primary: ur.is_primary,
                    assigned_at: ur.assigned_at
                }))
            });
        } catch (error) {
            console.error('Error getting user roles:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/user-profile/:id/roles
     * Assign role to user
     */
    router.post('/:id/roles', async (req, res) => {
        try {
            const { id } = req.params;
            const { role_id, is_primary = false } = req.body;

            if (!role_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Role ID is required'
                });
            }

            // If setting as primary, unset other primary roles
            if (is_primary) {
                await supabase
                    .from('user_roles')
                    .update({ is_primary: false })
                    .eq('user_id', id);
            }

            // Check if role already assigned
            const { data: existing } = await supabase
                .from('user_roles')
                .select('*')
                .eq('user_id', id)
                .eq('role_id', role_id)
                .single();

            if (existing) {
                // Update existing assignment
                const { data, error } = await supabase
                    .from('user_roles')
                    .update({ is_primary, assigned_at: new Date().toISOString() })
                    .eq('user_id', id)
                    .eq('role_id', role_id)
                    .select()
                    .single();

                if (error) throw error;
                return res.json({ success: true, data, message: 'Role assignment updated' });
            }

            // Create new assignment
            const { data, error } = await supabase
                .from('user_roles')
                .insert({
                    user_id: id,
                    role_id,
                    is_primary,
                    assigned_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            res.status(201).json({ success: true, data });
        } catch (error) {
            console.error('Error assigning role to user:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/user-profile/:id/roles/:roleId
     * Remove role from user
     */
    router.delete('/:id/roles/:roleId', async (req, res) => {
        try {
            const { id, roleId } = req.params;

            const { error } = await supabase
                .from('user_roles')
                .delete()
                .eq('user_id', id)
                .eq('role_id', roleId);

            if (error) throw error;

            res.json({ success: true, message: 'Role removed from user' });
        } catch (error) {
            console.error('Error removing role from user:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/user-profile/:id/roles
     * Update all user roles (replace)
     */
    router.put('/:id/roles', async (req, res) => {
        try {
            const { id } = req.params;
            const { role_ids = [], primary_role_id } = req.body;

            // Remove all existing roles
            await supabase
                .from('user_roles')
                .delete()
                .eq('user_id', id);

            // Add new roles
            if (role_ids.length > 0) {
                const roleAssignments = role_ids.map(role_id => ({
                    user_id: id,
                    role_id,
                    is_primary: role_id === primary_role_id,
                    assigned_at: new Date().toISOString()
                }));

                const { error } = await supabase
                    .from('user_roles')
                    .insert(roleAssignments);

                if (error) throw error;
            }

            // Return updated roles
            const { data: userRoles } = await supabase
                .from('user_roles')
                .select(`
                    is_primary,
                    role:role_id(id, name, description, role_level)
                `)
                .eq('user_id', id);

            res.json({
                success: true,
                data: (userRoles || []).map(ur => ({
                    ...ur.role,
                    is_primary: ur.is_primary
                }))
            });
        } catch (error) {
            console.error('Error updating user roles:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/user-profile/:id/responsibilities
     * Get user's selected responsibilities
     */
    router.get('/:id/responsibilities', async (req, res) => {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('user_responsibilities')
                .select(`
                    responsibility:responsibility_id(
                        id, name, description,
                        parent:parent_id(id, name)
                    )
                `)
                .eq('user_id', id);

            if (error) throw error;

            res.json({
                success: true,
                data: (data || []).map(ur => ur.responsibility)
            });
        } catch (error) {
            console.error('Error getting user responsibilities:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/user-profile/:id/responsibilities
     * Update user's responsibilities (replace)
     */
    router.put('/:id/responsibilities', async (req, res) => {
        try {
            const { id } = req.params;
            const { responsibility_ids = [] } = req.body;

            // Remove existing
            await supabase
                .from('user_responsibilities')
                .delete()
                .eq('user_id', id);

            // Add new
            if (responsibility_ids.length > 0) {
                const assignments = responsibility_ids.map(responsibility_id => ({
                    user_id: id,
                    responsibility_id
                }));

                const { error } = await supabase
                    .from('user_responsibilities')
                    .insert(assignments);

                if (error) throw error;
            }

            res.json({
                success: true,
                message: 'Responsibilities updated'
            });
        } catch (error) {
            console.error('Error updating user responsibilities:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/user-profile/:id/manager
     * Update user's manager
     */
    router.put('/:id/manager', async (req, res) => {
        try {
            const { id } = req.params;
            const { manager_id } = req.body;

            // Prevent self-assignment
            if (manager_id === id) {
                return res.status(400).json({
                    success: false,
                    error: 'User cannot be their own manager'
                });
            }

            const { data, error } = await supabase
                .from('users')
                .update({ manager_id: manager_id || null })
                .eq('id', id)
                .select('id, manager_id, manager:manager_id(id, email, display_name)')
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating manager:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/user-profile/:id/matched-resources
     * Get agents and workflows matched to user by their effective tags
     */
    router.get('/:id/matched-resources', async (req, res) => {
        try {
            const { id } = req.params;

            // Get matched agents from view
            const { data: agents, error: agentError } = await supabase
                .from('user_matched_agents')
                .select('*')
                .eq('user_id', id);

            if (agentError) throw agentError;

            // Get matched workflows from view
            const { data: workflows, error: workflowError } = await supabase
                .from('user_matched_workflows')
                .select('*')
                .eq('user_id', id);

            if (workflowError) throw workflowError;

            // Get effective tags
            const { data: tags } = await supabase
                .from('user_effective_tags')
                .select('*')
                .eq('user_id', id);

            res.json({
                success: true,
                data: {
                    agents: agents || [],
                    workflows: workflows || [],
                    tags: tags || [],
                    summary: {
                        agent_count: (agents || []).length,
                        workflow_count: (workflows || []).length,
                        tag_count: (tags || []).length
                    }
                }
            });
        } catch (error) {
            console.error('Error getting matched resources:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/user-profile/:id/direct-reports
     * Get users who report to this user
     */
    router.get('/:id/direct-reports', async (req, res) => {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('users')
                .select(`
                    id, email, display_name, avatar_url,
                    department:department_id(id, name, color)
                `)
                .eq('manager_id', id);

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error getting direct reports:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/user-profile/:id/available-roles
     * Get roles available for user to select (based on their department)
     */
    router.get('/:id/available-roles', async (req, res) => {
        try {
            const { id } = req.params;

            // Get user's department
            const { data: user } = await supabase
                .from('users')
                .select('department_id')
                .eq('id', id)
                .single();

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Get roles in user's department
            const { data: roles, error } = await supabase
                .from('department_roles')
                .select(`
                    id, name, description, role_level,
                    department:department_id(id, name, color)
                `)
                .eq('department_id', user.department_id)
                .eq('is_active', true)
                .order('sort_order');

            if (error) throw error;

            // Also get cross-department roles if any (system templates)
            const { data: systemRoles } = await supabase
                .from('department_roles')
                .select(`
                    id, name, description, role_level,
                    department:department_id(id, name, color)
                `)
                .eq('is_system_template', true)
                .eq('is_active', true)
                .neq('department_id', user.department_id);

            res.json({
                success: true,
                data: {
                    department_roles: roles || [],
                    other_roles: systemRoles || []
                }
            });
        } catch (error) {
            console.error('Error getting available roles:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/user-profile/:id/available-responsibilities
     * Get responsibilities available based on user's assigned roles
     */
    router.get('/:id/available-responsibilities', async (req, res) => {
        try {
            const { id } = req.params;

            // Get user's role IDs
            const { data: userRoles } = await supabase
                .from('user_roles')
                .select('role_id')
                .eq('user_id', id);

            const roleIds = (userRoles || []).map(ur => ur.role_id);

            if (roleIds.length === 0) {
                return res.json({ success: true, data: [] });
            }

            // Get responsibilities assigned to those roles
            const { data: roleResps } = await supabase
                .from('role_responsibilities')
                .select(`
                    responsibility:responsibility_id(
                        id, name, description,
                        parent:parent_id(id, name)
                    )
                `)
                .in('role_id', roleIds);

            const responsibilities = (roleResps || [])
                .map(rr => rr.responsibility)
                .filter((r, i, arr) => arr.findIndex(x => x.id === r.id) === i); // unique

            res.json({ success: true, data: responsibilities });
        } catch (error) {
            console.error('Error getting available responsibilities:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};
