import * as React from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import {
  getBatchById,
  getCollegeById,
  getProgramById,
  getBatchProjectsOverview,
  getBatchProjectSubmissions
} from '@/lib/db/queries';
import { BatchProjectsClient } from './projects-client';

export const metadata = {
  title: 'Project Evaluation Workbench | Academy Control Plane'
};

export const dynamic = 'force-dynamic';

export default async function BatchProjectsPage(props: {
  params: Promise<{ batchId: string }>;
  searchParams?: Promise<{ assignmentId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const params = await props.params;
  const { batchId } = params;

  const searchParams = props.searchParams ? await props.searchParams : {};
  const queryAssignmentId = searchParams.assignmentId;

  const batch = await getBatchById(batchId);
  if (!batch) {
    notFound();
  }

  const [college, program, overviewItems, initialSubmissions] = await Promise.all([
    getCollegeById(batch.collegeId),
    getProgramById(batch.programId),
    getBatchProjectsOverview(batchId),
    getBatchProjectSubmissions(batchId, {
      assignmentId: queryAssignmentId
    })
  ]);

  return (
    <BatchProjectsClient
      batch={batch}
      college={college}
      program={program}
      overviewItems={overviewItems}
      initialSubmissions={initialSubmissions}
      initialAssignmentId={queryAssignmentId}
    />
  );
}
