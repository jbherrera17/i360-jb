# REQ-002a — Chat Support System Consolidation + Annie E2E Testing

**Status:** ACTIVE
**Created:** 2026-04-17
**Owner:** Main thread + agent team
**Governance Tier:** Tier 2 (Jordan GO required before push)
**Parent:** [REQ-002 Index](REQ-002-INDEX.md)
**Closes MVP items:** #6, #7, #8

---

## 1. Goals

| # | Goal |
|---|------|
| G1 | Rename pages: `support-settings.html` → "Chat Support System Settings"; `support-dashboard.html` → "Support System Dashboard". Update all surfaces (page title, h1, nav label, breadcrumbs, help registry, docs whitelist, user guides). |
| G2 | Consolidate tabs from 7 to 4: **Widget Config** (absorbs Chat Widgets), **Policies**, **Privacy & Compliance**, **Integrations** (absorbs Connections + Data Sources). |
| G3 | Unified Widget Config tab is the single source of truth for every Annie-configurable knob currently exposed by Phase A/B/C. List view + per-widget edit in one tab. |
| G4 | Playwright e2e: Vimeo + YouTube video card rendering (#6). |
| G5 | Playwright e2e: Calendly card desktop + mobile (#7). |
| G6 | Help docs + user guides updated; release notes drafted. |

## 2. Out of Scope

- Phase C Future Work features (covered in REQ-002b / REQ-002c).
- Backend `chat_widgets` schema changes — keep DB contract stable.
- Migration of orgs using Widget Config local-only state — confirmed none exist.

## 3. Acceptance Criteria

- [ ] Page titles + `<h1>` updated on both pages
- [ ] Sidebar nav labels updated in `navigation.js` / nav config
- [ ] Settings page has exactly 4 tabs in this order: Widget Config, Policies, Privacy & Compliance, Integrations
- [ ] Connections content (Stripe, Slack) lives under Integrations tab
- [ ] Data Sources content lives under Integrations tab
- [ ] Old Widget Config local-state UI removed; Chat Widgets list+edit absorbed into the renamed Widget Config tab
- [ ] All current writes to `chat_widgets` still succeed (multi-tenant scoping intact)
- [ ] `documentation/guides/support-settings-user-guide.md` rewritten + new path/name reflected
- [ ] Help registry + docs whitelist (`server/routes/docs.js` ALLOWED_DOCS) updated
- [ ] Playwright tests pass: Vimeo card, YouTube card, Calendly card desktop, Calendly card mobile
- [ ] Existing Annie S1 security suite + integration tests still pass
- [ ] `MVP-OPEN-ITEMS.md` items #6, #7, #8 marked complete
- [ ] Jordan GO recorded

## 4. Workstream

```
[code-explorer] map current state ─┐
                                    ├──> [code-architect] blueprint ──> [implement] ──┐
[code-architect] target design ────┘                                                   ├──> [Jordan GO] ──> push
                                                                                       │
[qa-test-manager] Annie #6 tests ─────────────────────────────────────────────────────┤
[qa-test-manager] Annie #7 tests ─────────────────────────────────────────────────────┘
```

## 5. Risks

- **R1** Renames touch many files (sidebar, breadcrumbs, help registry, docs whitelist, release notes archive). Easy to miss surfaces — explorer must enumerate.
- **R2** Calendly account access for QA tests — confirm `assist@synergiai.io` credentials available.
- **R3** Demo HTML (`public/demo/index.html`) already dirty in git — coordinate test additions with uncommitted changes.

## 6. Definition of Done

Move to `requests/archive/` when all acceptance criteria pass + REQ-002b file exists and is queued.
