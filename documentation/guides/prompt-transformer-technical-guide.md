# Prompt Transformer Guide

**Version:** 1.0.0
**Last Updated:** Wednesday, February 12, 2026
**Module:** Prompt-to-Asset Pipeline

---

## Overview

The Prompt Transformer is a system for converting raw system prompts into structured assets within the Insight 360 ecosystem. It bridges the gap between freeform prompt engineering and the structured Context Asset and Skill systems.

### Problem Solved

When you craft a system prompt in Claude or another LLM, that prompt lives in isolation. The Prompt Transformer:

1. **Analyzes** the prompt to detect what type of asset it represents
2. **Transforms** it into the appropriate structured format
3. **Stores** it in the right location (Skills, Context Assets, or Agents)
4. **Enables reuse** across the ecosystem

### Supported Output Types

| Type | Description | Storage Location |
|------|-------------|------------------|
| **Claude Skill** | Reusable workflow with triggers and instructions | `.claude/skills/[name]/SKILL.md` |
| **Voice DNA** | Brand voice, tone, and writing style | `context_assets` table (JSON) |
| **ICP** | Ideal Customer Profile / audience segment | `context_assets` table (JSON) |
| **Business Profile** | Company positioning and offerings | `context_assets` table (JSON) |
| **Insight 360 Agent** | AI agent with role and capabilities | `agents` table |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACES                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐    ┌───────────────┐ │
│  │  Prompt Editor   │    │  Claude Skill    │    │  Direct API   │ │
│  │  (Web UI)        │    │  (Higgins)       │    │  Calls        │ │
│  │  /prompt-editor  │    │  prompt-transformer│   │               │ │
│  └────────┬─────────┘    └────────┬─────────┘    └───────┬───────┘ │
│           │                       │                       │         │
└───────────┼───────────────────────┼───────────────────────┼─────────┘
            │                       │                       │
            ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API LAYER                                    │
│                    /api/prompts/*                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  POST /analyze     POST /transform     GET /templates                │
│  POST /batch       GET /history        POST /preview                 │
│                                                                      │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TRANSFORMATION ENGINE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Type Detection    → Score indicators, determine confidence      │
│  2. AI Transformation → Claude extracts structured data             │
│  3. Validation        → Ensure schema compliance                    │
│  4. Storage           → Save to appropriate table/location          │
│                                                                      │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
     ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
     │   skills    │         │context_assets│        │   agents    │
     │   table     │         │   table     │         │   table     │
     └─────────────┘         └─────────────┘         └─────────────┘
```

---

## Usage Methods

### Method 1: Web UI (Prompt Editor)

**URL:** `http://localhost:3000/prompt-editor.html`

1. Navigate to the Prompt Editor
2. Paste your system prompt in the left panel
3. Watch real-time analysis detect the type
4. Select a target type (or use Auto)
5. Click **Transform** (or press `Ctrl+Enter`)
6. Review the structured output
7. Enter a name and click **Save to Insight 360**

**Features:**
- Split-panel layout (input/output)
- Real-time type detection with confidence
- JSON syntax highlighting
- SKILL.md preview for skill outputs
- Transformation history sidebar

### Method 2: Claude Skill (via Higgins)

**Skill:** `prompt-transformer`
**Location:** `.claude/skills/prompt-transformer/SKILL.md`

In any Claude conversation with the skill loaded:

```
User: Transform this prompt into a skill:

You are an email writer. When given a topic:
1. Ask about the audience
2. Draft 3 subject lines
3. Write the email body
4. Add a PS line
```

Higgins will:
1. Analyze the prompt type
2. Confirm the target format
3. Generate the structured output
4. Optionally save it

### Method 3: Direct API

Use the REST API for programmatic access or integration with other systems.

---

## API Reference

### POST /api/prompts/analyze

Analyze a prompt to detect its type.

**Request:**
```json
{
  "prompt": "You are a helpful assistant that writes emails..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "detected_type": "skill",
    "confidence": "high",
    "reasoning": "Found 4 matching indicators for Claude Skill",
    "recommendations": [
      {
        "type": "skill",
        "name": "Claude Skill",
        "confidence": "high",
        "description": "Reusable workflow with triggers and instructions"
      },
      {
        "type": "agent",
        "name": "Insight 360 Agent",
        "confidence": "medium",
        "description": "AI agent with role and capabilities"
      }
    ],
    "prompt_length": 150,
    "word_count": 28
  }
}
```

---

### POST /api/prompts/transform

Transform a prompt into a structured format.

**Request:**
```json
{
  "prompt": "You are an email writer...",
  "target_type": "auto",
  "name_hint": "email-composer",
  "save": false
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | The system prompt to transform (min 20 chars) |
| `target_type` | string | No | `auto`, `skill`, `voice_dna`, `icp`, `business_profile`, `agent` |
| `name_hint` | string | No | Suggested name for the output |
| `save` | boolean | No | If true, saves to database |
| `destination` | string | No | Override default save location |

**Response (save=false):**
```json
{
  "success": true,
  "data": {
    "target_type": "skill",
    "transformed": {
      "name": "email-composer",
      "display_name": "Email Composer",
      "description": "Writes professional emails with subject lines and CTAs. Use when composing emails or user mentions 'write an email'.",
      "overview": "...",
      "triggers": ["write an email", "compose email", "draft email"],
      "instructions": "# Instructions\n\n1. Ask about the target audience...",
      "examples": [...],
      "best_practices": [...]
    },
    "skill_markdown": "---\nname: email-composer\n...",
    "metadata": {
      "original_length": 150,
      "transformation_time_ms": 2340,
      "tokens_used": {
        "input": 200,
        "output": 850
      }
    }
  }
}
```

**Response (save=true):**
```json
{
  "success": true,
  "data": {
    "target_type": "skill",
    "transformed": {...},
    "saved": {
      "id": "uuid-here",
      "table": "skills",
      "name": "email-composer"
    },
    "metadata": {...}
  }
}
```

---

### GET /api/prompts/templates

Get available transformation templates and schemas.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "skill",
      "name": "Claude Skill",
      "description": "Reusable workflow with triggers and instructions",
      "indicators": ["step-by-step", "workflow", ...],
      "schema": null
    },
    {
      "type": "voice_dna",
      "name": "Voice DNA",
      "description": "Brand voice, tone, and writing style guidelines",
      "indicators": ["voice", "tone", ...],
      "schema": {
        "core_identity": {...},
        "personality": {...},
        ...
      }
    }
  ]
}
```

---

### POST /api/prompts/batch

Transform multiple prompts at once.

**Request:**
```json
{
  "prompts": [
    "First prompt here...",
    { "prompt": "Second prompt...", "name_hint": "my-skill" }
  ],
  "target_type": "auto",
  "save": false
}
```

**Limits:** Maximum 10 prompts per batch.

---

### GET /api/prompts/history

Get recent transformation history.

**Query Parameters:**
- `limit` (default: 20)
- `offset` (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "email-composer",
      "type": "skill",
      "created_at": "2025-12-30T10:00:00Z"
    }
  ],
  "count": 5
}
```

---

## Type Detection Logic

### Indicator Patterns

The system analyzes prompt text for indicator patterns:

| Type | Indicators |
|------|------------|
| **Skill** | step-by-step, workflow, process, procedure, when the user, instructions, generate, create |
| **Voice DNA** | voice, tone, personality, style, sound like, never say, always use, writing, communicate |
| **ICP** | audience, customer, user, segment, persona, pain points, goals, challenges, demographics |
| **Business Profile** | company, business, product, service, offering, value proposition, differentiation, positioning |
| **Agent** | you are, your role, agent, assistant, advisor, help the user, respond to, behavior |

### Confidence Scoring

| Matches | Confidence | Recommendation |
|---------|------------|----------------|
| 4+ | High | Auto-transform |
| 2-3 | Medium | Suggest with confirmation |
| 0-1 | Low | Ask user to select |

---

## Output Schemas

### Skill Output

```yaml
name: lowercase-with-hyphens
display_name: Human Readable Name
description: WHAT + WHEN (max 200 chars)
overview: Purpose and value explanation
triggers: [array of trigger phrases]
instructions: Markdown-formatted steps
examples: [{input, output}]
best_practices: [array of do's and don'ts]
allowed_tools: [optional tool restrictions]
required_context_types: []
optional_context_types: []
```

### Voice DNA Output

```json
{
  "core_identity": {
    "who_you_are": "",
    "what_you_do": "",
    "your_angle": ""
  },
  "personality": {
    "traits": [],
    "energy": ""
  },
  "tone": {
    "primary_tone": "",
    "secondary_tone": "",
    "how_formal": 5
  },
  "communication_style": {...},
  "signature_phrases": {...},
  "voice_boundaries": {...},
  "emotional_range": {...},
  "examples": {}
}
```

### ICP Output

```json
{
  "profile_overview": {...},
  "demographics": {...},
  "psychographics": {...},
  "current_state": {...},
  "desired_state": {...},
  "language": {...},
  "objections": {...},
  "behavior": {...}
}
```

### Agent Output

```json
{
  "name": "",
  "slug": "",
  "icon": "",
  "description": "",
  "category": "strategy|operations|creative|technical|support",
  "system_prompt": "",
  "temperature": 0.7,
  "required_context_types": [],
  "optional_context_types": [],
  "tags": []
}
```

---

## Storage Locations

### Skills
- **API Storage:** `skills` table in Supabase
- **File Export:** `.claude/skills/[name]/SKILL.md`
- **Access:** Via Skills dashboard or Claude Code

### Context Assets (Voice DNA, ICP, Business Profile)
- **Storage:** `context_assets` table in Supabase
- **Asset Type Field:** `voice_dna`, `icp`, or `custom_processes`
- **Access:** Via Context Assets dashboard

### Agents
- **Storage:** `agents` table in Supabase
- **Access:** Via Agents dashboard or Chat interface

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Prompt must be at least 20 characters` | Input too short | Provide a more detailed prompt |
| `Invalid target_type` | Unknown type specified | Use: auto, skill, voice_dna, icp, business_profile, agent |
| `AI returned invalid JSON` | Transformation failed | Retry the transformation |
| `Anthropic API key not configured` | Missing API key | Set `ANTHROPIC_API_KEY` in `.env` |

### Error Response Format

```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE"
}
```

---

## Integration with Content Creation System

The Prompt Transformer works alongside the Content Creation System's context architecture:

```
Content Creation System
├── context/
│   └── core/
│       ├── voice-dna-template.json      ← Templates for Voice DNA
│       ├── icp-template.json            ← Templates for ICP
│       └── business-profile-template.json
│
└── .claude/
    └── skills/
        └── prompt-transformer/          ← The Claude Skill
            └── SKILL.md
```

When transforming to Voice DNA, ICP, or Business Profile, the output follows the same JSON schemas used by the Content Creation System, ensuring compatibility.

---

## Best Practices

### Writing Prompts for Better Transformation

1. **Be explicit about structure**
   - Use numbered steps for workflows
   - Use "Never..." and "Always..." for constraints

2. **Include examples**
   - Sample inputs and outputs help extraction

3. **Define triggers clearly**
   - "When the user asks for...", "Activate when..."

4. **Separate concerns**
   - If a prompt does multiple things, consider splitting it

### Reviewing Transformed Output

1. **Check field completeness** - Ensure no important data was lost
2. **Verify constraints** - All "never" and "always" rules captured
3. **Test triggers** - For skills, ensure activation works
4. **Validate JSON** - For context assets, ensure valid structure

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Transform prompt |
| `Esc` | Close history sidebar |

---

## Related Documentation

- [Prompt Transformation Rules](./prompt-transformation-rules.md) - Detailed extraction and template rules
- [Skills System](./skills/) - Full skills documentation
- [Context Assets](./phase3/) - Context asset schemas and API
- [Agents](./agents/) - Agent configuration and management

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-30 | Initial release |
