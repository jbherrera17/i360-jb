/**
 * Integration Tests - Organizations Routes
 * Tests HTTP endpoints for organization management (Phase 39)
 */

const request = require('supertest');
const { createTestApp } = require('../../setup/testApp');
const { createMockSupabase, createMockUser } = require('../../setup/mockSupabase');

describe('Organizations Routes Integration Tests', () => {
  let app;
  let mockSupabase;
  const testUserId = 'test-user-123';
  const testOrgId = 'test-org-456';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabase();
    const testApp = createTestApp({ routes: ['organizations'], mockSupabase });
    app = testApp.app;
  });

  // ============================================================================
  // GET /api/organizations
  // ============================================================================
  describe('GET /api/organizations', () => {
    it('should return organizations for authenticated user', async () => {
      const mockOrg = {
        id: testOrgId,
        name: 'Test Organization',
        slug: 'test-org',
        owner_id: testUserId,
        subscription_tier: 'free',
        subscription_status: 'active',
        settings: { is_personal: false }
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'organization_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: (resolve) => resolve({
              data: [{
                role: 'owner',
                status: 'active',
                joined_at: new Date().toISOString(),
                organizations: mockOrg
              }],
              error: null
            })
          };
        }
        return mockSupabase.from(table);
      });

      const response = await request(app)
        .get('/api/organizations')
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Test Organization');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/organizations')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });
  });

  // ============================================================================
  // GET /api/organizations/:id
  // ============================================================================
  describe('GET /api/organizations/:id', () => {
    it('should return organization details for member', async () => {
      const mockOrg = {
        id: testOrgId,
        name: 'Test Organization',
        slug: 'test-org',
        subscription_tier: 'free'
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'organization_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: 'owner', status: 'active' },
              error: null
            })
          };
        }
        if (table === 'organizations') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockOrg,
              error: null
            })
          };
        }
        return mockSupabase.from(table);
      });

      const response = await request(app)
        .get(`/api/organizations/${testOrgId}`)
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Organization');
      expect(response.body.data.member_role).toBe('owner');
    });

    it('should return 403 when not a member', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'organization_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          };
        }
        return mockSupabase.from(table);
      });

      const response = await request(app)
        .get(`/api/organizations/${testOrgId}`)
        .set('Cookie', 'auth_token=valid-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Not a member');
    });
  });

  // ============================================================================
  // POST /api/organizations
  // ============================================================================
  describe('POST /api/organizations', () => {
    it('should create a new organization', async () => {
      const newOrg = {
        id: 'new-org-789',
        name: 'New Organization',
        slug: 'new-org',
        owner_id: testUserId,
        subscription_tier: 'free',
        subscription_status: 'active'
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'organizations') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
            insert: jest.fn().mockReturnThis(),
            then: (resolve) => resolve({ data: newOrg, error: null })
          };
        }
        if (table === 'organization_members') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        return mockSupabase.from(table);
      });

      const response = await request(app)
        .post('/api/organizations')
        .set('Cookie', 'auth_token=valid-token')
        .send({ name: 'New Organization' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Organization');
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/organizations')
        .set('Cookie', 'auth_token=valid-token')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('name is required');
    });

    it('should return 400 when slug already exists', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'organizations') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'existing-org' },
              error: null
            })
          };
        }
        return mockSupabase.from(table);
      });

      const response = await request(app)
        .post('/api/organizations')
        .set('Cookie', 'auth_token=valid-token')
        .send({ name: 'Test Org', slug: 'existing-slug' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('slug already exists');
    });
  });

  // ============================================================================
  // PUT /api/organizations/:id
  // ============================================================================
  describe('PUT /api/organizations/:id', () => {
    it('should update organization when admin', async () => {
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
        if (table === 'organizations') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: testOrgId, name: 'Updated Name' },
              error: null
            })
          };
        }
        return mockSupabase.from(table);
      });

      const response = await request(app)
        .put(`/api/organizations/${testOrgId}`)
        .set('Cookie', 'auth_token=valid-token')
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
    });

    it('should return 403 when not admin', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'organization_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: 'viewer' },
              error: null
            })
          };
        }
        return mockSupabase.from(table);
      });

      const response = await request(app)
        .put(`/api/organizations/${testOrgId}`)
        .set('Cookie', 'auth_token=valid-token')
        .send({ name: 'Updated Name' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Admin access required');
    });
  });

  // ============================================================================
  // DELETE /api/organizations/:id
  // ============================================================================
  describe('DELETE /api/organizations/:id', () => {
    it('should delete organization when owner', async () => {
      mockSupabase.from.mockImplementation((table) => {
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
        if (table === 'organizations') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { settings: {} },
              error: null
            }),
            delete: jest.fn().mockReturnThis(),
            then: (resolve) => resolve({ error: null })
          };
        }
        return mockSupabase.from(table);
      });

      const response = await request(app)
        .delete(`/api/organizations/${testOrgId}`)
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 403 when not owner', async () => {
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
        return mockSupabase.from(table);
      });

      const response = await request(app)
        .delete(`/api/organizations/${testOrgId}`)
        .set('Cookie', 'auth_token=valid-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Owner access required');
    });

    it('should return 400 when trying to delete personal workspace', async () => {
      mockSupabase.from.mockImplementation((table) => {
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
        if (table === 'organizations') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { settings: { is_personal: true } },
              error: null
            })
          };
        }
        return mockSupabase.from(table);
      });

      const response = await request(app)
        .delete(`/api/organizations/${testOrgId}`)
        .set('Cookie', 'auth_token=valid-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot delete personal workspace');
    });
  });

  // ============================================================================
  // GET /api/organizations/:id/stats
  // ============================================================================
  describe('GET /api/organizations/:id/stats', () => {
    it('should return organization statistics', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'organization_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: 'owner' },
              error: null
            }),
            then: (resolve) => resolve({ count: 3, error: null })
          };
        }
        if (table === 'clients') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: (resolve) => resolve({ count: 5, error: null })
          };
        }
        if (table === 'agents') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: (resolve) => resolve({ count: 10, error: null })
          };
        }
        if (table === 'workflows') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: (resolve) => resolve({ count: 7, error: null })
          };
        }
        return mockSupabase.from(table);
      });

      const response = await request(app)
        .get(`/api/organizations/${testOrgId}/stats`)
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('members');
      expect(response.body.data).toHaveProperty('clients');
      expect(response.body.data).toHaveProperty('agents');
      expect(response.body.data).toHaveProperty('workflows');
    });
  });
});
