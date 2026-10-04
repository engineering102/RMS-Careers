import 'server-only';

import { db, colleges, enrollments, programs, students, userRoles, users } from '@rms/db';
import { and, eq, sql } from 'drizzle-orm';
import { hasRole, verifyPassword } from '@rms/auth';

export type StudentIdentity = {
  userId: string;
  email: string;
  name: string;
  studentId: number;
  collegeName: string | null;
  enrollments: Array<{ id: number; programName: string; status: string }>;
};

export async function authenticateStudent(email: string, password: string): Promise<StudentIdentity | null> {
  if (!email || !password || !process.env.POSTGRES_URL) return null;
  try {
    const [user] = await db.select().from(users).where(sql`LOWER(${users.email}) = ${email.trim().toLowerCase()}`).limit(1);
    if (!user || user.status !== 'active') return null;
    const roles = await db.select().from(userRoles).where(eq(userRoles.userId, user.id));
    if (!hasRole(roles, 'student') || !(await verifyPassword(password, user.passwordHash))) return null;
    return getStudentIdentity(user.id);
  } catch { return null; }
}

export async function getStudentIdentity(userId: string): Promise<StudentIdentity | null> {
  if (!userId || !process.env.POSTGRES_URL) return null;
  try {
    const rows = await db.select({ userId: users.id, email: users.email, userName: users.name, studentId: students.id, studentName: students.fullName, collegeName: colleges.name })
      .from(users).innerJoin(students, eq(students.userId, users.id)).leftJoin(colleges, eq(colleges.id, students.collegeId)).where(eq(users.id, userId)).limit(1);
    const identity = rows[0];
    if (!identity) return null;
    const roles = await db.select().from(userRoles).where(eq(userRoles.userId, userId));
    if (!hasRole(roles, 'student')) return null;
    const programEnrollments = await db.select({ id: enrollments.id, programName: programs.name, status: enrollments.status })
      .from(enrollments).innerJoin(programs, eq(programs.id, enrollments.programId)).where(eq(enrollments.studentId, identity.studentId));
    return { userId: identity.userId, email: identity.email, name: identity.studentName || identity.userName || 'Student', studentId: identity.studentId, collegeName: identity.collegeName, enrollments: programEnrollments };
  } catch { return null; }
}
