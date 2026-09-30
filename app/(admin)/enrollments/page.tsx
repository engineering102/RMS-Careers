import * as React from 'react';
import { getEnrollmentsWithDetails } from '@/lib/db';
import { EnrollmentsTable } from './enrollments-table';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Enrollments | Academy Enrollment'
};

export default async function EnrollmentsPage(props: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const search = searchParams.q ?? '';
  const statusFilter = searchParams.status ?? 'all';

  const enrollmentsList = await getEnrollmentsWithDetails(search, undefined, statusFilter);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Enrollments</h1>
          <p className="text-sm text-muted-foreground">
            View and manage student registrations across all programs.
          </p>
        </div>
      </div>

      <EnrollmentsTable enrollments={enrollmentsList} />
    </div>
  );
}
