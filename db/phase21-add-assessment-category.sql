-- ============================================
-- Insight 360 - Phase 21: Add Assessment Category
-- Date: January 11, 2026
-- Description: Add "Assessment" category for Align 120 Module 1 agents
-- ============================================

-- Add Assessment category (for Align 120 Module 1)
INSERT INTO agent_categories (key, display_name, description, icon, sort_order, is_active, color)
VALUES ('assessment', 'Assessment', 'Agents for AI readiness and maturity assessments', 'clipboard-list', 1, true, '#10b981')
ON CONFLICT (key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;

-- Verify
SELECT key, display_name, icon, sort_order FROM agent_categories WHERE key = 'assessment';

SELECT 'Assessment category added successfully' as status;
