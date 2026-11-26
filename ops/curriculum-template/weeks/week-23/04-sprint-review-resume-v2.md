---
type: notes
title: "W23 · S4 · Sprint Review, Résumé v2 and Mock Interview #1"
slug: w23-s4-sprint-review-resume-v2-mock-interview
topic: Sprint Review & Career
subject: career
minutes: 30
description: Run an end-of-sprint review and retrospective, then update your résumé to v2 with the capstone and mini projects and prepare for your first 30-minute technical mock interview.
---
# Sprint review, résumé v2 and mock interview #1

This session finishes Sprint 1: the team builds core feature #2, shows what works, and plans the next sprint. In
parallel, the career stream starts its final push: résumé v2 this week and your first technical mock interview.

## Core feature #2

Pick the next must-have that other features depend on. For most projects that is the **main resource** of the app:
drives in PlaceTrack, questions in LearnLoop, products in ShopSmart, the document index in DocuMind. Build it as a
vertical slice exactly as in S3, with its acceptance criteria written in the issue.

Watch for two common traps:

- **Hidden coupling.** Two people editing the same file (often `app.js` or a shared layout component) all week. Agree
  who owns shared files, and merge small changes to them early.
- **"Almost done" work.** A branch that has lived for four days without a PR. Push it and open a **draft PR** so others
  can see it and spot problems early.

## The sprint review

At the end of each week, the team shows **working software**, not slides, to the tutor and each other. Keep it to 10
minutes:

1. **Goal**: what the sprint aimed to deliver (read the milestone).
2. **Demo**: each owner shows their merged feature running from `main`, not from a local branch.
3. **Board check**: what moved to Done, what did not, and why.
4. **Next sprint**: which issues move into the Sprint 2 milestone.

Only demo what is merged. "It works on my branch" does not count, because the demo on Demo Day runs from `main`.

## The retrospective

Straight after the review, spend 10 minutes on **how** the team worked. A simple format:

| Start | Stop | Continue |
|---|---|---|
| Opening draft PRs on Day 1 of a task | Pushing straight to `main` | Daily stand-up at 9 pm |
| Writing acceptance criteria in every issue | Reviewing PRs only at midnight | Pairing on blockers |

Pick **one or two** changes and write them in the team notes. A retrospective that lists ten changes changes nothing.

## Re-planning Sprint 2

Compare what you planned with what you delivered. If the team finished 60% of Sprint 1, plan Sprint 2 accordingly, or
move a must-have down to "should" now, with the tutor's agreement. Cutting scope in Week 23 is a sensible decision;
cutting it on Demo Day is a failure.

## Résumé v2

Résumé v1 (Week 15) had your early projects. Version 2 adds Mini Projects 3–5 and the capstone **in progress**.

**Structure (ATS-friendly).** One page, single column, standard fonts, no tables, images or graphics in the text.
Sections in this order:

```text
Contact (phone, email, LinkedIn, GitHub, portfolio)
Education
Skills
Projects
Experience / Internships
Certifications
Achievements
```

**Project bullets** follow one formula: *action verb + what you built + technology + measurable result*.

| Weak | Strong |
|---|---|
| Worked on a placement website. | Built eligibility-aware drive listings for a placement portal (React, Express, PostgreSQL), enforcing CGPA, branch and backlog rules with SQL constraints. |
| Made an ML model. | Trained and compared three classifiers on a 5,000-row synthetic attendance dataset; selected a random forest with 0.84 F1 and explained the top features. |

Numbers must come from your own work and be true: rows in a dataset, tests written, response time measured, features
shipped. **Every claim must be verifiable.** An interviewer will ask about any line on the page.

**For the capstone in progress**, describe what is designed and what is being built, and say "(in progress)". Do not
claim features you have not built yet. You will replace this with the final version in résumé v3 in Week 26.

**Skills section.** List only skills you can answer questions on, grouped: *Languages*, *Web*, *Data*, *Databases*,
*Tools*. Match the wording of the job descriptions you are targeting (for example "REST APIs" or "PostgreSQL", not
vague words such as "backend stuff").

**File.** Export to PDF with a professional name, such as `Firstname_Lastname_Resume.pdf`.

## Mock interview #1: technical (30 minutes)

A typical format: a few minutes on you and your projects, one or two coding problems, then some fundamentals
questions. Your tutor scores you 1–5 on problem solving, coding, technical fundamentals, project explanation,
communication and attitude. The target average by Week 26 is **3.5 or higher**.

### Solving a problem out loud

1. **Clarify.** Repeat the problem in your words. Ask about input size, duplicates, negative numbers, empty input.
2. **Examples.** Work one small example and one edge case on the board.
3. **Brute force first.** State it and its complexity in one or two sentences. This shows you can always get a
   correct answer.
4. **Optimise.** Name the pattern ("this looks like two pointers because the array is sorted") and explain the
   improvement before coding.
5. **Code.** Talk while you type. Use clear variable names.
6. **Test.** Walk through your example line by line, then the edge case. State the final time and space complexity.

Silence is the most common mistake. Interviewers cannot give credit for thinking they cannot hear.

### Explaining your project in two minutes

Practise this until it is natural:

```text
1. Problem: who it is for and what was going wrong (1 sentence)
2. What we built: the main features (2 sentences)
3. Architecture: front end, back end, database, hosting (1 sentence)
4. My part: the feature I owned end to end, and one hard problem I solved
5. Result / what I learned: one concrete outcome or lesson
```

## Lab: core feature #2 and sprint review

1. Merge core feature #2 through a reviewed PR.
2. Run the sprint review and retrospective; record the outcome in `docs/sprint-notes.md`.
3. Move unfinished issues into the Sprint 2 milestone.
4. Upload résumé v2 (PDF) for tutor review and book your mock interview slot.

## Check yourself

1. Why should a sprint review only demo features that are merged to `main`?
2. Rewrite "Did the backend for an inventory app" as a strong résumé bullet.
3. In a mock interview you know a brute-force answer but not the optimal one. What should you do first?
