-- ============================================================================
-- INSIGHT 360 - Strategy 120 Agent Verification Script
-- Run this after executing both seed-strategy120-agents-part1.sql and part2.sql
-- ============================================================================

-- ============================================================================
-- 1. AGENT COUNT BY CATEGORY
-- ============================================================================
SELECT
    '1. AGENT COUNT BY CATEGORY' as section;

SELECT
    category,
    COUNT(*) as agent_count
FROM agents
WHERE suite = 'strategy'
GROUP BY category
ORDER BY
    CASE category
        WHEN 'orchestration' THEN 1
        WHEN 'platform' THEN 2
        WHEN 'planning' THEN 3
        WHEN 'financial_perspective' THEN 4
        WHEN 'customer_perspective' THEN 5
        WHEN 'process_perspective' THEN 6
        WHEN 'learning_perspective' THEN 7
        WHEN 'investment' THEN 8
        WHEN 'intelligence' THEN 9
        WHEN 'decision_support' THEN 10
        WHEN 'governance' THEN 11
    END;

-- ============================================================================
-- 2. EXPECTED VS ACTUAL COUNTS
-- ============================================================================
SELECT
    '2. EXPECTED VS ACTUAL COUNTS' as section;

WITH expected AS (
    SELECT 'orchestration' as category, 1 as expected_count UNION ALL
    SELECT 'platform', 2 UNION ALL
    SELECT 'planning', 4 UNION ALL
    SELECT 'financial_perspective', 4 UNION ALL
    SELECT 'customer_perspective', 4 UNION ALL
    SELECT 'process_perspective', 4 UNION ALL
    SELECT 'learning_perspective', 4 UNION ALL
    SELECT 'investment', 4 UNION ALL
    SELECT 'intelligence', 4 UNION ALL
    SELECT 'decision_support', 4 UNION ALL
    SELECT 'governance', 4
),
actual AS (
    SELECT category, COUNT(*) as actual_count
    FROM agents
    WHERE suite = 'strategy'
    GROUP BY category
)
SELECT
    e.category,
    e.expected_count,
    COALESCE(a.actual_count, 0) as actual_count,
    CASE
        WHEN COALESCE(a.actual_count, 0) = e.expected_count THEN 'OK'
        ELSE 'MISMATCH'
    END as status
FROM expected e
LEFT JOIN actual a ON e.category = a.category
ORDER BY
    CASE e.category
        WHEN 'orchestration' THEN 1
        WHEN 'platform' THEN 2
        WHEN 'planning' THEN 3
        WHEN 'financial_perspective' THEN 4
        WHEN 'customer_perspective' THEN 5
        WHEN 'process_perspective' THEN 6
        WHEN 'learning_perspective' THEN 7
        WHEN 'investment' THEN 8
        WHEN 'intelligence' THEN 9
        WHEN 'decision_support' THEN 10
        WHEN 'governance' THEN 11
    END;

-- ============================================================================
-- 3. FULL AGENT LIST
-- ============================================================================
SELECT
    '3. FULL AGENT LIST' as section;

SELECT
    id,
    name,
    category,
    llm_model,
    temperature,
    CASE
        WHEN LENGTH(system_prompt) > 100 THEN 'OK (' || LENGTH(system_prompt) || ' chars)'
        ELSE 'WARNING: Short prompt'
    END as prompt_status
FROM agents
WHERE suite = 'strategy'
ORDER BY
    CASE category
        WHEN 'orchestration' THEN 1
        WHEN 'platform' THEN 2
        WHEN 'planning' THEN 3
        WHEN 'financial_perspective' THEN 4
        WHEN 'customer_perspective' THEN 5
        WHEN 'process_perspective' THEN 6
        WHEN 'learning_perspective' THEN 7
        WHEN 'investment' THEN 8
        WHEN 'intelligence' THEN 9
        WHEN 'decision_support' THEN 10
        WHEN 'governance' THEN 11
    END,
    id;

-- ============================================================================
-- 4. MODEL DISTRIBUTION
-- ============================================================================
SELECT
    '4. MODEL DISTRIBUTION' as section;

SELECT
    llm_model,
    COUNT(*) as agent_count,
    array_agg(name ORDER BY name) as agents
FROM agents
WHERE suite = 'strategy'
GROUP BY llm_model
ORDER BY agent_count DESC;

-- ============================================================================
-- 5. TEMPERATURE DISTRIBUTION
-- ============================================================================
SELECT
    '5. TEMPERATURE DISTRIBUTION' as section;

SELECT
    temperature,
    COUNT(*) as agent_count,
    array_agg(name ORDER BY name) as agents
FROM agents
WHERE suite = 'strategy'
GROUP BY temperature
ORDER BY temperature;

-- ============================================================================
-- 6. TOTAL SUMMARY
-- ============================================================================
SELECT
    '6. TOTAL SUMMARY' as section;

SELECT
    COUNT(*) as total_strategy_agents,
    COUNT(*) FILTER (WHERE llm_model LIKE '%opus%') as opus_agents,
    COUNT(*) FILTER (WHERE llm_model LIKE '%sonnet%') as sonnet_agents,
    COUNT(*) FILTER (WHERE llm_model LIKE '%haiku%') as haiku_agents,
    ROUND(AVG(LENGTH(system_prompt))) as avg_prompt_length,
    CASE
        WHEN COUNT(*) = 35 THEN 'PASS: All 35 agents present'
        ELSE 'FAIL: Expected 35, found ' || COUNT(*)
    END as verification_status
FROM agents
WHERE suite = 'strategy';
