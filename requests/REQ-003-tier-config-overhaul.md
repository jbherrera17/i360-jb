# REQ-003 Implementation Blueprint
## Tier Configuration Overhaul + Per-Org Overrides + Synergi Website Sync

**Status:** READY FOR IMPLEMENTATION
**Author:** Higgins (with pricing-strategist, Explore, and Plan agents)
**Date:** 2026-04-29
**Owner:** JB Herrera
**Phases introduced:** Phase 87 (tier matrix + sync) and Phase 88 (per-org overrides)
**Repos touched:** `insight-360`, `synergi-website`

---

## 1. Goal

Three integrated outcomes:

1. **Reconfigure the tier model** — collapse to four customer-facing tiers, reprice based on competitive analysis, and introduce explicit per-tier per-module Core / Optional / None access control with marketing-copy fields.
2. **Add per-organization configuration overrides** — let JB (platform admin) override resource limits and module access for individual customers (e.g., Acme Corp gets +15 agents and a normally-Optional module flipped to Core), with full audit trail.
3. **Build automated sync to the Synergi marketing website** — every save in the i360 admin auto-opens a GitHub PR to the `synergi-website` repo with an updated `data/pricing-tiers.json`. JB manually merges; Vercel auto-deploys on merge. Per-org overrides MUST never leak to the public site.

---

## 2. Decision Set (all 12 questions resolved)

| # | Question | Decision |
|---|---|---|
| 1 | Tier count | **4 tiers** — Starter / Business / Enterprise / Agency. Collapse current Agency Starter / Pro / Enterprise into a single Agency tier. |
| 2 | Trial tier handling | **Option B** — `trial_expires_at` timestamp on `organizations`. While active, runtime overrides effective tier to Business. No row in `subscription_tiers`. |
| 3 | Stripe price regeneration | **Manual** — JB creates new Stripe Price IDs and updates via existing tier admin UI. |
| 4 | GitHub auth | **Personal Access Token (PAT)**, fine-grained, on `synergi-website` repo. 90-day expiry. |
| 5 | Sync trigger | **Auto on save**, with mandatory pre-flight validation (Zod), confirmation toast on PR open, error banner on failure, and a status panel showing last 10 sync attempts. |
| 6 | Auto-merge PRs | **No — manual merge always.** JB reviews diff before public deploy. |
| 7 | Diff format in PR body | **Markdown.** Sections: Pricing changes, Module access changes, Marketing copy changes, New/Removed. |
| 8 | Per-tier `resource_overrides` JSONB | **Keep.** Required for cases like Customer Support AI conversation caps differing per tier (500 / 2,000 / unlimited / 500-per-client). |
| 9 | Synergi pricing page redesign | **UI/UX designer ships brand redesign first**, then we make it data-driven against `pricing-tiers.json`. Sequence: design → static HTML → swap to renderer. |
| 10 | Override audit visibility | **Platform admin only.** Org owners do not see override history. |
| 11 | Tier defaults change while overrides exist | **Overrides persist.** Surface alerts to platform admin via `tier_default_change_alerts` table + badge on `admin-org-config.html`. Highlight side-cell (lateral) and up-cell (improvement) changes prominently. |
| 12 | Reason textarea on overrides | **Hard-required.** Cannot save without filling in. Writes to `org_config_change_log`. |

---

## 3. Pricing Recommendations (from pricing-strategist audit)

| Tier | Current | Recommended Monthly | Recommended Annual | Effective per seat |
|---|---|---|---|---|
| Starter | $29/mo | **$49/mo** | $490/yr | $16.33/seat (3 seats) |
| Business | $99/mo | **$249/mo** | $2,490/yr | $24.90/seat (10 seats) |
| Enterprise | $299/mo | **$799/mo** | $7,990/yr | $7.99/seat (100 seats) |
| Agency | $499/mo | **$999/mo** | $9,990/yr | $19.98/seat (50 seats) |

All tiers clear 65% margin floor (Business and Enterprise at ~87%). Annual discount: 2 months free (16.7%). Full module Core / Optional / None matrix delivered by pricing-strategist; values seeded in `phase87b-tier-module-seed.sql`.

---

## 4. Architecture: Three-Layer Configuration Model

```
Layer 1 — Tier defaults
  Source: subscription_tiers + tier_module_access (Phase 87)
  Visibility: PUBLIC — synced to synergi-website/data/pricing-tiers.json
  Authority: JB via admin-tier-setup.html

Layer 2 — Org overrides
  Source: org_module_overrides + org_resource_overrides + org_config_change_log (Phase 88)
  Visibility: PRIVATE — platform admin only, never synced
  Authority: JB via admin-org-config.html

Layer 3 — Trial overlay (runtime only, no schema)
  Source: organizations.trial_expires_at
  Visibility: Internal — affects effective access checks during trial window
  Authority: Auto-applied at signup; manually adjustable
```

The `effectiveConfigResolver` service merges all three layers and is the only path runtime checks should use.

---

## 5. Schema Changes

### Phase 87 — `db/phase87-tier-module-matrix.sql`

```sql
-- Marketing-copy columns on subscription_tiers
ALTER TABLE subscription_tiers
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS target_customer TEXT,
  ADD COLUMN IF NOT EXISTS feature_highlights JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cta_label TEXT DEFAULT 'Get Started',
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- Per-tier-per-module access matrix
CREATE TABLE tier_module_access (
  tier_id     TEXT NOT NULL REFERENCES subscription_tiers(id) ON DELETE CASCADE,
  module_id   TEXT NOT NULL REFERENCES platform_modules(id)   ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('core','optional','none')),
  addon_price_monthly   NUMERIC(10,2),
  addon_price_yearly    NUMERIC(10,2),
  resource_overrides    JSONB DEFAULT '{}'::jsonb,
  addon_description     TEXT,
  display_order_override INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tier_id, module_id),
  CONSTRAINT addon_price_only_when_optional CHECK (
    (access_type = 'optional' AND addon_price_monthly IS NOT NULL)
    OR (access_type <> 'optional' AND addon_price_monthly IS NULL AND addon_price_yearly IS NULL)
  )
);

-- Sync audit trail
CREATE TABLE pricing_sync_history (
  id BIGSERIAL PRIMARY KEY,
  triggered_by_user_id UUID REFERENCES auth.users(id),
  triggered_by_email TEXT,
  payload JSONB NOT NULL,
  payload_sha256 TEXT NOT NULL,
  diff_markdown TEXT,
  pr_url TEXT,
  pr_number INT,
  branch_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','opened','merged','closed','failed','skipped')),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trial timestamp
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

-- Deprecation comments on legacy module-level pricing
COMMENT ON COLUMN platform_modules.min_tier IS 'DEPRECATED Phase 87. Authoritative: tier_module_access. Remove Phase 89.';
COMMENT ON COLUMN platform_modules.is_addon_purchasable IS 'DEPRECATED Phase 87. Use tier_module_access.access_type.';
COMMENT ON COLUMN platform_modules.addon_price_monthly IS 'DEPRECATED Phase 87. Use tier_module_access.addon_price_monthly.';
COMMENT ON COLUMN platform_modules.addon_price_yearly IS 'DEPRECATED Phase 87.';

-- RLS: tier_module_access readable by authenticated, writable by platform admin
-- pricing_sync_history readable/writable by platform admin only
```

Companion files:
- `db/phase87b-tier-module-seed.sql` — backfills `tier_module_access` from existing `min_tier` + `is_addon_purchasable`, then applies strategist-recommended Core/Optional/None matrix overrides.
- `db/phase87c-tier-marketing-copy-seed.sql` — JB-authored tagline / target_customer / feature_highlights / cta_label / is_featured for the four tiers.
- `db/phase87d-reactivate-modules.sql` — sets `is_active = true` on Phase 86 deactivated modules (`align120, execute120, s2e, strategy_governance, thought_leadership, research_studio, briefing, ai_digest, social_publishing`), run AFTER 87b so they land with correct tier access.

### Phase 88 — `db/phase88-org-config-overrides.sql`

```sql
CREATE TABLE org_module_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_id text NOT NULL REFERENCES platform_modules(id) ON DELETE CASCADE,
  access_type text NOT NULL CHECK (access_type IN ('core','optional','none')),
  resource_overrides jsonb DEFAULT '{}'::jsonb,
  override_reason text NOT NULL,                  -- HARD-REQUIRED (Decision #12)
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, module_id)
);

CREATE TABLE org_resource_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  field text NOT NULL CHECK (field IN (
    'max_members','max_agents','max_workflows','max_skills',
    'max_context_assets','max_research_studios',
    'max_monthly_api_calls','max_storage_gb','max_clients'
  )),
  override_value integer NOT NULL,                -- -1 = unlimited (Phase 52 sentinel)
  override_reason text NOT NULL,                  -- HARD-REQUIRED
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, field)
);

CREATE TABLE org_config_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  changed_by_user_id uuid REFERENCES auth.users(id),
  change_type text CHECK (change_type IN ('resource','module','reset')),
  field text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_occl_org_created ON org_config_change_log(org_id, created_at DESC);

-- Tier-default change alerts (Decision #11)
CREATE TABLE tier_default_change_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  module_id text REFERENCES platform_modules(id) ON DELETE CASCADE,
  change_type text CHECK (change_type IN ('lateral','up','down')),  -- side / up / down cells
  old_access_type text,
  new_access_type text,
  old_addon_price_monthly numeric,
  new_addon_price_monthly numeric,
  acknowledged_by_user_id uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_tdca_org_unack ON tier_default_change_alerts(org_id) WHERE acknowledged_at IS NULL;

-- All Phase 88 tables: RLS = platform admin only (Decision #10)

-- Redefine Phase 44 helper functions to consult overrides
-- can_access_module(): grant if override row has access_type IN ('core','optional')
-- check_org_limits(): COALESCE override_value over tier limit
```

---

## 6. Files to Modify (existing)

| Path | Why |
|---|---|
| `server/routes/platformAdmin.js` | Add tier_module_access CRUD, sync trigger/status/preview endpoints, org-override 7 routes (all `requirePlatformAdmin`). Extend `PUT /tiers/:id` for marketing-copy fields. Lines 273–339 (tier PUT), 350–600 (modules), 2144–2173 (legacy addon-pricing — supersede). |
| `server/routes/pricing.js` | Rewrite `/comparison` and `/tiers` to source from `tier_module_access` + marketing-copy fields. Filter `WHERE is_public = true`. |
| `server/middleware/moduleAccess.js` | Replace direct tier reads with `effectiveConfigResolver.getEffectiveModuleAccess()` and `getEffectiveResourceLimit()`. |
| `server/services/anthropic.js`, `openai.js` | If they read tier limits directly, route through resolver. |
| `server/index.js` | No new mounts (existing `/api/platform` and `/api/pricing` routers cover new endpoints). |
| `package.json` | Add `@octokit/rest` dependency. |
| `public/admin-tier-setup.html` | Add marketing-copy editors per tier; replace "Modules Included" + "Module Add-on Pricing" sections (~798–809) with per-tier-per-module matrix editor (3-state: Core / Optional + price / Excluded); add live preview of website tier card; add sticky footer with sync status panel showing last 10 attempts. |
| `public/admin-platform.html` | Add nav link to new `admin-org-config.html`. |
| `public/js/auth-fetch.js` | Reused as-is. |
| `synergi-website/pricing.html` | After UI/UX brand redesign ships, swap hardcoded cards for `pricing-renderer.js` consuming `data/pricing-tiers.json`. Keep static HTML as graceful fallback. |
| `synergi-website/vercel.json` | Add `Cache-Control: public, max-age=60, must-revalidate` header for `/data/pricing-tiers.json`. |
| `synergi-website/CLAUDE.md` | Document `data/pricing-tiers.json` as generated, do-not-hand-edit. |
| `db/phase44-enterprise-multitenancy.sql` | DO NOT EDIT. Phase 88 redefines `can_access_module()` and `check_org_limits()` to consult overrides. |

---

## 7. New Files

| Path | Purpose |
|---|---|
| `db/phase87-tier-module-matrix.sql` | Schema: tier_module_access, marketing-copy columns, sync history, trial timestamps |
| `db/phase87b-tier-module-seed.sql` | Backfill from `min_tier` + apply strategist matrix |
| `db/phase87c-tier-marketing-copy-seed.sql` | JB-authored marketing copy per tier |
| `db/phase87d-reactivate-modules.sql` | Re-enable Phase 86 deactivated modules |
| `db/phase88-org-config-overrides.sql` | Per-org override tables + alerts table + helper redefines |
| `server/services/websiteSyncService.js` | Pure builder: produces canonical `pricing-tiers.json` payload. Includes `assertNoOrgTablesInQuery` runtime guard. |
| `server/services/githubPrService.js` | Octokit wrapper. Methods: `openPricingPr(payload, summary, diffMarkdown)`, `verifyToken()` (for daily health check). |
| `server/services/pricingDiffService.js` | `diffPayloads(prev, next) → markdownString`. Custom formatters for prices, access types, marketing copy. ~150 lines, no heavy library. |
| `server/services/effectiveConfigResolver.js` | `getEffectiveConfig(supabase, orgId)`, `getEffectiveModuleAccess(supabase, orgId, moduleId)`, `getEffectiveResourceLimit(supabase, orgId, field)`. Handles trial overlay. |
| `server/services/orgConfigAuditService.js` | `logChange(orgId, userId, changeType, field, oldValue, newValue, reason)`. Used by every override write. |
| `server/services/tierChangeAlertService.js` | On `tier_module_access` writes, scans `org_module_overrides` and inserts rows into `tier_default_change_alerts` for affected orgs. |
| `public/admin-org-config.html` | Per-org override admin UI: org picker, side-by-side defaults vs. effective view, per-field reset, required reason modal, override history panel, alert badge. |
| `public/js/admin-org-config.js` | Page logic. |
| `synergi-website/data/pricing-tiers.json` | Synced data file (initial commit can be a stub). |
| `synergi-website/js/pricing-renderer.js` | Vanilla JS: fetch JSON, render cards + comparison + addons, wire monthly/annual toggle. |
| `__tests__/services/effectiveConfigResolver.test.js` | Inheritance + override precedence + trial overlay cases |
| `__tests__/services/websiteSyncService.test.js` | Payload generation, diff, idempotency (skipped on hash match) |
| `__tests__/services/websiteSyncService.orgIsolation.test.js` | Asserts sync output excludes org data even with overrides present |
| `__tests__/services/githubPrService.test.js` | Mocked Octokit happy + failure paths |

---

## 8. The `pricing-tiers.json` Contract

Stable schema — the diff service depends on this shape. Sample:

```json
{
  "schema_version": 1,
  "generated_at": "2026-04-29T18:00:00Z",
  "generated_by": "jb@insightdriven.business",
  "tiers": [
    {
      "id": "business",
      "name": "Business",
      "tagline": "For growing teams ready to embed AI into strategy",
      "target_customer": "10–50 person companies that need real strategy tooling, not just chat.",
      "tier_group": "standard",
      "display_order": 20,
      "is_featured": true,
      "price_monthly": 249,
      "price_yearly": 2490,
      "cta_label": "Start free trial",
      "cta_url": "https://app.synergi.ai/signup?tier=business",
      "limits": { "members": 10, "agents": 25, "clients": 0, "workflows": 50, "skills": 100 },
      "features": { "white_label": false, "sso": false, "priority_support": true, "advanced_analytics": true },
      "feature_highlights": [
        "Strategy 120 + Align 120 + Execute 120",
        "Research Studio with deep web search",
        "Soul Configuration & values alignment",
        "Workflow automation (50/mo)",
        "Thought Leadership content engine"
      ],
      "modules": {
        "core": [
          { "id": "strategy120", "name": "Strategy 120", "icon": "compass", "nav_group": "ai-systems" }
        ],
        "optional": [
          { "id": "customer_support_ai", "name": "Customer Support AI", "addon_price_monthly": 99, "addon_price_yearly": 990, "addon_description": "2,000 conversations/mo", "resource_overrides": { "conversations_per_month": 2000 } }
        ]
      }
    }
  ],
  "modules_meta": [ /* per-module metadata used by comparison table */ ],
  "comparison": {
    "groups": [
      {
        "id": "ai-systems",
        "label": "AI 360 Systems",
        "modules": [
          {
            "id": "customer_support_ai", "name": "Customer Support AI", "icon": "headphones",
            "tiers": {
              "starter":   { "access": "optional", "addon_price_monthly": 49,  "note": "500 convos/mo" },
              "business":  { "access": "optional", "addon_price_monthly": 99,  "note": "2,000 convos/mo" },
              "enterprise":{ "access": "optional", "addon_price_monthly": 199, "note": "Unlimited" },
              "agency":    { "access": "optional", "addon_price_monthly": 199, "note": "Unlimited" }
            }
          }
        ]
      }
    ]
  }
}
```

---

## 9. Sync Flow (Option C, auto-on-save)

```
Admin saves tier or module-matrix change in admin-tier-setup.html
  ↓
PUT /api/platform/tiers/:id  OR  PUT /api/platform/tier-modules/bulk
  ↓
Route handler: writes to DB, then invokes websiteSyncService.buildPricingPayload()
  ↓
Compute SHA-256 of payload
  ↓
Look up most recent pricing_sync_history row
  ↓
If hash matches → insert row with status='skipped', return {synced: false, reason: 'no changes'}
  ↓
If hash differs → call pricingDiffService.diffPayloads(prev, next) → Markdown diff
  ↓
Call githubPrService.openPricingPr(payload, summary, diffMarkdown):
  1. octokit.repos.getBranch(main) → get base SHA
  2. octokit.git.createRef(branch=pricing-update/<ISO-timestamp>)
  3. octokit.repos.getContent(data/pricing-tiers.json) → get file SHA
  4. octokit.repos.createOrUpdateFileContents(branch, path, content, sha)
  5. octokit.pulls.create(title, body=diffMarkdown, base=main, head=branch)
  ↓
Insert pricing_sync_history row with status='opened', pr_url, pr_number, branch_name
  ↓
Return {synced: true, pr_url, pr_number} → admin UI shows toast with link
  ↓
JB reviews PR diff → manual merge → Vercel auto-deploys → /pricing live
```

**Validation gates:**
- Zod schema validates payload before opening PR (any malformed payload → fail loudly, status='failed', no PR opened)
- Health check: daily cron hits `octokit.repos.get` to verify token; Slack alert on failure
- Idempotency: payload SHA-256 short-circuits no-op syncs

**Failure modes surfaced to UI:**
- Auth failed → red banner: "GitHub token invalid or expired. Update GITHUB_SYNC_TOKEN."
- Branch already exists → auto-retry with new timestamp; if still failing, surface
- Network error → toast with retry button
- Repo permissions wrong → red banner with explicit fix steps

---

## 10. Required Env Vars (insight-360)

```
GITHUB_SYNC_TOKEN=<fine-grained PAT, Contents:write + PullRequests:write on synergi-website>
GITHUB_SYNC_OWNER=jbherrera17
GITHUB_SYNC_REPO=synergi-website
GITHUB_SYNC_BASE_BRANCH=main
GITHUB_SYNC_DATA_PATH=data/pricing-tiers.json
WEBSITE_SYNC_ENABLED=true   # feature flag to disable sync without code changes
```

---

## 11. Implementation Sequence (integrated)

Time tags: **S** ≈ <2h, **M** ≈ ½–1 day, **L** ≈ 1–3 days.

| # | Step | Size |
|---|---|---|
| 1 | Provision GitHub PAT, add env vars to insight-360 prod | S |
| 2 | Add `@octokit/rest` to `package.json`, install | S |
| 3 | Write & apply `phase87-tier-module-matrix.sql` (staging first, verify constraint catches bad inputs, then prod) | M |
| 4 | Write & apply `phase87b-tier-module-seed.sql` (transactional with row-count assertion) | M |
| 4b | Apply `phase88-org-config-overrides.sql`; redefine `can_access_module` + `check_org_limits` | M |
| 5 | Write & apply `phase87c-tier-marketing-copy-seed.sql` (JB-authored copy) | M |
| 6 | Write & apply `phase87d-reactivate-modules.sql` | S |
| 7 | Build `websiteSyncService.js` (with `assertNoOrgTablesInQuery` guard) | M |
| 7b | Build `effectiveConfigResolver.js` + unit tests | M |
| 8 | Build `pricingDiffService.js` + unit tests | M |
| 8b | Build `tierChangeAlertService.js` + integrate with tier_module_access write paths | M |
| 9 | Build `githubPrService.js` + mocked Octokit tests | M |
| 10 | Add platformAdmin.js routes: tier_module_access CRUD, sync trigger/status/preview, marketing-copy fields on PUT /tiers/:id | M |
| 10b | Add platformAdmin.js routes: 7 org-override endpoints + `orgConfigAuditService` | M |
| 11 | Rewrite `/api/pricing/comparison` and `/api/pricing/tiers` to source from new schema; filter `is_public = true` | M |
| 12 | Migrate `moduleAccess.js` middleware + any direct tier readers to use `effectiveConfigResolver` | M |
| 13 | Stripe price regeneration (manual): create new Price IDs for $49/$249/$799/$999 monthly + annual, update via existing tier admin UI | M |
| 14 | Admin UI overhaul: `admin-tier-setup.html` matrix editor + marketing copy editors + sync status panel + auto-on-save trigger | L |
| 14b | Build `admin-org-config.html` + `admin-org-config.js` (org picker, side-by-side, required-reason modal, history, alert badge) | L |
| 15 | UI/UX designer ships Synergi pricing page brand redesign (out-of-band; static HTML) | L |
| 16 | Synergi: add `data/pricing-tiers.json` initial stub | S |
| 17 | Synergi: build `js/pricing-renderer.js`; rewire `pricing.html` to data-driven (preserves designer's HTML structure) | M |
| 18 | Synergi: `vercel.json` cache headers for `pricing-tiers.json` | S |
| 18b | E2E test: create org override → trigger sync → assert PR diff contains zero org references | M |
| 19 | Verify Vercel auto-deploy on push to main (push no-op test commit, observe preview, merge to main, observe production) | S |
| 20 | Grandfather existing customers: add 90-day window via `org_pricing_grandfather` (separate Phase 87e) + banner on `/billing` | M |
| 21 | E2E smoke: change Business price by $1 in admin → confirm PR opens with correct diff → merge → verify live pricing page | S |
| 22 | Documentation: user guides for `admin-tier-setup.html` and `admin-org-config.html`, register in help-registry, whitelist in docs route | M |
| 22b | Manual: pick a real org, apply resource override, verify `check_org_limits` returns overridden cap AND verify pricing.html still shows tier default | S |
| 23 | Schedule Phase 89: drop deprecated `platform_modules.min_tier`, `is_addon_purchasable`, `addon_price_monthly`, `addon_price_yearly` columns once two release cycles confirm no readers | S |

**Feature flags worth using:**
- `WEBSITE_SYNC_ENABLED` — ship sync route, hide button until website is real
- `tier_module_access_authoritative` runtime flag — falls back to `min_tier` logic until backfill verified in prod

---

## 12. Risks & Mitigations

| # | Risk | Mitigation |
|---|---|---|
| 1 | Backfill mistakes silently flip cells from Core to None on prod | `addon_price_only_when_optional` constraint; phase87b runs in transaction with row-count assertion (`tiers × modules`); ROLLBACK on mismatch; keep `min_tier` columns one release with feature flag for hot-rollback |
| 2 | PR spam from accidental admin saves | `payload_sha256` short-circuits no-op syncs (`status='skipped'`); auto-on-save still hashes before opening PR |
| 3 | GitHub PAT leaks or expires | Env-only storage; 90-day expiry; daily cron health check + Slack alert on failure |
| 4 | Synergi prod page renders blank because `pricing-tiers.json` malformed | Zod validation server-side BEFORE PR opened; renderer keeps static HTML in DOM and only swaps on successful render; Playwright e2e test asserts N cards rendered |
| 5 | Stripe price drift — admin updates `price_monthly` but Stripe still bills old amount | Warn in `PUT /tiers/:id` response when `price_monthly` changed but `stripe_price_id_monthly` not updated in same call; yellow banner in admin UI; gate "Sync to Website" until reconciled |
| 6 | Sync-time leakage of org overrides to public website | `assertNoOrgTablesInQuery` runtime guard scans SQL for `org_module_overrides|org_resource_overrides|organizations`; isolation test in step 18b; `is_public = true` filter on pricing endpoints |
| 7 | Override drift vs. billing reality (Acme has Enterprise limits but pays Business price, no system view) | Future report (out of scope this REQ): summary of overrides by org with delta-vs-tier columns, sourced from `org_resource_overrides` joined to `subscription_tiers` |

---

## 13. Acceptance Criteria

The REQ is considered complete when ALL of the following are true:

1. ✅ Four tiers visible in `admin-tier-setup.html` with prices $49 / $249 / $799 / $999
2. ✅ Per-tier-per-module matrix editor lets admin pick Core / Optional + price / Excluded for every module
3. ✅ Marketing copy fields (tagline, target_customer, feature_highlights, cta_label, is_featured) editable per tier
4. ✅ Saving any tier or module-matrix change auto-triggers a GitHub PR to `synergi-website` with updated `data/pricing-tiers.json` and a Markdown diff
5. ✅ PR creation surfaces success toast with link OR error banner with explicit failure reason
6. ✅ Sync is idempotent — saving with no changes inserts `status='skipped'` row, no PR opened
7. ✅ `admin-org-config.html` lets platform admin override resource limits + module access for any org with required reason
8. ✅ Override changes write to `org_config_change_log` with timestamp, user, old/new values, reason
9. ✅ Tier-default changes affecting orgs with overrides surface alerts on `admin-org-config.html` (badge + per-org alert list)
10. ✅ `effectiveConfigResolver` returns correct merged config for: pure tier defaults, org with overrides, org on trial, org on trial with overrides
11. ✅ Synergi website `/pricing` page renders correctly from `data/pricing-tiers.json` after UI/UX redesign + data-driven rewire
12. ✅ Org overrides are NEVER present in `pricing-tiers.json` — verified by automated isolation test
13. ✅ Existing tests still pass (`npm test`)
14. ✅ User guides + help registry + docs whitelist updated for both new admin pages

---

## 14. Out of Scope (explicitly deferred)

- Custom per-org pricing (orgs pay standard tier price; overrides are concessions, not billing changes)
- Fully bespoke custom tiers (no `is_custom=true` rows)
- Time-bound modifications (no scheduled override expirations)
- Agency Client Portal sub-client custom configs (Decision: scope is direct customers only)
- Drift report (overrides vs. billing reality — future REQ)
- Grandfathering UI/billing logic beyond the 90-day banner (separate Phase 87e if needed beyond MVP)
- Auto-merge logic on PRs (always manual per Decision #6)

---

## 15. Source Documents

- pricing-strategist agent output (competitive analysis, four-tier recommendation, module matrix, margin analysis)
- Explore agent output (current schema, current admin UI, synergi-website repo structure)
- Plan agent output (base implementation plan, 23-step rollout, `pricing-tiers.json` contract)
- Plan agent addendum (Phase 88 per-org override design, sync isolation guards)
- All preserved in conversation history as of 2026-04-29

---

**Next action when JB greenlights execution:** start at Step 1 (provision PAT + env vars). Steps 1–2 are S-sized prep that unblocks everything else.
