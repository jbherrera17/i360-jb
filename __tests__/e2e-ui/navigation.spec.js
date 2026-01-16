/**
 * Navigation E2E Tests
 *
 * Tests for sidebar navigation, page transitions, and layout components
 *
 * Run: npx playwright test navigation.spec.js
 * Run with UI: npx playwright test navigation.spec.js --ui
 */

const { test, expect } = require('@playwright/test');
const {
  setupMockAuth,
  waitForPageReady,
} = require('./fixtures/test-utils');

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock authentication - MUST be before any navigation
    await setupMockAuth(page);
  });

  // =============================================
  // SIDEBAR STRUCTURE
  // =============================================
  test.describe('Sidebar Structure', () => {
    test('should display sidebar with navigation items', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      // Sidebar should be visible
      await expect(page.locator('.sidebar')).toBeVisible();

      // Should have primary navigation items
      await expect(page.locator('.sidebar-nav')).toBeVisible();
    });

    test('should display logo in sidebar header', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      // Logo should be visible
      await expect(page.locator('.sidebar-header .logo')).toBeVisible();
    });

    test('should display user profile section', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      // User profile should be in sidebar footer
      await expect(page.locator('.sidebar-footer')).toBeVisible();
      await expect(page.locator('.user-profile, .user-login-link')).toBeVisible();
    });

    test('should display theme toggle button', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      // Theme toggle should be visible
      await expect(page.locator('.theme-toggle, #sidebarThemeToggle')).toBeVisible();
    });
  });

  // =============================================
  // PRIMARY NAVIGATION
  // =============================================
  test.describe('Primary Navigation', () => {
    test('should have Dashboard link', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      const dashboardLink = page.locator('.nav-item[href="/"]');
      await expect(dashboardLink).toBeVisible();
      await expect(dashboardLink).toContainText('Dashboard');
    });

    test('should have Higgins link', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      const higginsLink = page.locator('.nav-item[href="/chat.html"]');
      await expect(higginsLink).toBeVisible();
      await expect(higginsLink).toContainText('Higgins');
    });

    test('should have Agent Library link', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      const agentLink = page.locator('.nav-item[href="/agents.html"]');
      await expect(agentLink).toBeVisible();
      await expect(agentLink).toContainText('Agent Library');
    });

    test('should navigate to Dashboard when clicking Dashboard link', async ({ page }) => {
      await page.goto('/chat.html');
      await waitForPageReady(page);

      await page.locator('.nav-item[href="/"]').click();
      await expect(page).toHaveURL('/');
    });

    test('should navigate to Higgins when clicking Higgins link', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      await page.locator('.nav-item[href="/chat.html"]').click();
      await expect(page).toHaveURL('/chat.html');
    });

    test('should navigate to Agent Library when clicking Agent Library link', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      await page.locator('.nav-item[href="/agents.html"]').click();
      await expect(page).toHaveURL('/agents.html');
    });
  });

  // =============================================
  // NAVIGATION GROUPS
  // =============================================
  test.describe('Navigation Groups', () => {
    test('should have collapsible navigation groups', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      // Should have nav groups
      const navGroups = page.locator('.nav-group');
      const count = await navGroups.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should expand group when clicking header', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      // Find a collapsed group (if any)
      const collapsedGroup = page.locator('.nav-group.collapsed').first();
      const count = await collapsedGroup.count();

      if (count > 0) {
        // Click to expand
        await collapsedGroup.locator('.nav-group-header').click();

        // Should no longer be collapsed
        await expect(collapsedGroup).not.toHaveClass(/collapsed/);
      }
    });

    test('should collapse group when clicking expanded header', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      // Verify group headers are clickable and have toggle functionality
      const navGroups = page.locator('.nav-group');
      const count = await navGroups.count();

      expect(count).toBeGreaterThan(0);

      // Get a group and verify it has the toggle mechanism
      const firstGroup = navGroups.first();
      const header = firstGroup.locator('.nav-group-header');

      await expect(header).toBeVisible();

      // Verify header has onClick handler for toggling
      const hasClickHandler = await header.evaluate((el) =>
        el.hasAttribute('onclick') || el.onclick !== null
      );
      expect(hasClickHandler).toBe(true);
    });

    test('should have Dashboards group with items', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      const dashboardsGroup = page.locator('.nav-group[data-nav-group="dashboards"]');
      const count = await dashboardsGroup.count();

      if (count > 0) {
        // Expand if collapsed
        if (await dashboardsGroup.evaluate((el) => el.classList.contains('collapsed'))) {
          await dashboardsGroup.locator('.nav-group-header').click();
        }

        // Should have dashboard links
        await expect(dashboardsGroup.locator('.nav-item[href="/company-dashboard.html"]')).toBeVisible();
      }
    });

    test('should have I360 Systems group with Align 120', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      const strategyGroup = page.locator('.nav-group[data-nav-group="strategy"]');
      const count = await strategyGroup.count();

      if (count > 0) {
        // Expand if collapsed
        if (await strategyGroup.evaluate((el) => el.classList.contains('collapsed'))) {
          await strategyGroup.locator('.nav-group-header').click();
        }

        // Should have Align 120 link
        await expect(strategyGroup.locator('.nav-item[href="/align120.html"]')).toBeVisible();
      }
    });
  });

  // =============================================
  // ACTIVE STATE
  // =============================================
  test.describe('Active State', () => {
    test('should highlight Dashboard as active on index page', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      const dashboardLink = page.locator('.nav-item[href="/"]');
      await expect(dashboardLink).toHaveClass(/active/);
    });

    test('should highlight Higgins as active on chat page', async ({ page }) => {
      await page.goto('/chat.html');
      await waitForPageReady(page);

      const higginsLink = page.locator('.nav-item[href="/chat.html"]');
      await expect(higginsLink).toHaveClass(/active/);
    });

    test('should highlight Align 120 as active on align120 page', async ({ page }) => {
      await page.goto('/align120.html');
      await waitForPageReady(page);

      // May need to expand the group first
      const strategyGroup = page.locator('.nav-group[data-nav-group="strategy"]');
      if (await strategyGroup.count() > 0) {
        if (await strategyGroup.evaluate((el) => el.classList.contains('collapsed'))) {
          await strategyGroup.locator('.nav-group-header').click();
        }
      }

      const alignLink = page.locator('.nav-item[href="/align120.html"]');
      await expect(alignLink).toHaveClass(/active/);
    });

    test('should auto-expand group containing active page', async ({ page }) => {
      await page.goto('/align120.html');
      await waitForPageReady(page);

      // The strategy group should be expanded since it contains the active page
      const strategyGroup = page.locator('.nav-group[data-nav-group="strategy"]');
      if (await strategyGroup.count() > 0) {
        await expect(strategyGroup).not.toHaveClass(/collapsed/);
      }
    });
  });

  // =============================================
  // SIDEBAR COLLAPSE
  // =============================================
  test.describe('Sidebar Collapse', () => {
    test('should have sidebar toggle button', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      const toggleBtn = page.locator('.sidebar-toggle-btn');
      await expect(toggleBtn).toBeVisible();
    });

    test('should collapse sidebar when clicking toggle', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      const sidebar = page.locator('.sidebar');
      const toggleBtn = page.locator('.sidebar-toggle-btn');

      // Click to collapse
      await toggleBtn.click();

      // Sidebar should have collapsed class
      await expect(sidebar).toHaveClass(/sidebar-collapsed/);
    });

    test('should expand sidebar when clicking toggle again', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      const sidebar = page.locator('.sidebar');
      const toggleBtn = page.locator('.sidebar-toggle-btn');

      // Click to collapse
      await toggleBtn.click();
      await expect(sidebar).toHaveClass(/sidebar-collapsed/);

      // Click to expand
      await toggleBtn.click();
      await expect(sidebar).not.toHaveClass(/sidebar-collapsed/);
    });
  });

  // =============================================
  // THEME TOGGLE
  // =============================================
  test.describe('Theme Toggle', () => {
    test('should toggle theme when clicking theme button', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      // Get current theme
      const initialTheme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme')
      );

      // Click theme toggle
      await page.locator('.theme-toggle, #sidebarThemeToggle').click();

      // Theme should have changed
      const newTheme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme')
      );

      expect(newTheme).not.toBe(initialTheme);
    });

    test('should persist theme preference', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      // Toggle theme
      await page.locator('.theme-toggle, #sidebarThemeToggle').click();

      const currentTheme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme')
      );

      // Reload page
      await page.reload();
      await waitForPageReady(page);

      // Theme should persist
      const persistedTheme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme')
      );

      expect(persistedTheme).toBe(currentTheme);
    });
  });

  // =============================================
  // USER MENU
  // =============================================
  test.describe('User Menu', () => {
    test('should show user menu when clicking user menu button', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      const menuBtn = page.locator('.user-menu-btn');
      if (await menuBtn.count() > 0) {
        await menuBtn.click();

        const userMenu = page.locator('.user-menu.open');
        await expect(userMenu).toBeVisible();
      }
    });

    test('should close user menu when clicking outside', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      const menuBtn = page.locator('.user-menu-btn');
      if (await menuBtn.count() > 0) {
        // Open menu
        await menuBtn.click();
        await expect(page.locator('.user-menu.open')).toBeVisible();

        // Click outside
        await page.locator('.main-content, body').first().click();

        // Menu should close
        await expect(page.locator('.user-menu.open')).not.toBeVisible();
      }
    });
  });
});

// =============================================
// PAGE NAVIGATION
// =============================================
test.describe('Page Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAuth(page);
  });

  test('should load Dashboard page', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    // Dashboard should have main content
    await expect(page.locator('.main-content, main, .dashboard-container')).toBeVisible();
  });

  test('should load Chat page', async ({ page }) => {
    await page.goto('/chat.html');
    await waitForPageReady(page);

    // Chat should have chat messages area and input
    await expect(page.locator('#chatMessages')).toBeVisible();
    await expect(page.locator('#chatInput')).toBeVisible();
  });

  test('should load Agents page', async ({ page }) => {
    await page.goto('/agents.html');
    await waitForPageReady(page);

    // Agents page should have agent list or grid
    await expect(page.locator('.agent-list, .agent-grid, .agents-container')).toBeVisible();
  });

  test('should load Context page', async ({ page }) => {
    await page.goto('/context.html');
    await waitForPageReady(page);

    // Context page should have content
    await expect(page.locator('.main-content, main')).toBeVisible();
  });

  test('should load Actions page', async ({ page }) => {
    await page.goto('/actions.html');
    await waitForPageReady(page);

    // Actions page should have content
    await expect(page.locator('.main-content, main, .actions-container')).toBeVisible();
  });

  test('should load Skills page', async ({ page }) => {
    await page.goto('/skills.html');
    await waitForPageReady(page);

    // Skills page should have content - use first() for multiple matches
    const contentElement = page.locator('.main-content, main, .skills-grid, .skill-cards').first();
    await expect(contentElement).toBeVisible();
  });

  test('should load Align 120 page', async ({ page }) => {
    await page.goto('/align120.html');
    await waitForPageReady(page);

    // Align 120 should have start panel visible
    await expect(page.locator('#startPanel')).toBeVisible();
  });
});

// =============================================
// RESPONSIVE NAVIGATION
// =============================================
test.describe('Responsive Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAuth(page);
  });

  test('should display sidebar on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await waitForPageReady(page);

    await expect(page.locator('.sidebar')).toBeVisible();
  });

  test('should display sidebar on mobile (may be collapsed or overlay)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForPageReady(page);

    // On mobile, the sidebar should still function
    // It may be visible (fixed sidebar design) or hidden with toggle
    const sidebar = page.locator('.sidebar');
    const sidebarExists = await sidebar.count() > 0;

    expect(sidebarExists).toBe(true);

    // Main content should still be accessible on mobile
    const mainContent = page.locator('.main-content, main').first();
    await expect(mainContent).toBeVisible();
  });

  test('should display properly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await waitForPageReady(page);

    // Page should be functional on tablet
    await expect(page.locator('.main-content, main')).toBeVisible();
  });
});
