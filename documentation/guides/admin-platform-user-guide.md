# Platform Administration User Guide

**For:** Synergi Platform Administrators
**Last Updated:** January 2026

---

## Why Platform Administration Is Important

The Platform Administration dashboard is the central control panel for Synergi administrators to manage all organizations on the Insight 360 platform. It provides oversight of subscriptions, resource usage, module access, and platform-wide configuration.

---

## What It Does

| Action | Description |
|--------|-------------|
| **View All Organizations** | See every organization on the platform with their tier and status |
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
   - Total organizations
   - Total users across all orgs
   - Total clients (Agency tier)
   - Total agents created
2. Click any card to see detailed breakdowns
3. Use the date filter to view historical trends

---

## Tips & Best Practices

- Review tier usage monthly to identify organizations needing upgrades
- Before changing tier limits, check how many organizations would be affected
- Use the Support admin role for customer service team members
- Export organization data regularly for compliance records
- Monitor the agents count - it's often the first limit reached

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Cannot see Platform Admin menu | Verify your account has platform admin role in database |
| Organization tier change not applying | Check for active caching - refresh the organization's page |
| Module toggle not saving | Ensure you have super_admin or admin role |
| Statistics not loading | Check browser console for API errors, verify authentication |

---

## Access Requirements

- User must be in the `platform_admins` table
- Roles: `super_admin`, `admin`, or `support`
- Support role has view-only access to most features
