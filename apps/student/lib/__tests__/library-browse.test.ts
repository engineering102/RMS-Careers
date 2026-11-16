import { describe, it, expect } from 'vitest';
import {
  countByFormat,
  getLibrarySubject,
  groupByFormat,
  libraryItemHref,
  libraryViewHref,
  LIBRARY_SUBJECTS,
  parseLibraryView,
  scopeItems,
  searchItems,
  subjectShelves,
  topicsOf
} from '../library/browse';
import type { LibraryCatalogItem } from '../types/library';

const item = (patch: Partial<LibraryCatalogItem> & Pick<LibraryCatalogItem, 'id'>): LibraryCatalogItem => ({
  title: patch.id,
  slug: patch.id,
  contentType: 'lecture',
  description: null,
  topic: null,
  subject: 'general',
  durationMinutes: null,
  difficulty: null,
  programCode: 'CRP',
  ...patch
});

// Newest first, as the catalog query returns them.
const CATALOG: LibraryCatalogItem[] = [
  item({ id: 'l1', title: 'Sliding Window', subject: 'dsa', topic: 'Arrays & Two Pointers' }),
  item({ id: 'n1', title: 'Two-Pointer Notes', subject: 'dsa', contentType: 'notes', description: 'Fast and slow runners' }),
  item({ id: 'l2', title: 'Big-O in practice', subject: 'dsa' }),
  item({ id: 'l3', title: 'URL shortener', subject: 'system-design' }),
  item({ id: 'q1', title: 'Complexity check', subject: 'dsa', contentType: 'quiz' }),
  item({ id: 'r1', title: 'Welcome pack', contentType: 'resource' }),
  item({ id: 's1', title: 'DSA Sheet', slug: 'dsa-sheet', subject: 'dsa', contentType: 'dsa_sheet' })
];

const view = (qs: string) => parseLibraryView(new URLSearchParams(qs));

describe('library view in the URL', () => {
  it('reads subject, format, topic and search, ignoring unknown values', () => {
    expect(view('type=lecture&subject=dsa&topic=Arrays&q=%20window%20')).toEqual({
      subject: 'dsa',
      type: 'lecture',
      topic: 'Arrays',
      query: 'window'
    });
    expect(view('type=external_test&subject=astrology')).toEqual({ subject: null, type: null, topic: null, query: '' });
    expect(view('')).toEqual({ subject: null, type: null, topic: null, query: '' });
  });

  it('writes links that round-trip', () => {
    expect(libraryViewHref({})).toBe('/library');
    expect(libraryViewHref({ type: 'notes' })).toBe('/library?type=notes');
    expect(libraryViewHref({ subject: 'dsa', type: 'lecture' })).toBe('/library?subject=dsa&type=lecture');
    expect(libraryViewHref({ subject: 'dsa', type: 'lecture', topic: 'Arrays & Hashing' })).toBe(
      '/library?subject=dsa&type=lecture&topic=Arrays+%26+Hashing'
    );
    expect(libraryViewHref({ subject: 'dsa', query: ' two sum ' })).toBe('/library?subject=dsa&q=two+sum');
    const href = libraryViewHref({ type: 'lecture', subject: 'system-design', query: 'url' });
    expect(view(href.split('?')[1])).toEqual({ subject: 'system-design', type: 'lecture', topic: null, query: 'url' });
  });
});

describe('library subjects', () => {
  it('describes every subject', () => {
    expect(LIBRARY_SUBJECTS.every((s) => s.description.length > 20)).toBe(true);
  });

  it('lists General last and resolves only known slugs', () => {
    expect(LIBRARY_SUBJECTS[LIBRARY_SUBJECTS.length - 1].slug).toBe('general');
    expect(getLibrarySubject('system-design')?.label).toBe('System Design');
    expect(getLibrarySubject('nope')).toBeNull();
    expect(getLibrarySubject(null)).toBeNull();
  });
});

describe('where an item opens', () => {
  it('sends lessons to the player, sheets to DSA practice, and quizzes and projects to Assessments', () => {
    expect(libraryItemHref(item({ id: 'abc' }))).toBe('/content/abc');
    expect(libraryItemHref(item({ id: 'abc', contentType: 'notes' }))).toBe('/content/abc');
    expect(libraryItemHref(item({ id: 'abc', contentType: 'resource' }))).toBe('/content/abc');
    expect(libraryItemHref(item({ id: 'abc', slug: 'pattern path', contentType: 'dsa_sheet' }))).toBe(
      '/dsa?sheet=pattern%20path'
    );
    expect(libraryItemHref(item({ id: 'abc', contentType: 'quiz' }))).toBe('/assessments');
    expect(libraryItemHref(item({ id: 'abc', contentType: 'project' }))).toBe('/assessments');
  });
});

describe('browsing the catalog', () => {
  it('scopes to a format, a subject, or both', () => {
    expect(scopeItems(CATALOG, { type: null, subject: null })).toHaveLength(CATALOG.length);
    expect(scopeItems(CATALOG, { type: 'lecture', subject: null }).map((i) => i.id)).toEqual(['l1', 'l2', 'l3']);
    expect(scopeItems(CATALOG, { type: null, subject: 'system-design' }).map((i) => i.id)).toEqual(['l3']);
    expect(scopeItems(CATALOG, { type: 'lecture', subject: 'dsa' }).map((i) => i.id)).toEqual(['l1', 'l2']);
  });

  it('counts items and topics for every format in display order, including empty ones', () => {
    expect(countByFormat(CATALOG).map((f) => [f.category.type, f.count, f.topicCount])).toEqual([
      ['lecture', 3, 1],
      ['notes', 1, 0],
      ['dsa_sheet', 1, 0],
      ['quiz', 1, 0],
      ['project', 0, 0],
      ['resource', 1, 0]
    ]);
  });

  it('lists distinct topics A to Z', () => {
    const items = [
      item({ id: 'a', topic: 'Trees' }),
      item({ id: 'b', topic: 'Arrays' }),
      item({ id: 'c', topic: 'Trees' }),
      item({ id: 'd' })
    ];
    expect(topicsOf(items)).toEqual(['Arrays', 'Trees']);
  });

  it('builds one shelf per non-empty subject, in display order, with its formats', () => {
    const shelves = subjectShelves(CATALOG);
    expect(shelves.map((s) => [s.subject.slug, s.count])).toEqual([
      ['dsa', 5],
      ['system-design', 1],
      ['general', 1]
    ]);
    expect(shelves[0].formats.map((f) => [f.category.type, f.count])).toEqual([
      ['lecture', 2],
      ['notes', 1],
      ['dsa_sheet', 1],
      ['quiz', 1]
    ]);
  });

  it('groups items by format in display order, keeping newest-first within each and dropping empty formats', () => {
    const sections = groupByFormat(scopeItems(CATALOG, { type: null, subject: 'dsa' }));
    expect(sections.map((s) => [s.category.type, s.items.map((i) => i.id)])).toEqual([
      ['lecture', ['l1', 'l2']],
      ['notes', ['n1']],
      ['dsa_sheet', ['s1']],
      ['quiz', ['q1']]
    ]);
  });
});

describe('search', () => {
  const ids = (query: string) => searchItems(CATALOG, query).map((i) => i.id);

  it('returns everything for an empty query', () => {
    expect(ids('   ')).toHaveLength(CATALOG.length);
  });

  it('matches title, description and topic, case-insensitively', () => {
    expect(ids('SLIDING')).toEqual(['l1']);
    expect(ids('runners')).toEqual(['n1']);
    expect(ids('two pointers')).toEqual(['l1']);
  });

  it('matches the subject and format names, so "system design" and "quiz" find their shelves', () => {
    expect(ids('system design')).toEqual(['l3']);
    expect(ids('quizzes')).toEqual(['q1']);
  });

  it('requires every word to match', () => {
    expect(ids('complexity quizzes')).toEqual(['q1']);
    expect(ids('complexity lectures')).toEqual([]);
    expect(ids('zzz')).toEqual([]);
  });
});
