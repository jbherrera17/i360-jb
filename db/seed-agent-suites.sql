-- Seed Agent Suite Assignments
-- Categorizes existing agents into the Three Pillars framework

-- Align 120 Suite (Foundation/Alignment)
-- Agents focused on values, governance, and organizational alignment
UPDATE agents SET suite = 'align' WHERE id = 'a0000000-0000-0000-0000-000000000101'; -- Integrity Auditor
UPDATE agents SET suite = 'align' WHERE id = 'a0000000-0000-0000-0000-000000000102'; -- Risk Sentinel
UPDATE agents SET suite = 'align' WHERE id = 'a0000000-0000-0000-0000-000000000103'; -- Counterfactual Analyst

-- Strategy 120 Suite (Planning)
-- Agents focused on strategic planning, research, and decision-making
UPDATE agents SET suite = 'strategy' WHERE id = 'a1000001-0001-0001-0001-000000000003'; -- Strategy Advisor
UPDATE agents SET suite = 'strategy' WHERE id = 'a1000001-0001-0001-0001-000000000006'; -- Research Analyst
UPDATE agents SET suite = 'strategy' WHERE id = 'a1000001-0001-0001-0001-000000000004'; -- Daily Briefer

-- Execute 120 Suite (Action/Delivery)
-- Agents focused on execution, content creation, and communication
UPDATE agents SET suite = 'execute' WHERE id = 'a1000001-0001-0001-0001-000000000001'; -- Content Writer
UPDATE agents SET suite = 'execute' WHERE id = 'a1000001-0001-0001-0001-000000000002'; -- Sales Assistant
UPDATE agents SET suite = 'execute' WHERE id = 'a1000001-0001-0001-0001-000000000005'; -- Email Composer

-- Verify the updates
SELECT name, category, suite FROM agents ORDER BY suite, name;
