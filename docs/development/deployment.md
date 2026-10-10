# Production deployment runbook (partial)

Status: only the rollback section exists. There is no deploy workflow yet; see `docs/plans/phase-4-production-deployment-spec.md`.

**Production rollback is not operational yet.** A real rollback needs deployment records that carry the Cloudflare version id, and only the future deploy workflow writes them. Until it exists a real run refuses (no baseline / no version id), and only the `dry_run` rehearsal is meaningful. Use the emergency path below for any real rollback.

## Rolling back one app

Prerequisites (owner, once): Environments `production-web|admin|student` with required reviewers and the `main` branch restriction; `CLOUDFLARE_API_TOKEN` (secret) and `CLOUDFLARE_ACCOUNT_ID` (variable) in each.

1. Find the target: `wrangler versions list --name rms-<app>` (needs your own login). Pick a version deployed by the pipeline (its message ends with a run URL and a commit SHA) that has a deployment record carrying that version id.
2. Actions -> "Rollback production (per app)" -> Run workflow on `main`: choose the app, paste the version UUID, give a reason. Leave `dry_run` ticked first: it reads the deployment record and prints the exact command, changing nothing and using no credentials.
3. Re-run with `dry_run` unticked and approve the Environment. The job reads the Worker's live version from Cloudflare and refuses, changing nothing, if: the record cannot be read, has no baseline, is ambiguous (one version tied to two commits), or its newest record never reached a final state (an interrupted deploy/rollback); the last good record has no Worker version id; the live version is not one the record accounts for (someone changed the Worker outside the pipeline, or the record is stale) or is a gradual rollout; the target is the version already live; the target has no verified success record for this app; or the Worker's tag/message do not match the record.
4. After a successful rollback the recorded last good SHA becomes the rolled-back commit. The faulty change is probably still on `main`: revert or fix forward before the next deploy, or the next deploy will ship it again.

Outcomes are recorded as deployment statuses: `rollback-in-progress`, `rollback-recovered` (success: live version equals the target and smoke passed), `rollback-unverified` (failure: applied or possibly applied, but live state or smoke did not confirm; check the Worker by hand), `rollback-failed` (failure: wrangler refused, nothing applied) and `rollback-aborted` (error: stopped before changing anything).

If a deploy went live but failed its smoke test, rolling back to the previous good version is allowed (the failed attempt's own version id accounts for the live state).

A rollback restores Worker code and configuration only. It does not restore Worker secrets or database state; never roll back across a database migration that the older code cannot read (migrations are separate and manual, spec section 6).

## Emergency path (pipeline unavailable, or the target predates the pipeline)

From a trusted machine with your own Cloudflare login: `wrangler rollback <version-id> --name rms-<app> -m "<reason>"`, then run `node scripts/ci/smoke.mjs --app <app> --production`. The deployment record is then stale: the next deploy still diffs from the older base (safe), but the next **rollback run refuses** (`live-mismatch`) until a later recorded deploy or rollback accounts for the live version, so do further rollbacks by hand too until then. Safe on the deploy side: the next deploy diffs from the older base and the ancestor rule stops it going backwards. Note the action in the incident log.
