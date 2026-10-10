# CI/CD Phase 3 — Deployment Tracking Design (proposal only)

Status: **implemented in code and unit-tested against fakes; never run against the live GitHub Deployments API or Cloudflare, and no deployment record exists yet.** The record model (sections 3, 5, 6) is implemented in `scripts/ci/deploy-tracking.mjs`, the deploy decision (section 4) in `scripts/ci/deploy.mjs`, and rollback in `scripts/ci/rollback.mjs`; the exact-SHA gate is `scripts/ci/deploy-gate.mjs`. Deviations from this proposal are listed under "As implemented" in `phase-4-production-deployment-spec.md` section 3. Companion to `docs/audits/cicd-path-aware-deployment-audit.md` §16.2/§16.3/§17.

## 1. Requirement

For each Worker (`rms-web`, `rms-admin`, `rms-student`) keep an independent, durable, auditable record of **the last SHA that was deployed and verified**. That SHA, never "the previous commit on main", is the diff base used to decide whether the app needs deploying.

## 2. Options evaluated

| Option | Durable | Auditable | Independent per app | Verdict |
|---|---|---|---|---|
| **GitHub Deployments (one environment per app)** | Yes, server-side, not rewritten by a push | Yes: actor, run URL, timestamps, status history | Yes (`production-web`, `production-admin`, `production-student`) | **Recommended source of truth** |
| Moving git tags (`deployed/<app>`) | Yes | Weak (force-moved, reflog only), needs `contents: write` | Yes | Rejected: mutable, widens token scope |
| Actions repository variables | Yes | No history, last-writer-wins | Yes | Rejected |
| Cloudflare Worker version tag/message (`sha-<sha>`) | Yes | Cloudflare-side only | Yes | **Secondary cross-check only**: shows what is *live*; reading it needs the CF token in `detect` |
| Branch/file in repo (e.g. `deployed.json`) | Yes | Yes | Yes | Rejected: needs a push to `main`, defeats branch protection |

Recommendation: **GitHub Deployments as the record**, Cloudflare version tags (`--tag sha-<full sha>`, `--message "<run url>"`) written at deploy time so drift can be detected by a separate scheduled, read-only reconcile job. The GitHub record means "deployed and passed smoke", the Cloudflare tag means "this is live"; a mismatch is an alert, never an automatic action.

## 3. Record model

- Environment per app: `production-web`, `production-admin`, `production-student` (also gives per-app approvers, branch restriction to `main`, and per-app Cloudflare secrets).
- Lifecycle per deploy attempt: create deployment `{ref: <sha>, environment, auto_merge: false, required_contexts: [], payload: {app, sha, runId, runAttempt, kind: "deploy"|"rollback"|"bootstrap", versionId?}}` (`versionId` = the exact Cloudflare Worker version id the SHA is live as, lowercase UUID; **required on rollback records**; a record without it still moves the diff base but can never be a rollback target and cannot be reconciled with live state) → status `in_progress` **before** `wrangler deploy` → status `success` **only after the smoke test passes** → `failure`/`error` otherwise (with run URL as `log_url`).
- `versionId` exists only after `wrangler deploy` returns, so a deploy writes an *intent* record (no `versionId`, `in_progress` before the deploy, settled afterwards) and then an *evidence* record carrying it; see section 5 of `phase-4-production-deployment-spec.md`. Only evidence records can be rollback targets.
- **Last good SHA** for an app = the `sha` of the newest deployment in that environment that has a `success` status in its history (auto-inactive makes older successes `inactive`, so look at history, not only the current state), created by `github-actions[bot]`, whose `payload.sha` equals the deployment's `sha`. Pagination must be exhausted for the newest page; an incomplete read is an error, not an empty result.
- Exact token scopes (`deployments: read/write`) must be confirmed in a spike; grant `write` only to the deploy job.

## 4. Where the decision is made

`detect` stays advisory (a preview that lets CI skip build work). The **authoritative** decision runs inside each deploy job **after it holds the per-app lock** (`concurrency: group: deploy-<app>`, `cancel-in-progress: false`; the rollback workflow must use the same group):

1. Read last good SHA for this app (fail-closed rules in §6).
2. Verify `git merge-base --is-ancestor <last-good> <github.sha>` (needs `fetch-depth: 0`).
3. Run `scripts/ci/affected.mjs --base <last-good> --head <github.sha>`; deploy only if this app is in the result. The graph already maps shared-package changes (`@rms/db`, `@rms/auth`, lockfile, build infra) to every dependent app, so each app is evaluated against **its own** base.
4. Deploy the artifact built in this run (assert artifact SHA == `github.sha`), tag the Worker version, smoke test, then write `success`.

Build artifacts are produced before the lock and are valid regardless of base; only the decision to ship is deferred.

## 5. Scenarios

| Scenario | Behaviour |
|---|---|
| **Failed deploy, then unrelated commits** | Failed attempt records `failure`; last good SHA does not move. Next run diffs from the last good SHA, so the failed app's changes (and the unrelated ones) are re-included. Apps whose deploys succeeded advance independently. |
| **Deploy succeeded, smoke failed** | Record stays at the previous good SHA (Worker is live at an unverified SHA; the failed attempt's record carries its `versionId`, so rollback can tell this state from "previous good version is live" and allows rolling back to the last good version). Next diff from the old base is a superset, so it redeploys. Safe and conservative; operator rolls back per §8 if needed. |
| **Two queued `main` runs (A older, B newer)** | CI for both runs (main is never cancelled). Deploy groups serialize; GitHub keeps one pending, so pending A may be replaced by B. Because the base is the recorded SHA and not "previous commit", B covers A's changes. If A runs first, B then diffs from A. If B somehow runs first, A fails the ancestor check (`B` recorded is not an ancestor of A): A is a **no-op "superseded"**, never an overwrite. |
| **Deploy succeeded, workflow fails afterwards** | The `success` record is written inside the deploy job immediately after smoke, so later failures (summary, other app's job, notifications) do not erase it. If the record write itself fails, the job fails loudly; the next run sees the old base and redeploys (idempotent). A deployment left `in_progress` with no terminal status is treated as unknown; a reconcile step marks it `error` after a timeout. It never counts as success. |
| **First deployment (no record)** | Today production was deployed from developer machines, so the live SHA is unknown. An empty list from a *successful, complete* API read is "no baseline": do **not** diff against a guess. Only allowed through a manual `workflow_dispatch` `bootstrap` run on `main`, approval-gated by each environment, that deploys all three apps at the chosen SHA and records `kind: bootstrap`. Push-triggered runs with no record **fail** rather than silently deploy. |
| **Shared package change** | Each app is evaluated independently against its own base (e.g. `@rms/db` changed, web unaffected, admin and student affected). If admin deploys and student fails, only admin's base advances; the next run still deploys student. No cross-app "partial deploy of a commit" bookkeeping is needed. |
| **Rollback** | Operator runs the `rollback.yml` workflow (same lock group) for one app and an explicit target **Cloudflare version id**. The target must be recorded (`payload.versionId`) on a verified-success record of that app, the Worker's live version (`wrangler deployments status --json`) must be one the record accounts for (the last good version, or the version of a newer failed attempt, e.g. a deploy that went live but failed smoke), and the target must not be the live version. It writes a **new** deployment `kind: rollback`, `sha: <recorded sha>`, `versionId: <target>` as `in_progress` before the change, and `success` (`rollback-recovered`) only when the live version equals the target and the smoke test passes; otherwise `failure` (`rollback-failed`: not applied; `rollback-unverified`: applied or possibly applied, not confirmed) or `error` (`rollback-aborted`: stopped before changing anything). Last good SHA = newest success *by creation time*, so the base becomes the rolled-back SHA and the next push re-evaluates from there (including the bad change if it is still on `main`: fix-forward or revert is required). A manual `wrangler rollback` (or any change outside the workflow) leaves the live version unaccounted for: the next rollback run **refuses** (`live-mismatch`) and the owner reconciles by hand. |
| **Concurrency / stale build overwriting newer deploy** | Per-app lock (`cancel-in-progress: false`), monotonic rule (deploy only if last good SHA is a strict ancestor of `github.sha`), artifact-SHA assertion, and the deploy job re-reads the record *after* acquiring the lock. Rollback is the only intentional non-monotonic path and requires an explicit input plus environment approval. |

## 6. Fail-closed rules

The last good SHA is "undeterminable" if any of these hold. Action in every case: **do not deploy that app, fail the job with the reason, change nothing**:

- API error, rate limit, 403/5xx, truncated pagination, or unparsable payload.
- Newest success record fails the creator or `payload.sha == sha` check.
- Recorded SHA is not an ancestor of `github.sha` and the run is not a rollback/bootstrap (history rewritten, shallow clone, or stale run).
- Required environment/secret/permission missing.

Distinguish "cannot read" (fail) from "read succeeded and there is none" (first-deploy rule above). The only widening allowed is *per app, to "affected"*, when `affected.mjs` itself degrades (its existing fail-closed behaviour); it never widens to skipping.

## 7. Operational notes

- Deployments are API-writable by anyone with a `deployments: write` token; the creator filter plus CODEOWNERS on `.github/**` is the protection, so the workflow and these scripts must stay owner-reviewed.
- Retention: Deployment records are not auto-deleted; do not delete them.
- Read-only scheduled reconcile (Cloudflare tag vs record) is optional; it needs a read-scoped CF token and must not auto-correct.

## 8. Open questions for the owner

1. Is `engineering102` an organisation or a personal account (affects teams, environment reviewers, rulesets)?
2. Who are the required reviewers per production environment?
3. Is the current live SHA of each Worker known, or should bootstrap redeploy everything?
4. Should rollback be GitHub-workflow only (recommended) or may operators run `wrangler rollback` locally?
