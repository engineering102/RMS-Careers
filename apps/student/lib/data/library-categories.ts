import type { ContentType } from '@/lib/types/library';

/** Content types students browse as categories in My Library (external tests live on Assessments). */
export type LibraryCategoryType = Exclude<ContentType, 'external_test'>;

export interface LibraryCategory {
  type: LibraryCategoryType;
  label: string;
  /** Singular / plural nouns for counts ("1 lecture", "4 lectures"). */
  noun: [singular: string, plural: string];
  tagline: string;
  description: string;
}

/** Display order of the category cards on the My Library hub. */
export const LIBRARY_CATEGORIES: LibraryCategory[] = [
  {
    type: 'lecture',
    label: 'Lectures',
    noun: ['lecture', 'lectures'],
    tagline: 'Watch & learn',
    description: 'Recorded sessions and walkthroughs you can replay at your own pace.'
  },
  {
    type: 'notes',
    label: 'Notes',
    noun: ['note', 'notes'],
    tagline: 'Read & revise',
    description: 'Concise study notes and reference material for quick revision.'
  },
  {
    type: 'dsa_sheet',
    label: 'DSA Practice',
    noun: ['sheet', 'sheets'],
    tagline: 'Solve by pattern',
    description: 'Pattern-based problem sheets to build interview-ready problem solving.'
  },
  {
    type: 'quiz',
    label: 'Quizzes',
    noun: ['quiz', 'quizzes'],
    tagline: 'Test yourself',
    description: 'Short checks to confirm your understanding of each topic.'
  },
  {
    type: 'project',
    label: 'Projects',
    noun: ['project', 'projects'],
    tagline: 'Build for real',
    description: 'Hands-on, production-style builds that grow your portfolio.'
  },
  {
    type: 'resource',
    label: 'Resources',
    noun: ['resource', 'resources'],
    tagline: 'Go deeper',
    description: 'Curated links, guides, and extra reading beyond the curriculum.'
  }
];

export function getLibraryCategory(type: string | undefined | null): LibraryCategory | null {
  if (!type) return null;
  return LIBRARY_CATEGORIES.find((c) => c.type === type) ?? null;
}

export function formatCategoryCount(category: LibraryCategory, count: number): string {
  return `${count} ${count === 1 ? category.noun[0] : category.noun[1]}`;
}

export function libraryCategoryHref(type: LibraryCategoryType): string {
  return `/library?type=${encodeURIComponent(type)}`;
}
