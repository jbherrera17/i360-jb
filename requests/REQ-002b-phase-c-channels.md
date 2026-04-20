# REQ-002b — Phase C Channels + Lightweight Features

**Status:** QUEUED (starts after REQ-002a closes)
**Created:** 2026-04-17
**Parent:** [REQ-002 Index](REQ-002-INDEX.md)

---

## Scope (Phase C Future Work, lightweight tier)

| ID | Feature | T-shirt | Notes |
|----|---------|---------|-------|
| F1 | Inline / popup widget modes (in addition to FAB) | M | New embed targets, layout variants in chat-widget.js |
| F4 | File upload | L | Multipart, virus scan, storage backend, retention |
| F5 | Conversation history (visitor side) | L | Persistence model, identity binding without login |
| F7 | Welcome video | M | Upload + render in pre-chat |
| F8 | Avatar animation | M | Provider needs picking |
| F9 | Rich media beyond video/Calendly | L | Carousels, product cards, in-chat forms |
| F10 | Email channel | L | Inbound email → Annie thread; reply via email |
| F11 | Slack channel | M | Slack inbound → Annie |
| F13 | Data retention automation | M | Scheduled purge per org policy |

## Open Questions
- Storage backend for file upload (Supabase Storage vs S3)?
- Avatar animation provider?
- Email inbound MX strategy (own domain vs forwarding)?

## Definition of Done
Each feature lands as its own PR with: implementation + tests + docs + Jordan GO. REQ archives when all features in scope are merged or explicitly deferred.
