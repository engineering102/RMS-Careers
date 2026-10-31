import type { SubmissionStatusEnum } from '@rms/db/schema';
import { cn } from '@/lib/utils';

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatusEnum, string> = {
  submitted: 'Awaiting review',
  under_review: 'In review',
  resubmission_requested: 'Changes requested',
  approved: 'Approved'
};

const tone: Record<SubmissionStatusEnum, string> = {
  submitted: 'border-info/40 bg-info/10 text-info',
  under_review: 'border-warning/40 bg-warning/10 text-warning',
  resubmission_requested: 'border-destructive/40 bg-destructive/10 text-destructive',
  approved: 'border-success/40 bg-success/10 text-success'
};

/** Status always as text; the colour only repeats it. */
export function SubmissionStatusBadge({ status, className }: { status: SubmissionStatusEnum; className?: string }) {
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold', tone[status], className)}>
      {SUBMISSION_STATUS_LABELS[status]}
    </span>
  );
}
