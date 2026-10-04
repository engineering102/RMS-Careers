import 'server-only';

import {
  db,
  students,
  studentStats,
  type Student,
  type StudentStat,
  type DbClient
} from '@rms/db';
import { ilike, desc, sql, eq } from 'drizzle-orm';

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

export async function getStudentsByCollege(collegeId: string): Promise<Student[]> {
  try {
    if (!process.env.POSTGRES_URL || !collegeId) return [];
    return await db
      .select()
      .from(students)
      .where(eq(students.collegeId, collegeId))
      .orderBy(desc(students.createdAt));
  } catch (error) {
    console.error(`Error fetching students for college ${collegeId}:`, error);
    return [];
  }
}

export async function findStudentByEmail(
  email: string,
  client: DbClient = db
): Promise<Student | null> {
  try {
    if (!process.env.POSTGRES_URL || !email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const results = await client
      .select()
      .from(students)
      .where(sql`LOWER(${students.email}) = ${cleanEmail}`)
      .limit(1);
    return results[0] || null;
  } catch (error) {
    console.error(`Error finding student by email ${email}:`, error);
    if (client !== db) throw error;
    return null;
  }
}

export async function createOrUpdateStudent(
  data: {
    fullName: string;
    email: string;
    phone: string;
    collegeRollNumber: string;
    branch: string;
    year: number;
    collegeId?: string | null;
    userId?: string | null;
  },
  client: DbClient = db
): Promise<Student> {
  const cleanEmail = data.email.trim().toLowerCase();
  const existingStudent = await findStudentByEmail(cleanEmail, client);

  if (existingStudent) {
    // Update existing student details if provided
    const [updated] = await client
      .update(students)
      .set({
        fullName: data.fullName,
        phone: data.phone,
        collegeRollNumber: data.collegeRollNumber,
        branch: data.branch,
        year: data.year,
        collegeId: data.collegeId !== undefined ? data.collegeId : existingStudent.collegeId,
        userId: data.userId !== undefined ? data.userId : existingStudent.userId,
        updatedAt: new Date()
      })
      .where(eq(students.id, existingStudent.id))
      .returning();
    return updated || existingStudent;
  }

  // Create new student
  const [created] = await client
    .insert(students)
    .values({
      fullName: data.fullName,
      email: cleanEmail,
      phone: data.phone,
      collegeRollNumber: data.collegeRollNumber,
      branch: data.branch,
      year: data.year,
      collegeId: data.collegeId || null,
      userId: data.userId || null
    })
    .returning();
  return created;
}

/**
 * Transactionally updates student's college affiliation and synchronizes `studentStats.collegeId`.
 *
 * CRITICAL INVARIANT: `student_stats.college_id` must match `students.college_id` at all times.
 * This transaction ensures zero drift between the student's profile and leaderboard index.
 */
export async function updateStudentCollege(
  studentId: number,
  newCollegeId: string
): Promise<{ student: Student; stats: StudentStat | null }> {
  return await db.transaction(async (tx) => {
    // 1. Update students table
    const [updatedStudent] = await tx
      .update(students)
      .set({
        collegeId: newCollegeId,
        updatedAt: new Date()
      })
      .where(eq(students.id, studentId))
      .returning();

    if (!updatedStudent) {
      throw new Error(`Student ${studentId} not found`);
    }

    // 2. Synchronize student_stats table atomically
    const existingStats = await tx
      .select()
      .from(studentStats)
      .where(eq(studentStats.studentId, studentId))
      .limit(1);

    let updatedStats: StudentStat;

    if (existingStats.length > 0) {
      const [res] = await tx
        .update(studentStats)
        .set({
          collegeId: newCollegeId,
          updatedAt: new Date()
        })
        .where(eq(studentStats.studentId, studentId))
        .returning();
      updatedStats = res;
    } else {
      const [res] = await tx
        .insert(studentStats)
        .values({
          studentId,
          collegeId: newCollegeId
        })
        .returning();
      updatedStats = res;
    }

    return {
      student: updatedStudent,
      stats: updatedStats
    };
  });
}
