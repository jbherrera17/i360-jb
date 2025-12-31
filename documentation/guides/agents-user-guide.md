# Agent Library User Guide

**For:** Insight 360 Users
**Last Updated:** December 30, 2025

---

## Why Agents Are Important

Agents are specialized AI assistants configured for specific tasks. Instead of explaining your needs from scratch each time, agents come pre-loaded with:

- **Role definition**: Who the agent is and how it behaves
- **Instructions**: Step-by-step guidance for consistent outputs
- **Context awareness**: Knowledge about your business
- **Skill integration**: Specialized capabilities

Think of agents as expert team members you can call on instantly—each one trained for a specific job.

---

## What It Does

The Agent Library lets you:

| Action | Description |
|--------|-------------|
| **Browse** | Explore all available agents by category and suite |
| **Search** | Find agents by name or description |
| **Run** | Execute agents with custom input |
| **Create** | Build new agents for your needs |
| **Edit** | Modify agent configurations |
| **Export** | Share agents with others |

---

## Step by Step Use

### Browsing the Agent Library

1. Click **Agent Library** in the sidebar
2. View the agent grid showing all available agents
3. Each card displays:
   - Agent icon and name
   - Description
   - Category badge
   - Suite indicator (Align/Strategy/Execute)
   - Usage count

### Filtering Agents

**By Suite:**
1. Use the suite tabs at the top:
   - **All**: Show every agent
   - **Align**: Values and alignment agents
   - **Strategy**: Planning and strategy agents
   - **Execute**: Action and execution agents

**By Category:**
1. Click the category dropdown
2. Select a category (e.g., Content, Analysis, Operations)
3. Only matching agents appear

**By Status:**
1. Toggle "Active Only" to hide disabled agents
2. Or show all agents including inactive ones

### Searching for Agents

1. Click the search box
2. Type keywords (name, description, or capability)
3. Results filter in real-time
4. Press Enter or click a result

### Running an Agent

**From the Library:**
1. Find the agent you want
2. Click the agent card to open details
3. Click the **Run** button
4. Enter your input/prompt
5. Click **Execute**
6. View the agent's response

**From Agent Runner:**
1. Click **Run** on any agent
2. Opens dedicated agent runner interface
3. Provides full-screen interaction space
4. Shows conversation history with that agent

### Viewing Agent Details

1. Click any agent card
2. The detail modal shows:
   - Full description
   - System prompt (what the agent knows)
   - Required context types
   - Optional context types
   - Conversation starters (example prompts)
   - Usage statistics
   - Version history

### Creating a New Agent

1. Click **Create New Agent** button
2. Fill in the form:
   - **Name**: Descriptive agent name
   - **Icon**: Choose an emoji
   - **Description**: What the agent does
   - **Category**: Select from list
   - **Suite**: Align, Strategy, or Execute
   - **System Prompt**: Instructions for the AI
   - **Model**: Which AI model to use
   - **Temperature**: Creativity level (0-1)
3. Configure context requirements:
   - Required: Must have these context types
   - Optional: Uses if available
4. Add conversation starters (optional)
5. Click **Save Agent**

### Editing an Agent

1. Open agent details
2. Click **Edit**
3. Modify any fields
4. Click **Save Changes**
5. Changes take effect immediately

### Exporting an Agent

1. Open agent details
2. Click **Export**
3. Download as JSON file
4. Share with teammates or import elsewhere

### Deleting an Agent

1. Open agent details
2. Click **Delete**
3. Confirm the deletion
4. Agent is permanently removed

---

## Understanding Agent Suites

### Align Suite
Agents focused on values, principles, and alignment:
- Brand voice guardians
- Ethics reviewers
- Values alignment checkers

### Strategy Suite
Agents for planning and strategic thinking:
- Business strategists
- Market analysts
- Planning assistants

### Execute Suite
Agents that take action and produce outputs:
- Content creators
- Report generators
- Task executors

---

## Tips for Best Results

### Running Agents Effectively
- Provide clear, specific input
- Include relevant context in your prompt
- Use conversation starters as templates

### Creating Effective Agents
- Write detailed system prompts
- Be specific about the agent's role
- Include examples in the instructions
- Set appropriate temperature:
  - 0.0-0.3: Factual, consistent responses
  - 0.4-0.7: Balanced creativity
  - 0.8-1.0: Creative, varied responses

### Organizing Your Agents
- Use categories consistently
- Choose appropriate suites
- Write clear descriptions for discoverability

---

## Related Documentation

| Document | Description | Location |
|----------|-------------|----------|
| Skills User Guide | Reusable capabilities for agents | [skills-user-guide.md](./skills-user-guide.md) |
| Context Assets Guide | Business knowledge for agents | [context-user-guide.md](./context-user-guide.md) |
| Chat User Guide | Direct model conversation | [chat-user-guide.md](./chat-user-guide.md) |

---

## Troubleshooting

**Agent not responding:**
- Check that the agent's model is available
- Verify the agent is set to Active
- Try a simpler prompt first

**Agent gives unexpected results:**
- Review the system prompt for accuracy
- Check temperature setting
- Ensure required context is provided

**Can't find an agent:**
- Clear all filters
- Check if "Active Only" is hiding it
- Use search with different keywords

**Agent creation fails:**
- All required fields must be filled
- Name must be unique
- System prompt is required
