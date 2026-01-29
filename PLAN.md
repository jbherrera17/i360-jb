# External Integrations Architecture Plan

## Executive Summary

Design an extensible integration framework for Insight 360 that enables:
1. **Google Workspace** - Per-user OAuth connections (Gmail, Drive, Calendar, Docs)
2. **Generic Integration Framework** - Pluggable architecture connecting to clients' existing systems
3. **Synergi Internal CRM** - EspoCRM hosted by Synergi for its own operations
4. **Synergi Internal CMS** - Strapi hosted by Synergi for its own content management

### Key Decisions

| Decision | Outcome |
|----------|---------|
| CRM/CMS Hosting | **Option A** — Synergi hosts EspoCRM + Strapi for its own internal use |
| Client Systems | Connect to clients' existing CRM/ERP/CMS via integration framework |
| Integration Pricing | Add-on revenue — charged per integration on request |
| Hosting Services | Tiered hosting options available for clients |
| Self-Hosted LLM | **Postponed** — revisit in future phase |

### Pricing Context

Based on pricing strategy research (ref: `documentation/design/26-01-28 - i360 pricing.pdf`):
- **Value Metric**: AI Interactions (primary), Users (secondary gate)
- **Tiers**: Professional ($499/mo), Business ($1,499/mo), Enterprise ($3,999/mo), Enterprise Plus (custom)
- **Heavy User Baseline**: ~1,025 avg monthly interactions per power user

---

## Part 1: Integration Framework Architecture

### 1.1 Design Philosophy

The integration framework follows these principles:
- **Per-User Credentials** - Each user connects their own accounts (OAuth)
- **Connect to Client Systems** - Integrations bridge i360 to clients' existing tools (not hosted by Synergi)
- **Pluggable Providers** - Standard interface, easy to add new integrations
- **Secure by Default** - AES-256-GCM encryption, token rotation, RLS
- **Add-On Revenue** - Integrations are billable add-ons, not included in base tier

### 1.2 Database Schema Extensions

```sql
-- ===========================================
-- INTEGRATION PROVIDERS (Platform-defined)
-- ===========================================
CREATE TABLE integration_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Provider identity
    slug TEXT UNIQUE NOT NULL,           -- 'google', 'microsoft', 'salesforce', 'hubspot'
    name TEXT NOT NULL,                   -- 'Google Workspace'
    category TEXT NOT NULL,               -- 'productivity', 'crm', 'cms', 'social', 'erp'

    -- OAuth configuration (stored encrypted or from env)
    auth_type TEXT NOT NULL,              -- 'oauth2', 'api_key', 'basic', 'jwt'
    oauth_auth_url TEXT,
    oauth_token_url TEXT,
    default_scopes TEXT[],

    -- Provider metadata
    icon_url TEXT,
    documentation_url TEXT,
    capabilities JSONB,                   -- What this provider can do

    -- Pricing
    addon_category TEXT,                  -- 'productivity', 'client_system', 'custom'
    base_monthly_price DECIMAL(10,2),     -- Monthly add-on price (NULL = included)

    -- Status
    status TEXT DEFAULT 'active',         -- 'active', 'beta', 'deprecated'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- USER INTEGRATIONS (Per-user OAuth connections)
-- ===========================================
CREATE TABLE user_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Association
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES integration_providers(id),
    org_id UUID REFERENCES organizations(id),  -- Optional org context

    -- Provider-side identity
    external_user_id TEXT,                -- User ID in external system
    external_email TEXT,                  -- Email in external system
    external_profile JSONB,               -- Profile data from provider

    -- Credentials (encrypted at application level)
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes TEXT[],

    -- For API key auth
    api_key_encrypted TEXT,
    api_endpoint TEXT,                    -- Custom endpoint (self-hosted)

    -- Status tracking
    status TEXT DEFAULT 'active',         -- 'active', 'expired', 'error', 'revoked'
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,
    error_count INTEGER DEFAULT 0,

    -- Metadata
    settings JSONB DEFAULT '{}',          -- User-specific settings
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, provider_id)          -- One connection per provider per user
);

-- ===========================================
-- ORG INTEGRATIONS (Shared organization-level)
-- ===========================================
CREATE TABLE org_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Association
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES integration_providers(id),

    -- Connection details (for client's existing systems)
    instance_url TEXT,                    -- e.g., 'https://crm.clientcompany.com'
    instance_name TEXT,                   -- Display name

    -- Admin credentials (encrypted)
    admin_api_key_encrypted TEXT,
    admin_credentials_encrypted JSONB,    -- For complex auth

    -- OAuth app credentials (if org has their own OAuth app)
    oauth_client_id TEXT,
    oauth_client_secret_encrypted TEXT,

    -- Status
    status TEXT DEFAULT 'active',
    last_health_check TIMESTAMPTZ,
    health_status TEXT,                   -- 'healthy', 'degraded', 'down'

    -- Configuration
    sync_settings JSONB DEFAULT '{}',     -- Sync frequency, field mappings, etc.

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(org_id, provider_id)
);

-- ===========================================
-- INTEGRATION SUBSCRIPTIONS (Billing tracking)
-- ===========================================
CREATE TABLE integration_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES integration_providers(id),

    -- Billing
    addon_type TEXT NOT NULL,             -- 'productivity', 'client_system', 'custom'
    monthly_price DECIMAL(10,2) NOT NULL,
    setup_fee DECIMAL(10,2) DEFAULT 0,
    billing_status TEXT DEFAULT 'active', -- 'active', 'suspended', 'cancelled'

    -- Usage tracking
    api_calls_this_month INTEGER DEFAULT 0,
    api_call_limit INTEGER,              -- NULL = unlimited
    users_connected INTEGER DEFAULT 0,
    user_limit INTEGER,                  -- NULL = unlimited

    -- Dates
    started_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    next_billing_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(org_id, provider_id)
);

-- ===========================================
-- SYNC LOG (Audit trail for data sync)
-- ===========================================
CREATE TABLE integration_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source
    integration_id UUID,                  -- user_integrations or org_integrations
    integration_type TEXT,                -- 'user' or 'org'
    provider_slug TEXT NOT NULL,

    -- Sync details
    sync_type TEXT NOT NULL,              -- 'full', 'incremental', 'webhook'
    direction TEXT NOT NULL,              -- 'inbound', 'outbound', 'bidirectional'
    entity_type TEXT,                     -- 'contacts', 'emails', 'files', etc.

    -- Results
    status TEXT NOT NULL,                 -- 'started', 'completed', 'failed'
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_details JSONB,

    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Context
    user_id UUID,
    org_id UUID
);

-- Enable RLS
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY user_integrations_policy ON user_integrations
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY org_integrations_policy ON org_integrations
    FOR ALL USING (
        org_id IN (
            SELECT org_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY integration_subscriptions_policy ON integration_subscriptions
    FOR ALL USING (
        org_id IN (
            SELECT org_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );
```

### 1.3 Service Architecture

```
server/
├── services/
│   ├── integrations/
│   │   ├── index.js                 # Integration registry & factory
│   │   ├── baseProvider.js          # Abstract base class
│   │   ├── credentialManager.js     # Encryption/decryption, token refresh
│   │   │
│   │   ├── providers/
│   │   │   ├── google/
│   │   │   │   ├── index.js         # Google provider (extends baseProvider)
│   │   │   │   ├── gmail.js         # Gmail-specific methods
│   │   │   │   ├── drive.js         # Drive-specific methods
│   │   │   │   ├── calendar.js      # Calendar-specific methods
│   │   │   │   └── docs.js          # Docs-specific methods
│   │   │   │
│   │   │   ├── microsoft/
│   │   │   │   ├── index.js         # Microsoft 365 provider
│   │   │   │   ├── outlook.js
│   │   │   │   ├── onedrive.js
│   │   │   │   └── teams.js
│   │   │   │
│   │   │   ├── crm/
│   │   │   │   ├── salesforce.js    # Salesforce connector
│   │   │   │   ├── hubspot.js       # HubSpot connector
│   │   │   │   └── generic.js       # Generic CRM API connector
│   │   │   │
│   │   │   └── cms/
│   │   │       ├── wordpress.js     # WordPress connector
│   │   │       └── generic.js       # Generic CMS API connector
│   │   │
│   │   └── sync/
│   │       ├── syncEngine.js        # Background sync orchestration
│   │       ├── conflictResolver.js  # Handle sync conflicts
│   │       └── webhookHandler.js    # Process incoming webhooks
│   │
│   └── ... (existing services)
│
├── routes/
│   ├── integrations.js              # /api/integrations/* endpoints
│   └── webhooks.js                  # /api/webhooks/* for incoming
```

### 1.4 Base Provider Interface

```javascript
// server/services/integrations/baseProvider.js

class BaseIntegrationProvider {
    constructor(config) {
        this.slug = config.slug;
        this.name = config.name;
        this.authType = config.authType;
        this.supabase = config.supabase;
    }

    // === OAuth Flow ===
    getAuthorizationUrl(userId, scopes, state) { throw new Error('Not implemented'); }
    async exchangeCodeForTokens(code, redirectUri) { throw new Error('Not implemented'); }
    async refreshAccessToken(refreshToken) { throw new Error('Not implemented'); }

    // === Connection Management ===
    async testConnection(credentials) { throw new Error('Not implemented'); }
    async getProfile(credentials) { throw new Error('Not implemented'); }
    async disconnect(userId) { /* Implemented in base */ }

    // === Data Operations ===
    async fetchData(credentials, entityType, options) { throw new Error('Not implemented'); }
    async pushData(credentials, entityType, data) { throw new Error('Not implemented'); }
    async syncData(credentials, entityType, options) { /* Implemented in base */ }

    // === Webhook Handling ===
    validateWebhook(request) { return true; }
    async processWebhook(payload) { throw new Error('Not implemented'); }

    // === Capability Declarations ===
    getCapabilities() {
        return {
            entities: [],        // ['contacts', 'emails', 'files', 'events']
            operations: [],      // ['read', 'write', 'delete', 'sync']
            features: []         // ['webhooks', 'batch', 'search']
        };
    }
}
```

---

## Part 2: Google Workspace Integration

### 2.1 Scope & Capabilities

| Service | Capabilities | Use Cases in i360 |
|---------|-------------|-------------------|
| **Gmail** | Read/send emails, manage labels | Email context for agents, auto-responses |
| **Google Drive** | List/read/create files | Document context, export reports |
| **Google Calendar** | Read/create events | Schedule briefings, meeting prep |
| **Google Docs** | Read/edit documents | Collaborative content, export drafts |
| **Google Sheets** | Read/write data | Import/export data, analytics |

### 2.2 OAuth Configuration

```javascript
// Environment variables required
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://app.insight360.ai/api/oauth/google/callback

// Scopes per service
const GOOGLE_SCOPES = {
    gmail: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.labels'
    ],
    drive: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file'
    ],
    calendar: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events'
    ],
    docs: [
        'https://www.googleapis.com/auth/documents.readonly'
    ],
    sheets: [
        'https://www.googleapis.com/auth/spreadsheets.readonly'
    ]
};
```

### 2.3 Implementation Flow

```
User clicks "Connect Google" in Settings
         │
         ▼
┌─────────────────────────────────────┐
│  GET /api/oauth/google/authorize    │
│  - Generate state token (CSRF)      │
│  - Build authorization URL          │
│  - Redirect to Google consent       │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Google OAuth Consent Screen        │
│  - User grants permissions          │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  GET /api/oauth/google/callback     │
│  - Verify state (CSRF)              │
│  - Exchange code for tokens         │
│  - Encrypt tokens (AES-256-GCM)     │
│  - Store in user_integrations       │
│  - Fetch user profile               │
│  - Redirect to settings page        │
└─────────────────────────────────────┘
```

### 2.4 Agent Integration

Once connected, agents can access Google data via context injection:

```javascript
// In contextInjection.js - add Google context source
async function injectGoogleContext(userId, agentConfig) {
    const googleService = getProvider('google');
    const credentials = await getCredentials(userId, 'google');

    if (!credentials || !agentConfig.googleContext?.enabled) {
        return null;
    }

    const context = [];

    // Recent emails summary
    if (agentConfig.googleContext.gmail) {
        const emails = await googleService.gmail.getRecent(credentials, {
            maxResults: 10,
            query: agentConfig.googleContext.gmailQuery
        });
        context.push({
            type: 'gmail_recent',
            content: formatEmailsSummary(emails)
        });
    }

    // Upcoming calendar events
    if (agentConfig.googleContext.calendar) {
        const events = await googleService.calendar.getUpcoming(credentials, {
            maxResults: 5,
            timeMin: new Date().toISOString()
        });
        context.push({
            type: 'calendar_upcoming',
            content: formatEventsSummary(events)
        });
    }

    return context;
}
```

---

## Part 3: Client System Integrations

### 3.1 Philosophy

Synergi does **not** host CRM/CMS/ERP for clients. Instead, the integration framework connects to clients' existing systems. This approach:
- Avoids hosting complexity and liability for client data
- Supports any system the client already uses
- Creates add-on revenue per integration
- Scales without infrastructure overhead

### 3.2 Supported Client System Categories

| Category | Example Systems | Integration Method |
|----------|----------------|-------------------|
| **CRM** | Salesforce, HubSpot, Zoho, Pipedrive | OAuth2 / API Key |
| **ERP** | NetSuite, SAP Business One, QuickBooks | API Key / OAuth2 |
| **CMS** | WordPress, Webflow, Contentful | API Key |
| **Project Management** | Asana, Monday.com, Jira | OAuth2 |
| **Communication** | Slack, Microsoft Teams | OAuth2 |
| **Marketing** | Mailchimp, ActiveCampaign, Klaviyo | API Key / OAuth2 |
| **Accounting** | QuickBooks, Xero, FreshBooks | OAuth2 |

### 3.3 Database Extensions for CRM Sync

```sql
-- Map i360 entities to client CRM entities
CREATE TABLE crm_entity_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),

    -- i360 entity
    i360_entity_type TEXT NOT NULL,       -- 'client', 'contact', 'deal'
    i360_entity_id UUID NOT NULL,

    -- CRM entity
    crm_provider TEXT NOT NULL,            -- 'salesforce', 'hubspot', etc.
    crm_entity_type TEXT NOT NULL,
    crm_entity_id TEXT NOT NULL,

    -- Sync metadata
    last_sync_at TIMESTAMPTZ,
    sync_direction TEXT DEFAULT 'bidirectional',

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(i360_entity_type, i360_entity_id, crm_provider)
);

-- CRM activities synced to i360 timeline
CREATE TABLE crm_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),

    -- Source
    crm_provider TEXT NOT NULL,
    crm_activity_id TEXT NOT NULL,
    crm_activity_type TEXT NOT NULL,      -- 'call', 'meeting', 'email', 'task'

    -- Linked entities
    client_id UUID REFERENCES clients(id),
    contact_id UUID,
    deal_id UUID,

    -- Activity data
    subject TEXT,
    description TEXT,
    status TEXT,
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    assigned_to UUID REFERENCES users(id),

    -- Original data
    raw_data JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(crm_provider, crm_activity_id, org_id)
);
```

### 3.4 Generic Client System Provider

```javascript
// server/services/integrations/providers/crm/generic.js
// Adapter pattern — maps i360 operations to any CRM's API

class GenericCRMProvider extends BaseIntegrationProvider {
    constructor(config) {
        super({
            slug: config.slug,       // e.g. 'salesforce', 'hubspot'
            name: config.name,
            authType: config.authType,
            ...config
        });
        this.fieldMapping = config.fieldMapping || {};
    }

    async getContacts(credentials, options = {}) {
        const endpoint = this.fieldMapping.contacts?.endpoint || '/contacts';
        return this.request('GET', endpoint, credentials, options);
    }

    async createContact(credentials, contactData) {
        const mapped = this.mapFields(contactData, 'contacts', 'outbound');
        const endpoint = this.fieldMapping.contacts?.endpoint || '/contacts';
        return this.request('POST', endpoint, credentials, mapped);
    }

    mapFields(data, entityType, direction) {
        const mapping = this.fieldMapping[entityType];
        if (!mapping) return data;
        // Transform field names between i360 and external system
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            const mappedKey = direction === 'outbound'
                ? mapping.outbound?.[key] || key
                : mapping.inbound?.[key] || key;
            result[mappedKey] = value;
        }
        return result;
    }
}
```

---

## Part 4: Synergi Internal CRM & CMS

### 4.1 Purpose

Synergi hosts EspoCRM and Strapi for **its own internal operations only** — not for client use. These are internal tools that help Synergi manage its business.

### 4.2 Synergi Internal Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Synergi Infrastructure               │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   i360 App   │  │   EspoCRM    │  │   Strapi    │ │
│  │  (Node.js)   │  │  (Synergi    │  │  (Synergi   │ │
│  │              │◄─┤  CRM only)   │  │  CMS only)  │ │
│  │  Port 3000   │  │  Port 8080   │  │  Port 1337  │ │
│  └──────┬───────┘  └──────────────┘  └─────────────┘ │
│         │                                             │
│         │  Client Integrations (outbound API calls)   │
│         │                                             │
└─────────┼─────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────┐
│  Client A: Salesforce (their host)  │
│  Client B: HubSpot (SaaS)          │
│  Client C: Custom CRM (their host) │
└─────────────────────────────────────┘
```

### 4.3 EspoCRM — Synergi Internal

- **Deployment**: Docker container on Synergi infrastructure
- **Purpose**: Manage Synergi's own sales pipeline, client relationships, contacts
- **Integration**: API connection to i360 for agent context about Synergi's business
- **Access**: Synergi team only (not exposed to i360 platform clients)

### 4.4 Strapi CMS — Synergi Internal

- **Deployment**: Docker container on Synergi infrastructure
- **Purpose**: Manage Synergi's own content — knowledge base, templates, blog, brand assets
- **Integration**: API connection to i360 for content pipeline and context profiles
- **Access**: Synergi team only

---

## Part 5: Integration Add-On Pricing

### 5.1 Add-On Pricing Structure

Integrations are **not included** in base subscription tiers. They are billable add-ons requested by clients.

| Add-On Category | Monthly Price | Setup Fee | What's Included |
|-----------------|--------------|-----------|-----------------|
| **Google Workspace** | $99/user/mo | — | Gmail, Drive, Calendar, Docs, Sheets |
| **Microsoft 365** | $99/user/mo | — | Outlook, OneDrive, Teams, SharePoint |
| **Client CRM Connector** | $299/mo | — | Salesforce, HubSpot, Zoho, Pipedrive, etc. |
| **Client ERP Connector** | $299/mo | — | QuickBooks, NetSuite, Xero, etc. |
| **Custom Integration** | $199/mo | $2,500 | Any system with API access — custom build |

### 5.2 Tier Availability

| Integration | Professional | Business | Enterprise | Enterprise Plus |
|-------------|:---:|:---:|:---:|:---:|
| Google Workspace | — | Add-on | Add-on | Add-on |
| Microsoft 365 | — | Add-on | Add-on | Add-on |
| Client CRM | — | — | Add-on | Add-on |
| Client ERP | — | — | Add-on | Add-on |
| Custom Integration | — | — | — | Add-on |
| Max Integrations | 0 | 2 | 5 | Unlimited |

**Rationale**: Professional tier focuses on core i360 AI capabilities. Business unlocks productivity integrations. Enterprise unlocks client system connectors. Enterprise Plus enables custom builds.

### 5.3 Usage Limits per Integration

| Metric | Business | Enterprise | Enterprise Plus |
|--------|:---:|:---:|:---:|
| API calls/month per integration | 10,000 | 50,000 | Unlimited |
| Sync frequency | Hourly | 15 min | Real-time |
| Webhook support | — | ✓ | ✓ |
| Custom field mapping | — | ✓ | ✓ |

### 5.4 Hosting Services (Optional Add-On)

For clients who need managed hosting of their own systems:

| Tier | Monthly Price | What's Included |
|------|:---:|---------------|
| **Shared Hosting** | $199/mo | Shared infrastructure, daily backups, 99.5% SLA |
| **Dedicated Hosting** | $499/mo | Dedicated resources, hourly backups, 99.9% SLA, custom domain |
| **Self-Managed** | $0 | Client hosts their own — we just connect via API |

---

## Part 6: Unified Integration Dashboard

### 6.1 UI Components

**Integration Settings Page** (`public/integrations.html`)

```
┌────────────────────────────────────────────────────────────────────┐
│  ⚡ Integrations                                          [?] Help │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Your Connected Services                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  [G] Google  │  │  [📧] Gmail  │  │  [📅] Cal    │             │
│  │  ✓ Connected │  │  ✓ Active    │  │  ✓ Active    │             │
│  │  [Manage]    │  │  [Settings]  │  │  [Settings]  │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                    │
│  Organization Integrations (Admin Only)                            │
│  ┌──────────────┐  ┌──────────────┐                               │
│  │ [CRM] Sales- │  │ [ERP] Quick- │                               │
│  │  force       │  │  Books       │                               │
│  │  ✓ Healthy   │  │  ⚠ Degraded  │                               │
│  │  [Configure] │  │  [Configure] │                               │
│  └──────────────┘  └──────────────┘                               │
│                                                                    │
│  Available Add-Ons                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  [M] Microsoft│ │  [🔗] Slack  │  │  [📊] Custom │             │
│  │  $99/user/mo │  │  Request →   │  │  Request →   │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 6.2 API Endpoints

```javascript
// server/routes/integrations.js

// Provider discovery
GET  /api/integrations/providers              // List available providers
GET  /api/integrations/providers/:slug        // Provider details & capabilities

// User integrations
GET  /api/integrations/user                   // User's connected integrations
POST /api/integrations/user/:provider/connect // Initiate OAuth or API key setup
DELETE /api/integrations/user/:provider       // Disconnect integration

// Organization integrations (admin only)
GET  /api/integrations/org                    // Org's integrations
POST /api/integrations/org/:provider          // Configure org integration
PUT  /api/integrations/org/:provider          // Update configuration
DELETE /api/integrations/org/:provider        // Remove integration

// Subscriptions (admin only)
GET  /api/integrations/subscriptions          // Org's integration subscriptions
POST /api/integrations/subscriptions          // Request new integration add-on
PUT  /api/integrations/subscriptions/:id      // Update subscription
DELETE /api/integrations/subscriptions/:id    // Cancel subscription

// OAuth callbacks
GET  /api/oauth/:provider/callback            // OAuth redirect handler

// Data operations
GET  /api/integrations/:provider/data/:entity // Fetch data from provider
POST /api/integrations/:provider/data/:entity // Push data to provider
POST /api/integrations/:provider/sync         // Trigger sync

// Webhooks (public, verified by signature)
POST /api/webhooks/:provider                  // Receive webhooks
```

---

## Part 7: Security Considerations

### 7.1 Credential Security

1. **Encryption**: All tokens encrypted with AES-256-GCM (existing pattern)
2. **Key Management**: `TOKEN_ENCRYPTION_KEY` in environment, rotate periodically
3. **Token Refresh**: Automatic refresh before expiry (5-minute buffer)
4. **Scope Minimization**: Request only necessary OAuth scopes
5. **RLS Enforcement**: Users can only access their own integrations

### 7.2 API Security

1. **Rate Limiting**: Per-provider rate limits to avoid quota exhaustion
2. **Circuit Breaker**: Prevent cascade failures from provider outages
3. **Webhook Verification**: Validate signatures on incoming webhooks
4. **Audit Logging**: Log all integration operations in `integration_sync_log`

### 7.3 Data Privacy

1. **Data Minimization**: Only sync necessary data
2. **User Consent**: Clear consent flow during OAuth
3. **Data Deletion**: When user disconnects, option to purge synced data
4. **Retention Policies**: Configurable data retention per org

---

## Part 8: Production Deployment

### 8.1 Infrastructure Architecture

Single shared i360 instance with RLS-based multi-tenancy (not per-client instances):

```
                    ┌──────────────────────┐
                    │    Load Balancer      │
                    │   (SSL Termination)   │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
      ┌───────▼──────┐ ┌──────▼───────┐ ┌──────▼───────┐
      │  i360 App    │ │  i360 App    │ │  i360 App    │
      │  Instance 1  │ │  Instance 2  │ │  Instance N  │
      └───────┬──────┘ └──────┬───────┘ └──────┬───────┘
              │                │                │
              └────────────────┼────────────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Supabase (shared)   │
                    │   PostgreSQL + RLS    │
                    └──────────────────────┘
```

### 8.2 Scaling Milestones

| Clients | Architecture | Infrastructure |
|:---:|------|------|
| 1–20 | Single instance, single DB | 1 server + Supabase |
| 20–100 | Horizontal app scaling, connection pooling | 2–4 servers + Supabase Pro |
| 100–500 | Read replicas, CDN, background job queue | Auto-scaling + dedicated DB |
| 500+ | Evaluate regional deployment, dedicated DB per large client | Multi-region |

### 8.3 Self-Hosted LLM

**Status: Postponed**

Will revisit when:
- Client data sensitivity requires on-premise inference
- Cost per API call exceeds self-hosted break-even
- Specific model fine-tuning needs arise

---

## Part 9: Implementation Phases

### Phase 1: Foundation
- [ ] Create database schema extensions (integration_providers, user_integrations, org_integrations, integration_subscriptions)
- [ ] Implement `baseProvider.js` and `credentialManager.js`
- [ ] Build provider registry and factory
- [ ] Create `/api/integrations` route structure
- [ ] Build basic integrations settings UI

### Phase 2: Google Workspace
- [ ] Implement Google OAuth flow
- [ ] Build Gmail provider (read emails, send)
- [ ] Build Drive provider (list, read files)
- [ ] Build Calendar provider (read, create events)
- [ ] Agent context injection for Google data
- [ ] User documentation

### Phase 3: Client System Connectors
- [ ] Build generic CRM connector (field mapping, CRUD)
- [ ] Implement Salesforce provider
- [ ] Implement HubSpot provider
- [ ] Build CRM sync engine (bidirectional)
- [ ] Build activity timeline integration
- [ ] Admin configuration UI

### Phase 4: Synergi Internal Tools
- [ ] Deploy EspoCRM Docker container (Synergi-only)
- [ ] Deploy Strapi Docker container (Synergi-only)
- [ ] Connect EspoCRM to i360 for Synergi's own agent context
- [ ] Connect Strapi to i360 for Synergi's content pipeline

### Phase 5: Billing & Polish
- [ ] Integration subscription management UI
- [ ] Usage tracking and limit enforcement
- [ ] Webhook infrastructure
- [ ] Background sync jobs
- [ ] Health monitoring dashboard
- [ ] Comprehensive testing
- [ ] User documentation

---

## Appendix A: File Structure

```
server/
├── services/
│   └── integrations/
│       ├── index.js                    # Registry & factory
│       ├── baseProvider.js             # Abstract base class
│       ├── credentialManager.js        # Token encryption/refresh
│       ├── providers/
│       │   ├── google/
│       │   │   ├── index.js
│       │   │   ├── gmail.js
│       │   │   ├── drive.js
│       │   │   ├── calendar.js
│       │   │   └── docs.js
│       │   ├── crm/
│       │   │   ├── salesforce.js
│       │   │   ├── hubspot.js
│       │   │   └── generic.js
│       │   └── cms/
│       │       ├── wordpress.js
│       │       └── generic.js
│       └── sync/
│           ├── syncEngine.js
│           └── webhookHandler.js
├── routes/
│   ├── integrations.js
│   └── webhooks.js

db/
└── phase-XX-integrations.sql           # Schema extensions

public/
├── integrations.html                   # Main integrations page
├── integration-settings.html           # Per-integration settings
└── js/
    └── integrations.js                 # Frontend logic

documentation/
└── guides/
    └── integrations-user-guide.md
```

## Appendix B: Environment Variables

```bash
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Microsoft OAuth (future)
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# Synergi Internal CRM (not exposed to clients)
ESPOCRM_URL=http://localhost:8080
ESPOCRM_API_KEY=

# Synergi Internal CMS (not exposed to clients)
STRAPI_URL=http://localhost:1337
STRAPI_API_KEY=

# Existing (already in codebase)
TOKEN_ENCRYPTION_KEY=           # 32-byte hex for AES-256-GCM
```

---

## Summary

This architecture provides:

1. **Client Integration Framework** - Connect to clients' existing CRM, ERP, CMS, and productivity tools
2. **Per-User OAuth** - Secure individual connections to Google, Microsoft, etc.
3. **Synergi Internal Tools** - EspoCRM + Strapi for Synergi's own operations (not client-facing)
4. **Add-On Revenue Model** - Integrations priced as billable add-ons ($99–$299/mo + custom)
5. **Tiered Access** - Integration availability gated by subscription tier
6. **Hosting Services** - Optional managed hosting for clients ($199–$499/mo)
7. **Secure by Design** - Encryption, RLS, audit logging, circuit breakers
8. **Scalable Deployment** - Single shared instance with RLS, horizontal scaling path
