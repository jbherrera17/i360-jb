# Responsibilities Management User Guide

**For:** Insight 360 Administrators
**Last Updated:** Wednesday, February 12, 2026

---

## Why Responsibilities Management Is Important

Responsibilities define the duties and tasks within your organization. By mapping AI capabilities to responsibilities, you ensure:

- **Relevant tools**: Users see AI tools that match their actual job duties
- **Better adoption**: People discover capabilities they didn't know existed
- **Governance**: Clear documentation of which tools support which functions

This creates a connection between "what people do" and "what AI helps them do."

---

## What It Does

The Responsibilities page lets you:

| Action | Description |
|--------|-------------|
| **View** | See all responsibilities with their AI mapping counts |
| **Search** | Find responsibilities by name |
| **Manage** | Configure AI recommendations for each responsibility |
| **Analyze** | See which responsibilities lack AI support |

---

## Step by Step Use

### Viewing Responsibilities

1. Click **Responsibilities** in the Admin section of the sidebar
2. View the list of all responsibilities in your organization
3. Each row shows:
   - Responsibility name
   - Parent responsibility (if hierarchical)
   - Level (strategic/operational/tactical)
   - AI mapping count (agents, skills, workflows)

### Filtering and Searching

1. Use the **Search** box to filter by name
2. Use the **Level** dropdown to filter by:
   - All Levels
   - Strategic
   - Operational
   - Tactical

### Configuring AI Mappings

1. Find the responsibility you want to configure
2. Click **Configure AI** or the row itself
3. You'll be taken to the AI Mapping page
4. See the next guide: "Responsibility AI Mapping"

### Understanding the Counts

The AI mapping count shows:
- **Agents**: Number of recommended agents
- **Skills**: Number of recommended skills
- **Workflows**: Number of recommended workflows

A responsibility with **0 mappings** may need AI tool recommendations.

---

## Tips for Best Results

- **Start with high-impact responsibilities**: Map AI to duties performed frequently
- **Use consistent strength levels**: Required → Recommended → Suggested
- **Review periodically**: As new AI tools are added, update mappings
- **Include use case notes**: Help users understand when to use each tool

---

## What's Happening Behind the Scenes

The responsibilities system uses:

1. `responsibilities` table - Stores the duty definitions
2. `responsibility_agents` - Maps agents to responsibilities
3. `responsibility_skills` - Maps skills to responsibilities
4. `responsibility_workflows` - Maps workflows to responsibilities

Each mapping includes a recommendation strength (required/recommended/suggested).

---

## Common Questions

**Q: What's the difference between responsibilities and roles?**
A: Roles are job titles (e.g., "Marketing Manager"). Responsibilities are duties within those roles (e.g., "Content Strategy", "Campaign Analysis").

**Q: Can one responsibility have multiple AI tools?**
A: Yes, a single responsibility can have many agents, skills, and workflows mapped to it.

**Q: What happens when I add a mapping?**
A: Users with that responsibility will see the AI tool in their "My Capabilities" dashboard.

**Q: Can I bulk-add mappings?**
A: Currently, mappings are added one at a time through the AI Mapping interface.

---

## Related Features

- **Responsibility AI Mapping** - Configure specific AI recommendations
- **My Capabilities** - Where users see their available tools
- **Departments** - Organizational units that contain responsibilities
