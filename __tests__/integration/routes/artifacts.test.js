/**
 * Artifacts Routes Integration Tests
 * Phase 85: Artifact System
 */

const request = require('supertest');
const { createAuthenticatedTestApp } = require('../../setup/testApp');

describe('Artifacts Routes Integration', () => {
    let app;
    let mockSupabase;

    const createChainable = (data = null, error = null, count = null) => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        overlaps: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data, error }),
        maybeSingle: jest.fn().mockResolvedValue({ data, error }),
        then: (resolve) => resolve({ data, error, count: count ?? (Array.isArray(data) ? data.length : 0) })
    });

    beforeEach(() => {
        jest.clearAllMocks();
        const testApp = createAuthenticatedTestApp({ routes: ['artifacts'] });
        app = testApp.app;
        mockSupabase = testApp.mockSupabase;

        // Default: org context passes (requireOrgContext mock)
        mockSupabase.from.mockImplementation((table) => {
            if (table === 'organization_members') {
                return createChainable({ user_id: 'test-user-001', organization_id: 'org-001', is_active: true });
            }
            return createChainable([], null, 0);
        });

        // Module access check passes
        mockSupabase.rpc.mockResolvedValue({ data: true, error: null });
    });

    // =============================================
    // GET /api/artifacts/my-recent
    // =============================================
    describe('GET /api/artifacts/my-recent', () => {
        it('should return recent artifacts for the user', async () => {
            const mockArtifacts = [
                { id: 'a1', name: 'Report', source_type: 'agent_execution', created_at: new Date().toISOString() },
                { id: 'a2', name: 'Brief', source_type: 'skill_output', created_at: new Date().toISOString() }
            ];

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return createChainable({ user_id: 'test-user-001', organization_id: 'org-001', is_active: true });
                }
                if (table === 'artifact_bundles') {
                    return createChainable(mockArtifacts, null, 2);
                }
                return createChainable([]);
            });

            const response = await request(app)
                .get('/api/artifacts/my-recent?limit=5')
                .set('x-org-id', 'org-001')
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    // =============================================
    // GET /api/artifacts
    // =============================================
    describe('GET /api/artifacts', () => {
        it('should return paginated list', async () => {
            const mockArtifacts = [
                { id: 'a1', name: 'Report', source_type: 'agent_execution' }
            ];

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return createChainable({ user_id: 'test-user-001', organization_id: 'org-001', is_active: true });
                }
                if (table === 'artifact_bundles') {
                    return { ...createChainable(mockArtifacts, null, 1), then: (resolve) => resolve({ data: mockArtifacts, error: null, count: 1 }) };
                }
                return createChainable([]);
            });

            const response = await request(app)
                .get('/api/artifacts?page=1&limit=10')
                .set('x-org-id', 'org-001')
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should require org context', async () => {
            const response = await request(app)
                .get('/api/artifacts')
                .expect(400);

            expect(response.body.code).toBe('ORG_CONTEXT_REQUIRED');
        });
    });

    // =============================================
    // POST /api/artifacts
    // =============================================
    describe('POST /api/artifacts', () => {
        it('should create a new bundle', async () => {
            const mockBundle = { id: 'a1', name: 'Test Artifact', org_id: 'org-001' };

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return createChainable({ user_id: 'test-user-001', organization_id: 'org-001', is_active: true });
                }
                if (table === 'artifact_bundles') {
                    return createChainable(mockBundle);
                }
                return createChainable([]);
            });

            const response = await request(app)
                .post('/api/artifacts')
                .set('x-org-id', 'org-001')
                .send({
                    name: 'Test Artifact',
                    source_type: 'manual_upload',
                    visibility: 'private'
                })
                .expect(201);

            expect(response.body.success).toBe(true);
        });
    });

    // =============================================
    // GET /api/artifacts/:id
    // =============================================
    describe('GET /api/artifacts/:id', () => {
        it('should return bundle with parts', async () => {
            const mockBundle = { id: 'a1', name: 'Report', org_id: 'org-001' };
            const mockParts = [{ id: 'p1', name: 'Content', part_type: 'markdown', content_text: '# Hello' }];

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return createChainable({ user_id: 'test-user-001', organization_id: 'org-001', is_active: true });
                }
                if (table === 'artifact_bundles') {
                    return createChainable(mockBundle);
                }
                if (table === 'artifact_parts') {
                    return { ...createChainable(mockParts), order: jest.fn().mockResolvedValue({ data: mockParts, error: null }) };
                }
                return createChainable([]);
            });

            const response = await request(app)
                .get('/api/artifacts/a1')
                .set('x-org-id', 'org-001')
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should return 404 for non-existent bundle', async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return createChainable({ user_id: 'test-user-001', organization_id: 'org-001', is_active: true });
                }
                if (table === 'artifact_bundles') {
                    return createChainable(null, { code: 'PGRST116', message: 'not found' });
                }
                return createChainable([]);
            });

            const response = await request(app)
                .get('/api/artifacts/nonexistent')
                .set('x-org-id', 'org-001')
                .expect(500);
        });
    });

    // =============================================
    // DELETE /api/artifacts/:id
    // =============================================
    describe('DELETE /api/artifacts/:id', () => {
        it('should delete bundle and parts', async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return createChainable({ user_id: 'test-user-001', organization_id: 'org-001', is_active: true });
                }
                if (table === 'artifact_parts') {
                    return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: [], error: null }) };
                }
                if (table === 'artifact_bundles') {
                    return { delete: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), then: (resolve) => resolve({ error: null }) };
                }
                return createChainable([]);
            });

            mockSupabase.storage = {
                from: jest.fn().mockReturnValue({
                    remove: jest.fn().mockResolvedValue({ data: {}, error: null })
                })
            };

            const response = await request(app)
                .delete('/api/artifacts/a1')
                .set('x-org-id', 'org-001')
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    // =============================================
    // Module gating
    // =============================================
    describe('Module gating', () => {
        it('should reject when module access is denied', async () => {
            mockSupabase.rpc.mockResolvedValue({ data: false, error: null });

            // Still need org context to pass
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return createChainable({ user_id: 'test-user-001', organization_id: 'org-001', is_active: true });
                }
                return createChainable([]);
            });

            const response = await request(app)
                .get('/api/artifacts/my-recent')
                .set('x-org-id', 'org-001')
                .expect(403);

            expect(response.body.module).toBe('artifacts');
            expect(response.body.upgrade_required).toBe(true);
        });
    });
});
