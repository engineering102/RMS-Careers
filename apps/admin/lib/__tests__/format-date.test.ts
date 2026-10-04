import { describe, it, expect } from 'vitest';
import { formatDate } from '../utils/format-date';

// ---------------------------------------------------------------------------
// formatDate — valid inputs
// ---------------------------------------------------------------------------

describe('formatDate — valid Date objects', () => {
  it('formats a known date correctly (IST locale, en-IN)', () => {
    // 2 Oct 2026 in UTC — in IST (UTC+5:30) this is still 02 Oct 2026
    const date = new Date('2026-10-02T10:00:00.000Z');
    const result = formatDate(date);
    expect(result).toBe('02 Oct 2026');
  });

  it('formats 1 Jan 2024', () => {
    const date = new Date('2024-01-01T10:00:00.000Z');
    expect(formatDate(date)).toBe('01 Jan 2024');
  });

  it('formats 31 Dec 2023', () => {
    const date = new Date('2023-12-31T10:00:00.000Z');
    expect(formatDate(date)).toBe('31 Dec 2023');
  });

  it('formats a mid-year date', () => {
    const date = new Date('2025-06-15T10:00:00.000Z');
    expect(formatDate(date)).toBe('15 Jun 2025');
  });
});

// ---------------------------------------------------------------------------
// formatDate — ISO string inputs
// ---------------------------------------------------------------------------

describe('formatDate — ISO string inputs', () => {
  it('accepts a UTC ISO string', () => {
    const result = formatDate('2026-10-02T10:00:00.000Z');
    expect(result).toBe('02 Oct 2026');
  });

  it('accepts a date-only string', () => {
    // Date-only strings are parsed as midnight UTC, which in IST is 05:30
    // so the date stays the same in IST
    const result = formatDate('2026-10-02');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('returns consistent output for the same date across calls', () => {
    const a = formatDate('2026-06-15T08:00:00.000Z');
    const b = formatDate('2026-06-15T08:00:00.000Z');
    expect(a).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// formatDate — null/undefined/empty — must return empty string
// ---------------------------------------------------------------------------

describe('formatDate — null, undefined, empty returns empty string', () => {
  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('returns empty string for empty string input', () => {
    expect(formatDate('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// formatDate — invalid dates — must return empty string
// ---------------------------------------------------------------------------

describe('formatDate — invalid date strings return empty string', () => {
  const invalidInputs = [
    'not-a-date',
    'garbage',
    '2026-99-99',
    '0000-00-00',
    'NaN',
    'undefined',
    '2026/13/01'
  ];

  invalidInputs.forEach((input) => {
    it(`returns empty string for "${input}"`, () => {
      expect(formatDate(input)).toBe('');
    });
  });
});

// ---------------------------------------------------------------------------
// formatDate — output format contract
// ---------------------------------------------------------------------------

describe('formatDate — output format contract', () => {
  it('output contains the 2-digit day', () => {
    const result = formatDate(new Date('2026-10-05T10:00:00.000Z'));
    expect(result).toMatch(/\d{2}/); // 05
  });

  it('output contains a 3-letter abbreviated month', () => {
    const result = formatDate(new Date('2026-10-05T10:00:00.000Z'));
    expect(result).toMatch(/[A-Z][a-z]{2}/); // Oct
  });

  it('output contains a 4-digit year', () => {
    const result = formatDate(new Date('2026-10-05T10:00:00.000Z'));
    expect(result).toMatch(/\d{4}/); // 2026
  });

  it('output matches "DD Mon YYYY" shape', () => {
    const result = formatDate(new Date('2026-10-05T10:00:00.000Z'));
    expect(result).toMatch(/^\d{2} [A-Z][a-z]{2} \d{4}$/);
  });

  it('single-digit days are zero-padded', () => {
    const result = formatDate(new Date('2026-03-04T10:00:00.000Z'));
    expect(result).toMatch(/^04/); // not "4 Mar 2026"
  });
});

// ---------------------------------------------------------------------------
// formatDate — timezone behavior (IST)
// ---------------------------------------------------------------------------

describe('formatDate — IST timezone consistency', () => {
  it('uses IST timezone (not UTC) for date boundary decisions', () => {
    // 2026-10-02 at 23:00 UTC = 2026-10-03 04:30 IST
    // So the formatted output should be 03 Oct, not 02 Oct
    const date = new Date('2026-10-02T23:00:00.000Z');
    const result = formatDate(date);
    expect(result).toBe('03 Oct 2026');
  });

  it('correctly shows 02 Oct for a time well within the IST day', () => {
    // 2026-10-02 at 10:00 UTC = 2026-10-02 15:30 IST
    const date = new Date('2026-10-02T10:00:00.000Z');
    expect(formatDate(date)).toBe('02 Oct 2026');
  });
});
