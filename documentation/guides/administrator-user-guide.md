# Administrator User Guide

**For:** Insight 360 Organization Administrators
**Last Updated:** January 2026

---

## Overview

The Administrator page is your central hub for managing your Insight 360 organization. It provides a workflow-based interface organized into five tabs:

| Tab | Purpose |
|-----|---------|
| **Dashboard** | Quick overview of system status, quick actions, and recent activity |
| **Setup** | Step-by-step wizard for configuring new organizations |
| **Onboarding** | Checklist to guide you through complete organization setup |
| **Daily Ops** | Day-to-day user management, conversations, and sessions |
| **Maintenance** | System administration, platform settings, and content management |

---

## Dashboard Tab

The Dashboard provides an at-a-glance view of your organization's health and activity.

### Status Cards

Four cards display key metrics:

| Card | Shows |
|------|-------|
| **Users** | Total registered users in your organization |
| **Organizations** | Number of organizations (for platform admins) |
| **Agents** | Total AI agents available |
| **API Health** | Current system status (Good/Warning/Error) |

### Quick Actions

Shortcuts to common administrative tasks:

- **Add User** - Create a new user account
- **Create Org** - Set up a new organization
- **Invite Member** - Send team member invitations
- **Configure Module** - Access module settings

### Recent Activity

A feed showing the latest system events:
- New user registrations
- Organization changes
- Tier upgrades
- API key creations

---

## Setup Tab

The Setup Wizard guides you through configuring a new organization in 6 steps.

### Wizard Steps

| Step | What You Configure |
|------|-------------------|
| **1. Organization Details** | Name, slug, description |
| **2. Tier Selection** | Choose subscription tier (Starter, Business, Enterprise, Agency) |
| **3. Initial Users** | Add first users and assign roles |
| **4. Modules** | Select which platform modules to enable |
| **5. Branding** | Logo, colors, and customization |
| **6. Complete** | Review and finalize setup |

### Using the Wizard

1. Click the **Setup** tab to begin
2. Fill in the required fields for each step
3. Click **Next** to proceed (or **Previous** to go back)
4. Click **Complete Setup** on the final step
5. Use **Skip & Start Fresh** to bypass the wizard if needed

### Tier Selection Guide

| Tier | Best For | Key Limits |
|------|----------|------------|
| **Starter** | Small teams getting started | 3 members, 5 agents, 3 workflows |
| **Business** | Growing companies | 10 members, 25 agents, 15 workflows |
| **Enterprise** | Large organizations | 100 members, 100 agents, 50 workflows |
| **Agency** | Agencies managing multiple clients | 50 members, 100 clients, 200 agents |

---

## Onboarding Tab

The Onboarding Checklist ensures you complete all essential configuration steps.

### Checklist Items

| Item | Description | Navigates To |
|------|-------------|--------------|
| **Organization created** | Confirm org exists | Organization Settings |
| **Admin user assigned** | At least one admin role | User Management |
| **Departments configured** | Set up department structure | Departments page |
| **Roles defined** | Create business roles | Title Management |
| **Users invited** | Add team members | Team Members |
| **Modules enabled** | Activate required modules | Module Configuration |
| **Resources assigned** | Configure access permissions | Resource Access |
| **Context assets created** | Add initial context data | Context Assets |

### Progress Tracking

- **Circular progress indicator** - Shows percentage complete
- **Progress bar** - Visual representation of completion
- **Green checkmarks** - Indicate completed items
- **Circle icons** - Indicate pending items (clickable)

### Completing Items

1. Click any pending (uncompleted) item
2. You'll be navigated to the relevant configuration page
3. Complete the setup on that page
4. Return to Onboarding to see updated progress
5. 100% completion shows a celebration message

---

## Daily Ops Tab

Manage day-to-day operational tasks from this tab.

### Available Sections

#### User Management
Click to navigate to the full user management page where you can:
- View all users
- Edit user details
- Manage permissions
- Deactivate accounts

#### Team Members
Manage organization team members:
- View current members
- Invite new members
- Change member roles
- Remove members

#### Conversations Panel
Click to expand and view recent conversations:
- See conversation titles
- View which user started each conversation
- Check last activity date
- Monitor conversation volume

#### Align 120 Sessions Panel
Click to expand and view Align 120 strategy sessions:
- View company names
- Check session status (draft, in-progress, completed)
- See session owners
- Monitor creation dates

### Panel Controls

- Click a card to **expand** its panel
- Click the **X** button to close an expanded panel
- Both Conversations and Sessions panels can be open simultaneously

---

## Maintenance Tab

Access administrative tools organized by category.

### Platform Administration
*(Visible to Platform Admins only)*

| Card | Purpose |
|------|---------|
| **Platform Dashboard** | Manage all organizations and global settings |
| **Tier Configuration** | Configure subscription tiers and limits |
| **Resource Access** | Configure resource visibility settings |

### System Management

| Card | Purpose |
|------|---------|
| **System Health** | Monitor API status and system performance |
| **Parthenon** | Access governance framework and compliance |
| **SynergiNexus** | Configure multi-agent orchestration |

### Organization & Agency

| Card | Purpose |
|------|---------|
| **Organization Settings** | Manage organization configuration |
| **Departments** | Configure department structure |
| **Clients** | Manage agency clients |
| **Title Management** | Configure business roles |

### Content & Assets

| Card | Purpose |
|------|---------|
| **Tag Management** | Organize tags for categorization |
| **Asset Types** | Define context asset schemas |
| **Icon Library** | Browse available Lucide icons |

---

## Tips & Best Practices

### Getting Started
1. Complete the **Setup Wizard** first to establish baseline configuration
2. Work through the **Onboarding Checklist** to ensure nothing is missed
3. Use the **Dashboard** for ongoing monitoring

### Daily Administration
- Check the **Dashboard** at the start of each day for system health
- Use **Daily Ops** to monitor user activity and conversations
- Review **Recent Activity** for important changes

### Maintaining Security
- Regularly review user access in **Team Members**
- Monitor **Conversations** for unusual activity
- Check **Resource Access** settings periodically

### For Platform Admins
- Use **Platform Dashboard** to oversee all organizations
- Configure **Tier** limits based on client needs
- Monitor **System Health** for performance issues

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Platform Admin section not visible** | You may not have platform admin permissions. Contact your system administrator. |
| **Conversation/Session count shows "Error"** | API may be temporarily unavailable. Refresh the page or check System Health. |
| **Setup wizard won't advance** | Ensure all required fields are completed. Check for validation errors. |
| **Onboarding item won't mark complete** | Complete the actual configuration on the linked page, then return. |
| **Cards not clickable** | Some cards are links, others open panels. Try clicking different areas. |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Tab** | Navigate between form fields |
| **Enter** | Submit forms / click active buttons |
| **Escape** | Close expanded panels |

---

## Related Pages

- [User Management](/admin.html) - Detailed user administration
- [Organization Settings](/admin-org-settings.html) - Organization configuration
- [Platform Dashboard](/admin-platform.html) - Multi-organization management
- [System Health](/system-health.html) - Performance monitoring

---

## Getting Help

- Click the **?** help button in the page header for this guide
- Contact your platform administrator for permission issues
- Check [System Health](/system-health.html) for API status
