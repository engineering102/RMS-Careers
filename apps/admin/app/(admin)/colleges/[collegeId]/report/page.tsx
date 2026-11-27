import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireAdminSession } from '@/lib/authz';
import { getCollegeAnalytics } from '@/lib/db/queries';
import { isPeriodKey, resolvePeriod } from '@/lib/analytics/periods';
import { formatIstDay, periodQuery } from '@/lib/analytics/period-format';
import { PeriodPicker, PrintButton } from '@/components/admin/period-picker';
import {
  ACTIVE_DAY_NOTE,
  BatchSummaryTable,
  CollegeTotalsGrid,
  FlagBadges,
  lastActiveLabel
} from '@/components/admin/college-report-sections';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils/format-date';

export const metadata = { title: 'College Report | Academy Control Plane' };
export const dynamic = 'force-dynamic';

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Printable college report: summary, batch table and every student per batch. Print or "Save as PDF"
 * from the browser; the admin sidebar and header are hidden in print (see (admin)/layout.tsx).
 */
export default async function CollegeReportPage(props: {
  params: Promise<{ collegeId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const [{ collegeId }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const periodParam = first(searchParams.period);
  const now = new Date();
  const period = resolvePeriod(isPeriodKey(periodParam) ? periodParam : 'this_month', now, {
    from: first(searchParams.from),
    to: first(searchParams.to)
  });

  const data = await getCollegeAnalytics(collegeId, period, now);
  if (!data) notFound();

  return (
    <article className="mx-auto w-full max-w-5xl rounded-lg border bg-background p-6 shadow-sm space-y-6 print:max-w-none print:border-0 print:p-0 print:shadow-none print:text-[11px]">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <Link
          href={`/colleges/${collegeId}/analytics?${periodQuery(period)}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          College analytics
        </Link>
        <div className="flex flex-wrap items-end gap-3">
          <PeriodPicker period={period} />
          <PrintButton />
        </div>
      </div>

      <header className="border-b pb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          RMS Careers · Student progress report
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{data.college.name}</h1>
        <p className="text-sm">
          {period.label}: {formatIstDay(period.from)} to {formatIstDay(period.to)} ({period.days} days, IST)
        </p>
        <p className="text-xs text-muted-foreground">Generated {formatDate(now)}</p>
      </header>

      {data.batches.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          None of this college&apos;s batches has enrolled students to report on.
        </p>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-base font-semibold">Summary</h2>
            <CollegeTotalsGrid data={data} />
          </section>

          <section className="space-y-2 break-inside-avoid">
            <h2 className="text-base font-semibold">Batches</h2>
            <div className="rounded-lg border overflow-x-auto">
              <BatchSummaryTable data={data} linkable={false} />
            </div>
          </section>

          {data.batches.map(({ batch, rows }) => (
            <section key={batch.id} className="space-y-2 print:break-before-page">
              <h2 className="text-base font-semibold">
                {batch.name}
                <span className="font-normal text-muted-foreground">
                  {' '}
                  · {rows.length} student{rows.length === 1 ? '' : 's'}
                </span>
              </h2>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Student</TableHead>
                      <TableHead className="text-xs text-right">Active days</TableHead>
                      <TableHead className="text-xs text-right">Lectures</TableHead>
                      <TableHead className="text-xs text-right">DSA</TableHead>
                      <TableHead className="text-xs text-right">Quiz avg</TableHead>
                      <TableHead className="text-xs text-right">Projects</TableHead>
                      <TableHead className="text-xs text-right">Due done</TableHead>
                      <TableHead className="text-xs">Last active</TableHead>
                      <TableHead className="text-xs min-w-[160px]">Flags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.studentId} className="break-inside-avoid">
                        <TableCell className="text-xs">
                          <div className="font-medium">{r.fullName}</div>
                          <div className="text-muted-foreground">{r.collegeRollNumber ?? r.email}</div>
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {r.activeDays}
                          <span className="text-muted-foreground">/{period.days}</span>
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{r.lecturesCompleted}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{r.dsaSolved}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {r.quizAveragePercent === null ? '—' : `${r.quizAveragePercent}%`}
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{r.projectsSubmitted}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {r.dueItemsTotal === 0 ? '—' : `${r.dueItemsDone}/${r.dueItemsTotal}`}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{lastActiveLabel(r.lastActiveDate)}</TableCell>
                        <TableCell className="text-xs">
                          <FlagBadges flags={r.flags} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          ))}

          <footer className="border-t pt-3 text-[11px] text-muted-foreground space-y-1">
            <p>{ACTIVE_DAY_NOTE}</p>
            <p>
              Figures come from activity recorded on the RMS Careers student portal. Sign-in history, time spent and
              live-lecture attendance are not recorded and are not part of this report.
            </p>
          </footer>
        </>
      )}
    </article>
  );
}
