/**
 * Structured log lines for Workers observability (tutor plan §14.4). Ids, codes and timings only: never emails,
 * names, feedback, submission or meeting URLs, tokens, passwords or raw driver errors.
 */
export type TutorLogEvent =
  | {
      evt: 'tutor.review';
      outcome: 'ok' | 'rejected' | 'error';
      code?: string;
      transition: string;
      submissionId: string;
      batchId?: string;
      tutorId: string;
      ms: number;
    }
  | { evt: 'tutor.authz_denied'; resource: 'batch' | 'submission' | 'student' | 'quiz'; id: string; tutorId: string };

export function logTutorEvent(event: TutorLogEvent): void {
  console.info(JSON.stringify(event));
}
