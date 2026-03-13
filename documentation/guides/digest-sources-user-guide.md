# Digest Sources User Guide

**For:** Insight 360 Users
**Last Updated:** 2026-03-10

---

## Why Sources Matter

Sources are the foundation of your AI Digest. They define where content comes from — RSS feeds, websites, documents, or newsletters. Each source can have a default agent and context assets assigned, ensuring every piece of content is processed through your organizational lens before it ever reaches a digest section.

---

## What It Does

| Action | Description |
|--------|-------------|
| **Add Sources** | Configure RSS feeds, websites, document repositories, and newsletter inputs |
| **Fetch Content** | Manually trigger a source fetch or let the schedule run automatically |
| **Monitor Health** | Track fetch success rates, error counts, and source reliability with a visual health bar |
| **Manage Items** | View all ingested items, filter by source or status, and manually trigger summarization |
| **Upload Documents** | Ingest PDF, DOCX, TXT, MD, or CSV files directly into a document source |
| **Paste Newsletters** | Add newsletter content (HTML or plain text) manually into a newsletter source |
| **Edit & Delete** | Update source settings or remove sources (deletes all associated items) |

---

## Page Layout

The Digest Sources page has three tabs:

- **Sources** — card grid showing all configured sources with health bars, fetch stats, and action buttons
- **All Items** — filterable list of every ingested content item across all sources
- **Health** — summary statistics and per-source health scores

The header contains a **Back to Digest** link and the **Add Source** button.

---

## Source Types

### RSS Feed
Automatically fetches and parses RSS 2.0 and Atom feeds on a configurable schedule (default: every 4 hours). Supports standard item fields: title, description, link, author, pubDate, category.

### Website
Scrapes web page content using Mozilla Readability or custom CSS selectors. Default schedule: every 12 hours. Includes SSRF protection to prevent server-side request forgery.

### Document
Upload files (PDF, DOCX, TXT, MD, CSV) for text extraction. Files are stored in Supabase Storage. No automatic fetching — content is added via the Upload button on the source card. Maximum file size: 50 MB.

### Newsletter
Paste email newsletter content (HTML or plain text) using the Paste button on the source card. HTML content is extracted using Readability. No automatic fetching.

### Manual
Free-form text entry for content from any source not covered by the above types. Added via the API or future UI entry forms.

---

## Step by Step Use

### Adding an RSS Feed
1. Click **Add Source**
2. Fill in the dialog:
   - **Source Name**: a label for this feed (e.g., "TechCrunch AI")
   - **Source Type**: RSS Feed
   - **URL**: the RSS/Atom feed URL (e.g., `https://techcrunch.com/feed/`)
   - **Default Processing Agent**: optional — an agent to use when processing items from this source
   - **Tags**: comma-separated tags for organization
3. Click **Add Source**
4. On the new source card, click **Fetch** to pull the initial set of items

### Adding a Website
1. Click **Add Source**, select **Website**
2. Enter the page URL
3. Click **Add Source**, then **Fetch** to scrape the page
4. If content is not extracted correctly, edit the source and add CSS selectors in the config

### Adding a Document Source
1. Click **Add Source**, select **Document Upload**
2. Name the source (e.g., "Internal Research")
3. Click **Add Source** — no URL needed
4. On the source card, click **Upload**
5. Select a PDF, DOCX, TXT, MD, or CSV file from your computer
6. The file is processed and stored as an item with `pending` status

### Adding a Newsletter Source
1. Click **Add Source**, select **Newsletter (paste)**
2. Name the source (e.g., "Morning Brew")
3. Click **Add Source**
4. On the source card, click **Paste**
5. Fill in the dialog:
   - **Subject/Title**: the newsletter's subject line
   - **Sender**: the sender email address
   - **Content**: paste the full HTML or plain text of the newsletter
6. Click **Add Newsletter**

### Editing a Source
1. Click **Edit** on a source card
2. The edit dialog allows changing:
   - **Name**
   - **URL** (for RSS and website sources)
   - **Enabled**: toggle the source on or off
   - **Fetch Schedule**: cron expression (e.g., `0 */4 * * *` for every 4 hours)
   - **Default Agent**: the agent used when auto-processing items
   - **Tags**: comma-separated
3. Click **Save**

### Deleting a Source
1. Click the trash icon on the source card
2. Confirm the deletion dialog — note that **all items from this source are permanently deleted**

### Viewing All Items
1. Click the **All Items** tab
2. Filter by **Source** or **Status** (pending, completed, failed, processing)
3. Click **Refresh** to reload the list
4. Each item row shows: title (linked if a URL exists), source name, publish date, word count, and processing status badge
5. Click the sparkles icon on any item row to manually trigger AI summarization at Brief depth

### Monitoring Source Health
1. Click the **Health** tab
2. The summary row shows: Total, Enabled, Healthy, Degraded, Failing counts
3. Each source row shows fetch count, error count, last fetch timestamp, and a percentage health bar
4. Health thresholds: green = 70% or above, amber = 30–69%, red = below 30%

---

## Health Score Explained

The health score (0–100%) is a rolling metric updated automatically after every fetch:

- **Successful fetch**: score nudges up (weighted average with 90% old weight)
- **Failed fetch**: score nudges down and the error counter increments

A brand-new source starts at 100%. A source that fails every fetch will approach 0% over time. The last fetch error message is stored and visible in the source card's metadata row.

---

## Source Card Details

Each source card in the Sources tab displays:
- **Type badge** (color-coded: amber = RSS, blue = website, purple = document, green = newsletter, grey = manual)
- **URL** (truncated, linked)
- **Fetch count and error count**
- **Last fetch timestamp and status**
- **Schedule** (cron expression if set)
- **Default Agent** (if assigned)
- **Health bar** (color-coded)
- **Context asset badges** (if default context assets are assigned)
- **Action buttons**: Fetch, Edit, Upload (document only), Paste (newsletter only), Delete

---

## Tips & Best Practices

- After adding an RSS feed or website, click **Fetch** immediately to pull the first batch of items rather than waiting for the scheduled run
- Monitor the **Health** tab weekly — catch degrading sources before they affect your digests
- Use tags to organize sources by topic or priority (e.g., "ai", "competitors", "industry")
- Assign context assets at the source level so every item from that source carries baseline organizational context into the pipeline
- A source card with a red health bar and a visible error message in the metadata row indicates a persistent fetch failure — edit the URL or disable the source

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Fetch returns 0 new items | The feed may have no new content, or the URL may be a webpage instead of an RSS feed. Verify the URL returns XML in your browser. |
| Health score dropping | Check the last fetch status and error on the source card. Common causes: timeout, 404, rate limiting, malformed feed. |
| Document upload fails | Ensure the file is under 50 MB and is PDF, DOCX, TXT, MD, or CSV format |
| Newsletter paste shows no title | The subject field is optional; the system will use the first heading it can extract from the content |
| Duplicate items | Expected behavior — the system deduplicates by URL/GUID hash, so re-fetching will not create duplicates |
| Item stuck in "processing" status | A summarization was interrupted. Click the sparkles icon to re-summarize the item. |
| Source card shows "Never" for last fetch | You need to click Fetch on the card to pull the first batch; scheduled fetches run on the cron schedule going forward |
