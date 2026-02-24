/**
 * Context Assets Page E2E Tests
 *
 * Tests the context assets page including:
 * - Page load and 3-panel layout
 * - Asset list rendering with template indicators
 * - Asset selection and editor population
 * - Template callout banner and duplicate functionality
 * - Notifications via showToast (not custom .notification elements)
 * - Search and filter controls
 * - CRUD operations (create, edit, delete)
 *
 * Run: npx playwright test context-assets.spec.js
 * Run with UI: npx playwright test context-assets.spec.js --ui
 */

const { test, expect } = require('@playwright/test');
const {
  setupMockAuth,
  waitForPageReady,
} = require('./fixtures/test-utils');

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockAssetTypes = [
  { type_key: 'company_description', display_name: 'Company Description', icon: 'building-2', category: 'core' },
  { type_key: 'voice_dna', display_name: 'VoiceDNA', icon: 'mic', category: 'core' },
  { type_key: 'icp', display_name: 'ICP', icon: 'user', category: 'core' },
];

const mockAssets = [
  {
    id: 'asset-uuid-001',
    name: 'Acme Company Description',
    asset_type: 'company_description',
    description: 'Main company overview',
    content_json: { summary: 'We build software for enterprises' },
    tags: ['core'],
    version: 2,
    is_template: false,
    department_id: null,
    visibility: 'private',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'asset-uuid-002',
    name: 'SaaS VoiceDNA Template',
    asset_type: 'voice_dna',
    description: 'Template for SaaS companies',
    content_json: { tone: 'professional', style: 'conversational' },
    tags: ['template'],
    version: 1,
    is_template: true,
    department_id: null,
    visibility: 'private',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'asset-uuid-003',
    name: 'Enterprise ICP',
    asset_type: 'icp',
    description: 'Ideal customer profile for enterprise segment',
    content_json: { industry: 'Technology', size: '1000+' },
    tags: ['enterprise'],
    version: 3,
    is_template: false,
    department_id: 'dept-uuid-001',
    visibility: 'private',
    created_at: new Date(Date.now() - 259200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

const mockDepartments = [
  { id: 'dept-uuid-001', name: 'Marketing' },
  { id: 'dept-uuid-002', name: 'Development' },
];

// ─── Mock Setup ───────────────────────────────────────────────────────────────

async function setupContextMocks(page, options = {}) {
  const assets = options.assets || mockAssets;
  const assetTypes = options.assetTypes || mockAssetTypes;
  const departments = options.departments || mockDepartments;

  // Asset types
  await page.route('**/api/context/types**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: assetTypes }),
    });
  });

  // Asset list (GET with query params) and create (POST)
  await page.route(/\/api\/context\/assets(\?|$)/, async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: assets }),
      });
    } else if (method === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'asset-uuid-new', ...body, version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Single asset operations (GET/PUT/DELETE) and dependencies
  await page.route('**/api/context/assets/*', async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    if (url.includes('/dependencies')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { hasAny: false, agents: [], workflows: [], actions: [], counts: { agents: 0, workflows: 0, actions: 0, total: 0 } },
        }),
      });
    } else if (url.includes('/versions')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    } else if (method === 'PUT') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { ...assets[0], ...body, version: (assets[0].version || 1) + 1 },
        }),
      });
    } else if (method === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: assets[0] }),
      });
    } else {
      await route.continue();
    }
  });

  // Departments
  await page.route('**/api/departments**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: departments }),
    });
  });

  // Modules (for navigation)
  await page.route('**/api/modules**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  // Usage nudge
  await page.route('**/api/modules/usage**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { warnings: [], blocks: [] } }),
    });
  });

  // Tags
  await page.route('**/api/context/tags**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: ['core', 'template', 'enterprise'] }),
    });
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Context Assets Page', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupMockAuth(page);
    // Set auth cookie so server-side page auth middleware allows access
    await context.addCookies([{
      name: 'auth_token',
      value: 'mock-token-for-testing',
      domain: 'localhost',
      path: '/',
    }]);
    await setupContextMocks(page);
  });

  // ── Page Structure ──────────────────────────────────────────────────────────

  test.describe('Page Structure', () => {
    test('should load with correct title', async ({ page }) => {
      await page.goto('/context.html');
      await waitForPageReady(page);
      await expect(page).toHaveTitle(/Context Assets/);
    });

    test('should display page header with Lucide icon', async ({ page }) => {
      await page.goto('/context.html');
      await waitForPageReady(page);

      const h1 = page.locator('.page-header h1');
      await expect(h1).toContainText('Context Assets');
      // Should have a Lucide database icon (rendered as SVG)
      await expect(h1.locator('svg.lucide')).toBeVisible();
    });

    test('should have three-panel layout', async ({ page }) => {
      await page.goto('/context.html');
      await waitForPageReady(page);

      await expect(page.locator('.asset-list-panel')).toBeVisible();
      await expect(page.locator('.editor-panel')).toBeVisible();
      await expect(page.locator('.markdown-panel')).toBeVisible();
    });

    test('should display help button in header', async ({ page }) => {
      await page.goto('/context.html');
      await waitForPageReady(page);

      await expect(page.locator('.help-btn')).toBeVisible();
    });

    test('should apply saved theme from localStorage', async ({ page }) => {
      // Set theme before navigation
      await page.addInitScript(() => {
        localStorage.setItem('insight360-theme', 'dark');
      });

      await page.goto('/context.html');
      await waitForPageReady(page);

      const theme = await page.getAttribute('html', 'data-theme');
      expect(theme).toBe('dark');
    });
  });

  // ── Asset List ──────────────────────────────────────────────────────────────

  test.describe('Asset List', () => {
    test('should render all mock assets in the list', async ({ page }) => {
      await page.goto('/context.html');
      await waitForPageReady(page);

      const items = page.locator('.asset-item');
      await expect(items).toHaveCount(mockAssets.length);
    });

    test('should display asset name and type info', async ({ page }) => {
      await page.goto('/context.html');
      await waitForPageReady(page);

      // First asset name
      await expect(page.locator('.asset-item').first().locator('.asset-name')).toContainText('Acme Company Description');
      // Type meta
      await expect(page.locator('.asset-item').first().locator('.asset-meta')).toContainText('Company Description');
    });

    test('should display asset count badge', async ({ page }) => {
      await page.goto('/context.html');
      await waitForPageReady(page);

      const count = page.locator('#assetCount');
      await expect(count).toContainText(String(mockAssets.length));
    });

    test('should show empty state when no assets', async ({ page }) => {
      // Re-mock with empty assets
      await page.route(/\/api\/context\/assets(\?|$)/, async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: [] }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/context.html');
      await waitForPageReady(page);

      await expect(page.locator('.empty-state')).toBeVisible();
      await expect(page.locator('.empty-state')).toContainText('No Assets Found');
      // Should use Lucide icon (SVG), not emoji
      await expect(page.locator('.empty-icon svg')).toBeVisible();
    });
  });

  // ── Template Indicators ─────────────────────────────────────────────────────

  test.describe('Template Indicators', () => {
    test('should render template badge on is_template=true asset', async ({ page }) => {
      await page.goto('/context.html');
      await waitForPageReady(page);

      const templateCard = page.locator('.asset-item.is-template');
      await expect(templateCard).toBeVisible();
      await expect(templateCard.locator('.asset-template-badge')).toBeVisible();
      await expect(templateCard.locator('.asset-template-badge')).toHaveText('Template');
    });

    test('should NOT render template badge on non-template assets', async ({ page }) => {
      await page.goto('/context.html');
      await waitForPageReady(page);

      // First asset is not a template
      const firstCard = page.locator('.asset-item').first();
      await expect(firstCard.locator('.asset-template-badge')).not.toBeVisible();
      // Check it doesn't have the is-template class
      await expect(firstCard).not.toHaveClass(/is-template/);
    });

    test('should apply amber left border to template cards', async ({ page }) => {
      await page.goto('/context.html');
      await waitForPageReady(page);

      const templateCard = page.locator('.asset-item.is-template');
      await expect(templateCard).toHaveClass(/is-template/);
    });

    test('should show template callout when template card is selected', async ({ page }) => {
      await page.goto('/context.html');
      await waitForPageReady(page);

      // Click the template asset (second one)
      await page.locator('.asset-item.is-template').click();
      await page.waitForTimeout(300);

      const callout = page.locator('#templateCallout');
      await expect(callout).toBeVisible();
      await expect(callout).toContainText('Template');
      await expect(callout).toContainText('Duplicate and customize');
    });

    test('should show Duplicate button in template callout', async ({ page }) => {
      await page.goto('/context.html');
      await waitForPageReady(page);

      await page.locator('.asset-item.is-template').click();
      await page.waitForTimeout(300);

      await expect(page.locator('#templateCallout .btn-duplicate')).toBeVisible();
      await expect(page.locator('#templateCallout .btn-duplicate')).toContainText('Duplicate');
    });

    test('should NOT show template callout for non-template asset', async ({ page }) => {
      await page.goto('/context.html');
      await waitForPageReady(page);

      // Click the first (non-template) asset
      await page.locator('.asset-item').first().click();
      await page.waitForTimeout(300);

      const callout = page.locator('#templateCallout');
      const isVisible = await callout.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    });

    test('should hide template callout when switching from template to non-template', async ({ page }) => {
      await page.goto('/context.html');
      await waitForPageReady(page);

      // First click template
      await page.locator('.asset-item.is-template').click();
      await page.waitForTimeout(300);
      await expect(page.locator('#templateCallout')).toBeVisible();

      // Then click non-template
      await page.locator('.asset-item').first().click();
      await page.waitForTimeout(300);
      await expect(page.locator('#templateCallout')).not.toBeVisible();
    });

    test('clicking Duplicate should POST new asset with is_template=false', async ({ page }) => {
      let postBody = null;
      await page.route(/\/api\/context\/assets(\?|$)/, async (route) => {
        const method = route.request().method();
        if (method === 'POST') {
          postBody = route.request().postDataJSON();
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { id: 'asset-uuid-dup', ...postBody, version: 1 },
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: mockAssets }),
          });
        }
      });

      await page.goto('/context.html');
      await waitForPageReady(page);

      await page.locator('.asset-item.is-template').click();
      await page.waitForTimeout(300);

      await page.locator('#templateCallout .btn-duplicate').click();
      await page.waitForTimeout(500);

      expect(postBody).not.toBeNull();
      expect(postBody.is_template).toBe(false);
      expect(postBody.name).toContain('Copy of');
      // Should not include 'template' in tags
      expect(postBody.tags).not.toContain('template');
    });
  });

  // ── Asset Selection & Editor ────────────────────────────────────────────────

  test.describe('Asset Selection', () => {
    test('clicking an asset should load it into the editor', async ({ page }) => {
      await page.goto('/context.html');
      await waitForPageReady(page);

      await page.locator('.asset-item').first().click();
      await page.waitForTimeout(300);

      // Editor should show (empty state hidden)
      await expect(page.locator('#editorContent')).toBeVisible();
      await expect(page.locator('#editorEmptyState')).not.toBeVisible();

      // Name should be populated
      await expect(page.locator('#assetName')).toHaveValue('Acme Company Description');
    });

    test('editor title should show asset name', async ({ page }) => {
      await page.goto('/context.html');
      await waitForPageReady(page);

      await page.locator('.asset-item').first().click();
      await page.waitForTimeout(300);

      const editorTitle = page.locator('#editorTitle');
      await expect(editorTitle).toContainText('Acme Company Description');
    });

    test('editor meta should display version info', async ({ page }) => {
      await page.goto('/context.html');
      await waitForPageReady(page);

      await page.locator('.asset-item').first().click();
      await page.waitForTimeout(300);

      await expect(page.locator('#editorMeta')).toBeVisible();
      await expect(page.locator('#editorVersion')).toContainText('Version 2');
    });

    test('should show empty state initially', async ({ page }) => {
      await page.goto('/context.html');
      await waitForPageReady(page);

      await expect(page.locator('#editorEmptyState')).toBeVisible();
      // Empty state should use Lucide icon, not emoji
      await expect(page.locator('#editorEmptyState svg.lucide').first()).toBeVisible();
    });
  });

  // ── Notifications ───────────────────────────────────────────────────────────

  test.describe('Notifications', () => {
    test('should NOT create .notification DOM elements', async ({ page }) => {
      await page.goto('/context.html');
      await waitForPageReady(page);

      // Trigger any action that would show a notification
      await page.locator('.asset-item').first().click();
      await page.waitForTimeout(300);

      // There should be NO .notification elements (old pattern)
      const notificationCount = await page.locator('.notification').count();
      expect(notificationCount).toBe(0);
    });
  });

  // ── Search & Filter ─────────────────────────────────────────────────────────

  test.describe('Search and Filter', () => {
    test('should have type filter dropdown', async ({ page }) => {
      await page.goto('/context.html');
      await waitForPageReady(page);

      const typeFilter = page.locator('#typeFilter, select[name="type"]').first();
      await expect(typeFilter).toBeVisible();
    });

    test('should have search input', async ({ page }) => {
      await page.goto('/context.html');
      await waitForPageReady(page);

      const searchInput = page.locator('#searchInput, input[type="search"], input[placeholder*="Search"]').first();
      await expect(searchInput).toBeVisible();
    });
  });

  // ── No Console Errors ───────────────────────────────────────────────────────

  test.describe('Error-free Loading', () => {
    test('should not throw console errors on load', async ({ page }) => {
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto('/context.html');
      await waitForPageReady(page);

      // Filter out known acceptable errors (e.g., 404s for optional resources)
      const criticalErrors = consoleErrors.filter(
        (err) => !err.includes('favicon') && !err.includes('404') && !err.includes('401') && !err.includes('Failed to load resource')
      );
      expect(criticalErrors).toHaveLength(0);
    });
  });
});
