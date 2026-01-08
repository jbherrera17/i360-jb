-- ============================================
-- Insight 360 - Skill: Brand Guidelines Generator
-- Version: 1.0.0
-- Date: January 2026
-- Description: Creates brand_guidelines context asset from user input
-- ============================================

-- Insert the skill
INSERT INTO skills (
    id,
    user_id,
    name,
    display_name,
    description,
    icon,
    color,
    category,
    suite,
    tags,
    instructions,
    output_format,
    required_context_types,
    optional_context_types,
    context_token_budget,
    trigger_phrases,
    conversation_starters,
    examples,
    templates,
    version,
    visibility,
    status,
    is_featured
) VALUES (
    'a1b2c3d4-0001-4000-8000-000000000001',
    NULL, -- System skill, no user owner
    'brand-guidelines-generator',
    'Brand Guidelines Generator',
    'Creates a comprehensive brand_guidelines context asset by gathering brand colors, typography, voice, and visual identity information. The output can be saved as a context asset for use in content creation workflows.',
    'palette',
    '#8b5cf6',
    'workflow',
    'align',
    ARRAY['brand', 'guidelines', 'identity', 'design', 'colors', 'typography'],
    E'# Brand Guidelines Generator

## Purpose
This skill helps you create a comprehensive brand guidelines context asset by gathering and organizing your brand identity elements. The resulting asset can be used across content creation, presentations, documents, and other workflows to ensure brand consistency.

## When to Use
- Setting up a new client or organization in the system
- Creating brand guidelines from scratch
- Documenting existing brand standards
- Preparing for the Thought Leadership workflow (prerequisite)

## Information Gathering Process

### Step 1: Core Brand Identity
Gather the following information from the user:

**Brand Name & Tagline**
- Official brand/company name
- Tagline or slogan (if any)
- Any alternative names or abbreviations

**Brand Story**
- Origin story (1-2 sentences)
- Mission statement
- Vision statement
- Core purpose

### Step 2: Visual Identity - Colors

**Primary Colors** (1-3 colors)
For each color, collect:
- Color name (e.g., "Brand Blue")
- Hex code (e.g., #1a73e8)
- RGB values
- Usage context (backgrounds, text, accents)

**Secondary Colors** (2-4 colors)
Same details as primary

**Accent Colors** (1-3 colors)
Same details as primary

**Neutral Colors**
- Dark color for text
- Light color for backgrounds
- Mid-tone for secondary elements

### Step 3: Visual Identity - Typography

**Primary Font (Headings)**
- Font family name
- Fallback fonts (web-safe)
- Weight recommendations
- Size scale (H1, H2, H3, H4)

**Secondary Font (Body)**
- Font family name
- Fallback fonts
- Weight for body text
- Line height recommendation

**Optional: Accent Font**
- For special uses (quotes, callouts)

### Step 4: Brand Voice & Tone

**Voice Attributes** (select 3-5)
Examples: Professional, Friendly, Authoritative, Innovative, Warm, Bold, Thoughtful, Direct, Conversational, Technical

**Tone Guidelines**
- How formal/informal?
- Use of humor?
- First person (we) vs third person?
- Technical language level?

**Writing Style**
- Sentence length preference
- Active vs passive voice
- Contractions allowed?
- Key phrases or terminology to use/avoid

### Step 5: Logo & Visual Elements

**Logo Specifications**
- Primary logo description
- Logo variations (horizontal, stacked, icon only)
- Minimum clear space rules
- Minimum size requirements

**Visual Style**
- Photography style (candid, staged, abstract, etc.)
- Illustration style (if applicable)
- Icon style (outlined, filled, rounded, etc.)
- Preferred image treatments

### Step 6: Usage Guidelines

**Do''s**
- List of approved uses and best practices

**Don''ts**
- Common mistakes to avoid
- Prohibited uses

## Output Generation

After gathering all information, generate the brand guidelines in the following JSON structure for the context asset:

```json
{
  "brand_identity": {
    "name": "Brand Name",
    "tagline": "Tagline here",
    "mission": "Mission statement",
    "vision": "Vision statement",
    "story": "Brief origin story"
  },
  "colors": {
    "primary": [
      {"name": "Brand Blue", "hex": "#1a73e8", "rgb": "26, 115, 232", "usage": "Primary buttons, links, headers"}
    ],
    "secondary": [],
    "accent": [],
    "neutral": {
      "dark": {"name": "Charcoal", "hex": "#333333"},
      "light": {"name": "Off White", "hex": "#fafafa"},
      "mid": {"name": "Gray", "hex": "#888888"}
    }
  },
  "typography": {
    "headings": {
      "family": "Poppins",
      "fallback": "Arial, sans-serif",
      "weights": ["600", "700"],
      "scale": {
        "h1": "36px",
        "h2": "28px",
        "h3": "22px",
        "h4": "18px"
      }
    },
    "body": {
      "family": "Inter",
      "fallback": "Helvetica, sans-serif",
      "weight": "400",
      "lineHeight": "1.6"
    },
    "accent": null
  },
  "voice": {
    "attributes": ["Professional", "Warm", "Authoritative"],
    "tone": {
      "formality": "professional but approachable",
      "humor": "subtle, appropriate",
      "person": "first person plural (we)",
      "technicality": "accessible, avoid jargon"
    },
    "style": {
      "sentenceLength": "varied, mostly medium",
      "voice": "active",
      "contractions": true,
      "keyPhrases": [],
      "avoidPhrases": []
    }
  },
  "visual": {
    "logo": {
      "description": "Description of primary logo",
      "variations": ["horizontal", "stacked", "icon"],
      "clearSpace": "Minimum 20px around logo",
      "minSize": "100px width minimum"
    },
    "imagery": {
      "photography": "authentic, candid moments",
      "illustration": "modern, minimal line art",
      "icons": "outlined, rounded corners"
    }
  },
  "guidelines": {
    "dos": [
      "Maintain consistent spacing",
      "Use brand colors for all primary elements"
    ],
    "donts": [
      "Don''t stretch or distort the logo",
      "Don''t use off-brand colors"
    ]
  },
  "metadata": {
    "version": "1.0",
    "created": "2026-01-07",
    "lastUpdated": "2026-01-07"
  }
}
```

## Conversation Flow

1. **Introduction**: Explain what we''re building and why
2. **Gather each section**: Ask focused questions for each category
3. **Confirm as you go**: Summarize each section before moving on
4. **Generate output**: Create the JSON structure
5. **Save prompt**: Offer to save as a context asset

## Tips for Gathering Information

- If user doesn''t have formal guidelines, help them make decisions
- Suggest industry-appropriate defaults when needed
- For colors, offer to analyze their website or existing materials
- Be flexible - not all sections are required for MVP
- Prioritize: Colors and Typography are most critical for automated outputs',
    E'## Output Format

The skill produces a brand_guidelines context asset with the following structure:

### JSON Schema
```json
{
  "brand_identity": {...},
  "colors": {
    "primary": [...],
    "secondary": [...],
    "accent": [...],
    "neutral": {...}
  },
  "typography": {
    "headings": {...},
    "body": {...}
  },
  "voice": {
    "attributes": [...],
    "tone": {...},
    "style": {...}
  },
  "visual": {...},
  "guidelines": {
    "dos": [...],
    "donts": [...]
  }
}
```

### Plain Text Version
A human-readable summary of all brand guidelines for quick reference and AI context injection.',
    ARRAY[]::TEXT[], -- No required context (this creates context)
    ARRAY['company_description', 'core_values', 'voice_dna']::TEXT[], -- Optional: can enhance from existing
    8000,
    ARRAY[
        'create brand guidelines',
        'set up brand',
        'brand identity',
        'brand colors',
        'brand setup',
        'visual identity',
        'style guide'
    ],
    ARRAY[
        'Help me create brand guidelines for my company',
        'I need to set up brand standards',
        'Create a style guide for our brand',
        'Let''s define our brand identity'
    ],
    '[
        {
            "input": "I need brand guidelines for a tech startup called NovaTech. We want to look modern and trustworthy.",
            "output": "I''ll help you create comprehensive brand guidelines for NovaTech. Let''s start with your colors - for a modern, trustworthy tech brand, I''d suggest a primary blue (#2563eb) paired with a clean gray palette. For typography, a sans-serif like Inter for body and a geometric font like Poppins for headings would reinforce the modern feel. Shall I walk through each section?"
        }
    ]'::JSONB,
    '[
        {
            "name": "Minimal Brand Guidelines",
            "content": "Quick setup with just colors, fonts, and basic voice guidelines - perfect for getting started fast."
        },
        {
            "name": "Full Brand Guidelines",
            "content": "Comprehensive brand identity including all visual, voice, and usage guidelines."
        }
    ]'::JSONB,
    '1.0.0',
    'public',
    'active',
    true
)
ON CONFLICT (user_id, name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    instructions = EXCLUDED.instructions,
    output_format = EXCLUDED.output_format,
    updated_at = NOW();

-- Create initial version record
INSERT INTO skill_versions (
    id,
    skill_id,
    version_number,
    version_label,
    instructions,
    output_format,
    required_context_types,
    optional_context_types,
    examples,
    templates,
    change_summary
) VALUES (
    'b1b2c3d4-0001-4000-8000-000000000001',
    'a1b2c3d4-0001-4000-8000-000000000001',
    1,
    '1.0.0',
    (SELECT instructions FROM skills WHERE id = 'a1b2c3d4-0001-4000-8000-000000000001'),
    (SELECT output_format FROM skills WHERE id = 'a1b2c3d4-0001-4000-8000-000000000001'),
    ARRAY[]::TEXT[],
    ARRAY['company_description', 'core_values', 'voice_dna']::TEXT[],
    '[{"input": "I need brand guidelines for a tech startup", "output": "I''ll help you create comprehensive brand guidelines..."}]'::JSONB,
    '[]'::JSONB,
    'Initial release - comprehensive brand guidelines generator'
)
ON CONFLICT (skill_id, version_number) DO NOTHING;

-- Output success message
DO $$
BEGIN
    RAISE NOTICE 'Brand Guidelines Generator skill created successfully';
END $$;
