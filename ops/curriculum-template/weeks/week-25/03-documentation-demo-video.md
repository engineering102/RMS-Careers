---
type: notes
title: "W25 · S3 · Documentation: README, Architecture, API Docs, User Guide and Demo Video"
slug: w25-s3-documentation-demo-video
topic: Project Documentation
subject: system-design
minutes: 30
description: Write the documentation a reviewer and a recruiter actually read — a complete README, an up-to-date architecture diagram, API reference and user guide — and record a clear 3-minute demo video.
---
# Documentation: README, architecture, API docs, user guide and demo video

Recruiters often look at a GitHub repository for less than a minute. In that minute they read the top of the README,
look for a live link and maybe watch the first seconds of a video. Your documentation decides whether they look
further.

## The README (project documentation checklist)

Every capstone README covers these items, in roughly this order:

```markdown
# PlaceTrack
Eligibility-aware campus placement portal for students and placement coordinators.

**Live:** https://placetrack-demo.example.app · **Demo video:** <link> · ![CI](badge-url)

## Problem
Coordinators track drives in spreadsheets; students miss deadlines and apply to drives they are not eligible for.

## Key features
- Role-based login (student, coordinator)
- Drives with CGPA / branch / backlog eligibility
- Eligibility-aware apply flow with status tracking
- Coordinator dashboard and CSV export

## Screenshots
<2–4 screenshots or a short GIF>

## Tech stack and architecture
React (Vite) · Express · PostgreSQL · JWT · Chart.js — see docs/architecture.png

## Getting started
### Prerequisites
Node.js 20+, PostgreSQL 15+ (or a hosted database)
### Setup
git clone … && cd placetrack
cp server/.env.example server/.env   # fill in values
npm ci --prefix server && npm ci --prefix client
npm run migrate --prefix server && npm run seed --prefix server
npm run dev --prefix server  &  npm run dev --prefix client

## Demo accounts
coordinator@example.com / student1@example.com (demo-only password in the submission notes)

## Folder structure
client/ · server/ · docs/ · .github/workflows/

## API reference
See docs/api.md

## Team and contributions
| Member | Owned features |
|---|---|
| Asha | Auth and roles, CSV export |
| Ravi | Drives and eligibility rules |

## Future scope
Email notifications, interview slot booking
```

Tips:

- The **first three lines** matter most: name, one-line description, live and video links.
- **Setup instructions must actually work.** Ask a teammate to follow them on a fresh clone. Most broken READMEs
  forget an environment variable or a migration step.
- Keep the **team and contributions** table honest; it is cross-checked against commit history in the viva.
- **Future scope** is where post-freeze ideas go.

## The architecture diagram, updated

Compare your Week 23 `architecture.png` with what you actually built. Update it: real hosts, real services, any
component you added (a background job, a cache, an embeddings store). A diagram that does not match the code costs
marks in the final evaluation ("design matches implementation").

Draw it with any diagram tool, export a PNG into `docs/`, and keep the source file next to it so it can be edited.

## API documentation (`docs/api.md`)

Turn the API contract into reference documentation that matches the final code. For each endpoint:

````markdown
### POST /api/drives/:id/applications
Apply to a drive as the logged-in student.

**Auth:** student token (`Authorization: Bearer <token>`)

**Response 201**
```json
{ "id": 57, "driveId": 3, "status": "applied", "appliedAt": "2026-03-04T10:15:00Z" }
```

**Errors**
| Status | When |
|---|---|
| 401 | missing or invalid token |
| 403 | student does not meet the drive's eligibility rules |
| 404 | drive does not exist |
| 409 | student has already applied |
````

Check each documented example against the running API. If the code and the doc disagree, decide which is right and
fix the other.

Data and AI projects document their **pipeline** instead: data sources (synthetic), cleaning steps, features, the
model and its metrics, the evaluation set for a RAG app, and known limitations.

## The user guide (`docs/user-guide.md`)

A short, task-based guide for each role, written for a non-technical user:

```text
For coordinators
1. Create a drive: Drives → New drive → fill company, eligibility, deadline → Save.
2. Shortlist students: open the drive → Applications → tick students → Shortlist.
3. Export: Applications → Export CSV.
```

Add one screenshot per task where it helps. Write the steps in the order a user does them, using the exact button
labels from your UI.

## The 3-minute demo video

The demo video is often the only thing a busy reviewer watches. Three minutes is short, so plan every second.

| Time | Content |
|---|---|
| 0:00–0:20 | Problem in one or two sentences, and who it is for |
| 0:20–2:20 | The main journey, live in the app: the most important must-have features in the order a user meets them |
| 2:20–2:45 | Architecture in one sentence over the diagram; one interesting technical decision |
| 2:45–3:00 | Live URL, repository, team names |

Recording tips:

- Write a **script** and rehearse it twice. Do not improvise.
- Use the **live deployed app** with seeded demo data, not localhost.
- Record at a normal browser zoom with a clean window: close unrelated tabs and notifications, hide bookmarks.
- Speak clearly and a little slower than normal; use a headset or a quiet room. A free screen recorder such as OBS
  Studio is enough.
- Show results, not typing: pre-fill long forms or speed them up in editing.
- Upload as **unlisted** (or as your programme requires) and put the link at the top of the README.

## Lab: docs complete

1. Complete the README using the checklist; have a teammate follow the setup steps on a fresh clone.
2. Update `docs/architecture.png` to match the final system.
3. Write `docs/api.md` (or the pipeline document) and `docs/user-guide.md`.
4. Script, record and upload the 3-minute demo video; link it in the README.
5. Pin the capstone repository on every member's GitHub profile.

## Check yourself

1. A recruiter opens your repository. What should they see in the first three lines of the README?
2. Why should the architecture diagram be updated at the end of the project, not just drawn at the start?
3. Your demo video runs 5 minutes. Which parts would you cut first, and why?
