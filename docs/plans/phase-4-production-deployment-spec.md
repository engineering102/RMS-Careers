# Phase 4 implementation specification: production deployment

**Status: step 1 of the build-out is merged to `main` (PR #3); step 2 (rollback groundwork, below) is this change; no deployment capability exists.** Implemented so far, all non-deploying and unit-tested: `scripts/ci/smoke.mjs` (section 5), `scripts/ci/deploy-tracking.mjs` (record reader, ancestor/plan decision, GitHub writers; sections 3-4), `deployArgs` in `scripts/ci/artifact.mjs` (the pinned deploy argument list, deliberately **not called by anything**; section 2), the `local-smoke` command and the `sha` input / `digest` output / local workerd smoke step of `artifact-poc-app.yml`. **Production rollback is NOT operational yet:** it needs deployment records that carry a Cloudflare `versionId`, and nothing writes them because the deploy workflow does not exist; until then a real rollback run can only refuse, and only the dry-run rehearsal is useful. Step 2 (this change): `scripts/ci/rollback.mjs` and `.github/workflows/rollback.yml` (section 5), unit-tested with a fake wrangler and fake GitHub API; **never run on GitHub, never run against Cloudflare**. **Not implemented:** `deploy.yml`, `deploy-app.yml`, the `deploy` subcommand of `artifact.mjs`, any Environment or credential in GitHub, any call that deploys. Everything below that is not in the list above is still specification.

Original status: nothing here was implemented when this was written. No deployment, Cloudflare upload, migration, seed or secret change has been made. Builds on the Phase 3 artifact proof of concept (`main` @ `19b7398`) and `docs/plans/cicd-deployment-tracking-design.md`. Optional repository hardening (CODEOWNERS coverage, Dependabot, long security docs, rulesets) is **not** a prerequisite; the only security dependencies are listed in section 9.

Evidence labels: **[verified]** observed in this repository or by a read-only request, **[docs]** from Cloudflare/GitHub documentation fetched for this audit, **[assumption]** needs the owner or a first run to confirm.

## 1. Verified facts

**Workers and routes [verified from `apps/*/wrangler.jsonc`]**

| | web | admin | student |
|---|---|---|---|
| Worker | `rms-web` | `rms-admin` | `rms-student` |
| Custom domain | `www.rms-careers.com` | `admin.rms-careers.com` | `student.rms-careers.com` |
| `vars` (non-secret, in git) | none | `STUDENT_APP_URL`, `EMAIL_LOGO_URL` | `STUDENT_APP_URL` |
| `secrets.required` | `POSTGRES_URL` | `POSTGRES_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | `POSTGRES_URL`, `AUTH_SECRET` |
| Optional runtime secrets (code) | none | `RESEND_API_KEY`, `EMAIL_FROM` | `RESEND_API_KEY`, `EMAIL_FROM` |
| Other | | `limits.cpu_ms: 300000` | |

All three: `main: .open-next/worker.js`, assets `.open-next/assets`, flags `nodejs_compat`, `global_fetch_strictly_public`, compatibility date `2026-10-04`, a self service binding `WORKER_SELF_REFERENCE`, observability on. Auth uses `trustHost: true`, so no `AUTH_URL` is needed. No R2/KV/D1/Durable Object bindings exist.

**Production is already live [verified, unauthenticated GET, today].** `www` serves `/`, `/robots.txt`, `/sitemap.xml` with 200; `admin` and `student` serve `/login` with 200 and redirect `/` (and `/dashboard`) with 307 to `/login?callbackUrl=…`. All answer from Cloudflare. So the three Workers and their domains exist; which commit is live is unknown (they were deployed from a developer machine). Whether their Worker secrets are set is **[assumption]**: it cannot be read without credentials.

**Plan requirement [docs + verified config].** `limits.cpu_ms` above 30,000 ms is a Workers Paid feature, and admin sets 300,000 for bcrypt. The live admin therefore implies a Paid plan **[assumption]**. Bundle sizes from the Phase 3 dry runs: 5.2 MiB (web), 8.8 MiB (admin), 7.9 MiB (student) uncompressed; Cloudflare lists a 64 MiB Worker size limit on both plans.

**Caching [verified in the built config and `@opennextjs/cloudflare@1.20.8`].** `defineCloudflareConfig()` with no arguments resolves incremental cache, tag cache and queue to `dummy`. `populateCache` therefore does nothing ("does not need populating") and skew protection is off. There is no ISR/revalidation persistence today.

## 2. The deploy command

`pnpm deploy` is `cf:build && opennextjs-cloudflare deploy`: it **rebuilds**, so it must never run in the deploy pipeline. `opennextjs-cloudflare deploy` does not rebuild; it loads the compiled config from `.open-next/.build/`, starts a local platform proxy, populates caches (a no-op here), then runs `wrangler deploy`. For the current config that equals a plain `wrangler deploy`.

**Decision:** deploy the extracted, verified tree with `wrangler deploy` directly, from the app directory:

```
node <wrangler>/bin/wrangler.js deploy --config wrangler.jsonc --keep-vars \
     --tag sha-<12-char-sha> --message "<run url> <full sha>"
```

with `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `OPEN_NEXT_DEPLOY=true` (blocks wrangler's own delegation to `opennextjs-cloudflare deploy`; `--config` also prevents it). Flags verified against the installed `wrangler@4.147.0` help: `--tag`, `--message`, `--keep-vars`, `--strict`, `--dry-run`. Notes:

- `--keep-vars`: without it wrangler **deletes every dashboard-defined plaintext var not in `wrangler.jsonc`**. Use it so the first deploys cannot silently remove one. Secrets are unaffected (they are inherited).
- `--strict` (refuse on conflicting remote changes) is an open question: try it in the rehearsal; adopt it only if it does not fail on a clean Worker.
- If R2/KV/D1 caching is ever added, `populateCache` must be run before this deploy. Add a test that fails if the compiled config stops being `dummy`.
- Implementation: a `deploy` subcommand of `scripts/ci/artifact.mjs` that re-scans the extracted tree against the inventory (`verifyExtractedTree`) immediately before running wrangler, refuses unless `--dry-run` or both Cloudflare variables are present, and builds its argument list in one tested function (reusing `dryRunArgs`).

## 3. Pipeline (new files only; `ci.yml`, `ci-gate`, the classifier and Worker config stay unchanged)

**Trigger.** `.github/workflows/deploy.yml` runs on `workflow_run` of `CI` (`completed`) and on `workflow_dispatch`. `workflow_run` is used so `ci.yml` stays byte-identical; it runs the default-branch workflow with secrets, so the first job refuses anything but `conclusion == success`, `event == push`, `head_branch == main`, and a head repository equal to this one. **`GITHUB_SHA` in a `workflow_run` run is the default-branch tip, not the CI commit**, so every checkout and every expectation uses `github.event.workflow_run.head_sha` explicitly.

**Gate job (no credentials).** Besides the run conclusion, query `GET /commits/{head_sha}/check-runs?check_name=ci-gate` and require exactly a completed `success` (absent or ambiguous fails closed). Require `head_sha` to be an ancestor of the current `origin/main` tip. Permission: `checks: read`.

**Per app (web, admin, student), via a reusable `deploy-app.yml` called once per app** (no matrix, so each app has its own job outputs, as in Phase 3):

1. `plan` (no credentials, `deployments: read`): read the app's last verified-deployed SHA from GitHub Deployments (design doc sections 3-6, fail closed), run `detect --base <last-good> --head <sha>` and continue only if the app is in `deployableApps`. Advisory: the decision is repeated under the lock.
2. `build` + `verify`: the Phase 3 jobs (`artifact-poc-app.yml`), changed minimally to take an optional `sha` input and expose `digest` as a workflow output. They also run a **local workerd smoke** (section 5).
3. `deploy` (the only job with an Environment and a credential):
   - `environment: production-<app>`, `concurrency: deploy-<app>`, `cancel-in-progress: false`, `permissions: contents: read, deployments: write`.
   - Checkout and `pnpm install` first, with no credential in the environment.
   - Download the artifact (`digest-mismatch: error`) and run `artifact.mjs verify` **again in this job** with the digest from the build job's output, the commit SHA and the run id: this job never trusts the earlier verify job's result, only its own check of the exact bytes it will deploy.
   - Under the lock, re-read the last-good SHA; apply the ancestor rule (design doc section 4): deploy only if last-good is a strict ancestor of the commit; if the commit is not newer, record "superseded" and succeed without deploying.
   - Record keeping follows the two-record contract of section 5 (an *intent* record before the deploy; after `artifact.mjs deploy` the *evidence* record carrying the Cloudflare `versionId` read from wrangler's output file): create the intent record (`in_progress`), run `artifact.mjs deploy` (the token is passed to that one step only), create the evidence record (`in_progress`), run the smoke tests, then record `success` on the evidence record; any failure records `failure` (or `error`) and settles the intent record too. The record is written by this job right after the smoke test, so a later workflow failure cannot erase it.
   - Ignore GitHub's automatic deployment created by `environment:`: for `workflow_run` its SHA is not the deployed commit. The reader accepts only records created by this workflow with a matching `payload.sha` (design doc section 3).

**Bootstrap (first deployment).** No record exists and the live commit is unknown, so push-triggered runs fail closed. Provide a `workflow_dispatch` input `bootstrap: true` (one app at a time, behind the Environment approval) that deploys the chosen main SHA and records `kind: bootstrap`. Do the safest app first; capture each Worker's current version id beforehand (section 7).

**Rehearsal.** `workflow_dispatch` with `dry_run: true` (default) runs everything except the real deploy, which becomes `wrangler deploy --dry-run`, in a separate job that does not use the Environment and has no token.

## 4. Per-app serialization and stale builds

Exactly the design in `docs/plans/cicd-deployment-tracking-design.md`: one lock per app, the base is the recorded SHA (never "the previous commit"), a newer pending run replaces an older pending one safely because it diffs from the recorded SHA, shared-package changes are evaluated per app against that app's own base, and an unreadable record fails closed (no deploy, job fails). New code: `scripts/ci/deploy-tracking.mjs` (read/write records, ancestor and plan logic) with unit tests on a mocked GitHub API for: no record, unreadable API, malformed record, foreign creator, non-ancestor, superseded, two queued runs, success-then-workflow-failure.

## 5. Smoke tests and rollback

**Post-deploy smoke (unauthenticated, retried about 10 times at 6 s for edge propagation) [verified live today]:**

- web: `/` 200 HTML, `/robots.txt` 200, `/sitemap.xml` 200
- admin and student: `/login` 200; `/` returns 307 with `Location` starting `/login`

`scripts/ci/smoke.mjs` takes a base URL and an app name, uses `redirect: manual`, and has unit tests against a local HTTP server. A failure fails the job and records `failure`; there is no automatic rollback (a failure can be a database or edge problem, not the code).

**Credential-free runtime proof before any deploy [verified, WSL, 2026-10-10].** Running `wrangler dev --local` on the extracted artifacts with dummy variables and no Cloudflare credentials served all three apps correctly: web `/`, `/robots.txt`, `/sitemap.xml` 200; admin and student `/login` 200 and `/` 307 to `/login`. Make this a step of the `verify` job using the same `smoke.mjs`. It proves the bundle starts and routes in workerd, which `--dry-run` does not. It does not prove production secrets, the database, or Cloudflare acceptance.

**Rollback.**
- Primary (**implemented, unrun**): the manual workflow **`rollback.yml`** (final name; the earlier design-doc name `rollback-production` was dropped; `workflow_dispatch`: app, **required** Cloudflare version id, reason, `dry_run` default true; same Environment approval and `deploy-<app>` lock; real runs only from `main`). `scripts/ci/rollback.mjs` does the work; the YAML only supplies inputs and the credential.
- **Identity.** The Cloudflare version id is the identity of a target (required, not "optional" as first specified: nothing implicit like "previous" is ever guessed). Records carry it as `payload.versionId` (validated UUID; required on `rollback` records; a version tied to two commits anywhere in the history aborts the read as ambiguous). The SHA comes from the record; the Worker's own `--tag sha-<12>` / `--message "<run url of this repo> <full sha>"` (from `wrangler versions view <id> --name rms-<app> --json`, shape read from wrangler 4.147.0) must agree with it and are only a cross-check.
- **Capturing the id (deploy-workflow contract, not yet implemented).** The deploy job sets `WRANGLER_OUTPUT_FILE_PATH`; wrangler 4.147.0 appends `{type:"deploy", worker_name, version_id}` (verified in its source; `version_id` is null on abort/dry-run). `versionIdFromWranglerOutput()` in `deploy-tracking.mjs` (unit-tested, unwired) accepts exactly one valid entry. Because the id exists only after `wrangler deploy`, the deploy job writes (1) an *intent* record without `versionId` (`in_progress` before the deploy; it settles to `failure`/`error` or `inactive`, so an interrupted deploy is visible as an unsettled newest record), then (2) after the deploy, the *evidence* record with `versionId` (`in_progress` -> `success` only after smoke, else `failure`). **[assumption]** the output file behaves as the source reads; unproven until a real deploy.
- **Reconciling with live state.** `wrangler deployments status --name rms-<app> --json` (shape read from the 4.147.0 source: `versions: [{version_id, percentage}]`) must show exactly one version at 100%. That version must be the last good record's `versionId` or the `versionId` of a newer non-success record (a failed deploy/rollback that may or may not have gone live). Anything else (unrecorded version, manual rollback, gradual rollout, unreadable output) means the Worker changed outside the pipeline or the record is stale: **refuse**. This replaces the earlier "target must differ from the last good SHA" rule with "target must differ from the *live version*": after a deploy that went live but failed smoke, rolling back to the last good version is therefore allowed (resolving the design-doc mismatch), while rolling back to the version already live is refused.
- **Sequence.** inputs/credentials -> read the record (complete, unambiguous, newest record settled, last good has a `versionId`) -> read live state -> decide -> cross-check the target's Worker metadata -> write `in_progress` record -> re-read live state (changed => abort as `error`) -> `wrangler rollback <id> --name rms-<app> --config wrangler.jsonc --message ... --yes` -> live version must equal the target -> production smoke -> `success`. Distinct outcomes: `rollback-in-progress` (in_progress), `rollback-failed` (failure; wrangler refused, not applied), `rollback-unverified` (failure; applied or possibly applied but live state or smoke does not confirm), `rollback-aborted` (error; stopped before changing anything), `rollback-recovered` (success; the only state that moves the diff base). `dry_run` performs only the GitHub-side reads and checks (no Environment, no credential, no Cloudflare contact) and applies the same refusals.
- **Concurrency.** `rollback.yml` and the future deploy workflow must use the identical group `deploy-<app>` with `cancel-in-progress: false` (pinned by a test on `rollback.yml`). GitHub keeps one *pending* run per group, so a pending rollback or deploy can be replaced by a newer pending run of the same group; the deploy workflow design must account for it. The re-read of live state after the `in_progress` record narrows the remaining window against changes made outside the lock.
- **Remaining assumptions** (unproven until a first real run): the `versions view --json` and `deployments status --json` shapes and `percentage === 100` as read from the source; the output-file capture above; whether Cloudflare accepts the `--tag`; `deployments: read/write` on `GITHUB_TOKEN`. Versions deployed before the pipeline existed (no record) are refused: use the emergency path.
- Emergency: the owner may run `wrangler rollback` locally or use the dashboard. The record is then stale but safe: the next deploy diffs from the old base, a superset, and the lock plus ancestor rule stop it going backwards.
- A rollback restores Worker code and config only, not Worker secrets and not the database. Hence section 6.
- Ship deploy first; ship `rollback.yml` before the second production deploy.

## 6. Migrations stay separate

No database URL, migration or seed exists in any deploy workflow. Order: apply an additive (expand) migration manually from the owner's machine (`pnpm --filter @rms/db db:migrate` with the production URL from outside GitHub), deploy the app, contract later. The `plan` job lists any `packages/db/drizzle/**` files changed since the app's last-good SHA in the approval summary so the reviewer confirms they were applied. A manual migration workflow, if wanted, is a separate later phase with its own Environment.

## 7. Environments and credentials (minimum)

- Environments `production-web`, `production-admin`, `production-student`: deployment branch restricted to `main`; required reviewer(s) (the sole maintainer will approve their own deploys; self-review prevention cannot be enabled until a second person exists, and this is an accepted, documented risk).
- Each holds the secret `CLOUDFLARE_API_TOKEN` (Cloudflare's "Edit Cloudflare Workers" template [docs], scoped to this account and the `rms-careers.com` zone) and the variable `CLOUDFLARE_ACCOUNT_ID`. Cloudflare tokens scope by account and zone, not per Worker, so three tokens give separate revocation, not least privilege.
- No Cloudflare token as a repository secret; no production database URL anywhere in GitHub; Worker runtime secrets stay in Cloudflare.
- Before bootstrap, the owner records the current version id of each Worker (`wrangler versions list` or the dashboard) as the rollback anchor.

## 8. Smallest set of changes

New: `.github/workflows/deploy.yml`, `.github/workflows/deploy-app.yml`, `.github/workflows/rollback.yml` (second milestone), `scripts/ci/deploy-tracking.mjs`, `scripts/ci/smoke.mjs`, their tests, and a one-page `docs/development/deployment.md` runbook.
Changed: `.github/workflows/artifact-poc-app.yml` (optional `sha` input, `digest` workflow output, local workerd smoke step), `scripts/ci/artifact.mjs` (`deploy` subcommand), the workflow static tests.
Unchanged: `ci.yml`, `ci-gate`, `affected.mjs`, `gate.mjs`, all `wrangler.jsonc`, `packages/db`, the env guards. New workflows pin every action to a verified full SHA from the start.

## 9. Blockers, owner actions, and what is not a prerequisite

**Owner actions (blocking the first real deploy)**
1. Create the three Environments and add the token and account id (section 7). Only the owner can.
2. Confirm the Cloudflare plan is Workers Paid and that the template token can attach the existing custom domains on redeploy **[assumption]**.
3. Record the current Worker version ids (rollback anchor).
4. Approve the bootstrap deployment explicitly, one app first; it replaces what is live with current `main`.
5. Decide who approves production deployments.

**Demonstrated security dependencies (the only hardening this plan relies on):** the Environment branch restriction to `main` (otherwise a non-`main` workflow could read the token), and pinned actions in the new workflows (done in the new files). No dependency on CODEOWNERS, rulesets, Dependabot, or pinning `ci.yml`.

**Not prerequisites:** the uncommitted hardening change in the working tree (CODEOWNERS, Dependabot, `ci.yml` pins, `repository-security.md`) is unrelated and stays optional.

**Non-production Cloudflare infrastructure: none known.** Alternative validation without touching production: (a) the credential-free workerd smoke above; (b) the `dry_run` rehearsal on GitHub; (c) unit tests of command construction and record handling with the real deploy mocked. An optional fourth step is a separate throwaway Cloudflare account with generated `*-staging` configs (no routes, renamed Worker and self binding, no `cpu_ms`). Do **not** create copies inside the production account without explicit approval.

## 10. Go / no-go for the first production deployment

Go only when: unit tests for the record logic, the deploy command and smoke pass; the `dry_run` rehearsal is green for all three apps from a real `main` commit; the workerd smoke is green; the Environments, token and version-id anchors exist; the owner has approved the bootstrap. No-go if any record read is ambiguous, if the deploy job cannot reproduce the digest check, or if the Cloudflare plan or secrets cannot be confirmed.
