// Pure helpers for `external_test` content items (a test hosted on another platform, e.g. QwikTest).
// Metadata is authored in the admin builder (apps/admin/lib/content/external-test.ts):
//   externalProvider, externalUrl (https only), assessmentCode, durationMinutes.
// Results come back through the admin External assessments import and are matched to the item by
// (student, batch, assessment code), case-insensitively, the same way the import detects duplicates.

export interface ExternalTestMetadata {
  provider: string;
  /** Null unless the stored link is a well-formed https URL; students are never sent anything else. */
  url: string | null;
  /** Lower-cased, trimmed; '' when none was set. */
  codeKey: string;
  durationMinutes: number | null;
}

const HTTPS_URL = /^https:\/\/[^\s/]+\.[^\s]*$/i;

export function readExternalTestMetadata(metadata: unknown): ExternalTestMetadata {
  const m = metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : {};
  const str = (key: string) => (typeof m[key] === 'string' ? (m[key] as string).trim() : '');
  const url = str('externalUrl');
  const duration = m.durationMinutes;
  return {
    provider: str('externalProvider') || 'External platform',
    url: HTTPS_URL.test(url) ? url : null,
    codeKey: str('assessmentCode').toLowerCase(),
    durationMinutes: typeof duration === 'number' && Number.isFinite(duration) && duration > 0 ? duration : null
  };
}

export type ExternalTestWindowState = 'upcoming' | 'open' | 'closed';

/** Where the student is relative to the batch schedule (available_from / due_at). */
export function externalTestWindowState(
  availableFrom: Date | null,
  dueAt: Date | null,
  now: Date = new Date()
): ExternalTestWindowState {
  if (availableFrom && now.getTime() < availableFrom.getTime()) return 'upcoming';
  if (dueAt && now.getTime() > dueAt.getTime()) return 'closed';
  return 'open';
}
