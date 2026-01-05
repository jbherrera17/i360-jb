# Insight 360 Blueprint v2.31

**Version:** 2.31
**Date:** January 5, 2026
**Status:** Phase 13 | Business Roles, Department Strategy, Governance & System Health

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.31

### Phase 13: Business Roles, Department Strategy, Governance & System Health

Phase 13 implements the enterprise permission system with business roles, department-level strategy management, governance controls, and system health monitoring. This creates the foundation for multi-department organizations with tiered access control.

---

### Business Roles System

A two-tier role system that separates platform access from business permissions.

#### Role Architecture

| Layer | Purpose | Roles |
|-------|---------|-------|
| **System Role** | Platform-level access | admin, user, viewer |
| **Business Role** | Department/strategy access | executive, director, manager, supervisor, ic |

#### Business Role Levels

| Role | Level | Can View Other Depts | Can Edit Strategy |
|------|-------|---------------------|-------------------|
| Executive | 5 | ✅ | ✅ Company + Dept |
| Director | 4 | ✅ | ✅ Dept Only |
| Manager | 3 | ✅ | ❌ |
| Supervisor | 2 | ❌ | ❌ |
| Individual Contributor | 1 | ❌ | ❌ |

#### Permission Inheritance

```
User Permission = User Override ?? Business Role Default
```

Override allows granting/revoking specific permissions per user.

---

### Department Strategy

Cascade company objectives down to department-level OKRs with progress tracking.

#### Schema Structure

```
bsc_objectives (Company)
    ↓ links to
department_objectives (Department)
    ↓ has many
department_key_results (Measurable outcomes)
    ↓ tracked by
department_strategy_notes (Updates/wins/blockers)
```

#### Features

- Objectives linked to company BSC objectives
- Key Results with target/current value tracking
- Auto-status based on progress (on_track, at_risk, behind, completed)
- Strategy notes for updates, wins, blockers, decisions
- Department strategy access control

---

### Governance Module

Enterprise controls for feature management, access policies, and audit logging.

#### Feature Flags

| Scope | Description |
|-------|-------------|
| global | Affects all users |
| company | Per-company settings |
| department | Per-department |
| user | Per-user override |

Features include rollout percentage for gradual releases.

#### Access Policies

Company-wide and department-specific policies with JSON configuration.

Default policies seeded:
- `default_cross_dept_view` - Cross-department visibility
- `default_strategy_access` - Strategy view/edit levels
- `audit_retention` - Log retention settings
- `password_policy` - Password requirements

#### Audit Log

Immutable record of sensitive actions with:
- User identification (denormalized email)
- Action type and category
- Target entity tracking
- JSONB details for context

---

### System Health Monitoring

Real-time monitoring of all system components with alerting and incident tracking.

#### Component Registry

12 components seeded by default:

| Category | Components |
|----------|------------|
| System | API Server, Supabase Database, Authentication |
| Integration | Anthropic Claude, OpenAI GPT, Brave Search, Tavily Search |
| Feature | S2E, Execute 120, Align 120, Daily Briefing, Agent Library |

#### Health Metrics

Each critical component tracks:
- Response Time (ms)
- Error Rate (%)
- Uptime (%)

With configurable warning and critical thresholds.

#### Alerts & Incidents

- **Alerts**: Automated threshold-based notifications
- **Incidents**: Manual or escalated issues with timeline tracking
- **Status**: active → acknowledged → resolved

---

### New API Routes

#### Business Roles API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/business-roles/levels` | GET | List all business role levels |
| `/api/business-roles/defaults` | GET | Get default permissions per role |
| `/api/business-roles/users/:id/permissions` | GET | Get effective user permissions |
| `/api/business-roles/users/:id/role` | PUT | Update user's business role |
| `/api/business-roles/users/:id/overrides` | PUT | Set permission overrides |

#### Department Strategy API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/department-strategy/objectives` | GET/POST | List/create objectives |
| `/api/department-strategy/objectives/:id` | GET/PUT/DELETE | Manage objective |
| `/api/department-strategy/key-results` | GET/POST | List/create key results |
| `/api/department-strategy/key-results/:id` | PUT/DELETE | Update/delete key result |
| `/api/department-strategy/notes` | GET/POST | Strategy notes |
| `/api/department-strategy/summary` | GET | Department strategy summary |

#### Governance API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/governance/feature-flags` | GET | List feature flags |
| `/api/governance/feature-flags/check/:key` | GET | Check if feature enabled |
| `/api/governance/policies` | GET | List access policies |
| `/api/governance/audit-log` | GET/POST | Audit log entries |
| `/api/governance/compliance` | GET | Compliance requirements |

#### Integrity API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/integrity/health` | GET | Overall system health |
| `/api/integrity/components` | GET | List all components |
| `/api/integrity/components/:key` | GET | Component details with metrics |
| `/api/integrity/components/:key/check` | POST | Record health check |
| `/api/integrity/alerts` | GET/POST | Manage alerts |
| `/api/integrity/alerts/:id/acknowledge` | PUT | Acknowledge alert |
| `/api/integrity/alerts/:id/resolve` | PUT | Resolve alert |
| `/api/integrity/incidents` | GET/POST | Manage incidents |
| `/api/integrity/incidents/active` | GET | Active incidents |

---

### Database Schema

#### New Tables

| Table | Purpose |
|-------|---------|
| `business_role_levels` | Role definitions (5 levels) |
| `business_role_defaults` | Default permissions per role |
| `user_permission_overrides` | Per-user permission overrides |
| `department_objectives` | Department-level objectives |
| `department_key_results` | Key results for objectives |
| `department_strategy_notes` | Strategy updates/notes |
| `department_strategy_access` | Access control per department |
| `access_policies` | Company/department policies |
| `feature_flags` | Feature toggle configuration |
| `audit_log` | Immutable action log |
| `compliance_requirements` | Compliance tracking |
| `integrity_components` | System component registry |
| `integrity_metrics` | Metric definitions |
| `integrity_metric_values` | Time-series metric data |
| `integrity_component_status` | Current component status |
| `integrity_incidents` | Incident tracking |
| `integrity_incident_updates` | Incident update log |
| `integrity_alerts` | Alert history |

#### New Views

| View | Purpose |
|------|---------|
| `user_effective_permissions` | Merged user + role permissions |
| `department_strategy_summary` | Aggregated strategy stats per dept |
| `integrity_system_health` | Component health overview |
| `integrity_active_incidents` | Active incident list |

---

### UI Updates

#### Admin Page Enhancements

- Added **Business Role Defaults** tab
- Permission grid showing all role defaults
- Business Role selector in user edit modal
- Department selector in user edit modal
- Business Role badge in users table

#### New System Health Dashboard

Access at `/system-health` with:
- Overall health score and status
- Component health cards (12 components)
- Active alerts list with acknowledge/resolve
- Active incidents with timeline
- Auto-refresh every 30 seconds

---

### Files Changed

#### New Files

| File | Purpose |
|------|---------|
| `db/phase13-business-roles.sql` | Business roles schema |
| `db/phase13-department-strategy.sql` | Department strategy schema |
| `db/phase13-governance.sql` | Governance schema |
| `db/phase13-integrity.sql` | System health schema |
| `server/routes/business-roles.js` | Business roles API |
| `server/routes/departments.js` | Departments API |
| `server/routes/department-strategy.js` | Department strategy API |
| `server/routes/governance.js` | Governance API |
| `server/routes/integrity.js` | System health API |
| `public/system-health.html` | System health dashboard |

#### Modified Files

| File | Changes |
|------|---------|
| `server/index.js` | Register new routes, add system-health page |
| `public/admin.html` | Business role tabs, permission grid, role selectors |

---

### Production Readiness Score

**Score: 7/10** (+0.5)

| Area | Score | Change | Notes |
|------|-------|--------|-------|
| Architecture | 8/10 | +0.5 | Enterprise permission model |
| Security | 7/10 | - | RLS for all new tables |
| Error Handling | 7/10 | - | Good coverage |
| Database | 8/10 | +0.5 | Comprehensive schema, views |
| Testing | 0/10 | - | No tests yet |
| Observability | 3/10 | +1.5 | System health monitoring |
| Documentation | 8/10 | - | API routes documented |
| User Experience | 7.5/10 | +0.5 | Admin UX, health dashboard |

---

### Next Steps (Phase 14)

- [ ] Structured logging with Winston/Pino
- [ ] Request correlation IDs
- [ ] Log aggregation setup
- [ ] Prometheus metrics endpoint
- [ ] Error tracking (Sentry integration)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.31 | Jan 5, 2026 | Business roles, department strategy, governance, system health |
| v2.30 | Jan 4, 2026 | Navigation restructure, Agent Library UX, category data fix |
| v2.29 | Jan 4, 2026 | User onboarding wizard, profile page, new client setup system |
| v2.28 | Jan 3, 2026 | Execute 120 schema, 16 agents, 5 system workflows |
| v2.27 | Jan 2, 2026 | Security fixes, RLS policy fix, user management |
| v2.26 | Jan 2, 2026 | Navigation redesign, UI consistency |
