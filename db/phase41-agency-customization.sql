-- ============================================
-- Phase 41: Agency-Level Customization
-- Custom modules, branding, prompts, and reports per organization
-- ============================================
--
-- This schema enables agencies to:
-- - Customize module names, prompts, and agent configurations
-- - Apply white-label branding (logo, colors, report styling)
-- - Create reusable prompt templates
-- - Define custom report structures
--
-- ============================================

-- ============================================
-- 1. MODULE CONFIGURATION PER ORGANIZATION
-- ============================================

CREATE TABLE IF NOT EXISTS org_module_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Module identification
    module_type TEXT NOT NULL CHECK (module_type IN ('align120', 'strategy120', 'execute120')),
    module_number INTEGER,  -- For align120: 1-5, for others: null

    -- Custom naming
    custom_name TEXT,
    custom_description TEXT,
    custom_icon TEXT,  -- Lucide icon name

    -- Agent overrides
    custom_agents JSONB DEFAULT '[]'::jsonb,  -- Array of agent IDs to use instead of defaults
    agent_order JSONB DEFAULT '[]'::jsonb,    -- Custom ordering of agents

    -- Prompt overrides
    custom_prompts JSONB DEFAULT '{}'::jsonb,  -- Key-value pairs of prompt overrides
    -- Example: { "system_intro": "...", "module_summary": "..." }

    -- Module behavior
    is_enabled BOOLEAN DEFAULT TRUE,
    is_required BOOLEAN DEFAULT TRUE,
    display_order INTEGER,
    time_estimate_minutes INTEGER,

    -- Conditional logic
    skip_conditions JSONB DEFAULT '[]'::jsonb,  -- Conditions to auto-skip module

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(org_id, module_type, module_number)
);

CREATE INDEX IF NOT EXISTS idx_org_module_configs_org ON org_module_configs(org_id);
CREATE INDEX IF NOT EXISTS idx_org_module_configs_type ON org_module_configs(module_type);
CREATE INDEX IF NOT EXISTS idx_org_module_configs_enabled ON org_module_configs(org_id, is_enabled) WHERE is_enabled = TRUE;

COMMENT ON TABLE org_module_configs IS 'Per-organization customization of assessment modules';
COMMENT ON COLUMN org_module_configs.custom_agents IS 'JSON array of agent UUIDs to use for this module';
COMMENT ON COLUMN org_module_configs.custom_prompts IS 'JSON object with prompt template overrides';


-- ============================================
-- 2. ORGANIZATION BRANDING
-- ============================================

CREATE TABLE IF NOT EXISTS org_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Logo assets
    logo_url TEXT,
    logo_dark_url TEXT,  -- For dark mode
    favicon_url TEXT,
    logo_width INTEGER DEFAULT 150,
    logo_height INTEGER DEFAULT 40,

    -- Color scheme
    primary_color TEXT DEFAULT '#6366f1',
    secondary_color TEXT DEFAULT '#4f46e5',
    accent_color TEXT DEFAULT '#22c55e',
    text_color TEXT DEFAULT '#1f2937',
    background_color TEXT DEFAULT '#ffffff',
    sidebar_color TEXT DEFAULT '#f9fafb',

    -- Typography
    heading_font TEXT DEFAULT 'Inter',
    body_font TEXT DEFAULT 'Inter',
    font_size_base TEXT DEFAULT '16px',

    -- Report branding
    report_header_html TEXT,
    report_footer_html TEXT,
    report_cover_template TEXT,  -- HTML template for report cover page
    report_css TEXT,  -- Custom CSS to inject into reports

    -- Email branding
    email_from_name TEXT,
    email_from_address TEXT,
    email_signature_html TEXT,
    email_header_html TEXT,
    email_footer_html TEXT,

    -- Portal branding (for client self-service)
    portal_welcome_message TEXT,
    portal_custom_css TEXT,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),

    UNIQUE(org_id)
);

CREATE INDEX IF NOT EXISTS idx_org_branding_org ON org_branding(org_id);

COMMENT ON TABLE org_branding IS 'White-label branding configuration per organization';
COMMENT ON COLUMN org_branding.report_css IS 'Custom CSS injected into generated reports';
COMMENT ON COLUMN org_branding.portal_custom_css IS 'Custom CSS for client self-service portal';


-- ============================================
-- 3. PROMPT TEMPLATE LIBRARY
-- ============================================

CREATE TABLE IF NOT EXISTS org_prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Template identification
    name TEXT NOT NULL,
    template_key TEXT NOT NULL,  -- Unique key for lookup
    category TEXT NOT NULL CHECK (category IN (
        'system',      -- System prompts
        'assessment',  -- Assessment/evaluation prompts
        'analysis',    -- Analysis prompts
        'report',      -- Report generation prompts
        'summary',     -- Summary prompts
        'chat',        -- Chat/conversation prompts
        'email',       -- Email templates
        'custom'       -- User-defined category
    )),
    description TEXT,

    -- Content
    prompt_text TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,  -- List of variable placeholders
    -- Example: [{"name": "company_name", "type": "string", "required": true}]

    -- Sample values for testing
    sample_values JSONB DEFAULT '{}'::jsonb,

    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,

    -- Versioning
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    parent_id UUID REFERENCES org_prompt_templates(id),  -- Previous version

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(org_id, template_key, version)
);

CREATE INDEX IF NOT EXISTS idx_org_prompt_templates_org ON org_prompt_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_org_prompt_templates_key ON org_prompt_templates(org_id, template_key);
CREATE INDEX IF NOT EXISTS idx_org_prompt_templates_category ON org_prompt_templates(org_id, category);
CREATE INDEX IF NOT EXISTS idx_org_prompt_templates_active ON org_prompt_templates(org_id, is_active) WHERE is_active = TRUE;

COMMENT ON TABLE org_prompt_templates IS 'Reusable prompt template library per organization';
COMMENT ON COLUMN org_prompt_templates.template_key IS 'Unique key for programmatic lookup (e.g., align120_module1_system)';
COMMENT ON COLUMN org_prompt_templates.variables IS 'JSON array of variable definitions for template interpolation';


-- ============================================
-- 4. REPORT TEMPLATES
-- ============================================

CREATE TABLE IF NOT EXISTS org_report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Template identification
    name TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN (
        'alignment_brief',
        'governance_pack',
        'executive_summary',
        'portfolio_overview',
        'training_plan',
        'roadmap',
        'custom'
    )),
    description TEXT,

    -- Template structure
    sections JSONB NOT NULL,  -- Ordered list of sections
    -- Example: [
    --   {"id": "cover", "type": "cover_page", "title": "AI Readiness Report"},
    --   {"id": "exec_summary", "type": "executive_summary", "title": "Executive Summary"},
    --   {"id": "maturity", "type": "module_output", "module": 1, "title": "AI Maturity"},
    --   {"id": "custom", "type": "custom_html", "content": "<div>...</div>"}
    -- ]

    -- Styling
    styling JSONB DEFAULT '{}'::jsonb,  -- CSS overrides
    page_size TEXT DEFAULT 'A4' CHECK (page_size IN ('A4', 'Letter', 'Legal')),
    orientation TEXT DEFAULT 'portrait' CHECK (orientation IN ('portrait', 'landscape')),
    margins JSONB DEFAULT '{"top": "1in", "right": "1in", "bottom": "1in", "left": "1in"}'::jsonb,

    -- Header/Footer
    header_template TEXT,
    footer_template TEXT,
    include_page_numbers BOOLEAN DEFAULT TRUE,
    include_toc BOOLEAN DEFAULT TRUE,

    -- Output options
    formats_available TEXT[] DEFAULT ARRAY['json', 'html', 'pdf'],
    default_format TEXT DEFAULT 'pdf',

    -- Status
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_org_report_templates_org ON org_report_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_org_report_templates_type ON org_report_templates(org_id, report_type);
CREATE INDEX IF NOT EXISTS idx_org_report_templates_default ON org_report_templates(org_id, is_default) WHERE is_default = TRUE;

COMMENT ON TABLE org_report_templates IS 'Custom report template definitions per organization';
COMMENT ON COLUMN org_report_templates.sections IS 'JSON array defining report structure and section ordering';


-- ============================================
-- 5. DEFAULT MODULE CONFIGURATIONS
-- ============================================

-- Function to seed default module configs for a new organization
CREATE OR REPLACE FUNCTION seed_org_module_configs(p_org_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Align 120 Module 1: AI Assessment
    INSERT INTO org_module_configs (org_id, module_type, module_number, custom_name, custom_description, display_order, time_estimate_minutes)
    VALUES (p_org_id, 'align120', 1, 'AI Maturity Assessment', 'Evaluate current AI capabilities and identify opportunities', 1, 30)
    ON CONFLICT (org_id, module_type, module_number) DO NOTHING;
    v_count := v_count + 1;

    -- Align 120 Module 2: Values & Vision
    INSERT INTO org_module_configs (org_id, module_type, module_number, custom_name, custom_description, display_order, time_estimate_minutes)
    VALUES (p_org_id, 'align120', 2, 'Values & Strategic Foundation', 'Define core values, vision, and mission for AI transformation', 2, 25)
    ON CONFLICT (org_id, module_type, module_number) DO NOTHING;
    v_count := v_count + 1;

    -- Align 120 Module 3: Team Readiness
    INSERT INTO org_module_configs (org_id, module_type, module_number, custom_name, custom_description, display_order, time_estimate_minutes)
    VALUES (p_org_id, 'align120', 3, 'Team Readiness & Training', 'Assess skills gaps and develop training roadmap', 3, 25)
    ON CONFLICT (org_id, module_type, module_number) DO NOTHING;
    v_count := v_count + 1;

    -- Align 120 Module 4: Brand & Market
    INSERT INTO org_module_configs (org_id, module_type, module_number, custom_name, custom_description, display_order, time_estimate_minutes)
    VALUES (p_org_id, 'align120', 4, 'Brand & Market Analysis', 'Analyze brand voice, ICP, and competitive positioning', 4, 20)
    ON CONFLICT (org_id, module_type, module_number) DO NOTHING;
    v_count := v_count + 1;

    -- Align 120 Module 5: Change Management
    INSERT INTO org_module_configs (org_id, module_type, module_number, custom_name, custom_description, display_order, time_estimate_minutes)
    VALUES (p_org_id, 'align120', 5, 'Governance & Change Management', 'Establish governance, stakeholder alignment, and 90-day roadmap', 5, 25)
    ON CONFLICT (org_id, module_type, module_number) DO NOTHING;
    v_count := v_count + 1;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION seed_org_module_configs IS 'Seeds default module configurations for a new organization';


-- ============================================
-- 6. TRIGGER: AUTO-SEED CONFIGS FOR NEW ORGS
-- ============================================

CREATE OR REPLACE FUNCTION auto_seed_org_configs()
RETURNS TRIGGER AS $$
BEGIN
    -- Seed default module configurations
    PERFORM seed_org_module_configs(NEW.id);

    -- Create default branding entry
    INSERT INTO org_branding (org_id)
    VALUES (NEW.id)
    ON CONFLICT (org_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_seed_org_configs ON organizations;
CREATE TRIGGER trg_auto_seed_org_configs
    AFTER INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION auto_seed_org_configs();

COMMENT ON TRIGGER trg_auto_seed_org_configs ON organizations IS 'Auto-seeds module configs and branding for new organizations';


-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Get module config with fallback to defaults
CREATE OR REPLACE FUNCTION get_module_config(
    p_org_id UUID,
    p_module_type TEXT,
    p_module_number INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_config JSONB;
BEGIN
    SELECT to_jsonb(omc.*)
    INTO v_config
    FROM org_module_configs omc
    WHERE omc.org_id = p_org_id
    AND omc.module_type = p_module_type
    AND (p_module_number IS NULL OR omc.module_number = p_module_number)
    AND omc.is_enabled = TRUE;

    RETURN COALESCE(v_config, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get prompt template with interpolation
CREATE OR REPLACE FUNCTION get_prompt_template(
    p_org_id UUID,
    p_template_key TEXT,
    p_variables JSONB DEFAULT '{}'::jsonb
)
RETURNS TEXT AS $$
DECLARE
    v_template TEXT;
    v_key TEXT;
    v_value TEXT;
BEGIN
    -- Get the active template
    SELECT prompt_text INTO v_template
    FROM org_prompt_templates
    WHERE org_id = p_org_id
    AND template_key = p_template_key
    AND is_active = TRUE
    ORDER BY version DESC
    LIMIT 1;

    IF v_template IS NULL THEN
        RETURN NULL;
    END IF;

    -- Interpolate variables (simple {{variable}} replacement)
    FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_variables)
    LOOP
        v_template := replace(v_template, '{{' || v_key || '}}', v_value);
    END LOOP;

    -- Update usage count
    UPDATE org_prompt_templates
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE org_id = p_org_id
    AND template_key = p_template_key
    AND is_active = TRUE;

    RETURN v_template;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get org branding with defaults
CREATE OR REPLACE FUNCTION get_org_branding(p_org_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_branding JSONB;
BEGIN
    SELECT to_jsonb(ob.*)
    INTO v_branding
    FROM org_branding ob
    WHERE ob.org_id = p_org_id
    AND ob.is_active = TRUE;

    -- Return defaults if no branding found
    IF v_branding IS NULL THEN
        RETURN jsonb_build_object(
            'primary_color', '#6366f1',
            'secondary_color', '#4f46e5',
            'accent_color', '#22c55e',
            'text_color', '#1f2937',
            'background_color', '#ffffff',
            'heading_font', 'Inter',
            'body_font', 'Inter'
        );
    END IF;

    RETURN v_branding;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_module_config(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_module_config(UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_prompt_template(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_prompt_template(UUID, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION get_org_branding(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_branding(UUID) TO service_role;


-- ============================================
-- 8. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE org_module_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_report_templates ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to org_module_configs"
ON org_module_configs FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to org_branding"
ON org_branding FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to org_prompt_templates"
ON org_prompt_templates FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to org_report_templates"
ON org_report_templates FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Org members can view their org's configs
CREATE POLICY "Org members can view module configs"
ON org_module_configs FOR SELECT TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid() AND status = 'active'
    )
);

CREATE POLICY "Org members can view branding"
ON org_branding FOR SELECT TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid() AND status = 'active'
    )
);

CREATE POLICY "Org members can view prompt templates"
ON org_prompt_templates FOR SELECT TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid() AND status = 'active'
    )
);

CREATE POLICY "Org members can view report templates"
ON org_report_templates FOR SELECT TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid() AND status = 'active'
    )
);

-- Only admins can manage configs
CREATE POLICY "Org admins can manage module configs"
ON org_module_configs FOR ALL TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
)
WITH CHECK (
    org_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
);

CREATE POLICY "Org admins can manage branding"
ON org_branding FOR ALL TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
)
WITH CHECK (
    org_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
);

CREATE POLICY "Org admins can manage prompt templates"
ON org_prompt_templates FOR ALL TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
)
WITH CHECK (
    org_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
);

CREATE POLICY "Org admins can manage report templates"
ON org_report_templates FOR ALL TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
)
WITH CHECK (
    org_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
);


-- ============================================
-- 9. UPDATED_AT TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_org_module_configs_updated_at ON org_module_configs;
CREATE TRIGGER update_org_module_configs_updated_at
    BEFORE UPDATE ON org_module_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_branding_updated_at ON org_branding;
CREATE TRIGGER update_org_branding_updated_at
    BEFORE UPDATE ON org_branding
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_prompt_templates_updated_at ON org_prompt_templates;
CREATE TRIGGER update_org_prompt_templates_updated_at
    BEFORE UPDATE ON org_prompt_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_report_templates_updated_at ON org_report_templates;
CREATE TRIGGER update_org_report_templates_updated_at
    BEFORE UPDATE ON org_report_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 10. SEED EXISTING ORGANIZATIONS
-- ============================================

-- Seed configs for any existing organizations that don't have them
DO $$
DECLARE
    v_org RECORD;
BEGIN
    FOR v_org IN SELECT id FROM organizations WHERE is_active = TRUE
    LOOP
        PERFORM seed_org_module_configs(v_org.id);

        INSERT INTO org_branding (org_id)
        VALUES (v_org.id)
        ON CONFLICT (org_id) DO NOTHING;
    END LOOP;
END;
$$;
