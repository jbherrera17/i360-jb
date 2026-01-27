# Agency Model Manual Test Plan
## Phases 40-43: Agency Model Enhancement

**Last Updated:** 2026-01-23
**Version:** 1.0

---

## Overview

This manual test plan covers the Agency Model Enhancement features implemented in Phases 40-43:

| Phase | Feature | Primary Routes |
|-------|---------|----------------|
| 40 | 1:1 Client-Profile Enforcement | align120.js (modified) |
| 41 | Agency-Level Customization | orgCustomization.js |
| 42 | Client Self-Service Portal | clientPortal.js |
| 43 | Agency Analytics & Reporting | agencyAnalytics.js |

---

## Prerequisites

### Environment Setup
1. Server running locally: `npm run dev`
2. Database migrations applied (phases 40-43 SQL files)
3. Valid test user account with organization membership
4. At least one test client created under the organization
5. Browser developer tools available for API inspection

### Test Data Requirements
- **Organization:** At least one active organization
- **Users:** Admin user and regular member user
- **Clients:** 3+ clients with varying staturity levels
- **Sessions:** At least 2 completed Align120 sessions
- **Reports:** At least 1 generated session report

---

## Phase 40: 1:1 Client-Profile Enforcement

### Test 40.1: Single Profile Per Client
**Objective:** Verify that each client has exactly one company profile

**Steps:**
1. Navigate to a client's detail page
2. Run an Align120 session for the client
3. Complete Module 1 (Company Profile creation)
4. Note the profile ID created
5. Start a NEW Align120 session for the SAME client
6. Complete Module 1 again

**Expected Results:**
- [ ] Second session should link to the SAME profile ID
- [ ] No duplicate profiles created for the client
- [ ] Profile data should be updated, not duplicated

### Test 40.2: Profile Evolution Tracking
**Objective:** Verify profile versioning works correctly

**Steps:**
1. Query the company_profiles table for a client with multiple sessions
2. Check the `version`, `parent_profile_id`, and `evolved_at` columns

**Expected Results:**
- [ ] Profile version increments when evolved
- [ ] Parent profile ID links to previous version (if evolved)
- [ ] Evolved_at timestamp set when profile is updated

### Test 40.3: Unique Constraint Enforcement
**Objective:** Verify database constraint prevents duplicate profiles

**Steps:**
1. Open Supabase SQL editor
2. Attempt to insert a second active profile for an existing client:
   ```sql
   INSERT INTO company_profiles (client_id, company_name, status)
   VALUES ('existing-client-uuid', 'Duplicate Test', 'active');
   ```

**Expected Results:**
- [ ] Insert should fail with unique constraint violation
- [ ] Error message references `unique_active_client_profile` constraint

---

## Phase 41: Organization Customization

### Test 41.1: Module Configuration - View
**Objective:** Verify module configs can be retrieved

**Steps:**
1. Log in as org admin
2. Navigate to Admin > Organization Customization (`/admin-org-customization.html`)
3. View the Module Configuration section

**Expected Results:**
- [ ] All 6 module types displayed (Discovery through Roadmap)
- [ ] Each module shows: name, description, prompt override status
- [ ] Default values shown for unconfigured modules

### Test 41.2: Module Configuration - Edit
**Objective:** Verify module configs can be modified

**Steps:**
1. Click "Edit" on Module 1 (Discovery)
2. Change the custom name to "Company Deep Dive"
3. Add a custom system prompt: "Focus on AI readiness assessment"
4. Save changes
5. Refresh the page

**Expected Results:**
- [ ] Changes persist after refresh
- [ ] Custom name appears in module list
- [ ] Toast notification confirms save

### Test 41.3: Module Configuration - Permission Check
**Objective:** Verify non-admins cannot modify configs

**Steps:**
1. Log in as a regular org member (not admin)
2. Navigate to Organization Customization page
3. Attempt to edit a module configuration

**Expected Results:**
- [ ] Edit controls should be disabled or hidden
- [ ] API call returns 403 Forbidden
- [ ] Appropriate error message displayed

### Test 41.4: Branding Settings - View and Edit
**Objective:** Verify branding can be customized

**Steps:**
1. Log in as org admin
2. Navigate to Branding section
3. Upload a logo image
4. Set primary color to #2563EB
5. Set secondary color to #7C3AED
6. Add report header text: "Prepared by Acme Consulting"
7. Save changes

**Expected Results:**
- [ ] Logo displays in preview
- [ ] Colors applied to preview elements
- [ ] Changes persist after refresh
- [ ] Branding appears in generated reports (if applicable)

### Test 41.5: Prompt Templates - CRUD Operations
**Objective:** Verify prompt template management

**Steps:**
1. Navigate to Prompt Templates section
2. **Create:** Add new template
   - Name: "Executive Summary Style"
   - Category: "report"
   - Content: "Generate a concise executive summary focusing on ROI..."
3. **Read:** Verify template appears in list
4. **Update:** Edit the template content
5. **Delete:** Remove the template

**Expected Results:**
- [ ] Create: Template saved with unique ID
- [ ] Read: Template displays with correct metadata
- [ ] Update: Changes persist correctly
- [ ] Delete: Template removed from list

### Test 41.6: Report Templates
**Objective:** Verify custom report templates work

**Steps:**
1. Navigate to Report Templates section
2. Create a custom report template:
   - Name: "Quick Assessment"
   - Type: "maturity_summary"
   - Sections: ["executive_summary", "scores", "recommendations"]
3. Generate a report using the custom template

**Expected Results:**
- [ ] Template saved successfully
- [ ] Template available in report generation dropdown
- [ ] Generated report follows custom structure

---

## Phase 42: Client Self-Service Portal

### Test 42.1: Client User Invitation (Agency Side)
**Objective:** Verify agency can invite client users

**Steps:**
1. Log in as agency admin
2. Navigate to Client Management > Client Users (`/admin-client-users.html`)
3. Select a client
4. Click "Invite User"
5. Enter email: testclient@example.com
6. Enter name: "Test Client User"
7. Set role: "viewer"
8. Send invitation

**Expected Results:**
- [ ] Invitation record created in database
- [ ] Magic link token generated
- [ ] Success message displayed
- [ ] User appears in list with "pending" status

### Test 42.2: Magic Link Authentication
**Objective:** Verify client authentication flow

**Steps:**
1. Get the magic link from test 42.1 (dev mode shows link)
2. Open magic link in incognito browser
3. Verify token and create session

**Expected Results:**
- [ ] Token validated successfully
- [ ] Session created with 24-hour expiry
- [ ] User redirected to client portal dashboard
- [ ] User info displayed correctly

### Test 42.3: Request Access Flow
**Objective:** Verify client can request access independently

**Steps:**
1. Navigate to `/client-portal.html` (not logged in)
2. Enter email for an existing client user
3. Click "Request Access"
4. Check for magic link (in dev mode, check console/response)

**Expected Results:**
- [ ] Success message shown (generic for security)
- [ ] Magic link generated for valid users
- [ ] No information leaked about user existence

### Test 42.4: Client Portal - View Profile
**Objective:** Verify client can view their company profile

**Steps:**
1. Log in to client portal as client user
2. Navigate to Profile section
3. View company profile details

**Expected Results:**
- [ ] Company name displayed
- [ ] Latest assessment scores shown
- [ ] Historical session data visible
- [ ] No edit capabilities for viewers

### Test 42.5: Client Portal - View Reports
**Objective:** Verify client can access shared reports

**Steps:**
1. (Agency) Share a report with the client (set permissions)
2. Log in to client portal as client user
3. Navigate to Reports section
4. Click on shared report to view

**Expected Results:**
- [ ] Report list shows all shared reports
- [ ] Report opens with correct content
- [ ] View count incremented
- [ ] Download button respects `can_download` permission

### Test 42.6: Report Sharing Permissions
**Objective:** Verify report access controls work

**Steps:**
1. Share a report with `can_download: false`
2. Access report as client user
3. Attempt to download

**Expected Results:**
- [ ] Download button disabled or hidden
- [ ] Direct API call to download returns 403

### Test 42.7: Report Expiry
**Objective:** Verify expired report access is blocked

**Steps:**
1. Share a report with short expiry (e.g., 1 minute)
2. Wait for expiry
3. Attempt to access report

**Expected Results:**
- [ ] Report no longer appears in list (or marked expired)
- [ ] Direct access returns 403 with expiry message

### Test 42.8: Client Data Isolation
**Objective:** Verify clients cannot access other clients' data

**Steps:**
1. Log in as Client A user
2. Note a report ID belonging to Client B
3. Attempt to access Client B's report via direct API call:
   ```
   GET /api/client-portal/reports/{clientB_reportId}
   ```

**Expected Results:**
- [ ] Request returns 404 "Report not found or access denied"
- [ ] No data from Client B exposed

### Test 42.9: Session Management
**Objective:** Verify session handling works correctly

**Steps:**
1. Log in to client portal
2. Note the session token
3. Wait for session to expire (or manually invalidate)
4. Attempt to access protected endpoint

**Expected Results:**
- [ ] Expired session returns 401
- [ ] User prompted to re-authenticate

### Test 42.10: Logout
**Objective:** Verify logout invalidates session

**Steps:**
1. Log in to client portal
2. Click logout
3. Attempt to access protected page

**Expected Results:**
- [ ] Session marked as inactive in database
- [ ] Subsequent requests return 401
- [ ] User redirected to login page

---

## Phase 43: Agency Analytics & Reporting

### Test 43.1: Overview Dashboard
**Objective:** Verify overview metrics display correctly

**Steps:**
1. Log in as agency user
2. Navigate to Agency Dashboard (`/agency-dashboard.html`)
3. View overview cards

**Expected Results:**
- [ ] Total clients count accurate
- [ ] Active clients count matches status filter
- [ ] Total sessions count correct
- [ ] Average maturity score calculated correctly
- [ ] Average readiness score calculated correctly

### Test 43.2: Client Metrics Grid
**Objective:** Verify per-client breakdown works

**Steps:**
1. View client metrics section on dashboard
2. Sort by different columns (maturity, health, sessions)
3. Filter by client status

**Expected Results:**
- [ ] All clients listed with correct metrics
- [ ] Sorting works correctly
- [ ] Filtering updates list appropriately
- [ ] Pagination works if many clients

### Test 43.3: Maturity Distribution Chart
**Objective:** Verify distribution visualization

**Steps:**
1. View maturity distribution chart
2. Verify segment counts match actual data

**Expected Results:**
- [ ] Chart shows 5 levels: Nascent, Emerging, Developing, Advanced, Leading
- [ ] Counts match database query results
- [ ] Percentages calculated correctly
- [ ] Interactive tooltips work

### Test 43.4: Engagement Distribution
**Objective:** Verify engagement status tracking

**Steps:**
1. View engagement distribution chart
2. Compare with actual client engagement statuses

**Expected Results:**
- [ ] Categories: Active, Engaged, Dormant, New
- [ ] Counts accurate
- [ ] Visual representation correct

### Test 43.5: Trends Over Time
**Objective:** Verify historical trend data

**Steps:**
1. View trends section
2. Toggle between 30d, 90d, 1y periods
3. Check data points match snapshot records

**Expected Results:**
- [ ] Chart updates with period selection
- [ ] Data points align with snapshot dates
- [ ] Metrics include: total clients, sessions, avg scores
- [ ] Trend lines render correctly

### Test 43.6: Top Performers List
**Objective:** Verify top performer identification

**Steps:**
1. View top performers section
2. Toggle between health and maturity ranking

**Expected Results:**
- [ ] List shows top 10 clients by default
- [ ] Ranking metric visible
- [ ] Links to client detail work
- [ ] Toggle switches ranking correctly

### Test 43.7: Needs Attention List
**Objective:** Verify at-risk client identification

**Steps:**
1. View "needs attention" section
2. Verify listed clients meet criteria

**Expected Results:**
- [ ] Lists clients with health_score < 50 OR engagement = dormant
- [ ] Reason for flagging displayed
- [ ] Action links available

### Test 43.8: Export - JSON
**Objective:** Verify JSON export works

**Steps:**
1. Click Export > JSON
2. Download and open file

**Expected Results:**
- [ ] Valid JSON format
- [ ] Contains all client metrics
- [ ] Includes export timestamp
- [ ] Filename includes date

### Test 43.9: Export - CSV
**Objective:** Verify CSV export works

**Steps:**
1. Click Export > CSV
2. Download and open in spreadsheet

**Expected Results:**
- [ ] Valid CSV format with headers
- [ ] All columns present
- [ ] Data matches dashboard
- [ ] Special characters properly escaped

### Test 43.10: Snapshot Capture (Admin)
**Objective:** Verify manual snapshot trigger

**Steps:**
1. Log in as org admin
2. Navigate to dashboard settings
3. Click "Capture Snapshot"

**Expected Results:**
- [ ] Snapshot captured successfully
- [ ] New record in agency_metrics_snapshots table
- [ ] Client scores captured in client_score_history
- [ ] Success message displayed

### Test 43.11: Organization Isolation
**Objective:** Verify cross-org data protection

**Steps:**
1. Log in as user from Org A
2. Note an org_id from Org B
3. Attempt to access Org B analytics:
   ```
   GET /api/analytics/{orgB_id}/overview
   ```

**Expected Results:**
- [ ] Request returns 403 Forbidden
- [ ] No Org B data exposed
- [ ] Proper error message

---

## Security Test Cases

### SEC-1: Authentication Required
**Test all endpoints without authentication:**

| Endpoint | Method | Expected |
|----------|--------|----------|
| `/api/analytics/:orgId/overview` | GET | 401 |
| `/api/analytics/:orgId/clients` | GET | 401 |
| `/api/analytics/:orgId/export` | GET | 401 |
| `/api/org-customization/:orgId/modules` | GET | 401 |
| `/api/org-customization/:orgId/branding` | PUT | 401 |
| `/api/client-portal/profile` | GET | 401 |
| `/api/client-portal/reports` | GET | 401 |

### SEC-2: Authorization - Admin Required
**Test admin-only endpoints as regular member:**

| Endpoint | Method | Expected |
|----------|--------|----------|
| `/api/org-customization/:orgId/modules/:type/:num` | PUT | 403 |
| `/api/org-customization/:orgId/branding` | PUT | 403 |
| `/api/analytics/:orgId/capture-snapshot` | POST | 403 |

### SEC-3: Rate Limiting
**Test magic link request rate limiting:**

**Steps:**
1. Make 10 rapid requests to `/api/client-portal/auth/request-access`
2. Check response after limit exceeded

**Expected Results:**
- [ ] Rate limit enforced (429 Too Many Requests)
- [ ] Legitimate requests allowed after cooldown

### SEC-4: Token Expiry
**Test all token types expire correctly:**

| Token Type | Expected Expiry |
|------------|-----------------|
| Magic Link | 15 minutes |
| Session Token | 24 hours |
| Invitation Token | 7 days |

---

## Edge Cases

### EDGE-1: Empty Data States
**Test dashboard with no data:**
- New organization with zero clients
- Expected: Graceful empty states, no errors

### EDGE-2: Large Dataset Performance
**Test with high volume:**
- 100+ clients in single org
- Expected: Pagination works, response times acceptable (<2s)

### EDGE-3: Concurrent Sessions
**Test multiple browser sessions:**
- Same client user logged in on two devices
- Expected: Both sessions valid, logout on one doesn't affect other

### EDGE-4: Special Characters
**Test data with special characters:**
- Company name with unicode: "Café München GmbH"
- Expected: Displays correctly, exports properly

### EDGE-5: Timezone Handling
**Test dates across timezones:**
- Create session in EST, view in PST
- Expected: Timestamps display correctly in local timezone

---

## Regression Tests

After completing all Phase 40-43 tests, verify existing functionality still works:

- [ ] Standard Align120 session flow
- [ ] Report generation
- [ ] Client CRUD operations
- [ ] User authentication
- [ ] Organization management

---

## Test Sign-off

| Phase | Tester | Date | Pass/Fail | Notes |
|-------|--------|------|-----------|-------|
| 40 | | | | |
| 41 | | | | |
| 42 | | | | |
| 43 | | | | |
| Security | | | | |
| Edge Cases | | | | |
| Regression | | | | |

---

## Appendix: API Quick Reference

### Analytics Endpoints
```
GET  /api/analytics/:orgId/overview
GET  /api/analytics/:orgId/clients
GET  /api/analytics/:orgId/clients/:clientId
GET  /api/analytics/:orgId/distribution/maturity
GET  /api/analytics/:orgId/distribution/engagement
GET  /api/analytics/:orgId/trends
GET  /api/analytics/:orgId/trends/clients
GET  /api/analytics/:orgId/top-performers
GET  /api/analytics/:orgId/needs-attention
GET  /api/analytics/:orgId/export
POST /api/analytics/:orgId/capture-snapshot
```

### Customization Endpoints
```
GET  /api/org-customization/:orgId/modules
PUT  /api/org-customization/:orgId/modules/:moduleType/:moduleNumber
GET  /api/org-customization/:orgId/branding
PUT  /api/org-customization/:orgId/branding
GET  /api/org-customization/:orgId/prompts
POST /api/org-customization/:orgId/prompts
PUT  /api/org-customization/:orgId/prompts/:promptId
DELETE /api/org-customization/:orgId/prompts/:promptId
GET  /api/org-customization/:orgId/report-templates
POST /api/org-customization/:orgId/report-templates
```

### Client Portal Endpoints
```
POST /api/client-portal/auth/request-access
POST /api/client-portal/auth/verify
POST /api/client-portal/auth/logout
GET  /api/client-portal/auth/me
GET  /api/client-portal/profile
GET  /api/client-portal/profile/summary
GET  /api/client-portal/reports
GET  /api/client-portal/reports/:reportId
GET  /api/client-portal/reports/:reportId/download
POST /api/client-portal/agency/invite
POST /api/client-portal/agency/share-report
GET  /api/client-portal/agency/client/:clientId/users
GET  /api/client-portal/agency/client/:clientId/activity
```
