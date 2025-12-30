-- ============================================
-- Insight 360 - Seed: Parthenon OKRs
-- Version: 1.0
-- Date: December 2024
-- Description: Sample OKRs for all scopes (company, department, team, individual)
--              Designed for an AIaaS (AI as a Service) business
-- ============================================

-- Note: This script assumes departments have already been seeded
-- Period: Q1 2025

-- ============================================
-- COMPANY-LEVEL OKRs
-- ============================================

INSERT INTO okrs (user_id, title, description, scope, period, status, progress, key_results, start_date, end_date)
VALUES
(NULL,
 'Achieve $5M ARR and establish market leadership in AI automation',
 'Drive sustainable growth while building a strong market position in the AI-as-a-Service space',
 'company',
 'Q1 2025',
 'active',
 25,
 '[
   {"title": "Reach $5M ARR", "current": 3200000, "target": 5000000, "unit": "dollars"},
   {"title": "Acquire 50 new enterprise customers", "current": 12, "target": 50, "unit": "customers"},
   {"title": "Achieve 95% customer retention rate", "current": 92, "target": 95, "unit": "percent"},
   {"title": "Launch in 2 new market verticals", "current": 0, "target": 2, "unit": "verticals"}
 ]'::jsonb,
 '2025-01-01',
 '2025-03-31'
),
(NULL,
 'Build world-class AI platform with industry-leading performance',
 'Deliver a best-in-class AI platform that outperforms competitors on key metrics',
 'company',
 'Q1 2025',
 'active',
 30,
 '[
   {"title": "Achieve 99.9% platform uptime", "current": 99.5, "target": 99.9, "unit": "percent"},
   {"title": "Reduce average response latency to <200ms", "current": 350, "target": 200, "unit": "milliseconds"},
   {"title": "Launch 3 new AI model capabilities", "current": 1, "target": 3, "unit": "capabilities"},
   {"title": "Achieve SOC 2 Type II certification", "current": 0, "target": 1, "unit": "certification"}
 ]'::jsonb,
 '2025-01-01',
 '2025-03-31'
),
(NULL,
 'Create an exceptional team culture and scale operations',
 'Build a high-performing team while maintaining strong culture as we scale',
 'company',
 'Q1 2025',
 'active',
 20,
 '[
   {"title": "Grow team to 75 employees", "current": 45, "target": 75, "unit": "employees"},
   {"title": "Achieve eNPS score of 70+", "current": 55, "target": 70, "unit": "score"},
   {"title": "Complete leadership development program", "current": 0, "target": 100, "unit": "percent"},
   {"title": "Reduce voluntary turnover to <10%", "current": 15, "target": 10, "unit": "percent"}
 ]'::jsonb,
 '2025-01-01',
 '2025-03-31'
);

-- ============================================
-- FINANCE DEPARTMENT OKRs
-- ============================================

INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'Optimize financial operations and improve unit economics',
    'Strengthen financial foundations and improve profitability metrics',
    'department',
    d.id,
    'Q1 2025',
    'active',
    35,
    '[
      {"title": "Reduce CAC to $15K", "current": 22000, "target": 15000, "unit": "dollars"},
      {"title": "Improve gross margin to 75%", "current": 68, "target": 75, "unit": "percent"},
      {"title": "Reduce month-end close to 5 days", "current": 8, "target": 5, "unit": "days"},
      {"title": "Implement automated invoicing (80% automation)", "current": 45, "target": 80, "unit": "percent"}
    ]'::jsonb,
    '2025-01-01',
    '2025-03-31'
FROM departments d WHERE d.name = 'Finance' AND d.is_active = true;

-- Finance Team OKR
INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'Implement real-time financial dashboards and reporting',
    'Enable data-driven decisions with automated financial reporting',
    'team',
    d.id,
    'Q1 2025',
    'active',
    40,
    '[
      {"title": "Deploy executive dashboard", "current": 60, "target": 100, "unit": "percent"},
      {"title": "Automate 10 key financial reports", "current": 4, "target": 10, "unit": "reports"},
      {"title": "Reduce report generation time by 50%", "current": 30, "target": 50, "unit": "percent"}
    ]'::jsonb,
    '2025-01-01',
    '2025-03-31'
FROM departments d WHERE d.name = 'Finance' AND d.is_active = true;

-- ============================================
-- SALES DEPARTMENT OKRs
-- ============================================

INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'Accelerate enterprise sales and expand market presence',
    'Drive significant revenue growth through enterprise deals and market expansion',
    'department',
    d.id,
    'Q1 2025',
    'active',
    28,
    '[
      {"title": "Close $2M in new ARR", "current": 560000, "target": 2000000, "unit": "dollars"},
      {"title": "Build pipeline of $8M qualified opportunities", "current": 2800000, "target": 8000000, "unit": "dollars"},
      {"title": "Increase average deal size to $80K", "current": 52000, "target": 80000, "unit": "dollars"},
      {"title": "Reduce sales cycle to 45 days", "current": 68, "target": 45, "unit": "days"}
    ]'::jsonb,
    '2025-01-01',
    '2025-03-31'
FROM departments d WHERE d.name = 'Sales' AND d.is_active = true;

-- Sales Team OKR
INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'Establish repeatable enterprise sales playbook',
    'Document and implement standardized enterprise sales methodology',
    'team',
    d.id,
    'Q1 2025',
    'active',
    45,
    '[
      {"title": "Complete enterprise playbook documentation", "current": 70, "target": 100, "unit": "percent"},
      {"title": "Train all AEs on new methodology", "current": 60, "target": 100, "unit": "percent"},
      {"title": "Achieve 30% demo-to-close conversion", "current": 22, "target": 30, "unit": "percent"}
    ]'::jsonb,
    '2025-01-01',
    '2025-03-31'
FROM departments d WHERE d.name = 'Sales' AND d.is_active = true;

-- Individual Sales OKR
INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'Account Executive Q1 Performance Target',
    'Individual AE quota and activity targets for Q1',
    'individual',
    d.id,
    'Q1 2025',
    'active',
    30,
    '[
      {"title": "Close $250K in new business", "current": 75000, "target": 250000, "unit": "dollars"},
      {"title": "Conduct 40 discovery calls", "current": 12, "target": 40, "unit": "calls"},
      {"title": "Deliver 20 product demos", "current": 6, "target": 20, "unit": "demos"},
      {"title": "Maintain CRM hygiene score of 95%", "current": 88, "target": 95, "unit": "percent"}
    ]'::jsonb,
    '2025-01-01',
    '2025-03-31'
FROM departments d WHERE d.name = 'Sales' AND d.is_active = true;

-- ============================================
-- MARKETING DEPARTMENT OKRs
-- ============================================

INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'Establish thought leadership and drive qualified pipeline',
    'Build brand awareness and generate high-quality leads through content and campaigns',
    'department',
    d.id,
    'Q1 2025',
    'active',
    32,
    '[
      {"title": "Generate 500 MQLs", "current": 160, "target": 500, "unit": "leads"},
      {"title": "Achieve 40% MQL-to-SQL conversion", "current": 28, "target": 40, "unit": "percent"},
      {"title": "Grow organic traffic by 100%", "current": 45, "target": 100, "unit": "percent"},
      {"title": "Secure 10 media mentions/features", "current": 3, "target": 10, "unit": "mentions"}
    ]'::jsonb,
    '2025-01-01',
    '2025-03-31'
FROM departments d WHERE d.name = 'Marketing' AND d.is_active = true;

-- Marketing Team OKR
INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'Launch AI thought leadership content program',
    'Establish company as a leading voice in AI automation space',
    'team',
    d.id,
    'Q1 2025',
    'active',
    50,
    '[
      {"title": "Publish 12 long-form articles", "current": 6, "target": 12, "unit": "articles"},
      {"title": "Launch weekly AI newsletter (1000 subscribers)", "current": 450, "target": 1000, "unit": "subscribers"},
      {"title": "Host 3 webinars with 100+ attendees each", "current": 1, "target": 3, "unit": "webinars"},
      {"title": "Create 5 case studies", "current": 2, "target": 5, "unit": "case studies"}
    ]'::jsonb,
    '2025-01-01',
    '2025-03-31'
FROM departments d WHERE d.name = 'Marketing' AND d.is_active = true;

-- ============================================
-- PRODUCTION (ENGINEERING) DEPARTMENT OKRs
-- ============================================

INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'Deliver next-generation AI platform capabilities',
    'Build and ship major platform enhancements that differentiate our offering',
    'department',
    d.id,
    'Q1 2025',
    'active',
    25,
    '[
      {"title": "Launch multi-model orchestration feature", "current": 40, "target": 100, "unit": "percent"},
      {"title": "Implement custom model fine-tuning", "current": 20, "target": 100, "unit": "percent"},
      {"title": "Reduce API latency by 40%", "current": 15, "target": 40, "unit": "percent"},
      {"title": "Achieve 80% test coverage", "current": 62, "target": 80, "unit": "percent"}
    ]'::jsonb,
    '2025-01-01',
    '2025-03-31'
FROM departments d WHERE d.name = 'Production' AND d.is_active = true;

-- Engineering Team OKR
INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'Improve developer experience and platform reliability',
    'Enhance internal tooling and ensure platform stability',
    'team',
    d.id,
    'Q1 2025',
    'active',
    35,
    '[
      {"title": "Implement CI/CD improvements (deploy time <10min)", "current": 18, "target": 10, "unit": "minutes"},
      {"title": "Reduce production incidents by 50%", "current": 30, "target": 50, "unit": "percent"},
      {"title": "Complete API documentation overhaul", "current": 55, "target": 100, "unit": "percent"},
      {"title": "Establish on-call runbooks for all services", "current": 40, "target": 100, "unit": "percent"}
    ]'::jsonb,
    '2025-01-01',
    '2025-03-31'
FROM departments d WHERE d.name = 'Production' AND d.is_active = true;

-- Individual Engineering OKR
INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'Senior Engineer Technical Contribution Goals',
    'Individual contributor targets for senior engineering role',
    'individual',
    d.id,
    'Q1 2025',
    'active',
    40,
    '[
      {"title": "Ship 3 major features", "current": 1, "target": 3, "unit": "features"},
      {"title": "Mentor 2 junior engineers", "current": 1, "target": 2, "unit": "mentees"},
      {"title": "Complete 20 code reviews per sprint", "current": 15, "target": 20, "unit": "reviews"},
      {"title": "Contribute to technical blog (2 posts)", "current": 0, "target": 2, "unit": "posts"}
    ]'::jsonb,
    '2025-01-01',
    '2025-03-31'
FROM departments d WHERE d.name = 'Production' AND d.is_active = true;

-- ============================================
-- SERVICE (CUSTOMER SUCCESS) DEPARTMENT OKRs
-- ============================================

INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'Maximize customer value and drive net revenue retention',
    'Ensure customer success, reduce churn, and expand existing accounts',
    'department',
    d.id,
    'Q1 2025',
    'active',
    38,
    '[
      {"title": "Achieve 120% net revenue retention", "current": 108, "target": 120, "unit": "percent"},
      {"title": "Reduce churn to <5% quarterly", "current": 7, "target": 5, "unit": "percent"},
      {"title": "Achieve NPS score of 60+", "current": 48, "target": 60, "unit": "score"},
      {"title": "Drive $500K in expansion revenue", "current": 190000, "target": 500000, "unit": "dollars"}
    ]'::jsonb,
    '2025-01-01',
    '2025-03-31'
FROM departments d WHERE d.name = 'Service' AND d.is_active = true;

-- Customer Success Team OKR
INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'Implement proactive customer health monitoring',
    'Build systems to identify and address at-risk customers before churn',
    'team',
    d.id,
    'Q1 2025',
    'active',
    45,
    '[
      {"title": "Deploy customer health scoring system", "current": 70, "target": 100, "unit": "percent"},
      {"title": "Establish QBR program for top 50 accounts", "current": 20, "target": 50, "unit": "accounts"},
      {"title": "Reduce time-to-value to <30 days", "current": 45, "target": 30, "unit": "days"},
      {"title": "Achieve 90% adoption of key features", "current": 65, "target": 90, "unit": "percent"}
    ]'::jsonb,
    '2025-01-01',
    '2025-03-31'
FROM departments d WHERE d.name = 'Service' AND d.is_active = true;

-- ============================================
-- OPERATIONS DEPARTMENT OKRs
-- ============================================

INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'Scale operations to support 2x growth',
    'Build operational infrastructure to support rapid company growth',
    'department',
    d.id,
    'Q1 2025',
    'active',
    30,
    '[
      {"title": "Reduce operational costs by 15%", "current": 8, "target": 15, "unit": "percent"},
      {"title": "Automate 10 manual processes", "current": 3, "target": 10, "unit": "processes"},
      {"title": "Achieve 99% SLA compliance", "current": 94, "target": 99, "unit": "percent"},
      {"title": "Implement vendor management system", "current": 40, "target": 100, "unit": "percent"}
    ]'::jsonb,
    '2025-01-01',
    '2025-03-31'
FROM departments d WHERE d.name = 'Operations' AND d.is_active = true;

-- ============================================
-- STAKEHOLDER RELATIONS DEPARTMENT OKRs
-- ============================================

INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'Expand partner ecosystem and channel revenue',
    'Build strategic partnerships that drive revenue and market reach',
    'department',
    d.id,
    'Q1 2025',
    'active',
    22,
    '[
      {"title": "Sign 5 strategic technology partners", "current": 1, "target": 5, "unit": "partners"},
      {"title": "Generate $300K in partner-sourced revenue", "current": 65000, "target": 300000, "unit": "dollars"},
      {"title": "Launch reseller program with 10 partners", "current": 2, "target": 10, "unit": "resellers"},
      {"title": "Complete 3 product integrations", "current": 1, "target": 3, "unit": "integrations"}
    ]'::jsonb,
    '2025-01-01',
    '2025-03-31'
FROM departments d WHERE d.name = 'Stakeholder Relations' AND d.is_active = true;
