# Curriculum template pack (26-week Placement Prep)

The content of the template batch **"TEMPLATE · 26-Week Placement Prep"** (college `RMS-INTERNAL`, program
`PLACEMENTPREP`), kept in git so it can be reviewed, versioned and re-imported. Admins copy it into real batches of
the same program with **Batches → Curriculum → Copy from batch** (dates shift with the batch start).

Source: `docs/curriculum/RMS Careers 6 Months Plan.docx` (syllabus) and `docs/plans/student-projects-catalogue.md`.

## Layout

```text
template.json            college, program code, batch name, Week 1 start, number of weeks
weeks/week-NN/week.json  ordered items for the week: { "file": … } or { "reuse": "<existing slug>" },
                         optional "required": false and "dueAfterDays": n
weeks/week-NN/*.md       notes / resource (Markdown body) and quizzes (paste format) with front matter
weeks/week-NN/*.project.json   project brief (plain text) + rubric
weeks/week-NN/*.dsa.json       DSA sheet item pointing at a catalogue sheet slug
```

A typical week: four session notes (S1–S4), a DSA-stream note, a cheat sheet, the existing practice quiz, a timed
15-question weekly test and the week's project. Phase-end weeks (4, 8, 15, 19, 22) add a 30-question phase test and
the mini project; Week 26 adds a 40-question placement mock test.

## Importing

```bash
# Validate the pack (also part of `pnpm test`)
pnpm --filter @rms/admin exec vitest run lib/__tests__/curriculum-template-pack.test.ts

# NonProd test database (creates a test copy of the program if missing)
pnpm --filter @rms/admin template:import --target=test [--dry-run] [--starts-at=YYYY-MM-DD] [--library=on|off]

# Production: operator machine only, PRODUCTION_DATABASE_URL + RMS_PRODUCTION_DB_ENDPOINT in the shell
pnpm --filter @rms/admin template:import --target=production --confirm-production=<endpoint id> --dry-run
pnpm --filter @rms/admin template:import --target=production --confirm-production=<endpoint id>
```

- One transaction; safe to re-run. Rows are global, published, and tagged `metadata.templatePack = "placement-26w"`.
  A slug that exists but was not created by the pack stops the run instead of being overwritten.
- `reuse` items must already exist as published global content; missing ones are skipped with a warning.
- Quiz questions are replaced only while a quiz has no attempts.
- `--library=on` shows every pack item in the student Library (all enrolled students see global Library content).
  Without the flag the Library setting of existing rows is kept; new rows start hidden.
