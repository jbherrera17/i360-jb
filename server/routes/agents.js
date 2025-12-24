/**
 * INSIGHT 360 - Agent API Routes
 * Version: 2.4.0
 * 
 * Endpoints:
 *   - Agent CRUD (8 endpoints)
 *   - Context Mapping (5 endpoints)
 *   - Execution (4 endpoints)
 */

const express = require('express');
const { assembleContext, estimateTokens } = require('../services/contextInjection');
const { executeAgent, streamAgent } = require('../services/agentService');

/**
 * Agent Routes Factory
 * @param {object} supabase - Supabase client instance
 * @returns {Router} Express router
 */
module.exports = function(supabase) {
    const router = express.Router();

    // ============================================================================
    // AGENT CRUD ENDPOINTS
    // ============================================================================

    /**
     * GET /api/agents
     * List all agents with optional filters
     */
    router.get('/', async (req, res) => {
        try {
            const {
                category,
                suite,
                provider,
                active,
                search,
                sort = 'name',
                order = 'asc',
                limit = 50,
                offset = 0
            } = req.query;

            let query = supabase
                .from('agent_summary')
                .select('*');

            // Apply filters
            if (category && category !== 'all') {
                query = query.eq('category', category);
            }
            if (suite && suite !== 'all') {
                query = query.eq('suite', suite);
            }
            if (provider && provider !== 'all') {
                query = query.eq('llm_provider', provider);
            }
            if (active !== undefined) {
                query = query.eq('is_active', active === 'true');
            }
            if (search) {
                query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
            }

            // Apply sorting
            const sortColumn = ['name', 'created_at', 'usage_count', 'last_used_at'].includes(sort) 
                ? sort : 'name';
            query = query.order(sortColumn, { ascending: order === 'asc' });

            // Apply pagination
            query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            const { data, error, count } = await query;

            if (error) throw error;

            res.json({
                success: true,
                data: data || [],
                pagination: {
                    total: count,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            });

        } catch (error) {
            console.error('Error listing agents:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });

    /**
     * GET /api/agents/suites
     * Get available suites with counts
     */
    router.get('/suites', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('agents')
                .select('suite');

            if (error) throw error;

            const counts = {
                align: 0,
                strategy: 0,
                execute: 0,
                unassigned: 0
            };

            (data || []).forEach(agent => {
                if (agent.suite && counts.hasOwnProperty(agent.suite)) {
                    counts[agent.suite]++;
                } else {
                    counts.unassigned++;
                }
            });

            res.json({
                success: true,
                data: {
                    suites: [
                        { id: 'align', name: 'Align 120', description: 'Foundation & Alignment', count: counts.align },
                        { id: 'strategy', name: 'Strategy 120', description: 'Planning & Research', count: counts.strategy },
                        { id: 'execute', name: 'Execute 120', description: 'Action & Delivery', count: counts.execute }
                    ],
                    unassigned: counts.unassigned,
                    total: data?.length || 0
                }
            });

        } catch (error) {
            console.error('Error getting suites:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/agents/seed-suites
     * Assign suite values to existing agents based on their purpose
     */
    router.post('/seed-suites', async (req, res) => {
        try {
            const suiteAssignments = [
                // Align 120 Suite (Foundation/Alignment)
                { id: 'a0000000-0000-0000-0000-000000000101', suite: 'align' },  // Integrity Auditor
                { id: 'a0000000-0000-0000-0000-000000000102', suite: 'align' },  // Risk Sentinel
                { id: 'a0000000-0000-0000-0000-000000000103', suite: 'align' },  // Counterfactual Analyst

                // Strategy 120 Suite (Planning)
                { id: 'a1000001-0001-0001-0001-000000000003', suite: 'strategy' },  // Strategy Advisor
                { id: 'a1000001-0001-0001-0001-000000000006', suite: 'strategy' },  // Research Analyst
                { id: 'a1000001-0001-0001-0001-000000000004', suite: 'strategy' },  // Daily Briefer

                // Execute 120 Suite (Action/Delivery)
                { id: 'a1000001-0001-0001-0001-000000000001', suite: 'execute' },  // Content Writer
                { id: 'a1000001-0001-0001-0001-000000000002', suite: 'execute' },  // Sales Assistant
                { id: 'a1000001-0001-0001-0001-000000000005', suite: 'execute' }   // Email Composer
            ];

            const results = [];
            for (const assignment of suiteAssignments) {
                const { data, error } = await supabase
                    .from('agents')
                    .update({ suite: assignment.suite })
                    .eq('id', assignment.id)
                    .select('id, name, suite');

                if (error) {
                    results.push({ id: assignment.id, error: error.message });
                } else if (data && data.length > 0) {
                    results.push({ id: assignment.id, name: data[0].name, suite: data[0].suite, success: true });
                }
            }

            res.json({
                success: true,
                message: 'Suite assignments updated',
                data: results
            });

        } catch (error) {
            console.error('Error seeding suites:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/agents/categories
     * List available agent categories
     */
    router.get('/categories', async (req, res) => {
        console.log('>>> Categories route hit');
        try {
            const { data, error } = await supabase
                .from('agent_categories')
                .select('*')
                .eq('is_active', true)
                .order('sort_order');

            if (error) throw error;

            res.json({
                success: true,
                data: data || []
            });

        } catch (error) {
            console.error('Error listing categories:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });

    /**
     * GET /api/agents/:id
     * Get single agent with context mappings
     */
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Get agent details
            const { data: agent, error: agentError } = await supabase
                .from('agents')
                .select('*')
                .eq('id', id)
                .single();

            if (agentError) throw agentError;
            if (!agent) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Agent not found' 
                });
            }

            // Get context mappings
            const { data: mappings, error: mappingsError } = await supabase
                .from('agent_context_mappings')
                .select(`
                    *,
                    context_assets (
                        id, name, asset_type, description, 
                        content_json, version, usage_count
                    )
                `)
                .eq('agent_id', id)
                .eq('is_active', true)
                .order('priority', { ascending: false });

            if (mappingsError) throw mappingsError;

            res.json({
                success: true,
                data: {
                    ...agent,
                    context_mappings: mappings || []
                }
            });

        } catch (error) {
            console.error('Error getting agent:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });

    /**
     * POST /api/agents
     * Create new agent
     */
    router.post('/', async (req, res) => {
        try {
            const {
                name,
                description,
                icon = '🤖',
                category = 'custom',
                llm_provider = 'anthropic',
                llm_model = 'claude-3-5-sonnet-20241022',
                temperature = 0.7,
                max_tokens = 4096,
                system_prompt,
                conversation_starters = [],
                guardrails = {}
            } = req.body;

            // Validate required fields
            if (!name || !system_prompt) {
                return res.status(400).json({
                    success: false,
                    error: 'Name and system_prompt are required'
                });
            }

            // Get user ID from auth (if available)
            const userId = req.user?.id || null;

            const agentData = {
                id: uuidv4(),
                user_id: userId,
                name,
                description,
                icon,
                category,
                llm_provider,
                llm_model,
                temperature: parseFloat(temperature),
                max_tokens: parseInt(max_tokens),
                system_prompt,
                conversation_starters,
                guardrails: {
                    max_context_tokens: 8000,
                    require_context: false,
                    allowed_topics: [],
                    blocked_topics: [],
                    output_format: null,
                    ...guardrails
                },
                is_active: true,
                created_by: userId
            };

            const { data, error } = await supabase
                .from('agents')
                .insert(agentData)
                .select()
                .single();

            if (error) throw error;

            res.status(201).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error creating agent:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });

    /**
     * PUT /api/agents/:id
     * Update agent
     */
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Remove fields that shouldn't be updated directly
            delete updates.id;
            delete updates.user_id;
            delete updates.created_at;
            delete updates.created_by;
            delete updates.usage_count;

            // Parse numeric fields
            if (updates.temperature !== undefined) {
                updates.temperature = parseFloat(updates.temperature);
            }
            if (updates.max_tokens !== undefined) {
                updates.max_tokens = parseInt(updates.max_tokens);
            }

            const { data, error } = await supabase
                .from('agents')
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
            console.error('Error updating agent:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });

    /**
     * DELETE /api/agents/:id
     * Delete agent (soft delete by setting is_active = false)
     */
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { hard = false } = req.query;

            if (hard === 'true') {
                // Hard delete
                const { error } = await supabase
                    .from('agents')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            } else {
                // Soft delete
                const { error } = await supabase
                    .from('agents')
                    .update({ is_active: false })
                    .eq('id', id);

                if (error) throw error;
            }

            res.json({
                success: true,
                message: `Agent ${hard === 'true' ? 'permanently deleted' : 'deactivated'}`
            });

        } catch (error) {
            console.error('Error deleting agent:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });

    /**
     * POST /api/agents/:id/duplicate
     * Duplicate an agent
     */
    router.post('/:id/duplicate', async (req, res) => {
        try {
            const { id } = req.params;
            const { name: newName } = req.body;

            // Get original agent
            const { data: original, error: getError } = await supabase
                .from('agents')
                .select('*')
                .eq('id', id)
                .single();

            if (getError) throw getError;
            if (!original) {
                return res.status(404).json({
                    success: false,
                    error: 'Agent not found'
                });
            }

            // Create duplicate
            const userId = req.user?.id || original.user_id;
            const duplicateData = {
                ...original,
                id: uuidv4(),
                name: newName || `${original.name} (Copy)`,
                user_id: userId,
                created_by: userId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                usage_count: 0,
                last_used_at: null
            };

            const { data, error } = await supabase
                .from('agents')
                .insert(duplicateData)
                .select()
                .single();

            if (error) throw error;

            // Also duplicate context mappings
            const { data: mappings } = await supabase
                .from('agent_context_mappings')
                .select('*')
                .eq('agent_id', id);

            if (mappings && mappings.length > 0) {
                const newMappings = mappings.map(m => ({
                    ...m,
                    id: uuidv4(),
                    agent_id: data.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }));

                await supabase
                    .from('agent_context_mappings')
                    .insert(newMappings);
            }

            res.status(201).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error duplicating agent:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });

    /**
     * GET /api/agents/:id/stats
     * Get agent statistics
     */
    router.get('/:id/stats', async (req, res) => {
        try {
            const { id } = req.params;
            const { days = 30 } = req.query;

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

            // Get execution stats
            const { data: executions, error } = await supabase
                .from('agent_executions')
                .select('status, duration_ms, total_tokens, created_at')
                .eq('agent_id', id)
                .gte('created_at', cutoffDate.toISOString());

            if (error) throw error;

            const stats = {
                total_executions: executions.length,
                successful: executions.filter(e => e.status === 'success').length,
                failed: executions.filter(e => e.status === 'error').length,
                avg_duration_ms: executions.length > 0 
                    ? Math.round(executions.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / executions.length)
                    : 0,
                total_tokens_used: executions.reduce((sum, e) => sum + (e.total_tokens || 0), 0),
                period_days: parseInt(days)
            };

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Error getting agent stats:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });

    // ============================================================================
    // CONTEXT MAPPING ENDPOINTS
    // ============================================================================

    /**
     * GET /api/agents/:id/context
     * Get all context mappings for an agent
     */
    router.get('/:id/context', async (req, res) => {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('agent_context_mappings')
                .select(`
                    *,
                    context_assets (
                        id, name, asset_type, description,
                        content_text, version, usage_count
                    )
                `)
                .eq('agent_id', id)
                .order('priority', { ascending: false });

            if (error) throw error;

            // Add token estimates
            const mappingsWithTokens = data.map(mapping => ({
                ...mapping,
                estimated_tokens: mapping.context_assets?.content_text 
                    ? estimateTokens(mapping.context_assets.content_text)
                    : 0
            }));

            res.json({
                success: true,
                data: mappingsWithTokens
            });

        } catch (error) {
            console.error('Error getting context mappings:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });

    /**
     * POST /api/agents/:id/context
     * Add context asset mapping to agent
     */
    router.post('/:id/context', async (req, res) => {
        try {
            const { id } = req.params;
            const {
                asset_id,
                injection_mode = 'always',
                priority = 50,
                trigger_keywords = [],
                trigger_regex = null,
                max_tokens = null,
                truncation_strategy = 'end'
            } = req.body;

            if (!asset_id) {
                return res.status(400).json({
                    success: false,
                    error: 'asset_id is required'
                });
            }

            const mappingData = {
                id: uuidv4(),
                agent_id: id,
                asset_id,
                injection_mode,
                priority: parseInt(priority),
                trigger_keywords,
                trigger_regex,
                max_tokens: max_tokens ? parseInt(max_tokens) : null,
                truncation_strategy,
                is_active: true
            };

            const { data, error } = await supabase
                .from('agent_context_mappings')
                .insert(mappingData)
                .select(`
                    *,
                    context_assets (
                        id, name, asset_type, description
                    )
                `)
                .single();

            if (error) {
                if (error.code === '23505') { // Unique violation
                    return res.status(409).json({
                        success: false,
                        error: 'This context asset is already mapped to this agent'
                    });
                }
                throw error;
            }

            res.status(201).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error adding context mapping:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });

    /**
     * PUT /api/agents/:id/context/:mappingId
     * Update context mapping
     */
    router.put('/:id/context/:mappingId', async (req, res) => {
        try {
            const { mappingId } = req.params;
            const updates = req.body;

            // Only allow specific fields to be updated
            const allowedFields = ['injection_mode', 'priority', 'trigger_keywords', 
                                   'trigger_regex', 'max_tokens', 'truncation_strategy', 'is_active'];
            const sanitizedUpdates = {};
            
            Object.keys(updates).forEach(key => {
                if (allowedFields.includes(key)) {
                    sanitizedUpdates[key] = updates[key];
                }
            });

            if (sanitizedUpdates.priority !== undefined) {
                sanitizedUpdates.priority = parseInt(sanitizedUpdates.priority);
            }
            if (sanitizedUpdates.max_tokens !== undefined && sanitizedUpdates.max_tokens !== null) {
                sanitizedUpdates.max_tokens = parseInt(sanitizedUpdates.max_tokens);
            }

            const { data, error } = await supabase
                .from('agent_context_mappings')
                .update(sanitizedUpdates)
                .eq('id', mappingId)
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error updating context mapping:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });

    /**
     * DELETE /api/agents/:id/context/:mappingId
     * Remove context mapping
     */
    router.delete('/:id/context/:mappingId', async (req, res) => {
        try {
            const { mappingId } = req.params;

            const { error } = await supabase
                .from('agent_context_mappings')
                .delete()
                .eq('id', mappingId);

            if (error) throw error;

            res.json({
                success: true,
                message: 'Context mapping removed successfully'
            });

        } catch (error) {
            console.error('Error removing context mapping:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });

    /**
     * POST /api/agents/:id/context/preview
     * Preview assembled context for an agent
     */
    router.post('/:id/context/preview', async (req, res) => {
        try {
            const { id } = req.params;
            const { user_message = '' } = req.body;

            const contextResult = await assembleContext(id, {
                userQuery: user_message,
                returnDetails: true
            });

            res.json({
                success: true,
                data: contextResult
            });

        } catch (error) {
            console.error('Error previewing context:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });

    // ============================================================================
    // EXECUTION ENDPOINTS
    // ============================================================================

    /**
     * POST /api/agents/:id/execute
     * Execute agent with message (non-streaming)
     */
    router.post('/:id/execute', async (req, res) => {
        try {
            const { id } = req.params;
            const { message, conversation_history = [] } = req.body;

            if (!message) {
                return res.status(400).json({
                    success: false,
                    error: 'Message is required'
                });
            }

            const userId = req.user?.id || null;

            const result = await executeAgent(id, {
                userMessage: message,
                conversationHistory: conversation_history,
                userId
            });

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Error executing agent:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });

    /**
     * POST /api/agents/:id/execute/stream
     * Execute agent with streaming response (SSE)
     */
    router.post('/:id/execute/stream', async (req, res) => {
        try {
            const { id } = req.params;
            const { message, conversation_history = [] } = req.body;

            if (!message) {
                return res.status(400).json({
                    success: false,
                    error: 'Message is required'
                });
            }

            // Set up SSE
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no');

            const userId = req.user?.id || null;

            await streamAgent(id, {
                userMessage: message,
                conversationHistory: conversation_history,
                userId,
                onToken: (token) => {
                    res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
                },
                onComplete: (result) => {
                    res.write(`data: ${JSON.stringify({ type: 'complete', ...result })}\n\n`);
                    res.write('data: [DONE]\n\n');
                    res.end();
                },
                onError: (error) => {
                    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
                    res.end();
                }
            });

        } catch (error) {
            console.error('Error streaming agent:', error);
            res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
            res.end();
        }
    });

    /**
     * GET /api/agents/:id/executions
     * Get execution history for an agent
     */
    router.get('/:id/executions', async (req, res) => {
        try {
            const { id } = req.params;
            const { limit = 20, offset = 0 } = req.query;

            const { data, error, count } = await supabase
                .from('agent_executions')
                .select('*', { count: 'exact' })
                .eq('agent_id', id)
                .order('created_at', { ascending: false })
                .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            if (error) throw error;

            res.json({
                success: true,
                data: data || [],
                pagination: {
                    total: count,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            });

        } catch (error) {
            console.error('Error getting executions:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });

    /**
     * GET /api/agents/:id/executions/:execId
     * Get single execution details
     */
    router.get('/:id/executions/:execId', async (req, res) => {
        try {
            const { execId } = req.params;

            const { data, error } = await supabase
                .from('agent_executions')
                .select('*')
                .eq('id', execId)
                .single();

            if (error) throw error;
            if (!data) {
                return res.status(404).json({
                    success: false,
                    error: 'Execution not found'
                });
            }

            res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error getting execution:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
};