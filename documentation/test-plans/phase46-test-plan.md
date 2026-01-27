# Phase 46 Test Plan: Module Management & Admin Reorganization

**Version:** 1.0
**Date:** January 2026
**Phase:** 46 - Module Management & Resource Organization

---

## Overview

This test plan covers the Phase 46 implementation including:
- Database migration (org_id backfill)
- Organization filtering on resource routes
- Module CRUD endpoints
- Tier modules display
- Administrator page reorganization

---

## 1. Database Migration Tests

### 1.1 Actions Table org_id Column
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Column exists | Run `SELECT column_name FROM information_schema.columns WHERE table_name = 'actions' AND column_name = 'org_id'` | Returns `org_id` row |
| Foreign key constraint | Check constraint references organizations table | FK to organizations(id) exists |

### 1.2 Backfill Verification
Run the verification query:
```sql
SELECT
    'context_assets' as table_name,
    COUNT(*) FILTER (WHERE org_id IS NOT NULL) as with_org,
    COUNT(*) FILTER (WHERE org_id IS NULL) as without_org
FROM context_assets
UNION ALL
SELECT 'agents', COUNT(*) FILTER (WHERE org_id IS NOT NULL), COUNT(*) FILTER (WHERE org_id IS NULL) FROM agents
UNION ALL
SELECT 'skills', COUNT(*) FILTER (WHERE org_id IS NOT NULL), COUNT(*) FILTER (WHERE org_id IS NULL) FROM skills
UNION ALL
SELECT 'workflows', COUNT(*) FILTER (WHERE org_id IS NOT NULL), COUNT(*) FILTER (WHERE org_id IS NULL) FROM workflows
UNION ALL
SELECT 'actions', COUNT(*) FILTER (WHERE org_id IS NOT NULL), COUNT(*) FILTER (WHERE org_id IS NULL) FROM actions;
```

| Test | Expected Result |
|------|-----------------|
| Resources with user's default_org_id set | Should have org_id populated |
| Resources from users without default_org_id | Should have org_id = NULL |

### 1.3 Index Verification
```sql
SELECT indexname FROM pg_indexes WHERE tablename IN ('context_assets', 'agents', 'skills', 'workflows', 'actions') AND indexname LIKE '%org_filter%';
```

| Test | Expected Result |
|------|-----------------|
| All 5 indexes exist | Returns 5 rows: idx_*_org_filter |

---

## 2. Organization Filtering Tests

### 2.1 Context Assets (GET /api/context/assets)

| Test | Setup | Request | Expected Result |
|------|-------|---------|-----------------|
| Filter by org | Assets with different org_ids | `x-org-id: {org1}` header | Only returns assets where org_id = org1 OR org_id IS NULL |
| No org header | Assets with org_ids set | No x-org-id header | Returns all accessible assets (no org filter) |
| System assets visible | Assets with org_id = NULL | `x-org-id: {any}` header | System assets (null org_id) always visible |

### 2.2 Agents (GET /api/agents)

| Test | Setup | Request | Expected Result |
|------|-------|---------|-----------------|
| Filter by org | Agents in org1 and org2 | `x-org-id: {org1}` | Only org1 agents + system agents |
| Cross-org isolation | User in org1, agents in org2 | `x-org-id: {org1}` | org2 agents NOT visible |

### 2.3 Skills (GET /api/skills)

| Test | Setup | Request | Expected Result |
|------|-------|---------|-----------------|
| Filter by org | Skills with org_ids | `x-org-id: {org1}` | Only org1 skills + system skills |

### 2.4 Workflows (GET /api/workflows)

| Test | Setup | Request | Expected Result |
|------|-------|---------|-----------------|
| Filter by org | Workflows with org_ids | `x-org-id: {org1}` | Only org1 workflows + system workflows |

### 2.5 Actions (GET /api/actions)

| Test | Setup | Request | Expected Result |
|------|-------|---------|-----------------|
| Filter by org | Actions with org_ids | `x-org-id: {org1}` | Only org1 actions + system actions |

---

## 3. Module CRUD Endpoint Tests

### 3.1 Create Module (POST /api/platform/modules)

| Test | Request Body | Expected Result |
|------|--------------|-----------------|
| Valid module | `{ "id": "test_module", "name": "Test Module", "category": "tools" }` | 201 Created, returns module data |
| Missing ID | `{ "name": "Test" }` | 400 Bad Request - "Module ID and name are required" |
| Missing name | `{ "id": "test" }` | 400 Bad Request - "Module ID and name are required" |
| Invalid ID format | `{ "id": "Test-Module", "name": "Test" }` | 400 Bad Request - ID must be lowercase with underscores |
| ID starts with number | `{ "id": "1test", "name": "Test" }` | 400 Bad Request - ID must start with letter |
| Duplicate ID | Create same module twice | 409 Conflict - "A module with this ID already exists" |
| Default values | `{ "id": "test", "name": "Test" }` | icon='puzzle', category='tools', min_tier='starter', is_active=true |
| Auto display_order | Create without display_order | display_order = max existing + 10 |
| With all fields | Full module definition | All fields saved correctly |

### 3.2 Update Module (PUT /api/platform/modules/:id)

| Test | Setup | Request | Expected Result |
|------|-------|---------|-----------------|
| Update name | Existing module | `{ "name": "New Name" }` | 200 OK, name updated |
| Update category | Existing module | `{ "category": "suites" }` | 200 OK, category updated |
| Update min_tier | Existing module | `{ "min_tier": "business" }` | 200 OK, min_tier updated |
| Non-existent module | No module with ID | PUT /api/platform/modules/fake | 404 Not Found |
| Toggle is_active | Active module | `{ "is_active": false }` | Module deactivated |

### 3.3 Delete Module (DELETE /api/platform/modules/:id)

| Test | Setup | Request | Expected Result |
|------|-------|---------|-----------------|
| Soft delete (default) | Active module | DELETE /api/platform/modules/test | 200 OK, is_active = false |
| Hard delete | Existing module | DELETE /api/platform/modules/test?hard=true | 200 OK, module removed |
| Non-existent module | No module with ID | DELETE /api/platform/modules/fake | 404 Not Found |

### 3.4 Authentication Tests

| Test | Request | Expected Result |
|------|---------|-----------------|
| No token | POST /api/platform/modules | 401 Unauthorized |
| Non-admin user | POST with regular user token | 403 Forbidden |
| Read-only admin | POST with read-only admin token | 403 Forbidden |
| Write admin | POST with write admin token | 201 Created |

---

## 4. Tier Modules Endpoint Tests

### 4.1 GET /api/platform/tiers/:id/modules

| Test | Setup | Request | Expected Result |
|------|-------|---------|-----------------|
| Starter tier | Modules with various min_tier | GET /tiers/starter/modules | Only starter modules |
| Business tier | Modules with various min_tier | GET /tiers/business/modules | starter + business modules |
| Enterprise tier | Modules with various min_tier | GET /tiers/enterprise/modules | starter + business + enterprise modules |
| Agency tier | Modules with various min_tier | GET /tiers/agency/modules | All modules (highest tier) |
| Invalid tier | - | GET /tiers/invalid/modules | 400 Bad Request - "Invalid tier ID" |
| Include inactive | Inactive modules exist | GET /tiers/starter/modules?include_inactive=true | Includes inactive modules |
| Exclude inactive (default) | Inactive modules exist | GET /tiers/starter/modules | Only active modules |
| Grouped by category | Various categories | Any tier request | Response has by_category object |
| Total count | Multiple modules | Any tier request | total_count matches modules.length |

---

## 5. Admin Tier Setup Page Tests

### 5.1 Module Display (admin-tier-setup.html)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Page loads | Navigate to admin-tier-setup.html | Tier cards display |
| Modules section visible | View any tier card | "Modules Included" section present |
| Module count badge | View tier card | Shows correct module count |
| Modules grouped | View tier card | Modules grouped by category (Core, Tools, Suites, Admin) |
| Module icons render | View module items | Lucide icons display correctly |
| Beta badge | Module with is_beta=true | Shows "BETA" label |
| Module tooltip | Hover over module item | Shows module description |
| Higher tiers show more | Compare starter vs agency | Agency shows more modules than starter |

### 5.2 Empty States

| Test | Setup | Expected Result |
|------|-------|-----------------|
| No modules configured | Delete all modules | Shows "No modules configured" |
| No modules for tier | All modules require higher tier | Shows "No modules available" |

---

## 6. Platform Admin Modules Tab Tests

### 6.1 Module Table (admin-platform.html > Modules Tab)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Tab visible | Navigate to admin-platform.html | Modules tab in navigation |
| Table loads | Click Modules tab | Module table displays |
| Search works | Type in search box | Table filters by name/id/description |
| Category filter | Select category dropdown | Table filters by category |
| Combined filters | Search + category filter | Both filters apply |
| Clear search | Clear search input | Shows all modules |

### 6.2 Create Module Modal

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Modal opens | Click "Create Module" button | Form modal appears |
| Required fields | Submit empty form | Validation errors shown |
| ID validation | Enter invalid ID (uppercase, spaces) | Shows validation error |
| Successful create | Fill valid data, submit | Module added, table refreshes |
| Default values | Leave optional fields empty | Uses defaults (icon=puzzle, etc.) |
| Cancel | Click cancel/outside modal | Modal closes, no changes |

### 6.3 Edit Module

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Edit button works | Click Edit on module row | Edit modal opens with current values |
| Values pre-filled | Open edit modal | All fields show current module data |
| Save changes | Modify fields, save | Module updated, table refreshes |
| Cancel edit | Click cancel | No changes saved |

### 6.4 Delete/Deactivate Module

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Delete button works | Click trash icon | Confirmation modal appears |
| Confirm deactivate | Click Deactivate | Module status changes to Disabled |
| Cancel delete | Click Cancel | No changes |
| Status badge updates | After deactivation | Shows "Disabled" badge |

---

## 7. Administrator Page Tests

### 7.1 Tab Navigation (administrator.html)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Page loads | Navigate to administrator.html | Page loads with Dashboard tab active |
| Dashboard tab | Click Dashboard tab | Dashboard content visible |
| Setup tab | Click Setup tab | Setup wizard visible |
| Onboarding tab | Click Onboarding tab | Onboarding checklist visible |
| Daily Ops tab | Click Daily Ops tab | User/conversation management visible |
| Maintenance tab | Click Maintenance tab | Admin links grid visible |
| Tab state persists | Switch tabs multiple times | Correct content shows each time |

### 7.2 Dashboard Tab

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Status cards render | View Dashboard tab | 4 status cards (Users, Orgs, Agents, API Health) |
| Stats load | Page loads | Card values populated from API |
| Quick actions visible | View Dashboard | Quick action buttons present |
| Quick action links | Click quick action | Navigates to correct page |
| Recent activity | View Dashboard | Activity list shows recent items |
| Empty activity | No recent activity | Shows "No recent activity" |
| Alerts section | Zero users/orgs | Shows info alerts |

### 7.3 Setup Tab (Setup Wizard)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Wizard renders | Click Setup tab | Wizard with step indicators |
| Step 1 - Org Details | View first step | Organization name/slug fields |
| Next button | Fill required fields, click Next | Advances to step 2 |
| Previous button | Click Previous | Returns to previous step |
| Step validation | Click Next with empty required field | Validation error shown |
| Skip wizard | Click "Skip & Start Fresh" | Wizard dismisses |
| Complete wizard | Fill all steps, complete | Organization created |

### 7.4 Onboarding Tab (Checklist)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Checklist renders | Click Onboarding tab | Checklist with 8 items |
| Progress circle | View checklist | Circular progress indicator |
| Progress bar | View checklist | Horizontal progress bar |
| Completed items | Items completed | Green checkmark, dimmed style |
| Pending items | Items not completed | Circle icon, clickable |
| Click pending item | Click incomplete item | Navigates to setup page |
| 100% complete | All items done | Shows celebration message |
| Org name display | View checklist | Shows selected org name |
| No org selected | No org in localStorage | Shows "No Organization Selected" |

### 7.5 Daily Ops Tab

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Cards visible | Click Daily Ops tab | User Mgmt, Team Members, Conversations, Sessions cards |
| Conversation count | View Conversations card | Shows count badge |
| Session count | View Sessions card | Shows count badge |
| Conversations panel | Click Conversations card | Expandable panel opens |
| Sessions panel | Click Sessions card | Expandable panel opens |
| Close panel | Click X on panel | Panel closes |
| Table data | Open panel | Shows recent items |

### 7.6 Maintenance Tab

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Sections visible | Click Maintenance tab | Platform Admin, System, Org, Content sections |
| Platform admin visible | User is platform admin | Platform Dashboard, Tier Config, Resource Access cards |
| Platform admin hidden | User is NOT platform admin | Platform admin section hidden |
| Card links work | Click any card | Navigates to correct page |
| Card hover state | Hover over card | Visual feedback (border color, shadow) |

---

## 8. Integration Tests

### 8.1 End-to-End Module Workflow

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Create module | Platform Admin > Modules > Create | Module appears in table |
| Module in tier | Admin Tier Setup > View tier card | New module appears (if min_tier allows) |
| Edit module tier | Change module min_tier | Module moves between tier cards |
| Deactivate module | Delete module (soft) | Module hidden from tier cards |
| Reactivate module | Edit, set is_active=true | Module reappears |

### 8.2 Org Filtering Workflow

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Create resource in org | Create agent with x-org-id header | Agent has org_id set |
| View with same org | List agents with same x-org-id | Agent visible |
| View with different org | List agents with different x-org-id | Agent NOT visible |
| View system resources | List with any org | System resources (org_id=null) always visible |

---

## 9. Error Handling Tests

| Test | Setup | Expected Result |
|------|-------|-----------------|
| API timeout | Slow/unreachable API | Loading state, then error toast |
| Invalid token | Expired/invalid JWT | Redirect to login or 401 error |
| Network error | Offline mode | Error toast, graceful degradation |
| Server error | 500 from API | Error message displayed |

---

## 10. Browser Compatibility

| Browser | Version | Tests |
|---------|---------|-------|
| Chrome | Latest | All UI tests |
| Firefox | Latest | All UI tests |
| Safari | Latest | All UI tests |
| Edge | Latest | All UI tests |

---

## Test Data Setup

### Sample Module for Testing
```json
{
  "id": "test_module",
  "name": "Test Module",
  "description": "A test module for Phase 46 testing",
  "icon": "flask",
  "category": "tools",
  "min_tier": "business",
  "min_business_role": null,
  "route_path": "/test-module",
  "nav_group": "tools",
  "is_active": true,
  "is_beta": true
}
```

### Sample Organizations
- Org A (Starter tier) - for basic filtering tests
- Org B (Business tier) - for tier comparison tests
- Org C (Agency tier) - for full access tests

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | | | |
| QA | | | |
| Product Owner | | | |
