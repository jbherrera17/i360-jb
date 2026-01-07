/**
 * INSIGHT 360 - Align 120 API Routes
 * Version: 1.0.0
 * Part of the Three-Lane AI Transformation Framework
 *
 * Endpoints:
 *   - Sessions (CRUD for Align 120 assessment sessions)
 *   - Company Profiles (CRUD for company profile data)
 *   - Module Execution (run AI agents for each module)
 *   - Progress Tracking
 */

const express = require('express');
const agentService = require('../services/agentService');
const { getUserId } = require('../utils/auth');

/**
 * Align 120 Routes Factory
 * @param {object} supabase - Supabase client instance
 * @returns {Router} Express router
 */
module.exports = function(supabase) {
    const router = express.Router();

    // ============================================================================
    // ALIGN 120 SESSIONS ENDPOINTS
    // ============================================================================

    /**
     * GET /api/align120/sessions
     * List all Align 120 sessions for the current user
     */
    router.get('/sessions', async (req, res) => {
        try {
            const userId = getUserId(req);

            let query = supabase
                .from('align120_sessions')
                .select('*')
                .order('created_at', { ascending: false });

            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error listing sessions:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/align120/sessions/:id
     * Get a single session by ID
     */
    router.get('/sessions/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('align120_sessions')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error getting session:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/align120/sessions
     * Create a new Align 120 session
     */
    router.post('/sessions', async (req, res) => {
        try {
            const userId = getUserId(req);
            const { company_name, company_profile_id } = req.body;

            if (!company_name) {
                return res.status(400).json({
                    success: false,
                    error: 'Company name is required'
                });
            }

            const sessionData = {
                user_id: userId,
                company_name,
                company_profile_id: company_profile_id || null,
                status: 'in_progress',
                current_module: 1,
                module_progress: { 1: false, 2: false, 3: false, 4: false, 5: false }
            };

            const { data, error } = await supabase
                .from('align120_sessions')
                .insert(sessionData)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error creating session:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/align120/sessions/:id
     * Update a session
     */
    router.put('/sessions/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { current_module, module_progress, status, company_name } = req.body;

            const updateData = {};
            if (current_module !== undefined) updateData.current_module = current_module;
            if (module_progress !== undefined) updateData.module_progress = module_progress;
            if (status !== undefined) updateData.status = status;
            if (company_name !== undefined) updateData.company_name = company_name;

            const { data, error } = await supabase
                .from('align120_sessions')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating session:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/align120/sessions/:id
     * Delete a session
     */
    router.delete('/sessions/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('align120_sessions')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({ success: true, message: 'Session deleted' });
        } catch (error) {
            console.error('Error deleting session:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/align120/sessions/:id/run-module
     * Run AI agents for a specific module
     */
    router.post('/sessions/:id/run-module', async (req, res) => {
        try {
            const { id } = req.params;
            const { module: moduleNum, companyContext } = req.body;
            const userId = getUserId(req);

            if (!moduleNum || moduleNum < 1 || moduleNum > 5) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid module number (1-5) is required'
                });
            }

            // Get the session
            const { data: session, error: sessionError } = await supabase
                .from('align120_sessions')
                .select('*')
                .eq('id', id)
                .single();

            if (sessionError) throw sessionError;

            // Get agents for this module
            const categoryMap = {
                1: 'assessment',
                2: 'strategy',
                3: 'productivity',
                4: 'content',
                5: 'corporate'
            };

            const moduleNames = {
                1: 'AI Maturity Assessment',
                2: 'Business Fundamentals',
                3: 'Team Readiness',
                4: 'Brand Alignment',
                5: 'Corporate Alignment'
            };

            const { data: agents, error: agentError } = await supabase
                .from('agents')
                .select('*')
                .eq('suite', 'align')
                .eq('category', categoryMap[moduleNum])
                .eq('is_active', true);

            if (agentError) throw agentError;

            // Build context message for agents
            const contextMessage = `
You are running an Align 120 assessment for ${session.company_name}.
Module: ${moduleNum} - ${moduleNames[moduleNum]}

${companyContext ? `Company Context:\n${companyContext}\n\n` : ''}
Please provide a comprehensive assessment based on the available information.
Format your response as a structured analysis with clear sections and actionable insights.
`;

            // Execute each agent and collect results
            const agentResults = [];
            const outputs = {};

            for (const agent of (agents || [])) {
                try {
                    console.log(`Running agent: ${agent.name} for module ${moduleNum}`);

                    const result = await agentService.executeAgent(agent.id, {
                        userMessage: contextMessage,
                        userId: userId,
                        conversationHistory: []
                    });

                    agentResults.push({
                        agent_id: agent.id,
                        agent_name: agent.name,
                        response: result.response,
                        execution_id: result.execution_id,
                        usage: result.usage,
                        duration_ms: result.duration_ms
                    });

                    // Mark this agent's output as complete
                    outputs[agent.name.toLowerCase().replace(/\s+/g, '_')] = {
                        completed: true,
                        response: result.response,
                        execution_id: result.execution_id
                    };

                } catch (agentError) {
                    console.error(`Error running agent ${agent.name}:`, agentError);
                    agentResults.push({
                        agent_id: agent.id,
                        agent_name: agent.name,
                        error: agentError.message
                    });
                    outputs[agent.name.toLowerCase().replace(/\s+/g, '_')] = {
                        completed: false,
                        error: agentError.message
                    };
                }
            }

            // Store module results in session
            const moduleResults = session.module_results || {};
            moduleResults[moduleNum] = {
                completed_at: new Date().toISOString(),
                agents_run: agentResults.length,
                results: agentResults
            };

            // Update session progress
            const moduleProgress = session.module_progress || {};
            moduleProgress[moduleNum] = true;

            await supabase
                .from('align120_sessions')
                .update({
                    module_progress: moduleProgress,
                    module_results: moduleResults,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            res.json({
                success: true,
                data: {
                    module: moduleNum,
                    module_name: moduleNames[moduleNum],
                    agents_run: agentResults.length,
                    results: agentResults,
                    outputs
                }
            });
        } catch (error) {
            console.error('Error running module:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/align120/sessions/:id/complete
     * Complete a session and generate company profile
     */
    router.post('/sessions/:id/complete', async (req, res) => {
        try {
            const { id } = req.params;
            const userId = getUserId(req);

            // Get the session
            const { data: session, error: sessionError } = await supabase
                .from('align120_sessions')
                .select('*')
                .eq('id', id)
                .single();

            if (sessionError) throw sessionError;

            // Check if all modules are complete
            const progress = session.module_progress || {};
            const allComplete = [1, 2, 3, 4, 5].every(m => progress[m] === true);

            if (!allComplete) {
                return res.status(400).json({
                    success: false,
                    error: 'All modules must be completed before finishing the session'
                });
            }

            // Create or update company profile
            let companyProfile;
            if (session.company_profile_id) {
                // Update existing profile
                const { data, error } = await supabase
                    .from('company_profiles')
                    .update({
                        name: session.company_name,
                        align120_completed: true,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', session.company_profile_id)
                    .select()
                    .single();

                if (error) throw error;
                companyProfile = data;
            } else {
                // Create new profile
                const { data, error } = await supabase
                    .from('company_profiles')
                    .insert({
                        user_id: userId,
                        name: session.company_name,
                        align120_completed: true
                    })
                    .select()
                    .single();

                if (error) throw error;
                companyProfile = data;
            }

            // Update session as completed
            await supabase
                .from('align120_sessions')
                .update({
                    status: 'completed',
                    company_profile_id: companyProfile.id,
                    completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            res.json({
                success: true,
                data: {
                    session_id: id,
                    company_profile_id: companyProfile.id,
                    message: 'Session completed successfully'
                }
            });
        } catch (error) {
            console.error('Error completing session:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // COMPANY PROFILE ENDPOINTS
    // ============================================================================

    /**
     * GET /api/align120/company-profiles
     * List all company profiles
     */
    router.get('/company-profiles', async (req, res) => {
        try {
            const userId = getUserId(req);

            let query = supabase
                .from('company_profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error listing company profiles:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/align120/company-profiles/:id
     * Get a single company profile with all related data
     */
    router.get('/company-profiles/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Get company profile
            const { data: profile, error: profileError } = await supabase
                .from('company_profiles')
                .select('*')
                .eq('id', id)
                .single();

            if (profileError) throw profileError;

            // Get related assessments
            const [
                { data: maturity },
                { data: fundamentals },
                { data: teamReadiness },
                { data: brandAlignment },
                { data: corporateAlignment }
            ] = await Promise.all([
                supabase.from('ai_maturity_assessments').select('*').eq('company_profile_id', id).order('created_at', { ascending: false }).limit(1),
                supabase.from('business_fundamentals').select('*').eq('company_profile_id', id).order('created_at', { ascending: false }).limit(1),
                supabase.from('team_readiness_assessments').select('*').eq('company_profile_id', id).order('created_at', { ascending: false }).limit(1),
                supabase.from('brand_alignment_assessments').select('*').eq('company_profile_id', id).order('created_at', { ascending: false }).limit(1),
                supabase.from('corporate_alignments').select('*').eq('company_profile_id', id).order('created_at', { ascending: false }).limit(1)
            ]);

            res.json({
                success: true,
                data: {
                    profile,
                    maturity: maturity?.[0] || null,
                    fundamentals: fundamentals?.[0] || null,
                    teamReadiness: teamReadiness?.[0] || null,
                    brandAlignment: brandAlignment?.[0] || null,
                    corporateAlignment: corporateAlignment?.[0] || null
                }
            });
        } catch (error) {
            console.error('Error getting company profile:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/align120/company-profiles
     * Create a new company profile
     */
    router.post('/company-profiles', async (req, res) => {
        try {
            const userId = getUserId(req);
            const profileData = {
                ...req.body,
                user_id: userId
            };

            const { data, error } = await supabase
                .from('company_profiles')
                .insert(profileData)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error creating company profile:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/align120/company-profiles/:id
     * Update a company profile
     */
    router.put('/company-profiles/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = { ...req.body };
            delete updateData.id; // Prevent ID update
            delete updateData.user_id; // Prevent user_id update
            delete updateData.created_at;

            const { data, error } = await supabase
                .from('company_profiles')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating company profile:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/align120/company-profiles/:id
     * Delete a company profile
     */
    router.delete('/company-profiles/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('company_profiles')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({ success: true, message: 'Company profile deleted' });
        } catch (error) {
            console.error('Error deleting company profile:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // DASHBOARD VIEW ENDPOINTS
    // ============================================================================

    /**
     * GET /api/align120/dashboard/:id
     * Get dashboard view data for a company profile
     */
    router.get('/dashboard/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Try to get from the view first
            const { data, error } = await supabase
                .from('company_dashboard_view')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                // Fallback to manual query if view doesn't exist
                const { data: profile, error: profileError } = await supabase
                    .from('company_profiles')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (profileError) throw profileError;

                return res.json({ success: true, data: profile });
            }

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error getting dashboard:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/align120/progress
     * Get overall Align 120 progress summary
     */
    router.get('/progress', async (req, res) => {
        try {
            const userId = getUserId(req);

            // Try to use the progress view
            let query = supabase
                .from('align120_progress_view')
                .select('*');

            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data, error } = await query;

            if (error) {
                // View doesn't exist, return empty
                return res.json({ success: true, data: [] });
            }

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error getting progress:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};
