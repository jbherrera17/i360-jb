/**
 * INSIGHT 360 - Strategy 120 Extended API Routes
 * Version: 1.0.0
 * Part of Strategy 120 Module (Phase 8)
 *
 * Endpoints for:
 *   - Strategy Initiatives
 *   - Business Cases
 *   - Scenario Models
 *   - Decision Log
 *   - Intelligence Briefs
 *   - OKR Cascade Tracking
 *   - BSC Perspective Scores
 */

const express = require('express');

/**
 * Strategy 120 Routes Factory
 * @param {object} supabase - Supabase client instance
 * @returns {Router} Express router
 */
module.exports = function(supabase) {
    const router = express.Router();

    // Get user ID helper
    const getUserId = (req) => req.user?.id || process.env.DEV_USER_ID || null;

    // ============================================================================
    // STRATEGY INITIATIVES ENDPOINTS
    // ============================================================================

    /**
     * GET /api/strategy120/initiatives
     * List all strategy initiatives with optional filters
     */
    router.get('/initiatives', async (req, res) => {
        try {
            const { status, perspective, theme_id, priority_min } = req.query;

            let query = supabase
                .from('strategy_initiatives')
                .select(`
                    *,
                    strategic_themes(id, name, color),
                    roles(id, title)
                `)
                .order('priority', { ascending: false })
                .order('created_at', { ascending: false });

            if (status) query = query.eq('status', status);
            if (perspective) query = query.eq('perspective_type', perspective);
            if (theme_id) query = query.eq('strategic_theme_id', theme_id);
            if (priority_min) query = query.gte('priority', parseInt(priority_min));

            const { data, error } = await query;
            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error listing initiatives:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/strategy120/initiatives/:id
     * Get single initiative with full details
     */
    router.get('/initiatives/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('strategy_initiatives')
                .select(`
                    *,
                    strategic_themes(id, name, color, description),
                    roles(id, title),
                    business_cases(*),
                    strategy_initiative_dependencies!initiative_id(
                        id, dependency_type, description, is_resolved,
                        depends_on:strategy_initiatives!depends_on_initiative_id(id, name, status)
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error getting initiative:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/strategy120/initiatives
     * Create new strategy initiative
     */
    router.post('/initiatives', async (req, res) => {
        try {
            const userId = getUserId(req);
            const {
                foundation_id,
                name,
                description,
                strategic_theme_id,
                perspective_type,
                status,
                priority,
                ai_investment_type,
                estimated_impact,
                timeline,
                resource_requirements,
                risk_assessment,
                owner_role_id,
                related_okr_ids
            } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Initiative name is required'
                });
            }

            const { data, error } = await supabase
                .from('strategy_initiatives')
                .insert({
                    user_id: userId,
                    foundation_id,
                    name,
                    description,
                    strategic_theme_id,
                    perspective_type,
                    status: status || 'ideation',
                    priority: priority || 50,
                    ai_investment_type,
                    estimated_impact: estimated_impact || {},
                    timeline: timeline || {},
                    resource_requirements: resource_requirements || {},
                    risk_assessment: risk_assessment || [],
                    owner_role_id,
                    related_okr_ids: related_okr_ids || []
                })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error creating initiative:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/strategy120/initiatives/:id
     * Update strategy initiative
     */
    router.put('/initiatives/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Remove fields that shouldn't be updated directly
            delete updates.id;
            delete updates.user_id;
            delete updates.created_at;

            const { data, error } = await supabase
                .from('strategy_initiatives')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating initiative:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/strategy120/initiatives/:id
     * Delete strategy initiative
     */
    router.delete('/initiatives/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('strategy_initiatives')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({ success: true, message: 'Initiative deleted' });
        } catch (error) {
            console.error('Error deleting initiative:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // BUSINESS CASES ENDPOINTS
    // ============================================================================

    /**
     * GET /api/strategy120/business-cases
     * List business cases with optional filters
     */
    router.get('/business-cases', async (req, res) => {
        try {
            const { initiative_id, case_type, status } = req.query;

            let query = supabase
                .from('business_cases')
                .select(`
                    *,
                    strategy_initiatives(id, name, status)
                `)
                .order('created_at', { ascending: false });

            if (initiative_id) query = query.eq('initiative_id', initiative_id);
            if (case_type) query = query.eq('case_type', case_type);
            if (status) query = query.eq('status', status);

            const { data, error } = await query;
            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error listing business cases:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/strategy120/business-cases/:id
     * Get single business case with scenarios
     */
    router.get('/business-cases/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('business_cases')
                .select(`
                    *,
                    strategy_initiatives(id, name, status, priority),
                    scenario_models(*)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error getting business case:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/strategy120/business-cases
     * Create new business case
     */
    router.post('/business-cases', async (req, res) => {
        try {
            const userId = getUserId(req);
            const {
                initiative_id,
                foundation_id,
                name,
                description,
                case_type,
                status,
                financial_model,
                operational_impact,
                strategic_impact,
                assumptions,
                dependencies,
                approval_chain
            } = req.body;

            if (!name || !initiative_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Name and initiative_id are required'
                });
            }

            const { data, error } = await supabase
                .from('business_cases')
                .insert({
                    user_id: userId,
                    initiative_id,
                    foundation_id,
                    name,
                    description,
                    case_type: case_type || 'base_case',
                    status: status || 'draft',
                    financial_model: financial_model || {},
                    operational_impact: operational_impact || {},
                    strategic_impact: strategic_impact || {},
                    assumptions: assumptions || [],
                    dependencies: dependencies || [],
                    approval_chain: approval_chain || {}
                })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error creating business case:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/strategy120/business-cases/:id
     * Update business case
     */
    router.put('/business-cases/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            delete updates.id;
            delete updates.user_id;
            delete updates.created_at;

            const { data, error } = await supabase
                .from('business_cases')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating business case:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/strategy120/business-cases/:id
     * Delete business case
     */
    router.delete('/business-cases/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('business_cases')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({ success: true, message: 'Business case deleted' });
        } catch (error) {
            console.error('Error deleting business case:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // SCENARIO MODELS ENDPOINTS
    // ============================================================================

    /**
     * GET /api/strategy120/scenarios
     * List scenario models
     */
    router.get('/scenarios', async (req, res) => {
        try {
            const { business_case_id, scenario_type } = req.query;

            let query = supabase
                .from('scenario_models')
                .select(`
                    *,
                    business_cases(id, name)
                `)
                .order('probability_percent', { ascending: false });

            if (business_case_id) query = query.eq('business_case_id', business_case_id);
            if (scenario_type) query = query.eq('scenario_type', scenario_type);

            const { data, error } = await query;
            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error listing scenarios:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/strategy120/scenarios
     * Create new scenario model
     */
    router.post('/scenarios', async (req, res) => {
        try {
            const userId = getUserId(req);
            const {
                business_case_id,
                initiative_id,
                foundation_id,
                name,
                description,
                scenario_type,
                probability_percent,
                key_assumptions,
                outcomes,
                resource_requirements,
                timeline_sensitivity
            } = req.body;

            if (!name || !scenario_type) {
                return res.status(400).json({
                    success: false,
                    error: 'Name and scenario_type are required'
                });
            }

            const { data, error } = await supabase
                .from('scenario_models')
                .insert({
                    user_id: userId,
                    business_case_id,
                    initiative_id,
                    foundation_id,
                    name,
                    description,
                    scenario_type,
                    probability_percent: probability_percent || 0,
                    key_assumptions: key_assumptions || [],
                    outcomes: outcomes || {},
                    resource_requirements: resource_requirements || {},
                    timeline_sensitivity: timeline_sensitivity || {}
                })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error creating scenario:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/strategy120/scenarios/:id
     * Update scenario model
     */
    router.put('/scenarios/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            delete updates.id;
            delete updates.user_id;
            delete updates.created_at;

            const { data, error } = await supabase
                .from('scenario_models')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating scenario:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/strategy120/scenarios/:id
     * Delete scenario model
     */
    router.delete('/scenarios/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('scenario_models')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({ success: true, message: 'Scenario deleted' });
        } catch (error) {
            console.error('Error deleting scenario:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // DECISION LOG ENDPOINTS
    // ============================================================================

    /**
     * GET /api/strategy120/decisions
     * List decisions with optional filters
     */
    router.get('/decisions', async (req, res) => {
        try {
            const { status, category, owner_role_id } = req.query;

            let query = supabase
                .from('decision_log')
                .select(`
                    *,
                    roles(id, title),
                    strategy_initiatives(id, name),
                    bsc_objectives(id, name)
                `)
                .order('decision_date', { ascending: false });

            if (status) query = query.eq('decision_status', status);
            if (category) query = query.eq('decision_category', category);
            if (owner_role_id) query = query.eq('owner_role_id', owner_role_id);

            const { data, error } = await query;
            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error listing decisions:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/strategy120/decisions/:id
     * Get single decision with full details
     */
    router.get('/decisions/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('decision_log')
                .select(`
                    *,
                    roles(id, title),
                    strategy_initiatives(id, name, status),
                    bsc_objectives(id, name)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error getting decision:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/strategy120/decisions
     * Create new decision
     */
    router.post('/decisions', async (req, res) => {
        try {
            const userId = getUserId(req);
            const {
                foundation_id,
                decision_date,
                title,
                description,
                decision_status,
                owner_role_id,
                decision_category,
                decision_type,
                options_considered,
                decision_criteria,
                selected_option_id,
                decision_rationale,
                risk_benefit_analysis,
                assumptions_tested,
                alternative_perspectives,
                approvers,
                implementation_status,
                implementation_notes,
                decision_review_date,
                related_initiative_id,
                related_objective_id
            } = req.body;

            if (!title) {
                return res.status(400).json({
                    success: false,
                    error: 'Decision title is required'
                });
            }

            const { data, error } = await supabase
                .from('decision_log')
                .insert({
                    user_id: userId,
                    foundation_id,
                    decision_date: decision_date || new Date().toISOString().split('T')[0],
                    title,
                    description,
                    decision_status: decision_status || 'pending',
                    owner_role_id,
                    decision_category,
                    decision_type,
                    options_considered: options_considered || [],
                    decision_criteria: decision_criteria || [],
                    selected_option_id,
                    decision_rationale,
                    risk_benefit_analysis: risk_benefit_analysis || {},
                    assumptions_tested: assumptions_tested || [],
                    alternative_perspectives: alternative_perspectives || [],
                    approvers: approvers || [],
                    implementation_status: implementation_status || 'pending',
                    implementation_notes,
                    decision_review_date,
                    related_initiative_id,
                    related_objective_id
                })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error creating decision:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/strategy120/decisions/:id
     * Update decision
     */
    router.put('/decisions/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            delete updates.id;
            delete updates.user_id;
            delete updates.created_at;

            const { data, error } = await supabase
                .from('decision_log')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating decision:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/strategy120/decisions/:id
     * Delete decision
     */
    router.delete('/decisions/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('decision_log')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({ success: true, message: 'Decision deleted' });
        } catch (error) {
            console.error('Error deleting decision:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // INTELLIGENCE BRIEFS ENDPOINTS
    // ============================================================================

    /**
     * GET /api/strategy120/intelligence
     * List intelligence briefs with optional filters
     */
    router.get('/intelligence', async (req, res) => {
        try {
            const { brief_type, impact, status, min_relevance } = req.query;

            let query = supabase
                .from('intelligence_briefs')
                .select('*')
                .order('relevance_score', { ascending: false })
                .order('created_at', { ascending: false });

            if (brief_type) query = query.eq('brief_type', brief_type);
            if (impact) query = query.eq('impact_on_strategy', impact);
            if (status) query = query.eq('status', status);
            if (min_relevance) query = query.gte('relevance_score', parseInt(min_relevance));

            const { data, error } = await query;
            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error listing intelligence briefs:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/strategy120/intelligence/:id
     * Get single intelligence brief
     */
    router.get('/intelligence/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('intelligence_briefs')
                .select(`
                    *,
                    roles(id, title),
                    agents(id, name)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error getting intelligence brief:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/strategy120/intelligence
     * Create new intelligence brief
     */
    router.post('/intelligence', async (req, res) => {
        try {
            const userId = getUserId(req);
            const {
                foundation_id,
                title,
                summary,
                brief_type,
                source_category,
                sources,
                relevance_score,
                impact_on_strategy,
                relevant_themes,
                relevant_initiatives,
                key_findings,
                competitive_context,
                technology_context,
                content,
                attachments,
                status,
                next_review_date,
                author_role_id,
                generating_agent_id
            } = req.body;

            if (!title || !summary || !brief_type) {
                return res.status(400).json({
                    success: false,
                    error: 'Title, summary, and brief_type are required'
                });
            }

            const { data, error } = await supabase
                .from('intelligence_briefs')
                .insert({
                    user_id: userId,
                    foundation_id,
                    title,
                    summary,
                    brief_type,
                    source_category,
                    sources: sources || [],
                    relevance_score: relevance_score || 50,
                    impact_on_strategy,
                    relevant_themes: relevant_themes || [],
                    relevant_initiatives: relevant_initiatives || [],
                    key_findings: key_findings || [],
                    competitive_context: competitive_context || {},
                    technology_context: technology_context || {},
                    content,
                    attachments: attachments || [],
                    status: status || 'draft',
                    next_review_date,
                    author_role_id,
                    generating_agent_id
                })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error creating intelligence brief:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/strategy120/intelligence/:id
     * Update intelligence brief
     */
    router.put('/intelligence/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            delete updates.id;
            delete updates.user_id;
            delete updates.created_at;

            // Handle publish action
            if (updates.status === 'published' && !updates.published_date) {
                updates.published_date = new Date().toISOString();
            }

            const { data, error } = await supabase
                .from('intelligence_briefs')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating intelligence brief:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/strategy120/intelligence/:id
     * Delete intelligence brief
     */
    router.delete('/intelligence/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('intelligence_briefs')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({ success: true, message: 'Intelligence brief deleted' });
        } catch (error) {
            console.error('Error deleting intelligence brief:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // OKR CASCADE TRACKING ENDPOINTS
    // ============================================================================

    /**
     * GET /api/strategy120/cascade
     * Get OKR cascade relationships
     */
    router.get('/cascade', async (req, res) => {
        try {
            const { parent_okr_id, cascade_level, perspective } = req.query;

            let query = supabase
                .from('okr_cascade_tracking')
                .select(`
                    *,
                    parent:okrs!parent_okr_id(id, title, progress, status),
                    child:okrs!child_okr_id(id, title, progress, status)
                `)
                .eq('is_active', true)
                .order('alignment_score', { ascending: false });

            if (parent_okr_id) query = query.eq('parent_okr_id', parent_okr_id);
            if (cascade_level) query = query.eq('cascade_level', cascade_level);
            if (perspective) query = query.eq('perspective_type', perspective);

            const { data, error } = await query;
            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error listing cascade:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/strategy120/cascade
     * Create cascade relationship
     */
    router.post('/cascade', async (req, res) => {
        try {
            const userId = getUserId(req);
            const {
                foundation_id,
                parent_okr_id,
                child_okr_id,
                cascade_level,
                perspective_type,
                alignment_score,
                alignment_rationale,
                contribution_weight
            } = req.body;

            if (!parent_okr_id || !child_okr_id || !cascade_level) {
                return res.status(400).json({
                    success: false,
                    error: 'parent_okr_id, child_okr_id, and cascade_level are required'
                });
            }

            const { data, error } = await supabase
                .from('okr_cascade_tracking')
                .insert({
                    user_id: userId,
                    foundation_id,
                    parent_okr_id,
                    child_okr_id,
                    cascade_level,
                    perspective_type,
                    alignment_score: alignment_score || 100,
                    alignment_rationale,
                    contribution_weight: contribution_weight || 100
                })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error creating cascade:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/strategy120/cascade/:id
     * Update cascade relationship
     */
    router.put('/cascade/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            delete updates.id;
            delete updates.user_id;
            delete updates.created_at;

            updates.last_validated = new Date().toISOString();

            const { data, error } = await supabase
                .from('okr_cascade_tracking')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating cascade:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/strategy120/cascade/:id
     * Delete cascade relationship
     */
    router.delete('/cascade/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('okr_cascade_tracking')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({ success: true, message: 'Cascade deleted' });
        } catch (error) {
            console.error('Error deleting cascade:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // BSC PERSPECTIVE SCORES ENDPOINTS
    // ============================================================================

    /**
     * GET /api/strategy120/perspective-scores
     * Get BSC perspective scores
     */
    router.get('/perspective-scores', async (req, res) => {
        try {
            const { perspective_id, period } = req.query;

            let query = supabase
                .from('bsc_perspective_scores')
                .select(`
                    *,
                    bsc_perspectives(id, name, perspective_type)
                `)
                .order('calculation_date', { ascending: false });

            if (perspective_id) query = query.eq('perspective_id', perspective_id);
            if (period) query = query.eq('calculation_period', period);

            const { data, error } = await query;
            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error listing perspective scores:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/strategy120/perspective-scores/latest
     * Get latest scores for all perspectives
     */
    router.get('/perspective-scores/latest', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('perspective_performance_view')
                .select('*');

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error getting latest perspective scores:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/strategy120/perspective-scores
     * Record new perspective score
     */
    router.post('/perspective-scores', async (req, res) => {
        try {
            const userId = getUserId(req);
            const {
                foundation_id,
                perspective_id,
                calculation_date,
                calculation_period,
                overall_score,
                progress_score,
                alignment_score,
                health_score,
                contributing_okr_ids,
                okr_count,
                company_okr_score,
                department_okr_score,
                individual_okr_score,
                score_trend,
                trend_percentage,
                analysis_notes,
                recommendations
            } = req.body;

            if (!perspective_id || !calculation_period) {
                return res.status(400).json({
                    success: false,
                    error: 'perspective_id and calculation_period are required'
                });
            }

            const { data, error } = await supabase
                .from('bsc_perspective_scores')
                .insert({
                    user_id: userId,
                    foundation_id,
                    perspective_id,
                    calculation_date: calculation_date || new Date().toISOString().split('T')[0],
                    calculation_period,
                    overall_score,
                    progress_score,
                    alignment_score,
                    health_score,
                    contributing_okr_ids: contributing_okr_ids || [],
                    okr_count: okr_count || 0,
                    company_okr_score,
                    department_okr_score,
                    individual_okr_score,
                    score_trend,
                    trend_percentage,
                    analysis_notes,
                    recommendations: recommendations || []
                })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error recording perspective score:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // INITIATIVE DEPENDENCIES ENDPOINTS
    // ============================================================================

    /**
     * GET /api/strategy120/dependencies
     * Get initiative dependencies
     */
    router.get('/dependencies', async (req, res) => {
        try {
            const { initiative_id, dependency_type } = req.query;

            let query = supabase
                .from('strategy_initiative_dependencies')
                .select(`
                    *,
                    initiative:strategy_initiatives!initiative_id(id, name, status),
                    depends_on:strategy_initiatives!depends_on_initiative_id(id, name, status)
                `)
                .order('sequence_order');

            if (initiative_id) query = query.eq('initiative_id', initiative_id);
            if (dependency_type) query = query.eq('dependency_type', dependency_type);

            const { data, error } = await query;
            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error listing dependencies:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/strategy120/dependencies
     * Create initiative dependency
     */
    router.post('/dependencies', async (req, res) => {
        try {
            const userId = getUserId(req);
            const {
                initiative_id,
                depends_on_initiative_id,
                dependency_type,
                sequence_order,
                description
            } = req.body;

            if (!initiative_id || !depends_on_initiative_id || !dependency_type) {
                return res.status(400).json({
                    success: false,
                    error: 'initiative_id, depends_on_initiative_id, and dependency_type are required'
                });
            }

            const { data, error } = await supabase
                .from('strategy_initiative_dependencies')
                .insert({
                    user_id: userId,
                    initiative_id,
                    depends_on_initiative_id,
                    dependency_type,
                    sequence_order: sequence_order || 0,
                    description
                })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error creating dependency:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/strategy120/dependencies/:id
     * Update initiative dependency
     */
    router.put('/dependencies/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            delete updates.id;
            delete updates.user_id;
            delete updates.created_at;

            const { data, error } = await supabase
                .from('strategy_initiative_dependencies')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating dependency:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/strategy120/dependencies/:id
     * Delete initiative dependency
     */
    router.delete('/dependencies/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('strategy_initiative_dependencies')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({ success: true, message: 'Dependency deleted' });
        } catch (error) {
            console.error('Error deleting dependency:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // PORTFOLIO VIEW ENDPOINTS
    // ============================================================================

    /**
     * GET /api/strategy120/portfolio
     * Get initiative portfolio view
     */
    router.get('/portfolio', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('initiative_portfolio_view')
                .select('*');

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error getting portfolio view:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/strategy120/decision-timeline
     * Get decision timeline view
     */
    router.get('/decision-timeline', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('decision_timeline_view')
                .select('*');

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error getting decision timeline:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/strategy120/cascade-map
     * Get full cascade map view
     */
    router.get('/cascade-map', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('strategy_map_cascade_view')
                .select('*');

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error getting cascade map:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/strategy120/alignment-scores
     * Get alignment scores view
     */
    router.get('/alignment-scores', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('alignment_score_view')
                .select('*');

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error getting alignment scores:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};
