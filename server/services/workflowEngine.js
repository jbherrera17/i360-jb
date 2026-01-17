/**
 * Insight 360 - Workflow Execution Engine
 * Handles step-by-step execution of workflows with HITL support
 */

const anthropicService = require('./anthropic');
const perplexityService = require('./perplexity');

class WorkflowEngine {
    constructor(supabase) {
        this.supabase = supabase;
    }

    /**
     * Execute a single workflow step
     */
    async executeStep(executionId, stepNumber, inputData = {}) {
        try {
            // Get execution and workflow details
            const { data: execution, error: execError } = await this.supabase
                .from('workflow_executions')
                .select(`
                    *,
                    workflow:workflows(
                        *,
                        steps:workflow_steps(
                            *,
                            agent:agents(*),
                            skill:skills(*)
                        )
                    )
                `)
                .eq('id', executionId)
                .single();

            if (execError) throw execError;

            const workflow = execution.workflow;
            const step = workflow.steps.find(s => s.step_number === stepNumber);

            if (!step) {
                throw new Error(`Step ${stepNumber} not found in workflow`);
            }

            // Create or update step execution record
            let stepExecution = await this.getOrCreateStepExecution(executionId, step, inputData);

            // Handle different step types
            let result;
            switch (step.step_type) {
                case 'user_input':
                    result = await this.handleUserInput(step, inputData, execution.variables);
                    break;

                case 'agent_chat':
                    result = await this.handleAgentChat(step, inputData, execution.variables);
                    break;

                case 'skill_execution':
                    result = await this.handleSkillExecution(step, inputData, execution.variables);
                    break;

                case 'research':
                    result = await this.handleResearch(step, inputData, execution.variables);
                    break;

                case 'human_gate':
                    result = await this.handleHumanGate(step, inputData);
                    break;

                case 'context_creation':
                    result = await this.handleContextCreation(step, inputData, execution.variables);
                    break;

                case 'review':
                    result = await this.handleReview(step, inputData, execution.variables);
                    break;

                case 'artifact_generation':
                    result = await this.handleArtifactGeneration(step, inputData, execution.variables);
                    break;

                case 'output':
                    result = await this.handleOutput(step, execution.variables);
                    break;

                default:
                    throw new Error(`Unknown step type: ${step.step_type}`);
            }

            // Update step execution with result
            await this.updateStepExecution(stepExecution.id, result);

            // Update execution variables if step produced output
            if (result.output && step.output_variable) {
                const updatedVariables = {
                    ...execution.variables,
                    [step.output_variable]: result.output
                };

                await this.supabase
                    .from('workflow_executions')
                    .update({ variables: updatedVariables })
                    .eq('id', executionId);
            }

            // Determine next action based on execution mode
            const nextAction = this.determineNextAction(step, result);

            return {
                success: true,
                step: stepNumber,
                result,
                nextAction,
                requiresHumanInput: step.execution_mode === 'gate' ||
                                    step.step_type === 'human_gate' ||
                                    step.step_type === 'user_input'
            };
        } catch (error) {
            console.error('Workflow step execution error:', error);
            return {
                success: false,
                step: stepNumber,
                error: error.message
            };
        }
    }

    /**
     * Get or create step execution record
     */
    async getOrCreateStepExecution(executionId, step, inputData) {
        const { data: existing } = await this.supabase
            .from('workflow_step_executions')
            .select('*')
            .eq('execution_id', executionId)
            .eq('step_number', step.step_number)
            .single();

        if (existing) {
            return existing;
        }

        const { data: newExec, error } = await this.supabase
            .from('workflow_step_executions')
            .insert({
                execution_id: executionId,
                step_id: step.id,
                step_number: step.step_number,
                status: 'running',
                input_data: inputData,
                agent_id: step.agent_id,
                skill_id: step.skill_id,
                started_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return newExec;
    }

    /**
     * Update step execution with results
     */
    async updateStepExecution(stepExecId, result) {
        const updateData = {
            status: result.status || 'completed',
            output_data: result.output || {},
            output_content: typeof result.output === 'string' ? result.output : JSON.stringify(result.output),
            completed_at: result.status === 'completed' ? new Date().toISOString() : null,
            tokens_used: result.tokens,
            duration_ms: result.duration,
            error_message: result.error
        };

        if (result.gateStatus) {
            updateData.gate_status = result.gateStatus;
        }

        await this.supabase
            .from('workflow_step_executions')
            .update(updateData)
            .eq('id', stepExecId);
    }

    /**
     * Handle user input step
     */
    async handleUserInput(step, inputData, variables) {
        // User input steps wait for user to provide data
        // The inputData should already contain the user's responses
        if (!inputData || Object.keys(inputData).length === 0) {
            return {
                status: 'waiting_approval',
                output: null,
                message: step.instructions || 'Please provide the required information.',
                fields: step.input_fields
            };
        }

        return {
            status: 'completed',
            output: inputData
        };
    }

    /**
     * Handle agent chat step
     */
    async handleAgentChat(step, inputData, variables) {
        const startTime = Date.now();

        // Build prompt from template
        const prompt = this.interpolateTemplate(step.prompt_template, variables);

        // Get agent config
        const agent = step.agent;
        const systemPrompt = agent?.system_prompt || '';

        // Call Claude
        const response = await anthropicService.chat({
            model: 'claude-sonnet-4-20250514',
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 4096
        });

        return {
            status: 'completed',
            output: response.content,
            tokens: response.usage?.total_tokens,
            duration: Date.now() - startTime
        };
    }

    /**
     * Handle skill execution step
     */
    async handleSkillExecution(step, inputData, variables) {
        const startTime = Date.now();

        const skill = step.skill;
        if (!skill) {
            throw new Error('No skill configured for skill_execution step');
        }

        // Build prompt from skill instructions and template
        const prompt = this.interpolateTemplate(step.prompt_template, variables);
        const systemPrompt = skill.instructions;

        // Call Claude with skill context
        const response = await anthropicService.chat({
            model: 'claude-sonnet-4-20250514',
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 8192
        });

        return {
            status: 'completed',
            output: response.content,
            tokens: response.usage?.total_tokens,
            duration: Date.now() - startTime
        };
    }

    /**
     * Handle research step (uses Perplexity)
     */
    async handleResearch(step, inputData, variables) {
        const startTime = Date.now();

        // Build research query
        const query = this.interpolateTemplate(step.prompt_template, variables);

        // Call Perplexity
        const response = await perplexityService.search({
            query,
            model: 'sonar',
            focus: 'comprehensive'
        });

        return {
            status: 'completed',
            output: response.content || response.answer,
            citations: response.citations,
            duration: Date.now() - startTime
        };
    }

    /**
     * Handle human gate step
     */
    async handleHumanGate(step, inputData) {
        // Check if approval has been provided
        if (inputData?.approved === true) {
            return {
                status: 'completed',
                output: inputData.response || 'Approved',
                gateStatus: 'approved'
            };
        } else if (inputData?.approved === false) {
            return {
                status: 'rejected',
                output: inputData.response || 'Rejected',
                gateStatus: 'rejected'
            };
        }

        // Still waiting for human input
        return {
            status: 'waiting_approval',
            output: null,
            gateStatus: 'waiting',
            message: step.gate_message || 'Please review and approve to continue.'
        };
    }

    /**
     * Handle context creation step
     */
    async handleContextCreation(step, inputData, variables) {
        // This step creates a context asset from the workflow data
        const skill = step.skill;

        if (skill?.produces_context_type) {
            // Create context asset from the collected data
            const contextData = this.interpolateTemplate(
                JSON.stringify(step.input_fields || {}),
                { ...variables, ...inputData }
            );

            return {
                status: 'completed',
                output: {
                    context_type: skill.produces_context_type,
                    data: JSON.parse(contextData)
                }
            };
        }

        return {
            status: 'completed',
            output: inputData
        };
    }

    /**
     * Handle review step
     */
    async handleReview(step, inputData, variables) {
        // Show previous output for review
        const previousOutput = variables[step.output_variable] ||
                              Object.values(variables).slice(-1)[0];

        if (inputData?.approved) {
            return {
                status: 'completed',
                output: inputData.feedback ?
                    { ...previousOutput, feedback: inputData.feedback } :
                    previousOutput
            };
        }

        return {
            status: 'waiting_approval',
            output: previousOutput,
            message: step.instructions || 'Please review the output above.'
        };
    }

    /**
     * Handle artifact generation step
     */
    async handleArtifactGeneration(step, inputData, variables) {
        // Generate documents based on user selection
        const artifacts = [];

        if (inputData?.generate_docx) {
            // Would integrate with docx skill/service
            artifacts.push({ type: 'docx', status: 'pending' });
        }

        if (inputData?.generate_pptx) {
            // Would integrate with pptx skill/service
            artifacts.push({ type: 'pptx', status: 'pending' });
        }

        return {
            status: 'completed',
            output: { artifacts }
        };
    }

    /**
     * Handle output step
     */
    async handleOutput(step, variables) {
        // Compile final output from all variables
        return {
            status: 'completed',
            output: variables
        };
    }

    /**
     * Interpolate template with variables
     */
    interpolateTemplate(template, variables) {
        if (!template) return '';

        let result = template;

        // Replace {{variable}} patterns
        const pattern = /\{\{([^}]+)\}\}/g;
        result = result.replace(pattern, (match, path) => {
            const value = this.getNestedValue(variables, path.trim());
            if (value === undefined) return match;
            return typeof value === 'object' ? JSON.stringify(value, null, 2) : value;
        });

        return result;
    }

    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current?.[key];
        }, obj);
    }

    /**
     * Determine next action after step completion
     */
    determineNextAction(step, result) {
        if (result.status === 'waiting_approval') {
            return {
                action: 'wait_for_input',
                step: step.step_number
            };
        }

        if (result.status === 'rejected') {
            return {
                action: 'revision_needed',
                step: step.step_number
            };
        }

        if (result.status === 'completed') {
            if (step.execution_mode === 'review') {
                return {
                    action: 'show_for_review',
                    step: step.step_number,
                    nextStep: step.step_number + 1
                };
            }

            return {
                action: 'proceed',
                nextStep: step.step_number + 1
            };
        }

        return {
            action: 'error',
            error: result.error
        };
    }

    /**
     * Get execution progress
     */
    async getExecutionProgress(executionId) {
        const { data: execution, error } = await this.supabase
            .from('workflow_execution_progress')
            .select('*')
            .eq('execution_id', executionId)
            .single();

        if (error) throw error;
        return execution;
    }

    /**
     * Advance to next step
     */
    async advanceToNextStep(executionId) {
        const { data: execution, error } = await this.supabase
            .from('workflow_executions')
            .select('*, workflow:workflows(steps:workflow_steps(*))')
            .eq('id', executionId)
            .single();

        if (error) throw error;

        const totalSteps = execution.workflow.steps.length;
        const nextStep = execution.current_step + 1;

        if (nextStep > totalSteps) {
            // Workflow complete
            await this.supabase
                .from('workflow_executions')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .eq('id', executionId);

            // Track initiative progress if workflow is linked to initiatives
            await this.recordInitiativeProgress(executionId, execution);

            return { completed: true };
        }

        // Update to next step
        await this.supabase
            .from('workflow_executions')
            .update({ current_step: nextStep })
            .eq('id', executionId);

        return { completed: false, nextStep };
    }

    /**
     * Record initiative progress when a workflow execution completes
     * This creates closed-loop tracking between Execute 120 and Strategy 120
     */
    async recordInitiativeProgress(executionId, execution) {
        try {
            // Get workflow-initiative mappings for this workflow
            const { data: mappings, error: mappingError } = await this.supabase
                .from('workflow_initiative_mappings')
                .select(`
                    *,
                    initiative:strategy_initiatives(*)
                `)
                .eq('workflow_id', execution.workflow_id)
                .eq('is_active', true);

            if (mappingError || !mappings || mappings.length === 0) {
                // No initiatives linked to this workflow
                return;
            }

            // For each linked initiative, record progress
            for (const mapping of mappings) {
                const initiative = mapping.initiative;
                if (!initiative) continue;

                // Calculate progress increment based on contribution weight
                // Default: 1% progress per execution, scaled by weight
                const baseIncrement = 1;
                const weightedIncrement = (baseIncrement * mapping.contribution_weight) / 100;
                const progressIncrement = Math.min(weightedIncrement, 100 - (initiative.current_progress || 0));

                const newProgress = Math.min((initiative.current_progress || 0) + progressIncrement, 100);

                // Record the progress entry
                await this.supabase
                    .from('initiative_progress_entries')
                    .insert({
                        user_id: execution.user_id,
                        initiative_id: initiative.id,
                        source_type: 'workflow_execution',
                        workflow_execution_id: executionId,
                        progress_increment: progressIncrement,
                        previous_progress: initiative.current_progress || 0,
                        new_progress: newProgress,
                        description: `Workflow "${execution.workflow?.name || 'Unnamed'}" completed successfully`,
                        business_impact: {
                            workflow_id: execution.workflow_id,
                            workflow_name: execution.workflow?.name,
                            contribution_type: mapping.contribution_type,
                            contribution_weight: mapping.contribution_weight,
                            execution_id: executionId,
                            completed_at: new Date().toISOString()
                        }
                    });

                // Update the initiative's current progress
                await this.supabase
                    .from('strategy_initiatives')
                    .update({
                        current_progress: newProgress,
                        progress_updated_at: new Date().toISOString()
                    })
                    .eq('id', initiative.id);

                console.log(`[WorkflowEngine] Recorded progress for initiative "${initiative.name}": ${initiative.current_progress || 0}% -> ${newProgress}%`);
            }
        } catch (error) {
            // Log but don't fail the workflow completion
            console.error('[WorkflowEngine] Error recording initiative progress:', error);
        }
    }
}

module.exports = WorkflowEngine;
