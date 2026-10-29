import 'server-only';

import { db, type DbClient } from '@rms/db';
import { adminScope } from '@rms/academic/scope';
import {
  getBatchProjectsOverview as academicGetBatchProjectsOverview,
  getBatchProjectSubmissions as academicGetBatchProjectSubmissions,
  getBatchProjectSubmissionDetails as academicGetBatchProjectSubmissionDetails,
  type BatchProjectOverviewItem,
  type ProjectSubmissionListItem,
  type ProjectSubmissionInspectorDetails,
  type ProjectSubmissionFilters
} from '@rms/academic/projects';

export type {
  RubricCriterion,
  BatchProjectOverviewItem,
  ProjectSubmissionListItem,
  ProjectSubmissionInspectorDetails,
  ProjectSubmissionFilters
} from '@rms/academic/projects';

// Review transitions (claim, approve, request changes, reopen, correct) are in @rms/academic/review: one transaction
// for the status, reviewer attribution, XP and notification. See app/(admin)/batches/[batchId]/projects/actions.ts.

/**
 * Aggregated overview of the project assignments placed in a batch (see @rms/academic/projects).
 */
export async function getBatchProjectsOverview(
  batchId: string,
  client: DbClient = db
): Promise<BatchProjectOverviewItem[]> {
  if (!process.env.POSTGRES_URL) return [];
  return academicGetBatchProjectsOverview(client, adminScope(), batchId);
}

/**
 * Project submissions of a batch with operational filters (see @rms/academic/projects).
 */
export async function getBatchProjectSubmissions(
  batchId: string,
  filters: ProjectSubmissionFilters = {},
  client: DbClient = db
): Promise<ProjectSubmissionListItem[]> {
  if (!process.env.POSTGRES_URL) return [];
  return academicGetBatchProjectSubmissions(client, adminScope(), batchId, filters);
}

/**
 * Full details of one submission, only if it belongs to batchId (see @rms/academic/projects).
 */
export async function getBatchProjectSubmissionDetails(
  batchId: string,
  submissionId: string,
  client: DbClient = db
): Promise<ProjectSubmissionInspectorDetails | null> {
  if (!process.env.POSTGRES_URL) return null;
  return academicGetBatchProjectSubmissionDetails(client, adminScope(), batchId, submissionId);
}
