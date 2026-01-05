-- ============================================
-- PHASE 13: GOVERNANCE SCHEMA
-- ============================================
-- This schema implements governance tracking:
-- - Access policies per company/department
-- - Feature flags and configuration
-- - Audit logging for sensitive actions
--
-- Run: Execute this SQL in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ACCESS POLICIES
-- ============================================
-- Company-wide and department-specific access policies

CREATE TABLE IF NOT EXISTS access_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Scope
    scope TEXT NOT NULL DEFAULT 'company', -- 'company', 'department'
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE, -- NULL for company-wide

    -- Policy details
    policy_key TEXT NOT NULL, -- e.g., 'cross_dept_visibility', 'strategy_access_level'
    policy_name TEXT NOT NULL,
    description TEXT,

    -- Configuration
    config JSONB NOT NULL DEFAULT '{}',
    -- Example configs:
    -- { "allow_cross_dept_view": true, "require_approval": false }
    -- { "min_role_level": 3, "allowed_roles": ["director", "executive"] }

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(scope, department_id, policy_key)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_access_policies_scope ON access_policies(scope, department_id);
CREATE INDEX IF NOT EXISTS idx_access_policies_key ON access_policies(policy_key);

-- ============================================
-- 2. FEATURE FLAGS
-- ============================================
-- Control feature availability per company/department

CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Scope
    scope TEXT NOT NULL DEFAULT 'global', -- 'global', 'company', 'department', 'user'
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Feature details
    feature_key TEXT NOT NULL, -- e.g., 'strategy_s2e', 'agent_library', 'execute_120'
    feature_name TEXT NOT NULL,
    description TEXT,

    -- Status
    is_enabled BOOLEAN DEFAULT true,

    -- Rollout (for gradual releases)
    rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(scope, department_id, user_id, feature_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_scope ON feature_flags(scope);

-- ============================================
-- 3. AUDIT LOG
-- ============================================
-- Track sensitive actions for compliance

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Actor
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email TEXT, -- Denormalized for historical records

    -- Action
    action_type TEXT NOT NULL, -- e.g., 'user.role_changed', 'policy.updated', 'access.granted'
    action_category TEXT, -- 'auth', 'access', 'data', 'config', 'strategy'

    -- Target
    target_type TEXT, -- 'user', 'department', 'objective', 'policy'
    target_id TEXT, -- UUID as text for flexibility
    target_name TEXT, -- Denormalized for readability

    -- Details
    details JSONB DEFAULT '{}',
    -- Example: { "old_role": "user", "new_role": "admin", "reason": "promotion" }

    -- Context
    ip_address INET,
    user_agent TEXT,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_category ON audit_log(action_category);

-- ============================================
-- 4. COMPLIANCE REQUIREMENTS
-- ============================================
-- Track compliance requirements and their status

CREATE TABLE IF NOT EXISTS compliance_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Requirement details
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general', -- 'security', 'privacy', 'data', 'access', 'general'

    -- Reference
    standard TEXT, -- 'SOC2', 'GDPR', 'HIPAA', 'internal'
    reference_id TEXT, -- External reference number

    -- Status
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'compliant', 'non_compliant'

    -- Evidence
    evidence_url TEXT,
    evidence_notes TEXT,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES users(id),

    -- Owner
    owner_id UUID REFERENCES users(id),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_compliance_status ON compliance_requirements(status);
CREATE INDEX IF NOT EXISTS idx_compliance_category ON compliance_requirements(category);

-- ============================================
-- 5. RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE access_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_requirements ENABLE ROW LEVEL SECURITY;

-- Access policies: Admins only
CREATE POLICY "Only admins can manage access policies"
ON access_policies FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

CREATE POLICY "Users can view active policies affecting them"
ON access_policies FOR SELECT
TO authenticated
USING (
    is_active = true
    AND (
        scope = 'company'
        OR (
            scope = 'department'
            AND EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND users.department_id = access_policies.department_id
            )
        )
    )
);

-- Feature flags: Viewable by all, editable by admins
CREATE POLICY "Users can view feature flags"
ON feature_flags FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can manage feature flags"
ON feature_flags FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Audit log: View own actions, admins see all
CREATE POLICY "Users can view their own audit entries"
ON audit_log FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Audit log: Insert only (no updates/deletes)
CREATE POLICY "System can insert audit log entries"
ON audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- Compliance: Viewable by managers+, editable by admins
CREATE POLICY "Managers can view compliance requirements"
ON compliance_requirements FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_effective_permissions
        WHERE user_effective_permissions.user_id = auth.uid()
        AND user_effective_permissions.business_role_level >= 3
    )
    OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

CREATE POLICY "Only admins can manage compliance requirements"
ON compliance_requirements FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- ============================================
-- 6. TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_access_policies_updated_at ON access_policies;
CREATE TRIGGER update_access_policies_updated_at
    BEFORE UPDATE ON access_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER update_feature_flags_updated_at
    BEFORE UPDATE ON feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_compliance_updated_at ON compliance_requirements;
CREATE TRIGGER update_compliance_updated_at
    BEFORE UPDATE ON compliance_requirements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. SEED DEFAULT POLICIES
-- ============================================

INSERT INTO access_policies (scope, policy_key, policy_name, description, config)
VALUES
    ('company', 'default_cross_dept_view', 'Cross-Department Visibility',
     'Whether users can view other departments by default',
     '{"allow_by_default": false, "require_business_role_level": 3}'),

    ('company', 'default_strategy_access', 'Strategy Access Level',
     'Default access level for company strategy',
     '{"view_min_level": 2, "edit_min_level": 4}'),

    ('company', 'audit_retention', 'Audit Log Retention',
     'How long to retain audit log entries',
     '{"retention_days": 365, "archive_enabled": true}'),

    ('company', 'password_policy', 'Password Policy',
     'Password requirements for users',
     '{"min_length": 12, "require_uppercase": true, "require_number": true, "require_special": true, "expire_days": 90}')
ON CONFLICT (scope, department_id, policy_key) DO NOTHING;

-- ============================================
-- 8. SEED DEFAULT FEATURE FLAGS
-- ============================================

INSERT INTO feature_flags (scope, feature_key, feature_name, description, is_enabled)
VALUES
    ('global', 'strategy_s2e', 'Strategy to Execution', 'Strategy-to-Execution module', true),
    ('global', 'execute_120', 'Execute 120', 'Department-focused execution hub', true),
    ('global', 'align_120', 'Align 120', 'Company alignment and assessment', true),
    ('global', 'agent_library', 'Agent Library', 'AI agent management', true),
    ('global', 'daily_briefing', 'Daily Briefing', 'Automated daily briefings', true),
    ('global', 'department_strategy', 'Department Strategy', 'Department-level strategy management', true),
    ('global', 'advanced_permissions', 'Advanced Permissions', 'User permission overrides and department-specific access', true)
ON CONFLICT (scope, department_id, user_id, feature_key) DO NOTHING;

-- ============================================
-- 9. HELPER FUNCTION: Log audit entry
-- ============================================

CREATE OR REPLACE FUNCTION log_audit_entry(
    p_user_id UUID,
    p_action_type TEXT,
    p_action_category TEXT,
    p_target_type TEXT,
    p_target_id TEXT,
    p_target_name TEXT,
    p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_user_email TEXT;
    v_audit_id UUID;
BEGIN
    -- Get user email
    SELECT email INTO v_user_email FROM users WHERE id = p_user_id;

    -- Insert audit entry
    INSERT INTO audit_log (
        user_id, user_email, action_type, action_category,
        target_type, target_id, target_name, details
    ) VALUES (
        p_user_id, v_user_email, p_action_type, p_action_category,
        p_target_type, p_target_id, p_target_name, p_details
    )
    RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. HELPER FUNCTION: Check feature flag
-- ============================================

CREATE OR REPLACE FUNCTION is_feature_enabled(
    p_feature_key TEXT,
    p_department_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_enabled BOOLEAN;
BEGIN
    -- Check user-specific flag first
    IF p_user_id IS NOT NULL THEN
        SELECT is_enabled INTO v_enabled
        FROM feature_flags
        WHERE feature_key = p_feature_key
        AND scope = 'user'
        AND user_id = p_user_id;

        IF FOUND THEN
            RETURN v_enabled;
        END IF;
    END IF;

    -- Check department-specific flag
    IF p_department_id IS NOT NULL THEN
        SELECT is_enabled INTO v_enabled
        FROM feature_flags
        WHERE feature_key = p_feature_key
        AND scope = 'department'
        AND department_id = p_department_id;

        IF FOUND THEN
            RETURN v_enabled;
        END IF;
    END IF;

    -- Check global flag
    SELECT is_enabled INTO v_enabled
    FROM feature_flags
    WHERE feature_key = p_feature_key
    AND scope = 'global';

    RETURN COALESCE(v_enabled, false);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check access policies
-- SELECT * FROM access_policies WHERE is_active = true;

-- Check feature flags
-- SELECT * FROM feature_flags WHERE scope = 'global';

-- Check if feature is enabled
-- SELECT is_feature_enabled('strategy_s2e');

-- View recent audit entries
-- SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 20;

-- ============================================
-- END OF PHASE 13 GOVERNANCE SCHEMA
-- ============================================
