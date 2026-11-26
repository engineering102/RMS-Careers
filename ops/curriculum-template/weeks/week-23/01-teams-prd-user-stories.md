---
type: notes
title: "W23 · S1 · Capstone Kick-off: Teams, Problem Statement, PRD and User Stories"
slug: w23-s1-capstone-teams-prd-user-stories
topic: Capstone Planning
subject: system-design
minutes: 30
description: Form a capstone team, choose a project that fits your target role, and write a product requirements document with user stories and testable acceptance criteria.
---
# Capstone kick-off: teams, problem statement, PRD and user stories

The capstone is the project you will talk about in almost every interview for the next year. Four weeks is enough to
build something solid, but only if the first two days go into deciding **what** to build and writing it down clearly.

## The capstone rules

| Rule | What it means for you |
|---|---|
| Teams of 2–4 | Solo capstones need the coordinator's approval. |
| Pick from the catalogue, or propose your own | Your own idea needs tutor approval by **Day 2 of this week**. |
| Required ingredients | A database, Git with pull requests, a deployed or demonstrable build, documentation and a live demo. |
| Individual ownership | Every member owns **at least one feature end to end** (UI → API → database). Checked through commits, the board and a viva. |
| Data | Synthetic or anonymised only. Never real student or company personal data. |
| AI assistants | Allowed, but you must be able to explain and change any line of your code in the viva. |

## Choosing a project

The catalogue has twelve options. Each lists must-haves for a team of 2; a team of 3 adds the **+3** feature and a team
of 4 adds **+3** and **+4**, so everyone still owns a feature.

| # | Capstone | Track |
|---|---|---|
| 1 | PlaceTrack: campus placement portal | Full Stack |
| 2 | SkillMatch AI: résumé to job-description matcher | Data & AI |
| 3 | LearnLoop: quiz and assessment platform | Full Stack |
| 4 | Campus Insights: performance analytics and early warning | Data & AI + Databases |
| 5 | ShopSmart: inventory and order management | Full Stack + ERP |
| 6 | DocuMind: RAG document assistant for colleges | Data & AI |
| 7 | Sunrise Electronics: SAP S/4HANA case study | SAP |
| 8 | HealthQueue: clinic appointments and queue | Full Stack |
| 9 | PR Pulse: team repository analytics | Full Stack + Data |
| 10 | CampusRoute: college bus route planner | Full Stack + DSA |
| 11 | MessWise: hostel mess demand forecasting | Data & AI + Full Stack |
| 12 | LedgerLite: books for a small business | Full Stack + ERP/FI |

Match the project to the **target role you recorded in Week 1**:

| Target role | Good options |
|---|---|
| SDE / Full Stack / Backend | 1, 3, 5, 8, 9, 10, 12 |
| Data Analyst / Data Scientist | 4, 11 |
| AI / ML / GenAI | 2, 6, 11 |
| SAP / ERP | 7, or 5 / 12 as a coded alternative |

**Team tips.** Mix strengths (someone comfortable with the front end, someone with SQL, someone who writes well).
Agree on working hours and a chat channel on Day 1. Decide how you will make decisions when you disagree: a quick vote
is better than a two-day argument.

## Step 1: the problem statement

A good problem statement names **who** has the problem, **what** goes wrong today, and **why it matters**. It does not
mention technology.

| Weak | Strong |
|---|---|
| "A React app for placements." | "Placement coordinators track drives and eligibility in spreadsheets, so students miss deadlines and coordinators cannot see which branches are under-applying." |

Template:

```text
<Target users> currently <do the task this way>,
which causes <concrete pain: lost time, errors, missed deadlines>.
Our product lets them <core capability>, so that <measurable outcome>.
```

## Step 2: the product requirements document (PRD)

The PRD is a short Markdown file (`docs/prd.md`) that the whole team, and your tutor, agree on before code is written.
Two to four pages is enough.

```markdown
# PlaceTrack: Product Requirements

## Problem
<problem statement>

## Target users
- Student: applies to drives they are eligible for and tracks status
- Placement coordinator: posts drives, sets eligibility, shortlists

## Goals and non-goals
- Goal: a student can see only the drives they are eligible for
- Non-goal: payroll, offer-letter generation

## Features
| Priority | Feature | Owner |
|---|---|---|
| Must | Role-based login | Asha |
| Must | Drive postings with eligibility (CGPA, branch, backlogs) | Ravi |
| Should | Calendar view of drives | — |

## User stories
<see below>

## Assumptions and risks
- Synthetic student data only
- Risk: email sending may be blocked on the free host; fall back to in-app notifications
```

### Prioritise with MoSCoW

- **Must**: the product is useless without it. Every must-have appears in the live demo.
- **Should**: important, but the demo survives without it.
- **Could**: nice extras (the catalogue's stretch goals).
- **Won't (this time)**: written down so nobody builds it by accident.

Most teams over-commit. If your must-have list would take more than about two and a half weeks of evenings, move
something down.

## Step 3: user stories

A user story describes one capability from the user's point of view:

```text
As a <type of user>, I want <capability> so that <benefit>.
```

Example: *As a student, I want to see only the drives I am eligible for so that I do not waste time on applications
that will be rejected.*

Good stories follow **INVEST**: Independent, Negotiable, Valuable, Estimable, Small and Testable. If a story would take
one person more than about two days, split it.

### Acceptance criteria

Acceptance criteria turn a story into something you can test. The **Given / When / Then** form works well:

```text
Story: eligible drives only
  Given a student with CGPA 7.2, branch ECE and 0 backlogs
  And a drive requiring CGPA ≥ 7.5
  When the student opens the Drives page
  Then that drive is not listed

  Given the same student and a drive requiring CGPA ≥ 7.0 for ECE and CSE
  When the student opens the Drives page
  Then the drive is listed with an "Apply" button
```

Each criterion should be checkable as true or false. "The page should be fast" is not testable; "the drive list loads
in under 2 seconds with 200 drives" is.

These criteria become your **test cases in Week 24** and the checklist for your **demo in Week 26**, so time spent here
pays back three times.

## Lab: PRD draft

In your team's new capstone repository:

1. Write the problem statement and list the target users.
2. List features with MoSCoW priority and an owner for every must-have. Check that each member owns at least one
   must-have end to end.
3. Write at least one user story per must-have, each with two or more Given/When/Then acceptance criteria. Include at
   least one unhappy path (invalid input, no permission, empty state).
4. Commit it as `docs/prd.md` and open a pull request; another team member reviews it.
5. Proposing your own project? Get tutor approval before Day 2 ends.

## Check yourself

1. Rewrite "Build a dashboard with charts" as a user story with one acceptance criterion.
2. Why should a problem statement avoid naming technologies?
3. Your team has seven must-haves and three members. What two things should you check before the design review?
