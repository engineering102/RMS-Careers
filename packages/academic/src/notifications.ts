/**
 * In-app notification text for project reviews (tutor plan §9.3). The `PROJECT_REVIEWED` type and title format match
 * the student portal's dispatcher (apps/student/lib/events/dispatcher.ts), so the student bell and notifications
 * page render these rows like the ones it creates itself. Unlike that template, the body never shows a score that
 * was not given (no "Score: 0" on a request for changes).
 */
import type { ReviewTransition } from './review-rules';

export const PROJECT_REVIEWED = 'PROJECT_REVIEWED';

/** Longest feedback excerpt quoted in a notification body; the full text is on the submission. */
const FEEDBACK_EXCERPT = 300;

export interface ProjectReviewedNotificationInput {
  transition: ReviewTransition;
  projectTitle: string;
  batchId: string;
  score: number | null;
  maxScore: number;
  feedback: string | null;
  reason?: string | null;
}

export interface NotificationContent {
  type: typeof PROJECT_REVIEWED;
  title: string;
  body: string;
  actionUrl: string;
}

function excerpt(text: string | null | undefined): string | null {
  const clean = text?.trim();
  if (!clean) return null;
  return clean.length > FEEDBACK_EXCERPT ? `${clean.slice(0, FEEDBACK_EXCERPT - 1)}…` : clean;
}

/** Notification for a review transition, or null for transitions the student is not notified about. */
export function buildProjectReviewedNotification(input: ProjectReviewedNotificationInput): NotificationContent | null {
  const feedback = excerpt(input.feedback);
  const score = input.score !== null ? ` Score: ${input.score}/${input.maxScore}.` : '';
  let body: string;
  switch (input.transition) {
    case 'approve':
      body = `Your project submission was approved.${score}${feedback ? ` Feedback: ${feedback}` : ''}`;
      break;
    case 'request_resubmission':
      body = `Changes were requested on your project submission.${feedback ? ` Feedback: ${feedback}` : ''}`;
      break;
    case 'reopen': {
      const reason = excerpt(input.reason);
      body = `Your approved project submission was reopened for review.${reason ? ` Reason: ${reason}` : ''}`;
      break;
    }
    case 'correct':
      body = `The review of your approved project submission was updated.${score}${feedback ? ` Feedback: ${feedback}` : ''}`;
      break;
    default:
      return null;
  }
  return {
    type: PROJECT_REVIEWED,
    title: `Project Review: ${input.projectTitle}`,
    body,
    actionUrl: `/batches/${input.batchId}`
  };
}
