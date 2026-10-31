import 'server-only';

import { db, tutors } from '@rms/db';
import { eq } from 'drizzle-orm';

export interface TutorProfile {
  fullName: string;
  headline: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
}

export async function getTutorProfile(tutorId: string): Promise<TutorProfile | null> {
  if (!process.env.POSTGRES_URL) return null;
  const [row] = await db
    .select({
      fullName: tutors.fullName,
      headline: tutors.headline,
      bio: tutors.bio,
      linkedinUrl: tutors.linkedinUrl,
      githubUrl: tutors.githubUrl
    })
    .from(tutors)
    .where(eq(tutors.id, tutorId))
    .limit(1);
  return row ?? null;
}

/**
 * The tutor's own editable fields. Writes the tutors row only, never users.updated_at (that would sign the tutor
 * out everywhere). The full name is managed by the admin team.
 */
export async function updateTutorProfile(
  tutorId: string,
  fields: Pick<TutorProfile, 'headline' | 'bio' | 'linkedinUrl' | 'githubUrl'>
): Promise<boolean> {
  const updated = await db
    .update(tutors)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(tutors.id, tutorId))
    .returning({ id: tutors.id });
  return updated.length === 1;
}
