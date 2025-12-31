# Dashboard User Guide

**For:** Insight 360 Users
**Last Updated:** December 30, 2025

---

## Why the Dashboard Is Important

The Dashboard is your command center for the entire Insight 360 ecosystem. Instead of navigating through multiple screens to understand your AI system's status, the Dashboard gives you an instant overview of:

- Which services are online and ready
- Your available AI models
- Quick access to common tasks
- Recent agent activity
- Overall system health

Think of it as mission control—one glance tells you everything you need to know to start working.

---

## What It Does

The Dashboard provides four key functions:

| Section | Purpose |
|---------|---------|
| **System Status** | Shows which services (Claude, GPT, Voice, Search, Database) are operational |
| **Quick Actions** | One-click access to Chat, Voice Chat, Web Search, and File Analysis |
| **Available Models** | Displays all AI models you can use with their capabilities |
| **Recent Agents** | Shows your most-used agents for quick re-access |

---

## Step by Step Use

### Checking System Status

1. Look at the **System Status** card in the top-left
2. Each service shows a colored indicator:
   - **Green checkmark**: Service is online and ready
   - **Yellow circle**: Service is available but may have limitations
   - **Red X**: Service is offline or not configured
3. The overall status badge shows "All Systems Go" when everything is working

### Using Quick Actions

**Start a Chat:**
1. Click the **Start Chat** tile
2. You'll be taken to the chat interface with default settings

**Voice Chat:**
1. Click the **Voice Chat** tile
2. Opens chat with voice input/output enabled
3. Speak your message instead of typing

**Web Search:**
1. Click the **Web Search** tile
2. Opens chat with internet search enabled
3. Ask questions that require current information

**Analyze File:**
1. Click the **Analyze File** tile
2. Opens chat with file upload ready
3. Attach images, PDFs, or documents for analysis

### Viewing Available Models

1. Find the **Available Models** card
2. Each model shows:
   - Model name (e.g., "Claude Sonnet 4.5")
   - Provider (Anthropic or OpenAI)
   - Capabilities (chat, vision, code, etc.)
3. The number badge shows total available models

### Accessing Recent Agents

1. Look at the **Recent Agents** section on the right
2. Shows your 5 most recently used agents
3. Each agent displays:
   - Icon and name
   - Usage count
   - Last used timestamp
4. Click any agent to run it immediately
5. Use the **Quick Launch** dropdown for the full agent list

### Navigating to Other Sections

Use the left sidebar to access any module:
- **Chat**: Multi-LLM conversations
- **Agents**: Browse and manage agents
- **Context**: Business knowledge assets
- **Skills**: Reusable AI capabilities
- **Parthenon**: Organizational structure
- **Actions**: Composable web actions
- **Briefing**: Daily AI briefings
- **Strategy**: Strategy-to-Execution
- **Governance**: Strategy monitoring
- **Integrity**: Values alignment metrics

---

## Tips for Best Results

### Quick Keyboard Navigation
- Use the sidebar links for fast navigation
- The Dashboard is always accessible via the home icon

### Monitor Service Health
- Check the Dashboard at the start of your session
- If a service shows red, some features may be unavailable
- Contact your administrator if services remain offline

### Customize Your Workflow
- The Recent Agents list adapts to your usage patterns
- Frequently used agents appear at the top
- Use Quick Launch for less common agents

---

## Related Documentation

| Document | Description | Location |
|----------|-------------|----------|
| Chat User Guide | Full chat interface documentation | [chat-user-guide.md](./chat-user-guide.md) |
| Agents User Guide | Agent library management | [agents-user-guide.md](./agents-user-guide.md) |
| System Health | Technical health monitoring | [health-api.md](./health-api.md) |

---

## Troubleshooting

**Service shows offline:**
- Check your internet connection
- Verify API keys are configured in `.env`
- Restart the server if needed

**No models available:**
- Ensure Anthropic and/or OpenAI API keys are set
- Check the server console for initialization errors

**Recent Agents not loading:**
- Verify Supabase is connected (check System Status)
- Agents require database connectivity
