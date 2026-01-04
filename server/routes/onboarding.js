/**
 * Onboarding Routes
 * User onboarding state management
 *
 * Phase 11: Onboarding System
 *
 * Endpoints:
 *   - GET /api/onboarding/state - Get user's onboarding state
 *   - PUT /api/onboarding/state - Update onboarding state
 *   - POST /api/onboarding/complete - Mark onboarding as complete
 *   - POST /api/onboarding/skip - Skip onboarding
 *   - POST /api/onboarding/dismiss - Dismiss modal (resume later)
 */

const express = require('express');

/**
 * Onboarding Routes Factory
 * @param {object} supabase - Supabase client instance
 * @returns {Router} Express router
 */
module.exports = function(supabase) {
    const router = express.Router();

    // Get user ID from request (set by auth middleware or fallback)
    const getUserId = (req) => req.userId || req.user?.id || process.env.DEV_USER_ID || null;

    /**
     * GET /api/onboarding/state
     * Get current user's onboarding state
     */
    router.get('/state', async (req, res) => {
        try {
            const userId = getUserId(req);

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Try to get existing state
            let { data: state, error } = await supabase
                .from('onboarding_state')
                .select('*')
                .eq('user_id', userId)
                .single();

            // If not found, create new state
            if (error && error.code === 'PGRST116') {
                const { data: newState, error: createError } = await supabase
                    .from('onboarding_state')
                    .insert({
                        user_id: userId,
                        status: 'not_started',
                        current_step: 0
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                state = newState;
            } else if (error) {
                throw error;
            }

            res.json({
                success: true,
                data: state
            });
        } catch (error) {
            console.error('Error fetching onboarding state:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch onboarding state'
            });
        }
    });

    /**
     * PUT /api/onboarding/state
     * Update onboarding state (step progress, milestones)
     */
    router.put('/state', async (req, res) => {
        try {
            const userId = getUserId(req);

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const {
                current_step,
                completed_steps,
                profile_completed,
                tour_completed,
                first_workflow_completed,
                status
            } = req.body;

            // Build update object
            const updates = {
                updated_at: new Date().toISOString()
            };

            if (current_step !== undefined) updates.current_step = current_step;
            if (completed_steps !== undefined) updates.completed_steps = completed_steps;
            if (profile_completed !== undefined) updates.profile_completed = profile_completed;
            if (tour_completed !== undefined) updates.tour_completed = tour_completed;
            if (first_workflow_completed !== undefined) updates.first_workflow_completed = first_workflow_completed;

            if (status !== undefined) {
                updates.status = status;
                if (status === 'in_progress' && !updates.started_at) {
                    updates.started_at = new Date().toISOString();
                }
            }

            // Upsert: update if exists, create if not
            const { data, error } = await supabase
                .from('onboarding_state')
                .upsert({
                    user_id: userId,
                    ...updates
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
            console.error('Error updating onboarding state:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update onboarding state'
            });
        }
    });

    /**
     * POST /api/onboarding/complete
     * Mark onboarding as fully completed
     */
    router.post('/complete', async (req, res) => {
        try {
            const userId = getUserId(req);

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const { data, error } = await supabase
                .from('onboarding_state')
                .upsert({
                    user_id: userId,
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                })
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                message: 'Onboarding completed',
                data
            });
        } catch (error) {
            console.error('Error completing onboarding:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to complete onboarding'
            });
        }
    });

    /**
     * POST /api/onboarding/skip
     * Skip onboarding entirely
     */
    router.post('/skip', async (req, res) => {
        try {
            const userId = getUserId(req);

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const { data, error } = await supabase
                .from('onboarding_state')
                .upsert({
                    user_id: userId,
                    status: 'skipped',
                    completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                })
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                message: 'Onboarding skipped',
                data
            });
        } catch (error) {
            console.error('Error skipping onboarding:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to skip onboarding'
            });
        }
    });

    /**
     * POST /api/onboarding/dismiss
     * Dismiss modal temporarily (can resume later)
     */
    router.post('/dismiss', async (req, res) => {
        try {
            const userId = getUserId(req);

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const { data, error } = await supabase
                .from('onboarding_state')
                .upsert({
                    user_id: userId,
                    last_dismissed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                })
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                message: 'Onboarding dismissed',
                data
            });
        } catch (error) {
            console.error('Error dismissing onboarding:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to dismiss onboarding'
            });
        }
    });

    /**
     * POST /api/onboarding/reset
     * Reset onboarding state (for testing or re-onboarding)
     */
    router.post('/reset', async (req, res) => {
        try {
            const userId = getUserId(req);

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const { data, error } = await supabase
                .from('onboarding_state')
                .upsert({
                    user_id: userId,
                    status: 'not_started',
                    current_step: 0,
                    completed_steps: [],
                    profile_completed: false,
                    tour_completed: false,
                    first_workflow_completed: false,
                    started_at: null,
                    completed_at: null,
                    last_dismissed_at: null,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                })
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                message: 'Onboarding reset',
                data
            });
        } catch (error) {
            console.error('Error resetting onboarding:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to reset onboarding'
            });
        }
    });

    return router;
};
