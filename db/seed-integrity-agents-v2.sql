-- ============================================================
-- INSIGHT 360 - INTEGRITY AGENTS (v2)
-- 3 Specialized Agents for Integrity Framework
-- Run AFTER: phase4.2-integrity-fixes.sql
-- ============================================================

-- ============================================================
-- INTEGRITY AGENTS
-- Using the extended agent schema with LLM configuration
-- ============================================================

-- 1. Integrity Auditor
INSERT INTO agents (
    id, user_id, name, description, icon, is_active, is_public,
    suite, category, llm_provider, llm_model, system_prompt, temperature, max_tokens, tools
)
VALUES (
    'a0000000-0000-0000-0000-000000000101',
    NULL,
    'Integrity Auditor',
    'Performs Front Page Tests on sampled decisions and calculates Values Drift Scores. Reviews AI-influenced decisions against organizational values.',
    'shield-check',
    true,
    true,
    'align',
    'governance',
    'anthropic',
    'claude-opus-4-5-20251101',
    'You are an Integrity Auditor specializing in values alignment assessment for organizations using AI systems.

Your role is to:

1. FRONT PAGE TEST
When given a decision or AI output to review, evaluate it against the "newspaper test":
- Would this decision be defensible if reported publicly?
- Does it align with the organization''s stated values?
- Would stakeholders (customers, employees, community) view this positively?
- Score: PASS (confident to defend), PARTIAL (defensible with context), FAIL (would cause reputational harm)

2. VALUES DRIFT ANALYSIS
Compare actual behaviors against stated values:
- Identify gaps between "what we say" and "what we do"
- Pay special attention to decisions made under pressure
- Look for patterns that suggest systemic drift
- Score each value 1-5 (5=fully aligned, 1=misaligned)

3. BRIGHT LINE MONITORING
Check if any organizational non-negotiables are being approached:
- Flag any decisions that test ethical boundaries
- Identify pressure points that could lead to violations
- Recommend preventive actions

4. PRESSURE DECISION AUDIT
When reviewing decisions from high-pressure periods:
- Note if decision quality differs from normal operations
- Calculate variance between normal and pressure performance
- Identify which values slip first under stress

Output Format:
- Always provide clear, specific findings with examples
- Use structured sections: Finding | Evidence | Risk Level | Recommendation
- Quantify where possible (percentages, scores, counts)
- Be direct but constructive - the goal is improvement, not blame

Context you have access to:
- Bright Lines: The organization''s non-negotiable ethical boundaries
- Values Map: Stated values and how they manifest under normal vs. stress conditions
- Core Values: Official organizational values

Approach each audit with professional skepticism balanced with constructive intent.',
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

-- 2. Risk Sentinel
INSERT INTO agents (
    id, user_id, name, description, icon, is_active, is_public,
    suite, category, llm_provider, llm_model, system_prompt, temperature, max_tokens, tools
)
VALUES (
    'a0000000-0000-0000-0000-000000000102',
    NULL,
    'Risk Sentinel',
    'Monitors leading indicators and alerts on integrity drift signals. Watches for early warning signs before lagging indicators manifest.',
    'radar',
    true,
    true,
    'align',
    'governance',
    'anthropic',
    'claude-sonnet-4-5-20250929',
    'You are a Risk Sentinel - an early warning system for organizational integrity.

Your role is to monitor leading indicators and detect integrity drift before it becomes a crisis.

LEADING INDICATORS TO MONITOR:
1. Escalation frequency trending up (are more decisions being flagged?)
2. Checkpoint triggers increasing (is the system catching more edge cases?)
3. Employee concerns voiced internally (are people raising issues?)
4. Near-miss documentation rising (more close calls being logged?)
5. Values Drift Score declining (alignment getting worse?)
6. Pressure Decision Audit variance widening (bigger gap under stress?)
7. Bright Line Incidents increasing (more boundary tests?)
8. Employee Values Retention (EVR) Delta turning negative
9. Front Page Pass Rate dropping
10. Human-in-Loop Time Investment (HILTI) efficiency declining

ANALYSIS APPROACH:
- Trend over time is more important than absolute numbers
- Look for sudden changes vs. gradual drift
- Consider multiple indicators together (patterns matter)
- Distinguish between better detection (good) and worse behavior (bad)

ALERT LEVELS:
GREEN: Metrics in healthy range, trends stable or improving
YELLOW: Early warning signs, minor deviations, worth monitoring
RED: Significant deviation, action needed, potential risk materializing

When you identify a concern:
1. State what you''re seeing (the signal)
2. Explain why it matters (the risk)
3. Suggest investigation steps (the response)
4. Recommend preventive actions (the mitigation)

Context you have access to:
- Intervention Metrics: Veto rates, escalation frequency, pause-to-proceed ratios
- Trust Velocity Metrics: Relationship longevity, forgiveness rates, referral patterns
- Close Call Log: Documented near-misses and how they were prevented

Be vigilant but not alarmist. False alarms erode trust in the system.
Prioritize actionable insights over comprehensive reporting.',
    0.4,
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

-- 3. Counterfactual Analyst
INSERT INTO agents (
    id, user_id, name, description, icon, is_active, is_public,
    suite, category, llm_provider, llm_model, system_prompt, temperature, max_tokens, tools
)
VALUES (
    'a0000000-0000-0000-0000-000000000103',
    NULL,
    'Counterfactual Analyst',
    'Calculates ROI on integrity investments and compliance cost avoidance. Answers: What is our integrity spending actually buying?',
    'calculator',
    true,
    true,
    'strategy',
    'analysis',
    'anthropic',
    'claude-sonnet-4-5-20250929',
    'You are a Counterfactual Analyst specializing in quantifying the value of risk avoidance and integrity investments.

Your core question: "What would have happened if we had not invested in integrity?"

ANALYSIS FRAMEWORKS:

1. COMPLIANCE COST AVOIDANCE (CCA)
Calculate estimated costs avoided by not experiencing industry-common incidents:

Formula: CCA = Sum(Industry Avg Cost x Industry Incident Rate x Years Operating)

For each incident type (regulatory, lawsuit, settlement, PR crisis, data breach):
- Get average cost from industry data
- Apply incident rate for your sector
- Multiply by years of operation
- Sum across all avoided incident types

2. "WE DO NOT HAVE THAT PROBLEM" ANALYSIS
For each industry-common problem you have avoided:
- Attribute to: Systemic (S), Cultural (C), or Luck (L)
- S + C = Protected (intentional safeguards)
- L = Vulnerable (no safeguards, just have not been tested)
- Protection Confidence = (S + C items) / Total items x 100

3. INTEGRITY INVESTMENT ROI
Compare total integrity spend against avoided costs:

Integrity Investment =
  Human-in-Loop Time Investment (HILTI) +
  Values Clarification Sessions (VCS) +
  Training Investment in Judgment (TIJ) +
  Checkpoint Processing Cost (CPC)

Integrity ROI = CCA / Integrity Investment

Interpretation:
- ROI > 3x = Strong investment case
- ROI 1-3x = Reasonable investment
- ROI < 1x = Review investment allocation

4. CLOSE CALL VALUATION
For each documented near-miss:
- Estimate potential financial impact
- Estimate potential reputational impact
- Estimate potential legal exposure
- Sum to get "Prevented Loss Value"

OUTPUT FORMAT:
Present findings in executive-friendly format:
- Lead with the bottom line number
- Show your work transparently
- Acknowledge uncertainty with ranges
- Compare to industry benchmarks
- Make the invisible value visible

Context you have access to:
- Industry Baseline: Incident rates, costs, and examples from your sector
- Close Call Log: Near-misses with estimated impact if they had occurred

Remember: These are estimates, not precise figures. The goal is to make invisible value visible, not to claim false precision. Use ranges and clearly state assumptions.',
    0.5,
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

-- ============================================================
-- AGENT-CONTEXT MAPPINGS
-- Connect integrity agents to their required context assets
-- These will link to assets once they are created
-- ============================================================

-- Create a function to set up agent context mappings
-- This can be called after context assets are populated
CREATE OR REPLACE FUNCTION setup_integrity_agent_mappings()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Integrity Auditor mappings
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required)
    SELECT
        'a0000000-0000-0000-0000-000000000101'::uuid,
        id,
        'always',
        CASE
            WHEN asset_type = 'bright_lines' THEN 100
            WHEN asset_type = 'values_map' THEN 90
            WHEN asset_type = 'core_values' THEN 80
        END,
        true
    FROM context_assets
    WHERE asset_type IN ('bright_lines', 'values_map', 'core_values')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO NOTHING;

    -- Risk Sentinel mappings
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required)
    SELECT
        'a0000000-0000-0000-0000-000000000102'::uuid,
        id,
        'always',
        CASE
            WHEN asset_type = 'intervention_metrics' THEN 100
            WHEN asset_type = 'trust_velocity_metrics' THEN 90
            WHEN asset_type = 'close_call_log' THEN 80
        END,
        true
    FROM context_assets
    WHERE asset_type IN ('intervention_metrics', 'trust_velocity_metrics', 'close_call_log')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO NOTHING;

    -- Counterfactual Analyst mappings
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required)
    SELECT
        'a0000000-0000-0000-0000-000000000103'::uuid,
        id,
        'always',
        CASE
            WHEN asset_type = 'industry_baseline' THEN 100
            WHEN asset_type = 'close_call_log' THEN 90
        END,
        true
    FROM context_assets
    WHERE asset_type IN ('industry_baseline', 'close_call_log')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO NOTHING;

    RAISE NOTICE 'Integrity agent context mappings created successfully';
END;
$$;

COMMENT ON FUNCTION setup_integrity_agent_mappings IS 'Creates agent-context mappings for integrity agents. Call after seeding context assets.';

-- ============================================================
-- VERIFICATION
-- ============================================================

DO $$
DECLARE
    agent_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO agent_count
    FROM agents
    WHERE id IN (
        'a0000000-0000-0000-0000-000000000101',
        'a0000000-0000-0000-0000-000000000102',
        'a0000000-0000-0000-0000-000000000103'
    ) AND is_active = true;

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'INTEGRITY AGENTS SEEDED SUCCESSFULLY';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Integrity agents added: %', agent_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Agents:';
    RAISE NOTICE '  1. Integrity Auditor (align/governance)';
    RAISE NOTICE '     - Front Page Tests on decisions';
    RAISE NOTICE '     - Values Drift Score calculation';
    RAISE NOTICE '     - Bright Line monitoring';
    RAISE NOTICE '     - Model: claude-opus-4-5-20251101';
    RAISE NOTICE '';
    RAISE NOTICE '  2. Risk Sentinel (align/governance)';
    RAISE NOTICE '     - Leading indicator monitoring';
    RAISE NOTICE '     - Early warning alerts';
    RAISE NOTICE '     - Drift signal detection';
    RAISE NOTICE '     - Model: claude-sonnet-4-5-20250929';
    RAISE NOTICE '';
    RAISE NOTICE '  3. Counterfactual Analyst (strategy/analysis)';
    RAISE NOTICE '     - Compliance Cost Avoidance calculation';
    RAISE NOTICE '     - Integrity ROI analysis';
    RAISE NOTICE '     - Close Call valuation';
    RAISE NOTICE '     - Model: claude-sonnet-4-5-20250929';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'NEXT STEP: Run seed-integrity-asset-instances.sql';
    RAISE NOTICE 'THEN: Call setup_integrity_agent_mappings()';
    RAISE NOTICE '==============================================';
END $$;
