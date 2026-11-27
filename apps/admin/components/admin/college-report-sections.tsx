import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import type { CollegeAnalytics } from '@/lib/db/queries/college-analytics';
import type { RiskFlag } from '@/lib/analytics/student-period-metrics';
import { formatIstDay, periodQuery } from '@/lib/analytics/period-format';

/** Shared by the college dashboard and the printable college report (server components). */

export function CollegeTotalsGrid({ data }: { data: CollegeAnalytics }) {
  const t = data.totals;
  const tiles: Array<[string, React.ReactNode, string]> = [
    ['Students', t.students, `${t.batches} batch${t.batches === 1 ? '' : 'es'}`],
    ['Active this period', `${t.activeStudents}`, `${t.engagementRate}% engagement`],
    ['Lectures completed', t.lecturesCompleted, 'Across all batches'],
    ['DSA problems solved', t.dsaSolved, 'Across all batches'],
    ['Quiz attempts', t.quizzesSubmitted, 'Across all batches'],
    ['Need attention', t.studentsFlagged, `${t.studentsFlaggedHigh} high severity`]
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 print:grid-cols-6">
      {tiles.map(([label, value, note]) => (
        <div key={label} className="rounded-lg border bg-background p-3 break-inside-avoid">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold tabular-nums">{value}</div>
          <div className="text-[11px] text-muted-foreground">{note}</div>
        </div>
      ))}
    </div>
  );
}

export function BatchSummaryTable({ data, linkable }: { data: CollegeAnalytics; linkable: boolean }) {
  const q = periodQuery(data.period);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">Batch</TableHead>
          <TableHead className="text-xs text-right">Students</TableHead>
          <TableHead className="text-xs text-right">Active</TableHead>
          <TableHead className="text-xs text-right">Avg active days</TableHead>
          <TableHead className="text-xs text-right">Lectures</TableHead>
          <TableHead className="text-xs text-right">DSA</TableHead>
          <TableHead className="text-xs text-right">Quiz avg</TableHead>
          <TableHead className="text-xs text-right">Projects</TableHead>
          <TableHead className="text-xs text-right">Flagged</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.batches.map(({ batch, summary }) => (
          <TableRow key={batch.id}>
            <TableCell className="text-xs">
              {linkable ? (
                <Link
                  href={`/batches/${batch.id}/analytics?${q}`}
                  className="font-medium hover:underline underline-offset-4"
                >
                  {batch.name}
                </Link>
              ) : (
                <span className="font-medium">{batch.name}</span>
              )}
              {batch.programName && <div className="text-muted-foreground">{batch.programName}</div>}
            </TableCell>
            <TableCell className="text-xs text-right tabular-nums">{summary.enrolledStudents}</TableCell>
            <TableCell className="text-xs text-right tabular-nums">
              {summary.activeStudents}
              <span className="text-muted-foreground"> ({summary.engagementRate}%)</span>
            </TableCell>
            <TableCell className="text-xs text-right tabular-nums">{summary.averageActiveDays}</TableCell>
            <TableCell className="text-xs text-right tabular-nums">{summary.lecturesCompleted}</TableCell>
            <TableCell className="text-xs text-right tabular-nums">{summary.dsaSolved}</TableCell>
            <TableCell className="text-xs text-right tabular-nums">
              {summary.quizAveragePercent === null ? '—' : `${summary.quizAveragePercent}%`}
            </TableCell>
            <TableCell className="text-xs text-right tabular-nums">{summary.projectsSubmitted}</TableCell>
            <TableCell className="text-xs text-right tabular-nums">
              {summary.studentsFlagged}
              {summary.studentsFlaggedHigh > 0 && (
                <span className="text-destructive"> ({summary.studentsFlaggedHigh} high)</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function FlagBadges({ flags }: { flags: RiskFlag[] }) {
  if (flags.length === 0) return <span className="text-muted-foreground">None</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {flags.map((f) => (
        <Badge
          key={f.code}
          variant={f.severity === 'high' ? 'destructive' : 'outline'}
          className="text-[10px] gap-1 font-normal whitespace-nowrap"
          title={f.detail}
        >
          {f.severity === 'high' && <AlertTriangle className="h-3 w-3" />}
          {f.label}
        </Badge>
      ))}
    </div>
  );
}

export function lastActiveLabel(day: string | null): string {
  return day ? formatIstDay(day) : 'Never';
}

export const ACTIVE_DAY_NOTE =
  'An active day is a day with a lecture completed, a DSA problem solved or a quiz completed in the batch. ' +
  'Overdue items are required lectures, quizzes and projects whose deadline has passed by the end of the period; ' +
  'completion is shown as of the date this report was generated.';
