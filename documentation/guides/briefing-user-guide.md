# Briefing User Guide

**For:** Insight 360 Users
**Last Updated:** January 2026 (Phase 37)

---

## Why Briefing Is Important

The Daily Briefing feature transforms your mornings by delivering personalized intelligence summaries powered by your configured agents. Instead of manually gathering information from multiple sources, you receive a consolidated, AI-generated report tailored to your needs.

Key benefits:
- **Time savings**: Get a comprehensive summary in minutes, not hours
- **Consistency**: Same format and depth every day
- **Agent-powered**: Each section uses specialized AI agents
- **Historical context**: Track briefings over time for patterns
- **Department-specific**: Briefings can be scoped to your department (Phase 37)

---

## What It Does

The Briefing interface provides:

| Feature | Description |
|---------|-------------|
| **Today's Briefing** | View the current day's AI-generated summary |
| **Generate** | Create new briefings on-demand |
| **History** | Access past briefings for reference |
| **Configuration** | Set up automated schedules and sections |

---

## Step by Step Use

### Viewing Today's Briefing

1. Click **Briefing** in the sidebar
2. The **Today's Briefing** tab shows automatically
3. View the current date's intelligence summary
4. Each section is collapsible:
   - Click the header to expand/collapse
   - View token usage per section
   - See the full AI-generated content

### Generating a New Briefing

1. Click the **Generate Briefing** button
2. Watch the progress bar as sections are created
3. Each section is processed by its assigned agent
4. View results when generation completes
5. Status indicators show:
   - **Green**: Complete and successful
   - **Yellow**: Partial (some sections may have errors)
   - **Blue**: Currently generating
   - **Red**: Failed

### Navigating Date History

**Quick Navigation:**
1. Use the arrow buttons next to the date
2. Click left arrow for previous day
3. Click right arrow for next day

**Full History:**
1. Click the **History** tab
2. View all past briefings
3. See status, section count, and token usage
4. Click any item to view that briefing

### Configuring Your Briefing

**Schedule Settings:**
1. Click the **Configuration** tab
2. Enable/disable automatic daily briefings
3. Set the generation time (e.g., 6:00 AM)
4. Choose your timezone
5. Changes save automatically

**Department-Specific Briefings (Phase 37):**
Briefings can now be scoped to your department:
- Your user profile includes a department assignment
- Briefing configurations can be linked to a specific department
- When viewing Execute 120, you see your department's briefing summary
- This ensures briefing content is relevant to your role

**Managing Sections:**
1. View existing sections in the Configuration tab
2. Each section shows:
   - Section name
   - Assigned agent
   - Icon indicator
3. Drag to reorder sections
4. Click edit to modify settings
5. Click delete to remove

### Adding a New Section

1. Click **Add Section** button
2. Enter section details:
   - **Section Name**: Display title (e.g., "Market Intelligence")
   - **Agent**: Choose from available agents
   - **Prompt Template**: Optional custom prompt
   - **Icon**: Lucide icon name (e.g., "trending-up")
3. Click **Save Section**
4. Section appears in the list

### Editing an Existing Section

1. Find the section in the Configuration tab
2. Click the **edit** (pencil) icon
3. Modify the settings
4. Click **Save Section**
5. Changes apply to next generation

### Deleting a Section

1. Find the section in the Configuration tab
2. Click the **delete** (trash) icon
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
| **Icon** | Visual identifier for the section |

**Default Section Ideas:**
- Market Intelligence (trending-up)
- Competitive Analysis (search)
- Industry News (newspaper)
- Task Priorities (list-checks)
- Risk Assessment (shield-alert)

---

## Tips for Best Results

### Building Effective Briefings
- Keep sections focused and specific
- Choose agents that match section topics
- Use 3-6 sections for optimal length
- Review and refine prompt templates

### Scheduling Strategy
- Schedule before your work starts
- Allow 5-10 minutes for generation
- Enable automatic briefings for consistency
- Review history weekly for patterns

### Agent Selection
- Match agents to content types
- Use research agents for market news
- Use analysis agents for competitive intel
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
- Check that sections are configured
- Verify agents are assigned to sections
- Ensure network connectivity
- Check browser console for errors

**Missing sections in output:**
- Verify the agent is active
- Check the prompt template for errors
- Review generation status for each section

**Automatic briefings not running:**
- Confirm schedule is enabled
- Verify time and timezone settings
- Check that at least one section exists

**Slow generation:**
- Reduce number of sections
- Simplify prompt templates
- Check agent response times
