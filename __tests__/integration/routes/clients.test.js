/**
 * Integration Tests - Clients Routes
 * Tests HTTP endpoints for client management (Phase 39)
 */

const request = require('supertest');
const { createTestApp } = require('../../setup/testApp');
const { createMockSupabase } = require('../../setup/mockSupabase');

describe('Clients Routes Integration Tests', () => {
  let app;
  let mockSupabase;
  const testUserId = 'test-user-123';
  const testOrgId = 'test-org-456';
  const testClientId = 'test-client-789';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabase();
    const testApp = createTestApp({ routes: ['clients'], mockSupabase });
    app = testApp.app;
  });

  // ============================================================================
  // GET /api/clients
  // ============================================================================
  describe('GET /api/clients', () => {
    it('should return clients for organization member', async () => {
      const mockClients = [
        { id: testClientId, name: 'Client A', status: 'active', org_id: testOrgId },
        { id: 'client-2', name: 'Client B', status: 'active', org_id: testOrgId }
      ];

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'organization_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: 'consultant' },
              error: null
            })
          };
        }
        if (table === 'clients') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            then: (resolve) => resolve({ data: mockClients, error: null })
          };
        }
        return mockSupabase.from(table);
      });

      const response = await request(app)
        .get(`/api/clients?org_id=${testOrgId}`)
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should return 400 when org_id is missing', async () => {
      const response = await request(app)
        .get('/api/clients')
        .set('Cookie', 'auth_token=valid-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Organization ID is required');
    });

    it('should return 403 when not a member of organization', async () => {
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
        return mockSupabase.from(table);
      });

      const response = await request(app)
        .get(`/api/clients?org_id=${testOrgId}`)
        .set('Cookie', 'auth_token=valid-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Not a member');
    });

    it('should filter by status when provided', async () => {
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
        if (table === 'clients') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn((col, val) => {
              if (col === 'status') {
                expect(val).toBe('active');
              }
              return this;
            }).mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            then: (resolve) => resolve({
              data: [{ id: testClientId, name: 'Active Client', status: 'active' }],
              error: null
            })
          };
        }
        return mockSupabase.from(table);
      });

      const response = await request(app)
        .get(`/api/clients?org_id=${testOrgId}&status=active`)
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ============================================================================
  // GET /api/clients/:id
  // ============================================================================
  describe('GET /api/clients/:id', () => {
    it('should return client details for authorized user', async () => {
      const mockClient = {
        id: testClientId,
        name: 'Test Client',
        org_id: testOrgId,
        contact_email: 'client@example.com',
        status: 'active'
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'clients') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockClient,
              error: null
            })
          };
        }
        if (table === 'organization_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: 'consultant' },
              error: null
            })
          };
        }
        return mockSupabase.from(table);
      });

      const response = await request(app)
        .get(`/api/clients/${testClientId}`)
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Client');
    });

    it('should return 404 when client not found', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'clients') {
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
        .get(`/api/clients/nonexistent-id`)
        .set('Cookie', 'auth_token=valid-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  // ============================================================================
  // POST /api/clients
  // ============================================================================
  describe('POST /api/clients', () => {
    it('should create a new client when authorized', async () => {
      const newClient = {
        id: 'new-client-id',
        name: 'New Client',
        org_id: testOrgId,
        status: 'active'
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'organization_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: 'consultant' },
              error: null
            })
          };
        }
        if (table === 'clients') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: newClient,
              error: null
            })
          };
        }
        return mockSupabase.from(table);
      });

      const response = await request(app)
        .post('/api/clients')
        .set('Cookie', 'auth_token=valid-token')
        .send({
          org_id: testOrgId,
          name: 'New Client',
          contact_email: 'new@example.com'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Client');
    });

    it('should return 400 when name is missing', async () => {
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
        .post('/api/clients')
        .set('Cookie', 'auth_token=valid-token')
        .send({ org_id: testOrgId })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('name is required');
    });

    it('should return 403 when viewer tries to create', async () => {
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
        .post('/api/clients')
        .set('Cookie', 'auth_token=valid-token')
        .send({ org_id: testOrgId, name: 'New Client' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });
  });

  // ============================================================================
  // PUT /api/clients/:id
  // ============================================================================
  describe('PUT /api/clients/:id', () => {
    it('should update client when authorized', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'clients') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { org_id: testOrgId },
              error: null
            }),
            update: jest.fn().mockReturnThis(),
            then: (resolve) => resolve({
              data: { id: testClientId, name: 'Updated Client' },
              error: null
            })
          };
        }
        if (table === 'organization_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: 'consultant' },
              error: null
            })
          };
        }
        return mockSupabase.from(table);
      });

      const response = await request(app)
        .put(`/api/clients/${testClientId}`)
        .set('Cookie', 'auth_token=valid-token')
        .send({ name: 'Updated Client' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ============================================================================
  // DELETE /api/clients/:id
  // ============================================================================
  describe('DELETE /api/clients/:id', () => {
    it('should archive client when admin (soft delete)', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'clients') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { org_id: testOrgId },
              error: null
            }),
            update: jest.fn().mockResolvedValue({ error: null })
          };
        }
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
        .delete(`/api/clients/${testClientId}`)
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('archived');
    });

    it('should permanently delete when owner and permanent=true', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'clients') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { org_id: testOrgId },
              error: null
            }),
            delete: jest.fn().mockResolvedValue({ error: null })
          };
        }
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
        return mockSupabase.from(table);
      });

      const response = await request(app)
        .delete(`/api/clients/${testClientId}?permanent=true`)
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('permanently deleted');
    });

    it('should return 403 when consultant tries to delete', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'clients') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { org_id: testOrgId },
              error: null
            })
          };
        }
        if (table === 'organization_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: 'consultant' },
              error: null
            })
          };
        }
        return mockSupabase.from(table);
      });

      const response = await request(app)
        .delete(`/api/clients/${testClientId}`)
        .set('Cookie', 'auth_token=valid-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Admin access required');
    });
  });
});
