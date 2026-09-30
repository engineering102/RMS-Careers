import 'server-only';

import { db } from './index';
import {
  programs,
  students,
  enrollments,
  type Program,
  type Student,
  type Enrollment
} from './schema';
import { eq, ilike, desc, count, and, ne, sql } from 'drizzle-orm';

export interface DetailedEnrollment {
  id: number;
  status: 'pending' | 'confirmed' | 'waitlisted' | 'cancelled';
  createdAt: Date;
  confirmationSentAt: Date | null;
  student: {
    id: number;
    fullName: string;
    email: string;
    phone: string | null;
    collegeRollNumber: string | null;
    branch: string | null;
    year: number | null;
  };
  program: {
    id: number;
    name: string;
    code: string;
    capacity: number;
  };
}

export async function getPrograms(search?: string): Promise<Program[]> {
  try {
    if (!process.env.POSTGRES_URL) return [];
    if (search) {
      return await db
        .select()
        .from(programs)
        .where(ilike(programs.name, `%${search}%`))
        .orderBy(desc(programs.createdAt));
    }
    return await db.select().from(programs).orderBy(desc(programs.createdAt));
  } catch (error) {
    console.error('Error fetching programs:', error);
    return [];
  }
}

export async function getProgramByCode(code: string): Promise<Program | null> {
  try {
    if (!process.env.POSTGRES_URL || !code) return null;
    const cleanCode = code.trim().toLowerCase();
    const results = await db
      .select()
      .from(programs)
      .where(sql`LOWER(${programs.code}) = ${cleanCode}`)
      .limit(1);
    return results[0] || null;
  } catch (error) {
    console.error(`Error fetching program by code ${code}:`, error);
    return null;
  }
}

export async function getProgramEnrollmentCount(programId: number): Promise<number> {
  try {
    if (!process.env.POSTGRES_URL) return 0;
    const result = await db
      .select({ count: count() })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.programId, programId),
          ne(enrollments.status, 'cancelled')
        )
      );
    return result[0]?.count ?? 0;
  } catch (error) {
    console.error(`Error fetching enrollment count for program ${programId}:`, error);
    return 0;
  }
}

export async function getStudents(search?: string): Promise<Student[]> {
  try {
    if (!process.env.POSTGRES_URL) return [];
    if (search) {
      return await db
        .select()
        .from(students)
        .where(ilike(students.fullName, `%${search}%`))
        .orderBy(desc(students.createdAt));
    }
    return await db.select().from(students).orderBy(desc(students.createdAt));
  } catch (error) {
    console.error('Error fetching students:', error);
    return [];
  }
}

export async function findStudentByEmail(email: string): Promise<Student | null> {
  try {
    if (!process.env.POSTGRES_URL || !email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const results = await db
      .select()
      .from(students)
      .where(sql`LOWER(${students.email}) = ${cleanEmail}`)
      .limit(1);
    return results[0] || null;
  } catch (error) {
    console.error(`Error finding student by email ${email}:`, error);
    return null;
  }
}

export async function checkExistingEnrollment(
  studentId: number,
  programId: number
): Promise<Enrollment | null> {
  try {
    if (!process.env.POSTGRES_URL) return null;
    const results = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.programId, programId)
        )
      )
      .limit(1);
    return results[0] || null;
  } catch (error) {
    console.error('Error checking existing enrollment:', error);
    return null;
  }
}

export async function createOrUpdateStudent(data: {
  fullName: string;
  email: string;
  phone: string;
  collegeRollNumber: string;
  branch: string;
  year: number;
}): Promise<Student> {
  const cleanEmail = data.email.trim().toLowerCase();
  const existingStudent = await findStudentByEmail(cleanEmail);

  if (existingStudent) {
    // Update existing student details if provided
    const [updated] = await db
      .update(students)
      .set({
        fullName: data.fullName,
        phone: data.phone,
        collegeRollNumber: data.collegeRollNumber,
        branch: data.branch,
        year: data.year
      })
      .where(eq(students.id, existingStudent.id))
      .returning();
    return updated || existingStudent;
  }

  // Create new student
  const [created] = await db
    .insert(students)
    .values({
      fullName: data.fullName,
      email: cleanEmail,
      phone: data.phone,
      collegeRollNumber: data.collegeRollNumber,
      branch: data.branch,
      year: data.year
    })
    .returning();
  return created;
}

export async function createEnrollmentRecord(
  studentId: number,
  programId: number
): Promise<Enrollment> {
  const [created] = await db
    .insert(enrollments)
    .values({
      studentId,
      programId,
      status: 'pending'
    })
    .returning();
  return created;
}

export async function markEnrollmentConfirmationSent(
  enrollmentId: number
): Promise<void> {
  try {
    if (!process.env.POSTGRES_URL) return;
    await db
      .update(enrollments)
      .set({ confirmationSentAt: new Date() })
      .where(eq(enrollments.id, enrollmentId));
  } catch (error) {
    console.error('Failed to update confirmationSentAt timestamp:', error);
  }
}

export async function getEnrollmentsWithDetails(
  search?: string,
  programIdFilter?: number,
  statusFilter?: string
): Promise<DetailedEnrollment[]> {
  try {
    if (!process.env.POSTGRES_URL) return [];

    let conditions = [];

    if (programIdFilter) {
      conditions.push(eq(enrollments.programId, programIdFilter));
    }

    if (statusFilter && statusFilter !== 'all') {
      conditions.push(eq(enrollments.status, statusFilter as any));
    }

    if (search) {
      conditions.push(
        sql`(${students.fullName} ILIKE ${`%${search}%`} OR ${students.email} ILIKE ${`%${search}%`} OR ${programs.name} ILIKE ${`%${search}%`})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        enrollmentId: enrollments.id,
        enrollmentStatus: enrollments.status,
        enrollmentCreatedAt: enrollments.createdAt,
        confirmationSentAt: enrollments.confirmationSentAt,
        studentId: students.id,
        studentFullName: students.fullName,
        studentEmail: students.email,
        studentPhone: students.phone,
        studentRoll: students.collegeRollNumber,
        studentBranch: students.branch,
        studentYear: students.year,
        programId: programs.id,
        programName: programs.name,
        programCode: programs.code,
        programCapacity: programs.capacity
      })
      .from(enrollments)
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .innerJoin(programs, eq(enrollments.programId, programs.id))
      .where(whereClause)
      .orderBy(desc(enrollments.createdAt));

    return rows.map((r) => ({
      id: r.enrollmentId,
      status: r.enrollmentStatus,
      createdAt: r.enrollmentCreatedAt,
      confirmationSentAt: r.confirmationSentAt,
      student: {
        id: r.studentId,
        fullName: r.studentFullName,
        email: r.studentEmail,
        phone: r.studentPhone,
        collegeRollNumber: r.studentRoll,
        branch: r.studentBranch,
        year: r.studentYear
      },
      program: {
        id: r.programId,
        name: r.programName,
        code: r.programCode,
        capacity: r.programCapacity
      }
    }));
  } catch (error) {
    console.error('Error fetching detailed enrollments:', error);
    return [];
  }
}

export async function getEnrollmentsCount(): Promise<number> {
  try {
    if (!process.env.POSTGRES_URL) return 0;
    const result = await db.select({ count: count() }).from(enrollments);
    return result[0]?.count ?? 0;
  } catch (error) {
    console.error('Error fetching enrollments count:', error);
    return 0;
  }
}
