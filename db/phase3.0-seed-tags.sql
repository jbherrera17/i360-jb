-- ============================================
-- Insight 360 - Phase 3.0: Seed Tags & Roles
-- Version: 3.0
-- Date: January 2026
-- Description: Seed data for tag taxonomy, role templates,
--              and responsibilities
-- ============================================

-- Note: Run AFTER phase3.0-synerginexus-schema.sql
-- Dependencies: tags, department_roles, responsibilities tables

-- ============================================
-- SKILL TAGS (Capability-focused)
-- ============================================

-- Parent: Writing
INSERT INTO tags (name, category, description, parent_id)
VALUES ('writing', 'skill', 'Written communication capabilities', NULL)
ON CONFLICT DO NOTHING;

-- Writing children
INSERT INTO tags (name, category, description, parent_id)
SELECT 'blog-writing', 'skill', 'Blog post and article creation', id
FROM tags WHERE name = 'writing' AND category = 'skill';

INSERT INTO tags (name, category, description, parent_id)
SELECT 'technical-writing', 'skill', 'Technical documentation and guides', id
FROM tags WHERE name = 'blog-writing' AND category = 'skill';

INSERT INTO tags (name, category, description, parent_id)
SELECT 'thought-leadership', 'skill', 'Executive thought leadership content', id
FROM tags WHERE name = 'blog-writing' AND category = 'skill';

INSERT INTO tags (name, category, description, parent_id)
SELECT 'copywriting', 'skill', 'Marketing and sales copy', id
FROM tags WHERE name = 'writing' AND category = 'skill';

INSERT INTO tags (name, category, description, parent_id)
SELECT 'email-writing', 'skill', 'Professional email communication', id
FROM tags WHERE name = 'writing' AND category = 'skill';

-- Parent: Analytics
INSERT INTO tags (name, category, description, parent_id)
VALUES ('analytics', 'skill', 'Data analysis and insights', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO tags (name, category, description, parent_id)
SELECT 'reporting', 'skill', 'Report creation and data visualization', id
FROM tags WHERE name = 'analytics' AND category = 'skill';

INSERT INTO tags (name, category, description, parent_id)
SELECT 'forecasting', 'skill', 'Predictive analysis and projections', id
FROM tags WHERE name = 'analytics' AND category = 'skill';

INSERT INTO tags (name, category, description, parent_id)
SELECT 'data-interpretation', 'skill', 'Data analysis and insights extraction', id
FROM tags WHERE name = 'analytics' AND category = 'skill';

-- Parent: Design
INSERT INTO tags (name, category, description, parent_id)
VALUES ('design', 'skill', 'Visual and UX design capabilities', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO tags (name, category, description, parent_id)
SELECT 'visual-design', 'skill', 'Graphic design and branding', id
FROM tags WHERE name = 'design' AND category = 'skill';

INSERT INTO tags (name, category, description, parent_id)
SELECT 'presentation-design', 'skill', 'Slide deck and presentation creation', id
FROM tags WHERE name = 'design' AND category = 'skill';

-- Parent: Strategy
INSERT INTO tags (name, category, description, parent_id)
VALUES ('strategy', 'skill', 'Strategic thinking and planning', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO tags (name, category, description, parent_id)
SELECT 'strategic-planning', 'skill', 'Long-term planning and goal setting', id
FROM tags WHERE name = 'strategy' AND category = 'skill';

INSERT INTO tags (name, category, description, parent_id)
SELECT 'competitive-analysis', 'skill', 'Market and competitor research', id
FROM tags WHERE name = 'strategy' AND category = 'skill';

-- Parent: Communication
INSERT INTO tags (name, category, description, parent_id)
VALUES ('communication', 'skill', 'Interpersonal and organizational communication', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO tags (name, category, description, parent_id)
SELECT 'stakeholder-management', 'skill', 'Managing stakeholder relationships', id
FROM tags WHERE name = 'communication' AND category = 'skill';

INSERT INTO tags (name, category, description, parent_id)
SELECT 'presentation', 'skill', 'Presenting to audiences', id
FROM tags WHERE name = 'communication' AND category = 'skill';

-- Parent: Leadership
INSERT INTO tags (name, category, description, parent_id)
VALUES ('leadership', 'skill', 'Team and organizational leadership', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO tags (name, category, description, parent_id)
SELECT 'team-management', 'skill', 'Managing direct reports', id
FROM tags WHERE name = 'leadership' AND category = 'skill';

INSERT INTO tags (name, category, description, parent_id)
SELECT 'coaching', 'skill', 'Developing and mentoring others', id
FROM tags WHERE name = 'leadership' AND category = 'skill';

-- ============================================
-- DOMAIN TAGS (Business area-focused)
-- ============================================

INSERT INTO tags (name, category, description, parent_id)
VALUES
    ('marketing', 'domain', 'Marketing and brand management', NULL),
    ('sales', 'domain', 'Sales and revenue generation', NULL),
    ('finance', 'domain', 'Financial operations and planning', NULL),
    ('hr', 'domain', 'Human resources and talent management', NULL),
    ('operations', 'domain', 'Business operations and logistics', NULL),
    ('engineering', 'domain', 'Technical and product development', NULL),
    ('executive', 'domain', 'Executive leadership and strategy', NULL)
ON CONFLICT DO NOTHING;

-- Marketing sub-domains
INSERT INTO tags (name, category, description, parent_id)
SELECT 'content-marketing', 'domain', 'Content strategy and creation', id
FROM tags WHERE name = 'marketing' AND category = 'domain';

INSERT INTO tags (name, category, description, parent_id)
SELECT 'brand', 'domain', 'Brand management and identity', id
FROM tags WHERE name = 'marketing' AND category = 'domain';

INSERT INTO tags (name, category, description, parent_id)
SELECT 'digital-marketing', 'domain', 'Digital channels and campaigns', id
FROM tags WHERE name = 'marketing' AND category = 'domain';

INSERT INTO tags (name, category, description, parent_id)
SELECT 'product-marketing', 'domain', 'Product positioning and GTM', id
FROM tags WHERE name = 'marketing' AND category = 'domain';

-- Sales sub-domains
INSERT INTO tags (name, category, description, parent_id)
SELECT 'business-development', 'domain', 'New business and partnerships', id
FROM tags WHERE name = 'sales' AND category = 'domain';

INSERT INTO tags (name, category, description, parent_id)
SELECT 'account-management', 'domain', 'Customer success and retention', id
FROM tags WHERE name = 'sales' AND category = 'domain';

-- Finance sub-domains
INSERT INTO tags (name, category, description, parent_id)
SELECT 'financial-planning', 'domain', 'Budgeting and forecasting', id
FROM tags WHERE name = 'finance' AND category = 'domain';

INSERT INTO tags (name, category, description, parent_id)
SELECT 'accounting', 'domain', 'Financial reporting and compliance', id
FROM tags WHERE name = 'finance' AND category = 'domain';

-- HR sub-domains
INSERT INTO tags (name, category, description, parent_id)
SELECT 'talent-acquisition', 'domain', 'Recruiting and hiring', id
FROM tags WHERE name = 'hr' AND category = 'domain';

INSERT INTO tags (name, category, description, parent_id)
SELECT 'talent-development', 'domain', 'Training and career growth', id
FROM tags WHERE name = 'hr' AND category = 'domain';

INSERT INTO tags (name, category, description, parent_id)
SELECT 'employee-engagement', 'domain', 'Culture and employee experience', id
FROM tags WHERE name = 'hr' AND category = 'domain';

-- ============================================
-- FUNCTION TAGS (Activity-focused)
-- ============================================

INSERT INTO tags (name, category, description, parent_id)
VALUES
    ('content-creation', 'function', 'Creating written and visual content', NULL),
    ('data-reporting', 'function', 'Analyzing and reporting on data', NULL),
    ('planning', 'function', 'Strategic and operational planning', NULL),
    ('customer-support', 'function', 'Customer service and support', NULL),
    ('research', 'function', 'Research and discovery activities', NULL),
    ('review', 'function', 'Review and approval workflows', NULL),
    ('communication-external', 'function', 'External stakeholder communication', NULL),
    ('communication-internal', 'function', 'Internal team communication', NULL),
    ('project-management', 'function', 'Managing projects and timelines', NULL),
    ('decision-support', 'function', 'Supporting executive decisions', NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- DEPARTMENT ROLE TEMPLATES
-- ============================================

-- Marketing Department Roles
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Content Strategist', 'Plans and executes content strategy', 'ic', true, 1
FROM departments d WHERE d.name = 'Marketing';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Content Creator', 'Creates marketing content and copy', 'ic', true, 2
FROM departments d WHERE d.name = 'Marketing';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Marketing Analyst', 'Analyzes marketing performance', 'ic', true, 3
FROM departments d WHERE d.name = 'Marketing';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Campaign Manager', 'Manages marketing campaigns', 'manager', true, 4
FROM departments d WHERE d.name = 'Marketing';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Marketing Director', 'Leads marketing strategy and team', 'director', true, 5
FROM departments d WHERE d.name = 'Marketing';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'VP of Marketing', 'Oversees all marketing functions', 'vp', true, 6
FROM departments d WHERE d.name = 'Marketing';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'CMO', 'Chief Marketing Officer', 'c-level', true, 7
FROM departments d WHERE d.name = 'Marketing';

-- Sales Department Roles
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Sales Development Rep', 'Generates and qualifies leads', 'ic', true, 1
FROM departments d WHERE d.name = 'Sales';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Account Executive', 'Closes deals and manages accounts', 'ic', true, 2
FROM departments d WHERE d.name = 'Sales';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Sales Manager', 'Manages sales team and pipeline', 'manager', true, 3
FROM departments d WHERE d.name = 'Sales';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Sales Director', 'Leads regional or segment sales', 'director', true, 4
FROM departments d WHERE d.name = 'Sales';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'VP of Sales', 'Oversees all sales operations', 'vp', true, 5
FROM departments d WHERE d.name = 'Sales';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'CRO', 'Chief Revenue Officer', 'c-level', true, 6
FROM departments d WHERE d.name = 'Sales';

-- Finance Department Roles
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Financial Analyst', 'Analyzes financial data and trends', 'ic', true, 1
FROM departments d WHERE d.name = 'Finance';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Accountant', 'Manages financial records and reporting', 'ic', true, 2
FROM departments d WHERE d.name = 'Finance';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Finance Manager', 'Manages finance team and processes', 'manager', true, 3
FROM departments d WHERE d.name = 'Finance';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Finance Director', 'Leads financial planning and strategy', 'director', true, 4
FROM departments d WHERE d.name = 'Finance';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'VP of Finance', 'Oversees all financial operations', 'vp', true, 5
FROM departments d WHERE d.name = 'Finance';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'CFO', 'Chief Financial Officer', 'c-level', true, 6
FROM departments d WHERE d.name = 'Finance';

-- HR Department Roles
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'HR Specialist', 'Handles HR operations and support', 'ic', true, 1
FROM departments d WHERE d.name = 'HR';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Recruiter', 'Sources and recruits talent', 'ic', true, 2
FROM departments d WHERE d.name = 'HR';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'HR Manager', 'Manages HR team and programs', 'manager', true, 3
FROM departments d WHERE d.name = 'HR';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'HR Director', 'Leads HR strategy and initiatives', 'director', true, 4
FROM departments d WHERE d.name = 'HR';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'VP of HR', 'Oversees all people operations', 'vp', true, 5
FROM departments d WHERE d.name = 'HR';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'CHRO', 'Chief Human Resources Officer', 'c-level', true, 6
FROM departments d WHERE d.name = 'HR';

-- Operations Department Roles
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Operations Coordinator', 'Coordinates operational activities', 'ic', true, 1
FROM departments d WHERE d.name = 'Operations';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Process Analyst', 'Analyzes and optimizes processes', 'ic', true, 2
FROM departments d WHERE d.name = 'Operations';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Operations Manager', 'Manages operations team', 'manager', true, 3
FROM departments d WHERE d.name = 'Operations';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Operations Director', 'Leads operational strategy', 'director', true, 4
FROM departments d WHERE d.name = 'Operations';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'VP of Operations', 'Oversees all operations', 'vp', true, 5
FROM departments d WHERE d.name = 'Operations';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'COO', 'Chief Operating Officer', 'c-level', true, 6
FROM departments d WHERE d.name = 'Operations';

-- Executive Department Roles
INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Executive Assistant', 'Supports executive leadership', 'ic', true, 1
FROM departments d WHERE d.name = 'Executive';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'Chief of Staff', 'Coordinates executive operations', 'director', true, 2
FROM departments d WHERE d.name = 'Executive';

INSERT INTO department_roles (department_id, name, description, role_level, is_system_template, sort_order)
SELECT d.id, 'CEO', 'Chief Executive Officer', 'c-level', true, 3
FROM departments d WHERE d.name = 'Executive';

-- ============================================
-- RESPONSIBILITIES (Hierarchical)
-- ============================================

-- Content-related responsibilities
INSERT INTO responsibilities (name, description, parent_id)
VALUES ('Content calendar management', 'Planning and maintaining content calendar', NULL);

INSERT INTO responsibilities (name, description, parent_id)
SELECT 'Weekly content planning', 'Weekly content scheduling and coordination', id
FROM responsibilities WHERE name = 'Content calendar management';

INSERT INTO responsibilities (name, description, parent_id)
SELECT 'Monthly themes', 'Planning monthly content themes', id
FROM responsibilities WHERE name = 'Content calendar management';

INSERT INTO responsibilities (name, description, parent_id)
VALUES ('Blog article creation', 'Creating blog posts and articles', NULL);

INSERT INTO responsibilities (name, description, parent_id)
SELECT 'Technical blogs', 'Writing technical how-to content', id
FROM responsibilities WHERE name = 'Blog article creation';

INSERT INTO responsibilities (name, description, parent_id)
SELECT 'Thought leadership articles', 'Executive thought leadership pieces', id
FROM responsibilities WHERE name = 'Blog article creation';

-- Sales responsibilities
INSERT INTO responsibilities (name, description, parent_id)
VALUES ('Pipeline management', 'Managing sales pipeline and opportunities', NULL);

INSERT INTO responsibilities (name, description, parent_id)
SELECT 'Lead qualification', 'Qualifying inbound and outbound leads', id
FROM responsibilities WHERE name = 'Pipeline management';

INSERT INTO responsibilities (name, description, parent_id)
SELECT 'Deal progression', 'Moving deals through sales stages', id
FROM responsibilities WHERE name = 'Pipeline management';

INSERT INTO responsibilities (name, description, parent_id)
VALUES ('Customer relationships', 'Managing customer accounts', NULL);

INSERT INTO responsibilities (name, description, parent_id)
SELECT 'Account health monitoring', 'Tracking customer satisfaction', id
FROM responsibilities WHERE name = 'Customer relationships';

INSERT INTO responsibilities (name, description, parent_id)
SELECT 'Upsell identification', 'Finding expansion opportunities', id
FROM responsibilities WHERE name = 'Customer relationships';

-- Finance responsibilities
INSERT INTO responsibilities (name, description, parent_id)
VALUES ('Financial reporting', 'Creating financial reports and analysis', NULL);

INSERT INTO responsibilities (name, description, parent_id)
SELECT 'Monthly close', 'Month-end financial closing', id
FROM responsibilities WHERE name = 'Financial reporting';

INSERT INTO responsibilities (name, description, parent_id)
SELECT 'Budget variance analysis', 'Analyzing budget vs actuals', id
FROM responsibilities WHERE name = 'Financial reporting';

INSERT INTO responsibilities (name, description, parent_id)
VALUES ('Budget planning', 'Annual and quarterly budget planning', NULL);

-- HR responsibilities
INSERT INTO responsibilities (name, description, parent_id)
VALUES ('Talent acquisition', 'Recruiting and hiring activities', NULL);

INSERT INTO responsibilities (name, description, parent_id)
SELECT 'Job posting management', 'Creating and managing job postings', id
FROM responsibilities WHERE name = 'Talent acquisition';

INSERT INTO responsibilities (name, description, parent_id)
SELECT 'Candidate screening', 'Reviewing and screening candidates', id
FROM responsibilities WHERE name = 'Talent acquisition';

INSERT INTO responsibilities (name, description, parent_id)
SELECT 'Interview coordination', 'Scheduling and coordinating interviews', id
FROM responsibilities WHERE name = 'Talent acquisition';

INSERT INTO responsibilities (name, description, parent_id)
VALUES ('Employee development', 'Training and career development', NULL);

INSERT INTO responsibilities (name, description, parent_id)
SELECT 'Performance reviews', 'Managing performance review cycles', id
FROM responsibilities WHERE name = 'Employee development';

INSERT INTO responsibilities (name, description, parent_id)
SELECT 'Training programs', 'Developing and delivering training', id
FROM responsibilities WHERE name = 'Employee development';

-- Operations responsibilities
INSERT INTO responsibilities (name, description, parent_id)
VALUES ('Process optimization', 'Improving operational processes', NULL);

INSERT INTO responsibilities (name, description, parent_id)
SELECT 'Process documentation', 'Creating SOPs and documentation', id
FROM responsibilities WHERE name = 'Process optimization';

INSERT INTO responsibilities (name, description, parent_id)
SELECT 'Efficiency analysis', 'Analyzing process efficiency', id
FROM responsibilities WHERE name = 'Process optimization';

-- Executive responsibilities
INSERT INTO responsibilities (name, description, parent_id)
VALUES ('Strategic planning', 'Company-wide strategic planning', NULL);

INSERT INTO responsibilities (name, description, parent_id)
SELECT 'Annual planning', 'Annual strategic plan development', id
FROM responsibilities WHERE name = 'Strategic planning';

INSERT INTO responsibilities (name, description, parent_id)
SELECT 'Quarterly reviews', 'Quarterly business reviews', id
FROM responsibilities WHERE name = 'Strategic planning';

INSERT INTO responsibilities (name, description, parent_id)
VALUES ('Stakeholder management', 'Managing key stakeholders', NULL);

INSERT INTO responsibilities (name, description, parent_id)
SELECT 'Board communication', 'Board reporting and updates', id
FROM responsibilities WHERE name = 'Stakeholder management';

INSERT INTO responsibilities (name, description, parent_id)
SELECT 'Investor relations', 'Managing investor communications', id
FROM responsibilities WHERE name = 'Stakeholder management';

-- ============================================
-- ASSIGN TAGS TO ROLES
-- ============================================

-- Content Strategist: writing, blog-writing, content-marketing, content-creation
INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id
FROM department_roles dr
CROSS JOIN tags t
WHERE dr.name = 'Content Strategist'
AND t.name IN ('writing', 'blog-writing', 'content-marketing', 'content-creation', 'strategy');

-- Content Creator: writing, copywriting, content-creation
INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id
FROM department_roles dr
CROSS JOIN tags t
WHERE dr.name = 'Content Creator'
AND t.name IN ('writing', 'copywriting', 'content-creation', 'marketing');

-- Marketing Analyst: analytics, reporting, marketing
INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id
FROM department_roles dr
CROSS JOIN tags t
WHERE dr.name = 'Marketing Analyst'
AND t.name IN ('analytics', 'reporting', 'data-reporting', 'marketing');

-- Campaign Manager: marketing, planning, analytics, leadership
INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id
FROM department_roles dr
CROSS JOIN tags t
WHERE dr.name = 'Campaign Manager'
AND t.name IN ('marketing', 'planning', 'analytics', 'leadership', 'digital-marketing');

-- Sales roles
INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id
FROM department_roles dr
CROSS JOIN tags t
WHERE dr.name = 'Account Executive'
AND t.name IN ('sales', 'communication', 'email-writing', 'customer-support');

INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id
FROM department_roles dr
CROSS JOIN tags t
WHERE dr.name = 'Sales Manager'
AND t.name IN ('sales', 'leadership', 'analytics', 'forecasting', 'team-management');

-- Finance roles
INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id
FROM department_roles dr
CROSS JOIN tags t
WHERE dr.name = 'Financial Analyst'
AND t.name IN ('finance', 'analytics', 'reporting', 'forecasting', 'data-reporting');

INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id
FROM department_roles dr
CROSS JOIN tags t
WHERE dr.name = 'CFO'
AND t.name IN ('finance', 'strategy', 'leadership', 'decision-support', 'communication-external');

-- HR roles
INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id
FROM department_roles dr
CROSS JOIN tags t
WHERE dr.name = 'HR Specialist'
AND t.name IN ('hr', 'talent-acquisition', 'communication-internal', 'writing');

INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id
FROM department_roles dr
CROSS JOIN tags t
WHERE dr.name = 'Recruiter'
AND t.name IN ('hr', 'talent-acquisition', 'communication', 'email-writing');

INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id
FROM department_roles dr
CROSS JOIN tags t
WHERE dr.name = 'CHRO'
AND t.name IN ('hr', 'leadership', 'strategy', 'decision-support', 'employee-engagement');

-- Executive roles
INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id
FROM department_roles dr
CROSS JOIN tags t
WHERE dr.name = 'CEO'
AND t.name IN ('executive', 'strategy', 'leadership', 'decision-support', 'communication-external', 'stakeholder-management');

INSERT INTO role_tags (role_id, tag_id)
SELECT dr.id, t.id
FROM department_roles dr
CROSS JOIN tags t
WHERE dr.name = 'Chief of Staff'
AND t.name IN ('executive', 'planning', 'project-management', 'communication-internal');

-- ============================================
-- ASSIGN TAGS TO RESPONSIBILITIES
-- ============================================

-- Content calendar management
INSERT INTO responsibility_tags (responsibility_id, tag_id)
SELECT r.id, t.id
FROM responsibilities r
CROSS JOIN tags t
WHERE r.name = 'Content calendar management'
AND t.name IN ('content-creation', 'planning', 'content-marketing');

-- Blog article creation
INSERT INTO responsibility_tags (responsibility_id, tag_id)
SELECT r.id, t.id
FROM responsibilities r
CROSS JOIN tags t
WHERE r.name = 'Blog article creation'
AND t.name IN ('writing', 'blog-writing', 'content-creation');

-- Pipeline management
INSERT INTO responsibility_tags (responsibility_id, tag_id)
SELECT r.id, t.id
FROM responsibilities r
CROSS JOIN tags t
WHERE r.name = 'Pipeline management'
AND t.name IN ('sales', 'analytics', 'forecasting');

-- Financial reporting
INSERT INTO responsibility_tags (responsibility_id, tag_id)
SELECT r.id, t.id
FROM responsibilities r
CROSS JOIN tags t
WHERE r.name = 'Financial reporting'
AND t.name IN ('finance', 'reporting', 'data-reporting', 'analytics');

-- Talent acquisition
INSERT INTO responsibility_tags (responsibility_id, tag_id)
SELECT r.id, t.id
FROM responsibilities r
CROSS JOIN tags t
WHERE r.name = 'Talent acquisition'
AND t.name IN ('hr', 'talent-acquisition', 'communication');

-- Strategic planning
INSERT INTO responsibility_tags (responsibility_id, tag_id)
SELECT r.id, t.id
FROM responsibilities r
CROSS JOIN tags t
WHERE r.name = 'Strategic planning'
AND t.name IN ('executive', 'strategy', 'planning', 'decision-support');

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Show tag counts by category
SELECT category, COUNT(*) as tag_count
FROM tags
GROUP BY category
ORDER BY category;

-- Show role templates by department
SELECT d.name as department, dr.name as role, dr.role_level
FROM department_roles dr
JOIN departments d ON d.id = dr.department_id
WHERE dr.is_system_template = true
ORDER BY d.name, dr.sort_order;

-- Show responsibility hierarchy
SELECT
    r.name,
    p.name as parent,
    r.description
FROM responsibilities r
LEFT JOIN responsibilities p ON p.id = r.parent_id
ORDER BY COALESCE(p.name, r.name), r.name;

-- Show tags per role
SELECT dr.name as role, COUNT(rt.tag_id) as tag_count
FROM department_roles dr
LEFT JOIN role_tags rt ON rt.role_id = dr.id
GROUP BY dr.name
ORDER BY tag_count DESC;
