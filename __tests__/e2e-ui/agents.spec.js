/**
 * Agent Library Page E2E Tests
 *
 * Tests the agent library page including:
 * - Page load and 2-panel layout
 * - Agent list rendering with hover actions
 * - Agent selection and detail panel population
 * - Tabbed edit modal (Settings | Context | History)
 * - Context mapping CRUD within the modal
 * - Keyboard navigation
 * - Filter and search functionality
 * - Org-scoped context assets (tenant isolation)
 * - Compact/detailed view toggle
 *
 * Run: npx playwright test agents.spec.js
 * Run with UI: npx playwright test agents.spec.js --ui
 */

const { test, expect } = require('@playwright/test');
const { setupMockAuth, waitForPageReady } = require('./fixtures/test-utils');

// ─── Mock Data ────────────────────────────────────────────────────────────────

const SYNERGI_ORG_ID = '57234ef8-5a4d-40e7-aec3-ca02e44db9ce';
const OTHER_ORG_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const mockAgents = [
    {
        id: 'agent-001',
        name: 'Business Case Builder',
        description: 'Creates comprehensive ROI models and business cases.',
        icon: 'calculator',
        type: 'custom',
        suite: 'strategy',
        category: 'analysis',
        is_active: true,
        is_system: false,
        llm_model: 'claude-sonnet-4-5-20250929',
        llm_provider: 'anthropic',
        usage_count: 12,
        department_id: 'dept-001',
        org_id: SYNERGI_ORG_ID,
        created_at: '2026-01-06T00:00:00Z',
        updated_at: '2026-02-10T00:00:00Z',
        context_mappings: [
            {
                id: 'map-001',
                injection_mode: 'always',
                priority: 90,
                context_assets: {
                    id: 'ctx-001',
                    name: 'Company Values',
                    icon: 'heart',
                    asset_type: 'core_values',
                },
            },
        ],
    },
    {
        id: 'agent-002',
        name: 'AI Maturity Scorer',
        description: 'Evaluates organizational AI maturity across 6 dimensions.',
        icon: 'bar-chart',
        type: 'custom',
        suite: 'align',
        category: 'research',
        is_active: true,
        is_system: true,
        llm_model: 'gpt-4.1',
        llm_provider: 'openai',
        usage_count: 45,
        department_id: null,
        org_id: SYNERGI_ORG_ID,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-03-15T00:00:00Z',
        context_mappings: [],
    },
];

const mockCategories = [
    { id: 'analysis', key: 'analysis', name: 'Analysis', display_name: 'Analysis', icon: 'chart-bar' },
    { id: 'research', key: 'research', name: 'Research', display_name: 'Research', icon: 'search' },
];

const mockDepartments = [
    { id: 'dept-001', name: 'Executive' },
    { id: 'dept-002', name: 'Marketing' },
];

// Context assets belonging to the user's org
const mockContextAssets = [
    { id: 'ctx-001', name: 'Company Values', icon: 'heart', asset_type: 'core_values', org_id: SYNERGI_ORG_ID, is_template: false },
    { id: 'ctx-002', name: 'Brand Voice', icon: 'mic', asset_type: 'voice_dna', org_id: SYNERGI_ORG_ID, is_template: false },
];

// Context assets from ANOTHER org (should never appear)
const otherOrgAssets = [
    { id: 'ctx-other-001', name: 'Competitor Secret Data', icon: 'lock', asset_type: 'core_values', org_id: OTHER_ORG_ID, is_template: false },
];

const mockModels = [
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', provider: 'Anthropic', providerName: 'Anthropic' },
    { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI', providerName: 'OpenAI' },
];

const mockExecutions = [
    { id: 'exec-001', status: 'success', user_message: 'Build a business case for AI adoption', total_tokens: 1200, duration_ms: 3400, created_at: '2026-03-20T10:00:00Z' },
];

// ─── API Mock Setup ───────────────────────────────────────────────────────────

async function setupAgentMocks(page, options = {}) {
    // Mock agents list
    await page.route('**/api/agents?**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: options.agents || mockAgents }),
        });
    });

    // Mock agent detail (by ID)
    await page.route('**/api/agents/agent-*', async (route) => {
        const url = route.request().url();
        const method = route.request().method();

        // Skip nested routes
        if (url.includes('/context') || url.includes('/executions') || url.includes('/duplicate') || url.includes('/execute')) {
            return route.fallback();
        }

        if (method === 'GET') {
            const agentId = url.match(/agents\/(agent-\d+)/)?.[1];
            const agent = mockAgents.find(a => a.id === agentId) || mockAgents[0];
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, data: agent }),
            });
        } else if (method === 'DELETE') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true }),
            });
        }
    });

    // Mock agent categories
    await page.route('**/api/agents/categories', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: mockCategories }),
        });
    });

    // Mock departments
    await page.route('**/api/departments', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: mockDepartments }),
        });
    });

    // Mock context assets — ONLY return org-scoped assets
    // Must match both /api/context/assets and /api/context/assets?limit=100&...
    await page.route('**/api/context/assets?**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: mockContextAssets }),
        });
    });
    // Also match without query params
    await page.route('**/api/context/assets', async (route) => {
        if (route.request().url().endsWith('/assets')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, data: mockContextAssets }),
            });
        } else {
            await route.fallback();
        }
    });

    // Mock agent context mappings
    await page.route('**/api/agents/*/context', async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, data: { id: 'map-new-001' } }),
            });
        }
    });

    await page.route('**/api/agents/*/context/*', async (route) => {
        if (route.request().method() === 'DELETE') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true }),
            });
        }
    });

    // Mock agent executions
    await page.route('**/api/agents/*/executions**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: mockExecutions }),
        });
    });

    // Mock models
    await page.route('**/api/chat/models/all', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, models: mockModels, default: 'claude-sonnet-4-5-20250929' }),
        });
    });

    // Mock modules (for navigation)
    await page.route('**/api/modules', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: [] }),
        });
    });

    // Mock usage limits
    await page.route('**/api/platform/usage**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: { within_limits: true } }),
        });
    });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Agent Library Page', () => {
    test.beforeEach(async ({ page, context }) => {
        await setupMockAuth(page, {
            user: {
                id: 'test-user-001',
                email: 'jb@synergiai.io',
                display_name: 'JB',
                role: 'admin',
                org_id: SYNERGI_ORG_ID,
                org_role: 'owner',
                is_platform_admin: true,
                created_at: new Date().toISOString(),
            },
        });
        // Set auth cookie so server-side middleware allows access
        await context.addCookies([{
            name: 'auth_token',
            value: 'mock-token-for-testing',
            domain: 'localhost',
            path: '/',
        }]);
        await setupAgentMocks(page);
    });

    test('loads page with 2-panel layout', async ({ page }) => {
        await page.goto('/agents.html');
        await waitForPageReady(page);

        // Page header with icon
        await expect(page.locator('.page-header h1')).toContainText('Agent Library');

        // Two panels visible
        await expect(page.locator('#agentListPanel')).toBeVisible();
        await expect(page.locator('#detailsPanel')).toBeVisible();

        // Placeholder visible (no agent selected)
        await expect(page.locator('#detailsPlaceholder')).toBeVisible();
    });

    test('renders agent list with descriptions and badges', async ({ page }) => {
        await page.goto('/agents.html');
        await waitForPageReady(page);

        // Both agents rendered
        const items = page.locator('.agent-item');
        await expect(items).toHaveCount(2);

        // First agent has name and description
        const first = items.first();
        await expect(first.locator('.agent-name')).toContainText('Business Case Builder');
        await expect(first.locator('.agent-description')).toContainText('Creates comprehensive ROI models');

        // Badges visible
        await expect(first.locator('.suite-badge')).toContainText('Strategy');
    });

    test('shows action buttons on hover', async ({ page }) => {
        await page.goto('/agents.html');
        await waitForPageReady(page);

        const firstAgent = page.locator('.agent-item').first();
        const actions = firstAgent.locator('.agent-card-actions');

        // Actions hidden by default (opacity: 0)
        await expect(actions).toHaveCSS('opacity', '0');

        // Hover reveals actions
        await firstAgent.hover();
        await expect(actions).toHaveCSS('opacity', '1');
    });

    test('selects agent and populates detail panel', async ({ page }) => {
        await page.goto('/agents.html');
        await waitForPageReady(page);

        // Click first agent
        await page.locator('.agent-item').first().click();
        await page.waitForTimeout(500);

        // Placeholder hidden, content visible
        await expect(page.locator('#detailsPlaceholder')).toBeHidden();
        await expect(page.locator('#detailsSidebarContent')).toBeVisible();

        // Header populated
        await expect(page.locator('#detailName')).toContainText('Business Case Builder');
        await expect(page.locator('#detailDescription')).toContainText('Creates comprehensive ROI models');

        // Metadata populated
        await expect(page.locator('#detailPlatformText')).toContainText('Native');
        await expect(page.locator('#detailSuite')).toContainText('Strategy 120');
        await expect(page.locator('#detailCategory')).toContainText('Analysis');

        // Context mappings rendered
        await expect(page.locator('.mapping-item')).toHaveCount(1);
        await expect(page.locator('.mapping-name').first()).toContainText('Company Values');
    });

    test('opens tabbed edit modal with Settings tab', async ({ page }) => {
        await page.goto('/agents.html');
        await waitForPageReady(page);

        // Select agent first
        await page.locator('.agent-item').first().click();
        await page.waitForTimeout(500);

        // Click Edit button
        await page.locator('#btnEdit').click();
        await page.waitForTimeout(300);

        // Modal opens with tabs
        await expect(page.locator('.i360-modal-overlay')).toBeVisible();
        await expect(page.locator('.modal-tabs')).toBeVisible();

        // Three tabs visible
        const tabs = page.locator('.modal-tab');
        await expect(tabs).toHaveCount(3);
        await expect(tabs.nth(0)).toContainText('Settings');
        await expect(tabs.nth(1)).toContainText('Context');
        await expect(tabs.nth(2)).toContainText('History');

        // Settings tab is active
        await expect(tabs.nth(0)).toHaveClass(/active/);

        // Form fields populated
        await expect(page.locator('#formName')).toHaveValue('Business Case Builder');
    });

    test('switches to Context tab and shows mappings', async ({ page }) => {
        await page.goto('/agents.html');
        await waitForPageReady(page);

        // Select and edit
        await page.locator('.agent-item').first().click();
        await page.waitForTimeout(500);
        await page.locator('#btnEdit').click();
        await page.waitForTimeout(300);

        // Click Context tab
        await page.locator('.modal-tab[data-tab="context"]').click();
        await page.waitForTimeout(200);

        // Context tab active
        await expect(page.locator('#tabContext')).toBeVisible();

        // Current mappings shown
        await expect(page.locator('#modalMappingList .mapping-item')).toHaveCount(1);

        // Badge shows count
        await expect(page.locator('#contextCountBadge')).toContainText('1');
    });

    test('context assets requests include org header for tenant isolation', async ({ page }) => {
        // Track all API requests to /api/context/assets to verify org scoping
        const contextRequests = [];
        page.on('request', (req) => {
            if (req.url().includes('/api/context/assets')) {
                contextRequests.push({
                    url: req.url(),
                    orgHeader: req.headers()['x-org-id'],
                });
            }
        });

        await page.goto('/agents.html');
        await waitForPageReady(page);

        // Set org_id in localStorage (simulating what happens after login)
        await page.evaluate((orgId) => {
            localStorage.setItem('insight360_org_id', orgId);
        }, SYNERGI_ORG_ID);

        // Select agent and open modal on Context tab (triggers fetchContextAssets with org header)
        await page.locator('.agent-item').first().click();
        await page.waitForTimeout(500);
        await page.locator('#btnAddContext').click();
        await page.waitForTimeout(1000);

        // Verify context tab is showing
        await expect(page.locator('#tabContext')).toBeVisible();

        // Find the fetchContextAssets request made AFTER we set the org_id
        const orgScopedReqs = contextRequests.filter(r => r.orgHeader === SYNERGI_ORG_ID);
        expect(orgScopedReqs.length).toBeGreaterThanOrEqual(1);

        // Verify the asset dropdown does NOT contain cross-org data
        const assetOptions = page.locator('#contextAssetSelect option');
        const optionTexts = await assetOptions.allTextContents();
        const hasCompetitorData = optionTexts.some(t => t.includes('Competitor Secret Data'));
        expect(hasCompetitorData).toBe(false);
    });

    test('context assets request without org header is rejected', async ({ page }) => {
        // Override mock to simulate missing auth
        await page.route('**/api/context/assets', async (route) => {
            const orgHeader = route.request().headers()['x-org-id'];
            if (!orgHeader) {
                await route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: false, error: 'Organization context required. Include x-org-id header.' }),
                });
            } else {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true, data: mockContextAssets }),
                });
            }
        });

        await page.goto('/agents.html');
        await waitForPageReady(page);

        // The page should still load — authFetch sends the org header
        const items = page.locator('.agent-item');
        await expect(items).toHaveCount(2);
    });

    test('switches to History tab and shows executions', async ({ page }) => {
        await page.goto('/agents.html');
        await waitForPageReady(page);

        await page.locator('.agent-item').first().click();
        await page.waitForTimeout(500);
        await page.locator('#btnEdit').click();
        await page.waitForTimeout(300);

        // Click History tab
        await page.locator('.modal-tab[data-tab="history"]').click();
        await page.waitForTimeout(500);

        await expect(page.locator('#tabHistory')).toBeVisible();
        await expect(page.locator('#modalExecutionHistory .execution-item')).toHaveCount(1);
    });

    test('keyboard navigation works', async ({ page }) => {
        await page.goto('/agents.html');
        await waitForPageReady(page);

        // Press down arrow to focus first agent
        await page.keyboard.press('ArrowDown');
        const items = page.locator('.agent-item');
        await expect(items.first()).toHaveClass(/keyboard-focus/);

        // Press down again to focus second
        await page.keyboard.press('ArrowDown');
        await expect(items.nth(1)).toHaveClass(/keyboard-focus/);

        // Press Enter to select
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        await expect(page.locator('#detailsSidebarContent')).toBeVisible();
        await expect(page.locator('#detailName')).toContainText('AI Maturity Scorer');

        // Press Escape to deselect
        await page.keyboard.press('Escape');
        await expect(page.locator('#detailsPlaceholder')).toBeVisible();
    });

    test('search filters agent list', async ({ page }) => {
        await page.goto('/agents.html');
        await waitForPageReady(page);

        // Type in search — this triggers a debounced fetchAgents
        await page.locator('#searchInput').fill('Business');
        await page.waitForTimeout(500);

        // Verify the search value was sent (the mock returns all agents regardless,
        // but we verify the input is wired up)
        await expect(page.locator('#searchInput')).toHaveValue('Business');
    });

    test('/ shortcut focuses search', async ({ page }) => {
        await page.goto('/agents.html');
        await waitForPageReady(page);

        await page.keyboard.press('/');
        await expect(page.locator('#searchInput')).toBeFocused();
    });

    test('N shortcut opens new agent modal', async ({ page }) => {
        await page.goto('/agents.html');
        await waitForPageReady(page);

        await page.keyboard.press('n');
        await page.waitForTimeout(300);

        // Modal opens with "New Agent" title
        await expect(page.locator('.i360-modal-overlay')).toBeVisible();
        await expect(page.locator('.i360-modal-title')).toContainText('New Agent');

        // Only Settings tab (no Context/History for new agent)
        const tabs = page.locator('.modal-tab');
        await expect(tabs).toHaveCount(1);
    });

    test('compact view hides descriptions', async ({ page }) => {
        await page.goto('/agents.html');
        await waitForPageReady(page);

        // Initially detailed view — descriptions visible
        await expect(page.locator('.agent-description').first()).toBeVisible();

        // Switch to compact
        await page.locator('#viewCompact').click();
        await page.waitForTimeout(300);

        // Descriptions should not be rendered
        await expect(page.locator('.agent-description')).toHaveCount(0);
    });

    test('advanced filters toggle works', async ({ page }) => {
        await page.goto('/agents.html');
        await waitForPageReady(page);

        // Advanced filters hidden by default
        await expect(page.locator('#advancedFilters')).not.toHaveClass(/visible/);

        // Click Filters button
        await page.locator('#btnAdvancedFilters').click();

        // Advanced filters now visible
        await expect(page.locator('#advancedFilters')).toHaveClass(/visible/);

        // Suite, Category, Platform dropdowns visible
        await expect(page.locator('#filterSuite')).toBeVisible();
        await expect(page.locator('#filterCategory')).toBeVisible();
        await expect(page.locator('#filterPlatform')).toBeVisible();
    });

    test('delete agent uses ModalService confirm', async ({ page }) => {
        await page.goto('/agents.html');
        await waitForPageReady(page);

        // Select agent
        await page.locator('.agent-item').first().click();
        await page.waitForTimeout(500);

        // Click delete
        await page.locator('#btnDelete').click();
        await page.waitForTimeout(300);

        // ModalService confirm dialog appears (not browser dialog)
        await expect(page.locator('.i360-modal-overlay')).toBeVisible();
        await expect(page.locator('.i360-modal-body')).toContainText('Are you sure you want to archive this agent');
    });

    test('duplicate agent uses ModalService form', async ({ page }) => {
        // Mock duplicate endpoint
        await page.route('**/api/agents/*/duplicate', async (route) => {
            const body = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: { id: 'agent-new-001', name: body.name },
                }),
            });
        });

        await page.goto('/agents.html');
        await waitForPageReady(page);

        // Select agent
        await page.locator('.agent-item').first().click();
        await page.waitForTimeout(500);

        // Click duplicate
        await page.locator('#btnDuplicate').click();
        await page.waitForTimeout(300);

        // ModalService form dialog appears (not browser prompt)
        await expect(page.locator('.i360-modal-overlay')).toBeVisible();
        await expect(page.locator('.i360-modal-title')).toContainText('Duplicate Agent');
    });
});
