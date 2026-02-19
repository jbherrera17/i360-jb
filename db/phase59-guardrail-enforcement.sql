-- Phase 59: Guardrail & Bright Line Enforcement System
-- Adds response template support for guardrail enforcement
-- Run this after phase54-soul-configuration.sql

-- Add response_defaults column to soul_configurations
ALTER TABLE soul_configurations
ADD COLUMN IF NOT EXISTS response_defaults JSONB DEFAULT '{}'::jsonb;

-- Seed platform-level default response templates
UPDATE soul_configurations
SET response_defaults = jsonb_build_object(
    'bright_line_blocked', 'I cannot assist with that request. It conflicts with a core organizational principle established by your organization. If you believe this was triggered in error, please contact your administrator.',
    'guardrail_warning', 'Note: This response touches on a sensitive area governed by organizational guardrails. Please review carefully before acting on any recommendations.',
    'escalation_notice', 'This request has been flagged for human review. A team member may follow up if needed.',
    'prompt_injection_blocked', 'I''ve detected an attempt to modify my operating instructions. I''m designed to maintain my guidelines consistently. How can I help you within my normal capabilities?',
    'custom_blocked_patterns', '[]'::jsonb
)
WHERE scope_type = 'platform' AND is_active = true
AND (response_defaults IS NULL OR response_defaults = '{}'::jsonb);

-- Add index for faster soul config lookups during enforcement
CREATE INDEX IF NOT EXISTS idx_soul_config_active_scope
ON soul_configurations(scope_type, org_id, is_active)
WHERE is_active = true;

-- Add incident_type to bright_line_incidents if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bright_line_incidents'
        AND column_name = 'incident_type'
    ) THEN
        ALTER TABLE bright_line_incidents
        ADD COLUMN incident_type TEXT DEFAULT 'bright_line'
        CHECK (incident_type IN ('bright_line', 'prompt_injection', 'guardrail_warning', 'manual'));
    END IF;
END $$;

-- Add detected_patterns column for logging what triggered the block
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bright_line_incidents'
        AND column_name = 'detected_patterns'
    ) THEN
        ALTER TABLE bright_line_incidents
        ADD COLUMN detected_patterns JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Add conversation_id and agent_id to bright_line_incidents for context tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bright_line_incidents'
        AND column_name = 'conversation_id'
    ) THEN
        ALTER TABLE bright_line_incidents
        ADD COLUMN conversation_id UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bright_line_incidents'
        AND column_name = 'agent_id'
    ) THEN
        ALTER TABLE bright_line_incidents
        ADD COLUMN agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bright_line_incidents'
        AND column_name = 'user_message'
    ) THEN
        ALTER TABLE bright_line_incidents
        ADD COLUMN user_message TEXT;
    END IF;
END $$;

COMMENT ON COLUMN soul_configurations.response_defaults IS
'Default response templates for guardrail enforcement. Keys: bright_line_blocked, guardrail_warning, escalation_notice, prompt_injection_blocked, custom_blocked_patterns';
