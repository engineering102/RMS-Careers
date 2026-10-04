import * as React from 'react';
import Link from 'next/link';
import { getEnrollmentsWithDetails, getEnrollmentSummaryStats, getPrograms } from '@/lib/db/queries';
import { EnrollmentsTable } from './enrollments-table';
import { EnrollmentsFilter } from './enrollments-filter';
import { SummaryCards } from './summary-cards';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Enrollments | Academy Enrollment'
};

export default async function EnrollmentsPage(props: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    program?: string;
    year?: string;
    emailStatus?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  const yearNum = searchParams.year ? parseInt(searchParams.year, 10) : undefined;

  const [enrollmentsList, stats, allPrograms] = await Promise.all([
    getEnrollmentsWithDetails({
      search: searchParams.q || undefined,
      programCodeFilter: searchParams.program || undefined,
      statusFilter: searchParams.status || undefined,
      yearFilter: yearNum && !isNaN(yearNum) ? yearNum : undefined,
      emailStatusFilter: searchParams.emailStatus || undefined,
      sort: searchParams.sort || undefined
    }),
    getEnrollmentSummaryStats(),
    getPrograms()
  ]);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Enrollments</h1>
          <p className="text-sm text-muted-foreground">
            View, filter, and manage student registrations across all programs.
          </p>
        </div>
        <Button asChild size="sm" className="h-9 gap-1.5 font-medium">
          <Link href="/enrollments/import">
            <Upload className="h-4 w-4" />
            <span>Import Students</span>
          </Link>
        </Button>
      </div>

      {/* Summary Stats Cards (clickable filters) */}
      <SummaryCards stats={stats} />

      {/* Filter Controls (search + dropdowns) */}
      <EnrollmentsFilter programs={allPrograms} resultCount={enrollmentsList.length} />

      {/* Result count label */}
      {enrollmentsList.length > 0 && (
        <p className="text-xs text-muted-foreground -mt-2 pl-0.5">
          {enrollmentsList.length} enrollment{enrollmentsList.length === 1 ? '' : 's'} match{enrollmentsList.length === 1 ? 'es' : ''} your current filters.
        </p>
      )}

      {/* Enrollments Table */}
      <EnrollmentsTable enrollments={enrollmentsList} totalCount={stats.total} />
    </div>
  );
}
