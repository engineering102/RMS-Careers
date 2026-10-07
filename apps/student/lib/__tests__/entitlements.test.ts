import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getStudentEntitlementContext,
  requireStudentEntitlement,
  assertBatchEntitlement
} from '../db/queries/entitlements';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  notFound: vi.fn().mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND');
  })
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn()
}));

// In-memory test store
let mockUsers: any[] = [];
let mockStudents: any[] = [];
let mockUserRoles: any[] = [];
let mockColleges: any[] = [];
let mockPrograms: any[] = [];
let mockBatches: any[] = [];
let mockEnrollments: any[] = [];

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();

  return {
    ...actual,
    db: {
      select: (fields?: any) => ({
        from: (table: any) => ({
          leftJoin: (t2: any, onClause2: any) => ({
            where: (clause: any) => ({
              limit: () => {
                if (table === actual.students) {
                  return Promise.resolve(mockStudents);
                }
                return Promise.resolve([]);
              }
            })
          }),
          innerJoin: (t2: any, onClause2: any) => ({
            leftJoin: (t3: any, onClause3: any) => ({
              where: (clause: any) => Promise.resolve(mockEnrollments)
            }),
            innerJoin: (t3: any, onClause3: any) => ({
              where: (clause: any) => ({
                limit: () => Promise.resolve(mockEnrollments)
              })
            })
          }),
          where: (clause: any) => ({
            limit: () => {
              if (table === actual.users) {
                return Promise.resolve(mockUsers);
              }
              return Promise.resolve([]);
            },
            then: (resolve: any) => {
              if (table === actual.userRoles) {
                resolve(mockUserRoles);
              } else {
                resolve([]);
              }
            }
          })
        })
      })
    }
  };
});

describe('Slice 5: Student Entitlement Context Queries', () => {
  const userId = 'u-student-001';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';

    mockUsers = [
      {
        id: userId,
        email: 'student@college.edu',
        name: 'Aarav Patel',
        status: 'active'
      }
    ];

    mockUserRoles = [
      {
        id: 'ur-1',
        userId,
        role: 'student'
      }
    ];

    mockStudents = [
      {
        id: 101,
        userId,
        fullName: 'Aarav Patel',
        email: 'student@college.edu',
        phone: '9876543210',
        collegeRollNumber: '21CS001',
        branch: 'Computer Science',
        year: 3,
        collegeId: 'col-1',
        collegeName: 'RMS Institute of Technology',
        collegeCode: 'RMS-IT'
      }
    ];

    mockEnrollments = [
      {
        enrollmentId: 1,
        status: 'active',
        programId: 10,
        programName: 'Full Stack Engineering',
        programCode: 'FSE-2026',
        batchId: 'batch-alpha-1',
        batchName: 'Batch Alpha',
        batchStartDate: new Date('2026-01-01'),
        batchEndDate: new Date('2026-06-30')
      }
    ];
  });

  it('resolves full student identity, college affiliation, and active batches for entitled student', async () => {
    const context = await getStudentEntitlementContext(userId);

    expect(context.isStudent).toBe(true);
    expect(context.isActive).toBe(true);
    expect(context.hasActiveEntitlement).toBe(true);
    expect(context.student?.fullName).toBe('Aarav Patel');
    expect(context.student?.collegeName).toBe('RMS Institute of Technology');
    expect(context.enrollments).toHaveLength(1);
    expect(context.activeBatches).toHaveLength(1);
    expect(context.activeBatches[0].batchName).toBe('Batch Alpha');
  });

  it('returns empty context when user ID is missing or database is unavailable', async () => {
    const context = await getStudentEntitlementContext('');
    expect(context.isStudent).toBe(false);
    expect(context.hasActiveEntitlement).toBe(false);
  });

  it('rejects access when user status is not active (e.g. pending_activation or suspended)', async () => {
    mockUsers[0].status = 'pending_activation';
    const context = await getStudentEntitlementContext(userId);

    expect(context.isActive).toBe(false);
    expect(context.hasActiveEntitlement).toBe(false);
    expect(context.student).toBeNull();
  });

  it('rejects access when user does not have the student role (e.g. admin or tutor)', async () => {
    mockUserRoles = [{ id: 'ur-2', userId, role: 'admin' }];
    const context = await getStudentEntitlementContext(userId);

    expect(context.isStudent).toBe(false);
    expect(context.hasActiveEntitlement).toBe(false);
    expect(context.student).toBeNull();
  });

  it('identifies student with zero active enrollments (unassigned/empty state)', async () => {
    mockEnrollments = [];
    const context = await getStudentEntitlementContext(userId);

    expect(context.isStudent).toBe(true);
    expect(context.isActive).toBe(true);
    expect(context.hasActiveEntitlement).toBe(false);
    expect(context.enrollments).toHaveLength(0);
    expect(context.activeBatches).toHaveLength(0);
    expect(context.student?.fullName).toBe('Aarav Patel');
  });

  it('aggregates multiple active enrollments across batches', async () => {
    mockEnrollments = [
      {
        enrollmentId: 1,
        status: 'active',
        programId: 10,
        programName: 'Full Stack Engineering',
        programCode: 'FSE',
        batchId: 'batch-alpha-1',
        batchName: 'Batch Alpha',
        batchStartDate: new Date('2026-01-01'),
        batchEndDate: new Date('2026-06-30')
      },
      {
        enrollmentId: 2,
        status: 'confirmed',
        programId: 20,
        programName: 'Competitive DSA',
        programCode: 'DSA',
        batchId: 'batch-beta-2',
        batchName: 'Batch Beta',
        batchStartDate: new Date('2026-02-01'),
        batchEndDate: new Date('2026-07-31')
      }
    ];

    const context = await getStudentEntitlementContext(userId);
    expect(context.hasActiveEntitlement).toBe(true);
    expect(context.enrollments).toHaveLength(2);
    expect(context.activeBatches).toHaveLength(2);
  });
});

describe('Slice 5: Server-Side Entitlement Guards', () => {
  const userId = 'u-student-001';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';

    mockUsers = [
      {
        id: userId,
        email: 'student@college.edu',
        name: 'Aarav Patel',
        status: 'active'
      }
    ];
    mockUserRoles = [{ id: 'ur-1', userId, role: 'student' }];
    mockStudents = [
      {
        id: 101,
        userId,
        fullName: 'Aarav Patel',
        email: 'student@college.edu',
        collegeName: 'RMS Institute'
      }
    ];
    mockEnrollments = [
      {
        enrollmentId: 1,
        batchId: 'batch-101',
        batchName: 'Full Stack Alpha',
        programId: 10,
        programName: 'Full Stack'
      }
    ];
  });

  it('redirects unauthenticated requests to /login', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    await expect(requireStudentEntitlement()).rejects.toThrow('REDIRECT:/login');
    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('redirects authenticated non-student users to /login?error=Unauthorized', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin-1', role: 'admin' as any }
    } as any);

    await expect(requireStudentEntitlement()).rejects.toThrow('REDIRECT:/login?error=Unauthorized');
    expect(redirect).toHaveBeenCalledWith('/login?error=Unauthorized');
  });

  it('allows authenticated student and returns complete context', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: userId, role: 'student' }
    } as any);

    const context = await requireStudentEntitlement();
    expect(context.student?.fullName).toBe('Aarav Patel');
    expect(context.hasActiveEntitlement).toBe(true);
  });

  it('assertBatchEntitlement succeeds when student is enrolled in target batch', async () => {
    mockEnrollments[0].enrollmentStatus = 'active';
    const result = await assertBatchEntitlement(101, 'batch-101');
    expect(result.batchId).toBe('batch-101');
    expect(result.batchName).toBe('Full Stack Alpha');
  });

  it('assertBatchEntitlement allows completed enrollment for read-only viewing', async () => {
    mockEnrollments = [
      {
        enrollmentId: 1,
        enrollmentStatus: 'completed',
        batchId: 'batch-101',
        batchName: 'Full Stack Alpha',
        programId: 10,
        programName: 'Full Stack'
      }
    ];

    const result = await assertBatchEntitlement(101, 'batch-101');
    expect(result.batchId).toBe('batch-101');
    expect(result.enrollmentStatus).toBe('completed');
  });

  it('assertBatchEntitlement triggers 404 notFound when student is not enrolled in batch (anti-probing)', async () => {
    mockEnrollments = []; // Empty: not enrolled in target batch

    await expect(assertBatchEntitlement(101, 'unauthorized-batch')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });
});
