const { randomUUID } = require('crypto');
const logger = require('./logger');
const runtimeFlags = require('./runtimeFeatureFlags');
const profileRouter = require('./runtimeProfileRouter');
const runtimeIsolation = require('./runtimeIsolation');

class UnifiedRuntimeService {
  constructor() {
    this.stats = {
      requests: 0,
      errors: 0,
      blocked: 0,
      shadowRuns: 0,
      shadowDivergence: 0,
      byModule: {},
      byProfile: {}
    };
  }

  _incrementStat(moduleName, profile, field = 'requests') {
    if (field === 'requests') {
      this.stats.requests += 1;
    } else if (field === 'errors') {
      this.stats.errors += 1;
    } else if (field === 'blocked') {
      this.stats.blocked += 1;
    }

    const safeModule = moduleName || 'unknown';
    this.stats.byModule[safeModule] = this.stats.byModule[safeModule] || {
      requests: 0,
      errors: 0,
      blocked: 0
    };

    if (field === 'requests') this.stats.byModule[safeModule].requests += 1;
    if (field === 'errors') this.stats.byModule[safeModule].errors += 1;
    if (field === 'blocked') this.stats.byModule[safeModule].blocked += 1;

    if (profile) {
      this.stats.byProfile[profile] = (this.stats.byProfile[profile] || 0) + 1;
    }
  }

  _normalizeError(error) {
    if (!error) return null;
    if (typeof error === 'string') return { message: error };

    return {
      message: error.message || 'Unknown error',
      code: error.code || null
    };
  }

  _toEnvelope(raw, context) {
    const content = raw?.content ?? raw?.response ??
      (typeof raw?.output === 'string' ? raw.output : null) ??
      raw?.output_data?.response ??
      '';

    const usage = raw?.usage || {
      prompt_tokens: raw?.prompt_tokens || 0,
      completion_tokens: raw?.completion_tokens || 0,
      total_tokens: raw?.total_tokens || 0
    };

    const provider = raw?.provider || raw?.ai_engine_used || context.provider || null;
    const model = raw?.model || raw?.model_used || context.model || null;

    const explicitStatus = raw?.status;
    const hasError = !!raw?.error;
    const status = explicitStatus || (hasError ? 'error' : 'success');

    return {
      content,
      structured_output: raw?.structured_output || raw?.parsedOutput || null,
      usage,
      duration_ms: raw?.duration_ms || context.durationMs || 0,
      provider,
      model,
      status,
      error: this._normalizeError(raw?.error),
      trace_id: context.traceId,
      profile_used: context.profile,
      raw
    };
  }

  _buildRuntimeMeta({ traceId, moduleName, profile, controls, policy, profileReason }) {
    return {
      trace_id: traceId,
      module: moduleName,
      profile_used: profile,
      profile_reason: profileReason,
      policy,
      flags: {
        backbone_enabled: controls.backboneEnabled,
        shadow_enabled: controls.shadowEnabled,
        kill_switch: controls.killSwitch,
        profile_override: controls.profileOverride || null
      }
    };
  }

  async _checkOrgQuota(request) {
    if (!request?.supabase || !request?.org_id || !request?.quota_resource_type) {
      return { allowed: true };
    }

    try {
      const { data, error } = await request.supabase.rpc('check_org_limits', {
        p_org_id: request.org_id,
        p_resource_type: request.quota_resource_type
      });

      if (error || !Array.isArray(data) || data.length === 0) {
        return { allowed: true };
      }

      const limit = data[0];
      if (limit.within_limits === false) {
        return {
          allowed: false,
          reason: `Organization limit reached for ${request.quota_resource_type}`,
          code: 'ORG_LIMIT_REACHED',
          details: limit
        };
      }

      return { allowed: true, details: limit };
    } catch {
      // Quota checks should not break execution if the RPC is unavailable.
      return { allowed: true };
    }
  }

  _compareShadow(primary, shadow) {
    const primaryText = String(primary?.content || '').trim();
    const shadowText = String(shadow?.content || '').trim();

    return {
      different_content: primaryText !== shadowText,
      primary_length: primaryText.length,
      shadow_length: shadowText.length
    };
  }

  async _runShadow(request, context, primaryEnvelope) {
    if (!request.shadowOperation || typeof request.shadowOperation !== 'function') {
      return;
    }

    this.stats.shadowRuns += 1;

    try {
      const rawShadow = await request.shadowOperation({
        profile: context.profile,
        trace_id: context.traceId,
        policy: context.policy,
        request
      });

      const shadowEnvelope = this._toEnvelope(rawShadow, context);
      const comparison = this._compareShadow(primaryEnvelope, shadowEnvelope);
      if (comparison.different_content) {
        this.stats.shadowDivergence += 1;
      }
    } catch (error) {
      logger.warn('Runtime shadow execution failed', {
        trace_id: context.traceId,
        module: context.moduleName,
        error: error.message
      });
    }
  }

  async execute(request = {}) {
    const moduleName = request.module || 'unknown';
    const traceId = randomUUID();
    const startedAt = Date.now();

    this._incrementStat(moduleName, null, 'requests');

    try {
      const controls = await runtimeFlags.resolveRuntimeControls({
        supabase: request.supabase,
        module: moduleName,
        userId: request.user_id || null,
        departmentId: request.department_id || null,
        orgId: request.org_id || null
      });

      const profileDecision = profileRouter.resolveExecutionProfile(request, controls);
      if (profileDecision.blocked || controls.killSwitch) {
        this._incrementStat(moduleName, null, 'blocked');
        return {
          content: '',
          structured_output: null,
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          duration_ms: Date.now() - startedAt,
          provider: null,
          model: null,
          status: 'blocked',
          error: {
            message: `Runtime kill switch is enabled for module "${moduleName}"`,
            code: 'RUNTIME_KILL_SWITCH'
          },
          trace_id: traceId,
          profile_used: null,
          raw: null,
          runtime: this._buildRuntimeMeta({
            traceId,
            moduleName,
            profile: null,
            controls,
            policy: null,
            profileReason: 'kill_switch'
          })
        };
      }

      const quotaCheck = await this._checkOrgQuota(request);
      if (!quotaCheck.allowed) {
        this._incrementStat(moduleName, null, 'blocked');
        return {
          content: '',
          structured_output: null,
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          duration_ms: Date.now() - startedAt,
          provider: null,
          model: null,
          status: 'blocked',
          error: {
            message: quotaCheck.reason,
            code: quotaCheck.code,
            details: quotaCheck.details
          },
          trace_id: traceId,
          profile_used: null,
          raw: null,
          runtime: {
            trace_id: traceId,
            module: moduleName,
            quota: quotaCheck.details || null
          }
        };
      }

      const profile = profileDecision.profile;
      const policy = profileRouter.getProfilePolicy(profile, request);
      this.stats.byProfile[profile] = (this.stats.byProfile[profile] || 0) + 1;

      const useLegacyPrimary = !!(!controls.backboneEnabled && request.legacyOperation);
      const operation = useLegacyPrimary
        ? request.legacyOperation
        : request.operation || request.legacyOperation;
      const inferredShadowOperation = request.shadowOperation ||
        (controls.shadowEnabled
          ? (useLegacyPrimary ? request.operation : request.legacyOperation)
          : null);

      if (typeof operation !== 'function') {
        throw new Error(`No execution operation provided for module "${moduleName}"`);
      }

      const raw = await runtimeIsolation.runWithIsolation(
        {
          module: moduleName,
          provider: request.provider_hint || 'default'
        },
        async () => operation({
          profile,
          policy,
          trace_id: traceId,
          controls,
          request
        }),
        {
          timeoutMs: policy.timeout_ms,
          retryCount: policy.retry_count
        }
      );

      const envelope = this._toEnvelope(raw, {
        traceId,
        profile,
        provider: request.provider_hint,
        model: request.model,
        durationMs: Date.now() - startedAt
      });

      const runtimeMeta = this._buildRuntimeMeta({
        traceId,
        moduleName,
        profile,
        controls,
        policy,
        profileReason: profileDecision.reason
      });

      if (controls.shadowEnabled && inferredShadowOperation) {
        setImmediate(() => {
          this._runShadow({
            ...request,
            shadowOperation: inferredShadowOperation
          }, {
            traceId,
            moduleName,
            profile,
            policy
          }, envelope);
        });
      }

      return {
        ...envelope,
        runtime: runtimeMeta
      };
    } catch (error) {
      this._incrementStat(moduleName, null, 'errors');
      const runtimeMeta = {
        trace_id: traceId,
        module: moduleName
      };

      return {
        content: '',
        structured_output: null,
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        duration_ms: Date.now() - startedAt,
        provider: request.provider_hint || null,
        model: request.model || null,
        status: 'error',
        error: this._normalizeError(error),
        trace_id: traceId,
        profile_used: null,
        raw: null,
        runtime: runtimeMeta
      };
    }
  }

  async stream(request = {}, callbacks = {}) {
    const moduleName = request.module || 'unknown';
    const traceId = randomUUID();
    const startedAt = Date.now();

    this._incrementStat(moduleName, null, 'requests');

    try {
      const controls = await runtimeFlags.resolveRuntimeControls({
        supabase: request.supabase,
        module: moduleName,
        userId: request.user_id || null,
        departmentId: request.department_id || null,
        orgId: request.org_id || null
      });

      if (controls.killSwitch) {
        this._incrementStat(moduleName, null, 'blocked');
        const error = new Error(`Runtime kill switch is enabled for module "${moduleName}"`);
        error.code = 'RUNTIME_KILL_SWITCH';
        if (callbacks.onError) callbacks.onError(error, { trace_id: traceId, module: moduleName });
        return {
          status: 'blocked',
          trace_id: traceId,
          runtime: {
            trace_id: traceId,
            module: moduleName,
            flags: { kill_switch: true }
          }
        };
      }

      const quotaCheck = await this._checkOrgQuota(request);
      if (!quotaCheck.allowed) {
        this._incrementStat(moduleName, null, 'blocked');
        const error = new Error(quotaCheck.reason);
        error.code = quotaCheck.code;
        error.details = quotaCheck.details;
        if (callbacks.onError) callbacks.onError(error, { trace_id: traceId, module: moduleName });
        return {
          status: 'blocked',
          trace_id: traceId,
          runtime: {
            trace_id: traceId,
            module: moduleName,
            quota: quotaCheck.details || null
          }
        };
      }

      const profileDecision = profileRouter.resolveExecutionProfile(request, controls);
      const profile = profileDecision.profile;
      const policy = profileRouter.getProfilePolicy(profile, request);
      this.stats.byProfile[profile] = (this.stats.byProfile[profile] || 0) + 1;

      const operation = (!controls.backboneEnabled && request.legacyStreamOperation)
        ? request.legacyStreamOperation
        : request.streamOperation || request.legacyStreamOperation;

      if (typeof operation !== 'function') {
        throw new Error(`No stream operation provided for module "${moduleName}"`);
      }

      const raw = await runtimeIsolation.runWithIsolation(
        {
          module: moduleName,
          provider: request.provider_hint || 'default'
        },
        async () => {
          return new Promise((resolve, reject) => {
            operation({
              profile,
              policy,
              trace_id: traceId,
              controls,
              onToken: (token) => {
                if (callbacks.onToken) callbacks.onToken(token);
              },
              onComplete: (result) => resolve(result),
              onError: (error) => reject(error)
            });
          });
        },
        {
          timeoutMs: policy.timeout_ms,
          retryCount: 0
        }
      );

      const envelope = this._toEnvelope(raw, {
        traceId,
        profile,
        provider: request.provider_hint,
        model: request.model,
        durationMs: Date.now() - startedAt
      });

      const runtimeMeta = this._buildRuntimeMeta({
        traceId,
        moduleName,
        profile,
        controls,
        policy,
        profileReason: profileDecision.reason
      });

      const finalResult = {
        ...envelope,
        runtime: runtimeMeta
      };

      if (callbacks.onComplete) callbacks.onComplete(finalResult);
      return finalResult;
    } catch (error) {
      this._incrementStat(moduleName, null, 'errors');
      if (callbacks.onError) callbacks.onError(error, { trace_id: traceId, module: moduleName });

      return {
        status: 'error',
        trace_id: traceId,
        error: this._normalizeError(error),
        runtime: {
          trace_id: traceId,
          module: moduleName
        }
      };
    }
  }

  async executeStep(request = {}) {
    return this.execute({
      ...request,
      module: request.module || 'workflows',
      profile_hint: request.profile_hint || 'workflow_step'
    });
  }

  getStatus() {
    return {
      stats: this.stats,
      isolation: runtimeIsolation.getIsolationStatus()
    };
  }
}

module.exports = new UnifiedRuntimeService();
