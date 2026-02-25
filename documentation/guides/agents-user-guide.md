# Agent Library User Guide

**For:** Insight 360 Users
**Last Updated:** Wednesday, February 12, 2026

---

## Why Agents Are Important

Agents are specialized AI assistants configured for specific tasks. Instead of explaining your needs from scratch each time, agents come pre-loaded with:

- **Role definition**: Who the agent is and how it behaves
- **Instructions**: Step-by-step guidance for consistent outputs
- **Context awareness**: Knowledge about your business via context injection
- **Skill integration**: Specialized capabilities
- **Introduction messages**: Automatic greeting shown at the start of each conversation

Think of agents as expert team members you can call on instantly—each one trained for a specific job.

---

## What It Does

The Agent Library lets you:

| Action | Description |
|--------|-------------|
| **Browse** | Explore all available agents by category, suite, and department |
| **Search** | Find agents by name or description |
| **Run** | Execute agents with custom input via the Agent Runner |
| **Create** | Build new native or MindStudio agents |
| **Edit** | Modify agent configurations |
| **Duplicate** | Copy an agent to create variants while preserving lineage |
| **Delete** | Remove agents you no longer need |

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
   - Source type badge (Native, MindStudio)
   - Usage count

### Filtering Agents

**By Suite:**
1. Use the suite filter chips at the top:
   - **All**: Show every agent
   - **Align**: Values and alignment agents
   - **Strategy**: Planning and strategy agents
   - **Execute**: Action and execution agents

**By Category:**
1. Click the category dropdown
2. Select a category (e.g., Content, Analysis, Operations)
3. Only matching agents appear

**By Department:**
1. Use the department filter dropdown
2. Select a department to see only its agents
3. Agents without a department assignment appear under "All"

**By Status:**
1. Filter by Active or All to show/hide disabled agents

### Searching for Agents

1. Click the search box
2. Type keywords (name or description)
3. Results filter in real-time

### Running an Agent

**From the Library:**
1. Find the agent you want
2. Click the agent card to open details
3. Click the **Run** button
4. You'll be taken to the Agent Runner page
5. Enter your input/prompt
6. Click **Execute**
7. View the agent's streaming response

**From Agent Runner:**
1. Click **Run** on any agent
2. Opens dedicated Agent Runner interface
3. Provides full-screen interaction space
4. Shows conversation history with that agent

**Runtime Options:**
- **Model Override**: Switch the model at execution time without changing the agent's default
- **On-Demand Context**: Include additional context assets for a specific execution
- **Session Tracking**: Conversations maintain session continuity

### Viewing Agent Details

1. Click any agent card
2. The detail modal shows:
   - Full description
   - Introduction message (shown at chat start)
   - System prompt (what the agent knows)
   - Context injection mappings (Always, On-Demand, Conditional)
   - Conversation starters (example prompts)
   - Usage statistics
   - Execution history

### Creating a New Agent

**Native (LLM) Agent:**
1. Click **Create New Agent** button
2. Fill in the form:
   - **Name**: Descriptive agent name
   - **Icon**: Choose an emoji
   - **Description**: What the agent does
   - **Category**: Select from list
   - **Suite**: Align, Strategy, or Execute
   - **Introduction**: Greeting shown at the start of each conversation
   - **System Prompt**: Instructions for the AI
   - **Model**: Which AI model to use (Claude, GPT, Gemini, Perplexity)
   - **Temperature**: Creativity level (0-1)
   - **Max Tokens**: Maximum response length (default 4096)
3. Add conversation starters (optional)
4. Click **Save Agent**

**MindStudio Agent:**
1. Click **Create New Agent** and select the MindStudio type
2. Provide the MindStudio App ID or Workflow ID
3. Configure the agent metadata (name, icon, description, category, suite)
4. MindStudio agents execute via external workflows with embedded iframe support

### Configuring Context Injection

Context is managed separately from agent creation, using injection modes:

1. Open the agent's detail view
2. Navigate to the context mappings section
3. Add context assets with one of three injection modes:
   - **Always**: Included in every execution automatically
   - **On-Demand**: Included only when explicitly requested at runtime
   - **Conditional**: Included based on keyword matching in the user's input
4. Set priority ordering and max tokens per asset
5. Preview how context will be assembled

### Configuring Guardrails

Agents support optional safety guardrails:
- **Max context tokens**: Limit how much context is injected
- **Allowed/Blocked topics**: Control which subjects the agent can discuss
- **Output format constraints**: Enforce specific response structures

### Editing an Agent

1. Open agent details
2. Click **Edit**
3. Modify any fields
4. Click **Save Changes**
5. Changes take effect immediately

### Duplicating an Agent

1. Open agent details
2. Click **Duplicate**
3. A copy is created with lineage tracking (linked to the original)
4. Edit the copy to customize it for a different use case
5. The duplicate starts with its own usage statistics

### Deleting an Agent

1. Open agent details
2. Click **Delete**
3. Confirm the deletion
4. Agent is permanently removed

**Note:** System agents are protected from deletion by non-admin users.

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
- Try overriding the model at runtime for different results

### Creating Effective Agents
- Write detailed system prompts
- Add a welcoming introduction message
- Be specific about the agent's role
- Include examples in the instructions
- Set appropriate temperature:
  - 0.0-0.3: Factual, consistent responses
  - 0.4-0.7: Balanced creativity
  - 0.8-1.0: Creative, varied responses

### Organizing Your Agents
- Use categories consistently
- Choose appropriate suites
- Assign agents to departments for organizational clarity
- Write clear descriptions for discoverability

---

## Related Documentation

| Document | Description | Location |
|----------|-------------|----------|
| Easy Start Guide | Automatically create agents via a guided conversation with Higgins | [easy-start-user-guide.md](./easy-start-user-guide.md) |
| Skills User Guide | Reusable capabilities for agents | [skills-user-guide.md](./skills-user-guide.md) |
| Context Assets Guide | Business knowledge for agents | [context-user-guide.md](./context-user-guide.md) |
| Chat User Guide | Direct model conversation | [chat-user-guide.md](./chat-user-guide.md) |

---

## Troubleshooting

**Agent not responding:**
- Check that the agent's model is available (Dashboard → System Status)
- Verify the agent is set to Active
- Try a simpler prompt first
- Check if the LLM provider is experiencing issues

**Agent gives unexpected results:**
- Review the system prompt for accuracy
- Check temperature setting
- Verify context injection mappings are configured correctly
- Try switching the model override at runtime

**Can't find an agent:**
- Clear all filters (suite, category, department)
- Use search with different keywords

**Agent creation fails:**
- All required fields must be filled
- System prompt is required for native agents
- Check if your organization has reached its agent limit (subscription tier dependent)

**MindStudio agent not loading:**
- Verify the MindStudio App ID is correct
- Ensure the MindStudio service is available
- Check that the workflow has not been deleted on MindStudio's side
