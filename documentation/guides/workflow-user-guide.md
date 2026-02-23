# Workflow Builder & Runner User Guide

**For:** Insight 360 Users
**Last Updated:** Sunday, February 23, 2026

---

## Overview

The Workflow system in Insight 360 lets you create, manage, and execute multi-step automated processes. Workflows combine AI agents, user inputs, human oversight gates, and output generation to accomplish complex tasks with consistent, repeatable results.

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
- **Create context assets** - Build reusable knowledge within the workflow

---

## Workflow Builder

### Getting Started

1. Click **Workflows** in the navigation sidebar
2. Click **Workflow Builder**
3. The builder opens with an empty canvas ready for a new workflow (or loads an existing workflow if opened via an `?id=` parameter)
4. You will see the three-panel layout:
   - **Left Panel**: Step Library with available step types, organized by category
   - **Center Panel**: Canvas where you build your workflow with a vertical timeline
   - **Right Panel**: Step Configuration editor for the selected step

### Workflow Metadata

The canvas header contains two fields for your workflow:

| Field | Description |
|-------|-------------|
| **Name** | An editable text input for the workflow name (e.g., "Customer Proposal Builder"). Defaults to "New Workflow". |
| **Department** | A dropdown to assign the workflow to a department. Populated dynamically from your organization's departments. |

### Adding Steps

**Drag and Drop:**
1. Find the step type you need in the left panel Step Library
2. Drag it onto the canvas area
3. The step is added to the bottom of the timeline

**Add Step Button:**
1. Click the **+ Add Step** dashed button at the bottom of the timeline
2. This scrolls you to the Step Library to select a step type

**Search Steps:**
- Use the search input at the top of the Step Library to filter step types by name or description

### Available Step Types

Steps are organized into four categories in the Step Library:

**Input**

| Step Type | Icon | Description |
|-----------|------|-------------|
| **User Input** | `text-cursor-input` | Collect information from the user via form fields |
| **Context Creation** | `file-plus-2` | Create a context asset within the workflow |

**AI Processing**

| Step Type | Icon | Description |
|-----------|------|-------------|
| **Agent Chat** | `bot` | Process content with an AI agent |
| **Skill Execution** | `sparkles` | Run a specialized agent skill |
| **Research** | `search` | Web research with Perplexity |

**Human Control**

| Step Type | Icon | Description |
|-----------|------|-------------|
| **Human Gate** | `shield-check` | Approval checkpoint - pause for human approval |
| **Review** | `eye` | Review and refine output from a previous step |

**Output**

| Step Type | Icon | Description |
|-----------|------|-------------|
| **Final Output** | `file-check` | Compile and display the final result |
| **Artifact Generation** | `file-output` | Create a document or file from workflow outputs |

### Configuring Steps

Click any step on the canvas to open its configuration in the right panel. All steps share these common settings:

**Common Settings (All Step Types):**
- **Step Name** (required) - A descriptive name for the step
- **Description** - What the step does
- **Execution Mode** - How the step runs (see below)
- **Output Variable** - Variable name to store the step's output for use in later steps

**User Input Steps:**
- **Input Fields** - Add form fields (text, textarea, select) using the field builder
- Click **+ Add Field** to open a dialog where you enter the field name and choose the field type (Text, Textarea, or Select)
- Remove fields with the X button on each field item

**Context Creation Steps:**
- **Input Fields** - Define fields for the context asset data to be captured

**Agent Chat Steps:**
- **Agent** - Select an AI agent from your agent library
- **Prompt Template** - Write the prompt using `{{variable_name}}` for dynamic values

**Skill Execution Steps:**
- **Skill** - Select a skill from your skills library
- **Prompt Template** - Write the prompt template for the skill

**Research Steps:**
- **Prompt Template** - Define the research query template

**Human Gate Steps:**
- **Gate Message** - The message shown when waiting for approval

### Step Execution Modes

Each step has three execution mode options, toggled via buttons in the configuration panel:

| Mode | Behavior |
|------|----------|
| **Auto** | Runs automatically, proceeds immediately |
| **Review** | Runs then displays output for review before proceeding |
| **Gate** | Full stop - requires explicit human approval to continue |

Steps with Gate mode display a red "GATE" badge on the canvas. Steps with Review mode display a blue "REVIEW" badge.

### Reordering Steps

Steps execute in order from top to bottom on the vertical timeline. Each step card has action buttons that appear on hover:

- **Chevron Up** button - Move the step up one position
- **Chevron Down** button - Move the step down one position
- **Trash** button - Delete the step (a confirmation dialog appears before deletion)

The first step disables the up button, and the last step disables the down button.

### Undo and Redo

The canvas header includes **Undo** and **Redo** buttons for reverting or reapplying changes to your workflow. The undo history stores up to 50 states.

### Saving Your Workflow

The builder header provides two action buttons:

| Button | Description |
|--------|-------------|
| **Preview** | Opens the Workflow Runner in a new tab to test your workflow. Requires saving first. |
| **Save Workflow** | Saves the workflow name, department assignment, and all steps to the database. |

**Save validations:**
- A workflow name is required
- At least one step must exist

Validation failures are shown as dialog alerts. After a successful save, a green toast notification appears in the bottom-right corner. After saving, the URL updates to include the workflow ID (`?id=...`) so you can bookmark or share the link.

### Using Variables in Prompts

For Agent Chat, Skill Execution, and Research steps, you can reference outputs from previous steps in your prompt templates:

```
Use {{step_1_output.field}} to reference a specific field from step 1.
Use {{step_2_output}} to reference the full output of step 2.
Use {{variable_name}} to reference any matching field from previous steps.
```

**Example:**
```
You are generating a {{document_type}} for {{customer_name}}.

Use the following information:
- Company: {{company_info}}
- Needs: {{customer_needs}}

Previous research: {{step_2_output}}

Generate a professional document that addresses their specific needs.
```

---

## Workflow Runner

### Starting a Workflow

**From Workflow Builder:**
1. Save your workflow
2. Click the **Preview** button to open the runner in a new tab

**From Execute 120:**
1. Go to Execute 120
2. Find the workflow in your department
3. Click to launch the Workflow Runner

The runner loads via URL with `?id=` for the workflow ID, and optionally `?execution=` to resume a previous run.

### Understanding the Interface

**Left Sidebar:**
- **Workflow Title** - The name and icon of your workflow
- **Workflow Meta** - Category and estimated time
- **Step List** - All steps with their status:
  - Step numbers indicate pending steps
  - Checkmarks indicate completed steps
  - Highlighted/bordered step is your current position
- **Back to Execute 120** - Link to return to the workflow list

**Main Content Area:**
- **Header Bar** - Shows the current step name, an Exit button, and the help button
- **Content Area** - Displays the current step's content (forms, chat, review, etc.)
- **Previous Steps** - Expandable section showing outputs from earlier steps (click to expand/collapse)

**Footer Navigation:**
- **Progress Indicator** - Shows "Step X of Y"
- **Previous** - Go back to the previous step (hidden on the first step)
- **Next / Complete** - Advance to the next step, or complete the workflow on the final step

### Executing Steps

The runner guides you through each step based on its type:

**User Input Steps:**
1. Fill out the form fields
2. Required fields are marked with red asterisks
3. Click **Next** to save your input and proceed

**Context Creation Steps:**
1. Fill in the context asset fields
2. Click **Next** to create the asset and continue

**Agent Chat Steps:**
1. The AI processes automatically using the prompt template and previous step outputs
2. Watch the response generate (shows a loading spinner while processing)
3. Use the chat input at the bottom to ask follow-up questions or request changes
4. Press **Enter** to send a message (Shift+Enter for new line)
5. Click **Next** when satisfied with the output

**Skill Execution & Research Steps:**
1. These run similarly to Agent Chat steps
2. Output is displayed for review

**Review Steps:**
1. Displays the output from the previous step in a formatted view
2. Review the content for accuracy and completeness
3. Click **Next** to approve, or **Previous** to go back and make changes

**Human Gate Steps:**
1. Read the gate message displayed in a highlighted block
2. Fill in any input fields if present
3. If no fields, confirm you have reviewed the information
4. Click **Next** when ready to approve and continue

**Final Output Steps:**
1. View all compiled outputs from the workflow
2. Each contributing step's output is displayed with its name as a heading
3. Content is ready to copy or use

**Artifact Generation Steps:**
1. Displays an artifact generation panel
2. Fill in any required fields (file name, format, etc.)
3. The system creates the document based on workflow outputs

### Saving Progress

Your progress is automatically saved as you complete each step:
- Step outputs are persisted to the execution record
- The URL updates with the execution ID for easy resuming
- Close the page and resume later by returning to the same URL
- Access saved executions from Execute 120

### Completing a Workflow

When you reach the final step and click **Complete**:
1. Your execution is marked as complete with a timestamp
2. All outputs are saved
3. A success screen appears with:
   - A green checkmark confirmation
   - The workflow name
   - A **Run Another Workflow** button linking to Execute 120
   - A **Back to Dashboard** button linking to the home page

---

## Best Practices

### Designing Effective Workflows

1. **Start small** - Begin with 3-5 steps, expand later
2. **Clear step names** - Use descriptive names like "Gather Customer Info" instead of "Step 1"
3. **Strategic gates** - Place Human Gate steps before critical outputs that need approval
4. **Context first** - Use Context Creation or User Input steps early to gather information
5. **Test iteratively** - Use the Preview button to run through your workflow and find issues
6. **Assign departments** - Always select a department so the workflow appears in the correct Execute 120 view

### Writing Good Prompts

For Agent Chat, Skill Execution, and Research steps:

- Use `{{variable_name}}` for dynamic values from previous steps
- Reference previous steps with `{{step_N_output}}` where N is the step number
- Be specific about the desired format and length
- Include context from earlier steps to maintain consistency
- Provide clear instructions about tone, audience, and purpose

### Choosing Execution Modes

- Use **Auto** for steps that should process without interruption (most AI steps)
- Use **Review** when you want to see output before proceeding but do not need a hard stop
- Use **Gate** for critical checkpoints where human approval is mandatory

---

## Tips for Best Results

1. **Read instructions carefully** - Each step has specific guidance
2. **Provide context** - More detail in User Input steps leads to better AI output
3. **Iterate freely** - In Agent Chat steps, use the chat input to refine, expand, or change the output
4. **Review thoroughly** - Check generated content in Review steps before proceeding
5. **Use previous outputs** - The Previous Steps section lets you reference earlier work

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Workflow will not save** | Ensure the workflow has a name and at least one step; validation errors are shown as dialog alerts |
| **Agent or skill dropdown is empty** | Agents and skills are loaded from your organization's database on page load; contact your administrator if none appear |
| **Step fails during execution** | Review the error message shown as a toast notification; check that the selected agent is active and configured |
| **AI response not relevant** | Refine the prompt template; provide more specific context in follow-up messages |
| **Cannot proceed to next step** | Ensure all required fields are filled in (marked with red asterisks) |
| **Lost your progress** | Return to Execute 120 and look for "In Progress" workflows, or use the URL with the execution ID |
| **Preview button shows a dialog** | Save the workflow first before using Preview; the dialog will remind you if you have not saved yet |
| **Department dropdown is empty** | Departments are loaded from the database; contact your administrator if none appear |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` (in chat input) | Send message (Workflow Runner) |
| `Shift + Enter` (in chat input) | New line in message (Workflow Runner) |

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

Click the **?** help icon in the top-right corner of either the Workflow Builder or Workflow Runner for context-specific guidance, or visit the Guides section in the navigation.
