import { describe, it, expect, beforeEach } from 'vitest';
import {
  startFormalAttempt,
  submitFormalAttempt,
  type FormalAssessmentRepository,
  type FormalAttemptRecord,
  type FormalQuizPlacement
} from '../services/formal-assessment';
import {
  gradeResponses,
  isAnswerKeyVisible,
  isFormalAnswerKeyVisible,
  redactAnswerKey,
  sanitizeResponses,
  type GradableQuestion
} from '../services/assessment-policy';

/**
 * Audit F-01 regression suite: formal assessment integrity.
 *
 * The in-memory repository enforces the same contracts as the Drizzle implementation
 * (lib/db/queries/formal-assessments.ts): attempts are filtered by owner, finalisation is a
 * compare-and-set on submitted_at IS NULL, starts are serialised per (quiz, student), XP is idempotent.
 */

const STUDENT = 101;
const OTHER_STUDENT = 202;
const BATCH_A = '22222222-2222-4222-8222-222222222222';
const BATCH_B = '22222222-2222-4222-8222-bbbbbbbbbbbb';
const QUIZ_HARD = '55555555-5555-4555-8555-555555555555';
const QUIZ_EASY = '55555555-5555-4555-8555-eeeeeeeeeeee';
const CONTENT_HARD = '66666666-6666-4666-8666-666666666666';
const CONTENT_EASY = '66666666-6666-4666-8666-eeeeeeeeeeee';
const ATTEMPT = '77777777-7777-4777-8777-000000000001';

const NOW = new Date('2026-10-10T10:00:00Z');
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60 * 1000);
const DUE_FUTURE = new Date('2026-10-15T00:00:00Z');
const DUE_PAST = new Date('2026-10-09T00:00:00Z');

const questions: Record<string, GradableQuestion[]> = {
  [QUIZ_HARD]: [
    { id: 10, questionText: 'Hard 1', questionType: 'single_choice', correctOptionIds: ['h1'], explanationText: 'why h1', points: 5 },
    { id: 11, questionText: 'Hard 2', questionType: 'multiple_choice', correctOptionIds: ['h2', 'h3'], explanationText: 'why h2/h3', points: 5 }
  ],
  [QUIZ_EASY]: [
    { id: 90, questionText: 'Easy 1', questionType: 'single_choice', correctOptionIds: ['e1'], explanationText: 'easy', points: 10 }
  ]
};

interface State {
  attempts: FormalAttemptRecord[];
  access: Set<string>;
  placements: FormalQuizPlacement[];
  xpLedger: Set<string>;
  finalizeCalls: number;
  xpAwards: number;
}

let state: State;

function placement(overrides: Partial<FormalQuizPlacement> = {}): FormalQuizPlacement {
  return {
    quizId: QUIZ_HARD,
    contentItemId: CONTENT_HARD,
    batchId: BATCH_A,
    timeLimitMinutes: 45,
    passingScorePercent: 70,
    showExplanations: 'after_deadline',
    availableFrom: new Date('2026-10-01T00:00:00Z'),
    dueAt: DUE_FUTURE,
    ...overrides
  };
}

function attempt(overrides: Partial<FormalAttemptRecord> = {}): FormalAttemptRecord {
  return { id: ATTEMPT, quizId: QUIZ_HARD, studentId: STUDENT, batchId: BATCH_A, startedAt: minutesAgo(20), submittedAt: null, ...overrides };
}

const tick = () => new Promise((r) => setTimeout(r, 0));
const locks = new Map<string, Promise<unknown>>();

function createRepo(): FormalAssessmentRepository {
  const repo: FormalAssessmentRepository = {
    async findOwnedAttempt(id, studentId) {
      await tick();
      const a = state.attempts.find((x) => x.id === id && x.studentId === studentId);
      return a ? { ...a } : null;
    },
    async findAttemptForQuiz(quizId, studentId) {
      await tick();
      const a = state.attempts.find((x) => x.quizId === quizId && x.studentId === studentId);
      return a ? { ...a } : null;
    },
    async hasBatchAccess(studentId, batchId) {
      await tick();
      return state.access.has(`${studentId}:${batchId}`);
    },
    async findFormalPlacement(quizOrContentId, batchId) {
      await tick();
      return (
        state.placements.find(
          (p) => p.batchId === batchId && (p.quizId === quizOrContentId || p.contentItemId === quizOrContentId)
        ) ?? null
      );
    },
    async getQuestions(quizId) {
      await tick();
      return questions[quizId] ?? [];
    },
    async createAttempt({ quizId, studentId, batchId, startedAt }) {
      await tick();
      const id = `77777777-7777-4777-8777-${String(state.attempts.length + 100).padStart(12, '0')}`;
      state.attempts.push({ id, quizId, studentId, batchId, startedAt, submittedAt: null });
      return { id };
    },
    async finalizeAttempt(input) {
      state.finalizeCalls++;
      await tick();
      // Atomic compare-and-set (single synchronous step after the await).
      const a = state.attempts.find((x) => x.id === input.attemptId && x.studentId === input.studentId);
      if (!a || a.submittedAt) return false;
      Object.assign(a, { submittedAt: input.submittedAt, score: input.score, responses: input.responses });
      return true;
    },
    async awardQuizXp({ studentId, quizId, xp }) {
      await tick();
      const key = `${studentId}:quiz_completed:${quizId}`;
      if (state.xpLedger.has(key)) return { xpAwarded: 0 };
      state.xpLedger.add(key);
      state.xpAwards++;
      return { xpAwarded: xp };
    },
    async withStartLock(quizId, studentId, fn) {
      const key = `${quizId}:${studentId}`;
      const prev = locks.get(key) ?? Promise.resolve();
      const run = prev.then(() => fn(repo));
      locks.set(key, run.catch(() => undefined));
      return run;
    }
  };
  return repo;
}

const correctHard = { 10: ['h1'], 11: ['h3', 'h2'] };

beforeEach(() => {
  locks.clear();
  state = {
    attempts: [attempt()],
    access: new Set([`${STUDENT}:${BATCH_A}`]),
    placements: [
      placement(),
      placement({ quizId: QUIZ_EASY, contentItemId: CONTENT_EASY, dueAt: DUE_PAST, showExplanations: 'immediate' })
    ],
    xpLedger: new Set(),
    finalizeCalls: 0,
    xpAwards: 0
  };
});

const submit = (overrides: Record<string, unknown> = {}) =>
  submitFormalAttempt(createRepo(), {
    studentId: STUDENT,
    attemptId: ATTEMPT,
    quizId: QUIZ_HARD,
    batchId: BATCH_A,
    responses: correctHard,
    tabBlurCount: 0,
    now: NOW,
    ...overrides
  });

describe('F-01 formal submission: valid path', () => {
  it('grades against the attempt quiz, finalises once and awards XP once', async () => {
    const result = await submit({ tabBlurCount: 3 });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.quizId).toBe(QUIZ_HARD);
    expect(result.data.score).toBe(10);
    expect(result.data.maxScore).toBe(10);
    expect(result.data.percentage).toBe(100);
    expect(result.data.isPassed).toBe(true);
    expect(result.data.xpAwarded).toBe(20);
    expect(result.data.tabBlurCount).toBe(3);
    expect(state.attempts[0].submittedAt).toEqual(NOW);
    expect(state.xpAwards).toBe(1);
  });

  it('scores partial and wrong answers correctly (multi-select needs the exact set)', async () => {
    const result = await submit({ responses: { 10: ['h1'], 11: ['h2'] } });
    expect(result.success && result.data.score).toBe(5);
    expect(result.success && result.data.isPassed).toBe(false);
    expect(result.success && result.data.xpAwarded).toBe(0);
  });

  it('works when the client omits quizId/batchId (they are derived from the attempt)', async () => {
    const result = await submit({ quizId: undefined, batchId: undefined });
    expect(result.success).toBe(true);
  });

  it('ignores responses for questions that are not part of the attempt quiz', async () => {
    const result = await submit({ responses: { ...correctHard, 90: ['e1'], 999: ['x'] } });
    expect(result.success && result.data.maxScore).toBe(10);
    expect(Object.keys((state.attempts[0] as any).responses).sort()).toEqual(['10', '11']);
  });
});

describe('F-01 forged identifiers', () => {
  it('rejects a forged quizId (another formal quiz) and never grades or finalises', async () => {
    const result = await submit({ quizId: QUIZ_EASY, responses: { 90: ['e1'] } });
    expect(result).toMatchObject({ success: false, code: 'ATTEMPT_MISMATCH' });
    expect(state.attempts[0].submittedAt).toBeNull();
    expect(state.finalizeCalls).toBe(0);
    expect(state.xpAwards).toBe(0);
  });

  it('rejects a forged batchId (used to null out dueAt and reveal the answer key)', async () => {
    const result = await submit({ batchId: '99999999-9999-4999-8999-999999999999' });
    expect(result).toMatchObject({ success: false, code: 'ATTEMPT_MISMATCH' });
    expect((result as any).data).toBeUndefined();
    expect(state.attempts[0].submittedAt).toBeNull();
  });

  it('rejects a batchId of another batch the student IS enrolled in', async () => {
    state.access.add(`${STUDENT}:${BATCH_B}`);
    state.placements.push(placement({ batchId: BATCH_B, dueAt: null }));
    const result = await submit({ batchId: BATCH_B });
    expect(result).toMatchObject({ success: false, code: 'ATTEMPT_MISMATCH' });
  });

  it('rejects malformed attempt ids', async () => {
    const result = await submit({ attemptId: 'not-a-uuid' });
    expect(result).toMatchObject({ success: false, code: 'INVALID_ID' });
  });
});

describe('F-01 ownership and eligibility', () => {
  it("rejects another student's attempt as not found", async () => {
    state.attempts = [attempt({ studentId: OTHER_STUDENT })];
    const result = await submit();
    expect(result).toMatchObject({ success: false, code: 'NOT_FOUND' });
    expect(state.attempts[0].submittedAt).toBeNull();
  });

  it('rejects when the student lost access to the attempt batch (e.g. enrollment revoked)', async () => {
    state.access.clear();
    const result = await submit();
    expect(result).toMatchObject({ success: false, code: 'FORBIDDEN' });
    expect(state.attempts[0].submittedAt).toBeNull();
  });

  it('rejects an attempt whose quiz is no longer placed in the attempt batch', async () => {
    state.placements = state.placements.filter((p) => p.quizId !== QUIZ_HARD);
    const result = await submit();
    expect(result).toMatchObject({ success: false, code: 'NOT_FOUND' });
  });

  it('rejects an attempt that was recorded in a different batch than the one it is placed in', async () => {
    state.attempts = [attempt({ batchId: BATCH_B })];
    state.access.add(`${STUDENT}:${BATCH_B}`);
    const result = await submit({ batchId: undefined });
    expect(result).toMatchObject({ success: false, code: 'NOT_FOUND' });
  });

  it('rejects an attempt with no batch', async () => {
    state.attempts = [attempt({ batchId: null })];
    const result = await submit({ batchId: undefined });
    expect(result).toMatchObject({ success: false, code: 'NOT_FOUND' });
  });
});

describe('F-01/F-08 repeated and concurrent submissions', () => {
  it('rejects a second sequential submission without changing the score', async () => {
    expect((await submit()).success).toBe(true);
    const second = await submit({ responses: {} });
    expect(second).toMatchObject({ success: false, code: 'ALREADY_SUBMITTED' });
    expect((state.attempts[0] as any).score).toBe(10);
    expect(state.xpAwards).toBe(1);
  });

  it('lets exactly one of several concurrent submissions finalise and award XP', async () => {
    const results = await Promise.all([submit(), submit(), submit({ responses: {} })]);
    expect(results.filter((r) => r.success)).toHaveLength(1);
    expect(results.filter((r) => !r.success && r.code === 'ALREADY_SUBMITTED')).toHaveLength(2);
    expect(state.xpAwards).toBe(1);
  });
});

describe('F-01 server-authoritative timing', () => {
  it('flags late arrivals inside the 2-minute grace window as auto-submitted', async () => {
    state.attempts = [attempt({ startedAt: minutesAgo(46) })];
    const result = await submit({ isAutoSubmit: false });
    expect(result.success && result.data.isAutoSubmitted).toBe(true);
  });

  it('rejects submissions after the deadline plus grace and leaves the attempt unsubmitted', async () => {
    state.attempts = [attempt({ startedAt: minutesAgo(48) })];
    const result = await submit();
    expect(result).toMatchObject({ success: false, code: 'DEADLINE_EXCEEDED' });
    expect(state.attempts[0].submittedAt).toBeNull();
  });
});

describe('F-01/F-11 answer-key disclosure', () => {
  it('withholds answers and explanations before the batch due date', async () => {
    const result = await submit();
    expect(result.success && result.data.explanationsSuppressed).toBe(true);
    expect(result.success && result.data.questionResults).toBeUndefined();
  });

  it("withholds them before the due date even for policy 'immediate'", async () => {
    state.placements[0] = placement({ showExplanations: 'immediate' });
    const result = await submit();
    expect(result.success && result.data.questionResults).toBeUndefined();
  });

  it("reveals them after the due date for 'after_deadline'", async () => {
    state.placements[0] = placement({ dueAt: DUE_PAST, availableFrom: null });
    const result = await submit();
    expect(result.success && result.data.explanationsSuppressed).toBe(false);
    expect(result.success && result.data.questionResults?.[0].correctOptionIds).toEqual(['h1']);
  });

  it("never reveals them for policy 'never', even after the due date", async () => {
    state.placements[0] = placement({ dueAt: DUE_PAST, showExplanations: 'never' });
    const result = await submit();
    expect(result.success && result.data.explanationsSuppressed).toBe(true);
    expect(result.success && result.data.questionResults).toBeUndefined();
    expect(result.success && result.data.publishDate).toBeNull();
  });
});

describe('F-01/F-08 starting formal attempts', () => {
  const start = (overrides: Record<string, unknown> = {}) =>
    startFormalAttempt(createRepo(), { studentId: STUDENT, quizId: QUIZ_HARD, batchId: BATCH_A, now: NOW, ...overrides });

  beforeEach(() => {
    state.attempts = [];
  });

  it('creates one attempt with a server-side start time and deadline', async () => {
    const result = await start();
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.startedAt).toEqual(NOW);
    expect(result.data.authoritativeDeadline.getTime() - NOW.getTime()).toBe(45 * 60 * 1000);
    expect(state.attempts).toHaveLength(1);
  });

  it('creates exactly one attempt for concurrent start requests', async () => {
    const results = await Promise.all([start(), start(), start()]);
    expect(results.every((r) => r.success)).toBe(true);
    expect(state.attempts).toHaveLength(1);
    expect(new Set(results.map((r) => r.success && r.data.attemptId)).size).toBe(1);
  });

  it('resumes an in-progress attempt without resetting the timer', async () => {
    state.attempts = [attempt({ startedAt: minutesAgo(10) })];
    const result = await start();
    expect(result.success && result.data.attemptId).toBe(ATTEMPT);
    expect(result.success && result.data.startedAt).toEqual(minutesAgo(10));
  });

  it('enforces the single-attempt rule once submitted', async () => {
    state.attempts = [attempt({ submittedAt: minutesAgo(1) })];
    expect(await start()).toMatchObject({ success: false, code: 'ALREADY_SUBMITTED' });
  });

  it('does not let an attempt opened in one batch be resumed through another', async () => {
    state.attempts = [attempt({ batchId: BATCH_B })];
    expect(await start()).toMatchObject({ success: false, code: 'ATTEMPT_IN_OTHER_BATCH' });
  });

  it('rejects not-yet-open and past-deadline assessments', async () => {
    state.placements[0] = placement({ availableFrom: new Date('2026-10-11T00:00:00Z') });
    expect(await start()).toMatchObject({ success: false, code: 'NOT_OPEN_YET' });
    state.placements[0] = placement({ dueAt: DUE_PAST });
    expect(await start()).toMatchObject({ success: false, code: 'DEADLINE_PASSED' });
    expect(state.attempts).toHaveLength(0);
  });

  it('rejects students without access to the batch and quizzes not placed in it', async () => {
    state.access.clear();
    expect(await start()).toMatchObject({ success: false, code: 'FORBIDDEN' });
    state.access.add(`${STUDENT}:${BATCH_B}`);
    expect(await start({ batchId: BATCH_B })).toMatchObject({ success: false, code: 'NOT_FOUND' });
  });

  it('rejects malformed ids', async () => {
    expect(await start({ quizId: 'x' })).toMatchObject({ success: false, code: 'INVALID_ID' });
    expect(await start({ batchId: 42 })).toMatchObject({ success: false, code: 'INVALID_ID' });
  });
});

describe('assessment-policy helpers', () => {
  it('practice visibility follows show_explanations', () => {
    expect(isAnswerKeyVisible('immediate', DUE_FUTURE, NOW)).toBe(true);
    expect(isAnswerKeyVisible('after_deadline', DUE_FUTURE, NOW)).toBe(false);
    expect(isAnswerKeyVisible('after_deadline', DUE_PAST, NOW)).toBe(true);
    expect(isAnswerKeyVisible('after_deadline', null, NOW)).toBe(true);
    expect(isAnswerKeyVisible('never', DUE_PAST, NOW)).toBe(false);
    expect(isAnswerKeyVisible(undefined, null, NOW)).toBe(false);
  });

  it('formal visibility never precedes the due date', () => {
    expect(isFormalAnswerKeyVisible('immediate', DUE_FUTURE, NOW)).toBe(false);
    expect(isFormalAnswerKeyVisible('immediate', null, NOW)).toBe(true);
    expect(isFormalAnswerKeyVisible('never', null, NOW)).toBe(false);
    expect(isFormalAnswerKeyVisible('bogus', DUE_PAST, NOW)).toBe(false);
  });

  it('redaction strips the key but keeps the student selection', () => {
    const graded = gradeResponses(questions[QUIZ_HARD], { '10': ['h1'] }, 50);
    const redacted = redactAnswerKey(graded.questionResults);
    expect(redacted[0]).toMatchObject({ correctOptionIds: [], explanationText: null, selectedOptionIds: ['h1'] });
  });

  it('sanitizeResponses keeps only known questions and normalises values', () => {
    expect(sanitizeResponses({ 10: [' h1 ', 'h1'], 7: ['x'] }, [{ id: 10 }])).toEqual({ '10': ['h1', 'h1'] });
    expect(sanitizeResponses('junk', [{ id: 10 }])).toEqual({});
  });
});
