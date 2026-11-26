---
type: resource
title: "W24 · Cheat Sheet: Integration, Testing, Code Review and Bug Triage"
slug: w24-cheat-sheet
topic: Week 24 Reference
subject: dev-tools
minutes: 10
description: One-page reference for Capstone Sprint 2 — syncing branches, integration fixes, pytest and Supertest patterns, the test-plan outline, review checklist, bug report template, severity levels and this week's deliverables.
---
# Week 24 cheat sheet

## Stay in sync with main

```bash
git switch main && git pull
git switch feat/18-dashboard && git merge main
# conflict? edit file, remove <<<<<<< ======= >>>>>>> markers, run tests
git add <file> && git commit
```

## Integration checklist

- [ ] API base URL from config (`import.meta.env.VITE_API_URL`), not hard-coded
- [ ] CORS allows only your front-end origin
- [ ] JSON field names match `docs/api-contract.md`
- [ ] Every screen has **loading**, **error** and **empty** states
- [ ] Secrets and keys only in server environment variables

## Tests

| Kind | Tool | Example |
|---|---|---|
| Unit | pytest / Vitest | `assert is_eligible(student, drive)` |
| API | Vitest + Supertest | `await request(app).get('/api/drives')` → `expect(res.status).toBe(401)` |
| Manual | test-case table | ID · story · steps · expected · result |

```toml
# pyproject.toml, so tests can import your package from the project root
[tool.pytest.ini_options]
pythonpath = ["."]
```

Always test **boundaries** (exactly on the cut-off), **error paths** (400/401/403/404/409) and **duplicates**.

## Test plan outline (`docs/test-plan.md`)

Scope · Approach · Test data (seed script) · Manual test cases · Test runs (date, commit, passed, failed, notes)

## Code review checklist

- [ ] Meets the issue's acceptance criteria (you ran it)
- [ ] Server-side validation and error handling
- [ ] Tests for new rules and endpoints
- [ ] Clear names; no duplication
- [ ] No secrets, debug prints or commented-out code

Mark comments as **blocking** or **nit**. Be specific; suggest, do not just criticise.

## Pair programming

Driver types and narrates · Navigator reviews, thinks ahead · swap every 15–20 min · owner drives at least half.

## Bug report

```text
Title (symptom) · Environment · Steps to reproduce · Expected · Actual · Severity · Evidence
```

| Severity | Example |
|---|---|
| Critical | Security hole, data loss, core journey impossible |
| Major | Must-have feature wrong; painful workaround |
| Minor | Wrong but easy to live with |
| Cosmetic | Visual only |

Fix the **cause**, add a regression test, reference `Fixes #41` in the PR.

## This week

| Item | Details |
|---|---|
| **Deliverable** | CAP-M2 · Build Checkpoint: all must-have features merged to main, `docs/test-plan.md` with a first test run, reviewed PRs from every member, mid-capstone demo |
| **Practice quiz** | Capstone Sprint 2: Build & Integrate (untimed, retakes allowed) |
| **Weekly test** | 15 questions on integration, testing, code review, bug triage and set B patterns, 25 minutes |
| **DSA** | Set B: Zigzag Level Order, Flatten Binary Tree, Construct Tree from Inorder and Postorder, Minimum Genetic Mutation, Design Twitter, Serialize and Deserialize Binary Tree, Swim in Rising Water; 90-minute timed contest |
| **Career task** | Mock Interview #2 (technical); aptitude full-length timed mock test #2 |
