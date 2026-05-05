/**
 * Extension E2E Test Helpers
 *
 * Utilities for testing the Insight 360 Chrome extension with Playwright.
 * Playwright loads the extension via --load-extension and exposes it at
 * chrome-extension://<id>/popup.html etc.
 *
 * Usage pattern (in spec files):
 *   const { chromium } = require('@playwright/test');
 *   const { launchBrowserWithExtension, getExtensionId, mockServerRoutes } = require('./extension-helpers');
 *
 * Important: Chrome extensions require a real Chromium launch — they cannot
 * run in headless=true mode in older Chromium builds, but Playwright supports
 * headless="new" (Chrome 112+). The playwright.config.js webServer block
 * starts the server, so tests can call real API endpoints OR use route mocking.
 */

const path = require('path');
const { chromium } = require('@playwright/test');

const EXTENSION_PATH = path.resolve(
  __dirname,
  '../../../extension'
);

const DEFAULT_SERVER_URL = 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Browser / extension launch
// ---------------------------------------------------------------------------

/**
 * Launch a persistent Chromium context with the extension loaded.
 *
 * @param {string} [userDataDir] - Temp dir for user data (auto-created if omitted)
 * @returns {{ context, browser }} Playwright BrowserContext
 */
async function launchBrowserWithExtension(userDataDir) {
  const tmpDir =
    userDataDir ||
    require('os').tmpdir() + '/pw-extension-' + Date.now();

  const context = await chromium.launchPersistentContext(tmpDir, {
    headless: false, // Extensions require headed or headless:"new"
    args: [
      `--load-extension=${EXTENSION_PATH}`,
      `--disable-extensions-except=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  return context;
}

/**
 * Discover the installed extension's ID by looking at the service worker URL.
 *
 * @param {import('@playwright/test').BrowserContext} context
 * @returns {Promise<string>} Extension ID
 */
async function getExtensionId(context) {
  // Service workers are exposed as background pages in Playwright
  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker');
  }
  const extensionId = background.url().split('/')[2];
  return extensionId;
}

/**
 * Open the extension popup page.
 *
 * @param {import('@playwright/test').BrowserContext} context
 * @param {string} extensionId
 * @returns {Promise<import('@playwright/test').Page>}
 */
async function openPopup(context, extensionId) {
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const page = await context.newPage();
  await page.goto(popupUrl);
  await page.waitForLoadState('domcontentloaded');
  return page;
}

/**
 * Open the extension side panel page.
 *
 * @param {import('@playwright/test').BrowserContext} context
 * @param {string} extensionId
 * @returns {Promise<import('@playwright/test').Page>}
 */
async function openSidePanel(context, extensionId) {
  const url = `chrome-extension://${extensionId}/sidepanel.html`;
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');
  return page;
}

/**
 * Open the extension options page.
 *
 * @param {import('@playwright/test').BrowserContext} context
 * @param {string} extensionId
 * @returns {Promise<import('@playwright/test').Page>}
 */
async function openOptions(context, extensionId) {
  const url = `chrome-extension://${extensionId}/options.html`;
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');
  return page;
}

// ---------------------------------------------------------------------------
// Auth helpers (inject session storage so tests skip real login)
// ---------------------------------------------------------------------------

/**
 * Inject a mock authentication token into the extension's session storage.
 * This bypasses the login form so tests can start at the main view.
 *
 * Must be called BEFORE navigating to the extension page.
 *
 * @param {import('@playwright/test').Page} page - Extension page
 * @param {object} [opts]
 * @param {string} [opts.token] - Access token
 * @param {string} [opts.orgId] - Org ID
 */
async function injectMockSession(page, opts = {}) {
  await page.addInitScript(
    ({ token, orgId }) => {
      // The extension reads from chrome.storage.session which is stubbed
      // by the mock chrome APIs below. We also set a global flag.
      window.__i360_test_token = token;
      window.__i360_test_orgId = orgId;
    },
    {
      token: opts.token || 'mock-access-token-for-testing',
      orgId: opts.orgId || 'org-test-001',
    }
  );
}

// ---------------------------------------------------------------------------
// API route mocking (intercept requests from the extension popup/sidepanel)
// ---------------------------------------------------------------------------

/**
 * Mock all standard API responses needed by the extension.
 * Call this on the extension page before (or just after) load.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} [overrides] - Override specific mocks
 */
async function mockServerRoutes(page, overrides = {}) {
  const agents = overrides.agents || [
    { id: 'agent-001', name: 'Research Assistant', is_active: true, model: 'claude-sonnet-4-5' },
    { id: 'agent-002', name: 'Writing Coach', is_active: true, model: 'gpt-4o' },
    { id: 'agent-003', name: 'Inactive Agent', is_active: false, model: 'claude-sonnet-4-5' },
  ];

  const conversations = overrides.conversations || [
    {
      id: 'conv-001',
      title: 'First test conversation',
      updated_at: new Date(Date.now() - 3600000).toISOString(),
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'conv-002',
      title: 'Second test conversation',
      updated_at: new Date(Date.now() - 1800000).toISOString(),
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  // Health check
  await page.route(`${DEFAULT_SERVER_URL}/api/health`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        status: 'operational',
        version: '2.1.0',
        timestamp: new Date().toISOString(),
        services: { anthropic: true, openai: true, supabase: true },
      }),
    });
  });

  // Auth login
  await page.route(`${DEFAULT_SERVER_URL}/api/auth/login`, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const body = route.request().postDataJSON() || {};
    if (body.email && body.password) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          access_token: 'mock-access-token-12345',
          expires_at: Date.now() + 3600000,
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Invalid credentials' }),
      });
    }
  });

  // User profile (fetched after login)
  await page.route(`${DEFAULT_SERVER_URL}/api/user-profile`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'user-test-001',
          email: 'test@example.com',
          display_name: 'Test User',
          role: 'admin',
          default_org_id: 'org-test-001',
        },
      }),
    });
  });

  // Agents list
  await page.route(`${DEFAULT_SERVER_URL}/api/agents*`, async (route) => {
    const url = route.request().url();
    // Don't intercept the stream endpoint
    if (url.includes('/execute/stream')) return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: agents }),
    });
  });

  // Conversations list
  await page.route(`${DEFAULT_SERVER_URL}/api/conversations`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: conversations }),
      });
    } else if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() || {};
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'conv-new-' + Date.now(),
            title: body.title || 'Untitled',
            model: body.model || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        }),
      });
    }
  });

  // Specific conversation
  await page.route(`${DEFAULT_SERVER_URL}/api/conversations/*`, async (route) => {
    const url = route.request().url();
    if (url.includes('/messages')) {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() || {};
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'msg-' + Date.now(),
              role: body.role,
              content: body.content,
              created_at: new Date().toISOString(),
            },
          }),
        });
      }
      return;
    }

    const convId = url.split('/').pop();
    const conv = conversations.find((c) => c.id === convId) || conversations[0];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          ...conv,
          messages: [
            { id: 'msg-001', role: 'user', content: 'Hello', created_at: new Date().toISOString() },
            { id: 'msg-002', role: 'assistant', content: 'Hi! How can I help?', created_at: new Date().toISOString() },
          ],
        },
      }),
    });
  });

  // Models
  await page.route(`${DEFAULT_SERVER_URL}/api/chat/models`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        models: {
          anthropic: [{ id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' }],
          openai: [{ id: 'gpt-4o', name: 'GPT-4o' }],
        },
      }),
    });
  });
}

/**
 * Mock the agent streaming endpoint with a controlled SSE response.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} [opts]
 * @param {string[]} [opts.tokens] - Tokens to stream
 * @param {boolean} [opts.guardrailBlocked] - Whether to simulate a blocked response
 */
async function mockStreamingResponse(page, opts = {}) {
  const tokens = opts.tokens || ['Hello', ' from', ' your', ' agent', '.'];

  await page.route(
    `${DEFAULT_SERVER_URL}/api/agents/*/execute/stream`,
    async (route) => {
      if (opts.guardrailBlocked) {
        const body =
          'data: {"type":"guardrail_blocked","message":"Request blocked by guardrails."}\n\n' +
          'data: [DONE]\n\n';
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
          body,
        });
        return;
      }

      let body = '';
      let full = '';
      for (const token of tokens) {
        full += token;
        body += `data: {"type":"token","content":"${token}","fullResponse":"${full.replace(/"/g, '\\"')}"}\n\n`;
      }
      body += `data: {"type":"complete","content":"${full.replace(/"/g, '\\"')}"}\n\n`;
      body += 'data: [DONE]\n\n';

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body,
      });
    }
  );
}

// ---------------------------------------------------------------------------
// Chrome storage stub injector
// ---------------------------------------------------------------------------

/**
 * Inject a chrome.storage stub so the extension's JS can call
 * chrome.storage.session.get/set without a real extension context.
 *
 * This is used when loading the extension HTML files as regular pages
 * (not inside a real extension context) for isolated unit-style UI tests.
 *
 * NOTE: When tests use launchBrowserWithExtension() the real chrome APIs
 * are available and this stub is NOT needed.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} [initialState] - Pre-populated storage state
 */
async function injectChromeStorageStub(page, initialState = {}) {
  await page.addInitScript((state) => {
    const sessionData = { ...state };
    const localData = {};

    window.chrome = window.chrome || {};
    window.chrome.storage = {
      session: {
        get: (keys, cb) => {
          const result = {};
          const keyList = Array.isArray(keys) ? keys : [keys];
          keyList.forEach((k) => {
            if (sessionData[k] !== undefined) result[k] = sessionData[k];
          });
          if (cb) cb(result);
          return Promise.resolve(result);
        },
        set: (data, cb) => {
          Object.assign(sessionData, data);
          if (cb) cb();
          return Promise.resolve();
        },
        clear: (cb) => {
          Object.keys(sessionData).forEach((k) => delete sessionData[k]);
          if (cb) cb();
          return Promise.resolve();
        },
      },
      local: {
        get: (keys, cb) => {
          const result = {};
          const keyList = Array.isArray(keys) ? keys : typeof keys === 'string' ? [keys] : Object.keys(keys);
          keyList.forEach((k) => {
            if (localData[k] !== undefined) result[k] = localData[k];
            else if (keys && typeof keys === 'object' && keys[k] !== undefined) result[k] = keys[k];
          });
          if (cb) cb(result);
          return Promise.resolve(result);
        },
        set: (data, cb) => {
          Object.assign(localData, data);
          if (cb) cb();
          return Promise.resolve();
        },
      },
    };

    window.chrome.runtime = window.chrome.runtime || {
      getManifest: () => ({ version: '1.0.0', name: 'Insight 360 Agent Assistant' }),
      sendMessage: () => {},
      onMessage: { addListener: () => {} },
      lastError: undefined,
      openOptionsPage: () => {},
    };

    window.chrome.tabs = window.chrome.tabs || {
      query: (opts, cb) => {
        if (cb) cb([{ id: 1, url: 'https://example.com', title: 'Example' }]);
        return Promise.resolve([{ id: 1, url: 'https://example.com', title: 'Example' }]);
      },
      sendMessage: (tabId, msg, cb) => {
        if (cb)
          cb({ url: 'https://example.com', title: 'Example', selectedText: 'Selected text', metaDescription: '' });
        return Promise.resolve();
      },
    };
  }, initialState);
}

module.exports = {
  EXTENSION_PATH,
  DEFAULT_SERVER_URL,
  launchBrowserWithExtension,
  getExtensionId,
  openPopup,
  openSidePanel,
  openOptions,
  injectMockSession,
  injectChromeStorageStub,
  mockServerRoutes,
  mockStreamingResponse,
};
