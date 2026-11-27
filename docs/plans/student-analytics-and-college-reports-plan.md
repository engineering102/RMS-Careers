# Student Analytics & College Report Cards: Plan

Status: **Phase 1 built (Student Activity tab on batch analytics). Decisions D-1 to D-10 still open.**
Date: 2026-11-27
Surface: `apps/admin` (protected surface, CLAUDE.md §5.3). Schema additions need approval (§5.2).

## 1. Goal

College management (TPO, HoD, principal) receives a regular report on every student in its batches:
who is engaged, who is slipping, and how each student is doing on lectures, DSA, quizzes, projects and
external tests. The reports run weekly, monthly or for any date range. RMS admins see the same numbers
live in the admin portal, read the report before it goes out, and send it.

The report is part of what colleges get under the MoU, so its numbers have to be right. Every figure
comes from recorded activity. Nothing is estimated or padded (CLAUDE.md §5.5).

## 2. What exists today (origin/main @ de776b4)

| Area | Where | Notes |
|---|---|---|
| Batch academic analytics | `apps/admin/app/(admin)/batches/[batchId]/analytics/*`, `lib/db/queries/batch-analytics.ts` | Quiz participation and pass rates, project submission and approval, external tests, score bands, a "needs attention" list |
| CSV export | `exportBatchAnalyticsReportCsv` | 5 report types (summary, assessments, projects, external, needs_attention), batch-wide, **all-time** |
| Roster export | `export-roster-button.tsx` | Student list, no performance data |
| Email | `apps/admin/lib/email/*` (Resend) | Transactional templates only; reports `provider_not_configured` when the key is unset |

**Gaps**
1. **No date window.** Everything is all-time, so "this week" and "this month" can't be shown.
2. **No per-student view.** There is no single-student report card in admin.
3. **No college-level rollup.** A college with several batches gets nothing above batch level.
4. **No engagement or trend metrics.** Active days, week-over-week change and inactivity streaks are missing.
5. **No recipients and no delivery.** College contacts aren't stored. Reports can't be scheduled, sent or logged.

## 3. Data we can report on today

| Signal | Source | Windowable? |
|---|---|---|
| XP, by batch | `activities.xp_awarded`, `batch_id`, `activity_date_ist` | Yes |
| Lectures completed | `activities` (`lecture_completed`) | Yes |
| DSA problems solved | `activities` (`dsa_solved`), `student_dsa_progress.completed_at` | Yes |
| Quiz attempts and scores | `quiz_attempts` | Yes (attempt time) |
| Projects: submitted, approved, score | `assignment_submissions` | Yes |
| External tests (QwikTest etc.) | `external_assessment_records` | Yes (`imported_at`; not the test date, see D-8) |
| Active days | distinct `activities.activity_date_ist` | Yes |
| Streaks | `student_stats` | Current value only |
| Last login | `users.last_login_at` | Latest value only, no history |

**Not recorded today. The report must not claim these:**
- Login history and time spent on the platform
- Live-lecture attendance (`batch_live_sessions` stores the schedule, not who attended)
- Partial video watch progress (only completion is recorded)

These can be added later (§7, Phase 4), and only after a decision.

## 4. Proposed design

### 4.1 Metric layer (one place, tested)
New `apps/admin/lib/analytics/` with pure functions over plain rows: windowing, rates, trends and risk
flags. The admin pages, the printable report and the CSV/XLSX export all use these functions, so each
number is computed once. Unit tests sit next to it, in the same way `batch-analytics.test.ts` does.

The query layer gets `getStudentPeriodMetrics(batchIds, from, to)`. It returns one row per student with
the counts from §3, plus the same counts for the previous window so the trend can be shown. Each source
gets one aggregate query, so the query count doesn't grow with the number of students.

### 4.2 Admin screens
1. **Batch analytics: period picker.** Adds This week / Last week / This month / Last month / Custom to
   the existing page. All-time stays the default, so current behaviour doesn't change.
2. **Student table** (new tab on batch analytics). Sortable, one row per student: active days, lectures,
   DSA, quiz average, projects, XP, trend arrow, risk flag. Rows can be filtered by risk.
3. **Student report card** `/batches/[batchId]/students/[studentId]/report`. Shows weekly activity
   over time, a completion breakdown by curriculum week, assessment history, projects and admin remarks
   (D-6). The page prints cleanly.
4. **College dashboard** `/colleges/[collegeId]/analytics`. Rolls up all of the college's batches, then
   lets you drill down to batch and student.

### 4.3 The college report (deliverable)
- **Contents:** a cover summary for the period (enrolment, engagement rate, top movers, students
  needing attention), a batch table, and one compact row or card per student.
- **Formats:** a printable HTML page that becomes a PDF through the browser's Print to PDF, and an
  XLSX/CSV export of the same data. Server-side PDF isn't practical on the Workers runtime without an
  extra service (D-4).
- **Snapshot:** each generated report is frozen, with its period, numbers and generator, so the figures
  a college received can be shown again later even after data changes.

### 4.4 Delivery
- **Recipients:** college contacts (name, role, email) are stored per college and optionally per batch.
- **Flow (recommended for v1):** the admin generates a report, previews it and clicks **Send**. The
  email carries a summary and either the attachment or a secure link (D-3). A send log records who sent
  what to whom, and when.
- **Scheduling (later):** a per-college cadence (weekly Monday 9:00 IST or monthly on the 1st) creates
  a **draft** and notifies admins. Auto-sending without review is a separate decision (D-2).

### 4.5 Schema additions (need approval)
All new tables, no changes to existing ones. One migration, with no enum created and used in the same
transaction (§5.2). Use `text` + CHECK constraints instead of new enums.

| Table | Purpose |
|---|---|
| `college_contacts` | id, college_id, batch_id (nullable), name, role, email, is_active, created_by |
| `report_schedules` | id, college_id, cadence (`weekly`/`monthly`), day, is_active, auto_send (default false) |
| `report_snapshots` | id, college_id, batch_ids, period_from, period_to, payload jsonb, generated_by, generated_at |
| `report_deliveries` | id, snapshot_id, recipient_email, status, provider_message_id, sent_by, sent_at, error |
| `student_report_remarks` *(if D-6 = yes)* | id, student_id, batch_id, period, remark, author_user_id |

## 5. Risk ("needs attention") rules, proposed defaults

These defaults are configurable later. A flag only appears when its data exists.

As built in Phase 1 (`apps/admin/lib/analytics/student-period-metrics.ts`). An **active day** is a day
with a lecture completed, a DSA problem solved or a quiz completed in the batch. Project approvals and
external imports are left out, because their dates record when staff acted. A **due item** is a required
lecture, quiz or project whose `due_at` has passed and falls on or before the period end. Items without
a due date are never flagged. Completion is judged as of the moment the report is generated.

| Flag | Rule | Severity |
|---|---|---|
| Inactive | 0 active days, and the period is at least 7 days long | High |
| Low engagement | Active days < 25 % of the period's days (period ≥ 7 days) | Medium |
| Sharp drop | Still active, but active days at most half of the previous period's (and previous ≥ 2) | Medium |
| Falling behind | At least 2 lectures due, fewer than half of them completed | High |
| Overdue quiz | A due quiz with no submitted attempt | High |
| Overdue project | A due project with no submission | High |
| Failing quizzes | At least 2 attempts in the period, fewer than half of them passed | Medium |

## 6. Privacy and compliance

- The reports contain personal data (names, roll numbers, performance) going to a third party (the
  college). The MoU must cover this sharing. Under India's DPDP Act 2023, students should be told at
  enrolment that progress reports go to their college (D-9).
- Emails only go to contacts an admin has entered and confirmed. Nothing goes to addresses found in
  imported data.
- Secure report links (if D-3 picks links) are single-report, expire, carry no student data in the URL,
  and are served by admin with a signed token. No cross-portal cookies (CLAUDE.md §2).
- Each `report_deliveries` row is an audit record. Rows are never deleted.

## 7. Phases

| Phase | Scope | Schema? | Size |
|---|---|---|---|
| **1. Windowed analytics** | Metric layer, period picker, student table, risk flags, CSV/XLSX per period | No | M |
| **2. Report card + college dashboard** | Student report page, college rollup, printable college report | No | M |
| **3. Delivery** | Contacts, snapshots, preview → send, send log, schedules that create drafts | Yes (§4.5) | M–L |
| **4. Richer signals** *(optional)* | Login history, live-lecture attendance, watch time | Yes | L |

Phases 1 and 2 need no schema change, so they can ship and give colleges value while D-1 to D-10 are
being settled. Phase 3 waits on the schema approval.

## 8. Decisions needed

| # | Question | Recommendation |
|---|---|---|
| D-1 | Who receives reports: TPO, HoD, principal, faculty coordinator? Per college or per batch? | Per-college contacts, optionally narrowed to a batch |
| D-2 | Auto-send on schedule, or always admin-reviewed? | Review first for v1; auto-send as an opt-in per college later |
| D-3 | Attachment (XLSX/PDF) or secure expiring link? | Attachment for v1 (no login for college staff); add links if files get too big |
| D-4 | Is browser Print to PDF enough, or is a server-generated PDF required? | Print to PDF for v1; Cloudflare Browser Rendering if a server-generated PDF is needed |
| D-5 | Default cadence | Weekly summary + monthly full report card |
| D-6 | Should admins or tutors add written remarks per student? | Yes, optional, in Phase 2/3 |
| D-7 | Should colleges get their own portal login instead of emails? | Not now. It would be a new surface (`apps/college`) with its own auth |
| D-8 | External test date: use import time, or add the real test date? | Use import time now and label it "imported"; revisit with the QwikTest feed |
| D-9 | Student consent / notice wording for reports to the college | Add to the enrolment terms before the first send |
| D-10 | Is a grade or band on the report card wanted (A/B/C, Elite/Proficient)? | Reuse the existing score bands; no overall letter grade until rules are agreed |
