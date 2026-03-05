# MCP Server Catalog User Guide

**For:** Insight 360 Platform Administrators
**Last Updated:** 2026-03-05

---

## Why the MCP Catalog Matters

The MCP Server Catalog is the central registry of all MCP servers available on the platform. As a platform admin, you control which external tool servers organizations can connect to, ensuring security and consistency across the platform.

---

## What It Does

| Action | Description |
|--------|-------------|
| **Add Server** | Register a new MCP server in the catalog |
| **Test Server** | Verify connectivity and discover available tools |
| **Approve/Reject** | Control which servers are available to organizations |
| **Set Tier Requirements** | Restrict servers to specific subscription tiers |
| **Monitor Connections** | See how many organizations are using each server |

---

## Step by Step Use

### Adding a New Server

1. Click **Add Server** in the top right
2. Fill in the required fields:
   - **Slug**: A unique identifier (lowercase, hyphens only)
   - **Name**: Display name for the server
   - **Transport Type**: Streamable HTTP (remote) or Stdio (local subprocess)
3. For HTTP servers, provide the default URL and authentication type
4. Optionally set a minimum tier requirement
5. Click **Create** -- the server starts in "pending" status

### Testing a Server

1. Click **Test** on any catalog entry
2. Enter test credentials (API key or token) when prompted
3. Optionally override the URL for testing
4. View the results: discovered tools, resources, and prompts
5. Test results are cached on the catalog entry for reference

### Approving a Server

1. Review the server configuration and test results
2. Click **Approve** to make it available to organizations
3. Only approved servers appear in the org admin catalog browser

### Rejecting a Server

1. Click **Reject** on a pending or approved entry
2. Optionally provide a reason for rejection
3. Rejected servers are hidden from org admins

---

## Server Configuration

### Transport Types

- **Streamable HTTP**: The server runs remotely and communicates over HTTP. This is the standard for cloud-based MCP servers.
- **Stdio**: The server runs as a local subprocess on the Insight 360 server. Reserved for platform-admin-only use due to security implications.

### Authentication Types

- **None**: No credentials required
- **API Key**: Org admins provide an API key that's sent as a Bearer token
- **Bearer Token**: Similar to API Key, sent as Authorization header

### Auth Config

The `auth_config` field (JSON) defines the credential form that org admins see when connecting. Example:

```json
{
  "fields": [
    { "name": "api_key", "label": "API Key", "type": "password", "required": true },
    { "name": "workspace_id", "label": "Workspace ID", "type": "text", "required": false }
  ]
}
```

---

## Tips & Best Practices

- Always test a server before approving it
- Set appropriate tier requirements to match the server's value
- Use descriptive names and icons for easy identification
- Monitor the pool status to track active connections across the platform

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Test fails with "Connection timeout" | The MCP server may be down or the URL is incorrect |
| Duplicate slug error | Each server needs a unique slug identifier |
| Org admins can't see the server | Ensure it's approved and the org's tier meets the minimum |
| No tools discovered | The server may not implement the tools/list endpoint |
