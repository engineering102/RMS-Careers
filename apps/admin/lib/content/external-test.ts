// An `external_test` content item: a link to a test hosted on an external assessment platform (e.g. QwikTest).
// Client-safe. Metadata keys are deliberately distinct from lecture keys (`provider` there means the video host):
//   externalProvider  display name of the platform, e.g. "QwikTest"
//   externalUrl       https link students open to sit the test
//   assessmentCode    the code results are imported under (External assessments page), so the student card
//                     can show the imported result for this test
//   durationMinutes   informational time limit, shown to students

/** Same limit and alphabet as an imported result's assessment code (batch-external-assessments.ts). */
export const ASSESSMENT_CODE_MAX = 100;
export const ASSESSMENT_CODE_PATTERN = /^[A-Za-z0-9._-]*$/;

/** Only https links: students open them in a new tab outside the portal. */
export const isExternalTestUrl = (value: string) => /^https:\/\/[^\s/]+\.[^\s]*$/i.test(value.trim());

export interface ExternalTestAuthoring {
  topic?: string;
  externalProvider: string;
  externalUrl: string;
  assessmentCode: string;
  durationMinutes: number | null;
}

const blankToNull = (value: string) => (value.trim() === '' ? null : value.trim());

/** Metadata patch for updateContentItem (merged into the existing metadata). Empty strings clear a key. */
export function buildExternalTestMetadataPatch(fields: ExternalTestAuthoring): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    externalProvider: blankToNull(fields.externalProvider),
    externalUrl: blankToNull(fields.externalUrl),
    assessmentCode: blankToNull(fields.assessmentCode),
    durationMinutes: fields.durationMinutes
  };
  if (fields.topic !== undefined) patch.topic = blankToNull(fields.topic);
  return patch;
}

export function readExternalTestFields(metadata: Record<string, unknown> | null | undefined) {
  const m = metadata ?? {};
  const str = (key: string) => (typeof m[key] === 'string' ? (m[key] as string) : '');
  return {
    externalProvider: str('externalProvider'),
    externalUrl: str('externalUrl'),
    assessmentCode: str('assessmentCode')
  };
}
