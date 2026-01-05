/**
 * Metrics Service Tests
 * Phase 14: Observability & Monitoring
 */

describe('Metrics Service', () => {
  let metrics;

  beforeEach(() => {
    jest.resetModules();
    metrics = require('../../../server/services/metrics');
  });

  describe('initialization', () => {
    it('should export a Prometheus registry', () => {
      expect(metrics.register).toBeDefined();
    });

    it('should have getMetrics function', () => {
      expect(typeof metrics.getMetrics).toBe('function');
    });

    it('should have getContentType function', () => {
      expect(typeof metrics.getContentType).toBe('function');
    });
  });

  describe('recordHttpRequest', () => {
    it('should be a function', () => {
      expect(typeof metrics.recordHttpRequest).toBe('function');
    });

    it('should record HTTP request metrics without error', () => {
      expect(() => {
        metrics.recordHttpRequest('GET', '/api/agents', 200, 50);
      }).not.toThrow();
    });

    it('should handle various HTTP methods', () => {
      expect(() => {
        metrics.recordHttpRequest('POST', '/api/agents', 201, 100);
        metrics.recordHttpRequest('PUT', '/api/agents/123', 200, 75);
        metrics.recordHttpRequest('DELETE', '/api/agents/123', 204, 30);
      }).not.toThrow();
    });

    it('should normalize routes with UUIDs', () => {
      expect(() => {
        metrics.recordHttpRequest('GET', '/api/agents/550e8400-e29b-41d4-a716-446655440000', 200, 50);
      }).not.toThrow();
    });

    it('should normalize routes with numeric IDs', () => {
      expect(() => {
        metrics.recordHttpRequest('GET', '/api/items/12345', 200, 50);
      }).not.toThrow();
    });
  });

  describe('recordLLMRequest', () => {
    it('should be a function', () => {
      expect(typeof metrics.recordLLMRequest).toBe('function');
    });

    it('should record successful LLM requests', () => {
      expect(() => {
        metrics.recordLLMRequest('anthropic', 'claude-sonnet-4-5-20250929', 500, 200, 1500, true);
      }).not.toThrow();
    });

    it('should record failed LLM requests', () => {
      expect(() => {
        metrics.recordLLMRequest('openai', 'gpt-4o', 100, 0, 5000, false);
      }).not.toThrow();
    });

    it('should handle various models', () => {
      expect(() => {
        metrics.recordLLMRequest('anthropic', 'claude-opus-4-5-20251101', 1000, 500, 3000, true);
        metrics.recordLLMRequest('openai', 'gpt-4o-mini', 200, 100, 800, true);
        metrics.recordLLMRequest('openai', 'gpt-4-turbo', 300, 150, 1200, true);
      }).not.toThrow();
    });

    it('should handle unknown models with default pricing', () => {
      expect(() => {
        metrics.recordLLMRequest('custom', 'unknown-model', 100, 50, 500, true);
      }).not.toThrow();
    });
  });

  describe('recordDbQuery', () => {
    it('should be a function', () => {
      expect(typeof metrics.recordDbQuery).toBe('function');
    });

    it('should record successful database queries', () => {
      expect(() => {
        metrics.recordDbQuery('users', 'SELECT', 15, true);
      }).not.toThrow();
    });

    it('should record failed database queries', () => {
      expect(() => {
        metrics.recordDbQuery('agents', 'INSERT', 50, false);
      }).not.toThrow();
    });

    it('should handle various operations', () => {
      expect(() => {
        metrics.recordDbQuery('context_assets', 'SELECT', 10, true);
        metrics.recordDbQuery('actions', 'INSERT', 25, true);
        metrics.recordDbQuery('conversations', 'UPDATE', 15, true);
        metrics.recordDbQuery('old_data', 'DELETE', 5, true);
      }).not.toThrow();
    });
  });

  describe('recordAgentExecution', () => {
    it('should be a function', () => {
      expect(typeof metrics.recordAgentExecution).toBe('function');
    });

    it('should record successful agent executions', () => {
      expect(() => {
        metrics.recordAgentExecution('agent-001', true);
      }).not.toThrow();
    });

    it('should record failed agent executions', () => {
      expect(() => {
        metrics.recordAgentExecution('agent-002', false);
      }).not.toThrow();
    });
  });

  describe('recordActionExecution', () => {
    it('should be a function', () => {
      expect(typeof metrics.recordActionExecution).toBe('function');
    });

    it('should record successful action executions', () => {
      expect(() => {
        metrics.recordActionExecution('action-001', true);
      }).not.toThrow();
    });

    it('should record failed action executions', () => {
      expect(() => {
        metrics.recordActionExecution('action-002', false);
      }).not.toThrow();
    });
  });

  describe('setActiveConnections', () => {
    it('should be a function', () => {
      expect(typeof metrics.setActiveConnections).toBe('function');
    });

    it('should set active connections count', () => {
      expect(() => {
        metrics.setActiveConnections(10);
        metrics.setActiveConnections(0);
        metrics.setActiveConnections(100);
      }).not.toThrow();
    });
  });

  describe('setActiveUsers', () => {
    it('should be a function', () => {
      expect(typeof metrics.setActiveUsers).toBe('function');
    });

    it('should set active users count', () => {
      expect(() => {
        metrics.setActiveUsers(5);
        metrics.setActiveUsers(0);
        metrics.setActiveUsers(50);
      }).not.toThrow();
    });
  });

  describe('getMetrics', () => {
    it('should return Prometheus formatted metrics', async () => {
      const metricsOutput = await metrics.getMetrics();

      expect(typeof metricsOutput).toBe('string');
      expect(metricsOutput.length).toBeGreaterThan(0);
    });

    it('should include default Node.js metrics', async () => {
      const metricsOutput = await metrics.getMetrics();

      // Default metrics include process info
      expect(metricsOutput).toContain('i360_');
    });

    it('should include custom metrics after recording', async () => {
      // Record some metrics
      metrics.recordHttpRequest('GET', '/api/test', 200, 50);
      metrics.recordLLMRequest('anthropic', 'claude-sonnet-4', 100, 50, 1000, true);

      const metricsOutput = await metrics.getMetrics();

      expect(metricsOutput).toContain('i360_http_request');
      expect(metricsOutput).toContain('i360_llm_request');
    });
  });

  describe('getContentType', () => {
    it('should return Prometheus content type', () => {
      const contentType = metrics.getContentType();

      expect(typeof contentType).toBe('string');
      expect(contentType).toContain('text/plain');
    });
  });
});
