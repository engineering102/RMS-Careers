import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { db } from '@rms/db';
import { getQuizParticipation } from '@rms/academic/tutor/assessments';
import { requireTutorBatch } from '@/lib/db/tutor-context';
import { logTutorEvent } from '@/lib/observability';
import { QUIZ_TYPE_LABELS, formatIstDate, formatIstDateTime } from '@/lib/format';

export const metadata = { title: 'Assessment participation — RMS Tutor Portal' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function QuizParticipationPage({ params }: { params: Promise<{ batchId: string; quizId: string }> }) {
  const { batchId, quizId } = await params;
  const tutor = await requireTutorBatch(batchId);
  const quiz = UUID.test(quizId) ? await getQuizParticipation(db, tutor.scope, batchId, quizId) : null;
  if (!quiz) {
    logTutorEvent({ evt: 'tutor.authz_denied', resource: 'quiz', id: quizId.slice(0, 64), tutorId: tutor.tutorId });
    notFound();
  }

  const enrolled = quiz.participants.length + quiz.notAttempted.length;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href={`/batches/${batchId}/assessments`} className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All assessments
        </Link>
        <h2 className="text-xl font-semibold">{quiz.title}</h2>
        <p className="text-sm text-muted-foreground">
          Week {quiz.weekNumber} · {QUIZ_TYPE_LABELS[quiz.quizType] ?? quiz.quizType}
          {quiz.timeLimitMinutes ? ` · ${quiz.timeLimitMinutes} min` : ''}
          {quiz.dueAt ? ` · Due ${formatIstDate(quiz.dueAt)}` : ''} · pass mark {quiz.passingScorePercent}%
        </p>
        <p className="text-sm">
          {quiz.participants.length} of {enrolled} enrolled students attempted it.
        </p>
      </div>

      {quiz.participants.length > 0 ? (
        <section aria-labelledby="participants-heading" className="space-y-2">
          <h3 id="participants-heading" className="font-semibold">Attempted</h3>
          <div className="overflow-x-auto rounded-lg border border-border" role="region" aria-label="Students who attempted" tabIndex={0}>
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Student</th>
                  <th scope="col" className="px-4 py-3 font-medium">Best score</th>
                  <th scope="col" className="px-4 py-3 font-medium">Result</th>
                  <th scope="col" className="px-4 py-3 font-medium">Attempts</th>
                  <th scope="col" className="px-4 py-3 font-medium">Last submitted</th>
                  <th scope="col" className="px-4 py-3 font-medium">Tab switches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quiz.participants.map((p) => (
                  <tr key={p.studentId}>
                    <td className="px-4 py-3">
                      {p.fullName}
                      {p.collegeRollNumber ? <span className="block text-xs text-muted-foreground">{p.collegeRollNumber}</span> : null}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {p.bestScore === null ? 'Not submitted' : `${p.bestScore}/${p.maxScore} (${p.bestPercentage}%)`}
                    </td>
                    <td className="px-4 py-3">{p.bestScore === null ? '—' : p.passed ? 'Passed' : 'Not passed'}</td>
                    <td className="px-4 py-3 tabular-nums">{p.attempts}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{p.lastSubmittedAt ? formatIstDateTime(p.lastSubmittedAt) : '—'}</td>
                    <td className="px-4 py-3 tabular-nums">{p.tabBlurCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="missing-heading" className="space-y-2">
        <h3 id="missing-heading" className="font-semibold">Not attempted ({quiz.notAttempted.length})</h3>
        {quiz.notAttempted.length === 0 ? (
          <p className="text-sm text-muted-foreground">Every enrolled student has attempted this assessment.</p>
        ) : (
          <ul className="grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {quiz.notAttempted.map((s) => (
              <li key={s.studentId}>
                {s.fullName}
                {s.collegeRollNumber ? <span className="text-muted-foreground"> · {s.collegeRollNumber}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
