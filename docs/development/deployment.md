# Production deployment runbook

Authoritative design: `docs/plans/phase-4-production-deployment-spec.md` and `docs/plans/cicd-deployment-tracking-design.md`. This page says what is implemented, how to operate it, and what is still unverified.

## Status (read this first)

- **Implemented. The rehearsal path has run on GitHub Actions; the real-deploy path and `rollback.yml` have not, and nothing has run against Cloudflare:** `deploy.yml` (gate), `deploy-app.yml` (per-app plan, build and verify, rehearsal, deploy), `scripts/ci/deploy-gate.mjs`, `scripts/ci/deploy.mjs`, and the rollback workflow `rollback.yml`. They are unit-tested against fakes of GitHub and wrangler. Rehearsal evidence as observed on 2026-10-10 at `65d8602`: `Deploy production` dispatches with `bootstrap` and `dry_run` ticked reached a successful `rehearse` job for `web` (runs 38049202708, 38053997285), `admin` (38049479331) and `student` (38049715191); a first `web` attempt failed closed with `environment-unreadable` (HTTP 404) before the Environments existed (38048037726), and a non-bootstrap `web` plan failed `no-baseline` (38047780093, 38053532601). Re-check the run list yourself; this paragraph is a dated snapshot, not a live status.
- **Nothing has been deployed by this pipeline.** No deployment record exists, and the `PRODUCTION_DEPLOY_ENABLED` variable must stay unset until section 7 is complete. (The owner has created the GitHub Environments and their Cloudflare credentials; verify them with section 7A.) The live Workers were deployed from a developer machine and their current commit is unknown.
- **Every real deployment is switched off** until the repository variable `PRODUCTION_DEPLOY_ENABLED` is exactly `true` (the master switch; unset, empty, `false`, `TRUE`, `1` or any other value means off). It is enforced in the gate **and again inside the deploy executor** (`scripts/ci/deploy.mjs` refuses before reading anything). Until then a successful CI run produces a Deploy run that stops at the gate with a notice, and a real dispatch fails with `deploy-disabled`. Rehearsals (`dry_run`) do not need the switch.
- **Production rollback is not operational yet:** it needs deployment evidence records carrying the Cloudflare version id, which only a real deploy writes. Until the first verified deploy has happened a real rollback run refuses **and so does the rollback dry run** (`no-baseline`; it makes the same history checks), so the rollback workflow cannot be rehearsed green before the first deploy. Use the emergency path below. Do not call rollback operational until a rollback rehearsal has succeeded against real verified deployment history.

## 1. How a deployment runs

**Triggers** (`deploy.yml`)

- `workflow_run`: CI (`ci.yml`) completed on a push to `main`. Real deploy of every app that changed, only while the master switch is `true`.
- `workflow_dispatch`: choose `app` (`all`, `web`, `admin`, `student`), `bootstrap` (one app only) and `dry_run` (default **true**). Only from `main`: any other ref is refused by a job that fails the run, before the gate or any other job starts. A rehearsal does not need the master switch; a **real** dispatch needs it **and** each app's Environment approval.

**Gate (no credential; token scopes `contents: read`, `actions: read`).** The commit is `workflow_run.head_sha`, the commit CI actually ran on, never `github.sha` (which is the default-branch tip in that event). The run fails closed unless all of these hold: the triggering workflow is `CI` (`.github/workflows/ci.yml`), event `push`, branch `main`, this repository (not a fork), and concluded `success`; the workflow run read from the API is that same run, is CI's push-on-main run for exactly that SHA in this repository, is completed/success, and is **still on the attempt that triggered the deploy** (a later re-run makes the trigger stale and the newer attempt triggers its own deploy); in the jobs of that run's latest attempt exactly one job named `ci-gate` exists, belongs to that run, attempt and SHA, and is completed/success; and the commit is an ancestor of the current `origin/main`. For a dispatch the commit is the dispatched `main` tip and exactly one trusted CI run for it must exist. Missing, duplicated, unfinished, failed, truncated or unreadable results all fail the run. A CI run that did not succeed is a quiet no-op. The gate deliberately reads workflow runs and jobs rather than the check-runs list: the latter has no documented per-attempt behaviour (what `filter=latest` returns after a re-run is unspecified) and any GitHub App can create a check named `ci-gate`.

**Per app** (`deploy-app.yml`, called once per app; there is deliberately no matrix, so each app has its own jobs, outputs, approval and lock):

1. `plan` (no credential): reads the app's deployment record and the changed files, decides *deploy*, *skip* (already deployed, superseded by a newer deployment, or the app is unaffected) or *fail* (no history without an explicit bootstrap, unreadable or malformed history, diverged history, or a bootstrap when history exists). Nothing else runs for a skip.
2. `artifact` (no credential): the Phase 3 build and verify at the exact SHA. **This is the only build in the run**; the existing `ci.yml` build jobs upload nothing, so the deploy run builds once per app from the CI-verified commit and promotes that one build. The build job publishes the manifest digest as a job output (an independent channel). *Note the limit of what this proves:* CI proved that this **commit** passed its checks (unit and integration tests run on the source, and `cf:build` succeeded), **not** that these exact artifact bytes were tested by CI; the artifact is a separate build of the same commit and lockfile. The exact artifact is verified for integrity and provenance, started in local workerd and dry-run bundled by the verify job, and smoke-tested in production after the deploy.
3. `rehearse` (`dry_run` true; no credential, no approval, and no `environment:` key in the job): first **reads the `production-<app>` GitHub Environment through the API and fails closed unless it exists, has required reviewers and a `main`-only branch policy** (`deploy.mjs`, before the artifact check and the decision; the same check as the real deploy, section 3). It then downloads and verifies the artifact, repeats the decision, builds the exact deploy command, and runs `wrangler deploy --dry-run`. It writes nothing. Do not confuse the two: the *real* deploy job names the Environment and waits for a reviewer's **approval**; the rehearsal only **checks the Environment's protection** and requests no approval.

   **A `skip` is not a rehearsal.** When the plan decides *skip* (`already-deployed`, `unchanged` or `superseded`) the `artifact` and `rehearse` jobs are skipped and the run still ends green; nothing was built, verified or dry-run bundled. A rehearsal counts only if the `rehearse` job itself ran and succeeded and its output shows `"action": "rehearsed"` (a skip prints `skipped` instead). Once an app's SHA is its recorded last good SHA, re-running a rehearsal at that SHA proves nothing.
4. `deploy` (`dry_run` false): Environment `production-<app>`, lock `deploy-<app>` (`cancel-in-progress: false`, shared with `rollback.yml`). It downloads the artifact (`digest-mismatch: error`), verifies it again against the digest from the build job, the SHA and the run id, then `deploy.mjs` runs these checks **in this order, before any record is written or wrangler is run**: both Cloudflare variables present; the master switch is exactly `true`; **the GitHub Environment is protected** (see section 3); the artifact's manifest digest, SHA, run id, **repository, run attempt**, app, worker, inventory digest and extracted tree; and the deploy decision, repeated under the lock. Only then does it close interrupted records, write the intent record, run `wrangler deploy` on the extracted tree, confirm the version, and smoke-test. The Cloudflare credential exists only in the final `Deploy` step.

**What the deploy never does:** rebuild (no `cf:build`, `opennextjs-cloudflare`, or `pnpm deploy`), run migrations or seeds, read a database URL, or pass any variable or secret except the two Cloudflare names to wrangler.

The command is `wrangler deploy --config wrangler.jsonc --keep-vars --tag sha-<12> --message "<run url> <full sha>"` from the app directory, with `OPEN_NEXT_DEPLOY=true` and `WRANGLER_OUTPUT_FILE_PATH` set.

## 2. Deployment records (GitHub Deployments, per app environment)

A deploy writes **two** records so that an attempt and a confirmed deployment are never confused:

| Record | Written | Carries | Final status |
|---|---|---|---|
| **intent** (`phase: intent`) | before `wrangler deploy` | app, worker, full SHA, repo, run id, run attempt, kind (`deploy` or `bootstrap`). **No version id.** | `inactive` once the evidence exists (`deploy-superseded`); `failure` if wrangler failed (`deploy-failed`); `error` if the result could not be verified (`deploy-unverified`). Never `success`, and a success status on an intent record is ignored by every reader. |
| **evidence** (`phase: evidence`) | only after the version was observed **and verified** | the above plus the Cloudflare `versionId` | `success` (`deploy-verified`) only after the smoke test passes; `failure` (`deploy-smoke-failed`) if it does not; `error` if it could not be completed. |

The version is confirmed, not assumed: wrangler's output file must hold exactly one `deploy` entry with a valid version id, `wrangler deployments status --json` must show exactly that version live at 100%, and the version's own tag and message (`wrangler versions view --json`) must match this commit and run. Exit code zero alone proves nothing. If any of this fails, **no evidence record is written**; the intent is closed as `error`, the job fails, and the live state is reported as unverified. A later deploy first closes any record that never finished (`deploy-interrupted`), then continues. If the newest record shows a previous attempt that left the live state uncertain (wrangler failed, or the result could not be verified), or one that never finished, the plan and the deploy print a warning, so a redeploy over an unrecorded live version is never silent. A version tied to two commits (contradictory history) stops the plan and the deploy.

Readers trust only records created by `github-actions[bot]` in the app's own environment whose payload matches their own deployment; anything else, and any malformed, contradictory or ambiguous record, is ignored or fails closed. The deploy base ("last good SHA") is the newest evidence record with a `success` status.

## 3. Configuration that must exist before the first real run (owner actions)

None of this is created or checked by the repository; verify each item yourself.

- **GitHub Environments** `production-web`, `production-admin`, `production-student`, created **before** anything references them (GitHub silently creates an unprotected environment when a job names one that does not exist): required reviewer(s), and a **custom deployment-branch policy that allows exactly `main`**. The deploy executor reads each Environment through the API and **refuses to run (in a rehearsal too) unless it exists, has a required-reviewers rule with at least one reviewer, and its branch policy is exactly `main`** (`environment-unreadable`, `environment-unprotected`, `environment-branches`); "protected branches" alone is not accepted. This needs the token scope `actions: read`, which the rehearse and deploy jobs request. A missing Environment therefore cannot become an unprotected deployment, and a repository-level secret cannot bypass the check. The sole maintainer approving their own deploys is an accepted, documented risk until a second person exists; if repository admins can bypass the reviewers the run prints a warning.
- **Per Environment:** secret `CLOUDFLARE_API_TOKEN` (the "Edit Cloudflare Workers" template, scoped to this account and the `rms-careers.com` zone) and variable `CLOUDFLARE_ACCOUNT_ID`. No Cloudflare credential as a repository secret; no production database URL anywhere in GitHub.
- **Repository variable** `PRODUCTION_DEPLOY_ENABLED` (the master switch): leave it unset until the checklist in section 7 is complete; set it to exactly `true` only then. Setting it to `false` (or deleting it) stops every real deployment again. An Environment-level variable of the same name overrides it for that app's deploy job only, so a single app can be switched off by setting `false` on its Environment.
- **Cloudflare:** Workers Paid plan (admin sets `limits.cpu_ms` above 30,000); the token can re-attach the existing custom domains on redeploy; each Worker's runtime secrets (`POSTGRES_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, as listed in each `wrangler.jsonc`) are already set in Cloudflare (a deploy never sets or changes them).
- **Record each Worker's current version id** (`wrangler versions list --name rms-<app>`, or the dashboard, with your own Cloudflare login, outside the pipeline) before the bootstrap deploy. It is the only way back to what is live today, and it has no deployment record, so it can only be restored with the emergency path.

## 4. First deployment (bootstrap)

There is no deployment record and the live commit is unknown, so a normal run **fails closed** (`no-baseline`); it never guesses and never invents history.

1. Complete section 3 and record the version ids.
2. Actions → "Deploy production" → Run workflow on `main`: choose **one** app, tick `bootstrap`, leave `dry_run` ticked (a normal plan without `bootstrap` fails `no-baseline`, and `all` cannot be combined with `bootstrap`, so three apps need three dispatches). The rehearsal checks the Environment's protection, reads the record and verifies the artifact without credentials. (The rehearsal's decision for a bootstrap with an empty history is "deploy"; with history present it refuses `bootstrap-not-needed`.)
3. Only now set the repository variable `PRODUCTION_DEPLOY_ENABLED` to `true` (a real deploy refuses without it), then run it again with `dry_run` unticked. The gate runs, the build is verified, and the job waits for that app's Environment approval; the executor then checks the Environment is protected before it uses the credential. After approval it writes the intent and evidence records with `kind: bootstrap`. Bootstrap is never implicit: with no history and no explicit bootstrap, a run fails with `no-baseline`.
4. Do the safest app first (web), confirm the smoke result and the version, then repeat for admin and student. Each bootstrap replaces what is live with the current `main`.

A bootstrap is refused when a verified deployment already exists for the app (`bootstrap-not-needed`), when more than one app is selected, and from any ref but `main`.

## 5. Smoke tests and failure handling

Unauthenticated GETs with redirects not followed, retried about 10 times at 6 s for edge propagation: `web`: `/` (200 HTML), `/robots.txt`, `/sitemap.xml` (200). `admin` and `student`: `/login` (200 HTML) and `/` (307 to `/login`).

| Failure | Result | Live state | What to do |
|---|---|---|---|
| gate, plan or artifact verification fails | job fails, nothing written | unchanged | read the error; fix and re-run |
| intent record cannot be written | job fails | unchanged | nothing was deployed |
| `wrangler deploy` fails | intent `failure` | **possibly changed** | check `wrangler deployments status --name rms-<app>`; a rollback run refuses until the live version is accounted for, so use the emergency path if needed |
| deploy succeeded but the version cannot be confirmed | intent `error`, no evidence | **changed, unverified** | same as above |
| verified, but smoke test fails | evidence `failure`; base does not move | new version live | roll back (section 6) |
| everything verified | evidence `success` | new version live; base moves | none |

There is no automatic rollback: a smoke failure can be a database or edge problem rather than the code.

## 6. Deployment and rollback

They share the lock `deploy-<app>` and the same record, so a deploy and a rollback of one app never interleave. How GitHub's concurrency groups behave, and what that means here: a **running** job is never cancelled by a newer one (`cancel-in-progress: false`); a newer run **waits** (is *pending*), and only the single most recent pending run is kept, so an older **pending** run is cancelled. A pending run has not started, so it has written nothing: replacement can drop a deploy or rollback you were waiting on, but it cannot leave an unsettled record or an unrecorded live version. A dropped *deploy* is harmless (the next deploy diffs from the recorded base, so it covers the dropped one's changes); a dropped *rollback* is lost operator intent, so after dispatching a rollback, **check that its run is still queued or running**. Whether a job waiting for Environment approval counts as pending or as running for this purpose is not established from the documentation; either way nothing has been written yet. A run that is cancelled by hand or killed while *running* (after the lock was taken) can leave a record that never finished: the next deploy closes it as `deploy-interrupted`, a rollback refuses while it is the newest record, and a version that was deployed but not recorded makes a rollback refuse (`live-mismatch`). There is deliberately no automatic cleanup step.

A rollback target must be an evidence record with a version id (so only versions deployed by this pipeline). The live version must be one the record accounts for: the last good version or the version of a newer failed attempt. After a deploy that went live but failed its smoke test, rolling back to the previous good version is allowed. A live version nobody recorded (a manual change, or a deploy that could not be verified) makes a rollback refuse. See the rollback section below.

## 7. First-deployment checklist

Three parts. **A** can be completed without deploying anything. **B** is the first real bootstrap deployment and changes production: do not start it without an explicit human decision. **C** is verification and recovery preparation after B.

### 7A. Before deploying (changes nothing in production)

GitHub:

- [ ] The Environments `production-web`, `production-admin` and `production-student` exist (Settings → Environments).
- [ ] Each is restricted to the single deployment branch `main` (custom branch policy; "protected branches" alone is rejected by the executor), has a required-reviewers rule with at least one reviewer, and has **"Allow administrators to bypass configured protection rules" switched off**. The executor only *warns* about administrator bypass (`canAdminsBypass` in the rehearsal output), so check this yourself. A sole maintainer approving their own deployment is an accepted, documented risk.
- [ ] Each Environment holds the secret `CLOUDFLARE_API_TOKEN` and the variable `CLOUDFLARE_ACCOUNT_ID`; neither exists at repository level. Never paste either value anywhere.
- [ ] The repository variable `PRODUCTION_DEPLOY_ENABLED` is **unset** (or `false`) throughout this part.
- [ ] **`main` branch protection / rulesets are assessed.** `ci-gate` is documented as the required check, but nothing enforces it unless a branch protection rule or ruleset requires it (on 2026-10-10 neither existed). Enabling the master switch turns on the automatic `workflow_run` path for every push to `main`, so an unenforced `ci-gate` is a **blocker to enabling the switch** until it is resolved (a rule requiring `ci-gate` and pull requests) or the owner explicitly records that the risk is accepted.
- [ ] The workflow-lint job (`lint workflows`, actionlint) and `ci-gate` are green in the CI run for the exact `main` SHA you will deploy.
- [ ] A bootstrap rehearsal has succeeded for **each** app, from `main`, one dispatch per app: `Deploy production` with `app` = the app, `bootstrap` ticked, `dry_run` ticked. For each, open the run and confirm that the `rehearse` job **ran and succeeded** and printed `"action": "rehearsed"`, `"decision": {"code": "bootstrap"}` and the `environment` block (`reviewerRules` ≥ 1, `canAdminsBypass: false`). A run whose build and rehearse jobs are skipped (a `skip`), or whose plan failed, is not a rehearsal. Re-run an app if its Environment settings changed after its last rehearsal.
- [ ] A normal (non-bootstrap) plan for an app fails closed with `no-baseline` while no verified record exists. This is the expected, safe result, not a defect.
- [ ] The rollback dry run (`Rollback production (per app)`, from `main`, `dry_run` ticked, any well-formed UUID) has been run once and **fails closed with `no-baseline`**. That proves only that the Deployments record can be read; it does not rehearse rollback, and a green result is impossible before the first verified deploy.

Cloudflare (with your own login or the dashboard; never display secret values):

- [ ] The token's scope is verified without printing it (for example `wrangler whoami` or the dashboard's token page): "Edit Cloudflare Workers" style, limited to this account and the `rms-careers.com` zone, able to deploy `rms-web`, `rms-admin` and `rms-student` and to re-attach their custom domains (`www`, `admin`, `student`).
- [ ] The required runtime secrets exist on each Worker (`wrangler secret list --name rms-<app>` shows names only). Expected names from each `wrangler.jsonc` (`secrets.required`): `rms-web`: `POSTGRES_URL`; `rms-admin`: `POSTGRES_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`; `rms-student`: `POSTGRES_URL`, `AUTH_SECRET`. Optional (email is skipped when unset): `RESEND_API_KEY`, `EMAIL_FROM`. A deploy never sets or changes secrets.
- [ ] The account is on the Workers **Paid** plan: `rms-admin` configures `limits.cpu_ms` = 300000 (the Paid maximum; the free plan cannot honour it).
- [ ] **Each Worker's current live version id is recorded manually, outside the pipeline** (`wrangler versions list --name rms-<app>` or the dashboard), with the date. The pre-pipeline version has no deployment record, so this is the only way back to it (section 9).

Decision:

- [ ] You have read the **unverified** list below and accept it, and you have decided explicitly to start part B, one app first.

### 7B. First real bootstrap deployment (CHANGES PRODUCTION; only after an explicit human decision)

Nothing in this document, and no rehearsal, starts this part. Per app, in this order: `web`, then `admin`, then `student`:

- [ ] Set the repository variable `PRODUCTION_DEPLOY_ENABLED` to exactly `true`. Keep `main` quiet from now until the switch is off again (every push to `main` can start an automatic run).
- [ ] Dispatch `Deploy production` from `main` with **exactly one** app, `bootstrap` ticked, and `dry_run` **unticked** (only now).
- [ ] Approve the Environment deployment for that app, after checking the commit, the app and the run.
- [ ] Do the next app only after part C passes for this one.
- [ ] When the bootstrap window is over, set `PRODUCTION_DEPLOY_ENABLED` back to unset or `false` if automatic deployment should stay off.

### 7C. After each bootstrap (verification and recovery preparation)

- [ ] The run's summary and log show the intent and evidence records, a version id, and "version and smoke verified". The app's `production-<app>` Environment has an evidence record (`phase: evidence`, `kind: bootstrap`) with a `success` status, and the intent record is `inactive`.
- [ ] The live Worker version (`wrangler deployments status --name rms-<app>`) is the version id in the evidence record, at 100%, and its tag and message name this commit and run.
- [ ] The custom domain still serves (`www`/`admin`/`student.rms-careers.com`), the production smoke test passed, and the application itself works (sign-in for `admin` and `student`, a real page for `web`).
- [ ] The version id you recorded in 7A is kept, and the new live version id is recorded next to it.
- [ ] Only now may the rollback workflow be rehearsed against real history (`dry_run`). Rollback is **not** operational until that rehearsal succeeds *and* a rollback target exists: the bootstrap version is the live one and cannot be a target, so the first possible target is the version of the next verified deployment. Rolling back to the pre-pipeline version is the manual emergency path (section 9).

**Unverified until a first real run** (taken from documentation and the installed wrangler 4.147.0 source, not from a live call): the GitHub workflow-run and job field names used by the gate, and the workflow-runs-by-commit query; the Environment and deployment-branch-policy response shapes and that `GITHUB_TOKEN` with `actions: read` may read them (a failure makes the deploy and rehearsal refuse, never pass); `deployments: read/write` on `GITHUB_TOKEN`; environment-scoped secrets inside a reusable workflow (variables were observed to arrive; secrets resolved empty until the callers in `deploy.yml` passed `secrets: inherit`, runs 38057566875 and 38058765155); that a called workflow keeps the permissions its caller job grants; the `versions view --json`, `deployments status --json` and output-file shapes, and `percentage === 100` as the signal for a single live version; that Cloudflare accepts the `--tag`; that `wrangler deploy` with `--config` runs cleanly on the extracted artifact (only `--dry-run` has been exercised); that the token can attach the custom domains. A mismatch in any of these makes the pipeline refuse, not misbehave, but you will see failures on the first real run. **Known limits:** records are read in full up to 1000 deployments per app (each deploy adds two, and each approved job adds one GitHub creates itself), after which every operation fails closed until old records are compacted by hand; the build attempt is bound only through the digest hand-off and a "not later than this attempt" check.

## 8. Rolling back one app

Prerequisites: the same Environments and credentials as section 3, and at least one verified deployment by this pipeline. Without a verified deployment record, both the real run **and the dry run** fail closed with `no-baseline`, so rollback cannot be rehearsed before the first bootstrap.

1. Find the target: `wrangler versions list --name rms-<app>` (needs your own login). Pick a version deployed by the pipeline (its message ends with a run URL and a commit SHA) that has a deployment record carrying that version id.
2. Actions -> "Rollback production (per app)" -> Run workflow on `main` (any other ref is refused by the `refuse-non-main` job, dry run or not): choose the app, paste the version UUID, give a reason. Leave `dry_run` ticked first: it reads the deployment record and prints the exact command, changing nothing and using no credentials.
3. Re-run with `dry_run` unticked and approve the Environment. The job reads the Worker's live version from Cloudflare and refuses, changing nothing, if: the record cannot be read, has no baseline, is ambiguous (one version tied to two commits), or its newest record never reached a final state (an interrupted deploy/rollback); the last good record has no Worker version id; the live version is not one the record accounts for (someone changed the Worker outside the pipeline, or the record is stale) or is a gradual rollout; the target is the version already live; the target has no verified success record for this app; or the Worker's tag/message do not match the record.
4. After a successful rollback the recorded last good SHA becomes the rolled-back commit. The faulty change is probably still on `main`: revert or fix forward before the next deploy, or the next deploy will ship it again.

Outcomes are recorded as deployment statuses: `rollback-in-progress`, `rollback-recovered` (success: live version equals the target and smoke passed), `rollback-unverified` (failure: applied or possibly applied, but live state or smoke did not confirm; check the Worker by hand), `rollback-failed` (failure: wrangler refused, nothing applied) and `rollback-aborted` (error: stopped before changing anything).

A rollback restores Worker code and configuration only. It does not restore Worker secrets or database state; never roll back across a database migration that the older code cannot read (migrations are separate and manual, spec section 6).

## 9. Emergency path (pipeline unavailable, or the target predates the pipeline)

From a trusted machine with your own Cloudflare login: `wrangler rollback <version-id> --name rms-<app> -m "<reason>"`, then run `node scripts/ci/smoke.mjs --app <app> --production`. The deployment record is then stale: the next deploy still diffs from the older base (safe), but the next **rollback run refuses** (`live-mismatch`) until a later recorded deploy or rollback accounts for the live version, so do further rollbacks by hand too until then. Safe on the deploy side: the next deploy diffs from the older base and the ancestor rule stops it going backwards. Note the action in the incident log.
