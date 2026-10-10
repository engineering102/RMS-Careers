import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { findRepoRoot } from '../guard-env';

/**
 * Repo safeguard (Slice 0): test configuration and test files may never load env files that hold
 * application database credentials. Test env comes only from TEST_DATABASE_URL / .env.test.local
 * via the guarded setup files.
 */
const root = findRepoRoot();
const SKIP = new Set(['node_modules', '.next', '.open-next', '.git', 'dist', 'coverage']);
const SELF = new Set(['test-config-scan.test.ts', 'guard.test.ts']);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/^vitest(\.\w+)?\.config\.(ts|mts|js)$/.test(name) || /\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const FORBIDDEN: Array<[RegExp, string]> = [
  [/loadEnvFile/, 'loadEnvFile'],
  [/dotenv/, 'dotenv'],
  [/\.env\.local/, '.env.local'],
  [/path\.resolve\([^)]*['"]\.env['"]/, '.env']
];

const files = walk(root).filter((f) => !SELF.has(path.basename(f)));

describe('test configuration never loads application env files', () => {
  it('finds the vitest configs and test files', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((f) => [path.relative(root, f), f] as const))('%s', (rel, file) => {
    const text = readFileSync(file, 'utf8');
    for (const [re, label] of FORBIDDEN) expect(text, `${label} in ${rel}`).not.toMatch(re);
  });

  it('every unit vitest config installs the setup that strips database URLs', () => {
    const configs = files.filter((f) => /vitest\.config\.(ts|mts|js)$/.test(f));
    expect(configs.length).toBeGreaterThanOrEqual(5);
    for (const f of configs) expect(readFileSync(f, 'utf8')).toContain('setup-unit');
  });

  it('every integration vitest config installs the guarded setup', () => {
    const ints = files.filter((f) => /vitest\.int\.config\.ts$/.test(f));
    expect(ints.length).toBeGreaterThanOrEqual(2);
    for (const f of ints) expect(readFileSync(f, 'utf8')).toContain('setup-int');
  });

  it('live-database suites are only in the integration tier', () => {
    // A unit-tier test file must not construct its own Neon client.
    const unit = files.filter((f) => /\.test\.tsx?$/.test(f) && !/\.int\.test\./.test(f));
    for (const f of unit) {
      expect(readFileSync(f, 'utf8'), path.relative(root, f)).not.toMatch(/from '@neondatabase\/serverless'.*\n[\s\S]*\bneon\(/);
    }
  });
});
