-- Phase 70b: Move business_role to organization_members (per-org instead of per-user)
-- Part of the Role Architecture Streamlining initiative (WF-06)

-- ============================================================
-- Add business_role column to organization_members
-- ============================================================
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS business_role TEXT REFERENCES business_role_levels(id) DEFAULT 'ic';

-- ============================================================
-- Migrate existing data from users table
-- ============================================================
UPDATE organization_members om
SET business_role = COALESCE(u.business_role, 'ic')
FROM users u
WHERE om.user_id = u.id
AND om.status IN ('active', 'pending');

-- ============================================================
-- Update can_access_module() to read from organization_members
-- ============================================================
CREATE OR REPLACE FUNCTION can_access_module(p_user_id UUID, p_module_id TEXT, p_org_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_business_role TEXT;
    v_tier TEXT;
    v_module RECORD;
    v_has_override BOOLEAN;
BEGIN
    -- Determine org context
    v_org_id := p_org_id;
    IF v_org_id IS NULL THEN
        SELECT default_org_id INTO v_org_id FROM users WHERE id = p_user_id;
    END IF;

    IF v_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Platform admins bypass all checks
    IF is_platform_admin(p_user_id) THEN
        RETURN TRUE;
    END IF;

    -- Get business_role from organization_members (per-org)
    SELECT business_role INTO v_business_role
    FROM organization_members
    WHERE user_id = p_user_id AND org_id = v_org_id AND status = 'active';

    IF v_business_role IS NULL THEN
        v_business_role := 'ic';
    END IF;

    -- Get org tier
    SELECT subscription_tier INTO v_tier FROM organizations WHERE id = v_org_id;

    -- Get module requirements
    SELECT * INTO v_module FROM platform_modules WHERE id = p_module_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Check if module is enabled for this tier
    IF v_module.min_tier IS NOT NULL THEN
        -- Tier hierarchy: starter < business < enterprise < agency
        DECLARE
            v_tier_level INTEGER;
            v_required_level INTEGER;
        BEGIN
            v_tier_level := CASE v_tier
                WHEN 'starter' THEN 1
                WHEN 'business' THEN 2
                WHEN 'enterprise' THEN 3
                WHEN 'agency' THEN 4
                ELSE 0
            END;
            v_required_level := CASE v_module.min_tier
                WHEN 'starter' THEN 1
                WHEN 'business' THEN 2
                WHEN 'enterprise' THEN 3
                WHEN 'agency' THEN 4
                ELSE 0
            END;
            IF v_tier_level < v_required_level THEN
                RETURN FALSE;
            END IF;
        END;
    END IF;

    -- Check org-level module override
    SELECT EXISTS(
        SELECT 1 FROM org_module_access
        WHERE org_id = v_org_id AND module_id = p_module_id AND can_access = false
    ) INTO v_has_override;
    IF v_has_override THEN
        RETURN FALSE;
    END IF;

    -- Check business role requirement
    IF v_module.min_business_role IS NOT NULL THEN
        DECLARE
            v_role_level INTEGER;
            v_required_role_level INTEGER;
        BEGIN
            SELECT level INTO v_role_level FROM business_role_levels WHERE id = v_business_role;
            SELECT level INTO v_required_role_level FROM business_role_levels WHERE id = v_module.min_business_role;
            IF v_role_level IS NULL OR v_required_role_level IS NULL OR v_role_level < v_required_role_level THEN
                -- Check for org-specific role override
                SELECT EXISTS(
                    SELECT 1 FROM role_module_access
                    WHERE (org_id = v_org_id OR org_id IS NULL)
                    AND business_role = v_business_role
                    AND module_id = p_module_id
                    AND can_access = true
                ) INTO v_has_override;
                IF NOT v_has_override THEN
                    RETURN FALSE;
                END IF;
            END IF;
        END;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Deprecation comment on users.business_role
-- ============================================================
COMMENT ON COLUMN users.business_role IS 'DEPRECATED: Use organization_members.business_role instead. Kept for backward compatibility during migration.';
