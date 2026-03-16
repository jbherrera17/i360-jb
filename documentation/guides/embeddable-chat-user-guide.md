# Embeddable Chat Widget User Guide

**For:** Insight 360 Users (Manager+ role)
**Module:** Embeddable Chat Widget
**Last Updated:** 2026-03-15

---

## Why Embeddable Chat Widgets Matter

Embeddable chat widgets let you deploy AI-powered chat assistants on your external websites. Visitors can ask questions, get information about your services, and schedule consultations — all without leaving your site. Each widget uses your organization's knowledge base and brand voice.

---

## What It Does

| Action | Description |
|--------|-------------|
| **Create widgets** | Set up multiple chat widgets for different websites or use cases |
| **Configure branding** | Customize colors, welcome messages, and avatars to match your site |
| **Control access** | Set allowed domains (CORS) so the widget only works on your sites |
| **Manage pre-chat forms** | Choose what info to collect before chat starts (email, name, consent) |
| **Set usage limits** | Control message caps, daily spend, and monthly ceilings |
| **Edit privacy policy** | Customize the privacy policy shown to visitors |
| **Connect data sources** | Sync Google Sheets data into your widget's knowledge base |
| **Connect scheduling** | Link Calendly so visitors can book consultations from chat |
| **View usage stats** | Monitor message volume, session counts, and LLM spend |

---

## Getting Started

### Navigate to Support Settings

1. Open the sidebar navigation
2. Click **Support Settings** under the Tools section
3. Click the **Chat Widgets** tab

### Create Your First Widget

1. Click **New Widget** in the top right
2. Enter a name (e.g., "Annie - Facelift Page")
3. Choose a pre-chat mode (see Pre-Chat Modes below)
4. Click **Create**

### Configure the Widget

After creation, click the widget card to open its configuration panel:

1. **Widget Name** - Display name shown in the chat header
2. **Agent** - Select which AI agent powers this widget (optional)
3. **Pre-Chat Mode** - What visitors see before chatting
4. **Primary Color** - Brand color for the widget UI
5. **Avatar URL** - Image shown in the chat header
6. **Welcome Message** - First message visitors see
7. **Allowed Domains** - Add each domain where you'll embed the widget
8. **Usage Limits** - Set messages per session, monthly cap, and daily spend cap

### Embed on Your Website

After saving, the embed code section appears. Copy the script tag and paste it into your website's HTML:

```html
<script src="https://your-i360-domain/js/chat-widget.js"
        data-widget-id="YOUR_WIDGET_ID"
        data-token="YOUR_WIDGET_TOKEN"></script>
```

The widget appears as a floating chat button in the bottom-right corner of your page.

---

## Pre-Chat Modes

| Mode | What Visitors See | Best For |
|------|-------------------|----------|
| **Lead Capture** | Email (required) + Name form before chat | Lead generation, sales funnels |
| **Open Chat** | No form — chat starts immediately | Customer support, FAQ pages |
| **Optional Info** | Form with a "Skip" button | Balanced approach — collect info without friction |
| **Custom** | Configure each field individually | Specific data collection needs |

---

## Allowed Domains (CORS)

The widget only works on domains you explicitly allow. This prevents unauthorized sites from using your widget.

- Add domains without `https://` (e.g., `example.com`)
- Use `*.example.com` to allow all subdomains
- The widget will not load on unlisted domains
- Your Insight 360 domain is automatically allowed for testing

---

## Usage Limits & Cost Controls

| Setting | Default | What It Does |
|---------|---------|-------------|
| **Messages/Session** | 50 | Max messages per visitor conversation |
| **Messages/Month** | 10,000 | Monthly message ceiling across all sessions |
| **Daily LLM Spend Cap** | $5.00 | Maximum daily AI processing cost |

When limits are approached:
- **80% of monthly ceiling**: You receive a warning notification
- **100% of monthly ceiling**: Widget auto-degrades to faster, cheaper AI responses (visitors aren't cut off)
- **Daily spend cap exceeded**: Widget switches to cost-efficient mode

---

## Privacy & Compliance

### Privacy Policy

Each widget serves a privacy policy to visitors. Edit yours in the **Privacy** tab:

1. Click **Privacy** tab in Support Settings
2. Edit the policy text (supports HTML formatting)
3. Or click **Load Default Template** for a starter policy
4. Click **Preview** to see how it looks
5. Click **Save Privacy Settings**

Visitors can access the policy via a link in the widget footer.

### Consent & Disclosure

Configure what visitors agree to:
- **Consent Checkbox Text** - The agreement text shown with the checkbox
- **AI Disclosure** - Statement that visitors are chatting with AI (required for transparency)
- **Medical Disclaimer** - For healthcare contexts

### Data Retention

Set how long conversation data is kept:
- Default: **90 days**
- Options: 30, 60, 90, 180, or 365 days
- Enable **Auto-Cleanup** to automatically delete expired data

### PII Protection

All visitor messages are automatically scanned for personal information (names, emails, phone numbers, etc.). Detected PII is redacted before storage, so conversation transcripts don't contain identifiable information.

---

## Google Sheets Integration

Sync spreadsheet data into your widget's knowledge base:

1. Go to **Data Sources** tab
2. Click **Connect Google Account** and authorize access
3. Enter the **Spreadsheet ID** (from the URL) and **Sheet/Tab Name**
4. Set the **Sync Interval** (default: every 15 minutes)
5. Name the **Context Asset** that will be created
6. Click **Save Configuration**
7. Click **Sync Now** to perform an immediate sync

The synced data becomes part of the AI's knowledge base, so the widget can answer questions based on your spreadsheet content.

---

## Calendly Integration

Enable appointment scheduling from the chat widget:

1. Go to **Integrations** tab
2. Connect Calendly via **OAuth** or **Personal Access Token**
3. Map procedures to Calendly event URLs
4. Save the configuration

When visitors want to schedule, the AI assistant provides the correct booking link based on the procedure they're discussing.

---

## Tips & Best Practices

- **Start with Lead Capture mode** if you want to collect visitor emails for follow-up
- **Use Open Chat mode** on FAQ or support pages where friction should be minimal
- **Add specific domains** rather than wildcards for better security
- **Monitor usage stats** weekly to ensure limits are appropriately set
- **Keep your knowledge base updated** — the widget is only as good as its data
- **Test on your site** before going live by adding your staging domain first

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Widget doesn't appear on my site | Check that your domain is in the Allowed Domains list |
| "Invalid or inactive widget" error | Verify the widget is active and the embed code is correct |
| Widget loads but chat doesn't start | Check browser console for CORS errors; add the correct domain |
| Responses seem generic | Ensure your knowledge base (context assets) has relevant content |
| Monthly limit reached too quickly | Increase the limit or review traffic patterns for bot abuse |
| Privacy policy link shows default | Edit your custom policy in the Privacy tab |
