-- ============================================
-- Insight 360 - TL Niche Discovery Workflow
-- Version: 1.0.0
-- Date: January 2026
-- Description: One-time setup workflow for establishing
--   thought leadership niche, thesis, atomic claim, and pillars
-- ============================================

-- ============================================
-- WORKFLOW TEMPLATE
-- ============================================
INSERT INTO workflow_templates (
    id,
    name,
    display_name,
    description,
    icon,
    color,
    category,
    suite,
    tags,
    required_context_types,
    required_skills,
    template_definition,
    estimated_minutes,
    difficulty_level,
    is_active,
    is_featured,
    version
) VALUES (
    'e1000001-0000-4000-8000-000000000010',
    'tl-niche-discovery',
    'Thought Leadership Niche Discovery',
    'Complete one-time setup workflow for establishing your thought leadership position: from brand foundation through AI visibility research, core thesis development, atomic claim crafting, and content pillar design.',
    'compass',
    '#8b5cf6',
    'thought_leadership',
    'execute',
    ARRAY['thought-leadership', 'niche', 'positioning', 'strategy', 'setup'],
    ARRAY['voice_dna', 'icp']::TEXT[],
    ARRAY[]::TEXT[],
    '{
        "phases": [
            {
                "name": "Prerequisites",
                "description": "Ensure brand foundation is in place",
                "steps": [1, 2]
            },
            {
                "name": "Research",
                "description": "AI visibility analysis for self and competitors",
                "steps": [3, 4]
            },
            {
                "name": "Core Strategy",
                "description": "Define thesis and atomic claim",
                "steps": [5, 6, 7]
            },
            {
                "name": "Positioning",
                "description": "Create positioning framework",
                "steps": [8, 9]
            },
            {
                "name": "Content Architecture",
                "description": "Design pillars and calendar",
                "steps": [10, 11]
            },
            {
                "name": "Activation",
                "description": "Set up Notion calendar and finalize",
                "steps": [12]
            }
        ],
        "default_execution_mode": "review",
        "is_one_time": true
    }'::JSONB,
    180,
    'advanced',
    true,
    true,
    '1.0.0'
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    template_definition = EXCLUDED.template_definition,
    updated_at = NOW();

-- ============================================
-- WORKFLOW INSTANCE
-- ============================================
INSERT INTO workflows (
    id,
    user_id,
    department_id,
    name,
    description,
    icon,
    color,
    category,
    suite,
    tags,
    estimated_minutes,
    is_active,
    is_public,
    is_system,
    template_id,
    prerequisites,
    outputs
) VALUES (
    'f0000001-0000-4000-8000-000000000010',
    NULL,
    NULL,
    'Thought Leadership Niche Discovery',
    'Complete one-time setup for establishing your thought leadership position. Takes 2-3 hours but sets the foundation for years of content.',
    'compass',
    '#8b5cf6',
    'thought_leadership',
    'execute',
    ARRAY['thought-leadership', 'niche', 'positioning', 'strategy', 'setup'],
    180,
    true,
    true,
    true,
    'e1000001-0000-4000-8000-000000000010',
    '{
        "context_assets": ["voice_dna", "icp"],
        "message": "This workflow requires Brand Voice DNA and at least one ICP. Steps 1-2 will help you create these if needed."
    }'::JSONB,
    '[
        {"type": "core_thesis", "format": "text", "description": "Your main thought leadership thesis"},
        {"type": "atomic_claim", "format": "text", "description": "Single-sentence claim capturing your unique perspective"},
        {"type": "positioning_framework", "format": "json", "description": "Complete positioning strategy document"},
        {"type": "content_pillars", "format": "json", "description": "4-5 strategic content themes"},
        {"type": "ai_visibility_report", "format": "json", "description": "Personal and competitor visibility analysis"}
    ]'::JSONB
)
ON CONFLICT DO NOTHING;

-- ============================================
-- WORKFLOW CONTEXT ASSETS
-- ============================================
INSERT INTO workflow_context_assets (workflow_id, context_asset_type, is_required, inject_at_steps)
VALUES
    ('f0000001-0000-4000-8000-000000000010', 'voice_dna', true, ARRAY[5,6,7,10]),
    ('f0000001-0000-4000-8000-000000000010', 'icp', true, ARRAY[3,4,5,10]),
    ('f0000001-0000-4000-8000-000000000010', 'company_description', false, ARRAY[3,4,5]),
    ('f0000001-0000-4000-8000-000000000010', 'origin_story', false, ARRAY[5,6,7])
ON CONFLICT DO NOTHING;

-- ============================================
-- WORKFLOW STEPS
-- ============================================

-- Phase 1: Prerequisites

-- Step 1: Verify Voice DNA
INSERT INTO workflow_steps (
    id,
    workflow_id,
    step_number,
    name,
    description,
    instructions,
    step_type,
    execution_mode,
    input_fields,
    output_variable,
    output_format,
    gate_message,
    requires_approval
) VALUES (
    'd0000010-0001-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000010',
    1,
    'Brand Voice DNA Check',
    'Verify or create Brand Voice DNA context asset',
    'Voice DNA is the foundation for all thought leadership content. It ensures everything you create sounds authentically like you.',
    'human_gate',
    'gate',
    '[
        {"name": "has_voice_dna", "type": "boolean", "label": "Do you have a Voice DNA profile defined?", "required": true},
        {"name": "voice_dna_id", "type": "text", "label": "Voice DNA asset ID (if exists)", "required": false}
    ]'::JSONB,
    'voice_dna_status',
    'json',
    'Brand Voice DNA is essential. Do you have one, or should we help create it?',
    true
)
ON CONFLICT DO NOTHING;

-- Step 2: Verify ICP
INSERT INTO workflow_steps (
    id,
    workflow_id,
    step_number,
    name,
    description,
    instructions,
    step_type,
    execution_mode,
    input_fields,
    output_variable,
    output_format,
    gate_message,
    requires_approval
) VALUES (
    'd0000010-0002-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000010',
    2,
    'Ideal Client Profile Check',
    'Verify or create ICP context asset',
    'Understanding who you want to reach is critical for positioning your thought leadership.',
    'human_gate',
    'gate',
    '[
        {"name": "has_icp", "type": "boolean", "label": "Do you have an Ideal Client Profile defined?", "required": true},
        {"name": "icp_count", "type": "number", "label": "How many ICPs do you have?", "required": false, "default": 1},
        {"name": "primary_icp_id", "type": "text", "label": "Primary ICP asset ID (if exists)", "required": false}
    ]'::JSONB,
    'icp_status',
    'json',
    'ICP helps us understand who your thought leadership should resonate with. Do you have one defined?',
    true
)
ON CONFLICT DO NOTHING;

-- Phase 2: Research

-- Step 3: Personal AI Visibility Research
INSERT INTO workflow_steps (
    id,
    workflow_id,
    step_number,
    name,
    description,
    instructions,
    step_type,
    execution_mode,
    agent_id,
    prompt_template,
    output_variable,
    output_format,
    requires_approval
) VALUES (
    'd0000010-0003-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000010',
    3,
    'Personal AI Visibility Research',
    'Research how AI systems currently perceive you',
    'Use AI search to understand your current visibility and positioning in AI-powered search results.',
    'agent_chat',
    'review',
    'a0000001-0000-4000-a000-000000000302', -- AI Visibility Researcher
    'Conduct a personal AI visibility audit for:

**Subject:** {{user_name}}
**Company:** {{company_name}}
**Industry:** {{industry}}

Research prompts to use:
1. "Who is {{user_name}}?"
2. "What is {{user_name}} known for?"
3. "{{user_name}} expertise"
4. "Who are the top thought leaders in {{industry}}?"
5. "{{company_name}} leadership"

Provide:
- Visibility score (0-100)
- Topics currently associated with the name
- Key findings (positive and gaps)
- Recommended actions',
    'personal_visibility',
    'json',
    true
)
ON CONFLICT DO NOTHING;

-- Step 4: Competitor AI Visibility Research
INSERT INTO workflow_steps (
    id,
    workflow_id,
    step_number,
    name,
    description,
    instructions,
    step_type,
    execution_mode,
    agent_id,
    input_fields,
    prompt_template,
    output_variable,
    output_format,
    requires_approval
) VALUES (
    'd0000010-0004-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000010',
    4,
    'Competitor AI Visibility Research',
    'Research how AI systems perceive your competitors',
    'Understand what topics competitors own and where gaps exist that you could fill.',
    'agent_chat',
    'review',
    'a0000001-0000-4000-a000-000000000302', -- AI Visibility Researcher
    '[
        {"name": "competitor1", "type": "text", "label": "Competitor 1 (name or company)", "required": true},
        {"name": "competitor2", "type": "text", "label": "Competitor 2 (name or company)", "required": false},
        {"name": "competitor3", "type": "text", "label": "Competitor 3 (name or company)", "required": false}
    ]'::JSONB,
    'Conduct competitor AI visibility analysis:

**Competitors to research:**
1. {{competitor1}}
2. {{competitor2}}
3. {{competitor3}}

For each competitor, research:
1. "Who is [competitor]?"
2. "What is [competitor] known for?"
3. "[competitor] thought leadership"
4. "[competitor] vs {{user_name}}"

Provide for each:
- Visibility score
- Topics they own
- Content that gets cited
- Gaps they leave unaddressed

Then summarize:
- Topics with high competition
- White space opportunities
- Differentiation possibilities',
    'competitor_visibility',
    'json',
    true
)
ON CONFLICT DO NOTHING;

-- Phase 3: Core Strategy

-- Step 5: Core Thesis Development
INSERT INTO workflow_steps (
    id,
    workflow_id,
    step_number,
    name,
    description,
    instructions,
    step_type,
    execution_mode,
    agent_id,
    prompt_template,
    output_variable,
    output_format,
    requires_approval
) VALUES (
    'd0000010-0005-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000010',
    5,
    'Define Core Thesis',
    'Develop your main thought leadership thesis',
    'Work with the Strategy Architect to articulate the big idea you want to be known for.',
    'agent_chat',
    'review',
    'a0000001-0000-4000-a000-000000000301', -- TL Strategy Architect
    'Help develop a core thesis for thought leadership positioning.

**Context:**
- Voice DNA summary: {{voice_dna_summary}}
- Target audience: {{icp_summary}}
- Current AI visibility: {{personal_visibility.visibility_score}}/100
- Competitor positioning: {{competitor_visibility.summary}}
- White space opportunities: {{competitor_visibility.gaps}}

**Guiding questions:**
1. What transformation do you enable for clients?
2. What contrarian belief do you hold about your industry?
3. What would you argue passionately at a conference?
4. What do you wish everyone in your field understood?

Help articulate a core thesis that is:
- Specific enough to own
- Broad enough to sustain years of content
- Challenges conventional wisdom
- Connects to business outcomes
- Reflects genuine conviction

Output a draft thesis (1-2 paragraphs) for review.',
    'core_thesis_draft',
    'markdown',
    true
)
ON CONFLICT DO NOTHING;

-- Step 6: Atomic Claim Crafting
INSERT INTO workflow_steps (
    id,
    workflow_id,
    step_number,
    name,
    description,
    instructions,
    step_type,
    execution_mode,
    agent_id,
    prompt_template,
    output_variable,
    output_format,
    requires_approval
) VALUES (
    'd0000010-0006-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000010',
    6,
    'Craft Atomic Claim',
    'Distill thesis into a single memorable sentence',
    'Transform the core thesis into a quotable atomic claim under 20 words.',
    'agent_chat',
    'review',
    'a0000001-0000-4000-a000-000000000301', -- TL Strategy Architect
    'Distill this thesis into an atomic claim:

**Core Thesis:**
{{core_thesis_draft}}

An atomic claim should be:
- Under 20 words
- Memorable and quotable
- Creates curiosity
- Implies expertise
- Could be a Twitter bio or LinkedIn headline

Examples of great atomic claims:
- "AI amplifies whatever already exists—values-driven companies will win, not despite AI, but because of it."
- "Culture eats strategy for breakfast."
- "Move fast and break things."

Generate 5 atomic claim options, then recommend the strongest one with reasoning.',
    'atomic_claim_options',
    'json',
    true
)
ON CONFLICT DO NOTHING;

-- Step 7: Atomic Claim Selection & Outline
INSERT INTO workflow_steps (
    id,
    workflow_id,
    step_number,
    name,
    description,
    instructions,
    step_type,
    execution_mode,
    input_fields,
    output_variable,
    output_format,
    gate_message,
    requires_approval
) VALUES (
    'd0000010-0007-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000010',
    7,
    'Select Atomic Claim',
    'Choose your atomic claim and outline supporting arguments',
    'Select the atomic claim that resonates most, then outline key supporting arguments.',
    'human_gate',
    'gate',
    '[
        {"name": "selected_claim", "type": "select", "label": "Select your atomic claim", "required": true, "options_from": "atomic_claim_options.options"},
        {"name": "custom_claim", "type": "text", "label": "Or write your own (if none fit)", "required": false},
        {"name": "supporting_points", "type": "textarea", "label": "3-5 key points that support this claim", "required": false}
    ]'::JSONB,
    'atomic_claim_selected',
    'json',
    'Review the atomic claim options. Which one captures your unique perspective best? You can also write your own.',
    true
)
ON CONFLICT DO NOTHING;

-- Phase 4: Positioning

-- Step 8: Positioning Framework
INSERT INTO workflow_steps (
    id,
    workflow_id,
    step_number,
    name,
    description,
    instructions,
    step_type,
    execution_mode,
    agent_id,
    prompt_template,
    output_variable,
    output_format,
    requires_approval
) VALUES (
    'd0000010-0008-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000010',
    8,
    'Create Positioning Framework',
    'Develop complete positioning strategy document',
    'Synthesize all insights into a comprehensive positioning framework.',
    'agent_chat',
    'review',
    'a0000001-0000-4000-a000-000000000301', -- TL Strategy Architect
    'Create a complete positioning framework:

**Inputs:**
- Core Thesis: {{core_thesis_draft}}
- Atomic Claim: {{atomic_claim_selected.claim}}
- Target Audience: {{icp_summary}}
- Current Visibility: {{personal_visibility.visibility_score}}/100
- Competitor Gaps: {{competitor_visibility.gaps}}

**Generate positioning framework including:**

1. **Position Statement**: One-paragraph elevator pitch
2. **Unique Value Proposition**: What only you can offer
3. **Differentiation Points**: How you differ from competitors
4. **Proof Points**: Evidence that supports your claims
5. **Key Messages**: 5-7 core messages for different contexts
6. **Objection Handlers**: Responses to common doubts
7. **Success Metrics**: How to measure positioning success

Format as a structured document.',
    'positioning_framework',
    'json',
    true
)
ON CONFLICT DO NOTHING;

-- Step 9: Human Checkpoint - Position Review
INSERT INTO workflow_steps (
    id,
    workflow_id,
    step_number,
    name,
    description,
    instructions,
    step_type,
    execution_mode,
    gate_message,
    requires_approval,
    output_variable
) VALUES (
    'd0000010-0009-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000010',
    9,
    'Position Review Checkpoint',
    'Review and approve positioning before proceeding to content architecture',
    'This is a critical checkpoint. Review your thesis, atomic claim, and positioning framework before we design content pillars.',
    'human_gate',
    'gate',
    '**CHECKPOINT: Review Your Positioning**

Before we design content pillars, please confirm:

1. **Core Thesis**: Does this capture what you want to be known for?
2. **Atomic Claim**: Is this memorable and authentic to you?
3. **Positioning Framework**: Does this differentiate you effectively?

This positioning will guide all your thought leadership content. Take time to ensure it feels right.',
    true,
    'positioning_approved'
)
ON CONFLICT DO NOTHING;

-- Phase 5: Content Architecture

-- Step 10: Design Content Pillars
INSERT INTO workflow_steps (
    id,
    workflow_id,
    step_number,
    name,
    description,
    instructions,
    step_type,
    execution_mode,
    agent_id,
    prompt_template,
    output_variable,
    output_format,
    requires_approval
) VALUES (
    'd0000010-0010-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000010',
    10,
    'Design Content Pillars',
    'Create 4-5 strategic content themes',
    'Design content pillars that explore different dimensions of your thesis.',
    'agent_chat',
    'review',
    'a0000001-0000-4000-a000-000000000303', -- Content Pillar Designer
    'Design content pillars for this thought leadership position:

**Core Thesis:** {{core_thesis_draft}}
**Atomic Claim:** {{atomic_claim_selected.claim}}
**Target Audience:** {{icp_summary}}
**Positioning:** {{positioning_framework.position_statement}}

Create 4-5 content pillars, each with:
- Name and description
- Core question it answers
- Quarterly focus mapping
- Monthly themes (12 months)
- 5 sample article titles
- Hashtag strategy (primary, topic, audience)
- Notion calendar value

Ensure pillars:
- Cover different aspects of the thesis
- Appeal to different audience stages
- Provide variety while maintaining coherence
- Can sustain 12+ months of content each',
    'content_pillars',
    'json',
    true
)
ON CONFLICT DO NOTHING;

-- Step 11: Map Pillars to Calendar
INSERT INTO workflow_steps (
    id,
    workflow_id,
    step_number,
    name,
    description,
    instructions,
    step_type,
    execution_mode,
    agent_id,
    prompt_template,
    output_variable,
    output_format,
    requires_approval
) VALUES (
    'd0000010-0011-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000010',
    11,
    'Map to Editorial Calendar',
    'Create annual editorial calendar with pillar assignments',
    'Map the content pillars to a 52-week editorial calendar.',
    'agent_chat',
    'review',
    'a0000001-0000-4000-a000-000000000303', -- Content Pillar Designer
    'Create an annual editorial calendar mapping:

**Content Pillars:**
{{content_pillars}}

**Requirements:**
- 52 weeks of content
- Each pillar should have 10-15 articles per year
- Quarterly focus on specific pillars
- Monthly themes within each quarter
- Mix of pillar types each month
- Account for holidays and seasonal relevance

Output format:
- JSON array of 52 weeks
- Each week: date, pillar, suggested_topic, monthly_theme
- Include quarterly planning notes

Also note:
- Key dates to avoid/leverage
- Suggested launch topics for the first month',
    'editorial_calendar',
    'json',
    true
)
ON CONFLICT DO NOTHING;

-- Phase 6: Activation

-- Step 12: Initialize Notion Calendar
INSERT INTO workflow_steps (
    id,
    workflow_id,
    step_number,
    name,
    description,
    instructions,
    step_type,
    execution_mode,
    input_fields,
    prompt_template,
    output_variable,
    output_format,
    requires_approval
) VALUES (
    'd0000010-0012-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000010',
    12,
    'Initialize Notion Calendar',
    'Create initial entries in Notion Content Calendar',
    'Set up the first month of content in your Notion calendar and save all positioning assets.',
    'artifact_generation',
    'review',
    '[
        {"name": "sync_weeks", "type": "number", "label": "How many weeks to sync to Notion?", "required": true, "default": 4},
        {"name": "save_to_profile", "type": "boolean", "label": "Save positioning to TL profile?", "required": true, "default": true},
        {"name": "create_context_assets", "type": "boolean", "label": "Create context assets for thesis/claim/pillars?", "required": true, "default": true}
    ]'::JSONB,
    'Finalize the niche discovery workflow:

1. **Save to Profile** (if selected):
   - Core thesis → thought_leadership_profiles.core_thesis
   - Atomic claim → thought_leadership_profiles.atomic_claim
   - Positioning framework → thought_leadership_profiles.positioning_framework

2. **Create Context Assets** (if selected):
   - Core Thesis asset
   - Atomic Claim asset
   - Content Pillars asset
   - AI Visibility Report asset

3. **Sync to Notion** ({{sync_weeks}} weeks):
   - Create calendar entries from editorial_calendar
   - Set pillar values
   - Add monthly topic and goal fields

Return confirmation of all created assets and synced entries.',
    'activation_result',
    'json',
    true
)
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    step_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO step_count FROM workflow_steps
    WHERE workflow_id = 'f0000001-0000-4000-8000-000000000010';

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'TL NICHE DISCOVERY WORKFLOW CREATED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Workflow: Thought Leadership Niche Discovery';
    RAISE NOTICE 'Total Steps: %', step_count;
    RAISE NOTICE 'Estimated Time: 2-3 hours';
    RAISE NOTICE '';
    RAISE NOTICE 'Phases:';
    RAISE NOTICE '  1. Prerequisites (Steps 1-2): Voice DNA & ICP check';
    RAISE NOTICE '  2. Research (Steps 3-4): Personal & competitor visibility';
    RAISE NOTICE '  3. Core Strategy (Steps 5-7): Thesis & atomic claim';
    RAISE NOTICE '  4. Positioning (Steps 8-9): Framework & checkpoint';
    RAISE NOTICE '  5. Content Architecture (Steps 10-11): Pillars & calendar';
    RAISE NOTICE '  6. Activation (Step 12): Notion sync & asset creation';
    RAISE NOTICE '';
    RAISE NOTICE 'Human Checkpoints: Steps 7, 9';
    RAISE NOTICE 'Agents Used:';
    RAISE NOTICE '  - TL Strategy Architect (Steps 5, 6, 8)';
    RAISE NOTICE '  - AI Visibility Researcher (Steps 3, 4)';
    RAISE NOTICE '  - Content Pillar Designer (Steps 10, 11)';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
