import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getResumeLearningTarget, getNextCurriculumItem } from '../services/resume-learning';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn().mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND');
  })
}));

let mockEnrollments: any[] = [];
let mockBatches: any[] = [];
let mockCurriculum: any[] = [];
let mockContentItems: any[] = [];
let mockActivities: any[] = [];
let mockProgressSummary: any = null;

vi.mock('@/lib/db/queries/progress', () => ({
  getBatchProgressSummary: vi.fn().mockImplementation(() => {
    return Promise.resolve(mockProgressSummary);
  })
}));

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();

  return {
    ...actual,
    db: {
      select: () => ({
        from: (table: any) => {
          function extractStrings(obj: any, visited = new Set<any>()): string[] {
            if (!obj || typeof obj !== 'object' || visited.has(obj)) return [];
            visited.add(obj);
            const results: string[] = [];
            if (typeof obj.value === 'string') results.push(obj.value);
            if (Array.isArray(obj.queryChunks)) {
              for (const chunk of obj.queryChunks) {
                results.push(...extractStrings(chunk, visited));
              }
            }
            return results;
          }

          // enrollments
          if (table === actual.enrollments) {
            return {
              innerJoin: () => ({
                where: () => Promise.resolve(mockEnrollments)
              })
            };
          }

          // batchCurriculum
          if (table === actual.batchCurriculum) {
            return {
              innerJoin: () => ({
                where: (clause: any) => ({
                  orderBy: () => {
                    const strings = extractStrings(clause);
                    const targetBatchId = mockBatches.find((b) => strings.includes(b.id))?.id;
                    const items = mockCurriculum
                      .filter((c) => {
                        if (targetBatchId && c.batchId !== targetBatchId) return false;
                        const ci = mockContentItems.find((item) => item.id === c.contentItemId);
                        return ci && ci.isPublished;
                      })
                      .map((c) => {
                        const ci = mockContentItems.find((item) => item.id === c.contentItemId)!;
                        return {
                          ...c,
                          title: ci.title,
                          slug: ci.slug,
                          contentType: ci.contentType
                        };
                      })
                      .sort((a, b) => {
                        if (a.weekNumber !== b.weekNumber) return a.weekNumber - b.weekNumber;
                        return a.sequenceOrder - b.sequenceOrder;
                      });

                    return Promise.resolve(items);
                  }
                })
              }),
              where: () => ({
                orderBy: () => ({
                  limit: () => Promise.resolve([])
                })
              })
            };
          }

          // activities
          if (table === actual.activities) {
            return {
              where: () => ({
                orderBy: () => ({
                  limit: () => Promise.resolve(mockActivities)
                })
              })
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

describe('Phase 4 — Slice 4: Deterministic Resume Learning Service', () => {
  const studentId = 42;
  const batchId = 'batch-uuid-primary-001';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';

    mockBatches = [{ id: batchId, name: 'Web Dev Cohort 2026' }];

    mockEnrollments = [
      {
        batchId,
        batchName: 'Web Dev Cohort 2026',
        enrolledAt: new Date('2026-09-01'),
        startDate: new Date('2026-09-01')
      }
    ];

    mockContentItems = [
      {
        id: 'c-01',
        title: 'Week 1 Lesson 1: HTML & CSS',
        contentType: 'lecture',
        isPublished: true
      },
      {
        id: 'c-02',
        title: 'Week 1 Lesson 2: JavaScript Syntax',
        contentType: 'lecture',
        isPublished: true
      },
      {
        id: 'c-03',
        title: 'Week 2 Project: Interactive Portfolio',
        contentType: 'project',
        isPublished: true
      },
      {
        id: 'c-04',
        title: 'Week 2 Quiz: DOM & Events',
        contentType: 'quiz',
        isPublished: true
      },
      {
        id: 'c-05',
        title: 'Week 3 Future Lesson (Locked)',
        contentType: 'lecture',
        isPublished: true
      }
    ];

    mockCurriculum = [
      {
        id: 1,
        batchId,
        contentItemId: 'c-01',
        weekNumber: 1,
        sequenceOrder: 1,
        availableFrom: new Date('2026-09-01'),
        dueAt: null,
        isRequired: true
      },
      {
        id: 2,
        batchId,
        contentItemId: 'c-02',
        weekNumber: 1,
        sequenceOrder: 2,
        availableFrom: new Date('2026-09-01'),
        dueAt: new Date(Date.now() + 86400000 * 2), // 2 days in future
        isRequired: true
      },
      {
        id: 3,
        batchId,
        contentItemId: 'c-03',
        weekNumber: 2,
        sequenceOrder: 1,
        availableFrom: new Date('2026-09-01'),
        dueAt: new Date(Date.now() + 86400000 * 5),
        isRequired: true
      },
      {
        id: 4,
        batchId,
        contentItemId: 'c-04',
        weekNumber: 2,
        sequenceOrder: 2,
        availableFrom: new Date('2026-09-01'),
        dueAt: null,
        isRequired: true
      },
      {
        id: 5,
        batchId,
        contentItemId: 'c-05',
        weekNumber: 3,
        sequenceOrder: 1,
        availableFrom: new Date(Date.now() + 86400000 * 7), // Locked in future
        dueAt: null,
        isRequired: true
      }
    ];

    mockProgressSummary = {
      batchId,
      batchName: 'Web Dev Cohort 2026',
      totalRequiredItems: 4,
      completedRequiredItems: 0,
      overallPercentage: 0,
      weeks: [],
      itemsMap: {
        'c-01': { contentItemId: 'c-01', status: 'not_started' },
        'c-02': { contentItemId: 'c-02', status: 'not_started' },
        'c-03': { contentItemId: 'c-03', status: 'not_started' },
        'c-04': { contentItemId: 'c-04', status: 'not_started' },
        'c-05': { contentItemId: 'c-05', status: 'not_started' }
      }
    };
  });

  it('handles student with no active enrollments gracefully', async () => {
    mockEnrollments = [];

    const target = await getResumeLearningTarget(studentId);

    expect(target.hasTarget).toBe(false);
    expect(target.hasNoEnrollments).toBe(true);
  });

  it('selects Priority 1: needs_revision project first above all other incomplete items', async () => {
    // c-03 is marked needs_revision
    mockProgressSummary.itemsMap['c-03'] = {
      contentItemId: 'c-03',
      status: 'needs_revision'
    };

    const target = await getResumeLearningTarget(studentId);

    expect(target.hasTarget).toBe(true);
    expect(target.contentItemId).toBe('c-03');
    expect(target.contentTitle).toBe('Week 2 Project: Interactive Portfolio');
    expect(target.status).toBe('needs_revision');
    expect(target.reason).toBe('in_progress_resubmission');
  });

  it('selects Priority 2: earliest incomplete item with upcoming deadline', async () => {
    // c-01 has no dueAt, c-02 has dueAt in 2 days, c-03 has dueAt in 5 days
    // c-02 should be chosen due to earliest upcoming deadline
    const target = await getResumeLearningTarget(studentId);

    expect(target.hasTarget).toBe(true);
    expect(target.contentItemId).toBe('c-02');
    expect(target.reason).toBe('due_soon');
  });

  it('selects Priority 3: first sequential incomplete item when no deadlines or revisions pending', async () => {
    // Remove due dates from curriculum items
    mockCurriculum.forEach((c) => {
      c.dueAt = null;
    });

    const target = await getResumeLearningTarget(studentId);

    expect(target.hasTarget).toBe(true);
    expect(target.contentItemId).toBe('c-01');
    expect(target.weekNumber).toBe(1);
    expect(target.sequenceOrder).toBe(1);
    expect(target.reason).toBe('next_in_sequence');
  });

  it('strictly excludes locked items scheduled in the future', async () => {
    // Mark c-01, c-02, c-03, c-04 completed. Only c-05 is incomplete but it is locked in the future
    mockProgressSummary.itemsMap['c-01'].status = 'completed';
    mockProgressSummary.itemsMap['c-02'].status = 'completed';
    mockProgressSummary.itemsMap['c-03'].status = 'completed';
    mockProgressSummary.itemsMap['c-04'].status = 'completed';

    const target = await getResumeLearningTarget(studentId);

    expect(target.hasTarget).toBe(false);
    expect(target.isCaughtUp).toBe(true);
    expect(target.nextUnlockDate).toBeInstanceOf(Date);
  });

  it('returns curriculum-completed state when all items across all weeks are completed', async () => {
    // Remove the future locked item and mark everything completed
    mockCurriculum = mockCurriculum.filter((c) => c.contentItemId !== 'c-05');
    mockProgressSummary.itemsMap['c-01'].status = 'completed';
    mockProgressSummary.itemsMap['c-02'].status = 'completed';
    mockProgressSummary.itemsMap['c-03'].status = 'completed';
    mockProgressSummary.itemsMap['c-04'].status = 'completed';

    const target = await getResumeLearningTarget(studentId);

    expect(target.hasTarget).toBe(false);
    expect(target.isCurriculumCompleted).toBe(true);
    expect(target.completionPercentage).toBe(100);
  });

  describe('getNextCurriculumItem navigation resolver', () => {
    it('returns the next sequential unlocked curriculum item in a cohort', async () => {
      const nextItem = await getNextCurriculumItem(studentId, 'c-01', batchId);

      expect(nextItem).not.toBeNull();
      expect(nextItem?.contentItemId).toBe('c-02');
      expect(nextItem?.title).toBe('Week 1 Lesson 2: JavaScript Syntax');
    });

    it('returns null if the next item is locked in the future', async () => {
      // Next after c-04 is c-05 which is locked
      const nextItem = await getNextCurriculumItem(studentId, 'c-04', batchId);

      expect(nextItem).toBeNull();
    });

    it('returns null if the current item is the last item in the curriculum', async () => {
      const nextItem = await getNextCurriculumItem(studentId, 'c-05', batchId);

      expect(nextItem).toBeNull();
    });
  });
});
