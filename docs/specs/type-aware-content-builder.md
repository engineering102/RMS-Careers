# Type-Aware Content Builder: Design

Status: steps 1–5 of the implementation order are implemented (uncommitted); steps 6–9 await approval · Date: 2026-10-13 · Branch base: `feat/admin-content-builder` (commit `2f59a18`)

This design builds on the builder that already exists at `apps/admin/app/(admin)/content/[id]`. It does not
start over. Every field, state and route below comes from the current code. Items marked **[approval]** change
behaviour or cross app boundaries, so per CLAUDE.md §6 they need sign-off before anyone implements them.

---

## 0. What exists today (findings)

| Area | Current implementation | Source |
|---|---|---|
| Content model | One table, `content_items` (`title`, `slug`, `content_type`, `description`, `program_id`, `metadata jsonb`, `is_published`). Slugs are unique per `(program_id, slug)`. | `packages/db/src/schema.ts:335` |
| Types | `content_type` enum: `lecture`, `notes`, `dsa_sheet`, `quiz`, `project`, `resource`. | `schema.ts:61` |
| Lifecycle | `draft` / `published` / `archived`. This is derived, not stored: `is_published` plus `metadata.isArchived`. | `apps/admin/lib/db/queries/content.ts:45`, `:386` |
| Create | A modal on `/content` (`createContentAction`). A new item opens in the builder. A quiz gets its `quizzes` row via `getOrCreateQuizForContentItem` with **no defaults**, so it is always `practice`. | `content/actions.ts`, `content-client.tsx:192-220` |
| Builder | `/content/[id]`: basics, editors per type, live preview, publish/unpublish, Ctrl+S, `beforeunload` guard. The type comes from the DB (`existing.contentType`), never from the client. | `content/[id]/*` |
| Quick edit | A modal on `/content` that **lets you change `contentType`** on existing items (`updateContentAction`). | `content-client.tsx:849`, `content/actions.ts` |
| Quiz / formal assessment | A separate workbench at `/content/[id]/quiz`: config (practice/formal, time limit, pass %, explanation policy) and question CRUD/reorder. | `content/[id]/quiz/*`, `lib/db/queries/quiz-authoring.ts` |
| Project | Brief = `description`. Rubric lives in `assignments.rubric_criteria`, with `max_score` = sum of criteria (already editable in the builder, with a warning when submissions exist). | `lib/content/project-rubric.ts`, `lib/db/queries/content-assignments.ts` |
| DSA | **No code execution or test cases exist.** Problems are a static TypeScript catalogue in the **student app** (`apps/student/lib/data/dsa-sheets.ts`). A `dsa_sheet` item links to a sheet through `metadata.slug ?? slug`. Progress is self-reported (`student_dsa_progress.is_completed`, `submission_url`, `notes`), and the problem slug is checked against that catalogue. | `apps/student/lib/db/queries/progress.ts:110`, `lib/actions/dsa.ts:34` |
| Curriculum | No "unit" entity. Placement is `batch_curriculum` per batch (week, sequence, required, `available_from`, `due_at`), managed at `/batches/[batchId]/curriculum`. Only published content can be placed. | `schema.ts:359`, `batches/[batchId]/curriculum/actions.ts:101` |
| Student rendering | `ContentHeader`, `EmbeddedVideoPlayer`, `ResourceViewer` (notes shown as **plain text**, no markdown), `ProjectSubmissionWorkspace`, `PracticeQuizRunner`, `FormalAssessmentRunner`, `UnsupportedContentView` (dsa/quiz handoff). All of these live in `apps/student/components`. The admin app cannot import them. | `apps/student/app/(dashboard)/content/[id]/page.tsx` |
| Admin preview | `student-preview.tsx` is an approximation of those components, built from unsaved form state. `video-url.ts` is duplicated in both apps. | `content/[id]/student-preview.tsx` |

### Gaps the design must account for

1. **The quick-edit modal can change content type** on any item, including quizzes with attempts and projects
   with submissions. The `quizzes`/`assignments` rows remain (they cascade only on delete). Student progress
   classification (`progress.ts`) switches silently. See §6.
2. **Quiz edits after attempts are guarded only in the client.** The server blocks question *delete* when
   attempts exist (`quiz-authoring.ts:338`). `updateQuizConfig` and `updateQuizQuestion` have no attempt
   check, so `quizType`, time limit, correct answers and points can all change under recorded attempts. See §3.5.
3. **Quizzes are always created as `practice`.** Making a formal assessment takes a second trip to the workbench.
4. **The DSA sheet slug is free text in admin.** Admin cannot see the catalogue, so a typo publishes a dead link.
5. **The unsaved-changes guard covers only `beforeunload`.** In-app `<Link>` and `router.push` navigation is not guarded.
6. **Project save is not atomic.** `updateContentItem`, then `saveProjectRubric`, runs over `neon-http` with no
   transaction. A rubric failure after a successful basics save leaves a partial save. The action already returns
   an error, but the message should say the basics were saved.
7. `content/actions.ts` (create, quick edit, lifecycle) checks only `auth()` for a session. The builder action uses
   `requireAdmin()`. Not part of this design, but worth aligning (admin surface is protected, so this is noted, not changed).

---

## A. Content-type selection

Replace the generic create modal's `<Select>` with a **card grid step** (step 1 of create). Step 2 is the
existing shared fields (title, slug, program). On success, route to `/content/[id]` as today.

The choices are derived from the `content_type` enum plus the one real sub-mode (`quizzes.quiz_type`). Six enum
values produce seven cards, because practice and formal are different products with different student rules:

| Card | Persists as | Workflow | Description shown | Accent / icon (lucide) |
|---|---|---|---|---|
| Video lecture | `lecture` | Inline editor | Embedded YouTube/Vimeo/https player; students mark it complete. | blue · `PlayCircle` |
| Reading | `notes` | Inline editor | Notes students read on the page, optionally with a linked document. | cyan · `FileText` |
| Resource link | `resource` | Inline editor | An external document, slide deck or PDF students open or download. | cyan · `Bookmark` |
| Practice quiz | `quiz` + `quiz_type='practice'` | Quiz workbench | Untimed, unlimited retakes, instant explanations by default. | violet · `FileQuestion` |
| Formal assessment | `quiz` + `quiz_type='formal'` | Quiz workbench | Timed, single attempt, server-enforced deadline with auto-submit. | amber · `ShieldCheck` |
| Project | `project` (+ `assignments`) | Inline editor | A brief plus a scored rubric; students submit a GitHub link for tutor review. | green · `FolderGit2` |
| DSA sheet | `dsa_sheet` | Catalogue link | Links students to a sheet in the DSA Practice Center (problems are not authored here). | orange · `Code2` |

Rules:
- Each card shows a "Workflow" chip ("Edited here", "Opens quiz workbench", "Links to DSA catalogue"), so the
  different creation paths are visible before you choose.
- For the two quiz cards, pass `{ quizType }` into the existing `getOrCreateQuizForContentItem(id, defaults)`
  (it already accepts defaults, `quiz-authoring.ts:152`). Formal additionally gets
  `timeLimitMinutes: DEFAULT_FORMAL_TIME_LIMIT_MINUTES (30)` and `showExplanations: 'after_deadline'`, which is the
  same as what `updateQuizConfig` defaults to. No schema change.
- Labels come from one registry (§D). Today `TYPE_LABELS` is defined separately in `content-builder-client.tsx`,
  `student-preview.tsx` and `content-client.tsx`, and they disagree ("Reading" vs "Notes").

## B. Shared authoring shell

Kept from the current builder. Only fields that exist in the model are included:

| Shell element | Backing | Notes |
|---|---|---|
| Title | `title` | 2–255 characters. |
| Slug | `slug` | Unique per program scope. The clash message from `updateContentItem` maps to the `slug` field (already done). For `dsa_sheet` the slug field is replaced by the sheet picker (§C.4). |
| Description | `description` | Labelled "Project brief" for projects (8 rows). Up to 2000 characters. |
| Program | `program_id` (nullable = global) | An inactive current program stays selectable (already done). |
| Topic | `metadata.topic` | All types. |
| Duration | `metadata.durationMinutes` | Lecture, reading and resource only. |
| Status | Derived lifecycle | Badge plus Publish/Unpublish. Archive/unarchive stay on the list page, as today. No new states. |
| Placement (read-only) | `batch_curriculum` count plus `describeAudience()` | Lists the batch curricula that contain the item, linking to `/batches/[id]/curriculum`. Placement is not edited in the builder (it is per batch and carries dates). |
| Validation | Zod server-side; errors keyed by full path (`rubric.1.maxPoints`) | Already in place. The client clears a field's error on edit. |
| Save | Ctrl+S / button, disabled when clean | Already in place. |
| Publish | `updateContentLifecycleAction` | Blocked while dirty (already done). Adds **readiness warnings** (§F). |
| Preview | Right-hand sticky panel | See §E. |
| Unsaved guard | `beforeunload` (exists) **plus** in-app navigation | Add a capture-phase click handler on internal `<a>` and wrap the builder's own `router.push` calls with a `confirm()` when dirty. No new dependency. |

## C. Type-specific editors

Each section lists fields → storage key, validation, interactions, preview, and save behaviour.

### C.1 Video lecture (`lecture`), reuse the existing editor

- **Fields:** `videoUrl` (→ `metadata.videoUrl`, `provider`, `videoId` through `buildStudentMetadataPatch`), `durationMinutes`.
  `aspectRatio` is read by the student player but has never been authored. Leave it off until it is requested.
- **Validation:** `parseVideoUrl` must succeed (YouTube, Vimeo, or https embed). Otherwise `InvalidVideoUrlError` → field error. Empty clears all three keys.
- **Interaction:** As you type, show the parsed provider and ID under the field.
- **Preview:** iframe through `embedUrlFor`, restricted by admin CSP to youtube-nocookie and Vimeo. Custom https players are not framed; a note says so.
- **Save:** Metadata patch merged into existing metadata (legacy keys still written).

### C.2 Reading (`notes`) and C.3 Resource link (`resource`), one shared module

These two have identical storage and identical student rendering (`ResourceViewer`). They share one editor
module and differ only in emphasis: Reading puts the notes textarea first, Resource puts the link first.
"Documents and downloadable resources" maps here. **No file storage exists**, so downloads are external URLs
only; uploads are out of scope.

- **Fields:** `resourceLink` (→ `documentUrl` + legacy `resourceLink`), `notes` (→ `notes` + legacy `notesMarkdown`), `durationMinutes`.
- **Validation:** The link must be `http(s)://…` (≤2000 characters); notes ≤50,000 characters. Neither is required. Missing both triggers a publish warning, not a block.
- **Interaction:** A plain `<Textarea>` with a character count. **No rich-text or markdown editor:** the student
  `ResourceViewer` renders notes as plain text, so a formatting editor would show admins formatting that students
  never see. Revisit only if the student renderer adopts markdown (that would be a separate, approved change to both apps).
- **Preview:** Mirrors `ResourceViewer`: open button, a PDF badge when the URL ends in `.pdf`, and a notes block.
- **Save:** Metadata patch. Notes keep internal whitespace, and trailing whitespace is trimmed.

### C.4 DSA sheet (`dsa_sheet`), change from free-text slug to a catalogue picker

There is **no execution or validation model** to design against: no test cases, languages, runtimes or judge.
Problems (statement, examples, constraints, hints, complexity, `externalUrl`) are code in
`apps/student/lib/data/dsa-sheets.ts`, and completion is a self-reported checkbox plus an optional submission URL.
A problem editor would need new tables. **That is out of scope and would need product approval.**

- **Fields:** A sheet selection that sets `slug` (and `metadata.slug`, which the student reads first). Title and
  description default from the sheet but stay editable.
- **Validation:** The slug must exist in the catalogue. Also, `(program_id, slug)` uniqueness already blocks two items for one sheet in the same program.
- **Interaction:** A select or list of sheets showing title, problem count, `estimatedHours` and difficulty mix. Read-only problem list underneath.
- **Preview:** The actual sheet data (title, problem titles, difficulties) labelled **"From DSA catalogue"**, plus the
  `UnsupportedContentView` handoff text students see ("Open DSA Practice Center").
- **Save:** `slug` plus `metadata.slug`.
- **Prerequisite [approval]:** The admin app needs the catalogue. Recommended: move `dsa-sheets.ts` and its types
  (`apps/student/lib/types/dsa.ts`) into a small workspace package (`packages/dsa-catalog`, data and types only, no
  React and no DB) that both apps import. This is a multi-app change. Fallback with no new package: a generated
  slug list in admin plus a parity unit test, which is cheaper but can drift.

### C.5 Practice quiz and formal assessment (`quiz`), integrate the existing workbench, do not duplicate it

The workbench (`/content/[id]/quiz`, 955 lines) already owns config and question CRUD with full Zod rules
(option ID uniqueness, single-choice = exactly one correct, formal requires a time limit). **Recommendation:
reuse it and integrate it into the builder; do not rebuild it.**

- **Builder quiz panel (new, read-only summary):** quiz type badge, time limit, pass %, explanation policy,
  question count, total points, attempt count, and an "Open quiz workbench" button. Data comes from the existing
  `getQuizByContentItemId`. The shell (title, description, program, publish) stays in the builder; the questions stay in the workbench.
- **Workbench back-link:** add a header link back to `/content/[id]`, so the two read as one flow.
- **Preserved behaviour (no change):**
  - Practice: unlimited untimed retakes, graded server-side through `submitPracticeQuizAttempt`.
  - Formal: single attempt. The deadline is set by the **server** at `startedAt + timeLimitMinutes`, with a 2-minute
    submission grace (`FORMAL_SUBMISSION_GRACE_MS`). After the deadline a submission is flagged `isAutoSubmitted`.
    `tabBlurCount` is clamped to 0–500 and stored on `quiz_attempts`. 20 XP for formal (`FORMAL_QUIZ_XP`).
  - Explanation policy enum (`immediate` / `after_deadline` / `never`), server-graded by `gradeResponses`.
- **Hardening [approval]:** add server-side attempt guards matching the existing delete guard. When
  `attemptCount > 0`, reject changes to `quizType`, `correctOptionIds`, `options` IDs and `points` in
  `updateQuizConfig`/`updateQuizQuestion`, and allow typo-level edits to question/option text and explanations.
  Without this, a practice quiz with attempts can become formal, or past scores can be re-meaningified, by an edit
  the UI only partly discourages.
- **Validation in the builder:** none beyond the shell. Quiz rules stay in `quiz/schema.ts`.

### C.6 Project (`project`), reuse the existing editor

- **Fields:** the brief (`description`) and rubric criteria `{ title, maxPoints, description? }[]` → `assignments.rubric_criteria`. `max_score` = sum of criteria.
- **Validation:** 1–12 criteria, title 2–120 characters, points 1–1000, description ≤500 characters (`projectRubricSchema`).
- **Interaction:** add, remove and reorder criteria, with a live total. If no rubric row exists, start from
  `DEFAULT_PROJECT_RUBRIC` (the same default students receive) and label it. A warning banner appears when submissions exist.
- **Preview:** brief, rubric with total, and the submission fields students fill in (GitHub URL, optional live URL,
  notes). These fields are fixed by `assignment_submissions` and are not configurable.
- **Save:** basics, then rubric upsert. Because this is not atomic (gap 6), when the rubric fails after the basics succeed, return
  `"Details saved; rubric could not be saved"` and keep the form dirty for the rubric only.

### C.7 Curriculum units / structured content, no new editor

There is no unit or module entity. The structure is `programs` → `batch_curriculum` (week, sequence, required,
`available_from`, `due_at`). The curriculum workflow at `/batches/[batchId]/curriculum` already handles
placement, and it is per batch. The builder only shows read-only placement (§B) with deep links. A unit or module
entity would need schema work and is out of scope.

## D. Dynamic field rendering: architecture

Today, `content-builder-client.tsx` (672 lines) and `student-preview.tsx` branch on `type === …` in about 12
places, and the server action builds the patch with spread conditionals. With six types that still works, but
every new type touches four files. Proposed, kept deliberately small:

```text
apps/admin/lib/content/types/
  registry.ts        # client-safe: CONTENT_TYPE_DEFS[type] = { label, description, icon, accent,
                     #   workflow: 'inline' | 'quiz-workbench' | 'dsa-catalogue', hasDuration, slugMode }
  schemas.ts         # z.discriminatedUnion('contentType', [...]) of base.extend({ contentType: z.literal(t), ...fields })
  metadata.ts        # per type: readFields(metadata) / toMetadataPatch(values), wrapping buildStudentMetadataPatch
  readiness.ts       # per type: publishWarnings(item, related): string[]

apps/admin/app/(admin)/content/[id]/types/
  index.ts           # 'use client' map: { Editor, Preview } per type
  lecture.tsx  reading.tsx (notes + resource)  project.tsx  quiz.tsx  dsa-sheet.tsx
```

- **Typed schema:** a `z.discriminatedUnion` on `contentType` replaces the flat all-optional `contentBuilderSchema`.
  The server still loads `existing.contentType` and **rejects** input whose discriminant differs. The client never
  chooses the type on save. This removes the current possibility of sending `videoUrl` for a reading item.
- **Shell vs module:** the shell renders shared fields from `CONTENT_TYPE_DEFS[type]` flags (`hasDuration`,
  `slugMode: 'free' | 'dsa-picker'`, `descriptionLabel`), then `<Editor value onChange errors />` and
  `<Preview form />`. Editors receive only their slice of form state plus a path-prefixed error lookup (the existing `errorFor`).
- **Reusable field components:** promote the existing local `Field` (label, hint, error) and `StatusBadge` into
  `components/content-builder/`. Nothing more: no generic schema-to-form renderer. Five editors do not justify one.
- **No form framework:** the current `useState` + snapshot dirty check + server Zod errors is small and works.
  `react-hook-form` would add a dependency and a second validation path without fixing any current bug.
- **Adding a type:** an enum migration (approved separately), then a registry entry, a schema member, metadata
  read/patch, a client module, and a student renderer. The rest is compile-checked by `Record<ContentTypeEnum, …>`.

## E. Preview

**Constraint:** student components live in `apps/student`, and the apps share no UI package. Importing them into admin
is not possible today. Several also carry side effects: `CompletionButton` calls `markLectureWatched` (activity + XP),
`ProjectSubmissionWorkspace` calls `submitProjectAssignment`, the runners call `submitPracticeQuizAttempt` /
`startFormalAssessmentAttempt` / `submitFormalAssessment`, and `EmbeddedVideoPlayer` writes `localStorage`.

**Recommendation:** keep admin-side preview components, but make them **parity-checked, side-effect-free mirrors**:

| Type | Preview data | Inert substitutes |
|---|---|---|
| Lecture | Unsaved form values; real embed | "Mark complete" rendered disabled ("Preview: not recorded") |
| Reading / resource | Unsaved form values | None needed (`ResourceViewer` is presentational) |
| Project | Unsaved brief and rubric | Submission form rendered disabled; no submit button |
| Quiz / formal | **Saved** questions from the DB (the workbench owns them) | Static question list with options, plus the start screen (time limit, pass %, attempts rule). Optional local "check answers" toggle that highlights `correctOptionIds` client-side, with no grading call and no attempt row |
| DSA sheet | Catalogue data (after C.4) | Handoff card only |

- **Labelling:** a "Preview: not visible to students" chip on the panel. Any value that is a placeholder (for
  example "Untitled", a sample program code, or a "No video yet" state) is shown in muted italic with a `(placeholder)` suffix.
  Quiz previews state "Showing saved questions; save in the workbench to update".
- **No side effects:** preview components must not import any server action. Enforce this with a unit test that
  greps `content/[id]/types/*` and `student-preview.tsx` for `'use server'` modules and `@/lib/actions` imports.
- **Parity over time [approval, optional]:** extract the purely presentational pieces (`ContentHeader` body,
  `ResourceViewer`, video frame, and `parseVideoUrl`, currently duplicated) into `packages/content-ui` and have both apps
  use them. That removes drift but is a cross-app refactor, so it stays deferred until drift actually causes a bug.

## F. Drafting, editing, publishing

**Lifecycle (unchanged):** create → draft (`is_published=false`) → publish → (unpublish ↔ publish) → archive (list page;
sets `metadata.isArchived`, unpublishes) → unarchive (returns to draft). There is no autosave, versioning or scheduling,
and none is proposed. `batch_curriculum.available_from` / `due_at` already cover per-batch timing.

- **Editing preserves unknown metadata:** `updateContentItem` merges patches into existing metadata, so keys the
  builder does not author (`isArchived`, `archivedAt`, `aspectRatio`, `category`, `fileType`, seeded keys) survive a
  save. The new per-type `toMetadataPatch` must keep returning **patches**, never full objects. Add a unit test for this.
- **Publish readiness warnings** (shown in a confirm dialog; publishing still allowed, which matches current behaviour):
  lecture with no playable video; reading/resource with neither link nor notes; quiz with 0 questions; DSA slug not in catalogue;
  project still on the default rubric. **[approval]** to make "quiz with 0 questions" a hard block.
- **Formal assessments:** after the first attempt, the builder shows the workbench's attempt count and lock state in the quiz summary.

### Changing content type on existing items: recommended policy

Type determines the side tables (`quizzes`, `assignments`), student routing, progress classification and the
`activities.activity_type` of past completions. Changing it after creation can orphan attempts and submissions,
or silently re-route students.

| From → to | Policy | Why |
|---|---|---|
| `notes` ↔ `resource` | **Allowed** | Same metadata keys, same `ResourceViewer`, same completion source (`lecture_completed`). |
| `lecture` ↔ `notes`/`resource` | Allowed only while **draft and never placed** in a batch curriculum | The completion source is the same, but students see a different player. Blocked once anyone could have seen it. |
| Anything ↔ `quiz` / `project` / `dsa_sheet` | **Not allowed** | Side-table rows or catalogue linkage; possible attempts or submissions. Create a new item instead. |

Implementation **[approval, touches `content/actions.ts`]:** remove the type `<Select>` from the quick-edit modal (show
type read-only, with "Switch to Resource/Reading" where allowed), and enforce the table above in
`updateContentAction` on the server, returning `{ success: false, error }` with the reason. The builder already ignores
client-sent type and keeps doing so.

---

## Implementation order

1. Registry + discriminated-union schema + split editor/preview modules (pure refactor, same behaviour; existing
   `content-builder.test.ts` must stay green).
2. Type-selection cards on create, with `quizType` defaults passed to `getOrCreateQuizForContentItem`.
3. Quiz summary panel in the builder + workbench back-link.
4. In-app navigation guard, publish readiness warnings, placement list, project partial-save message.
5. Preview labelling, inert controls, no-server-action test.
6. **[approval]** Type-change policy in `updateContentAction` and quick edit.
7. **[approval]** Server-side quiz attempt guards.
8. **[approval]** DSA catalogue package + sheet picker.
9. *(Deferred)* `packages/content-ui` for preview parity.

Verification per step: `pnpm --filter @rms/admin typecheck`, `pnpm --filter @rms/admin test`, `pnpm --filter @rms/student test`
when shared code moves, and `pnpm test:int` for steps touching queries (6, 7).
