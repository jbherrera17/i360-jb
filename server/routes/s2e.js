/**
 * INSIGHT 360 - Strategy-to-Execution (S2E) API Routes
 * Version: 2.1.0
 * Part of Strategize 120 Module
 *
 * Endpoints:
 *   - Strategic Foundations (vision, mission, themes)
 *   - BSC Perspectives
 *   - BSC Objectives
 *   - OKR Strategic Links
 *   - Key Result Indicators
 *   - Strategy Health Checks
 *   - Strategy Map & Alignment Reports
 *   - Cause-Effect Relationships
 *   - Health Check Generation & Scheduling
 *   - Briefing Integration (S2E summary for daily briefings)
 */

const express = require('express');
const s2eService = require('../services/s2eService');

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
            const userId = getUserId(req);
            const data = await s2eService.getCurrentFoundationWithHierarchy(userId);
            res.json({ success: true, data });
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

            // Validate
            const validation = s2eService.validateFoundation({ vision, mission, planning_period });
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: validation.errors.join(', ')
                });
            }

            // If this is being set as current, unset any existing current
            if (req.body.is_current) {
                await s2eService.setCurrentFoundation(userId, null);
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
            const userId = getUserId(req);

            // If setting as current, use service to atomically update
            if (req.body.is_current) {
                await s2eService.setCurrentFoundation(userId, id);
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

            // Validate
            const validation = s2eService.validateTheme({ foundation_id, name });
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: validation.errors.join(', ')
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

            // Validate
            const validation = s2eService.validatePerspective({ foundation_id, name, perspective_type });
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: validation.errors.join(', ')
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

            const data = await s2eService.initializeDefaultPerspectives(userId, foundation_id);
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

            // Get causal chain
            const causalChain = await s2eService.getObjectiveCausalChain(id);

            res.json({
                success: true,
                data: {
                    ...objective,
                    linked_okrs: links || [],
                    causal_chain: causalChain
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
                sort_order,
                causes,
                effects
            } = req.body;

            // Validate
            const validation = s2eService.validateObjective({ perspective_id, name });
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: validation.errors.join(', ')
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
                    sort_order: sort_order || 0,
                    causes: causes || [],
                    effects: effects || []
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
     * PUT /api/s2e/objectives/:id/causes
     * Update cause relationships for an objective
     */
    router.put('/objectives/:id/causes', async (req, res) => {
        try {
            const { id } = req.params;
            const { cause_ids } = req.body;

            const data = await s2eService.updateObjectiveCauses(id, cause_ids);
            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating objective causes:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/s2e/objectives/:id/effects
     * Update effect relationships for an objective
     */
    router.put('/objectives/:id/effects', async (req, res) => {
        try {
            const { id } = req.params;
            const { effect_ids } = req.body;

            const data = await s2eService.updateObjectiveEffects(id, effect_ids);
            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating objective effects:', error);
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
                .select('*, okrs(title, progress, status), bsc_objectives(name, bsc_perspectives(name, perspective_type))')
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

            // Validate
            const validation = s2eService.validateOKRLink({ okr_id, bsc_objective_id, link_type, alignment_score });
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: validation.errors.join(', ')
                });
            }

            // If setting as primary, use service to atomically update
            if (is_primary) {
                await s2eService.setPrimaryOKRLink(userId, okr_id, null);
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

            // If this was set as primary, update the link ID
            if (is_primary && data) {
                await s2eService.setPrimaryOKRLink(userId, okr_id, data.id);
            }

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error creating OKR link:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/s2e/okr-links/:id
     * Update OKR strategic link
     */
    router.put('/okr-links/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const userId = getUserId(req);

            // If setting as primary, handle atomically
            if (req.body.is_primary) {
                // Get the OKR ID for this link
                const { data: link } = await supabase
                    .from('okr_strategic_links')
                    .select('okr_id')
                    .eq('id', id)
                    .single();

                if (link) {
                    await s2eService.setPrimaryOKRLink(userId, link.okr_id, id);
                }
            }

            const { data, error } = await supabase
                .from('okr_strategic_links')
                .update(req.body)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating OKR link:', error);
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

            // Validate
            const validation = s2eService.validateIndicator({ okr_id, key_result_index, indicator_type });
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: validation.errors.join(', ')
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
     * GET /api/s2e/health-checks/latest
     * Get most recent health check with full context
     */
    router.get('/health-checks/latest', async (req, res) => {
        try {
            const { foundation_id } = req.query;

            let query = supabase
                .from('strategy_health_checks')
                .select('*, strategic_foundations(vision, mission, planning_period)')
                .order('check_date', { ascending: false })
                .limit(1);

            if (foundation_id) {
                query = query.eq('foundation_id', foundation_id);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({ success: true, data: data?.[0] || null });
        } catch (error) {
            console.error('Error getting latest health check:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/s2e/health-checks/trend
     * Get historical health check scores for trending
     */
    router.get('/health-checks/trend', async (req, res) => {
        try {
            const { foundation_id, limit: queryLimit = 12 } = req.query;

            let query = supabase
                .from('strategy_health_checks')
                .select('id, check_date, check_type, alignment_score, execution_score, learning_score, status')
                .order('check_date', { ascending: true })
                .limit(parseInt(queryLimit));

            if (foundation_id) {
                query = query.eq('foundation_id', foundation_id);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Calculate trend data
            const trendData = (data || []).map(check => ({
                ...check,
                overall_score: Math.round(
                    ((check.alignment_score || 0) + (check.execution_score || 0) + (check.learning_score || 0)) / 3
                )
            }));

            res.json({ success: true, data: trendData });
        } catch (error) {
            console.error('Error getting health check trend:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/s2e/health-checks
     * Create strategy health check (manual)
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

            // Validate
            const validation = s2eService.validateHealthCheck({ foundation_id, check_type, alignment_score, execution_score, learning_score });
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: validation.errors.join(', ')
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
     * POST /api/s2e/health-checks/generate
     * Generate automated health check with calculated scores
     */
    router.post('/health-checks/generate', async (req, res) => {
        try {
            const userId = getUserId(req);
            const { foundation_id, check_type = 'adhoc' } = req.body;

            if (!foundation_id) {
                return res.status(400).json({
                    success: false,
                    error: 'foundation_id is required'
                });
            }

            const data = await s2eService.generateHealthCheck(userId, foundation_id, check_type);
            res.json({ success: true, data });
        } catch (error) {
            console.error('Error generating health check:', error);
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
     * POST /api/s2e/health-checks/:id/recommendations/:index/complete
     * Mark a recommendation as completed
     */
    router.post('/health-checks/:id/recommendations/:index/complete', async (req, res) => {
        try {
            const { id, index } = req.params;

            // Get current health check
            const { data: healthCheck, error: fetchError } = await supabase
                .from('strategy_health_checks')
                .select('recommendations')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            const recommendations = healthCheck.recommendations || [];
            const recIndex = parseInt(index);

            if (recIndex >= 0 && recIndex < recommendations.length) {
                recommendations[recIndex] = {
                    ...recommendations[recIndex],
                    completed: true,
                    completed_at: new Date().toISOString()
                };

                const { data, error } = await supabase
                    .from('strategy_health_checks')
                    .update({ recommendations })
                    .eq('id', id)
                    .select()
                    .single();

                if (error) throw error;

                res.json({ success: true, data });
            } else {
                res.status(400).json({
                    success: false,
                    error: 'Invalid recommendation index'
                });
            }
        } catch (error) {
            console.error('Error completing recommendation:', error);
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
    // HEALTH CHECK SCHEDULING ENDPOINTS
    // ============================================================================

    /**
     * GET /api/s2e/health-checks/schedule
     * Get health check schedule configuration
     */
    router.get('/health-checks/schedule', async (req, res) => {
        try {
            const userId = getUserId(req);
            const data = await s2eService.getHealthCheckSchedule(userId);
            res.json({ success: true, data });
        } catch (error) {
            console.error('Error getting health check schedule:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/s2e/health-checks/schedule
     * Update health check schedule configuration
     */
    router.put('/health-checks/schedule', async (req, res) => {
        try {
            const userId = getUserId(req);
            const data = await s2eService.updateHealthCheckSchedule(userId, req.body);
            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating health check schedule:', error);
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
            const userId = getUserId(req);
            const data = await s2eService.buildStrategyMap(userId);
            res.json({ success: true, data });
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
            const userId = getUserId(req);
            const data = await s2eService.generateAlignmentReport(userId);
            res.json({ success: true, data });
        } catch (error) {
            console.error('Error getting alignment report:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/s2e/health-scores/:foundationId
     * Get calculated health scores for a foundation
     */
    router.get('/health-scores/:foundationId', async (req, res) => {
        try {
            const { foundationId } = req.params;
            const data = await s2eService.calculateHealthScores(foundationId);
            res.json({ success: true, data });
        } catch (error) {
            console.error('Error calculating health scores:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/s2e/health-analysis/:foundationId
     * Get health analysis observations for a foundation
     */
    router.get('/health-analysis/:foundationId', async (req, res) => {
        try {
            const { foundationId } = req.params;
            const observations = await s2eService.analyzeStrategyHealth(foundationId);
            const recommendations = s2eService.generateRecommendations(observations);
            res.json({
                success: true,
                data: {
                    observations,
                    recommendations
                }
            });
        } catch (error) {
            console.error('Error analyzing strategy health:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // BRIEFING INTEGRATION ENDPOINTS
    // ============================================================================

    /**
     * GET /api/s2e/briefing-summary
     * Generate a strategy summary for the daily briefing
     */
    router.get('/briefing-summary', async (req, res) => {
        try {
            const userId = getUserId(req);
            if (!userId) {
                return res.status(401).json({ success: false, error: 'User not authenticated' });
            }

            const summary = await s2eService.generateBriefingSummary(userId);
            res.json({
                success: true,
                data: summary
            });
        } catch (error) {
            console.error('Error generating briefing summary:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/s2e/briefing-metrics
     * Get condensed S2E metrics for briefing context
     */
    router.get('/briefing-metrics', async (req, res) => {
        try {
            const userId = getUserId(req);
            if (!userId) {
                return res.status(401).json({ success: false, error: 'User not authenticated' });
            }

            const metrics = await s2eService.getBriefingMetrics(userId);
            res.json({
                success: true,
                data: metrics
            });
        } catch (error) {
            console.error('Error getting briefing metrics:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};
