# Responsibility AI Mapping User Guide

**For:** Insight 360 Administrators
**Last Updated:** January 21, 2026

---

## Why AI Mapping Is Important

AI Mapping connects job responsibilities to the AI tools that support them. When configured properly:

- Users automatically see relevant tools in their dashboard
- Recommendations include context about when to use each tool
- Strength indicators (required/recommended/suggested) guide prioritization

This creates intelligent, role-based AI tool discovery.

---

## What It Does

The AI Mapping page lets you:

| Action | Description |
|--------|-------------|
| **Add Agents** | Recommend AI agents for this responsibility |
| **Add Skills** | Recommend skills for this responsibility |
| **Add Workflows** | Recommend workflows for this responsibility |
| **Set Strength** | Mark as Required, Recommended, or Suggested |
| **Add Notes** | Include use case guidance |
| **Remove** | Remove mappings that are no longer relevant |

---

## Step by Step Use

### Accessing AI Mapping

1. Go to **Admin → Responsibilities**
2. Find the responsibility to configure
3. Click **Configure AI** to open the mapping page

### Adding an Agent Recommendation

1. In the **Recommended Agents** section, click **Add Agent**
2. Select an agent from the dropdown
3. Choose a recommendation strength:
   - **Required**: Essential for this duty
   - **Recommended**: Should use for best results
   - **Suggested**: Optional but helpful
4. Add a use case note (optional) explaining when to use it
5. Click **Add Recommendation**

### Adding a Skill Recommendation

1. In the **Recommended Skills** section, click **Add Skill**
2. Select a skill from the dropdown
3. Choose a recommendation strength
4. Add a use case note (optional)
5. Click **Add Recommendation**

### Adding a Workflow Recommendation

1. In the **Recommended Workflows** section, click **Add Workflow**
2. Select a workflow from the dropdown
3. Choose a recommendation strength
4. Add a use case note (optional)
5. Click **Add Recommendation**

### Removing a Recommendation

1. Find the item to remove
2. Click the **trash icon** on that row
3. Confirm the removal

---

## Recommendation Strength Levels

| Strength | Meaning | User Experience |
|----------|---------|-----------------|
| **Required** | Must use this tool for the responsibility | Shown prominently, may trigger reminders |
| **Recommended** | Should use for best results | Featured in suggestions |
| **Suggested** | Optional enhancement | Available but not pushed |

---

## Tips for Best Results

### Writing Use Case Notes

Good use case notes help users understand when to apply each tool:

**Good examples:**
- "Use when analyzing quarterly campaign performance data"
- "Required for all customer-facing communications"
- "Helpful when creating executive summaries"

**Avoid:**
- "Use this agent" (too vague)
- Long paragraphs (keep it concise)
- Technical jargon (users may not understand)

### Choosing Strength Levels

- **Required**: Reserve for compliance or critical workflows
- **Recommended**: Use for high-value, frequently needed tools
- **Suggested**: Use for nice-to-have enhancements

### Avoiding Overlap

- Don't map the same agent to too many responsibilities
- Focus on the most relevant connection
- Users see everything; too many suggestions overwhelm

---

## What's Happening Behind the Scenes

When you add a mapping, Insight 360:

1. Creates a record in the appropriate junction table:
   - `responsibility_agents` for agents
   - `responsibility_skills` for skills
   - `responsibility_workflows` for workflows
2. Stores the strength level and use case note
3. Updates the `user_full_capabilities` view

When users load "My Capabilities":
1. Their responsibilities are fetched
2. All mapped AI tools are aggregated
3. Tools appear with their recommendation context

---

## Common Questions

**Q: Can I map the same tool to multiple responsibilities?**
A: Yes, a single agent/skill/workflow can support many responsibilities.

**Q: What if I don't see the tool I want to add?**
A: The tool must exist in the system. Check the Agent Library, Skills, or Workflows pages first.

**Q: Do changes apply immediately?**
A: Yes, users will see updated recommendations on their next page load.

**Q: Can users override recommendations?**
A: Users see recommendations but choose which tools to use. Administrators can also grant/revoke individual access.

---

## Related Features

- **Responsibilities Management** - List all responsibilities
- **My Capabilities** - Where users see their available tools
- **Agent Library** - Manage AI agents
- **Skills** - Manage skill definitions
- **Workflows** - Manage workflow automations
