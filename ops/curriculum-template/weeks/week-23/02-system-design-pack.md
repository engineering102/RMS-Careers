---
type: notes
title: "W23 · S2 · Capstone Design Pack: Architecture, ER Diagram, API Contract and Board"
slug: w23-s2-capstone-design-pack
topic: Capstone Architecture
subject: system-design
minutes: 35
description: Produce the design pack the tutor reviews: an architecture diagram, a normalised ER diagram, an API contract with status codes, wireframes, and a GitHub Projects board with owners and milestones.
---
# Capstone design pack: architecture, ER diagram, API contract and board

Most capstone failures trace back to a skipped design step: two people build the same table differently, the front end
expects a field the API never returns, or nobody knows who owns login. The design pack prevents that. Your tutor will
**not approve a design without an ER diagram and an API contract**.

## What goes in `docs/`

| File | Contents | Design Review marks |
|---|---|---|
| `prd.md` | Problem, users, prioritised features, stories with acceptance criteria (S1) | Problem and requirements · 10 |
| `er-diagram.png` | Tables, keys, relationships (or a justified document model) | Data design · 15 |
| `architecture.png` | Components and how they talk | Architecture and API contract · 15 |
| `api-contract.md` | Every endpoint: method, path, request, response, status codes | (same 15) |
| `wireframes/` | Main screens, Figma or photographed paper | supports the above |
| GitHub Projects board | Every must-have as an issue with owner and milestone | Planning · 10 |

## 1. Architecture diagram

Show the **boxes** (components) and the **arrows** (how they communicate). Label each arrow with the protocol or data.

```text
┌─────────────┐   HTTPS / JSON    ┌────────────────┐    SQL     ┌──────────────┐
│ React SPA   │ ───────────────▶  │ Express API    │ ────────▶  │ PostgreSQL   │
│ (Vercel)    │ ◀───────────────  │ (Render)       │ ◀────────  │ (Neon)       │
└─────────────┘                   └──────┬─────────┘            └──────────────┘
                                         │ HTTPS
                                         ▼
                                  ┌──────────────┐
                                  │ Email / LLM  │  (external service, key on server only)
                                  └──────────────┘
```

Include: where each part is hosted, where authentication is checked (on the API, not only in the UI), and where
secrets live (server environment variables, never the browser). A data-track project might instead show
`CSV → ETL script → PostgreSQL → model → Streamlit`.

## 2. ER diagram

List the **entities** (nouns from your user stories), their **attributes**, and the **relationships** with
cardinality. Normalise to 3NF unless you can justify otherwise (Week 7).

PlaceTrack example:

```text
users (id PK, email UNIQUE, password_hash, role)
students (id PK, user_id FK→users UNIQUE, branch, cgpa, backlogs)
companies (id PK, name)
drives (id PK, company_id FK→companies, title, min_cgpa, max_backlogs, deadline)
drive_branches (drive_id FK→drives, branch, PK(drive_id, branch))
applications (id PK, drive_id FK→drives, student_id FK→students, status, applied_at,
              UNIQUE(drive_id, student_id))

companies 1 ──< drives 1 ──< applications >── 1 students
drives 1 ──< drive_branches
```

Write the core tables as SQL early; it forces decisions the drawing hides:

```sql
CREATE TABLE applications (
  id          SERIAL PRIMARY KEY,
  drive_id    INT NOT NULL REFERENCES drives(id) ON DELETE CASCADE,
  student_id  INT NOT NULL REFERENCES students(id),
  status      TEXT NOT NULL DEFAULT 'applied'
              CHECK (status IN ('applied', 'shortlisted', 'rejected', 'selected')),
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (drive_id, student_id)
);
```

The `UNIQUE (drive_id, student_id)` constraint enforces "apply once" in the database, so a double-click cannot create a
duplicate. Look for rules like this in your acceptance criteria and push them into constraints.

**Document databases (MongoDB):** draw the collections and say which data is embedded and which is referenced, with
one sentence of justification (for example, "questions are embedded in a quiz because they are always read together").

**Checklist:** every must-have feature has somewhere to store its data; every foreign key has a matching primary key;
no repeated groups (comma-separated lists in one column); a `role` column or table if you have role-based access.

## 3. API contract

The contract is the agreement between the front end and the back end. Once it is written, the two halves can be built
in parallel.

| Method | Path | Auth | Request body | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/auth/login` | none | `{ email, password }` | 200 `{ token, user }` | 400 invalid body, 401 wrong credentials |
| GET | `/api/drives` | student | — | 200 `[ { id, company, title, deadline } ]` (eligible only) | 401 |
| POST | `/api/drives` | coordinator | `{ companyId, title, minCgpa, branches[], deadline }` | 201 `{ id, ... }` | 400, 401, 403 |
| POST | `/api/drives/:id/applications` | student | — | 201 `{ id, status }` | 403 not eligible, 404 no drive, 409 already applied |
| GET | `/api/drives/:id/applications.csv` | coordinator | — | 200 CSV file | 401, 403, 404 |

Status codes to use consistently:

| Code | Meaning | Use when |
|---|---|---|
| 200 | OK | a read or update succeeded |
| 201 | Created | a new resource was created |
| 204 | No Content | a delete succeeded with no body |
| 400 | Bad Request | validation failed |
| 401 | Unauthorized | not logged in, or the token is invalid |
| 403 | Forbidden | logged in, but not allowed |
| 404 | Not Found | the resource does not exist |
| 409 | Conflict | a uniqueness rule would be broken |
| 500 | Internal Server Error | an unexpected bug; never send stack traces to the client |

Also agree on **one error shape** for every endpoint, for example `{ "error": "Already applied to this drive" }`, so the
front end can show messages in one way.

## 4. Wireframes

Sketch each main screen: what is on it, what the user clicks, where they go next. Paper photos are acceptable. Include
the **empty state** ("No drives yet") and an **error state**; these are often forgotten until the demo.

## 5. The GitHub Projects board

Turn the PRD into work you can track:

1. Create a project board with columns **Todo → In progress → In review → Done**.
2. Create one **issue per user story** (or per slice of a story). Write the acceptance criteria in the issue body.
3. Assign an **owner** to every issue and add labels (`frontend`, `backend`, `db`, `bug`).
4. Create **milestones** that match the sprints: *Sprint 1 (Week 23)*, *Sprint 2 (Week 24)*, *Sprint 3 (Week 25)*.
5. Link pull requests to issues by writing `Closes #12` in the PR description, so issues close when the PR merges.

A realistic plan puts login, the database schema and one core feature into Sprint 1, all must-haves by the end of
Sprint 2, and only polish, deployment and documentation in Sprint 3.

## Lab: design review with your tutor

Bring the full pack to a 10-minute review. Expect questions like:

- "Walk me through what happens, table by table, when a student applies."
- "Which endpoint does this screen call, and what does it show on a 403?"
- "Who owns this feature end to end?"
- "Which of these must-haves is riskiest, and what is your fallback?"

Fix what the review finds, commit the changes and submit **CAP-M1 · Capstone Design Review**.

## Check yourself

1. A logged-in student calls a coordinator-only endpoint. Which status code should the API return, 401 or 403? Why?
2. Name one business rule from your own PRD that you can enforce with a database constraint.
3. Why should the API contract be written before the front end and back end are built?
