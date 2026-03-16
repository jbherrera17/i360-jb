# Embeddable Chat Widget Technical Guide

**For:** Developers and System Administrators
**Module:** Embeddable Chat Widget (Phase 73)
**Last Updated:** 2026-03-15

---

## Architecture Overview

The embeddable chat widget is a public-facing chat system that runs on external websites. It is architecturally separate from the Phase 71 internal support widget (`widget_configs` table) — different auth models, different tool sets, different data flows.

```
External Website                    Insight 360 Server
┌─────────────────┐               ┌──────────────────────────┐
│ chat-widget.js  │──HMAC Auth──>│ widgetChat.js (public)   │
│ (self-contained)│<──SSE Stream─│ widgetAgentService.js    │
│                 │               │ ├── guardrailEnforcement  │
│ data-widget-id  │               │ ├── piiRedaction          │
│ data-token      │               │ ├── context_assets (KB)   │
└─────────────────┘               │ └── Anthropic API         │
                                  │     (Haiku / Sonnet)      │
                                  └──────────────────────────┘
```

### Security Isolation

The widget agent service (`widgetAgentService.js`) is deliberately forked from `supportAgentService.js` to prevent tool leakage. Critical security properties:

- **Only 2 tools**: `search_knowledge_base` and `escalate_to_human`
- **No access to**: `process_refund`, `change_tier`, `lookup_customer`
- **Stripped system prompt**: No internal org details, table names, or API keys
- **Output filtering**: Strips system prompt fragments, internal URLs, database table names
- **PII redaction**: All inbound messages scanned before storage

---

## Database Schema

### Primary Tables

| Table | Purpose |
|-------|---------|
| `chat_widgets` | Widget configurations (branding, limits, CORS, pre-chat) |
| `widget_sessions` | Visitor session tracking with fingerprints |
| `chat_widget_messages` | Message analytics (separate from `support_messages`) |
| `chat_widget_analytics` | Aggregated usage statistics |

### Key Columns on `chat_widgets`

| Column | Type | Description |
|--------|------|-------------|
| `widget_token` | TEXT UNIQUE | Public HMAC token (included in embed code) |
| `widget_token_secret` | TEXT | Secret key for HMAC validation (never exposed) |
| `cors_origins` | TEXT[] | Allowed domains for CORS enforcement |
| `branding` | JSONB | Primary color, welcome message, avatar URL, disclaimer |
| `limits` | JSONB | Messages/session, sessions/day, messages/month, daily spend cap |
| `pre_chat_fields` | JSONB | Mode (lead_capture/open_chat/optional_info/custom) + field config |
| `usage_stats` | JSONB | Current month messages, daily spend tracking |
| `sheets_config` | JSONB | Google Sheets sync configuration |
| `calendly_config` | JSONB | Calendly integration configuration |

### RLS Policies

- `chat_widgets_org_access`: Org members can CRUD their own widgets
- `widget_sessions_access`: Sessions accessible via widget's org membership
- All tables have `org_id` scoping

---

## API Endpoints

### Public Routes (No Auth Required)

Registered at `/api/chat/public` **before** auth middleware in `server/index.js` (line 531).

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/:widget_id/config` | Public widget config (safe fields only) | None |
| GET | `/:widget_id/privacy-policy` | Rendered privacy policy HTML | None |
| POST | `/:widget_id/session` | Create chat session | HMAC token |
| POST | `/:widget_id/stream` | Send message + get SSE response | HMAC token |
| DELETE | `/:widget_id/data/:session_id` | Delete visitor's conversation data | HMAC token |
| OPTIONS | `/:widget_id/*` | CORS preflight | None |

### Admin Routes (Auth Required)

Registered at `/api/widgets` with `requireModule('embeddable_chat')` middleware.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List org's widgets |
| POST | `/` | Create widget (with `checkResourceLimit`) |
| GET | `/:id` | Get widget details |
| PUT | `/:id` | Update widget |
| DELETE | `/:id` | Delete widget |
| POST | `/:id/rotate-token` | Rotate HMAC token |
| GET | `/:id/usage` | Get usage statistics |

---

## Authentication Flow

### HMAC Token Validation

1. Widget embed code includes `data-widget-id` and `data-token`
2. Client sends `X-Widget-Token` header with every request
3. Server looks up widget by ID, verifies it's active
4. Server computes `HMAC-SHA256(widget_token_secret, widget_id)`
5. Timing-safe comparison with provided token
6. On match, `req.widget` and `req.widgetOrgId` are set

### CORS Enforcement

1. Widget's `cors_origins` array lists allowed domains
2. Server checks `Origin` header against the allowlist
3. Same-origin requests (from I360 itself) are always allowed
4. Wildcard subdomains supported (e.g., `*.example.com`)
5. Empty allowlist = block all (secure default)

---

## LLM Routing

### Haiku vs Sonnet Decision

| Condition | Model | Cost |
|-----------|-------|------|
| Simple FAQ (< 200 chars, no complexity indicators) | Haiku | ~$0.01/conv |
| Complex query (comparison, recommendation, multi-step) | Sonnet | ~$0.11/conv |
| Turn count > 3 | Sonnet | - |
| Daily spend cap exceeded | Haiku (forced) | - |
| Monthly ceiling reached | Haiku (forced) | - |

### Complexity Indicators (triggers Sonnet)

- Comparison words: "compare", "versus", "difference between"
- Recommendation requests: "should I", "would you recommend"
- Multi-procedure: "both", "combined", "together with"
- Personal context: "my situation", "my condition"
- Long messages (> 200 characters)

### Cost Controls

- `limits.daily_llm_spend_cap`: Hard cap on daily LLM spend (default $5.00)
- `limits.max_messages_per_month`: Monthly message ceiling (default 10,000)
- At 80% ceiling: warning notification
- At 100% ceiling: auto-degrade to Haiku-only + shorter responses
- Widget never goes dark — soft degradation only

---

## Message Pipeline

```
Visitor Message
  → Message length check (max 2000 chars) [SEC-14]
  → Guardrail screening [SEC-07]
  → PII redaction [R-01]
  → Store redacted message in support_messages
  → Extend session expiry (sliding window)
  → Check usage limits
  → Classify complexity (Haiku vs Sonnet)
  → Build system prompt (stripped-down, no internal details)
  → Load conversation history + summarize if > 3 turns
  → Run tool loop (max 3 iterations)
  → Filter output (strip system prompt markers, internal URLs, etc.)
  → Estimate and track cost
  → Store assistant message
  → Return via SSE
```

---

## Rate Limiting

| Limit | Value | Scope |
|-------|-------|-------|
| Messages per IP per minute | 30 | Per source IP |
| Messages per widget per minute | 200 | Aggregate across all visitors |
| SSE connections per widget | 100 | Concurrent connections |
| Session message cap | Configurable (default 50) | Per conversation |
| Daily sessions per widget | Configurable (default 500) | Per widget |

In-memory rate limiting with 1-minute sliding windows. Periodic cleanup every 60 seconds.

---

## Embed Script (`chat-widget.js`)

Self-contained IIFE that:
1. Auto-initializes from `<script>` tag data attributes
2. Or via `I360Widget.init({ widgetId, token, position, baseUrl })`
3. Creates shadow-free DOM elements with scoped CSS
4. Manages session lifecycle (pre-chat form → active chat)
5. Handles SSE streaming responses
6. Provides public API: `I360Widget.toggle()`, `I360Widget.destroy()`

### Embed Code Pattern

```html
<script src="https://your-domain/js/chat-widget.js"
        data-widget-id="UUID"
        data-token="HMAC_TOKEN"
        data-position="bottom-right"
        data-base-url="https://your-i360-domain"></script>
```

### Mobile Behavior

On screens < 480px, the chat window goes fullscreen (100vw x 100vh) for usability.

---

## Module Registration

```sql
-- platform_modules
INSERT INTO platform_modules (id, name, ...) VALUES ('embeddable_chat', ...);

-- role_module_access (4 roles)
INSERT INTO role_module_access (business_role, module_id, can_access)
VALUES ('executive', 'embeddable_chat', true),
       ('director', 'embeddable_chat', true),
       ('manager', 'embeddable_chat', true),
       ('supervisor', 'embeddable_chat', true);
```

Route path: `/support-settings.html`
Nav group: `modules`
Category: `tool`
Min tier: `starter`

---

## Database Functions

| Function | Purpose |
|----------|---------|
| `next_support_message_seq(conversation_id)` | Auto-increment message sequence numbers |
| `extend_widget_session(session_id)` | Extend session expiry (sliding window) |
| `cleanup_expired_widget_data(retention_days)` | Delete conversations older than retention period |
| `chat_widgets_update_timestamp()` | Auto-update `updated_at` on widget changes |

---

## File Inventory

| File | Purpose |
|------|---------|
| `server/routes/widgetChat.js` | Public chat endpoints (SSE, session, privacy, data deletion) |
| `server/routes/widgets.js` | Admin CRUD endpoints |
| `server/services/widgetAgentService.js` | AI agent execution (isolated from supportAgentService) |
| `server/services/piiRedactionService.js` | PII detection and redaction |
| `public/js/chat-widget.js` | Embeddable widget script for external sites |
| `public/support-settings.html` | Admin UI (Chat Widgets, Privacy, Data Sources, Integrations tabs) |
| `public/demo/` | Demo medical practice site with Annie widget |
| `db/phase73-embeddable-chat-widgets.sql` | Schema, RLS, triggers, functions, module registration |
