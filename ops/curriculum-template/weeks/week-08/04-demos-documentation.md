---
type: notes
title: "W8 · S4 · Project Demos, Documentation Standards and STAR Descriptions"
slug: w08-s4-demos-documentation-star
topic: Demos & Documentation
subject: career
minutes: 35
description: How to run a five-minute project demo and handle the viva, the README structure every project repository must follow, setup steps and diagrams that work for a stranger, and turning Mini Projects 1 and 2 into STAR descriptions for your resume.
---
# Project demos, documentation standards and STAR descriptions

A project that works on your laptop but cannot be understood or run by anyone else is worth very little to a recruiter.
This session is about the last 20% of the work: showing it, documenting it and describing it.

## The five-minute demo

Every pair demos Mini Project 2 in five minutes, followed by questions. Use this structure:

| Minute | Content |
|---|---|
| 0:00–0:30 | The problem in one sentence and who would use the system |
| 0:30–1:30 | The ER diagram: the main entities, one M:N relationship, one design decision you argued about |
| 1:30–3:00 | Live: run two or three of your most interesting queries and the Python report for one department |
| 3:00–4:00 | One index with its before-and-after `EXPLAIN ANALYZE`, and one MongoDB pipeline |
| 4:00–5:00 | What you would do next, and what each partner built |

Demo habits:

- **Rehearse once with a timer.** Five minutes goes fast.
- Have the database **already seeded** and the queries ready in a file; do not type long SQL live.
- Increase the terminal font size so the back row can read it.
- If something fails, say what you expected, move on, and come back if there is time. Do not debug in front of the room.

### The viva

Both partners must be able to explain any line. Expect questions like:

- "Why is this table in 3NF? Show me a dependency that would break it."
- "What happens if I run this `DELETE` on a department?"
- "Why did you index this column and not that one?"
- "How does `report.py` prevent SQL injection?"
- "Why did you embed drives inside companies in MongoDB?"

If you do not know, say so and reason aloud: "I'm not sure, but I think it would fail because the foreign key…". That
is far better than guessing confidently.

### Code review and peer feedback

After the demos you review another pair's repository. Good review comments are **specific** and **kind**:

| Weak | Useful |
|---|---|
| "Schema is bad." | "`offers` has no `UNIQUE (application_id)`, so one application can get two offers." |
| "Nice work." | "The `placed` CTE with `DISTINCT` is a clean way to avoid double-counting." |
| "Add comments." | "Query 14 has no comment, so I could not tell which question it answers." |

Fix the review comments you receive the same week, each as its own commit.

## Documentation standards: the README

Every project repository in the programme follows the same checklist. A README is for a **stranger**: a recruiter,
a tutor or you in six months.

| Section | What it contains |
|---|---|
| Title and one-line description | What it is, in one sentence |
| Problem statement and key features | Why it exists; a short feature list |
| Technology stack and architecture diagram | PostgreSQL, Python, MongoDB; a diagram of how the parts connect |
| Setup instructions | Prerequisites, install, environment variables via `.env.example`, run steps |
| Screenshots or GIF, live URL, demo video link | Proof that it works (for MP2: terminal screenshots of the report and query output) |
| Folder structure and API reference | What lives where |
| Team members and contributions; future scope | Who built which part; what you would add next |

### Setup steps that actually work

Write the steps, then follow them yourself on a **fresh clone** in a new folder. Every step you had to improvise is
missing from the README.

```bash
git clone https://github.com/<you>/campus-placement-db.git
cd campus-placement-db
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env            # macOS/Linux: cp .env.example .env, then edit DATABASE_URL
createdb -U postgres placement
psql -U postgres -d placement -f schema.sql
python seed.py
psql -U postgres -d placement -f queries.sql
python report.py
```

`.env.example` contains the variable **names** with placeholder values, for example
`DATABASE_URL=postgresql://postgres:<password>@localhost:5432/placement`. The real `.env` is in `.gitignore`.

### Diagrams

- Export the ER diagram as PNG into the repository (for example `docs/er-diagram.png`) and link it from the README with
  a relative path. Keep the editable source (`.drawio` file or the dbdiagram.io text) next to it.
- An architecture diagram for MP2 can be simple: `seed.py → PostgreSQL ← report.py`, plus the `mongo/` scripts.
- Label every box and arrow. A diagram nobody can read is decoration.

### A suggested folder structure

```text
campus-placement-db/
├── README.md
├── .env.example
├── requirements.txt
├── schema.sql
├── seed.py
├── queries.sql
├── report.py
├── design-notes.md
├── docs/
│   ├── er-diagram.png
│   └── er-diagram.drawio
└── mongo/
    ├── load.js
    └── pipelines.js
```

## STAR descriptions for your resume

Interviewers ask "Tell me about a project you built." The **STAR** format keeps the answer focused:

| Letter | Meaning | Question it answers |
|---|---|---|
| **S** – Situation | The context | What was the problem or setting? |
| **T** – Task | Your responsibility | What were you specifically asked or trying to do? |
| **A** – Action | What **you** did | Which decisions, technologies and techniques? |
| **R** – Result | The outcome | What works now, and how do you know? Use real, measured facts only |

Example for MP2 (adapt it to what **you** actually built; never claim work you did not do):

> **Situation:** College placement data is usually tracked in spreadsheets, which makes eligibility checks and
> department-wise reports slow and error-prone.
> **Task:** In a pair, design and build a database that models students, companies, drives, eligibility rules,
> applications, interview rounds and offers, and produces placement reports.
> **Action:** I designed the ER model and a 3NF PostgreSQL schema with constraints for eligibility and one application per
> drive, wrote 10 of our 20 analytical queries including window-function rankings and a month-wise CTE trend, and
> added two indexes justified with EXPLAIN ANALYZE.
> **Result:** The database loads 1,000+ synthetic applications from a Faker script, answers every report in the brief,
> and a parameterised Python CLI prints a department report. Repository: github.com/your-username/campus-placement-db.

Resume version (one or two lines):

> Campus Placement Database (PostgreSQL, Python, MongoDB): designed a 3NF schema for drives, eligibility and offers;
> wrote 20 analytical SQL queries (CTEs, window functions) and a parameterised Python report CLI.

Rules: start bullets with a verb, name the technologies, give only numbers you can prove from your repository, and be
ready to go deeper on every word you write.

## Lab

1. Improve your MP2 README against the checklist above; tick each section in a pull request description.
2. Do a fresh-clone test of your setup steps and fix anything missing.
3. Review another pair's repository and leave three specific comments as GitHub issues or PR comments.
4. Write STAR descriptions for **Mini Project 1 and Mini Project 2** and save them in your career notes; you will reuse
   them for your resume and LinkedIn.

## Check yourself

1. Who is a README written for, and how do you test that your setup steps are complete?
2. What goes in `.env.example`, and what must never go in it?
3. In a STAR description, what belongs in "Action", and why should it say "I" rather than "we"?
