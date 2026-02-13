-- ============================================
-- Phase 56: Branding Expansion
-- Adds app naming and AI assistant branding columns to org_branding
-- ============================================

-- App naming (replaces "Insight 360" per org)
ALTER TABLE org_branding ADD COLUMN IF NOT EXISTS app_name TEXT;
ALTER TABLE org_branding ADD COLUMN IF NOT EXISTS app_tagline TEXT;

-- AI assistant branding (replaces "Higgins" per org)
ALTER TABLE org_branding ADD COLUMN IF NOT EXISTS ai_assistant_name TEXT;
ALTER TABLE org_branding ADD COLUMN IF NOT EXISTS ai_assistant_avatar_url TEXT;

COMMENT ON COLUMN org_branding.app_name IS 'Custom app name replacing "Insight 360" in sidebar and page titles';
COMMENT ON COLUMN org_branding.app_tagline IS 'Custom tagline replacing "AI-Powered Command Center"';
COMMENT ON COLUMN org_branding.ai_assistant_name IS 'Custom AI assistant name replacing "Higgins" in chat';
COMMENT ON COLUMN org_branding.ai_assistant_avatar_url IS 'Custom AI assistant avatar URL for chat interface';
