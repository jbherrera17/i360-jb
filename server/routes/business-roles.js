/**
 * Business Roles API Routes
 *
 * Manages the two-tier role system:
 * - Business role levels (executive, director, manager, supervisor, ic)
 * - Default permissions per role
 * - User-specific permission overrides
 */

const express = require('express');

module.exports = function(supabase) {
const router = express.Router();

// ============================================
// BUSINESS ROLE LEVELS
// ============================================

/**
 * GET /api/business-roles/levels
 * List all business role levels
 */
router.get('/levels', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('business_role_levels')
            .select('*')
            .order('level', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching business role levels:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/business-roles/defaults
 * Get default permissions for all business roles
 */
router.get('/defaults', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('business_role_defaults')
            .select(`
                *,
                business_role_levels (
                    id,
                    name,
                    level,
                    icon,
                    color
                )
            `)
            .order('business_role_levels(level)', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching business role defaults:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/business-roles/defaults/:roleId
 * Update default permissions for a business role (admin only)
 */
router.put('/defaults/:roleId', async (req, res) => {
    try {
        const { roleId } = req.params;
        const {
            can_view_own_dept,
            can_edit_own_dept,
            can_view_other_depts,
            can_edit_other_depts,
            can_view_company_strategy,
            can_edit_company_strategy,
            can_edit_dept_strategy,
            can_run_workflows,
            can_create_workflows,
            can_access_all_agents
        } = req.body;

        // Verify role exists
        const { data: roleExists, error: roleError } = await supabase
            .from('business_role_levels')
            .select('id')
            .eq('id', roleId)
            .single();

        if (roleError || !roleExists) {
            return res.status(404).json({
                success: false,
                error: 'Business role not found'
            });
        }

        // Update defaults
        const { data, error } = await supabase
            .from('business_role_defaults')
            .update({
                can_view_own_dept,
                can_edit_own_dept,
                can_view_other_depts,
                can_edit_other_depts,
                can_view_company_strategy,
                can_edit_company_strategy,
                can_edit_dept_strategy,
                can_run_workflows,
                can_create_workflows,
                can_access_all_agents,
                updated_at: new Date().toISOString()
            })
            .eq('business_role', roleId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error updating business role defaults:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// USER PERMISSIONS
// ============================================

/**
 * GET /api/business-roles/users/:userId/permissions
 * Get effective permissions for a user
 */
router.get('/users/:userId/permissions', async (req, res) => {
    try {
        const { userId } = req.params;

        // Use the view for effective permissions
        const { data, error } = await supabase
            .from('user_effective_permissions')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            // If view doesn't exist or user not found, calculate manually
            if (error.code === 'PGRST116' || error.code === '42P01') {
                return await getEffectivePermissionsManually(userId, res);
            }
            throw error;
        }

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Helper: Calculate effective permissions manually
 */
async function getEffectivePermissionsManually(userId, res) {
    try {
        // Get user with business role
        const { data: user, error: userError } = await supabase
            .from('users')
            .select(`
                id,
                email,
                display_name,
                business_role,
                department_id,
                departments (
                    id,
                    name
                )
            `)
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Get defaults for their business role
        const { data: defaults, error: defaultsError } = await supabase
            .from('business_role_defaults')
            .select('*')
            .eq('business_role', user.business_role || 'ic')
            .single();

        // Get user-specific overrides
        const { data: overrides } = await supabase
            .from('user_permission_overrides')
            .select('*')
            .eq('user_id', userId)
            .single();

        // Get role info
        const { data: roleInfo } = await supabase
            .from('business_role_levels')
            .select('*')
            .eq('id', user.business_role || 'ic')
            .single();

        // Merge permissions
        const effectivePermissions = {
            user_id: user.id,
            email: user.email,
            display_name: user.display_name,
            business_role: user.business_role || 'ic',
            business_role_name: roleInfo?.name || 'Individual Contributor',
            business_role_level: roleInfo?.level || 1,
            department_id: user.department_id,
            department_name: user.departments?.name,

            // Effective permissions
            can_view_own_dept: overrides?.can_view_own_dept ?? defaults?.can_view_own_dept ?? true,
            can_edit_own_dept: overrides?.can_edit_own_dept ?? defaults?.can_edit_own_dept ?? false,
            can_view_other_depts: overrides?.can_view_other_depts ?? defaults?.can_view_other_depts ?? false,
            can_edit_other_depts: overrides?.can_edit_other_depts ?? defaults?.can_edit_other_depts ?? false,
            can_view_company_strategy: overrides?.can_view_company_strategy ?? defaults?.can_view_company_strategy ?? false,
            can_edit_company_strategy: overrides?.can_edit_company_strategy ?? defaults?.can_edit_company_strategy ?? false,
            can_edit_dept_strategy: overrides?.can_edit_dept_strategy ?? defaults?.can_edit_dept_strategy ?? false,
            can_run_workflows: overrides?.can_run_workflows ?? defaults?.can_run_workflows ?? true,
            can_create_workflows: overrides?.can_create_workflows ?? defaults?.can_create_workflows ?? false,
            can_access_all_agents: overrides?.can_access_all_agents ?? defaults?.can_access_all_agents ?? false,

            // Department overrides
            department_overrides: overrides?.department_overrides || {},

            // Override info
            override_reason: overrides?.override_reason,
            has_overrides: !!overrides
        };

        return res.json({
            success: true,
            data: effectivePermissions
        });
    } catch (error) {
        console.error('Error calculating permissions manually:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * PUT /api/business-roles/users/:userId/permissions
 * Set permission overrides for a user (admin only)
 */
router.put('/users/:userId/permissions', async (req, res) => {
    try {
        const { userId } = req.params;
        const {
            can_view_own_dept,
            can_edit_own_dept,
            can_view_other_depts,
            can_edit_other_depts,
            can_view_company_strategy,
            can_edit_company_strategy,
            can_edit_dept_strategy,
            can_run_workflows,
            can_create_workflows,
            can_access_all_agents,
            department_overrides,
            override_reason
        } = req.body;

        // Get admin user ID from request (should be set by auth middleware)
        const adminUserId = req.user?.id;

        // Verify user exists
        const { data: userExists, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .single();

        if (userError || !userExists) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Upsert permission overrides
        const { data, error } = await supabase
            .from('user_permission_overrides')
            .upsert({
                user_id: userId,
                can_view_own_dept,
                can_edit_own_dept,
                can_view_other_depts,
                can_edit_other_depts,
                can_view_company_strategy,
                can_edit_company_strategy,
                can_edit_dept_strategy,
                can_run_workflows,
                can_create_workflows,
                can_access_all_agents,
                department_overrides: department_overrides || {},
                override_reason,
                created_by: adminUserId,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error setting user permission overrides:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/business-roles/users/:userId/permissions
 * Remove all permission overrides for a user (revert to defaults)
 */
router.delete('/users/:userId/permissions', async (req, res) => {
    try {
        const { userId } = req.params;

        const { error } = await supabase
            .from('user_permission_overrides')
            .delete()
            .eq('user_id', userId);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Permission overrides removed, user will use default permissions'
        });
    } catch (error) {
        console.error('Error removing user permission overrides:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/business-roles/users/:userId/role
 * Update a user's business role (admin only)
 */
router.put('/users/:userId/role', async (req, res) => {
    try {
        const { userId } = req.params;
        const { business_role } = req.body;

        // Verify role exists
        const { data: roleExists, error: roleError } = await supabase
            .from('business_role_levels')
            .select('id')
            .eq('id', business_role)
            .single();

        if (roleError || !roleExists) {
            return res.status(400).json({
                success: false,
                error: 'Invalid business role'
            });
        }

        // Update user's business role
        const { data, error } = await supabase
            .from('users')
            .update({ business_role })
            .eq('id', userId)
            .select('id, email, display_name, business_role')
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error updating user business role:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// CURRENT USER
// ============================================

/**
 * GET /api/business-roles/me/permissions
 * Get current user's effective permissions
 */
router.get('/me/permissions', async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated'
            });
        }

        // Reuse the user permissions endpoint
        req.params.userId = userId;
        return await getEffectivePermissionsManually(userId, res);
    } catch (error) {
        console.error('Error fetching current user permissions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// DEPARTMENT ACCESS CHECK
// ============================================

/**
 * GET /api/business-roles/check-access/:departmentId
 * Check if current user has access to a department
 */
router.get('/check-access/:departmentId', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { departmentId } = req.params;
        const { action = 'view' } = req.query; // 'view' or 'edit'

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated'
            });
        }

        // Get user's effective permissions
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('department_id, business_role')
            .eq('id', userId)
            .single();

        if (userError) throw userError;

        const { data: defaults } = await supabase
            .from('business_role_defaults')
            .select('*')
            .eq('business_role', user.business_role || 'ic')
            .single();

        const { data: overrides } = await supabase
            .from('user_permission_overrides')
            .select('*')
            .eq('user_id', userId)
            .single();

        // Check if this is the user's own department
        const isOwnDept = user.department_id === departmentId;

        // Check department-specific overrides
        const deptOverrides = overrides?.department_overrides?.[departmentId];

        let hasAccess = false;

        if (action === 'view') {
            if (isOwnDept) {
                hasAccess = deptOverrides?.can_view ?? overrides?.can_view_own_dept ?? defaults?.can_view_own_dept ?? true;
            } else {
                hasAccess = deptOverrides?.can_view ?? overrides?.can_view_other_depts ?? defaults?.can_view_other_depts ?? false;
            }
        } else if (action === 'edit') {
            if (isOwnDept) {
                hasAccess = deptOverrides?.can_edit ?? overrides?.can_edit_own_dept ?? defaults?.can_edit_own_dept ?? false;
            } else {
                hasAccess = deptOverrides?.can_edit ?? overrides?.can_edit_other_depts ?? defaults?.can_edit_other_depts ?? false;
            }
        }

        res.json({
            success: true,
            data: {
                department_id: departmentId,
                action,
                has_access: hasAccess,
                is_own_department: isOwnDept
            }
        });
    } catch (error) {
        console.error('Error checking department access:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

return router;
};
