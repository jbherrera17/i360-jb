/**
 * Execute 120 Routes
 * Department-focused execution hub with workflow wizards
 *
 * Phase 10: Execute 120
 */

const express = require('express');
const { getUserId } = require('../utils/auth');

/**
 * Execute 120 Routes Factory
 * @param {object} supabase - Supabase client instance
 * @returns {Router} Express router
 */
module.exports = function(supabase) {
    const router = express.Router();

    // Phase 44: Module access middleware for Execute 120
    // Business tier and above required for this module
    router.use(async (req, res, next) => {
        try {
            const userId = req.userId || req.headers['x-user-id'];
            const orgId = req.headers['x-org-id'];

            // Skip check if no user context (will fail auth later anyway)
            if (!userId) {
                return next();
            }

            // Check module access using database function
            const { data: canAccess, error } = await supabase
                .rpc('can_access_module', {
                    p_user_id: userId,
                    p_module_id: 'execute120',
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
                    error: 'Execute 120 requires a Business tier or higher subscription',
                    module: 'execute120',
                    upgrade_required: true
                });
            }

            next();
        } catch (err) {
            console.error('Module access middleware error:', err);
            next(); // Don't block on errors
        }
    });

    // ============================================
    // DEPARTMENTS (Execute 120 Extension)
    // ============================================

    /**
     * GET /api/execute120/departments
     * Get all departments with Execute 120 configuration
     */
    router.get('/departments', async (req, res) => {
        try {
            const { data: departments, error } = await supabase
                .from('departments')
                .select(`
                    id,
                    name,
                    description,
                    icon,
                    color,
                    tagline,
                    metrics,
                    quick_prompts,
                    use_guide_url,
                    parent_id,
                    sort_order,
                    is_active
                `)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;

            res.json({
                success: true,
                data: departments || []
            });
        } catch (error) {
            console.error('Error fetching departments:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch departments'
            });
        }
    });

    /**
     * GET /api/execute120/departments/:id
     * Get single department with agents and workflows
     */
    router.get('/departments/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Get department
            const { data: department, error: deptError } = await supabase
                .from('departments')
                .select('*')
                .eq('id', id)
                .single();

            if (deptError) throw deptError;

            // Get associated agents
            const { data: agentMappings, error: agentError } = await supabase
                .from('department_agents')
                .select(`
                    is_featured,
                    sort_order,
                    use_case_summary,
                    agent:agents(
                        id,
                        name,
                        description,
                        icon,
                        llm_provider,
                        llm_model,
                        category
                    )
                `)
                .eq('department_id', id)
                .order('sort_order', { ascending: true });

            if (agentError) throw agentError;

            // Get associated workflows
            const { data: workflows, error: workflowError } = await supabase
                .from('workflows')
                .select(`
                    id,
                    name,
                    description,
                    icon,
                    color,
                    category,
                    estimated_minutes,
                    usage_count
                `)
                .or(`department_id.eq.${id},and(is_public.eq.true,is_system.eq.true)`)
                .eq('is_active', true)
                .order('usage_count', { ascending: false });

            if (workflowError) throw workflowError;

            res.json({
                success: true,
                data: {
                    ...department,
                    agents: agentMappings?.map(m => ({
                        ...m.agent,
                        is_featured: m.is_featured,
                        use_case_summary: m.use_case_summary
                    })) || [],
                    workflows: workflows || []
                }
            });
        } catch (error) {
            console.error('Error fetching department:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch department'
            });
        }
    });

    // ============================================
    // USER PROFILE PERSONALIZATION (Phase 37)
    // ============================================

    /**
     * GET /api/execute120/my-profile
     * Get current user's profile with department, role, and permissions for Execute120
     */
    router.get('/my-profile', async (req, res) => {
        try {
            const userId = getUserId(req);

            if (!userId) {
                return res.json({
                    success: true,
                    data: {
                        user: null,
                        permissions: null,
                        isExecutive: false,
                        showStrategyCards: false
                    }
                });
            }

            // Get user profile with department and business role
            const { data: user, error: userError } = await supabase
                .from('users')
                .select(`
                    id,
                    email,
                    display_name,
                    business_role,
                    department_id
                `)
                .eq('id', userId)
                .single();

            if (userError && userError.code !== 'PGRST116') {
                console.error('Error fetching user:', userError);
            }

            // Get department details if user has one
            let department = null;
            if (user?.department_id) {
                const { data: deptData } = await supabase
                    .from('departments')
                    .select('id, name, slug, icon, color, tagline')
                    .eq('id', user.department_id)
                    .single();
                department = deptData;
            }

            // Get business role info
            let roleInfo = null;
            if (user?.business_role) {
                const { data: roleData } = await supabase
                    .from('business_role_levels')
                    .select('id, name, level, icon')
                    .eq('id', user.business_role)
                    .single();
                roleInfo = roleData;
            }

            // Get effective permissions
            let permissions = null;
            const { data: permData } = await supabase
                .from('user_effective_permissions')
                .select('*')
                .eq('user_id', userId)
                .single();
            permissions = permData;

            // Determine executive status
            const isExecutive = ['executive', 'director'].includes(user?.business_role);
            const showStrategyCards = isExecutive || permissions?.can_view_company_strategy === true;

            res.json({
                success: true,
                data: {
                    user: user ? {
                        ...user,
                        department,
                        role_info: roleInfo
                    } : null,
                    permissions,
                    isExecutive,
                    showStrategyCards
                }
            });
        } catch (error) {
            console.error('Error fetching user profile:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch user profile'
            });
        }
    });

    /**
     * GET /api/execute120/my-cards
     * Get personalized card data for Execute120 dashboard
     * Filters by user's department and business role
     */
    router.get('/my-cards', async (req, res) => {
        try {
            const userId = getUserId(req);
            const { limit = 5 } = req.query;
            const limitNum = parseInt(limit);

            // Get user profile
            let user = null;
            if (userId) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('department_id, business_role')
                    .eq('id', userId)
                    .single();
                user = userData;
            }

            const deptId = user?.department_id;
            const roleLevel = user?.business_role || 'ic';

            // Get user's role level number for filtering
            let userRoleLevelNum = 1; // Default IC level
            if (roleLevel) {
                const { data: roleData } = await supabase
                    .from('business_role_levels')
                    .select('level')
                    .eq('id', roleLevel)
                    .single();
                userRoleLevelNum = roleData?.level || 1;
            }

            // Parallel fetch all cards — filtered by department and role
            const [contextAssets, agents, actions, skills, workflows, briefing] = await Promise.all([
                getFilteredContextAssets(supabase, deptId, userRoleLevelNum, limitNum),
                getFilteredAgents(supabase, deptId, userRoleLevelNum, limitNum),
                getFilteredActions(supabase, deptId, userRoleLevelNum, limitNum),
                getFilteredSkills(supabase, deptId, userRoleLevelNum, limitNum),
                getFilteredWorkflows(supabase, deptId, userRoleLevelNum, limitNum),
                getLatestBriefing(supabase, userId)
            ]);

            // Strategy overview for executives only
            let strategyOverview = null;
            if (['executive', 'director'].includes(roleLevel)) {
                strategyOverview = await getStrategyOverview(supabase, deptId);
            }

            res.json({
                success: true,
                data: {
                    contextAssets,
                    agents,
                    actions,
                    skills,
                    workflows,
                    briefing,
                    strategyOverview
                }
            });
        } catch (error) {
            console.error('Error fetching personalized cards:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch personalized cards'
            });
        }
    });

    /**
     * GET /api/execute120/my-briefing
     * Get user's latest daily briefing
     */
    router.get('/my-briefing', async (req, res) => {
        try {
            const userId = getUserId(req);

            if (!userId) {
                return res.json({ success: true, data: null });
            }

            // Get latest briefing for user
            const { data: briefing, error } = await supabase
                .from('briefings')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            res.json({ success: true, data: briefing || null });
        } catch (error) {
            console.error('Error fetching briefing:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch briefing'
            });
        }
    });

    // ============================================
    // HELPER FUNCTIONS FOR PERSONALIZATION
    // ============================================

    /**
     * Get context assets filtered by department and role
     */
    async function getFilteredContextAssets(supabase, deptId, userRoleLevelNum, limit) {
        try {
            let query = supabase
                .from('context_assets')
                .select('id, name, asset_type, description, department_id, tags, updated_at')
                .eq('is_current', true)
                .order('updated_at', { ascending: false })
                .limit(limit);

            // Department filter: user's dept OR global (null)
            if (deptId) {
                query = query.or(`department_id.eq.${deptId},department_id.is.null`);
            }

            const { data: assets, error } = await query;
            if (error) throw error;

            // Role filter: check context_asset_roles junction
            const filtered = [];
            for (const asset of (assets || [])) {
                const { data: roleReqs } = await supabase
                    .from('context_asset_roles')
                    .select('role_level')
                    .eq('asset_id', asset.id);

                // No role requirements = accessible to all
                if (!roleReqs?.length) {
                    filtered.push(asset);
                    continue;
                }

                // Check if user's level meets minimum (need to look up levels)
                const { data: levels } = await supabase
                    .from('business_role_levels')
                    .select('level')
                    .in('id', roleReqs.map(r => r.role_level));

                const minLevel = Math.min(...(levels || []).map(l => l.level));
                if (userRoleLevelNum >= minLevel) {
                    filtered.push(asset);
                }
            }

            return filtered.slice(0, limit);
        } catch (error) {
            console.error('Error in getFilteredContextAssets:', error);
            return [];
        }
    }

    /**
     * Get agents filtered by department and role
     */
    async function getFilteredAgents(supabase, deptId, userRoleLevelNum, limit) {
        try {
            // If user has a department, get agents mapped to that department
            if (deptId) {
                const { data: deptAgents, error } = await supabase
                    .from('department_agents')
                    .select(`
                        is_featured,
                        sort_order,
                        use_case_summary,
                        agent:agents(id, name, description, icon, category, suite)
                    `)
                    .eq('department_id', deptId)
                    .order('is_featured', { ascending: false })
                    .order('sort_order', { ascending: true })
                    .limit(limit * 2); // Get more to filter by role

                if (error) throw error;

                // Flatten and filter by role
                const agents = (deptAgents || [])
                    .filter(da => da.agent)
                    .map(da => ({
                        ...da.agent,
                        is_featured: da.is_featured,
                        use_case_summary: da.use_case_summary
                    }));

                // Role filter
                const filtered = [];
                for (const agent of agents) {
                    const { data: roleReqs } = await supabase
                        .from('agent_roles')
                        .select('role_level')
                        .eq('agent_id', agent.id);

                    if (!roleReqs?.length) {
                        filtered.push(agent);
                        continue;
                    }

                    const { data: levels } = await supabase
                        .from('business_role_levels')
                        .select('level')
                        .in('id', roleReqs.map(r => r.role_level));

                    const minLevel = Math.min(...(levels || []).map(l => l.level));
                    if (userRoleLevelNum >= minLevel) {
                        filtered.push(agent);
                    }
                }

                return filtered.slice(0, limit);
            }

            // No department - get general agents
            const { data: agents, error } = await supabase
                .from('agents')
                .select('id, name, description, icon, category, suite')
                .eq('is_active', true)
                .limit(limit);

            return agents || [];
        } catch (error) {
            console.error('Error in getFilteredAgents:', error);
            return [];
        }
    }

    /**
     * Get actions filtered by department and role
     */
    async function getFilteredActions(supabase, deptId, userRoleLevelNum, limit) {
        try {
            let actions = [];

            if (deptId) {
                // Get actions mapped to user's department
                const { data: deptActions, error } = await supabase
                    .from('action_departments')
                    .select(`
                        is_primary,
                        priority,
                        action:actions(id, name, slug, description, suite, status)
                    `)
                    .eq('department_id', deptId)
                    .order('is_primary', { ascending: false })
                    .order('priority', { ascending: true })
                    .limit(limit * 2);

                if (error) throw error;

                actions = (deptActions || [])
                    .filter(da => da.action && da.action.status === 'active')
                    .map(da => da.action);
            } else {
                // No department - get general execute actions
                const { data: allActions, error } = await supabase
                    .from('actions')
                    .select('id, name, slug, description, suite, status')
                    .eq('status', 'active')
                    .eq('suite', 'execute')
                    .limit(limit * 2);

                if (error) throw error;
                actions = allActions || [];
            }

            // Role filter via action_roles.role_level
            const filtered = [];
            for (const action of actions) {
                const { data: roleReqs } = await supabase
                    .from('action_roles')
                    .select('role_level')
                    .eq('action_id', action.id)
                    .not('role_level', 'is', null);

                if (!roleReqs?.length) {
                    filtered.push(action);
                    continue;
                }

                const { data: levels } = await supabase
                    .from('business_role_levels')
                    .select('level')
                    .in('id', roleReqs.map(r => r.role_level));

                const minLevel = Math.min(...(levels || []).map(l => l.level));
                if (userRoleLevelNum >= minLevel) {
                    filtered.push(action);
                }
            }

            return filtered.slice(0, limit);
        } catch (error) {
            console.error('Error in getFilteredActions:', error);
            return [];
        }
    }

    /**
     * Get skills filtered by department and role
     */
    async function getFilteredSkills(supabase, deptId, userRoleLevelNum, limit) {
        try {
            const { data: skills, error } = await supabase
                .from('skills')
                .select('id, name, display_name, description, icon, color, category, suite')
                .eq('status', 'active')
                .order('usage_count', { ascending: false })
                .limit(limit * 2);

            if (error) throw error;

            // Department filter via skill_departments junction
            let deptFiltered = [];
            for (const skill of (skills || [])) {
                const { data: deptMappings } = await supabase
                    .from('skill_departments')
                    .select('department_id')
                    .eq('skill_id', skill.id);

                // No department mappings = global (accessible to all depts)
                if (!deptMappings?.length) {
                    deptFiltered.push(skill);
                    continue;
                }

                if (deptId && deptMappings.some(m => m.department_id === deptId)) {
                    deptFiltered.push(skill);
                }
            }

            // Role filter via skill_roles junction
            const filtered = [];
            for (const skill of deptFiltered) {
                const { data: roleReqs } = await supabase
                    .from('skill_roles')
                    .select('role_level')
                    .eq('skill_id', skill.id);

                if (!roleReqs?.length) {
                    filtered.push(skill);
                    continue;
                }

                const { data: levels } = await supabase
                    .from('business_role_levels')
                    .select('level')
                    .in('id', roleReqs.map(r => r.role_level));

                const minLevel = Math.min(...(levels || []).map(l => l.level));
                if (userRoleLevelNum >= minLevel) {
                    filtered.push(skill);
                }
            }

            return filtered.slice(0, limit);
        } catch (error) {
            console.error('Error in getFilteredSkills:', error);
            return [];
        }
    }

    /**
     * Get workflows filtered by department and role
     */
    async function getFilteredWorkflows(supabase, deptId, userRoleLevelNum, limit) {
        try {
            let query = supabase
                .from('workflows')
                .select('id, name, description, icon, color, category, estimated_minutes, department_id')
                .eq('is_active', true)
                .order('usage_count', { ascending: false })
                .limit(limit * 2); // Get more to filter

            // Department filter: user's dept OR global OR system public
            if (deptId) {
                query = query.or(`department_id.eq.${deptId},department_id.is.null,and(is_public.eq.true,is_system.eq.true)`);
            }

            const { data: workflows, error } = await query;
            if (error) throw error;

            // Role filter
            const filtered = [];
            for (const w of (workflows || [])) {
                const { data: roleReqs } = await supabase
                    .from('workflow_roles')
                    .select('role_level')
                    .eq('workflow_id', w.id);

                if (!roleReqs?.length) {
                    filtered.push(w);
                    continue;
                }

                const { data: levels } = await supabase
                    .from('business_role_levels')
                    .select('level')
                    .in('id', roleReqs.map(r => r.role_level));

                const minLevel = Math.min(...(levels || []).map(l => l.level));
                if (userRoleLevelNum >= minLevel) {
                    filtered.push(w);
                }
            }

            return filtered.slice(0, limit);
        } catch (error) {
            console.error('Error in getFilteredWorkflows:', error);
            return [];
        }
    }

    /**
     * Get user's latest briefing
     */
    async function getLatestBriefing(supabase, userId) {
        try {
            if (!userId) return null;

            const { data: briefing } = await supabase
                .from('briefings')
                .select('id, title, content, created_at, status')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            return briefing || null;
        } catch (error) {
            // No briefing is fine
            return null;
        }
    }

    /**
     * Get strategy overview for executives
     */
    async function getStrategyOverview(supabase, deptId) {
        try {
            // Get initiative counts
            let query = supabase
                .from('strategy_initiatives')
                .select('id, status, current_progress');

            const { data: initiatives } = await query;

            if (!initiatives) return null;

            const activeInitiatives = initiatives.filter(i => i.status === 'in_progress').length;
            const completedThisQuarter = initiatives.filter(i => i.status === 'completed').length;
            const avgProgress = initiatives.length > 0
                ? Math.round(initiatives.reduce((sum, i) => sum + (i.current_progress || 0), 0) / initiatives.length)
                : 0;

            return {
                activeInitiatives,
                completedThisQuarter,
                avgProgress,
                totalInitiatives: initiatives.length
            };
        } catch (error) {
            console.error('Error in getStrategyOverview:', error);
            return null;
        }
    }

    // ============================================
    // DEPARTMENT CONFIGURATION
    // ============================================

    /**
     * PUT /api/execute120/departments/:id
     * Update department Execute 120 configuration
     */
    router.put('/departments/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { tagline, metrics, quick_prompts, use_guide_url } = req.body;

            const { data, error } = await supabase
                .from('departments')
                .update({
                    tagline,
                    metrics,
                    quick_prompts,
                    use_guide_url,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error updating department:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update department'
            });
        }
    });

    // ============================================
    // DEPARTMENT-AGENT MAPPINGS
    // ============================================

    /**
     * POST /api/execute120/departments/:id/agents
     * Add agent to department
     */
    router.post('/departments/:id/agents', async (req, res) => {
        try {
            const { id } = req.params;
            const { agent_id, is_featured, sort_order, use_case_summary } = req.body;

            const { data, error } = await supabase
                .from('department_agents')
                .insert({
                    department_id: id,
                    agent_id,
                    is_featured: is_featured || false,
                    sort_order: sort_order || 50,
                    use_case_summary
                })
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error adding agent to department:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to add agent to department'
            });
        }
    });

    /**
     * DELETE /api/execute120/departments/:deptId/agents/:agentId
     * Remove agent from department
     */
    router.delete('/departments/:deptId/agents/:agentId', async (req, res) => {
        try {
            const { deptId, agentId } = req.params;

            const { error } = await supabase
                .from('department_agents')
                .delete()
                .eq('department_id', deptId)
                .eq('agent_id', agentId);

            if (error) throw error;

            res.json({
                success: true,
                message: 'Agent removed from department'
            });
        } catch (error) {
            console.error('Error removing agent from department:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to remove agent from department'
            });
        }
    });

    // ============================================
    // WORKFLOWS
    // ============================================

    /**
     * GET /api/execute120/workflows
     * Get all workflows (filtered by department optionally)
     */
    router.get('/workflows', async (req, res) => {
        try {
            const { department_id, category } = req.query;

            let query = supabase
                .from('workflows')
                .select(`
                    id,
                    name,
                    description,
                    icon,
                    color,
                    category,
                    estimated_minutes,
                    is_public,
                    is_system,
                    usage_count,
                    department:departments(id, name, icon, color)
                `)
                .eq('is_active', true);

            // Filter by department if provided
            if (department_id) {
                query = query.or(`department_id.eq.${department_id},and(is_public.eq.true,is_system.eq.true)`);
            }

            // Filter by category if provided
            if (category) {
                query = query.eq('category', category);
            }

            const { data: workflows, error } = await query
                .order('usage_count', { ascending: false });

            if (error) throw error;

            res.json({
                success: true,
                data: workflows || []
            });
        } catch (error) {
            console.error('Error fetching workflows:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch workflows'
            });
        }
    });

    /**
     * GET /api/execute120/workflows/:id
     * Get workflow with all steps
     * Accepts UUID or workflow name (from template)
     */
    router.get('/workflows/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Check if id is a UUID or a name
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

            // Get workflow - by UUID or by looking up template name
            let workflow, workflowError;
            if (isUUID) {
                ({ data: workflow, error: workflowError } = await supabase
                    .from('workflows')
                    .select(`
                        *,
                        department:departments(id, name, icon, color)
                    `)
                    .eq('id', id)
                    .single());
            } else {
                // Look up by template name first
                const { data: template } = await supabase
                    .from('workflow_templates')
                    .select('id')
                    .eq('name', id)
                    .single();

                if (template) {
                    // Find workflow using this template
                    ({ data: workflow, error: workflowError } = await supabase
                        .from('workflows')
                        .select(`
                            *,
                            department:departments(id, name, icon, color)
                        `)
                        .eq('template_id', template.id)
                        .single());
                } else {
                    workflowError = { message: `No workflow found with name: ${id}` };
                }
            }

            if (workflowError) throw workflowError;

            const workflowId = workflow.id;

            // Get steps
            const { data: steps, error: stepsError } = await supabase
                .from('workflow_steps')
                .select(`
                    *,
                    agent:agents(id, name, description, icon)
                `)
                .eq('workflow_id', workflowId)
                .order('step_number', { ascending: true });

            if (stepsError) throw stepsError;

            res.json({
                success: true,
                data: {
                    ...workflow,
                    steps: steps || []
                }
            });
        } catch (error) {
            console.error('Error fetching workflow:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch workflow'
            });
        }
    });

    /**
     * POST /api/execute120/workflows
     * Create new workflow
     */
    router.post('/workflows', async (req, res) => {
        try {
            const userId = getUserId(req);
            const { name, description, icon, color, category, department_id, estimated_minutes, steps } = req.body;

            // Create workflow
            const { data: workflow, error: workflowError } = await supabase
                .from('workflows')
                .insert({
                    user_id: userId,
                    name,
                    description,
                    icon: icon || 'zap',
                    color: color || '#6366f1',
                    category: category || 'general',
                    department_id,
                    estimated_minutes,
                    is_active: true,
                    is_public: false,
                    is_system: false
                })
                .select()
                .single();

            if (workflowError) throw workflowError;

            // Create steps if provided
            if (steps && steps.length > 0) {
                const stepsWithWorkflowId = steps.map((step, index) => ({
                    ...step,
                    workflow_id: workflow.id,
                    step_number: index + 1
                }));

                const { error: stepsError } = await supabase
                    .from('workflow_steps')
                    .insert(stepsWithWorkflowId);

                if (stepsError) throw stepsError;
            }

            res.json({
                success: true,
                data: workflow
            });
        } catch (error) {
            console.error('Error creating workflow:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create workflow'
            });
        }
    });

    /**
     * PUT /api/execute120/workflows/:id
     * Update workflow
     */
    router.put('/workflows/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description, icon, color, category, department_id, estimated_minutes, is_active } = req.body;

            const { data, error } = await supabase
                .from('workflows')
                .update({
                    name,
                    description,
                    icon,
                    color,
                    category,
                    department_id,
                    estimated_minutes,
                    is_active,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('is_system', false) // Can't update system workflows
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error updating workflow:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update workflow'
            });
        }
    });

    /**
     * DELETE /api/execute120/workflows/:id
     * Delete workflow
     */
    router.delete('/workflows/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('workflows')
                .delete()
                .eq('id', id)
                .eq('is_system', false); // Can't delete system workflows

            if (error) throw error;

            res.json({
                success: true,
                message: 'Workflow deleted'
            });
        } catch (error) {
            console.error('Error deleting workflow:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete workflow'
            });
        }
    });

    // ============================================
    // WORKFLOW STEPS
    // ============================================

    /**
     * POST /api/execute120/workflows/:id/steps
     * Add step to workflow
     */
    router.post('/workflows/:id/steps', async (req, res) => {
        try {
            const { id } = req.params;
            const stepData = req.body;

            // Get current max step number
            const { data: maxStep } = await supabase
                .from('workflow_steps')
                .select('step_number')
                .eq('workflow_id', id)
                .order('step_number', { ascending: false })
                .limit(1)
                .single();

            const nextStepNumber = (maxStep?.step_number || 0) + 1;

            const { data, error } = await supabase
                .from('workflow_steps')
                .insert({
                    ...stepData,
                    workflow_id: id,
                    step_number: nextStepNumber
                })
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error adding workflow step:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to add workflow step'
            });
        }
    });

    /**
     * PUT /api/execute120/workflows/:workflowId/steps/:stepId
     * Update workflow step
     */
    router.put('/workflows/:workflowId/steps/:stepId', async (req, res) => {
        try {
            const { stepId } = req.params;
            const stepData = req.body;

            const { data, error } = await supabase
                .from('workflow_steps')
                .update({
                    ...stepData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', stepId)
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error updating workflow step:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update workflow step'
            });
        }
    });

    /**
     * DELETE /api/execute120/workflows/:workflowId/steps/:stepId
     * Delete workflow step
     */
    router.delete('/workflows/:workflowId/steps/:stepId', async (req, res) => {
        try {
            const { workflowId, stepId } = req.params;

            // Get step to delete
            const { data: stepToDelete, error: getError } = await supabase
                .from('workflow_steps')
                .select('step_number')
                .eq('id', stepId)
                .single();

            if (getError) throw getError;

            // Delete the step
            const { error: deleteError } = await supabase
                .from('workflow_steps')
                .delete()
                .eq('id', stepId);

            if (deleteError) throw deleteError;

            res.json({
                success: true,
                message: 'Step deleted'
            });
        } catch (error) {
            console.error('Error deleting workflow step:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete workflow step'
            });
        }
    });

    // ============================================
    // WORKFLOW EXECUTIONS
    // ============================================

    /**
     * POST /api/execute120/workflows/:id/execute
     * Start a new workflow execution
     */
    router.post('/workflows/:id/execute', async (req, res) => {
        try {
            const userId = getUserId(req);
            const { id } = req.params;
            const { initial_variables } = req.body;

            // Create execution
            const { data: execution, error } = await supabase
                .from('workflow_executions')
                .insert({
                    workflow_id: id,
                    user_id: userId,
                    status: 'in_progress',
                    current_step: 1,
                    variables: initial_variables || {},
                    step_outputs: {}
                })
                .select()
                .single();

            if (error) throw error;

            // Increment workflow usage count
            await supabase
                .from('workflows')
                .update({
                    usage_count: supabase.raw('usage_count + 1'),
                    last_used_at: new Date().toISOString()
                })
                .eq('id', id);

            res.json({
                success: true,
                data: execution
            });
        } catch (error) {
            console.error('Error starting workflow execution:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to start workflow execution'
            });
        }
    });

    /**
     * GET /api/execute120/executions/:id
     * Get execution state
     */
    router.get('/executions/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data: execution, error } = await supabase
                .from('workflow_executions')
                .select(`
                    *,
                    workflow:workflows(
                        id,
                        name,
                        description,
                        icon,
                        steps:workflow_steps(
                            *,
                            agent:agents(id, name, description, icon)
                        )
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;

            // Sort steps by step_number
            if (execution.workflow?.steps) {
                execution.workflow.steps.sort((a, b) => a.step_number - b.step_number);
            }

            res.json({
                success: true,
                data: execution
            });
        } catch (error) {
            console.error('Error fetching execution:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch execution'
            });
        }
    });

    /**
     * PUT /api/execute120/executions/:id
     * Update execution state (advance step, save output, etc.)
     */
    router.put('/executions/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { current_step, variables, step_outputs, status } = req.body;

            const updates = {
                updated_at: new Date().toISOString()
            };

            if (current_step !== undefined) updates.current_step = current_step;
            if (variables !== undefined) updates.variables = variables;
            if (step_outputs !== undefined) updates.step_outputs = step_outputs;
            if (status !== undefined) {
                updates.status = status;
                if (status === 'completed') {
                    updates.completed_at = new Date().toISOString();
                }
            }

            const { data, error } = await supabase
                .from('workflow_executions')
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
            console.error('Error updating execution:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update execution'
            });
        }
    });

    /**
     * POST /api/execute120/executions/:id/step/:stepNumber
     * Execute a specific step (typically agent chat)
     */
    router.post('/executions/:id/step/:stepNumber', async (req, res) => {
        try {
            const { id, stepNumber } = req.params;
            const { user_input } = req.body;

            // Get execution and workflow
            const { data: execution, error: execError } = await supabase
                .from('workflow_executions')
                .select(`
                    *,
                    workflow:workflows(
                        id,
                        steps:workflow_steps(
                            *,
                            agent:agents(*)
                        )
                    )
                `)
                .eq('id', id)
                .single();

            if (execError) throw execError;

            // Find the current step
            const step = execution.workflow.steps.find(s => s.step_number === parseInt(stepNumber));
            if (!step) {
                return res.status(404).json({
                    success: false,
                    error: 'Step not found'
                });
            }

            // Handle different step types
            let stepOutput = null;

            switch (step.step_type) {
                case 'user_input':
                    // Store user input in variables
                    stepOutput = user_input;
                    break;

                case 'agent_chat':
                    // Process template with variables
                    let processedPrompt = step.prompt_template || '';
                    const allVariables = { ...execution.variables, ...execution.step_outputs };

                    // Replace {{variable.path}} with actual values
                    processedPrompt = processedPrompt.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
                        const parts = path.trim().split('.');
                        let value = allVariables;
                        for (const part of parts) {
                            value = value?.[part];
                        }
                        return value !== undefined ? (typeof value === 'object' ? JSON.stringify(value) : value) : match;
                    });

                    // Return the processed prompt for frontend to execute
                    stepOutput = {
                        processed_prompt: processedPrompt,
                        agent_id: step.agent_id,
                        agent: step.agent
                    };
                    break;

                case 'review':
                case 'output':
                    stepOutput = user_input;
                    break;

                case 'decision':
                    stepOutput = user_input;
                    break;

                default:
                    stepOutput = user_input;
            }

            // Update execution with step output
            const updatedStepOutputs = {
                ...execution.step_outputs,
                [stepNumber]: stepOutput
            };

            const { data: updatedExecution, error: updateError } = await supabase
                .from('workflow_executions')
                .update({
                    step_outputs: updatedStepOutputs,
                    current_step: parseInt(stepNumber) + 1,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;

            res.json({
                success: true,
                data: {
                    step_output: stepOutput,
                    execution: updatedExecution
                }
            });
        } catch (error) {
            console.error('Error executing step:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to execute step'
            });
        }
    });

    /**
     * GET /api/execute120/executions
     * Get user's workflow executions
     */
    router.get('/executions', async (req, res) => {
        try {
            const userId = getUserId(req);
            const { status, limit = 20 } = req.query;

            let query = supabase
                .from('workflow_executions')
                .select(`
                    id,
                    status,
                    current_step,
                    started_at,
                    completed_at,
                    workflow:workflows(id, name, icon, color)
                `)
                .eq('user_id', userId)
                .order('started_at', { ascending: false })
                .limit(parseInt(limit));

            if (status) {
                query = query.eq('status', status);
            }

            const { data: executions, error } = await query;

            if (error) throw error;

            res.json({
                success: true,
                data: executions || []
            });
        } catch (error) {
            console.error('Error fetching executions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch executions'
            });
        }
    });

    // ============================================
    // STRATEGY 120 INTEGRATION (Phase 32)
    // ============================================

    /**
     * GET /api/execute120/departments/:id/initiatives
     * Get strategic initiatives assigned to a department
     */
    router.get('/departments/:id/initiatives', async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.query;

            let query = supabase
                .from('department_initiative_assignments')
                .select(`
                    id,
                    assignment_type,
                    responsibility_weight,
                    notes,
                    initiative:strategy_initiatives(
                        id,
                        name,
                        description,
                        perspective_type,
                        ai_investment_type,
                        status,
                        priority,
                        current_progress,
                        timeline
                    )
                `)
                .eq('department_id', id)
                .eq('is_active', true);

            const { data, error } = await query;
            if (error) throw error;

            // Filter by initiative status if provided
            let initiatives = (data || []).map(d => ({
                ...d.initiative,
                assignment_type: d.assignment_type,
                responsibility_weight: d.responsibility_weight
            }));

            if (status) {
                initiatives = initiatives.filter(i => i.status === status);
            }

            res.json({ success: true, data: initiatives });
        } catch (error) {
            console.error('Error fetching department initiatives:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/execute120/departments/:id/initiatives
     * Assign an initiative to a department
     */
    router.post('/departments/:id/initiatives', async (req, res) => {
        try {
            const userId = getUserId(req);
            const { id: department_id } = req.params;
            const { initiative_id, assignment_type, responsibility_weight, notes } = req.body;

            if (!initiative_id) {
                return res.status(400).json({ success: false, error: 'initiative_id is required' });
            }

            const { data, error } = await supabase
                .from('department_initiative_assignments')
                .insert({
                    user_id: userId,
                    department_id,
                    initiative_id,
                    assignment_type: assignment_type || 'contributor',
                    responsibility_weight: responsibility_weight || 25,
                    notes
                })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error assigning initiative:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/execute120/departments/:deptId/initiatives/:initId
     * Remove initiative assignment from department
     */
    router.delete('/departments/:deptId/initiatives/:initId', async (req, res) => {
        try {
            const { deptId, initId } = req.params;

            const { error } = await supabase
                .from('department_initiative_assignments')
                .delete()
                .eq('department_id', deptId)
                .eq('initiative_id', initId);

            if (error) throw error;

            res.json({ success: true });
        } catch (error) {
            console.error('Error removing initiative assignment:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/execute120/workflows/by-initiative/:initiativeId
     * Get workflows linked to a specific initiative
     */
    router.get('/workflows/by-initiative/:initiativeId', async (req, res) => {
        try {
            const { initiativeId } = req.params;

            const { data, error } = await supabase
                .from('workflow_initiative_mappings')
                .select(`
                    id,
                    contribution_type,
                    contribution_weight,
                    workflow:workflows(
                        id,
                        name,
                        description,
                        icon,
                        color,
                        category,
                        usage_count
                    )
                `)
                .eq('initiative_id', initiativeId)
                .eq('is_active', true);

            if (error) throw error;

            const workflows = (data || []).map(d => ({
                ...d.workflow,
                contribution_type: d.contribution_type,
                contribution_weight: d.contribution_weight
            }));

            res.json({ success: true, data: workflows });
        } catch (error) {
            console.error('Error fetching workflows by initiative:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/execute120/workflow-initiative-link
     * Link a workflow to an initiative
     */
    router.post('/workflow-initiative-link', async (req, res) => {
        try {
            const userId = getUserId(req);
            const { workflow_id, initiative_id, contribution_type, contribution_weight, description } = req.body;

            if (!workflow_id || !initiative_id) {
                return res.status(400).json({
                    success: false,
                    error: 'workflow_id and initiative_id are required'
                });
            }

            const { data, error } = await supabase
                .from('workflow_initiative_mappings')
                .insert({
                    user_id: userId,
                    workflow_id,
                    initiative_id,
                    contribution_type: contribution_type || 'supports',
                    contribution_weight: contribution_weight || 10,
                    description
                })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error linking workflow to initiative:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/execute120/workflow-initiative-link/:id
     * Remove workflow-initiative link
     */
    router.delete('/workflow-initiative-link/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('workflow_initiative_mappings')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({ success: true });
        } catch (error) {
            console.error('Error removing workflow-initiative link:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/execute120/initiative-progress
     * Record progress update for an initiative
     */
    router.post('/initiative-progress', async (req, res) => {
        try {
            const userId = getUserId(req);
            const {
                initiative_id,
                source_type,
                workflow_execution_id,
                progress_increment,
                description,
                business_impact
            } = req.body;

            if (!initiative_id) {
                return res.status(400).json({ success: false, error: 'initiative_id is required' });
            }

            // Get current initiative progress
            const { data: initiative, error: initError } = await supabase
                .from('strategy_initiatives')
                .select('current_progress')
                .eq('id', initiative_id)
                .single();

            if (initError) throw initError;

            const previousProgress = initiative?.current_progress || 0;
            const increment = parseFloat(progress_increment) || 0;
            const newProgress = Math.min(100, previousProgress + increment);

            // Record progress entry
            const { data: entry, error: entryError } = await supabase
                .from('initiative_progress_entries')
                .insert({
                    user_id: userId,
                    initiative_id,
                    source_type: source_type || 'manual',
                    workflow_execution_id,
                    progress_increment: increment,
                    previous_progress: previousProgress,
                    new_progress: newProgress,
                    description,
                    business_impact: business_impact || {}
                })
                .select()
                .single();

            if (entryError) throw entryError;

            // Update initiative progress
            const { error: updateError } = await supabase
                .from('strategy_initiatives')
                .update({
                    current_progress: newProgress,
                    progress_updated_at: new Date().toISOString()
                })
                .eq('id', initiative_id);

            if (updateError) throw updateError;

            res.json({
                success: true,
                data: {
                    entry,
                    previous_progress: previousProgress,
                    new_progress: newProgress
                }
            });
        } catch (error) {
            console.error('Error recording initiative progress:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/execute120/initiative-progress/:initiativeId
     * Get progress history for an initiative
     */
    router.get('/initiative-progress/:initiativeId', async (req, res) => {
        try {
            const { initiativeId } = req.params;
            const { limit = 20 } = req.query;

            const { data, error } = await supabase
                .from('initiative_progress_entries')
                .select(`
                    id,
                    source_type,
                    progress_increment,
                    previous_progress,
                    new_progress,
                    description,
                    business_impact,
                    recorded_at,
                    workflow_execution:workflow_executions(
                        id,
                        workflow:workflows(id, name)
                    )
                `)
                .eq('initiative_id', initiativeId)
                .order('recorded_at', { ascending: false })
                .limit(parseInt(limit));

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error fetching initiative progress:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/execute120/strategic-overview
     * Get department strategic overview (initiatives + workflows summary)
     */
    router.get('/strategic-overview', async (req, res) => {
        try {
            // Get all departments with their initiative counts
            const { data: departments, error: deptError } = await supabase
                .from('departments')
                .select('id, name, slug, icon, color')
                .eq('is_active', true)
                .order('sort_order');

            if (deptError) throw deptError;

            // Get initiative assignments per department
            const { data: assignments, error: assignError } = await supabase
                .from('department_initiative_assignments')
                .select(`
                    department_id,
                    initiative:strategy_initiatives(
                        id,
                        status,
                        current_progress,
                        priority
                    )
                `)
                .eq('is_active', true);

            if (assignError) throw assignError;

            // Aggregate stats per department
            const overview = departments.map(dept => {
                const deptAssignments = (assignments || []).filter(a => a.department_id === dept.id);
                const initiatives = deptAssignments.map(a => a.initiative).filter(Boolean);

                return {
                    ...dept,
                    initiative_count: initiatives.length,
                    active_initiatives: initiatives.filter(i => i.status === 'in_progress').length,
                    avg_progress: initiatives.length > 0
                        ? Math.round(initiatives.reduce((sum, i) => sum + (i.current_progress || 0), 0) / initiatives.length)
                        : 0,
                    top_priority: initiatives.length > 0
                        ? Math.max(...initiatives.map(i => i.priority || 0))
                        : 0
                };
            });

            res.json({ success: true, data: overview });
        } catch (error) {
            console.error('Error fetching strategic overview:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};
