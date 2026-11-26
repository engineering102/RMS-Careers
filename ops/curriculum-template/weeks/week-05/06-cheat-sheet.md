---
type: resource
title: "W5 · Cheat Sheet: Keys, DDL, SELECT and Aggregation"
slug: w05-cheat-sheet
topic: Week 5 Reference
subject: core-cs
minutes: 10
description: One-page reference for Week 5 — keys, data types, constraints, DML, SELECT filtering, NULL rules, aggregation, psql commands, and this week's deliverable and career task.
---
# Week 5 cheat sheet

## Keys

| Key | One line |
|---|---|
| Super key | Any column set that uniquely identifies a row |
| Candidate key | A minimal super key |
| Primary key | The chosen candidate key; unique and never NULL |
| Alternate key | A candidate key not chosen as primary (enforce with `UNIQUE`) |
| Foreign key | Must match a key in another table (referential integrity) |
| Composite key | A key of two or more columns, e.g. `(student_id, course_id)` |

## DDL and constraints

```sql
CREATE TABLE t (
    id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code      VARCHAR(10)  NOT NULL UNIQUE,
    parent_id INT          NOT NULL REFERENCES parent (id) ON DELETE CASCADE,
    score     NUMERIC(5,2) CHECK (score BETWEEN 0 AND 100),
    created   DATE         NOT NULL DEFAULT CURRENT_DATE
);
ALTER TABLE t ADD COLUMN note TEXT;
ALTER TABLE t DROP COLUMN note;
DROP TABLE IF EXISTS t;          -- drop children before parents
```

- `CHECK` passes when the value is NULL; add `NOT NULL` if the value is required.
- Money and marks: `NUMERIC`, never `REAL`. Dates: `DATE` / `TIMESTAMPTZ`, never text.

## DML

```sql
INSERT INTO t (code, parent_id) VALUES ('A1', 1), ('A2', 1);
UPDATE t SET score = 90 WHERE id = 3;      -- test the WHERE with SELECT first
DELETE FROM t WHERE id = 3;
```

## SELECT

```sql
SELECT DISTINCT col, expr AS alias
FROM t
WHERE a = 1 AND (b IN ('x', 'y') OR c BETWEEN 5 AND 10) AND name LIKE 'A%'
ORDER BY alias DESC NULLS LAST
LIMIT 10 OFFSET 20;
```

| Pattern | Matches |
|---|---|
| `LIKE 'A%'` | starts with A |
| `LIKE '%son'` | ends with "son" |
| `LIKE '_a%'` | second character is a |
| `ILIKE 'a%'` | starts with a or A (PostgreSQL only) |

## NULL rules

- `= NULL` is never true. Use `IS NULL` / `IS NOT NULL`.
- `COALESCE(x, 'default')` replaces NULL for display.
- Aggregates (except `COUNT(*)`) skip NULLs.

## Aggregation

```sql
SELECT dept_id, COUNT(*) AS n, ROUND(AVG(cgpa), 2) AS avg_cgpa
FROM students
WHERE semester = 5            -- filters rows
GROUP BY dept_id
HAVING COUNT(*) >= 2          -- filters groups
ORDER BY n DESC;
```

Logical order: `FROM → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT`.
Every non-aggregated `SELECT` column must be in `GROUP BY`.

## psql

| Task | Command |
|---|---|
| Connect | `psql -U postgres -d college` |
| Run a file | `psql -U postgres -d college -f schema.sql` |
| List databases / tables | `\l` · `\dt` |
| Describe a table | `\d students` |
| Switch database / quit | `\c college` · `\q` |

## This week

| Item | Details |
|---|---|
| **Deliverable** | `/week-05`: `schema.sql`, `seed.sql` and `queries.sql` with 25 commented queries on the college database (Weekly Build WB-05) |
| **Practice quiz** | Relational Databases & SQL Fundamentals (untimed, retakes allowed) |
| **Weekly test** | 15 questions on keys, constraints, SELECT, aggregation and strings, 25 minutes |
| **DSA** | Strings: Reverse String, Valid Palindrome, Longest Common Prefix, Reverse Words in a String, String Compression |
| **Career task** | Start an SQL practice track (LeetCode "SQL 50" or HackerRank SQL) and solve 10 problems |
