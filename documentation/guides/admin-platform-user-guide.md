# Platform Administration User Guide

**For:** Synergi Platform Administrators
**Last Updated:** January 2026

---

## Why Platform Administration Is Important

The Platform Administration dashboard is the central control panel for Synergi administrators to manage all organizations on the Insight 360 platform. It provides oversight of subscriptions, resource usage, module access, user accounts, and platform-wide configuration.

---

## What It Does

| Action | Description |
|--------|-------------|
| **View All Organizations** | See every organization on the platform with their tier and status |
| **Manage Users** | View all platform users, suspend accounts, and manage user status |
| **Manage Subscription Tiers** | Configure limits and features for each subscription level |
| **Control Module Access** | Enable or disable modules globally or per-organization |
| **Manage Platform Admins** | Add or remove Synergi super-administrators |
| **View Platform Statistics** | Monitor overall platform usage and health |

---

## Step by Step Use

### Viewing Organizations

1. Navigate to **Admin > Platform Admin** in the sidebar
2. The Organizations tab displays all tenant organizations
3. View tier, status, member count, and creation date for each
4. Use the search box to filter organizations by name
5. Click an organization row to see detailed information

### Changing an Organization's Tier

1. Find the organization in the list
2. Click the **Edit** button in the Actions column
3. Select the new tier from the dropdown
4. Click **Save Changes**
5. The organization's limits and module access will update immediately

### Managing Platform Users

The Users tab provides a complete view of all users across the platform.

#### Viewing Users

1. Click the **Users** tab
2. View all users with their:
   - Email and display name
   - Account status (active, suspended, inactive)
   - Organization memberships
   - System role
   - Creation date
3. Use the summary cards to see total counts by status

#### Filtering Users

1. **Search**: Type in the search box to find users by email or name
2. **Status Filter**: Select "Active", "Suspended", or "Inactive" to filter by account status
3. **Organization Filter**: Select an organization to see only its members

#### Understanding User Status

| Status | Description |
|--------|-------------|
| **Active** | User can log in and access the platform normally |
| **Suspended** | User cannot log in; shown a suspension message at login |
| **Inactive** | Account is deactivated; user cannot log in |
| **Pending Deletion** | Account is scheduled for permanent deletion |

#### Suspending a User

1. Find the user in the Users tab
2. Click the **Suspend** button
3. Enter a reason for the suspension (optional but recommended)
4. Click **Suspend User** to confirm
5. The user will immediately be unable to log in

**Note:** Suspended users see a clear message explaining why their account is suspended when they attempt to log in.

#### Reactivating a User

1. Filter by status "Suspended" to find suspended users
2. Click the **Reactivate** button next to the user
3. Confirm the action
4. The user can now log in again

#### Viewing User Details

1. Click the **eye icon** in the Actions column
2. View complete user information including:
   - All organization memberships with roles
   - Subscription tier of each organization
   - Suspension history (if applicable)
   - Platform admin status

#### Understanding Orphaned Users

Users with "No organization" (shown in the No Org stat) are users who don't belong to any active organization. This typically happens when:

- Their organization was deleted
- They were removed from all organizations
- Their membership was deactivated

**Automatic Suspension:** When an organization is deleted, users who have no other active organization memberships are automatically suspended to prevent abandoned accounts.

### Managing Subscription Tiers

1. Click the **Tiers** tab
2. View all tier definitions with their current limits
3. Click **Edit** on any tier to modify:
   - Maximum members
   - Maximum clients (Agency tier only)
   - Maximum agents, workflows, skills
   - Feature flags (SSO, white-label, API access)
4. Click **Save** to apply changes

### Managing Modules

1. Click the **Modules** tab
2. View all platform modules with their tier requirements
3. Toggle modules on/off globally using the Enable switch
4. Click a module to set per-organization overrides
5. Adjust minimum tier or role requirements as needed

### Adding Platform Administrators

1. Click the **Admins** tab
2. Click **Add Admin**
3. Search for the user by email
4. Select their role:
   - **Super Admin**: Full platform control
   - **Admin**: Manage orgs and tiers
   - **Support**: View-only with limited actions
5. Click **Add** to grant platform admin access

### Viewing Platform Statistics

1. The top of the page shows summary cards:
   - Total organizations (with tier breakdown)
   - Total users (with status breakdown)
   - Total clients (Agency tier)
   - Total agents created
2. Click the Users tab for detailed user statistics
3. Use filters to analyze specific segments

---

## Tips & Best Practices

- **Review suspended users regularly**: Check the Suspended filter to follow up on account issues
- **Monitor orphaned users**: Users with no organization may need to be assigned to a new org or cleaned up
- **Document suspension reasons**: Always include a reason when suspending users for audit trails
- **Review tier usage monthly**: Identify organizations needing upgrades before they hit limits
- **Use the Support admin role**: Appropriate for customer service team members who need view access

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Cannot see Platform Admin menu | Verify your account has platform admin role in database |
| Organization tier change not applying | Check for active caching - refresh the organization's page |
| Module toggle not saving | Ensure you have super_admin or admin role |
| Statistics not loading | Check browser console for API errors, verify authentication |
| Cannot suspend user | Verify you have admin write permissions (not Support role) |
| User still logged in after suspension | Their session continues until they log out; suspension blocks new logins |

---

## What Happens When an Organization is Deleted

When a platform admin or organization owner deletes an organization:

1. **Data Removal**: All organization data is permanently deleted (agents, workflows, clients, etc.)
2. **Membership Records**: Organization membership records are removed
3. **User Impact**:
   - Users who belong to **other organizations** keep their accounts active
   - Users who **only** belonged to the deleted organization are automatically **suspended**
   - Suspended users see a message: "Your account has been suspended: Organization [name] was deleted"
4. **Recovery**: Platform admins can reactivate suspended users and add them to a new organization

---

## Access Requirements

- User must be in the `platform_admins` table
- Roles: `super_admin`, `admin`, or `support`
- Support role has view-only access to most features
- User management (suspend/reactivate) requires `admin` or `super_admin` role
