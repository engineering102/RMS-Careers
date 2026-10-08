import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@rms/db', () => ({ db: {}, notifications: {}, students: {}, users: {} }));

import { getStudentAppUrl, renderPasswordResetEmail } from '@/lib/email/account-emails';
import { emailNotificationConsumer, inAppNotificationConsumer } from '@/lib/events/dispatcher';

const TOKEN = 'a'.repeat(64);
const resetEvent = {
  type: 'PASSWORD_RESET_REQUESTED' as const,
  email: 'student@example.com',
  name: 'Asha <b>',
  rawToken: TOKEN,
  expiresAt: new Date('2030-01-01T00:00:00Z')
};

describe('account link emails', () => {
  const saved = { ...process.env };
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    process.env = { ...saved };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses STUDENT_APP_URL when set, localhost otherwise outside production', () => {
    process.env.STUDENT_APP_URL = 'https://staging.example.test';
    expect(getStudentAppUrl()).toBe('https://staging.example.test');
    delete process.env.STUDENT_APP_URL;
    (process.env as Record<string, string>).NODE_ENV = 'development';
    expect(getStudentAppUrl()).toBe('http://localhost:3002');
    (process.env as Record<string, string>).NODE_ENV = 'production';
    expect(getStudentAppUrl()).toBe('https://student.rms-careers.com');
  });

  it('renders the reset link and escapes the name in HTML', () => {
    process.env.STUDENT_APP_URL = 'http://localhost:3002';
    const mail = renderPasswordResetEmail({ name: resetEvent.name, token: TOKEN, expiresAt: resetEvent.expiresAt });
    expect(mail.text).toContain(`http://localhost:3002/reset-password?token=${TOKEN}`);
    expect(mail.html).toContain('Asha &lt;b&gt;');
    expect(mail.html).not.toContain('<b>');
  });

  it('is never persisted as an in-app notification', async () => {
    expect(await inAppNotificationConsumer.handle(resetEvent)).toBeNull();
  });

  it('reports provider_not_configured without calling Resend', async () => {
    delete process.env.RESEND_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(emailNotificationConsumer.handle(resetEvent)).resolves.toEqual({
      sent: false,
      reason: 'provider_not_configured'
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends via Resend and includes html and the link', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.STUDENT_APP_URL = 'http://localhost:3002';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'msg_1' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await emailNotificationConsumer.handle({ ...resetEvent, type: 'ACTIVATION_LINK_REQUESTED' });
    expect(result).toEqual({ sent: true, messageId: 'msg_1' });
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body.to).toEqual(['student@example.com']);
    expect(body.text).toContain(`/activate?token=${TOKEN}`);
    expect(body.html).toContain('Activate account');
  });

  it('surfaces Resend API errors as a failed result (and logs) instead of throwing', async () => {
    process.env.RESEND_API_KEY = 're_test';
    vi.stubGlobal('fetch', vi.fn(async () => new Response('domain not verified', { status: 403 })));
    const result = await emailNotificationConsumer.handle(resetEvent);
    expect(result).toMatchObject({ sent: false, reason: 'failed', error: 'domain not verified' });
    expect(console.error).toHaveBeenCalled();
  });
});
