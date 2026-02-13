# Prompt Transformer User Guide

**For:** Insight 360 Users
**Last Updated:** Wednesday, February 12, 2026

---

## Why the Transformer Is Important

System prompts are the foundation of how AI assistants behave. When you craft a prompt that works well—one that captures the right tone, follows the right steps, or understands your audience—that knowledge is valuable. But too often, these prompts live in isolation: copied into chat windows, lost in documents, or scattered across different tools.

The Prompt Transformer solves this problem by **converting your system prompts into reusable, structured assets** that integrate with the Insight 360 ecosystem:

- **Eliminate duplication**: Transform a prompt once, use it everywhere
- **Ensure consistency**: Structured formats enforce best practices
- **Enable discovery**: Assets are searchable and shareable across your team
- **Accelerate development**: Build agents, skills, and context profiles from existing work
- **Preserve institutional knowledge**: Your prompt engineering expertise becomes a permanent asset

Without the Transformer, you would need to manually restructure prompts each time you want to use them differently. With it, a single prompt can become a Claude Skill, a Voice DNA profile, or an Insight 360 Agent—automatically formatted and ready to use.

---

## What It Does

The Prompt Transformer analyzes your system prompts and converts them into one of four structured output types:

| Output Type | What It Creates | Use Case |
|-------------|-----------------|----------|
| **Claude Skill** | A reusable workflow in Markdown format | Automating multi-step tasks in Claude Code |
| **Voice DNA** | A JSON profile of communication style | Maintaining consistent brand voice across content |
| **ICP (Ideal Customer Profile)** | A JSON profile of target audience | Tailoring messaging to specific customer segments |
| **Insight 360 Agent** | A configured AI agent | Creating specialized assistants in the Command Center |

### How It Works

1. **Analysis**: The system scans your prompt for signal patterns (like "step-by-step" for workflows or "voice" for tone guidelines)
2. **Detection**: It determines the most likely output type with a confidence score
3. **Transformation**: Claude extracts structured data and formats it according to the target schema
4. **Validation**: The output is checked for completeness and correctness
5. **Storage**: You can save directly to Skills, Context Assets, or Agents in Insight 360

---

## Step by Step Use

### Accessing the Transformer

1. Open Insight 360 in your browser: `http://localhost:3000`
2. Click **Prompt Transformer** in the left sidebar under the **AI 360 Systems** section
3. You'll see a split-panel interface: input on the left, output on the right

### Transforming a Prompt

**Step 1: Paste Your Prompt**

In the left panel, paste your system prompt into the text area. For example:

```
You are a professional email writer. When the user provides a topic:
1. Ask about the target audience and desired tone
2. Suggest 3 compelling subject lines
3. Draft the email body with a clear call-to-action
4. Add a memorable P.S. line

Always be conversational but professional. Never use "Dear Sir/Madam" or generic greetings.
```

**Step 2: Review the Analysis**

As you type, the system automatically analyzes your prompt:
- A **detected type** badge appears (e.g., "Claude Skill")
- A **confidence level** shows how certain the detection is (High, Medium, Low)
- A **word count** helps you track prompt length

**Step 3: Select Target Type**

Choose your desired output format using the buttons below the input:
- **Auto** (recommended): Let the system choose based on analysis
- **Skill**: Force output as a Claude Skill
- **Voice**: Force output as Voice DNA
- **ICP**: Force output as Ideal Customer Profile
- **Agent**: Force output as Insight 360 Agent

**Step 4: Transform**

Click the **Transform** button (or press `Ctrl+Enter` / `Cmd+Enter`).

The right panel will display:
- **Preview/JSON tab**: The structured output with syntax highlighting
- **SKILL.md tab** (for skills only): The formatted Markdown file

**Step 5: Review the Output**

Examine the transformed result:
- Verify all important information was captured
- Check that constraints ("never", "always" rules) are preserved
- Confirm the name and description are accurate

**Step 6: Save to Insight 360**

1. Enter a name in the text field at the bottom of the output panel
2. Click **Save to Insight 360**
3. The asset is now stored in the appropriate location:
   - Skills → `skills` table
   - Voice DNA/ICP → `context_assets` table
   - Agents → `agents` table

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` or `Cmd+Enter` | Transform the prompt |
| `Escape` | Close the history sidebar |

### Viewing History

Click the **History** button in the top-right to see your recent transformations. Click any item to view its details.

---

## Tips for Best Results

### Write Clear, Structured Prompts

The Transformer works best with well-organized input:

**Good example:**
```
You are a technical documentation writer.

## When to Use
- User asks for documentation
- User mentions "write docs" or "document this"

## Instructions
1. Ask what needs to be documented
2. Determine the audience (developers, end-users, admins)
3. Write the documentation with appropriate detail level

## Rules
- Always include code examples for technical content
- Never assume prior knowledge without checking
```

**Less effective:**
```
write good documentation when asked, make it technical but not too technical, include examples sometimes
```

### Use Signal Words

Include keywords that help detection:
- For Skills: "step-by-step", "workflow", "when the user", "instructions"
- For Voice: "tone", "voice", "style", "never say", "always use"
- For ICP: "audience", "customer", "pain points", "demographics"
- For Agents: "you are", "your role", "help the user", "respond to"

### Review Before Saving

Always check the transformed output before saving. The AI extraction is good but not perfect—verify that:
- Names follow conventions (lowercase-with-hyphens for skills)
- No placeholder text remains
- Critical rules weren't lost in transformation

---

## Related Documentation

| Document | Description | Location |
|----------|-------------|----------|
| Prompt Transformer Technical Guide | Full technical documentation with API reference | [prompt-transformer-technical-guide.md](./prompt-transformer-technical-guide.md) |
| Agent Configuration | Setting up and managing agents | [agents-user-guide.md](./agents-user-guide.md) |

---

## Need Help?

- **API Issues**: Check the server console for error messages
- **Transformation Problems**: Try selecting a specific target type instead of Auto
- **Missing Fields**: Ensure your prompt contains enough detail for extraction

For additional support, visit the Insight 360 documentation or check the system health dashboard.
