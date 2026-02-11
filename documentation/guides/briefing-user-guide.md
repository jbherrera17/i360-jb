# Briefing User Guide

**For:** Insight 360 Users
**Last Updated:** Tuesday, February 10, 2026

---

## Why Briefing Is Important

The Daily Briefing feature transforms your mornings by delivering personalized intelligence summaries powered by your configured agents. Instead of manually gathering information from multiple sources, you receive a consolidated, AI-generated report tailored to your needs.

Key benefits:
- **Time savings**: Get a comprehensive summary in minutes, not hours
- **Consistency**: Same format and depth every day
- **Agent-powered**: Each section uses specialized AI agents
- **Historical context**: Track briefings over time for patterns
- **Department relevance**: Access to agents filtered by your department assignment

---

## What It Does

The Briefing interface provides:

| Feature | Description |
|---------|-------------|
| **Today's Briefing** | View the current day's AI-generated summary |
| **Generate** | Create new briefings on-demand with streaming progress |
| **History** | Access past briefings with pagination |
| **Configuration** | Set up automated schedules, sections, and agent assignments |

---

## Step by Step Use

### Viewing Today's Briefing

1. Click **Briefing** in the sidebar
2. The **Today's Briefing** tab shows automatically
3. View the current date's intelligence summary
4. Each section is collapsible (click the header to expand/collapse):
   - Token usage is displayed in the section header
   - Sections expand by default to show content
   - Content renders in markdown format
5. Status indicators appear next to the briefing title

### Generating a New Briefing

1. Click the **Generate Briefing** button
2. Watch the streaming progress as sections are created
3. Each section is processed by its assigned agent in sequence
4. Streaming events show section start, completion, and progress
5. View results when generation completes
6. Status indicators show:
   - **Green**: All sections generated successfully
   - **Yellow**: Partial generation (one or more sections failed)
   - **Blue**: Currently generating (in progress)
   - **Red**: All sections failed

### Navigating Date History

**Quick Navigation:**
1. Use the arrow buttons next to the date
2. Click left arrow for previous day
3. Click right arrow for next day

**Full History:**
1. Click the **History** tab
2. View all past briefings with pagination
3. See status, section count, and token usage
4. Click any item to view that briefing

### Configuring Your Briefing

**Schedule Settings:**
1. Click the **Configuration** tab
2. Enable/disable automatic daily briefings with the toggle
3. Set the generation time (e.g., 6:00 AM)
4. Choose your timezone
5. Changes save automatically

**Managing Sections:**
1. View existing sections in the Configuration tab
2. Each section shows:
   - Section name with icon badge
   - Assigned agent name
   - Enabled/disabled status
3. Click edit (pencil icon) to modify settings
4. Click delete (trash icon) to remove

### Adding a New Section

1. Click **Add Section** button
2. Enter section details:
   - **Section Name**: Display title (e.g., "Market Intelligence")
   - **Agent**: Choose from available agents (use category filter to narrow)
   - **Prompt Template**: Optional custom prompt for the agent
   - **Icon**: Lucide icon name (e.g., "trending-up") - defaults to "file-text" if invalid
   - **Enabled**: Whether to include in generation
3. Click **Save Section**
4. Section appears in the list

### Filtering Agents by Category

When selecting an agent for a section:
1. Use the **Filter by Category** dropdown
2. The agent list updates to show only agents in that category
3. Agents are marked with badges:
   - **Star**: Featured agent for your department - optimized for your team
   - **Dot**: Relevant agent for your department
4. Select "All Categories" to see all available agents
5. Featured agents appear first for easy selection

### Enabling and Disabling Sections

You can temporarily disable a section without deleting it:
1. In the Configuration tab, edit a section
2. Toggle the enabled state
3. Disabled sections are skipped during briefing generation
4. Re-enable anytime to include in future briefings
5. Useful for seasonal changes or testing

### Editing an Existing Section

1. Find the section in the Configuration tab
2. Click the **edit** (pencil icon)
3. Modify the settings
4. Click **Save Section**
5. Changes save immediately and take effect on the next briefing generation

### Deleting a Section

1. Find the section in the Configuration tab
2. Click the **delete** (trash icon)
3. Confirm the deletion
4. Section is removed immediately

---

## Briefing Sections Explained

Each section is powered by an agent and generates content based on:

| Component | Purpose |
|-----------|---------|
| **Name** | Display title for the section |
| **Agent** | AI agent that generates content |
| **Prompt Template** | Custom instructions for the agent |
| **Icon** | Visual identifier (Lucide icon name) |
| **Enabled** | Whether to include in generation |
| **Slug** | Auto-generated unique identifier |

**Section Status During Generation:**
- **Completed**: Successfully generated content
- **Skipped**: No agent assigned to the section
- **Failed**: Error during generation (error message shown)

**Default Section Ideas:**
- Market Intelligence (trending-up)
- Competitive Analysis (search)
- Industry News (newspaper)
- Task Priorities (list-checks)
- Risk Assessment (shield-alert)

---

## Tips for Best Results

### Building Effective Briefings
- Keep sections focused and specific (recommended 3-6 sections)
- Choose agents that match section topics
- Provide clear, actionable prompt templates
- Test different agents to find the best fit
- Ensure at least one section has an agent assigned and is enabled

### Scheduling Strategy
- Schedule before your work starts
- Generation time varies based on agent response times (typically 2-5 minutes)
- Enable automatic briefings for consistency
- Review history weekly for patterns and trends

### Agent Selection
- Match agents to content types
- Look for agents marked with a star (featured for your department)
- Dot-marked agents are relevant to your department
- Use the category filter to narrow the agent list
- Test different agents to find best fit

---

## Related Documentation

| Document | Description | Location |
|----------|-------------|----------|
| Agents Guide | Agents that power briefings | [agents-user-guide.md](./agents-user-guide.md) |
| Dashboard Guide | Home screen overview | [dashboard-user-guide.md](./dashboard-user-guide.md) |
| Chat Guide | Interact with agents directly | [chat-user-guide.md](./chat-user-guide.md) |
| Execute 120 Guide | Department hub with briefing card | [execute120-user-guide.md](./execute120-user-guide.md) |
| Profile Guide | Set your department for personalization | [profile-user-guide.md](./profile-user-guide.md) |

---

## Troubleshooting

**Briefing not generating:**
- Check that at least one section is configured and enabled
- Verify that sections have agents assigned to them
- Ensure the assigned agents are active
- Check browser console for error messages
- Verify network connectivity

**Missing sections in output:**
- Verify the section is enabled in Configuration
- Verify an agent is assigned to the section
- Check the agent is active
- Review the prompt template for clarity
- Sections without agents show as "skipped"

**Automatic briefings not running:**
- Confirm schedule is enabled (toggle switch in Configuration)
- Verify time and timezone settings are correct
- Check that at least one section exists and is enabled
- Note: The scheduler must be running on the server

**Slow generation:**
- Reduce number of sections
- Simplify prompt templates
- Check agent response times
- Generation time depends on the number of sections and agent complexity
