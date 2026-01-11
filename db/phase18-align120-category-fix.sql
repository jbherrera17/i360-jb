-- ============================================================
-- INSIGHT 360 - Phase 18: Align 120 Agent Category Fix
-- Aligns database categories with route categoryMap expectations
-- Run this AFTER seed-align120-agents.sql
-- ============================================================

-- The align120 routes use this categoryMap:
-- Module 1: 'assessment' -> correct in seed
-- Module 2: 'strategy'   -> seed uses 'fundamentals'
-- Module 3: 'productivity' -> seed uses 'upskilling'
-- Module 4: 'content'    -> seed uses 'brand'
-- Module 5: 'corporate'  -> seed uses 'governance'

-- Fix Module 2: fundamentals -> strategy
UPDATE agents
SET category = 'strategy'
WHERE suite = 'align'
AND category = 'fundamentals';

-- Fix Module 3: upskilling -> productivity
UPDATE agents
SET category = 'productivity'
WHERE suite = 'align'
AND category = 'upskilling';

-- Fix Module 4: brand -> content
UPDATE agents
SET category = 'content'
WHERE suite = 'align'
AND category = 'brand';

-- Fix Module 5: governance -> corporate
UPDATE agents
SET category = 'corporate'
WHERE suite = 'align'
AND category = 'governance';

-- Also fix platform/orchestration to operations if needed
UPDATE agents
SET category = 'operations'
WHERE suite = 'align'
AND category IN ('platform', 'orchestration');

-- ============================================================
-- VERIFICATION
-- ============================================================

DO $$
DECLARE
    cat_count RECORD;
    expected_counts TEXT[] := ARRAY[
        'assessment: 4 agents (Module 1)',
        'strategy: 5 agents (Module 2)',
        'productivity: 4 agents (Module 3)',
        'content: 4 agents (Module 4)',
        'corporate: 4 agents (Module 5)',
        'operations: 3 agents (Platform)'
    ];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'ALIGN 120 AGENT CATEGORIES FIXED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Expected counts:';
    FOR i IN 1..array_length(expected_counts, 1) LOOP
        RAISE NOTICE '  %', expected_counts[i];
    END LOOP;
    RAISE NOTICE '';
    RAISE NOTICE 'Actual counts:';

    FOR cat_count IN
        SELECT category, COUNT(*) as count
        FROM agents
        WHERE suite = 'align'
        GROUP BY category
        ORDER BY
            CASE category
                WHEN 'assessment' THEN 1
                WHEN 'strategy' THEN 2
                WHEN 'productivity' THEN 3
                WHEN 'content' THEN 4
                WHEN 'corporate' THEN 5
                WHEN 'operations' THEN 6
                ELSE 7
            END
    LOOP
        RAISE NOTICE '  %: % agents', cat_count.category, cat_count.count;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
