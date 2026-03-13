# AI Digest User Guide

**For:** Insight 360 Users
**Last Updated:** 2026-03-10

---

## Why AI Digest Matters

AI Digest transforms raw content from RSS feeds, websites, documents, and newsletters into actionable business intelligence. Unlike generic aggregators, AI Digest applies your organization's context assets (ICP, brand voice, strategic goals) to every piece of content, identifying opportunities, threats, and alignment with your business objectives.

Available on Business tier and above.

---

## What It Does

| Action | Description |
|--------|-------------|
| **Aggregate Content** | Collect articles from RSS feeds, websites, uploaded documents, and newsletters |
| **Intelligent Summarization** | AI extracts key points, entities, sentiment, and topics from each item |
| **Context Enrichment** | Apply your ICP, competitive positioning, or strategic context to frame every insight |
| **Agent Processing** | Use existing agents (Market Research, Competitor Analysis) to process content with their specialized context |
| **Full-Text Search** | Search across all ingested content and summaries with faceted filtering |
| **Digest Generation** | Produce organized digests with configurable sections and summary depths |
| **History** | Browse and reload all previously generated digests |

---

## Page Layout

The AI Digest page has four tabs:

- **Today's Digest** — displays the most recently generated digest, collapsed by section
- **Search** — full-text search with filters for content type and date range
- **History** — list of past digests; click any row to load it in Today's Digest
- **Configuration** — manage your digest configuration and its sections

The header contains a **Sources** button (navigates to the Digest Sources page) and a **Generate** button.

---

## Step by Step Use

### Getting Started

1. Navigate to **AI Digest** from the sidebar
2. Go to the **Configuration** tab
3. Click **Create Configuration** — a dialog appears with:
   - **Name**: label for this configuration
   - **Default Summary Depth**: Headline, Brief, or Detailed
   - **Max Items Per Digest**: ceiling for total items across all sections
4. After creating, add one or more sections (see below)

### Managing Sources

Sources live on a separate page. Click **Sources** in the header to open it, or navigate directly to Digest Sources. Sources must be configured and fetched before digest generation will produce results.

### Configuring Sections

Sections define how your digest is organized. Each section draws from one or more sources, processes items with a chosen mode, and can have context assets applied.

1. In the **Configuration** tab, click **Add Section**
2. Fill in the dialog:
   - **Section Name**: displayed as the section heading in the digest (e.g., "Industry News")
   - **Description**: optional subtitle
   - **Icon**: any Lucide icon name (e.g., `rss`, `globe`, `trending-up`)
   - **Processing Mode**: AI Summary, Agent, or Raw (see Processing Modes below)
   - **Agent**: select an agent if using Agent mode
   - **Summary Depth**: Headline, Brief, or Detailed (overrides the config default for this section)
   - **Max Items**: maximum items to include in this section per digest run
   - **Custom Enrichment Prompt**: optional free-text instructions appended to the AI prompt
3. Click **Add Section**

To edit or delete an existing section, use the pencil or trash icons on the section row in Configuration.

### Generating a Digest

1. Ensure you have at least one configuration and at least one section
2. Click **Generate** in the page header
3. A progress display appears showing each section as it is processed — you will see a spinner per section, then a checkmark with item count and token usage
4. When complete, a toast notification confirms success and the Today's Digest tab loads automatically

Generation uses Server-Sent Events (SSE) for real-time progress. If you navigate away mid-generation, the digest will still complete on the server; return to the page and the latest digest will be available.

### Viewing the Digest

In the **Today's Digest** tab, sections are displayed as collapsible cards. Each card shows:
- Section name and item count
- Each item: title (linked to source URL if available), summary text, key points list
- **Strategic Context** panel (appears when context assets were applied): alignment notes, opportunities, risks, and action items
- Topic tags and sentiment badge at the bottom of each item

### Viewing History

1. Click the **History** tab
2. Each row shows the digest date, item count, token usage, and status badge
3. Click any row to load that digest in the Today's Digest tab

### Searching Content

1. Click the **Search** tab
2. Enter at least 2 characters in the search field and press Enter or click **Search**
3. Use the filters:
   - **All Content / Source Items / Summaries**: narrow to raw ingested text or AI-processed summaries
   - **Date range**: from/to date pickers
4. Results show a highlighted snippet with matched terms emphasized, the source name, content type badge, and topic tags

---

## Processing Modes Explained

### AI Summary (Default)
Content is processed through the Anthropic API with structured extraction. The model selected depends on summary depth: Headline uses a faster model; Brief and Detailed use a more capable model. Returns:
- Concise title and summary at your chosen depth
- Key points (bullet list)
- Named entities (people, organizations, products)
- Sentiment analysis (positive/neutral/negative)
- Topic classification
- Context analysis (when context assets are applied)

### Agent Processing
Content is sent to an existing Insight 360 agent as its input message. The agent processes it using its own system prompt and context assets. Ideal for:
- Market research agents analyzing industry articles
- Competitor analysis agents evaluating competitor news
- Content strategy agents identifying content opportunities

Note: In Agent mode, key points and entities are not extracted — the agent's full response is stored as the summary.

### Raw Pass-Through
Content is stored and displayed without AI processing. Useful for:
- Reference documents you want searchable but not summarized
- Content you will process manually later

---

## Context Enrichment

The key differentiator of AI Digest is context-aware analysis. When context assets are attached to a section:

1. Your **Ideal Client Profile (ICP)** shapes how articles are evaluated for relevance
2. Your **Competitive Positioning** identifies threats and opportunities
3. Your **Strategic Goals** align content insights with business objectives
4. Your **Brand Voice** influences how summaries are written

Each summarized item with context assets produces a **Strategic Context** panel containing:
- **Alignment notes**: how the content relates to your organizational context
- **Opportunities**: specific opportunities this content surfaces (shown in green)
- **Risks**: threats or risks identified (shown in amber)
- **Actions**: suggested next steps

You can also assign default context assets to a source (on the Digest Sources page). These default assets apply when no section-level assets are configured.

---

## Tips & Best Practices

- Start with RSS feeds for consistent automated content ingestion
- Use **Brief** depth for daily scanning; **Detailed** for in-depth analysis sessions
- Assign your Market Research agent to competitive intelligence sections
- Apply your ICP context asset to industry news sections for opportunity spotting
- Use tags on sources to organize by topic (ai, industry, competitors)
- The Configuration tab's **Settings** button lets you rename the config or adjust depth and item limits at any time
- Each generated digest is stored permanently in History — you can always reload a past digest

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Generate button shows error "create a digest configuration first" | Go to the Configuration tab and click Create Configuration |
| RSS feed not fetching | Verify the URL is a valid RSS/Atom feed. Go to Digest Sources and check the source card's last fetch status. |
| Summaries are too generic | Add context assets to your sections or write a Custom Enrichment Prompt |
| Website content not extracting | Try adding custom CSS selectors in the source config on the Sources page |
| Generation produces 0 items | Ensure sources have been fetched and contain items. Check Digest Sources > All Items tab. |
| Generation is slow | Reduce Max Items per section or switch to Headline depth for faster processing |
| Search returns no results | Content must be fetched and indexed first. The search query must be at least 2 characters. Check that sources have items in Digest Sources. |
| History entry shows "partial" status | Some sections failed during generation. Check that all sources are healthy and fetched. |
