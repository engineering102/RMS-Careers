// Builder form state and its conversion to the typed save payload. Pure, so it is unit-tested directly.
import type { ContentTypeEnum } from '@rms/db';
import type { ContentItemWithDetails, ProjectAssignmentConfig } from '@/lib/db/queries';
import { readAuthoringFields } from '@/lib/content/student-metadata';
import { readExternalTestFields } from '@/lib/content/external-test';
import { DEFAULT_PROJECT_RUBRIC } from '@/lib/content/project-rubric';
import type { ContentBuilderInput } from './schema';

export interface RubricRow {
  key: string;
  title: string;
  maxPoints: string;
  description: string;
}

/** Flat form state: shared fields plus every type's fields. Only the item's own type is ever sent. */
export interface BuilderForm {
  title: string;
  slug: string;
  description: string;
  programId: string;
  topic: string;
  videoUrl: string;
  resourceLink: string;
  notes: string;
  durationMinutes: string;
  rubric: RubricRow[];
  externalProvider: string;
  externalUrl: string;
  assessmentCode: string;
}

let rubricKeySeed = 0;
export const rubricKey = () => `criterion-${++rubricKeySeed}`;

export function initialForm(item: ContentItemWithDetails, projectConfig: ProjectAssignmentConfig | null): BuilderForm {
  const fields = readAuthoringFields(item.metadata);
  const external = readExternalTestFields(item.metadata);
  const rubricSource =
    projectConfig && projectConfig.rubricCriteria.length > 0 ? projectConfig.rubricCriteria : DEFAULT_PROJECT_RUBRIC;
  return {
    title: item.title,
    slug: item.slug,
    description: item.description ?? '',
    programId: item.programId === null ? 'global' : String(item.programId),
    topic: fields.topic,
    videoUrl: fields.videoUrl,
    resourceLink: fields.resourceLink,
    notes: fields.notes,
    durationMinutes: fields.durationMinutes === null ? '' : String(fields.durationMinutes),
    rubric:
      item.contentType === 'project'
        ? rubricSource.map((c) => ({
            key: rubricKey(),
            title: c.title,
            maxPoints: String(c.maxPoints),
            description: c.description ?? ''
          }))
        : [],
    externalProvider: external.externalProvider || (item.contentType === 'external_test' ? 'QwikTest' : ''),
    externalUrl: external.externalUrl,
    assessmentCode: external.assessmentCode
  };
}

/** Comparable snapshot without React keys, for unsaved-change detection. */
export const snapshot = (form: BuilderForm) =>
  JSON.stringify({ ...form, rubric: form.rubric.map(({ key: _key, ...rest }) => rest) });

/** The save payload for the item's type: fields that belong to other types are never sent. */
export function toBuilderInput(id: string, type: ContentTypeEnum, form: BuilderForm): ContentBuilderInput {
  const base = {
    id,
    title: form.title,
    slug: form.slug,
    description: form.description,
    programId: form.programId === 'global' ? null : Number(form.programId),
    topic: form.topic
  };
  const duration = form.durationMinutes.trim() === '' ? null : Number(form.durationMinutes.trim());

  switch (type) {
    case 'lecture':
      return { ...base, contentType: type, videoUrl: form.videoUrl, durationMinutes: duration };
    case 'notes':
    case 'resource':
      return { ...base, contentType: type, resourceLink: form.resourceLink, notes: form.notes, durationMinutes: duration };
    case 'project':
      return {
        ...base,
        contentType: type,
        rubric: form.rubric.map((r) => ({ title: r.title, maxPoints: Number(r.maxPoints), description: r.description }))
      };
    case 'quiz':
    case 'dsa_sheet':
      return { ...base, contentType: type };
    case 'external_test':
      return {
        ...base,
        contentType: type,
        externalProvider: form.externalProvider,
        externalUrl: form.externalUrl,
        assessmentCode: form.assessmentCode,
        durationMinutes: duration
      };
  }
}
