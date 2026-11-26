/**
 * Imports the 26-week curriculum template pack (ops/curriculum-template) into one template batch.
 *
 *   pnpm --filter @rms/admin template:import --target=test [--dry-run] [--library=on|off] [--starts-at=YYYY-MM-DD]
 *   pnpm --filter @rms/admin template:import --target=production --confirm-production=<endpoint> [--dry-run]
 *
 * What it does, in ONE transaction (all or nothing):
 *  1. Ensures the internal college (template.json) and the template batch, under the existing program
 *     (template.json programCode), so "Copy from batch" works into that program's real batches.
 *  2. Upserts every pack item as GLOBAL, PUBLISHED content (program_id NULL), tagged
 *     metadata.templatePack. A row with the same slug that the pack did not create is never touched:
 *     the run stops instead.
 *  3. Writes quiz settings + questions (questions are only replaced while the quiz has no attempts) and
 *     project rubrics.
 *  4. Places pack items and reused items (existing published global content, by slug) into the template
 *     batch week by week, with release dates from template.json startsAt; removes template-batch
 *     placements no longer in the pack.
 *
 * Library: new rows start with inLibrary=false. --library=on / --library=off sets it on every pack item
 * (never on reused items). Without the flag, existing values are kept.
 * Target rules (pins, production confirmation, CI refusal) come from @rms/db/guard-env.
 */
import { findRepoRoot, resolveMigrationTarget } from '@rms/db/guard-env';
import { verifyLiveIdentity } from '@rms/db/migration-runner';
import { connectExecutor, promptVisible } from '@rms/db/node-tooling';
import { PACK_ID, loadTemplatePack, templatePackRoot, type PackItem } from './lib/template-pack';
import { rubricMaxScore } from '../lib/content/project-rubric';

const DAY_MS = 24 * 60 * 60 * 1000;
const flag = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const has = (name: string) => process.argv.includes(`--${name}`);

type Row = Record<string, unknown>;

function metadataFor(item: PackItem, existing: Row | null, library: boolean | undefined): Row {
  const keepLibrary = existing && existing.inLibrary === true;
  const base: Row = {
    topic: item.topic,
    subject: item.subject,
    inLibrary: library ?? keepLibrary ?? false,
    templatePack: PACK_ID,
    templateWeek: item.week
  };
  switch (item.kind) {
    case 'notes':
    case 'resource':
      return { ...base, notes: item.body.replace(/\s+$/, ''), notesMarkdown: item.body.replace(/\s+$/, ''), durationMinutes: item.minutes };
    case 'dsa_sheet':
      return { ...base, slug: item.sheetSlug };
    default:
      return base;
  }
}

async function main(): Promise<void> {
  const resolved = resolveMigrationTarget({ argv: process.argv });
  if (resolved.target !== 'test' && resolved.target !== 'production') {
    throw new Error('--target must be test or production.');
  }
  const dryRun = has('dry-run');
  const libraryFlag = flag('library');
  if (libraryFlag !== undefined && libraryFlag !== 'on' && libraryFlag !== 'off') throw new Error('--library must be on or off.');
  const library = libraryFlag === undefined ? undefined : libraryFlag === 'on';

  const pack = loadTemplatePack(templatePackRoot(findRepoRoot()));
  if (pack.problems.length > 0) {
    console.error(`[template] pack has ${pack.problems.length} problem(s):\n  - ${pack.problems.join('\n  - ')}`);
    process.exit(1);
  }
  const { settings } = pack;
  // --starts-at=YYYY-MM-DD overrides template.json (e.g. to preview released weeks on the test database).
  const startsAt = new Date(flag('starts-at') ? `${flag('starts-at')}T03:30:00.000Z` : settings.startsAt);
  if (Number.isNaN(startsAt.getTime())) throw new Error('template.json startsAt is not a valid date.');
  const endsAt = new Date(startsAt.getTime() + settings.weeks * 7 * DAY_MS - DAY_MS);

  console.log(
    `[template] target=${resolved.target} endpoint=${resolved.db.endpoint} database=${resolved.db.database} ` +
      `items=${pack.items.length} reused=${pack.reused.length}${dryRun ? ' (dry run)' : ''}`
  );

  const exec = await connectExecutor(resolved.url);
  try {
    await verifyLiveIdentity(exec, resolved.live);
    if (resolved.target === 'production' && !dryRun) {
      const typed = await promptVisible(`Write the curriculum template to PRODUCTION endpoint ${resolved.db.endpoint}? Type the endpoint id: `);
      if (typed !== resolved.db.endpoint) throw new Error('Confirmation did not match; nothing was changed.');
    }

    await exec.query('BEGIN');
    const warnings: string[] = [];
    const counts = { created: 0, updated: 0, questions: 0, placed: 0, removed: 0 };

    // 1. College, program, batch
    let [program] = await exec.query('SELECT id FROM programs WHERE code = $1', [settings.programCode]);
    if (!program && resolved.target === 'test') {
      // The test database has no real programs; production must already have it.
      [program] = await exec.query(
        `INSERT INTO programs (name, code, status) VALUES ($1, $2, 'active') RETURNING id`,
        [`${settings.programCode} (test copy)`, settings.programCode]
      );
      console.log(`[template] created test program ${settings.programCode}`);
    }
    if (!program) throw new Error(`Program ${settings.programCode} not found.`);
    const programId = Number(program.id);

    let [college] = await exec.query('SELECT id FROM colleges WHERE code = $1', [settings.college.code]);
    if (!college) {
      [college] = await exec.query(
        'INSERT INTO colleges (name, code, city, state, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id',
        [settings.college.name, settings.college.code, settings.college.city, settings.college.state]
      );
      console.log(`[template] created college ${settings.college.code}`);
    }
    const collegeId = String(college.id);

    let [batch] = await exec.query('SELECT id FROM batches WHERE name = $1 AND college_id = $2 AND program_id = $3', [
      settings.batchName,
      collegeId,
      programId
    ]);
    if (!batch) {
      [batch] = await exec.query(
        `INSERT INTO batches (program_id, college_id, name, status, start_date, end_date) VALUES ($1, $2, $3, 'active', $4, $5) RETURNING id`,
        [programId, collegeId, settings.batchName, startsAt.toISOString(), endsAt.toISOString()]
      );
      console.log(`[template] created batch "${settings.batchName}"`);
    } else {
      await exec.query('UPDATE batches SET start_date = $2, end_date = $3 WHERE id = $1', [batch.id, startsAt.toISOString(), endsAt.toISOString()]);
    }
    const batchId = String(batch.id);

    // 2–3. Content
    const placements: { contentItemId: string; week: number; order: number; required: boolean; dueAfterDays: number | null }[] = [];
    for (const item of pack.items) {
      const [existing] = await exec.query(
        'SELECT id, metadata FROM content_items WHERE program_id IS NULL AND slug = $1',
        [item.slug]
      );
      const existingMeta = (existing?.metadata ?? null) as Row | null;
      if (existing && existingMeta?.templatePack !== PACK_ID) {
        throw new Error(`Slug "${item.slug}" already belongs to content the pack did not create. Rename it in the pack.`);
      }
      const metadata = JSON.stringify(metadataFor(item, existingMeta, library));
      let contentItemId: string;
      if (existing) {
        contentItemId = String(existing.id);
        await exec.query(
          `UPDATE content_items SET title = $2, description = $3, content_type = $4, metadata = metadata || $5::jsonb,
             is_published = true, updated_at = now() WHERE id = $1`,
          [contentItemId, item.title, item.description, item.kind, metadata]
        );
        counts.updated++;
      } else {
        const [row] = await exec.query(
          `INSERT INTO content_items (program_id, title, slug, content_type, description, metadata, is_published)
           VALUES (NULL, $1, $2, $3, $4, $5::jsonb, true) RETURNING id`,
          [item.title, item.slug, item.kind, item.description, metadata]
        );
        contentItemId = String(row.id);
        counts.created++;
      }

      if (item.kind === 'quiz') {
        const [quiz] = await exec.query(
          `INSERT INTO quizzes (content_item_id, quiz_type, time_limit_minutes, passing_score_percent, show_explanations)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (content_item_id) DO UPDATE SET quiz_type = EXCLUDED.quiz_type, time_limit_minutes = EXCLUDED.time_limit_minutes,
             passing_score_percent = EXCLUDED.passing_score_percent, show_explanations = EXCLUDED.show_explanations, updated_at = now()
           RETURNING id`,
          [contentItemId, item.quizType, item.timeLimitMinutes, item.passPercent, item.explanations]
        );
        const [attempts] = await exec.query('SELECT count(*)::int AS n FROM quiz_attempts WHERE quiz_id = $1', [quiz.id]);
        if (Number(attempts.n) > 0) {
          warnings.push(`"${item.title}": ${attempts.n} attempt(s) exist, questions left unchanged`);
        } else {
          await exec.query('DELETE FROM quiz_questions WHERE quiz_id = $1', [quiz.id]);
          let seq = 0;
          for (const q of item.questions) {
            await exec.query(
              `INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_option_ids, explanation_text, points, sequence_order)
               VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8)`,
              [quiz.id, q.questionText, q.questionType, JSON.stringify(q.options), JSON.stringify(q.correctOptionIds), q.explanationText, q.points, seq++]
            );
            counts.questions++;
          }
        }
      }

      if (item.kind === 'project') {
        await exec.query(
          `INSERT INTO assignments (content_item_id, rubric_criteria, max_score) VALUES ($1, $2::jsonb, $3)
           ON CONFLICT (content_item_id) DO UPDATE SET rubric_criteria = EXCLUDED.rubric_criteria, max_score = EXCLUDED.max_score, updated_at = now()`,
          [contentItemId, JSON.stringify(item.rubric), rubricMaxScore(item.rubric)]
        );
      }

      placements.push({ contentItemId, week: item.week, order: item.order, required: item.required, dueAfterDays: item.dueAfterDays });
    }

    for (const r of pack.reused) {
      const [row] = await exec.query('SELECT id, is_published FROM content_items WHERE program_id IS NULL AND slug = $1', [r.slug]);
      if (!row) {
        warnings.push(`week ${r.week}: reused item "${r.slug}" not found, not placed`);
        continue;
      }
      if (row.is_published !== true) {
        warnings.push(`week ${r.week}: reused item "${r.slug}" is not published, not placed`);
        continue;
      }
      placements.push({ contentItemId: String(row.id), week: r.week, order: r.order, required: r.required, dueAfterDays: r.dueAfterDays });
    }

    // 4. Placements
    for (const p of placements) {
      const weekStart = new Date(startsAt.getTime() + (p.week - 1) * 7 * DAY_MS);
      const due = p.dueAfterDays === null ? null : new Date(weekStart.getTime() + p.dueAfterDays * DAY_MS).toISOString();
      await exec.query(
        `INSERT INTO batch_curriculum (batch_id, content_item_id, week_number, sequence_order, is_required, available_from, due_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (batch_id, content_item_id) DO UPDATE SET week_number = EXCLUDED.week_number, sequence_order = EXCLUDED.sequence_order,
           is_required = EXCLUDED.is_required, available_from = EXCLUDED.available_from, due_at = EXCLUDED.due_at`,
        [batchId, p.contentItemId, p.week, p.order, p.required, weekStart.toISOString(), due]
      );
      counts.placed++;
    }
    const keep = placements.map((p) => p.contentItemId);
    const removed = await exec.query(
      'DELETE FROM batch_curriculum WHERE batch_id = $1 AND NOT (content_item_id = ANY($2::uuid[])) RETURNING id',
      [batchId, keep]
    );
    counts.removed = removed.length;

    await exec.query(dryRun ? 'ROLLBACK' : 'COMMIT');
    for (const w of warnings) console.warn(`[template] warning: ${w}`);
    console.log(
      `[template] ${dryRun ? 'dry run, rolled back' : 'committed'}: ${counts.created} created, ${counts.updated} updated, ` +
        `${counts.questions} questions written, ${counts.placed} placements, ${counts.removed} placements removed. batch=${batchId}`
    );
  } catch (error) {
    await exec.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await exec.close();
  }
}

main().catch((err) => {
  // Driver errors are not always Error instances; print message/code/detail without connection strings.
  const e = (err ?? {}) as { message?: unknown; code?: unknown; detail?: unknown };
  const text = [e.message ?? String(err), e.code, e.detail].filter((v) => v !== undefined && v !== null && v !== '').join(' | ');
  console.error(`template import failed: ${String(text).replace(/postgres(ql)?:\S+/g, '<redacted>')}`);
  process.exit(1);
});
