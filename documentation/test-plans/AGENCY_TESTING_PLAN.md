# Agency Functionality Testing Plan

This document outlines both automated and manual testing strategies for the Agency (multi-tenant) functionality in Insight 360.

---

## Table of Contents

1. [Overview](#overview)
2. [Automated Testing Plan](#automated-testing-plan)
3. [Manual Onboarding Testing Plan](#manual-onboarding-testing-plan)
4. [Test Data Requirements](#test-data-requirements)
5. [Success Criteria](#success-criteria)

---

## Overview

The Agency functionality enables multi-tenant operations where:
- **Organizations** represent agencies/workspaces
- **Members** are team members with role-based access (owner, admin, consultant, viewer)
- **Clients** are the agency's customers being served

### Key Components Under Test

| Component | Route File | Test File |
|-----------|------------|-----------|
| Organizations | `server/routes/organizations.js` | `__tests__/integration/routes/organizations.test.js` |
| Org Members | `server/routes/org-members.js` | `__tests__/integration/routes/org-members.test.js` (NEW) |
| Clients | `server/routes/clients.js` | `__tests__/integration/routes/clients.test.js` |
| Connections | `server/routes/connections.js` | `__tests__/integration/routes/connections.test.js` (NEW) |

---

## Automated Testing Plan

### A. Organizations API Tests

**File:** `__tests__/integration/routes/organizations.test.js`

#### Existing Tests (✓ Implemented)
- [x] GET /api/organizations - List user's organizations
- [x] GET /api/organizations/:id - Get organization details
- [x] POST /api/organizations - Create organization
- [x] PUT /api/organizations/:id - Update organization
- [x] DELETE /api/organizations/:id - Delete organization
- [x] GET /api/organizations/:id/stats - Get organization statistics

#### Additional Tests Needed
- [ ] Create organization with custom slug
- [ ] Slug uniqueness validation
- [ ] Organization settings (branding, subscription tier)
- [ ] Personal workspace auto-creation on user signup
- [ ] Empty organization name validation
- [ ] Organization with special characters in name

---

### B. Organization Members API Tests

**File:** `__tests__/integration/routes/org-members.test.js` (TO CREATE)

#### Test Cases

```
describe('GET /api/org-members/:orgId')
  ✓ should return all members for authenticated org member
  ✓ should include user details (email, display_name, avatar)
  ✓ should return 401 when not authenticated
  ✓ should return 403 when not a member of the organization
  ✓ should order members by join date

describe('POST /api/org-members/:orgId/invite')
  ✓ should invite existing user as consultant (default role)
  ✓ should invite user with specified role (admin, viewer)
  ✓ should reactivate previously removed member
  ✓ should return 400 when email missing
  ✓ should return 400 when invalid role specified
  ✓ should return 403 when inviter is not admin/owner
  ✓ should return 404 when invitee email not found
  ✓ should return 400 when user already an active member

describe('PUT /api/org-members/:orgId/:memberId')
  ✓ should update member role when admin
  ✓ should update member role when owner
  ✓ should return 403 when consultant tries to update
  ✓ should return 403 when trying to change owner's role (non-owner)
  ✓ should allow owner to change their own role
  ✓ should return 400 for invalid role
  ✓ should return 404 for non-existent member

describe('DELETE /api/org-members/:orgId/:memberId')
  ✓ should soft-delete member (set status inactive)
  ✓ should return 403 when trying to remove owner
  ✓ should return 403 when non-admin tries to remove
  ✓ should return 404 for non-existent member

describe('POST /api/org-members/:orgId/leave')
  ✓ should allow member to leave organization
  ✓ should return 400 when owner tries to leave
  ✓ should return 404 when not a member
```

---

### C. Clients API Tests

**File:** `__tests__/integration/routes/clients.test.js`

#### Existing Tests (✓ Implemented)
- [x] GET /api/clients - List clients for organization
- [x] GET /api/clients/:id - Get client details
- [x] POST /api/clients - Create client
- [x] PUT /api/clients/:id - Update client
- [x] DELETE /api/clients/:id - Archive/delete client

#### Additional Tests Needed
- [ ] Client search by name/email
- [ ] Filter clients by status (prospect, active, paused, archived)
- [ ] Client engagement date tracking
- [ ] Client slug uniqueness within organization
- [ ] GET /api/clients/:id/stats - Client statistics

---

### D. Role-Based Access Control Matrix Tests

Create comprehensive RBAC tests:

```
describe('RBAC - Organization Operations')

  | Operation              | Owner | Admin | Consultant | Viewer |
  |------------------------|-------|-------|------------|--------|
  | View org details       | ✓     | ✓     | ✓          | ✓      |
  | Update org settings    | ✓     | ✓     | ✗          | ✗      |
  | Delete organization    | ✓     | ✗     | ✗          | ✗      |
  | Invite members         | ✓     | ✓     | ✗          | ✗      |
  | Remove members         | ✓     | ✓     | ✗          | ✗      |
  | Change member roles    | ✓     | ✓     | ✗          | ✗      |
  | View clients           | ✓     | ✓     | ✓          | ✓      |
  | Create clients         | ✓     | ✓     | ✓          | ✗      |
  | Update clients         | ✓     | ✓     | ✓          | ✗      |
  | Delete/archive clients | ✓     | ✓     | ✗          | ✗      |
```

---

### E. Running Automated Tests

```bash
# Run all tests
npm test

# Run Agency-specific tests
npm test -- __tests__/integration/routes/organizations.test.js
npm test -- __tests__/integration/routes/clients.test.js
npm test -- __tests__/integration/routes/org-members.test.js

# Run with coverage
npm test -- --coverage --collectCoverageFrom="server/routes/organizations.js"
npm test -- --coverage --collectCoverageFrom="server/routes/org-members.js"
npm test -- --coverage --collectCoverageFrom="server/routes/clients.js"

# Watch mode for development
npm test -- --watch
```

---

## Manual Onboarding Testing Plan

This section simulates a new agency onboarding to Insight 360.

### Scenario: "Acme Consulting" Onboarding

**Personas:**
- **Alice** - Agency Owner (alice@acmeconsulting.com)
- **Bob** - Senior Consultant (bob@acmeconsulting.com)
- **Carol** - Junior Consultant (carol@acmeconsulting.com)
- **Dan** - Client Contact at "TechCorp" (dan@techcorp.com)

---

### Phase 1: Account Creation & Organization Setup

#### Test 1.1: New User Registration
| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to http://localhost:3000 | Landing page loads | ☐ |
| 2 | Click "Sign Up" or register | Registration form appears | ☐ |
| 3 | Enter Alice's email and password | Account created | ☐ |
| 4 | Verify personal workspace created | Default org visible in switcher | ☐ |

#### Test 1.2: Create Agency Organization
| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to Organization Settings | Settings page loads | ☐ |
| 2 | Click "Create Organization" | Modal/form appears | ☐ |
| 3 | Enter "Acme Consulting" as name | Slug auto-generated: "acme-consulting" | ☐ |
| 4 | Submit form | Organization created, Alice is owner | ☐ |
| 5 | Verify org appears in switcher | "Acme Consulting" selectable | ☐ |
| 6 | View organization stats | Shows 1 member, 0 clients | ☐ |

---

### Phase 2: Team Member Onboarding

#### Test 2.1: Invite Team Members
| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to Team Members page | `/admin-org-members.html` loads | ☐ |
| 2 | Click "Invite Member" | Invite modal appears | ☐ |
| 3 | Enter Bob's email, role = "Consultant" | Form validates | ☐ |
| 4 | Submit invitation | Success message, Bob appears in list | ☐ |
| 5 | Repeat for Carol as "Consultant" | Carol added to team | ☐ |

#### Test 2.2: Verify Member Access
| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Log in as Bob | Bob sees "Acme Consulting" in org switcher | ☐ |
| 2 | Switch to Acme Consulting org | Org context changes | ☐ |
| 3 | Navigate to Team Members | Bob can view all members | ☐ |
| 4 | Try to invite new member | Should be blocked (Consultant role) | ☐ |
| 5 | Navigate to Clients | Clients page loads (empty) | ☐ |

#### Test 2.3: Role Management
| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | As Alice, go to Team Members | Member list with roles shown | ☐ |
| 2 | Change Bob's role to "Admin" | Role updated, Bob now Admin | ☐ |
| 3 | Log in as Bob, try to invite member | Now allowed (Admin role) | ☐ |
| 4 | As Bob, try to remove Alice | Blocked - cannot remove owner | ☐ |

---

### Phase 3: Client Management

#### Test 3.1: Create First Client
| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to Clients page | `/admin-clients.html` loads | ☐ |
| 2 | Click "Add Client" | Client form appears | ☐ |
| 3 | Enter details: | | |
|   | - Name: "TechCorp" | | ☐ |
|   | - Contact: "Dan" | | ☐ |
|   | - Email: "dan@techcorp.com" | | ☐ |
|   | - Status: "Prospect" | | ☐ |
| 4 | Submit form | Client created, appears in list | ☐ |
| 5 | View client details | All info displayed correctly | ☐ |

#### Test 3.2: Client Lifecycle
| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Edit TechCorp client | Edit form loads with current data | ☐ |
| 2 | Change status to "Active" | Status updated | ☐ |
| 3 | Set engagement start date | Date saved | ☐ |
| 4 | As Carol (Consultant), view client | Client visible | ☐ |
| 5 | As Carol, edit client | Edit allowed (Consultant can edit) | ☐ |
| 6 | As Carol, try to delete client | Blocked (Admin required) | ☐ |

#### Test 3.3: Client Search & Filter
| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Create 3 more clients with varied statuses | Clients created | ☐ |
| 2 | Filter by status = "Active" | Only active clients shown | ☐ |
| 3 | Search by "Tech" | TechCorp appears | ☐ |
| 4 | Clear filters | All clients shown | ☐ |

---

### Phase 4: Organization Context Isolation

#### Test 4.1: Multi-Org Data Isolation
| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | As Alice, switch to Personal Workspace | Context changes | ☐ |
| 2 | View Clients | No clients (different org) | ☐ |
| 3 | View Team Members | Only Alice shown | ☐ |
| 4 | Switch back to Acme Consulting | Full team and clients visible | ☐ |

#### Test 4.2: Cross-Org Agent Isolation
| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | In Acme Consulting, create an Agent | Agent created with org_id | ☐ |
| 2 | Switch to Personal Workspace | | ☐ |
| 3 | View Agents list | Acme agent NOT visible | ☐ |
| 4 | Create agent in Personal Workspace | Agent created | ☐ |
| 5 | Switch to Acme Consulting | Personal agent NOT visible | ☐ |

---

### Phase 5: Member Removal & Departures

#### Test 5.1: Remove Member
| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | As Alice, go to Team Members | | ☐ |
| 2 | Remove Carol from organization | Confirmation prompt appears | ☐ |
| 3 | Confirm removal | Carol status = inactive | ☐ |
| 4 | Log in as Carol | Acme Consulting not in org switcher | ☐ |

#### Test 5.2: Member Self-Departure
| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Log in as Bob | | ☐ |
| 2 | Navigate to org settings | "Leave Organization" option visible | ☐ |
| 3 | Click "Leave Organization" | Confirmation prompt | ☐ |
| 4 | Confirm departure | Removed from org, redirected | ☐ |
| 5 | Try to access Acme Consulting | Not allowed / not visible | ☐ |

#### Test 5.3: Owner Cannot Leave
| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | As Alice (owner), try to leave | Error: "Transfer ownership first" | ☐ |

---

### Phase 6: Organization Deletion

#### Test 6.1: Delete Organization
| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | As Alice, go to Org Settings | | ☐ |
| 2 | Click "Delete Organization" | Warning modal appears | ☐ |
| 3 | Confirm deletion | Organization deleted | ☐ |
| 4 | Verify cleanup | Members removed, clients orphaned/deleted | ☐ |

#### Test 6.2: Cannot Delete Personal Workspace
| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to Personal Workspace settings | | ☐ |
| 2 | Try to delete | Blocked with error message | ☐ |

---

### Phase 7: Edge Cases & Error Handling

#### Test 7.1: Validation Errors
| Test | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| Empty org name | Create org with blank name | 400 error, helpful message | ☐ |
| Duplicate slug | Create org with existing slug | 400 error, slug conflict | ☐ |
| Invalid email invite | Invite non-existent email | 404 error, user not found | ☐ |
| Self-invite | Invite yourself | 400 error, already member | ☐ |
| Duplicate invite | Invite already-active member | 400 error, already member | ☐ |

#### Test 7.2: Permission Errors
| Test | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| Viewer creates client | POST /api/clients as viewer | 403 Forbidden | ☐ |
| Consultant invites | POST invite as consultant | 403 Forbidden | ☐ |
| Non-member access | Access org you're not in | 403 Forbidden | ☐ |
| Admin deletes org | DELETE org as admin | 403 (owner only) | ☐ |

---

## Test Data Requirements

### Users to Create
```sql
-- Test users for manual testing
INSERT INTO users (id, email, display_name) VALUES
  ('user-alice', 'alice@acmeconsulting.com', 'Alice Owner'),
  ('user-bob', 'bob@acmeconsulting.com', 'Bob Admin'),
  ('user-carol', 'carol@acmeconsulting.com', 'Carol Consultant'),
  ('user-dan', 'dan@techcorp.com', 'Dan Viewer');
```

### API Test Calls (cURL)

```bash
# Health check
curl http://localhost:3000/api/health

# List organizations (requires auth cookie)
curl -b "auth_token=YOUR_TOKEN" http://localhost:3000/api/organizations

# Create organization
curl -X POST http://localhost:3000/api/organizations \
  -H "Content-Type: application/json" \
  -b "auth_token=YOUR_TOKEN" \
  -d '{"name": "Acme Consulting"}'

# Invite member
curl -X POST http://localhost:3000/api/org-members/ORG_ID/invite \
  -H "Content-Type: application/json" \
  -b "auth_token=YOUR_TOKEN" \
  -d '{"email": "bob@example.com", "role": "consultant"}'

# Create client
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -b "auth_token=YOUR_TOKEN" \
  -d '{"org_id": "ORG_ID", "name": "TechCorp", "contact_email": "dan@techcorp.com"}'
```

---

## Success Criteria

### Automated Tests
- [ ] All existing tests pass
- [ ] New org-members tests achieve 80%+ coverage
- [ ] RBAC matrix fully tested
- [ ] No security vulnerabilities in access control

### Manual Onboarding Tests
- [ ] Complete onboarding flow works end-to-end
- [ ] All role permissions work as documented
- [ ] Data isolation between orgs verified
- [ ] Error messages are clear and actionable
- [ ] UI feedback is immediate and accurate

### Performance Criteria
- [ ] Organization list loads < 500ms
- [ ] Member list loads < 500ms
- [ ] Client list (100 clients) loads < 1s
- [ ] Org switcher updates instantly

---

## Test Execution Log

| Date | Tester | Phase | Result | Notes |
|------|--------|-------|--------|-------|
| | | | | |

---

*Last Updated: January 2026*
*Version: 1.0*
