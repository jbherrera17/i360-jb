# AI Digest Technical Guide

**Phase:** 66
**Version:** 1.0.0
**Last Updated:** 2026-03-10

---

## Architecture Overview

AI Digest is a content aggregation and intelligence pipeline built on top of the existing Insight 360 agent and context injection infrastructure. It consists of:

- **Two frontend pages**: `public/digest.html` (main view) and `public/digest-sources.html` (source management)
- **One Express router**: `server/routes/digest.js` — 24 endpoints mounted at `/api/digest/`
- **Two core services**: `server/services/digestSourceService.js` (CRUD, fetching, health) and `server/services/digestPipeline.js` (summarization, generation, search)
- **Four fetcher modules**: `server/services/digestFetchers/{rss,website,document,newsletter}Fetcher.js` — lazy-loaded
- **Seven database tables** with full-text search and RLS
- **Module access control**: `ai_digest` module, minimum tier = `business`

---

## Database Schema

### `digest_sources`
Defines a content source (org-scoped).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `org_id` | UUID | FK → organizations |
| `user_id` | UUID | FK → auth.users (creator) |
| `name` | TEXT | Display label |
| `source_type` | TEXT | `rss`, `website`, `document`, `newsletter`, `manual` |
| `config` | JSONB | Type-specific: RSS/website: `{url}`, document: `{file_path,mime_type,file_size}` |
| `fetch_schedule` | TEXT | Cron expression (`0 */4 * * *` RSS default, `0 */12 * * *` website default) |
| `is_enabled` | BOOL | |
| `last_fetch_at` | TIMESTAMPTZ | Updated after every fetch attempt |
| `last_fetch_status` | TEXT | `success`, `partial`, `failed`, `pending` |
| `last_fetch_error` | TEXT | Last error message |
| `fetch_count` | INTEGER | Incremented by `update_source_health` trigger |
| `error_count` | INTEGER | Incremented on failure by trigger |
| `health_score` | REAL | 0.0–1.0, rolling weighted average |
| `tags` | TEXT[] | |
| `default_context_asset_ids` | UUID[] | Context assets applied by default |
| `default_agent_id` | UUID | FK → agents (nullable) |

RLS: Org members can SELECT. Only the creator can UPDATE/DELETE.

### `digest_source_items`
Individual pieces of content ingested from a source.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `source_id` | UUID | FK → digest_sources (CASCADE DELETE) |
| `org_id` | UUID | FK → organizations |
| `external_id` | TEXT | URL, GUID, or SHA-256 hash — used for deduplication |
| `title` | TEXT | |
| `url` | TEXT | |
| `author` | TEXT | |
| `published_at` | TIMESTAMPTZ | |
| `raw_content` | TEXT | Full extracted text |
| `content_hash` | TEXT | SHA-256 of raw_content |
| `metadata` | JSONB | `{word_count, categories[], language, original_html}` |
| `processing_status` | TEXT | `pending`, `processing`, `completed`, `failed`, `skipped` |
| `file_path` | TEXT | Supabase Storage path (documents only) |
| `file_size` | INTEGER | |
| `mime_type` | TEXT | |
| `search_vector` | TSVECTOR | Auto-updated by trigger; weighted A=title, B=author, C=content |

UNIQUE constraint on `(source_id, external_id)` — prevents duplicates.

### `digest_summaries`
Structured AI output for a source item.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `org_id` | UUID | |
| `item_id` | UUID | FK → digest_source_items (nullable for multi-item summaries) |
| `item_ids` | UUID[] | For future multi-document summarization |
| `summary_type` | TEXT | `headline`, `brief`, `detailed` |
| `title` | TEXT | AI-generated title |
| `summary` | TEXT | Main summary text |
| `key_points` | JSONB | Array of strings |
| `entities` | JSONB | `[{name, type: person\|org\|product\|topic, salience}]` |
| `sentiment` | JSONB | `{score: float, label: positive\|neutral\|negative, confidence: float}` |
| `topics` | TEXT[] | Topic classification tags |
| `source_attribution` | JSONB | `[{source_name, url, title}]` |
| `context_analysis` | JSONB | `{relevance_score, opportunities[], threats[], alignment_notes, action_items[]}` |
| `context_asset_ids` | UUID[] | Which context assets were applied |
| `agent_id` | UUID | FK → agents (when Agent mode was used) |
| `processing_mode` | TEXT | `ai_summary`, `agent`, `raw` |
| `model_used` | TEXT | e.g., `claude-sonnet-4-20250514` |
| `tokens_used` | INTEGER | |
| `processing_time_ms` | INTEGER | |
| `search_vector` | TSVECTOR | Weighted A=title+topics, B=summary |

### `digest_configs`
User-owned digest configuration.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `org_id` | UUID | |
| `user_id` | UUID | Owner |
| `name` | TEXT | Default: `'Default Digest'` |
| `source_ids` | UUID[] | Default source pool for sections that don't specify their own |
| `summary_depth` | TEXT | `headline`, `brief`, `detailed` |
| `topics_of_interest` | TEXT[] | Future filter capability |
| `schedule` | TEXT | Not currently auto-run; intended for future cron scheduling |
| `is_enabled` | BOOL | |
| `max_items_per_digest` | INTEGER | Default: 20 |
| `group_related` | BOOL | Default: true (reserved for future grouping logic) |

UNIQUE on `(user_id, name)`.

### `digest_sections`
Ordered sections within a digest config.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `config_id` | UUID | FK → digest_configs (CASCADE DELETE) |
| `name` | TEXT | |
| `slug` | TEXT | Auto-generated from name; UNIQUE per config |
| `description` | TEXT | |
| `icon` | TEXT | Lucide icon name |
| `source_ids` | UUID[] | Section-specific sources (overrides config.source_ids if set) |
| `processing_mode` | TEXT | `ai_summary`, `agent`, `raw` |
| `agent_id` | UUID | FK → agents |
| `context_asset_ids` | UUID[] | Context assets for this section |
| `enrichment_prompt` | TEXT | Additional instructions appended to system prompt |
| `max_items` | INTEGER | Default: 10 |
| `summary_depth` | TEXT | Overrides config-level depth |
| `sort_order` | INTEGER | Auto-incremented on insert |
| `is_enabled` | BOOL | Disabled sections are skipped during generation |

### `digests`
Generated digest output.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `config_id` | UUID | FK → digest_configs |
| `org_id` | UUID | |
| `user_id` | UUID | |
| `date` | DATE | Generation date (YYYY-MM-DD) |
| `status` | TEXT | `pending`, `generating`, `completed`, `failed`, `partial` |
| `content` | JSONB | `{sections: [{name, icon, status, items: [...], tokens_used}]}` |
| `summary_ids` | UUID[] | All digest_summaries IDs included |
| `total_items_processed` | INTEGER | |
| `total_tokens_used` | INTEGER | |
| `generation_started_at` | TIMESTAMPTZ | |
| `generation_completed_at` | TIMESTAMPTZ | |
| `error_message` | TEXT | |
| `search_vector` | TSVECTOR | Built from section names in content JSON |

UNIQUE on `(config_id, date)` — one digest per config per day.

### `digest_analytics`
Daily aggregated stats per organization. Not yet surfaced in UI but populated for future dashboards.

---

## Full-Text Search

Three tables carry `TSVECTOR` columns updated by triggers on INSERT/UPDATE:

| Table | Trigger Function | Weighted Fields |
|-------|-----------------|-----------------|
| `digest_source_items` | `digest_items_search_update` | A=title, B=author, C=raw_content (first 10K chars) |
| `digest_summaries` | `digest_summaries_search_update` | A=title+topics, B=summary |
| `digests` | `digests_search_update` | B=section names from content JSON |

Search is executed via the `digest_search` PostgreSQL function (called via Supabase RPC from `digestPipeline.searchDigest()`). It performs a `UNION ALL` across `digest_source_items` and `digest_summaries`, applying `ts_rank_cd` for relevance ranking and `ts_headline` for snippet generation with `<mark>` tags.

Parameters: `p_org_id`, `p_query`, `p_source_ids[]`, `p_date_from`, `p_date_to`, `p_topics[]`, `p_content_type` (`all`/`items`/`summaries`), `p_limit`, `p_offset`.

---

## Source Health Algorithm

The `update_source_health` trigger fires on `BEFORE UPDATE` of `last_fetch_status`. It uses an exponential moving average (EMA) approximation with 90% weight on the old value:

```sql
-- Success: health nudges toward 1.0
health_score = LEAST(1.0, old_health_score * 0.9 + 0.1)

-- Failure: health decays toward 0.0
health_score = GREATEST(0.0, old_health_score * 0.9)
```

A new source starts at `1.0`. After ~20 consecutive failures, health reaches approximately `0.12`. After ~20 consecutive successes from a low score, health recovers to approximately `0.88`.

Frontend thresholds: ≥70% = green, 30–69% = amber, <30% = red.

---

## Content Fetchers

All four fetchers are lazy-loaded in `digestSourceService.js` to avoid startup overhead.

### rssFetcher
Uses the `rss-parser` npm package. Extracts `title`, `content` (or `contentSnippet`), `link`, `creator`, `pubDate`, and `categories`. Deduplication key: item `link` or `guid`.

### websiteFetcher
Uses `node-fetch` + `@mozilla/readability` (via `jsdom`). Respects `config.selectors` overrides for `title`, `content`, and `date` CSS selectors. Includes SSRF protection: blocks private IP ranges (10.x, 192.168.x, 172.16–31.x, 127.x, ::1).

### documentFetcher
Handles file uploads sent as `multipart/form-data` via `multer` (memory storage, 50 MB limit). Text extraction per MIME type:
- PDF: `pdf-parse`
- DOCX: `mammoth`
- TXT/MD/CSV: raw buffer decode

Stores the extracted text as `raw_content`. Files are also written to Supabase Storage with path `digest/{org_id}/{source_id}/{filename}`.

### newsletterFetcher
Pure function — no I/O. Accepts `content` (HTML or plain text) and optional `subject`, `sender`, `date`. Applies Readability for HTML extraction. Returns a single item record.

---

## Summarization Pipeline

`digestPipeline.summarizeItem(item, options)` is the core processing function.

### AI Summary mode
1. Truncates `raw_content` to 15,000 characters
2. Selects model by depth: `headline` → `claude-haiku-4-5-20251001`, `brief`/`detailed` → `claude-sonnet-4-20250514`
3. If `context_asset_ids` are provided, fetches asset content from `context_assets` and injects as an `ORGANIZATIONAL CONTEXT` block in the system prompt
4. If `enrichment_prompt` is set, appends it as `ADDITIONAL ANALYSIS INSTRUCTIONS`
5. Calls Anthropic API with `max_tokens` of 500 (headline), 1500 (brief), or 3000 (detailed)
6. Parses the JSON response — if parsing fails, stores raw text as `summary`
7. Writes result to `digest_summaries`; updates item `processing_status` to `completed`

### Agent mode
1. Truncates `raw_content` to 12,000 characters
2. Calls `executeAgent(agentId, {userMessage, contextAssetIds})` from `agentService.js`
3. Agent's full response text becomes the `summary`; `key_points` and `entities` are empty
4. `context_analysis` records only `{processed_by_agent: agentId}`

### Raw mode
Stores first 5,000 characters of `raw_content` as the summary. No AI calls.

---

## Digest Generation Flow

`digestPipeline.generateDigest(configId, callbacks)`:

1. Loads config with sections via Supabase join
2. Creates a `digests` row with `status: 'generating'`
3. Filters enabled sections sorted by `sort_order`
4. For each section (sequential, not parallel):
   - Determines source pool: `section.source_ids` if set, else `config.source_ids`
   - Queries `digest_source_items` for the most recent N items (`limit = section.max_items || config.max_items_per_digest`)
   - Items with `processing_status = 'completed'` that already have a matching summary depth are reused (no re-processing)
   - Items with `processing_status = 'pending'` are passed to `summarizeItem`
   - Calls `onSectionStart` and `onSectionComplete` callbacks (used by SSE streaming endpoint)
5. Sets final digest `status` based on section results: all completed → `completed`, some completed → `partial`, none → `failed`
6. Updates the `digests` row with `content`, `summary_ids`, token and item counts

### SSE Streaming
`GET /api/digest/generate/stream?config_id=` sets headers for SSE (`text/event-stream`, `X-Accel-Buffering: no`). Events emitted:

| Event | Payload |
|-------|---------|
| `section_start` | `{name, index, total}` |
| `section_complete` | `{name, status, item_count, tokens_used, index, total}` |
| `complete` | `{digest_id, status, total_items, total_tokens}` |
| `error` | `{message}` |

---

## API Endpoints

All endpoints mounted at `/api/digest/`. Authentication via `req.userId` (cookie session). Org resolved from `req.orgId`, `x-org-id` header, `org_id` query param, or `DEFAULT_ORG_ID` env var.

### Source Management
| Method | Path | Description |
|--------|------|-------------|
| GET | `/sources` | List org sources. Filter: `?type=`, `?enabled=`, `?tags=` |
| POST | `/sources` | Create source. Body: `{name, source_type, config, fetch_schedule, tags, default_context_asset_ids, default_agent_id}` |
| PUT | `/sources/:id` | Update source. Allowed fields: `name`, `config`, `fetch_schedule`, `is_enabled`, `tags`, `default_context_asset_ids`, `default_agent_id` |
| DELETE | `/sources/:id` | Delete source and cascade-delete all items |
| POST | `/sources/:id/fetch` | Trigger a manual fetch. Returns `{new_items, duplicates, duration_ms}` |
| GET | `/sources/:id/health` | Return `{health_score, fetch_count, error_count, last_fetch_at, last_fetch_status, last_fetch_error}` |
| POST | `/sources/upload` | Multipart upload. Body: `file` (binary), `source_id`. Max: 50 MB |
| POST | `/sources/:id/newsletter` | Paste newsletter. Body: `{content, subject, sender, date}` |

### Items
| Method | Path | Description |
|--------|------|-------------|
| GET | `/items` | List items. Filter: `?source_id=`, `?status=`, `?limit=`, `?offset=` |
| GET | `/items/:id` | Get single item with full `raw_content` |
| POST | `/items/manual` | Create manual item. Body: `{source_id, title, content, url, author}` |
| POST | `/items/:id/summarize` | Trigger summarization. Body: `{depth, context_asset_ids, agent_id, processing_mode, enrichment_prompt}` |

### Digest Config
| Method | Path | Description |
|--------|------|-------------|
| GET | `/configs` | List user's configs (includes nested sections) |
| POST | `/configs` | Create config. Body: `{name, source_ids, summary_depth, topics_of_interest, schedule, max_items_per_digest, group_related}` |
| PUT | `/configs/:id` | Update config. Updatable: same fields plus `is_enabled` |
| DELETE | `/configs/:id` | Delete config (user must own it) |

### Sections
| Method | Path | Description |
|--------|------|-------------|
| POST | `/configs/:configId/sections` | Add section. Body: `{name, description, icon, source_ids, processing_mode, agent_id, context_asset_ids, enrichment_prompt, max_items, summary_depth}` |
| PUT | `/sections/:id` | Update section. Updatable: all section fields plus `is_enabled`, `sort_order` |
| DELETE | `/sections/:id` | Delete section |

### Generation & Retrieval
| Method | Path | Description |
|--------|------|-------------|
| POST | `/generate` | Non-streaming generation. Body: `{config_id}` |
| GET | `/generate/stream` | SSE streaming generation. Query: `?config_id=` |
| GET | `/latest` | Most recent digest for the authenticated user |
| GET | `/history` | Paginated digest history. Query: `?page=`, `?limit=` |
| GET | `/:id` | Get digest by ID (user must own it) |

### Search & Summaries
| Method | Path | Description |
|--------|------|-------------|
| GET | `/search` | Full-text search. Query: `?q=` (min 2 chars), `?source_ids=`, `?date_from=`, `?date_to=`, `?topics=`, `?type=`, `?limit=`, `?offset=` |
| GET | `/summaries` | Browse summaries. Filter: `?topics=`, `?limit=`, `?offset=` |

### Helpers
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Source health overview for the org |
| GET | `/agents` | Active agents available for digest processing. Filter: `?category=` |
| GET | `/context-assets` | Active context assets available for enrichment |

---

## Row Level Security

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `digest_sources` | Org members | Creator only (`user_id = auth.uid()`) | Creator only | Creator only |
| `digest_source_items` | Org members | Service role (server) | Service role | Service role (CASCADE) |
| `digest_summaries` | Org members | Service role | Service role | Service role |
| `digest_configs` | Owner only | Owner | Owner | Owner |
| `digest_sections` | Via config ownership | Via config | Via config | Via config |
| `digests` | Owner only | Owner | Owner | Owner |
| `digest_analytics` | Org members | Service role | Service role | — |

The server uses the Supabase service key (bypasses RLS) in `digestSourceService.js` and `digestPipeline.js` for all write operations. The route handlers do not rely on user-level Supabase clients.

---

## Module Registration

Registered in `platform_modules` by Phase 66 migration:

| ID | Name | Nav Group | Min Tier | Display Order |
|----|------|-----------|----------|---------------|
| `ai_digest` | AI Digest | `create` | `business` | 62 |
| `ai_digest_admin` | Digest Administration | `admin` | `enterprise` | 95 |

The admin module (`/admin-digest.html`) is not yet implemented as of Phase 66.

---

## Integration Points

### Agent Execution
`digestPipeline.processWithAgent()` calls `agentService.executeAgent(agentId, options)` directly — same execution path as chat.html agent invocations. The agent's system prompt, context assets, and tool capabilities are all active during digest processing.

### Context Injection
`digestPipeline.buildContextBlock()` fetches context asset content from the `context_assets` table and injects it into the AI system prompt. This is a direct database lookup, not a call to `contextInjection.assembleContext()` — it bypasses token budgeting and priority ordering. Asset content is injected in full.

### LLM Registry
Model selection uses hardcoded constants in `digestPipeline.js`:
```javascript
const DEPTH_MODELS = {
    headline: 'claude-haiku-4-5-20251001',
    brief: 'claude-sonnet-4-20250514',
    detailed: 'claude-sonnet-4-20250514'
};
```
These are not read from `llmRegistry.js`. A future improvement would align this with the registry.

---

## Frontend Architecture

### digest.html
- Vanilla JS, no framework
- Page-level state: `currentConfig`, `allSources`, `allAgents`, `allContextAssets`
- Tabs implemented with `data-tab` attribute pattern, toggling `active` class
- Generation uses `EventSource` (native SSE API) against `/api/digest/generate/stream`
- All dialogs use `ModalService.form()` and `ModalService.confirm()` — no inline HTML modals
- Search fires on button click or Enter key in the input

### digest-sources.html
- Same vanilla JS pattern
- Document upload uses a dynamically created `<input type="file">` element — no visible file input in the HTML
- Newsletter paste uses `ModalService.form()` with a textarea field
- Items tab loads lazily (only when tab is clicked)
- Health tab loads lazily

---

## Known Limitations and Tech Debt

1. **No background scheduler**: `fetch_schedule` is stored but not acted upon. Automatic fetching requires an external cron job or a future background worker. As of Phase 66, all fetching is manual.
2. **Context injection bypasses token budgeting**: `buildContextBlock` injects full asset content without the token budget limits applied by `contextInjection.assembleContext()`. Large context assets could exceed model context windows.
3. **Section source assignment is simplified**: When adding a section via the UI, `addSection()` in `digest.html` automatically assigns all current sources to the section (`source_ids: allSources.map(s => s.id)`). Section-level source filtering requires editing the section after creation via the PUT endpoint.
4. **One config per user in practice**: The UI loads only the first config (`json.data[0]`). Multiple configs are supported by the API but not by the frontend.
5. **`digests` UNIQUE on `(config_id, date)`**: Running generation twice on the same day overwrites the existing digest record (UPDATE, not INSERT).
