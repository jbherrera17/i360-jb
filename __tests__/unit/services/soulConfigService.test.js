/**
 * Soul Configuration Service Unit Tests
 *
 * Tests for:
 * - Configuration hierarchy inheritance
 * - Merging logic (arrays, objects, primitives)
 * - Completeness score calculation
 * - CRUD operations
 * - Version management
 */

// Mock Supabase before importing the service
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn()
};

// Import service after mocking
const soulConfigService = require('../../../server/services/soulConfigService');
const {
  testSoulConfigurations,
  createTestSoulConfig
} = require('../../fixtures/testData');

describe('SoulConfigService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // calculateCompletenessScore Tests
  // ============================================
  describe('calculateCompletenessScore', () => {
    test('should return 0 for empty config', () => {
      const score = soulConfigService.calculateCompletenessScore({});
      expect(score).toBe(0);
    });

    test('should calculate partial score for identity only', () => {
      const config = {
        identity: {
          name: 'Test Bot',
          role: 'Assistant',
          archetype: 'Helper'
        }
      };
      const score = soulConfigService.calculateCompletenessScore(config);
      // Identity is 15% weight, 3/3 fields = 15%
      expect(score).toBe(15);
    });

    test('should calculate score for values with behaviors', () => {
      const config = {
        values: [
          { name: 'Integrity', meaning: 'Be honest', behaviors: ['Tell truth'] },
          { name: 'Trust', meaning: 'Build trust', behaviors: ['Be reliable'] },
          { name: 'Care', meaning: 'Show care', behaviors: ['Listen actively'] }
        ]
      };
      const score = soulConfigService.calculateCompletenessScore(config);
      // Values is 25% weight, 3 values with behaviors = full 25%
      expect(score).toBe(25);
    });

    test('should calculate score for bright_lines', () => {
      const config = {
        bright_lines: [
          { name: 'No Harm', description: 'Never cause harm', level: 'organization' },
          { name: 'No Deception', description: 'Always be honest', level: 'organization' }
        ]
      };
      const score = soulConfigService.calculateCompletenessScore(config);
      // Bright lines is 15% weight, 2 org lines = full 15%
      expect(score).toBe(15);
    });

    test('should calculate score for guardrails', () => {
      const config = {
        guardrails: {
          communication: ['Be clear'],
          decision: ['Consult experts'],
          scope: ['Stay in bounds'],
          emotional: ['Be supportive']
        }
      };
      const score = soulConfigService.calculateCompletenessScore(config);
      // Guardrails is 15% weight, 4/4 categories = full 15%
      expect(score).toBe(15);
    });

    test('should calculate score for voice', () => {
      const config = {
        voice: {
          tone: ['professional', 'helpful'],
          avoid: ['jargon'],
          personality_temperature: 0.5
        }
      };
      const score = soulConfigService.calculateCompletenessScore(config);
      // Voice is 15% weight, 3/3 fields = full 15%
      expect(score).toBe(15);
    });

    test('should calculate full completeness score', () => {
      const config = testSoulConfigurations.platform;
      const score = soulConfigService.calculateCompletenessScore(config);
      // Platform config: identity=15%, values=12.5% (no behaviors), bright_lines=0% (all platform level),
      // guardrails=15%, voice=15%, domain=0% = ~58%
      expect(score).toBeGreaterThanOrEqual(55);
      expect(score).toBeLessThanOrEqual(65);
    });
  });

  // ============================================
  // mergeConfigurations Tests
  // ============================================
  describe('mergeConfigurations', () => {
    test('should return empty config for empty array', () => {
      const result = soulConfigService.mergeConfigurations([]);
      expect(result).toEqual({
        identity: {},
        values: [],
        bright_lines: [],
        guardrails: {},
        voice: {},
        domain: {},
        stakeholders: [],
        escalation: {},
        methodology: {}
      });
    });

    test('should return single config unchanged', () => {
      const config = testSoulConfigurations.platform;
      const result = soulConfigService.mergeConfigurations([config]);

      expect(result.identity).toEqual(config.identity);
      expect(result.values).toEqual(config.values);
    });

    test('should merge identity with later config overriding', () => {
      const platform = {
        identity: { name: 'Higgins', role: 'Butler', temperament: 'formal' }
      };
      const org = {
        identity: { name: 'Ace', role: 'Partner' }
      };

      const result = soulConfigService.mergeConfigurations([platform, org]);

      expect(result.identity.name).toBe('Ace');
      expect(result.identity.role).toBe('Partner');
      expect(result.identity.temperament).toBe('formal'); // inherited from platform
    });

    test('should merge values arrays by name (dedupe)', () => {
      const platform = {
        values: [
          { name: 'Integrity', meaning: 'Platform definition', priority: 1 },
          { name: 'Privacy', meaning: 'Protect data', priority: 2 }
        ]
      };
      const org = {
        values: [
          { name: 'Integrity', meaning: 'Org definition', priority: 1 }, // Override
          { name: 'Quality', meaning: 'High quality', priority: 3 } // New
        ]
      };

      const result = soulConfigService.mergeConfigurations([platform, org]);

      expect(result.values).toHaveLength(3);
      expect(result.values.find(v => v.name === 'Integrity').meaning).toBe('Org definition');
      expect(result.values.find(v => v.name === 'Privacy')).toBeDefined();
      expect(result.values.find(v => v.name === 'Quality')).toBeDefined();
    });

    test('should preserve platform bright_lines (immutable)', () => {
      const platform = {
        bright_lines: [
          { name: 'Human Safety', level: 'platform', description: 'Platform rule' },
          { name: 'No Deception', level: 'platform', description: 'Platform rule' }
        ]
      };
      const org = {
        bright_lines: [
          { name: 'Human Safety', level: 'platform', description: 'Org cannot override' }, // Should NOT override
          { name: 'Confidentiality', level: 'organization', description: 'Org rule' }
        ]
      };

      const result = soulConfigService.mergeConfigurations([platform, org]);

      // Platform lines should be preserved
      const humanSafety = result.bright_lines.find(bl => bl.name === 'Human Safety');
      expect(humanSafety.description).toBe('Platform rule');

      // Org lines should be added
      const confidentiality = result.bright_lines.find(bl => bl.name === 'Confidentiality');
      expect(confidentiality).toBeDefined();
      expect(confidentiality.level).toBe('organization');
    });

    test('should deep merge guardrails objects', () => {
      const platform = {
        guardrails: {
          communication: ['Rule 1'],
          decision: ['Platform decision rule']
        }
      };
      const org = {
        guardrails: {
          communication: ['Rule 2'],
          scope: ['Org scope rule']
        }
      };

      const result = soulConfigService.mergeConfigurations([platform, org]);

      expect(result.guardrails.communication).toContain('Rule 1');
      expect(result.guardrails.communication).toContain('Rule 2');
      expect(result.guardrails.decision).toContain('Platform decision rule');
      expect(result.guardrails.scope).toContain('Org scope rule');
    });

    test('should merge full hierarchy (platform -> org -> agent)', () => {
      const platform = testSoulConfigurations.platform;
      const org = testSoulConfigurations.acmeOrg;
      const agent = testSoulConfigurations.agentLevel;

      const result = soulConfigService.mergeConfigurations([platform, org, agent]);

      // Agent identity should override
      expect(result.identity.role).toBe('Manufacturing Support Specialist');

      // Platform bright lines should be preserved
      const platformLines = result.bright_lines.filter(bl => bl.level === 'platform');
      expect(platformLines.length).toBeGreaterThan(0);

      // Org values should be present
      expect(result.values.some(v => v.name === 'Quality First')).toBe(true);

      // Voice from agent should override
      expect(result.voice.personality_temperature).toBe(0.3);
    });
  });

  // ============================================
  // getSoulConfig Tests
  // ============================================
  describe('getSoulConfig', () => {
    test('should return config when found', async () => {
      const mockConfig = testSoulConfigurations.acmeOrg;

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockConfig, error: null })
      });

      const result = await soulConfigService.getSoulConfig('test-soul-acme-001');

      expect(result).toEqual(mockConfig);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('soul_configurations');
    });

    test('should throw error when not found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      await expect(soulConfigService.getSoulConfig('nonexistent'))
        .rejects.toThrow('Soul configuration not found');
    });

    test('should throw error on database error', async () => {
      const dbError = { message: 'DB error' };
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: dbError })
      });

      await expect(soulConfigService.getSoulConfig('any-id'))
        .rejects.toEqual(dbError);
    });
  });

  // ============================================
  // getSoulConfigByScope Tests
  // ============================================
  describe('getSoulConfigByScope', () => {
    test('should query platform scope correctly', async () => {
      const mockConfig = testSoulConfigurations.platform;

      const mockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockConfig, error: null })
      };
      mockSupabaseClient.from.mockReturnValue(mockBuilder);

      const result = await soulConfigService.getSoulConfigByScope('platform', {});

      expect(result).toEqual(mockConfig);
      expect(mockBuilder.eq).toHaveBeenCalledWith('scope_type', 'platform');
      expect(mockBuilder.eq).toHaveBeenCalledWith('is_active', true);
      expect(mockBuilder.is).toHaveBeenCalledWith('org_id', null);
    });

    test('should query organization scope correctly', async () => {
      const mockConfig = testSoulConfigurations.acmeOrg;

      const mockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockConfig, error: null })
      };
      mockSupabaseClient.from.mockReturnValue(mockBuilder);

      const result = await soulConfigService.getSoulConfigByScope('organization', {
        orgId: 'test-org-acme-001'
      });

      expect(result).toEqual(mockConfig);
      expect(mockBuilder.eq).toHaveBeenCalledWith('scope_type', 'organization');
      expect(mockBuilder.eq).toHaveBeenCalledWith('org_id', 'test-org-acme-001');
    });

    test('should return null when no config exists', async () => {
      const mockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      };
      mockSupabaseClient.from.mockReturnValue(mockBuilder);

      const result = await soulConfigService.getSoulConfigByScope('department', {
        departmentId: 'nonexistent'
      });

      expect(result).toBeNull();
    });
  });

  // ============================================
  // createSoulConfig Tests
  // ============================================
  describe('createSoulConfig', () => {
    test('should create config with correct data', async () => {
      const inputData = {
        scope_type: 'organization',
        org_id: 'test-org-acme-001',
        identity: { name: 'New Bot' },
        values: [{ name: 'Quality', meaning: 'Be excellent' }],
        is_draft: true
      };

      const expectedData = {
        id: 'new-config-id',
        ...inputData,
        version: 1,
        completeness_score: expect.any(Number)
      };

      const insertMock = jest.fn().mockReturnThis();
      const selectMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({ data: expectedData, error: null });

      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
        single: singleMock
      });

      const result = await soulConfigService.createSoulConfig(inputData, 'user-001');

      expect(result).toEqual(expectedData);
      expect(insertMock).toHaveBeenCalled();
    });

    test('should calculate completeness score on creation', async () => {
      const inputData = {
        scope_type: 'organization',
        org_id: 'test-org-acme-001',
        identity: { name: 'Bot', role: 'Helper', archetype: 'Guide' },
        values: [
          { name: 'V1', meaning: 'M1', behaviors: ['B1'] },
          { name: 'V2', meaning: 'M2', behaviors: ['B2'] },
          { name: 'V3', meaning: 'M3', behaviors: ['B3'] }
        ],
        voice: { tone: ['professional'], avoid: ['jargon'], personality_temperature: 0.5 }
      };

      // Test the calculateCompletenessScore function directly
      const score = soulConfigService.calculateCompletenessScore(inputData);

      // Should have calculated a completeness score > 0
      expect(score).toBeGreaterThan(0);
    });
  });

  // ============================================
  // updateSoulConfig Tests
  // ============================================
  describe('updateSoulConfig', () => {
    test('should update config and recalculate completeness', async () => {
      const currentConfig = testSoulConfigurations.acmeOrg;
      const updates = {
        values: [
          { name: 'New Value', meaning: 'New meaning', behaviors: ['New behavior'] }
        ]
      };

      // Mock getSoulConfig
      mockSupabaseClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: currentConfig, error: null })
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ...currentConfig, ...updates },
            error: null
          })
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ error: null })
        });

      const result = await soulConfigService.updateSoulConfig(
        'test-soul-acme-001',
        updates,
        'user-001',
        'Updated values'
      );

      expect(result.values).toEqual(updates.values);
    });
  });

  // ============================================
  // listSoulConfigs Tests
  // ============================================
  describe('listSoulConfigs', () => {
    test('should list configs with filters', async () => {
      const mockConfigs = [
        testSoulConfigurations.acmeOrg,
        testSoulConfigurations.agencyOrg
      ];

      // Create a mock that supports the full chain including conditional eq calls
      const mockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: function(resolve) {
          return Promise.resolve({ data: mockConfigs, error: null }).then(resolve);
        }
      };
      mockSupabaseClient.from.mockReturnValue(mockBuilder);

      const result = await soulConfigService.listSoulConfigs({
        scope_type: 'organization',
        is_active: true
      });

      expect(result).toEqual(mockConfigs);
      expect(mockBuilder.eq).toHaveBeenCalledWith('scope_type', 'organization');
      expect(mockBuilder.eq).toHaveBeenCalledWith('is_active', true);
    });

    test('should return empty array when no configs found', async () => {
      const mockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: function(resolve) {
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
      };
      mockSupabaseClient.from.mockReturnValue(mockBuilder);

      const result = await soulConfigService.listSoulConfigs({});

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // resolveInheritedSoulConfig Tests
  // ============================================
  describe('resolveInheritedSoulConfig', () => {
    test('should return default config when no configs exist', async () => {
      // Mock all scope queries to return null
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      });

      const result = await soulConfigService.resolveInheritedSoulConfig({});

      expect(result.resolved).toBe(true);
      expect(result.sources).toEqual(['default']);
      expect(result.config.identity.name).toBe('Higgins');
    });

    test('should merge platform and org configs', async () => {
      const platformConfig = testSoulConfigurations.platform;
      const orgConfig = testSoulConfigurations.acmeOrg;

      // Setup mock to return different configs for different scopes
      let callCount = 0;
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // Platform query
            return Promise.resolve({ data: platformConfig, error: null });
          } else if (callCount === 2) {
            // Org query
            return Promise.resolve({ data: orgConfig, error: null });
          }
          // No more configs
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        })
      });

      const result = await soulConfigService.resolveInheritedSoulConfig({
        orgId: 'test-org-acme-001'
      });

      expect(result.resolved).toBe(true);
      expect(result.sources.length).toBe(2);

      // Org identity should override platform
      expect(result.config.identity.name).toBe('Ace');

      // Platform bright lines should be preserved
      expect(result.config.bright_lines.some(bl => bl.level === 'platform')).toBe(true);

      // Org values should be present
      expect(result.config.values.some(v => v.name === 'Quality First')).toBe(true);
    });
  });

  // ============================================
  // getVersionHistory Tests
  // ============================================
  describe('getVersionHistory', () => {
    test('should return version history', async () => {
      const mockVersions = [
        { version: 2, change_summary: 'Updated values', changed_at: '2024-02-01' },
        { version: 1, change_summary: 'Initial creation', changed_at: '2024-01-01' }
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockVersions, error: null })
      });

      const result = await soulConfigService.getVersionHistory('test-soul-acme-001');

      expect(result).toEqual(mockVersions);
      expect(result[0].version).toBe(2); // Most recent first
    });
  });

  // ============================================
  // deleteSoulConfig Tests
  // ============================================
  describe('deleteSoulConfig', () => {
    test('should soft delete by deactivating', async () => {
      const updateMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockResolvedValue({ error: null });

      mockSupabaseClient.from.mockReturnValue({
        update: updateMock,
        eq: eqMock
      });

      const result = await soulConfigService.deleteSoulConfig('test-soul-acme-001');

      expect(result).toBe(true);
      expect(updateMock).toHaveBeenCalledWith({ is_active: false, is_draft: true });
    });
  });
});
