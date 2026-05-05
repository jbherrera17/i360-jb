/**
 * Module Access Middleware Unit Tests
 *
 * Tests for:
 * - requireModule middleware
 * - checkResourceLimit middleware
 * - requirePlatformAdmin middleware
 * - requireFeature middleware
 * - attachOrgContext middleware
 */

const createModuleAccessMiddleware = require('../../../server/middleware/moduleAccess');
const { createMockSupabase } = require('../../setup/mockSupabase');
const {
  createMockRequest,
  createMockResponse,
  createMockNext,
  testOrganizations,
  testSubscriptionTiers,
  testPlatformModules
} = require('../../fixtures/testData');

describe('ModuleAccess Middleware', () => {
  let mockSupabase;
  let middleware;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabase();
    middleware = createModuleAccessMiddleware(mockSupabase);
  });

  // ============================================
  // requireModule Tests
  // ============================================
  describe('requireModule', () => {
    test('should return 401 when no userId', async () => {
      const req = createMockRequest({ userId: null });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.requireModule('soul_configuration')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next() when module access is allowed', async () => {
      const req = createMockRequest({
        userId: 'test-user-001',
        headers: { 'x-org-id': 'test-org-acme-001' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      await middleware.requireModule('soul_configuration')(req, res, next);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('can_access_module', {
        p_user_id: 'test-user-001',
        p_module_id: 'soul_configuration',
        p_org_id: 'test-org-acme-001'
      });
      expect(next).toHaveBeenCalled();
    });

    test('should return 403 when module access is denied', async () => {
      const req = createMockRequest({
        userId: 'test-user-001',
        headers: { 'x-org-id': 'test-org-startup-001' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockSupabase.rpc.mockResolvedValue({ data: false, error: null });

      // Mock module details lookup
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: testPlatformModules.soulConfiguration,
          error: null
        })
      });

      await middleware.requireModule('soul_configuration')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Module not available for your subscription tier or role',
        module: 'Soul Configuration',
        requirements: {
          min_tier: 'business',
          min_business_role: 'executive'
        }
      }));
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 500 on RPC error', async () => {
      const req = createMockRequest({
        userId: 'test-user-001',
        headers: { 'x-org-id': 'test-org-acme-001' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } });

      await middleware.requireModule('soul_configuration')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to verify module access'
      });
    });

    test('should get org_id from query param if not in header', async () => {
      const req = createMockRequest({
        userId: 'test-user-001',
        query: { org_id: 'test-org-acme-001' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      await middleware.requireModule('chat')(req, res, next);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('can_access_module', expect.objectContaining({
        p_org_id: 'test-org-acme-001'
      }));
    });

    test('should get org_id from body if not in header or query', async () => {
      const req = createMockRequest({
        userId: 'test-user-001',
        body: { org_id: 'test-org-acme-001' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      await middleware.requireModule('chat')(req, res, next);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('can_access_module', expect.objectContaining({
        p_org_id: 'test-org-acme-001'
      }));
    });
  });

  // ============================================
  // checkResourceLimit Tests
  // ============================================
  describe('checkResourceLimit', () => {
    test('should return 401 when no userId', async () => {
      const req = createMockRequest({ userId: null });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.checkResourceLimit('agents')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next() when no org context (legacy behavior)', async () => {
      const req = createMockRequest({
        userId: 'test-user-001'
        // No org_id
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.checkResourceLimit('agents')(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    test('should call next() when within limits', async () => {
      const req = createMockRequest({
        userId: 'test-user-001',
        headers: { 'x-org-id': 'test-org-acme-001' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          within_limits: true,
          current_count: 10,
          max_allowed: 25,
          usage_percent: 40
        }],
        error: null
      });

      await middleware.checkResourceLimit('agents')(req, res, next);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_org_limits', {
        p_org_id: 'test-org-acme-001',
        p_resource_type: 'agents'
      });
      expect(next).toHaveBeenCalled();
      expect(req.resourceLimits).toBeDefined();
      expect(req.resourceLimits.current_count).toBe(10);
    });

    test('should return 403 when limit exceeded', async () => {
      const req = createMockRequest({
        userId: 'test-user-001',
        headers: { 'x-org-id': 'test-org-startup-001' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          within_limits: false,
          current_count: 5,
          max_allowed: 5,
          usage_percent: 100
        }],
        error: null
      });

      await middleware.checkResourceLimit('agents')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'agents limit reached',
        details: {
          current: 5,
          max: 5,
          usage_percent: 100
        },
        upgrade_required: true
      }));
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next() on RPC error (non-blocking)', async () => {
      const req = createMockRequest({
        userId: 'test-user-001',
        headers: { 'x-org-id': 'test-org-acme-001' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } });

      await middleware.checkResourceLimit('agents')(req, res, next);

      // Should not block on error
      expect(next).toHaveBeenCalled();
    });
  });

  // ============================================
  // requirePlatformAdmin Tests
  // ============================================
  describe('requirePlatformAdmin', () => {
    test('should return 401 when no userId', async () => {
      const req = createMockRequest({ userId: null });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.requirePlatformAdmin()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next() when user is platform admin', async () => {
      const req = createMockRequest({ userId: 'test-platform-admin-001' });
      const res = createMockResponse();
      const next = createMockNext();

      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      await middleware.requirePlatformAdmin()(req, res, next);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('is_platform_admin', {
        p_user_id: 'test-platform-admin-001'
      });
      expect(next).toHaveBeenCalled();
    });

    test('should return 403 when user is not platform admin', async () => {
      const req = createMockRequest({ userId: 'test-regular-user-001' });
      const res = createMockResponse();
      const next = createMockNext();

      mockSupabase.rpc.mockResolvedValue({ data: false, error: null });

      await middleware.requirePlatformAdmin()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Platform admin access required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should check specific role when roles array provided', async () => {
      const req = createMockRequest({ userId: 'test-platform-admin-001' });
      const res = createMockResponse();
      const next = createMockNext();

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: true, error: null }) // is_platform_admin
        .mockResolvedValueOnce({ data: 'super_admin', error: null }); // get_platform_admin_role

      await middleware.requirePlatformAdmin(['super_admin', 'admin'])(req, res, next);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_platform_admin_role', {
        p_user_id: 'test-platform-admin-001'
      });
      expect(next).toHaveBeenCalled();
      expect(req.platformAdminRole).toBe('super_admin');
    });

    test('should return 403 when role not in allowed list', async () => {
      const req = createMockRequest({ userId: 'test-platform-admin-001' });
      const res = createMockResponse();
      const next = createMockNext();

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: true, error: null }) // is_platform_admin
        .mockResolvedValueOnce({ data: 'viewer', error: null }); // get_platform_admin_role

      await middleware.requirePlatformAdmin(['super_admin', 'admin'])(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Required role: super_admin or admin'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // requireFeature Tests
  // ============================================
  describe('requireFeature', () => {
    test('should return 401 when no userId', async () => {
      const req = createMockRequest({ userId: null });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.requireFeature('sso')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should return 400 when no org context', async () => {
      const req = createMockRequest({ userId: 'test-user-001' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.requireFeature('sso')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Organization context required'
      });
    });

    test('should call next() when feature is enabled', async () => {
      const req = createMockRequest({
        userId: 'test-user-001',
        headers: { 'x-org-id': 'test-org-agency-001' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      // Mock org lookup
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { subscription_tier: 'tier-agency-001' },
            error: null
          })
        })
        // Mock tier lookup
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              features: { sso: true, white_label: true, client_portal: true }
            },
            error: null
          })
        });

      await middleware.requireFeature('sso')(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should return 403 when feature not in tier', async () => {
      const req = createMockRequest({
        userId: 'test-user-001',
        headers: { 'x-org-id': 'test-org-startup-001' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { subscription_tier: 'tier-starter-001' },
            error: null
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              features: { basic_modules: true, sso: false }
            },
            error: null
          })
        });

      await middleware.requireFeature('sso')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: "Feature 'sso' requires a higher subscription tier",
        upgrade_required: true
      }));
    });
  });

  // ============================================
  // attachOrgContext Tests
  // ============================================
  describe('attachOrgContext', () => {
    test('should call next() when no userId or orgId', async () => {
      const req = createMockRequest({ userId: null });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.attachOrgContext()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.organization).toBeUndefined();
    });

    test('should attach org and tier info to request', async () => {
      const req = createMockRequest({
        userId: 'test-user-001',
        headers: { 'x-org-id': 'test-org-acme-001' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: testOrganizations.acmeCorp,
            error: null
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: testSubscriptionTiers.business,
            error: null
          })
        });

      await middleware.attachOrgContext()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.organization).toBeDefined();
      expect(req.organization.name).toBe('Acme Corporation');
      expect(req.tierFeatures).toBeDefined();
      expect(req.tierFeatures.align120).toBe(true);
      expect(req.tierLimits).toBeDefined();
      expect(req.tierLimits.max_agents).toBe(25);
    });

    test('should call next() even if org lookup fails', async () => {
      const req = createMockRequest({
        userId: 'test-user-001',
        headers: { 'x-org-id': 'nonexistent' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      });

      await middleware.attachOrgContext()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.organization).toBeUndefined();
    });
  });

  // ============================================
  // attachEffectiveConfig (Phase 88 — REQ-003)
  // ============================================
  describe('attachEffectiveConfig', () => {
    test('should call next() with no req.effectiveConfig when no org context', async () => {
      const req = createMockRequest({ userId: 'test-user-001', headers: {} });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.attachEffectiveConfig()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.effectiveConfig).toBeUndefined();
    });

    test('should resolve effective config and attach to req when org_id present', async () => {
      const req = createMockRequest({
        userId: 'test-user-001',
        headers: { 'x-org-id': 'test-org-acme-001' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'organizations') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'test-org-acme-001', subscription_tier: 'starter', trial_started_at: null, trial_expires_at: null },
              error: null
            })
          };
        }
        if (table === 'subscription_tiers') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'starter', max_members: 3, max_agents: 5, max_clients: 0, max_workflows: 0, max_skills: 10, max_context_assets: 25, max_research_studios: 0, max_monthly_api_calls: 500, max_storage_gb: 1 },
              error: null
            })
          };
        }
        if (table === 'tier_module_access') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: (resolve) => resolve({ data: [{ module_id: 'chat', access_type: 'core' }], error: null })
          };
        }
        if (table === 'org_module_overrides' || table === 'org_resource_overrides') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: (resolve) => resolve({ data: [], error: null })
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
      });

      await middleware.attachEffectiveConfig()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.effectiveConfig).toBeDefined();
      expect(req.effectiveConfig.effective_tier_id).toBe('starter');
      expect(req.effectiveConfig.modules.core).toContain('chat');
    });

    test('should call next() and not attach config when org not found', async () => {
      const req = createMockRequest({
        userId: 'test-user-001',
        headers: { 'x-org-id': 'missing-org' }
      });
      const res = createMockResponse();
      const next = createMockNext();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
      }));

      await middleware.attachEffectiveConfig()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.effectiveConfig).toBeUndefined();
      consoleSpy.mockRestore();
    });
  });

  // ============================================
  // Factory returns all middleware
  // ============================================
  describe('createModuleAccessMiddleware factory', () => {
    test('should return all middleware functions', () => {
      expect(middleware.requireModule).toBeInstanceOf(Function);
      expect(middleware.checkResourceLimit).toBeInstanceOf(Function);
      expect(middleware.requirePlatformAdmin).toBeInstanceOf(Function);
      expect(middleware.requireFeature).toBeInstanceOf(Function);
      expect(middleware.attachOrgContext).toBeInstanceOf(Function);
      expect(middleware.attachEffectiveConfig).toBeInstanceOf(Function);
    });
  });
});
