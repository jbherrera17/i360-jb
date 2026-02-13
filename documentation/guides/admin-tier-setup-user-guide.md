# Tier Setup User Guide

**For:** Synergi Platform Administrators
**Last Updated:** Wednesday, February 12, 2026

---

## Why Tier Setup Is Important

The Tier Setup page allows platform administrators to configure subscription tiers, set resource limits, and control which features are available at each pricing level. This is essential for managing the SaaS business model and ensuring organizations have appropriate access based on their subscription.

---

## What It Does

| Action | Description |
|--------|-------------|
| **Configure Tier Limits** | Set maximum members, agents, workflows, skills per tier |
| **Manage Features** | Enable/disable features like SSO, white-label, API access |
| **Compare Tiers** | View side-by-side comparison of all tier capabilities |
| **View Module Access** | See which platform modules are accessible at each tier |

---

## Step by Step Use

### Viewing Current Tier Configuration

1. Navigate to **Admin > Tier Setup** in the sidebar
2. View tier cards showing current limits for each subscription level:
   - **Starter**: Entry-level tier for small teams
   - **Business**: Mid-tier with strategy tools
   - **Enterprise**: Full-featured with SSO
   - **Agency**: White-label with client management

### Modifying Tier Limits

1. Find the tier you want to modify
2. Click **Edit** on the tier card to switch it to edit mode — labels become inline input fields
3. Adjust the resource limits directly in the inline inputs:
   - **Max Members**: Team size limit
   - **Max Clients**: Client records (Agency only)
   - **Max Agents**: AI agent configurations
   - **Max Workflows**: Automated workflow definitions
   - **Max Skills**: Custom skill templates
   - **Max Context Assets**: Knowledge base items
   - **Max Research Studios**: Research studio instances
   - **Max Monthly API Calls**: API call quota per month
4. Click **Save** to apply changes, or **Cancel** to discard edits
5. Changes take effect immediately for all organizations on that tier

### Managing Tier Features

1. Each tier has feature toggles:
   - **SSO Integration**: Single sign-on support
   - **White Label**: Custom branding
   - **API Access**: External API connectivity
   - **Priority Support**: Escalated support queue
   - **Custom Modules**: Additional module configuration
   - **Advanced Analytics**: Enhanced reporting and analytics dashboards
   - **Client Portal**: Client-facing portal access (Agency tier)
2. Toggle features on/off as needed
3. Click **Save All Changes** to persist

### Using the Comparison Table

1. Scroll down to the **Feature Comparison** section
2. View all tiers side-by-side with their limits and features
3. Use this table when explaining upgrade benefits to customers

### Viewing Module Access per Tier

Each tier card includes a **Module Access** section showing which platform modules are available at that subscription level.

| Tier | Accessible Modules |
|------|--------------------|
| **Starter** | Dashboard, Higgins, Agents, Briefing |
| **Business** | All Starter + Align120, Strategy120, Execute120, Research Studio, Thought Leadership |
| **Enterprise** | All Business + Soul Configuration, SynergiNexus, Advanced Analytics |
| **Agency** | All Enterprise + Agency Dashboard, Client Portal, White-Label Branding |

Module access is controlled via the `platform_modules` and `org_module_access` tables. Changes to tier module assignments affect all organizations on that tier.

---

## Tips & Best Practices

- Make limit increases during business hours for immediate customer benefit
- Make limit decreases with advance notice to affected organizations
- Keep a reasonable gap between tier limits to encourage upgrades
- Test feature toggles on a test organization before rolling out globally

---

## Tier Configuration Reference

### Starter Tier (Default)
- 3 members, 0 clients, 5 agents, 3 workflows, 10 skills, 50 context assets
- 1 research studio, 1,000 monthly API calls
- Features: None (no SSO, API, white-label, advanced analytics, or client portal)
- Modules: Dashboard, Higgins, Agents, Briefing

### Business Tier
- 10 members, 0 clients, 25 agents, 15 workflows, 50 skills, 200 context assets
- 3 research studios, 10,000 monthly API calls
- Features: API access, advanced analytics
- Modules: All Starter + Align120, Strategy120, Execute120, Research Studio, Thought Leadership

### Enterprise Tier
- 100 members, 0 clients, 100 agents, 50 workflows, 200 skills, 1,000 context assets
- 10 research studios, 100,000 monthly API calls
- Features: SSO, API access, priority support, advanced analytics
- Modules: All Business + Soul Configuration, SynergiNexus

### Agency Tier
- 50 members, 100 clients, 200 agents, 100 workflows, 500 skills, 2,000 context assets
- 20 research studios, 200,000 monthly API calls
- Features: SSO, API access, white-label, priority support, advanced analytics, client portal
- Modules: All Enterprise + Agency Dashboard, Client Portal, White-Label Branding

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Limit changes not saving | Verify super_admin role and check for validation errors |
| Feature toggle disabled | Some features require dependent features to be enabled first |
| Organizations not seeing new features | Users may need to refresh their browser or re-login |
| Comparison table not updating | Hard refresh the page (Ctrl+Shift+R) to clear cache |

---

## Access Requirements

- User must be in the `platform_admins` table
- Role must be `super_admin` or `admin`
- Support role has view-only access
