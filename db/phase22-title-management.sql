-- ============================================
-- Insight 360 - Phase 22: Title Management
-- Date: January 11, 2026
-- Description: Transform Role Management to Title Management
--              - Add domain_tag reference to departments
--              - Add is_system_title flag for "All [Department]" titles
--              - Create system titles for each department
--              - Auto-tag system titles with department domain tags
-- ============================================

-- ============================================
-- STEP 1: Add domain_tag reference to departments
-- ============================================
ALTER TABLE departments ADD COLUMN IF NOT EXISTS domain_tag TEXT;

COMMENT ON COLUMN departments.domain_tag IS 'Slug reference to the domain tag (e.g., marketing, sales, finance)';

-- Update existing departments with their domain tag slugs
UPDATE departments SET domain_tag = 'marketing' WHERE name ILIKE '%marketing%' AND domain_tag IS NULL;
UPDATE departments SET domain_tag = 'sales' WHERE name ILIKE '%sales%' AND domain_tag IS NULL;
UPDATE departments SET domain_tag = 'finance' WHERE name ILIKE '%finance%' AND domain_tag IS NULL;
UPDATE departments SET domain_tag = 'hr' WHERE (name ILIKE '%hr%' OR name ILIKE '%human%') AND domain_tag IS NULL;
UPDATE departments SET domain_tag = 'operations' WHERE name ILIKE '%operations%' AND domain_tag IS NULL;
UPDATE departments SET domain_tag = 'executive' WHERE name ILIKE '%executive%' AND domain_tag IS NULL;
UPDATE departments SET domain_tag = 'engineering' WHERE (name ILIKE '%engineering%' OR name ILIKE '%it%' OR name ILIKE '%tech%') AND domain_tag IS NULL;

-- ============================================
-- STEP 2: Add is_system_title flag to department_roles
-- ============================================
ALTER TABLE department_roles ADD COLUMN IF NOT EXISTS is_system_title BOOLEAN DEFAULT false;

COMMENT ON COLUMN department_roles.is_system_title IS 'True for auto-generated "All [Department]" titles that grant full department access';

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_department_roles_system_title ON department_roles(is_system_title) WHERE is_system_title = true;

-- ============================================
-- STEP 3: Create system titles for each department
-- These "All [Department]" titles are assigned to users who don't specify a specific title
-- ============================================
INSERT INTO department_roles (id, department_id, name, description, role_level, is_system_template, is_system_title, is_active, sort_order)
SELECT
    gen_random_uuid(),
    d.id,
    'All ' || d.name,
    'Default title granting access to all ' || d.name || ' agents and workflows. Assigned when no specific title is provided.',
    'ic',
    false,
    true,
    true,
    0
FROM departments d
WHERE d.is_active = true
  AND NOT EXISTS (
      SELECT 1 FROM department_roles dr
      WHERE dr.department_id = d.id
      AND dr.is_system_title = true
  );

-- ============================================
-- STEP 4: Auto-tag system titles with department domain tags
-- Links "All Marketing" to all marketing-related tags (marketing, content-marketing, brand, etc.)
-- ============================================

-- First, tag with the primary domain tag
INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id
FROM department_roles dr
JOIN departments d ON dr.department_id = d.id
JOIN tags t ON t.name = d.domain_tag AND t.is_active = true
WHERE dr.is_system_title = true
  AND d.domain_tag IS NOT NULL
ON CONFLICT DO NOTHING;

-- Then, tag with child tags of the domain (e.g., content-marketing under marketing)
INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, child_tag.id
FROM department_roles dr
JOIN departments d ON dr.department_id = d.id
JOIN tags parent_tag ON parent_tag.name = d.domain_tag AND parent_tag.is_active = true
JOIN tags child_tag ON child_tag.parent_id = parent_tag.id AND child_tag.is_active = true
WHERE dr.is_system_title = true
  AND d.domain_tag IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify departments have domain tags
SELECT name, domain_tag FROM departments WHERE is_active = true ORDER BY name;

-- Verify system titles were created
SELECT
    dr.name as title_name,
    d.name as department_name,
    dr.is_system_title,
    dr.role_level
FROM department_roles dr
JOIN departments d ON dr.department_id = d.id
WHERE dr.is_system_title = true
ORDER BY d.name;

-- Verify tags were assigned to system titles
SELECT
    dr.name as title_name,
    t.name as tag_name,
    t.category as tag_category
FROM department_roles dr
JOIN role_tags rt ON rt.role_id = dr.id
JOIN tags t ON t.id = rt.tag_id
WHERE dr.is_system_title = true
ORDER BY dr.name, t.category, t.name;

-- Summary
SELECT
    'System titles created' as metric,
    COUNT(*) as count
FROM department_roles
WHERE is_system_title = true;

SELECT 'Phase 22: Title Management schema updates complete' as status;
