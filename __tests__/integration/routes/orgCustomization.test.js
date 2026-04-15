/**
 * Integration Tests - Organization Customization Routes
 * Phase 41: Agency-Level Customization
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
    builder.order = jest.fn(() => builder);
    builder.limit = jest.fn(() => builder);
    builder.single = jest.fn().mockResolvedValue({ data: null, error: null });
    builder.then = (resolve) => resolve({ data: null, error: null });

    // Apply overrides
    Object.assign(builder, overrides);
    return builder;
}

describe('Organization Customization Routes Integration Tests', () => {
    let app;
    let mockSupabase;
    const testUserId = 'test-user-123';
    const testOrgId = 'test-org-456';

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase = createMockSupabase();
        const testApp = createTestApp({ routes: ['org-customization'], mockSupabase, anonymous: true });
        app = testApp.app;
    });

    // ============================================================================
    // GET /api/org-customization/:orgId/modules
    // ============================================================================
    describe('GET /api/org-customization/:orgId/modules', () => {
        it('should return 401 without auth', async () => {
            const response = await request(app)
                .get(`/api/org-customization/${testOrgId}/modules`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should return module configs for org member', async () => {
            const mockModules = [
                { module_key: 'align_120', is_enabled: true, custom_name: null },
                { module_key: 'strategy_120', is_enabled: true, custom_name: 'Custom Strategy' }
            ];

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return createMockBuilder({
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'admin', status: 'active' },
                            error: null
                        })
                    });
                }
                if (table === 'org_module_configs') {
                    return createMockBuilder({
                        then: (resolve) => resolve({
                            data: mockModules,
                            error: null
                        })
                    });
                }
                return createQueryBuilder();
            });

            const response = await request(app)
                .get(`/api/org-customization/${testOrgId}/modules`)
                .set('Cookie', 'auth_token=valid-token')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
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
                .get(`/api/org-customization/${testOrgId}/modules`)
                .set('Cookie', 'auth_token=valid-token')
                .expect(403);

            expect(response.body.success).toBe(false);
        });
    });

    // ============================================================================
    // PUT /api/org-customization/:orgId/modules
    // ============================================================================
    describe('PUT /api/org-customization/:orgId/modules/:moduleType/:moduleNumber', () => {
        it('should update module config for admin', async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return createMockBuilder({
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'admin', status: 'active' },
                            error: null
                        })
                    });
                }
                if (table === 'org_module_configs') {
                    return createMockBuilder({
                        single: jest.fn().mockResolvedValue({
                            data: { module_type: 'align', module_number: 1, is_enabled: true },
                            error: null
                        })
                    });
                }
                return createQueryBuilder();
            });

            const response = await request(app)
                .put(`/api/org-customization/${testOrgId}/modules/align/1`)
                .set('Cookie', 'auth_token=valid-token')
                .send({
                    custom_name: 'Strategic Alignment',
                    is_enabled: true
                })
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should return 403 for non-admins', async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return createMockBuilder({
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'viewer', status: 'active' },
                            error: null
                        })
                    });
                }
                return createQueryBuilder();
            });

            const response = await request(app)
                .put(`/api/org-customization/${testOrgId}/modules/align/1`)
                .set('Cookie', 'auth_token=valid-token')
                .send({ is_enabled: true })
                .expect(403);

            expect(response.body.success).toBe(false);
        });
    });

    // ============================================================================
    // GET /api/org-customization/:orgId/branding
    // ============================================================================
    describe('GET /api/org-customization/:orgId/branding', () => {
        it('should return branding settings', async () => {
            const mockBranding = {
                logo_url: 'https://example.com/logo.png',
                primary_color: '#6366f1',
                secondary_color: '#8b5cf6'
            };

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return createMockBuilder({
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'member', status: 'active' },
                            error: null
                        })
                    });
                }
                if (table === 'org_branding') {
                    return createMockBuilder({
                        single: jest.fn().mockResolvedValue({
                            data: mockBranding,
                            error: null
                        })
                    });
                }
                return createQueryBuilder();
            });

            const response = await request(app)
                .get(`/api/org-customization/${testOrgId}/branding`)
                .set('Cookie', 'auth_token=valid-token')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.primary_color).toBe('#6366f1');
        });
    });

    // ============================================================================
    // PUT /api/org-customization/:orgId/branding
    // ============================================================================
    describe('PUT /api/org-customization/:orgId/branding', () => {
        it('should update branding for admin', async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'organization_members') {
                    return createMockBuilder({
                        single: jest.fn().mockResolvedValue({
                            data: { role: 'admin', status: 'active' },
                            error: null
                        })
                    });
                }
                if (table === 'org_branding') {
                    return createMockBuilder({
                        single: jest.fn().mockResolvedValue({
                            data: { primary_color: '#ff0000' },
                            error: null
                        })
                    });
                }
                return createQueryBuilder();
            });

            const response = await request(app)
                .put(`/api/org-customization/${testOrgId}/branding`)
                .set('Cookie', 'auth_token=valid-token')
                .send({
                    logo_url: 'https://example.com/logo.png',
                    primary_color: '#ff0000'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    // ============================================================================
    // GET /api/org-customization/:orgId/prompts
    // ============================================================================
    describe('GET /api/org-customization/:orgId/prompts', () => {
        it('should return prompt templates', async () => {
            const mockPrompts = [
                { id: '1', name: 'Discovery Prompt', category: 'discovery' },
                { id: '2', name: 'Analysis Prompt', category: 'analysis' }
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
                if (table === 'org_prompt_templates') {
                    return createMockBuilder({
                        then: (resolve) => resolve({
                            data: mockPrompts,
                            error: null
                        })
                    });
                }
                return createQueryBuilder();
            });

            const response = await request(app)
                .get(`/api/org-customization/${testOrgId}/prompts`)
                .set('Cookie', 'auth_token=valid-token')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
        });
    });

    // ============================================================================
    // POST /api/org-customization/:orgId/prompts
    // ============================================================================
    describe('POST /api/org-customization/:orgId/prompts', () => {
        it('should create prompt template for admin', async () => {
            const newPrompt = {
                id: 'new-1',
                name: 'New Prompt',
                category: 'discovery',
                prompt_text: 'Hello {company_name}'
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
                if (table === 'org_prompt_templates') {
                    const builder = createMockBuilder({
                        single: jest.fn().mockResolvedValue({
                            data: null,
                            error: { code: 'PGRST116' }
                        })
                    });
                    // Override insert for chain: insert().select().single()
                    builder.insert = jest.fn(() => ({
                        select: jest.fn(() => ({
                            single: jest.fn().mockResolvedValue({
                                data: newPrompt,
                                error: null
                            })
                        }))
                    }));
                    return builder;
                }
                return createQueryBuilder();
            });

            const response = await request(app)
                .post(`/api/org-customization/${testOrgId}/prompts`)
                .set('Cookie', 'auth_token=valid-token')
                .send({
                    name: 'New Prompt',
                    template_key: 'new_prompt',
                    category: 'discovery',
                    prompt_text: 'Hello {company_name}'
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe('New Prompt');
        });

        it('should return 400 when required fields are missing', async () => {
            mockSupabase.from.mockImplementation((table) => {
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
                .post(`/api/org-customization/${testOrgId}/prompts`)
                .set('Cookie', 'auth_token=valid-token')
                .send({
                    category: 'discovery'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    // ============================================================================
    // GET /api/org-customization/:orgId/report-templates
    // ============================================================================
    describe('GET /api/org-customization/:orgId/report-templates', () => {
        it('should return report templates', async () => {
            const mockTemplates = [
                { id: '1', name: 'Executive Summary', report_type: 'executive' }
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
                if (table === 'org_report_templates') {
                    return createMockBuilder({
                        then: (resolve) => resolve({
                            data: mockTemplates,
                            error: null
                        })
                    });
                }
                return createQueryBuilder();
            });

            const response = await request(app)
                .get(`/api/org-customization/${testOrgId}/report-templates`)
                .set('Cookie', 'auth_token=valid-token')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
        });
    });
});
