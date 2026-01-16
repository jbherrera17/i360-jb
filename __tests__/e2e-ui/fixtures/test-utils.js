/**
 * Playwright Test Utilities for Insight 360
 * Reusable helpers for E2E UI testing
 */

const { expect } = require('@playwright/test');

/**
 * Mock user data for authenticated sessions
 */
const mockUser = {
  id: 'test-user-001',
  email: 'test@example.com',
  display_name: 'Test User',
  role: 'admin',
  created_at: new Date().toISOString(),
};

/**
 * Mock API responses for testing without real backend
 */
const mockApiResponses = {
  // Mock sessions list
  sessions: [
    {
      id: 'session-test-001',
      company_name: 'Test Company',
      status: 'in_progress',
      current_module: 2,
      module_progress: { 1: true, 2: false, 3: false, 4: false, 5: false },
      created_at: new Date().toISOString(),
    },
  ],

  // Mock agents by category
  agents: {
    assessment: [
      { id: 'agent-001', name: 'AI Auditor', description: 'Analyzes AI readiness', category: 'assessment' },
      { id: 'agent-002', name: 'Risk Assessor', description: 'Identifies AI risks', category: 'assessment' },
    ],
    strategy: [
      { id: 'agent-003', name: 'Vision Architect', description: 'Defines vision', category: 'strategy' },
    ],
    productivity: [
      { id: 'agent-004', name: 'Skills Mapper', description: 'Maps team skills', category: 'productivity' },
    ],
    content: [
      { id: 'agent-005', name: 'Brand Voice', description: 'Analyzes brand', category: 'content' },
    ],
    corporate: [
      { id: 'agent-006', name: 'Governance', description: 'Governance framework', category: 'corporate' },
    ],
  },

  // Mock module run result
  moduleResult: {
    success: true,
    data: {
      module: 1,
      agents_run: 4,
      results: [
        {
          agent_id: 'agent-001',
          agent_name: 'AI Auditor',
          response: 'AI audit complete. Maturity score: 3.5/5',
          duration_ms: 2500,
          usage: { total_tokens: 500 },
        },
      ],
      outputs: {
        ai_inventory: { completed: true, response: 'AI systems identified' },
        risk_assessment: { completed: true, response: 'Risk level: Medium' },
      },
    },
  },
};

/**
 * Setup API mocking for a page
 * @param {import('@playwright/test').Page} page
 * @param {object} options - Mock configuration
 */
async function setupApiMocks(page, options = {}) {
  // Mock sessions endpoint
  await page.route('**/api/align120/sessions', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: options.sessions || mockApiResponses.sessions }),
      });
    } else if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'session-new-001',
            company_name: body.company_name,
            status: 'in_progress',
            current_module: 1,
            module_progress: { 1: false, 2: false, 3: false, 4: false, 5: false },
            created_at: new Date().toISOString(),
          },
        }),
      });
    }
  });

  // Mock single session endpoint
  await page.route('**/api/align120/sessions/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // Skip if this is a nested route like /run-module
    if (url.includes('/run-module') || url.includes('/complete')) {
      await route.continue();
      return;
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: options.sessions?.[0] || mockApiResponses.sessions[0],
        }),
      });
    } else if (method === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { updated: true } }),
      });
    } else if (method === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Session deleted' }),
      });
    }
  });

  // Mock agents endpoint
  await page.route('**/api/agents*', async (route) => {
    const url = new URL(route.request().url());
    const suite = url.searchParams.get('suite');

    let agents = [];
    if (suite === 'align') {
      agents = [
        ...mockApiResponses.agents.assessment,
        ...mockApiResponses.agents.strategy,
        ...mockApiResponses.agents.productivity,
        ...mockApiResponses.agents.content,
        ...mockApiResponses.agents.corporate,
      ];
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: agents }),
    });
  });

  // Mock module run endpoint (non-streaming)
  await page.route('**/api/align120/sessions/*/run-module', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(options.moduleResult || mockApiResponses.moduleResult),
    });
  });

  // Mock complete session endpoint
  await page.route('**/api/align120/sessions/*/complete', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          session_id: 'session-test-001',
          company_profile_id: 'profile-001',
          message: 'Session completed successfully',
        },
      }),
    });
  });
}

/**
 * Setup mock authentication by injecting user data into localStorage
 * This must be called BEFORE navigating to pages that require auth
 * @param {import('@playwright/test').Page} page
 * @param {object} options - Mock configuration
 */
async function setupMockAuth(page, options = {}) {
  const user = options.user || mockUser;

  // Add localStorage data before any navigation
  await page.addInitScript((userData) => {
    // Set user data in localStorage
    localStorage.setItem('insight360_user', JSON.stringify(userData));
    localStorage.setItem('insight360_token', 'mock-token-for-testing');
  }, user);
}

/**
 * Wait for page to be fully loaded with all dynamic content
 * @param {import('@playwright/test').Page} page
 */
async function waitForPageReady(page) {
  // Wait for DOM content to be loaded
  await page.waitForLoadState('domcontentloaded');

  // Wait for network to be idle (with timeout)
  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  } catch (e) {
    // Network idle timeout is okay - some pages may have long-polling
  }

  // Wait for Lucide icons to render
  await page.waitForFunction(() => {
    const icons = document.querySelectorAll('[data-lucide]');
    return icons.length === 0 || document.querySelectorAll('svg.lucide').length > 0;
  }, { timeout: 5000 }).catch(() => {
    // Icon rendering timeout is okay
  });

  // Additional wait for page to settle
  await page.waitForTimeout(200);
}

/**
 * Click a button and wait for response
 * @param {import('@playwright/test').Page} page
 * @param {string} selector - Button selector
 * @param {object} options - Wait options
 */
async function clickAndWait(page, selector, options = {}) {
  const button = page.locator(selector);
  await expect(button).toBeVisible();
  await button.click();

  if (options.waitForUrl) {
    await page.waitForURL(options.waitForUrl);
  }

  if (options.waitForSelector) {
    await page.waitForSelector(options.waitForSelector);
  }

  if (options.waitForNetwork) {
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Fill a form field and verify value
 * @param {import('@playwright/test').Page} page
 * @param {string} selector - Input selector
 * @param {string} value - Value to fill
 */
async function fillField(page, selector, value) {
  const field = page.locator(selector);
  await expect(field).toBeVisible();
  await field.fill(value);
  await expect(field).toHaveValue(value);
}

/**
 * Verify modal is open
 * @param {import('@playwright/test').Page} page
 * @param {string} modalSelector - Modal selector
 */
async function expectModalOpen(page, modalSelector = '.modal-overlay.active') {
  await expect(page.locator(modalSelector)).toBeVisible();
}

/**
 * Verify modal is closed
 * @param {import('@playwright/test').Page} page
 * @param {string} modalSelector - Modal selector
 */
async function expectModalClosed(page, modalSelector = '.modal-overlay.active') {
  await expect(page.locator(modalSelector)).not.toBeVisible();
}

/**
 * Take a screenshot with descriptive name
 * @param {import('@playwright/test').Page} page
 * @param {string} name - Screenshot name
 */
async function takeScreenshot(page, name) {
  await page.screenshot({
    path: `playwright-screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * Verify element has specific CSS class
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @param {string} className
 */
async function expectHasClass(page, selector, className) {
  const element = page.locator(selector);
  await expect(element).toHaveClass(new RegExp(className));
}

/**
 * Wait for and handle browser dialogs (alerts, confirms, prompts)
 * @param {import('@playwright/test').Page} page
 * @param {string} action - 'accept' or 'dismiss'
 * @param {string} promptText - Text to enter for prompts
 */
function setupDialogHandler(page, action = 'accept', promptText = '') {
  page.on('dialog', async (dialog) => {
    if (action === 'accept') {
      if (dialog.type() === 'prompt' && promptText) {
        await dialog.accept(promptText);
      } else {
        await dialog.accept();
      }
    } else {
      await dialog.dismiss();
    }
  });
}

module.exports = {
  mockUser,
  mockApiResponses,
  setupMockAuth,
  setupApiMocks,
  waitForPageReady,
  clickAndWait,
  fillField,
  expectModalOpen,
  expectModalClosed,
  takeScreenshot,
  expectHasClass,
  setupDialogHandler,
};
