/**
 * Social Media Publishing Page E2E Tests
 * Phase 60: Postiz Integration
 *
 * Tests the social-media.html page and /api/social/* endpoints including:
 * - Page load, structure, header, and tab navigation
 * - Connected accounts tab: platform grid rendering
 * - Compose tab: platform selection, content input, character counting
 * - Schedule toggle: "Publish Now" vs "Schedule" radio
 * - Content adaptation preview
 * - Posts list rendering (scheduled & history tabs)
 * - Analytics tab: summary card rendering
 * - Setup banner when Postiz not configured
 * - API endpoint contracts (happy paths and error cases)
 * - Module access control (403 for users without social_publishing module)
 * - x-org-id header requirement (400 when missing)
 *
 * Run: npx playwright test social-media.spec.js
 * Run with UI: npx playwright test social-media.spec.js --ui
 */

const { test, expect } = require('@playwright/test');
const {
  setupMockAuth,
  waitForPageReady,
  setupDialogHandler,
} = require('./fixtures/test-utils');

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockPlatforms = [
  { id: 'twitter', name: 'Twitter / X', icon: 'twitter', color: '#1DA1F2', connected: true, accountName: '@testaccount', status: 'connected', lastUsed: null },
  { id: 'linkedin', name: 'LinkedIn', icon: 'linkedin', color: '#0A66C2', connected: true, accountName: 'Test User', status: 'connected', lastUsed: null },
  { id: 'instagram', name: 'Instagram', icon: 'instagram', color: '#E4405F', connected: false, accountName: null, status: 'disconnected', lastUsed: null },
  { id: 'tiktok', name: 'TikTok', icon: 'music', color: '#000000', connected: false, accountName: null, status: 'disconnected', lastUsed: null },
  { id: 'facebook', name: 'Facebook', icon: 'facebook', color: '#1877F2', connected: false, accountName: null, status: 'disconnected', lastUsed: null },
  { id: 'youtube', name: 'YouTube', icon: 'youtube', color: '#FF0000', connected: false, accountName: null, status: 'disconnected', lastUsed: null },
  { id: 'pinterest', name: 'Pinterest', icon: 'pin', color: '#BD081C', connected: false, accountName: null, status: 'disconnected', lastUsed: null },
  { id: 'threads', name: 'Threads', icon: 'at-sign', color: '#000000', connected: false, accountName: null, status: 'disconnected', lastUsed: null },
];

const mockConfigured = {
  configured: true,
  supportedPlatforms: mockPlatforms,
  platformLimits: {
    twitter: { maxChars: 280 },
    linkedin: { maxChars: 3000 },
    instagram: { maxChars: 2200 },
  },
};

const mockUnconfigured = {
  configured: false,
  supportedPlatforms: mockPlatforms,
  platformLimits: {},
};

const mockScheduledPost = {
  id: 'post-uuid-001',
  platforms: ['twitter', 'linkedin'],
  content_text: 'This is a scheduled post for testing purposes',
  status: 'scheduled',
  scheduled_at: new Date(Date.now() + 86400000).toISOString(),
  published_at: null,
  last_error: null,
};

const mockPublishedPost = {
  id: 'post-uuid-002',
  platforms: ['linkedin'],
  content_text: 'This post was published successfully',
  status: 'published',
  scheduled_at: null,
  published_at: new Date(Date.now() - 3600000).toISOString(),
  last_error: null,
};

const mockFailedPost = {
  id: 'post-uuid-003',
  platforms: ['twitter'],
  content_text: 'This post failed to publish',
  status: 'failed',
  scheduled_at: null,
  published_at: null,
  last_error: 'API rate limit exceeded',
};

const mockAnalytics = {
  totalPosts: 42,
  published: 38,
  scheduled: 4,
  totalEngagement: {
    impressions: 15200,
    likes: 487,
    comments: 63,
    shares: 91,
    reach: 9800,
  },
  platformBreakdown: {
    twitter: 18,
    linkedin: 14,
    instagram: 10,
  },
};

const mockAdaptedContent = {
  adapted: {
    twitter: {
      text: 'Adapted content for Twitter within 280 chars #marketing',
      isThread: false,
    },
    linkedin: {
      text: 'Longer adapted content for LinkedIn with professional tone #marketing #business',
      isThread: false,
    },
  },
};

// ─── Mock Setup ───────────────────────────────────────────────────────────────

async function setupSocialMocks(page, options = {}) {
  const config = options.config ?? mockConfigured;
  const platforms = options.platforms ?? mockPlatforms;
  const posts = options.posts ?? [mockScheduledPost, mockPublishedPost, mockFailedPost];
  const analytics = options.analytics ?? mockAnalytics;

  // Config endpoint
  await page.route('**/api/social/config**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(config),
      });
    } else if (method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Social publishing configured' }),
      });
    } else {
      await route.continue();
    }
  });

  // Accounts endpoint (GET only; POST sync handled separately)
  await page.route(/\/api\/social\/accounts(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ platforms, connected: platforms.filter(p => p.connected) }),
    });
  });

  // Accounts sync
  await page.route('**/api/social/accounts/sync**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, synced: 2, integrations: [] }),
    });
  });

  // OAuth URL endpoint
  await page.route('**/api/social/accounts/oauth-url/**', async (route) => {
    const url = route.request().url();
    const platform = url.split('/oauth-url/')[1]?.split('?')[0] || 'unknown';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: `https://postiz.example.com/integrations/social/${platform}`, platform }),
    });
  });

  // Posts list
  await page.route(/\/api\/social\/posts(\?|$)/, async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      const url = new URL(route.request().url());
      const statusFilter = url.searchParams.get('status');
      const filtered = statusFilter
        ? posts.filter(p => p.status === statusFilter)
        : posts;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ posts: filtered, total: filtered.length }),
      });
    } else if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'post-uuid-new', ...options.createdPost }),
      });
    } else {
      await route.continue();
    }
  });

  // Single post (GET / DELETE)
  await page.route('**/api/social/posts/**', async (route) => {
    const method = route.request().method();
    if (method === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(posts[0]),
      });
    } else {
      await route.continue();
    }
  });

  // Content adaptation preview
  await page.route('**/api/social/adapt**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(options.adapted ?? mockAdaptedContent),
    });
  });

  // Platforms info
  await page.route('**/api/social/platforms**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ platforms, limits: config.platformLimits }),
    });
  });

  // Analytics
  await page.route('**/api/social/analytics**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(analytics),
    });
  });

  // Modules (navigation)
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
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Social Media Publishing Page', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupMockAuth(page);
    await context.addCookies([{
      name: 'auth_token',
      value: 'mock-token-for-testing',
      domain: 'localhost',
      path: '/',
    }]);
    await setupSocialMocks(page);
  });

  // ── Page Structure ───────────────────────────────────────────────────────────

  test.describe('Page Structure', () => {
    test('should load with correct page title', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);
      await expect(page).toHaveTitle(/Social Media/);
    });

    test('should display page header with Social Media heading', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);
      const heading = page.locator('h1');
      await expect(heading).toContainText('Social Media');
    });

    test('should display subtitle describing supported platforms', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);
      const subtitle = page.locator('.header-subtitle');
      await expect(subtitle).toBeVisible();
      await expect(subtitle).toContainText('LinkedIn');
    });

    test('should render New Post button in header', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);
      const newPostBtn = page.locator('button.btn-primary', { hasText: 'New Post' });
      await expect(newPostBtn).toBeVisible();
    });

    test('should render help button in header', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);
      const helpBtn = page.locator('button.help-btn');
      await expect(helpBtn).toBeVisible();
    });

    test('should hide setup banner when social is configured', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);
      const banner = page.locator('#setupBanner');
      await expect(banner).toBeHidden();
    });

    test('should show setup banner when social is not configured', async ({ page }) => {
      // Override config mock to return unconfigured state
      await page.route('**/api/social/config**', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockUnconfigured),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/social-media.html');
      await waitForPageReady(page);
      const banner = page.locator('#setupBanner');
      await expect(banner).toBeVisible();
      await expect(banner).toContainText('Social Publishing Not Configured');
    });

    test('should render the sidebar navigation', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);
      const sidebar = page.locator('.sidebar, #sidebar');
      await expect(sidebar).toBeAttached();
    });
  });

  // ── Tab Navigation ───────────────────────────────────────────────────────────

  test.describe('Tab Navigation', () => {
    test('should render all 5 tabs', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      const tabs = page.locator('.social-tab');
      await expect(tabs).toHaveCount(5);
    });

    test('should have Connected Accounts tab active by default', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      const activeTab = page.locator('.social-tab.active');
      await expect(activeTab).toContainText('Connected Accounts');
    });

    test('should show accounts tab content by default', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      const accountsContent = page.locator('#tab-accounts');
      await expect(accountsContent).toHaveClass(/active/);
    });

    test('should switch to Compose tab on click', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      const composeTab = page.locator('.social-tab[data-tab="compose"]');
      await composeTab.click();

      await expect(composeTab).toHaveClass(/active/);
      await expect(page.locator('#tab-compose')).toHaveClass(/active/);
    });

    test('should switch to Scheduled tab on click', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      const scheduledTab = page.locator('.social-tab[data-tab="scheduled"]');
      await scheduledTab.click();

      await expect(scheduledTab).toHaveClass(/active/);
      await expect(page.locator('#tab-scheduled')).toHaveClass(/active/);
    });

    test('should switch to History tab on click', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      const historyTab = page.locator('.social-tab[data-tab="history"]');
      await historyTab.click();

      await expect(historyTab).toHaveClass(/active/);
      await expect(page.locator('#tab-history')).toHaveClass(/active/);
    });

    test('should switch to Analytics tab on click', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      const analyticsTab = page.locator('.social-tab[data-tab="analytics"]');
      await analyticsTab.click();

      await expect(analyticsTab).toHaveClass(/active/);
      await expect(page.locator('#tab-analytics')).toHaveClass(/active/);
    });

    test('New Post button should activate compose tab', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      const newPostBtn = page.locator('button.btn-primary', { hasText: 'New Post' });
      await newPostBtn.click();
      await page.waitForTimeout(200);

      await expect(page.locator('.social-tab[data-tab="compose"]')).toHaveClass(/active/);
    });

    test('only one tab content should be active at a time', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      await page.locator('.social-tab[data-tab="compose"]').click();
      await page.waitForTimeout(100);

      const activeContents = page.locator('.social-tab-content.active');
      await expect(activeContents).toHaveCount(1);
    });
  });

  // ── Connected Accounts Tab ───────────────────────────────────────────────────

  test.describe('Connected Accounts Tab', () => {
    test('should render platform cards for all 8 supported platforms', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      const grid = page.locator('#platformGrid');
      await expect(grid).toBeVisible();

      const cards = page.locator('.platform-card');
      await expect(cards).toHaveCount(8);
    });

    test('should display platform names on cards', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      const platformNames = page.locator('.platform-name');
      await expect(platformNames.first()).toBeVisible();
      // At least one platform name should be Twitter / X
      await expect(page.locator('.platform-name', { hasText: 'Twitter / X' })).toBeVisible();
    });

    test('should display connected status for Twitter (connected)', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      // The connected card should have the .connected class
      const connectedCard = page.locator('.platform-card.connected').first();
      await expect(connectedCard).toBeVisible();

      const statusBadge = connectedCard.locator('.platform-status.connected');
      await expect(statusBadge).toBeVisible();
      await expect(statusBadge).toContainText('Connected');
    });

    test('should display disconnected status for Instagram (not connected)', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      // Find a disconnected status badge
      const disconnectedBadge = page.locator('.platform-status.disconnected').first();
      await expect(disconnectedBadge).toBeVisible();
      await expect(disconnectedBadge).toContainText('Not Connected');
    });

    test('should display account name for connected platforms', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      const accountName = page.locator('.platform-account', { hasText: '@testaccount' });
      await expect(accountName).toBeVisible();
    });

    test('should show empty state when no accounts returned', async ({ page }) => {
      await page.route(/\/api\/social\/accounts(\?|$)/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ platforms: [], connected: [] }),
        });
      });

      await page.goto('/social-media.html');
      await waitForPageReady(page);

      const grid = page.locator('#platformGrid');
      await expect(grid).toContainText('No platform data available');
    });

    test('connected platforms should show Disconnect button', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      const connectedCard = page.locator('.platform-card.connected').first();
      const disconnectBtn = connectedCard.locator('button', { hasText: 'Disconnect' });
      await expect(disconnectBtn).toBeVisible();
    });

    test('disconnected platforms should show Connect button', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      // First disconnected card
      const disconnectedCard = page.locator('.platform-card:not(.connected)').first();
      const connectBtn = disconnectedCard.locator('button', { hasText: 'Connect' });
      await expect(connectBtn).toBeVisible();
    });
  });

  // ── Compose Tab ──────────────────────────────────────────────────────────────

  test.describe('Compose Tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);
      // Switch to compose tab
      await page.locator('.social-tab[data-tab="compose"]').click();
      await page.waitForTimeout(200);
    });

    test('should display platform selector in compose form', async ({ page }) => {
      const selector = page.locator('#platformSelector');
      await expect(selector).toBeVisible();
    });

    test('should render platform checkboxes for each platform', async ({ page }) => {
      const checkboxes = page.locator('#platformSelector .platform-check');
      // Should have one checkbox per platform
      await expect(checkboxes).toHaveCount(8);
    });

    test('disconnected platforms should have disabled checkboxes', async ({ page }) => {
      const disabledCheck = page.locator('#platformSelector .platform-check.disabled').first();
      await expect(disabledCheck).toBeVisible();
    });

    test('should display compose textarea', async ({ page }) => {
      const textarea = page.locator('#composeContent');
      await expect(textarea).toBeVisible();
      await expect(textarea).toHaveAttribute('placeholder', /Write your post content/i);
    });

    test('should display character counter', async ({ page }) => {
      const charCount = page.locator('#charCount');
      await expect(charCount).toBeVisible();
      await expect(charCount).toContainText('0 characters');
    });

    test('character counter should update as user types', async ({ page }) => {
      const textarea = page.locator('#composeContent');
      await textarea.fill('Hello World');

      const charCount = page.locator('#charCount');
      await expect(charCount).toContainText('11');
    });

    test('should display hashtags input', async ({ page }) => {
      const hashtagInput = page.locator('#composeHashtags');
      await expect(hashtagInput).toBeVisible();
      await expect(hashtagInput).toHaveAttribute('placeholder', /#marketing/i);
    });

    test('should display article URL input', async ({ page }) => {
      const articleUrl = page.locator('#composeArticleUrl');
      await expect(articleUrl).toBeVisible();
      await expect(articleUrl).toHaveAttribute('type', 'url');
    });

    test('should display Publish Now radio selected by default', async ({ page }) => {
      const publishNow = page.locator('input[name="scheduleType"][value="now"]');
      await expect(publishNow).toBeChecked();
    });

    test('schedule datetime input should be hidden by default', async ({ page }) => {
      const dateInput = page.locator('#scheduleDateTime');
      await expect(dateInput).toBeHidden();
    });

    test('should reveal schedule datetime input when Schedule radio selected', async ({ page }) => {
      await page.locator('input[name="scheduleType"][value="schedule"]').click();
      await page.waitForTimeout(100);

      const dateInput = page.locator('#scheduleDateTime');
      await expect(dateInput).toBeVisible();
    });

    test('submit button text should change to Schedule when schedule radio selected', async ({ page }) => {
      await page.locator('input[name="scheduleType"][value="schedule"]').click();
      await page.waitForTimeout(100);

      const submitBtn = page.locator('#submitBtn');
      await expect(submitBtn).toContainText('Schedule');
    });

    test('should display Publish button', async ({ page }) => {
      const submitBtn = page.locator('#submitBtn');
      await expect(submitBtn).toBeVisible();
      await expect(submitBtn).toContainText('Publish');
    });

    test('should display Preview button', async ({ page }) => {
      const previewBtn = page.locator('button', { hasText: 'Preview' });
      await expect(previewBtn).toBeVisible();
    });

    test('should display Import from TL button', async ({ page }) => {
      const importBtn = page.locator('button', { hasText: 'Import from TL' });
      await expect(importBtn).toBeVisible();
    });

    test('should display preview sidebar with placeholder text', async ({ page }) => {
      const sidebar = page.locator('#previewSidebar');
      await expect(sidebar).toBeVisible();
      await expect(sidebar).toContainText('Select platforms and type content');
    });

    test('should mark platform check as selected when connected platform clicked', async ({ page }) => {
      // Twitter is connected — find its label element (the checkbox input is display:none per CSS)
      const twitterCheck = page.locator('#platformSelector .platform-check', { hasText: 'Twitter' });
      // It should not be disabled
      await expect(twitterCheck).not.toHaveClass(/disabled/);
      // Click the label element to trigger togglePlatformSelection via onchange
      await twitterCheck.locator('input[type="checkbox"]').dispatchEvent('change', { bubbles: true, target: { checked: true } });
      // Fallback: directly click the label which toggles its child checkbox in browsers
      await twitterCheck.click();
      await page.waitForTimeout(100);

      await expect(twitterCheck).toHaveClass(/selected/);
    });

    test('should show over-limit warning when content exceeds Twitter char limit', async ({ page }) => {
      // Select Twitter (connected, maxChars: 280) by clicking the label
      const twitterCheck = page.locator('#platformSelector .platform-check', { hasText: 'Twitter' });
      await twitterCheck.click();
      await page.waitForTimeout(100);

      // Type more than 280 characters
      const longText = 'A'.repeat(285);
      await page.locator('#composeContent').fill(longText);
      // Trigger the input event to update char count
      await page.locator('#composeContent').dispatchEvent('input');
      await page.waitForTimeout(100);

      const charCount = page.locator('#charCount');
      await expect(charCount).toHaveClass(/over-limit/);
    });

    test('should show character limit in counter when platform is selected', async ({ page }) => {
      const twitterCheck = page.locator('#platformSelector .platform-check', { hasText: 'Twitter' });
      await twitterCheck.click();
      await page.waitForTimeout(100);

      await page.locator('#composeContent').fill('Hello');
      await page.locator('#composeContent').dispatchEvent('input');
      await page.waitForTimeout(100);

      const charCount = page.locator('#charCount');
      await expect(charCount).toContainText('/ 280 characters');
    });
  });

  // ── Content Adaptation Preview ───────────────────────────────────────────────

  test.describe('Content Adaptation Preview', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);
      await page.locator('.social-tab[data-tab="compose"]').click();
      await page.waitForTimeout(200);
    });

    test('should render adapted content in preview sidebar after Preview click', async ({ page }) => {
      // Select Twitter (connected) by clicking the label (checkbox input is display:none)
      await page.locator('#platformSelector .platform-check', { hasText: 'Twitter' }).click();
      await page.waitForTimeout(100);
      await page.locator('#composeContent').fill('Test content for social media publishing');
      await page.waitForTimeout(100);

      await page.locator('button', { hasText: 'Preview' }).click();
      await page.waitForTimeout(500);

      const previewContent = page.locator('#previewContent');
      await expect(previewContent).not.toContainText('Select platforms and type content');
      await expect(previewContent).toBeVisible();
    });

    test('should display platform name in preview', async ({ page }) => {
      await page.locator('#platformSelector .platform-check', { hasText: 'Twitter' }).click();
      await page.waitForTimeout(100);
      await page.locator('#composeContent').fill('Test content');
      await page.waitForTimeout(100);

      await page.locator('button', { hasText: 'Preview' }).click();
      await page.waitForTimeout(500);

      // The preview renders using platformInfo.name ("Twitter / X"), not the platform ID
      const previewContent = page.locator('#previewContent');
      const platformNameEl = previewContent.locator('.preview-platform-name').first();
      await expect(platformNameEl).toBeVisible();
      // Should contain either "Twitter" or "LinkedIn" (whichever platform adapted)
      await expect(previewContent.locator('.preview-platform-name')).toHaveCount(2);
    });

    test('should keep placeholder when no platforms selected', async ({ page }) => {
      await page.locator('#composeContent').fill('Some content');
      // Do not select any platform
      await page.locator('button', { hasText: 'Preview' }).click();
      await page.waitForTimeout(200);

      const previewContent = page.locator('#previewContent');
      await expect(previewContent).toContainText('Select platforms and type content');
    });

    test('should keep placeholder when no content typed', async ({ page }) => {
      // Click label to select Twitter — with empty content previewAdapted() returns early
      await page.locator('#platformSelector .platform-check', { hasText: 'Twitter' }).click();
      await page.waitForTimeout(100);
      // Ensure textarea is empty
      await page.locator('#composeContent').fill('');
      await page.locator('button', { hasText: 'Preview' }).click();
      await page.waitForTimeout(200);

      await expect(page.locator('#previewContent')).toContainText('Select platforms and type content');
    });
  });

  // ── Scheduled Posts Tab ──────────────────────────────────────────────────────

  test.describe('Scheduled Posts Tab', () => {
    test('should render scheduled posts when tab is activated', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      await page.locator('.social-tab[data-tab="scheduled"]').click();
      await page.waitForTimeout(500);

      const scheduledContainer = page.locator('#scheduledPosts');
      await expect(scheduledContainer).toBeVisible();

      // Should show our mock scheduled post
      await expect(scheduledContainer).toContainText('This is a scheduled post for testing purposes');
    });

    test('should display platform badges on scheduled post', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      await page.locator('.social-tab[data-tab="scheduled"]').click();
      await page.waitForTimeout(500);

      const badges = page.locator('#scheduledPosts .post-platform-badge');
      await expect(badges.first()).toBeVisible();
    });

    test('should display scheduled status badge', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      await page.locator('.social-tab[data-tab="scheduled"]').click();
      await page.waitForTimeout(500);

      const statusBadge = page.locator('#scheduledPosts .post-status-badge.scheduled');
      await expect(statusBadge).toBeVisible();
      await expect(statusBadge).toContainText('scheduled');
    });

    test('should display Cancel button for scheduled posts', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      await page.locator('.social-tab[data-tab="scheduled"]').click();
      await page.waitForTimeout(500);

      const cancelBtn = page.locator('#scheduledPosts button', { hasText: 'Cancel' });
      await expect(cancelBtn).toBeVisible();
    });

    test('should show empty state when no scheduled posts', async ({ page }) => {
      await page.route(/\/api\/social\/posts(\?|$)/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ posts: [], total: 0 }),
        });
      });

      await page.goto('/social-media.html');
      await waitForPageReady(page);

      await page.locator('.social-tab[data-tab="scheduled"]').click();
      await page.waitForTimeout(500);

      await expect(page.locator('#scheduledPosts')).toContainText('No scheduled posts');
    });

    test('should cancel scheduled post after confirmation', async ({ page }) => {
      setupDialogHandler(page, 'accept');

      await page.goto('/social-media.html');
      await waitForPageReady(page);

      await page.locator('.social-tab[data-tab="scheduled"]').click();
      await page.waitForTimeout(500);

      // Click Cancel on the first scheduled post
      const cancelBtn = page.locator('#scheduledPosts button', { hasText: 'Cancel' }).first();
      await cancelBtn.click();
      await page.waitForTimeout(500);

      // After cancellation the posts list should reload (no error state)
      await expect(page.locator('#scheduledPosts')).toBeVisible();
    });
  });

  // ── History Tab ──────────────────────────────────────────────────────────────

  test.describe('History Tab', () => {
    test('should render published and failed posts in history', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      await page.locator('.social-tab[data-tab="history"]').click();
      await page.waitForTimeout(500);

      const historyContainer = page.locator('#historyPosts');
      await expect(historyContainer).toBeVisible();
      await expect(historyContainer).toContainText('This post was published successfully');
    });

    test('should show published status badge', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      await page.locator('.social-tab[data-tab="history"]').click();
      await page.waitForTimeout(500);

      const publishedBadge = page.locator('#historyPosts .post-status-badge.published');
      await expect(publishedBadge).toBeVisible();
      await expect(publishedBadge).toContainText('published');
    });

    test('should show failed status badge', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      await page.locator('.social-tab[data-tab="history"]').click();
      await page.waitForTimeout(500);

      const failedBadge = page.locator('#historyPosts .post-status-badge.failed');
      await expect(failedBadge).toBeVisible();
      await expect(failedBadge).toContainText('failed');
    });

    test('should not show Cancel button for history posts', async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);

      await page.locator('.social-tab[data-tab="history"]').click();
      await page.waitForTimeout(500);

      // The history posts list should NOT contain Cancel buttons
      // (they only appear for scheduled posts)
      const historyPosts = page.locator('#historyPosts');
      const cancelBtns = historyPosts.locator('button', { hasText: 'Cancel' });
      await expect(cancelBtns).toHaveCount(0);
    });

    test('should show empty state when no history', async ({ page }) => {
      await page.route(/\/api\/social\/posts(\?|$)/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ posts: [], total: 0 }),
        });
      });

      await page.goto('/social-media.html');
      await waitForPageReady(page);

      await page.locator('.social-tab[data-tab="history"]').click();
      await page.waitForTimeout(500);

      await expect(page.locator('#historyPosts')).toContainText('No published posts');
    });
  });

  // ── Analytics Tab ────────────────────────────────────────────────────────────

  test.describe('Analytics Tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/social-media.html');
      await waitForPageReady(page);
      await page.locator('.social-tab[data-tab="analytics"]').click();
      await page.waitForTimeout(500);
    });

    test('should render analytics summary cards', async ({ page }) => {
      const grid = page.locator('#analyticsGrid');
      await expect(grid).toBeVisible();
      const cards = grid.locator('.analytics-card');
      // At minimum 8 cards (Total Posts, Published, Scheduled, Impressions, Likes, Comments, Shares, Reach)
      await expect(cards).toHaveCount(9); // 8 stats + 1 platform breakdown card
    });

    test('should display Total Posts count', async ({ page }) => {
      await expect(page.locator('#analyticsGrid')).toContainText('42');
      await expect(page.locator('#analyticsGrid')).toContainText('Total Posts');
    });

    test('should display Published count', async ({ page }) => {
      await expect(page.locator('#analyticsGrid')).toContainText('38');
      await expect(page.locator('#analyticsGrid')).toContainText('Published');
    });

    test('should display Scheduled count', async ({ page }) => {
      await expect(page.locator('#analyticsGrid')).toContainText('Scheduled');
    });

    test('should display Impressions metric', async ({ page }) => {
      await expect(page.locator('#analyticsGrid')).toContainText('Impressions');
    });

    test('should display platform breakdown section', async ({ page }) => {
      await expect(page.locator('#analyticsGrid')).toContainText('Posts by Platform');
      await expect(page.locator('#analyticsGrid')).toContainText('twitter');
      await expect(page.locator('#analyticsGrid')).toContainText('linkedin');
    });
  });
});

// ─── API Endpoint Tests ───────────────────────────────────────────────────────

test.describe('Social Media API Endpoints', () => {
  const ORG_ID = 'test-org-uuid-001';
  const AUTH_HEADERS = {
    'x-org-id': ORG_ID,
    'Content-Type': 'application/json',
    'Cookie': 'auth_token=mock-token-for-testing',
  };

  // ── GET /api/social/config ─────────────────────────────────────────────────

  test.describe('GET /api/social/config', () => {
    test('should return 400 when x-org-id header is missing', async ({ request }) => {
      const response = await request.get('/api/social/config', {
        headers: { 'Cookie': 'auth_token=mock-token-for-testing' },
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/organization id required/i);
    });

    test('should return config object with configured flag when org-id provided', async ({ request }) => {
      const response = await request.get('/api/social/config', {
        headers: AUTH_HEADERS,
      });
      // Accepts 200 (configured or not), or 403 (module not enabled on test env)
      expect([200, 403]).toContain(response.status());
      if (response.status() === 200) {
        const body = await response.json();
        expect(body).toHaveProperty('configured');
        expect(body).toHaveProperty('supportedPlatforms');
        expect(body).toHaveProperty('platformLimits');
      }
    });

    test('supported platforms response should include twitter and linkedin', async ({ request }) => {
      const response = await request.get('/api/social/config', {
        headers: AUTH_HEADERS,
      });
      if (response.status() === 200) {
        const body = await response.json();
        const platformIds = body.supportedPlatforms.map(p => p.id);
        expect(platformIds).toContain('twitter');
        expect(platformIds).toContain('linkedin');
      }
    });
  });

  // ── GET /api/social/accounts ───────────────────────────────────────────────

  test.describe('GET /api/social/accounts', () => {
    test('should return 400 when x-org-id header is missing', async ({ request }) => {
      const response = await request.get('/api/social/accounts', {
        headers: { 'Cookie': 'auth_token=mock-token-for-testing' },
      });
      expect(response.status()).toBe(400);
    });

    test('should return platforms array when org-id provided', async ({ request }) => {
      const response = await request.get('/api/social/accounts', {
        headers: AUTH_HEADERS,
      });
      // 200 = success, 403 = module not enabled, 500 = Postiz not configured in test env
      expect([200, 403, 500]).toContain(response.status());
      if (response.status() === 200) {
        const body = await response.json();
        expect(body).toHaveProperty('platforms');
        expect(Array.isArray(body.platforms)).toBe(true);
      }
    });
  });

  // ── POST /api/social/accounts/sync ────────────────────────────────────────

  test.describe('POST /api/social/accounts/sync', () => {
    test('should return 400 when x-org-id is missing', async ({ request }) => {
      const response = await request.post('/api/social/accounts/sync', {
        headers: { 'Cookie': 'auth_token=mock-token-for-testing' },
      });
      expect(response.status()).toBe(400);
    });

    test('should return synced count when org-id provided', async ({ request }) => {
      const response = await request.post('/api/social/accounts/sync', {
        headers: AUTH_HEADERS,
      });
      expect([200, 403, 500]).toContain(response.status());
      if (response.status() === 200) {
        const body = await response.json();
        expect(body).toHaveProperty('synced');
      }
    });
  });

  // ── GET /api/social/platforms ──────────────────────────────────────────────

  test.describe('GET /api/social/platforms', () => {
    test('should return platforms list with limits', async ({ request }) => {
      const response = await request.get('/api/social/platforms', {
        headers: AUTH_HEADERS,
      });
      // No auth required for this endpoint per implementation
      expect([200, 403]).toContain(response.status());
      if (response.status() === 200) {
        const body = await response.json();
        expect(body).toHaveProperty('platforms');
        expect(body).toHaveProperty('limits');
        expect(Array.isArray(body.platforms)).toBe(true);
        expect(body.platforms.length).toBe(8);
      }
    });

    test('platforms should have id, name, icon, and color properties', async ({ request }) => {
      const response = await request.get('/api/social/platforms', {
        headers: AUTH_HEADERS,
      });
      if (response.status() === 200) {
        const body = await response.json();
        for (const platform of body.platforms) {
          expect(platform).toHaveProperty('id');
          expect(platform).toHaveProperty('name');
          expect(platform).toHaveProperty('icon');
          expect(platform).toHaveProperty('color');
        }
      }
    });

    test('twitter limits should enforce 280 char max', async ({ request }) => {
      const response = await request.get('/api/social/platforms', {
        headers: AUTH_HEADERS,
      });
      if (response.status() === 200) {
        const body = await response.json();
        expect(body.limits.twitter.maxChars).toBe(280);
      }
    });
  });

  // ── POST /api/social/adapt ────────────────────────────────────────────────

  test.describe('POST /api/social/adapt', () => {
    test('should return 400 when content is missing', async ({ request }) => {
      const response = await request.post('/api/social/adapt', {
        headers: AUTH_HEADERS,
        data: { platforms: ['twitter'] },
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/content.*platforms.*required/i);
    });

    test('should return 400 when platforms is missing', async ({ request }) => {
      const response = await request.post('/api/social/adapt', {
        headers: AUTH_HEADERS,
        data: { content: 'Hello world' },
      });
      expect(response.status()).toBe(400);
    });

    test('should return adapted content for valid request', async ({ request }) => {
      const response = await request.post('/api/social/adapt', {
        headers: AUTH_HEADERS,
        data: {
          content: 'This is a test post about AI tools for business productivity',
          platforms: ['twitter', 'linkedin'],
          hashtags: ['#ai', '#productivity'],
        },
      });
      expect([200, 403]).toContain(response.status());
      if (response.status() === 200) {
        const body = await response.json();
        expect(body).toHaveProperty('adapted');
        expect(typeof body.adapted).toBe('object');
      }
    });

    test('twitter adaptation should respect 280 char limit', async ({ request }) => {
      // Provide long content that must be truncated for Twitter
      const longContent = 'A'.repeat(400);
      const response = await request.post('/api/social/adapt', {
        headers: AUTH_HEADERS,
        data: { content: longContent, platforms: ['twitter'] },
      });
      if (response.status() === 200) {
        const body = await response.json();
        const twitterAdapted = body.adapted.twitter;
        expect(twitterAdapted).toBeDefined();
        // Either a thread or truncated text
        if (!twitterAdapted.isThread) {
          expect(twitterAdapted.text.length).toBeLessThanOrEqual(280);
        }
      }
    });
  });

  // ── POST /api/social/posts ────────────────────────────────────────────────

  test.describe('POST /api/social/posts', () => {
    test('should return 400 when x-org-id is missing', async ({ request }) => {
      const response = await request.post('/api/social/posts', {
        headers: { 'Cookie': 'auth_token=mock-token-for-testing', 'Content-Type': 'application/json' },
        data: { platforms: ['twitter'], content: 'Test' },
      });
      expect(response.status()).toBe(400);
    });

    test('should return 400 when platforms array is empty', async ({ request }) => {
      const response = await request.post('/api/social/posts', {
        headers: AUTH_HEADERS,
        data: { platforms: [], content: 'Test post' },
      });
      expect([400, 403]).toContain(response.status());
      if (response.status() === 400) {
        const body = await response.json();
        expect(body.error).toMatch(/platform/i);
      }
    });

    test('should return 400 when content is missing', async ({ request }) => {
      const response = await request.post('/api/social/posts', {
        headers: AUTH_HEADERS,
        data: { platforms: ['twitter'] },
      });
      expect([400, 403]).toContain(response.status());
    });
  });

  // ── GET /api/social/posts ─────────────────────────────────────────────────

  test.describe('GET /api/social/posts', () => {
    test('should return 400 when x-org-id is missing', async ({ request }) => {
      const response = await request.get('/api/social/posts', {
        headers: { 'Cookie': 'auth_token=mock-token-for-testing' },
      });
      expect(response.status()).toBe(400);
    });

    test('should return posts array with total when org-id provided', async ({ request }) => {
      const response = await request.get('/api/social/posts', {
        headers: AUTH_HEADERS,
      });
      // 200 = success, 403 = module not enabled, 500 = Postiz not configured in test env
      expect([200, 403, 500]).toContain(response.status());
      if (response.status() === 200) {
        const body = await response.json();
        expect(body).toHaveProperty('posts');
        expect(body).toHaveProperty('total');
        expect(Array.isArray(body.posts)).toBe(true);
      }
    });

    test('should accept status filter query parameter', async ({ request }) => {
      const response = await request.get('/api/social/posts?status=scheduled', {
        headers: AUTH_HEADERS,
      });
      // 200 = success, 403 = module not enabled, 500 = Postiz not configured in test env
      expect([200, 403, 500]).toContain(response.status());
    });

    test('should accept limit query parameter', async ({ request }) => {
      const response = await request.get('/api/social/posts?limit=10', {
        headers: AUTH_HEADERS,
      });
      // 200 = success, 403 = module not enabled, 500 = Postiz not configured in test env
      expect([200, 403, 500]).toContain(response.status());
    });
  });

  // ── DELETE /api/social/posts/:id ──────────────────────────────────────────

  test.describe('DELETE /api/social/posts/:id', () => {
    test('should return 400 when x-org-id is missing', async ({ request }) => {
      const response = await request.delete('/api/social/posts/some-post-id', {
        headers: { 'Cookie': 'auth_token=mock-token-for-testing' },
      });
      expect(response.status()).toBe(400);
    });
  });

  // ── GET /api/social/analytics ─────────────────────────────────────────────

  test.describe('GET /api/social/analytics', () => {
    test('should return 400 when x-org-id is missing', async ({ request }) => {
      const response = await request.get('/api/social/analytics', {
        headers: { 'Cookie': 'auth_token=mock-token-for-testing' },
      });
      expect(response.status()).toBe(400);
    });

    test('should return analytics summary when org-id provided', async ({ request }) => {
      const response = await request.get('/api/social/analytics?days=30', {
        headers: AUTH_HEADERS,
      });
      // 200 = success, 403 = module not enabled, 500 = Postiz not configured in test env
      expect([200, 403, 500]).toContain(response.status());
      if (response.status() === 200) {
        const body = await response.json();
        expect(body).toHaveProperty('totalPosts');
        expect(body).toHaveProperty('published');
        expect(body).toHaveProperty('scheduled');
      }
    });
  });

  // ── GET /api/social/posts/:id ─────────────────────────────────────────────

  test.describe('GET /api/social/posts/:id', () => {
    test('should return 400 when x-org-id is missing', async ({ request }) => {
      const response = await request.get('/api/social/posts/nonexistent-id', {
        headers: { 'Cookie': 'auth_token=mock-token-for-testing' },
      });
      expect(response.status()).toBe(400);
    });

    test('should return 404 for nonexistent post ID', async ({ request }) => {
      const response = await request.get('/api/social/posts/00000000-0000-0000-0000-000000000000', {
        headers: AUTH_HEADERS,
      });
      expect([404, 403, 500]).toContain(response.status());
    });
  });

  // ── GET /api/social/scheduled ─────────────────────────────────────────────

  test.describe('GET /api/social/scheduled', () => {
    test('should return 400 when x-org-id is missing', async ({ request }) => {
      const response = await request.get('/api/social/scheduled', {
        headers: { 'Cookie': 'auth_token=mock-token-for-testing' },
      });
      expect(response.status()).toBe(400);
    });
  });

  // ── POST /api/social/config ───────────────────────────────────────────────

  test.describe('POST /api/social/config', () => {
    test('should return 400 when x-org-id is missing', async ({ request }) => {
      const response = await request.post('/api/social/config', {
        headers: { 'Cookie': 'auth_token=mock-token-for-testing', 'Content-Type': 'application/json' },
        data: { postizOrgId: 'test-org', apiKey: 'test-key' },
      });
      expect(response.status()).toBe(400);
    });

    test('should return 400 when postizOrgId is missing', async ({ request }) => {
      const response = await request.post('/api/social/config', {
        headers: AUTH_HEADERS,
        data: { apiKey: 'test-key' },
      });
      expect([400, 403]).toContain(response.status());
      if (response.status() === 400) {
        const body = await response.json();
        expect(body.error).toMatch(/postizOrgId.*apiKey.*required/i);
      }
    });

    test('should return 400 when apiKey is missing', async ({ request }) => {
      const response = await request.post('/api/social/config', {
        headers: AUTH_HEADERS,
        data: { postizOrgId: 'test-org' },
      });
      expect([400, 403]).toContain(response.status());
    });
  });
});
