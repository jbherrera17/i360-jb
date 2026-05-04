# AGENTS.md

This file is for AI coding agents (OpenAI Codex, Cursor, Aider, etc.) working in the Insight 360 repository. The canonical engineering rules live in `CLAUDE.md` — this file points there and adds notes specific to non-Claude-Code agents.

## Read These First

1. **`CLAUDE.md`** — full engineering rules, architecture, multi-tenant data scoping rules, module integration checklist, and frontend patterns. Treat it as the source of truth.
2. **`/Users/jbh17/.claude/CLAUDE.md` is JB's global identity file** and is not part of this repo. Do not assume it is loaded for you.
3. **`README.md`** — high-level project description and quick start.

## Trust Live Code Over Docs

Documentation in this repo drifts. When `CLAUDE.md`, `README.md`, or any guide disagrees with the source tree, the source tree wins. Verify before relying on a documented count, path, or version.

Concrete checks worth running before you cite a fact:

- File counts: `ls server/routes | wc -l`, `ls server/services | wc -l`, `ls public/*.html | wc -l`
- Node version: `package.json` `engines.node` field is authoritative
- Coverage thresholds: `jest.config.js` is authoritative
- Migration ordering: `db/migration-order.md` is incomplete; verify against actual `db/*.sql` filenames

## Non-Negotiable Safety Rules

- Do not commit `.env` files or credentials.
- Do not run destructive git operations (`reset --hard`, `push --force`, branch deletion) without explicit approval.
- Do not skip pre-commit hooks (`--no-verify`).
- The worktree is often dirty with WIP. Run `git status --short` before editing and never blend your changes into unrelated WIP.
- Match scope to what was asked. Do not opportunistically refactor adjacent code.

## Multi-Tenant Data Scoping (Critical)

Every API route that returns org-scoped data must validate organization context. See the **Multi-Tenant Data Scoping Rules** section of `CLAUDE.md` for the full rules. Summary:

- Backend: use `requireOrgContext(supabase)` and `scopeToOrg()`. Never write "return everything" fallbacks for null `orgId`.
- Frontend: use `authFetch()` from `/js/auth-fetch.js`. Never raw `fetch()` for `/api/*`.
- Cross-org data leakage is a security incident.

## Module Integration Checklist

When adding a new feature, page, or module, follow the **New Module Integration Checklist** in `CLAUDE.md`. Every item must be verified before declaring the work complete.

## Common Commands

```bash
npm start            # Production server (port 3000)
npm run dev          # Dev server with nodemon
npm test             # Jest unit and integration tests
npm test -- --watch
npm run test:e2e     # Playwright E2E
npm run lint
npm run lint -- --fix
```

Run focused tests when iterating:

```bash
npm test -- __tests__/unit/services/example.test.js
npx playwright test __tests__/e2e-ui/example.spec.js
```

## Known Drift To Watch

- File counts in older sections of `CLAUDE.md` and `README.md` may lag reality. Recount before quoting.
- `db/migration-order.md` does not list every phase file. Verify against `db/*.sql`.
- Canonical modal loader path is `/js/modal-service/loader.js` with `data-auto-load`. Reject any new page using `/js/modal-service-loader.js` — that file does not exist.

## When CLAUDE.md and AGENTS.md Disagree

`CLAUDE.md` wins. This file exists to orient agents that don't auto-load `CLAUDE.md`, not to define new rules.
