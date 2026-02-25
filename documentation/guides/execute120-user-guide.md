# Execute 120 — Command Center User Guide

**For:** Insight 360 Users
**Last Updated:** Tuesday, February 25, 2026

---

## Why the Command Center Is Important

The Command Center is your personal workspace inside Insight 360. Instead of hunting across the platform for the right agent, workflow, or action, everything relevant to you loads immediately — filtered by your department and role. You can pin your most-used items so they are always one click away, pick up where you left off with recently used workflows and agents, and launch AI conversations with Higgins directly from curated department prompts.

---

## What It Does

| Action | Description |
|--------|-------------|
| **Personalized Header** | Displays your name, role, and department so you always know whose workspace you are in |
| **Pinned Items** | Star any agent, workflow, skill, action, or context asset to pin it to the top of the page as a quick-access chip |
| **Recently Used** | Shows the workflows you have run and agents you have accessed most recently, so you can resume work without searching |
| **My Agents** | Lists the top agents assigned to your department with a one-click Chat button |
| **My Workflows** | Lists the workflows available to your department with a one-click Start button |
| **Context Assets** | Shows documents and knowledge resources relevant to your department |
| **Skills** | Displays skills available to your department |
| **Quick Actions** | Lists one-click actions for common department tasks with an inline play button |
| **Quick Start with Higgins** | Provides curated prompt templates that open directly in Higgins AI chat |
| **Daily Briefing** | Shows your latest briefing summary (only if your subscription tier includes briefing access) |
| **Strategic Overview** | Shows active initiative counts and progress metrics (only for Executive and Director roles with Strategy 120 access) |
| **Department Browser** | A collapsible secondary section at the bottom for browsing any department's agents and workflows |
| **Create Workflow** | Header button that links directly to the Workflow Builder |

---

## Step by Step Use

### 1. Open the Command Center

Navigate to **Execute 120** from the sidebar. The page title shows as "[Your Name]'s Command Center" and the subtitle shows your role and department. This personalization happens automatically from your user profile.

If your profile has a department and role assigned, the main content grid loads agents, workflows, assets, skills, and actions that are relevant to you. If no department is set, the page still works but shows general resources.

### 2. Review Pinned Items

The **Pinned** section appears at the top of the page. When you first arrive it will be empty with the message "No pinned items yet. Star your favorite agents, workflows, or actions below."

Once you have pinned items, they appear as compact chips showing the item name and type. Click any chip to navigate directly to that item. Hover a chip to reveal an X button that unpins it.

### 3. Review Recently Used

The **Recently Used** section appears below Pinned, but only when there is data to show. It is hidden if you have no recent history. When visible, it shows a horizontally scrolling row of cards for:

- **Workflows** you have recently executed (from your workflow execution history)
- **Agents** you have pinned and recently accessed (from your favorites access time)

Each card shows the item's icon, name, and how long ago you last used it (e.g., "3h ago", "2d ago"). Click any card to navigate directly to that item.

### 4. Work from the Main Content Grid

The central two-column grid contains six content sections. Each section shows up to five items from your department and role, and every section has a **View All** link in the header to browse the full library.

#### My Agents

Shows agents assigned to your department. Featured agents appear first. Hover any agent row to reveal a **Chat** button that opens a direct conversation with that agent. The star button on the right pins or unpins the agent.

#### My Workflows

Shows workflows assigned to your department or available globally. Hover any workflow row to reveal a **Start** button that opens the workflow runner. The star button pins or unpins the workflow.

#### Context Assets

Shows knowledge documents and assets relevant to your department. Clicking a row opens the asset on the Context page. The star button pins or unpins the asset.

#### Skills

Shows skills available to your department. Clicking a row opens the skill on the Skills page. The star button pins or unpins the skill.

#### Quick Actions

Shows one-click actions for common tasks. Hover any action row to reveal a play button that navigates directly to the action in execute mode. The star button pins or unpins the action.

#### Quick Start with Higgins

Shows four prompt templates relevant to your department. Each prompt has two buttons that appear on hover:

- **Copy** -- copies the prompt text to your clipboard. The button changes to "Copied!" briefly to confirm.
- **Ask Higgins** -- navigates to the Higgins chat page (`/chat`) with the prompt pre-filled in the input field, ready to send.

Click anywhere on the prompt row to open it in Higgins directly.

### 5. Pin an Item

To pin any agent, workflow, skill, action, or context asset:

1. Hover over its row in any content section.
2. Click the star icon on the right side of the row. The star fills with amber to confirm it is pinned.
3. The item immediately appears as a chip in the **Pinned** section at the top.

To unpin, click the amber star again or hover the chip in the Pinned section and click the X button.

Pins are saved to your account and persist across sessions and devices.

### 6. Use Conditional Cards (Briefing and Strategic Overview)

Below the main grid, the page may show additional cards depending on your access level:

#### Daily Briefing

Shown if your subscription tier includes briefing access. Displays the title and a truncated preview of your most recent daily briefing. Click **Full Briefing** to read the complete briefing. If no briefing has been generated today, a **Generate Briefing** link appears.

#### Strategic Overview

Shown only to users with Executive or Director role level who also have Strategy 120 module access. Displays four metrics in a gradient card:

- Active Initiatives count
- Completed This Quarter count
- Average Progress percentage
- Total Initiatives count

Click **Strategy Hub** to navigate to the full Strategy 120 dashboard.

### 7. Browse All Departments (Secondary Section)

At the bottom of the page is a collapsible **Browse All Departments** toggle. Click it to expand the department browser:

1. A horizontal tab bar shows all active departments.
2. Click any department tab to load its agents and workflows in a two-column grid below.
3. The browser remembers whether it was open or closed the last time you visited, and restores that state automatically.

The department browser is intentionally secondary. Use it to explore resources outside your own department, or to help new team members see what is available across the organization.

### 8. Create a New Workflow

Click the **Create Workflow** button in the top-right area of the page header to navigate to the Workflow Builder, where you can design multi-step workflow wizards for your team.

---

## Running a Workflow

When you click **Start** on a workflow, the page navigates to the full-page workflow runner (`/workflow-run`). Workflows run sequentially through their steps:

### User Input Steps

Fill out form fields with the information the workflow needs. Required fields are marked with a red asterisk.

### Agent Chat Steps

The workflow generates a prompt from your previous inputs and presents it alongside an assigned AI agent. Click **Run with Agent** to execute the step -- this redirects to the Higgins chat page with the agent and prompt pre-loaded.

### Review Steps

Review the output from a previous step. You can optionally provide refinements in a textarea before proceeding.

### Output Steps

View and export the final compiled output from all workflow steps.

Use **Previous** and **Next** buttons at the bottom of the workflow runner to move between steps. The Next button changes to **Complete** on the final step.

---

## Automatic Personalization

The Command Center uses your user profile to tailor what you see:

### Department Filtering

All six main content sections (Agents, Workflows, Context Assets, Skills, Actions, Quick Prompts) automatically filter to show resources relevant to your assigned department. Resources without a department assignment are always included.

### Role-Based Filtering

Content also filters based on your business role level. Resources with role requirements are hidden if your role level does not meet the minimum. This means Executive-level users see resources that Individual Contributors do not.

### Module-Based Visibility

Certain cards only appear if your organization has access to that module:

- **Daily Briefing card** -- visible unless your organization's tier explicitly excludes the briefing module
- **Strategic Overview card** -- visible only with both Executive/Director role AND Strategy 120 module access

---

## Tips & Best Practices

- **Complete your profile first** -- your department and role must be set for personalization to work correctly. Go to **Profile** from the sidebar to update these.
- **Pin your most-used items** -- after a week of use, pin the agents and workflows you reach for most often. The Pinned section at the top saves you from scrolling each visit.
- **Use Quick Start prompts before building workflows** -- test an approach with a Higgins prompt, then formalize it as a workflow if you use it repeatedly.
- **Check the Recently Used section** -- if you are continuing a task from yesterday, your most recent workflows are there without any searching.
- **Explore the Department Browser** -- browse other departments to discover agents and workflows your colleagues use. Cross-department prompts often spark unexpected ideas.
- **Check your briefing daily** -- if the Daily Briefing card is visible, start each morning with the intelligence summary before diving into work.

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [Easy Start Guide](./easy-start-user-guide.md) | Conversational onboarding that creates custom agents, actions, and workflows automatically |
| [Workflow Guide](./workflow-user-guide.md) | Building and running workflow wizards |
| [Strategy 120 Guide](./strategy120-user-guide.md) | Strategic planning with AI agents and initiatives |
| [Agents Guide](./agents-user-guide.md) | General agent management and usage |
| [Departments Guide](./departments-user-guide.md) | Department setup and configuration |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Page header shows "Your Command Center" instead of your name | Your profile display name or department has not been set. Go to **Profile** in the sidebar to complete your profile. |
| Content sections show "No agents assigned" or similar | Your department may not have resources configured yet. Contact your administrator to assign agents, workflows, or actions to your department. |
| Pinned section is always empty after starring items | Check that you are logged in with the same account. Pins are user-specific and saved to the server, so they require authentication. |
| Recently Used section does not appear | The section is hidden until you have executed at least one workflow or pinned and accessed at least one agent. Run a workflow or chat with an agent to populate it. |
| Strategic Overview card is not visible | This card requires both Executive or Director role level AND Strategy 120 module access. Verify your role in Profile settings and contact your administrator about module access. |
| Daily Briefing card is not visible | Your subscription tier may not include briefing access. Contact your administrator or visit the Briefing page directly. |
| Quick Start prompts are empty or show generic placeholders | Default prompts are configured per department. If your department has no prompts configured, contact your administrator to add them via department configuration. |
| Copy button on prompts does not work | Your browser may be blocking clipboard access. The Clipboard API requires HTTPS or localhost. If you are on HTTPS and it still fails, try granting clipboard permissions in your browser settings. |
| Department Browser tab does not load content | Department data loads on demand when you open the browser and click a tab. If content does not appear, refresh the page and try again. If the error persists, the department may have no resources configured. |
| Workflows show estimated time but no Start button | Hover over the workflow row -- the Start button appears on hover. On touch devices, tap the row to trigger the hover state. |
