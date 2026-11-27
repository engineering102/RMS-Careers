# Tutor Portal (`apps/tutor`)

The authenticated workspace for tutors at `https://tutor.rms-careers.com` (local: `http://localhost:3003`, `pnpm dev:tutor`).
Tutors review project submissions and follow the progress of the batches they are assigned to. The design and every
decision behind it are in [`docs/plans/tutor-portal-implementation-plan.md`](../plans/tutor-portal-implementation-plan.md);
this page describes what is built.

**Status:** built and in `main`, **not yet deployed**. The `rms-tutor` Worker does not exist until the launch bootstrap
([`docs/development/tutor-launch.md`](../development/tutor-launch.md)). Until then the public website hides every tutor
link (`TUTOR_PORTAL_LIVE = false`) and the admin portal sends no tutor invitations (`TUTOR_APP_URL` unset).

---

## 1. Who is a tutor

A tutor is a `users` row with the `tutor` role **and** an active `tutors` profile, created by an admin on `/tutors` in the
admin portal (invitation email, then `/activate`). Eligibility is decided in one place,
`apps/tutor/lib/db/tutor-access.ts` (`evaluateTutorAccount`):

- the account must have the `tutor` role and a `tutors` row with `is_active = true`, and the expected `users.status`;
- an account that also holds `admin` or `super_admin` is **refused** (decision D-5): admin credentials are never
  verifiable on the tutor domain. A person who is both uses a second email. Admin refuses to create such tutors too.

## 2. Authentication and session

- Its own Auth.js instance (`lib/auth.ts`, edge-safe `lib/auth/config.ts`), credentials only, `next-auth@5.0.0-beta.32`.
- Cookie `__Host-tutor-sess` (host-only, `Secure`, `SameSite=Lax`), JWT strategy, 30-day maximum, 24-hour sliding
  refresh. The cookie name is the JWT key-derivation salt, so admin and student tokens cannot be decrypted here and the
  reverse (`lib/__tests__/token-isolation.test.ts`). `AUTH_SECRET` is unique to this app.
- Sign-in, activation, password reset and resend-activation live in `lib/db/tutor-accounts.ts`: one bcrypt comparison
  on every sign-in path (an equalisation hash when no eligible account matches), single-use hashed tokens consumed in a
  transaction, generic answers that never reveal whether an account exists, per-email and per-client rate limits
  (Cloudflare namespaces 1401 and 1402).
- `middleware.ts` admits only the `tutor` role. Public routes: `/login`, `/activate`, `/forgot-password`,
  `/reset-password`, `/resend-activation` and `/api/*`; update the matcher and the `authorized` callback together.
- **Revocation.** The JWT only says who signed in and when (`authTime`). Every request re-reads the account and the
  assignments (`lib/db/tutor-context.ts`, `getTutorContext`, cached per request with React `cache()` only). A password
  reset, a password change, a sign-out (all stamp `users.updated_at`), deactivation, losing the role or being unassigned
  takes effect on the next request. A revoked session goes to `/api/session/revoked`, which clears the cookie and shows
  `/login` (server components cannot clear cookies, and the middleware would otherwise bounce a signed JWT away from
  `/login`).

## 3. Access model

- `requireTutor()` returns the tutor and `scope = tutorScope(batchIds)`, where `batchIds` are the tutor's assignments to
  live batches (status `active` or `completed`, active college, program not archived; the same rule students have).
- `requireTutorBatch(batchId)` guards every `/batches/[batchId]/…` route: an unassigned batch and an unknown id give the
  same 404.
- Every query takes the scope and filters by it in SQL (`@rms/academic/scope`: `inScope`, `isBatchInScope`). A `batchId`
  argument is a filter, never proof of access. Scopes come only from the `adminScope()` / `tutorScope()` factories (a
  plain object is rejected at runtime), and a source test forbids `adminScope` anywhere under `apps/tutor`.
- A student enrolled in two batches is seen only through the tutor's batch: progress, submissions, attempts and "last
  activity" are batch-scoped (integration test `authz-isolation.int.test.ts`).
- **Never visible to tutors:** a student's phone, GitHub/LinkedIn/portfolio links, target companies and preferred
  language; quiz questions, options, answer keys and responses; other batches' rows. Source tests enforce this (T-19).
- **Writes** (T-20): `tutors` (own profile), `users` (own password, `updated_at`), `account_tokens` (auth flows), and,
  through the shared review transaction, the review fields of `assignment_submissions`, `activities`/`student_stats`
  (approval XP via the ledger) and `notifications`.

## 4. Routes

| Route | What it shows |
|---|---|
| `/overview` | Review workload across assigned batches (awaiting, in review, my open reviews, changes requested, oldest waiting), next live class, batches |
| `/reviews` | One queue over all assigned batches: oldest first, keyset pagination (25), status tabs with counts, batch filter, "only mine", search by name or roll number |
| `/reviews/[submissionId]` | Submission links and notes, project brief, rubric (display only), review controls |
| `/batches` | Assigned batches with counts |
| `/batches/[batchId]` | Batch home: review numbers, next live class |
| `/batches/[batchId]/students` | Roster: completion %, last activity, tutoring signals; sort and pagination |
| `/batches/[batchId]/students/[studentId]` | One student's progress in this batch, week by week |
| `/batches/[batchId]/projects` | The review queue for this batch |
| `/batches/[batchId]/assessments` (`/[quizId]`) | Per quiz: attempts, average, pass rate; per student: best score, attempts, tab switches, non-attempters |
| `/batches/[batchId]/curriculum` | Published curriculum by week (no resource links) |
| `/batches/[batchId]/live` | All live sessions of the batch, unpublished included, with the Join link |
| `/profile` | Headline, bio, LinkedIn, GitHub (name and email are admin-managed); password change |

Every dashboard route is `force-dynamic` and has loading, error and not-found states. Because the routes stream behind
`loading.tsx`, a `notFound()` page renders the not-found UI with HTTP 200 (Next.js behaviour); the app is `noindex`.

## 5. Reviewing a submission

The tutor app and the admin portal use the same transaction, `@rms/academic/review` (`reviewSubmission`), opened by the
caller with `dbTx.transaction`:

- transitions (`@rms/academic/review-rules`): claim (`submitted → under_review`), approve (score required in the tutor
  UI), request changes (feedback required), resume. Reopen and correct are **admin-only**;
- the row is locked (`SELECT … FOR UPDATE`) and the caller must present the version it read (`updated_at::text`, exact to
  the microsecond). A stale version, a double click or another reviewer acting first returns `conflict` and the tutor
  sees "This submission changed. Reload to see the latest";
- the status change, reviewer attribution (`reviewed_by_user_id`), approval XP (once, through the idempotent ledger) and
  the student's `PROJECT_REVIEWED` notification commit together or not at all.

## 6. Progress and tutoring signals

- `@rms/academic/tutor/progress` applies the student portal's completion rules to a whole roster with one query per
  completion source (no per-student queries). A parity integration test
  (`apps/student/lib/__tests__/progress-parity.int.test.ts`) compares it with the student portal's
  `resolveBatchProgressSummary` for every student over all seven content types.
- "Last activity" is the latest of the batch's XP activity, project submissions and quiz attempts.
- Signals (`@rms/academic/tutor/indicators`, labelled "Tutoring signals (not grades)", each with its evidence):
  inactive for 7+ days, no activity after the first week, overdue required items, projects returned for changes. A
  completed batch shows none.

## 7. Code layout

- `packages/academic` (`@rms/academic`): scope, review state machine and transaction, notification text, project and
  assessment reads, live-session schedule maths, and `src/tutor/*` (overview, review queue, roster, progress,
  indicators, assessments, live). It takes the database client as an argument and never reads the environment.
- `apps/tutor/lib/db/*` (accounts, access, context), `lib/db/queries/*` (batches, profile), `app/(dashboard)/**`,
  `components/{shell,reviews,batches,ui}`.
- Observability: one JSON log line per review (`tutor.review`) and per authorisation denial (`tutor.authz_denied`), ids
  and codes only; never emails, names, feedback, URLs, tokens or passwords.

## 8. Tests

- Unit (`pnpm --filter @rms/tutor test`, `pnpm --filter @rms/academic test`): session cookie and middleware, token
  isolation, sign-in timing, rate limits, review action, profile actions, queue parameters, source boundaries; in the
  package, the scope predicate on every query (captured SQL), progress rules and signal boundaries.
- Integration (`pnpm --filter @rms/tutor test:int`, NonProd test database): sign-in, activation, reset and per-request
  context (`tutor-auth.int.test.ts`); batch isolation, review end to end and unassignment (`authz-isolation.int.test.ts`).
- Browser: opt-in `local-tutor` Playwright project (`E2E_TUTOR_BASE_URL`, loopback only), public pages only.
