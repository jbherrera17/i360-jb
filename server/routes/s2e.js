/**
 * INSIGHT 360 - Strategy-to-Execution (S2E) API Routes
 * Version: 1.0.0
 * Part of Strategize 120 Module
 *
 * Endpoints:
 *   - Strategic Foundations (vision, mission, themes)
 *   - BSC Perspectives
 *   - BSC Objectives
 *   - OKR Strategic Links
 *   - Key Result Indicators
 *   - Strategy Health Checks
 */

const express = require('express');

/**
 * S2E Routes Factory
 * @param {object} supabase - Supabase client instance
 * @returns {Router} Express router
 */
module.exports = function(supabase) {
    const router = express.Router();

    // Get user ID helper
    const getUserId = (req) => req.user?.id || process.env.DEV_USER_ID || null;

    // ============================================================================
    // STRATEGIC FOUNDATIONS ENDPOINTS
    // ============================================================================

    /**
     * GET /api/s2e/foundations
     * List all strategic foundations
     */
    router.get('/foundations', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('strategic_foundations')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error listing foundations:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/s2e/foundations/current
     * Get the current active strategic foundation with full context
     */
    router.get('/foundations/current', async (req, res) => {
        try {
            const { data: foundation, error: foundationError } = await supabase
                .from('strategic_foundations')
                .select('*')
                .eq('is_current', true)
                .single();

            if (foundationError && foundationError.code !== 'PGRST116') {
                throw foundationError;
            }

            if (!foundation) {
                return res.json({ success: true, data: null });
            }

            // Get related themes
            const { data: themes } = await supabase
                .from('strategic_themes')
                .select('*')
                .eq('foundation_id', foundation.id)
                .eq('is_active', true)
                .order('sort_order');

            // Get perspectives with objectives
            const { data: perspectives } = await supabase
                .from('bsc_perspectives')
                .select('*')
                .eq('foundation_id', foundation.id)
                .order('sort_order');

            // Get objectives for each perspective
            const perspectivesWithObjectives = await Promise.all(
                (perspectives || []).map(async (perspective) => {
                    const { data: objectives } = await supabase
                        .from('bsc_objectives')
                        .select('*, strategic_themes(name, color)')
                        .eq('perspective_id', perspective.id)
                        .order('sort_order');

                    return {
                        ...perspective,
                        objectives: objectives || []
                    };
                })
            );

            res.json({
                success: true,
                data: {
                    ...foundation,
                    themes: themes || [],
                    perspectives: perspectivesWithObjectives
                }
            });
        } catch (error) {
            console.error('Error getting current foundation:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/s2e/foundations/:id
     * Get single foundation
     */
    router.get('/foundations/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('strategic_foundations')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error getting foundation:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/s2e/foundations
     * Create new strategic foundation
     */
    router.post('/foundations', async (req, res) => {
        try {
            const userId = getUserId(req);
            const {
                vision,
                vision_horizon,
                mission,
                core_values,
                planning_period,
                period_start,
                period_end,
                status
            } = req.body;

            // If this is being set as current, unset any existing current
            if (req.body.is_current) {
                await supabase
                    .from('strategic_foundations')
                    .update({ is_current: false })
                    .eq('is_current', true);
            }

            const { data, error } = await supabase
                .from('strategic_foundations')
                .insert({
                    user_id: userId,
                    vision,
                    vision_horizon,
                    mission,
                    core_values: core_values || [],
                    planning_period,
                    period_start,
                    period_end,
                    status: status || 'draft',
                    is_current: req.body.is_current || false
                })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error creating foundation:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/s2e/foundations/:id
     * Update strategic foundation
     */
    router.put('/foundations/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // If setting as current, unset others first
            if (req.body.is_current) {
                await supabase
                    .from('strategic_foundations')
                    .update({ is_current: false })
                    .neq('id', id);
            }

            const { data, error } = await supabase
                .from('strategic_foundations')
                .update(req.body)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating foundation:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/s2e/foundations/:id
     * Delete strategic foundation
     */
    router.delete('/foundations/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('strategic_foundations')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting foundation:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // STRATEGIC THEMES ENDPOINTS
    // ============================================================================

    /**
     * GET /api/s2e/themes
     * List all strategic themes
     */
    router.get('/themes', async (req, res) => {
        try {
            const { foundation_id } = req.query;

            let query = supabase
                .from('strategic_themes')
                .select('*')
                .order('sort_order');

            if (foundation_id) {
                query = query.eq('foundation_id', foundation_id);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error listing themes:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/s2e/themes
     * Create strategic theme
     */
    router.post('/themes', async (req, res) => {
        try {
            const userId = getUserId(req);
            const { foundation_id, name, description, icon, color, rationale, sort_order } = req.body;

            if (!foundation_id || !name) {
                return res.status(400).json({
                    success: false,
                    error: 'foundation_id and name are required'
                });
            }

            const { data, error } = await supabase
                .from('strategic_themes')
                .insert({
                    user_id: userId,
                    foundation_id,
                    name,
                    description,
                    icon: icon || 'compass',
                    color: color || '#6366f1',
                    rationale,
                    sort_order: sort_order || 0
                })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error creating theme:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/s2e/themes/:id
     * Update strategic theme
     */
    router.put('/themes/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('strategic_themes')
                .update(req.body)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating theme:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/s2e/themes/:id
     * Delete strategic theme
     */
    router.delete('/themes/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('strategic_themes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting theme:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // BSC PERSPECTIVES ENDPOINTS
    // ============================================================================

    /**
     * GET /api/s2e/perspectives
     * List BSC perspectives
     */
    router.get('/perspectives', async (req, res) => {
        try {
            const { foundation_id } = req.query;

            let query = supabase
                .from('bsc_perspectives')
                .select('*')
                .order('sort_order');

            if (foundation_id) {
                query = query.eq('foundation_id', foundation_id);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error listing perspectives:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/s2e/perspectives
     * Create BSC perspective
     */
    router.post('/perspectives', async (req, res) => {
        try {
            const userId = getUserId(req);
            const {
                foundation_id,
                name,
                perspective_type,
                guiding_question,
                description,
                icon,
                color,
                sort_order
            } = req.body;

            if (!foundation_id || !name || !perspective_type) {
                return res.status(400).json({
                    success: false,
                    error: 'foundation_id, name, and perspective_type are required'
                });
            }

            const { data, error } = await supabase
                .from('bsc_perspectives')
                .insert({
                    user_id: userId,
                    foundation_id,
                    name,
                    perspective_type,
                    guiding_question,
                    description,
                    icon,
                    color,
                    sort_order: sort_order || 0
                })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error creating perspective:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/s2e/perspectives/:id
     * Update BSC perspective
     */
    router.put('/perspectives/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('bsc_perspectives')
                .update(req.body)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating perspective:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/s2e/perspectives/:id
     * Delete BSC perspective
     */
    router.delete('/perspectives/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('bsc_perspectives')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting perspective:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/s2e/perspectives/initialize
     * Initialize default 4 BSC perspectives for a foundation
     */
    router.post('/perspectives/initialize', async (req, res) => {
        try {
            const userId = getUserId(req);
            const { foundation_id } = req.body;

            if (!foundation_id) {
                return res.status(400).json({
                    success: false,
                    error: 'foundation_id is required'
                });
            }

            const defaultPerspectives = [
                {
                    name: 'Financial',
                    perspective_type: 'financial',
                    guiding_question: 'How must we perform financially to sustain the mission?',
                    icon: 'banknote',
                    color: '#10b981',
                    sort_order: 1
                },
                {
                    name: 'Customer & Stakeholder',
                    perspective_type: 'customer',
                    guiding_question: 'Who must trust us, and why?',
                    icon: 'users',
                    color: '#3b82f6',
                    sort_order: 2
                },
                {
                    name: 'Internal Processes',
                    perspective_type: 'internal_process',
                    guiding_question: 'What must we excel at operationally?',
                    icon: 'settings',
                    color: '#f59e0b',
                    sort_order: 3
                },
                {
                    name: 'Learning & Growth',
                    perspective_type: 'learning_growth',
                    guiding_question: 'What capabilities must we build next?',
                    icon: 'graduation-cap',
                    color: '#8b5cf6',
                    sort_order: 4
                }
            ];

            const perspectivesToInsert = defaultPerspectives.map(p => ({
                ...p,
                user_id: userId,
                foundation_id
            }));

            const { data, error } = await supabase
                .from('bsc_perspectives')
                .insert(perspectivesToInsert)
                .select();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error initializing perspectives:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // BSC OBJECTIVES ENDPOINTS
    // ============================================================================

    /**
     * GET /api/s2e/objectives
     * List BSC objectives
     */
    router.get('/objectives', async (req, res) => {
        try {
            const { perspective_id, theme_id } = req.query;

            let query = supabase
                .from('bsc_objectives')
                .select('*, bsc_perspectives(name, perspective_type), strategic_themes(name, color)')
                .order('sort_order');

            if (perspective_id) {
                query = query.eq('perspective_id', perspective_id);
            }
            if (theme_id) {
                query = query.eq('theme_id', theme_id);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error listing objectives:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/s2e/objectives/:id
     * Get single objective with linked OKRs
     */
    router.get('/objectives/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data: objective, error } = await supabase
                .from('bsc_objectives')
                .select('*, bsc_perspectives(name, perspective_type), strategic_themes(name, color)')
                .eq('id', id)
                .single();

            if (error) throw error;

            // Get linked OKRs
            const { data: links } = await supabase
                .from('okr_strategic_links')
                .select('*, okrs(*)')
                .eq('bsc_objective_id', id);

            res.json({
                success: true,
                data: {
                    ...objective,
                    linked_okrs: links || []
                }
            });
        } catch (error) {
            console.error('Error getting objective:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/s2e/objectives
     * Create BSC objective
     */
    router.post('/objectives', async (req, res) => {
        try {
            const userId = getUserId(req);
            const {
                perspective_id,
                name,
                description,
                theme_id,
                owner_role_id,
                status,
                sort_order
            } = req.body;

            if (!perspective_id || !name) {
                return res.status(400).json({
                    success: false,
                    error: 'perspective_id and name are required'
                });
            }

            const { data, error } = await supabase
                .from('bsc_objectives')
                .insert({
                    user_id: userId,
                    perspective_id,
                    name,
                    description,
                    theme_id,
                    owner_role_id,
                    status: status || 'draft',
                    sort_order: sort_order || 0
                })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error creating objective:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/s2e/objectives/:id
     * Update BSC objective
     */
    router.put('/objectives/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('bsc_objectives')
                .update(req.body)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating objective:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/s2e/objectives/:id
     * Delete BSC objective
     */
    router.delete('/objectives/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('bsc_objectives')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting objective:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // OKR STRATEGIC LINKS ENDPOINTS
    // ============================================================================

    /**
     * GET /api/s2e/okr-links
     * List OKR strategic links
     */
    router.get('/okr-links', async (req, res) => {
        try {
            const { okr_id, objective_id } = req.query;

            let query = supabase
                .from('okr_strategic_links')
                .select('*, okrs(title, progress, status), bsc_objectives(name)')
                .order('created_at', { ascending: false });

            if (okr_id) {
                query = query.eq('okr_id', okr_id);
            }
            if (objective_id) {
                query = query.eq('bsc_objective_id', objective_id);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error listing OKR links:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/s2e/okr-links
     * Create OKR strategic link
     */
    router.post('/okr-links', async (req, res) => {
        try {
            const userId = getUserId(req);
            const {
                okr_id,
                bsc_objective_id,
                link_type,
                contribution_description,
                is_primary,
                alignment_score
            } = req.body;

            if (!okr_id || !bsc_objective_id) {
                return res.status(400).json({
                    success: false,
                    error: 'okr_id and bsc_objective_id are required'
                });
            }

            // If setting as primary, unset other primary links for this OKR
            if (is_primary) {
                await supabase
                    .from('okr_strategic_links')
                    .update({ is_primary: false })
                    .eq('okr_id', okr_id);
            }

            const { data, error } = await supabase
                .from('okr_strategic_links')
                .insert({
                    user_id: userId,
                    okr_id,
                    bsc_objective_id,
                    link_type: link_type || 'supports',
                    contribution_description,
                    is_primary: is_primary || false,
                    alignment_score: alignment_score || 100
                })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error creating OKR link:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/s2e/okr-links/:id
     * Delete OKR strategic link
     */
    router.delete('/okr-links/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('okr_strategic_links')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting OKR link:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // KEY RESULT INDICATORS ENDPOINTS
    // ============================================================================

    /**
     * GET /api/s2e/indicators
     * List key result indicators
     */
    router.get('/indicators', async (req, res) => {
        try {
            const { okr_id, indicator_type } = req.query;

            let query = supabase
                .from('key_result_indicators')
                .select('*, okrs(title)')
                .order('okr_id', { ascending: true })
                .order('key_result_index', { ascending: true });

            if (okr_id) {
                query = query.eq('okr_id', okr_id);
            }
            if (indicator_type) {
                query = query.eq('indicator_type', indicator_type);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error listing indicators:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/s2e/indicators
     * Create/update key result indicator classification
     */
    router.post('/indicators', async (req, res) => {
        try {
            const userId = getUserId(req);
            const {
                okr_id,
                key_result_index,
                indicator_type,
                rationale,
                measurement_frequency,
                data_source
            } = req.body;

            if (!okr_id || key_result_index === undefined || !indicator_type) {
                return res.status(400).json({
                    success: false,
                    error: 'okr_id, key_result_index, and indicator_type are required'
                });
            }

            // Upsert based on okr_id + key_result_index
            const { data, error } = await supabase
                .from('key_result_indicators')
                .upsert({
                    user_id: userId,
                    okr_id,
                    key_result_index,
                    indicator_type,
                    rationale,
                    measurement_frequency: measurement_frequency || 'monthly',
                    data_source
                }, {
                    onConflict: 'okr_id,key_result_index'
                })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error creating indicator:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/s2e/indicators/:id
     * Delete key result indicator
     */
    router.delete('/indicators/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('key_result_indicators')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting indicator:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // STRATEGY HEALTH CHECKS ENDPOINTS
    // ============================================================================

    /**
     * GET /api/s2e/health-checks
     * List strategy health checks
     */
    router.get('/health-checks', async (req, res) => {
        try {
            const { foundation_id, check_type, limit: queryLimit } = req.query;

            let query = supabase
                .from('strategy_health_checks')
                .select('*')
                .order('check_date', { ascending: false });

            if (foundation_id) {
                query = query.eq('foundation_id', foundation_id);
            }
            if (check_type) {
                query = query.eq('check_type', check_type);
            }
            if (queryLimit) {
                query = query.limit(parseInt(queryLimit));
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error listing health checks:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/s2e/health-checks
     * Create strategy health check
     */
    router.post('/health-checks', async (req, res) => {
        try {
            const userId = getUserId(req);
            const {
                foundation_id,
                check_date,
                check_type,
                alignment_score,
                execution_score,
                learning_score,
                observations,
                recommendations,
                notes,
                status
            } = req.body;

            if (!foundation_id || !check_type) {
                return res.status(400).json({
                    success: false,
                    error: 'foundation_id and check_type are required'
                });
            }

            const { data, error } = await supabase
                .from('strategy_health_checks')
                .insert({
                    user_id: userId,
                    foundation_id,
                    check_date: check_date || new Date().toISOString().split('T')[0],
                    check_type,
                    alignment_score,
                    execution_score,
                    learning_score,
                    observations: observations || [],
                    recommendations: recommendations || [],
                    notes,
                    status: status || 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error creating health check:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/s2e/health-checks/:id
     * Update strategy health check
     */
    router.put('/health-checks/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // If completing, set completed_at
            if (req.body.status === 'completed' && !req.body.completed_at) {
                req.body.completed_at = new Date().toISOString();
            }

            const { data, error } = await supabase
                .from('strategy_health_checks')
                .update(req.body)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating health check:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/s2e/health-checks/:id
     * Delete strategy health check
     */
    router.delete('/health-checks/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('strategy_health_checks')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting health check:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // STRATEGY MAP / OVERVIEW ENDPOINTS
    // ============================================================================

    /**
     * GET /api/s2e/strategy-map
     * Get full strategy map visualization data
     */
    router.get('/strategy-map', async (req, res) => {
        try {
            // Get current foundation
            const { data: foundation } = await supabase
                .from('strategic_foundations')
                .select('*')
                .eq('is_current', true)
                .single();

            if (!foundation) {
                return res.json({ success: true, data: null });
            }

            // Get themes
            const { data: themes } = await supabase
                .from('strategic_themes')
                .select('*')
                .eq('foundation_id', foundation.id)
                .eq('is_active', true)
                .order('sort_order');

            // Get perspectives with objectives
            const { data: perspectives } = await supabase
                .from('bsc_perspectives')
                .select('*')
                .eq('foundation_id', foundation.id)
                .order('sort_order');

            const perspectivesWithData = await Promise.all(
                (perspectives || []).map(async (perspective) => {
                    const { data: objectives } = await supabase
                        .from('bsc_objectives')
                        .select('*')
                        .eq('perspective_id', perspective.id)
                        .order('sort_order');

                    // Get linked OKRs for each objective
                    const objectivesWithOKRs = await Promise.all(
                        (objectives || []).map(async (obj) => {
                            const { data: links } = await supabase
                                .from('okr_strategic_links')
                                .select('*, okrs(id, title, progress, status, period)')
                                .eq('bsc_objective_id', obj.id);

                            const linkedOKRs = (links || []).map(l => ({
                                ...l.okrs,
                                link_type: l.link_type,
                                is_primary: l.is_primary
                            }));

                            // Calculate average progress
                            const avgProgress = linkedOKRs.length > 0
                                ? Math.round(linkedOKRs.reduce((sum, o) => sum + (o.progress || 0), 0) / linkedOKRs.length)
                                : null;

                            return {
                                ...obj,
                                linked_okrs: linkedOKRs,
                                okr_count: linkedOKRs.length,
                                avg_progress: avgProgress
                            };
                        })
                    );

                    return {
                        ...perspective,
                        objectives: objectivesWithOKRs
                    };
                })
            );

            res.json({
                success: true,
                data: {
                    foundation,
                    themes: themes || [],
                    perspectives: perspectivesWithData
                }
            });
        } catch (error) {
            console.error('Error getting strategy map:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/s2e/alignment-report
     * Get OKR alignment report
     */
    router.get('/alignment-report', async (req, res) => {
        try {
            // Get all OKRs
            const { data: okrs } = await supabase
                .from('okrs')
                .select('*, departments(name)')
                .order('created_at', { ascending: false });

            // Get all strategic links
            const { data: links } = await supabase
                .from('okr_strategic_links')
                .select('*, bsc_objectives(name, bsc_perspectives(perspective_type))');

            // Get all indicators
            const { data: indicators } = await supabase
                .from('key_result_indicators')
                .select('*');

            // Build alignment report
            const report = (okrs || []).map(okr => {
                const okrLinks = (links || []).filter(l => l.okr_id === okr.id);
                const okrIndicators = (indicators || []).filter(i => i.okr_id === okr.id);

                const leadingCount = okrIndicators.filter(i => i.indicator_type === 'leading').length;
                const laggingCount = okrIndicators.filter(i => i.indicator_type === 'lagging').length;

                return {
                    okr_id: okr.id,
                    title: okr.title,
                    scope: okr.scope,
                    period: okr.period,
                    progress: okr.progress,
                    status: okr.status,
                    department: okr.departments?.name,
                    is_strategically_linked: okrLinks.length > 0,
                    linked_objectives: okrLinks.map(l => ({
                        name: l.bsc_objectives?.name,
                        perspective: l.bsc_objectives?.bsc_perspectives?.perspective_type,
                        link_type: l.link_type,
                        is_primary: l.is_primary
                    })),
                    indicator_balance: {
                        leading: leadingCount,
                        lagging: laggingCount,
                        total: leadingCount + laggingCount
                    }
                };
            });

            // Calculate summary stats
            const linkedCount = report.filter(r => r.is_strategically_linked).length;
            const unlinkedCount = report.filter(r => !r.is_strategically_linked).length;

            res.json({
                success: true,
                data: {
                    summary: {
                        total_okrs: report.length,
                        linked: linkedCount,
                        unlinked: unlinkedCount,
                        alignment_rate: report.length > 0
                            ? Math.round((linkedCount / report.length) * 100)
                            : 0
                    },
                    okrs: report
                }
            });
        } catch (error) {
            console.error('Error getting alignment report:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};
