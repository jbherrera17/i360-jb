-- Phase 70: Role Change Audit Table
-- Tracks all role changes across the platform for security and compliance
-- Part of the Role Architecture Streamlining initiative (WF-06)

-- ============================================================
-- Role Change Audit Table
-- ============================================================
CREATE TABLE IF NOT EXISTS role_change_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who was affected
    target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Who made the change
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- What changed
    change_type TEXT NOT NULL CHECK (change_type IN (
        -- Platform admin changes
        'platform_admin_granted',
        'platform_admin_updated',
        'platform_admin_removed',
        -- Organization membership changes
        'org_member_invited',
        'org_member_role_changed',
        'org_member_activated',
        'org_member_suspended',
        'org_member_removed',
        'org_ownership_transferred',
        -- Business role changes
        'business_role_changed',
        -- Client portal changes
        'client_access_granted',
        'client_access_role_changed',
        'client_access_removed'
    )),

    -- Context: what entity was changed
    entity_type TEXT NOT NULL CHECK (entity_type IN (
        'platform_admins',
        'organization_members',
        'client_users',
        'users'
    )),
    entity_id UUID,           -- The specific record that changed (membership ID, etc.)
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,  -- Org context if applicable

    -- Before and after values
    old_value TEXT,            -- Previous role/status value
    new_value TEXT,            -- New role/status value

    -- Metadata
    reason TEXT,               -- Why the change was made
    ip_address INET,           -- Request IP for security audit
    user_agent TEXT,           -- Request user agent

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_role_audit_target_user ON role_change_audit(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_role_audit_changed_by ON role_change_audit(changed_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_role_audit_org ON role_change_audit(org_id, created_at DESC) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_role_audit_type ON role_change_audit(change_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_role_audit_created ON role_change_audit(created_at DESC);

-- RLS policies
ALTER TABLE role_change_audit ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (server-side operations)
CREATE POLICY "Service role full access to role_change_audit"
    ON role_change_audit
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Platform admins can read all audit entries
CREATE POLICY "Platform admins can read role_change_audit"
    ON role_change_audit
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM platform_admins
            WHERE user_id = auth.uid()
            AND is_active = true
        )
    );

-- Org owners/admins can read audit entries for their org
CREATE POLICY "Org admins can read org role_change_audit"
    ON role_change_audit
    FOR SELECT
    USING (
        org_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM organization_members
            WHERE org_id = role_change_audit.org_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    );

-- ============================================================
-- View: Recent role changes summary (for admin dashboards)
-- ============================================================
CREATE OR REPLACE VIEW role_changes_summary AS
SELECT
    rca.id,
    rca.change_type,
    rca.entity_type,
    rca.org_id,
    o.name AS org_name,
    rca.target_user_id,
    tu.email AS target_email,
    tu.display_name AS target_name,
    rca.changed_by,
    cu.email AS changed_by_email,
    cu.display_name AS changed_by_name,
    rca.old_value,
    rca.new_value,
    rca.reason,
    rca.created_at
FROM role_change_audit rca
LEFT JOIN users tu ON tu.id = rca.target_user_id
LEFT JOIN users cu ON cu.id = rca.changed_by
LEFT JOIN organizations o ON o.id = rca.org_id
ORDER BY rca.created_at DESC;

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE role_change_audit IS 'Audit trail for all role and permission changes across the platform';
COMMENT ON COLUMN role_change_audit.change_type IS 'Type of role change event';
COMMENT ON COLUMN role_change_audit.entity_type IS 'Which table/system the change occurred in';
COMMENT ON COLUMN role_change_audit.old_value IS 'Previous role or status value (null for new assignments)';
COMMENT ON COLUMN role_change_audit.new_value IS 'New role or status value';
