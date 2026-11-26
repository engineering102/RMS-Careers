---
type: resource
title: "W15 · Cheat Sheet: Integration, Deployment, CI and MP3"
slug: w15-cheat-sheet
topic: Week 15 Reference
subject: dev-tools
minutes: 10
description: One-page reference for Week 15 — connecting React to Express, production environment variables, deploy order and SPA rewrites, a GitHub Actions CI workflow, the MP3 checklist, resume v1 and this week's tasks.
---
# Week 15 cheat sheet

## Integration

```js
// client: one API client
const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
  method,
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify(body),
});
// server: allow the client origin(s)
app.use(cors({ origin: process.env.CLIENT_ORIGIN.split(',') }));
```

Auth flow: login → `{ token, user }` → store token → `Authorization: Bearer` on every request → on reload
`GET /auth/me` → on 401 log out. Hide buttons in the UI **and** enforce roles on the API.

## Environment variables

| Variable | Where | Dev value | Prod value |
|---|---|---|---|
| `VITE_API_URL` | client (build time, public) | `http://localhost:4000` | API URL on Render |
| `CLIENT_ORIGIN` | server | `http://localhost:5173` | front-end URL, no trailing slash |
| `DATABASE_URL` | server (secret) | local PostgreSQL | Neon/Supabase string with `sslmode=require` |
| `JWT_SECRET` | server (secret) | random string | a **different** random string |
| `PORT` | server | 4000 | set by the host |

## Deploy order

1. **Database** (Neon / Supabase / Atlas) → run migrations from your laptop with an ignored env file.
2. **API** (Render): root `server`, build `npm ci`, start `npm start`, env vars, health check `/api/health`.
3. **Front end** (Vercel / Netlify): root `client`, build `npm run build`, output `dist`, `VITE_API_URL`.
4. Set `CLIENT_ORIGIN` on the API to the front-end URL; redeploy.

SPA rewrite: Vercel `client/vercel.json` → `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`;
Netlify `client/public/_redirects` → `/*  /index.html  200`. Changed a `VITE_` variable? **Redeploy** the front end.

## GitHub Actions CI

```yaml
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
```

Add a matching `server` job. Badge: `![CI](https://github.com/<user>/<repo>/actions/workflows/ci.yml/badge.svg)`.
Protect `main`: require a PR and passing checks.

## MP3 checklist

- [ ] React + Express + PostgreSQL (or MongoDB), two roles, role checks on the API
- [ ] Full CRUD on the main resource; validation on client and server; loading, error and empty states
- [ ] Deployed: public URL works, deep links refresh correctly
- [ ] CI runs lint and tests on every PR; badge passing
- [ ] No secrets in Git history; `.env.example` committed
- [ ] README per the documentation checklist, screenshots, 2-minute demo video link
- [ ] Every member can explain any line

## Resume v1 (career task)

One page, single column, no tables or images, standard fonts. Order: contact (LinkedIn, GitHub, portfolio) →
education → skills → projects → experience/internships → certifications → achievements. Project bullets: **action
verb + what you built + technology + true, measurable result**. Export as `Firstname_Lastname_Resume.pdf`.

## Heaps (DSA)

`heapq` is a min-heap · max-heap: push `-x` · top k largest: size-k **min**-heap · k closest: size-k **max**-heap ·
merge k lists: heap of `(val, index, node)`.

## This week

| Item | Details |
|---|---|
| **Deliverable** | MP3 · Deployed Full Stack App: public URL, CI passing, README with screenshots and demo video link |
| **Practice quiz** | Full Stack Integration, CI & Deployment (untimed, retakes allowed) |
| **Phase 3 test** | Replaces this week's weekly test: 30 questions covering Weeks 9–15 (HTML/CSS, JavaScript, async, React, Node/Express, databases, CI and deployment), 45 minutes |
| **DSA** | Heaps: Kth Largest (LC 215), Last Stone Weight (1046), K Closest Points (973), Top K Frequent Words (692), Merge k Sorted Lists (23) |
| **Career task** | Resume v1: one-page ATS-friendly resume, reviewed by your tutor |
