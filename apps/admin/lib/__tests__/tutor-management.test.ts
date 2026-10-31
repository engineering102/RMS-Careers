import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createTutorAccount: vi.fn(),
  reissueTutorInvitation: vi.fn(),
  setTutorActive: vi.fn(),
  addTutorToBatch: vi.fn(),
  removeTutorFromBatch: vi.fn(),
  sendTutorInvitationEmail: vi.fn()
}));
vi.mock('@/lib/authz', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/db/queries', () => ({
  createTutorAccount: mocks.createTutorAccount,
  reissueTutorInvitation: mocks.reissueTutorInvitation,
  setTutorActive: mocks.setTutorActive,
  addTutorToBatch: mocks.addTutorToBatch,
  removeTutorFromBatch: mocks.removeTutorFromBatch
}));
vi.mock('@/lib/email', () => ({ sendTutorInvitationEmail: mocks.sendTutorInvitationEmail }));

import { createTutorAction, resendTutorInvitationAction, setTutorActiveAction } from '../../app/(admin)/tutors/actions';
import { assignTutorAction, unassignTutorAction } from '../../app/(admin)/batches/[batchId]/tutors/actions';
import { getTutorPortalUrl } from '../email/tutor-portal-url';
import { renderTutorInvitationEmail } from '../email/templates/tutor-invitation';

const TUTOR_ID = '7b0c1e9a-1111-4222-8333-444444444444';
const BATCH_ID = '8c1d2f0b-1111-4222-8333-444444444444';
const invitation = {
  tutorId: TUTOR_ID,
  userId: 'u-1',
  email: 'mentor@example.test',
  fullName: 'Asha Rao',
  rawToken: 'a'.repeat(64),
  expiresAt: new Date('2026-11-06T10:00:00Z')
};

const env = { ...process.env };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ ok: true, userId: 'admin-1', role: 'admin' });
  mocks.sendTutorInvitationEmail.mockResolvedValue({ success: true, messageId: 'm1' });
  process.env.TUTOR_APP_URL = 'https://tutor.example.test/';
});
afterEach(() => {
  process.env = { ...env };
});

describe('getTutorPortalUrl', () => {
  it('uses TUTOR_APP_URL without a trailing slash', () => {
    process.env.TUTOR_APP_URL = 'https://tutor.rms-careers.com/';
    expect(getTutorPortalUrl()).toBe('https://tutor.rms-careers.com');
  });

  it('has no production fallback, so no dead links are emailed before launch', () => {
    delete process.env.TUTOR_APP_URL;
    vi.stubEnv('NODE_ENV', 'production');
    expect(getTutorPortalUrl()).toBeNull();
    vi.unstubAllEnvs();
  });

  it('points local development at the local tutor app', () => {
    delete process.env.TUTOR_APP_URL;
    vi.stubEnv('NODE_ENV', 'development');
    expect(getTutorPortalUrl()).toBe('http://localhost:3003');
    vi.unstubAllEnvs();
  });
});

describe('tutor invitation email', () => {
  it('links to the activation URL and escapes the name in HTML', () => {
    const url = `https://tutor.rms-careers.com/activate?token=${'b'.repeat(64)}`;
    const email = renderTutorInvitationEmail({
      tutorName: '<img src=x onerror=alert(1)>',
      tutorEmail: 't@example.test',
      activationUrl: url,
      expiresAt: new Date('2026-11-06T10:00:00Z')
    });
    expect(email.subject).toBe('Activate your RMS Careers Tutor Portal account');
    expect(email.html).toContain(url);
    expect(email.text).toContain(url);
    expect(email.html).not.toContain('<img');
    expect(email.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});

describe('createTutorAction', () => {
  const form = (fields: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    return fd;
  };

  it('creates the account, then emails the invitation link', async () => {
    mocks.createTutorAccount.mockResolvedValue({ ok: true, invitation });
    const res = await createTutorAction(form({ email: ' Mentor@Example.TEST ', fullName: ' Asha Rao ', headline: '' }));
    expect(res).toEqual({ success: true, data: { emailSent: true } });
    expect(mocks.createTutorAccount).toHaveBeenCalledWith({ email: 'mentor@example.test', fullName: 'Asha Rao', headline: null });
    expect(mocks.sendTutorInvitationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ tutorEmail: 'mentor@example.test', activationUrl: `https://tutor.example.test/activate?token=${'a'.repeat(64)}` })
    );
  });

  it('creates the account but sends nothing while the tutor portal is not live', async () => {
    delete process.env.TUTOR_APP_URL;
    vi.stubEnv('NODE_ENV', 'production');
    mocks.createTutorAccount.mockResolvedValue({ ok: true, invitation });
    const res = await createTutorAction({ email: 'mentor@example.test', fullName: 'Asha Rao' });
    vi.unstubAllEnvs();
    expect(res).toEqual({ success: true, data: { emailSent: false, reason: 'portal_not_live' } });
    expect(mocks.sendTutorInvitationEmail).not.toHaveBeenCalled();
  });

  it('reports a failed email without failing the account creation', async () => {
    mocks.createTutorAccount.mockResolvedValue({ ok: true, invitation });
    mocks.sendTutorInvitationEmail.mockResolvedValue({ success: false, reason: 'delivery_failed' });
    expect(await createTutorAction({ email: 'mentor@example.test', fullName: 'Asha Rao' })).toEqual({
      success: true,
      data: { emailSent: false, reason: 'delivery_failed' }
    });
  });

  it.each([
    ['admin_email', /administrator/],
    ['student_email', /student/],
    ['already_tutor', /already exists/],
    ['email_in_use', /already used/]
  ])('explains %s on the email field', async (code, message) => {
    mocks.createTutorAccount.mockResolvedValue({ ok: false, code });
    const res = await createTutorAction({ email: 'x@example.test', fullName: 'X' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(message);
      expect(res.fieldErrors?.email?.[0]).toMatch(message);
    }
  });

  it.each([
    ['an invalid email', { email: 'not-an-email', fullName: 'X' }],
    ['a missing name', { email: 'x@example.test', fullName: '   ' }],
    ['an over-long headline', { email: 'x@example.test', fullName: 'X', headline: 'h'.repeat(161) }]
  ])('rejects %s before touching the database', async (_label, input) => {
    const res = await createTutorAction(input);
    expect(res.success).toBe(false);
    expect(mocks.createTutorAccount).not.toHaveBeenCalled();
  });

  it('refuses non-admins', async () => {
    mocks.requireAdmin.mockResolvedValue({ ok: false, error: 'Forbidden. Administrator privileges required.' });
    expect((await createTutorAction({ email: 'x@example.test', fullName: 'X' })).success).toBe(false);
    expect(mocks.createTutorAccount).not.toHaveBeenCalled();
  });
});

describe('resendTutorInvitationAction', () => {
  it('reissues and emails a new link', async () => {
    mocks.reissueTutorInvitation.mockResolvedValue({ ok: true, invitation });
    expect(await resendTutorInvitationAction(TUTOR_ID)).toEqual({ success: true, data: { emailSent: true } });
  });

  it('keeps the old link valid when no email can be sent before launch', async () => {
    delete process.env.TUTOR_APP_URL;
    vi.stubEnv('NODE_ENV', 'production');
    const res = await resendTutorInvitationAction(TUTOR_ID);
    vi.unstubAllEnvs();
    expect(res.success).toBe(false);
    expect(mocks.reissueTutorInvitation).not.toHaveBeenCalled();
  });

  it.each([
    ['already_active', /already activated/],
    ['inactive', /Reactivate/],
    ['not_found', /not found/]
  ])('explains %s', async (code, message) => {
    mocks.reissueTutorInvitation.mockResolvedValue({ ok: false, code });
    const res = await resendTutorInvitationAction(TUTOR_ID);
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(message);
  });
});

describe('setTutorActiveAction and batch assignment actions', () => {
  it('validates ids and role', async () => {
    expect((await setTutorActiveAction('nope', false)).success).toBe(false);
    expect((await assignTutorAction(BATCH_ID, 'nope')).success).toBe(false);
    mocks.requireAdmin.mockResolvedValue({ ok: false, error: 'Forbidden.' });
    expect((await unassignTutorAction(BATCH_ID, TUTOR_ID)).success).toBe(false);
    expect(mocks.setTutorActive).not.toHaveBeenCalled();
    expect(mocks.addTutorToBatch).not.toHaveBeenCalled();
    expect(mocks.removeTutorFromBatch).not.toHaveBeenCalled();
  });

  it('assigns idempotently and reports an inactive tutor', async () => {
    mocks.addTutorToBatch.mockResolvedValueOnce({ ok: true, created: true }).mockResolvedValueOnce({ ok: true, created: false });
    expect(await assignTutorAction(BATCH_ID, TUTOR_ID)).toEqual({ success: true, message: 'Tutor assigned to this batch.' });
    expect(await assignTutorAction(BATCH_ID, TUTOR_ID)).toEqual({ success: true, message: 'This tutor was already assigned.' });
    mocks.addTutorToBatch.mockResolvedValueOnce({ ok: false, code: 'tutor_inactive' });
    const res = await assignTutorAction(BATCH_ID, TUTOR_ID);
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(/deactivated/);
  });

  it('unassigns and reports a missing assignment', async () => {
    mocks.removeTutorFromBatch.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await unassignTutorAction(BATCH_ID, TUTOR_ID)).success).toBe(true);
    expect((await unassignTutorAction(BATCH_ID, TUTOR_ID)).success).toBe(false);
  });

  it('toggles tutor status', async () => {
    mocks.setTutorActive.mockResolvedValue(true);
    expect(await setTutorActiveAction(TUTOR_ID, false)).toEqual({ success: true, data: undefined });
    expect(mocks.setTutorActive).toHaveBeenCalledWith(TUTOR_ID, false);
  });
});
