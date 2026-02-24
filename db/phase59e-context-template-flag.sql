-- Phase 59e: Add is_template flag to context_assets
-- Enables visual template indicators on context asset cards
-- Templates are starter assets that should be duplicated and customized

-- Add is_template column
ALTER TABLE context_assets ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;

-- Auto-set for existing assets that have 'template' in their tags
UPDATE context_assets SET is_template = true
WHERE tags @> ARRAY['template']::text[]
  AND is_template = false;

-- Index for efficient template filtering
CREATE INDEX IF NOT EXISTS idx_context_assets_is_template ON context_assets(is_template) WHERE is_template = true;
