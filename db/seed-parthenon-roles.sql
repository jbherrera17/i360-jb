-- ============================================
-- Insight 360 - Seed: Parthenon Roles
-- Version: 1.0
-- Date: December 2024
-- Description: Sample roles for all departments at all four levels
--              Designed for an AIaaS (AI as a Service) business
-- ============================================

-- Note: This script assumes departments have already been seeded
-- Run after seed-defaults or manually creating departments

-- ============================================
-- EXECUTIVE DEPARTMENT ROLES
-- ============================================

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Chief Executive Officer',
    'Ultimate leadership responsibility for company vision, strategy, and performance',
    'executive',
    '["Set company vision and strategic direction", "Lead executive team", "Represent company to board and stakeholders", "Drive company culture and values", "Oversee major business decisions"]'::jsonb,
    '{"budget": "unlimited", "hiring": "executive-level", "strategy": "final-approval"}'::jsonb,
    '["Strategic Leadership", "Business Development", "Stakeholder Management", "AI Industry Knowledge"]'::jsonb,
    1
FROM departments d WHERE d.name = 'Executive' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Chief Operating Officer',
    'Oversees day-to-day operations and ensures operational excellence',
    'executive',
    '["Manage daily operations", "Implement strategic initiatives", "Optimize business processes", "Coordinate cross-functional teams", "Report to CEO on operational metrics"]'::jsonb,
    '{"budget": "operational", "hiring": "director-level", "operations": "full-authority"}'::jsonb,
    '["Operations Management", "Process Optimization", "Team Leadership", "AI Service Delivery"]'::jsonb,
    2
FROM departments d WHERE d.name = 'Executive' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Chief Technology Officer',
    'Leads technology strategy and AI platform development',
    'executive',
    '["Define technology roadmap", "Lead AI/ML platform development", "Ensure technical excellence", "Drive innovation initiatives", "Manage technology partnerships"]'::jsonb,
    '{"budget": "technology", "hiring": "technical-staff", "technology": "final-approval"}'::jsonb,
    '["AI/ML Architecture", "Cloud Infrastructure", "Technical Leadership", "Innovation Management"]'::jsonb,
    3
FROM departments d WHERE d.name = 'Executive' AND d.is_active = true
ON CONFLICT DO NOTHING;

-- ============================================
-- FINANCE DEPARTMENT ROLES
-- ============================================

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Chief Financial Officer',
    'Leads all financial operations and strategy',
    'executive',
    '["Financial strategy and planning", "Investor relations", "Risk management", "Financial reporting", "Capital allocation"]'::jsonb,
    '{"budget": "financial", "hiring": "finance-team", "financial": "final-approval"}'::jsonb,
    '["Financial Management", "Strategic Planning", "Risk Assessment", "SaaS Metrics"]'::jsonb,
    1
FROM departments d WHERE d.name = 'Finance' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Finance Director',
    'Directs financial operations and team management',
    'director',
    '["Oversee accounting operations", "Manage financial reporting", "Budget forecasting", "Team leadership", "Audit coordination"]'::jsonb,
    '{"budget": "departmental", "hiring": "finance-staff", "reporting": "approve"}'::jsonb,
    '["Financial Analysis", "Team Management", "GAAP/IFRS", "SaaS Revenue Recognition"]'::jsonb,
    2
FROM departments d WHERE d.name = 'Finance' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Accounting Manager',
    'Manages day-to-day accounting operations',
    'manager',
    '["Manage accounts payable/receivable", "Monthly close process", "Financial reconciliation", "Team supervision", "Vendor management"]'::jsonb,
    '{"budget": "operational", "hiring": "recommend", "transactions": "approve-under-limit"}'::jsonb,
    '["Accounting Software", "Month-End Close", "Team Supervision", "Process Management"]'::jsonb,
    3
FROM departments d WHERE d.name = 'Finance' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Financial Analyst',
    'Performs financial analysis and reporting',
    'individual',
    '["Prepare financial reports", "Analyze revenue metrics", "Support budgeting process", "Track KPIs", "Ad-hoc analysis"]'::jsonb,
    '{"budget": "none", "hiring": "none", "analysis": "prepare-reports"}'::jsonb,
    '["Excel/Spreadsheets", "Financial Modeling", "Data Analysis", "Business Intelligence"]'::jsonb,
    4
FROM departments d WHERE d.name = 'Finance' AND d.is_active = true
ON CONFLICT DO NOTHING;

-- ============================================
-- OPERATIONS DEPARTMENT ROLES
-- ============================================

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'VP of Operations',
    'Executive oversight of all operational functions',
    'executive',
    '["Strategic operations planning", "Process optimization", "Vendor management", "Quality assurance", "Operational efficiency"]'::jsonb,
    '{"budget": "operations", "hiring": "operations-team", "vendors": "final-approval"}'::jsonb,
    '["Operations Strategy", "Process Engineering", "Vendor Management", "Quality Management"]'::jsonb,
    1
FROM departments d WHERE d.name = 'Operations' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Operations Director',
    'Directs operational teams and processes',
    'director',
    '["Manage operations teams", "Implement process improvements", "Monitor SLAs", "Resource allocation", "Cross-team coordination"]'::jsonb,
    '{"budget": "departmental", "hiring": "operations-staff", "sla": "manage"}'::jsonb,
    '["Team Leadership", "SLA Management", "Process Improvement", "Resource Planning"]'::jsonb,
    2
FROM departments d WHERE d.name = 'Operations' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Operations Manager',
    'Manages day-to-day operational activities',
    'manager',
    '["Daily operations oversight", "Team scheduling", "Issue resolution", "Performance tracking", "Process documentation"]'::jsonb,
    '{"budget": "operational", "hiring": "recommend", "scheduling": "approve"}'::jsonb,
    '["Operations Management", "Problem Solving", "Team Coordination", "Documentation"]'::jsonb,
    3
FROM departments d WHERE d.name = 'Operations' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Operations Specialist',
    'Executes operational tasks and processes',
    'individual',
    '["Execute operational procedures", "Monitor system health", "Handle escalations", "Maintain documentation", "Support team members"]'::jsonb,
    '{"budget": "none", "hiring": "none", "tasks": "execute"}'::jsonb,
    '["Process Execution", "Attention to Detail", "Communication", "Technical Skills"]'::jsonb,
    4
FROM departments d WHERE d.name = 'Operations' AND d.is_active = true
ON CONFLICT DO NOTHING;

-- ============================================
-- SALES DEPARTMENT ROLES
-- ============================================

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Chief Revenue Officer',
    'Leads all revenue-generating activities',
    'executive',
    '["Revenue strategy", "Sales team leadership", "Partnership development", "Revenue forecasting", "Go-to-market strategy"]'::jsonb,
    '{"budget": "sales", "hiring": "sales-team", "deals": "final-approval", "pricing": "strategic"}'::jsonb,
    '["Revenue Strategy", "Enterprise Sales", "Partnership Development", "AI/SaaS Sales"]'::jsonb,
    1
FROM departments d WHERE d.name = 'Sales' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Sales Director',
    'Directs sales team and regional strategy',
    'director',
    '["Manage sales team", "Territory planning", "Pipeline management", "Sales training", "Partner relationships"]'::jsonb,
    '{"budget": "sales-ops", "hiring": "sales-reps", "deals": "approve-under-threshold", "discounts": "up-to-20%"}'::jsonb,
    '["Sales Leadership", "Pipeline Management", "Coaching", "AI Solution Selling"]'::jsonb,
    2
FROM departments d WHERE d.name = 'Sales' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Sales Manager',
    'Manages sales representatives and deals',
    'manager',
    '["Coach sales reps", "Deal support", "Forecast accuracy", "CRM management", "Customer meetings"]'::jsonb,
    '{"budget": "travel", "hiring": "recommend", "deals": "support", "discounts": "up-to-10%"}'::jsonb,
    '["Sales Coaching", "Deal Management", "CRM Proficiency", "Presentation Skills"]'::jsonb,
    3
FROM departments d WHERE d.name = 'Sales' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Account Executive',
    'Drives new business and manages accounts',
    'individual',
    '["Prospect and qualify leads", "Conduct demos", "Manage sales cycle", "Close deals", "Account management"]'::jsonb,
    '{"budget": "none", "hiring": "none", "deals": "propose", "discounts": "request"}'::jsonb,
    '["Prospecting", "Demo Skills", "Negotiation", "AI Product Knowledge"]'::jsonb,
    4
FROM departments d WHERE d.name = 'Sales' AND d.is_active = true
ON CONFLICT DO NOTHING;

-- ============================================
-- MARKETING DEPARTMENT ROLES
-- ============================================

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Chief Marketing Officer',
    'Leads brand strategy and marketing operations',
    'executive',
    '["Brand strategy", "Marketing campaigns", "Demand generation", "Market positioning", "PR and communications"]'::jsonb,
    '{"budget": "marketing", "hiring": "marketing-team", "brand": "final-approval", "campaigns": "strategic"}'::jsonb,
    '["Brand Strategy", "Digital Marketing", "AI Thought Leadership", "Market Analysis"]'::jsonb,
    1
FROM departments d WHERE d.name = 'Marketing' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Marketing Director',
    'Directs marketing programs and team',
    'director',
    '["Marketing program management", "Team leadership", "Budget allocation", "Agency coordination", "Performance analysis"]'::jsonb,
    '{"budget": "program", "hiring": "marketing-staff", "campaigns": "approve", "vendors": "select"}'::jsonb,
    '["Marketing Management", "Team Leadership", "Analytics", "Content Strategy"]'::jsonb,
    2
FROM departments d WHERE d.name = 'Marketing' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Content Marketing Manager',
    'Manages content strategy and production',
    'manager',
    '["Content calendar management", "Blog and resource creation", "SEO optimization", "Writer coordination", "Content performance"]'::jsonb,
    '{"budget": "content", "hiring": "recommend", "content": "publish", "freelancers": "manage"}'::jsonb,
    '["Content Strategy", "SEO", "Writing/Editing", "AI Content Tools"]'::jsonb,
    3
FROM departments d WHERE d.name = 'Marketing' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Digital Marketing Specialist',
    'Executes digital marketing campaigns',
    'individual',
    '["Run paid campaigns", "Social media management", "Email marketing", "Analytics reporting", "A/B testing"]'::jsonb,
    '{"budget": "none", "hiring": "none", "campaigns": "execute", "content": "create"}'::jsonb,
    '["Paid Media", "Social Media", "Email Marketing", "Google Analytics"]'::jsonb,
    4
FROM departments d WHERE d.name = 'Marketing' AND d.is_active = true
ON CONFLICT DO NOTHING;

-- ============================================
-- PRODUCTION DEPARTMENT ROLES
-- ============================================

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'VP of Engineering',
    'Leads product development and engineering',
    'executive',
    '["Technical vision", "Engineering team leadership", "Platform architecture", "Technical roadmap", "Build vs buy decisions"]'::jsonb,
    '{"budget": "engineering", "hiring": "engineering-team", "architecture": "final-approval", "technology": "strategic"}'::jsonb,
    '["Engineering Leadership", "AI/ML Systems", "Cloud Architecture", "Team Building"]'::jsonb,
    1
FROM departments d WHERE d.name = 'Production' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Engineering Director',
    'Directs engineering teams and delivery',
    'director',
    '["Team management", "Sprint planning", "Code review oversight", "Technical decisions", "Cross-team coordination"]'::jsonb,
    '{"budget": "engineering-ops", "hiring": "engineers", "technical": "approve", "releases": "approve"}'::jsonb,
    '["Technical Leadership", "Agile/Scrum", "Code Quality", "AI Development"]'::jsonb,
    2
FROM departments d WHERE d.name = 'Production' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Engineering Manager',
    'Manages engineering squad and delivery',
    'manager',
    '["Squad leadership", "Sprint execution", "1:1 coaching", "Technical mentoring", "Delivery tracking"]'::jsonb,
    '{"budget": "tools", "hiring": "recommend", "technical": "squad-level", "releases": "squad"}'::jsonb,
    '["Team Management", "Technical Skills", "Agile Practices", "Mentoring"]'::jsonb,
    3
FROM departments d WHERE d.name = 'Production' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Senior AI Engineer',
    'Develops AI/ML features and models',
    'individual',
    '["Develop AI features", "Model training and tuning", "Code reviews", "Technical documentation", "Mentoring juniors"]'::jsonb,
    '{"budget": "none", "hiring": "none", "technical": "implement", "code": "merge"}'::jsonb,
    '["Python", "Machine Learning", "Cloud Services", "API Development"]'::jsonb,
    4
FROM departments d WHERE d.name = 'Production' AND d.is_active = true
ON CONFLICT DO NOTHING;

-- ============================================
-- SERVICE DEPARTMENT ROLES
-- ============================================

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'VP of Customer Success',
    'Leads customer success and support strategy',
    'executive',
    '["Customer success strategy", "Retention and expansion", "Support operations", "Customer advocacy", "NPS and satisfaction"]'::jsonb,
    '{"budget": "customer-success", "hiring": "cs-team", "escalations": "final", "renewals": "strategic"}'::jsonb,
    '["Customer Success Strategy", "SaaS Retention", "Team Leadership", "AI Product Expertise"]'::jsonb,
    1
FROM departments d WHERE d.name = 'Service' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Customer Success Director',
    'Directs customer success teams',
    'director',
    '["Team management", "Enterprise accounts", "Success playbooks", "Churn prevention", "Upsell strategy"]'::jsonb,
    '{"budget": "cs-ops", "hiring": "csm-team", "escalations": "handle", "credits": "approve"}'::jsonb,
    '["Customer Management", "Team Leadership", "Account Strategy", "AI Implementation"]'::jsonb,
    2
FROM departments d WHERE d.name = 'Service' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Customer Success Manager',
    'Manages customer relationships and outcomes',
    'manager',
    '["Account management", "Onboarding coordination", "Health monitoring", "Renewal management", "Expansion opportunities"]'::jsonb,
    '{"budget": "customer-events", "hiring": "recommend", "escalations": "first-line", "credits": "request"}'::jsonb,
    '["Relationship Management", "Product Knowledge", "Communication", "Problem Solving"]'::jsonb,
    3
FROM departments d WHERE d.name = 'Service' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Support Specialist',
    'Provides customer support and troubleshooting',
    'individual',
    '["Respond to tickets", "Troubleshoot issues", "Document solutions", "Escalate when needed", "Customer communication"]'::jsonb,
    '{"budget": "none", "hiring": "none", "tickets": "resolve", "escalations": "initiate"}'::jsonb,
    '["Technical Support", "Communication", "Problem Solving", "AI Platform Knowledge"]'::jsonb,
    4
FROM departments d WHERE d.name = 'Service' AND d.is_active = true
ON CONFLICT DO NOTHING;

-- ============================================
-- STAKEHOLDER RELATIONS DEPARTMENT ROLES
-- ============================================

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'VP of Partnerships',
    'Leads strategic partnerships and alliances',
    'executive',
    '["Partnership strategy", "Alliance development", "Channel programs", "Integration partnerships", "Ecosystem growth"]'::jsonb,
    '{"budget": "partnerships", "hiring": "partner-team", "partnerships": "final-approval", "contracts": "negotiate"}'::jsonb,
    '["Partnership Development", "Business Development", "Negotiation", "AI Ecosystem"]'::jsonb,
    1
FROM departments d WHERE d.name = 'Stakeholder Relations' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Partnership Director',
    'Directs partner programs and relationships',
    'director',
    '["Partner program management", "Relationship building", "Co-marketing coordination", "Partner enablement", "Performance tracking"]'::jsonb,
    '{"budget": "partner-ops", "hiring": "partner-staff", "partnerships": "develop", "programs": "approve"}'::jsonb,
    '["Partner Management", "Program Development", "Relationship Building", "Marketing Coordination"]'::jsonb,
    2
FROM departments d WHERE d.name = 'Stakeholder Relations' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Partner Manager',
    'Manages partner relationships and success',
    'manager',
    '["Partner onboarding", "Relationship maintenance", "Co-selling support", "Partner reporting", "Issue resolution"]'::jsonb,
    '{"budget": "partner-events", "hiring": "recommend", "partnerships": "support", "co-marketing": "coordinate"}'::jsonb,
    '["Account Management", "Partner Support", "Communication", "Project Coordination"]'::jsonb,
    3
FROM departments d WHERE d.name = 'Stakeholder Relations' AND d.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO roles (user_id, department_id, title, description, level, responsibilities, authority, required_skills, sort_order)
SELECT
    NULL,
    d.id,
    'Partner Coordinator',
    'Supports partner operations and communications',
    'individual',
    '["Partner communications", "Resource management", "Event coordination", "Documentation", "Reporting support"]'::jsonb,
    '{"budget": "none", "hiring": "none", "communications": "execute", "events": "coordinate"}'::jsonb,
    '["Communication", "Organization", "Event Planning", "Administrative Skills"]'::jsonb,
    4
FROM departments d WHERE d.name = 'Stakeholder Relations' AND d.is_active = true
ON CONFLICT DO NOTHING;
