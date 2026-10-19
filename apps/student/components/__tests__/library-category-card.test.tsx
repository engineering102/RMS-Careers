import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CategoryCard, CATEGORY_THEMES } from '../library/category-card';
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
