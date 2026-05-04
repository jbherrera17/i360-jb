/**
 * INSIGHT 360 - GitHub PR Service
 * Version: 1.0.0
 * Phase: 87 (REQ-003)
 *
 * Wraps @octokit/rest with the operations needed to open a pricing-sync
 * PR against the synergi-website repo. The service is deliberately small:
 *
 *   - openPricingPr(payload, summary, diffMarkdown) → opens a PR
 *   - verifyToken() → daily health check (asserts token can read the repo)
 *
 * Per Decision #4 (REQ-003), authentication is via a fine-grained PAT
 * stored in env. Per Decision #5, the service is invoked auto-on-save
 * but JB always merges manually (Decision #6).
 *
 * Environment:
 *   GITHUB_SYNC_TOKEN        — fine-grained PAT
 *   GITHUB_SYNC_OWNER        — e.g. "jbherrera17"
 *   GITHUB_SYNC_REPO         — e.g. "synergi-website"
 *   GITHUB_SYNC_BASE_BRANCH  — e.g. "main"
 *   GITHUB_SYNC_DATA_PATH    — e.g. "data/pricing-tiers.json"
 */

const { Octokit } = require('@octokit/rest');

// ============================================
// Distinct error classes for callers to switch on
// ============================================

class GithubPrError extends Error {
    constructor(message, code, cause) {
        super(message);
        this.name = 'GithubPrError';
        this.code = code;
        if (cause) this.cause = cause;
    }
}

class GithubAuthError extends GithubPrError {
    constructor(message, cause) { super(message, 'AUTH_FAILED', cause); this.name = 'GithubAuthError'; }
}
class GithubPermissionError extends GithubPrError {
    constructor(message, cause) { super(message, 'PERMISSION_DENIED', cause); this.name = 'GithubPermissionError'; }
}
class GithubConflictError extends GithubPrError {
    constructor(message, cause) { super(message, 'CONFLICT', cause); this.name = 'GithubConflictError'; }
}
class GithubNetworkError extends GithubPrError {
    constructor(message, cause) { super(message, 'NETWORK', cause); this.name = 'GithubNetworkError'; }
}
class GithubConfigError extends GithubPrError {
    constructor(message) { super(message, 'CONFIG'); this.name = 'GithubConfigError'; }
}

// ============================================
// Internal helpers
// ============================================

function readEnv() {
    const cfg = {
        token: process.env.GITHUB_SYNC_TOKEN,
        owner: process.env.GITHUB_SYNC_OWNER,
        repo: process.env.GITHUB_SYNC_REPO,
        baseBranch: process.env.GITHUB_SYNC_BASE_BRANCH || 'main',
        dataPath: process.env.GITHUB_SYNC_DATA_PATH || 'data/pricing-tiers.json'
    };
    const missing = [];
    if (!cfg.token) missing.push('GITHUB_SYNC_TOKEN');
    if (!cfg.owner) missing.push('GITHUB_SYNC_OWNER');
    if (!cfg.repo)  missing.push('GITHUB_SYNC_REPO');
    if (missing.length) {
        throw new GithubConfigError(`githubPrService: missing required env vars: ${missing.join(', ')}`);
    }
    return cfg;
}

function classifyError(err, contextMsg) {
    const status = err && err.status;
    if (status === 401) return new GithubAuthError(`${contextMsg}: 401 Unauthorized — check GITHUB_SYNC_TOKEN`, err);
    if (status === 403) return new GithubPermissionError(`${contextMsg}: 403 Forbidden — token lacks Contents:write or PullRequests:write on the repo`, err);
    if (status === 404) return new GithubPermissionError(`${contextMsg}: 404 Not Found — token may not have access to ${process.env.GITHUB_SYNC_OWNER}/${process.env.GITHUB_SYNC_REPO} (or branch/file doesn't exist)`, err);
    if (status === 409 || status === 422) return new GithubConflictError(`${contextMsg}: ${status} ${err.message || 'conflict'}`, err);
    if (err && (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT')) {
        return new GithubNetworkError(`${contextMsg}: network error (${err.code})`, err);
    }
    return new GithubPrError(`${contextMsg}: ${err && err.message ? err.message : String(err)}`, 'UNKNOWN', err);
}

/**
 * Build a deterministic branch name like
 *   pricing-update/2026-04-29T18-00-00Z
 * Slashes and dots are removed to keep the name git-safe.
 */
function buildBranchName(now = new Date()) {
    const ts = now.toISOString().replace(/[:.]/g, '-').replace(/Z$/, 'Z');
    return `pricing-update/${ts}`;
}

/**
 * Build the PR title from the next payload + a short summary.
 * Title is capped at 70 chars per CLAUDE.md guidance.
 */
function buildPrTitle(payload, summary) {
    const tail = summary ? ` — ${summary}` : '';
    const base = `Pricing update`;
    const full = base + tail;
    return full.length > 70 ? base + ' — sync from Insight 360' : full;
}

/**
 * Octokit factory — separated so tests can inject a mock.
 */
function makeOctokit(token) {
    return new Octokit({ auth: token, userAgent: 'insight-360-pricing-sync/1.0.0' });
}

// ============================================
// Public API
// ============================================

/**
 * Open a pricing-sync PR.
 *
 * Steps:
 *   1. Get base branch SHA
 *   2. Create new branch off base
 *   3. Read existing data file (if any) to get its SHA
 *   4. Commit the new payload to the branch
 *   5. Open PR with diffMarkdown as body
 *
 * @param {object} args
 * @param {object} args.payload      - Validated pricing-tiers.json payload
 * @param {string} args.summary      - Short title fragment (e.g. "Business price $99 → $249")
 * @param {string} args.diffMarkdown - PR body content (from pricingDiffService)
 * @param {object} [args._octokit]   - Test injection only — pre-built Octokit
 * @param {Function} [args._now]     - Test injection only — clock for branch naming
 * @returns {Promise<{pr_url: string, pr_number: number, branch_name: string, file_sha: string}>}
 */
async function openPricingPr({ payload, summary, diffMarkdown, _octokit, _now } = {}) {
    if (!payload || typeof payload !== 'object') {
        throw new GithubConfigError('openPricingPr: payload is required');
    }
    if (typeof diffMarkdown !== 'string' || !diffMarkdown.length) {
        throw new GithubConfigError('openPricingPr: diffMarkdown is required (use pricingDiffService.diffPayloads)');
    }

    const cfg = readEnv();
    const octokit = _octokit || makeOctokit(cfg.token);
    const branchName = buildBranchName(_now ? _now() : new Date());

    // 1. Get base branch ref to copy its SHA
    let baseSha;
    try {
        const baseRef = await octokit.git.getRef({
            owner: cfg.owner, repo: cfg.repo, ref: `heads/${cfg.baseBranch}`
        });
        baseSha = baseRef.data.object.sha;
    } catch (err) {
        throw classifyError(err, `openPricingPr: failed to read base branch ${cfg.baseBranch}`);
    }

    // 2. Create the working branch
    try {
        await octokit.git.createRef({
            owner: cfg.owner, repo: cfg.repo,
            ref: `refs/heads/${branchName}`,
            sha: baseSha
        });
    } catch (err) {
        // 422 = branch already exists. Extremely unlikely with timestamp naming
        // but handled — caller can retry with a slightly different timestamp.
        throw classifyError(err, `openPricingPr: failed to create branch ${branchName}`);
    }

    // 3. Read existing file (if present) to get its SHA — required for update
    let existingFileSha = null;
    try {
        const existing = await octokit.repos.getContent({
            owner: cfg.owner, repo: cfg.repo,
            path: cfg.dataPath,
            ref: cfg.baseBranch
        });
        if (existing && existing.data && !Array.isArray(existing.data)) {
            existingFileSha = existing.data.sha;
        }
    } catch (err) {
        // 404 is expected on first sync (file doesn't exist yet) — proceed without sha
        if (err && err.status === 404) {
            existingFileSha = null;
        } else {
            throw classifyError(err, `openPricingPr: failed to read existing ${cfg.dataPath}`);
        }
    }

    // 4. Commit the new payload to the branch
    const content = Buffer.from(JSON.stringify(payload, null, 2) + '\n', 'utf8').toString('base64');
    let commit;
    try {
        commit = await octokit.repos.createOrUpdateFileContents({
            owner: cfg.owner, repo: cfg.repo,
            path: cfg.dataPath,
            branch: branchName,
            message: `chore(pricing): sync from Insight 360 — ${payload.generated_at}`,
            content,
            sha: existingFileSha || undefined,
            committer: { name: 'Insight 360 Pricing Sync', email: 'sync@insightdriven.business' },
            author:    { name: 'Insight 360 Pricing Sync', email: 'sync@insightdriven.business' }
        });
    } catch (err) {
        throw classifyError(err, `openPricingPr: failed to commit ${cfg.dataPath} to ${branchName}`);
    }

    const fileSha = commit && commit.data && commit.data.content && commit.data.content.sha;

    // 5. Open the PR
    const title = buildPrTitle(payload, summary);
    let pr;
    try {
        pr = await octokit.pulls.create({
            owner: cfg.owner, repo: cfg.repo,
            title,
            head: branchName,
            base: cfg.baseBranch,
            body: diffMarkdown,
            maintainer_can_modify: true
        });
    } catch (err) {
        throw classifyError(err, `openPricingPr: failed to open PR for ${branchName}`);
    }

    return {
        pr_url: pr.data.html_url,
        pr_number: pr.data.number,
        branch_name: branchName,
        file_sha: fileSha
    };
}

/**
 * Health check — confirms the token can authenticate and read the repo.
 * Intended for a daily cron. Throws on any failure mode.
 *
 * @param {object} [args._octokit] - Test injection only
 * @returns {Promise<{owner: string, repo: string, default_branch: string}>}
 */
async function verifyToken({ _octokit } = {}) {
    const cfg = readEnv();
    const octokit = _octokit || makeOctokit(cfg.token);
    try {
        const repo = await octokit.repos.get({ owner: cfg.owner, repo: cfg.repo });
        return {
            owner: cfg.owner,
            repo: cfg.repo,
            default_branch: repo.data.default_branch
        };
    } catch (err) {
        throw classifyError(err, 'verifyToken');
    }
}

module.exports = {
    openPricingPr,
    verifyToken,
    // Error classes for callers to switch on
    GithubPrError,
    GithubAuthError,
    GithubPermissionError,
    GithubConflictError,
    GithubNetworkError,
    GithubConfigError,
    // Internals exposed for tests
    _internal: {
        readEnv,
        classifyError,
        buildBranchName,
        buildPrTitle,
        makeOctokit
    }
};
