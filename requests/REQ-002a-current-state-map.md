# REQ-002a — Current State Map

**Prepared by:** code-explorer agent
**Date:** 2026-04-17
**For:** code-architect (parallel workstream) + implementer
**Source REQ:** REQ-002a-consolidation-and-annie-testing.md

---

## 1. support-settings.html — Full Tab Inventory

**File:** `public/support-settings.html`
**Page `<title>`:** `Support Settings | Insight 360` (line 6)
**`<h1>` text:** `Support Settings` (line 657)
**Subtitle:** `Configure your support AI system` (line 658)

### Tab Button Declarations (lines 669–698)

| Order | `data-tab` value | Label | Icon | Line |
|-------|-----------------|-------|------|------|
| 1 (active) | `widget` | Widget Config | `layout` | 670 |
| 2 | `connections` | Connections | `plug` | 674 |
| 3 | `policies` | Policies | `shield-check` | 678 |
| 4 | `chat-widgets` | Chat Widgets | `message-circle` | 682 |
| 5 | `privacy` | Privacy & Compliance | `lock` | 686 |
| 6 | `data-sources` | Data Sources | `table` | 690 |
| 7 | `integrations` | Integrations | `calendar-check` | 694 |

### Tab Content Panels

| `id` | Active on load | Line range | Description |
|------|----------------|------------|-------------|
| `tab-widget` | Yes | 701–849 | Local-only widget appearance defaults. `saveWidgetConfig()` does **no API call** — data lost on page reload. |
| `tab-connections` | No | 852–899 | Static Stripe + Slack cards, both disabled "Coming in Phase 2." Zero JS. |
| `tab-policies` | No | 1227–1254 | Live CRUD against Parthenon processes for Support dept. |
| `tab-chat-widgets` | No | 902–1018 | Live list + inline edit of `chat_widgets` DB records. |
| `tab-privacy` | No | 1021–1086 | Privacy policy editor; save writes to all org widgets. |
| `tab-data-sources` | No | 1089–1161 | Google Sheets connect + config; save writes `sheets_config` to all widgets. |
| `tab-integrations` | No | 1164–1224 | Calendly connect + procedure mapping; save writes `calendly_config` to all widgets. |

### JS Functions Per Tab

**Tab 1 — Widget Config (local only)**
- `collectFormData()` — line 1686
- `saveWidgetConfig()` — line 1699: console.log + toast, **no API call**
- `updateColorSwatch(hex)` — line 1310
- `updateAvatarPreview(url)` — line 1317
- `renderFields()` — line 1328
- `addField()` — line 1349
- `removeField(index)` — line 1379
- `renderDomains()` — line 1385
- `addDomain()` — line 1399
- `removeDomain(index)` — line 1412

**Tab 3 — Policies**
- `renderPolicies()` — line 1421: `GET /api/parthenon/processes?department_id=0a36ea69...`
- `createPolicy()` — line 1501
- `editPolicy(processId)` — line 1607
- `deletePolicy(processId, name)` — line 1665
- `buildStepEditorHtml(steps)` — line 1544
- `addPolicyStepEditor()` — line 1572
- `collectStepsFromEditor()` — line 1597

**Tab 4 — Chat Widgets**
- `loadChatWidgets()` — line 1723: `GET /api/widgets`
- `createWidget()` — line 1770: `POST /api/widgets`
- `editWidget(widgetId)` — line 1806: populates `#widget-detail`; fetches `GET /api/agents?limit=100`
- `closeWidgetDetail()` — line 1845
- `renderWidgetDomains()` — line 1850
- `addWidgetDomain()` — line 1859
- `updatePreChatPreview()` — line 1868
- `showEmbedCode(widget)` — line 1879
- `copyEmbedCode()` — line 1887
- `saveWidgetDetail()` — line 1894: `PUT /api/widgets/:id`

**Tab 5 — Privacy & Compliance**
- `loadDefaultPrivacyPolicy()` — line 1939
- `previewPrivacyPolicy()` — line 1980
- `loadPrivacySettings()` — line 1988: `GET /api/widgets`, reads first widget
- `savePrivacySettings()` — line 2006: `GET /api/widgets` → loop `PUT /api/widgets/:id` for all

**Tab 6 — Data Sources**
- `connectGoogleSheets()` — line 2040
- `syncSheetsNow()` — line 2054
- `saveSheetsConfig()` — line 2093: broadcasts to all widgets

**Tab 7 — Integrations**
- `connectCalendlyOAuth()` — line 2130
- `connectCalendlyToken()` — line 2142
- `addCalendlyMapping()` — line 2172
- `saveCalendlyConfig()` — line 2185: broadcasts to all widgets
- `loadIntegrationStatus()` — line 2223

### Shared Module-Level State

| Variable | Line | Owned by |
|----------|------|----------|
| `widgetConfig` | 1264 | Tab 1 only |
| `SUPPORT_DEPT_ID` | 1418 | Tab 3 only |
| `supportProcesses` | 1419 | Tab 3 only |
| `chatWidgets` | 1719 | Tab 4 only |
| `editingWidgetId` | 1720 | Tab 4 only |
| `editingWidgetDomains` | 1721 | Tab 4 only |

**No cross-tab shared mutable state.** Each tab's state is scoped to its own variables. `switchTab()` (line 1301) only toggles CSS classes.

### DOMContentLoaded Init Sequence (lines 2286–2299)

```
initNavigation()
→ lucide.createIcons()
→ renderFields()           ← Tab 1
→ renderDomains()          ← Tab 1
→ renderPolicies()         ← Tab 3
→ loadChatWidgets()        ← Tab 4
→ loadPrivacySettings()    ← Tab 5
→ loadIntegrationStatus()  ← Tabs 6 + 7
```

All tabs fire on init. **Removing a tab's panel from the DOM requires also removing its init call** or `document.getElementById()` calls will silently return `null` and `element.value` assignments will throw.

---

## 2. support-dashboard.html — Current Content

**File:** `public/support-dashboard.html`
**`<title>`:** `Support Dashboard | Insight 360` (line 6)
**`<h1>` text:** `Support Dashboard` (line 356)

Sections:
- **Stats row** (5 cards, lines 374–428): Total Conversations, Open, Escalated, Resolved, Avg CSAT — `GET /api/support/conversations/metrics/dashboard`
- **Two-column layout** (line 431):
  - Left: Recent Conversations (10 rows) — `GET /api/support/conversations?limit=10`
  - Right: Pending Actions — `GET /api/support/actions?status=pending&limit=5`; approve/deny `PUT /api/support/actions/:id`

Auth note: uses `authFetch()` for API calls but constructs `x-org-id` via manual `getHeaders()` helper (line 472) reading `localStorage.getItem('insight360-current-org')`. Phase 82 gap; blueprint Step 1 fixes it.

---

## 3. Navigation Surface

**File:** `public/js/navigation.js`

Navigation is **dynamic-first** (API-driven) with static fallback. Labels come from `platform_modules.name` (mapped at navigation.js line 196), not from hardcoded JS strings. Static `navConfig` (lines 22–96) does **not** contain support-related entries.

**DB rows controlling nav labels (source of truth for rename):**

| Module ID | Current `name` | `route_path` | SQL file |
|-----------|---------------|-------------|---------|
| `support_ai` | `Customer Support AI` | `/support-dashboard.html` | `db/phase71-support-system.sql` lines 371–391 |
| `embeddable_chat` | `Embeddable Chat Widget` | `/support-settings.html` | `db/phase73-embeddable-chat-widgets.sql` lines 231–255 |

**Role gating:** `embeddable_chat` — executive, director, manager, supervisor (phase73 SQL lines 263–271). `support_ai` — same.

**To rename nav labels:** `UPDATE platform_modules SET name = '...' WHERE id = '...'`. JS does not need changes.

---

## 4. Help Registry

**File:** `public/js/help-registry.js`

| Path key | Guide file | Title | Line |
|----------|-----------|-------|------|
| `/support-dashboard` | `support-user-guide.md` | Support Dashboard Help | 247 |
| `/support-conversations` | `support-user-guide.md` | Support Conversations Help | 251 |
| `/support-conversation-detail` | `support-user-guide.md` | Conversation Detail Help | 255 |
| `/support-actions` | `support-user-guide.md` | Support Actions Help | 259 |
| `/support-settings` | `embeddable-chat-user-guide.md` | Embeddable Chat Widget Help | 263 |

Guide files on disk:
- `documentation/guides/support-user-guide.md`
- `documentation/guides/embeddable-chat-user-guide.md`
- `documentation/guides/embeddable-chat-technical-guide.md`

---

## 5. Docs Whitelist

**File:** `server/routes/docs.js`

Support-related entries in `ALLOWED_DOCS`:
- `'support-user-guide.md'` — line 106
- `'embeddable-chat-user-guide.md'` — line 108
- `'embeddable-chat-technical-guide.md'` — line 109

If user guides are renamed, both whitelist and help-registry entries must update together or help button silently 404s.

---

## 6. chat_widgets Schema

**Migration:** `db/phase73-embeddable-chat-widgets.sql` lines 13–74

| Column | Type | Default / Notes |
|--------|------|-----------------|
| `id` | UUID PK | `gen_random_uuid()` |
| `org_id` | UUID FK | NOT NULL, ON DELETE CASCADE |
| `agent_id` | UUID FK | nullable |
| `widget_name` | TEXT | NOT NULL |
| `widget_token` | TEXT UNIQUE | HMAC embed token |
| `widget_token_secret` | TEXT | HMAC secret |
| `cors_origins` | TEXT[] | default `{}` |
| `branding` | JSONB | `{primary_color, welcome_message, avatar_url, disclaimer}` |
| `limits` | JSONB | `{max_messages_per_session:50, max_sessions_per_day:500, max_messages_per_month:10000, daily_llm_spend_cap:5.00}` |
| `pre_chat_fields` | JSONB | `{mode, fields:{email,name}, show_consent_checkbox}` — modes: lead_capture, open_chat, optional_info, custom |
| `privacy_policy` | TEXT | nullable |
| `consent_text` | TEXT | default consent template |
| `data_retention_days` | INTEGER | default 90 |
| `calendly_config` | JSONB | `{}` → `{mappings: {"procedure": "url"}}` |
| `sheets_config` | JSONB | `{}` → `{spreadsheetId, range, syncInterval, assetName}` |
| `usage_stats` | JSONB | `{current_month, monthly_messages, daily_llm_spend, daily_spend_date}` |
| `is_active` | BOOLEAN | default true |
| `created_at` / `updated_at` | TIMESTAMPTZ | auto-trigger on update |

Supporting table `widget_sessions`: `id`, `widget_id` FK, `session_token`, `visitor_email`, `visitor_name`, `visitor_fingerprint` (hashed), `messages_count`, `consent_given`, `consent_timestamp`, `created_at`, `expires_at` (30-min sliding), `metadata`.

**No schema changes are in scope for REQ-002a.**

---

## 7. Backend Routes

### `server/routes/widgets.js` — Authenticated Admin CRUD

`requireModule('embeddable_chat')` (line 19). Org scoping: manual `req.headers['x-org-id'] || req.orgId || req.user?.org_id` — not using `scopeToOrg()` helper (Phase 82 gap).

| Method | Path | What it does |
|--------|------|--------------|
| GET | `/api/widgets` | List org's chat_widgets DESC by created_at |
| POST | `/api/widgets` | Create; generates HMAC token pair; `checkResourceLimit('chat_widgets')` pre-check |
| GET | `/api/widgets/:id` | Get single widget with org ownership check |
| PUT | `/api/widgets/:id` | Update (whitelist of fields) |
| DELETE | `/api/widgets/:id` | Hard delete (org-scoped) |
| POST | `/api/widgets/:id/rotate-token` | Regenerate HMAC token pair |
| GET | `/api/widgets/:id/usage` | Returns usage_stats + limits + widget_sessions count |

### `server/routes/widgetChat.js` — Public Unauthenticated Chat

Mounted BEFORE auth middleware at index.js line 544 (`/api/chat/public`). Auth: HMAC token from `X-Widget-Token` header + origin enforcement against `cors_origins`. SSE compression excluded (index.js line 245). Rate limits: 30/min per IP, 200/min per widget.

| Method | Path | What it does |
|--------|------|--------------|
| OPTIONS | `/api/chat/public/:widget_id/*` | CORS preflight (no auth) |
| POST | `/api/chat/public/:widget_id/session` | Create visitor session; creates widget_sessions + support_conversations rows |
| POST | `/api/chat/public/:widget_id/stream` | SSE chat stream |
| GET | `/api/chat/public/:widget_id/config` | Public config; never exposes widget_token |
| DELETE | `/api/chat/public/:widget_id/session` | End session |

---

## 8. Annie Demo + Widget Runtime

### `public/demo/index.html`

Cosmetic surgery clinic demo. Embeds chat-widget.js at lines 99–101 with hardcoded widget ID `40c01ac3-cff1-48eb-9aa4-5bdc31032013` and token. **Git status: ` M`** — modified in working tree, not staged. QA must inspect the diff before adding tests to this file.

### `public/js/chat-widget.js` — formatRichContent()

`formatRichContent(html)` at line 728. Called from `appendMessage()` line 781 for `role === 'assistant'`. Applied to streaming messages at line 167 on `type === 'done'`.

Three sequential regex replaces:
1. **Vimeo** (lines 730–738): `<a href="...vimeo.com/DIGITS...">text</a>` → `.i360-video-card` anchor with Vimeo play icon (`#1ab7ea`) + title + "Vimeo Video" label.
2. **YouTube** (lines 742–751): `<a href="...youtube.com/watch?v=..." or "youtu.be/...">text</a>` → same `.i360-video-card`, icon `#ff0000`, label "YouTube Video".
3. **Calendly** (lines 754–763): `<a href="https://calendly.com/...">text</a>` → `div.i360-calendly-card` with header + "Book a Consultation" + `<a class="i360-calendly-btn">Schedule Now</a>`.

### DOM Selectors for QA

**Video card (Vimeo + YouTube):**
```
a.i360-video-card
  div.i360-video-card-icon
  div > div.i360-video-card-text
  div > div.i360-video-card-label
```

**Calendly card:**
```
div.i360-calendly-card
  div.i360-calendly-card-header
  p
  a.i360-calendly-btn  (opens Calendly in new tab)
```

No Shadow DOM. CSS at lines 415–458. `.i360-calendly-btn` background uses `${primaryColor}` — widget's configured color.

**Chat UI element IDs:** `#i360-chat-window`, `#i360-messages`, `#i360-input`, `#i360-send`, `#i360-prechat-form`, `#i360-toggle-btn`.

---

## 9. Existing Annie Tests

### `scripts/test-s1-widget.js` — S1 Security Suite (not Jest, not Playwright)

Run: `node scripts/test-s1-widget.js`. Hardcodes widget ID and token (lines 9–11).

| Test ID | Coverage |
|---------|----------|
| AC-001a/b | Session creation + SSE stream responds |
| AC-002 | `GET /api/widgets` blocked without auth |
| AC-003a–e | HMAC token: valid/invalid/missing/wrong-ID; config public |
| AC-004a/b | CORS: allowed gets header, disallowed blocked |
| AC-005 | Rate limiting endpoint sanity |
| AC-006 | Session message cap creation OK |
| AC-007/008/009 | PII / output / ceiling — code-review assertions only |

### Jest + Playwright — Zero Annie/Widget Coverage

Grep across `__tests__/`: zero matches for "widget", "annie", or "chat-widget". 11 specs in `__tests__/e2e-ui/` cover other modules. **Vimeo, YouTube, and Calendly Playwright tests are net-new work.**

---

## 10. Risk Surfaces

**R1 — Tab 1 Widget Config is dead-end (not persisted).** `saveWidgetConfig()` writes only to console.log. Safe to remove. Phase-notice banner at line 703–705 must also go.

**R2 — All tabs load on init.** Removing a panel without removing its init call triggers silent null-reference errors.

**R3 — Privacy / Sheets / Calendly save broadcasts to ALL widgets.** Intentional org-wide policy. Preserve in consolidated Integrations tab.

**R4 — `demo/index.html` working-tree dirty.** QA must inspect diff first.

**R5 — S1 test suite hardcodes widget ID + token.** Token rotation silently breaks all 9 AC checks.

**R6 — Connections tab is pure static HTML.** Removing it is delete-only, no JS cleanup.

**R7 — `support-dashboard.html` auth header pattern.** Manual `getHeaders()` instead of `authFetch()`. Blueprint Step 1 addresses.

---

*End of current-state map.*
