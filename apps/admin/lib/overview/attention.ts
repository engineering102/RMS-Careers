// Client-safe shapes and rules for the admin Overview page (the query lives in
// lib/db/queries/overview.ts). Pure: no database, no clock other than the `now` passed in.

export interface OverviewBatch {
  id: string;
  name: string;
  status: string;
  collegeCode: string;
  programCode: string;
  startDate: Date | null;
  endDate: Date | null;
  /** Enrollments that give portal access (active or confirmed). */
  studentCount: number;
  /** Enrollments waiting for an admin to confirm them. */
  pendingCount: number;
  tutorCount: number;
  curriculumCount: number;
  /** Project submissions in `submitted` or `under_review`. */
  awaitingReviewCount: number;
  unpublishedLiveSessionCount: number;
}

export interface OverviewCounts {
  activePrograms: number;
  /** Distinct students with at least one active or confirmed enrollment. */
  studentsWithAccess: number;
  /** Every pending enrollment, including ones not placed in a batch. */
  pendingEnrollments: number;
  tutorsPendingActivation: number;
}

export interface AdminOverview {
  counts: OverviewCounts;
  /** Draft and active batches, newest first. Completed and archived batches need no day-to-day work. */
  batches: OverviewBatch[];
}

export type AttentionTone = 'warning' | 'info';

export interface AttentionItem {
  id: string;
  tone: AttentionTone;
  title: string;
  detail: string;
  href: string;
  action: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The work an administrator has to do now, most blocking first: things that keep students out of
 * the portal or waiting (warning), then housekeeping (info). Every item links to the page where the
 * work is done.
 */
export function buildAttentionItems(overview: AdminOverview, now: Date = new Date()): AttentionItem[] {
  const warnings: AttentionItem[] = [];
  const infos: AttentionItem[] = [];
  const { counts, batches } = overview;

  if (counts.pendingEnrollments > 0) {
    warnings.push({
      id: 'pending-enrollments',
      tone: 'warning',
      title: `${plural(counts.pendingEnrollments, 'enrollment is', 'enrollments are')} waiting for confirmation`,
      detail: 'Pending students have no portal access until they are confirmed.',
      href: '/enrollments?status=pending',
      action: 'Review pending'
    });
  }

  for (const batch of batches) {
    const startsIn = batch.startDate ? batch.startDate.getTime() - now.getTime() : null;

    if (batch.status === 'draft' && startsIn !== null && startsIn <= 7 * DAY_MS) {
      warnings.push({
        id: `draft-${batch.id}`,
        tone: 'warning',
        title: `${batch.name} is still a draft`,
        detail:
          startsIn <= 0
            ? 'Its start date has passed. Students cannot open a draft batch.'
            : 'It starts within a week. Students cannot open a draft batch.',
        href: `/batches/${batch.id}`,
        action: 'Open batch'
      });
    }

    if (batch.status !== 'active') continue;

    if (batch.awaitingReviewCount > 0) {
      warnings.push({
        id: `review-${batch.id}`,
        tone: 'warning',
        title: `${plural(batch.awaitingReviewCount, 'project submission', 'project submissions')} to review in ${batch.name}`,
        detail: 'Students are waiting for a score and feedback.',
        href: `/batches/${batch.id}/projects`,
        action: 'Review projects'
      });
    }

    if (batch.curriculumCount === 0) {
      warnings.push({
        id: `curriculum-${batch.id}`,
        tone: 'warning',
        title: `${batch.name} has no curriculum`,
        detail: 'Students in this batch see an empty workspace.',
        href: `/batches/${batch.id}/curriculum`,
        action: 'Build curriculum'
      });
    }

    if (batch.endDate && batch.endDate.getTime() < now.getTime()) {
      infos.push({
        id: `ended-${batch.id}`,
        tone: 'info',
        title: `${batch.name} is past its end date`,
        detail: 'Mark it completed, or extend the end date if it is still running.',
        href: `/batches/${batch.id}`,
        action: 'Open batch'
      });
    }

    if (batch.studentCount === 0 && batch.pendingCount === 0) {
      infos.push({
        id: `students-${batch.id}`,
        tone: 'info',
        title: `${batch.name} has no students`,
        detail: 'Import a CSV or Excel file, add students one by one, or share the enrollment link.',
        href: `/batches/${batch.id}`,
        action: 'Add students'
      });
    }

    if (batch.tutorCount === 0) {
      infos.push({
        id: `tutor-${batch.id}`,
        tone: 'info',
        title: `${batch.name} has no tutor`,
        detail: 'Assign a tutor so project reviews are not left to administrators.',
        href: `/batches/${batch.id}`,
        action: 'Assign tutor'
      });
    }

    if (batch.unpublishedLiveSessionCount > 0) {
      infos.push({
        id: `live-${batch.id}`,
        tone: 'info',
        title: `${plural(batch.unpublishedLiveSessionCount, 'live session', 'live sessions')} unpublished in ${batch.name}`,
        detail: 'Students only see live sessions after they are published.',
        href: `/batches/${batch.id}/live-lectures`,
        action: 'Open live lectures'
      });
    }
  }

  if (counts.tutorsPendingActivation > 0) {
    infos.push({
      id: 'tutors-pending',
      tone: 'info',
      title: `${plural(counts.tutorsPendingActivation, 'tutor has', 'tutors have')} not activated their account`,
      detail: 'Resend the invitation if the first email was missed or has expired.',
      href: '/tutors',
      action: 'Open tutors'
    });
  }

  return [...warnings, ...infos];
}
