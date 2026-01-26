# Tier Setup User Guide

**For:** Synergi Platform Administrators
**Last Updated:** January 2026

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
| **Preview Changes** | See how limit changes affect existing organizations |

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
2. Click **Edit** on the tier card
3. Adjust the resource limits:
   - **Max Members**: Team size limit
   - **Max Clients**: Client records (Agency only)
   - **Max Agents**: AI agent configurations
   - **Max Workflows**: Automated workflow definitions
   - **Max Skills**: Custom skill templates
   - **Max Context Assets**: Knowledge base items
4. Click **Save** to apply changes
5. Changes take effect immediately for all organizations on that tier

### Managing Tier Features

1. Each tier has feature toggles:
   - **SSO Integration**: Single sign-on support
   - **White Label**: Custom branding
   - **API Access**: External API connectivity
   - **Priority Support**: Escalated support queue
   - **Custom Modules**: Additional module configuration
2. Toggle features on/off as needed
3. Click **Save All Changes** to persist

### Using the Comparison Table

1. Scroll down to the **Tier Comparison** section
2. View all tiers side-by-side with their limits and features
3. Use this table when explaining upgrade benefits to customers
4. Export the comparison as PDF for sales materials

### Checking Impact of Changes

1. Before saving major limit changes, click **Preview Impact**
2. View how many organizations are affected:
   - Organizations currently under the new limit
   - Organizations currently over the new limit
3. Organizations over the limit will see upgrade prompts but existing resources remain functional

---

## Tips & Best Practices

- Make limit increases during business hours for immediate customer benefit
- Make limit decreases with advance notice to affected organizations
- Keep a reasonable gap between tier limits to encourage upgrades
- Document the reasoning for limit changes in the change log
- Test feature toggles on a test organization before rolling out globally

---

## Tier Configuration Reference

### Starter Tier (Default)
- 3 members, 5 agents, 3 workflows
- Basic modules: Dashboard, Higgins, Agents, Briefing
- No SSO, API, or white-label

### Business Tier
- 10 members, 25 agents, 15 workflows
- Adds: Align120, Strategy, Research Studio, Thought Leadership
- API access included

### Enterprise Tier
- 100 members, 100 agents, 50 workflows
- Adds: SSO integration, priority support
- Full module access except Agency features

### Agency Tier
- 50 members, 100 clients, 200 agents, 100 workflows
- Adds: White-label branding, client portal
- Full module access including Agency Dashboard

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
