import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NotesMarkdown } from '../content-player/notes-markdown';

const render = (source: string) => renderToStaticMarkup(<NotesMarkdown source={source} />);

describe('NotesMarkdown', () => {
  it('renders headings, GFM tables, task lists and code blocks', () => {
    const html = render('# Title\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n- [x] done\n\n```python\nprint(1)\n```\n');
    expect(html).toContain('<h2');
    expect(html).toContain('<table');
    expect(html).toContain('<td');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('<pre');
    expect(html).toContain('language-python');
  });

  it('escapes raw HTML instead of rendering it', () => {
    const html = render('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
  });

  it('drops javascript: links and opens external links in a new tab', () => {
    expect(render('[x](javascript:alert(1))')).not.toContain('href');
    const external = render('[LC](https://leetcode.com/problems/fizz-buzz/)');
    expect(external).toContain('href="https://leetcode.com/problems/fizz-buzz/"');
    expect(external).toContain('rel="noopener noreferrer"');
  });

  it('joins soft-wrapped lines into one paragraph', () => {
    expect(render('one\ntwo')).toBe(render('one two').replace('one two', 'one\ntwo'));
    expect(render('one\ntwo').match(/<p/g)).toHaveLength(1);
  });
});
