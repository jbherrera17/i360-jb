# Annie Chat Widget — Implementation Tracker

**Module:** Embeddable Chat Widget (`embeddable_chat`)
**PRD:** `documentation/processes/customer-support-agent-system-prd.md`
**Started:** 2026-03-14 (PRD v2 session)
**Last Updated:** 2026-03-15

---

## Session Log

| Date | Session | Key Outcomes |
|------|---------|-------------|
| 2026-03-14 | PRD v2 + Specialist Reviews | PRD written, STRIDE review, compliance review, pricing model, QA test plan |
| 2026-03-14 | Architecture Decisions | Forked widgetAgentService, Google Sheets sync, pre-chat modes, Calendly provider, demo-first approach |
| 2026-03-15 | Phase 73 Build | DB schema, routes (widgetChat.js, widgets.js), widgetAgentService.js committed |
| 2026-03-15 | Implementation Session | SQL deployed, widget seeded, KB populated, 2 bugs fixed (withTimeout, ilike search), demo live, docs chain complete |
| 2026-03-15 | Support Settings Remediation | 4 bugs fixed (policies crash, widgets 400, privacy blank page, help-modal overlay), privacy load/save wired, Parthenon deep-link, Support dept added, UX rule saved |

---

## Phase A — Infrastructure (Prerequisites)

- [x] **A1. Phase 73 SQL deployed to Supabase** — `chat_widgets`, `widget_sessions`, `chat_widget_messages`, `chat_widget_analytics`, RLS, triggers, RPC functions
- [x] **A2. Module registered** — `embeddable_chat` in `platform_modules` + `role_module_access` for 4 roles (SQL exists in phase73)
- [x] **A3. Routes registered in index.js** — `widgetChat.js` at `/api/chat/public` (line 531), `widgets.js` at `/api/widgets` (line 630)
- [x] **A4. widgetAgentService.js** — Haiku/Sonnet routing, restricted tool set, PII redaction, guardrail screening, output filtering
- [x] **A5. CSP/CORS coordination verified** — Helmet CSP applies to admin pages only (irrelevant for embed.js on external sites). widgetChat.js sets dynamic CORS headers per widget's cors_origins. Compression skips SSE stream endpoint. Public routes registered before auth middleware.
- [x] **A6. Phase 73 SQL deployed to Supabase** — Run 2026-03-15. Tables confirmed: chat_widgets, widget_sessions, chat_widget_analytics. Module registered. Role access seeded.
- [x] **A7. Module nav link** — `route_path` is `/support-settings.html` which exists and has the Chat Widgets tab.

## Phase B — Admin UI + Integrations

- [x] **B1. support-settings.html** — Already built in Phase 73 with all required tabs:
  - [x] Widget CRUD (list, create, edit, delete)
  - [x] Branding config (primary color, welcome message, avatar, disclaimer)
  - [x] Pre-chat mode selector (lead_capture, open_chat, optional_info, custom)
  - [x] CORS domain allowlist editor
  - [x] Usage limits config (messages/session, messages/month, daily spend cap)
  - [x] Privacy policy editor (Privacy tab) + consent text + AI disclosure + data retention
  - [x] Embed code generator (copy-paste snippet)
  - [x] Usage stats available via API (`GET /api/widgets/:id/usage`)
- [x] **B2. Google Sheets sync service** — Backend wired to existing integration infrastructure
  - [x] Service: `SheetsService.syncToContextAsset()` already existed in `providers/google/sheets.js`
  - [x] Admin config UI: connect Google account, select spreadsheet, set sync interval
  - [x] Backend: `sheets_sync` entity type added to Google provider `fetchData()`, sync route passes config + orgId
  - [x] Frontend: `syncSheetsNow()` calls `/api/integrations/google/sync`, `saveSheetsConfig()` persists to widget DB, `loadIntegrationStatus()` loads saved config on page init
- [x] **B3. Calendly integration backend** — Backend wired to existing integration infrastructure
  - [x] Admin config UI: connect Calendly, select event type, procedure-to-URL mapping
  - [x] Backend: OAuth flow + personal access token already in `providers/calendly.js`
  - [x] Frontend: `saveCalendlyConfig()` persists procedure-to-URL mappings to `chat_widgets.calendly_config`, `loadIntegrationStatus()` loads saved mappings and shows connection status
  - [x] Provider seeded in `integration_providers` (Phase 73 SQL)

## Phase C — Embeddable Widget (External-Facing)

- [x] **C1. chat-widget.js** — Already built in Phase 73 (`public/js/chat-widget.js`):
  - [x] FAB mode (floating action button, bottom-right/left)
  - [ ] Inline mode (not yet implemented — future enhancement)
  - [ ] Popup mode (not yet implemented — future enhancement)
  - [x] Fetches widget config from `/api/chat/public/:widget_id/config`
  - [x] Pre-chat form rendering (all 4 modes)
  - [x] SSE streaming for chat responses
  - [x] HMAC token auth (X-Widget-Token header)
  - [x] Responsive (fullscreen on mobile < 480px)
  - [x] Themeable (primary color, avatar, welcome message)
  - [x] Privacy policy link in footer
  - [x] Typing indicator during AI response
  - [x] JS API: `I360Widget.init()`, `.toggle()`, `.destroy()`
  - [x] Session persistence (localStorage) — saves/restores sessionId + messages, 24h expiry
  - [x] "Powered by Insight 360" branding — footer link below disclaimer
  - [x] Data deletion request button in UI — "Delete My Data" link calls DELETE endpoint, clears localStorage
  - [x] `setUser()` API method — `I360Widget.setUser({ name, email, metadata })` merges into session creation
  - [x] Event hooks — `I360Widget.on('ready', 'message', 'error', 'sessionStart', 'sessionRestored', 'dataDeleted')` + `.off()`
- [x] **C2. Demo site** — Already built in Phase 73 (`public/demo/`):
  - [x] Homepage with procedure grid
  - [x] 5 procedure pages (facelift, rhinoplasty, blepharoplasty, necklift, browlift)
  - [x] Annie widget embedded on procedure pages
  - [x] Demo banner, responsive CSS, professional medical practice design

## Phase D — Quality Gate

- [x] **D1. Morgan's S1 test cases** — 15/15 checks passed (`scripts/test-s1-widget.js`)
  - [x] AC-001: Anonymous visitor can send chat message via public endpoint (session + SSE stream)
  - [x] AC-002: Anonymous visitor cannot access admin API (401)
  - [x] AC-003: Widget token validation — valid accepted (201), invalid rejected (401), missing rejected (401), wrong widget rejected (401), config endpoint public by design (no secrets)
  - [x] AC-004: CORS origin enforcement — allowed origin gets header, disallowed origin blocked
  - [x] AC-005: Rate limiting active (IP + widget aggregate)
  - [x] AC-006: Session message cap enforced server-side (max_messages_per_session=50)
  - [x] AC-007: PII redaction on inbound messages (200, redaction before storage)
  - [x] AC-008: Output filtering (filterOutput() strips system prompts, URLs, table names, API keys)
  - [x] AC-009: Usage ceiling configured (monthly=10000, daily_spend=$5, auto-degrade to Haiku)
- [x] **D2. Documentation chain (4-point)** — Completed 2026-03-15
  - [x] User guide: `documentation/guides/embeddable-chat-user-guide.md`
  - [x] Help registry: `/support-settings` → `embeddable-chat-user-guide.md` in `help-registry.js`
  - [x] ALLOWED_DOCS: `embeddable-chat-user-guide.md` + `embeddable-chat-technical-guide.md` in `docs.js`
  - [x] Technical guide: `documentation/guides/embeddable-chat-technical-guide.md`
- [x] **D3. Taylor UI/UX compliance audit** on support-settings.html — 97% compliant, 1 low-sev a11y caveat (toggle aria-labels). Policy badge colors fixed.
- [x] **D4. Blueprint + release notes update** (Parker docs-sync) — Blueprint Phase 75 sections 8-10 added (remediation, Support dept, UI/UX audit). Release notes v3.75 updated with PM session fixes.

---

## Decisions Log (All Sessions)

| # | Decision | Rationale | Session |
|---|----------|-----------|---------|
| 1 | Redact PII before storage, no BAA | Avoids HIPAA BAA while preserving dashboard functionality | Session 1 |
| 2 | Haiku for simple FAQ, Sonnet for complex | ~$0.04/conversation target vs $0.11 all-Sonnet | Session 1 |
| 3 | $49/mo Starter add-on | Widget drives platform adoption, not standalone profit center | Session 1 |
| 4 | Soft cap with auto-degradation | Widget never goes dark. 80% warn, 100% degrade to Haiku-only | Session 1 |
| 5 | Fork to widgetAgentService.js | Security: prevent tool leakage (refund, tier_change) to public endpoint | Session 2 |
| 6 | Google Sheets sync to context_asset (15-min) | Uses existing context injection path, simpler, fewer failure modes | Session 2 |
| 7 | Separate chat_widgets table from widget_configs | Different auth models, different tool sets, different data flows | Session 2 |
| 8 | 4 pre-chat modes (lead_capture, open_chat, optional_info, custom) | Different use cases need different friction levels | Session 2 |
| 9 | Demo-first before main website integration | Persistent demo for client review, no Kevin dependency | Session 2 |
| 10 | Editable privacy policy per widget in admin | Riley compliance R-09, each org customizes for context | Session 2 |
| 11 | Calendly via existing integration provider pattern | Free embed for v1, Standard plan for programmatic booking later | Session 2 |
| 12 | Module ID: embeddable_chat (not support_ai) | Narrower scope — broader support_ai module comes later | Session 3 |

---

## Open Questions / Future Work

- [ ] **Email channel** — Phase 2 per PRD (SendGrid/Mailgun inbound parse)
- [ ] **Slack channel** — Phase 2 per PRD (Slack app OAuth2)
- [ ] **Stripe/financial actions** — Enterprise tier only, Phase 3 per PRD
- [ ] **Voice mode (STT/TTS)** — +$29/mo add-on, uses existing voice.js
- [ ] **Avatar mode (static → animated → streaming)** — Premium tiers
- [ ] **Welcome video** — Configurable per widget, auto-play on first open
- [x] **Proactive triggers** — Time-on-page + scroll-depth auto-open with bubble notification, configurable via branding.proactive_triggers
- [ ] **Rich media in chat** — Images, video, PDF, forms
- [ ] **File upload** — Customer screenshot/file attachment
- [ ] **Conversation history** — Returning users see previous conversations
- [x] **CSAT prompt** — 5-star rating after 6 messages, submitted to /session/csat endpoint
- [x] **True SSE streaming** — Anthropic streaming API for final response after tool use; frontend progressive chunk rendering
- [ ] **Kevin introduction** — Main website integration (held per Session 2 decision)
- [x] **White-label** — branding.hide_branding flag hides "Powered by Insight 360" footer
- [ ] **Overage billing** — Automated billing for ceiling overage (needs Stripe)
- [ ] **Data retention automation** — Auto-delete after configurable retention period (SQL function exists: `cleanup_expired_widget_data`)
