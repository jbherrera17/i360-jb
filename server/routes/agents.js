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
const { randomUUID: uuidv4 } = require('crypto');
const { assembleContext, estimateTokens } = require('../services/contextInjection');
const { executeAgent, streamAgent } = require('../services/agentService');
const { generateSignedEmbedUrl } = require('../services/mindstudioService');
const { canEditAgent, canDeleteAgent } = require('../middleware/auth');
const { buildAgentAccessFilter, getUserAccessContext, filterByModuleAccess } = require('../utils/resourceAccess');

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
            const userId = req.userId;
            const orgId = req.headers['x-org-id'];
            const {
                category,
                suite,
                provider,
                active,
                search,
                platform_type,
                department_id,
                sort = 'name',
                order = 'asc',
                limit = 50,
                offset = 0
            } = req.query;

            // If department_id is provided, first get agent IDs from junction table
            let departmentAgentIds = null;
            if (department_id) {
                const { data: deptAgents, error: deptError } = await supabase
                    .from('department_agents')
                    .select('agent_id')
                    .eq('department_id', department_id);

                if (deptError) throw deptError;
                departmentAgentIds = (deptAgents || []).map(da => da.agent_id);
            }

            let query = supabase
                .from('agent_summary')
                .select('*');

            // === PHASE 45: Apply access control filter ===
            if (userId) {
                const accessCtx = await getUserAccessContext(supabase, userId);
                if (accessCtx) {
                    query = buildAgentAccessFilter(query, accessCtx);
                }
            } else {
                // Anonymous users: public agents only
                query = query.eq('visibility', 'public');
            }
            // === END PHASE 45 ===

            // === PHASE 46: Organization filtering ===
            if (orgId) {
                // Show agents belonging to this org OR system agents (no org)
                query = query.or(`org_id.eq.${orgId},org_id.is.null`);
            }
            // === END PHASE 46 ===

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
            if (platform_type && platform_type !== 'all') {
                query = query.eq('type', platform_type);
            }
            // Filter by department via junction table
            if (departmentAgentIds !== null) {
                if (departmentAgentIds.length > 0) {
                    query = query.in('id', departmentAgentIds);
                } else {
                    // No agents assigned to this department
                    return res.json({
                        success: true,
                        data: [],
                        pagination: { total: 0, limit: parseInt(limit), offset: parseInt(offset) }
                    });
                }
            }
            // Status is represented by is_active boolean
            if (active !== undefined) {
                query = query.eq('is_active', active === 'true');
            }
            if (search) {
                query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
            }

            // Apply sorting
            const sortColumn = ['name', 'created_at', 'usage_count', 'last_used_at'].includes(sort)
                ? sort : 'name';
            query = query.order(sortColumn, { ascending: order === 'asc', nullsFirst: false });

            // Apply pagination
            query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            const { data, error, count } = await query;

            if (error) throw error;

            // === PHASE 45: Filter system agents by module access ===
            let filteredData = data || [];
            if (userId && orgId && filteredData.length > 0) {
                filteredData = await filterByModuleAccess(supabase, filteredData, userId, orgId);
            }
            // === END PHASE 45 ===

            res.json({
                success: true,
                data: filteredData,
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
     * GET /api/agents/categories/all
     * List ALL agent categories (including inactive) - for admin
     */
    router.get('/categories/all', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('agent_categories')
                .select('*')
                .order('sort_order');

            if (error) throw error;

            res.json({
                success: true,
                data: data || []
            });

        } catch (error) {
            console.error('Error listing all categories:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/agents/categories
     * Create a new agent category
     */
    router.post('/categories', async (req, res) => {
        try {
            const { key, display_name, description, icon, color, sort_order } = req.body;

            if (!key || !display_name) {
                return res.status(400).json({
                    success: false,
                    error: 'Key and display_name are required'
                });
            }

            const { data, error } = await supabase
                .from('agent_categories')
                .insert({
                    key: key.toLowerCase().replace(/\s+/g, '_'),
                    display_name,
                    description: description || '',
                    icon: icon || '📁',
                    color: color || '#6366f1',
                    sort_order: sort_order || 99,
                    is_active: true
                })
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error creating category:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/agents/categories/:id
     * Update an agent category
     */
    router.put('/categories/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { key, display_name, description, icon, color, sort_order, is_active } = req.body;

            const updateData = {};
            if (key !== undefined) updateData.key = key.toLowerCase().replace(/\s+/g, '_');
            if (display_name !== undefined) updateData.display_name = display_name;
            if (description !== undefined) updateData.description = description;
            if (icon !== undefined) updateData.icon = icon;
            if (color !== undefined) updateData.color = color;
            if (sort_order !== undefined) updateData.sort_order = sort_order;
            if (is_active !== undefined) updateData.is_active = is_active;

            const { data, error } = await supabase
                .from('agent_categories')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Error updating category:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/agents/categories/:id
     * Delete an agent category (soft delete - sets is_active to false)
     */
    router.delete('/categories/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Soft delete - set is_active to false
            const { data, error } = await supabase
                .from('agent_categories')
                .update({ is_active: false })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                message: 'Category deactivated'
            });

        } catch (error) {
            console.error('Error deleting category:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/agents/departments
     * List departments for agent assignment
     */
    router.get('/departments', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('departments')
                .select('id, name, description, icon')
                .eq('is_active', true)
                .order('sort_order');

            if (error) throw error;

            res.json({
                success: true,
                data: data || []
            });

        } catch (error) {
            console.error('Error listing departments:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/agents/stats
     * Get agent statistics overview
     */
    router.get('/stats', async (req, res) => {
        try {
            // Get total counts
            const { data: agents, error: agentsError } = await supabase
                .from('agents')
                .select('id, is_active, type');

            if (agentsError) throw agentsError;

            const stats = {
                total_agents: agents?.length || 0,
                active_agents: agents?.filter(a => a.is_active !== false).length || 0,
                by_platform: {}
            };

            // Count by platform (using 'type' column)
            agents?.forEach(agent => {
                const platform = agent.type || 'custom';
                stats.by_platform[platform] = (stats.by_platform[platform] || 0) + 1;
            });

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

            // Get department assignments
            const { data: deptAssignments, error: deptError } = await supabase
                .from('department_agents')
                .select('department_id, departments(id, name)')
                .eq('agent_id', id);

            if (deptError) throw deptError;

            // Get primary department (first one for UI simplicity)
            const department_id = deptAssignments?.length > 0 ? deptAssignments[0].department_id : null;
            const departments = deptAssignments?.map(da => da.departments) || [];

            res.json({
                success: true,
                data: {
                    ...agent,
                    context_mappings: mappings || [],
                    department_id,
                    departments
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
                type = 'custom',
                category = 'custom',
                suite = 'execute',
                llm_provider = 'anthropic',
                llm_model = 'claude-sonnet-4-5-20250929',
                temperature = 0.7,
                max_tokens = 4096,
                system_prompt,
                introduction = null,
                mindstudio_workflow_id,
                config,
                is_active = true,
                conversation_starters = [],
                guardrails = {}
            } = req.body;

            // Validate required fields based on type
            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Name is required'
                });
            }

            // Native agents require system_prompt, MindStudio agents require app ID
            if ((type === 'custom' || type === 'llm') && !system_prompt) {
                return res.status(400).json({
                    success: false,
                    error: 'System prompt is required for native agents'
                });
            }

            if (type === 'mindstudio' && !mindstudio_workflow_id) {
                return res.status(400).json({
                    success: false,
                    error: 'MindStudio App ID is required'
                });
            }

            // Get user ID from auth (if available)
            const userId = req.userId || null;

            // Check organization resource limits (Phase 44)
            const orgId = req.headers['x-org-id'] || req.body.org_id;
            if (orgId) {
                const { data: limits, error: limitError } = await supabase
                    .rpc('check_org_limits', {
                        p_org_id: orgId,
                        p_resource_type: 'agents'
                    });

                if (!limitError && limits && limits[0] && !limits[0].within_limits) {
                    return res.status(403).json({
                        success: false,
                        error: `Agent limit reached (${limits[0].current_count}/${limits[0].max_allowed})`,
                        details: {
                            current: limits[0].current_count,
                            max: limits[0].max_allowed,
                            usage_percent: limits[0].usage_percent
                        },
                        upgrade_required: true
                    });
                }
            }

            const agentData = {
                id: uuidv4(),
                user_id: userId,
                org_id: orgId || null,  // Phase 44: Associate with organization
                name,
                description,
                icon,
                type,
                category,
                suite,
                is_active,
                created_by: userId
            };

            // Add type-specific fields
            if (type === 'mindstudio') {
                agentData.mindstudio_workflow_id = mindstudio_workflow_id;
                agentData.config = config || {};
                // MindStudio agents use placeholders to satisfy NOT NULL constraints
                agentData.llm_provider = 'mindstudio';
                agentData.llm_model = 'mindstudio-workflow';
                agentData.system_prompt = '[MindStudio workflow - no local system prompt]';
            } else {
                // Native agents use LLM settings
                agentData.llm_provider = llm_provider;
                agentData.llm_model = llm_model;
                agentData.temperature = parseFloat(temperature);
                agentData.max_tokens = parseInt(max_tokens);
                agentData.system_prompt = system_prompt;
                agentData.introduction = introduction;
                agentData.conversation_starters = conversation_starters;
                agentData.guardrails = {
                    max_context_tokens: 8000,
                    require_context: false,
                    allowed_topics: [],
                    blocked_topics: [],
                    output_format: null,
                    ...guardrails
                };
            }

            const { data, error } = await supabase
                .from('agents')
                .insert(agentData)
                .select()
                .single();

            if (error) throw error;

            // Handle department assignment if provided
            const { department_id } = req.body;
            if (department_id) {
                await supabase
                    .from('department_agents')
                    .insert({
                        department_id,
                        agent_id: data.id,
                        is_featured: false,
                        sort_order: 999
                    });
            }

            res.status(201).json({
                success: true,
                data: { ...data, department_id: department_id || null }
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
     * Permission: Admin can edit all; users can only edit their own non-system agents
     */
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;
            const { department_id } = updates;

            // First, get the agent to check permissions
            const { data: agent, error: fetchError } = await supabase
                .from('agents')
                .select('id, user_id, is_system')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;
            if (!agent) {
                return res.status(404).json({
                    success: false,
                    error: 'Agent not found'
                });
            }

            // Check permission
            const userRole = req.userRole || 'user';
            const userId = req.userId || null;

            if (!canEditAgent(userRole, userId, agent)) {
                return res.status(403).json({
                    success: false,
                    error: agent.is_system
                        ? 'System agents can only be edited by administrators'
                        : 'You do not have permission to edit this agent'
                });
            }

            // Remove fields that shouldn't be updated directly
            delete updates.id;
            delete updates.user_id;
            delete updates.created_at;
            delete updates.created_by;
            delete updates.usage_count;
            delete updates.is_system; // Prevent changing is_system flag
            delete updates.department_id; // Handle separately via junction table

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

            // Handle department assignment update
            if (department_id !== undefined) {
                // Remove existing department assignments
                await supabase
                    .from('department_agents')
                    .delete()
                    .eq('agent_id', id);

                // Add new department assignment if provided
                if (department_id) {
                    await supabase
                        .from('department_agents')
                        .insert({
                            department_id,
                            agent_id: id,
                            is_featured: false,
                            sort_order: 999
                        });
                }
            }

            res.json({
                success: true,
                data: { ...data, department_id: department_id || null }
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
     * Permission: Admin can delete all; users can only delete their own non-system agents
     */
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { hard = false } = req.query;

            // First, get the agent to check permissions
            const { data: agent, error: fetchError } = await supabase
                .from('agents')
                .select('id, user_id, is_system, name')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;
            if (!agent) {
                return res.status(404).json({
                    success: false,
                    error: 'Agent not found'
                });
            }

            // Check permission
            const userRole = req.userRole || 'user';
            const userId = req.userId || null;

            if (!canDeleteAgent(userRole, userId, agent)) {
                return res.status(403).json({
                    success: false,
                    error: agent.is_system
                        ? 'System agents can only be deleted by administrators'
                        : 'You do not have permission to delete this agent'
                });
            }

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
     * Duplicate an agent with lineage tracking
     *
     * Body params:
     *   - name: Custom name for the duplicate (optional)
     *   - department_id: Department to assign the duplicate to (optional)
     */
    router.post('/:id/duplicate', async (req, res) => {
        try {
            const { id } = req.params;
            const { name: newName, department_id } = req.body;

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

            // Create duplicate with lineage tracking
            const userId = req.userId || null;
            const now = new Date().toISOString();

            // Build the duplicate data, excluding system-specific fields
            const duplicateData = {
                id: uuidv4(),
                name: newName || `${original.name} (My Copy)`,
                description: original.description,
                icon: original.icon,
                category: original.category,
                suite: original.suite,
                type: original.type,
                llm_provider: original.llm_provider,
                llm_model: original.llm_model,
                temperature: original.temperature,
                max_tokens: original.max_tokens,
                system_prompt: original.system_prompt,
                introduction: original.introduction,
                conversation_starters: original.conversation_starters,
                guardrails: original.guardrails,
                config: original.config,
                mindstudio_workflow_id: original.mindstudio_workflow_id,
                tools: original.tools,
                // User ownership
                user_id: userId,
                created_by: userId,
                // Duplicate is never a system agent
                is_system: false,
                is_active: true,
                is_public: false,
                // Reset usage stats
                usage_count: 0,
                last_used_at: null,
                avg_response_time_ms: null,
                // Timestamps
                created_at: now,
                updated_at: now,
                // Lineage tracking (will be ignored if columns don't exist yet)
                parent_agent_id: original.id,
                forked_at: now,
                forked_from_version: 1 // Could track version if we add versioning later
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
                    created_at: now,
                    updated_at: now
                }));

                await supabase
                    .from('agent_context_mappings')
                    .insert(newMappings);
            }

            // Handle department assignment if provided
            if (department_id) {
                await supabase
                    .from('department_agents')
                    .insert({
                        department_id,
                        agent_id: data.id,
                        is_featured: false,
                        sort_order: 999
                    });
            }

            res.status(201).json({
                success: true,
                data: {
                    ...data,
                    parent_agent_name: original.name,
                    parent_is_system: original.is_system,
                    department_id: department_id || null
                },
                message: `Created "${data.name}" from "${original.name}"`
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
                max_tokens = null
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
                max_tokens: max_tokens ? parseInt(max_tokens) : null,
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
            }, supabase);

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

    /**
     * GET /api/agents/:id/context/mappings
     * Get context mappings for an agent with full asset details
     */
    router.get('/:id/context/mappings', async (req, res) => {
        try {
            const { id } = req.params;

            const { data: mappings, error } = await supabase
                .from('agent_context_mappings')
                .select(`
                    id,
                    injection_mode,
                    priority,
                    max_tokens,
                    trigger_keywords,
                    trigger_regex,
                    is_active,
                    context_assets (
                        id, name, asset_type, description,
                        content_json, content_text, version
                    )
                `)
                .eq('agent_id', id)
                .eq('is_active', true)
                .order('priority', { ascending: false });

            if (error) throw error;

            res.json({
                success: true,
                data: mappings || []
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
     * POST /api/agents/:id/context/mappings
     * Add a context mapping to an agent
     */
    router.post('/:id/context/mappings', async (req, res) => {
        try {
            const { id } = req.params;
            const { asset_id, injection_mode = 'on_demand', priority = 50 } = req.body;

            if (!asset_id) {
                return res.status(400).json({
                    success: false,
                    error: 'asset_id is required'
                });
            }

            // Check if mapping already exists
            const { data: existing } = await supabase
                .from('agent_context_mappings')
                .select('id')
                .eq('agent_id', id)
                .eq('asset_id', asset_id)
                .single();

            if (existing) {
                return res.status(400).json({
                    success: false,
                    error: 'This asset is already mapped to this agent'
                });
            }

            const { data, error } = await supabase
                .from('agent_context_mappings')
                .insert({
                    id: uuidv4(),
                    agent_id: id,
                    asset_id,
                    injection_mode,
                    priority,
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

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

            const userId = req.userId || null;

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
     *
     * Body params:
     *   - message: User message (required)
     *   - conversation_history: Previous messages array
     *   - model_override: Optional model ID to override agent's default
     *   - session_id: Browser session ID for tracking
     *   - include_context: Array of on-demand context asset IDs to include
     */
    router.post('/:id/execute/stream', async (req, res) => {
        try {
            const { id } = req.params;
            const {
                message,
                conversation_history = [],
                model_override = null,
                session_id = null,
                include_context = []
            } = req.body;

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

            const userId = req.userId || null;

            await streamAgent(id, {
                userMessage: message,
                conversationHistory: conversation_history,
                userId,
                modelOverride: model_override,
                sessionId: session_id,
                includeOnDemand: include_context,
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
     * POST /api/agents/:id/embed-url
     * Generate a signed embed URL for MindStudio agents
     * Required for authenticated iframe embedding
     */
    router.post('/:id/embed-url', async (req, res) => {
        try {
            const { id } = req.params;
            const { user_id } = req.body;

            // Get the agent to find the MindStudio app ID
            const { data: agent, error: agentError } = await supabase
                .from('agents')
                .select('id, name, type, mindstudio_workflow_id, config')
                .eq('id', id)
                .single();

            if (agentError) throw agentError;
            if (!agent) {
                return res.status(404).json({
                    success: false,
                    error: 'Agent not found'
                });
            }

            if (agent.type !== 'mindstudio') {
                return res.status(400).json({
                    success: false,
                    error: 'Agent is not a MindStudio agent'
                });
            }

            const mindstudioAppId = agent.mindstudio_workflow_id || agent.config?.mindstudio_app_id;
            if (!mindstudioAppId) {
                return res.status(400).json({
                    success: false,
                    error: 'Agent missing MindStudio app ID'
                });
            }

            // Generate a unique user ID if not provided
            const userId = user_id || req.userId || `anon-${uuidv4().slice(0, 8)}`;

            const result = await generateSignedEmbedUrl(mindstudioAppId, userId);

            res.json({
                success: true,
                embed_url: result.url,
                agent_id: id,
                mindstudio_app_id: mindstudioAppId
            });

        } catch (error) {
            console.error('Error generating embed URL:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
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