import type { ContentType, ContentItemMetadata } from './library';

export type CurriculumItemStatus = 'completed' | 'pending' | 'locked' | 'overdue' | 'archived';

export interface CurriculumItem {
  id: number; // batch_curriculum.id
  batchId: string;
  contentItemId: string;
  title: string;
  slug: string;
  contentType: ContentType;
  description: string | null;
  metadata: ContentItemMetadata;
  weekNumber: number;
  sequenceOrder: number;
  isRequired: boolean;
  availableFrom: Date | null;
  dueAt: Date | null;
  isCompleted: boolean;
  isLocked: boolean;
  isOverdue: boolean;
  isArchived?: boolean;
  status: CurriculumItemStatus;
}

export interface CurriculumWeek {
  weekNumber: number;
  items: CurriculumItem[];
  totalCount: number;
  completedCount: number;
}

export interface BatchWorkspaceBatch {
  id: string;
  name: string;
  programId: number;
  programName: string;
  programCode: string;
  collegeName?: string | null;
  startDate: Date | null;
  endDate: Date | null;
}

export interface EnrolledBatchSummary {
  batchId: string;
  batchName: string;
  programCode: string;
  programName: string;
}

export interface BatchWorkspaceData {
  batch: BatchWorkspaceBatch;
  weeks: CurriculumWeek[];
  totalMilestones: number;
  completedMilestones: number;
  overallProgressPercent: number;
  activeEnrolledBatches: EnrolledBatchSummary[];
  isReadOnly?: boolean;
  enrollmentStatus?: string;
}
