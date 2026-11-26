---
type: notes
title: "W15 · S3 · Mini Project 3 Build Sprint: Planning and Building a Full Stack App as a Team"
slug: w15-s3-mp3-build-sprint
topic: Mini Project 3
subject: web-development
minutes: 35
description: How to run the MP3 team sprint — choosing a project, designing the data model, roles and API before coding, splitting work into issues on a GitHub Projects board, a branch-and-PR workflow, and a definition of done.
---
# Mini Project 3 build sprint

Mini Project 3 brings Phase 3 together: a deployed full stack app with authentication, roles and CRUD, built by a
pair or trio. You already have every piece from the Campus Marketplace weekly builds. This session is about building
it **as a team**, quickly, without merge chaos. Read the MP3 brief in this week's items for the exact requirements
and rubric.

## Pick one project

| Option | Roles | Main resource | Interesting rule |
|---|---|---|---|
| **Job Board** | recruiter, student | jobs, applications | A student can apply to a job **once**; the recruiter updates applicant status |
| **Event Registration** | organiser, student | events, registrations | Capacity: when full, new registrations go to a **waitlist**; attendee CSV export |
| **Hostel Complaint Tracker** | student, warden | complaints, status history | Every status change is recorded, so the history is visible |

Choose the one your team can explain best, not the one that sounds most impressive. Every member must be able to
explain any line in the demo and viva.

## Design before you code (first 60–90 minutes)

### 1. User stories

Write 6–10 stories in the form **As a ⟨role⟩, I want ⟨action⟩ so that ⟨benefit⟩**. For the Job Board:

- As a recruiter, I want to post a job with title, location, description and deadline, so that students can find it.
- As a student, I want to filter jobs by location and keyword, so that I only see relevant ones.
- As a student, I want to apply once to a job, so that the recruiter sees my application.
- As a recruiter, I want to move an applicant to shortlisted or rejected, so that students see their status.

### 2. Data model

Sketch the tables and relationships; this becomes `001_init.sql`.

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('recruiter', 'student'))
);

CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  recruiter_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(150) NOT NULL,
  location VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  deadline DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'applied'
    CHECK (status IN ('applied', 'shortlisted', 'rejected', 'selected')),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, student_id)          -- "apply once" enforced by the database
);
```

Push rules into the database where you can: the `UNIQUE (job_id, student_id)` constraint makes "apply once" true even
if two requests arrive at the same moment, and the API maps the resulting `23505` error to **409 Conflict**. The other
two options have similar anchors: a capacity check inside a transaction for events, and an insert into a
`complaint_status_history` table in the same transaction as each status update.

### 3. API contract

Agree on endpoints **before** splitting work, so the front-end and back-end owners can work in parallel.

| Method + path | Who | Returns |
|---|---|---|
| `POST /api/v1/auth/signup`, `/login`; `GET /me` | anyone / logged in | user, token |
| `GET /api/v1/jobs?q=&location=&page=` | anyone | paginated list |
| `GET /api/v1/jobs/:id` | anyone | one job |
| `POST /api/v1/jobs` | recruiter | 201 + job |
| `PATCH` / `DELETE /api/v1/jobs/:id` | the recruiter who owns it | 200 / 204 |
| `POST /api/v1/jobs/:id/applications` | student | 201, or 409 if already applied |
| `GET /api/v1/jobs/:id/applications` | the job's recruiter | list of applicants |
| `PATCH /api/v1/applications/:id` | the job's recruiter | updated status |
| `GET /api/v1/me/applications` | student | my applications and statuses |

Write it in `docs/api.md`; it later becomes the API reference section of your README.

### 4. Roles are checked on the server

Hiding the "Post a job" button from students is good UX, but the rubric checks that a student calling
`POST /api/v1/jobs` directly gets **403**. Use `requireAuth` plus `requireRole('recruiter')` on the route, and
ownership checks in the service, as in Week 14.

## Split the work into issues

Create a **GitHub Projects** board with columns *Todo*, *In progress*, *In review*, *Done*. Turn each story into one
or more issues small enough to finish in half a day.

| Issue | Owner | Touches |
|---|---|---|
| DB migration + seed with fake users and jobs | Member A | server |
| Auth routes + middleware (reuse Week 14) | Member A | server |
| Jobs CRUD API with validation and role checks | Member B | server |
| Applications API (apply once, status update) | Member B | server |
| Login/signup pages + AuthProvider (reuse Week 15 S1) | Member C | client |
| Job list with filters, pagination, empty state | Member C | client |
| Recruiter dashboard: my jobs, applicants, status dropdown | Member A | client |
| CI workflow + deployment + README | everyone | repo |

Vertical slices (one member owns a feature through UI, API and database) also work well, and give each person a
complete story to tell in the viva. In a pair, split by feature rather than front end versus back end so both
partners can explain the whole stack.

## Branches and pull requests

```bash
git switch main
git pull
git switch -c feat/job-filters          # one branch per issue
# ...commit small steps...
git push -u origin feat/job-filters     # then open a PR that says "Closes #12"
```

- Nobody commits directly to `main`; protect it and require CI to pass (Session 2).
- Every PR is reviewed by a teammate before merging. Keep PRs small: under about 300 changed lines is easy to review.
- Pull `main` into your branch often (`git pull origin main`) so conflicts stay small.
- If two people must edit the same file (for example `App.jsx` routes), agree who goes first and merge that PR before
  the second one starts.

A PR description that reviewers love:

```markdown
## What
Adds keyword and location filters to the job list. Closes #12.

## How to test
1. Run server and client.
2. Search "intern" → only matching jobs. Choose "Pune" → list narrows. Clear → all jobs.

## Screenshots
(before/after)
```

## A sprint plan

| When | Goal |
|---|---|
| Day 1 | Stories, data model, API contract, board, repo with `client/` and `server/` skeletons, CI running |
| Day 2 | Auth end to end; main resource CRUD API with validation; list and details pages on real data |
| Day 3 | Second resource (applications, registrations or status history); role-specific screens; deploy a first version |
| Day 4 | Loading, error and empty states; README, screenshots and demo video; fix bugs found while testing the live URL |

Deploy **early** (Day 3 at the latest). Deployment problems found an hour before the deadline are the most common
reason a team misses the "public URL works" requirement.

## Definition of done (for every feature)

- [ ] Works on the deployed site, not only on localhost
- [ ] Input validated on the server (and on the client for good UX)
- [ ] Role and ownership checked on the server
- [ ] Loading, error and empty states handled
- [ ] At least one test where it makes sense; CI green
- [ ] Reviewed and merged through a PR linked to its issue
- [ ] No secrets committed; new env variables added to `.env.example`

## Lab: team sprint with a GitHub Projects board

1. Form your team, pick the option and write the user stories in `docs/stories.md`.
2. Write the migration, the API contract (`docs/api.md`) and a rough component tree for the main pages.
3. Create the Projects board and at least 12 issues, each with an owner.
4. Set up the repository: `client/`, `server/`, `.gitignore`, `.env.example` files, `ci.yml`, branch protection.
5. Build the first two vertical slices (auth plus the main resource list) through reviewed PRs.
6. End the session with a deployed first version, however small.

## Check yourself

1. Why is the "apply once" rule better enforced with a `UNIQUE` constraint than only with a check in JavaScript?
2. Your teammate hides the delete button for students and says the role check is done. What request would you send in
   Thunder Client to prove it is not?
3. Why should the API contract be agreed before the front-end and back-end owners start coding?
