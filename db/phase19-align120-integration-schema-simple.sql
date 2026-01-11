-- ============================================================
-- INSIGHT 360 - Phase 19: Align 120 Integration Schema (SIMPLE)
-- Creates ONLY the new integration tables - no FK constraints
-- Run this first, then optionally run phase19-add-fks.sql
-- ============================================================

-- ============================================================
-- DROP CONFLICTING TABLES FROM PHASE 5 (S2E)
-- These tables have different schemas (user_id based vs company_profile_id)
-- ============================================================
DROP TABLE IF EXISTS bsc_perspectives CASCADE;
DROP TABLE IF EXISTS strategic_foundations CASCADE;

-- ============================================================
-- CREATE TABLES
-- ============================================================

-- DIGM LAYERS
CREATE TABLE IF NOT EXISTS digm_layers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID NOT NULL,
    user_id UUID,
    layer_type VARCHAR(50) NOT NULL,
    layer_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_profile_id, layer_type)
);

-- STRATEGIC FOUNDATIONS
CREATE TABLE IF NOT EXISTS strategic_foundations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID NOT NULL,
    user_id UUID,
    vision TEXT,
    vision_horizon VARCHAR(50) DEFAULT '5 years',
    vision_pillars JSONB DEFAULT '[]',
    mission TEXT,
    core_values JSONB DEFAULT '[]',
    company_directions JSONB DEFAULT '[]',
    source VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STRATEGIC INITIATIVES
CREATE TABLE IF NOT EXISTS strategic_initiatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID NOT NULL,
    user_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'ai_transformation',
    priority INTEGER DEFAULT 99,
    status VARCHAR(50) DEFAULT 'proposed',
    impact_score INTEGER DEFAULT 50,
    feasibility_score INTEGER DEFAULT 50,
    risk_score INTEGER DEFAULT 50,
    source VARCHAR(50) DEFAULT 'manual',
    source_id UUID,
    start_date DATE,
    target_date DATE,
    owner VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BSC PERSPECTIVES
CREATE TABLE IF NOT EXISTS bsc_perspectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID NOT NULL,
    user_id UUID,
    perspective VARCHAR(50) NOT NULL,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_profile_id, perspective)
);

-- COMPETITIVE INTELLIGENCE
CREATE TABLE IF NOT EXISTS competitive_intelligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID NOT NULL,
    user_id UUID,
    positioning JSONB DEFAULT '{}',
    competitors JSONB DEFAULT '[]',
    differentiation TEXT,
    why_we_win JSONB DEFAULT '[]',
    market_trends JSONB DEFAULT '[]',
    source VARCHAR(50) DEFAULT 'manual',
    analyzed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PARTHENON OKRs
CREATE TABLE IF NOT EXISTS parthenon_okrs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID NOT NULL,
    user_id UUID,
    parent_okr_id UUID,
    level VARCHAR(50) NOT NULL DEFAULT 'company',
    objective TEXT NOT NULL,
    key_results JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'draft',
    priority INTEGER DEFAULT 1,
    time_period VARCHAR(50),
    owner VARCHAR(255),
    source VARCHAR(50) DEFAULT 'manual',
    source_id UUID,
    progress_percent INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PARTHENON ROLES
CREATE TABLE IF NOT EXISTS parthenon_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID NOT NULL,
    user_id UUID,
    role_name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    skill_scores JSONB DEFAULT '{}',
    target_skill_scores JSONB DEFAULT '{}',
    headcount INTEGER DEFAULT 1,
    source VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_profile_id, role_name)
);

-- PARTHENON STAKEHOLDERS
CREATE TABLE IF NOT EXISTS parthenon_stakeholders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID NOT NULL,
    user_id UUID,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    department VARCHAR(255),
    influence VARCHAR(20) DEFAULT 'medium',
    interest VARCHAR(20) DEFAULT 'medium',
    stance VARCHAR(50) DEFAULT 'neutral',
    engagement_strategy TEXT,
    notes TEXT,
    source VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_profile_id, name)
);

-- GOVERNANCE RACI
CREATE TABLE IF NOT EXISTS governance_raci (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID NOT NULL,
    user_id UUID,
    raci_matrix JSONB DEFAULT '{}',
    source VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ALIGN INTEGRITY ALERTS (prefixed with 'align_' to avoid conflict with phase13 system integrity tables)
CREATE TABLE IF NOT EXISTS align_integrity_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID NOT NULL,
    user_id UUID,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(100),
    source_id UUID,
    status VARCHAR(50) DEFAULT 'active',
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ALIGN INTEGRITY INCIDENTS (prefixed with 'align_' to avoid conflict with phase13 system integrity tables)
CREATE TABLE IF NOT EXISTS align_integrity_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID NOT NULL,
    user_id UUID,
    incident_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    category VARCHAR(100),
    description TEXT NOT NULL,
    mitigation TEXT,
    source VARCHAR(100),
    source_id UUID,
    status VARCHAR(50) DEFAULT 'identified',
    owner VARCHAR(255),
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ALIGN INTEGRITY METRICS (prefixed with 'align_' to avoid conflict with phase13 system integrity tables)
CREATE TABLE IF NOT EXISTS align_integrity_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID NOT NULL,
    user_id UUID,
    metric_name VARCHAR(255) NOT NULL,
    current_value DECIMAL(10,2) DEFAULT 0,
    target_value DECIMAL(10,2) DEFAULT 0,
    unit VARCHAR(50) DEFAULT '%',
    category VARCHAR(100) DEFAULT 'general',
    source VARCHAR(100),
    source_id UUID,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_profile_id, metric_name)
);

-- ALIGNMENT BRIEFS
CREATE TABLE IF NOT EXISTS alignment_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    company_profile_id UUID,
    brief_data JSONB NOT NULL DEFAULT '{}',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_digm_layers_company ON digm_layers(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_digm_layers_type ON digm_layers(layer_type);
CREATE INDEX IF NOT EXISTS idx_strategic_foundations_company ON strategic_foundations(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_company ON strategic_initiatives(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_status ON strategic_initiatives(status);
CREATE INDEX IF NOT EXISTS idx_bsc_perspectives_company ON bsc_perspectives(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_okrs_company ON parthenon_okrs(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_okrs_status ON parthenon_okrs(status);
CREATE INDEX IF NOT EXISTS idx_roles_company ON parthenon_roles(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_company ON parthenon_stakeholders(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_align_alerts_company ON align_integrity_alerts(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_align_alerts_status ON align_integrity_alerts(status);
CREATE INDEX IF NOT EXISTS idx_align_incidents_company ON align_integrity_incidents(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_align_metrics_company ON align_integrity_metrics(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_briefs_session ON alignment_briefs(session_id);
CREATE INDEX IF NOT EXISTS idx_briefs_company ON alignment_briefs(company_profile_id);

-- GIN indexes for JSONB
CREATE INDEX IF NOT EXISTS idx_digm_layers_data ON digm_layers USING GIN (layer_data);
CREATE INDEX IF NOT EXISTS idx_briefs_data ON alignment_briefs USING GIN (brief_data);

-- ============================================================
-- DONE - 13 tables created
-- ============================================================
SELECT 'Phase 19 Integration Schema created successfully - 13 tables' as status;
