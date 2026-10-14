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
import { requireAdminSession } from '@/lib/authz';

export const metadata = {
  title: 'Batch Curriculum Builder | Academy Control Plane'
};

export const dynamic = 'force-dynamic';

/**
 * Upper bound for the Add Content picker (the query defaults to 100, which silently hid everything
 * after the first 100 titles). The picker says so if a batch ever reaches this many eligible items.
 */
const ELIGIBLE_CONTENT_LIMIT = 1000;

export default async function BatchCurriculumPage(props: {
  params: Promise<{ batchId: string }>;
}) {
  await requireAdminSession();
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
    getEligibleContentForBatch(batchId, { limit: ELIGIBLE_CONTENT_LIMIT })
  ]);

  return (
    <BatchCurriculumClient
      batch={batch}
      college={college}
      program={program}
      initialCurriculum={curriculum}
      eligibleContent={eligibleContent}
      eligibleContentLimit={ELIGIBLE_CONTENT_LIMIT}
    />
  );
}
