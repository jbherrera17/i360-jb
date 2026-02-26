-- Phase 59d: Fix departments.org_id FK to CASCADE on org deletion
-- The original FK (phase39) used ON DELETE SET NULL, but phase59c added NOT NULL
-- to org_id. This mismatch causes "null value in column org_id" errors when
-- deleting an organization. Fix: change to ON DELETE CASCADE.

BEGIN;

-- Drop the existing FK constraint
ALTER TABLE departments
    DROP CONSTRAINT IF EXISTS departments_org_id_fkey;

-- Re-add with CASCADE
ALTER TABLE departments
    ADD CONSTRAINT departments_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

COMMIT;
