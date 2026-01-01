-- ============================================================================
-- INSIGHT 360 - Duplicate Agent Cleanup Script
-- Identifies and removes manually added agents that duplicate seeded agents
-- ============================================================================

-- ============================================================================
-- STEP 1: View all potential duplicates
-- These are agents with similar names to seeded Strategy 120 agents
-- but have different UUIDs (not the standard a0000000-... pattern)
-- ============================================================================

-- List all Strategy 120 suite agents to see what exists
SELECT
    id,
    name,
    suite,
    category,
    is_system,
    is_active,
    created_at,
    CASE
        WHEN id::text LIKE 'a0000000-0000-0000-0000-00000000%' THEN 'SEEDED'
        ELSE 'MANUAL'
    END as source
FROM agents
WHERE suite = 'strategy'
ORDER BY name, created_at;

-- ============================================================================
-- STEP 2: Find exact name duplicates
-- Agents with the same name but different IDs
-- ============================================================================

SELECT
    a1.name,
    a1.id as agent1_id,
    a2.id as agent2_id,
    a1.is_system as agent1_is_system,
    a2.is_system as agent2_is_system,
    a1.created_at as agent1_created,
    a2.created_at as agent2_created
FROM agents a1
JOIN agents a2 ON a1.name = a2.name AND a1.id != a2.id
WHERE a1.suite = 'strategy'
ORDER BY a1.name;

-- ============================================================================
-- STEP 3: Identify agents to delete
-- Keep the seeded agents (UUIDs starting with a0000000-0000-0000-0000-00000000)
-- Delete the manually created duplicates
-- ============================================================================

-- Preview what would be deleted (manually added duplicates)
SELECT
    id,
    name,
    category,
    is_system,
    created_at,
    'WILL BE DELETED - Manual duplicate' as action
FROM agents
WHERE suite = 'strategy'
  AND id::text NOT LIKE 'a0000000-0000-0000-0000-00000000%'
  AND name IN (
      SELECT name FROM agents
      WHERE suite = 'strategy'
      AND id::text LIKE 'a0000000-0000-0000-0000-00000000%'
  )
ORDER BY name;

-- ============================================================================
-- STEP 4: EXECUTE CLEANUP (Uncomment to run)
-- This will delete the manual duplicates, keeping only the seeded agents
-- ============================================================================

-- DELETE FROM agents
-- WHERE suite = 'strategy'
--   AND id::text NOT LIKE 'a0000000-0000-0000-0000-00000000%'
--   AND name IN (
--       SELECT name FROM agents
--       WHERE suite = 'strategy'
--       AND id::text LIKE 'a0000000-0000-0000-0000-00000000%'
--   );

-- ============================================================================
-- STEP 5: Verify cleanup results
-- ============================================================================

-- After cleanup, verify all Strategy 120 agents
-- SELECT
--     id,
--     name,
--     suite,
--     category,
--     is_system,
--     CASE
--         WHEN id::text LIKE 'a0000000-0000-0000-0000-00000000%' THEN 'SEEDED'
--         ELSE 'MANUAL'
--     END as source
-- FROM agents
-- WHERE suite = 'strategy'
-- ORDER BY name;

-- Count by source after cleanup
-- SELECT
--     CASE
--         WHEN id::text LIKE 'a0000000-0000-0000-0000-00000000%' THEN 'SEEDED'
--         ELSE 'MANUAL'
--     END as source,
--     COUNT(*) as count
-- FROM agents
-- WHERE suite = 'strategy'
-- GROUP BY 1;

-- ============================================================================
-- OPTIONAL: Delete ALL non-seeded Strategy 120 agents
-- Use this if you want to keep ONLY the seeded agents
-- ============================================================================

-- DELETE FROM agents
-- WHERE suite = 'strategy'
--   AND id::text NOT LIKE 'a0000000-0000-0000-0000-00000000%';

-- ============================================================================
-- OPTIONAL: Mark all seeded agents as is_system = true
-- This protects them from being edited by non-admin users
-- ============================================================================

UPDATE agents
SET is_system = true
WHERE suite = 'strategy'
  AND id::text LIKE 'a0000000-0000-0000-0000-00000000%';

-- Verify is_system flag
SELECT
    COUNT(*) as total_strategy_agents,
    COUNT(*) FILTER (WHERE is_system = true) as system_agents,
    COUNT(*) FILTER (WHERE is_system = false OR is_system IS NULL) as non_system_agents
FROM agents
WHERE suite = 'strategy';
