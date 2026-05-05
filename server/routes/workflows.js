/**
 * Insight 360 - Workflow Routes
 * Handles workflow CRUD, execution, and step management
 */

const express = require('express');
const { getUserId } = require('../utils/auth');
const WorkflowEngine = require('../services/workflowEngine');
const createModuleAccessMiddleware = require('../middleware/moduleAccess');
const { requireOrgContext } = require('../middleware/orgContext');

/**
 * Workflow Routes Factory
 * @param {object} supabase - Supabase client instance
 * @returns {Router} Express router
 */
module.exports = function(supabase) {
    const router = express.Router();
    const { requireModule, checkResourceLimit } = createModuleAccessMiddleware(supabase);

    // Phase 81: Module gating — enforce tier/role access for workflows module
    router.use(requireModule('workflows'));

    // Phase 82: Enforce org context — validates x-org-id against user's memberships
    router.use(requireOrgContext(supabase));

/**
 * GET /api/workflows
 * List all workflows (public + user's own)
 */
router.get('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        const { category, suite, is_system, department_id } = req.query;

        let query = supabase
            .from('workflows')
            .select(`
                id,
                name,
                description,
                icon,
                color,
                category,
                suite,
                tags,
                estimated_minutes,
                is_active,
                is_public,
                is_system,
                usage_count,
                department_id,
                created_at,
                updated_at,
                department:departments(id, name, icon, color)
            `)
            .eq('is_active', true);

        // Filter by visibility
        if (userId) {
            query = query.or(`is_public.eq.true,user_id.eq.${userId},user_id.is.null`);
        } else {
            query = query.or('is_public.eq.true,user_id.is.null');
        }

        // === PHASE 46: Organization filtering ===
        const orgId = req.verifiedOrgId;
        if (orgId) {
            // Show workflows belonging to this org OR system workflows (no org)
            query = query.or(`org_id.eq.${orgId},org_id.is.null`);
        }
        // === END PHASE 46 ===

        // Optional filters
        if (category) query = query.eq('category', category);
        if (suite) query = query.eq('suite', suite);
        if (is_system !== undefined) query = query.eq('is_system', is_system === 'true');
        if (department_id) query = query.eq('department_id', department_id);

        query = query.order('usage_count', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            workflows: data || []
        });
    } catch (error) {
        console.error('Error fetching workflows:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/workflows/templates
 * List workflow templates
 */
router.get('/templates', async (req, res) => {
    try {

        const { category, suite } = req.query;

        let query = supabase
            .from('workflow_templates')
            .select('*')
            .eq('is_active', true);

        if (category) query = query.eq('category', category);
        if (suite) query = query.eq('suite', suite);

        query = query.order('usage_count', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            templates: data || []
        });
    } catch (error) {
        console.error('Error fetching workflow templates:', error);
        res.status(500).json({ error: error.message });
    }
});

// Phase 81: Move /executions routes BEFORE /:id to prevent Express from matching
// "executions" as an :id parameter

/**
 * GET /api/workflows/executions
 * List user's workflow executions
 */
router.get('/executions', async (req, res) => {
    try {
        const userId = getUserId(req);
        const orgId = req.verifiedOrgId;
        const { status, limit = 20 } = req.query;

        let query = supabase
            .from('workflow_executions')
            .select(`
                *,
                workflow:workflows(id, name, icon, color)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (status) query = query.eq('status', status);

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            executions: data || []
        });
    } catch (error) {
        console.error('Error fetching executions:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/workflows/executions/:executionId
 * Get execution details with step progress
 */
router.get('/executions/:executionId', async (req, res) => {
    try {
        const userId = getUserId(req);
        const { executionId } = req.params;

        // Get execution with workflow — verify ownership
        const { data: execution, error: execError } = await supabase
            .from('workflow_executions')
            .select(`
                *,
                workflow:workflows(
                    id, name, description, icon, color,
                    steps:workflow_steps(*)
                )
            `)
            .eq('id', executionId)
            .eq('user_id', userId)
            .single();

        if (execError) {
            if (execError.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Execution not found' });
            }
            throw execError;
        }

        // Get step executions
        const { data: stepExecutions, error: stepError } = await supabase
            .from('workflow_step_executions')
            .select('*')
            .eq('execution_id', executionId)
            .order('step_number');

        if (stepError) throw stepError;

        res.json({
            success: true,
            execution: {
                ...execution,
                step_executions: stepExecutions || []
            }
        });
    } catch (error) {
        console.error('Error fetching execution:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/workflows/:id
 * Get workflow with all steps
 */
router.get('/:id', async (req, res) => {
    try {

        const { id } = req.params;

        // Get workflow
        const { data: workflow, error: wfError } = await supabase
            .from('workflows')
            .select(`
                *,
                department:departments(id, name, icon, color),
                template:workflow_templates(id, name, display_name)
            `)
            .eq('id', id)
            .single();

        if (wfError) {
            if (wfError.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Workflow not found' });
            }
            throw wfError;
        }

        // Phase 81: Ownership/org check
        const userId = getUserId(req);
        const orgId = req.verifiedOrgId;
        if (workflow.user_id && workflow.user_id !== userId &&
            workflow.org_id !== orgId &&
            !workflow.is_public) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        // Get steps with agent and skill info
        const { data: steps, error: stepsError } = await supabase
            .from('workflow_steps')
            .select(`
                *,
                agent:agents(id, name, description, icon, color),
                skill:skills(id, name, display_name, description, icon, color)
            `)
            .eq('workflow_id', id)
            .order('step_number');

        if (stepsError) throw stepsError;

        // Get context requirements
        const { data: contextAssets, error: ctxError } = await supabase
            .from('workflow_context_assets')
            .select('*')
            .eq('workflow_id', id);

        if (ctxError) throw ctxError;

        res.json({
            success: true,
            workflow: {
                ...workflow,
                steps: steps || [],
                context_requirements: contextAssets || []
            }
        });
    } catch (error) {
        console.error('Error fetching workflow:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/workflows
 * Create a new workflow
 */
router.post('/', checkResourceLimit('workflows'), async (req, res) => {
    try {

        const userId = getUserId(req);
        const workflowData = req.body;
        const orgId = req.verifiedOrgId;

        const { data, error } = await supabase
            .from('workflows')
            .insert({
                ...workflowData,
                user_id: userId,
                org_id: orgId || null,  // Phase 44: Associate with organization
                is_system: false
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            workflow: data
        });
    } catch (error) {
        console.error('Error creating workflow:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/workflows/from-template/:templateId
 * Create workflow from template
 */
router.post('/from-template/:templateId', async (req, res) => {
    try {

        const userId = getUserId(req);
        const { templateId } = req.params;
        const { name, description } = req.body;

        // Get template
        const { data: template, error: tplError } = await supabase
            .from('workflow_templates')
            .select('*')
            .eq('id', templateId)
            .single();

        if (tplError) throw tplError;

        // Phase 81: Use requesting user's org_id
        const orgId = req.verifiedOrgId;

        // Create workflow from template
        const { data: workflow, error: wfError } = await supabase
            .from('workflows')
            .insert({
                user_id: userId,
                org_id: orgId,
                template_id: templateId,
                name: name || template.display_name,
                description: description || template.description,
                icon: template.icon,
                color: template.color,
                category: template.category,
                suite: template.suite,
                tags: template.tags,
                estimated_minutes: template.estimated_minutes,
                prerequisites: template.template_definition.prerequisites || {},
                is_active: true,
                is_public: false,
                is_system: false
            })
            .select()
            .single();

        if (wfError) throw wfError;

        // Increment template usage
        await supabase
            .from('workflow_templates')
            .update({ usage_count: template.usage_count + 1 })
            .eq('id', templateId);

        res.json({
            success: true,
            workflow
        });
    } catch (error) {
        console.error('Error creating workflow from template:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/workflows/:id
 * Update a workflow
 */
router.put('/:id', async (req, res) => {
    try {

        const userId = getUserId(req);
        const { id } = req.params;
        const updates = req.body;

        // Remove fields that shouldn't be updated directly
        delete updates.id;
        delete updates.user_id;
        delete updates.is_system;
        delete updates.created_at;

        const { data, error } = await supabase
            .from('workflows')
            .update(updates)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            workflow: data
        });
    } catch (error) {
        console.error('Error updating workflow:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/workflows/:id
 * Delete a workflow
 */
router.delete('/:id', async (req, res) => {
    try {

        const userId = getUserId(req);
        const { id } = req.params;

        const { error } = await supabase
            .from('workflows')
            .delete()
            .eq('id', id)
            .eq('user_id', userId)
            .eq('is_system', false);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting workflow:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// WORKFLOW STEPS
// ============================================

    /**
     * Phase 81: Verify the requesting user owns the parent workflow
     * before allowing step modifications.
     */
    async function verifyWorkflowOwnership(req, workflowId) {
        const userId = getUserId(req);
        const orgId = req.verifiedOrgId;
        const { data: wf } = await supabase
            .from('workflows')
            .select('user_id, org_id, is_public')
            .eq('id', workflowId)
            .single();
        if (!wf) return false;
        if (wf.user_id === userId) return true;
        if (orgId && wf.org_id === orgId) return true;
        if (!wf.user_id) return true; // system workflow
        return false;
    }

/**
 * POST /api/workflows/:id/steps
 * Add a step to workflow
 */
router.post('/:id/steps', async (req, res) => {
    try {

        const { id } = req.params;

        // Phase 81: Verify workflow ownership before adding steps
        if (!(await verifyWorkflowOwnership(req, id))) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const stepData = req.body;

        const { data, error } = await supabase
            .from('workflow_steps')
            .insert({
                ...stepData,
                workflow_id: id
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            step: data
        });
    } catch (error) {
        console.error('Error adding workflow step:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/workflows/:id/steps/:stepId
 * Update a workflow step
 */
router.put('/:id/steps/:stepId', async (req, res) => {
    try {
        const { id, stepId } = req.params;

        // Phase 81: Verify workflow ownership
        if (!(await verifyWorkflowOwnership(req, id))) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const updates = req.body;

        delete updates.id;
        delete updates.workflow_id;

        const { data, error } = await supabase
            .from('workflow_steps')
            .update(updates)
            .eq('id', stepId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            step: data
        });
    } catch (error) {
        console.error('Error updating workflow step:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/workflows/:id/steps/:stepId
 * Delete a workflow step
 */
router.delete('/:id/steps/:stepId', async (req, res) => {
    try {
        const { id, stepId } = req.params;

        // Phase 81: Verify workflow ownership
        if (!(await verifyWorkflowOwnership(req, id))) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const { error } = await supabase
            .from('workflow_steps')
            .delete()
            .eq('id', stepId);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting workflow step:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/workflows/:id/steps/reorder
 * Reorder workflow steps
 */
router.put('/:id/steps/reorder', async (req, res) => {
    try {

        const { id } = req.params;

        // Phase 81: Verify workflow ownership
        if (!(await verifyWorkflowOwnership(req, id))) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const { stepOrder } = req.body; // Array of { stepId, step_number }

        // Update each step's order
        const updates = stepOrder.map(({ stepId, step_number }) =>
            supabase
                .from('workflow_steps')
                .update({ step_number })
                .eq('id', stepId)
                .eq('workflow_id', id)
        );

        await Promise.all(updates);

        res.json({ success: true });
    } catch (error) {
        console.error('Error reordering steps:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// WORKFLOW EXECUTIONS
// ============================================

/**
 * POST /api/workflows/:id/execute
 * Start a new workflow execution
 */
router.post('/:id/execute', async (req, res) => {
    try {

        const userId = getUserId(req);
        const { id } = req.params;
        const { initial_variables } = req.body;

        // Phase 81: Include org_id in execution record
        const orgId = req.verifiedOrgId;

        // Create execution record
        const { data: execution, error } = await supabase
            .from('workflow_executions')
            .insert({
                workflow_id: id,
                user_id: userId,
                org_id: orgId,
                status: 'in_progress',
                current_step: 1,
                variables: initial_variables || {},
                started_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        // Increment workflow usage
        await supabase.rpc('increment_workflow_usage', { workflow_id: id });

        res.json({
            success: true,
            execution
        });
    } catch (error) {
        console.error('Error starting workflow execution:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/workflows/executions/:executionId
 * Update execution (advance step, update variables, etc.)
 */
router.put('/executions/:executionId', async (req, res) => {
    try {

        const userId = getUserId(req);
        const { executionId } = req.params;
        const updates = req.body;

        delete updates.id;
        delete updates.workflow_id;
        delete updates.user_id;

        const { data, error } = await supabase
            .from('workflow_executions')
            .update(updates)
            .eq('id', executionId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            execution: data
        });
    } catch (error) {
        console.error('Error updating execution:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/workflows/executions/:executionId/steps/:stepNumber
 * Execute or update a specific step
 */
router.post('/executions/:executionId/steps/:stepNumber', async (req, res) => {
    try {

        const workflowEngine = new WorkflowEngine(supabase);
        const { executionId, stepNumber } = req.params;
        const { action, input_data, output_data, gate_response } = req.body;
        const parsedStepNumber = parseInt(stepNumber, 10);

        let normalizedInput = input_data || {};
        if (action === 'approve') {
            normalizedInput = {
                approved: true,
                response: gate_response || null
            };
        } else if (action === 'reject') {
            normalizedInput = {
                approved: false,
                response: gate_response || null
            };
        } else if (output_data) {
            normalizedInput = output_data;
        }

        const stepResult = await workflowEngine.executeStep(
            executionId,
            parsedStepNumber,
            {
                ...normalizedInput,
                user_id: getUserId(req),
                org_id: req.verifiedOrgId,
                module: 'workflows'
            }
        );

        if (!stepResult.success) {
            return res.status(500).json({
                success: false,
                error: stepResult.error || 'Step execution failed',
                meta: {
                    runtime: stepResult.runtime || null
                }
            });
        }

        if (stepResult.nextAction?.action === 'proceed') {
            await workflowEngine.advanceToNextStep(executionId);
        }

        const { data: stepExecution, error: fetchError } = await supabase
            .from('workflow_step_executions')
            .select('*')
            .eq('execution_id', executionId)
            .eq('step_number', parsedStepNumber)
            .single();

        if (fetchError) throw fetchError;

        res.json({
            success: true,
            step_execution: stepExecution,
            next_action: stepResult.nextAction,
            meta: {
                runtime: stepResult.runtime || null
            }
        });
    } catch (error) {
        console.error('Error executing step:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/workflows/executions/:executionId/cancel
 * Cancel an in-progress execution
 */
router.post('/executions/:executionId/cancel', async (req, res) => {
    try {

        const userId = getUserId(req);
        const { executionId } = req.params;

        const { data, error } = await supabase
            .from('workflow_executions')
            .update({
                status: 'cancelled',
                completed_at: new Date().toISOString()
            })
            .eq('id', executionId)
            .eq('user_id', userId)
            .eq('status', 'in_progress')
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, execution: data });
    } catch (error) {
        console.error('Error cancelling execution:', error);
        res.status(500).json({ error: error.message });
    }
});

    return router;
};

