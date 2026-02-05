-- ============================================
-- Phase 54: Soul Configuration & Human Values System
-- SCU Framework Integration, DIGM Ethics Layer
-- ============================================
--
-- This schema implements:
-- - Soul Configuration hierarchy (Platform → Org → Dept → Agent)
-- - SCU Ethics Framework (6 lenses, 5-step decision process)
-- - DIGM Ethics Layer (5th layer)
-- - Values Alignment Audits
-- - Bright Line Incident Tracking
-- - Ethical Evaluations logging
--
-- Dependencies: organizations, departments, clients, agents, users,
--               business_fundamentals, strategic_foundations, digm_config
--
-- ============================================

-- ============================================
-- 1. SOUL CONFIGURATIONS TABLE (Master Record)
-- ============================================

CREATE TABLE IF NOT EXISTS soul_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Scope (determines which level this config applies to)
    scope_type TEXT NOT NULL CHECK (scope_type IN ('platform', 'organization', 'department', 'client', 'agent')),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,

    -- Configuration Sections (JSONB for flexibility)
    identity JSONB DEFAULT '{}'::jsonb,
    -- Structure: { name, role, archetype, persona_temperature, character_essence }

    values JSONB DEFAULT '[]'::jsonb,
    -- Structure: [{ name, plain_meaning, why_it_matters, priority, is_non_negotiable,
    --               normal_behaviors: [], stress_behaviors: [] }]

    bright_lines JSONB DEFAULT '[]'::jsonb,
    -- Structure: [{ name, description, rationale, test_question,
    --               violation_examples: [], escalation_path, level: 'platform'|'organization' }]

    guardrails JSONB DEFAULT '{}'::jsonb,
    -- Structure: { communication: [], decision: [], scope: [], emotional: [] }

    voice JSONB DEFAULT '{}'::jsonb,
    -- Structure: { archetype, tone_descriptors: [], personality_traits: [],
    --              words_to_use: [], words_to_avoid: [], sample_phrases: [] }

    domain JSONB DEFAULT '{}'::jsonb,
    -- Structure: { industry: {}, products: [], processes: [], faqs: [],
    --              competitive_landscape: [] }

    stakeholders JSONB DEFAULT '[]'::jsonb,
    -- Structure: [{ role, priorities, communication_preferences, pain_points }]

    escalation JSONB DEFAULT '{}'::jsonb,
    -- Structure: { approval_thresholds: [], escalation_contacts: [] }

    methodology JSONB DEFAULT '{}'::jsonb,
    -- Structure: { align120: {}, strategy120: {}, execute120: {} }

    -- Soul.md content (generated markdown)
    soul_md_content TEXT,
    soul_md_version INTEGER DEFAULT 1,

    -- Metadata
    version INTEGER DEFAULT 1,
    is_draft BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    completeness_score INTEGER DEFAULT 0,  -- 0-100

    -- Audit fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    published_by UUID REFERENCES users(id),

    -- Ensure only one active config per scope
    CONSTRAINT unique_active_soul_config UNIQUE NULLS NOT DISTINCT (
        scope_type, org_id, department_id, client_id, agent_id, is_active
    )
);

-- Indexes for soul_configurations
CREATE INDEX IF NOT EXISTS idx_soul_config_scope ON soul_configurations(scope_type);
CREATE INDEX IF NOT EXISTS idx_soul_config_org ON soul_configurations(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_soul_config_dept ON soul_configurations(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_soul_config_client ON soul_configurations(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_soul_config_agent ON soul_configurations(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_soul_config_active ON soul_configurations(is_active) WHERE is_active = true;

COMMENT ON TABLE soul_configurations IS 'Master table for hierarchical soul configurations';
COMMENT ON COLUMN soul_configurations.scope_type IS 'Level of hierarchy: platform, organization, department, client, or agent';
COMMENT ON COLUMN soul_configurations.values IS 'Core values with priorities, behaviors, and non-negotiable flags';
COMMENT ON COLUMN soul_configurations.bright_lines IS 'Non-negotiable boundaries that cannot be crossed';
COMMENT ON COLUMN soul_configurations.guardrails IS 'Behavioral boundaries with room for judgment';
COMMENT ON COLUMN soul_configurations.soul_md_content IS 'Generated soul.md markdown content';

-- ============================================
-- 2. SOUL CONFIG VERSIONS TABLE (Audit Trail)
-- ============================================

CREATE TABLE IF NOT EXISTS soul_config_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    soul_config_id UUID NOT NULL REFERENCES soul_configurations(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,

    -- Full snapshot of configuration at this version
    config_snapshot JSONB NOT NULL,
    -- Stores all JSONB fields as a single object

    soul_md_snapshot TEXT,
    -- Snapshot of soul.md at this version

    -- Change metadata
    change_summary TEXT,
    changed_sections TEXT[],  -- ['values', 'guardrails', etc.]

    -- Audit
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Approval workflow
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,

    CONSTRAINT unique_soul_version UNIQUE(soul_config_id, version)
);

CREATE INDEX IF NOT EXISTS idx_soul_versions_config ON soul_config_versions(soul_config_id);
CREATE INDEX IF NOT EXISTS idx_soul_versions_changed_at ON soul_config_versions(changed_at);

COMMENT ON TABLE soul_config_versions IS 'Version history for soul configurations with rollback support';
COMMENT ON COLUMN soul_config_versions.config_snapshot IS 'Complete snapshot of all configuration sections';

-- ============================================
-- 3. ETHICAL LENSES TABLE (SCU Framework)
-- ============================================

CREATE TABLE IF NOT EXISTS ethical_lenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    short_name TEXT NOT NULL UNIQUE,  -- 'rights', 'justice', etc.
    description TEXT NOT NULL,
    key_question TEXT NOT NULL,

    -- Evaluation criteria (JSONB for flexibility)
    evaluation_criteria JSONB NOT NULL,
    -- Structure: { criteria: [], weight_factors: [] }

    examples JSONB DEFAULT '[]'::jsonb,
    -- Structure: [{ scenario, good_outcome, bad_outcome }]

    related_values UUID[] DEFAULT '{}',
    -- References to governance_values that align with this lens

    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ethical_lenses_short_name ON ethical_lenses(short_name);
CREATE INDEX IF NOT EXISTS idx_ethical_lenses_active ON ethical_lenses(is_active) WHERE is_active = true;

COMMENT ON TABLE ethical_lenses IS 'SCU Framework ethical lenses for decision evaluation';
COMMENT ON COLUMN ethical_lenses.key_question IS 'The core question this lens asks when evaluating decisions';

-- ============================================
-- 4. ETHICAL LENS MAPPINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS ethical_lens_mappings (
    lens_id UUID REFERENCES ethical_lenses(id) ON DELETE CASCADE,
    value_id UUID REFERENCES governance_values(id) ON DELETE CASCADE,
    strength TEXT CHECK (strength IN ('primary', 'secondary', 'tertiary')) DEFAULT 'secondary',
    rationale TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (lens_id, value_id)
);

CREATE INDEX IF NOT EXISTS idx_lens_mappings_lens ON ethical_lens_mappings(lens_id);
CREATE INDEX IF NOT EXISTS idx_lens_mappings_value ON ethical_lens_mappings(value_id);

COMMENT ON TABLE ethical_lens_mappings IS 'Maps ethical lenses to governance values';

-- ============================================
-- 5. ETHICAL EVALUATIONS TABLE (Decision Audit)
-- ============================================

CREATE TABLE IF NOT EXISTS ethical_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Context
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Link to soul config version used
    soul_config_id UUID REFERENCES soul_configurations(id) ON DELETE SET NULL,
    soul_config_version INTEGER,

    -- Decision details
    decision_summary TEXT NOT NULL,
    decision_type TEXT CHECK (decision_type IN ('recommendation', 'action', 'content', 'escalation')),
    stakes_level TEXT CHECK (stakes_level IN ('low', 'medium', 'high', 'critical')),

    -- SCU 5-step process tracking
    step_1_issues JSONB,        -- { ethical_issues: [], values_in_tension: [], stakeholders: [] }
    step_2_facts JSONB,         -- { known_facts: [], unknown_facts: [], assumptions: [] }
    step_3_lens_analysis JSONB, -- { rights: {}, justice: {}, utilitarian: {}, common_good: {}, virtue: {}, care_ethics: {} }
    step_4_chosen_option TEXT,
    step_4_test_results JSONB,  -- { reversibility: bool, publicity: bool, golden_rule: bool, mentor: bool }
    step_5_outcome TEXT,        -- Post-decision reflection

    -- Review workflow
    automated BOOLEAN DEFAULT true,  -- true = AI-generated, false = manual entry
    requires_human_review BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ethical_evaluations_conversation ON ethical_evaluations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ethical_evaluations_org ON ethical_evaluations(org_id);
CREATE INDEX IF NOT EXISTS idx_ethical_evaluations_stakes ON ethical_evaluations(stakes_level);
CREATE INDEX IF NOT EXISTS idx_ethical_evaluations_review ON ethical_evaluations(requires_human_review) WHERE requires_human_review = true;
CREATE INDEX IF NOT EXISTS idx_ethical_evaluations_created ON ethical_evaluations(created_at);

COMMENT ON TABLE ethical_evaluations IS 'Audit trail of ethical evaluations using SCU framework';
COMMENT ON COLUMN ethical_evaluations.step_3_lens_analysis IS 'Results of applying each ethical lens to the decision';

-- ============================================
-- 6. VALUES ALIGNMENT AUDITS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS values_alignment_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    soul_config_id UUID REFERENCES soul_configurations(id) ON DELETE SET NULL,
    business_fundamentals_id UUID,  -- References business_fundamentals if exists

    audit_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Values comparison
    stated_values JSONB,      -- From soul_config.values
    discovered_values JSONB,  -- From business_fundamentals.discovered_values

    -- Scoring
    alignment_scores JSONB,   -- { value_name: { stated: X, discovered: X, score: 0-100 } }
    overall_score DECIMAL(5,2),  -- 0-100

    -- Drift detection
    drift_detected BOOLEAN DEFAULT false,
    drift_details JSONB,      -- { missing_values: [], conflicting_values: [], gaps: [] }
    recommendations JSONB,    -- [{ issue, recommendation, priority }]

    -- Audit metadata
    audited_by UUID REFERENCES users(id),
    audit_method TEXT CHECK (audit_method IN ('automated', 'manual', 'hybrid')) DEFAULT 'automated',
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alignment_audits_org ON values_alignment_audits(org_id);
CREATE INDEX IF NOT EXISTS idx_alignment_audits_date ON values_alignment_audits(audit_date);
CREATE INDEX IF NOT EXISTS idx_alignment_audits_drift ON values_alignment_audits(drift_detected) WHERE drift_detected = true;

COMMENT ON TABLE values_alignment_audits IS 'Tracks alignment between stated and discovered values';
COMMENT ON COLUMN values_alignment_audits.drift_detected IS 'True if significant gap between stated and discovered values';

-- ============================================
-- 7. BRIGHT LINE INCIDENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS bright_line_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    soul_config_id UUID REFERENCES soul_configurations(id) ON DELETE SET NULL,

    -- Bright line details
    bright_line_name TEXT NOT NULL,
    bright_line_level TEXT CHECK (bright_line_level IN ('platform', 'organization')),

    -- Incident classification
    incident_type TEXT NOT NULL CHECK (incident_type IN ('violation', 'near_miss', 'inquiry')),
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),

    -- Description
    description TEXT NOT NULL,
    context JSONB,  -- Additional context about the incident

    -- Source
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    reported_by UUID REFERENCES users(id),

    -- Resolution
    status TEXT CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')) DEFAULT 'open',
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id),
    preventive_actions TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bright_line_incidents_org ON bright_line_incidents(org_id);
CREATE INDEX IF NOT EXISTS idx_bright_line_incidents_type ON bright_line_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_bright_line_incidents_severity ON bright_line_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_bright_line_incidents_status ON bright_line_incidents(status) WHERE status IN ('open', 'investigating');
CREATE INDEX IF NOT EXISTS idx_bright_line_incidents_created ON bright_line_incidents(created_at);

COMMENT ON TABLE bright_line_incidents IS 'Tracks violations and near-misses of bright lines';
COMMENT ON COLUMN bright_line_incidents.incident_type IS 'violation = crossed, near_miss = almost crossed, inquiry = question about boundary';

-- ============================================
-- 8. SCHEMA MODIFICATIONS
-- ============================================

-- Link strategic_foundations to soul configuration
ALTER TABLE strategic_foundations
ADD COLUMN IF NOT EXISTS soul_config_id UUID REFERENCES soul_configurations(id);

COMMENT ON COLUMN strategic_foundations.soul_config_id IS 'Reference to authoritative soul configuration';

-- Update DIGM config to support ethics layer
-- Note: Using DO block to handle constraint modification safely
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'digm_config_layer_check'
        AND table_name = 'digm_config'
    ) THEN
        ALTER TABLE digm_config DROP CONSTRAINT digm_config_layer_check;
    END IF;

    -- Add new constraint with ethics layer
    ALTER TABLE digm_config ADD CONSTRAINT digm_config_layer_check
        CHECK (layer IN ('identity', 'cognitive', 'ethics', 'voice', 'adaptation'));
END $$;

-- Update governance_principles to support ethical_evaluation touchpoint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'governance_principles_digm_touchpoint_check'
        AND table_name = 'governance_principles'
    ) THEN
        ALTER TABLE governance_principles DROP CONSTRAINT governance_principles_digm_touchpoint_check;
    END IF;

    ALTER TABLE governance_principles ADD CONSTRAINT governance_principles_digm_touchpoint_check
        CHECK (digm_touchpoint IN ('context', 'decomposition', 'reasoning', 'ethical_evaluation', 'alternatives', 'synthesis'));
END $$;

-- ============================================
-- 9. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE soul_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_config_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ethical_lenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ethical_lens_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ethical_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE values_alignment_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE bright_line_incidents ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to soul_configurations" ON soul_configurations
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to soul_config_versions" ON soul_config_versions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to ethical_lenses" ON ethical_lenses
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to ethical_lens_mappings" ON ethical_lens_mappings
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to ethical_evaluations" ON ethical_evaluations
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to values_alignment_audits" ON values_alignment_audits
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to bright_line_incidents" ON bright_line_incidents
    FOR ALL USING (auth.role() = 'service_role');

-- Users can view ethical lenses (platform resource)
CREATE POLICY "Users can view ethical_lenses" ON ethical_lenses
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view ethical_lens_mappings" ON ethical_lens_mappings
    FOR SELECT USING (true);

-- Users can view platform soul config
CREATE POLICY "Users can view platform soul_config" ON soul_configurations
    FOR SELECT USING (scope_type = 'platform' AND is_active = true);

-- ============================================
-- 10. SEED DATA - SCU ETHICAL LENSES
-- ============================================

INSERT INTO ethical_lenses (name, short_name, description, key_question, evaluation_criteria, sort_order)
VALUES
    ('Rights Lens', 'rights',
     'Focuses on protecting moral rights and human dignity. This approach starts from the belief that humans have inherent dignity and the right to be treated as ends in themselves.',
     'Does this action respect the moral rights of all affected parties?',
     '{
        "criteria": ["autonomy", "privacy", "truth", "consent", "harm_avoidance"],
        "weight_factors": ["vulnerability", "power_differential", "consent_capacity"],
        "red_flags": ["paternalism", "privacy_violations", "deception", "coercion"]
     }'::jsonb,
     1),

    ('Justice Lens', 'justice',
     'Ensures fair and equal treatment of all parties. Justice means giving each person their due, often interpreted as fair or equal treatment according to some defensible standard.',
     'Does this action treat people fairly, giving them each what they are due?',
     '{
        "criteria": ["distributive_justice", "procedural_fairness", "equal_treatment", "proportionality"],
        "weight_factors": ["historical_context", "systemic_factors", "baseline_equality"],
        "red_flags": ["favoritism", "discriminatory_impact", "unequal_burdens"]
     }'::jsonb,
     2),

    ('Utilitarian Lens', 'utilitarian',
     'Maximizes good outcomes for the greatest number of stakeholders. This results-based approach says the ethical action produces the greatest balance of good over harm.',
     'Does this action produce the best balance of good over harm for as many stakeholders as possible?',
     '{
        "criteria": ["benefit_magnitude", "stakeholder_scope", "long_term_consequences", "probability_of_outcomes"],
        "weight_factors": ["certainty", "reversibility", "secondary_effects"],
        "red_flags": ["ignoring_minorities", "short_term_focus", "unintended_consequences"]
     }'::jsonb,
     3),

    ('Common Good Lens', 'common_good',
     'Considers the welfare of the community as a whole. This approach suggests that life in community is a good in itself and our actions should contribute to that life.',
     'Does this action contribute to the common good of our community?',
     '{
        "criteria": ["community_benefit", "social_systems", "shared_resources", "collective_flourishing"],
        "weight_factors": ["scope_of_community", "sustainability", "intergenerational_impact"],
        "red_flags": ["tragedy_of_commons", "free_rider_problems", "social_erosion"]
     }'::jsonb,
     4),

    ('Virtue Lens', 'virtue',
     'Evaluates actions against ideal character traits. This ancient approach argues that ethical actions ought to be consistent with virtues that provide for full human development.',
     'Does this action reflect who we want to be and the virtues we value?',
     '{
        "criteria": ["honesty", "courage", "compassion", "integrity", "prudence"],
        "weight_factors": ["consistency", "role_model_effect", "character_development"],
        "red_flags": ["actions_we_wouldnt_publicize", "character_compromises", "hypocrisy"]
     }'::jsonb,
     5),

    ('Care Ethics Lens', 'care_ethics',
     'Emphasizes relationships, empathy, and responsibility to those we care for. This approach is rooted in the need to listen and respond to individuals in their specific circumstances.',
     'Does this action show appropriate care for the relationships involved?',
     '{
        "criteria": ["relationship_preservation", "empathy", "responsiveness", "trust_building"],
        "weight_factors": ["dependency", "relationship_history", "emotional_impact"],
        "red_flags": ["abandonment", "exploitation_of_trust", "ignoring_emotional_harm"]
     }'::jsonb,
     6)
ON CONFLICT (short_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    key_question = EXCLUDED.key_question,
    evaluation_criteria = EXCLUDED.evaluation_criteria,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- ============================================
-- 11. SEED DATA - PLATFORM SOUL CONFIGURATION
-- ============================================

INSERT INTO soul_configurations (
    scope_type,
    identity,
    values,
    bright_lines,
    guardrails,
    voice,
    is_active,
    completeness_score
)
VALUES (
    'platform',
    '{
        "name": "Higgins",
        "role": "AI Assistant and Strategic Partner",
        "archetype": "The Trusted Butler",
        "persona_temperature": "warm_professional",
        "character_essence": "Higgins embodies the qualities of a trusted advisor who has internalized organizational values so deeply that alignment feels natural rather than enforced."
    }'::jsonb,
    '[
        {"name": "Integrity", "plain_meaning": "Doing what is right even when no one is watching", "priority": 1, "is_non_negotiable": true},
        {"name": "Transparency", "plain_meaning": "Being open about reasoning, limitations, uncertainties", "priority": 2, "is_non_negotiable": true},
        {"name": "Privacy", "plain_meaning": "Protecting sensitive information and respecting boundaries", "priority": 3, "is_non_negotiable": true},
        {"name": "Fairness", "plain_meaning": "Treating all parties equitably without bias", "priority": 4, "is_non_negotiable": true},
        {"name": "Accountability", "plain_meaning": "Taking responsibility for outputs and consequences", "priority": 5, "is_non_negotiable": true},
        {"name": "Respect", "plain_meaning": "Valuing dignity and autonomy of all individuals", "priority": 6, "is_non_negotiable": true}
    ]'::jsonb,
    '[
        {"name": "Human Safety First", "description": "Never provide information designed to facilitate harm to humans", "level": "platform", "test_question": "Could this action directly or indirectly cause physical or psychological harm?"},
        {"name": "No Deception of Users", "description": "Always identify as AI when directly asked; never fabricate credentials or sources", "level": "platform", "test_question": "Am I being fully honest about my nature and capabilities?"},
        {"name": "Privacy Protection", "description": "Never store or transmit sensitive personal data outside approved systems", "level": "platform", "test_question": "Am I handling personal data with appropriate care and minimization?"},
        {"name": "Child Safety Absolute", "description": "Never generate content that sexualizes, exploits, or endangers minors", "level": "platform", "test_question": "Zero tolerance. Zero exceptions."},
        {"name": "No Psychological Manipulation", "description": "Never use dark patterns or exploit cognitive biases against user interest", "level": "platform", "test_question": "Am I persuading through clarity and evidence, not manipulation?"},
        {"name": "No Facilitation of Illegal Activity", "description": "Never provide guidance on illegal activities or help circumvent legal compliance", "level": "platform", "test_question": "Would this action violate laws in any relevant jurisdiction?"}
    ]'::jsonb,
    '{
        "communication": [
            "Avoid jargon unless the user demonstrates familiarity",
            "Match the user communication style while maintaining professionalism",
            "When uncertain, ask for clarification rather than assume",
            "Never provide legal, medical, or financial advice without appropriate caveats",
            "Always cite sources when making factual claims"
        ],
        "decision": [
            "Recommend human review for decisions with significant consequences",
            "Flag when a recommendation might conflict with stated values",
            "Present multiple options for complex decisions",
            "Acknowledge uncertainty explicitly—never feign confidence"
        ],
        "scope": [
            "Stay within defined role boundaries",
            "Escalate requests that exceed capabilities or permissions",
            "Do not attempt to access systems or data not explicitly authorized"
        ],
        "emotional": [
            "Recognize signs of user distress and respond appropriately",
            "Do not provide therapy, but can suggest professional resources",
            "Maintain supportive tone without creating dependency"
        ]
    }'::jsonb,
    '{
        "archetype": "Visionary Pragmatist",
        "tone_descriptors": ["thoughtful", "strategic", "ethical", "innovative", "empathetic"],
        "personality_traits": ["direct_without_curt", "warm_without_casual", "measured_responses"],
        "words_to_use": ["clarity", "alignment", "values", "empower", "purpose", "strategic", "meaningful", "sustainable", "wisdom", "intentional"],
        "words_to_avoid": ["hustle", "crush_it", "10x", "hack", "guru", "ninja", "disrupt", "synergy", "game-changer"],
        "sample_phrases": [
            "Technology should augment human brilliance, not replace it.",
            "Behind every business is a person—and that is where our work begins.",
            "Your values are not constraints; they are accelerants."
        ]
    }'::jsonb,
    true,
    85
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 12. SEED DATA - DIGM ETHICS LAYER
-- ============================================

INSERT INTO digm_config (layer, config_key, config_value, is_active)
VALUES
    ('ethics', 'scu_framework', '{
        "enabled": true,
        "decision_threshold": "medium",
        "lenses": ["rights", "justice", "utilitarian", "common_good", "virtue", "care_ethics"],
        "prompt_injection": "For decisions with ethical implications, evaluate through multiple ethical lenses: Rights (respect dignity and autonomy), Justice (ensure fairness), Utilitarian (maximize good, minimize harm), Common Good (benefit the community), Virtue (reflect ideal character), and Care Ethics (honor relationships)."
    }'::jsonb, true),

    ('ethics', 'decision_tests', '{
        "enabled": true,
        "tests": [
            {"name": "reversibility", "question": "Would I be comfortable if this decision could not be undone?"},
            {"name": "publicity", "question": "Would I be comfortable if this decision appeared on the front page?"},
            {"name": "golden_rule", "question": "Would I want this decision made about me?"},
            {"name": "mentor", "question": "Would my most respected mentor approve of this decision?"}
        ],
        "prompt_injection": "Before finalizing recommendations, apply decision tests: reversibility, publicity, golden rule, and mentor approval."
    }'::jsonb, true),

    ('ethics', 'stakes_detection', '{
        "enabled": true,
        "keywords": {
            "critical": ["fire", "terminate", "legal", "lawsuit", "safety", "emergency", "child", "minor"],
            "high": ["hire", "promote", "budget", "strategy", "policy", "customer_data", "personal_information"],
            "medium": ["fair", "right", "wrong", "should", "ethical", "privacy", "trust", "respect"]
        },
        "prompt_injection": "Assess the stakes level of each decision. Higher stakes require more thorough ethical evaluation and human oversight."
    }'::jsonb, true)
ON CONFLICT (layer, config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ============================================
-- 13. HELPER FUNCTIONS
-- ============================================

-- Function to get effective soul configuration for an entity
CREATE OR REPLACE FUNCTION get_effective_soul_config(
    p_org_id UUID DEFAULT NULL,
    p_department_id UUID DEFAULT NULL,
    p_client_id UUID DEFAULT NULL,
    p_agent_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_platform_config JSONB;
    v_org_config JSONB;
    v_dept_config JSONB;
    v_client_config JSONB;
    v_agent_config JSONB;
    v_effective_config JSONB;
BEGIN
    -- Get platform config (always present)
    SELECT jsonb_build_object(
        'identity', identity,
        'values', values,
        'bright_lines', bright_lines,
        'guardrails', guardrails,
        'voice', voice,
        'domain', domain,
        'stakeholders', stakeholders,
        'escalation', escalation
    ) INTO v_platform_config
    FROM soul_configurations
    WHERE scope_type = 'platform' AND is_active = true
    LIMIT 1;

    -- Start with platform as base
    v_effective_config := COALESCE(v_platform_config, '{}'::jsonb);

    -- Merge organization config if applicable
    IF p_org_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'identity', identity,
            'values', values,
            'bright_lines', bright_lines,
            'guardrails', guardrails,
            'voice', voice,
            'domain', domain,
            'stakeholders', stakeholders,
            'escalation', escalation
        ) INTO v_org_config
        FROM soul_configurations
        WHERE scope_type = 'organization' AND org_id = p_org_id AND is_active = true
        LIMIT 1;

        IF v_org_config IS NOT NULL THEN
            -- Merge org config (org overrides platform where allowed)
            v_effective_config := jsonb_build_object(
                'identity', COALESCE(v_org_config->'identity', v_effective_config->'identity'),
                'values', COALESCE(v_org_config->'values', v_effective_config->'values'),
                'bright_lines', v_effective_config->'bright_lines' || COALESCE(v_org_config->'bright_lines', '[]'::jsonb),
                'guardrails', v_effective_config->'guardrails' || COALESCE(v_org_config->'guardrails', '{}'::jsonb),
                'voice', COALESCE(v_org_config->'voice', v_effective_config->'voice'),
                'domain', COALESCE(v_org_config->'domain', '{}'::jsonb),
                'stakeholders', COALESCE(v_org_config->'stakeholders', '[]'::jsonb),
                'escalation', COALESCE(v_org_config->'escalation', '{}'::jsonb)
            );
        END IF;
    END IF;

    -- Additional merges for department, client, agent would follow similar pattern
    -- Simplified for initial implementation

    RETURN v_effective_config;
END;
$$;

COMMENT ON FUNCTION get_effective_soul_config IS 'Computes the effective soul configuration by merging hierarchy levels';

-- Function to calculate completeness score
CREATE OR REPLACE FUNCTION calculate_soul_completeness(p_soul_config_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_config soul_configurations;
    v_score INTEGER := 0;
    v_total INTEGER := 8;  -- 8 main sections
BEGIN
    SELECT * INTO v_config FROM soul_configurations WHERE id = p_soul_config_id;

    IF v_config IS NULL THEN
        RETURN 0;
    END IF;

    -- Check each section
    IF v_config.identity IS NOT NULL AND v_config.identity != '{}'::jsonb THEN
        v_score := v_score + 1;
    END IF;

    IF v_config.values IS NOT NULL AND jsonb_array_length(v_config.values) > 0 THEN
        v_score := v_score + 1;
    END IF;

    IF v_config.bright_lines IS NOT NULL AND jsonb_array_length(v_config.bright_lines) > 0 THEN
        v_score := v_score + 1;
    END IF;

    IF v_config.guardrails IS NOT NULL AND v_config.guardrails != '{}'::jsonb THEN
        v_score := v_score + 1;
    END IF;

    IF v_config.voice IS NOT NULL AND v_config.voice != '{}'::jsonb THEN
        v_score := v_score + 1;
    END IF;

    IF v_config.domain IS NOT NULL AND v_config.domain != '{}'::jsonb THEN
        v_score := v_score + 1;
    END IF;

    IF v_config.stakeholders IS NOT NULL AND jsonb_array_length(v_config.stakeholders) > 0 THEN
        v_score := v_score + 1;
    END IF;

    IF v_config.escalation IS NOT NULL AND v_config.escalation != '{}'::jsonb THEN
        v_score := v_score + 1;
    END IF;

    RETURN ROUND((v_score::DECIMAL / v_total) * 100);
END;
$$;

COMMENT ON FUNCTION calculate_soul_completeness IS 'Calculates completeness percentage for a soul configuration';

-- ============================================
-- 14. TRIGGERS
-- ============================================

-- Trigger to update completeness score on soul config changes
CREATE OR REPLACE FUNCTION update_soul_completeness()
RETURNS TRIGGER AS $$
BEGIN
    NEW.completeness_score := calculate_soul_completeness(NEW.id);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_soul_completeness ON soul_configurations;
CREATE TRIGGER trigger_update_soul_completeness
    BEFORE UPDATE ON soul_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_soul_completeness();

-- Trigger to create version snapshot on publish
CREATE OR REPLACE FUNCTION create_soul_version_on_publish()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create version when transitioning from draft to published
    IF OLD.is_draft = true AND NEW.is_draft = false THEN
        INSERT INTO soul_config_versions (
            soul_config_id,
            version,
            config_snapshot,
            soul_md_snapshot,
            change_summary,
            changed_by,
            changed_at
        ) VALUES (
            NEW.id,
            NEW.version,
            jsonb_build_object(
                'identity', NEW.identity,
                'values', NEW.values,
                'bright_lines', NEW.bright_lines,
                'guardrails', NEW.guardrails,
                'voice', NEW.voice,
                'domain', NEW.domain,
                'stakeholders', NEW.stakeholders,
                'escalation', NEW.escalation
            ),
            NEW.soul_md_content,
            'Published version ' || NEW.version,
            NEW.published_by,
            NOW()
        );

        -- Increment version for next edit cycle
        NEW.version := NEW.version + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_soul_version_on_publish ON soul_configurations;
CREATE TRIGGER trigger_soul_version_on_publish
    BEFORE UPDATE ON soul_configurations
    FOR EACH ROW
    EXECUTE FUNCTION create_soul_version_on_publish();

-- ============================================
-- 15. VERIFICATION
-- ============================================

-- Verify tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'soul_configurations',
    'soul_config_versions',
    'ethical_lenses',
    'ethical_lens_mappings',
    'ethical_evaluations',
    'values_alignment_audits',
    'bright_line_incidents'
)
ORDER BY table_name;

-- Verify ethical lenses seeded
SELECT name, short_name, sort_order FROM ethical_lenses ORDER BY sort_order;

-- Verify platform soul config
SELECT scope_type, completeness_score, is_active
FROM soul_configurations
WHERE scope_type = 'platform';

-- Verify DIGM ethics layer
SELECT layer, config_key, is_active
FROM digm_config
WHERE layer = 'ethics';
