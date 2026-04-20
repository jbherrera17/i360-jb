# Chat Support System Settings User Guide

**For:** Insight 360 Admins
**Last Updated:** 2026-04-20

---

## Why This Page Matters

The Chat Support System Settings page is the single control plane for every customer-facing chat widget you embed on your sites. Appearance, agent binding, usage caps, privacy policy, domain whitelist, data sources, scheduling — all of it lives here. Changes you make propagate to every widget embedded via the generated script tag.

## What It Does

| Tab | Purpose |
|-----|---------|
| **Widget Config** | Create, configure, and manage every embeddable chat widget in your organization — the single source of truth for per-widget settings. |
| **Policies** | Define organization-wide support policies Annie follows (escalation rules, refund handling, etc.), backed by the Parthenon Processes system. |
| **Privacy & Compliance** | Set the privacy policy text, consent checkbox text, and data retention window. These settings apply to **all** widgets in your organization. |
| **Integrations** | Connect external services — Stripe and Slack (Phase 2), Google Sheets for knowledge-base data sync, and Calendly for scheduling. |

---

## Tab 1: Widget Config

### Create a new widget

1. Click **+ New Widget** (top right of the widget list).
2. Enter a widget name (shown only in admin — visitors see the welcome message).
3. Click **Create Widget**. A new widget card appears in the list.

### Configure an existing widget

Click any widget card to open the inline configuration panel below the list.

| Field | What it does |
|-------|--------------|
| **Widget Name** | Admin-only label. |
| **Agent** | The AI agent Annie uses to answer questions. Must be an active agent in your org. |
| **Pre-Chat Mode** | Controls the form visitors see before chatting: **Lead Capture** (email required), **Open Chat** (no form), **Optional Info** (form with skip), or **Custom**. |
| **Primary Color** | Accent color for the widget bubble, header, and send button. |
| **Avatar URL** | Optional image shown next to Annie's messages. |
| **Welcome Message** | First message visitors see when they open the chat. |
| **Allowed Domains (CORS)** | Whitelist of domains where this widget can be embedded. The widget will refuse to load on any other origin. |
| **Messages/Session** | Max messages a single visitor can send in one session. |
| **Messages/Month** | Org-wide monthly message cap for this widget. |
| **Daily LLM Spend Cap** | Hard dollar limit per day — prevents runaway costs. |
| **Active** | Master on/off switch for this widget. When off, the widget is disabled on all sites. |
| **Embed Code** | Auto-generated `<script>` tag. Paste into the `<head>` of any domain you whitelisted. |

Click **Save Widget** to persist. Changes are live immediately on every site where the widget is embedded.

---

## Tab 2: Policies

Support policies are backed by Parthenon Processes. Use this tab to create, edit, and delete policies assigned to the Support department.

| Action | How |
|--------|-----|
| Create policy | Click **+ New Policy** — fill in name, description, and step-by-step actions. |
| Edit policy | Click the policy row → **Edit**. |
| Delete policy | Click **Delete** on the policy row → confirm. |

Policies are enforced automatically by the Parthenon engine when Annie handles conversations matching the policy's triggers.

---

## Tab 3: Privacy & Compliance

These settings apply to **every widget in your organization**, not just one widget. Saving here updates all widgets.

| Field | What it does |
|-------|--------------|
| **Privacy Policy** | Full policy text visitors can read via the consent checkbox link. |
| **Consent Checkbox Text** | Short inline text shown next to the consent checkbox on the pre-chat form. |
| **Data Retention (days)** | How long visitor sessions are kept before automated purge. Default 90 days. |

Click **Preview Policy** to see exactly what visitors will read. Click **Save** to apply across all widgets.

---

## Tab 4: Integrations

Consolidated in this tab: Connections (Stripe, Slack), Data Sources (Google Sheets), and Scheduling (Calendly).

### Connections (Stripe, Slack)

Both disabled — **coming in Phase 2**. Preview shows what they'll look like.

### Data Sources — Google Sheets

Sync a Google Sheet into Annie's knowledge base as a context asset, so Annie can answer questions using your live data (procedures, pricing, inventory, etc.).

1. Click **Connect Google Account** → OAuth flow opens.
2. Once connected, paste your **Spreadsheet ID** (from the Google Sheets URL) and the **Sheet/Tab Name**.
3. Choose a **Sync Interval** (5/15/30/60 min).
4. Name the resulting **Context Asset** — this is what appears in the Context Assets library.
5. Click **Save Configuration**, then **Sync Now** to trigger the first sync.

Saved Sheets config applies to **every widget in your org**.

### Scheduling — Calendly

Let visitors book consultations without leaving the chat. Annie surfaces a "Schedule Now" card when conversation detects booking intent.

1. Click **Connect via OAuth** (recommended) or **Personal Access Token** (if OAuth fails or you need scoped access).
2. Add one row per procedure you want bookable. Each row: **Procedure name** (matches what visitors say) → **Calendly embed URL**.
3. Click **Add Mapping** for additional rows.
4. Click **Save Calendly Configuration**. Applies to all widgets.

---

## Tips & Best Practices

- **One widget per domain.** Use the CORS whitelist as the source of truth — don't embed the same widget on unrelated domains.
- **Start with Lead Capture mode** for sales sites, **Open Chat** for support.
- **Set Daily LLM Spend Cap conservatively.** $5/day is a safe default while you observe usage; raise once you have a week of data.
- **Privacy policy applies to all widgets.** If you need different policies per widget, file a request — today the policy is org-wide.
- **Sheets sync data is visible to Annie.** Only sync sheets you're comfortable with Annie referencing in answers.
- **Calendly URLs must be exact.** Use the embed URL from Calendly's share → embed, not the marketing URL.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Widget doesn't load on my site | Check the **Allowed Domains (CORS)** list includes the exact origin (with/without `www.` as it appears in the browser). |
| Widget shows "Offline" | The widget's **Active** toggle is off, or the daily spend cap is exhausted. Check Widget Config. |
| Sheets sync never runs | Re-check the OAuth connection (it may have expired). Click **Sync Now** to force; if it fails, reconnect Google. |
| Calendly "Schedule Now" card doesn't appear | Annie only surfaces it when she detects booking intent. Verify the procedure name in the mapping matches words visitors are likely to use. |
| Saved privacy policy didn't apply | Privacy settings broadcast to all widgets. If only one widget shows old text, force-refresh your browser — the widget caches config for 60s. |
| Help button shows "Page not found" | Check `server/routes/docs.js` `ALLOWED_DOCS` includes `support-settings-user-guide.md`. |
