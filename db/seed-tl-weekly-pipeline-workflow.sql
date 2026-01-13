-- ============================================
-- Insight 360 - TL Weekly Pipeline Workflow
-- Version: 1.0.0
-- Date: January 2026
-- Description: Recurring workflow for weekly thought leadership
--   content creation from calendar to published package
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
    'e1000001-0000-4000-8000-000000000011',
    'tl-weekly-pipeline',
    'Weekly Content Pipeline',
    'Recurring weekly workflow for creating thought leadership content: select topic from calendar, research, write article, generate LinkedIn posts, and sync to Notion.',
    'calendar',
    '#10b981',
    'thought_leadership',
    'execute',
    ARRAY['thought-leadership', 'weekly', 'article', 'linkedin', 'content'],
    ARRAY['voice_dna']::TEXT[],
    ARRAY['weekly-article-package', 'ai-article-formatter']::TEXT[],
    '{
        "phases": [
            {
                "name": "Planning",
                "description": "Select topic and prepare research",
                "steps": [1, 2]
            },
            {
                "name": "Creation",
                "description": "Write and review article",
                "steps": [3, 4, 5]
            },
            {
                "name": "Distribution",
                "description": "Generate promotional content",
                "steps": [6, 7]
            },
            {
                "name": "Publishing",
                "description": "Sync to Notion calendar",
                "steps": [8]
            }
        ],
        "default_execution_mode": "review",
        "is_recurring": true,
        "recurrence": "weekly"
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
    'f0000001-0000-4000-8000-000000000011',
    NULL,
    NULL,
    'Weekly Content Pipeline',
    'Recurring workflow for weekly thought leadership content. Creates article in multiple formats plus 5 LinkedIn posts.',
    'calendar',
    '#10b981',
    'thought_leadership',
    'execute',
    ARRAY['thought-leadership', 'weekly', 'article', 'linkedin', 'content'],
    90,
    true,
    true,
    true,
    'e1000001-0000-4000-8000-000000000011',
    '{
        "context_assets": ["voice_dna"],
        "profile_required": true,
        "message": "This workflow requires a completed TL profile with thesis, atomic claim, and content pillars. Run Niche Discovery first if not set up."
    }'::JSONB,
    '[
        {"type": "article_human", "format": "markdown", "description": "Human-readable thought leadership article"},
        {"type": "article_ai", "format": "markdown", "description": "AI-optimized version for knowledge base"},
        {"type": "linkedin_series", "format": "json", "description": "5 LinkedIn posts (Mon-Fri themed)"}
    ]'::JSONB
)
ON CONFLICT DO NOTHING;

-- ============================================
-- WORKFLOW CONTEXT ASSETS
-- ============================================
INSERT INTO workflow_context_assets (workflow_id, context_asset_type, is_required, inject_at_steps)
VALUES
    ('f0000001-0000-4000-8000-000000000011', 'voice_dna', true, ARRAY[3,6]),
    ('f0000001-0000-4000-8000-000000000011', 'core_thesis', false, ARRAY[2,3]),
    ('f0000001-0000-4000-8000-000000000011', 'atomic_claim', false, ARRAY[3,6]),
    ('f0000001-0000-4000-8000-000000000011', 'content_pillars', false, ARRAY[1,3,6]),
    ('f0000001-0000-4000-8000-000000000011', 'icp', false, ARRAY[2,3])
ON CONFLICT DO NOTHING;

-- ============================================
-- WORKFLOW STEPS
-- ============================================

-- Phase 1: Planning

-- Step 1: Select Topic from Calendar
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
    requires_approval
) VALUES (
    'd0000011-0001-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000011',
    1,
    'Select Topic from Calendar',
    'Choose this week''s topic from the content calendar',
    'Review the content calendar and select the topic for this week''s article.',
    'user_input',
    'gate',
    '[
        {"name": "calendar_entry_id", "type": "calendar_select", "label": "Select scheduled topic", "required": true, "source": "content_calendar"},
        {"name": "custom_topic", "type": "text", "label": "Or enter a custom topic", "required": false},
        {"name": "pillar", "type": "select", "label": "Content pillar", "required": true, "options_from": "content_pillars"},
        {"name": "article_format", "type": "select", "label": "Article format", "required": true, "options": ["long", "medium", "short"], "default": "medium"}
    ]'::JSONB,
    'selected_topic',
    'json',
    true
)
ON CONFLICT DO NOTHING;

-- Step 2: Deep Research
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
    'd0000011-0002-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000011',
    2,
    'Deep Research',
    'Research the topic for supporting evidence and current context',
    'Use web search to gather current data, trends, and examples related to the topic.',
    'agent_chat',
    'review',
    'a0000001-0000-4000-a000-000000000302', -- AI Visibility Researcher (has web search)
    'Research this thought leadership topic:

**Topic:** {{selected_topic.topic}}
**Pillar:** {{selected_topic.pillar}}
**Format:** {{selected_topic.article_format}}
**Core Thesis Context:** {{core_thesis_summary}}

Research requirements:
1. Current state and recent developments (last 6 months)
2. Key statistics and data points
3. Expert perspectives and notable quotes
4. Case studies or examples
5. Common misconceptions to address
6. Practical applications and implications

Focus on credible sources. Include citations.

Also note any angles that align with the core thesis.',
    'research_findings',
    'markdown',
    true
)
ON CONFLICT DO NOTHING;

-- Phase 2: Creation

-- Step 3: Write Article
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
    skill_id,
    prompt_template,
    output_variable,
    output_format,
    requires_approval
) VALUES (
    'd0000011-0003-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000011',
    3,
    'Write Article',
    'Generate the thought leadership article',
    'Write the article using the weekly-article-package skill, following Voice DNA.',
    'skill_execution',
    'review',
    'a0000001-0000-4000-a000-000000000304', -- TL Article Writer
    '50000001-0000-4000-a000-000000000401', -- weekly-article-package
    'Write a thought leadership article:

**Topic:** {{selected_topic.topic}}
**Pillar:** {{selected_topic.pillar}}
**Format:** {{selected_topic.article_format}}

**Research findings:**
{{research_findings}}

**Voice DNA:** Follow the brand voice profile exactly.

**Article requirements:**
- Format: {{selected_topic.article_format}} (long=2000+, medium=1000-1500, short=500-800)
- Hook opening that creates curiosity
- Clear thesis statement
- 3-5 supporting sections
- Specific examples from research
- Actionable takeaways
- Reflective close

**Pillar hashtags to consider:**
{{pillar_hashtags}}

Write the complete article now.',
    'article_draft',
    'markdown',
    true
)
ON CONFLICT DO NOTHING;

-- Step 4: Human Checkpoint - Article Review
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
    'd0000011-0004-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000011',
    4,
    'Article Review',
    'Review and approve the article draft',
    'Review the article for voice consistency, accuracy, and quality. Provide feedback if revisions needed.',
    'human_gate',
    'gate',
    '**CHECKPOINT: Article Review**

Please review the article draft above:

1. Does it sound like your authentic voice?
2. Is the information accurate and relevant?
3. Does it align with your core thesis?
4. Will it resonate with your target audience?

You can:
- Approve to continue
- Request revisions with specific feedback
- Edit directly and approve',
    true,
    'article_approved'
)
ON CONFLICT DO NOTHING;

-- Step 5: AI-Optimize Article
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
    'd0000011-0005-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000011',
    5,
    'AI-Optimize Article',
    'Create AI-optimized version for knowledge base',
    'Transform the approved article into AI-optimized format.',
    'skill_execution',
    'auto',
    '50000001-0000-4000-a000-000000000402', -- ai-article-formatter
    'Transform this article into AI-optimized format:

{{article_draft}}

Apply the AI Article Formatter skill:
- Add YAML front matter with metadata
- Restructure sections as questions
- Make paragraphs self-contained
- Add topic sentences to each section
- Include author attribution markers
- Add section summaries',
    'article_ai_optimized',
    'markdown'
)
ON CONFLICT DO NOTHING;

-- Phase 3: Distribution

-- Step 6: Generate LinkedIn Posts
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
    skill_id,
    prompt_template,
    output_variable,
    output_format,
    requires_approval
) VALUES (
    'd0000011-0006-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000011',
    6,
    'Generate LinkedIn Posts',
    'Create 5 LinkedIn posts for the week',
    'Generate the Mon-Fri themed LinkedIn post series.',
    'skill_execution',
    'review',
    'a0000001-0000-4000-a000-000000000305', -- TL LinkedIn Generator
    '50000001-0000-4000-a000-000000000401', -- weekly-article-package
    'Generate 5 LinkedIn posts for this article:

**Article:**
{{article_draft}}

**Voice DNA:** Match the author voice exactly.

**Daily Theme Framework:**
- **Monday (Insight Launch)**: Lead with the counterintuitive insight
- **Tuesday (Problem Spotlight)**: Highlight the pain point addressed
- **Wednesday (Framework Reveal)**: Share the practical how-to
- **Thursday (Story/Example)**: Make it concrete with narrative
- **Friday (Call to Reflect)**: End the week with meaning

**For each post:**
- Hook line under 10 words
- 150-250 words total
- End with engagement question
- Include 3-5 hashtags from pillar strategy

**Pillar hashtags:**
{{pillar_hashtags}}

Generate all 5 posts.',
    'linkedin_posts',
    'json',
    true
)
ON CONFLICT DO NOTHING;

-- Step 7: Human Checkpoint - Package Review
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
    'd0000011-0007-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000011',
    7,
    'Package Review',
    'Review the complete content package',
    'Final review of all generated content before syncing to Notion.',
    'human_gate',
    'gate',
    '**CHECKPOINT: Final Package Review**

Your weekly content package is ready:

1. **Article** (Human-readable)
2. **AI-Optimized Article** (Knowledge base version)
3. **5 LinkedIn Posts** (Mon-Fri themed)

Please review:
- Are the LinkedIn posts on-brand?
- Do the hashtags look right?
- Ready to sync to Notion calendar?

You can approve all, or request revisions to specific items.',
    true,
    'package_approved'
)
ON CONFLICT DO NOTHING;

-- Phase 4: Publishing

-- Step 8: Sync to Notion Calendar
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
    'd0000011-0008-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000011',
    8,
    'Sync to Notion',
    'Update Notion calendar entry with generated content',
    'Sync all generated content to the Notion calendar and update status.',
    'artifact_generation',
    'review',
    '[
        {"name": "update_status", "type": "select", "label": "Update calendar status to", "required": true, "options": ["ready", "published"], "default": "ready"},
        {"name": "add_article_to_page", "type": "boolean", "label": "Add article content to Notion page?", "required": true, "default": true},
        {"name": "save_outputs", "type": "boolean", "label": "Save outputs to local database?", "required": true, "default": true}
    ]'::JSONB,
    'Finalize weekly content pipeline:

1. **Update Calendar Entry:**
   - Entry ID: {{selected_topic.calendar_entry_id}}
   - New status: {{update_status}}

2. **Add Content to Notion Page** (if selected):
   - Article (human-readable)
   - AI-optimized version (in toggle)
   - LinkedIn posts (in toggle)

3. **Save to Database** (if selected):
   - article_draft → thought_leadership_outputs (type: article_human)
   - article_ai_optimized → thought_leadership_outputs (type: article_ai)
   - linkedin_posts → thought_leadership_outputs (type: linkedin_series)
   - Link all to calendar_entry_id

4. **Update Calendar Entry:**
   - Store article_markdown in entry
   - Store linkedin_posts in entry
   - Mark sync_status as synced

Return confirmation of all actions.',
    'sync_result',
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
    WHERE workflow_id = 'f0000001-0000-4000-8000-000000000011';

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'TL WEEKLY PIPELINE WORKFLOW CREATED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Workflow: Weekly Content Pipeline';
    RAISE NOTICE 'Total Steps: %', step_count;
    RAISE NOTICE 'Estimated Time: 60-90 minutes';
    RAISE NOTICE '';
    RAISE NOTICE 'Phases:';
    RAISE NOTICE '  1. Planning (Steps 1-2): Topic selection & research';
    RAISE NOTICE '  2. Creation (Steps 3-5): Write, review, AI-optimize';
    RAISE NOTICE '  3. Distribution (Steps 6-7): LinkedIn & package review';
    RAISE NOTICE '  4. Publishing (Step 8): Sync to Notion';
    RAISE NOTICE '';
    RAISE NOTICE 'Human Checkpoints: Steps 4, 7';
    RAISE NOTICE 'Auto Steps: Step 5';
    RAISE NOTICE '';
    RAISE NOTICE 'Agents Used:';
    RAISE NOTICE '  - AI Visibility Researcher (Step 2) - for research';
    RAISE NOTICE '  - TL Article Writer (Step 3)';
    RAISE NOTICE '  - TL LinkedIn Generator (Step 6)';
    RAISE NOTICE '';
    RAISE NOTICE 'Skills Used:';
    RAISE NOTICE '  - weekly-article-package (Steps 3, 6)';
    RAISE NOTICE '  - ai-article-formatter (Step 5)';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
