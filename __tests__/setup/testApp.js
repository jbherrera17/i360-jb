/**
 * Test App Helper
 *
 * Creates an Express app configured for integration testing.
 * Uses mock Supabase and skips external service initialization.
 */

const express = require('express');
const { createMockSupabase } = require('./mockSupabase');

/**
 * Simple cookie parser middleware for tests
 */
function parseCookies(req, res, next) {
  const cookieHeader = req.headers.cookie;
  req.cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      req.cookies[key] = value;
    });
  }
  next();
}

/**
 * Create a test Express app with routes
 * @param {object} options - Configuration options
 * @param {object} options.mockSupabase - Custom mock Supabase client (optional)
 * @param {string[]} options.routes - Routes to include (e.g., ['agents', 'auth'])
 * @param {object} options.middleware - Custom middleware to add
 * @returns {object} - { app, mockSupabase }
 */
function createTestApp(options = {}) {
  const app = express();
  const mockSupabase = options.mockSupabase || createMockSupabase();

  // Basic middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(parseCookies);

  // Inject mock Supabase into request
  app.use((req, res, next) => {
    req.supabase = mockSupabase;

    // Set auth state from options OR from cookie if present
    // This simulates the real auth middleware behavior
    if (options.userId) {
      // Explicit userId passed in options takes precedence.
      // isAnonymous only flips to true if the caller explicitly sets it.
      req.userId = options.userId;
      req.userRole = options.userRole || null;
      req.isAnonymous = options.isAnonymous === true;
    } else if (options.anonymous === true || options.userId === null) {
      // Explicit anonymous opt-in (options.anonymous: true, or userId: null)
      req.userId = null;
      req.userRole = null;
      req.isAnonymous = true;
    } else if (req.cookies && req.cookies.auth_token) {
      // Cookie present - simulate authenticated user
      req.userId = 'test-user-123';
      req.userRole = 'user';
      req.isAnonymous = false;
    } else {
      // Phase 81/82: routes require auth by default. Provide a test user
      // unless the caller explicitly opts into anonymous via options.anonymous.
      req.userId = 'test-user-001';
      req.userRole = options.userRole || 'user';
      req.isAnonymous = false;
    }

    // Phase 82: supply an org context for authenticated tests so
    // requireOrgContext middleware (which reads x-org-id header OR req.orgId)
    // has something to validate against. Tests can override by setting
    // options.orgId or by sending their own x-org-id header.
    if (req.userId && !req.headers['x-org-id']) {
      req.orgId = options.orgId || 'test-org-001';
    }

    next();
  });

  // Add custom middleware if provided
  if (options.middleware) {
    for (const mw of options.middleware) {
      app.use(mw);
    }
  }

  // Load requested routes
  const routes = options.routes || [];

  if (routes.includes('agents')) {
    const agentsRoutes = require('../../server/routes/agents');
    app.use('/api/agents', agentsRoutes(mockSupabase));
  }

  if (routes.includes('auth')) {
    const authRoutes = require('../../server/routes/auth');
    app.use('/api/auth', authRoutes(mockSupabase));
  }

  if (routes.includes('context')) {
    // Context routes use req.supabase pattern (already injected via middleware)
    const contextRoutes = require('../../server/routes/context');
    app.use('/api/context', contextRoutes);
  }

  if (routes.includes('chat')) {
    // Phase 80+: chat routes are now a factory — pass mockSupabase.
    const chatRoutes = require('../../server/routes/chat');
    app.use('/api/chat', chatRoutes(mockSupabase));
  }

  if (routes.includes('actions')) {
    const actionsRoutes = require('../../server/routes/actions');
    app.use('/api/actions', actionsRoutes(mockSupabase));
  }

  if (routes.includes('parthenon')) {
    const parthenonRoutes = require('../../server/routes/parthenon');
    app.use('/api/parthenon', parthenonRoutes(mockSupabase));
  }

  if (routes.includes('health')) {
    const healthRoutes = require('../../server/routes/health');
    app.use('/api/health', healthRoutes);
  }

  if (routes.includes('skills')) {
    const skillsRoutes = require('../../server/routes/skills');
    app.use('/api/skills', skillsRoutes(mockSupabase));
  }

  if (routes.includes('workflows')) {
    // Phase 82+: workflows routes are now a factory — pass mockSupabase.
    const workflowsRoutes = require('../../server/routes/workflows');
    app.use('/api/workflows', workflowsRoutes(mockSupabase));
  }

  if (routes.includes('bugs')) {
    // Bugs routes use module.exports = router pattern (no factory)
    const bugsRoutes = require('../../server/routes/bugs');
    app.use('/api/bugs', bugsRoutes);
  }

  if (routes.includes('conversations')) {
    // Conversations routes use module.exports = router pattern (no factory)
    const conversationsRoutes = require('../../server/routes/conversations');
    app.use('/api/conversations', conversationsRoutes);
  }

  if (routes.includes('organizations')) {
    const organizationsRoutes = require('../../server/routes/organizations');
    app.use('/api/organizations', organizationsRoutes(mockSupabase));
  }

  if (routes.includes('org-members')) {
    const orgMembersRoutes = require('../../server/routes/org-members');
    app.use('/api/org-members', orgMembersRoutes(mockSupabase));
  }

  if (routes.includes('clients')) {
    const clientsRoutes = require('../../server/routes/clients');
    app.use('/api/clients', clientsRoutes(mockSupabase));
  }

  if (routes.includes('org-customization')) {
    const orgCustomizationRoutes = require('../../server/routes/orgCustomization');
    app.use('/api/org-customization', orgCustomizationRoutes(mockSupabase));
  }

  if (routes.includes('client-portal')) {
    const clientPortalRoutes = require('../../server/routes/clientPortal');
    app.use('/api/client-portal', clientPortalRoutes(mockSupabase));
  }

  if (routes.includes('analytics')) {
    const agencyAnalyticsRoutes = require('../../server/routes/agencyAnalytics');
    app.use('/api/analytics', agencyAnalyticsRoutes(mockSupabase));
  }

  if (routes.includes('integrations')) {
    const integrationsRoutes = require('../../server/routes/integrations');
    app.use('/api/integrations', integrationsRoutes(mockSupabase));
  }

  if (routes.includes('webhooks')) {
    const webhooksRoutes = require('../../server/routes/webhooks');
    app.use('/api/webhooks', webhooksRoutes(mockSupabase));
  }

  if (routes.includes('soul-config')) {
    const soulConfigRoutes = require('../../server/routes/soulConfig');
    app.use('/api/soul-config', soulConfigRoutes(mockSupabase));
  }

  if (routes.includes('platform')) {
    const platformRoutes = require('../../server/routes/platform');
    app.use('/api/platform', platformRoutes(mockSupabase));
  }

  if (routes.includes('modules')) {
    const modulesRoutes = require('../../server/routes/modules');
    app.use('/api/modules', modulesRoutes(mockSupabase));
  }

  if (routes.includes('artifacts')) {
    const artifactsRoutes = require('../../server/routes/artifacts');
    app.use('/api/artifacts', artifactsRoutes(mockSupabase));
  }

  if (routes.includes('support')) {
    const supportRoutes = require('../../server/routes/support');
    const supportActionsRoutes = require('../../server/routes/supportActions');
    app.use('/api/support/conversations', supportRoutes(mockSupabase));
    app.use('/api/support/actions', supportActionsRoutes(mockSupabase));
  }

  // Error handler
  app.use((err, req, res, next) => {
    console.error('Test app error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  });

  return { app, mockSupabase };
}

/**
 * Create authenticated test app
 * @param {object} options - Same as createTestApp, plus auth info
 * @param {string} options.userId - User ID to set
 * @param {string} options.userRole - User role ('user', 'admin', 'viewer')
 */
function createAuthenticatedTestApp(options = {}) {
  return createTestApp({
    ...options,
    userId: options.userId || 'test-user-001',
    userRole: options.userRole || 'user',
    isAnonymous: false
  });
}

/**
 * Create admin test app
 */
function createAdminTestApp(options = {}) {
  return createAuthenticatedTestApp({
    ...options,
    userId: options.userId || 'admin-user-001',
    userRole: 'admin'
  });
}

/**
 * Helper to setup mock Supabase responses for common patterns
 */
const mockResponses = {
  /**
   * Setup agent list response
   */
  agentList: (mockSupabase, agents = []) => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'agent_summary' || table === 'agents') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({
            data: agents,
            error: null,
            count: agents.length
          })
        };
      }
      return createMockSupabase().from(table);
    });
  },

  /**
   * Setup single agent response
   */
  singleAgent: (mockSupabase, agent, mappings = []) => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'agents') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: agent,
            error: null
          })
        };
      }
      if (table === 'agent_context_mappings') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: mappings,
            error: null
          })
        };
      }
      return createMockSupabase().from(table);
    });
  },

  /**
   * Setup agent creation response
   */
  agentCreate: (mockSupabase, createdAgent) => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'agents') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: createdAgent,
            error: null
          })
        };
      }
      return createMockSupabase().from(table);
    });
  },

  /**
   * Setup database error response
   */
  databaseError: (mockSupabase, errorMessage = 'Database error') => {
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: errorMessage }
      }),
      range: jest.fn().mockResolvedValue({
        data: null,
        error: { message: errorMessage }
      })
    }));
  },

  /**
   * Setup auth responses
   */
  authSuccess: (mockSupabase, user, session) => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user, session },
      error: null
    });
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: user.id,
              email: user.email,
              display_name: user.email.split('@')[0],
              role: 'user',
              preferences: {}
            },
            error: null
          })
        };
      }
      return createMockSupabase().from(table);
    });
  },

  authFailure: (mockSupabase, errorMessage = 'Invalid credentials') => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: errorMessage }
    });
  },

  /**
   * Setup soul configuration list response
   */
  soulConfigList: (mockSupabase, configs = []) => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'soul_configurations') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: configs,
            error: null
          })
        };
      }
      return createMockSupabase().from(table);
    });
  },

  /**
   * Setup single soul configuration response
   */
  singleSoulConfig: (mockSupabase, config) => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'soul_configurations') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: config,
            error: null
          })
        };
      }
      return createMockSupabase().from(table);
    });
  },

  /**
   * Setup ethical lenses response
   */
  ethicalLenses: (mockSupabase, lenses = []) => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'ethical_lenses') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: lenses,
            error: null
          })
        };
      }
      return createMockSupabase().from(table);
    });
  },

  /**
   * Setup module access check (RPC)
   */
  moduleAccessAllowed: (mockSupabase, allowed = true) => {
    mockSupabase.rpc.mockImplementation((funcName, params) => {
      if (funcName === 'can_access_module') {
        return Promise.resolve({ data: allowed, error: null });
      }
      if (funcName === 'is_platform_admin') {
        return Promise.resolve({ data: false, error: null });
      }
      if (funcName === 'check_org_limits') {
        return Promise.resolve({
          data: [{ within_limits: true, current_count: 5, max_allowed: 25, usage_percent: 20 }],
          error: null
        });
      }
      return Promise.resolve({ data: null, error: null });
    });
  },

  /**
   * Setup resource limit check (RPC)
   */
  resourceLimitCheck: (mockSupabase, withinLimits = true, current = 5, max = 25) => {
    mockSupabase.rpc.mockImplementation((funcName) => {
      if (funcName === 'check_org_limits') {
        return Promise.resolve({
          data: [{
            within_limits: withinLimits,
            current_count: current,
            max_allowed: max,
            usage_percent: Math.round((current / max) * 100)
          }],
          error: null
        });
      }
      return Promise.resolve({ data: null, error: null });
    });
  },

  /**
   * Setup platform admin check
   */
  platformAdminCheck: (mockSupabase, isAdmin = true, role = 'super_admin') => {
    mockSupabase.rpc.mockImplementation((funcName) => {
      if (funcName === 'is_platform_admin') {
        return Promise.resolve({ data: isAdmin, error: null });
      }
      if (funcName === 'get_platform_admin_role') {
        return Promise.resolve({ data: role, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
  }
};

module.exports = {
  createTestApp,
  createAuthenticatedTestApp,
  createAdminTestApp,
  mockResponses
};
