import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { TUTOR_PORTAL_LIVE, TUTOR_PORTAL_URL, isPortalVisible } from '../data/portals';
import { faqContent } from '../data/homepage-content';

const webRoot = path.resolve(__dirname, '../..');
const TUTOR_HOST = 'tutor.rms-careers.com';

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '__tests__' || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

describe('Tutor Portal links stay hidden until launch (launch-readiness L-5)', () => {
  it('keeps the Tutor Portal unlaunched; flip TUTOR_PORTAL_LIVE only after tutor.rms-careers.com is deployed', () => {
    expect(TUTOR_PORTAL_LIVE).toBe(false);
    expect(TUTOR_PORTAL_URL).toBe(`https://${TUTOR_HOST}`);
  });

  it('hides only the tutor portal while it is not live', () => {
    expect(isPortalVisible('tutor', false)).toBe(false);
    expect(isPortalVisible('tutor', true)).toBe(true);
    for (const live of [true, false]) {
      expect(isPortalVisible('student', live)).toBe(true);
      expect(isPortalVisible('admin', live)).toBe(true);
    }
  });

  it('defines the tutor host in lib/data/portals.ts only', () => {
    const offenders = [...sourceFiles(path.join(webRoot, 'app')), ...sourceFiles(path.join(webRoot, 'components')), ...sourceFiles(path.join(webRoot, 'lib'))]
      .filter((file) => path.basename(file) !== 'portals.ts')
      .filter((file) => readFileSync(file, 'utf8').includes(TUTOR_HOST))
      .map((file) => path.relative(webRoot, file));
    expect(offenders).toEqual([]);
  });

  it.each(['components/header.tsx', 'components/footer.tsx', 'app/login/page.tsx'])(
    '%s gates its tutor link on isPortalVisible',
    (rel) => {
      const source = readFileSync(path.join(webRoot, rel), 'utf8');
      expect(source).toContain('isPortalVisible');
      expect(source).toContain('TUTOR_PORTAL_URL');
    }
  );

  it('does not advertise the tutor host in the FAQ while hidden', () => {
    const answers = faqContent.faqs.map((item) => item.answer).join('\n');
    expect(answers).not.toContain(TUTOR_HOST);
    expect(answers).toContain('admin.rms-careers.com');
  });
});
