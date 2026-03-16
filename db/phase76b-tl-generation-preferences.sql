-- ===========================================
-- PHASE 76b: TL Generation Preferences
-- ===========================================
-- Adds LLM model and context asset preferences to thought_leadership_profiles.
-- Supports per-user defaults with per-generation override.

-- 1. Add preference columns
ALTER TABLE thought_leadership_profiles
    ADD COLUMN IF NOT EXISTS preferred_llm_provider TEXT,
    ADD COLUMN IF NOT EXISTS preferred_llm_model TEXT,
    ADD COLUMN IF NOT EXISTS preferred_voice_dna_id UUID REFERENCES context_assets(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS preferred_icp_id UUID REFERENCES context_assets(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS preferred_business_profile_id UUID REFERENCES context_assets(id) ON DELETE SET NULL;

COMMENT ON COLUMN thought_leadership_profiles.preferred_llm_provider IS 'User preferred LLM provider for TL generation (anthropic, openai, google). Null = use agent default.';
COMMENT ON COLUMN thought_leadership_profiles.preferred_llm_model IS 'User preferred LLM model ID (e.g., claude-opus-4-5-20251101). Null = use agent default.';
COMMENT ON COLUMN thought_leadership_profiles.preferred_voice_dna_id IS 'User preferred Voice DNA context asset for TL generation. Null = use agent mapping default.';
COMMENT ON COLUMN thought_leadership_profiles.preferred_icp_id IS 'User preferred ICP context asset for TL generation. Null = use agent mapping default.';
COMMENT ON COLUMN thought_leadership_profiles.preferred_business_profile_id IS 'User preferred Business Profile context asset for TL generation. Null = use agent mapping default.';
