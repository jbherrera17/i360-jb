-- Phase 61: Execute 120 Personal Command Center
-- Creates user_favorites table for per-user pinning/starring of platform entities.
-- Supports the redesigned Execute 120 page that surfaces personalized content.

-- ============================================
-- USER FAVORITES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_favorites (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type     TEXT NOT NULL CHECK (entity_type IN ('agent', 'workflow', 'skill', 'action', 'context_asset')),
    entity_id       UUID NOT NULL,
    label           TEXT,                           -- optional display override
    sort_order      INT DEFAULT 50,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, entity_type, entity_id)
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_user_favorites_entity ON user_favorites(entity_type, entity_id);

COMMENT ON TABLE user_favorites IS 'Per-user pinned/starred items across all entity types';
COMMENT ON COLUMN user_favorites.entity_type IS 'Type of favorited entity: agent, workflow, skill, action, context_asset';
COMMENT ON COLUMN user_favorites.last_accessed_at IS 'Updated when user interacts with this favorite; used for recency sorting';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own favorites
CREATE POLICY "users_manage_own_favorites" ON user_favorites
    FOR ALL USING (user_id = auth.uid());

-- Service role bypass for API server
CREATE POLICY "service_role_full_access_favorites" ON user_favorites
    FOR ALL USING (auth.role() = 'service_role');
