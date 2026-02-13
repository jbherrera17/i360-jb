# Skills User Guide

**For:** Insight 360 Users
**Last Updated:** Wednesday, February 12, 2026

---

## Why Skills Are Important

Skills are reusable AI capabilities that ensure consistent, high-quality outputs. Instead of writing detailed prompts every time, skills provide:

- **Standardized workflows**: Same steps every time
- **Quality assurance**: Built-in best practices
- **Context integration**: Automatic access to business knowledge
- **Efficiency**: One-click access to complex procedures
- **Versioning**: Track changes and rollback when needed

Think of skills as recipes—detailed instructions that guarantee consistent results.

---

## What It Does

The Skills interface lets you:

| Action | Description |
|--------|-------------|
| **Browse** | Explore skills by suite, category, and department |
| **Test** | Try skills with sample inputs and view execution results |
| **Import** | Add skills by pasting SKILL.md content |
| **Export** | Share skills as SKILL.md markdown files |
| **Create** | Build new skills via the Skill Creator interface |
| **Duplicate** | Copy a skill to create variants |
| **Manage** | Edit, filter by status, or delete skills |

---

## Step by Step Use

### Browsing the Skills Library

1. Click **Skills** in the sidebar
2. View the skills grid
3. Each skill card shows:
   - Icon, name, and color accent
   - Version number
   - Suite badge (Align/Strategy/Execute)
   - Category tag
   - Status badge (Active/Draft)
   - Required and optional context type pills
   - Usage count and number of agents using the skill

### Filtering Skills

**By Suite:**
1. Click the suite filter chips:
   - **All**: Every skill
   - **Align**: Values and brand skills
   - **Strategy**: Planning and analysis skills
   - **Execute**: Production and action skills

**By Category:**
1. Use the category filter buttons
2. Categories are loaded dynamically from the database
3. Common categories include: Content, Voice, Workflow, Analysis, Design

**By Department:**
1. Use the department filter dropdown
2. Skills can be scoped to specific departments
3. Skills without a department show under "All"

**By Status:**
1. Use the status filter chips:
   - **All**: Every skill regardless of status
   - **Active**: Only production-ready skills
   - **Draft**: Skills still being developed

### Searching Skills

1. Type in the search box
2. Matches skill display name, internal name, and description
3. Results update as you type

### Viewing Skill Details

1. Click any skill card
2. The detail modal shows:
   - Full description
   - Suite, version, and status badges
   - Required context types (must be available for execution)
   - Optional context types (enhance results when present)
   - Conversation starters (example prompts)
   - Instructions preview (truncated)

### Testing a Skill

1. Open skill details
2. Click **Test Skill**
3. Enter a test message/input in the prompt dialog
4. The skill executes via the AI model
5. View the response in a content modal
6. Results include: output content, tokens used, execution duration, and model used
7. All test executions are recorded in the skill's execution history

### Importing a Skill

1. Click **Import Skill** button
2. Paste SKILL.md content or JSON into the text area
3. The system parses the skill definition (YAML frontmatter + markdown sections)
4. Review the imported skill
5. Click **Save** to add to library

**SKILL.md Format:**
The import parser recognizes:
- YAML frontmatter with: name, description, version, category, suite, required_context, optional_context, context_token_budget
- Markdown sections: Instructions, Output Format, Trigger Phrases, Conversation Starters, Examples

### Exporting a Skill

1. Open skill details
2. Click **Export**
3. The skill downloads as a SKILL.md markdown file with YAML frontmatter

**Note:** The backend also supports JSON export format via the API (`?format=json`), though the UI exports as markdown by default.

### Creating New Skills

1. Click **Create Skill** button
2. Opens the Skill Creator interface (separate page)
3. Follow the guided workflow:
   - Define the skill's purpose and metadata (name, description, icon, color, category, suite)
   - Write detailed instructions
   - Specify context needs (required and optional types)
   - Set context token budget
   - Add conversation starters and examples
   - Define output format
   - Test and refine
4. Save when complete

### Editing Skills

1. Open skill details
2. Click **Edit**
3. Opens the Skill Creator in edit mode
4. Modify any fields:
   - Name, description, icon, color
   - Instructions (triggers auto-versioning)
   - Context requirements
   - Conversation starters
   - Output format and examples
5. Save changes
6. If instructions changed, a new version is automatically created (e.g., 1.0.0 → 1.1.0)
7. Agents with auto-update enabled will automatically use the new version

### Duplicating a Skill

1. Open skill details
2. Click **Duplicate**
3. A copy is created with:
   - New name (appended with "-copy")
   - Version reset to 1.0.0
   - Status set to Draft
   - All associated skill files copied
4. Edit the duplicate to customize it

### Managing Skill Status

**Filtering by Status:**
1. Use the status filter chips (All, Active, Draft)
2. Active skills are available for agent use
3. Draft skills are still in development

**Deleting:**
1. Open skill details
2. Click **Delete**
3. If the skill is used by agents:
   - You can **archive** it (soft delete, sets status to 'archived')
   - Or **force delete** it (removes from agents, then deletes permanently)
4. Confirm the action

---

## Understanding Skill Structure

### SKILL.md Format

Skills are defined in Markdown with YAML frontmatter:

```markdown
---
name: content-reviewer
description: Reviews content for brand voice compliance
version: 1.0.0
category: content
suite: align
required_context:
  - voice_dna
  - brand_assets
optional_context:
  - icp
context_token_budget: 4000
---

# Content Reviewer

## Instructions
1. Load brand voice context
2. Analyze the provided content
3. Check for voice alignment
4. Identify issues
5. Suggest improvements

## Output Format
Structured review with scores and recommendations

## Conversation Starters
- Review this blog post for brand voice compliance
- Check this email draft against our style guide

## Examples
### Example 1
**Input:** Review this headline...
**Output:** Analysis results...
```

### Required Context

Skills can specify required context types:
- These types must be available for proper execution
- Maps to `required_context_types` array in the skill definition

### Optional Context

Skills can use additional context if available:
- Enhances results when present
- Works without it
- Maps to `optional_context_types` array

### Versioning

Skills support automatic semantic versioning:
- When you edit a skill's instructions, a new version is automatically created
- Version numbers follow semantic versioning (e.g., 1.0.0, 1.1.0, 1.2.0)
- You can rollback to any previous version
- Agents with `auto_update_skill` enabled automatically get the latest version

---

## Skill Suites Explained

### Align Suite
Skills focused on values and consistency:
- Brand voice checkers
- Values alignment reviewers
- Ethics evaluators
- Tone analyzers

### Strategy Suite
Skills for planning and analysis:
- Market research assistants
- Competitive analyzers
- Strategy planners
- Decision frameworks

### Execute Suite
Skills that produce outputs:
- Content generators
- Report creators
- Document drafters
- Communication assistants

---

## Tips for Best Results

### Using Skills Effectively
- Provide clear, specific inputs
- Include all requested context
- Use conversation starters as templates
- Review and refine outputs

### Testing Skills
- Try various input types
- Test edge cases
- Verify context integration
- Check output consistency
- Review execution history to track improvements

### Creating Quality Skills
- Write detailed instructions with clear steps
- Include multiple input/output examples for few-shot learning
- Specify all context needs (required and optional)
- Set an appropriate context token budget
- Test thoroughly before sharing
- Use the output format field to enforce consistent response structure

---

## Related Documentation

| Document | Description | Location |
|----------|-------------|----------|
| Agents User Guide | Skills in agent configurations | [agents-user-guide.md](./agents-user-guide.md) |
| Context Assets Guide | Context that skills use | [context-user-guide.md](./context-user-guide.md) |
| Prompt Transformer | Create skills from prompts | [prompt-transformer-user-guide.md](./prompt-transformer-user-guide.md) |

---

## Troubleshooting

**Skill not producing expected output:**
- Verify required context assets exist and are accessible
- Check the instructions for accuracy
- Test with simpler inputs first
- Review execution history for patterns

**Import fails:**
- Ensure SKILL.md format is correct with proper YAML frontmatter
- Check YAML syntax (proper indentation, valid values)
- Verify the file encoding (UTF-8)
- Ensure name and instructions are present in the content

**Skill shows as Draft:**
- Skills start as Draft by default
- Edit the skill and change status to Active when ready
- Review skill configuration for any incomplete fields

**Can't find a skill:**
- Clear all filters (suite, category, department, status)
- Use search with different terms
- Check if the skill is in Draft status (switch status filter to "All")

**Organization limit reached:**
- Your subscription tier may limit the number of skills
- Contact your administrator to upgrade or remove unused skills
