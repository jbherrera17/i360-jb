# Actions User Guide

**For:** Insight 360 Users
**Last Updated:** December 30, 2025

---

## Why Actions Are Important

Actions are composable building blocks for AI-powered automation. They bridge the gap between conversation and execution:

- **Defined operations**: Clear inputs, outputs, and behaviors
- **Composability**: Combine actions into workflows
- **Reusability**: Write once, use everywhere
- **Accountability**: Track every execution

Actions turn AI from a conversation partner into a capable assistant that can take real steps.

---

## What It Does

The Actions interface enables:

| Feature | Description |
|---------|-------------|
| **Browse** | Explore available actions |
| **Execute** | Run actions with parameters |
| **Create** | Define new custom actions |
| **Test** | Validate actions before production |
| **Track** | View execution history |

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
   - Status

### Filtering Actions

**By Suite:**
1. Use the suite tabs:
   - **All**: Every action
   - **Align**: Values-focused actions
   - **Strategy**: Planning actions
   - **Execute**: Production actions

**By Status:**
1. Toggle **Active Only** to filter
2. Or show all including disabled

**By Search:**
1. Type in the search box
2. Matches name and description

### Viewing Action Details

1. Click any action card
2. The detail modal shows:
   - Full description
   - Input parameters
   - Output format
   - Execution history
   - Configuration options

### Executing an Action

**From the Library:**
1. Click an action card
2. Click **Execute**
3. Fill in required parameters
4. Click **Run**
5. View the results

**Parameter Types:**
- **Text**: Free-form input
- **Number**: Numeric values
- **Boolean**: Yes/No toggles
- **Select**: Choose from options
- **JSON**: Structured data

### Viewing Execution History

1. Open action details
2. Click the **History** tab
3. See all past executions:
   - Timestamp
   - Input parameters
   - Output/result
   - Duration
   - Status (success/failure)
4. Click any execution to see full details

### Creating a New Action

1. Click **Create Action**
2. Fill in basic info:
   - **Name**: Action identifier
   - **Display Name**: Friendly name
   - **Description**: What it does
   - **Suite**: Align, Strategy, or Execute
   - **Category**: Action type
3. Define parameters:
   - Add input parameters
   - Specify types and requirements
   - Set default values
4. Configure execution:
   - Define the action logic
   - Set output format
   - Configure error handling
5. Click **Save**

### Testing an Action

1. Open action details
2. Click **Test**
3. Enter test parameters
4. Click **Run Test**
5. Review results
6. Check for errors
7. Iterate until satisfied

### Editing an Action

1. Open action details
2. Click **Edit**
3. Modify configuration
4. Save changes
5. Test the updated action

### Exporting/Importing Actions

**Export:**
1. Open action details
2. Click **Export**
3. Download as JSON

**Import:**
1. Click **Import Action**
2. Upload JSON file
3. Review configuration
4. Save to library

---

## Action Components

### Input Parameters

Define what the action needs:

```json
{
  "parameters": [
    {
      "name": "content",
      "type": "text",
      "required": true,
      "description": "Content to process"
    },
    {
      "name": "format",
      "type": "select",
      "options": ["markdown", "html", "plain"],
      "default": "markdown"
    }
  ]
}
```

### Output Format

Define what the action returns:

```json
{
  "output": {
    "type": "object",
    "properties": {
      "result": "string",
      "metadata": "object",
      "status": "string"
    }
  }
}
```

### Execution Logic

How the action operates:
- AI-powered processing
- API integrations
- Data transformations
- Multi-step workflows

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

### Creating Effective Actions
- Define clear inputs and outputs
- Handle edge cases
- Include validation
- Document thoroughly

### Executing Actions
- Verify required parameters
- Use test mode first
- Check execution history
- Monitor for errors

### Composing Workflows
- Start with simple actions
- Build complexity gradually
- Reuse existing actions
- Test complete workflows

---

## Related Documentation

| Document | Description | Location |
|----------|-------------|----------|
| Parthenon Guide | Organizational processes | [parthenon-user-guide.md](./parthenon-user-guide.md) |
| Agents Guide | Agents that use actions | [agents-user-guide.md](./agents-user-guide.md) |
| Skills Guide | Skills vs. actions | [skills-user-guide.md](./skills-user-guide.md) |

---

## Troubleshooting

**Action execution fails:**
- Check all required parameters
- Verify parameter types
- Review error message
- Check action configuration

**Unexpected output:**
- Verify input parameters
- Check action logic
- Test with different inputs
- Review execution history

**Can't create action:**
- All required fields must be filled
- Name must be unique
- Parameters must be valid

**History not loading:**
- Check database connection
- Refresh the page
- Verify action ID
