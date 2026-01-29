# Integrations User Guide

**For:** Insight 360 Users
**Last Updated:** January 2026

---

## Why Integrations Are Important

Integrations connect Insight 360 to your existing tools and services, enabling your AI agents to access real-world data from email, calendars, CRM systems, and more. This creates richer, more contextual AI interactions.

---

## What It Does

| Action | Description |
|--------|-------------|
| **Connect Services** | Link your Google, Microsoft, CRM, or other accounts via OAuth or API key |
| **Sync Data** | Pull data from external services into Insight 360 for agent context |
| **Manage Connections** | View status, configure settings, and disconnect integrations |
| **Organization Integrations** | Admins can set up shared integrations for the entire organization |

---

## Step by Step Use

### Connecting a Personal Integration

1. Navigate to the **Integrations** page from the sidebar
2. Find the service you want to connect under **Available Integrations**
3. Click the **Connect** button
4. For OAuth services (Google, Microsoft, etc.), you will be redirected to sign in and grant permissions
5. For API key services, enter your API key and endpoint URL
6. Once connected, the service appears under **Your Connected Services**

### Syncing Data

1. Find your connected integration under **Your Connected Services**
2. Click the **Sync** button to trigger a data sync
3. The sync status and last sync time will update automatically

### Disconnecting an Integration

1. Find the connected integration you want to remove
2. Click the **Disconnect** button
3. Confirm the disconnection in the dialog
4. Your stored credentials will be securely deleted

### Configuring Organization Integrations (Admin Only)

1. Scroll to the **Organization Integrations** section
2. Click **Configure** on an existing integration, or set up a new one
3. Enter the instance URL, display name, and admin API key
4. Click **Save** to store the configuration

---

## Available Integrations

| Service | Category | Price | Status |
|---------|----------|-------|--------|
| Google Workspace | Productivity | $99/user/mo | Available |
| Microsoft 365 | Productivity | $99/user/mo | Beta |
| Salesforce | CRM | $299/mo | Available |
| HubSpot | CRM | $299/mo | Available |
| Slack | Communication | $99/mo | Beta |

---

## Tips & Best Practices

- Connect only the services you actively use to keep your data focused
- Review the permissions requested during OAuth before granting access
- Sync regularly to keep your agent context up to date
- Organization admins should coordinate shared integrations to avoid duplication

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Connection shows "Error" status | Try disconnecting and reconnecting the integration |
| OAuth redirect fails | Ensure pop-ups are not blocked and try again |
| Sync fails | Check that your access hasn't been revoked in the external service |
| "Provider not implemented" | This integration is planned but not yet available |
| Organization section not visible | You may not have admin permissions for your organization |
