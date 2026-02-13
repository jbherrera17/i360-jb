# Dashboard User Guide

**For:** Insight 360 Users
**Last Updated:** Wednesday, February 12, 2026

---

## Why the Dashboard Is Important

The Dashboard is your command center for the entire Insight 360 ecosystem. Instead of navigating through multiple screens to understand your AI system's status, the Dashboard gives you an instant overview of:

- Which services are online and ready
- Your available AI models and their real-time availability
- Quick access to common tasks
- Onboarding progress and getting started resources
- Recent agent activity
- Overall system health

Think of it as mission control—one glance tells you everything you need to know to start working.

---

## What It Does

The Dashboard provides seven key sections:

| Section | Purpose |
|---------|---------|
| **Getting Started** | Onboarding resources and quick links to create context assets, build skills, and configure agents |
| **Onboarding Progress** | Track your setup completion (profile, feature tour, first workflow) |
| **System Status** | Shows which services (Claude, GPT, Gemini, Voice, Search, Database) are operational |
| **Quick Actions** | One-click access to Chat, Voice Chat, Web Search, and File Analysis |
| **Available Models** | Displays all AI models you can use with their tier classification |
| **Recent Agents** | Shows your most-used agents for quick re-access |
| **LLM Provider Status** | Real-time availability checks for Claude, GPT, Gemini, and Perplexity |

---

## Step by Step Use

### Completing Your Onboarding

If you see a "Complete Your Setup" card on the dashboard:

1. The card shows your progress (e.g., "2/3" completed)
2. It tracks three key setup steps:
   - Set up your profile
   - Take the feature tour
   - Run your first workflow
3. Click **Continue Setup** to launch the onboarding wizard
4. Complete any remaining steps to unlock full platform access
5. You can dismiss the card anytime by clicking the X button

The **Getting Started** card at the top provides quick links to:
- Read "How To Use Insight 360" documentation
- Create Context Assets
- Build Skills
- Configure Agents

### Checking System Status

1. Look at the **System Status** card
2. Each of the 6 services shows a status indicator:
   - **Green checkmark (Ready)**: Service is configured and available
   - **Gray circle (Offline)**: Service is not configured or unavailable
3. Services monitored: Claude (Anthropic), GPT (OpenAI), Gemini (Google), Voice (TTS/STT), Web Search, and Database
4. The overall status badge shows "All Systems Operational" when everything is working

### Monitoring LLM Provider Availability

1. Find the **LLM Provider Status** card on the dashboard
2. Each provider shows its current availability:
   - **Available**: Provider is online and responding
   - **Deprecated**: Provider version is deprecated but still functional
   - **Unavailable**: Provider is currently offline
   - **Auth Error**: API key is invalid or expired
   - **Rate Limited**: Provider is temporarily rate limiting requests
3. Admins can click **Check Now** to manually trigger availability checks
4. The card shows when the last check was performed (e.g., "5 minutes ago")

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
   - Model name (e.g., "Claude Opus 4.6")
   - Provider (Anthropic, OpenAI, Google, Perplexity)
   - Tier classification (Premium, Flagship, Standard, Efficient, Fast, Reasoning, Experimental)
3. The number badge shows total available models
4. Models are grouped by provider for easy browsing

### Accessing Recent Agents

1. Look at the **Recent Agents** section
2. Shows your 5 most recently used agents
3. Each agent displays:
   - Icon and name
   - Source type badge (Native, MindStudio)
   - Usage count (number of runs)
4. Click any agent to open the Agent Runner page where you can execute it

### Navigating to Other Sections

Use the left sidebar to access modules. The sidebar is organized into groups:

**Primary (always visible):**
- **Higgins** - Multi-LLM chat assistant
- **My Capabilities** - Your available AI tools
- **Execute 120** - Execution tracking

**AI 360 Systems:**
- **Agent Library** - Browse and manage agents
- **Strategy Agents** - AI-powered strategy agents
- **Context Assets** - Business knowledge assets
- **Actions** - Composable web actions
- **Skills** - Reusable AI capabilities
- **Workflows** - Automated workflow sequences
- **Prompt Transformer** - Prompt engineering tools

**Dashboards:**
- **Dashboard** - System overview (this page)
- **Company Dashboard** - Organization-wide metrics
- **Integrity Dashboard** - Values alignment metrics
- **Strategy Governance** - Strategy monitoring

**Modules:**
- **Align 120** - Alignment framework
- **Strategy (S2E)** - Strategy-to-Execution pipeline
- **Research Studio** - AI-powered research
- **Thought Leadership** - Content generation
- **Briefing** - Daily AI briefings
- **Guides** - Documentation and guides

**Agency (admin only):**
- **Agency Dashboard** - Agency overview
- **Customization** - White-label settings
- **Portal Users** - Client portal user management
- **Client Comparison** - Cross-client analytics

**Administration (admin only):**
- **Administrator** - Platform administration hub

---

## Tips for Best Results

### Quick Keyboard Navigation
- Use the sidebar links for fast navigation
- The Dashboard is always accessible via the home icon

### Monitor Service Health
- Check the Dashboard at the start of your session
- If a service shows offline, some features may be unavailable
- Use the LLM Provider Status for detailed provider monitoring
- Contact your administrator if services remain offline

### Customize Your Workflow
- The Recent Agents list adapts to your usage patterns
- Frequently used agents appear at the top
- Complete onboarding steps to get the most out of the platform

---

## Related Documentation

| Document | Description | Location |
|----------|-------------|----------|
| Chat User Guide | Full chat interface documentation | [chat-user-guide.md](./chat-user-guide.md) |
| Agents User Guide | Agent library management | [agents-user-guide.md](./agents-user-guide.md) |
| Onboarding Guide | Step-by-step setup process | [onboarding-guide.md](./onboarding-guide.md) |

---

## Troubleshooting

**Service shows offline:**
- Check your internet connection
- Verify API keys are configured in `.env`
- Restart the server if needed

**No models available:**
- Ensure Anthropic, OpenAI, and/or Google API keys are set
- Check the server console for initialization errors

**Recent Agents not loading:**
- Verify Supabase is connected (check System Status)
- Agents require database connectivity

**LLM Provider shows "Auth Error":**
- Verify API keys are correct in `.env`
- Check if the provider has revoked access
- Try clicking "Check Now" (admin only) to re-verify
- Contact the provider to ensure API access is active

**Onboarding card keeps appearing:**
- Complete the setup steps shown in the card
- Or click the X button to dismiss and continue later
- Progress is saved automatically
