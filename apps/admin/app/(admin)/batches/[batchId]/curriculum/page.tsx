import * as React from 'react';
import { notFound } from 'next/navigation';
import {
  getBatchById,
  getCollegeById,
  getProgramById,
  getBatchCurriculum,
  getEligibleContentForBatch
} from '@/lib/db/queries';
import { BatchCurriculumClient } from './curriculum-client';

export const metadata = {
  title: 'Batch Curriculum Builder | Academy Control Plane'
};

export const dynamic = 'force-dynamic';

export default async function BatchCurriculumPage(props: {
  params: Promise<{ batchId: string }>;
}) {
  const params = await props.params;
  const { batchId } = params;

  const batch = await getBatchById(batchId);
  if (!batch) {
    notFound();
  }

  const [college, program, curriculum, eligibleContent] = await Promise.all([
    getCollegeById(batch.collegeId),
    getProgramById(batch.programId),
    getBatchCurriculum(batchId),
    getEligibleContentForBatch(batchId)
  ]);

  return (
    <BatchCurriculumClient
      batch={batch}
      college={college}
      program={program}
      initialCurriculum={curriculum}
      eligibleContent={eligibleContent}
    />
  );
}
