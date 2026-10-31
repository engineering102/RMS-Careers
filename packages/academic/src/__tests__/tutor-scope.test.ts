import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/pg-proxy';

vi.mock('server-only', () => ({}));

import * as schema from '@rms/db/schema';
import type { DbClient } from '@rms/db';
import { tutorScope, type AcademicScope } from '../scope';
import { decodeQueueCursor, encodeQueueCursor, getReviewQueue, getReviewQueueCounts, getReviewSubmission } from '../tutor/review-queue';
import { getTutorOverviewMetrics } from '../tutor/overview';
import { getBatchLiveSessions, getPublishedLiveSessions } from '../tutor/live';
import { getBatchRoster, getRosterStudent } from '../tutor/roster';
import { getQuizParticipation } from '../tutor/assessments';
import { getBatchProgress, loadBatchCurriculum, loadCompletionSources } from '../tutor/progress';

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SUB = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

/** A real Drizzle client whose driver records every statement and returns no rows (T-01). */
function capturingClient() {
  const statements: { sql: string; params: unknown[] }[] = [];
  const client = drizzle(
    async (sql, params) => {
      statements.push({ sql, params });
      return { rows: [] };
    },
    { schema }
  ) as unknown as DbClient;
  return { client, statements };
}

const untouchable = new Proxy({} as DbClient, {
  get(_target, prop) {
    throw new Error(`database touched (${String(prop)}) for an out-of-scope batch`);
  }
});

describe('cross-batch queries carry the scope predicate (T-01)', () => {
  const scope = tutorScope([A]);
  const scoped = (statements: { sql: string; params: unknown[] }[], column: string) => {
    expect(statements.length).toBeGreaterThan(0);
    for (const s of statements) {
      expect(s.sql).toContain(`${column} in ($`);
      expect(s.params).toContain(A);
      expect(s.params).not.toContain(B);
    }
  };

  it('review queue, counts and detail', async () => {
    const { client, statements } = capturingClient();
    await getReviewQueue(client, scope, { search: 'x' });
    await getReviewQueueCounts(client, scope, {});
    await getReviewSubmission(client, scope, SUB);
    scoped(statements, '"assignment_submissions"."batch_id"');
  });

  it('overview metrics', async () => {
    const { client, statements } = capturingClient();
    await getTutorOverviewMetrics(client, scope, 'user-1');
    scoped(statements, '"assignment_submissions"."batch_id"');
  });

  it('published live sessions', async () => {
    const { client, statements } = capturingClient();
    await getPublishedLiveSessions(client, scope);
    scoped(statements, '"batch_live_sessions"."batch_id"');
  });

  it('an empty tutor scope matches nothing', async () => {
    const { client, statements } = capturingClient();
    await getReviewQueue(client, tutorScope([]));
    await getTutorOverviewMetrics(client, tutorScope([]), 'user-1');
    for (const s of statements) expect(s.sql).toContain('false');
  });

  it('escapes LIKE wildcards in the search', async () => {
    const { client, statements } = capturingClient();
    await getReviewQueue(client, scope, { search: '50%_a\\b' });
    expect(statements[0].params).toContain('%50\\%\\_a\\\\b%');
  });

  it('pages by (submitted_at, id) after a valid cursor only', async () => {
    const { client, statements } = capturingClient();
    await getReviewQueue(client, scope, {}, encodeQueueCursor('2026-10-29 10:15:42.123456+00', SUB));
    expect(statements[0].sql).toContain('("assignment_submissions"."submitted_at", "assignment_submissions"."id") > (');
    await getReviewQueue(client, scope, {}, 'garbage');
    expect(statements[1].sql).not.toContain('> (');
  });
});

describe('batch queries refuse batches outside the scope without touching the database', () => {
  const scope = tutorScope([A]);

  it.each([
    ['roster', () => getBatchRoster(untouchable, scope, B), null],
    ['roster student', () => getRosterStudent(untouchable, scope, B, 1), null],
    ['quiz participation', () => getQuizParticipation(untouchable, scope, B, SUB), null],
    ['live sessions', () => getBatchLiveSessions(untouchable, scope, B), []],
    ['curriculum', () => loadBatchCurriculum(untouchable, scope, B), []],
    ['queue with a foreign batch filter', () => getReviewQueue(untouchable, scope, { batchId: B }), { rows: [], nextCursor: null }]
  ])('%s', async (_label, run, expected) => {
    await expect(run()).resolves.toEqual(expected);
  });

  it('completion sources and progress', async () => {
    await expect(loadCompletionSources(untouchable, scope, B, [], [1])).resolves.toEqual({ lectures: [], quizAttempts: [], projects: [], dsa: [], external: [] });
    const result = await getBatchProgress(untouchable, scope, B, [1]);
    expect(result.curriculum).toEqual([]);
  });

  it('a malformed submission id is not found without a query', async () => {
    await expect(getReviewSubmission(untouchable, scope, 'not-a-uuid')).resolves.toBeNull();
  });

  it('throws for a forged scope', async () => {
    const forged = { kind: 'all' } as AcademicScope;
    await expect(getReviewQueue(untouchable, forged)).rejects.toThrow(/invalid scope/);
    await expect(getBatchRoster(untouchable, forged, A)).rejects.toThrow(/invalid scope/);
  });
});

describe('queue cursor', () => {
  it('round-trips and rejects anything it did not issue', () => {
    const cursor = encodeQueueCursor('2026-10-29 10:15:42.123456+00', SUB);
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeQueueCursor(cursor)).toEqual({ submittedAt: '2026-10-29 10:15:42.123456+00', id: SUB });
    for (const bad of [null, '', 'x', btoa('[1,2]'), encodeQueueCursor("2026-10-29'; drop", SUB), encodeQueueCursor('2026-10-29 10:15:42+00', 'nope'), 'a'.repeat(500)]) {
      expect(decodeQueueCursor(bad)).toBeNull();
    }
  });
});

describe('tutor module boundaries', () => {
  const dir = path.resolve(__dirname, '../tutor');
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts'));

  it.each(files)('%s reads no environment, imports no global db or app code, and never selects private columns', (file) => {
    const source = readFileSync(path.join(dir, file), 'utf8');
    expect(source).not.toMatch(/process\.env/);
    expect(source).not.toMatch(/import\s*\{[^}]*\bdb\b[^}]*\}\s*from\s*'@rms\/db'/);
    expect(source).not.toMatch(/from\s*'(@\/|[^']*apps\/)/);
    expect(source).not.toMatch(/\badminScope\b/);
    // T-19: student contact/profile fields and assessment internals stay out of tutor queries.
    expect(source).not.toMatch(/students\.(phone|githubUrl|linkedinUrl|portfolioUrl|targetCompanies|primaryLanguage)\b/);
    expect(source).not.toMatch(/quizAttempts\.responses|correctOptionIds|quizQuestions/);
  });
});
