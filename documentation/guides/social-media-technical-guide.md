# Social Media Technical Guide

**Phase:** 60b
**Last Updated:** 2026-02-25

---

## Architecture Overview

Social Media Publishing in Insight 360 is built as a **proxy layer** over a self-hosted [Postiz](https://postiz.com) instance deployed as a separate Railway service. Insight 360 never exposes Postiz credentials or its internal API to the browser — all OAuth flows, post scheduling, and platform API calls are handled by Postiz. Insight 360 stores post records and analytics locally in Supabase for multi-tenant querying, RLS enforcement, and source attribution.

```
Browser (social-media.html)
        |
        | REST (x-org-id header)
        v
Insight 360 Express API (/api/social/*)
        |
        |-- postizService.js --> Postiz REST API (/public/v1)
        |                              |
        |                              +--> Platform OAuth (Twitter, LinkedIn, etc.)
        |                              +--> Post scheduling engine
        |                              +--> Analytics retrieval
        |
        |-- contentAdapterService.js (pure, no I/O)
        |
        v
Supabase PostgreSQL
    social_posts
    social_platform_connections
    social_post_analytics
```

### Key Design Decisions

- **Postiz as the platform integration layer.** Platform OAuth credentials, token refresh, and rate limiting are all managed by Postiz. This avoids implementing and maintaining eight separate platform integrations.
- **i360 as the authoritative record.** Every post is written to `social_posts` before Postiz is called. The `postiz_post_id` foreign key links local records to Postiz post objects.
- **Per-org API key isolation.** Each Insight 360 organisation has its own Postiz organisation and API key. Keys are AES-256-GCM encrypted at rest in the `organizations` table. No shared API key exists across tenants.
- **Content adaptation is pure.** `contentAdapterService.js` has no I/O and is side-effect free. It can be called in preview contexts without any database or network access.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTIZ_API_URL` | Yes | Internal URL to the Postiz Railway service (e.g., `http://postiz.railway.internal:3000`) |
| `POSTIZ_FRONTEND_URL` | No | Public URL of the Postiz UI, used to generate OAuth connection URLs. Falls back to `POSTIZ_API_URL`. |
| `TOKEN_ENCRYPTION_KEY` | Yes | 32-byte hex string for AES-256-GCM encryption of Postiz API keys. If absent, a random key is generated at startup (keys will not survive restart). |
| `SUPABASE_SERVICE_KEY` | Yes | Used by `postizService.js` to bypass RLS when reading org configuration |

---

## Module Access Control

The `social_publishing` module is registered in `platform_modules` and requires a minimum tier of `business`. Access is enforced at the route level via the `can_access_module` Supabase RPC function in the module middleware at the top of `server/routes/social-publish.js`.

```javascript
const { data: canAccess } = await supabase.rpc('can_access_module', {
    p_user_id: userId,
    p_module_id: 'social_publishing',
    p_org_id: orgId
});
// Returns false → 403 with tier upgrade message
```

Admin-only operations (configure Postiz credentials) additionally check `business_role IN ('owner', 'admin')` directly on the `org_members` table.

---

## Database Schema

### `social_posts`

Stores every post created through Insight 360, including draft, scheduled, publishing, published, failed, and cancelled states.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `org_id` | UUID | FK → `organizations.id`, cascades on delete |
| `user_id` | UUID | FK → `auth.users.id` |
| `content_text` | TEXT | Original content as composed by the user |
| `media_urls` | TEXT[] | Array of media attachment URLs |
| `platforms` | TEXT[] | Platform identifiers targeted (e.g., `['twitter', 'linkedin']`) |
| `platform_post_ids` | JSONB | Map of platform → platform-native post ID after publishing |
| `status` | TEXT | `draft`, `scheduled`, `publishing`, `published`, `failed`, `cancelled` |
| `scheduled_at` | TIMESTAMPTZ | Null = publish immediately |
| `published_at` | TIMESTAMPTZ | Set when Postiz confirms publication |
| `postiz_post_id` | TEXT | Postiz's internal post identifier for status polling |
| `source_type` | TEXT | `manual`, `thought_leadership`, `workflow` |
| `source_id` | UUID | ID of the source entity when not manual |
| `platform_content` | JSONB | Per-platform adapted content from `contentAdapterService` |
| `last_error` | TEXT | Most recent error message for failed posts |
| `retry_count` | INTEGER | Number of delivery retry attempts |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Indexes:** `org_id`, `user_id`, `status`, partial index on `scheduled_at WHERE status = 'scheduled'`

### `social_platform_connections`

Local cache of OAuth connections synced from Postiz. Updated via the `POST /api/social/accounts/sync` endpoint.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `org_id` | UUID | FK → `organizations.id` |
| `connected_by` | UUID | FK → `auth.users.id` |
| `platform` | TEXT | Platform identifier (e.g., `twitter`, `linkedin`) |
| `platform_account_id` | TEXT | Platform-native account ID |
| `platform_account_name` | TEXT | Display name / handle |
| `platform_profile_url` | TEXT | Profile URL |
| `postiz_integration_id` | TEXT | Postiz integration ID used when building post payloads |
| `status` | TEXT | `active`, `disconnected`, `error`, `expired` |
| `last_error` | TEXT | |
| `last_used_at` | TIMESTAMPTZ | |

**Unique constraint:** `(org_id, platform, platform_account_id)` — upserted on sync.

### `social_post_analytics`

One row per platform per post. Populated asynchronously when Postiz retrieves engagement data.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `post_id` | UUID | FK → `social_posts.id`, cascades on delete |
| `platform` | TEXT | |
| `impressions` | INTEGER | |
| `likes` | INTEGER | |
| `comments` | INTEGER | |
| `shares` | INTEGER | |
| `clicks` | INTEGER | |
| `reach` | INTEGER | |
| `raw_metrics` | JSONB | Full platform-native metrics object |
| `fetched_at` | TIMESTAMPTZ | |

### `organizations` table additions

Two columns are added to the existing `organizations` table:

| Column | Type | Notes |
|--------|------|-------|
| `postiz_org_id` | TEXT | Postiz organisation identifier |
| `postiz_api_key_encrypted` | TEXT | AES-256-GCM encrypted API key: `{iv_hex}:{auth_tag_hex}:{ciphertext_hex}` |

### `subscription_tiers` additions (Phase 60b)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `max_social_posts_monthly` | INTEGER | 0 | Monthly post ceiling. `0` = not included, `-1` = unlimited |
| `max_social_channels` | INTEGER | 0 | Connected channel ceiling. `0` = not included, `-1` = unlimited |

### `org_module_purchases` additions (Phase 60b)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `addon_limits` | JSONB | `{}` | Resource limits granted by an add-on purchase. For social: `{"social_posts_monthly": N, "social_channels": N}` |

### Database Helper Functions (Phase 60b)

#### `check_org_limits(p_org_id UUID, p_resource_type TEXT)`

Extended in Phase 60b to support two new resource types:

- `'social_posts'` — counts non-cancelled posts in the current calendar month from `social_posts`. Uses `max_social_posts_monthly` from the tier, with automatic fallback to `get_social_addon_limit()` when the tier value is `0`.
- `'social_channels'` — counts active rows in `social_platform_connections`. Uses `max_social_channels` from the tier, with the same addon fallback.

Returns: `(current_count INTEGER, max_allowed INTEGER, within_limits BOOLEAN, usage_percent NUMERIC(5,2))`

Semantics: `within_limits` is `TRUE` when `max_allowed = -1` (unlimited) or `current_count < max_allowed`. `usage_percent` is `0.00` for unlimited tiers.

#### `get_social_addon_limit(p_org_id UUID, p_limit_key TEXT)`

New helper called internally by `check_org_limits`. Queries `org_module_purchases` for an active, non-expired `social_publishing` purchase and returns the integer value of `addon_limits->>p_limit_key`. Returns `0` if no active purchase exists. Valid keys: `'social_posts_monthly'`, `'social_channels'`.

```sql
-- Example: get post limit for a Starter org with an active add-on
SELECT get_social_addon_limit('org-uuid', 'social_posts_monthly');
-- Returns: 100
```

---

## Row Level Security

All three social tables have RLS enabled. Policy summary:

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| `social_posts` | Org members | Org members | Author or org admin | Author or org admin |
| `social_platform_connections` | Org members | Org admins | Org admins | Org admins |
| `social_post_analytics` | Via post's org membership | — | — | — |

The `organizations` columns (`postiz_org_id`, `postiz_api_key_encrypted`) inherit the existing `organizations` RLS policies. `postizService.js` reads them with the service key to bypass RLS.

---

## Tier-Based Usage Limits (Phase 60b)

Phase 60b replaces the old `resource_limits` JSONB approach with two dedicated columns on `subscription_tiers`. The earlier `social_platforms` JSONB key is cleaned up by the migration.

### `subscription_tiers` new columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `max_social_posts_monthly` | INTEGER | 0 | Monthly post ceiling. `0` = not included, `-1` = unlimited |
| `max_social_channels` | INTEGER | 0 | Connected channel ceiling. `0` = not included, `-1` = unlimited |

### Limits per tier

| Tier slug | Monthly posts | Connected channels |
|-----------|--------------|-------------------|
| `starter` | 0 (add-on available) | 0 (add-on available) |
| `business` | 500 | 5 |
| `enterprise` | 2,000 | 15 |
| `agency_starter` | 1,000 | 15 |
| `agency_professional` | 5,000 | 50 |
| `agency_enterprise` | -1 (unlimited) | -1 (unlimited) |
| `platform` | -1 (unlimited) | -1 (unlimited) |

### Starter Tier Add-On

The `social_publishing` module in `platform_modules` is marked `is_addon_purchasable = TRUE`:

| Field | Value |
|-------|-------|
| `addon_price_monthly` | $29.00 |
| `addon_price_yearly` | $290.00 |
| `addon_description` | "Publish to 8+ social platforms. Includes 100 posts/month and 3 connected channels..." |

When a Starter org purchases this add-on, the addon-specific limits are stored in the new `addon_limits` JSONB column on `org_module_purchases`:

```json
{ "social_posts_monthly": 100, "social_channels": 3 }
```

### `org_module_purchases` schema addition

```sql
ALTER TABLE org_module_purchases
    ADD COLUMN IF NOT EXISTS addon_limits JSONB DEFAULT '{}';
```

This column holds resource overrides for any purchasable add-on module. For social publishing the relevant keys are `social_posts_monthly` and `social_channels`.

---

## API Endpoints

All endpoints are mounted at `/api/social` in `server/routes/social-publish.js`.

### Configuration

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/social/config` | Any user | Returns `{ configured, supportedPlatforms, platformLimits }`. Tells the UI whether Postiz is set up. |
| `POST` | `/api/social/config` | Org admin | Saves `postizOrgId` and `apiKey` (encrypted) to the `organizations` table. |

### Usage (Phase 60b)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/social/usage` | Any user | Returns current post and channel usage vs plan limits. Response shape described below. |

**Response shape:**

```json
{
  "posts": {
    "current_count": 47,
    "max_allowed": 500,
    "within_limits": true,
    "usage_percent": 9.40
  },
  "channels": {
    "current_count": 3,
    "max_allowed": 5,
    "within_limits": true,
    "usage_percent": 60.00
  }
}
```

`max_allowed: -1` means unlimited. `max_allowed: 0` means the feature is not included in the org's current plan and no active add-on was found.

Both values are retrieved via `check_org_limits()` RPC, which automatically applies add-on overrides for Starter orgs that have purchased the social add-on.

### Connected Accounts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/social/accounts` | Any user | Returns merged list of supported platforms + connection status from `social_platform_connections`. |
| `POST` | `/api/social/accounts/sync` | Any user | Calls `GET /public/v1/integrations` on Postiz and upserts results into `social_platform_connections`. Returns a `warning` field in the response body when channel usage reaches 80% of the plan limit. |
| `GET` | `/api/social/accounts/oauth-url/:platform` | Any user | Returns the Postiz frontend URL for connecting a new platform account via OAuth popup. |

**Sync channel-limit warning shape (when `usage_percent >= 80`):**

```json
{
  "success": true,
  "synced": 3,
  "integrations": [...],
  "warning": "Using 4 of 5 channels"
}
```

### Posts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/social/posts` | Any user | Adapts content, checks monthly post limit, calls Postiz `POST /public/v1/posts`, writes to `social_posts`. Returns `429` if the monthly post limit is exceeded. |
| `GET` | `/api/social/posts` | Any user | Lists posts filtered by `?status=` and/or `?platform=`. Joins `social_post_analytics`. |
| `GET` | `/api/social/posts/:id` | Any user | Returns a single post with analytics. |
| `DELETE` | `/api/social/posts/:id` | Author or admin | Calls Postiz `DELETE /public/v1/posts/:postiz_id`, sets local status to `cancelled`. |
| `GET` | `/api/social/scheduled` | Any user | Proxies `GET /public/v1/posts?from=&to=` for a date-range view of Postiz-side scheduled posts. |

**Post limit enforcement — 429 response shape:**

```json
{
  "error": "Monthly post limit reached",
  "current": 500,
  "limit": 500,
  "upgradeMessage": "Upgrade your plan for more social media posts"
}
```

The check calls `check_org_limits(orgId, 'social_posts')` before any content adaptation or Postiz API call. Cancelled posts are excluded from the monthly count (`status NOT IN ('cancelled')`). The count window is the current calendar month (`date_trunc('month', NOW())`).

### Content Adaptation

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/social/adapt` | Any user | Pure preview — calls `contentAdapterService.adaptForAllPlatforms()` and returns adapted content without creating any records. |
| `GET` | `/api/social/platforms` | Any user | Returns the supported platforms list and per-platform limit objects. |

### Analytics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/social/analytics` | Any user | Returns 30-day (or `?days=N`) summary aggregated from `social_posts` + `social_post_analytics`. |
| `GET` | `/api/social/optimal-time/:platform` | Any user | Proxies Postiz `GET /public/v1/find-slot/:integrationId` to suggest an optimal posting slot. |

### Media Upload

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/social/media` | Any user | Accepts raw binary body (max 50 MB, `x-filename` header). Proxies to Postiz `POST /public/v1/upload` as multipart form data. Returns the Postiz media URL. |

---

## postizService.js

Wraps the Postiz REST API (`/public/v1`). Key behaviours:

### Encryption

API keys are encrypted with AES-256-GCM using the `TOKEN_ENCRYPTION_KEY` environment variable:

```
stored format: {iv_hex}:{auth_tag_hex}:{ciphertext_hex}
```

This is the same pattern used by `linkedinService.js`. The service key is required to read the org configuration because it bypasses RLS.

### Request Resilience

All outbound Postiz calls go through `withResilience()` from `reliability.js` with:
- 30-second timeout
- 2 retries
- A dedicated `postiz-api` circuit breaker (CLOSED → OPEN → HALF_OPEN)

### Post Creation Flow

1. `getConnectedPlatforms(orgId)` — reads `social_platform_connections` for active rows matching the requested platform list.
2. Builds a Postiz payload mapping each platform connection to its `postiz_integration_id`.
3. Calls `POST /public/v1/posts` with `type: 'now'` or `type: 'schedule'` and the `date` field.
4. Writes a local `social_posts` row with `postiz_post_id` referencing the Postiz result.

### Account Sync

`syncIntegrations()` calls `GET /public/v1/integrations`, then upserts each integration into `social_platform_connections` using the `(org_id, platform, platform_account_id)` unique constraint.

---

## contentAdapterService.js

A pure transformation service — no database calls, no HTTP calls. Stateless and synchronous except for logging.

### Platform Limits (PLATFORM_LIMITS constant)

| Platform | `maxChars` | Key Rules |
|----------|-----------|-----------|
| Twitter | 280 | Links counted as 23 chars (t.co); threads auto-generated when content exceeds limit |
| LinkedIn | 3,000 | Up to 5 hashtags appended |
| Instagram | 2,200 | Up to 30 hashtags; hashtags separated from caption by `.\n.\n.\n`; `requiresMedia: true` flag |
| TikTok | 2,200 | Up to 30 hashtags; `requiresVideo: true` flag |
| Facebook | 63,206 | Up to 5 hashtags; article link formatted with chain emoji |
| YouTube | title: 100, description: 5,000 | Hashtags also returned as `tags[]` array |
| Pinterest | title: 100, description: 500 | `requiresImage: true`; article URL set as `link` field |
| Threads | 500 | Up to 5 hashtags; up to 10 images |

### Twitter Thread Generation (`createTwitterThread`)

Content is split on sentence boundaries (`/(?<=[.!?])\s+/`). Thread numbering (`1/N`, `2/N`) is appended to each tweet. Hashtags are appended to the final tweet. The first tweet receives the article URL when one is provided.

### Adaptation Output Shape

Each platform returns a consistent object:

```javascript
{
    text: string,          // Primary text content
    title?: string,        // YouTube and Pinterest titles
    thread?: string[],     // Twitter thread tweets array
    isThread?: boolean,    // True when Twitter thread was created
    tags?: string[],       // YouTube tags (hashtags without #)
    link?: string,         // Pinterest destination URL
    media?: string[],      // Sliced media URLs within platform limits
    requiresMedia?: boolean,  // Instagram, Pinterest
    requiresVideo?: boolean   // TikTok
}
```

---

## Workflow Integration

A `social_publish` step type is registered in `workflowEngine.js`. This allows workflows to include social publishing as an automated step, with `sourceType: 'workflow'` and `sourceId` set to the workflow run ID stored in `social_posts`.

---

## Frontend Integration

**File:** `public/social-media.html`

### Initialisation Sequence

```javascript
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Restore theme
    document.documentElement.setAttribute('data-theme', savedTheme);
    // 2. Navigation
    await initNavigation();
    // 3. Icons
    lucide.createIcons();
    // 4. Set minimum datetime for schedule picker
    // 5. Attach character counter listener
    // 6. Load social config (shows setup banner if not configured)
    // 7. Load connected accounts
});
```

Note: `ModalServiceLoader` is loaded via `<script src="/js/modal-service/loader.js" data-auto-load>` and is used for the configuration dialog (`showConfigModal()`). The `disconnectPlatform()` and `cancelPost()` functions currently use `window.confirm()` — these should be migrated to `ModalService.confirm()` in a future phase.

### Usage Bar (Phase 60b)

The Compose tab contains a `#usageBar` element with two meters: posts-this-month and connected channels. It is hidden by default (`display: none`) and shown only when at least one limit is greater than zero.

The `loadUsage()` function calls `GET /api/social/usage` and updates the DOM:

```javascript
// Fill colour thresholds
pct >= 90  → 'usage-fill danger'   // red
pct >= 70  → 'usage-fill warning'  // amber
else       → 'usage-fill'          // primary (blue)
```

For unlimited tiers (`max_allowed === -1`), the fill is set to `0%` and the text shows `{current} / Unlimited`. The bar is hidden entirely when both `max_allowed` values are `0` (plan does not include the feature and no add-on is active).

`loadUsage()` is called on page load and again after every successful post creation so the meter reflects the new count immediately.

### State Management

Four module-level variables hold runtime state:

| Variable | Type | Description |
|----------|------|-------------|
| `socialConfig` | Object | Config response including `configured`, `platformLimits` |
| `platformAccounts` | Array | Merged platform list with connection status |
| `selectedPlatforms` | Array | Platform IDs currently checked in the composer |
| `allPosts` | Array | Not currently used; reserved for future local caching |

### Character Limit Display

The composer reads `socialConfig.platformLimits` to find the minimum `maxChars` across all selected platforms and displays it as `{chars} / {limit} characters`. The counter turns red and gains the `over-limit` class when the limit is exceeded.

### Tab Loading Strategy

Tab content is loaded lazily when the tab is activated:

- **Scheduled** → `loadPosts('scheduled')` — filters `social_posts` where `status = 'scheduled'`
- **History** → `loadPosts('published')` — filters for `status IN ('published', 'failed')`
- **Analytics** → `loadAnalytics()` — calls `GET /api/social/analytics?days=30`

### Org Identity

The page reads `insight360-org-id` from `localStorage` and passes it as the `x-org-id` header on all API requests. This matches the multi-tenant authentication pattern used across the platform.

---

## Security Considerations

- **API key encryption at rest.** Postiz API keys are AES-256-GCM encrypted in the `organizations` table. The plaintext key is only held in memory during a request and never logged.
- **`TOKEN_ENCRYPTION_KEY` criticality.** Loss of this key means all stored Postiz credentials are unrecoverable. It must be stored as a Railway secret (not in code or version control) and backed up.
- **Service key isolation.** `postizService.js` creates its own Supabase client with `SUPABASE_SERVICE_KEY` to read org credentials. This bypasses RLS intentionally for the configuration lookup; it does not expose user data.
- **Admin-only configuration.** The `POST /api/social/config` endpoint verifies `business_role IN ('owner', 'admin')` before saving Postiz credentials.
- **No browser-to-Postiz traffic.** OAuth popup URLs point to the Postiz frontend for authorisation but the resulting tokens are stored in Postiz, never in the browser or in Insight 360's database.
- **RLS on all social tables.** Users can only query posts and connections belonging to their organisation. Cross-tenant access is not possible via the REST API.
- **Media upload size limit.** The `POST /api/social/media` endpoint accepts up to 50 MB raw bodies via `express.raw()`. This is enforced server-side before the file is forwarded to Postiz.
- **Module access middleware.** Every route in `social-publish.js` is gated by the `can_access_module('social_publishing')` RPC call. Users on the Starter tier receive a 403 with a clear upgrade prompt.

---

## Adding a New Platform

1. Add the platform to `PLATFORM_LIMITS` in `contentAdapterService.js` with its constraints.
2. Implement an `adaptForNewPlatform()` function following the same pattern as existing adapters.
3. Add a `case` for the platform in the `adaptContent()` switch statement.
4. Add the platform entry to the `getSupportedPlatforms()` array with `id`, `name`, `icon` (Lucide icon name), and `color`.
5. If the new platform should count against connected channel limits, it will be included automatically because `check_org_limits('social_channels')` counts all active rows in `social_platform_connections` regardless of platform. No `subscription_tiers` schema change is required for adding a platform.
6. Update this technical guide and the user guide with the new platform's characteristics.
