// The content_items.metadata a new item starts with. It uses the same keys a builder save writes
// (see app/(admin)/content/[id]/metadata-patch.ts), so whatever the create dialog collected shows up
// in the builder already filled in. Fields that belong to another type are never stored.
import type { ContentTypeEnum } from '@rms/db';
import { buildStudentMetadataPatch } from './student-metadata';
import { buildExternalTestMetadataPatch } from './external-test';

export interface CreateMetadataInput {
  contentType: ContentTypeEnum;
  slug?: string;
  topic?: string;
  subject?: string;
  inLibrary?: boolean;
  videoUrl?: string;
  resourceLink?: string;
  notes?: string;
  durationMinutes?: number | null;
  externalProvider?: string;
  externalUrl?: string;
  assessmentCode?: string;
}

const present = (value: string | undefined) => (value && value.trim() ? value : undefined);

/** Throws InvalidVideoUrlError for a video link students could not play. */
export function createMetadataFor(input: CreateMetadataInput): Record<string, unknown> {
  const shared = {
    topic: present(input.topic),
    subject: present(input.subject),
    inLibrary: input.inLibrary
  };
  const duration = input.durationMinutes ?? undefined;

  switch (input.contentType) {
    case 'lecture':
      return buildStudentMetadataPatch({ ...shared, videoUrl: present(input.videoUrl), durationMinutes: duration });
    case 'notes':
    case 'resource':
      return buildStudentMetadataPatch({
        ...shared,
        resourceLink: present(input.resourceLink),
        notes: present(input.notes),
        durationMinutes: duration
      });
    case 'dsa_sheet': {
      // The student portal follows metadata.slug to the catalogue sheet, so it must be the slug that was asked for,
      // even if the row slug later gets a suffix to stay unique.
      const slug = present(input.slug)?.trim();
      return { ...buildStudentMetadataPatch(shared), ...(slug ? { slug } : {}) };
    }
    case 'quiz':
    case 'project':
      return buildStudentMetadataPatch(shared);
    case 'external_test':
      return buildExternalTestMetadataPatch({
        topic: shared.topic,
        externalProvider: input.externalProvider ?? '',
        externalUrl: input.externalUrl ?? '',
        assessmentCode: input.assessmentCode ?? '',
        durationMinutes: input.durationMinutes ?? null
      });
  }
}
