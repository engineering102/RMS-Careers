import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBatchProgressSummary } from '../db/queries/progress';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn()
}));

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
let mockQuizAttempts: any[] = [];
let mockSubmissions: any[] = [];
let mockDsaProgress: any[] = [];

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
            const makeResult = (clause?: any) => {
              const strings = extractStrings(clause);
              const found = mockEnrollments.find((e) => strings.includes(e.batchId));
              const res = found ? [found] : mockEnrollments;
              const p = Promise.resolve(res);
              (p as any).limit = () => Promise.resolve(res);
              return p;
            };

            return {
              innerJoin: () => ({
                innerJoin: () => ({
                  where: (clause: any) => makeResult(clause)
                })
              }),
              where: (clause: any) => makeResult(clause)
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
                          contentType: ci.contentType,
                          metadata: ci.metadata,
                          isPublished: ci.isPublished
                        };
                      })
                      .sort((a, b) => {
                        if (a.weekNumber !== b.weekNumber) return a.weekNumber - b.weekNumber;
                        return a.sequenceOrder - b.sequenceOrder;
                      });

                    return Promise.resolve(items);
                  }
                })
              })
            };
          }

          // activities
          if (table === actual.activities) {
            return {
              where: () => Promise.resolve(mockActivities)
            };
          }

          // quizAttempts
          if (table === actual.quizAttempts) {
            return {
              innerJoin: () => ({
                where: () => Promise.resolve(mockQuizAttempts)
              })
            };
          }

          // assignmentSubmissions
          if (table === actual.assignmentSubmissions) {
            return {
              innerJoin: () => ({
                where: (clause: any) => {
                  const strings = extractStrings(clause);
                  const targetBatchId = mockBatches.find((b) => strings.includes(b.id))?.id;
                  const res = mockSubmissions.filter((s) => {
                    if (targetBatchId && s.batchId && s.batchId !== targetBatchId) return false;
                    return true;
                  });
                  return Promise.resolve(res);
                }
              })
            };
          }

          // studentDsaProgress
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

describe('Phase 4 — Slice 4: Unified Learning Progress Engine (getBatchProgressSummary)', () => {
  const studentId = 101;
  const batchIdAlpha = 'batch-uuid-alpha-101';
  const batchIdBeta = 'batch-uuid-beta-202';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';

    mockBatches = [
      { id: batchIdAlpha, name: 'Full-Stack 2026 Batch A' },
      { id: batchIdBeta, name: 'Systems Engineering Batch B' }
    ];

    mockEnrollments = [
      {
        enrollmentId: 1,
        studentId,
        batchId: batchIdAlpha,
        batchName: 'Full-Stack 2026 Batch A',
        status: 'active',
        enrollmentStatus: 'active'
      },
      {
        enrollmentId: 2,
        studentId,
        batchId: batchIdBeta,
        batchName: 'Systems Engineering Batch B',
        status: 'active',
        enrollmentStatus: 'active'
      }
    ];

    mockContentItems = [
      {
        id: 'lecture-01',
        title: 'React Server Components',
        slug: 'rsc-deep-dive',
        contentType: 'lecture',
        metadata: { durationMinutes: 45 },
        isPublished: true
      },
      {
        id: 'notes-01',
        title: 'Database Transactions Cheatsheet',
        slug: 'db-transactions',
        contentType: 'notes',
        metadata: {},
        isPublished: true
      },
      {
        id: 'quiz-01',
        title: 'TypeScript Generics Quiz',
        slug: 'ts-generics-quiz',
        contentType: 'quiz',
        metadata: {},
        isPublished: true
      },
      {
        id: 'project-01',
        title: 'Full-Stack SaaS Capstone',
        slug: 'saas-capstone',
        contentType: 'project',
        metadata: {},
        isPublished: true
      },
      {
        id: 'dsa-01',
        title: 'Two Pointers Pattern Sheet',
        slug: 'two-pointers-sheet',
        contentType: 'dsa_sheet',
        metadata: { slug: 'two-pointers' },
        isPublished: true
      }
    ];

    mockCurriculum = [
      {
        id: 1,
        batchId: batchIdAlpha,
        contentItemId: 'lecture-01',
        weekNumber: 1,
        sequenceOrder: 1,
        isRequired: true,
        availableFrom: new Date('2026-09-01'),
        dueAt: null
      },
      {
        id: 2,
        batchId: batchIdAlpha,
        contentItemId: 'notes-01',
        weekNumber: 1,
        sequenceOrder: 2,
        isRequired: false,
        availableFrom: new Date('2026-09-01'),
        dueAt: null
      },
      {
        id: 3,
        batchId: batchIdAlpha,
        contentItemId: 'quiz-01',
        weekNumber: 2,
        sequenceOrder: 1,
        isRequired: true,
        availableFrom: new Date('2026-09-08'),
        dueAt: new Date('2026-09-15')
      },
      {
        id: 4,
        batchId: batchIdAlpha,
        contentItemId: 'project-01',
        weekNumber: 2,
        sequenceOrder: 2,
        isRequired: true,
        availableFrom: new Date('2026-09-08'),
        dueAt: new Date('2026-09-20')
      },
      {
        id: 5,
        batchId: batchIdAlpha,
        contentItemId: 'dsa-01',
        weekNumber: 3,
        sequenceOrder: 1,
        isRequired: true,
        availableFrom: new Date('2026-09-15'),
        dueAt: null
      }
    ];

    mockActivities = [];
    mockQuizAttempts = [];
    mockSubmissions = [];
    mockDsaProgress = [];
  });

  it('rejects unauthorized batch access via anti-probing 404', async () => {
    mockEnrollments = [];

    await expect(getBatchProgressSummary(studentId, 'unauthorized-batch')).rejects.toThrow(
      'NEXT_NOT_FOUND'
    );
  });

  it('correctly marks lecture as completed when lecture_completed activity exists', async () => {
    mockActivities = [
      { referenceId: 'lecture-01', createdAt: new Date('2026-09-05') }
    ];

    const result = await getBatchProgressSummary(studentId, batchIdAlpha);

    expect(result.itemsMap['lecture-01'].status).toBe('completed');
    expect(result.itemsMap['lecture-01'].completedAt).toBeInstanceOf(Date);
    expect(result.itemsMap['notes-01'].status).toBe('not_started');
  });

  it('correctly marks notes/resource as completed when activity exists', async () => {
    mockActivities = [
      { referenceId: 'notes-01', createdAt: new Date('2026-09-06') }
    ];

    const result = await getBatchProgressSummary(studentId, batchIdAlpha);

    expect(result.itemsMap['notes-01'].status).toBe('completed');
  });

  it('correctly marks quiz as completed only when isPassed is true', async () => {
    mockQuizAttempts = [
      {
        contentItemId: 'quiz-01',
        isPassed: true,
        score: 85,
        maxScore: 100,
        submittedAt: new Date('2026-09-10')
      }
    ];

    const result = await getBatchProgressSummary(studentId, batchIdAlpha);

    expect(result.itemsMap['quiz-01'].status).toBe('completed');
    expect(result.itemsMap['quiz-01'].score).toBe(85);
    expect(result.itemsMap['quiz-01'].details?.isPassed).toBe(true);
  });

  it('marks quiz as in_progress when attempts exist but none passed', async () => {
    mockQuizAttempts = [
      {
        contentItemId: 'quiz-01',
        isPassed: false,
        score: 40,
        maxScore: 100,
        submittedAt: new Date('2026-09-10')
      }
    ];

    const result = await getBatchProgressSummary(studentId, batchIdAlpha);

    expect(result.itemsMap['quiz-01'].status).toBe('in_progress');
    expect(result.itemsMap['quiz-01'].score).toBe(40);
  });

  it('marks project as in_progress when status is submitted or under_review (NOT completed)', async () => {
    mockSubmissions = [
      {
        contentItemId: 'project-01',
        batchId: batchIdAlpha,
        status: 'submitted',
        score: null,
        submittedAt: new Date('2026-09-12')
      }
    ];

    const result = await getBatchProgressSummary(studentId, batchIdAlpha);

    expect(result.itemsMap['project-01'].status).toBe('in_progress');
    expect(result.completedRequiredItems).toBe(0);
  });

  it('marks project as needs_revision when tutor requests revisions', async () => {
    mockSubmissions = [
      {
        contentItemId: 'project-01',
        batchId: batchIdAlpha,
        status: 'resubmission_requested',
        score: null,
        submittedAt: new Date('2026-09-12'),
        reviewedAt: new Date('2026-09-13')
      }
    ];

    const result = await getBatchProgressSummary(studentId, batchIdAlpha);

    expect(result.itemsMap['project-01'].status).toBe('needs_revision');
    expect(result.itemsMap['project-01'].details?.submissionStatus).toBe('resubmission_requested');
  });

  it('marks project as completed strictly when status is approved', async () => {
    mockSubmissions = [
      {
        contentItemId: 'project-01',
        batchId: batchIdAlpha,
        status: 'approved',
        score: 95,
        submittedAt: new Date('2026-09-12'),
        reviewedAt: new Date('2026-09-14')
      }
    ];

    const result = await getBatchProgressSummary(studentId, batchIdAlpha);

    expect(result.itemsMap['project-01'].status).toBe('completed');
    expect(result.itemsMap['project-01'].score).toBe(95);
  });

  it('marks DSA sheet as completed when student_dsa_progress isCompleted is true', async () => {
    mockDsaProgress = [
      {
        problemSlug: 'two-pointers',
        isCompleted: true,
        completedAt: new Date('2026-09-16')
      }
    ];

    const result = await getBatchProgressSummary(studentId, batchIdAlpha);

    expect(result.itemsMap['dsa-01'].status).toBe('completed');
  });

  it('accurately calculates required items count and overall progress percentage', async () => {
    // 4 required items (lecture-01, quiz-01, project-01, dsa-01), 1 optional (notes-01)
    // Mark lecture-01 and quiz-01 completed -> 2 of 4 = 50%
    mockActivities = [{ referenceId: 'lecture-01', createdAt: new Date() }];
    mockQuizAttempts = [{ contentItemId: 'quiz-01', isPassed: true, score: 90, maxScore: 100 }];

    const result = await getBatchProgressSummary(studentId, batchIdAlpha);

    expect(result.totalRequiredItems).toBe(4);
    expect(result.completedRequiredItems).toBe(2);
    expect(result.overallPercentage).toBe(50);
  });

  it('groups progress summaries cleanly by week', async () => {
    mockActivities = [{ referenceId: 'lecture-01', createdAt: new Date() }];

    const result = await getBatchProgressSummary(studentId, batchIdAlpha);

    expect(result.weeks).toHaveLength(3);
    expect(result.weeks[0].weekNumber).toBe(1);
    expect(result.weeks[0].totalItems).toBe(2); // lecture-01 and notes-01
    expect(result.weeks[0].completedItems).toBe(1);
    expect(result.weeks[0].percentage).toBe(50);

    expect(result.weeks[1].weekNumber).toBe(2);
    expect(result.weeks[1].completedItems).toBe(0);
    expect(result.weeks[1].percentage).toBe(0);
  });

  it('enforces multi-batch isolation: project approved in Batch Alpha does NOT complete Batch Beta', async () => {
    // Assign project-01 to Batch Beta curriculum as well
    mockCurriculum.push({
      id: 10,
      batchId: batchIdBeta,
      contentItemId: 'project-01',
      weekNumber: 1,
      sequenceOrder: 1,
      isRequired: true,
      availableFrom: new Date('2026-09-01'),
      dueAt: null
    });

    // Student approved in Batch Alpha
    mockSubmissions = [
      {
        contentItemId: 'project-01',
        batchId: batchIdAlpha,
        status: 'approved',
        score: 100
      }
    ];

    // Query Batch Alpha
    const alphaResult = await getBatchProgressSummary(studentId, batchIdAlpha);
    expect(alphaResult.itemsMap['project-01'].status).toBe('completed');

    // Query Batch Beta -> project must NOT be completed
    const betaResult = await getBatchProgressSummary(studentId, batchIdBeta);
    expect(betaResult.itemsMap['project-01'].status).toBe('not_started');
  });

  it('demonstrates multi-batch sharing for lecture and DSA completions', async () => {
    // Assign lecture-01 to Batch Beta curriculum as well
    mockCurriculum.push({
      id: 11,
      batchId: batchIdBeta,
      contentItemId: 'lecture-01',
      weekNumber: 1,
      sequenceOrder: 1,
      isRequired: true,
      availableFrom: new Date('2026-09-01'),
      dueAt: null
    });

    // Student watched lecture-01 in Batch Alpha
    mockActivities = [{ referenceId: 'lecture-01', createdAt: new Date() }];

    const betaResult = await getBatchProgressSummary(studentId, batchIdBeta);
    expect(betaResult.itemsMap['lecture-01'].status).toBe('completed');
  });
});
