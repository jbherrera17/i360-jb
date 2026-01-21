/**
 * Departments API Routes
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
 * GET /api/departments
 * List all departments
 */
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('departments')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/departments/:id
 * Get a single department
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('departments')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching department:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/departments/:id
 * Update a department (admin only)
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, icon, color, tagline, metrics, quick_prompts } = req.body;

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (icon !== undefined) updates.icon = icon;
        if (color !== undefined) updates.color = color;
        if (tagline !== undefined) updates.tagline = tagline;
        if (metrics !== undefined) updates.metrics = metrics;
        if (quick_prompts !== undefined) updates.quick_prompts = quick_prompts;

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
 * POST /api/departments
 * Create a new department (admin only)
 */
router.post('/', async (req, res) => {
    try {
        const { name, description, icon, color, tagline, metrics, quick_prompts, sort_order } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Department name is required'
            });
        }

        const { data, error } = await supabase
            .from('departments')
            .insert({
                name,
                description: description || '',
                icon: icon || 'folder',
                color: color || '#6366f1',
                tagline: tagline || '',
                metrics: metrics || [],
                quick_prompts: quick_prompts || [],
                sort_order: sort_order || 99
            })
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
 * DELETE /api/departments/:id
 * Delete a department (admin only)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('departments')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Department deleted'
        });
    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
