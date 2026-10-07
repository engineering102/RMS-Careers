import * as React from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getBatchAcademicAnalytics } from '@/lib/db/queries';
import { BatchAnalyticsClient } from './analytics-client';

export const metadata = {
  title: 'Batch Academic Analytics & Reporting | Academy Control Plane'
};

export const dynamic = 'force-dynamic';

export default async function BatchAnalyticsPage(props: {
  params: Promise<{ batchId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const params = await props.params;
  const { batchId } = params;

  const data = await getBatchAcademicAnalytics(batchId);
  if (!data) {
    notFound();
  }

  return <BatchAnalyticsClient data={data} />;
}
