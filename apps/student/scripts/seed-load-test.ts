import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, asc, eq, inArray, like } from 'drizzle-orm';
import * as schema from '@rms/db/schema';
import { hashPassword } from '@rms/auth';
import { findRepoRoot, prepareSeedTarget } from '@rms/db/guard-env';

// ============================================================================
// Synthetic load-test accounts (tests/load). Test or development database only.
//
//   pnpm --filter @rms/student load:seed:test -- --count=200      create/refresh accounts + fixture file
//   pnpm --filter @rms/student load:cleanup:test                  delete every synthetic account (cascades)
//
// Accounts live on a reserved domain (RFC 2606 `.test`), so no real user or mailbox can match the cleanup
// filter. The password comes from LOAD_TEST_STUDENT_PASSWORD and is never printed or written to the fixture.
// Prerequisite: the demo dataset (`pnpm student:seed:test`), which provides the batches, content and quizzes.
// ============================================================================

export const LOAD_EMAIL_DOMAIN = 'loadtest.rms-careers.test';
export const LOAD_EMAIL_PREFIX = 'load-student-';
/** SQL LIKE filter matching only synthetic accounts. `_` and `%` are not part of the prefix or domain. */
export const LOAD_EMAIL_LIKE = `${LOAD_EMAIL_PREFIX}%@${LOAD_EMAIL_DOMAIN}`;
export const PRIMARY_BATCH_NAME = 'Alpha Cohort 2026';
export const FOREIGN_BATCH_NAME = 'Gamma Cohort 2026';
export const PRACTICE_QUIZ_SLUG = 'practice-quiz-data-structures-fundamentals';
export const FORMAL_QUIZ_SLUG = 'midterm-timed-assessment-algorithms';
export const MAX_ACCOUNTS = 2000;
export const DEFAULT_ACCOUNTS = 200;
export const DEFAULT_FIXTURE = path.join('tests', 'load', 'fixtures', 'students.local.json');

export interface LoadAccount {
  email: string;
  name: string;
  rollNumber: string;
}

export function loadAccount(index: number): LoadAccount {
  const n = String(index).padStart(4, '0');
  return { email: `${LOAD_EMAIL_PREFIX}${n}@${LOAD_EMAIL_DOMAIN}`, name: `Load Student ${n}`, rollNumber: `LT-${n}` };
}

export function isLoadAccountEmail(email: string): boolean {
  return new RegExp(`^${LOAD_EMAIL_PREFIX}\\d{4}@${LOAD_EMAIL_DOMAIN.replace(/\./g, '\\.')}$`).test(email);
}

/**
 * Cleanup gate: every row matched by the LIKE filter must be an exact synthetic address, or nothing is deleted.
 * Returns the ids to delete.
 */
export function selectCleanupIds(rows: Array<{ id: string; email: string }>): string[] {
  const unexpected = rows.filter((r) => !isLoadAccountEmail(r.email));
  if (unexpected.length > 0) {
    throw new Error(`Cleanup refused: ${unexpected.length} matched account(s) are not synthetic load-test addresses. Nothing was deleted.`);
  }
  return rows.map((r) => r.id);
}

export interface LoadSeedArgs {
  cleanup: boolean;
  count: number;
  out: string;
}

export function parseLoadSeedArgs(argv: readonly string[]): LoadSeedArgs {
  const value = (name: string) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const rawCount = value('count');
  const count = rawCount === undefined ? DEFAULT_ACCOUNTS : Number(rawCount);
  if (!Number.isInteger(count) || count < 1 || count > MAX_ACCOUNTS) {
    throw new Error(`--count must be an integer between 1 and ${MAX_ACCOUNTS}.`);
  }
  return { cleanup: argv.includes('--cleanup'), count, out: value('out') ?? DEFAULT_FIXTURE };
}

/** The password is required, never echoed, and must not be the public demo password. */
export function readLoadPassword(env: Record<string, string | undefined>): string {
  const password = env.LOAD_TEST_STUDENT_PASSWORD ?? '';
  if (password.length < 12) {
    throw new Error('Set LOAD_TEST_STUDENT_PASSWORD (at least 12 characters) in the environment. It is never printed.');
  }
  if (password === 'StudentDemo@2026!') throw new Error('LOAD_TEST_STUDENT_PASSWORD must differ from the demo seed password.');
  return password;
}

export interface QuizOption {
  id: string;
}

/** Fixture view of a question: ids only. Correct answers are never written to the fixture. */
export function toFixtureQuestion(row: { id: number; options: unknown }): { id: number; optionIds: string[] } {
  const options = Array.isArray(row.options) ? (row.options as QuizOption[]) : [];
  return { id: row.id, optionIds: options.map((o) => String(o?.id ?? '')).filter(Boolean) };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function run(): Promise<void> {
  const args = parseLoadSeedArgs(process.argv);
  const { target, url } = prepareSeedTarget();
  const db = drizzle(neon(url), { schema });

  if (args.cleanup) {
    // Select first and validate every match BEFORE deleting anything; then delete exactly those ids.
    const matched = await db
      .select({ id: schema.users.id, email: schema.users.email })
      .from(schema.users)
      .where(like(schema.users.email, LOAD_EMAIL_LIKE));
    const ids = selectCleanupIds(matched);
    let removed = 0;
    for (const group of chunk(ids, 200)) {
      const rows = await db.delete(schema.users).where(inArray(schema.users.id, group)).returning({ id: schema.users.id });
      removed += rows.length;
    }
    console.log(`[load-seed] target=${target}: removed ${removed} synthetic account(s) (cascaded).`);
    return;
  }

  const password = readLoadPassword(process.env);

  const batchRows = await db
    .select()
    .from(schema.batches)
    .where(inArray(schema.batches.name, [PRIMARY_BATCH_NAME, FOREIGN_BATCH_NAME]));
  const batch = batchRows.find((b) => b.name === PRIMARY_BATCH_NAME);
  const foreignBatch = batchRows.find((b) => b.name === FOREIGN_BATCH_NAME);
  if (!batch || !foreignBatch || !batch.collegeId) {
    throw new Error(`Demo batches not found. Run \`${target === 'test' ? 'pnpm student:seed:test' : 'pnpm student:seed'}\` first.`);
  }

  const passwordHash = await hashPassword(password);
  const accounts = Array.from({ length: args.count }, (_, i) => loadAccount(i + 1));

  for (const group of chunk(accounts, 100)) {
    const emails = group.map((a) => a.email);
    const existing = await db
      .select({ id: schema.users.id, email: schema.users.email })
      .from(schema.users)
      .where(inArray(schema.users.email, emails));
    const known = new Map(existing.map((u) => [u.email, u.id]));

    if (existing.length > 0) {
      await db
        .update(schema.users)
        .set({ passwordHash, status: 'active', updatedAt: new Date() })
        .where(inArray(schema.users.id, existing.map((u) => u.id)));
    }

    const fresh = group.filter((a) => !known.has(a.email));
    if (fresh.length > 0) {
      const inserted = await db
        .insert(schema.users)
        .values(fresh.map((a) => ({ email: a.email, name: a.name, passwordHash, status: 'active' as const, emailVerifiedAt: new Date() })))
        .returning({ id: schema.users.id, email: schema.users.email });
      for (const u of inserted) known.set(u.email, u.id);
    }

    const userIds = group.map((a) => known.get(a.email)!);
    await db
      .insert(schema.userRoles)
      .values(userIds.map((userId) => ({ userId, role: 'student' as const })))
      .onConflictDoNothing();

    await db
      .insert(schema.students)
      .values(group.map((a) => ({
        userId: known.get(a.email)!,
        collegeId: batch.collegeId,
        fullName: a.name,
        email: a.email,
        collegeRollNumber: a.rollNumber,
        branch: 'Load Testing',
        year: 3
      })))
      .onConflictDoNothing();

    const studentRows = await db
      .select({ id: schema.students.id })
      .from(schema.students)
      .where(inArray(schema.students.userId, userIds));
    const studentIds = studentRows.map((s) => s.id);

    const enrolled = await db
      .select({ studentId: schema.enrollments.studentId })
      .from(schema.enrollments)
      .where(and(inArray(schema.enrollments.studentId, studentIds), eq(schema.enrollments.batchId, batch.id)));
    const enrolledIds = new Set(enrolled.map((e) => e.studentId));
    const toEnroll = studentIds.filter((id) => !enrolledIds.has(id));
    if (toEnroll.length > 0) {
      await db
        .insert(schema.enrollments)
        .values(toEnroll.map((studentId) => ({ studentId, programId: batch.programId, batchId: batch.id, status: 'active' as const })));
    }

    await db
      .insert(schema.studentStats)
      .values(studentIds.map((studentId) => ({ studentId, collegeId: batch.collegeId })))
      .onConflictDoNothing();
  }

  // Content the journeys may open: the primary batch's published curriculum.
  const content = await db
    .select({ id: schema.contentItems.id, type: schema.contentItems.contentType, slug: schema.contentItems.slug })
    .from(schema.batchCurriculum)
    .innerJoin(schema.contentItems, eq(schema.contentItems.id, schema.batchCurriculum.contentItemId))
    .where(and(eq(schema.batchCurriculum.batchId, batch.id), eq(schema.contentItems.isPublished, true)))
    .orderBy(asc(schema.batchCurriculum.weekNumber), asc(schema.batchCurriculum.sequenceOrder));

  const quizFor = async (slug: string) => {
    const [quiz] = await db
      .select({ id: schema.quizzes.id })
      .from(schema.quizzes)
      .innerJoin(schema.contentItems, eq(schema.contentItems.id, schema.quizzes.contentItemId))
      .where(and(eq(schema.contentItems.slug, slug), eq(schema.contentItems.programId, batch.programId)))
      .limit(1);
    if (!quiz) return null;
    const questions = await db
      .select({ id: schema.quizQuestions.id, options: schema.quizQuestions.options })
      .from(schema.quizQuestions)
      .where(eq(schema.quizQuestions.quizId, quiz.id))
      .orderBy(asc(schema.quizQuestions.sequenceOrder));
    return { id: quiz.id, questions: questions.map(toFixtureQuestion) };
  };

  const fixture = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    target,
    note: 'Synthetic load-test fixture. Contains no passwords; the password is LOAD_TEST_STUDENT_PASSWORD.',
    accounts: accounts.map(({ email, name }) => ({ email, name })),
    batch: { id: batch.id, name: batch.name },
    foreignBatch: { id: foreignBatch.id },
    content: content.map((c) => ({ id: c.id, type: c.type, slug: c.slug })),
    practiceQuiz: await quizFor(PRACTICE_QUIZ_SLUG),
    formalQuiz: await quizFor(FORMAL_QUIZ_SLUG)
  };

  const outFile = path.resolve(findRepoRoot(), args.out);
  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(fixture, null, 2)}\n`);
  console.log(`[load-seed] target=${target}: ${accounts.length} synthetic account(s) ready in "${batch.name}".`);
  console.log(`[load-seed] fixture written to ${path.relative(findRepoRoot(), outFile)} (no secrets).`);
}

const isDirectExecution = process.argv[1]?.endsWith('seed-load-test.ts') || process.argv[1]?.endsWith('seed-load-test.js');

if (isDirectExecution) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      // Never print the error object wholesale: driver errors can embed the connection string.
      console.error(`[load-seed] FAILED: ${err instanceof Error ? err.message.replace(/postgres(ql)?:\/\/\S+/gi, '<redacted-url>') : 'unknown error'}`);
      process.exit(1);
    });
}
