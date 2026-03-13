const SUPPORTED_PROFILES = new Set([
  'agent_full',
  'fast_direct',
  'workflow_step',
  'skill_test',
  'policy'
]);

const PROFILE_POLICIES = {
  agent_full: {
    timeout_ms: 90000,
    retry_count: 2,
    max_tokens: 8192
  },
  fast_direct: {
    timeout_ms: 30000,
    retry_count: 1,
    max_tokens: 4096
  },
  workflow_step: {
    timeout_ms: 45000,
    retry_count: 1,
    max_tokens: 4096
  },
  skill_test: {
    timeout_ms: 60000,
    retry_count: 1,
    max_tokens: 4096
  },
  policy: {
    timeout_ms: 30000,
    retry_count: 1,
    max_tokens: 4096
  }
};

function isValidProfile(profile) {
  return typeof profile === 'string' && SUPPORTED_PROFILES.has(profile);
}

function needsAgentFull(request) {
  const risk = String(request.risk_level || '').toLowerCase();
  if (risk === 'high' || risk === 'critical') return true;

  if (request.tools_required) return true;
  if (request.requires_rich_context) return true;

  const contextRefCount = Array.isArray(request.context_refs)
    ? request.context_refs.length
    : 0;

  if (contextRefCount >= 3) return true;

  return false;
}

function applyLatencyBudget(policy, latencyBudgetMs) {
  if (!latencyBudgetMs || Number.isNaN(Number(latencyBudgetMs))) {
    return policy;
  }

  const budget = Number(latencyBudgetMs);
  if (budget <= 0) return policy;

  return {
    ...policy,
    timeout_ms: Math.min(policy.timeout_ms, budget)
  };
}

function resolveExecutionProfile(request, controls = {}) {
  const moduleName = request.module || 'unknown';

  if (controls.killSwitch) {
    return {
      blocked: true,
      profile: null,
      reason: 'kill_switch'
    };
  }

  // Deterministic order: explicit flag override -> route/module policy -> safe default
  if (isValidProfile(controls.profileOverride) && controls.profileOverride !== 'policy') {
    return {
      blocked: false,
      profile: controls.profileOverride,
      reason: 'flag_override'
    };
  }

  // Route/module policy
  if (isValidProfile(request.profile_hint) && request.profile_hint !== 'policy') {
    return {
      blocked: false,
      profile: request.profile_hint,
      reason: 'request_hint'
    };
  }

  if (moduleName === 'agents') {
    return { blocked: false, profile: 'agent_full', reason: 'module_policy_agents' };
  }

  if (moduleName === 'skills') {
    return { blocked: false, profile: 'skill_test', reason: 'module_policy_skills' };
  }

  if (moduleName === 'workflows' || moduleName === 'execute120') {
    return { blocked: false, profile: 'workflow_step', reason: 'module_policy_workflows' };
  }

  if (moduleName === 'actions') {
    return {
      blocked: false,
      profile: needsAgentFull(request) ? 'agent_full' : 'fast_direct',
      reason: 'module_policy_actions'
    };
  }

  // Safe default
  return {
    blocked: false,
    profile: needsAgentFull(request) ? 'agent_full' : 'fast_direct',
    reason: 'safe_default'
  };
}

function getProfilePolicy(profile, request = {}) {
  const base = PROFILE_POLICIES[profile] || PROFILE_POLICIES.fast_direct;

  const policy = {
    ...base,
    max_tokens: request.max_tokens
      ? Math.min(base.max_tokens, Number(request.max_tokens) || base.max_tokens)
      : base.max_tokens
  };

  return applyLatencyBudget(policy, request.latency_budget_ms);
}

module.exports = {
  SUPPORTED_PROFILES,
  PROFILE_POLICIES,
  resolveExecutionProfile,
  getProfilePolicy,
  isValidProfile
};
