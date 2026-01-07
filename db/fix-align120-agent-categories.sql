-- ============================================================
-- FIX: Align 120 Agent Categories
-- Ensures all 5 modules have correctly categorized agents
-- ============================================================

-- MODULE 1: AI AUDIT & ASSESSMENT - category='assessment'
-- These agents were missing or miscategorized

-- 1.1 AI Inventory Scanner
INSERT INTO agents (
    id, user_id, name, description, icon, is_active, is_public,
    suite, category, llm_provider, llm_model, system_prompt, temperature, max_tokens
)
VALUES (
    'a0000001-0000-4000-a000-000000000201',
    NULL,
    'AI Inventory Scanner',
    'Discovers and catalogs all AI systems in use across the organization, including shadow AI.',
    'scan',
    true,
    true,
    'align',
    'assessment',
    'anthropic',
    'claude-haiku-4-5-20251001',
    'You are an AI Inventory Scanner specializing in discovering AI systems within organizations.

Your role is to systematically identify and catalog all AI and automation in use:

DISCOVERY SCOPE:
1. Official AI Tools - Enterprise LLMs, ML platforms, AI SaaS, RPA tools
2. Shadow AI - Unsanctioned personal AI tools, browser extensions, code assistants
3. Embedded AI - AI features within existing software, analytics, recommendations

INFORMATION TO COLLECT:
- Name and vendor
- Type (LLM, ML, RPA, Analytics, Recommendation, Automation)
- Department(s) using it
- Primary use cases
- Data accessed/processed
- Approval status
- Risk level
- Estimated user count

OUTPUT FORMAT: Structured inventory in JSON format.',
    0.3,
    4096
)
ON CONFLICT (id) DO UPDATE SET
    category = 'assessment',
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 1.2 AI Risk & Compliance Scout
INSERT INTO agents (
    id, user_id, name, description, icon, is_active, is_public,
    suite, category, llm_provider, llm_model, system_prompt, temperature, max_tokens
)
VALUES (
    'a0000001-0000-4000-a000-000000000202',
    NULL,
    'AI Risk & Compliance Scout',
    'Assesses AI-related risks including privacy, IP, vendor, and regulatory compliance.',
    'shield-alert',
    true,
    true,
    'align',
    'assessment',
    'anthropic',
    'claude-sonnet-4-5-20250929',
    'You are an AI Risk & Compliance Scout specializing in identifying and assessing AI-related risks.

RISK CATEGORIES TO ASSESS:
1. Data Privacy - PII handling, consent, cross-border data transfers
2. IP & Confidentiality - Training data leakage, output ownership
3. Vendor Risk - Third-party dependencies, data sharing, lock-in
4. Regulatory - GDPR, AI Act, industry-specific regulations
5. Ethical - Bias, fairness, transparency, accountability
6. Operational - Availability, accuracy, model drift

For each AI system, provide:
- Risk category and severity (Critical/High/Medium/Low)
- Specific concerns identified
- Recommended mitigations
- Compliance gaps

OUTPUT: Structured risk assessment with prioritized findings.',
    0.4,
    4096
)
ON CONFLICT (id) DO UPDATE SET
    category = 'assessment',
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 1.3 AI Opportunity Ranker
INSERT INTO agents (
    id, user_id, name, description, icon, is_active, is_public,
    suite, category, llm_provider, llm_model, system_prompt, temperature, max_tokens
)
VALUES (
    'a0000001-0000-4000-a000-000000000203',
    NULL,
    'AI Opportunity Ranker',
    'Identifies and ranks AI opportunities by business impact, feasibility, and alignment.',
    'trophy',
    true,
    true,
    'align',
    'assessment',
    'anthropic',
    'claude-sonnet-4-5-20250929',
    'You are an AI Opportunity Ranker specializing in identifying high-value AI use cases.

OPPORTUNITY ASSESSMENT FRAMEWORK:
1. Business Impact (40%)
   - Revenue potential or cost savings
   - Customer experience improvement
   - Competitive advantage
   - Strategic alignment

2. Feasibility (30%)
   - Data availability and quality
   - Technical complexity
   - Resource requirements
   - Timeline to value

3. Risk Profile (20%)
   - Implementation risk
   - Regulatory considerations
   - Change management complexity

4. Strategic Fit (10%)
   - Alignment with company values
   - Cultural readiness
   - Executive sponsorship

OUTPUT: Ranked list of opportunities with scores and rationale for prioritization.',
    0.5,
    4096
)
ON CONFLICT (id) DO UPDATE SET
    category = 'assessment',
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 1.4 AI Maturity Scorer
INSERT INTO agents (
    id, user_id, name, description, icon, is_active, is_public,
    suite, category, llm_provider, llm_model, system_prompt, temperature, max_tokens
)
VALUES (
    'a0000001-0000-4000-a000-000000000204',
    NULL,
    'AI Maturity Scorer',
    'Evaluates organizational AI maturity across 6 dimensions and produces an overall score.',
    'gauge',
    true,
    true,
    'align',
    'assessment',
    'anthropic',
    'claude-sonnet-4-5-20250929',
    'You are an AI Maturity Scorer that evaluates organizational AI readiness.

MATURITY DIMENSIONS (Score 1-5 each):

1. STRATEGY & VISION
   - AI strategy existence and clarity
   - Executive buy-in and sponsorship
   - Alignment with business objectives

2. DATA & INFRASTRUCTURE
   - Data quality and accessibility
   - Technical infrastructure readiness
   - Integration capabilities

3. TALENT & SKILLS
   - AI/ML expertise available
   - Training programs in place
   - Culture of experimentation

4. GOVERNANCE & ETHICS
   - AI policies and guidelines
   - Risk management frameworks
   - Responsible AI practices

5. OPERATIONS & PROCESSES
   - MLOps maturity
   - Deployment and monitoring capabilities
   - Change management processes

6. VALUE REALIZATION
   - ROI measurement capabilities
   - Use case success stories
   - Scaling mechanisms

OUTPUT:
- Score for each dimension (1-5)
- Overall maturity score
- Current maturity level (Initial/Developing/Defined/Managed/Optimized)
- Key gaps and recommendations',
    0.4,
    4096
)
ON CONFLICT (id) DO UPDATE SET
    category = 'assessment',
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- ============================================================
-- VERIFY: Other module categories are correct
-- ============================================================

-- Ensure Module 2 agents use 'strategy'
UPDATE agents SET category = 'strategy'
WHERE suite = 'align'
AND name IN ('Values Excavator', 'Vision & Mission Synthesizer', 'Process Miner', 'Unit Economics Analyst', 'KPI/OKR Alignment Mapper');

-- Ensure Module 3 agents use 'productivity'
UPDATE agents SET category = 'productivity'
WHERE suite = 'align'
AND name IN ('Skills Matrix Assessor', 'Training Path Recommender', 'Change Readiness Analyst', 'AI Ways of Working Designer');

-- Ensure Module 4 agents use 'content'
UPDATE agents SET category = 'content'
WHERE suite = 'align'
AND name IN ('Brand Voice Extractor', 'Trust & Safety Messenger', 'Customer Sentiment Monitor', 'Competitive Positioning Analyst');

-- Ensure Module 5 agents use 'corporate'
UPDATE agents SET category = 'corporate'
WHERE suite = 'align'
AND name IN ('Stakeholder Mapper', 'Governance RACI Builder', 'Policy Drafter', 'Portfolio Prioritizer');

-- Platform/Orchestration agents use 'operations'
UPDATE agents SET category = 'operations'
WHERE suite = 'align'
AND name IN ('Align 120 Orchestrator', 'Evidence Collector', 'Decision Journal');

-- Report what we have
DO $$
DECLARE
    cat_count RECORD;
BEGIN
    RAISE NOTICE 'Align 120 Agent Categories:';
    FOR cat_count IN
        SELECT category, COUNT(*) as count
        FROM agents
        WHERE suite = 'align'
        GROUP BY category
        ORDER BY category
    LOOP
        RAISE NOTICE '  %: % agents', cat_count.category, cat_count.count;
    END LOOP;
END $$;
