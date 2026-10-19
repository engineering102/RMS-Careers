import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CategoryCard, CATEGORY_THEMES } from '../library/category-card';
import { ContentCard } from '../library/content-card';
import {
  formatCategoryCount,
  getLibraryCategory,
  libraryCategoryHref,
  LIBRARY_CATEGORIES
} from '@/lib/data/library-categories';
import { ALL_CONTENT_TYPES } from '@/lib/db/queries/library';

vi.mock('server-only', () => ({}));

describe('My Library categories', () => {
  it('covers every library content type exactly once, each with its own theme', () => {
    expect(LIBRARY_CATEGORIES.map((c) => c.type).sort()).toEqual([...ALL_CONTENT_TYPES].sort());
    const tiles = LIBRARY_CATEGORIES.map((c) => CATEGORY_THEMES[c.type].iconTile);
    expect(new Set(tiles).size).toBe(tiles.length);
  });

  it('resolves only known category types (unknown ?type= falls back to the hub)', () => {
    expect(getLibraryCategory('dsa_sheet')?.label).toBe('DSA Practice');
    expect(getLibraryCategory('external_test')).toBeNull();
    expect(getLibraryCategory('bogus')).toBeNull();
    expect(getLibraryCategory(undefined)).toBeNull();
  });

  it('pluralises counts per category', () => {
    const quiz = getLibraryCategory('quiz')!;
    expect(formatCategoryCount(quiz, 1)).toBe('1 quiz');
    expect(formatCategoryCount(quiz, 3)).toBe('3 quizzes');
  });

  it('links a populated card into its category', () => {
    const lectures = getLibraryCategory('lecture')!;
    const html = renderToStaticMarkup(
      <CategoryCard category={lectures} itemCount={12} topicCount={4} />
    );
    expect(html).toContain(`href="${libraryCategoryHref('lecture')}"`);
    expect(html).toContain('12 lectures · 4 topics');
    expect(html).toContain('Explore');
  });

  it('renders an empty category as a non-link placeholder', () => {
    const projects = getLibraryCategory('project')!;
    const html = renderToStaticMarkup(
      <CategoryCard category={projects} itemCount={0} topicCount={0} />
    );
    expect(html).not.toContain('href=');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('Nothing here yet');
  });
});

describe('My Library item cards', () => {
  const base = {
    id: 'item-1',
    programId: 1,
    programName: 'Fullstack Engineering',
    programCode: 'FSE',
    description: 'Two pointers walkthrough',
    topic: 'Arrays',
    isPublished: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  it('uses the category theme and links the whole card to the item', () => {
    const html = renderToStaticMarkup(
      <ContentCard
        item={{
          ...base,
          title: 'Sliding Window',
          slug: 'sliding-window',
          contentType: 'lecture',
          metadata: { durationMinutes: 45, difficulty: 'intermediate' }
        }}
      />
    );
    expect(html).toContain('href="/content/item-1"');
    expect(html).toContain(CATEGORY_THEMES.lecture.iconTile);
    expect(html).toContain('Watch Lecture');
    expect(html).toContain('45 min');
    expect(html).toContain('Intermediate');
    expect(html).toContain('Arrays');
  });

  it('routes DSA sheets to the practice page', () => {
    const html = renderToStaticMarkup(
      <ContentCard
        item={{ ...base, title: 'Blind 75', slug: 'blind-75', contentType: 'dsa_sheet', metadata: {} }}
      />
    );
    expect(html).toContain('href="/dsa?sheet=blind-75"');
    expect(html).toContain(CATEGORY_THEMES.dsa_sheet.iconTile);
  });
});
