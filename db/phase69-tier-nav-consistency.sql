-- ============================================================================
-- Phase 69: Tier-Nav Consistency
-- ============================================================================
-- Fixes inconsistencies between platform_modules registry and the nav panel:
--   1. AI Digest has invalid nav_group 'create' → 'modules'
--   2. MCP Connections has legacy nav_group 'tools' → 'admin' (org admin function)
--   3. Agency modules reference deactivated 'agency' tier → 'agency_starter'
--   4. Documents the purpose of category vs nav_group fields
-- ============================================================================

-- ===========================================
-- FIX 1: AI Digest nav_group
-- 'create' is not a recognized nav_group.
-- Falls back to 'ai-systems' in navigation.js, but should be 'modules'.
-- ===========================================

UPDATE platform_modules
SET nav_group = 'modules', display_order = 36
WHERE id = 'ai_digest';

-- Digest admin stays in admin group (correct)
-- Just verify display_order is reasonable
UPDATE platform_modules
SET display_order = 65
WHERE id = 'ai_digest_admin' AND nav_group = 'admin';

-- ===========================================
-- FIX 2: MCP Connections nav_group
-- MCP server selection is an org-level admin function.
-- Move from legacy 'tools' group to 'admin'.
-- ===========================================

UPDATE platform_modules
SET nav_group = 'admin', display_order = 63
WHERE id = 'mcp_integrations';

-- MCP Catalog stays in admin (already correct, platform_admin_only)
-- Just ensure consistent ordering
UPDATE platform_modules
SET display_order = 66
WHERE id = 'mcp_catalog_admin' AND nav_group = 'admin';

-- ===========================================
-- FIX 3: Agency module min_tier references
-- The 'agency' tier was deactivated in Phase 55 and split into
-- agency_starter, agency_professional, agency_enterprise.
-- Update min_tier to 'agency_starter' (lowest agency tier)
-- so the display_order comparison works correctly.
-- ===========================================

UPDATE platform_modules
SET min_tier = 'agency_starter'
WHERE min_tier = 'agency'
  AND id IN ('agency_dashboard', 'agency_customization', 'client_portal_admin', 'client_comparison', 'clients_admin');

-- ===========================================
-- FIX 4: Add missing category values for modules
-- added after Phase 44 that lack explicit category
-- ===========================================

UPDATE platform_modules SET category = 'tool' WHERE id = 'ai_digest' AND (category IS NULL OR category = '');
UPDATE platform_modules SET category = 'admin' WHERE id = 'ai_digest_admin' AND (category IS NULL OR category = '');
UPDATE platform_modules SET category = 'tool' WHERE id = 'easy_start' AND (category IS NULL OR category = '');
UPDATE platform_modules SET category = 'tool' WHERE id = 'social_publishing' AND (category IS NULL OR category = '');

-- ===========================================
-- FIX 5: Add comments documenting field purposes
-- ===========================================

COMMENT ON COLUMN platform_modules.category IS
'Logical classification of what type of thing this module is. Used for role-based access defaults and admin grouping. Values: dashboard, system, tool, agency, admin.';

COMMENT ON COLUMN platform_modules.nav_group IS
'Navigation placement — determines which sidebar group this module appears in. This is the authoritative field for nav rendering. Values: primary, ai-systems, dashboards, modules, agency, admin, admin-sub.';

-- ===========================================
-- VERIFY: Show final module registry
-- ===========================================

SELECT
    id,
    name,
    category,
    nav_group,
    min_tier,
    min_business_role,
    display_order,
    is_active,
    COALESCE(platform_admin_only, FALSE) as platform_admin_only
FROM platform_modules
WHERE is_active = TRUE
ORDER BY
    CASE nav_group
        WHEN 'primary' THEN 1
        WHEN 'ai-systems' THEN 2
        WHEN 'dashboards' THEN 3
        WHEN 'modules' THEN 4
        WHEN 'agency' THEN 5
        WHEN 'admin' THEN 6
        WHEN 'admin-sub' THEN 7
        ELSE 8
    END,
    display_order;
