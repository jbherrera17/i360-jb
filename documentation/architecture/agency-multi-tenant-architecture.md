# Agency Multi-Tenant Architecture

**Version:** 1.0 (Conceptual)
**Date:** January 17, 2026
**Status:** Future Consideration

---

## Executive Summary

This document outlines the architecture for an agency/white-label model of Insight 360, where licensed agencies can provision and manage sub-accounts for their clients. This is a **future consideration** - the recommendation is to complete the core product before implementing multi-tenancy.

---

## Business Model Overview

```
Anthropic/I360 (Platform Owner)
    │
    ├── Agency A (License Holder)
    │   ├── Client 1 (Sub-account)
    │   ├── Client 2 (Sub-account)
    │   └── Client 3 (Sub-account)
    │
    ├── Agency B (License Holder)
    │   ├── Client 1 (Sub-account)
    │   └── Client 2 (Sub-account)
    │
    └── Direct User (Standard License)
```

### License Tiers

| Tier | Description | Sub-accounts | Features |
|------|-------------|--------------|----------|
| **Individual** | Single user | 0 | Full platform access |
| **Team** | Small business | 5-10 | + Team collaboration |
| **Agency** | Service provider | 25-100 | + White-label, client management |
| **Enterprise** | Large organization | Unlimited | + Custom branding, API access |

---

## Database Schema Design

### New Tables

```sql
-- Organizations (Agencies)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,           -- For white-label URLs
    license_tier VARCHAR(50) DEFAULT 'individual',
    max_sub_accounts INTEGER DEFAULT 0,

    -- Branding
    logo_url TEXT,
    primary_color VARCHAR(20),
    secondary_color VARCHAR(20),
    custom_domain VARCHAR(255),

    -- Settings
    settings JSONB DEFAULT '{}',
    features_enabled JSONB DEFAULT '[]',

    -- Billing
    stripe_customer_id VARCHAR(100),
    subscription_status VARCHAR(50),
    billing_email VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Owner reference
    owner_user_id UUID REFERENCES users(id)
);

-- Organization Members (Agency Staff)
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',           -- owner, admin, member
    permissions JSONB DEFAULT '[]',
    invited_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, user_id)
);

-- Sub-Accounts (Client Accounts)
CREATE TABLE sub_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,

    -- Client contact
    client_name VARCHAR(255),
    client_email VARCHAR(255),

    -- Status
    status VARCHAR(50) DEFAULT 'active',         -- active, suspended, archived

    -- Settings inheritance
    inherit_branding BOOLEAN DEFAULT true,
    custom_settings JSONB DEFAULT '{}',

    -- Usage limits
    monthly_token_limit BIGINT,
    monthly_tokens_used BIGINT DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, slug)
);

-- Sub-Account Users (Client Users)
CREATE TABLE sub_account_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sub_account_id UUID REFERENCES sub_accounts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'user',             -- admin, user
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(sub_account_id, user_id)
);
```

### Modified Existing Tables

```sql
-- Add to users table
ALTER TABLE users ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN sub_account_id UUID REFERENCES sub_accounts(id);
ALTER TABLE users ADD COLUMN account_type VARCHAR(50) DEFAULT 'direct';  -- direct, org_member, sub_account

-- Add to thought_leadership_profiles
ALTER TABLE thought_leadership_profiles ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE thought_leadership_profiles ADD COLUMN sub_account_id UUID REFERENCES sub_accounts(id);

-- Add to all content tables (agents, conversations, etc.)
-- Pattern: Add organization_id and sub_account_id for data isolation
```

---

## Row Level Security (RLS) Policies

### Data Isolation Strategy

```sql
-- Policy: Users can only see data from their organization/sub-account
CREATE POLICY org_isolation_policy ON thought_leadership_profiles
    FOR ALL
    USING (
        -- Direct users see their own data
        (organization_id IS NULL AND user_id = auth.uid())
        OR
        -- Org members see all org data
        (organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        ))
        OR
        -- Sub-account users see only their sub-account data
        (sub_account_id IN (
            SELECT sub_account_id FROM sub_account_users
            WHERE user_id = auth.uid()
        ))
    );

-- Agency admins can access all sub-account data
CREATE POLICY agency_admin_policy ON sub_accounts
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );
```

---

## API Architecture

### Route Structure

```
/api/v1/
├── /org                              # Organization management
│   ├── GET    /                      # Get current org
│   ├── PUT    /                      # Update org settings
│   ├── GET    /members               # List org members
│   ├── POST   /members/invite        # Invite member
│   └── DELETE /members/:id           # Remove member
│
├── /org/sub-accounts                 # Sub-account management
│   ├── GET    /                      # List sub-accounts
│   ├── POST   /                      # Create sub-account
│   ├── GET    /:id                   # Get sub-account
│   ├── PUT    /:id                   # Update sub-account
│   ├── DELETE /:id                   # Archive sub-account
│   └── POST   /:id/switch            # Switch to sub-account context
│
├── /org/billing                      # Agency billing
│   ├── GET    /usage                 # Usage across sub-accounts
│   └── GET    /invoices              # Billing history
│
└── /admin                            # Platform admin (Anthropic)
    ├── GET    /organizations         # List all orgs
    └── PUT    /organizations/:id     # Manage org
```

### Context Switching

```javascript
// Middleware to handle sub-account context
const subAccountContext = async (req, res, next) => {
    const user = req.user;

    // Check for sub-account switch header
    const subAccountId = req.headers['x-sub-account-id'];

    if (subAccountId) {
        // Verify user has access to this sub-account
        const hasAccess = await verifySubAccountAccess(user.id, subAccountId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }
        req.context = { subAccountId, organizationId: user.organizationId };
    } else if (user.subAccountId) {
        // User is a sub-account user
        req.context = { subAccountId: user.subAccountId };
    } else if (user.organizationId) {
        // User is an org member viewing org-level data
        req.context = { organizationId: user.organizationId };
    } else {
        // Direct user
        req.context = { userId: user.id };
    }

    next();
};
```

---

## UI/UX Considerations

### Agency Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] Agency Name                    [Settings] [Profile] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Sub-Accounts (12/25)                    [+ New Client]     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Client A      ████████░░  75%    [View] [Settings]  │   │
│  │ Client B      ████░░░░░░  40%    [View] [Settings]  │   │
│  │ Client C      ██████████  100%   [View] [Settings]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Quick Stats                                                │
│  ┌──────────┬──────────┬──────────┬──────────┐            │
│  │ Total    │ Active   │ Articles │ Posts    │            │
│  │ Clients  │ This Week│ Generated│ Created  │            │
│  │ 12       │ 8        │ 34       │ 156      │            │
│  └──────────┴──────────┴──────────┴──────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Context Switcher

```
┌─────────────────────────────────────┐
│  Current: Client A                  │
│  ─────────────────────────────────  │
│  ↻ Switch to:                       │
│    • Agency Overview                │
│    • Client A ✓                     │
│    • Client B                       │
│    • Client C                       │
│  ─────────────────────────────────  │
│  [+ Add New Client]                 │
└─────────────────────────────────────┘
```

---

## White-Label Features

### Branding Configuration

```javascript
const brandingConfig = {
    // Visual
    logo: '/uploads/org/logo.png',
    favicon: '/uploads/org/favicon.ico',
    primaryColor: '#8b5cf6',
    secondaryColor: '#6366f1',

    // Text
    platformName: 'Agency Insights',
    tagline: 'Powered by Your Agency',

    // Domain
    customDomain: 'insights.agency.com',

    // Email
    fromEmail: 'insights@agency.com',
    emailFooter: '© 2026 Your Agency',

    // Features
    hideI360Branding: true,
    customHelpUrl: 'https://agency.com/help'
};
```

### CSS Variable Override

```css
/* White-label theme injection */
:root {
    --brand-primary: var(--org-primary, #8b5cf6);
    --brand-secondary: var(--org-secondary, #6366f1);
    --brand-logo: var(--org-logo, url('/assets/logo.svg'));
}
```

---

## Billing & Usage Tracking

### Usage Aggregation

```sql
-- Monthly usage view per sub-account
CREATE VIEW sub_account_usage AS
SELECT
    sa.id as sub_account_id,
    sa.name as sub_account_name,
    o.id as organization_id,
    COUNT(DISTINCT tlp.id) as tl_profiles,
    COUNT(DISTINCT c.id) as conversations,
    SUM(m.token_count) as total_tokens,
    DATE_TRUNC('month', NOW()) as billing_period
FROM sub_accounts sa
JOIN organizations o ON sa.organization_id = o.id
LEFT JOIN thought_leadership_profiles tlp ON tlp.sub_account_id = sa.id
LEFT JOIN conversations c ON c.sub_account_id = sa.id
LEFT JOIN messages m ON m.conversation_id = c.id
WHERE m.created_at >= DATE_TRUNC('month', NOW())
GROUP BY sa.id, sa.name, o.id;
```

### Billing Events

```javascript
// Track billable events
const billingEvents = {
    ARTICLE_GENERATED: { tokens: 'actual', base: 1000 },
    LINKEDIN_POSTS: { tokens: 'actual', base: 500 },
    VISIBILITY_CHECK: { tokens: 'actual', base: 2000 },
    AGENT_CHAT: { tokens: 'actual', base: 0 }
};
```

---

## Implementation Phases

### Phase 1: Foundation (Future)
- [ ] Create organization and sub-account tables
- [ ] Add RLS policies for data isolation
- [ ] Build organization settings UI

### Phase 2: Sub-Account Management (Future)
- [ ] Sub-account CRUD operations
- [ ] Context switching middleware
- [ ] Sub-account dashboard

### Phase 3: White-Label (Future)
- [ ] Branding configuration
- [ ] Custom domain support
- [ ] Email customization

### Phase 4: Billing Integration (Future)
- [ ] Usage tracking
- [ ] Stripe integration for agencies
- [ ] Invoice generation

---

## Security Considerations

1. **Data Isolation**: Strict RLS policies prevent cross-account data access
2. **Permission Hierarchy**: Clear role-based access (owner > admin > member > user)
3. **Audit Logging**: Track all sub-account access and changes
4. **Token Limits**: Prevent runaway usage with per-sub-account limits
5. **Secure Switching**: Validate permissions on every context switch

---

## Recommendations

### Do First (Current Priority)
1. Complete core Thought Leadership flow
2. Stabilize single-user experience
3. Add comprehensive error handling
4. Build usage analytics

### Do Later (After Core Complete)
1. Design organization onboarding flow
2. Build agency dashboard
3. Implement sub-account provisioning
4. Add billing integration

### Key Decision Points
- **Pricing Model**: Per-seat, per-sub-account, or usage-based?
- **Data Portability**: Can clients export their data?
- **Feature Gating**: Which features are agency-only?
- **Support Model**: Does agency provide support or platform?

---

## Related Documents

| Document | Description |
|----------|-------------|
| [I360 Blueprint v3.14](../blueprints/I360%20Blueprint%20v3-14%202026-01-17.md) | Current system architecture |
| [Modal Service Architecture](./modal-service-architecture.md) | UI component patterns |
| [Phase 13 Feature Architecture](./phase13-feature-architecture.md) | Feature development patterns |

---

*This document is a conceptual design. Implementation should begin only after core product stability is achieved.*
