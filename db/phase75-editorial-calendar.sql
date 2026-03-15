-- ===========================================
-- PHASE 75: Editorial Calendar Schema + 2026 Seed Data
-- ===========================================
-- Creates the editorial_calendars table, extends content_calendar_entries
-- with editorial metadata, and seeds the full 2026 calendar (48 weeks).

-- ============================================
-- 1. EDITORIAL CALENDARS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS editorial_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    year INTEGER NOT NULL,
    annual_theme TEXT NOT NULL,
    quarterly_pillars JSONB NOT NULL DEFAULT '[]',
    monthly_themes JSONB NOT NULL DEFAULT '[]',
    foundation_articles JSONB DEFAULT '[]',
    publishing_schedule JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, year)
);

CREATE INDEX IF NOT EXISTS idx_editorial_calendars_org ON editorial_calendars(org_id);
CREATE INDEX IF NOT EXISTS idx_editorial_calendars_active ON editorial_calendars(org_id, is_active) WHERE is_active = TRUE;

ALTER TABLE editorial_calendars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS editorial_calendars_org ON editorial_calendars;
CREATE POLICY editorial_calendars_org ON editorial_calendars
    FOR ALL USING (
        org_id IN (SELECT default_org_id FROM users WHERE id = auth.uid())
    );

COMMENT ON TABLE editorial_calendars IS 'Annual editorial calendar with quarterly pillars and monthly themes. i360 is primary source of truth.';

-- ============================================
-- 2. EXTEND CONTENT_CALENDAR_ENTRIES
-- ============================================

ALTER TABLE content_calendar_entries
    ADD COLUMN IF NOT EXISTS article_format TEXT DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS series_name TEXT,
    ADD COLUMN IF NOT EXISTS cornerstone_article_id UUID REFERENCES content_calendar_entries(id),
    ADD COLUMN IF NOT EXISTS is_cornerstone BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS cornerstone_number INTEGER,
    ADD COLUMN IF NOT EXISTS week_position_in_month INTEGER,
    ADD COLUMN IF NOT EXISTS quarterly_pillar TEXT,
    ADD COLUMN IF NOT EXISTS editorial_calendar_id UUID REFERENCES editorial_calendars(id);

COMMENT ON COLUMN content_calendar_entries.article_format IS 'long (2000+), medium (1000-1500), short (500-800)';
COMMENT ON COLUMN content_calendar_entries.series_name IS 'Series this article belongs to (e.g., Philosophy, Alignment, Collaboration)';
COMMENT ON COLUMN content_calendar_entries.is_cornerstone IS 'True for foundation articles (week 1 of each month)';
COMMENT ON COLUMN content_calendar_entries.week_position_in_month IS '1=cornerstone, 2=extension1, 3=extension2, 4=practical';

-- ============================================
-- 3. SEED 2026 EDITORIAL CALENDAR
-- ============================================

INSERT INTO editorial_calendars (
    id, org_id, user_id, year, annual_theme,
    quarterly_pillars, monthly_themes, foundation_articles, publishing_schedule
) VALUES (
    'ec000001-0000-4000-a000-000000002026',
    '57234ef8-5a4d-40e7-aec3-ca02e44db9ce',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    2026,
    'From Alignment to Action — Building AI That Reflects Who You Are',
    '[
        {"q": 1, "name": "Human-Aligned Intelligence", "theme": "Restoring the Human at the Center of AI"},
        {"q": 2, "name": "Ethical Architecture", "theme": "Building Integrity Into Every System"},
        {"q": 3, "name": "Values as Strategy", "theme": "From Philosophy to Competitive Advantage"},
        {"q": 4, "name": "Sustainable Growth", "theme": "Profit, Purpose, and the Long Game"}
    ]'::jsonb,
    '[
        {"month": 1, "name": "The Humanity Question", "subtitle": "Before the Algorithm — Understanding What Makes Us Human", "pillar_q": 1},
        {"month": 2, "name": "The Alignment Imperative", "subtitle": "Why Values Must Come Before Variables", "pillar_q": 1},
        {"month": 3, "name": "Human-AI Collaboration", "subtitle": "Designing Systems Where Humans Lead and AI Supports", "pillar_q": 1},
        {"month": 4, "name": "The Cost of Misalignment", "subtitle": "What Happens When Values and Systems Diverge", "pillar_q": 2},
        {"month": 5, "name": "Integrity as Foundation", "subtitle": "Making the Invisible Visible — Measuring What Matters", "pillar_q": 2},
        {"month": 6, "name": "Bright Lines and Guardrails", "subtitle": "The Non-Negotiables That Define Your Organization", "pillar_q": 2},
        {"month": 7, "name": "Personal Alignment", "subtitle": "Leadership Begins With Self-Alignment", "pillar_q": 3},
        {"month": 8, "name": "Strategic Integrity", "subtitle": "When Values Become Your Market Position", "pillar_q": 3},
        {"month": 9, "name": "Ecosystem Intelligence", "subtitle": "Connected Systems That Think Together Ethically", "pillar_q": 3},
        {"month": 10, "name": "Measuring What Matters", "subtitle": "Beyond Revenue — The Metrics of Meaning", "pillar_q": 4},
        {"month": 11, "name": "Sustainable Practice", "subtitle": "Making Alignment a Daily Discipline", "pillar_q": 4},
        {"month": 12, "name": "Integration and Vision", "subtitle": "Looking Back, Looking Forward — The Aligned Organization", "pillar_q": 4}
    ]'::jsonb,
    '[
        {"number": 1, "title": "Before We Talk About AI, We Must Talk About What It Means to Be Human", "role": "Philosophy Foundation"},
        {"number": 2, "title": "AI Alignment Manifesto", "role": "Values Declaration"},
        {"number": 3, "title": "AI in Service of Humanity: Returning Technology to Its Proper Place", "role": "Positioning"},
        {"number": 4, "title": "Why Misaligned AI Creates Organizational Drift", "role": "Executive Wake-up"},
        {"number": 5, "title": "The Hidden Cost of Misalignment", "role": "Business Case"},
        {"number": 6, "title": "Master Your Minutes, Master Your Life", "role": "Personal Alignment"},
        {"number": 7, "title": "Integrity-as-Strategy: Your Competitive Advantage", "role": "Strategic Framework"}
    ]'::jsonb,
    '{"day": "tuesday", "time": "08:00", "timezone": "America/New_York"}'::jsonb
) ON CONFLICT (org_id, year) DO UPDATE SET
    annual_theme = EXCLUDED.annual_theme,
    quarterly_pillars = EXCLUDED.quarterly_pillars,
    monthly_themes = EXCLUDED.monthly_themes,
    foundation_articles = EXCLUDED.foundation_articles,
    publishing_schedule = EXCLUDED.publishing_schedule,
    updated_at = NOW();

-- ============================================
-- 4. SEED 48 WEEKLY CALENDAR ENTRIES (2026)
-- ============================================
-- Using a DO block to get the profile_id and calendar_id

DO $$
DECLARE
    v_user_id UUID := '71fb8dfe-7469-4540-9a58-b96caa638da4';
    v_org_id UUID := '57234ef8-5a4d-40e7-aec3-ca02e44db9ce';
    v_profile_id UUID;
    v_cal_id UUID := 'ec000001-0000-4000-a000-000000002026';
BEGIN
    -- Get or create TL profile
    SELECT id INTO v_profile_id FROM thought_leadership_profiles WHERE user_id = v_user_id;

    IF v_profile_id IS NULL THEN
        INSERT INTO thought_leadership_profiles (user_id, status, setup_completed)
        VALUES (v_user_id, 'active', true)
        RETURNING id INTO v_profile_id;
    END IF;

    -- Helper: Insert a calendar entry (upsert by user_id + year + week_number)
    -- Q1: Human-Aligned Intelligence
    -- January: The Humanity Question
    INSERT INTO content_calendar_entries (user_id, profile_id, title, scheduled_date, week_number, year, event_type, monthly_topic, article_format, series_name, is_cornerstone, cornerstone_number, week_position_in_month, quarterly_pillar, editorial_calendar_id, status)
    VALUES
    (v_user_id, v_profile_id, 'Before We Talk About AI, We Must Talk About What It Means to Be Human', '2026-01-06', 1, 2026, 'article', 'The Humanity Question', 'long', 'Philosophy', true, 1, 1, 'Human-Aligned Intelligence', v_cal_id, 'published'),
    (v_user_id, v_profile_id, 'The Judgment Gap: What AI Cannot Replicate', '2026-01-13', 2, 2026, 'article', 'The Humanity Question', 'medium', 'Philosophy', false, null, 2, 'Human-Aligned Intelligence', v_cal_id, 'published'),
    (v_user_id, v_profile_id, 'Wisdom vs. Intelligence: Why SMEs Need Both', '2026-01-20', 3, 2026, 'article', 'The Humanity Question', 'medium', 'Philosophy', false, null, 3, 'Human-Aligned Intelligence', v_cal_id, 'published'),
    (v_user_id, v_profile_id, 'The Five Human Capabilities AI Will Never Replace', '2026-01-27', 4, 2026, 'article', 'The Humanity Question', 'short', 'Philosophy', false, null, 4, 'Human-Aligned Intelligence', v_cal_id, 'published'),

    -- February: The Alignment Imperative
    (v_user_id, v_profile_id, 'AI Alignment Manifesto', '2026-02-03', 5, 2026, 'article', 'The Alignment Imperative', 'long', 'Manifesto', true, 2, 1, 'Human-Aligned Intelligence', v_cal_id, 'published'),
    (v_user_id, v_profile_id, 'The Two Operating Systems: Analog Values, Digital Execution', '2026-02-10', 6, 2026, 'article', 'The Alignment Imperative', 'medium', 'Alignment', false, null, 2, 'Human-Aligned Intelligence', v_cal_id, 'published'),
    (v_user_id, v_profile_id, 'Stated Values vs. Stress Values: The Gap That Kills Companies', '2026-02-17', 7, 2026, 'article', 'The Alignment Imperative', 'medium', 'Alignment', false, null, 3, 'Human-Aligned Intelligence', v_cal_id, 'published'),
    (v_user_id, v_profile_id, 'The Alignment Audit: 10 Questions Every CEO Should Ask', '2026-02-24', 8, 2026, 'article', 'The Alignment Imperative', 'short', 'Alignment', false, null, 4, 'Human-Aligned Intelligence', v_cal_id, 'published'),

    -- March: Human-AI Collaboration
    (v_user_id, v_profile_id, 'AI in Service of Humanity: Returning Technology to Its Proper Place', '2026-03-03', 9, 2026, 'article', 'Human-AI Collaboration', 'long', 'Vision', true, 3, 1, 'Human-Aligned Intelligence', v_cal_id, 'published'),
    (v_user_id, v_profile_id, 'The Human-in-the-Loop Imperative: When to Pause the Algorithm', '2026-03-10', 10, 2026, 'article', 'Human-AI Collaboration', 'medium', 'Collaboration', false, null, 2, 'Human-Aligned Intelligence', v_cal_id, 'published'),
    (v_user_id, v_profile_id, 'Building Trust Between Teams and Their AI Tools', '2026-03-17', 11, 2026, 'article', 'Human-AI Collaboration', 'medium', 'Collaboration', false, null, 3, 'Human-Aligned Intelligence', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'The Hierarchy of AI Assistance: From Tool to Partner', '2026-03-24', 12, 2026, 'article', 'Human-AI Collaboration', 'short', 'Collaboration', false, null, 4, 'Human-Aligned Intelligence', v_cal_id, 'planned'),

    -- Q2: Ethical Architecture
    -- April: The Cost of Misalignment
    (v_user_id, v_profile_id, 'Why Misaligned AI Creates Organizational Drift', '2026-04-07', 13, 2026, 'article', 'The Cost of Misalignment', 'long', 'Drift', true, 4, 1, 'Ethical Architecture', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'The Invisible Erosion: How Small Compromises Compound', '2026-04-14', 14, 2026, 'article', 'The Cost of Misalignment', 'medium', 'Drift', false, null, 2, 'Ethical Architecture', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'The CEO''s Blind Spot: Owning What You Can''t See', '2026-04-21', 15, 2026, 'article', 'The Cost of Misalignment', 'medium', 'Drift', false, null, 3, 'Ethical Architecture', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'Five Warning Signs Your AI Is Drifting From Your Values', '2026-04-28', 16, 2026, 'article', 'The Cost of Misalignment', 'short', 'Drift', false, null, 4, 'Ethical Architecture', v_cal_id, 'planned'),

    -- May: Integrity as Foundation
    (v_user_id, v_profile_id, 'The Hidden Cost of Misalignment', '2026-05-05', 17, 2026, 'article', 'Integrity as Foundation', 'long', 'Integrity Metrics', true, 5, 1, 'Ethical Architecture', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'The Integrity Yield: A New Metric for AI-Era Leadership', '2026-05-12', 18, 2026, 'article', 'Integrity as Foundation', 'medium', 'Integrity Metrics', false, null, 2, 'Ethical Architecture', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'Trust Velocity: Is Your Reputation Compounding or Eroding?', '2026-05-19', 19, 2026, 'article', 'Integrity as Foundation', 'medium', 'Integrity Metrics', false, null, 3, 'Ethical Architecture', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'The Close Call Log: Documenting the Crises That Didn''t Happen', '2026-05-26', 20, 2026, 'article', 'Integrity as Foundation', 'short', 'Integrity Metrics', false, null, 4, 'Ethical Architecture', v_cal_id, 'planned'),

    -- June: Bright Lines and Guardrails
    (v_user_id, v_profile_id, 'Bright Lines: The Ethical Boundaries That Cannot Bend', '2026-06-02', 21, 2026, 'article', 'Bright Lines and Guardrails', 'long', 'Governance', false, null, 1, 'Ethical Architecture', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'Ethics as Code: Embedding Values in AI Architecture', '2026-06-09', 22, 2026, 'article', 'Bright Lines and Guardrails', 'medium', 'Governance', false, null, 2, 'Ethical Architecture', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'The Veto Power: When Humans Must Override the Algorithm', '2026-06-16', 23, 2026, 'article', 'Bright Lines and Guardrails', 'medium', 'Governance', false, null, 3, 'Ethical Architecture', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'Building Your Integrity Dashboard: A Step-by-Step Guide', '2026-06-23', 24, 2026, 'article', 'Bright Lines and Guardrails', 'short', 'Governance', false, null, 4, 'Ethical Architecture', v_cal_id, 'planned'),

    -- Q3: Values as Strategy
    -- July: Personal Alignment
    (v_user_id, v_profile_id, 'Master Your Minutes, Master Your Life', '2026-07-07', 25, 2026, 'article', 'Personal Alignment', 'long', 'Personal', true, 6, 1, 'Values as Strategy', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'The Leader''s Daily Alignment Practice', '2026-07-14', 26, 2026, 'article', 'Personal Alignment', 'medium', 'Personal', false, null, 2, 'Values as Strategy', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'Decision Fatigue and the Aligned Mind', '2026-07-21', 27, 2026, 'article', 'Personal Alignment', 'medium', 'Personal', false, null, 3, 'Values as Strategy', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'Time Integrity: Where Your Calendar Reveals Your Values', '2026-07-28', 28, 2026, 'article', 'Personal Alignment', 'short', 'Personal', false, null, 4, 'Values as Strategy', v_cal_id, 'planned'),

    -- August: Strategic Integrity
    (v_user_id, v_profile_id, 'Integrity-as-Strategy: Your Competitive Advantage', '2026-08-04', 29, 2026, 'article', 'Strategic Integrity', 'long', 'Strategy', true, 7, 1, 'Values as Strategy', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'The Trust Premium: Why Aligned Companies Command Higher Prices', '2026-08-11', 30, 2026, 'article', 'Strategic Integrity', 'medium', 'Strategy', false, null, 2, 'Values as Strategy', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'The Self-Selecting Customer: When Values Attract the Right Clients', '2026-08-18', 31, 2026, 'article', 'Strategic Integrity', 'medium', 'Strategy', false, null, 3, 'Values as Strategy', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'Calculating Your Return on Integrity', '2026-08-25', 32, 2026, 'article', 'Strategic Integrity', 'short', 'Strategy', false, null, 4, 'Values as Strategy', v_cal_id, 'planned'),

    -- September: Ecosystem Intelligence
    (v_user_id, v_profile_id, 'The Aligned Ecosystem: When All Your AI Agents Share Values', '2026-09-01', 33, 2026, 'article', 'Ecosystem Intelligence', 'long', 'Ecosystem', false, null, 1, 'Values as Strategy', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'Context Is Everything: How Values Flow Through Multi-Agent Systems', '2026-09-08', 34, 2026, 'article', 'Ecosystem Intelligence', 'medium', 'Ecosystem', false, null, 2, 'Values as Strategy', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'The Governance Layer: Who Watches the Watchers?', '2026-09-15', 35, 2026, 'article', 'Ecosystem Intelligence', 'medium', 'Ecosystem', false, null, 3, 'Values as Strategy', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'Building Your First Values-Driven AI Agent', '2026-09-22', 36, 2026, 'article', 'Ecosystem Intelligence', 'short', 'Ecosystem', false, null, 4, 'Values as Strategy', v_cal_id, 'planned'),

    -- Q4: Sustainable Growth
    -- October: Measuring What Matters
    (v_user_id, v_profile_id, 'The Triple Bottom Line of AI: Profit, People, and Purpose', '2026-10-06', 37, 2026, 'article', 'Measuring What Matters', 'long', 'Measurement', false, null, 1, 'Sustainable Growth', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'Leading Indicators: Your Early Warning System for Values Drift', '2026-10-13', 38, 2026, 'article', 'Measuring What Matters', 'medium', 'Measurement', false, null, 2, 'Sustainable Growth', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'The Counterfactual Question: What Didn''t Happen Because You Did Right?', '2026-10-20', 39, 2026, 'article', 'Measuring What Matters', 'medium', 'Measurement', false, null, 3, 'Sustainable Growth', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'Building Your Integrity Scorecard', '2026-10-27', 40, 2026, 'article', 'Measuring What Matters', 'short', 'Measurement', false, null, 4, 'Sustainable Growth', v_cal_id, 'planned'),

    -- November: Sustainable Practice
    (v_user_id, v_profile_id, 'The Rhythm of Alignment: Daily, Weekly, Quarterly Practices', '2026-11-03', 41, 2026, 'article', 'Sustainable Practice', 'long', 'Practice', false, null, 1, 'Sustainable Growth', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'The Values Clarification Session: A Facilitation Guide', '2026-11-10', 42, 2026, 'article', 'Sustainable Practice', 'medium', 'Practice', false, null, 2, 'Sustainable Growth', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'Training Your Team for Judgment, Not Just Compliance', '2026-11-17', 43, 2026, 'article', 'Sustainable Practice', 'medium', 'Practice', false, null, 3, 'Sustainable Growth', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'The Annual Integrity Audit: A Comprehensive Checklist', '2026-11-24', 44, 2026, 'article', 'Sustainable Practice', 'short', 'Practice', false, null, 4, 'Sustainable Growth', v_cal_id, 'planned'),

    -- December: Integration and Vision
    (v_user_id, v_profile_id, 'The Alignment Operating System: A Year in Review', '2026-12-01', 45, 2026, 'article', 'Integration and Vision', 'long', 'Integration', false, null, 1, 'Sustainable Growth', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'Case Study: How [Company] Built a Values-Driven AI Ecosystem', '2026-12-08', 46, 2026, 'article', 'Integration and Vision', 'medium', 'Integration', false, null, 2, 'Sustainable Growth', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'The Future of Aligned Intelligence: What Comes Next', '2026-12-15', 47, 2026, 'article', 'Integration and Vision', 'medium', 'Vision', false, null, 3, 'Sustainable Growth', v_cal_id, 'planned'),
    (v_user_id, v_profile_id, 'Your 2027 Alignment Roadmap: Planning the Year Ahead', '2026-12-22', 48, 2026, 'article', 'Integration and Vision', 'short', 'Vision', false, null, 4, 'Sustainable Growth', v_cal_id, 'planned')

    ON CONFLICT DO NOTHING;

END $$;
