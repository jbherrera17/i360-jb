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
const integrationService = require('../services/align120IntegrationService');
const webScraperService = require('../services/webScraperService');
const { getUserId, isAdminAsync } = require('../utils/auth');

/**
 * Align 120 Routes Factory
 * @param {object} supabase - Supabase client instance
 * @returns {Router} Express router
 */
module.exports = function(supabase) {
    const router = express.Router();

    // Phase 44: Module access middleware for Align 120
    // Business tier and above required for this module
    router.use(async (req, res, next) => {
        try {
            const userId = req.userId;
            const orgId = req.headers['x-org-id'];

            // Skip check if no user context (will fail auth later anyway)
            if (!userId) {
                return next();
            }

            // Check module access using database function
            const { data: canAccess, error } = await supabase
                .rpc('can_access_module', {
                    p_user_id: userId,
                    p_module_id: 'align120',
                    p_org_id: orgId || null
                });

            if (error) {
                console.error('Module access check error:', error);
                // Don't block on database errors
                return next();
            }

            if (canAccess === false) {
                return res.status(403).json({
                    success: false,
                    error: 'Align 120 requires a Business tier or higher subscription',
                    module: 'align120',
                    upgrade_required: true
                });
            }

            next();
        } catch (err) {
            console.error('Module access middleware error:', err);
            next(); // Don't block on errors
        }
    });

    // ============================================================================
    // ALIGN 120 SESSIONS ENDPOINTS
    // ============================================================================

    /**
     * GET /api/align120/sessions
     * List all Align 120 sessions for the current user
     * Supports filtering by org_id, client_id, and excluding ephemeral sessions
     */
    router.get('/sessions', async (req, res) => {
        try {
            const userId = getUserId(req);
            const { org_id, client_id, include_ephemeral } = req.query;

            // User ID is required - only return sessions owned by the current user
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required to view sessions'
                });
            }

            // Build query - start with user's own sessions
            let query = supabase
                .from('align120_sessions')
                .select('*')
                .order('created_at', { ascending: false });

            // If org_id specified, get org sessions user can access
            if (org_id) {
                // Verify membership
                const { data: membership } = await supabase
                    .from('organization_members')
                    .select('role')
                    .eq('org_id', org_id)
                    .eq('user_id', userId)
                    .eq('status', 'active')
                    .single();

                if (!membership) {
                    return res.status(403).json({
                        success: false,
                        error: 'Not a member of this organization'
                    });
                }

                query = query.eq('org_id', org_id);

                // Optionally filter by client
                if (client_id) {
                    query = query.eq('client_id', client_id);
                }
            } else {
                // No org specified - get user's own sessions only
                query = query.eq('user_id', userId);
            }

            // By default, exclude ephemeral sessions from dashboard views
            if (include_ephemeral !== 'true') {
                query = query.or('is_ephemeral.is.null,is_ephemeral.eq.false');
            }

            const { data: sessions, error } = await query;

            if (error) throw error;

            // Fetch user info for display
            const { data: userData } = await supabase
                .from('users')
                .select('display_name, email')
                .eq('id', userId)
                .single();

            // Attach user info to each session
            const data = (sessions || []).map(session => ({
                ...session,
                user: userData || null
            }));

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error listing sessions:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/align120/sessions/:id
     * Get a single session by ID (must be owned by current user)
     */
    router.get('/sessions/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const userId = getUserId(req);

            // User ID is required
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required to view session'
                });
            }

            const { data: session, error } = await supabase
                .from('align120_sessions')
                .select('*')
                .eq('id', id)
                .eq('user_id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return res.status(404).json({
                        success: false,
                        error: 'Session not found or access denied'
                    });
                }
                throw error;
            }

            // Fetch user info for display
            const { data: userData } = await supabase
                .from('users')
                .select('display_name, email')
                .eq('id', userId)
                .single();

            // Attach user info to session
            const data = {
                ...session,
                user: userData || null
            };

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error getting session:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/align120/sessions
     * Create a new Align 120 session
     * Supports multi-tenant with org_id, client_id, and ephemeral mode
     */
    router.post('/sessions', async (req, res) => {
        try {
            const userId = getUserId(req);
            const {
                company_name,
                company_profile_id,
                org_id,
                client_id,
                is_ephemeral,
                report_format
            } = req.body;

            if (!company_name) {
                return res.status(400).json({
                    success: false,
                    error: 'Company name is required'
                });
            }

            // If org_id provided, verify user is a member
            if (org_id) {
                const { data: membership } = await supabase
                    .from('organization_members')
                    .select('role')
                    .eq('org_id', org_id)
                    .eq('user_id', userId)
                    .eq('status', 'active')
                    .single();

                if (!membership) {
                    return res.status(403).json({
                        success: false,
                        error: 'Not a member of this organization'
                    });
                }
            }

            // If client_id provided, verify it belongs to the org
            if (client_id && org_id) {
                const { data: client } = await supabase
                    .from('clients')
                    .select('id')
                    .eq('id', client_id)
                    .eq('org_id', org_id)
                    .single();

                if (!client) {
                    return res.status(400).json({
                        success: false,
                        error: 'Client not found in this organization'
                    });
                }
            }

            const sessionData = {
                user_id: userId,
                company_name,
                company_profile_id: company_profile_id || null,
                org_id: org_id || null,
                client_id: client_id || null,
                is_ephemeral: is_ephemeral || false,
                ephemeral_expires_at: is_ephemeral ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
                report_format: report_format || 'standard',
                status: 'in_progress',
                current_module: 1,
                module_progress: { 1: false, 2: false, 3: false, 4: false, 5: false }
            };

            const { data: session, error } = await supabase
                .from('align120_sessions')
                .insert(sessionData)
                .select()
                .single();

            if (error) throw error;

            // Fetch user info for display
            const { data: userData } = await supabase
                .from('users')
                .select('display_name, email')
                .eq('id', userId)
                .single();

            // Attach user info to session
            const data = {
                ...session,
                user: userData || null
            };

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
     * Delete a session (must be owned by current user)
     */
    router.delete('/sessions/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const userId = getUserId(req);

            // User ID is required
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required to delete session'
                });
            }

            // Only delete if the session belongs to the current user
            const { data, error } = await supabase
                .from('align120_sessions')
                .delete()
                .eq('id', id)
                .eq('user_id', userId)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Session not found or access denied'
                });
            }

            res.json({ success: true, message: 'Session deleted' });
        } catch (error) {
            console.error('Error deleting session:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // ADMIN ENDPOINTS
    // ============================================================================

    /**
     * GET /api/align120/admin/sessions
     * Get all sessions (admin only) with user and company info
     */
    router.get('/admin/sessions', async (req, res) => {
        try {
            const userId = getUserId(req);

            // Check if user is admin
            const isAdmin = await isAdminAsync(req, supabase);
            if (!isAdmin) {
                return res.status(403).json({
                    success: false,
                    error: 'Admin access required'
                });
            }

            // Fetch all sessions
            const { data: sessions, error } = await supabase
                .from('align120_sessions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Get unique user IDs
            const userIds = [...new Set(sessions.map(s => s.user_id).filter(Boolean))];

            // Fetch all users for these sessions
            let usersMap = {};
            if (userIds.length > 0) {
                const { data: users } = await supabase
                    .from('users')
                    .select('id, display_name, email')
                    .in('id', userIds);

                if (users) {
                    usersMap = users.reduce((acc, u) => {
                        acc[u.id] = u;
                        return acc;
                    }, {});
                }
            }

            // Get unique company profile IDs
            const companyProfileIds = [...new Set(sessions.map(s => s.company_profile_id).filter(Boolean))];

            // Fetch company profiles if any
            let companiesMap = {};
            if (companyProfileIds.length > 0) {
                const { data: companies } = await supabase
                    .from('company_profiles')
                    .select('id, company_name, industry, status')
                    .in('id', companyProfileIds);

                if (companies) {
                    companiesMap = companies.reduce((acc, c) => {
                        acc[c.id] = c;
                        return acc;
                    }, {});
                }
            }

            // Attach user and company info to each session
            const data = sessions.map(session => ({
                ...session,
                user: session.user_id ? usersMap[session.user_id] || null : null,
                company_profile: session.company_profile_id ? companiesMap[session.company_profile_id] || null : null
            }));

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error listing admin sessions:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/align120/admin/sessions/:id
     * Delete any session (admin only)
     */
    router.delete('/admin/sessions/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { deleteCompanyProfile } = req.query;

            // Check if user is admin
            const isAdmin = await isAdminAsync(req, supabase);
            if (!isAdmin) {
                return res.status(403).json({
                    success: false,
                    error: 'Admin access required'
                });
            }

            // Get session first to check for company_profile_id
            const { data: session, error: fetchError } = await supabase
                .from('align120_sessions')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError) {
                if (fetchError.code === 'PGRST116') {
                    return res.status(404).json({
                        success: false,
                        error: 'Session not found'
                    });
                }
                throw fetchError;
            }

            // Delete the session
            const { error: deleteError } = await supabase
                .from('align120_sessions')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            // Optionally delete associated company profile
            if (deleteCompanyProfile === 'true' && session.company_profile_id) {
                await supabase
                    .from('company_profiles')
                    .delete()
                    .eq('id', session.company_profile_id);
            }

            res.json({
                success: true,
                message: 'Session deleted',
                deletedCompanyProfile: deleteCompanyProfile === 'true' && session.company_profile_id
            });
        } catch (error) {
            console.error('Error deleting session (admin):', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/align120/admin/company-profiles
     * Get all company profiles (admin only)
     */
    router.get('/admin/company-profiles', async (req, res) => {
        try {
            // Check if user is admin
            const isAdmin = await isAdminAsync(req, supabase);
            if (!isAdmin) {
                return res.status(403).json({
                    success: false,
                    error: 'Admin access required'
                });
            }

            // Fetch all company profiles
            const { data: profiles, error } = await supabase
                .from('company_profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Get unique user IDs
            const userIds = [...new Set(profiles.map(p => p.user_id).filter(Boolean))];

            // Fetch users
            let usersMap = {};
            if (userIds.length > 0) {
                const { data: users } = await supabase
                    .from('users')
                    .select('id, display_name, email')
                    .in('id', userIds);

                if (users) {
                    usersMap = users.reduce((acc, u) => {
                        acc[u.id] = u;
                        return acc;
                    }, {});
                }
            }

            // Attach user info
            const data = profiles.map(profile => ({
                ...profile,
                user: profile.user_id ? usersMap[profile.user_id] || null : null
            }));

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error listing company profiles (admin):', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/align120/admin/company-profiles/:id
     * Delete a company profile (admin only)
     */
    router.delete('/admin/company-profiles/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Check if user is admin
            const isAdmin = await isAdminAsync(req, supabase);
            if (!isAdmin) {
                return res.status(403).json({
                    success: false,
                    error: 'Admin access required'
                });
            }

            // Delete the company profile (cascade will handle related records)
            const { error } = await supabase
                .from('company_profiles')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({ success: true, message: 'Company profile deleted' });
        } catch (error) {
            console.error('Error deleting company profile (admin):', error);
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
     * POST /api/align120/sessions/:id/run-module-stream
     * Run AI agents for a specific module with SSE streaming
     * Used by the Modal Dialog Service for live progress updates
     */
    router.post('/sessions/:id/run-module-stream', async (req, res) => {
        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        // Helper to send SSE events
        const sendEvent = (data) => {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        try {
            const { id } = req.params;
            const { agentId, context } = req.body;
            const moduleNum = context?.moduleNum || parseInt(agentId?.split('-').pop()) || 1;
            const userId = getUserId(req);

            if (!moduleNum || moduleNum < 1 || moduleNum > 5) {
                sendEvent({ type: 'error', error: 'Valid module number (1-5) is required' });
                res.end();
                return;
            }

            sendEvent({ type: 'progress', percent: 0, status: 'Loading session...' });

            // Get the session
            const { data: session, error: sessionError } = await supabase
                .from('align120_sessions')
                .select('*')
                .eq('id', id)
                .single();

            if (sessionError) throw sessionError;

            sendEvent({ type: 'progress', percent: 5, status: 'Loading agents...' });

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

            const agentList = agents || [];
            const totalAgents = agentList.length || 1;

            sendEvent({
                type: 'progress',
                percent: 10,
                status: `Found ${totalAgents} agent(s) for module ${moduleNum}`
            });

            // Build context message for agents
            const contextMessage = `
You are running an Align 120 assessment for ${session.company_name}.
Module: ${moduleNum} - ${moduleNames[moduleNum]}

${context?.companyContext ? `Company Context:\n${context.companyContext}\n\n` : ''}
Please provide a comprehensive assessment based on the available information.
Format your response as a structured analysis with clear sections and actionable insights.
`;

            // Execute each agent and stream results
            const agentResults = [];
            const outputs = {};
            let fullResponse = '';

            for (let i = 0; i < agentList.length; i++) {
                const agent = agentList[i];
                const agentProgress = 10 + ((i / totalAgents) * 80);

                sendEvent({
                    type: 'progress',
                    percent: agentProgress,
                    status: `Running ${agent.name}...`
                });

                try {
                    // Stream the agent execution
                    await new Promise((resolve, reject) => {
                        agentService.streamAgent(agent.id, {
                            userMessage: contextMessage,
                            userId: userId,
                            conversationHistory: [],
                            onToken: (token) => {
                                fullResponse += token;
                                sendEvent({ type: 'content', content: token });
                            },
                            onComplete: (meta) => {
                                agentResults.push({
                                    agent_id: agent.id,
                                    agent_name: agent.name,
                                    response: fullResponse,
                                    execution_id: meta.execution_id,
                                    usage: meta.usage,
                                    duration_ms: meta.duration_ms
                                });

                                outputs[agent.name.toLowerCase().replace(/\s+/g, '_')] = {
                                    completed: true,
                                    response: fullResponse,
                                    execution_id: meta.execution_id
                                };

                                fullResponse = ''; // Reset for next agent
                                resolve();
                            },
                            onError: (error) => {
                                agentResults.push({
                                    agent_id: agent.id,
                                    agent_name: agent.name,
                                    error: error.message
                                });
                                outputs[agent.name.toLowerCase().replace(/\s+/g, '_')] = {
                                    completed: false,
                                    error: error.message
                                };
                                resolve(); // Continue to next agent
                            }
                        });
                    });

                    // Add separator between agents
                    if (i < agentList.length - 1) {
                        sendEvent({ type: 'content', content: '\n\n---\n\n' });
                    }

                } catch (agentError) {
                    console.error(`Error running agent ${agent.name}:`, agentError);
                    sendEvent({
                        type: 'content',
                        content: `\n\n[Error running ${agent.name}: ${agentError.message}]\n\n`
                    });
                }
            }

            sendEvent({ type: 'progress', percent: 95, status: 'Saving results...' });

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

            sendEvent({ type: 'progress', percent: 100, status: 'Complete' });

            // Send completion event with result data
            sendEvent({
                type: 'complete',
                result: {
                    module: moduleNum,
                    module_name: moduleNames[moduleNum],
                    agents_run: agentResults.length,
                    results: agentResults,
                    outputs
                }
            });

        } catch (error) {
            console.error('Error running module (stream):', error);
            sendEvent({ type: 'error', error: error.message });
        } finally {
            res.end();
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
                        company_name: session.company_name,
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
                        company_name: session.company_name,
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
    // INTEGRATION & SYNC ENDPOINTS
    // ============================================================================

    /**
     * POST /api/align120/sessions/:id/sync-module
     * Sync module outputs to downstream systems (DIGM, Strategy, Parthenon, Integrity)
     */
    router.post('/sessions/:id/sync-module', async (req, res) => {
        try {
            const { id } = req.params;
            const { moduleNum, outputs } = req.body;
            const userId = getUserId(req);

            if (!moduleNum || moduleNum < 1 || moduleNum > 5) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid module number (1-5) is required'
                });
            }

            const syncResults = await integrationService.syncModule(moduleNum, id, outputs, userId);

            res.json({
                success: true,
                data: {
                    module: moduleNum,
                    sync_results: syncResults
                }
            });
        } catch (error) {
            console.error('Error syncing module:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/align120/sessions/:id/generate-brief
     * Generate the consolidated Alignment Brief
     */
    router.post('/sessions/:id/generate-brief', async (req, res) => {
        try {
            const { id } = req.params;

            const brief = await integrationService.generateAlignmentBrief(id);

            res.json({
                success: true,
                data: brief
            });
        } catch (error) {
            console.error('Error generating alignment brief:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/align120/sessions/:id/brief
     * Get the Alignment Brief for a session
     */
    router.get('/sessions/:id/brief', async (req, res) => {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('alignment_briefs')
                .select('*')
                .eq('session_id', id)
                .single();

            if (error) {
                // If no brief exists, generate one
                if (error.code === 'PGRST116') {
                    const brief = await integrationService.generateAlignmentBrief(id);
                    return res.json({ success: true, data: brief });
                }
                throw error;
            }

            res.json({ success: true, data: data.brief_data });
        } catch (error) {
            console.error('Error getting alignment brief:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/align120/sessions/:id/save-report
     * Save the final AI Readiness Report
     */
    router.post('/sessions/:id/save-report', async (req, res) => {
        try {
            const { id } = req.params;
            const { report, conversationHistory } = req.body;
            const userId = getUserId(req);

            // Update the session with the final report
            const { error } = await supabase
                .from('align120_sessions')
                .update({
                    final_report: report,
                    final_report_conversation: conversationHistory,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('user_id', userId);

            if (error) {
                console.error('Error saving report:', error);
                // Non-critical - report is displayed to user anyway
            }

            res.json({
                success: true,
                message: 'Report saved successfully'
            });
        } catch (error) {
            console.error('Error saving report:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // WEB SCRAPER ENDPOINTS (Module 4 - Brand Analysis)
    // ============================================================================

    /**
     * POST /api/align120/analyze-website
     * Scrape and analyze a company website for brand information
     */
    router.post('/analyze-website', async (req, res) => {
        try {
            const { url, maxPages = 5, includeRawContent = false } = req.body;
            const userId = getUserId(req);

            if (!url) {
                return res.status(400).json({
                    success: false,
                    error: 'Website URL is required'
                });
            }

            const analysis = await webScraperService.analyzeWebsite(url, {
                maxPages,
                userId,
                includeRawContent
            });

            res.json({
                success: true,
                data: analysis
            });
        } catch (error) {
            console.error('Error analyzing website:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/align120/sessions/:id/analyze-website
     * Analyze website and store results for a session
     */
    router.post('/sessions/:id/analyze-website', async (req, res) => {
        try {
            const { id } = req.params;
            const { url, maxPages = 5 } = req.body;
            const userId = getUserId(req);

            if (!url) {
                return res.status(400).json({
                    success: false,
                    error: 'Website URL is required'
                });
            }

            // Analyze website
            const analysis = await webScraperService.analyzeWebsite(url, {
                maxPages,
                userId,
                includeRawContent: false
            });

            // Store in session
            const { data: session } = await supabase
                .from('align120_sessions')
                .select('module_results')
                .eq('id', id)
                .single();

            const moduleResults = session?.module_results || {};
            moduleResults.website_analysis = {
                url,
                analyzed_at: new Date().toISOString(),
                pages_analyzed: analysis.pages_analyzed,
                analysis: analysis.analysis
            };

            await supabase
                .from('align120_sessions')
                .update({
                    module_results: moduleResults,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            res.json({
                success: true,
                data: {
                    session_id: id,
                    analysis
                }
            });
        } catch (error) {
            console.error('Error analyzing website for session:', error);
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
