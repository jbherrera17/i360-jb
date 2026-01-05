# Phase 13+ Feature Architecture

**Version:** 1.0
**Date:** January 4, 2026
**Status:** Planning

---

## Overview

This document captures the architectural design for three major feature enhancements:

1. **Strategy S2E + Department Integration** - Department tabs within Strategy S2E
2. **User Business Roles** - Organizational hierarchy separate from system roles
3. **Governance & Integrity Tracking** - Compliance and data quality dashboards

---

## 1. Strategy S2E + Department Integration

### Concept

Each department gets its own **mini strategy wizard** within Strategy S2E, allowing them to:
- View company-level strategy (read-only cascade from parent)
- Create department-level objectives aligned to company BSC
- Link department OKRs to department objectives
- Execute via department-specific agents/workflows

### UI Structure

```
Strategy (S2E) Page
├── [Company Tab] ← Current 5-step wizard (company-wide)
│   └── Vision → Themes → BSC Objectives → OKR Linkage → Strategy Map
│
└── [Department Tabs] ← Dynamic based on client's departments
    ├── Sales
    ├── Marketing
    ├── Operations
    ├── Finance
    ├── HR
    └── Executive
        │
        └── Per Department View:
            ├── Company Strategy Summary (read-only)
            │   └── Shows parent objectives this dept contributes to
            ├── Department Objectives (mini-wizard)
            │   └── Create dept-level objectives linked to company BSC
            ├── Department OKRs
            │   └── Link dept OKRs to dept objectives
            └── Department Agents
                └── Strategy agents filtered for this department
```

### Tab Visibility Rules

- **All department tabs visible** to all users
- **Locked/greyed out** tabs for departments user can't access
- Visual indicator: lock icon with tooltip "Contact admin for access"
- Access determined by business role defaults + admin overrides

### Department Mini-Wizard (5 Steps)

| Step | Company Level | Department Level |
|------|---------------|------------------|
| 1 | Vision, Mission, Values | Department Mission, Focus Areas |
| 2 | Strategic Themes | Department Themes (aligned to company) |
| 3 | BSC Objectives | Department Objectives (per perspective) |
| 4 | OKR Linkage | Department OKRs → Dept Objectives |
| 5 | Strategy Map | Department Contribution Map |

### Database Schema

```sql
-- ============================================
-- DEPARTMENT STRATEGY TABLES
-- ============================================

-- Department-scoped objectives (extends bsc_objectives)
ALTER TABLE bsc_objectives
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id),
ADD COLUMN IF NOT EXISTS parent_objective_id UUID REFERENCES bsc_objectives(id);

-- Department strategic foundations (mission, focus areas)
CREATE TABLE department_strategy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,

    -- Step 1: Foundation
    mission TEXT,
    focus_areas JSONB DEFAULT '[]',
    planning_period TEXT,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(department_id)
);

-- Department themes linked to company themes
CREATE TABLE department_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    company_theme_id UUID REFERENCES strategic_themes(id),

    -- Theme details
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'target',
    color TEXT DEFAULT '#6366f1',
    alignment_rationale TEXT,
    sort_order INTEGER DEFAULT 0,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track objective cascade relationships
CREATE TABLE objective_department_cascade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_objective_id UUID NOT NULL REFERENCES bsc_objectives(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    department_objective_id UUID REFERENCES bsc_objectives(id) ON DELETE SET NULL,

    -- Contribution details
    contribution_type TEXT CHECK (contribution_type IN ('primary', 'supporting', 'informed')),
    contribution_weight DECIMAL(3,2) CHECK (contribution_weight >= 0 AND contribution_weight <= 1),
    contribution_description TEXT,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(company_objective_id, department_id)
);

-- Indexes for performance
CREATE INDEX idx_dept_strategy_dept ON department_strategy(department_id);
CREATE INDEX idx_dept_themes_dept ON department_themes(department_id);
CREATE INDEX idx_dept_themes_company ON department_themes(company_theme_id);
CREATE INDEX idx_bsc_objectives_dept ON bsc_objectives(department_id);
CREATE INDEX idx_objective_cascade_company ON objective_department_cascade(company_objective_id);
CREATE INDEX idx_objective_cascade_dept ON objective_department_cascade(department_id);
```

### API Endpoints

```
# Department Strategy
GET    /api/s2e/departments                        → List departments with access status
GET    /api/s2e/departments/:id/strategy           → Get department strategy foundation
PUT    /api/s2e/departments/:id/strategy           → Update department strategy foundation

# Department Themes
GET    /api/s2e/departments/:id/themes             → List department themes
POST   /api/s2e/departments/:id/themes             → Create department theme
PUT    /api/s2e/departments/:id/themes/:themeId    → Update department theme
DELETE /api/s2e/departments/:id/themes/:themeId    → Delete department theme

# Department Objectives
GET    /api/s2e/departments/:id/objectives         → List department objectives
POST   /api/s2e/departments/:id/objectives         → Create department objective
PUT    /api/s2e/departments/:id/objectives/:objId  → Update department objective
DELETE /api/s2e/departments/:id/objectives/:objId  → Delete department objective

# Cascade Relationships
GET    /api/s2e/departments/:id/cascade            → Get cascade from company objectives
POST   /api/s2e/departments/:id/cascade            → Link department to company objective
DELETE /api/s2e/departments/:id/cascade/:cascadeId → Remove cascade link

# Department OKRs (extends existing OKR endpoints)
GET    /api/s2e/departments/:id/okrs               → List department OKRs
POST   /api/s2e/departments/:id/okrs/:okrId/link   → Link OKR to department objective
```

---

## 2. User Business Roles

### Two-Tier Role System

| Layer | Purpose | Examples |
|-------|---------|----------|
| **System Role** | Platform permissions | `admin`, `user`, `viewer` |
| **Business Role** | Organizational hierarchy | `executive`, `director`, `manager`, `supervisor`, `ic` |

These are **independent** - a user can be:
- System `admin` + Business `manager` (IT manager who administers the platform)
- System `user` + Business `executive` (CEO who just uses the platform)

### Business Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│  EXECUTIVE (Level 5)                                            │
│  CEO, CFO, COO, VP                                              │
│  Default: All departments, full view, company strategy edit     │
├─────────────────────────────────────────────────────────────────┤
│  DIRECTOR (Level 4)                                             │
│  Director of Sales, HR Director, Finance Director               │
│  Default: Own dept edit, cross-dept view, dept strategy edit    │
├─────────────────────────────────────────────────────────────────┤
│  MANAGER (Level 3)                                              │
│  Sales Manager, Ops Manager, Marketing Manager                  │
│  Default: Own dept edit, limited cross-dept view                │
├─────────────────────────────────────────────────────────────────┤
│  SUPERVISOR (Level 2)                                           │
│  Team Lead, Shift Supervisor, Project Lead                      │
│  Default: Own team within dept, view dept strategy              │
├─────────────────────────────────────────────────────────────────┤
│  IC - Individual Contributor (Level 1)                          │
│  Sales Rep, Developer, Analyst, Designer                        │
│  Default: View own dept only, execute workflows                 │
└─────────────────────────────────────────────────────────────────┘
```

### Default Permissions Matrix

| Permission | IC | Supervisor | Manager | Director | Executive |
|------------|:--:|:----------:|:-------:|:--------:|:---------:|
| View own department | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit own department | — | — | ✓ | ✓ | ✓ |
| View other departments | — | — | Limited | ✓ | ✓ |
| Edit other departments | — | — | — | — | ✓ |
| View company strategy | — | ✓ | ✓ | ✓ | ✓ |
| Edit company strategy | — | — | — | — | ✓ |
| Edit dept strategy | — | — | — | ✓ | ✓ |
| Run workflows | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create workflows | — | — | ✓ | ✓ | ✓ |
| Access all agents | — | — | — | ✓ | ✓ |

*All defaults are overridable via admin policy UI*

### Database Schema

```sql
-- ============================================
-- BUSINESS ROLE TABLES
-- ============================================

-- Business role levels (reference table)
CREATE TABLE business_role_levels (
    id TEXT PRIMARY KEY,           -- 'executive', 'director', 'manager', 'supervisor', 'ic'
    name TEXT NOT NULL,            -- 'Executive', 'Director', etc.
    level INTEGER NOT NULL,        -- 5, 4, 3, 2, 1 (for hierarchy comparisons)
    description TEXT,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default levels
INSERT INTO business_role_levels (id, name, level, description, icon, color) VALUES
    ('executive', 'Executive', 5, 'C-suite and VP level leadership', 'crown', '#7c3aed'),
    ('director', 'Director', 4, 'Department heads and directors', 'briefcase', '#6366f1'),
    ('manager', 'Manager', 3, 'Team and functional managers', 'users', '#3b82f6'),
    ('supervisor', 'Supervisor', 2, 'Team leads and supervisors', 'user-check', '#10b981'),
    ('ic', 'Individual Contributor', 1, 'Individual contributors', 'user', '#6b7280');

-- Add business_role to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS business_role TEXT REFERENCES business_role_levels(id) DEFAULT 'ic';

-- Default permissions per business role
CREATE TABLE business_role_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_role TEXT NOT NULL REFERENCES business_role_levels(id) ON DELETE CASCADE,

    -- Department access
    can_view_own_dept BOOLEAN DEFAULT true,
    can_edit_own_dept BOOLEAN DEFAULT false,
    can_view_other_depts BOOLEAN DEFAULT false,
    can_edit_other_depts BOOLEAN DEFAULT false,

    -- Strategy access
    can_view_company_strategy BOOLEAN DEFAULT false,
    can_edit_company_strategy BOOLEAN DEFAULT false,
    can_edit_dept_strategy BOOLEAN DEFAULT false,

    -- Workflow access
    can_run_workflows BOOLEAN DEFAULT true,
    can_create_workflows BOOLEAN DEFAULT false,

    -- Agent access
    can_access_all_agents BOOLEAN DEFAULT false,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(business_role)
);

-- Seed defaults
INSERT INTO business_role_defaults
    (business_role, can_view_own_dept, can_edit_own_dept, can_view_other_depts, can_edit_other_depts,
     can_view_company_strategy, can_edit_company_strategy, can_edit_dept_strategy,
     can_run_workflows, can_create_workflows, can_access_all_agents)
VALUES
    ('executive', true, true, true, true, true, true, true, true, true, true),
    ('director', true, true, true, false, true, false, true, true, true, true),
    ('manager', true, true, true, false, true, false, false, true, true, false),
    ('supervisor', true, false, false, false, true, false, false, true, false, false),
    ('ic', true, false, false, false, false, false, false, true, false, false);

-- User-specific overrides (admin can override defaults per user)
CREATE TABLE user_permission_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Override specific permissions (NULL = use default from business role)
    can_view_own_dept BOOLEAN,
    can_edit_own_dept BOOLEAN,
    can_view_other_depts BOOLEAN,
    can_edit_other_depts BOOLEAN,
    can_view_company_strategy BOOLEAN,
    can_edit_company_strategy BOOLEAN,
    can_edit_dept_strategy BOOLEAN,
    can_run_workflows BOOLEAN,
    can_create_workflows BOOLEAN,
    can_access_all_agents BOOLEAN,

    -- Department-specific overrides (JSONB for flexibility)
    department_overrides JSONB DEFAULT '{}',
    -- Example: {"dept-uuid-1": {"can_view": true, "can_edit": false}}

    -- Metadata
    override_reason TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_users_business_role ON users(business_role);
CREATE INDEX idx_user_overrides_user ON user_permission_overrides(user_id);
```

### Permission Resolution Logic

```javascript
/**
 * Resolve effective permissions for a user
 * Priority: User Override > Business Role Default
 */
async function getUserPermissions(userId) {
    // Get user with business role
    const user = await getUser(userId);

    // Get defaults for their business role
    const roleDefaults = await getBusinessRoleDefaults(user.business_role);

    // Get user-specific overrides (if any)
    const userOverrides = await getUserPermissionOverrides(userId);

    // Merge: override takes precedence if not null
    const permissions = {
        can_view_own_dept: userOverrides?.can_view_own_dept ?? roleDefaults.can_view_own_dept,
        can_edit_own_dept: userOverrides?.can_edit_own_dept ?? roleDefaults.can_edit_own_dept,
        can_view_other_depts: userOverrides?.can_view_other_depts ?? roleDefaults.can_view_other_depts,
        can_edit_other_depts: userOverrides?.can_edit_other_depts ?? roleDefaults.can_edit_other_depts,
        can_view_company_strategy: userOverrides?.can_view_company_strategy ?? roleDefaults.can_view_company_strategy,
        can_edit_company_strategy: userOverrides?.can_edit_company_strategy ?? roleDefaults.can_edit_company_strategy,
        can_edit_dept_strategy: userOverrides?.can_edit_dept_strategy ?? roleDefaults.can_edit_dept_strategy,
        can_run_workflows: userOverrides?.can_run_workflows ?? roleDefaults.can_run_workflows,
        can_create_workflows: userOverrides?.can_create_workflows ?? roleDefaults.can_create_workflows,
        can_access_all_agents: userOverrides?.can_access_all_agents ?? roleDefaults.can_access_all_agents,
    };

    // Apply department-specific overrides
    const departmentPermissions = mergeDepartmentPermissions(
        user.department_id,
        permissions,
        userOverrides?.department_overrides || {}
    );

    return {
        ...permissions,
        departments: departmentPermissions,
        businessRole: user.business_role,
        businessRoleLevel: roleDefaults.level
    };
}
```

### API Endpoints

```
# Business Roles (Admin)
GET    /api/admin/business-roles                   → List all business role levels
PUT    /api/admin/business-roles/:roleId/defaults  → Update defaults for a role

# User Permissions (Admin)
GET    /api/admin/users/:id/permissions            → Get user's effective permissions
PUT    /api/admin/users/:id/permissions            → Set user overrides
DELETE /api/admin/users/:id/permissions            → Remove all overrides (use defaults)

# Current User
GET    /api/auth/permissions                       → Get current user's permissions
```

### Admin UI

**Location:** User Management → User Detail → Business Role section

```
┌─────────────────────────────────────────────────────────────────┐
│ User: John Smith                                                │
│ Email: john@company.com                                         │
├─────────────────────────────────────────────────────────────────┤
│ System Role: [user ▼]           Business Role: [manager ▼]      │
│ Department:  [Sales ▼]                                          │
├─────────────────────────────────────────────────────────────────┤
│ Permissions (based on Manager defaults)                         │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ☑ View own department                    [Default]          │ │
│ │ ☑ Edit own department                    [Default]          │ │
│ │ ☑ View other departments (limited)       [Default]          │ │
│ │ ☐ Edit other departments                 [Default]          │ │
│ │ ☑ View company strategy                  [Override ✎]       │ │
│ │ ☐ Edit company strategy                  [Default]          │ │
│ │ ☐ Edit department strategy               [Default]          │ │
│ │ ☑ Run workflows                          [Default]          │ │
│ │ ☑ Create workflows                       [Default]          │ │
│ │ ☐ Access all agents                      [Default]          │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Department-Specific Overrides:                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Marketing: [Can View ▼]    Finance: [No Access ▼]           │ │
│ │ [+ Add Department Override]                                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Override Reason: "Cross-functional project lead"                │
│                                           [Save Changes]        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Governance & Integrity Tracking

### Overview

Two complementary dashboards for organizational health:

| Dashboard | Focus | Key Metrics |
|-----------|-------|-------------|
| **Governance** | Policy compliance, decision audit, approvals | Compliance rate, pending approvals, policy violations |
| **Integrity** | Data quality, ethical AI, system health | Data accuracy, AI bias checks, context freshness |

### Governance Dashboard

#### Purpose
Track organizational compliance, decision accountability, and approval workflows.

#### Key Components

**3.1.1 Policy Compliance Tracker**
- Track adherence to defined policies (from Bright Lines context asset)
- Show compliance percentage by department
- Alert on policy violations detected in AI outputs

**3.1.2 Decision Audit Trail**
- Log all strategic decisions (from Strategy 120 decision_log)
- Show decision → outcome tracking
- Link decisions to responsible parties

**3.1.3 Approval Workflows**
- Pending approvals for initiatives, budgets, strategy changes
- Approval history with timestamps
- Escalation tracking

**3.1.4 Risk Register**
- Track identified risks from strategy planning
- Risk status and mitigation progress
- Risk owner accountability

#### Database Schema

```sql
-- ============================================
-- GOVERNANCE TABLES
-- ============================================

-- Policy compliance tracking
CREATE TABLE policy_compliance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What was checked
    policy_id UUID,                           -- Reference to bright_lines or policy context asset
    policy_name TEXT NOT NULL,
    policy_category TEXT,                     -- 'ethics', 'security', 'quality', 'legal'

    -- Check details
    check_type TEXT CHECK (check_type IN ('automated', 'manual', 'ai_detected')),
    check_source TEXT,                        -- 'agent_output', 'workflow', 'manual_review'
    source_reference_id UUID,                 -- ID of conversation, workflow, etc.

    -- Result
    is_compliant BOOLEAN NOT NULL,
    violation_details TEXT,
    severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')),

    -- Context
    department_id UUID REFERENCES departments(id),
    user_id UUID REFERENCES users(id),

    -- Resolution
    resolution_status TEXT DEFAULT 'open' CHECK (resolution_status IN ('open', 'acknowledged', 'resolved', 'false_positive')),
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approval workflows
CREATE TABLE approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What needs approval
    request_type TEXT NOT NULL CHECK (request_type IN ('initiative', 'budget', 'strategy_change', 'policy_exception', 'other')),
    request_title TEXT NOT NULL,
    request_description TEXT,
    reference_id UUID,                        -- ID of initiative, decision, etc.
    reference_table TEXT,                     -- 'strategy_initiatives', 'decision_log', etc.

    -- Requester
    requested_by UUID NOT NULL REFERENCES users(id),
    department_id UUID REFERENCES departments(id),

    -- Approval chain
    approval_level INTEGER DEFAULT 1,         -- Current level in chain
    required_approvers JSONB DEFAULT '[]',    -- Array of user IDs or role IDs

    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'escalated')),

    -- Metadata
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approval responses
CREATE TABLE approval_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,

    -- Approver
    approver_id UUID NOT NULL REFERENCES users(id),

    -- Response
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'escalated', 'deferred')),
    comments TEXT,
    conditions TEXT,                          -- Approval conditions if any

    -- Metadata
    responded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risk register
CREATE TABLE risk_register (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Risk identification
    risk_title TEXT NOT NULL,
    risk_description TEXT,
    risk_category TEXT CHECK (risk_category IN ('strategic', 'operational', 'financial', 'compliance', 'reputational', 'technology')),

    -- Assessment
    likelihood TEXT CHECK (likelihood IN ('rare', 'unlikely', 'possible', 'likely', 'almost_certain')),
    impact TEXT CHECK (impact IN ('insignificant', 'minor', 'moderate', 'major', 'catastrophic')),
    risk_score INTEGER,                       -- Calculated from likelihood × impact

    -- Source
    source_type TEXT,                         -- 'strategy_planning', 'audit', 'incident', 'manual'
    source_reference_id UUID,
    department_id UUID REFERENCES departments(id),

    -- Ownership
    risk_owner_id UUID REFERENCES users(id),

    -- Mitigation
    mitigation_strategy TEXT,
    mitigation_status TEXT DEFAULT 'identified' CHECK (mitigation_status IN ('identified', 'planned', 'in_progress', 'implemented', 'accepted')),

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'monitoring', 'closed', 'accepted')),

    -- Metadata
    identified_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    review_date TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_compliance_dept ON policy_compliance_records(department_id);
CREATE INDEX idx_compliance_status ON policy_compliance_records(resolution_status);
CREATE INDEX idx_compliance_created ON policy_compliance_records(created_at);
CREATE INDEX idx_approvals_status ON approval_requests(status);
CREATE INDEX idx_approvals_requester ON approval_requests(requested_by);
CREATE INDEX idx_risks_dept ON risk_register(department_id);
CREATE INDEX idx_risks_status ON risk_register(status);
```

### Integrity Dashboard

#### Purpose
Track data quality, AI output integrity, and system health metrics.

#### Key Components

**3.2.1 Data Quality Metrics**
- Context asset freshness (last updated)
- Completeness scores per asset type
- Validation status

**3.2.2 AI Integrity Checks**
- Output quality scoring
- Bias detection alerts
- Hallucination flags
- Value alignment verification

**3.2.3 Context Health**
- Context assets by status (active, stale, deprecated)
- Usage frequency
- Missing critical assets

**3.2.4 System Metrics**
- Agent performance scores
- Error rates by agent
- User satisfaction (if tracked)

#### Database Schema

```sql
-- ============================================
-- INTEGRITY TABLES
-- ============================================

-- Context asset health tracking
CREATE TABLE context_health_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_asset_id UUID NOT NULL REFERENCES context_assets(id) ON DELETE CASCADE,

    -- Scores (0-100)
    freshness_score INTEGER,                  -- Based on last_updated
    completeness_score INTEGER,               -- Based on required fields
    usage_score INTEGER,                      -- Based on usage frequency
    overall_score INTEGER,                    -- Weighted average

    -- Details
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count_30d INTEGER DEFAULT 0,
    missing_fields JSONB DEFAULT '[]',

    -- Status
    health_status TEXT CHECK (health_status IN ('healthy', 'needs_attention', 'stale', 'critical')),

    -- Metadata
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI output integrity tracking
CREATE TABLE ai_integrity_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source
    conversation_id UUID,
    message_id UUID,
    agent_id UUID REFERENCES agents(id),

    -- Check results
    quality_score INTEGER,                    -- 0-100
    relevance_score INTEGER,                  -- 0-100
    accuracy_flags JSONB DEFAULT '{}',        -- {"factual": true, "consistent": true}

    -- Issues detected
    bias_detected BOOLEAN DEFAULT false,
    bias_type TEXT,                           -- 'gender', 'racial', 'political', etc.
    bias_details TEXT,

    hallucination_risk TEXT CHECK (hallucination_risk IN ('low', 'medium', 'high')),
    hallucination_flags JSONB DEFAULT '[]',

    value_alignment_score INTEGER,            -- How well output aligns with company values
    bright_line_violations JSONB DEFAULT '[]',

    -- Metadata
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent performance metrics (aggregated)
CREATE TABLE agent_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Usage
    total_conversations INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,

    -- Quality
    avg_quality_score DECIMAL(5,2),
    avg_relevance_score DECIMAL(5,2),
    avg_value_alignment DECIMAL(5,2),

    -- Issues
    bias_incidents INTEGER DEFAULT 0,
    hallucination_flags INTEGER DEFAULT 0,
    bright_line_violations INTEGER DEFAULT 0,

    -- Performance
    avg_response_time_ms INTEGER,
    error_count INTEGER DEFAULT 0,

    -- Satisfaction (if tracked)
    thumbs_up INTEGER DEFAULT 0,
    thumbs_down INTEGER DEFAULT 0,

    -- Metadata
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(agent_id, period_start, period_end)
);

-- Integrity alerts
CREATE TABLE integrity_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Alert type
    alert_type TEXT NOT NULL CHECK (alert_type IN ('data_quality', 'ai_integrity', 'policy_violation', 'system_health')),
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),

    -- Details
    title TEXT NOT NULL,
    description TEXT,
    affected_entity_type TEXT,                -- 'agent', 'context_asset', 'user', 'department'
    affected_entity_id UUID,

    -- Status
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'investigating', 'resolved', 'dismissed')),

    -- Assignment
    assigned_to UUID REFERENCES users(id),

    -- Resolution
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_context_health_asset ON context_health_scores(context_asset_id);
CREATE INDEX idx_context_health_status ON context_health_scores(health_status);
CREATE INDEX idx_ai_integrity_agent ON ai_integrity_checks(agent_id);
CREATE INDEX idx_ai_integrity_date ON ai_integrity_checks(checked_at);
CREATE INDEX idx_agent_metrics_agent ON agent_performance_metrics(agent_id);
CREATE INDEX idx_agent_metrics_period ON agent_performance_metrics(period_start, period_end);
CREATE INDEX idx_integrity_alerts_status ON integrity_alerts(status);
CREATE INDEX idx_integrity_alerts_severity ON integrity_alerts(severity);
```

### API Endpoints

```
# Governance
GET    /api/governance/compliance                  → Compliance summary and recent records
GET    /api/governance/compliance/department/:id   → Department compliance details
GET    /api/governance/approvals                   → Pending approvals for current user
GET    /api/governance/approvals/:id               → Approval request details
POST   /api/governance/approvals/:id/respond       → Submit approval response
GET    /api/governance/risks                       → Risk register list
POST   /api/governance/risks                       → Add new risk
PUT    /api/governance/risks/:id                   → Update risk
GET    /api/governance/decisions                   → Decision audit trail

# Integrity
GET    /api/integrity/overview                     → Dashboard summary
GET    /api/integrity/context-health               → Context asset health scores
GET    /api/integrity/context-health/:assetId      → Specific asset health
GET    /api/integrity/ai-checks                    → Recent AI integrity checks
GET    /api/integrity/agent-metrics                → Agent performance metrics
GET    /api/integrity/agent-metrics/:agentId       → Specific agent metrics
GET    /api/integrity/alerts                       → Active integrity alerts
PUT    /api/integrity/alerts/:id                   → Update alert status
```

### Dashboard Wireframes

#### Governance Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Governance Dashboard                                           [? Help]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ Compliance Rate │  │ Pending         │  │ Active Risks    │             │
│  │      94%        │  │ Approvals: 7    │  │      12         │             │
│  │   ▲ +2% MTD     │  │ ⚠ 2 Overdue     │  │ 3 High Priority │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Compliance by Department                                              │ │
│  │ ████████████████████████████████░░░░░░░ Sales: 96%                    │ │
│  │ ████████████████████████████░░░░░░░░░░░ Marketing: 89%                │ │
│  │ ████████████████████████████████████░░░ Operations: 98%               │ │
│  │ ██████████████████████████████████████░ Finance: 99%                  │ │
│  │ ████████████████████████████░░░░░░░░░░░ HR: 87%                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐ │
│  │ Pending Approvals               │  │ Recent Decisions                │ │
│  │ ○ Q1 Budget Increase - Finance  │  │ ✓ New Market Entry - Jan 3      │ │
│  │   Due: Jan 5 (2 days)           │  │ ✓ Vendor Selection - Jan 2      │ │
│  │ ○ New Hire Request - Sales      │  │ ✓ Policy Update - Dec 30        │ │
│  │   Due: Jan 6 (3 days)           │  │ ○ Partnership Terms - Pending   │ │
│  │ ⚠ Strategy Change - Exec       │  │                                 │ │
│  │   Due: Jan 2 (OVERDUE)          │  │ [View All Decisions →]          │ │
│  │ [View All →]                    │  │                                 │ │
│  └─────────────────────────────────┘  └─────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Integrity Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Integrity Dashboard                                            [? Help]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ Context Health  │  │ AI Quality      │  │ Active Alerts   │             │
│  │      87%        │  │ Score: 92%      │  │       4         │             │
│  │ 3 Need Attention│  │ ▲ +5% this week │  │ 1 Critical      │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Context Asset Health                                                  │ │
│  │ Type              Healthy    Needs Attention    Stale    Critical     │ │
│  │ Voice DNA         ███████░░  1                  0        0            │ │
│  │ ICP               ███████░░  1                  0        0            │ │
│  │ Products          █████░░░░  2                  1        0            │ │
│  │ Bright Lines      █████████  0                  0        0            │ │
│  │ Terminology       ██████░░░  1                  1        0            │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐ │
│  │ AI Integrity This Week          │  │ Top Performing Agents           │ │
│  │                                 │  │                                 │ │
│  │ Quality Checks:     1,247      │  │ 1. Content Writer      98%      │ │
│  │ Bias Detected:      3 (0.2%)   │  │ 2. Strategy Advisor    96%      │ │
│  │ Hallucination Risk: 12 (1%)    │  │ 3. Sales Coach         95%      │ │
│  │ Value Violations:   0          │  │ 4. Market Analyst      94%      │ │
│  │                                 │  │ 5. HR Assistant        93%      │ │
│  │ [View Details →]               │  │                                 │ │
│  └─────────────────────────────────┘  └─────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Active Alerts                                                         │ │
│  │ 🔴 CRITICAL: Voice DNA context asset not updated in 90 days          │ │
│  │ 🟡 HIGH: Agent "Research Bot" has elevated hallucination risk        │ │
│  │ 🟡 HIGH: 3 context assets missing required fields                    │ │
│  │ 🔵 MEDIUM: Product catalog context shows low usage                   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Recommended Order

| Order | Component | Effort | Dependencies |
|-------|-----------|--------|--------------|
| 1 | Business Roles Schema | Medium | None |
| 2 | Business Roles Admin UI | Medium | #1 |
| 3 | Department Strategy Schema | Medium | None |
| 4 | S2E Department Tabs UI | High | #1, #3 |
| 5 | Department Mini-Wizard | High | #4 |
| 6 | Governance Schema | Medium | None |
| 7 | Governance Dashboard | High | #6 |
| 8 | Integrity Schema | Medium | None |
| 9 | Integrity Dashboard | High | #8 |
| 10 | Integration & Testing | Medium | All |

### File Changes Summary

**New Files:**
- `db/phase13-business-roles.sql` - Business roles schema
- `db/phase13-department-strategy.sql` - Department strategy schema
- `db/phase13-governance.sql` - Governance tables
- `db/phase13-integrity.sql` - Integrity tables
- `server/routes/business-roles.js` - Business roles API
- `server/routes/governance.js` - Governance API
- `server/routes/integrity.js` - Integrity API
- `server/services/permissions.js` - Permission resolution service
- `public/governance.html` - Governance dashboard
- `public/integrity.html` - Integrity dashboard
- `public/js/governance.js` - Governance dashboard JS
- `public/js/integrity.js` - Integrity dashboard JS

**Modified Files:**
- `server/routes/s2e.js` - Add department strategy endpoints
- `server/routes/auth.js` - Add business role to user endpoints
- `server/routes/admin.js` - Add permission management endpoints
- `public/strategy.html` - Add department tabs
- `public/user-management.html` - Add business role UI
- `public/js/navigation.js` - Update dashboard links
- `db/seeds/master-seed.sql` - Add business role seeds

---

## Notes

- All defaults are admin-configurable
- Department list is dynamic per client (not hardcoded)
- Permission system designed for future extensibility
- Integrity checks can be automated via scheduled jobs
- Governance alerts can trigger notifications

---

*Document Version: 1.0 | Last Updated: January 4, 2026*
