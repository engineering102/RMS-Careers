'use client';

import { useId, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ReviewTransition } from '@rms/academic/review-rules';
import { reviewSubmissionAction, type TutorReviewInput } from './actions';

type TutorTransition = TutorReviewInput['transition'];

const MAX_FEEDBACK = 5000;
const buttonBase =
  'inline-flex min-h-[44px] items-center justify-center rounded-md px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';

/**
 * Review controls for the transitions the server says are available. The version token travels with every
 * request; a conflict freezes the panel behind a banner until the tutor reloads (plan §11).
 */
export function ReviewPanel({
  submissionId,
  version,
  transitions,
  maxScore,
  initialScore,
  initialFeedback
}: {
  submissionId: string;
  version: string;
  transitions: ReviewTransition[];
  maxScore: number;
  initialScore: number | null;
  initialFeedback: string | null;
}) {
  const router = useRouter();
  const ids = { score: useId(), feedback: useId(), error: useId() };
  const [score, setScore] = useState(initialScore === null ? '' : String(initialScore));
  const [feedback, setFeedback] = useState(initialFeedback ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [pending, startTransition] = useTransition();
  const allowed = transitions.filter((t): t is TutorTransition => ['claim', 'approve', 'request_resubmission', 'resume'].includes(t));
  const reviewing = allowed.includes('approve') || allowed.includes('request_resubmission');

  function submit(transition: TutorTransition) {
    setError(null);
    setMessage(null);
    const parsedScore = score.trim() === '' ? null : Number(score);
    if (transition === 'approve' && (parsedScore === null || !Number.isInteger(parsedScore) || parsedScore < 0 || parsedScore > maxScore)) {
      setError(`Enter a whole-number score between 0 and ${maxScore}.`);
      return;
    }
    if (transition === 'request_resubmission' && !feedback.trim()) {
      setError('Write feedback telling the student what to change.');
      return;
    }
    startTransition(async () => {
      const result = await reviewSubmissionAction({
        submissionId,
        expectedVersion: version,
        transition,
        score: transition === 'approve' ? parsedScore : undefined,
        feedback: reviewing ? feedback : undefined
      });
      if (result.success) {
        setMessage(result.message);
        router.refresh();
      } else if (result.code === 'conflict' || result.code === 'forbidden_transition') {
        setConflict(true);
      } else if (result.code === 'unauthorized') {
        window.location.assign('/api/session/revoked');
      } else {
        setError(result.error);
      }
    });
  }

  if (conflict) {
    return (
      <div role="alert" className="space-y-3 rounded-lg border border-warning/50 bg-warning/10 p-4">
        <p className="font-semibold text-foreground">This submission changed. Reload to see the latest.</p>
        <p className="text-sm text-muted-foreground">Someone else acted on it after you opened this page. Nothing you entered was saved.</p>
        <button type="button" className={`${buttonBase} bg-primary text-primary-foreground hover:bg-primary/90`} onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div aria-live="polite" className="min-h-0">
        {message ? <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm text-foreground">{message}</p> : null}
      </div>

      {allowed.length === 0 ? (
        <p className="text-sm text-muted-foreground">There is nothing to do on this submission right now.</p>
      ) : null}

      {allowed.includes('claim') ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Start the review to lock the submission against student edits while you look at it.</p>
          <button type="button" disabled={pending} onClick={() => submit('claim')} className={`${buttonBase} bg-primary text-primary-foreground hover:bg-primary/90`}>
            {pending ? 'Saving…' : 'Start review'}
          </button>
        </div>
      ) : null}

      {allowed.includes('resume') ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">The student was asked for changes. Resume the review if you need to revise your decision before they resubmit.</p>
          <button type="button" disabled={pending} onClick={() => submit('resume')} className={`${buttonBase} border border-border hover:bg-muted`}>
            {pending ? 'Saving…' : 'Resume review'}
          </button>
        </div>
      ) : null}

      {reviewing ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
            if (submitter?.value === 'approve' || submitter?.value === 'request_resubmission') submit(submitter.value);
          }}
        >
          <div className="space-y-1">
            <label htmlFor={ids.score} className="text-sm font-medium">
              Score (0 to {maxScore})
            </label>
            <input
              id={ids.score}
              type="number"
              inputMode="numeric"
              min={0}
              max={maxScore}
              step={1}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              // Enter here must not approve: the form submits only from its buttons (plan §11).
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
              aria-describedby={error ? ids.error : undefined}
              className="min-h-[44px] w-32 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">Required to approve.</p>
          </div>
          <div className="space-y-1">
            <label htmlFor={ids.feedback} className="text-sm font-medium">
              Feedback to the student
            </label>
            <textarea
              id={ids.feedback}
              rows={6}
              maxLength={MAX_FEEDBACK}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              aria-describedby={error ? ids.error : undefined}
              className="w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">Required when requesting changes. {feedback.length}/{MAX_FEEDBACK}</p>
          </div>
          {error ? (
            <p id={ids.error} role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" name="transition" value="approve" disabled={pending} className={`${buttonBase} bg-success text-success-foreground hover:bg-success/90`}>
              {pending ? 'Saving…' : 'Approve'}
            </button>
            <button type="submit" name="transition" value="request_resubmission" disabled={pending} className={`${buttonBase} border border-destructive/50 text-destructive hover:bg-destructive/10`}>
              {pending ? 'Saving…' : 'Request changes'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
