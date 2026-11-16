'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CheckCheck, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ACCESS_GRANTING_STATUSES, type BatchRosterEntry } from '@/lib/batches/roster';
import { formatDate } from '@/lib/utils/format-date';
import { cn } from '@/lib/utils';
import { confirmBatchEnrollmentsAction } from './students/actions';

type RosterFilter = 'all' | 'access' | 'pending' | 'other';

const FILTER_LABEL: Record<RosterFilter, string> = {
  all: 'All',
  access: 'With access',
  pending: 'Pending',
  other: 'Other'
};

function bucketOf(status: BatchRosterEntry['status']): Exclude<RosterFilter, 'all'> {
  if (ACCESS_GRANTING_STATUSES.includes(status)) return 'access';
  return status === 'pending' ? 'pending' : 'other';
}

function StatusBadge({ status }: { status: BatchRosterEntry['status'] }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  if (status === 'active' || status === 'confirmed') {
    return <Badge className="border-0 bg-emerald-600 text-white hover:bg-emerald-600/90">{label}</Badge>;
  }
  if (status === 'pending') return <Badge variant="secondary">{label}</Badge>;
  return <Badge variant="outline">{label}</Badge>;
}

/**
 * The batch's students with a search box, status filters and confirmation of pending students
 * without leaving the batch. `?student=<id>` (set by the global search) narrows the list to one
 * student.
 */
export function RosterTable({ batchId, roster }: { batchId: string; roster: BatchRosterEntry[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const focusedStudentId = Number(searchParams.get('student')) || null;

  const [term, setTerm] = React.useState('');
  const [filter, setFilter] = React.useState<RosterFilter>('all');
  const [confirmTarget, setConfirmTarget] = React.useState<{ ids: number[]; label: string } | null>(null);
  const [pending, setPending] = React.useState(false);

  const counts = React.useMemo(() => {
    const c: Record<RosterFilter, number> = { all: roster.length, access: 0, pending: 0, other: 0 };
    for (const entry of roster) c[bucketOf(entry.status)]++;
    return c;
  }, [roster]);

  const focused = focusedStudentId ? roster.find((e) => e.student.id === focusedStudentId) : undefined;

  const visible = React.useMemo(() => {
    if (focused) return [focused];
    const needle = term.trim().toLowerCase();
    return roster.filter((entry) => {
      if (filter !== 'all' && bucketOf(entry.status) !== filter) return false;
      if (!needle) return true;
      const { fullName, email, collegeRollNumber, branch } = entry.student;
      return [fullName, email, collegeRollNumber, branch].some((v) => v?.toLowerCase().includes(needle));
    });
  }, [roster, term, filter, focused]);

  const pendingIds = React.useMemo(
    () => roster.filter((e) => e.status === 'pending').map((e) => e.enrollmentId),
    [roster]
  );

  const clearFocus = () => router.replace(pathname ?? `/batches/${batchId}`);

  const runConfirm = async () => {
    if (!confirmTarget) return;
    setPending(true);
    try {
      const res = await confirmBatchEnrollmentsAction(batchId, confirmTarget.ids);
      if (res.success) {
        toast.success(
          `Confirmed ${res.data.confirmed} ${res.data.confirmed === 1 ? 'student' : 'students'}. They now have portal access.`
        );
        setConfirmTarget(null);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error('An unexpected error occurred while confirming students.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search name, email, roll number…"
            aria-label="Search students in this batch"
            className="h-9 pl-9 text-sm"
            disabled={Boolean(focused)}
          />
        </div>
        <div role="group" aria-label="Filter students by status" className="flex flex-wrap gap-1">
          {(Object.keys(FILTER_LABEL) as RosterFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              disabled={Boolean(focused)}
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                filter === key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:text-foreground'
              )}
            >
              {FILTER_LABEL[key]} <span className="tabular-nums">{counts[key]}</span>
            </button>
          ))}
        </div>
        {pendingIds.length > 0 ? (
          <Button
            type="button"
            size="sm"
            className="ml-auto gap-1.5"
            onClick={() =>
              setConfirmTarget({
                ids: pendingIds,
                label: `all ${pendingIds.length} pending ${pendingIds.length === 1 ? 'student' : 'students'}`
              })
            }
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            Confirm all pending ({pendingIds.length})
          </Button>
        ) : null}
      </div>

      {focused ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          Showing {focused.student.fullName} only.
          <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={clearFocus}>
            <X className="h-3 w-3" aria-hidden="true" />
            Show all students
          </Button>
        </p>
      ) : null}

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
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No students match this search or filter.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((entry) => (
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
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={entry.status} />
                      {entry.status === 'pending' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          aria-label={`Confirm ${entry.student.fullName}`}
                          onClick={() => setConfirmTarget({ ids: [entry.enrollmentId], label: entry.student.fullName })}
                        >
                          Confirm
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatDate(entry.enrolledAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(next) => !next && !pending && setConfirmTarget(null)}
        title="Confirm enrollment"
        description={
          confirmTarget
            ? `Confirm ${confirmTarget.label}? Confirmed students can sign in to the Student Portal and open this batch.`
            : undefined
        }
        confirmLabel="Confirm"
        pendingLabel="Confirming…"
        pending={pending}
        onConfirm={runConfirm}
      />
    </div>
  );
}
