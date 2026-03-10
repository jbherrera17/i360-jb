-- Phase 64: Conversation Panel Enhancements
-- Adds is_starred column and index for conversation management features

-- Add is_starred column to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;

-- Index for starred conversations
CREATE INDEX IF NOT EXISTS idx_conversations_starred ON conversations(is_starred) WHERE is_starred = true;

-- Ensure is_archived index exists (should already from schema.sql)
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations(is_archived);
