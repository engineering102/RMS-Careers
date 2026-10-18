import { buildStudentMetadataPatch } from '@/lib/content/student-metadata';
import { buildExternalTestMetadataPatch } from '@/lib/content/external-test';
import type { ContentBuilderData } from './schema';

/**
 * The content_items.metadata patch a builder save writes for each type. It is a patch: updateContentItem
 * merges it, so keys the builder does not author (archive flags, seeded keys) are kept.
 * Throws InvalidVideoUrlError for a video link students could not play.
 */
export function builderMetadataPatch(data: ContentBuilderData): Record<string, unknown> {
  switch (data.contentType) {
    case 'lecture':
      return buildStudentMetadataPatch({
        topic: data.topic,
        videoUrl: data.videoUrl,
        durationMinutes: data.durationMinutes
      });
    case 'notes':
    case 'resource':
      return buildStudentMetadataPatch({
        topic: data.topic,
        resourceLink: data.resourceLink,
        notes: data.notes,
        durationMinutes: data.durationMinutes
      });
    case 'dsa_sheet':
      // The student portal reads metadata.slug before the row slug, so keep them in step.
      return { ...buildStudentMetadataPatch({ topic: data.topic }), slug: data.slug };
    case 'project':
    case 'quiz':
      return buildStudentMetadataPatch({ topic: data.topic });
    case 'external_test':
      return buildExternalTestMetadataPatch({
        topic: data.topic,
        externalProvider: data.externalProvider,
        externalUrl: data.externalUrl,
        assessmentCode: data.assessmentCode,
        durationMinutes: data.durationMinutes
      });
  }
}
