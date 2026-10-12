import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { formatDate, formatNumber, formatTime } from '../format/datetime';

// 2026-09-11T20:00:00Z is 12 Sep 2026, 01:30 in Asia/Kolkata. Runtime-default formatting printed this as
// "9/11/2026" on a UTC/en-US server and "12/9/2026" in an IST/en-IN browser, which also broke hydration.
const LATE_EVENING_UTC = new Date('2026-09-11T20:00:00Z');

describe('student date/number formatting is deterministic (en-IN, Asia/Kolkata)', () => {
  it('formats the calendar day in IST, not the runtime time zone', () => {
    const text = formatDate(LATE_EVENING_UTC);
    expect(text).toMatch(/^12 Sep/);
    expect(text).toContain('2026');
  });

  it('accepts ISO strings and timestamps identically to Date objects', () => {
    const expected = formatDate(LATE_EVENING_UTC);
    expect(formatDate(LATE_EVENING_UTC.toISOString())).toBe(expected);
    expect(formatDate(LATE_EVENING_UTC.getTime())).toBe(expected);
  });

  it('honours caller-chosen fields while keeping the IST time zone', () => {
    expect(formatDate(LATE_EVENING_UTC, { month: 'short', day: 'numeric' })).toMatch(/^12 Sep/);
    expect(formatTime(LATE_EVENING_UTC)).toMatch(/^01:30/);
  });

  it('formats numbers with en-IN grouping', () => {
    expect(formatNumber(1605)).toBe('1,605');
    expect(formatNumber(0)).toBe('0');
  });
});

describe('guard: no runtime-default locale formatting in student pages and components', () => {
  const roots = ['app', 'components'].map((d) => path.resolve(__dirname, '../..', d));

  function walk(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === '__tests__' ? [] : walk(full);
      return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
    });
  }

  const files = roots.flatMap(walk);

  it.each(files.map((f) => [path.relative(path.resolve(__dirname, '../..'), f), f]))(
    '%s formats dates/numbers through lib/format/datetime',
    (_rel, file) => {
      const source = fs.readFileSync(file as string, 'utf8');
      expect(source).not.toMatch(/\.toLocale(Date|Time)?String\(/);
    }
  );
});
