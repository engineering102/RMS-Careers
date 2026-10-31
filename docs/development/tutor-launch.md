# Tutor Portal launch runbook

Owner-operated steps that take `tutor.rms-careers.com` live (tutor plan §13.5). Everything in the repository is ready:
the app, the admin tutor management, and the deploy pipeline, which holds the tutor app back as **pre-launch**
(`PRE_LAUNCH_APPS = ['tutor']` in `scripts/ci/deploy-tracking.mjs`) so no merge can deploy it by accident.

Do the steps in order. Steps 1–4 change nothing that users can see. Step 5 creates the production Worker and its domain.

Already done: migration `0006` is applied to production (2026-10-29, restore branch `pre-0006-2026-10-29`).

---

## 1. GitHub Environment `production-tutor`

*Settings → Environments → New environment* `production-tutor`, set up exactly like the other three
(see [deployment.md](./deployment.md) §3 and checklist 7A):

- deployment branches: a custom policy allowing exactly `main`;
- a required-reviewers rule with at least one reviewer; "Allow administrators to bypass" switched **off**;
- environment secret `CLOUDFLARE_API_TOKEN` and variable `CLOUDFLARE_ACCOUNT_ID` (the same values the other
  Environments use, if that token may deploy `rms-tutor` and attach `tutor.rms-careers.com`).

Create it **before** anything else names it: GitHub silently creates an unprotected Environment otherwise. The deploy
executor refuses to run (in a rehearsal too) unless it exists and is protected.

## 2. Cloudflare Worker secrets for `rms-tutor`

With your own Cloudflare login, from `apps/tutor` (never paste the values anywhere else):

```bash
pnpm exec wrangler secret put POSTGRES_URL --name rms-tutor
```

Repeat for `AUTH_SECRET`, `RESEND_API_KEY` and `EMAIL_FROM`:

- `POSTGRES_URL`: the **production** pooled connection string (the same database the other apps use).
- `AUTH_SECRET`: a **new** secret (`openssl rand -base64 32`). Never the admin or student secret.
- `RESEND_API_KEY`, `EMAIL_FROM`: as for the student Worker (verified sender). Without them activation and password
  reset emails cannot be sent, so they are `secrets.required` and a deploy without them fails.

Setting a secret on a Worker that has never been deployed creates the Worker as an empty script; that is harmless (no
route is attached until the first deploy). Confirm afterwards: `pnpm exec wrangler secret list --name rms-tutor` shows
the four names.

Also confirm in the dashboard that rate-limit namespaces `1401` and `1402` are not used by anything else in the account.

## 3. Rehearse the bootstrap

From `main`: *Actions → Deploy production → Run workflow* with `app` = `tutor`, `bootstrap` ticked, `dry_run` ticked.
The `rehearse` job must run and succeed and print `"action": "rehearsed"`, `"decision": {"code": "bootstrap"}` and the
`environment` block (`reviewerRules` ≥ 1, `canAdminsBypass: false`). Builds, verifies and smoke-tests the artifact in
local workerd and runs `wrangler deploy --dry-run`; it changes nothing.

## 4. Decide

Check the commit you will deploy (`main`, `ci-gate` green) and that the production database has the tutor tables in use
(`tutors`, `tutor_batch_assignments`, `batch_live_sessions`, `assignment_submissions.reviewed_by_user_id`).

## 5. Bootstrap deploy (creates the Worker and the domain)

Follow [deployment.md](./deployment.md) 7B for one app:

1. Set the repository variable `PRODUCTION_DEPLOY_ENABLED` to exactly `true` (if it is not already).
2. Dispatch *Deploy production* from `main` with `app` = `tutor`, `bootstrap` ticked, `dry_run` **unticked**.
3. Approve the `production-tutor` deployment after checking the commit and the run.
4. Then 7C: the evidence record exists with `kind: bootstrap` and `success`; `wrangler deployments status --name
   rms-tutor` shows that version at 100%; `https://tutor.rms-careers.com/login` answers 200 and `/` redirects to
   `/login` (the pipeline's smoke test checks both); the certificate is issued. Custom-domain DNS is created by the
   deploy (`routes[].custom_domain` in `apps/tutor/wrangler.jsonc`); allow a few minutes.

## 6. Let the admin portal send invitations

Add `"TUTOR_APP_URL": "https://tutor.rms-careers.com"` to `vars` in `apps/admin/wrangler.jsonc` and merge it (an admin
deploy). Deploys use `--keep-vars`, so check the variable on the `rms-admin` Worker afterwards. Until this is set, admin
creates tutor accounts but sends no invitation (`apps/admin/lib/email/tutor-portal-url.ts` has no production
fallback, by design).

## 7. First tutor and a real check

In the admin portal: create a tutor on `/tutors` (an email that is **not** an admin or student account), assign a batch,
and use *Resend invitation* for any tutor created before step 6. Activate, sign in on `tutor.rms-careers.com`, and check
the overview, the review queue and a batch roster. Sign out.

## 8. Let automatic deploys cover the tutor app

Open a pull request that removes `'tutor'` from `PRE_LAUNCH_APPS` in `scripts/ci/deploy-tracking.mjs` (and updates the
pre-launch test in `scripts/ci/__tests__/deploy-gate.test.mjs`, which pins the list). From then on a merge that changes the tutor
app deploys it like the others.

## 9. Show the tutor links on the public website

Set `TUTOR_PORTAL_LIVE = true` in `apps/web/lib/data/portals.ts` and update `apps/web/lib/__tests__/portal-links.test.ts`,
then merge (a web deploy). The header, footer, `/login` portal selector and the FAQ then point to the tutor portal.

---

**Rollback.** Before step 8 there is nothing to roll back to through the pipeline (the bootstrap version is the only
one). To take the portal offline quickly, remove the custom domain from `rms-tutor` in the dashboard, or delete the
Worker; neither affects the other apps or the database. Tutors' reviews written so far stay valid for admin and students.
