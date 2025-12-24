-- ============================================
-- Insight 360 - Phase 4: Actions Framework Schema
-- Version: 1.0
-- Date: December 2024
-- Description: Composable web app actions
-- ============================================

-- ============================================
-- ACTIONS TABLE
-- User-facing web app experiences
-- ============================================
CREATE TABLE IF NOT EXISTS actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Basic info
    name TEXT NOT NULL,
    slug TEXT NOT NULL, -- URL-friendly identifier
    description TEXT,
    icon TEXT DEFAULT 'zap',
    color TEXT DEFAULT '#6366f1',

    -- Suite classification
    suite TEXT NOT NULL DEFAULT 'execute'
        CHECK (suite IN ('align', 'strategy', 'execute')),

    -- Context requirements
    context_assets JSONB DEFAULT '[]', -- Array of required asset type slugs
    parthenon_context JSONB DEFAULT '{}', -- Required role/dept context config

    -- AI Engine configuration
    ai_engine JSONB NOT NULL DEFAULT '{
        "type": "native",
        "native": {
            "agent_id": null,
            "model": "claude-sonnet-4",
            "temperature": 0.7
        }
    }',

    -- UX configuration
    ux_config JSONB DEFAULT '{}', -- UI component configuration

    -- Status
    status TEXT DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'archived')),
    is_public BOOLEAN DEFAULT false, -- Shared with all users
    is_featured BOOLEAN DEFAULT false, -- Show in featured actions

    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique slug per user (or globally if public)
    UNIQUE(user_id, slug)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_actions_user ON actions(user_id);
CREATE INDEX IF NOT EXISTS idx_actions_slug ON actions(slug);
CREATE INDEX IF NOT EXISTS idx_actions_suite ON actions(suite);
CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
CREATE INDEX IF NOT EXISTS idx_actions_public ON actions(is_public);
CREATE INDEX IF NOT EXISTS idx_actions_featured ON actions(is_featured);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_actions_updated_at ON actions;
CREATE TRIGGER update_actions_updated_at
    BEFORE UPDATE ON actions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE actions IS 'Composable web app experiences combining context, roles, and AI';

-- ============================================
-- ACTION_EXECUTIONS TABLE
-- History of action runs
-- ============================================
CREATE TABLE IF NOT EXISTS action_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID REFERENCES actions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Execution context
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,

    -- Input/Output
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',

    -- AI details
    ai_engine_used TEXT, -- 'native', 'pickaxe', 'mindstudio'
    model_used TEXT,
    tokens_used INTEGER DEFAULT 0,

    -- Context assets used
    assets_injected JSONB DEFAULT '[]', -- Array of asset IDs that were used

    -- Status
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    error_message TEXT,

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_action_executions_action ON action_executions(action_id);
CREATE INDEX IF NOT EXISTS idx_action_executions_user ON action_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_action_executions_status ON action_executions(status);
CREATE INDEX IF NOT EXISTS idx_action_executions_created ON action_executions(created_at DESC);

COMMENT ON TABLE action_executions IS 'History of action runs with input/output and performance data';

-- ============================================
-- ACTION_TEMPLATES TABLE
-- Pre-built action templates
-- ============================================
CREATE TABLE IF NOT EXISTS action_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic info
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'layout-template',

    -- Suite classification
    suite TEXT NOT NULL DEFAULT 'execute'
        CHECK (suite IN ('align', 'strategy', 'execute')),

    -- Template configuration (same structure as actions)
    context_assets JSONB DEFAULT '[]',
    parthenon_context JSONB DEFAULT '{}',
    ai_engine JSONB NOT NULL,
    ux_config JSONB DEFAULT '{}',

    -- Metadata
    category TEXT, -- e.g., 'content', 'sales', 'research'
    tags TEXT[] DEFAULT '{}',

    -- Status
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_action_templates_slug ON action_templates(slug);
CREATE INDEX IF NOT EXISTS idx_action_templates_suite ON action_templates(suite);
CREATE INDEX IF NOT EXISTS idx_action_templates_category ON action_templates(category);
CREATE INDEX IF NOT EXISTS idx_action_templates_active ON action_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_action_templates_tags ON action_templates USING GIN(tags);

COMMENT ON TABLE action_templates IS 'Pre-built action templates that users can instantiate';

-- ============================================
-- EXTERNAL_AI_CONFIGS TABLE
-- Pickaxe, MindStudio, and other external AI integrations
-- ============================================
CREATE TABLE IF NOT EXISTS external_ai_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Basic info
    name TEXT NOT NULL,
    description TEXT,

    -- Provider configuration
    provider TEXT NOT NULL
        CHECK (provider IN ('pickaxe', 'mindstudio', 'custom')),

    -- Embed configuration
    embed_url TEXT NOT NULL,
    config JSONB DEFAULT '{}', -- Provider-specific config (API keys, workspace IDs, etc.)

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_external_ai_user ON external_ai_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_external_ai_provider ON external_ai_configs(provider);
CREATE INDEX IF NOT EXISTS idx_external_ai_active ON external_ai_configs(is_active);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_external_ai_updated_at ON external_ai_configs;
CREATE TRIGGER update_external_ai_updated_at
    BEFORE UPDATE ON external_ai_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE external_ai_configs IS 'External AI provider configurations (Pickaxe, MindStudio)';

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_ai_configs ENABLE ROW LEVEL SECURITY;

-- Actions policies
CREATE POLICY "Users can view own actions" ON actions
    FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert own actions" ON actions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own actions" ON actions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own actions" ON actions
    FOR DELETE USING (auth.uid() = user_id);

-- Action executions policies
CREATE POLICY "Users can view own executions" ON action_executions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own executions" ON action_executions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Action templates policies (read-only for users)
CREATE POLICY "Anyone can view active templates" ON action_templates
    FOR SELECT USING (is_active = true);

-- External AI configs policies
CREATE POLICY "Users can view own external ai configs" ON external_ai_configs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own external ai configs" ON external_ai_configs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own external ai configs" ON external_ai_configs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own external ai configs" ON external_ai_configs
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- SEED DATA: Action Templates
-- ============================================

INSERT INTO action_templates (name, slug, description, suite, category, context_assets, parthenon_context, ai_engine, ux_config, tags, sort_order)
VALUES
-- Thought Leadership (Execute)
(
    'Thought Leadership',
    'thought-leadership',
    'Create thought leadership content aligned with brand voice and audience needs',
    'execute',
    'content',
    '["voice_dna", "icp", "why_we_win", "buyer_persona", "custom_process"]'::jsonb,
    '{"departments": ["marketing", "executive"], "roles": ["content_strategist", "marketing_director", "ceo"], "requires_okrs": true}'::jsonb,
    '{"type": "native", "native": {"model": "claude-sonnet-4", "temperature": 0.7, "system_prompt": "You are an expert thought leadership content creator..."}}'::jsonb,
    '{"components": ["topic_ideation", "content_drafting", "brand_alignment_check", "publishing_workflow"]}'::jsonb,
    ARRAY['content', 'marketing', 'thought-leadership'],
    1
),

-- Sales Enablement (Execute)
(
    'Sales Enablement',
    'sales-enablement',
    'Generate sales materials, battlecards, and competitive positioning',
    'execute',
    'sales',
    '["why_we_win", "products_services", "icp", "competitive_analysis", "objection_handling"]'::jsonb,
    '{"departments": ["sales", "marketing"], "roles": ["sales_rep", "account_executive", "sales_manager"]}'::jsonb,
    '{"type": "native", "native": {"model": "claude-sonnet-4", "temperature": 0.5}}'::jsonb,
    '{"components": ["battlecard_generator", "objection_handler", "email_sequence_builder"]}'::jsonb,
    ARRAY['sales', 'battlecards', 'competitive'],
    2
),

-- Strategy Workshop (Strategy)
(
    'Strategy Workshop',
    'strategy-workshop',
    'Facilitated strategic planning with first principles thinking',
    'strategy',
    'planning',
    '["core_values", "company_description", "vision_mission", "competitive_analysis"]'::jsonb,
    '{"departments": ["executive"], "roles": ["ceo", "coo", "department_head"], "requires_okrs": true}'::jsonb,
    '{"type": "native", "native": {"model": "claude-opus-4", "temperature": 0.8}}'::jsonb,
    '{"components": ["swot_analysis", "okr_builder", "scenario_planning"]}'::jsonb,
    ARRAY['strategy', 'planning', 'okr'],
    3
),

-- Brand Alignment Check (Align)
(
    'Brand Alignment Check',
    'brand-alignment-check',
    'Analyze content for brand voice and values alignment',
    'align',
    'brand',
    '["voice_dna", "brand_guidelines", "core_values", "bright_lines"]'::jsonb,
    '{"departments": ["marketing", "executive"], "roles": ["brand_manager", "content_strategist"]}'::jsonb,
    '{"type": "native", "native": {"model": "claude-sonnet-4", "temperature": 0.3}}'::jsonb,
    '{"components": ["content_input", "alignment_score", "suggestions"]}'::jsonb,
    ARRAY['brand', 'alignment', 'quality'],
    4
),

-- Market Research (Strategy)
(
    'Market Research',
    'market-research',
    'Deep market and competitive intelligence gathering',
    'strategy',
    'research',
    '["icp", "competitive_analysis", "industry_baseline"]'::jsonb,
    '{"departments": ["marketing", "sales", "executive"], "roles": ["researcher", "analyst", "strategist"]}'::jsonb,
    '{"type": "native", "native": {"model": "claude-sonnet-4", "temperature": 0.5, "tools": ["web_search"]}}'::jsonb,
    '{"components": ["research_brief", "findings_report", "recommendations"]}'::jsonb,
    ARRAY['research', 'market', 'competitive'],
    5
),

-- Daily Briefing (Execute)
(
    'Daily Briefing',
    'daily-briefing',
    'Generate personalized daily intelligence briefing',
    'execute',
    'productivity',
    '["icp", "company_description", "topics"]'::jsonb,
    '{"departments": ["executive"], "roles": ["ceo", "department_head"]}'::jsonb,
    '{"type": "native", "native": {"model": "claude-sonnet-4", "temperature": 0.5, "tools": ["web_search"]}}'::jsonb,
    '{"components": ["topic_summary", "action_items", "calendar_integration"]}'::jsonb,
    ARRAY['briefing', 'daily', 'productivity'],
    6
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- VIEWS
-- ============================================

-- Action usage summary
CREATE OR REPLACE VIEW action_usage_summary AS
SELECT
    a.id,
    a.name,
    a.slug,
    a.suite,
    a.status,
    a.usage_count,
    a.last_used_at,
    COUNT(ae.id) as total_executions,
    COUNT(CASE WHEN ae.status = 'completed' THEN 1 END) as successful_executions,
    AVG(ae.duration_ms) as avg_duration_ms,
    SUM(ae.tokens_used) as total_tokens_used
FROM actions a
LEFT JOIN action_executions ae ON a.id = ae.action_id
GROUP BY a.id;

-- Action template popularity
CREATE OR REPLACE VIEW action_template_usage AS
SELECT
    at.id,
    at.name,
    at.slug,
    at.suite,
    at.category,
    COUNT(a.id) as instances_created
FROM action_templates at
LEFT JOIN actions a ON a.slug = at.slug
GROUP BY at.id
ORDER BY instances_created DESC;

COMMENT ON VIEW action_usage_summary IS 'Summary of action usage with execution statistics';
COMMENT ON VIEW action_template_usage IS 'Action template popularity by instances created';
