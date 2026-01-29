/**
 * Test Data Fixtures
 *
 * Provides consistent test data for use across test files.
 */

// Test Users
const testUsers = {
  admin: {
    id: 'admin-user-001',
    email: 'admin@example.com',
    role: 'admin',
    created_at: '2024-01-01T00:00:00Z'
  },
  regularUser: {
    id: 'regular-user-001',
    email: 'user@example.com',
    role: 'user',
    created_at: '2024-01-01T00:00:00Z'
  },
  viewer: {
    id: 'viewer-user-001',
    email: 'viewer@example.com',
    role: 'viewer',
    created_at: '2024-01-01T00:00:00Z'
  }
};

// Test Agents
const testAgents = {
  systemAgent: {
    id: 'system-agent-001',
    name: 'System Assistant',
    description: 'A system-level agent',
    system_prompt: 'You are a helpful assistant.',
    model: 'claude-sonnet-4-20250514',
    is_system: true,
    is_active: true,
    user_id: null,
    category: 'general',
    department: 'operations',
    created_at: '2024-01-01T00:00:00Z'
  },
  userAgent: {
    id: 'user-agent-001',
    name: 'My Custom Agent',
    description: 'A user-created agent',
    system_prompt: 'You are a custom assistant.',
    model: 'gpt-4o',
    is_system: false,
    is_active: true,
    user_id: 'regular-user-001',
    category: 'custom',
    department: null,
    created_at: '2024-01-01T00:00:00Z'
  },
  inactiveAgent: {
    id: 'inactive-agent-001',
    name: 'Disabled Agent',
    description: 'An inactive agent',
    system_prompt: 'You are inactive.',
    model: 'claude-sonnet-4-20250514',
    is_system: false,
    is_active: false,
    user_id: 'regular-user-001',
    category: 'custom',
    department: null,
    created_at: '2024-01-01T00:00:00Z'
  }
};

// Test Context Assets
const testContextAssets = {
  voiceDNA: {
    id: 'asset-voice-001',
    name: 'Voice DNA',
    asset_type: 'voice_dna',
    description: 'Brand voice guidelines',
    content_text: 'Write in a professional yet approachable tone. Use active voice. Avoid jargon.',
    content_json: null,
    version: 1,
    usage_count: 100,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z'
  },
  companyInfo: {
    id: 'asset-company-001',
    name: 'Company Information',
    asset_type: 'company_info',
    description: 'About the company',
    content_text: null,
    content_json: {
      name: 'Acme Corp',
      industry: 'Technology',
      founded: 2020,
      mission: 'To make the world better through AI.'
    },
    version: 2,
    usage_count: 50,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z'
  },
  largeDocument: {
    id: 'asset-doc-001',
    name: 'Large Documentation',
    asset_type: 'documentation',
    description: 'Extensive documentation',
    content_text: 'Lorem ipsum '.repeat(5000), // ~60k chars
    content_json: null,
    version: 1,
    usage_count: 10,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z'
  }
};

// Test Context Mappings
const testContextMappings = {
  alwaysInject: {
    id: 'mapping-001',
    agent_id: 'system-agent-001',
    asset_id: 'asset-voice-001',
    injection_mode: 'always',
    priority: 100,
    max_tokens: null,
    trigger_keywords: null,
    trigger_regex: null,
    is_active: true,
    context_assets: testContextAssets.voiceDNA
  },
  conditionalInject: {
    id: 'mapping-002',
    agent_id: 'system-agent-001',
    asset_id: 'asset-company-001',
    injection_mode: 'conditional',
    priority: 50,
    max_tokens: 1000,
    trigger_keywords: ['company', 'about us', 'who are you'],
    trigger_regex: null,
    is_active: true,
    context_assets: testContextAssets.companyInfo
  },
  onDemandInject: {
    id: 'mapping-003',
    agent_id: 'system-agent-001',
    asset_id: 'asset-doc-001',
    injection_mode: 'on_demand',
    priority: 25,
    max_tokens: 2000,
    trigger_keywords: null,
    trigger_regex: null,
    is_active: true,
    context_assets: testContextAssets.largeDocument
  },
  regexTrigger: {
    id: 'mapping-004',
    agent_id: 'system-agent-001',
    asset_id: 'asset-company-001',
    injection_mode: 'conditional',
    priority: 75,
    max_tokens: null,
    trigger_keywords: null,
    trigger_regex: 'price|pricing|cost|how much',
    is_active: true,
    context_assets: testContextAssets.companyInfo
  }
};

// JWT Tokens for testing
const testTokens = {
  validToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJyZWd1bGFyLXVzZXItMDAxIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6OTk5OTk5OTk5OX0.mock',
  adminToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbi11c2VyLTAwMSIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6OTk5OTk5OTk5OX0.mock',
  expiredToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTAwMSIsImV4cCI6MTAwMDAwMDAwMH0.expired',
  malformedToken: 'not-a-valid-jwt-token'
};

// HTTP Request/Response helpers
const createMockRequest = (overrides = {}) => ({
  headers: {},
  body: {},
  params: {},
  query: {},
  path: '/api/test',
  method: 'GET',
  ip: '127.0.0.1',
  supabase: null,
  userId: null,
  userRole: null,
  isAnonymous: true,
  ...overrides
});

const createMockResponse = () => {
  const res = {
    statusCode: 200,
    _json: null,
    _redirectUrl: null,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockImplementation((data) => {
      res._json = data;
      return res;
    }),
    send: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockImplementation((url) => {
      res._redirectUrl = url;
      return res;
    }),
    set: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis()
  };
  res.status.mockImplementation((code) => {
    res.statusCode = code;
    return res;
  });
  return res;
};

const createMockNext = () => jest.fn();

// Test Integration Providers
const testProviders = {
  google: {
    id: 'provider-google-001',
    slug: 'google',
    name: 'Google Workspace',
    category: 'productivity',
    auth_type: 'oauth2',
    addon_category: 'productivity',
    base_monthly_price: 99.00,
    capabilities: { entities: ['emails', 'files', 'events'], operations: ['read', 'write'], features: ['oauth'] },
    status: 'active'
  },
  salesforce: {
    id: 'provider-sf-001',
    slug: 'salesforce',
    name: 'Salesforce',
    category: 'crm',
    auth_type: 'oauth2',
    addon_category: 'client_system',
    base_monthly_price: 299.00,
    capabilities: { entities: ['contacts', 'accounts'], operations: ['read', 'write', 'sync'], features: ['oauth'] },
    status: 'active'
  }
};

// Test User Integrations
const testIntegrations = {
  googleConnected: {
    id: 'user-int-001',
    user_id: 'regular-user-001',
    provider_id: 'provider-google-001',
    org_id: 'org-001',
    external_email: 'user@gmail.com',
    status: 'active',
    last_sync_at: '2026-01-15T10:00:00Z',
    error_count: 0,
    token_expires_at: new Date(Date.now() + 3600000).toISOString(),
    integration_providers: testProviders.google
  }
};

module.exports = {
  testUsers,
  testAgents,
  testContextAssets,
  testContextMappings,
  testTokens,
  testProviders,
  testIntegrations,
  createMockRequest,
  createMockResponse,
  createMockNext
};
