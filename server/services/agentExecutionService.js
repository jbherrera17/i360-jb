/**
 * INSIGHT 360 - Agent Execution Service
 * Version: 1.0.0
 *
 * Backend orchestration service for the Modal Dialog Service.
 * Provides context-aware agent execution with streaming support,
 * workflow orchestration, and structured output parsing.
 */

const { createClient } = require('@supabase/supabase-js');
const agentService = require('./agentService');
const contextService = require('./contextService');
const { randomUUID: uuidv4 } = require('crypto');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * AgentExecutionService
 *
 * Orchestrates agent execution with context assembly, streaming,
 * and structured output parsing for the Align 120 module and beyond.
 */
class AgentExecutionService {
    /**
     * Execute an agent with assembled context
     * @param {string} agentId - Agent UUID
     * @param {Object} moduleContext - Module-specific context data
     * @param {Object} sessionContext - Session context (company profile, previous outputs)
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} - Execution result
     */
    async executeWithContext(agentId, moduleContext, sessionContext, options = {}) {
        const {
            userId,
            stream = false,
            outputSchema = null,
            validateOutput = true
        } = options;

        try {
            // Build the user message from context
            const userMessage = this.buildUserMessage(moduleContext, sessionContext);

            // Execute agent
            const result = await agentService.executeAgent(agentId, {
                userMessage,
                conversationHistory: sessionContext.conversationHistory || [],
                userId,
                includeOnDemand: sessionContext.includeOnDemand || []
            });

            // Parse structured output if schema provided
            let parsedOutput = null;
            if (outputSchema) {
                parsedOutput = this.parseStructuredOutput(result.response, outputSchema);

                // Validate if requested
                if (validateOutput && parsedOutput) {
                    const validation = this.validateOutput(parsedOutput, outputSchema);
                    if (!validation.valid) {
                        console.warn('Output validation warnings:', validation.warnings);
                    }
                    parsedOutput._validation = validation;
                }
            }

            return {
                success: true,
                response: result.response,
                parsedOutput,
                execution_id: result.execution_id,
                model: result.model,
                provider: result.provider,
                context_used: result.context_used,
                usage: result.usage,
                duration_ms: result.duration_ms
            };

        } catch (error) {
            console.error('AgentExecutionService.executeWithContext error:', error);
            return {
                success: false,
                error: error.message,
                errorCode: error.code || 'EXECUTION_ERROR'
            };
        }
    }

    /**
     * Execute a workflow (multiple agents in sequence)
     * @param {Array} workflowConfig - Array of agent configurations
     * @param {Object} context - Shared context
     * @param {Object} options - Workflow options
     * @returns {Promise<Object>} - Workflow results
     */
    async executeWorkflow(workflowConfig, context, options = {}) {
        const {
            userId,
            continueOnError = false,
            onStepStart = null,
            onStepComplete = null,
            onStepError = null
        } = options;

        const results = {};
        let sharedContext = { ...context };

        for (let i = 0; i < workflowConfig.length; i++) {
            const step = workflowConfig[i];
            const stepId = step.id || `step_${i}`;

            // Notify step start
            if (onStepStart) {
                await onStepStart({
                    stepIndex: i,
                    stepId,
                    agentId: step.agentId,
                    name: step.name
                });
            }

            try {
                // Merge shared context with step-specific context
                const stepContext = {
                    ...sharedContext,
                    ...step.context,
                    previousResults: results
                };

                // Execute agent for this step
                const result = await this.executeWithContext(
                    step.agentId,
                    step.moduleContext || {},
                    stepContext,
                    {
                        userId,
                        outputSchema: step.outputSchema
                    }
                );

                if (!result.success) {
                    throw new Error(result.error);
                }

                // Store result
                results[stepId] = {
                    success: true,
                    response: result.response,
                    parsedOutput: result.parsedOutput,
                    execution_id: result.execution_id,
                    duration_ms: result.duration_ms
                };

                // Pass results to next step if configured
                if (step.passResultsAs) {
                    sharedContext[step.passResultsAs] = result.parsedOutput || result.response;
                }

                // Notify step complete
                if (onStepComplete) {
                    await onStepComplete({
                        stepIndex: i,
                        stepId,
                        result: results[stepId]
                    });
                }

            } catch (error) {
                results[stepId] = {
                    success: false,
                    error: error.message
                };

                // Notify step error
                if (onStepError) {
                    await onStepError({
                        stepIndex: i,
                        stepId,
                        error: error.message
                    });
                }

                // Stop workflow unless configured to continue
                if (!continueOnError) {
                    return {
                        success: false,
                        completedSteps: i,
                        totalSteps: workflowConfig.length,
                        results,
                        error: error.message,
                        failedStep: stepId
                    };
                }
            }
        }

        return {
            success: true,
            completedSteps: workflowConfig.length,
            totalSteps: workflowConfig.length,
            results
        };
    }

    /**
     * Stream agent execution for live display
     * @param {string} agentId - Agent UUID
     * @param {Object} moduleContext - Module-specific context
     * @param {Object} sessionContext - Session context
     * @param {Object} options - Streaming options
     * @returns {AsyncGenerator} - Async generator yielding chunks
     */
    async *streamExecution(agentId, moduleContext, sessionContext, options = {}) {
        const {
            userId,
            outputSchema = null
        } = options;

        const userMessage = this.buildUserMessage(moduleContext, sessionContext);
        let fullContent = '';

        // Yield progress event
        yield {
            type: 'progress',
            percent: 0,
            status: 'Initializing agent...'
        };

        try {
            // Use the streaming callback pattern from agentService
            const streamPromise = new Promise((resolve, reject) => {
                let executionMeta = null;

                agentService.streamAgent(agentId, {
                    userMessage,
                    conversationHistory: sessionContext.conversationHistory || [],
                    userId,
                    includeOnDemand: sessionContext.includeOnDemand || [],
                    onToken: (token) => {
                        fullContent += token;
                    },
                    onComplete: (meta) => {
                        executionMeta = meta;
                        resolve(meta);
                    },
                    onError: (error) => {
                        reject(error);
                    }
                });
            });

            // Yield content chunks (polling approach for generator)
            let lastLength = 0;
            const pollInterval = 50; // ms
            let progress = 10;

            while (true) {
                // Check if streaming is complete
                const isComplete = await Promise.race([
                    streamPromise.then(() => true),
                    new Promise(resolve => setTimeout(() => resolve(false), pollInterval))
                ]);

                // Yield new content if any
                if (fullContent.length > lastLength) {
                    const newContent = fullContent.slice(lastLength);
                    lastLength = fullContent.length;

                    yield {
                        type: 'content',
                        content: newContent
                    };

                    // Update progress based on content length
                    progress = Math.min(90, 10 + (fullContent.length / 100));
                    yield {
                        type: 'progress',
                        percent: progress,
                        status: 'Generating response...'
                    };
                }

                if (isComplete) break;
            }

            // Get final metadata
            const meta = await streamPromise;

            // Parse structured output if schema provided
            let parsedOutput = null;
            if (outputSchema) {
                parsedOutput = this.parseStructuredOutput(fullContent, outputSchema);
            }

            // Yield completion event
            yield {
                type: 'progress',
                percent: 100,
                status: 'Complete'
            };

            yield {
                type: 'complete',
                result: {
                    response: fullContent,
                    parsedOutput,
                    execution_id: meta.execution_id,
                    context_used: meta.context_used,
                    usage: meta.usage,
                    duration_ms: meta.duration_ms
                }
            };

        } catch (error) {
            yield {
                type: 'error',
                error: error.message
            };
        }
    }

    /**
     * Build user message from module and session context
     * @param {Object} moduleContext - Module-specific data
     * @param {Object} sessionContext - Session data
     * @returns {string} - Formatted user message
     */
    buildUserMessage(moduleContext, sessionContext) {
        const parts = [];

        // Add company profile if available
        if (sessionContext.companyProfile) {
            parts.push('## Company Information');
            parts.push(this.formatObject(sessionContext.companyProfile));
        }

        // Add module-specific context
        if (moduleContext.questionAnswers) {
            parts.push('## User Responses');
            moduleContext.questionAnswers.forEach((qa, i) => {
                parts.push(`**Q${i + 1}: ${qa.question}**`);
                parts.push(`A: ${qa.answer}`);
                parts.push('');
            });
        }

        // Add previous module outputs if available
        if (sessionContext.previousOutputs) {
            parts.push('## Previous Module Outputs');
            Object.entries(sessionContext.previousOutputs).forEach(([key, value]) => {
                parts.push(`### ${key}`);
                parts.push(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
                parts.push('');
            });
        }

        // Add any custom prompt
        if (moduleContext.customPrompt) {
            parts.push('## Task');
            parts.push(moduleContext.customPrompt);
        }

        // Add output format instruction
        if (moduleContext.outputFormat === 'json') {
            parts.push('');
            parts.push('**Important:** Respond with valid JSON only. Do not include any text before or after the JSON object.');
        }

        return parts.join('\n');
    }

    /**
     * Parse structured output from agent response
     * @param {string} response - Raw response text
     * @param {Object} schema - Expected output schema
     * @returns {Object|null} - Parsed output or null if parsing fails
     */
    parseStructuredOutput(response, schema) {
        if (!response) return null;

        // Try to extract JSON from the response
        const jsonPatterns = [
            // Full JSON object
            /\{[\s\S]*\}/,
            // JSON in code block
            /```(?:json)?\s*([\s\S]*?)```/,
            // Array
            /\[[\s\S]*\]/
        ];

        for (const pattern of jsonPatterns) {
            const match = response.match(pattern);
            if (match) {
                try {
                    const jsonStr = match[1] || match[0];
                    const parsed = JSON.parse(jsonStr);

                    // Apply schema defaults for missing fields
                    if (schema && schema.properties) {
                        return this.applySchemaDefaults(parsed, schema);
                    }

                    return parsed;
                } catch (e) {
                    // Try next pattern
                    continue;
                }
            }
        }

        // If no JSON found, try to structure the text response
        if (schema && schema.fallbackExtraction) {
            return this.extractFromText(response, schema);
        }

        return null;
    }

    /**
     * Apply schema defaults to parsed output
     * @param {Object} data - Parsed data
     * @param {Object} schema - Schema with defaults
     * @returns {Object} - Data with defaults applied
     */
    applySchemaDefaults(data, schema) {
        if (!schema.properties) return data;

        const result = { ...data };

        for (const [key, propSchema] of Object.entries(schema.properties)) {
            if (result[key] === undefined && propSchema.default !== undefined) {
                result[key] = propSchema.default;
            }
        }

        return result;
    }

    /**
     * Extract structured data from text response
     * @param {string} text - Text response
     * @param {Object} schema - Extraction schema
     * @returns {Object} - Extracted data
     */
    extractFromText(text, schema) {
        const extracted = {};

        if (schema.extractionRules) {
            for (const [key, rule] of Object.entries(schema.extractionRules)) {
                if (rule.pattern) {
                    const match = text.match(new RegExp(rule.pattern, 'i'));
                    if (match) {
                        extracted[key] = rule.transform
                            ? rule.transform(match[1])
                            : match[1];
                    }
                }

                if (rule.listPattern) {
                    const matches = text.match(new RegExp(rule.listPattern, 'gi'));
                    if (matches) {
                        extracted[key] = matches.map(m =>
                            rule.transform ? rule.transform(m) : m
                        );
                    }
                }
            }
        }

        return Object.keys(extracted).length > 0 ? extracted : null;
    }

    /**
     * Validate output against expected schema
     * @param {Object} output - Parsed output
     * @param {Object} schema - Validation schema
     * @returns {Object} - Validation result
     */
    validateOutput(output, schema) {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };

        if (!output) {
            result.valid = false;
            result.errors.push('Output is null or undefined');
            return result;
        }

        // Check required fields
        if (schema.required) {
            for (const field of schema.required) {
                if (output[field] === undefined || output[field] === null) {
                    result.valid = false;
                    result.errors.push(`Missing required field: ${field}`);
                }
            }
        }

        // Check field types
        if (schema.properties) {
            for (const [key, propSchema] of Object.entries(schema.properties)) {
                if (output[key] !== undefined) {
                    const typeValid = this.validateType(output[key], propSchema.type);
                    if (!typeValid) {
                        result.warnings.push(
                            `Field "${key}" has unexpected type. Expected ${propSchema.type}, got ${typeof output[key]}`
                        );
                    }

                    // Check nested validation rules
                    if (propSchema.validation) {
                        const validationErrors = this.runValidationRules(
                            output[key],
                            propSchema.validation,
                            key
                        );
                        result.warnings.push(...validationErrors);
                    }
                }
            }
        }

        return result;
    }

    /**
     * Validate value type
     * @param {*} value - Value to check
     * @param {string} expectedType - Expected type
     * @returns {boolean} - Whether type is valid
     */
    validateType(value, expectedType) {
        switch (expectedType) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number';
            case 'boolean':
                return typeof value === 'boolean';
            case 'array':
                return Array.isArray(value);
            case 'object':
                return typeof value === 'object' && !Array.isArray(value);
            default:
                return true;
        }
    }

    /**
     * Run custom validation rules
     * @param {*} value - Value to validate
     * @param {Object} rules - Validation rules
     * @param {string} fieldName - Field name for error messages
     * @returns {Array} - Validation error messages
     */
    runValidationRules(value, rules, fieldName) {
        const errors = [];

        if (rules.min !== undefined && value < rules.min) {
            errors.push(`${fieldName} is below minimum (${rules.min})`);
        }

        if (rules.max !== undefined && value > rules.max) {
            errors.push(`${fieldName} is above maximum (${rules.max})`);
        }

        if (rules.minLength !== undefined && value.length < rules.minLength) {
            errors.push(`${fieldName} is too short (min ${rules.minLength})`);
        }

        if (rules.maxLength !== undefined && value.length > rules.maxLength) {
            errors.push(`${fieldName} is too long (max ${rules.maxLength})`);
        }

        if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
            errors.push(`${fieldName} does not match expected pattern`);
        }

        if (rules.enum && !rules.enum.includes(value)) {
            errors.push(`${fieldName} must be one of: ${rules.enum.join(', ')}`);
        }

        return errors;
    }

    /**
     * Format object for display in message
     * @param {Object} obj - Object to format
     * @returns {string} - Formatted string
     */
    formatObject(obj) {
        return Object.entries(obj)
            .filter(([_, v]) => v !== null && v !== undefined)
            .map(([k, v]) => `- **${this.toTitleCase(k)}:** ${v}`)
            .join('\n');
    }

    /**
     * Convert snake_case or camelCase to Title Case
     * @param {string} str - String to convert
     * @returns {string} - Title case string
     */
    toTitleCase(str) {
        return str
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, s => s.toUpperCase())
            .trim();
    }

    /**
     * Store module result to database
     * @param {string} tableName - Target table name
     * @param {Object} data - Data to store
     * @param {string} userId - User UUID
     * @param {string} sessionId - Session UUID
     * @returns {Promise<Object>} - Stored record
     */
    async storeModuleResult(tableName, data, userId, sessionId) {
        const record = {
            id: uuidv4(),
            user_id: userId,
            session_id: sessionId,
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: stored, error } = await supabase
            .from(tableName)
            .upsert(record, { onConflict: 'session_id' })
            .select()
            .single();

        if (error) {
            console.error(`Failed to store result to ${tableName}:`, error);
            throw error;
        }

        return stored;
    }

    /**
     * Get session context for a given session
     * @param {string} sessionId - Session UUID
     * @returns {Promise<Object>} - Session context
     */
    async getSessionContext(sessionId) {
        // Get session
        const { data: session, error: sessionError } = await supabase
            .from('align120_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (sessionError) throw sessionError;

        // Get company profile
        const { data: companyProfile } = await supabase
            .from('company_profiles')
            .select('*')
            .eq('session_id', sessionId)
            .single();

        // Get all module outputs
        const moduleOutputs = {};

        // Module 1: AI Maturity
        const { data: aiMaturity } = await supabase
            .from('ai_maturity_assessments')
            .select('*')
            .eq('session_id', sessionId)
            .single();
        if (aiMaturity) moduleOutputs.aiMaturity = aiMaturity;

        // Module 2: Business Fundamentals
        const { data: fundamentals } = await supabase
            .from('business_fundamentals')
            .select('*')
            .eq('session_id', sessionId)
            .single();
        if (fundamentals) moduleOutputs.businessFundamentals = fundamentals;

        // Module 3: Team Readiness
        const { data: teamReadiness } = await supabase
            .from('team_readiness_assessments')
            .select('*')
            .eq('session_id', sessionId)
            .single();
        if (teamReadiness) moduleOutputs.teamReadiness = teamReadiness;

        // Module 4: Brand Alignment
        const { data: brandAlignment } = await supabase
            .from('brand_alignment_assessments')
            .select('*')
            .eq('session_id', sessionId)
            .single();
        if (brandAlignment) moduleOutputs.brandAlignment = brandAlignment;

        // Module 5: Corporate Alignment
        const { data: corporateAlignment } = await supabase
            .from('corporate_alignments')
            .select('*')
            .eq('session_id', sessionId)
            .single();
        if (corporateAlignment) moduleOutputs.corporateAlignment = corporateAlignment;

        return {
            session,
            companyProfile,
            previousOutputs: moduleOutputs
        };
    }
}

// Export singleton instance
module.exports = new AgentExecutionService();
