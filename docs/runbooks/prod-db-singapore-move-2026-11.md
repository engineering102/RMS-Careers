# Runbook: move the production database to Singapore (2026-11)

**Why.** The production Neon database runs in `aws-us-east-2` (Ohio). Users are in India. One query round trip from
India takes ≈ 282 ms to Ohio and ≈ 94 ms to Singapore (measured 2026-11-08). Every student, admin and tutor page
makes at least one round trip and admin pages make several. Neon cannot move a project between regions, so the
database is copied into a new project in `aws-ap-southeast-1` (Singapore; Neon has no Mumbai region) and the Workers
are pointed at it.

| | Old (Ohio) | New (Singapore) |
|---|---|---|
| Neon project | `RMS-Careers` (`lingering-fire-08003820`) | `RMS-Careers-Prod-SG` |
| Branch | `production` (`br-shy-salad-b42r4wip`) | `production` |
| Endpoint | `ep-blue-queen-b4qdn2dc` | `ep-spring-hat-aoyvl9wr` |
| Postgres | 18.6 | 18.6 |
| Database / role | `neondb` / `neondb_owner` | `neondb` / `neondb_owner` |
| Compute | 0.25 ↔ 2 CU | 0.25 ↔ 2 CU |

**Rehearsed 2026-11-08.** The dump took 43 s (0.2 MB, 11 MB database) and the restore 22 s. All 24 tables and 11
sequences had identical counts, and the structure was identical (59 indexes, 11 enums, same index fingerprint). The
new project was then emptied and the dump deleted. The production site was only read and was never affected.

**Who does what.** The **owner** works in the Neon and Cloudflare dashboards and holds the secrets. **Claude** runs the copy and
verification script (`packages/db/scripts/move-prod-db.cjs`) and checks each step. Connection strings never go into chat,
git or logs.

## Before the night

- [ ] Pick a quiet window, e.g. after 23:00 IST, with no assessment due, lab or live lecture scheduled. Tell the
      colleges if anyone may be active, using wording like "5–10 minutes of possible interruption".
- [ ] `.env.prod-sg.local` exists in the repo root (git-ignored) with `OLD_PROD_DIRECT_URL`, `NEW_PROD_DIRECT_URL`
      and `NEW_PROD_POOLED_URL`. The direct URLs have no `-pooler`; the pooled one does.
- [ ] PostgreSQL 18 client tools are installed: `& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" --version` prints 18.x.
- [ ] The new project is still empty (`verify` shows `new=undefined` for every table).
- [ ] The placement PR (this change) is reviewed and approved, but **not merged**. Merging deploys it to production.
- [ ] Open the Cloudflare dashboard → Workers & Pages in one tab, with **rms-student**, **rms-admin**, **rms-tutor** and
      **rms-web** each on Settings → Variables and Secrets.
- [ ] Have the new **pooled** connection string ready to paste. Copy it from Neon → RMS-Careers-Prod-SG → Connect,
      with pooling ON.

## The night (≈ 10 minutes)

All commands run from the repo root.

1. **Copy (≈ 1 min).** This is read-only on the old database.
   ```bash
   node packages/db/scripts/move-prod-db.cjs dump
   node packages/db/scripts/move-prod-db.cjs restore
   node packages/db/scripts/move-prod-db.cjs verify
   ```
   Continue only when the last line is `VERIFIED: … identical`. If `restore` fails, nothing was written: it runs as
   one transaction. Stop and investigate; the site is still on Ohio.

2. **Switch (owner, ≈ 3 min).** For each Worker, **rms-student**, **rms-admin**, **rms-tutor** and **rms-web**:
   Settings → Variables and Secrets → `POSTGRES_URL` → Edit → paste the **new pooled** URL → Save / Deploy. Saving a
   secret creates a new deployment immediately. Write down the time of the first and the last save.

3. **Catch-up check (≈ 1 min).**
   ```bash
   node packages/db/scripts/move-prod-db.cjs verify
   ```
   - `VERIFIED` means nobody wrote to Ohio during the switch window. Done.
   - `DIFF` on a table where **old > new** means someone wrote to Ohio between the copy and the switch. Note which
     tables differ. Claude copies those rows across by primary key (each table's new rows only). Do **not** re-run
     `restore`: the new project is now live.
   - `DIFF` where **new > old** is normal once students use the new database. Only the old side must stay unchanged.

4. **Smoke test (≈ 3 min).**
   - student.rms-careers.com: sign in, open the overview and a lecture, and submit a practice quiz.
   - admin.rms-careers.com: sign in and open the dashboard and a batch.
   - tutor.rms-careers.com: sign in and open the review queue.
   - www.rms-careers.com/programs: the page loads.
   - Neon → RMS-Careers-Prod-SG → Monitoring shows connections and queries. The old project should go quiet.

5. **Placement (≈ 10 min, can wait until the next morning).** Merge the placement PR. It pins rms-student,
   rms-admin and rms-tutor to `aws:ap-southeast-1`. Approve the production deployment. Then check that responses
   carry a `cf-placement` header naming a Singapore location, and that page times dropped.

6. **Clean up.**
   ```bash
   node packages/db/scripts/move-prod-db.cjs cleanup
   ```
   This deletes the local dump, which holds student data. Then:
   - Set `RMS_PRODUCTION_DB_ENDPOINT=ep-spring-hat-aoyvl9wr` in `.env.staging.local` and in any shell profile that
     sets it. This is the guard that keeps tests, seeds and staging tooling off production.
   - Point `PRODUCTION_DATABASE_URL`, wherever it is set for `db:migrate --target=production`, at the new **direct** URL.
   - In Neon, rename the old project to `RMS-Careers-OLD-us-east-2-do-not-use`. Do not delete it yet.

## Rollback

- **Before step 2:** nothing has changed. Stop; to retry later, run `empty --new-is-not-live`.
- **Within the first hours after step 2:** put the **old** pooled URL back in the same four Worker secrets. Any data
  written to Singapore since the switch is then missing from Ohio. Copy it back the same way (by primary key, new
  rows only) before the old database is used for anything else.
- **The placement PR alone:** revert it, or roll back with `rollback.yml`. Without the database move it would place
  the Workers far from Ohio and make pages slower, which is why it is merged only after step 2.

## After two calm weeks

- Delete the old Ohio project in Neon.
- Turn on branch protection for `production` in RMS-Careers-Prod-SG. This needs a paid Neon plan.
- Remove `packages/db/scripts/move-prod-db.cjs` and `.env.prod-sg.local`, which are no longer needed. Keep this runbook as
  the record.
