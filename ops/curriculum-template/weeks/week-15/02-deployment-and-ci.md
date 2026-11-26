---
type: notes
title: "W15 · S2 · Deployment and CI: Vercel/Netlify, Render, Managed Databases and GitHub Actions"
slug: w15-s2-deployment-and-ci
topic: Deployment & CI
subject: dev-tools
minutes: 45
description: Deploying a three-part app (managed PostgreSQL or MongoDB, an Express API on Render or similar, a React build on Vercel or Netlify), SPA rewrites, production environment variables, and a GitHub Actions workflow that lints and tests every pull request.
---
# Deployment and CI

An app that only runs on your laptop is hard to show an interviewer. Today it gets a public URL, and every pull
request gets an automatic check that it still lints, tests and builds.

## The three parts and where they go

```text
Browser ──▶ Front end (static files)  ──fetch──▶  API (Node process)  ──SQL──▶  Database
            Vercel / Netlify                      Render (or similar)          Neon / Supabase / MongoDB Atlas
```

| Part | What is deployed | Typical free-tier host |
|---|---|---|
| Front end | The output of `npm run build`: HTML, JS, CSS in `client/dist` | Vercel, Netlify |
| API | A long-running Node process listening on a port | Render (or a similar platform) |
| Database | A managed PostgreSQL or MongoDB instance | Neon or Supabase (PostgreSQL), MongoDB Atlas |

Free tiers and their limits change often. Before you deploy, read each provider's current free-plan page, and expect
behaviour such as a free API **sleeping when idle**, so the first request after a quiet period is slow. Mention this
in your README so reviewers are not surprised.

Deploy in this order: **database → API → front end**, because each part needs the address of the one before it.

## Step 1: the database

**PostgreSQL (Neon or Supabase).** Create a project and copy the connection string. Hosted databases require
encrypted connections, so the string usually ends in `?sslmode=require`, which node-postgres reads automatically.

Run your migrations against it from your laptop with a separate, ignored env file:

```bash
# server/.env.production.local  (ignored by Git)
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
```

```bash
cd server
node --env-file=.env.production.local src/db/migrate.js
```

Make sure `.gitignore` covers every env file except the example:

```gitignore
.env*
!.env.example
!.env.development
```

The last line keeps the client's `.env.development` (which only holds `VITE_API_URL=http://localhost:4000`, no
secrets) in Git so a fresh clone runs. Never put a secret in a file you un-ignore.

Do **not** run the development seed (which truncates tables) against production. If you need demo data, write a
separate, non-destructive script and use clearly fake data.

**MongoDB Atlas.** Create a free cluster, a database user and copy the `mongodb+srv://` URI. Atlas blocks unknown
IP addresses by default; free API hosts often have changing outbound IPs, so you may need to allow access from
anywhere and rely on a strong database password. Read the warning Atlas shows before you do.

## Step 2: the API

Production rules for the server code:

- Listen on `process.env.PORT`; the host chooses the port.
- The `start` script is plain `node src/server.js`. Do not use `--env-file` in production: the host injects env
  variables and there is no `.env` file on the server.
- Keep the start-up check that throws when a required variable is missing; a crash with a clear message is far
  easier to debug than a half-working API.
- Keep a cheap `GET /api/health` route for the host's health check.

On **Render** (other platforms are similar):

1. New → Web Service → connect your GitHub repository.
2. **Root directory**: `server`. **Build command**: `npm ci`. **Start command**: `npm start`.
3. Add environment variables: `DATABASE_URL`, `JWT_SECRET` (a new random value, not your development one),
   `CLIENT_ORIGIN` (fill in after Step 3), `NODE_ENV=production`.
4. Set the health check path to `/api/health` and deploy. Watch the logs for `API listening`.
5. Test: `curl https://<your-api>.onrender.com/api/health`.

Every push to `main` redeploys automatically. That is why CI (below) matters: it stops a broken commit before it
reaches `main`.

## Step 3: the front end

The front end is static files, so any static host works.

**Vercel:** Add New → Project → import the repository → **Root directory** `client` (Vercel detects Vite: build
`npm run build`, output `dist`) → add `VITE_API_URL=https://<your-api>.onrender.com` → Deploy.

**Netlify:** Add new site → import from Git → **Base directory** `client`, build command `npm run build`, publish
directory `client/dist` → add `VITE_API_URL` → Deploy.

`VITE_` variables are baked in **at build time**, so after changing one you must redeploy the front end.

### SPA rewrites (the "404 on refresh" bug)

Opening `https://your-app.vercel.app/items/7` directly asks the host for a file `/items/7`, which does not exist.
Tell the host to serve `index.html` for every path so React Router can take over. For Vercel, create
`client/vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

For Netlify, create `client/public/_redirects` (Vite copies `public/` into `dist/`):

```text
/*    /index.html   200
```

Use the one for your host; real files such as `/assets/index-abc123.js` are still served normally.

### Close the loop

Back on Render, set `CLIENT_ORIGIN` to your front-end URL exactly, for example `https://campus-market.vercel.app`
(scheme included, **no trailing slash**), and redeploy the API.

## Smoke test after every deploy

- [ ] Front end loads; refreshing a deep link such as `/items/1` works
- [ ] Sign up, log out, log in
- [ ] Create, edit and delete a record; refresh and it is still there
- [ ] A second user gets "not allowed" when editing the first user's record
- [ ] DevTools Console has no CORS or 404 errors; Network shows requests going to the production API
- [ ] No secrets in the client bundle (search the built JS for `postgresql://` or your JWT secret)

| Symptom | Likely cause |
|---|---|
| CORS error in the console | `CLIENT_ORIGIN` does not exactly match the front-end origin (trailing slash, http vs https) |
| Requests go to `localhost:4000` from the live site | `VITE_API_URL` not set on the host, or set after the last build |
| 404 when refreshing a page | Missing SPA rewrite |
| API crashes on start | Missing env variable, or the start script still uses `--env-file` |
| Database connection errors | Wrong connection string, SSL not enabled, or (Atlas) IP access list |
| First request takes a long time | Free API instance waking from sleep |

## Continuous integration with GitHub Actions

**CI** runs your checks on a clean machine for every push and pull request. A pull request with a failing (red) check should not
be merged. GitHub Actions workflows are YAML files in `.github/workflows/`.

First make sure both halves have the scripts CI will call. In `client/package.json` (the server's is similar, without
`build`):

```json
"scripts": {
  "lint": "eslint .",
  "test": "vitest",
  "build": "vite build"
}
```

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  client:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: client
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: client/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npx vitest run
      - run: npm run build
        env:
          VITE_API_URL: https://example.invalid

  server:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: server
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: server/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npx vitest run
```

How to read it:

- `on`: run for every pull request, and for pushes to `main`.
- Each **job** runs on a fresh Ubuntu virtual machine; `client` and `server` run in parallel.
- `actions/checkout` fetches your code; `actions/setup-node` installs Node and caches npm downloads.
- `npm ci` installs exactly what `package-lock.json` says (commit the lock file!) and fails if it is out of date.
- Any step that exits with a non-zero code fails the job, and the pull request shows a failing (red) check.
- The build gets a placeholder `VITE_API_URL`; CI only checks that the build succeeds.
- The workflow assumes Vitest in both halves. If the server uses another test runner, call its run-once command.

Server tests in CI should not need your production database. Unit-test services and validation with fakes, or test
routes with a library such as Supertest against `app` (exported from `app.js` without `listen`). If you want real
database tests, GitHub Actions can start a throwaway PostgreSQL **service container** for the job; never put real
credentials in a workflow file. If a step truly needs a secret, store it in the repository's Actions secrets.

### Make CI count

1. In the repository settings, add a branch rule (or ruleset) for `main` that **requires a pull request** and
   **requires the CI checks to pass** before merging.
2. Add the badge to the top of your README:

```markdown
![CI](https://github.com/<your-username>/<repo>/actions/workflows/ci.yml/badge.svg)
```

The badge shows the status of the latest run on the default branch.

## Lab: deploy and add a CI badge

1. Create the production database and run migrations against it.
2. Deploy the API; `curl` the health route.
3. Deploy the front end with `VITE_API_URL` and the SPA rewrite; set `CLIENT_ORIGIN` on the API.
4. Run the smoke-test checklist and fix anything that fails.
5. Add `ci.yml`, open a pull request and watch both jobs run. Then break a test on purpose, push, see the failing check,
   and fix it.
6. Protect `main`, add the badge and the live URLs to the README.

## Check yourself

1. You changed `VITE_API_URL` in the Vercel dashboard, but the live site still calls the old API. Why, and how do you
   fix it?
2. Why does the workflow use `npm ci` rather than `npm install`?
3. List the order in which you deploy the three parts, and the one value each later part needs from an earlier one.
