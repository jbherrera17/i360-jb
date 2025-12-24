-- ============================================================
-- INSIGHT 360 - THOUGHT LEADERSHIP ACTION
-- Complete action definition with Integrity integration
-- Run AFTER: phase4-schema.sql, phase4.1-action-parthenon.sql
-- ============================================================

-- ============================================
-- UPDATE THOUGHT LEADERSHIP TEMPLATE
-- Enhanced version with Integrity integration
-- ============================================

UPDATE action_templates SET
    description = 'Create authentic thought leadership content that builds trust, aligns with brand values, and passes the Front Page Test. Integrates with Integrity system for values-aligned output.',
    context_assets = '["voice_dna", "icp", "why_we_win", "thought_leadership_topics", "core_values", "bright_lines"]'::jsonb,
    parthenon_context = '{
        "departments": ["marketing", "executive"],
        "roles": ["content_strategist", "marketing_director", "ceo", "founder"],
        "requires_okrs": true,
        "okr_relationship": "supports"
    }'::jsonb,
    ai_engine = '{
        "type": "native",
        "native": {
            "model": "claude-sonnet-4-5-20250929",
            "temperature": 0.7,
            "max_tokens": 4096,
            "system_prompt": "You are an expert thought leadership content strategist and writer. Your role is to create authentic, valuable content that establishes the organization as a trusted voice in their industry.\n\nYOUR GUIDING PRINCIPLES:\n\n1. AUTHENTICITY OVER VIRALITY\n- Content must reflect genuine expertise and perspective\n- Never sacrifice accuracy for engagement\n- Avoid clickbait, exaggeration, or sensationalism\n- Every claim must be supportable\n\n2. VALUE CREATION\n- Lead with insight, not self-promotion\n- Teach something useful in every piece\n- Respect the reader''s time and intelligence\n- Quality over quantity, depth over breadth\n\n3. INTEGRITY ALIGNMENT\n- All content must pass the Front Page Test: \"Would we be comfortable if this appeared on the front page of a major publication?\"\n- Never cross Bright Lines (ethical boundaries)\n- Content should reinforce, not undermine, stated values\n- Consider: What would our best customers think of this?\n\n4. BRAND VOICE CONSISTENCY\n- Match the VoiceDNA guidelines precisely\n- Maintain consistent personality across formats\n- Avoid forbidden phrases and style violations\n- Use signature phrases naturally, not forced\n\n5. AUDIENCE-CENTRIC APPROACH\n- Write for the ICP''s actual problems and goals\n- Use language they use, not jargon they don''t\n- Address objections preemptively with evidence\n- Meet them where they are in their journey\n\nCONTENT CREATION WORKFLOW:\n\n1. TOPIC IDEATION: Generate topics that:\n   - Align with thought leadership themes\n   - Address ICP pain points\n   - Showcase unique perspective (Why We Win)\n   - Support current OKRs\n\n2. OUTLINE DEVELOPMENT: Structure that:\n   - Opens with a hook relevant to the audience\n   - Delivers value in the first 20%\n   - Builds logical argument with evidence\n   - Ends with actionable takeaway\n\n3. CONTENT DRAFTING: Writing that:\n   - Follows VoiceDNA guidelines exactly\n   - Includes specific examples and data\n   - Maintains consistent tone throughout\n   - Respects format-specific constraints\n\n4. INTEGRITY CHECK: Before finalizing:\n   - Front Page Test: Defensible if public?\n   - Bright Lines: Any ethical concerns?\n   - Values Alignment: Reflects who we are?\n   - Competitor Test: Fair and accurate?\n\nOUTPUT FORMATS:\n- LinkedIn Post (100-300 words, hook-first)\n- Blog Article (800-1500 words, structured)\n- Newsletter (500-800 words, conversational)\n- Twitter/X Thread (5-10 tweets, punchy)\n- Speaking Points (bullet format, expandable)\n\nAlways provide:\n- Content in requested format\n- Integrity assessment (pass/watch/flag)\n- Suggested variations or A/B options\n- Distribution recommendations"
        }
    }'::jsonb,
    ux_config = '{
        "layout": "workflow",
        "components": [
            {
                "id": "topic_ideation",
                "type": "generator",
                "title": "Topic Ideas",
                "description": "Generate thought leadership topics aligned with your themes",
                "inputs": [
                    {"id": "theme", "type": "select", "label": "Primary Theme", "source": "thought_leadership_topics.primary_themes"},
                    {"id": "format", "type": "select", "label": "Content Format", "options": ["linkedin", "blog", "newsletter", "twitter", "speaking"]},
                    {"id": "angle", "type": "text", "label": "Specific Angle (optional)", "placeholder": "Any particular perspective or hook?"}
                ],
                "output": "topic_suggestions"
            },
            {
                "id": "content_drafting",
                "type": "editor",
                "title": "Draft Content",
                "description": "Create and refine your thought leadership piece",
                "inputs": [
                    {"id": "topic", "type": "text", "label": "Topic/Title", "required": true},
                    {"id": "format", "type": "select", "label": "Format", "options": ["linkedin", "blog", "newsletter", "twitter", "speaking"]},
                    {"id": "key_points", "type": "textarea", "label": "Key Points to Include (optional)"},
                    {"id": "tone_adjustment", "type": "select", "label": "Tone Adjustment", "options": ["standard", "more_casual", "more_formal", "provocative", "educational"]}
                ],
                "output": "draft_content"
            },
            {
                "id": "integrity_check",
                "type": "validator",
                "title": "Integrity Check",
                "description": "Validate content against values and ethical guidelines",
                "inputs": [
                    {"id": "content", "type": "content_ref", "source": "draft_content"}
                ],
                "output": "integrity_report",
                "display": {
                    "show_score": true,
                    "show_flags": true,
                    "show_suggestions": true
                }
            },
            {
                "id": "variation_generator",
                "type": "generator",
                "title": "Variations",
                "description": "Generate alternative versions for testing",
                "inputs": [
                    {"id": "content", "type": "content_ref", "source": "draft_content"},
                    {"id": "variation_type", "type": "select", "label": "Variation Type", "options": ["hook", "tone", "length", "cta"]}
                ],
                "output": "variations"
            }
        ],
        "settings": {
            "auto_integrity_check": true,
            "show_context_panel": true,
            "enable_versioning": true
        }
    }'::jsonb,
    tags = ARRAY['content', 'marketing', 'thought-leadership', 'integrity', 'brand']
WHERE slug = 'thought-leadership';

-- ============================================
-- CREATE SAMPLE ACTION INSTANCE
-- For testing and demonstration
-- ============================================

-- Note: This creates a system-level action instance
-- Users will clone this or create from template

INSERT INTO actions (
    id,
    user_id,
    name,
    slug,
    description,
    icon,
    color,
    suite,
    context_assets,
    parthenon_context,
    ai_engine,
    ux_config,
    status,
    is_public,
    is_featured
) VALUES (
    'a1000000-0000-0000-0001-000000000001',
    NULL,  -- System action
    'Thought Leadership Studio',
    'thought-leadership-studio',
    'Create authentic thought leadership content that builds trust and aligns with your values. Includes topic ideation, drafting, integrity checking, and variation generation.',
    'lightbulb',
    '#8b5cf6',
    'execute',
    '["voice_dna", "icp", "why_we_win", "thought_leadership_topics", "core_values", "bright_lines"]'::jsonb,
    '{
        "departments": ["marketing", "executive"],
        "roles": ["content_strategist", "marketing_director", "ceo", "founder"],
        "requires_okrs": true,
        "okr_relationship": "supports"
    }'::jsonb,
    '{
        "type": "native",
        "native": {
            "model": "claude-sonnet-4-5-20250929",
            "temperature": 0.7,
            "max_tokens": 4096,
            "system_prompt": "You are an expert thought leadership content strategist and writer. Your role is to create authentic, valuable content that establishes the organization as a trusted voice in their industry.\n\nYOUR GUIDING PRINCIPLES:\n\n1. AUTHENTICITY OVER VIRALITY\n- Content must reflect genuine expertise and perspective\n- Never sacrifice accuracy for engagement\n- Avoid clickbait, exaggeration, or sensationalism\n- Every claim must be supportable\n\n2. VALUE CREATION\n- Lead with insight, not self-promotion\n- Teach something useful in every piece\n- Respect the reader''s time and intelligence\n- Quality over quantity, depth over breadth\n\n3. INTEGRITY ALIGNMENT\n- All content must pass the Front Page Test\n- Never cross Bright Lines (ethical boundaries)\n- Content should reinforce stated values\n- Consider: What would our best customers think?\n\n4. BRAND VOICE CONSISTENCY\n- Match the VoiceDNA guidelines precisely\n- Maintain consistent personality across formats\n- Avoid forbidden phrases and style violations\n\n5. AUDIENCE-CENTRIC APPROACH\n- Write for the ICP''s actual problems and goals\n- Use language they use, not jargon they don''t\n- Address objections preemptively with evidence\n\nAlways provide:\n- Content in requested format\n- Integrity assessment (pass/watch/flag)\n- Suggested variations\n- Distribution recommendations"
        }
    }'::jsonb,
    '{
        "layout": "workflow",
        "components": ["topic_ideation", "content_drafting", "integrity_check", "variation_generator"],
        "settings": {
            "auto_integrity_check": true,
            "show_context_panel": true
        }
    }'::jsonb,
    'active',
    true,
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ai_engine = EXCLUDED.ai_engine,
    ux_config = EXCLUDED.ux_config,
    updated_at = NOW();

-- ============================================
-- LINK ACTION TO PARTHENON ELEMENTS
-- Connect to context assets and roles
-- ============================================

-- Link to context assets (using the template IDs we created)
INSERT INTO action_context_assets (action_id, asset_id, injection_mode, priority, is_required)
SELECT
    'a1000000-0000-0000-0001-000000000001'::uuid,
    id,
    CASE
        WHEN asset_type IN ('voice_dna', 'core_values') THEN 'always'
        WHEN asset_type = 'bright_lines' THEN 'always'
        ELSE 'on_demand'
    END,
    CASE
        WHEN asset_type = 'voice_dna' THEN 100
        WHEN asset_type = 'core_values' THEN 95
        WHEN asset_type = 'bright_lines' THEN 90
        WHEN asset_type = 'icp' THEN 85
        WHEN asset_type = 'thought_leadership_topics' THEN 80
        WHEN asset_type = 'why_we_win' THEN 75
        ELSE 50
    END,
    asset_type IN ('voice_dna', 'icp')
FROM context_assets
WHERE asset_type IN ('voice_dna', 'icp', 'why_we_win', 'thought_leadership_topics', 'core_values', 'bright_lines')
AND is_current = true
ON CONFLICT (action_id, asset_id) DO NOTHING;

-- ============================================
-- ADD THOUGHT LEADERSHIP PROCESSES
-- Optional: Link to standard processes
-- ============================================

-- Create a thought leadership process if it doesn't exist
INSERT INTO processes (
    id,
    user_id,
    name,
    description,
    icon,
    type,
    steps,
    status,
    tags
) VALUES (
    'b1000000-0000-0000-0001-000000000001',
    NULL,
    'Thought Leadership Content Workflow',
    'Standard process for creating and publishing thought leadership content',
    'pen-tool',
    'workflow',
    '[
        {"step": 1, "name": "Topic Selection", "description": "Choose topic from strategic themes", "owner": "content_strategist"},
        {"step": 2, "name": "Research & Outline", "description": "Gather supporting data and structure content", "owner": "content_strategist"},
        {"step": 3, "name": "Draft Creation", "description": "Write first draft using brand voice", "owner": "content_strategist"},
        {"step": 4, "name": "Integrity Review", "description": "Check against values and bright lines", "owner": "integrity_auditor"},
        {"step": 5, "name": "Stakeholder Review", "description": "Get feedback from subject matter expert", "owner": "marketing_director"},
        {"step": 6, "name": "Final Edit", "description": "Polish and prepare for publication", "owner": "content_strategist"},
        {"step": 7, "name": "Publication", "description": "Publish to appropriate channels", "owner": "content_strategist"},
        {"step": 8, "name": "Performance Tracking", "description": "Monitor engagement and impact", "owner": "marketing_director"}
    ]'::jsonb,
    'active',
    ARRAY['content', 'thought-leadership', 'marketing']
)
ON CONFLICT (id) DO NOTHING;

-- Link action to process
INSERT INTO action_processes (action_id, process_id, relationship, is_required, priority)
VALUES (
    'a1000000-0000-0000-0001-000000000001',
    'b1000000-0000-0000-0001-000000000001',
    'executes',
    false,
    80
)
ON CONFLICT (action_id, process_id) DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    action_exists BOOLEAN;
    template_updated BOOLEAN;
    asset_links INTEGER;
BEGIN
    SELECT EXISTS(SELECT 1 FROM actions WHERE id = 'a1000000-0000-0000-0001-000000000001') INTO action_exists;
    SELECT EXISTS(SELECT 1 FROM action_templates WHERE slug = 'thought-leadership') INTO template_updated;
    SELECT COUNT(*) INTO asset_links FROM action_context_assets WHERE action_id = 'a1000000-0000-0000-0001-000000000001';

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'THOUGHT LEADERSHIP ACTION CREATED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Action instance created: %', action_exists;
    RAISE NOTICE 'Template updated: %', template_updated;
    RAISE NOTICE 'Context asset links: %', asset_links;
    RAISE NOTICE '';
    RAISE NOTICE 'Action Features:';
    RAISE NOTICE '  - Topic Ideation from strategic themes';
    RAISE NOTICE '  - Content Drafting with brand voice';
    RAISE NOTICE '  - Integrity Check (Front Page Test)';
    RAISE NOTICE '  - Variation Generator for A/B testing';
    RAISE NOTICE '';
    RAISE NOTICE 'Required Context Assets:';
    RAISE NOTICE '  - voice_dna (brand voice guidelines)';
    RAISE NOTICE '  - icp (ideal customer profile)';
    RAISE NOTICE '  - why_we_win (competitive differentiation)';
    RAISE NOTICE '  - thought_leadership_topics (strategic themes)';
    RAISE NOTICE '  - core_values (organizational values)';
    RAISE NOTICE '  - bright_lines (ethical boundaries)';
    RAISE NOTICE '';
    RAISE NOTICE 'Integrity Integration:';
    RAISE NOTICE '  - Auto integrity check enabled';
    RAISE NOTICE '  - Front Page Test on all outputs';
    RAISE NOTICE '  - Bright Lines validation';
    RAISE NOTICE '  - Values alignment scoring';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
