-- ============================================
-- PHASE 62: OPEN BRAIN MODULE
-- Adds Open Brain as a platform-admin-only nav module.
-- Only accessible to users in the platform_admins table.
-- ============================================

-- ============================================
-- PART 1: ADD platform_admin_only FLAG
-- Allows modules to be restricted to platform
-- admins only, regardless of tier or role.
-- ============================================

ALTER TABLE platform_modules
ADD COLUMN IF NOT EXISTS platform_admin_only BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN platform_modules.platform_admin_only
IS 'If TRUE, only platform admins (in platform_admins table) can access this module';

-- ============================================
-- PART 2: UPDATE can_access_module
-- Deny non-platform-admins from platform_admin_only modules.
-- Platform admins already return TRUE at the top
-- of the function — this handles the non-admin path.
-- ============================================

CREATE OR REPLACE FUNCTION can_access_module(
    p_user_id UUID,
    p_module_id TEXT,
    p_org_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_tier TEXT;
    v_business_role TEXT;
    v_module RECORD;
    v_role_level INTEGER;
    v_min_role_level INTEGER;
    v_tier_order INTEGER;
    v_min_tier_order INTEGER;
    v_can_access BOOLEAN;
BEGIN
    -- Platform admins can access everything
    IF is_platform_admin(p_user_id) THEN
        RETURN TRUE;
    END IF;

    -- Get module record first so we can check platform_admin_only
    SELECT * INTO v_module FROM platform_modules WHERE id = p_module_id AND is_active = TRUE;
    IF v_module IS NULL THEN RETURN FALSE; END IF;

    -- Block non-platform-admins from platform_admin_only modules
    IF v_module.platform_admin_only = TRUE THEN
        RETURN FALSE;
    END IF;

    -- Get user's org if not provided
    IF p_org_id IS NULL THEN
        SELECT default_org_id INTO v_org_id FROM users WHERE id = p_user_id;
    ELSE
        v_org_id := p_org_id;
    END IF;

    -- No org context, deny access to org-specific features
    IF v_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Get org's tier
    SELECT subscription_tier INTO v_tier FROM organizations WHERE id = v_org_id;
    IF v_tier IS NULL THEN v_tier := 'starter'; END IF;

    -- Get user's business role
    SELECT business_role INTO v_business_role FROM users WHERE id = p_user_id;
    IF v_business_role IS NULL THEN v_business_role := 'ic'; END IF;

    -- Check tier requirement
    IF v_module.min_tier IS NOT NULL THEN
        SELECT display_order INTO v_tier_order FROM subscription_tiers WHERE id = v_tier;
        SELECT display_order INTO v_min_tier_order FROM subscription_tiers WHERE id = v_module.min_tier;
        IF v_tier_order IS NULL OR v_min_tier_order IS NULL THEN
            RETURN FALSE;
        END IF;
        IF v_tier_order < v_min_tier_order THEN RETURN FALSE; END IF;
    END IF;

    -- Check business role requirement
    IF v_module.min_business_role IS NOT NULL THEN
        SELECT level INTO v_role_level FROM business_role_levels WHERE id = v_business_role;
        SELECT level INTO v_min_role_level FROM business_role_levels WHERE id = v_module.min_business_role;
        IF v_role_level IS NULL OR v_min_role_level IS NULL THEN
            RETURN FALSE;
        END IF;
        IF v_role_level < v_min_role_level THEN RETURN FALSE; END IF;
    END IF;

    -- Check org-specific module override (explicit disable)
    IF EXISTS (
        SELECT 1 FROM org_module_access
        WHERE org_id = v_org_id AND module_id = p_module_id AND is_enabled = FALSE
    ) THEN
        RETURN FALSE;
    END IF;

    -- Check role-based access (org-specific first, then global)
    SELECT can_access INTO v_can_access
    FROM role_module_access
    WHERE (org_id = v_org_id OR org_id IS NULL)
    AND business_role = v_business_role
    AND module_id = p_module_id
    ORDER BY org_id NULLS LAST
    LIMIT 1;

    IF v_can_access IS NOT NULL THEN
        RETURN v_can_access;
    END IF;

    -- Default: allow access (tier and role requirements already checked above)
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 3: INSERT OPEN BRAIN MODULE
-- nav_group = 'admin' puts it under Administration
-- platform_admin_only = TRUE restricts to JB only
-- display_order = 63 places it below existing admin items
-- ============================================

INSERT INTO platform_modules (
    id,
    name,
    description,
    icon,
    route_path,
    min_tier,
    min_business_role,
    category,
    nav_group,
    display_order,
    is_active,
    platform_admin_only
)
VALUES (
    'open_brain',
    'Open Brain',
    'Personal knowledge capture and retrieval via Open Brain MCP',
    'brain',
    '/open-brain.html',
    NULL,
    NULL,
    'admin',
    'admin',
    63,
    TRUE,
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    name                = EXCLUDED.name,
    description         = EXCLUDED.description,
    icon                = EXCLUDED.icon,
    route_path          = EXCLUDED.route_path,
    category            = EXCLUDED.category,
    nav_group           = EXCLUDED.nav_group,
    display_order       = EXCLUDED.display_order,
    is_active           = EXCLUDED.is_active,
    platform_admin_only = EXCLUDED.platform_admin_only;

-- ============================================
-- PART 4: ENSURE jb@synergiai.io IS PLATFORM ADMIN
-- Looks up the user by email and inserts/updates
-- their platform_admins record as super_admin.
-- Safe to run multiple times (ON CONFLICT DO UPDATE).
-- ============================================

INSERT INTO platform_admins (user_id, role, is_active, notes)
SELECT
    u.id,
    'super_admin',
    TRUE,
    'JB - Platform owner and primary Open Brain user'
FROM users u
WHERE u.email = 'jb@synergiai.io'
ON CONFLICT (user_id) DO UPDATE SET
    role      = 'super_admin',
    is_active = TRUE;

-- ============================================
-- VERIFY
-- ============================================

SELECT
    pm.id,
    pm.name,
    pm.nav_group,
    pm.display_order,
    pm.platform_admin_only,
    pm.route_path
FROM platform_modules pm
WHERE pm.nav_group = 'admin'
ORDER BY pm.display_order;

SELECT
    pa.user_id,
    u.email,
    pa.role,
    pa.is_active
FROM platform_admins pa
JOIN users u ON u.id = pa.user_id
ORDER BY u.email;
