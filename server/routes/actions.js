/**
 * INSIGHT 360 - Actions API Routes
 * Version: 1.0.0
 *
 * Composable web app actions:
 *   - Actions CRUD (8 endpoints)
 *   - Action Templates (4 endpoints)
 *   - Action Executions (4 endpoints)
 *   - External AI Configs (4 endpoints)
 */

const express = require('express');
const { randomUUID: uuidv4 } = require('crypto');
const anthropicService = require('../services/anthropic');
const unifiedRuntime = require('../services/unifiedRuntime');
const { getUserId } = require('../utils/auth');

/**
 * Actions Routes Factory
 * @param {object} supabase - Supabase client instance
 * @returns {Router} Express router
 */
module.exports = function(supabase) {
    const router = express.Router();

    /**
     * Build system prompt for action execution
     * @param {object} action - Action configuration
     * @returns {string} System prompt
     */
    function buildActionSystemPrompt(action) {
        let prompt = `You are an AI assistant executing the action "${action.name}".`;

        if (action.description) {
            prompt += `\n\nAction Description: ${action.description}`;
        }

        if (action.instructions) {
            prompt += `\n\nInstructions:\n${action.instructions}`;
        }

        if (action.output_format) {
            prompt += `\n\nExpected Output Format: ${action.output_format}`;
        }

        // Add any context from the action's configuration
        if (action.system_prompt) {
            prompt += `\n\n${action.system_prompt}`;
        }

        return prompt;
    }

    /**
     * Build user message for action execution
     * @param {object} action - Action configuration
     * @param {object} inputData - User-provided input data
     * @returns {string} User message
     */
    function buildActionUserMessage(action, inputData) {
        let message = '';

        // If there's a prompt template, use it
        if (action.prompt_template) {
            message = action.prompt_template;
            // Replace placeholders with input data
            for (const [key, value] of Object.entries(inputData)) {
                message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
                message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
            }
        } else {
            // Build message from input data
            if (inputData.message || inputData.input || inputData.query) {
                message = inputData.message || inputData.input || inputData.query;
            } else if (Object.keys(inputData).length > 0) {
                message = 'Please process the following input:\n\n';
                for (const [key, value] of Object.entries(inputData)) {
                    message += `${key}: ${value}\n`;
                }
            } else {
                message = 'Execute this action with default parameters.';
            }
        }

        return message;
    }

    // Phase 44: Module access middleware for Actions/Parthenon
    // Checks if user's tier and role allow access to this module
    router.use(async (req, res, next) => {
        try {
            const userId = req.userId;
            const orgId = req.headers['x-org-id'] || req.orgId || null;

            // Skip check if no user context (will fail auth later anyway)
            if (!userId) {
                return next();
            }

            // Check module access using database function
            const { data: canAccess, error } = await supabase
                .rpc('can_access_module', {
                    p_user_id: userId,
                    p_module_id: 'actions',
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
                    error: 'Actions module requires appropriate subscription and role',
                    module: 'actions',
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
    // ACTIONS CRUD ENDPOINTS
    // ============================================================================

    /**
     * GET /api/actions
     * List all actions with optional filters
     */
    router.get('/', async (req, res) => {
        try {
            const {
                suite,
                status,
                search,
                featured,
                department_id,
                sort = 'name',
                order = 'asc',
                limit: rawLimit = 50,
                offset: rawOffset = 0
            } = req.query;

            // Validate pagination bounds to prevent DoS
            const MAX_LIMIT = 100;
            const limit = Math.min(Math.max(1, parseInt(rawLimit) || 50), MAX_LIMIT);
            const offset = Math.max(0, parseInt(rawOffset) || 0);

            const userId = getUserId(req);

            // If department_id is provided, first get action IDs from junction table
            let departmentActionIds = null;
            if (department_id) {
                const { data: deptActions, error: deptError } = await supabase
                    .from('action_departments')
                    .select('action_id')
                    .eq('department_id', department_id);

                if (deptError) throw deptError;
                departmentActionIds = (deptActions || []).map(da => da.action_id);
            }

            let query = supabase
                .from('actions')
                .select('*', { count: 'exact' });

            // User can see own actions + public actions
            if (userId) {
                query = query.or(`user_id.eq.${userId},is_public.eq.true`);
            } else {
                query = query.eq('is_public', true);
            }

            // === PHASE 46: Organization filtering ===
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            if (orgId) {
                // Show actions belonging to this org OR system actions (no org)
                query = query.or(`org_id.eq.${orgId},org_id.is.null`);
            }
            // === END PHASE 46 ===

            // Filter by department via junction table
            if (departmentActionIds !== null) {
                if (departmentActionIds.length > 0) {
                    query = query.in('id', departmentActionIds);
                } else {
                    // No actions assigned to this department
                    return res.json({
                        success: true,
                        data: [],
                        pagination: { total: 0, limit, offset }
                    });
                }
            }

            // Apply filters
            if (suite && suite !== 'all') {
                query = query.eq('suite', suite);
            }
            if (status && status !== 'all') {
                query = query.eq('status', status);
            }
            if (featured === 'true') {
                query = query.eq('is_featured', true);
            }
            if (search) {
                query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
            }

            // Apply sorting
            const sortColumn = ['name', 'created_at', 'usage_count', 'last_used_at'].includes(sort)
                ? sort : 'name';
            query = query.order(sortColumn, { ascending: order === 'asc' });

            // Apply pagination (values already validated above)
            query = query.range(offset, offset + limit - 1);

            const { data, error, count } = await query;

            if (error) throw error;

            res.json({
                success: true,
                data: data || [],
                pagination: {
                    total: count,
                    limit,
                    offset
                }
            });

        } catch (error) {
            console.error('Error listing actions:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/actions/featured
     * Get featured actions (for dashboard)
     */
    router.get('/featured', async (req, res) => {
        try {
            const { limit: rawLimit = 6 } = req.query;
            // Validate limit bounds (max 20 for featured)
            const limit = Math.min(Math.max(1, parseInt(rawLimit) || 6), 20);

            const { data, error } = await supabase
                .from('actions')
                .select('id, name, slug, description, icon, color, suite')
                .eq('is_featured', true)
                .eq('status', 'active')
                .order('usage_count', { ascending: false })
                .limit(limit);

            if (error) throw error;

            res.json({
                success: true,
                data: data || []
            });

        } catch (error) {
            console.error('Error getting featured actions:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/actions/:id
     * Get single action with full configuration
     */
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data: action, error: actionError } = await supabase
                .from('actions')
                .select('*')
                .eq('id', id)
                .single();

            if (actionError) throw actionError;
            if (!action) {
                return res.status(404).json({
                    success: false,
                    error: 'Action not found'
                });
            }

            // Get recent executions
            const { data: executions } = await supabase
                .from('action_executions')
                .select('id, status, created_at, duration_ms')
                .eq('action_id', id)
                .order('created_at', { ascending: false })
                .limit(5);

            res.json({
                success: true,
                data: {
                    ...action,
                    recent_executions: executions || []
                }
            });

        } catch (error) {
            console.error('Error getting action:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/actions/slug/:slug
     * Get action by slug
     */
    router.get('/slug/:slug', async (req, res) => {
        try {
            const { slug } = req.params;
            const userId = getUserId(req);

            let query = supabase
                .from('actions')
                .select('*')
                .eq('slug', slug);

            // Check user access
            if (userId) {
                query = query.or(`user_id.eq.${userId},is_public.eq.true`);
            } else {
                query = query.eq('is_public', true);
            }

            const { data, error } = await query.single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return res.status(404).json({
                        success: false,
                        error: 'Action not found'
                    });
                }
                throw error;
            }

            res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error getting action by slug:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/actions
     * Create new action
     */
    router.post('/', async (req, res) => {
        try {
            const {
                name,
                slug,
                description,
                icon = 'zap',
                color = '#6366f1',
                suite = 'execute',
                context_assets = [],
                parthenon_context = {},
                ai_engine,
                ux_config = {},
                status = 'draft',
                is_public = false,
                is_featured = false
            } = req.body;

            if (!name || !slug) {
                return res.status(400).json({
                    success: false,
                    error: 'Name and slug are required'
                });
            }

            const userId = getUserId(req);
            const orgId = req.headers['x-org-id'] || req.body.org_id;

            // Phase 44: Check organization resource limits
            if (orgId) {
                const { data: limits, error: limitError } = await supabase
                    .rpc('check_org_limits', {
                        p_org_id: orgId,
                        p_resource_type: 'actions'
                    });

                if (!limitError && limits?.[0] && !limits[0].within_limits) {
                    return res.status(403).json({
                        success: false,
                        error: `Action limit reached (${limits[0].current_count}/${limits[0].max_allowed}). Please upgrade your subscription.`,
                        upgrade_required: true,
                        current_count: limits[0].current_count,
                        max_allowed: limits[0].max_allowed
                    });
                }
            }

            // Generate slug if not provided
            const actionSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

            const actionData = {
                id: uuidv4(),
                user_id: userId,
                org_id: orgId || null,
                name,
                slug: actionSlug,
                description,
                icon,
                color,
                suite,
                context_assets,
                parthenon_context,
                ai_engine: ai_engine || {
                    type: 'native',
                    native: {
                        model: 'claude-sonnet-4',
                        temperature: 0.7
                    }
                },
                ux_config,
                status,
                is_public,
                is_featured,
                usage_count: 0
            };

            const { data, error } = await supabase
                .from('actions')
                .insert(actionData)
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    return res.status(409).json({
                        success: false,
                        error: 'An action with this slug already exists'
                    });
                }
                throw error;
            }

            res.status(201).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error creating action:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/actions/from-template/:templateSlug
     * Create action from template
     */
    router.post('/from-template/:templateSlug', async (req, res) => {
        try {
            const { templateSlug } = req.params;
            const { name, customizations = {}, department_id } = req.body;

            // Get template
            const { data: template, error: templateError } = await supabase
                .from('action_templates')
                .select('*')
                .eq('slug', templateSlug)
                .single();

            if (templateError || !template) {
                return res.status(404).json({
                    success: false,
                    error: 'Template not found'
                });
            }

            const userId = getUserId(req);
            const actionName = name || template.name;
            const actionSlug = actionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();

            const actionData = {
                id: uuidv4(),
                user_id: userId,
                name: actionName,
                slug: actionSlug,
                description: template.description,
                icon: customizations.icon || template.icon || 'zap',
                color: customizations.color || '#6366f1',
                suite: template.suite,
                context_assets: customizations.context_assets || template.context_assets,
                parthenon_context: customizations.parthenon_context || template.parthenon_context,
                ai_engine: customizations.ai_engine || template.ai_engine,
                ux_config: customizations.ux_config || template.ux_config,
                status: 'active',
                is_public: true,
                is_featured: false,
                usage_count: 0
            };

            const { data, error } = await supabase
                .from('actions')
                .insert(actionData)
                .select()
                .single();

            if (error) throw error;

            // Handle department assignment if provided
            if (department_id) {
                await supabase
                    .from('action_departments')
                    .insert({
                        action_id: data.id,
                        department_id,
                        is_primary: true
                    });
            }

            res.status(201).json({
                success: true,
                data: { ...data, department_id: department_id || null },
                template_used: template.slug
            });

        } catch (error) {
            console.error('Error creating action from template:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/actions/:id
     * Update action (user must own it)
     */
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;
            const userId = getUserId(req);

            // Verify ownership
            const { data: action, error: fetchError } = await supabase
                .from('actions')
                .select('user_id')
                .eq('id', id)
                .single();

            if (fetchError || !action) {
                return res.status(404).json({
                    success: false,
                    error: 'Action not found'
                });
            }

            if (action.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'You do not have permission to edit this action'
                });
            }

            // Remove protected fields
            delete updates.id;
            delete updates.user_id;
            delete updates.created_at;
            delete updates.usage_count;

            const { data, error } = await supabase
                .from('actions')
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
            console.error('Error updating action:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/actions/:id
     * Delete action (user must own it)
     */
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { hard = 'false' } = req.query;
            const userId = getUserId(req);

            // Verify ownership
            const { data: action, error: fetchError } = await supabase
                .from('actions')
                .select('user_id')
                .eq('id', id)
                .single();

            if (fetchError || !action) {
                return res.status(404).json({
                    success: false,
                    error: 'Action not found'
                });
            }

            if (action.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'You do not have permission to delete this action'
                });
            }

            if (hard === 'true') {
                const { error } = await supabase
                    .from('actions')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('actions')
                    .update({ status: 'archived' })
                    .eq('id', id);
                if (error) throw error;
            }

            res.json({
                success: true,
                message: `Action ${hard === 'true' ? 'permanently deleted' : 'archived'}`
            });

        } catch (error) {
            console.error('Error deleting action:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // ACTION TEMPLATES ENDPOINTS
    // ============================================================================

    /**
     * GET /api/actions/templates
     * List all action templates
     */
    router.get('/templates/list', async (req, res) => {
        try {
            const { suite, category } = req.query;

            let query = supabase
                .from('action_templates')
                .select('*')
                .eq('is_active', true)
                .order('sort_order');

            if (suite) query = query.eq('suite', suite);
            if (category) query = query.eq('category', category);

            const { data, error } = await query;

            if (error) throw error;

            res.json({
                success: true,
                data: data || []
            });

        } catch (error) {
            console.error('Error listing templates:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/actions/templates/:slug
     * Get single template
     */
    router.get('/templates/:slug', async (req, res) => {
        try {
            const { slug } = req.params;

            const { data, error } = await supabase
                .from('action_templates')
                .select('*')
                .eq('slug', slug)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return res.status(404).json({
                        success: false,
                        error: 'Template not found'
                    });
                }
                throw error;
            }

            res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error getting template:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // ACTION EXECUTIONS ENDPOINTS
    // ============================================================================

    /**
     * POST /api/actions/:id/execute
     * Execute an action
     */
    router.post('/:id/execute', async (req, res) => {
        try {
            const { id } = req.params;
            const {
                input_data = {},
                role_id = null,
                department_id = null
            } = req.body;

            const userId = getUserId(req);

            // Get the action
            const { data: action, error: actionError } = await supabase
                .from('actions')
                .select('*')
                .eq('id', id)
                .single();

            if (actionError || !action) {
                return res.status(404).json({
                    success: false,
                    error: 'Action not found'
                });
            }

            // Create execution record
            const executionId = uuidv4();
            const startedAt = new Date().toISOString();

            await supabase
                .from('action_executions')
                .insert({
                    id: executionId,
                    action_id: id,
                    user_id: userId,
                    role_id,
                    department_id,
                    input_data,
                    status: 'running',
                    started_at: startedAt
                });

            // Execute the action with AI
            let output_data;
            let aiEngine = 'native';
            let modelUsed = 'claude-sonnet-4-5-20250929';
            let runtimeMeta = null;

            try {
                // Build system prompt from action configuration
                let systemPrompt = buildActionSystemPrompt(action);

                // Build user message from input data
                const userMessage = buildActionUserMessage(action, input_data);

                // Determine model to use
                modelUsed = action.ai_engine?.native?.model || 'claude-sonnet-4-5-20250929';
                aiEngine = action.ai_engine?.type || 'native';

                // Collect always-injected context assets for richer execution context
                const { data: alwaysAssets } = await supabase
                    .from('action_context_assets')
                    .select('max_tokens, context_assets(name, asset_type, content_text)')
                    .eq('action_id', id)
                    .eq('injection_mode', 'always')
                    .order('priority', { ascending: false });

                if (alwaysAssets?.length) {
                    const assetBlock = alwaysAssets.map((asset) => {
                        const content = asset.context_assets?.content_text || '';
                        if (asset.max_tokens && content.length > asset.max_tokens * 4) {
                            return `## ${asset.context_assets?.name} (${asset.context_assets?.asset_type})\n${content.slice(0, asset.max_tokens * 4)}...`;
                        }
                        return `## ${asset.context_assets?.name} (${asset.context_assets?.asset_type})\n${content}`;
                    }).join('\n\n---\n\n');

                    if (assetBlock.trim()) {
                        systemPrompt += `\n\n# Action Context Assets\n\n${assetBlock}`;
                    }
                }

                // Execute through unified runtime backbone
                const runtimeResult = await unifiedRuntime.execute({
                    supabase,
                    module: 'actions',
                    org_id: req.headers['x-org-id'] || null,
                    user_id: userId,
                    department_id,
                    action_id: id,
                    quota_resource_type: 'actions',
                    profile_hint: 'policy',
                    risk_level: action.requires_approval ? 'medium' : 'low',
                    requires_rich_context: !!alwaysAssets?.length,
                    context_refs: (alwaysAssets || []).map(a => a.context_assets?.name).filter(Boolean),
                    provider_hint: 'anthropic',
                    model: modelUsed,
                    max_tokens: action.ai_engine?.native?.max_tokens || 4096,
                    operation: async ({ policy }) => anthropicService.chat({
                        message: userMessage,
                        model: modelUsed,
                        systemPrompt,
                        maxTokens: Math.min(action.ai_engine?.native?.max_tokens || 4096, policy.max_tokens || 4096)
                    }),
                    legacyOperation: async () => anthropicService.chat({
                        message: userMessage,
                        model: modelUsed,
                        systemPrompt,
                        maxTokens: action.ai_engine?.native?.max_tokens || 4096
                    })
                });

                if (runtimeResult.status === 'blocked') {
                    throw new Error(runtimeResult.error?.message || 'Action execution blocked by runtime controls');
                }
                if (runtimeResult.status === 'error') {
                    throw new Error(runtimeResult.error?.message || 'Action execution failed in runtime');
                }

                runtimeMeta = runtimeResult.runtime || null;
                const aiResponse = runtimeResult.raw || runtimeResult;

                output_data = {
                    response: aiResponse.content || aiResponse.text || '',
                    action_name: action.name,
                    input_received: input_data,
                    usage: aiResponse.usage,
                    model: modelUsed,
                    meta: {
                        runtime: runtimeMeta
                    }
                };
            } catch (aiError) {
                console.error('Action AI execution error:', aiError);
                // Update execution as failed
                await supabase
                    .from('action_executions')
                    .update({
                        status: 'failed',
                        error_message: aiError.message,
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', executionId);

                return res.status(500).json({
                    success: false,
                    error: 'Action execution failed: ' + aiError.message
                });
            }

            // Update execution record
            const completedAt = new Date().toISOString();
            // Use explicit getTime() for reliable millisecond calculation
            const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();

            const { data: execution, error: updateError } = await supabase
                .from('action_executions')
                .update({
                    status: 'completed',
                    output_data,
                    completed_at: completedAt,
                    duration_ms: durationMs,
                    ai_engine_used: aiEngine,
                    model_used: modelUsed
                })
                .eq('id', executionId)
                .select()
                .single();

            if (updateError) throw updateError;

            // Update action usage count
            await supabase
                .from('actions')
                .update({
                    usage_count: (action.usage_count || 0) + 1,
                    last_used_at: completedAt
                })
                .eq('id', id);

            res.json({
                success: true,
                data: {
                    execution_id: executionId,
                    output: output_data,
                    duration_ms: durationMs,
                    meta: {
                        runtime: runtimeMeta
                    }
                }
            });

        } catch (error) {
            console.error('Error executing action:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/actions/:id/executions
     * Get execution history for an action
     */
    router.get('/:id/executions', async (req, res) => {
        try {
            const { id } = req.params;
            const { limit: rawLimit = 20, offset: rawOffset = 0 } = req.query;

            // Validate pagination bounds to prevent DoS
            const MAX_LIMIT = 100;
            const limit = Math.min(Math.max(1, parseInt(rawLimit) || 20), MAX_LIMIT);
            const offset = Math.max(0, parseInt(rawOffset) || 0);

            const { data, error, count } = await supabase
                .from('action_executions')
                .select('*', { count: 'exact' })
                .eq('action_id', id)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;

            res.json({
                success: true,
                data: data || [],
                pagination: {
                    total: count,
                    limit,
                    offset
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
     * GET /api/actions/executions/:execId
     * Get single execution details
     */
    router.get('/executions/:execId', async (req, res) => {
        try {
            const { execId } = req.params;

            const { data, error } = await supabase
                .from('action_executions')
                .select(`
                    *,
                    actions (id, name, slug, suite)
                `)
                .eq('id', execId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return res.status(404).json({
                        success: false,
                        error: 'Execution not found'
                    });
                }
                throw error;
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

    // ============================================================================
    // EXTERNAL AI CONFIGS ENDPOINTS
    // ============================================================================

    /**
     * GET /api/actions/external-ai
     * List external AI configurations
     */
    router.get('/external-ai/list', async (req, res) => {
        try {
            const userId = getUserId(req);
            const { provider } = req.query;

            let query = supabase
                .from('external_ai_configs')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true);

            if (provider) {
                query = query.eq('provider', provider);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({
                success: true,
                data: data || []
            });

        } catch (error) {
            console.error('Error listing external AI configs:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/actions/external-ai
     * Create external AI configuration
     */
    router.post('/external-ai', async (req, res) => {
        try {
            const {
                name,
                description,
                provider,
                embed_url,
                config = {}
            } = req.body;

            if (!name || !provider || !embed_url) {
                return res.status(400).json({
                    success: false,
                    error: 'Name, provider, and embed_url are required'
                });
            }

            const userId = getUserId(req);

            const configData = {
                id: uuidv4(),
                user_id: userId,
                name,
                description,
                provider,
                embed_url,
                config,
                is_active: true
            };

            const { data, error } = await supabase
                .from('external_ai_configs')
                .insert(configData)
                .select()
                .single();

            if (error) throw error;

            res.status(201).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error creating external AI config:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/actions/external-ai/:id
     * Update external AI configuration
     */
    router.put('/external-ai/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            delete updates.id;
            delete updates.user_id;
            delete updates.created_at;

            const { data, error } = await supabase
                .from('external_ai_configs')
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
            console.error('Error updating external AI config:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/actions/external-ai/:id
     * Delete external AI configuration
     */
    router.delete('/external-ai/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('external_ai_configs')
                .update({ is_active: false })
                .eq('id', id);

            if (error) throw error;

            res.json({
                success: true,
                message: 'External AI configuration deactivated'
            });

        } catch (error) {
            console.error('Error deleting external AI config:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // STATS ENDPOINT
    // ============================================================================

    /**
     * GET /api/actions/stats
     * Get actions statistics
     */
    router.get('/stats/overview', async (req, res) => {
        try {
            const userId = getUserId(req);

            // Get counts
            const [
                { count: totalActions },
                { count: activeActions },
                { count: totalExecutions },
                { data: recentExecutions }
            ] = await Promise.all([
                supabase.from('actions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
                supabase.from('actions').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active'),
                supabase.from('action_executions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
                supabase.from('action_executions')
                    .select('id, status, duration_ms, created_at')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(10)
            ]);

            // Calculate success rate
            const successRate = recentExecutions?.length > 0
                ? (recentExecutions.filter(e => e.status === 'completed').length / recentExecutions.length * 100).toFixed(1)
                : 0;

            // Calculate avg duration
            const avgDuration = recentExecutions?.length > 0
                ? Math.round(recentExecutions.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / recentExecutions.length)
                : 0;

            res.json({
                success: true,
                data: {
                    total_actions: totalActions || 0,
                    active_actions: activeActions || 0,
                    total_executions: totalExecutions || 0,
                    success_rate: parseFloat(successRate),
                    avg_duration_ms: avgDuration
                }
            });

        } catch (error) {
            console.error('Error getting stats:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // PARTHENON CONTEXT ENDPOINTS
    // ============================================================================

    /**
     * GET /api/actions/:id/context
     * Get full Parthenon context for an action
     */
    router.get('/:id/context', async (req, res) => {
        try {
            const { id } = req.params;

            // Get action with all connected Parthenon elements
            const [
                { data: okrs, error: okrsError },
                { data: departments, error: deptsError },
                { data: processes, error: procsError },
                { data: roles, error: rolesError },
                { data: assets, error: assetsError }
            ] = await Promise.all([
                supabase
                    .from('action_okrs')
                    .select(`
                        *,
                        okrs (id, title, scope, period, progress, status, key_results)
                    `)
                    .eq('action_id', id),
                supabase
                    .from('action_departments')
                    .select(`
                        *,
                        departments (id, name, description, icon, color)
                    `)
                    .eq('action_id', id),
                supabase
                    .from('action_processes')
                    .select(`
                        *,
                        processes (id, name, type, steps, status)
                    `)
                    .eq('action_id', id),
                supabase
                    .from('action_roles')
                    .select(`
                        *,
                        roles (id, title, level, responsibilities, department_id)
                    `)
                    .eq('action_id', id),
                supabase
                    .from('action_context_assets')
                    .select(`
                        *,
                        context_assets (id, name, asset_type, content_text)
                    `)
                    .eq('action_id', id)
            ]);

            if (okrsError || deptsError || procsError || rolesError || assetsError) {
                throw okrsError || deptsError || procsError || rolesError || assetsError;
            }

            res.json({
                success: true,
                data: {
                    okrs: okrs || [],
                    departments: departments || [],
                    processes: processes || [],
                    roles: roles || [],
                    context_assets: assets || []
                }
            });

        } catch (error) {
            console.error('Error getting action context:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/actions/:id/okrs
     * Link OKRs to an action
     */
    router.post('/:id/okrs', async (req, res) => {
        try {
            const { id } = req.params;
            const { okr_id, relationship = 'supports', contribution_description, priority = 50, is_required = false } = req.body;

            if (!okr_id) {
                return res.status(400).json({
                    success: false,
                    error: 'okr_id is required'
                });
            }

            const linkData = {
                id: uuidv4(),
                action_id: id,
                okr_id,
                relationship,
                contribution_description,
                priority,
                is_required
            };

            const { data, error } = await supabase
                .from('action_okrs')
                .insert(linkData)
                .select(`
                    *,
                    okrs (id, title, scope, period)
                `)
                .single();

            if (error) throw error;

            res.status(201).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error linking OKR:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/actions/:id/okrs/:okrId
     * Unlink OKR from an action
     */
    router.delete('/:id/okrs/:okrId', async (req, res) => {
        try {
            const { id, okrId } = req.params;

            const { error } = await supabase
                .from('action_okrs')
                .delete()
                .eq('action_id', id)
                .eq('okr_id', okrId);

            if (error) throw error;

            res.json({
                success: true,
                message: 'OKR unlinked from action'
            });

        } catch (error) {
            console.error('Error unlinking OKR:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/actions/:id/departments
     * Link departments to an action
     */
    router.post('/:id/departments', async (req, res) => {
        try {
            const { id } = req.params;
            const { department_id, relationship = 'serves', is_primary = false, priority = 50 } = req.body;

            if (!department_id) {
                return res.status(400).json({
                    success: false,
                    error: 'department_id is required'
                });
            }

            const linkData = {
                id: uuidv4(),
                action_id: id,
                department_id,
                relationship,
                is_primary,
                priority
            };

            const { data, error } = await supabase
                .from('action_departments')
                .insert(linkData)
                .select(`
                    *,
                    departments (id, name, icon, color)
                `)
                .single();

            if (error) throw error;

            res.status(201).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error linking department:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/actions/:id/departments/:deptId
     * Unlink department from an action
     */
    router.delete('/:id/departments/:deptId', async (req, res) => {
        try {
            const { id, deptId } = req.params;

            const { error } = await supabase
                .from('action_departments')
                .delete()
                .eq('action_id', id)
                .eq('department_id', deptId);

            if (error) throw error;

            res.json({
                success: true,
                message: 'Department unlinked from action'
            });

        } catch (error) {
            console.error('Error unlinking department:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/actions/:id/processes
     * Link processes to an action
     */
    router.post('/:id/processes', async (req, res) => {
        try {
            const { id } = req.params;
            const { process_id, relationship = 'executes', step_numbers = [], is_required = false, priority = 50 } = req.body;

            if (!process_id) {
                return res.status(400).json({
                    success: false,
                    error: 'process_id is required'
                });
            }

            const linkData = {
                id: uuidv4(),
                action_id: id,
                process_id,
                relationship,
                step_numbers,
                is_required,
                priority
            };

            const { data, error } = await supabase
                .from('action_processes')
                .insert(linkData)
                .select(`
                    *,
                    processes (id, name, type, status)
                `)
                .single();

            if (error) throw error;

            res.status(201).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error linking process:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/actions/:id/processes/:processId
     * Unlink process from an action
     */
    router.delete('/:id/processes/:processId', async (req, res) => {
        try {
            const { id, processId } = req.params;

            const { error } = await supabase
                .from('action_processes')
                .delete()
                .eq('action_id', id)
                .eq('process_id', processId);

            if (error) throw error;

            res.json({
                success: true,
                message: 'Process unlinked from action'
            });

        } catch (error) {
            console.error('Error unlinking process:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/actions/:id/roles
     * Link roles to an action
     */
    router.post('/:id/roles', async (req, res) => {
        try {
            const { id } = req.params;
            const { role_id, permission = 'execute', is_owner = false, inject_context = true } = req.body;

            if (!role_id) {
                return res.status(400).json({
                    success: false,
                    error: 'role_id is required'
                });
            }

            const linkData = {
                id: uuidv4(),
                action_id: id,
                role_id,
                permission,
                is_owner,
                inject_context
            };

            const { data, error } = await supabase
                .from('action_roles')
                .insert(linkData)
                .select(`
                    *,
                    roles (id, title, level, department_id)
                `)
                .single();

            if (error) throw error;

            res.status(201).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error linking role:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/actions/:id/roles/:roleId
     * Unlink role from an action
     */
    router.delete('/:id/roles/:roleId', async (req, res) => {
        try {
            const { id, roleId } = req.params;

            const { error } = await supabase
                .from('action_roles')
                .delete()
                .eq('action_id', id)
                .eq('role_id', roleId);

            if (error) throw error;

            res.json({
                success: true,
                message: 'Role unlinked from action'
            });

        } catch (error) {
            console.error('Error unlinking role:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/actions/:id/assets
     * Link context assets to an action
     */
    router.post('/:id/assets', async (req, res) => {
        try {
            const { id } = req.params;
            const {
                asset_id,
                injection_mode = 'always',
                trigger_keywords = [],
                is_required = false,
                priority = 50,
                max_tokens
            } = req.body;

            if (!asset_id) {
                return res.status(400).json({
                    success: false,
                    error: 'asset_id is required'
                });
            }

            const linkData = {
                id: uuidv4(),
                action_id: id,
                asset_id,
                injection_mode,
                trigger_keywords,
                is_required,
                priority,
                max_tokens
            };

            const { data, error } = await supabase
                .from('action_context_assets')
                .insert(linkData)
                .select(`
                    *,
                    context_assets (id, name, asset_type)
                `)
                .single();

            if (error) throw error;

            res.status(201).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error linking asset:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/actions/:id/assets/:assetId
     * Unlink context asset from an action
     */
    router.delete('/:id/assets/:assetId', async (req, res) => {
        try {
            const { id, assetId } = req.params;

            const { error } = await supabase
                .from('action_context_assets')
                .delete()
                .eq('action_id', id)
                .eq('asset_id', assetId);

            if (error) throw error;

            res.json({
                success: true,
                message: 'Asset unlinked from action'
            });

        } catch (error) {
            console.error('Error unlinking asset:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/actions/:id/assembled-context
     * Get fully assembled context for action execution
     * This combines all Parthenon elements into a single context payload
     */
    router.get('/:id/assembled-context', async (req, res) => {
        try {
            const { id } = req.params;
            const { role_id } = req.query; // Optional: filter by executing role

            // Get action details
            const { data: action, error: actionError } = await supabase
                .from('actions')
                .select('*')
                .eq('id', id)
                .single();

            if (actionError) throw actionError;
            if (!action) {
                return res.status(404).json({
                    success: false,
                    error: 'Action not found'
                });
            }

            // Get all connected context
            const [
                { data: okrs },
                { data: departments },
                { data: processes },
                { data: roles },
                { data: assets }
            ] = await Promise.all([
                supabase
                    .from('action_okrs')
                    .select('*, okrs (*)')
                    .eq('action_id', id)
                    .order('priority', { ascending: false }),
                supabase
                    .from('action_departments')
                    .select('*, departments (*)')
                    .eq('action_id', id)
                    .order('priority', { ascending: false }),
                supabase
                    .from('action_processes')
                    .select('*, processes (*)')
                    .eq('action_id', id)
                    .order('priority', { ascending: false }),
                supabase
                    .from('action_roles')
                    .select('*, roles (*)')
                    .eq('action_id', id),
                supabase
                    .from('action_context_assets')
                    .select('*, context_assets (*)')
                    .eq('action_id', id)
                    .order('priority', { ascending: false })
            ]);

            // Build assembled context object
            const assembledContext = {
                action: {
                    id: action.id,
                    name: action.name,
                    suite: action.suite,
                    description: action.description
                },

                // OKR context: goals and key results this action supports
                okr_context: (okrs || []).map(ao => ({
                    title: ao.okrs?.title,
                    scope: ao.okrs?.scope,
                    period: ao.okrs?.period,
                    progress: ao.okrs?.progress,
                    key_results: ao.okrs?.key_results,
                    relationship: ao.relationship,
                    contribution: ao.contribution_description
                })),

                // Department context: which departments this serves
                department_context: (departments || []).map(ad => ({
                    name: ad.departments?.name,
                    description: ad.departments?.description,
                    relationship: ad.relationship,
                    is_primary: ad.is_primary
                })),

                // Process context: procedures and workflows to follow
                process_context: (processes || []).map(ap => ({
                    name: ap.processes?.name,
                    type: ap.processes?.type,
                    steps: ap.processes?.steps,
                    relationship: ap.relationship,
                    specific_steps: ap.step_numbers
                })),

                // Role context: who can use this and their responsibilities
                role_context: (roles || [])
                    .filter(ar => !role_id || ar.role_id === role_id)
                    .filter(ar => ar.inject_context)
                    .map(ar => ({
                        title: ar.roles?.title,
                        level: ar.roles?.level,
                        responsibilities: ar.roles?.responsibilities,
                        permission: ar.permission,
                        is_owner: ar.is_owner
                    })),

                // Asset context: injected brand/knowledge assets
                asset_context: (assets || [])
                    .filter(aca => aca.injection_mode === 'always')
                    .map(aca => ({
                        name: aca.context_assets?.name,
                        type: aca.context_assets?.asset_type,
                        content: aca.context_assets?.content_text,
                        max_tokens: aca.max_tokens
                    })),

                // Metadata
                meta: {
                    total_okrs: okrs?.length || 0,
                    total_departments: departments?.length || 0,
                    total_processes: processes?.length || 0,
                    total_roles: roles?.length || 0,
                    total_assets: assets?.length || 0,
                    assembled_at: new Date().toISOString()
                }
            };

            res.json({
                success: true,
                data: assembledContext
            });

        } catch (error) {
            console.error('Error assembling context:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
};
