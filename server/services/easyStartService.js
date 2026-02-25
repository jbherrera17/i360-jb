/**
 * INSIGHT 360 - Easy Start Service
 * Version: 1.0.0
 *
 * Manages the Easy Start conversational onboarding experience.
 * Defines tool schemas for Claude function calling and handles
 * resource creation (agents, actions, workflows).
 */

const { randomUUID: uuidv4 } = require('crypto');
const higginsService = require('./higginsService');

// ============================================
// TOOL DEFINITIONS (Anthropic function calling)
// ============================================

const EASY_START_TOOLS = [
    {
        name: 'create_agent',
        description: 'Create a new custom AI agent tailored to the user\'s specific needs. Use this when the user has approved your suggestion to create an agent for a particular task or role.',
        input_schema: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'A clear, descriptive name for the agent (e.g., "Weekly Sales Report Writer")'
                },
                description: {
                    type: 'string',
                    description: 'A 1-2 sentence description of what this agent does'
                },
                system_prompt: {
                    type: 'string',
                    description: 'Detailed instructions that define the agent\'s behavior, expertise, and output style. Be thorough and specific.'
                },
                category: {
                    type: 'string',
                    enum: ['custom', 'sales', 'marketing', 'operations', 'hr', 'finance', 'executive', 'research', 'content', 'analytics'],
                    description: 'The functional category this agent belongs to'
                },
                introduction: {
                    type: 'string',
                    description: 'A friendly greeting message the agent shows when first opened'
                },
                conversation_starters: {
                    type: 'array',
                    items: { type: 'string' },
                    maxItems: 4,
                    description: 'Suggested opening prompts users can click to start a conversation'
                },
                department_id: {
                    type: 'string',
                    description: 'UUID of the department this agent should be assigned to (optional)'
                }
            },
            required: ['name', 'description', 'system_prompt']
        }
    },
    {
        name: 'create_action',
        description: 'Create a Parthenon action — a reusable AI-powered task that can be executed on demand. Actions are single-step operations like generating a report, analyzing data, or drafting content.',
        input_schema: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'A clear name for the action (e.g., "Generate Weekly Status Report")'
                },
                description: {
                    type: 'string',
                    description: 'What this action does and when to use it'
                },
                icon: {
                    type: 'string',
                    description: 'A Lucide icon name (e.g., "file-text", "bar-chart", "mail", "zap")',
                    default: 'zap'
                },
                color: {
                    type: 'string',
                    description: 'Hex color for the action card (e.g., "#6366f1", "#10b981")',
                    default: '#6366f1'
                },
                ai_prompt: {
                    type: 'string',
                    description: 'The system prompt that defines how the AI should execute this action'
                },
                department_id: {
                    type: 'string',
                    description: 'UUID of the department this action serves (optional)'
                }
            },
            required: ['name', 'description']
        }
    },
    {
        name: 'create_workflow',
        description: 'Create a multi-step workflow that guides the user through a sequence of tasks. Workflows combine AI agent interactions, user inputs, and review stages into a structured process.',
        input_schema: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'A clear name for the workflow (e.g., "Client Onboarding Process")'
                },
                description: {
                    type: 'string',
                    description: 'What this workflow accomplishes and who should use it'
                },
                icon: {
                    type: 'string',
                    description: 'A Lucide icon name (e.g., "git-branch", "layers", "workflow")',
                    default: 'git-branch'
                },
                category: {
                    type: 'string',
                    enum: ['automation', 'content', 'research', 'reporting', 'onboarding', 'review', 'general'],
                    description: 'The workflow category',
                    default: 'general'
                },
                estimated_minutes: {
                    type: 'number',
                    description: 'Estimated time to complete in minutes'
                },
                department_id: {
                    type: 'string',
                    description: 'UUID of the department this workflow belongs to (optional)'
                },
                steps: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                description: 'Step name'
                            },
                            description: {
                                type: 'string',
                                description: 'What happens in this step'
                            },
                            step_type: {
                                type: 'string',
                                enum: ['agent_chat', 'user_input', 'review', 'output'],
                                description: 'The type of step'
                            },
                            prompt_template: {
                                type: 'string',
                                description: 'AI prompt template for this step. Use {{variable}} for dynamic values.'
                            }
                        },
                        required: ['name', 'step_type']
                    },
                    description: 'The ordered steps in this workflow'
                }
            },
            required: ['name', 'description']
        }
    }
];

// ============================================
// EASY START SYSTEM PROMPT
// ============================================

const EASY_START_INSTRUCTIONS = `
EASY START MODE:
You are guiding a new user through setting up their Insight 360 workspace.
Your goal is to understand their work, challenges, and goals, then create customized AI tools for them.

CONVERSATION PHASES:

1. WELCOME (1 exchange):
   - Greet warmly. Explain that you'll have a brief conversation to understand their needs, then create custom AI tools for them.
   - Keep it short and inviting. Don't overwhelm with details.

2. DISCOVERY (2-4 exchanges):
   - Ask about their role, daily tasks, and biggest pain points. One focused question at a time.
   - Listen deeply — the specific language they use matters for crafting effective tools.
   - Ask clarifying follow-ups that show you were listening.
   - Understand their team size, key responsibilities, and what success looks like.

3. PROPOSAL (1 exchange):
   - Present 2-4 specific tools you'll create. For each, give:
     * A clear name
     * A one-sentence description of what it does
     * How it addresses their specific pain point
   - Mix of agents (for ongoing conversations), actions (for one-shot tasks), and workflows (for multi-step processes) as appropriate.
   - Say something like "Based on what you've shared, here's what I'd like to create for you:"

4. CONFIRMATION (1 exchange):
   - Ask "Would you like me to go ahead and create these?" or similar.
   - If they want changes, adjust gracefully — don't push back.
   - If they approve only some items, create only those.

5. CREATION:
   - Create resources one at a time.
   - Before each creation, briefly narrate what you're building: "First, let me set up your [name]..."
   - After each creation, give a brief confirmation: "Done! Your [name] is ready."

6. HANDOFF:
   - Celebrate what was accomplished with genuine warmth.
   - Tell them their new tools are available in Execute 120.
   - Offer to create more tools or answer questions about using what was built.

TOOL USE RULES:
- ONLY create tools AFTER the user has explicitly confirmed in Phase 4. Never create preemptively.
- Never create more than 5 resources in a single session without checking in.
- Always narrate what you're creating before calling a tool.
- If an org resource limit is hit, explain it clearly and suggest which existing tools to try instead.
- Write thorough, high-quality system prompts for agents — they should be experts in their domain.
- For workflows, create 3-5 well-structured steps that guide users through the process.

PERSONALITY:
- Warm, curious, encouraging — never clinical or robotic.
- Ask follow-up questions that show you were genuinely listening.
- Use the user's own words and terminology back to them.
- Celebrate each creation with authentic enthusiasm, not performative excitement.
- If uncertain about something, ask rather than assume.
`;

// ============================================
// SYSTEM PROMPT BUILDER
// ============================================

/**
 * Build the complete Easy Start system prompt
 * Layers: Higgins persona + soul context + Easy Start instructions
 */
async function buildEasyStartSystemPrompt(supabase, options = {}) {
    const {
        isAdmin = false,
        modelName = 'Claude Sonnet 4.5',
        soulContext = null
    } = options;

    // Get the base Higgins prompt (persona + knowledge)
    const higginsPrompt = await higginsService.getHigginsSystemPrompt(supabase, {
        isAdmin,
        modelName,
        soulContext,
        userSystemPrompt: EASY_START_INSTRUCTIONS
    });

    return higginsPrompt;
}

// ============================================
// TOOL EXECUTION
// ============================================

/**
 * Execute a tool call from Claude and create the resource
 * @param {string} toolName - Name of the tool (create_agent, create_action, create_workflow)
 * @param {object} toolInput - Parsed tool input from Claude
 * @param {object} context - { supabase, orgId, userId }
 * @returns {object} - { success, data, error }
 */
async function executeToolCall(toolName, toolInput, context) {
    const { supabase, orgId, userId } = context;

    switch (toolName) {
        case 'create_agent':
            return createAgent(toolInput, supabase, orgId, userId);
        case 'create_action':
            return createAction(toolInput, supabase, orgId, userId);
        case 'create_workflow':
            return createWorkflow(toolInput, supabase, orgId, userId);
        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

/**
 * Create an agent via Supabase
 */
async function createAgent(input, supabase, orgId, userId) {
    try {
        // Check org limits
        if (orgId) {
            const { data: limits, error: limitError } = await supabase
                .rpc('check_org_limits', { p_org_id: orgId, p_resource_type: 'agents' });

            if (!limitError && limits && limits[0] && !limits[0].within_limits) {
                return {
                    success: false,
                    error: `Agent limit reached (${limits[0].current_count}/${limits[0].max_allowed}). Your subscription plan allows ${limits[0].max_allowed} agents.`
                };
            }
        }

        const agentId = uuidv4();
        const agentData = {
            id: agentId,
            user_id: userId,
            org_id: orgId || null,
            name: input.name,
            description: input.description || '',
            icon: 'bot',
            type: 'custom',
            category: input.category || 'custom',
            suite: 'execute',
            llm_provider: 'anthropic',
            llm_model: 'claude-sonnet-4-5-20250929',
            temperature: 0.7,
            max_tokens: 4096,
            system_prompt: input.system_prompt,
            introduction: input.introduction || null,
            conversation_starters: input.conversation_starters || [],
            is_active: true,
            created_by: userId,
            guardrails: {
                max_context_tokens: 8000,
                require_context: false,
                allowed_topics: [],
                blocked_topics: [],
                output_format: null
            }
        };

        const { data, error } = await supabase
            .from('agents')
            .insert(agentData)
            .select('id, name, description, category, icon')
            .single();

        if (error) throw error;

        // Link to department if provided
        if (input.department_id) {
            await supabase
                .from('department_agents')
                .insert({
                    department_id: input.department_id,
                    agent_id: data.id,
                    is_featured: false,
                    sort_order: 999
                });
        }

        return {
            success: true,
            data: {
                id: data.id,
                name: data.name,
                description: data.description,
                category: data.category,
                type: 'agent',
                link: `/chat.html?agent=${data.id}`
            }
        };
    } catch (error) {
        console.error('Easy Start - Error creating agent:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Create an action via Supabase
 */
async function createAction(input, supabase, orgId, userId) {
    try {
        // Check org limits
        if (orgId) {
            const { data: limits, error: limitError } = await supabase
                .rpc('check_org_limits', { p_org_id: orgId, p_resource_type: 'actions' });

            if (!limitError && limits?.[0] && !limits[0].within_limits) {
                return {
                    success: false,
                    error: `Action limit reached (${limits[0].current_count}/${limits[0].max_allowed}). Your subscription plan allows ${limits[0].max_allowed} actions.`
                };
            }
        }

        // Auto-generate slug from name
        const slug = input.name.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .substring(0, 60);

        const actionId = uuidv4();
        const actionData = {
            id: actionId,
            user_id: userId,
            org_id: orgId || null,
            name: input.name,
            slug: `${slug}-${actionId.substring(0, 8)}`,
            description: input.description || '',
            icon: input.icon || 'zap',
            color: input.color || '#6366f1',
            suite: 'execute',
            context_assets: [],
            parthenon_context: {},
            ai_engine: {
                type: 'native',
                native: {
                    model: 'claude-sonnet-4-5-20250929',
                    temperature: 0.7,
                    system_prompt: input.ai_prompt || input.description
                }
            },
            ux_config: {},
            status: 'active',
            is_public: false,
            is_featured: false,
            usage_count: 0
        };

        const { data, error } = await supabase
            .from('actions')
            .insert(actionData)
            .select('id, name, slug, description, icon, color')
            .single();

        if (error) throw error;

        // Link to department if provided
        if (input.department_id) {
            await supabase
                .from('action_departments')
                .insert({
                    id: uuidv4(),
                    action_id: data.id,
                    department_id: input.department_id,
                    relationship: 'serves',
                    is_primary: true,
                    priority: 1
                });
        }

        return {
            success: true,
            data: {
                id: data.id,
                name: data.name,
                slug: data.slug,
                description: data.description,
                icon: data.icon,
                color: data.color,
                type: 'action',
                link: `/actions.html?action=${data.id}&execute=true`
            }
        };
    } catch (error) {
        console.error('Easy Start - Error creating action:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Create a workflow (with steps) via Supabase
 */
async function createWorkflow(input, supabase, orgId, userId) {
    try {
        // Check org limits
        if (orgId) {
            const { data: limits, error: limitError } = await supabase
                .rpc('check_org_limits', { p_org_id: orgId, p_resource_type: 'workflows' });

            if (!limitError && limits && limits[0] && !limits[0].within_limits) {
                return {
                    success: false,
                    error: `Workflow limit reached (${limits[0].current_count}/${limits[0].max_allowed}). Your subscription plan allows ${limits[0].max_allowed} workflows.`
                };
            }
        }

        const workflowData = {
            user_id: userId,
            org_id: orgId || null,
            department_id: input.department_id || null,
            name: input.name,
            description: input.description || '',
            icon: input.icon || 'git-branch',
            color: '#f59e0b',
            category: input.category || 'general',
            suite: 'execute',
            estimated_minutes: input.estimated_minutes || null,
            is_active: true,
            is_public: false,
            is_system: false,
            usage_count: 0
        };

        const { data: workflow, error: wfError } = await supabase
            .from('workflows')
            .insert(workflowData)
            .select('id, name, description, icon, category')
            .single();

        if (wfError) throw wfError;

        // Create steps if provided
        let stepCount = 0;
        if (input.steps && input.steps.length > 0) {
            const stepsData = input.steps.map((step, index) => ({
                workflow_id: workflow.id,
                step_number: index + 1,
                name: step.name,
                description: step.description || '',
                step_type: step.step_type || 'agent_chat',
                prompt_template: step.prompt_template || null,
                input_fields: step.step_type === 'user_input' ? [{ name: 'input', label: step.name, type: 'textarea' }] : [],
                output_variable: `step_${index + 1}_output`
            }));

            const { error: stepsError } = await supabase
                .from('workflow_steps')
                .insert(stepsData);

            if (stepsError) {
                console.error('Easy Start - Error creating workflow steps:', stepsError.message);
            } else {
                stepCount = stepsData.length;
            }
        }

        return {
            success: true,
            data: {
                id: workflow.id,
                name: workflow.name,
                description: workflow.description,
                icon: workflow.icon,
                category: workflow.category,
                step_count: stepCount,
                type: 'workflow',
                link: `/workflow-run.html?id=${workflow.id}`
            }
        };
    } catch (error) {
        console.error('Easy Start - Error creating workflow:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    EASY_START_TOOLS,
    EASY_START_INSTRUCTIONS,
    buildEasyStartSystemPrompt,
    executeToolCall
};
