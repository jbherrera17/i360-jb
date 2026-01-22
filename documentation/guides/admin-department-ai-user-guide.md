# Department AI Configuration User Guide

**For:** Insight 360 Administrators
**Last Updated:** January 21, 2026

---

## Why Department AI Configuration Is Important

Every department has unique needs and workflows. This page lets you customize the AI experience for each department:

- **Featured Agents**: Highlight the most useful agents for department members
- **Default Workflows**: Set up automated workflows department-wide
- **Required Skills**: Ensure specific capabilities are available
- **Quick Prompts**: Provide one-click access to common queries

This creates a tailored AI environment that matches how each team works.

---

## What It Does

The Department AI Configuration page lets you:

| Action | Description |
|--------|-------------|
| **Feature Agents** | Mark agents as prominently featured |
| **Assign Workflows** | Set default workflows for the department |
| **Assign Skills** | Require specific skills be available |
| **Add Quick Prompts** | Create one-click prompt shortcuts |

---

## Step by Step Use

### Accessing Department AI Configuration

1. Go to **Admin → Departments**
2. Find the department to configure
3. Click **AI Configuration** or the settings icon

### Configuring Featured Agents

1. Click the **Featured Agents** tab
2. Click **Add Agent**
3. Select an agent from the dropdown
4. Check **Mark as Featured** to highlight it
5. Click **Add**

Featured agents appear prominently in department members' agent lists.

### Configuring Default Workflows

1. Click the **Default Workflows** tab
2. Click **Add Workflow**
3. Select a workflow from the dropdown
4. Click **Add**

Workflows added here become available to all department members.

### Configuring Required Skills

1. Click the **Required Skills** tab
2. Click **Add Skill**
3. Select a skill from the dropdown
4. Click **Add**

Skills added here are available to agents within the department.

### Configuring Quick Prompts

Quick Prompts are pre-written queries that department members can use with one click.

1. Click the **Quick Prompts** tab
2. Click **Add Prompt**
3. Enter the prompt text (e.g., "Generate our weekly status report")
4. Set the display order
5. Click **Add Prompt**

---

## Tab Overview

### Featured Agents Tab

Shows agents specifically highlighted for this department:
- Agent name and description
- "Featured" badge for visual prominence
- Remove button to un-feature

### Default Workflows Tab

Shows workflows available department-wide:
- Workflow name and description
- Step count
- Remove button

### Required Skills Tab

Shows skills assigned to this department:
- Skill name and description
- Version indicator
- Remove button

### Quick Prompts Tab

Shows one-click prompt shortcuts:
- Display order number
- Prompt text
- Remove button

---

## Tips for Best Results

### Choosing Featured Agents

- Feature agents used frequently by the team
- Limit to 3-5 featured agents to avoid clutter
- Consider the department's primary functions

### Creating Quick Prompts

Good quick prompts are:
- **Specific**: "Generate Q4 sales analysis" not "Help me"
- **Complete**: Include all context needed
- **Action-oriented**: Start with verbs (Generate, Analyze, Summarize)

**Examples by department:**
- **Sales**: "Analyze this week's pipeline by stage"
- **Marketing**: "Generate social media post ideas for this campaign"
- **Engineering**: "Review this code for security vulnerabilities"
- **HR**: "Draft an onboarding checklist for new hires"

### Workflow Selection

- Assign workflows that match team processes
- Consider compliance and approval requirements
- Include HITL (human-in-the-loop) workflows for sensitive tasks

---

## What's Happening Behind the Scenes

When you configure department AI:

1. **Featured Agents**: Updates `department_agents` table with `is_featured` flag
2. **Workflows**: Sets `department_id` on the workflow record
3. **Skills**: Sets `department_id` on the skill record
4. **Quick Prompts**: Creates records in `department_quick_prompts` table

Department members see these configurations reflected in their:
- Agent Library (featured agents highlighted)
- My Capabilities (workflows and skills included)
- Quick prompt menu (in applicable interfaces)

---

## Common Questions

**Q: Who can access this configuration?**
A: Users with admin permissions for the department or organization administrators.

**Q: Do changes affect existing user sessions?**
A: Changes apply on the user's next page load or refresh.

**Q: Can I copy configuration from another department?**
A: Currently, configuration must be set up individually per department.

**Q: What's the maximum number of quick prompts?**
A: There's no hard limit, but we recommend 5-10 for usability.

**Q: Can departments share the same workflows?**
A: Yes, workflows can be available to multiple departments or organization-wide.

---

## Related Features

- **Departments** - Manage department structure
- **Agent Library** - Manage all available agents
- **Workflows** - Create and manage workflows
- **Skills** - Create and manage skills
- **My Capabilities** - Where users see available tools
