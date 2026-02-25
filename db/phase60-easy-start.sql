-- Phase 60: Easy Start Module Registration
-- Registers the Easy Start conversational onboarding page as a platform module.
-- Available to ALL subscription tiers (min_tier = NULL).

INSERT INTO platform_modules (
    id, name, description, icon, route_path,
    min_tier, min_business_role, category, nav_group, display_order, is_active
)
VALUES (
    'easy_start',
    'Easy Start',
    'Conversational workspace setup — tell Higgins what you need and get custom AI tools built for you',
    'sparkles',
    '/easy-start.html',
    NULL,           -- available to ALL tiers
    NULL,           -- available to ALL roles
    'tool',
    'modules',      -- appears in the Modules nav group
    25,             -- display order within modules group
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    route_path = EXCLUDED.route_path,
    min_tier = EXCLUDED.min_tier,
    category = EXCLUDED.category,
    nav_group = EXCLUDED.nav_group,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active;
