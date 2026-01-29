# Manual Test Plan: Agency Setup and Client Management

**Version:** 1.0
**Date:** January 27, 2026
**Scope:** End-to-end agency onboarding, organization configuration, and client management

---

## Overview

This test plan covers the complete flow for setting up an agency on the Insight 360 platform and managing their clients. It includes organization creation, team configuration, client onboarding, and client portal access.

---

## Prerequisites

- Access to a clean test environment
- Valid email addresses for testing (agency admin, team members, client users)
- Test Supabase instance with all phase schemas applied (through phase43)
- Environment variables configured in `.env`

---

## Test Flow Diagram

```
Agency Registration → Organization Setup → Team Configuration →
Client Creation → Client Assessment → Client User Invitation →
Client Portal Access → Report Viewing
```

---

## Phase 1: Agency Registration and Login

### Test Case 1.1: New Agency User Registration

**Screen:** [login.html](public/login.html)
**API Route:** [server/routes/auth.js](server/routes/auth.js)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/login.html` | Login page displays with email input |
| 2 | Enter agency admin email | Email field accepts input |
| 3 | Click "Send Magic Link" | Success message displays |
| 4 | Check email inbox | Magic link email received |
| 5 | Click magic link | Redirected to dashboard, session created |

**Validation Points:**
- Session cookie is set
- User record created in `users` table
- `auth_token` stored in localStorage

### Test Case 1.2: Returning User Login

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/login.html` with existing account | Login page displays |
| 2 | Enter registered email | Magic link sent |
| 3 | Click magic link | Logged in, redirected to last visited page |

---

## Phase 2: Organization Setup

### Test Case 2.1: Create New Organization

**Screen:** [admin-org-customization.html](public/admin-org-customization.html)
**API Route:** [server/routes/orgCustomization.js](server/routes/orgCustomization.js)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Admin → Organization Settings | Organization customization page loads |
| 2 | Enter organization name | Field accepts input |
| 3 | Upload organization logo | Logo preview displays |
| 4 | Set primary brand color | Color picker works, preview updates |
| 5 | Set secondary brand color | Color picker works |
| 6 | Configure subscription tier (free/pro/enterprise) | Tier selection saves |
| 7 | Click "Save Settings" | Success toast, settings persisted |

**Validation Points:**
- Organization record created in `organizations` table
- `organization_settings` populated with branding
- Logo stored in Supabase storage

### Test Case 2.2: Organization Branding Preview

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set custom colors | Preview area shows new colors |
| 2 | Upload logo | Logo appears in header preview |
| 3 | Save and refresh page | Branding persists across refresh |
| 4 | Open client portal in new tab | Branding applied to client-facing pages |

---

## Phase 3: Team Configuration

### Test Case 3.1: Invite Team Members

**Screen:** [admin-client-users.html](public/admin-client-users.html)
**API Route:** [server/routes/clientPortal.js](server/routes/clientPortal.js)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Admin → Team Members | Team management page loads |
| 2 | Click "Invite Team Member" | Invitation modal opens |
| 3 | Enter team member email | Email field validates |
| 4 | Select role: Owner | Role dropdown works |
| 5 | Click "Send Invitation" | Invitation email sent, pending status shown |
| 6 | Repeat for Admin role | Second invitation sent |
| 7 | Repeat for Consultant role | Third invitation sent |
| 8 | Repeat for Viewer role | Fourth invitation sent |

**Role Permissions Matrix:**

| Role | View Clients | Edit Clients | Run Assessments | Manage Team | Billing |
|------|--------------|--------------|-----------------|-------------|---------|
| Owner | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ | ✗ |
| Consultant | ✓ | ✓ | ✓ | ✗ | ✗ |
| Viewer | ✓ | ✗ | ✗ | ✗ | ✗ |

### Test Case 3.2: Team Member Accepts Invitation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Team member receives invitation email | Email contains magic link |
| 2 | Click invitation link | Directed to login/accept page |
| 3 | Complete authentication | User linked to organization |
| 4 | Access dashboard | Dashboard shows based on role permissions |

**Validation Points:**
- `organization_members` junction record created
- Role correctly assigned
- Invitation status updated to "accepted"

---

## Phase 4: Agency Dashboard

### Test Case 4.1: Agency Dashboard Overview

**Screen:** [agency-dashboard.html](public/agency-dashboard.html)
**API Route:** [server/routes/agencyAnalytics.js](server/routes/agencyAnalytics.js)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Agency Dashboard | Dashboard loads with analytics |
| 2 | Verify client count widget | Shows total active clients |
| 3 | Verify MRR widget | Shows monthly recurring revenue |
| 4 | Verify assessment completion rate | Shows % of clients assessed |
| 5 | View client list summary | Recent clients displayed |
| 6 | Check revenue trend chart | Chart renders with data points |

**Validation Points:**
- Analytics API returns correct aggregations
- Charts render without errors
- Data matches client records

---

## Phase 5: Client Creation

### Test Case 5.1: Add New Client

**Screen:** [admin-clients.html](public/admin-clients.html)
**API Route:** [server/routes/clients.js](server/routes/clients.js)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Admin → Clients | Client management page loads |
| 2 | Click "Add Client" button | New client modal opens |
| 3 | Enter client company name | Required field validates |
| 4 | Enter client industry | Field accepts input |
| 5 | Enter primary contact name | Field accepts input |
| 6 | Enter primary contact email | Email validates |
| 7 | Select subscription tier | Dropdown options available |
| 8 | Click "Create Client" | Success toast, client appears in list |

**Validation Points:**
- Client record created in `clients` table
- `organization_id` correctly linked
- Client appears in client list

### Test Case 5.2: Edit Client Details

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on existing client row | Client detail panel opens |
| 2 | Click "Edit" button | Edit mode enabled |
| 3 | Modify company name | Field updates |
| 4 | Change subscription tier | Tier updates |
| 5 | Click "Save Changes" | Changes persisted, toast shown |

### Test Case 5.3: Client Search and Filter

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter search term in search box | Client list filters in real-time |
| 2 | Filter by subscription tier | Only matching tiers shown |
| 3 | Filter by assessment status | Filtered results display |
| 4 | Clear filters | Full list restored |

---

## Phase 6: Client Assessment (Align 120)

### Test Case 6.1: Run Initial Assessment for Client

**Screen:** [align120.html](public/align120.html)
**API Route:** [server/routes/align120.js](server/routes/align120.js)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select client from dropdown | Client context loaded |
| 2 | Click "Start Assessment" | Assessment wizard begins |
| 3 | Complete Vision & Mission section | Responses saved |
| 4 | Complete Values section | Responses saved |
| 5 | Complete Strategic Priorities section | Responses saved |
| 6 | Complete Stakeholder Analysis | Responses saved |
| 7 | Click "Generate Report" | AI processes assessment |
| 8 | View generated alignment report | Report displays with scores |

**Validation Points:**
- Assessment data saved to `align120_assessments` table
- Report generated and stored
- Client status updated to "assessed"

### Test Case 6.2: Update Existing Assessment

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open client with existing assessment | Previous data loaded |
| 2 | Modify responses | Changes tracked |
| 3 | Re-generate report | New report created, old preserved |
| 4 | View assessment history | Both versions visible |

---

## Phase 7: Client User Management

### Test Case 7.1: Invite Client Users

**Screen:** [admin-client-users.html](public/admin-client-users.html)
**API Route:** [server/routes/clientPortal.js](server/routes/clientPortal.js)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to client detail → Users tab | Client users list displays |
| 2 | Click "Invite Client User" | Invitation modal opens |
| 3 | Enter client stakeholder email | Email validates |
| 4 | Enter stakeholder name | Name field accepts input |
| 5 | Select permission level | Permissions dropdown works |
| 6 | Click "Send Invitation" | Magic link email sent to client |
| 7 | Verify pending invitation shows | Invitation appears in list with "Pending" status |

**Validation Points:**
- `client_users` record created
- Magic link token generated
- Email sent via configured provider

### Test Case 7.2: Client User Accepts Invitation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Client user receives email | Email contains branded magic link |
| 2 | Click magic link | Directed to client portal |
| 3 | First-time setup prompts | User completes profile |
| 4 | Access granted to portal | Dashboard loads with client data |

---

## Phase 8: Client Portal Access

### Test Case 8.1: Client Portal Login

**Screen:** [client-portal.html](public/client-portal.html)
**API Route:** [server/routes/clientPortal.js](server/routes/clientPortal.js)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Client user navigates to portal URL | Branded login page displays |
| 2 | Enter email address | Magic link requested |
| 3 | Click magic link from email | Authenticated and redirected |
| 4 | View client dashboard | Agency branding applied |
| 5 | See available reports | Reports list populated |

**Validation Points:**
- Portal shows agency branding (logo, colors)
- Only client's own data visible
- RLS policies enforced

### Test Case 8.2: Client Views Reports

**Screen:** [client-report-viewer.html](public/client-report-viewer.html)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on Align 120 report | Report viewer opens |
| 2 | View alignment scores | Scores and charts display |
| 3 | Download PDF export | PDF downloads with branding |
| 4 | Navigate back to portal | Return to dashboard |

### Test Case 8.3: Client Portal Permissions

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Attempt to access other client data | Access denied, 403 returned |
| 2 | Attempt to access agency admin pages | Redirected to portal |
| 3 | View only permitted sections | Menu shows only allowed items |

---

## Phase 9: Agency Analytics

### Test Case 9.1: Multi-Client Analytics

**Screen:** [agency-dashboard.html](public/agency-dashboard.html)
**API Route:** [server/routes/agencyAnalytics.js](server/routes/agencyAnalytics.js)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add 3+ test clients | Clients created successfully |
| 2 | Complete assessments for 2 clients | Assessments saved |
| 3 | View agency dashboard | Analytics aggregate all clients |
| 4 | Check completion rate | Shows 2/3 (66%) assessed |
| 5 | View revenue breakdown | MRR calculated from tiers |
| 6 | Export analytics report | CSV/PDF export works |

---

## Phase 10: Edge Cases and Error Handling

### Test Case 10.1: Duplicate Client Prevention

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Attempt to create client with existing name | Warning displayed |
| 2 | Confirm or modify name | User can proceed or cancel |

### Test Case 10.2: Invalid Email Handling

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter malformed email for invitation | Validation error shown |
| 2 | Enter non-existent domain | Email still sent (delivery may fail) |

### Test Case 10.3: Session Expiration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Let session expire (24+ hours) | User redirected to login |
| 2 | Re-authenticate | Previous work preserved |

### Test Case 10.4: Concurrent Editing

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Two users edit same client simultaneously | Last save wins, no data corruption |
| 2 | Refresh shows latest data | Consistent state displayed |

---

## Cleanup Procedures

After testing, clean up test data:

1. Delete test client users from `client_users` table
2. Delete test clients from `clients` table
3. Remove test team members from `organization_members`
4. Delete test organization from `organizations`
5. Remove test user from `users` table

---

## Test Sign-Off

| Phase | Tester | Date | Status | Notes |
|-------|--------|------|--------|-------|
| 1. Registration | | | | |
| 2. Organization | | | | |
| 3. Team Config | | | | |
| 4. Dashboard | | | | |
| 5. Client Creation | | | | |
| 6. Assessment | | | | |
| 7. Client Users | | | | |
| 8. Client Portal | | | | |
| 9. Analytics | | | | |
| 10. Edge Cases | | | | |

---

## Related Documents

- [Client Onboarding Test Plan](client-onboarding-test-plan.md)
- [Agency Dashboard User Guide](../guides/agency-dashboard-user-guide.md)
- [Admin Client Users User Guide](../guides/admin-client-users-user-guide.md)
- [Admin Org Customization User Guide](../guides/admin-org-customization-user-guide.md)
