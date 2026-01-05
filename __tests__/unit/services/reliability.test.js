/**
 * Reliability Service Tests
 * Phase 16: Reliability & Resilience
 *
 * Note: These tests use minimal delays to avoid timing issues
 */

// Mock logger
jest.mock('../../../server/services/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const {
  calculateDelay,
  isRetryableError,
  DEFAULT_RETRY_CONFIG,
  CircuitBreaker,
  CircuitState,
  getCircuitBreaker,
  getAllCircuitStatus,
  resetAllCircuits,
  withFallback,
} = require('../../../server/services/reliability');

describe('Reliability Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset circuit breakers between tests
    resetAllCircuits();
  });

  // ============================================
  // Calculate Delay
  // ============================================
  describe('calculateDelay', () => {
    it('should calculate exponential delay', () => {
      const config = {
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
        jitterFactor: 0,
      };

      expect(calculateDelay(0, config)).toBe(1000);
      expect(calculateDelay(1, config)).toBe(2000);
      expect(calculateDelay(2, config)).toBe(4000);
      expect(calculateDelay(3, config)).toBe(8000);
    });

    it('should cap at max delay', () => {
      const config = {
        initialDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
        jitterFactor: 0,
      };

      expect(calculateDelay(10, config)).toBe(5000);
    });

    it('should add jitter', () => {
      const config = {
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
        jitterFactor: 0.5,
      };

      // With 50% jitter, delay should be between 500 and 1500
      const delay = calculateDelay(0, config);
      expect(delay).toBeGreaterThanOrEqual(500);
      expect(delay).toBeLessThanOrEqual(1500);
    });
  });

  // ============================================
  // isRetryableError
  // ============================================
  describe('isRetryableError', () => {
    it('should identify retryable error codes', () => {
      const error = { code: 'ECONNRESET' };
      expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
    });

    it('should identify ETIMEDOUT as retryable', () => {
      const error = { code: 'ETIMEDOUT' };
      expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
    });

    it('should identify ECONNREFUSED as retryable', () => {
      const error = { code: 'ECONNREFUSED' };
      expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
    });

    it('should identify retryable status codes', () => {
      const error = { status: 503 };
      expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
    });

    it('should identify 429 (rate limit) as retryable', () => {
      const error = { status: 429 };
      expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
    });

    it('should identify 500 as retryable', () => {
      const error = { status: 500 };
      expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
    });

    it('should identify rate limit message as retryable', () => {
      const error = { message: 'Rate limit exceeded' };
      expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
    });

    it('should identify overloaded message as retryable', () => {
      const error = { message: 'Service overloaded' };
      expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const error = { code: 'INVALID_REQUEST', message: 'Bad request' };
      expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(false);
    });

    it('should return false for 400 status', () => {
      const error = { status: 400 };
      expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(false);
    });

    it('should return false for 404 status', () => {
      const error = { status: 404 };
      expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(false);
    });

    it('should check response.status for axios-style errors', () => {
      const error = { response: { status: 503 } };
      expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
    });
  });

  // ============================================
  // Circuit Breaker
  // ============================================
  describe('CircuitBreaker', () => {
    describe('initialization', () => {
      it('should start in CLOSED state', () => {
        const cb = new CircuitBreaker('test-init');
        expect(cb.getStatus().state).toBe(CircuitState.CLOSED);
      });

      it('should have zero failures initially', () => {
        const cb = new CircuitBreaker('test-init-2');
        expect(cb.getStatus().failures).toBe(0);
      });

      it('should have zero successes initially', () => {
        const cb = new CircuitBreaker('test-init-3');
        expect(cb.getStatus().successes).toBe(0);
      });
    });

    describe('recording success', () => {
      it('should allow execution when closed', () => {
        const cb = new CircuitBreaker('test-success-1');
        expect(cb.canExecute()).toBe(true);
      });

      it('should reset failure count on success', () => {
        const cb = new CircuitBreaker('test-success-2', { failureThreshold: 5 });
        cb.recordFailure(new Error('fail 1'));
        cb.recordFailure(new Error('fail 2'));
        expect(cb.getStatus().failures).toBe(2);

        cb.recordSuccess();
        expect(cb.getStatus().failures).toBe(0);
      });
    });

    describe('recording failure', () => {
      it('should increment failure count', () => {
        const cb = new CircuitBreaker('test-fail-1', { failureThreshold: 5 });
        cb.recordFailure(new Error('fail'));
        expect(cb.getStatus().failures).toBe(1);
      });

      it('should open after failure threshold', () => {
        const cb = new CircuitBreaker('test-fail-2', { failureThreshold: 3 });

        cb.recordFailure(new Error('fail 1'));
        cb.recordFailure(new Error('fail 2'));
        expect(cb.getStatus().state).toBe(CircuitState.CLOSED);

        cb.recordFailure(new Error('fail 3'));
        expect(cb.getStatus().state).toBe(CircuitState.OPEN);
      });

      it('should not allow execution when open', () => {
        const cb = new CircuitBreaker('test-fail-3', { failureThreshold: 1 });
        cb.recordFailure(new Error('fail'));
        expect(cb.canExecute()).toBe(false);
      });

      it('should record last failure time', () => {
        const cb = new CircuitBreaker('test-fail-4');
        expect(cb.getStatus().lastFailure).toBeNull();

        cb.recordFailure(new Error('fail'));
        expect(cb.getStatus().lastFailure).not.toBeNull();
      });
    });

    describe('execute', () => {
      it('should execute operation when circuit is closed', async () => {
        const cb = new CircuitBreaker('test-exec-1');
        const operation = jest.fn().mockResolvedValue('success');

        const result = await cb.execute(operation);

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalled();
      });

      it('should reject when circuit is open', async () => {
        const cb = new CircuitBreaker('test-exec-2', { failureThreshold: 1 });
        cb.recordFailure(new Error('fail'));

        await expect(cb.execute(() => Promise.resolve())).rejects.toThrow(
          'Circuit breaker test-exec-2 is OPEN'
        );
      });

      it('should have CIRCUIT_OPEN error code when open', async () => {
        const cb = new CircuitBreaker('test-exec-3', { failureThreshold: 1 });
        cb.recordFailure(new Error('fail'));

        try {
          await cb.execute(() => Promise.resolve());
        } catch (error) {
          expect(error.code).toBe('CIRCUIT_OPEN');
        }
      });

      it('should record success on successful execution', async () => {
        const cb = new CircuitBreaker('test-exec-4');
        await cb.execute(() => Promise.resolve('success'));
        expect(cb.getStatus().failures).toBe(0);
      });

      it('should record failure on failed execution', async () => {
        const cb = new CircuitBreaker('test-exec-5', { failureThreshold: 5 });

        await expect(
          cb.execute(() => Promise.reject(new Error('fail')))
        ).rejects.toThrow('fail');

        expect(cb.getStatus().failures).toBe(1);
      });
    });

    describe('reset', () => {
      it('should reset circuit breaker to initial state', () => {
        const cb = new CircuitBreaker('test-reset-1', { failureThreshold: 1 });
        cb.recordFailure(new Error('fail'));
        expect(cb.getStatus().state).toBe(CircuitState.OPEN);

        cb.reset();

        expect(cb.getStatus().state).toBe(CircuitState.CLOSED);
        expect(cb.getStatus().failures).toBe(0);
        expect(cb.getStatus().successes).toBe(0);
      });
    });

    describe('getStatus', () => {
      it('should return correct status', () => {
        const cb = new CircuitBreaker('test-status-1');
        cb.recordFailure(new Error('fail'));

        const status = cb.getStatus();

        expect(status.name).toBe('test-status-1');
        expect(status.state).toBe(CircuitState.CLOSED);
        expect(status.failures).toBe(1);
        expect(status.successes).toBe(0);
        expect(status.lastFailure).not.toBeNull();
      });

      it('should include failure rate', () => {
        const cb = new CircuitBreaker('test-status-2');
        const status = cb.getStatus();
        expect(status.failureRate).toBeDefined();
      });
    });

    describe('percentage threshold', () => {
      it('should open based on error percentage threshold', () => {
        const cb = new CircuitBreaker('test-pct-1', {
          failureThreshold: 100, // High so it doesn't trigger
          volumeThreshold: 5,
          errorPercentageThreshold: 50,
        });

        // Record 2 successes first, then 3 failures (60% failure rate)
        // The check happens on recordFailure, so failures must come last
        cb.recordSuccess();
        cb.recordSuccess();
        cb.recordFailure(new Error('fail'));
        cb.recordFailure(new Error('fail'));
        cb.recordFailure(new Error('fail')); // This triggers the check with 5 requests and 60% failure

        // Should be open because failure rate > 50%
        expect(cb.getStatus().state).toBe(CircuitState.OPEN);
      });

      it('should not open below volume threshold', () => {
        const cb = new CircuitBreaker('test-pct-2', {
          failureThreshold: 100,
          volumeThreshold: 10,
          errorPercentageThreshold: 50,
        });

        // Record 3 failures (not enough volume)
        cb.recordFailure(new Error('fail'));
        cb.recordFailure(new Error('fail'));
        cb.recordFailure(new Error('fail'));

        expect(cb.getStatus().state).toBe(CircuitState.CLOSED);
      });
    });
  });

  // ============================================
  // Circuit Breaker Registry
  // ============================================
  describe('Circuit Breaker Registry', () => {
    it('should create and retrieve circuit breakers', () => {
      const cb1 = getCircuitBreaker('service-reg-1');
      const cb2 = getCircuitBreaker('service-reg-1');

      expect(cb1).toBe(cb2);
    });

    it('should create different circuit breakers for different names', () => {
      const cb1 = getCircuitBreaker('service-reg-2');
      const cb2 = getCircuitBreaker('service-reg-3');

      expect(cb1).not.toBe(cb2);
    });

    it('should get all circuit statuses', () => {
      getCircuitBreaker('service-status-a');
      getCircuitBreaker('service-status-b');

      const statuses = getAllCircuitStatus();

      expect(statuses['service-status-a']).toBeDefined();
      expect(statuses['service-status-b']).toBeDefined();
    });

    it('should reset all circuit breakers', () => {
      const cb1 = getCircuitBreaker('reset-all-1', { failureThreshold: 1 });
      const cb2 = getCircuitBreaker('reset-all-2', { failureThreshold: 1 });

      cb1.recordFailure(new Error('fail'));
      cb2.recordFailure(new Error('fail'));

      expect(cb1.getStatus().state).toBe(CircuitState.OPEN);
      expect(cb2.getStatus().state).toBe(CircuitState.OPEN);

      resetAllCircuits();

      expect(cb1.getStatus().state).toBe(CircuitState.CLOSED);
      expect(cb2.getStatus().state).toBe(CircuitState.CLOSED);
    });
  });

  // ============================================
  // Fallback
  // ============================================
  describe('withFallback', () => {
    it('should return primary result on success', async () => {
      const primary = () => Promise.resolve('primary');
      const fallback = 'fallback';

      const result = await withFallback(primary, fallback);

      expect(result).toBe('primary');
    });

    it('should return fallback value on failure', async () => {
      const primary = () => Promise.reject(new Error('fail'));
      const fallback = 'fallback';

      const result = await withFallback(primary, fallback);

      expect(result).toBe('fallback');
    });

    it('should call fallback function with error', async () => {
      const error = new Error('fail');
      const primary = () => Promise.reject(error);
      const fallback = jest.fn().mockReturnValue('fallback-result');

      const result = await withFallback(primary, fallback);

      expect(result).toBe('fallback-result');
      expect(fallback).toHaveBeenCalledWith(error);
    });

    it('should support async fallback functions', async () => {
      const primary = () => Promise.reject(new Error('fail'));
      const fallback = async () => 'async-fallback';

      const result = await withFallback(primary, fallback);

      expect(result).toBe('async-fallback');
    });

    it('should support null fallback', async () => {
      const primary = () => Promise.reject(new Error('fail'));
      const fallback = null;

      const result = await withFallback(primary, fallback);

      expect(result).toBeNull();
    });

    it('should support undefined fallback', async () => {
      const primary = () => Promise.reject(new Error('fail'));
      const fallback = undefined;

      const result = await withFallback(primary, fallback);

      expect(result).toBeUndefined();
    });

    it('should support object fallback', async () => {
      const primary = () => Promise.reject(new Error('fail'));
      const fallback = { data: 'cached' };

      const result = await withFallback(primary, fallback);

      expect(result).toEqual({ data: 'cached' });
    });

    it('should support array fallback', async () => {
      const primary = () => Promise.reject(new Error('fail'));
      const fallback = [1, 2, 3];

      const result = await withFallback(primary, fallback);

      expect(result).toEqual([1, 2, 3]);
    });
  });

  // ============================================
  // DEFAULT_RETRY_CONFIG
  // ============================================
  describe('DEFAULT_RETRY_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
      expect(DEFAULT_RETRY_CONFIG.initialDelayMs).toBe(1000);
      expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBe(30000);
      expect(DEFAULT_RETRY_CONFIG.backoffMultiplier).toBe(2);
    });

    it('should include network error codes', () => {
      expect(DEFAULT_RETRY_CONFIG.retryableErrors).toContain('ECONNRESET');
      expect(DEFAULT_RETRY_CONFIG.retryableErrors).toContain('ETIMEDOUT');
      expect(DEFAULT_RETRY_CONFIG.retryableErrors).toContain('ECONNREFUSED');
    });

    it('should include HTTP status codes', () => {
      expect(DEFAULT_RETRY_CONFIG.retryableStatusCodes).toContain(429);
      expect(DEFAULT_RETRY_CONFIG.retryableStatusCodes).toContain(500);
      expect(DEFAULT_RETRY_CONFIG.retryableStatusCodes).toContain(502);
      expect(DEFAULT_RETRY_CONFIG.retryableStatusCodes).toContain(503);
      expect(DEFAULT_RETRY_CONFIG.retryableStatusCodes).toContain(504);
    });
  });

  // ============================================
  // CircuitState
  // ============================================
  describe('CircuitState', () => {
    it('should export all states', () => {
      expect(CircuitState.CLOSED).toBe('CLOSED');
      expect(CircuitState.OPEN).toBe('OPEN');
      expect(CircuitState.HALF_OPEN).toBe('HALF_OPEN');
    });
  });
});
