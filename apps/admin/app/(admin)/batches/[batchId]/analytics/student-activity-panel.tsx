'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarRange,
  Download,
  Search,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { EmptyState } from '@/components/admin/empty-state';
import { formatDate } from '@/lib/utils/format-date';
import { PERIOD_KEYS, PERIOD_LABELS, type PeriodKey } from '@/lib/analytics/periods';
import type { StudentPeriodRow } from '@/lib/analytics/student-period-metrics';
import type { StudentPeriodAnalytics } from '@/lib/db/queries/student-period-analytics';
import { exportStudentActivityCsvAction } from './student-activity-actions';

type RowFilter = 'all' | 'flagged' | 'high' | 'inactive' | 'clear';

const ROW_FILTER_LABELS: Record<RowFilter, string> = {
  all: 'All students',
  flagged: 'Any flag',
  high: 'High severity',
  inactive: 'Inactive',
  clear: 'No flags'
};

function formatIstDay(day: string | null): string {
  // 'YYYY-MM-DD' IST day -> "02 Oct 2026". Noon IST keeps the formatter on the same day.
  return day ? formatDate(`${day}T12:00:00+05:30`) : '';
}

function Trend({ row }: { row: StudentPeriodRow }) {
  const title = `Previous period: ${row.prevActiveDays} active day${row.prevActiveDays === 1 ? '' : 's'}`;
  if (row.trend === 'up') {
    return <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" aria-label={title}><title>{title}</title></ArrowUpRight>;
  }
  if (row.trend === 'down') {
    return <ArrowDownRight className="h-3.5 w-3.5 text-destructive" aria-label={title}><title>{title}</title></ArrowDownRight>;
  }
  return <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-label={title}><title>{title}</title></ArrowRight>;
}

function Delta({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (diff === 0) return <span>Same as previous period</span>;
  return (
    <span className={diff > 0 ? 'text-emerald-600' : 'text-destructive'}>
      {diff > 0 ? '+' : ''}
      {diff} vs previous period
    </span>
  );
}

export function StudentActivityPanel({
  batchId,
  data
}: {
  batchId: string;
  data: StudentPeriodAnalytics | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = React.useTransition();
  const [customFrom, setCustomFrom] = React.useState(data?.period.from ?? '');
  const [customTo, setCustomTo] = React.useState(data?.period.to ?? '');
  const [periodChoice, setPeriodChoice] = React.useState<PeriodKey>(data?.period.key ?? 'this_week');
  const [search, setSearch] = React.useState('');
  const [rowFilter, setRowFilter] = React.useState<RowFilter>('all');
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    if (!data) return;
    setPeriodChoice(data.period.key);
    setCustomFrom(data.period.from);
    setCustomTo(data.period.to);
  }, [data]);

  const navigate = (key: PeriodKey, from?: string, to?: string) => {
    const params = new URLSearchParams({ period: key });
    if (key === 'custom' && from && to) {
      params.set('from', from);
      params.set('to', to);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  const rows = React.useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.report.rows.filter((r) => {
      if (rowFilter === 'flagged' && r.flags.length === 0) return false;
      if (rowFilter === 'high' && !r.flags.some((f) => f.severity === 'high')) return false;
      if (rowFilter === 'inactive' && !r.flags.some((f) => f.code === 'inactive')) return false;
      if (rowFilter === 'clear' && r.flags.length > 0) return false;
      if (!q) return true;
      return (
        r.fullName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.collegeRollNumber?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [data, search, rowFilter]);

  if (!data) {
    return (
      <EmptyState
        icon={Users}
        title="Student activity is unavailable"
        description="The database is not configured for this environment."
      />
    );
  }

  const { period, report } = data;
  const { summary } = report;

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await exportStudentActivityCsvAction({
        batchId,
        period: period.key,
        from: period.key === 'custom' ? period.from : null,
        to: period.key === 'custom' ? period.to : null
      });
      if (!res.success || !res.csvContent || !res.filename) {
        toast.error(res.error || 'Failed to export student activity.');
        return;
      }
      const blob = new Blob([res.csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', res.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Student activity exported.');
    } catch {
      toast.error('An unexpected error occurred while exporting.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={`space-y-4 ${isPending ? 'opacity-60 transition-opacity' : ''}`} aria-busy={isPending}>
      {/* Period selector */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="sa-period">
              Period
            </label>
            <Select
              value={periodChoice}
              onValueChange={(v) => {
                const key = v as PeriodKey;
                setPeriodChoice(key);
                if (key !== 'custom') navigate(key);
              }}
            >
              <SelectTrigger id="sa-period" className="w-44 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_KEYS.map((k) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {PERIOD_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {periodChoice === 'custom' && (
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!customFrom || !customTo || customFrom > customTo) {
                  toast.error('Choose a start date on or before the end date.');
                  return;
                }
                navigate('custom', customFrom, customTo);
              }}
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="sa-from">
                  From
                </label>
                <Input
                  id="sa-from"
                  type="date"
                  className="h-9 text-xs w-40"
                  value={customFrom}
                  max={customTo || undefined}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="sa-to">
                  To
                </label>
                <Input
                  id="sa-to"
                  type="date"
                  className="h-9 text-xs w-40"
                  value={customTo}
                  min={customFrom || undefined}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </div>
              <Button type="submit" size="sm" className="h-9 text-xs" disabled={isPending}>
                Apply
              </Button>
            </form>
          )}

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pb-2">
            <CalendarRange className="h-3.5 w-3.5" />
            <span>
              {formatIstDay(period.from)} to {formatIstDay(period.to)} · {period.days} day
              {period.days === 1 ? '' : 's'} (IST)
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5 ml-auto"
            onClick={handleExport}
            disabled={exporting || isPending}
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Active students</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {summary.activeStudents}
              <span className="text-sm font-normal text-muted-foreground"> / {summary.enrolledStudents}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            <Delta current={summary.activeStudents} previous={summary.prevActiveStudents} />
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Engagement rate</CardDescription>
            <CardTitle className="text-2xl font-bold">{summary.engagementRate}%</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Avg {summary.averageActiveDays} active days per student
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Lectures completed</CardDescription>
            <CardTitle className="text-2xl font-bold">{summary.lecturesCompleted}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">Across the batch</CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">DSA problems solved</CardDescription>
            <CardTitle className="text-2xl font-bold">{summary.dsaSolved}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">Across the batch</CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Quiz attempts</CardDescription>
            <CardTitle className="text-2xl font-bold">{summary.quizzesSubmitted}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            {summary.quizAveragePercent === null ? 'No attempts' : `Average ${summary.quizAveragePercent}%`}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Needs attention</CardDescription>
            <CardTitle className="text-2xl font-bold text-destructive">{summary.studentsFlagged}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            {summary.studentsFlaggedHigh} high severity
          </CardContent>
        </Card>
      </div>

      {/* Student table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Students</CardTitle>
          <CardDescription className="text-xs">
            An active day is a day with a lecture completed, a DSA problem solved or a quiz completed in this
            batch. Due items are required lectures, quizzes and projects whose deadline has passed by the end
            of the period; whether they are done is shown as of now.
          </CardDescription>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search name, email or roll number"
                className="h-9 pl-8 text-xs w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search students"
              />
            </div>
            <Select value={rowFilter} onValueChange={(v) => setRowFilter(v as RowFilter)}>
              <SelectTrigger className="w-40 h-9 text-xs" aria-label="Filter students">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROW_FILTER_LABELS) as RowFilter[]).map((k) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {ROW_FILTER_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {rows.length} of {report.rows.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {report.rows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title="No enrolled students"
                description="Students with an active, confirmed or completed enrollment appear here."
              />
            </div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">No students match these filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Student</TableHead>
                    <TableHead className="text-xs text-right">Active days</TableHead>
                    <TableHead className="text-xs text-right">Lectures</TableHead>
                    <TableHead className="text-xs text-right">DSA</TableHead>
                    <TableHead className="text-xs text-right">Quizzes</TableHead>
                    <TableHead className="text-xs text-right">Projects</TableHead>
                    <TableHead className="text-xs text-right">Due done</TableHead>
                    <TableHead className="text-xs text-right">XP</TableHead>
                    <TableHead className="text-xs">Last active</TableHead>
                    <TableHead className="text-xs min-w-[180px]">Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.studentId}>
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">{r.fullName}</div>
                        <div className="text-muted-foreground">
                          {r.collegeRollNumber ? `${r.collegeRollNumber} · ` : ''}
                          {r.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        <span className="inline-flex items-center gap-1 justify-end">
                          <span>
                            {r.activeDays}
                            <span className="text-muted-foreground">/{period.days}</span>
                          </span>
                          <Trend row={r} />
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{r.lecturesCompleted}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{r.dsaSolved}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {r.quizzesSubmitted}
                        {r.quizAveragePercent !== null && (
                          <span className="text-muted-foreground"> · {r.quizAveragePercent}%</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {r.projectsSubmitted}
                        {r.projectsApproved > 0 && (
                          <span className="text-muted-foreground"> · {r.projectsApproved} approved</span>
                        )}
                      </TableCell>
                      <TableCell
                        className="text-xs text-right tabular-nums"
                        title={
                          r.overdueItems.length > 0
                            ? `Not done: ${r.overdueItems.map((i) => i.title).join(', ')}`
                            : undefined
                        }
                      >
                        {r.dueItemsTotal === 0 ? (
                          <span className="text-muted-foreground">None due</span>
                        ) : (
                          `${r.dueItemsDone}/${r.dueItemsTotal}`
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{r.xp}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {r.lastActiveDate ? formatIstDay(r.lastActiveDate) : 'Never'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.flags.length === 0 ? (
                          <span className="text-muted-foreground">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {r.flags.map((f) => (
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
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
