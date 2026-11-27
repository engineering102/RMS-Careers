import * as React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { requireAdminSession } from '@/lib/authz';
import { getStudentReportCard } from '@/lib/db/queries';
import { isPeriodKey, resolvePeriod } from '@/lib/analytics/periods';
import { PeriodPicker, PrintButton } from '@/components/admin/period-picker';
import { formatIstDay, periodQuery } from '@/lib/analytics/period-format';
import { ActivityBars } from '@/components/admin/activity-bars';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils/format-date';

export const metadata = { title: 'Student Report Card | Academy Control Plane' };
export const dynamic = 'force-dynamic';

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  resubmission_requested: 'Changes requested'
};

function Metric({
  label,
  value,
  note
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-background p-3 break-inside-avoid">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
      {note && <div className="text-[11px] text-muted-foreground">{note}</div>}
    </div>
  );
}

export default async function StudentReportCardPage(props: {
  params: Promise<{ batchId: string; studentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const [{ batchId, studentId: rawStudentId }, searchParams] = await Promise.all([
    props.params,
    props.searchParams
  ]);
  const studentId = Number(rawStudentId);
  if (!Number.isInteger(studentId) || studentId <= 0) notFound();

  const periodParam = first(searchParams.period);
  const now = new Date();
  const period = resolvePeriod(isPeriodKey(periodParam) ? periodParam : 'this_month', now, {
    from: first(searchParams.from),
    to: first(searchParams.to)
  });

  const card = await getStudentReportCard(batchId, studentId, period, now);
  if (!card) notFound();

  const { student, batchAverages: avg, weekProgress } = card;
  const curriculumTotal = weekProgress.reduce((t, w) => t + w.total, 0);
  const curriculumDone = weekProgress.reduce((t, w) => t + w.done, 0);

  return (
    <div className="flex flex-col gap-6 max-w-5xl print:max-w-none print:gap-4 print:text-[11px]">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground print:hidden">
          <Link
            href={`/batches/${batchId}/analytics?${periodQuery(period)}`}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {card.batch.name} · Student Activity
          </Link>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Student report card
            </p>
            <h1 className="text-2xl font-bold tracking-tight">{student.fullName}</h1>
            <p className="text-sm text-muted-foreground">
              {[
                student.collegeRollNumber,
                student.branch,
                student.year ? `Year ${student.year}` : null,
                student.email
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <p className="text-sm text-muted-foreground">
              {[card.college?.name, card.programName, card.batch.name].filter(Boolean).join(' · ')}
            </p>
          </div>
          {/* On screen the period picker shows the range; on paper this line does. */}
          <div className="hidden print:block text-right text-xs text-muted-foreground">
            <div className="font-medium text-foreground">
              {period.label}: {formatIstDay(period.from)} to {formatIstDay(period.to)}
            </div>
            <div>{period.days} days (IST) · generated {formatDate(now)}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <PeriodPicker period={period} />
          <PrintButton />
        </div>
      </div>

      {/* Period metrics */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">This period, compared with the batch average</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 print:grid-cols-6">
          <Metric
            label="Active days"
            value={
              <>
                {student.activeDays}
                <span className="text-sm font-normal text-muted-foreground">/{period.days}</span>
              </>
            }
            note={`Batch avg ${avg.activeDays} · previous ${student.prevActiveDays}`}
          />
          <Metric label="Lectures completed" value={student.lecturesCompleted} note={`Batch avg ${avg.lecturesCompleted}`} />
          <Metric label="DSA problems solved" value={student.dsaSolved} note={`Batch avg ${avg.dsaSolved}`} />
          <Metric
            label="Quiz average"
            value={student.quizAveragePercent === null ? '—' : `${student.quizAveragePercent}%`}
            note={`${student.quizzesSubmitted} attempt${student.quizzesSubmitted === 1 ? '' : 's'} · batch ${avg.quizAveragePercent === null ? '—' : `${avg.quizAveragePercent}%`}`}
          />
          <Metric
            label="Projects"
            value={student.projectsSubmitted}
            note={`submitted · ${student.projectsApproved} approved`}
          />
          <Metric label="XP earned" value={student.xp} note={`Batch avg ${avg.xp}`} />
        </div>
      </section>

      {/* Flags */}
      <section className="space-y-2 break-inside-avoid">
        <h2 className="text-sm font-semibold">Needs attention</h2>
        {student.flags.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            No concerns flagged for this period.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {student.flags.map((f) => (
              <li key={f.code} className="flex items-start gap-2 text-sm">
                <Badge
                  variant={f.severity === 'high' ? 'destructive' : 'outline'}
                  className="gap-1 text-[10px] font-normal whitespace-nowrap"
                >
                  {f.severity === 'high' && <AlertTriangle className="h-3 w-3" />}
                  {f.label}
                </Badge>
                <span className="text-muted-foreground">{f.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2 print:grid-cols-2">
        {/* Activity */}
        <Card className="shadow-sm break-inside-avoid">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activity</CardTitle>
            <CardDescription className="text-xs">
              Last active {student.lastActiveDate ? formatIstDay(student.lastActiveDate) : 'never'}
              {student.lastLoginAt ? ` · last sign-in ${formatDate(student.lastLoginAt)}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityBars buckets={card.activity} />
          </CardContent>
        </Card>

        {/* Curriculum progress */}
        <Card className="shadow-sm break-inside-avoid">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Curriculum progress</CardTitle>
            <CardDescription className="text-xs">
              Required lectures, quizzes and projects, as of today: {curriculumDone} of {curriculumTotal} done
            </CardDescription>
          </CardHeader>
          <CardContent>
            {weekProgress.length === 0 ? (
              <p className="text-sm text-muted-foreground">No required items in this batch&apos;s curriculum.</p>
            ) : (
              <ul className="space-y-1.5 max-h-72 overflow-y-auto print:max-h-none print:overflow-visible">
                {weekProgress.map((w) => {
                  const pct = w.total > 0 ? Math.round((w.done / w.total) * 100) : 0;
                  return (
                    <li
                      key={w.weekNumber}
                      className="grid grid-cols-[4rem_1fr_3.5rem] items-center gap-2 text-xs"
                      title={w.pendingTitles.length > 0 ? `Not done: ${w.pendingTitles.join(', ')}` : 'All done'}
                    >
                      <span className="text-muted-foreground">Week {w.weekNumber}</span>
                      <span className="h-2 rounded-full bg-muted overflow-hidden">
                        <span
                          className="block h-full rounded-full bg-primary/80 print:bg-neutral-700"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="text-right tabular-nums">
                        {w.done}/{w.total}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue */}
      {student.overdueItems.length > 0 && (
        <Card className="shadow-sm break-inside-avoid">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Overdue items</CardTitle>
            <CardDescription className="text-xs">
              Required items due by {formatIstDay(period.to)} that are not done yet
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Week</TableHead>
                  <TableHead className="text-xs">Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {student.overdueItems.map((i, idx) => (
                  <TableRow key={`${i.kind}-${idx}`}>
                    <TableCell className="text-xs">{i.title}</TableCell>
                    <TableCell className="text-xs capitalize">{i.kind}</TableCell>
                    <TableCell className="text-xs">{i.weekNumber}</TableCell>
                    <TableCell className="text-xs">{formatDate(i.dueAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Assessments */}
      <div className="grid gap-4 lg:grid-cols-2 print:grid-cols-1">
        <Card className="shadow-sm break-inside-avoid">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quiz attempts</CardTitle>
            <CardDescription className="text-xs">Most recent first; attempts in this period are marked</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {card.quizHistory.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No quiz attempts yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Quiz</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs text-right">Score</TableHead>
                    <TableHead className="text-xs">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {card.quizHistory.map((q, idx) => (
                    <TableRow key={idx} className={q.inPeriod ? '' : 'text-muted-foreground'}>
                      <TableCell className="text-xs">
                        {q.title}
                        {q.inPeriod && (
                          <Badge variant="secondary" className="ml-1.5 text-[10px] font-normal">
                            this period
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{formatDate(q.submittedAt)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {q.score}/{q.maxScore}
                        {q.percent !== null && ` (${q.percent}%)`}
                      </TableCell>
                      <TableCell className="text-xs">{q.isPassed ? 'Passed' : 'Not passed'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="shadow-sm break-inside-avoid">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Projects</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {card.projects.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground">No project submissions yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Project</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Score</TableHead>
                      <TableHead className="text-xs">Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {card.projects.map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs">{p.title}</TableCell>
                        <TableCell className="text-xs">{STATUS_LABELS[p.status] ?? p.status}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {p.score === null ? '—' : `${p.score}/${p.maxScore}`}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(p.submittedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm break-inside-avoid">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">External tests</CardTitle>
              <CardDescription className="text-xs">Dates are when results were imported</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {card.externalTests.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground">No external test results.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Test</TableHead>
                      <TableHead className="text-xs text-right">Score</TableHead>
                      <TableHead className="text-xs text-right">Percentile</TableHead>
                      <TableHead className="text-xs">Imported</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {card.externalTests.map((e, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs">
                          {e.name}
                          <span className="text-muted-foreground"> · {e.provider}</span>
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {e.obtainedScore}/{e.maxScore}
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {e.percentile ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(e.importedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground border-t pt-3">
        An active day is a day with a lecture completed, a DSA problem solved or a quiz completed in this batch.
        Overdue items are required curriculum items whose deadline has passed; completion is shown as of the date
        this report was generated. Batch averages cover every student enrolled in {card.batch.name}.
      </p>
    </div>
  );
}
