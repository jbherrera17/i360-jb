-- ============================================================
-- INSIGHT 360 - Phase 19: Align 120 Integration Schema
-- Tables for downstream system integration (DIGM, Strategy, Parthenon, Integrity)
-- Requires: phase7-company-profile-schema.sql (company_profiles, align120_sessions)
-- ============================================================

-- ============================================================
-- DIGM LAYERS (Dynamic Integrity Governance Model)
-- Stores identity, voice, cognitive, and adaptation layers
-- ============================================================

CREATE TABLE IF NOT EXISTS digm_layers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID NOT NULL,
    user_id UUID,
    layer_type VARCHAR(50) NOT NULL, -- identity, voice, cognitive, adaptation
    layer_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_profile_id, layer_type)
);

CREATE INDEX IF NOT EXISTS idx_digm_layers_company ON digm_layers(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_digm_layers_type ON digm_layers(layer_type);

-- ============================================================
-- STRATEGIC FOUNDATIONS
-- Vision, Mission, Values from Strategy 120
-- ============================================================

CREATE TABLE IF NOT EXISTS strategic_foundations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID UNIQUE NOT NULL,
    user_id UUID,
    vision TEXT,
    vision_horizon VARCHAR(50) DEFAULT '5 years',
    vision_pillars JSONB DEFAULT '[]',
    mission TEXT,
    core_values JSONB DEFAULT '[]',
    company_directions JSONB DEFAULT '[]',
    source VARCHAR(50) DEFAULT 'manual', -- align120_module2, manual, import
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategic_foundations_company ON strategic_foundations(company_profile_id);

-- ============================================================
-- STRATEGIC INITIATIVES
-- AI/Transformation initiatives from opportunity ranking
-- ============================================================

CREATE TABLE IF NOT EXISTS strategic_initiatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID NOT NULL,
    user_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'ai_transformation',
    priority INTEGER DEFAULT 99,
    status VARCHAR(50) DEFAULT 'proposed', -- proposed, approved, in_progress, completed, cancelled
    impact_score INTEGER DEFAULT 50,
    feasibility_score INTEGER DEFAULT 50,
    risk_score INTEGER DEFAULT 50,
    source VARCHAR(50) DEFAULT 'manual',
    source_id UUID, -- Reference to align120 session
    start_date DATE,
    target_date DATE,
    owner VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_initiatives_company ON strategic_initiatives(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_status ON strategic_initiatives(status);
CREATE INDEX IF NOT EXISTS idx_initiatives_source ON strategic_initiatives(source_id);

-- ============================================================
-- BSC PERSPECTIVES
-- Balanced Scorecard perspectives for Strategy 120
-- ============================================================

CREATE TABLE IF NOT EXISTS bsc_perspectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID NOT NULL,
    user_id UUID,
    perspective VARCHAR(50) NOT NULL, -- financial, customer, internal, learning
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_profile_id, perspective)
);

CREATE INDEX IF NOT EXISTS idx_bsc_perspectives_company ON bsc_perspectives(company_profile_id);

-- ============================================================
-- COMPETITIVE INTELLIGENCE
-- Market and competitor positioning data
-- ============================================================

CREATE TABLE IF NOT EXISTS competitive_intelligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID UNIQUE NOT NULL,
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

-- ============================================================
-- PARTHENON OKRs
-- Objectives and Key Results
-- ============================================================

CREATE TABLE IF NOT EXISTS parthenon_okrs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID NOT NULL,
    user_id UUID,
    parent_okr_id UUID REFERENCES parthenon_okrs(id) ON DELETE SET NULL,
    level VARCHAR(50) NOT NULL DEFAULT 'company', -- company, department, team, individual
    objective TEXT NOT NULL,
    key_results JSONB DEFAULT '[]', -- Array of {result, target, current, unit}
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, completed, cancelled
    priority INTEGER DEFAULT 1,
    time_period VARCHAR(50), -- Q1-2026, H1-2026, 2026
    owner VARCHAR(255),
    source VARCHAR(50) DEFAULT 'manual',
    source_id UUID,
    progress_percent INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_okrs_company ON parthenon_okrs(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_okrs_level ON parthenon_okrs(level);
CREATE INDEX IF NOT EXISTS idx_okrs_status ON parthenon_okrs(status);
CREATE INDEX IF NOT EXISTS idx_okrs_parent ON parthenon_okrs(parent_okr_id);

-- ============================================================
-- PARTHENON ROLES
-- Role definitions with skill assessments
-- ============================================================

CREATE TABLE IF NOT EXISTS parthenon_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID NOT NULL,
    user_id UUID,
    role_name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    skill_scores JSONB DEFAULT '{}', -- {prompt_engineering: 3, ai_evaluation: 2, ...}
    target_skill_scores JSONB DEFAULT '{}',
    headcount INTEGER DEFAULT 1,
    source VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_profile_id, role_name)
);

CREATE INDEX IF NOT EXISTS idx_roles_company ON parthenon_roles(company_profile_id);

-- ============================================================
-- PARTHENON STAKEHOLDERS
-- Stakeholder map for change management
-- ============================================================

CREATE TABLE IF NOT EXISTS parthenon_stakeholders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID NOT NULL,
    user_id UUID,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    department VARCHAR(255),
    influence VARCHAR(20) DEFAULT 'medium', -- high, medium, low
    interest VARCHAR(20) DEFAULT 'medium', -- high, medium, low
    stance VARCHAR(50) DEFAULT 'neutral', -- champion, supporter, neutral, skeptic, blocker
    engagement_strategy TEXT,
    notes TEXT,
    source VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_profile_id, name)
);

CREATE INDEX IF NOT EXISTS idx_stakeholders_company ON parthenon_stakeholders(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_stance ON parthenon_stakeholders(stance);

-- ============================================================
-- GOVERNANCE RACI
-- RACI matrix for AI governance
-- ============================================================

CREATE TABLE IF NOT EXISTS governance_raci (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID UNIQUE NOT NULL,
    user_id UUID,
    raci_matrix JSONB DEFAULT '{}', -- {activity: {role: 'R|A|C|I'}}
    source VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INTEGRITY ALERTS
-- Risk alerts and warnings from assessments
-- ============================================================

CREATE TABLE IF NOT EXISTS integrity_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID NOT NULL,
    user_id UUID,
    alert_type VARCHAR(100) NOT NULL, -- ai_risk, compliance, security, operational
    severity VARCHAR(20) DEFAULT 'medium', -- critical, high, medium, low
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(100),
    source_id UUID,
    status VARCHAR(50) DEFAULT 'active', -- active, acknowledged, resolved, dismissed
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_company ON integrity_alerts(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON integrity_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON integrity_alerts(status);

-- ============================================================
-- INTEGRITY INCIDENTS
-- Issues and incidents from adoption blockers
-- ============================================================

CREATE TABLE IF NOT EXISTS integrity_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_profile_id UUID NOT NULL,
    user_id UUID,
    incident_type VARCHAR(100) NOT NULL, -- adoption_blocker, risk_event, compliance_issue
    severity VARCHAR(20) DEFAULT 'medium',
    category VARCHAR(100),
    description TEXT NOT NULL,
    mitigation TEXT,
    source VARCHAR(100),
    source_id UUID,
    status VARCHAR(50) DEFAULT 'identified', -- identified, in_progress, resolved, accepted
    owner VARCHAR(255),
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_company ON integrity_incidents(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON integrity_incidents(status);

-- ============================================================
-- INTEGRITY METRICS
-- KPIs and success metrics for tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS integrity_metrics (
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

CREATE INDEX IF NOT EXISTS idx_metrics_company ON integrity_metrics(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_metrics_category ON integrity_metrics(category);

-- ============================================================
-- ALIGNMENT BRIEFS
-- Consolidated executive summaries from Align 120
-- ============================================================

CREATE TABLE IF NOT EXISTS alignment_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID UNIQUE NOT NULL,
    company_profile_id UUID,
    brief_data JSONB NOT NULL DEFAULT '{}',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_briefs_session ON alignment_briefs(session_id);
CREATE INDEX IF NOT EXISTS idx_briefs_company ON alignment_briefs(company_profile_id);

-- ============================================================
-- ADD INDEXES FOR BETTER PERFORMANCE
-- ============================================================

-- GIN index for JSONB searching
CREATE INDEX IF NOT EXISTS idx_digm_layers_data ON digm_layers USING GIN (layer_data);
CREATE INDEX IF NOT EXISTS idx_briefs_data ON alignment_briefs USING GIN (brief_data);

-- ============================================================
-- ADD FOREIGN KEYS (only if parent tables exist)
-- ============================================================

DO $$
BEGIN
    -- Add FK to company_profiles if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_profiles') THEN
        -- Check and add FKs only if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'digm_layers_company_profile_id_fkey') THEN
            ALTER TABLE digm_layers ADD CONSTRAINT digm_layers_company_profile_id_fkey
                FOREIGN KEY (company_profile_id) REFERENCES company_profiles(id) ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'strategic_foundations_company_profile_id_fkey') THEN
            ALTER TABLE strategic_foundations ADD CONSTRAINT strategic_foundations_company_profile_id_fkey
                FOREIGN KEY (company_profile_id) REFERENCES company_profiles(id) ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'strategic_initiatives_company_profile_id_fkey') THEN
            ALTER TABLE strategic_initiatives ADD CONSTRAINT strategic_initiatives_company_profile_id_fkey
                FOREIGN KEY (company_profile_id) REFERENCES company_profiles(id) ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'bsc_perspectives_company_profile_id_fkey') THEN
            ALTER TABLE bsc_perspectives ADD CONSTRAINT bsc_perspectives_company_profile_id_fkey
                FOREIGN KEY (company_profile_id) REFERENCES company_profiles(id) ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'competitive_intelligence_company_profile_id_fkey') THEN
            ALTER TABLE competitive_intelligence ADD CONSTRAINT competitive_intelligence_company_profile_id_fkey
                FOREIGN KEY (company_profile_id) REFERENCES company_profiles(id) ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'parthenon_okrs_company_profile_id_fkey') THEN
            ALTER TABLE parthenon_okrs ADD CONSTRAINT parthenon_okrs_company_profile_id_fkey
                FOREIGN KEY (company_profile_id) REFERENCES company_profiles(id) ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'parthenon_roles_company_profile_id_fkey') THEN
            ALTER TABLE parthenon_roles ADD CONSTRAINT parthenon_roles_company_profile_id_fkey
                FOREIGN KEY (company_profile_id) REFERENCES company_profiles(id) ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'parthenon_stakeholders_company_profile_id_fkey') THEN
            ALTER TABLE parthenon_stakeholders ADD CONSTRAINT parthenon_stakeholders_company_profile_id_fkey
                FOREIGN KEY (company_profile_id) REFERENCES company_profiles(id) ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'governance_raci_company_profile_id_fkey') THEN
            ALTER TABLE governance_raci ADD CONSTRAINT governance_raci_company_profile_id_fkey
                FOREIGN KEY (company_profile_id) REFERENCES company_profiles(id) ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'integrity_alerts_company_profile_id_fkey') THEN
            ALTER TABLE integrity_alerts ADD CONSTRAINT integrity_alerts_company_profile_id_fkey
                FOREIGN KEY (company_profile_id) REFERENCES company_profiles(id) ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'integrity_incidents_company_profile_id_fkey') THEN
            ALTER TABLE integrity_incidents ADD CONSTRAINT integrity_incidents_company_profile_id_fkey
                FOREIGN KEY (company_profile_id) REFERENCES company_profiles(id) ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'integrity_metrics_company_profile_id_fkey') THEN
            ALTER TABLE integrity_metrics ADD CONSTRAINT integrity_metrics_company_profile_id_fkey
                FOREIGN KEY (company_profile_id) REFERENCES company_profiles(id) ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'alignment_briefs_company_profile_id_fkey') THEN
            ALTER TABLE alignment_briefs ADD CONSTRAINT alignment_briefs_company_profile_id_fkey
                FOREIGN KEY (company_profile_id) REFERENCES company_profiles(id) ON DELETE CASCADE;
        END IF;

        RAISE NOTICE 'Foreign keys to company_profiles added successfully';
    ELSE
        RAISE NOTICE 'company_profiles table not found - skipping FK constraints';
    END IF;

    -- Add FK to align120_sessions if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'align120_sessions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'alignment_briefs_session_id_fkey') THEN
            ALTER TABLE alignment_briefs ADD CONSTRAINT alignment_briefs_session_id_fkey
                FOREIGN KEY (session_id) REFERENCES align120_sessions(id) ON DELETE CASCADE;
        END IF;
        RAISE NOTICE 'Foreign key to align120_sessions added successfully';
    ELSE
        RAISE NOTICE 'align120_sessions table not found - skipping FK constraint';
    END IF;
END $$;

-- ============================================================
-- ADD session_id COLUMN TO MODULE TABLES (for integration service)
-- ============================================================

DO $$
BEGIN
    -- Add session_id to ai_maturity_assessments if not exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_maturity_assessments') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'ai_maturity_assessments' AND column_name = 'session_id') THEN
            ALTER TABLE ai_maturity_assessments ADD COLUMN session_id UUID;
            CREATE INDEX IF NOT EXISTS idx_ai_maturity_session ON ai_maturity_assessments(session_id);
            RAISE NOTICE 'Added session_id to ai_maturity_assessments';
        END IF;
    END IF;

    -- Add session_id to business_fundamentals if not exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_fundamentals') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'business_fundamentals' AND column_name = 'session_id') THEN
            ALTER TABLE business_fundamentals ADD COLUMN session_id UUID;
            CREATE INDEX IF NOT EXISTS idx_business_fundamentals_session ON business_fundamentals(session_id);
            RAISE NOTICE 'Added session_id to business_fundamentals';
        END IF;
        -- Add vision/mission if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'business_fundamentals' AND column_name = 'vision_statement') THEN
            ALTER TABLE business_fundamentals ADD COLUMN vision_statement TEXT;
            ALTER TABLE business_fundamentals ADD COLUMN mission_statement TEXT;
            RAISE NOTICE 'Added vision/mission to business_fundamentals';
        END IF;
    END IF;

    -- Add session_id to team_readiness_assessments if not exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_readiness_assessments') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'team_readiness_assessments' AND column_name = 'session_id') THEN
            ALTER TABLE team_readiness_assessments ADD COLUMN session_id UUID;
            CREATE INDEX IF NOT EXISTS idx_team_readiness_session ON team_readiness_assessments(session_id);
            RAISE NOTICE 'Added session_id to team_readiness_assessments';
        END IF;
    END IF;

    -- Add session_id to brand_alignment_assessments if not exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brand_alignment_assessments') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'brand_alignment_assessments' AND column_name = 'session_id') THEN
            ALTER TABLE brand_alignment_assessments ADD COLUMN session_id UUID;
            CREATE INDEX IF NOT EXISTS idx_brand_alignment_session ON brand_alignment_assessments(session_id);
            RAISE NOTICE 'Added session_id to brand_alignment_assessments';
        END IF;
        -- Add ICP fields if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'brand_alignment_assessments' AND column_name = 'ideal_customer_profile') THEN
            ALTER TABLE brand_alignment_assessments ADD COLUMN ideal_customer_profile JSONB DEFAULT '{}';
            ALTER TABLE brand_alignment_assessments ADD COLUMN products_services JSONB DEFAULT '[]';
            RAISE NOTICE 'Added ICP fields to brand_alignment_assessments';
        END IF;
    END IF;

    -- Add session_id to corporate_alignments if not exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'corporate_alignments') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'corporate_alignments' AND column_name = 'session_id') THEN
            ALTER TABLE corporate_alignments ADD COLUMN session_id UUID;
            CREATE INDEX IF NOT EXISTS idx_corporate_alignments_session ON corporate_alignments(session_id);
            RAISE NOTICE 'Added session_id to corporate_alignments';
        END IF;
        -- Add success_metrics if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'corporate_alignments' AND column_name = 'success_metrics') THEN
            ALTER TABLE corporate_alignments ADD COLUMN success_metrics JSONB DEFAULT '{}';
            RAISE NOTICE 'Added success_metrics to corporate_alignments';
        END IF;
    END IF;
END $$;

-- ============================================================
-- VERIFICATION
-- ============================================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'digm_layers', 'strategic_foundations', 'strategic_initiatives',
        'bsc_perspectives', 'competitive_intelligence', 'parthenon_okrs',
        'parthenon_roles', 'parthenon_stakeholders', 'governance_raci',
        'integrity_alerts', 'integrity_incidents', 'integrity_metrics',
        'alignment_briefs'
    );

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'ALIGN 120 INTEGRATION SCHEMA CREATED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables created: %/13', table_count;
    RAISE NOTICE '';
    RAISE NOTICE 'DIGM Integration:';
    RAISE NOTICE '  - digm_layers (identity, voice, cognitive, adaptation)';
    RAISE NOTICE '';
    RAISE NOTICE 'Strategy 120 Integration:';
    RAISE NOTICE '  - strategic_foundations (vision, mission, values)';
    RAISE NOTICE '  - strategic_initiatives (AI opportunities)';
    RAISE NOTICE '  - bsc_perspectives (balanced scorecard)';
    RAISE NOTICE '  - competitive_intelligence (market positioning)';
    RAISE NOTICE '';
    RAISE NOTICE 'Parthenon Integration:';
    RAISE NOTICE '  - parthenon_okrs (objectives & key results)';
    RAISE NOTICE '  - parthenon_roles (skill matrices)';
    RAISE NOTICE '  - parthenon_stakeholders (stakeholder map)';
    RAISE NOTICE '  - governance_raci (RACI matrix)';
    RAISE NOTICE '';
    RAISE NOTICE 'Integrity Dashboard Integration:';
    RAISE NOTICE '  - integrity_alerts (risk alerts)';
    RAISE NOTICE '  - integrity_incidents (adoption blockers)';
    RAISE NOTICE '  - integrity_metrics (success metrics)';
    RAISE NOTICE '';
    RAISE NOTICE 'Output:';
    RAISE NOTICE '  - alignment_briefs (executive summaries)';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
