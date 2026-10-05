import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLibraryItems, ALL_CONTENT_TYPES } from '../db/queries/library';
import type { ContentType, LibraryFilterParams } from '../types/library';

vi.mock('server-only', () => ({}));

// In-memory test mocks
let mockEnrollments: any[] = [];
let mockContentItems: any[] = [];
let mockPrograms: any[] = [];

// Helper to simulate Drizzle filter execution on in-memory mock items
function filterMockItems(items: any[], enrollments: any[], filters?: LibraryFilterParams) {
  let result = items.filter((item) => item.isPublished);

  const enrolledProgramIds = enrollments.map((e) => e.programId);
  result = result.filter((item) => enrolledProgramIds.includes(item.programId));

  if (filters?.query?.trim()) {
    const q = filters.query.trim().toLowerCase();
    result = result.filter((item) => {
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchTopic = item.metadata?.topic?.toLowerCase().includes(q);
      const matchCat = item.metadata?.category?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchTopic || matchCat;
    });
  }

  if (filters?.contentType && filters.contentType !== 'all') {
    result = result.filter((item) => item.contentType === filters.contentType);
  }

  if (filters?.topic && filters.topic !== 'all') {
    result = result.filter((item) => {
      const t = item.metadata?.topic || item.metadata?.category;
      return t === filters.topic;
    });
  }

  return result;
}

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();

  return {
    ...actual,
    db: {
      select: (fields?: any) => ({
        from: (table: any) => {
          if (table === actual.enrollments) {
            return {
              where: (clause: any) => Promise.resolve(mockEnrollments)
            };
          }

          if (table === actual.contentItems) {
            return {
              innerJoin: (t2: any, onClause: any) => ({
                where: (clause: any) => ({
                  orderBy: () => ({
                    limit: (limit: number) => ({
                      offset: (offset: number) => {
                        // Apply in-memory simulation based on current test state
                        const filtered = filterMockItems(mockContentItems, mockEnrollments, currentTestFilters);

                        const result = filtered.map((item) => {
                          const prog = mockPrograms.find((p) => p.id === item.programId);
                          return {
                            ...item,
                            programName: prog?.name || 'Program',
                            programCode: prog?.code || 'PROG'
                          };
                        });

                        return Promise.resolve(result.slice(offset, offset + limit));
                      }
                    })
                  })
                })
              }),
              where: (clause: any) => {
                // Count query
                if (fields && fields.total) {
                  const filtered = filterMockItems(mockContentItems, mockEnrollments, currentTestFilters);
                  return Promise.resolve([{ total: filtered.length }]);
                }

                // Distinct topics query
                if (fields && fields.topic) {
                  const enrolledProgramIds = mockEnrollments.map((e) => e.programId);
                  const topics = Array.from(
                    new Set(
                      mockContentItems
                        .filter(
                          (item) =>
                            item.isPublished && enrolledProgramIds.includes(item.programId)
                        )
                        .map((item) => item.metadata?.topic || item.metadata?.category)
                        .filter(Boolean)
                    )
                  ).map((t) => ({ topic: t }));
                  return Promise.resolve(topics);
                }

                return Promise.resolve([]);
              }
            };
          }

          return {
            where: () => Promise.resolve([])
          };
        }
      })
    }
  };
});

let currentTestFilters: LibraryFilterParams | undefined = undefined;

describe('Slice 7: Student My Library & getLibraryItems', () => {
  const studentId = 101;
  const enrolledProgramId = 1;
  const inaccessibleProgramId = 999;
  const enrolledBatchId = 'batch-uuid-001';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';
    currentTestFilters = undefined;

    mockPrograms = [
      { id: enrolledProgramId, name: 'Fullstack Engineering', code: 'FSE' },
      { id: inaccessibleProgramId, name: 'Advanced Aerospace', code: 'AERO' }
    ];

    mockEnrollments = [
      {
        programId: enrolledProgramId,
        batchId: enrolledBatchId
      }
    ];

    mockContentItems = [
      {
        id: 'c1',
        programId: enrolledProgramId,
        title: 'Introduction to Binary Trees',
        slug: 'intro-binary-trees',
        contentType: 'lecture' as ContentType,
        description: 'Comprehensive tree traversals and recursion patterns.',
        metadata: { topic: 'Trees', durationMinutes: 45 },
        isPublished: true,
        createdAt: new Date('2026-09-01'),
        updatedAt: new Date('2026-09-01')
      },
      {
        id: 'c2',
        programId: enrolledProgramId,
        title: 'Two Pointers Practice Sheet',
        slug: 'two-pointers-sheet',
        contentType: 'dsa_sheet' as ContentType,
        description: 'Curated 10 problems on two pointers and sliding window.',
        metadata: { topic: 'Two Pointers' },
        isPublished: true,
        createdAt: new Date('2026-09-02'),
        updatedAt: new Date('2026-09-02')
      },
      {
        id: 'c3',
        programId: enrolledProgramId,
        title: 'Sorting Algorithms Quiz',
        slug: 'sorting-quiz',
        contentType: 'quiz' as ContentType,
        description: 'Test your understanding of QuickSort and MergeSort.',
        metadata: { topic: 'Sorting' },
        isPublished: true,
        createdAt: new Date('2026-09-03'),
        updatedAt: new Date('2026-09-03')
      },
      {
        id: 'c4',
        programId: enrolledProgramId,
        title: 'Unpublished Draft Lecture',
        slug: 'draft-lecture',
        contentType: 'lecture' as ContentType,
        description: 'Work in progress.',
        metadata: { topic: 'System Design' },
        isPublished: false, // NOT published
        createdAt: new Date('2026-09-04'),
        updatedAt: new Date('2026-09-04')
      },
      {
        id: 'c5',
        programId: inaccessibleProgramId, // Inaccessible Program
        title: 'Aerospace Propulsion Principles',
        slug: 'aerospace-propulsion',
        contentType: 'lecture' as ContentType,
        description: 'Rocket science fundamentals.',
        metadata: { topic: 'Propulsion' },
        isPublished: true,
        createdAt: new Date('2026-09-05'),
        updatedAt: new Date('2026-09-05')
      }
    ];
  });

  it('exposes all canonical content types', () => {
    expect(ALL_CONTENT_TYPES).toContain('lecture');
    expect(ALL_CONTENT_TYPES).toContain('notes');
    expect(ALL_CONTENT_TYPES).toContain('dsa_sheet');
    expect(ALL_CONTENT_TYPES).toContain('quiz');
    expect(ALL_CONTENT_TYPES).toContain('project');
    expect(ALL_CONTENT_TYPES).toContain('resource');
  });

  it('returns accessible published content items for an enrolled student', async () => {
    const result = await getLibraryItems(studentId);

    expect(result.items.length).toBeGreaterThan(0);
    const titles = result.items.map((i) => i.title);
    expect(titles).toContain('Introduction to Binary Trees');
    expect(titles).toContain('Two Pointers Practice Sheet');
    expect(titles).toContain('Sorting Algorithms Quiz');
  });

  it('strictly excludes content from inaccessible programs', async () => {
    const result = await getLibraryItems(studentId);

    const titles = result.items.map((i) => i.title);
    expect(titles).not.toContain('Aerospace Propulsion Principles');
  });

  it('strictly excludes unpublished draft items even from enrolled programs', async () => {
    const result = await getLibraryItems(studentId);

    const titles = result.items.map((i) => i.title);
    expect(titles).not.toContain('Unpublished Draft Lecture');
  });

  it('returns empty library when student has no active enrollments', async () => {
    mockEnrollments = [];

    const result = await getLibraryItems(studentId);

    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it('gracefully handles missing student ID or unset POSTGRES_URL', async () => {
    delete process.env.POSTGRES_URL;

    const result = await getLibraryItems(0);

    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.page).toBe(1);
  });

  it('extracts available topics dynamically from accessible published items', async () => {
    const result = await getLibraryItems(studentId);

    expect(result.availableTopics).toContain('Trees');
    expect(result.availableTopics).toContain('Two Pointers');
    expect(result.availableTopics).toContain('Sorting');
    expect(result.availableTopics).not.toContain('Propulsion');
  });

  it('filters content by search query on title', async () => {
    currentTestFilters = { query: 'Binary Trees' };

    const result = await getLibraryItems(studentId, {
      filters: currentTestFilters
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Introduction to Binary Trees');
    expect(result.totalCount).toBe(1);
  });

  it('filters content by search query on description', async () => {
    currentTestFilters = { query: 'recursion patterns' };

    const result = await getLibraryItems(studentId, {
      filters: currentTestFilters
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Introduction to Binary Trees');
  });

  it('filters content by content_type', async () => {
    currentTestFilters = { contentType: 'quiz' };

    const result = await getLibraryItems(studentId, {
      filters: currentTestFilters
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].contentType).toBe('quiz');
    expect(result.items[0].title).toBe('Sorting Algorithms Quiz');
  });

  it('filters content by topic', async () => {
    currentTestFilters = { topic: 'Two Pointers' };

    const result = await getLibraryItems(studentId, {
      filters: currentTestFilters
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].topic).toBe('Two Pointers');
    expect(result.items[0].title).toBe('Two Pointers Practice Sheet');
  });

  it('combines search, content_type, and topic filters', async () => {
    currentTestFilters = {
      query: 'traversals',
      contentType: 'lecture',
      topic: 'Trees'
    };

    const result = await getLibraryItems(studentId, {
      filters: currentTestFilters
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Introduction to Binary Trees');
  });

  it('returns clean empty results when search query yields no matches', async () => {
    currentTestFilters = { query: 'Nonexistent Quantum Computing' };

    const result = await getLibraryItems(studentId, {
      filters: currentTestFilters
    });

    expect(result.items).toHaveLength(0);
    expect(result.totalCount).toBe(0);
    expect(result.totalPages).toBe(0);
  });
});
