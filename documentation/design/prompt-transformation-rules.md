# Prompt Transformation Rules & Templates

## Overview

The Prompt Transformer system converts raw system prompts into structured formats for the Insight 360 ecosystem. This document defines the transformation rules, detection logic, and output templates.

## Type Detection Algorithm

### Signal Patterns

Each output type has associated signal patterns. The detection algorithm counts matches and ranks confidence:

```javascript
PROMPT_TYPES = {
    skill: {
        indicators: [
            'step-by-step', 'workflow', 'process', 'procedure',
            'when the user', 'instructions', 'generate', 'create'
        ],
        weight: 1.0
    },
    voice_dna: {
        indicators: [
            'voice', 'tone', 'personality', 'style', 'sound like',
            'never say', 'always use', 'writing', 'communicate'
        ],
        weight: 1.0
    },
    icp: {
        indicators: [
            'audience', 'customer', 'user', 'segment', 'persona',
            'pain points', 'goals', 'challenges', 'demographics'
        ],
        weight: 1.0
    },
    business_profile: {
        indicators: [
            'company', 'business', 'product', 'service', 'offering',
            'value proposition', 'differentiation', 'positioning'
        ],
        weight: 1.0
    },
    agent: {
        indicators: [
            'you are', 'your role', 'agent', 'assistant', 'advisor',
            'help the user', 'respond to', 'behavior'
        ],
        weight: 1.0
    }
}
```

### Confidence Levels

| Score | Confidence | Action |
|-------|------------|--------|
| 4+ matches | High | Auto-transform recommended |
| 2-3 matches | Medium | Suggest type, ask confirmation |
| 0-1 matches | Low | Ask user to select type |

### Disambiguation Rules

When multiple types score similarly:

1. If `skill` and `agent` both high: Check for step-by-step structure
   - Has numbered steps → Skill
   - Has role definition without steps → Agent

2. If `voice_dna` and `business_profile` both high: Check for content focus
   - Focuses on HOW to communicate → Voice DNA
   - Focuses on WHAT to communicate → Business Profile

3. If `icp` and `business_profile` both high:
   - Focuses on customer characteristics → ICP
   - Focuses on company positioning → Business Profile

## Output Templates

### 1. Claude Skill Template

**Structure:**
```markdown
---
name: {lowercase-with-hyphens}
description: {WHAT + WHEN, max 200 chars}
allowed-tools: {optional, comma-separated}
---

# {Display Name}

## Overview
{1-2 paragraphs explaining purpose and value}

## When to Use This Skill
{Bullet list of trigger scenarios}

## Instructions
{Numbered steps, can include sub-steps}

## Examples
### Example 1
**Input:** {sample request}
**Output:** {sample response}

## Best Practices
{Bullet list of do's and don'ts}

## Version History
- v1.0.0 (YYYY-MM-DD): Transformed from system prompt
```

**Field Extraction Rules:**

| Field | Extraction Source |
|-------|-------------------|
| name | Extract main action + target, or use user hint |
| description | Summarize purpose + extract trigger phrases |
| instructions | Find numbered lists, step-by-step sections |
| examples | Extract if present, otherwise generate from context |
| best_practices | Extract "always", "never", "avoid", "use" statements |
| allowed_tools | Infer from mentioned capabilities (read files → Read tool) |

**Naming Conventions:**
- Pattern: `{action}-{target}` or `{noun}-generator`
- Examples: `email-composer`, `code-reviewer`, `report-generator`
- Maximum 64 characters, lowercase with hyphens only

---

### 2. Voice DNA Template

**Structure:**
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
  "communication_style": {
    "sentence_length": "short|mixed|long",
    "paragraph_style": "punchy|flowing|mixed",
    "uses_questions": true,
    "uses_lists": true,
    "thought_progression": ""
  },
  "signature_phrases": {
    "opener_phrases": [],
    "transition_phrases": [],
    "emphasis_phrases": [],
    "closer_phrases": []
  },
  "voice_boundaries": {
    "never_sounds_like": [],
    "never_uses_phrases": [],
    "avoids_topics": []
  },
  "emotional_range": {
    "primary_emotions": [],
    "how_you_show_enthusiasm": "",
    "how_you_show_frustration": "",
    "how_you_build_trust": ""
  },
  "examples": {}
}
```

**Field Extraction Rules:**

| Field | Pattern to Find |
|-------|-----------------|
| traits | Adjectives describing communication style |
| primary_tone | "tone should be...", "speak in a... manner" |
| never_sounds_like | "don't sound like...", "avoid being..." |
| never_uses_phrases | "never say...", "avoid phrases like..." |
| sentence_length | Infer from prompt's own sentence structure |
| formality | Scale 1-10 based on language used |

---

### 3. ICP (Ideal Customer Profile) Template

**Structure:**
```json
{
  "profile_overview": {
    "name": "",
    "one_line_description": "",
    "why_they_follow_you": ""
  },
  "demographics": {
    "job_titles": [],
    "industries": [],
    "experience_level": "",
    "business_stage": "",
    "location": ""
  },
  "psychographics": {
    "values": { "list": [] },
    "frustrations": { "list": [] },
    "fears": { "list": [] },
    "aspirations": { "list": [] }
  },
  "current_state": {
    "what_theyve_tried": [],
    "why_it_hasnt_worked": [],
    "current_pain": ""
  },
  "desired_state": {
    "dream_outcome": "",
    "what_success_looks_like": "",
    "how_theyd_feel": ""
  },
  "language": {
    "how_they_describe_their_problem": [],
    "phrases_they_use": [],
    "words_that_resonate": [],
    "words_that_turn_them_off": []
  },
  "objections": {
    "common_objections": [],
    "what_they_need_to_believe": [],
    "what_convinces_them": []
  },
  "behavior": {
    "where_they_hang_out": [],
    "how_they_learn": [],
    "content_preferences": "",
    "decision_making_style": ""
  }
}
```

**Field Extraction Rules:**

| Field | Pattern to Find |
|-------|-----------------|
| job_titles | Roles mentioned, positions, titles |
| industries | Sectors, verticals, markets |
| frustrations | "frustrated by...", "tired of...", "struggling with..." |
| fears | "afraid of...", "worried about...", "concerned that..." |
| aspirations | "want to...", "goal is...", "dream of..." |
| phrases_they_use | Quoted customer language |

---

### 4. Business Profile Template

**Structure:**
```json
{
  "overview": {
    "business_name": "",
    "what_you_do": "",
    "who_you_serve": "",
    "primary_transformation": ""
  },
  "positioning": {
    "unique_angle": "",
    "what_makes_you_different": [],
    "your_philosophy": "",
    "your_methodology": ""
  },
  "offerings": {
    "free_offerings": [],
    "paid_offerings": []
  },
  "content_focus": {
    "main_topics": [],
    "subtopics": [],
    "topics_you_avoid": []
  },
  "brand_voice_in_business_context": {
    "how_you_mention_offerings": "",
    "cta_style": "",
    "sales_philosophy": ""
  },
  "social_proof": {
    "credentials": [],
    "results_achieved": [],
    "notable_clients_or_features": []
  },
  "links": {}
}
```

---

### 5. Insight 360 Agent Template

**Structure:**
```json
{
  "name": "",
  "slug": "",
  "icon": "",
  "description": "",
  "category": "strategy|operations|creative|technical|support",
  "is_active": true,
  "system_prompt": "",
  "model": "claude-sonnet-4-5-20250929",
  "temperature": 0.7,
  "max_tokens": 4096,
  "skill_id": null,
  "required_context_types": [],
  "optional_context_types": [],
  "tags": [],
  "metadata": {
    "source": "prompt-transformer",
    "original_prompt_length": 0,
    "transformation_date": ""
  }
}
```

**Field Extraction Rules:**

| Field | Extraction Logic |
|-------|-----------------|
| name | Extract role name from "You are..." statement |
| icon | Match role to emoji (advisor→🎯, writer→✍️, etc.) |
| category | Infer from role type |
| system_prompt | Clean and optimize the original prompt |
| temperature | Higher for creative roles, lower for analytical |
| required_context_types | Infer from what info the agent needs |

**Category Mapping:**
- Strategy: advisor, strategist, consultant, planner
- Operations: manager, coordinator, scheduler, organizer
- Creative: writer, designer, copywriter, content creator
- Technical: developer, engineer, analyst, architect
- Support: helper, assistant, guide, responder

**Icon Mapping:**
- 🎯 Strategy/Goals
- 📊 Analytics/Data
- ✍️ Writing/Content
- 🤝 Collaboration
- 💡 Ideas/Innovation
- 🔧 Technical
- 📋 Planning
- 🎨 Creative

---

## Transformation Quality Rules

### Must Preserve

1. **Intent**: The transformed output must accomplish the same goal
2. **Constraints**: All "never", "always", "must" rules must be captured
3. **Triggers**: When/how to activate must be clear
4. **Examples**: If present in original, include in output

### Must NOT Include

1. **Invented data**: Don't assume or create information
2. **Generic content**: Avoid placeholder-quality text
3. **Redundancy**: Don't repeat the same concept multiple ways

### Quality Checks

Before finalizing any transformation:

- [ ] All required fields populated
- [ ] No placeholder text (e.g., "[insert here]")
- [ ] Format matches schema exactly
- [ ] JSON is valid (for JSON outputs)
- [ ] Markdown is well-formed (for SKILL.md)
- [ ] Name follows conventions
- [ ] Description is actionable

---

## API Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "target_type": "skill",
    "transformed": { ... },
    "metadata": {
      "original_length": 500,
      "transformation_time_ms": 1234,
      "tokens_used": {
        "input": 200,
        "output": 800
      }
    }
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Prompt must be at least 20 characters",
  "code": "PROMPT_TOO_SHORT"
}
```

---

## Version History

- v1.0.0 (2025-12-30): Initial specification
