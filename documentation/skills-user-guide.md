# Skills User Guide

**For:** Insight 360 Users
**Last Updated:** December 30, 2025

---

## Why Skills Are Important

Skills are reusable AI capabilities that ensure consistent, high-quality outputs. Instead of writing detailed prompts every time, skills provide:

- **Standardized workflows**: Same steps every time
- **Quality assurance**: Built-in best practices
- **Context integration**: Automatic access to business knowledge
- **Efficiency**: One-click access to complex procedures

Think of skills as recipes—detailed instructions that guarantee consistent results.

---

## What It Does

The Skills interface lets you:

| Action | Description |
|--------|-------------|
| **Browse** | Explore skills by suite and category |
| **Test** | Try skills with sample inputs |
| **Import** | Add skills from SKILL.md files |
| **Export** | Share skills with others |
| **Create** | Build new skills (via Skill Creator) |
| **Manage** | Edit, enable/disable, or delete skills |

---

## Step by Step Use

### Browsing the Skills Library

1. Click **Skills** in the sidebar
2. View the skills grid
3. Each skill card shows:
   - Icon and name
   - Version number
   - Suite badge (Align/Strategy/Execute)
   - Category tag
   - Status indicator

### Filtering Skills

**By Suite:**
1. Click the suite tabs:
   - **All**: Every skill
   - **Align**: Values and brand skills
   - **Strategy**: Planning and analysis skills
   - **Execute**: Production and action skills

**By Category:**
1. Use the category dropdown
2. Categories include:
   - Content: Writing and creation
   - Voice: Tone and communication
   - Workflow: Process automation
   - Analysis: Research and evaluation
   - Design: Visual and creative

### Searching Skills

1. Type in the search box
2. Matches skill names and descriptions
3. Results update as you type

### Viewing Skill Details

1. Click any skill card
2. The detail modal shows:
   - Full description
   - Required context types
   - Optional context types
   - Instructions preview
   - Conversation starters
   - Usage statistics

### Testing a Skill

1. Open skill details
2. Click **Test Skill**
3. Enter a test message/input
4. Click **Run Test**
5. View the skill's response
6. Iterate with different inputs

### Importing a Skill

**From SKILL.md File:**
1. Click **Import Skill** button
2. Select a `.md` file
3. The system parses the skill definition
4. Review the imported skill
5. Click **Save** to add to library

**From Shared Link:**
1. Click **Import Skill**
2. Paste the shared skill JSON
3. Review and save

### Exporting a Skill

1. Open skill details
2. Click **Export**
3. Choose format:
   - **SKILL.md**: Markdown format for Claude Code
   - **JSON**: Data format for sharing
4. Download or copy the output

### Creating New Skills

1. Click **Create Skill** button
2. Opens the Skill Creator interface
3. Follow the guided workflow:
   - Define the skill's purpose
   - Write instructions
   - Specify context needs
   - Add examples
   - Test and refine
4. Save when complete

### Editing Skills

1. Open skill details
2. Click **Edit**
3. Modify:
   - Name and description
   - Instructions
   - Context requirements
   - Conversation starters
4. Save changes

### Managing Skill Status

**Enabling/Disabling:**
1. Open skill details
2. Toggle the **Active** switch
3. Disabled skills won't appear in agents

**Deleting:**
1. Open skill details
2. Click **Delete**
3. Confirm the action
4. Skill is permanently removed

---

## Understanding Skill Structure

### SKILL.md Format

Skills are defined in Markdown with YAML frontmatter:

```markdown
---
name: content-reviewer
description: Reviews content for brand voice compliance. Use when checking drafts or finalizing content.
allowed-tools: Read, Grep
---

# Content Reviewer

## Overview
Reviews content against brand guidelines...

## When to Use
- Before publishing content
- When editing existing copy
- For brand compliance checks

## Instructions
1. Load brand voice context
2. Analyze the provided content
3. Check for voice alignment
4. Identify issues
5. Suggest improvements

## Examples
### Example 1
**Input:** Review this headline...
**Output:** Analysis results...
```

### Required Context

Skills can require specific context types:
- If required context is missing, the skill prompts for it
- This ensures consistent quality

### Optional Context

Skills can use additional context if available:
- Enhances results when present
- Works without it

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

### Creating Quality Skills
- Write detailed instructions
- Include multiple examples
- Specify all context needs
- Test thoroughly before sharing

---

## Related Documentation

| Document | Description | Location |
|----------|-------------|----------|
| Agents User Guide | Skills in agent configurations | [agents-user-guide.md](./agents-user-guide.md) |
| Context Assets Guide | Context that skills use | [context-user-guide.md](./context-user-guide.md) |
| Prompt Transformer | Create skills from prompts | [prompt-transformer-user-guide.md](./prompt-transformer-user-guide.md) |
| Skill Creator | Building new skills | [skill-creator-guide.md](./skill-creator-guide.md) |

---

## Troubleshooting

**Skill not producing expected output:**
- Verify required context is available
- Check the instructions for accuracy
- Test with simpler inputs first

**Import fails:**
- Ensure SKILL.md format is correct
- Check frontmatter YAML syntax
- Verify the file encoding (UTF-8)

**Skill shows as inactive:**
- Check if it was manually disabled
- Verify no validation errors
- Review skill configuration

**Can't find a skill:**
- Clear all filters
- Check suite and category
- Use search with different terms
