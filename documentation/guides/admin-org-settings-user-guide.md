# Organization Settings User Guide

**For:** Insight 360 Users
**Last Updated:** Friday, February 14, 2026

---

## Why Organization Settings Is Important

Organization Settings is your central hub for managing how your team operates within Insight 360. It controls your organization's identity, branding, and configuration. Whether you're running a personal workspace or managing an agency with multiple team members, these settings ensure consistent branding and proper access control.

---

## What It Does

| Action | Description |
|--------|-------------|
| **View Organizations** | See all organizations you belong to |
| **Switch Organizations** | Change context between different organizations |
| **Edit Settings** | Update organization name and slug |
| **Manage Branding** | Configure brand identity, colors, typography, AI assistant, reports, emails, and client portal |
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

### Editing General Settings

1. Select the organization you want to edit
2. Update the **Organization Name** field
3. The **Slug** field is read-only and cannot be changed (it is automatically derived from the organization name)
4. Click **Save Changes**

**Note:** Only owners and admins can edit organization settings.

### Branding & Appearance

The Branding & Appearance panel lets you customize the look and feel of Insight 360 for your organization. It includes a **live preview** on the right side that updates as you make changes. Click **Save Branding** when done.

**Note:** Some branding sections require specific subscription tier features. Locked sections show a "Requires [feature]" overlay.

#### Section 1: Brand Identity

| Field | Description |
|-------|-------------|
| **App Name** | Custom name displayed in the header and login page (default: "Insight 360") |
| **Tagline** | Subtitle shown on the login page (default: "AI-Powered Command Center") |
| **Primary Logo URL** | Main logo displayed in the sidebar and header |
| **Dark Mode Logo URL** | Alternative logo for dark mode (falls back to primary if not set) |
| **Favicon URL** | Browser tab icon for your organization |

#### Section 2: Color Palette

| Field | Description |
|-------|-------------|
| **Primary** | Main brand color used for buttons, links, and accents (default: #6366f1) |
| **Secondary** | Supporting color for gradients and secondary elements (default: #4f46e5) |
| **Accent** | Highlight color for success states and call-to-action elements (default: #22c55e) |
| **Sidebar** | Background color for the navigation sidebar (default: #f9fafb) |

Each color field has a color picker and a hex input field that stay synchronized.

#### Section 3: Typography

| Field | Description |
|-------|-------------|
| **Heading Font** | Font family for headings (options: Source Sans 3, Inter, Roboto, Open Sans, Poppins, Lato, Montserrat, Nunito) |
| **Body Font** | Font family for body text (same options as heading) |
| **Base Font Size** | Root font size (options: 14px, 15px, 16px, 17px, 18px) |

#### Section 4: AI Assistant (requires White Label)

| Field | Description |
|-------|-------------|
| **Assistant Name** | Custom name for the AI assistant (default: "Higgins") |
| **Assistant Avatar URL** | Custom avatar image for the AI assistant |

#### Section 5: Report Branding (requires White Label)

| Field | Description |
|-------|-------------|
| **Report Header HTML** | Custom HTML for report headers |
| **Report Footer HTML** | Custom HTML for report footers |
| **Report Custom CSS** | Additional CSS for report styling |

#### Section 6: Email Branding (requires White Label)

| Field | Description |
|-------|-------------|
| **From Name** | Display name for outgoing emails |
| **From Email** | Email address for outgoing emails |
| **Email Signature HTML** | Custom HTML signature appended to emails |

#### Section 7: Client Portal (requires White Label)

| Field | Description |
|-------|-------------|
| **Portal Welcome Message** | Welcome text displayed on the client portal landing page |
| **Portal Custom CSS** | Additional CSS to style the client portal |

#### Live Preview

The right side of the branding panel shows a real-time preview with:
- **App Preview**: Shows how the sidebar header and app name will look with your branding
- **Login Preview**: Shows how the login page will appear with your logo, colors, and tagline

The preview updates automatically as you change any field.

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
- **Brand early**: Set your brand colors and logo during onboarding so the interface feels familiar from day one
- **Use the live preview**: Check the branding preview panel before saving to see how your changes will look
- **Provide a dark mode logo**: If your logo doesn't work well on dark backgrounds, upload a separate dark mode variant
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
| Branding sections locked | Your subscription tier may not include Custom Branding or White Label features. Contact your platform admin to upgrade. |
| Logo not showing in preview | Ensure the URL is publicly accessible (HTTPS) and points to a valid image file |
| Colors not applying after save | Clear your browser cache or hard refresh (Ctrl+Shift+R / Cmd+Shift+R) |
| User suspended after org deleted | Contact platform admin to reactivate and assign to new org |
