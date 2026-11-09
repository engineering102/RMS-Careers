// Captures full-page screenshots of every student portal route at desktop (1440) and phone (390) widths, for
// before/after comparison during the UI redesign. View-only: it signs in, opens pages and never submits,
// starts, completes or edits anything.
//
// Usage (against a LOCAL dev server on the NonProd test database only):
//   STUDENT_EMAIL=... STUDENT_PASSWORD=... node scripts/visual/capture-student.mjs <outDir> [baseUrl] [colorScheme]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const [outDir, baseUrl = 'http://localhost:3032', colorScheme = 'dark'] = process.argv.slice(2);
if (!outDir) throw new Error('usage: capture-student.mjs <outDir> [baseUrl] [colorScheme]');
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl)) throw new Error('Only a local dev server is allowed.');
const email = process.env.STUDENT_EMAIL;
const password = process.env.STUDENT_PASSWORD;
if (!email || !password) throw new Error('Set STUDENT_EMAIL and STUDENT_PASSWORD (seed demo student).');

const PUBLIC = ['/login', '/activate', '/forgot-password', '/resend-activation', '/reset-password'];
const STATIC = ['/overview', '/batches', '/library', '/dsa', '/assessments', '/leaderboards', '/notifications', '/profile', '/this-page-does-not-exist'];
// First link on any visited page matching each pattern stands in for that dynamic route.
const DYNAMIC = [
  { name: 'batch', re: /^\/batches\/[^/?#]+$/ },
  { name: 'batch-curriculum', re: /^\/batches\/[^/?#]+\/curriculum/ },
  { name: 'content', re: /^\/content\/[^/?#]+/ },
  { name: 'assessment', re: /^\/assessments\/[^/?#]+/ },
  { name: 'dsa-sheet', re: /^\/dsa\/[^/?#]+/ },
  { name: 'library-item', re: /^\/library\/[^/?#]+/ }
];
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
];

const slug = (p) => (p === '/' ? 'root' : p.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/-+$/, ''));

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(400);
}

async function shoot(page, name, vp) {
  const file = path.join(outDir, vp.name, `${name}.png`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  ${vp.name}/${name}.png`);
}

const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor ?? 1, colorScheme });
    const page = await context.newPage();

    for (const route of PUBLIC) {
      await page.goto(baseUrl + route);
      await settle(page);
      await shoot(page, `public-${slug(route)}`, vp);
    }

    await page.goto(`${baseUrl}/login`);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await Promise.all([page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 }), page.getByRole('button', { name: /sign in/i }).click()]);

    const found = new Map();
    const visit = async (route, name) => {
      await page.goto(baseUrl + route);
      await settle(page);
      await shoot(page, name, vp);
      const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
      for (const href of hrefs) {
        if (!href || !href.startsWith('/')) continue;
        const clean = href.split('#')[0];
        for (const d of DYNAMIC) if (!found.has(d.name) && d.re.test(clean.split('?')[0])) found.set(d.name, clean);
      }
    };

    for (const route of STATIC) await visit(route, slug(route));
    // Dynamic routes can reveal further dynamic links (batch -> curriculum -> content), so loop until stable.
    const done = new Set();
    for (let pass = 0; pass < 3; pass++) {
      for (const [name, href] of [...found]) {
        if (done.has(name)) continue;
        done.add(name);
        await visit(href, name);
      }
    }
    for (const d of DYNAMIC) if (!found.has(d.name)) console.log(`  (no link found for ${d.name})`);
    await context.close();
  }
} finally {
  await browser.close();
}
