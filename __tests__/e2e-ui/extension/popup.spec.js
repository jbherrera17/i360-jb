/**
 * Extension Popup E2E Tests
 *
 * Tests the popup.html / popup.js functionality using Playwright with a real
 * Chromium extension context loaded from the extension/ directory.
 *
 * Run with: npx playwright test __tests__/e2e-ui/extension/popup.spec.js
 *
 * Strategy: Launch Chromium with --load-extension, load popup.html directly,
 * inject chrome.storage stubs for unit-fast tests, and mock the server API
 * using page.route() to avoid needing a live backend.
 */

const { test, expect, chromium } = require('@playwright/test');
const path = require('path');
const {
  launchBrowserWithExtension,
  getExtensionId,
  openPopup,
  injectChromeStorageStub,
  mockServerRoutes,
  mockStreamingResponse,
} = require('./extension-helpers');
const os = require('os');

// ---------------------------------------------------------------------------
// Test setup - one browser context per file for speed
// ---------------------------------------------------------------------------

let context;
let extensionId;

test.beforeAll(async () => {
  const tmpDir = os.tmpdir() + '/pw-popup-' + Date.now();
  context = await launchBrowserWithExtension(tmpDir);
  extensionId = await getExtensionId(context);
});

test.afterAll(async () => {
  await context.close();
});

// ---------------------------------------------------------------------------
// Helper: open popup with no authenticated session (unauthenticated state)
// ---------------------------------------------------------------------------
async function openUnauthPopup() {
  const page = await context.newPage();
  await injectChromeStorageStub(page, {
    // no token = unauthenticated
  });
  await mockServerRoutes(page);
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.waitForLoadState('domcontentloaded');
  return page;
}

// ---------------------------------------------------------------------------
// Helper: open popup in authenticated state
// ---------------------------------------------------------------------------
async function openAuthPopup() {
  const page = await context.newPage();
  await injectChromeStorageStub(page, {
    token: 'mock-access-token-12345',
    orgId: 'org-test-001',
  });
  await mockServerRoutes(page);
  await mockStreamingResponse(page, {
    tokens: ['Here', ' is', ' my', ' answer', '.'],
  });
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.waitForLoadState('domcontentloaded');
  // Wait for async init
  await page.waitForTimeout(300);
  return page;
}

// ---------------------------------------------------------------------------
// 1. Popup loads and shows login form when not authenticated
// ---------------------------------------------------------------------------

test('popup shows login form when not authenticated', async () => {
  const page = await openUnauthPopup();

  await expect(page.locator('#loginView')).toBeVisible();
  await expect(page.locator('#mainView')).toHaveClass(/hidden/);

  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.locator('#loginBtn')).toBeVisible();

  await page.close();
});

test('login view has correct form structure', async () => {
  const page = await openUnauthPopup();

  await expect(page.locator('input#email[type="email"]')).toBeVisible();
  await expect(page.locator('input#password[type="password"]')).toBeVisible();
  await expect(page.locator('button#loginBtn')).toHaveText('Sign In');

  await page.close();
});

// ---------------------------------------------------------------------------
// 2. Login flow - successful login shows main view with agents
// ---------------------------------------------------------------------------

test('successful login transitions to main view', async () => {
  const page = await openUnauthPopup();

  await page.locator('#email').fill('user@example.com');
  await page.locator('#password').fill('password123');
  await page.locator('#loginBtn').click();

  // After login, mainView should become visible
  await expect(page.locator('#mainView')).not.toHaveClass(/hidden/, { timeout: 5000 });
  await expect(page.locator('#loginView')).toHaveClass(/hidden/);

  await page.close();
});

test('failed login shows error message', async () => {
  const page = await openUnauthPopup();

  // Override the login route to return 401
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: 'Invalid credentials' }),
    });
  });

  await page.locator('#email').fill('wrong@example.com');
  await page.locator('#password').fill('wrongpass');
  await page.locator('#loginBtn').click();

  await expect(page.locator('#loginError')).not.toBeEmpty({ timeout: 3000 });
  // Login view should still be visible
  await expect(page.locator('#loginView')).toBeVisible();

  await page.close();
});

// ---------------------------------------------------------------------------
// 3. Agent dropdown populates from API
// ---------------------------------------------------------------------------

test('agent select is populated after auth', async () => {
  const page = await openAuthPopup();

  const agentSelect = page.locator('#agentSelect');
  await expect(agentSelect).toBeVisible();

  // Wait for agents to load
  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );

  const optionCount = await agentSelect.evaluate((el) => el.options.length);
  // Should have placeholder + active agents (inactive filtered out)
  expect(optionCount).toBeGreaterThan(1);

  await page.close();
});

test('agent select only shows active agents', async () => {
  const page = await openAuthPopup();

  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );

  // The mock has 2 active agents (agent-001, agent-002) + 1 inactive
  const optionTexts = await page.locator('#agentSelect option').allTextContents();
  expect(optionTexts).not.toContain('Inactive Agent');

  await page.close();
});

// ---------------------------------------------------------------------------
// 4. Quick prompt sends message and receives streaming response
// ---------------------------------------------------------------------------

test('send button is initially visible in main view', async () => {
  const page = await openAuthPopup();

  await expect(page.locator('#sendBtn')).toBeVisible();
  await expect(page.locator('#quickPrompt')).toBeVisible();

  await page.close();
});

test('sending a message shows the response area', async () => {
  const page = await openAuthPopup();

  // Wait for agents to load and select one
  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );
  await page.locator('#agentSelect').selectOption({ index: 1 });

  await page.locator('#quickPrompt').fill('What is 2+2?');
  await page.locator('#sendBtn').click();

  // Response area should appear
  await expect(page.locator('#responseArea')).not.toHaveClass(/hidden/, { timeout: 5000 });

  await page.close();
});

test('response content populates after streaming completes', async () => {
  const page = await openAuthPopup();

  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );
  await page.locator('#agentSelect').selectOption({ index: 1 });

  await page.locator('#quickPrompt').fill('Tell me about AI.');
  await page.locator('#sendBtn').click();

  // Wait for streaming to complete — responseContent should have text
  await expect(page.locator('#responseContent')).not.toBeEmpty({ timeout: 8000 });

  await page.close();
});

// ---------------------------------------------------------------------------
// 5. Export menu appears with Markdown, PDF, Word options
// ---------------------------------------------------------------------------

test('export menu button is present in response area', async () => {
  const page = await openAuthPopup();

  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );
  await page.locator('#agentSelect').selectOption({ index: 1 });
  await page.locator('#quickPrompt').fill('Test export flow.');
  await page.locator('#sendBtn').click();

  await expect(page.locator('#responseArea')).not.toHaveClass(/hidden/, { timeout: 5000 });
  await expect(page.locator('#exportMenuBtn')).toBeVisible();

  await page.close();
});

test('export menu shows Markdown, PDF, Word options when opened', async () => {
  const page = await openAuthPopup();

  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );
  await page.locator('#agentSelect').selectOption({ index: 1 });
  await page.locator('#quickPrompt').fill('Test export options.');
  await page.locator('#sendBtn').click();

  await expect(page.locator('#responseArea')).not.toHaveClass(/hidden/, { timeout: 5000 });
  await expect(page.locator('#responseContent')).not.toBeEmpty({ timeout: 8000 });

  await page.locator('#exportMenuBtn').click();

  // Export menu should now be visible
  await expect(page.locator('#exportMenu')).not.toHaveClass(/hidden/);

  // Check for all three format options
  await expect(
    page.locator('[data-format="markdown"]')
  ).toBeVisible();
  await expect(page.locator('[data-format="pdf"]')).toBeVisible();
  await expect(page.locator('[data-format="docx"]')).toBeVisible();

  await page.close();
});

// ---------------------------------------------------------------------------
// 6. Markdown export downloads .md file
// ---------------------------------------------------------------------------

test('clicking markdown export triggers a download', async () => {
  const page = await openAuthPopup();

  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );
  await page.locator('#agentSelect').selectOption({ index: 1 });
  await page.locator('#quickPrompt').fill('Generate some content for export.');
  await page.locator('#sendBtn').click();

  await expect(page.locator('#responseContent')).not.toBeEmpty({ timeout: 8000 });

  await page.locator('#exportMenuBtn').click();
  await expect(page.locator('#exportMenu')).not.toHaveClass(/hidden/);

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 5000 }),
    page.locator('[data-format="markdown"]').click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/\.md$/);

  await page.close();
});

// ---------------------------------------------------------------------------
// 7. Copy response copies to clipboard
// ---------------------------------------------------------------------------

test('copy button is visible after response appears', async () => {
  const page = await openAuthPopup();

  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );
  await page.locator('#agentSelect').selectOption({ index: 1 });
  await page.locator('#quickPrompt').fill('Copy test message.');
  await page.locator('#sendBtn').click();

  await expect(page.locator('#responseArea')).not.toHaveClass(/hidden/, { timeout: 5000 });
  await expect(page.locator('#copyBtn')).toBeVisible();

  await page.close();
});

test('copy button triggers clipboard write', async () => {
  const page = await openAuthPopup();

  // Grant clipboard permission
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );
  await page.locator('#agentSelect').selectOption({ index: 1 });
  await page.locator('#quickPrompt').fill('Copy clipboard test.');
  await page.locator('#sendBtn').click();

  await expect(page.locator('#responseContent')).not.toBeEmpty({ timeout: 8000 });

  await page.locator('#copyBtn').click();

  // Verify clipboard has content
  const clipboardText = await page.evaluate(() =>
    navigator.clipboard.readText()
  );
  expect(clipboardText).toBeTruthy();
  expect(clipboardText.length).toBeGreaterThan(0);

  await page.close();
});

// ---------------------------------------------------------------------------
// 8. Side panel button is visible and clickable
// ---------------------------------------------------------------------------

test('open side panel button is visible in main view', async () => {
  const page = await openAuthPopup();

  await expect(page.locator('#openSidePanelBtn')).toBeVisible();
  await expect(page.locator('#openSidePanelBtn')).toContainText('Open Side Panel');

  await page.close();
});

// ---------------------------------------------------------------------------
// 15. New conversation (via logout flow restores login view)
// ---------------------------------------------------------------------------

test('logout button returns to login view', async () => {
  const page = await openAuthPopup();

  // Confirm we start in main view
  await expect(page.locator('#mainView')).not.toHaveClass(/hidden/);

  await page.locator('#logoutBtn').click();

  await expect(page.locator('#loginView')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('#mainView')).toHaveClass(/hidden/);

  await page.close();
});
