import { describe, it, expect } from 'vitest';
import { istDate, previousIstDate } from '../xp-ledger';

/** IST calendar boundaries used for streaks (audit F-07). */
describe('xp-ledger IST dates', () => {
  it('uses the Asia/Kolkata calendar day, not UTC', () => {
    // 2026-10-09 19:00 UTC is already 2026-10-10 00:30 IST.
    expect(istDate(new Date('2026-10-09T19:00:00Z'))).toBe('2026-10-10');
    expect(istDate(new Date('2026-10-09T18:29:59Z'))).toBe('2026-10-09');
  });

  it('computes the previous IST day across month and year boundaries', () => {
    expect(previousIstDate('2026-10-10')).toBe('2026-10-09');
    expect(previousIstDate('2026-03-01')).toBe('2026-02-28');
    expect(previousIstDate('2028-03-01')).toBe('2028-02-29');
    expect(previousIstDate('2027-01-01')).toBe('2026-12-31');
  });
});
