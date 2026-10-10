# RMS-Careers — Path-Aware CI/CD Audit and Implementation Plan

**Status: AUDIT ONLY — NO IMPLEMENTATION PERFORMED.**
Date: 2026-10-09. Scope: GitHub Actions as the CI/CD orchestrator for the three Cloudflare Workers apps (OpenNext + Wrangler).

Method: read-only inspection of the repository (manifests, `wrangler.jsonc`, `open-next.config.ts`, `next.config.*`, middleware, `scripts/`, `.github/workflows/ci.yml`), the installed tool versions (`opennextjs-cloudflare` 1.20.8, `wrangler` 4.147.0, `next` 15.5.27, pnpm 9.15.4, Node 22), and an **empirical test of pnpm's changed-since filter in a throw-away local clone** (deleted afterwards; this working tree was not touched). Nothing was deployed, no workflow was changed, and no secret was read or printed.

Evidence labels used below: **[verified]** = observed locally; **[repo]** = proven by repository contents; **[inferred]** = reasoned, needs confirmation in the first implementation phase; **[dashboard/GitHub]** = cannot be seen from the repo.

---

## 1. Executive summary

* The repository has **two internal packages (`@rms/db`, `@rms/auth`) and three deployable apps**. The dependency graph is tiny and fully declared; I found **no hidden cross-package imports** (no relative `../../packages` imports, no cross-app imports, tsconfig `paths` only alias `@rms/db/*` which is already a declared dependency). A graph-derived affected-app algorithm is therefore safe.
* **The graph is not "everything affects everything":** `@rms/auth` is consumed by **admin + student only**; `web` depends only on `@rms/db`. `@rms/db` is consumed by **all three** (and by `@rms/auth`).
* **pnpm's built-in `--filter "...[BASE]"` is the right graph engine** — no new dependency. I verified it selects the changed project plus all dependents correctly. It has one important gap: **every root-level file (docs, lockfile, scripts, workflows) collapses into a single `rms-careers` root project**, so docs-only and lockfile changes are indistinguishable. A small classification step (≈60 lines of dependency-free Node, `scripts/ci/affected.mjs`) must sit on top for non-package paths.
* **Build and deploy are already separable in the installed tooling [verified from source]:** `opennextjs-cloudflare deploy` does **not** rebuild. It reads an existing `.open-next/` directory, runs `populateCache` (a no-op with the current config — no R2/KV/D1 bindings) and then `wrangler deploy`. `pnpm deploy` is just `cf:build && opennextjs-cloudflare deploy`. So **"build once in a credential-free job → upload `.open-next` as an artifact → deploy that exact artifact in a credentialed job" is feasible**, with the caveat that the deploy job still needs the same commit checked out and `pnpm install` (Wrangler re-bundles `.open-next/worker.js` and needs `node_modules`).
* **Recommended architecture:** extend the existing `ci.yml` into one workflow with a `detect` job feeding gated `validate → build → deploy → smoke` jobs, deploying **only from `main`**, with Cloudflare credentials **only** in a `production` GitHub Environment attached to the deploy jobs. Add two small manual workflows later (`rollback-production.yml`, and a *separate, deliberate* `db-migrate-production.yml`). Database migrations are never a side effect of an app deploy.
* **Two design traps that a naïve "diff against previous commit" implementation would hit — both are addressed in this plan:**
  1. *Lost deploys:* if commit A (web change) fails to deploy or is superseded and commit B (admin only) lands, "diff vs previous commit" would never deploy A's web change. The deploy base must be **"last successfully deployed SHA per app"**, not `HEAD~1`.
  2. *Stale overwrite:* two pushes to `main` racing. Use a non-cancelling, serialized deploy concurrency group plus a "still the tip of main?" guard.
* **Pre-existing issue found (not caused by this plan, but it matters for CI-built artifacts):** `apps/web/app/sitemap.ts` queries the DB but is not `force-dynamic`; because production builds are made **without** `POSTGRES_URL` (the build guard forbids populated `.env*`), the sitemap may be generated at build time with **no program URLs** and be served stale. See §23 / Risk R7. Needs a human decision; not fixed here.
* **Prerequisite:** Slice 0 (`.github/workflows/ci.yml`, DB guard, test DB bootstrap) is currently **uncommitted/untracked**. This plan builds on it; merge Slice 0 first.

Expected effect: for the typical change (one app, or docs) CI+CD work drops from "3 builds + 3 deploys" to "1 build + 1 deploy" or "no build/deploy"; details in §20.

---

## 2. Current deployment architecture [repo]

| Item | web | admin | student |
|---|---|---|---|
| Worker name (`wrangler.jsonc`) | `rms-web` | `rms-admin` | `rms-student` |
| Domain (custom_domain route) | `www.rms-careers.com` | `admin.rms-careers.com` | `student.rms-careers.com` |
| `main` / assets | `.open-next/worker.js`, `.open-next/assets` | same | same |
| Required secrets (`secrets.required`) | `POSTGRES_URL` | `POSTGRES_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | `POSTGRES_URL`, `AUTH_SECRET` |
| Non-secret `vars` | — | `STUDENT_APP_URL`, `EMAIL_LOGO_URL` | `STUDENT_APP_URL` |
| Other | self service binding | `limits.cpu_ms = 300000` | — |
| `compatibility_date` / flags | `2026-10-04`, `nodejs_compat`, `global_fetch_strictly_public` (all) | | |
| Cache bindings (R2/KV/D1) | none | none | none |

* Each app's scripts (identical shape) **[repo]**:
  `cf:build` = `node ../../scripts/check-cloudflare-build-env.mjs pre && opennextjs-cloudflare build && node ../../scripts/check-cloudflare-build-env.mjs post`
  `preview` = `pnpm cf:build && opennextjs-cloudflare preview`
  `deploy` = `pnpm cf:build && opennextjs-cloudflare deploy`
* Path: **source → `next build` (inside `opennextjs-cloudflare build`) → `.open-next/{worker.js,assets,cloudflare/*}` → `opennextjs-cloudflare deploy` → (populateCache: no-op) → `wrangler deploy` (re-bundles `worker.js`, uploads assets, attaches custom-domain route) → Worker version**.
* **Mechanism today:** manual local Wrangler. There is no deploy workflow, no Workers Builds config in the repo, and (per the earlier investigation) no Wrangler login or Cloudflare token on this machine; how V1 first reached Cloudflare is not provable from the repo. You have stated Workers Builds is *not* connected — this plan keeps it that way.
* Secret handling: Worker secrets are set with `wrangler secret put` / dashboard (never committed). Wrangler 4.147.0 **validates `secrets.required` at deploy** and fails if one is missing ("The following required secrets have not been set") **[verified in wrangler source]** — a useful fail-closed property: a deploy to a Worker that lost its secrets aborts.
* **Build-secret guard** (`scripts/check-cloudflare-build-env.mjs`): `pre` refuses to build if any `.env`, `.env.<mode>`, `.env.local`, `.env.<mode>.local` (app dir or repo root) holds a non-empty value; `post` fails if `.open-next/cloudflare/next-env.mjs` embeds any variable. Prints names only. This is a security control and is **preserved unchanged** by this plan; CI (clean checkout, no env files) satisfies it by construction **[verified in a clean-clone simulation during Slice 0]**.

## 3. Current CI architecture [repo]

`.github/workflows/ci.yml` (Slice 0, untracked):
* Triggers: `push` to `main`; `pull_request` (all branches). `permissions: contents: read`. `concurrency: ci-${{ github.ref }}`, cancel-in-progress.
* Workflow-level `env: POSTGRES_URL: ''`, `DATABASE_URL: ''`.
* Jobs: `typecheck` (`pnpm typecheck`), `unit` (`pnpm test`), `integration` (needs `unit`; same-repo PRs/pushes only; secrets `TEST_DATABASE_URL`, `TEST_DATABASE_ENDPOINT`; runs `pnpm test:db:bootstrap` then `pnpm test:int`), `build` (`pnpm build` = **plain `next build` for all three apps, not `cf:build`**).
* No deploy step, no Cloudflare secret, no path awareness. Everything runs for every change.
* **Gap:** the OpenNext build (`cf:build`) is **not exercised in CI today**, and has only been built locally on Windows (docs say OpenNext is not reliable on native Windows). The first Linux `cf:build` is an explicit validation item (Phase 2).
* **Gap:** the integration job uses one shared Neon test branch; concurrent runs (several PRs) can collide. Needs a serializing concurrency group (§7.4).

---

## 4. Actual pnpm dependency graph [verified]

`pnpm-workspace.yaml`: `apps/*`, `packages/*`. Projects: `@rms/web`, `@rms/admin`, `@rms/student`, `@rms/db`, `@rms/auth`, and the root `rms-careers`.

```
@rms/web
└── @rms/db
@rms/admin
├── @rms/db
└── @rms/auth ── @rms/db
@rms/student
├── @rms/db
└── @rms/auth ── @rms/db
@rms/auth
└── @rms/db
@rms/db
└── (no workspace deps)
```

Cross-checked against real source imports (non-test): web imports `@rms/db` only; admin imports `@rms/db` (+ `/tx`) and `@rms/auth`; student imports `@rms/db` (+ `/schema`, `/tx`) and `@rms/auth`. (`@rms/db/guard-env` appears only in seed scripts, not runtime code.) `next.config.*` `transpilePackages`: web `['@rms/db']`; admin and student `['@rms/db','@rms/auth']` — matches the declared graph.

pnpm's own dependents queries [verified]: `...@rms/db` → admin, auth, db, student, web; `...@rms/auth` → admin, auth, student.

## 5. Application dependency matrix

| Shared package | web | admin | student | Notes |
|---|---|---|---|---|
| `packages/db` (all of `src/index.ts`, `schema.ts`, `guard.ts`) | ✔ | ✔ | ✔ | web imports the db index, which pulls in schema + guard |
| `packages/db/src/tx.ts` | ✘ | ✔ | ✔ | transactional client, web never imports it (refinement only; see §6) |
| `packages/db` non-runtime parts: `drizzle/**` (migrations), `scripts/**`, `src/testing/**`, `src/guard-env.ts`, `src/__tests__/**`, `vitest.config.ts`, `drizzle.config.ts` | ✘ | ✘ | ✘ | affect CI (tests, integration/bootstrap) but no Worker bundle |
| `packages/auth` | ✘ | ✔ | ✔ | web does not depend on it |
| Root infra (lockfile, root `package.json`, workspace file, `scripts/check-cloudflare-build-env.mjs`) | ✔ | ✔ | ✔ | see §7 |

There are no other shared packages. Adding a package later is handled automatically by the pnpm graph.

---

## 6. Proposed affected-app detection algorithm

**Principle:** use pnpm for the *graph*, a short classifier for *non-package files*, and **fail closed** (affect everything) whenever anything is unclassifiable.

Inputs: `BASE` and `HEAD` SHAs (BASE rules below), full history for those two commits (`fetch-depth: 0` or fetch both SHAs).

1. `files = git diff --name-only --no-renames BASE HEAD` (use `--no-renames` so a rename counts as delete+add under both paths).
2. **Graph set:** `pnpm --filter "...[BASE]" ls --depth -1 --json` (run on a clean checkout of `HEAD`, so the working tree adds nothing). Result = changed workspace projects ∪ all their dependents **[verified]**. If the root project `rms-careers` appears it only means "some root-level file changed"; do not interpret it further — step 3 handles root files.
3. **Root/other file classification** (table in §8), first match wins:
   * `DEPLOY_ALL` → mark web, admin, student all affected for CI **and** deploy.
   * `CI_ALL` → all apps for CI validation, **no deploy**.
   * `IGNORE` → contributes nothing.
   * *Unmatched file outside every workspace project and not in `IGNORE`* → `DEPLOY_ALL` (fail closed; a new root file is treated as infrastructure until classified).
4. **Runtime-irrelevant paths inside a package** (tests, markdown, migrations, seed/test tooling — listed in §8): excluded from the **deploy** set but **kept in the CI set** (tests must still run). Implemented either with pnpm's `--changed-files-ignore-pattern` (flag exists in pnpm 9; *the exact glob behaviour must be validated in Phase 1* — I did not get a clean result for it in my test) or in the classifier by computing two filtered file lists.
5. **Outputs** (job outputs, JSON): `ci.apps`, `ci.packages`, `deploy.apps`, `run_integration` (true iff admin, student, `@rms/db`, `@rms/auth`, or root-infra is in the CI set — web-only changes cannot affect the integration suites, which live in admin/student), `reason` (human-readable list of rules that fired), `mode` (`pr` | `main` | `manual`).
6. **Failure:** any error (git, pnpm, JSON parse, unknown base) → output `deploy.apps = [web,admin,student]` and `ci.apps = all` with `reason = "detection failed: …"`. Never output "nothing" on error. A genuinely empty diff outputs the empty set explicitly.

**BASE selection:**
* *Pull request:* `git merge-base origin/main HEAD` (not the PR base SHA alone, which can be stale).
* *Push to `main` — CI scope:* `github.event.before` (previous tip). If that is the all-zero SHA (new branch) or unreachable → all.
* *Push to `main` — deploy scope, per app:* **the SHA of the last successful production deploy of that app** (see §16.2 for where it is recorded). If no record exists or the SHA is not an ancestor of `HEAD` (force-push, history rewrite) → that app is deployed. This is what prevents the "lost deploy" trap.
* *`workflow_dispatch`:* explicit inputs (`apps`, or `all`).

Why not Turborepo/Nx/`dorny/paths-filter`? A hard-coded path→app mapping duplicates the graph and goes stale when a package or dependency is added; Turborepo/Nx are heavyweight new dependencies for a 5-project repo. pnpm already ships the graph query, and the classifier is the only code we own.

---

## 7. Complete path / invalidation matrix

Legend: ✔ = included. "CI" = typecheck + unit tests (+ build of the app). "Deploy" = production deploy from `main`.

### 7.1 Matrix

| Change (path) | Web | Admin | Student | Integration tests | Deploy | Reason |
|---|---|---|---|---|---|---|
| `apps/web/**` (source, `next.config.*`, `tsconfig.json`, `wrangler.jsonc`, `open-next.config.ts`, `package.json`, `public/**`) | ✔ | — | — | — | web | app-owned |
| `apps/admin/**` (same set) | — | ✔ | — | ✔ | admin | app-owned |
| `apps/student/**` (same set) | — | — | ✔ | ✔ | student | app-owned |
| `apps/*/**/__tests__/**`, `*.test.ts(x)`, `vitest*.config.ts` | CI only | CI only | CI only | per app | none | tests do not ship in the Worker (see §7.3 caveat) |
| `apps/*/scripts/**` (seed/verify scripts) | — | — | — | per app | none | not in the Next/OpenNext bundle [inferred; confirm no runtime import in Phase 1] |
| `apps/*/.env.example`, `.dev.vars.example`, `README.md` | — | — | — | — | none | docs/templates |
| `packages/db/src/{index,schema,guard}.ts`, `packages/db/package.json`, `packages/db/tsconfig.json` | ✔ | ✔ | ✔ | ✔ | all three | consumed by all; schema/runtime shared |
| `packages/db/src/tx.ts` | CI all (conservative) | ✔ | ✔ | ✔ | admin, student *(optional refinement; see §7.2)* | only admin/student import `tx` |
| `packages/db/drizzle/**` (migrations), `drizzle.config.ts` | CI | CI | CI | ✔ | **none** | migrations never deploy an app; applied only by the explicit migration process (§14) |
| `packages/db/scripts/**`, `src/testing/**`, `src/guard-env.ts`, `src/__tests__/**`, `vitest.config.ts` | CI | CI | CI | ✔ | none | CI/test tooling, not in any Worker bundle |
| `packages/auth/src/**` (non-test), `package.json` | — | ✔ | ✔ | ✔ | admin, student | web does not depend on it |
| `packages/auth/src/__tests__/**` | — | — | — | — | none | auth unit tests only (CI runs `@rms/auth` tests) |
| `pnpm-lock.yaml` | ✔ | ✔ | ✔ | ✔ | **all three** | cannot cheaply tell which importer changed; any resolved dependency can change a bundle (see §7.2) |
| root `package.json`, `pnpm-workspace.yaml` | ✔ | ✔ | ✔ | ✔ | all three | affects install/build globally |
| `scripts/check-cloudflare-build-env.mjs` | ✔ | ✔ | ✔ | — | all three | security guard wired into every `cf:build` |
| New/unknown `scripts/**`, any new root config file (`tsconfig.base.json`, `.npmrc`, `.nvmrc`, `.node-version`, `turbo.json`, eslint/prettier configs, …) | ✔ | ✔ | ✔ | ✔ | all three (fail closed) | unclassified = infrastructure |
| `.github/workflows/ci.yml` (the workflow itself) | CI all (dry-run builds, no deploy) | | | ✔ | **none** | see §7.3 |
| `.github/workflows/{rollback,db-migrate}-*.yml`, `.github/actions/**` | — | — | — | — | none | validated by actionlint (§12), no app impact |
| `docs/**`, `*.md`, `AGENTS.md`, `CLAUDE.md`, `CODEX.md`, `README.md`, `skills-lock.json`, `.agents/**` | — | — | — | — | **none** | documentation / tooling |
| `.gitignore` | — | — | — | — | none | (ignore rules cannot change a build; `.open-next` is ignored already) |

### 7.2 Policy choices explained

* **`packages/db` → all three apps (not "consumers only").** The graph says all three consume it, and web imports `index.ts` which re-exports `schema.ts`. Because `schema.ts` changes can change runtime behaviour in every app (and the DB is shared), the safe policy is *all consumers = all three*. A narrower `tx.ts → admin+student` rule is a correct optimization but saves little (tx changes are rare) and adds a rule to maintain; **recommended: ship without it, add later if wanted.** Migrations/seed/test tooling inside `packages/db` are *excluded from deploy* because they are provably not imported by any app (verified by import scan) — these changes run CI only.
* **`packages/auth` → admin + student.** Exactly the graph; web has no dependency on it.
* **`pnpm-lock.yaml` → all three.** A lockfile diff can be narrowed per importer (the lockfile has an `importers:` section), but parsing it is exactly the "fragile dependency-analysis system" to avoid, and a root dependency bump (Next, OpenNext, Wrangler, React) legitimately affects every bundle. Lockfile changes are infrequent; the extra cost is acceptable. Possible later refinement: if the diff is confined to `importers./apps/<x>` blocks, narrow to that app.
* **Root `package.json`, `pnpm-workspace.yaml`, `scripts/check-cloudflare-build-env.mjs` → all three** for the same reason; the guard script is a security control, so changes to it must be proven against every app.
* **Unclassified root file → all three** (fail closed) rather than ignore.
* **`docs/**` and markdown → nothing.** No build, no deploy, no tests (a pure-docs change should finish in seconds; only the `detect` job and a trivial "nothing to do" summary run).

### 7.3 Workflow changes and tests-only changes (the exceptions)

* **Workflow-file changes never deploy by themselves.** On a PR they run the full CI path including `cf:build` for all three apps (credential-free) so the pipeline definition is exercised; on `main` they produce `deploy.apps = []`. A workflow change still *executes* the new workflow on `main`, but with an empty deploy set nothing reaches Cloudflare. This also means a brand-new deploy workflow can be merged and observed in "dry" mode before it first deploys.
* **Tests-only changes inside an app** are excluded from the deploy set. Conservative alternative if the team prefers zero cleverness: let any change under `apps/<x>/**` deploy `<x>`; the cost is occasional redundant deploys. The exclusion list is short and explicit, so both are viable; the audit recommends the exclusion for `__tests__/**`, `*.test.*`, and `vitest*.config.*` only.
* **Dependency on `wrangler.jsonc` / `open-next.config.ts` / `package.json` in an app** → that app only (secret/vars/routes/limits live there).

---

## 8. Classifier rule table (for `scripts/ci/affected.mjs`)

Evaluated top to bottom; first match wins.

| # | Pattern | Class |
|---|---|---|
| 1 | `pnpm-lock.yaml`, `package.json` (root), `pnpm-workspace.yaml`, `scripts/**` | DEPLOY_ALL |
| 2 | `.github/**` | CI_ALL (no deploy) |
| 3 | `docs/**`, `**/*.md`, `.agents/**`, `skills-lock.json`, `.gitignore`, `**/.env.example`, `**/.dev.vars.example` | IGNORE |
| 4 | `packages/db/{drizzle,scripts}/**`, `packages/db/src/{testing,__tests__}/**`, `packages/db/src/guard-env.ts`, `packages/db/{vitest.config.ts,drizzle.config.ts}` | CI-only for `@rms/db` dependents (no deploy) |
| 5 | `**/__tests__/**`, `**/*.test.ts(x)`, `**/vitest*.config.ts`, `apps/*/scripts/**` | CI-only for the owning project |
| 6 | Any file under a workspace project path | handled by pnpm graph (project + dependents) |
| 7 | anything else | DEPLOY_ALL (fail closed) |

Rule 4/5 exist only to avoid pointless deploys; if they prove fragile they can be deleted and the graph rule (6) alone is still correct (just more conservative).

---

## 9. Proposed GitHub Actions architecture

### 9.1 Structure (recommendation: simple, three files)

```
.github/workflows/ci.yml                    # extended: detect → validate → build → (main only) deploy → smoke
.github/workflows/rollback-production.yml   # manual (workflow_dispatch), small, Phase 6
.github/workflows/db-migrate-production.yml # manual, separate, Phase 7 (not part of app deploy)
scripts/ci/affected.mjs                     # detection (no dependencies)
scripts/ci/smoke.mjs                        # smoke checks (no dependencies)
```

**Why one `ci.yml` rather than a separate `deploy-production.yml` triggered by `workflow_run`?**
* A separate workflow cannot reuse the CI run's artifacts without cross-run downloads, must re-establish "CI passed for this exact SHA", and `workflow_run` executes with the *default-branch* workflow and secrets in a way that is easy to mis-scope. In one workflow, `needs:` gives us the gate, artifacts are shared, and the `production` environment attaches only to the deploy jobs.
* Reusable workflows/composite actions are **not** worth it yet: only a "setup (checkout + pnpm + node + install)" block repeats, and three copies of five lines are simpler than an indirection. Revisit if a fourth app (`tutor`) is added; at that point a composite action for setup is reasonable.

### 9.2 Job graph

```
detect  (no secrets; outputs: matrices + flags)
  │
  ├─ typecheck-and-unit   (affected workspaces only; no secrets)
  ├─ integration          (if run_integration; TEST_* secrets only; serialized on the test DB)
  ├─ build-<app> × affected (matrix; `pnpm --filter … cf:build`; upload .open-next artifact; NO secrets)
  │        │
  │   ci-gate  (single required status check; always runs; fails if any needed job failed/was unexpectedly skipped)
  │        │
  └─ [push to main only] deploy-<app> × deploy.apps   (environment: production; Cloudflare token only here)
           │
        smoke-<app>   (no secrets; plain HTTPS GETs)
```

* `detect` has `permissions: contents: read` (and `deployments: read` on main to look up last-deployed SHAs). Outputs JSON consumed with `fromJSON` for matrices; an empty matrix skips a job cleanly (use an `if:` on `needs.detect.outputs.<x> != '[]'` because GitHub errors on empty matrices).
* **`ci-gate`** is the *only* required status check in branch protection (needs `if: always()`), so path-skipped jobs don't leave a required check "pending" forever.
* `build-<app>` uses `pnpm --filter @rms/<app> cf:build` (guard `pre` → OpenNext build → guard `post`), so **PRs prove deployability** without credentials. `pnpm build`/`next build` is no longer needed separately.
* Caching: `actions/setup-node` with `cache: pnpm` (already used); optionally cache `apps/<app>/.next/cache` keyed by lockfile hash + app (Next build cache). Do not cache `.open-next` (artifact handles it).
* Action pinning: pin third-party actions to full commit SHAs (Dependabot-updated), since the deploy job holds a production credential.
* Node: 22 (Wrangler requires `>=22`). Pin `pnpm/action-setup` to the repo's `packageManager` (9.15.4) — already how v4 resolves it.

---

## 10. PR CI behaviour

* Triggers: `pull_request` (any branch, including `hardening/*`, feature branches). **No deployment job exists on this path** (`if: github.event_name == 'push' && github.ref == 'refs/heads/main'` on deploy jobs, plus the environment's own branch restriction; two independent locks).
* Runs for the affected set only: typecheck + unit (affected workspaces via pnpm filter), integration (if flagged), `cf:build` of affected apps, build-guard checks, `actionlint` if workflow files changed.
* Answer to "PR builds: all or affected?": **affected only**, because the graph is complete and verified (§4) and every root-level/unknown file escalates to all. Workflow changes escalate CI to all three `cf:build`s.
* Fork PRs: no secrets are available, `integration` is skipped by its existing condition (`head.repo.full_name == github.repository`), `ci-gate` treats that specific skip as acceptable only for fork PRs (maintainers can re-run from a branch).
* Docs-only PR: `detect` + `ci-gate` only; seconds.

## 11. `main` deployment behaviour

* Trigger: `push` to `main` (merge). `workflow_dispatch` (restricted to `main`) allows manual "deploy app X / all" from the Actions UI.
* Sequence: detect (per-app deploy base = last successful deploy) → typecheck/unit → integration (if flagged) → build artifacts → `ci-gate` → deploy each affected app (parallel across apps, each its own job) → smoke each deployed app.
* **An app is deployed only if** it is in `deploy.apps` **and** `ci-gate` is green **and** the commit is still the tip of `main` (§16.3).
* Apps not affected are untouched (their Worker version is not re-uploaded).
* A deploy failure for one app does not roll back or block other apps' deploys (independent jobs), but marks the run failed and — because the failed app's deploy record is *not* written — the next `main` push re-includes it (§6, "lost deploy" fix).

---

## 12. Build-once / deploy-the-same-artifact analysis

**Findings [verified from installed source/CLI]:**
* `opennextjs-cloudflare build` produces `.open-next/` (≈35 MB for web locally). `opennextjs-cloudflare deploy` consumes it; it calls `populateCache` (no-op here: no `r2_buckets`/`kv_namespaces`/`d1_databases` in any `wrangler.jsonc`; also `--rclone` is off) then `wrangler deploy`. `deploy` never invokes `next build`.
* `wrangler deploy` re-bundles `.open-next/worker.js` and uploads `.open-next/assets`; it needs `wrangler` from `node_modules` and the app's `wrangler.jsonc`. There is a separate `opennextjs-cloudflare upload` (uses `wrangler versions upload`) which is the gradual-rollout path.
* `wrangler.jsonc` contains **no secrets and no account id**; Wrangler reads `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` from the environment.

**Recommendation: build once, deploy the artifact — yes, with a safety net.**
1. `build-<app>` job (no secrets) runs `cf:build` and uploads `apps/<app>/.open-next/**` (`actions/upload-artifact`, retention 7 days) named `open-next-<app>-<sha>`.
2. `deploy-<app>` job (environment `production`): checkout the **same SHA** → `pnpm install --frozen-lockfile --filter @rms/<app>...` **first, without the token in the environment** → download the artifact into `apps/<app>/.open-next` → re-run `node scripts/check-cloudflare-build-env.mjs post` against the downloaded artifact (defence in depth: proves no env was baked in) → **then** run `pnpm --filter @rms/<app> exec opennextjs-cloudflare deploy` with `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` set only on that step.
3. Do **not** call `pnpm deploy` in CI (it would rebuild).

**Caveats / what must be validated in Phase 3 [inferred]:** artifact path portability (`.open-next` was generated on the build runner and deployed on another runner — both `ubuntu-latest`, same pinned versions, so expected fine, but confirm the first deploy on a non-production branch's *preview* is not possible here; validate by a deploy of the artifact to a throw-away test Worker name in a scratch Cloudflare account/Worker if you want zero-risk validation); symlinks inside `.open-next` (artifact upload follows files, not links — verify none are required); `deploy` re-reading `.open-next/.build/*` helper files (they are inside `.open-next`, so included).

**Fallback (if artifact deployment proves unreliable):** build and deploy in the same job (the credentialed job runs `cf:build` itself). That is still safe — the `pre/post` guard protects the bundle — but the build step would then run with the token in scope; mitigate by exporting the token only for the final `deploy` step. Document whichever is chosen.

**Next/Wrangler skew note:** because `compatibility_date` is committed in `wrangler.jsonc`, the deployed runtime behaviour is deterministic per commit.

---

## 13. Cloudflare credential strategy

* **Needed:** `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` — nothing else is required by the repo's Wrangler/OpenNext configuration (no `account_id`, no KV/R2/D1 IDs, no `CF_*` rclone/skew-protection variables are used). *Do not invent others.*
* **Where:** a GitHub **Environment named `production`** holding both as *environment secrets*. Jobs reference `environment: production`; only then are the secrets released. No repository-level Cloudflare secrets.
* **Environment protection:** *Deployment branches: selected branches → `main` only*; optionally **required reviewers** (one-click approval for production) — recommended initially so that the first several automated deploys are supervised; relax later if desired.
* **Token scope [inferred, verify in Phase 3 spike]:** a custom API token limited to the single account and the `rms-careers.com` zone with: *Account → Workers Scripts: Edit*; *Zone → Workers Routes: Edit* (custom-domain routes in `wrangler.jsonc`); *Account → Account Settings: Read*; plus whatever Cloudflare requires for the Worker "custom domain" attachment on the first deploy of a changed hostname (typically *Zone → DNS: Edit* — only if a deploy attempts to create/modify the custom-domain record; since the domains already exist, steady-state deploys should not need it). Start from Cloudflare's "Edit Cloudflare Workers" template, then narrow. Rotate if ever exposed.
* **Never available to:** `detect`, `typecheck-and-unit`, `integration`, `build-*`, PR jobs, fork PRs, `smoke-*`.
* **Worker runtime secrets** (`POSTGRES_URL`, `AUTH_SECRET`, `AUTH_GITHUB_*`, `RESEND_API_KEY`, …) stay in Cloudflare (set via `wrangler secret put`/dashboard). **They are not stored in GitHub at all**, and the pipeline never needs them (Wrangler's `secrets.required` check confirms they exist on the Worker).
* **Manual local Wrangler** remains possible with a developer's own login (emergency path, §19).

## 14. Database credential strategy and migration separation

* **Production DB credentials are never in GitHub.** Not in the repo, not in Actions secrets, not in the `production` environment (the app deploy does not need them; Cloudflare already holds them).
* **CI uses only** `TEST_DATABASE_URL` + `TEST_DATABASE_ENDPOINT` (Neon NonProd/`test`), available only to the `integration` job and the bootstrap step. Workflow-level `POSTGRES_URL`/`DATABASE_URL` stay blanked. The Slice 0 guard (endpoint pin, ambient-collision check, Vitest connection choke point, sentinel) is untouched and continues to fail closed if a production URL is supplied.
* **Migrations are decoupled from deploys.** The app deploy workflow contains no `drizzle-kit`, no `db:migrate`, no database URL. Changes under `packages/db/drizzle/**` trigger CI (incl. integration against the bootstrapped test DB) and **no production deploy**.
* **Recommended migration process (explicit, separate; Phase 7, after approval):**
  * A manual `workflow_dispatch` workflow `db-migrate-production.yml`, environment **`production-db`** (distinct from `production`) with required reviewers, restricted to `main`, holding a **migration-only** Neon role URL as an environment secret; steps: show pending migrations (dry run) → require typed confirmation input (commit SHA) → apply → record result. Only run when a human starts it.
  * Until that exists, migrations continue as today (deliberate local `pnpm --filter @rms/db db:migrate`), documented as the one sanctioned manual path.
  * **Ordering rule for the team:** expand → migrate → deploy → contract. Because app and schema deploys are decoupled, schema changes must be backwards compatible with the currently deployed app version.
* **Never** wire "deploy → migrate" or "migrate → deploy" automatically.

---

## 15. Smoke-test strategy

No health endpoints exist [repo]; do not add any in this audit. Use public, side-effect-free requests only (HTTP GET, no auth, no form posts), run from the `smoke-<app>` job after that app's deploy, with retries (e.g. 6 × 10 s) to cover edge propagation.

| App | Checks | Notes |
|---|---|---|
| web `https://www.rms-careers.com` | `GET /robots.txt` → 200 and body contains `Sitemap: https://www.rms-careers.com/sitemap.xml`; `GET /` → 200 `text/html`; `GET /programs` → 200 | `/` and `/programs` are `force-dynamic` and read the DB, so they also prove Worker→Neon connectivity; failure there can mean DB trouble, not only a bad deploy — report accordingly. `/sitemap.xml` → 200 `application/xml` (content assertions only after the R7 decision). |
| admin `https://admin.rms-careers.com` | `GET /login` → 200 html (public by `authorized` callback); `GET /` (no cookie, no redirect-follow) → 302/307 with `Location` ending `/login` (proves auth middleware active); `GET /api/auth/providers` → 200 JSON containing `github` | excluded from middleware matcher (`/api`), no DB needed. Do **not** attempt login. |
| student `https://student.rms-careers.com` | `GET /login` → 200 html; response header `X-Robots-Tag: noindex, nofollow` (set in `next.config.ts`; proves it is the student Worker); `GET /dashboard` (no cookie) → redirect to `/login`; `GET /api/auth/providers` → 200 JSON | no auth attempted. |

* Identity check per app (cheap): assert a distinguishing signal so a mis-routed deploy is caught (student's `X-Robots-Tag`; admin's `github` provider; web's `robots.txt`).
* Smoke failure ⇒ the deploy job's GitHub Deployment is marked `failure`, the run fails, an **auto-rollback is not performed** (§17); the failure message prints the previous version ID for the operator.
* Optional later: record the deployed Cloudflare version ID via `wrangler versions list` for the summary.

## 16. Concurrency strategy

### 16.1 CI concurrency
* PR/branch CI: `group: ci-${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true` for non-`main` refs (newer push supersedes older) — as today.
* **Never cancel in-progress runs on `main`** (cancelling mid-deploy can leave an app half-updated or a deploy record unwritten).
* `integration` job: its own `concurrency: group: integration-test-db`, `cancel-in-progress: false`, to serialize access to the single shared Neon test branch across PRs and `main` (prevents cross-run collisions of fixtures/teardown).

### 16.2 Deployment serialization and "what is deployed" record
* Deploy jobs: `concurrency: group: production-deploy-<app>`, **`cancel-in-progress: false`** (queue, never cancel a running production deploy). GitHub keeps one running + one pending per group; a *newer pending run replaces an older pending one* — this gives "latest wins" for queued deploys, which is the desired behaviour.
* **Record of last successful deploy per app** (the base for §6): after a successful deploy+smoke, create a **GitHub Deployment** (Deployments API) for the commit with `environment: production`, `task: deploy:<app>` and a `success` status; `detect` lists the latest `success` deployment per `task` to get the base SHA. Alternatives: a lightweight tag per app (`deployed/<app>`, moved on success; needs `contents: write`), or tagging the Cloudflare version (`wrangler deploy --tag sha-<sha> --message …`) and reading it back from `wrangler versions list` (needs the token in `detect`, so not preferred). Decision for Phase 3 spike; the requirement is only that the record is written **after success** and read **fail-closed** (missing/unreachable ⇒ deploy).

### 16.3 Stale-commit guard
Race: A and B reach `main` close together. With serialization, A's deploy may run after B has been merged. Guard: at the start of each deploy job, `git fetch origin main` and compare `origin/main` to `github.sha`; if `main` has moved **and** the newer commit's deploy set also covers this app, skip (superseded); if it does not cover this app, **deploy anyway** (otherwise this app's change would be lost). Combined with "base = last successful deploy per app", correctness holds even in odd interleavings.

---

## 17. Rollback strategy

* **Cloudflare representation [verified CLI]:** each deploy creates a Worker **version**; `wrangler versions list` shows the 10 most recent, `wrangler deployments`/`versions view` give details; **`wrangler rollback [version-id]`** redeploys a previous version in seconds. It reverts **code and config of that Worker only** — not Worker secrets changed since, **not database schema/data**, and not other apps.
* **Primary procedure (operator, minutes):** `wrangler rollback` for the affected Worker (from a dev machine with login, or via the manual workflow below). Then fix forward on `main`.
* **Provide a manual GitHub workflow `rollback-production.yml` (Phase 6):** `workflow_dispatch` inputs `app` (choice) and `version-id` (optional; default = previous), environment `production` (reviewer approval), runs `wrangler rollback`, then the same smoke checks. No automation triggers it.
* **Secondary procedure (deterministic rebuild):** `workflow_dispatch` on `ci.yml` with `ref` = a known-good SHA on `main` and `apps=<app>` redeploys that commit's artifact (rebuild); slower, auditable.
* **No automatic rollback** initially: a failing smoke test may be a database or edge-propagation problem, not the code; auto-reverting could mask the cause or fight a concurrent fix. The pipeline prints the previous version ID and the exact rollback command.
* **Schema caveat:** because migrations are separate and expand-first, rolling an app back must be safe against the current schema; the migration policy (§14) guarantees that if followed.
* After any rollback, the "last deployed SHA" record is corrected by recording a `success` deployment for the rolled-back SHA so the next push re-evaluates correctly (Phase 6 detail).

---

## 18. Failure-mode handling (fail closed)

| Situation | Behaviour |
|---|---|
| Affected-app detection errors | `detect` emits **all apps** for CI and deploy with `reason: detection failed`; never an empty set. (A human can still cancel; nothing is silently skipped.) |
| No app affected (docs-only) | Explicit empty sets; build/deploy/smoke jobs skipped; `ci-gate` green; summary says "no deployable change". |
| Build fails (any app) | `ci-gate` fails; **no deploy for any app in that run** (deploys `needs` the gate). Conservative by design: partial deploys of one commit are avoided. |
| One app builds, another fails | Same: no app from this commit is deployed; fix and push again. |
| Web deploys, student deploy fails | Web stays deployed (independent job); run is red; student's deploy record is *not* written, so the next `main` run re-includes student (§6 base rule). Optional operator rollback of web via §17 if the two are coupled. Apps are loosely coupled by URL only, so this partial state is acceptable. |
| Smoke test fails | Deploy marked failed; run red; **no auto-rollback**; operator rolls back (§17). Next push re-includes the app. |
| Cloudflare credentials missing/invalid | Deploy job fails at Wrangler auth before uploading; nothing deployed; no fallback to any other credential. A pre-flight step asserts the env vars are non-empty (names only, never values). |
| Required Worker secret missing in Cloudflare | `wrangler deploy` aborts (`secrets.required`); fail closed. |
| Test DB secrets missing | `integration` fails closed via the Slice 0 guard; `ci-gate` red; fork-PR skip is the only tolerated skip. |
| Shared package (db/auth) changes | Graph escalation to consumers (db → all three; auth → admin+student). |
| `pnpm-lock.yaml` / root package.json changes | All three apps (build + deploy). |
| Workflow files change | CI on all three apps incl. `cf:build`, `actionlint`; **no deploy**. |
| Unknown/new root file | Treated as DEPLOY_ALL. |
| Base commit unreachable (force-push/rewritten history) | all apps. |
| Superseded commit (A overtaken by B) | §16.3 guard; per-app base prevents lost deploys. |
| Artifact missing/expired at deploy time | deploy job fails (no rebuild fallback inside the credentialed job unless explicitly chosen). |
| Two runs deploy the same app | serialized by `production-deploy-<app>` group. |
| Human re-runs an old workflow run's deploy job | the stale-commit guard + per-app record refuse to deploy an older SHA than the last deployed unless `workflow_dispatch` explicitly requests it (rollback path). |

---

## 19. Security analysis (checklist from the brief)

| Requirement | Status in the plan |
|---|---|
| No production DB credentials in test jobs | ✔ never stored in GitHub; `POSTGRES_URL`/`DATABASE_URL` blanked; Slice 0 guard rejects them as test targets |
| No Cloudflare credentials in PR jobs | ✔ only in `environment: production` deploy jobs on `main`; PR/fork runs cannot reference it |
| No secrets committed | ✔ `wrangler.jsonc` holds none; `.env*` ignored; add a secret-scan (e.g. `gitleaks` or GitHub secret scanning/push protection) as an enabled repo setting |
| No secrets baked into OpenNext bundles | ✔ `check-cloudflare-build-env.mjs` `pre`/`post` retained in `cf:build`; `post` re-run on the downloaded artifact before deploy; CI builds from a clean checkout with no env files |
| Test DB remains isolated | ✔ NonProd/`test` only; endpoint pin; serialized access; sentinel |
| Production deploys only from `main` | ✔ job `if:` on `push` + `refs/heads/main`; environment restricted to `main`; `workflow_dispatch` deploy path additionally checks `github.ref == refs/heads/main` |
| Forks cannot deploy | ✔ no secrets to fork PRs; `pull_request` (not `pull_request_target`) used; no checkout of PR code in a privileged context |
| Branch pushes cannot deploy | ✔ `push` trigger only listed for `main`; other branches get CI via `pull_request` only |
| Deploy requires GitHub environment/secrets | ✔ `production` environment (+ optional reviewers) |
| Migrations not an automatic side effect | ✔ separate workflow, separate environment/credential, manual only |
| Cloudflare build guards intact | ✔ unchanged; exercised in every PR build |

Additional hardening: `permissions: contents: read` default; `deployments: write` and `id-token` not needed except the deploy job's GitHub Deployment record (`deployments: write` scoped to that job); pin actions by SHA; `concurrency` as above; restrict who can approve the `production` environment; CODEOWNERS on `.github/**`, `scripts/**`, `**/wrangler.jsonc`, `packages/db/drizzle/**`; enable branch protection on `main` (required check = `ci-gate`, no force-push, require PR); treat third-party `postinstall` risk by installing dependencies **before** the token is placed in the environment, and exposing the token only on the single deploy step.

---

## 20. Cost / performance implications

Rough, measured-where-possible. Local figures: `next build` "Compiled successfully" took ≈26–29 s per app (run in parallel on a dev machine); install ≈45 s warm-store; unit tests ≈25 s admin, plus the other suites; OpenNext bundling and Wrangler upload add roughly another minute or two per app on CI **[estimates — validate on the first Linux runs]**.

| Scenario | Current (if it deployed from CI) | Proposed |
|---|---|---|
| docs-only push | install + typecheck + test + 3 builds (+3 deploys) | detect only (seconds) |
| web-only change | 3 builds + 3 deploys | 1 build + 1 deploy (+ web unit tests; no integration) |
| admin-only change | 3 builds + 3 deploys | 1 build + 1 deploy + integration |
| auth change | 3 + 3 | 2 + 2 (admin, student) + integration |
| db source / lockfile / root config | 3 + 3 | 3 + 3 (same as today — correctness over savings) |

* **CI minutes:** typical commit saves ~⅔ of build+deploy minutes and often skips the integration suite; roughly 50–70% less compute for app-only changes, ~100% for docs-only. Heavy shared changes cost the same as today (deliberately).
* **Cloudflare operations:** ⅔ fewer Worker version uploads on typical changes; less version-history churn (only 10 versions are listable, so fewer no-op versions improves rollback depth).
* **Developer feedback:** PRs touching one app finish faster; docs-only PRs near-instant.
* **Failure surface:** fewer unrelated apps rebuilt/redeployed per change ⇒ fewer chances an unrelated app breaks; the cost is ~100 lines of detection logic and the deployed-SHA record to maintain, offset by fail-closed defaults.
* **Added cost:** artifact storage (~35 MB per app per run, 7-day retention) and a few extra short jobs.

---

## 21. Implementation phases

> All phases are *future work after approval*. Nothing here was done.

**Phase 0 — Land Slice 0.** Commit/merge the Slice 0 safety work (workflow, guard, bootstrap). *Risk:* none new. *Validation:* first CI run green on a PR. *Outcome:* a tracked baseline `ci.yml`.

**Phase 1 — Affected-app detection.**
* Create `scripts/ci/affected.mjs` (+ a unit test file, e.g. `packages/db`-independent location such as `scripts/ci/__tests__/affected.test.mjs` run by `node --test`, no new dependency) implementing §6/§8 with the rule table and fail-closed behaviour; emits JSON for GitHub outputs.
* Responsibilities: git diff, `pnpm --filter "...[BASE]" ls --json`, classification, outputs.
* Dependencies: none (Node 22 built-ins). Risks: ignore-pattern semantics (validate `--changed-files-ignore-pattern`; otherwise filter in the script); Windows/Linux path separators. Validation: table-driven tests replaying the §7 matrix against a scratch clone (the same technique used in this audit), plus a dry-run workflow that only prints decisions. Outcome: trustworthy, tested detection.

**Phase 2 — CI restructure (still no deploy).**
* Change `.github/workflows/ci.yml`: add `detect`; make typecheck/unit/integration/build conditional and per-affected; replace `pnpm build` by `cf:build` matrix; add `ci-gate`; add integration concurrency group; add `actionlint` step when workflows change; pin actions; keep `POSTGRES_URL`/`DATABASE_URL` blank.
* Risks: **first Linux `cf:build`** may expose OpenNext/Next issues (docs flag Windows unreliability); empty-matrix handling; required-check semantics. Validation: PRs of each type (docs, web, admin, student, auth, db, lockfile, workflow) and compare to the §7 matrix. Outcome: path-aware CI, all green, credential-free `cf:build` per app.

**Phase 3 — Production deploy jobs.**
* Add `deploy-<app>` matrix jobs and `smoke-<app>` to `ci.yml` (gated to `push` on `main`); GitHub Environment `production` with `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, branch rule `main`, required reviewers; deployed-SHA record (GitHub Deployments); stale-commit guard; artifact upload/download; token only on the deploy step.
* Prerequisites (human): create the scoped Cloudflare API token; create the environment; enable branch protection.
* Risks: token scope; artifact portability; first deploy of an already-live Worker via CI. Validation: **spike first** — deploy a docs-irrelevant app change (or a manual `workflow_dispatch` for `web` only) with reviewer approval; verify Wrangler uses the same Worker names/routes; check `wrangler versions list`; confirm no env baked (`post`). Outcome: CI is the canonical production deploy for web/admin/student.

**Phase 4 — Smoke tests.** Create `scripts/ci/smoke.mjs` (Node `fetch`, retries, per-app assertions from §15); wire into `smoke-<app>`. Risks: false negatives from edge propagation or DB hiccups on `/` (use retries; separate "DB-dependent" checks). Validation: run against current production read-only (GET only) before enabling as a deploy gate. Outcome: post-deploy verification.

**Phase 5 — Documentation.** Update/create docs (§22). Outcome: runbook for secrets, environment, detection rules, migration policy, rollback, emergency deploy.

**Phase 6 — Rollback workflow.** Add `rollback-production.yml` (manual, environment-gated). Validation: dry-run against a scratch Worker or perform a controlled rollback+roll-forward of `web` in a maintenance window. Outcome: documented, one-click rollback.

**Phase 7 — Migration workflow (separate approval).** Add `db-migrate-production.yml` with its own environment/credential and manual gates, only after a reviewed migration strategy (and a migration-only DB role) exists. Not required for app CD to go live.

### 21.1 Exact files expected to change/create during implementation

| File | Phase | Action |
|---|---|---|
| `.github/workflows/ci.yml` | 2, 3, 4 | modify (detect, matrices, gate, deploy, smoke) |
| `scripts/ci/affected.mjs` | 1 | create |
| `scripts/ci/__tests__/affected.test.mjs` (or similar) | 1 | create |
| `scripts/ci/smoke.mjs` | 4 | create |
| `.github/workflows/rollback-production.yml` | 6 | create |
| `.github/workflows/db-migrate-production.yml` | 7 | create (separately approved) |
| `.github/CODEOWNERS` | 3 | create (protect `.github/**`, `scripts/**`, wrangler files, drizzle migrations) |
| `package.json` (root) | 1 | optional: script alias such as `ci:affected` |
| `docs/development/testing.md` | 5 | update (CI behaviour, detection, integration scoping) |
| `docs/architecture/deployment.md` | 5 | update (CI/CD is canonical; manual deploy = emergency) |
| `docs/deployment/` or `docs/development/ci-cd.md` | 5 | create (secrets, environments, rollback, migration policy) |
| `CLAUDE.md` | 5 | update commands/boundaries (and `AGENTS.md`/`CODEX.md` if kept in sync) |
| `README.md` | 5 | optional pointer |

**Explicitly NOT changed:** application code, `wrangler.jsonc`, `open-next.config.ts`, per-app `deploy`/`cf:build` scripts (kept for the escape hatch), `scripts/check-cloudflare-build-env.mjs`, database schema/migrations, Slice 0 guard.

---

## 22. Documentation to update/create (not done in this audit)

* `docs/development/testing.md` — path-aware CI, integration scoping, `ci-gate`.
* `docs/architecture/deployment.md` — replace "scripts: preview/deploy" narrative with: *GitHub Actions is canonical; local Wrangler is an emergency hatch*.
* New runbook (`docs/development/ci-cd.md`, or `docs/deployment/`): required GitHub secrets/environments (`production`: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; `integration`: `TEST_DATABASE_URL`, `TEST_DATABASE_ENDPOINT`), token scope, affected-app matrix (§7), concurrency/stale-commit rules, smoke checks, rollback commands, migration policy (expand→migrate→deploy→contract), emergency manual deploy, branch protection settings.
* `CLAUDE.md` (and mirrors): command list; rule "never run `pnpm deploy` without confirmation; production deploys go through Actions".

## 23. Risks and trade-offs

* **R1 — First Linux OpenNext build unproven.** Mitigation: Phase 2 builds on PRs before any deploy exists.
* **R2 — Deployed-SHA record complexity.** Mitigation: fail-closed read (unknown ⇒ deploy); simplest viable store chosen in the Phase 3 spike.
* **R3 — Over-deploy from conservative rules** (lockfile, db). Accepted: correctness over cost; these changes are infrequent.
* **R4 — Under-deploy from an ignore rule being wrong** (e.g., a "script" that is actually imported at runtime). Mitigation: ignore list is minimal, verified by import scan today, and each rule has a test; rules 4/5 are removable at no correctness cost.
* **R5 — Token blast radius.** Mitigation: scoped token, environment, reviewers, SHA-pinned actions, installs before token exposure.
* **R6 — Shared integration DB** is a single point of contention/flakiness. Mitigation: serialized group; longer term, Neon branch-per-run (needs API key + Neon automation; out of scope now).
* **R7 — Pre-existing: web `sitemap.ts` queries the DB but is not `force-dynamic`.** Builds run without `POSTGRES_URL` by design, so Next may statically generate the sitemap with no program pages and serve it stale until the next build. Pages `/`, `/programs`, `/programs/[code]` *are* `force-dynamic`. **Human decision needed** (make the route dynamic/revalidating, or accept); it affects what a smoke test may assert on `/sitemap.xml`. No change made here.
* **R8 — Partial deploys across apps** from one commit (one fails). Accepted and documented; independence of apps is by design.
* **R9 — Complexity of a single large workflow.** Mitigated by keeping scripts (`affected.mjs`, `smoke.mjs`) testable outside YAML, one gate job, and no premature reusable-workflow layering.
* **R10 — Things only verifiable on GitHub/Cloudflare** (see Uncertainties).

## 24. Recommended final architecture

One `ci.yml` workflow: `detect` (pnpm graph + small classifier, fail-closed) → per-app `typecheck/unit`, conditional `integration` (test DB only, serialized), per-app `cf:build` artifacts (no secrets) → single `ci-gate` → on `main` only, per-app `deploy` jobs in the `production` environment that deploy the *built artifact* with Cloudflare credentials available only to that step → per-app public smoke tests. Per-app "last successful deploy" record is the detection base on `main`. Production database credentials never exist in GitHub; migrations are a separate manual workflow with its own environment. Rollback is `wrangler rollback` via an optional manual workflow. Local `pnpm deploy` stays as an emergency escape hatch.

---

## Uncertainties requiring human decision / external verification

1. **GitHub settings I cannot see** (no `gh`, no repo admin access): existing branch protection on `main`, installed GitHub Apps (a `vercel/*` branch exists on the remote), existing environments/secrets, whether Actions is allowed to create deployments. Confirm before Phase 3.
2. **Cloudflare dashboard facts:** whether Workers Builds is truly disconnected for all three Workers (you stated it is), the exact permission set the API token needs for custom-domain Workers, and who created the current live versions.
3. **Deployed-SHA record mechanism** (GitHub Deployments vs. tags vs. Cloudflare version tags) — design choice for the Phase 3 spike.
4. **Required reviewers on `production`:** keep manual approval initially? (Recommended yes.)
5. **Sitemap staleness (R7)** — fix or accept.
6. **Whether to deploy on tests-only changes** (the exclusion in §7.3 vs. fully conservative).
7. **Artifact portability / first Linux `cf:build`** — empirical, Phase 2/3.
8. **Slice 0 must be merged first** (it is currently uncommitted).

---

## DECISION SUMMARY

* **Recommended architecture:** single extended `ci.yml` (`detect → validate → build → ci-gate → deploy (main only) → smoke`), plus separate manual `rollback-production.yml` and (later, separately approved) `db-migrate-production.yml`; GitHub Actions is the canonical production deployer; Cloudflare Workers Builds stays disconnected.
* **Affected-app detection method:** pnpm's built-in `--filter "...[BASE]"` for the workspace graph (verified), plus a small dependency-free classifier (`scripts/ci/affected.mjs`) for root/non-package files; fail-closed on any error or unknown file. Deploy base on `main` = last successful deploy per app.
* **Shared-package policy:** `packages/db` runtime source → web + admin + student; `packages/auth` → admin + student; non-runtime parts of `packages/db` (migrations, scripts, testing, guard-env, tests) → CI only, no deploy; new packages follow the graph automatically.
* **Root-file policy:** `pnpm-lock.yaml`, root `package.json`, `pnpm-workspace.yaml`, `scripts/**` (incl. the Cloudflare build guard), and any unclassified root file → all three apps; `.github/**` → CI on all apps, no deploy; `docs/**`, markdown, agent/tooling files → nothing.
* **PR behavior:** CI only — affected apps' typecheck/unit, integration when relevant, credential-free `cf:build`; no Cloudflare credentials, no deploy; fork PRs get no secrets.
* **`main` behavior:** detect per-app deploy set → CI gate → deploy only affected apps from the built artifact in the `production` environment → smoke test each; serialized, never cancelled mid-deploy; stale-commit guard.
* **Production credential strategy:** `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` as `production` environment secrets (branch-restricted to `main`, optional reviewers), exposed only to the deploy step; Worker runtime secrets remain in Cloudflare; no production DB credentials in GitHub; CI uses only the NonProd/test DB secrets.
* **Database migration strategy:** never automatic with app deploys; separate manual, reviewed workflow with its own environment and migration-only credential (later phase); expand → migrate → deploy → contract; until then deliberate local `db:migrate`.
* **Smoke-test strategy:** unauthenticated GET checks per app against real routes (web: `/robots.txt`, `/`, `/programs`; admin: `/login`, `/` redirect, `/api/auth/providers`; student: `/login` + `X-Robots-Tag`, `/dashboard` redirect, `/api/auth/providers`), with retries and an identity assertion; no fake logins, no new endpoints.
* **Rollback strategy:** `wrangler rollback` (Worker versions; code/config only, not DB/secrets) via an optional manual environment-gated workflow; secondary = redeploy a known-good SHA via `workflow_dispatch`; no automatic rollback initially.
* **Manual deployment policy:** existing `pnpm --filter @rms/<app> deploy` scripts are kept unchanged as an emergency/manual escape hatch (requires the operator's own Wrangler login, always preceded by `cf:build`'s env guard); normal production deploys go through GitHub Actions only.

IMPLEMENTATION STATUS:
AUDIT ONLY — NO IMPLEMENTATION PERFORMED
