---
type: notes
title: "W24 · S2 · Integration and Testing: Unit Tests, API Tests, Test Plans and Code Review"
slug: w24-s2-testing-test-plan-code-review
topic: Testing & Code Review
subject: dev-tools
minutes: 35
description: Write unit tests with pytest, API tests with Vitest and Supertest, and manual test cases from your acceptance criteria; assemble a test plan; and review every pull request with a clear checklist.
---
# Integration and testing: unit tests, API tests, test plans and code review

A feature is not finished when it works once on your laptop. It is finished when you can **show** it works, and keep it
working while four people change the code around it. This session adds tests and reviews to every pull request.

## Three kinds of test

| Kind | Checks | Speed | How many |
|---|---|---|---|
| **Unit** | One function or class in isolation (eligibility rule, score calculation, parser) | milliseconds | many |
| **API / integration** | An endpoint through routing, validation and (sometimes) the database | fast | several per resource |
| **Manual / end to end** | A user journey through the real UI | slow | one per user story |

This is often drawn as a **test pyramid**: lots of cheap unit tests at the bottom, fewer API tests, and a small number
of manual or end-to-end checks at the top.

Focus your tests on **business rules** (who is eligible, what score is awarded, when stock is low) and on **error
paths** (invalid input, no permission). Those are what break in a demo.

## Unit tests in Python with pytest

Keep the rule in a plain function so it can be tested without a database or web server:

```python
# app/eligibility.py
def is_eligible(student: dict, drive: dict) -> bool:
    return (
        student["cgpa"] >= drive["min_cgpa"]
        and student["backlogs"] <= drive["max_backlogs"]
        and student["branch"] in drive["branches"]
    )
```

```python
# tests/test_eligibility.py
import pytest

from app.eligibility import is_eligible

DRIVE = {"min_cgpa": 7.5, "max_backlogs": 0, "branches": {"CSE", "ECE"}}


def test_student_meeting_every_rule_is_eligible():
    student = {"cgpa": 8.1, "backlogs": 0, "branch": "CSE"}
    assert is_eligible(student, DRIVE)


@pytest.mark.parametrize(
    "student",
    [
        {"cgpa": 7.4, "backlogs": 0, "branch": "CSE"},   # CGPA just below
        {"cgpa": 9.0, "backlogs": 1, "branch": "CSE"},   # one backlog
        {"cgpa": 9.0, "backlogs": 0, "branch": "MECH"},  # wrong branch
    ],
)
def test_student_failing_any_rule_is_not_eligible(student):
    assert not is_eligible(student, DRIVE)


def test_cgpa_exactly_on_the_cut_off_is_eligible():
    assert is_eligible({"cgpa": 7.5, "backlogs": 0, "branch": "ECE"}, DRIVE)
```

So that `from app.eligibility import ...` works when you run `pytest` from the project root, add this to
`pyproject.toml`:

```toml
[tool.pytest.ini_options]
pythonpath = ["."]
```

Notice the **boundary test** (exactly 7.5). Off-by-one mistakes such as `>` instead of `>=` live at boundaries.

## API tests in JavaScript with Vitest and Supertest

Because `app.js` builds the app without calling `listen` (Week 23), Supertest can send requests to it directly.

```bash
cd server
npm install --save-dev vitest supertest
```

In `server/package.json` set `"test": "vitest run"`.

```js
// server/tests/health.test.js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
```

Then test your own endpoints against the API contract, especially the error rows:

```js
// server/tests/auth.test.js
import { it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

it('rejects a login with no password with 400', async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'asha@example.com' });
  expect(res.status).toBe(400);
  expect(res.body.error).toBeDefined();
});

it('rejects a request without a token with 401', async () => {
  const res = await request(app).get('/api/drives');
  expect(res.status).toBe(401);
});
```

Tests that need a database should use a **separate test database** (its URL in a CI secret), never the one your demo
uses, and should create the rows they need at the start.

## Manual test cases

Some checks are easier by hand: a chart renders, a CSV downloads, a page looks right on a phone. Write them down so
anyone on the team can repeat them:

| ID | Story | Steps | Expected result | Result |
|---|---|---|---|---|
| TC-07 | Eligible drives only | Log in as `student2@example.com` (CGPA 7.2, ECE); open Drives | The drive with min CGPA 7.5 is not listed | Pass |
| TC-08 | Apply once | Apply to drive 3; click Apply again | Second click shows "Already applied"; one row in `applications` | Fail: issue #41 |
| TC-09 | CSV export | As coordinator, export shortlisted students for drive 3 | File downloads; header row plus one row per shortlisted student | Pass |

Your **acceptance criteria from Week 23 become these test cases** almost word for word.

## The test plan (`docs/test-plan.md`)

```markdown
# Test plan

## Scope
Must-have features in the PRD; out of scope: stretch goals.

## Approach
- Unit tests (pytest / Vitest) for business rules
- API tests for every endpoint's success and main error codes
- Manual test cases for UI journeys (table below)
- CI runs automated tests on every pull request

## Test data
Seed script creates 2 coordinators, 20 synthetic students, 5 drives.

## Manual test cases
<table of TC-xx rows>

## Test runs
| Date | Build (commit) | Passed | Failed | Notes |
```

Record your **first test run** this week: which tests passed, which failed, and the issue number for each failure.

## Peer code review on every pull request

Review is how a team keeps quality up and shares knowledge. Every PR gets at least one reviewer who is not the author.

**As a reviewer, check:**

- [ ] Does it do what the issue's acceptance criteria say? Did you run it?
- [ ] Are errors handled, and is input validated on the server?
- [ ] Are there tests for the new rule or endpoint?
- [ ] Are names clear? Is there duplicated code that should be shared?
- [ ] No secrets, debug prints or commented-out blocks left behind?

**Write comments that help:**

| Unhelpful | Helpful |
|---|---|
| "This is wrong." | "If `branches` is empty this returns every drive. Should an empty list mean 'no branch allowed'?" |
| "Bad naming." | "Could `d` be `drive`? It is used 40 lines later and I lost track of it." |

Separate **blocking** issues (bugs, security) from **suggestions** ("nit: ..."). Approve when the blocking issues are
fixed.

**As an author:** keep PRs small, describe what changed and how you tested it, reply to every comment, and do not take
review personally. Reviewing and being reviewed are both scored in this week's checkpoint.

## Lab: test plan and first test run

1. Write at least three unit tests for your feature's business rule and two API tests (one success, one error).
2. Make sure CI runs them on every PR.
3. Add your manual test cases to `docs/test-plan.md`.
4. Do a full first test run as a team and record the results, with issue links for failures.
5. Review at least two teammates' PRs with specific comments.

## Check yourself

1. Why test the boundary value 7.5 separately from 7.4 and 8.1?
2. What makes `request(app)` possible without starting the server on a port?
3. Give one example of a blocking review comment and one example of a "nit".
