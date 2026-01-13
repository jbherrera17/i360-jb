-- ============================================================================
-- Phase 25: Model Availability Check Schema
-- ============================================================================
-- Stores LLM provider availability check results and scheduler configuration
-- Created: January 2026

-- Model availability check results
CREATE TABLE IF NOT EXISTS model_availability_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('available', 'deprecated', 'unavailable', 'auth_error', 'rate_limited')),
    error_message TEXT,
    response_time_ms INTEGER,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_model_checks_checked ON model_availability_checks(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_checks_provider ON model_availability_checks(provider, checked_at DESC);

-- Scheduler configuration (single row)
CREATE TABLE IF NOT EXISTS model_check_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_time TIME DEFAULT '06:00:00',
    timezone TEXT DEFAULT 'America/New_York',
    is_enabled BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config if not exists
INSERT INTO model_check_config (id, schedule_time, timezone, is_enabled)
VALUES ('00000000-0000-0000-0000-000000000001', '06:00:00', 'America/New_York', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE model_availability_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_check_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all authenticated users to read check results
CREATE POLICY IF NOT EXISTS "Anyone can read model availability checks"
    ON model_availability_checks FOR SELECT
    USING (true);

-- Only service role can insert/update checks (backend only)
CREATE POLICY IF NOT EXISTS "Service role can manage model checks"
    ON model_availability_checks FOR ALL
    USING (auth.role() = 'service_role');

-- Anyone can read config, but only service role can update
CREATE POLICY IF NOT EXISTS "Anyone can read model check config"
    ON model_check_config FOR SELECT
    USING (true);

CREATE POLICY IF NOT EXISTS "Service role can manage model check config"
    ON model_check_config FOR ALL
    USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON model_availability_checks TO authenticated;
GRANT SELECT ON model_check_config TO authenticated;

COMMENT ON TABLE model_availability_checks IS 'Stores LLM provider availability check results from daily/on-demand checks';
COMMENT ON TABLE model_check_config IS 'Configuration for the model availability check scheduler';
