import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Users } from 'lucide-react';
import {
  getBatchById,
  getCollegeById,
  getProgramById,
  getBatchRoster,
  getProgramEnrollmentCount
} from '@/lib/db/queries';
import { enrollmentLinkAvailability } from '@/lib/enrollment/link-availability';
import { AddStudentsMenu } from './add-students-menu';
import { requireAdminSession } from '@/lib/authz';
import { summarizeRoster, type BatchRosterEntry } from '@/lib/batches/roster';
import { formatDate } from '@/lib/utils/format-date';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/admin/empty-state';
import { BatchNav } from '@/components/admin/batch-nav';

export const metadata = {
  title: 'Batch Overview | Academy Control Plane'
};

export const dynamic = 'force-dynamic';

function StatusBadge({ status }: { status: BatchRosterEntry['status'] }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  if (status === 'active' || status === 'confirmed') {
    return <Badge className="border-0 bg-emerald-600 text-white hover:bg-emerald-600/90">{label}</Badge>;
  }
  if (status === 'pending') return <Badge variant="secondary">{label}</Badge>;
  return <Badge variant="outline">{label}</Badge>;
}

export default async function BatchOverviewPage(props: { params: Promise<{ batchId: string }> }) {
  await requireAdminSession();
  const { batchId } = await props.params;

  const batch = await getBatchById(batchId);
  if (!batch) notFound();

  const [college, program, roster, programEnrolledCount] = await Promise.all([
    getCollegeById(batch.collegeId),
    getProgramById(batch.programId),
    getBatchRoster(batch.id),
    getProgramEnrollmentCount(batch.programId)
  ]);
  const summary = summarizeRoster(roster);

  const timeline =
    batch.startDate && batch.endDate
      ? `${formatDate(batch.startDate)} – ${formatDate(batch.endDate)}`
      : batch.startDate
        ? `From ${formatDate(batch.startDate)}`
        : 'Timeline not set';

  const stats = [
    { label: 'Students in batch', value: summary.total, hint: 'All enrollments, any status' },
    { label: 'With portal access', value: summary.withAccess, hint: 'Active or confirmed' },
    { label: 'Pending confirmation', value: summary.pending, hint: 'No portal access yet' },
    { label: 'Other statuses', value: summary.other, hint: 'Waitlisted, cancelled, completed, …' }
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        leading={
          <Link
            href="/batches"
            className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All batches
          </Link>
        }
        eyebrow={program ? `${program.name} (${program.code})` : 'Batch'}
        title={batch.name}
        actions={
          program ? (
            <AddStudentsMenu
              batchId={batch.id}
              batchName={batch.name}
              program={{ name: program.name, code: program.code }}
              collegeLabel={college ? `${college.name} (${college.code})` : 'Unknown college'}
              linkAvailability={enrollmentLinkAvailability(program, programEnrolledCount)}
            />
          ) : null
        }
        description={
          <>
            {college ? `${college.name} (${college.code})` : 'Unknown college'} · {timeline} · Status:{' '}
            <span className="font-medium text-foreground">{batch.status}</span>
          </>
        }
      />

      <BatchNav batchId={batch.id} active="overview" />

      <section aria-labelledby="roster-summary-heading" className="flex flex-col gap-3">
        <h2 id="roster-summary-heading" className="sr-only">
          Roster summary
        </h2>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="shadow-sm">
              <CardContent className="p-4">
                <dt className="text-xs font-medium text-muted-foreground">{stat.label}</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums">{stat.value}</dd>
                <dd className="text-xs text-muted-foreground">{stat.hint}</dd>
              </CardContent>
            </Card>
          ))}
        </dl>
        {summary.pending > 0 && program ? (
          <p className="text-sm text-muted-foreground">
            {summary.pending} {summary.pending === 1 ? 'student is' : 'students are'} waiting for confirmation.{' '}
            <Link
              href={`/enrollments?program=${encodeURIComponent(program.code)}&status=pending`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Review pending enrollments in {program.code}
            </Link>{' '}
            (the Enrollments page filters by program, so it also lists other batches of this program).
          </p>
        ) : null}
      </section>

      <section aria-labelledby="roster-heading" className="flex flex-col gap-3">
        <h2 id="roster-heading" className="text-lg font-semibold">
          Students
        </h2>
        {roster.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students in this batch yet"
            description="Use Add students to import a CSV or Excel file into this batch, or to share the program's enrollment link."
          />
        ) : (
          <Card className="overflow-x-auto shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Student</TableHead>
                  <TableHead>Roll number</TableHead>
                  <TableHead>Branch / year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Enrolled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map((entry) => (
                  <TableRow key={entry.enrollmentId}>
                    <TableCell>
                      <div className="font-medium">{entry.student.fullName}</div>
                      <div className="break-all text-xs text-muted-foreground">{entry.student.email}</div>
                    </TableCell>
                    <TableCell className="text-sm">{entry.student.collegeRollNumber ?? '—'}</TableCell>
                    <TableCell className="text-sm">
                      {[entry.student.branch, entry.student.year ? `Year ${entry.student.year}` : null]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={entry.status} />
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDate(entry.enrolledAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>
    </div>
  );
}
