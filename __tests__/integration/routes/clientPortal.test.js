/**
 * Integration Tests - Client Portal Routes
 * Phase 42: Client Self-Service Portal
 */

const request = require('supertest');
const { createTestApp } = require('../../setup/testApp');
const { createMockSupabase, createQueryBuilder } = require('../../setup/mockSupabase');

// Helper to create a chainable mock builder with explicit object reference
function createMockBuilder(overrides = {}) {
    const builder = {};
    builder.select = jest.fn(() => builder);
    builder.insert = jest.fn(() => builder);
    builder.update = jest.fn(() => builder);
    builder.upsert = jest.fn(() => builder);
    builder.delete = jest.fn(() => builder);
    builder.eq = jest.fn(() => builder);
    builder.neq = jest.fn(() => builder);
    builder.gte = jest.fn(() => builder);
    builder.gt = jest.fn(() => builder);
    builder.is = jest.fn(() => builder);
    builder.in = jest.fn(() => builder);
    builder.or = jest.fn(() => builder);
    builder.order = jest.fn(() => builder);
    builder.limit = jest.fn(() => builder);
    builder.range = jest.fn(() => builder);
    builder.single = jest.fn().mockResolvedValue({ data: null, error: null });
    builder.then = (resolve) => resolve({ data: null, error: null });

    // Apply overrides
    Object.assign(builder, overrides);
    return builder;
}

describe('Client Portal Routes Integration Tests', () => {
    let app;
    let mockSupabase;
    const testClientId = 'test-client-uuid';
    const testClientUserId = 'test-client-user-uuid';
    const testEmail = 'client@test.com';

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase = createMockSupabase();
        const testApp = createTestApp({ routes: ['client-portal'], mockSupabase, anonymous: true });
        app = testApp.app;
    });

    // ============================================================================
    // Authentication Endpoints
    // ============================================================================
    describe('Authentication Endpoints', () => {
        describe('POST /api/client-portal/auth/request-access', () => {
            it('should require email', async () => {
                const response = await request(app)
                    .post('/api/client-portal/auth/request-access')
                    .send({});

                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
            });

            it('should accept any email string (validation at DB level)', async () => {
                // Route doesn't validate email format - validation happens at DB level
                // Returns success even for invalid emails to avoid leaking info
                mockSupabase.from.mockImplementation((table) => {
                    if (table === 'client_users') {
                        return createMockBuilder({
                            single: jest.fn().mockResolvedValue({
                                data: null,
                                error: { code: 'PGRST116' }
                            })
                        });
                    }
                    return createQueryBuilder();
                });

                const response = await request(app)
                    .post('/api/client-portal/auth/request-access')
                    .send({ email: 'not-an-email' });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });

            it('should return success even for non-existent client user (security)', async () => {
                // Route returns generic success to avoid revealing whether user exists
                mockSupabase.from.mockImplementation((table) => {
                    if (table === 'client_users') {
                        return createMockBuilder({
                            single: jest.fn().mockResolvedValue({
                                data: null,
                                error: { code: 'PGRST116' }
                            })
                        });
                    }
                    return createQueryBuilder();
                });

                const response = await request(app)
                    .post('/api/client-portal/auth/request-access')
                    .send({ email: testEmail });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });

            it('should send magic link for valid client user', async () => {
                const mockUser = {
                    id: testClientUserId,
                    email: testEmail,
                    client_id: testClientId,
                    status: 'active'
                };

                mockSupabase.from.mockImplementation((table) => {
                    if (table === 'client_users') {
                        return createMockBuilder({
                            single: jest.fn().mockResolvedValue({
                                data: mockUser,
                                error: null
                            })
                        });
                    }
                    if (table === 'client_access_tokens') {
                        const builder = createMockBuilder();
                        builder.insert = jest.fn(() => ({
                            select: jest.fn(() => ({
                                single: jest.fn().mockResolvedValue({
                                    data: { token: 'magic-token-123' },
                                    error: null
                                })
                            }))
                        }));
                        return builder;
                    }
                    return createQueryBuilder();
                });

                const response = await request(app)
                    .post('/api/client-portal/auth/request-access')
                    .send({ email: testEmail });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
        });

        describe('POST /api/client-portal/auth/verify', () => {
            it('should require token', async () => {
                const response = await request(app)
                    .post('/api/client-portal/auth/verify')
                    .send({});

                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
            });

            it('should reject invalid token', async () => {
                // Route uses rpc('validate_client_magic_link') which returns array with validation result
                mockSupabase.rpc = jest.fn().mockResolvedValue({
                    data: [{ valid: false, error_message: 'Invalid or expired token' }],
                    error: null
                });

                const response = await request(app)
                    .post('/api/client-portal/auth/verify')
                    .send({ token: 'invalid-token' });

                expect(response.status).toBe(401);
            });
        });

        describe('POST /api/client-portal/auth/logout', () => {
            it('should require authentication', async () => {
                const response = await request(app)
                    .post('/api/client-portal/auth/logout');

                expect(response.status).toBe(401);
            });
        });

        describe('GET /api/client-portal/auth/me', () => {
            it('should require authentication', async () => {
                const response = await request(app)
                    .get('/api/client-portal/auth/me');

                expect(response.status).toBe(401);
            });
        });
    });

    // ============================================================================
    // Client Endpoints
    // ============================================================================
    describe('Client Endpoints', () => {
        describe('GET /api/client-portal/profile', () => {
            it('should require authentication', async () => {
                const response = await request(app)
                    .get('/api/client-portal/profile');

                expect(response.status).toBe(401);
            });
        });

        describe('GET /api/client-portal/reports', () => {
            it('should require authentication', async () => {
                const response = await request(app)
                    .get('/api/client-portal/reports');

                expect(response.status).toBe(401);
            });
        });
    });

    // ============================================================================
    // Agency Endpoints
    // ============================================================================
    describe('Agency Endpoints', () => {
        describe('POST /api/client-portal/agency/invite', () => {
            it('should require authentication', async () => {
                const response = await request(app)
                    .post('/api/client-portal/agency/invite')
                    .send({
                        client_id: testClientId,
                        email: 'newuser@client.com'
                    });

                expect(response.status).toBe(401);
            });

            it('should require client_id', async () => {
                const response = await request(app)
                    .post('/api/client-portal/agency/invite')
                    .set('Cookie', 'auth_token=valid-token')
                    .send({ email: testEmail });

                expect(response.status).toBe(400);
            });

            it('should require email', async () => {
                mockSupabase.from.mockImplementation((table) => {
                    if (table === 'clients') {
                        return createMockBuilder({
                            single: jest.fn().mockResolvedValue({
                                data: { org_id: 'test-org-uuid' },
                                error: null
                            })
                        });
                    }
                    if (table === 'organization_members') {
                        return createMockBuilder({
                            single: jest.fn().mockResolvedValue({
                                data: { role: 'admin', status: 'active' },
                                error: null
                            })
                        });
                    }
                    return createQueryBuilder();
                });

                const response = await request(app)
                    .post('/api/client-portal/agency/invite')
                    .set('Cookie', 'auth_token=valid-token')
                    .send({ client_id: testClientId });

                expect(response.status).toBe(400);
            });
        });

        describe('GET /api/client-portal/agency/client/:clientId/users', () => {
            it('should require authentication', async () => {
                const response = await request(app)
                    .get(`/api/client-portal/agency/client/${testClientId}/users`);

                expect(response.status).toBe(401);
            });

            it('should return client users for org member', async () => {
                const mockUsers = [
                    { id: '1', email: 'user1@test.com', status: 'active' },
                    { id: '2', email: 'user2@test.com', status: 'invited' }
                ];

                mockSupabase.from.mockImplementation((table) => {
                    if (table === 'clients') {
                        return createMockBuilder({
                            single: jest.fn().mockResolvedValue({
                                data: { org_id: 'test-org-uuid' },
                                error: null
                            })
                        });
                    }
                    if (table === 'organization_members') {
                        return createMockBuilder({
                            single: jest.fn().mockResolvedValue({
                                data: { role: 'admin', status: 'active' },
                                error: null
                            })
                        });
                    }
                    if (table === 'client_users') {
                        return createMockBuilder({
                            then: (resolve) => resolve({
                                data: mockUsers,
                                error: null
                            })
                        });
                    }
                    return createQueryBuilder();
                });

                const response = await request(app)
                    .get(`/api/client-portal/agency/client/${testClientId}/users`)
                    .set('Cookie', 'auth_token=valid-token');

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
        });
    });
});

describe('Client Portal Security Tests', () => {
    let app;
    let mockSupabase;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase = createMockSupabase();
        const testApp = createTestApp({ routes: ['client-portal'], mockSupabase, anonymous: true });
        app = testApp.app;
    });

    describe('Token Security', () => {
        it('should reject expired tokens', async () => {
            // Route uses rpc('validate_client_magic_link') which returns validation result
            mockSupabase.rpc = jest.fn().mockResolvedValue({
                data: [{ valid: false, error_message: 'Token has expired' }],
                error: null
            });

            const response = await request(app)
                .post('/api/client-portal/auth/verify')
                .send({ token: 'expired-token' });

            expect(response.status).toBe(401);
        });
    });
});
