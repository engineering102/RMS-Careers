---
type: notes
title: "W24 · S4 · Bug Bash: Exploratory Testing, Bug Reports and Triage"
slug: w24-s4-bug-bash-triage
topic: Quality & Bug Fixing
subject: dev-tools
minutes: 30
description: Test another team's application like a real user and an attacker, file clear reproducible bug reports, triage by severity and priority, and fix critical issues with regression tests.
---
# Bug bash: exploratory testing, bug reports and triage

You are the worst person to test your own app: you know which buttons to avoid. In a **bug bash**, teams swap
applications and try to break each other's work for an hour, then fix what was found. It is one of the fastest ways to
make a demo reliable.

## Rules of the bug bash

- Each team gets another team's **deployed or running build** and its PRD.
- Testers file issues on the **owning team's GitHub board** using the bug template below.
- Be thorough and specific, not harsh. The goal is a better product for both teams.
- Do not attack anything outside the app you were given, and do not try to read other people's real data. Use only
  the demo accounts provided.

## Exploratory testing: where bugs hide

Exploratory testing means designing tests as you go, guided by heuristics. Spend a few minutes on each area:

| Area | What to try |
|---|---|
| **Empty and missing input** | Submit forms with every field blank; only spaces; a missing required field |
| **Boundaries** | 0, negative numbers, the exact limit (CGPA 7.5 when the cut-off is 7.5), very large numbers |
| **Long and odd text** | 500-character names, emoji, Hindi or Telugu text, `<script>alert(1)</script>` as a name |
| **Duplicates and double actions** | Double-click Submit; apply twice; refresh after submitting |
| **Permissions** | Log in as the lower role and type the admin URL directly; call an API endpoint without a token |
| **Navigation** | Back button after logout; opening a deep link while logged out; refreshing on an inner page |
| **States** | What does the screen show with no data? While loading? When the API is down? |
| **Small screens** | Open the app at phone width; do tables overflow, are buttons reachable? |
| **Data accuracy** | Do dashboard totals match the rows in the list? Do dates show in the right time zone? |

For data and AI apps, also try: an empty or wrongly formatted CSV, a PDF with no text, a question the documents do not
answer (does the assistant admit it does not know?), and an extremely long prompt.

> If typing `<script>alert(1)</script>` into a name field makes an alert pop up anywhere in the app, that is a
> cross-site scripting (XSS) bug and should be filed as **critical**.

## Writing a bug report someone can act on

A bug report that cannot be reproduced cannot be fixed. Use this template:

```markdown
**Title:** Second click on Apply creates a duplicate application

**Environment:** live URL, Chrome on Windows, logged in as student3@example.com

**Steps to reproduce**
1. Open Drives
2. Click Apply on "Data Analyst – Drive 3"
3. Quickly click Apply again before the page updates

**Expected:** one application; second click shows "Already applied"
**Actual:** two rows appear under My Applications

**Severity:** major   **Evidence:** screenshot, Network tab shows two 201 responses
```

Good titles describe the **symptom**, not a guess at the cause. "Duplicate application on double-click" is useful;
"Database broken" is not.

## Triage: severity and priority

After the bash, each team sorts its new issues. **Severity** describes how bad the bug is; **priority** describes how
soon it must be fixed. They usually agree, but not always.

| Severity | Meaning | Example |
|---|---|---|
| Critical | Security hole, data loss, or the core journey is impossible | Student can open the coordinator dashboard by typing its URL |
| Major | A must-have feature is wrong, with a painful workaround | Duplicate applications on double-click |
| Minor | Wrong but easy to live with | Dashboard total is off by one for drives created today |
| Cosmetic | Looks wrong only | Button text overflows on mobile |

A cosmetic bug on the screen you open the demo with may still be **high priority**. A minor bug in a stretch feature
may be "won't fix before Demo Day". Label each issue (`bug`, `critical`/`major`/...), assign an owner, and put the
critical and major ones in the Sprint 2 milestone.

## Fixing bugs properly

For each critical or major bug:

1. **Reproduce it** yourself, following the report.
2. **Write a failing test** that captures it, when it can be tested automatically.
3. **Fix the cause**, not the symptom. Hiding the second Apply button does not stop two requests; a `UNIQUE`
   constraint plus a 409 response does.
4. **Run the whole test suite**, then open a PR with `Fixes #41` in the description.
5. Ask the tester to **confirm** the fix on the next build.

Example: the role check that was only in the UI moves to the API, where it belongs:

```js
// server/src/middleware/require-role.js
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Please log in' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Not allowed' });
    next();
  };
}

// usage: app.get('/api/dashboard', requireAuth, requireRole('coordinator'), dashboardHandler);
```

(`requireAuth` is your existing middleware that verifies the token and sets `req.user`.)

The regression test that keeps it fixed:

```js
it('blocks students from the coordinator dashboard', async () => {
  const res = await request(app)
    .get('/api/dashboard')
    .set('Authorization', `Bearer ${studentToken}`);
  expect(res.status).toBe(403);
});
```

## Learning from the bash

Look at the list of bugs other people found in your app. Which categories appear most? If three were missing
server-side validation, check every endpoint for the same mistake now, not just the three that were reported. Add the
pattern to your PR review checklist.

## Lab: bug bash and fixes

1. Test your assigned team's app for 45 minutes using the heuristics table; file at least five well-written issues.
2. Triage the issues filed against your app: severity, priority, owner.
3. Fix every critical issue before the end of the session, each with a test where possible.
4. Update `docs/test-plan.md` with a second test run.

## Check yourself

1. What is the difference between severity and priority? Give an example where they differ.
2. Why is "hide the button after the first click" not a full fix for duplicate submissions?
3. A tester can open `/admin` as a student by typing the URL. The admin page's data comes from `/api/admin/stats`.
   Where must the fix go, and what status code should a student receive?
