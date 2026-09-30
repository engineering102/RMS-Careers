import 'server-only';

import { db } from './index';
import { programs, students, enrollments, type Program, type Student } from './schema';
import { eq, ilike, desc, count } from 'drizzle-orm';

export async function getPrograms(search?: string): Promise<Program[]> {
  try {
    if (!process.env.POSTGRES_URL) {
      return [];
    }
    if (search) {
      return await db
        .select()
        .from(programs)
        .where(ilike(programs.name, `%${search}%`))
        .orderBy(desc(programs.createdAt));
    }
    return await db
      .select()
      .from(programs)
      .orderBy(desc(programs.createdAt));
  } catch (error) {
    console.error('Error fetching programs:', error);
    return [];
  }
}

export async function getStudents(search?: string): Promise<Student[]> {
  try {
    if (!process.env.POSTGRES_URL) {
      return [];
    }
    if (search) {
      return await db
        .select()
        .from(students)
        .where(ilike(students.fullName, `%${search}%`))
        .orderBy(desc(students.createdAt));
    }
    return await db
      .select()
      .from(students)
      .orderBy(desc(students.createdAt));
  } catch (error) {
    console.error('Error fetching students:', error);
    return [];
  }
}

export async function getEnrollmentsCount(): Promise<number> {
  try {
    if (!process.env.POSTGRES_URL) {
      return 0;
    }
    const result = await db.select({ count: count() }).from(enrollments);
    return result[0]?.count ?? 0;
  } catch (error) {
    console.error('Error fetching enrollments count:', error);
    return 0;
  }
}
