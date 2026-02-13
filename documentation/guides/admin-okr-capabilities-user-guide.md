# OKR Supporting Capabilities User Guide

**For:** Insight 360 Users and Administrators
**Last Updated:** Wednesday, February 12, 2026

---

## Why OKR Capabilities Is Important

Every OKR (Objective and Key Result) benefits from AI support. This page shows:

- Which actions, workflows, and skills support a specific OKR
- How each capability contributes (supports, measures, drives)
- Where to focus AI investment for strategic goals

This creates alignment between your strategic objectives and AI capabilities.

---

## What It Does

The OKR Capabilities page lets you:

| Action | Description |
|--------|-------------|
| **View OKR** | See the objective and its key results |
| **See Actions** | View actions that support this OKR |
| **See Workflows** | View workflows that support this OKR |
| **See Skills** | View skills mapped to this OKR |
| **Add Skills** | Map new skills to support this OKR |

---

## Step by Step Use

### Accessing OKR Capabilities

1. Go to **Strategy (S2E)** or your OKR dashboard
2. Find the OKR you want to analyze
3. Click **View Capabilities** or the link icon

### Understanding the OKR Header

The header shows:
- **OKR Title**: The objective statement
- **Scope Badge**: Company, Department, Team, or Individual
- **Progress Bar**: Overall completion percentage

### Viewing Key Results

The Key Results section lists:
- Each key result title
- Progress bar and percentage

### Viewing Supporting Actions

The **Supporting Actions** section shows:
- Action name and icon
- Contribution type badge:
  - **Supports**: Helps achieve the objective
  - **Measures**: Tracks progress on key results
  - **Drives**: Directly impacts outcomes
- Action description

### Viewing Supporting Workflows

The **Supporting Workflows** section shows:
- Workflow name
- Contribution type
- Step count

### Viewing and Adding Skills

The **Supporting Skills** section shows mapped skills.

To add a skill:
1. Click **Add Skill**
2. Select a skill from the dropdown
3. Choose the contribution type:
   - **Supports**: General support
   - **Measures**: Tracking/metrics
   - **Drives**: Direct impact
4. Click **Map Skill**

---

## Contribution Types Explained

| Type | Meaning | Example |
|------|---------|---------|
| **Supports** | Helps work toward the goal | A content creation skill supports a "brand awareness" OKR |
| **Measures** | Tracks progress | A reporting action measures "customer satisfaction" key results |
| **Drives** | Directly impacts outcome | A lead generation workflow drives a "revenue growth" OKR |
| **Reports** | Generates reports | A summary skill reports on OKR progress |

---

## Tips for Best Results

### Mapping Skills to OKRs

- **Be specific**: Only map skills with clear connections
- **Choose the right contribution type**: Think about how the skill actually helps
- **Review quarterly**: As OKRs change, update mappings

### Using This Information

- **For Strategy**: Identify OKRs lacking AI support
- **For Execution**: Know which tools to use for each goal
- **For Reviews**: See which capabilities contributed to OKR success

### OKR Coverage Analysis

Look for patterns:
- OKRs with many capabilities are well-supported
- OKRs with few capabilities may need AI investment
- Key results without "measures" capabilities need tracking tools

---

## What's Happening Behind the Scenes

The OKR capabilities view aggregates from:

1. `action_okrs` - Actions mapped to OKRs
2. `workflow_okr_mappings` - Workflows mapped to OKRs
3. `skill_okr_mappings` - Skills mapped to OKRs

The `okr_supporting_capabilities` database view combines these for easy querying.

---

## Common Questions

**Q: Can I add actions or workflows from this page?**
A: Currently, only skills can be added here. Actions and workflows are mapped elsewhere.

**Q: Why don't I see any capabilities?**
A: The OKR may not have any AI tools mapped yet. Consider adding relevant skills.

**Q: Can one capability support multiple OKRs?**
A: Yes, a single action, workflow, or skill can support many objectives.

**Q: How do I remove a mapping?**
A: Currently, this requires accessing the specific capability's settings page.

**Q: Does mapping affect who can use the capability?**
A: No, mapping is for tracking alignment. Access is controlled separately through roles and departments.

---

## Related Features

- **Strategy 120** - OKR management and tracking
- **Actions** - Manage Parthenon actions
- **Workflows** - Create automated workflows
- **Skills** - Create skill definitions
- **Company Dashboard** - See OKR progress overview
