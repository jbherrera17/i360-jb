# Phase 48: Integrations — Test Plan

## 1. Automated Test Summary

### Unit Tests

| Test File | Tests | Coverage |
|-----------|:-----:|----------|
| `credentialManager.test.js` | 16 | Encrypt/decrypt roundtrip, null handling, random IV, corrupted data, OAuth state generation/verification/expiry/tampering, credential get/store/remove |
| `baseProvider.test.js` | 15 | Constructor, abstract method contracts (7 methods throw), disconnect, webhook validation, capabilities, sync logging success/failure |
| `integrationRegistry.test.js` | 7 | Register/get/list/has providers, getAvailableProviders with implementation status, getUserIntegrations, getOrgIntegrations, DB error handling |

### Integration Tests

| Test File | Tests | Coverage |
|-----------|:-----:|----------|
| `integrations.test.js` | 15 | Provider discovery (list, detail, 404), user integrations (list, OAuth connect, API key connect, disconnect), subscriptions (list, 400 missing org), data operations (fetch, 401 unconnected), health check, usage increment, 429 rate limit |

### Running Tests

```bash
# All integration framework tests
npx jest credentialManager baseProvider integrationRegistry integrations --no-coverage

# Individual suites
npx jest __tests__/unit/services/credentialManager.test.js
npx jest __tests__/unit/services/baseProvider.test.js
npx jest __tests__/unit/services/integrationRegistry.test.js
npx jest __tests__/integration/routes/integrations.test.js
```

---

## 2. Manual Test Plan

### Prerequisites

- [ ] `db/phase48-integrations.sql` executed in Supabase
- [ ] Server running (`npm run dev`)
- [ ] User logged in with a valid session
- [ ] At least one organization exists with the user as owner/admin

---

### 2.1 Navigation & Page Load

| # | Step | Expected Result | Pass |
|---|------|-----------------|:----:|
| 1 | Click "Integrations" in sidebar under Modules | Page loads with header "Integrations" and plug icon | |
| 2 | Check page layout | Three sections visible: Connected Services (if any), Organization Integrations (if admin), Available Integrations | |
| 3 | Check Available Integrations | Shows Google, Microsoft, Salesforce, HubSpot, Slack cards with correct pricing | |
| 4 | Click Help button (?) | Help modal opens with integrations user guide content | |
| 5 | Verify theme | Page respects dark/light theme setting from localStorage | |

### 2.2 Provider Discovery API

| # | Step | Expected Result | Pass |
|---|------|-----------------|:----:|
| 6 | `GET /api/integrations/providers` | Returns 5 seeded providers (google, microsoft, salesforce, hubspot, slack) | |
| 7 | `GET /api/integrations/providers/google` | Returns Google provider details with `implemented: true` | |
| 8 | `GET /api/integrations/providers/nonexistent` | Returns 404 | |

### 2.3 User Integration — Connect (OAuth)

| # | Step | Expected Result | Pass |
|---|------|-----------------|:----:|
| 9 | Click "Connect" on Google card | `POST /api/integrations/user/google/connect` returns `{ authUrl, state }` | |
| 10 | Verify auth URL | URL points to `accounts.google.com` with correct client_id, scopes, redirect_uri | |
| 11 | Verify state parameter | State is a base64url-encoded payload with HMAC signature | |
| 12 | Complete Google OAuth flow (requires GOOGLE_CLIENT_ID/SECRET) | Redirects to `/integrations.html?connected=google` | |
| 13 | Check user_integrations table | Row created with encrypted tokens, external_email, status='active' | |

### 2.4 User Integration — Connect (API Key)

| # | Step | Expected Result | Pass |
|---|------|-----------------|:----:|
| 14 | POST connect with `{ apiKey: "test-key" }` to an API-key provider | Provider's `testConnection()` called first | |
| 15 | If testConnection succeeds | Credentials stored, status=active | |
| 16 | If testConnection fails | Returns 400 with error details, no credentials stored | |

### 2.5 User Integration — Disconnect

| # | Step | Expected Result | Pass |
|---|------|-----------------|:----:|
| 17 | Click "Disconnect" on a connected integration | Confirmation modal appears | |
| 18 | Confirm disconnect | `DELETE /api/integrations/user/google` succeeds | |
| 19 | Check user_integrations table | Row deleted | |
| 20 | Page refreshes | Integration moves from Connected to Available section | |

### 2.6 OAuth Callback Handling

| # | Step | Expected Result | Pass |
|---|------|-----------------|:----:|
| 21 | Visit `/api/integrations/oauth/google/callback?error=access_denied` | Redirects to `/integrations.html?error=access_denied` | |
| 22 | Visit callback with missing code/state | Redirects to `/integrations.html?error=missing_params` | |
| 23 | Visit callback with expired state (>15 min old) | Redirects to `/integrations.html?error=invalid_state` | |
| 24 | Visit callback with tampered state HMAC | Redirects to `/integrations.html?error=invalid_state` | |

### 2.7 Organization Integrations

| # | Step | Expected Result | Pass |
|---|------|-----------------|:----:|
| 25 | `GET /api/integrations/org` with `x-org-id` header | Returns org's integrations | |
| 26 | `GET /api/integrations/org` without `x-org-id` | Returns 400 | |
| 27 | `POST /api/integrations/org/salesforce` with instanceUrl and adminApiKey | Creates org integration with encrypted API key | |
| 28 | `PUT /api/integrations/org/salesforce` with updated syncSettings | Updates configuration | |
| 29 | `DELETE /api/integrations/org/salesforce` | Removes org integration | |

### 2.8 Subscriptions

| # | Step | Expected Result | Pass |
|---|------|-----------------|:----:|
| 30 | `GET /api/integrations/subscriptions` with org-id | Returns subscriptions with provider details | |
| 31 | `POST /api/integrations/subscriptions` with providerId and addonType | Creates subscription with correct monthly_price from provider | |
| 32 | `DELETE /api/integrations/subscriptions/:id` | Sets billing_status='cancelled', cancelled_at populated | |

### 2.9 Data Operations

| # | Step | Expected Result | Pass |
|---|------|-----------------|:----:|
| 33 | `GET /api/integrations/google/data/emails` (with valid connection) | Returns email data from Gmail API | |
| 34 | `GET /api/integrations/google/data/events` | Returns calendar events | |
| 35 | `GET /api/integrations/google/data/files` | Returns Drive file listing | |
| 36 | `GET /api/integrations/salesforce/data/contacts` (without connection) | Returns 401 "Not connected" | |
| 37 | `POST /api/integrations/google/sync` with entityType | Triggers sync, logs to integration_sync_log, updates last_sync_at | |

### 2.10 Usage & Health

| # | Step | Expected Result | Pass |
|---|------|-----------------|:----:|
| 38 | `GET /api/integrations/health` | Returns health for all connected integrations with status, lastSync, errors | |
| 39 | `GET /api/integrations/usage` with org-id | Returns subscriptions and recent sync logs | |
| 40 | `POST /api/integrations/usage/increment` | Increments api_calls_this_month | |
| 41 | Increment past api_call_limit | Returns 429 "API call limit reached" | |

### 2.11 Token Refresh

| # | Step | Expected Result | Pass |
|---|------|-----------------|:----:|
| 42 | Set token_expires_at to 2 minutes from now | Next getCredentials call triggers refresh | |
| 43 | Verify refresh succeeds | New access_token stored, error_count reset | |
| 44 | Simulate refresh failure 3x | Status changes to 'error' after 3 consecutive failures | |

### 2.12 Security

| # | Step | Expected Result | Pass |
|---|------|-----------------|:----:|
| 45 | Check tokens in user_integrations table | All token fields contain `iv:authTag:ciphertext` format, not plaintext | |
| 46 | Unauthenticated request to `/api/integrations/user` | Returns 401 | |
| 47 | RLS: Query user_integrations as different user | Only own integrations visible | |
| 48 | RLS: Query org_integrations as non-admin | No rows returned | |
| 49 | Webhook with invalid signature | Returns 401 | |

### 2.13 Webhooks

| # | Step | Expected Result | Pass |
|---|------|-----------------|:----:|
| 50 | `POST /api/webhooks/google` with valid payload | Returns 200, webhook processed | |
| 51 | `POST /api/webhooks/unknown` | Returns 404 "Unknown provider" | |

### 2.14 Frontend UI

| # | Step | Expected Result | Pass |
|---|------|-----------------|:----:|
| 52 | Load page with no integrations connected | "Available Integrations" section shows all providers | |
| 53 | Connect an integration (mock or real) | Card moves to "Connected Services" section | |
| 54 | Check "Beta" badge | Microsoft and Slack show beta badge | |
| 55 | Check pricing display | Google shows "$99/mo", Salesforce shows "$299/mo" | |
| 56 | Click "Coming Soon" button (unimplemented provider) | Button is disabled | |
| 57 | Toast notifications | Success/error toasts appear on connect/disconnect/sync | |
| 58 | URL params after OAuth | `?connected=google` shows success banner, `?error=...` shows error banner | |

---

## 3. Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| E1 | Double-connect same provider | Upsert updates existing record, no duplicate | |
| E2 | Connect with no GOOGLE_CLIENT_ID env var | Provider instantiates but auth URL has `null` client_id — should be caught in UI | |
| E3 | Very long API key (4KB+) | Encrypts and stores successfully | |
| E4 | Concurrent sync requests | Each creates separate sync_log entries | |
| E5 | Database unavailable during credential store | Returns 500, does not store partial data | |
| E6 | Token refresh during active request | Refreshed token used for current request | |

---

## 4. Performance Considerations

| Metric | Target |
|--------|--------|
| Provider list load time | < 200ms |
| OAuth redirect initiation | < 500ms |
| Token refresh cycle | < 2s |
| Health check endpoint | < 300ms |
