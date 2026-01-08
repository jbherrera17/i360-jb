-- ============================================
-- Insight 360 - Thought Leadership Workflow Template
-- Version: 1.0.0
-- Date: January 2026
-- Description: Complete thought leadership content creation workflow
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
    'e1000001-0000-4000-8000-000000000001',
    'thought-leadership-workflow',
    'Thought Leadership Content Pipeline',
    'Complete end-to-end workflow for creating thought leadership content: from brand setup through research, strategy, article creation, and artifact generation. Includes human checkpoints for review and approval.',
    'trending-up',
    '#8b5cf6',
    'content',
    'execute',
    ARRAY['thought-leadership', 'content-creation', 'article', 'linkedin', 'brand'],
    ARRAY['brand_guidelines', 'voice_dna']::TEXT[],
    ARRAY['brand-guidelines-generator', 'deep-research', 'ai-article-formatter', 'weekly-article-package']::TEXT[],
    '{
        "phases": [
            {
                "name": "Prerequisites",
                "description": "Ensure brand foundation is in place",
                "steps": [1, 2]
            },
            {
                "name": "Research",
                "description": "Deep research on topic and audience",
                "steps": [3, 4]
            },
            {
                "name": "Strategy",
                "description": "Define content strategy and angle",
                "steps": [5, 6]
            },
            {
                "name": "Creation",
                "description": "Write and format the article",
                "steps": [7, 8, 9]
            },
            {
                "name": "Distribution",
                "description": "Generate promotional content",
                "steps": [10, 11]
            },
            {
                "name": "Artifacts",
                "description": "Optional document generation",
                "steps": [12]
            }
        ],
        "default_execution_mode": "review"
    }'::JSONB,
    90,
    'intermediate',
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
-- CREATE WORKFLOW INSTANCE FROM TEMPLATE
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
    'f0000001-0000-4000-8000-000000000001',
    NULL,
    NULL,
    'Thought Leadership Content Pipeline',
    'Complete end-to-end workflow for creating thought leadership content: from brand setup through research, strategy, article creation, and artifact generation.',
    'trending-up',
    '#8b5cf6',
    'content',
    'execute',
    ARRAY['thought-leadership', 'content-creation', 'article', 'linkedin', 'brand'],
    90,
    true,
    true,
    true,
    'e1000001-0000-4000-8000-000000000001',
    '{
        "context_assets": ["brand_guidelines", "voice_dna"],
        "message": "This workflow requires brand guidelines and voice DNA to be configured. Step 1 will help you create these if needed."
    }'::JSONB,
    '[
        {"type": "article", "format": "markdown", "description": "Human-readable thought leadership article"},
        {"type": "article", "format": "ai-optimized", "description": "AI-optimized version for knowledge base"},
        {"type": "linkedin_posts", "count": 5, "description": "5 LinkedIn posts for the week"},
        {"type": "document", "format": "docx", "optional": true, "description": "Word document version"},
        {"type": "presentation", "format": "pptx", "optional": true, "description": "Presentation slides"}
    ]'::JSONB
)
ON CONFLICT DO NOTHING;

-- ============================================
-- WORKFLOW CONTEXT ASSETS
-- ============================================
INSERT INTO workflow_context_assets (workflow_id, context_asset_type, is_required, inject_at_steps)
VALUES
    ('f0000001-0000-4000-8000-000000000001', 'brand_guidelines', true, ARRAY[5,7,8,10]),
    ('f0000001-0000-4000-8000-000000000001', 'voice_dna', true, ARRAY[7,8,10]),
    ('f0000001-0000-4000-8000-000000000001', 'icp', false, ARRAY[3,4,5]),
    ('f0000001-0000-4000-8000-000000000001', 'company_description', false, ARRAY[3,5,7])
ON CONFLICT DO NOTHING;

-- ============================================
-- WORKFLOW STEPS
-- ============================================

-- Phase 1: Prerequisites

-- Step 1: Check/Create Brand Guidelines
INSERT INTO workflow_steps (
    id,
    workflow_id,
    step_number,
    name,
    description,
    instructions,
    step_type,
    execution_mode,
    skill_id,
    input_fields,
    output_variable,
    output_format,
    gate_message,
    requires_approval
) VALUES (
    'd0000001-0001-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000001',
    1,
    'Brand Guidelines Setup',
    'Verify or create brand guidelines context asset',
    'Check if brand_guidelines context asset exists. If not, guide user through creation using the Brand Guidelines Generator skill.',
    'context_creation',
    'gate',
    'a1b2c3d4-0001-4000-8000-000000000001', -- brand-guidelines-generator
    '[
        {"name": "has_guidelines", "type": "boolean", "label": "Do you have existing brand guidelines?", "required": true},
        {"name": "brand_name", "type": "text", "label": "Brand/Company Name", "required": true}
    ]'::JSONB,
    'brand_guidelines_status',
    'json',
    'Brand guidelines are the foundation for consistent content. Please confirm or create your brand guidelines before proceeding.',
    true
)
ON CONFLICT DO NOTHING;

-- Step 2: Check/Create Voice DNA
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
    'd0000001-0002-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000001',
    2,
    'Voice DNA Setup',
    'Verify or create voice DNA context asset',
    'Check if voice_dna context asset exists. If not, gather information about brand voice, tone, and communication style.',
    'context_creation',
    'gate',
    '[
        {"name": "has_voice_dna", "type": "boolean", "label": "Do you have defined voice guidelines?", "required": true},
        {"name": "voice_attributes", "type": "textarea", "label": "Describe your brand voice in 3-5 adjectives", "required": false, "placeholder": "e.g., Professional, Warm, Authoritative, Approachable"}
    ]'::JSONB,
    'voice_dna_status',
    'json',
    'Voice DNA ensures your content sounds authentically like your brand. Please confirm or create your voice guidelines.',
    true
)
ON CONFLICT DO NOTHING;

-- Phase 2: Research

-- Step 3: Topic Selection & Research Brief
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
    output_format
) VALUES (
    'd0000001-0003-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000001',
    3,
    'Topic Selection',
    'Define the topic and research parameters',
    'Gather information about what the user wants to write about, their target audience, and what angle they want to take.',
    'user_input',
    'gate',
    '[
        {"name": "topic", "type": "textarea", "label": "What topic do you want to write about?", "required": true, "placeholder": "e.g., The future of AI in manufacturing"},
        {"name": "target_audience", "type": "text", "label": "Who is your target audience?", "required": true, "placeholder": "e.g., Manufacturing executives, CTOs"},
        {"name": "goal", "type": "select", "label": "What is your primary goal?", "required": true, "options": ["Establish thought leadership", "Generate leads", "Educate audience", "Drive engagement", "Build trust"]},
        {"name": "angle", "type": "textarea", "label": "What unique perspective or angle do you want to take?", "required": false, "placeholder": "What makes your viewpoint different?"},
        {"name": "key_points", "type": "textarea", "label": "Any key points you definitely want to include?", "required": false}
    ]'::JSONB,
    'topic_brief',
    'json'
)
ON CONFLICT DO NOTHING;

-- Step 4: Deep Research
INSERT INTO workflow_steps (
    id,
    workflow_id,
    step_number,
    name,
    description,
    instructions,
    step_type,
    execution_mode,
    skill_id,
    prompt_template,
    output_variable,
    output_format,
    requires_approval
) VALUES (
    'd0000001-0004-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000001',
    4,
    'Deep Research',
    'Conduct comprehensive research on the topic',
    'Use Perplexity to research the topic, find current data, trends, and expert perspectives.',
    'research',
    'review',
    'a1b2c3d4-0006-4000-8000-000000000001', -- deep-research
    'Research the following topic for a thought leadership article:

**Topic:** {{topic_brief.topic}}
**Target Audience:** {{topic_brief.target_audience}}
**Goal:** {{topic_brief.goal}}
**Angle:** {{topic_brief.angle}}

Please research:
1. Current state of this topic (latest data, statistics)
2. Key trends and developments
3. Expert perspectives and notable voices
4. Common challenges and pain points
5. Emerging solutions and innovations
6. Relevant case studies or examples

Focus on credible sources and include citations.',
    'research_findings',
    'markdown',
    true
)
ON CONFLICT DO NOTHING;

-- Phase 3: Strategy

-- Step 5: Content Strategy
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
    'd0000001-0005-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000001',
    5,
    'Content Strategy Development',
    'Develop the content strategy and outline',
    'Based on research, develop a comprehensive content strategy including key messages, structure, and differentiation.',
    'agent_chat',
    'review',
    NULL, -- Uses default agent
    'Based on this research and brief, develop a content strategy:

**Topic Brief:**
- Topic: {{topic_brief.topic}}
- Audience: {{topic_brief.target_audience}}
- Goal: {{topic_brief.goal}}
- Angle: {{topic_brief.angle}}
- Key points: {{topic_brief.key_points}}

**Research Findings:**
{{research_findings}}

Please provide:
1. **Core Thesis**: The main argument or perspective (1-2 sentences)
2. **Key Messages**: 3-5 key takeaways for the reader
3. **Unique Angle**: How this differs from existing content on the topic
4. **Article Structure**: Recommended outline with sections
5. **Supporting Evidence**: Which research findings to highlight
6. **Call to Action**: What should readers do after reading?
7. **Recommended Format**: Long-form (2000+), Medium (1000-1500), or Short (500-800)',
    'content_strategy',
    'markdown',
    true
)
ON CONFLICT DO NOTHING;

-- Step 6: Strategy Approval Gate
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
    'd0000001-0006-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000001',
    6,
    'Strategy Approval',
    'Review and approve the content strategy before writing',
    'Present the content strategy for review. User can approve, request changes, or provide additional direction.',
    'human_gate',
    'gate',
    'Please review the content strategy above. Does this direction work for you? You can approve to proceed, or provide feedback for revisions.',
    true,
    'strategy_approved'
)
ON CONFLICT DO NOTHING;

-- Phase 4: Creation

-- Step 7: Article Writing
INSERT INTO workflow_steps (
    id,
    workflow_id,
    step_number,
    name,
    description,
    instructions,
    step_type,
    execution_mode,
    skill_id,
    prompt_template,
    output_variable,
    output_format,
    requires_approval
) VALUES (
    'd0000001-0007-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000001',
    7,
    'Write Article',
    'Write the full thought leadership article',
    'Write the complete article following the approved strategy, voice DNA, and brand guidelines.',
    'skill_execution',
    'review',
    NULL, -- Main agent with context
    'Write a thought leadership article based on this strategy:

**Content Strategy:**
{{content_strategy}}

**Research to incorporate:**
{{research_findings}}

**Requirements:**
- Follow the brand voice and guidelines
- Use the recommended structure from the strategy
- Include specific data and examples from research
- Make it actionable and valuable for the target audience
- End with a clear takeaway or call to reflection

Write the complete article now.',
    'article_draft',
    'markdown',
    true
)
ON CONFLICT DO NOTHING;

-- Step 8: Article Review & Revision
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
    'd0000001-0008-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000001',
    8,
    'Article Review',
    'Review the draft and request any revisions',
    'Present the article draft for review. User can approve, request edits, or provide specific feedback.',
    'human_gate',
    'gate',
    'Please review the article draft above. You can approve it as-is, or provide feedback for revisions.',
    true,
    'article_approved'
)
ON CONFLICT DO NOTHING;

-- Step 9: AI-Optimize Article
INSERT INTO workflow_steps (
    id,
    workflow_id,
    step_number,
    name,
    description,
    instructions,
    step_type,
    execution_mode,
    skill_id,
    prompt_template,
    output_variable,
    output_format
) VALUES (
    'd0000001-0009-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000001',
    9,
    'AI-Optimize Article',
    'Create AI-optimized version for knowledge base',
    'Transform the approved article into AI-optimized format with metadata and self-contained sections.',
    'skill_execution',
    'auto',
    'a1b2c3d4-0002-4000-8000-000000000001', -- ai-article-formatter
    'Format this article for AI-optimized retrieval:

{{article_draft}}

Apply the AI Article Formatter skill to create a version with:
- Full YAML front matter
- Self-contained paragraphs
- Inline definitions
- Context markers
- Semantic section structure',
    'article_ai_optimized',
    'markdown'
)
ON CONFLICT DO NOTHING;

-- Phase 5: Distribution

-- Step 10: Generate LinkedIn Posts
INSERT INTO workflow_steps (
    id,
    workflow_id,
    step_number,
    name,
    description,
    instructions,
    step_type,
    execution_mode,
    skill_id,
    prompt_template,
    output_variable,
    output_format,
    requires_approval
) VALUES (
    'd0000001-0010-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000001',
    10,
    'Generate LinkedIn Posts',
    'Create 5 LinkedIn posts for the week',
    'Generate promotional LinkedIn posts following the weekly article package format.',
    'skill_execution',
    'review',
    'a1b2c3d4-0003-4000-8000-000000000001', -- weekly-article-package
    'Generate 5 LinkedIn posts to promote this article:

**Article:**
{{article_draft}}

**Content Strategy:**
{{content_strategy}}

Create one post for each weekday:
- Monday: Insight Launch (lead with core insight)
- Tuesday: Problem Spotlight (highlight pain point)
- Wednesday: Framework Reveal (share key framework)
- Thursday: Story/Example (case study or story)
- Friday: Call to Reflect (philosophical question)

Each post should:
- Be under 1,300 characters
- Have a compelling hook
- Include 3-5 relevant hashtags
- Include a clear CTA',
    'linkedin_posts',
    'markdown',
    true
)
ON CONFLICT DO NOTHING;

-- Step 11: Final Package Review
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
    'd0000001-0011-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000001',
    11,
    'Final Package Review',
    'Review the complete content package',
    'Present the full package (article + AI version + LinkedIn posts) for final approval.',
    'human_gate',
    'gate',
    'Your complete thought leadership package is ready! Review all components above. Would you like to generate additional artifacts (DOCX, PPTX)?',
    true,
    'package_approved'
)
ON CONFLICT DO NOTHING;

-- Phase 6: Artifacts (Optional)

-- Step 12: Generate Additional Artifacts
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
    condition
) VALUES (
    'd0000001-0012-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000001',
    12,
    'Generate Artifacts',
    'Optionally generate DOCX and/or PPTX versions',
    'Based on user selection, generate Word document and/or PowerPoint presentation versions of the content.',
    'artifact_generation',
    'review',
    '[
        {"name": "generate_docx", "type": "boolean", "label": "Generate Word Document?", "required": false, "default": false},
        {"name": "generate_pptx", "type": "boolean", "label": "Generate Presentation?", "required": false, "default": false},
        {"name": "pptx_slides", "type": "number", "label": "Number of slides (if generating presentation)", "required": false, "default": 10}
    ]'::JSONB,
    'artifacts_generated',
    'json',
    'package_approved === true'
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
    WHERE workflow_id = 'f0000001-0000-4000-8000-000000000001';

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'THOUGHT LEADERSHIP WORKFLOW CREATED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Workflow: Thought Leadership Content Pipeline';
    RAISE NOTICE 'Total Steps: %', step_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Phases:';
    RAISE NOTICE '  1. Prerequisites (Steps 1-2): Brand & Voice setup';
    RAISE NOTICE '  2. Research (Steps 3-4): Topic & Deep research';
    RAISE NOTICE '  3. Strategy (Steps 5-6): Content strategy & approval';
    RAISE NOTICE '  4. Creation (Steps 7-9): Write, review, AI-optimize';
    RAISE NOTICE '  5. Distribution (Steps 10-11): LinkedIn posts & review';
    RAISE NOTICE '  6. Artifacts (Step 12): Optional DOCX/PPTX';
    RAISE NOTICE '';
    RAISE NOTICE 'Human Gates: Steps 1, 2, 3, 6, 8, 11';
    RAISE NOTICE 'Review Steps: Steps 4, 5, 7, 10, 12';
    RAISE NOTICE 'Auto Steps: Step 9';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
