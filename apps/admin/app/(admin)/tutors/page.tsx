import { listTutors } from '@/lib/db/queries';
import { requireAdminSession } from '@/lib/authz';
import { getTutorPortalUrl } from '@/lib/email/tutor-portal-url';
import { TutorsClient } from './tutors-client';

export const metadata = {
  title: 'Tutors | Academy Enrollment'
};

export const dynamic = 'force-dynamic';

export default async function TutorsPage() {
  await requireAdminSession();
  const tutors = await listTutors();
  return <TutorsClient initialTutors={tutors} invitationsEnabled={getTutorPortalUrl() !== null} />;
}
