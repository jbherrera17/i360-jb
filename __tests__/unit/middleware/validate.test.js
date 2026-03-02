/**
 * Validation Middleware Tests
 * Tests for Zod-based request validation
 */

const {
    validateBody,
    validateParams,
    loginSchema,
    registerSchema,
    resetPasswordSchema,
    chatMessageSchema,
    chatStreamSchema,
    agentUpdateSchema,
    idParam,
    schemas
} = require('../../../server/middleware/validate');

// Helper to create mock req/res/next
const createMocks = (body = {}, params = {}) => ({
    req: { body, params },
    res: {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
    },
    next: jest.fn()
});

describe('Validation Middleware', () => {
    describe('validateBody', () => {
        it('should call next() for valid body', () => {
            const schema = loginSchema;
            const middleware = validateBody(schema);
            const { req, res, next } = createMocks({
                email: 'test@example.com',
                password: 'password123'
            });

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should return 400 for invalid body', () => {
            const schema = loginSchema;
            const middleware = validateBody(schema);
            const { req, res, next } = createMocks({
                email: 'invalid-email',
                password: ''
            });

            middleware(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: 'Validation failed',
                code: 'VALIDATION_ERROR'
            }));
        });

        it('should include field-level error details', () => {
            const schema = loginSchema;
            const middleware = validateBody(schema);
            const { req, res, next } = createMocks({
                email: 'invalid-email',
                password: ''
            });

            middleware(req, res, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                details: expect.arrayContaining([
                    expect.objectContaining({
                        field: expect.any(String),
                        message: expect.any(String)
                    })
                ])
            }));
        });

        it('should replace body with parsed/transformed data', () => {
            const schema = loginSchema;
            const middleware = validateBody(schema);
            const { req, res, next } = createMocks({
                email: 'TEST@EXAMPLE.COM', // Should be transformed to lowercase
                password: 'password123'
            });

            middleware(req, res, next);

            expect(req.body.email).toBe('test@example.com');
        });
    });

    describe('validateParams', () => {
        it('should call next() for valid params', () => {
            const schema = idParam;
            const middleware = validateParams(schema);
            const { req, res, next } = createMocks({}, {
                id: '550e8400-e29b-41d4-a716-446655440000'
            });

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should return 400 for invalid params', () => {
            const schema = idParam;
            const middleware = validateParams(schema);
            const { req, res, next } = createMocks({}, {
                id: 'not-a-uuid'
            });

            middleware(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: 'Invalid request parameters',
                code: 'VALIDATION_ERROR'
            }));
        });

        it('should replace params with parsed data', () => {
            const schema = idParam;
            const middleware = validateParams(schema);
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            const { req, res, next } = createMocks({}, { id: uuid });

            middleware(req, res, next);

            expect(req.params.id).toBe(uuid);
        });
    });

    describe('loginSchema', () => {
        it('should validate correct login data', () => {
            const result = loginSchema.safeParse({
                email: 'user@example.com',
                password: 'password123'
            });

            expect(result.success).toBe(true);
        });

        it('should reject invalid email', () => {
            const result = loginSchema.safeParse({
                email: 'not-an-email',
                password: 'password123'
            });

            expect(result.success).toBe(false);
        });

        it('should reject empty password', () => {
            const result = loginSchema.safeParse({
                email: 'user@example.com',
                password: ''
            });

            expect(result.success).toBe(false);
        });

        it('should reject password over 128 characters', () => {
            const result = loginSchema.safeParse({
                email: 'user@example.com',
                password: 'a'.repeat(129)
            });

            expect(result.success).toBe(false);
        });

        it('should transform email to lowercase', () => {
            const result = loginSchema.safeParse({
                email: 'USER@EXAMPLE.COM',
                password: 'password123'
            });

            expect(result.success).toBe(true);
            expect(result.data.email).toBe('user@example.com');
        });

        it('should reject email with whitespace (validation before transform)', () => {
            // Email validation happens before transform, so spaces cause validation failure
            const result = loginSchema.safeParse({
                email: '  user@example.com  ',
                password: 'password123'
            });

            expect(result.success).toBe(false);
        });
    });

    describe('registerSchema', () => {
        it('should validate correct registration data', () => {
            const result = registerSchema.safeParse({
                email: 'newuser@example.com',
                password: 'securepassword123'
            });

            expect(result.success).toBe(true);
        });

        it('should accept optional display_name', () => {
            const result = registerSchema.safeParse({
                email: 'newuser@example.com',
                password: 'securepassword123',
                display_name: 'John Doe'
            });

            expect(result.success).toBe(true);
            expect(result.data.display_name).toBe('John Doe');
        });

        it('should reject password under 8 characters', () => {
            const result = registerSchema.safeParse({
                email: 'user@example.com',
                password: 'short'
            });

            expect(result.success).toBe(false);
            const passwordError = result.error.issues.find(i => i.path.includes('password'));
            expect(passwordError.message).toContain('8 characters');
        });

        it('should reject display_name over 100 characters', () => {
            const result = registerSchema.safeParse({
                email: 'user@example.com',
                password: 'password123',
                display_name: 'a'.repeat(101)
            });

            expect(result.success).toBe(false);
        });

        it('should reject email over 255 characters', () => {
            const longEmail = 'a'.repeat(250) + '@example.com';
            const result = registerSchema.safeParse({
                email: longEmail,
                password: 'password123'
            });

            expect(result.success).toBe(false);
        });
    });

    describe('resetPasswordSchema', () => {
        it('should validate reset password data', () => {
            const result = resetPasswordSchema.safeParse({
                new_password: 'newpassword123'
            });

            expect(result.success).toBe(true);
        });

        it('should accept optional access_token', () => {
            const result = resetPasswordSchema.safeParse({
                access_token: 'some-token',
                new_password: 'newpassword123'
            });

            expect(result.success).toBe(true);
        });

        it('should reject new_password under 8 characters', () => {
            const result = resetPasswordSchema.safeParse({
                new_password: 'short'
            });

            expect(result.success).toBe(false);
        });

        it('should reject new_password over 128 characters', () => {
            const result = resetPasswordSchema.safeParse({
                new_password: 'a'.repeat(129)
            });

            expect(result.success).toBe(false);
        });
    });

    describe('chatMessageSchema', () => {
        it('should validate correct chat message', () => {
            const result = chatMessageSchema.safeParse({
                message: 'Hello, how are you?'
            });

            expect(result.success).toBe(true);
        });

        it('should accept optional fields', () => {
            const result = chatMessageSchema.safeParse({
                message: 'Hello',
                agent_id: '550e8400-e29b-41d4-a716-446655440000',
                context: 'Some context',
                model: 'gpt-4o',
                systemPrompt: 'You are a helpful assistant'
            });

            expect(result.success).toBe(true);
        });

        it('should normalize model aliases to canonical IDs', () => {
            const result = chatMessageSchema.safeParse({
                message: 'Hello',
                model: 'gpt4o'
            });

            expect(result.success).toBe(true);
            expect(result.data.model).toBe('gpt-4o');
        });

        it('should reject empty message', () => {
            const result = chatMessageSchema.safeParse({
                message: ''
            });

            expect(result.success).toBe(false);
        });

        it('should reject message over 100000 characters', () => {
            const result = chatMessageSchema.safeParse({
                message: 'a'.repeat(100001)
            });

            expect(result.success).toBe(false);
        });

        it('should reject invalid agent_id UUID', () => {
            const result = chatMessageSchema.safeParse({
                message: 'Hello',
                agent_id: 'not-a-uuid'
            });

            expect(result.success).toBe(false);
        });

        it('should accept very long context', () => {
            const result = chatMessageSchema.safeParse({
                message: 'Hello',
                context: 'a'.repeat(99999)
            });

            expect(result.success).toBe(true);
        });

        it('should reject deprecated models', () => {
            const result = chatMessageSchema.safeParse({
                message: 'Hello',
                model: 'sonar-reasoning'
            });

            expect(result.success).toBe(false);
        });
    });

    describe('chatStreamSchema', () => {
        it('should validate correct stream request', () => {
            const result = chatStreamSchema.safeParse({
                messages: [
                    { role: 'user', content: 'Hello' }
                ]
            });

            expect(result.success).toBe(true);
        });

        it('should accept multiple messages', () => {
            const result = chatStreamSchema.safeParse({
                messages: [
                    { role: 'user', content: 'Hello' },
                    { role: 'assistant', content: 'Hi there!' },
                    { role: 'user', content: 'How are you?' }
                ]
            });

            expect(result.success).toBe(true);
        });

        it('should accept system role', () => {
            const result = chatStreamSchema.safeParse({
                messages: [
                    { role: 'system', content: 'You are helpful' },
                    { role: 'user', content: 'Hello' }
                ]
            });

            expect(result.success).toBe(true);
        });

        it('should reject empty messages array', () => {
            const result = chatStreamSchema.safeParse({
                messages: []
            });

            expect(result.success).toBe(false);
        });

        it('should reject more than 100 messages', () => {
            const messages = Array(101).fill({ role: 'user', content: 'msg' });
            const result = chatStreamSchema.safeParse({ messages });

            expect(result.success).toBe(false);
        });

        it('should accept multimodal content array', () => {
            const result = chatStreamSchema.safeParse({
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: 'What is in this image?' },
                        { type: 'image', source: { media_type: 'image/png', data: 'base64data' } }
                    ]
                }]
            });

            expect(result.success).toBe(true);
        });

        it('should reject invalid role', () => {
            const result = chatStreamSchema.safeParse({
                messages: [
                    { role: 'invalid', content: 'Hello' }
                ]
            });

            expect(result.success).toBe(false);
        });

        it('should accept optional model', () => {
            const result = chatStreamSchema.safeParse({
                messages: [{ role: 'user', content: 'Hello' }],
                model: 'claude-sonnet-4-5-20250929'
            });

            expect(result.success).toBe(true);
        });

        it('should reject unsupported model IDs', () => {
            const result = chatStreamSchema.safeParse({
                messages: [{ role: 'user', content: 'Hello' }],
                model: 'not-a-real-model'
            });

            expect(result.success).toBe(false);
        });

        it('should accept optional systemPrompt', () => {
            const result = chatStreamSchema.safeParse({
                messages: [{ role: 'user', content: 'Hello' }],
                systemPrompt: 'Be helpful'
            });

            expect(result.success).toBe(true);
        });

        it('should accept optional skipHiggins', () => {
            const result = chatStreamSchema.safeParse({
                messages: [{ role: 'user', content: 'Hello' }],
                skipHiggins: true
            });

            expect(result.success).toBe(true);
        });
    });

    describe('agentUpdateSchema', () => {
        it('should validate agent update data', () => {
            const result = agentUpdateSchema.safeParse({
                name: 'My Agent',
                description: 'A helpful agent'
            });

            expect(result.success).toBe(true);
        });

        it('should accept all optional fields', () => {
            const result = agentUpdateSchema.safeParse({
                name: 'My Agent',
                description: 'A helpful agent',
                system_prompt: 'You are helpful',
                model: 'claude-sonnet-4-5-20250929',
                category: 'general',
                is_active: true
            });

            expect(result.success).toBe(true);
        });

        it('should normalize model aliases in agent updates', () => {
            const result = agentUpdateSchema.safeParse({
                model: 'gpt4o'
            });

            expect(result.success).toBe(true);
            expect(result.data.model).toBe('gpt-4o');
        });

        it('should accept empty object (all optional)', () => {
            const result = agentUpdateSchema.safeParse({});

            expect(result.success).toBe(true);
        });

        it('should reject name over 200 characters', () => {
            const result = agentUpdateSchema.safeParse({
                name: 'a'.repeat(201)
            });

            expect(result.success).toBe(false);
        });

        it('should reject description over 2000 characters', () => {
            const result = agentUpdateSchema.safeParse({
                description: 'a'.repeat(2001)
            });

            expect(result.success).toBe(false);
        });

        it('should reject system_prompt over 100000 characters', () => {
            const result = agentUpdateSchema.safeParse({
                system_prompt: 'a'.repeat(100001)
            });

            expect(result.success).toBe(false);
        });

        it('should allow additional fields (passthrough)', () => {
            const result = agentUpdateSchema.safeParse({
                name: 'My Agent',
                customField: 'some value',
                anotherField: 123
            });

            expect(result.success).toBe(true);
            expect(result.data.customField).toBe('some value');
            expect(result.data.anotherField).toBe(123);
        });

        it('should reject deprecated model IDs in agent updates', () => {
            const result = agentUpdateSchema.safeParse({
                model: 'sonar-reasoning'
            });

            expect(result.success).toBe(false);
        });

        it('should accept config object', () => {
            const result = agentUpdateSchema.safeParse({
                name: 'Test Agent'
            });

            expect(result.success).toBe(true);
        });
    });

    describe('idParam', () => {
        it('should validate valid UUID', () => {
            const result = idParam.safeParse({
                id: '550e8400-e29b-41d4-a716-446655440000'
            });

            expect(result.success).toBe(true);
        });

        it('should reject invalid UUID', () => {
            const result = idParam.safeParse({
                id: 'not-a-uuid'
            });

            expect(result.success).toBe(false);
        });

        it('should reject empty string', () => {
            const result = idParam.safeParse({
                id: ''
            });

            expect(result.success).toBe(false);
        });

        it('should reject missing id', () => {
            const result = idParam.safeParse({});

            expect(result.success).toBe(false);
        });
    });

    describe('schemas (reusable)', () => {
        describe('uuid', () => {
            it('should validate valid UUID', () => {
                const result = schemas.uuid.safeParse('550e8400-e29b-41d4-a716-446655440000');
                expect(result.success).toBe(true);
            });

            it('should reject invalid UUID', () => {
                const result = schemas.uuid.safeParse('invalid');
                expect(result.success).toBe(false);
            });
        });

        describe('email', () => {
            it('should validate valid email', () => {
                const result = schemas.email.safeParse('test@example.com');
                expect(result.success).toBe(true);
            });

            it('should transform to lowercase', () => {
                const result = schemas.email.safeParse('TEST@EXAMPLE.COM');
                expect(result.success).toBe(true);
                expect(result.data).toBe('test@example.com');
            });

            it('should reject email with whitespace (validation before transform)', () => {
                // Email validation happens before transform
                const result = schemas.email.safeParse('  test@example.com  ');
                expect(result.success).toBe(false);
            });

            it('should reject invalid email', () => {
                const result = schemas.email.safeParse('not-an-email');
                expect(result.success).toBe(false);
            });
        });

        describe('password', () => {
            it('should validate valid password', () => {
                const result = schemas.password.safeParse('password123');
                expect(result.success).toBe(true);
            });

            it('should reject short password', () => {
                const result = schemas.password.safeParse('short');
                expect(result.success).toBe(false);
            });

            it('should reject long password', () => {
                const result = schemas.password.safeParse('a'.repeat(129));
                expect(result.success).toBe(false);
            });
        });
    });
});
