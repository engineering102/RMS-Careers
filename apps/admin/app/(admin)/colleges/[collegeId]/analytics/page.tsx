import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { requireAdminSession } from '@/lib/authz';
import { getCollegeAnalytics } from '@/lib/db/queries';
import { isPeriodKey, resolvePeriod } from '@/lib/analytics/periods';
import { periodQuery } from '@/lib/analytics/period-format';
import { PeriodPicker } from '@/components/admin/period-picker';
import {
  ACTIVE_DAY_NOTE,
  BatchSummaryTable,
  CollegeTotalsGrid,
  FlagBadges,
  lastActiveLabel
} from '@/components/admin/college-report-sections';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { EmptyState } from '@/components/admin/empty-state';
import { ExportCollegeButton } from './export-college-button';

export const metadata = { title: 'College Analytics | Academy Control Plane' };
export const dynamic = 'force-dynamic';

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
/** Rows shown in the dashboard's attention list; the printable report lists every student. */
const ATTENTION_LIMIT = 50;

export default async function CollegeAnalyticsPage(props: {
  params: Promise<{ collegeId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdminSession();
  const [{ collegeId }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const periodParam = first(searchParams.period);
  const now = new Date();
  const period = resolvePeriod(isPeriodKey(periodParam) ? periodParam : 'this_month', now, {
    from: first(searchParams.from),
    to: first(searchParams.to)
  });

  const data = await getCollegeAnalytics(collegeId, period, now);
  if (!data) notFound();

  const q = periodQuery(period);
  const isSuperAdmin = session.user?.role === 'super_admin';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {isSuperAdmin && (
          <Link
            href="/colleges"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Colleges
          </Link>
        )}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">College analytics</p>
          <h1 className="text-2xl font-bold tracking-tight">{data.college.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[data.college.code, data.college.city, data.college.state].filter(Boolean).join(' · ')}
          </p>
        </div>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex flex-wrap items-end gap-3">
            <PeriodPicker period={period} />
            <div className="ml-auto flex gap-2">
              <ExportCollegeButton collegeId={collegeId} period={period} />
              <Button asChild size="sm" className="h-9 text-xs gap-1.5">
                <Link href={`/colleges/${collegeId}/report?${q}`}>
                  <FileText className="h-3.5 w-3.5" />
                  College report
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {data.batches.length === 0 ? (
        <EmptyState
          title="No students to report on"
          description="None of this college's batches has an active, confirmed or completed enrollment."
        />
      ) : (
        <>
          <CollegeTotalsGrid data={data} />

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Batches</CardTitle>
              <CardDescription className="text-xs">
                A student enrolled in two batches is counted in each batch, and once in the college totals.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <BatchSummaryTable data={data} linkable />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Students needing attention</CardTitle>
              <CardDescription className="text-xs">
                {data.attention.length === 0
                  ? 'No student is flagged for this period.'
                  : `${data.attention.length} flagged, high severity first${data.attention.length > ATTENTION_LIMIT ? `; showing the first ${ATTENTION_LIMIT}` : ''}.`}
              </CardDescription>
            </CardHeader>
            {data.attention.length > 0 && (
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Student</TableHead>
                      <TableHead className="text-xs">Batch</TableHead>
                      <TableHead className="text-xs text-right">Active days</TableHead>
                      <TableHead className="text-xs text-right">Due done</TableHead>
                      <TableHead className="text-xs">Last active</TableHead>
                      <TableHead className="text-xs min-w-[180px]">Flags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.attention.slice(0, ATTENTION_LIMIT).map(({ batchId, batchName, row }) => (
                      <TableRow key={`${batchId}-${row.studentId}`}>
                        <TableCell className="text-xs">
                          <Link
                            href={`/batches/${batchId}/students/${row.studentId}?${q}`}
                            className="font-medium hover:underline underline-offset-4"
                          >
                            {row.fullName}
                          </Link>
                          <div className="text-muted-foreground">{row.collegeRollNumber ?? row.email}</div>
                        </TableCell>
                        <TableCell className="text-xs">{batchName}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {row.activeDays}
                          <span className="text-muted-foreground">/{period.days}</span>
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {row.dueItemsTotal === 0 ? '—' : `${row.dueItemsDone}/${row.dueItemsTotal}`}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {lastActiveLabel(row.lastActiveDate)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <FlagBadges flags={row.flags} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>

          {data.emptyBatches.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Not included (no enrolled students): {data.emptyBatches.map((b) => b.name).join(', ')}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">{ACTIVE_DAY_NOTE}</p>
        </>
      )}
    </div>
  );
}
