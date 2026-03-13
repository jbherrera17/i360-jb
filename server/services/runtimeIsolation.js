const { withResilience, getAllCircuitStatus } = require('./reliability');

const DEFAULT_LIMITS = {
  default: { maxInFlight: 8, maxQueue: 24 },
  agents: { maxInFlight: 8, maxQueue: 24 },
  actions: { maxInFlight: 16, maxQueue: 32 },
  workflows: { maxInFlight: 10, maxQueue: 30 },
  skills: { maxInFlight: 8, maxQueue: 24 },
  execute120: { maxInFlight: 10, maxQueue: 30 }
};

function envInt(key, fallback) {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function getLimits(moduleName) {
  const base = DEFAULT_LIMITS[moduleName] || DEFAULT_LIMITS.default;
  return {
    maxInFlight: envInt(`RUNTIME_BULKHEAD_MAX_${String(moduleName).toUpperCase()}`, base.maxInFlight),
    maxQueue: envInt(`RUNTIME_BULKHEAD_QUEUE_${String(moduleName).toUpperCase()}`, base.maxQueue)
  };
}

class Bulkhead {
  constructor(name, maxInFlight, maxQueue) {
    this.name = name;
    this.maxInFlight = maxInFlight;
    this.maxQueue = maxQueue;
    this.inFlight = 0;
    this.waiting = [];
    this.rejected = 0;
  }

  async acquire() {
    if (this.inFlight < this.maxInFlight) {
      this.inFlight += 1;
      return this.release.bind(this);
    }

    if (this.waiting.length >= this.maxQueue) {
      this.rejected += 1;
      const error = new Error(`Bulkhead queue full: ${this.name}`);
      error.code = 'BULKHEAD_REJECTED';
      throw error;
    }

    return new Promise((resolve) => {
      this.waiting.push(resolve);
    }).then(() => {
      this.inFlight += 1;
      return this.release.bind(this);
    });
  }

  release() {
    if (this.waiting.length > 0) {
      const next = this.waiting.shift();
      next();
      return;
    }

    this.inFlight = Math.max(0, this.inFlight - 1);
  }

  snapshot() {
    return {
      name: this.name,
      maxInFlight: this.maxInFlight,
      maxQueue: this.maxQueue,
      inFlight: this.inFlight,
      queueLength: this.waiting.length,
      rejected: this.rejected,
      utilization: this.maxInFlight > 0 ? this.inFlight / this.maxInFlight : 0
    };
  }
}

const bulkheads = new Map();

function getBulkhead(moduleName, providerName = 'default') {
  const key = `${moduleName}:${providerName}`;
  if (bulkheads.has(key)) {
    return bulkheads.get(key);
  }

  const limits = getLimits(moduleName);
  const bulkhead = new Bulkhead(key, limits.maxInFlight, limits.maxQueue);
  bulkheads.set(key, bulkhead);
  return bulkhead;
}

async function runWithIsolation(context, operation, options = {}) {
  const moduleName = context.module || 'default';
  const providerName = context.provider || 'default';

  const bulkhead = getBulkhead(moduleName, providerName);
  const release = await bulkhead.acquire();

  const timeoutMs = Number(options.timeoutMs) || 30000;
  const retryCount = Math.max(0, Number(options.retryCount) || 0);

  try {
    return await withResilience(operation, {
      operationName: `runtime.${moduleName}.${providerName}`,
      timeout: timeoutMs,
      circuitBreaker: `runtime:${moduleName}:${providerName}`,
      circuitBreakerOptions: {
        failureThreshold: 4,
        successThreshold: 2,
        timeout: 30000,
        volumeThreshold: 4,
        errorPercentageThreshold: 50
      },
      retryOptions: {
        maxRetries: retryCount,
        initialDelayMs: 250,
        maxDelayMs: 3000,
        backoffMultiplier: 2
      }
    });
  } finally {
    release();
  }
}

function getIsolationStatus() {
  const result = {};
  for (const [key, bulkhead] of bulkheads.entries()) {
    result[key] = bulkhead.snapshot();
  }

  const circuits = getAllCircuitStatus();
  const runtimeCircuits = Object.entries(circuits)
    .filter(([name]) => name.startsWith('runtime:'))
    .reduce((acc, [name, value]) => {
      acc[name] = value;
      return acc;
    }, {});

  return {
    bulkheads: result,
    circuits: runtimeCircuits
  };
}

module.exports = {
  runWithIsolation,
  getIsolationStatus
};
