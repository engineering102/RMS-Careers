import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashToken } from '@rms/auth';

vi.mock('server-only', () => ({}));

// ---------------------------------------------------------------------------
// Hoisted Database State & Client Mock for Vitest
// ---------------------------------------------------------------------------
const { mockDb, dbState, triggers, resetDb } = vi.hoisted(() => {
  interface MockStudent {
    id: number;
    userId: string | null;
    collegeId: string | null;
    fullName: string;
    email: string;
    phone: string | null;
    collegeRollNumber: string | null;
    branch: string | null;
    year: number | null;
    createdAt: Date;
    updatedAt: Date;
  }

  interface MockEnrollment {
    id: number;
    studentId: number;
    programId: number;
    status: string;
    confirmationSentAt: Date | null;
    createdAt: Date;
  }

  interface MockUser {
    id: string;
    email: string;
    name: string | null;
    passwordHash: string;
    status: 'pending_activation' | 'active' | 'suspended';
    createdAt: Date;
    updatedAt: Date;
  }

  interface MockUserRole {
    id: number;
    userId: string;
    role: string;
    grantedAt: Date;
  }

  interface MockAccountToken {
    id: string;
    userId: string;
    tokenHash: string;
    tokenType: string;
    expiresAt: Date;
    consumedAt: Date | null;
    createdAt: Date;
  }

  const dbState = {
    students: [] as MockStudent[],
    enrollments: [] as MockEnrollment[],
    users: [] as MockUser[],
    userRoles: [] as MockUserRole[],
    accountTokens: [] as MockAccountToken[],
    studentIdCounter: 1,
    enrollmentIdCounter: 1,
    roleIdCounter: 1
  };

  const triggers = {
    forceUserInsertFailure: false,
    forceTokenInsertFailure: false
  };

  function snapshot() {
    return {
      students: JSON.parse(JSON.stringify(dbState.students)),
      enrollments: JSON.parse(JSON.stringify(dbState.enrollments)),
      users: JSON.parse(JSON.stringify(dbState.users)),
      userRoles: JSON.parse(JSON.stringify(dbState.userRoles)),
      accountTokens: JSON.parse(JSON.stringify(dbState.accountTokens))
    };
  }

  function restore(snap: ReturnType<typeof snapshot>) {
    dbState.students = snap.students.map((s: any) => ({ ...s, createdAt: new Date(s.createdAt), updatedAt: new Date(s.updatedAt) }));
    dbState.enrollments = snap.enrollments.map((e: any) => ({ ...e, createdAt: new Date(e.createdAt), confirmationSentAt: e.confirmationSentAt ? new Date(e.confirmationSentAt) : null }));
    dbState.users = snap.users.map((u: any) => ({ ...u, createdAt: new Date(u.createdAt), updatedAt: new Date(u.updatedAt) }));
    dbState.userRoles = snap.userRoles.map((r: any) => ({ ...r, grantedAt: new Date(r.grantedAt) }));
    dbState.accountTokens = snap.accountTokens.map((t: any) => ({ ...t, expiresAt: new Date(t.expiresAt), consumedAt: t.consumedAt ? new Date(t.consumedAt) : null, createdAt: new Date(t.createdAt) }));
  }

  function findValues(obj: any): any[] {
    const values: any[] = [];
    if (obj === null || obj === undefined) return values;
    if (typeof obj === 'string' || typeof obj === 'number' || obj instanceof Date) {
      values.push(obj);
      return values;
    }
    if (Array.isArray(obj)) {
      for (const item of obj) {
        values.push(...findValues(item));
      }
    } else if (typeof obj === 'object') {
      if (obj.queryChunks) {
        values.push(...findValues(obj.queryChunks));
      } else if (obj.value !== undefined && !Array.isArray(obj.value)) {
        values.push(obj.value);
      }
    }
    return values;
  }

  function createClient(): any {
    return {
      transaction: async (callback: any) => {
        const snap = snapshot();
        try {
          const tx = createClient();
          delete tx.transaction;
          return await callback(tx);
        } catch (err) {
          restore(snap);
          throw err;
        }
      },
      select: () => ({
        from: (table: any) => ({
          where: (condition: any) => {
            const runFilter = () => {
              const tableName = table?._?.name || table?.name || '';
              const vals = findValues(condition);
              const val = vals[0];

              if (tableName === 'students') {
                if (condition?.studentId) {
                  return dbState.students.filter((s) => s.id === condition.studentId);
                }
                if (typeof val === 'number') {
                  return dbState.students.filter((s) => s.id === val);
                }
                if (typeof val === 'string') {
                  if (val.startsWith('usr_')) {
                    return dbState.students.filter((s) => s.userId === val);
                  }
                  return dbState.students.filter((s) => s.email.toLowerCase() === val.toLowerCase());
                }
                return dbState.students;
              }

              if (tableName === 'users') {
                if (typeof val === 'string') {
                  if (val.startsWith('usr_')) {
                    return dbState.users.filter((u) => u.id === val);
                  }
                  return dbState.users.filter((u) => u.email.toLowerCase() === val.trim().toLowerCase());
                }
                return dbState.users;
              }

              if (tableName === 'enrollments') {
                if (condition?.studentId && condition?.programId) {
                  return dbState.enrollments.filter(
                    (e) => e.studentId === condition.studentId && e.programId === condition.programId
                  );
                }
                if (vals.length >= 2 && typeof vals[0] === 'number' && typeof vals[1] === 'number') {
                  return dbState.enrollments.filter(
                    (e) => e.studentId === vals[0] && e.programId === vals[1]
                  );
                }
                return dbState.enrollments;
              }

              if (tableName === 'user_roles') {
                if (typeof val === 'string') {
                  return dbState.userRoles.filter((r) => r.userId === val);
                }
                return dbState.userRoles;
              }

              if (tableName === 'account_tokens') {
                if (typeof val === 'string') {
                  const now = new Date();
                  return dbState.accountTokens.filter(
                    (t) => t.userId === val && t.tokenType === 'activation' && t.consumedAt === null && t.expiresAt > now
                  );
                }
                return dbState.accountTokens;
              }

              return [];
            };

            return {
              limit: (n: number) => Promise.resolve(runFilter().slice(0, n)),
              then: (resolve: any) => resolve(runFilter())
            };
          }
        })
      }),
      insert: (table: any) => ({
        values: (vals: any) => {
          const tableName = table?._?.name || table?.name || '';

          let executedResult: any[] | null = null;
          const executeInsert = () => {
            if (executedResult !== null) return executedResult;

            if (tableName === 'students') {
              const newRec: MockStudent = {
                id: dbState.studentIdCounter++,
                userId: vals.userId || null,
                collegeId: vals.collegeId || null,
                fullName: vals.fullName,
                email: vals.email.toLowerCase(),
                phone: vals.phone || null,
                collegeRollNumber: vals.collegeRollNumber || null,
                branch: vals.branch || null,
                year: vals.year || null,
                createdAt: new Date(),
                updatedAt: new Date()
              };
              dbState.students.push(newRec);
              executedResult = [newRec];
              return executedResult;
            }

            if (tableName === 'users') {
              if (triggers.forceUserInsertFailure) {
                throw new Error('Simulated failure during user insertion');
              }
              const newRec: MockUser = {
                id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                email: vals.email.toLowerCase(),
                name: vals.name,
                passwordHash: vals.passwordHash,
                status: vals.status || 'pending_activation',
                createdAt: new Date(),
                updatedAt: new Date()
              };
              dbState.users.push(newRec);
              executedResult = [newRec];
              return executedResult;
            }

            if (tableName === 'enrollments') {
              const newRec: MockEnrollment = {
                id: dbState.enrollmentIdCounter++,
                studentId: vals.studentId,
                programId: vals.programId,
                status: vals.status || 'pending',
                confirmationSentAt: null,
                createdAt: new Date()
              };
              dbState.enrollments.push(newRec);
              executedResult = [newRec];
              return executedResult;
            }

            if (tableName === 'account_tokens') {
              if (triggers.forceTokenInsertFailure) {
                throw new Error('Simulated failure during token insertion');
              }
              const newRec: MockAccountToken = {
                id: `tok_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                userId: vals.userId,
                tokenHash: vals.tokenHash,
                tokenType: vals.tokenType,
                expiresAt: vals.expiresAt,
                consumedAt: null,
                createdAt: new Date()
              };
              dbState.accountTokens.push(newRec);
              executedResult = [newRec];
              return executedResult;
            }

            executedResult = [];
            return executedResult;
          };

          return {
            returning: () => Promise.resolve(executeInsert()),
            onConflictDoNothing: () => {
              if (tableName === 'user_roles') {
                const exists = dbState.userRoles.some((r) => r.userId === vals.userId && r.role === vals.role);
                if (!exists) {
                  dbState.userRoles.push({
                    id: dbState.roleIdCounter++,
                    userId: vals.userId,
                    role: vals.role,
                    grantedAt: new Date()
                  });
                }
              }
              return Promise.resolve();
            },
            then: (resolve: any, reject: any) => {
              try {
                resolve(executeInsert());
              } catch (err) {
                if (reject) reject(err);
                else throw err;
              }
            }
          };
        }
      }),
      update: (table: any) => ({
        set: (vals: any) => ({
          where: (condition: any) => ({
            returning: () => {
              const tableName = table?._?.name || table?.name || '';
              const cVals = findValues(condition);
              if (tableName === 'students') {
                const studentId = typeof cVals[0] === 'number' ? cVals[0] : condition?.studentId;
                const target = dbState.students.find((s) => s.id === studentId);
                if (target) {
                  Object.assign(target, vals, { updatedAt: new Date() });
                  return Promise.resolve([target]);
                }
                return Promise.resolve([]);
              }
              if (tableName === 'enrollments') {
                const target = dbState.enrollments.find((e) => e.id === condition?.enrollmentId);
                if (target) {
                  Object.assign(target, vals);
                  return Promise.resolve([target]);
                }
                return Promise.resolve([]);
              }
              return Promise.resolve([]);
            }
          })
        })
      })
    };
  }

  function resetDb() {
    dbState.students = [];
    dbState.enrollments = [];
    dbState.users = [];
    dbState.userRoles = [];
    dbState.accountTokens = [];
    dbState.studentIdCounter = 1;
    dbState.enrollmentIdCounter = 1;
    dbState.roleIdCounter = 1;
    triggers.forceUserInsertFailure = false;
    triggers.forceTokenInsertFailure = false;
  }

  return {
    mockDb: createClient(),
    dbState,
    triggers,
    resetDb
  };
});

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();
  return {
    ...actual,
    // Mirrors drizzle-orm/neon-http: the root client cannot run transactions.
    db: {
      ...mockDb,
      transaction: async () => {
        throw new Error('No transactions support in neon-http driver');
      }
    },
    students: { name: 'students', _: { name: 'students' } },
    enrollments: { name: 'enrollments', _: { name: 'enrollments' } },
    users: { name: 'users', _: { name: 'users' } },
    userRoles: { name: 'user_roles', _: { name: 'user_roles' } },
    accountTokens: { name: 'account_tokens', _: { name: 'account_tokens' } }
  };
});

// @rms/db/tx: the transactional client used by the orchestration service by default.
vi.mock('@rms/db/tx', () => ({ dbTx: mockDb }));

vi.mock('../db/queries/students', () => ({
  findStudentByEmail: vi.fn().mockImplementation(async (email: string, client: any) => {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const [row] = await client.select().from({ name: 'students' }).where({ email: cleanEmail }).limit(1);
    return row || null;
  }),
  createOrUpdateStudent: vi.fn().mockImplementation(async (data: any, client: any) => {
    const cleanEmail = data.email.trim().toLowerCase();
    const existing = dbState.students.find((s) => s.email.toLowerCase() === cleanEmail);
    if (existing) {
      const [updated] = await client.update({ name: 'students' }).set({
        fullName: data.fullName,
        phone: data.phone,
        collegeRollNumber: data.collegeRollNumber,
        branch: data.branch,
        year: data.year,
        collegeId: data.collegeId !== undefined ? data.collegeId : existing.collegeId,
        userId: data.userId !== undefined ? data.userId : existing.userId
      }).where({ studentId: existing.id }).returning();
      return updated;
    }
    const [created] = await client.insert({ name: 'students' }).values(data).returning();
    return created;
  })
}));

vi.mock('../db/queries/enrollments', () => ({
  checkExistingEnrollment: vi.fn().mockImplementation(async (studentId: number, programId: number, client: any) => {
    const [row] = await client.select().from({ name: 'enrollments' }).where({ studentId, programId }).limit(1);
    return row || null;
  }),
  createEnrollmentRecord: vi.fn().mockImplementation(async (studentId: number, programId: number, client: any) => {
    const [created] = await client.insert({ name: 'enrollments' }).values({ studentId, programId, status: 'pending' }).returning();
    return created;
  })
}));

import { createEnrollmentWithStudentProvisioning } from '../services/enrollment-orchestration';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Phase 3.1 — Enrollment Orchestration Service & Transaction Boundaries', () => {
  const sampleStudentInput = {
    fullName: 'Ananya Sharma',
    email: 'ananya.sharma@example.com',
    phone: '9876543210',
    collegeRollNumber: '21CS045',
    branch: 'Computer Science',
    year: 3
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';
  });

  describe('1. Successful enrollment & provisioning', () => {
    it('atomically creates student, enrollment, user, student role, links user_id, and creates single-use activation token', async () => {
      const result = await createEnrollmentWithStudentProvisioning({
        programId: 1,
        student: sampleStudentInput
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.isNewStudent).toBe(true);
      expect(result.student.fullName).toBe('Ananya Sharma');
      expect(result.enrollment.programId).toBe(1);
      expect(result.enrollment.status).toBe('pending');
      expect(result.userId).toBeDefined();

      // Database state verification
      expect(dbState.students).toHaveLength(1);
      expect(dbState.enrollments).toHaveLength(1);
      expect(dbState.users).toHaveLength(1);
      expect(dbState.userRoles).toHaveLength(1);
      expect(dbState.accountTokens).toHaveLength(1);

      // Verify student <-> user linkage
      expect(dbState.students[0].userId).toBe(dbState.users[0].id);
      expect(dbState.students[0].id).toBe(result.student.id);

      // Verify user attributes
      expect(dbState.users[0].email).toBe('ananya.sharma@example.com');
      expect(dbState.users[0].status).toBe('pending_activation');

      // Verify student role assignment
      expect(dbState.userRoles[0].userId).toBe(dbState.users[0].id);
      expect(dbState.userRoles[0].role).toBe('student');

      // Verify activation token rules: only hash stored in DB, raw token in returned memory
      expect(result.activation).not.toBeNull();
      expect(result.activation?.rawToken).toHaveLength(64);
      expect(result.activation?.expiresAt).toBeInstanceOf(Date);

      const expectedHash = await hashToken(result.activation!.rawToken);
      expect(dbState.accountTokens[0].tokenHash).toBe(expectedHash);
      expect(dbState.accountTokens[0].tokenType).toBe('activation');
      expect(dbState.accountTokens[0].consumedAt).toBeNull();
    });
  });

  describe('2. Existing identity & idempotency', () => {
    it('reuses existing student and user when email matches, ensuring role without duplicate user creation', async () => {
      // Pre-seed an existing student and user
      const existingUser = {
        id: 'usr_existing_123',
        email: 'ananya.sharma@example.com',
        name: 'Ananya Sharma',
        passwordHash: 'hash_123',
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      dbState.users.push(existingUser);

      const existingStudent = {
        id: dbState.studentIdCounter++,
        userId: existingUser.id,
        collegeId: null,
        fullName: 'Ananya Sharma',
        email: 'ananya.sharma@example.com',
        phone: '9876543210',
        collegeRollNumber: '21CS045',
        branch: 'Computer Science',
        year: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      dbState.students.push(existingStudent);

      // Program 2 (new program for this student)
      const result = await createEnrollmentWithStudentProvisioning({
        programId: 2,
        student: sampleStudentInput
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.isNewStudent).toBe(false);
      expect(result.student.id).toBe(existingStudent.id);
      expect(result.userId).toBe(existingUser.id);

      // Verify no duplicate users created
      expect(dbState.users).toHaveLength(1);
      // Student re-used, no duplicate student
      expect(dbState.students).toHaveLength(1);
      // New enrollment created for program 2
      expect(dbState.enrollments).toHaveLength(1);
      expect(dbState.enrollments[0].programId).toBe(2);

      // Role ensured
      expect(dbState.userRoles).toHaveLength(1);
      expect(dbState.userRoles[0].role).toBe('student');

      // Active user does not get a new activation token
      expect(result.activation).toBeNull();
      expect(dbState.accountTokens).toHaveLength(0);
    });

    it('does NOT create a duplicate activation token if a valid unconsumed token already exists', async () => {
      // User pending activation with a valid token
      const existingUser = {
        id: 'usr_pending_456',
        email: 'ananya.sharma@example.com',
        name: 'Ananya Sharma',
        passwordHash: 'hash_456',
        status: 'pending_activation' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      dbState.users.push(existingUser);

      const existingStudent = {
        id: dbState.studentIdCounter++,
        userId: existingUser.id,
        collegeId: null,
        fullName: 'Ananya Sharma',
        email: 'ananya.sharma@example.com',
        phone: '9876543210',
        collegeRollNumber: '21CS045',
        branch: 'Computer Science',
        year: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      dbState.students.push(existingStudent);

      // Existing valid token (expires in 24 hours)
      const validToken = {
        id: 'tok_existing_valid',
        userId: existingUser.id,
        tokenHash: 'sha256_existing_valid_token_hash',
        tokenType: 'activation',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        consumedAt: null,
        createdAt: new Date()
      };
      dbState.accountTokens.push(validToken);

      const result = await createEnrollmentWithStudentProvisioning({
        programId: 2,
        student: sampleStudentInput
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      // Token count remains 1 (no unnecessary replacement token generated)
      expect(dbState.accountTokens).toHaveLength(1);
      expect(dbState.accountTokens[0].tokenHash).toBe('sha256_existing_valid_token_hash');
      // Activation is null because existing raw token cannot be recreated from hash
      expect(result.activation).toBeNull();
    });

    it('generates a new activation token if existing token has expired', async () => {
      const existingUser = {
        id: 'usr_pending_expired',
        email: 'ananya.sharma@example.com',
        name: 'Ananya Sharma',
        passwordHash: 'hash_456',
        status: 'pending_activation' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      dbState.users.push(existingUser);

      const existingStudent = {
        id: dbState.studentIdCounter++,
        userId: existingUser.id,
        collegeId: null,
        fullName: 'Ananya Sharma',
        email: 'ananya.sharma@example.com',
        phone: '9876543210',
        collegeRollNumber: '21CS045',
        branch: 'Computer Science',
        year: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      dbState.students.push(existingStudent);

      // Expired token (expired 2 hours ago)
      const expiredToken = {
        id: 'tok_expired',
        userId: existingUser.id,
        tokenHash: 'sha256_expired_hash',
        tokenType: 'activation',
        expiresAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        consumedAt: null,
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000)
      };
      dbState.accountTokens.push(expiredToken);

      const result = await createEnrollmentWithStudentProvisioning({
        programId: 2,
        student: sampleStudentInput
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      // A new token was created alongside the expired token
      expect(dbState.accountTokens).toHaveLength(2);
      expect(result.activation).not.toBeNull();
      expect(result.activation?.rawToken).toBeDefined();
    });
  });

  describe('3. Duplicate enrollment rejection inside transaction', () => {
    it('detects existing enrollment inside transaction and rolls back without duplicate records', async () => {
      // First enrollment succeeds
      const firstResult = await createEnrollmentWithStudentProvisioning({
        programId: 1,
        student: sampleStudentInput
      });
      expect(firstResult.success).toBe(true);
      expect(dbState.enrollments).toHaveLength(1);

      // Second enrollment for SAME student and SAME program
      const secondResult = await createEnrollmentWithStudentProvisioning({
        programId: 1,
        student: sampleStudentInput
      });

      expect(secondResult.success).toBe(false);
      if (secondResult.success) return;

      expect(secondResult.error).toBe('already_enrolled');
      // No duplicate enrollment inserted
      expect(dbState.enrollments).toHaveLength(1);
    });
  });

  describe('4. Identity conflict detection & transaction rollback', () => {
    it('rolls back all mutations if user account is already linked to a different student', async () => {
      // Pre-seed User X linked to Student A
      const userX = {
        id: 'usr_user_x',
        email: 'ananya.sharma@example.com',
        name: 'Other Student',
        passwordHash: 'hash_x',
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      dbState.users.push(userX);

      const studentA = {
        id: dbState.studentIdCounter++,
        userId: userX.id,
        collegeId: null,
        fullName: 'Other Student',
        email: 'other.student@example.com',
        phone: '1111111111',
        collegeRollNumber: 'OTHER01',
        branch: 'CSE',
        year: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      dbState.students.push(studentA);

      // Now Student B (Ananya) tries to enroll using the same email (ananya.sharma@example.com),
      // which would conflict with userX who is linked to studentA.
      const initialStudentCount = dbState.students.length;
      const initialEnrollmentCount = dbState.enrollments.length;

      const result = await createEnrollmentWithStudentProvisioning({
        programId: 1,
        student: sampleStudentInput
      });

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBe('identity_conflict');

      // CRITICAL INVARIANT: Entire transaction rolled back
      // No enrollment for Ananya remains
      expect(dbState.enrollments).toHaveLength(initialEnrollmentCount);
      // No new student record or modifications committed
      expect(dbState.students).toHaveLength(initialStudentCount);
      // No extra roles or tokens
      expect(dbState.userRoles).toHaveLength(0);
      expect(dbState.accountTokens).toHaveLength(0);
    });
  });

  describe('5a. Transaction failures are never converted into non-atomic execution', () => {
    it('surfaces a driver "no transactions" error and performs no writes', async () => {
      const writes: string[] = [];
      const neonHttpLikeClient: any = new Proxy(
        {
          transaction: async () => {
            throw new Error('No transactions support in neon-http driver');
          }
        },
        {
          get(target: any, prop) {
            if (prop in target) return target[prop];
            // Any direct statement on the client would be a non-atomic write/read.
            writes.push(String(prop));
            throw new Error(`unexpected direct client use: ${String(prop)}`);
          },
          has: (target, prop) => prop in target
        }
      );

      const result = await createEnrollmentWithStudentProvisioning(
        { programId: 1, student: sampleStudentInput },
        neonHttpLikeClient
      );

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBe('database_error');
      expect(writes).toEqual([]);
      expect(dbState.students).toHaveLength(0);
      expect(dbState.enrollments).toHaveLength(0);
      expect(dbState.users).toHaveLength(0);
    });
  });

  describe('5. Transaction rollback on database mutation failures', () => {
    it('rolls back student and enrollment creation when user provisioning fails', async () => {
      triggers.forceUserInsertFailure = true;

      const result = await createEnrollmentWithStudentProvisioning({
        programId: 1,
        student: sampleStudentInput
      });

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBe('database_error');

      // Verify complete rollback: zero dirty records left in database
      expect(dbState.students).toHaveLength(0);
      expect(dbState.enrollments).toHaveLength(0);
      expect(dbState.users).toHaveLength(0);
      expect(dbState.userRoles).toHaveLength(0);
      expect(dbState.accountTokens).toHaveLength(0);
    });

    it('rolls back student, enrollment, and user creation when token insertion fails', async () => {
      triggers.forceTokenInsertFailure = true;

      const result = await createEnrollmentWithStudentProvisioning({
        programId: 1,
        student: sampleStudentInput
      });

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBe('database_error');

      // Verify zero partial state remains
      expect(dbState.students).toHaveLength(0);
      expect(dbState.enrollments).toHaveLength(0);
      expect(dbState.users).toHaveLength(0);
      expect(dbState.userRoles).toHaveLength(0);
      expect(dbState.accountTokens).toHaveLength(0);
    });
  });

  describe('6. Bulk import row-level atomicity', () => {
    it('ensures each row executes in an independent transaction so failure in row 2 does not affect row 1 or 3', async () => {
      const row1Input = {
        fullName: 'Student One',
        email: 'student.one@example.com',
        phone: '9876543211',
        collegeRollNumber: '21CS001',
        branch: 'CSE',
        year: 3
      };

      const row2Input = {
        fullName: 'Student Two',
        email: 'student.two@example.com',
        phone: '9876543212',
        collegeRollNumber: '21CS002',
        branch: 'CSE',
        year: 3
      };

      const row3Input = {
        fullName: 'Student Three',
        email: 'student.three@example.com',
        phone: '9876543213',
        collegeRollNumber: '21CS003',
        branch: 'CSE',
        year: 3
      };

      // Row 1: Succeeds
      const res1 = await createEnrollmentWithStudentProvisioning({
        programId: 1,
        student: row1Input
      });
      expect(res1.success).toBe(true);

      // Row 2: Fails due to simulated failure
      triggers.forceUserInsertFailure = true;
      const res2 = await createEnrollmentWithStudentProvisioning({
        programId: 1,
        student: row2Input
      });
      expect(res2.success).toBe(false);
      triggers.forceUserInsertFailure = false;

      // Row 3: Succeeds
      const res3 = await createEnrollmentWithStudentProvisioning({
        programId: 1,
        student: row3Input
      });
      expect(res3.success).toBe(true);

      // Verify database contents:
      // Row 1 and Row 3 are present and committed.
      // Row 2 is completely absent.
      expect(dbState.students.map((s) => s.email)).toEqual([
        'student.one@example.com',
        'student.three@example.com'
      ]);
      expect(dbState.enrollments).toHaveLength(2);
      expect(dbState.users.map((u) => u.email)).toEqual([
        'student.one@example.com',
        'student.three@example.com'
      ]);
    });
  });

  describe('7. Email decoupling & post-commit boundary', () => {
    it('confirms that email delivery failure after successful commit preserves database records', async () => {
      // 1. Transaction executes and commits
      const result = await createEnrollmentWithStudentProvisioning({
        programId: 1,
        student: sampleStudentInput
      });
      expect(result.success).toBe(true);
      if (!result.success) return;

      // 2. Simulated post-commit email dispatch fails
      const mockEmailDispatcher = vi.fn().mockRejectedValue(new Error('SMTP network failure'));

      let emailErrorCaught = false;
      try {
        await mockEmailDispatcher({
          email: result.student.email,
          rawToken: result.activation?.rawToken
        });
      } catch (err) {
        emailErrorCaught = true;
      }

      expect(emailErrorCaught).toBe(true);

      // 3. Database records remain intact and committed
      expect(dbState.students).toHaveLength(1);
      expect(dbState.enrollments).toHaveLength(1);
      expect(dbState.users).toHaveLength(1);
      expect(dbState.accountTokens).toHaveLength(1);
    });
  });
});
