# Insight 360 — MVP Open Items

**Last Updated:** 2026-04-17
**Status:** Active — items to address before public SaaS launch

---

## Open Brain

| # | Issue | Description | Comments |
|---|-------|-------------|----------|
| ~~1~~ | ~~Mobile vertical scrolling broken~~ | ~~In phone mode (< 768px), the thought card grid doesn't scroll vertically.~~ | **Fixed 2026-04-17.** Root cause was `.mobile-nav-backdrop` covering the whole screen with `opacity:0` but no `pointer-events:none`, swallowing all touch events on mobile. Also added `min-height: 0` on `.ob-panels` / `.ob-dashboard` for proper flex shrinking. Platform-wide fix — unlocks interactions on any mobile page. |
| ~~2~~ | ~~Right panel overflows window~~ | ~~Chat panel extends beyond the viewport height.~~ | **Fixed 2026-04-17.** Removed `height: calc(100vh - 3rem)` on `.ob-chat-panel` and added `min-height: 0` through the flex chain (`.ob-chat-panel`, `.chat-panel-body`, `.chat-messages`) so the panel sizes from its flex parent. |
| ~~3~~ | ~~Chat can't write to Open Brain via MCP~~ | ~~Open Brain chat should capture thoughts via MCP `capture_thought`.~~ | **Fixed 2026-04-17.** Verified end-to-end: frontend intent detection (`Capture:` / `Save:` / `Remember:` / `Note:`) + "+ Capture" chip → `/api/open-brain/capture` → MCP `capture_thought`. Additional UX fixes: (a) "+ Capture" chip now actually routes via `dataset.mode`; (b) search no longer filters out cross-category matches; (c) capture confirmation shows which category (`filed under projects`) and auto-switches tabs; (d) `Total` stat parse fixed; (e) blocking loading overlay with context-aware copy on initial load, search, and filter changes. |

---

## Platform Security

| # | Page/Area | Issue | Description | Comments |
|---|-----------|-------|-------------|----------|
| 4 | Client Portal | Email delivery not wired | Magic link emails, client invitations, and password resets are not actually sent. Clients can't log in to the portal. | Need to install an email provider (Resend recommended — `npm install resend`). Wire into `clientPortal.js` at the two TODO comments (lines ~145 and ~864). Deferred by user decision — onboard clients manually for now. |
| ~~5~~ | ~~Cut modules DB migration~~ | ~~`db/phase86-mvp-module-cuts.sql` needs execution against Supabase.~~ | **Ran 2026-04-17.** Executed against Supabase; S2E, TL, briefing, digest, research studio, prompt_transformer hidden from navigation. |

---

## Annie Chat Widget

| # | Page/Area | Issue | Description | Comments |
|---|-----------|-------|-------------|----------|
| ~~6~~ | ~~Widget frontend~~ | ~~Video card rendering untested~~ | ~~`formatRichContent()` detects Vimeo/YouTube URLs.~~ | **Fixed 2026-04-20 (REQ-002a).** Playwright e2e spec `__tests__/e2e-ui/annie-video-cards.spec.js` covers Vimeo card, YouTube card, youtu.be short URL, and bare-link fallback. 5/5 green. |
| ~~7~~ | ~~Widget frontend~~ | ~~Calendly embed untested~~ | ~~Calendly card rendering added but not tested.~~ | **Fixed 2026-04-20 (REQ-002a).** Playwright e2e spec `__tests__/e2e-ui/annie-calendly.spec.js` covers desktop card structure, Schedule Now href, noopener target, multi-card rendering, mobile (iPhone 14 390×844) visibility, tap target, no horizontal scroll, readable text. 7/7 green. |
| ~~8~~ | ~~support-settings.html~~ | ~~Widget Config vs Chat Widgets tab confusion~~ | ~~Two tabs managing overlapping config.~~ | **Fixed 2026-04-20 (REQ-002a).** Consolidated 7 tabs → 4. Widget Config absorbs Chat Widgets (single source of truth, DB-backed). Integrations absorbs Connections + Data Sources. Old Widget Config local-only state deleted. Pages renamed: "Chat Support System Settings" and "Support System Dashboard". |

---

## Polish / P2 Items

| # | Page/Area | Issue | Description | Comments |
|---|-----------|-------|-------------|----------|
| 9 | client-comparison.html | Chart visualizations placeholder | "Chart visualization coming soon" divs remain. OKR progress uses real API now but charts need a charting library integration. | Consider Chart.js or the existing `ChartRenderer` used on other pages. |
| ~~10~~ | ~~admin-client-users.html~~ | ~~Report sharing stub~~ | ~~Dead share button with "coming soon" toast.~~ | **Fixed 2026-04-17.** Removed the share-report button and the `shareReport()` function. Reports page is the canonical surface for sharing. |
| 11 | profile.html | Onboarding wizard TODO | Line 1078: `// TODO: Trigger onboarding wizard` — minor unwired integration. | Low priority — only affects platform integration flow. |
| 12 | X/Twitter & Substack OAuth | Returns 501 | OAuth routes return "coming soon". If these platforms aren't needed for MVP, remove from the integrations UI to avoid confusion. | Already hidden if cut modules migration is run. Otherwise, remove the OAuth route stubs or add `display: none` on the UI cards. |
| 13 | Test coverage | Low threshold (23-24%) | Jest coverage thresholds are very low. MVP routes (agents, chat, parthenon, soul-config, widgets) need integration tests. | Estimate: 2-3 days to write meaningful tests for the core routes. |
| 14 | .env.production.example | Missing from repo | No production-specific env example. Railway deployment relies on manually configured env vars. | Create from `.env.example` with production values documented (required vs optional clearly marked). |

---

## Completed 2026-04-17 Session

- [x] Phase 86 module cuts migration executed (item #5)
- [x] Open Brain mobile scroll + dropdowns — fixed platform-wide `mobile-nav-backdrop` pointer-events bug (item #1)
- [x] Open Brain right chat panel overflow — flex chain `min-height: 0` fix (item #2)
- [x] Open Brain MCP capture verified end-to-end, plus UX polish (item #3)
- [x] "+ Capture" chip routing bug — `dataset.mode` was set but never read in `sendChat()`
- [x] Search cross-category visibility — removed post-search category filter
- [x] Capture confirmation shows detected category + auto-switches tab
- [x] `Total` stat parse regex fix (`Total thoughts: N` shape)
- [x] Blocking loading overlay with context-aware copy (initial, search, filter)
- [x] Removed dead share-report button on admin-client-users.html (item #10)

---

## Completed 2026-04-20 Session — REQ-002a Chat Support System Consolidation

- [x] Page renames: `support-settings.html` → "Chat Support System Settings"; `support-dashboard.html` → "Support System Dashboard"
- [x] support-dashboard.html auth pattern migrated to `authFetch()` with `auth-fetch-loader.js` (removed manual `getHeaders()`)
- [x] Settings page restructured from 7 tabs to 4: Widget Config, Policies, Privacy & Compliance, Integrations
- [x] Widget Config absorbed Chat Widgets tab — single source of truth; old local-only state deleted
- [x] Integrations absorbed Connections + Data Sources — now sections within one tab
- [x] `is_active` toggle added to per-widget config (plumbed through `editWidget` + `saveWidgetDetail`)
- [x] switchTab() lazy-loads Privacy + Integrations on first open
- [x] administrator.html tiles updated to new page labels
- [x] Help registry + docs whitelist updated with new guide filenames
- [x] Two new user guides: `support-settings-user-guide.md`, `support-system-dashboard-user-guide.md`
- [x] SQL migration `db/req-002a-nav-label-rename.sql` prepared for sidebar label update
- [x] Playwright e2e: 12 tests covering Vimeo + YouTube + Calendly (desktop + mobile) — items #6, #7 complete
- [x] Dead code purged: `widgetConfig` state, `saveWidgetConfig`, `collectFormData`, `renderFields/addField/removeField`, `renderDomains/addDomain/removeDomain`, `updateColorSwatch`, `updateAvatarPreview`

---

## Completed 2026-04-13 Session

For reference — these were identified and fixed during the 2026-04-13 MVP hardening session:

- [x] Annie widget: 10 gaps fixed (session ID bug, Sheets sync, data retention cron, video cards, Calendly cards, custom pre-chat, demo images)
- [x] Auth enforcement in dev (no more silent null-user passthrough)
- [x] 19 routes secured with `requireOrgContext` middleware
- [x] 6 routes converted to factory pattern (governance, integrity, business-roles, department-strategy, users, departments)
- [x] Module gating on soul-config and briefing routes
- [x] chat.js converted to factory pattern, `requireModule('higgins')` removed (universal feature)
- [x] Dead nav link removed (`/prompt-editor.html`)
- [x] Duplicate route registrations fixed
- [x] Node version aligned (Dockerfile 18 -> 20)
- [x] Token/MCP encryption keys required in production
- [x] .env.example updated with LinkedIn, Notion vars
- [x] Open Brain: fixed MCP auth key + header mismatch
- [x] Open Brain: UI/UX standards alignment (external CSS, standard toolbar, card redesign, responsive layout, floating chat panel)
