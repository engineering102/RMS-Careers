import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { context, updateTutorProfile, changeTutorPassword } = vi.hoisted(() => ({
  context: { current: null as unknown },
  updateTutorProfile: vi.fn(async () => true),
  changeTutorPassword: vi.fn(async () => ({ success: true }))
}));

vi.mock('@/lib/db/tutor-context', () => ({ getTutorContext: async () => context.current }));
vi.mock('@/lib/db/queries/profile', () => ({ updateTutorProfile }));
vi.mock('@/lib/db/tutor-accounts', () => ({ changeTutorPassword }));

import { changePasswordAction, updateProfileAction } from '../../app/(dashboard)/profile/actions';

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

describe('profile actions', () => {
  beforeEach(() => {
    context.current = { userId: 'user-1', tutorId: 'tutor-1' };
    updateTutorProfile.mockClear();
    changeTutorPassword.mockClear();
  });

  it('saves only the tutor’s own editable fields, blanks as null', async () => {
    const result = await updateProfileAction({}, form({ headline: ' Mentor ', bio: '', linkedinUrl: 'https://www.linkedin.com/in/asha', githubUrl: '', fullName: 'Changed' }));
    expect(result).toEqual({ success: true, message: 'Profile saved.' });
    expect(updateTutorProfile).toHaveBeenCalledWith('tutor-1', { headline: 'Mentor', bio: null, linkedinUrl: 'https://www.linkedin.com/in/asha', githubUrl: null });
  });

  it.each([
    ['linkedinUrl', 'javascript:alert(1)'],
    ['linkedinUrl', 'https://evil.example/in/asha'],
    ['githubUrl', 'http://github.com/asha'],
    ['githubUrl', 'https://gist.github.com.evil.test/x']
  ])('rejects %s %s', async (field, value) => {
    const result = await updateProfileAction({}, form({ [field]: value }));
    expect(result.fieldErrors?.[field as 'githubUrl']).toBeTruthy();
    expect(updateTutorProfile).not.toHaveBeenCalled();
  });

  it('refuses a revoked session', async () => {
    context.current = null;
    expect((await updateProfileAction({}, form({}))).error).toMatch(/session has ended/);
    expect((await changePasswordAction({}, form({}))).error).toMatch(/session has ended/);
    expect(updateTutorProfile).not.toHaveBeenCalled();
    expect(changeTutorPassword).not.toHaveBeenCalled();
  });

  it('checks the confirmation before changing the password', async () => {
    expect(await changePasswordAction({}, form({ currentPassword: 'old', newPassword: 'a'.repeat(12), confirmPassword: 'b'.repeat(12) }))).toMatchObject({
      field: 'confirmPassword'
    });
    expect(changeTutorPassword).not.toHaveBeenCalled();
    expect(await changePasswordAction({}, form({ currentPassword: 'old', newPassword: 'a'.repeat(12), confirmPassword: 'a'.repeat(12) }))).toEqual({ success: true });
    expect(changeTutorPassword).toHaveBeenCalledWith('user-1', 'old', 'a'.repeat(12));
  });
});
