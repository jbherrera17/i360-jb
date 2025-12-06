-- ============================================
-- Insight 360 Seed Data
-- Version 2.1 | November 2025
-- ============================================

-- ============================================
-- DEFAULT AGENTS
-- Public agents available to all users
-- ============================================

-- Note: These agents have user_id = NULL and is_public = true
-- They serve as templates and can be used by any authenticated user

INSERT INTO agents (id, user_id, name, description, type, config, icon, is_active, is_public)
VALUES
    -- Daily Briefer
    (
        'a0000000-0000-0000-0000-000000000001',
        NULL,
        'Daily Briefer',
        'Generates a comprehensive morning intelligence summary based on your topics of interest',
        'custom',
        '{
            "model": "claude-sonnet-4-5-20250929",
            "systemPrompt": "You are a professional intelligence analyst creating a daily briefing. Synthesize information clearly and concisely. Highlight key insights, emerging trends, and actionable items. Use clear headings and bullet points for readability.",
            "temperature": 0.7,
            "maxTokens": 4096
        }',
        'newspaper',
        true,
        true
    ),
    
    -- Email Triager
    (
        'a0000000-0000-0000-0000-000000000002',
        NULL,
        'Email Triager',
        'Analyzes and prioritizes incoming emails, suggesting responses and actions',
        'custom',
        '{
            "model": "claude-haiku-4-5-20251001",
            "systemPrompt": "You are an executive assistant specializing in email management. Analyze emails for urgency, importance, and required action. Categorize as: Urgent Action, Review Today, This Week, FYI Only, or Archive. Suggest brief responses when appropriate.",
            "temperature": 0.3,
            "maxTokens": 2048
        }',
        'mail',
        true,
        true
    ),
    
    -- Research Assistant
    (
        'a0000000-0000-0000-0000-000000000003',
        NULL,
        'Research Assistant',
        'Conducts deep research on specified topics with web search capabilities',
        'custom',
        '{
            "model": "claude-sonnet-4-5-20250929",
            "systemPrompt": "You are a thorough research assistant. When given a topic, conduct comprehensive research using available tools. Organize findings into clear sections: Overview, Key Facts, Recent Developments, Different Perspectives, and Sources. Always cite your sources.",
            "temperature": 0.5,
            "maxTokens": 8192,
            "enableSearch": true
        }',
        'search',
        true,
        true
    ),
    
    -- Meeting Prep
    (
        'a0000000-0000-0000-0000-000000000004',
        NULL,
        'Meeting Prep',
        'Prepares briefing materials for upcoming meetings including attendee research',
        'custom',
        '{
            "model": "claude-sonnet-4-5-20250929",
            "systemPrompt": "You are preparing someone for an important meeting. Research attendees, compile relevant background information, identify potential discussion topics, prepare talking points, and anticipate questions. Format as a clear briefing document.",
            "temperature": 0.5,
            "maxTokens": 4096,
            "enableSearch": true
        }',
        'users',
        true,
        true
    ),
    
    -- First Principles Thinker
    (
        'a0000000-0000-0000-0000-000000000005',
        NULL,
        'First Principles Thinker',
        'Breaks down complex problems to fundamental truths and builds up solutions',
        'custom',
        '{
            "model": "claude-opus-4-5-20251101",
            "systemPrompt": "You are a strategic advisor using first principles thinking. When presented with a problem or decision: 1) Identify and question all assumptions, 2) Break down to fundamental truths, 3) Build up new solutions from the ground up, 4) Evaluate trade-offs clearly. Use the Socratic method to guide thinking.",
            "temperature": 0.7,
            "maxTokens": 4096
        }',
        'lightbulb',
        true,
        true
    ),
    
    -- Code Reviewer
    (
        'a0000000-0000-0000-0000-000000000006',
        NULL,
        'Code Reviewer',
        'Reviews code for bugs, security issues, and best practices',
        'custom',
        '{
            "model": "claude-sonnet-4-5-20250929",
            "systemPrompt": "You are an expert code reviewer. Analyze code for: 1) Bugs and logic errors, 2) Security vulnerabilities, 3) Performance issues, 4) Code style and readability, 5) Best practices. Provide specific line references and actionable suggestions. Be constructive and educational.",
            "temperature": 0.3,
            "maxTokens": 4096
        }',
        'code',
        true,
        true
    ),
    
    -- Writing Coach
    (
        'a0000000-0000-0000-0000-000000000007',
        NULL,
        'Writing Coach',
        'Helps improve writing clarity, structure, and impact',
        'custom',
        '{
            "model": "claude-sonnet-4-5-20250929",
            "systemPrompt": "You are an expert writing coach. Help improve writing by: 1) Enhancing clarity and conciseness, 2) Strengthening structure and flow, 3) Improving word choice and tone, 4) Ensuring the message lands with impact. Explain your suggestions so the user learns. Match the intended audience and purpose.",
            "temperature": 0.6,
            "maxTokens": 4096
        }',
        'pen-tool',
        true,
        true
    ),
    
    -- Strategic Advisor
    (
        'a0000000-0000-0000-0000-000000000008',
        NULL,
        'Strategic Advisor',
        'Provides strategic business guidance aligned with values and long-term thinking',
        'custom',
        '{
            "model": "claude-opus-4-5-20251101",
            "systemPrompt": "You are a strategic business advisor with expertise in values-driven leadership. Help with strategic decisions by: 1) Clarifying objectives and constraints, 2) Analyzing options with pros/cons, 3) Considering stakeholder impact, 4) Aligning with stated values, 5) Thinking long-term. Ask clarifying questions before advising.",
            "temperature": 0.7,
            "maxTokens": 4096
        }',
        'compass',
        true,
        true
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    config = EXCLUDED.config,
    icon = EXCLUDED.icon;

-- ============================================
-- DEFAULT TOPICS (for demonstration)
-- These are created per-user, not seeded globally
-- ============================================

-- Example topics that could be created for a new user:
-- INSERT INTO topics (user_id, name, keywords, sources, frequency)
-- VALUES
--     (user_uuid, 'AI Industry News', ARRAY['artificial intelligence', 'machine learning', 'LLM', 'Claude', 'GPT'], ARRAY['techcrunch.com', 'wired.com', 'arxiv.org'], 'daily'),
--     (user_uuid, 'Small Business Trends', ARRAY['SMB', 'small business', 'entrepreneurship', 'startup'], ARRAY['inc.com', 'entrepreneur.com', 'forbes.com'], 'weekly');

-- ============================================
-- VERIFICATION QUERIES
-- Run these to verify seed data
-- ============================================

-- Check agents were created:
-- SELECT name, type, is_public FROM agents WHERE is_public = true;

-- Count by type:
-- SELECT type, COUNT(*) FROM agents GROUP BY type;
