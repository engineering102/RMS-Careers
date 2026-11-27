import * as React from 'react';
import { notFound } from 'next/navigation';
import { getBatchAcademicAnalytics, getStudentPeriodAnalytics } from '@/lib/db/queries';
import { BatchAnalyticsClient } from './analytics-client';
import { requireAdminSession } from '@/lib/authz';
import { isPeriodKey, resolvePeriod } from '@/lib/analytics/periods';

export const metadata = {
  title: 'Batch Academic Analytics & Reporting | Academy Control Plane'
};

export const dynamic = 'force-dynamic';

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function BatchAnalyticsPage(props: {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();

  const [{ batchId }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const periodParam = first(searchParams.period);
  const now = new Date();
  const period = resolvePeriod(isPeriodKey(periodParam) ? periodParam : 'this_week', now, {
    from: first(searchParams.from),
    to: first(searchParams.to)
  });

  const [data, studentActivity] = await Promise.all([
    getBatchAcademicAnalytics(batchId),
    getStudentPeriodAnalytics(batchId, period, now)
  ]);
  if (!data) {
    notFound();
  }

  // Opening a period link (or ?tab=students) lands on the Student Activity tab.
  const initialTab = periodParam || first(searchParams.tab) === 'students' ? 'students' : 'overview';

  return (
    <BatchAnalyticsClient data={data} studentActivity={studentActivity} initialTab={initialTab} />
  );
}
