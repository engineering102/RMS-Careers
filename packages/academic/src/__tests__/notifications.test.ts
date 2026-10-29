import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { buildProjectReviewedNotification, PROJECT_REVIEWED } from '../notifications';

const base = { projectTitle: 'Raft KV Store', batchId: 'batch-1', maxScore: 100, score: null, feedback: null };

describe('buildProjectReviewedNotification', () => {
  it('notifies approvals with the score and feedback', () => {
    expect(buildProjectReviewedNotification({ ...base, transition: 'approve', score: 92, feedback: 'Great tests' })).toEqual({
      type: PROJECT_REVIEWED,
      title: 'Project Review: Raft KV Store',
      body: 'Your project submission was approved. Score: 92/100. Feedback: Great tests',
      actionUrl: '/batches/batch-1'
    });
  });

  it('never shows a score that was not given (unlike "Score: 0")', () => {
    const changes = buildProjectReviewedNotification({ ...base, transition: 'request_resubmission', feedback: 'Add retries' });
    expect(changes?.body).toBe('Changes were requested on your project submission. Feedback: Add retries');
    expect(changes?.body).not.toMatch(/score/i);
    expect(buildProjectReviewedNotification({ ...base, transition: 'approve' })?.body).toBe('Your project submission was approved.');
  });

  it('notifies reopen with the reason and corrections with the new score', () => {
    expect(buildProjectReviewedNotification({ ...base, transition: 'reopen', reason: 'Plagiarism check' })?.body).toBe(
      'Your approved project submission was reopened for review. Reason: Plagiarism check'
    );
    expect(buildProjectReviewedNotification({ ...base, transition: 'correct', score: 88 })?.body).toBe(
      'The review of your approved project submission was updated. Score: 88/100.'
    );
  });

  it.each(['claim', 'resume'] as const)('does not notify %s', (transition) => {
    expect(buildProjectReviewedNotification({ ...base, transition })).toBeNull();
  });

  it('quotes at most 300 characters of feedback', () => {
    const body = buildProjectReviewedNotification({ ...base, transition: 'request_resubmission', feedback: 'a'.repeat(1000) })!.body;
    const quoted = body.split('Feedback: ')[1];
    expect(quoted).toHaveLength(300);
    expect(quoted.endsWith('…')).toBe(true);
  });

  // The student portal renders PROJECT_REVIEWED rows; keep the type and title format identical to its dispatcher.
  it('matches the student dispatcher type and title format', () => {
    const dispatcher = readFileSync(path.resolve(__dirname, '../../../../apps/student/lib/events/dispatcher.ts'), 'utf8');
    expect(dispatcher).toContain("case 'PROJECT_REVIEWED':");
    expect(dispatcher).toContain('title = `Project Review: ${event.assignmentTitle}`;');
  });
});
