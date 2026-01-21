/**
 * Users API Routes - Insight 360
 * Admin endpoints for user management
 * Version: 1.0.0
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

/**
 * GET /api/users
 * List all users (admin only)
 */
router.get('/', async (req, res) => {
    try {
        const { limit = 100, offset = 0, department_id, business_role, search } = req.query;

        let query = supabase
            .from('users')
            .select(`
                id,
                email,
                display_name,
                business_role,
                department_id,
                created_at
            `)
            .order('display_name', { ascending: true });

        // Apply filters
        if (department_id) {
            query = query.eq('department_id', department_id);
        }

        if (business_role) {
            query = query.eq('business_role', business_role);
        }

        if (search) {
            query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
        }

        // Apply pagination
        query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch users: ${error.message}`);
        }

        // Get department info separately to avoid join issues
        const deptIds = [...new Set((data || []).map(u => u.department_id).filter(Boolean))];
        let departments = [];

        if (deptIds.length > 0) {
            const { data: deptData } = await supabase
                .from('departments')
                .select('id, name')
                .in('id', deptIds);
            departments = deptData || [];
        }

        const deptMap = new Map(departments.map(d => [d.id, d]));

        // Merge department info
        const usersWithDepts = (data || []).map(user => ({
            ...user,
            departments: user.department_id ? deptMap.get(user.department_id) : null
        }));

        res.json({
            success: true,
            data: usersWithDepts,
            count: usersWithDepts.length
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/users/:id
 * Get a single user
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: user, error } = await supabase
            .from('users')
            .select(`
                id,
                email,
                display_name,
                business_role,
                department_id,
                created_at
            `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            throw error;
        }

        // Get department info
        if (user.department_id) {
            const { data: dept } = await supabase
                .from('departments')
                .select('id, name')
                .eq('id', user.department_id)
                .single();
            user.departments = dept;
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/users/:id
 * Update a user (admin only)
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { display_name, business_role, department_id } = req.body;

        const updates = {};
        if (display_name !== undefined) updates.display_name = display_name;
        if (business_role !== undefined) updates.business_role = business_role;
        if (department_id !== undefined) updates.department_id = department_id;

        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update user: ${error.message}`);
        }

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
