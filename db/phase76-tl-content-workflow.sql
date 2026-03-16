-- ===========================================
-- PHASE 76: TL Content Creation Workflow
-- ===========================================
-- Adds ICP and Business Profile as context assets for the TL agents,
-- creates hashtag taxonomy table, and maps new context to agents.
-- Complements Phase 75 editorial calendar with the content generation
-- workflow from the Content Creation System.

-- ============================================
-- 1. HASHTAG TAXONOMY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS tl_hashtag_taxonomy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category TEXT NOT NULL
        CHECK (category IN ('brand', 'pillar', 'monthly', 'topic', 'audience')),
    label TEXT NOT NULL,
    hashtags TEXT[] NOT NULL DEFAULT '{}',
    usage_guidance TEXT,
    quarterly_pillar TEXT,
    month_number INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tl_hashtag_taxonomy_org ON tl_hashtag_taxonomy(org_id);
CREATE INDEX IF NOT EXISTS idx_tl_hashtag_taxonomy_category ON tl_hashtag_taxonomy(org_id, category);

ALTER TABLE tl_hashtag_taxonomy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tl_hashtag_taxonomy_org ON tl_hashtag_taxonomy;
CREATE POLICY tl_hashtag_taxonomy_org ON tl_hashtag_taxonomy
    FOR ALL USING (
        org_id IN (SELECT default_org_id FROM users WHERE id = auth.uid())
    );

COMMENT ON TABLE tl_hashtag_taxonomy IS 'Hashtag strategy for TL LinkedIn posts. Brand, pillar, monthly, and topic-level hashtags with rotation guidance.';

-- ============================================
-- 2. SEED HASHTAG TAXONOMY (Synergi org)
-- ============================================

DO $$
DECLARE
    v_org_id UUID := '57234ef8-5a4d-40e7-aec3-ca02e44db9ce';
BEGIN
    -- Brand hashtags
    INSERT INTO tl_hashtag_taxonomy (org_id, category, label, hashtags, usage_guidance)
    VALUES
    (v_org_id, 'brand', 'SynergiAI', ARRAY['#SynergiAI'], 'Use 2-3x per week. All content.'),
    (v_org_id, 'brand', 'ValuesFirstAI', ARRAY['#ValuesFirstAI'], 'Use 2-3x per week. Values/ethics focus.'),
    (v_org_id, 'brand', 'AlignedIntelligence', ARRAY['#AlignedIntelligence'], 'Use 1-2x per week. AI alignment topics.'),
    (v_org_id, 'brand', 'IntegrityByDesign', ARRAY['#IntegrityByDesign'], 'Use 1-2x per week. Governance/architecture.')
    ON CONFLICT DO NOTHING;

    -- Pillar hashtags
    INSERT INTO tl_hashtag_taxonomy (org_id, category, label, hashtags, quarterly_pillar)
    VALUES
    (v_org_id, 'pillar', 'Human-Aligned Intelligence', ARRAY['#HumanAICollaboration', '#HumanFirst', '#AIAssistance', '#HumanBrilliance'], 'Human-Aligned Intelligence'),
    (v_org_id, 'pillar', 'Ethical Architecture', ARRAY['#AIEthics', '#EthicalAI', '#ResponsibleAI', '#AIGovernance'], 'Ethical Architecture'),
    (v_org_id, 'pillar', 'Values as Strategy', ARRAY['#AIEcosystem', '#MultiAgentAI', '#ConnectedIntelligence', '#AIArchitecture'], 'Values as Strategy'),
    (v_org_id, 'pillar', 'Sustainable Growth', ARRAY['#SustainableBusiness', '#PurposeDriven', '#LongTermThinking', '#ResponsibleGrowth'], 'Sustainable Growth')
    ON CONFLICT DO NOTHING;

    -- Monthly theme hashtags
    INSERT INTO tl_hashtag_taxonomy (org_id, category, label, hashtags, month_number)
    VALUES
    (v_org_id, 'monthly', 'The Humanity Question', ARRAY['#HumanFirst', '#AIPhilosophy', '#HumanBrilliance'], 1),
    (v_org_id, 'monthly', 'The Alignment Imperative', ARRAY['#AIEthics', '#ValuesAlignment', '#AIGovernance'], 2),
    (v_org_id, 'monthly', 'Human-AI Collaboration', ARRAY['#HumanAICollaboration', '#TeamAI', '#FutureOfWork'], 3),
    (v_org_id, 'monthly', 'Cost of Misalignment', ARRAY['#OrganizationalIntegrity', '#AIEthics', '#BusinessRisk'], 4),
    (v_org_id, 'monthly', 'Integrity as Foundation', ARRAY['#BusinessIntegrity', '#IntegrityMatters', '#TrustBuilding'], 5),
    (v_org_id, 'monthly', 'Bright Lines and Guardrails', ARRAY['#AIGovernance', '#EthicalAI', '#AIGuardrails'], 6),
    (v_org_id, 'monthly', 'Personal Alignment', ARRAY['#LeadershipDevelopment', '#PersonalGrowth', '#Leadership'], 7),
    (v_org_id, 'monthly', 'Strategic Integrity', ARRAY['#StrategicAI', '#BusinessStrategy', '#CompetitiveAdvantage'], 8),
    (v_org_id, 'monthly', 'Ecosystem Intelligence', ARRAY['#AIEcosystem', '#ConnectedIntelligence', '#SystemsThinking'], 9),
    (v_org_id, 'monthly', 'Measuring What Matters', ARRAY['#BusinessMetrics', '#SustainableBusiness', '#PurposeDriven'], 10),
    (v_org_id, 'monthly', 'Sustainable Practice', ARRAY['#SustainableBusiness', '#LongTermThinking', '#ResponsibleGrowth'], 11),
    (v_org_id, 'monthly', 'Integration and Vision', ARRAY['#FutureOfAI', '#AILeadership', '#ThoughtLeadership'], 12)
    ON CONFLICT DO NOTHING;

    -- Topic hashtags
    INSERT INTO tl_hashtag_taxonomy (org_id, category, label, hashtags, usage_guidance)
    VALUES
    (v_org_id, 'topic', 'Leadership & Strategy', ARRAY['#AILeadership', '#CEOInsights', '#ExecutiveStrategy', '#LeadershipDevelopment', '#StrategicAI'], 'Executive-focused content'),
    (v_org_id, 'topic', 'Values & Culture', ARRAY['#CompanyCulture', '#OrganizationalValues', '#CultureFirst', '#ValuesDrivenCulture', '#OrganizationalIntegrity'], 'Culture and values content'),
    (v_org_id, 'topic', 'Transformation & Change', ARRAY['#DigitalTransformation', '#AITransformation', '#ChangeManagement', '#BusinessEvolution', '#AIAdoption'], 'Change management content'),
    (v_org_id, 'topic', 'Trust & Integrity', ARRAY['#TrustInTech', '#BusinessTrust', '#IntegrityMatters', '#TrustBuilding', '#Accountability'], 'Trust-building content'),
    (v_org_id, 'topic', 'Philosophy & Thought Leadership', ARRAY['#ThoughtLeadership', '#AIPhilosophy', '#BusinessPhilosophy', '#Leadership', '#FutureOfAI'], 'Deeper philosophical content'),
    (v_org_id, 'topic', 'SME Practicality', ARRAY['#SMELeadership', '#SmallBusinessAI', '#PracticalAI', '#SMEGrowth', '#ScalableAI'], 'SME-focused implementation content')
    ON CONFLICT DO NOTHING;
END $$;

-- ============================================
-- 3. ICP CONTEXT ASSET (Composite Profile)
-- ============================================
-- Combines all ICP segments into a single context asset for agent injection.

INSERT INTO context_assets (
    id,
    user_id,
    name,
    asset_type,
    description,
    content_json,
    is_current,
    version,
    created_by
) VALUES (
    'a0000001-0000-4000-b000-000000000002',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'Target Audience ICP Profiles',
    'icp',
    'Ideal Customer Profiles for thought leadership content targeting. Includes psychographics, pain points, language patterns, and buying triggers across 3 primary segments: Coaches/Consultants, Healthcare SMEs, and Manufacturing SMEs.',
    '{
        "summary": "SME leaders stuck at growth ceilings who need values-aligned AI to scale without losing their identity.",
        "primary_segments": [
            {
                "name": "Coaches & Consultants",
                "identity": "Independent coaches and boutique consultants at a growth ceiling",
                "core_desires": ["Free up time from admin", "Scale from 1:1 to 1:many", "Build authority through thought leadership", "Grow revenue without large teams"],
                "core_fears": ["AI makes practice feel impersonal", "Investing in tech that wastes money", "Falling behind peers adopting AI"],
                "top_pains": ["Admin overload", "Content marketing treadmill", "Revenue capped by hours", "Difficulty differentiating"],
                "language": ["Drowning in admin", "Clone myself", "Need more time to coach", "Scale without losing personal touch"],
                "buying_triggers": ["Burnout or revenue plateau", "Peers successfully integrating AI", "Clients prompting AI adoption"]
            },
            {
                "name": "Small Healthcare Organizations",
                "identity": "10-200 employee clinics and counseling practices",
                "core_desires": ["Reduce admin burden on clinical staff", "Maintain HIPAA compliance", "Improve patient outcomes with AI support"],
                "core_fears": ["HIPAA violations from AI", "AI inaccuracy in clinical context", "Losing patient trust"],
                "top_pains": ["Admin overload on clinicians", "Compliance complexity", "Staff burnout", "Inconsistent patient communication"],
                "language": ["Patient-centered care", "Compliance burden", "Clinical workflows", "Care coordination"],
                "buying_triggers": ["Staff turnover", "Compliance audit findings", "Competitive pressure from larger practices"]
            },
            {
                "name": "Small Manufacturing",
                "identity": "$3M-$25M revenue manufacturers, 5-20 years in business",
                "core_desires": ["Optimize production efficiency", "Modernize without disrupting operations", "Data-driven decision making"],
                "core_fears": ["Disrupting proven processes", "ROI uncertainty", "Technology too complex for team"],
                "top_pains": ["Production bottlenecks", "Legacy systems", "Inventory mismanagement", "Quality control gaps"],
                "language": ["OEE", "Scrap rate", "Changeover time", "Downtime", "Lean manufacturing"],
                "buying_triggers": ["Major quality incident", "Key customer demands digital integration", "Competitor adoption"]
            }
        ],
        "cross_segment_themes": {
            "shared_values": ["Authenticity", "Proof of ROI", "Ethical AI", "Simplicity"],
            "shared_fears": ["AI replacing human judgment", "Wasted investment", "Complexity beyond team capability"],
            "emotional_journey": {
                "current": "Overwhelmed and uncertain about AI",
                "desired": "Empowered, confident, and leading with values-aligned technology"
            }
        }
    }'::jsonb,
    true,
    1,
    '71fb8dfe-7469-4540-9a58-b96caa638da4'
) ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    description = EXCLUDED.description,
    name = EXCLUDED.name,
    updated_at = NOW();

-- ============================================
-- 4. BUSINESS PROFILE CONTEXT ASSET
-- ============================================

INSERT INTO context_assets (
    id,
    user_id,
    name,
    asset_type,
    description,
    content_json,
    is_current,
    version,
    created_by
) VALUES (
    'a0000001-0000-4000-b000-000000000003',
    '71fb8dfe-7469-4540-9a58-b96caa638da4',
    'Synergi AI Business Profile',
    'why_we_win',
    'Competitive positioning, methodology, and value propositions for Synergi AI. Used to ground thought leadership content in real business context and differentiation.',
    '{
        "positioning": "Synergi AI wins because we start with alignment, deliver role-specific agents orchestrated by Nexus, and embed ethics, change-management, and multi-model intelligence -- helping SMBs achieve faster ROI, lower risk, and a trusted AI partner competitors cannot match.",
        "differentiators": [
            {
                "theme": "Alignment-First Strategy",
                "claim": "Insight 360 (Align > Strategize > Execute) identifies what to automate, why, and in what order -- before any build.",
                "result": "Proof-of-value in ~90 days with lower adoption risk."
            },
            {
                "theme": "Role-Based Agents + Nexus Orchestration",
                "claim": "Every role gets its own agent pre-trained on departmental KPIs. Nexus acts as the AI nervous system.",
                "result": "A network of specialists that work like an integrated team -- not siloed bots."
            },
            {
                "theme": "Ethical, Explainable, Human-First",
                "claim": "Bias-testing, privacy controls, and transparent decision logic built in from day one.",
                "result": "Accelerated adoption in healthcare, finance, and regulated environments."
            },
            {
                "theme": "Hybrid Consulting + SaaS",
                "claim": "Change-management, UpSkilling agents, and domain templates included -- not tool-only.",
                "result": "Leaders feel supported end-to-end, improving retention and expansion."
            },
            {
                "theme": "SMB-First DNA",
                "claim": "Built for SMBs with deep coaching/consulting roots. Vertical playbooks for services, healthcare, manufacturing.",
                "result": "Trusted partner who understands SMB context -- not a generic vendor."
            }
        ],
        "methodology": "Values-Driven AI Ecosystem Design: Align 120 > Strategy 120 > Execute 120",
        "target_market": "SMBs with 10-200 employees across professional services, healthcare, and light manufacturing",
        "proof_points": ["+22% revenue in 16 weeks for counseling client", "30+ AI coach guides across industries", "Proof-of-value in ~90 days"]
    }'::jsonb,
    true,
    1,
    '71fb8dfe-7469-4540-9a58-b96caa638da4'
) ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    description = EXCLUDED.description,
    name = EXCLUDED.name,
    updated_at = NOW();

-- ============================================
-- 5. MAP ICP + BUSINESS PROFILE TO TL AGENTS
-- ============================================

-- ICP -> TL Article Writer (on_demand injection, lower priority than Voice DNA)
INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_active)
SELECT
    'a0000001-0000-4000-a000-000000000304',  -- TL Article Writer
    'a0000001-0000-4000-b000-000000000002',  -- ICP Profile
    'always',
    80,  -- Lower than Voice DNA (100) but still injected
    true
WHERE EXISTS (SELECT 1 FROM agents WHERE id = 'a0000001-0000-4000-a000-000000000304')
ON CONFLICT (agent_id, asset_id) DO UPDATE SET
    injection_mode = 'always',
    priority = 80;

-- ICP -> TL LinkedIn Generator
INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_active)
SELECT
    'a0000001-0000-4000-a000-000000000305',  -- TL LinkedIn Generator
    'a0000001-0000-4000-b000-000000000002',  -- ICP Profile
    'always',
    80,
    true
WHERE EXISTS (SELECT 1 FROM agents WHERE id = 'a0000001-0000-4000-a000-000000000305')
ON CONFLICT (agent_id, asset_id) DO UPDATE SET
    injection_mode = 'always',
    priority = 80;

-- Business Profile -> TL Article Writer
INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_active)
SELECT
    'a0000001-0000-4000-a000-000000000304',  -- TL Article Writer
    'a0000001-0000-4000-b000-000000000003',  -- Business Profile
    'always',
    70,  -- Lower than ICP (80) and Voice DNA (100)
    true
WHERE EXISTS (SELECT 1 FROM agents WHERE id = 'a0000001-0000-4000-a000-000000000304')
ON CONFLICT (agent_id, asset_id) DO UPDATE SET
    injection_mode = 'always',
    priority = 70;

-- Business Profile -> TL LinkedIn Generator
INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_active)
SELECT
    'a0000001-0000-4000-a000-000000000305',  -- TL LinkedIn Generator
    'a0000001-0000-4000-b000-000000000003',  -- Business Profile
    'always',
    70,
    true
WHERE EXISTS (SELECT 1 FROM agents WHERE id = 'a0000001-0000-4000-a000-000000000305')
ON CONFLICT (agent_id, asset_id) DO UPDATE SET
    injection_mode = 'always',
    priority = 70;

-- ============================================
-- 6. ADD preferred_image_model TO TL PROFILES (if missing)
-- ============================================
-- Phase 36 may not have added this column; ensure it exists.

ALTER TABLE thought_leadership_profiles
    ADD COLUMN IF NOT EXISTS preferred_image_model TEXT DEFAULT 'gpt-image-1.5',
    ADD COLUMN IF NOT EXISTS preferred_image_style TEXT DEFAULT 'professional',
    ADD COLUMN IF NOT EXISTS author_bio TEXT;

COMMENT ON COLUMN thought_leadership_profiles.preferred_image_model IS 'Default image model for header generation (gpt-image-1.5 or dall-e-3)';

-- ============================================
-- 7. FIX bright_line_incidents CHECK CONSTRAINT
-- ============================================
-- Phase 54 created incident_type with CHECK (violation, near_miss, inquiry).
-- Phase 59 tried to add (bright_line, prompt_injection, guardrail_warning, manual)
-- but the column already existed so the ALTER never ran.
-- This caused guardrail enforcement logging to silently fail.

ALTER TABLE bright_line_incidents
    DROP CONSTRAINT IF EXISTS bright_line_incidents_incident_type_check;

ALTER TABLE bright_line_incidents
    ADD CONSTRAINT bright_line_incidents_incident_type_check
    CHECK (incident_type IN (
        'violation', 'near_miss', 'inquiry',
        'bright_line', 'prompt_injection', 'guardrail_warning', 'manual'
    ));
