import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBatchWorkspace } from '../db/queries/batch-workspace';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn()
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn().mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND');
  })
}));

// In-memory test store
let mockEnrollments: any[] = [];
let mockBatches: any[] = [];
let mockPrograms: any[] = [];
let mockColleges: any[] = [];
let mockCurriculum: any[] = [];
let mockContentItems: any[] = [];
let mockPassedQuizzes: any[] = [];
let mockSubmissions: any[] = [];
let mockDsaProgress: any[] = [];

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();

  return {
    ...actual,
    db: {
      select: (fields?: any) => ({
        from: (table: any) => {
          function extractStringsFromSql(obj: any, visited = new Set<any>()): string[] {
            if (!obj || typeof obj !== 'object' || visited.has(obj)) return [];
            visited.add(obj);
            const results: string[] = [];
            if (typeof obj.value === 'string') results.push(obj.value);
            if (Array.isArray(obj.queryChunks)) {
              for (const chunk of obj.queryChunks) {
                results.push(...extractStringsFromSql(chunk, visited));
              }
            }
            return results;
          }

          // If table is enrollments
          if (table === actual.enrollments) {
            const makeQueryResult = (clause?: any) => {
              const strings = extractStringsFromSql(clause);
              const targetBatch = mockEnrollments.find((e) => strings.includes(e.batchId));
              const list = targetBatch
                ? mockEnrollments.filter((e) => e.batchId === targetBatch.batchId)
                : mockEnrollments;
              const p = Promise.resolve(list);
              (p as any).limit = () => Promise.resolve(list);
              return p;
            };

            return {
              innerJoin: (t2: any, onClause2: any) => ({
                innerJoin: (t3: any, onClause3: any) => ({
                  where: (clause: any) => makeQueryResult(clause)
                })
              }),
              where: (clause: any) => makeQueryResult(clause)
            };
          }

          // If table is batches
          if (table === actual.batches) {
            return {
              innerJoin: (t2: any, onClause2: any) => ({
                leftJoin: (t3: any, onClause3: any) => ({
                  where: (clause: any) => ({
                    limit: () => {
                      const strings = extractStringsFromSql(clause);
                      const targetBatch = mockBatches.find((b) => strings.includes(b.id));
                      const filtered = targetBatch
                        ? mockBatches.filter((b) => b.id === targetBatch.id)
                        : mockBatches;
                      return Promise.resolve(filtered);
                    }
                  })
                })
              })
            };
          }

          // If table is batchCurriculum
          if (table === actual.batchCurriculum) {
            return {
              innerJoin: (t2: any, onClause2: any) => ({
                where: (clause: any) => ({
                  orderBy: () => {
                    const strings = extractStringsFromSql(clause);
                    const targetBatch = mockBatches.find((b) => strings.includes(b.id));

                    // Filter curriculum by published content items and targetBatch
                    const result = mockCurriculum
                      .filter((c) => {
                        if (targetBatch && c.batchId !== targetBatch.id) return false;
                        const content = mockContentItems.find((ci) => ci.id === c.contentItemId);
                        return content && content.isPublished;
                      })
                      .map((c) => {
                        const content = mockContentItems.find((ci) => ci.id === c.contentItemId)!;
                        return {
                          ...c,
                          title: content.title,
                          slug: content.slug,
                          contentType: content.contentType,
                          description: content.description,
                          metadata: content.metadata,
                          isPublished: content.isPublished
                        };
                      })
                      .sort((a, b) => {
                        if (a.weekNumber !== b.weekNumber) return a.weekNumber - b.weekNumber;
                        return a.sequenceOrder - b.sequenceOrder;
                      });

                    return Promise.resolve(result);
                  }
                })
              })
            };
          }

          // If table is quizAttempts
          if (table === actual.quizAttempts) {
            return {
              innerJoin: () => ({
                where: () => Promise.resolve(mockPassedQuizzes)
              })
            };
          }

          // If table is assignmentSubmissions
          if (table === actual.assignmentSubmissions) {
            return {
              innerJoin: () => ({
                where: () => Promise.resolve(mockSubmissions)
              })
            };
          }

          // If table is studentDsaProgress
          if (table === actual.studentDsaProgress) {
            return {
              where: () => Promise.resolve(mockDsaProgress)
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

describe('Slice 8: Student Batch Workspace & getBatchWorkspace', () => {
  const studentId = 42;
  const authorizedBatchId = 'batch-uuid-alpha-101';
  const unauthorizedBatchId = 'batch-uuid-secret-999';
  const programId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';

    mockPrograms = [{ id: programId, name: 'Fullstack Track', code: 'FSE' }];
    mockColleges = [{ id: 'col-01', name: 'Institute of Technology', code: 'IOT' }];

    mockBatches = [
      {
        id: authorizedBatchId,
        name: 'Alpha Cohort 2026',
        programId,
        programName: 'Fullstack Track',
        programCode: 'FSE',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-31'),
        collegeName: 'Institute of Technology'
      }
    ];

    mockEnrollments = [
      {
        enrollmentId: 1,
        studentId,
        batchId: authorizedBatchId,
        batchName: 'Alpha Cohort 2026',
        programId,
        programName: 'Fullstack Track',
        programCode: 'FSE',
        status: 'active',
        enrollmentStatus: 'active'
      }
    ];

    mockContentItems = [
      {
        id: 'content-01',
        title: 'Week 1 Lecture: Foundations',
        slug: 'week-1-lecture',
        contentType: 'lecture',
        description: 'Core web architecture overview.',
        metadata: { durationMinutes: 60, topic: 'Web' },
        isPublished: true
      },
      {
        id: 'content-02',
        title: 'Week 1 Quiz: Syntax Basics',
        slug: 'week-1-quiz',
        contentType: 'quiz',
        description: 'Verify your understanding of basic syntax.',
        metadata: { topic: 'Syntax' },
        isPublished: true
      },
      {
        id: 'content-03',
        title: 'Week 2 Project: Responsive Portfolio',
        slug: 'week-2-project',
        contentType: 'project',
        description: 'Build and deploy a responsive personal site.',
        metadata: { topic: 'Frontend' },
        isPublished: true
      },
      {
        id: 'content-04',
        title: 'Unpublished Draft Content',
        slug: 'draft-item',
        contentType: 'notes',
        description: 'Draft notes.',
        metadata: {},
        isPublished: false // NOT published
      }
    ];

    mockCurriculum = [
      {
        id: 1,
        batchId: authorizedBatchId,
        contentItemId: 'content-01',
        weekNumber: 1,
        sequenceOrder: 1,
        isRequired: true,
        availableFrom: new Date('2026-09-01'),
        dueAt: new Date(Date.now() + 86400000) // tomorrow
      },
      {
        id: 2,
        batchId: authorizedBatchId,
        contentItemId: 'content-02',
        weekNumber: 1,
        sequenceOrder: 2,
        isRequired: false, // Optional
        availableFrom: new Date('2026-09-01'),
        dueAt: new Date(Date.now() + 86400000 * 2)
      },
      {
        id: 3,
        batchId: authorizedBatchId,
        contentItemId: 'content-03',
        weekNumber: 2,
        sequenceOrder: 1,
        isRequired: true,
        availableFrom: new Date(Date.now() + 86400000 * 7), // next week (locked)
        dueAt: new Date(Date.now() + 86400000 * 14)
      },
      {
        id: 4,
        batchId: authorizedBatchId,
        contentItemId: 'content-04', // unpublished draft
        weekNumber: 2,
        sequenceOrder: 2,
        isRequired: true,
        availableFrom: new Date('2026-09-01'),
        dueAt: null
      }
    ];

    mockPassedQuizzes = [{ contentItemId: 'content-02' }];
    mockSubmissions = [];
    mockDsaProgress = [];
  });

  it('allows an authorized student to retrieve their batch workspace', async () => {
    const data = await getBatchWorkspace(studentId, authorizedBatchId);

    expect(data.batch.id).toBe(authorizedBatchId);
    expect(data.batch.name).toBe('Alpha Cohort 2026');
    expect(data.batch.programCode).toBe('FSE');
    expect(data.totalMilestones).toBe(3); // 3 published items
    expect(data.completedMilestones).toBe(1); // 1 completed quiz
    expect(data.overallProgressPercent).toBe(33);
  });

  it('rejects unauthorized batch access with notFound (404 anti-probing)', async () => {
    // When requesting unauthorizedBatchId, mockEnrollments for that check returns empty
    mockEnrollments = [];

    await expect(getBatchWorkspace(studentId, unauthorizedBatchId)).rejects.toThrow(
      'NEXT_NOT_FOUND'
    );
  });

  it('strictly excludes unpublished draft content from the batch curriculum', async () => {
    const data = await getBatchWorkspace(studentId, authorizedBatchId);

    const allTitles = data.weeks.flatMap((w) => w.items.map((i) => i.title));
    expect(allTitles).not.toContain('Unpublished Draft Content');
  });

  it('orders curriculum items deterministically by week and sequence order', async () => {
    const data = await getBatchWorkspace(studentId, authorizedBatchId);

    expect(data.weeks).toHaveLength(2);
    expect(data.weeks[0].weekNumber).toBe(1);
    expect(data.weeks[0].items[0].title).toBe('Week 1 Lecture: Foundations');
    expect(data.weeks[0].items[1].title).toBe('Week 1 Quiz: Syntax Basics');

    expect(data.weeks[1].weekNumber).toBe(2);
    expect(data.weeks[1].items[0].title).toBe('Week 2 Project: Responsive Portfolio');
  });

  it('accurately identifies completion status, locked status, and overdue flags', async () => {
    const data = await getBatchWorkspace(studentId, authorizedBatchId);

    const week1 = data.weeks[0];
    const quizItem = week1.items.find((i) => i.contentType === 'quiz')!;
    expect(quizItem.isCompleted).toBe(true);
    expect(quizItem.status).toBe('completed');

    const lectureItem = week1.items.find((i) => i.contentType === 'lecture')!;
    expect(lectureItem.isCompleted).toBe(false);
    expect(lectureItem.status).toBe('pending');

    const week2 = data.weeks[1];
    const projectItem = week2.items[0];
    // availableFrom is in the future
    expect(projectItem.isLocked).toBe(true);
    expect(projectItem.status).toBe('locked');
  });

  it('identifies overdue milestones when dueAt is past and item is not completed', async () => {
    // Add an overdue item (due yesterday)
    mockCurriculum.push({
      id: 5,
      batchId: authorizedBatchId,
      contentItemId: 'content-01',
      weekNumber: 1,
      sequenceOrder: 3,
      availableFrom: new Date('2026-09-01'),
      dueAt: new Date(Date.now() - 86400000) // yesterday
    });

    const data = await getBatchWorkspace(studentId, authorizedBatchId);
    const overdueItem = data.weeks[0].items.find((i) => i.id === 5)!;
    expect(overdueItem.isOverdue).toBe(true);
    expect(overdueItem.status).toBe('overdue');
  });

  it('exposes all active enrolled batches for the cohort switcher', async () => {
    mockEnrollments.push({
      enrollmentId: 2,
      studentId,
      batchId: 'batch-uuid-beta-202',
      batchName: 'Beta Cohort 2026',
      programId: 2,
      programName: 'Systems Track',
      programCode: 'SYS',
      status: 'active'
    });

    const data = await getBatchWorkspace(studentId, authorizedBatchId);
    expect(data.activeEnrolledBatches).toHaveLength(2);
    expect(data.activeEnrolledBatches.map((b) => b.batchName)).toContain('Beta Cohort 2026');
  });

  it('handles an authorized batch with zero published curriculum items cleanly', async () => {
    mockCurriculum = [];

    const data = await getBatchWorkspace(studentId, authorizedBatchId);

    expect(data.weeks).toEqual([]);
    expect(data.totalMilestones).toBe(0);
    expect(data.completedMilestones).toBe(0);
    expect(data.overallProgressPercent).toBe(0);
  });

  it('correctly exposes isRequired as true or false on each curriculum item', async () => {
    const data = await getBatchWorkspace(studentId, authorizedBatchId);

    const week1 = data.weeks[0];
    const lecture = week1.items.find((i) => i.contentType === 'lecture')!;
    const quiz = week1.items.find((i) => i.contentType === 'quiz')!;

    expect(lecture.isRequired).toBe(true);
    expect(quiz.isRequired).toBe(false);
  });

  it('supports completed batch enrollments in read-only mode', async () => {
    mockEnrollments[0].status = 'completed';
    mockEnrollments[0].enrollmentStatus = 'completed';

    const data = await getBatchWorkspace(studentId, authorizedBatchId);
    expect(data.isReadOnly).toBe(true);
    expect(data.enrollmentStatus).toBe('completed');
  });

  it('properly identifies and flags archived content items in curriculum', async () => {
    mockContentItems.push({
      id: 'content-archived',
      title: 'Legacy Python Overview',
      slug: 'legacy-python',
      contentType: 'notes',
      description: 'Historical notes.',
      metadata: { isArchived: true },
      isPublished: true
    });

    mockCurriculum.push({
      id: 99,
      batchId: authorizedBatchId,
      contentItemId: 'content-archived',
      weekNumber: 3,
      sequenceOrder: 1,
      isRequired: false,
      availableFrom: new Date('2026-09-01'),
      dueAt: null
    });

    const data = await getBatchWorkspace(studentId, authorizedBatchId);
    const week3 = data.weeks.find((w) => w.weekNumber === 3)!;
    const item = week3.items[0];

    expect(item.isArchived).toBe(true);
    expect(item.status).toBe('archived');
  });

  it('preserves multi-batch isolation so curriculum is scoped exclusively to the requested batch', async () => {
    const batchBetaId = 'batch-uuid-beta-202';
    mockEnrollments.push({
      enrollmentId: 2,
      studentId,
      batchId: batchBetaId,
      batchName: 'Beta Cohort 2026',
      programId: 2,
      programName: 'Systems Track',
      programCode: 'SYS',
      status: 'active',
      enrollmentStatus: 'active'
    });

    mockBatches.push({
      id: batchBetaId,
      name: 'Beta Cohort 2026',
      programId: 2,
      programName: 'Systems Track',
      programCode: 'SYS',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2027-02-28'),
      collegeName: 'Institute of Technology'
    });

    mockContentItems.push({
      id: 'content-systems-01',
      title: 'Operating Systems Kernel',
      slug: 'os-kernel',
      contentType: 'lecture',
      description: 'Kernel architectures.',
      metadata: {},
      isPublished: true
    });

    mockCurriculum.push({
      id: 101,
      batchId: batchBetaId,
      contentItemId: 'content-systems-01',
      weekNumber: 1,
      sequenceOrder: 1,
      isRequired: true,
      availableFrom: new Date('2026-10-01'),
      dueAt: null
    });

    // Request Alpha Batch
    const alphaData = await getBatchWorkspace(studentId, authorizedBatchId);
    const alphaTitles = alphaData.weeks.flatMap((w) => w.items.map((i) => i.title));
    expect(alphaTitles).not.toContain('Operating Systems Kernel');

    // Request Beta Batch
    const betaData = await getBatchWorkspace(studentId, batchBetaId);
    const betaTitles = betaData.weeks.flatMap((w) => w.items.map((i) => i.title));
    expect(betaTitles).toContain('Operating Systems Kernel');
    expect(betaTitles).not.toContain('Week 1 Lecture: Foundations');
  });

  it('handles missing student ID or unset POSTGRES_URL by calling notFound', async () => {
    delete process.env.POSTGRES_URL;

    await expect(getBatchWorkspace(0, authorizedBatchId)).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
