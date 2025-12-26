-- Phase 4.5: Model Override & Conversation Tracking
-- Adds support for runtime model selection and conversation metadata tracking
-- Date: December 25, 2024

-- ============================================================================
-- ADD MODEL TRACKING COLUMNS TO agent_executions
-- ============================================================================

-- Add columns for tracking model selection
-- agent_model: The model configured in the agent definition
-- runtime_model: The model actually used (may differ if user overrides)
-- model_overridden: Boolean flag indicating if user selected a different model
-- session_id: Browser session ID for grouping conversations

ALTER TABLE agent_executions
ADD COLUMN IF NOT EXISTS agent_model TEXT,
ADD COLUMN IF NOT EXISTS runtime_model TEXT,
ADD COLUMN IF NOT EXISTS model_overridden BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Create index for session-based queries
CREATE INDEX IF NOT EXISTS idx_agent_executions_session_id
ON agent_executions(session_id)
WHERE session_id IS NOT NULL;

-- Create index for finding overridden executions
CREATE INDEX IF NOT EXISTS idx_agent_executions_model_overridden
ON agent_executions(model_overridden)
WHERE model_overridden = TRUE;

-- ============================================================================
-- COMMENT DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN agent_executions.agent_model IS 'The model configured by the agent author';
COMMENT ON COLUMN agent_executions.runtime_model IS 'The model actually used at execution time (may be overridden by user)';
COMMENT ON COLUMN agent_executions.model_overridden IS 'True if user selected a different model than the agent default';
COMMENT ON COLUMN agent_executions.session_id IS 'Browser session ID for grouping related executions';

-- ============================================================================
-- UPDATE EXISTING RECORDS
-- ============================================================================

-- Backfill existing records: set agent_model and runtime_model to llm_model
UPDATE agent_executions
SET agent_model = llm_model,
    runtime_model = llm_model,
    model_overridden = FALSE
WHERE agent_model IS NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify columns were added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'agent_executions'
        AND column_name = 'runtime_model'
    ) THEN
        RAISE NOTICE 'Phase 4.5 migration successful: Model tracking columns added to agent_executions';
    ELSE
        RAISE EXCEPTION 'Phase 4.5 migration failed: runtime_model column not found';
    END IF;
END $$;
