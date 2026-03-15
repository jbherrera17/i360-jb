# Annie Embeddable Chat Widget — PRD v2

**Prepared by:** Reese (Spec Writer), reviewed by Avery (PM Orchestrator)
**Client:** Dr. Jon Mendelsohn — Advanced Cosmetic Surgery & Laser Center
**Date:** 2026-03-14
**Status:** APPROVED FOR IMPLEMENTATION
**Supersedes:** Annie Chat Agent — PRD, Pricing & Rollout Proposal (v1, 2026-03-13)
**Governance:** WF-01 Consolidated Report (2026-03-14) — Security, Compliance, FMEA complete

---

## Changes from v1

| Area | v1 State | v2 Change | Source |
|------|----------|-----------|--------|
| Cost model | $12-18/mo estimated | Corrected to ~$95/mo with Haiku tiering (was ~$344/mo Sonnet-only) | Quinn — cost model discrepancy |
| PHI handling | "No PII storage" (contradicted by conversation review) | PII redaction before storage; BAA confirmed unnecessary | Riley R-01/R-02, JB decision |
| Execution path | Reused `supportAgentService.js` (implied) | Dedicated `widgetAgentService.js` with restricted tool set | Alex E-02 (Critical) |
| Database | Used `widget_configs` | New `chat_widgets` table (separate, multi-widget per org) | Morgan finding, JB decision |
| Sheets integration | Runtime fetch from Sheets API | Sync to `context_asset` row every 15 min | JB decision |
| Security | 5 NFRs mentioned | 15 security requirements (SEC-01 through SEC-15) | Alex STRIDE |
| Compliance | HIPAA disclaimer only | 9 compliance controls + privacy policy + consent mechanism | Riley regulatory review |
| **NEW: Privacy policy** | Not specified | Editable privacy policy in chat admin panel | Session 2 requirement |
| **NEW: Demo artifact** | Kevin integration assumed | Standalone demo environment for client demonstrations | Session 2 — Kevin deferred |
| **NEW: Sheets admin** | Credentials handled externally | Google Sheets config in chat admin using existing OAuth | Session 2 requirement |
| **NEW: Calendly admin** | Embed URLs only | Calendly provider registration + admin config panel | Session 2 requirement |
| LLM routing | Single model (Sonnet) | Haiku for simple FAQs, Sonnet for complex/multi-turn | JB decision |
| Usage limits | Hard caps only | Soft cap + auto-degrade at ceiling (80% warn, 100% Haiku-only) | JB decision |
| Pre-chat fields | No PII (anonymous only) | Fully configurable per widget: no fields, optional, or required. Preset modes for lead-gen vs. support use cases. | JB decision |
| FMEA | Not performed | 38 failure modes analyzed, 9 launch blockers mitigated | WF-07 |
| Acceptance criteria | 17 criteria | 34 criteria covering security, compliance, and new features | All agents |

---

## 1. Executive Summary

Dr. Jon Mendelsohn wants to transform Annie from a homepage-only chatbot into an embedded, page-level AI assistant across his surgical practice website. The current Annie system runs outside of Insight 360 on a standalone platform at $175/month.

This PRD specifies the **Embeddable Chat Widget** module for i360 — a secure, compliant, cost-controlled public-facing chat system. Annie becomes the first client instance, deployed on 5 surgical procedure pages via iframe.

**Key design principles (v2):**
- **Security isolation:** Dedicated execution service with restricted tools — no access to refund, tier_change, or other internal operations
- **PII protection:** All visitor messages pass through PII redaction before storage
- **Cost control:** Haiku-first routing with Sonnet escalation; soft cap + auto-degrade at usage ceiling
- **Compliance by default:** AI disclosure, medical disclaimers, consent mechanism, privacy policy, data retention, right-to-delete
- **Demo-first rollout:** Standalone demo environment before client website integration

---

## 2. Problem Statement

**Statement:** Annie is currently accessible only via a homepage banner. Most visitors land directly on procedure pages from YouTube, Google, or social media — they never see her. A competitor (Dear Doc) achieves ~70% new-patient engagement with a persistent, contextual chat widget. Annie needs to be where visitors already are.

**Affected Users:** Website visitors (prospective patients), Dr. Mendelsohn (practice owner), platform administrators

**Current Behavior:** Annie runs on a standalone system ($175/mo), limited to homepage, no integration with i360's context injection, analytics, or agent management.

**Desired Behavior:** Annie is embedded on each surgical procedure page, powered by i360's full agent infrastructure, with conversation review, Google Sheets data sync, Calendly scheduling, and compliance controls built in.

**Evidence:** Dear Doc ~70% engagement rate (competitor data from Jon). Jon's existing Calendly embed approach works. Google Spreadsheet with 5 procedures already exists.

---

## 3. User Personas

| Persona | Description | Goals |
|---------|-------------|-------|
| **Website Visitor** | Prospective patient browsing procedure pages | Get answers about procedures, see relevant videos, book consultations |
| **Dr. Mendelsohn (Client)** | Practice owner | Increase engagement, replace static content with AI, maintain brand control |
| **Org Admin (any client)** | Organization administrator in i360 | Configure widgets, manage data sources, review conversations, customize branding |
| **JB (Platform Admin)** | Insight 360 operator | Configure agents, monitor usage, manage platform-level settings |
| **Sales Team** | Synergi sales staff | Demonstrate widget to prospective clients using demo environment |

**Note:** Kevin (Jon's web developer) persona is deferred. Demo artifact replaces the need for Kevin's involvement in initial validation.

---

## 4. Scope

### 4.1 Goals

1. Deploy Annie as an embedded chat widget on 5 surgical procedure pages
2. Build a reusable Embeddable Chat Widget module for any i360 client
3. Implement PII redaction to avoid HIPAA BAA requirements
4. Provide Google Sheets data sync for procedure knowledge base
5. Enable Calendly scheduling integration (embed + future API)
6. Build conversation review dashboard with export and knowledge feedback loop
7. Create standalone demo environment for sales demonstrations
8. Meet all 15 security requirements and 9 compliance controls identified in WF-01

### 4.2 Non-Goals

1. **Dynamic HeyGen video avatar** — Cost prohibitive ($2.5K-12.5K/mo at scale). Evaluate after Phase 1 engagement data.
2. **General-purpose chatbot mode** — Scope to surgical procedures only. General-purpose is Phase 2.
3. **Multi-language support** — English only for launch.
4. **Voice input/output** — Text-only for launch.
5. **Automated knowledge base updates** — Manual export-to-context-asset workflow only. AI-suggested updates are Phase 2.
6. **Production website integration** — Demo artifact only. Kevin introduction and live site integration deferred.
7. **Calendly MCP-driven scheduling** — Embed approach for Phase 1. MCP/API for programmatic booking deferred.

### 4.3 Constraints

1. **Security isolation:** Widget execution service MUST NOT have access to `supportAgentService.js` tools (refund, tier_change, escalation, customer_lookup). [SEC-04]
2. **PII redaction:** All visitor messages MUST be redacted before storage. Pre-chat email stored in separate column. [R-01/R-02]
3. **Cost ceiling:** Daily LLM spend capped per widget ($5/day Starter, $25/day Business, $100/day Enterprise). [SEC-09]
4. **Existing infrastructure:** Must use existing OAuth/credential manager, integrations framework, and Phase 71 data layer.
5. **Railway deployment:** Deploys from `develop` branch. No separate infrastructure.

---

## 5. Functional Requirements

### FR-01: Public Chat Endpoint

- Route: `POST /api/chat/public/:widget_id/stream`
- **No Supabase auth** — visitors are anonymous
- HMAC-signed widget token validation [SEC-01]
- Server-side `allowed_domains` enforcement against `chat_widgets.cors_origins` [SEC-02]
- Public routes registered **before** `authenticate` middleware in `server/index.js` [SEC-03]
- SSE streaming response (reuses existing streaming infrastructure)
- Widget token `is_active` check on every request [SEC-15]
- `org_id` derived exclusively from widget token payload, never from request [SEC-05]

### FR-02: Widget Agent Execution Service

- New service: `server/services/widgetAgentService.js`
- **Restricted tool set** — only `search_knowledge_base` and `escalate_to_human` [SEC-04]
- NO access to `process_refund`, `change_tier`, `lookup_customer`, or any `supportAgentService` tools
- **Stripped-down system prompt** — no full soul config, no internal org details [SEC-06]
- `guardrailEnforcement.screenMessage()` on every inbound visitor message [SEC-07]
- LLM output filtering for system prompt leakage [SEC-08]
- Visitor message length limit: 2000 characters [SEC-14]
- **LLM routing:** Intent classification → Haiku for simple FAQ, Sonnet for complex/multi-turn
- **Conversation summarization** after turn 3 to reduce token replay costs
- Per-session message cap (configurable, default 50) [SEC-09]

### FR-03: Widget Configuration & Management

- New database table: `chat_widgets` (separate from `widget_configs`)
- Supports **multiple widgets per organization**
- Schema:
  ```sql
  chat_widgets (
      id UUID PRIMARY KEY,
      org_id UUID REFERENCES organizations(id),
      agent_id UUID REFERENCES agents(id),
      widget_name TEXT NOT NULL,
      widget_token TEXT UNIQUE NOT NULL,    -- HMAC-signed [SEC-01]
      widget_token_secret TEXT NOT NULL,     -- Per-widget signing secret
      cors_origins TEXT[] DEFAULT '{}',      -- Allowed domains [SEC-02]
      branding JSONB DEFAULT '{}',           -- avatar_url, primary_color, welcome_message, disclaimer
      limits JSONB DEFAULT '{}',             -- max_messages_per_session, max_sessions_per_day, max_messages_per_month, daily_llm_spend_cap
      pre_chat_fields JSONB DEFAULT '{}',    -- Configurable per widget (see Pre-Chat Mode below)
      privacy_policy TEXT,                   -- Org-customizable privacy policy content
      consent_text TEXT,                     -- Consent checkbox text
      data_retention_days INTEGER DEFAULT 90, -- [R-06]
      calendly_config JSONB DEFAULT '{}',    -- Per-procedure Calendly embed URLs
      sheets_config JSONB DEFAULT '{}',      -- Spreadsheet ID, sync interval, last sync
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
  )
  ```
- Admin UI: Extend `support-settings.html` with new tabs (not a separate page)
- Widget token rotation capability
- Embed code generator (iframe + script tag options)

### FR-04: Session Management

- New table: `widget_sessions`
  ```sql
  widget_sessions (
      id UUID PRIMARY KEY,
      widget_id UUID REFERENCES chat_widgets(id),
      session_token TEXT UNIQUE NOT NULL,
      visitor_email TEXT,               -- From pre-chat, stored separately from messages
      visitor_name TEXT,                -- From pre-chat, stored separately
      visitor_fingerprint TEXT,         -- Hashed, non-PII
      messages_count INTEGER DEFAULT 0,
      consent_given BOOLEAN DEFAULT false, -- [R-08]
      consent_timestamp TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 minutes'),
      metadata JSONB DEFAULT '{}'
  )
  ```
- **Sliding expiry:** Extend `expires_at` on each message activity
- Per-widget aggregate rate limit [SEC-10]
- Max concurrent SSE connections per widget [SEC-11]

### FR-05: PII Redaction Pipeline

- New service: `server/services/piiRedactionService.js`
- Scans every inbound visitor message before storage
- Redacts: names, emails, phone numbers, SSN patterns, dates of birth, addresses, medical record numbers
- Redaction markers: `[REDACTED-EMAIL]`, `[REDACTED-PHONE]`, etc.
- Pre-chat fields (email, name) stored in `widget_sessions` columns, NOT in `support_messages.content`
- Redaction applied BEFORE writing to `support_messages` table
- Logging: count of redactions per message (not the redacted content)

### FR-06: Google Sheets Data Connector

- New service: `server/services/integrations/providers/google/sheets.js`
- Extends existing Google provider (scope `spreadsheets.readonly` already defined)
- **Sync pattern:** Reads spreadsheet → transforms to structured text → writes to `context_assets` row
- Configurable sync interval (default 15 minutes)
- Cache layer: last-known-good data served on Sheets API failure
- **Data sanitization on import** — schema validation + injection scanning [SEC-12]
- **Credentials never exposed to client** — server-side only, encrypted via `credentialManager.js` [SEC-13]
- **Admin panel in support-settings.html:**
  - "Data Sources" tab
  - Connect Google account using existing `/api/integrations/user/google/connect` flow with sheets scope
  - Select specific spreadsheet after connection
  - Configure sync interval
  - Show sync status, last sync time, row count
  - Manual "Sync Now" button

### FR-07: Calendly Integration

- New provider: `server/services/integrations/providers/calendly.js` (extends `BaseIntegrationProvider`)
- Register in integration provider registry
- **Phase 1 (Launch):** Embed approach
  - Calendly embed URLs configured per procedure in `chat_widgets.calendly_config`
  - Annie presents inline Calendly widget when visitor wants to schedule
  - Popup mode for mobile viewports
  - Fallback: direct Calendly link + phone number + office hours
- **Phase 2 (Future):** MCP/API approach via `meAmitPatil/calendly-mcp-server`
  - Programmatic availability checking and scheduling
  - Requires Calendly Standard plan ($10/user/mo minimum)
- **Admin panel in support-settings.html:**
  - "Integrations" tab (alongside Google Sheets)
  - Connect Calendly via OAuth or Personal Access Token
  - Configure embed URLs per procedure/event type
  - Test connection status
- **Test account:** Free Calendly account at assist@synergiai.io for development
- Add `integration_providers` seed row for Calendly

### FR-08: Embeddable Frontend Widget

- `public/js/chat-widget.js` — lightweight loader script (< 50KB gzipped)
- Creates iframe container on host page
- `postMessage` communication channel between host and widget
- Branded chat UI (colors, avatar, welcome message from `chat_widgets.branding`)
- SSE stream handling
- Mobile-responsive
- **Pre-chat form:** Fully configurable per widget with preset modes (see Pre-Chat Modes below)
- **AI transparency disclosure:** "You are chatting with an AI assistant" [R-03]
- **Medical disclaimer footer:** "This AI does not provide medical diagnoses..." [R-04]
- **Privacy policy link** in pre-chat form (when pre-chat form is shown) or widget footer (when no form) [R-09]

#### Pre-Chat Configuration Modes

Each widget's `pre_chat_fields` JSONB defines what visitors see before chatting. Three preset modes cover the primary use cases, plus a custom option:

| Mode | Email | Name | Custom Fields | Use Case |
|------|-------|------|--------------|----------|
| `lead_capture` | Required | Optional | Supported | **Lead generation** — downloading assets, booking consultations. Annie (Jon's use case). |
| `open_chat` | Hidden | Hidden | None | **Customer support** — minimize friction, let visitors chat immediately. No barrier to entry. |
| `optional_info` | Optional | Optional | Supported | **Balanced** — visitors can provide info but aren't blocked if they don't. |
| `custom` | Per-field config | Per-field config | Supported | **Custom** — admin configures each field individually (enabled/required/label/placeholder). |

**Pre-chat fields JSONB schema:**
```json
{
  "mode": "lead_capture | open_chat | optional_info | custom",
  "fields": {
    "email": { "enabled": true, "required": true, "label": "Email", "placeholder": "your@email.com" },
    "name": { "enabled": true, "required": false, "label": "Name", "placeholder": "Your name" },
    "custom_1": { "enabled": false, "required": false, "label": "", "placeholder": "", "type": "text" }
  },
  "show_consent_checkbox": true
}
```

**Behavior by mode:**
- **`lead_capture`:** Pre-chat form shown with email required. Visitor cannot send first message until form is submitted. Consent checkbox included. Privacy policy link in form.
- **`open_chat`:** No pre-chat form. Visitor sees AI disclosure + medical disclaimer inline, then can type immediately. Consent is implicit (noted in privacy policy link in widget footer). Privacy policy link in widget footer instead of form.
- **`optional_info`:** Pre-chat form shown but all fields optional. Visitor can skip the form entirely via "Skip" button. Consent checkbox included.
- **`custom`:** Admin configures each field individually in the Widget admin tab.

**Admin UI (support-settings.html > Widgets tab):**
- Mode selector dropdown (Lead Capture / Open Chat / Optional Info / Custom)
- When "Custom" selected: field-by-field configuration (toggle enabled, toggle required, edit label/placeholder)
- Preview of pre-chat form in real-time
- Default for new widgets: `lead_capture` (preserves current Annie behavior for Jon)
- Video card rendering (Vimeo embeds in responses)
- Calendly embed rendering (inline desktop, popup mobile)
- Static avatar display (HeyGen screenshot)

### FR-09: Privacy Policy & Compliance

- **Default privacy policy template** created and editable per org
- **"Privacy & Compliance" tab** in support-settings.html:
  - Rich text editor for privacy policy content
  - Preview button
  - Consent checkbox text editor
  - Data retention period selector (30/60/90/180/365 days)
  - Medical disclaimer text editor
  - AI disclosure text editor
- **Public endpoint:** `GET /api/chat/public/:widget_id/privacy-policy` — serves the org's customized privacy policy
- **Consent mechanism:** Checkbox + privacy policy link in pre-chat form [R-08, R-09]
- **Data retention:** Automated cleanup job for conversations older than configured retention period [R-06]
- **Right-to-delete:** `DELETE /api/chat/public/:widget_id/data/:session_id` endpoint [R-07]
  - Visitor can request deletion of their conversation data
  - Deletes from `support_messages` and `widget_sessions`
  - Returns confirmation

### FR-10: Demo Web Artifact

- New directory: `public/demo/`
- Self-contained demo environment simulating a medical practice website
- **Pages:**
  - `demo/index.html` — practice homepage with navigation
  - `demo/facelift.html` — procedure page with Annie widget embedded
  - `demo/rhinoplasty.html` — procedure page with Annie widget embedded
  - `demo/blepharoplasty.html` — procedure page with Annie widget embedded
  - `demo/necklift.html` — procedure page with Annie widget embedded
  - `demo/browlift.html` — procedure page with Annie widget embedded
- **Features:**
  - Professional medical practice look and feel
  - Annie widget iframe embedded on each procedure page
  - Branding customization showcase (show different color themes)
  - Mobile-responsive
  - Works with real backend (connects to actual widget endpoint)
- **Purpose:** Sales team can show prospective clients; Jon can review without Kevin
- **Hosting:** Served from the i360 server at `/demo/*` path. Can be deployed to demo subdomain later.
- **No authentication required** for demo pages (they're just static HTML with embedded widgets)

### FR-11: Conversation Review & Export Dashboard

- Extends existing `support-dashboard.html` or new tab in `support-settings.html`
- Leverages Phase 71 `support_conversations` and `support_messages` tables
- **Features:**
  - Conversation list view with filters (date range, status, sentiment, procedure topic)
  - Full transcript view (messages in sequence, PII-redacted)
  - Sentiment indicators per conversation
  - Keyword search across message content (search `content_text` not just metadata)
  - Star/flag conversations for follow-up
  - Internal notes (not visible to visitors)
- **Export:**
  - CSV (date, visitor info, messages, sentiment, topic)
  - JSON (full structured data)
  - PDF (formatted for sharing)
  - **"Export to Context Asset"** — one-click conversion to context asset for knowledge feedback loop
- **Email digest:** Optional daily/weekly summary of new conversations, sentiment trends, unanswered questions

### FR-12: Usage Ceiling & Auto-Degrade

- Per-widget monthly message ceiling stored in `chat_widgets.limits`
- **At 80% ceiling:** Notification to org admin (in-app + optional email)
- **At 100% ceiling:**
  - Auto-degrade to Haiku-only responses (shorter, simpler)
  - Notification to org admin with projected overage cost
  - Widget continues functioning (never goes dark on client's site)
  - Admin can: (a) upgrade tier, (b) accept overage billing, (c) increase ceiling
- Per-widget daily LLM spend cap [SEC-09]:
  - Starter: $5/day
  - Business: $25/day
  - Enterprise: $100/day
- Track actual LLM costs per widget per day

### FR-13: Analytics & Usage Tracking

- Track per-widget: sessions, messages, avg duration, top questions, scheduling conversion rate
- North Star Metric: Scheduling Conversion Rate (SCR) — target 15% within 90 days
- Extend `agent_executions` table with `widget_id` and `is_public` fields
- Dashboard view for widget performance metrics
- Export for client reporting

---

## 6. Non-Functional Requirements

| ID | Requirement | Target | Source |
|----|-------------|--------|--------|
| NFR-01 | Widget load time | < 2 seconds on 3G | v1 |
| NFR-02 | First response latency (p95) | < 3 seconds (streaming start) | Quinn SLO |
| NFR-03 | Complete response time (p95) | < 15 seconds | Quinn SLO |
| NFR-04 | Availability | 99.5% (30-day rolling) | Quinn SLO |
| NFR-05 | Concurrent sessions per widget | 50+ | v1 |
| NFR-06 | Error rate | < 1% | Quinn SLO |
| NFR-07 | Response relevance | > 95% on-topic | Quinn SLO |
| NFR-08 | Hallucination rate | < 2% | Quinn SLO |
| NFR-09 | PII redaction | All PII redacted before storage | R-01/R-02 |
| NFR-10 | Data retention | Configurable, default 90 days | R-06 |
| NFR-11 | Accessibility | WCAG 2.1 AA for widget UI | Reese gap |
| NFR-12 | Cold start latency | < 500ms for cached context | Reese gap |
| NFR-13 | Widget bundle size | < 50KB gzipped | v1 |

---

## 7. Security Requirements

All 15 requirements from Alex's STRIDE threat model are incorporated as implementation requirements.

| ID | Requirement | STRIDE Category | Severity | Implementation |
|----|-------------|----------------|----------|----------------|
| SEC-01 | HMAC widget token with dedicated signing secret | Spoofing | Critical | Per-widget `widget_token_secret` in `chat_widgets`. Validate HMAC on every request. |
| SEC-02 | Server-side `allowed_domains` enforcement | Spoofing | Critical | Check `Origin` header against `chat_widgets.cors_origins`. Reject mismatches before processing. |
| SEC-03 | Public routes before `authenticate` middleware | Elevation | Critical | In `server/index.js`, register `/api/chat/public/*` routes BEFORE global auth middleware. |
| SEC-04 | Restricted tool set (KB search + escalate only) | Elevation | Critical | `widgetAgentService.js` defines only `search_knowledge_base` and `escalate_to_human`. No imports from `supportAgentService.js` tools. |
| SEC-05 | `org_id` from widget token only | Tampering | Critical | Never read `org_id` from request body/headers/query. Extract from validated HMAC token payload. |
| SEC-06 | Stripped-down system prompt | Info Disclosure | Critical | Widget system prompt contains: persona, procedure scope, guardrails, disclaimers. NO internal org details, NO full soul config, NO agent IDs or table names. |
| SEC-07 | Guardrail screening on every public message | Tampering | High | Call `guardrailEnforcement.screenMessage()` before LLM invocation. Block messages matching injection patterns. |
| SEC-08 | LLM output filtering | Info Disclosure | High | Post-LLM filter checks for system prompt fragments, internal URLs, API keys, table names in output. Strip before sending to client. |
| SEC-09 | Per-widget daily LLM spend cap + per-session message cap | DoS | High | Track cumulative LLM cost per widget per day. Default caps: $5/$25/$100 by tier. Session cap: 50 messages. |
| SEC-10 | Per-widget aggregate rate limit | DoS | High | Rate limit middleware: 30 msg/min per IP, 200 msg/min per widget aggregate. |
| SEC-11 | Max concurrent SSE connections per widget | DoS | High | Connection counter per widget_id. Default max: 100 concurrent SSE streams. Reject with 429 when exceeded. |
| SEC-12 | Google Sheets data sanitization | Tampering | High | On import: validate schema, scan for injection patterns (script tags, SQL, prompt injection in cell content). Reject poisoned rows. |
| SEC-13 | Sheets credentials server-side only | Info Disclosure | High | OAuth tokens stored encrypted via `credentialManager.js`. Never included in client responses or widget config responses. |
| SEC-14 | Visitor message length limit | DoS | Medium | Reject messages > 2000 characters at the route level before any processing. |
| SEC-15 | Widget token `is_active` check | Spoofing | Medium | Query `chat_widgets.is_active` on every request. Deactivated widgets return 403 immediately. |

---

## 8. Compliance Requirements

All 9 launch blockers from Riley's regulatory review, plus the 6 compliance controls.

| ID | Requirement | Regulatory Domain | Implementation |
|----|-------------|------------------|----------------|
| R-01 | PII redaction before storage | HIPAA | `piiRedactionService.js` scans every message before DB write. Pre-chat email/name stored in `widget_sessions` (separate from message content). |
| R-02 | BAA not required | HIPAA | Confirmed by JB — PII redaction approach is sufficient. No BAA needed. **RESOLVED.** |
| R-03 | AI transparency disclosure | AI Transparency / FTC | Pre-chat UI displays: "You are chatting with Annie, an AI assistant. Annie does not provide medical diagnoses or replace professional medical advice." |
| R-04 | Medical disclaimer | FTC Health Claims | Widget footer permanent disclaimer: "This AI assistant provides general information only and does not provide medical diagnoses, treatment recommendations, or replace professional medical advice. Always consult with a qualified healthcare provider." |
| R-05 | No individualized medical advice | State Medical Practice | System prompt guardrail: "NEVER provide specific medical advice for an individual's condition. Always recommend scheduling a consultation." Enforced via `guardrailEnforcement`. |
| R-06 | Data retention policy | GDPR/CCPA | Configurable retention period (default 90 days). Automated cleanup cron job deletes expired conversations. Displayed in privacy policy. |
| R-07 | Data deletion endpoint | GDPR/CCPA | `DELETE /api/chat/public/:widget_id/data/:session_id` — visitor can request deletion. Response confirms deletion. |
| R-08 | Affirmative consent | GDPR/CCPA | **Lead capture / optional_info modes:** Pre-chat form includes checkbox. Must be checked before first message. **Open chat mode:** Consent is implicit via continued use; privacy policy link displayed in widget footer with text: "By chatting, you agree to our [Privacy Policy]." |
| R-09 | Privacy policy | GDPR/CCPA | Default template provided. Org-customizable via "Privacy & Compliance" tab in chat admin. Served at public endpoint. |

### Compliance Controls

1. **Privacy Policy** — Editable template covering: data collected, purpose, retention, sharing, deletion rights. Served publicly per widget.
2. **Terms of Service** — Additions for AI disclosure and liability limitation (org-customizable).
3. **Pre-Chat Disclaimer** — AI disclosure + medical disclaimer before first interaction.
4. **Data Retention Policy** — Configurable (30-365 days), automated cleanup, displayed in privacy policy.
5. **Right-to-Delete** — API endpoint + UI link for visitors to request data deletion.
6. **Consent Mechanism** — Checkbox with privacy policy link, timestamp recorded in `widget_sessions.consent_timestamp`.

---

## 9. Pricing & Cost Model (Corrected)

### 9.1 Corrected Cost Analysis

**v1 error:** Estimated $12-18/mo for 25K messages. Actual with Sonnet-only: ~$344/mo (cumulative history replay each turn).

**v2 corrected with Haiku tiering:**

| Cost Component | Per Month | Notes |
|----------------|-----------|-------|
| LLM API (Haiku 70% / Sonnet 30%, 25K messages) | ~$95 | Down from $344 with routing |
| Infrastructure (Railway, proportional) | $5-8 | |
| Google Sheets API | $0 | Within free quota |
| Calendly (embed) | $0 | Client's existing plan |
| Support overhead (proportional) | $5-10 | |
| **Total COGS** | **$105-113** | |
| **Revenue (Business tier)** | **$99 + widget value** | Part of platform subscription |

**Note on margin:** At $99/mo Business tier, the widget alone doesn't meet 65% margin. However, the widget drives platform adoption (agents, Align120, research studio, etc.) — the margin calculation should consider the full subscription value, not the widget in isolation. The $49/mo Starter add-on covers direct LLM costs at lower usage volumes (10K messages ≈ $38 LLM cost).

### 9.2 Tier Pricing

| Tier | Included? | Instances | Messages/mo | Daily LLM Cap | Price |
|------|-----------|-----------|-------------|---------------|-------|
| Starter | Add-on | 3 | 10,000 | $5/day | +$49/mo |
| Business | Included | 5 | 25,000 | $25/day | In $99/mo |
| Enterprise | Included | 25 | 100,000 | $100/day | In $299/mo |
| Agency | Included | Unlimited | Unlimited | $500/day | In $499/mo |

### 9.3 Overage Model

- At 80% monthly ceiling: admin notification (in-app + email)
- At 100% ceiling: auto-degrade to Haiku-only, notify with projected overage cost
- Overage rate: $0.01/message beyond quota
- Widget **never goes dark** on client's site

---

## 10. Architecture

### 10.1 Knowledge Architecture

```
┌──────────────────────────────────────────────────┐
│           Annie Widget Agent (i360)               │
├──────────────────────────────────────────────────┤
│  widgetAgentService.js (ISOLATED)                │
│  ├── Tools: search_knowledge_base, escalate ONLY │
│  ├── LLM Routing: Haiku (simple) / Sonnet (complex)
│  ├── Conversation summarization after turn 3     │
│  └── guardrailEnforcement on every message       │
├──────────────────────────────────────────────────┤
│  System Prompt (stripped down) [SEC-06]           │
│  ├── Annie persona + voice                       │
│  ├── Procedure scope boundaries                  │
│  ├── Medical disclaimers                         │
│  ├── "Never provide diagnoses" guardrail         │
│  └── NO internal org details or system info      │
├──────────────────────────────────────────────────┤
│  Context Injection (via context_assets)           │
│  ├── Google Sheets sync (15 min refresh)         │
│  │   ├── 5 Procedure descriptions + FAQs         │
│  │   ├── Recovery timelines                      │
│  │   └── Vimeo video links                       │
│  └── Brand assets (voice, tone, disclaimers)     │
├──────────────────────────────────────────────────┤
│  PII Redaction Pipeline [R-01]                   │
│  └── piiRedactionService.js → before DB write    │
├──────────────────────────────────────────────────┤
│  Compliance Layer                                │
│  ├── Pre-chat: AI disclosure + consent checkbox  │
│  ├── Footer: Medical disclaimer (always visible) │
│  ├── Privacy policy link                         │
│  └── Data retention (90-day auto-cleanup)        │
├──────────────────────────────────────────────────┤
│  Conversation Storage (Phase 71 tables)          │
│  ├── support_conversations (metadata)            │
│  ├── support_messages (PII-redacted content)     │
│  └── Review Dashboard → Export → Context Asset   │
└──────────────────────────────────────────────────┘
```

### 10.2 Data Flow

```
Website Visitor (mendelsohn.com/facelift)
    │
    │ loads iframe
    ▼
┌────────────────────────┐
│  chat-widget.js        │ Pre-chat form + consent
│  (public, no auth)     │ AI disclosure shown
└──────────┬─────────────┘
           │ POST /api/chat/public/:widget_id/stream
           │ Headers: X-Widget-Token, Origin
           ▼
┌────────────────────────┐
│  Widget Auth Layer     │ 1. HMAC token validation [SEC-01]
│                        │ 2. Origin vs allowed_domains [SEC-02]
│                        │ 3. is_active check [SEC-15]
│                        │ 4. Rate limit check [SEC-10]
│                        │ 5. Message length check [SEC-14]
│                        │ 6. Session message cap [SEC-09]
│                        │ 7. Daily spend cap check [SEC-09]
│                        │ 8. SSE connection limit [SEC-11]
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│  guardrailEnforcement  │ Screen for prompt injection [SEC-07]
│  .screenMessage()      │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│  widgetAgentService    │ Intent classification
│  ├── Simple FAQ?       │ → Haiku (fast, cheap)
│  └── Complex/multi?    │ → Sonnet (thorough)
│                        │
│  Context injection:    │
│  ├── Sheets data       │ (from context_asset, cached)
│  └── Brand assets      │
│                        │
│  Tools (restricted):   │
│  ├── search_knowledge  │
│  └── escalate_to_human │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│  Output Filtering      │ Strip system prompt leakage [SEC-08]
│                        │ Strip internal URLs/keys
└──────────┬─────────────┘
           │ SSE stream
           ▼
┌────────────────────────┐
│  Widget renders        │ Chat bubbles + video cards
│  response in iframe    │ + Calendly embed if scheduling
└──────────┬─────────────┘
           │ Messages stored (PII-redacted)
           ▼
┌────────────────────────┐
│  piiRedactionService   │ Redact before write [R-01]
│  → support_messages    │
│  → support_conversations│
└──────────┬─────────────┘
           │ Org admin reviews
           ▼
┌────────────────────────┐
│  Review Dashboard      │ Search, filter, export
│  → Export to Context   │ → Annie gets smarter
│     Asset              │   (knowledge feedback loop)
└────────────────────────┘
```

### 10.3 Database Schema

```sql
-- New: Widget configuration (separate from widget_configs)
CREATE TABLE chat_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id),
    widget_name TEXT NOT NULL,
    widget_token TEXT UNIQUE NOT NULL,
    widget_token_secret TEXT NOT NULL,           -- Per-widget HMAC signing secret [SEC-01]
    cors_origins TEXT[] DEFAULT '{}',            -- Allowed domains [SEC-02]
    branding JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{}',                   -- Message/session/spend limits
    pre_chat_fields JSONB DEFAULT '{"mode": "lead_capture", "fields": {"email": {"enabled": true, "required": true}, "name": {"enabled": true, "required": false}}}',
    privacy_policy TEXT,                         -- Org-customizable [R-09]
    consent_text TEXT DEFAULT 'I agree to the Privacy Policy and understand this conversation may be reviewed to improve service quality.',
    data_retention_days INTEGER DEFAULT 90,      -- [R-06]
    calendly_config JSONB DEFAULT '{}',          -- Per-procedure embed URLs
    sheets_config JSONB DEFAULT '{}',            -- Spreadsheet ID, sync interval, last sync
    usage_stats JSONB DEFAULT '{}',              -- Monthly message count, daily LLM spend
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- New: Anonymous visitor sessions
CREATE TABLE widget_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id UUID NOT NULL REFERENCES chat_widgets(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    visitor_email TEXT,                           -- Pre-chat, stored separately from messages [R-01]
    visitor_name TEXT,                            -- Pre-chat, stored separately
    visitor_fingerprint TEXT,                     -- Hashed, non-PII
    messages_count INTEGER DEFAULT 0,
    consent_given BOOLEAN DEFAULT false,          -- [R-08]
    consent_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 minutes'),
    metadata JSONB DEFAULT '{}'
);

-- Extend agent_executions
ALTER TABLE agent_executions ADD COLUMN IF NOT EXISTS widget_id UUID REFERENCES chat_widgets(id);
ALTER TABLE agent_executions ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Indexes
CREATE INDEX idx_chat_widgets_org ON chat_widgets(org_id);
CREATE INDEX idx_chat_widgets_token ON chat_widgets(widget_token);
CREATE INDEX idx_chat_widgets_active ON chat_widgets(is_active) WHERE is_active = true;
CREATE INDEX idx_widget_sessions_widget ON widget_sessions(widget_id);
CREATE INDEX idx_widget_sessions_token ON widget_sessions(session_token);
CREATE INDEX idx_widget_sessions_expires ON widget_sessions(expires_at);

-- RLS
ALTER TABLE chat_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_sessions ENABLE ROW LEVEL SECURITY;

-- Note: Public endpoints use service key with explicit WHERE clauses
-- RLS policies for authenticated admin access:
CREATE POLICY chat_widgets_org_access ON chat_widgets
    FOR ALL USING (
        org_id IN (
            SELECT om.org_id FROM organization_members om
            WHERE om.user_id = auth.uid() AND om.status = 'active'
        )
    );
```

### 10.4 New & Modified Files

| File | Type | Purpose |
|------|------|---------|
| `db/phase75-embeddable-chat-widgets.sql` | New | Schema migration |
| `server/routes/widgetChat.js` | New | Public chat endpoint + widget CRUD API |
| `server/services/widgetAgentService.js` | New | Isolated widget execution engine |
| `server/services/piiRedactionService.js` | New | PII detection/redaction pipeline |
| `server/services/integrations/providers/google/sheets.js` | New | Google Sheets data connector |
| `server/services/integrations/providers/calendly.js` | New | Calendly integration provider |
| `public/js/chat-widget.js` | New | Embeddable frontend loader |
| `public/css/chat-widget.css` | New | Widget styles (self-contained) |
| `public/demo/index.html` | New | Demo homepage |
| `public/demo/facelift.html` | New | Demo procedure page |
| `public/demo/rhinoplasty.html` | New | Demo procedure page |
| `public/demo/blepharoplasty.html` | New | Demo procedure page |
| `public/demo/necklift.html` | New | Demo procedure page |
| `public/demo/browlift.html` | New | Demo procedure page |
| `public/demo/css/demo.css` | New | Demo site styling |
| `public/support-settings.html` | Modified | Add tabs: Privacy & Compliance, Data Sources, Integrations |
| `server/index.js` | Modified | Register public routes BEFORE auth middleware [SEC-03] |
| `server/routes/integrations.js` | Modified | Register Calendly provider |
| `server/services/integrations/providers/google/index.js` | Modified | Add SheetsService import |

---

## 11. Downstream Impact Analysis

| System/Feature | Relationship | Impact if This Changes | Severity |
|---------------|-------------|----------------------|----------|
| Chat routes (`server/routes/chat.js`) | Parallel public endpoint | Must not conflict with existing authenticated chat | Medium |
| Context injection (`contextInjection.js`) | Consumes Sheets-synced context_assets | No modification needed — Sheets sync writes to existing table | Low |
| Agent execution (`agentService.js`) | Widget uses separate service | No modification needed — `widgetAgentService.js` is independent | Low |
| CORS config (Helmet CSP in `index.js`) | Per-widget CORS vs global ALLOWED_ORIGINS | Must not override global CORS. Widget CORS handled at route level. | Medium |
| Rate limiting | New rate limit tier for public endpoints | Separate middleware, isolated from authenticated rate limits | Low |
| LLM costs (Anthropic API) | Public-facing usage | Controlled by daily spend caps + Haiku routing | High |
| Database (Supabase) | New tables + RLS | Additive schema, service key for public writes | Low |
| Phase 71 support system | Reuses `support_conversations` + `support_messages` | Widget conversations stored alongside internal support conversations (differentiated by `widget_id`) | Medium |
| Integrations framework | New Calendly provider + Sheets service | Extends existing BaseIntegrationProvider pattern | Low |
| `support-settings.html` | Extended with new tabs | Existing tabs unaffected. New tabs added. | Low |
| Guardrail enforcement | Called on every public message | No modification — uses existing `screenMessage()` | Low |

---

## 12. Data Flow Trace

| Data Element | Entry Point | Validation | Storage | Display | Logging | Cross-Tenant? |
|-------------|------------|-----------|---------|---------|---------|---------------|
| Visitor message | `POST /api/chat/public/:widget_id/stream` | Length ≤ 2000 chars, guardrail screening | `support_messages.content` (PII-redacted) | Conversation review dashboard (admin only) | Message count logged, content not logged | No — scoped by widget_id → org_id |
| Visitor email | Pre-chat form | Format validation | `widget_sessions.visitor_email` | Session list (admin only) | Not logged | No |
| Widget token | `X-Widget-Token` header | HMAC validation | `chat_widgets.widget_token` | Never displayed | Token usage logged (not value) | No |
| Sheets data | Google Sheets API (server-side) | Schema validation, injection scan | `context_assets` row | LLM context only (not raw to visitor) | Sync status logged | No |
| Calendly URL | Admin config | URL format validation | `chat_widgets.calendly_config` | Rendered in chat as embed | Not logged | No |
| Consent | Pre-chat checkbox | Boolean + timestamp | `widget_sessions.consent_given/timestamp` | Admin can verify consent was given | Consent timestamp logged | No |
| Privacy policy | Admin editor | Sanitized HTML | `chat_widgets.privacy_policy` | Public endpoint | Not logged | No |
| LLM response | Anthropic API | Output filtering [SEC-08] | `support_messages.content` | Widget chat UI | Cost logged (not content) | No |

---

## 13. Failure Scenarios

| # | Scenario | Trigger | Expected Behavior | Recovery |
|---|----------|---------|-------------------|----------|
| 1 | Google Sheets API unavailable | API quota exceeded or outage | Serve from cached context_asset (last-known-good) | Automatic — resumes on next sync interval |
| 2 | Anthropic API outage | LLM API returns 5xx | Friendly error message: "I'm temporarily unavailable. Please call [phone] or try again shortly." | Automatic via circuit breaker |
| 3 | HMAC token validation fails | Forged or expired token | Return 401, log attempt with IP | N/A — prevented |
| 4 | Origin not in allowed_domains | Unauthorized domain embedding | Return 403, log attempt with Origin header | N/A — prevented |
| 5 | Prompt injection detected | Guardrail screening catches injection pattern | Block message, return: "I can't process that request." Log detection. | Automatic |
| 6 | Daily LLM spend cap reached | Cumulative cost exceeds cap | Auto-degrade to Haiku-only. Notify admin. Widget continues. | Admin increases cap or accepts degraded mode |
| 7 | Monthly message ceiling reached | Message count exceeds limit | Auto-degrade to Haiku-only + shorter responses. Notify with projected overage. | Admin upgrades tier or accepts overage |
| 8 | SSE connection limit reached | Too many concurrent sessions | Return 429: "High demand — please try again in a moment." | Automatic as connections close |
| 9 | PII redaction fails | Service error | Fail-safe: do NOT store message. Return error to visitor. Log incident. | Manual review of failed messages |
| 10 | Calendly embed fails to load | Calendly outage or iframe nesting issue | Fallback: Annie provides direct Calendly link + phone number + office hours | Automatic |
| 11 | Widget token deactivated | Admin deactivates widget | Return 403: "This chat widget is no longer available." | Admin reactivates |
| 12 | Google Sheets data poisoned | Malicious content in spreadsheet cells | Sanitization catches injection patterns. Reject poisoned rows, log alert. | Manual review of spreadsheet |
| 13 | Session expired mid-conversation | 30-min inactivity timeout | "Your session has expired. Please refresh to start a new conversation." | Visitor refreshes |
| 14 | Rate limit exceeded | Visitor sends > 30 msg/min | Return 429: "Please slow down." | Automatic cooldown |
| 15 | System prompt leaked in output | LLM includes system prompt fragments | Output filter strips detected fragments before sending to client [SEC-08] | Automatic |
| 16 | Cross-session data leakage | Session token reuse or collision | Session tokens are UUID + crypto random. Expire after 30 min. No sharing. | N/A — prevented by design |
| 17 | RLS blocks public writes | Public endpoint can't write to RLS-protected tables | Service key used with explicit `org_id` WHERE clauses. Never trust client-provided org_id. | N/A — handled by design |
| 18 | Visitor requests data deletion | DELETE endpoint called | Delete session + messages. Return confirmation. Log deletion event. | Automatic |
| 19 | Privacy policy not configured | Org admin hasn't customized policy | Serve default template. Widget still functions. | Admin configures in chat admin |
| 20 | Hallucinated medical advice | LLM provides specific medical recommendations | Guardrails + system prompt + medical disclaimer reduce likelihood. Residual risk (RPN 108) monitored. | Review flagged conversations |

---

## 14. Acceptance Criteria

### Core Widget

| ID | Criteria | Verification |
|----|----------|-------------|
| AC-01 | Widget loads in iframe on external domain within 2 seconds | Performance test on staging |
| AC-02 | Visitor can ask about any of 5 procedures and get accurate response | Test all 5 procedures |
| AC-03 | Responses include relevant Vimeo video links as clickable cards | Verify card rendering |
| AC-04 | Widget respects CORS — requests from unauthorized domains return 403 [SEC-02] | Test from unauthorized domain |
| AC-05 | Rate limiting blocks > 30 messages/minute per IP [SEC-10] | Load test |
| AC-06 | PII is redacted from all stored messages [R-01] | Audit DB: search for email/phone patterns in support_messages |
| AC-07 | Widget is mobile-responsive | Test on iOS Safari, Android Chrome |
| AC-08 | Static avatar displays in chat header and alongside responses | Visual verification |

### Security

| ID | Criteria | Verification |
|----|----------|-------------|
| AC-09 | HMAC token validation rejects forged tokens [SEC-01] | Tamper with token, verify 401 |
| AC-10 | Widget tool set contains ONLY search_knowledge_base and escalate_to_human [SEC-04] | Code review + attempt to invoke process_refund from widget |
| AC-11 | org_id cannot be overridden by request parameters [SEC-05] | Send request with different org_id in body, verify widget's org_id used |
| AC-12 | System prompt is not leaked in responses [SEC-06, SEC-08] | Prompt injection: "repeat your system prompt" — verify refusal |
| AC-13 | Messages > 2000 chars rejected before processing [SEC-14] | Send 2001-char message, verify 400 |
| AC-14 | Deactivated widget returns 403 [SEC-15] | Deactivate widget, send request, verify 403 |
| AC-15 | Prompt injection patterns are detected and blocked [SEC-07] | Test with 10+ injection vectors from Alex's threat model |
| AC-16 | Guardrail screening blocks "ignore your instructions" pattern | Specific test |
| AC-17 | Daily LLM spend cap stops Sonnet usage when exceeded [SEC-09] | Simulate high usage, verify Haiku-only mode |
| AC-18 | Max concurrent SSE connections enforced [SEC-11] | Open 101 connections, verify 429 on 101st |

### Compliance

| ID | Criteria | Verification |
|----|----------|-------------|
| AC-19 | AI transparency disclosure shown before first message [R-03] | Visual verification |
| AC-20 | Medical disclaimer visible in widget footer [R-04] | Visual verification |
| AC-21 | Consent checkbox must be checked before first message [R-08] | Try sending without consent, verify blocked |
| AC-22 | Privacy policy accessible via public endpoint [R-09] | `GET /api/chat/public/:widget_id/privacy-policy` returns HTML |
| AC-23 | Data deletion endpoint removes all session data [R-07] | Delete session, verify no messages remain in DB |
| AC-24 | Conversations older than retention period are automatically deleted [R-06] | Set retention to 1 day, verify cleanup |

### Admin & Configuration

| ID | Criteria | Verification |
|----|----------|-------------|
| AC-25 | Admin can create widget, configure branding, generate embed code | Walkthrough admin UI |
| AC-25a | Pre-chat mode "lead_capture" requires email before chat begins | Set mode, verify email blocks first message |
| AC-25b | Pre-chat mode "open_chat" allows immediate chatting with no form | Set mode, verify no form shown, chat starts immediately |
| AC-25c | Pre-chat mode "optional_info" shows form with skip button | Set mode, verify skip works and chat proceeds |
| AC-25d | Privacy policy link appears in form (lead_capture/optional) or footer (open_chat) | Verify per mode |
| AC-26 | Google Sheets OAuth flow connects successfully | End-to-end OAuth test |
| AC-27 | Sheets data syncs to context_asset within configured interval | Change spreadsheet, verify sync |
| AC-28 | Calendly embed URLs render correctly per procedure | Test each procedure → Calendly mapping |
| AC-29 | Privacy policy is editable in admin panel | Edit, save, verify public endpoint reflects changes |
| AC-30 | Usage ceiling notifications trigger at 80% and 100% | Simulate usage, verify notifications |

### Demo & Review

| ID | Criteria | Verification |
|----|----------|-------------|
| AC-31 | Demo pages load with embedded widget | Browse all 5 demo procedure pages |
| AC-32 | Demo environment works without authentication | Access demo URL without login |
| AC-33 | Conversation review dashboard shows widget conversations with filters | Create 20+ test conversations, verify all appear |
| AC-34 | "Export to Context Asset" creates/updates context asset from conversations | End-to-end test: export → verify asset → verify Annie uses new knowledge |

---

## 15. Rollout Plan

### Phase 1: Security Foundation + Database (Week 1)

- [ ] Database migration: `chat_widgets`, `widget_sessions` tables
- [ ] HMAC widget token generation and validation [SEC-01]
- [ ] Server-side CORS domain enforcement [SEC-02]
- [ ] Public route registration before auth middleware [SEC-03]
- [ ] Rate limiting middleware for public endpoints [SEC-10, SEC-14]
- [ ] PII redaction service [R-01]
- [ ] Register `embeddable_chat` module in `platform_modules`

### Phase 2: Widget Agent Service (Week 1-2)

- [ ] `widgetAgentService.js` with restricted tool set [SEC-04]
- [ ] Stripped-down system prompt [SEC-06]
- [ ] Guardrail enforcement integration [SEC-07]
- [ ] LLM output filtering [SEC-08]
- [ ] Haiku/Sonnet routing (intent classification)
- [ ] Conversation summarization after turn 3
- [ ] Per-session message cap [SEC-09]
- [ ] Daily LLM spend cap tracking [SEC-09]
- [ ] SSE connection limiter [SEC-11]
- [ ] Public chat streaming endpoint

### Phase 3: Widget Frontend (Week 2-3)

- [ ] `chat-widget.js` loader script (< 50KB)
- [ ] Pre-chat form with configurable fields
- [ ] Consent checkbox + privacy policy link [R-08]
- [ ] AI transparency disclosure [R-03]
- [ ] Medical disclaimer footer [R-04]
- [ ] Chat UI (branded, responsive)
- [ ] SSE stream handling
- [ ] Static avatar display
- [ ] Video card rendering
- [ ] Mobile responsiveness

### Phase 4: Google Sheets Connector (Week 3)

- [ ] `sheets.js` service (read, validate, transform)
- [ ] Data sanitization on import [SEC-12]
- [ ] Sync to `context_asset` row on schedule
- [ ] Cache layer with fallback [SEC-13]
- [ ] "Data Sources" tab in support-settings.html
- [ ] Google OAuth flow with sheets scope
- [ ] Spreadsheet selector + sync interval config
- [ ] Sync status display

### Phase 5: Calendly Integration (Week 3-4)

- [ ] `calendly.js` provider (extends BaseIntegrationProvider)
- [ ] Register in provider registry + seed `integration_providers`
- [ ] "Integrations" tab in support-settings.html
- [ ] Per-procedure embed URL configuration
- [ ] Embed rendering in widget (inline desktop, popup mobile)
- [ ] Fallback behavior (direct link + phone)
- [ ] Test with assist@synergiai.io Calendly account

### Phase 6: Privacy & Compliance (Week 4)

- [ ] "Privacy & Compliance" tab in support-settings.html
- [ ] Privacy policy editor + preview
- [ ] Default privacy policy template
- [ ] Public privacy policy endpoint
- [ ] Consent text editor
- [ ] Data retention configuration + automated cleanup job
- [ ] Data deletion endpoint [R-07]

### Phase 7: Admin UI & Chat Configuration (Week 4-5)

- [ ] Widget CRUD in support-settings.html (new "Widgets" tab)
- [ ] Embed code generator (iframe + script tag)
- [ ] Widget token rotation
- [ ] Branding configuration (colors, avatar, welcome message)
- [ ] Usage ceiling configuration
- [ ] Annie agent configuration (system prompt, soul config, context assets)
- [ ] Test all 5 procedures end-to-end

### Phase 8: Conversation Review Dashboard (Week 5)

- [ ] Conversation list view with filters
- [ ] Full transcript view (PII-redacted)
- [ ] Keyword search across conversations
- [ ] Sentiment indicators and status tracking
- [ ] Star/flag conversations
- [ ] Internal notes
- [ ] Export: CSV, JSON, PDF
- [ ] "Export to Context Asset" workflow
- [ ] Optional email digest

### Phase 9: Demo Environment (Week 5-6)

- [ ] Demo homepage (practice simulation)
- [ ] 5 demo procedure pages with Annie embedded
- [ ] Professional medical practice styling
- [ ] Mobile responsiveness
- [ ] Branding customization showcase
- [ ] Serve from `/demo/*` path (no auth required)

### Phase 10: Integration Testing (Week 6-7)

- [ ] Security test suite (15 SEC requirements verified)
- [ ] Compliance test suite (9 R requirements verified)
- [ ] Prompt injection red-team testing
- [ ] Load testing (50+ concurrent sessions)
- [ ] Cross-browser testing (Chrome, Safari, Firefox, mobile)
- [ ] Demo walkthrough with Jon
- [ ] Conversation review demo with Jon
- [ ] Export to Context Asset end-to-end test

### Phase 11: Launch (Week 7-8)

- [ ] Deploy to production (Railway via develop branch)
- [ ] Progressive rollout: demo environment first, then Jon's 1 procedure page
- [ ] Monitor: response quality, latency, error rates, LLM costs, scheduling conversion
- [ ] Expand to remaining 4 procedure pages
- [ ] Train Jon on conversation review and export workflow
- [ ] Documentation handoff

---

## 16. Dependencies

| Dependency | Owner | Status | Blocking? |
|------------|-------|--------|-----------|
| Google Sheets API credentials | JB (via existing OAuth) | Existing OAuth flow available | Yes — Phase 4 |
| Jon's procedure spreadsheet access | Jon | Available | No |
| Calendly test account (assist@synergiai.io) | JB | To be created | Yes — Phase 5 |
| Calendly embed URLs per procedure | Jon | Existing (from current Annie) | Yes — Phase 5 |
| Phase 71 migration on production | JB | **DONE** | No |
| `TOKEN_ENCRYPTION_KEY` env var | JB | Existing (credentialManager) | No |
| `WIDGET_TOKEN_SECRET` env var | JB | New — for HMAC signing | Yes — Phase 1 |
| ~~BAA evaluation~~ | ~~JB + legal~~ | **RESOLVED — not needed** | No |
| ~~Kevin introduction~~ | ~~Jon~~ | **DEFERRED — demo artifact instead** | No |

---

## 17. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| LLM costs exceed daily cap | Medium | Medium | Daily spend caps per widget + auto-degrade to Haiku |
| Prompt injection bypasses guardrails | Low | High | Multi-layer defense: guardrail screening + restricted tools + output filtering. Residual RPN 108, ongoing monitoring. |
| Hallucinated medical advice | Low | High | System prompt guardrails + medical disclaimer + guardrail enforcement. Residual RPN 108, ongoing monitoring. |
| Google Sheets data poisoned | Low | High | Schema validation + injection scanning on import [SEC-12] |
| PII redaction misses edge cases | Medium | High | Conservative regex patterns. Fail-safe: don't store if redaction service errors. Regular regex review. |
| Visitor submits PHI despite disclaimers | High | Medium | PII redaction catches most patterns. Disclaimer + guardrails reduce scope. Residual handled by redaction. |
| CORS bypass attempt | Low | Medium | Server-side enforcement [SEC-02] + HMAC token validation [SEC-01]. Defense in depth. |
| Usage ceiling causes poor UX | Medium | Medium | Soft cap (never kills widget). Auto-degrade to Haiku is functional, just simpler. |
| Demo environment used inappropriately | Low | Low | Demo pages clearly labeled. No sensitive data. Connected to test widget only. |
| Calendly embed breaks in iframe | Low | Medium | Test iframe-in-iframe. Fallback to popup or direct link. |
| Jon expects features beyond scope | High | Medium | Clear scope document (this PRD). Non-goals explicitly stated. |

---

## 18. Observability

### 18.1 SLOs

| SLO | Target | Alert Threshold |
|-----|--------|----------------|
| Availability | 99.5% (30-day rolling) | < 99% triggers page |
| Time to First Token (p95) | < 3 seconds | > 5 seconds triggers warning |
| Time to Complete Response (p95) | < 15 seconds | > 20 seconds triggers warning |
| Error Rate | < 1% | > 3% triggers page |
| Response Relevance | > 95% on-topic | < 90% triggers review |
| Hallucination Rate | < 2% | > 5% triggers review |

### 18.2 Key Metrics (Prometheus)

- `widget_messages_total` (counter, labels: widget_id, model, status)
- `widget_sessions_total` (counter, labels: widget_id)
- `widget_response_duration_seconds` (histogram, labels: widget_id, model)
- `widget_llm_cost_dollars` (counter, labels: widget_id, model)
- `widget_pii_redactions_total` (counter, labels: widget_id, redaction_type)
- `widget_guardrail_blocks_total` (counter, labels: widget_id, pattern_type)
- `widget_scheduling_conversions_total` (counter, labels: widget_id)
- `widget_concurrent_connections` (gauge, labels: widget_id)
- `widget_daily_spend_dollars` (gauge, labels: widget_id)
- `widget_monthly_messages` (gauge, labels: widget_id)

### 18.3 Runbook Alerts

1. **Daily spend cap reached** → Verify auto-degrade activated. Notify org admin.
2. **Error rate > 3%** → Check Anthropic API status. Verify circuit breaker engaged.
3. **Guardrail blocks spike** → Review blocked messages for new attack patterns.
4. **PII redaction failures** → Verify messages weren't stored un-redacted. Alert security.
5. **Response time > 5s p95** → Check LLM latency. Consider reducing context window.
6. **SSE connection limit reached** → Verify legitimate traffic vs. DoS. Adjust limit if needed.
7. **Sheets sync failure** → Verify Google OAuth token not expired. Check cached data freshness.

---

## 19. FMEA Summary

38 failure modes analyzed during WF-01 FMEA. 9 launch blockers (RPN > 200), all mitigated to acceptable levels.

| Risk Level | Count | Mitigated | Unmitigated |
|-----------|-------|-----------|-------------|
| Critical (RPN > 200) | 9 | 9 | 0 |
| High (RPN 101-200) | 19 | 19 | 0 |
| Medium (RPN 51-100) | 6 | N/A (accept) | 6 |
| Low (RPN 1-50) | 4 | N/A (accept) | 4 |

**Residual risks:**
- FM-07 (Prompt injection): RPN 108 — inherent LLM risk, ongoing monitoring
- FM-10 (Hallucination): RPN 108 — inherent LLM risk, ongoing monitoring

**FMEA verdict:** PASS with ongoing monitoring.

---

## 20. Open Items

| # | Item | Owner | Status | Blocking? |
|---|------|-------|--------|-----------|
| 1 | ~~BAA evaluation~~ | ~~JB + legal~~ | **RESOLVED — not needed** | No |
| 2 | ~~Kevin introduction~~ | ~~JB~~ | **DEFERRED — demo artifact instead** | No |
| 3 | Create Calendly test account at assist@synergiai.io | JB | Not started | Yes — Phase 5 |
| 4 | `WIDGET_TOKEN_SECRET` env var for HMAC signing | JB | Not started | Yes — Phase 1 |
| 5 | Jon's Calendly embed URLs (reuse from existing Annie) | Jon | Available | Yes — Phase 5 |
| 6 | Implementation brief (this PRD's companion) | Reese | **Included below** | No |

---

## Implementation Brief

**PRD Reference:** Annie Embeddable Chat Widget — PRD v2

### Affected Files (New)

| File | Purpose |
|------|---------|
| `db/phase75-embeddable-chat-widgets.sql` | Schema migration: `chat_widgets`, `widget_sessions`, indexes, RLS, module registration |
| `server/routes/widgetChat.js` | Public chat endpoint (SSE stream), widget CRUD, privacy policy endpoint, data deletion endpoint |
| `server/services/widgetAgentService.js` | Isolated execution engine: restricted tools, LLM routing, summarization, guardrail integration |
| `server/services/piiRedactionService.js` | PII detection/redaction: email, phone, SSN, DOB, address, MRN patterns |
| `server/services/integrations/providers/google/sheets.js` | Google Sheets: read, validate, sanitize, transform to context_asset, scheduled sync |
| `server/services/integrations/providers/calendly.js` | Calendly provider: OAuth, embed URL management, connection testing |
| `public/js/chat-widget.js` | Embeddable widget: pre-chat form, consent, SSE stream, video cards, Calendly embed, avatar |
| `public/css/chat-widget.css` | Self-contained widget styles |
| `public/demo/index.html` | Demo practice homepage |
| `public/demo/facelift.html` | Demo procedure page with widget |
| `public/demo/rhinoplasty.html` | Demo procedure page with widget |
| `public/demo/blepharoplasty.html` | Demo procedure page with widget |
| `public/demo/necklift.html` | Demo procedure page with widget |
| `public/demo/browlift.html` | Demo procedure page with widget |
| `public/demo/css/demo.css` | Demo site styling |

### Affected Files (Modified)

| File | Changes |
|------|---------|
| `server/index.js` | Register `/api/chat/public/*` routes BEFORE `authenticate` middleware [SEC-03]. Add compression skip for widget SSE. |
| `public/support-settings.html` | Add 4 new tabs: Widgets, Privacy & Compliance, Data Sources, Integrations |
| `server/routes/integrations.js` | Register Calendly provider in provider registry |
| `server/services/integrations/providers/google/index.js` | Import and expose SheetsService |
| `server/services/integrations/index.js` | Register Calendly provider |

### Affected Tables

| Table | Change |
|-------|--------|
| `chat_widgets` | **New table** — widget configuration, tokens, branding, limits, compliance |
| `widget_sessions` | **New table** — anonymous visitor sessions with consent tracking |
| `agent_executions` | Add `widget_id` and `is_public` columns |
| `platform_modules` | Seed row for `embeddable_chat` module |
| `role_module_access` | Seed rows for executive, director, manager roles |
| `integration_providers` | Seed row for Calendly provider |
| `context_assets` | New rows created by Sheets sync (no schema change) |

### Affected Routes

| Method | Path | Status |
|--------|------|--------|
| `POST` | `/api/chat/public/:widget_id/stream` | New — public SSE chat |
| `GET` | `/api/chat/public/:widget_id/privacy-policy` | New — public privacy policy |
| `DELETE` | `/api/chat/public/:widget_id/data/:session_id` | New — visitor data deletion |
| `POST` | `/api/chat/public/:widget_id/session` | New — create session with consent |
| `GET` | `/api/widgets` | New — list org's widgets (authenticated) |
| `POST` | `/api/widgets` | New — create widget (authenticated) |
| `PUT` | `/api/widgets/:id` | New — update widget (authenticated) |
| `DELETE` | `/api/widgets/:id` | New — delete widget (authenticated) |
| `POST` | `/api/widgets/:id/rotate-token` | New — rotate widget token |
| `GET` | `/api/widgets/:id/embed-code` | New — generate embed snippet |
| `GET` | `/api/widgets/:id/usage` | New — usage statistics |
| `POST` | `/api/widgets/:id/sheets/sync` | New — manual Sheets sync trigger |

### Migration Required

Yes — `db/phase75-embeddable-chat-widgets.sql`

### Estimated Complexity

**Large** — 15 new files, 5 modified files, 12 new API routes, 2 new tables, 2 new services, 1 new integration provider, 6 demo pages, 4 new admin tabs.

### Risk Areas

1. **PII redaction accuracy** — False negatives expose PHI. False positives degrade conversation quality. Need thorough testing with medical conversation patterns.
2. **LLM routing accuracy** — Intent classification must correctly separate simple FAQ from complex multi-turn. Misrouting affects cost model and response quality.
3. **Public route ordering** — SEC-03 requires public routes before auth middleware. Incorrect ordering = widget completely broken. Must be verified in integration test.
4. **Service key security** — Public endpoints use Supabase service key. Explicit WHERE clauses are critical to prevent cross-org data access.
5. **CORS + HMAC dual validation** — Both must pass. Testing matrix: valid/invalid token x valid/invalid origin = 4 combinations.

### Suggested Implementation Sequence

1. **Database migration** — Create tables, seed module, set up RLS. Everything depends on this.
2. **PII redaction service** — Independent service, needed by all message writes. Can be developed/tested in isolation.
3. **Widget agent service** — Core execution engine. Depends on migration (for session management) but not on frontend.
4. **Public chat route** — Depends on widget agent service. Wire up HMAC auth, CORS, rate limiting, SSE streaming.
5. **Widget frontend** — Depends on public chat route. Pre-chat form, consent, streaming, video cards.
6. **Sheets connector** — Can be developed in parallel with frontend. Depends on migration (for context_asset writes).
7. **Calendly provider** — Can be developed in parallel. Light dependency on widget config.
8. **Admin tabs** — Depends on all services being available for configuration.
9. **Demo pages** — Depends on widget frontend + public endpoint working. Light work, mostly HTML/CSS.
10. **Conversation review** — Depends on messages being stored. Can leverage existing support-dashboard patterns.
11. **Security hardening pass** — After all features work, systematic verification of all 15 SEC requirements.
12. **Compliance verification** — After security, verify all 9 R requirements.

---

*Document produced by Reese (Spec Writer) for Avery (PM Orchestrator) review.*
*All decisions reflect JB's approvals from WF-01 sessions on 2026-03-14.*
*Governance reference: Annie Chat Widget — WF-01 Consolidated Report (2026-03-14)*
