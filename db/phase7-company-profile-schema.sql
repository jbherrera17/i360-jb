-- ============================================
-- Insight 360 - Phase 7: Company Profile & Align 120 Outputs
-- Version: 1.0
-- Date: December 2025
-- Description: Company Profile schema to store outputs from Align 120 agents
--              Feeds into Company Dashboard, S2E, and Integrity systems
-- ============================================

-- ============================================
-- COMPANY PROFILE TABLE
-- Master record for organization-level data
-- ============================================
CREATE TABLE IF NOT EXISTS company_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Basic Company Info
    company_name TEXT NOT NULL,
    industry TEXT,
    industry_segment TEXT,
    company_size TEXT CHECK (company_size IN ('startup', 'small', 'medium', 'enterprise')),
    employee_count INTEGER,
    founding_year INTEGER,
    headquarters_location TEXT,

    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    is_current BOOLEAN DEFAULT true,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_company_profiles_user ON company_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_company_profiles_current ON company_profiles(is_current);
CREATE INDEX IF NOT EXISTS idx_company_profiles_status ON company_profiles(status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_company_profiles_updated_at ON company_profiles;
CREATE TRIGGER update_company_profiles_updated_at
    BEFORE UPDATE ON company_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE company_profiles IS 'Master company profile for Align 120 outputs';

-- ============================================
-- AI MATURITY ASSESSMENT TABLE
-- Output from Module 1: AI Audit & Assessment
-- ============================================
CREATE TABLE IF NOT EXISTS ai_maturity_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,

    -- Assessment Metadata
    assessment_date DATE DEFAULT CURRENT_DATE,
    assessed_by TEXT, -- 'agent' or 'human' or 'hybrid'
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,

    -- Overall Maturity Score (0-100)
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    maturity_level TEXT CHECK (maturity_level IN ('nascent', 'emerging', 'developing', 'advanced', 'leading')),

    -- Dimension Scores (0-100 each)
    data_readiness_score INTEGER CHECK (data_readiness_score >= 0 AND data_readiness_score <= 100),
    governance_score INTEGER CHECK (governance_score >= 0 AND governance_score <= 100),
    skills_score INTEGER CHECK (skills_score >= 0 AND skills_score <= 100),
    tooling_score INTEGER CHECK (tooling_score >= 0 AND tooling_score <= 100),
    adoption_score INTEGER CHECK (adoption_score >= 0 AND adoption_score <= 100),
    culture_score INTEGER CHECK (culture_score >= 0 AND culture_score <= 100),

    -- AI Inventory Summary
    ai_inventory JSONB DEFAULT '[]',
    -- Format: [{"name": "...", "type": "llm|rpa|analytics|ml", "department": "...", "status": "active|pilot|planned", "risk_level": "low|medium|high"}]

    -- Risk Register
    risk_register JSONB DEFAULT '[]',
    -- Format: [{"risk": "...", "category": "privacy|ip|vendor|security|compliance", "severity": "low|medium|high|critical", "mitigation": "..."}]

    -- Opportunity Backlog
    opportunity_backlog JSONB DEFAULT '[]',
    -- Format: [{"opportunity": "...", "impact_score": 1-10, "feasibility_score": 1-10, "priority_rank": 1-N, "estimated_value": "...", "department": "..."}]

    -- Detailed Findings
    findings_summary TEXT,
    recommendations JSONB DEFAULT '[]',

    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'reviewed')),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_maturity_user ON ai_maturity_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_maturity_company ON ai_maturity_assessments(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_ai_maturity_date ON ai_maturity_assessments(assessment_date);

-- Trigger
DROP TRIGGER IF EXISTS update_ai_maturity_updated_at ON ai_maturity_assessments;
CREATE TRIGGER update_ai_maturity_updated_at
    BEFORE UPDATE ON ai_maturity_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE ai_maturity_assessments IS 'AI maturity assessments from Align 120 Module 1';

-- ============================================
-- BUSINESS FUNDAMENTALS TABLE
-- Output from Module 2: Business Fundamentals Audit
-- ============================================
CREATE TABLE IF NOT EXISTS business_fundamentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,

    -- Values (extracted by Values Excavator agent)
    discovered_values JSONB DEFAULT '[]',
    -- Format: [{"value": "...", "description": "...", "evidence": ["..."], "strength": "strong|moderate|weak", "source": "explicit|implicit"}]

    values_alignment_notes TEXT,

    -- Process Inventory (extracted by Process Miner agent)
    process_inventory JSONB DEFAULT '[]',
    -- Format: [{"process_name": "...", "department": "...", "inputs": [...], "outputs": [...], "cycle_time": "...", "pain_points": [...], "ai_opportunity_score": 1-10}]

    -- Economic Baseline (extracted by Unit Economics agent)
    economic_baseline JSONB DEFAULT '{}',
    -- Format: {"revenue_model": "...", "cost_drivers": [...], "margins": {...}, "cac": ..., "ltv": ..., "key_metrics": {...}}

    -- Customer Journey Map
    customer_journey JSONB DEFAULT '[]',
    -- Format: [{"stage": "...", "touchpoints": [...], "pain_points": [...], "moments_of_truth": [...], "ai_opportunities": [...]}]

    -- KPI/OKR Alignment Matrix
    kpi_alignment_matrix JSONB DEFAULT '[]',
    -- Format: [{"kpi": "...", "current_value": ..., "target_value": ..., "okr_link": "...", "ai_impact_potential": "high|medium|low"}]

    -- Summary
    fundamentals_summary TEXT,
    strategic_constraints JSONB DEFAULT '[]',

    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'reviewed')),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_fundamentals_user ON business_fundamentals(user_id);
CREATE INDEX IF NOT EXISTS idx_business_fundamentals_company ON business_fundamentals(company_profile_id);

-- Trigger
DROP TRIGGER IF EXISTS update_business_fundamentals_updated_at ON business_fundamentals;
CREATE TRIGGER update_business_fundamentals_updated_at
    BEFORE UPDATE ON business_fundamentals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE business_fundamentals IS 'Business fundamentals from Align 120 Module 2';

-- ============================================
-- TEAM READINESS ASSESSMENTS TABLE
-- Output from Module 3: Team AI UpSkilling Audit
-- ============================================
CREATE TABLE IF NOT EXISTS team_readiness_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,

    -- Assessment Metadata
    assessment_date DATE DEFAULT CURRENT_DATE,

    -- Overall Readiness Score (0-100)
    overall_readiness_score INTEGER CHECK (overall_readiness_score >= 0 AND overall_readiness_score <= 100),

    -- Skills Matrix
    skills_matrix JSONB DEFAULT '[]',
    -- Format: [{"role": "...", "department": "...", "headcount": N, "skills": {"prompting": 1-5, "data_literacy": 1-5, "ai_evaluation": 1-5, "governance": 1-5}, "gap_priority": "high|medium|low"}]

    -- Skills Gap Summary
    skills_gaps JSONB DEFAULT '[]',
    -- Format: [{"skill": "...", "current_avg": 1-5, "target": 1-5, "gap": N, "affected_roles": [...], "priority": "critical|high|medium|low"}]

    -- Training Roadmap
    training_roadmap JSONB DEFAULT '[]',
    -- Format: [{"track_name": "...", "target_roles": [...], "modules": [...], "estimated_hours": N, "priority": 1-N, "delivery_method": "self-paced|instructor|hybrid"}]

    -- Change Readiness
    change_readiness JSONB DEFAULT '{}',
    -- Format: {"overall_score": 0-100, "enablers": [...], "blockers": [...], "leadership_alignment": 0-100, "employee_sentiment": 0-100}

    -- Adoption Blockers
    adoption_blockers JSONB DEFAULT '[]',
    -- Format: [{"blocker": "...", "category": "fear|workload|incentives|leadership|technical|cultural", "severity": "critical|high|medium|low", "mitigation": "..."}]

    -- Ways of Working Recommendations
    ways_of_working JSONB DEFAULT '{}',
    -- Format: {"rituals": [...], "review_gates": [...], "prompt_library_needs": [...], "evaluation_cadence": "..."}

    -- Summary
    readiness_summary TEXT,

    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'reviewed')),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_readiness_user ON team_readiness_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_team_readiness_company ON team_readiness_assessments(company_profile_id);

-- Trigger
DROP TRIGGER IF EXISTS update_team_readiness_updated_at ON team_readiness_assessments;
CREATE TRIGGER update_team_readiness_updated_at
    BEFORE UPDATE ON team_readiness_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE team_readiness_assessments IS 'Team AI readiness from Align 120 Module 3';

-- ============================================
-- BRAND ALIGNMENT ASSESSMENTS TABLE
-- Output from Module 4: Brand Review & Alignment
-- ============================================
CREATE TABLE IF NOT EXISTS brand_alignment_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,

    -- Assessment Metadata
    assessment_date DATE DEFAULT CURRENT_DATE,

    -- Brand Voice Profile
    brand_voice JSONB DEFAULT '{}',
    -- Format: {"tone": [...], "personality_traits": [...], "do": [...], "dont": [...], "vocabulary": {"preferred": [...], "avoid": [...]}}

    -- AI Content Policy
    ai_content_policy JSONB DEFAULT '{}',
    -- Format: {"approved_use_cases": [...], "restricted_use_cases": [...], "prohibited_use_cases": [...], "review_requirements": {...}, "disclosure_rules": {...}}

    -- Trust & Safety Matrix
    trust_safety_matrix JSONB DEFAULT '[]',
    -- Format: [{"risk_area": "...", "description": "...", "likelihood": "high|medium|low", "impact": "high|medium|low", "controls": [...]}]

    -- Customer Sentiment Summary
    customer_sentiment JSONB DEFAULT '{}',
    -- Format: {"overall_score": 0-100, "themes": [...], "friction_points": [...], "positive_drivers": [...], "data_sources": [...]}

    -- Competitive Positioning
    competitive_positioning JSONB DEFAULT '{}',
    -- Format: {"market_position": "...", "differentiators": [...], "competitor_summary": [...], "positioning_statement": "..."}

    -- Brand-Safe Prompt Templates
    prompt_templates JSONB DEFAULT '[]',
    -- Format: [{"use_case": "...", "template": "...", "guardrails": [...], "approved_by": "...", "version": "..."}]

    -- Summary
    alignment_summary TEXT,

    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'reviewed')),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_brand_alignment_user ON brand_alignment_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_alignment_company ON brand_alignment_assessments(company_profile_id);

-- Trigger
DROP TRIGGER IF EXISTS update_brand_alignment_updated_at ON brand_alignment_assessments;
CREATE TRIGGER update_brand_alignment_updated_at
    BEFORE UPDATE ON brand_alignment_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE brand_alignment_assessments IS 'Brand alignment from Align 120 Module 4';

-- ============================================
-- CORPORATE ALIGNMENT TABLE
-- Output from Module 5: Corporate Alignment Process
-- ============================================
CREATE TABLE IF NOT EXISTS corporate_alignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,

    -- Assessment Metadata
    assessment_date DATE DEFAULT CURRENT_DATE,

    -- Stakeholder Map
    stakeholder_map JSONB DEFAULT '[]',
    -- Format: [{"name": "...", "role": "...", "influence": "high|medium|low", "interest": "high|medium|low", "stance": "champion|supporter|neutral|skeptic|blocker", "engagement_strategy": "..."}]

    -- RACI Matrix
    raci_matrix JSONB DEFAULT '[]',
    -- Format: [{"activity": "...", "responsible": [...], "accountable": "...", "consulted": [...], "informed": [...]}]

    -- Governance Charter
    governance_charter JSONB DEFAULT '{}',
    -- Format: {"steering_committee": {...}, "decision_rights": {...}, "escalation_paths": {...}, "review_cadence": "...", "reporting_structure": {...}}

    -- Policy Drafts
    policy_drafts JSONB DEFAULT '[]',
    -- Format: [{"policy_name": "...", "policy_type": "acceptable_use|procurement|evaluation|incident_response", "status": "draft|review|approved", "content_summary": "...", "owner": "..."}]

    -- AI Portfolio (Prioritized Initiatives)
    ai_portfolio JSONB DEFAULT '[]',
    -- Format: [{"initiative": "...", "priority_rank": 1-N, "strategic_alignment": 0-100, "feasibility": 0-100, "impact": 0-100, "timeline": "...", "owner": "...", "status": "planned|in_progress|completed|deferred"}]

    -- 90-Day Roadmap
    roadmap_90_day JSONB DEFAULT '[]',
    -- Format: [{"week": 1-12, "milestone": "...", "deliverables": [...], "dependencies": [...], "owner": "...", "status": "pending|in_progress|completed"}]

    -- Overall Alignment Score
    alignment_score INTEGER CHECK (alignment_score >= 0 AND alignment_score <= 100),

    -- Summary
    alignment_summary TEXT,
    open_decisions JSONB DEFAULT '[]',

    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'approved')),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_corporate_alignment_user ON corporate_alignments(user_id);
CREATE INDEX IF NOT EXISTS idx_corporate_alignment_company ON corporate_alignments(company_profile_id);

-- Trigger
DROP TRIGGER IF EXISTS update_corporate_alignment_updated_at ON corporate_alignments;
CREATE TRIGGER update_corporate_alignment_updated_at
    BEFORE UPDATE ON corporate_alignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE corporate_alignments IS 'Corporate alignment from Align 120 Module 5';

-- ============================================
-- ALIGN 120 SESSIONS TABLE
-- Track Align 120 assessment sessions/engagements
-- ============================================
CREATE TABLE IF NOT EXISTS align120_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,

    -- Session Info
    session_name TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Module Progress
    module_progress JSONB DEFAULT '{
        "ai_audit": {"status": "not_started", "progress": 0},
        "business_fundamentals": {"status": "not_started", "progress": 0},
        "team_upskilling": {"status": "not_started", "progress": 0},
        "brand_alignment": {"status": "not_started", "progress": 0},
        "corporate_alignment": {"status": "not_started", "progress": 0}
    }',

    -- Linked Assessments
    ai_maturity_id UUID REFERENCES ai_maturity_assessments(id) ON DELETE SET NULL,
    business_fundamentals_id UUID REFERENCES business_fundamentals(id) ON DELETE SET NULL,
    team_readiness_id UUID REFERENCES team_readiness_assessments(id) ON DELETE SET NULL,
    brand_alignment_id UUID REFERENCES brand_alignment_assessments(id) ON DELETE SET NULL,
    corporate_alignment_id UUID REFERENCES corporate_alignments(id) ON DELETE SET NULL,

    -- Overall Status
    overall_progress INTEGER DEFAULT 0 CHECK (overall_progress >= 0 AND overall_progress <= 100),
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),

    -- Outputs Generated
    alignment_brief_generated BOOLEAN DEFAULT false,
    governance_pack_generated BOOLEAN DEFAULT false,
    portfolio_generated BOOLEAN DEFAULT false,

    -- Notes
    facilitator_notes TEXT,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_align120_sessions_user ON align120_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_align120_sessions_company ON align120_sessions(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_align120_sessions_status ON align120_sessions(status);

-- Trigger
DROP TRIGGER IF EXISTS update_align120_sessions_updated_at ON align120_sessions;
CREATE TRIGGER update_align120_sessions_updated_at
    BEFORE UPDATE ON align120_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE align120_sessions IS 'Align 120 assessment session tracking';

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_maturity_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_fundamentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_readiness_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_alignment_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_alignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE align120_sessions ENABLE ROW LEVEL SECURITY;

-- Company Profiles policies
CREATE POLICY "Users can view own company_profiles" ON company_profiles
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own company_profiles" ON company_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own company_profiles" ON company_profiles
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own company_profiles" ON company_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- AI Maturity policies
CREATE POLICY "Users can view own ai_maturity_assessments" ON ai_maturity_assessments
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ai_maturity_assessments" ON ai_maturity_assessments
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ai_maturity_assessments" ON ai_maturity_assessments
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ai_maturity_assessments" ON ai_maturity_assessments
    FOR DELETE USING (auth.uid() = user_id);

-- Business Fundamentals policies
CREATE POLICY "Users can view own business_fundamentals" ON business_fundamentals
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own business_fundamentals" ON business_fundamentals
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own business_fundamentals" ON business_fundamentals
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own business_fundamentals" ON business_fundamentals
    FOR DELETE USING (auth.uid() = user_id);

-- Team Readiness policies
CREATE POLICY "Users can view own team_readiness_assessments" ON team_readiness_assessments
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own team_readiness_assessments" ON team_readiness_assessments
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own team_readiness_assessments" ON team_readiness_assessments
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own team_readiness_assessments" ON team_readiness_assessments
    FOR DELETE USING (auth.uid() = user_id);

-- Brand Alignment policies
CREATE POLICY "Users can view own brand_alignment_assessments" ON brand_alignment_assessments
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own brand_alignment_assessments" ON brand_alignment_assessments
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own brand_alignment_assessments" ON brand_alignment_assessments
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own brand_alignment_assessments" ON brand_alignment_assessments
    FOR DELETE USING (auth.uid() = user_id);

-- Corporate Alignment policies
CREATE POLICY "Users can view own corporate_alignments" ON corporate_alignments
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own corporate_alignments" ON corporate_alignments
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own corporate_alignments" ON corporate_alignments
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own corporate_alignments" ON corporate_alignments
    FOR DELETE USING (auth.uid() = user_id);

-- Align120 Sessions policies
CREATE POLICY "Users can view own align120_sessions" ON align120_sessions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own align120_sessions" ON align120_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own align120_sessions" ON align120_sessions
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own align120_sessions" ON align120_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- VIEWS
-- ============================================

-- Company Dashboard Summary View (without strategic_foundations dependency)
-- Note: strategic_foundations join added in phase7.1 after phase5 is confirmed
CREATE OR REPLACE VIEW company_dashboard_view AS
SELECT
    cp.id as company_id,
    cp.user_id,
    cp.company_name,
    cp.industry,
    cp.company_size,
    cp.status,

    -- AI Maturity
    ama.overall_score as ai_maturity_score,
    ama.maturity_level,
    ama.assessment_date as ai_assessment_date,

    -- Team Readiness
    tra.overall_readiness_score as team_readiness_score,
    tra.assessment_date as team_assessment_date,

    -- Corporate Alignment
    ca.alignment_score as corporate_alignment_score,
    ca.assessment_date as alignment_assessment_date,

    -- Session Progress
    a120.overall_progress as align120_progress,
    a120.status as align120_status,

    cp.updated_at

FROM company_profiles cp
LEFT JOIN ai_maturity_assessments ama ON ama.company_profile_id = cp.id
    AND ama.status = 'completed'
LEFT JOIN team_readiness_assessments tra ON tra.company_profile_id = cp.id
    AND tra.status = 'completed'
LEFT JOIN corporate_alignments ca ON ca.company_profile_id = cp.id
    AND ca.status IN ('completed', 'approved')
LEFT JOIN align120_sessions a120 ON a120.company_profile_id = cp.id
    AND a120.status = 'in_progress'
WHERE cp.is_current = true;

COMMENT ON VIEW company_dashboard_view IS 'Aggregated company dashboard data from Align 120 outputs';

-- ============================================
-- STRATEGIC FOUNDATIONS INTEGRATION (Optional)
-- Run this section ONLY if phase5-s2e-schema.sql has been applied
-- ============================================

-- To add strategic foundations to the dashboard view after Phase 5 is applied:
--
-- CREATE OR REPLACE VIEW company_dashboard_view AS
-- SELECT
--     cp.id as company_id,
--     cp.user_id,
--     cp.company_name,
--     cp.industry,
--     cp.company_size,
--     cp.status,
--     ama.overall_score as ai_maturity_score,
--     ama.maturity_level,
--     ama.assessment_date as ai_assessment_date,
--     tra.overall_readiness_score as team_readiness_score,
--     tra.assessment_date as team_assessment_date,
--     ca.alignment_score as corporate_alignment_score,
--     ca.assessment_date as alignment_assessment_date,
--     a120.overall_progress as align120_progress,
--     a120.status as align120_status,
--     sf.vision,
--     sf.mission,
--     sf.core_values,
--     cp.updated_at
-- FROM company_profiles cp
-- LEFT JOIN ai_maturity_assessments ama ON ama.company_profile_id = cp.id AND ama.status = 'completed'
-- LEFT JOIN team_readiness_assessments tra ON tra.company_profile_id = cp.id AND tra.status = 'completed'
-- LEFT JOIN corporate_alignments ca ON ca.company_profile_id = cp.id AND ca.status IN ('completed', 'approved')
-- LEFT JOIN align120_sessions a120 ON a120.company_profile_id = cp.id AND a120.status = 'in_progress'
-- LEFT JOIN strategic_foundations sf ON sf.user_id = cp.user_id AND sf.is_current = true
-- WHERE cp.is_current = true;

-- Align 120 Progress View
CREATE OR REPLACE VIEW align120_progress_view AS
SELECT
    a.id as session_id,
    a.session_name,
    cp.company_name,
    a.started_at,
    a.completed_at,
    a.overall_progress,
    a.status,

    -- Module statuses
    (a.module_progress->>'ai_audit')::jsonb->>'status' as ai_audit_status,
    ((a.module_progress->>'ai_audit')::jsonb->>'progress')::integer as ai_audit_progress,

    (a.module_progress->>'business_fundamentals')::jsonb->>'status' as business_fundamentals_status,
    ((a.module_progress->>'business_fundamentals')::jsonb->>'progress')::integer as business_fundamentals_progress,

    (a.module_progress->>'team_upskilling')::jsonb->>'status' as team_upskilling_status,
    ((a.module_progress->>'team_upskilling')::jsonb->>'progress')::integer as team_upskilling_progress,

    (a.module_progress->>'brand_alignment')::jsonb->>'status' as brand_alignment_status,
    ((a.module_progress->>'brand_alignment')::jsonb->>'progress')::integer as brand_alignment_progress,

    (a.module_progress->>'corporate_alignment')::jsonb->>'status' as corporate_alignment_status,
    ((a.module_progress->>'corporate_alignment')::jsonb->>'progress')::integer as corporate_alignment_progress,

    -- Output status
    a.alignment_brief_generated,
    a.governance_pack_generated,
    a.portfolio_generated

FROM align120_sessions a
JOIN company_profiles cp ON a.company_profile_id = cp.id;

COMMENT ON VIEW align120_progress_view IS 'Align 120 session progress tracking';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'company_profiles',
        'ai_maturity_assessments',
        'business_fundamentals',
        'team_readiness_assessments',
        'brand_alignment_assessments',
        'corporate_alignments',
        'align120_sessions'
    );

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'PHASE 7: COMPANY PROFILE SCHEMA CREATED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables created: %', table_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Tables:';
    RAISE NOTICE '  1. company_profiles - Master company record';
    RAISE NOTICE '  2. ai_maturity_assessments - Module 1 output';
    RAISE NOTICE '  3. business_fundamentals - Module 2 output';
    RAISE NOTICE '  4. team_readiness_assessments - Module 3 output';
    RAISE NOTICE '  5. brand_alignment_assessments - Module 4 output';
    RAISE NOTICE '  6. corporate_alignments - Module 5 output';
    RAISE NOTICE '  7. align120_sessions - Session tracking';
    RAISE NOTICE '';
    RAISE NOTICE 'Views:';
    RAISE NOTICE '  - company_dashboard_view';
    RAISE NOTICE '  - align120_progress_view';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
