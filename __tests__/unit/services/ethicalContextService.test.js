/**
 * Ethical Context Service Unit Tests
 *
 * Tests for:
 * - Stakes level detection
 * - Ethical context assembly
 * - Ethical lens operations
 * - Bright line incident logging
 * - Integrity metrics calculation
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
const ethicalContextService = require('../../../server/services/ethicalContextService');
const {
  testSoulConfigurations,
  testEthicalLenses,
  testEthicalEvaluations,
  testBrightLineIncidents
} = require('../../fixtures/testData');

describe('EthicalContextService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // detectStakesLevel Tests
  // ============================================
  describe('detectStakesLevel', () => {
    test('should return LOW for empty message', () => {
      const result = ethicalContextService.detectStakesLevel('');
      expect(result).toBe('low');
    });

    test('should return LOW for null message', () => {
      const result = ethicalContextService.detectStakesLevel(null);
      expect(result).toBe('low');
    });

    test('should return LOW for casual message', () => {
      const result = ethicalContextService.detectStakesLevel('What time is the meeting?');
      expect(result).toBe('low');
    });

    test('should return CRITICAL for safety keywords', () => {
      const criticalMessages = [
        'This could cause harm to someone',
        'There is an emergency situation',
        'We need to discuss child safety',
        'Is this legal or illegal?',
        'Someone might be in danger'
      ];

      criticalMessages.forEach(msg => {
        const result = ethicalContextService.detectStakesLevel(msg);
        expect(result).toBe('critical');
      });
    });

    test('should return CRITICAL for termination keywords', () => {
      const result = ethicalContextService.detectStakesLevel(
        'We need to fire John from the team'
      );
      expect(result).toBe('critical');
    });

    test('should return HIGH for multiple ethical keywords', () => {
      const result = ethicalContextService.detectStakesLevel(
        'Is this the right and fair approach for the policy decision?'
      );
      expect(result).toBe('high');
    });

    test('should return MEDIUM for single high-stakes keyword', () => {
      // With just one high-stakes keyword, it returns medium (needs 2+ for high)
      const result = ethicalContextService.detectStakesLevel(
        'What are the ethics of this situation?'
      );
      // One 'ethics' keyword = 1 high stakes count, which triggers medium
      expect(result).toBe('medium');
    });

    test('should return MEDIUM for multiple medium-stakes keywords', () => {
      const result = ethicalContextService.detectStakesLevel(
        'Can you recommend a strategy for the team transition?'
      );
      expect(result).toBe('medium');
    });

    test('should return MEDIUM for governance agent context', () => {
      const result = ethicalContextService.detectStakesLevel(
        'What is the weather today?',
        { agentCategory: 'governance' }
      );
      expect(result).toBe('medium');
    });

    test('should return MEDIUM for integrity agent context', () => {
      const result = ethicalContextService.detectStakesLevel(
        'Hello there',
        { agentCategory: 'integrity' }
      );
      expect(result).toBe('medium');
    });

    test('should return MEDIUM for decision context flag', () => {
      const result = ethicalContextService.detectStakesLevel(
        'What do you think?',
        { isDecisionContext: true }
      );
      expect(result).toBe('medium');
    });

    test('should handle case-insensitive matching', () => {
      const result = ethicalContextService.detectStakesLevel(
        'SAFETY is our TOP PRIORITY'
      );
      expect(result).toBe('critical');
    });
  });

  // ============================================
  // assembleEthicalContext Tests
  // ============================================
  describe('assembleEthicalContext', () => {
    const mockSoulConfig = testSoulConfigurations.acmeOrg;

    test('should return minimal context for LOW stakes', async () => {
      const result = await ethicalContextService.assembleEthicalContext('low', mockSoulConfig);

      expect(result.stakesLevel).toBe('low');
      expect(result.instructions).toContain('Respond naturally');
      expect(result.brightLines).toBeDefined();
      expect(result.lenses).toEqual([]);
      expect(result.decisionFramework).toBeNull();
    });

    test('should include values awareness for MEDIUM stakes', async () => {
      const result = await ethicalContextService.assembleEthicalContext('medium', mockSoulConfig);

      expect(result.stakesLevel).toBe('medium');
      expect(result.instructions).toContain('organizational values');
      expect(result.values).toBeDefined();
      expect(result.brightLines).toBeDefined();
    });

    test('should include full SCU framework for HIGH stakes', async () => {
      // Mock the getEthicalLenses call
      const mockLenses = Object.values(testEthicalLenses);
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockLenses, error: null })
      });

      const result = await ethicalContextService.assembleEthicalContext('high', mockSoulConfig);

      expect(result.stakesLevel).toBe('high');
      expect(result.instructions).toContain('HIGH STAKES');
      expect(result.instructions).toContain('SCU Ethics Framework');
      expect(result.lenses.length).toBe(6);
      expect(result.decisionFramework).toBeDefined();
      expect(result.decisionFramework.step1).toContain('ethical issues');
    });

    test('should include guardrails for HIGH stakes', async () => {
      const mockLenses = Object.values(testEthicalLenses);
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockLenses, error: null })
      });

      const configWithGuardrails = {
        ...mockSoulConfig,
        guardrails: {
          communication: ['Be clear', 'Be honest'],
          decision: ['Consult experts']
        }
      };

      const result = await ethicalContextService.assembleEthicalContext('high', configWithGuardrails);

      expect(result.guardrails).toBeDefined();
      expect(result.guardrails.communication).toContain('Be clear');
    });

    test('should handle empty soul config gracefully', async () => {
      const result = await ethicalContextService.assembleEthicalContext('low', {});

      expect(result.stakesLevel).toBe('low');
      expect(result.brightLines).toEqual([]);
    });
  });

  // ============================================
  // formatEthicalContext Tests
  // ============================================
  describe('formatEthicalContext', () => {
    test('should format LOW stakes context', () => {
      const context = {
        stakesLevel: 'low',
        instructions: 'Respond naturally',
        brightLines: ['No Harm', 'No Deception'],
        lenses: []
      };

      const result = ethicalContextService.formatEthicalContext(context);

      expect(result).toContain('# ETHICAL CONTEXT');
      expect(result).toContain('Stakes Level: LOW');
      expect(result).toContain('Respond naturally');
    });

    test('should format HIGH stakes context with lenses', () => {
      const context = {
        stakesLevel: 'high',
        instructions: 'Apply full ethical framework',
        brightLines: [
          { name: 'Human Safety', description: 'Never cause harm' }
        ],
        values: [
          { name: 'Integrity', meaning: 'Be honest' }
        ],
        lenses: [
          { name: 'Rights Lens', shortName: 'rights', keyQuestion: 'Are rights respected?' }
        ],
        decisionFramework: {
          step1: 'Identify issues',
          step2: 'Get facts',
          step3: 'Evaluate',
          step4: 'Choose',
          step5: 'Reflect'
        },
        guardrails: {
          communication: ['Be clear']
        }
      };

      const result = ethicalContextService.formatEthicalContext(context);

      expect(result).toContain('Stakes Level: HIGH');
      expect(result).toContain('## Non-Negotiable Boundaries');
      expect(result).toContain('Human Safety');
      expect(result).toContain('## Core Values');
      expect(result).toContain('Integrity');
      expect(result).toContain('## Ethical Decision Framework');
      expect(result).toContain('## Ethical Lenses to Apply');
      expect(result).toContain('Rights Lens');
      expect(result).toContain('## Behavioral Guardrails');
    });

    test('should handle bright lines as strings', () => {
      const context = {
        stakesLevel: 'low',
        instructions: '',
        brightLines: ['Line 1', 'Line 2'],
        lenses: []
      };

      const result = ethicalContextService.formatEthicalContext(context);

      expect(result).toContain('- Line 1');
      expect(result).toContain('- Line 2');
    });
  });

  // ============================================
  // getEthicalLenses Tests
  // ============================================
  describe('getEthicalLenses', () => {
    test('should return all active lenses', async () => {
      const mockLenses = Object.values(testEthicalLenses);

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockLenses, error: null })
      });

      const result = await ethicalContextService.getEthicalLenses();

      expect(result).toHaveLength(6);
      expect(result[0].short_name).toBe('rights');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('ethical_lenses');
    });

    test('should throw on database error', async () => {
      const dbError = { message: 'DB error' };
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: dbError })
      });

      await expect(ethicalContextService.getEthicalLenses()).rejects.toEqual(dbError);
    });
  });

  // ============================================
  // getEthicalLens Tests
  // ============================================
  describe('getEthicalLens', () => {
    test('should return specific lens by short_name', async () => {
      const mockLens = testEthicalLenses.rights;

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockLens, error: null })
      });

      const result = await ethicalContextService.getEthicalLens('rights');

      expect(result.name).toBe('Rights Lens');
      expect(result.key_question).toContain('moral rights');
    });
  });

  // ============================================
  // logEthicalEvaluation Tests
  // ============================================
  describe('logEthicalEvaluation', () => {
    test('should log evaluation with all fields', async () => {
      const evaluation = {
        conversationId: 'conv-001',
        agentId: 'agent-001',
        userId: 'user-001',
        decisionSummary: 'Test decision',
        decisionType: 'recommendation',
        stakesLevel: 'medium',
        step1Issues: { ethical_issues: ['test'] },
        automated: true,
        requiresHumanReview: false
      };

      const expectedData = {
        id: 'eval-001',
        ...evaluation
      };

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: expectedData, error: null })
      });

      const result = await ethicalContextService.logEthicalEvaluation(evaluation);

      expect(result).toEqual(expectedData);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('ethical_evaluations');
    });

    test('should throw on database error', async () => {
      const errorObj = { message: 'Insert failed' };
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: errorObj })
      });

      await expect(ethicalContextService.logEthicalEvaluation({
        decisionSummary: 'Test'
      })).rejects.toEqual(errorObj);
    });
  });

  // ============================================
  // logBrightLineIncident Tests
  // ============================================
  describe('logBrightLineIncident', () => {
    test('should log incident correctly', async () => {
      const incident = {
        orgId: 'test-org-001',
        brightLineName: 'No Harm',
        brightLineLevel: 'platform',
        incidentType: 'near_miss',
        description: 'Almost crossed a bright line',
        severity: 'medium',
        reportedBy: 'user-001'
      };

      const expectedData = {
        id: 'incident-001',
        ...incident,
        status: 'open'
      };

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: expectedData, error: null })
      });

      const result = await ethicalContextService.logBrightLineIncident(incident);

      expect(result).toEqual(expectedData);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bright_line_incidents');
    });
  });

  // ============================================
  // getBrightLineIncidents Tests
  // ============================================
  describe('getBrightLineIncidents', () => {
    test('should return incidents for org', async () => {
      const mockIncidents = [testBrightLineIncidents.nearMiss, testBrightLineIncidents.violation];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockIncidents, error: null })
      });

      const result = await ethicalContextService.getBrightLineIncidents('test-org-acme-001');

      expect(result).toHaveLength(2);
    });

    test('should filter by incident type', async () => {
      const mockIncidents = [testBrightLineIncidents.nearMiss];

      const mockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: function(resolve) {
          return Promise.resolve({ data: mockIncidents, error: null }).then(resolve);
        }
      };
      mockSupabaseClient.from.mockReturnValue(mockBuilder);

      await ethicalContextService.getBrightLineIncidents('test-org-acme-001', {
        incidentType: 'near_miss'
      });

      expect(mockBuilder.eq).toHaveBeenCalledWith('incident_type', 'near_miss');
    });

    test('should filter by severity', async () => {
      const mockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: function(resolve) {
          return Promise.resolve({ data: [], error: null }).then(resolve);
        }
      };
      mockSupabaseClient.from.mockReturnValue(mockBuilder);

      await ethicalContextService.getBrightLineIncidents('test-org-acme-001', {
        severity: 'high'
      });

      expect(mockBuilder.eq).toHaveBeenCalledWith('severity', 'high');
    });

    test('should filter unresolved incidents', async () => {
      const mockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: function(resolve) {
          return Promise.resolve({ data: [], error: null }).then(resolve);
        }
      };
      mockSupabaseClient.from.mockReturnValue(mockBuilder);

      await ethicalContextService.getBrightLineIncidents('test-org-acme-001', {
        resolved: false
      });

      expect(mockBuilder.is).toHaveBeenCalledWith('resolved_at', null);
    });
  });

  // ============================================
  // resolveBrightLineIncident Tests
  // ============================================
  describe('resolveBrightLineIncident', () => {
    test('should resolve incident', async () => {
      const resolvedIncident = {
        ...testBrightLineIncidents.violation,
        status: 'resolved',
        resolved_at: expect.any(String),
        resolved_by: 'user-001',
        resolution_notes: 'Fixed the issue'
      };

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: resolvedIncident, error: null })
      });

      const result = await ethicalContextService.resolveBrightLineIncident(
        'test-incident-002',
        'user-001',
        'Fixed the issue'
      );

      expect(result.resolution_notes).toBe('Fixed the issue');
    });
  });

  // ============================================
  // calculateIntegrityMetrics Tests
  // ============================================
  describe('calculateIntegrityMetrics', () => {
    test('should calculate metrics correctly', async () => {
      const mockEvaluations = [
        { stakes_level: 'high', requires_human_review: true, reviewed_at: '2024-01-15' },
        { stakes_level: 'medium', requires_human_review: false, reviewed_at: null },
        { stakes_level: 'critical', requires_human_review: true, reviewed_at: null }
      ];

      const mockIncidents = [
        { incident_type: 'near_miss', severity: 'medium', resolved_at: '2024-01-12' },
        { incident_type: 'violation', severity: 'high', resolved_at: null }
      ];

      mockSupabaseClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          gte: jest.fn().mockResolvedValue({ data: mockEvaluations, error: null })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockResolvedValue({ data: mockIncidents, error: null })
        });

      const result = await ethicalContextService.calculateIntegrityMetrics('test-org-001', 30);

      expect(result.period.days).toBe(30);
      expect(result.evaluations.total).toBe(3);
      expect(result.evaluations.highStakes).toBe(2); // high + critical
      expect(result.evaluations.requiresReview).toBe(2);
      expect(result.evaluations.reviewsCompleted).toBe(1);
      expect(result.incidents.total).toBe(2);
      expect(result.incidents.violations).toBe(1);
      expect(result.incidents.nearMisses).toBe(1);
      expect(result.incidents.resolved).toBe(1);
      expect(result.metrics.integrityYield).toBeGreaterThan(0);
      expect(result.metrics.integrityYield).toBeLessThanOrEqual(100);
    });

    test('should handle empty data', async () => {
      mockSupabaseClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          gte: jest.fn().mockResolvedValue({ data: [], error: null })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockResolvedValue({ data: [], error: null })
        });

      const result = await ethicalContextService.calculateIntegrityMetrics('test-org-001', 30);

      expect(result.evaluations.total).toBe(0);
      expect(result.incidents.total).toBe(0);
      expect(result.metrics.integrityYield).toBe(100); // Perfect score when no incidents
    });
  });

  // ============================================
  // analyzeThroughLenses Tests
  // ============================================
  describe('analyzeThroughLenses', () => {
    test('should generate analysis framework', async () => {
      const mockLenses = Object.values(testEthicalLenses);

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockLenses, error: null })
      });

      const result = await ethicalContextService.analyzeThroughLenses(
        'Should we proceed with the layoffs?',
        ['employees', 'shareholders', 'community'],
        ['Proceed', 'Delay', 'Alternative approach']
      );

      expect(result.decisionSummary).toBe('Should we proceed with the layoffs?');
      expect(result.stakeholders).toContain('employees');
      expect(result.options).toHaveLength(3);
      expect(result.lensAnalysis).toBeDefined();
      expect(result.lensAnalysis.rights).toBeDefined();
      expect(result.lensAnalysis.justice).toBeDefined();
      expect(result.lensAnalysis.utilitarian).toBeDefined();
      expect(result.synthesisPrompt).toContain('synthesize');
    });

    test('should include stakeholders in considerations', async () => {
      const mockLenses = Object.values(testEthicalLenses);

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockLenses, error: null })
      });

      const result = await ethicalContextService.analyzeThroughLenses(
        'Test decision',
        ['customers', 'team members']
      );

      // Check that stakeholders appear in at least one lens's considerations
      const hasStakeholderReference = Object.values(result.lensAnalysis).some(
        lens => lens.considerations.some(c => c.includes('customers'))
      );
      expect(hasStakeholderReference).toBe(true);
    });
  });

  // ============================================
  // STAKES_LEVELS and STAKES_KEYWORDS exports
  // ============================================
  describe('Constants exports', () => {
    test('should export STAKES_LEVELS', () => {
      expect(ethicalContextService.STAKES_LEVELS).toBeDefined();
      expect(ethicalContextService.STAKES_LEVELS.LOW).toBe('low');
      expect(ethicalContextService.STAKES_LEVELS.MEDIUM).toBe('medium');
      expect(ethicalContextService.STAKES_LEVELS.HIGH).toBe('high');
      expect(ethicalContextService.STAKES_LEVELS.CRITICAL).toBe('critical');
    });

    test('should export STAKES_KEYWORDS', () => {
      expect(ethicalContextService.STAKES_KEYWORDS).toBeDefined();
      expect(ethicalContextService.STAKES_KEYWORDS.critical).toContain('safety');
      expect(ethicalContextService.STAKES_KEYWORDS.high).toContain('ethics');
      expect(ethicalContextService.STAKES_KEYWORDS.medium).toContain('strategy');
    });
  });
});
