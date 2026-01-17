-- ============================================================
-- INSIGHT 360 - THOUGHT LEADERSHIP PROFILE SEED DATA
-- Migrated from Content Creation System: Synergi/Architecture
-- Version: 1.0 | January 2026
-- Run AFTER: phase24-thought-leadership-schema.sql
-- ============================================================

-- ============================================================
-- THOUGHT LEADERSHIP PROFILE
-- Values-Driven AI Ecosystem Design for SMEs
-- ============================================================

-- Note: Replace 'your-user-uuid-here' with actual user ID
-- For demo/dev, we use a deterministic UUID

INSERT INTO thought_leadership_profiles (
    id,
    user_id,
    core_thesis,
    atomic_claim,
    positioning_framework,
    setup_completed,
    setup_step,
    setup_data,
    default_publish_targets,
    weekly_publish_day,
    status,
    created_at,
    updated_at
)
VALUES (
    'b0000001-0000-4000-b000-000000000001',
    NULL, -- Set to actual user_id when available

    -- Core Thesis (full paragraph)
    'To effectively, safely and ethically use AI, applications need to implement an analog and digital alignment strategy to ensure artificial intelligence and human decision-making and hybrid AI/human actions are consistent. That consistency will benefit the organization because human resources will know what and how to act, and customers will know the brand promise of the company. This knowledge creates a self-selecting ability for the customer — when the prospect or customer knows the core values and brand promise and how the company will react under normal circumstances and under stress, they can make informed decisions about products and services. Values-Driven AI Ecosystem Design for SMEs is an emerging discipline focused on designing interconnected AI systems grounded in a company''s core values, mission, and ethical principles — ensuring that automation, intelligence, and human workflows reinforce integrity, trust, and long-term growth.',

    -- Atomic Claim (single memorable sentence)
    'Where values become the operating system of intelligence.',

    -- Positioning Framework (full JSON document)
    '{
        "category_name": "Values-Driven AI Ecosystem Design for SMEs",
        "short_definition": "An emerging discipline focused on designing interconnected AI systems grounded in a company''s core values, mission, and ethical principles.",
        "long_definition": "Values-Driven AI Ecosystem Design for SMEs helps small and midsize enterprises integrate AI in a way that amplifies human brilliance, enhances decision-making, and aligns every digital process with the moral and cultural DNA of the business.",
        "core_belief": "Technology should serve human values, not erode them.",
        "positioning_statement": "We design AI ecosystems that reflect what your company stands for. Because in a world racing toward automation, the true competitive advantage isn''t faster algorithms — it''s aligned intelligence.",
        "core_philosophy": [
            {"principle": "Values Before Variables", "description": "Technology should adapt to human values, not the other way around. Every AI system begins with moral intent."},
            {"principle": "Ecosystem Over Isolation", "description": "Intelligence grows stronger through interconnection. Each AI agent learns and contributes within a governed ecosystem."},
            {"principle": "Ethics as Architecture", "description": "Integrity isn''t an afterthought — it''s built into the design of data, dialogue, and decisions."},
            {"principle": "Human Brilliance, Amplified", "description": "AI''s role is to extend human capacity, insight, and creativity — never to replace it."},
            {"principle": "Sustainable Growth by Design", "description": "True progress measures not just profit, but the preservation of dignity, trust, and long-term community impact."}
        ],
        "taglines": {
            "primary": "Where values become the operating system of intelligence.",
            "strategic": "Designing AI that thinks ethically and grows sustainably.",
            "philosophical": "Technology that remembers what it means to be human."
        },
        "elevator_pitch": {
            "short_10s": "We help small and midsize businesses design AI ecosystems grounded in their values — systems that think ethically, perform intelligently, and grow sustainably.",
            "medium_30s": "Most AI today is built around efficiency. We start with integrity. Values-Driven AI Ecosystem Design helps SMEs build AI systems that reflect their purpose, protect their culture, and perform with principle.",
            "long_60s": "At Insight Driven Business, we believe technology should serve human brilliance, not replace it. That''s why our work in Values-Driven AI Ecosystem Design for SMEs begins with your values, your mission, and the promises you make to your people and customers — then builds AI ecosystems that honor those commitments at every level of operation."
        },
        "differentiation": {
            "typical_approach": ["Begins with compliance mandates", "Built for large enterprises", "Emphasizes risk reduction", "Focuses on AI fairness metrics", "Reactive governance layer"],
            "our_approach": ["Begins with moral conviction and company purpose", "Tailored for SME agility", "Emphasizes ethical growth and creative alignment", "Focuses on human dignity and organizational trust", "Proactive values-embedded architecture"]
        },
        "signature_messaging": {
            "purpose": "To humanize AI by embedding timeless values into modern systems.",
            "promise": "We help businesses create AI ecosystems that are ethical, aligned, and intelligently scalable.",
            "proof": "Grounded in business fundamentals, human psychology, and systems thinking, our frameworks are designed for SMEs who want integrity and performance to coexist.",
            "perspective": "The future of AI isn''t about replacing human intelligence — it''s about cultivating it."
        },
        "visual_identity": {
            "color_palette": {"navy": "#062596", "gold": "#FBBA44", "white": "#FFFFFF"},
            "typography": {"body": "Source Sans 3", "headers": "Orbitron"},
            "imagery_style": "Clean, human-tech fusion — overlapping human silhouettes with network lines",
            "symbolism": "Circular or ecosystem motifs suggesting wholeness, alignment, and systems integration"
        },
        "annual_theme_2026": "From Alignment to Action — Building AI That Reflects Who You Are"
    }'::jsonb,

    -- Setup Progress
    true,  -- setup_completed
    12,    -- setup_step (all steps done)

    -- Setup Data (discovery session results)
    '{
        "niche_discovery": {
            "completed_at": "2025-12-21",
            "domain": "AI Ethics & Governance for SMEs",
            "unique_angle": "Values-first approach vs compliance-first"
        },
        "visibility_research": {
            "completed_at": "2025-12-21",
            "visibility_score": 45,
            "topics_associated": ["AI alignment", "values-driven business", "SME technology"],
            "growth_opportunities": ["thought leadership content", "speaking engagements", "LLM citation building"]
        },
        "content_pillars_defined": true,
        "calendar_created": true
    }'::jsonb,

    -- Publishing Configuration
    ARRAY['substack', 'linkedin', 'website'],
    'tuesday',
    'active',

    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    core_thesis = EXCLUDED.core_thesis,
    atomic_claim = EXCLUDED.atomic_claim,
    positioning_framework = EXCLUDED.positioning_framework,
    setup_completed = EXCLUDED.setup_completed,
    setup_step = EXCLUDED.setup_step,
    setup_data = EXCLUDED.setup_data,
    status = EXCLUDED.status,
    updated_at = NOW();

-- ============================================================
-- CONTENT PILLARS (5 Strategic Pillars)
-- ============================================================

-- Pillar 1: Human-Aligned Intelligence
INSERT INTO content_pillars (
    id, user_id, profile_id,
    name, description, icon, color,
    quarterly_focus, monthly_themes,
    key_topics, hashtags, sample_titles,
    notion_pillar_value, sort_order, is_active
)
VALUES (
    'c0000001-0000-4000-c000-000000000001',
    NULL,
    'b0000001-0000-4000-b000-000000000001',
    'Human-Aligned Intelligence',
    'Systems designed to elevate human performance, not replace it. AI assistants that coach, support, and upskill employees.',
    'users',
    '#3b82f6',
    ARRAY['Q1', 'Q3'],
    '{
        "January": "The Humanity Question",
        "February": "The Alignment Imperative",
        "March": "Human-AI Collaboration",
        "July": "Personal Alignment",
        "September": "Behavioral Design for AI-Enabled Teams"
    }'::jsonb,
    ARRAY['human-AI collaboration', 'trust psychology', 'upskilling', 'judgment gap', 'wisdom vs intelligence'],
    ARRAY['#HumanAlignedAI', '#AIforHumans', '#LeadershipDevelopment', '#HumanBrilliance'],
    ARRAY[
        'Before We Talk About AI, We Must Talk About What It Means to Be Human',
        'The Judgment Gap: What AI Cannot Replicate',
        'Wisdom vs. Intelligence: Why SMEs Need Both',
        'Building Trust Between Teams and Their AI Tools',
        'The Human-in-the-Loop Imperative'
    ],
    'Human-Aligned Intelligence',
    1,
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    monthly_themes = EXCLUDED.monthly_themes,
    key_topics = EXCLUDED.key_topics,
    sample_titles = EXCLUDED.sample_titles,
    updated_at = NOW();

-- Pillar 2: Ethical Architecture
INSERT INTO content_pillars (
    id, user_id, profile_id,
    name, description, icon, color,
    quarterly_focus, monthly_themes,
    key_topics, hashtags, sample_titles,
    notion_pillar_value, sort_order, is_active
)
VALUES (
    'c0000001-0000-4000-c000-000000000002',
    NULL,
    'b0000001-0000-4000-b000-000000000001',
    'Ethical Architecture',
    'Business guardrails defined by moral principles and brand values. Built-in fairness, data integrity, transparency, and accountability.',
    'shield',
    '#10b981',
    ARRAY['Q2', 'Q4'],
    '{
        "April": "The Cost of Misalignment",
        "May": "Integrity as Foundation",
        "June": "Bright Lines and Guardrails",
        "November": "Governance at Scale"
    }'::jsonb,
    ARRAY['governance', 'bias prevention', 'responsible design', 'bright lines', 'integrity metrics'],
    ARRAY['#EthicsAsCode', '#ResponsibleAI', '#AIGovernance', '#IntegrityMetrics'],
    ARRAY[
        'Why Misaligned AI Creates Organizational Drift',
        'The Hidden Cost of Misalignment',
        'Ethics as Code: Embedding Values in AI Architecture',
        'Bright Lines: The Ethical Boundaries That Cannot Bend',
        'The Veto Power: When Humans Must Override the Algorithm'
    ],
    'Ethical Architecture',
    2,
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    monthly_themes = EXCLUDED.monthly_themes,
    key_topics = EXCLUDED.key_topics,
    sample_titles = EXCLUDED.sample_titles,
    updated_at = NOW();

-- Pillar 3: Ecosystem Intelligence
INSERT INTO content_pillars (
    id, user_id, profile_id,
    name, description, icon, color,
    quarterly_focus, monthly_themes,
    key_topics, hashtags, sample_titles,
    notion_pillar_value, sort_order, is_active
)
VALUES (
    'c0000001-0000-4000-c000-000000000003',
    NULL,
    'b0000001-0000-4000-b000-000000000001',
    'Ecosystem Intelligence',
    'Connected AI agents working across functions with shared governance. Marketing, Sales, and Operations AIs exchanging contextual data.',
    'network',
    '#8b5cf6',
    ARRAY['Q1', 'Q3'],
    '{
        "March": "Collaborative Systems",
        "August": "Connected Intelligence",
        "September": "Multi-Agent Design"
    }'::jsonb,
    ARRAY['agent interoperability', 'system design', 'feedback loops', 'multi-agent systems', 'context sharing'],
    ARRAY['#EcosystemAI', '#MultiAgentSystems', '#ConnectedIntelligence', '#AIArchitecture'],
    ARRAY[
        'The Aligned Ecosystem: When All Your AI Agents Share Values',
        'Context Is Everything: How Values Flow Through Multi-Agent Systems',
        'The Governance Layer: Who Watches the Watchers?',
        'Building Your First Values-Driven AI Agent',
        'Connected AI Leadership Playbook'
    ],
    'Ecosystem Intelligence',
    3,
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    monthly_themes = EXCLUDED.monthly_themes,
    key_topics = EXCLUDED.key_topics,
    sample_titles = EXCLUDED.sample_titles,
    updated_at = NOW();

-- Pillar 4: Values as Strategy
INSERT INTO content_pillars (
    id, user_id, profile_id,
    name, description, icon, color,
    quarterly_focus, monthly_themes,
    key_topics, hashtags, sample_titles,
    notion_pillar_value, sort_order, is_active
)
VALUES (
    'c0000001-0000-4000-c000-000000000004',
    NULL,
    'b0000001-0000-4000-b000-000000000001',
    'Values as Strategy',
    'Scalable, affordable, and operationally relevant frameworks. Modular AI agents customized to business maturity and resources.',
    'compass',
    '#f59e0b',
    ARRAY['Q2', 'Q3'],
    '{
        "April": "From Mission to Mechanism",
        "May": "Measuring What Matters",
        "August": "Strategic Integrity",
        "October": "The Leader''s Compass"
    }'::jsonb,
    ARRAY['brand ethics', 'mission translation', 'business rules', 'competitive advantage', 'trust premium'],
    ARRAY['#ValuesStrategy', '#IntegrityAsStrategy', '#PurposeDriven', '#TrustPremium'],
    ARRAY[
        'Integrity-as-Strategy: Your Competitive Advantage',
        'The Trust Premium: Why Aligned Companies Command Higher Prices',
        'The Self-Selecting Customer: When Values Attract the Right Clients',
        'From Mission to Mechanism: Embedding Values into Operations',
        'The Values Compass: Aligning AI Decisions with Human Principles'
    ],
    'Values as Strategy',
    4,
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    monthly_themes = EXCLUDED.monthly_themes,
    key_topics = EXCLUDED.key_topics,
    sample_titles = EXCLUDED.sample_titles,
    updated_at = NOW();

-- Pillar 5: Sustainable Growth
INSERT INTO content_pillars (
    id, user_id, profile_id,
    name, description, icon, color,
    quarterly_focus, monthly_themes,
    key_topics, hashtags, sample_titles,
    notion_pillar_value, sort_order, is_active
)
VALUES (
    'c0000001-0000-4000-c000-000000000005',
    NULL,
    'b0000001-0000-4000-b000-000000000001',
    'Sustainable Growth',
    'Technology decisions rooted in human flourishing and community impact. Balanced KPIs — profit, people, and purpose.',
    'trending-up',
    '#ef4444',
    ARRAY['Q4'],
    '{
        "October": "Beyond Revenue - Metrics of Meaning",
        "November": "Sustainable Practice",
        "December": "Integration and Vision"
    }'::jsonb,
    ARRAY['balanced scorecards', 'human capital impact', 'community ROI', 'triple bottom line', 'long-term growth'],
    ARRAY['#SustainableAI', '#TripleBottomLine', '#ProfitWithPurpose', '#ROIonIntegrity'],
    ARRAY[
        'The Triple Bottom Line of AI: Profit, People, and Purpose',
        'Redefining ROI: The Return on Integrity in AI-Driven Business',
        'The Rhythm of Alignment: Daily, Weekly, Quarterly Practices',
        'Building Your Integrity Scorecard',
        'Your 2027 Alignment Roadmap'
    ],
    'Sustainable Growth',
    5,
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    monthly_themes = EXCLUDED.monthly_themes,
    key_topics = EXCLUDED.key_topics,
    sample_titles = EXCLUDED.sample_titles,
    updated_at = NOW();

-- ============================================================
-- CONTENT CALENDAR ENTRIES (Q1 2026 - 12 weeks)
-- Full year has 52 entries; seeding Q1 as example
-- ============================================================

-- Week 1: January - Foundation Article
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000001',
    NULL,
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000001',
    'Before We Talk About AI, We Must Talk About What It Means to Be Human',
    'Philosophy Foundation - Cornerstone article establishing the human question that must precede all AI discussions.',
    '2026-01-06',
    1,
    2026,
    'article',
    'The Humanity Question',
    'Establish philosophical grounding for the entire content ecosystem',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 2: January - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000002',
    NULL,
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000001',
    'The Judgment Gap: What AI Cannot Replicate',
    'Explores human judgment, wisdom, and discernment - why these matter for business decisions.',
    '2026-01-13',
    2,
    2026,
    'article',
    'The Humanity Question',
    'Deepen understanding of human capabilities',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 3: January - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000003',
    NULL,
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000001',
    'Wisdom vs. Intelligence: Why SMEs Need Both',
    'Practical implications for small business - how to cultivate both in your organization.',
    '2026-01-20',
    3,
    2026,
    'article',
    'The Humanity Question',
    'Bridge philosophy to practical SME application',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 4: January - Practical
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000004',
    NULL,
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000001',
    'The Five Human Capabilities AI Will Never Replace',
    'Concise, shareable list with self-assessment tool.',
    '2026-01-27',
    4,
    2026,
    'article',
    'The Humanity Question',
    'Provide actionable takeaway and viral potential',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 5: February - Foundation (Manifesto)
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000005',
    NULL,
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000001',
    'AI Alignment Manifesto',
    'Values Declaration - Cornerstone manifesto declaring the principles of values-driven AI.',
    '2026-02-03',
    5,
    2026,
    'article',
    'The Alignment Imperative',
    'Establish authority and define the movement',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 6: February - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000006',
    NULL,
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000001',
    'The Two Operating Systems: Analog Values, Digital Execution',
    'How human values (analog) and AI systems (digital) must work in harmony.',
    '2026-02-10',
    6,
    2026,
    'article',
    'The Alignment Imperative',
    'Introduce the dual-system framework',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 7: February - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000007',
    NULL,
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000001',
    'Stated Values vs. Stress Values: The Gap That Kills Companies',
    'The difference between values on the wall and values under pressure.',
    '2026-02-17',
    7,
    2026,
    'article',
    'The Alignment Imperative',
    'Surface the hidden alignment problem',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 8: February - Practical
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000008',
    NULL,
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000001',
    'The Alignment Audit: 10 Questions Every CEO Should Ask',
    'Practical assessment tool for organizational alignment.',
    '2026-02-24',
    8,
    2026,
    'article',
    'The Alignment Imperative',
    'Provide actionable diagnostic',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 9: March - Foundation
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000009',
    NULL,
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000001',
    'AI in Service of Humanity: Returning Technology to Its Proper Place',
    'Vision article - Positioning cornerstone on the proper role of AI.',
    '2026-03-03',
    9,
    2026,
    'article',
    'Human-AI Collaboration',
    'Define the human-AI relationship paradigm',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 10: March - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000010',
    NULL,
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000001',
    'The Human-in-the-Loop Imperative: When to Pause the Algorithm',
    'When and why humans must intervene in AI processes.',
    '2026-03-10',
    10,
    2026,
    'article',
    'Human-AI Collaboration',
    'Establish governance principles',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 11: March - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000011',
    NULL,
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000001',
    'Building Trust Between Teams and Their AI Tools',
    'Practical strategies for fostering human-AI trust in organizations.',
    '2026-03-17',
    11,
    2026,
    'article',
    'Human-AI Collaboration',
    'Address trust barriers',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 12: March - Practical
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000012',
    NULL,
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000001',
    'The Hierarchy of AI Assistance: From Tool to Partner',
    'Framework for understanding AI maturity levels in business.',
    '2026-03-24',
    12,
    2026,
    'article',
    'Human-AI Collaboration',
    'Provide maturity model framework',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Verify profile
SELECT
    id,
    atomic_claim,
    setup_completed,
    status,
    created_at
FROM thought_leadership_profiles
WHERE id = 'b0000001-0000-4000-b000-000000000001';

-- Verify pillars
SELECT
    name,
    color,
    quarterly_focus,
    sort_order
FROM content_pillars
WHERE profile_id = 'b0000001-0000-4000-b000-000000000001'
ORDER BY sort_order;

-- Verify calendar entries
SELECT
    week_number,
    title,
    monthly_topic,
    status
FROM content_calendar_entries
WHERE profile_id = 'b0000001-0000-4000-b000-000000000001'
ORDER BY scheduled_date;

-- Summary counts
SELECT
    'Profile' as type, COUNT(*) as count
FROM thought_leadership_profiles
WHERE id = 'b0000001-0000-4000-b000-000000000001'
UNION ALL
SELECT
    'Pillars', COUNT(*)
FROM content_pillars
WHERE profile_id = 'b0000001-0000-4000-b000-000000000001'
UNION ALL
SELECT
    'Calendar Entries', COUNT(*)
FROM content_calendar_entries
WHERE profile_id = 'b0000001-0000-4000-b000-000000000001';
