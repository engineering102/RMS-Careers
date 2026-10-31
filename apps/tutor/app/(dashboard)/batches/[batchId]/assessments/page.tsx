import Link from 'next/link';
import { ClipboardCheck } from 'lucide-react';
import { db } from '@rms/db';
import { getBatchAssessmentsOverview } from '@rms/academic/assessments';
import { requireTutorBatch } from '@/lib/db/tutor-context';
import { QUIZ_TYPE_LABELS, formatIstDate } from '@/lib/format';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata = { title: 'Assessments — RMS Tutor Portal' };

/** Participation and summary scores per quiz (plan D-7: no questions, keys or responses). */
export default async function BatchAssessmentsPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const tutor = await requireTutorBatch(batchId);
  const quizzes = await getBatchAssessmentsOverview(db, tutor.scope, batchId);

  if (quizzes.length === 0) {
    return <EmptyState icon={ClipboardCheck} title="No assessments" description="Quizzes placed in this batch's curriculum appear here." />;
  }

  return (
    <section aria-labelledby="assessments-heading" className="space-y-4">
      <h2 id="assessments-heading" className="text-xl font-semibold">Assessments</h2>
      <ul className="grid gap-3 md:grid-cols-2">
        {quizzes.map((q) => (
          <li key={q.quizId} className="rounded-lg border border-border bg-card p-4">
            <Link href={`/batches/${batchId}/assessments/${q.quizId}`} className="font-semibold underline-offset-4 hover:underline">
              {q.title}
            </Link>
            <p className="text-xs text-muted-foreground">
              Week {q.weekNumber} · {QUIZ_TYPE_LABELS[q.quizType] ?? q.quizType}
              {q.timeLimitMinutes ? ` · ${q.timeLimitMinutes} min` : ''}
              {q.dueAt ? ` · Due ${formatIstDate(new Date(q.dueAt))}` : ''}
            </p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Attempts</dt>
                <dd className="tabular-nums">{q.attemptsCompleted} done{q.attemptsInProgress ? `, ${q.attemptsInProgress} open` : ''}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Average</dt>
                <dd className="tabular-nums">{q.averagePercentage === null ? '—' : `${q.averagePercentage}%`}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Pass rate</dt>
                <dd className="tabular-nums">{q.passRatePercent === null ? '—' : `${q.passRatePercent}%`}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">{q.eligibleStudentsCount} enrolled students · pass mark {q.passingScorePercent}%</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
