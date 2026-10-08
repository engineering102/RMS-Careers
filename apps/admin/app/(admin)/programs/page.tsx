import { getProgramsWithCounts, getColleges } from '@/lib/db/queries';
import { ProgramsClient } from './programs-client';

export const metadata = {
  title: 'Programs | Academy Enrollment'
};

export const dynamic = 'force-dynamic';

export default async function ProgramsPage() {
  const [programsList, collegesList] = await Promise.all([
    getProgramsWithCounts(),
    getColleges()
  ]);

  return <ProgramsClient initialPrograms={programsList} colleges={collegesList} />;
}
