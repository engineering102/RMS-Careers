import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ContentTypeTag } from '@/components/ui/content-type-tag';
import type { ResumeLearningTarget } from '@/lib/types/progress';
import { formatDate } from '@/lib/format/datetime';
import { dueLabel } from '@/lib/format/relative-dates';
import { buildDsaHref } from '@/lib/dsa/sheet-view';
import { cn } from '@/lib/utils';

interface ResumeLearningCardProps {
  target: ResumeLearningTarget;
}

const SHELL = 'flex flex-col gap-5 rounded-lg border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-6';

function targetHref(target: ResumeLearningTarget): string {
  if (target.contentType === 'dsa_sheet') return buildDsaHref(target.contentSlug, target.batchId);
  if (target.contentType === 'external_test') return '/assessments?type=external';
  return `/content/${encodeURIComponent(target.contentItemId ?? '')}?batchId=${encodeURIComponent(target.batchId || '')}`;
}

/**
 * Quiet state: no next item to open (not enrolled, caught up, or finished). Called as a plain function so the
 * card's root <section> (and its data-testid) is exactly what ResumeLearningCard returns.
 */
function stateCard({
  testId,
  eyebrow,
  title,
  body,
  href,
  cta
}: {
  testId: string;
  eyebrow?: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <section data-testid={testId} aria-labelledby={`${testId}-title`} className={cn(SHELL, 'border-border')}>
      <div className="min-w-0 space-y-1">
        {eyebrow && <p className="text-sm text-muted-foreground">{eyebrow}</p>}
        <h2 id={`${testId}-title`} className="font-display text-lg font-semibold leading-snug tracking-tight text-foreground">
          {title}
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
      <Button asChild variant="outline" className="shrink-0">
        <Link href={href}>{cta}</Link>
      </Button>
    </section>
  );
}

/**
 * "Up next": the single most useful thing to open, or a calm note when there is nothing to open.
 * Always the first thing on Home.
 */
export function ResumeLearningCard({ target }: ResumeLearningCardProps) {
  if (target.hasNoEnrollments) {
    return stateCard({
      testId: 'resume-learning-no-enrollment',
      title: "You're not in a batch yet",
      body: 'Your college adds you to a batch. Until then, the library is open to you.',
      href: '/library',
      cta: 'Open library'
    });
  }

  if (target.isCurriculumCompleted) {
    return stateCard({
      testId: 'resume-learning-completed',
      eyebrow: target.batchName,
      title: "You've finished the curriculum",
      body: 'Every scheduled item is done. Keep your problem-solving sharp with DSA practice.',
      href: '/dsa',
      cta: 'Practise DSA'
    });
  }

  if (target.isCaughtUp) {
    const opens = target.nextUnlockDate
      ? formatDate(target.nextUnlockDate, { weekday: 'long', day: 'numeric', month: 'short' })
      : null;
    return stateCard({
      testId: 'resume-learning-caught-up',
      eyebrow: target.batchName,
      title: "You're up to date",
      body: opens
        ? `The next week opens on ${opens}. Practise DSA until then.`
        : 'The next week opens soon. Practise DSA until then.',
      href: '/dsa',
      cta: 'Practise DSA'
    });
  }

  if (!target.hasTarget || !target.contentItemId) return null;

  const isRevision = target.status === 'needs_revision';
  const isInProgress = target.status === 'in_progress';
  const percent = target.completionPercentage ?? 0;
  const due = target.dueAt ? dueLabel(target.dueAt) : null;
  const cta = isRevision ? 'Revise submission' : isInProgress ? 'Continue' : 'Start';
  const context = isRevision ? 'Your tutor asked for changes' : isInProgress ? 'Continue where you left off' : 'Up next';

  return (
    <section
      data-testid="resume-learning-card"
      aria-labelledby="resume-learning-title"
      className={cn(SHELL, isRevision ? 'border-destructive/40' : 'border-border')}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <ContentTypeTag type={target.contentType} />
          <span className={isRevision ? 'font-medium text-destructive' : 'text-muted-foreground'}>{context}</span>
          {target.weekNumber !== undefined && <span className="text-muted-foreground">Week {target.weekNumber}</span>}
        </p>
        <h2
          id="resume-learning-title"
          className="text-balance font-display text-xl font-semibold leading-snug tracking-tight text-foreground"
        >
          {target.contentTitle}
        </h2>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-sm">
          {due && (
            <span
              className={cn(
                'tabular',
                due.tone === 'overdue' ? 'font-medium text-destructive' : due.tone === 'soon' ? 'font-medium text-warning' : 'text-muted-foreground'
              )}
            >
              {due.tone === 'overdue' ? 'Overdue' : `Due ${due.text.replace(/^(Today|Tomorrow)$/, (m) => m.toLowerCase())}`}
            </span>
          )}
          <span className="flex items-center gap-3 text-muted-foreground">
            <Progress value={percent} label={`${target.batchName ?? 'Batch'} progress`} className="w-32 sm:w-40" />
            <span className="tabular text-xs">{percent}% of batch</span>
          </span>
        </div>
      </div>

      <Button asChild size="lg" variant={isRevision ? 'destructive' : 'default'} className="w-full shrink-0 sm:w-auto">
        <Link href={targetHref(target)}>
          {cta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}
