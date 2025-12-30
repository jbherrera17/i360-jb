-- ============================================
-- Insight 360 - Phase 5: Strategy-to-Execution Engine (S2E)
-- Version: 1.0
-- Date: December 2024
-- Description: Balanced Scorecard → OKR translation layer
--              Part of Strategize 120 module
-- ============================================

-- ============================================
-- STRATEGIC FOUNDATIONS TABLE
-- Vision, Mission, and Strategic Themes
-- ============================================
CREATE TABLE IF NOT EXISTS strategic_foundations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Vision (3-5 year aspirational state)
    vision TEXT,
    vision_horizon TEXT DEFAULT '3-5 years',

    -- Mission (why we exist now)
    mission TEXT,

    -- Core Values (guiding principles)
    core_values JSONB DEFAULT '[]',
    -- Format: [{"name": "Integrity", "description": "..."}, ...]

    -- Strategic Planning Period
    planning_period TEXT, -- e.g., "2025-2027"
    period_start DATE,
    period_end DATE,

    -- Status
    status TEXT DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'archived')),

    -- Only one active foundation per user
    is_current BOOLEAN DEFAULT false,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_strategic_foundations_user ON strategic_foundations(user_id);
CREATE INDEX IF NOT EXISTS idx_strategic_foundations_status ON strategic_foundations(status);
CREATE INDEX IF NOT EXISTS idx_strategic_foundations_current ON strategic_foundations(is_current);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_strategic_foundations_updated_at ON strategic_foundations;
CREATE TRIGGER update_strategic_foundations_updated_at
    BEFORE UPDATE ON strategic_foundations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE strategic_foundations IS 'Vision, Mission, and strategic planning context for S2E';

-- ============================================
-- STRATEGIC THEMES TABLE
-- 2-4 Major strategic focus areas
-- ============================================
CREATE TABLE IF NOT EXISTS strategic_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    foundation_id UUID REFERENCES strategic_foundations(id) ON DELETE CASCADE,

    -- Theme definition
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'compass',
    color TEXT DEFAULT '#6366f1',

    -- Strategic rationale
    rationale TEXT, -- Why this theme matters now

    -- Ordering
    sort_order INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_strategic_themes_user ON strategic_themes(user_id);
CREATE INDEX IF NOT EXISTS idx_strategic_themes_foundation ON strategic_themes(foundation_id);
CREATE INDEX IF NOT EXISTS idx_strategic_themes_active ON strategic_themes(is_active);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_strategic_themes_updated_at ON strategic_themes;
CREATE TRIGGER update_strategic_themes_updated_at
    BEFORE UPDATE ON strategic_themes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE strategic_themes IS 'Major strategic focus areas (2-4 recommended)';

-- ============================================
-- BSC PERSPECTIVES TABLE
-- The four Balanced Scorecard lenses
-- ============================================
CREATE TABLE IF NOT EXISTS bsc_perspectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    foundation_id UUID REFERENCES strategic_foundations(id) ON DELETE CASCADE,

    -- Perspective definition
    name TEXT NOT NULL,
    perspective_type TEXT NOT NULL
        CHECK (perspective_type IN ('financial', 'customer', 'internal_process', 'learning_growth')),

    -- Guiding question for this perspective
    guiding_question TEXT,
    -- Default questions:
    -- Financial: "How must we perform financially to sustain the mission?"
    -- Customer: "Who must trust us, and why?"
    -- Internal Process: "What must we excel at operationally?"
    -- Learning & Growth: "What capabilities must we build next?"

    description TEXT,
    icon TEXT,
    color TEXT,

    -- Ordering
    sort_order INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bsc_perspectives_user ON bsc_perspectives(user_id);
CREATE INDEX IF NOT EXISTS idx_bsc_perspectives_foundation ON bsc_perspectives(foundation_id);
CREATE INDEX IF NOT EXISTS idx_bsc_perspectives_type ON bsc_perspectives(perspective_type);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_bsc_perspectives_updated_at ON bsc_perspectives;
CREATE TRIGGER update_bsc_perspectives_updated_at
    BEFORE UPDATE ON bsc_perspectives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE bsc_perspectives IS 'Balanced Scorecard perspectives (Financial, Customer, Process, Learning)';

-- ============================================
-- BSC OBJECTIVES TABLE
-- Strategic objectives within each perspective (2-3 per perspective)
-- ============================================
CREATE TABLE IF NOT EXISTS bsc_objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    perspective_id UUID REFERENCES bsc_perspectives(id) ON DELETE CASCADE,

    -- Objective definition (directional commitment, not a metric)
    name TEXT NOT NULL,
    description TEXT,

    -- Link to strategic theme (optional but recommended)
    theme_id UUID REFERENCES strategic_themes(id) ON DELETE SET NULL,

    -- Cause-effect relationships (Strategy Map)
    causes JSONB DEFAULT '[]', -- IDs of objectives this one enables
    effects JSONB DEFAULT '[]', -- IDs of objectives that depend on this

    -- Owner (optional link to role)
    owner_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,

    -- Status
    status TEXT DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'achieved', 'deferred')),

    -- Ordering within perspective
    sort_order INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bsc_objectives_user ON bsc_objectives(user_id);
CREATE INDEX IF NOT EXISTS idx_bsc_objectives_perspective ON bsc_objectives(perspective_id);
CREATE INDEX IF NOT EXISTS idx_bsc_objectives_theme ON bsc_objectives(theme_id);
CREATE INDEX IF NOT EXISTS idx_bsc_objectives_status ON bsc_objectives(status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_bsc_objectives_updated_at ON bsc_objectives;
CREATE TRIGGER update_bsc_objectives_updated_at
    BEFORE UPDATE ON bsc_objectives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE bsc_objectives IS 'Strategic objectives within BSC perspectives';

-- ============================================
-- OKR STRATEGIC LINKS TABLE
-- Connects existing OKRs to BSC objectives
-- This is the "bridge" that translates strategy to execution
-- ============================================
CREATE TABLE IF NOT EXISTS okr_strategic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- The OKR (from existing Parthenon table)
    okr_id UUID NOT NULL REFERENCES okrs(id) ON DELETE CASCADE,

    -- The BSC objective it supports
    bsc_objective_id UUID NOT NULL REFERENCES bsc_objectives(id) ON DELETE CASCADE,

    -- Link metadata
    link_type TEXT DEFAULT 'supports'
        CHECK (link_type IN ('supports', 'measures', 'enables', 'validates')),

    -- How this OKR contributes to the strategic objective
    contribution_description TEXT,

    -- Is this the primary strategic link for this OKR?
    is_primary BOOLEAN DEFAULT false,

    -- Alignment strength (for governance)
    alignment_score INTEGER DEFAULT 100
        CHECK (alignment_score >= 0 AND alignment_score <= 100),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate links
    UNIQUE(okr_id, bsc_objective_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_okr_strategic_links_user ON okr_strategic_links(user_id);
CREATE INDEX IF NOT EXISTS idx_okr_strategic_links_okr ON okr_strategic_links(okr_id);
CREATE INDEX IF NOT EXISTS idx_okr_strategic_links_objective ON okr_strategic_links(bsc_objective_id);
CREATE INDEX IF NOT EXISTS idx_okr_strategic_links_primary ON okr_strategic_links(is_primary);

COMMENT ON TABLE okr_strategic_links IS 'Junction table linking OKRs to BSC strategic objectives';

-- ============================================
-- KEY RESULT INDICATORS TABLE
-- Classifies Key Results as leading or lagging
-- ============================================
CREATE TABLE IF NOT EXISTS key_result_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Reference to OKR (key results are stored in okrs.key_results JSONB)
    okr_id UUID NOT NULL REFERENCES okrs(id) ON DELETE CASCADE,

    -- Key result index within the JSONB array
    key_result_index INTEGER NOT NULL,

    -- Indicator classification
    indicator_type TEXT NOT NULL
        CHECK (indicator_type IN ('leading', 'lagging')),

    -- Rationale for classification
    rationale TEXT,

    -- Measurement frequency
    measurement_frequency TEXT DEFAULT 'monthly'
        CHECK (measurement_frequency IN ('daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly')),

    -- Data source (where does this metric come from?)
    data_source TEXT,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- One classification per key result
    UNIQUE(okr_id, key_result_index)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_key_result_indicators_user ON key_result_indicators(user_id);
CREATE INDEX IF NOT EXISTS idx_key_result_indicators_okr ON key_result_indicators(okr_id);
CREATE INDEX IF NOT EXISTS idx_key_result_indicators_type ON key_result_indicators(indicator_type);

COMMENT ON TABLE key_result_indicators IS 'Classifies Key Results as leading or lagging indicators';

-- ============================================
-- STRATEGY HEALTH CHECKS TABLE
-- Periodic governance assessments
-- ============================================
CREATE TABLE IF NOT EXISTS strategy_health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    foundation_id UUID REFERENCES strategic_foundations(id) ON DELETE CASCADE,

    -- Check metadata
    check_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_type TEXT NOT NULL
        CHECK (check_type IN ('monthly', 'quarterly', 'annual')),

    -- Health scores (0-100)
    alignment_score INTEGER CHECK (alignment_score >= 0 AND alignment_score <= 100),
    execution_score INTEGER CHECK (execution_score >= 0 AND execution_score <= 100),
    learning_score INTEGER CHECK (learning_score >= 0 AND learning_score <= 100),

    -- Observations
    observations JSONB DEFAULT '[]',
    -- Format: [{"type": "drift|overload|conflict|gap", "description": "...", "severity": "low|medium|high"}]

    -- Recommendations
    recommendations JSONB DEFAULT '[]',
    -- Format: [{"action": "...", "priority": "low|medium|high", "owner": "..."}]

    -- Review notes
    notes TEXT,

    -- Status
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'skipped')),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_strategy_health_checks_user ON strategy_health_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_health_checks_foundation ON strategy_health_checks(foundation_id);
CREATE INDEX IF NOT EXISTS idx_strategy_health_checks_date ON strategy_health_checks(check_date);
CREATE INDEX IF NOT EXISTS idx_strategy_health_checks_type ON strategy_health_checks(check_type);

COMMENT ON TABLE strategy_health_checks IS 'Periodic strategy governance assessments';

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE strategic_foundations ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bsc_perspectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE bsc_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_strategic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_result_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_health_checks ENABLE ROW LEVEL SECURITY;

-- Strategic Foundations policies
CREATE POLICY "Users can view own strategic_foundations" ON strategic_foundations
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own strategic_foundations" ON strategic_foundations
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own strategic_foundations" ON strategic_foundations
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own strategic_foundations" ON strategic_foundations
    FOR DELETE USING (auth.uid() = user_id);

-- Strategic Themes policies
CREATE POLICY "Users can view own strategic_themes" ON strategic_themes
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own strategic_themes" ON strategic_themes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own strategic_themes" ON strategic_themes
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own strategic_themes" ON strategic_themes
    FOR DELETE USING (auth.uid() = user_id);

-- BSC Perspectives policies
CREATE POLICY "Users can view own bsc_perspectives" ON bsc_perspectives
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bsc_perspectives" ON bsc_perspectives
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bsc_perspectives" ON bsc_perspectives
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bsc_perspectives" ON bsc_perspectives
    FOR DELETE USING (auth.uid() = user_id);

-- BSC Objectives policies
CREATE POLICY "Users can view own bsc_objectives" ON bsc_objectives
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bsc_objectives" ON bsc_objectives
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bsc_objectives" ON bsc_objectives
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bsc_objectives" ON bsc_objectives
    FOR DELETE USING (auth.uid() = user_id);

-- OKR Strategic Links policies
CREATE POLICY "Users can view own okr_strategic_links" ON okr_strategic_links
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own okr_strategic_links" ON okr_strategic_links
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own okr_strategic_links" ON okr_strategic_links
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own okr_strategic_links" ON okr_strategic_links
    FOR DELETE USING (auth.uid() = user_id);

-- Key Result Indicators policies
CREATE POLICY "Users can view own key_result_indicators" ON key_result_indicators
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own key_result_indicators" ON key_result_indicators
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own key_result_indicators" ON key_result_indicators
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own key_result_indicators" ON key_result_indicators
    FOR DELETE USING (auth.uid() = user_id);

-- Strategy Health Checks policies
CREATE POLICY "Users can view own strategy_health_checks" ON strategy_health_checks
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own strategy_health_checks" ON strategy_health_checks
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own strategy_health_checks" ON strategy_health_checks
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own strategy_health_checks" ON strategy_health_checks
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- VIEWS
-- ============================================

-- Full Strategy Map View (BSC with objectives and linked OKRs)
CREATE OR REPLACE VIEW strategy_map_view AS
SELECT
    sf.id as foundation_id,
    sf.vision,
    sf.mission,
    sf.planning_period,

    -- Perspectives with objectives
    bp.id as perspective_id,
    bp.name as perspective_name,
    bp.perspective_type,
    bp.guiding_question,

    -- Objectives
    bo.id as objective_id,
    bo.name as objective_name,
    bo.description as objective_description,
    bo.status as objective_status,

    -- Theme link
    st.id as theme_id,
    st.name as theme_name,

    -- Linked OKRs count
    (SELECT COUNT(*) FROM okr_strategic_links osl WHERE osl.bsc_objective_id = bo.id) as linked_okr_count,

    -- Average OKR progress for this objective
    (SELECT COALESCE(AVG(o.progress), 0)
     FROM okr_strategic_links osl
     JOIN okrs o ON osl.okr_id = o.id
     WHERE osl.bsc_objective_id = bo.id) as avg_okr_progress

FROM strategic_foundations sf
LEFT JOIN bsc_perspectives bp ON bp.foundation_id = sf.id
LEFT JOIN bsc_objectives bo ON bo.perspective_id = bp.id
LEFT JOIN strategic_themes st ON bo.theme_id = st.id
WHERE sf.is_current = true;

COMMENT ON VIEW strategy_map_view IS 'Complete strategy map with BSC perspectives, objectives, and OKR linkage';

-- OKR Alignment View (shows which OKRs are/aren't linked to strategy)
CREATE OR REPLACE VIEW okr_alignment_view AS
SELECT
    o.id as okr_id,
    o.title as okr_title,
    o.scope,
    o.period,
    o.progress,
    o.status,
    d.name as department_name,

    -- Strategic linkage
    CASE WHEN osl.id IS NOT NULL THEN true ELSE false END as is_strategically_linked,
    bo.name as linked_objective,
    bp.perspective_type,
    osl.alignment_score,

    -- Indicator balance
    (SELECT COUNT(*) FROM key_result_indicators kri
     WHERE kri.okr_id = o.id AND kri.indicator_type = 'leading') as leading_count,
    (SELECT COUNT(*) FROM key_result_indicators kri
     WHERE kri.okr_id = o.id AND kri.indicator_type = 'lagging') as lagging_count

FROM okrs o
LEFT JOIN departments d ON o.department_id = d.id
LEFT JOIN okr_strategic_links osl ON o.id = osl.okr_id AND osl.is_primary = true
LEFT JOIN bsc_objectives bo ON osl.bsc_objective_id = bo.id
LEFT JOIN bsc_perspectives bp ON bo.perspective_id = bp.id;

COMMENT ON VIEW okr_alignment_view IS 'OKRs with their strategic alignment status';

-- Strategy Health Summary View
CREATE OR REPLACE VIEW strategy_health_summary AS
SELECT
    sf.id as foundation_id,
    sf.planning_period,

    -- Counts
    (SELECT COUNT(*) FROM strategic_themes st WHERE st.foundation_id = sf.id AND st.is_active = true) as theme_count,
    (SELECT COUNT(*) FROM bsc_perspectives bp WHERE bp.foundation_id = sf.id) as perspective_count,
    (SELECT COUNT(*) FROM bsc_objectives bo
     JOIN bsc_perspectives bp ON bo.perspective_id = bp.id
     WHERE bp.foundation_id = sf.id) as objective_count,

    -- OKR linkage stats
    (SELECT COUNT(DISTINCT osl.okr_id) FROM okr_strategic_links osl
     JOIN bsc_objectives bo ON osl.bsc_objective_id = bo.id
     JOIN bsc_perspectives bp ON bo.perspective_id = bp.id
     WHERE bp.foundation_id = sf.id) as linked_okr_count,
    (SELECT COUNT(*) FROM okrs WHERE user_id = sf.user_id) as total_okr_count,

    -- Latest health check
    (SELECT shc.alignment_score FROM strategy_health_checks shc
     WHERE shc.foundation_id = sf.id AND shc.status = 'completed'
     ORDER BY shc.check_date DESC LIMIT 1) as latest_alignment_score,
    (SELECT shc.check_date FROM strategy_health_checks shc
     WHERE shc.foundation_id = sf.id AND shc.status = 'completed'
     ORDER BY shc.check_date DESC LIMIT 1) as last_health_check

FROM strategic_foundations sf
WHERE sf.is_current = true;

COMMENT ON VIEW strategy_health_summary IS 'Summary of strategy health and coverage';
