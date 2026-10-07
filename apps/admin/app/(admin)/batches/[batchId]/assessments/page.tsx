import * as React from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import {
  getBatchById,
  getCollegeById,
  getProgramById,
  getBatchAssessmentsOverview,
  getBatchAssessmentAttempts
} from '@/lib/db/queries';
import { BatchAssessmentsClient } from './assessments-client';

export const metadata = {
  title: 'Batch Assessment Operations | Academy Control Plane'
};

export const dynamic = 'force-dynamic';

export default async function BatchAssessmentsPage(props: {
  params: Promise<{ batchId: string }>;
  searchParams?: Promise<{ quizId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const params = await props.params;
  const { batchId } = params;

  const searchParams = props.searchParams ? await props.searchParams : {};
  const queryQuizId = searchParams.quizId;

  const batch = await getBatchById(batchId);
  if (!batch) {
    notFound();
  }

  const [college, program, overviewItems] = await Promise.all([
    getCollegeById(batch.collegeId),
    getProgramById(batch.programId),
    getBatchAssessmentsOverview(batchId)
  ]);

  const activeQuizId =
    queryQuizId || (overviewItems.length > 0 ? overviewItems[0].quizId : undefined);

  let initialAttempts: any[] = [];
  if (activeQuizId) {
    initialAttempts = await getBatchAssessmentAttempts(batchId, activeQuizId);
  }

  return (
    <BatchAssessmentsClient
      batch={batch}
      college={college}
      program={program}
      overviewItems={overviewItems}
      initialAttempts={initialAttempts}
      initialQuizId={activeQuizId}
    />
  );
}
