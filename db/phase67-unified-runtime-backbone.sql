-- ============================================
-- Insight 360 - Phase 67: Unified Runtime Backbone Flags
-- ============================================
-- Adds optional org targeting and runtime-oriented metadata to feature flags.

ALTER TABLE IF EXISTS feature_flags
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS variant TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_feature_flags_org ON feature_flags(org_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_variant ON feature_flags(feature_key, variant);

COMMENT ON COLUMN feature_flags.org_id IS 'Optional organization scope for runtime and module flags';
COMMENT ON COLUMN feature_flags.variant IS 'Optional variant value for multi-mode features (e.g. profile override)';
COMMENT ON COLUMN feature_flags.metadata IS 'Optional JSON metadata for advanced rollout controls';

-- Runtime backbone controls (global defaults)
INSERT INTO feature_flags (scope, feature_key, feature_name, description, is_enabled, rollout_percentage)
SELECT 'global', 'runtime.backbone.enabled.agents', 'Runtime Backbone: Agents', 'Enable unified runtime backbone for agent execution', false, 100
WHERE NOT EXISTS (
    SELECT 1 FROM feature_flags WHERE scope = 'global' AND feature_key = 'runtime.backbone.enabled.agents'
);

INSERT INTO feature_flags (scope, feature_key, feature_name, description, is_enabled, rollout_percentage)
SELECT 'global', 'runtime.backbone.enabled.actions', 'Runtime Backbone: Actions', 'Enable unified runtime backbone for action execution', false, 100
WHERE NOT EXISTS (
    SELECT 1 FROM feature_flags WHERE scope = 'global' AND feature_key = 'runtime.backbone.enabled.actions'
);

INSERT INTO feature_flags (scope, feature_key, feature_name, description, is_enabled, rollout_percentage)
SELECT 'global', 'runtime.backbone.enabled.workflows', 'Runtime Backbone: Workflows', 'Enable unified runtime backbone for workflow step execution', false, 100
WHERE NOT EXISTS (
    SELECT 1 FROM feature_flags WHERE scope = 'global' AND feature_key = 'runtime.backbone.enabled.workflows'
);

INSERT INTO feature_flags (scope, feature_key, feature_name, description, is_enabled, rollout_percentage)
SELECT 'global', 'runtime.backbone.enabled.skills', 'Runtime Backbone: Skills', 'Enable unified runtime backbone for skill execution paths', false, 100
WHERE NOT EXISTS (
    SELECT 1 FROM feature_flags WHERE scope = 'global' AND feature_key = 'runtime.backbone.enabled.skills'
);

INSERT INTO feature_flags (scope, feature_key, feature_name, description, is_enabled, rollout_percentage)
SELECT 'global', 'runtime.backbone.enabled.execute120', 'Runtime Backbone: Execute120', 'Enable unified runtime backbone for Execute120 step execution', false, 100
WHERE NOT EXISTS (
    SELECT 1 FROM feature_flags WHERE scope = 'global' AND feature_key = 'runtime.backbone.enabled.execute120'
);

-- Shadow mode controls
INSERT INTO feature_flags (scope, feature_key, feature_name, description, is_enabled, rollout_percentage)
SELECT 'global', 'runtime.shadow.enabled.agents', 'Runtime Shadow: Agents', 'Enable shadow execution for agents', false, 100
WHERE NOT EXISTS (
    SELECT 1 FROM feature_flags WHERE scope = 'global' AND feature_key = 'runtime.shadow.enabled.agents'
);

INSERT INTO feature_flags (scope, feature_key, feature_name, description, is_enabled, rollout_percentage)
SELECT 'global', 'runtime.shadow.enabled.actions', 'Runtime Shadow: Actions', 'Enable shadow execution for actions', false, 100
WHERE NOT EXISTS (
    SELECT 1 FROM feature_flags WHERE scope = 'global' AND feature_key = 'runtime.shadow.enabled.actions'
);

INSERT INTO feature_flags (scope, feature_key, feature_name, description, is_enabled, rollout_percentage)
SELECT 'global', 'runtime.shadow.enabled.workflows', 'Runtime Shadow: Workflows', 'Enable shadow execution for workflows', false, 100
WHERE NOT EXISTS (
    SELECT 1 FROM feature_flags WHERE scope = 'global' AND feature_key = 'runtime.shadow.enabled.workflows'
);

INSERT INTO feature_flags (scope, feature_key, feature_name, description, is_enabled, rollout_percentage)
SELECT 'global', 'runtime.shadow.enabled.skills', 'Runtime Shadow: Skills', 'Enable shadow execution for skills', false, 100
WHERE NOT EXISTS (
    SELECT 1 FROM feature_flags WHERE scope = 'global' AND feature_key = 'runtime.shadow.enabled.skills'
);

INSERT INTO feature_flags (scope, feature_key, feature_name, description, is_enabled, rollout_percentage)
SELECT 'global', 'runtime.shadow.enabled.execute120', 'Runtime Shadow: Execute120', 'Enable shadow execution for Execute120', false, 100
WHERE NOT EXISTS (
    SELECT 1 FROM feature_flags WHERE scope = 'global' AND feature_key = 'runtime.shadow.enabled.execute120'
);

-- Kill switches
INSERT INTO feature_flags (scope, feature_key, feature_name, description, is_enabled, rollout_percentage)
SELECT 'global', 'runtime.kill_switch.agents', 'Runtime Kill Switch: Agents', 'Emergency stop for agent runtime execution', false, 100
WHERE NOT EXISTS (
    SELECT 1 FROM feature_flags WHERE scope = 'global' AND feature_key = 'runtime.kill_switch.agents'
);

INSERT INTO feature_flags (scope, feature_key, feature_name, description, is_enabled, rollout_percentage)
SELECT 'global', 'runtime.kill_switch.actions', 'Runtime Kill Switch: Actions', 'Emergency stop for action runtime execution', false, 100
WHERE NOT EXISTS (
    SELECT 1 FROM feature_flags WHERE scope = 'global' AND feature_key = 'runtime.kill_switch.actions'
);

INSERT INTO feature_flags (scope, feature_key, feature_name, description, is_enabled, rollout_percentage)
SELECT 'global', 'runtime.kill_switch.workflows', 'Runtime Kill Switch: Workflows', 'Emergency stop for workflow runtime execution', false, 100
WHERE NOT EXISTS (
    SELECT 1 FROM feature_flags WHERE scope = 'global' AND feature_key = 'runtime.kill_switch.workflows'
);

INSERT INTO feature_flags (scope, feature_key, feature_name, description, is_enabled, rollout_percentage)
SELECT 'global', 'runtime.kill_switch.skills', 'Runtime Kill Switch: Skills', 'Emergency stop for skill runtime execution', false, 100
WHERE NOT EXISTS (
    SELECT 1 FROM feature_flags WHERE scope = 'global' AND feature_key = 'runtime.kill_switch.skills'
);

INSERT INTO feature_flags (scope, feature_key, feature_name, description, is_enabled, rollout_percentage)
SELECT 'global', 'runtime.kill_switch.execute120', 'Runtime Kill Switch: Execute120', 'Emergency stop for Execute120 runtime execution', false, 100
WHERE NOT EXISTS (
    SELECT 1 FROM feature_flags WHERE scope = 'global' AND feature_key = 'runtime.kill_switch.execute120'
);

-- Profile overrides (store selected profile in variant)
INSERT INTO feature_flags (scope, feature_key, feature_name, description, is_enabled, rollout_percentage, variant)
SELECT 'global', 'runtime.profile.override.agents', 'Runtime Profile Override: Agents', 'Optional profile override for agents (variant: agent_full|fast_direct|policy)', false, 100, 'policy'
WHERE NOT EXISTS (
    SELECT 1 FROM feature_flags WHERE scope = 'global' AND feature_key = 'runtime.profile.override.agents'
);

INSERT INTO feature_flags (scope, feature_key, feature_name, description, is_enabled, rollout_percentage, variant)
SELECT 'global', 'runtime.profile.override.actions', 'Runtime Profile Override: Actions', 'Optional profile override for actions (variant: agent_full|fast_direct|policy)', false, 100, 'policy'
WHERE NOT EXISTS (
    SELECT 1 FROM feature_flags WHERE scope = 'global' AND feature_key = 'runtime.profile.override.actions'
);

INSERT INTO feature_flags (scope, feature_key, feature_name, description, is_enabled, rollout_percentage, variant)
SELECT 'global', 'runtime.profile.override.workflows', 'Runtime Profile Override: Workflows', 'Optional profile override for workflows (variant: agent_full|fast_direct|workflow_step|policy)', false, 100, 'policy'
WHERE NOT EXISTS (
    SELECT 1 FROM feature_flags WHERE scope = 'global' AND feature_key = 'runtime.profile.override.workflows'
);

INSERT INTO feature_flags (scope, feature_key, feature_name, description, is_enabled, rollout_percentage, variant)
SELECT 'global', 'runtime.profile.override.skills', 'Runtime Profile Override: Skills', 'Optional profile override for skills (variant: skill_test|fast_direct|policy)', false, 100, 'policy'
WHERE NOT EXISTS (
    SELECT 1 FROM feature_flags WHERE scope = 'global' AND feature_key = 'runtime.profile.override.skills'
);

INSERT INTO feature_flags (scope, feature_key, feature_name, description, is_enabled, rollout_percentage, variant)
SELECT 'global', 'runtime.profile.override.execute120', 'Runtime Profile Override: Execute120', 'Optional profile override for Execute120 (variant: workflow_step|fast_direct|policy)', false, 100, 'policy'
WHERE NOT EXISTS (
    SELECT 1 FROM feature_flags WHERE scope = 'global' AND feature_key = 'runtime.profile.override.execute120'
);
