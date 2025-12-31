-- ============================================
-- Insight 360 - Schema Sync Migration
-- Version: 1.0
-- Date: December 2025
-- Description: Safely adds missing columns/indexes to existing tables
--              Run this if your database has partial schema from earlier versions
-- ============================================

-- ============================================
-- CONVERSATIONS TABLE - Missing columns
-- ============================================
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations(is_archived);

-- ============================================
-- AGENTS TABLE - Extended columns from Phase 3.5/4
-- ============================================
ALTER TABLE agents ADD COLUMN IF NOT EXISTS suite TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS llm_provider TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS llm_model TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS system_prompt TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS temperature NUMERIC(3,2) DEFAULT 0.7;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 4096;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tools JSONB DEFAULT '[]'::jsonb;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Phase 4.5 model override columns
ALTER TABLE agents ADD COLUMN IF NOT EXISTS agent_model TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS runtime_model TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS model_overridden BOOLEAN DEFAULT false;

-- Indexes for agent columns
CREATE INDEX IF NOT EXISTS idx_agents_suite ON agents(suite);
CREATE INDEX IF NOT EXISTS idx_agents_category ON agents(category);
CREATE INDEX IF NOT EXISTS idx_agents_provider ON agents(llm_provider);

-- ============================================
-- USERS TABLE - Any missing columns
-- ============================================
-- (Currently no missing columns expected, but placeholder for future)

-- ============================================
-- DROP AND RECREATE VIEWS
-- Views need to be recreated if underlying columns changed
-- ============================================

-- Conversation summaries view
DROP VIEW IF EXISTS conversation_summaries;
CREATE OR REPLACE VIEW conversation_summaries AS
SELECT
    c.id,
    c.user_id,
    c.title,
    c.model,
    c.created_at,
    c.updated_at,
    COUNT(m.id) as message_count,
    MAX(m.created_at) as last_message_at
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id
WHERE c.is_archived = false
GROUP BY c.id
ORDER BY c.updated_at DESC;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'SCHEMA SYNC MIGRATION COMPLETED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Added/verified columns:';
    RAISE NOTICE '  - conversations.is_archived';
    RAISE NOTICE '  - agents.suite, category, llm_provider, etc.';
    RAISE NOTICE '';
    RAISE NOTICE 'Recreated views:';
    RAISE NOTICE '  - conversation_summaries';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now proceed with running phase schemas.';
    RAISE NOTICE '==============================================';
END $$;
