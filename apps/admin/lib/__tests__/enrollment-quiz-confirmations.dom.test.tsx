// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const enrollmentActions = vi.hoisted(() => ({
  updateEnrollmentStatusAction: vi.fn(),
  bulkUpdateEnrollmentStatusAction: vi.fn(),
  resendEnrollmentEmailAction: vi.fn(),
  bulkResendEnrollmentEmailsAction: vi.fn(),
  exportEnrollmentsCsvAction: vi.fn()
}));
const quizActions = vi.hoisted(() => ({
  saveQuizConfigAction: vi.fn(),
  createQuestionAction: vi.fn(),
  updateQuestionAction: vi.fn(),
  deleteQuestionAction: vi.fn(),
  reorderQuestionsAction: vi.fn()
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }));

vi.mock('../../app/(admin)/enrollments/actions', () => enrollmentActions);
vi.mock('../../app/(admin)/content/[id]/quiz/actions', () => quizActions);
vi.mock('sonner', () => ({ toast }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }));

import { EnrollmentsTable } from '../../app/(admin)/enrollments/enrollments-table';
import { QuizAuthoringClient } from '../../app/(admin)/content/[id]/quiz/quiz-authoring-client';
import type { DetailedEnrollment, ContentItemWithDetails, QuizWithDetails } from '@/lib/db/queries';

beforeEach(() => {
  for (const fn of [...Object.values(enrollmentActions), ...Object.values(quizActions), ...Object.values(toast)]) {
    fn.mockReset();
  }
});

afterEach(() => {
  cleanup();
});

const dialog = () => screen.getByRole('alertdialog');

const enrollment: DetailedEnrollment = {
  id: 41,
  status: 'pending',
  createdAt: new Date('2026-10-01T10:00:00Z'),
  confirmationSentAt: null,
  student: {
    id: 7,
    fullName: 'Asha Test',
    email: 'asha@example.test',
    phone: '9876543210',
    collegeRollNumber: 'R-1',
    branch: 'CSE',
    year: 3
  },
  program: { id: 3, name: 'Full Stack', code: 'FS-1', capacity: 0 }
};

describe('Enrollments: single Resend Email asks first', () => {
  async function openResend() {
    const user = userEvent.setup();
    render(<EnrollmentsTable enrollments={[enrollment]} totalCount={1} />);
    // The always-visible (mobile card) Resend button; the row menu uses the same handler.
    const [resend] = screen.getAllByRole('button', { name: /Resend Email/ });
    await user.click(resend);
    return { user, resend };
  }

  it('opens a confirmation naming the recipient and sends nothing yet', async () => {
    await openResend();
    expect(within(dialog()).getByText('Resend Confirmation Email?')).toBeTruthy();
    expect(within(dialog()).getByText(/Asha Test \(asha@example\.test\)/)).toBeTruthy();
    expect(enrollmentActions.resendEnrollmentEmailAction).not.toHaveBeenCalled();
  });

  it('Cancel sends nothing and returns focus to the Resend button', async () => {
    const { user, resend } = await openResend();
    await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(enrollmentActions.resendEnrollmentEmailAction).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(resend);
  });

  it('Send email calls the existing action once with the enrollment id, then closes', async () => {
    let resolve!: (v: unknown) => void;
    enrollmentActions.resendEnrollmentEmailAction.mockReturnValue(new Promise((r) => (resolve = r)));
    const { user } = await openResend();
    const send = within(dialog()).getByRole('button', { name: 'Send email' });
    await user.click(send);
    await user.click(send);

    expect(enrollmentActions.resendEnrollmentEmailAction).toHaveBeenCalledTimes(1);
    expect(enrollmentActions.resendEnrollmentEmailAction).toHaveBeenCalledWith(41);
    expect(within(dialog()).getByText('Sending…')).toBeTruthy();

    await React.act(async () => resolve({ success: true }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(toast.success).toHaveBeenCalledWith('Confirmation email sent successfully');
  });

  it('cancelling an enrollment is destructive: focus starts on "Keep enrollment"', async () => {
    const user = userEvent.setup();
    render(<EnrollmentsTable enrollments={[enrollment]} totalCount={1} />);
    // Opened from the row's actions menu: the dialog must take over cleanly after the menu closes.
    const menuButton = screen.getByRole('button', { name: 'Actions for Asha Test' });
    await user.click(menuButton);
    await user.click(await screen.findByRole('menuitem', { name: /Cancel Enrollment/ }));
    await screen.findByRole('alertdialog');
    expect(within(dialog()).getByText('Cancel Enrollment?')).toBeTruthy();
    expect(document.activeElement).toBe(within(dialog()).getByRole('button', { name: 'Keep enrollment' }));
    expect(enrollmentActions.updateEnrollmentStatusAction).not.toHaveBeenCalled();

    enrollmentActions.updateEnrollmentStatusAction.mockResolvedValue({ success: true });
    await user.click(within(dialog()).getByRole('button', { name: 'Cancel enrollment' }));
    expect(enrollmentActions.updateEnrollmentStatusAction).toHaveBeenCalledWith(41, 'cancelled');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(document.body.style.pointerEvents).not.toBe('none');
  });

  it('Resend from the row actions menu opens the confirmation; Escape leaves the page usable', async () => {
    const user = userEvent.setup();
    render(<EnrollmentsTable enrollments={[enrollment]} totalCount={1} />);
    await user.click(screen.getByRole('button', { name: 'Actions for Asha Test' }));
    await user.click(await screen.findByRole('menuitem', { name: /Resend Email/ }));
    await screen.findByRole('alertdialog');
    expect(document.activeElement).toBe(within(dialog()).getByRole('button', { name: 'Send email' }));

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.body.style.pointerEvents).not.toBe('none');
    expect(enrollmentActions.resendEnrollmentEmailAction).not.toHaveBeenCalled();
  });
});

const contentItem = {
  id: 'c1',
  title: 'Arrays Quiz',
  slug: 'arrays-quiz',
  programCode: 'FS-1',
  lifecycleStatus: 'draft'
} as unknown as ContentItemWithDetails;

function quiz(attemptCount = 0): QuizWithDetails {
  return {
    id: 'q1',
    contentItemId: 'c1',
    quizType: 'practice',
    timeLimitMinutes: null,
    passingScorePercent: 60,
    showExplanations: 'immediate',
    createdAt: new Date(),
    updatedAt: new Date(),
    questionCount: 2,
    totalPoints: 2,
    attemptCount,
    questions: [1, 2].map((n) => ({
      id: 100 + n,
      quizId: 'q1',
      questionText: `Question text ${n}`,
      questionType: 'single_choice' as const,
      options: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' }
      ],
      correctOptionIds: ['a'],
      explanationText: null,
      points: 1,
      sequenceOrder: n,
      createdAt: new Date()
    }))
  };
}

describe('Quiz authoring: deleting a question asks first', () => {
  it('opens a destructive confirmation (focus on Cancel) instead of window.confirm', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    const user = userEvent.setup();
    render(<QuizAuthoringClient contentItem={contentItem} initialQuiz={quiz()} />);

    await user.click(screen.getByRole('button', { name: 'Delete question 2' }));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(within(dialog()).getByText('Delete question 2?')).toBeTruthy();
    expect(document.activeElement).toBe(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(quizActions.deleteQuestionAction).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('Cancel keeps the question', async () => {
    const user = userEvent.setup();
    render(<QuizAuthoringClient contentItem={contentItem} initialQuiz={quiz()} />);
    await user.click(screen.getByRole('button', { name: 'Delete question 1' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(quizActions.deleteQuestionAction).not.toHaveBeenCalled();
    expect(screen.getByText('Question text 1')).toBeTruthy();
  });

  it('confirming deletes exactly that question once and removes it from the list', async () => {
    quizActions.deleteQuestionAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<QuizAuthoringClient contentItem={contentItem} initialQuiz={quiz()} />);
    await user.click(screen.getByRole('button', { name: 'Delete question 2' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Delete question' }));

    expect(quizActions.deleteQuestionAction).toHaveBeenCalledTimes(1);
    expect(quizActions.deleteQuestionAction).toHaveBeenCalledWith('c1', 102);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.queryByText('Question text 2')).toBeNull();
    expect(screen.getByText('Question text 1')).toBeTruthy();
  });

  it('a failed delete keeps the dialog open and the question in place', async () => {
    quizActions.deleteQuestionAction.mockResolvedValue({ success: false, error: 'Nope' });
    const user = userEvent.setup();
    render(<QuizAuthoringClient contentItem={contentItem} initialQuiz={quiz()} />);
    await user.click(screen.getByRole('button', { name: 'Delete question 1' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Delete question' }));

    expect(toast.error).toHaveBeenCalledWith('Nope');
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(screen.getByText('Question text 1')).toBeTruthy();
  });

  it('with student attempts, deletion stays locked and no dialog opens', () => {
    render(<QuizAuthoringClient contentItem={contentItem} initialQuiz={quiz(3)} />);
    const button = screen.getByRole('button', { name: 'Delete question 1' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
