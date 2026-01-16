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
    '/__tests__/setup/'
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
