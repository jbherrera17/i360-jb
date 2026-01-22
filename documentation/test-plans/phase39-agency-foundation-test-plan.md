# Phase 39: Agency Foundation - Test Plan

## Overview
This document outlines the manual testing procedures for Phase 39: Agency Foundation, which introduces multi-tenant organization support, client management, and ephemeral session modes.

## Test Environment Setup

### Prerequisites
1. Fresh database with Phase 39 migrations applied:
   - `db/phase39-agency-foundation.sql`
   - `db/phase39-rls-org-aware.sql`
2. At least 2 test user accounts in different browsers/incognito windows
3. Server running with `npm run dev`

### Database Verification
Run these queries in Supabase SQL Editor to verify schema:
```sql
-- Check organizations table exists
SELECT * FROM organizations LIMIT 1;

-- Check organization_members table exists
SELECT * FROM organization_members LIMIT 1;

-- Check clients table exists
SELECT * FROM clients LIMIT 1;

-- Verify org_id columns added to existing tables
SELECT column_name FROM information_schema.columns
WHERE table_name = 'agents' AND column_name = 'org_id';
```

---

## Test Cases

### TC-001: User Migration to Personal Organization

**Objective:** Verify existing users are migrated to personal organizations

**Steps:**
1. Log in as an existing user
2. Navigate to `/admin-org-settings.html`
3. Check the organization dropdown

**Expected Results:**
- User should see at least one organization (their personal workspace)
- Personal workspace should show "(Personal)" label
- Stats should show 1 member (the owner)

**Notes:** If no org appears, run `SELECT migrate_users_to_personal_orgs();` in SQL Editor

---

### TC-002: Create New Organization

**Objective:** Verify organization creation flow

**Steps:**
1. Navigate to `/admin-org-settings.html`
2. Click "New Organization" button
3. Enter organization name: "Test Agency"
4. Leave slug empty (auto-generate)
5. Click "Create Organization"

**Expected Results:**
- Success toast appears
- New organization appears in dropdown
- Organization slug is auto-generated (e.g., "test-agency")
- User is set as owner
- Stats show 1 member

**Negative Tests:**
- Try creating org with duplicate slug → should fail with error message
- Try creating without name → should show validation error

---

### TC-003: Update Organization Settings

**Objective:** Verify organization settings can be updated

**Steps:**
1. Navigate to `/admin-org-settings.html`
2. Select a non-personal organization
3. Change the organization name
4. Change the brand color
5. Click "Save Changes"

**Expected Results:**
- Success toast appears
- Name updates in dropdown
- Brand color is saved

**Permission Tests:**
- Viewer role should see disabled inputs
- Admin role should be able to edit
- Owner role should see "Danger Zone" section

---

### TC-004: Invite Team Member

**Objective:** Verify member invitation flow

**Steps:**
1. Navigate to `/admin-org-members.html`
2. Click "Invite Member"
3. Enter email of another test user
4. Select role: "Consultant"
5. Click "Send Invitation"

**Expected Results:**
- Success toast appears
- New member appears in table
- Member shows "Consultant" role badge
- Member shows "active" status

**Negative Tests:**
- Try inviting non-existent email → should fail with "User not found"
- Try inviting already-invited member → should fail with "already a member"

---

### TC-005: Change Member Role

**Objective:** Verify role changes work correctly

**Steps:**
1. Navigate to `/admin-org-members.html`
2. Click Edit button for a consultant member
3. Change role to "Admin"
4. Save changes

**Expected Results:**
- Success toast appears
- Role badge updates to "Admin"

**Permission Tests:**
- Cannot change owner's role
- Only owner/admin can see edit buttons

---

### TC-006: Remove Team Member

**Objective:** Verify member removal works

**Steps:**
1. Navigate to `/admin-org-members.html`
2. Click Remove button for a member
3. Confirm removal

**Expected Results:**
- Success toast appears
- Member disappears from list

**Permission Tests:**
- Cannot remove organization owner
- Only admin/owner can see remove button

---

### TC-007: Create Client

**Objective:** Verify client creation flow

**Steps:**
1. Navigate to `/admin-clients.html`
2. Click "Add Client"
3. Fill in:
   - Name: "Acme Corporation"
   - Contact Name: "John Smith"
   - Email: "john@acme.com"
   - Industry: "Technology"
4. Click "Create Client"

**Expected Results:**
- Success toast appears
- Client card appears in grid
- Shows "active" status badge
- Shows industry tag

---

### TC-008: Edit Client

**Objective:** Verify client editing

**Steps:**
1. Navigate to `/admin-clients.html`
2. Click "Edit" on a client card
3. Change client name and status to "inactive"
4. Save changes

**Expected Results:**
- Success toast appears
- Card updates with new name
- Status badge shows "inactive"

---

### TC-009: Archive Client

**Objective:** Verify client archival (soft delete)

**Steps:**
1. Navigate to `/admin-clients.html`
2. Click "Archive" on a client
3. Confirm archival

**Expected Results:**
- Success toast appears
- Client disappears from default view
- Client appears when filtering by "Archived" status

---

### TC-010: Organization Context Switching

**Objective:** Verify org context persists across pages

**Steps:**
1. On `/admin-org-settings.html`, select a non-personal org
2. Navigate to `/admin-clients.html`
3. Navigate to `/admin-org-members.html`

**Expected Results:**
- Same organization is selected in dropdown on each page
- Client and member lists are filtered to that org

---

### TC-011: Align 120 - Standard Session (Client Engagement)

**Objective:** Verify Align 120 creates sessions with org/client context

**Steps:**
1. Navigate to `/align120.html`
2. Click "Start New Session"
3. Select an organization from dropdown
4. Load clients (wait for dropdown to populate)
5. Select a client
6. Leave "Report-Only Mode" unchecked
7. Enter company name
8. Start session

**Expected Results:**
- Session creates successfully
- Session should have org_id and client_id set
- Session should have is_ephemeral = false
- Session appears in dashboard views

**Verification Query:**
```sql
SELECT id, company_name, org_id, client_id, is_ephemeral
FROM align120_sessions
ORDER BY created_at DESC LIMIT 1;
```

---

### TC-012: Align 120 - Report-Only Mode (Ephemeral)

**Objective:** Verify ephemeral sessions work correctly

**Steps:**
1. Navigate to `/align120.html`
2. Click "Start New Session"
3. Check "Report-Only Mode" checkbox
4. Verify warning message appears
5. Enter company name
6. Start session

**Expected Results:**
- Warning about 24-hour deletion appears
- Session creates with is_ephemeral = true
- Session has ephemeral_expires_at set to ~24 hours from now
- Session should NOT appear in main dashboard queries

**Verification Query:**
```sql
SELECT id, company_name, is_ephemeral, ephemeral_expires_at
FROM align120_sessions
WHERE is_ephemeral = true
ORDER BY created_at DESC LIMIT 1;
```

---

### TC-013: Session Filtering by Organization

**Objective:** Verify sessions are properly filtered by org

**Steps:**
1. Create sessions in different organizations
2. Query sessions list API with org_id parameter

**Verification:**
```bash
curl http://localhost:3000/api/align120/sessions?org_id=<org-id>
```

**Expected Results:**
- Only sessions for specified org returned
- Sessions from other orgs not included

---

### TC-014: RLS Policy Verification - Cross-Org Access

**Objective:** Verify RLS prevents cross-organization data access

**Steps:**
1. User A creates an agent in Org A
2. User B (not in Org A) tries to access via API

**Expected Results:**
- User B should NOT see agents from Org A
- API should return only User B's own data and Org B data

**Verification:**
```bash
# As User A
curl -H "Authorization: Bearer <token-A>" \
  http://localhost:3000/api/agents

# As User B
curl -H "Authorization: Bearer <token-B>" \
  http://localhost:3000/api/agents
```

---

### TC-015: Delete Organization

**Objective:** Verify organization deletion (owner only)

**Steps:**
1. As owner, navigate to `/admin-org-settings.html`
2. Select non-personal organization
3. Scroll to "Danger Zone"
4. Click "Delete Organization"
5. Confirm by typing organization name

**Expected Results:**
- Organization is deleted
- Associated data is cascade deleted (due to ON DELETE CASCADE)
- Redirects to personal org

**Negative Tests:**
- Cannot delete personal workspace (button should not appear or be disabled)
- Non-owner should not see Danger Zone section

---

## Cross-Browser Testing

Test the following browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

Focus areas:
- Form validation
- Modal display
- Dropdown functionality
- Theme switching (dark/light mode)

---

## Performance Testing

### Organization with Many Members
1. Create org with 50+ members
2. Load `/admin-org-members.html`
3. Verify table renders in < 2 seconds

### Organization with Many Clients
1. Create org with 100+ clients
2. Load `/admin-clients.html`
3. Verify grid renders in < 2 seconds
4. Test search filtering performance

---

## Security Testing

### SQL Injection
Test these inputs in form fields:
- `'; DROP TABLE organizations; --`
- `<script>alert('xss')</script>`

**Expected:** Input should be sanitized, no errors or script execution

### Authorization Bypass
1. Capture API request as viewer role
2. Modify role in request body
3. Replay request

**Expected:** Server should reject based on actual role, not request body

### Token Tampering
1. Modify JWT token payload
2. Make API request with modified token

**Expected:** Request should fail authentication

---

## Regression Testing

After Phase 39, verify these existing features still work:

- [ ] User login/logout
- [ ] Agent CRUD operations
- [ ] Workflow execution
- [ ] Skill management
- [ ] Context asset management
- [ ] Align 120 module execution
- [ ] Daily briefing generation
- [ ] Research Studio queries

---

## Sign-off Checklist

| Test Case | Tester | Date | Pass/Fail | Notes |
|-----------|--------|------|-----------|-------|
| TC-001 | | | | |
| TC-002 | | | | |
| TC-003 | | | | |
| TC-004 | | | | |
| TC-005 | | | | |
| TC-006 | | | | |
| TC-007 | | | | |
| TC-008 | | | | |
| TC-009 | | | | |
| TC-010 | | | | |
| TC-011 | | | | |
| TC-012 | | | | |
| TC-013 | | | | |
| TC-014 | | | | |
| TC-015 | | | | |

---

## Known Issues / Limitations

1. **Personal workspace cannot be deleted** - By design, to ensure users always have a workspace
2. **Ephemeral session cleanup** - Requires cron job to purge expired sessions (not yet implemented)
3. **Email invitations** - Currently only works for existing users; true email invitations not yet implemented
