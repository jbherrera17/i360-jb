-- ============================================
-- Seed Departments for Execute 120
-- Run this after phase3.5-schema.sql and phase10-execute120.sql
-- ============================================

-- Delete existing departments first (safe for fresh installs)
DELETE FROM departments WHERE name IN ('Sales', 'Marketing', 'Operations', 'Finance', 'HR', 'Executive');

-- Insert default departments with Execute 120 configuration
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

-- Verify departments were inserted
SELECT id, name, icon, color, tagline FROM departments ORDER BY sort_order;
