-- Phase 64: Integrity Dashboard Overhaul
-- Integrity Score History Table for trend tracking

CREATE TABLE IF NOT EXISTS integrity_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    period_days INTEGER NOT NULL DEFAULT 30,
    integrity_yield INTEGER NOT NULL,
    trust_velocity INTEGER NOT NULL,
    intervention_effectiveness INTEGER NOT NULL,
    alignment_audit INTEGER NOT NULL,
    counterfactual_value INTEGER NOT NULL,
    interpretation TEXT NOT NULL CHECK (interpretation IN ('strong', 'adequate', 'gaps', 'critical')),
    snapshot_data JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrity_score_history_org_recorded
    ON integrity_score_history (org_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_integrity_score_history_org_period
    ON integrity_score_history (org_id, period_days, recorded_at DESC);

-- RLS
ALTER TABLE integrity_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read own history"
    ON integrity_score_history FOR SELECT
    USING (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Service role full access on integrity_score_history"
    ON integrity_score_history FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
