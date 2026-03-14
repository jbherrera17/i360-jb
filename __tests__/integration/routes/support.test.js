/**
 * Support Routes Integration Tests
 * Phase 71: Customer Support Agent System
 */

// Mock supportAgentService to avoid real LLM calls
jest.mock('../../../server/services/supportAgentService', () => ({
    processMessage: jest.fn(() => ({
        response: 'I can help you with that!',
        intent: 'general',
        sentiment: 'neutral',
        toolCalls: [],
        escalated: false,
        blocked: false
    })),
    classifyIntent: jest.fn(() => 'general'),
    extractSentiment: jest.fn(() => 'neutral'),
    enforceConversationVolumeCap: jest.fn(() => ({ within_limits: true })),
}));

const request = require('supertest');
const { createAuthenticatedTestApp, createTestApp } = require('../../setup/testApp');

describe('Support Routes', () => {
    let app;
    let mockSupabase;

    beforeEach(() => {
        const testApp = createAuthenticatedTestApp({
            userId: 'test-user-001',
            routes: ['support']
        });
        app = testApp.app;
        mockSupabase = testApp.mockSupabase;

        // Mock module access check (requireModule middleware)
        mockSupabase.rpc.mockImplementation((fnName, params) => {
            if (fnName === 'can_access_module') {
                return Promise.resolve({ data: true, error: null });
            }
            if (fnName === 'check_org_limits') {
                return Promise.resolve({
                    data: [{ current_count: 0, max_allowed: 100, within_limits: true, usage_percent: 0 }],
                    error: null
                });
            }
            if (fnName === 'next_support_message_seq') {
                return Promise.resolve({ data: 1, error: null });
            }
            return Promise.resolve({ data: null, error: null });
        });
    });

    // ── Auth/Module Gating ───────────────────────────────────
    describe('Module Access', () => {
        it('should return 401 without authentication', async () => {
            const { app: unauthApp, mockSupabase: unauthMock } = createTestApp({ routes: ['support'] });
            unauthMock.rpc.mockResolvedValue({ data: false, error: null });

            const response = await request(unauthApp)
                .get('/api/support/conversations')
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should return 403 when module not accessible', async () => {
            mockSupabase.rpc.mockImplementation((fnName) => {
                if (fnName === 'can_access_module') {
                    return Promise.resolve({ data: false, error: null });
                }
                return Promise.resolve({ data: null, error: null });
            });

            // Also mock the module details lookup
            const mockFrom = mockSupabase.from();
            mockFrom.single.mockResolvedValue({
                data: { name: 'Customer Support AI', min_tier: null, min_business_role: null },
                error: null
            });

            const response = await request(app)
                .get('/api/support/conversations')
                .set('x-org-id', 'org-123')
                .expect(403);

            expect(response.body.success).toBe(false);
        });
    });

    // ── Create Conversation ──────────────────────────────────
    describe('POST /api/support/conversations', () => {
        it('should create a conversation', async () => {
            const mockConv = {
                id: 'conv-001',
                org_id: 'org-123',
                customer_name: 'Test User',
                customer_email: 'test@example.com',
                status: 'open',
                priority: 'normal'
            };

            const mockFrom = mockSupabase.from();
            mockFrom.single.mockResolvedValue({ data: mockConv, error: null });

            const response = await request(app)
                .post('/api/support/conversations')
                .set('x-org-id', 'org-123')
                .send({
                    customer_name: 'Test User',
                    customer_email: 'test@example.com',
                    subject: 'Help needed'
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe('conv-001');
        });

        it('should require org_id', async () => {
            const response = await request(app)
                .post('/api/support/conversations')
                .send({ customer_name: 'Test' })
                .expect(400);

            expect(response.body.error).toBe('org_id is required');
        });

        it('should deduplicate with idempotency_key', async () => {
            const existingConv = {
                id: 'conv-existing',
                org_id: 'org-123',
                idempotency_key: 'idem-123'
            };

            const mockFrom = mockSupabase.from();
            mockFrom.single.mockResolvedValue({ data: existingConv, error: null });

            const response = await request(app)
                .post('/api/support/conversations')
                .set('x-org-id', 'org-123')
                .send({
                    customer_name: 'Test',
                    idempotency_key: 'idem-123'
                })
                .expect(200);

            expect(response.body.deduplicated).toBe(true);
        });
    });

    // ── List Conversations ───────────────────────────────────
    describe('GET /api/support/conversations', () => {
        it('should list conversations for an org', async () => {
            const mockConvs = [
                { id: 'conv-1', status: 'open', subject: 'Help' },
                { id: 'conv-2', status: 'resolved', subject: 'Done' }
            ];

            // Mock the thenable builder to resolve with data
            const mockFrom = mockSupabase.from();
            mockFrom.then = function(resolve) {
                return Promise.resolve({ data: mockConvs, error: null }).then(resolve);
            };

            const response = await request(app)
                .get('/api/support/conversations')
                .set('x-org-id', 'org-123')
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should require org_id', async () => {
            await request(app)
                .get('/api/support/conversations')
                .expect(400);
        });
    });

    // ── Get Conversation ─────────────────────────────────────
    describe('GET /api/support/conversations/:id', () => {
        it('should return conversation with messages', async () => {
            const mockConv = { id: 'conv-1', status: 'open' };
            const mockFrom = mockSupabase.from();
            mockFrom.single.mockResolvedValue({ data: mockConv, error: null });

            const response = await request(app)
                .get('/api/support/conversations/conv-1')
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should return 404 for missing conversation', async () => {
            const mockFrom = mockSupabase.from();
            mockFrom.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

            await request(app)
                .get('/api/support/conversations/nonexistent')
                .expect(404);
        });
    });

    // ── Send Message ─────────────────────────────────────────
    describe('POST /api/support/conversations/:id/messages', () => {
        it('should process a message and return AI response', async () => {
            const mockConv = { id: 'conv-1', org_id: 'org-123', status: 'open' };
            const mockFrom = mockSupabase.from();
            mockFrom.single.mockResolvedValue({ data: mockConv, error: null });

            const response = await request(app)
                .post('/api/support/conversations/conv-1/messages')
                .set('x-org-id', 'org-123')
                .send({ message: 'I need help with my account' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.response).toBeDefined();
            expect(response.body.data.intent).toBe('general');
        });

        it('should require message', async () => {
            await request(app)
                .post('/api/support/conversations/conv-1/messages')
                .send({})
                .expect(400);
        });

        it('should reject empty message', async () => {
            await request(app)
                .post('/api/support/conversations/conv-1/messages')
                .send({ message: '   ' })
                .expect(400);
        });

        it('should reject messages on closed conversations', async () => {
            const mockFrom = mockSupabase.from();
            mockFrom.single.mockResolvedValue({
                data: { id: 'conv-1', org_id: 'org-123', status: 'closed' },
                error: null
            });

            await request(app)
                .post('/api/support/conversations/conv-1/messages')
                .set('x-org-id', 'org-123')
                .send({ message: 'Hello' })
                .expect(400);
        });
    });

    // ── CSAT ─────────────────────────────────────────────────
    describe('POST /api/support/conversations/:id/csat', () => {
        it('should accept valid CSAT score', async () => {
            const mockFrom = mockSupabase.from();
            mockFrom.single.mockResolvedValue({
                data: { id: 'conv-1', csat_score: 5 },
                error: null
            });

            const response = await request(app)
                .post('/api/support/conversations/conv-1/csat')
                .send({ score: 5, comment: 'Great support!' })
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should reject invalid CSAT score', async () => {
            await request(app)
                .post('/api/support/conversations/conv-1/csat')
                .send({ score: 6 })
                .expect(400);
        });

        it('should reject missing CSAT score', async () => {
            await request(app)
                .post('/api/support/conversations/conv-1/csat')
                .send({})
                .expect(400);
        });
    });

    // ── Actions ──────────────────────────────────────────────
    describe('Support Actions', () => {
        it('should list actions for org', async () => {
            const mockFrom = mockSupabase.from();
            mockFrom.then = function(resolve) {
                return Promise.resolve({
                    data: [{ id: 'action-1', action_type: 'refund', status: 'pending' }],
                    error: null
                }).then(resolve);
            };

            const response = await request(app)
                .get('/api/support/actions')
                .set('x-org-id', 'org-123')
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should approve a pending action', async () => {
            const mockFrom = mockSupabase.from();
            mockFrom.single.mockResolvedValue({
                data: { id: 'action-1', status: 'pending' },
                error: null
            });

            const response = await request(app)
                .post('/api/support/actions/action-1/approve')
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should deny a pending action', async () => {
            const mockFrom = mockSupabase.from();
            mockFrom.single.mockResolvedValue({
                data: { id: 'action-1', status: 'pending' },
                error: null
            });

            const response = await request(app)
                .post('/api/support/actions/action-1/deny')
                .send({ reason: 'Not eligible' })
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should not approve non-pending actions', async () => {
            const mockFrom = mockSupabase.from();
            mockFrom.single.mockResolvedValue({
                data: { id: 'action-1', status: 'denied' },
                error: null
            });

            await request(app)
                .post('/api/support/actions/action-1/approve')
                .expect(400);
        });
    });
});
