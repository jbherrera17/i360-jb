/**
 * Extension Options Page E2E Tests
 *
 * Tests the options.html page which lets users configure:
 * - Server URL
 * - Floating Action Button (FAB) toggle
 * - Notifications toggle
 *
 * Run with: npx playwright test __tests__/e2e-ui/extension/options.spec.js
 */

const { test, expect } = require('@playwright/test');
const os = require('os');
const {
  launchBrowserWithExtension,
  getExtensionId,
  openOptions,
  injectChromeStorageStub,
} = require('./extension-helpers');

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

let context;
let extensionId;

test.beforeAll(async () => {
  const tmpDir = os.tmpdir() + '/pw-options-' + Date.now();
  context = await launchBrowserWithExtension(tmpDir);
  extensionId = await getExtensionId(context);
});

test.afterAll(async () => {
  await context.close();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function openOptionsPage(initialStorage = {}) {
  const page = await context.newPage();
  await injectChromeStorageStub(page, initialStorage);
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForLoadState('domcontentloaded');
  return page;
}

// ---------------------------------------------------------------------------
// 14. Options page saves and loads settings
// ---------------------------------------------------------------------------

test('options page loads successfully', async () => {
  const page = await openOptionsPage();

  await expect(page.locator('h1')).toContainText('Insight 360 Settings');
  await expect(page.locator('#serverUrl')).toBeVisible();
  await expect(page.locator('#showFab')).toBeVisible();
  await expect(page.locator('#showNotifications')).toBeVisible();
  await expect(page.locator('#saveBtn')).toBeVisible();

  await page.close();
});

test('server URL field defaults to localhost:3000', async () => {
  const page = await openOptionsPage({
    serverUrl: undefined,
  });

  const value = await page.locator('#serverUrl').inputValue();
  expect(value).toBe('http://localhost:3000');

  await page.close();
});

test('toggles default to checked', async () => {
  const page = await openOptionsPage();

  // With no stored prefs, both should default to checked
  await expect(page.locator('#showFab')).toBeChecked();
  await expect(page.locator('#showNotifications')).toBeChecked();

  await page.close();
});

test('loads saved server URL from storage', async () => {
  const page = await openOptionsPage({
    serverUrl: 'https://my-i360.example.com',
  });

  const value = await page.locator('#serverUrl').inputValue();
  expect(value).toBe('https://my-i360.example.com');

  await page.close();
});

test('loads saved toggle preferences from storage', async () => {
  const page = await openOptionsPage({
    showFab: false,
    showNotifications: true,
  });

  await expect(page.locator('#showFab')).not.toBeChecked();
  await expect(page.locator('#showNotifications')).toBeChecked();

  await page.close();
});

test('saving settings shows success message', async () => {
  const page = await openOptionsPage();

  await page.locator('#serverUrl').fill('http://localhost:3000');
  await page.locator('#saveBtn').click();

  // Status message should appear
  await expect(page.locator('#statusMsg')).toContainText('saved', { timeout: 3000 });

  await page.close();
});

test('success message disappears after a few seconds', async () => {
  const page = await openOptionsPage();

  await page.locator('#saveBtn').click();
  await expect(page.locator('#statusMsg')).not.toBeEmpty({ timeout: 3000 });

  // After 3 seconds the message should clear (timeout is 2500ms in the code)
  await expect(page.locator('#statusMsg')).toBeEmpty({ timeout: 5000 });

  await page.close();
});

test('server URL trailing slashes are trimmed on save', async () => {
  const page = await openOptionsPage();

  // Capture what gets stored via chrome.storage.local.set
  const storedSettings = await page.evaluate(() => {
    return new Promise((resolve) => {
      const stored = {};
      // Intercept chrome.storage.local.set
      const origSet = window.chrome.storage.local.set.bind(window.chrome.storage.local);
      window.chrome.storage.local.set = (data, cb) => {
        Object.assign(stored, data);
        origSet(data, cb);
        resolve(stored);
      };
      document.getElementById('serverUrl').value = 'http://localhost:3000///';
      document.getElementById('saveBtn').click();
    });
  });

  expect(storedSettings.serverUrl).toBe('http://localhost:3000');

  await page.close();
});

test('toggling FAB checkbox changes its state', async () => {
  const page = await openOptionsPage({ showFab: true });

  await expect(page.locator('#showFab')).toBeChecked();
  await page.locator('#showFab').uncheck();
  await expect(page.locator('#showFab')).not.toBeChecked();

  await page.close();
});

test('toggling notifications checkbox changes its state', async () => {
  const page = await openOptionsPage({ showNotifications: true });

  await expect(page.locator('#showNotifications')).toBeChecked();
  await page.locator('#showNotifications').uncheck();
  await expect(page.locator('#showNotifications')).not.toBeChecked();

  await page.close();
});

test('page header displays extension name and subtitle', async () => {
  const page = await openOptionsPage();

  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.subtitle')).toBeVisible();

  await page.close();
});

test('server URL input has url type attribute', async () => {
  const page = await openOptionsPage();

  const inputType = await page.locator('#serverUrl').getAttribute('type');
  expect(inputType).toBe('url');

  await page.close();
});
