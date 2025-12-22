# Insight 360 Agent Library User Guide

**Version:** 2.7
**Last Updated:** December 22, 2025

---

## Overview

The Agent Library is your command center for managing and launching AI agents. Each agent is a specialized assistant powered by Claude or GPT, pre-configured with specific context assets to help with different tasks.

**Access:** Navigate to **Agents** in the top navigation bar, or visit `/agents.html`

---

## Page Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  INSIGHT 360          Dashboard | Chat | Context | Agents | Integrity   │
├──────────────┬──────────────────────────┬───────────────────────────────┤
│   OVERVIEW   │      AGENT LIST          │       AGENT DETAIL            │
│   ─────────  │      ──────────          │       ────────────            │
│   Stats      │   Content Writer    0    │   Icon + Name                 │
│              │   Sales Assistant   0    │   Provider Badge              │
│   SEARCH     │   Strategy Advisor  0    │   ─────────────────           │
│   ─────────  │   ...                    │   Department / Category       │
│   [Search]   │                          │   Status / Usage Count        │
│              │                          │   Description                 │
│   FILTERS    │                          │   ─────────────────           │
│   ─────────  │                          │   Context Mappings            │
│   Platform   │                          │   Execution History           │
│   Department │                          │                               │
│   Category   │                          │   [Edit] [Delete] [Launch]    │
│   Status     │                          │                               │
└──────────────┴──────────────────────────┴───────────────────────────────┘
```

---

## Features

### 1. Browsing Agents

The **Agent List** shows all available agents with:

| Element | Description |
|---------|-------------|
| **Icon** | Visual identifier (emoji or Lucide icon) |
| **Name** | Agent name |
| **Provider Badge** | LLM provider (anthropic, openai) |
| **Status Badge** | Active or inactive |
| **Usage Count** | Number of times the agent has been executed |

**Click any agent** to view its details in the right panel.

### 2. Filtering & Search

Use the sidebar controls to find agents:

| Filter | Options |
|--------|---------|
| **Search** | Type to filter by name (debounced 300ms) |
| **Platform** | All, MindStudio, PickAxe, Native, API |
| **Department** | Filter by department (if configured) |
| **Category** | content, sales, strategy, productivity, etc. |
| **Status** | All, Active, Inactive |

### 3. Agent Detail Panel

When you select an agent, the detail panel shows:

- **Header**: Icon, name, and provider badge
- **Metadata**: Department, category, status, usage count
- **Description**: What the agent does
- **Context Mappings**: Which context assets are injected into prompts
- **Execution History**: Recent runs with status, tokens, and duration

### 4. Context Mappings

Context mappings connect agents to your context assets (VoiceDNA, Brand Guidelines, etc.). Each mapping shows:

| Field | Description |
|-------|-------------|
| **Asset Name** | The context asset being injected |
| **Mode** | `always` (every request), `on_demand` (when requested), `conditional` (keyword-triggered) |
| **Priority** | Higher priority assets are injected first |
| **Token Estimate** | Approximate token count |

**To add a context mapping:**
1. Click **+ Add** in the Context Mappings section
2. Select an asset from the dropdown
3. Choose injection mode and priority
4. Click **Add Mapping**

---

## Launching Agents

The Agent Launcher lets you have conversations with any agent.

### Opening the Launcher

1. Select an agent from the list
2. Click the **Launch** button (rocket icon)
3. A slide-in panel opens from the right

### Launcher Interface

```
┌─────────────────────────────────────────┐
│  🎯 Strategy Advisor              ✕     │
│  claude-sonnet-4-20250514               │
├─────────────────────────────────────────┤
│  📦 Context Preview         ~2,200 tkns │
│  ├─ Core Values              ~500 tkns  │
│  ├─ Company Description      ~800 tkns  │
│  └─ Products                 ~900 tkns  │
├─────────────────────────────────────────┤
│                                         │
│           🎯                            │
│   Provides strategic guidance           │
│   aligned with Synergi AI core          │
│   values and the Insight 360            │
│   framework.                            │
│                                         │
│   [Starter 1] [Starter 2] [Starter 3]   │
│                                         │
├─────────────────────────────────────────┤
│  [Type your message...          ] [➤]   │
│  Ready                                  │
└─────────────────────────────────────────┘
```

### Context Preview

Before sending your first message, review the **Context Preview** section:

- Shows which context assets will be injected
- Displays estimated token count for each asset
- Click to expand/collapse
- Automatically collapses after first message

### Conversation Starters

If the agent has conversation starters configured, they appear as clickable buttons. **Clicking a starter immediately sends the message** and begins the conversation.

### Sending Messages

- **Type** in the text area at the bottom
- **Press Enter** to send (Shift+Enter for new line)
- **Click the send button** (arrow icon)

### During Response

- The **Synergi Swirls spinner** indicates the agent is thinking
- Response streams in real-time as tokens arrive
- Status shows "Thinking..." during generation

### Message Actions

Hover over any message to reveal:

- **Copy button**: Click to copy message text to clipboard
- Visual feedback shows checkmark for 2 seconds after copying

### Closing the Launcher

- Click the **X** button in the header
- Click the **dark overlay** outside the panel
- Press the **Escape** key

### Multi-Turn Conversations

The launcher supports multi-turn conversations within a session:

- Previous messages are sent as conversation history
- Context is maintained throughout the session
- **Note**: Conversations are not persisted when you close the launcher

---

## Managing Agents

### Creating a New Agent

1. Click **+ New Agent** button
2. Fill in the form:
   - **Name** (required)
   - **Description**
   - **Icon** (emoji or Lucide icon name)
   - **Category**
   - **LLM Provider** (Anthropic or OpenAI)
   - **Model** (claude-sonnet-4, gpt-4o, etc.)
   - **System Prompt** (instructions for the agent)
   - **Temperature** (0-1, controls creativity)
   - **Max Tokens** (response length limit)
3. Click **Save**

### Editing an Agent

1. Select the agent
2. Click the **Edit** button (pencil icon)
3. Modify fields as needed
4. Click **Save**

### Deleting an Agent

1. Select the agent
2. Click the **Delete** button (trash icon)
3. Confirm deletion

**Note**: Deletion is soft-delete by default (agent becomes inactive).

---

## Starter Agents

Insight 360 comes with 6 pre-configured starter agents:

| Agent | Category | Purpose |
|-------|----------|---------|
| ✍️ **Content Writer** | content | Creates on-brand content (blogs, social, marketing) |
| 💼 **Sales Assistant** | sales | Crafts sales communications, handles objections |
| 🎯 **Strategy Advisor** | strategy | Strategic guidance aligned with core values |
| 📋 **Daily Briefer** | productivity | Personalized daily briefings and priorities |
| 📧 **Email Composer** | communication | Professional emails in company voice |
| 🔬 **Research Analyst** | research | Market research and competitive analysis |

### Integrity Agents

Three specialized agents for governance:

| Agent | Purpose |
|-------|---------|
| 🛡️ **Integrity Auditor** | Front Page Tests, Values Drift analysis |
| 📡 **Risk Sentinel** | Leading indicator monitoring, drift detection |
| 🧮 **Counterfactual Analyst** | ROI calculation, compliance cost avoidance |

---

## Execution History

The **Recent Executions** section shows the last 10 runs for the selected agent:

| Field | Description |
|-------|-------------|
| **Date** | When the execution occurred |
| **Status** | Success (green) or Error (red) |
| **Preview** | First 80 characters of user message |
| **Tokens** | Total tokens used |
| **Duration** | Response time in milliseconds |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Enter** | Send message (in launcher) |
| **Shift+Enter** | New line in message |
| **Escape** | Close launcher panel |

---

## Tips & Best Practices

1. **Review Context Preview** before launching to understand what context the agent will use

2. **Use Conversation Starters** for common tasks - they're pre-optimized prompts

3. **Check Execution History** to review past interactions and token usage

4. **Adjust Context Mappings** to customize what information each agent has access to

5. **Monitor Token Counts** - agents with more context use more tokens per request

6. **Use the Right Model**:
   - **Claude Opus**: Complex reasoning, detailed analysis
   - **Claude Sonnet**: Balanced performance and cost
   - **GPT-4o**: Alternative provider, good for variety

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Agent not responding | Check if the agent is active and has a valid system prompt |
| Context not appearing | Verify context mappings are set to "always" mode |
| Slow responses | Large context (>4000 tokens) increases latency |
| Error during execution | Check browser console for API errors |

---

## Related Documentation

- [Context Assets Guide](user-guide-context.md) - Managing context assets
- [Integrity Module Guide](user-guide-integrity.md) - Integrity-specific features
- [Blueprint v2.7](I360%20Blueprint%20v2-7.md) - Technical architecture

---

*"Technology should augment human brilliance—not replace it."*

**Synergi AI** | Insight 360 v2.7
