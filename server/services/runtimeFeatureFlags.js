const logger = require('./logger');

const FLAG_SCOPE = {
  USER: 'user',
  DEPARTMENT: 'department',
  ORG: 'org',
  COMPANY: 'company',
  GLOBAL: 'global'
};

const KNOWN_BASE_COLUMNS = new Set([
  'id',
  'scope',
  'department_id',
  'user_id',
  'feature_key',
  'feature_name',
  'description',
  'is_enabled',
  'rollout_percentage',
  'created_at',
  'updated_at'
]);

let cachedFeatureFlagColumns = null;
let lastColumnProbeAt = 0;

function hashToPercent(input) {
  if (!input) return 0;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}

function shouldApplyRollout(flag, userId) {
  if (!flag || !userId) return true;
  const pct = typeof flag.rollout_percentage === 'number'
    ? flag.rollout_percentage
    : 100;

  if (pct >= 100) return true;
  if (pct <= 0) return false;

  return hashToPercent(`${userId}:${flag.feature_key}`) < pct;
}

async function detectFeatureFlagColumns(supabase) {
  const now = Date.now();
  if (cachedFeatureFlagColumns && now - lastColumnProbeAt < 5 * 60 * 1000) {
    return cachedFeatureFlagColumns;
  }

  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .limit(1);

    if (!error && Array.isArray(data) && data.length > 0) {
      cachedFeatureFlagColumns = new Set(Object.keys(data[0]));
    } else {
      cachedFeatureFlagColumns = new Set([...KNOWN_BASE_COLUMNS]);
    }
  } catch {
    cachedFeatureFlagColumns = new Set([...KNOWN_BASE_COLUMNS]);
  }

  lastColumnProbeAt = now;
  return cachedFeatureFlagColumns;
}

function parseProfileOverride(rawFlag) {
  if (!rawFlag) return null;
  const candidate = rawFlag.profile_override || rawFlag.variant || rawFlag.value ||
    rawFlag.metadata?.profile_override || rawFlag.metadata?.variant;

  if (!candidate) return null;

  const normalized = String(candidate).toLowerCase();
  if (['agent_full', 'fast_direct', 'policy', 'workflow_step', 'skill_test'].includes(normalized)) {
    return normalized;
  }

  return null;
}

async function resolveFromFeatureFlagsTable(supabase, featureKey, context, options = {}) {
  const { includeGlobal = true } = options;
  const { userId, departmentId, orgId } = context;
  const columns = await detectFeatureFlagColumns(supabase);

  const checkScope = async (scope, extraFilters = {}) => {
    let query = supabase
      .from('feature_flags')
      .select('*')
      .eq('feature_key', featureKey)
      .eq('scope', scope)
      .limit(1);

    for (const [column, value] of Object.entries(extraFilters)) {
      if (value !== null && value !== undefined && columns.has(column)) {
        query = query.eq(column, value);
      }
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) return null;

    const flag = data[0];
    const enabled = !!flag.is_enabled && shouldApplyRollout(flag, userId);
    return {
      enabled,
      scope,
      source: `feature_flags.${scope}`,
      rollout_percentage: flag.rollout_percentage ?? 100,
      variant: flag.variant || null,
      profile_override: parseProfileOverride(flag)
    };
  };

  if (userId && columns.has('user_id')) {
    const userFlag = await checkScope(FLAG_SCOPE.USER, { user_id: userId });
    if (userFlag) return userFlag;
  }

  if (departmentId && columns.has('department_id')) {
    const deptFlag = await checkScope(FLAG_SCOPE.DEPARTMENT, { department_id: departmentId });
    if (deptFlag) return deptFlag;
  }

  if (orgId && columns.has('org_id')) {
    const orgFlag = await checkScope(FLAG_SCOPE.ORG, { org_id: orgId });
    if (orgFlag) return orgFlag;

    const companyFlag = await checkScope(FLAG_SCOPE.COMPANY, { org_id: orgId });
    if (companyFlag) return companyFlag;
  }

  if (includeGlobal) {
    const globalFlag = await checkScope(FLAG_SCOPE.GLOBAL);
    if (globalFlag) return globalFlag;
  }

  return null;
}

async function resolveGlobalFromFeatureFlagsTable(supabase, featureKey, context) {
  return resolveFromFeatureFlagsTable(supabase, featureKey, context, { includeGlobal: true });
}

function parseOrgFlagValue(rawValue, userId, featureKey) {
  if (rawValue === undefined || rawValue === null) return null;

  if (typeof rawValue === 'boolean') {
    return {
      enabled: rawValue,
      scope: FLAG_SCOPE.ORG,
      source: 'organizations.feature_flags',
      rollout_percentage: 100,
      variant: null,
      profile_override: null
    };
  }

  if (typeof rawValue === 'string') {
    const normalized = rawValue.toLowerCase();
    if (['agent_full', 'fast_direct', 'policy', 'workflow_step', 'skill_test'].includes(normalized)) {
      return {
        enabled: true,
        scope: FLAG_SCOPE.ORG,
        source: 'organizations.feature_flags',
        rollout_percentage: 100,
        variant: normalized,
        profile_override: normalized
      };
    }

    return {
      enabled: rawValue === 'true',
      scope: FLAG_SCOPE.ORG,
      source: 'organizations.feature_flags',
      rollout_percentage: 100,
      variant: null,
      profile_override: null
    };
  }

  if (typeof rawValue === 'object') {
    const rollout = typeof rawValue.rollout_percentage === 'number'
      ? rawValue.rollout_percentage
      : 100;

    const enabledByRollout = rollout >= 100
      ? true
      : hashToPercent(`${userId || 'anon'}:${featureKey}`) < Math.max(0, rollout);

    const enabled = rawValue.enabled !== false && enabledByRollout;

    const variant = rawValue.variant || rawValue.value || null;
    const profileOverride = rawValue.profile_override || variant || null;

    return {
      enabled,
      scope: FLAG_SCOPE.ORG,
      source: 'organizations.feature_flags',
      rollout_percentage: rollout,
      variant,
      profile_override: parseProfileOverride({ profile_override: profileOverride })
    };
  }

  return null;
}

async function resolveFromOrgFeatureJson(supabase, featureKey, context) {
  if (!context.orgId) return null;

  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('feature_flags')
      .eq('id', context.orgId)
      .single();

    if (error || !data?.feature_flags) return null;

    const raw = data.feature_flags[featureKey];
    return parseOrgFlagValue(raw, context.userId, featureKey);
  } catch (error) {
    logger.warn('Org feature flag lookup failed', { featureKey, error: error.message });
    return null;
  }
}

async function resolveFeatureFlag({ supabase, featureKey, userId = null, departmentId = null, orgId = null }) {
  if (!supabase || !featureKey) {
    return {
      enabled: false,
      scope: 'not_found',
      source: 'invalid_input',
      rollout_percentage: 0,
      variant: null,
      profile_override: null
    };
  }

  const context = { userId, departmentId, orgId };

  try {
    const tableResolution = await resolveFromFeatureFlagsTable(supabase, featureKey, context, { includeGlobal: false });
    if (tableResolution) {
      return tableResolution;
    }

    const orgJsonResolution = await resolveFromOrgFeatureJson(supabase, featureKey, context);
    if (orgJsonResolution) {
      return orgJsonResolution;
    }

    const globalResolution = await resolveGlobalFromFeatureFlagsTable(supabase, featureKey, context);
    if (globalResolution) {
      return globalResolution;
    }
  } catch (error) {
    logger.error('Feature flag resolution failed', { featureKey, error: error.message });
  }

  return {
    enabled: false,
    scope: 'not_found',
    source: 'not_found',
    rollout_percentage: 0,
    variant: null,
    profile_override: null
  };
}

async function resolveRuntimeControls({
  supabase,
  module,
  userId = null,
  departmentId = null,
  orgId = null
}) {
  const context = { supabase, userId, departmentId, orgId };

  const [
    backbone,
    shadow,
    killSwitch,
    profileOverride
  ] = await Promise.all([
    resolveFeatureFlag({ ...context, featureKey: `runtime.backbone.enabled.${module}` }),
    resolveFeatureFlag({ ...context, featureKey: `runtime.shadow.enabled.${module}` }),
    resolveFeatureFlag({ ...context, featureKey: `runtime.kill_switch.${module}` }),
    resolveFeatureFlag({ ...context, featureKey: `runtime.profile.override.${module}` })
  ]);

  return {
    backboneEnabled: backbone.enabled,
    shadowEnabled: shadow.enabled,
    killSwitch: killSwitch.enabled,
    profileOverride: profileOverride.profile_override || profileOverride.variant || null,
    sources: {
      backbone,
      shadow,
      killSwitch,
      profileOverride
    }
  };
}

module.exports = {
  resolveFeatureFlag,
  resolveRuntimeControls,
  FLAG_SCOPE
};
