# Insight 360 Chrome Extension Technical Guide

**Version:** 1.0.0
**Last Updated:** 2026-03-10

---

## Overview

The Insight 360 Chrome Extension is a Manifest V3 extension that surfaces agent chat and artifact export directly in the browser. It communicates with the existing Insight 360 Express server via Bearer-token-authenticated REST and SSE endpoints. There is no new backend service; the extension is a thin client over the same API used by the web app.

---

## Architecture

```
Chrome Extension                      Insight 360 Server
────────────────                      ──────────────────
popup.html / popup.js                 POST /api/auth/login
sidepanel.html / sidepanel.js   →     POST /api/auth/refresh
background.js (service worker)        GET  /api/user-profile
content.js (content script)           GET  /api/agents
                                      POST /api/agents/:id/execute/stream  (SSE)
lib/api.js          ─── fetch ──►    POST /api/chat/stream                (SSE)
lib/export.js                         GET  /api/conversations
lib/markdown.js                       POST /api/conversations
                                      POST /api/conversations/:id/messages
                                      GET  /api/chat/models
                                      GET  /api/health
```

---

## File Structure

```
extension/
├── manifest.json          # Manifest V3 config
├── background.js          # Service worker — context menus, alarms, side panel control
├── content.js             # Content script — FAB injection, page context capture
├── content.css            # Styles for content script (unused; FAB uses Shadow DOM)
├── popup.html             # Extension popup (toolbar icon click)
├── popup.js               # Popup controller
├── popup.css              # Popup styles
├── sidepanel.html         # Side panel UI
├── sidepanel.js           # Side panel controller
├── sidepanel.css          # Side panel styles
├── options.html           # Extension settings page
├── options.css            # Options page styles
├── icons/                 # Extension icons (16px, 48px, 128px)
└── lib/
    ├── api.js             # Singleton API client (I360Api class)
    ├── export.js          # Document export — Markdown, PDF, Word
    └── markdown.js        # Lightweight markdown-to-HTML renderer
```

---

## Manifest V3 Permissions

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "activeTab", "contextMenus", "sidePanel", "notifications"],
  "host_permissions": [
    "http://localhost:3000/*",
    "https://*.insight360.app/*"
  ]
}
```

- `storage` — `chrome.storage.local` for settings; `chrome.storage.session` for auth tokens
- `activeTab` — read the active tab's URL and title on user gesture
- `contextMenus` — "Ask Agent" and "Summarize page" right-click items
- `sidePanel` — open/control the side panel
- `notifications` — browser notifications when tasks complete

`host_permissions` controls which servers the extension can fetch from. Add production domains here when deploying.

---

## Authentication Flow

```
User enters email + password
        │
        ▼
POST /api/auth/login
        │
        ▼
JWT access_token stored in chrome.storage.session
(session storage clears on browser close)
        │
        ▼
GET /api/user-profile  →  orgId stored in chrome.storage.session
        │
        ▼
All subsequent requests include:
  Authorization: Bearer <token>
  X-Org-Id: <orgId>
  X-Extension-Version: <manifest.version>
        │
        ▼
On 401 response → POST /api/auth/refresh (with credentials: 'include')
  If refresh succeeds → retry original request
  If refresh fails  → throw "Authentication expired. Please log in again."
```

### Token Refresh via Alarm

`background.js` creates a `tokenRefresh` alarm that fires every 45 minutes. When it fires:
1. Reads `token` and `tokenExpiresAt` from `chrome.storage.session`
2. Calculates remaining TTL
3. If within 20% of expiry, calls `POST /api/auth/refresh`
4. Updates `chrome.storage.session` with the new token and expiry

A separate `healthCheck` alarm fires every 5 minutes to verify server reachability.

---

## API Client (`lib/api.js`)

The `I360Api` class is a singleton exported as `api`. It must be initialised with `await api.init()` before use (reads stored URL and token).

### Key Methods

| Method | Description |
|--------|-------------|
| `api.init()` | Loads stored serverUrl, token, orgId |
| `api.login(email, password)` | Authenticates, stores token, fetches user profile |
| `api.logout()` | Clears session storage |
| `api.checkHealth()` | GET /api/health, returns boolean |
| `api.getAgents()` | GET /api/agents?active=true&limit=100 |
| `api.getConversations(limit)` | GET /api/conversations |
| `api.createConversation(title, model)` | POST /api/conversations |
| `api.saveMessage(convId, role, content, model)` | POST /api/conversations/:id/messages |
| `api.streamAgentChat(agentId, message, history, onToken, onComplete, onError)` | POST /api/agents/:id/execute/stream — SSE |
| `api.streamChat(message, model, history, onToken, onComplete, onError)` | POST /api/chat/stream — SSE |
| `api.getModels()` | GET /api/chat/models |

### SSE Streaming Pattern

Both `streamAgentChat` and `streamChat` use the same streaming protocol:

```javascript
// Event types consumed from the SSE stream:
{ type: 'token',    content: '...' }  // or type: 'content'
{ type: 'complete', content: '...' }
{ type: 'guardrail_blocked', message: '...' }
// Stream terminates with a bare "data: [DONE]" line
```

The client reads via `res.body.getReader()`, decodes chunks, and splits on `\n` to parse individual `data:` lines. An incomplete final line is held in a buffer for the next chunk.

---

## SSE Implementation Detail

The extension does not use the browser's `EventSource` API (which does not support custom request headers). Instead it uses `fetch` with `ReadableStream`:

```javascript
const res = await fetch(url, { method: 'POST', headers: this.headers, body: JSON.stringify(payload) });
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete line
    for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') { /* complete */ return; }
        const parsed = JSON.parse(payload);
        // dispatch to onToken / onComplete / onError callbacks
    }
}
```

---

## CORS Configuration

`server/index.js` extends the CORS origin allowlist to include Chrome extension origins:

```javascript
if (origin && origin.startsWith('chrome-extension://')) {
    const allowedExtensions = process.env.ALLOWED_EXTENSION_IDS?.split(',').map(id => id.trim()) || [];
    const extId = origin.replace('chrome-extension://', '');
    if (allowedExtensions.includes(extId) || allowedExtensions.includes('*')) {
        return callback(null, true);
    }
    // In development (NODE_ENV !== 'production'), all extensions are allowed
}
```

### Environment Variable

```env
# In .env
ALLOWED_EXTENSION_IDS=*                     # Allow any extension (development)
ALLOWED_EXTENSION_IDS=abcdef1234567890...   # Lock to specific extension ID (production)
```

The production extension ID is shown on the extension's detail page at `chrome://extensions` after publishing to the Web Store.

---

## Content Script (`content.js`)

Injected into every page (`"matches": ["<all_urls>"]`) at `document_idle`.

### Responsibilities

1. **Page context message listener** — responds to `getPageContext` messages from the side panel:
   ```javascript
   { url, title, selectedText, metaDescription }
   ```

2. **Floating Action Button (FAB)** — injects a 44×44px button at `position:fixed; bottom:20px; right:20px` using a **Shadow DOM** (`mode: 'closed'`) to prevent host-page CSS from leaking in. Clicking the FAB sends `{ action: 'openSidePanel' }` to the background service worker.

The FAB is only injected if `chrome.storage.local.showFab !== false`. The default is to show it.

---

## Background Service Worker (`background.js`)

Runs as a Manifest V3 service worker (ES module: `"type": "module"`).

### Context Menus

Registered on `chrome.runtime.onInstalled`:

| Menu ID | Context | Title |
|---------|---------|-------|
| `i360-ask-agent` | `selection` (text selected) | Ask Insight 360 Agent |
| `i360-summarize-page` | `page` | Summarize this page with I360 |

On click: calls `chrome.sidePanel.open({ tabId })`, then after a 500 ms delay sends a `setPageContext` message to the side panel with `{ url, title, selectedText }`.

### Message Handling

Listens for `{ action: 'openSidePanel', conversationId? }` from the content script (FAB click). Opens the side panel and optionally sends a `loadConversation` message to load a specific conversation.

### Side Panel Behavior

```javascript
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
```

The toolbar icon click opens the popup, not the side panel. The side panel is opened programmatically.

---

## Export System (`lib/export.js`)

The `exportAsDocument(format, rawContent, artifactName)` function handles all three formats.

### Markdown

Raw content written to a `Blob` with `type: 'text/markdown'` and downloaded directly via a temporary `<a>` element.

### PDF

1. `formatContentForPrint(rawContent)` converts markdown to HTML (headers, lists, tables, code blocks, blockquotes)
2. `buildPdfHtml(title, content, dateStr)` wraps the HTML in a branded print template with:
   - Inter font, JetBrains Mono for code
   - Indigo (`#6366f1`) brand accent colour
   - `@page { size: letter; margin: 1in 0.75in }`
   - `@media print` rules to avoid page breaks inside headings and code blocks
3. Opens a new window, writes the HTML, and calls `window.print()` after 500 ms

### Word (.doc)

The same `formatContentForPrint` output is wrapped in an `application/msword` HTML blob. This is an HTML-based Office document, not a true OOXML `.docx`. It opens correctly in Microsoft Word for review and editing.

### Filename Generation

`generateArtifactName(content)` extracts the filename from:
1. The first H1–H3 heading in the content, or
2. The first non-empty line with markdown syntax stripped

`sanitizeFilename(name)` lowercases the name and replaces non-alphanumeric characters with hyphens (max 60 characters).

---

## Markdown Renderer (`lib/markdown.js`)

A lightweight renderer used to display assistant responses in both the popup and side panel. It handles:
- Headers (H1–H4)
- Bold, italic, bold-italic
- Inline code and fenced code blocks (with language label)
- Ordered and unordered lists
- Blockquotes
- Horizontal rules
- Links (open in `_blank`)
- Tables
- Paragraphs

This is intentional: a lightweight renderer avoids loading a full markdown library (e.g. marked.js) inside the extension, keeping the bundle small and avoiding CSP issues.

---

## Communication Patterns

```
Popup ──sendMessage──► Background (openSidePanel)
                              │
                              ▼
                       chrome.sidePanel.open()
                              │
                              ▼
                       Side Panel (ready)

Content Script ──sendMessage──► Background (openSidePanel)
                                       │
                                       ▼ same as above

Background ──sendMessage──► Side Panel (setPageContext / loadConversation)

Side Panel ──sendMessage──► Content Script (getPageContext)
                                    │
                                    ▼
                            { url, title, selectedText, metaDescription }
```

There is no direct popup-to-side-panel or popup-to-content-script communication. All routing goes through the background service worker.

---

## API Endpoints Used

| Method | Endpoint | Used By |
|--------|----------|---------|
| POST | `/api/auth/login` | Login form (popup, side panel) |
| POST | `/api/auth/refresh` | Token refresh alarm |
| GET | `/api/user-profile` | After login (fetch orgId) |
| GET | `/api/health` | Connection status dot |
| GET | `/api/agents?active=true&limit=100` | Agent dropdown |
| GET | `/api/agents/:id` | Agent detail (future) |
| POST | `/api/agents/:id/execute/stream` | Agent SSE streaming |
| POST | `/api/chat/stream` | Higgins/direct chat SSE |
| GET | `/api/chat/models` | Model selector dropdown |
| GET | `/api/conversations?limit=N` | Conversation history |
| GET | `/api/conversations/:id` | Load single conversation |
| POST | `/api/conversations` | Create conversation |
| POST | `/api/conversations/:id/messages` | Save message |

---

## Storage Schema

### `chrome.storage.local` (persists across sessions)

| Key | Type | Description |
|-----|------|-------------|
| `serverUrl` | string | Base URL of the Insight 360 server |
| `showFab` | boolean | Whether to show the floating action button |
| `showNotifications` | boolean | Whether to send browser notifications |

### `chrome.storage.session` (clears on browser close)

| Key | Type | Description |
|-----|------|-------------|
| `token` | string | JWT Bearer access token |
| `tokenExpiresAt` | number | Token expiry as Unix ms timestamp |
| `orgId` | string | User's default organisation UUID |
| `userProfile` | object | `{ id, email, display_name, role }` |

---

## Security Considerations

1. **Tokens in session storage only** — `chrome.storage.session` is cleared when the browser closes, preventing long-lived credential leaks.
2. **CORS whitelist** — Production servers should set `ALLOWED_EXTENSION_IDS` to the specific Chrome Web Store extension ID, not `*`.
3. **Shadow DOM for FAB** — The floating button uses a closed shadow root to prevent host-page scripts from reading or manipulating the extension's DOM.
4. **Host permissions scoped** — The extension only has network access to `localhost:3000` and `*.insight360.app`. Requests to other origins are blocked by the browser.
5. **No `eval` or inline scripts** — Manifest V3 prohibits `eval`. The extension uses ES modules throughout.
6. **Filename sanitization** — Export filenames are sanitized (lowercase, alphanumeric + hyphens only, max 60 chars) before being used in `download` attributes.
7. **Content Security Policy** — The extension's own pages (popup, side panel, options) use the default strict MV3 CSP; no `unsafe-inline` or `unsafe-eval`.

---

## Development Workflow

### Loading the Extension

1. `cd insight-360/extension`
2. No build step required — all files are plain JavaScript ES modules
3. Open `chrome://extensions`, enable Developer mode, click **Load unpacked**, select the `extension/` directory
4. After code changes: click the **reload** icon on the extension card (or press `R` with the extensions page focused)

### Debugging

| Target | How to open DevTools |
|--------|---------------------|
| Popup | Right-click popup → Inspect |
| Side panel | Right-click side panel content → Inspect |
| Background service worker | `chrome://extensions` → click **Service Worker** link under the extension |
| Content script | Open DevTools on any page → Console → select "Insight 360 Extension" context from the context dropdown |
| Options page | `chrome://extensions` → Details → Extension options → right-click → Inspect |

### Environment Variables for Server (CORS)

```env
# .env (development)
NODE_ENV=development
# All chrome-extension:// origins are allowed in development automatically

# .env (production)
NODE_ENV=production
ALLOWED_EXTENSION_IDS=your-chrome-web-store-extension-id
```

---

## Testing

### Jest Unit Tests

Unit tests for `lib/export.js`, `lib/markdown.js`, and `lib/api.js` run with the Jest test suite:

```bash
npm test -- __tests__/unit/extension/
```

Chrome APIs (`chrome.storage`, `chrome.runtime`) are mocked via `jest.setup.js`.

### Playwright E2E Tests

End-to-end tests use Playwright with a Chromium profile that has the extension loaded:

```bash
npx playwright test --project=chromium
```

Test results are stored in `playwright-report/` and `test-results/`.

---

## Related Documentation

- [Chrome Extension User Guide](./chrome-extension-user-guide.md)
- [Chat (Higgins) User Guide](./chat-user-guide.md) — same SSE streaming API used by the extension
- [Agents User Guide](./agents-user-guide.md) — agent configuration that affects extension behaviour
