// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const quizActions = vi.hoisted(() => ({
  startFormalAssessmentAttempt: vi.fn(),
  submitFormalAssessment: vi.fn()
}));
vi.mock('@/lib/actions/quiz', () => quizActions);

import { FormalAssessmentRunner } from '../assessments/formal-assessment-runner';
import type { FormalAssessmentRunnerData } from '@/lib/types/assessments';

beforeEach(() => {
  quizActions.submitFormalAssessment.mockReset();
  quizActions.startFormalAssessmentAttempt.mockReset();
  window.localStorage.clear();
  window.scrollTo = vi.fn() as never;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function data(remainingMs = 10 * 60_000): FormalAssessmentRunnerData {
  const now = Date.now();
  return {
    id: 'quiz-1',
    contentItemId: 'ci-1',
    programName: 'Full Stack',
    programCode: 'FS-1',
    batchId: 'batch-1',
    batchName: 'Batch Beta',
    title: 'Midterm',
    description: null,
    timeLimitMinutes: 30,
    passingScorePercent: 60,
    totalPoints: 2,
    availableFrom: null,
    dueAt: null,
    status: 'in_progress' as FormalAssessmentRunnerData['status'],
    questions: [1, 2].map((n) => ({
      id: n,
      questionText: `Question ${n}`,
      questionType: 'single_choice' as const,
      options: [
        { id: 'a', text: 'Option A' },
        { id: 'b', text: 'Option B' }
      ],
      points: 1,
      sequenceOrder: n
    })),
    activeAttempt: {
      id: 'attempt-1',
      startedAt: new Date(now - 60_000),
      authoritativeDeadline: new Date(now + remainingMs),
      remainingSeconds: Math.floor(remainingMs / 1000),
      responses: { 1: ['a'] },
      tabBlurCount: 0
    },
    completedAttempt: null
  };
}

const success = {
  success: true,
  data: {
    attemptId: 'attempt-1',
    submittedAt: new Date(),
    score: 1,
    maxScore: 2,
    percentage: 50,
    isPassed: false,
    tabBlurCount: 0,
    isAutoSubmitted: false,
    explanationsSuppressed: true,
    publishDate: null,
    questionResults: []
  }
};

const dialog = () => screen.getByRole('alertdialog');

describe('Formal assessment: final-submission confirmation', () => {
  it('Submit Exam opens an accessible confirmation with the answered count; nothing is submitted', async () => {
    const user = userEvent.setup();
    render(<FormalAssessmentRunner initialData={data()} />);
    await user.click(screen.getByRole('button', { name: /Submit Exam/ }));

    expect(within(dialog()).getByText('Confirm Final Submission')).toBeTruthy();
    expect(dialog().textContent).toMatch(/answered 1 of 2 questions/);
    expect(dialog().getAttribute('aria-describedby')).toBeTruthy();
    expect(dialog().contains(document.activeElement)).toBe(true);
    expect(quizActions.submitFormalAssessment).not.toHaveBeenCalled();
  });

  it('Return to Questions and Escape both close it without submitting', async () => {
    const user = userEvent.setup();
    render(<FormalAssessmentRunner initialData={data()} />);
    const submit = screen.getByRole('button', { name: /Submit Exam/ });

    await user.click(submit);
    await user.click(within(dialog()).getByRole('button', { name: 'Return to Questions' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(document.activeElement).toBe(submit);

    await user.click(submit);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(quizActions.submitFormalAssessment).not.toHaveBeenCalled();
  });

  it('confirming submits once with the same payload as before (manual, current answers)', async () => {
    quizActions.submitFormalAssessment.mockResolvedValue(success);
    const user = userEvent.setup();
    render(<FormalAssessmentRunner initialData={data()} />);
    await user.click(screen.getByRole('button', { name: /Submit Exam/ }));
    await user.click(within(dialog()).getByRole('button', { name: 'Yes, Finalize & Submit' }));

    expect(quizActions.submitFormalAssessment).toHaveBeenCalledTimes(1);
    expect(quizActions.submitFormalAssessment).toHaveBeenCalledWith({
      attemptId: 'attempt-1',
      quizId: 'quiz-1',
      batchId: 'batch-1',
      responses: { 1: ['a'] },
      tabBlurCount: 0,
      isAutoSubmit: false
    });
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('while submitting, the dialog is locked; a failure keeps it open and shows the error inside it', async () => {
    let resolve!: (v: unknown) => void;
    quizActions.submitFormalAssessment.mockReturnValue(new Promise((r) => (resolve = r)));
    const user = userEvent.setup();
    render(<FormalAssessmentRunner initialData={data()} />);
    await user.click(screen.getByRole('button', { name: /Submit Exam/ }));
    await user.click(within(dialog()).getByRole('button', { name: 'Yes, Finalize & Submit' }));

    expect(within(dialog()).getByText('Finalizing…')).toBeTruthy();
    for (const button of within(dialog()).getAllByRole('button')) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
    await user.keyboard('{Escape}');
    expect(screen.getByRole('alertdialog')).toBeTruthy();

    await act(async () => resolve({ success: false, error: 'Submission window closed.' }));
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(within(dialog()).getByText('Submission window closed.')).toBeTruthy();
    expect(within(dialog()).getByRole('alert')).toBeTruthy();
  });

  it('when the timer reaches zero with the dialog open, it closes and auto-submits once', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    quizActions.submitFormalAssessment.mockResolvedValue({ ...success, data: { ...success.data, isAutoSubmitted: true } });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<FormalAssessmentRunner initialData={data(3_000)} />);
    await user.click(screen.getByRole('button', { name: /Submit Exam/ }));
    expect(screen.getByRole('alertdialog')).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(4_000);
    });

    expect(quizActions.submitFormalAssessment).toHaveBeenCalledTimes(1);
    expect(quizActions.submitFormalAssessment).toHaveBeenCalledWith(
      expect.objectContaining({ attemptId: 'attempt-1', isAutoSubmit: true, responses: { 1: ['a'] } })
    );
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
