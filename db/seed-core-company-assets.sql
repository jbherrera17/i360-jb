-- ============================================================
-- INSIGHT 360 - CORE COMPANY ASSETS (Template Data)
-- Foundational context assets for all actions
-- Run AFTER: phase4.2-integrity-fixes.sql, seed-asset-types.sql
-- ============================================================

-- ============================================================
-- TEMPLATE USER FOR SYSTEM ASSETS
-- These are public template assets users can clone
-- ============================================================

-- Note: These assets use user_id = NULL to indicate system templates
-- Users will clone and customize these for their own use

-- ============================================================
-- 1. COMPANY DESCRIPTION (Template)
-- ============================================================
INSERT INTO context_assets (
    id, user_id, asset_type, name, description,
    content_json, content_text, visibility, tags
) VALUES (
    'ca000000-0000-0000-0001-000000000001',
    NULL,
    'company_description',
    'Company Profile Template',
    'Template for company description - customize with your organization details',
    '{
        "company_name": "[Your Company Name]",
        "tagline": "[Your tagline - what you do in one line]",
        "mission": "[Why you exist - your purpose beyond profit]",
        "vision": "[What the world looks like when you succeed]",
        "history": "[Brief founding story and key milestones]",
        "founding_year": 2020,
        "headquarters": "[City, State/Country]",
        "team_size": "[e.g., 10-50 employees]",
        "key_milestones": [
            "[First major milestone]",
            "[Second major milestone]",
            "[Recent achievement]"
        ]
    }'::jsonb,
    'Company: [Your Company Name]
Tagline: [Your tagline]
Mission: [Your mission statement]
Vision: [Your vision statement]
Founded: [Year] in [Location]
Team Size: [Size]

Key Milestones:
- [Milestone 1]
- [Milestone 2]
- [Milestone 3]',
    'public',
    ARRAY['template', 'core', 'foundation']
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================================
-- 2. CORE VALUES (Template)
-- ============================================================
INSERT INTO context_assets (
    id, user_id, asset_type, name, description,
    content_json, content_text, visibility, tags
) VALUES (
    'ca000000-0000-0000-0001-000000000002',
    NULL,
    'core_values',
    'Core Values Template',
    'Template for organizational core values - the principles that guide decisions',
    '{
        "values": [
            {
                "name": "Integrity",
                "description": "We do what we say and say what we do. Our word is our bond.",
                "behaviors": [
                    "Keep commitments even when inconvenient",
                    "Admit mistakes quickly and openly",
                    "Give honest feedback with kindness"
                ],
                "anti_behaviors": [
                    "Making promises we cannot keep",
                    "Hiding problems or bad news",
                    "Blaming others for our mistakes"
                ]
            },
            {
                "name": "Customer Obsession",
                "description": "We start with the customer and work backwards. Their success is our success.",
                "behaviors": [
                    "Listen more than we speak",
                    "Solve root causes, not just symptoms",
                    "Go above and beyond expectations"
                ],
                "anti_behaviors": [
                    "Prioritizing internal convenience over customer needs",
                    "Ignoring customer feedback",
                    "Making excuses instead of solutions"
                ]
            },
            {
                "name": "Continuous Improvement",
                "description": "We are never done getting better. Every day is an opportunity to improve.",
                "behaviors": [
                    "Seek feedback actively",
                    "Learn from failures without blame",
                    "Share knowledge generously"
                ],
                "anti_behaviors": [
                    "Settling for good enough",
                    "Defending the status quo",
                    "Hoarding knowledge or expertise"
                ]
            }
        ]
    }'::jsonb,
    'CORE VALUES

1. INTEGRITY
We do what we say and say what we do. Our word is our bond.
- Keep commitments even when inconvenient
- Admit mistakes quickly and openly
- Give honest feedback with kindness
NOT: Making promises we cannot keep, hiding problems, blaming others

2. CUSTOMER OBSESSION
We start with the customer and work backwards. Their success is our success.
- Listen more than we speak
- Solve root causes, not just symptoms
- Go above and beyond expectations
NOT: Prioritizing internal convenience, ignoring feedback, making excuses

3. CONTINUOUS IMPROVEMENT
We are never done getting better. Every day is an opportunity to improve.
- Seek feedback actively
- Learn from failures without blame
- Share knowledge generously
NOT: Settling for good enough, defending status quo, hoarding knowledge',
    'public',
    ARRAY['template', 'core', 'foundation', 'values', 'integrity']
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================================
-- 3. VOICE DNA (Template)
-- ============================================================
INSERT INTO context_assets (
    id, user_id, asset_type, name, description,
    content_json, content_text, visibility, tags
) VALUES (
    'ca000000-0000-0000-0001-000000000003',
    NULL,
    'voice_dna',
    'Brand Voice Template',
    'Template for brand voice and tone guidelines',
    '{
        "brand_name": "[Your Brand]",
        "personality_traits": [
            "Confident but not arrogant",
            "Helpful and approachable",
            "Expert without being condescending",
            "Warm but professional"
        ],
        "tone": "Conversational yet authoritative - like a trusted advisor who happens to be brilliant at what they do",
        "writing_style": {
            "sentence_length": "Mix of short punchy sentences and longer explanatory ones",
            "vocabulary_level": "Accessible to business professionals, avoid jargon",
            "perspective": "We/you (collaborative), occasionally I for personal stories"
        },
        "do": [
            "Use active voice",
            "Lead with value, not features",
            "Include specific examples and numbers",
            "Ask thoughtful questions",
            "Acknowledge complexity before simplifying"
        ],
        "dont": [
            "Use buzzwords or empty jargon",
            "Be preachy or lecture",
            "Hedge excessively (avoid too many maybes)",
            "Use passive aggressive tone",
            "Overclaim or overpromise"
        ],
        "signature_phrases": [
            "Here''s the thing...",
            "Let me show you...",
            "The bottom line is..."
        ],
        "avoid_phrases": [
            "Best in class",
            "Synergy",
            "Low-hanging fruit",
            "Move the needle",
            "At the end of the day"
        ]
    }'::jsonb,
    'BRAND VOICE: [Your Brand]

PERSONALITY
- Confident but not arrogant
- Helpful and approachable
- Expert without being condescending
- Warm but professional

TONE
Conversational yet authoritative - like a trusted advisor who happens to be brilliant at what they do.

WRITING STYLE
- Sentence length: Mix of short punchy and longer explanatory
- Vocabulary: Accessible to business professionals, avoid jargon
- Perspective: We/you (collaborative)

DO:
- Use active voice
- Lead with value, not features
- Include specific examples and numbers
- Ask thoughtful questions
- Acknowledge complexity before simplifying

DO NOT:
- Use buzzwords or empty jargon
- Be preachy or lecture
- Hedge excessively
- Use passive aggressive tone
- Overclaim or overpromise

SIGNATURE PHRASES: "Here''s the thing...", "Let me show you...", "The bottom line is..."
AVOID: "Best in class", "Synergy", "Low-hanging fruit", "Move the needle"',
    'public',
    ARRAY['template', 'core', 'voice', 'brand', 'content']
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================================
-- 4. IDEAL CUSTOMER PROFILE (Template)
-- ============================================================
INSERT INTO context_assets (
    id, user_id, asset_type, name, description,
    content_json, content_text, visibility, tags
) VALUES (
    'ca000000-0000-0000-0001-000000000004',
    NULL,
    'icp',
    'Ideal Customer Profile Template',
    'Template for defining your ideal customer segments',
    '{
        "segments": [
            {
                "name": "Growth-Stage B2B SaaS",
                "priority": 1,
                "demographics": {
                    "company_size": "50-500 employees",
                    "revenue_range": "$5M - $50M ARR",
                    "industries": ["Technology", "Software", "Professional Services"],
                    "geography": "North America, UK, Australia"
                },
                "psychographics": {
                    "values": [
                        "Speed and agility over perfection",
                        "Data-driven decision making",
                        "Customer success as growth driver"
                    ],
                    "motivations": [
                        "Scale without losing quality",
                        "Compete with larger players",
                        "Build sustainable competitive advantage"
                    ],
                    "fears": [
                        "Growing too fast and breaking things",
                        "Being outpaced by competitors",
                        "Losing company culture during growth"
                    ]
                },
                "pain_points": [
                    "Manual processes that dont scale",
                    "Inconsistent quality as team grows",
                    "Difficulty maintaining brand voice across channels"
                ],
                "goals": [
                    "10x output without 10x headcount",
                    "Maintain quality at scale",
                    "Build repeatable, consistent processes"
                ],
                "objections": [
                    "We''ve tried AI tools before and they didnt work",
                    "Our industry/content is too specialized",
                    "We dont have time to train another tool"
                ],
                "buying_triggers": [
                    "New funding round with growth targets",
                    "Marketing team overwhelmed and burnt out",
                    "Competitors using AI effectively"
                ]
            }
        ]
    }'::jsonb,
    'IDEAL CUSTOMER PROFILE

SEGMENT 1: Growth-Stage B2B SaaS (Priority: Primary)

DEMOGRAPHICS
- Company size: 50-500 employees
- Revenue: $5M - $50M ARR
- Industries: Technology, Software, Professional Services
- Geography: North America, UK, Australia

PSYCHOGRAPHICS
Values:
- Speed and agility over perfection
- Data-driven decision making
- Customer success as growth driver

Motivations:
- Scale without losing quality
- Compete with larger players
- Build sustainable competitive advantage

Fears:
- Growing too fast and breaking things
- Being outpaced by competitors
- Losing company culture during growth

PAIN POINTS
- Manual processes that dont scale
- Inconsistent quality as team grows
- Difficulty maintaining brand voice across channels

GOALS
- 10x output without 10x headcount
- Maintain quality at scale
- Build repeatable, consistent processes

COMMON OBJECTIONS
- "We''ve tried AI tools before and they didnt work"
- "Our industry/content is too specialized"
- "We dont have time to train another tool"

BUYING TRIGGERS
- New funding round with growth targets
- Marketing team overwhelmed and burnt out
- Competitors using AI effectively',
    'public',
    ARRAY['template', 'core', 'icp', 'sales', 'marketing']
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================================
-- 5. WHY WE WIN (Template)
-- ============================================================
INSERT INTO context_assets (
    id, user_id, asset_type, name, description,
    content_json, content_text, visibility, tags
) VALUES (
    'ca000000-0000-0000-0001-000000000005',
    NULL,
    'why_we_win',
    'Competitive Differentiation Template',
    'Template for articulating why customers choose you over alternatives',
    '{
        "value_proposition": "We help [target customer] achieve [desired outcome] through [unique approach], unlike [alternatives] that [their limitation].",
        "differentiators": [
            "[Differentiator 1]: We do X differently because of Y, which means Z for customers",
            "[Differentiator 2]: While others focus on A, we focus on B because it delivers C",
            "[Differentiator 3]: Our unique background in X enables us to Y better than anyone"
        ],
        "competitive_advantages": [
            "Deep domain expertise in [your specialty]",
            "Proprietary methodology/technology for [key capability]",
            "Track record of [specific measurable results]",
            "Team with [unique qualifications or experience]"
        ],
        "proof_points": [
            "[X]% improvement in [key metric] for [customer type]",
            "[Number] customers have achieved [specific result]",
            "Featured in [publication] for [achievement]",
            "Trusted by [notable customer or category]"
        ],
        "key_stats": {
            "customers_served": "[Number]",
            "average_result": "[Metric and improvement]",
            "time_to_value": "[How quickly customers see results]",
            "satisfaction_score": "[NPS or CSAT]"
        }
    }'::jsonb,
    'WHY WE WIN

VALUE PROPOSITION
We help [target customer] achieve [desired outcome] through [unique approach], unlike [alternatives] that [their limitation].

KEY DIFFERENTIATORS
1. [Differentiator 1]: We do X differently because of Y, which means Z for customers
2. [Differentiator 2]: While others focus on A, we focus on B because it delivers C
3. [Differentiator 3]: Our unique background in X enables us to Y better than anyone

COMPETITIVE ADVANTAGES
- Deep domain expertise in [your specialty]
- Proprietary methodology/technology for [key capability]
- Track record of [specific measurable results]
- Team with [unique qualifications or experience]

PROOF POINTS
- [X]% improvement in [key metric] for [customer type]
- [Number] customers have achieved [specific result]
- Featured in [publication] for [achievement]
- Trusted by [notable customer or category]

KEY STATS
- Customers Served: [Number]
- Average Result: [Metric and improvement]
- Time to Value: [How quickly customers see results]
- Satisfaction Score: [NPS or CSAT]',
    'public',
    ARRAY['template', 'core', 'sales', 'competitive']
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================================
-- 6. PRODUCTS & SERVICES (Template)
-- ============================================================
INSERT INTO context_assets (
    id, user_id, asset_type, name, description,
    content_json, content_text, visibility, tags
) VALUES (
    'ca000000-0000-0000-0001-000000000006',
    NULL,
    'products',
    'Products & Services Template',
    'Template for documenting your product/service offerings',
    '{
        "offerings": [
            {
                "name": "[Product/Service Name]",
                "type": "product",
                "tagline": "[One-line description of what it does]",
                "description": "[2-3 sentence description of the offering and its purpose]",
                "features": [
                    "[Feature 1]: [What it does]",
                    "[Feature 2]: [What it does]",
                    "[Feature 3]: [What it does]"
                ],
                "benefits": [
                    "[Benefit 1]: [Outcome customer gets]",
                    "[Benefit 2]: [Outcome customer gets]",
                    "[Benefit 3]: [Outcome customer gets]"
                ],
                "ideal_for": [
                    "[Use case 1]",
                    "[Use case 2]",
                    "[Use case 3]"
                ],
                "pricing_model": "[How it''s priced - subscription, per-seat, usage-based, etc.]"
            }
        ]
    }'::jsonb,
    'PRODUCTS & SERVICES

[PRODUCT/SERVICE NAME]
Type: Product
Tagline: [One-line description]

Description:
[2-3 sentence description of the offering and its purpose]

FEATURES
- [Feature 1]: [What it does]
- [Feature 2]: [What it does]
- [Feature 3]: [What it does]

BENEFITS
- [Benefit 1]: [Outcome customer gets]
- [Benefit 2]: [Outcome customer gets]
- [Benefit 3]: [Outcome customer gets]

IDEAL FOR
- [Use case 1]
- [Use case 2]
- [Use case 3]

PRICING: [How it''s priced]',
    'public',
    ARRAY['template', 'core', 'products', 'sales']
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================================
-- 7. BRAND GUIDELINES (Template)
-- ============================================================
INSERT INTO context_assets (
    id, user_id, asset_type, name, description,
    content_json, content_text, visibility, tags
) VALUES (
    'ca000000-0000-0000-0001-000000000007',
    NULL,
    'brand_guidelines',
    'Brand Guidelines Template',
    'Template for visual and verbal brand identity rules',
    '{
        "logo_usage": "Use the primary logo on light backgrounds, reversed logo on dark. Maintain minimum clear space of 1x logo height. Never stretch, rotate, or recolor.",
        "colors": {
            "primary": "#6366F1 (Indigo - used for primary CTAs and key elements)",
            "secondary": "#1E293B (Slate - used for text and secondary elements)",
            "accent": "#10B981 (Emerald - used for success states and highlights)",
            "background": "#F8FAFC (Light gray - primary background color)"
        },
        "typography": {
            "heading_font": "Inter (Bold for H1-H2, Semibold for H3-H4)",
            "body_font": "Inter (Regular for body, Medium for emphasis)"
        },
        "imagery_style": "Clean, modern, professional. Feature real people when possible. Avoid stock photo cliches. Use brand colors as accents in graphics.",
        "dos": [
            "Use consistent spacing and alignment",
            "Maintain brand color ratios (60% primary, 30% secondary, 10% accent)",
            "Include whitespace for visual breathing room",
            "Use high-quality, relevant imagery"
        ],
        "donts": [
            "Use more than 3 fonts in one design",
            "Create busy or cluttered layouts",
            "Use low-resolution images",
            "Combine brand colors that clash"
        ]
    }'::jsonb,
    'BRAND GUIDELINES

LOGO USAGE
Use the primary logo on light backgrounds, reversed logo on dark. Maintain minimum clear space of 1x logo height. Never stretch, rotate, or recolor.

COLORS
- Primary: #6366F1 (Indigo) - Primary CTAs and key elements
- Secondary: #1E293B (Slate) - Text and secondary elements
- Accent: #10B981 (Emerald) - Success states and highlights
- Background: #F8FAFC (Light gray) - Primary background

TYPOGRAPHY
- Headings: Inter Bold (H1-H2), Inter Semibold (H3-H4)
- Body: Inter Regular, Inter Medium for emphasis

IMAGERY
Clean, modern, professional. Feature real people when possible. Avoid stock photo cliches. Use brand colors as accents in graphics.

DO:
- Use consistent spacing and alignment
- Maintain brand color ratios (60/30/10)
- Include whitespace for visual breathing room
- Use high-quality, relevant imagery

DO NOT:
- Use more than 3 fonts in one design
- Create busy or cluttered layouts
- Use low-resolution images
- Combine brand colors that clash',
    'public',
    ARRAY['template', 'core', 'brand', 'design', 'marketing']
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================================
-- 8. THOUGHT LEADERSHIP TOPICS (New Asset Type + Template)
-- For the Thought Leadership action
-- ============================================================

-- First, add the asset type if it doesn't exist
INSERT INTO context_asset_types (type_key, display_name, description, icon, sort_order, json_schema) VALUES
('thought_leadership_topics', 'Thought Leadership Topics', 'Strategic topics and themes for thought leadership content', 'lightbulb', 85,
'{
  "type": "object",
  "properties": {
    "brand_name": {"type": "string"},
    "primary_themes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "theme": {"type": "string"},
          "description": {"type": "string"},
          "unique_angle": {"type": "string"},
          "target_audience": {"type": "string"},
          "content_pillars": {"type": "array", "items": {"type": "string"}},
          "key_messages": {"type": "array", "items": {"type": "string"}},
          "proof_points": {"type": "array", "items": {"type": "string"}}
        }
      }
    },
    "content_formats": {"type": "array", "items": {"type": "string"}},
    "publishing_channels": {"type": "array", "items": {"type": "string"}},
    "competitors_topics": {"type": "array", "items": {"type": "string"}},
    "differentiation_notes": {"type": "string"}
  },
  "required": ["brand_name", "primary_themes"]
}'::jsonb)
ON CONFLICT (type_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    json_schema = EXCLUDED.json_schema;

-- Template asset for thought leadership topics
INSERT INTO context_assets (
    id, user_id, asset_type, name, description,
    content_json, content_text, visibility, tags
) VALUES (
    'ca000000-0000-0000-0001-000000000008',
    NULL,
    'thought_leadership_topics',
    'Thought Leadership Topics Template',
    'Template for defining strategic thought leadership themes and topics',
    '{
        "brand_name": "[Your Brand]",
        "primary_themes": [
            {
                "theme": "[Primary Theme 1]",
                "description": "[What this theme covers and why it matters]",
                "unique_angle": "[Your distinctive perspective on this topic]",
                "target_audience": "[Who cares most about this theme]",
                "content_pillars": [
                    "[Pillar 1 - specific topic area]",
                    "[Pillar 2 - specific topic area]",
                    "[Pillar 3 - specific topic area]"
                ],
                "key_messages": [
                    "[Core message 1 we want to reinforce]",
                    "[Core message 2 we want to reinforce]",
                    "[Core message 3 we want to reinforce]"
                ],
                "proof_points": [
                    "[Data, case study, or example that supports our expertise]",
                    "[Another proof point]"
                ]
            }
        ],
        "content_formats": [
            "LinkedIn posts (short-form insights)",
            "Blog articles (in-depth analysis)",
            "Podcast appearances (conversational thought leadership)",
            "Speaking engagements (high-visibility positioning)"
        ],
        "publishing_channels": [
            "LinkedIn (primary)",
            "Company blog",
            "Industry publications",
            "Email newsletter"
        ],
        "competitors_topics": [
            "[What topics are competitors covering?]",
            "[Where is the conversation saturated?]"
        ],
        "differentiation_notes": "[How our perspective differs from others in the space. What can we say that no one else can?]"
    }'::jsonb,
    'THOUGHT LEADERSHIP STRATEGY

BRAND: [Your Brand]

PRIMARY THEME 1: [Theme Name]
Description: [What this theme covers and why it matters]
Unique Angle: [Your distinctive perspective]
Target Audience: [Who cares most]

Content Pillars:
- [Pillar 1]
- [Pillar 2]
- [Pillar 3]

Key Messages:
- [Message 1]
- [Message 2]
- [Message 3]

Proof Points:
- [Supporting evidence 1]
- [Supporting evidence 2]

CONTENT FORMATS
- LinkedIn posts (short-form insights)
- Blog articles (in-depth analysis)
- Podcast appearances (conversational)
- Speaking engagements (high-visibility)

PUBLISHING CHANNELS
- LinkedIn (primary)
- Company blog
- Industry publications
- Email newsletter

COMPETITIVE LANDSCAPE
- [What competitors are covering]
- [Where conversation is saturated]

DIFFERENTIATION
[How our perspective differs. What can we say that no one else can?]',
    'public',
    ARRAY['template', 'core', 'content', 'thought-leadership', 'marketing']
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================================
-- VERIFICATION
-- ============================================================

DO $$
DECLARE
    asset_count INTEGER;
    type_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO asset_count
    FROM context_assets
    WHERE id::text LIKE 'ca000000-0000-0000-0001-%'
    AND is_current = true;

    SELECT COUNT(*) INTO type_count
    FROM context_asset_types
    WHERE is_active = true;

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'CORE COMPANY ASSETS SEEDED SUCCESSFULLY';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Template assets created: %', asset_count;
    RAISE NOTICE 'Total asset types available: %', type_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Core Templates Created:';
    RAISE NOTICE '  1. Company Profile Template';
    RAISE NOTICE '  2. Core Values Template';
    RAISE NOTICE '  3. Brand Voice Template';
    RAISE NOTICE '  4. Ideal Customer Profile Template';
    RAISE NOTICE '  5. Competitive Differentiation Template';
    RAISE NOTICE '  6. Products & Services Template';
    RAISE NOTICE '  7. Brand Guidelines Template';
    RAISE NOTICE '  8. Thought Leadership Topics Template (NEW TYPE)';
    RAISE NOTICE '';
    RAISE NOTICE 'These are public templates. Users should clone';
    RAISE NOTICE 'and customize for their own organization.';
    RAISE NOTICE '==============================================';
END $$;
