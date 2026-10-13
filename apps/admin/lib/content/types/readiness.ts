// Things worth checking before publishing. These are warnings: publishing stays allowed, as it is today.
import type { ContentTypeEnum } from '@rms/db';
import { parseVideoUrl } from '../video-url';

export interface ReadinessInput {
  type: ContentTypeEnum;
  description: string;
  videoUrl: string;
  resourceLink: string;
  notes: string;
  /** Saved question count, for quizzes. */
  quizQuestionCount?: number;
  /** Projects with no rubric row fall back to the default rubric. */
  usesDefaultRubric?: boolean;
}

export function publishWarnings(input: ReadinessInput): string[] {
  const warnings: string[] = [];
  switch (input.type) {
    case 'lecture':
      if (!parseVideoUrl(input.videoUrl)) warnings.push('There is no playable video, so students see “video unavailable”.');
      break;
    case 'notes':
    case 'resource':
      if (!input.resourceLink.trim() && !input.notes.trim()) {
        warnings.push('There is no document link or notes, so students see an empty reading page.');
      }
      break;
    case 'quiz':
      if (!input.quizQuestionCount) warnings.push('The quiz has no questions yet.');
      break;
    case 'project':
      if (!input.description.trim()) warnings.push('The project has no brief, so students do not know what to build.');
      if (input.usesDefaultRubric) warnings.push('The project still uses the default rubric.');
      break;
    case 'dsa_sheet':
      break;
  }
  return warnings;
}
