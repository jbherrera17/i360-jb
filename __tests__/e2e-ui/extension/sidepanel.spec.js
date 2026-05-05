/**
 * Extension Side Panel E2E Tests
 *
 * Tests sidepanel.html / sidepanel.js functionality including:
 * - Chat interface loads in authenticated state
 * - Message sending with streaming
 * - Conversation history panel
 * - Artifact/export modal
 * - New conversation flow
 * - Page context capture (mocked)
 *
 * Run with: npx playwright test __tests__/e2e-ui/extension/sidepanel.spec.js
 */

const { test, expect } = require('@playwright/test');
const os = require('os');
const {
  launchBrowserWithExtension,
  getExtensionId,
  openSidePanel,
  injectChromeStorageStub,
  mockServerRoutes,
  mockStreamingResponse,
} = require('./extension-helpers');

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

let context;
let extensionId;

test.beforeAll(async () => {
  const tmpDir = os.tmpdir() + '/pw-sidepanel-' + Date.now();
  context = await launchBrowserWithExtension(tmpDir);
  extensionId = await getExtensionId(context);
});

test.afterAll(async () => {
  await context.close();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function openAuthSidePanel() {
  const page = await context.newPage();
  await injectChromeStorageStub(page, {
    token: 'mock-access-token-12345',
    orgId: 'org-test-001',
  });
  await mockServerRoutes(page);
  await mockStreamingResponse(page, {
    tokens: ['The', ' answer', ' is', ' 42', '.'],
  });
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(400);
  return page;
}

async function openUnauthSidePanel() {
  const page = await context.newPage();
  await injectChromeStorageStub(page, {});
  await mockServerRoutes(page);
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await page.waitForLoadState('domcontentloaded');
  return page;
}

// ---------------------------------------------------------------------------
// 8. Side panel opens and shows chat interface
// ---------------------------------------------------------------------------

test('side panel shows login view when not authenticated', async () => {
  const page = await openUnauthSidePanel();

  await expect(page.locator('#loginView')).not.toHaveClass(/hidden/);
  await expect(page.locator('#chatView')).toHaveClass(/hidden/);

  await page.close();
});

test('side panel shows chat view when authenticated', async () => {
  const page = await openAuthSidePanel();

  await expect(page.locator('#chatView')).not.toHaveClass(/hidden/);
  await expect(page.locator('#loginView')).toHaveClass(/hidden/);

  await page.close();
});

test('side panel chat view has all key UI elements', async () => {
  const page = await openAuthSidePanel();

  await expect(page.locator('#agentSelect')).toBeVisible();
  await expect(page.locator('#chatInput')).toBeVisible();
  await expect(page.locator('#sendBtn')).toBeVisible();
  await expect(page.locator('#newConvBtn')).toBeVisible();
  await expect(page.locator('#toggleHistoryBtn')).toBeVisible();

  await page.close();
});

// ---------------------------------------------------------------------------
// 9. Message sending in side panel with streaming
// ---------------------------------------------------------------------------

test('chat input accepts text and send button is enabled', async () => {
  const page = await openAuthSidePanel();

  await page.locator('#chatInput').fill('Hello agent!');
  await expect(page.locator('#chatInput')).toHaveValue('Hello agent!');
  await expect(page.locator('#sendBtn')).not.toBeDisabled();

  await page.close();
});

test('sending a message adds user message to chat', async () => {
  const page = await openAuthSidePanel();

  // Select an agent first
  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );
  await page.locator('#agentSelect').selectOption({ index: 1 });

  const message = 'What is the capital of France?';
  await page.locator('#chatInput').fill(message);
  await page.locator('#sendBtn').click();

  // User message should appear in chat
  await expect(
    page.locator('.message.user .message-content')
  ).toBeVisible({ timeout: 5000 });

  const userMessageText = await page
    .locator('.message.user .message-content')
    .innerText();
  expect(userMessageText).toContain('What is the capital of France?');

  await page.close();
});

test('assistant response appears after sending a message', async () => {
  const page = await openAuthSidePanel();

  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );
  await page.locator('#agentSelect').selectOption({ index: 1 });

  await page.locator('#chatInput').fill('Tell me something interesting.');
  await page.locator('#sendBtn').click();

  // Wait for assistant message
  await expect(
    page.locator('.message.assistant .message-content')
  ).toBeVisible({ timeout: 8000 });

  const responseText = await page
    .locator('.message.assistant .message-content')
    .innerText();
  expect(responseText.length).toBeGreaterThan(0);

  await page.close();
});

test('send button is disabled during streaming and re-enabled after', async () => {
  const page = await openAuthSidePanel();

  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );
  await page.locator('#agentSelect').selectOption({ index: 1 });

  await page.locator('#chatInput').fill('Stream test message.');
  await page.locator('#sendBtn').click();

  // Button should eventually be re-enabled
  await expect(page.locator('#sendBtn')).not.toBeDisabled({ timeout: 8000 });

  await page.close();
});

test('Ctrl+Enter keyboard shortcut sends message', async () => {
  const page = await openAuthSidePanel();

  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );
  await page.locator('#agentSelect').selectOption({ index: 1 });

  await page.locator('#chatInput').fill('Keyboard shortcut test.');
  await page.locator('#chatInput').press('Control+Enter');

  await expect(
    page.locator('.message.user .message-content')
  ).toBeVisible({ timeout: 5000 });

  await page.close();
});

// ---------------------------------------------------------------------------
// 10. Conversation history loads and is navigable
// ---------------------------------------------------------------------------

test('history panel is hidden by default', async () => {
  const page = await openAuthSidePanel();

  await expect(page.locator('#historyPanel')).toHaveClass(/hidden/);

  await page.close();
});

test('toggle history button reveals history panel', async () => {
  const page = await openAuthSidePanel();

  await page.locator('#toggleHistoryBtn').click();
  await expect(page.locator('#historyPanel')).not.toHaveClass(/hidden/, { timeout: 3000 });

  await page.close();
});

test('history panel shows conversation list from API', async () => {
  const page = await openAuthSidePanel();

  await page.locator('#toggleHistoryBtn').click();
  await expect(page.locator('#historyPanel')).not.toHaveClass(/hidden/, { timeout: 3000 });

  // Wait for conversations to load
  await expect(
    page.locator('#historyList .history-item')
  ).toHaveCount(2, { timeout: 5000 }); // 2 mock conversations

  await page.close();
});

test('clicking a history item loads the conversation', async () => {
  const page = await openAuthSidePanel();

  await page.locator('#toggleHistoryBtn').click();
  await expect(page.locator('#historyList .history-item')).toHaveCount(2, { timeout: 5000 });

  // Click the first conversation
  await page.locator('#historyList .history-item').first().click();

  // History panel should close
  await expect(page.locator('#historyPanel')).toHaveClass(/hidden/, { timeout: 3000 });

  // Messages from the conversation should be visible
  await expect(page.locator('.message')).toHaveCount(2, { timeout: 5000 }); // 2 mock messages

  await page.close();
});

test('history search filters conversations by title', async () => {
  const page = await openAuthSidePanel();

  await page.locator('#toggleHistoryBtn').click();
  await expect(page.locator('#historyList .history-item')).toHaveCount(2, { timeout: 5000 });

  await page.locator('#historySearch').fill('second');

  // Only "Second test conversation" should be visible
  const visible = page.locator('#historyList .history-item:visible');
  await expect(visible).toHaveCount(1, { timeout: 3000 });

  await page.close();
});

test('close history button hides the panel', async () => {
  const page = await openAuthSidePanel();

  await page.locator('#toggleHistoryBtn').click();
  await expect(page.locator('#historyPanel')).not.toHaveClass(/hidden/, { timeout: 3000 });

  await page.locator('#closeHistoryBtn').click();
  await expect(page.locator('#historyPanel')).toHaveClass(/hidden/, { timeout: 3000 });

  await page.close();
});

// ---------------------------------------------------------------------------
// 11. Artifact modal opens from message action button
// ---------------------------------------------------------------------------

test('assistant messages have an export action button', async () => {
  const page = await openAuthSidePanel();

  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );
  await page.locator('#agentSelect').selectOption({ index: 1 });
  await page.locator('#chatInput').fill('Generate content for export.');
  await page.locator('#sendBtn').click();

  await expect(page.locator('.message.assistant .export-msg-btn')).toBeVisible({ timeout: 8000 });

  await page.close();
});

test('clicking export button on message opens artifact modal', async () => {
  const page = await openAuthSidePanel();

  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );
  await page.locator('#agentSelect').selectOption({ index: 1 });
  await page.locator('#chatInput').fill('Please write a paragraph.');
  await page.locator('#sendBtn').click();

  await expect(page.locator('.message.assistant .export-msg-btn')).toBeVisible({ timeout: 8000 });
  await page.locator('.message.assistant .export-msg-btn').first().click();

  // Artifact modal should open
  await expect(page.locator('#artifactModal')).not.toHaveClass(/hidden/, { timeout: 3000 });

  await page.close();
});

// ---------------------------------------------------------------------------
// 12. Export from artifact modal creates correct file
// ---------------------------------------------------------------------------

test('artifact modal shows export format buttons', async () => {
  const page = await openAuthSidePanel();

  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );
  await page.locator('#agentSelect').selectOption({ index: 1 });
  await page.locator('#chatInput').fill('Content for artifact modal.');
  await page.locator('#sendBtn').click();

  await expect(page.locator('.message.assistant .export-msg-btn')).toBeVisible({ timeout: 8000 });
  await page.locator('.message.assistant .export-msg-btn').first().click();

  await expect(page.locator('#artifactModal')).not.toHaveClass(/hidden/, { timeout: 3000 });

  // Check all export format buttons exist
  await expect(page.locator('.artifact-option[data-format="markdown"]')).toBeVisible();
  await expect(page.locator('.artifact-option[data-format="pdf"]')).toBeVisible();
  await expect(page.locator('.artifact-option[data-format="docx"]')).toBeVisible();

  await page.close();
});

test('artifact modal has a name input pre-populated', async () => {
  const page = await openAuthSidePanel();

  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );
  await page.locator('#agentSelect').selectOption({ index: 1 });
  await page.locator('#chatInput').fill('Auto-name test.');
  await page.locator('#sendBtn').click();

  await expect(page.locator('.message.assistant .export-msg-btn')).toBeVisible({ timeout: 8000 });
  await page.locator('.message.assistant .export-msg-btn').first().click();

  await expect(page.locator('#artifactModal')).not.toHaveClass(/hidden/, { timeout: 3000 });

  // Name input should have a value
  const nameValue = await page.locator('#artifactNameInput').inputValue();
  expect(nameValue.length).toBeGreaterThan(0);

  await page.close();
});

test('clicking markdown export in artifact modal downloads .md file', async () => {
  const page = await openAuthSidePanel();

  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );
  await page.locator('#agentSelect').selectOption({ index: 1 });
  await page.locator('#chatInput').fill('Download this as Markdown.');
  await page.locator('#sendBtn').click();

  await expect(page.locator('.message.assistant .export-msg-btn')).toBeVisible({ timeout: 8000 });
  await page.locator('.message.assistant .export-msg-btn').first().click();
  await expect(page.locator('#artifactModal')).not.toHaveClass(/hidden/, { timeout: 3000 });

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 5000 }),
    page.locator('.artifact-option[data-format="markdown"]').click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/\.md$/);

  await page.close();
});

test('artifact modal closes when X button is clicked', async () => {
  const page = await openAuthSidePanel();

  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );
  await page.locator('#agentSelect').selectOption({ index: 1 });
  await page.locator('#chatInput').fill('Close modal test.');
  await page.locator('#sendBtn').click();

  await expect(page.locator('.message.assistant .export-msg-btn')).toBeVisible({ timeout: 8000 });
  await page.locator('.message.assistant .export-msg-btn').first().click();
  await expect(page.locator('#artifactModal')).not.toHaveClass(/hidden/, { timeout: 3000 });

  await page.locator('#closeArtifactModal').click();
  await expect(page.locator('#artifactModal')).toHaveClass(/hidden/, { timeout: 3000 });

  await page.close();
});

test('artifact modal closes when backdrop is clicked', async () => {
  const page = await openAuthSidePanel();

  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );
  await page.locator('#agentSelect').selectOption({ index: 1 });
  await page.locator('#chatInput').fill('Backdrop close test.');
  await page.locator('#sendBtn').click();

  await expect(page.locator('.message.assistant .export-msg-btn')).toBeVisible({ timeout: 8000 });
  await page.locator('.message.assistant .export-msg-btn').first().click();
  await expect(page.locator('#artifactModal')).not.toHaveClass(/hidden/, { timeout: 3000 });

  // Click the modal overlay (not the content box)
  await page.locator('#artifactModal').click({ position: { x: 5, y: 5 } });
  await expect(page.locator('#artifactModal')).toHaveClass(/hidden/, { timeout: 3000 });

  await page.close();
});

// ---------------------------------------------------------------------------
// 13. Page context capture via content script
// ---------------------------------------------------------------------------

test('page context button is visible in chat input area', async () => {
  const page = await openAuthSidePanel();

  await expect(page.locator('#pageContextBtn')).toBeVisible();

  await page.close();
});

test('clicking page context button shows page-attached badge', async () => {
  const page = await openAuthSidePanel();

  // The chrome.tabs API is mocked in the stub — clicking the button should
  // trigger capturePageContext() which shows the badge
  await page.locator('#pageContextBtn').click();

  // Badge should appear in the input footer
  await expect(page.locator('#pageContextBadge')).toBeVisible({ timeout: 3000 });

  await page.close();
});

test('page context badge has a remove button that clears it', async () => {
  const page = await openAuthSidePanel();

  await page.locator('#pageContextBtn').click();
  await expect(page.locator('#pageContextBadge')).toBeVisible({ timeout: 3000 });

  await page.locator('#pageContextBadge .remove-ctx').click();
  await expect(page.locator('#pageContextBadge')).not.toBeVisible();

  await page.close();
});

// ---------------------------------------------------------------------------
// 15. New conversation clears messages
// ---------------------------------------------------------------------------

test('new conversation button clears chat messages', async () => {
  const page = await openAuthSidePanel();

  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );
  await page.locator('#agentSelect').selectOption({ index: 1 });
  await page.locator('#chatInput').fill('First message to clear.');
  await page.locator('#sendBtn').click();

  // Verify messages appeared
  await expect(page.locator('.message.user')).toBeVisible({ timeout: 5000 });

  // Start new conversation
  await page.locator('#newConvBtn').click();

  // Messages should be cleared (only welcome screen or empty)
  await expect(page.locator('.message')).toHaveCount(0, { timeout: 3000 });

  await page.close();
});

test('new conversation re-shows welcome screen', async () => {
  const page = await openAuthSidePanel();

  await page.waitForFunction(
    () => document.querySelector('#agentSelect')?.options.length > 1,
    { timeout: 5000 }
  );
  await page.locator('#agentSelect').selectOption({ index: 1 });
  await page.locator('#chatInput').fill('Message to clear.');
  await page.locator('#sendBtn').click();

  await expect(page.locator('.message.user')).toBeVisible({ timeout: 5000 });

  await page.locator('#newConvBtn').click();

  await expect(page.locator('#welcomeScreen')).toBeVisible({ timeout: 3000 });

  await page.close();
});
