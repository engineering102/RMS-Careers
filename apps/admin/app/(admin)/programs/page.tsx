import { getProgramsWithCounts } from '@/lib/db/queries';
import { ProgramsClient } from './programs-client';

export const metadata = {
  title: 'Programs | Academy Enrollment'
};

export const dynamic = 'force-dynamic';

export default async function ProgramsPage() {
  const programsList = await getProgramsWithCounts();

  return <ProgramsClient initialPrograms={programsList} />;
}
