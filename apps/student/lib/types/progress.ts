import type { ContentType } from './library';

export type ContentCompletionStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'needs_revision';

export interface ContentProgressRecord {
  contentItemId: string;
  contentType: ContentType;
  status: ContentCompletionStatus;
  completedAt: Date | null;
  score?: number | null;
  maxScore?: number | null;
  details?: {
    isPassed?: boolean;
    submissionStatus?: string;
    problemSlug?: string;
  };
}

export interface WeekProgressSummary {
  weekNumber: number;
  totalItems: number;
  completedItems: number;
  percentage: number;
  isUnlocked: boolean;
  availableFrom: Date | null;
}

export interface BatchProgressSummary {
  batchId: string;
  batchName: string;
  totalRequiredItems: number;
  completedRequiredItems: number;
  overallPercentage: number;
  weeks: WeekProgressSummary[];
  itemsMap: Record<string, ContentProgressRecord>;
}

export interface ResumeLearningTarget {
  hasTarget: boolean;
  batchId?: string;
  batchName?: string;
  contentItemId?: string;
  contentTitle?: string;
  contentType?: ContentType;
  weekNumber?: number;
  sequenceOrder?: number;
  dueAt?: Date | null;
  status?: 'not_started' | 'in_progress' | 'needs_revision';
  reason?: 'next_in_sequence' | 'in_progress_resubmission' | 'due_soon';
  completionPercentage?: number;
  isCaughtUp?: boolean;
  isCurriculumCompleted?: boolean;
  nextUnlockDate?: Date | null;
  hasNoEnrollments?: boolean;
}

export interface NextCurriculumItemTarget {
  contentItemId: string;
  title: string;
  contentType: ContentType;
  weekNumber: number;
  sequenceOrder: number;
}
