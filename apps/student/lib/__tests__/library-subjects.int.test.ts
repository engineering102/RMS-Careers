// INTEGRATION tier: runs only via `test:int` against the guarded TEST_DATABASE_URL (see setup-int.ts).
// The library classifies content into subjects inside SQL (a CASE over regular expressions, used in WHERE,
// GROUP BY and ORDER BY). Only a real PostgreSQL shows whether that expression parses, groups, and agrees with
// the JavaScript rules (resolveContentSubject); the unit tier mocks drizzle chains.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { db } from '@rms/db';
import * as schema from '@rms/db/schema';
import { resolveContentSubject } from '@rms/db/content-subjects';
import { eq, inArray } from 'drizzle-orm';
import { getLibraryItems, getLibrarySubjectCounts } from '@/lib/db/queries/library';

const FIXTURES: { title: string; metadata: Record<string, unknown>; expected: string }[] = [
  { title: 'Big-O in practice', metadata: { topic: 'Algorithms & Complexity' }, expected: 'dsa' },
  { title: 'Designing a URL shortener', metadata: { topic: 'System Design & Backend' }, expected: 'system-design' },
  { title: 'JavaScript closures', metadata: {}, expected: 'web-development' },
  { title: 'Java basics: classes', metadata: {}, expected: 'programming-fundamentals' },
  { title: 'C++ pointers', metadata: { topic: '' }, expected: 'programming-fundamentals' },
  { title: 'Git and GitHub in one hour', metadata: {}, expected: 'dev-tools' },
  { title: 'CI/CD pipelines', metadata: {}, expected: 'dev-tools' },
  { title: 'Normalisation', metadata: { category: 'DBMS' }, expected: 'core-cs' },
  { title: 'Two Sum walkthrough', metadata: { subject: 'career', topic: 'Arrays' }, expected: 'career' },
  { title: 'Digit street', metadata: { subject: 'astrology' }, expected: 'general' }
];

describe('library subject classification (live test database)', () => {
  const stamp = `${Date.now()}`.slice(-8);
  let collegeId: string;
  let programId: number;
  let studentId: number;
  const contentIds: string[] = [];

  beforeAll(async () => {
    const [college] = await db.insert(schema.colleges).values({ name: `LS ${stamp}`, code: `LS_${stamp}` }).returning();
    collegeId = college.id;
    const [program] = await db
      .insert(schema.programs)
      .values({ name: `LS P ${stamp}`, code: `LS_P_${stamp}`, collegeId, status: 'active' })
      .returning();
    programId = program.id;
    const [student] = await db
      .insert(schema.students)
      .values({ fullName: 'Library Subject Student', email: `ls_${stamp}@example.test`, collegeId })
      .returning();
    studentId = student.id;

    const rows = await db
      .insert(schema.contentItems)
      .values(
        FIXTURES.map((f, i) => ({
          title: f.title,
          slug: `ls-${stamp}-${i}`,
          contentType: 'lecture' as const,
          isPublished: true,
          programId,
          metadata: f.metadata
        }))
      )
      .returning();
    contentIds.push(...rows.map((r) => r.id));
  });

  afterAll(async () => {
    if (contentIds.length) await db.delete(schema.contentItems).where(inArray(schema.contentItems.id, contentIds));
    if (studentId) await db.delete(schema.students).where(eq(schema.students.id, studentId));
    if (programId) await db.delete(schema.programs).where(eq(schema.programs.id, programId));
    if (collegeId) await db.delete(schema.colleges).where(eq(schema.colleges.id, collegeId));
  });

  const scope = () => ({ enrolledProgramIds: [programId], enrolledBatchIds: [] as string[] });

  it('keeps the fixtures honest: the JavaScript rules give the expected subject', () => {
    for (const f of FIXTURES) {
      expect(resolveContentSubject({ ...f.metadata, title: f.title }), f.title).toBe(f.expected);
    }
  });

  it('counts items per subject in SQL exactly as the JavaScript rules classify them', async () => {
    const expected = new Map<string, number>();
    for (const f of FIXTURES) expected.set(f.expected, (expected.get(f.expected) ?? 0) + 1);

    const counts = await getLibrarySubjectCounts({ ...scope(), contentType: 'lecture' });

    expect(new Map(counts.map((c) => [c.subject, c.itemCount]))).toEqual(expected);
    // Display order, General last.
    expect(counts.map((c) => c.subject)).toEqual([
      'programming-fundamentals',
      'dsa',
      'system-design',
      'core-cs',
      'web-development',
      'dev-tools',
      'career',
      'general'
    ]);
  });

  it('filters the listing to one subject', async () => {
    const result = await getLibraryItems(studentId, {
      ...scope(),
      filters: { contentType: 'lecture', subject: 'dev-tools' }
    });

    expect(result.totalCount).toBe(2);
    expect(result.items.map((i) => i.title).sort()).toEqual(['CI/CD pipelines', 'Git and GitHub in one hour']);
    expect(result.items.every((i) => i.subject === 'dev-tools')).toBe(true);
  });

  it('orders a grouped listing subject by subject, each item carrying the subject SQL put it under', async () => {
    const result = await getLibraryItems(studentId, {
      ...scope(),
      filters: { contentType: 'lecture', groupBySubject: true, limit: 100 }
    });

    expect(result.totalCount).toBe(FIXTURES.length);
    const order = result.items.map((i) => i.subject);
    // Each subject appears as one consecutive run, so the page can print one heading per subject.
    const runs = order.filter((s, i) => i === 0 || s !== order[i - 1]);
    expect(runs).toEqual([
      'programming-fundamentals',
      'dsa',
      'system-design',
      'core-cs',
      'web-development',
      'dev-tools',
      'career',
      'general'
    ]);
  });
});
