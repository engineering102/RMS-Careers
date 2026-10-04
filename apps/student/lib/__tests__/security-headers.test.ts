import { describe, expect, it } from 'vitest';
import studentConfig from '../../next.config';

describe('Student indexing protection', () => {
  it('emits noindex and nofollow for every Student Portal route', async () => {
    const headers = await studentConfig.headers?.();
    expect(headers).toEqual([{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }]);
  });
});
