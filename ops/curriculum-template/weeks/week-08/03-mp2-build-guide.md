---
type: notes
title: "W8 · S3 · Mini Project 2 Build: Campus Placement Database"
slug: w08-s3-mp2-campus-placement-build
topic: Mini Project 2
subject: core-cs
minutes: 50
description: A step-by-step build guide for Mini Project 2 — modelling the placement domain, a 3NF PostgreSQL schema, synthetic seed data with Faker, analytical queries, indexes with EXPLAIN ANALYZE, a parameterised Python report and the MongoDB part.
---
# Mini Project 2 build: Campus Placement Database

Mini Project 2 brings the whole phase together: ER design (Week 7), normalised DDL (Weeks 5 and 7), analytical SQL
(Week 6), indexing and safe Python access (Week 7) and MongoDB (this week). You build it in pairs. The full brief and
rubric are in the **MP2 · Campus Placement Database** project item; these notes show how to get there in one focused
session plus self-study.

## Plan the session

| Time | Pair activity | Output |
|---|---|---|
| 0:00–0:20 | Requirements and ER diagram | `er-diagram.png` draft |
| 0:20–0:50 | `schema.sql` | Runs cleanly twice on an empty database |
| 0:50–1:00 | **Midpoint checkpoint** with your tutor | Schema reviewed before any data exists |
| 1:00–1:40 | `seed.py` | Row counts meet the brief |
| 1:40–2:00 | First 5 queries | Proof the schema answers real questions |
| Self-study | Remaining queries, indexes, `report.py`, MongoDB, README | Ready for the S4 demo |

Split the work so **both** partners write SQL and Python, and both commit through branches and pull requests. Each of
you must be able to explain every line in the viva.

## Step 1: the domain

Read the brief's entity list and write the rules in plain sentences before drawing anything:

- A **department** has many **students**; a student belongs to one department.
- A **company** runs many **job drives**; each drive has a role, a package (LPA) and a date.
- A drive has **eligibility rules**: minimum CGPA, maximum backlogs, and a list of **allowed branches**.
- A student **applies** to a drive at most once; an application has a status.
- An application goes through numbered **interview rounds**, each with a type and a result.
- A successful application leads to at most one **offer**.

Now mark cardinalities: drive–branch is **M : N** (one drive allows several branches, one branch is allowed in many
drives), student–drive through applications is **M : N** with attributes, and interview round is a **weak entity** of
an application (round 2 of *which* application?).

## Step 2: schema.sql in 3NF

A starting point for the first six tables:

```sql
CREATE TABLE departments (
    dept_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code     VARCHAR(10)  NOT NULL UNIQUE,
    name     VARCHAR(100) NOT NULL
);

CREATE TABLE students (
    student_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    roll_no     VARCHAR(12)  NOT NULL UNIQUE,
    full_name   VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    dept_id     INT          NOT NULL REFERENCES departments (dept_id),
    cgpa        NUMERIC(4,2) NOT NULL CHECK (cgpa BETWEEN 0 AND 10),
    backlogs    SMALLINT     NOT NULL DEFAULT 0 CHECK (backlogs >= 0),
    grad_year   SMALLINT     NOT NULL
);

CREATE TABLE companies (
    company_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    sector      VARCHAR(50)
);

CREATE TABLE drives (
    drive_id      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id    INT          NOT NULL REFERENCES companies (company_id),
    role_title    VARCHAR(100) NOT NULL,
    package_lpa   NUMERIC(5,2) NOT NULL CHECK (package_lpa > 0),
    drive_date    DATE         NOT NULL,
    min_cgpa      NUMERIC(4,2) NOT NULL DEFAULT 0,
    max_backlogs  SMALLINT     NOT NULL DEFAULT 0
);

-- Eligibility rule "allowed branches": many-to-many between drives and departments
CREATE TABLE drive_branches (
    drive_id  INT REFERENCES drives (drive_id) ON DELETE CASCADE,
    dept_id   INT REFERENCES departments (dept_id),
    PRIMARY KEY (drive_id, dept_id)
);

CREATE TABLE applications (
    application_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    drive_id        INT  NOT NULL REFERENCES drives (drive_id),
    student_id      INT  NOT NULL REFERENCES students (student_id),
    applied_on      DATE NOT NULL,
    status          VARCHAR(12) NOT NULL DEFAULT 'applied'
                    CHECK (status IN ('applied', 'shortlisted', 'rejected', 'offered')),
    UNIQUE (drive_id, student_id)
);
```

You design the last two yourselves:

- `interview_rounds`: a weak entity. Its primary key combines the application with a round number. Add a `CHECK` on the
  allowed round types and results.
- `offers`: one per application at most (which constraint enforces that?), with the offered package and date, and
  whether the student accepted.

In `design-notes.md`, list the functional dependencies of each table, state why it is in 3NF, and justify any
deliberate denormalisation. A common question: should `offers` repeat `package_lpa` when `drives` already has it? (It
can be a legitimate **snapshot**, the way `unit_price` was in Week 6, if the offered package may differ from the
advertised one. Write down your decision.)

## Step 3: seed.py with Faker

Generate synthetic data; never use real student details. Install the libraries in your virtual environment with
`pip install faker "psycopg[binary]"`.

```python
import os
import random

import psycopg
from faker import Faker

Faker.seed(42)
random.seed(42)          # same data on every run, so your query results are reproducible
fake = Faker("en_IN")

DEPARTMENTS = [
    ("CSE", "Computer Science and Engineering"),
    ("ECE", "Electronics and Communication Engineering"),
    ("EEE", "Electrical and Electronics Engineering"),
    ("MECH", "Mechanical Engineering"),
    ("CIVIL", "Civil Engineering"),
]

with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
    with conn.cursor() as cur:
        cur.executemany("INSERT INTO departments (code, name) VALUES (%s, %s)", DEPARTMENTS)
        cur.execute("SELECT dept_id FROM departments")
        dept_ids = [row[0] for row in cur.fetchall()]

        students = []
        for i in range(1, 251):
            students.append((
                f"23RMS{i:04d}",
                fake.name(),
                f"student{i:04d}@example.com",            # unique and clearly synthetic
                random.choice(dept_ids),
                round(random.uniform(5.5, 9.8), 2),
                random.choices([0, 1, 2, 3], weights=[70, 15, 10, 5])[0],
                2027,
            ))
        cur.executemany(
            "INSERT INTO students (roll_no, full_name, email, dept_id, cgpa, backlogs, grad_year) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            students,
        )
        # Next: companies with fake.unique.company(), drives with random dates and packages,
        # drive_branches with random.sample(dept_ids, k), then applications.
```

Tips for the rest:

- Use `random.sample(student_ids, k)` per drive so a student never applies twice to the same drive (your `UNIQUE`
  constraint will reject it anyway, which is the point of having it).
- Make the data **realistic enough to be interesting**: only eligible students should usually apply, packages should
  vary by role, and not every student should be placed. Otherwise your analytical queries all return boring answers.
- Print the final row counts so you can prove you met the brief (200+ students, 25+ companies, 40+ drives, 1,000+
  applications).

## Step 4: analytical queries

Two of the required queries, to show the style. Each query in `queries.sql` gets a comment stating the question.

```sql
-- Placement percentage per department (a student counts as placed with at least one offer)
WITH placed AS (
    SELECT DISTINCT a.student_id
    FROM applications a
    JOIN offers o ON o.application_id = a.application_id
)
SELECT d.code,
       COUNT(*)            AS students,
       COUNT(p.student_id) AS placed,
       ROUND(100.0 * COUNT(p.student_id) / COUNT(*), 1) AS placement_pct
FROM students s
JOIN departments d ON d.dept_id = s.dept_id
LEFT JOIN placed p  ON p.student_id = s.student_id
GROUP BY d.code
ORDER BY placement_pct DESC;

-- Students who are eligible for drive 1 but have not applied
SELECT s.roll_no, s.full_name, s.cgpa
FROM drives dr
JOIN drive_branches db ON db.drive_id = dr.drive_id
JOIN students s        ON s.dept_id = db.dept_id
                      AND s.cgpa >= dr.min_cgpa
                      AND s.backlogs <= dr.max_backlogs
WHERE dr.drive_id = 1
  AND NOT EXISTS (
      SELECT 1 FROM applications a
      WHERE a.drive_id = dr.drive_id AND a.student_id = s.student_id
  )
ORDER BY s.cgpa DESC;
```

The `placed` CTE uses `DISTINCT` because a student with two offers must still count once. Without it, placement could
exceed 100%.

For the rest of the list in the brief, match each to the week you learned it: top 5 recruiters (Week 5 `GROUP BY`,
`LIMIT`), rank within department (Week 6 `RANK() OVER (PARTITION BY ...)`), month-wise trend (Week 6 CTE +
`DATE_TRUNC`), multiple offers (`HAVING COUNT(*) > 1`).

## Step 5: indexes with evidence

Pick queries that filter or join on non-key columns, for example `applications (student_id)` or
`drives (drive_date)`. For each index, paste `EXPLAIN ANALYZE` output **before and after** into `design-notes.md` with
one sentence explaining the change. With only about 1,000 applications the difference may be small, and the planner may
even prefer a sequential scan; say so honestly and explain why. You can generate a larger copy with
`generate_series` (Week 7) to show the effect.

## Step 6: report.py

```python
import os

import psycopg

QUERY = """
    SELECT s.roll_no, s.full_name, c.name AS company, o.package_lpa
    FROM offers o
    JOIN applications a ON a.application_id = o.application_id
    JOIN students s     ON s.student_id = a.student_id
    JOIN departments d  ON d.dept_id = s.dept_id
    JOIN drives dr      ON dr.drive_id = a.drive_id
    JOIN companies c    ON c.company_id = dr.company_id
    WHERE d.code = %s
    ORDER BY o.package_lpa DESC
"""

def main() -> None:
    code = input("Department code (e.g. CSE): ").strip().upper()
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        rows = conn.execute(QUERY, (code,)).fetchall()
    if not rows:
        print(f"No offers found for {code}.")
        return
    print(f"\nPlacement report: {code}\n")
    print(f"{'Roll no':<12}{'Name':<26}{'Company':<28}{'LPA':>6}")
    print("-" * 72)
    for roll_no, name, company, lpa in rows:
        print(f"{roll_no:<12}{name:<26}{company:<28}{lpa:>6}")
    print("-" * 72)
    print(f"{len(rows)} offers")

if __name__ == "__main__":
    main()
```

Extend it with a summary block (students, placed, placement %, highest and average package) and handle a database that
cannot be reached with a clear message instead of a traceback. The department code always goes through `%s`; never
format it into the SQL string.

## Step 7: the MongoDB part

In a `mongo/` folder, model companies with their drives **embedded** (a drive belongs to exactly one company and is
usually read with it), load a few documents with `insertMany`, and re-implement two of your SQL queries as aggregation
pipelines, for example drives per company with the average package, and the top recruiters. Add a short note on why you
embedded or referenced each part.

## Before you leave S3

- [ ] `schema.sql` reviewed at the checkpoint and committed
- [ ] `seed.py` runs end to end and prints row counts
- [ ] At least 5 queries written and committed
- [ ] Remaining tasks written as GitHub Issues and assigned to a partner

## Check yourself

1. Why is `drive_branches` a separate table instead of an `allowed_branches` text column in `drives`?
2. Which constraint stops a student from applying to the same drive twice?
3. Why does the placement-percentage query need `DISTINCT` in the `placed` CTE?
