// Accessibility scan of the student portal with axe-core (WCAG 2.0/2.1 A and AA) across every theme and colour
// mode. View-only: signs in, opens pages, never submits or starts anything.
//
// Usage (LOCAL server on the NonProd test database only):
//   STUDENT_EMAIL=... STUDENT_PASSWORD=... AXE_PATH=<path to axe.min.js> \
//     node scripts/visual/axe-student.mjs [baseUrl] [outJson]
import fs from 'node:fs';
import { chromium } from '@playwright/test';

const [baseUrl = 'http://localhost:3033', outJson = 'axe-results.json'] = process.argv.slice(2);
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl)) throw new Error('Only a local server is allowed.');
const { STUDENT_EMAIL: email, STUDENT_PASSWORD: password, AXE_PATH: axePath } = process.env;
if (!email || !password || !axePath) throw new Error('Set STUDENT_EMAIL, STUDENT_PASSWORD and AXE_PATH.');
const axeSource = fs.readFileSync(axePath, 'utf8');

const THEMES = ['graphite', 'notebook', 'transcript'];
const MODES = ['light', 'dark'];
const PUBLIC = ['/login', '/activate', '/forgot-password', '/resend-activation', '/reset-password'];
const STATIC = ['/overview', '/batches', '/library', '/dsa', '/assessments', '/leaderboards', '/notifications', '/profile', '/this-page-does-not-exist'];
const DYNAMIC = [/^\/batches\/[^/?#]+$/, /^\/content\/[^/?#]+/, /^\/assessments\/[^/?#]+/, /^\/dsa\/[^/?#]+/];

async function scan(page) {
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(300);
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
    return r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 4).map((n) => ({ target: n.target.join(' '), summary: (n.failureSummary || '').split('\n').slice(0, 3).join(' ') })),
      count: v.nodes.length
    }));
  });
}

const results = [];
const browser = await chromium.launch();
try {
  for (const theme of THEMES) {
    for (const mode of MODES) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: mode });
      const host = new URL(baseUrl).hostname;
      await context.addCookies([
        { name: 'rms_theme', value: theme, domain: host, path: '/' },
        { name: 'rms_color_mode', value: mode, domain: host, path: '/' }
      ]);
      const page = await context.newPage();

      for (const route of PUBLIC) {
        await page.goto(baseUrl + route);
        results.push({ theme, mode, route, violations: await scan(page) });
      }

      await page.goto(`${baseUrl}/login`);
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill(password);
      await Promise.all([page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 }), page.getByRole('button', { name: /sign in/i }).click()]);

      const found = new Set();
      for (const route of STATIC) {
        await page.goto(baseUrl + route);
        results.push({ theme, mode, route, violations: await scan(page) });
        for (const href of await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')))) {
          const path = (href || '').split('#')[0];
          for (const re of DYNAMIC) if (re.test(path.split('?')[0]) && ![...found].some((f) => re.test(f.split('?')[0]))) found.add(path);
        }
      }
      for (const route of found) {
        await page.goto(baseUrl + route);
        results.push({ theme, mode, route, violations: await scan(page) });
      }
      await context.close();
      process.stdout.write(`${theme}/${mode} done\n`);
    }
  }
} finally {
  await browser.close();
}
fs.writeFileSync(outJson, JSON.stringify(results, null, 2));

// Summary: each rule once, with the routes/themes it fails on.
const byRule = new Map();
for (const r of results)
  for (const v of r.violations) {
    const e = byRule.get(v.id) ?? { impact: v.impact, help: v.help, where: new Set(), nodes: 0, sample: v.nodes[0] };
    e.where.add(`${r.theme}/${r.mode} ${r.route.split('?')[0]}`);
    e.nodes += v.count;
    byRule.set(v.id, e);
  }
console.log(`\n${results.length} page scans, ${byRule.size} distinct rules violated`);
for (const [id, e] of byRule)
  console.log(`- [${e.impact}] ${id}: ${e.help} (${e.nodes} nodes on ${e.where.size} page/theme combos)\n    e.g. ${e.sample?.target}  ${e.sample?.summary?.slice(0, 160)}\n    first: ${[...e.where].slice(0, 4).join(', ')}`);
