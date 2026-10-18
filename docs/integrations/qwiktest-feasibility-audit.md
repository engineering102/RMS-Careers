# RMS Careers × QwikTest Integration Feasibility Audit

| | |
|---|---|
| **Date** | 2026-10-18 |
| **Branch inspected** | `feat/staging-env` (working tree, incl. uncommitted changes) |
| **Scope** | Read-only. No code, schema, dependency, env or deploy changes. No vendor contact, no production data, no load tests. |
| **Vendor** | Qwiktest, hosted SaaS at `https://qwiktest.in/` / `https://app.qwiktest.in/` (Bengaluru, India) |
| **Status** | Recommendation only. **Nothing is to be implemented until approved.** |

### How to read this document

- **Verified (repo)** — read in this repository at the cited path.
- **Verified (vendor)** — stated on an official qwiktest.in page on 2026-10-18 (quoted or closely paraphrased, URL given).
- **Assumption** — a reasonable inference that has not been confirmed. Always labelled.
- **Recommendation** — our proposal. Always labelled.

---

## 0. Executive summary

1. **QwikTest publishes no API, SSO, webhook, embedding, or LMS-integration documentation.** Every official page checked (home, pricing, `pricing.md`, about, security, contact, `llms.txt`) is silent on all of these. They must be treated as **unavailable until the vendor confirms them in writing**. Full API/SSO integration and embedded assessments are **not feasible on current evidence**.
2. **What QwikTest does confirm** fits a *link-out + result-import* model: invited-email-only candidate access (6-digit email code; per the Terms and Privacy Policy, candidates **cannot** use Google sign-in, which is admin-only), server-side timer with auto-submit, server-side scoring, fullscreen/copy-block/tab-switch-log proctoring, CSV/Excel marks export, custom domain + branding, and public INR pricing with "student sitting" quotas.
3. **We already have ~80% of the MVP.** The admin portal ships a provider-neutral CSV import for external results (`external_assessment_records`), with batch-scoped student matching by roll number/email, preview, duplicate handling, server-side re-validation, and a student-facing report card. The link-based MVP needs **no schema change** and very little new code.
4. **Recommendation:** Option 2 — **link-based MVP with result import**, used **only for formal (proctored, single-sitting) assessments**. Keep practice quizzes and the existing formal engine native. Do **not** replace our assessment engine.
5. **Blockers before any rollout:** no signed DPA. The public Privacy Policy says QwikTest is a processor but allows processing outside India, gives no fixed retention period, and names no legal entity beyond "QwikTest, Bengaluru". Student emails are personal data under India's DPDP Act 2023. There is also no SLA ("as available"). *(Originally this also listed missing Terms/Privacy and undefined attempt semantics; both were resolved by §2.5.)*
6. **Update 2026-10-18 — real export sample reviewed (§2.4).** The results export has 15 columns including `Email`, `Score`, `Max Score` and `Status`. Its headers map onto our existing parser without code changes (once saved as CSV), but the export has **no test identifier, no roll number and no external id**, and our parser **ignores `Status`, `Candidate Removed` and `Proctor Violations`** — so admins must filter rows before import until the parser learns those columns.
7. **Update 2026-10-18 — signed-in app review (§2.5).** The admin app, its in-app guides and its workspace settings contain **no API keys, webhooks, SSO or integrations section**. The app does run on a private versioned backend (`api.qwiktest.in/api/v1/...`), but nothing offers it for third-party use, and the Acceptable Use Policy **forbids scraping and load testing without written consent**. Confirmed in-app: one attempt per candidate by default, with admin-granted **Retest**; **Open vs Exclusive** access per test; CSV candidate import (name, email); camera + microphone proctoring; negative marking; native **Export CSV**. Policies (Terms, Privacy, Security, Acceptable Use) **do exist** at `app.qwiktest.in/*`: QwikTest acts as a **data processor**, uses **AWS** (possibly outside India), and offers erasure on request. **Recommendation unchanged: Option 2.**

---

## 1. Existing architecture findings (Verified — repo)

### 1.1 Surfaces and auth

| Area | Finding | Path |
|---|---|---|
| Student auth | Own Auth.js instance, credentials-only, `role: 'student'`, dedicated `AUTH_SECRET`. Middleware protects everything except `api`, `login`, `activate`, `forgot-password`, `reset-password`, `resend-activation`. | `apps/student/lib/auth.ts`, `apps/student/lib/auth/config.ts`, `apps/student/middleware.ts` |
| Admin auth | Credentials + GitHub OAuth; role re-read from DB on each request; only `admin`/`super_admin` sessions are issued. Helpers `requireAdmin()` / `requireSuperAdmin()`. | `apps/admin/lib/auth.ts`, `apps/admin/lib/authz.ts` |
| Shared auth pkg | bcrypt passwords, SHA-256 token hashing, RBAC helpers. No SSO/IdP or federation code exists. | `packages/auth/src/{passwords,tokens,rbac}.ts` |
| API routes | Only Auth.js and session sign-out/revoked routes. **No inbound webhook or public API route exists in any app.** | `apps/*/app/api/**/route.ts` |
| Runtime | Student and admin deploy as Cloudflare Workers via OpenNext (`nodejs_compat`, `global_fetch_strictly_public`). No cron triggers configured. | `apps/student/wrangler.jsonc`, `apps/admin/wrangler.jsonc` |
| Student CSP | `frame-src 'self' https:` (for lecture video embeds), `frame-ancestors 'none'`, `connect-src 'self'`. | `apps/student/security-headers.ts` |

### 1.2 Data model (single schema)

All in `packages/db/src/schema.ts`.

| Table / enum | Relevance |
|---|---|
| `students` (`email` unique, `college_roll_number` unique per college) | Identity keys usable for vendor mapping. |
| `batches`, `enrollments` (multi-batch; partial unique on active/confirmed) | Batch scoping of assessments and results. |
| `content_items` + `batch_curriculum` (`available_from`, `due_at`, `week_number`) | Placement/scheduling of any item in a batch. `resource` type is an external-URL item. |
| `quizzes` (`quiz_type` `practice`/`formal`, `time_limit_minutes`, `show_explanations`), `quiz_questions`, `quiz_attempts` (`tab_blur_count`) | Native assessment engine. |
| `activities` (unique `activity_idempotency_idx` on `student_id, activity_type, reference_id`), `student_stats` | XP ledger + leaderboard source. |
| `activity_type` enum already contains **`external_assessment`** | Reserved, **currently unused** by any XP award path (only referenced in a UI label map, `apps/student/components/overview/activity-ledger.tsx:56`). |
| **`external_assessment_records`** (`student_id, batch_id, assessment_code, assessment_name, provider, max_score, obtained_score, percentile, imported_by_user_id, imported_at`; unique on `student_id, batch_id, assessment_code`) | **Already the right landing table for QwikTest results.** |

### 1.3 Native assessment engine

| Behaviour | Finding | Path |
|---|---|---|
| Practice quizzes | Unlimited, untimed retakes; server grading; XP only for first passing attempt (20 XP) via the ledger. | `apps/student/lib/actions/quiz.ts` |
| Formal assessments | Single attempt per quiz across batches (start lock), server-authoritative deadline (default 30 min, +2 min grace), auto-submit, atomic finalisation, answer key hidden until `due_at`. 20 XP on pass. | `apps/student/lib/services/formal-assessment.ts`, `apps/student/lib/services/assessment-policy.ts`, `apps/student/lib/db/queries/formal-assessments.ts` |
| XP ledger | Single SQL statement: idempotent `activities` insert + `student_stats` upsert; race-safe; shared by student and admin. | `packages/db/src/xp-ledger.ts`, `apps/student/lib/services/xp-ledger.ts` |
| Legacy XP path | `recordLearningActivity` (check-then-insert, then unconditional stats update) is **not race-safe**; it has no callers in the current action paths. **Do not use it for imports.** | `apps/student/lib/services/activity-reward.ts:149` |
| Leaderboards | Batch leaderboards sum **batch-attributed `activities.xp_awarded`**; access gated by `enrollmentGrantsAccess()`. | `apps/student/lib/db/queries/leaderboards.ts`, `apps/student/lib/db/access-policy.ts` |

### 1.4 Existing external-assessment import (the MVP backbone)

| Step | Finding | Path |
|---|---|---|
| Admin UI | Per-batch "External assessments" page with CSV upload, preview, confirm, delete. | `apps/admin/app/(admin)/batches/[batchId]/external-assessments/` |
| Parsing | papaparse; flexible header normalisation (roll/registration/email, score/marks, max score, percentile, test code/name, provider/platform). Requires an identifier column and a score column. | `apps/admin/lib/services/external-assessment-parser.ts` |
| Matching | Matches **only students enrolled in that batch** (`active`/`confirmed`/`completed`), by roll number or email, case-insensitive. Flags `invalid`, `unmatched`, `duplicate_in_csv`, DB duplicates. | same file, `validateAndMatchAssessmentRows` |
| Persist | Re-validates browser-echoed rows server-side (audit F-13); `duplicateStrategy` `update` or `skip`; scores bounded `0..max`, percentile `0..100`. | `apps/admin/lib/db/queries/batch-external-assessments.ts:379` |
| Student view | Report cards scoped to batches the student currently has access to; tier derived from percentage/percentile. **No XP and no leaderboard effect.** | `apps/student/lib/db/queries/external-assessments.ts`, `apps/student/app/(dashboard)/assessments/page.tsx` |
| Analytics | Batch analytics already aggregate external records. | `apps/admin/lib/db/queries/batch-analytics.ts` |
| Tests | Unit tests exist for parser/import and student query. | `apps/admin/lib/__tests__/batch-external-assessments.test.ts`, `apps/student/lib/__tests__/external-assessments.test.ts` |

### 1.5 Gaps relevant to QwikTest (Verified — repo)

- **G1. No assessment catalogue for externals.** `assessment_code` is free text typed at import time; there is no record of "QwikTest test X is scheduled for batch Y" that a student can see *before* sitting it.
- **G2. No launch surface.** Students have no place to get the QwikTest link today. (A `resource` content item placed in `batch_curriculum` can carry an external URL with `available_from`/`due_at` — usable as a zero-schema stopgap; see §4.)
- **G3. No XP for external results**, and **no XP reversal** exists anywhere (deleting an external record or re-importing does not touch `activities`).
- **G4. Excel is not accepted**; only CSV text is parsed.
- **G5. Admin external-assessment actions check `session?.user` rather than `requireAdmin()`.** Safe today because admin Auth.js only issues admin sessions, but new actions should use `requireAdmin()`.
- **G6. No inbound HTTP surface, no signature verification, no job queue/cron** — a webhook or polling sync would be entirely new infrastructure.

---

## 2. QwikTest capability matrix

### 2.1 Evidence method and limits

- Sources fetched 2026-10-18 via an automated page reader: `https://qwiktest.in/`, `/pricing`, `/pricing.md`, `/about`, `/security`, `/contact`, `/llms.txt`, `https://app.qwiktest.in/get-started`.
- `llms.txt` lists `https://qwiktest.in/policies` and `https://qwiktest.in/privacy-policy`, but through the automated reader both returned only marketing/FAQ content. **Superseded:** the full policy texts were later read in a real browser at `https://app.qwiktest.in/terms`, `/privacy-policy`, `/security` and `/acceptable-use` (all "Last updated: September 18, 2026"); see §2.5.
- The admin app (`app.qwiktest.in`) was first unreviewed, then **reviewed read-only while signed in to the RMS workspace `rms-careers`** (Pro trial) on 2026-10-18; see §2.5. Nothing was created, published, changed or sent.
- **Name collision:** "QwikTest — NexGen Online Exam & Quiz Software" by **NearCraft** (self-hosted Laravel/Vue script sold on CodeCanyon, `https://codecanyon.net/item/qwiktest-nexgen-online-exam-software/33203119`, `qwiktest.nearchip.com`) is a **different product** with no stated link to qwiktest.in. Its documentation must **not** be used as evidence for qwiktest.in. Unofficial "nulled" copies of the NearCraft script also circulate and are a security risk.

### 2.2 Matrix

Legend: **Confirmed** = stated on an official page. **Partially Confirmed** = stated but incomplete for our needs. **Unverified** = not mentioned; may or may not exist. **Unavailable** = we found positive evidence it does not exist (none of the items reached this bar; silence is not proof of absence).

| # | Capability | Status | Evidence | Source |
|---|---|---|---|---|
| 1 | REST/GraphQL API to create tests | **Unverified (not offered)** | No API on any public page, in the in-app guides (`/docs`) or in workspace settings (tabs: Domains, Team, Workspace). The admin app uses a private backend (`api.qwiktest.in/api/v1/...`, seen in the OAuth redirect), and the Privacy Policy says "Administrative APIs require an authenticated session and workspace membership" — i.e. internal, session-bound, not a third-party API. | `qwiktest.in/*`, `app.qwiktest.in/docs`, `app.qwiktest.in/privacy-policy`, in-app review |
| 2 | API to retrieve results | **Unverified (not offered)** | Same as #1. Results are available via in-app **Export CSV / Export Excel** (per test, and workspace-wide on the Candidates page). | in-app review |
| 3 | SSO (SAML/OIDC) or signed launch links | **Unverified (not offered)** | No SSO setting in the app. Candidates sign in **only with email OTP**; "Google Sign-In is rejected on {workspace}.qwiktest.in and on custom candidate hostnames". Google sign-in is admin-only. | `app.qwiktest.in/privacy-policy`, `/terms`, `/security` |
| 4 | Candidate provisioning | **Confirmed** | Per test: **Import** a CSV (name, email) or add one by one. Each test is **Open** (anyone with the link can request an OTP; "missing emails are added automatically") or **Exclusive** (roster only). Workspace option "Assigned candidates see only their tests". | `app.qwiktest.in/docs/candidates`, in-app test Candidates page |
| 5 | Identity mapping (external id) | **Partially Confirmed** | Identity is the invited **email**. No external/candidate-id field is mentioned, and the sample export (§2.4) carries only `Candidate Name` + `Email` — no roll number or external id column. | `qwiktest.in/security`; sample export |
| 6 | Webhooks / automated result sync | **Unverified (not offered)** | No webhook or integration settings anywhere in the app. | in-app review |
| 7 | Timed tests | **Confirmed** | Server-side timer, auto-submit when time ends; answers saved as students go (<0.4 s per save, vendor claim). | `qwiktest.in/`, `/security` |
| 8 | Exam windows | **Confirmed** | Builder → Schedule: **Scheduled window** (start/end), **Always available**, or **One sitting**; time limit presets or custom; timer for the whole test or per question. A workspace "Exam hall" switch blocks new starts. | in-app builder, `/docs/create-test`, Branding → Exam rules |
| 9 | Attempt limits / retakes / resume | **Partially Confirmed** | No attempt-count setting. Each candidate gets one attempt per test, and the admin can grant a **Retest** per candidate on the results page. Answers "save as they go, even if the network drops". The workspace-wide toggle "One test per candidate" limits a person to **one test in the whole workspace**, which is not what we want. What happens to the first attempt and the export after a Retest is unverified. | in-app results page, Branding → Access, `/docs/exam-day` |
| 10 | Proctoring | **Confirmed** | Per test: fullscreen, copy/paste block, context-menu block, tab-switch log, **require camera**, **require microphone** (live feed). Workspace: auto-submit after N warnings; "Exam wordmark" tiles the workspace name and candidate email on the paper. The attempt detail lists "Proctor events"; no recording or playback was visible (**assumption:** feeds are live-only). | in-app builder → Proctoring, Branding → Exam rules |
| 11 | Server-side scoring / key secrecy | **Confirmed** (vendor claim) | "Answer keys never reach the browser"; scored on server. | `/security`, `/about` |
| 12 | Result export | **Confirmed** | CSV and Excel marks export; leaderboard shows score + time taken. Columns not documented publicly, but **observed in a real export (§2.4)**. | `/pricing.md`, `/`; sample export |
| 13 | Embedding (iframe) | **Unverified** | Not offered in the app. Fullscreen and camera requirements make iframe use doubtful (**assumption**). | in-app review |
| 14 | Branding / white-label | **Confirmed** | Logo, colours, own SMTP mailbox, branded certificates; free `{name}.qwiktest.in` subdomain. | `/`, `/llms.txt` |
| 15 | Custom domain | **Confirmed** | One CNAME (e.g. `exam.yourinstitute.com`); 1/2/5 domains on Starter/Pro/Business; extra ₹15/month. | `/pricing.md` |
| 16 | Pricing | **Confirmed** | Free ₹0 (50 sittings/30d, 1 live test); Starter ₹499/mo (500); Pro ₹1,499/mo (3,000); Business ₹3,999/mo (10,000); Enterprise on quote (from 50,000). Excl. 18% GST. Overage 5 credits (₹0.50) per sitting; "students already writing are never stopped". Yearly = 10× monthly. Prepaid via Cashfree, no auto-debit. | `/pricing.md` |
| 17 | Rate limits (API) | **Unverified** | Not stated (no API documented). | — |
| 18 | Capacity | **Partially Confirmed** (vendor-reported) | ~6 lakh requests in one exam hour and 5,000 submits/s with none lost ("Production numbers, September 2026"). Not contractual. | `/security`, `/about` |
| 19 | SLA / uptime | **Unavailable** | The Terms say the service is provided "as available" with no warranty of uninterrupted access, and liability is capped at the fees paid. Enterprise lists "dedicated support". Paid plans: "Premium support · reply within 2–3 hours". | `app.qwiktest.in/terms`, in-app billing |
| 20 | Institutional usage | **Confirmed** | Targets colleges/universities; Enterprise for "universities and large hiring drives"; GST invoices. | `/`, `/contact` |
| 21 | Data region, retention, deletion, subprocessors, DPDP Act | **Partially Confirmed** | The Privacy Policy is written for the DPDP Act 2023. QwikTest is the **processor** for workspace exam data. Subprocessors: AWS (incl. SES), Google (admin sign-in only), and the payment gateway. Data "may be processed on servers outside India". Exam records are retained "for as long as the workspace needs them or law requires"; access, correction and erasure via support@qwiktest.in. No DPA template and no named legal entity beyond "QwikTest, Bengaluru". | `app.qwiktest.in/privacy-policy`, `/security` |
| 22 | Compliance certifications | **Unverified** | None stated. | `/about` |
| 23 | Admin (team) accounts | **Confirmed** | 1/3/10/25/unlimited team logins by plan. Admin MFA/SSO not stated. | `/pricing.md` |

### 2.3 Capacity/cost sizing for ~1,000 students (Assumption)

Assuming one sitting = one student taking one test once:

| Formal QwikTest tests per student per 30 days | Sittings | Smallest fitting plan | List price (excl. GST) |
|---|---|---|---|
| 1–3 | 1,000–3,000 | Pro | ₹1,499/mo |
| 4–10 | 4,000–10,000 | Business | ₹3,999/mo |
| >10 | >10,000 | Business + overage (₹0.50/sitting) or Enterprise | quote |

This sizing changes if a retake, a reconnect or a re-opened window counts as an extra sitting (vendor question V3).

### 2.4 Sample results export (Verified — file supplied by the RMS team, 2026-10-18)

A results file exported from qwiktest.in for a test titled "assessment-1" was supplied as `assessment-1-results (1).csv.xlsx`. It was inspected read-only; **it is not stored in this repository** and no candidate rows are reproduced here (it contains real names and email addresses).

**File format.** Despite the `.csv` in its name, the file is a genuine Excel 2007+ workbook (ZIP/`PK` signature, one sheet named `assessment-1-results (1)`). The `(1).csv.xlsx` naming suggests a CSV download that was later saved as Excel The in-app review (§2.5) confirmed the results page offers **Export CSV** as well as Export Excel, so admins should use **Export CSV**, which our importer accepts directly (this removes gap G4 for QwikTest).

**Sample size.** 1 header row + 2 candidate rows, both `submitted`; a 1-question test (`Max Score` = 1, `Total Questions` = 1). Too small to show edge cases (absent candidates, negative marking, ties, removed candidates).

**Columns and how our parser treats them** (header mapping checked against `normalizeHeaderName` in `apps/admin/lib/services/external-assessment-parser.ts`):

| Column | Observed type / example shape | Parser mapping | Notes |
|---|---|---|---|
| `Candidate Name` | text | ignored | Display only; never use for matching. |
| `Email` | text (personal Gmail addresses in the sample) | **`email`** ✅ | The only identity key. Must equal `students.email` exactly. |
| `Status` | text, `submitted` | ignored ⚠️ | Other values unknown (V16). Parser imports a row regardless of status. |
| `Score` | integer | **`score`** ✅ | Fractional/negative values with negative marking unknown (V17). Parser rounds, rejects negatives. |
| `Max Score` | integer | **`max_score`** ✅ | Per-row max is honoured over the admin default. |
| `Correct Count` | integer | ignored | |
| `Total Questions` | integer | ignored | |
| `Percentage` | integer 0–100 | ignored | We recompute percentage from score/max. Not a percentile. |
| `Rank` | integer, 1-based | ignored | Rank across **everyone who sat that QwikTest test**, not within an RMS batch (**assumption** if a test spans batches). Not convertible to our `percentile` without the full cohort. |
| `Started At` | ISO-8601 UTC string, ms precision | ignored | |
| `Submitted At` | ISO-8601 UTC string, ms precision | ignored | |
| `Time Spent` | integer **seconds** | ignored | Verified: equals `Submitted At − Started At` (68 s and 31 s) in both rows. |
| `Proctor Violations` | integer | ignored ⚠️ | Integrity signal comparable to our `quiz_attempts.tab_blur_count`; currently lost on import. |
| `Certificate Status` | empty in sample | ignored | Value set unknown. |
| `Candidate Removed` | empty in sample | ignored ⚠️ | Meaning unknown (V16); a removed candidate's row should probably not be imported. |

**Columns that are absent:** test/assessment id or code, roll number, external/candidate id, batch, percentile, attempt number.

**What this means**

1. **The MVP import works today with zero code change** after "Save as CSV": the parser finds `email` (identifier), `score` and `max_score`; `assessment_code`, `assessment_name` and `provider` come from the admin-entered defaults (`AssessmentDefaultMeta`) because the export has no test-id column. The admin must therefore pick the code per upload (§4.2 convention), and one file = one test = one batch.
2. **Status and removal are not enforced.** Until the parser understands `Status` / `Candidate Removed`, the admin must delete non-`submitted` and removed rows before import, otherwise a not-submitted candidate could be stored as a 0 score. This is the most important Phase 2 parser change.
3. **Email matching is the single point of failure.** The sample used personal Gmail addresses; QwikTest invites must be sent to the exact email stored in `students.email` (or students must sit with that address), or rows land as `unmatched`.
4. **Useful data is dropped.** `Submitted At`, `Time Spent` and `Proctor Violations` have no column in `external_assessment_records`. Persisting them is a Phase 2 schema change (approval required).
5. **Data protection.** This export contains real candidate names and emails, which confirms vendor-held PII. It reinforces blocker S1 (DPA, region, retention) before using QwikTest with real students at scale.

### 2.5 Signed-in app review (Verified — in-app, 2026-10-18)

Reviewed **read-only** in the RMS workspace `rms-careers` (owner account, Pro trial, 1 test, 2 candidates) while signed in. Nothing was created, saved, published, invited, retested, exported or sent. Toggles that save immediately (Branding → Access) were only read. Candidate names and emails seen in the app are not reproduced here.

**Admin navigation:** Dashboard, Branding & settings, Certificates, Tests, Candidates, Results, Members, Domains, Plan & billing, Invites, Workspaces, Docs & guides. **No API, Integrations, Webhooks, Developer or SSO section** exists.

| Area | What the app shows | Fit for RMS |
|---|---|---|
| **Hosts** | Candidate host `rms-careers.qwiktest.in` (live); custom domain not connected. Admin host `app.qwiktest.in`. Security policy: admin APIs are rejected on candidate hosts. | Good: clean host isolation, no shared cookies with `*.rms-careers.com`. |
| **Test builder** (6 steps: Details → Schedule → Proctoring → Questions → Preview → Publish) | Availability: *Scheduled window* / *Always available* / *One sitting*. Time limit 30–120 min or custom; timer for the whole test or per question. Scoring per question or whole test; **negative marking** optional. Question shuffle per candidate. After submission: *Show score* / *Full review* / *Hide results*. Leaderboard hidden/visible; certificates off/send. | Covers our formal-test needs. **Negative marking can produce negative or fractional scores**, which our parser rejects or rounds. Keep negative marking off, or extend the parser first. |
| **Proctoring** (per test) | Fullscreen, copy/paste block, context-menu block, tab-switch log, **camera required**, **microphone required**, with a "Strict" protection level. The sample test has all 6 on. | Stronger than our native engine (tab-blur count only). Camera and microphone add consent and privacy obligations (§5, S12). |
| **Exam rules** (workspace) | Exam hall live/closed switch; **exam wordmark** (tiles workspace name + candidate email on the paper); auto-submit after N warnings. | Useful deterrents. |
| **Candidate access** (per test) | **Open**: "Anyone with the link can request OTP. Missing emails are added automatically." **Exclusive**: roster only. Roster via **Import** (CSV of name, email) or Add candidate. Candidates can be filtered by source (*Self-joined (public link)* vs *Added by admin*). | **Formal RMS tests must be Exclusive.** The existing "Assessment 1" is **Open** (§5, S11). |
| **Candidate access** (workspace) | "One test per candidate" (one test in the entire workspace) and "Assigned candidates see only their tests". Both save as soon as they are switched. | Leave "One test per candidate" **off**, because it would block a batch's second test. "Assigned candidates see only their tests" is recommended **on**. |
| **Results** (per test) | Columns Rank, Name, Email, Status, Score, Time, Cert. **Export CSV** and **Export Excel**. Per candidate: **Open** (attempt detail: per-question review + "Proctor events" list) and **Retest**. Banner: "Candidates cannot see scores" until released. | Retest is admin-only, which matches our single-attempt formal model. **Native CSV export exists**, so no Excel conversion is needed (§2.4, G4). |
| **Candidates** (workspace) | Directory of everyone enrolled on any test, with Export CSV/Excel, status filters (Not started / In progress / Submitted / Scored) and a Removed list (archived for 4 days). | `Candidate Removed` in the export most likely reflects this 4-day archive (**assumption**). |
| **Multiple workspaces** | Pro allows 3 workspaces and Business 10, with a workspace switcher. | Option: one workspace per partner college, mirroring `colleges`. |
| **Billing** | Trial (Pro limits, 200 sittings). 2 sittings used for 2 candidates who each sat once (consistent with 1 sitting = 1 attempt). Paid plans: "Premium support · reply within 2–3 hours". Pro and Business list "Coding and SQL labs (coming soon)". | Sizing in §2.3 holds. Coding labs could matter for DSA later. They are unreleased, so not part of this plan. |
| **In-app guides** (`/docs`) | 8 short guides (getting started, create test, candidates, exam day, results, branding, billing, FAQ) plus a support chat. No developer documentation. | Confirms that no integration surface is documented. |

**Policies read in full** (`app.qwiktest.in`, all last updated 2026-09-18):

- **Terms** — Indian law, Bengaluru courts. Customer owns questions and candidate data, and QwikTest may process it only to provide the service. "As available", no uptime warranty. Liability capped at fees paid. Customer indemnifies QwikTest for its content and invites. Candidates authenticate with **email OTP only**. "One email maps to one user."
- **Privacy** — Written for DPDP Act 2023. QwikTest is the **data fiduciary** for account and billing data, and a **processor** for workspace exam data. Collects candidate email, responses, timing and integrity events, plus IP address and user agent. Shares data with AWS/SES, Google (admin sign-in only) and the payment gateway. Processing **may be outside India**. Retention is "as long as the workspace needs them". Erasure is available on request.
- **Security** — Host isolation (public / admin / candidate hosts). OTPs hashed, single-use, and locked after repeated failures. HttpOnly sessions. Membership and role checks on workspace APIs. TLS. No pen-test or certification claims.
- **Acceptable Use** — Forbids OTP sharing, cheating, impersonation, bulk email, and **"Scraping, load testing, or attacking the service without prior written consent."** Invitations only to people with a relationship to the organisation.

**Consequences for the integration design**

1. **No automation path exists today.** An API exists inside QwikTest but is not offered to customers, and scraping is forbidden. Result sync stays a **manual export → import**. Automating against the private API would breach the AUP and would be fragile.
2. **Single attempt is enforceable** by keeping tests **Exclusive** and granting Retest only as a logged exception. Our import default `duplicateStrategy = skip` complements this.
3. **Launch** = share the per-test candidate link (`https://rms-careers.qwiktest.in/<test-slug>`) through our portal. Students sign in with an email OTP sent to **their RMS login email**, which must be on the Exclusive roster.
4. **Roster sync** = export the batch's student emails from RMS, then use QwikTest's per-test Import (CSV of name, email). This needs a roster export in our admin portal (§4.3).
5. **The staging load test for ~1,000 students must not hit QwikTest without written consent** (AUP). §7 already simulates the vendor side.

---

## 3. Integration options

| Criterion | 1. Full API/SSO | 2. Link-based MVP + result import | 3. Embedded assessments | 4. Replace our engine |
|---|---|---|---|---|
| Depends on | Undocumented API, SSO, webhooks | Confirmed features only | Undocumented embedding; conflicts with fullscreen proctoring | QwikTest for practice + formal |
| Feasible today | **No** | **Yes** | **No** | Technically yes, product-wise no |
| Our code change | Large (new inbound API, signing, job runner, identity federation) | Small (reuse import; optional launch card) | Medium + CSP change (`frame-src`), cross-origin cookies | Large; removes working, tested code |
| Security | Best *if* signed launch + signed webhooks exist | Good: no secrets shared; admin-mediated import with server re-validation | Weak: third-party session inside our origin, clickjacking/cookie issues | Loses server-side control we built |
| Scalability | Automated | Manual per test (1 export + 1 import per batch) | Same as vendor | Vendor-bound, plus sitting quota costs for unlimited practice |
| Student UX | Seamless | One extra login (email code / Google) per test; results appear after admin import | Seamless if it works | Two portals for everything |
| Practice vs formal rules | Preservable | Preserved (QwikTest = formal only) | Unclear | **Breaks** unlimited practice economics (each practice try may cost a sitting) |
| Verdict | Revisit if vendor confirms API/SSO | **Recommended** | Reject | Reject |

### Recommendation

**Option 2, scoped to formal/proctored assessments only.** It uses only confirmed vendor features, reuses the existing tested import pipeline, needs no schema or auth change for the MVP, and keeps our practice/formal distinction intact. Option 1 becomes Phase 3 *only* if the vendor documents an API (and ideally signed webhooks / signed launch) in writing.

---

## 4. Proposed architecture (Recommendation)

### 4.1 Flow

```text
Admin (admin.rms-careers.com)                 QwikTest (exam.<our-domain> or *.qwiktest.in)        Student (student.rms-careers.com)
1. Export batch roster emails ─────────────►  2. Create test, invite emails, set window
                                                                                                    3. Sees launch card (link + window)
                                                                                    ◄──────────────  4. Opens link, logs in with email code
                                              5. Server timer, proctoring, scoring
6. Download marks CSV ◄──────────────────────
7. Upload CSV → preview → confirm (existing)
8. external_assessment_records rows ────────────────────────────────────────────────────────────►  9. Report card (existing)
```

### 4.2 Assessment mapping

- **MVP (no schema change):** Admin chooses a stable `assessment_code` convention, e.g. `QT-<batchShort>-<yyyymmdd>-<slug>`, and `provider = 'QwikTest'`. The code is the join key between the QwikTest test and our records; unique per `(student, batch, code)` by the existing index.
- **Phase 2 (schema change — requires approval):** an `external_assessments` catalogue table (`id`, `batch_id`, `provider`, `provider_test_ref`, `assessment_code`, `title`, `launch_url`, `opens_at`, `closes_at`, `max_score`, `xp_policy`, `created_by`) and an optional FK from `external_assessment_records`. This closes gap G1 and lets the student portal show upcoming external tests. Per guardrail 2, any new enum must not be used in the same transaction that creates it.

### 4.3 Batch assignment

- Scope every QwikTest test to exactly one batch (mirrors `external_assessment_records.batch_id`). A test shared by multiple batches is imported once per batch.
- Roster for invitations = students whose enrollment satisfies the same rule as import matching (`active`/`confirmed`/`completed`). Batch CSV exports exist in admin analytics; **a roster-email export suitable for QwikTest invites is not verified** and may need a small admin addition.

### 4.4 Student identity

- **Key = `students.email`** (unique, the student's login email). QwikTest identity is the invited email. Roll number is a secondary key if QwikTest's export includes it (unknown, V5).
- Students must sign in to QwikTest with **the same email** (email OTP only; candidates cannot use Google sign-in, per §2.5). Each test must be **Exclusive**, with the roster imported from RMS, so that no other address can join. Mismatches surface as `unmatched` rows in the existing preview — never auto-matched by name.
- No RMS credentials, session cookies or tokens are ever shared with QwikTest. Our auth, `AUTH_SECRET` isolation and surface separation are untouched.

### 4.5 Secure exam launch

- **MVP:** The per-test candidate link (`https://rms-careers.qwiktest.in/<test-slug>`, or the custom domain) is shown to the batch through a `resource` content item in `batch_curriculum` (`available_from`/`due_at`) — zero schema change — or through a notification. The link is not a credential. Access control is the **Exclusive** roster plus the email OTP. **An Open test turns the link into a public sign-up** (§5, S11).
- Prefer a **custom domain** (`exam.rms-careers.com`, Starter+) so students see our brand. Must stay a distinct host: **no wildcard `.rms-careers.com` cookies**, and the subdomain is the vendor's origin, not ours.
- **Phase 3 only, if vendor confirms:** server-generated, short-lived, signed launch URLs (HMAC/JWT with `exp`, `nonce`, batch and student binding) issued from a student Server Action after `hasBatchAccess()`.

### 4.6 Result synchronization

- **MVP:** Manual CSV import (existing). Per §2.4, QwikTest's `Email`, `Score` and `Max Score` headers are already recognised, so no renaming is needed. Admin runbook: (1) save the export as CSV if it is `.xlsx`; (2) delete rows whose `Status` is not `submitted` or whose `Candidate Removed` is set; (3) upload with the agreed `assessment_code`, `provider = QwikTest`, `duplicateStrategy = skip`.
- **Phase 2 (parser, no schema):** recognise `Status` and `Candidate Removed` and mark non-submitted/removed rows `invalid` instead of importing them; show `Proctor Violations` in the preview; optional `.xlsx` support (new dependency → approval).
- **Phase 2 (schema, approval required):** store `submitted_at`, `time_spent_seconds` and `proctor_violations` on `external_assessment_records` (or a `provider_metadata jsonb`).
- **Phase 3 (only with vendor API/webhooks):** new route in **admin** (not student) such as `POST /api/integrations/qwiktest/webhook`, with HMAC signature verification over the raw body, timestamp tolerance, provider event-id dedupe table, then the *same* validate/persist functions as the CSV path. Workers have no cron configured, so polling would require adding a Cloudflare Cron Trigger (deploy-config change → approval).

### 4.7 Error handling and duplicate events

- Reuse existing statuses: `invalid`, `unmatched`, `duplicate_in_csv`, DB duplicate with `update`/`skip`.
- **Recommendation for formal QwikTest tests: default `duplicateStrategy = 'skip'`**; allow `update` only as an explicit admin correction, recorded in an audit note. This mirrors our single-attempt formal semantics.
- Imports are idempotent at the DB level (unique `student_external_assessment_idx`). A future webhook path must dedupe on the provider's event/submission id *before* persistence and return 2xx for already-processed events.
- Server Actions keep returning structured `{ success, error }` results (CLAUDE.md §4.3).

### 4.8 XP and leaderboard consistency

Current state: external results award **no XP** and do not move leaderboards (Verified — repo).

**Recommendation:**

- **MVP: keep it that way.** Leaderboards stay a measure of in-platform learning, and imports/corrections cannot desync XP.
- **If XP is wanted (Phase 2, product decision):** award a **fixed** amount on first import of a **passing** result, through `awardActivityXp` (`packages/db/src/xp-ledger.ts`) with `activityType: 'external_assessment'`, `referenceId: '<provider>:<batchId>:<assessment_code>'`, and the record's `batch_id` — never the legacy `recordLearningActivity`. Consequences to accept explicitly:
  - Score corrections (`update`) and record deletion **do not** reverse XP (no reversal mechanism exists). Changing that would need a compensating-ledger design.
  - The idempotency index is `(student, type, reference)`, so including `batchId` in `referenceId` is what allows the same code in two batches to award separately; omit it if one award per student is intended.
  - Award inside the same transaction as the record insert (requires the transactional client from `@rms/db/tx`) so a failed award cannot leave a record without its XP or vice versa.

### 4.9 Preserving practice vs formal

- **Practice stays native** (unlimited, ungated, no sitting cost).
- **QwikTest is used for formal, proctored, single-sitting tests only.** Attempt limiting is enforced by QwikTest configuration (unverified — V2) and, on our side, by one row per `(student, batch, code)` plus `skip` as default.
- The native formal engine remains available; QwikTest is an additional provider, not a replacement.

### 4.10 Database / API change summary

| Phase | DB change | API / code change | Approval needed |
|---|---|---|---|
| 1 MVP | None | None required. Optional: roster-email CSV export in admin; `requireAdmin()` in new actions. | Feature go-ahead only |
| 2 | `external_assessments` catalogue + FK (migration) | Student "upcoming external tests" card; QwikTest header aliases; optional XP award; optional `.xlsx` (new dep) | Schema (guardrail 2), dependency |
| 3 | Webhook event dedupe table | Admin webhook route with HMAC; signed launch links; optional Cron Trigger | Only if vendor documents API; deploy config |

### 4.11 MVP operating runbook (manual workflow)

**Status:** Recommendation. It uses only features verified in QwikTest (§2.5) and in our admin portal (§1.4). Rule: **one QwikTest test = one RMS batch**, because each import targets exactly one batch.

#### A. One-time setup (QwikTest → Branding & settings)

| # | Where | Action | Why |
|---|---|---|---|
| A1 | Access | "One test per candidate" **off**. | When on, a candidate can take only one test in the whole workspace, which blocks a batch's second test. |
| A2 | Access | "Assigned candidates see only their tests" **on**. | Students see only the tests they are on. These toggles save as soon as they are switched. |
| A3 | Exam rules | Exam wordmark **on**; auto-submit after N warnings as policy dictates. | Deterrence; screenshots identify the student. |
| A4 | Settings → Domains / Email (optional) | Custom domain (e.g. `exam.rms-careers.com`, a CNAME) and own SMTP mailbox. | Branding. Must stay a separate host with no `.rms-careers.com` cookies. |
| A5 | — (RMS side) | Agree the `assessment_code` convention: `QT-<batch>-<yyyymmdd>-<slug>`. | The code is the only join key between a QwikTest test and RMS records (§4.2). |

#### B. Per test

| Step | System | Action | Check before moving on |
|---|---|---|---|
| B1 | RMS admin | Get the batch roster: name and **RMS login email** of students with an active/confirmed enrollment. | Count = active enrollments. **Implemented:** Batches → [batch] → Students → **Export roster CSV** downloads `name,email` for active/confirmed students (de-duplicated, lower-cased emails). |
| B2 | QwikTest → Tests → Create test | **Schedule:** scheduled window (start/end), time limit, **negative marking off**, results *Hide results*, leaderboard *Hidden*. **Proctoring:** fullscreen, copy/paste, tab-switch log. Camera and microphone only with student notice and college consent (S12). Add questions, preview, publish. | Our importer rejects negative scores (§2.4), so negative marking must stay off until the parser handles it. |
| B3 | QwikTest → test → Candidates | Set access to **Exclusive**. **Import** the B1 roster (CSV: name, email). Copy the candidate link `https://rms-careers.qwiktest.in/<test-slug>`. | Roster count = B1 count. Access shows Exclusive (S11). |
| B4 | RMS admin → Content + batch curriculum | **Implemented:** create an **External test** item (test link, platform, assessment code from A5, time limit, instructions) and place it in the batch curriculum with `available_from` / `due_at` matching the QwikTest window. Students see it on **Assessments → External Tests**. The link shows only while the window is open, and their score shows there once B8 imports it under the same code. | Students sign in to QwikTest with the email code sent to their RMS email. The item counts as completed in batch progress once its result is imported. |
| B5 | QwikTest (exam day) | Monitor progress. Students already inside a test are never cut off. **Retest** only as a written-down exception (who, why, when). | Retest breaks the single-attempt rule. Its effect on the export is not yet known (Q2). |
| B6 | QwikTest → Results → test | After the window closes: **Export CSV** (not Excel). | Our importer reads CSV only. |
| B7 | Spreadsheet | Delete rows where `Status` ≠ `submitted` and rows where `Candidate Removed` is set. On QwikTest's Candidates page, filter by source **Self-joined (public link)**; expect none. | Our parser ignores `Status` and `Candidate Removed` today (§2.4). |
| B8 | RMS admin → Batches → [batch] → External assessments | Enter code (A5), name (test title), provider `QwikTest`, default max score (paper total). Upload the CSV. In the preview, resolve every `unmatched` row (wrong email or wrong batch). Never match by name. Confirm with duplicates = **Skip**. | `Email`, `Score`, `Max Score` are recognised automatically. Valid count = submitted count. |
| B9 | RMS student portal / QwikTest | Students see a report card on **Assessments**. Optionally release results in QwikTest as well. | Imported results award **no XP** and do not move leaderboards (§4.8). |

#### C. Corrections

- **Wrong score:** fix it in QwikTest if possible, re-export, then re-import with duplicates = **Update**. Or delete the single record on the External assessments page and re-import that row.
- **Student used a different email:** that row shows as `unmatched`. Correct the student's email in QwikTest, or re-sit them via Retest under B5's exception rule. Never edit the email in the CSV to force a match.
- **Not imported:** QwikTest rank (it covers the whole test, not one batch), proctor violations, time spent and timestamps. Check these in QwikTest's attempt detail.

#### D. Effort and first things to automate

Per test: roughly four admin tasks — roster (B1/B3), create and publish (B2), export and clean (B6/B7), import (B8). The two manual steps worth automating first, both within our own code (Phase 2, §4.6):

1. ~~A batch roster-email CSV export~~ — **done** (Export roster CSV), along with the `external_test` content type (migration `0005_external_test_content_type`).
2. **Parser support for `Status` and `Candidate Removed`**, so B7 is no longer manual.

---

## 5. Security review

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| S1 | **Student PII (names, emails, responses, IP address, user agent, integrity events) held by a vendor with no signed DPA.** The public Privacy Policy names QwikTest a processor, but processing may be outside India (AWS), retention is open-ended, and the legal entity is not named. DPDP Act 2023 obligations sit with us or the college. | **High — blocker** | Signed DPA (or written processor terms) naming the legal entity, data region, retention period and deletion SLA before real student data is uploaded at scale. Share minimum fields (email; name only if certificates are used). |
| S2 | Forged/edited CSV inflates scores | Medium | Existing: admin-only, batch-scoped matching, server re-validation, bounds checks. Add: keep the original export file reference and importer id (already stored: `imported_by_user_id`). |
| S3 | Wrong-student attribution (shared/typo'd emails) | Medium | Email exact-match only; no fuzzy/name matching; `unmatched` rows never persisted. |
| S4 | Cookie/session leakage via custom subdomain | Medium | `exam.rms-careers.com` CNAMEs to vendor; we set no `.rms-careers.com` cookies (guardrail). Confirm vendor cookies are host-only (V11). |
| S5 | Embedding vendor UI weakens our CSP | Medium | Do not embed. `frame-src` stays as is. |
| S6 | Proctoring is browser-level only | Medium (integrity) | Fullscreen/tab-switch logs are deterrents, not guarantees. Same class as our `tab_blur_count`. High-stakes tests may need invigilation. |
| S7 | Vendor outage during a scheduled exam | Medium | No SLA found. Keep native formal engine as fallback; schedule windows with slack. |
| S8 | Future webhook endpoint abuse | Medium (Phase 3) | HMAC over raw body, timestamp window, event-id dedupe, rate limiting, admin-app only, no student data returned. |
| S9 | Admin action authz drift | Low | New actions use `requireAdmin()` rather than `session?.user` (G5). |
| S10 | Supply-chain confusion with NearCraft "QwikTest" / nulled copies | Low | Contract only with the qwiktest.in operator; never install the CodeCanyon script. |
| S11 | **Open-access tests.** In Open mode, anyone with the link can request an OTP, and unknown emails are added to the roster automatically. The existing "Assessment 1" is Open. | **High** for formal tests | Make every formal test **Exclusive**. Turn on "Assigned candidates see only their tests". Before importing, review the Candidates page filtered by source = *Self-joined (public link)*. Our importer already drops non-batch emails as `unmatched`. |
| S12 | **Camera and microphone proctoring** processes biometric-adjacent data from students, who may be minors (the Terms cover under-18 use with guardian consent). | Medium | Decide per test whether camera or microphone is needed. Inform students and get college/MoU consent. Confirm with the vendor whether any audio or video is recorded or stored (Q14). |
| S13 | **Integrating against QwikTest's private API** (`api.qwiktest.in/api/v1`) or scraping the admin UI | High (contractual) | Forbidden by the Acceptable Use Policy without written consent, and could get the workspace suspended. Use only manual export → import unless the vendor offers a documented API. |

---

## 6. Implementation phases

| Phase | Goal | Exit criteria |
|---|---|---|
| **0 — Vendor due diligence** | Answers to §8; DPA; sample export file; sandbox account | All "blocker" questions answered in writing |
| **1 — Pilot (no code)** | One batch, one formal test, synthetic or consented pilot students; export → existing import | ≥99% rows match; zero mis-attribution; import < 5 min admin time |
| **2 — Productise** | Catalogue table, student launch card, header aliases, optional XP | Typecheck/unit/int tests green; staging run (§7) passes |
| **3 — Automate (conditional)** | API/webhook/signed launch | Only if vendor documents them; separate security review |

---

## 7. Staging test plan (~1,000 students)

Constraints honoured: staging DB (`RMS-Careers-NonProd/staging`) with **synthetic accounts only** (see `docs/development/testing.md`, `apps/student/scripts/seed-load-test.ts`); no production data; vendor load is the vendor's system, so any QwikTest-side load test needs **their written consent** (V12).

1. **Seed:** 1,000 synthetic students across e.g. 4 batches × 250 in staging, emails on a domain we control (e.g. `+tag` addresses on a test mailbox) — never real student emails.
2. **Roster → invite:** export batch emails; invite in a QwikTest trial/Pro workspace. Verify invite counts = enrolled counts.
3. **Sitting simulation:** small real-browser cohort (10–20 testers) for UX/proctoring; the bulk 1,000 results are **simulated as a vendor-format CSV** generated from the real sample export (we do not drive 1,000 vendor sittings without consent).
4. **Import correctness:** upload per batch; assert 1,000 matched, 0 unmatched; inject fixtures for: unknown email, other-batch student, duplicate row, score > max, negative score, bad percentile, missing code — each must land in the right status and never persist.
5. **Duplicate/re-import:** re-upload same file with `skip` (0 inserted, 1,000 skipped) and `update` (0 inserted, 1,000 updated); row count unchanged.
6. **Isolation:** a student enrolled in batch A must not see batch B's records; revoked/suspended enrollment hides records (`enrollmentGrantsAccess`).
7. **XP (only if Phase 2 XP is approved):** concurrent double-confirm of the same import yields one ledger row per student; leaderboard totals equal `sum(activities.xp_awarded)` for the batch.
8. **Performance:** time preview + confirm for a 250-row and 1,000-row file on the staging Worker (current persist loop is row-by-row — record the latency; batch inserts are a possible Phase 2 optimisation).
9. **Rollback:** delete-record path works per row; document that XP (if enabled) is not reversed.

---

## 8. Questions for the QwikTest team

Blockers marked ★.

1. ★ Do you offer a documented **API** (create tests, invite candidates, fetch results)? Auth method, rate limits, versioning, sandbox?
2. ~~How are attempt limits and retakes configured?~~ **Answered in-app (§2.5):** one attempt per candidate, with admin-granted Retest; answers autosave across network drops. Remaining ★: after a **Retest**, is the first attempt kept, and which attempt does the export show?
3. ★ Exact definition of a **"student sitting"**. The billing page shows 2 sittings used for 2 single attempts. Does a **Retest** or a reconnect count again?
4. Do you support **webhooks** on submission/result publication? Signature scheme, retries, event ids?
5. ~~What columns does the export contain?~~ **Answered by the sample (§2.4).** Remaining ★: can the export (and invites) carry **our external id or roll number**, and a **test id** column?
6. ~~Can candidates be bulk-imported?~~ **Answered:** yes, a CSV of name and email per test. Remaining: can we add an **external id / roll number** column that flows through to the export?
7. **SSO / signed launch links** (SAML/OIDC/JWT) so students skip the email code?
8. Is **iframe embedding** supported, and how does it interact with fullscreen proctoring?
9. ★ Terms, Privacy (DPDP), Security and AUP policies are **published** (§2.5). Still needed: the registered **legal entity**, a signed **DPA** or processor addendum, a committed data **region** (India?), a fixed **retention** period after a workspace ends, and a **deletion** SLA.
10. **SLA / uptime.** The Terms say "as available" with no warranty. Can Enterprise add an uptime commitment and exam-day escalation? Paid plans state a 2–3 hour support reply.
11. Are session cookies **host-only** on custom domains? Is team-admin **MFA** available?
12. Consent and process for a **1,000-candidate load rehearsal** on your platform.
13. Enterprise/institutional terms: annual invoicing, multi-college workspaces, MoU-style agreements.
14. Camera and microphone proctoring are **confirmed in-app**. ★ Is any video, audio or snapshot **recorded or stored**, where, and for how long?
15. ~~CSV or XLSX?~~ **Answered:** both are offered. Remaining: is the column set and order **stable across releases**?
16. ★ Full value sets and meaning of **`Status`** (e.g. absent, in progress, auto-submitted), **`Candidate Removed`** and **`Certificate Status`**.
17. Negative marking **exists** (in-app). Can `Score` then be fractional or negative in the export?
18. Is **`Rank`** computed over the whole test or per group, and how are ties ranked?
19. What exactly counts as a **`Proctor Violation`**, and is a per-event log exportable?

---

## 9. Go / no-go criteria

**Go (Phase 1 pilot)** requires all of:

- [ ] DPA signed; legal entity, data region, retention and deletion confirmed in writing (Q9).
- [x] Single-attempt behaviour confirmed in-app: one attempt per candidate, admin-only Retest (§2.5).
- [ ] Sitting definition for a Retest known (Q3), and Retest effect on the export known (Q2).
- [ ] Every formal test configured as **Exclusive**, with negative marking off or the parser extended (S11, Q17).
- [ ] Written consent from QwikTest for any load rehearsal on their platform (AUP).
- [x] Export format known and its key columns map to our parser (§2.4, 2-row sample).
- [ ] `Status` / `Candidate Removed` semantics confirmed (Q16), and the admin filtering runbook (§4.6) agreed until the parser enforces them.
- [ ] A real export from a batch-sized test imports through the existing pipeline with ≥99% match and zero mis-attribution.
- [ ] Budget approved for the plan implied by §2.3.
- [ ] Native formal engine remains available as fallback.

**Go (Phase 3 automation)** additionally requires a documented API with authenticated access, and either signed webhooks or a rate-limited results endpoint, plus a separate security review.

**No-go** if any of: no DPA / unknown data location; no way to enforce single attempts; export lacks a reliable identifier (email or roll number); vendor declines staging rehearsal for a scheduled exam at our scale.

---

## 10. Verified vs unknown — at a glance

| Known (verified) | Unknown (needs vendor) |
|---|---|
| Our import pipeline, batch scoping, idempotent XP ledger, single-attempt formal engine | API, SSO, webhooks, embedding |
| `external_assessment` activity type exists but is unused | Attempt limits / retakes / resume |
| QwikTest: invited-email access, server timer, server scoring, basic proctoring, CSV/Excel export, custom domain, public pricing | `Status` / `Candidate Removed` value sets, negative marking, rank scope |
| Export columns (§2.4): `Email`, `Score`, `Max Score` map to our parser as-is; no test id / roll number column | Whether the export can carry our external id |
| No inbound API/webhook surface exists in our apps | Legal entity, privacy, DPA, data region, SLA |

## Sources

- QwikTest home — https://qwiktest.in/
- QwikTest pricing — https://qwiktest.in/pricing
- QwikTest pricing (Markdown) — https://qwiktest.in/pricing.md
- QwikTest about — https://qwiktest.in/about
- QwikTest security — https://qwiktest.in/security
- QwikTest contact — https://qwiktest.in/contact
- QwikTest llms.txt — https://qwiktest.in/llms.txt
- QwikTest policies (no policy text retrieved) — https://qwiktest.in/policies
- QwikTest privacy policy (no policy text retrieved) — https://qwiktest.in/privacy-policy
- QwikTest app entry — https://app.qwiktest.in/get-started
- Disambiguation only (different product): NearCraft QwikTest on CodeCanyon — https://codecanyon.net/item/qwiktest-nexgen-online-exam-software/33203119
