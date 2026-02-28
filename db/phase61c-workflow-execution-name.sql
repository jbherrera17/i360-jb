-- ============================================
-- Phase 61c: Add name column to workflow_executions
-- Allows users to name their workflow runs
-- ============================================

ALTER TABLE workflow_executions
ADD COLUMN IF NOT EXISTS name TEXT;

COMMENT ON COLUMN workflow_executions.name IS 'User-defined name for this workflow execution/run';
