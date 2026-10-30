import { describe, it, expect } from 'vitest';
import { evaluateTutorAccount, type TutorAccountRecord } from '../db/tutor-access';

const account = (overrides: Partial<TutorAccountRecord> = {}): TutorAccountRecord => ({
  userId: 'u1',
  status: 'active',
  roles: ['tutor'],
  tutorId: 't1',
  tutorActive: true,
  updatedAt: null,
  ...overrides
});

describe('evaluateTutorAccount (plan §5.5, D-5)', () => {
  it('accepts an active tutor', () => {
    expect(evaluateTutorAccount(account(), 'active')).toBe('ok');
    expect(evaluateTutorAccount(account({ status: 'pending_activation' }), 'pending_activation')).toBe('ok');
  });

  it('needs both the tutor role and a tutor profile', () => {
    expect(evaluateTutorAccount(account({ roles: ['student'] }), 'active')).toBe('not_tutor');
    expect(evaluateTutorAccount(account({ roles: [] }), 'active')).toBe('not_tutor');
    expect(evaluateTutorAccount(account({ tutorId: null, tutorActive: null }), 'active')).toBe('not_tutor');
  });

  it.each([['admin'], ['super_admin'], ['ADMIN ']])('refuses an account that also holds %s', (role) => {
    expect(evaluateTutorAccount(account({ roles: ['tutor', role] }), 'active')).toBe('admin_account');
  });

  it('refuses a deactivated tutor profile', () => {
    expect(evaluateTutorAccount(account({ tutorActive: false }), 'active')).toBe('inactive_tutor');
  });

  it('requires the expected account status', () => {
    expect(evaluateTutorAccount(account({ status: 'pending_activation' }), 'active')).toBe('wrong_status');
    expect(evaluateTutorAccount(account({ status: 'suspended' }), 'active')).toBe('wrong_status');
    expect(evaluateTutorAccount(account({ status: 'active' }), 'pending_activation')).toBe('wrong_status');
  });
});
