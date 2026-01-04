-- ============================================
-- Insight 360 Seed Data
-- Version 3.0 | January 2026
-- Updated to match current schema with system_prompt column
-- ============================================

-- ============================================
-- DEFAULT AGENTS
-- Public agents available to all users
-- ============================================

-- Note: These agents have user_id = NULL and is_public = true
-- They serve as templates and can be used by any authenticated user

-- 1. Daily Briefer
INSERT INTO agents (
    id, user_id, name, description, icon, is_active, is_public,
    suite, category, llm_provider, llm_model, system_prompt, temperature, max_tokens, tools
)
VALUES (
    'a0000001-0000-4000-a000-000000000001',
    NULL,
    'Daily Briefer',
    'Generates a comprehensive morning intelligence summary based on your topics of interest',
    'newspaper',
    true,
    true,
    'strategy',
    'research',
    'anthropic',
    'claude-sonnet-4-5-20250929',
    'You are a professional intelligence analyst creating a daily briefing. Synthesize information clearly and concisely. Highlight key insights, emerging trends, and actionable items. Use clear headings and bullet points for readability.',
    0.7,
    4096,
    '[]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    suite = EXCLUDED.suite,
    category = EXCLUDED.category,
    llm_provider = EXCLUDED.llm_provider,
    llm_model = EXCLUDED.llm_model,
    system_prompt = EXCLUDED.system_prompt,
    temperature = EXCLUDED.temperature,
    max_tokens = EXCLUDED.max_tokens;

-- 2. Email Triager
INSERT INTO agents (
    id, user_id, name, description, icon, is_active, is_public,
    suite, category, llm_provider, llm_model, system_prompt, temperature, max_tokens, tools
)
VALUES (
    'a0000001-0000-4000-a000-000000000002',
    NULL,
    'Email Triager',
    'Analyzes and prioritizes incoming emails, suggesting responses and actions',
    'mail',
    true,
    true,
    'execute',
    'communication',
    'anthropic',
    'claude-haiku-4-5-20251001',
    'You are an executive assistant specializing in email management. Analyze emails for urgency, importance, and required action. Categorize as: Urgent Action, Review Today, This Week, FYI Only, or Archive. Suggest brief responses when appropriate.',
    0.3,
    2048,
    '[]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    suite = EXCLUDED.suite,
    category = EXCLUDED.category,
    llm_provider = EXCLUDED.llm_provider,
    llm_model = EXCLUDED.llm_model,
    system_prompt = EXCLUDED.system_prompt,
    temperature = EXCLUDED.temperature,
    max_tokens = EXCLUDED.max_tokens;

-- 3. Research Assistant
INSERT INTO agents (
    id, user_id, name, description, icon, is_active, is_public,
    suite, category, llm_provider, llm_model, system_prompt, temperature, max_tokens, tools
)
VALUES (
    'a0000001-0000-4000-a000-000000000003',
    NULL,
    'Research Assistant',
    'Conducts deep research on specified topics with web search capabilities',
    'search',
    true,
    true,
    'strategy',
    'research',
    'anthropic',
    'claude-sonnet-4-5-20250929',
    'You are a thorough research assistant. When given a topic, conduct comprehensive research using available tools. Organize findings into clear sections: Overview, Key Facts, Recent Developments, Different Perspectives, and Sources. Always cite your sources.',
    0.5,
    8192,
    '["web_search"]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    suite = EXCLUDED.suite,
    category = EXCLUDED.category,
    llm_provider = EXCLUDED.llm_provider,
    llm_model = EXCLUDED.llm_model,
    system_prompt = EXCLUDED.system_prompt,
    temperature = EXCLUDED.temperature,
    max_tokens = EXCLUDED.max_tokens;

-- 4. Meeting Prep
INSERT INTO agents (
    id, user_id, name, description, icon, is_active, is_public,
    suite, category, llm_provider, llm_model, system_prompt, temperature, max_tokens, tools
)
VALUES (
    'a0000001-0000-4000-a000-000000000004',
    NULL,
    'Meeting Prep',
    'Prepares briefing materials for upcoming meetings including attendee research',
    'users',
    true,
    true,
    'execute',
    'productivity',
    'anthropic',
    'claude-sonnet-4-5-20250929',
    'You are preparing someone for an important meeting. Research attendees, compile relevant background information, identify potential discussion topics, prepare talking points, and anticipate questions. Format as a clear briefing document.',
    0.5,
    4096,
    '["web_search"]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    suite = EXCLUDED.suite,
    category = EXCLUDED.category,
    llm_provider = EXCLUDED.llm_provider,
    llm_model = EXCLUDED.llm_model,
    system_prompt = EXCLUDED.system_prompt,
    temperature = EXCLUDED.temperature,
    max_tokens = EXCLUDED.max_tokens;

-- 5. First Principles Thinker
INSERT INTO agents (
    id, user_id, name, description, icon, is_active, is_public,
    suite, category, llm_provider, llm_model, system_prompt, temperature, max_tokens, tools
)
VALUES (
    'a0000001-0000-4000-a000-000000000005',
    NULL,
    'First Principles Thinker',
    'Breaks down complex problems to fundamental truths and builds up solutions',
    'lightbulb',
    true,
    true,
    'strategy',
    'analysis',
    'anthropic',
    'claude-opus-4-5-20251101',
    'You are a strategic advisor using first principles thinking. When presented with a problem or decision: 1) Identify and question all assumptions, 2) Break down to fundamental truths, 3) Build up new solutions from the ground up, 4) Evaluate trade-offs clearly. Use the Socratic method to guide thinking.',
    0.7,
    4096,
    '[]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    suite = EXCLUDED.suite,
    category = EXCLUDED.category,
    llm_provider = EXCLUDED.llm_provider,
    llm_model = EXCLUDED.llm_model,
    system_prompt = EXCLUDED.system_prompt,
    temperature = EXCLUDED.temperature,
    max_tokens = EXCLUDED.max_tokens;

-- 6. Code Reviewer
INSERT INTO agents (
    id, user_id, name, description, icon, is_active, is_public,
    suite, category, llm_provider, llm_model, system_prompt, temperature, max_tokens, tools
)
VALUES (
    'a0000001-0000-4000-a000-000000000006',
    NULL,
    'Code Reviewer',
    'Reviews code for bugs, security issues, and best practices',
    'code',
    true,
    true,
    'execute',
    'development',
    'anthropic',
    'claude-sonnet-4-5-20250929',
    'You are an expert code reviewer. Analyze code for: 1) Bugs and logic errors, 2) Security vulnerabilities, 3) Performance issues, 4) Code style and readability, 5) Best practices. Provide specific line references and actionable suggestions. Be constructive and educational.',
    0.3,
    4096,
    '[]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    suite = EXCLUDED.suite,
    category = EXCLUDED.category,
    llm_provider = EXCLUDED.llm_provider,
    llm_model = EXCLUDED.llm_model,
    system_prompt = EXCLUDED.system_prompt,
    temperature = EXCLUDED.temperature,
    max_tokens = EXCLUDED.max_tokens;

-- 7. Writing Coach
INSERT INTO agents (
    id, user_id, name, description, icon, is_active, is_public,
    suite, category, llm_provider, llm_model, system_prompt, temperature, max_tokens, tools
)
VALUES (
    'a0000001-0000-4000-a000-000000000007',
    NULL,
    'Writing Coach',
    'Helps improve writing clarity, structure, and impact',
    'pen-tool',
    true,
    true,
    'execute',
    'communication',
    'anthropic',
    'claude-sonnet-4-5-20250929',
    'You are an expert writing coach. Help improve writing by: 1) Enhancing clarity and conciseness, 2) Strengthening structure and flow, 3) Improving word choice and tone, 4) Ensuring the message lands with impact. Explain your suggestions so the user learns. Match the intended audience and purpose.',
    0.6,
    4096,
    '[]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    suite = EXCLUDED.suite,
    category = EXCLUDED.category,
    llm_provider = EXCLUDED.llm_provider,
    llm_model = EXCLUDED.llm_model,
    system_prompt = EXCLUDED.system_prompt,
    temperature = EXCLUDED.temperature,
    max_tokens = EXCLUDED.max_tokens;

-- 8. Strategic Advisor
INSERT INTO agents (
    id, user_id, name, description, icon, is_active, is_public,
    suite, category, llm_provider, llm_model, system_prompt, temperature, max_tokens, tools
)
VALUES (
    'a0000001-0000-4000-a000-000000000008',
    NULL,
    'Strategic Advisor',
    'Provides strategic business guidance aligned with values and long-term thinking',
    'compass',
    true,
    true,
    'strategy',
    'analysis',
    'anthropic',
    'claude-opus-4-5-20251101',
    'You are a strategic business advisor with expertise in values-driven leadership. Help with strategic decisions by: 1) Clarifying objectives and constraints, 2) Analyzing options with pros/cons, 3) Considering stakeholder impact, 4) Aligning with stated values, 5) Thinking long-term. Ask clarifying questions before advising.',
    0.7,
    4096,
    '[]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    suite = EXCLUDED.suite,
    category = EXCLUDED.category,
    llm_provider = EXCLUDED.llm_provider,
    llm_model = EXCLUDED.llm_model,
    system_prompt = EXCLUDED.system_prompt,
    temperature = EXCLUDED.temperature,
    max_tokens = EXCLUDED.max_tokens;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    agent_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO agent_count
    FROM agents
    WHERE id IN (
        'a0000001-0000-4000-a000-000000000001',
        'a0000001-0000-4000-a000-000000000002',
        'a0000001-0000-4000-a000-000000000003',
        'a0000001-0000-4000-a000-000000000004',
        'a0000001-0000-4000-a000-000000000005',
        'a0000001-0000-4000-a000-000000000006',
        'a0000001-0000-4000-a000-000000000007',
        'a0000001-0000-4000-a000-000000000008'
    ) AND is_active = true;

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'CORE AGENTS SEEDED SUCCESSFULLY';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Core agents added: %', agent_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Agents:';
    RAISE NOTICE '  1. Daily Briefer (strategy/research)';
    RAISE NOTICE '  2. Email Triager (execute/communication)';
    RAISE NOTICE '  3. Research Assistant (strategy/research)';
    RAISE NOTICE '  4. Meeting Prep (execute/productivity)';
    RAISE NOTICE '  5. First Principles Thinker (strategy/analysis)';
    RAISE NOTICE '  6. Code Reviewer (execute/development)';
    RAISE NOTICE '  7. Writing Coach (execute/communication)';
    RAISE NOTICE '  8. Strategic Advisor (strategy/analysis)';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
