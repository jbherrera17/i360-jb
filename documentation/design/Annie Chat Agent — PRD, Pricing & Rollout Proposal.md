# Annie Chat Agent — PRD, Pricing & Rollout Proposal

**Prepared by:** Avery (PM Orchestrator)
**Client:** Dr. Jon Mendelsohn — Advanced Cosmetic Surgery & Laser Center
**Date:** 2026-03-13
**Status:** DRAFT — Awaiting Human PM Approval
**Source:** Fathom recap from Impromptu Zoom Meeting (March 13, 2026)

---

## Executive Summary

Dr. Jon Mendelsohn wants to transform Annie from a homepage-only chatbot into an embedded, page-level AI assistant across his surgical practice website. The current Annie system runs outside of Insight 360 on a standalone platform priced at $175/month.

**This proposal recommends bringing Annie into i360 as a new "Embeddable Chat Widget" module.** This approach eliminates the need to maintain a separate system, gives Jon access to i360's full agent infrastructure (context injection, multi-LLM orchestration, soul configuration, analytics), and creates a scalable product we can offer to other clients.

**Recommendation:** Build the embeddable widget as a platform module, deploy Annie as the first client instance, and price it as a Business+ included feature with a Starter add-on option at $49/month. Jon's specific deployment (iframe on surgical pages) becomes the reference implementation.

---

## Part 1: Product Requirements Document (PRD)

### 1.1 Problem Statement

Annie is currently accessible only via a homepage banner on Dr. Mendelsohn's website. This is ineffective because:

1. **Most visitors never see her.** Users land directly on procedure pages from YouTube, Google, or social media — they bypass the homepage entirely.
2. **A competitor chatbot (Dear Doc) has ~70% new-patient engagement.** This proves visitors will interact with a persistent, contextual chat widget — Annie just isn't where they are.
3. **The standalone Annie system is isolated.** It runs outside i360, has no access to the platform's context injection, analytics, or agent management capabilities.
4. **Content is manually managed.** Annie's knowledge comes from a Google Spreadsheet with 5 procedures and associated video links. There's no version control, no audit trail, and no way to scale.

### 1.2 Solution Overview

Build an **Embeddable Chat Widget** module for i360 that allows any agent to be deployed as a public-facing chat interface on external websites via iframe.

**For Jon specifically:**
- Annie becomes an i360 agent with a soul configuration, context assets, and execution logging
- She is embedded directly on surgical procedure pages, replacing static content (before/after sliders)
- Her knowledge base is fed by Google Sheets data (procedures + video links) via context injection
- A branded AI avatar (HeyGen or similar) represents her visually

### 1.3 User Personas

| Persona | Description | Goals |
|---------|-------------|-------|
| **Website Visitor** | Prospective patient browsing surgical procedure pages | Get answers about procedures, see relevant videos, feel confident about the practice |
| **Dr. Mendelsohn (Client)** | Practice owner, potential CMO of PE-acquired entity | Increase patient engagement, replace static content with interactive AI, maintain brand control |
| **Kevin (Web Developer)** | Jon's web developer handling site integration | Simple iframe embed, minimal custom code, reliable uptime |
| **JB (Platform Admin)** | Insight 360 operator configuring Annie | Configure agent, map context assets, generate widget embed code, monitor usage |

### 1.4 Requirements

#### 1.4.1 Functional Requirements

**FR-01: Public Chat Endpoint**
- New route: `POST /api/chat/public/:widget_id/stream`
- No Supabase auth required for website visitors
- Stateless widget token validation (HMAC-signed)
- SSE streaming response (reuses existing chat streaming infrastructure)
- Rate limiting per widget ID + visitor IP

**FR-02: Widget Configuration & Management**
- New database table: `chat_widgets`
  - `id`, `org_id`, `agent_id`, `widget_token`, `widget_name`
  - `cors_origins[]` — allowed embedding domains
  - `branding` (JSONB) — colors, logo, avatar image, welcome message
  - `limits` — max messages per session, max sessions per day
  - `is_active`, `created_at`, `updated_at`
- Admin UI page for creating/managing widgets
- Generate embed code snippets (iframe + script tag options)

**FR-03: Embeddable Frontend Widget**
- `public/js/chat-widget.js` — lightweight loader script
- Creates iframe container on the host page
- Establishes postMessage communication channel
- Renders branded chat UI (configurable colors, avatar, welcome message)
- Handles SSE stream from public endpoint
- Mobile-responsive
- Minimal footprint (< 50KB gzipped)

**FR-04: Google Sheets Data Connector**
- New service: `server/services/integrations/providers/google/sheets.js`
- Methods: `getSheet()`, `getSheetMetadata()`, `formatForContext()`
- Converts spreadsheet data to structured context for injection
- Called by `contextInjection.js` during agent execution
- Supports scheduled refresh (cache sheet data, refresh every N hours)
- **Note:** Google Sheets scope (`spreadsheets.readonly`) is already defined in the OAuth provider — implementation is needed

**FR-05: Video Recommendation Engine**
- Context injection maps procedure questions to relevant Vimeo video links
- Videos are embedded in chat responses as clickable cards (thumbnail + title + link)
- Video metadata stored in context assets or fetched from Google Sheets
- Vimeo embed URLs used (not YouTube — per Jon's requirement to avoid ads/privacy warnings)

**FR-06: Session Management**
- New table: `widget_sessions`
  - `id`, `widget_id`, `session_token`, `visitor_fingerprint`
  - `messages_count`, `created_at`, `expires_at`
- Sessions expire after 30 minutes of inactivity
- Conversation history maintained within session for context continuity
- No PII collected from visitors (anonymous by default)

**FR-07: Analytics & Usage Tracking**
- Track per-widget: sessions, messages, avg. session duration, top questions
- Extend `agent_executions` table with `widget_id` field
- Dashboard view for widget performance metrics
- Export capability for client reporting

**FR-08: Avatar Integration**
- Support for static avatar image (immediate — use existing HeyGen screenshot)
- Support for animated avatar placeholder (GIF/short video loop)
- Future: HeyGen API integration for dynamic video responses (Phase 2)
- Avatar displayed in chat header and alongside responses

**FR-09: Calendly Scheduling Integration**
- Annie must be able to offer appointment booking when a visitor is ready to schedule a consultation
- **Integration approach — Calendly Embed (confirmed):**
  - Jon already has Calendly Professional and uses Calendly embed in the current standalone Annie system
  - Reuse the existing embed pattern: Annie presents an inline Calendly scheduling widget within the chat when a visitor is ready to book
  - Popup widget option for mobile viewports
  - Proven approach — no need to change what already works
- **Implementation details:**
  - Calendly embed URLs configured per procedure (e.g., `calendly.com/dr-mendelsohn/facelift-consultation`)
  - Annie's system prompt includes: "When a visitor expresses interest in scheduling, present the Calendly booking embed for the appropriate procedure consultation"
  - Event types mapped to procedures (e.g., "Facelift Consultation" → specific Calendly embed URL)
  - Booking confirmation handled natively by Calendly (email to both visitor and practice)
  - Embed URLs stored in widget config or context asset for easy updates
- **Future enhancement (separate discussion with Jon):**
  - Calendly MCP Server integration for programmatic scheduling (check availability, generate one-time links, no embed needed)
  - Would enable Annie to conversationally negotiate appointment times
  - Requires Calendly API access (included in Professional plan)
- **No additional cost:** Jon already has Calendly Professional

**FR-10: Conversation Review & Export Dashboard**
- Jon (and any org admin) must be able to review all widget conversations from within i360
- **Leverages Phase 71 infrastructure:** The `support_conversations` and `support_messages` tables already provide the data model (org-scoped, RLS-protected, with status tracking, sentiment, message sequences)
- **Review UI features:**
  - Conversation list view with filters: date range, status, sentiment, procedure topic
  - Full conversation transcript view (user messages + Annie responses, chronological)
  - Sentiment indicator per conversation (positive/neutral/negative/frustrated)
  - Search across all conversations (keyword search in message content)
  - Star/flag conversations for follow-up
  - Add internal notes to conversations (not visible to visitors)
- **Export functionality:**
  - Export filtered conversations as CSV (date, visitor name, messages, sentiment, topic)
  - Export as JSON (full structured data for programmatic use)
  - Export as formatted PDF (for sharing with team/partners)
  - Bulk export: all conversations in a date range
  - **"Export to Context Asset" button** — one-click conversion of conversation insights into a new or updated context asset for Annie's knowledge base. This is the key workflow: Jon reviews chats → identifies gaps in Annie's knowledge → exports relevant Q&A patterns → updates Annie's context assets → Annie gets smarter
- **Knowledge base feedback loop:**
  ```
  Visitor asks question Annie can't answer well
      → Jon reviews conversation in dashboard
      → Jon flags the gap
      → Exports Q&A to context asset (or updates Google Sheet)
      → Annie's context injection picks up new knowledge
      → Next visitor gets a better answer
  ```
- **Phase 71 table mapping:**
  - `support_conversations` → conversation metadata (status, sentiment, CSAT)
  - `support_messages` → full message history (role, content, seq, tool_calls)
  - `widget_configs` → widget branding, allowed domains, pre-chat fields
  - `support_actions` → tracks any actions taken (escalation, etc.)
- **Notification:** Optional email digest to Jon (daily/weekly) summarizing new conversations, sentiment trends, and unanswered questions

#### 1.4.2 Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | Widget load time | < 2 seconds on 3G |
| NFR-02 | First response latency | < 3 seconds (streaming start) |
| NFR-03 | Availability | 99.5% uptime |
| NFR-04 | Concurrent sessions per widget | 50+ |
| NFR-05 | Security | No PII storage, CORS validation, rate limiting |
| NFR-06 | HIPAA consideration | Annie must NOT collect, store, or transmit PHI. Disclaimer required. |

#### 1.4.3 Scope Boundaries

**In Scope:**
- Embeddable chat widget (iframe deployment)
- Google Sheets data connector
- Video link recommendations in responses
- Static avatar display
- Widget management admin UI
- Usage analytics dashboard
- Tier 1 deployment: Surgical procedure pages only
- Calendly scheduling integration (MCP server or embed)
- Conversation review dashboard with search, filters, and sentiment tracking
- Conversation export (CSV, JSON, PDF)
- "Export to Context Asset" workflow for knowledge base updates
- Phase 71 support system as data layer (`support_conversations`, `support_messages`)

**Out of Scope (Phase 2+):**
- Dynamic HeyGen video avatar responses
- Lead capture / form submission beyond pre-chat fields
- Non-surgical procedure pages (Tier 2)
- Multi-language support
- Voice input/output
- General-purpose chatbot mode
- Automated knowledge base updates (AI-suggested context asset changes from conversation patterns)

### 1.5 Annie's Knowledge Architecture

```
┌─────────────────────────────────────────────┐
│              Annie Agent (i360)              │
├─────────────────────────────────────────────┤
│  Soul Config: Voice, values, bright lines   │
│  System Prompt: Annie's personality & scope │
├─────────────────────────────────────────────┤
│  Context Injection (assembled at runtime)   │
│  ├── Google Sheets: 5 Procedures            │
│  │   ├── Procedure descriptions             │
│  │   ├── FAQ per procedure                  │
│  │   ├── Video links (Vimeo)                │
│  │   └── Recovery timelines                 │
│  ├── Brand Assets: Voice, tone, disclaimers │
│  └── Video Transcripts (from Jon, Phase 2)  │
├─────────────────────────────────────────────┤
│  Tool Use (MCP)                             │
│  ├── Calendly: Check availability           │
│  ├── Calendly: Generate scheduling links    │
│  └── Calendly: Confirm bookings             │
├─────────────────────────────────────────────┤
│  Guardrails                                 │
│  ├── DO NOT provide medical diagnoses       │
│  ├── DO NOT collect patient information     │
│  ├── DO NOT discuss pricing/financing       │
│  ├── Always recommend consultation          │
│  └── Stay within surgical procedure scope   │
├─────────────────────────────────────────────┤
│  Conversation Storage (Phase 71)            │
│  ├── support_conversations (metadata)       │
│  ├── support_messages (full transcript)     │
│  └── Review Dashboard → Export → Context    │
│      Asset update (knowledge feedback loop) │
└─────────────────────────────────────────────┘
```

### 1.6 Deployment Architecture

**Tier 1: Surgical Pages (High Priority — This Proposal)**
```
Dr. Mendelsohn's Website
├── /facelift        → Annie iframe (knows facelift content)
├── /blepharoplasty  → Annie iframe (knows eyelid surgery content)
├── /rhinoplasty     → Annie iframe (knows nose surgery content)
├── /necklift        → Annie iframe (knows neck lift content)
└── /browlift        → Annie iframe (knows brow lift content)

Each page loads:
<iframe src="https://i360.app/widget/annie?page=facelift"
        style="width:100%;height:600px;border:none;">
</iframe>
```

**Tier 2: Non-Surgical Pages (Future)**
- Short HeyGen video loops as "mini-ads" for Annie
- Animated GIF banners linking to Annie
- No interactive chatbot initially — brand presence only
- Full chatbot if/when content scope is defined

### 1.7 Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|-------------|
| AC-01 | Widget loads in iframe on external domain | Manual test on staging site |
| AC-02 | Visitor can ask about any of 5 procedures and get accurate response | Test all 5 procedures |
| AC-03 | Responses include relevant Vimeo video links when appropriate | Verify video card rendering |
| AC-04 | Widget respects CORS — only allowed origins can embed | Test from unauthorized domain |
| AC-05 | Rate limiting prevents abuse (> 30 messages/minute blocked) | Load test |
| AC-06 | No PII is stored from visitor interactions | Audit database after test sessions |
| AC-07 | Widget is mobile-responsive | Test on iOS Safari, Android Chrome |
| AC-08 | Admin can create widget, configure branding, generate embed code | Walkthrough admin UI |
| AC-09 | Analytics dashboard shows session count, message volume, top questions | Verify after 50+ test sessions |
| AC-10 | HIPAA disclaimer displayed in widget footer | Visual verification |
| AC-11 | Annie offers Calendly booking link when visitor wants to schedule | Test with "I'd like to schedule a consultation" |
| AC-12 | Calendly link opens correct event type for the procedure page | Test each procedure → event type mapping |
| AC-13 | Practice receives notification when appointment is booked | Verify Calendly webhook fires |
| AC-14 | Jon can view all conversations in review dashboard with filters | Walkthrough with 20+ test conversations |
| AC-15 | Conversation search returns results by keyword | Search for procedure names across conversations |
| AC-16 | Export to CSV produces valid file with all conversation data | Download and verify in Excel |
| AC-17 | "Export to Context Asset" creates/updates context asset from selected conversations | End-to-end test: export → verify asset → verify Annie uses new knowledge |

### 1.8 Downstream Impact Analysis

| System | Impact | Risk |
|--------|--------|------|
| **Chat routes** | New public endpoint alongside authenticated endpoint | Low — isolated route file |
| **Context injection** | Google Sheets connector added | Medium — new external dependency |
| **Agent execution** | Widget sessions logged alongside internal executions | Low — additive field |
| **CORS configuration** | Per-widget CORS origins vs. global ALLOWED_ORIGINS | Medium — must not conflict |
| **Rate limiting** | New rate limit tier for public endpoints | Low — isolated middleware |
| **LLM costs** | Public-facing usage increases API costs | High — needs usage caps |
| **Database** | New tables (chat_widgets, widget_sessions) | Low — additive schema |

### 1.9 Failure Scenarios

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Google Sheets API unavailable | Annie can't access procedure data | Cache last-known-good data; serve from cache |
| LLM API rate limited | Visitors get delayed/no responses | Queue with graceful degradation message |
| Widget token leaked | Unauthorized embedding | Token rotation capability; CORS still blocks unauthorized origins |
| Visitor asks out-of-scope question | Annie provides irrelevant answer | System prompt guardrails + "I specialize in surgical procedures" fallback |
| High traffic spike (viral page) | Widget overwhelmed | Per-widget session caps; queue overflow to "Please call us" message |
| HIPAA violation risk | Patient submits PHI in chat | Disclaimer in widget; system prompt instructs Annie to not engage with PHI; no message persistence for visitors |
| Calendly embed fails to load | Annie can't offer scheduling | Fallback: Annie provides direct Calendly link + phone number and office hours |
| Calendly event type mismatch | Wrong consultation type booked | Map procedure pages to specific Calendly embed URLs; validate in config |
| Conversation export fails | Jon can't extract insights | Retry with smaller date range; offer JSON fallback if CSV/PDF fails |
| Knowledge feedback loop stale | Context assets not updated after export | "Last updated" indicator on context assets; reminder notification if no update in 30 days |

---

## Part 2: Pricing Strategy

### 2.1 Market Context

| Competitor | Pricing | Notes |
|------------|---------|-------|
| Intercom Chat | $49–$99/mo | General purpose, no medical specialization |
| Drift | $50/mo entry | Lead gen focused |
| Dear Doc | ~$300+/mo estimated | Medical-specific, 70% engagement rate |
| Ada Health | Enterprise pricing | AI health assistant |
| Standalone Annie | $175/mo | Current pricing (our own system) |

### 2.2 Recommended Pricing Model

#### Option A: i360 Module Add-On (Recommended)

Annie becomes the **Embeddable Chat Widget** module in i360. This is a platform capability, not a one-off product.

| Tier | Included? | Instances | Messages/mo | Price |
|------|-----------|-----------|-------------|-------|
| **Starter** | Add-on only | 3 | 10,000 | +$49/mo ($490/yr) |
| **Business** | Included | 5 | 25,000 | Included in $99/mo |
| **Enterprise** | Included | 25 | 100,000 | Included in $299/mo |
| **Agency** | Included | Unlimited | Unlimited | Included in $499/mo |

**Overage:** $0.01/message beyond monthly quota (or soft cap with notification)

**Expansion pricing:** Additional instances beyond tier limit at $25/instance/month

#### Option B: Standalone Annie Pricing (If Not Integrating into i360)

Keep Annie as a separate product at **$175/month** with the enhancements from this PRD built as a standalone system.

**Not recommended** — duplicates infrastructure, limits scalability, no leverage from i360's existing capabilities.

#### Option C: Hybrid — Jon-Specific Custom Deal

| Component | Monthly |
|-----------|---------|
| i360 Business tier (base) | $99 |
| Annie widget (included in Business) | $0 |
| Additional Google Sheets connector setup | One-time $500 |
| HeyGen avatar creation (5 procedure variants) | One-time $1,500 |
| **Total ongoing** | **$99/mo** |
| **Total setup** | **$2,000 one-time** |

**Comparison to standalone Annie at $175/mo:**
- Jon saves $76/month ($912/year) on ongoing costs
- Gets access to full i360 platform (agents, analytics, workflows)
- One-time setup fee covers custom integration work
- Break-even vs. standalone: Month 1 (saves money immediately after setup)

### 2.3 Pricing Recommendation

**Go with Option A (module add-on) for the platform, and Option C (hybrid) for Jon's specific deal.**

**Rationale:**
- Option A makes Annie a scalable product for all clients
- Option C gives Jon a compelling upgrade from $175/mo standalone to $99/mo with more features
- The one-time setup fee covers custom work (Sheets connector, HeyGen avatar)
- Jon gets the full i360 platform as a bonus — agents, context management, analytics
- If Jon's PE deal closes and he becomes CMO, he'll want the Agency tier for multi-practice deployment

### 2.4 Cost Analysis (65% Margin Target)

| Cost Component | Per Month (estimated) |
|----------------|----------------------|
| LLM API costs (Claude Sonnet, ~25K messages) | $12–18 |
| Vimeo hosting (Jon pays separately) | $0 |
| Infrastructure (Railway, proportional) | $5–8 |
| Google Sheets API (minimal) | $0 |
| Support overhead (proportional) | $5–10 |
| **Total COGS** | **$22–36** |
| **Revenue (Business tier)** | **$99** |
| **Gross margin** | **$63–77 (64–78%)** |

Margin meets the 65% minimum target at all reasonable usage levels.

---

## Part 3: Rollout Plan

### 3.1 Phased Delivery

#### Phase 1: Foundation (Weeks 1–2)
- [ ] Database migration: `chat_widgets`, `widget_sessions` tables
- [ ] Public chat endpoint: `/api/chat/public/:widget_id/stream`
- [ ] Widget token generation and CORS validation
- [ ] Rate limiting middleware for public endpoints
- [ ] Register `embeddable_chat` module in `platform_modules`

#### Phase 2: Widget Frontend (Weeks 2–3)
- [ ] Build `chat-widget.js` loader script
- [ ] Chat UI inside iframe (branded, responsive)
- [ ] SSE stream handling in widget
- [ ] Avatar display (static image from HeyGen)
- [ ] HIPAA disclaimer footer
- [ ] Mobile responsiveness

#### Phase 3: Google Sheets Connector (Week 3)
- [ ] Implement `sheets.js` service (read, format, cache)
- [ ] Connect to context injection pipeline
- [ ] Map Jon's spreadsheet (5 procedures + video links)
- [ ] Cache layer with configurable refresh interval
- [ ] Fallback to cached data on Sheets API failure

#### Phase 4: Annie Agent Configuration (Week 3–4)
- [ ] Create Annie agent in i360 with system prompt
- [ ] Configure soul configuration (voice, guardrails, bright lines)
- [ ] Map context assets (procedures, videos, brand guide)
- [ ] Configure video recommendation behavior
- [ ] Test all 5 procedures end-to-end

#### Phase 5: Calendly Integration (Week 4)
- [ ] Configure Calendly embed URLs per procedure in widget config / context asset
- [ ] Map procedure pages to Calendly event types (e.g., facelift → facelift-consultation)
- [ ] Implement embed rendering in chat widget (inline for desktop, popup for mobile)
- [ ] Annie system prompt: trigger embed when visitor wants to schedule
- [ ] Fallback behavior when Calendly is unavailable (phone number + hours)
- [ ] Test booking flow end-to-end with Jon's Calendly account

#### Phase 6: Conversation Review Dashboard & Admin UI (Week 4–5)
- [ ] Widget management page (`widget-manager.html`)
- [ ] Create/edit/delete widgets
- [ ] Embed code generator
- [ ] Conversation review dashboard (list view, transcript view, filters)
- [ ] Keyword search across conversations
- [ ] Sentiment indicators and status tracking
- [ ] Export: CSV, JSON, PDF
- [ ] "Export to Context Asset" workflow
- [ ] Internal notes on conversations
- [ ] Optional email digest (daily/weekly summary)
- [ ] Help system registration

#### Phase 7: Integration & Testing (Week 5–6)
- [ ] iframe mock-up for Jon's review
- [ ] Integration test with Kevin (Jon's web dev)
- [ ] Calendly embed booking flow test with Jon's account
- [ ] Conversation review dashboard walkthrough with Jon
- [ ] Export to Context Asset end-to-end test
- [ ] Load testing (50+ concurrent sessions)
- [ ] Security review (CORS, rate limiting, token validation)
- [ ] HIPAA compliance check (no PHI storage)
- [ ] Cross-browser testing (Chrome, Safari, Firefox, mobile)

#### Phase 8: Launch (Week 6–7)
- [ ] Deploy to production (Railway via develop branch)
- [ ] Progressive rollout: 1 procedure page first
- [ ] Monitor: response quality, latency, error rates, Calendly booking rate
- [ ] Expand to remaining 4 procedure pages
- [ ] Train Jon on conversation review dashboard and export workflow
- [ ] Handoff to Jon with documentation

### 3.2 Dependencies

| Dependency | Owner | Status | Blocking? |
|------------|-------|--------|-----------|
| Google Sheets API credentials | JB | Not started | Yes — Phase 3 |
| Jon's procedure spreadsheet access | Jon | Available | No |
| Video transcripts for procedures | Jon | Promised, not delivered | No (Phase 2 enhancement) |
| Kevin (web dev) introduction | Jon | Action item from meeting | Yes — Phase 7 |
| YouTube → Vimeo video migration | Jon | Action item from meeting | No (use existing links initially) |
| HeyGen avatar variations | Jon/Jason | Action item from meeting | No (use existing single avatar) |
| Calendly embed URLs per procedure | Jon | Existing — reuse from current Annie system | Yes — Phase 5 |
| Calendly event types configured | Jon | Existing — already in Calendly Professional | No |
| Phase 71 migration run on production | JB | **DONE** | No — data layer ready |
| Annie page video framing fix | JB | Action item from meeting | No |

### 3.3 Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Kevin unavailable for integration testing | Medium | High | Provide standalone test page; don't depend on Kevin for core development |
| Google Sheets data format changes | Medium | Medium | Schema validation on ingest; alert on format mismatch |
| LLM costs exceed projections | Low | High | Usage caps per widget; overage alerts at 80% threshold |
| Jon wants general-purpose chatbot immediately | High | Medium | Scope contract to surgical procedures; position general-purpose as Phase 2 |
| PE deal changes Jon's priorities | Medium | High | Build as platform module (not Jon-specific); other clients can use it |
| HIPAA concerns from visitors submitting PHI | Medium | High | Prominent disclaimer; system prompt rejection; no message persistence |
| Calendly embed breaks in nested iframe | Low | Medium | Test iframe-in-iframe rendering; fallback to popup or direct link if embed fails |
| Conversation volume overwhelms review | Low | Low | Filters, search, and AI-summarized daily digests reduce review burden |

---

## Part 4: Client Proposal Outline

### 4.1 Proposal for Dr. Jon Mendelsohn

**Subject:** Annie AI Assistant — Enhanced Deployment Proposal

**Dear Jon,**

Following our conversation today, I'm excited to present a plan that transforms Annie from a homepage chatbot into an embedded, procedure-specific AI assistant that lives directly on your surgical pages.

### What Changes

| Today | Proposed |
|-------|----------|
| Annie lives on homepage banner only | Annie is embedded on each surgical procedure page |
| Visitors must navigate to Annie | Annie meets visitors where they already are |
| Static before/after sliders | Interactive AI guide with video recommendations |
| Standalone system ($175/mo) | Integrated into Insight 360 platform ($99/mo) |
| Manual knowledge base updates | Automated Google Sheets sync |
| Single HeyGen video | Branded avatar across all touchpoints |

### How It Works

1. **Each surgical page gets its own Annie iframe** — visitors see her immediately alongside procedure content
2. **Annie knows the procedure** — she pulls from your Google Spreadsheet and recommends relevant Vimeo videos
3. **She stays in her lane** — guardrails prevent her from answering non-surgical questions, providing diagnoses, or collecting patient information
4. **You manage everything from one dashboard** — create widgets, see analytics, update her knowledge base

### Investment

| Item | Cost |
|------|------|
| Insight 360 Business tier (monthly) | $99/month |
| Annie widget module | Included |
| One-time setup (Sheets integration + avatar) | $2,000 |
| **Year 1 total** | **$3,188** |
| Compared to standalone Annie (Year 1) | $2,100 |
| **Difference** | **+$1,088 Year 1** |

**Value beyond Annie:** The Business tier includes the full i360 platform — agent management, strategic alignment tools (Align120), research studio, thought leadership engine, and analytics. Annie is one agent among many you can deploy.

**Year 2+ savings:** $99/mo vs. $175/mo = **$912/year savings** with significantly more capability.

### Timeline

- **Week 1–2:** Build widget infrastructure
- **Week 3:** Connect your Google Spreadsheet, configure Annie
- **Week 4:** Integration testing with Kevin
- **Week 5:** Progressive rollout (1 page, then all 5)
- **Week 6:** Full deployment + analytics review

### What I Need From You

1. **Introduction to Kevin** (your web developer) — for iframe integration testing
2. **Google Spreadsheet access** — so we can connect it to Annie's knowledge base
3. **Video transcripts** (when available) — to deepen Annie's procedural knowledge
4. **Vimeo migration** (at your pace) — we'll use existing video links initially

### On the Avatar

You mentioned wanting a natural-looking AI avatar. Here's my thinking:

**Immediate (included in setup):**
- Use the existing HeyGen-generated Annie image as a static avatar in the chat widget
- Professional, branded, consistent across all procedure pages

**Phase 2 (future enhancement):**
- Generate avatar variations showing different expressions/poses
- Animated idle state (subtle movement, blinking) using short HeyGen video loops
- This is the "mini-ad" concept for non-surgical pages

**Phase 3 (premium — separate quote):**
- Dynamic HeyGen API integration for real-time video responses
- Annie "speaks" her answers via generated video
- This is cutting-edge and significantly more expensive ($0.10–0.50 per generated video)
- Recommend evaluating ROI after Phase 1 engagement data is in

**My recommendation:** Start with the static avatar (Phase 1). It's clean, professional, and lets us validate the chat engagement model before investing in video generation. The Dear Doc comparison proves that text chat alone drives ~70% engagement — the avatar adds brand presence, but the interaction model is what converts.

---

## Part 5: Architectural Integration with i360

### 5.1 How Annie Fits Into the Existing Platform

```
i360 Platform
├── Existing Infrastructure (reused)
│   ├── Agent management (CRUD, execution, logging)
│   ├── Context injection (token budgeting, priority ordering)
│   ├── LLM orchestration (Anthropic Claude)
│   ├── Soul configuration (voice, guardrails, bright lines)
│   ├── Multi-tenancy (org isolation)
│   └── Module access control (tier gating)
│
├── New: Embeddable Chat Widget Module
│   ├── Public chat endpoint (no auth)
│   ├── Widget configuration & token management
│   ├── Embeddable frontend (chat-widget.js)
│   ├── Session management (anonymous visitors)
│   ├── Analytics & usage tracking
│   └── Admin UI (widget-manager.html)
│
├── New: Google Sheets Connector
│   ├── sheets.js service (read, cache, format)
│   ├── Context injection integration
│   └── Scheduled refresh
│
├── New: Calendly Integration
│   ├── Calendly MCP server (or direct API)
│   ├── OAuth2 org-level connection
│   ├── Tool use: availability, scheduling links, confirmations
│   └── Event type ↔ procedure mapping
│
├── New: Conversation Review Dashboard
│   ├── Leverages Phase 71 support_conversations + support_messages
│   ├── Search, filter, sentiment tracking
│   ├── Export (CSV, JSON, PDF)
│   └── "Export to Context Asset" knowledge feedback loop
│
└── Annie (First Widget Instance)
    ├── Agent: Annie (system prompt, model config)
    ├── Soul Config: Medical practice voice & guardrails
    ├── Context Assets: 5 procedures + video links
    ├── Widget: Configured for mendelsohn.com domains
    └── Branding: HeyGen avatar, practice colors
```

### 5.2 Data Flow

```
Website Visitor (mendelsohn.com/facelift)
    │
    │ loads iframe
    ▼
┌──────────────────────┐
│  chat-widget.js      │ Embedded widget in iframe
│  (public, no auth)   │
└──────────┬───────────┘
           │ POST /api/chat/public/:widget_id/stream
           │ Headers: X-Widget-Token, Origin
           ▼
┌──────────────────────┐
│  Widget Auth Layer    │ Validate token + CORS origin
│  Rate Limiter         │ 30 msg/min per IP
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Agent Execution      │ Load Annie agent config
│  ├── Soul Config      │ Voice, guardrails, bright lines
│  ├── Context Inject   │ Assemble procedure knowledge
│  │   ├── Sheets API   │ → Fetch procedure data (cached)
│  │   └── Video Links  │ → Map to relevant Vimeo URLs
│  ├── Tool Use (MCP)   │ If scheduling requested:
│  │   └── Calendly     │ → Check availability → Generate link
│  └── LLM Call         │ Claude Sonnet (streaming)
└──────────┬───────────┘
           │ SSE stream
           ▼
┌──────────────────────┐
│  Widget renders       │ Chat bubbles + video cards
│  response in iframe   │ + Calendly booking links
└──────────┬───────────┘
           │ Messages stored
           ▼
┌──────────────────────┐
│  Phase 71 Data Layer  │ support_conversations
│  (Supabase)           │ + support_messages
└──────────┬───────────┘
           │ Jon reviews in dashboard
           ▼
┌──────────────────────┐
│  Review Dashboard     │ Search, filter, export
│  → Export to Context  │ → Annie gets smarter
│     Asset             │    (knowledge feedback loop)
└──────────────────────┘
```

### 5.3 New Database Objects

```sql
-- Widget configuration
CREATE TABLE chat_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    agent_id UUID REFERENCES agents(id),
    widget_name TEXT NOT NULL,
    widget_token TEXT UNIQUE NOT NULL,
    cors_origins TEXT[] DEFAULT '{}',
    branding JSONB DEFAULT '{}',
    -- branding: { avatar_url, primary_color, welcome_message, disclaimer }
    limits JSONB DEFAULT '{}',
    -- limits: { max_messages_per_session, max_sessions_per_day, max_messages_per_month }
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Anonymous visitor sessions
CREATE TABLE widget_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id UUID REFERENCES chat_widgets(id),
    session_token TEXT UNIQUE NOT NULL,
    visitor_fingerprint TEXT, -- hashed, non-PII
    messages_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 minutes'),
    metadata JSONB DEFAULT '{}'
);

-- Extend agent_executions
ALTER TABLE agent_executions ADD COLUMN widget_id UUID REFERENCES chat_widgets(id);
ALTER TABLE agent_executions ADD COLUMN is_public BOOLEAN DEFAULT false;
```

### 5.4 New Files

| File | Purpose |
|------|---------|
| `db/phase71-support-system.sql` | Foundation data layer (already exists — run on production) |
| `db/phase7X-embeddable-chat-widgets.sql` | Widget-specific schema extensions |
| `server/routes/widgets.js` | Widget CRUD + public chat endpoint |
| `server/routes/conversationReview.js` | Conversation review API (list, search, export) |
| `server/services/integrations/providers/google/sheets.js` | Google Sheets connector |
| `server/services/calendlyService.js` | Calendly MCP/API integration |
| `public/js/chat-widget.js` | Embeddable frontend loader |
| `public/widget-manager.html` | Admin UI for widgets |
| `public/conversation-review.html` | Conversation review dashboard |
| `public/css/chat-widget.css` | Widget styles (self-contained) |
| `documentation/guides/widget-manager-user-guide.md` | Widget user documentation |
| `documentation/guides/conversation-review-user-guide.md` | Review dashboard documentation |

---

## Part 6: Avatar Strategy — Detailed Thoughts

### Current State
- Single HeyGen-generated video exists for Annie
- Jon wants "a natural looking AI created avatar who represents his brand"
- The avatar needs to feel professional and trustworthy (medical practice context)

### Recommended Approach

**Phase 1 — Static Avatar (Launch)**
- Extract a high-quality still frame from the existing HeyGen video
- Use as Annie's chat avatar (appears in widget header + alongside messages)
- Consistent across all 5 procedure page widgets
- Cost: $0 (use existing asset)

**Phase 2 — Animated Presence (Post-Launch)**
- Generate 3-5 short HeyGen loops (3-5 seconds each):
  - Idle/listening (subtle head movement, blinking)
  - Thinking (slight head tilt)
  - Speaking (lip sync to generic greeting)
- Use as animated GIF/video on non-surgical pages ("mini-ads")
- These are brand presence elements, not interactive
- Cost: ~$200-500 (HeyGen credits for video generation)

**Phase 3 — Dynamic Video Responses (Future, Separate Scope)**
- HeyGen Interactive Avatar API integration
- Annie "speaks" her text responses via real-time video generation
- Requires HeyGen Enterprise plan ($500+/month)
- Per-response cost: $0.10-0.50 depending on length
- At 25K messages/month = $2,500-12,500/month in avatar costs alone
- **Recommendation:** Only pursue if engagement data from Phase 1 justifies the ROI
- **Alternative:** Pre-record 20-30 common responses as HeyGen videos; play the closest match. Much cheaper, still feels dynamic.

### Why Start with Static

The Dear Doc comparison is instructive: they achieve ~70% engagement with a text-only chatbot. The avatar adds trust and brand recognition, but it's the *conversational capability* that drives engagement. A beautiful avatar on a bad chatbot won't convert. A good chatbot with a simple avatar will.

Build the brain first (Phase 1). Add the face later (Phase 2-3) once we have data proving the engagement model works.

---

## Audit Log

```yaml
audit_log:
  workflow: WF-01 (Feature Planning)
  feature: Annie Embeddable Chat Widget
  initiated_by: human PM (JB)
  timestamp_start: 2026-03-13T19:30:00Z
  timestamp_end: 2026-03-13T20:15:00Z

  delegations:
    - agent: explore-agent (chat architecture)
      task_type: codebase research
      status: accepted
      findings_count: 0
      notes: Mapped full chat pipeline, identified Google Sheets scope exists but no implementation

    - agent: explore-agent (pricing/tiers)
      task_type: pricing research
      status: accepted
      findings_count: 0
      notes: Confirmed tier structure, add-on pricing patterns, 65% margin target

  decisions:
    - decision: Build as platform module, not standalone product
      rationale: Leverages existing i360 infrastructure; scalable to other clients; eliminates duplicate maintenance
      alternatives_considered:
        - Standalone Annie system (rejected — duplicate infrastructure)
        - Annie as custom integration only (rejected — not scalable)
      escalated: false

    - decision: Price at Business tier included, Starter add-on at $49/mo
      rationale: Follows social publishing add-on precedent; competitive with Intercom/Drift; meets 65% margin
      alternatives_considered:
        - $175/mo standalone pricing (rejected — too high for module within platform)
        - Free for all tiers (rejected — significant LLM cost per widget)
      escalated: true  # Pricing requires human PM approval

    - decision: Static avatar for Phase 1, defer dynamic video
      rationale: Dear Doc proves text chat drives engagement; dynamic video cost is $2.5K-12.5K/mo at scale
      alternatives_considered:
        - Launch with dynamic HeyGen (rejected — cost prohibitive before engagement data)
        - No avatar at all (rejected — Jon specifically requested branded avatar)
      escalated: false

  escalations:
    - tier: 2
      reason: Pricing decision requires human PM approval
      resolution: pending
    - tier: 2
      reason: Client proposal requires human PM review before sending
      resolution: pending

  quality_gates:
    - gate: PRD completeness
      status: pass
      notes: All sections populated including failure scenarios and downstream impact
    - gate: Pricing margin check
      status: pass
      notes: 64-78% gross margin at Business tier; meets 65% target
    - gate: HIPAA consideration
      status: pass
      notes: No PHI collection/storage; disclaimer required; system prompt guardrails

  outcome:
    status: escalated_to_human
    deliverables:
      - PRD with acceptance criteria
      - Pricing strategy (3 options with recommendation)
      - Phased rollout plan (7 phases, 6 weeks)
      - Client proposal outline
      - Architecture integration design
      - Avatar strategy
    open_items:
      - Human PM approval on pricing (Option A + C)
      - Human PM review of client proposal before sending to Jon
      - Security review needed before launch (not yet delegated)
      - Compliance review for HIPAA implications (not yet delegated)
      - FMEA not yet performed (required before launch per WF-04)
    follow_ups:
      - action: Delegate to security-analyst for threat model
        owner: Avery
        deadline: Before Phase 6 (integration testing)
      - action: Delegate to compliance-auditor for HIPAA review
        owner: Avery
        deadline: Before Phase 4 (agent configuration)
      - action: Run FMEA (WF-07) on embeddable widget
        owner: Avery
        deadline: Before Phase 7 (launch)
      - action: Delegate to qa-analyst for test plan
        owner: Avery
        deadline: Before Phase 6
      - action: Delegate to docs-sync for documentation chain
        owner: Avery
        deadline: Phase 5 (admin UI)
```

---

## Next Steps — Decisions Needed from Human PM

1. **Pricing approval:** Option A (platform module) + Option C (Jon's deal) — or adjustments?
2. **Proposal review:** Ready to send to Jon, or modifications needed?
3. **Phase number assignment:** What phase number for widget-specific migration? (Phase 71 support system is the data foundation; widget extensions need a phase number)
4. **Priority:** Where does this sit relative to current roadmap?
5. **Security/FMEA:** Green light to run security review and FMEA before build begins?
6. **Avatar budget:** Approve $1,500 one-time for HeyGen avatar variations in setup fee?
7. ~~**Calendly:**~~ **RESOLVED** — Jon has Calendly Professional. Using embed approach (same as current Annie system). MCP/API integration deferred to future discussion.
8. ~~**Phase 71 deployment:**~~ **RESOLVED** — Migration run successfully. Data layer is live.

---

## Sources

- [Calendly Developer Portal](https://developer.calendly.com/)
- [Calendly Scheduling API](https://developer.calendly.com/api-docs)
- [Calendly Embed Integration](https://calendly.com/integration/embed)
- [Calendly MCP Server (Composio)](https://composio.dev/toolkits/calendly/framework/claude-code)
- [Calendly MCP Server (Zapier)](https://zapier.com/mcp/calendly)
- [Calendly MCP Server (LobeHub)](https://lobehub.com/mcp/meamitpatil-calendly-mcp-server)
