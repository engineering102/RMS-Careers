// Parser for pasting many quiz questions at once (the quiz workbench's "Import questions").
// Pure and client-safe, so the dialog previews exactly what the server will be sent.
//
// Format: one question per block, blocks separated by a blank line.
//
//   Q: What is the time complexity of binary search?
//   A) O(n)
//   *B) O(log n)
//   C) O(1)
//   Explanation: The search space halves on every step.
//   Points: 2
//
// A leading * marks a correct option; an "Answer: B" (or "Answer: A, C") line does the same. More than
// one correct option makes the question multiple-choice.

export const MAX_IMPORT_QUESTIONS = 200;

export interface ImportedQuestion {
  questionText: string;
  questionType: 'single_choice' | 'multiple_choice';
  options: { id: string; text: string }[];
  correctOptionIds: string[];
  explanationText: string | null;
  points: number;
}

export interface ImportIssue {
  /** 1-based position of the block in the pasted text. */
  block: number;
  /** First line of the block, so the author can find it. */
  excerpt: string;
  message: string;
}

export interface QuizImportResult {
  questions: ImportedQuestion[];
  issues: ImportIssue[];
}

// "*A) text", "A. text", "a: text", "* (B) text", "- text", "*- text"
const OPTION_LINE = /^(\*)?\s*(?:\(?([A-Ja-j])[).:]\s+|[-•]\s+)(.+)$/;
const ANSWER_LINE = /^(?:answers?|ans|correct(?:\s+answers?)?)\s*[:=-]\s*(.+)$/i;
const EXPLANATION_LINE = /^(?:explanation|explain|why)\s*[:=-]\s*(.*)$/i;
const POINTS_LINE = /^(?:points?|marks?)\s*[:=-]\s*(\d+)\s*$/i;
const QUESTION_PREFIX = /^(?:q(?:uestion)?\s*\d*\s*[.:)-]\s*|\d+\s*[.)]\s+)/i;

export function parseQuizImport(text: string): QuizImportResult {
  const blocks = text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((b) =>
      b
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
    )
    .filter((lines) => lines.length > 0);

  const result: QuizImportResult = { questions: [], issues: [] };

  blocks.forEach((lines, index) => {
    const block = index + 1;
    const excerpt = lines[0].length > 80 ? `${lines[0].slice(0, 77)}…` : lines[0];
    const fail = (message: string) => result.issues.push({ block, excerpt, message });

    const questionLines: string[] = [];
    const options: { text: string; correct: boolean; letter: string | null }[] = [];
    const explanationLines: string[] = [];
    let answerLetters: string[] | null = null;
    let points = 1;
    let section: 'question' | 'options' | 'explanation' = 'question';

    for (const line of lines) {
      const pointsMatch = line.match(POINTS_LINE);
      if (pointsMatch) {
        points = Number(pointsMatch[1]);
        continue;
      }
      const answerMatch = line.match(ANSWER_LINE);
      if (answerMatch && options.length > 0) {
        answerLetters = answerMatch[1]
          .split(/[\s,;&/]+|and/i)
          .map((s) => s.replace(/[^A-Ja-j]/g, '').toUpperCase())
          .filter((s) => s.length === 1);
        continue;
      }
      const explanationMatch = line.match(EXPLANATION_LINE);
      if (explanationMatch && options.length > 0) {
        section = 'explanation';
        if (explanationMatch[1]) explanationLines.push(explanationMatch[1]);
        continue;
      }
      const optionMatch = section !== 'explanation' ? line.match(OPTION_LINE) : null;
      if (optionMatch) {
        section = 'options';
        options.push({
          text: optionMatch[3].trim(),
          correct: Boolean(optionMatch[1]),
          letter: optionMatch[2] ? optionMatch[2].toUpperCase() : null
        });
        continue;
      }
      if (section === 'question') questionLines.push(line);
      else if (section === 'explanation') explanationLines.push(line);
      else options[options.length - 1].text += ` ${line}`; // a wrapped option line
    }

    const questionText = questionLines.join('\n').replace(QUESTION_PREFIX, '').trim();
    if (questionText.length < 3) return fail('The question text is missing. Start the block with the question.');
    if (options.length < 2) return fail('At least two options are needed, written as "A) …" lines.');
    if (options.length > 10) return fail('A question can have at most 10 options.');
    if (points < 1 || points > 100) return fail('Points must be between 1 and 100.');

    if (answerLetters) {
      const unknown = answerLetters.filter((l) => !options.some((o, i) => (o.letter ?? String.fromCharCode(65 + i)) === l));
      if (answerLetters.length === 0 || unknown.length > 0) {
        return fail(`The Answer line names an option that is not in the list${unknown.length ? ` (${unknown.join(', ')})` : ''}.`);
      }
      options.forEach((o, i) => {
        if (answerLetters!.includes(o.letter ?? String.fromCharCode(65 + i))) o.correct = true;
      });
    }

    const built = options.map((o, i) => ({ id: `opt_${i + 1}`, text: o.text, correct: o.correct }));
    const correctOptionIds = built.filter((o) => o.correct).map((o) => o.id);
    if (correctOptionIds.length === 0) {
      return fail('No correct answer is marked. Put * before the correct option, or add an "Answer: B" line.');
    }

    result.questions.push({
      questionText,
      questionType: correctOptionIds.length > 1 ? 'multiple_choice' : 'single_choice',
      options: built.map(({ id, text: optionText }) => ({ id, text: optionText })),
      correctOptionIds,
      explanationText: explanationLines.join('\n').trim() || null,
      points
    });
  });

  if (result.questions.length > MAX_IMPORT_QUESTIONS) {
    result.issues.push({
      block: MAX_IMPORT_QUESTIONS + 1,
      excerpt: result.questions[MAX_IMPORT_QUESTIONS].questionText.slice(0, 80),
      message: `Only ${MAX_IMPORT_QUESTIONS} questions can be imported at once. Import the rest in a second paste.`
    });
    result.questions = result.questions.slice(0, MAX_IMPORT_QUESTIONS);
  }

  return result;
}

export const QUIZ_IMPORT_EXAMPLE = `Q: What is the time complexity of binary search?
A) O(n)
*B) O(log n)
C) O(n log n)
D) O(1)
Explanation: The search space halves on every step.

Q: Which of these are linear data structures?
A) Array
B) Binary tree
C) Queue
D) Graph
Answer: A, C
Points: 2`;
