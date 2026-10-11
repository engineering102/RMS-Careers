import { getProgramsWithCounts, getColleges } from '@/lib/db/queries';
import { ProgramsClient } from './programs-client';
import { requireAdminSession } from '@/lib/authz';

export const metadata = {
  title: 'Programs | Academy Enrollment'
};

export const dynamic = 'force-dynamic';

export default async function ProgramsPage() {
  await requireAdminSession();
  const [programsList, collegesList] = await Promise.all([
    getProgramsWithCounts(),
    getColleges()
  ]);

  return <ProgramsClient initialPrograms={programsList} colleges={collegesList} />;
}
