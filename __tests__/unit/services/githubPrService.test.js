/**
 * GitHub PR Service Unit Tests (REQ-003)
 *
 * Covers:
 * - openPricingPr happy path executes the 5 Octokit calls in order
 * - openPricingPr handles "file doesn't exist yet" (first sync) without sha
 * - openPricingPr classifies 401 → GithubAuthError
 * - openPricingPr classifies 403/404 → GithubPermissionError
 * - openPricingPr classifies 422 → GithubConflictError
 * - openPricingPr classifies network errors → GithubNetworkError
 * - verifyToken returns repo info on success
 * - readEnv throws GithubConfigError when required env vars missing
 * - buildBranchName produces a git-safe name
 */

const githubPr = require('../../../server/services/githubPrService');

// Restore env after each test
const ORIGINAL_ENV = { ...process.env };
afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
});

function setEnv() {
    process.env.GITHUB_SYNC_TOKEN = 'fake-token';
    process.env.GITHUB_SYNC_OWNER = 'jbherrera17';
    process.env.GITHUB_SYNC_REPO = 'synergi-website';
    process.env.GITHUB_SYNC_BASE_BRANCH = 'main';
    process.env.GITHUB_SYNC_DATA_PATH = 'data/pricing-tiers.json';
}

function makeOctokitMock(overrides = {}) {
    return {
        git: {
            getRef: jest.fn(async () => ({ data: { object: { sha: 'base-sha' } } })),
            createRef: jest.fn(async () => ({ data: {} })),
            ...overrides.git
        },
        repos: {
            getContent: jest.fn(async () => ({ data: { sha: 'existing-file-sha' } })),
            createOrUpdateFileContents: jest.fn(async () => ({ data: { content: { sha: 'new-file-sha' } } })),
            get: jest.fn(async () => ({ data: { default_branch: 'main' } })),
            ...overrides.repos
        },
        pulls: {
            create: jest.fn(async () => ({ data: { html_url: 'https://github.com/x/y/pull/1', number: 1 } })),
            ...overrides.pulls
        }
    };
}

const SAMPLE_PAYLOAD = { schema_version: 1, generated_at: '2026-04-29T18:00:00Z', tiers: [] };
const SAMPLE_DIFF = '## Test diff\n\n- Business: $99 → $249';

// ============================================
// openPricingPr — happy path
// ============================================
describe('openPricingPr — happy path', () => {
    test('executes the 5 Octokit calls and returns PR info', async () => {
        setEnv();
        const mockOctokit = makeOctokitMock();
        const result = await githubPr.openPricingPr({
            payload: SAMPLE_PAYLOAD,
            summary: 'price change',
            diffMarkdown: SAMPLE_DIFF,
            _octokit: mockOctokit
        });

        expect(mockOctokit.git.getRef).toHaveBeenCalledWith(expect.objectContaining({ ref: 'heads/main' }));
        expect(mockOctokit.git.createRef).toHaveBeenCalled();
        expect(mockOctokit.repos.getContent).toHaveBeenCalled();
        expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith(expect.objectContaining({
            path: 'data/pricing-tiers.json',
            sha: 'existing-file-sha'
        }));
        expect(mockOctokit.pulls.create).toHaveBeenCalledWith(expect.objectContaining({
            base: 'main',
            body: SAMPLE_DIFF
        }));
        expect(result).toEqual(expect.objectContaining({
            pr_url: 'https://github.com/x/y/pull/1',
            pr_number: 1,
            file_sha: 'new-file-sha'
        }));
        expect(result.branch_name).toMatch(/^pricing-update\//);
    });

    test('first-time sync (file 404) commits without sha', async () => {
        setEnv();
        const notFound = Object.assign(new Error('Not Found'), { status: 404 });
        const mockOctokit = makeOctokitMock({
            repos: { getContent: jest.fn(async () => { throw notFound; }) }
        });
        await githubPr.openPricingPr({
            payload: SAMPLE_PAYLOAD,
            diffMarkdown: SAMPLE_DIFF,
            _octokit: mockOctokit
        });
        expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
            expect.objectContaining({ sha: undefined })
        );
    });
});

// ============================================
// openPricingPr — error classification
// ============================================
describe('openPricingPr — error classification', () => {
    test('401 → GithubAuthError', async () => {
        setEnv();
        const err401 = Object.assign(new Error('Unauthorized'), { status: 401 });
        const mockOctokit = makeOctokitMock({
            git: { getRef: jest.fn(async () => { throw err401; }) }
        });
        await expect(githubPr.openPricingPr({
            payload: SAMPLE_PAYLOAD, diffMarkdown: SAMPLE_DIFF, _octokit: mockOctokit
        })).rejects.toBeInstanceOf(githubPr.GithubAuthError);
    });

    test('403 → GithubPermissionError', async () => {
        setEnv();
        const err403 = Object.assign(new Error('Forbidden'), { status: 403 });
        const mockOctokit = makeOctokitMock({
            git: { createRef: jest.fn(async () => { throw err403; }) }
        });
        await expect(githubPr.openPricingPr({
            payload: SAMPLE_PAYLOAD, diffMarkdown: SAMPLE_DIFF, _octokit: mockOctokit
        })).rejects.toBeInstanceOf(githubPr.GithubPermissionError);
    });

    test('422 conflict on createRef → GithubConflictError', async () => {
        setEnv();
        const err422 = Object.assign(new Error('Reference already exists'), { status: 422 });
        const mockOctokit = makeOctokitMock({
            git: { createRef: jest.fn(async () => { throw err422; }) }
        });
        await expect(githubPr.openPricingPr({
            payload: SAMPLE_PAYLOAD, diffMarkdown: SAMPLE_DIFF, _octokit: mockOctokit
        })).rejects.toBeInstanceOf(githubPr.GithubConflictError);
    });

    test('network error (ENOTFOUND) → GithubNetworkError', async () => {
        setEnv();
        const errNet = Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' });
        const mockOctokit = makeOctokitMock({
            git: { getRef: jest.fn(async () => { throw errNet; }) }
        });
        await expect(githubPr.openPricingPr({
            payload: SAMPLE_PAYLOAD, diffMarkdown: SAMPLE_DIFF, _octokit: mockOctokit
        })).rejects.toBeInstanceOf(githubPr.GithubNetworkError);
    });
});

// ============================================
// openPricingPr — argument validation
// ============================================
describe('openPricingPr — argument validation', () => {
    test('missing payload throws GithubConfigError', async () => {
        setEnv();
        await expect(githubPr.openPricingPr({ diffMarkdown: SAMPLE_DIFF }))
            .rejects.toBeInstanceOf(githubPr.GithubConfigError);
    });
    test('missing diffMarkdown throws GithubConfigError', async () => {
        setEnv();
        await expect(githubPr.openPricingPr({ payload: SAMPLE_PAYLOAD }))
            .rejects.toBeInstanceOf(githubPr.GithubConfigError);
    });
});

// ============================================
// verifyToken
// ============================================
describe('verifyToken', () => {
    test('returns owner/repo/default_branch on success', async () => {
        setEnv();
        const mockOctokit = makeOctokitMock();
        const result = await githubPr.verifyToken({ _octokit: mockOctokit });
        expect(result).toEqual({
            owner: 'jbherrera17',
            repo: 'synergi-website',
            default_branch: 'main'
        });
    });

    test('401 from repos.get → GithubAuthError', async () => {
        setEnv();
        const err401 = Object.assign(new Error('Unauthorized'), { status: 401 });
        const mockOctokit = makeOctokitMock({
            repos: { get: jest.fn(async () => { throw err401; }) }
        });
        await expect(githubPr.verifyToken({ _octokit: mockOctokit }))
            .rejects.toBeInstanceOf(githubPr.GithubAuthError);
    });
});

// ============================================
// Internals
// ============================================
describe('readEnv', () => {
    const { readEnv } = githubPr._internal;
    test('throws GithubConfigError when token missing', () => {
        delete process.env.GITHUB_SYNC_TOKEN;
        process.env.GITHUB_SYNC_OWNER = 'x';
        process.env.GITHUB_SYNC_REPO = 'y';
        expect(() => readEnv()).toThrow(githubPr.GithubConfigError);
    });
    test('returns full config when all set', () => {
        setEnv();
        expect(readEnv()).toEqual({
            token: 'fake-token',
            owner: 'jbherrera17',
            repo: 'synergi-website',
            baseBranch: 'main',
            dataPath: 'data/pricing-tiers.json'
        });
    });
});

describe('buildBranchName', () => {
    const { buildBranchName } = githubPr._internal;
    test('produces a git-safe pricing-update/<timestamp> name', () => {
        const fixed = new Date('2026-04-29T18:00:00.000Z');
        const name = buildBranchName(fixed);
        expect(name).toMatch(/^pricing-update\/2026-04-29T18-00-00-000Z$/);
        expect(name).not.toMatch(/[:.]/);
    });
});

describe('buildPrTitle', () => {
    const { buildPrTitle } = githubPr._internal;
    test('combines base + summary', () => {
        const title = buildPrTitle({}, 'Business price $99 → $249');
        expect(title).toBe('Pricing update — Business price $99 → $249');
    });
    test('caps at 70 chars by falling back to short title', () => {
        const long = 'x'.repeat(100);
        const title = buildPrTitle({}, long);
        expect(title.length).toBeLessThanOrEqual(70);
        expect(title).toMatch(/sync from Insight 360/);
    });
});
