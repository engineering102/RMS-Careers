// Project brief rubric: validation and the default the student portal falls back to.
import { z } from 'zod';

/**
 * The rubric students get when a project has no rubric yet. Mirrors the default the student portal
 * inserts on first view (apps/student/lib/db/queries/projects.ts), so admins see exactly what students see.
 */
export const DEFAULT_PROJECT_RUBRIC = [
  {
    title: 'Code Quality & Structure',
    maxPoints: 40,
    description: 'Clean, modular, and maintainable codebase adhering to industry conventions.'
  },
  {
    title: 'Feature Completeness',
    maxPoints: 40,
    description: 'All functional requirements implemented as specified in project brief.'
  },
  {
    title: 'Documentation & Git Commits',
    maxPoints: 20,
    description: 'Informative README with setup guide and structured, semantic commit history.'
  }
];

export const rubricCriterionSchema = z.object({
  title: z.string().trim().min(2, 'Each criterion needs a title.').max(120, 'Criterion titles must be under 120 characters.'),
  maxPoints: z.coerce
    .number({ invalid_type_error: 'Points must be a number.' })
    .int('Points must be a whole number.')
    .min(1, 'Each criterion must be worth at least 1 point.')
    .max(1000, 'A criterion can be worth at most 1000 points.'),
  description: z.string().trim().max(500, 'Criterion descriptions must be under 500 characters.').optional().default('')
});

export const projectRubricSchema = z
  .array(rubricCriterionSchema)
  .min(1, 'Add at least one rubric criterion.')
  .max(12, 'Use at most 12 rubric criteria.');

export type RubricCriterionInput = z.infer<typeof rubricCriterionSchema>;

/** The project's max score is always the sum of its criteria, so grading totals stay consistent. */
export function rubricMaxScore(criteria: { maxPoints: number }[]): number {
  return criteria.reduce((sum, c) => sum + c.maxPoints, 0);
}
