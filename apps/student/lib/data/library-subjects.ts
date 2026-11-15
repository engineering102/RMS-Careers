import {
  CONTENT_SUBJECTS,
  FALLBACK_SUBJECT_LABEL,
  FALLBACK_SUBJECT_SLUG
} from '@rms/db/content-subjects';
import type { LibraryCategoryType } from '@/lib/data/library-categories';

export interface LibrarySubject {
  slug: string;
  label: string;
}

/** Subjects students browse inside My Library, in display order. General collects unclassified items. */
export const LIBRARY_SUBJECTS: LibrarySubject[] = [
  ...CONTENT_SUBJECTS.map(({ slug, label }) => ({ slug, label })),
  { slug: FALLBACK_SUBJECT_SLUG, label: FALLBACK_SUBJECT_LABEL }
];

export function getLibrarySubject(slug: string | undefined | null): LibrarySubject | null {
  if (!slug) return null;
  return LIBRARY_SUBJECTS.find((s) => s.slug === slug) ?? null;
}

export function isLibrarySubject(slug: string): boolean {
  return getLibrarySubject(slug) !== null;
}

/** Link to a library listing for a content type, a subject, or both. */
export function librarySubjectHref(options: {
  type?: LibraryCategoryType | null;
  subject?: string | null;
}): string {
  const params = new URLSearchParams();
  if (options.type) params.set('type', options.type);
  if (options.subject) params.set('subject', options.subject);
  const qs = params.toString();
  return qs ? `/library?${qs}` : '/library';
}
