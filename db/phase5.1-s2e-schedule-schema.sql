-- ============================================================================
-- INSIGHT 360 - S2E Schedule Configuration Schema
-- Phase 5.1: Strategy-to-Execution Health Check Scheduling
-- ============================================================================

-- S2E Schedule Configuration Table
-- Stores user preferences for automated health check generation
CREATE TABLE IF NOT EXISTS s2e_schedule_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Weekly health check settings
    weekly_enabled BOOLEAN DEFAULT false,
    weekly_day INTEGER DEFAULT 1 CHECK (weekly_day >= 0 AND weekly_day <= 6),  -- 0=Sunday, 1=Monday, etc.

    -- Monthly health check settings
    monthly_enabled BOOLEAN DEFAULT true,
    monthly_day INTEGER DEFAULT 1 CHECK (monthly_day >= 1 AND monthly_day <= 28),  -- 1-28 to avoid month-end issues

    -- Timezone for scheduling
    timezone TEXT DEFAULT 'America/New_York',

    -- Last run timestamps
    last_weekly_run TIMESTAMPTZ,
    last_monthly_run TIMESTAMPTZ,
    next_scheduled_run TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_s2e_schedule_config_user_id ON s2e_schedule_config(user_id);
CREATE INDEX IF NOT EXISTS idx_s2e_schedule_config_enabled ON s2e_schedule_config(weekly_enabled, monthly_enabled);

-- RLS Policies
ALTER TABLE s2e_schedule_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own S2E schedule config"
    ON s2e_schedule_config FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own S2E schedule config"
    ON s2e_schedule_config FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own S2E schedule config"
    ON s2e_schedule_config FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own S2E schedule config"
    ON s2e_schedule_config FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_s2e_schedule_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_s2e_schedule_config_updated_at
    BEFORE UPDATE ON s2e_schedule_config
    FOR EACH ROW
    EXECUTE FUNCTION update_s2e_schedule_config_updated_at();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE s2e_schedule_config IS 'User configuration for automated S2E health check generation';
COMMENT ON COLUMN s2e_schedule_config.weekly_day IS 'Day of week for weekly checks: 0=Sunday through 6=Saturday';
COMMENT ON COLUMN s2e_schedule_config.monthly_day IS 'Day of month for monthly checks: 1-28 to avoid month-end issues';
COMMENT ON COLUMN s2e_schedule_config.timezone IS 'IANA timezone string for scheduling (e.g., America/New_York)';
