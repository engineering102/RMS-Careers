import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Source assertions over the tutor app (tutor plan T-19, T-20 and §5.3): no admin scope, no private student or
 * assessment fields, and writes only to the tables the plan allows.
 */
const appRoot = path.resolve(__dirname, '../..');
const SKIP = new Set(['node_modules', '.next', '.open-next', '__tests__', '.wrangler']);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts') ? [full] : [];
  });
}

const files = sourceFiles(appRoot).map((file) => ({ file: path.relative(appRoot, file), source: readFileSync(file, 'utf8') }));

describe('tutor app source boundaries', () => {
  it('finds the app sources', () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it('never constructs or imports the admin scope', () => {
    for (const { file, source } of files) expect(source, file).not.toMatch(/\badminScope\b/);
  });

  it('never imports from another app', () => {
    for (const { file, source } of files) expect(source, file).not.toMatch(/from\s+'[^']*apps\/(admin|student|web)\//);
  });

  it('never reads private student fields or assessment internals (T-19)', () => {
    for (const { file, source } of files) {
      expect(source, file).not.toMatch(/students\.(phone|githubUrl|linkedinUrl|portfolioUrl|targetCompanies|primaryLanguage)\b/);
      expect(source, file).not.toMatch(/\.responses\b|correctOptionIds|quizQuestions|getBatchAttemptDetails/);
    }
  });

  it('writes only to the allowed tables (T-20)', () => {
    // Review fields and notifications are written by @rms/academic/review inside the tutor's transaction.
    const allowed = new Set(['users', 'tutors', 'accountTokens']);
    const writes = files.flatMap(({ file, source }) =>
      [...source.matchAll(/\b(?:db|tx|client)\s*\.(insert|update|delete)\(\s*([A-Za-z_]+)\s*\)/g)].map((m) => ({ file, table: m[2] }))
    );
    expect(writes.length).toBeGreaterThan(0);
    for (const w of writes) expect(allowed.has(w.table), `${w.file} writes ${w.table}`).toBe(true);
  });

  it('marks every dashboard route dynamic through the shared layout', () => {
    const layout = files.find((f) => f.file.replace(/\\/g, '/') === 'app/(dashboard)/layout.tsx');
    expect(layout?.source).toMatch(/export const dynamic = 'force-dynamic'/);
  });

  it('guards every dashboard page', () => {
    const pages = files.filter((f) => /^app[\\/]\(dashboard\)[\\/].*page\.tsx$/.test(f.file));
    expect(pages.length).toBeGreaterThanOrEqual(12);
    for (const { file, source } of pages) {
      const guard = file.includes('[batchId]') ? /requireTutorBatch\(/ : /requireTutor(Batch)?\(/;
      expect(source, file).toMatch(guard);
    }
  });
});
