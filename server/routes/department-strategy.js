/**
 * Department Strategy API Routes
 * Manages department objectives, key results, and strategy notes
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// ============================================================================
// DEPARTMENT OBJECTIVES
// ============================================================================

/**
 * GET /api/department-strategy/objectives
 * List objectives for a department (or all if admin)
 */
router.get('/objectives', async (req, res) => {
    try {
        const { department_id, status, include_key_results } = req.query;

        let query = supabase
            .from('department_objectives')
            .select(`
                *,
                departments (id, name, icon, color),
                owner:users!owner_id (id, email, display_name),
                parent_objective:bsc_objectives (id, objective_name),
                key_results:department_key_results (*)
            `)
            .order('priority', { ascending: true })
            .order('created_at', { ascending: false });

        if (department_id) {
            query = query.eq('department_id', department_id);
        }

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching department objectives:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/department-strategy/objectives/:id
 * Get a single objective with key results
 */
router.get('/objectives/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('department_objectives')
            .select(`
                *,
                departments (id, name, icon, color),
                owner:users!owner_id (id, email, display_name),
                created_by_user:users!created_by (id, email, display_name),
                parent_objective:bsc_objectives (id, objective_name, perspective),
                key_results:department_key_results (
                    *,
                    owner:users!owner_id (id, email, display_name)
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching objective:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/department-strategy/objectives
 * Create a new department objective
 */
router.post('/objectives', async (req, res) => {
    try {
        const {
            department_id,
            title,
            description,
            category,
            owner_id,
            parent_company_objective_id,
            target_date,
            priority,
            created_by
        } = req.body;

        if (!department_id || !title) {
            return res.status(400).json({
                success: false,
                error: 'department_id and title are required'
            });
        }

        const { data, error } = await supabase
            .from('department_objectives')
            .insert({
                department_id,
                title,
                description,
                category: category || 'strategic',
                owner_id,
                parent_company_objective_id,
                target_date,
                priority: priority || 3,
                status: 'draft',
                created_by
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error creating objective:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/department-strategy/objectives/:id
 * Update a department objective
 */
router.put('/objectives/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Remove fields that shouldn't be updated directly
        delete updates.id;
        delete updates.created_at;
        delete updates.created_by;

        const { data, error } = await supabase
            .from('department_objectives')
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
        console.error('Error updating objective:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/department-strategy/objectives/:id
 * Delete a department objective
 */
router.delete('/objectives/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('department_objectives')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Objective deleted'
        });
    } catch (error) {
        console.error('Error deleting objective:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// KEY RESULTS
// ============================================================================

/**
 * GET /api/department-strategy/key-results
 * List key results (optionally filtered by objective)
 */
router.get('/key-results', async (req, res) => {
    try {
        const { objective_id, owner_id, status } = req.query;

        let query = supabase
            .from('department_key_results')
            .select(`
                *,
                objective:department_objectives (
                    id, title, department_id,
                    departments (id, name)
                ),
                owner:users!owner_id (id, email, display_name)
            `)
            .order('created_at', { ascending: false });

        if (objective_id) {
            query = query.eq('objective_id', objective_id);
        }

        if (owner_id) {
            query = query.eq('owner_id', owner_id);
        }

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching key results:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/department-strategy/key-results
 * Create a new key result
 */
router.post('/key-results', async (req, res) => {
    try {
        const {
            objective_id,
            title,
            description,
            metric_type,
            target_value,
            unit,
            owner_id,
            target_date
        } = req.body;

        if (!objective_id || !title) {
            return res.status(400).json({
                success: false,
                error: 'objective_id and title are required'
            });
        }

        const { data, error } = await supabase
            .from('department_key_results')
            .insert({
                objective_id,
                title,
                description,
                metric_type: metric_type || 'number',
                target_value,
                current_value: 0,
                unit,
                owner_id,
                target_date,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error creating key result:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/department-strategy/key-results/:id
 * Update a key result
 */
router.put('/key-results/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        delete updates.id;
        delete updates.created_at;

        const { data, error } = await supabase
            .from('department_key_results')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Auto-update status based on progress
        if (updates.current_value !== undefined && data.target_value) {
            const progress = (data.current_value / data.target_value) * 100;
            let newStatus = 'pending';
            if (progress >= 100) newStatus = 'completed';
            else if (progress >= 70) newStatus = 'on_track';
            else if (progress >= 30) newStatus = 'at_risk';
            else if (progress > 0) newStatus = 'behind';

            if (newStatus !== data.status) {
                await supabase
                    .from('department_key_results')
                    .update({ status: newStatus })
                    .eq('id', id);
                data.status = newStatus;
            }
        }

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error updating key result:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/department-strategy/key-results/:id
 * Delete a key result
 */
router.delete('/key-results/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('department_key_results')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Key result deleted'
        });
    } catch (error) {
        console.error('Error deleting key result:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// STRATEGY NOTES
// ============================================================================

/**
 * GET /api/department-strategy/notes
 * List strategy notes for a department
 */
router.get('/notes', async (req, res) => {
    try {
        const { department_id, objective_id, note_type } = req.query;

        let query = supabase
            .from('department_strategy_notes')
            .select(`
                *,
                department:departments (id, name),
                objective:department_objectives (id, title),
                author:users!created_by (id, email, display_name)
            `)
            .order('created_at', { ascending: false });

        if (department_id) {
            query = query.eq('department_id', department_id);
        }

        if (objective_id) {
            query = query.eq('objective_id', objective_id);
        }

        if (note_type) {
            query = query.eq('note_type', note_type);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/department-strategy/notes
 * Create a strategy note
 */
router.post('/notes', async (req, res) => {
    try {
        const { department_id, objective_id, note_type, content, created_by } = req.body;

        if (!department_id || !content) {
            return res.status(400).json({
                success: false,
                error: 'department_id and content are required'
            });
        }

        const { data, error } = await supabase
            .from('department_strategy_notes')
            .insert({
                department_id,
                objective_id,
                note_type: note_type || 'update',
                content,
                created_by
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// SUMMARY VIEW
// ============================================================================

/**
 * GET /api/department-strategy/summary
 * Get strategy summary for all departments
 */
router.get('/summary', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('department_strategy_summary')
            .select('*');

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching strategy summary:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/department-strategy/summary/:departmentId
 * Get strategy summary for a specific department
 */
router.get('/summary/:departmentId', async (req, res) => {
    try {
        const { departmentId } = req.params;

        const { data, error } = await supabase
            .from('department_strategy_summary')
            .select('*')
            .eq('department_id', departmentId)
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching department summary:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
