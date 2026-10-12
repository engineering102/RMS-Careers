import 'server-only';

import { db, assignments, assignmentSubmissions, type DbClient } from '@rms/db';
import { count, eq } from 'drizzle-orm';
import type { RubricCriterion } from './batch-projects';
import { rubricMaxScore } from '@/lib/content/project-rubric';

export interface ProjectAssignmentConfig {
  assignmentId: string | null;
  rubricCriteria: RubricCriterion[];
  maxScore: number;
  submissionCount: number;
}

/** The project's rubric, or null when no assignment row exists yet (students then get the default rubric). */
export async function getProjectAssignmentConfig(
  contentItemId: string,
  client: DbClient = db
): Promise<ProjectAssignmentConfig | null> {
  const [row] = await client
    .select({
      id: assignments.id,
      rubricCriteria: assignments.rubricCriteria,
      maxScore: assignments.maxScore
    })
    .from(assignments)
    .where(eq(assignments.contentItemId, contentItemId))
    .limit(1);

  if (!row) return null;

  const [submissions] = await client
    .select({ total: count() })
    .from(assignmentSubmissions)
    .where(eq(assignmentSubmissions.assignmentId, row.id));

  return {
    assignmentId: row.id,
    rubricCriteria: Array.isArray(row.rubricCriteria) ? (row.rubricCriteria as RubricCriterion[]) : [],
    maxScore: row.maxScore,
    submissionCount: Number(submissions?.total ?? 0)
  };
}

/** Creates or replaces the project's rubric. The max score is derived from the criteria. */
export async function saveProjectRubric(
  contentItemId: string,
  criteria: RubricCriterion[],
  client: DbClient = db
): Promise<void> {
  const maxScore = rubricMaxScore(criteria);
  await client
    .insert(assignments)
    .values({ contentItemId, rubricCriteria: criteria, maxScore })
    .onConflictDoUpdate({
      target: assignments.contentItemId,
      set: { rubricCriteria: criteria, maxScore, updatedAt: new Date() }
    });
}
