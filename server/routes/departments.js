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

module.exports = router;
