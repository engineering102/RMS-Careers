// Scenario 1: anonymous visitors on the public website (apps/web). GET only, no credentials, no forms.
// This is the only scenario config.js allows against production, and then only as a <= 5 VU smoke.
// Journey: home -> programs -> one program -> curriculum -> learn -> DSA sheet list -> one sheet.
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { scenarioSetup, thinkSeconds } from '../lib/options.js';
import { extractPaths, hasAppError } from '../lib/html.js';
import { makeHandleSummary } from '../lib/summary.js';

const ROUTES = ['/', '/programs', '/programs/:code', '/curriculum', '/learn', '/learn/dsa', '/learn/dsa/:sheet'];
const { config, guard, options: built } = scenarioSetup('public-web', { routes: ROUTES });
export const options = built;
/** Refuses CLI-overridden shapes (e.g. --vus) before any iteration runs. */
export const setup = guard;

function page(path, name) {
  const res = http.get(`${config.web}${path}`, { tags: { name, kind: 'public' } });
  check(res, {
    [`${name}: 200`]: (r) => r.status === 200,
    [`${name}: html without app error`]: (r) => String(r.headers['Content-Type'] ?? '').includes('text/html') && !hasAppError(r.body)
  });
  return res;
}

export default function () {
  group('public website', () => {
    page('/', '/');
    sleep(thinkSeconds(config));

    const programs = page('/programs', '/programs');
    const codes = extractPaths(programs.body, 'programs');
    if (codes.length > 0) {
      sleep(thinkSeconds(config));
      page(`/programs/${codes[Math.floor(Math.random() * codes.length)]}`, '/programs/:code');
    }
    sleep(thinkSeconds(config));

    page('/curriculum', '/curriculum');
    sleep(thinkSeconds(config));
    page('/learn', '/learn');
    sleep(thinkSeconds(config));

    const dsa = page('/learn/dsa', '/learn/dsa');
    const sheets = extractPaths(dsa.body, 'learn/dsa');
    if (sheets.length > 0) {
      sleep(thinkSeconds(config));
      page(`/learn/dsa/${sheets[Math.floor(Math.random() * sheets.length)]}`, '/learn/dsa/:sheet');
    }
    sleep(thinkSeconds(config));
  });
}

export const handleSummary = makeHandleSummary('public-web');
