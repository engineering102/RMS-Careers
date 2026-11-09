import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CONTENT_TYPES, contentTypeMeta } from '@/lib/content/content-types';
import { ContentTypeTag } from '@/components/ui/content-type-tag';
import { StatusMark } from '@/components/ui/status-mark';
import { Progress } from '@/components/ui/progress';
import { Avatar, initialsOf } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe('content-type registry', () => {
  it('covers every content type with a sentence-case label and an icon', () => {
    expect(Object.keys(CONTENT_TYPES).sort()).toEqual(
      ['dsa_sheet', 'external_test', 'lecture', 'notes', 'project', 'quiz', 'resource'].sort()
    );
    for (const meta of Object.values(CONTENT_TYPES)) {
      expect(meta.label[0]).toBe(meta.label[0]!.toUpperCase());
      expect(meta.label.slice(1)).not.toMatch(/ [A-Z][a-z]/); // no Title Case ("DSA practice", not "DSA Practice")
      expect(meta.icon).toBeTruthy();
    }
  });

  it('falls back to Resource for unknown or missing types', () => {
    expect(contentTypeMeta('podcast').label).toBe('Resource');
    expect(contentTypeMeta(undefined).label).toBe('Resource');
  });

  it('renders a neutral tag (no colour classes) with an icon hidden from assistive tech', () => {
    const tag = html(<ContentTypeTag type="quiz" />);
    expect(tag).toContain('Quiz');
    expect(tag).toContain('text-muted-foreground');
    expect(tag).not.toMatch(/purple|cyan|rose|violet/);
    expect(tag).toContain('aria-hidden="true"');
    expect(html(<ContentTypeTag type="quiz" iconOnly />)).toContain('sr-only');
  });
});

describe('redesign primitives', () => {
  it('StatusMark names each state and can defer to adjacent text', () => {
    expect(html(<StatusMark status="done" />)).toContain('aria-label="Done"');
    expect(html(<StatusMark status="locked" />)).toContain('aria-label="Locked"');
    expect(html(<StatusMark status="revise" label="Changes requested" />)).toContain('aria-label="Changes requested"');
    const silent = html(<StatusMark status="todo" label={null} />);
    expect(silent).toContain('aria-hidden="true"');
    expect(silent).not.toContain('role="img"');
  });

  it('Progress is a labelled progressbar clamped to its range', () => {
    const bar = html(<Progress value={12} max={8} label="Week 6 progress" />);
    expect(bar).toContain('role="progressbar"');
    expect(bar).toContain('aria-label="Week 6 progress"');
    expect(bar).toContain('aria-valuenow="8"');
    expect(bar).toContain('width:100%');
    expect(html(<Progress value={-3} label="x" />)).toContain('aria-valuenow="0"');
  });

  it('Avatar initials handle one, two and many names', () => {
    expect(initialsOf('Aarav Sharma')).toBe('AS');
    expect(initialsOf('ananya')).toBe('A');
    expect(initialsOf('  Sai Krishna Venkata Reddy ')).toBe('SR');
    expect(initialsOf('')).toBe('?');
    expect(html(<Avatar name="Aarav Sharma" />)).toContain('aria-hidden="true"');
  });

  it('Badge is a span with quiet status variants', () => {
    const badge = html(<Badge variant="warning">Due tomorrow</Badge>);
    expect(badge.startsWith('<span')).toBe(true);
    expect(badge).toContain('text-warning');
  });
});
