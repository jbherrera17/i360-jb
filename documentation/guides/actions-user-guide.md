# Actions User Guide

**For:** Insight 360 Users
**Last Updated:** Tuesday, February 10, 2026

---

## Why Actions Are Important

Actions are composable building blocks for AI-powered automation. They bridge the gap between conversation and execution:

- **Defined operations**: Clear inputs, outputs, and behaviors
- **Composability**: Combine actions into workflows
- **Reusability**: Write once, use everywhere
- **Accountability**: Track every execution
- **Organizational alignment**: Link actions to Parthenon elements (OKRs, departments, processes)

Actions turn AI from a conversation partner into a capable assistant that can take real steps.

---

## What It Does

The Actions interface enables:

| Feature | Description |
|---------|-------------|
| **Browse** | Explore available actions by suite and department |
| **Execute** | Run actions with text input, powered by AI |
| **Create** | Create new actions from templates |
| **Edit** | Modify action name, description, suite, status, and department |
| **Delete** | Archive actions (soft delete) |
| **Track** | View execution history and statistics |

---

## Step by Step Use

### Browsing Actions

1. Click **Actions** in the sidebar
2. View the action library
3. Each action card shows:
   - Icon and name
   - Description
   - Suite badge
   - Execution count
   - Status (active/draft/archived)

### Filtering Actions

**By Suite:**
1. Use the suite tabs:
   - **All Actions**: Every action
   - **Align 120**: Values and alignment-focused actions
   - **Strategy 120**: Planning and analysis actions
   - **Execute 120**: Production-ready execution actions
2. Tab badges show count of actions in each suite

**By Department:**
1. Use the department filter dropdown
2. Select a department to see only its actions
3. Actions without a department show under "All"

**By Search:**
1. Type in the search box
2. Matches name and description

### Viewing Action Details

1. Click any action card
2. The detail modal shows:
   - Full description
   - Suite assignment
   - Status
   - Execution history

### Executing an Action

1. Click an action card to open it
2. Click **Run Action**
3. Enter your input in the text area (supports multi-line and markdown)
4. Click **Execute**
5. View the AI-generated results
6. Results show: output content, duration, model used, and status

### Viewing Execution History

1. Open action details
2. View recent executions listed with:
   - Timestamp
   - Duration
   - Status (success/failure)

### Creating an Action from a Template

1. Click **New Action** button
2. Select a template from the modal
3. Optionally assign to a department
4. Click **Create Action**
5. Your new action is created with template defaults and is ready to execute

### Editing an Action

1. Find your action (you can only edit actions you own)
2. Click the **Edit** button (pencil icon)
3. Update:
   - **Name**: Action identifier
   - **Description**: What it does
   - **Suite**: Align, Strategy, or Execute
   - **Status**: Active, Draft, or Archived
   - **Department**: Assign to a department
4. Click **Save Changes**

### Deleting an Action

1. Find your action (you can only delete actions you own)
2. Click the **Delete** button (trash icon)
3. Confirm deletion
4. Action is archived (soft-deleted and can be recovered)

---

## Action Execution

### How Actions Work

When you execute an action:
1. Your text input is sent to the AI model (Claude)
2. The action's configuration defines how the AI processes your input
3. Results are returned with the AI-generated output
4. Execution metadata (duration, tokens, status) is recorded

### Execution Statistics

The dashboard shows:
- **Total Actions**: Number of actions created
- **Total Executions**: Number of times actions have been run
- **Success Rate**: Percentage of executions that completed successfully

---

## Parthenon Context Integration

Actions can be connected to organizational Parthenon elements:

- **OKRs**: Goals and objectives this action supports
- **Departments**: Teams that use this action
- **Processes**: Workflows this action executes
- **Roles**: Who can use this action and associated permissions
- **Context Assets**: Business knowledge assets injected during execution

These connections enable context-aware action execution with organizational intelligence.

---

## Action Suites

### Align Suite
Actions focused on values and standards:
- Content compliance checks
- Brand voice validation
- Ethics review
- Policy verification

### Strategy Suite
Actions for planning and analysis:
- Market analysis
- Competitive research
- Trend identification
- Strategy validation

### Execute Suite
Actions that produce outputs:
- Content generation
- Report creation
- Data processing
- Notification sending

---

## Tips for Best Results

### Executing Actions
- Provide clear, specific input text
- Review execution results carefully
- Check execution history for patterns
- Monitor for errors

### Organizing Actions
- Assign actions to the correct suite
- Use department assignment for organizational clarity
- Set status to Draft while developing, Active when production-ready

### Composing Workflows
- Start with simple actions
- Build complexity gradually
- Reuse existing actions
- Test complete workflows

---

## Related Documentation

| Document | Description | Location |
|----------|-------------|----------|
| Easy Start Guide | Automatically create actions via a guided conversation with Higgins | [easy-start-user-guide.md](./easy-start-user-guide.md) |
| Parthenon Guide | Organizational processes | [parthenon-user-guide.md](./parthenon-user-guide.md) |
| Agents Guide | Agents that use actions | [agents-user-guide.md](./agents-user-guide.md) |
| Skills Guide | Skills vs. actions | [skills-user-guide.md](./skills-user-guide.md) |
| Workflow Guide | Combining actions into workflows | [workflow-user-guide.md](./workflow-user-guide.md) |

---

## Troubleshooting

**Action execution fails:**
- Verify the AI service is online (Dashboard → System Status)
- Check your input for clarity
- Review the error message for details
- Try with simpler input first

**Unexpected output:**
- Verify your input is clear and specific
- Try rephrasing your request
- Review execution history for patterns

**Can't create action:**
- Check if your organization has reached its action limit (subscription tier dependent)
- Select a template to create from

**Can't edit or delete an action:**
- You can only edit/delete actions you created
- System actions are protected from modification

**History not loading:**
- Check database connection (Dashboard → System Status)
- Refresh the page
