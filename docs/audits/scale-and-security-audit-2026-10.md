# Scale (1,000 concurrent users) and Security Audit — 2026-10-14

Scope: `apps/web`, `apps/student`, `apps/admin`, `packages/db`, `packages/auth` on branch `feat/student-sheets` (HEAD `5df704b`).
Method: static code review, dependency audit (`pnpm audit --prod`) and a capacity model. **No load test was run** against any environment (see §5).
Earlier work this builds on: `production-readiness-audit.md` (R1–R8). Items fixed there are not repeated.

---

## 1. Verdict

| Question | Answer |
|---|---|
| Can the platform serve 1,000 concurrent users? | **Yes, with conditions.** Cloudflare Workers scale horizontally, so the Workers are not the limit. The limits are **Neon compute and connections**, **per-IP rate limits behind a campus NAT**, and **admin bulk operations that run in a single request**. Six changes (S-1 to S-6) remove the blockers. |
| Is it safe against common threats? | **Mostly.** Authorization, session revocation, CSRF (Server Actions + `SameSite=Lax`), SQL injection (parameterised Drizzle), quiz answer-key hiding, and URL validation all hold up. **One high-severity issue can be exploited today** (H-1, HTML injection in emails sent from your domain), and **the auth library has critical advisories** (H-2). |

### Top priorities

| # | Item | Severity | Effort |
|---|---|---|---|
| H-1 | Escape user input in the admin email templates (anonymous phishing relay) | **High** | 30 min |
| H-2 | Upgrade `next-auth` to ≥ 5.0.0-beta.32 and `drizzle-orm` to ≥ 0.45.2 | **High / Critical advisory** | 0.5–1 day (test the auth flows) |
| S-1 | A campus behind one NAT IP cannot sign in or enroll fast enough (60 logins/min, 5 enrolls/min per IP) | **Blocker for launch day** | 1–2 h + Cloudflare rule |
| S-2 | Runtime `POSTGRES_URL` must be the **pooled** (`-pooler`) Neon endpoint; size compute; disable scale-to-zero | **Blocker** | Owner, Neon console |
| S-3 | Bulk import / bulk email resend of ~1,000 students in one request fails part-way | **High** | 1–2 days |
| S-4 | Wrap `getStudentEntitlementContext` in React `cache()` (every page runs it twice) | Medium (cuts DB load ~35%) | 15 min |

---

## 2. Capacity model for 1,000 concurrent students

These are assumptions, not measurements. A load test (§5) should replace them.

| Input | Assumption |
|---|---|
| Concurrent active students | 1,000 |
| Page view per student | about one every 20 s → **~50 page views/s** |
| DB round trips per student page | **12–16** today (entitlement ×2 = 10, plus page queries), **7–10** after S-4 |
| Resulting DB load | **~600–800 queries/s** today, ~400–500/s after S-4. Mostly indexed point lookups (1–5 ms on the server) |
| Burst events | (a) a whole class signs in within 2–3 minutes at lab start; (b) a timed quiz closes and everyone submits within ~60 s (one Neon WebSocket transaction per submit) |

**What holds:** Workers (stateless, autoscaling); JWT sessions (no session table); indexes on the hot paths (`activity_batch_xp_idx`, `activity_streak_idx`, `enrollments_*`, `batch_timeline_idx`, `student_quiz_attempts_idx`); no N+1 query loops in the student queries (checked: no `await` inside loops in `apps/student/lib/db/queries/*`).

**What breaks first, in order:**

1. **Sign-in at lab start** (S-1). 1,000 students behind one college IP, with `AUTH_CLIENT_LIMIT` = 60/min per IP, take **~17 minutes** to get in, and any retry makes it worse. With the public enroll link at 5/min per IP, 1,000 enrollments from campus take **~3.3 hours**.
2. **Neon connections during a quiz deadline** (S-2). Each formal-assessment submit opens its own WebSocket `Client` (`packages/db/src/tx.ts:45`). On a **direct** endpoint, `max_connections` is about 112 at 0.25 CU and about 450 at 1 CU. 1,000 simultaneous submits would see `too many connections` errors. The **pooled** endpoint (PgBouncer) accepts up to 10,000 client connections.
3. **Neon CPU** at ~700 queries/s plus leaderboard aggregates on 0.25–0.5 CU. Plan for **1–2 CU minimum** with autoscaling up to 4 CU during college hours, and **scale-to-zero off** (cold start adds ~0.5–1 s to the first request).
4. **Latency, not throughput:** a content page runs ~15 **sequential** round trips (`content/[id]/page.tsx`: entitlement → `getContentItem` → `getNextCurriculumItem` → project). At 30–60 ms each between a Workers PoP in India and the Neon region, that is **0.5–1 s TTFB**. S-4 and S-5 address this.
5. **Login CPU:** `bcryptjs` cost 12 (`packages/auth/src/passwords.ts:7`) is pure JS, about 200–400 ms of CPU per sign-in. That works on Workers **Paid** (30 s default CPU limit). On the **Free plan (10 ms CPU)** every sign-in fails, so confirm the plan.

---

## 3. Scalability findings

### S-1 — Per-IP rate limits lock out a campus (Blocker)
- `apps/student/lib/security/request-limits.ts:46`: `AUTH_CLIENT_LIMIT` = 60 per 60 s per `cf-connecting-ip`. The same rule covers activation and reset.
- `apps/admin/app/(public)/enroll/[programCode]/actions.ts:101`: `PUBLIC_FORM_LIMIT` = 5 per 60 s per IP **and** per email.
- The rate limits are good defences, but they are sized for one lab of about 60 students, not a 1,000-student campus.

**Fix:**
1. Raise the per-IP limit to ~300/min for login and activation, and ~60/min for enroll. Keep the **per-account limit at 5/min**: that is the real brute-force control.
2. Add **Cloudflare Turnstile** (managed or invisible) to login, enroll, forgot-password and partner-enquiry, so that per-IP limits can stay loose.
3. Optionally, an allow-list rule per partner-college egress IP, with a higher limit.
4. Recheck `wrangler.jsonc` `ratelimits` together with the in-code fallback (unit tests assert they are equal).

### S-2 — Neon configuration (Blocker; owner action)
- Runtime `POSTGRES_URL` for all three Workers must be the **pooled** host (`ep-…-pooler.<region>.aws.neon.tech`). Migrations keep using the **direct** host, as `production-readiness-audit.md` §R5 already requires. `dbTx` interactive transactions work through PgBouncer in transaction mode.
- Compute: min 1 CU, max 4 CU, autoscaling on, **scale-to-zero disabled** on the production branch.
- Region: put the Neon project in the AWS region closest to your students (for India, `aws-ap-south-1` Mumbai, if available on your plan). Then enable **Workers Smart Placement** (`"placement": { "mode": "smart" }` in each `wrangler.jsonc`) so Workers run near the database.

### S-3 — Bulk admin operations run in a single request (High)
- `apps/admin/app/(admin)/enrollments/import/actions.ts:281`: for each row, the import runs **sequentially** one DB transaction, one activation email, one confirmation email and one DB update. For 1,000 rows that is about 4,000 outbound calls and roughly 8–15 minutes in a single Server Action.
  - It can exceed the Workers **subrequest limit per invocation** for your plan.
  - The browser or Server Action request will time out first.
  - The Resend API rate limit (a few requests per second per team by default) returns 429s, which are counted as "email failed", so students silently never get activation links.
  - A provisioning failure part-way through `throw`s and leaves a **partial import**.
- `apps/admin/app/(admin)/enrollments/actions.ts:113`: `bulkResendEnrollmentEmailsAction` loads **every enrollment in the system** (`getEnrollmentsWithDetails()`) and then filters in memory. The same sequential email loop follows.
- `apps/admin/lib/csv/parser.ts`: parses up to 10 MB `.xlsx` inside the Worker (128 MB memory). Large workbooks can hit memory or CPU limits.

**Fix:**
1. Process the import in chunks of ~50 rows per request, with client-driven progress. Or better, use a **Cloudflare Queue** with a consumer Worker that provisions rows and sends emails at a controlled rate.
2. Use Resend's **batch endpoint** (up to 100 emails per call) and retry on 429.
3. Query only the selected ids (`inArray(enrollments.id, ids)`).
4. Cap a single import at ~2,000 rows / 2 MB, or parse CSV only.

### S-4 — Duplicate entitlement resolution per request (Medium, 15 min)
`requireStudentEntitlement()` runs in `apps/student/app/(dashboard)/layout.tsx:19` **and** in every page, and twice in `assessments/[id]/page.tsx` (lines 29 and 65). Each call makes 5 sequential queries (`entitlements.ts:84–180`). Nothing uses React `cache()` (`git grep "cache("` finds no results).
**Fix:** `export const requireStudentEntitlement = cache(async () => { … })`, and likewise for `getStudentEntitlementContext`. This cuts about 5 round trips from every student page view. The roles and student-profile queries can also be merged into one join.

### S-5 — Sequential query waterfalls (Medium)
Independent queries on the same page are awaited one after another: the content page, leaderboards (`leaderboards.ts`: the user-standing and streak queries), and `entitlements.ts`. Use `Promise.all` where inputs do not depend on each other. With neon-http, `db.batch([...])` sends several queries in **one** HTTP round trip.

### S-6 — Public website renders dynamically on every hit (Low–Medium)
`apps/web/app/page.tsx:10` sets `export const dynamic = 'force-dynamic'`, but the home page reads no request data or database. `programs/page.tsx` and `programs/[programCode]/page.tsx` query the DB on every view. A campaign or link share could send thousands of anonymous hits.
**Fix:** remove `force-dynamic` from the home page. Use `export const revalidate = 300` (ISR) for the program pages, or put Cloudflare cache rules in front of them.

### S-7 — Leaderboards are computed on every view (Low at this size)
The weekly college leaderboard (`leaderboards.ts`, college section) aggregates `activities` for every student in a college on each request. That is fine at 1,000 students. When it grows: cache it for 60 s (`unstable_cache` or a KV entry), or maintain weekly XP in `student_stats`.

---

## 4. Security findings

### H-1 — HTML injection in emails sent from your domain (High, anonymous)
`apps/admin/lib/email/templates/enrollment-confirmation.ts:129,133,174` and `student-activation.ts:7` interpolate `studentName` / `programName` into HTML **without escaping**. `studentName` comes from the **anonymous public enroll form** (`enroll/[programCode]/actions.ts:21`: any string of 2–100 characters). The recipient email is also attacker-chosen.

**Attack:** submit the form with the name `<a href="https://evil.example">Verify your RMS account</a>` and the victim's email address. The victim receives a genuine, DKIM-signed RMS Careers email carrying the attacker's link. That is a phishing relay that damages domain reputation. The student app (`apps/student/lib/email/account-emails.ts:14`) and web (`apps/web/lib/partner-enquiry/deliver.ts:29`) already escape their emails; the admin templates do not.

**Fix:** add the same `escapeHtml` to every interpolated value in both admin templates, including `activationUrl` inside `href`. Also restrict `fullName` to letters, spaces and `.'-` in the Zod schema.

### H-2 — Vulnerable dependencies (`pnpm audit --prod`: 3 critical, 9 high, 6 moderate)
| Package (installed) | Advisory | Exposure here | Action |
|---|---|---|---|
| `next-auth` 5.0.0-beta.25 / `@auth/core` 0.37.2 | **Critical:** existence-based auth checks can fail open on configuration errors; **Critical:** email normaliser validated before Unicode normalisation; High: `getToken()` crash on a malformed Bearer header; Moderate: OAuth state/PKCE cookies not bound to the provider; Moderate: email misdelivery | Both portals' authentication. The admin uses GitHub OAuth | **Upgrade to ≥ 5.0.0-beta.32** in admin and student. Re-run `auth-timing`, `admin-auth` and the e2e sign-in/out journeys. This touches the approval-gated auth area (CLAUDE.md §5.1), so needs the owner's sign-off |
| `drizzle-orm` 0.31.4 | High: SQL injection via improperly escaped identifiers | Low: no `sql.raw`/`sql.identifier` or dynamic identifiers found | Upgrade to ≥ 0.45.2 (breaking changes between 0.31 and 0.45: test thoroughly) |
| `xlsx` 0.18.5 | High: prototype pollution; ReDoS | Admin-only upload, parsed server-side | Switch to SheetJS ≥ 0.20.3 from `cdn.sheetjs.com` (the npm package is abandoned), or accept CSV only |
| `postcss` 8.4.31, `postcss-selector-parser`, `braces`, `sharp` 0.35.4 | Build-time tooling / image pipeline | Low at runtime | Bump when convenient; `sharp` ≥ 0.35.5 |

Add `pnpm audit --prod --audit-level=high` to CI so new advisories fail the build.

### M-1 — GitHub OAuth admin login is matched by email only (Medium)
`apps/admin/lib/auth.ts:80–90`: any GitHub account whose email equals an active admin's email signs in as that admin. This skips the password and the per-account rate limit, and depends on GitHub's email verification.
**Fix:** bind admins to an allow-listed **GitHub numeric user id** stored on the user (`account.providerAccountId`), and require `email_verified`. Or disable GitHub login if it is unused (it also removes the `AUTH_GITHUB_*` secret requirement, R8-07).

### M-2 — No second factor for administrators (Medium)
Admins can read and export all student PII (`exportEnrollmentsCsvAction`), yet only a password protects the account. Add TOTP for `admin`/`super_admin`, or put `admin.rms-careers.com` behind **Cloudflare Access** (free for up to 50 users, about 10 minutes to set up) as a second gate.

### M-3 — CSP permits inline scripts (Medium, defence in depth)
`apps/student/security-headers.ts` uses `script-src 'self' 'unsafe-inline'`. No XSS sink was found (no `dangerouslySetInnerHTML`, `eval` or raw-HTML markdown; React 19 blocks `javascript:` URLs; student-supplied URLs are validated as `http(s)` in `lib/actions/dsa.ts:48` and `projects.ts:22,121`). But if a sink is ever added, the CSP will not contain it. Move to nonce-based CSP via middleware later. Also, `frame-src https:` allows any HTTPS iframe origin: narrow it to `https://www.youtube-nocookie.com https://player.vimeo.com` plus any custom providers you actually use.

### M-4 — Public enroll can create accounts for arbitrary emails (Medium)
Anonymous enroll provisions a student and sends an activation email to any address (5/min per IP or email). Combined with H-1, this enables spam and phishing. Even after H-1 is fixed, it lets anyone send RMS-branded mail to strangers. Turnstile (S-1) is the main mitigation. Consider queueing public enrolments for admin approval before the activation email goes out.

### L-1 — Admin Server Actions check only that a session exists
Many admin actions do `if (!session?.user)` without a role check (for example `enrollments/actions.ts:22`, `content/actions.ts:32`). This is **currently safe**: the admin `auth()` revalidates the account and role against the database and returns `null` for anything else (`apps/admin/lib/auth.ts:122–143`). Moving to `requireAdmin()` from `lib/authz.ts` everywhere would keep it safe if `auth()` ever changes. That matters given the next-auth "fail open" advisory.

### L-2 — Security headers, apex redirect and WAF are still not live in production
These were already tracked in `production-readiness-audit.md` R8.7 / R8.10. Re-verify after the next deploy: HSTS, CSP, XFO; apex → `www` 301; WAF rate rule on `POST /login`, `/api/auth/*`, `/enroll/*`.

### Checked and found sound
- **Authorization / IDOR:** content, batch, leaderboard and assessment queries derive the student from the session and verify enrollment and release date server-side (`content.ts:46–190`, `leaderboards.ts:35`). The cohort cookie is validated against the student's own batches.
- **Session security:** JWT with `authTime` plus `users.updated_at` revocation; separate cookies and secrets per portal; no wildcard-domain cookies.
- **Quiz integrity:** `correctOptionIds` and `explanationText` never reach the client before the policy allows (`assessments.ts:324,718,778`). Scoring is server-side. XP is idempotent (`activity_idempotency_idx`).
- **SQL injection:** all queries are parameterised Drizzle; no raw identifiers.
- **CSRF:** Next.js Server Actions check the Origin header; cookies are `SameSite=Lax`; cross-site sign-out returns 403 (R8).
- **Client IP trust:** only `cf-connecting-ip`; `x-forwarded-for` is ignored.
- **SSRF:** `global_fetch_strictly_public` is enabled on the Workers.
- **Secrets:** none committed; `secrets.required` is declared in `wrangler.jsonc`.

---

## 5. Recommended load test (not yet run)

Do this against a **staging** deployment with its own Neon branch and the same compute size as production, **never production**. Use k6 or Artillery:

| Scenario | Shape | Pass criteria |
|---|---|---|
| Lab-start sign-in | 1,000 virtual users sign in over 3 min from **one source IP** (simulates NAT) | ≥ 99% succeed, p95 < 2 s, no 429 for valid users |
| Steady browsing | 1,000 VUs, overview → curriculum → content → leaderboard, 15–25 s think time, 20 min | p95 TTFB < 800 ms, error rate < 0.5%, Neon CPU < 70% |
| Quiz deadline | 1,000 VUs submit a formal assessment within 60 s | 0 connection errors, every attempt recorded exactly once |
| Admin import | 1,000-row CSV with emails on (Resend test mode) | Completes; every student gets an activation email |

Watch Neon metrics (CPU, connections, p95 query time) and `wrangler tail` during each run.

---

## 6. Action plan

| Order | Work | Owner |
|---|---|---|
| 1 | H-1 escape the email templates; tighten the `fullName` regex | Code |
| 2 | S-4 `cache()` the entitlement lookup; S-6 drop `force-dynamic` on the web home page | Code |
| 3 | S-1 raise per-IP limits, add Turnstile | Code + Cloudflare |
| 4 | S-2 pooled URL, compute 1–4 CU, scale-to-zero off, Smart Placement | Owner (Neon/Cloudflare) |
| 5 | H-2 next-auth / drizzle / xlsx upgrades + full auth regression | Code (needs approval: auth area) |
| 6 | S-3 chunked or queued import and bulk email | Code |
| 7 | M-1/M-2 GitHub id binding, Cloudflare Access or TOTP for admin | Code + Owner |
| 8 | §5 load test on staging; record the results here | Code + Owner |
