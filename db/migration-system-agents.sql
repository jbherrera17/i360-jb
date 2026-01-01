-- ============================================================================
-- INSIGHT 360 - System Agent Protection Migration
-- Version: 1.0.0
--
-- This migration adds protection for seeded/system agents to prevent
-- accidental modification or deletion via the UI.
-- ============================================================================

-- ============================================================================
-- STEP 1: Add is_system column to agents table
-- ============================================================================

ALTER TABLE agents
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

COMMENT ON COLUMN agents.is_system IS
'Indicates if this is a system-seeded agent. System agents cannot be deleted and have limited editability.';

-- ============================================================================
-- STEP 2: Mark all seeded agents as system agents
-- ============================================================================

-- Strategy 120 agents (IDs 301-323, 331-346) - UUID pattern: a0000000-0000-0000-0000-00000000XXXX
UPDATE agents
SET is_system = true
WHERE id::text LIKE 'a0000000-0000-0000-0000-00000000%';

-- Align 120 agents (if using similar UUID pattern)
UPDATE agents
SET is_system = true
WHERE id::text LIKE 'b0000000-0000-0000-0000-00000000%';

-- Execute 120 agents (if using similar UUID pattern)
UPDATE agents
SET is_system = true
WHERE id::text LIKE 'c0000000-0000-0000-0000-00000000%';

-- ============================================================================
-- STEP 3: Create index for efficient filtering
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_agents_is_system ON agents(is_system);

-- ============================================================================
-- STEP 4: View to see system vs user agents
-- ============================================================================

CREATE OR REPLACE VIEW agent_ownership_summary AS
SELECT
    suite,
    is_system,
    COUNT(*) as agent_count
FROM agents
GROUP BY suite, is_system
ORDER BY suite, is_system DESC;

COMMENT ON VIEW agent_ownership_summary IS
'Shows breakdown of system vs user-created agents by suite';

-- ============================================================================
-- STEP 5: Identify manually added agents that may be duplicates
-- ============================================================================

-- This query helps identify manually added agents in strategy suite
-- Run this SELECT first to review before deleting anything
CREATE OR REPLACE VIEW manual_strategy_agents AS
SELECT
    id,
    name,
    category,
    created_at,
    'Manual - not matching seed UUID pattern' as status
FROM agents
WHERE suite = 'strategy'
AND is_system = false
ORDER BY created_at DESC;

COMMENT ON VIEW manual_strategy_agents IS
'Shows manually added strategy agents that are not part of the seeded 35 agents';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these after migration to verify:

-- 1. Check system agent counts
-- SELECT suite, COUNT(*) as system_agents FROM agents WHERE is_system = true GROUP BY suite;

-- 2. Check manual agent counts
-- SELECT suite, COUNT(*) as manual_agents FROM agents WHERE is_system = false GROUP BY suite;

-- 3. View all manual strategy agents
-- SELECT * FROM manual_strategy_agents;

-- 4. Full summary
-- SELECT * FROM agent_ownership_summary;

-- ============================================================================
-- OPTIONAL: Remove manually added strategy agents (run after review)
-- ============================================================================

-- DANGER: Only run this after reviewing manual_strategy_agents view!
-- This will delete agents that were manually added to the strategy suite

-- DELETE FROM agents
-- WHERE suite = 'strategy'
-- AND is_system = false;

-- ============================================================================
-- RLS POLICY (Optional - for Supabase with auth)
-- ============================================================================

-- Prevent deletion of system agents via RLS
-- Note: This requires RLS to be enabled on the agents table

-- CREATE POLICY "Prevent system agent deletion" ON agents
-- FOR DELETE USING (is_system = false);

-- CREATE POLICY "Limit system agent updates" ON agents
-- FOR UPDATE USING (
--     is_system = false
--     OR (is_system = true AND auth.role() = 'service_role')
-- );

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- After running this migration:
-- 1. Run: SELECT * FROM agent_ownership_summary;
-- 2. Review: SELECT * FROM manual_strategy_agents;
-- 3. If duplicates exist, uncomment and run the DELETE statement
-- 4. Update agents.html to check is_system before showing edit/delete buttons
--
-- ============================================================================
