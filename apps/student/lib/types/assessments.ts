export type QuizType = 'practice' | 'formal';
export type QuestionType = 'single_choice' | 'multiple_choice';
export type ExplanationPolicy = 'immediate' | 'after_deadline' | 'never';

export interface QuizQuestionOption {
  id: string;
  text: string;
}

/**
 * Client-safe question representation sent to the browser during the quiz attempt.
 * CRITICAL SECURITY INVARIANT: correctOptionIds and explanationText are excluded.
 */
export interface ClientQuizQuestion {
  id: number;
  questionText: string;
  questionType: QuestionType;
  options: QuizQuestionOption[];
  points: number;
  sequenceOrder: number;
}

export interface PracticeQuizSummary {
  id: string; // quizzes.id
  contentItemId: string;
  programId: number;
  programName: string;
  programCode: string;
  title: string;
  slug: string;
  description: string | null;
  quizType: QuizType;
  passingScorePercent: number;
  questionCount: number;
  totalPoints: number;
  // Student's attempt history metrics
  attemptCount: number;
  bestScore: number | null;
  bestPercentage: number | null;
  isPassed: boolean;
  lastAttemptAt: Date | null;
}

export interface PracticeQuizRunnerData {
  id: string;
  contentItemId: string;
  programName: string;
  programCode: string;
  title: string;
  description: string | null;
  passingScorePercent: number;
  questions: ClientQuizQuestion[];
  totalPoints: number;
  previousAttemptsCount: number;
  hasPassedPreviously: boolean;
  relatedBatchContext?: {
    batchId: string;
    batchName: string;
  } | null;
}

export interface QuestionGradingResult {
  questionId: number;
  questionText: string;
  questionType: QuestionType;
  points: number;
  earnedPoints: number;
  isCorrect: boolean;
  selectedOptionIds: string[];
  correctOptionIds: string[];
  explanationText: string | null;
}

export interface PracticeQuizSubmissionResult {
  attemptId: string;
  quizId: string;
  score: number;
  maxScore: number;
  percentage: number;
  isPassed: boolean;
  isFirstPass: boolean;
  xpAwarded: number;
  submittedAt: Date;
  questionResults: QuestionGradingResult[];
}

export interface SubmitPracticeQuizInput {
  quizId: string;
  responses: Record<number, string[]>; // questionId -> selectedOptionIds
  batchId?: string;
}
