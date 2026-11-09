import { describe, it, expect, vi } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import manifest from '../../app/manifest';

const appDir = path.resolve(__dirname, '../..');
const publicDir = path.join(appDir, 'public');

describe('student PWA', () => {
  const m = manifest();

  it('is installable: standalone, in-scope start_url, 192/512 and maskable icons', () => {
    expect(m.display).toBe('standalone');
    expect(m.start_url).toBe('/overview');
    const sizes = (m.icons ?? []).map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect((m.icons ?? []).some((i) => i.purpose === 'maskable')).toBe(true);
  });

  it('references icon files that exist in public/', () => {
    for (const icon of m.icons ?? []) {
      expect(existsSync(path.join(publicDir, icon.src)), icon.src).toBe(true);
    }
    expect(existsSync(path.join(appDir, 'app/offline/page.tsx'))).toBe(true);
  });

  describe('service worker never stores student data', () => {
    const sw = readFileSync(path.join(publicDir, 'sw.js'), 'utf8');

    it('only puts build assets/icons in the runtime cache, never page responses', () => {
      // The single runtime cache.put is inside cacheFirstAsset, which only /_next/static and /icons reach.
      expect(sw.match(/cache\.put\(/g)).toHaveLength(1);
      expect(sw).toMatch(/async function cacheFirstAsset[\s\S]*cache\.put\(/);
      expect(sw).toMatch(/url\.pathname\.startsWith\('\/_next\/static\/'\) \|\| url\.pathname\.startsWith\('\/icons\/'\)/);
      expect(sw).toMatch(/async function networkOrOffline\(request\) \{\s*try \{\s*return await fetch\(request\);/);
    });

    it('ignores non-GET and cross-origin requests and precaches /offline without credentials', () => {
      expect(sw).toContain("request.method !== 'GET'");
      expect(sw).toContain('url.origin !== self.location.origin');
      expect(sw).toContain("const OFFLINE_URL = '/offline'");
      expect(sw).toContain("credentials: 'omit'");
    });
  });

  describe('middleware matcher', async () => {
    vi.doMock('next-auth', () => ({ default: () => ({ auth: () => undefined }) }));
    const { config } = await import('../../middleware');
    const pattern = new RegExp(`^${config.matcher[0]}$`);

    it.each(['/manifest.webmanifest', '/sw.js', '/icons/icon-192.png', '/offline'])(
      'leaves the public PWA resource %s outside auth',
      (p) => expect(pattern.test(p)).toBe(false)
    );

    it.each(['/overview', '/assessments', '/dsa', '/batches/abc', '/'])('still protects %s', (p) =>
      expect(pattern.test(p)).toBe(true)
    );
  });
});
