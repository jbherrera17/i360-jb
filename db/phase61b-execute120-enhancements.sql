-- Phase 61b: Execute 120 Enhancements
-- Adds user_hidden_items table for hiding items from Command Center panels

-- ============================================================
-- 1. user_hidden_items table (mirrors user_favorites pattern)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_hidden_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('agent', 'workflow', 'skill', 'action', 'context_asset')),
    entity_id UUID NOT NULL,
    hidden_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, entity_type, entity_id)
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_user_hidden_items_user_id ON user_hidden_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_hidden_items_lookup ON user_hidden_items(user_id, entity_type, entity_id);

-- ============================================================
-- 2. Row Level Security
-- ============================================================

ALTER TABLE user_hidden_items ENABLE ROW LEVEL SECURITY;

-- Users can only see their own hidden items
CREATE POLICY "Users can view own hidden items"
    ON user_hidden_items FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own hidden items
CREATE POLICY "Users can insert own hidden items"
    ON user_hidden_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own hidden items
CREATE POLICY "Users can delete own hidden items"
    ON user_hidden_items FOR DELETE
    USING (auth.uid() = user_id);

-- Service role bypass for API operations
CREATE POLICY "Service role full access to hidden items"
    ON user_hidden_items FOR ALL
    USING (auth.role() = 'service_role');
