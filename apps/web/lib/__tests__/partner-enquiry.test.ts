import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

vi.mock('server-only', () => ({}));

let clientIp = '203.0.113.20';
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'cf-connecting-ip': clientIp })
}));

import { submitPartnerEnquiry } from '@/app/actions/partner-enquiry';
import { deliverPartnerEnquiry, renderPartnerEnquiryEmail } from '@/lib/partner-enquiry/deliver';
import { partnerEnquirySchema } from '@/lib/partner-enquiry/schema';
import { resetMemoryLimits } from '@/lib/security/request-limits';
import { partnerEnquiryContent } from '@/lib/data/homepage-content';

/** Audit F-03: the partner enquiry is really delivered, validated, abuse-limited and honest about failure. */

const { formConfig, submission } = partnerEnquiryContent;
const valid = {
  fullName: 'Dr. Asha Rao',
  role: 'Training & Placement Officer',
  email: 'Asha.Rao@College.edu.in',
  mobile: '+91 98765 43210',
  institutionName: 'Example Institute of Technology',
  institutionType: formConfig.institutionTypes[0],
  city: 'Hyderabad',
  state: 'Telangana',
  website: 'https://example.edu.in',
  studentStrength: formConfig.studentStrengthOptions[1],
  branches: 'CSE, ECE',
  batches: '2027, 2028',
  objectives: [formConfig.partnershipObjectives[0]],
  timeline: formConfig.timelineOptions[1],
  additionalNotes: 'Hybrid preferred.',
  consent: true,
  company_website_hp: ''
};

const fetchMock = vi.fn();
const ENV = { RESEND_API_KEY: 'test-key', EMAIL_FROM: 'RMS <no-reply@rms.test>', PARTNER_ENQUIRY_TO: 'inbox@rms.test' };

beforeEach(() => {
  resetMemoryLimits();
  clientIp = '203.0.113.20';
  fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ id: 'msg_1' }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('submitPartnerEnquiry', () => {
  it('delivers a valid enquiry to the configured inbox and only then reports success', async () => {
    await expect(submitPartnerEnquiry(valid)).resolves.toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer test-key');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ from: ENV.EMAIL_FROM, to: ['inbox@rms.test'], reply_to: 'asha.rao@college.edu.in' });
    expect(body.text).toContain('Example Institute of Technology');
  });

  it('rejects invalid input with field errors and sends nothing', async () => {
    const result = await submitPartnerEnquiry({ ...valid, email: 'not-an-email', institutionType: 'Hacked', consent: false });
    expect(result).toMatchObject({ success: false, code: 'invalid' });
    if (!result.success) {
      expect(Object.keys(result.fieldErrors ?? {})).toEqual(expect.arrayContaining(['email', 'institutionType', 'consent']));
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects oversized free text', async () => {
    const result = await submitPartnerEnquiry({ ...valid, additionalNotes: 'x'.repeat(2001) });
    expect(result).toMatchObject({ success: false, code: 'invalid' });
  });

  it('reports failure when the provider rejects the message', async () => {
    fetchMock.mockResolvedValue(new Response('{"message":"invalid from"}', { status: 422 }));
    await expect(submitPartnerEnquiry(valid)).resolves.toEqual({
      success: false,
      code: 'delivery_failed',
      error: submission.failureMessage
    });
  });

  it('reports failure on network errors', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(submitPartnerEnquiry(valid)).resolves.toMatchObject({ success: false, code: 'delivery_failed' });
  });

  it('reports failure (never success) when delivery is not configured', async () => {
    vi.stubEnv('PARTNER_ENQUIRY_TO', '');
    await expect(submitPartnerEnquiry(valid)).resolves.toMatchObject({ success: false, code: 'not_configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('silently drops honeypot submissions without sending', async () => {
    await expect(submitPartnerEnquiry({ ...valid, company_website_hp: 'http://spam.example' })).resolves.toEqual({ success: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rate limits repeated submissions from one client', async () => {
    for (let i = 0; i < 5; i++) await submitPartnerEnquiry({ ...valid, email: `p${i}@college.edu.in` });
    fetchMock.mockClear();
    await expect(submitPartnerEnquiry({ ...valid, email: 'p9@college.edu.in' })).resolves.toMatchObject({
      success: false,
      code: 'rate_limited'
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('enquiry email rendering', () => {
  it('escapes HTML and keeps the subject on one line', () => {
    const enquiry = partnerEnquirySchema.parse({
      ...valid,
      institutionName: '<script>alert(1)</script>\r\nBcc: x@evil.test',
      additionalNotes: '<img src=x onerror=alert(1)>'
    });
    const { subject, html } = renderPartnerEnquiryEmail(enquiry);
    expect(subject).not.toMatch(/[\r\n]/);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
  });

  it('times out instead of hanging on a stalled provider', async () => {
    vi.useFakeTimers();
    const stalled = vi.fn((_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))
    );
    const pending = deliverPartnerEnquiry(partnerEnquirySchema.parse(valid), ENV, stalled as unknown as typeof fetch);
    await vi.advanceTimersByTimeAsync(8_000);
    await expect(pending).resolves.toEqual({ delivered: false, reason: 'delivery_failed' });
    vi.useRealTimers();
  });
});

describe('partner form component', () => {
  it('submits through the server action and no longer simulates success', () => {
    const source = readFileSync(path.resolve(__dirname, '../../components/homepage/partner-form-section.tsx'), 'utf8');
    expect(source).toContain('submitPartnerEnquiry(');
    expect(source).not.toMatch(/setTimeout\(/);
  });
});
