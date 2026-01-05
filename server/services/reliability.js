/**
 * Reliability Service
 * Phase 16: Reliability & Resilience
 *
 * Provides:
 * - Retry with exponential backoff
 * - Circuit breaker pattern
 * - Timeout wrapper
 * - Fallback handling
 */

const logger = require('./logger');

// ============================================
// Retry with Exponential Backoff
// ============================================

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1, // Add 10% random jitter
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'EPIPE',
    'ENOTFOUND',
    'ENETUNREACH',
    'EAI_AGAIN',
  ],
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt, config) {
  const { initialDelayMs, maxDelayMs, backoffMultiplier, jitterFactor } = config;

  // Exponential backoff: delay = initial * (multiplier ^ attempt)
  let delay = initialDelayMs * Math.pow(backoffMultiplier, attempt);

  // Cap at max delay
  delay = Math.min(delay, maxDelayMs);

  // Add jitter (random variation to prevent thundering herd)
  const jitter = delay * jitterFactor * (Math.random() * 2 - 1);
  delay = Math.max(0, delay + jitter);

  return Math.round(delay);
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error, config) {
  // Check error code (network errors)
  if (error.code && config.retryableErrors.includes(error.code)) {
    return true;
  }

  // Check HTTP status codes
  if (error.status && config.retryableStatusCodes.includes(error.status)) {
    return true;
  }

  // Check response status (axios-style)
  if (error.response?.status && config.retryableStatusCodes.includes(error.response.status)) {
    return true;
  }

  // Rate limiting headers
  if (error.message?.toLowerCase().includes('rate limit')) {
    return true;
  }

  // Overloaded errors (Claude specific)
  if (error.message?.toLowerCase().includes('overloaded')) {
    return true;
  }

  return false;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 *
 * @param {Function} operation - Async function to retry
 * @param {Object} options - Retry configuration
 * @param {string} options.operationName - Name for logging
 * @param {number} options.maxRetries - Maximum retry attempts
 * @param {number} options.initialDelayMs - Initial delay between retries
 * @param {number} options.maxDelayMs - Maximum delay between retries
 * @param {Function} options.shouldRetry - Custom function to determine if should retry
 * @param {Function} options.onRetry - Callback called before each retry
 * @returns {Promise<any>} - Result of the operation
 */
async function withRetry(operation, options = {}) {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options };
  const { maxRetries, operationName = 'operation' } = config;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 0) {
        logger.info(`${operationName} succeeded after ${attempt} retries`);
      }
      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const shouldRetry =
        config.shouldRetry?.(error, attempt) ?? isRetryableError(error, config);

      if (!shouldRetry || attempt >= maxRetries) {
        logger.error(`${operationName} failed after ${attempt + 1} attempts`, {
          error: error.message,
          attempts: attempt + 1,
        });
        throw error;
      }

      // Calculate delay
      const delay = calculateDelay(attempt, config);

      logger.warn(`${operationName} failed, retrying in ${delay}ms`, {
        attempt: attempt + 1,
        maxRetries,
        error: error.message,
        delay,
      });

      // Call onRetry callback if provided
      if (config.onRetry) {
        await config.onRetry(error, attempt, delay);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError;
}

// ============================================
// Circuit Breaker
// ============================================

/**
 * Circuit breaker states
 */
const CircuitState = {
  CLOSED: 'CLOSED', // Normal operation, requests pass through
  OPEN: 'OPEN', // Failing, requests are rejected immediately
  HALF_OPEN: 'HALF_OPEN', // Testing if service recovered
};

/**
 * Circuit breaker configuration defaults
 */
const DEFAULT_CIRCUIT_CONFIG = {
  failureThreshold: 5, // Open circuit after 5 failures
  successThreshold: 2, // Close circuit after 2 successes in half-open
  timeout: 30000, // Time before attempting recovery (ms)
  volumeThreshold: 5, // Minimum requests before tripping
  errorPercentageThreshold: 50, // Open if >50% of requests fail
};

/**
 * Circuit Breaker implementation
 */
class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...options };

    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;

    // Rolling window for percentage-based threshold
    this.requestHistory = [];
    this.windowSize = 10; // Track last 10 requests
  }

  /**
   * Check if the circuit allows requests
   */
  canExecute() {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      // Check if timeout has passed
      if (Date.now() >= this.nextAttemptTime) {
        this.state = CircuitState.HALF_OPEN;
        this.successes = 0;
        logger.info(`Circuit breaker ${this.name} entering HALF_OPEN state`);
        return true;
      }
      return false;
    }

    // HALF_OPEN - allow single request to test
    return true;
  }

  /**
   * Record a successful operation
   */
  recordSuccess() {
    this.requestHistory.push({ success: true, timestamp: Date.now() });
    this.trimHistory();

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.close();
      }
    } else {
      // In CLOSED state, reset failure count on success
      this.failures = 0;
    }
  }

  /**
   * Record a failed operation
   */
  recordFailure(error) {
    this.requestHistory.push({ success: false, timestamp: Date.now() });
    this.trimHistory();
    this.lastFailureTime = Date.now();
    this.failures++;

    if (this.state === CircuitState.HALF_OPEN) {
      // Single failure in half-open trips back to open
      this.open();
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we should open the circuit
      if (this.shouldOpen()) {
        this.open();
      }
    }
  }

  /**
   * Check if circuit should open based on thresholds
   */
  shouldOpen() {
    // Check absolute failure threshold
    if (this.failures >= this.config.failureThreshold) {
      return true;
    }

    // Check percentage threshold (only if we have enough requests)
    if (this.requestHistory.length >= this.config.volumeThreshold) {
      const failureRate = this.getFailureRate();
      if (failureRate >= this.config.errorPercentageThreshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get failure rate from rolling window
   */
  getFailureRate() {
    if (this.requestHistory.length === 0) return 0;
    const failures = this.requestHistory.filter((r) => !r.success).length;
    return (failures / this.requestHistory.length) * 100;
  }

  /**
   * Trim request history to window size
   */
  trimHistory() {
    while (this.requestHistory.length > this.windowSize) {
      this.requestHistory.shift();
    }
  }

  /**
   * Open the circuit
   */
  open() {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.config.timeout;
    logger.warn(`Circuit breaker ${this.name} OPENED`, {
      failures: this.failures,
      failureRate: this.getFailureRate().toFixed(1) + '%',
      nextAttempt: new Date(this.nextAttemptTime).toISOString(),
    });
  }

  /**
   * Close the circuit (return to normal)
   */
  close() {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.requestHistory = [];
    logger.info(`Circuit breaker ${this.name} CLOSED (recovered)`);
  }

  /**
   * Force reset the circuit breaker
   */
  reset() {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.requestHistory = [];
    logger.info(`Circuit breaker ${this.name} manually reset`);
  }

  /**
   * Get circuit breaker status
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      failureRate: this.getFailureRate().toFixed(1) + '%',
      lastFailure: this.lastFailureTime
        ? new Date(this.lastFailureTime).toISOString()
        : null,
      nextAttempt: this.nextAttemptTime
        ? new Date(this.nextAttemptTime).toISOString()
        : null,
    };
  }

  /**
   * Execute an operation through the circuit breaker
   */
  async execute(operation) {
    if (!this.canExecute()) {
      const error = new Error(`Circuit breaker ${this.name} is OPEN`);
      error.code = 'CIRCUIT_OPEN';
      error.circuitBreaker = this.getStatus();
      throw error;
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error);
      throw error;
    }
  }
}

// ============================================
// Circuit Breaker Registry
// ============================================

const circuitBreakers = new Map();

/**
 * Get or create a circuit breaker
 */
function getCircuitBreaker(name, options = {}) {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(name, options));
  }
  return circuitBreakers.get(name);
}

/**
 * Get all circuit breaker statuses
 */
function getAllCircuitStatus() {
  const status = {};
  for (const [name, breaker] of circuitBreakers) {
    status[name] = breaker.getStatus();
  }
  return status;
}

/**
 * Reset all circuit breakers
 */
function resetAllCircuits() {
  for (const breaker of circuitBreakers.values()) {
    breaker.reset();
  }
  logger.info('All circuit breakers reset');
}

// ============================================
// Timeout Wrapper
// ============================================

/**
 * Wrap an async operation with a timeout
 *
 * @param {Function} operation - Async function to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operationName - Name for error messages
 * @returns {Promise<any>} - Result of the operation
 */
async function withTimeout(operation, timeoutMs, operationName = 'operation') {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const error = new Error(`${operationName} timed out after ${timeoutMs}ms`);
      error.code = 'ETIMEDOUT';
      error.timeout = timeoutMs;
      reject(error);
    }, timeoutMs);

    operation()
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

// ============================================
// Fallback Handler
// ============================================

/**
 * Execute operation with fallback
 *
 * @param {Function} primary - Primary operation
 * @param {Function} fallback - Fallback operation or value
 * @param {Object} options - Options
 * @param {string} options.operationName - Name for logging
 * @param {boolean} options.logFallback - Whether to log fallback usage
 * @returns {Promise<any>} - Result from primary or fallback
 */
async function withFallback(primary, fallback, options = {}) {
  const { operationName = 'operation', logFallback = true } = options;

  try {
    return await primary();
  } catch (error) {
    if (logFallback) {
      logger.warn(`${operationName} failed, using fallback`, {
        error: error.message,
        code: error.code,
      });
    }

    // If fallback is a function, call it with the error
    if (typeof fallback === 'function') {
      return await fallback(error);
    }

    // Otherwise return the fallback value
    return fallback;
  }
}

// ============================================
// Combined Resilience Wrapper
// ============================================

/**
 * Execute an operation with full resilience:
 * - Timeout
 * - Circuit breaker
 * - Retry with backoff
 * - Fallback
 *
 * @param {Function} operation - Async function to execute
 * @param {Object} options - Configuration options
 * @returns {Promise<any>} - Result of the operation
 */
async function withResilience(operation, options = {}) {
  const {
    operationName = 'operation',
    timeout = 30000,
    circuitBreaker: cbName = null,
    circuitBreakerOptions = {},
    retryOptions = {},
    fallback = null,
  } = options;

  // Build the resilient operation
  let resilientOp = operation;

  // Wrap with timeout
  if (timeout > 0) {
    const originalOp = resilientOp;
    resilientOp = () => withTimeout(originalOp, timeout, operationName);
  }

  // Wrap with circuit breaker
  if (cbName) {
    const cb = getCircuitBreaker(cbName, circuitBreakerOptions);
    const wrappedOp = resilientOp;
    resilientOp = () => cb.execute(wrappedOp);
  }

  // Wrap with retry
  const retryOp = () =>
    withRetry(resilientOp, {
      ...retryOptions,
      operationName,
    });

  // Wrap with fallback
  if (fallback !== null) {
    return withFallback(retryOp, fallback, { operationName });
  }

  return retryOp();
}

// ============================================
// Exports
// ============================================

module.exports = {
  // Retry
  withRetry,
  calculateDelay,
  isRetryableError,
  DEFAULT_RETRY_CONFIG,

  // Circuit Breaker
  CircuitBreaker,
  CircuitState,
  getCircuitBreaker,
  getAllCircuitStatus,
  resetAllCircuits,
  DEFAULT_CIRCUIT_CONFIG,

  // Timeout
  withTimeout,

  // Fallback
  withFallback,

  // Combined
  withResilience,
};
