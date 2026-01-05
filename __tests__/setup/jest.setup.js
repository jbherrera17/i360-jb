/**
 * Jest Setup - Runs before each test file
 *
 * Configures global mocks, environment variables, and test utilities.
 */

// Use fake timers BEFORE loading any modules that use setInterval
// This prevents the auth middleware's setInterval from running
jest.useFakeTimers();

// Load test environment variables
require('dotenv').config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Silence console output during tests (optional - comment out for debugging)
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Keep warn and error for visibility
  warn: originalConsole.warn,
  error: originalConsole.error
};

// Restore original console for specific tests if needed
global.restoreConsole = () => {
  global.console = originalConsole;
};

// Global test utilities
global.wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Clean up after each test
afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
});

// Clean up after all tests
afterAll(async () => {
  jest.clearAllTimers();
  jest.useRealTimers();
});
