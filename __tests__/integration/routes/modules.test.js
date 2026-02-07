/**
 * Modules Route Tests
 * Tests for module access control API endpoints
 */

const request = require('supertest');
const { createTestApp, createAuthenticatedTestApp, mockResponses } = require('../../setup/testApp');
const { createMockSupabase } = require('../../setup/mockSupabase');

describe('Modules Routes', () => {
    let app;
    let mockSupabase;

    beforeEach(() => {
        const testApp = createAuthenticatedTestApp({
            userId: 'test-user-001',
            routes: ['modules']
        });
        app = testApp.app;
        mockSupabase = testApp.mockSupabase;
    });

    describe('GET /api/modules', () => {
        it('should return 401 without authentication', async () => {
            const { app: unauthApp } = createTestApp({ routes: ['modules'] });

            const response = await request(unauthApp)
                .get('/api/modules')
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Authentication required');
        });

        it('should return user modules when authenticated', async () => {
            const mockModules = [
                { id: 'mod-1', name: 'Agents', nav_group: 'core', route: '/agents' },
                { id: 'mod-2', name: 'Chat', nav_group: 'core', route: '/chat' },
                { id: 'mod-3', name: 'Research Studio', nav_group: 'research', route: '/research' }
            ];

            mockSupabase.rpc.mockResolvedValue({
                data: mockModules,
                error: null
            });

            const response = await request(app)
                .get('/api/modules')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.modules).toEqual(mockModules);
            expect(response.body.data.grouped).toBeDefined();
            expect(response.body.data.grouped.core).toHaveLength(2);
            expect(response.body.data.grouped.research).toHaveLength(1);
        });

        it('should accept org_id from header', async () => {
            mockSupabase.rpc.mockResolvedValue({
                data: [],
                error: null
            });

            await request(app)
                .get('/api/modules')
                .set('x-org-id', 'org-123')
                .expect(200);

            expect(mockSupabase.rpc).toHaveBeenCalledWith('get_user_modules', {
                p_user_id: 'test-user-001',
                p_org_id: 'org-123'
            });
        });

        it('should accept org_id from query param', async () => {
            mockSupabase.rpc.mockResolvedValue({
                data: [],
                error: null
            });

            await request(app)
                .get('/api/modules?org_id=org-456')
                .expect(200);

            expect(mockSupabase.rpc).toHaveBeenCalledWith('get_user_modules', {
                p_user_id: 'test-user-001',
                p_org_id: 'org-456'
            });
        });

        it('should handle database errors', async () => {
            mockSupabase.rpc.mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
            });

            const response = await request(app)
                .get('/api/modules')
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Database error');
        });

        it('should group modules by nav_group', async () => {
            const mockModules = [
                { id: 'mod-1', name: 'Module 1', nav_group: 'group-a' },
                { id: 'mod-2', name: 'Module 2', nav_group: 'group-a' },
                { id: 'mod-3', name: 'Module 3', nav_group: 'group-b' },
                { id: 'mod-4', name: 'Module 4', nav_group: null } // Should go to 'other'
            ];

            mockSupabase.rpc.mockResolvedValue({
                data: mockModules,
                error: null
            });

            const response = await request(app)
                .get('/api/modules')
                .expect(200);

            expect(response.body.data.grouped['group-a']).toHaveLength(2);
            expect(response.body.data.grouped['group-b']).toHaveLength(1);
            expect(response.body.data.grouped['other']).toHaveLength(1);
        });
    });

    describe('GET /api/modules/all', () => {
        it('should return 401 without authentication', async () => {
            const { app: unauthApp } = createTestApp({ routes: ['modules'] });

            const response = await request(unauthApp)
                .get('/api/modules/all')
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should return all platform modules', async () => {
            const mockModules = [
                { id: 'mod-1', name: 'Agents', min_tier: 'starter', display_order: 1 },
                { id: 'mod-2', name: 'Research', min_tier: 'business', display_order: 2 }
            ];

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'platform_modules') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        order: jest.fn().mockResolvedValue({
                            data: mockModules,
                            error: null
                        })
                    };
                }
                return createMockSupabase().from(table);
            });

            const response = await request(app)
                .get('/api/modules/all')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockModules);
        });

        it('should handle database errors', async () => {
            mockSupabase.from.mockImplementation(() => ({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Query failed' }
                })
            }));

            const response = await request(app)
                .get('/api/modules/all')
                .expect(500);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/modules/check/:moduleId', () => {
        it('should return 401 without authentication', async () => {
            const { app: unauthApp } = createTestApp({ routes: ['modules'] });

            const response = await request(unauthApp)
                .get('/api/modules/check/mod-123')
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should return access granted when user has access', async () => {
            mockSupabase.rpc.mockResolvedValue({
                data: true,
                error: null
            });

            const response = await request(app)
                .get('/api/modules/check/mod-123')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.module_id).toBe('mod-123');
            expect(response.body.data.can_access).toBe(true);
            expect(response.body.data.requirements).toBeNull();
        });

        it('should return requirements when access denied', async () => {
            mockSupabase.rpc.mockResolvedValue({
                data: false,
                error: null
            });

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'platform_modules') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: {
                                id: 'mod-123',
                                name: 'Premium Module',
                                min_tier: 'enterprise',
                                min_business_role: 'manager'
                            },
                            error: null
                        })
                    };
                }
                return createMockSupabase().from(table);
            });

            const response = await request(app)
                .get('/api/modules/check/mod-123')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.can_access).toBe(false);
            expect(response.body.data.requirements).toEqual({
                min_tier: 'enterprise',
                min_business_role: 'manager'
            });
        });

        it('should accept org_id from header', async () => {
            mockSupabase.rpc.mockResolvedValue({
                data: true,
                error: null
            });

            await request(app)
                .get('/api/modules/check/mod-123')
                .set('x-org-id', 'org-456')
                .expect(200);

            expect(mockSupabase.rpc).toHaveBeenCalledWith('can_access_module', {
                p_user_id: 'test-user-001',
                p_module_id: 'mod-123',
                p_org_id: 'org-456'
            });
        });
    });

    describe('GET /api/modules/tiers', () => {
        it('should return subscription tiers', async () => {
            const mockTiers = [
                { id: 'starter', name: 'Starter', price_monthly: 0, display_order: 1 },
                { id: 'business', name: 'Business', price_monthly: 99, display_order: 2 },
                { id: 'enterprise', name: 'Enterprise', price_monthly: 299, display_order: 3 }
            ];

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'subscription_tiers') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        order: jest.fn().mockResolvedValue({
                            data: mockTiers,
                            error: null
                        })
                    };
                }
                return createMockSupabase().from(table);
            });

            const response = await request(app)
                .get('/api/modules/tiers')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockTiers);
        });

        it('should handle database errors', async () => {
            mockSupabase.from.mockImplementation(() => ({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Tiers query failed' }
                })
            }));

            const response = await request(app)
                .get('/api/modules/tiers')
                .expect(500);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/modules/org/:orgId', () => {
        const orgId = 'org-123';

        it('should return 401 without authentication', async () => {
            const { app: unauthApp } = createTestApp({ routes: ['modules'] });

            const response = await request(unauthApp)
                .get(`/api/modules/org/${orgId}`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should return 403 if not a member of organization', async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: null,
                            error: { message: 'Not found' }
                        })
                    };
                }
                return createMockSupabase().from(table);
            });

            const response = await request(app)
                .get(`/api/modules/org/${orgId}`)
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Not a member of this organization');
        });

        it('should return org module configuration for members', async () => {
            // Setup mock for membership check
            const mockFrom = jest.fn().mockImplementation((table) => {
                if (table === 'organization_members') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'admin' },
                            error: null
                        })
                    };
                }
                if (table === 'platform_modules') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        order: jest.fn().mockResolvedValue({
                            data: [
                                { id: 'mod-1', name: 'Agents', min_tier: 'starter', org_override: [] }
                            ],
                            error: null
                        })
                    };
                }
                if (table === 'subscription_tiers') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: { display_order: 2 },
                            error: null
                        })
                    };
                }
                return createMockSupabase().from(table);
            });

            mockSupabase.from = mockFrom;
            mockSupabase.rpc.mockResolvedValue({
                data: [{ subscription_tier: 'business' }],
                error: null
            });

            const response = await request(app)
                .get(`/api/modules/org/${orgId}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('modules');
            expect(response.body.data).toHaveProperty('member_role', 'admin');
        });
    });

    describe('PUT /api/modules/org/:orgId/:moduleId', () => {
        const orgId = 'org-123';
        const moduleId = 'mod-456';

        it('should return 401 without authentication', async () => {
            const { app: unauthApp } = createTestApp({ routes: ['modules'] });

            const response = await request(unauthApp)
                .put(`/api/modules/org/${orgId}/${moduleId}`)
                .send({ is_enabled: true })
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should return 403 if not admin/owner', async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'member' }, // Not admin
                            error: null
                        })
                    };
                }
                return createMockSupabase().from(table);
            });

            const response = await request(app)
                .put(`/api/modules/org/${orgId}/${moduleId}`)
                .send({ is_enabled: true })
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Admin access required');
        });

        it('should return 404 if module not found', async () => {
            const mockFrom = jest.fn().mockImplementation((table) => {
                if (table === 'organization_members') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'admin' },
                            error: null
                        })
                    };
                }
                if (table === 'platform_modules') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: null,
                            error: { message: 'Not found' }
                        })
                    };
                }
                return createMockSupabase().from(table);
            });

            mockSupabase.from = mockFrom;

            const response = await request(app)
                .put(`/api/modules/org/${orgId}/${moduleId}`)
                .send({ is_enabled: true })
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Module not found');
        });

        it('should enable module for admins', async () => {
            const mockFrom = jest.fn().mockImplementation((table) => {
                if (table === 'organization_members') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'admin' },
                            error: null
                        })
                    };
                }
                if (table === 'platform_modules') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: { id: moduleId, min_tier: null },
                            error: null
                        })
                    };
                }
                if (table === 'org_module_access') {
                    return {
                        upsert: jest.fn().mockReturnThis(),
                        select: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: { org_id: orgId, module_id: moduleId, is_enabled: true },
                            error: null
                        })
                    };
                }
                return createMockSupabase().from(table);
            });

            mockSupabase.from = mockFrom;

            const response = await request(app)
                .put(`/api/modules/org/${orgId}/${moduleId}`)
                .send({ is_enabled: true })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.is_enabled).toBe(true);
        });

        it('should return 403 if enabling module that requires higher tier', async () => {
            const mockFrom = jest.fn().mockImplementation((table) => {
                if (table === 'organization_members') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'admin' },
                            error: null
                        })
                    };
                }
                if (table === 'platform_modules') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: { id: moduleId, min_tier: 'enterprise' },
                            error: null
                        })
                    };
                }
                if (table === 'organizations') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: { subscription_tier: 'starter' },
                            error: null
                        })
                    };
                }
                if (table === 'subscription_tiers') {
                    let callCount = 0;
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockImplementation(() => {
                            callCount++;
                            // First call is for org's tier, second for module's min tier
                            return Promise.resolve({
                                data: { display_order: callCount === 1 ? 1 : 3 },
                                error: null
                            });
                        })
                    };
                }
                return createMockSupabase().from(table);
            });

            mockSupabase.from = mockFrom;

            const response = await request(app)
                .put(`/api/modules/org/${orgId}/${moduleId}`)
                .send({ is_enabled: true })
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('requires');
        });
    });

    describe('GET /api/modules/roles/:orgId', () => {
        const orgId = 'org-123';

        it('should return 401 without authentication', async () => {
            const { app: unauthApp } = createTestApp({ routes: ['modules'] });

            const response = await request(unauthApp)
                .get(`/api/modules/roles/${orgId}`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should return 403 if not a member', async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: null,
                            error: null
                        })
                    };
                }
                return createMockSupabase().from(table);
            });

            const response = await request(app)
                .get(`/api/modules/roles/${orgId}`)
                .expect(403);

            expect(response.body.success).toBe(false);
        });

        it('should return role-module access configuration', async () => {
            const mockRoleAccess = [
                { business_role: 'manager', module_id: 'mod-1', can_access: true, org_id: null, module: { id: 'mod-1' }, role: { id: 'manager' } },
                { business_role: 'manager', module_id: 'mod-2', can_access: false, org_id: orgId, module: { id: 'mod-2' }, role: { id: 'manager' } }
            ];

            const mockFrom = jest.fn().mockImplementation((table) => {
                if (table === 'organization_members') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'admin' },
                            error: null
                        })
                    };
                }
                if (table === 'role_module_access') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        or: jest.fn().mockReturnThis(),
                        order: jest.fn().mockReturnThis().mockResolvedValue({
                            data: mockRoleAccess,
                            error: null
                        })
                    };
                }
                return createMockSupabase().from(table);
            });

            mockSupabase.from = mockFrom;

            const response = await request(app)
                .get(`/api/modules/roles/${orgId}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('by_role');
            expect(response.body.data).toHaveProperty('raw');
        });
    });

    describe('PUT /api/modules/roles/:orgId', () => {
        const orgId = 'org-123';

        it('should return 401 without authentication', async () => {
            const { app: unauthApp } = createTestApp({ routes: ['modules'] });

            const response = await request(unauthApp)
                .put(`/api/modules/roles/${orgId}`)
                .send({ business_role: 'manager', module_id: 'mod-1', can_access: true })
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should return 403 if not admin', async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'member' },
                            error: null
                        })
                    };
                }
                return createMockSupabase().from(table);
            });

            const response = await request(app)
                .put(`/api/modules/roles/${orgId}`)
                .send({ business_role: 'manager', module_id: 'mod-1', can_access: true })
                .expect(403);

            expect(response.body.success).toBe(false);
        });

        it('should return 400 if missing required fields', async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'admin' },
                            error: null
                        })
                    };
                }
                return createMockSupabase().from(table);
            });

            const response = await request(app)
                .put(`/api/modules/roles/${orgId}`)
                .send({ business_role: 'manager' }) // Missing module_id
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('required');
        });

        it('should update role-module access for admins', async () => {
            const mockFrom = jest.fn().mockImplementation((table) => {
                if (table === 'organization_members') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'owner' },
                            error: null
                        })
                    };
                }
                if (table === 'role_module_access') {
                    return {
                        upsert: jest.fn().mockReturnThis(),
                        select: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: { org_id: orgId, business_role: 'manager', module_id: 'mod-1', can_access: true },
                            error: null
                        })
                    };
                }
                return createMockSupabase().from(table);
            });

            mockSupabase.from = mockFrom;

            const response = await request(app)
                .put(`/api/modules/roles/${orgId}`)
                .send({ business_role: 'manager', module_id: 'mod-1', can_access: true })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.can_access).toBe(true);
        });
    });

    describe('GET /api/modules/limits/:orgId', () => {
        const orgId = 'org-123';

        it('should return 401 without authentication', async () => {
            const { app: unauthApp } = createTestApp({ routes: ['modules'] });

            const response = await request(unauthApp)
                .get(`/api/modules/limits/${orgId}`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should return 403 if not a member', async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: null,
                            error: null
                        })
                    };
                }
                return createMockSupabase().from(table);
            });

            const response = await request(app)
                .get(`/api/modules/limits/${orgId}`)
                .expect(403);

            expect(response.body.success).toBe(false);
        });

    });

    describe('GET /api/modules/limits/:orgId/:resourceType', () => {
        const orgId = 'org-123';
        const resourceType = 'agents';

        it('should return 401 without authentication', async () => {
            const { app: unauthApp } = createTestApp({ routes: ['modules'] });

            const response = await request(unauthApp)
                .get(`/api/modules/limits/${orgId}/${resourceType}`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should call check_org_limits RPC', async () => {
            mockSupabase.rpc.mockResolvedValue({
                data: [{
                    current_count: 10,
                    max_allowed: 25,
                    within_limits: true,
                    usage_percent: 40
                }],
                error: null
            });

            const response = await request(app)
                .get(`/api/modules/limits/${orgId}/${resourceType}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(mockSupabase.rpc).toHaveBeenCalledWith('check_org_limits', {
                p_org_id: orgId,
                p_resource_type: resourceType
            });
        });

        it('should return default values when RPC returns empty', async () => {
            mockSupabase.rpc.mockResolvedValue({
                data: [],
                error: null
            });

            const response = await request(app)
                .get(`/api/modules/limits/${orgId}/${resourceType}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.within_limits).toBe(false);
        });
    });
});
