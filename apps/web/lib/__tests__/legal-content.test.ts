import { describe, it, expect } from 'vitest';
import { getLegalPolicy, legalPolicies } from '../data/legal-content';

describe('Legal policies (@rms/web)', () => {
  it('publishes the five footer policies with unique slugs', () => {
    expect(legalPolicies.map((p) => p.slug)).toEqual([
      'privacy-policy',
      'terms-and-conditions',
      'refund-and-cancellation-policy',
      'cookie-policy',
      'disclaimer'
    ]);
    expect(getLegalPolicy('cookie-policy')?.title).toBe('Cookie Policy');
    expect(getLegalPolicy('unknown')).toBeUndefined();
  });

  it('contains no drafting placeholders or the non-hyphenated domain', () => {
    const text = JSON.stringify(legalPolicies);
    expect(text).not.toMatch(/\[Insert/i);
    expect(text).not.toMatch(/before publication/i);
    expect(text).not.toContain('rmscareers.com');
  });
});
