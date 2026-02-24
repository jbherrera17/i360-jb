-- Phase 59c: Clean up orphan departments with NULL org_id
-- These were created by the POST /api/departments endpoint before org_id was required.
-- All 18 orphans have zero references in department_agents, okrs, or processes.

BEGIN;

-- Delete orphan departments (org_id IS NULL)
-- These are duplicates of properly org-scoped departments or stale test data.
DELETE FROM departments WHERE org_id IS NULL;

-- Add NOT NULL constraint to prevent future orphans
-- (Only do this if all remaining departments have org_id set)
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count FROM departments WHERE org_id IS NULL;
    IF null_count = 0 THEN
        ALTER TABLE departments ALTER COLUMN org_id SET NOT NULL;
        RAISE NOTICE 'Added NOT NULL constraint to departments.org_id';
    ELSE
        RAISE WARNING 'Still have % departments with NULL org_id, skipping NOT NULL constraint', null_count;
    END IF;
END $$;

COMMIT;
