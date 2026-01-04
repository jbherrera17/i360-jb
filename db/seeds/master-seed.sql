-- ============================================
-- Insight 360 - Master Seed Script
-- Run this after all schema migrations
-- Creates all default data for new client deployment
-- ============================================
-- Version: 1.0
-- Date: January 2026
-- ============================================

-- ============================================
-- SECTION 1: DEPARTMENTS
-- 6 standard departments for Execute 120
-- ============================================

DELETE FROM departments WHERE name IN ('Sales', 'Marketing', 'Operations', 'Finance', 'HR', 'Executive');

INSERT INTO departments (name, description, icon, color, sort_order, tagline, metrics, quick_prompts)
VALUES
    ('Sales', 'Sales and revenue generation', 'trending-up', '#f59e0b', 1,
     'Close deals and drive revenue growth',
     '[{"name": "Pipeline Value", "target": "100000", "unit": "$"}, {"name": "Win Rate", "target": "30", "unit": "%"}, {"name": "Deals Closed", "target": "10", "unit": "deals"}]',
     ARRAY['Draft a follow-up email for a prospect', 'Create a competitive analysis', 'Prepare objection handling responses', 'Generate a proposal outline']
    ),
    ('Marketing', 'Marketing and brand management', 'megaphone', '#ec4899', 2,
     'Craft magnetic stories that convert',
     '[{"name": "Leads Generated", "target": "500", "unit": "leads"}, {"name": "Conversion Rate", "target": "5", "unit": "%"}, {"name": "Brand Mentions", "target": "100", "unit": "mentions"}]',
     ARRAY['Create a social media campaign', 'Write a blog post outline', 'Generate email newsletter content', 'Develop a content calendar']
    ),
    ('Operations', 'Business operations and logistics', 'settings', '#6366f1', 3,
     'Optimize processes for peak efficiency',
     '[{"name": "Process Efficiency", "target": "95", "unit": "%"}, {"name": "Cost Reduction", "target": "10", "unit": "%"}, {"name": "SLA Compliance", "target": "99", "unit": "%"}]',
     ARRAY['Document a standard operating procedure', 'Create a process improvement plan', 'Analyze operational bottlenecks', 'Draft vendor evaluation criteria']
    ),
    ('Finance', 'Financial operations and planning', 'banknote', '#10b981', 4,
     'Drive financial clarity and growth',
     '[{"name": "Budget Variance", "target": "5", "unit": "%"}, {"name": "Cash Flow", "target": "positive", "unit": ""}, {"name": "ROI", "target": "15", "unit": "%"}]',
     ARRAY['Create a budget forecast', 'Analyze expense trends', 'Prepare financial summary', 'Draft investment proposal']
    ),
    ('HR', 'Human resources and talent management', 'users', '#8b5cf6', 5,
     'Build and nurture exceptional teams',
     '[{"name": "Time to Hire", "target": "30", "unit": "days"}, {"name": "Retention Rate", "target": "90", "unit": "%"}, {"name": "eNPS", "target": "50", "unit": "score"}]',
     ARRAY['Write a job description', 'Create an onboarding checklist', 'Draft performance review template', 'Develop interview questions']
    ),
    ('Executive', 'Executive leadership and strategy', 'crown', '#7c3aed', 6,
     'Lead with vision and strategic clarity',
     '[{"name": "Strategic Goals", "target": "5", "unit": "goals"}, {"name": "Team Alignment", "target": "90", "unit": "%"}, {"name": "Stakeholder Satisfaction", "target": "85", "unit": "%"}]',
     ARRAY['Prepare board meeting agenda', 'Draft strategic initiative proposal', 'Create stakeholder communication', 'Develop quarterly review presentation']
    );

-- ============================================
-- SECTION 2: CONTEXT ASSET TYPES
-- 18 standard asset types for context injection
-- ============================================

INSERT INTO context_asset_types (name, slug, description, icon, color, schema, is_system, sort_order)
VALUES
    -- Core Types (minimum viable)
    ('Company Description', 'company_description', 'Who you are - mission, history, vision, and what makes you unique', 'building', '#6366f1',
     '{"required": ["content"], "properties": {"content": {"type": "string", "description": "Your company story and identity"}}}',
     true, 1),
    ('Why We Win', 'why_we_win', 'Your competitive differentiation - what sets you apart', 'trophy', '#f59e0b',
     '{"required": ["content"], "properties": {"content": {"type": "string", "description": "Your unique value proposition and competitive advantages"}}}',
     true, 2),
    ('Products & Services', 'products', 'Your offerings - features, benefits, and pricing', 'package', '#10b981',
     '{"required": ["content"], "properties": {"content": {"type": "string", "description": "Detailed product and service information"}}}',
     true, 3),
    ('Pain Points', 'pain_points', 'Problems you solve for customers', 'alert-triangle', '#ef4444',
     '{"required": ["content"], "properties": {"content": {"type": "string", "description": "Customer challenges and how you address them"}}}',
     true, 4),
    ('Voice DNA', 'voice_dna', 'Brand voice, tone, and style guidelines', 'mic', '#8b5cf6',
     '{"required": ["content"], "properties": {"content": {"type": "string", "description": "Writing style, tone of voice, and communication guidelines"}}}',
     true, 5),
    ('Ideal Customer Profile', 'icp', 'Your target customer - demographics, psychographics, behaviors', 'target', '#ec4899',
     '{"required": ["content"], "properties": {"content": {"type": "string", "description": "Detailed ideal customer characteristics"}}}',
     true, 6),
    ('Core Values', 'core_values', 'Guiding principles that drive decisions', 'heart', '#f43f5e',
     '{"required": ["content"], "properties": {"content": {"type": "string", "description": "Company values and how they manifest"}}}',
     true, 7),
    ('Custom Processes', 'custom_processes', 'Internal workflows and methodologies', 'git-branch', '#14b8a6',
     '{"required": ["content"], "properties": {"content": {"type": "string", "description": "Standard operating procedures and processes"}}}',
     true, 8),
    -- Extended Types (recommended for full context)
    ('Competitors', 'competitors', 'Competitive landscape and positioning', 'users', '#64748b',
     '{"required": ["content"], "properties": {"content": {"type": "string", "description": "Competitor analysis and differentiation"}}}',
     true, 9),
    ('Case Studies', 'case_studies', 'Success stories and customer wins', 'award', '#eab308',
     '{"required": ["content"], "properties": {"content": {"type": "string", "description": "Customer success stories with results"}}}',
     true, 10),
    ('FAQs', 'faqs', 'Common questions and objection handling', 'help-circle', '#06b6d4',
     '{"required": ["content"], "properties": {"content": {"type": "string", "description": "Frequently asked questions and answers"}}}',
     true, 11),
    ('Team Bios', 'team_bios', 'Key people and expertise', 'user-check', '#8b5cf6',
     '{"required": ["content"], "properties": {"content": {"type": "string", "description": "Team member profiles and expertise"}}}',
     true, 12),
    ('Industry Context', 'industry_context', 'Market trends, regulations, terminology', 'globe', '#3b82f6',
     '{"required": ["content"], "properties": {"content": {"type": "string", "description": "Industry-specific knowledge and trends"}}}',
     true, 13),
    ('Terminology', 'terminology', 'Domain-specific glossary', 'book-open', '#a855f7',
     '{"required": ["content"], "properties": {"content": {"type": "string", "description": "Key terms and definitions"}}}',
     true, 14),
    ('Templates', 'templates', 'Email, proposal, content templates', 'file-text', '#22c55e',
     '{"required": ["content"], "properties": {"content": {"type": "string", "description": "Reusable content templates"}}}',
     true, 15),
    ('Pricing', 'pricing', 'Pricing structure and packages', 'dollar-sign', '#10b981',
     '{"required": ["content"], "properties": {"content": {"type": "string", "description": "Pricing tiers and structures"}}}',
     true, 16),
    ('Brand Guidelines', 'brand_guidelines', 'Visual identity and usage rules', 'palette', '#f472b6',
     '{"required": ["content"], "properties": {"content": {"type": "string", "description": "Brand standards and visual guidelines"}}}',
     true, 17),
    ('Personas', 'personas', 'Detailed buyer personas', 'user', '#0ea5e9',
     '{"required": ["content"], "properties": {"content": {"type": "string", "description": "Buyer persona profiles"}}}',
     true, 18)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    schema = EXCLUDED.schema,
    sort_order = EXCLUDED.sort_order;

-- ============================================
-- SECTION 3: BALANCED SCORECARD PERSPECTIVES
-- 4 standard BSC perspectives
-- ============================================

INSERT INTO bsc_perspectives (name, description, icon, color, guiding_question, sort_order)
VALUES
    ('Financial', 'Revenue, profitability, and growth metrics', 'dollar-sign', '#10b981',
     'How do we look to our shareholders?', 1),
    ('Customer', 'Customer satisfaction, retention, and acquisition', 'users', '#3b82f6',
     'How do customers see us?', 2),
    ('Internal Process', 'Operational efficiency, quality, and innovation', 'settings', '#8b5cf6',
     'What must we excel at?', 3),
    ('Learning & Growth', 'Skills, culture, and organizational capabilities', 'book-open', '#f59e0b',
     'How can we continue to improve and create value?', 4)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SECTION 4: DEFAULT AGENTS
-- Core agents for Align, Strategy, and Execute
-- ============================================

-- Align 120 Agents
INSERT INTO agents (name, description, type, suite, category, icon, color, is_active, is_public, configuration)
VALUES
    ('Values Excavator', 'Helps articulate and refine your company''s core values through structured dialogue', 'llm', 'align', 'values',
     'heart', '#f43f5e', true, true,
     '{"model": "claude-sonnet-4-20250514", "systemPrompt": "You are the Values Excavator, an AI coach specializing in helping organizations discover and articulate their authentic core values. Guide users through a reflective process to uncover the principles that truly drive their culture and decisions."}'),

    ('Process Miner', 'Discovers and documents existing business processes and workflows', 'llm', 'align', 'operations',
     'git-branch', '#14b8a6', true, true,
     '{"model": "claude-sonnet-4-20250514", "systemPrompt": "You are the Process Miner, an AI specialist in business process discovery. Help users identify, document, and understand their current workflows, decision points, and operational patterns."}'),

    ('Unit Economics Analyst', 'Analyzes business model fundamentals and unit economics', 'llm', 'align', 'finance',
     'calculator', '#10b981', true, true,
     '{"model": "claude-sonnet-4-20250514", "systemPrompt": "You are the Unit Economics Analyst, helping businesses understand their fundamental economics. Analyze customer acquisition costs, lifetime value, margins, and other key metrics."}'),

    ('Brand Strategist', 'Develops and refines brand positioning and messaging', 'llm', 'align', 'marketing',
     'palette', '#ec4899', true, true,
     '{"model": "claude-sonnet-4-20250514", "systemPrompt": "You are the Brand Strategist, an expert in brand positioning, messaging, and identity. Help users articulate their unique value proposition and craft compelling brand narratives."}'),

    ('Stakeholder Mapper', 'Identifies and analyzes key stakeholder relationships', 'llm', 'align', 'executive',
     'network', '#7c3aed', true, true,
     '{"model": "claude-sonnet-4-20250514", "systemPrompt": "You are the Stakeholder Mapper, specializing in stakeholder analysis and relationship management. Help users identify key stakeholders, understand their interests, and develop engagement strategies."}')
ON CONFLICT (name) DO NOTHING;

-- Strategy 120 Agents
INSERT INTO agents (name, description, type, suite, category, icon, color, is_active, is_public, configuration)
VALUES
    ('Strategy Analyst', 'Provides strategic analysis and recommendations', 'llm', 'strategy', 'planning',
     'compass', '#6366f1', true, true,
     '{"model": "claude-sonnet-4-20250514", "systemPrompt": "You are the Strategy Analyst, an expert in strategic planning and analysis. Help users evaluate strategic options, analyze competitive dynamics, and develop actionable strategies."}'),

    ('Risk Sentinel', 'Identifies and assesses strategic and operational risks', 'llm', 'strategy', 'risk',
     'shield', '#ef4444', true, true,
     '{"model": "claude-sonnet-4-20250514", "systemPrompt": "You are the Risk Sentinel, a specialist in risk identification and mitigation. Help users identify potential risks, assess their impact, and develop mitigation strategies."}'),

    ('Scenario Modeler', 'Creates and analyzes strategic scenarios', 'llm', 'strategy', 'planning',
     'layers', '#f59e0b', true, true,
     '{"model": "claude-sonnet-4-20250514", "systemPrompt": "You are the Scenario Modeler, an expert in scenario planning and analysis. Help users develop best-case, worst-case, and likely scenarios for strategic decisions."}'),

    ('Market Intelligence Agent', 'Gathers and analyzes market and competitive intelligence', 'llm', 'strategy', 'research',
     'search', '#3b82f6', true, true,
     '{"model": "claude-sonnet-4-20250514", "systemPrompt": "You are the Market Intelligence Agent, specializing in market research and competitive analysis. Help users understand market trends, competitor strategies, and emerging opportunities."}'),

    ('Decision Support Agent', 'Facilitates structured decision-making processes', 'llm', 'strategy', 'decisions',
     'git-merge', '#8b5cf6', true, true,
     '{"model": "claude-sonnet-4-20250514", "systemPrompt": "You are the Decision Support Agent, an expert in structured decision-making. Help users frame decisions, evaluate options, and document rationale for important choices."}')
ON CONFLICT (name) DO NOTHING;

-- Execute 120 Agents
INSERT INTO agents (name, description, type, suite, category, icon, color, is_active, is_public, configuration)
VALUES
    ('Campaign Strategist', 'Plans and optimizes marketing campaigns', 'llm', 'execute', 'marketing',
     'megaphone', '#ec4899', true, true,
     '{"model": "claude-sonnet-4-20250514", "systemPrompt": "You are the Campaign Strategist, an expert in marketing campaign planning. Help users develop campaign strategies, messaging, targeting, and success metrics."}'),

    ('Proposal Generator', 'Creates compelling sales proposals and pitches', 'llm', 'execute', 'sales',
     'file-text', '#f59e0b', true, true,
     '{"model": "claude-sonnet-4-20250514", "systemPrompt": "You are the Proposal Generator, a specialist in sales proposals and presentations. Help users create compelling proposals that address customer needs and differentiate from competition."}'),

    ('Process Documenter', 'Creates clear process documentation and SOPs', 'llm', 'execute', 'operations',
     'clipboard', '#6366f1', true, true,
     '{"model": "claude-sonnet-4-20250514", "systemPrompt": "You are the Process Documenter, an expert in creating clear, actionable documentation. Help users write standard operating procedures, guides, and process flows."}'),

    ('Executive Communicator', 'Crafts executive-level communications', 'llm', 'execute', 'executive',
     'mail', '#7c3aed', true, true,
     '{"model": "claude-sonnet-4-20250514", "systemPrompt": "You are the Executive Communicator, specializing in high-stakes business communication. Help users craft board presentations, stakeholder updates, and executive messaging."}'),

    ('Financial Analyst', 'Performs financial analysis and modeling', 'llm', 'execute', 'finance',
     'trending-up', '#10b981', true, true,
     '{"model": "claude-sonnet-4-20250514", "systemPrompt": "You are the Financial Analyst, an expert in financial analysis and modeling. Help users analyze financial data, create forecasts, and evaluate investment opportunities."}')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SECTION 5: DEFAULT WORKFLOWS
-- 5 starter workflows for Execute 120
-- ============================================

-- Get department IDs for workflows
DO $$
DECLARE
    marketing_id UUID;
    sales_id UUID;
    operations_id UUID;
    executive_id UUID;
    finance_id UUID;
    workflow_id UUID;
BEGIN
    SELECT id INTO marketing_id FROM departments WHERE name = 'Marketing' LIMIT 1;
    SELECT id INTO sales_id FROM departments WHERE name = 'Sales' LIMIT 1;
    SELECT id INTO operations_id FROM departments WHERE name = 'Operations' LIMIT 1;
    SELECT id INTO executive_id FROM departments WHERE name = 'Executive' LIMIT 1;
    SELECT id INTO finance_id FROM departments WHERE name = 'Finance' LIMIT 1;

    -- Campaign Strategy Builder (Marketing)
    INSERT INTO workflows (department_id, name, description, icon, color, category, tags, estimated_minutes, is_active, is_public, is_system)
    VALUES (marketing_id, 'Campaign Strategy Builder', 'Build a comprehensive marketing campaign strategy from scratch', 'target', '#ec4899', 'marketing', ARRAY['campaign', 'strategy', 'planning'], 30, true, true, true)
    RETURNING id INTO workflow_id;

    INSERT INTO workflow_steps (workflow_id, step_number, name, description, type, configuration)
    VALUES
        (workflow_id, 1, 'Define Campaign Objective', 'Set your campaign goals and success metrics', 'user_input',
         '{"fields": [{"name": "objective", "label": "Campaign Objective", "type": "textarea", "required": true}, {"name": "budget", "label": "Budget Range", "type": "select", "options": ["Under $5K", "$5K-$25K", "$25K-$100K", "Over $100K"]}, {"name": "timeline", "label": "Timeline", "type": "text"}]}'),
        (workflow_id, 2, 'Identify Target Audience', 'Define who you want to reach', 'user_input',
         '{"fields": [{"name": "audience", "label": "Target Audience Description", "type": "textarea", "required": true}, {"name": "channels", "label": "Preferred Channels", "type": "multiselect", "options": ["Email", "Social Media", "Paid Ads", "Content Marketing", "Events"]}]}'),
        (workflow_id, 3, 'Generate Strategy', 'AI creates your campaign strategy', 'agent_chat',
         '{"agentName": "Campaign Strategist", "contextAssets": ["icp", "voice_dna", "products"]}'),
        (workflow_id, 4, 'Review & Refine', 'Review the strategy and request changes', 'review',
         '{"showPreviousOutputs": true}'),
        (workflow_id, 5, 'Final Strategy', 'Your complete campaign strategy', 'output',
         '{"format": "markdown", "downloadable": true}');

    -- Proposal Builder (Sales)
    INSERT INTO workflows (department_id, name, description, icon, color, category, tags, estimated_minutes, is_active, is_public, is_system)
    VALUES (sales_id, 'Proposal Builder', 'Generate a customized sales proposal', 'file-text', '#f59e0b', 'sales', ARRAY['proposal', 'sales', 'pitch'], 25, true, true, true)
    RETURNING id INTO workflow_id;

    INSERT INTO workflow_steps (workflow_id, step_number, name, description, type, configuration)
    VALUES
        (workflow_id, 1, 'Prospect Information', 'Enter details about the prospect', 'user_input',
         '{"fields": [{"name": "company", "label": "Company Name", "type": "text", "required": true}, {"name": "contact", "label": "Primary Contact", "type": "text"}, {"name": "industry", "label": "Industry", "type": "text"}, {"name": "size", "label": "Company Size", "type": "select", "options": ["1-50", "51-200", "201-1000", "1000+"]}]}'),
        (workflow_id, 2, 'Pain Points & Needs', 'Describe their challenges', 'user_input',
         '{"fields": [{"name": "pain_points", "label": "Key Pain Points", "type": "textarea", "required": true}, {"name": "goals", "label": "Their Goals", "type": "textarea"}, {"name": "timeline", "label": "Decision Timeline", "type": "text"}]}'),
        (workflow_id, 3, 'Generate Proposal', 'AI creates your proposal', 'agent_chat',
         '{"agentName": "Proposal Generator", "contextAssets": ["products", "why_we_win", "case_studies"]}'),
        (workflow_id, 4, 'Customize Proposal', 'Add final customizations', 'review',
         '{"showPreviousOutputs": true, "editable": true}');

    -- SOP Creator (Operations)
    INSERT INTO workflows (department_id, name, description, icon, color, category, tags, estimated_minutes, is_active, is_public, is_system)
    VALUES (operations_id, 'SOP Creator', 'Create a standard operating procedure document', 'clipboard', '#6366f1', 'operations', ARRAY['sop', 'documentation', 'process'], 20, true, true, true)
    RETURNING id INTO workflow_id;

    INSERT INTO workflow_steps (workflow_id, step_number, name, description, type, configuration)
    VALUES
        (workflow_id, 1, 'Process Overview', 'Describe the process to document', 'user_input',
         '{"fields": [{"name": "process_name", "label": "Process Name", "type": "text", "required": true}, {"name": "purpose", "label": "Purpose of Process", "type": "textarea", "required": true}, {"name": "owner", "label": "Process Owner", "type": "text"}, {"name": "frequency", "label": "How Often Performed", "type": "select", "options": ["Daily", "Weekly", "Monthly", "As Needed"]}]}'),
        (workflow_id, 2, 'Process Steps', 'Outline the main steps', 'user_input',
         '{"fields": [{"name": "steps", "label": "List the main steps (one per line)", "type": "textarea", "required": true}, {"name": "tools", "label": "Tools/Systems Used", "type": "textarea"}, {"name": "exceptions", "label": "Common Exceptions", "type": "textarea"}]}'),
        (workflow_id, 3, 'Generate SOP', 'AI creates your SOP document', 'agent_chat',
         '{"agentName": "Process Documenter", "contextAssets": ["custom_processes"]}'),
        (workflow_id, 4, 'Finalize SOP', 'Review and finalize the document', 'output',
         '{"format": "markdown", "downloadable": true}');

    -- Board Meeting Prep (Executive)
    INSERT INTO workflows (department_id, name, description, icon, color, category, tags, estimated_minutes, is_active, is_public, is_system)
    VALUES (executive_id, 'Board Meeting Prep', 'Prepare materials for board meetings', 'crown', '#7c3aed', 'executive', ARRAY['board', 'presentation', 'executive'], 45, true, true, true)
    RETURNING id INTO workflow_id;

    INSERT INTO workflow_steps (workflow_id, step_number, name, description, type, configuration)
    VALUES
        (workflow_id, 1, 'Meeting Context', 'Set the meeting parameters', 'user_input',
         '{"fields": [{"name": "meeting_date", "label": "Meeting Date", "type": "text", "required": true}, {"name": "agenda_items", "label": "Key Agenda Items", "type": "textarea", "required": true}, {"name": "concerns", "label": "Known Board Concerns", "type": "textarea"}]}'),
        (workflow_id, 2, 'Performance Data', 'Enter key metrics and updates', 'user_input',
         '{"fields": [{"name": "financials", "label": "Financial Highlights", "type": "textarea"}, {"name": "kpis", "label": "Key Performance Indicators", "type": "textarea"}, {"name": "milestones", "label": "Recent Milestones", "type": "textarea"}]}'),
        (workflow_id, 3, 'Generate Materials', 'AI creates your board materials', 'agent_chat',
         '{"agentName": "Executive Communicator", "contextAssets": ["company_description", "core_values"]}'),
        (workflow_id, 4, 'Anticipate Questions', 'Prepare for likely questions', 'agent_chat',
         '{"agentName": "Strategy Analyst", "prompt": "Based on the board materials, what questions might board members ask?"}'),
        (workflow_id, 5, 'Final Package', 'Complete board package', 'output',
         '{"format": "markdown", "downloadable": true}');

    -- Investment Analysis (Finance)
    INSERT INTO workflows (department_id, name, description, icon, color, category, tags, estimated_minutes, is_active, is_public, is_system)
    VALUES (finance_id, 'Investment Analysis', 'Analyze a potential investment or initiative', 'trending-up', '#10b981', 'finance', ARRAY['investment', 'analysis', 'roi'], 30, true, true, true)
    RETURNING id INTO workflow_id;

    INSERT INTO workflow_steps (workflow_id, step_number, name, description, type, configuration)
    VALUES
        (workflow_id, 1, 'Investment Overview', 'Describe the investment opportunity', 'user_input',
         '{"fields": [{"name": "name", "label": "Investment/Initiative Name", "type": "text", "required": true}, {"name": "description", "label": "Description", "type": "textarea", "required": true}, {"name": "amount", "label": "Investment Amount", "type": "text"}, {"name": "timeframe", "label": "Expected Timeframe", "type": "text"}]}'),
        (workflow_id, 2, 'Expected Returns', 'Define expected outcomes', 'user_input',
         '{"fields": [{"name": "benefits", "label": "Expected Benefits", "type": "textarea", "required": true}, {"name": "revenue_impact", "label": "Revenue Impact", "type": "text"}, {"name": "cost_savings", "label": "Cost Savings", "type": "text"}, {"name": "strategic_value", "label": "Strategic Value", "type": "textarea"}]}'),
        (workflow_id, 3, 'Generate Analysis', 'AI analyzes the investment', 'agent_chat',
         '{"agentName": "Financial Analyst", "contextAssets": ["company_description"]}'),
        (workflow_id, 4, 'Risk Assessment', 'Identify and assess risks', 'agent_chat',
         '{"agentName": "Risk Sentinel", "prompt": "What are the key risks of this investment?"}'),
        (workflow_id, 5, 'Final Report', 'Complete investment analysis', 'output',
         '{"format": "markdown", "downloadable": true}');

END $$;

-- ============================================
-- SECTION 6: DEPARTMENT-AGENT MAPPINGS
-- Link agents to departments with featured status
-- ============================================

DO $$
DECLARE
    dept_id UUID;
    agent_id UUID;
BEGIN
    -- Sales Department Agents
    SELECT id INTO dept_id FROM departments WHERE name = 'Sales';
    SELECT id INTO agent_id FROM agents WHERE name = 'Proposal Generator';
    IF dept_id IS NOT NULL AND agent_id IS NOT NULL THEN
        INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
        VALUES (dept_id, agent_id, true, 1, 'Create winning sales proposals')
        ON CONFLICT (department_id, agent_id) DO NOTHING;
    END IF;

    -- Marketing Department Agents
    SELECT id INTO dept_id FROM departments WHERE name = 'Marketing';
    SELECT id INTO agent_id FROM agents WHERE name = 'Campaign Strategist';
    IF dept_id IS NOT NULL AND agent_id IS NOT NULL THEN
        INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
        VALUES (dept_id, agent_id, true, 1, 'Plan effective marketing campaigns')
        ON CONFLICT (department_id, agent_id) DO NOTHING;
    END IF;
    SELECT id INTO agent_id FROM agents WHERE name = 'Brand Strategist';
    IF dept_id IS NOT NULL AND agent_id IS NOT NULL THEN
        INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
        VALUES (dept_id, agent_id, true, 2, 'Develop brand positioning')
        ON CONFLICT (department_id, agent_id) DO NOTHING;
    END IF;

    -- Operations Department Agents
    SELECT id INTO dept_id FROM departments WHERE name = 'Operations';
    SELECT id INTO agent_id FROM agents WHERE name = 'Process Documenter';
    IF dept_id IS NOT NULL AND agent_id IS NOT NULL THEN
        INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
        VALUES (dept_id, agent_id, true, 1, 'Create clear SOPs and documentation')
        ON CONFLICT (department_id, agent_id) DO NOTHING;
    END IF;
    SELECT id INTO agent_id FROM agents WHERE name = 'Process Miner';
    IF dept_id IS NOT NULL AND agent_id IS NOT NULL THEN
        INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
        VALUES (dept_id, agent_id, true, 2, 'Discover and map existing processes')
        ON CONFLICT (department_id, agent_id) DO NOTHING;
    END IF;

    -- Finance Department Agents
    SELECT id INTO dept_id FROM departments WHERE name = 'Finance';
    SELECT id INTO agent_id FROM agents WHERE name = 'Financial Analyst';
    IF dept_id IS NOT NULL AND agent_id IS NOT NULL THEN
        INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
        VALUES (dept_id, agent_id, true, 1, 'Analyze financial data and forecasts')
        ON CONFLICT (department_id, agent_id) DO NOTHING;
    END IF;
    SELECT id INTO agent_id FROM agents WHERE name = 'Unit Economics Analyst';
    IF dept_id IS NOT NULL AND agent_id IS NOT NULL THEN
        INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
        VALUES (dept_id, agent_id, true, 2, 'Understand business model fundamentals')
        ON CONFLICT (department_id, agent_id) DO NOTHING;
    END IF;

    -- HR Department Agents
    SELECT id INTO dept_id FROM departments WHERE name = 'HR';
    SELECT id INTO agent_id FROM agents WHERE name = 'Values Excavator';
    IF dept_id IS NOT NULL AND agent_id IS NOT NULL THEN
        INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
        VALUES (dept_id, agent_id, true, 1, 'Define and communicate company values')
        ON CONFLICT (department_id, agent_id) DO NOTHING;
    END IF;

    -- Executive Department Agents
    SELECT id INTO dept_id FROM departments WHERE name = 'Executive';
    SELECT id INTO agent_id FROM agents WHERE name = 'Executive Communicator';
    IF dept_id IS NOT NULL AND agent_id IS NOT NULL THEN
        INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
        VALUES (dept_id, agent_id, true, 1, 'Craft executive communications')
        ON CONFLICT (department_id, agent_id) DO NOTHING;
    END IF;
    SELECT id INTO agent_id FROM agents WHERE name = 'Strategy Analyst';
    IF dept_id IS NOT NULL AND agent_id IS NOT NULL THEN
        INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
        VALUES (dept_id, agent_id, true, 2, 'Develop strategic recommendations')
        ON CONFLICT (department_id, agent_id) DO NOTHING;
    END IF;
    SELECT id INTO agent_id FROM agents WHERE name = 'Stakeholder Mapper';
    IF dept_id IS NOT NULL AND agent_id IS NOT NULL THEN
        INSERT INTO department_agents (department_id, agent_id, is_featured, sort_order, use_case_summary)
        VALUES (dept_id, agent_id, true, 3, 'Manage stakeholder relationships')
        ON CONFLICT (department_id, agent_id) DO NOTHING;
    END IF;

END $$;

-- ============================================
-- VERIFICATION QUERIES
-- Run these to confirm successful seeding
-- ============================================

SELECT 'Departments' as entity, COUNT(*) as count FROM departments
UNION ALL
SELECT 'Context Asset Types', COUNT(*) FROM context_asset_types
UNION ALL
SELECT 'BSC Perspectives', COUNT(*) FROM bsc_perspectives
UNION ALL
SELECT 'Agents', COUNT(*) FROM agents
UNION ALL
SELECT 'Workflows', COUNT(*) FROM workflows
UNION ALL
SELECT 'Workflow Steps', COUNT(*) FROM workflow_steps
UNION ALL
SELECT 'Department-Agent Mappings', COUNT(*) FROM department_agents;

-- Show departments with their agent counts
SELECT
    d.name as department,
    d.tagline,
    COUNT(da.id) as agent_count
FROM departments d
LEFT JOIN department_agents da ON d.id = da.department_id
GROUP BY d.id, d.name, d.tagline
ORDER BY d.sort_order;
