---
type: resource
title: "W23 · Cheat Sheet: PRD, Design Pack, Team Git Flow and Résumé v2"
slug: w23-cheat-sheet
topic: Week 23 Reference
subject: system-design
minutes: 10
description: One-page reference for Capstone Sprint 1 — PRD and user-story templates, the design-review checklist, HTTP status codes, the team Git workflow, résumé v2 rules and this week's deliverables.
---
# Week 23 cheat sheet

## Capstone rules in one glance

- Teams of 2–4; own idea approved by **Day 2**.
- Database + Git with PRs + deployed/demonstrable build + docs + live demo.
- Every member owns **one feature end to end**. Synthetic data only.

## PRD skeleton (`docs/prd.md`)

```text
Problem · Target users · Goals / non-goals · Features (MoSCoW + owner)
User stories + acceptance criteria · Assumptions and risks
```

```text
As a <user>, I want <capability> so that <benefit>.
Given <context>  When <action>  Then <observable result>
```

## Design review checklist (CAP-M1, 50 marks)

| Criterion | Marks | Must show |
|---|---|---|
| Problem and requirements | 10 | Clear problem, users, stories with acceptance criteria |
| Data design | 15 | Normalised ER diagram (or justified document model) covering every must-have |
| Architecture and API contract | 15 | Component diagram; endpoints with methods, payloads, status codes |
| Planning | 10 | Board with issues, owners and realistic milestones |

**No ER diagram or no API contract = not approved.**

## HTTP status codes

| Code | Use |
|---|---|
| 200 / 201 / 204 | OK / Created / deleted, no body |
| 400 | validation failed |
| 401 | not logged in |
| 403 | logged in, not allowed |
| 404 | not found |
| 409 | conflict (duplicate) |
| 500 | unexpected server error |

## Team Git flow

```bash
git switch main && git pull
git switch -c feat/12-short-name
git add . && git commit -m "Add eligibility filter to drive list"
git push -u origin feat/12-short-name     # open PR, write "Closes #12"
```

- `main` protected: PR + 1 approval + green CI.
- Small PRs (one issue). Open a **draft PR** early.
- **Done** = merged via reviewed PR + CI green + acceptance criteria pass + card in Done.

## Stand-up (10 min)

Done since last time · Doing next · Blocked by. No problem-solving in the stand-up.

## Résumé v2

- One page, single column, no tables or images; PDF named `Firstname_Lastname_Resume.pdf`.
- Order: contact → education → skills → projects → experience → certifications → achievements.
- Bullet = **action verb + what + technology + measurable result**. Every claim true and verifiable.
- Capstone listed as "(in progress)".

## Interview problem routine

Clarify → examples → brute force + complexity → optimise (name the pattern) → code aloud → test → state complexity.

## This week

| Item | Details |
|---|---|
| **Deliverable** | CAP-M1 · Capstone Design Review: approved PRD, design pack (ER diagram, architecture, API contract, wireframes) and a GitHub board with every capstone issue |
| **Practice quiz** | Capstone Sprint 1: Discover, Plan & Design (untimed, retakes allowed) |
| **Weekly assessment** | The CAP-M1 design review replaces the weekly test this week |
| **DSA** | Set A: Summary Ranges, First Occurrence in a String, Integer to Roman, Zigzag Conversion, H-Index, Set Matrix Zeroes, Trapping Rain Water; 90-minute timed contest; LeetCode 150 sheet (optional) |
| **Career task** | Résumé v2 (adds Mini Projects 3–5 and the capstone in progress); Mock Interview #1 (technical, 30 minutes) |
