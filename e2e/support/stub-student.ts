/**
 * A throwaway STUB that imitates just enough of the student portal's markup and request shape
 * (login form -> POST with a `next-action` header -> authenticated shell -> sign-out form) to test
 * the e2e mechanics: the single-use write permits, the journey code and the workflow reporting.
 * It is NOT the real application and a pass against it proves nothing about production.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';

const NAV = [
  ['/overview', 'Overview'],
  ['/batches', 'Batch Workspace'],
  ['/library', 'My Library'],
  ['/dsa', 'DSA Practice'],
  ['/assessments', 'Assessments'],
  ['/leaderboards', 'Leaderboards'],
  ['/profile', 'Profile']
];

export interface Stub {
  origin: string;
  /** Every non-GET request the stub actually received (should be exactly the permitted ones). */
  received: string[];
  close(): Promise<void>;
}

export async function startStudentStub(opts: { failOverview?: boolean; port?: number } = {}): Promise<Stub> {
  const received: string[] = [];
  let signedIn = false;
  const server = http.createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0];
    if (req.method !== 'GET') {
      received.push(`${req.method} ${path}`);
      if (path === '/login') signedIn = true;
      else signedIn = false;
      res.statusCode = 200;
      res.setHeader('content-type', 'text/x-component');
      return res.end('0:{}');
    }
    res.setHeader('content-type', 'text/html; charset=utf-8');
    if (path === '/login') {
      return res.end(`<main><form id="f"><input name="email" type="email"><input name="password" type="password">
        <button type="submit">Sign in</button></form>
        <script>f.onsubmit=async e=>{e.preventDefault();await fetch('/login',{method:'POST',headers:{'next-action':'x'},body:'x'});location.href='/overview'}</script></main>`);
    }
    if (!signedIn) {
      res.statusCode = 307;
      res.setHeader('location', '/login');
      return res.end();
    }
    const body = NAV.map(([h, t]) => `<a href="${h}">${t}</a>`).join('') + '<span>Notifications</span>';
    const content = path === '/overview' && opts.failOverview ? '<h1>Application error: a client-side exception has occurred</h1>' : `<h2>${path}</h2>`;
    res.end(`<nav>${body}</nav>${content}<form id="o"><button type="submit">Sign out</button></form>
      <script>o.onsubmit=async e=>{e.preventDefault();await fetch('/api/session/sign-out',{method:'POST',body:'y'});location.href='/login'}</script>`);
  });
  await new Promise<void>((resolve) => server.listen(opts.port ?? 0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  return {
    origin: `http://127.0.0.1:${port}`,
    received,
    close: () => new Promise<void>((resolve) => server.close(() => resolve()))
  };
}
