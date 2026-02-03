/**
 * Auth Middleware Tests
 *
 * Tests for authentication and authorization middleware.
 */

const {
  authenticate,
  requireAuth,
  requireAdmin,
  requireRole,
  optionalAuth,
  canEditAgent,
  canDeleteAgent,
  rateLimit
} = require('../../../server/middleware/auth');

const {
  createMockSupabase,
  createMockUser
} = require('../../setup/mockSupabase');

const {
  testUsers,
  testAgents,
  testTokens,
  createMockRequest,
  createMockResponse,
  createMockNext
} = require('../../fixtures/testData');

describe('Auth Middleware', () => {
  let mockSupabase;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    req = createMockRequest({ supabase: mockSupabase });
    res = createMockResponse();
    next = createMockNext();

    // Reset environment
    delete process.env.DEV_AUTH_BYPASS;
    process.env.NODE_ENV = 'test';
  });

  describe('authenticate', () => {
    describe('public paths', () => {
      const publicPaths = [
        '/api/health',
        '/api/status',
        '/api/chat/models',
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/forgot-password',
        '/api/auth/reset-password'
      ];

      test.each(publicPaths)('should skip auth for public path: %s', async (path) => {
        req.path = path;

        await authenticate(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
      });

      test('should skip auth for paths starting with public prefix', async () => {
        req.path = '/api/health/check';

        await authenticate(req, res, next);

        expect(next).toHaveBeenCalled();
      });
    });

    describe('no Supabase configured', () => {
      test('should allow anonymous access when Supabase is not configured', async () => {
        req.supabase = null;
        req.path = '/api/agents';

        await authenticate(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.userId).toBeNull();
        expect(req.isAnonymous).toBe(true);
      });
    });

    describe('no authorization header', () => {
      test('should allow anonymous access without auth header', async () => {
        req.path = '/api/agents';

        await authenticate(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.userId).toBeNull();
        expect(req.isAnonymous).toBe(true);
      });

      test('should NOT accept x-user-id header (security fix)', async () => {
        req.path = '/api/agents';
        req.headers['x-user-id'] = 'test-user-123';

        await authenticate(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.userId).toBeNull();
        expect(req.isAnonymous).toBe(true);
      });
    });

    describe('bearer token authentication', () => {
      test('should authenticate valid bearer token', async () => {
        const mockUser = createMockUser({ id: 'user-123', email: 'test@example.com' });
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        });
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { role: 'admin' },
            error: null
          })
        });

        req.path = '/api/agents';
        req.headers.authorization = `Bearer ${testTokens.validToken}`;

        await authenticate(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.userId).toBe('user-123');
        expect(req.user).toEqual(mockUser);
        expect(req.userRole).toBe('admin');
        expect(req.isAnonymous).toBe(false);
      });

      test('should default to user role when profile fetch fails', async () => {
        const mockUser = createMockUser({ id: 'user-123' });
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        });
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockRejectedValue(new Error('Profile not found'))
        });

        req.path = '/api/agents';
        req.headers.authorization = `Bearer ${testTokens.validToken}`;

        await authenticate(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.userRole).toBe('user');
      });

      test('should handle invalid token gracefully', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid token' }
        });

        req.path = '/api/agents';
        req.headers.authorization = `Bearer ${testTokens.malformedToken}`;

        await authenticate(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.userId).toBeNull();
        expect(req.isAnonymous).toBe(true);
      });

      test('should handle auth.getUser throwing error', async () => {
        mockSupabase.auth.getUser.mockRejectedValue(new Error('Network error'));

        req.path = '/api/agents';
        req.headers.authorization = `Bearer ${testTokens.validToken}`;

        await authenticate(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.userId).toBeNull();
        expect(req.isAnonymous).toBe(true);
      });
    });
  });

  describe('requireAuth', () => {
    test('should allow authenticated user', () => {
      req.userId = 'user-123';
      req.isAnonymous = false;

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject unauthenticated request', () => {
      req.userId = null;
      req.isAnonymous = true;

      requireAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res._json).toEqual({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    });

    test('should reject anonymous user', () => {
      req.userId = null;
      req.isAnonymous = true;

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    describe('development bypass', () => {
      test('should bypass auth in development with DEV_AUTH_BYPASS', () => {
        process.env.NODE_ENV = 'development';
        process.env.DEV_AUTH_BYPASS = 'true';
        req.userId = null;
        req.isAnonymous = true;

        requireAuth(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.userId).toBe('dev-user-001');
        expect(req.isAnonymous).toBe(false);
      });

      test('should use custom DEV_USER_ID when set', () => {
        process.env.NODE_ENV = 'development';
        process.env.DEV_AUTH_BYPASS = 'true';
        process.env.DEV_USER_ID = 'custom-dev-user';
        req.userId = null;

        requireAuth(req, res, next);

        expect(req.userId).toBe('custom-dev-user');
      });

      test('should NOT bypass in production even with DEV_AUTH_BYPASS', () => {
        process.env.NODE_ENV = 'production';
        process.env.DEV_AUTH_BYPASS = 'true';
        req.userId = null;
        req.isAnonymous = true;

        requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
      });

      test('should NOT bypass when DEV_AUTH_BYPASS is not set', () => {
        process.env.NODE_ENV = 'development';
        delete process.env.DEV_AUTH_BYPASS;
        req.userId = null;
        req.isAnonymous = true;

        requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
      });
    });
  });

  describe('requireAdmin', () => {
    test('should allow admin user', () => {
      req.userId = 'admin-123';
      req.userRole = 'admin';
      req.isAnonymous = false;

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should reject non-admin user', () => {
      req.userId = 'user-123';
      req.userRole = 'user';
      req.isAnonymous = false;

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res._json).toEqual({
        success: false,
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    });

    test('should reject unauthenticated request before checking role', () => {
      req.userId = null;
      req.isAnonymous = true;

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res._json.code).toBe('AUTH_REQUIRED');
    });

    test('should bypass in development with DEV_AUTH_BYPASS', () => {
      process.env.NODE_ENV = 'development';
      process.env.DEV_AUTH_BYPASS = 'true';
      req.userId = null;

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.userRole).toBe('admin');
    });
  });

  describe('requireRole', () => {
    test('should allow user with matching role', () => {
      req.userId = 'user-123';
      req.userRole = 'editor';
      req.isAnonymous = false;

      const middleware = requireRole('admin', 'editor');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should reject user without matching role', () => {
      req.userId = 'user-123';
      req.userRole = 'viewer';
      req.isAnonymous = false;

      const middleware = requireRole('admin', 'editor');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res._json.error).toContain('admin or editor');
    });

    test('should work with single role', () => {
      req.userId = 'user-123';
      req.userRole = 'admin';
      req.isAnonymous = false;

      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should reject unauthenticated users', () => {
      req.userId = null;
      req.isAnonymous = true;

      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('optionalAuth', () => {
    test('should always call next regardless of auth state', () => {
      req.userId = null;
      req.isAnonymous = true;

      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should call next for authenticated users', () => {
      req.userId = 'user-123';
      req.isAnonymous = false;

      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('canEditAgent', () => {
    test('admin can edit any agent', () => {
      expect(canEditAgent('admin', 'any-user', testAgents.systemAgent)).toBe(true);
      expect(canEditAgent('admin', 'any-user', testAgents.userAgent)).toBe(true);
    });

    test('non-admin cannot edit system agents', () => {
      expect(canEditAgent('user', 'user-123', testAgents.systemAgent)).toBe(false);
    });

    test('user can edit their own non-system agents', () => {
      const agent = { ...testAgents.userAgent, user_id: 'user-123' };
      expect(canEditAgent('user', 'user-123', agent)).toBe(true);
    });

    test('user cannot edit other users agents', () => {
      const agent = { ...testAgents.userAgent, user_id: 'other-user' };
      expect(canEditAgent('user', 'user-123', agent)).toBe(false);
    });
  });

  describe('canDeleteAgent', () => {
    test('should follow same rules as canEditAgent', () => {
      // Admin can delete anything
      expect(canDeleteAgent('admin', 'any-user', testAgents.systemAgent)).toBe(true);

      // User can delete own agent
      const ownAgent = { ...testAgents.userAgent, user_id: 'user-123' };
      expect(canDeleteAgent('user', 'user-123', ownAgent)).toBe(true);

      // User cannot delete system agent
      expect(canDeleteAgent('user', 'user-123', testAgents.systemAgent)).toBe(false);
    });
  });

  describe('rateLimit', () => {
    // Note: fake timers are set globally in jest.setup.js

    test('should allow requests within limit', () => {
      const middleware = rateLimit({ max: 5, windowMs: 60000 });
      req.userId = 'rate-test-user-1';

      for (let i = 0; i < 5; i++) {
        const testNext = createMockNext();
        middleware(req, res, testNext);
        expect(testNext).toHaveBeenCalled();
      }
    });

    test('should block requests exceeding limit', () => {
      const middleware = rateLimit({ max: 3, windowMs: 60000 });
      req.userId = 'rate-test-user-2';

      // First 3 requests should pass
      for (let i = 0; i < 3; i++) {
        const testRes = createMockResponse();
        const testNext = createMockNext();
        middleware(req, testRes, testNext);
        expect(testNext).toHaveBeenCalled();
      }

      // 4th request should be blocked
      const blockedRes = createMockResponse();
      const blockedNext = createMockNext();
      middleware(req, blockedRes, blockedNext);

      expect(blockedNext).not.toHaveBeenCalled();
      expect(blockedRes.status).toHaveBeenCalledWith(429);
      expect(blockedRes._json.code).toBe('RATE_LIMITED');
    });

    test('should reset after window expires', () => {
      const middleware = rateLimit({ max: 2, windowMs: 1000 });
      req.userId = 'rate-test-user-3';

      // Use up the limit
      for (let i = 0; i < 2; i++) {
        const testNext = createMockNext();
        middleware(req, res, testNext);
      }

      // Should be blocked
      const blockedNext = createMockNext();
      middleware(req, res, blockedNext);
      expect(blockedNext).not.toHaveBeenCalled();

      // Advance time past window
      jest.advanceTimersByTime(1500);

      // Should be allowed again
      const allowedNext = createMockNext();
      middleware(req, res, allowedNext);
      expect(allowedNext).toHaveBeenCalled();
    });

    test('should use custom error message', () => {
      const customMessage = 'Slow down!';
      const middleware = rateLimit({ max: 1, windowMs: 60000, message: customMessage });
      req.userId = 'rate-test-user-4';

      // First request passes
      middleware(req, res, next);

      // Second request blocked with custom message
      const blockedRes = createMockResponse();
      middleware(req, blockedRes, createMockNext());

      expect(blockedRes._json.error).toBe(customMessage);
    });

    test('should use IP when userId is not available', () => {
      const middleware = rateLimit({ max: 2, windowMs: 60000 });
      req.userId = null;
      req.ip = '192.168.1.100';

      // Should track by IP
      for (let i = 0; i < 2; i++) {
        const testNext = createMockNext();
        middleware(req, res, testNext);
        expect(testNext).toHaveBeenCalled();
      }

      // 3rd request from same IP should be blocked
      const blockedRes = createMockResponse();
      middleware(req, blockedRes, createMockNext());
      expect(blockedRes.status).toHaveBeenCalledWith(429);
    });

    test('should include retryAfter in response', () => {
      const middleware = rateLimit({ max: 1, windowMs: 60000 });
      req.userId = 'rate-test-user-5';

      // First request passes
      middleware(req, res, next);

      // Second request blocked
      const blockedRes = createMockResponse();
      middleware(req, blockedRes, createMockNext());

      expect(blockedRes._json.retryAfter).toBeDefined();
      expect(typeof blockedRes._json.retryAfter).toBe('number');
    });
  });
});
