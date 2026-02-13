# Organization Settings User Guide

**For:** Insight 360 Users
**Last Updated:** Wednesday, February 12, 2026

---

## Why Organization Settings Is Important

Organization Settings is your central hub for managing how your team operates within Insight 360. It controls your organization's identity, branding, and configuration. Whether you're running a personal workspace or managing an agency with multiple team members, these settings ensure consistent branding and proper access control.

---

## What It Does

| Action | Description |
|--------|-------------|
| **View Organizations** | See all organizations you belong to |
| **Switch Organizations** | Change context between different organizations |
| **Edit Settings** | Update organization name, slug, and branding |
| **Manage Branding** | Set brand color and logo for consistent appearance |
| **View Statistics** | See member count and activity metrics |
| **Track Setup Progress** | Monitor onboarding checklist completion |
| **Delete Organization** | Remove an organization (owner only, non-personal only) |

---

## Step by Step Use

### Viewing Your Organizations

1. Navigate to **Organization Settings** from the sidebar
2. Use the organization dropdown at the top to see all your organizations
3. Personal workspaces are marked with "(Personal)"
4. Your current role is shown next to each organization

### Creating a New Organization

1. Click the **New Organization** button in the page header
2. Enter the organization name in the dialog
3. Click **Create** to provision the new organization
4. The new organization will appear in your organization dropdown

### Switching Organizations

1. Click the organization dropdown
2. Select the organization you want to manage
3. The page refreshes to show that organization's settings
4. Your selection persists across other pages

### Platform Admin View

If you are a platform administrator, you can:
1. Check the "Show all orgs" toggle to view all organizations on the platform
2. This allows you to manage organizations you are not a member of
3. The toggle appears next to the organization dropdown

### Understanding Setup Progress

The Setup Progress section shows your organization's onboarding status:

| Item | Description |
|------|-------------|
| **Organization Created** | Your organization exists in the system |
| **Subscription Tier** | A paid tier has been configured (not Free/None) |
| **Admin User** | At least one admin or owner is assigned |
| **Departments** | One or more departments have been created |
| **Roles Defined** | Business roles have been configured |
| **Team Members** | More than one user is in the organization |
| **Branding** | Logo or brand color has been set |
| **Resources** | At least one agent or resource has been created |

Click any incomplete item to navigate to the relevant page for setup.

### Editing Organization Settings

1. Select the organization you want to edit
2. Update the **Organization Name** field
3. The **Slug** field is read-only and cannot be changed (it is automatically derived from the organization name)
4. Set a **Brand Color** using the color picker
5. Optionally enter a **Logo URL** to display your organization's logo throughout the interface
6. Click **Save Changes**

**Note:** Only owners and admins can edit organization settings.

### Understanding the Statistics

The stats panel shows:
- **Members**: Total number of team members
- **Clients**: Number of clients managed (agency-tier organizations only)
- **Agents**: Number of AI agents created
- **Workflows**: Number of automated workflows

**Note:** The Clients statistic and any Clients section only appear for agency-tier organizations. Other subscription tiers will not see client-related information.

### Deleting an Organization

1. Scroll to the "Danger Zone" section (owner only)
2. Click **Delete Organization**
3. Confirm by typing the organization name
4. Click **Delete** to permanently remove

**Warning:** This action cannot be undone. All associated data will be deleted.

#### What Happens When You Delete an Organization

| Impact | Description |
|--------|-------------|
| **Organization Data** | All agents, workflows, clients, and settings are permanently deleted |
| **Team Members** | Membership records are removed |
| **Multi-Org Users** | Users who belong to other organizations are unaffected |
| **Single-Org Users** | Users who ONLY belonged to this organization are automatically **suspended** |
| **Suspended User Login** | Suspended users see: "Your account has been suspended: Organization [name] was deleted" |

**Recovery:** If you accidentally delete an organization, contact a platform administrator. They can:
- Reactivate suspended user accounts
- Add users to a new organization
- However, organization data cannot be recovered

---

## Roles and Permissions

| Role | View Settings | Edit Settings | Delete Org |
|------|---------------|---------------|------------|
| **Platform Admin** | Yes (all orgs) | Yes (all orgs) | Yes |
| **Owner** | Yes | Yes | Yes |
| **Admin** | Yes | Yes | No |
| **Consultant** | Yes | No | No |
| **Viewer** | Yes | No | No |

---

## Tips & Best Practices

- **Use descriptive names**: Choose organization names that clearly identify the team or purpose
- **Set brand color**: Your brand color appears throughout the interface for visual consistency
- **Slugs are automatic**: The slug is generated from your organization name and is read-only
- **Personal vs Team**: Use personal workspace for individual work; create organizations for team collaboration
- **Complete onboarding**: Follow the Setup Progress checklist to ensure your organization is fully configured
- **Before deleting**: Ensure team members are added to other organizations first if needed

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't edit settings | You may only have Viewer or Consultant role. Contact an admin. |
| Don't see Danger Zone | Only organization owners can delete organizations |
| Can't delete personal workspace | Personal workspaces cannot be deleted by design |
| Changes not saving | Check your internet connection and try refreshing the page |
| Slug field is grayed out | The slug is read-only and automatically derived from the organization name |
| Setup Progress not updating | Refresh the page after making changes on other pages |
| User suspended after org deleted | Contact platform admin to reactivate and assign to new org |
