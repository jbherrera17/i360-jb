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

// ============================================
// PHASE 54 - Soul Configuration Test Data
// ============================================

// Test Organizations for multi-tenant testing
const testOrganizations = {
  acmeCorp: {
    id: 'test-org-acme-001',
    name: 'Acme Corporation',
    slug: 'acme-corp',
    org_type: 'standard',
    subscription_tier: 'tier-business-001',
    settings: { industry: 'Manufacturing', size: 'mid-market' },
    created_by: 'test-acme-owner-001',
    created_at: '2024-01-01T00:00:00Z'
  },
  techStartup: {
    id: 'test-org-startup-001',
    name: 'TechStartup Inc',
    slug: 'tech-startup',
    org_type: 'standard',
    subscription_tier: 'tier-starter-001',
    settings: { industry: 'Technology', size: 'startup' },
    created_by: 'test-startup-owner-001',
    created_at: '2024-01-01T00:00:00Z'
  },
  creativeAgency: {
    id: 'test-org-agency-001',
    name: 'Creative Agency Partners',
    slug: 'creative-agency',
    org_type: 'agency',
    subscription_tier: 'tier-agency-001',
    settings: { industry: 'Marketing', size: 'agency', white_label_enabled: true },
    created_by: 'test-agency-owner-001',
    created_at: '2024-01-01T00:00:00Z'
  }
};

// Test Subscription Tiers
const testSubscriptionTiers = {
  starter: {
    id: 'tier-starter-001',
    name: 'Starter',
    slug: 'starter',
    max_members: 3,
    max_clients: 0,
    max_agents: 5,
    max_workflows: 3,
    features: { basic_modules: true, sso: false, white_label: false },
    is_active: true
  },
  business: {
    id: 'tier-business-001',
    name: 'Business',
    slug: 'business',
    max_members: 10,
    max_clients: 0,
    max_agents: 25,
    max_workflows: 15,
    features: { basic_modules: true, align120: true, research_studio: true, sso: false },
    is_active: true
  },
  agency: {
    id: 'tier-agency-001',
    name: 'Agency',
    slug: 'agency',
    max_members: 50,
    max_clients: 100,
    max_agents: 200,
    max_workflows: 100,
    features: { basic_modules: true, align120: true, sso: true, white_label: true, client_portal: true },
    is_active: true
  }
};

// Test Clients (for Agency tier)
const testClients = {
  localBakery: {
    id: 'test-client-bakery-001',
    org_id: 'test-org-agency-001',
    name: 'LocalBakery',
    slug: 'local-bakery',
    industry: 'Food & Beverage',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z'
  },
  fitnessGym: {
    id: 'test-client-gym-001',
    org_id: 'test-org-agency-001',
    name: 'FitnessGym',
    slug: 'fitness-gym',
    industry: 'Health & Fitness',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z'
  }
};

// Test Departments
const testDepartments = {
  marketing: {
    id: 'test-dept-marketing-001',
    org_id: 'test-org-acme-001',
    name: 'Marketing',
    slug: 'marketing',
    description: 'Brand and demand generation',
    created_at: '2024-01-01T00:00:00Z'
  },
  sales: {
    id: 'test-dept-sales-001',
    org_id: 'test-org-acme-001',
    name: 'Sales',
    slug: 'sales',
    description: 'Revenue and client relationships',
    created_at: '2024-01-01T00:00:00Z'
  }
};

// Test Soul Configurations
const testSoulConfigurations = {
  platform: {
    id: 'test-soul-platform-001',
    scope_type: 'platform',
    org_id: null,
    department_id: null,
    client_id: null,
    agent_id: null,
    identity: {
      name: 'Higgins',
      role: 'Chief of Staff AI',
      archetype: 'Trusted Butler',
      temperament: 'professional'
    },
    values: [
      { name: 'Integrity', meaning: 'Doing what is right even when no one is watching', priority: 1, non_negotiable: true },
      { name: 'Transparency', meaning: 'Being open about reasoning and limitations', priority: 2, non_negotiable: true },
      { name: 'Privacy', meaning: 'Protecting sensitive information', priority: 3, non_negotiable: true }
    ],
    bright_lines: [
      { name: 'Human Safety First', description: 'Never provide information designed to facilitate harm to humans', level: 'platform', test_question: 'Could this cause harm?' },
      { name: 'No Deception', description: 'Always identify as AI when asked', level: 'platform', test_question: 'Am I being honest?' },
      { name: 'Privacy Protection', description: 'Never share personal data inappropriately', level: 'platform', test_question: 'Is data handling appropriate?' }
    ],
    guardrails: {
      communication: ['Avoid jargon', 'Match user communication style'],
      decision: ['Recommend human review for significant decisions'],
      scope: ['Stay within role boundaries'],
      emotional: ['Recognize signs of distress']
    },
    voice: {
      tone: ['professional', 'helpful', 'concise'],
      avoid: ['jargon', 'buzzwords'],
      personality_temperature: 0.5
    },
    domain: {},
    stakeholders: [],
    escalation: {},
    methodology: {},
    is_draft: false,
    is_active: true,
    completeness_score: 85,
    version: 1,
    created_by: 'test-platform-admin-001',
    created_at: '2024-01-01T00:00:00Z'
  },
  acmeOrg: {
    id: 'test-soul-acme-001',
    scope_type: 'organization',
    org_id: 'test-org-acme-001',
    department_id: null,
    client_id: null,
    agent_id: null,
    identity: {
      name: 'Ace',
      role: 'Acme Strategic Partner',
      archetype: 'Trusted Advisor',
      temperament: 'warm_professional'
    },
    values: [
      { name: 'Quality First', meaning: 'Never compromise on product quality', priority: 1, non_negotiable: true, behaviors: ['Verify specifications before commitment'] },
      { name: 'Customer Success', meaning: 'Our success is measured by customer outcomes', priority: 2, non_negotiable: false, behaviors: ['Follow up on deliveries'] },
      { name: 'Innovation', meaning: 'Continuously improve our processes', priority: 3, non_negotiable: false }
    ],
    bright_lines: [
      { name: 'No Competitor Sharing', description: 'Never share proprietary information with competitors', level: 'organization', test_question: 'Would this benefit a competitor?' },
      { name: 'Regulatory Compliance', description: 'Always comply with manufacturing regulations', level: 'organization', test_question: 'Is this compliant?' }
    ],
    guardrails: {
      communication: ['Use manufacturing terminology appropriately'],
      decision: ['Consult engineering for technical decisions']
    },
    voice: {
      tone: ['professional', 'precise', 'reliable'],
      avoid: ['marketing speak', 'vague commitments'],
      personality_temperature: 0.4
    },
    domain: {
      industry: 'Manufacturing',
      key_terms: [{ term: 'SKU', definition: 'Stock Keeping Unit' }],
      products: ['Industrial Components', 'Custom Machinery']
    },
    stakeholders: [],
    escalation: {},
    methodology: {},
    is_draft: false,
    is_active: true,
    completeness_score: 78,
    version: 1,
    created_by: 'test-acme-owner-001',
    created_at: '2024-01-01T00:00:00Z'
  },
  agencyOrg: {
    id: 'test-soul-agency-001',
    scope_type: 'organization',
    org_id: 'test-org-agency-001',
    department_id: null,
    client_id: null,
    agent_id: null,
    identity: {
      name: 'Creative Assistant',
      role: 'Agency Brand Partner',
      archetype: 'Creative Director'
    },
    values: [
      { name: 'Creative Excellence', meaning: 'Deliver work that inspires', priority: 1, non_negotiable: true },
      { name: 'Client Partnership', meaning: 'Treat client goals as our own', priority: 2, non_negotiable: true }
    ],
    bright_lines: [
      { name: 'Client Confidentiality', description: 'Never share client work between clients', level: 'organization', test_question: 'Would sharing compromise trust?' }
    ],
    guardrails: {},
    voice: {
      tone: ['creative', 'strategic', 'client-focused'],
      personality_temperature: 0.7
    },
    domain: { industry: 'Marketing & Advertising' },
    stakeholders: [],
    escalation: {},
    methodology: {},
    is_draft: false,
    is_active: true,
    completeness_score: 72,
    version: 1,
    created_by: 'test-agency-owner-001',
    created_at: '2024-01-01T00:00:00Z'
  },
  bakeryClient: {
    id: 'test-soul-bakery-001',
    scope_type: 'client',
    org_id: 'test-org-agency-001',
    department_id: null,
    client_id: 'test-client-bakery-001',
    agent_id: null,
    identity: {
      name: 'Baker Bot',
      role: 'LocalBakery Brand Voice',
      archetype: 'Friendly Neighbor'
    },
    values: [
      { name: 'Freshness', meaning: 'Everything made fresh daily', priority: 1 },
      { name: 'Community', meaning: 'We are part of the neighborhood', priority: 2 }
    ],
    bright_lines: [],
    guardrails: {},
    voice: {
      tone: ['warm', 'homey', 'welcoming'],
      avoid: ['corporate speak'],
      personality_temperature: 0.8,
      sample_phrases: ['Fresh from our ovens to your table!']
    },
    domain: {
      industry: 'Food & Beverage',
      products: ['Artisan Breads', 'Pastries', 'Custom Cakes']
    },
    stakeholders: [],
    escalation: {},
    methodology: {},
    is_draft: false,
    is_active: true,
    completeness_score: 55,
    version: 1,
    created_by: 'test-agency-owner-001',
    created_at: '2024-01-01T00:00:00Z'
  },
  agentLevel: {
    id: 'test-soul-agent-001',
    scope_type: 'agent',
    org_id: 'test-org-acme-001',
    department_id: null,
    client_id: null,
    agent_id: 'test-agent-acme-001',
    identity: {
      name: 'Ace',
      role: 'Manufacturing Support Specialist',
      archetype: 'Technical Expert'
    },
    values: [],
    bright_lines: [],
    guardrails: {},
    voice: {
      tone: ['technical', 'efficient', 'helpful'],
      personality_temperature: 0.3
    },
    domain: {},
    stakeholders: [],
    escalation: {},
    methodology: {},
    is_draft: false,
    is_active: true,
    completeness_score: 35,
    version: 1,
    created_by: 'test-acme-owner-001',
    created_at: '2024-01-01T00:00:00Z'
  },
  draftConfig: {
    id: 'test-soul-draft-001',
    scope_type: 'organization',
    org_id: 'test-org-startup-001',
    identity: { name: 'Startup Bot' },
    values: [],
    bright_lines: [],
    guardrails: {},
    voice: {},
    domain: {},
    is_draft: true,
    is_active: false,
    completeness_score: 10,
    version: 1,
    created_by: 'test-startup-owner-001',
    created_at: '2024-01-01T00:00:00Z'
  }
};

// Test Ethical Lenses (SCU Framework)
const testEthicalLenses = {
  rights: {
    id: 'lens-rights-001',
    name: 'Rights Lens',
    short_name: 'rights',
    description: 'Focuses on protecting moral rights and human dignity',
    key_question: 'Does this action respect the moral rights of all affected parties?',
    evaluation_criteria: {
      criteria: ['autonomy', 'privacy', 'truth', 'consent', 'harm_avoidance'],
      weight_factors: ['vulnerability', 'power_differential'],
      red_flags: ['paternalism', 'privacy_violations', 'deception']
    },
    is_active: true,
    sort_order: 1
  },
  justice: {
    id: 'lens-justice-001',
    name: 'Justice Lens',
    short_name: 'justice',
    description: 'Ensures fair and equal treatment of all parties',
    key_question: 'Does this action treat people fairly, giving them each what they are due?',
    evaluation_criteria: {
      criteria: ['distributive_justice', 'procedural_fairness', 'equal_treatment'],
      weight_factors: ['historical_context', 'systemic_factors'],
      red_flags: ['favoritism', 'discriminatory_impact']
    },
    is_active: true,
    sort_order: 2
  },
  utilitarian: {
    id: 'lens-utilitarian-001',
    name: 'Utilitarian Lens',
    short_name: 'utilitarian',
    description: 'Maximizes good outcomes for the greatest number',
    key_question: 'Does this action produce the best balance of good over harm?',
    evaluation_criteria: {
      criteria: ['benefit_magnitude', 'stakeholder_scope', 'long_term_consequences'],
      weight_factors: ['certainty', 'reversibility'],
      red_flags: ['ignoring_minorities', 'short_term_focus']
    },
    is_active: true,
    sort_order: 3
  },
  commonGood: {
    id: 'lens-common-good-001',
    name: 'Common Good Lens',
    short_name: 'common_good',
    description: 'Considers the welfare of the community as a whole',
    key_question: 'Does this action contribute to the common good of our community?',
    evaluation_criteria: {
      criteria: ['community_benefit', 'social_systems', 'shared_resources'],
      weight_factors: ['scope_of_community', 'sustainability'],
      red_flags: ['tragedy_of_commons', 'free_rider_problems']
    },
    is_active: true,
    sort_order: 4
  },
  virtue: {
    id: 'lens-virtue-001',
    name: 'Virtue Lens',
    short_name: 'virtue',
    description: 'Evaluates actions against ideal character traits',
    key_question: 'Does this action reflect who we want to be and the virtues we value?',
    evaluation_criteria: {
      criteria: ['honesty', 'courage', 'compassion', 'integrity', 'prudence'],
      weight_factors: ['consistency', 'role_model_effect'],
      red_flags: ['character_compromises', 'hypocrisy']
    },
    is_active: true,
    sort_order: 5
  },
  careEthics: {
    id: 'lens-care-ethics-001',
    name: 'Care Ethics Lens',
    short_name: 'care_ethics',
    description: 'Emphasizes relationships, empathy, and responsibility',
    key_question: 'Does this action show appropriate care for the relationships involved?',
    evaluation_criteria: {
      criteria: ['relationship_preservation', 'empathy', 'responsiveness', 'trust_building'],
      weight_factors: ['dependency', 'relationship_history'],
      red_flags: ['abandonment', 'exploitation_of_trust']
    },
    is_active: true,
    sort_order: 6
  }
};

// Test Ethical Evaluations
const testEthicalEvaluations = {
  mediumStakes: {
    id: 'test-eval-001',
    org_id: 'test-org-acme-001',
    agent_id: 'test-agent-acme-001',
    user_id: 'test-acme-member-001',
    soul_config_id: 'test-soul-acme-001',
    decision_summary: 'Customer requested expedited shipping requiring overtime',
    decision_type: 'recommendation',
    stakes_level: 'medium',
    step_1_issues: { ethical_issues: ['work-life balance'], stakeholders: ['employees', 'customer'] },
    step_3_lens_analysis: { utilitarian: { score: 7 }, care_ethics: { score: 5 } },
    automated: true,
    requires_human_review: false,
    created_at: '2024-01-15T10:00:00Z'
  },
  highStakes: {
    id: 'test-eval-002',
    org_id: 'test-org-acme-001',
    agent_id: 'test-agent-acme-001',
    user_id: 'test-acme-owner-001',
    soul_config_id: 'test-soul-acme-001',
    decision_summary: 'Legal team asking about employee termination process',
    decision_type: 'recommendation',
    stakes_level: 'high',
    step_1_issues: { ethical_issues: ['employee rights', 'fairness'], stakeholders: ['employee', 'company'] },
    step_3_lens_analysis: { rights: { score: 8 }, justice: { score: 9 } },
    automated: true,
    requires_human_review: true,
    created_at: '2024-01-16T10:00:00Z'
  }
};

// Test Bright Line Incidents
const testBrightLineIncidents = {
  nearMiss: {
    id: 'test-incident-001',
    org_id: 'test-org-acme-001',
    soul_config_id: 'test-soul-acme-001',
    bright_line_name: 'No Competitor Sharing',
    bright_line_level: 'organization',
    incident_type: 'near_miss',
    severity: 'medium',
    description: 'Agent almost shared product roadmap with unverified party',
    agent_id: 'test-agent-acme-001',
    reported_by: 'test-acme-member-001',
    status: 'resolved',
    resolved_at: '2024-01-12T14:00:00Z',
    created_at: '2024-01-10T10:00:00Z'
  },
  violation: {
    id: 'test-incident-002',
    org_id: 'test-org-acme-001',
    soul_config_id: 'test-soul-acme-001',
    bright_line_name: 'Regulatory Compliance',
    bright_line_level: 'organization',
    incident_type: 'violation',
    severity: 'high',
    description: 'Documentation not properly filed before shipping',
    agent_id: 'test-agent-acme-001',
    reported_by: 'test-acme-owner-001',
    status: 'open',
    created_at: '2024-01-18T10:00:00Z'
  }
};

// Test Values Alignment Audits
const testValuesAlignmentAudits = {
  acmeAudit: {
    id: 'test-audit-001',
    org_id: 'test-org-acme-001',
    soul_config_id: 'test-soul-acme-001',
    audit_date: '2024-01-08',
    stated_values: [
      { name: 'Quality First', priority: 1 },
      { name: 'Customer Success', priority: 2 }
    ],
    discovered_values: [
      { name: 'Quality', evidence_count: 45 },
      { name: 'Efficiency', evidence_count: 38 },
      { name: 'Customer Focus', evidence_count: 25 }
    ],
    alignment_scores: {
      'Quality First': { stated: 1, discovered: 1, score: 95 },
      'Customer Success': { stated: 2, discovered: 3, score: 78 }
    },
    overall_score: 86.5,
    drift_detected: false,
    drift_details: { missing_values: [], conflicting_values: [], gaps: [] },
    recommendations: [{ issue: 'Minor gap', recommendation: 'Continue monitoring', priority: 'low' }],
    audited_by: 'test-acme-owner-001',
    audit_method: 'automated',
    created_at: '2024-01-08T10:00:00Z'
  }
};

// Test Platform Modules
const testPlatformModules = {
  chat: {
    id: 'module-chat-001',
    name: 'Chat',
    slug: 'chat',
    description: 'AI Chat interface',
    min_tier: 'starter',
    min_business_role: null,
    is_active: true
  },
  soulConfiguration: {
    id: 'module-soul-config-001',
    name: 'Soul Configuration',
    slug: 'soul_configuration',
    description: 'Values and ethics configuration',
    min_tier: 'business',
    min_business_role: 'executive',
    is_active: true
  },
  integrityMetrics: {
    id: 'module-integrity-001',
    name: 'Integrity Metrics',
    slug: 'integrity_metrics',
    description: 'Ethics monitoring dashboard',
    min_tier: 'business',
    min_business_role: 'manager',
    is_active: true
  },
  clientPortal: {
    id: 'module-client-portal-001',
    name: 'Client Portal',
    slug: 'client_portal',
    description: 'Agency client management',
    min_tier: 'agency',
    min_business_role: 'account_manager',
    is_active: true
  }
};

// Helper to create test soul config with overrides
const createTestSoulConfig = (overrides = {}) => ({
  id: `test-soul-${Date.now()}`,
  scope_type: 'organization',
  org_id: 'test-org-acme-001',
  identity: { name: 'Test Bot', role: 'Test Role' },
  values: [],
  bright_lines: [],
  guardrails: {},
  voice: { tone: ['professional'], personality_temperature: 0.5 },
  domain: {},
  stakeholders: [],
  escalation: {},
  methodology: {},
  is_draft: true,
  is_active: false,
  completeness_score: 20,
  version: 1,
  created_by: 'test-acme-owner-001',
  created_at: new Date().toISOString(),
  ...overrides
});

// Helper to create test ethical evaluation
const createTestEthicalEvaluation = (overrides = {}) => ({
  id: `test-eval-${Date.now()}`,
  org_id: 'test-org-acme-001',
  agent_id: 'test-agent-acme-001',
  user_id: 'test-acme-member-001',
  decision_summary: 'Test decision',
  decision_type: 'recommendation',
  stakes_level: 'medium',
  automated: true,
  requires_human_review: false,
  created_at: new Date().toISOString(),
  ...overrides
});

module.exports = {
  // Original exports
  testUsers,
  testAgents,
  testContextAssets,
  testContextMappings,
  testTokens,
  testProviders,
  testIntegrations,
  createMockRequest,
  createMockResponse,
  createMockNext,

  // Phase 54 exports
  testOrganizations,
  testSubscriptionTiers,
  testClients,
  testDepartments,
  testSoulConfigurations,
  testEthicalLenses,
  testEthicalEvaluations,
  testBrightLineIncidents,
  testValuesAlignmentAudits,
  testPlatformModules,
  createTestSoulConfig,
  createTestEthicalEvaluation
};
