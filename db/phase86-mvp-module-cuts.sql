-- ============================================
-- Phase 86: MVP Module Cuts
-- Disable non-MVP modules to hide them from navigation.
-- These can be re-enabled later by setting is_active = true.
-- ============================================

-- Strategy-to-Execution pipeline (S2E)
UPDATE platform_modules SET is_active = false WHERE id = 'execute120';
UPDATE platform_modules SET is_active = false WHERE id = 'align120';
UPDATE platform_modules SET is_active = false WHERE id = 's2e';
UPDATE platform_modules SET is_active = false WHERE id = 'strategy_governance';

-- Content creation tools
UPDATE platform_modules SET is_active = false WHERE id = 'thought_leadership';
UPDATE platform_modules SET is_active = false WHERE id = 'research_studio';
UPDATE platform_modules SET is_active = false WHERE id = 'briefing';
UPDATE platform_modules SET is_active = false WHERE id = 'ai_digest';
UPDATE platform_modules SET is_active = false WHERE id = 'social_publishing';

-- Prompt Transformer (page doesn't exist)
UPDATE platform_modules SET is_active = false WHERE id = 'prompt_transformer';
