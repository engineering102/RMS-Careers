import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { db } from '@rms/db';
import { getRosterStudent } from '@rms/academic/tutor/roster';
import type { ItemProgressStatus } from '@rms/academic/tutor/progress';
import { requireTutorBatch } from '@/lib/db/tutor-context';
import { logTutorEvent } from '@/lib/observability';
import { CONTENT_TYPE_LABELS, formatIstDate } from '@/lib/format';
import { IndicatorList } from '@/components/batches/indicator-list';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Student progress — RMS Tutor Portal' };

const STATUS_LABELS: Record<ItemProgressStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  needs_revision: 'Changes requested',
  completed: 'Completed'
};
const STATUS_TONE: Record<ItemProgressStatus, string> = {
  not_started: 'border-border text-muted-foreground',
  in_progress: 'border-info/40 bg-info/10 text-info',
  needs_revision: 'border-destructive/40 bg-destructive/10 text-destructive',
  completed: 'border-success/40 bg-success/10 text-success'
};

export default async function StudentProgressPage({ params }: { params: Promise<{ batchId: string; studentId: string }> }) {
  const { batchId, studentId: rawStudentId } = await params;
  const tutor = await requireTutorBatch(batchId);
  const studentId = /^\d{1,10}$/.test(rawStudentId) ? Number(rawStudentId) : NaN;
  const student = Number.isSafeInteger(studentId) ? await getRosterStudent(db, tutor.scope, batchId, studentId) : null;
  if (!student) {
    logTutorEvent({ evt: 'tutor.authz_denied', resource: 'student', id: rawStudentId.slice(0, 32), tutorId: tutor.tutorId });
    notFound();
  }

  const weeks = new Map<number, typeof student.curriculum>();
  for (const item of student.curriculum) weeks.set(item.weekNumber, [...(weeks.get(item.weekNumber) ?? []), item]);
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href={`/batches/${batchId}/students`} className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All students
        </Link>
        <h2 className="text-xl font-semibold">{student.fullName}</h2>
        <p className="break-all text-sm text-muted-foreground">
          {[student.collegeRollNumber, student.branch, student.year ? `Year ${student.year}` : null, student.email].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Completion in this batch</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{student.progress.percentage}%</p>
          <p className="text-xs text-muted-foreground">
            {student.progress.completedRequired} of {student.progress.totalRequired} required items
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last activity in this batch</p>
          <p className="mt-2 text-lg font-semibold">{student.lastActivityAt ? formatIstDate(student.lastActivityAt) : 'None yet'}</p>
          <p className="text-xs text-muted-foreground">Enrolled {formatIstDate(student.enrolledAt)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tutoring signals (not grades)</p>
          <div className="mt-2">
            {student.indicators.length === 0 ? <p className="text-sm text-muted-foreground">None</p> : <IndicatorList indicators={student.indicators} detailed />}
          </div>
        </div>
      </div>

      {student.curriculum.length === 0 ? (
        <p className="text-sm text-muted-foreground">This batch has no published curriculum yet.</p>
      ) : (
        [...weeks.entries()].map(([week, items]) => (
          <section key={week} aria-labelledby={`week-${week}`} className="space-y-2">
            <h3 id={`week-${week}`} className="font-semibold">Week {week}</h3>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {items.map((item) => {
                const p = student.progress.items[item.contentItemId];
                const overdue = p.status !== 'completed' && item.isRequired && item.dueAt !== null && item.dueAt < now;
                return (
                  <li key={item.contentItemId} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {CONTENT_TYPE_LABELS[item.contentType] ?? item.contentType}
                        {item.isRequired ? '' : ' · Optional'}
                        {item.dueAt ? ` · Due ${formatIstDate(item.dueAt)}` : ''}
                        {overdue ? ' · Overdue' : ''}
                        {p.score !== null ? ` · Score ${p.score}${p.maxScore !== null ? `/${p.maxScore}` : ''}` : ''}
                        {p.completedAt ? ` · Completed ${formatIstDate(p.completedAt)}` : ''}
                      </p>
                    </div>
                    <span className={cn('inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', STATUS_TONE[p.status])}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
