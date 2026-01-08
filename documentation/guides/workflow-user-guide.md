# Workflow Builder & Runner User Guide

**For:** Insight 360 Users
**Last Updated:** January 7, 2026

---

## Overview

The Workflow system in Insight 360 lets you create, manage, and execute multi-step automated processes. Workflows combine AI agents, user inputs, and decision points to accomplish complex tasks with consistent, repeatable results.

### Two Key Components

| Component | Purpose | Access |
|-----------|---------|--------|
| **Workflow Builder** | Create and edit workflow definitions | Navigation > Workflows > Workflow Builder |
| **Workflow Runner** | Execute workflows and track progress | Navigation > Workflows > Workflow Runner |

---

## Why Use Workflows?

Workflows are ideal when you need to:

- **Standardize processes** - Ensure consistent execution every time
- **Chain AI operations** - Connect multiple agents in sequence
- **Collect structured input** - Gather information step-by-step
- **Add human oversight** - Include review gates and approvals
- **Generate deliverables** - Produce documents, reports, or artifacts

---

## Workflow Builder

### Getting Started

1. Click **Workflows** in the navigation sidebar
2. Click **Workflow Builder**
3. You'll see the three-panel layout:
   - **Left Panel**: Step library with available step types
   - **Center Panel**: Canvas where you build your workflow
   - **Right Panel**: Properties for the selected step

### Creating a New Workflow

1. Click **New Workflow** button
2. Fill in the workflow metadata:
   - **Name**: A descriptive name (e.g., "Customer Proposal Builder")
   - **Description**: What the workflow accomplishes
   - **Icon**: Choose an icon from the picker
   - **Color**: Select a brand color
   - **Category**: Organize by type (content, analysis, operations, etc.)
   - **Suite**: Align, Strategy, or Execute
   - **Estimated Time**: How long it typically takes

### Adding Steps

**Drag and Drop:**
1. Find the step type you need in the left panel
2. Drag it onto the canvas
3. Drop it in the desired position

**Available Step Types:**

| Step Type | Icon | Description |
|-----------|------|-------------|
| **User Input** | form | Collect information from the user |
| **Agent Chat** | bot | Have an AI agent process or generate content |
| **Review** | eye | Display output for user review |
| **Decision** | git-branch | Branch based on user choice |
| **Output** | file-output | Generate final deliverable |
| **Context Load** | database | Load context assets into the workflow |
| **Skill Execution** | wand | Execute a specific skill |
| **Research** | search | Perform deep research using Perplexity |
| **Human Gate** | user-check | Pause for human approval |

### Configuring Steps

Click any step on the canvas to configure it in the right panel:

**User Input Steps:**
- Add form fields (text, textarea, select, checkbox)
- Set field labels and placeholder text
- Mark fields as required or optional
- Add validation rules

**Agent Chat Steps:**
- Select an AI agent
- Write the prompt template (use `{{previous_step}}` for variables)
- Set temperature and token limits
- Enable/disable streaming

**Review Steps:**
- Specify which previous output to display
- Add instructions for the reviewer
- Configure accept/reject actions

**Human Gate Steps:**
- Set the gate message
- Configure approval requirements
- Define timeout behavior

### Step Execution Modes

Each step can have an execution mode:

| Mode | Behavior |
|------|----------|
| **Auto** | Runs automatically, proceeds immediately |
| **Review** | Runs then displays output for approval |
| **Gate** | Stops completely until human action |

### Connecting Steps

Steps execute in order from top to bottom. To reorder:
1. Drag steps up or down on the canvas
2. Or use the **Reorder** button and enter new positions

### Saving Your Workflow

1. Click **Save** to save your progress
2. Click **Publish** to make it available for execution
3. Use **Save as Template** to create a reusable template

---

## Workflow Runner

### Starting a Workflow

**From Workflow Builder:**
1. Open your workflow
2. Click **Run** button

**From Workflow Runner:**
1. Navigate to Workflow Runner
2. Browse available workflows
3. Click **Start** on the desired workflow

**From Execute 120:**
1. Go to Execute 120
2. Find the workflow in your department
3. Click **Run**

### Understanding the Interface

**Left Sidebar:**
- **Workflow Title** - The name and category of your current workflow
- **Step List** - All steps in the workflow with their status:
  - Numbers indicate pending steps
  - Checkmarks indicate completed steps
  - Highlighted step is your current position

**Main Content Area:**
Shows the current step's content, including:
- Step description and instructions
- Input forms, AI chat, or review content
- Previous outputs (when relevant)

**Footer Navigation:**
- **Previous** - Go back to the previous step
- **Next/Complete** - Advance to the next step or finish the workflow

### Executing Steps

The runner guides you through each step:

**User Input Steps:**
1. Fill out the form fields
2. Required fields are marked with red asterisks
3. Click **Continue** to proceed

**Agent Chat Steps:**
1. The AI processes automatically
2. Watch the response generate in real-time
3. Ask follow-up questions in the chat input
4. Request specific changes or additions
5. Click **Continue** or **Regenerate**

**Review Steps:**
1. Read the displayed content carefully
2. Verify accuracy and completeness
3. Click **Approve** to proceed
4. Or click **Revise** to go back and make changes

**Human Gate Steps:**
1. Read the gate message
2. Complete any required action
3. Click **Proceed** when ready

**Output Steps:**
1. View the final compiled output
2. All generated content combined
3. Ready to copy or export

### Saving Progress

Your progress is automatically saved as you complete each step:
- Close the page and resume later
- Access saved executions from Execute 120
- Pick up exactly where you left off

### Tracking Progress

The runner shows your progress:
- **Step indicator**: Shows current step number
- **Progress bar**: Visual completion percentage
- **Step status**: Pending, Running, Completed, Failed
- **Time elapsed**: How long you've been running

### Viewing History

1. Go to Workflow Runner
2. Click **Execution History** tab
3. View past executions with:
   - Status (completed, failed, cancelled)
   - Duration
   - Start/end times
   - Output artifacts

### Completing a Workflow

When you reach the final step and click "Complete":
1. Your execution is marked as complete
2. All outputs are saved
3. You'll see a success screen with next actions

---

## Best Practices

### Designing Effective Workflows

1. **Start small** - Begin with 3-5 steps, expand later
2. **Clear step names** - Use descriptive names like "Gather Customer Info"
3. **Strategic gates** - Place human gates before critical outputs
4. **Context first** - Load context assets early in the workflow
5. **Test iteratively** - Run through your workflow to find issues

### Writing Good Prompts

For Agent Chat steps:

```
You are generating a {{document_type}} for {{customer_name}}.

Use the following information:
- Company: {{company_info}}
- Needs: {{customer_needs}}
- Budget: {{budget_range}}

Previous research: {{research_step.output}}

Generate a professional {{document_type}} that addresses their specific needs.
```

**Tips:**
- Use `{{variable_name}}` for dynamic values
- Reference previous steps with `{{step_name.output}}`
- Be specific about format and length
- Include context from earlier steps

### Using Templates

Templates save time on common workflows:

1. **Browse templates** in the template library
2. **Preview** to see the step structure
3. **Create from template** to make your own copy
4. **Customize** for your specific needs

---

## Tips for Best Results

1. **Read instructions carefully** - Each step has specific guidance
2. **Provide context** - More detail leads to better AI output
3. **Iterate freely** - Ask the AI to refine, expand, or change its output
4. **Review thoroughly** - Check generated content before proceeding
5. **Use previous outputs** - Reference earlier steps when relevant

---

## Troubleshooting

**Workflow won't save:**
- Ensure all required fields are filled
- Check that step names are unique
- Verify at least one step exists

**Step fails during execution:**
- Review the error message in the step output
- Check that required context assets exist
- Verify the agent is active and configured

**AI Response Not Relevant?**
- Check that previous step inputs are accurate
- Provide more specific context in follow-up messages
- Go back and update earlier inputs if needed

**Can't Proceed to Next Step?**
- Ensure all required fields are filled
- Check for validation errors on input fields

**Lost Your Progress?**
- Return to Execute 120 and look for "In Progress" workflows
- Your execution should be saved with the last completed step

**Workflow times out:**
- Break long operations into smaller steps
- Add progress indicators for user patience
- Consider async execution for heavy tasks

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save workflow (Builder) |
| `Ctrl/Cmd + Z` | Undo last change (Builder) |
| `Delete/Backspace` | Delete selected step (Builder) |
| `Enter` (in chat) | Send message (Runner) |
| `Escape` | Exit current modal or action |

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [Execute 120 Guide](./execute120-user-guide.md) | Department-based workflow execution |
| [Agents Guide](./agents-user-guide.md) | Understanding and using AI agents |
| [Skills Guide](./skills-user-guide.md) | Reusable agent capabilities |
| [Context Assets Guide](./context-user-guide.md) | Business knowledge for workflows |

---

## Need Help?

Click the **?** help icon in the top-right corner for context-specific guidance, or visit the Guides section in the navigation.
