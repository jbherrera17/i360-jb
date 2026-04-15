/**
 * Integration Tests - Organization Members Routes
 * Tests HTTP endpoints for organization member management (Phase 39)
 *
 * Note: The org-members routes use complex multi-call Supabase patterns
 * that are challenging to mock properly. These tests cover basic authentication
 * and validation. Full RBAC testing should be done via e2e tests against
 * a real database.
 */

const request = require('supertest');
const { createTestApp } = require('../../setup/testApp');
const { createMockSupabase } = require('../../setup/mockSupabase');

describe('Organization Members Routes Integration Tests', () => {
  let app;
  let mockSupabase;
  const testUserId = 'test-user-123';
  const testOrgId = 'test-org-456';
  const testMemberId = 'test-member-789';

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset module cache to ensure fresh route registration with new mock
    jest.resetModules();
    mockSupabase = createMockSupabase();
    const testApp = createTestApp({
      routes: ['org-members'],
      mockSupabase,
      userId: testUserId
    });
    app = testApp.app;
  });

  // ============================================================================
  // Authentication Tests
  // ============================================================================
  describe('Authentication', () => {
    it('GET /api/org-members/:orgId should return 401 when not authenticated', async () => {
      const unauthApp = createTestApp({ routes: ['org-members'], mockSupabase, anonymous: true }).app;

      const response = await request(unauthApp)
        .get(`/api/org-members/${testOrgId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    it('POST /api/org-members/:orgId/invite should return 401 when not authenticated', async () => {
      const unauthApp = createTestApp({ routes: ['org-members'], mockSupabase, anonymous: true }).app;

      const response = await request(unauthApp)
        .post(`/api/org-members/${testOrgId}/invite`)
        .send({ email: 'test@test.com' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    it('PUT /api/org-members/:orgId/:memberId should return 401 when not authenticated', async () => {
      const unauthApp = createTestApp({ routes: ['org-members'], mockSupabase, anonymous: true }).app;

      const response = await request(unauthApp)
        .put(`/api/org-members/${testOrgId}/${testMemberId}`)
        .send({ role: 'admin' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    it('DELETE /api/org-members/:orgId/:memberId should return 401 when not authenticated', async () => {
      const unauthApp = createTestApp({ routes: ['org-members'], mockSupabase, anonymous: true }).app;

      const response = await request(unauthApp)
        .delete(`/api/org-members/${testOrgId}/${testMemberId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    it('POST /api/org-members/:orgId/leave should return 401 when not authenticated', async () => {
      const unauthApp = createTestApp({ routes: ['org-members'], mockSupabase, anonymous: true }).app;

      const response = await request(unauthApp)
        .post(`/api/org-members/${testOrgId}/leave`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });
  });

  // ============================================================================
  // Validation Tests
  // ============================================================================
  describe('Validation', () => {
    it('POST /api/org-members/:orgId/invite should return 400 when email missing', async () => {
      const response = await request(app)
        .post(`/api/org-members/${testOrgId}/invite`)
        .set('Cookie', 'auth_token=valid-token')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Email is required');
    });

    it('POST /api/org-members/:orgId/invite should return 400 for invalid role', async () => {
      // Reset modules to ensure fresh route registration
      jest.resetModules();
      const { createTestApp: freshCreateTestApp } = require('../../setup/testApp');
      const { createMockSupabase: freshCreateMockSupabase } = require('../../setup/mockSupabase');

      // Mock: user is admin of the org
      const adminMockSupabase = freshCreateMockSupabase({
        tables: {
          organization_members: { data: { role: 'admin' }, error: null }
        }
      });
      const adminApp = freshCreateTestApp({
        routes: ['org-members'],
        mockSupabase: adminMockSupabase,
        userId: testUserId
      }).app;

      const response = await request(adminApp)
        .post(`/api/org-members/${testOrgId}/invite`)
        .set('Cookie', 'auth_token=valid-token')
        .send({ email: 'test@example.com', role: 'superadmin' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid role');
      expect(response.body.error).toContain('admin, consultant, viewer');
    });

    it('POST /api/org-members/:orgId/invite should return 400 for owner role (cannot invite as owner)', async () => {
      // Reset modules to ensure fresh route registration
      jest.resetModules();
      const { createTestApp: freshCreateTestApp } = require('../../setup/testApp');
      const { createMockSupabase: freshCreateMockSupabase } = require('../../setup/mockSupabase');

      // Mock: user is admin of the org
      const adminMockSupabase = freshCreateMockSupabase({
        tables: {
          organization_members: { data: { role: 'admin' }, error: null }
        }
      });
      const adminApp = freshCreateTestApp({
        routes: ['org-members'],
        mockSupabase: adminMockSupabase,
        userId: testUserId
      }).app;

      const response = await request(adminApp)
        .post(`/api/org-members/${testOrgId}/invite`)
        .set('Cookie', 'auth_token=valid-token')
        .send({ email: 'test@example.com', role: 'owner' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid role');
    });

    it('POST /api/org-members/:orgId/invite should return 400 for empty email', async () => {
      const response = await request(app)
        .post(`/api/org-members/${testOrgId}/invite`)
        .set('Cookie', 'auth_token=valid-token')
        .send({ email: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Email is required');
    });

    it('PUT /api/org-members/:orgId/:memberId should return 400 for invalid role', async () => {
      // Reset modules to ensure fresh route registration
      jest.resetModules();
      const { createTestApp: freshCreateTestApp } = require('../../setup/testApp');
      const { createMockSupabase: freshCreateMockSupabase } = require('../../setup/mockSupabase');

      // Mock: user is admin, target member exists
      const adminMockSupabase = freshCreateMockSupabase({
        tables: {
          organization_members: { data: { role: 'admin', user_id: 'other-user' }, error: null }
        }
      });
      const adminApp = freshCreateTestApp({
        routes: ['org-members'],
        mockSupabase: adminMockSupabase,
        userId: testUserId
      }).app;

      const response = await request(adminApp)
        .put(`/api/org-members/${testOrgId}/${testMemberId}`)
        .set('Cookie', 'auth_token=valid-token')
        .send({ role: 'superadmin' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid role');
      expect(response.body.error).toContain('owner, admin, consultant, viewer');
    });
  });

  // ============================================================================
  // Authorization Tests (RBAC)
  // ============================================================================
  describe('Authorization (RBAC)', () => {
    it('POST /api/org-members/:orgId/invite should return 403 when user is not admin/owner', async () => {
      // Mock: user is a consultant (not admin/owner)
      const consultantMockSupabase = createMockSupabase({
        tables: {
          organization_members: { data: { role: 'consultant' }, error: null }
        }
      });
      const consultantApp = createTestApp({
        routes: ['org-members'],
        mockSupabase: consultantMockSupabase,
        userId: testUserId
      }).app;

      const response = await request(consultantApp)
        .post(`/api/org-members/${testOrgId}/invite`)
        .set('Cookie', 'auth_token=valid-token')
        .send({ email: 'newmember@example.com', role: 'viewer' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Admin access required');
    });

    it('POST /api/org-members/:orgId/invite should return 403 when user is viewer', async () => {
      // Mock: user is a viewer
      const viewerMockSupabase = createMockSupabase({
        tables: {
          organization_members: { data: { role: 'viewer' }, error: null }
        }
      });
      const viewerApp = createTestApp({
        routes: ['org-members'],
        mockSupabase: viewerMockSupabase,
        userId: testUserId
      }).app;

      const response = await request(viewerApp)
        .post(`/api/org-members/${testOrgId}/invite`)
        .set('Cookie', 'auth_token=valid-token')
        .send({ email: 'newmember@example.com' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Admin access required');
    });

    it('GET /api/org-members/:orgId should return 403 when user is not a member', async () => {
      // Mock: membership query returns null (not a member)
      const nonMemberMockSupabase = createMockSupabase({
        tables: {
          organization_members: { data: null, error: null }
        }
      });
      const nonMemberApp = createTestApp({
        routes: ['org-members'],
        mockSupabase: nonMemberMockSupabase,
        userId: testUserId
      }).app;

      const response = await request(nonMemberApp)
        .get(`/api/org-members/${testOrgId}`)
        .set('Cookie', 'auth_token=valid-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Not a member of this organization');
    });

    it('PUT /api/org-members/:orgId/:memberId should return 403 when user is consultant', async () => {
      // Mock: user is a consultant
      const consultantMockSupabase = createMockSupabase({
        tables: {
          organization_members: { data: { role: 'consultant' }, error: null }
        }
      });
      const consultantApp = createTestApp({
        routes: ['org-members'],
        mockSupabase: consultantMockSupabase,
        userId: testUserId
      }).app;

      const response = await request(consultantApp)
        .put(`/api/org-members/${testOrgId}/${testMemberId}`)
        .set('Cookie', 'auth_token=valid-token')
        .send({ role: 'admin' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Admin access required');
    });

    it('DELETE /api/org-members/:orgId/:memberId should return 403 when user is not admin/owner', async () => {
      // Mock: user is a consultant
      const consultantMockSupabase = createMockSupabase({
        tables: {
          organization_members: { data: { role: 'consultant' }, error: null }
        }
      });
      const consultantApp = createTestApp({
        routes: ['org-members'],
        mockSupabase: consultantMockSupabase,
        userId: testUserId
      }).app;

      const response = await request(consultantApp)
        .delete(`/api/org-members/${testOrgId}/${testMemberId}`)
        .set('Cookie', 'auth_token=valid-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Admin access required');
    });
  });

  // Note: Success path tests require more sophisticated mock setup
  // due to multiple chained Supabase calls with .eq().eq().eq() patterns.
  // Full RBAC and success path testing is better done in e2e tests
  // against a real database, which is documented in the manual testing plan.
});
