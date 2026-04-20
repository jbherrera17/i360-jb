# REQ-002 — Chat Support System Initiative (Index)

**Status:** ACTIVE
**Created:** 2026-04-17
**Owner:** TBD
**Governance Tier:** Tier 2

This is an umbrella initiative covering the renamed/restructured Chat Support System and Phase C Future Work. Split into three sequential REQs.

| ID | Scope | Status | Blocks |
|----|-------|--------|--------|
| [REQ-002a](REQ-002a-consolidation-and-annie-testing.md) | Page renames, 7→4 tab consolidation, Annie #6/#7 e2e tests | ACTIVE — code-explorer + code-architect dispatched 2026-04-17 | Closes MVP #6, #7, #8 |
| [REQ-002b](REQ-002b-phase-c-channels.md) | Phase C Future Work: inline/popup, file upload, history, video, rich media, Email, Slack, retention, avatar | QUEUED — starts after 002a | — |
| [REQ-002c](REQ-002c-voice-and-billing.md) | Voice mode, Stripe billing, overage, Kevin intro | BLOCKED on Q3/Q4/Q5 (see file) | — |

**Decisions log (2026-04-17):**
- Q1: Extend Phase C with Future Work items
- Q2: Widget Config local-only state safe to delete; Chat Widgets becomes source of truth
- Page renames: Settings → "Chat Support System Settings", Dashboard → "Support System Dashboard"
- Tab consolidation: Connections + Data Sources fold into Integrations; Chat Widgets folds into Widget Config

Original combined draft history is in git; this index supersedes the previous monolithic REQ-002.
