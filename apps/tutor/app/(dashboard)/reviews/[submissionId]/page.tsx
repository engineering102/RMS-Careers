import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { db } from '@rms/db';
import { getReviewSubmission } from '@rms/academic/tutor/review-queue';
import { requireTutor } from '@/lib/db/tutor-context';
import { logTutorEvent } from '@/lib/observability';
import { formatIstDate, formatIstDateTime } from '@/lib/format';
import { PageHeader } from '@/components/ui/page-header';
import { SubmissionStatusBadge } from '@/components/reviews/status-badge';
import { ReviewPanel } from './review-panel';

export const metadata = { title: 'Review submission — RMS Tutor Portal' };

/** Student-entered links are shown as links only when they are plain http(s) URLs. */
function SafeLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return <span className="text-muted-foreground">Not provided</span>;
  let ok = false;
  try {
    ok = ['https:', 'http:'].includes(new URL(href).protocol);
  } catch {
    ok = false;
  }
  if (!ok) return <span className="break-all text-muted-foreground">{href}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 break-all text-primary underline-offset-4 hover:underline">
      {href}
      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="sr-only">({label}, opens in a new tab)</span>
    </a>
  );
}

export default async function ReviewSubmissionPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  const tutor = await requireTutor();
  const submission = await getReviewSubmission(db, tutor.scope, submissionId);
  if (!submission) {
    logTutorEvent({ evt: 'tutor.authz_denied', resource: 'submission', id: submissionId.slice(0, 64), tutorId: tutor.tutorId });
    notFound();
  }

  const s = submission;
  const reviewer = s.reviewedByUserId === tutor.userId ? 'You' : s.reviewedByName;

  return (
    <div className="space-y-6">
      <PageHeader
        leading={
          <Link href="/reviews" className="inline-flex min-h-[44px] w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to reviews
          </Link>
        }
        eyebrow={s.batchName}
        title={s.projectTitle}
        description={
          <>
            {s.studentName}
            {s.collegeRollNumber ? ` · ${s.collegeRollNumber}` : ''} · {s.studentEmail}
          </>
        }
        actions={<SubmissionStatusBadge status={s.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section aria-labelledby="submission-heading" className="space-y-3 rounded-lg border border-border bg-card p-4">
            <h2 id="submission-heading" className="font-semibold">Submission</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-[140px_minmax(0,1fr)]">
              <dt className="text-muted-foreground">Repository</dt>
              <dd><SafeLink href={s.githubUrl} label="repository" /></dd>
              <dt className="text-muted-foreground">Live demo</dt>
              <dd><SafeLink href={s.liveUrl} label="live demo" /></dd>
              <dt className="text-muted-foreground">Submitted</dt>
              <dd>
                {formatIstDateTime(s.submittedAt)}
                {s.isResubmission ? ' · resubmitted after review' : ''}
              </dd>
              {s.dueAt ? (
                <>
                  <dt className="text-muted-foreground">Due</dt>
                  <dd>{formatIstDate(s.dueAt)}</dd>
                </>
              ) : null}
              {reviewer ? (
                <>
                  <dt className="text-muted-foreground">Last reviewed by</dt>
                  <dd>
                    {reviewer}
                    {s.reviewedAt ? ` · ${formatIstDateTime(s.reviewedAt)}` : ''}
                  </dd>
                </>
              ) : null}
              {s.score !== null ? (
                <>
                  <dt className="text-muted-foreground">Score</dt>
                  <dd>{s.score} / {s.maxScore}</dd>
                </>
              ) : null}
            </dl>
            {s.notes ? (
              <div className="space-y-1">
                <h3 className="text-sm font-medium">Student notes</h3>
                <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{s.notes}</p>
              </div>
            ) : null}
          </section>

          <section aria-labelledby="brief-heading" className="space-y-3 rounded-lg border border-border bg-card p-4">
            <h2 id="brief-heading" className="font-semibold">
              Project brief{s.weekNumber !== null ? ` · Week ${s.weekNumber}` : ''}
            </h2>
            {s.projectDescription ? (
              <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{s.projectDescription}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No description.</p>
            )}
            {s.rubricCriteria.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Rubric (for reference)</h3>
                <ul className="space-y-2 text-sm">
                  {s.rubricCriteria.map((c, i) => (
                    <li key={c.id ?? i} className="rounded-md border border-border p-3">
                      <p className="font-medium">
                        {c.title} <span className="text-muted-foreground">· {c.maxPoints} pts</span>
                      </p>
                      {c.description ? <p className="mt-1 text-muted-foreground">{c.description}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>

        <section aria-labelledby="review-heading" className="h-fit space-y-3 rounded-lg border border-border bg-card p-4">
          <h2 id="review-heading" className="font-semibold">Review</h2>
          {s.tutorFeedback && s.transitions.length === 0 ? (
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Feedback given</h3>
              <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{s.tutorFeedback}</p>
            </div>
          ) : null}
          <ReviewPanel
            submissionId={s.submissionId}
            version={s.version}
            transitions={s.transitions}
            maxScore={s.maxScore}
            initialScore={s.score}
            initialFeedback={s.tutorFeedback}
          />
        </section>
      </div>
    </div>
  );
}
