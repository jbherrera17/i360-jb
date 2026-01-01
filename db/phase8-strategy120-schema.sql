-- ============================================================================
-- INSIGHT 360 - Phase 8: Strategy 120 Extended Schema
-- Version: 1.0
-- Date: December 2024
-- Description: OKR-BSC Fusion Model with cascade tracking,
--              investment planning, decision support, and intelligence
-- ============================================================================

-- ============================================================================
-- STRATEGY INITIATIVES TABLE
-- Tracks AI initiatives as distinct strategic investments
-- ============================================================================
CREATE TABLE IF NOT EXISTS strategy_initiatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    foundation_id UUID REFERENCES strategic_foundations(id) ON DELETE CASCADE,

    -- Initiative definition
    name TEXT NOT NULL,
    description TEXT,

    -- Strategic alignment
    strategic_theme_id UUID REFERENCES strategic_themes(id) ON DELETE SET NULL,
    perspective_type TEXT CHECK (perspective_type IN ('financial', 'customer', 'internal_process', 'learning_growth')),

    -- Status and priority
    status TEXT DEFAULT 'ideation'
        CHECK (status IN ('ideation', 'planning', 'approved', 'active', 'completed', 'cancelled', 'on_hold')),
    priority INTEGER DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),

    -- Initiative type
    ai_investment_type TEXT CHECK (ai_investment_type IN (
        'process_automation',
        'customer_facing',
        'decision_support',
        'research',
        'content_generation',
        'analytics',
        'infrastructure'
    )),

    -- Impact estimates
    estimated_impact JSONB DEFAULT '{}'::jsonb,
    -- Format: {
    --   "financial": {"revenue_impact": 0, "cost_savings": 0, "roi_percent": 0},
    --   "operational": {"efficiency_gain_percent": 0, "quality_improvement_percent": 0},
    --   "strategic": {"capability_lift": "", "competitive_advantage": ""},
    --   "confidence": "low|medium|high"
    -- }

    -- Timeline
    timeline JSONB DEFAULT '{}'::jsonb,
    -- Format: {
    --   "start_date": "2025-01-01",
    --   "end_date": "2025-06-30",
    --   "key_milestones": [{"name": "", "date": "", "status": "pending|complete"}]
    -- }

    -- Resource requirements
    resource_requirements JSONB DEFAULT '{}'::jsonb,
    -- Format: {
    --   "budget": 0,
    --   "headcount": 0,
    --   "skills_needed": ["skill1", "skill2"],
    --   "tools_needed": ["tool1", "tool2"]
    -- }

    -- Risk assessment
    risk_assessment JSONB DEFAULT '[]'::jsonb,
    -- Format: [{"risk": "", "severity": "low|medium|high", "probability": "low|medium|high", "mitigation": ""}]

    -- Ownership
    owner_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,

    -- OKR linkages (array of linked OKR IDs)
    related_okr_ids UUID[] DEFAULT '{}',

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_strategy_initiatives_user ON strategy_initiatives(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_initiatives_foundation ON strategy_initiatives(foundation_id);
CREATE INDEX IF NOT EXISTS idx_strategy_initiatives_theme ON strategy_initiatives(strategic_theme_id);
CREATE INDEX IF NOT EXISTS idx_strategy_initiatives_perspective ON strategy_initiatives(perspective_type);
CREATE INDEX IF NOT EXISTS idx_strategy_initiatives_status ON strategy_initiatives(status);
CREATE INDEX IF NOT EXISTS idx_strategy_initiatives_priority ON strategy_initiatives(priority DESC);
CREATE INDEX IF NOT EXISTS idx_strategy_initiatives_type ON strategy_initiatives(ai_investment_type);
CREATE INDEX IF NOT EXISTS idx_strategy_initiatives_okrs ON strategy_initiatives USING GIN(related_okr_ids);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_strategy_initiatives_updated_at ON strategy_initiatives;
CREATE TRIGGER update_strategy_initiatives_updated_at
    BEFORE UPDATE ON strategy_initiatives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE strategy_initiatives IS 'AI initiatives with strategic alignment, impact estimates, and resource planning';

-- ============================================================================
-- BUSINESS CASES TABLE
-- Investment business cases and ROI models
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    initiative_id UUID REFERENCES strategy_initiatives(id) ON DELETE CASCADE,
    foundation_id UUID REFERENCES strategic_foundations(id) ON DELETE CASCADE,

    -- Case definition
    name TEXT NOT NULL,
    description TEXT,

    -- Case type (supports scenario modeling)
    case_type TEXT DEFAULT 'base_case'
        CHECK (case_type IN ('base_case', 'best_case', 'worst_case', 'likely_case')),

    -- Status
    status TEXT DEFAULT 'draft'
        CHECK (status IN ('draft', 'under_review', 'approved', 'rejected', 'archived')),

    -- Financial model
    financial_model JSONB DEFAULT '{}'::jsonb,
    -- Format: {
    --   "investment_amount": 0,
    --   "currency": "USD",
    --   "implementation_months": 6,
    --   "ramp_up_months": 3,
    --   "year_1_revenue_impact": 0,
    --   "year_2_revenue_impact": 0,
    --   "year_3_revenue_impact": 0,
    --   "annual_cost_savings": 0,
    --   "roi_percent": 0,
    --   "payback_months": 0,
    --   "npv": 0,
    --   "irr_percent": 0
    -- }

    -- Operational impact
    operational_impact JSONB DEFAULT '{}'::jsonb,
    -- Format: {
    --   "fte_required": 0,
    --   "process_efficiency_percent": 0,
    --   "quality_improvement_percent": 0,
    --   "time_to_market_reduction_percent": 0,
    --   "customer_satisfaction_impact": ""
    -- }

    -- Strategic impact
    strategic_impact JSONB DEFAULT '{}'::jsonb,
    -- Format: {
    --   "market_share_impact": "",
    --   "competitive_advantage_days": 0,
    --   "capability_maturity_lift": "",
    --   "risk_mitigation_value": 0
    -- }

    -- Assumptions (critical for scenario validation)
    assumptions JSONB DEFAULT '[]'::jsonb,
    -- Format: [{"assumption": "", "rationale": "", "sensitivity": "low|medium|high"}]

    -- Dependencies
    dependencies JSONB DEFAULT '[]'::jsonb,
    -- Format: [{"type": "technology|skill|process|budget", "description": "", "status": "resolved|pending"}]

    -- Approval workflow
    approval_chain JSONB DEFAULT '{}'::jsonb,
    -- Format: {
    --   "submitted_by": "role_id",
    --   "submitted_date": "timestamp",
    --   "approvers": [{"role_id": "", "status": "pending|approved|rejected", "date": "", "comments": ""}]
    -- }

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_cases_user ON business_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_business_cases_initiative ON business_cases(initiative_id);
CREATE INDEX IF NOT EXISTS idx_business_cases_foundation ON business_cases(foundation_id);
CREATE INDEX IF NOT EXISTS idx_business_cases_type ON business_cases(case_type);
CREATE INDEX IF NOT EXISTS idx_business_cases_status ON business_cases(status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_business_cases_updated_at ON business_cases;
CREATE TRIGGER update_business_cases_updated_at
    BEFORE UPDATE ON business_cases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE business_cases IS 'Investment business cases with financial models, assumptions, and approval workflows';

-- ============================================================================
-- SCENARIO MODELS TABLE
-- Best/worst/likely scenario analysis for initiatives
-- ============================================================================
CREATE TABLE IF NOT EXISTS scenario_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    business_case_id UUID REFERENCES business_cases(id) ON DELETE CASCADE,
    initiative_id UUID REFERENCES strategy_initiatives(id) ON DELETE CASCADE,
    foundation_id UUID REFERENCES strategic_foundations(id) ON DELETE CASCADE,

    -- Scenario definition
    name TEXT NOT NULL,
    description TEXT,

    -- Scenario type
    scenario_type TEXT NOT NULL
        CHECK (scenario_type IN ('best_case', 'worst_case', 'likely_case', 'pessimistic', 'optimistic')),

    -- Probability weighting (for expected value calculations)
    probability_percent INTEGER DEFAULT 0 CHECK (probability_percent >= 0 AND probability_percent <= 100),

    -- Key assumptions for this scenario
    key_assumptions JSONB DEFAULT '[]'::jsonb,
    -- Format: [{"assumption": "", "confidence": "high|medium|low", "rationale": ""}]

    -- Outcomes
    outcomes JSONB DEFAULT '{}'::jsonb,
    -- Format: {
    --   "revenue_impact": 0,
    --   "cost_impact": 0,
    --   "timeline_months": 0,
    --   "risk_factors": [{"factor": "", "probability_percent": 0, "impact_value": 0}],
    --   "key_milestones": [{"name": "", "date": ""}],
    --   "success_metrics": [{"metric": "", "target": 0, "unit": ""}]
    -- }

    -- Resource requirements for this scenario
    resource_requirements JSONB DEFAULT '{}'::jsonb,
    -- Format: {
    --   "budget": 0,
    --   "headcount": 0,
    --   "infrastructure_cost": 0,
    --   "training_budget": 0
    -- }

    -- Timeline sensitivity
    timeline_sensitivity JSONB DEFAULT '{}'::jsonb,
    -- Format: {
    --   "delay_impact_percent": 0,
    --   "acceleration_benefit_percent": 0
    -- }

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scenario_models_user ON scenario_models(user_id);
CREATE INDEX IF NOT EXISTS idx_scenario_models_business_case ON scenario_models(business_case_id);
CREATE INDEX IF NOT EXISTS idx_scenario_models_initiative ON scenario_models(initiative_id);
CREATE INDEX IF NOT EXISTS idx_scenario_models_type ON scenario_models(scenario_type);
CREATE INDEX IF NOT EXISTS idx_scenario_models_probability ON scenario_models(probability_percent DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_scenario_models_updated_at ON scenario_models;
CREATE TRIGGER update_scenario_models_updated_at
    BEFORE UPDATE ON scenario_models
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE scenario_models IS 'Scenario analysis with probability weighting for expected value calculations';

-- ============================================================================
-- DECISION LOG TABLE
-- Strategic decision documentation with options and outcomes
-- ============================================================================
CREATE TABLE IF NOT EXISTS decision_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    foundation_id UUID REFERENCES strategic_foundations(id) ON DELETE CASCADE,

    -- Decision metadata
    decision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    title TEXT NOT NULL,
    description TEXT,

    -- Status
    decision_status TEXT DEFAULT 'pending'
        CHECK (decision_status IN ('pending', 'decided', 'implemented', 'reviewed', 'reversed')),

    -- Ownership
    owner_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,

    -- Categorization
    decision_category TEXT CHECK (decision_category IN (
        'strategic', 'investment', 'resource_allocation',
        'priority', 'governance', 'technology', 'process'
    )),
    decision_type TEXT CHECK (decision_type IN (
        'go_no_go', 'selection', 'prioritization', 'trade_off', 'approval'
    )),

    -- Options considered
    options_considered JSONB DEFAULT '[]'::jsonb,
    -- Format: [{
    --   "option_id": "uuid",
    --   "name": "",
    --   "description": "",
    --   "pros": [""],
    --   "cons": [""],
    --   "resource_requirement": 0,
    --   "risk_level": "low|medium|high",
    --   "upside_potential": 0,
    --   "downside_risk": 0,
    --   "scores": {"criterion_name": score}
    -- }]

    -- Decision criteria with weights
    decision_criteria JSONB DEFAULT '[]'::jsonb,
    -- Format: [{
    --   "criterion": "",
    --   "weight": 0-100,
    --   "threshold": "must_have|desirable|nice_to_have"
    -- }]

    -- Selected option
    selected_option_id UUID,
    decision_rationale TEXT,

    -- Risk-benefit analysis
    risk_benefit_analysis JSONB DEFAULT '{}'::jsonb,
    -- Format: {
    --   "key_risks": [""],
    --   "key_benefits": [""],
    --   "risk_mitigation_plan": "",
    --   "success_criteria": [""]
    -- }

    -- Assumptions tested (from Decision Support agents)
    assumptions_tested JSONB DEFAULT '[]'::jsonb,
    -- Format: [{"assumption": "", "tested_how": "", "validity": "confirmed|questionable|invalid"}]

    -- Alternative perspectives (from Second Opinion Generator)
    alternative_perspectives JSONB DEFAULT '[]'::jsonb,
    -- Format: [{"perspective": "", "reasoning": "", "counter_argument": ""}]

    -- Approvers
    approvers JSONB DEFAULT '[]'::jsonb,
    -- Format: [{"role_id": "", "approval_date": "", "status": "approved|approved_with_conditions|rejected", "comments": ""}]

    -- Implementation tracking
    implementation_status TEXT DEFAULT 'pending'
        CHECK (implementation_status IN ('pending', 'in_progress', 'completed', 'abandoned')),
    implementation_notes TEXT,

    -- Review scheduling
    decision_review_date DATE,

    -- Actual outcomes (for retrospective analysis)
    actual_outcomes JSONB DEFAULT '{}'::jsonb,
    -- Format: {
    --   "outcome_summary": "",
    --   "metrics_achieved": [{"metric": "", "target": 0, "actual": 0}],
    --   "lessons_learned": [""]
    -- }

    -- Related entities
    related_initiative_id UUID REFERENCES strategy_initiatives(id) ON DELETE SET NULL,
    related_objective_id UUID REFERENCES bsc_objectives(id) ON DELETE SET NULL,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_decision_log_user ON decision_log(user_id);
CREATE INDEX IF NOT EXISTS idx_decision_log_foundation ON decision_log(foundation_id);
CREATE INDEX IF NOT EXISTS idx_decision_log_date ON decision_log(decision_date DESC);
CREATE INDEX IF NOT EXISTS idx_decision_log_status ON decision_log(decision_status);
CREATE INDEX IF NOT EXISTS idx_decision_log_category ON decision_log(decision_category);
CREATE INDEX IF NOT EXISTS idx_decision_log_owner ON decision_log(owner_role_id);
CREATE INDEX IF NOT EXISTS idx_decision_log_initiative ON decision_log(related_initiative_id);
CREATE INDEX IF NOT EXISTS idx_decision_log_review ON decision_log(decision_review_date);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_decision_log_updated_at ON decision_log;
CREATE TRIGGER update_decision_log_updated_at
    BEFORE UPDATE ON decision_log
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE decision_log IS 'Strategic decision documentation with options, rationale, and outcome tracking';

-- ============================================================================
-- INTELLIGENCE BRIEFS TABLE
-- Market and competitive intelligence from Research & Intelligence agents
-- ============================================================================
CREATE TABLE IF NOT EXISTS intelligence_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    foundation_id UUID REFERENCES strategic_foundations(id) ON DELETE CASCADE,

    -- Brief definition
    title TEXT NOT NULL,
    summary TEXT NOT NULL,

    -- Brief type
    brief_type TEXT NOT NULL CHECK (brief_type IN (
        'market_trends', 'technology_radar', 'competitive_analysis',
        'regulatory', 'best_practices', 'opportunity', 'threat'
    )),

    -- Source categorization
    source_category TEXT CHECK (source_category IN (
        'analyst_report', 'news', 'patent_filing', 'conference',
        'research', 'customer_feedback', 'internal_insight', 'competitor_action'
    )),

    -- Sources
    sources JSONB DEFAULT '[]'::jsonb,
    -- Format: [{"source": "url or name", "date_published": "", "credibility": "high|medium|low", "summary": ""}]

    -- Relevance and impact
    relevance_score INTEGER DEFAULT 50 CHECK (relevance_score >= 0 AND relevance_score <= 100),
    impact_on_strategy TEXT CHECK (impact_on_strategy IN (
        'critical_threat', 'significant_opportunity', 'minor_opportunity',
        'awareness_only', 'requires_monitoring'
    )),

    -- Strategic linkages
    relevant_themes UUID[] DEFAULT '{}',
    relevant_initiatives UUID[] DEFAULT '{}',

    -- Key findings
    key_findings JSONB DEFAULT '[]'::jsonb,
    -- Format: [{
    --   "finding": "",
    --   "implication": "",
    --   "recommended_action": "",
    --   "timeline": "immediate|3_months|6_months|12_months"
    -- }]

    -- Competitive context (for competitive_analysis type)
    competitive_context JSONB DEFAULT '{}'::jsonb,
    -- Format: {
    --   "competitors_affected": [""],
    --   "market_shift_percent": 0,
    --   "barrier_to_entry_change": "",
    --   "customer_behavior_impact": ""
    -- }

    -- Technology context (for technology_radar type)
    technology_context JSONB DEFAULT '{}'::jsonb,
    -- Format: {
    --   "technology_name": "",
    --   "maturity_level": "emerging|growth|mature|declining",
    --   "adoption_timeline": "",
    --   "investment_required": 0,
    --   "internal_capability_gap": ""
    -- }

    -- Full content
    content TEXT,

    -- Attachments
    attachments JSONB DEFAULT '[]'::jsonb,
    -- Format: [{"filename": "", "url": "", "type": "report|chart|data|reference"}]

    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_date TIMESTAMP WITH TIME ZONE,
    next_review_date DATE,

    -- Authorship
    author_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    generating_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_intelligence_briefs_user ON intelligence_briefs(user_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_briefs_foundation ON intelligence_briefs(foundation_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_briefs_type ON intelligence_briefs(brief_type);
CREATE INDEX IF NOT EXISTS idx_intelligence_briefs_impact ON intelligence_briefs(impact_on_strategy);
CREATE INDEX IF NOT EXISTS idx_intelligence_briefs_relevance ON intelligence_briefs(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_intelligence_briefs_published ON intelligence_briefs(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_intelligence_briefs_status ON intelligence_briefs(status);
CREATE INDEX IF NOT EXISTS idx_intelligence_briefs_themes ON intelligence_briefs USING GIN(relevant_themes);
CREATE INDEX IF NOT EXISTS idx_intelligence_briefs_initiatives ON intelligence_briefs USING GIN(relevant_initiatives);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_intelligence_briefs_updated_at ON intelligence_briefs;
CREATE TRIGGER update_intelligence_briefs_updated_at
    BEFORE UPDATE ON intelligence_briefs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE intelligence_briefs IS 'Market and competitive intelligence with strategic relevance scoring';

-- ============================================================================
-- OKR CASCADE TRACKING TABLE
-- Tracks BSC → Company → Department → Individual OKR alignment
-- ============================================================================
CREATE TABLE IF NOT EXISTS okr_cascade_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    foundation_id UUID REFERENCES strategic_foundations(id) ON DELETE CASCADE,

    -- Parent-child relationship
    parent_okr_id UUID REFERENCES okrs(id) ON DELETE CASCADE,
    child_okr_id UUID REFERENCES okrs(id) ON DELETE CASCADE,

    -- Cascade level
    cascade_level TEXT NOT NULL CHECK (cascade_level IN (
        'bsc_to_company', 'company_to_department', 'department_to_individual'
    )),

    -- BSC perspective alignment
    perspective_type TEXT CHECK (perspective_type IN ('financial', 'customer', 'internal_process', 'learning_growth')),

    -- Alignment metrics
    alignment_score INTEGER DEFAULT 100 CHECK (alignment_score >= 0 AND alignment_score <= 100),
    alignment_rationale TEXT,

    -- Contribution weight (how much child contributes to parent)
    contribution_weight INTEGER DEFAULT 100 CHECK (contribution_weight >= 0 AND contribution_weight <= 100),

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_validated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate links
    UNIQUE(parent_okr_id, child_okr_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_okr_cascade_user ON okr_cascade_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_okr_cascade_foundation ON okr_cascade_tracking(foundation_id);
CREATE INDEX IF NOT EXISTS idx_okr_cascade_parent ON okr_cascade_tracking(parent_okr_id);
CREATE INDEX IF NOT EXISTS idx_okr_cascade_child ON okr_cascade_tracking(child_okr_id);
CREATE INDEX IF NOT EXISTS idx_okr_cascade_level ON okr_cascade_tracking(cascade_level);
CREATE INDEX IF NOT EXISTS idx_okr_cascade_perspective ON okr_cascade_tracking(perspective_type);
CREATE INDEX IF NOT EXISTS idx_okr_cascade_alignment ON okr_cascade_tracking(alignment_score DESC);
CREATE INDEX IF NOT EXISTS idx_okr_cascade_active ON okr_cascade_tracking(is_active);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_okr_cascade_tracking_updated_at ON okr_cascade_tracking;
CREATE TRIGGER update_okr_cascade_tracking_updated_at
    BEFORE UPDATE ON okr_cascade_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE okr_cascade_tracking IS 'Tracks OKR cascade from BSC through company/department/individual levels';

-- ============================================================================
-- BSC PERSPECTIVE SCORES TABLE
-- Aggregated performance scores for each BSC perspective
-- ============================================================================
CREATE TABLE IF NOT EXISTS bsc_perspective_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    foundation_id UUID REFERENCES strategic_foundations(id) ON DELETE CASCADE,
    perspective_id UUID REFERENCES bsc_perspectives(id) ON DELETE CASCADE,

    -- Calculation metadata
    calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    calculation_period TEXT NOT NULL CHECK (calculation_period IN ('daily', 'weekly', 'monthly', 'quarterly')),

    -- Scores
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    progress_score INTEGER CHECK (progress_score >= 0 AND progress_score <= 100),
    alignment_score INTEGER CHECK (alignment_score >= 0 AND alignment_score <= 100),
    health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),

    -- Contributing OKRs
    contributing_okr_ids UUID[] DEFAULT '{}',
    okr_count INTEGER DEFAULT 0,

    -- Score breakdown by level
    company_okr_score INTEGER CHECK (company_okr_score >= 0 AND company_okr_score <= 100),
    department_okr_score INTEGER CHECK (department_okr_score >= 0 AND department_okr_score <= 100),
    individual_okr_score INTEGER CHECK (individual_okr_score >= 0 AND individual_okr_score <= 100),

    -- Trend indicators
    score_trend TEXT CHECK (score_trend IN ('improving', 'stable', 'declining')),
    trend_percentage NUMERIC(5,2),

    -- Analysis notes
    analysis_notes TEXT,
    recommendations JSONB DEFAULT '[]'::jsonb,
    -- Format: [{"recommendation": "", "priority": "high|medium|low", "related_okr_id": ""}]

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bsc_scores_user ON bsc_perspective_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_bsc_scores_foundation ON bsc_perspective_scores(foundation_id);
CREATE INDEX IF NOT EXISTS idx_bsc_scores_perspective ON bsc_perspective_scores(perspective_id);
CREATE INDEX IF NOT EXISTS idx_bsc_scores_date ON bsc_perspective_scores(calculation_date DESC);
CREATE INDEX IF NOT EXISTS idx_bsc_scores_period ON bsc_perspective_scores(calculation_period);
CREATE INDEX IF NOT EXISTS idx_bsc_scores_overall ON bsc_perspective_scores(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_bsc_scores_okrs ON bsc_perspective_scores USING GIN(contributing_okr_ids);

COMMENT ON TABLE bsc_perspective_scores IS 'Aggregated BSC perspective performance with OKR cascade contributions';

-- ============================================================================
-- STRATEGY INITIATIVE DEPENDENCIES TABLE
-- Junction table for initiative dependencies
-- ============================================================================
CREATE TABLE IF NOT EXISTS strategy_initiative_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Dependency relationship
    initiative_id UUID NOT NULL REFERENCES strategy_initiatives(id) ON DELETE CASCADE,
    depends_on_initiative_id UUID NOT NULL REFERENCES strategy_initiatives(id) ON DELETE CASCADE,

    -- Dependency type
    dependency_type TEXT NOT NULL CHECK (dependency_type IN ('blocks', 'enables', 'related', 'conflicts')),

    -- Sequence order (for execution planning)
    sequence_order INTEGER DEFAULT 0,

    -- Description
    description TEXT,

    -- Status
    is_resolved BOOLEAN DEFAULT false,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent self-references and duplicates
    UNIQUE(initiative_id, depends_on_initiative_id),
    CHECK(initiative_id != depends_on_initiative_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_initiative_deps_user ON strategy_initiative_dependencies(user_id);
CREATE INDEX IF NOT EXISTS idx_initiative_deps_initiative ON strategy_initiative_dependencies(initiative_id);
CREATE INDEX IF NOT EXISTS idx_initiative_deps_depends_on ON strategy_initiative_dependencies(depends_on_initiative_id);
CREATE INDEX IF NOT EXISTS idx_initiative_deps_type ON strategy_initiative_dependencies(dependency_type);

COMMENT ON TABLE strategy_initiative_dependencies IS 'Maps dependencies between strategic initiatives';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE strategy_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_cascade_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE bsc_perspective_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_initiative_dependencies ENABLE ROW LEVEL SECURITY;

-- Strategy Initiatives policies
CREATE POLICY "Users can view own strategy_initiatives" ON strategy_initiatives
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own strategy_initiatives" ON strategy_initiatives
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own strategy_initiatives" ON strategy_initiatives
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own strategy_initiatives" ON strategy_initiatives
    FOR DELETE USING (auth.uid() = user_id);

-- Business Cases policies
CREATE POLICY "Users can view own business_cases" ON business_cases
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own business_cases" ON business_cases
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own business_cases" ON business_cases
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own business_cases" ON business_cases
    FOR DELETE USING (auth.uid() = user_id);

-- Scenario Models policies
CREATE POLICY "Users can view own scenario_models" ON scenario_models
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scenario_models" ON scenario_models
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scenario_models" ON scenario_models
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scenario_models" ON scenario_models
    FOR DELETE USING (auth.uid() = user_id);

-- Decision Log policies
CREATE POLICY "Users can view own decision_log" ON decision_log
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own decision_log" ON decision_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own decision_log" ON decision_log
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own decision_log" ON decision_log
    FOR DELETE USING (auth.uid() = user_id);

-- Intelligence Briefs policies
CREATE POLICY "Users can view own intelligence_briefs" ON intelligence_briefs
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own intelligence_briefs" ON intelligence_briefs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own intelligence_briefs" ON intelligence_briefs
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own intelligence_briefs" ON intelligence_briefs
    FOR DELETE USING (auth.uid() = user_id);

-- OKR Cascade Tracking policies
CREATE POLICY "Users can view own okr_cascade_tracking" ON okr_cascade_tracking
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own okr_cascade_tracking" ON okr_cascade_tracking
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own okr_cascade_tracking" ON okr_cascade_tracking
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own okr_cascade_tracking" ON okr_cascade_tracking
    FOR DELETE USING (auth.uid() = user_id);

-- BSC Perspective Scores policies
CREATE POLICY "Users can view own bsc_perspective_scores" ON bsc_perspective_scores
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bsc_perspective_scores" ON bsc_perspective_scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bsc_perspective_scores" ON bsc_perspective_scores
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bsc_perspective_scores" ON bsc_perspective_scores
    FOR DELETE USING (auth.uid() = user_id);

-- Strategy Initiative Dependencies policies
CREATE POLICY "Users can view own strategy_initiative_dependencies" ON strategy_initiative_dependencies
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own strategy_initiative_dependencies" ON strategy_initiative_dependencies
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own strategy_initiative_dependencies" ON strategy_initiative_dependencies
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own strategy_initiative_dependencies" ON strategy_initiative_dependencies
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Strategy Map Cascade View - Full BSC→OKR cascade visualization
CREATE OR REPLACE VIEW strategy_map_cascade_view AS
SELECT
    sf.id as foundation_id,
    sf.vision,
    sf.mission,
    sf.planning_period,

    -- BSC Perspective
    bp.id as perspective_id,
    bp.name as perspective_name,
    bp.perspective_type,

    -- BSC Objective
    bo.id as objective_id,
    bo.name as objective_name,
    bo.status as objective_status,

    -- Company OKRs linked to objective
    o.id as okr_id,
    o.title as okr_title,
    o.scope as okr_scope,
    o.progress as okr_progress,
    o.status as okr_status,

    -- Cascade tracking
    oct.cascade_level,
    oct.alignment_score,
    oct.contribution_weight,

    -- Child OKR (department/individual)
    child_okr.id as child_okr_id,
    child_okr.title as child_okr_title,
    child_okr.scope as child_okr_scope,
    child_okr.progress as child_okr_progress

FROM strategic_foundations sf
LEFT JOIN bsc_perspectives bp ON bp.foundation_id = sf.id
LEFT JOIN bsc_objectives bo ON bo.perspective_id = bp.id
LEFT JOIN okr_strategic_links osl ON osl.bsc_objective_id = bo.id
LEFT JOIN okrs o ON osl.okr_id = o.id
LEFT JOIN okr_cascade_tracking oct ON oct.parent_okr_id = o.id
LEFT JOIN okrs child_okr ON oct.child_okr_id = child_okr.id
WHERE sf.is_current = true
ORDER BY bp.sort_order, bo.sort_order, o.created_at, oct.cascade_level;

COMMENT ON VIEW strategy_map_cascade_view IS 'Complete BSC→OKR cascade visualization with alignment scores';

-- Alignment Score View - Cross-level alignment metrics
CREATE OR REPLACE VIEW alignment_score_view AS
SELECT
    sf.id as foundation_id,
    bp.perspective_type,
    bp.name as perspective_name,

    -- Alignment by cascade level
    oct.cascade_level,
    COUNT(*) as link_count,
    ROUND(AVG(oct.alignment_score), 1) as avg_alignment_score,
    ROUND(AVG(oct.contribution_weight), 1) as avg_contribution_weight,

    -- OKR progress at this level
    ROUND(AVG(child_okr.progress), 1) as avg_okr_progress,

    -- Health indicators
    SUM(CASE WHEN oct.alignment_score >= 80 THEN 1 ELSE 0 END) as high_alignment_count,
    SUM(CASE WHEN oct.alignment_score < 50 THEN 1 ELSE 0 END) as low_alignment_count

FROM strategic_foundations sf
JOIN bsc_perspectives bp ON bp.foundation_id = sf.id
JOIN bsc_objectives bo ON bo.perspective_id = bp.id
JOIN okr_strategic_links osl ON osl.bsc_objective_id = bo.id
JOIN okrs parent_okr ON osl.okr_id = parent_okr.id
JOIN okr_cascade_tracking oct ON oct.parent_okr_id = parent_okr.id AND oct.is_active = true
JOIN okrs child_okr ON oct.child_okr_id = child_okr.id
WHERE sf.is_current = true
GROUP BY sf.id, bp.perspective_type, bp.name, oct.cascade_level;

COMMENT ON VIEW alignment_score_view IS 'Aggregated alignment scores by perspective and cascade level';

-- Perspective Performance View - BSC scores with OKR progress
CREATE OR REPLACE VIEW perspective_performance_view AS
SELECT
    bps.foundation_id,
    bp.name as perspective_name,
    bp.perspective_type,
    bp.guiding_question,

    -- Latest scores
    bps.calculation_date,
    bps.overall_score,
    bps.progress_score,
    bps.alignment_score,
    bps.health_score,

    -- Level breakdown
    bps.company_okr_score,
    bps.department_okr_score,
    bps.individual_okr_score,

    -- Trend
    bps.score_trend,
    bps.trend_percentage,

    -- OKR stats
    bps.okr_count,

    -- Recommendations
    bps.recommendations

FROM bsc_perspective_scores bps
JOIN bsc_perspectives bp ON bps.perspective_id = bp.id
WHERE bps.calculation_date = (
    SELECT MAX(calculation_date)
    FROM bsc_perspective_scores
    WHERE perspective_id = bps.perspective_id
);

COMMENT ON VIEW perspective_performance_view IS 'Latest BSC perspective performance with trend indicators';

-- Initiative Portfolio View - Initiatives with business case summary
CREATE OR REPLACE VIEW initiative_portfolio_view AS
SELECT
    si.id as initiative_id,
    si.name as initiative_name,
    si.description,
    si.status,
    si.priority,
    si.ai_investment_type,
    si.perspective_type,

    -- Strategic alignment
    st.name as theme_name,

    -- Financial summary from business case
    bc.financial_model->>'investment_amount' as investment_amount,
    bc.financial_model->>'roi_percent' as roi_percent,
    bc.financial_model->>'payback_months' as payback_months,
    bc.status as business_case_status,

    -- Impact summary
    si.estimated_impact->>'confidence' as impact_confidence,

    -- Resource summary
    si.resource_requirements->>'budget' as budget,
    si.resource_requirements->>'headcount' as headcount,

    -- Risk count
    jsonb_array_length(si.risk_assessment) as risk_count,

    -- Dependency count
    (SELECT COUNT(*) FROM strategy_initiative_dependencies WHERE initiative_id = si.id) as dependency_count,

    -- Related OKRs
    array_length(si.related_okr_ids, 1) as linked_okr_count

FROM strategy_initiatives si
LEFT JOIN strategic_themes st ON si.strategic_theme_id = st.id
LEFT JOIN business_cases bc ON bc.initiative_id = si.id AND bc.case_type = 'base_case'
ORDER BY si.priority DESC, si.created_at DESC;

COMMENT ON VIEW initiative_portfolio_view IS 'Initiative portfolio with business case summaries and metrics';

-- Decision Timeline View - Decisions by date for governance
CREATE OR REPLACE VIEW decision_timeline_view AS
SELECT
    dl.id as decision_id,
    dl.decision_date,
    dl.title,
    dl.decision_category,
    dl.decision_type,
    dl.decision_status,
    dl.implementation_status,

    -- Owner
    r.title as owner_name,

    -- Options count
    jsonb_array_length(dl.options_considered) as options_count,

    -- Has selected option
    CASE WHEN dl.selected_option_id IS NOT NULL THEN true ELSE false END as has_decision,

    -- Related entities
    si.name as related_initiative_name,
    bo.name as related_objective_name,

    -- Review status
    dl.decision_review_date,
    CASE
        WHEN dl.decision_review_date < CURRENT_DATE THEN 'overdue'
        WHEN dl.decision_review_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
        ELSE 'on_track'
    END as review_status,

    -- Has outcomes
    CASE WHEN dl.actual_outcomes != '{}'::jsonb THEN true ELSE false END as has_outcomes

FROM decision_log dl
LEFT JOIN roles r ON dl.owner_role_id = r.id
LEFT JOIN strategy_initiatives si ON dl.related_initiative_id = si.id
LEFT JOIN bsc_objectives bo ON dl.related_objective_id = bo.id
ORDER BY dl.decision_date DESC;

COMMENT ON VIEW decision_timeline_view IS 'Decision timeline for governance tracking and review scheduling';

-- ============================================================================
-- SCHEMA COMMENTS
-- ============================================================================

COMMENT ON SCHEMA public IS 'Insight 360 Phase 8: Strategy 120 with OKR-BSC Fusion Model';
