// Client-side browsing of the Library catalog. Pure: no React, no database, so it is unit-tested directly.
//
// The Library page loads the student's whole catalog once (getLibraryCatalog) and everything below runs in the
// browser: which view the URL asks for, the format and subject shelves with their counts, and search.
import {
  CONTENT_SUBJECTS,
  FALLBACK_SUBJECT_LABEL,
  FALLBACK_SUBJECT_SLUG
} from '@rms/db/content-subjects';
import { getLibraryCategory, LIBRARY_CATEGORIES, type LibraryCategory } from '@/lib/data/library-categories';
import type { LibraryCatalogItem, LibraryContentType } from '@/lib/types/library';

export interface LibrarySubject {
  slug: string;
  label: string;
  /** One line on what the subject covers, shown on its card. */
  description: string;
}

const SUBJECT_DESCRIPTIONS: Record<string, string> = {
  'programming-fundamentals':
    'Core programming in Python, Java and C++: variables, loops, functions and object-oriented basics.',
  dsa: 'Arrays, linked lists, trees, graphs and algorithm analysis for technical interviews.',
  'system-design': 'Designing systems that scale: architecture, caching, load balancing and design patterns.',
  'core-cs': 'Operating systems, DBMS and SQL, and computer networks.',
  'web-development': 'HTML, CSS, JavaScript, React and backend APIs for building full-stack applications.',
  'dev-tools': 'Git and GitHub, Linux and the terminal, and how code gets deployed.',
  aptitude: 'Quantitative aptitude, logical reasoning and verbal ability for placement tests.',
  career: 'Resumes, interviews, communication and placement preparation.',
  [FALLBACK_SUBJECT_SLUG]: 'Orientation and other material that does not sit under one subject.'
};

/** Subjects in display order. General collects unclassified items and comes last. */
export const LIBRARY_SUBJECTS: LibrarySubject[] = [
  ...CONTENT_SUBJECTS.map(({ slug, label }) => ({ slug, label })),
  { slug: FALLBACK_SUBJECT_SLUG, label: FALLBACK_SUBJECT_LABEL }
].map((subject) => ({ ...subject, description: SUBJECT_DESCRIPTIONS[subject.slug] ?? '' }));

export function getLibrarySubject(slug: string | undefined | null): LibrarySubject | null {
  if (!slug) return null;
  return LIBRARY_SUBJECTS.find((s) => s.slug === slug) ?? null;
}

/**
 * What the Library is showing, as carried by the URL: /library?subject=dsa&type=lecture&topic=Arrays&q=window
 * The path is Library > subject > format > content; topic and search narrow whichever level is open.
 */
export interface LibraryView {
  subject: string | null;
  type: LibraryContentType | null;
  topic: string | null;
  query: string;
}

/** Unknown ?type= and ?subject= values are ignored rather than producing an always-empty page. */
export function parseLibraryView(params: { get(name: string): string | null }): LibraryView {
  return {
    subject: getLibrarySubject(params.get('subject')?.trim())?.slug ?? null,
    type: getLibraryCategory(params.get('type')?.trim())?.type ?? null,
    topic: params.get('topic')?.trim() || null,
    query: params.get('q')?.trim() ?? ''
  };
}

export function libraryViewHref(view: Partial<LibraryView>): string {
  const params = new URLSearchParams();
  if (view.subject) params.set('subject', view.subject);
  if (view.type) params.set('type', view.type);
  if (view.topic) params.set('topic', view.topic);
  if (view.query?.trim()) params.set('q', view.query.trim());
  const qs = params.toString();
  return qs ? `/library?${qs}` : '/library';
}

/** Where a Library item opens. Quizzes and projects are taken from Assessments; DSA sheets from DSA Practice. */
export function libraryItemHref(item: Pick<LibraryCatalogItem, 'id' | 'slug' | 'contentType'>): string {
  switch (item.contentType) {
    case 'dsa_sheet':
      return item.slug ? `/dsa?sheet=${encodeURIComponent(item.slug)}` : '/dsa';
    case 'quiz':
    case 'project':
      return '/assessments';
    default:
      return `/content/${item.id}`;
  }
}

/** Items within the view's format and subject (search not applied). */
export function scopeItems(items: LibraryCatalogItem[], view: Pick<LibraryView, 'type' | 'subject'>) {
  return items.filter(
    (item) => (!view.type || item.contentType === view.type) && (!view.subject || item.subject === view.subject)
  );
}

/** Every word of the query must appear in the title, description, topic, subject or format name. */
export function searchItems(items: LibraryCatalogItem[], query: string): LibraryCatalogItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return items;
  return items.filter((item) => {
    const haystack = [
      item.title,
      item.description ?? '',
      item.topic ?? '',
      getLibrarySubject(item.subject)?.label ?? '',
      getLibraryCategory(item.contentType)?.label ?? ''
    ]
      .join(' ')
      .toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

/** Distinct topics among the items, A to Z. */
export function topicsOf(items: LibraryCatalogItem[]): string[] {
  return Array.from(new Set(items.map((item) => item.topic).filter((t): t is string => Boolean(t)))).sort((a, b) =>
    a.localeCompare(b)
  );
}

export interface FormatCount {
  category: LibraryCategory;
  count: number;
  topicCount: number;
}

/** Item and topic counts per format, in display order. Formats with nothing are included (shown as empty). */
export function countByFormat(items: LibraryCatalogItem[]): FormatCount[] {
  return LIBRARY_CATEGORIES.map((category) => {
    const ofFormat = items.filter((item) => item.contentType === category.type);
    return { category, count: ofFormat.length, topicCount: topicsOf(ofFormat).length };
  });
}

export interface SubjectShelf {
  subject: LibrarySubject;
  count: number;
  /** Formats present in this subject, in display order, e.g. 3 lectures, 2 notes. */
  formats: FormatCount[];
}

/** One shelf per subject that has items, in display order. */
export function subjectShelves(items: LibraryCatalogItem[]): SubjectShelf[] {
  return LIBRARY_SUBJECTS.map((subject) => {
    const inSubject = items.filter((item) => item.subject === subject.slug);
    return {
      subject,
      count: inSubject.length,
      formats: countByFormat(inSubject).filter((f) => f.count > 0)
    };
  }).filter((shelf) => shelf.count > 0);
}

export interface FormatSection {
  category: LibraryCategory;
  items: LibraryCatalogItem[];
}

/** Items grouped by format, in display order, keeping each group's incoming order. Empty formats are dropped. */
export function groupByFormat(items: LibraryCatalogItem[]): FormatSection[] {
  return LIBRARY_CATEGORIES.map((category) => ({
    category,
    items: items.filter((item) => item.contentType === category.type)
  })).filter((section) => section.items.length > 0);
}

export function formatCount(category: LibraryCategory, count: number): string {
  return `${count} ${count === 1 ? category.noun[0] : category.noun[1]}`;
}
