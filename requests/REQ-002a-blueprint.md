# REQ-002a Implementation Blueprint
## Chat Support System Consolidation + Annie E2E Testing

**Status:** READY FOR IMPLEMENTATION
**Author:** Code Architect
**Date:** 2026-04-17
**Source:** REQ-002a-consolidation-and-annie-testing.md / REQ-002-INDEX.md

---

## Patterns and Conventions Found

**Existing tab implementation** (`public/support-settings.html:669-698`): The page already uses `.settings-tab` / `.tab-content` CSS classes with `switchTab(tabId)` JS. Each tab button carries `data-tab="<id>"` and each panel carries `id="tab-<id>"`. The pattern is correct — the work is consolidating 7 tabs to 4.

**Existing list+detail pattern** (`support-settings.html:901-1017`): The Chat Widgets tab already implements the intended model: `#widgets-list` at top with `connection-card`-style rows, then `#widget-detail` hidden panel below that expands on click via `editWidget(id)`. This is the correct and established pattern — inline expansion below the list, not a modal or slide-over. Slide-overs do not exist anywhere in the codebase.

**Old Widget Config tab is dead code** (`support-settings.html:700-848, 1699-1705`): `saveWidgetConfig()` does `console.log()` and shows a "local preview only" toast — it never calls an API. The `widgetConfig` JS object holds only in-memory state. REQ-002-INDEX.md Q2 decision explicitly cleared this for deletion.

**Auth pattern violation on support-dashboard.html** (`lines 470-673`): The dashboard uses hand-rolled `getHeaders()` with manual localStorage reads instead of `authFetch()`. This violates CLAUDE.md multi-tenant scoping mandate and must be fixed.

**Navigation is DB-driven**: Static `navConfig` in `public/js/navigation.js` does not contain support pages. The dynamic nav from `/api/modules` is authoritative. Label changes require SQL updates to `platform_modules`, not JS changes.

**No accordion component exists**: The codebase uses `<details>/<summary>` in exactly two isolated pages. The established settings pattern uses stacked `settings-section` cards — use those for the Integrations tab fold, not an accordion.

---

## Architecture Decision

### Chosen Approach: Merge-in-Place, Inline Detail Panel

The 7 tabs collapse to 4 by merging, not by adding new abstractions:

- **Widget Config** = old Chat Widgets tab (renamed, DB-backed, source of truth)
- **Policies** = unchanged
- **Privacy & Compliance** = unchanged
- **Integrations** = old Connections + old Data Sources + old Integrations, flat sections

The old Widget Config local-only tab and its entire JS state object are deleted. No migration — nothing was ever persisted.

The inline detail panel (`#widget-detail` below `#widgets-list`) is the correct UX for list+edit on this page. Keep it. Do not switch to a modal or slide-over.

Global defaults from the old Widget Config tab are not preserved as pre-fill defaults for new widgets. The `createWidget()` modal already has sensible hardcoded defaults. Adding a defaults layer adds complexity with no DB backing and is out of scope for REQ-002b.

---

## Target Tab Structure

```
support-settings.html — 4 tabs (left to right):

Tab 1: Widget Config          icon=layout          data-tab="widget-config"
Tab 2: Policies               icon=shield-check    data-tab="policies"
Tab 3: Privacy & Compliance   icon=lock            data-tab="privacy"
Tab 4: Integrations           icon=plug            data-tab="integrations"
```

**Tab 1 — Widget Config** (`id="tab-widget-config"`):
- Section header row: title left, "+ New Widget" button right
- `#widgets-list` div: one `connection-card` per widget (click to configure)
- `#widget-detail` div: inline edit form below list, hidden until widget clicked
- All existing JS functions unchanged: `loadChatWidgets()`, `editWidget()`, `saveWidgetDetail()`, `createWidget()`

**Tab 2 — Policies** (`id="tab-policies"`): no content or JS changes

**Tab 3 — Privacy & Compliance** (`id="tab-privacy"`): no content or JS changes

**Tab 4 — Integrations** (`id="tab-integrations"`): three flat sections:
```
[settings-section]
  h3: Connections
  phase-notice: "Third-party connections available in Phase 2"
  2-column grid: Stripe card (disabled) | Slack card (disabled)

[settings-section]
  h3: Data Sources
  Google Sheets connection card + config form (collapsed until connected)

[settings-section]
  h3: Scheduling
  Calendly connection card + procedure-mapping form (collapsed until connected)
```

---

## Widget Config Tab — Field-by-Field Mapping

All fields already exist in the Chat Widgets form. No new fields. The `is_active` toggle is the only missing control — add it to the inline detail panel.

| `chat_widgets` DB column | Form element ID | Input type |
|---|---|---|
| `widget_name` | `#cw-name` | text |
| `agent_id` | `#cw-agent` | select (populated from `/api/agents`) |
| `pre_chat_fields.mode` | `#cw-prechat-mode` | select |
| `branding.primary_color` | `#cw-color` + `#cw-color-hex` | color + text |
| `branding.avatar_url` | `#cw-avatar` | url |
| `branding.welcome_message` | `#cw-welcome` | textarea |
| `cors_origins` | `#cw-domains-list` + `#cw-domain-input` | tag list |
| `limits.max_messages_per_session` | `#cw-max-session-msgs` | number |
| `limits.max_messages_per_month` | `#cw-max-monthly-msgs` | number |
| `limits.daily_llm_spend_cap` | `#cw-daily-spend` | number step=0.50 |
| `is_active` | add `#cw-is-active` toggle | checkbox/toggle |
| `widget_token` (read-only) | `#cw-embed-code` | pre (generated embed) |

**Delete entirely** (old Widget Config tab state): `widgetConfig` JS object, `collectFormData()`, `saveWidgetConfig()`, `renderFields()`, `addField()`, `removeField()`, `renderDomains()`, `addDomain()`, `removeDomain()`, `updateColorSwatch()`, `updateAvatarPreview()`, and all associated HTML elements with IDs `#widget-enabled`, `#widget-color`, `#widget-color-hex`, `#widget-font`, `#widget-radius`, `#widget-position`, `#widget-welcome`, `#widget-avatar`, `#widget-tone`, `#widget-offline`, `#fields-container`, `#domains-container`, `#domain-input`, `#avatar-preview`.

---

## Page Rename Strategy — Complete Surface Inventory

### `public/support-settings.html`

| Surface | Current | New |
|---|---|---|
| `<title>` | `Support Settings | Insight 360` | `Chat Support System Settings | Insight 360` |
| `<h1>` | `Support Settings` | `Chat Support System Settings` |
| `<p class="header-subtitle">` | `Configure your support AI system` | `Configure your chat support AI system` |
| Default active tab | `data-tab="widget"` active | `data-tab="widget-config"` active |
| Tab buttons (total) | 7 | 4 |
| DOMContentLoaded default | `switchTab('widget')` or first tab | first tab = `widget-config` |

### `public/support-dashboard.html`

| Surface | Current | New |
|---|---|---|
| `<title>` | `Support Dashboard | Insight 360` | `Support System Dashboard | Insight 360` |
| `<h1>` | `Support Dashboard` | `Support System Dashboard` |
| Auth pattern | `getHeaders()` + raw fetch | `authFetch()` everywhere |
| `<head>` scripts | navigation.js only | add auth-fetch-loader.js before navigation.js |

### `public/administrator.html`

| Element | Current | New |
|---|---|---|
| support-settings tile `.admin-card-title` | `Embeddable Chat Widget` | `Chat Support System Settings` |
| support-settings tile `.admin-card-description` | `Configure chat widgets, support policies, privacy, Google Sheets sync, and Calendly integration` | `Configure widgets, policies, privacy, data sources, and integrations for your Chat Support System` |
| support-dashboard tile `.admin-card-title` | `Customer Support AI` | `Support System Dashboard` |

### `public/js/help-registry.js`

Existing entries at lines 247-266 — update:
```javascript
'/support-dashboard': {
    file: '/api/docs/support-system-dashboard-user-guide.md',
    title: 'Support System Dashboard Help'
},
'/support-settings': {
    file: '/api/docs/support-settings-user-guide.md',
    title: 'Chat Support System Settings Help'
},
```

### `server/routes/docs.js`

Add to `ALLOWED_DOCS` array (keep old entries for backward compatibility with Higgins direct API calls):
```javascript
'support-settings-user-guide.md',
'support-system-dashboard-user-guide.md',
```

### Navigation (DB-only change)

If rows exist in `platform_modules` for the support pages, run:
```sql
UPDATE platform_modules SET name = 'Chat Support System Settings'
WHERE route_path LIKE '%support-settings%';

UPDATE platform_modules SET name = 'Support System Dashboard'
WHERE route_path LIKE '%support-dashboard%';
```

### HTML Filenames

**Keep as-is**: `support-settings.html` and `support-dashboard.html`. No file renames. No redirect work.

---

## Files to Modify / Create

### Modified Files

| Path | Change |
|---|---|
| `public/support-settings.html` | Rename title/h1/subtitle. Restructure 7→4 tabs. Delete old Widget Config + Connections + Data Sources tabs. Rename Chat Widgets tab to Widget Config. Merge Connections + Data Sources + Integrations into new Integrations tab. Remove dead JS state and functions. Add `is_active` toggle. Fix switchTab() references. |
| `public/support-dashboard.html` | Rename title/h1. Add auth-fetch-loader.js to head. Replace getHeaders() + raw fetch with authFetch() throughout. |
| `public/administrator.html` | Update two admin tile texts. |
| `public/js/help-registry.js` | Update /support-dashboard and /support-settings entries. |
| `server/routes/docs.js` | Add two new guide filenames to ALLOWED_DOCS. |

### Created Files

| Path | Purpose |
|---|---|
| `documentation/guides/support-settings-user-guide.md` | User guide for settings page (covers all 4 tabs) |
| `documentation/guides/support-system-dashboard-user-guide.md` | User guide for dashboard page |
| `__tests__/e2e-ui/annie-video-cards.spec.js` | Playwright: Vimeo + YouTube card rendering tests |
| `__tests__/e2e-ui/annie-calendly.spec.js` | Playwright: Calendly card desktop + mobile tests |

### No Schema Changes
`chat_widgets` table is untouched per REQ scope rule.

---

## Build Sequence

### Step 1 — Fix support-dashboard.html auth pattern + rename
Files: `public/support-dashboard.html`
- Add `<script src="/js/auth-fetch-loader.js"></script>` as first script in `<head>` (before navigation.js)
- Replace all `fetch(url, { headers: getHeaders() })` with `authFetch(url)` (4 sites: loadMetrics, loadConversations, loadPendingActions, handleAction)
- Remove `getHeaders()` function and `const orgId = localStorage...` variable
- Update `<title>` → `Support System Dashboard | Insight 360`
- Update `<h1>` → `Support System Dashboard`
- Verify page loads and all 3 data panels populate
- AC: dashboard title/h1 updated; auth pattern compliant

### Step 2 — Rename support-settings.html title only (no tab changes)
Files: `public/support-settings.html`
- Update `<title>` → `Chat Support System Settings | Insight 360`
- Update `<h1>` → `Chat Support System Settings`
- Update `<p class="header-subtitle">` text
- Page stays at 7 tabs — still functional
- AC: settings title/h1 updated

### Step 3 — Restructure support-settings.html to 4 tabs
Files: `public/support-settings.html`

3a. Delete `<div class="tab-content" id="tab-widget">` block + tab button (old Widget Config)
3b. Delete `<div class="tab-content" id="tab-connections">` block + tab button
3c. Delete `<div class="tab-content" id="tab-data-sources">` block + tab button
3d. Rename Chat Widgets tab button: `data-tab="widget-config"`, label = "Widget Config"
3e. Rename `id="tab-chat-widgets"` → `id="tab-widget-config"` on the panel div
3f. Add `is_active` toggle to `#widget-detail` form (before Save/Cancel buttons)
3g. Build merged Integrations tab panel: 3 `<div class="settings-section">` blocks (Connections, Data Sources, Scheduling)
3h. Delete JS: `widgetConfig` object, `collectFormData`, `saveWidgetConfig`, `renderFields`, `addField`, `removeField`, `renderDomains`, `addDomain`, `removeDomain`, `updateColorSwatch`, `updateAvatarPreview`
3i. Update `switchTab()` to lazy-load on tab switch: `loadChatWidgets()` for `widget-config`, `loadIntegrationStatus()` for `integrations`
3j. Set `widget-config` as default active tab in HTML and DOMContentLoaded

Run `npm test`. Manually click every tab.
AC: exactly 4 tabs in order; Connections under Integrations; Data Sources under Integrations; Widget Config local-state removed; Chat Widgets absorbed.

### Step 4 — Update administrator.html tiles
Files: `public/administrator.html`
- Update support-settings tile title and description
- Update support-dashboard tile title
- AC: admin dashboard consistency

### Step 5 — Docs chain updates + user guides
Files: `public/js/help-registry.js`, `server/routes/docs.js`, two new guide files
- Update help-registry.js entries
- Add filenames to ALLOWED_DOCS in docs.js
- Create `documentation/guides/support-settings-user-guide.md` covering all 4 tabs (note Privacy applies to all org widgets)
- Create `documentation/guides/support-system-dashboard-user-guide.md`
- AC: user guides created; help registry + docs whitelist updated

### Step 6 — DB: Update platform_modules nav labels
Target: Supabase SQL editor
- Run SQL UPDATE for both support pages if rows exist
- Verify sidebar nav reflects new labels in browser
- AC: sidebar nav labels updated

### Step 7 — Playwright: Annie video card tests (G4 / MVP #6)
Files: `__tests__/e2e-ui/annie-video-cards.spec.js`

Before writing: read `public/js/chat-widget.js` to identify the iframe DOM structure for Vimeo and YouTube cards (src domain pattern, container class).

```javascript
test('Vimeo card renders with correct iframe src', async ({ page }) => {
  // mock widget API + SSE endpoint to return message with vimeo_card type
  // verify iframe visible with src containing player.vimeo.com
});
test('YouTube card renders with correct iframe src', async ({ page }) => {
  // mock widget API + SSE endpoint to return message with youtube_card type
  // verify iframe visible with src containing youtube.com/embed
});
```

Run `npx playwright test annie-video-cards.spec.js`
AC: Playwright tests pass for Vimeo card, YouTube card

### Step 8 — Playwright: Annie Calendly card tests (G5 / MVP #7)
Files: `__tests__/e2e-ui/annie-calendly.spec.js`

```javascript
test('Calendly card renders on desktop', async ({ page }) => { ... });
test('Calendly card renders on mobile', async ({ page, isMobile }) => {
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14
  // verify card still visible and not clipped
});
```

Run `npx playwright test annie-calendly.spec.js`
AC: Calendly card desktop + mobile

### Step 9 — Full test suite + mark MVP items done
- `npm test` — all Jest passes
- `npx playwright test` — all e2e specs pass
- Update `documentation/roadmap/MVP-OPEN-ITEMS.md` items #6, #7, #8 → complete
- Draft release notes
- AC: existing Annie S1 + integration tests pass; MVP items marked complete

---

## Acceptance Test Mapping

| Acceptance Criterion | Build Step |
|---|---|
| Page titles + h1 updated on both pages | Steps 1, 2 |
| Sidebar nav labels updated | Step 6 |
| Settings page has exactly 4 tabs in correct order | Step 3 |
| Connections content under Integrations | Step 3g |
| Data Sources content under Integrations | Step 3g |
| Old Widget Config local-state UI removed; Chat Widgets absorbed | Steps 3a, 3d, 3h |
| All current writes to chat_widgets still succeed | Step 3 (no API changes) |
| support-settings-user-guide.md rewritten | Step 5 |
| Help registry + docs whitelist updated | Step 5 |
| Playwright: Vimeo card, YouTube card | Step 7 |
| Playwright: Calendly card desktop, mobile | Step 8 |
| Existing Annie S1 + integration tests pass | Step 9 |
| MVP-OPEN-ITEMS.md #6, #7, #8 marked complete | Step 9 |
| Jordan GO recorded | After Step 9 |

---

## Risks and Mitigations

**R1 — switchTab() ID synchronization.** After renaming `widget` → `widget-config`, any surviving `switchTab('widget')` or `switchTab('chat-widgets')` calls will silently fail. After Step 3, click every tab in browser to verify. Grep for `switchTab('widget')`, `switchTab('connections')`, `switchTab('data-sources')`, `switchTab('chat-widgets')`.

**R2 — loadIntegrationStatus() must fire on tab switch.** Function queries `/api/integrations/user` and `/api/widgets`. Currently only fires in `DOMContentLoaded`. After merge, must also fire when Integrations tab is opened — add lazy-load in `switchTab()`.

**R3 — support-dashboard.html auth-fetch race condition.** Per memory `feedback_init_before_fetch.md`: every page must `await initNavigation()` before `authFetch()`. Existing dashboard does this in `DOMContentLoaded` (line 690-694). Preserve that order during migration.

**R4 — Privacy & Compliance applies to all widgets.** `savePrivacySettings()` writes to every widget in the org. Intentional (org-level policy). Safe via `authFetch` → `requireOrgContext` → only touches calling org's widgets. Document in user guide.

**R5 — Playwright tests need chat-widget.js DOM structure.** Read `public/js/chat-widget.js` before Steps 7-8 to identify exact iframe/embed container structure and CSS classes. Don't guess selectors.

**R6 — demo/index.html dirty in git.** `public/demo/index.html` has uncommitted changes. If Playwright tests use demo page, coordinate. Prefer navigating directly to widget URL for test isolation.

**R7 — platform_modules rows may not exist.** SQL UPDATE in Step 6 is safe even if no rows. Verify with `SELECT * FROM platform_modules WHERE route_path LIKE '%support%';` first.

---

## Executive Summary

The blueprint is ready for direct implementation. Work breaks into 9 sequential steps; each leaves the app in a working state.

**Implementer must know before starting:**

The biggest risk is the `switchTab()` ID refactor in Step 3 — string-matching between `data-tab` attributes and panel `id` attributes means surviving references to deleted tab IDs (`widget`, `connections`, `data-sources`, `chat-widgets`) will silently fail with no console error. After Step 3, click every tab in the browser before committing.

The Playwright tests in Steps 7-8 depend on knowing the exact DOM `chat-widget.js` produces for video and Calendly cards. Read that file before writing tests — do not guess selectors.

The support-dashboard.html auth migration (Step 1) is straightforward but requires care: `auth-fetch-loader.js` must be in `<head>` before `navigation.js`, and `loadDashboard()` must remain after `await initNavigation()`.

Global defaults deletion is confirmed safe — `saveWidgetConfig()` never wrote to DB. The `chat_widgets` schema is untouched throughout.

The doc chain (Step 5) is the most easily skipped but CLAUDE.md mandates all four pieces before a module is complete: user guide, help-registry entry, docs whitelist entry, the file itself. Do all four atomically.
