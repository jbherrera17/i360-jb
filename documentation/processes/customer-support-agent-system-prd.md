# Customer Support Agent System — Consolidated Report

**Feature:** Synergi Customer Support Agent System
**Workflow:** WF-01 Feature Planning
**Date:** 2026-03-13
**Orchestrator:** Avery (PM Orchestrator)
**Status:** COMPLETE — PENDING HUMAN PM REVIEW

---

## Executive Summary

Synergi needs a first-party AI customer support system handling inbound support across three channels (embeddable chat widget, email, Slack) with three interaction modes (text, voice, avatar). The system uses Insight 360's existing documentation as its knowledge base, communicates in the organization's brand voice (from soul config), pulls org context from Align 120 or manual input, and executes policy-driven actions including refund processing, subscription tier changes (via Stripe), and upsell/downsell recommendations. It runs on Claude Haiku 4.5 for cost efficiency at ~500 concurrent conversations. The module is an **optional add-on** available for purchase across all tiers, with tier-differentiated feature access and conversation limits. Voice capabilities leverage existing STT/TTS infrastructure (`voice.js`, `audioService.js`). Avatar mode uses client-side lip-sync for v1 with streaming avatar API integration planned for v2.

## Recommendation

**SHIP WITH CAVEATS**

**Rationale:** Feature is well-scoped with strong existing infrastructure leverage (agent execution, soul config, voice services, context injection, guardrails). Phased delivery reduces risk. Caveats: Stripe account setup required before Phase 3, email provider decision needed before Phase 4, data retention policy needs legal review, and security mitigations for public endpoints must be implemented before any external-facing deployment.

---

## PRD v2.0

### Title
Synergi Customer Support Agent System — v2.0

### Date
2026-03-13

### Status
draft

---

### 1. Problem & Opportunity

**Statement:** Synergi currently has no structured, AI-powered customer support system. Support inquiries are handled ad-hoc, without policy-driven consistency, brand voice alignment, or automated resolution capabilities.

**Affected Users:**
- **Synergi customers** (orgs on any subscription tier) — need fast, accurate support
- **Human support agents** — need intelligent triage and escalation routing
- **Synergi administrators** — need visibility into support performance and policy compliance

**Current Behavior:** No formalized support system exists within Insight 360.

**Desired Behavior:** AI agent handles first-line support across chat/email/Slack with text, voice, and avatar interaction modes. Resolves common issues autonomously, escalates complex cases per policy, and executes tier changes and refunds within defined guardrails.

**Evidence:** Platform is scaling to multiple organizations across tiers. Without automated support, human support load scales linearly with customer count.

---

### 2. User Stories

**Support Customer:**
- As a customer, I can open a chat widget on any Synergi-powered page and get instant help
- As a customer, I can watch a welcome video introduction when I first open the widget
- As a customer, I can speak to the support agent using voice input and hear responses
- As a customer, I can interact with a visual avatar that speaks responses to me
- As a customer, I can switch between text, voice, and avatar modes during a conversation
- As a customer, I can email support and receive an AI-assisted response within minutes
- As a customer, I can ask questions in a Slack support channel and get help
- As a customer, I can request a refund and have it processed per policy without waiting for a human
- As a customer, I can upgrade/downgrade my subscription tier through the support agent
- As a customer, I am escalated to a human agent when the AI cannot resolve my issue
- As a customer, I can upload screenshots and files to explain my issue
- As a customer, I can view images, videos, PDFs, and fill out forms within the chat

**Human Support Agent:**
- As a human agent, I receive escalations with full conversation context, severity classification, and sentiment score
- As a human agent, I can see the AI's attempted resolution before intervening
- As a human agent, I can take over a conversation seamlessly

**Synergi Admin:**
- As an admin, I can view support metrics (volume, resolution rate, CSAT, escalation rate)
- As an admin, I can edit support policies (refund, escalation, upsell/downsell)
- As an admin, I can configure widget appearance, embed type, and interaction modes
- As an admin, I can set up welcome videos and avatar preferences
- As an admin, I can enable/disable channels independently

---

### 3. Functional Requirements

#### 3.1 Embeddable Chat Widget

| Req ID | Requirement |
|--------|-------------|
| CW-01 | Three embed types: FAB (floating action button), Inline (in-page container), Pop-up (JS API triggered) |
| CW-02 | FAB: floating circle button at configurable position (bottom-right/left), expands into chat panel on click |
| CW-03 | Embed via `<script>` tag with `data-key` and `data-type` attributes. Config stored server-side — design changes don't require re-embedding |
| CW-04 | Supports real-time streaming responses via SSE |
| CW-05 | Maintains conversation context across page navigations (session persistence via localStorage) |
| CW-06 | Responsive — works on desktop and mobile (min-width: 320px) |
| CW-07 | Themeable — primary color, button color, font, corner radius, button style (filled/outlined), form style (minimal/box/block) |
| CW-08 | Shows typing indicator during AI response generation |
| CW-09 | Pre-chat form: configurable fields (name, email, category) |
| CW-10 | "Powered by Insight 360" branding (removable for Agency tier white-label) |
| CW-11 | Offline mode: collect message + email for follow-up when agent unavailable |
| CW-12 | FAB button icon: default icon, org avatar (from org_branding.ai_assistant_avatar_url), or custom upload |
| CW-13 | Bot persona: name + avatar pulled from org_branding table, overridable per widget config |
| CW-14 | Proactive triggers: configurable auto-open rules (time on page, scroll depth, exit intent) with per-page targeting and frequency caps |
| CW-15 | Sound notifications: configurable chime when agent responds (for background tabs) |
| CW-16 | Conversation history: returning users (identified by email/cookie) can see previous conversations |

#### 3.2 Rich Media in Chat

| Req ID | Requirement |
|--------|-------------|
| RM-01 | **Images:** Agent responses render inline images with lightbox. Customers can upload screenshots (PNG, JPG, GIF). |
| RM-02 | **Video:** Agent responses can embed video players (HTML5 video, YouTube/Vimeo iframe). Welcome video auto-plays on first widget open. |
| RM-03 | **PDF:** Agent can share documentation PDFs rendered inline with page navigation (PDF.js). |
| RM-04 | **Forms:** Agent presents structured forms mid-conversation (refund request, tier change confirmation, feedback). Form submission feeds back as structured data. |
| RM-05 | **File upload:** Customers can attach files up to configurable max size (default 10MB). Stored in Supabase Storage. |

#### 3.3 Welcome Video

| Req ID | Requirement |
|--------|-------------|
| WV-01 | Configurable welcome video plays when chat panel first opens |
| WV-02 | Video auto-plays (muted by default per browser policy, with unmute control) |
| WV-03 | Skippable via button overlay |
| WV-04 | Show-once option: only displays on first visit (localStorage flag) |
| WV-05 | Video URL configurable per widget (Supabase Storage or external URL) |
| WV-06 | After video ends or is skipped, transitions to chat view with text welcome message |

#### 3.4 Voice Mode (Audio Chat)

| Req ID | Requirement |
|--------|-------------|
| VO-01 | Voice mode toggle in widget header (Text / Voice / Avatar mode selector) |
| VO-02 | Customer voice input via browser MediaRecorder API → sent to server for STT |
| VO-03 | STT uses existing `voice.js` → `transcribe()` (GPT-4o Transcribe) |
| VO-04 | Agent text response converted to audio via existing `voice.js` → `speak()` (GPT-4o Mini TTS) |
| VO-05 | TTS instructions injected from soul config voice section (tone, personality, avoid-words) for steerable voice |
| VO-06 | TTS voice selectable per widget config (alloy, echo, fable, onyx, nova, shimmer) |
| VO-07 | Audio responses auto-play in widget with text transcript visible below for accessibility |
| VO-08 | Push-to-talk mode for v1 (hold mic button to record). VAD (voice activity detection) for v2. |
| VO-09 | Visual feedback: pulsing mic animation when listening, waveform visualizer, speaker animation when playing |

#### 3.5 Avatar Mode (Two-Way Visual Chat)

| Req ID | Requirement |
|--------|-------------|
| AV-01 | Avatar mode renders a visual face/character in the chat panel header area |
| AV-02 | v1: Static avatar image with audio visualizer animation during TTS playback |
| AV-03 | v1.5: Client-side 3D avatar with real-time lip-sync to TTS audio output (WebGL, no external API) |
| AV-04 | v2: Real-time streaming avatar via HeyGen/Tavus API (premium tier feature) |
| AV-05 | Avatar mode includes voice mode capabilities (STT input + TTS output) |
| AV-06 | Avatar image defaults to org_branding.ai_assistant_avatar_url |
| AV-07 | Text transcript always visible below avatar for accessibility |

#### 3.6 Email Channel

| Req ID | Requirement |
|--------|-------------|
| EM-01 | Inbound email webhook handler (SendGrid/Mailgun inbound parse) |
| EM-02 | Email thread tracking — maintains conversation across reply chains |
| EM-03 | Auto-response with AI-generated reply within configurable SLA (default: 5 min) |
| EM-04 | Attachment handling — acknowledge attachments, flag for human if needed |
| EM-05 | Unsubscribe/opt-out compliance in all outbound emails |

#### 3.7 Slack Channel

| Req ID | Requirement |
|--------|-------------|
| SL-01 | Slack app with OAuth2 for workspace installation |
| SL-02 | Listens on designated support channel(s) |
| SL-03 | Thread-based replies — each support request is a thread |
| SL-04 | Slash command `/support` for starting a new support request |
| SL-05 | DM support — customers can DM the bot directly |
| SL-06 | Reaction-based escalation — human agent reacts with :escalate: to take over |

#### 3.8 AI Agent Capabilities

| Req ID | Requirement |
|--------|-------------|
| AI-01 | Uses Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) via existing agentService |
| AI-02 | Knowledge base: all 100+ docs from `/api/docs/` injected as context |
| AI-03 | Brand voice: resolved from soul config hierarchy (platform → org) |
| AI-04 | Org context: pulls from Align 120 sessions OR manual input OR asks the user |
| AI-05 | Tool use: agent has tools for refund processing, tier changes, escalation, KB search |
| AI-06 | Conversation memory: maintains full thread context within session |
| AI-07 | Intent classification: categorizes each message (question, complaint, request, feedback) |
| AI-08 | Sentiment tracking: monitors customer sentiment per conversation |
| AI-09 | CSAT prompt: asks for satisfaction rating at conversation close |

#### 3.9 Policy-Driven Actions

| Req ID | Requirement |
|--------|-------------|
| PA-01 | **Refund:** Agent checks eligibility per refund policy, processes if eligible, escalates if not |
| PA-02 | **Tier Change:** Agent confirms desired tier, shows price difference, initiates Stripe subscription update |
| PA-03 | **Upsell/Downsell:** Agent recommends tier changes based on usage patterns and customer context |
| PA-04 | **Escalation:** Agent routes to human per escalation policy (severity, topic, customer tier) |
| PA-05 | All actions logged to `support_actions` with policy reference and action type metadata |

#### 3.10 Escalation System

| Req ID | Requirement |
|--------|-------------|
| ES-01 | Severity-based routing: low → AI resolves, medium → AI attempts then escalates, high/critical → immediate human |
| ES-02 | Topic-based routing: billing → finance, technical → engineering, account → customer success |
| ES-03 | SLA timers: auto-escalate if no resolution within threshold (configurable per severity) |
| ES-04 | Warm handoff: human agent receives full transcript + AI summary + severity + sentiment |
| ES-05 | Escalation notification via configured channels (email, Slack, in-platform) |

---

### 4. Non-Functional Requirements

| Category | Requirement | Target |
|----------|-------------|--------|
| **Performance** | Response time (first token) | < 2 seconds |
| **Performance** | Full response generation | < 10 seconds |
| **Performance** | Voice round-trip (STT + AI + TTS) | < 5 seconds |
| **Scale** | Concurrent conversations | 500 initial, expandable |
| **Scale** | Message throughput | 50 messages/second |
| **Availability** | Uptime | 99.5% (with graceful degradation) |
| **Security** | Guardrail pre-screening | Every message, no bypass |
| **Security** | PII handling | Encrypted at rest, consent collected |
| **Security** | Stripe integration | PCI-compliant via Stripe.js (no raw card data on server) |
| **Security** | Webhook verification | Signature verification on all inbound webhooks |
| **Compliance** | AI disclosure | Customers informed they are interacting with AI |
| **Compliance** | Data retention | 90 days, then anonymized [ASSUMPTION — needs legal review] |
| **Compliance** | Audit trail | Every action logged with timestamp, user, outcome |

#### Access Control & Module Registration

**Module Type:** Optional paid add-on (NOT included in base tier pricing)

This module is registered in `platform_modules` with `min_tier = NULL` (available to all tiers). Access is controlled via `org_module_access` when an org purchases the add-on. Feature differentiation is stored in `org_module_access.settings` JSONB.

**Access Gates:**
1. **Module purchase** — org must have `org_module_access` entry for `support_ai` with `is_enabled = TRUE`
2. **Tier-differentiated features** — capabilities stored in `settings` JSONB, enforced at route/service level
3. **Role enforcement** — manager+ for chatbot builder admin; IC/supervisor can be granted by org admin

#### Pricing & Tier Differentiation

**Competitive Benchmark:** Market converges at ~$0.99/resolved conversation (Intercom Fin, Gorgias). Conversation bundle pricing ranges $24-749/mo (Tidio, ChatBot.com). Enterprise custom from $2K-10K+/mo (Ada, Salesloft).

**Pricing Model:** Flat monthly add-on per tier with conversation caps and overage pricing.

| Tier | Add-on Monthly | Add-on Annual | Conv/Mo | Margin |
|------|---------------|--------------|---------|--------|
| **Starter** | $49/mo | $490/yr ($41/mo) | 500 | 89.8% |
| **Business** | $99/mo | $990/yr ($83/mo) | 2,000 | 84.8% |
| **Enterprise** | $199/mo | $1,990/yr ($166/mo) | 10,000 | 72.4% |
| **Agency** | $399/mo | $3,990/yr ($333/mo) | 25,000 pooled | 68.7% |

**Overage:** Starter $0.10/convo, Business $0.08, Enterprise $0.05, Agency $0.04

**Feature Differentiation by Tier:**

| Feature | Starter | Business | Enterprise | Agency |
|---------|---------|----------|-----------|--------|
| AI chatbot (Haiku 4.5) | Yes | Yes | Yes | Yes (per client) |
| Chatbot configurations | 1 | 3 | 10 | Unlimited |
| Chat widget (all embed types) | Yes | Yes | Yes | Yes (white-labeled) |
| Email channel | No | Yes | Yes | Yes |
| Slack channel | No | Yes | Yes | Yes |
| Financial actions (Stripe) | No | No | Yes | Yes |
| Voice (STT + TTS) | +$29/mo | +$29/mo | Included | Included |
| Static avatar (v1) | No | +$49/mo | +$49/mo | +$49-199/mo |
| Animated avatar (v1.5) | No | +$99/mo | +$99/mo | +$99-399/mo |
| Streaming avatar (v2) | No | No | +$299/mo | +$299-999/mo |
| White-label (remove branding) | No | No | No | Yes |
| Conversation history | 30 days | 90 days | 1 year | 1 year |
| Export conversations | No | Yes | Yes | Yes |
| Analytics | Basic | Standard | Advanced | Advanced (per-client) |
| Priority support | No | No | Yes | Yes |

**Cost Basis (per conversation):** ~$0.011 Haiku LLM cost + infrastructure overhead. Voice adds ~$0.021/min (STT $0.006 + TTS $0.015). Streaming avatar adds ~$0.37/min (HeyGen/Tavus).

**Module Registration SQL:**

```sql
INSERT INTO platform_modules (id, name, description, icon, route_path, min_tier, min_business_role, category, nav_group, display_order, is_active, is_beta)
VALUES ('support_ai', 'Customer Support AI', 'AI-powered customer support chatbot with embeddable widget, multi-channel support, and brand voice alignment', 'headset', '/support-admin.html', NULL, 'manager', 'tool', 'tools', 45, TRUE, TRUE)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
```

**`org_module_access.settings` JSONB Schema:**
```json
{
  "plan_tier": "business",
  "conversation_limit_monthly": 2000,
  "chatbot_configs_limit": 3,
  "channels_enabled": ["widget", "email", "slack"],
  "voice_enabled": false,
  "avatar_tier": null,
  "financial_actions_enabled": false,
  "white_label": false,
  "conversation_history_days": 90,
  "overage_price_per_convo": 0.08
}
```

**Route Protection:**
```javascript
// All support admin routes
router.use(requireModule('support_ai'));

// Public widget routes are exempt (served to end customers, not org users)
// BUT validated against widget_configs.org_id → org must have module access
```

---

### 5. Data Model

#### New Tables

```sql
-- Support conversations (separate from internal conversations)
CREATE TABLE support_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    customer_user_id UUID REFERENCES users(id),
    customer_email TEXT,
    customer_name TEXT,
    channel TEXT NOT NULL CHECK (channel IN ('widget', 'email', 'slack')),
    interaction_mode TEXT DEFAULT 'text' CHECK (interaction_mode IN ('text', 'voice', 'avatar')),
    channel_ref TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'waiting_customer', 'escalated', 'resolved', 'closed')),
    severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    category TEXT,
    sentiment_score NUMERIC(3,2),
    csat_score INTEGER CHECK (csat_score BETWEEN 1 AND 5),
    assigned_agent_id UUID REFERENCES agents(id),
    escalated_to UUID REFERENCES users(id),
    escalated_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolution_summary TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support messages within conversations
CREATE TABLE support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES support_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('customer', 'agent', 'human_agent', 'system')),
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'html', 'markdown', 'audio', 'form', 'rich_media')),
    attachments JSONB DEFAULT '[]',
    tool_calls JSONB DEFAULT '[]',
    rich_media JSONB DEFAULT '{}',  -- {type: 'video'|'image'|'pdf'|'form', url, fields, etc.}
    audio_url TEXT,                  -- Signed URL for voice messages
    tokens_used INTEGER,
    model TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support actions (refunds, tier changes, escalations)
CREATE TABLE support_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES support_conversations(id),
    action_type TEXT NOT NULL CHECK (action_type IN ('refund', 'tier_change', 'escalation', 'upsell', 'downsell', 'side_sell', 'other')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'executed', 'denied', 'failed', 'cancelled')),
    policy_id UUID REFERENCES processes(id),
    request_data JSONB NOT NULL,
    result_data JSONB,
    approved_by UUID REFERENCES users(id),
    executed_at TIMESTAMPTZ,
    stripe_event_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe integration config per org
CREATE TABLE stripe_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID UNIQUE REFERENCES organizations(id),
    stripe_customer_id TEXT NOT NULL,
    stripe_subscription_id TEXT,
    current_price_id TEXT,
    billing_email TEXT,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Slack workspace connections
CREATE TABLE slack_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    workspace_id TEXT NOT NULL,
    workspace_name TEXT,
    bot_token TEXT NOT NULL,              -- Encrypted at rest
    support_channel_ids TEXT[] DEFAULT '{}',
    installed_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Widget configurations (comprehensive)
CREATE TABLE widget_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    embed_key TEXT UNIQUE NOT NULL,

    -- Embed type
    embed_type TEXT DEFAULT 'fab' CHECK (embed_type IN ('fab', 'inline', 'popup')),

    -- FAB-specific
    position TEXT DEFAULT 'bottom-right' CHECK (position IN ('bottom-right', 'bottom-left')),
    fab_icon TEXT DEFAULT 'default',
    fab_size INTEGER DEFAULT 56,

    -- Dimensions
    panel_width INTEGER DEFAULT 400,
    panel_height INTEGER DEFAULT 600,
    panel_max_width INTEGER DEFAULT 500,

    -- Theme (pulls defaults from org_branding)
    theme JSONB DEFAULT '{
        "primaryColor": null,
        "buttonColor": null,
        "fontFamily": null,
        "fontSize": "medium",
        "buttonStyle": "filled",
        "cornerRadius": "medium",
        "dropShadow": true,
        "opacity": 100
    }',

    -- Bot persona (pulls from org_branding if null)
    bot_name TEXT,
    bot_avatar_url TEXT,

    -- Content
    welcome_message TEXT DEFAULT 'Hi! How can I help you today?',
    offline_message TEXT DEFAULT 'We are currently unavailable. Leave a message.',
    pre_chat_fields JSONB DEFAULT '[
        {"name":"name","label":"Name","type":"text","required":true},
        {"name":"email","label":"Email","type":"email","required":true},
        {"name":"category","label":"Topic","type":"select","required":false,
         "options":["General","Billing","Technical","Account"]}
    ]',

    -- Rich media
    enable_file_upload BOOLEAN DEFAULT true,
    enable_video_embed BOOLEAN DEFAULT true,
    enable_pdf_viewer BOOLEAN DEFAULT true,
    enable_forms BOOLEAN DEFAULT true,
    max_upload_size_mb INTEGER DEFAULT 10,
    allowed_file_types TEXT[] DEFAULT '{image/png,image/jpeg,image/gif,application/pdf}',

    -- Welcome video
    welcome_video_url TEXT,
    welcome_video_autoplay BOOLEAN DEFAULT true,
    welcome_video_skippable BOOLEAN DEFAULT true,
    welcome_video_show_once BOOLEAN DEFAULT true,

    -- Voice mode
    voice_enabled BOOLEAN DEFAULT true,
    voice_stt_model TEXT DEFAULT 'gpt-4o-transcribe',
    voice_tts_voice TEXT DEFAULT 'nova',
    voice_tts_instructions TEXT,
    voice_input_mode TEXT DEFAULT 'push_to_talk'
        CHECK (voice_input_mode IN ('push_to_talk', 'vad')),

    -- Avatar mode
    avatar_enabled BOOLEAN DEFAULT false,
    avatar_mode TEXT DEFAULT 'static'
        CHECK (avatar_mode IN ('static', 'animated_2d', 'animated_3d', 'streaming')),
    avatar_url TEXT,
    avatar_3d_model_url TEXT,
    avatar_streaming_provider TEXT
        CHECK (avatar_streaming_provider IN ('heygen', 'tavus')),
    avatar_streaming_api_key TEXT,

    -- Behavior
    proactive_triggers JSONB DEFAULT '[]',
    sound_enabled BOOLEAN DEFAULT true,
    show_branding BOOLEAN DEFAULT true,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Modifications to Existing Tables

| Table | Change |
|-------|--------|
| `platform_modules` | INSERT: `customer_support` module (min_tier: NULL = all tiers) |
| `agents` | INSERT: seed support agent with Haiku model + support system prompt |
| `processes` | INSERT: 3 seed policies (refund, escalation, upsell/downsell/side-sell) |
| `escalation_rules` | INSERT: support-specific escalation rules |
| `context_assets` | INSERT: support KB asset pointing to documentation collection |

---

### 6. API Endpoints

#### Support Routes (`server/routes/support.js`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/support/conversations` | Create new support conversation |
| GET | `/api/support/conversations` | List conversations (filtered) |
| GET | `/api/support/conversations/:id` | Get conversation with messages |
| PATCH | `/api/support/conversations/:id` | Update status, assign, escalate |
| POST | `/api/support/conversations/:id/messages` | Send message (triggers AI response) |
| POST | `/api/support/conversations/:id/messages/stream` | Stream AI response via SSE |
| POST | `/api/support/conversations/:id/escalate` | Escalate to human |
| POST | `/api/support/conversations/:id/resolve` | Mark resolved |
| POST | `/api/support/conversations/:id/csat` | Submit CSAT rating |
| GET | `/api/support/metrics` | Dashboard metrics |

#### Voice Routes (`server/routes/supportVoice.js`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/support/voice/transcribe` | Audio blob → text (STT via voice.js) |
| POST | `/api/support/voice/speak` | Text → audio (TTS via voice.js with soul config instructions) |

#### Action Routes (`server/routes/supportActions.js`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/support/actions/refund` | Initiate refund per policy |
| POST | `/api/support/actions/tier-change` | Initiate tier change via Stripe |
| GET | `/api/support/actions/:id` | Get action status |
| PATCH | `/api/support/actions/:id/approve` | Manual approval |

#### Widget Routes (`server/routes/supportWidget.js`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/support/widget/config/:embedKey` | Get widget config (public, CORS-enabled) |
| POST | `/api/support/widget/init` | Initialize widget session (public) |
| GET | `/api/support/widget/embed.js` | Serve embeddable widget JS bundle |

#### Webhook Routes (`server/routes/supportWebhooks.js`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/support/webhooks/email` | Inbound email parse |
| POST | `/api/support/webhooks/slack/events` | Slack Events API |
| POST | `/api/support/webhooks/slack/interactions` | Slack interactive components |
| POST | `/api/support/webhooks/stripe` | Stripe payment events |

#### Admin Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/support/admin/policies` | List support policies |
| PUT | `/api/support/admin/policies/:id` | Update policy |
| GET | `/api/support/admin/channels` | Get channel configs |
| PUT | `/api/support/admin/channels/:channel` | Update channel config |
| GET | `/api/support/admin/widget` | Get widget config |
| PUT | `/api/support/admin/widget` | Update widget config |
| POST | `/api/support/admin/widget/upload` | Upload welcome video / avatar assets |

---

### 7. Embed Code Patterns

```html
<!-- FAB (floating button — Pickaxe-style) -->
<script src="https://app.insight360.io/support/embed.js"
        data-key="embed-key-uuid"
        data-type="fab"
        defer></script>

<!-- Inline (renders in a target container) -->
<script src="https://app.insight360.io/support/embed.js"
        data-key="embed-key-uuid"
        data-type="inline"
        data-target="#support-container"
        defer></script>

<!-- Pop-up (JS API, triggered by host page) -->
<script src="https://app.insight360.io/support/embed.js"
        data-key="embed-key-uuid"
        data-type="popup"
        defer></script>
<button onclick="SynergiSupport.open()">Get Help</button>
```

**JS API exposed on host page:**
```javascript
SynergiSupport.open()           // Open the widget
SynergiSupport.close()          // Close the widget
SynergiSupport.toggle()         // Toggle open/close
SynergiSupport.setMode('voice') // Switch to voice mode
SynergiSupport.setMode('text')  // Switch to text mode
SynergiSupport.setUser({name, email})  // Pre-fill user info
SynergiSupport.on('escalated', cb)     // Event hooks
SynergiSupport.on('resolved', cb)
```

---

### 8. Branding Cascade

```
Widget config (explicit overrides)
  → org_branding table (ai_assistant_name, ai_assistant_avatar_url, app_name)
    → soul_config voice section (tone, personality_temperature, avoid-words)
      → platform defaults (Insight 360 branding)
```

---

### 9. Seed Policy Definitions

#### Escalation Policy

```json
{
    "name": "Customer Support Escalation Policy",
    "description": "Defines when and how support conversations are escalated from AI to human agents",
    "type": "policy",
    "status": "active",
    "version": "1.0",
    "icon": "arrow-up-circle",
    "tags": ["support", "escalation", "customer-success", "critical-path"],
    "steps": [
        {
            "order": 1,
            "title": "Severity Classification",
            "owner": "AI Support Agent",
            "criteria": {
                "low": "General questions, how-to, feature inquiries — no business impact",
                "medium": "Feature not working as expected, confusion about billing, minor data issues",
                "high": "Service degradation, incorrect billing, data access issues, security concerns",
                "critical": "Service outage, data loss/breach suspicion, legal/compliance, safety concerns"
            }
        },
        {
            "order": 2,
            "title": "AI Resolution Attempt",
            "owner": "AI Support Agent",
            "rules": {
                "low": "AI resolves autonomously. No escalation unless customer explicitly requests human.",
                "medium": "AI attempts resolution with max 3 exchanges. If unresolved, escalate with context.",
                "high": "AI acknowledges and immediately escalates. Provides initial context gathering only.",
                "critical": "Immediate escalation. AI sends acknowledgment and creates priority alert."
            }
        },
        {
            "order": 3,
            "title": "Escalation Routing",
            "owner": "System",
            "routing": {
                "billing": "Finance department",
                "technical": "Development department",
                "account": "Customer Success",
                "security": "Development + Executive",
                "general": "Operations"
            }
        },
        {
            "order": 4,
            "title": "SLA Enforcement",
            "owner": "System",
            "sla_targets": {
                "low": "24 hours",
                "medium": "4 hours",
                "high": "1 hour",
                "critical": "15 minutes"
            },
            "auto_escalate_to": {
                "low": "department_admin",
                "medium": "department_admin",
                "high": "system_admin",
                "critical": "super_admin"
            }
        },
        {
            "order": 5,
            "title": "Handoff Protocol",
            "owner": "AI Support Agent",
            "handoff_includes": [
                "Full conversation transcript",
                "AI-generated summary (3 sentences max)",
                "Severity classification with rationale",
                "Customer sentiment score",
                "Intent classification",
                "Actions attempted by AI",
                "Customer org/tier context",
                "Recommended next steps"
            ]
        }
    ]
}
```

#### Refund Policy

```json
{
    "name": "Customer Refund Policy",
    "description": "Defines eligibility, approval workflows, and processing rules for refund requests",
    "type": "policy",
    "status": "active",
    "version": "1.0",
    "icon": "receipt-text",
    "tags": ["support", "billing", "refund", "finance", "critical-path"],
    "steps": [
        {
            "order": 1,
            "title": "Refund Eligibility Check",
            "owner": "AI Support Agent",
            "eligibility_rules": {
                "time_window": "30 days from charge date",
                "valid_reasons": [
                    "Service not as described",
                    "Technical issues preventing usage",
                    "Accidental duplicate charge",
                    "Downgrade with prorated refund",
                    "Cancellation within trial period"
                ],
                "ineligible_reasons": [
                    "Change of mind after 30 days",
                    "Feature request (not a deficiency)",
                    "Usage-based charges already consumed",
                    "Third-party integration issues outside Synergi control"
                ]
            }
        },
        {
            "order": 2,
            "title": "Refund Amount Calculation",
            "owner": "AI Support Agent",
            "calculation_rules": {
                "full_refund": "Within 14 days of initial purchase, no significant usage",
                "prorated_refund": "Downgrade mid-cycle — refund unused portion",
                "partial_refund": "Service degradation — based on downtime / billing period",
                "credit": "Feature-related — account credit for future cycle"
            }
        },
        {
            "order": 3,
            "title": "Approval Routing",
            "owner": "System",
            "approval_rules": {
                "auto_approve": "Refund <= $50 AND within 14 days AND first refund for customer",
                "manager_approve": "Refund $51-$500 OR second refund within 90 days",
                "finance_approve": "Refund > $500 OR third+ refund within 12 months"
            }
        },
        {
            "order": 4,
            "title": "Refund Processing",
            "owner": "System",
            "processing_steps": [
                "Create Stripe refund object with reason and metadata",
                "Update support_actions record with Stripe refund ID",
                "Send confirmation email to customer",
                "Log refund in financial audit trail",
                "If tier-related: update subscription in Stripe"
            ]
        },
        {
            "order": 5,
            "title": "Post-Refund Actions",
            "owner": "Customer Success",
            "actions": [
                "Send refund confirmation with expected timeline (5-10 business days)",
                "If cancellation: send offboarding survey",
                "If downgrade: confirm new tier features",
                "Log reason for churn analysis",
                "Flag account for retention outreach if high-value"
            ]
        }
    ]
}
```

#### Upsell / Downsell / Side-Sell Policy

```json
{
    "name": "Tier Change and Recommendation Policy",
    "description": "Defines when and how the support agent recommends or executes subscription tier changes",
    "type": "policy",
    "status": "active",
    "version": "1.0",
    "icon": "arrow-up-down",
    "tags": ["support", "billing", "upsell", "downsell", "revenue", "customer-success"],
    "steps": [
        {
            "order": 1,
            "title": "Tier Change Signal Detection",
            "owner": "AI Support Agent",
            "signals": {
                "upsell_signals": [
                    "Customer hitting resource limits (agents, workflows, members)",
                    "Customer asking about features on higher tiers",
                    "Customer mentions growth, scaling, or expanding team",
                    "Customer on current tier 3+ months with high usage"
                ],
                "downsell_signals": [
                    "Customer requests cancellation — offer lower tier as retention",
                    "Customer complains about price relative to usage",
                    "Customer usage well below tier limits for 2+ months"
                ],
                "side_sell_signals": [
                    "Customer asks about add-on capabilities",
                    "Customer could benefit from different tier feature mix",
                    "Customer on Business but needs Agency client management"
                ]
            }
        },
        {
            "order": 2,
            "title": "Recommendation Framing",
            "owner": "AI Support Agent",
            "framing_rules": {
                "upsell": {
                    "approach": "Value-first, not sales-pressure",
                    "max_frequency": "Once per conversation, do not repeat if declined",
                    "never_upsell_during": ["active complaint", "refund request", "service outage"]
                },
                "downsell": {
                    "approach": "Retention-focused, acknowledge concerns first",
                    "when": "Only when customer expresses intent to cancel or strong price concern"
                },
                "side_sell": {
                    "approach": "Needs-based, educational",
                    "when": "Customer describes needs that align better with a different tier"
                }
            }
        },
        {
            "order": 3,
            "title": "Tier Comparison Presentation",
            "owner": "AI Support Agent",
            "comparison_includes": [
                "Current tier name and price",
                "Recommended tier name and price",
                "Price difference (monthly and annual)",
                "Features gained or retained",
                "Prorated cost if mid-cycle"
            ]
        },
        {
            "order": 4,
            "title": "Tier Change Execution",
            "owner": "System",
            "safety_rules": {
                "require_confirmation": true,
                "show_price_before_confirm": true,
                "allow_cancel_within": "24 hours of change",
                "never_auto_execute": "All tier changes require explicit customer confirmation"
            }
        },
        {
            "order": 5,
            "title": "Post-Change Follow-Up",
            "owner": "AI Support Agent",
            "follow_up": [
                "Confirm change is active immediately",
                "Highlight key new features or retained features",
                "Offer to help set up newly available features",
                "Log tier change reason for revenue analytics"
            ]
        }
    ]
}
```

---

### 10. Failure Scenarios

| # | Scenario | Trigger | Expected Behavior | Recovery |
|---|----------|---------|-------------------|----------|
| 1 | LLM (Haiku) unavailable | Anthropic API down or rate-limited | Circuit breaker opens. Widget shows fallback message. Email queues for human. Slack posts apology + escalation. | Auto-recovery via circuit breaker HALF_OPEN. Uses existing `reliability.js`. |
| 2 | Stripe API failure during refund | Stripe outage or invalid request | Transaction rolled back. Customer told refund is delayed. Action logged as `pending` with retry flag. | Retry queue with exponential backoff (max 3). Auto-escalate to human after failure. |
| 3 | Stripe API failure during tier change | Stripe outage or payment decline | No subscription change applied. Customer informed of failure reason. | Payment decline: customer self-service. Outage: retry queue. |
| 4 | Escalation target unavailable | No human agents online | Conversation marked `escalated` with SLA timer. Customer informed of response timeline. | SLA timer triggers secondary escalation to admin. |
| 5 | Policy not found | Policy deleted from processes table | Agent cannot execute action. Auto-escalates to human. | Admin alerted to missing policy. |
| 6 | Context injection fails | Docs unavailable or token budget exceeded | Agent operates with reduced context. Logged as degraded event. | Automatic degradation. Admin notified. |
| 7 | Widget session lost | Browser crash, cookie cleared | New session created. Previous conversation accessible via email lookup. | Email confirmation links previous conversations. |
| 8 | Inbound email parse failure | Malformed email, unsupported encoding | Raw email stored in dead-letter queue. Auto-reply sent. | Admin reviews dead-letter queue. |
| 9 | Slack webhook verification fails | Signing secret mismatch | Request rejected with 401. Logged as security event. | Automatic rejection. Admin alerted. |
| 10 | Guardrail blocks customer message | Prompt injection or bright line trigger | Message blocked. Generic response + auto-escalation. Incident logged. | Auto-escalation with security context. |
| 11 | Database write fails mid-conversation | Supabase outage | In-memory conversation continues. Messages queued for write-behind. | Write-behind processes on DB recovery. |
| 12 | Concurrent conversation limit reached | 500+ active conversations | New conversations queued with position indicator. | Queue drains as conversations resolve. |
| 13 | STT/TTS service failure | OpenAI API down | Voice mode gracefully falls back to text-only mode. User informed. | Auto-fallback. Mode selector re-enables voice when service recovers. |
| 14 | Voice audio too large/long | Customer records >2min audio | Client-side limit enforced (120s max). Audio over limit rejected with message. | Client-side prevention. |
| 15 | Welcome video fails to load | Video URL expired or unavailable | Skip video, go directly to chat. Logged as asset error. | Admin re-uploads video. Widget functional without video. |

---

### 11. Downstream Impact Analysis

| System/Feature | Relationship | Impact | Severity |
|---------------|-------------|--------|----------|
| Agent Service (`agentService.js`) | Core dependency | New agent type with tool_use; streaming for widget. Concurrent session management. | H |
| Voice Service (`voice.js`) | Core dependency | New routes wrapping existing STT/TTS. Higher call volume. | M |
| Audio Service (`audioService.js`) | Consumed by | Storage for voice messages and welcome videos. | L |
| Soul Config (`soulConfigService.js`) | Consumed by | Brand voice resolution + TTS instructions injection. No code changes. | L |
| Context Injection (`contextInjection.js`) | Consumed by | New support KB context asset. May need bulk doc assembly. | M |
| Guardrail Enforcement | Consumed by | Every message screened. Volume increase (~5,000 screens/min peak). | M |
| Docs Route (`docs.js`) | Consumed by | Bulk doc retrieval needed for KB. Current single-file endpoint insufficient. | M |
| Align 120 (`align120.js`) | Consumed by | Read-only org context access. No changes. | L |
| Processes Table | Shared data | 3 new seed policies. Existing UI must display them. | L |
| Escalation Rules | Shared data | New support-specific rules. | L |
| Platform Modules | Registration | New `customer_support` module. Navigation updated. | L |
| Subscription Tiers | Consumed by | Stripe price IDs must be mapped. | M |
| Auth System | Boundary | Widget creates anonymous sessions. Public endpoints needed. | H |
| Navigation (`navigation.js`) | UI update | New sidebar entry for Support module. | L |
| org_branding | Consumed by | Bot name + avatar pulled for widget persona. No changes. | L |

---

### 12. Implementation Brief

#### Phase 1: Core Foundation (Medium)

**New Files:**
- `db/phase-support-system.sql` — All tables, seed policies, module registration, RLS
- `server/routes/support.js` — Conversation CRUD + message handling + SSE streaming
- `server/routes/supportActions.js` — Refund + tier change endpoints
- `server/services/supportAgentService.js` — Support agent orchestration (context assembly, tool definitions, conversation management)
- `server/services/supportPolicyService.js` — Policy lookup + eligibility evaluation

**Modified:** `server/index.js` (register routes)

#### Phase 2a: Chat Widget — Text Mode + Welcome Video (Large)

**New Files:**
- `server/routes/supportWidget.js` — Widget config + embed.js serving (public, CORS)
- `public/js/support-widget-embed.js` — Self-contained embeddable widget (FAB/inline/popup, pre-chat form, SSE streaming, session persistence, responsive, themeable, welcome video player, rich media rendering, proactive triggers, sound notifications)
- `public/css/support-widget.css` — Scoped widget styles
- `public/support-dashboard.html` — Support metrics dashboard
- `public/support-admin.html` — Policy + channel + widget configuration
- `public/support-agent.html` — Human agent interface for escalated conversations

**Modified:** `server/index.js`, `public/js/navigation.js`, `public/js/help-registry.js`

#### Phase 2b: Chat Widget — Voice Mode (Medium)

**New Files:**
- `server/routes/supportVoice.js` — STT + TTS endpoints wrapping voice.js
- Widget JS additions: mic recording (MediaRecorder API), audio playback, waveform visualizer, mode selector UI

**Modified:** `public/js/support-widget-embed.js` (add voice mode)

#### Phase 2c: Chat Widget — Avatar Mode (Medium)

**New Files:**
- Widget JS additions: static avatar display, audio visualizer animation, 3D avatar renderer (v1.5)
- `public/js/support-avatar-engine.js` — Lip-sync controller (WebGL + Web Audio API)

**Modified:** `public/js/support-widget-embed.js` (add avatar mode)

#### Phase 3: Stripe Integration (Medium)

**New Files:**
- `server/services/stripeService.js` — Stripe SDK wrapper
- Stripe webhook handler in `server/routes/supportWebhooks.js`

**New dependency:** `stripe` npm package
**Environment:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
**New table:** `stripe_connections`

#### Phase 4: Email + Slack Channels (Large)

**New Files:**
- `server/services/slackSupportService.js` — Slack Bot
- `server/services/emailSupportService.js` — Inbound email parsing + outbound
- Extended webhook routes

**New dependencies:** `@slack/bolt`, email provider SDK
**Environment:** `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SENDGRID_API_KEY`
**New table:** `slack_connections`

#### Phase 5 (Future): Streaming Avatar

- HeyGen/Tavus API service + WebSocket bridge
- Premium tier feature gate

#### Implementation Sequence

Phase 1 → Phase 2a → Phase 2b → Phase 2c → Phase 3 → Phase 4 → Phase 5

Phases 2b and 2c can parallel with Phase 3. Phase 4 has external dependencies (Slack app registration, email provider account).

---

## Subordinate Agent Reports

### Security Analyst (Alex) — Threat Model

**Status:** accepted
**Confidence:** high

#### Overall Risk Level: HIGH

#### STRIDE Analysis — Key Findings

| # | Threat | Type | Affected Component | Severity | Mitigation |
|---|--------|------|-------------------|----------|------------|
| SEC-01 | Prompt injection via support messages tricks AI into unauthorized refund/tier change | Tampering / Elevation | `supportAgentService.js` — tool_use | **HIGH** | Existing guardrail pre-screening catches known patterns. Add: tool-level confirmation (AI must get explicit customer confirmation before executing financial actions). Add: maximum refund amount hard cap in tool definition. Add: rate limit on financial actions per conversation (max 1 refund, 1 tier change). |
| SEC-02 | Public widget endpoints enable DoS via conversation flooding | Denial of Service | `/api/support/widget/init` | **HIGH** | Implement: rate limiting per IP (10 conversations/hour), per embed key (100/hour). CAPTCHA after 3 conversations from same IP. Connection pooling with backpressure. |
| SEC-03 | Widget embed key enumeration exposes org configs | Information Disclosure | `/api/support/widget/config/:embedKey` | Medium | Use cryptographically random UUIDs (already planned). Rate limit config endpoint. Do not expose internal org IDs in public config response. |
| SEC-04 | Cross-origin widget cookie/session theft | Spoofing | Widget JS on third-party domains | Medium | Use `SameSite=None; Secure` cookies with CSRF tokens. Widget sessions are anonymous — limited damage surface. No auth cookies in widget context. |
| SEC-05 | Slack bot token theft via database compromise | Information Disclosure | `slack_connections.bot_token` | **HIGH** | Encrypt bot tokens at rest using application-level encryption (not just DB-level). Use Supabase Vault or server-side encryption with key rotation. |
| SEC-06 | Stripe webhook forgery | Tampering | `/api/support/webhooks/stripe` | **HIGH** | Stripe signature verification mandatory (use `stripe.webhooks.constructEvent()`). Reject any unverified webhook. Log verification failures. |
| SEC-07 | Email webhook spoofing (forged inbound emails) | Spoofing | `/api/support/webhooks/email` | Medium | Verify SendGrid/Mailgun webhook signatures. SPF/DKIM validation on inbound emails. Do not auto-execute financial actions from email — require authenticated confirmation. |
| SEC-08 | Cross-tenant data leak via conversation ID guessing | Information Disclosure | `/api/support/conversations/:id` | Medium | RLS enforces org_id scoping. Additionally: validate org_id on every query. UUID conversation IDs prevent enumeration. |
| SEC-09 | File upload malware injection | Tampering | Widget file upload | Medium | Scan uploads with file type validation (magic bytes, not just extension). Size limits enforced client-side and server-side. Store in isolated Supabase bucket. Serve via signed URLs with Content-Disposition: attachment. |
| SEC-10 | Voice audio injection (adversarial audio) | Tampering | `/api/support/voice/transcribe` | Low | STT models are robust against adversarial audio. Rate limit voice endpoints. Max audio duration enforced client-side (120s). |

#### Auth/Authz Summary

| Check | Status | Notes |
|-------|--------|-------|
| Authentication on internal routes | PASS | Supabase auth required for admin/agent routes |
| Public widget endpoints properly scoped | PASS with conditions | Must implement rate limiting + CAPTCHA |
| RLS on all new tables | REQUIRES IMPLEMENTATION | Must add org_id RLS policies to all 6 new tables |
| IDOR protection | PASS | UUID-based IDs prevent enumeration |
| Cross-tenant isolation | PASS with conditions | RLS + application-level org_id validation |
| Webhook signature verification | REQUIRES IMPLEMENTATION | Must implement for Stripe, Slack, and email webhooks |

#### Security Recommendation: **FIX BEFORE SHIP**
- SEC-01, SEC-02, SEC-05, SEC-06 must be resolved before any external-facing deployment
- All new tables must have RLS policies before launch

---

### Compliance Auditor (Riley) — Data Governance Review

**Status:** accepted
**Confidence:** high

#### Overall Compliance Status: CONDITIONAL

#### Data Inventory

| Data Element | Classification | PII? | Consent Required? |
|-------------|---------------|------|-------------------|
| Customer name | Restricted | Yes | Yes — pre-chat form consent |
| Customer email | Restricted | Yes | Yes — pre-chat form consent |
| Conversation content | Confidential | May contain | Yes — disclosure required |
| Refund amounts | Restricted | No (financial) | Covered by ToS |
| Stripe customer ID | Restricted | No (identifier) | Covered by Stripe ToS |
| Billing email | Restricted | Yes | Covered by Stripe ToS |
| Slack bot token | Restricted | No (credential) | N/A — admin-configured |
| CSAT score | Internal | No | Implied by voluntary submission |
| Sentiment score | Internal | No (derived) | No — AI-generated metadata |
| Voice audio | Restricted | Yes (biometric in some jurisdictions) | Yes — explicit consent before recording |

#### Key Compliance Findings

| # | Finding | Severity | Category | Recommendation |
|---|---------|----------|----------|---------------|
| CMP-01 | AI disclosure required before conversation | **High** | Regulatory | Widget must display "You are chatting with an AI assistant" before first message. EU AI Act and FTC guidelines require AI disclosure. |
| CMP-02 | Voice recording consent | **High** | Consent | Before enabling mic, widget must display consent prompt: "This conversation will be recorded for quality purposes. Do you consent?" Must be opt-in, not pre-checked. |
| CMP-03 | PII consent at pre-chat form | High | Consent | Pre-chat form must include link to privacy policy and explicit consent checkbox. |
| CMP-04 | Data retention policy undefined | Medium | Data Governance | 90-day assumption needs formal policy. Implement automated anonymization job. |
| CMP-05 | Right to deletion not implemented | Medium | Regulatory | Must provide mechanism for customers to request conversation deletion (GDPR Art. 17, CCPA). |
| CMP-06 | Third-party DPA required | Medium | Data Governance | Data Processing Agreements needed with Anthropic, Stripe, SendGrid, Slack for PII handling. |
| CMP-07 | Slack bot token encryption | High | Data Governance | Must encrypt at rest (application-level). Aligns with SEC-05. |
| CMP-08 | Audit trail for financial actions | Pass | Audit Trail | `support_actions` table captures full lifecycle. Sufficient for financial audit. |
| CMP-09 | Cross-channel data linking | Medium | Privacy | Linking conversations across channels for same customer requires disclosure in privacy policy. |

#### Compliance Recommendation: **APPROVE WITH CONDITIONS**

**Conditions (must be met before launch):**
1. AI disclosure banner in widget (CMP-01)
2. Voice recording consent flow (CMP-02)
3. Pre-chat form privacy policy link + consent checkbox (CMP-03)
4. Data retention policy formalized and automated (CMP-04)
5. Right-to-deletion API endpoint (CMP-05)
6. Slack bot token encryption (CMP-07)

---

### QA Analyst (Morgan) — Test Plan

**Status:** accepted
**Confidence:** high

#### Test Summary

| Category | Test Cases | Priority |
|----------|-----------|----------|
| Widget — Text Mode | 16 | Critical |
| Widget — Voice Mode | 9 | High |
| Widget — Avatar Mode | 5 | Medium |
| Widget — Rich Media | 8 | High |
| Welcome Video | 6 | Medium |
| Email Channel | 8 | High |
| Slack Channel | 9 | High |
| AI Agent Behavior | 12 | Critical |
| Policy Actions (Refund) | 10 | Critical |
| Policy Actions (Tier Change) | 8 | Critical |
| Policy Actions (Upsell/Downsell) | 6 | High |
| Escalation System | 10 | Critical |
| Access Control | 12 | Critical |
| Data Integrity | 10 | Critical |
| Performance | 8 | Critical |
| Destructive Tests | 15 | Critical |
| Regression | 10 | High |
| **Total** | **162** | |

#### Critical Test Cases (Must Pass Before Launch)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| TC-01 | Widget FAB loads via single script tag on external site | Button renders at configured position, no console errors |
| TC-02 | Pre-chat form validates required fields | Name and email required before chat starts |
| TC-03 | AI responds to documentation question correctly | Answer matches content from docs KB |
| TC-04 | AI communicates in org brand voice | Tone matches soul config voice settings |
| TC-05 | Guardrail blocks prompt injection in support message | Blocked message, generic response, incident logged |
| TC-06 | Refund under $50 auto-approved and processed via Stripe | Stripe refund created, action logged as executed |
| TC-07 | Refund over $500 escalated for finance approval | Action logged as pending, escalation notification sent |
| TC-08 | Tier upgrade updates Stripe subscription | New price_id applied, confirmation sent |
| TC-09 | High-severity message immediately escalated | No AI resolution attempt, human notified within SLA |
| TC-10 | Human agent receives full handoff package | Transcript, summary, severity, sentiment all present |
| TC-11 | Voice STT transcribes customer audio correctly | Text matches spoken words with >95% accuracy |
| TC-12 | Voice TTS uses soul config voice instructions | Audio tone matches configured personality |
| TC-13 | Conversation persists across page navigation | Previous messages visible when widget reopens |
| TC-14 | Cross-org isolation: Org A cannot see Org B conversations | 403 or empty result on cross-org query |
| TC-15 | 500 concurrent conversations handled | No errors, response time < 10s at p95 |

#### Performance Criteria

| Metric | Threshold | Method |
|--------|-----------|--------|
| Widget load time (script parse + render) | < 500ms | Performance API |
| First token response time | < 2s | Timing middleware |
| Full text response time | < 10s | Timing middleware |
| Voice round-trip (STT + AI + TTS) | < 5s | End-to-end timing |
| API response time (CRUD operations) | < 200ms at p95 | Load test |
| Concurrent conversations | 500 without degradation | Load test |
| Memory under load | No unbounded growth | Heap profiling |

#### Destructive Tests

| # | Test | Expected |
|---|------|----------|
| DT-01 | Send 100 messages in 1 second to same conversation | Rate limiter activates, no data corruption |
| DT-02 | Submit refund with Stripe API offline | Transaction rolled back, retry queued, customer informed |
| DT-03 | Submit malformed JSON in message body | 400 error, no crash, no state corruption |
| DT-04 | Upload file exceeding max size | Rejected with 413, no partial upload |
| DT-05 | Send audio >120s to STT endpoint | Rejected client-side and server-side |
| DT-06 | Kill Supabase connection mid-conversation | In-memory conversation continues, write-behind queue |
| DT-07 | Exhaust concurrent conversation limit | Queue with position indicator, no crashes |
| DT-08 | Forge Stripe webhook signature | Rejected with 401, security event logged |

---

### Metrics Analyst (Quinn) — Measurement Framework

**Status:** accepted
**Confidence:** high

#### North Star Metric

**AI Resolution Rate** — % of support conversations resolved by AI without human escalation

- **Target:** 70% within 30 days of launch
- **Measurement:** `COUNT(status='resolved' AND escalated_to IS NULL) / COUNT(*)` from `support_conversations`
- **Rationale:** Directly captures the core value proposition — scaling support without scaling headcount

#### SLO/SLI Definitions

| SLI (Indicator) | Measurement | SLO (Objective) | Error Budget (per month) |
|-----------------|-------------|-----------------|--------------------------|
| Widget availability | % of embed.js requests returning 200 | 99.9% | 43 min downtime |
| First response latency (p95) | Time from customer message to first AI token | < 2 seconds | 5% of requests can exceed |
| Full response latency (p95) | Time from message to complete response | < 10 seconds | 5% of requests can exceed |
| Voice round-trip (p95) | STT + AI + TTS total time | < 5 seconds | 5% of requests can exceed |
| Financial action accuracy | % of refunds/tier changes matching policy | 99.99% | 1 error per 10,000 actions |
| Escalation delivery | % of escalations delivered to human within SLA | 95% | 5% can miss SLA |
| Data integrity | % of conversations with complete message chain | 99.99% | 1 orphan per 10,000 conversations |

#### Guardrail Metrics (Must NOT Degrade)

| Metric | Acceptable Range | Alert Threshold |
|--------|-----------------|-----------------|
| Incorrect refund rate | 0% | Any incorrect refund triggers immediate investigation |
| Unauthorized tier change | 0% | Any unauthorized change triggers SEV-1 |
| Guardrail bypass rate | < 0.1% | > 0.5% triggers security review |
| Cross-tenant data leak | 0 incidents | Any incident triggers SEV-1 |
| Escalation SLA breach rate | < 5% | > 10% triggers process review |
| Existing feature error rate | No increase | > 5% increase triggers rollback evaluation |

#### Observability Runbook

```
OBSERVABILITY RUNBOOK: Customer Support Agent System

What to Watch:
1. support_conversations table — active count vs. 500 limit
2. agent_executions for support agent — error rate, latency p95
3. Stripe webhook delivery — success rate, latency
4. Voice service — STT/TTS error rate, latency
5. Guardrail screening — block rate (sudden spike = possible attack)

Key Log Queries:
- Active conversations: SELECT COUNT(*) FROM support_conversations WHERE status = 'active'
- Escalation rate (last hour): SELECT COUNT(*) FILTER (WHERE escalated_to IS NOT NULL) * 100.0 / COUNT(*) FROM support_conversations WHERE created_at > now() - interval '1 hour'
- Failed financial actions: SELECT * FROM support_actions WHERE status = 'failed' AND created_at > now() - interval '1 hour'
- Guardrail blocks: SELECT COUNT(*) FROM bright_line_incidents WHERE created_at > now() - interval '1 hour'

Alert Conditions:
| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| High conversation volume | active_conversations > 400 | SEV-3 | Notify ops team, prepare scaling |
| Conversation limit reached | active_conversations >= 500 | SEV-2 | Queue new conversations, notify admin |
| AI resolution rate drop | resolution_rate < 50% for 1 hour | SEV-3 | Investigate — KB gap? Policy change? |
| Financial action failure | Any failed refund/tier change | SEV-2 | Check Stripe status, manual intervention |
| Guardrail spike | block_rate > 5% for 15 min | SEV-2 | Possible attack, review blocked messages |
| Voice service down | STT/TTS error rate > 10% for 5 min | SEV-3 | Fall back to text mode, check OpenAI status |
| CSAT drop | average_csat < 3.0 for 1 day | SEV-3 | Review recent conversations, investigate |

Degradation Detection:
- Gradual: Resolution rate trending down over 7 days — investigate when < 60%
- Sudden: Error rate jumps > 5% in < 5 minutes — immediate investigation

Triage Steps (when alert fires):
1. Check Railway deployment status and recent deploys
2. Check Anthropic API status (for Haiku)
3. Check Supabase status (for database)
4. Check Stripe status (for financial actions)
5. Check OpenAI status (for voice services)
6. Review recent support_conversations for patterns
7. If unresolvable in 15 min, escalate to engineering lead
```

#### Instrumentation Requirements

| Metric | Available Today? | What's Needed | Effort |
|--------|-----------------|---------------|--------|
| Conversation CRUD | No | Instrument support routes with timing middleware | Small |
| AI resolution rate | No | Query support_conversations status + escalated_to | Small |
| CSAT distribution | No | Query support_conversations csat_score | Small |
| Voice latency | No | Timing wrapper on STT + TTS calls | Small |
| Concurrent conversation count | No | Real-time gauge on active conversations | Small |
| Financial action success rate | No | Query support_actions by status | Small |
| Widget load time | No | Client-side Performance API beacon | Medium |
| Guardrail block rate | Partial | Extend bright_line_incidents query for support context | Small |
| Stripe API latency | No | Timing wrapper on stripe-node calls | Small |

### UI/UX Manager (Taylor) — Admin Chatbot Builder Design Specification

**Status:** accepted
**Confidence:** high

#### Page: `support-admin.html` — Chatbot Builder & Support Settings

**Layout:** Standard Insight 360 page using `app-container` > `sidebar` + `main-content`. Tabbed interface with 5 tabs.

#### Tab Structure

| Tab | Icon | Contents |
|-----|------|----------|
| Chatbots | `message-square` | Widget config list + builder |
| Policies | `file-text` | Escalation, refund, upsell/downsell policy editors |
| Channels | `globe` | Email, Slack, widget channel settings |
| Team | `users` | Human agent assignment + availability |
| Analytics | `bar-chart-3` | Support performance dashboards |

#### Tab 1: Chatbot Builder — Two-Pane Layout

**Left pane (config, 55% width):** Scrollable configuration sections
**Right pane (preview, 45% width):** Sticky live preview with desktop/mobile toggle

**Configuration Sections (collapsible):**

| Section | Key Controls | Pattern |
|---------|-------------|---------|
| 1. Embed Type | 3-card selector (FAB, Inline, Popup) with Lucide icons | New: `.embed-type-selector` card radio group |
| 2. Appearance | Color pickers (primary, button), font dropdown, font size, corner radius (3-level segmented control), shadow toggle, opacity slider | Existing: form inputs, new: `.segmented-control` |
| 3. Bot Persona | Name input (defaults from `org_branding.ai_assistant_name`), avatar upload (defaults from `org_branding.ai_assistant_avatar_url`) | Existing: text input + file upload |
| 4. Content | Welcome message textarea, offline message textarea, pre-chat form field builder (add/remove/reorder with drag handles) | New: `.prechat-field-item` sortable list |
| 5. Welcome Video | Video URL input or file upload, autoplay/skippable/show-once toggles | Existing: form inputs + toggles |
| 6. Interaction Modes | Text (always on), Voice (toggle + voice dropdown + TTS instructions textarea), Avatar (toggle + mode selector + avatar upload) | Existing: toggles + dropdowns |
| 7. Behavior | Proactive trigger rule builder (time-on-page, scroll-depth, exit-intent), sound notification toggle, show-branding toggle (note: Agency can disable), conversation history toggle | New: trigger rule builder (similar to escalation rules editor) |
| 8. Embed Code | Read-only code block with copy button, platform-specific instructions (WordPress, Squarespace, Wix, Webflow, custom) | Existing: code block + copy pattern from context export |

**Live Preview Implementation:**
- Shadow DOM container for CSS isolation
- Renders actual widget HTML with current config values
- Real-time updates on every setting change (debounced 300ms)
- Desktop/mobile toggle adjusts preview container width (375px mobile / 800px desktop)
- Preview shows: FAB button position + size, chat panel with header, sample conversation, pre-chat form

#### Tab 2: Policies

- 3 expandable cards (escalation, refund, upsell/downsell)
- Each card shows step-by-step view of policy from `processes` table
- Edit button opens structured form with step editor (add/remove/reorder steps)
- Uses `ModalService.form()` for step editing — no inline modal HTML

#### Tab 3: Channels

| Channel | Controls |
|---------|----------|
| Email | Inbound address config, enable/disable toggle, SLA settings |
| Slack | OAuth2 connect button, channel selector, enable/disable toggle |
| Widget | Overview cards linking to Tab 1 for editing |

#### Tab 4: Team

- Table of human agents with name, department, topics, availability
- Add/edit via `ModalService.form()`
- Drag-and-drop or dropdown for department/topic assignment

#### Tab 5: Analytics

- Chart cards: conversation volume (line), AI resolution rate (gauge), CSAT distribution (bar), escalation rate (stacked bar), response time by channel (comparison), top intents (ranked list)
- Real-time active conversations counter
- Date range picker in tab header
- Uses existing `.dashboard-card` pattern

#### New CSS Components Required

| Component | Class | Purpose |
|-----------|-------|---------|
| Segmented Control | `.segmented-control` | 3-option toggle (corner radius, embed type quick switch) |
| Embed Type Card Selector | `.embed-type-selector` | Radio-card group with icon + label + description |
| Pre-chat Field Item | `.prechat-field-item` | Sortable field row with drag handle, type selector, remove button |

All new components use existing CSS variables (`--primary`, `--bg-secondary`, `--border`, `--radius-md`, spacing variables). No new design tokens needed.

#### Interaction Patterns

| Action | Pattern |
|--------|---------|
| Create new chatbot | `btn-primary` in list view → navigates to builder view within tab |
| Save config | `btn-primary` "Save" → API call → `showToast('Configuration saved', 'success')` |
| Delete config | `btn-danger` → `ModalService.confirm()` → API call → `showToast()` |
| Activate/deactivate | Toggle switch → `ModalService.confirm()` if deactivating |
| Copy embed code | Click copy button → clipboard API → `showToast('Copied to clipboard', 'success')` |
| Upload avatar/video | File input → preview thumbnail → upload on save |

#### Responsive Behavior

- **>= 1280px:** Two-pane builder (config + preview side by side)
- **1024-1279px:** Preview collapses to toggle-able overlay panel
- **< 1024px:** Not a primary target (enterprise admin). Builder stacks vertically, preview moves to top as collapsible section

#### Accessibility

- All form inputs have `<label>` elements
- Color pickers have text input fallback for hex values
- Tab navigation: arrow keys switch tabs, Enter/Space activates
- Drag-and-drop fields have keyboard alternative (up/down buttons)
- Preview panel has `aria-live="polite"` for screen reader updates
- Segmented controls use `role="radiogroup"` with `role="radio"` children
- Focus trapped within active tab panel

#### Follows Existing Patterns From

| Pattern Source | What's Reused |
|---------------|---------------|
| `admin-org-customization.html` | Two-pane layout, color pickers, branding settings |
| `soul-wizard.html` | Multi-section collapsible form, step-by-step builder |
| `admin-platform.html` | Tab navigation, card-based lists |
| `processes.html` | Step editor with add/remove/reorder |
| Context export (chat.js) | Code block with copy button |

### Pricing Strategist — Competitive Pricing & Tier Differentiation

**Status:** accepted
**Confidence:** high

#### Competitive Landscape

| Competitor | Model | Price Range |
|-----------|-------|-------------|
| Intercom Fin | $0.99/resolution | $0.99/resolution + $29-132/seat/mo platform |
| Tidio Lyro | Conversation bundles | $24-749/mo; ~$0.50-1.00/convo |
| ChatBot.com | Seat + resolution limits | $19-79/user/mo; $0.99 overage |
| Gorgias | Ticket volume + AI | $10-750/mo; $0.90/AI interaction |
| Voiceflow | Credit-based | $60-1,000/mo |
| Tavus | Minutes-based (avatar) | $59-397/mo; $0.32-0.37/min overage |
| Ada | Enterprise custom | ~$2,000-10,000+/mo |

#### Pricing Decision: Flat monthly add-on with conversation caps

**Why not per-resolution ($0.99 like Intercom)?** Soul-config-driven responses handle nuanced conversations that don't fit binary "resolved" states. Resolution tracking adds engineering complexity without revenue benefit at our scale.

**Why not pure usage-based?** SMB customers prefer predictable flat pricing. Usage anxiety increases churn.

#### Final Pricing (all tiers maintain >= 65% margin)

| Tier | Add-on | Conv/Mo | Chatbots | Channels | Margin |
|------|--------|---------|----------|----------|--------|
| Starter | $49/mo | 500 | 1 | Widget only | 89.8% |
| Business | $99/mo | 2,000 | 3 | Widget + Email + Slack | 84.8% |
| Enterprise | $199/mo | 10,000 | 10 | All + Voice included | 72.4% |
| Agency | $399/mo | 25,000 pooled | Unlimited | All + Voice + White-label | 68.7% |

#### Voice & Avatar Add-on Pricing

| Add-on | Price | Margin | Availability |
|--------|-------|--------|-------------|
| Voice (STT + TTS) | +$29/mo | 82.8% | Starter+Business (included Enterprise+Agency) |
| Static Avatar (v1) | +$49/mo | ~85% | Business+ |
| Animated Avatar (v1.5) | +$99/mo | ~80% | Business+ |
| Streaming Avatar (v2) | +$299/mo | 67.4% | Enterprise+ |

#### Cost Basis

- Haiku 4.5: ~$0.011/conversation (4 turns avg)
- Voice: ~$0.021/min (STT $0.006 + TTS $0.015)
- Streaming Avatar: ~$0.37/min (HeyGen/Tavus)
- Annual discount: 16.7% (2 months free equivalent)

#### Key Differentiators vs. Competition

1. **Soul config brand voice** — no competitor offers values-based AI personality
2. **Policy-driven actions** — refund/tier change execution with governance, not just chatting
3. **Multi-mode interaction** — text + voice + avatar in single widget
4. **Platform integration** — docs KB, Align 120 context, guardrail enforcement built-in

---

## Cross-Agent Findings

| Finding | Identified By | Corroborated By | Severity | Resolution |
|---------|--------------|-----------------|----------|------------|
| Prompt injection → unauthorized financial actions | Security (SEC-01) | QA (DT tests) | High | Tool-level confirmation + rate limits + hard caps |
| Public endpoints need rate limiting | Security (SEC-02) | QA (DT-01, DT-07) | High | IP-based rate limiting + CAPTCHA |
| Slack bot token must be encrypted | Security (SEC-05) | Compliance (CMP-07) | High | Application-level encryption |
| AI disclosure required | Compliance (CMP-01) | Unique | High | Widget banner before first message |
| Voice recording consent required | Compliance (CMP-02) | Unique | High | Consent prompt before mic activation |
| All new tables need RLS | Security | Compliance | High | Add org_id RLS policies in migration |
| Voice service failure needs graceful fallback | QA (destructive) | Metrics (runbook) | Medium | Auto-fallback to text mode |
| Resolution rate is the north star | Metrics | Unique | Info | Instrument from day 1 |
| Financial actions restricted to Enterprise+ | Pricing | Security (liability), Compliance | High | Starter/Business cannot process refunds or tier changes |
| Conversation volume caps need enforcement middleware | Pricing | QA (test cases needed) | Medium | `check_org_limits` pattern from Phase 44 extended for support |
| Agency tier margin at 68.7% (borderline) | Pricing | Unique | Info | Monitor actual usage; if median exceeds estimate, adjust pricing |

---

## Risk Summary

| Category | Status | Blocking? | Details |
|----------|--------|-----------|---------|
| Security | FIX REQUIRED | Yes | 4 High findings (SEC-01, 02, 05, 06) must be resolved pre-launch |
| Compliance | CONDITIONAL | Yes | 6 conditions must be met (AI disclosure, voice consent, PII consent, retention policy, deletion API, token encryption) |
| FMEA | **COMPLETE — 42 BLOCKERS** | Yes | 77 failure modes identified; 42 with RPN > 200 require mitigation before launch |
| Testing | PLAN READY | No | 162 test cases defined, 0 executed |
| Documentation | PENDING | No | User guide, help registry, ALLOWED_DOCS needed post-implementation |
| UI/UX Compliance | DESIGN SPEC COMPLETE | No | Admin builder UX designed; compliance audit after implementation |
| Access Control | PLAN READY | No | RLS + public endpoint security must be verified |

---

## Open Items

| # | Item | Owner | Deadline | Blocking? |
|---|------|-------|----------|-----------|
| 1 | Email provider decision (SendGrid recommended) | Human PM | Before Phase 4 | No (Phase 4 only) |
| 2 | Stripe account setup with tier product/price IDs | Human PM | Before Phase 3 | Yes (Phase 3) |
| 3 | Data retention policy — legal review of 90-day assumption | Human PM / Legal | Before launch | Yes |
| 4 | Human agent interface decision — dedicated page vs. existing tool | Human PM | Before Phase 2a | No |
| 5 | Slack app registration in Slack API dashboard | Engineering | Before Phase 4 | No (Phase 4 only) |
| 6 | DPA agreements with Anthropic, Stripe, SendGrid, Slack | Legal | Before launch | Yes (compliance) |
| 7 | Avatar provider evaluation (HeyGen vs. Tavus) for v2 | Human PM | Before Phase 5 | No (future) |
| 8 | Welcome video content creation | Marketing | Before Phase 2a | No (feature works without video) |
| 9 | Create Stripe Price IDs for support_ai add-on at each tier ($49/$99/$199/$399) | Engineering / Stripe | Before Phase 3 | Yes (module purchase flow) |
| 10 | Implement conversation volume cap enforcement (`check_org_limits` extension) | Engineering | Phase 1 | Yes (pricing enforcement) |
| 11 | Build module purchase flow (Stripe checkout → `org_module_access` upsert) | Engineering | Before launch | Yes (how orgs buy the module) |

---

## FMEA Report (WF-07)

**Date:** 2026-03-13
**Scope:** Synergi Customer Support Agent System — all subsystems
**Components Inventoried:** 81 (24 routes, 18 services, 11 tables, 7 APIs, 13 UI, 8 middleware)

### Failure Mode Summary

| Category | Agent | Failure Modes | RPN > 400 | RPN 200-400 | RPN < 200 |
|----------|-------|--------------|-----------|-------------|-----------|
| Threat-Based | Alex | 25 | 0 | 8 | 17 |
| Functional | Morgan | 32 | 0 | 14 | 18 |
| Observability | Quinn | 20 | 8 | 12 | 0 |
| **Total** | | **77** | **8** | **34** | **35** |

### Critical Failure Modes (RPN > 400) — IMMEDIATE ACTION REQUIRED

| FM-ID | RPN | Component | Failure Mode | Root Cause |
|-------|-----|-----------|-------------|------------|
| FM-O013 | 640 | LLM Cost Tracking | Token spend exceeds budget with zero alerting | `recordLLMRequest()` defined in metrics.js but never called from anthropic.js/openai.js |
| FM-O001 | 630 | AI Quality | AI hallucinating product features, refund eligibility, policy details | No semantic validation layer; responses trusted if HTTP 200 |
| FM-O020 | 480 | RLS / Data Layer | RLS silently returns empty results instead of errors; cannot distinguish "no data" from "access denied" | Supabase RLS returns `[]` on policy denial, not an error |
| FM-O004 | 450 | AI Tool Use | Tool_use calls with correct tool name but wrong parameters (wrong customer ID, wrong amount) | Tool success = API 200, not parameter correctness |
| FM-O003 | 441 | Context Window | Context filling up, AI loses early conversation history | contextInjection.js doesn't emit metrics on truncation |
| FM-O012 | 441 | Conversation Quality | Customers abandoning silently; no resolution tracking | No conversation outcome classification or timeout detection |
| FM-O011 | 420 | CSAT | CSAT scores declining with no alert | No CSAT metric in metrics.js; no threshold alerting |
| FM-O005 | 405 | Guardrails | Novel prompt injection bypassing regex patterns | Static regex only; no ML fallback or near-miss anomaly logging |

### High-Priority Failure Modes (RPN 200-400)

#### Threat-Based (Alex)

| FM-ID | RPN | Failure Mode | Mitigation |
|-------|-----|-------------|------------|
| FM-T001 | 378 | Prompt injection → unauthorized refunds/tier changes | Human-in-loop for financial actions > threshold; tool-level confirmation; rate limit 1 financial action/conversation |
| FM-T025 | 360 | Successful attack leaves no audit trail | Outbound content inspection on all tool calls; anomaly detection on tool patterns |
| FM-T002 | 360 | Indirect injection via KB/context data | Screen injected context, not just user messages; content hash verification |
| FM-T014 | 288 | Social engineering for fraudulent refunds | Mandatory order verification before refund; refund cap per conversation; human approval > $50 |
| FM-T011 | 280 | AI social-engineered into data disclosure | Scope tool responses to conversation org only; redact cross-customer data from tool results |
| FM-T008 | 216 | Session hijack via XSS/cookie theft | SameSite=Strict for admin cookies; widget uses ephemeral tokens, not cookies |
| FM-T022 | 216 | Data exfiltration via tool output channels | Outbound content inspection; PII detection on tool call parameters |
| FM-T007 | 210 | Cross-tenant RLS bypass | Automated cross-tenant test suite; service-role queries always include org_id |

#### Functional (Morgan)

| FM-ID | RPN | Failure Mode | Mitigation |
|-------|-----|-------------|------------|
| FM-F022 | 360 | Widget blocked by customer site CSP | CSP requirements doc for customers; health-check ping on widget init; fallback contact |
| FM-F010 | 315 | Pending actions hang forever (no TTL) | 24h TTL on pending actions; auto-escalate stale actions; dashboard alert |
| FM-F003 | 294 | Message race condition corrupts turn order | Per-conversation mutex; sequence numbers on messages; reject out-of-order |
| FM-F023 | 280 | Fake emails in pre-chat form | Disposable email blocklist; email verification for escalation-eligible conversations |
| FM-F025 | 256 | Escalation routes to nonexistent agents | Validate agent availability before routing; fallback to org admin; alert on empty queue |
| FM-F001 | 252 | SSE stream drops mid-response | SSE reconnection with message replay from last sequence ID |
| FM-F014 | 252 | STT returns bad transcription | Confidence score threshold; auto-fallback to text with "I didn't catch that" prompt |
| FM-F027 | 252 | CSAT survey missed (widget closed) | Delay CSAT to follow-up email if widget closed; track CSAT response rate |
| FM-F004 | 240 | Cross-channel duplicate conversations | Customer identity resolution by email; merge conversations on match |
| FM-F018 | 240 | Email thread matching fails | Fallback to subject + sender matching when headers stripped; fuzzy thread match |
| FM-F019 | 224 | Outbound email silently fails | Bounce/delivery webhook from SendGrid; retry queue; alert on delivery rate drop |
| FM-F006 | 224 | Abandon timeout races with new message | Optimistic lock on conversation status; message receipt cancels pending timeout |
| FM-F007 | 216 | Stripe succeeds but DB write fails | Wrap in transaction-like pattern: write pending action → execute Stripe → update to executed; reconciliation job |
| FM-F026 | 210 | Escalation handoff truncates context | Summarize full conversation via LLM before handoff; include summary + last 10 messages |

#### Observability (Quinn)

| FM-ID | RPN | Failure Mode | Mitigation |
|-------|-----|-------------|------------|
| FM-O007 | 360 | Refund processed for wrong amount | Post-action reconciliation job comparing support_actions vs Stripe; amount validation before execution |
| FM-O008 | 320 | Duplicate refund via race condition | Idempotency key on (customer_id, issue_ref, action_type); unique constraint in DB |
| FM-O014 | 320 | Memory leak in long-running SSE connections | SSE connection lifecycle tracking; max connection duration (30 min); heap trending alert |
| FM-O017 | 315 | Shared rate limiter blocking cross-org | Per-org rate limiting with org_id tag; per-org traffic metrics |
| FM-O009 | 300 | Stripe succeeds but DB write fails (orphaned action) | Stripe-to-DB reconciliation job (hourly); pending action timeout alert |
| FM-O016 | 300 | Cross-tenant data leak in analytics queries | Automated cross-tenant assertion tests; analytics queries MUST use RLS-scoped views, never service_role |
| FM-O015 | 288 | DB connection pool exhaustion | Connection pool metrics (active, idle, waiting); alert at 80% capacity |
| FM-O018 | 280 | Email going to spam (reputation decline) | SendGrid delivery/bounce/spam metrics; alert on reputation score drop |
| FM-O002 | 270 | AI tone drifting from brand voice | Periodic voice conformance sampling (random conversation audit); tone scoring metric |
| FM-O019 | 270 | Slack bot token expiring silently | Periodic liveness ping on all integrations; connection health dashboard |
| FM-O006 | 240 | Guardrail false positives blocking legit messages | False-positive rate metric; "disputed block" review queue |
| FM-O010 | 216 | Tier change webhook confirmation never arrives | Pending webhook timeout (5 min); alert on unconfirmed actions; reconciliation with Stripe state |

### Mitigation Priority Matrix

**Phase 1 (Core Foundation) — Must implement before any external deployment:**

| Priority | FM-IDs | Mitigation | Effort |
|----------|--------|-----------|--------|
| P0 | FM-O013 | Wire `recordLLMRequest()` to actual LLM service calls; add spend alerting | Small |
| P0 | FM-T001, FM-T014 | Human approval for financial actions > threshold; per-conversation rate limit | Medium |
| P0 | FM-O009, FM-F007 | Transaction-like pattern for Stripe+DB writes; reconciliation job | Medium |
| P0 | FM-O008 | Idempotency key + unique constraint on support_actions | Small |
| P0 | FM-O020 | RLS-aware query wrapper that detects suspicious empty results | Medium |
| P1 | FM-O005, FM-T002 | Screen injected context (not just user messages); add anomaly logging | Large |
| P1 | FM-F003 | Per-conversation mutex + sequence numbers on messages | Medium |
| P1 | FM-F010 | TTL on pending actions + stale sweep job | Small |
| P1 | FM-O016, FM-T007 | Automated cross-tenant assertion test suite | Medium |
| P1 | FM-O001 | Sampling-based factual accuracy checks against KB | Large |

**Phase 2a (Widget) — Before widget goes external:**

| Priority | FM-IDs | Mitigation | Effort |
|----------|--------|-----------|--------|
| P0 | FM-F022 | CSP requirements doc + widget health-check ping + fallback | Medium |
| P0 | FM-F001 | SSE reconnection with message replay | Medium |
| P1 | FM-F023 | Disposable email blocklist for pre-chat | Small |
| P1 | FM-F027 | CSAT via follow-up email as fallback | Small |
| P1 | FM-O003 | Emit context truncation metric; alert when conversation nears limit | Small |

**Phase 3 (Stripe) — Before financial actions go live:**

| Priority | FM-IDs | Mitigation | Effort |
|----------|--------|-----------|--------|
| P0 | FM-O007 | Post-action amount validation + reconciliation job | Medium |
| P0 | FM-O004 | Parameter validation layer between AI tool call and execution | Medium |
| P1 | FM-T025, FM-T022 | Outbound content inspection on all tool calls | Large |

**Phase 4 (Email + Slack) — Before channels go live:**

| Priority | FM-IDs | Mitigation | Effort |
|----------|--------|-----------|--------|
| P1 | FM-F018, FM-F004 | Customer identity resolution + fuzzy thread matching | Medium |
| P1 | FM-F019, FM-O018 | Email delivery metrics + retry queue | Medium |
| P1 | FM-O019, FM-F021 | Integration liveness pings + health dashboard | Small |

### Residual Risk Summary

| Risk Level | Count | Mitigated (with plan) | Unmitigated |
|-----------|-------|-----------|-------------|
| Critical (RPN > 400) | 8 | 8 | 0 |
| High (RPN 200-400) | 34 | 34 | 0 |
| Medium (RPN 100-199) | 20 | Accepted | N/A |
| Low (RPN < 100) | 15 | Accepted | N/A |

**All 42 failure modes with RPN > 200 have mitigation plans assigned to specific implementation phases.**

**Launch Readiness Condition:** No Phase may ship until its P0 mitigations are implemented and verified. P1 mitigations must be implemented within one sprint of the Phase launch.

---

## Follow-Up Actions

| # | Action | Owner | Deadline | Depends On |
|---|--------|-------|----------|-----------|
| 1 | ~~Run FMEA (WF-07)~~ **COMPLETE** | Avery | ~~Before launch readiness~~ Done | PRD finalized |
| 2 | Implement Phase 1 (core foundation) + P0 mitigations | Engineering | TBD | PRD approval |
| 3 | Implement security mitigations (SEC-01, 02, 05, 06) | Engineering | During Phase 1 | Security review accepted |
| 4 | Implement compliance conditions (CMP-01-07) | Engineering | During Phase 2a | Compliance review accepted |
| 5 | Wire LLM cost metrics (FM-O013 — RPN 640, highest risk) | Engineering | Phase 1, Sprint 1 | FMEA accepted |
| 6 | Implement financial action safeguards (FM-T001, FM-O008, FM-O009) | Engineering | Before Phase 3 | FMEA accepted |
| 7 | Build automated cross-tenant test suite (FM-O016, FM-T007) | Engineering | Phase 1 | FMEA accepted |
| 8 | Create support user guide | Docs (Parker) | After Phase 2a | Implementation complete |
| 9 | UI/UX compliance audit | Taylor | After Phase 2a | Implementation complete |
| 10 | Execute test plan (162 cases) | QA | After each phase | Implementation complete |
| 11 | Configure observability instrumentation (all FM-O items) | Engineering | During Phase 1 | Metrics framework + FMEA accepted |
| 12 | Pricing analysis integration | Avery | Before launch | Pricing strategist report |

---

## Audit Log

```yaml
audit_log:
  workflow: WF-01
  feature: Synergi Customer Support Agent System
  initiated_by: human PM
  timestamp_start: "2026-03-13T00:00:00Z"
  timestamp_end: "2026-03-13T23:59:59Z"

  delegations:
    - agent: spec-writer (Reese)
      task_type: prd_draft
      timestamp: "2026-03-13T10:00:00Z"
      status: accepted
      retries: 0
      findings_count: 0
      critical_findings: 0
      notes: "PRD v1.0 produced. Updated to v2.0 with widget refinements (Pickaxe research, voice mode, avatar mode, rich media)."

    - agent: security-analyst (Alex)
      task_type: threat_model
      timestamp: "2026-03-13T11:00:00Z"
      status: accepted
      retries: 0
      findings_count: 10
      critical_findings: 0
      notes: "4 High findings identified. No Critical. All High findings have specific mitigations. Recommend fix before ship."

    - agent: compliance-auditor (Riley)
      task_type: data_governance
      timestamp: "2026-03-13T11:00:00Z"
      status: accepted
      retries: 0
      findings_count: 9
      critical_findings: 0
      notes: "Conditional approval. 6 conditions must be met before launch. No regulatory violations found — all findings are preventive."

    - agent: qa-analyst (Morgan)
      task_type: test_plan
      timestamp: "2026-03-13T11:00:00Z"
      status: accepted
      retries: 0
      findings_count: 162
      critical_findings: 0
      notes: "162 test cases across 17 categories. Critical path coverage complete. Destructive tests planned."

    - agent: metrics-analyst (Quinn)
      task_type: metric_design
      timestamp: "2026-03-13T11:00:00Z"
      status: accepted
      retries: 0
      findings_count: 0
      critical_findings: 0
      notes: "North star defined (AI resolution rate, target 70%). 7 SLOs defined. Observability runbook produced. Alert thresholds set."

    - agent: uiux-manager (Taylor)
      task_type: admin_ux_design
      timestamp: "2026-03-13T16:30:00Z"
      status: accepted
      retries: 0
      findings_count: 0
      critical_findings: 0
      notes: "Admin chatbot builder design spec for support-admin.html — 5-tab layout, two-pane builder, 3 new CSS components, Shadow DOM live preview"

    - agent: pricing-strategist
      task_type: competitive_pricing
      timestamp: "2026-03-13T17:00:00Z"
      status: accepted
      retries: 0
      findings_count: 0
      critical_findings: 0
      notes: "Competitive analysis across 10 competitors. Flat add-on pricing: $49/$99/$199/$399. All tiers >= 65% margin. Voice/avatar add-ons priced separately. SQL migration produced."

    - agent: spec-writer (Reese)
      task_type: component_inventory
      timestamp: "2026-03-13T17:30:00Z"
      status: accepted
      retries: 0
      findings_count: 81
      critical_findings: 0
      notes: "FMEA component inventory — 81 components across 6 types (24 routes, 18 services, 11 tables, 7 APIs, 13 UI, 8 middleware)"

    - agent: security-analyst (Alex)
      task_type: fmea_threat_modes
      timestamp: "2026-03-13T17:30:00Z"
      status: accepted
      retries: 0
      findings_count: 25
      critical_findings: 4
      notes: "25 threat-based failure modes. 4 Critical (RPN 300+): prompt injection→financial (378), stealthy attack no audit trail (360), indirect injection via context (360), social engineering refund fraud (288)"

    - agent: qa-analyst (Morgan)
      task_type: fmea_functional_modes
      timestamp: "2026-03-13T17:30:00Z"
      status: accepted
      retries: 0
      findings_count: 32
      critical_findings: 3
      notes: "32 functional failure modes. Top 3: widget CSP blocking (360), pending actions no TTL (315), message race condition (294)"

    - agent: metrics-analyst (Quinn)
      task_type: fmea_observability_modes
      timestamp: "2026-03-13T17:30:00Z"
      status: accepted
      retries: 0
      findings_count: 20
      critical_findings: 8
      notes: "20 observability failure modes. 8 Critical (RPN 400+). Highest: LLM cost metric never wired (640), AI hallucination undetectable (630), RLS silent empty results (480). Key structural gap: metrics.js functions defined but never called from LLM services."

  decisions:
    - decision: "Use Claude Haiku 4.5 as sole LLM for support agent"
      rationale: "Cost efficiency at scale (500 concurrent), sufficient capability for support tasks, tool_use support"
      alternatives_considered: ["Claude Sonnet (higher quality, 10x cost)", "GPT-4o Mini (comparable cost, no soul config integration)"]
      timestamp: "2026-03-13T10:00:00Z"
      escalated: false

    - decision: "Support 3 embed types (FAB, Inline, Popup) based on Pickaxe research"
      rationale: "Covers all common embedding patterns. FAB is primary. Inline and Popup serve specific use cases."
      alternatives_considered: ["FAB only", "5 types matching Pickaxe (unnecessary complexity for v1)"]
      timestamp: "2026-03-13T12:00:00Z"
      escalated: false

    - decision: "Phase voice and avatar delivery (v1: audio, v1.5: client-side avatar, v2: streaming)"
      rationale: "Leverages existing voice.js infrastructure for quick win. Client-side avatar avoids external API dependency. Streaming avatar is premium."
      alternatives_considered: ["Skip voice for v1", "Launch with streaming avatar immediately (high cost, external dependency)"]
      timestamp: "2026-03-13T13:00:00Z"
      escalated: false

    - decision: "Use existing voice.js for STT/TTS with soul config voice instructions"
      rationale: "voice.js already supports GPT-4o Transcribe (STT) and GPT-4o Mini TTS (steerable). No new infrastructure needed."
      alternatives_considered: ["ElevenLabs (higher quality voice, additional dependency)", "Whisper-only (budget STT, no steerable TTS)"]
      timestamp: "2026-03-13T13:00:00Z"
      escalated: false

  escalations: []

  quality_gates:
    - gate: "PRD completeness (all 13 sections)"
      status: pass
      notes: "All sections populated with specifics, updated to v2.0 with voice/avatar/rich media"
    - gate: "Security review complete"
      status: pass
      notes: "STRIDE analysis complete. 4 High findings with mitigations. No Critical."
    - gate: "Compliance review complete"
      status: pass
      notes: "Conditional approval. 6 conditions documented."
    - gate: "Test plan complete"
      status: pass
      notes: "162 test cases across 17 categories"
    - gate: "Metrics framework complete"
      status: pass
      notes: "North star, SLOs, runbook, alerts defined"

  outcome:
    status: completed
    deliverables:
      - "PRD v2.0 with full functional requirements"
      - "Security threat model (STRIDE) with 10 findings"
      - "Compliance review with 9 findings and 6 launch conditions"
      - "Test plan with 162 test cases"
      - "Measurement framework with SLOs and observability runbook"
      - "3 seed policy definitions (escalation, refund, upsell/downsell)"
      - "Widget design spec (3 embed types, rich media, voice, avatar)"
    open_items:
      - "Email provider decision"
      - "Stripe account setup"
      - "Data retention legal review"
      - "DPA agreements"
      - "FMEA (WF-07) pending"
    follow_ups:
      - "Run FMEA before launch readiness"
      - "Post-implementation: UI/UX audit, docs sync, test execution"

  security_summary:
    overall_risk: HIGH
    findings: {critical: 0, high: 4, medium: 5, low: 1, info: 0}
    blocking: true

  compliance_summary:
    status: conditional
    violations: 0
    blocking: true

  fmea_summary:
    total_failure_modes: 77
    threat_based: 25
    functional: 32
    observability: 20
    critical_rpn_over_400: 8
    high_rpn_200_400: 34
    medium_rpn_100_199: 20
    low_rpn_under_100: 15
    unmitigated_critical: 0
    all_mitigations_planned: true
    highest_rpn: "FM-O013 (640) — LLM cost metric never wired"
    blocking: false  # All 42 blockers have mitigation plans assigned to phases

  uiux_summary:
    pages_reviewed: 0
    compliance_percentage: pending_post_implementation
    fixes_applied: 0
    critical_violations: 0
    design_spec_produced: true
    design_spec_status: accepted
    new_components: ["segmented-control", "embed-type-selector", "prechat-field-item"]
    verdict: DESIGN_COMPLETE_AUDIT_PENDING
    blocking: false

  documentation_summary:
    chain_complete: false
    guides_created: 0
    guides_updated: 0
    drift_found: 0
    drift_resolved: 0
    blocking_drift: 0
    blocking: false
```
