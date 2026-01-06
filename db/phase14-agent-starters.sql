-- ============================================
-- Insight 360 - Phase 14: Agent Conversation Starters & Introduction
-- Version: 1.1
-- Date: January 2026
-- Description: Add conversation_starters and introduction fields to agents table
-- ============================================

-- ============================================
-- ADD CONVERSATION STARTERS TO AGENTS
-- ============================================

-- Add conversation_starters column to agents table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'agents'
        AND column_name = 'conversation_starters'
    ) THEN
        ALTER TABLE agents ADD COLUMN conversation_starters TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added conversation_starters column to agents table';
    ELSE
        RAISE NOTICE 'conversation_starters column already exists in agents table';
    END IF;
END $$;

-- ============================================
-- ADD INTRODUCTION TO AGENTS
-- ============================================

-- Add introduction column to agents table if it doesn't exist
-- This is shown at the beginning of a chat with the agent
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'agents'
        AND column_name = 'introduction'
    ) THEN
        ALTER TABLE agents ADD COLUMN introduction TEXT;
        RAISE NOTICE 'Added introduction column to agents table';
    ELSE
        RAISE NOTICE 'introduction column already exists in agents table';
    END IF;
END $$;

-- ============================================
-- SET DEFAULT VALUES
-- ============================================

-- Update agents with NULL conversation_starters to empty array
UPDATE agents
SET conversation_starters = '{}'
WHERE conversation_starters IS NULL;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    starters_exists BOOLEAN;
    intro_exists BOOLEAN;
    agent_count INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'agents'
        AND column_name = 'conversation_starters'
    ) INTO starters_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'agents'
        AND column_name = 'introduction'
    ) INTO intro_exists;

    SELECT COUNT(*) INTO agent_count FROM agents WHERE is_active = true;

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'PHASE 14: AGENT CONVERSATION STARTERS & INTRO';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'conversation_starters column: %', CASE WHEN starters_exists THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE 'introduction column: %', CASE WHEN intro_exists THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE 'Active agents: %', agent_count;
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
