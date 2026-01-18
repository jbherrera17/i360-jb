-- ============================================================
-- INSIGHT 360 - THOUGHT LEADERSHIP CALENDAR Q2-Q4 2026
-- Continuation of seed-thought-leadership-profile.sql
-- Version: 1.0 | January 2026
-- Run AFTER: seed-thought-leadership-profile.sql
-- ============================================================

-- ============================================================
-- Q2 2026: ETHICAL ARCHITECTURE
-- Quarterly Theme: Building Integrity Into Every System
-- ============================================================

-- ----------------------------------------
-- APRIL: The Cost of Misalignment
-- ----------------------------------------

-- Week 13: April - Foundation
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000013',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000002', -- Ethical Architecture
    'Why Misaligned AI Creates Organizational Drift',
    'Foundation article on drift - How AI systems without value alignment slowly erode organizational culture and decision-making.',
    '2026-03-31',
    13,
    2026,
    'article',
    'The Cost of Misalignment',
    'Establish the business case for alignment',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 14: April - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000014',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000002',
    'The Invisible Erosion: How Small Compromises Compound',
    'The compound effect of minor alignment failures over time.',
    '2026-04-07',
    14,
    2026,
    'article',
    'The Cost of Misalignment',
    'Illustrate the hidden dangers',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 15: April - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000015',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000002',
    'The CEO''s Blind Spot: Owning What You Can''t See',
    'Leadership accountability for alignment across AI systems they may not fully understand.',
    '2026-04-14',
    15,
    2026,
    'article',
    'The Cost of Misalignment',
    'Target executive audience',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 16: April - Practical
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000016',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000002',
    'Five Warning Signs Your AI Is Drifting From Your Values',
    'Diagnostic checklist for detecting organizational drift caused by AI misalignment.',
    '2026-04-21',
    16,
    2026,
    'article',
    'The Cost of Misalignment',
    'Provide actionable diagnostic',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------
-- MAY: Integrity as Foundation
-- ----------------------------------------

-- Week 17: May - Foundation
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000017',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000002',
    'The Hidden Cost of Misalignment',
    'Cornerstone article on integrity metrics - Why integrity is the foundation of sustainable SME growth.',
    '2026-04-28',
    17,
    2026,
    'article',
    'Integrity as Foundation',
    'Quantify the cost of misalignment',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 18: May - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000018',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000002',
    'The Integrity Yield: A New Metric for AI-Era Leadership',
    'Introducing a new KPI for measuring values alignment in AI-augmented organizations.',
    '2026-05-05',
    18,
    2026,
    'article',
    'Integrity as Foundation',
    'Introduce new measurement framework',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 19: May - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000019',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000002',
    'Trust Velocity: Is Your Reputation Compounding or Eroding?',
    'How AI decisions affect the rate at which trust builds or decays with stakeholders.',
    '2026-05-12',
    19,
    2026,
    'article',
    'Integrity as Foundation',
    'Connect integrity to reputation',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 20: May - Practical
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000020',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000002',
    'The Close Call Log: Documenting the Crises That Didn''t Happen',
    'Practical tool for tracking near-misses and learning from what alignment prevented.',
    '2026-05-19',
    20,
    2026,
    'article',
    'Integrity as Foundation',
    'Provide tracking methodology',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------
-- JUNE: Bright Lines and Guardrails
-- ----------------------------------------

-- Week 21: June - Foundation
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000021',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000002',
    'Bright Lines: The Ethical Boundaries That Cannot Bend',
    'Defining the non-negotiable ethical boundaries for AI systems in your organization.',
    '2026-05-26',
    21,
    2026,
    'article',
    'Bright Lines and Guardrails',
    'Establish governance principles',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 22: June - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000022',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000002',
    'Ethics as Code: Embedding Values in AI Architecture',
    'Technical and organizational approaches to building ethics into AI system design.',
    '2026-06-02',
    22,
    2026,
    'article',
    'Bright Lines and Guardrails',
    'Bridge philosophy to implementation',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 23: June - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000023',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000002',
    'The Veto Power: When Humans Must Override the Algorithm',
    'Establishing clear protocols for human intervention in AI-driven processes.',
    '2026-06-09',
    23,
    2026,
    'article',
    'Bright Lines and Guardrails',
    'Define human override protocols',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 24: June - Practical
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000024',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000002',
    'Building Your Integrity Dashboard: A Step-by-Step Guide',
    'Practical guide to creating a dashboard that monitors alignment and ethical performance.',
    '2026-06-16',
    24,
    2026,
    'article',
    'Bright Lines and Guardrails',
    'Provide implementation guide',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Q3 2026: VALUES AS STRATEGY
-- Quarterly Theme: From Philosophy to Competitive Advantage
-- ============================================================

-- ----------------------------------------
-- JULY: Personal Alignment
-- ----------------------------------------

-- Week 25: July - Foundation
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000025',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000004', -- Values as Strategy
    'Master Your Minutes, Master Your Life',
    'Cornerstone article on personal alignment - Leadership begins with self-alignment.',
    '2026-06-23',
    25,
    2026,
    'article',
    'Personal Alignment',
    'Connect organizational to personal alignment',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 26: July - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000026',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000004',
    'The Leader''s Daily Alignment Practice',
    'Morning and evening rituals for maintaining personal and professional alignment.',
    '2026-06-30',
    26,
    2026,
    'article',
    'Personal Alignment',
    'Provide daily practices',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 27: July - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000027',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000004',
    'Decision Fatigue and the Aligned Mind',
    'How values-based decision frameworks reduce cognitive load and improve outcomes.',
    '2026-07-07',
    27,
    2026,
    'article',
    'Personal Alignment',
    'Address practical leadership challenge',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 28: July - Practical
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000028',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000004',
    'Time Integrity: Where Your Calendar Reveals Your Values',
    'Self-assessment tool for auditing whether time allocation matches stated values.',
    '2026-07-14',
    28,
    2026,
    'article',
    'Personal Alignment',
    'Provide self-assessment tool',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------
-- AUGUST: Strategic Integrity
-- ----------------------------------------

-- Week 29: August - Foundation
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000029',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000004',
    'Integrity-as-Strategy: Your Competitive Advantage',
    'Cornerstone article positioning integrity as a strategic differentiator, not just an ethical requirement.',
    '2026-07-21',
    29,
    2026,
    'article',
    'Strategic Integrity',
    'Reframe integrity as strategy',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 30: August - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000030',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000004',
    'The Trust Premium: Why Aligned Companies Command Higher Prices',
    'Economic analysis of how values alignment creates pricing power and customer loyalty.',
    '2026-07-28',
    30,
    2026,
    'article',
    'Strategic Integrity',
    'Quantify trust value',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 31: August - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000031',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000004',
    'The Self-Selecting Customer: When Values Attract the Right Clients',
    'How clear values communicate attract ideal customers while naturally filtering poor fits.',
    '2026-08-04',
    31,
    2026,
    'article',
    'Strategic Integrity',
    'Connect values to customer acquisition',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 32: August - Practical
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000032',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000004',
    'Calculating Your Return on Integrity',
    'Methodology for measuring ROI on values-driven AI investments.',
    '2026-08-11',
    32,
    2026,
    'article',
    'Strategic Integrity',
    'Provide ROI calculation framework',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------
-- SEPTEMBER: Ecosystem Intelligence
-- ----------------------------------------

-- Week 33: September - Foundation
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000033',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000003', -- Ecosystem Intelligence
    'The Aligned Ecosystem: When All Your AI Agents Share Values',
    'Vision for multi-agent AI systems that operate from shared ethical foundations.',
    '2026-08-18',
    33,
    2026,
    'article',
    'Ecosystem Intelligence',
    'Introduce ecosystem thinking',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 34: September - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000034',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000003',
    'Context Is Everything: How Values Flow Through Multi-Agent Systems',
    'Technical architecture for propagating values context across interconnected AI agents.',
    '2026-08-25',
    34,
    2026,
    'article',
    'Ecosystem Intelligence',
    'Explain context injection',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 35: September - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000035',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000003',
    'The Governance Layer: Who Watches the Watchers?',
    'Oversight mechanisms for ensuring AI ecosystems remain aligned over time.',
    '2026-09-01',
    35,
    2026,
    'article',
    'Ecosystem Intelligence',
    'Address governance challenges',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 36: September - Practical
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000036',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000003',
    'Building Your First Values-Driven AI Agent',
    'Step-by-step guide to designing an AI agent with embedded values from day one.',
    '2026-09-08',
    36,
    2026,
    'article',
    'Ecosystem Intelligence',
    'Provide implementation guide',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Q4 2026: SUSTAINABLE GROWTH
-- Quarterly Theme: Profit, Purpose, and the Long Game
-- ============================================================

-- ----------------------------------------
-- OCTOBER: Measuring What Matters
-- ----------------------------------------

-- Week 37: October - Foundation
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000037',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000005', -- Sustainable Growth
    'The Triple Bottom Line of AI: Profit, People, and Purpose',
    'Redefining success metrics for AI-augmented businesses beyond pure financial performance.',
    '2026-09-15',
    37,
    2026,
    'article',
    'Measuring What Matters',
    'Establish new success framework',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 38: October - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000038',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000005',
    'Leading Indicators: Your Early Warning System for Values Drift',
    'Metrics that predict alignment problems before they become crises.',
    '2026-09-22',
    38,
    2026,
    'article',
    'Measuring What Matters',
    'Provide predictive metrics',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 39: October - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000039',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000005',
    'The Counterfactual Question: What Didn''t Happen Because You Did Right?',
    'Measuring the value of prevented problems and maintained trust.',
    '2026-09-29',
    39,
    2026,
    'article',
    'Measuring What Matters',
    'Capture hidden value of integrity',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 40: October - Practical
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000040',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000005',
    'Building Your Integrity Scorecard',
    'Template and guide for creating a comprehensive integrity measurement system.',
    '2026-10-06',
    40,
    2026,
    'article',
    'Measuring What Matters',
    'Provide scorecard template',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------
-- NOVEMBER: Sustainable Practice
-- ----------------------------------------

-- Week 41: November - Foundation
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000041',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000005',
    'The Rhythm of Alignment: Daily, Weekly, Quarterly Practices',
    'Establishing sustainable cadences for maintaining organizational alignment.',
    '2026-10-13',
    41,
    2026,
    'article',
    'Sustainable Practice',
    'Provide practice framework',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 42: November - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000042',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000005',
    'The Values Clarification Session: A Facilitation Guide',
    'How to run effective team sessions for clarifying and reinforcing organizational values.',
    '2026-10-20',
    42,
    2026,
    'article',
    'Sustainable Practice',
    'Provide facilitation guide',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 43: November - Extension
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000043',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000005',
    'Training Your Team for Judgment, Not Just Compliance',
    'Moving from rule-following to values-based decision-making across the organization.',
    '2026-10-27',
    43,
    2026,
    'article',
    'Sustainable Practice',
    'Address training methodology',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 44: November - Practical
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000044',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000005',
    'The Annual Integrity Audit: A Comprehensive Checklist',
    'Year-end assessment tool for evaluating alignment across all dimensions.',
    '2026-11-03',
    44,
    2026,
    'article',
    'Sustainable Practice',
    'Provide audit checklist',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------
-- DECEMBER: Integration and Vision
-- ----------------------------------------

-- Week 45: December - Integration
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000045',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000005',
    'The Alignment Operating System: A Year in Review',
    'Comprehensive summary of the year''s journey through values-driven AI ecosystem design.',
    '2026-11-10',
    45,
    2026,
    'article',
    'Integration and Vision',
    'Synthesize the year''s learning',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 46: December - Case Study
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000046',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000005',
    'Case Study: Building a Values-Driven AI Ecosystem',
    'Real-world example of implementing values-driven AI across an organization.',
    '2026-11-17',
    46,
    2026,
    'article',
    'Integration and Vision',
    'Provide social proof',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 47: December - Vision
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000047',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000005',
    'The Future of Aligned Intelligence: What Comes Next',
    'Forward-looking vision for values-driven AI in 2027 and beyond.',
    '2026-11-24',
    47,
    2026,
    'article',
    'Integration and Vision',
    'Set future direction',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- Week 48: December - Practical
INSERT INTO content_calendar_entries (
    id, user_id, profile_id, pillar_id,
    title, description,
    scheduled_date, week_number, year,
    event_type, monthly_topic, goal, status,
    publish_substack, publish_li_personal, publish_website
)
VALUES (
    'd0000001-0000-4000-d000-000000000048',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'b0000001-0000-4000-b000-000000000001',
    'c0000001-0000-4000-c000-000000000005',
    'Your 2027 Alignment Roadmap: Planning the Year Ahead',
    'Practical planning guide for continuing the alignment journey in the new year.',
    '2026-12-01',
    48,
    2026,
    'article',
    'Integration and Vision',
    'Set up 2027 success',
    'planned',
    true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Count all calendar entries
SELECT
    'Q1 (Weeks 1-12)' as quarter,
    COUNT(*) as articles
FROM content_calendar_entries
WHERE profile_id = 'b0000001-0000-4000-b000-000000000001'
  AND week_number BETWEEN 1 AND 12
UNION ALL
SELECT
    'Q2 (Weeks 13-24)',
    COUNT(*)
FROM content_calendar_entries
WHERE profile_id = 'b0000001-0000-4000-b000-000000000001'
  AND week_number BETWEEN 13 AND 24
UNION ALL
SELECT
    'Q3 (Weeks 25-36)',
    COUNT(*)
FROM content_calendar_entries
WHERE profile_id = 'b0000001-0000-4000-b000-000000000001'
  AND week_number BETWEEN 25 AND 36
UNION ALL
SELECT
    'Q4 (Weeks 37-48)',
    COUNT(*)
FROM content_calendar_entries
WHERE profile_id = 'b0000001-0000-4000-b000-000000000001'
  AND week_number BETWEEN 37 AND 48
UNION ALL
SELECT
    'TOTAL',
    COUNT(*)
FROM content_calendar_entries
WHERE profile_id = 'b0000001-0000-4000-b000-000000000001';

-- Monthly breakdown
SELECT
    TO_CHAR(scheduled_date, 'Month') as month,
    monthly_topic,
    COUNT(*) as articles
FROM content_calendar_entries
WHERE profile_id = 'b0000001-0000-4000-b000-000000000001'
GROUP BY TO_CHAR(scheduled_date, 'Month'), monthly_topic, DATE_TRUNC('month', scheduled_date)
ORDER BY DATE_TRUNC('month', MIN(scheduled_date));

-- Pillar distribution
SELECT
    cp.name as pillar,
    cp.color,
    COUNT(cce.id) as articles
FROM content_pillars cp
LEFT JOIN content_calendar_entries cce ON cce.pillar_id = cp.id
WHERE cp.profile_id = 'b0000001-0000-4000-b000-000000000001'
GROUP BY cp.name, cp.color, cp.sort_order
ORDER BY cp.sort_order;
