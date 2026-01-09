-- ============================================
-- Insight 360 - Seed: HR & Executive OKRs
-- Version: 3.0
-- Date: January 2026
-- Description: Sample OKRs for HR and Executive departments
--              Based on industry best practices
-- ============================================

-- Note: Run after phase3.1-fix-departments-rls.sql
-- Period: Q1 2026

-- ============================================
-- HR DEPARTMENT OKRs
-- ============================================

-- Department-level OKR: Talent Lifecycle
INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'Build high-performing workforce and optimize talent lifecycle',
    'Attract, develop, and retain top talent while creating exceptional employee experience',
    'department',
    d.id,
    'Q1 2026',
    'active',
    30,
    '[
      {"title": "Reduce time-to-hire to 30 days", "current": 42, "target": 30, "unit": "days"},
      {"title": "Achieve 90% employee retention rate", "current": 85, "target": 90, "unit": "percent"},
      {"title": "Increase eNPS score to 50+", "current": 38, "target": 50, "unit": "score"},
      {"title": "Complete 80% of PDPs (Personal Development Plans)", "current": 55, "target": 80, "unit": "percent"}
    ]'::jsonb,
    '2026-01-01',
    '2026-03-31'
FROM departments d WHERE d.name = 'HR' AND d.is_active = true;

-- Team-level OKR: Employee Development
INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'Enhance employee development and career growth programs',
    'Create structured career pathways and upskilling opportunities',
    'team',
    d.id,
    'Q1 2026',
    'active',
    35,
    '[
      {"title": "Launch leadership development program", "current": 40, "target": 100, "unit": "percent"},
      {"title": "Achieve 75% participation in development programs", "current": 52, "target": 75, "unit": "percent"},
      {"title": "Create career roadmaps for all roles", "current": 30, "target": 100, "unit": "percent"},
      {"title": "Increase internal promotion rate to 60%", "current": 45, "target": 60, "unit": "percent"}
    ]'::jsonb,
    '2026-01-01',
    '2026-03-31'
FROM departments d WHERE d.name = 'HR' AND d.is_active = true;

-- Team-level OKR: Culture & Engagement
INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'Foster inclusive culture and maximize employee engagement',
    'Build workplace culture that attracts and retains top talent',
    'team',
    d.id,
    'Q1 2026',
    'active',
    40,
    '[
      {"title": "Implement monthly pulse surveys with 80% response", "current": 65, "target": 80, "unit": "percent"},
      {"title": "Launch employee recognition program", "current": 70, "target": 100, "unit": "percent"},
      {"title": "Increase diversity hiring to 40%", "current": 32, "target": 40, "unit": "percent"},
      {"title": "Achieve 85% satisfaction in culture survey", "current": 72, "target": 85, "unit": "percent"}
    ]'::jsonb,
    '2026-01-01',
    '2026-03-31'
FROM departments d WHERE d.name = 'HR' AND d.is_active = true;

-- Individual OKR: HR Specialist
INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'HR Specialist Q1 Performance Target',
    'Individual HR specialist goals for recruitment and onboarding',
    'individual',
    d.id,
    'Q1 2026',
    'active',
    25,
    '[
      {"title": "Fill 15 open positions", "current": 4, "target": 15, "unit": "positions"},
      {"title": "Achieve 90% new hire satisfaction score", "current": 82, "target": 90, "unit": "percent"},
      {"title": "Complete 100% of compliance training", "current": 60, "target": 100, "unit": "percent"},
      {"title": "Reduce onboarding time to 5 days", "current": 8, "target": 5, "unit": "days"}
    ]'::jsonb,
    '2026-01-01',
    '2026-03-31'
FROM departments d WHERE d.name = 'HR' AND d.is_active = true;

-- ============================================
-- EXECUTIVE DEPARTMENT OKRs
-- ============================================

-- Department-level OKR: Strategic Growth
INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'Drive strategic growth and organizational excellence',
    'Lead company to sustainable growth while fostering high-performance culture',
    'department',
    d.id,
    'Q1 2026',
    'active',
    25,
    '[
      {"title": "Increase annual revenue by 20%", "current": 8, "target": 20, "unit": "percent"},
      {"title": "Achieve 90% employee retention rate", "current": 85, "target": 90, "unit": "percent"},
      {"title": "Fill 80% senior positions internally", "current": 60, "target": 80, "unit": "percent"},
      {"title": "Maintain 95% accuracy in financial forecasting", "current": 88, "target": 95, "unit": "percent"}
    ]'::jsonb,
    '2026-01-01',
    '2026-03-31'
FROM departments d WHERE d.name = 'Executive' AND d.is_active = true;

-- Team-level OKR: Market Position
INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'Strengthen market position and competitive advantage',
    'Establish market leadership through strategic initiatives',
    'team',
    d.id,
    'Q1 2026',
    'active',
    30,
    '[
      {"title": "Increase market share by 5%", "current": 2, "target": 5, "unit": "percent"},
      {"title": "Launch 2 strategic partnerships", "current": 0, "target": 2, "unit": "partnerships"},
      {"title": "Achieve NPS score of 70+", "current": 58, "target": 70, "unit": "score"},
      {"title": "Complete competitive analysis for 3 markets", "current": 1, "target": 3, "unit": "markets"}
    ]'::jsonb,
    '2026-01-01',
    '2026-03-31'
FROM departments d WHERE d.name = 'Executive' AND d.is_active = true;

-- Team-level OKR: Organizational Health
INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'Build resilient organization with strong governance',
    'Ensure operational excellence and risk management',
    'team',
    d.id,
    'Q1 2026',
    'active',
    35,
    '[
      {"title": "Achieve SOC 2 Type II compliance", "current": 60, "target": 100, "unit": "percent"},
      {"title": "Implement board-approved risk framework", "current": 40, "target": 100, "unit": "percent"},
      {"title": "Conduct quarterly investor meetings with 95% satisfaction", "current": 88, "target": 95, "unit": "percent"},
      {"title": "Reduce operational costs by 10%", "current": 4, "target": 10, "unit": "percent"}
    ]'::jsonb,
    '2026-01-01',
    '2026-03-31'
FROM departments d WHERE d.name = 'Executive' AND d.is_active = true;

-- Individual OKR: CEO
INSERT INTO okrs (user_id, title, description, scope, department_id, period, status, progress, key_results, start_date, end_date)
SELECT
    NULL,
    'CEO Q1 Leadership Objectives',
    'CEO personal objectives for company leadership and stakeholder management',
    'individual',
    d.id,
    'Q1 2026',
    'active',
    20,
    '[
      {"title": "Complete strategic planning sessions with all department heads", "current": 2, "target": 8, "unit": "sessions"},
      {"title": "Secure Series B funding commitment", "current": 30, "target": 100, "unit": "percent"},
      {"title": "Deliver 4 keynote presentations at industry events", "current": 1, "target": 4, "unit": "presentations"},
      {"title": "Achieve board approval for 2026-2028 strategic plan", "current": 0, "target": 1, "unit": "approval"}
    ]'::jsonb,
    '2026-01-01',
    '2026-03-31'
FROM departments d WHERE d.name = 'Executive' AND d.is_active = true;

-- ============================================
-- VERIFY INSERTS
-- ============================================

-- Show all OKRs by department
SELECT
    d.name as department,
    o.title,
    o.scope,
    o.status,
    o.progress
FROM okrs o
JOIN departments d ON d.id = o.department_id
WHERE d.name IN ('HR', 'Executive')
ORDER BY d.name, o.scope;
