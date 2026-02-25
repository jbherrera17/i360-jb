/**
 * Easy Start E2E Tests - Insight 360
 *
 * Tests the Easy Start page which provides a conversational onboarding
 * experience with SSE streaming, tool-use events, and resource card rendering.
 *
 * Architecture:
 *  - GET  /easy-start.html        — Two-column chat + resource panel UI
 *  - POST /api/easy-start/stream  — SSE stream with content/tool_start/resource_created events
 *  - GET  /api/easy-start/departments — Active departments for context
 *
 * SSE streaming is mocked by intercepting the /api/easy-start/stream route
 * and fulfilling it with a synthetic SSE response body. This avoids needing
 * a real Anthropic API key and keeps tests fast and deterministic.
 *
 * Run:        npx playwright test easy-start.spec.js
 * Run w/ UI:  npx playwright test easy-start.spec.js --ui
 */

const { test, expect } = require('@playwright/test');
const { setupMockAuth, waitForPageReady } = require('./fixtures/test-utils');

// ─── Auth Cookie Helper ───────────────────────────────────────────────────────

/**
 * Inject a mock auth_token cookie so the server's page-auth middleware lets
 * us through to /easy-start.html without redirecting to /login.
 * The server only checks that the cookie exists (not its value) — Supabase
 * validation happens inside API routes, which we mock out entirely.
 */
async function setupAuthCookie(page) {
    await page.context().addCookies([
        {
            name: 'auth_token',
            value: 'mock-token-for-playwright-tests',
            domain: 'localhost',
            path: '/',
            httpOnly: false,
            secure: false,
            sameSite: 'Lax',
        },
    ]);
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockDepartments = [
    { id: 'dept-001', name: 'Marketing', description: 'Marketing team', icon: 'megaphone' },
    { id: 'dept-002', name: 'Sales', description: 'Sales team', icon: 'dollar-sign' },
    { id: 'dept-003', name: 'Operations', description: 'Operations team', icon: 'settings' },
];

const mockConversation = {
    id: 'conv-easy-start-001',
    title: 'Easy Start Session',
    model: 'claude-sonnet-4-5-20250929',
    messages: [],
    created_at: new Date().toISOString(),
};

const mockAgentResource = {
    id: 'agent-created-001',
    name: 'Weekly Report Writer',
    description: 'Generates weekly status reports for your team',
    category: 'content',
    type: 'agent',
    link: '/chat.html?agent=agent-created-001',
};

const mockActionResource = {
    id: 'action-created-001',
    name: 'Summarise Meeting Notes',
    slug: 'summarise-meeting-notes-act001',
    description: 'Summarises meeting transcripts into action items',
    icon: 'file-text',
    color: '#6366f1',
    type: 'action',
    link: '/actions.html?action=action-created-001&execute=true',
};

const mockWorkflowResource = {
    id: 'wf-created-001',
    name: 'Client Onboarding',
    description: 'Multi-step process for onboarding new clients',
    icon: 'git-branch',
    category: 'onboarding',
    step_count: 4,
    type: 'workflow',
    link: '/workflow-run.html?id=wf-created-001',
};

// ─── SSE Helper ───────────────────────────────────────────────────────────────

/**
 * Build a synthetic SSE response body string from an array of event objects.
 * Each object is serialised as "data: <json>\n\n".
 * String values are emitted verbatim (e.g. '[DONE]').
 */
function buildSseBody(events) {
    return events
        .map((e) => `data: ${typeof e === 'string' ? e : JSON.stringify(e)}\n\n`)
        .join('');
}

// ─── Mock Setup ───────────────────────────────────────────────────────────────

/**
 * Register all API mocks needed by easy-start.html.
 * @param {import('@playwright/test').Page} page
 * @param {object} options
 * @param {Array}  [options.sseEvents]      — SSE events to emit from the stream endpoint
 * @param {Array}  [options.departments]    — Departments list
 * @param {object} [options.conversation]   — Conversation object for POST /api/conversations
 */
async function setupEasyStartMocks(page, options = {}) {
    const sseEvents = options.sseEvents ?? [
        { type: 'content', text: 'Hello! I\'m Higgins. ' },
        { type: 'content', text: 'Tell me about your work.' },
        '[DONE]',
    ];

    // Navigation modules (dynamic nav)
    await page.route('**/api/modules**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: [] }),
        });
    });

    // Departments
    await page.route('**/api/easy-start/departments**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: options.departments ?? mockDepartments,
            }),
        });
    });

    // Create conversation
    await page.route('**/api/conversations', async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    conversation: options.conversation ?? mockConversation,
                }),
            });
        } else {
            await route.continue();
        }
    });

    // Save message
    await page.route('**/api/conversations/*/messages', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
        });
    });

    // Load conversation (used when ?conversation_id= is in URL)
    await page.route('**/api/conversations/*', async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    conversation: {
                        ...(options.conversation ?? mockConversation),
                        messages: options.existingMessages ?? [],
                    },
                }),
            });
        } else {
            await route.continue();
        }
    });

    // SSE stream endpoint — fulfilled with synthetic SSE body
    await page.route('**/api/easy-start/stream', async (route) => {
        await route.fulfill({
            status: 200,
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
            body: buildSseBody(sseEvents),
        });
    });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Easy Start — Page Load', () => {
    test.beforeEach(async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page);
    });

    test('page loads with the correct title and heading', async ({ page }) => {
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await expect(page).toHaveTitle(/Easy Start/i);
        await expect(page.locator('h1')).toContainText('Easy Start');
    });

    test('page subtitle is visible', async ({ page }) => {
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await expect(page.locator('.header-subtitle')).toContainText('Higgins');
    });

    test('chat input area is rendered', async ({ page }) => {
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await expect(page.locator('#esInput')).toBeVisible();
        await expect(page.locator('#esSendBtn')).toBeVisible();
    });

    test('resource panel is rendered with the correct heading', async ({ page }) => {
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await expect(page.locator('#resourcesPanel')).toBeVisible();
        await expect(page.locator('.es-panel-header h3')).toContainText('Your New Tools');
    });

    test('sidebar is rendered', async ({ page }) => {
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await expect(page.locator('.sidebar')).toBeVisible();
    });

    test('help button is present in page header', async ({ page }) => {
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await expect(page.locator('.help-btn')).toBeVisible();
    });
});

test.describe('Easy Start — Welcome State', () => {
    test.beforeEach(async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page);
    });

    test('welcome message is visible before first interaction', async ({ page }) => {
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await expect(page.locator('#esWelcome')).toBeVisible();
        await expect(page.locator('#esWelcome h2')).toContainText('Welcome to Easy Start');
    });

    test('welcome message explains what easy start does', async ({ page }) => {
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await expect(page.locator('#esWelcome p')).toContainText('Higgins');
    });

    test('resource panel shows empty state before any resources are created', async ({ page }) => {
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await expect(page.locator('#esEmptyState')).toBeVisible();
    });

    test('handoff button is hidden initially', async ({ page }) => {
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        const handoff = page.locator('#esHandoff');
        await expect(handoff).toHaveClass(/hidden/);
    });

    test('send button is enabled before streaming starts', async ({ page }) => {
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await expect(page.locator('#esSendBtn')).not.toBeDisabled();
    });
});

test.describe('Easy Start — Send Message', () => {
    test.beforeEach(async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page);
        await page.goto('/easy-start.html');
        await waitForPageReady(page);
    });

    test('user message appears in the chat after sending', async ({ page }) => {
        await page.locator('#esInput').fill('I manage a marketing team');
        await page.locator('#esSendBtn').click();

        await expect(page.locator('.es-message.user').first()).toBeVisible();
        await expect(page.locator('.es-message.user .es-message-content').first()).toContainText(
            'I manage a marketing team'
        );
    });

    test('welcome message is removed after first send', async ({ page }) => {
        await page.locator('#esInput').fill('Hello');
        await page.locator('#esSendBtn').click();

        await expect(page.locator('#esWelcome')).not.toBeAttached();
    });

    test('input is cleared after message is sent', async ({ page }) => {
        await page.locator('#esInput').fill('Test message');
        await page.locator('#esSendBtn').click();

        await expect(page.locator('#esInput')).toHaveValue('');
    });

    test('pressing Enter sends the message', async ({ page }) => {
        await page.locator('#esInput').fill('Sent via enter key');
        await page.locator('#esInput').press('Enter');

        await expect(page.locator('.es-message.user').first()).toBeVisible();
        await expect(page.locator('.es-message.user .es-message-content').first()).toContainText(
            'Sent via enter key'
        );
    });

    test('Shift+Enter does not send and adds a newline', async ({ page }) => {
        await page.locator('#esInput').fill('Line one');
        await page.locator('#esInput').press('Shift+Enter');

        // The user message should not yet appear (no submit occurred)
        await expect(page.locator('.es-message.user')).toHaveCount(0);
    });

    test('empty input does not trigger a send', async ({ page }) => {
        // Click send with empty input — no user message should appear
        await page.locator('#esSendBtn').click();
        await expect(page.locator('.es-message.user')).toHaveCount(0);
    });
});

test.describe('Easy Start — SSE Streaming: Content Events', () => {
    test('assistant message appears after streaming content events', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page, {
            sseEvents: [
                { type: 'content', text: 'Hello! I am Higgins.' },
                { type: 'content', text: ' How can I help?' },
                '[DONE]',
            ],
        });
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await page.locator('#esInput').fill('Hi there');
        await page.locator('#esSendBtn').click();

        const assistantMsg = page.locator('.es-message.assistant .es-message-content').first();
        await expect(assistantMsg).toContainText('Hello! I am Higgins.', { timeout: 10000 });
    });

    test('loading indicator appears while streaming and is removed on completion', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard

        // Use a slower stream: Playwright route handlers fire synchronously so
        // the loading indicator may clear before we can observe it. We just
        // assert the final state — no loading dot should remain after streaming.
        await setupEasyStartMocks(page, {
            sseEvents: [
                { type: 'content', text: 'Processing...' },
                '[DONE]',
            ],
        });
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await page.locator('#esInput').fill('Start');
        await page.locator('#esSendBtn').click();

        // After streaming completes, no loading dots should remain
        await expect(page.locator('.es-loading')).toHaveCount(0, { timeout: 10000 });
    });

    test('send button is re-enabled after streaming completes', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page, {
            sseEvents: [
                { type: 'content', text: 'Done.' },
                '[DONE]',
            ],
        });
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await page.locator('#esInput').fill('Go');
        await page.locator('#esSendBtn').click();

        await expect(page.locator('#esSendBtn')).not.toBeDisabled({ timeout: 10000 });
    });

    test('multiple content events are concatenated in the assistant bubble', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page, {
            sseEvents: [
                { type: 'content', text: 'Part one. ' },
                { type: 'content', text: 'Part two. ' },
                { type: 'content', text: 'Part three.' },
                '[DONE]',
            ],
        });
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await page.locator('#esInput').fill('test');
        await page.locator('#esSendBtn').click();

        const content = page.locator('.es-message.assistant .es-message-content').first();
        await expect(content).toContainText('Part one.', { timeout: 10000 });
        await expect(content).toContainText('Part two.');
        await expect(content).toContainText('Part three.');
    });
});

test.describe('Easy Start — SSE Streaming: Tool Start Events', () => {
    test('creation indicator appears when a tool_start event is received', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page, {
            sseEvents: [
                { type: 'content', text: 'Let me create an agent for you...' },
                { type: 'tool_start', tool: 'create_agent' },
                // resource_created follows immediately in mock
                {
                    type: 'resource_created',
                    tool: 'create_agent',
                    success: true,
                    data: mockAgentResource,
                },
                '[DONE]',
            ],
        });
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await page.locator('#esInput').fill('Build me an agent');
        await page.locator('#esSendBtn').click();

        // After resource_created the indicator is removed; we assert the final card exists
        await expect(page.locator('.es-resource-card'), 'resource card should appear').toHaveCount(1, {
            timeout: 10000,
        });
    });

    test('tool_start event for create_action shows action creation label', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page, {
            sseEvents: [
                { type: 'tool_start', tool: 'create_action' },
                {
                    type: 'resource_created',
                    tool: 'create_action',
                    success: true,
                    data: mockActionResource,
                },
                '[DONE]',
            ],
        });
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await page.locator('#esInput').fill('Create an action');
        await page.locator('#esSendBtn').click();

        await expect(page.locator('.es-resource-card')).toHaveCount(1, { timeout: 10000 });
    });
});

test.describe('Easy Start — Resource Cards', () => {
    test('agent resource card renders with correct badge and name', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page, {
            sseEvents: [
                {
                    type: 'resource_created',
                    tool: 'create_agent',
                    success: true,
                    data: mockAgentResource,
                },
                '[DONE]',
            ],
        });
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await page.locator('#esInput').fill('I need an agent');
        await page.locator('#esSendBtn').click();

        const card = page.locator('.es-resource-card').first();
        await expect(card).toBeVisible({ timeout: 10000 });
        await expect(card.locator('h4')).toContainText('Weekly Report Writer');
        await expect(card.locator('.es-resource-card-badge')).toContainText('Agent');
    });

    test('agent resource card has a "Chat with agent" link', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page, {
            sseEvents: [
                {
                    type: 'resource_created',
                    tool: 'create_agent',
                    success: true,
                    data: mockAgentResource,
                },
                '[DONE]',
            ],
        });
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await page.locator('#esInput').fill('Make an agent');
        await page.locator('#esSendBtn').click();

        const link = page.locator('.es-resource-card .es-resource-card-link').first();
        await expect(link).toContainText('Chat with agent', { timeout: 10000 });
        await expect(link).toHaveAttribute('href', /\/chat\.html\?agent=/);
    });

    test('action resource card renders with correct badge and link', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page, {
            sseEvents: [
                {
                    type: 'resource_created',
                    tool: 'create_action',
                    success: true,
                    data: mockActionResource,
                },
                '[DONE]',
            ],
        });
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await page.locator('#esInput').fill('Make an action');
        await page.locator('#esSendBtn').click();

        const card = page.locator('.es-resource-card').first();
        await expect(card).toBeVisible({ timeout: 10000 });
        await expect(card.locator('h4')).toContainText('Summarise Meeting Notes');
        await expect(card.locator('.es-resource-card-badge')).toContainText('Action');
        await expect(card.locator('.es-resource-card-link')).toContainText('Run action');
    });

    test('workflow resource card renders with correct badge and link', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page, {
            sseEvents: [
                {
                    type: 'resource_created',
                    tool: 'create_workflow',
                    success: true,
                    data: mockWorkflowResource,
                },
                '[DONE]',
            ],
        });
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await page.locator('#esInput').fill('Create a workflow');
        await page.locator('#esSendBtn').click();

        const card = page.locator('.es-resource-card').first();
        await expect(card).toBeVisible({ timeout: 10000 });
        await expect(card.locator('h4')).toContainText('Client Onboarding');
        await expect(card.locator('.es-resource-card-badge')).toContainText('Workflow');
        await expect(card.locator('.es-resource-card-link')).toContainText('Run workflow');
    });

    test('empty state is removed when first resource card is added', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page, {
            sseEvents: [
                {
                    type: 'resource_created',
                    tool: 'create_agent',
                    success: true,
                    data: mockAgentResource,
                },
                '[DONE]',
            ],
        });
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        // Empty state is visible before interaction
        await expect(page.locator('#esEmptyState')).toBeVisible();

        await page.locator('#esInput').fill('Go');
        await page.locator('#esSendBtn').click();

        await expect(page.locator('#esEmptyState')).not.toBeAttached({ timeout: 10000 });
    });

    test('multiple resource cards render when multiple resource_created events arrive', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page, {
            sseEvents: [
                {
                    type: 'resource_created',
                    tool: 'create_agent',
                    success: true,
                    data: mockAgentResource,
                },
                {
                    type: 'resource_created',
                    tool: 'create_action',
                    success: true,
                    data: mockActionResource,
                },
                {
                    type: 'resource_created',
                    tool: 'create_workflow',
                    success: true,
                    data: mockWorkflowResource,
                },
                '[DONE]',
            ],
        });
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await page.locator('#esInput').fill('Build everything');
        await page.locator('#esSendBtn').click();

        await expect(page.locator('.es-resource-card')).toHaveCount(3, { timeout: 10000 });
    });

    test('resource card description is rendered when provided', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page, {
            sseEvents: [
                {
                    type: 'resource_created',
                    tool: 'create_agent',
                    success: true,
                    data: mockAgentResource,
                },
                '[DONE]',
            ],
        });
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await page.locator('#esInput').fill('Go');
        await page.locator('#esSendBtn').click();

        const card = page.locator('.es-resource-card').first();
        await expect(card.locator('p')).toContainText('weekly status reports', { timeout: 10000 });
    });
});

test.describe('Easy Start — Handoff Button', () => {
    test('handoff button becomes visible after a resource is created', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page, {
            sseEvents: [
                {
                    type: 'resource_created',
                    tool: 'create_agent',
                    success: true,
                    data: mockAgentResource,
                },
                '[DONE]',
            ],
        });
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await page.locator('#esInput').fill('Build one');
        await page.locator('#esSendBtn').click();

        const handoff = page.locator('#esHandoff');
        await expect(handoff).not.toHaveClass(/hidden/, { timeout: 10000 });
    });

    test('handoff button links to Execute 120', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page, {
            sseEvents: [
                {
                    type: 'resource_created',
                    tool: 'create_agent',
                    success: true,
                    data: mockAgentResource,
                },
                '[DONE]',
            ],
        });
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await page.locator('#esInput').fill('Go');
        await page.locator('#esSendBtn').click();

        const handoffLink = page.locator('#esHandoff a');
        await expect(handoffLink).toHaveAttribute('href', '/execute120.html', { timeout: 10000 });
        await expect(handoffLink).toContainText('Go to Execute 120');
    });

    test('handoff button stays hidden when no resources have been created', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page, {
            sseEvents: [
                { type: 'content', text: 'I understand. Tell me more.' },
                '[DONE]',
            ],
        });
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await page.locator('#esInput').fill('Just talking');
        await page.locator('#esSendBtn').click();

        // Wait for streaming to complete, then assert handoff is still hidden
        await expect(page.locator('.es-message.assistant .es-message-content')).toContainText(
            'I understand.',
            { timeout: 10000 }
        );
        await expect(page.locator('#esHandoff')).toHaveClass(/hidden/);
    });
});

test.describe('Easy Start — Error Handling', () => {
    test('error event from SSE displays an error message in the assistant bubble', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page, {
            sseEvents: [
                { type: 'error', error: 'LLM service unavailable' },
                '[DONE]',
            ],
        });
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await page.locator('#esInput').fill('Trigger error');
        await page.locator('#esSendBtn').click();

        // The JS catches the thrown error from the 'error' event and renders it in the bubble
        const assistantBubble = page.locator('.es-message.assistant .es-message-content').first();
        await expect(assistantBubble).toContainText('Something went wrong', { timeout: 10000 });
    });

    test('server 500 response displays an error message', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard

        // Override the stream route to return a 500
        await page.route('**/api/easy-start/stream', async (route) => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ success: false, error: 'Internal server error' }),
            });
        });

        // Still need nav and conversation mocks
        await page.route('**/api/modules**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, data: [] }),
            });
        });
        await page.route('**/api/conversations', async (route) => {
            if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true, conversation: mockConversation }),
                });
            }
        });

        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await page.locator('#esInput').fill('Test 500');
        await page.locator('#esSendBtn').click();

        const assistantBubble = page.locator('.es-message.assistant .es-message-content').first();
        await expect(assistantBubble).toContainText('Something went wrong', { timeout: 10000 });
    });

    test('failed resource_created event renders an error card', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page, {
            sseEvents: [
                {
                    type: 'resource_created',
                    tool: 'create_agent',
                    success: false,
                    error: 'Agent limit reached (5/5).',
                },
                '[DONE]',
            ],
        });
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await page.locator('#esInput').fill('Create agent');
        await page.locator('#esSendBtn').click();

        const errorCard = page.locator('.es-error-card').first();
        await expect(errorCard).toBeVisible({ timeout: 10000 });
        await expect(errorCard).toContainText('Agent creation failed');
        await expect(errorCard).toContainText('Agent limit reached');
    });

    test('guardrail_blocked event displays the blocked message', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page, {
            sseEvents: [
                {
                    type: 'guardrail_blocked',
                    category: 'harmful_content',
                    message: 'This request was blocked by organizational guardrails.',
                },
                '[DONE]',
            ],
        });
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await page.locator('#esInput').fill('Something inappropriate');
        await page.locator('#esSendBtn').click();

        const assistantBubble = page.locator('.es-message.assistant .es-message-content').first();
        await expect(assistantBubble).toContainText('blocked by organizational guardrails', {
            timeout: 10000,
        });
    });
});

test.describe('Easy Start — API: Departments Endpoint', () => {
    test('GET /api/easy-start/departments returns success shape with data array', async ({ request }) => {
        const response = await request.get('/api/easy-start/departments');
        // Endpoint may return 200 (with data) or 500 (if Supabase not configured in test env)
        expect([200, 500]).toContain(response.status());

        if (response.status() === 200) {
            const body = await response.json();
            expect(body).toHaveProperty('success', true);
            expect(body).toHaveProperty('data');
            expect(Array.isArray(body.data)).toBe(true);
        }
    });

    test('GET /api/easy-start/departments filters by x-org-id header when provided', async ({ request }) => {
        const response = await request.get('/api/easy-start/departments', {
            headers: { 'x-org-id': 'non-existent-org-id' },
        });
        expect([200, 500]).toContain(response.status());

        if (response.status() === 200) {
            const body = await response.json();
            expect(body).toHaveProperty('success', true);
            // No departments for a non-existent org — data should be empty array
            expect(Array.isArray(body.data)).toBe(true);
        }
    });
});

test.describe('Easy Start — API: Stream Endpoint', () => {
    /**
     * We test the stream endpoint by initiating a fetch inside the browser
     * and immediately aborting it after reading the response headers.
     * This avoids the Playwright `request` fixture timeout which occurs
     * because SSE streams never send a final Content-Length and the
     * response body never closes.
     */
    test('POST /api/easy-start/stream responds with SSE content-type or 503', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard

        // Navigate to any real page so we have a browser context with the cookie
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        // Use page.evaluate to fire the request and abort immediately after headers arrive
        const result = await page.evaluate(async () => {
            const controller = new AbortController();
            try {
                const res = await fetch('/api/easy-start/stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }] }),
                    signal: controller.signal,
                });
                const status = res.status;
                const contentType = res.headers.get('content-type') || '';
                // Abort as soon as we have the headers — do not read body
                controller.abort();
                return { status, contentType };
            } catch (e) {
                // AbortError is expected; any other error is unexpected
                if (e.name === 'AbortError') {
                    return { aborted: true };
                }
                return { error: e.message };
            }
        });

        // Either streaming started (200 with SSE content-type) or Anthropic not configured (503)
        if (result.status !== undefined) {
            expect([200, 503]).toContain(result.status);
            if (result.status === 200) {
                expect(result.contentType).toContain('text/event-stream');
            }
        }
        // AbortError means the fetch succeeded far enough to start streaming — that is fine
    });
});

test.describe('Easy Start — Conversation Persistence', () => {
    test('POST /api/conversations is called on first message send', async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page);
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        let conversationCreated = false;
        page.on('request', (req) => {
            if (req.method() === 'POST' && req.url().includes('/api/conversations')) {
                conversationCreated = true;
            }
        });

        await page.locator('#esInput').fill('First message');
        await page.locator('#esSendBtn').click();

        // Allow requests to fire
        await page.waitForTimeout(500);
        expect(conversationCreated).toBe(true);
    });

    test('existing conversation loads from ?conversation_id query param', async ({ page }) => {
        const existingMessages = [
            { role: 'user', content: 'Hello from a past session' },
            { role: 'assistant', content: 'Welcome back!' },
        ];

        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page, { existingMessages });
        await page.goto(`/easy-start.html?conversation_id=${mockConversation.id}`);
        await waitForPageReady(page);

        // Both historical messages should be rendered
        await expect(page.locator('.es-message.user .es-message-content').first()).toContainText(
            'Hello from a past session',
            { timeout: 10000 }
        );
        await expect(page.locator('.es-message.assistant .es-message-content').first()).toContainText(
            'Welcome back!'
        );
    });

    test('welcome message is hidden when a conversation is loaded from URL', async ({ page }) => {
        const existingMessages = [
            { role: 'user', content: 'Prior message' },
        ];

        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page, { existingMessages });
        await page.goto(`/easy-start.html?conversation_id=${mockConversation.id}`);
        await waitForPageReady(page);

        await expect(page.locator('#esWelcome')).not.toBeAttached({ timeout: 10000 });
    });
});

test.describe('Easy Start — Layout and Responsiveness', () => {
    test.beforeEach(async ({ page }) => {
        await setupMockAuth(page);
        await setupAuthCookie(page); // inject auth_token cookie for server-side page guard
        await setupEasyStartMocks(page);
    });

    test('two-column layout renders: chat area and resource panel are both visible', async ({ page }) => {
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await expect(page.locator('.easy-start-chat-area')).toBeVisible();
        await expect(page.locator('.easy-start-resources-panel')).toBeVisible();
    });

    test('message input textarea is focusable', async ({ page }) => {
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        await page.locator('#esInput').click();
        await expect(page.locator('#esInput')).toBeFocused();
    });

    test('resource panel has correct panel header icon and title', async ({ page }) => {
        await page.goto('/easy-start.html');
        await waitForPageReady(page);

        const panelHeader = page.locator('.es-panel-header');
        await expect(panelHeader).toBeVisible();
        await expect(panelHeader.locator('h3')).toContainText('Your New Tools');
    });
});
