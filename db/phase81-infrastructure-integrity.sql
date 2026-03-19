-- ============================================================
-- Phase 81: Infrastructure Integrity Remediation
-- ============================================================
-- Fixes schema gaps identified during multi-tenancy audit:
-- 1. Updates skill_summary view to include org_id and module_id
-- 2. Adds org_id to workflow_executions for proper scoping
-- ============================================================

-- ============================================
-- 1. Update skill_summary view
-- ============================================
-- The view was created in Phase 19 and never updated to include
-- org_id (added Phase 39) and module_id (added Phase 45)

-- DROP required because adding columns changes the view's column list,
-- and CREATE OR REPLACE VIEW cannot reorder or add columns in Postgres.
DROP VIEW IF EXISTS skill_summary;

CREATE VIEW skill_summary AS
SELECT
    s.id,
    s.user_id,
    s.name,
    s.display_name,
    s.description,
    s.icon,
    s.color,
    s.category,
    s.suite,
    s.tags,
    s.version,
    s.visibility,
    s.status,
    s.required_context_types,
    s.optional_context_types,
    s.context_token_budget,
    s.trigger_phrases,
    s.conversation_starters,
    s.usage_count,
    s.last_used_at,
    s.created_at,
    s.updated_at,
    s.department_id,
    s.org_id,
    s.module_id,
    d.name as department_name,
    COUNT(DISTINCT a.id) as agents_using,
    COUNT(DISTINCT se.id) as total_executions,
    COALESCE(AVG(se.duration_ms), 0) as avg_execution_ms
FROM skills s
LEFT JOIN departments d ON s.department_id = d.id
LEFT JOIN agents a ON a.skill_id = s.id AND a.is_active = true
LEFT JOIN skill_executions se ON se.skill_id = s.id
GROUP BY s.id, d.name;

-- Restore grants after DROP/CREATE
GRANT SELECT ON skill_summary TO authenticated;
GRANT SELECT ON skill_summary TO anon;

-- ============================================
-- 2. Add org_id to workflow_executions
-- ============================================

ALTER TABLE workflow_executions
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

-- Backfill org_id from parent workflow
UPDATE workflow_executions we
SET org_id = w.org_id
FROM workflows w
WHERE we.workflow_id = w.id
  AND we.org_id IS NULL
  AND w.org_id IS NOT NULL;

-- Index for org-scoped queries
CREATE INDEX IF NOT EXISTS idx_workflow_executions_org
    ON workflow_executions(org_id);

-- ============================================
-- 3. Backfill org_id on system agents
-- ============================================
-- All 79 seed agents were created before Phase 39 and have org_id=NULL.
-- Assign them to Synergi org so org-scoped queries include them.

UPDATE agents
SET org_id = '57234ef8-5a4d-40e7-aec3-ca02e44db9ce'
WHERE user_id IS NULL
  AND org_id IS NULL;

-- ============================================
-- 4. Backfill org_id on system skills
-- ============================================
-- Same issue: skills seeded before Phase 39 have null org_id.

UPDATE skills
SET org_id = '57234ef8-5a4d-40e7-aec3-ca02e44db9ce'
WHERE user_id IS NULL
  AND org_id IS NULL;

-- ============================================
-- 5. Backfill org_id on system actions
-- ============================================

UPDATE actions
SET org_id = '57234ef8-5a4d-40e7-aec3-ca02e44db9ce'
WHERE user_id IS NULL
  AND org_id IS NULL;

-- ============================================
-- 6. Backfill org_id on system workflows
-- ============================================

UPDATE workflows
SET org_id = '57234ef8-5a4d-40e7-aec3-ca02e44db9ce'
WHERE user_id IS NULL
  AND org_id IS NULL;

-- ============================================
-- NOTES
-- ============================================
-- This migration is safe to re-run (uses IF NOT EXISTS, OR REPLACE,
-- and WHERE ... IS NULL guards on updates).
-- Run after all previous phase migrations.
