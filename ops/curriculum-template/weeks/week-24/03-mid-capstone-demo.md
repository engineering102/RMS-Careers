---
type: notes
title: "W24 · S3 · Mid-Capstone Demo and Mock Interview #2"
slug: w24-s3-mid-capstone-demo-mock-interview
topic: Capstone Checkpoint
subject: career
minutes: 30
description: Prepare and run the mid-capstone demo for your tutor, decide what to cut or keep with evidence, and get ready for the second technical mock interview and the full-length aptitude mock.
---
# Mid-capstone demo and mock interview #2

Halfway through the build, your tutor sees the product running. The mid-capstone demo is a **checkpoint**, not a
performance: its job is to find problems while there is still time to fix them.

## What the tutor checks (CAP-M2 · Build Checkpoint)

| Criterion | Points | Evidence |
|---|---|---|
| Must-haves merged vs plan | 20 | Must-have features working from `main`, compared with the Sprint 2 milestone |
| Test plan and first run | 10 | `docs/test-plan.md` with test cases and a recorded first run |
| PR review practice | 10 | Every member has opened PRs and reviewed others' PRs with real comments |
| Mid-capstone demo | 10 | A clear, working demo in which each member shows their own feature |

## Preparing the demo

### 1. Seed realistic demo data

An empty app is hard to judge. Write a **seed script** that loads synthetic data: a few users per role, enough records
to fill tables and charts, and at least one example of every state (pending, approved, rejected). Re-running it should
give the same starting point every time.

```python
# scripts/seed.py: run with  python scripts/seed.py
import os
import random

import psycopg  # psycopg 3

random.seed(42)  # same "random" data on every run
BRANCHES = ["CSE", "ECE", "EEE", "MECH", "CIVIL"]

with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
    with conn.cursor() as cur:
        cur.execute("TRUNCATE applications, students RESTART IDENTITY CASCADE")
        for i in range(1, 21):
            cur.execute(
                "INSERT INTO students (name, branch, cgpa, backlogs) VALUES (%s, %s, %s, %s)",
                (f"Student {i:02d}", random.choice(BRANCHES), round(random.uniform(6.0, 9.6), 2), random.choice([0, 0, 0, 1, 2])),
            )
    # leaving the with-block commits the transaction
print("Seeded 20 synthetic students")
```

(Adapt the table and columns to your schema. A Node.js team can write the same script with the `pg` package.)
Never run a seed script that truncates tables against a database holding anything you want to keep.

### 2. Write a demo script

Decide the journey in advance. A good mid-capstone demo takes 7–10 minutes:

```text
0:00  Problem and the must-have list (30 seconds, no slides needed)
0:30  Owner 1: login and roles, as each role
2:00  Owner 2: create a drive with eligibility rules
4:00  Owner 3: student sees eligible drives only; applies; duplicate blocked
6:00  Owner 4: coordinator dashboard and CSV export
7:30  Board: what is done, what is left, what is at risk
8:30  Questions
```

Each member shows **their own** feature. Your tutor will ask follow-up questions of the person who built it.

### 3. Demo from `main`, on a clean start

Pull `main`, run the seed script, start the app, and click through the script once before the demo. If something
breaks during the demo, say so calmly, explain what should happen, and move on. Hiding a bug is worse than showing it.

## After the demo: scope decisions with evidence

The demo usually shows that some must-haves are behind. Decide now, with the tutor:

| Situation | Decision |
|---|---|
| Feature works but rough edges remain | Keep; list the polish tasks for Week 25 |
| Feature half-built, owner confident, clear plan | Keep; pair on it for the next two days |
| Feature not started, depends on something risky | Simplify (for example, in-app notification instead of email) or move to "future scope" |

Write the decisions in `docs/sprint-notes.md` and update the board. The feature freeze is in the middle of **next**
week, so anything added later goes to a "future scope" slide rather than the codebase.

## Mock interview #2: technical

Mock interview #1 showed you where you stand. For #2, aim to raise your weakest score on the 1–5 rubric:

| Criterion | What moves you from 3 to 5 |
|---|---|
| Problem solving | Clarify first, compare two approaches, optimise without hints |
| Coding | Clean code that handles edge cases; state the complexity unprompted |
| Technical fundamentals | Precise answers with a short example |
| Project explanation | Explain **why** you chose a design, the trade-offs, and your own contribution |
| Communication | Structured answers; think aloud |
| HR / attitude | Authentic, specific answers, not memorised lines |

### Talking about your capstone in depth

Interviewers go deeper than "what did you build?". Prepare answers to:

- Why did you choose PostgreSQL (or MongoDB) for this data?
- How does a request travel from the button click to the database and back?
- How do you stop a student from calling a coordinator-only endpoint?
- What was the hardest bug you fixed, and how did you find it?
- What would you change if you had 10,000 users instead of 50?

For the last one, a good answer names a real bottleneck and a reasonable fix: add an index on a column you filter by,
paginate long lists, cache a slow report, move email sending to a background job.

### DSA in the interview

This week's set B (trees, graphs, heaps) is common in technical rounds. Before the mock, be able to write **BFS with a
queue** and a **recursive tree traversal** from memory without errors, and explain when a heap beats sorting.

## Aptitude: full-length timed mock test #2

The second full-length aptitude mock runs this week. Treat it like the real thing:

- Same conditions: timed, closed book, no phone, one sitting.
- Do a first pass answering everything you can in under a minute; mark the rest and return.
- Afterwards, list every mistake by type (concept gap, calculation slip, misread question, ran out of time). Fix the
  biggest category first.

## Lab: mid-capstone demo

1. Write and run the seed script on your development database.
2. Write the demo script with an owner for each part; rehearse it once.
3. Present the demo to your tutor from `main`.
4. Record scope decisions and update the board.
5. Submit **CAP-M2 · Build Checkpoint**.

## Check yourself

1. Why should the demo run from `main` with freshly seeded data rather than from someone's feature branch?
2. Two must-haves are behind after the demo. What information do you need before deciding whether to keep or cut each?
3. An interviewer asks, "What would break first with 10,000 users?" Give one specific answer for your capstone.
