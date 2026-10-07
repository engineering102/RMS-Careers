import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContentItem } from '../db/queries/content';
import { markLectureWatched } from '../actions/content';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth()
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn().mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
}));

// In-memory test store
let mockUsers: any[] = [];
let mockUserRoles: any[] = [];
let mockStudents: any[] = [];
let mockEnrollments: any[] = [];
let mockBatches: any[] = [];
let mockPrograms: any[] = [];
let mockCurriculum: any[] = [];
let mockContentItems: any[] = [];
let mockActivities: any[] = [];

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();

  return {
    ...actual,
    db: {
      select: (fields?: any) => ({
        from: (table: any) => {
          // If table is users
          if (table === actual.users) {
            return {
              where: (clause: any) => ({
                limit: () => Promise.resolve(mockUsers)
              })
            };
          }

          // If table is userRoles
          if (table === actual.userRoles) {
            return {
              where: (clause: any) => Promise.resolve(mockUserRoles)
            };
          }

          // If table is students
          if (table === actual.students) {
            return {
              leftJoin: () => ({
                where: (clause: any) => ({
                  limit: () => Promise.resolve(mockStudents)
                })
              })
            };
          }

          // If table is enrollments
          if (table === actual.enrollments) {
            const makeQueryResult = () => {
              const p = Promise.resolve(mockEnrollments);
              (p as any).limit = () => Promise.resolve(mockEnrollments);
              return p;
            };

            return {
              innerJoin: (t2: any, onClause2: any) => ({
                leftJoin: (t3: any, onClause3: any) => ({
                  where: (clause: any) => makeQueryResult()
                }),
                innerJoin: (t3: any, onClause3: any) => ({
                  where: (clause: any) => makeQueryResult()
                })
              }),
              where: (clause: any) => makeQueryResult()
            };
          }

          // If table is batches
          if (table === actual.batches) {
            return {
              where: (clause: any) => ({
                limit: () => Promise.resolve(mockBatches)
              })
            };
          }

          // If table is activities
          if (table === actual.activities) {
            return {
              where: (clause: any) => ({
                limit: () => {
                  return Promise.resolve(mockActivities);
                }
              })
            };
          }

          // If table is contentItems
          if (table === actual.contentItems) {
            const joinHandler = () => ({
              where: (clause: any) => ({
                limit: () => {
                  return Promise.resolve(mockContentItems);
                }
              })
            });
            return {
              innerJoin: joinHandler,
              leftJoin: joinHandler
            };
          }

          // If table is batchCurriculum
          if (table === actual.batchCurriculum) {
            return {
              where: () => Promise.resolve(mockCurriculum)
            };
          }

          return {
            where: () => ({
              limit: () => Promise.resolve([])
            })
          };
        }
      }),
      insert: (table: any) => ({
        values: (values: any) => ({
          onConflictDoNothing: () => {
            if (table === actual.activities) {
              const existing = mockActivities.find(
                (a) =>
                  a.studentId === values.studentId &&
                  a.activityType === values.activityType &&
                  a.referenceId === values.referenceId
              );
              if (!existing) {
                mockActivities.push({
                  id: mockActivities.length + 1,
                  ...values,
                  createdAt: new Date()
                });
              }
            }
            return Promise.resolve();
          }
        })
      })
    }
  };
});

describe('Slice 9: Video & Resource Player', () => {
  const originalEnv = process.env.POSTGRES_URL;

  const validContentId = '00000000-0000-4000-8000-000000000001';
  const validBatchId = '11111111-1111-4111-8111-111111111111';
  const otherBatchId = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';
    vi.clearAllMocks();

    mockUsers = [
      {
        id: 'usr-student-1',
        email: 'student@college.edu',
        name: 'Student One',
        status: 'active'
      }
    ];

    mockUserRoles = [
      {
        id: 1,
        userId: 'usr-student-1',
        role: 'student'
      }
    ];

    mockStudents = [
      {
        id: 101,
        userId: 'usr-student-1',
        fullName: 'Student One',
        email: 'student@college.edu',
        phone: null,
        collegeRollNumber: 'CS101',
        branch: 'CSE',
        year: 3,
        collegeId: 'col-1',
        collegeName: 'RMS Engineering College',
        collegeCode: 'RMS-ENG'
      }
    ];

    mockPrograms = [
      {
        id: 1,
        name: 'Full Stack Web Development',
        code: 'FSWD'
      }
    ];

    mockBatches = [
      {
        id: validBatchId,
        programId: 1,
        name: 'Cohort Alpha 2026',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30')
      }
    ];

    mockEnrollments = [
      {
        id: 1,
        studentId: 101,
        programId: 1,
        batchId: validBatchId,
        status: 'active'
      }
    ];

    mockCurriculum = [
      {
        id: 1,
        batchId: validBatchId,
        contentItemId: validContentId,
        weekNumber: 1,
        sequenceOrder: 1
      }
    ];

    mockContentItems = [
      {
        id: validContentId,
        programId: 1,
        programName: 'Full Stack Web Development',
        programCode: 'FSWD',
        title: 'Introduction to Web Architecture',
        slug: 'intro-web-architecture',
        contentType: 'lecture',
        description: 'Comprehensive overview of client-server patterns and modern web stacks.',
        metadata: {
          provider: 'vimeo',
          videoId: '76979871',
          durationMinutes: 45,
          topic: 'Web Fundamentals',
          aspectRatio: '16:9'
        },
        isPublished: true
      }
    ];

    mockActivities = [];

    mockAuth.mockResolvedValue({
      user: {
        id: 'usr-student-1',
        email: 'student@college.edu',
        role: 'student'
      }
    });
  });

  describe('1. getContentItem Authorization and Anti-Probing', () => {
    it('returns content item for an authorized student enrolled in the program', async () => {
      const item = await getContentItem(101, validContentId);

      expect(item).toBeDefined();
      expect(item.id).toBe(validContentId);
      expect(item.title).toBe('Introduction to Web Architecture');
      expect(item.contentType).toBe('lecture');
      expect(item.isCompleted).toBe(false);
      expect(item.videoMetadata?.provider).toBe('vimeo');
      expect(item.videoMetadata?.videoId).toBe('76979871');
      expect(item.videoMetadata?.durationMinutes).toBe(45);
    });

    it('rejects malformed content UUIDs immediately via notFound()', async () => {
      await expect(getContentItem(101, 'invalid-non-uuid')).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('throws notFound() if student has zero active enrollments', async () => {
      mockEnrollments = [];
      await expect(getContentItem(101, validContentId)).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('throws notFound() without leaking existence if content item is not found or not entitled', async () => {
      mockContentItems = [];
      await expect(getContentItem(101, validContentId)).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('throws notFound() if content item is unpublished', async () => {
      mockContentItems = []; // Simulates unpublished query where isPublished = false is filtered out
      await expect(getContentItem(101, validContentId)).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('returns relatedBatchContext when valid enrolled batchId is provided', async () => {
      const item = await getContentItem(101, validContentId, validBatchId);

      expect(item.relatedBatchContext).toBeDefined();
      expect(item.relatedBatchContext?.batchId).toBe(validBatchId);
      expect(item.relatedBatchContext?.batchName).toBe('Cohort Alpha 2026');
    });

    it('ignores batchId when student is not enrolled in that batch', async () => {
      const item = await getContentItem(101, validContentId, otherBatchId);

      expect(item.relatedBatchContext).toBeNull();
    });

    it('returns null relatedBatchContext when content item is not placed in the requested batch (multi-batch isolation)', async () => {
      const secondBatchId = '33333333-3333-4333-8333-333333333333';
      mockEnrollments.push({
        id: 2,
        studentId: 101,
        programId: 1,
        batchId: secondBatchId,
        status: 'active'
      });
      mockBatches.push({
        id: secondBatchId,
        programId: 1,
        name: 'Cohort Beta 2026',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-07-31')
      });

      // validContentId is only placed in validBatchId, not in secondBatchId
      const item = await getContentItem(101, validContentId, secondBatchId);

      expect(item.relatedBatchContext).toBeNull();
    });
  });

  describe('2. Content Types and Metadata Mapping', () => {
    it('correctly maps YouTube video metadata and duration', async () => {
      mockContentItems = [
        {
          id: validContentId,
          programId: 1,
          programName: 'Full Stack Web Development',
          programCode: 'FSWD',
          title: 'Asynchronous JavaScript & Event Loop',
          slug: 'async-js',
          contentType: 'lecture',
          description: 'Deep dive into microtasks and callback queues.',
          metadata: {
            provider: 'youtube',
            videoId: '8aGhZQkoFbQ',
            durationMinutes: 30,
            aspectRatio: '16:9',
            topic: 'JavaScript'
          },
          isPublished: true
        }
      ];

      const item = await getContentItem(101, validContentId);

      expect(item.contentType).toBe('lecture');
      expect(item.videoMetadata?.provider).toBe('youtube');
      expect(item.videoMetadata?.videoId).toBe('8aGhZQkoFbQ');
      expect(item.videoMetadata?.durationSeconds).toBe(1800);
    });

    it('correctly maps Notes resource metadata with documentUrl', async () => {
      mockContentItems = [
        {
          id: validContentId,
          programId: 1,
          programName: 'Full Stack Web Development',
          programCode: 'FSWD',
          title: 'HTTP/2 and Networking Cheat Sheet',
          slug: 'http2-cheat-sheet',
          contentType: 'notes',
          description: 'Quick reference guide to framing and multiplexing.',
          metadata: {
            documentUrl: 'https://cdn.rms-careers.com/resources/http2-guide.pdf',
            notes: 'Review RFC 7540 sections 5 and 6.',
            topic: 'Networking',
            category: 'Study Guide'
          },
          isPublished: true
        }
      ];

      const item = await getContentItem(101, validContentId);

      expect(item.contentType).toBe('notes');
      expect(item.resourceMetadata?.documentUrl).toBe(
        'https://cdn.rms-careers.com/resources/http2-guide.pdf'
      );
      expect(item.resourceMetadata?.notes).toBe('Review RFC 7540 sections 5 and 6.');
      expect(item.resourceMetadata?.topic).toBe('Networking');
      expect(item.videoMetadata).toBeNull();
    });

    it('correctly flags completed lecture from activities record', async () => {
      const completedDate = new Date('2026-10-01T10:00:00Z');
      mockActivities = [
        {
          id: 1,
          studentId: 101,
          activityType: 'lecture_completed',
          referenceId: validContentId,
          createdAt: completedDate
        }
      ];

      const item = await getContentItem(101, validContentId);

      expect(item.isCompleted).toBe(true);
      expect(item.completedAt).toEqual(completedDate);
    });
  });

  describe('3. markLectureWatched Server Action & Idempotency', () => {
    it('rejects unauthenticated requests without session', async () => {
      mockAuth.mockResolvedValue(null);

      // requireStudentEntitlement redirects on unauthenticated session
      await expect(markLectureWatched(validContentId)).rejects.toThrow('REDIRECT:/login');
    });

    it('rejects invalid content ID format with NOT_FOUND', async () => {
      const result = await markLectureWatched('not-a-valid-uuid');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Content not found');
      }
    });

    it('rejects unauthorized or nonexistent content item with NOT_FOUND', async () => {
      mockContentItems = []; // Not found
      const result = await markLectureWatched(validContentId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Content not found');
      }
    });

    it('records completion and awards 5 XP on first attempt', async () => {
      mockActivities = [];

      const result = await markLectureWatched(validContentId, validBatchId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ isCompleted: true, xpAwarded: 5 });
        expect(result.message).toContain('+5 XP');
      }
      expect(mockActivities.length).toBe(1);
      expect(mockActivities[0].studentId).toBe(101);
      expect(mockActivities[0].activityType).toBe('lecture_completed');
      expect(mockActivities[0].referenceId).toBe(validContentId);
      expect(mockActivities[0].batchId).toBe(validBatchId);
      expect(mockActivities[0].xpAwarded).toBe(5);
    });

    it('is idempotent and awards 0 XP on repeated completions', async () => {
      mockActivities = [
        {
          id: 1,
          studentId: 101,
          batchId: validBatchId,
          activityType: 'lecture_completed',
          referenceId: validContentId,
          xpAwarded: 5,
          activityDateIst: '2026-10-05',
          createdAt: new Date()
        }
      ];

      const result = await markLectureWatched(validContentId, validBatchId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ isCompleted: true, xpAwarded: 0 });
        expect(result.message).toBe('Already marked as completed');
      }
      expect(mockActivities.length).toBe(1); // No duplicate rows created
    });

    it('rejects completion and throws notFound when content is locked with a future availableFrom', async () => {
      mockCurriculum = [
        {
          batchId: validBatchId,
          contentItemId: validContentId,
          availableFrom: new Date(Date.now() + 86400000 * 7) // 7 days in the future
        }
      ];

      await expect(getContentItem(101, validContentId, validBatchId)).rejects.toThrow(
        'NEXT_NOT_FOUND'
      );

      const actionRes = await markLectureWatched(validContentId, validBatchId);
      expect(actionRes.success).toBe(false);
      if (!actionRes.success) {
        expect(actionRes.error).toBe('Content not found');
      }
    });

    it('rejects completion when student enrollment in batch is completed (read-only)', async () => {
      mockCurriculum = [
        {
          batchId: validBatchId,
          contentItemId: validContentId,
          availableFrom: new Date('2026-09-01')
        }
      ];
      mockEnrollments[0].status = 'completed';

      const actionRes = await markLectureWatched(validContentId, validBatchId);
      expect(actionRes.success).toBe(false);
      if (!actionRes.success) {
        expect(actionRes.error).toBe('This batch is completed and in read-only mode.');
      }
    });
  });
});
