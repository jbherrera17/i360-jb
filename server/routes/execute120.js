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

    return router;
};
