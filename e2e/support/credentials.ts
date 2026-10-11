/**
 * Test-account credentials for the AUTHENTICATED production suite.
 *
 * Sources, in order: process.env (E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD) or the untracked file
 * e2e/.env.production.local (git-ignored via `.env*`). Only those two keys are ever parsed, the file
 * is never loaded into process.env, and values are never logged, attached or put in a URL.
 * There is deliberately no admin equivalent: admin credentials must be supplied by the owner first.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface Credentials {
  email: string;
  password: string;
}

const FILE = path.resolve(__dirname, '..', '.env.production.local');

function fromFile(keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(FILE)) return out;
  for (const raw of readFileSync(FILE, 'utf8').split(/\r?\n/)) {
    const m = raw.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && keys.includes(m[1])) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

export function studentCredentials(): Credentials | null {
  const keys = ['E2E_STUDENT_EMAIL', 'E2E_STUDENT_PASSWORD'];
  const file = fromFile(keys);
  const email = process.env.E2E_STUDENT_EMAIL || file.E2E_STUDENT_EMAIL;
  const password = process.env.E2E_STUDENT_PASSWORD || file.E2E_STUDENT_PASSWORD;
  return email && password ? { email, password } : null;
}
