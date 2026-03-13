const {
  resolveExecutionProfile,
  getProfilePolicy
} = require('../../../server/services/runtimeProfileRouter');

describe('runtimeProfileRouter', () => {
  test('uses flag override before module policy', () => {
    const result = resolveExecutionProfile(
      { module: 'actions', profile_hint: 'fast_direct' },
      { killSwitch: false, profileOverride: 'agent_full' }
    );

    expect(result.profile).toBe('agent_full');
    expect(result.reason).toBe('flag_override');
  });

  test('returns blocked when kill switch enabled', () => {
    const result = resolveExecutionProfile(
      { module: 'agents' },
      { killSwitch: true }
    );

    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('kill_switch');
  });

  test('defaults actions to fast_direct for low risk', () => {
    const result = resolveExecutionProfile(
      { module: 'actions', risk_level: 'low', tools_required: false, requires_rich_context: false },
      { killSwitch: false }
    );

    expect(result.profile).toBe('fast_direct');
  });

  test('escalates actions to agent_full for high risk', () => {
    const result = resolveExecutionProfile(
      { module: 'actions', risk_level: 'high' },
      { killSwitch: false }
    );

    expect(result.profile).toBe('agent_full');
  });

  test('applies latency budget to policy timeout', () => {
    const policy = getProfilePolicy('agent_full', { latency_budget_ms: 15000 });

    expect(policy.timeout_ms).toBe(15000);
    expect(policy.retry_count).toBe(2);
  });
});
