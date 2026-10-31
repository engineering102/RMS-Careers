import Link from 'next/link';
import type { ReviewQueueRow } from '@rms/academic/tutor/review-queue';
import { SubmissionStatusBadge } from './status-badge';
import { formatIstDate, waitingFor } from '@/lib/format';

/**
 * Queue rows: a table from `md`, cards below it (no horizontal page scroll at 375 px). Each row links to the
 * review page; links are in reading order for keyboard users.
 */
export function ReviewQueueList({ rows, userId, showBatch = true }: { rows: ReviewQueueRow[]; userId: string; showBatch?: boolean }) {
  const now = new Date();
  const reviewer = (r: ReviewQueueRow) =>
    r.status === 'submitted' && !r.isResubmission ? '—' : r.reviewedByUserId === userId ? 'You' : (r.reviewedByName ?? '—');

  return (
    <>
      <ul className="space-y-3 md:hidden">
        {rows.map((r) => (
          <li key={r.submissionId} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/reviews/${r.submissionId}`} className="font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {r.projectTitle}
              </Link>
              <SubmissionStatusBadge status={r.status} />
            </div>
            <p className="mt-1 text-sm text-foreground">
              {r.studentName}
              {r.collegeRollNumber ? <span className="text-muted-foreground"> · {r.collegeRollNumber}</span> : null}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {showBatch ? `${r.batchName} · ` : ''}Submitted {formatIstDate(r.submittedAt)} ({waitingFor(r.submittedAt, now)})
              {r.isResubmission ? ' · Resubmission' : ''}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Reviewer: {reviewer(r)}</p>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-lg border border-border md:block" role="region" aria-label="Submissions" tabIndex={0}>
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Project</th>
              <th scope="col" className="px-4 py-3 font-medium">Student</th>
              {showBatch ? <th scope="col" className="px-4 py-3 font-medium">Batch</th> : null}
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Submitted</th>
              <th scope="col" className="px-4 py-3 font-medium">Reviewer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.submissionId} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link href={`/reviews/${r.submissionId}`} className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {r.projectTitle}
                  </Link>
                  {r.isResubmission ? <span className="ml-2 text-xs text-muted-foreground">Resubmission</span> : null}
                </td>
                <td className="px-4 py-3">
                  {r.studentName}
                  {r.collegeRollNumber ? <span className="block text-xs text-muted-foreground">{r.collegeRollNumber}</span> : null}
                </td>
                {showBatch ? <td className="px-4 py-3 text-muted-foreground">{r.batchName}</td> : null}
                <td className="px-4 py-3"><SubmissionStatusBadge status={r.status} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {formatIstDate(r.submittedAt)}
                  <span className="block text-xs">{waitingFor(r.submittedAt, now)}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{reviewer(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
