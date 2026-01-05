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
function createMockSupabase(overrides = {}) {
  const defaultQueryBuilder = createQueryBuilder();

  const mockClient = {
    // Database methods
    from: jest.fn((table) => {
      if (overrides.tables && overrides.tables[table]) {
        return createQueryBuilder(overrides.tables[table]);
      }
      return defaultQueryBuilder;
    }),

    // RPC calls
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),

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
  createMockSession
};
