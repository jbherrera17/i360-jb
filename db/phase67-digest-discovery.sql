-- ============================================================================
-- INSIGHT 360 - Phase 67: Digest Source Discovery Sessions
-- Tracks AI-powered source discovery history per organization
-- ============================================================================

CREATE TABLE IF NOT EXISTS digest_discovery_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    hints TEXT,
    results_count INTEGER DEFAULT 0,
    sources_added_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discovery_sessions_org_id
    ON digest_discovery_sessions(org_id, created_at DESC);

-- RLS
ALTER TABLE digest_discovery_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's discovery sessions"
    ON digest_discovery_sessions FOR SELECT
    USING (org_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their org's discovery sessions"
    ON digest_discovery_sessions FOR INSERT
    WITH CHECK (org_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    ));
