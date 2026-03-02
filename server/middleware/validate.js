/**
 * Input Validation Middleware
 * Uses Zod for request validation on API endpoints
 *
 * Phase: Production Hardening
 */

const { z } = require('zod');
const llmRegistry = require('../services/llmRegistry');

// ============================================
// REUSABLE SCHEMAS
// ============================================

const uuid = z.string().uuid('Invalid ID format');

const email = z.string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .transform(val => val.toLowerCase().trim());

const password = z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long');

const modelId = z.string()
    .max(100, 'Model ID too long')
    .transform((value, ctx) => {
        const resolved = llmRegistry.resolveModelId(value);

        if (!resolved.valid) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: resolved.error || 'Invalid model'
            });
            return z.NEVER;
        }

        return resolved.model;
    });

// ============================================
// AUTH SCHEMAS
// ============================================

const loginSchema = z.object({
    email,
    password: z.string().min(1, 'Password is required').max(128)
});

const registerSchema = z.object({
    email,
    password,
    display_name: z.string().max(100).optional()
});

const resetPasswordSchema = z.object({
    access_token: z.string().optional(),
    new_password: password
});

// ============================================
// CHAT SCHEMAS
// ============================================

const chatMessageSchema = z.object({
    message: z.string().min(1, 'Message is required').max(100000, 'Message too long'),
    agent_id: uuid.optional(),
    context: z.string().max(100000).optional(),
    model: modelId.optional(),
    systemPrompt: z.string().max(100000).optional()
});

const chatStreamSchema = z.object({
    messages: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.union([
            z.string().max(100000),
            z.array(z.object({
                type: z.string(),
                text: z.string().optional(),
                source: z.object({
                    media_type: z.string(),
                    data: z.string()
                }).optional()
            }))
        ])
    })).min(1, 'Messages array is required').max(100),
    model: modelId.optional(),
    systemPrompt: z.string().max(100000).optional(),
    skipHiggins: z.boolean().optional()
});

// ============================================
// AGENT SCHEMAS
// ============================================

const agentUpdateSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    system_prompt: z.string().max(100000).optional(),
    model: modelId.optional(),
    category: z.string().max(100).optional(),
    is_active: z.boolean().optional(),
    config: z.record(z.unknown()).optional()
}).passthrough(); // Allow additional fields for flexibility

// ============================================
// MIDDLEWARE FACTORY
// ============================================

/**
 * Creates validation middleware for request body
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errors = result.error.issues.map(issue => ({
                field: issue.path.join('.'),
                message: issue.message
            }));
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: errors
            });
        }
        // Replace body with parsed/transformed data
        req.body = result.data;
        next();
    };
}

/**
 * Creates validation middleware for URL params
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
function validateParams(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.params);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request parameters',
                code: 'VALIDATION_ERROR'
            });
        }
        req.params = result.data;
        next();
    };
}

// Param schemas
const idParam = z.object({ id: uuid });

module.exports = {
    // Middleware factories
    validateBody,
    validateParams,
    // Auth schemas
    loginSchema,
    registerSchema,
    resetPasswordSchema,
    // Chat schemas
    chatMessageSchema,
    chatStreamSchema,
    // Agent schemas
    agentUpdateSchema,
    // Param schemas
    idParam,
    // Reusable types
    schemas: { uuid, email, password }
};
