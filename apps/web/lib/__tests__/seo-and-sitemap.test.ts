import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

import robots from '../../app/robots';
import sitemap from '../../app/sitemap';
import * as programQueries from '../db/queries/programs';

describe('SEO, Sitemap & Robots Validation (@rms/web)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('robots.ts', () => {
    it('configures permissive public crawler rules with production sitemap URI', () => {
      const result = robots();
      expect(result.sitemap).toBe('https://www.rms-careers.com/sitemap.xml');
      expect(Array.isArray(result.rules)).toBe(true);

      const rules = result.rules as any[];
      expect(rules[0].userAgent).toBe('*');
      expect(rules[0].allow).toBe('/');
      expect(rules[0].disallow).toContain('/api/');
    });
  });

  describe('sitemap.ts', () => {
    it('generates indexable sitemap with core static routes and public sheets', async () => {
      vi.spyOn(programQueries, 'getPublicPrograms').mockResolvedValue([
        {
          id: 1,
          name: 'Public Engineering Program',
          code: 'PEP-2026',
          description: 'A public program',
          capacity: 50,
          startDate: null,
          endDate: null,
          createdAt: new Date('2026-02-01')
        }
      ]);

      const result = await sitemap();
      const urls = result.map((r) => r.url);

      // Core routes
      expect(urls).toContain('https://www.rms-careers.com');
      expect(urls).toContain('https://www.rms-careers.com/programs');
      expect(urls).toContain('https://www.rms-careers.com/curriculum');
      expect(urls).toContain('https://www.rms-careers.com/learn');
      expect(urls).toContain('https://www.rms-careers.com/learn/dsa');
      expect(urls).toContain('https://www.rms-careers.com/login');

      // Dynamic public sheets
      expect(urls).toContain('https://www.rms-careers.com/learn/dsa/arrays-and-hashing');
      expect(urls).toContain('https://www.rms-careers.com/learn/dsa/two-pointers-and-sliding-window');
      expect(urls).toContain('https://www.rms-careers.com/learn/dsa/linked-lists-and-recursion');

      // Dynamic public programs
      expect(urls).toContain('https://www.rms-careers.com/programs/PEP-2026');

      // Invariant: NEVER leak private application surfaces into the public sitemap
      for (const url of urls) {
        expect(url).not.toMatch(/\/admin(\/|$)/);
        expect(url).not.toMatch(/\/student(\/|$)/);
        expect(url).not.toMatch(/\/tutor(\/|$)/);
      }
    });

    it('handles database error when fetching public programs without failing sitemap', async () => {
      vi.spyOn(programQueries, 'getPublicPrograms').mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await sitemap();
      const urls = result.map((r) => r.url);

      // Core static routes must still be present
      expect(urls).toContain('https://www.rms-careers.com');
      expect(urls).toContain('https://www.rms-careers.com/programs');
      expect(urls.length).toBeGreaterThanOrEqual(6);
    });
  });
});
