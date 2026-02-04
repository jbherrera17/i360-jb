-- ============================================
-- PHASE 53: NAVIGATION RESTRUCTURE
-- Reorganizes platform_modules nav_group and display_order
-- to match new navigation structure
-- ============================================

-- ===========================================
-- PRIMARY ITEMS (Top level, always visible)
-- ===========================================
-- Higgins, My Capabilities, Execute 120

UPDATE platform_modules SET nav_group = 'primary', display_order = 1 WHERE id = 'higgins';
UPDATE platform_modules SET nav_group = 'primary', display_order = 2 WHERE id = 'capabilities_admin';
UPDATE platform_modules SET nav_group = 'primary', display_order = 3 WHERE id = 'execute120';

-- ===========================================
-- AI 360 SYSTEMS (ai-systems)
-- Agent Library, Strategy Agents, Context Assets, Actions, Skills, Workflows, Prompt Transformer
-- ===========================================

UPDATE platform_modules SET nav_group = 'ai-systems', display_order = 10 WHERE id = 'agents';
UPDATE platform_modules SET nav_group = 'ai-systems', display_order = 11 WHERE id = 'strategy_agents';
UPDATE platform_modules SET nav_group = 'ai-systems', display_order = 12 WHERE id = 'context_assets';
UPDATE platform_modules SET nav_group = 'ai-systems', display_order = 13 WHERE id = 'actions';
UPDATE platform_modules SET nav_group = 'ai-systems', display_order = 14 WHERE id = 'skills';
UPDATE platform_modules SET nav_group = 'ai-systems', display_order = 15 WHERE id = 'workflows';
UPDATE platform_modules SET nav_group = 'ai-systems', display_order = 16 WHERE id = 'prompts';

-- ===========================================
-- DASHBOARDS
-- Dashboard, Company Dashboard, Integrity Dashboard, Strategy Governance
-- ===========================================

UPDATE platform_modules SET nav_group = 'dashboards', display_order = 20 WHERE id = 'dashboard';
UPDATE platform_modules SET nav_group = 'dashboards', display_order = 21 WHERE id = 'company_dashboard';
UPDATE platform_modules SET nav_group = 'dashboards', display_order = 22 WHERE id = 'integrity';
UPDATE platform_modules SET nav_group = 'dashboards', display_order = 23 WHERE id = 'governance';

-- ===========================================
-- MODULES
-- Align 120, Strategy (S2E), Research Studio, Thought Leadership, Briefing, Guides
-- ===========================================

UPDATE platform_modules SET nav_group = 'modules', display_order = 30 WHERE id = 'align120';
UPDATE platform_modules SET nav_group = 'modules', display_order = 31 WHERE id = 'strategy120';
UPDATE platform_modules SET nav_group = 'modules', display_order = 32 WHERE id = 'research_studio';
UPDATE platform_modules SET nav_group = 'modules', display_order = 33 WHERE id = 'thought_leadership';
UPDATE platform_modules SET nav_group = 'modules', display_order = 34 WHERE id = 'briefing';
UPDATE platform_modules SET nav_group = 'modules', display_order = 35 WHERE id = 'guides';

-- ===========================================
-- AGENCY (unchanged - already correct)
-- ===========================================
-- agency_dashboard, agency_customization, client_portal_admin, client_comparison
-- (nav_group = 'agency' is already correct)

-- ===========================================
-- ADMINISTRATION
-- Administrator, Resource Access, Integrations
-- ===========================================

UPDATE platform_modules SET nav_group = 'admin', display_order = 60 WHERE id = 'admin';
-- Resource Access may need to be added if not exists
UPDATE platform_modules SET nav_group = 'admin', display_order = 61 WHERE id = 'resource_access';
-- Move Integrations from tools to admin (admin only)
UPDATE platform_modules SET nav_group = 'admin', display_order = 62 WHERE id = 'integrations';

-- Remove other admin items that shouldn't show in nav (they have their own pages but aren't primary nav)
-- org_settings, team_members, clients_admin, roles_admin are sub-pages accessed from Administrator
UPDATE platform_modules SET nav_group = 'admin-sub', display_order = 70 WHERE id = 'org_settings';
UPDATE platform_modules SET nav_group = 'admin-sub', display_order = 71 WHERE id = 'team_members';
UPDATE platform_modules SET nav_group = 'admin-sub', display_order = 72 WHERE id = 'clients_admin';
UPDATE platform_modules SET nav_group = 'admin-sub', display_order = 73 WHERE id = 'roles_admin';

-- ===========================================
-- INSERT RESOURCE ACCESS MODULE IF NOT EXISTS
-- ===========================================

INSERT INTO platform_modules (id, name, description, icon, route_path, min_tier, min_business_role, category, nav_group, display_order, is_active)
VALUES (
    'resource_access',
    'Resource Access',
    'Manage resource visibility and access controls',
    'shield-check',
    '/admin-resource-access.html',
    NULL,
    'manager',
    'admin',
    'admin',
    61,
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    nav_group = 'admin',
    display_order = 61;

-- ===========================================
-- VERIFY CHANGES
-- ===========================================

-- View updated navigation structure
SELECT id, name, nav_group, display_order, route_path
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
        ELSE 7
    END,
    display_order;
