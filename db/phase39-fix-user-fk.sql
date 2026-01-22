-- ============================================
-- Phase 39: Fix User Foreign Key References
-- ============================================
-- Issue: organization_members.user_id references auth.users(id)
-- but the invite system looks up users in public.users table
-- which may have different UUIDs.
--
-- Solution: Change FK to reference public.users(id) instead.
-- This aligns with the application's user management approach.
-- ============================================

-- Drop existing foreign key constraint on user_id
ALTER TABLE organization_members
DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey;

-- Add new foreign key constraint referencing public.users
ALTER TABLE organization_members
ADD CONSTRAINT organization_members_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Also fix invited_by if it references auth.users
ALTER TABLE organization_members
DROP CONSTRAINT IF EXISTS organization_members_invited_by_fkey;

ALTER TABLE organization_members
ADD CONSTRAINT organization_members_invited_by_fkey
FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- Verify the constraints
-- ============================================
-- Run this to check:
-- SELECT conname, conrelid::regclass, confrelid::regclass
-- FROM pg_constraint
-- WHERE conrelid = 'organization_members'::regclass
-- AND contype = 'f';
