// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright E2E Test Configuration for Insight 360
 *
 * Run with: npx playwright test
 * Run with UI: npx playwright test --ui
 * Run specific file: npx playwright test align120.spec.js
 */

module.exports = defineConfig({
  testDir: './__tests__/e2e-ui',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],

  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video recording
    video: 'retain-on-failure',

    // Default timeout for actions
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      // Extension tests are excluded from the default chromium project
      // because they require a persistent context (launchBrowserWithExtension).
      // Run them via: npx playwright test --project=extension
      testIgnore: ['**/extension/**'],
      use: { ...devices['Desktop Chrome'] },
    },

    // Chrome extension tests - requires headed Chromium with --load-extension
    // These tests manage their own browser context via launchBrowserWithExtension()
    {
      name: 'extension',
      testMatch: ['**/__tests__/e2e-ui/extension/**/*.spec.js'],
      use: {
        // Extensions cannot run in fully headless mode on all platforms.
        // The individual test files call launchBrowserWithExtension() which
        // passes headless: false. This project entry documents the intent.
        ...devices['Desktop Chrome'],
        headless: false,
      },
    },

    // Uncomment for multi-browser testing of non-extension specs
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Global timeout
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Run local dev server before starting the tests
  // Note: DEV_AUTH_BYPASS=true allows tests to run without real auth
  webServer: {
    command: 'NODE_ENV=development DEV_AUTH_BYPASS=true npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      NODE_ENV: 'development',
      DEV_AUTH_BYPASS: 'true',
    },
  },
});
