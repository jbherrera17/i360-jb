-- ============================================
-- Insight 360 - Import Content Creation System Assets
-- Version: 1.0.0
-- Date: January 2026
-- Description: Imports existing context assets, skills, and content from
--              the Content Creation System into Insight 360
-- ============================================

-- ============================================
-- SECTION 1: ADD NEW CONTEXT ASSET TYPES
-- For Thought Leadership specific content
-- ============================================

INSERT INTO context_asset_types (type_key, display_name, description, icon, sort_order, json_schema) VALUES

-- Origin Story
('origin_story', 'Origin Story', 'Personal or company origin story for thought leadership', '📜', 210,
'{
  "type": "object",
  "properties": {
    "title": {"type": "string"},
    "narrative": {"type": "string"},
    "key_moments": {"type": "array", "items": {"type": "string"}},
    "lessons_learned": {"type": "array", "items": {"type": "string"}},
    "values_formed": {"type": "array", "items": {"type": "string"}},
    "turning_points": {"type": "array", "items": {"type": "object"}}
  },
  "required": ["narrative"]
}'::jsonb),

-- Product Suite
('product_suite', 'Product Suite', 'Complete product and service offerings catalog', '🎁', 35,
'{
  "type": "object",
  "properties": {
    "suite_name": {"type": "string"},
    "tagline": {"type": "string"},
    "products": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "description": {"type": "string"},
          "features": {"type": "array"},
          "pricing": {"type": "string"},
          "ideal_for": {"type": "array"}
        }
      }
    }
  }
}'::jsonb),

-- Buyer Personas (detailed)
('buyer_personas', 'Buyer Personas', 'Detailed buyer persona profiles', '🎯', 65,
'{
  "type": "object",
  "properties": {
    "personas": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "role": {"type": "string"},
          "company_type": {"type": "string"},
          "goals": {"type": "array"},
          "challenges": {"type": "array"},
          "buying_behavior": {"type": "object"}
        }
      }
    }
  }
}'::jsonb),

-- Editorial Calendar
('editorial_calendar', 'Editorial Calendar', 'Content calendar with themes and topics', '📅', 220,
'{
  "type": "object",
  "properties": {
    "year": {"type": "integer"},
    "annual_theme": {"type": "string"},
    "quarters": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "quarter": {"type": "string"},
          "pillar": {"type": "string"},
          "months": {"type": "array"}
        }
      }
    }
  }
}'::jsonb),

-- Hashtag Strategy
('hashtag_strategy', 'Hashtag Strategy', 'Social media hashtag taxonomy and strategy', '#️⃣', 230,
'{
  "type": "object",
  "properties": {
    "brand_hashtags": {"type": "array"},
    "pillar_hashtags": {"type": "object"},
    "topic_hashtags": {"type": "object"},
    "rotation_pattern": {"type": "object"},
    "avoid_hashtags": {"type": "array"}
  }
}'::jsonb)

ON CONFLICT (type_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    json_schema = EXCLUDED.json_schema;

-- ============================================
-- SECTION 2: IMPORT VOICE DNA
-- From: Content Creation System/context/core/25-10-01 - JB_Brand_Voice_DNAv2.json
-- ============================================

INSERT INTO context_assets (
    id,
    user_id,
    asset_type,
    name,
    description,
    content_json,
    content_text,
    tags,
    visibility,
    version,
    is_current
) VALUES (
    'ca000001-0000-4000-8000-000000000001',
    NULL, -- System-level asset
    'voice_dna',
    'JB Brand Voice DNA v2',
    'Complete voice identity, communication style, and linguistic patterns for JB Herrera thought leadership content',
    '{
      "voice_identity": {
        "core_essence": "A seasoned strategist and mentor who bridges human wisdom with technology, leading with integrity and empathy. His voice conveys decades of real-world experience, a steady moral compass, and a drive to empower others through clarity and purpose.",
        "worldview": "Believes progress is achieved by aligning values with action, that technology should serve humanity—not replace it—and that truth, integrity, and service are non-negotiable foundations for meaningful success.",
        "emotional_palette": [
          "Warm empathy",
          "Calm authority",
          "Measured optimism",
          "Moral conviction",
          "Occasional vulnerability",
          "Reflective nostalgia",
          "Encouraging pragmatism"
        ],
        "social_positioning": "Positions himself as a trusted guide and collaborative partner—equal parts mentor, teacher, and ally—rather than a distant expert."
      },
      "communication_style": {
        "thought_progression": "Typically linear and story-driven with reflective pauses; often begins with a personal anecdote or question, then distills insights into actionable principles.",
        "conviction_spectrum": {
          "tentative_phrases": ["I wonder if…", "It seems to me…", "Consider this…", "Perhaps we could…"],
          "confident_phrases": ["Here''s what I''ve learned…", "This principle has guided me…", "The truth is…", "We can achieve this by…"],
          "typical_balance": "Blends exploratory framing at the start of an idea with firm, values-anchored conclusions."
        },
        "complexity_preference": "Prefers moderate-to-high complexity expressed in plain, accessible language—clarifies abstract ideas with concrete frameworks and lived examples.",
        "abstraction_level": "Comfortable with philosophical and theoretical reflection, but consistently grounds it in practical, real-world narratives and business applications."
      },
      "linguistic_fingerprint": {
        "sentence_architecture": {
          "typical_patterns": [
            "Opens with a story or vivid memory to establish context",
            "Follows with insight framed as a guiding principle",
            "Closes sections with a concise moral or actionable takeaway"
          ],
          "rhythm_variations": "Alternates between long, reflective sentences for storytelling and short, punchy statements for emphasis or lessons learned.",
          "transitional_habits": ["That lesson became…", "And somewhere along the way…", "What stuck with me was…", "Here''s the principle…", "So I began…"]
        },
        "vocabulary_tendencies": {
          "register_mixing": "Balances professional business terminology with conversational warmth; occasionally incorporates sports-coaching metaphors and ethical or spiritual language.",
          "jargon_usage": "Uses industry-specific terms (AI agents, ERP, guardrails) only when relevant, usually explained in plain English.",
          "signature_concepts": [
            "Values-alignment",
            "Clarity and focus",
            "Human brilliance amplified by AI",
            "Mentorship at scale",
            "Agentic AI",
            "Truth versus belief",
            "Pause–Think–Respond"
          ]
        },
        "rhetorical_toolkit": {
          "preferred_devices": [
            "Personal storytelling",
            "Anecdotes as proof points",
            "Rhetorical questions",
            "Direct address to reader (''you'')",
            "Parallel structure for emphasis",
            "Quotations from mentors or scripture"
          ],
          "argumentation_style": "Leads with relatable story or moral dilemma, extracts principle, then applies it to practical decision-making; favors logical-ethical appeals over purely data-driven persuasion.",
          "emphasis_techniques": [
            "Strategic repetition of key maxims",
            "Use of short standalone sentences for impact",
            "Quoting respected figures to underscore credibility",
            "Contrast between past struggle and present clarity"
          ]
        }
      },
      "contextual_adaptations": {
        "audience_calibration": "Adjusts tone to the listener—more data-and-ROI focused for investors, more empathetic and collaborative for teams and clients, more story-driven for public audiences.",
        "topic_modulation": "Shifts from warm narrative when sharing personal lessons to concise advisory tone when discussing strategy or technology.",
        "energy_dynamics": "Begins at a calm, reflective pace; intensity rises when addressing ethics, stakes, or calls to action; softens again when offering reassurance or guidance."
      },
      "authenticity_markers": {
        "quirks_and_tells": [
          "Frequent use of coaching metaphors from sports",
          "Phrases like ''Make Today Your Masterpiece''",
          "References to mentors as pivotal influences",
          "Moral framing through questions such as ''What would I do?''"
        ],
        "contradiction_patterns": "Tension between visionary ambition and disciplined pragmatism; openly acknowledges past missteps as teaching points.",
        "vulnerability_expression": "Shares personal failures, dilemmas, and faith-informed doubts to humanize lessons and build trust."
      },
      "voice_boundaries": {
        "never_sounds_like": [
          "Hype-driven tech evangelist",
          "Overly casual slang-heavy influencer",
          "Cynical or sarcastic critic",
          "Corporate-speak laden bureaucrat"
        ],
        "comfort_zones": [
          "Story-anchored thought leadership",
          "Ethical business strategy",
          "Bridging human values with innovation",
          "Guiding leaders through complexity with empathy"
        ],
        "stretch_zones": [
          "Ultra-technical jargon-heavy discussions without narrative framing",
          "Humor-first or highly irreverent banter",
          "Aggressive hard-sell pitches"
        ]
      },
      "illustrative_moments": [
        {
          "excerpt": "Technology should give us back our attention. It should help us focus on what truly matters—our people, our purpose, and our power to make real change.",
          "why_quintessential": "Shows his belief that tech must serve human priorities and illustrates his blend of clarity, purpose, and values-led reasoning."
        },
        {
          "excerpt": "I wasn''t just building digital tools. I was creating something that could walk alongside someone through their growth curve…help people pause, reflect, and act—not react.",
          "why_quintessential": "Reveals his mentoring mindset and commitment to human-first AI solutions, capturing warmth, guidance, and strategic empathy."
        },
        {
          "excerpt": "I went back to my core values. And I asked myself, ''WWJD? What Would Jesus Do? I know what I WANTED to do. But what SHOULD I do?''",
          "why_quintessential": "Exposes moral conflict and vulnerability, underscoring integrity as a core driver of decisions and his willingness to share hard truths."
        }
      ]
    }'::jsonb,
    'JB Herrera Voice DNA - A seasoned strategist and mentor who bridges human wisdom with technology. Core essence: leads with integrity and empathy. Emotional palette: warm empathy, calm authority, measured optimism, moral conviction. Communication style: story-driven, values-anchored conclusions. Signature concepts: Values-alignment, Human brilliance amplified by AI, Mentorship at scale, Pause-Think-Respond. Never sounds like: hype-driven tech evangelist, cynical critic, corporate-speak bureaucrat.',
    ARRAY['thought-leadership', 'voice', 'brand', 'synergi', 'values-driven-ai'],
    'public',
    2,
    true
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================
-- SECTION 3: IMPORT ICPs
-- From: Content Creation System/context/core/
-- ============================================

-- ICP 1: Coaches & Consultants
INSERT INTO context_assets (
    id,
    user_id,
    asset_type,
    name,
    description,
    content_json,
    content_text,
    tags,
    visibility,
    version,
    is_current
) VALUES (
    'ca000002-0000-4000-8000-000000000001',
    NULL,
    'icp',
    'Coaches & Consultants ICP',
    'Independent coaches and boutique consultants seeking AI-powered growth',
    '{
      "audience_overview": {
        "one_sentence_summary": "Independent coaches and boutique consultants who have built a successful practice but are stuck at a growth ceiling due to time, admin, and scalability limits.",
        "primary_identity": "Coach or Consultant",
        "stage_of_business": "Established with steady revenue, seeking scale",
        "location_majority": "North America with global virtual reach (UK, Canada, Australia)"
      },
      "psychographics": {
        "core_desires": [
          "Free up time from admin",
          "Scale from 1:1 to 1:many models",
          "Build authority through thought leadership",
          "Deliver consistent client experiences",
          "Grow revenue without hiring large teams"
        ],
        "core_fears": [
          "AI makes practice feel impersonal",
          "Investing in tech that wastes money or time",
          "Falling behind peers adopting AI"
        ],
        "core_values": ["Authenticity", "Simplicity", "Proof of ROI", "Ethical and transparent AI"]
      },
      "pain_points": {
        "top_pains": [
          "Admin overload",
          "Content marketing treadmill",
          "Inconsistent client onboarding",
          "Revenue capped by hours",
          "Difficulty differentiating in crowded market"
        ],
        "symptoms": [
          "Working late nights on admin",
          "Neglected marketing or newsletters",
          "Leads slipping through cracks",
          "Overbooked and burnt out"
        ],
        "failed_attempts": [
          "Hiring low-cost virtual assistants",
          "Using generic chatbots or automation tools",
          "Buying all-in-one platforms",
          "DIY content batching systems"
        ]
      },
      "desired_transformation": {
        "outcomes": [
          "Practice runs smoothly with AI handling tasks",
          "Consistent thought leadership presence",
          "New revenue streams supported by AI",
          "More freedom for high-value work and personal life"
        ],
        "aspirational_identity": "A CEO of their practice with bandwidth to scale authentically and be recognized as a niche leader"
      },
      "beliefs_and_triggers": {
        "limiting_beliefs": [
          "Not tech-savvy enough",
          "AI might replace personal touch",
          "AI is only for big companies"
        ],
        "buying_triggers": [
          "Burnout or revenue plateau",
          "Rebrand or scaling new offers",
          "Peers successfully integrating AI",
          "Clients or competitors prompting AI adoption"
        ]
      },
      "language_patterns": {
        "keywords_used": [
          "Drowning in admin",
          "Clone myself",
          "Need more time to coach/consult",
          "Marketing takes all my energy",
          "Scale without losing personal touch"
        ],
        "phrases_to_avoid": [
          "Guaranteed overnight success",
          "Done-for-you miracle AI",
          "Easy button",
          "Buzzword-heavy language"
        ]
      },
      "audience_segments": [
        {
          "segment_name": "Executive and Leadership Coaches",
          "unique_traits": ["Work with corporate leaders", "Focus on professional development"],
          "specific_pains": ["High client expectations", "Manual prep for sessions"],
          "specific_desires": ["Extend reach with group programs", "Maintain credibility"]
        },
        {
          "segment_name": "Business Consultants",
          "unique_traits": ["Advise SMBs on growth", "Often project-based revenue"],
          "specific_pains": ["Time lost on reporting", "Inconsistent client follow-up"],
          "specific_desires": ["Deliver higher value efficiently", "Stand out in crowded market"]
        },
        {
          "segment_name": "Life and Health Coaches",
          "unique_traits": ["Emphasis on personal transformation", "Strong reliance on personal brand"],
          "specific_pains": ["Struggle to keep marketing consistent", "Revenue capped by 1:1 sessions"],
          "specific_desires": ["Scale offerings into courses", "Maintain authentic human connection"]
        }
      ]
    }'::jsonb,
    'Coaches & Consultants ICP - Independent coaches and boutique consultants stuck at growth ceiling. Core desires: free up admin time, scale 1:1 to 1:many, build thought leadership. Core fears: AI feels impersonal, wasting money on tech. Pain points: admin overload, content treadmill, revenue capped by hours. Segments: Executive Coaches, Business Consultants, Life/Health Coaches.',
    ARRAY['icp', 'coaches', 'consultants', 'thought-leadership', 'synergi'],
    'public',
    1,
    true
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ICP 2: Small Manufacturing (NA)
INSERT INTO context_assets (
    id,
    user_id,
    asset_type,
    name,
    description,
    content_json,
    content_text,
    tags,
    visibility,
    version,
    is_current
) VALUES (
    'ca000003-0000-4000-8000-000000000001',
    NULL,
    'icp',
    'Small Manufacturing NA ICP',
    'Small manufacturing companies in North America seeking operational AI',
    '{
      "audience_overview": {
        "one_sentence_summary": "Small manufacturing companies in North America looking to leverage AI for operational efficiency and competitive advantage.",
        "primary_identity": "Manufacturing Business Owner/Executive",
        "stage_of_business": "Established, $1M-$50M revenue",
        "location_majority": "North America"
      },
      "psychographics": {
        "core_desires": [
          "Reduce operational inefficiencies",
          "Compete with larger manufacturers",
          "Retain institutional knowledge",
          "Modernize without disrupting production"
        ],
        "core_fears": [
          "Production downtime from tech failures",
          "Losing skilled workers to competitors",
          "Being left behind by industry 4.0"
        ],
        "core_values": ["Reliability", "Practicality", "Proven ROI", "Workforce respect"]
      },
      "pain_points": {
        "top_pains": [
          "Knowledge loss from retiring workers",
          "Manual data entry and reporting",
          "Quality control inconsistencies",
          "Supply chain unpredictability",
          "Limited IT resources"
        ]
      },
      "desired_transformation": {
        "outcomes": [
          "AI-assisted quality control",
          "Automated reporting and analytics",
          "Knowledge capture and transfer",
          "Predictive maintenance"
        ],
        "aspirational_identity": "Industry leader known for innovation and operational excellence"
      }
    }'::jsonb,
    'Small Manufacturing ICP - $1M-$50M revenue manufacturers in North America. Core desires: reduce inefficiencies, compete with larger players, retain knowledge. Pain points: knowledge loss from retiring workers, manual reporting, quality inconsistencies.',
    ARRAY['icp', 'manufacturing', 'sme', 'operations', 'synergi'],
    'public',
    1,
    true
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ICP 3: Small Professional Services
INSERT INTO context_assets (
    id,
    user_id,
    asset_type,
    name,
    description,
    content_json,
    content_text,
    tags,
    visibility,
    version,
    is_current
) VALUES (
    'ca000004-0000-4000-8000-000000000001',
    NULL,
    'icp',
    'Small Professional Services ICP',
    'Small professional services firms (accounting, legal, marketing agencies)',
    '{
      "audience_overview": {
        "one_sentence_summary": "Small professional services firms seeking to scale expertise and improve client delivery through AI.",
        "primary_identity": "Professional Services Firm Owner",
        "stage_of_business": "Established, 5-50 employees",
        "location_majority": "North America"
      },
      "psychographics": {
        "core_desires": [
          "Scale expertise without adding headcount",
          "Improve client response times",
          "Standardize service delivery",
          "Build recurring revenue models"
        ],
        "core_fears": [
          "Client confidentiality concerns with AI",
          "Junior staff becoming dependent on AI",
          "Losing the personal touch"
        ],
        "core_values": ["Excellence", "Client relationships", "Professional integrity", "Continuous improvement"]
      },
      "pain_points": {
        "top_pains": [
          "Bottleneck on senior expertise",
          "Inconsistent junior staff output",
          "Time spent on repetitive research",
          "Proposal and document creation overhead"
        ]
      }
    }'::jsonb,
    'Small Professional Services ICP - 5-50 employee firms (accounting, legal, agencies). Core desires: scale expertise, improve response times, standardize delivery. Pain points: bottleneck on senior expertise, inconsistent junior output, repetitive research time.',
    ARRAY['icp', 'professional-services', 'agency', 'sme', 'synergi'],
    'public',
    1,
    true
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ICP 4: Small Healthcare Organizations
INSERT INTO context_assets (
    id,
    user_id,
    asset_type,
    name,
    description,
    content_json,
    content_text,
    tags,
    visibility,
    version,
    is_current
) VALUES (
    'ca000005-0000-4000-8000-000000000001',
    NULL,
    'icp',
    'Small Healthcare Organizations ICP',
    'Small healthcare practices and organizations seeking compliant AI solutions',
    '{
      "audience_overview": {
        "one_sentence_summary": "Small healthcare organizations seeking to improve patient experience and operational efficiency while maintaining compliance.",
        "primary_identity": "Healthcare Practice Owner/Administrator",
        "stage_of_business": "Established practice, 5-100 staff",
        "location_majority": "North America"
      },
      "psychographics": {
        "core_desires": [
          "Reduce administrative burden on clinical staff",
          "Improve patient communication and satisfaction",
          "Maintain strict compliance (HIPAA, etc.)",
          "Compete with larger healthcare systems"
        ],
        "core_fears": [
          "Compliance violations from AI use",
          "Patient data security breaches",
          "Dehumanizing patient care"
        ],
        "core_values": ["Patient care first", "Compliance", "Staff wellbeing", "Community trust"]
      },
      "pain_points": {
        "top_pains": [
          "Staff burnout from admin tasks",
          "No-shows and scheduling inefficiencies",
          "Documentation burden",
          "Limited technology budgets"
        ]
      }
    }'::jsonb,
    'Small Healthcare ICP - 5-100 staff practices. Core desires: reduce admin burden, improve patient communication, maintain compliance. Pain points: staff burnout, no-shows, documentation burden. Critical: HIPAA compliance required.',
    ARRAY['icp', 'healthcare', 'compliance', 'sme', 'synergi'],
    'public',
    1,
    true
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================
-- SECTION 4: IMPORT SKILLS
-- From: Content Creation System/.claude/skills/
-- ============================================

-- Skill 1: Weekly Article Package
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
    version,
    visibility,
    status
) VALUES (
    '5c000001-0000-4000-8000-000000000001',
    NULL,
    'weekly-article-package',
    'Weekly Article Package Generator',
    'Produces complete weekly content packages for thought leadership: human-readable article, AI-optimized version, and 5 LinkedIn posts (Mon-Fri) with themed hashtags.',
    'package',
    '#8b5cf6',
    'content',
    'execute',
    ARRAY['thought-leadership', 'article', 'linkedin', 'content-package', 'weekly'],
    E'# Weekly Article Package Generator\n\nProduces complete content packages for the Values-Driven AI Ecosystem editorial calendar. Each package includes the article in two formats plus 5 daily LinkedIn posts to promote it.\n\n## Package Components\n\nEach weekly package contains:\n- **Article (Human-Readable)**: Blog/website publication in markdown with narrative flow\n- **Article (AI-Optimized)**: Structured per ai-article-formatter skill with YAML front matter\n- **5 LinkedIn Posts**: Daily promotion (Mon-Fri) platform-optimized with hashtags\n\n## Article Formats by Length\n\n**Long-form (2,000+ words):**\n- Opening Story/Hook (200-300 words)\n- The Problem/Context (300-400 words)\n- Core Framework/Argument (600-800 words)\n- Application/Implementation (300-400 words)\n- Examples/Evidence (200-300 words)\n- Implications/Call to Reflection (200-300 words)\n- Closing Insight (100-150 words)\n\n**Medium (1,000-1,500 words):**\n- Opening Hook (100-150 words)\n- The Challenge (200-250 words)\n- The Framework/Solution (400-500 words)\n- Practical Application (200-300 words)\n- Key Takeaway (100-150 words)\n\n**Short (500-800 words):**\n- Hook (50-75 words)\n- Core Insight (250-350 words)\n- Application (150-200 words)\n- Closing Punch (50-75 words)\n\n## LinkedIn Post Daily Themes\n\n| Day | Theme | Approach | Psychology |\n|-----|-------|----------|------------|\n| **Monday** | Insight Launch | Lead with core insight | Authority + curiosity |\n| **Tuesday** | Problem Spotlight | Highlight pain point | Empathy + recognition |\n| **Wednesday** | Framework Reveal | Share key framework | Value + practicality |\n| **Thursday** | Story/Example | Personal story or case | Connection + proof |\n| **Friday** | Call to Reflect | Philosophical question | Engagement + action |\n\n## LinkedIn Post Structure\n\n```\n[Hook - 1-2 sentences that stop the scroll]\n\n[Body - 3-5 sentences developing the angle]\n\n[Bridge to article - 1 sentence]\n\n[Call to action]\n\n---\n\n[Hashtags - 3-5 total]\n```\n\n**Character Guidelines:**\n- Total post: 1,300 characters maximum (optimal 800-1,000)\n- Hook: Under 150 characters\n- Hashtags: 3-5 per post (no more than 5)\n\n## Voice DNA Patterns to Follow\n\n- Opens with story or vivid memory to establish context\n- Follows with insight framed as a guiding principle\n- Closes sections with a concise moral or actionable takeaway\n- Alternates long reflective sentences with short punchy statements\n- Uses signature concepts: Values-alignment, Human brilliance amplified by AI, Truth versus belief\n\n## Output Format\n\nDeliver the complete package in this structure:\n\n```markdown\n# Weekly Package: [Article Title]\n**Week [#] | [Month] [Year] | [Quarterly Pillar]**\n\n---\n\n## Article (Human-Readable)\n\n[Full article in voice-aligned narrative format]\n\n---\n\n## Article (AI-Optimized)\n\n[Structured version with front matter and semantic sections]\n\n---\n\n## LinkedIn Posts\n\n### Monday: Insight Launch\n[Post content]\n---\n#Hashtag1 #Hashtag2 #Hashtag3\n\n### Tuesday: Problem Spotlight\n[Post content]\n---\n#Hashtag1 #Hashtag2 #Hashtag3\n\n[...continue for Wed, Thu, Fri]\n\n---\n\n## Publishing Checklist\n\n- [ ] Article published to blog\n- [ ] AI-optimized version saved\n- [ ] LinkedIn posts scheduled (Mon-Fri)\n- [ ] Newsletter version prepared\n```',
    'Complete weekly content package with article (human + AI versions) and 5 LinkedIn posts',
    ARRAY['voice_dna', 'icp'],
    ARRAY['editorial_calendar', 'hashtag_strategy', 'brand_guidelines'],
    12000,
    ARRAY['weekly package', 'article package', 'create linkedin posts', 'weekly content', 'content package'],
    ARRAY[
        'Generate a weekly content package for this topic',
        'Create an article and LinkedIn posts for this week',
        'Write the full weekly package for the editorial calendar'
    ],
    '1.0.0',
    'public',
    'active'
)
ON CONFLICT (id) DO UPDATE SET
    instructions = EXCLUDED.instructions,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Skill 2: AI Article Formatter
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
    version,
    visibility,
    status
) VALUES (
    '5c000002-0000-4000-8000-000000000001',
    NULL,
    'ai-article-formatter',
    'AI-Optimized Article Formatter',
    'Formats articles for AI retrieval using structured metadata, semantic sections, and self-contained content blocks. Maximizes retrieval accuracy and context preservation.',
    'file-text',
    '#3b82f6',
    'content',
    'execute',
    ARRAY['ai-optimization', 'article', 'formatting', 'knowledge-base', 'semantic'],
    E'# AI-Optimized Article Formatter\n\nStructures articles to maximize AI retrieval accuracy, semantic understanding, and context preservation.\n\n## Core Principles\n\n1. **Self-contained chunks**: Each section/paragraph should make sense independently\n2. **Rich metadata**: Front matter that enables filtering and context\n3. **Semantic clarity**: Clear headings that signal content type\n4. **Explicit definitions**: Define terms inline for isolated retrieval\n5. **Hierarchical structure**: Logical H1 > H2 > H3 > H4 progression\n\n## Step 1: Add Front Matter Metadata\n\nEvery article MUST start with YAML front matter:\n\n```yaml\n---\ntitle: \"Descriptive Article Title\"\ndate: YYYY-MM-DD\ntags: [primary-topic, secondary-topic, content-type]\naudience: target-audience-segment\ntopic: main-subject-area\ncontent_type: article|guide|framework|case-study|template\nstatus: draft|published|archived\nsummary: \"One-sentence description of what this article covers\"\nkeywords: [searchable, terms, concepts, phrases]\nrelated_profiles: [voice-dna, icp-segment, business-offering]\nfunnel_stage: awareness|consideration|decision\n---\n```\n\n## Step 2: Structure with Semantic Sections\n\n```markdown\n# Article Title (H1 - only one)\n\n## Overview\n[2-3 sentences: What this article covers and who it''s for]\n\n## The Problem\n[Self-contained description of the pain point or challenge]\n\n## Why This Matters\n[Context, stakes, impact - standalone explanation]\n\n## The Solution/Framework\n[Your approach, methodology, or system]\n\n### Component 1\n[Detailed explanation with context]\n\n## Implementation\n[Step-by-step actionable guidance]\n\n## Real Examples\n[Concrete cases with context, numbers, outcomes]\n\n## Key Takeaways\n- **Takeaway 1**: Full explanation with rationale\n- **Takeaway 2**: Complete thought with context\n```\n\n## Step 3: Write Self-Contained Paragraphs\n\n**Formula**: Context + Concept + Evidence/Rationale + Application\n\nEach paragraph must include enough context to stand alone.\n\n## Step 4: Define Key Terms Inline\n\nUse parenthetical definitions for specialized terms:\n\n```markdown\nWe use a **tripwire offer** (low-cost product under $50 designed to convert leads to customers) to reduce purchase resistance.\n```\n\n## Step 5: Add Context Markers\n\n```markdown\n**Best for**: Online course creators with 1,000+ email subscribers\n**When to use**: During launch phase or re-engagement campaigns\n**Expected outcome**: 15-20% conversion rate\n**Prerequisites**: Email service provider, basic segmentation\n```\n\n## Quality Checklist\n\n**Structure**:\n- [ ] Front matter includes all relevant metadata\n- [ ] Only one H1 (title)\n- [ ] Logical heading hierarchy (no skipped levels)\n- [ ] Semantic section names that signal content type\n\n**Content**:\n- [ ] Each paragraph is self-contained with context\n- [ ] Key terms defined inline on first use\n- [ ] Examples include full context and results\n- [ ] No ambiguous references (\"this\", \"it\", \"above\")\n\n**AI Optimization**:\n- [ ] Context markers added (best for, when to use)\n- [ ] Related content is linked\n- [ ] Keywords are searchable terms',
    'AI-optimized article with YAML front matter, semantic sections, and self-contained paragraphs',
    ARRAY['voice_dna'],
    ARRAY['icp', 'editorial_calendar'],
    8000,
    ARRAY['format for ai', 'optimize article', 'structure content', 'ai-optimize', 'format article'],
    ARRAY[
        'Format this article for AI retrieval',
        'Optimize this content for the knowledge base',
        'Structure this article with semantic sections'
    ],
    '1.0.0',
    'public',
    'active'
)
ON CONFLICT (id) DO UPDATE SET
    instructions = EXCLUDED.instructions,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================
-- SECTION 5: IMPORT SKILL FILES
-- Supporting files for skills
-- ============================================

-- Hashtag Taxonomy for weekly-article-package
INSERT INTO skill_files (
    id,
    skill_id,
    filename,
    file_type,
    mime_type,
    content,
    description,
    sort_order
) VALUES (
    '5f000001-0000-4000-8000-000000000001',
    '5c000001-0000-4000-8000-000000000001',
    'hashtag-taxonomy.md',
    'documentation',
    'text/markdown',
    E'# Hashtag Taxonomy\n\nComplete hashtag strategy for Values-Driven AI Ecosystem content.\n\n## Brand Hashtags (Core Identity)\n\n| Hashtag | Use When | Frequency |\n|---------|----------|----------|\n| #SynergiAI | All content | 2-3x per week |\n| #ValuesFirstAI | Values/ethics focus | 2-3x per week |\n| #AlignedIntelligence | AI alignment topics | 1-2x per week |\n| #IntegrityByDesign | Governance/architecture | 1-2x per week |\n\n**Rotation Pattern:**\n- Monday: #SynergiAI + #ValuesFirstAI\n- Tuesday: #AlignedIntelligence\n- Wednesday: #SynergiAI\n- Thursday: #IntegrityByDesign\n- Friday: #ValuesFirstAI + #SynergiAI\n\n## Pillar-Based Hashtags\n\n### Pillar 1: Human-Aligned Intelligence\n- #HumanAICollaboration\n- #HumanFirst\n- #FutureOfWork\n- #HumanBrilliance\n\n### Pillar 2: Ethical Architecture\n- #AIEthics\n- #EthicalAI\n- #ResponsibleAI\n- #AIGovernance\n\n### Pillar 3: Ecosystem Intelligence\n- #AIEcosystem\n- #MultiAgentAI\n- #ConnectedIntelligence\n- #AIArchitecture\n\n### Pillar 4: SME Practicality\n- #SMELeadership\n- #SmallBusinessAI\n- #PracticalAI\n- #SMEGrowth\n\n### Pillar 5: Sustainable Growth\n- #SustainableBusiness\n- #PurposeDriven\n- #LongTermThinking\n- #ResponsibleGrowth\n\n## Topic-Specific Hashtags\n\n### Leadership & Strategy\n- #AILeadership\n- #CEOInsights\n- #ExecutiveStrategy\n- #StrategicAI\n\n### Values & Culture\n- #CompanyCulture\n- #OrganizationalValues\n- #CultureFirst\n\n### Transformation & Change\n- #DigitalTransformation\n- #AITransformation\n- #ChangeManagement\n\n## Hashtags to Avoid\n\n**Too Generic:**\n- #AI (too broad)\n- #Technology (too broad)\n- #Business (too broad)\n\n**Off-Brand:**\n- #Hustle (too hype-driven)\n- #Disruption (overused)\n- #GameChanger (cliche)',
    'Complete hashtag taxonomy for LinkedIn posts',
    1
)
ON CONFLICT (id) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = NOW();

-- LinkedIn Post Specs
INSERT INTO skill_files (
    id,
    skill_id,
    filename,
    file_type,
    mime_type,
    content,
    description,
    sort_order
) VALUES (
    '5f000002-0000-4000-8000-000000000001',
    '5c000001-0000-4000-8000-000000000001',
    'linkedin-post-specs.md',
    'documentation',
    'text/markdown',
    E'# LinkedIn Post Specifications\n\n## Character Limits\n\n- **Total post**: 3,000 characters max (optimal: 800-1,300)\n- **Hook**: Under 150 characters\n- **Hashtags**: 3-5 per post\n\n## Structure Template\n\n```\n[Hook - 1-2 sentences that stop the scroll]\n\n[Body - 3-5 sentences developing the angle]\n\n[Bridge to article - 1 sentence]\n\n[Call to action]\n\n---\n\n[Hashtags]\n```\n\n## Daily Themes\n\n### Monday: Insight Launch\n**Formula:**\n```\n[Bold declarative statement from article''s core thesis]\n\n[2-3 sentences expanding on why this matters]\n\n[Transition: \"I explore this in depth in my latest article.\"]\n\n[CTA: \"Link in comments\" or direct prompt]\n```\n\n**Psychology**: Authority + Curiosity\n\n### Tuesday: Problem Spotlight\n**Formula:**\n```\n[Question or \"Have you noticed...\" opening]\n\n[Description of the problem your audience faces]\n\n[Why it''s getting worse / stakes]\n\n[Transition to solution in article]\n```\n\n**Psychology**: Empathy + Recognition\n\n### Wednesday: Framework Reveal\n**Formula:**\n```\n[Framework name or numbered list hook]\n\n[Key components or steps - bulleted]\n\n[Why this framework works]\n\n[Where to learn more]\n```\n\n**Psychology**: Value + Practicality\n\n### Thursday: Story/Example\n**Formula:**\n```\n[Personal story hook or \"A client recently...\"]\n\n[What happened - the challenge]\n\n[The turning point or insight]\n\n[The outcome or lesson]\n\n[Connection to article]\n```\n\n**Psychology**: Connection + Proof\n\n### Friday: Call to Reflect\n**Formula:**\n```\n[Philosophical question related to article theme]\n\n[Brief context or provocation]\n\n[Invitation to reflect and read]\n\n[Weekend thought prompt]\n```\n\n**Psychology**: Engagement + Action\n\n## Voice Guidelines\n\n- No emoji (matches voice boundaries)\n- Professional but warm\n- Story-driven when appropriate\n- Values-anchored conclusions',
    'LinkedIn post specifications and daily theme templates',
    2
)
ON CONFLICT (id) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = NOW();

-- ============================================
-- SECTION 6: IMPORT WHY WE WIN
-- ============================================

INSERT INTO context_assets (
    id,
    user_id,
    asset_type,
    name,
    description,
    content_json,
    content_text,
    tags,
    visibility,
    version,
    is_current
) VALUES (
    'ca000006-0000-4000-8000-000000000001',
    NULL,
    'why_we_win',
    'Synergi AI - Why We Win',
    'Competitive differentiation and unique value proposition for Synergi AI',
    '{
      "value_proposition": "Values-Driven AI Ecosystem Design for SMEs - We help values-driven leaders adopt AI without losing their soul",
      "differentiators": [
        "Values-First Architecture: We build AI systems that embed your organization''s values into every decision",
        "Human-Aligned Intelligence: Our systems amplify human brilliance, not replace it",
        "SME Practicality: Affordable, scalable frameworks designed for small and mid-sized businesses",
        "Integrity by Design: Built-in guardrails that ensure AI decisions align with your bright lines"
      ],
      "competitive_advantages": [
        "20+ years enterprise technology experience bridging human wisdom with innovation",
        "Proprietary Values Integration Framework ensuring AI reflects organizational DNA",
        "Multi-agent orchestration expertise for connected, governed AI ecosystems",
        "Track record of helping leaders navigate technology transitions with integrity"
      ],
      "proof_points": [
        "Founded by JB Herrera - former CEO of Synergi Partners with decades of enterprise consulting",
        "Built Insight 360 - a values-based AI command center for multi-LLM orchestration",
        "Thought leadership in Values-Driven AI Ecosystem Design",
        "Trusted by coaches, consultants, and SME leaders across North America"
      ],
      "positioning_statement": "Where Values Become the Operating System of Intelligence",
      "tagline": "AI that thinks ethically and grows sustainably"
    }'::jsonb,
    'Synergi AI Why We Win - Values-Driven AI Ecosystem Design for SMEs. Differentiators: Values-First Architecture, Human-Aligned Intelligence, SME Practicality, Integrity by Design. Positioning: Where Values Become the Operating System of Intelligence.',
    ARRAY['positioning', 'differentiation', 'synergi', 'values-driven-ai'],
    'public',
    1,
    true
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    asset_count INTEGER;
    skill_count INTEGER;
    file_count INTEGER;
    type_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO asset_count FROM context_assets WHERE id::text LIKE 'ca00000%';
    SELECT COUNT(*) INTO skill_count FROM skills WHERE id::text LIKE '5c00000%';
    SELECT COUNT(*) INTO file_count FROM skill_files WHERE id::text LIKE '5f00000%';
    SELECT COUNT(*) INTO type_count FROM context_asset_types WHERE type_key IN ('origin_story', 'product_suite', 'buyer_personas', 'editorial_calendar', 'hashtag_strategy');

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'CONTENT CREATION SYSTEM IMPORT COMPLETE';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'New Context Asset Types: %', type_count;
    RAISE NOTICE 'Context Assets Imported: %', asset_count;
    RAISE NOTICE '  - Voice DNA: 1';
    RAISE NOTICE '  - ICPs: 4 (Coaches, Manufacturing, Prof Services, Healthcare)';
    RAISE NOTICE '  - Why We Win: 1';
    RAISE NOTICE '';
    RAISE NOTICE 'Skills Imported: %', skill_count;
    RAISE NOTICE '  - weekly-article-package';
    RAISE NOTICE '  - ai-article-formatter';
    RAISE NOTICE '';
    RAISE NOTICE 'Skill Files Imported: %', file_count;
    RAISE NOTICE '  - hashtag-taxonomy.md';
    RAISE NOTICE '  - linkedin-post-specs.md';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
