import * as React from 'react';
import {
  getBatchesWithDetails,
  getColleges,
  getPrograms
} from '@/lib/db/queries';
import { BatchesClient } from './batches-client';

export const metadata = {
  title: 'Batches | Academy Enrollment'
};

export const dynamic = 'force-dynamic';

export default async function BatchesPage(props: {
  searchParams: Promise<{
    college?: string;
    program?: string;
    q?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  const collegeId = searchParams.college || undefined;
  const programId = searchParams.program
    ? parseInt(searchParams.program, 10)
    : undefined;
  const searchQuery = searchParams.q || undefined;

  const [batchesList, collegesList, programsList] = await Promise.all([
    getBatchesWithDetails({
      collegeId,
      programId: programId && !isNaN(programId) ? programId : undefined,
      search: searchQuery
    }),
    getColleges(),
    getPrograms()
  ]);

  return (
    <BatchesClient
      initialBatches={batchesList}
      colleges={collegesList}
      programs={programsList}
      selectedCollegeId={collegeId}
      selectedProgramId={programId && !isNaN(programId) ? programId : undefined}
      searchQuery={searchQuery}
    />
  );
}
