# MCP Connections User Guide

**For:** Insight 360 Organization Administrators
**Last Updated:** 2026-03-05

---

## Why MCP Connections Matter

Model Context Protocol (MCP) connections let your AI agents use external tools and data sources. When you connect an MCP server (like GitHub, Slack, or a database), your agents gain new capabilities -- they can search code, post messages, query data, and more, all directly within their workflow.

---

## What It Does

| Action | Description |
|--------|-------------|
| **Browse Catalog** | View available MCP servers approved by your platform admin |
| **Connect Server** | Link an MCP server to your organization with your credentials |
| **Toggle Tools** | Enable or disable specific tools from each connected server |
| **Test Connection** | Verify connectivity and refresh discovered capabilities |
| **View Usage** | Monitor your monthly MCP tool call usage against tier limits |

---

## Step by Step Use

### Connecting a New Server

1. Click **Connect Server** in the top right
2. Browse the list of approved MCP servers
3. Select the server you want to connect
4. Enter a name for your connection (e.g., "Our GitHub")
5. Provide the required credentials (API key, token, etc.)
6. Click **Connect** -- the system will validate your credentials and discover available tools

### Managing Tools

1. Select a connection from the left panel
2. In the detail view, you'll see all discovered tools
3. Use the toggle switches to enable or disable individual tools
4. Only enabled tools will be available to your agents

### Testing a Connection

1. Select a connection from the left panel
2. Click **Test** in the detail header
3. The system will reconnect and refresh all capabilities
4. Newly discovered tools will appear in the tool list

### Deleting a Connection

1. Select the connection from the left panel
2. Click **Delete** in the detail header
3. Confirm the deletion -- this removes the connection and all associated credentials

---

## How MCP Tools Work with Agents

When an agent runs, it automatically receives all enabled MCP tools from your organization's connections. During execution:

1. The AI model sees the available MCP tools alongside its other capabilities
2. If the model decides a tool is helpful, it calls it automatically
3. The tool result is fed back to the model to inform its response
4. All tool invocations are logged for audit purposes

---

## Tips & Best Practices

- Only enable the tools your agents actually need -- fewer tools means faster, more focused agent responses
- Test connections after credential changes to ensure they still work
- Monitor your monthly usage to stay within your tier limits
- Give connections descriptive names to easily identify them

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Connection shows "error" status | Click Test to reconnect. Check that your credentials are still valid. |
| No tools discovered | The MCP server may not expose any tools. Contact your platform admin. |
| "Monthly limit reached" error | Your org has exceeded its MCP call limit for the month. Upgrade your tier or wait for the next month. |
| "Already connected" error | Each server can only be connected once per organization. |
| Agent not using MCP tools | Ensure the tools are enabled (toggled on) for the connection. |
