// Jest Configuration for Insight 360
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.spec.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/public/',
    '/__tests__/fixtures/',
    '/__tests__/setup/',
    // Playwright specs live in e2e-ui/ and are run by `npm run test:e2e`,
    // not by Jest. Without this exclusion Jest tries to execute them and
    // they fail because Playwright's `test`/`expect` aren't Jest globals.
    '/__tests__/e2e-ui/'
  ],
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/index.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 23,
      functions: 23,
      lines: 24,
      statements: 24
    }
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/server/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1'
  },
  testTimeout: 30000,
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  forceExit: true,
  detectOpenHandles: true,
  maxWorkers: 1
};
