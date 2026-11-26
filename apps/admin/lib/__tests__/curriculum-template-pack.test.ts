import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadTemplatePack, splitFrontMatter, templatePackRoot } from '../../scripts/lib/template-pack';

const root = templatePackRoot(path.resolve(__dirname, '../../../..'));

describe('curriculum template pack', () => {
  const pack = loadTemplatePack(root);

  it('has no validation problems', () => {
    expect(pack.problems).toEqual([]);
  });

  it('only places weeks inside the template length', () => {
    for (const item of [...pack.items, ...pack.reused]) {
      expect(item.week).toBeGreaterThanOrEqual(1);
      expect(item.week).toBeLessThanOrEqual(pack.settings.weeks);
    }
  });

  it('gives every quiz at least one correct option per question', () => {
    for (const item of pack.items) {
      if (item.kind !== 'quiz') continue;
      for (const q of item.questions) expect(q.correctOptionIds.length).toBeGreaterThan(0);
    }
  });
});

describe('splitFrontMatter', () => {
  it('reads key: value lines and strips quotes', () => {
    const { meta, body } = splitFrontMatter('---\ntitle: "A: B"\nminutes: 5\n---\n# Hi\n');
    expect(meta).toEqual({ title: 'A: B', minutes: '5' });
    expect(body).toBe('# Hi\n');
  });

  it('returns the whole text when there is no front matter', () => {
    expect(splitFrontMatter('# Hi').meta).toEqual({});
  });
});
