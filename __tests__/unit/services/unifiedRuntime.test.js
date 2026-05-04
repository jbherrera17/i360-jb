jest.mock('../../../server/services/runtimeFeatureFlags', () => ({
  resolveRuntimeControls: jest.fn()
}));

jest.mock('../../../server/services/runtimeProfileRouter', () => ({
  resolveExecutionProfile: jest.fn(),
  getProfilePolicy: jest.fn()
}));

jest.mock('../../../server/services/runtimeIsolation', () => ({
  runWithIsolation: jest.fn(),
  getIsolationStatus: jest.fn().mockReturnValue({ bulkheads: {}, circuits: {} })
}));

const runtimeFlags = require('../../../server/services/runtimeFeatureFlags');
const profileRouter = require('../../../server/services/runtimeProfileRouter');
const runtimeIsolation = require('../../../server/services/runtimeIsolation');
const unifiedRuntime = require('../../../server/services/unifiedRuntime');

describe('unifiedRuntime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('short-circuits when module kill switch is enabled', async () => {
    runtimeFlags.resolveRuntimeControls.mockResolvedValueOnce({
      backboneEnabled: true,
      shadowEnabled: false,
      killSwitch: true,
      profileOverride: null,
      sources: {}
    });

    // Source reads `profileDecision.blocked` before checking killSwitch (they
    // share the same branch via OR), so the profile router still has to
    // return a usable shape even on the kill-switch path.
    profileRouter.resolveExecutionProfile.mockReturnValueOnce({
      blocked: false,
      profile: 'fast_direct',
      reason: 'module_policy_actions'
    });

    const result = await unifiedRuntime.execute({
      supabase: {},
      module: 'actions'
    });

    expect(result.status).toBe('blocked');
    expect(result.error.code).toBe('RUNTIME_KILL_SWITCH');
  });

  test('executes operation and returns runtime metadata', async () => {
    runtimeFlags.resolveRuntimeControls.mockResolvedValueOnce({
      backboneEnabled: true,
      shadowEnabled: false,
      killSwitch: false,
      profileOverride: null,
      sources: {}
    });

    profileRouter.resolveExecutionProfile.mockReturnValueOnce({
      blocked: false,
      profile: 'fast_direct',
      reason: 'module_policy_actions'
    });

    profileRouter.getProfilePolicy.mockReturnValueOnce({
      timeout_ms: 10000,
      retry_count: 0,
      max_tokens: 1024
    });

    runtimeIsolation.runWithIsolation.mockImplementationOnce(async (_ctx, op) => op());

    const result = await unifiedRuntime.execute({
      supabase: {},
      module: 'actions',
      operation: async () => ({
        content: 'ok',
        usage: { total_tokens: 12 },
        model: 'claude-sonnet-4-5-20250929',
        provider: 'anthropic'
      })
    });

    expect(result.status).toBe('success');
    expect(result.content).toBe('ok');
    expect(result.runtime.module).toBe('actions');
    expect(result.runtime.profile_used).toBe('fast_direct');
  });
});
