import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import manifest from '../../app/manifest';

const publicDir = path.resolve(__dirname, '../../public');

describe('PWA (@rms/web)', () => {
  const m = manifest();

  it('is installable: standalone, start_url, and 192/512 icons', () => {
    expect(m.display).toBe('standalone');
    expect(m.start_url).toBe('/');
    const sizes = (m.icons ?? []).map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect((m.icons ?? []).some((i) => i.purpose === 'maskable')).toBe(true);
  });

  it('references icon files that exist in public/', () => {
    for (const icon of m.icons ?? []) {
      expect(existsSync(path.join(publicDir, icon.src)), icon.src).toBe(true);
    }
  });

  it('service worker precaches the offline page and never handles /api or non-GET', () => {
    const sw = readFileSync(path.join(publicDir, 'sw.js'), 'utf8');
    expect(sw).toContain("const OFFLINE_URL = '/offline'");
    expect(sw).toContain("request.method !== 'GET'");
    expect(sw).toContain("url.pathname.startsWith('/api/')");
    expect(existsSync(path.resolve(__dirname, '../../app/offline/page.tsx'))).toBe(true);
  });
});
