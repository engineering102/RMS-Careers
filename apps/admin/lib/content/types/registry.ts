// One place that describes each content type: names, how it is authored, and which shared fields it uses.
// Client-safe (no server imports), so the library, create dialog, builder and preview all read the same labels.
import type { ContentTypeEnum, QuizTypeEnum } from '@rms/db';

/** How an item's type-specific content is authored. */
export type AuthoringWorkflow = 'inline' | 'quiz-workbench' | 'dsa-catalogue';

export interface ContentTypeDefinition {
  label: string;
  description: string;
  workflow: AuthoringWorkflow;
  /** Shows the duration field (stored as metadata.durationMinutes). */
  hasDuration: boolean;
  durationLabel?: string;
  descriptionLabel: string;
  descriptionHint: string;
}

export const CONTENT_TYPE_DEFS: Record<ContentTypeEnum, ContentTypeDefinition> = {
  lecture: {
    label: 'Video lecture',
    description: 'An embedded YouTube, Vimeo or https player. Students mark it complete.',
    workflow: 'inline',
    hasDuration: true,
    durationLabel: 'Duration (minutes)',
    descriptionLabel: 'Description',
    descriptionHint: 'A short summary shown under the video.'
  },
  notes: {
    label: 'Reading',
    description: 'Notes students read on the page, optionally with a linked document.',
    workflow: 'inline',
    hasDuration: true,
    durationLabel: 'Reading time (minutes)',
    descriptionLabel: 'Description',
    descriptionHint: 'A short summary shown under the title.'
  },
  resource: {
    label: 'Resource link',
    description: 'An external document, slide deck or PDF students open or download.',
    workflow: 'inline',
    hasDuration: true,
    durationLabel: 'Reading time (minutes)',
    descriptionLabel: 'Description',
    descriptionHint: 'A short summary shown under the title.'
  },
  quiz: {
    label: 'Quiz',
    description: 'Multiple-choice questions, as a practice quiz or a formal assessment.',
    workflow: 'quiz-workbench',
    hasDuration: false,
    descriptionLabel: 'Description',
    descriptionHint: 'A short summary shown on the quiz start screen.'
  },
  project: {
    label: 'Project',
    description: 'A brief plus a scored rubric. Students submit a GitHub link for tutor review.',
    workflow: 'inline',
    hasDuration: false,
    descriptionLabel: 'Project brief',
    descriptionHint: 'What to build, the requirements, and what to submit. Shown at the top of the project page.'
  },
  dsa_sheet: {
    label: 'DSA sheet',
    description: 'Links students to a sheet in the DSA Practice Center. Problems are not authored here.',
    workflow: 'dsa-catalogue',
    hasDuration: false,
    descriptionLabel: 'Description',
    descriptionHint: 'A short summary shown under the title.'
  }
};

export const WORKFLOW_LABELS: Record<AuthoringWorkflow, string> = {
  inline: 'Edited in the builder',
  'quiz-workbench': 'Questions in the quiz workbench',
  'dsa-catalogue': 'Links to the DSA catalogue'
};

export type CreateChoiceId =
  | 'lecture'
  | 'notes'
  | 'resource'
  | 'practice_quiz'
  | 'formal_assessment'
  | 'project'
  | 'dsa_sheet';

export interface CreateChoice {
  id: CreateChoiceId;
  contentType: ContentTypeEnum;
  /** Only for quizzes: practice and formal are different products for students. */
  quizType?: QuizTypeEnum;
  label: string;
  description: string;
}

/** The cards on the create step. Practice and formal quizzes are both `quiz` items with a different quiz_type. */
export const CREATE_CHOICES: CreateChoice[] = [
  { id: 'lecture', contentType: 'lecture', label: CONTENT_TYPE_DEFS.lecture.label, description: CONTENT_TYPE_DEFS.lecture.description },
  { id: 'notes', contentType: 'notes', label: CONTENT_TYPE_DEFS.notes.label, description: CONTENT_TYPE_DEFS.notes.description },
  { id: 'resource', contentType: 'resource', label: CONTENT_TYPE_DEFS.resource.label, description: CONTENT_TYPE_DEFS.resource.description },
  {
    id: 'practice_quiz',
    contentType: 'quiz',
    quizType: 'practice',
    label: 'Practice quiz',
    description: 'Untimed, unlimited retakes, explanations shown straight away.'
  },
  {
    id: 'formal_assessment',
    contentType: 'quiz',
    quizType: 'formal',
    label: 'Formal assessment',
    description: 'Timed, single attempt, with a server-enforced deadline and auto-submit.'
  },
  { id: 'project', contentType: 'project', label: CONTENT_TYPE_DEFS.project.label, description: CONTENT_TYPE_DEFS.project.description },
  { id: 'dsa_sheet', contentType: 'dsa_sheet', label: CONTENT_TYPE_DEFS.dsa_sheet.label, description: CONTENT_TYPE_DEFS.dsa_sheet.description }
];

/** Quiz row defaults for a new quiz, matching what updateQuizConfig would default to for that type. */
export function quizDefaultsFor(quizType: QuizTypeEnum) {
  return quizType === 'formal'
    ? { quizType, timeLimitMinutes: 30, showExplanations: 'after_deadline' as const }
    : { quizType, timeLimitMinutes: null, showExplanations: 'immediate' as const };
}

export const contentTypeLabel = (type: ContentTypeEnum) => CONTENT_TYPE_DEFS[type]?.label ?? type;
