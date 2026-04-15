/**
 * Integration Tests - Agency Analytics Routes
 * Phase 43: Agency Analytics & Reporting
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
    builder.lte = jest.fn(() => builder);
    builder.gt = jest.fn(() => builder);
    builder.lt = jest.fn(() => builder);
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

describe('Agency Analytics Routes Integration Tests', () => {
    let app;
    let mockSupabase;
    const testOrgId = 'test-org-uuid';

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase = createMockSupabase();
        const testApp = createTestApp({ routes: ['analytics'], mockSupabase, anonymous: true });
        app = testApp.app;
    });

    // ============================================================================
    // GET /api/analytics/:orgId/overview
    // ============================================================================
    describe('GET /api/analytics/:orgId/overview', () => {
        it('should return 401 without auth', async () => {
            const response = await request(app)
                .get(`/api/analytics/${testOrgId}/overview`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should return 403 for non-members', async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
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
                .get(`/api/analytics/${testOrgId}/overview`)
                .set('Cookie', 'auth_token=valid-token')
                .expect(403);

            expect(response.body.success).toBe(false);
        });

        it('should return overview metrics for org member', async () => {
            const mockOverview = {
                total_clients: 25,
                active_clients: 18,
                total_sessions: 156,
                avg_maturity_score: 3.2,
                avg_readiness_score: 2.8
            };

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return createMockBuilder({
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'admin', status: 'active' },
                            error: null
                        })
                    });
                }
                if (table === 'agency_client_metrics') {
                    return createMockBuilder({
                        then: (resolve) => resolve({
                            data: [mockOverview],
                            error: null
                        })
                    });
                }
                return createQueryBuilder();
            });

            const response = await request(app)
                .get(`/api/analytics/${testOrgId}/overview`)
                .set('Cookie', 'auth_token=valid-token')
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    // ============================================================================
    // GET /api/analytics/:orgId/clients
    // ============================================================================
    describe('GET /api/analytics/:orgId/clients', () => {
        it('should return 401 without auth', async () => {
            const response = await request(app)
                .get(`/api/analytics/${testOrgId}/clients`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should return client metrics for org member', async () => {
            const mockClients = [
                { client_id: 'c1', company_name: 'Acme Corp', maturity_score: 3.5 },
                { client_id: 'c2', company_name: 'Beta Inc', maturity_score: 2.8 }
            ];

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return createMockBuilder({
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'member', status: 'active' },
                            error: null
                        })
                    });
                }
                if (table === 'agency_client_metrics') {
                    return createMockBuilder({
                        then: (resolve) => resolve({
                            data: mockClients,
                            error: null
                        })
                    });
                }
                return createQueryBuilder();
            });

            const response = await request(app)
                .get(`/api/analytics/${testOrgId}/clients`)
                .set('Cookie', 'auth_token=valid-token')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    // ============================================================================
    // GET /api/analytics/:orgId/distribution/maturity
    // ============================================================================
    describe('GET /api/analytics/:orgId/distribution/maturity', () => {
        it('should return 401 without auth', async () => {
            const response = await request(app)
                .get(`/api/analytics/${testOrgId}/distribution/maturity`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should return maturity distribution', async () => {
            const mockDistribution = [
                { maturity_level: 'Nascent', client_count: 5, percentage: 25 },
                { maturity_level: 'Emerging', client_count: 8, percentage: 40 },
                { maturity_level: 'Developing', client_count: 7, percentage: 35 }
            ];

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return createMockBuilder({
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'member', status: 'active' },
                            error: null
                        })
                    });
                }
                if (table === 'agency_maturity_distribution') {
                    return createMockBuilder({
                        then: (resolve) => resolve({
                            data: mockDistribution,
                            error: null
                        })
                    });
                }
                return createQueryBuilder();
            });

            const response = await request(app)
                .get(`/api/analytics/${testOrgId}/distribution/maturity`)
                .set('Cookie', 'auth_token=valid-token')
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    // ============================================================================
    // GET /api/analytics/:orgId/trends
    // ============================================================================
    describe('GET /api/analytics/:orgId/trends', () => {
        it('should return 401 without auth', async () => {
            const response = await request(app)
                .get(`/api/analytics/${testOrgId}/trends`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should return trend data', async () => {
            const mockTrends = [
                { snapshot_date: '2026-01-15', total_clients: 20, avg_maturity: 3.0 },
                { snapshot_date: '2026-01-22', total_clients: 22, avg_maturity: 3.1 }
            ];

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return createMockBuilder({
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'member', status: 'active' },
                            error: null
                        })
                    });
                }
                if (table === 'agency_metrics_snapshots') {
                    return createMockBuilder({
                        then: (resolve) => resolve({
                            data: mockTrends,
                            error: null
                        })
                    });
                }
                return createQueryBuilder();
            });

            const response = await request(app)
                .get(`/api/analytics/${testOrgId}/trends`)
                .set('Cookie', 'auth_token=valid-token')
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    // ============================================================================
    // GET /api/analytics/:orgId/top-performers
    // ============================================================================
    describe('GET /api/analytics/:orgId/top-performers', () => {
        it('should return 401 without auth', async () => {
            const response = await request(app)
                .get(`/api/analytics/${testOrgId}/top-performers`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should return top performing clients', async () => {
            const mockTopPerformers = [
                { client_id: 'c1', company_name: 'Top Corp', maturity_score: 4.8 },
                { client_id: 'c2', company_name: 'Star Inc', maturity_score: 4.5 }
            ];

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return createMockBuilder({
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'member', status: 'active' },
                            error: null
                        })
                    });
                }
                if (table === 'agency_client_metrics') {
                    return createMockBuilder({
                        then: (resolve) => resolve({
                            data: mockTopPerformers,
                            error: null
                        })
                    });
                }
                return createQueryBuilder();
            });

            const response = await request(app)
                .get(`/api/analytics/${testOrgId}/top-performers`)
                .set('Cookie', 'auth_token=valid-token')
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    // ============================================================================
    // GET /api/analytics/:orgId/needs-attention
    // ============================================================================
    describe('GET /api/analytics/:orgId/needs-attention', () => {
        it('should return 401 without auth', async () => {
            const response = await request(app)
                .get(`/api/analytics/${testOrgId}/needs-attention`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should return clients needing attention', async () => {
            const mockNeedsAttention = [
                { client_id: 'c1', company_name: 'Dormant Ltd', reason: 'dormant' }
            ];

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return createMockBuilder({
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'member', status: 'active' },
                            error: null
                        })
                    });
                }
                if (table === 'agency_client_metrics') {
                    return createMockBuilder({
                        then: (resolve) => resolve({
                            data: mockNeedsAttention,
                            error: null
                        })
                    });
                }
                return createQueryBuilder();
            });

            const response = await request(app)
                .get(`/api/analytics/${testOrgId}/needs-attention`)
                .set('Cookie', 'auth_token=valid-token')
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    // ============================================================================
    // GET /api/analytics/:orgId/export
    // ============================================================================
    describe('GET /api/analytics/:orgId/export', () => {
        it('should return 401 without auth', async () => {
            const response = await request(app)
                .get(`/api/analytics/${testOrgId}/export`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should export as JSON by default', async () => {
            const mockData = [
                { client_id: 'c1', company_name: 'Test Corp', maturity_score: 3.5 }
            ];

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return createMockBuilder({
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'member', status: 'active' },
                            error: null
                        })
                    });
                }
                if (table === 'agency_client_metrics') {
                    return createMockBuilder({
                        then: (resolve) => resolve({
                            data: mockData,
                            error: null
                        })
                    });
                }
                return createQueryBuilder();
            });

            const response = await request(app)
                .get(`/api/analytics/${testOrgId}/export`)
                .set('Cookie', 'auth_token=valid-token')
                .expect(200);

            expect(response.headers['content-type']).toContain('application/json');
        });

        it('should export as CSV when requested', async () => {
            const mockData = [
                { client_id: 'c1', company_name: 'Test Corp', maturity_score: 3.5 }
            ];

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return createMockBuilder({
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'member', status: 'active' },
                            error: null
                        })
                    });
                }
                if (table === 'agency_client_metrics') {
                    return createMockBuilder({
                        then: (resolve) => resolve({
                            data: mockData,
                            error: null
                        })
                    });
                }
                return createQueryBuilder();
            });

            const response = await request(app)
                .get(`/api/analytics/${testOrgId}/export?format=csv`)
                .set('Cookie', 'auth_token=valid-token')
                .expect(200);

            expect(response.headers['content-type']).toContain('text/csv');
        });
    });
});

describe('Agency Analytics Security Tests', () => {
    let app;
    let mockSupabase;
    const testOrgId = 'test-org-uuid';
    const otherOrgId = 'other-org-uuid';

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase = createMockSupabase();
        const testApp = createTestApp({ routes: ['analytics'], mockSupabase, anonymous: true });
        app = testApp.app;
    });

    describe('Organization Isolation', () => {
        it('should not allow access to other org data', async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
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
                .get(`/api/analytics/${otherOrgId}/overview`)
                .set('Cookie', 'auth_token=valid-token')
                .expect(403);

            expect(response.body.success).toBe(false);
        });
    });
});
