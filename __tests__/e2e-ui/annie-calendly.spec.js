/**
 * Annie Widget — Calendly Card Rendering Tests
 * REQ-002a Step 8 — MVP Item #7
 *
 * Tests that formatRichContent() in chat-widget.js correctly transforms
 * Calendly links in assistant messages into .i360-calendly-card divs
 * containing a .i360-calendly-btn anchor with text "Schedule Now".
 *
 * Also verifies the card renders correctly at iPhone 14 viewport (390×844)
 * without horizontal clipping or overflow scroll.
 *
 * Strategy:
 *   1. Navigate to /test-widget-fixture.html (same-origin, avoids cross-origin
 *      script block caused by Cross-Origin-Resource-Policy: same-origin header).
 *   2. Mock config/session/stream endpoints with page.route().
 *   3. Inject widget script via page.evaluate() and call I360Widget.init() directly.
 *   4. Open widget, wait for session (open_chat mode = no pre-chat form).
 *   5. Send a user message whose mock SSE `done` response contains a Calendly
 *      markdown link. The widget calls formatRichContent() which emits the card.
 *
 * Run: npx playwright test annie-calendly.spec.js
 */

const { test, expect } = require('@playwright/test');

// ── Constants ────────────────────────────────────────────────────────────────

const WIDGET_ID = 'test-widget-calendly-001';
const WIDGET_TOKEN = 'test-token-cal-xyz';
const FIXTURE_URL = '/test-widget-fixture.html';

// ── Mock config ───────────────────────────────────────────────────────────────

const mockWidgetConfig = {
    id: WIDGET_ID,
    name: 'Annie Scheduling Test',
    branding: {
        primary_color: '#6366f1',
        welcome_message: 'Hello! How can I help you?',
        disclaimer: 'AI assistant.',
        hide_branding: true,
    },
    pre_chat: {
        mode: 'open_chat',
        fields: {},
        show_consent_checkbox: false,
    },
    consent_text: 'I agree.',
    privacy_policy: null,
    limits: {
        max_messages_per_session: 50,
    },
};

// ── SSE body builder ──────────────────────────────────────────────────────────

function buildSseBody(content) {
    const doneEvent = JSON.stringify({ type: 'done', content });
    return `data: ${doneEvent}\n\n`;
}

// ── Page Setup Helper ─────────────────────────────────────────────────────────

async function setupWidgetPage(page) {
    // Mock config endpoint
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

    // Mock session creation
    await page.route(`**/api/chat/public/${WIDGET_ID}/session`, async (route) => {
        if (route.request().method() === 'OPTIONS') {
            await route.fulfill({ status: 204 });
            return;
        }
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                session_id: 'sess-cal-001',
                session_token: 'sess-cal-token',
            }),
        });
    });

    // Default stream mock (individual tests override with a subsequent page.route())
    await page.route(`**/api/chat/public/${WIDGET_ID}/stream`, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'text/event-stream',
            body: buildSseBody(''),
        });
    });

    // Navigate to same-origin fixture page
    await page.goto(FIXTURE_URL, { waitUntil: 'domcontentloaded' });

    // Inject widget script and init — DOMContentLoaded already fired so we
    // call I360Widget.init() directly rather than relying on the auto-init listener.
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
        await window.I360Widget.init({ widgetId, token });
    }, { widgetId: WIDGET_ID, token: WIDGET_TOKEN });

    // Confirm widget created successfully
    await expect(page.locator('#i360-toggle-btn')).toBeAttached({ timeout: 10000 });

    // Open the chat window
    await page.locator('#i360-toggle-btn').click();

    // Wait for session + welcome message
    await expect(page.locator('#i360-messages')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#i360-messages .i360-msg.assistant').first()).toBeVisible({
        timeout: 8000,
    });
}

/**
 * Override stream, send a message containing a Calendly markdown link,
 * and wait for the .i360-calendly-card to appear.
 */
async function sendAndAwaitCalendlyCard(page, userMessage, calendlyUrl) {
    const linkText = 'Book a time with us';
    const sseContent = `Let\'s schedule a meeting: [${linkText}](${calendlyUrl})`;

    await page.route(`**/api/chat/public/${WIDGET_ID}/stream`, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'text/event-stream',
            body: buildSseBody(sseContent),
        });
    });

    await page.locator('#i360-input').fill(userMessage);
    await page.locator('#i360-send').click();

    await expect(page.locator('div.i360-calendly-card')).toBeVisible({ timeout: 10000 });
}

// ── Desktop Tests ─────────────────────────────────────────────────────────────

test.describe('Annie widget — Calendly card (desktop)', () => {
    test.describe.configure({ mode: 'serial' });

    const CALENDLY_URL = 'https://calendly.com/synergi-ai/30min';

    test('Calendly card renders with header, description, and Schedule Now button', async ({ page }) => {
        await setupWidgetPage(page);
        await sendAndAwaitCalendlyCard(page, 'Can I book a call?', CALENDLY_URL);

        const card = page.locator('div.i360-calendly-card').first();
        await expect(card).toBeVisible();

        // Card header contains "Book a Consultation" and a calendar icon
        const header = card.locator('.i360-calendly-card-header');
        await expect(header).toBeVisible();
        await expect(header).toContainText('Book a Consultation');
        await expect(header.locator('svg')).toBeAttached();

        // Body paragraph with scheduling prompt
        const body = card.locator('p');
        await expect(body).toBeVisible();
        await expect(body).toContainText('Schedule a time that works for you');

        // Schedule Now button present
        const btn = card.locator('a.i360-calendly-btn');
        await expect(btn).toBeVisible();
        await expect(btn).toHaveText('Schedule Now');
    });

    test('Schedule Now button href points to Calendly URL', async ({ page }) => {
        await setupWidgetPage(page);
        await sendAndAwaitCalendlyCard(page, 'Book a call', CALENDLY_URL);

        const btn = page.locator('a.i360-calendly-btn').first();
        await expect(btn).toHaveAttribute('href', CALENDLY_URL);
    });

    test('Schedule Now button opens in new tab with noopener', async ({ page }) => {
        await setupWidgetPage(page);
        await sendAndAwaitCalendlyCard(page, 'Schedule me', CALENDLY_URL);

        const btn = page.locator('a.i360-calendly-btn').first();
        await expect(btn).toHaveAttribute('target', '_blank');
        await expect(btn).toHaveAttribute('rel', 'noopener');
    });

    test('multiple Calendly cards render for multiple links in one message', async ({ page }) => {
        await setupWidgetPage(page);

        const url1 = 'https://calendly.com/synergi-ai/15min';
        const url2 = 'https://calendly.com/synergi-ai/60min';
        const sseContent = `Choose a slot:\n[Quick 15-min](${url1})\n[Deep dive 60-min](${url2})`;

        await page.route(`**/api/chat/public/${WIDGET_ID}/stream`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'text/event-stream',
                body: buildSseBody(sseContent),
            });
        });

        await page.locator('#i360-input').fill('Options');
        await page.locator('#i360-send').click();

        // Both cards should render
        await expect(page.locator('div.i360-calendly-card')).toHaveCount(2, { timeout: 10000 });

        const btns = page.locator('a.i360-calendly-btn');
        await expect(btns).toHaveCount(2);

        await expect(btns.nth(0)).toHaveAttribute('href', url1);
        await expect(btns.nth(1)).toHaveAttribute('href', url2);
    });
});

// ── Mobile Tests (iPhone 14) ──────────────────────────────────────────────────

test.describe('Annie widget — Calendly card (mobile, iPhone 14 390×844)', () => {
    test.describe.configure({ mode: 'serial' });

    // iPhone 14 viewport
    test.use({ viewport: { width: 390, height: 844 } });

    const CALENDLY_URL = 'https://calendly.com/synergi-ai/30min';

    test('Calendly card is visible and fully within horizontal bounds', async ({ page }) => {
        await setupWidgetPage(page);
        await sendAndAwaitCalendlyCard(page, 'Book a call on mobile', CALENDLY_URL);

        const card = page.locator('div.i360-calendly-card').first();
        await expect(card).toBeVisible();

        // Card must not extend beyond viewport width (390px)
        const box = await card.boundingBox();
        expect(box).not.toBeNull();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(390);
    });

    test('Schedule Now button is visible and has a tappable target on mobile', async ({ page }) => {
        await setupWidgetPage(page);
        await sendAndAwaitCalendlyCard(page, 'Schedule on mobile', CALENDLY_URL);

        const btn = page.locator('a.i360-calendly-btn').first();
        await expect(btn).toBeVisible();

        // Button must not overflow horizontally
        const box = await btn.boundingBox();
        expect(box).not.toBeNull();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(390);

        // Button must have a non-trivial tap target height (min 30px for mobile usability)
        expect(box.height).toBeGreaterThanOrEqual(30);
    });

    test('messages container has no horizontal scroll on mobile', async ({ page }) => {
        await setupWidgetPage(page);
        await sendAndAwaitCalendlyCard(page, 'Check scroll', CALENDLY_URL);

        // The messages container must not overflow horizontally
        const hasHorizontalScroll = await page.locator('#i360-messages').evaluate((el) => {
            return el.scrollWidth > el.clientWidth;
        });
        expect(hasHorizontalScroll).toBe(false);
    });

    test('Calendly card header and button text are readable on mobile', async ({ page }) => {
        await setupWidgetPage(page);
        await sendAndAwaitCalendlyCard(page, 'Mobile readability', CALENDLY_URL);

        const card = page.locator('div.i360-calendly-card').first();

        await expect(card.locator('.i360-calendly-card-header')).toContainText('Book a Consultation');
        await expect(card.locator('a.i360-calendly-btn')).toHaveText('Schedule Now');
    });
});
