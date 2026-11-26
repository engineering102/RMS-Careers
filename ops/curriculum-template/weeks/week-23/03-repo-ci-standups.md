---
type: notes
title: "W23 · S3 · Build Sprint: Repository Setup, CI and Daily Stand-ups"
slug: w23-s3-build-sprint-repo-ci-standups
topic: Team Workflow & CI
subject: dev-tools
minutes: 30
description: Set up the capstone repository for team work — structure, branch protection, pull-request flow and a GitHub Actions CI workflow — then build core feature #1 as a vertical slice with daily stand-ups.
---
# Build sprint: repository setup, CI and daily stand-ups

Design is approved; now the team starts building. The first session of building is mostly about **making team work
safe**: a clean structure, a protected `main` branch, CI that catches broken code, and a short daily check-in.

## Repository structure

Agree on one layout and create it in the first commit. A full stack monorepo:

```text
capstone/
├── client/              # React app (Vite)
├── server/              # Express API
│   ├── src/
│   │   ├── routes/
│   │   ├── db/          # connection, queries, migrations
│   │   └── app.js       # builds the Express app (no listen here)
│   ├── tests/
│   └── index.js         # imports app and calls listen
├── docs/                # PRD, ER diagram, API contract, test plan
├── .github/workflows/ci.yml
├── .env.example
├── .gitignore
└── README.md
```

A data or AI project might use `app/` (Streamlit or FastAPI), `etl/`, `notebooks/`, `models/`, `tests/` and `docs/`.

Two rules that save pain later:

- **`.env.example`** lists every environment variable with a dummy value (`DATABASE_URL=postgres://user:pass@host/db`).
  The real `.env` is in `.gitignore` from the first commit.
- **Separate building the app from starting it** (`app.js` vs `index.js`). Tests import `app` without opening a port.

## The pull-request workflow

Nobody pushes directly to `main`. Every change goes through a branch and a pull request (PR).

```bash
git switch main
git pull                                  # start from the latest main
git switch -c feat/12-eligible-drives     # branch per issue: type/issue-short-name
# ... work, commit in small steps ...
git push -u origin feat/12-eligible-drives
# open a PR on GitHub, write "Closes #12", request a reviewer
```

Protect `main` in **Settings → Branches** (or **Rules → Rulesets**): require a pull request before merging, require at
least one approval, and require the CI check to pass. Now a broken build cannot reach `main` by accident.

Keep PRs **small**: one issue, ideally under about 300 changed lines. Small PRs get reviewed the same day; large ones sit
for days and collect merge conflicts.

## Continuous integration with GitHub Actions

CI runs your checks on every push and pull request. Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  server:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: server
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: server/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

For a Python project, the job steps become:

```yaml
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: pytest
```

On Day 1 there may be only one trivial test. That is fine: the point is that the pipeline exists and is green, so every
later PR shows a pass or fail. Add a status badge to the README.

> **Secrets in CI:** if a test needs a value such as a database URL, store it under **Settings → Secrets and variables →
> Actions** and read it as `${{ secrets.TEST_DATABASE_URL }}`. Never paste it into the YAML file.

## Build in vertical slices

A **vertical slice** is one user story working through every layer: UI → API → database → back to the UI. Build
**core feature #1** as a thin slice first, then thicken it.

| Approach | Day 3 result |
|---|---|
| Horizontal: "I'll do all the tables, you do all the screens" | Nothing works end to end; integration problems appear in Week 25 |
| Vertical: "Login works, from the form to the users table" | One real feature to demo; integration problems found on Day 1 |

For PlaceTrack, a good first slice is **login**: the form posts to `POST /api/auth/login`, the API checks the bcrypt
hash in `users`, and the client stores the session or token and shows the user's name. Every later feature depends on
it.

A minimal Express app with a health check gives CI something real to test:

```js
// server/src/app.js
import express from 'express';

const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
```

```js
// server/index.js
import app from './src/app.js';

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on ${port}`));
```

(Set `"type": "module"` in `server/package.json` to use `import`.)

## Daily stand-ups (10 minutes)

Same time every day, standing up or on a short call. Each person answers three questions:

1. What did I finish since the last stand-up?
2. What will I do next?
3. What is blocking me?

Rules: no problem-solving during the stand-up (take it offline straight after), keep the board open and move cards as
you talk, and record blockers in the team chat. If someone is blocked for more than half a day, pair with them.

## Definition of done

Agree as a team that an issue is **done** only when:

- [ ] the code is merged to `main` through a reviewed PR;
- [ ] CI is green;
- [ ] its acceptance criteria pass when checked by hand (and by tests where you have them);
- [ ] the board card is in **Done**.

## Lab: core feature #1

1. Create the repository structure, `.gitignore`, `.env.example` and README skeleton.
2. Add the CI workflow and make it pass with one test.
3. Protect `main`.
4. Build core feature #1 as a vertical slice on a feature branch, open a PR with `Closes #<issue>`, get it reviewed and
   merge it.
5. Hold your first stand-up at the end of the session and update the board.

## Check yourself

1. Why does the server keep `app.js` (build the app) separate from `index.js` (start listening)?
2. A teammate's PR fails CI but "works on my machine". What should happen before it is merged?
3. Explain the difference between a vertical slice and a horizontal split of work, and why the first is safer.
