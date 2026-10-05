import type { SubmissionStatusEnum } from '@rms/db';

export type ProjectSubmissionStatus = SubmissionStatusEnum;

export interface RubricCriterion {
  id?: string;
  title: string;
  maxPoints: number;
  description?: string;
}

export interface ProjectSubmissionSummary {
  id: string;
  assignmentId: string;
  studentId: number;
  batchId: string;
  githubUrl: string;
  liveUrl: string | null;
  notes: string | null;
  status: ProjectSubmissionStatus;
  score: number | null;
  tutorFeedback: string | null;
  reviewedByTutorId: string | null;
  reviewedAt: Date | null;
  submittedAt: Date;
  updatedAt: Date;
  canResubmit: boolean;
}

export interface ProjectAssignmentDetail {
  assignmentId: string;
  contentItemId: string;
  title: string;
  description: string | null;
  programId?: number | null;
  rubricCriteria: RubricCriterion[];
  maxScore: number;
  batchId: string;
  batchName: string;
  availableFrom: Date | null;
  dueAt: Date | null;
  isAvailable: boolean;
  isPastDue: boolean;
  submission: ProjectSubmissionSummary | null;
}

export interface ProjectAssignmentCardData {
  assignmentId: string;
  contentItemId: string;
  title: string;
  description: string | null;
  batchId: string;
  batchName: string;
  dueAt: Date | null;
  maxScore: number;
  submission: {
    id: string;
    status: ProjectSubmissionStatus;
    score: number | null;
    submittedAt: Date;
    reviewedAt: Date | null;
  } | null;
}

export interface SubmitProjectInput {
  assignmentId: string;
  contentItemId: string;
  batchId: string;
  githubUrl: string;
  liveUrl?: string | null;
  notes?: string | null;
}

export interface SubmitProjectResult {
  submissionId: string;
  status: ProjectSubmissionStatus;
  submittedAt: Date;
  isResubmission: boolean;
}
