import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { getLibraryCatalog, LIBRARY_CATALOG_LIMIT } from '../db/queries/library';

vi.mock('server-only', () => ({}));

/**
 * The whole Library is one query whose rows are sent to the browser, so this suite pins down two things:
 *
 * 1. What is listed. Published content an admin opted into the Library, never external tests, that is global
 *    (no program) or belongs to an enrolled program. Being scheduled in a batch does NOT list content: the
 *    curriculum is the batch's own. content_items.program_id is nullable, so programs must be LEFT joined. The db
 *    mock renders the REAL where-clause with the Postgres dialect, derives the enrolled program ids from the bound
 *    params, and refuses to list anything unless the clause tests the opt-in flag. The SQL itself (flag, audience,
 *    release lock) runs for real in library-catalog.int.test.ts.
 * 2. Payload. Only card-sized fields are selected; the metadata blob (notes bodies, links) never leaves the server.
 */

interface Row {
  id: string;
  programId: number | null;
  title: string;
  isPublished: boolean;
  /** metadata.inLibrary; rows are opted in unless a test says otherwise. */
  inLibrary?: boolean;
  contentType?: string;
  description?: string | null;
  topic?: string | null;
  category?: string | null;
  subject?: string | null;
  durationMinutes?: string | null;
  difficulty?: string | null;
  provider?: string | null;
  videoId?: string | null;
  videoUrl?: string | null;
}

const PROGRAM_ID = 16;
const OTHER_PROGRAM_ID = 999;
const MY_BATCH = 'batch-mine';
const OTHER_BATCH = 'batch-other';

const dialect = new PgDialect();
let rows: Row[] = [];
let curriculum: { batchId: string; contentItemId: string }[] = [];
let whereSql = '';
let whereParams: unknown[] = [];
let selectedFields: string[] = [];
let joinKinds: string[] = [];
let limitSeen: number | null = null;
let queryCount = 0;

function accessible(where: SQL): Row[] {
  const { sql, params } = dialect.sqlToQuery(where);
  whereSql = sql;
  whereParams = params;
  const programIds = params.filter((p): p is number => typeof p === 'number');
  const testsFlag = sql.includes(`->>'inLibrary') = 'true'`);
  const allowsGlobal = sql.includes('"program_id" is null');
  return rows.filter(
    (r) =>
      r.isPublished &&
      r.contentType !== 'external_test' &&
      (testsFlag ? r.inLibrary !== false : true) &&
      ((r.programId === null && allowsGlobal) || (r.programId !== null && programIds.includes(r.programId)))
  );
}

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();
  return {
    ...actual,
    db: {
      select: (fields: Record<string, unknown>) => {
        queryCount += 1;
        selectedFields = Object.keys(fields);
        return {
          from: () => ({
            // Only leftJoin exists: an innerJoin would throw and the catalog would come back empty.
            leftJoin: () => {
              joinKinds.push('left');
              return {
                where: (clause: SQL) => ({
                  orderBy: () => ({
                    limit: (n: number) => {
                      limitSeen = n;
                      return Promise.resolve(
                        accessible(clause).map((r) => ({
                          id: r.id,
                          title: r.title,
                          slug: r.id,
                          contentType: r.contentType ?? 'lecture',
                          description: r.description ?? null,
                          topic: r.topic ?? null,
                          category: r.category ?? null,
                          subject: r.subject ?? null,
                          durationMinutes: r.durationMinutes ?? null,
                          difficulty: r.difficulty ?? null,
                          provider: r.provider ?? null,
                          videoId: r.videoId ?? null,
                          videoUrl: r.videoUrl ?? null,
                          programCode: r.programId === PROGRAM_ID ? 'CRP' : null
                        }))
                      );
                    }
                  })
                })
              };
            }
          })
        };
      }
    }
  };
});

const run = (programIds = [PROGRAM_ID], batchIds = [MY_BATCH]) =>
  getLibraryCatalog({ enrolledProgramIds: programIds, enrolledBatchIds: batchIds });

describe('getLibraryCatalog', () => {
  beforeEach(() => {
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';
    whereSql = '';
    whereParams = [];
    selectedFields = [];
    joinKinds = [];
    limitSeen = null;
    queryCount = 0;
    rows = [
      { id: 'global-library', programId: null, title: 'Global, in the Library', isPublished: true },
      { id: 'global-scheduled', programId: null, title: 'Global, only scheduled in my batch', isPublished: true, inLibrary: false },
      { id: 'global-draft', programId: null, title: 'Global draft, in the Library', isPublished: false },
      { id: 'mine-library', programId: PROGRAM_ID, title: 'My program, in the Library', isPublished: true },
      { id: 'mine-curriculum', programId: PROGRAM_ID, title: 'My program, not in the Library', isPublished: true, inLibrary: false },
      { id: 'mine-draft', programId: PROGRAM_ID, title: 'Draft in my program', isPublished: false },
      { id: 'other-library', programId: OTHER_PROGRAM_ID, title: 'Another program, in the Library', isPublished: true },
      { id: 'ext-test', programId: PROGRAM_ID, title: 'External test', isPublished: true, contentType: 'external_test' }
    ];
    curriculum = [{ batchId: MY_BATCH, contentItemId: 'global-scheduled' }];
  });

  it('lists only published content opted into the Library, global or of an enrolled program', async () => {
    const items = await run();
    expect(items.map((i) => i.id).sort()).toEqual(['global-library', 'mine-library']);
  });

  it('does not list content merely because a batch schedules it', async () => {
    const ids = (await run()).map((i) => i.id);
    expect(ids).not.toContain('global-scheduled');
    expect(ids).not.toContain('mine-curriculum');
  });

  it('builds a where-clause that enforces publication, the opt-in flag, no external tests, and the audience', async () => {
    await run();
    expect(whereSql).toContain('"is_published"');
    expect(whereSql).toContain('"content_type" <>');
    expect(whereSql).toContain(`->>'inLibrary') = 'true'`);
    expect(whereSql).toContain('"program_id" is null');
    expect(whereParams).toEqual(expect.arrayContaining(['external_test', PROGRAM_ID]));
    expect(whereParams).not.toContain(OTHER_PROGRAM_ID);
    // The student's batches are consulted only to hide content a batch has not released yet.
    expect(whereSql).toContain('"available_from"');
    expect(whereParams).toContain(MY_BATCH);
    expect(whereParams).not.toContain(OTHER_BATCH);
  });

  it('shares global Library content with a student enrolled only through a batch', async () => {
    expect((await run([], [MY_BATCH])).map((i) => i.id)).toEqual(['global-library']);
  });

  it('left-joins programs and labels program-less content with the default code', async () => {
    const items = await run();
    expect(joinKinds).toEqual(['left']);
    expect(items.find((i) => i.id === 'global-library')?.programCode).toBe('RMS');
    expect(items.find((i) => i.id === 'mine-library')?.programCode).toBe('CRP');
  });

  it('is a single bounded query', async () => {
    await run();
    expect(queryCount).toBe(1);
    expect(limitSeen).toBe(LIBRARY_CATALOG_LIMIT);
  });

  it('runs no query without enrollments or without a database', async () => {
    expect(await run([], [])).toEqual([]);
    delete process.env.POSTGRES_URL;
    expect(await run()).toEqual([]);
    expect(queryCount).toBe(0);
  });

  it('selects card fields only: the metadata blob is never fetched or returned', async () => {
    const [item] = await run([PROGRAM_ID], []);
    expect(selectedFields).not.toContain('metadata');
    expect(Object.keys(item).sort()).toEqual(
      [
        'contentType',
        'description',
        'difficulty',
        'durationMinutes',
        'id',
        'programCode',
        'slug',
        'subject',
        'thumbnailUrl',
        'title',
        'topic'
      ].sort()
    );
  });

  it('resolves the subject, falls back from topic to category, and cleans loose metadata', async () => {
    rows = [
      {
        id: 'a',
        programId: PROGRAM_ID,
        title: 'URL shortener',
        isPublished: true,
        category: 'System Design',
        durationMinutes: '45',
        difficulty: 'advanced',
        description: '  Scaling reads.  '
      },
      {
        id: 'b',
        programId: PROGRAM_ID,
        title: 'Two Sum walkthrough',
        isPublished: true,
        topic: 'Arrays',
        subject: 'career',
        durationMinutes: 'soon',
        difficulty: 'impossible',
        description: '   '
      },
      { id: 'c', programId: PROGRAM_ID, title: 'Welcome', isPublished: true, durationMinutes: '0' }
    ];
    const byId = Object.fromEntries((await run([PROGRAM_ID], [])).map((i) => [i.id, i]));

    expect(byId.a).toMatchObject({
      subject: 'system-design',
      topic: 'System Design',
      durationMinutes: 45,
      difficulty: 'advanced',
      description: 'Scaling reads.'
    });
    // An admin's explicit subject wins over what the topic suggests; junk metadata becomes null.
    expect(byId.b).toMatchObject({
      subject: 'career',
      topic: 'Arrays',
      durationMinutes: null,
      difficulty: null,
      description: null
    });
    expect(byId.c).toMatchObject({ subject: 'general', topic: null, durationMinutes: null });
  });

  it('gives YouTube lectures a thumbnail, from the saved id or an older pasted link, and nothing else one', async () => {
    rows = [
      { id: 'yt', programId: PROGRAM_ID, title: 'A', isPublished: true, provider: 'youtube', videoId: 'dQw4w9WgXcQ' },
      { id: 'link', programId: PROGRAM_ID, title: 'B', isPublished: true, videoUrl: 'https://youtu.be/dQw4w9WgXcQ' },
      { id: 'vimeo', programId: PROGRAM_ID, title: 'C', isPublished: true, provider: 'vimeo', videoId: '76979871' },
      {
        id: 'notes',
        programId: PROGRAM_ID,
        title: 'D',
        isPublished: true,
        contentType: 'notes',
        provider: 'youtube',
        videoId: 'dQw4w9WgXcQ'
      }
    ];
    const byId = Object.fromEntries((await run([PROGRAM_ID], [])).map((i) => [i.id, i]));
    const still = 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg';
    expect(byId.yt.thumbnailUrl).toBe(still);
    expect(byId.link.thumbnailUrl).toBe(still);
    expect(byId.vimeo.thumbnailUrl).toBeNull();
    expect(byId.notes.thumbnailUrl).toBeNull();
  });
});
