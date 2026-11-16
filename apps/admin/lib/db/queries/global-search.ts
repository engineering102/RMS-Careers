import 'server-only';

import { db, batches, colleges, contentItems, enrollments, programs, students, tutors, users } from '@rms/db';
import { asc, desc, eq, or, sql } from 'drizzle-orm';

export type GlobalSearchGroup = 'Students' | 'Batches' | 'Programs' | 'Colleges' | 'Tutors' | 'Content';

export interface GlobalSearchResult {
  group: GlobalSearchGroup;
  /** Unique within the result list. */
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

const PER_GROUP = 5;

/** Escapes LIKE wildcards so a typed `%` or `_` matches itself. */
export function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * One search box for the whole portal: students (by name, email or roll number, one row per
 * enrollment so the result opens the right batch), batches, programs, tutors, content and, for
 * super administrators, colleges. At most five rows per group; read-only.
 */
export async function searchEverything(
  rawTerm: string,
  options: { includeColleges: boolean }
): Promise<GlobalSearchResult[]> {
  const term = rawTerm.trim();
  if (term.length < 2 || !process.env.POSTGRES_URL) return [];
  const pattern = likePattern(term);
  const like = (column: unknown) => sql`${column} ILIKE ${pattern}`;

  try {
    const [studentRows, batchRows, programRows, tutorRows, contentRows, collegeRows] = await Promise.all([
      db
        .select({
          enrollmentId: enrollments.id,
          status: enrollments.status,
          studentId: students.id,
          fullName: students.fullName,
          email: students.email,
          batchId: batches.id,
          batchName: batches.name,
          programCode: programs.code
        })
        .from(enrollments)
        .innerJoin(students, eq(enrollments.studentId, students.id))
        .innerJoin(programs, eq(enrollments.programId, programs.id))
        .leftJoin(batches, eq(enrollments.batchId, batches.id))
        .where(or(like(students.fullName), like(students.email), like(students.collegeRollNumber)))
        .orderBy(asc(students.fullName), desc(enrollments.createdAt))
        .limit(PER_GROUP + 3),
      db
        .select({ id: batches.id, name: batches.name, status: batches.status, collegeCode: colleges.code, programCode: programs.code })
        .from(batches)
        .innerJoin(colleges, eq(batches.collegeId, colleges.id))
        .innerJoin(programs, eq(batches.programId, programs.id))
        .where(like(batches.name))
        .orderBy(desc(batches.createdAt))
        .limit(PER_GROUP),
      db
        .select({ id: programs.id, name: programs.name, code: programs.code, status: programs.status })
        .from(programs)
        .where(or(like(programs.name), like(programs.code)))
        .orderBy(asc(programs.name))
        .limit(PER_GROUP),
      db
        .select({ id: tutors.id, fullName: tutors.fullName, email: users.email })
        .from(tutors)
        .innerJoin(users, eq(users.id, tutors.userId))
        .where(or(like(tutors.fullName), like(users.email)))
        .orderBy(asc(tutors.fullName))
        .limit(PER_GROUP),
      db
        .select({ id: contentItems.id, title: contentItems.title, contentType: contentItems.contentType, isPublished: contentItems.isPublished })
        .from(contentItems)
        .where(or(like(contentItems.title), like(contentItems.slug)))
        .orderBy(desc(contentItems.updatedAt))
        .limit(PER_GROUP),
      options.includeColleges
        ? db
            .select({ id: colleges.id, name: colleges.name, code: colleges.code })
            .from(colleges)
            .where(or(like(colleges.name), like(colleges.code)))
            .orderBy(asc(colleges.name))
            .limit(PER_GROUP)
        : Promise.resolve([])
    ]);

    return [
      ...studentRows.map<GlobalSearchResult>((r) => ({
        group: 'Students',
        id: `enrollment-${r.enrollmentId}`,
        title: r.fullName,
        subtitle: `${r.email} · ${r.batchName ?? `${r.programCode}, no batch`} · ${r.status}`,
        // The student id, not the email, goes in the URL: it stays out of browser history and logs.
        href: r.batchId ? `/batches/${r.batchId}?student=${r.studentId}` : `/enrollments?q=${encodeURIComponent(r.fullName)}`
      })),
      ...batchRows.map<GlobalSearchResult>((r) => ({
        group: 'Batches',
        id: `batch-${r.id}`,
        title: r.name,
        subtitle: `${r.collegeCode} · ${r.programCode} · ${r.status}`,
        href: `/batches/${r.id}`
      })),
      ...programRows.map<GlobalSearchResult>((r) => ({
        group: 'Programs',
        id: `program-${r.id}`,
        title: r.name,
        subtitle: `${r.code} · ${r.status} · open its enrollments`,
        href: `/enrollments?program=${encodeURIComponent(r.code)}`
      })),
      ...collegeRows.map<GlobalSearchResult>((r) => ({
        group: 'Colleges',
        id: `college-${r.id}`,
        title: r.name,
        subtitle: `${r.code} · open its batches`,
        href: `/batches?college=${r.id}`
      })),
      ...tutorRows.map<GlobalSearchResult>((r) => ({
        group: 'Tutors',
        id: `tutor-${r.id}`,
        title: r.fullName,
        subtitle: r.email,
        href: '/tutors'
      })),
      ...contentRows.map<GlobalSearchResult>((r) => ({
        group: 'Content',
        id: `content-${r.id}`,
        title: r.title,
        subtitle: `${r.contentType.replace(/_/g, ' ')} · ${r.isPublished ? 'published' : 'draft'}`,
        href: `/content/${r.id}`
      }))
    ];
  } catch (error) {
    console.error('Error in global search:', error instanceof Error ? error.message : 'unknown');
    return [];
  }
}
