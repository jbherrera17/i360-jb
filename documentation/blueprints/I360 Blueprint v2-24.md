# Insight 360 Blueprint v2.24

**Version:** 2.24
**Date:** January 1, 2026
**Status:** Phase 8 | User Management & Strategy 120

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.24

### User Management System

Phase 8 introduces comprehensive role-based access control (RBAC) with a full admin panel for user management.

#### Role Hierarchy

| Role | Permissions |
|------|-------------|
| **Admin** | Full access - manage users, edit all agents (including system agents), access admin panel |
| **User** | Standard access - create/edit own agents, use all features |
| **Viewer** | Read-only access - view agents and dashboards, no modifications |

#### Admin Panel Features

```
┌─────────────────────────────────────────────────────────────────────┐
│  USER MANAGEMENT                               [+ Add User]         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                            │
│  │    2     │ │   15     │ │    3     │                            │
│  │  Admins  │ │  Users   │ │ Viewers  │                            │
│  └──────────┘ └──────────┘ └──────────┘                            │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ User           │ Role    │ Created     │ Actions               │ │
│  ├────────────────┼─────────┼─────────────┼───────────────────────┤ │
│  │ admin@acme.com │ ADMIN   │ Dec 1, 2025 │ [Edit] [Delete]       │ │
│  │ john@acme.com  │ USER    │ Dec 15      │ [Edit] [Delete]       │ │
│  │ viewer@acme.com│ VIEWER  │ Dec 20      │ [Edit] [Delete]       │ │
│  └────────────────┴─────────┴─────────────┴───────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Authentication Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Login      │────▶│  Supabase    │────▶│  JWT Token   │
│   Page       │     │  Auth        │     │  + Role      │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  ▼
                     ┌──────────────────────────────────┐
                     │         Role Check               │
                     │  Admin? → Full Access            │
                     │  User?  → Own Agents Only        │
                     │  Viewer?→ Read-Only              │
                     └──────────────────────────────────┘
```

### Strategy 120 Module

The second lane of the AI Transformation Framework, building on Align 120's company profile:

#### BSC-OKR Fusion Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BALANCED SCORECARD                           │
│              (Strategic Perspective Layer)                      │
│                                                                 │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────┐│
│   │  FINANCIAL  │  │  CUSTOMER   │  │  INTERNAL   │  │LEARNING││
│   │ Perspective │  │ Perspective │  │  PROCESS    │  │& GROWTH││
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └───┬────┘│
└──────────┼────────────────┼────────────────┼─────────────┼─────┘
           │                │                │             │
           ▼                ▼                ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         OKRs                                    │
│                (Execution & Measurement Layer)                  │
│                                                                 │
│   Company OKRs → Department OKRs → Individual OKRs              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 35 Strategy 120 AI Agents

| Category | Agents | Purpose |
|----------|--------|---------|
| **Orchestration** | 3 | Master coordination, context assembly, document generation |
| **Planning** | 4 | Strategy maps, themes, cascade validation, indicators |
| **Financial Perspective** | 4 | Revenue, profitability, cash flow, ROI OKRs |
| **Customer Perspective** | 4 | Satisfaction, retention, market share, CLV OKRs |
| **Process Perspective** | 4 | Efficiency, quality, cycle time, excellence OKRs |
| **Learning Perspective** | 4 | Skills gap, upskilling, engagement, innovation OKRs |
| **Investment** | 4 | Business cases, scenarios, resources, dependencies |
| **Intelligence** | 4 | Market, technology, regulatory, best practices |
| **Decision Support** | 4 | Framing, risk-benefit, assumptions, second opinions |
| **Governance** | 4 | Health monitoring, drift detection, QBRs, communication |

---

## Technical Implementation

### Authentication API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create new user account |
| `POST` | `/api/auth/login` | Login with email/password |
| `POST` | `/api/auth/logout` | Logout current session |
| `GET` | `/api/auth/me` | Get current user profile with role |
| `GET` | `/api/auth/users` | Admin: List all users |
| `POST` | `/api/auth/users` | Admin: Create new user |
| `PUT` | `/api/auth/users/:id` | Admin: Update user details |
| `DELETE` | `/api/auth/users/:id` | Admin: Delete user |
| `GET` | `/api/auth/roles-summary` | Admin: Get role counts |

### Permission Middleware

```javascript
// Check if user can edit an agent
function canEditAgent(userRole, userId, agent) {
    // Admins can edit everything
    if (userRole === 'admin') return true;

    // System agents cannot be edited by non-admins
    if (agent.is_system) return false;

    // Users can edit their own agents
    return agent.user_id === userId;
}
```

### Database Schema - User Roles

```sql
-- Add role column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
CHECK (role IN ('admin', 'user', 'viewer'));

-- Helper functions
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make a user admin
SELECT make_user_admin('your-email@example.com');
```

### Strategy 120 Schema

```sql
-- Agent context mappings
CREATE TABLE strategy120_context_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id),
    context_key VARCHAR(100) NOT NULL,
    context_source VARCHAR(100),
    mapping_config JSONB DEFAULT '{}',
    is_required BOOLEAN DEFAULT false
);

-- Extended initiative tracking
CREATE TABLE strategy_initiatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'proposed',
    priority VARCHAR(20) DEFAULT 'medium',
    perspective_type VARCHAR(50),
    estimated_impact JSONB
);
```

---

## File Changes

### New Files

| File | Description |
|------|-------------|
| `public/admin.html` | User management admin panel |
| `public/login.html` | Authentication login/register page |
| `public/strategy120.html` | Strategy 120 module UI |
| `server/routes/auth.js` | Authentication API endpoints |
| `server/routes/strategy120.js` | Strategy 120 API routes |
| `db/migration-user-roles.sql` | User roles migration |
| `db/phase8-strategy120-schema.sql` | Strategy 120 schema |
| `db/seed-strategy120-agents-part1.sql` | Strategy agents (1-17) |
| `db/seed-strategy120-agents-part2.sql` | Strategy agents (18-35) |
| `db/seed-strategy120-context-mappings.sql` | Agent context mappings |
| `db/cleanup-duplicate-agents.sql` | Duplicate agent cleanup utility |
| `db/verify-strategy120-agents.sql` | Verification queries |
| `documentation/guides/user-guide-strategy120.md` | Strategy 120 user guide |
| `documentation/guides/technical-guide-strategy120.md` | Technical reference |

### Modified Files

| File | Changes |
|------|---------|
| `server/index.js` | Registered `/api/auth` and `/api/strategy120` routes |
| `server/middleware/auth.js` | Added role-based middleware functions |
| `server/routes/agents.js` | Added permission checks for edit/delete |
| `public/js/navigation.js` | Added admin-only User Management link |
| `server/routes/chat.js` | Added typing indicator support |

---

## Safety Features

### User Management Safeguards

- **Cannot delete yourself** - Prevents accidental self-removal
- **Cannot remove last admin** - Ensures at least one admin always exists
- **Admin-only endpoints** - All user management requires admin role
- **System agent protection** - Only admins can modify system agents

### Development Mode

```javascript
// Development bypass for local testing
if (process.env.NODE_ENV === 'development') {
    req.userId = process.env.DEV_USER_ID || 'dev-user-001';
    req.userRole = 'admin';
}
```

---

## Configuration

### Setting Up First Admin

After running the migration, make yourself an admin:

```sql
-- In Supabase SQL Editor
SELECT make_user_admin('your-email@example.com');
```

### Environment Variables

```bash
# Existing - no changes required
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...  # Required for admin user operations
```

### Database Setup

```bash
# Run user roles migration
psql -f db/migration-user-roles.sql

# Run Strategy 120 schema
psql -f db/phase8-strategy120-schema.sql

# Seed Strategy 120 agents
psql -f db/seed-strategy120-agents-part1.sql
psql -f db/seed-strategy120-agents-part2.sql
psql -f db/seed-strategy120-context-mappings.sql

# Verify setup
psql -f db/verify-strategy120-agents.sql
```

---

## Navigation Updates

The sidebar now conditionally shows admin links:

```javascript
const navItems = [
    // ... existing items ...
    { href: '/admin.html', icon: 'users', label: 'User Management', adminOnly: true }
];

// Filter based on user role
.filter(item => !item.adminOnly || userRole === 'admin')
```

---

## Next Steps

- [ ] Build Execute 120 module (Implementation Playbook)
- [ ] Add password reset flow
- [ ] Add user invitation system
- [ ] Implement audit logging for admin actions
- [ ] Add Strategy 120 dashboard visualizations
- [ ] BSC-OKR cascade tracking UI

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| v2.24 | Jan 1, 2026 | User management system, RBAC, Strategy 120 module with 35 agents |
| v2.23 | Dec 31, 2025 | Align 120 module, Company Profile system, 5 assessment agents |
| v2.22 | Dec 30, 2025 | OpenAI SDK v6.x, GPT-5.2 support, model capabilities UI |
| v2.21 | Dec 30, 2025 | Chat UX enhancements, file upload, rotating messages |
| v2.20 | Dec 29, 2025 | Help modal system, user guides, three-panel layout |
