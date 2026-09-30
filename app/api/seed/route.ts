import { db, programs, students, enrollments } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Development Seed Route
 * Seeds a minimal set of Academy sample data (programs, students, enrollments)
 * for testing and local verification.
 */
export async function GET() {
  if (!process.env.POSTGRES_URL) {
    return Response.json(
      { error: 'POSTGRES_URL environment variable is not configured.' },
      { status: 500 }
    );
  }

  try {
    // 1. Seed Programs
    const seededPrograms = await db
      .insert(programs)
      .values([
        {
          name: 'Full-Stack Software Engineering',
          code: 'FSSE-2026',
          description: 'Intensive 12-week hands-on software development program.',
          status: 'active',
          capacity: 30,
          startDate: new Date('2026-10-15'),
          endDate: new Date('2027-01-15')
        },
        {
          name: 'Data Analytics & Applied AI',
          code: 'DAAI-2026',
          description: 'Foundations of data science, analysis, and applied AI workflows.',
          status: 'draft',
          capacity: 25,
          startDate: new Date('2026-11-01'),
          endDate: new Date('2027-02-01')
        }
      ])
      .onConflictDoNothing()
      .returning();

    return Response.json({
      message: 'Academy development seed completed successfully.',
      programsCount: seededPrograms.length
    });
  } catch (error) {
    console.error('Seed error:', error);
    return Response.json(
      { error: 'Failed to seed database', details: String(error) },
      { status: 500 }
    );
  }
}
