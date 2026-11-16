import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getContentItemById: vi.fn(),
  duplicateContentItem: vi.fn(),
  getQuizByContentItemId: vi.fn(),
  getOrCreateQuizForContentItem: vi.fn(),
  createQuizQuestionsBulk: vi.fn(),
  getProjectAssignmentConfig: vi.fn(),
  saveProjectRubric: vi.fn()
}));
vi.mock('@/lib/authz', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/db/queries', () => ({
  getContentItemById: mocks.getContentItemById,
  duplicateContentItem: mocks.duplicateContentItem,
  getQuizByContentItemId: mocks.getQuizByContentItemId,
  getOrCreateQuizForContentItem: mocks.getOrCreateQuizForContentItem,
  createQuizQuestionsBulk: mocks.createQuizQuestionsBulk,
  getProjectAssignmentConfig: mocks.getProjectAssignmentConfig,
  saveProjectRubric: mocks.saveProjectRubric
}));

import { duplicateContentAction } from '../../app/(admin)/content/actions';
import { importQuestionsAction } from '../../app/(admin)/content/[id]/quiz/actions';
import { buildPathSteps } from '../../app/(admin)/content/[id]/path-to-students';
import { MAX_IMPORT_QUESTIONS, parseQuizImport, QUIZ_IMPORT_EXAMPLE } from '../content/quiz-import';

const SOURCE_ID = '8c1d2f0b-1111-4222-8333-444444444444';
const COPY_ID = '9d2e3a1c-1111-4222-8333-444444444444';
const QUIZ_ID = 'aa2e3a1c-1111-4222-8333-444444444444';

const question = {
  questionText: 'What is 2 + 2?',
  questionType: 'single_choice' as const,
  options: [
    { id: 'opt_1', text: '3' },
    { id: 'opt_2', text: '4' }
  ],
  correctOptionIds: ['opt_2'],
  explanationText: null,
  points: 1
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ ok: true, userId: 'admin-1', role: 'admin' });
});

describe('parseQuizImport', () => {
  it('reads the documented example: starred answers, Answer lines, explanation and points', () => {
    const { questions, issues } = parseQuizImport(QUIZ_IMPORT_EXAMPLE);
    expect(issues).toEqual([]);
    expect(questions).toHaveLength(2);
    expect(questions[0]).toEqual({
      questionText: 'What is the time complexity of binary search?',
      questionType: 'single_choice',
      options: [
        { id: 'opt_1', text: 'O(n)' },
        { id: 'opt_2', text: 'O(log n)' },
        { id: 'opt_3', text: 'O(n log n)' },
        { id: 'opt_4', text: 'O(1)' }
      ],
      correctOptionIds: ['opt_2'],
      explanationText: 'The search space halves on every step.',
      points: 1
    });
    expect(questions[1].questionType).toBe('multiple_choice');
    expect(questions[1].correctOptionIds).toEqual(['opt_1', 'opt_3']);
    expect(questions[1].points).toBe(2);
  });

  it('accepts numbered questions, "A." and bullet options, Windows line endings and wrapped lines', () => {
    const text = [
      '1. Which keyword declares a constant',
      'in JavaScript?',
      'A. var',
      '* B. const',
      'C. let',
      '',
      'Question 2: Pick the stable sort',
      '- Quick sort',
      '*- Merge sort, which keeps equal',
      'elements in order',
      'Why: It never swaps equal keys.',
      'It is O(n log n).'
    ].join('\r\n');
    const { questions, issues } = parseQuizImport(text);
    expect(issues).toEqual([]);
    expect(questions[0].questionText).toBe('Which keyword declares a constant\nin JavaScript?');
    expect(questions[0].correctOptionIds).toEqual(['opt_2']);
    expect(questions[1].questionText).toBe('Pick the stable sort');
    expect(questions[1].options[1].text).toBe('Merge sort, which keeps equal elements in order');
    expect(questions[1].explanationText).toBe('It never swaps equal keys.\nIt is O(n log n).');
  });

  it('reports each broken block with its position and keeps the good ones', () => {
    const text = [
      'Q: No answer marked\nA) one\nB) two',
      'Q: Good one\nA) one\n*B) two',
      'Q: Only one option\n*A) one',
      'Q: Answer names a missing option\nA) one\nB) two\nAnswer: D',
      'Q: Too many points\n*A) one\nB) two\nPoints: 500'
    ].join('\n\n');
    const { questions, issues } = parseQuizImport(text);
    expect(questions.map((q) => q.questionText)).toEqual(['Good one']);
    expect(issues.map((i) => [i.block, i.message.split('.')[0]])).toEqual([
      [1, 'No correct answer is marked'],
      [3, 'At least two options are needed, written as "A) …" lines'],
      [4, 'The Answer line names an option that is not in the list (D)'],
      [5, 'Points must be between 1 and 100']
    ]);
  });

  it('returns nothing for empty text and caps a paste at the import limit', () => {
    expect(parseQuizImport('  \n\n ')).toEqual({ questions: [], issues: [] });
    const many = Array.from({ length: MAX_IMPORT_QUESTIONS + 3 }, (_, i) => `Q: Number ${i}\n*A) yes\nB) no`).join('\n\n');
    const { questions, issues } = parseQuizImport(many);
    expect(questions).toHaveLength(MAX_IMPORT_QUESTIONS);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/Only 200 questions/);
  });
});

describe('importQuestionsAction', () => {
  it('saves all questions through one bulk insert for the quiz of this content item', async () => {
    mocks.getQuizByContentItemId.mockResolvedValue({ id: QUIZ_ID });
    mocks.createQuizQuestionsBulk.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const res = await importQuestionsAction(SOURCE_ID, QUIZ_ID, [question, { ...question, questionText: 'Second?' }]);
    expect(res.success).toBe(true);
    expect(mocks.createQuizQuestionsBulk).toHaveBeenCalledTimes(1);
    const [quizId, saved] = mocks.createQuizQuestionsBulk.mock.calls[0];
    expect(quizId).toBe(QUIZ_ID);
    expect(saved.map((q: { questionText: string }) => q.questionText)).toEqual(['What is 2 + 2?', 'Second?']);
  });

  it('imports nothing when any question is invalid, and names it', async () => {
    const res = await importQuestionsAction(SOURCE_ID, QUIZ_ID, [question, { ...question, correctOptionIds: ['opt_9'] }]);
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(/^Question 2: .*Nothing was imported\.$/);
    expect(mocks.createQuizQuestionsBulk).not.toHaveBeenCalled();
  });

  it('refuses a quiz id that does not belong to the content item, empty input, oversize input and non-admins', async () => {
    mocks.getQuizByContentItemId.mockResolvedValue({ id: 'another-quiz' });
    expect((await importQuestionsAction(SOURCE_ID, QUIZ_ID, [question])).success).toBe(false);
    expect((await importQuestionsAction(SOURCE_ID, QUIZ_ID, [])).success).toBe(false);
    expect((await importQuestionsAction(SOURCE_ID, QUIZ_ID, 'text')).success).toBe(false);
    const tooMany = Array.from({ length: MAX_IMPORT_QUESTIONS + 1 }, () => question);
    expect((await importQuestionsAction(SOURCE_ID, QUIZ_ID, tooMany)).success).toBe(false);
    mocks.requireAdmin.mockResolvedValue({ ok: false, error: 'Unauthorized.' });
    expect(await importQuestionsAction(SOURCE_ID, QUIZ_ID, [question])).toEqual({ success: false, error: 'Unauthorized.' });
    expect(mocks.createQuizQuestionsBulk).not.toHaveBeenCalled();
  });
});

describe('duplicateContentAction', () => {
  const source = (contentType: string) => ({ id: SOURCE_ID, title: 'Arrays', contentType, metadata: {} });
  const copy = { id: COPY_ID, title: 'Copy of Arrays' };

  it('copies a lecture without touching quiz or rubric tables', async () => {
    mocks.getContentItemById.mockResolvedValue(source('lecture'));
    mocks.duplicateContentItem.mockResolvedValue(copy);
    const res = await duplicateContentAction(SOURCE_ID);
    expect(res).toEqual({ success: true, item: copy, warning: undefined });
    expect(mocks.getOrCreateQuizForContentItem).not.toHaveBeenCalled();
    expect(mocks.saveProjectRubric).not.toHaveBeenCalled();
  });

  it('copies a quiz with its settings and questions', async () => {
    mocks.getContentItemById.mockResolvedValue(source('quiz'));
    mocks.duplicateContentItem.mockResolvedValue(copy);
    mocks.getQuizByContentItemId.mockResolvedValue({
      id: QUIZ_ID,
      quizType: 'formal',
      timeLimitMinutes: 45,
      passingScorePercent: 70,
      showExplanations: 'after_deadline',
      questions: [{ ...question, id: 5, sequenceOrder: 0 }]
    });
    mocks.getOrCreateQuizForContentItem.mockResolvedValue({ id: 'new-quiz' });
    const res = await duplicateContentAction(SOURCE_ID);
    expect(res.success).toBe(true);
    expect(mocks.getOrCreateQuizForContentItem).toHaveBeenCalledWith(COPY_ID, {
      quizType: 'formal',
      timeLimitMinutes: 45,
      passingScorePercent: 70,
      showExplanations: 'after_deadline'
    });
    expect(mocks.createQuizQuestionsBulk).toHaveBeenCalledWith('new-quiz', [question]);
  });

  it('copies a project rubric, and keeps the copy with a warning when that step fails', async () => {
    const criteria = [{ title: 'Code quality', maxPoints: 40 }];
    mocks.getContentItemById.mockResolvedValue(source('project'));
    mocks.duplicateContentItem.mockResolvedValue(copy);
    mocks.getProjectAssignmentConfig.mockResolvedValue({ rubricCriteria: criteria });
    expect((await duplicateContentAction(SOURCE_ID)).success).toBe(true);
    expect(mocks.saveProjectRubric).toHaveBeenCalledWith(COPY_ID, criteria);

    mocks.saveProjectRubric.mockRejectedValue(new Error('db down'));
    const res = await duplicateContentAction(SOURCE_ID);
    expect(res.success).toBe(true);
    if (res.success) expect(res.warning).toMatch(/rubric could not be copied/);
  });

  it('refuses DSA sheets, unknown or malformed ids, and non-admins', async () => {
    mocks.getContentItemById.mockResolvedValue(source('dsa_sheet'));
    const dsa = await duplicateContentAction(SOURCE_ID);
    expect(dsa.success).toBe(false);
    mocks.getContentItemById.mockResolvedValue(null);
    expect(await duplicateContentAction(SOURCE_ID)).toEqual({ success: false, error: 'Content item not found.' });
    expect((await duplicateContentAction('nope')).success).toBe(false);
    mocks.requireAdmin.mockResolvedValue({ ok: false, error: 'Unauthorized.' });
    expect(await duplicateContentAction(SOURCE_ID)).toEqual({ success: false, error: 'Unauthorized.' });
    expect(mocks.duplicateContentItem).not.toHaveBeenCalled();
  });
});

describe('buildPathSteps', () => {
  const base = { warnings: [], isDirty: false, status: 'published' as const, placementCount: 1, inLibrary: false };
  const done = (input: Parameters<typeof buildPathSteps>[0]) => buildPathSteps(input).map((s) => s.done);

  it('is all done for a saved, published item that is placed in a batch or shown in the Library', () => {
    expect(done(base)).toEqual([true, true, true, true]);
    expect(done({ ...base, placementCount: 0, inLibrary: true })).toEqual([true, true, true, true]);
  });

  it('does not count a placed draft as reachable, and lists what is missing', () => {
    const steps = buildPathSteps({ ...base, status: 'draft', warnings: ['The quiz has no questions yet.'], isDirty: true });
    expect(steps.map((s) => s.done)).toEqual([false, false, false, false]);
    expect(steps[0].problems).toEqual(['The quiz has no questions yet.']);
  });

  it('says so when a published item is neither placed nor in the Library', () => {
    const reach = buildPathSteps({ ...base, placementCount: 0 })[3];
    expect(reach.done).toBe(false);
    expect(reach.detail).toMatch(/no student can find it/);
  });
});
