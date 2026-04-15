/**
 * Mock Supabase Client
 *
 * Provides a fully mocked Supabase client for unit tests.
 * Supports chainable query methods and customizable responses.
 */

/**
 * Create a chainable query builder mock
 * @param {object} options - Configuration options
 * @param {*} options.data - Data to return
 * @param {object|null} options.error - Error to return
 */
function createQueryBuilder(options = {}) {
  const { data = null, error = null } = options;

  const builder = {
    // Storage for query state
    _table: null,
    _filters: [],
    _selects: [],
    _orderBy: [],
    _limit: null,
    _single: false,

    // Query methods - all return `this` for chaining
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),

    // Terminal methods - return the result
    single: jest.fn().mockResolvedValue({ data, error }),
    maybeSingle: jest.fn().mockResolvedValue({ data, error }),

    // Make the builder thenable (so await works directly)
    then: function(resolve, reject) {
      return Promise.resolve({ data, error }).then(resolve, reject);
    }
  };

  return builder;
}

/**
 * Create a mock Supabase client
 * @param {object} overrides - Override specific methods or responses
 */
// Default membership record returned for organization_members queries so that
// requireOrgContext middleware validation passes in tests unless a test opts out.
const DEFAULT_TEST_MEMBERSHIP = {
  role: 'owner',
  business_role: 'executive',
  org_id: 'test-org-001',
  user_id: 'test-user-001',
  status: 'active'
};

// Default "I exist and I belong to your org" record for per-resource
// ownership checks (e.g., agents.js verifyAgentOrgOwnership). Tests that
// need "not found" or "wrong org" behavior must explicitly mock these.
const DEFAULT_TEST_RESOURCE_OWNERSHIP = {
  id: 'default-test-resource',
  org_id: 'test-org-001'
};

// Tables for which we return a default "exists and belongs to test org"
// record so that Phase 82 per-resource ownership checks pass by default.
const OWNERSHIP_DEFAULT_TABLES = new Set([
  'agents',
  'workflows',
  'departments',
  'processes',
  'okrs',
  'actions',
  'skills',
  'clients',
  'conversations'
]);

// Builder that satisfies per-resource ownership checks without breaking
// list-style queries. `maybeSingle`/`single` return the ownership record,
// but plain `await` on a chain (used by list queries) resolves to an
// empty array so the tests that check `data.length`/`filter` behave.
function createOwnershipQueryBuilder() {
  const builder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: DEFAULT_TEST_RESOURCE_OWNERSHIP, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: DEFAULT_TEST_RESOURCE_OWNERSHIP, error: null }),
    // list queries: resolve to empty array so tests' `.filter`/`.map` don't crash
    then: function(resolve, reject) {
      return Promise.resolve({ data: [], error: null, count: 0 }).then(resolve, reject);
    }
  };
  return builder;
}

function createMockSupabase(overrides = {}) {
  const defaultQueryBuilder = createQueryBuilder();
  const membershipQueryBuilder = createQueryBuilder({ data: DEFAULT_TEST_MEMBERSHIP, error: null });

  const mockClient = {
    // Database methods
    from: jest.fn((table) => {
      if (overrides.tables && overrides.tables[table]) {
        return createQueryBuilder(overrides.tables[table]);
      }
      // Auto-satisfy the Phase 82 requireOrgContext membership check so tests
      // that don't explicitly mock organization_members still authorize.
      if (table === 'organization_members') {
        return membershipQueryBuilder;
      }
      // Auto-satisfy per-resource ownership checks (verifyAgentOrgOwnership,
      // etc.) by returning a record that exists and is owned by the test org.
      if (OWNERSHIP_DEFAULT_TABLES.has(table)) {
        return createOwnershipQueryBuilder();
      }
      return defaultQueryBuilder;
    }),

    // RPC calls — default-permissive so Phase 81/82 gating middleware
    // (can_access_module, check_org_limits, is_platform_admin) let tests
    // through. Individual tests can override via mockSupabase.rpc.mockImplementation.
    rpc: jest.fn((funcName) => {
      if (funcName === 'can_access_module') {
        return Promise.resolve({ data: true, error: null });
      }
      if (funcName === 'is_platform_admin') {
        return Promise.resolve({ data: false, error: null });
      }
      if (funcName === 'get_platform_admin_role') {
        return Promise.resolve({ data: null, error: null });
      }
      if (funcName === 'check_org_limits') {
        return Promise.resolve({
          data: [{ within_limits: true, current_count: 0, max_allowed: 999, usage_percent: 0 }],
          error: null
        });
      }
      return Promise.resolve({ data: null, error: null });
    }),

    // Auth methods
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null
      }),
      signUp: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null
      }),
      refreshSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null
      }),
      resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
      updateUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null
      }),
      setSession: jest.fn().mockResolvedValue({
        data: { session: null, user: null },
        error: null
      }),
      admin: {
        createUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        deleteUser: jest.fn().mockResolvedValue({ error: null }),
        listUsers: jest.fn().mockResolvedValue({ data: { users: [] }, error: null })
      },
      ...overrides.auth
    },

    // Storage methods
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: null, error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: null }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file.jpg' } })
      }),
      ...overrides.storage
    },

    // Channel for realtime (basic mock)
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn().mockResolvedValue('ok')
    }),

    ...overrides
  };

  return mockClient;
}

/**
 * Create a mock user object
 */
function createMockUser(overrides = {}) {
  return {
    id: 'test-user-123',
    email: 'test@example.com',
    role: 'user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create a mock session object
 */
function createMockSession(user = null) {
  const mockUser = user || createMockUser();
  return {
    access_token: 'mock-access-token-12345',
    refresh_token: 'mock-refresh-token-12345',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: mockUser
  };
}

module.exports = {
  createMockSupabase,
  createQueryBuilder,
  createMockUser,
  createMockSession,
  DEFAULT_TEST_MEMBERSHIP
};
