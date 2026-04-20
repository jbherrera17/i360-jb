/**
 * Annie Widget — Video Card Rendering Tests
 * REQ-002a Step 7 — MVP Item #6
 *
 * Tests that formatRichContent() in chat-widget.js correctly transforms
 * Vimeo and YouTube links in assistant messages into .i360-video-card anchors.
 *
 * Strategy:
 *   1. Navigate to /test-widget-fixture.html (same-origin page on localhost:3000)
 *      so the browser doesn't block cross-origin script loading.
 *   2. Mock all required API endpoints (config, session, stream) with page.route().
 *   3. Inject the widget script tag via page.evaluate() and call I360Widget.init()
 *      directly (DOMContentLoaded has already fired on the fixture page).
 *   4. Open the widget (toggle), wait for session to start (open_chat mode = no form),
 *      then send a user message whose mock SSE response contains a markdown link.
 *   5. Verify the .i360-video-card DOM structure the widget renders.
 *
 * Run: npx playwright test annie-video-cards.spec.js
 */

const { test, expect } = require('@playwright/test');

// ── Constants ────────────────────────────────────────────────────────────────

const WIDGET_ID = 'test-widget-video-001';
const WIDGET_TOKEN = 'test-token-abc123';
const FIXTURE_URL = '/test-widget-fixture.html';

// ── Mock config returned by GET /api/chat/public/:id/config ─────────────────

const mockWidgetConfig = {
    id: WIDGET_ID,
    name: 'Annie Test',
    branding: {
        primary_color: '#6366f1',
        welcome_message: 'Hello! How can I help you?',
        disclaimer: 'AI assistant.',
        hide_branding: true,
    },
    pre_chat: {
        mode: 'open_chat',   // skips pre-chat form, goes straight to chat
        fields: {},
        show_consent_checkbox: false,
    },
    consent_text: 'I agree.',
    privacy_policy: null,
    limits: {
        max_messages_per_session: 50,
    },
};

// ── SSE body builder ─────────────────────────────────────────────────────────

/**
 * Build a synthetic SSE response body for the /stream endpoint.
 * The widget SSE parser reads lines starting with "data: " and parses JSON.
 * A `done` event with a `content` field causes the widget to call
 * formatRichContent(content) and render the result into the messages panel.
 */
function buildSseBody(content) {
    const doneEvent = JSON.stringify({ type: 'done', content });
    return `data: ${doneEvent}\n\n`;
}

// ── Page Setup Helper ─────────────────────────────────────────────────────────

/**
 * Navigate to the fixture page, mock all API routes, inject the widget script,
 * initialize the widget, open it, and wait for the session to start.
 */
async function setupWidgetPage(page) {
    // Register route mocks BEFORE navigation so they apply to all requests.

    // 1. Widget config (GET)
    await page.route(`**/api/chat/public/${WIDGET_ID}/config`, async (route) => {
        if (route.request().method() === 'OPTIONS') {
            await route.fulfill({ status: 204 });
            return;
        }
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockWidgetConfig),
        });
    });

    // 2. Session creation (POST) — called automatically in open_chat mode
    await page.route(`**/api/chat/public/${WIDGET_ID}/session`, async (route) => {
        if (route.request().method() === 'OPTIONS') {
            await route.fulfill({ status: 204 });
            return;
        }
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                session_id: 'sess-video-001',
                session_token: 'sess-token-video',
            }),
        });
    });

    // 3. Default stream mock (overridden per-test with a scoped route registered after)
    await page.route(`**/api/chat/public/${WIDGET_ID}/stream`, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'text/event-stream',
            body: buildSseBody(''),
        });
    });

    // Navigate to the same-origin fixture page so the widget script loads without
    // cross-origin restrictions.
    await page.goto(FIXTURE_URL, { waitUntil: 'domcontentloaded' });

    // Inject the widget script tag programmatically. DOMContentLoaded has already
    // fired, so we bypass the auto-init listener and call I360Widget.init() directly
    // after the script loads.
    await page.evaluate(async ({ widgetId, token }) => {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/js/chat-widget.js';
            script.setAttribute('data-widget-id', widgetId);
            script.setAttribute('data-token', token);
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        // Script loaded — call init() directly since DOMContentLoaded already fired.
        await window.I360Widget.init({ widgetId, token });
    }, { widgetId: WIDGET_ID, token: WIDGET_TOKEN });

    // Widget toggle button confirms createWidget() completed.
    await expect(page.locator('#i360-toggle-btn')).toBeAttached({ timeout: 10000 });

    // Open the chat window.
    await page.locator('#i360-toggle-btn').click();

    // In open_chat mode the widget calls startSession() immediately after toggle.
    // Wait for the messages panel to become visible (session started + welcome shown).
    await expect(page.locator('#i360-messages')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#i360-messages .i360-msg.assistant').first()).toBeVisible({
        timeout: 8000,
    });
}

/**
 * Override the stream route, send a user message, and wait for the expected
 * card selector to appear in the messages panel.
 */
async function sendAndAwaitCard(page, userMessage, sseContent, cardSelector) {
    // Register a new route to override the default empty stream.
    // Playwright uses last-registered route first, so this wins.
    await page.route(`**/api/chat/public/${WIDGET_ID}/stream`, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'text/event-stream',
            body: buildSseBody(sseContent),
        });
    });

    await page.locator('#i360-input').fill(userMessage);
    await page.locator('#i360-send').click();

    await expect(page.locator(cardSelector)).toBeVisible({ timeout: 10000 });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Annie widget — video cards', () => {
    // Run serially within this suite so each test gets its own clean widget state.
    test.describe.configure({ mode: 'serial' });

    test('Vimeo card renders with correct structure and label', async ({ page }) => {
        await setupWidgetPage(page);

        const vimeoUrl = 'https://vimeo.com/123456789';
        const linkText = 'Watch our intro video';

        // The widget's markdown formatter converts [text](url) to <a href="url">text</a>,
        // then formatRichContent() matches the <a> tag and replaces it with the card.
        const sseContent = `Here is a useful video: [${linkText}](${vimeoUrl})`;

        await sendAndAwaitCard(page, 'Tell me about the product', sseContent, 'a.i360-video-card');

        const card = page.locator('a.i360-video-card').first();

        // Card is an anchor element pointing to the Vimeo URL
        await expect(card).toHaveAttribute('href', vimeoUrl);

        // Opens in new tab
        await expect(card).toHaveAttribute('target', '_blank');

        // Icon container present
        await expect(card.locator('.i360-video-card-icon')).toBeVisible();

        // Icon background is Vimeo blue (#1ab7ea) — default from CSS class
        const iconBg = await card.locator('.i360-video-card-icon').evaluate(
            (el) => window.getComputedStyle(el).backgroundColor
        );
        // rgb(26, 183, 234) === #1ab7ea
        expect(iconBg).toMatch(/rgb\(26,\s*183,\s*234\)/);

        // Title text displays the link text
        await expect(card.locator('.i360-video-card-text')).toContainText(linkText);

        // Label reads "Vimeo Video"
        await expect(card.locator('.i360-video-card-label')).toHaveText('Vimeo Video');
    });

    test('YouTube card renders with correct structure and label', async ({ page }) => {
        await setupWidgetPage(page);

        const ytUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        const linkText = 'Watch the tutorial';

        const sseContent = `Check out this guide: [${linkText}](${ytUrl})`;

        await sendAndAwaitCard(page, 'Show me a tutorial', sseContent, 'a.i360-video-card');

        const card = page.locator('a.i360-video-card').first();

        // href points to YouTube URL
        await expect(card).toHaveAttribute('href', ytUrl);

        // Opens in new tab
        await expect(card).toHaveAttribute('target', '_blank');

        // YouTube icon has red background via inline style="background:#ff0000"
        const iconBg = await card.locator('.i360-video-card-icon').evaluate(
            (el) => window.getComputedStyle(el).backgroundColor
        );
        // rgb(255, 0, 0) === #ff0000
        expect(iconBg).toMatch(/rgb\(255,\s*0,\s*0\)/);

        // Title text
        await expect(card.locator('.i360-video-card-text')).toContainText(linkText);

        // Label reads "YouTube Video"
        await expect(card.locator('.i360-video-card-label')).toHaveText('YouTube Video');
    });

    test('youtu.be short URL also renders as YouTube card', async ({ page }) => {
        await setupWidgetPage(page);

        const shortUrl = 'https://youtu.be/dQw4w9WgXcQ';
        const sseContent = `Short link: [Short video](${shortUrl})`;

        await sendAndAwaitCard(page, 'Short link', sseContent, 'a.i360-video-card');

        const card = page.locator('a.i360-video-card').first();
        await expect(card).toHaveAttribute('href', shortUrl);
        await expect(card.locator('.i360-video-card-label')).toHaveText('YouTube Video');
    });

    test('bare link text still renders Vimeo card', async ({ page }) => {
        await setupWidgetPage(page);

        const vimeoUrl = 'https://vimeo.com/987654321';
        // "Watch Video" is the fallback title used when linkText is empty,
        // but the regex captures whatever link text is present.
        const sseContent = `[Watch Video](${vimeoUrl})`;

        await sendAndAwaitCard(page, 'Video', sseContent, 'a.i360-video-card');

        const card = page.locator('a.i360-video-card').first();
        await expect(card).toBeVisible();
        await expect(card.locator('.i360-video-card-label')).toHaveText('Vimeo Video');
    });
});
