# Repository security: what the repo enforces and what the owner must configure

Phase 4 (production deployment) is **not** implemented or authorised. This document separates what is enforced by
files in the repository from what only the repository owner can configure in GitHub. Nothing under "Owner actions" has
been done.

## 1. Enforced by files in the repository

| Control | Where | Notes |
|---|---|---|
| Actions pinned to full commit SHAs | `.github/workflows/*.yml` | `uses:` lines carry a `# vX.Y.Z` comment. `repo-hardening.test.mjs` (run by `pnpm test:ci-scripts`) fails on a tag or branch reference. `ci.yml` keeps the versions its `@v4` tags resolved to (checkout 4.4.0, setup-node 4.4.0, pnpm/action-setup 4.3.0), so behaviour is unchanged. |
| actionlint image pinned by digest | `ci.yml`, `lint workflows` job | `rhysd/actionlint:1.7.7@sha256:…`. Dependabot does not track images used from `run:` steps: bump tag and digest together by hand. |
| Code ownership | `.github/CODEOWNERS` | Covers `.github/`, `scripts/ci/`, `**/wrangler.jsonc`, `packages/db/drizzle/`. **Inert until the ruleset below requires code-owner review.** |
| Action update policy | `.github/dependabot.yml` | `github-actions` ecosystem only, weekly, one grouped PR. Application dependencies are deliberately not configured. |
| Single required check | `ci.yml` → `ci-gate` | Unchanged. The exact check name is `ci-gate` (observed on the `main` tip through the public check-runs API). |
| No deployment capability | all workflows | No Cloudflare credential, environment, upload, migration or seed anywhere. The artifact proof of concept only runs `wrangler deploy --dry-run`. |

## 2. Observed GitHub state (public API, 2026-10-10)

Only public endpoints were readable. Settings that need admin access are **not visible and not assumed**.

- Repository `engineering102/RMS-Careers` is public and owned by the **User** account `engineering102` (not an organisation: no teams).
- `main` is **not protected**: `protected: false`, no rules apply to the branch, and the repository has no rulesets.
- Check names reported on the `main` tip: `ci-gate`, `detect affected apps`, `typecheck + unit tests`, `integration tests (NonProd test DB)`, `cf:build (web|admin|student)`, `lint workflows`, and the artifact proof-of-concept jobs (`web / build + package (web)`, …).
- Not visible without authentication: collaborators, Actions permission settings, which secrets exist, Environments.

## 3. Owner actions (not done)

Only someone with admin rights on the repository can do these.

### 3.1 Protect `main` with a ruleset

*Settings → Rules → Rulesets → New branch ruleset*, target `main`:

1. Require a pull request before merging.
2. Require status checks to pass, with **only** `ci-gate` as the required check (select it from the list; it appears once it has run). Do not require the individual jobs: path-aware CI skips them on purpose and `ci-gate` already judges them.
3. Block force pushes and branch deletion.
4. Require review from Code Owners (see the caveat below).

**Single-maintainer caveat.** `engineering102` is the only verified owner and the author of every PR. GitHub does not let an author approve their own PR, so requiring approvals plus code-owner review would block every PR, including the ones that change `.github/**`. Choose one deliberately:

- add a second person with write access to `.github/CODEOWNERS` and to the reviewers, then require code-owner review; or
- keep "require a pull request" and `ci-gate`, skip required approvals until a second maintainer exists, and record that decision; or
- require code-owner review and give the owner a bypass (this weakens the control for the owner, so document it).

### 3.2 Repository Actions settings

*Settings → Actions → General*:

- Workflow permissions: **read repository contents** by default.
- If the setting is offered, turn on the policy that requires actions to be pinned to a full-length commit SHA (the repository-level policy described in GitHub's secure-use guide). Keep Dependabot enabled so pins stay current.
- Require approval for workflows from outside collaborators.
- Keep secrets minimal. Today the only ones are `TEST_DATABASE_URL` and `TEST_DATABASE_ENDPOINT` (NonProd test database). Never add the production database URL or a Cloudflare token as a repository secret.

### 3.3 Production Environments (before any deploy job exists)

Create one Environment per Worker: `production-web`, `production-admin`, `production-student` (*Settings → Environments*):

- Deployment branches: only `main`.
- Required reviewers: someone other than whoever triggers the deploy; prevent self-review.
- Environment secrets (never repository secrets): one Cloudflare API token per environment, scoped to that Worker's account permissions. The exact permissions needed for custom-domain routes must be confirmed against Cloudflare's documentation first.
- Worker runtime secrets (`POSTGRES_URL`, `AUTH_SECRET`, `AUTH_GITHUB_*`) stay in Cloudflare, not GitHub.
- A deploy job must reference its environment with `environment:`; nothing in the repository does yet.

### 3.4 Dependabot

`dependabot.yml` is read automatically. Optionally enable Dependabot alerts/security updates in *Settings → Code security*. Dependabot PRs skip the integration job by design (they cannot read the test-database secrets); `ci-gate` tolerates exactly that skip.

## 4. Updating a pinned action

Dependabot opens the PR. To pin by hand, resolve the tag to a commit SHA from the **official** repository and dereference annotated tags:

```bash
git ls-remote --tags https://github.com/<owner>/<repo>.git 'refs/tags/vX.Y.Z' 'refs/tags/vX.Y.Z^{}'
```

Use the `^{}` line when it exists (annotated tag), otherwise the plain line. Write `uses: <owner>/<repo>@<40-hex> # vX.Y.Z`. Do not copy a SHA from a blog, a fork or a search result.

## 5. Known limits

- The pins prove which commit runs, not that the upstream commit is trustworthy: read the changelog of a bump.
- CODEOWNERS protects only paths it lists. Other security-relevant files exist (for example `scripts/check-cloudflare-build-env.mjs` and `packages/db/src/guard*.ts`); adding them is a deliberate follow-up.
- Nothing here configures GitHub itself. Until section 3 is done, `main` accepts direct pushes and unreviewed merges.
