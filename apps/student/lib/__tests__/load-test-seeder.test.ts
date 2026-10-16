import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ACCOUNTS,
  LOAD_EMAIL_LIKE,
  MAX_ACCOUNTS,
  isLoadAccountEmail,
  loadAccount,
  parseLoadSeedArgs,
  readLoadPassword,
  selectCleanupIds,
  toFixtureQuestion
} from '../../scripts/seed-load-test';

describe('load-test seeder (synthetic accounts for tests/load)', () => {
  it('names accounts on the reserved .test domain with stable, unique identities', () => {
    const a = loadAccount(1);
    expect(a.email).toBe('load-student-0001@loadtest.rms-careers.test');
    expect(a.name).toBe('Load Student 0001');
    const emails = new Set(Array.from({ length: MAX_ACCOUNTS }, (_, i) => loadAccount(i + 1).email));
    expect(emails.size).toBe(MAX_ACCOUNTS);
  });

  it('cleanup filter can only match synthetic accounts', () => {
    expect(LOAD_EMAIL_LIKE).toBe('load-student-%@loadtest.rms-careers.test');
    expect(isLoadAccountEmail(loadAccount(42).email)).toBe(true);
    for (const real of ['student.demo@rms-careers.local', 'load-student-0001@rms-careers.com', 'someone@loadtest.rms-careers.test', 'load-student-0001@loadtestXrms-careers.test']) {
      expect(isLoadAccountEmail(real)).toBe(false);
    }
  });

  it('cleanup deletes nothing when any matched row is not an exact synthetic address', () => {
    const ok = [{ id: 'u1', email: loadAccount(1).email }, { id: 'u2', email: loadAccount(2).email }];
    expect(selectCleanupIds(ok)).toEqual(['u1', 'u2']);
    expect(selectCleanupIds([])).toEqual([]);
    // Would match the LIKE filter (% spans anything) but is not a generated account.
    const sneaky = [...ok, { id: 'u3', email: 'load-student-real.person@loadtest.rms-careers.test' }];
    expect(() => selectCleanupIds(sneaky)).toThrow(/Nothing was deleted/);
  });

  it('parses and bounds arguments', () => {
    expect(parseLoadSeedArgs([])).toMatchObject({ cleanup: false, count: DEFAULT_ACCOUNTS });
    expect(parseLoadSeedArgs(['--count=5', '--cleanup'])).toMatchObject({ cleanup: true, count: 5 });
    expect(() => parseLoadSeedArgs(['--count=0'])).toThrow();
    expect(() => parseLoadSeedArgs([`--count=${MAX_ACCOUNTS + 1}`])).toThrow();
    expect(() => parseLoadSeedArgs(['--count=abc'])).toThrow();
  });

  it('requires a strong password from the environment and never the demo password', () => {
    expect(() => readLoadPassword({})).toThrow(/LOAD_TEST_STUDENT_PASSWORD/);
    expect(() => readLoadPassword({ LOAD_TEST_STUDENT_PASSWORD: 'short' })).toThrow();
    expect(() => readLoadPassword({ LOAD_TEST_STUDENT_PASSWORD: 'StudentDemo@2026!' })).toThrow(/differ/);
    expect(readLoadPassword({ LOAD_TEST_STUDENT_PASSWORD: 'a-long-enough-secret' })).toBe('a-long-enough-secret');
  });

  it('fixture questions carry option ids only, never the answer key', () => {
    const q = toFixtureQuestion({ id: 7, options: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }] });
    expect(q).toEqual({ id: 7, optionIds: ['a', 'b'] });
    expect(JSON.stringify(q)).not.toMatch(/correct|explanation/i);
    expect(toFixtureQuestion({ id: 8, options: null })).toEqual({ id: 8, optionIds: [] });
  });
});
