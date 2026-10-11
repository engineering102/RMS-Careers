import * as React from 'react';
import { notFound, redirect } from 'next/navigation';
import {
  getBatchById,
  getCollegeById,
  getProgramById,
  getBatchExternalAssessmentsOverview,
  getBatchExternalAssessmentRecords
} from '@/lib/db/queries';
import { BatchExternalAssessmentsClient } from './external-assessments-client';
import { requireAdminSession } from '@/lib/authz';

export const metadata = {
  title: 'External Assessment Ingestion | Academy Control Plane'
};

export const dynamic = 'force-dynamic';

export default async function BatchExternalAssessmentsPage(props: {
  params: Promise<{ batchId: string }>;
  searchParams?: Promise<{ assessmentCode?: string; provider?: string }>;
}) {
  const session = await requireAdminSession();

  const params = await props.params;
  const { batchId } = params;

  const searchParams = props.searchParams ? await props.searchParams : {};

  const batch = await getBatchById(batchId);
  if (!batch) {
    notFound();
  }

  const [college, program, overview, initialRecords] = await Promise.all([
    getCollegeById(batch.collegeId),
    getProgramById(batch.programId),
    getBatchExternalAssessmentsOverview(batchId),
    getBatchExternalAssessmentRecords(batchId, {
      assessmentCode: searchParams.assessmentCode,
      provider: searchParams.provider
    })
  ]);

  return (
    <BatchExternalAssessmentsClient
      batch={batch}
      college={college}
      program={program}
      overview={overview}
      initialRecords={initialRecords}
    />
  );
}
