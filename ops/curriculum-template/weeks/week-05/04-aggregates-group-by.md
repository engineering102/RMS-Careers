---
type: notes
title: "W5 · S4 · Aggregates, GROUP BY and HAVING"
slug: w05-s4-aggregates-group-by-having
topic: Aggregation
subject: core-cs
minutes: 40
description: Summarise data with COUNT, SUM, AVG, MIN and MAX, group rows with GROUP BY, filter groups with HAVING, and build department-wise and course-wise reports on the college database.
---
# Aggregates, GROUP BY and HAVING

So far every query returned individual rows. Reports need **summaries**: how many students per department, the average
marks per course, the topper in each branch. That is what aggregation does.

These notes use the seed data from S3 (before the lab changes). Your numbers may differ slightly if you ran the
`UPDATE` and `DELETE` examples or lab queries; re-run `schema.sql` and the seed to get them back.

## The five aggregate functions

| Function | Returns | NULL handling |
|---|---|---|
| `COUNT(*)` | Number of rows | Counts every row |
| `COUNT(column)` | Number of non-NULL values | Skips NULLs |
| `COUNT(DISTINCT column)` | Number of different non-NULL values | Skips NULLs |
| `SUM(column)` | Total | Skips NULLs; NULL if every value is NULL |
| `AVG(column)` | Mean of the non-NULL values | Skips NULLs (they are **not** treated as 0) |
| `MIN(column)`, `MAX(column)` | Smallest, largest | Skip NULLs; work on numbers, text and dates |

```sql
SELECT COUNT(*)              AS students,
       COUNT(cgpa)           AS with_cgpa,
       COUNT(DISTINCT city)  AS cities,
       ROUND(AVG(cgpa), 2)   AS avg_cgpa,
       MAX(cgpa)             AS best,
       MIN(cgpa)             AS lowest
FROM students;
```

```text
 students | with_cgpa | cities | avg_cgpa | best | lowest
----------+-----------+--------+----------+------+--------
       10 |         9 |      6 |     7.61 | 9.10 |   5.90
```

Notice `with_cgpa` is 9, not 10: Divya's NULL is skipped. The average is over 9 students. If a missing CGPA should
count as zero (it usually should not), you would write `AVG(COALESCE(cgpa, 0))`.

## GROUP BY: one result row per group

`GROUP BY` splits the rows into groups that share a value, then the aggregates run once **per group**.

```sql
SELECT dept_id, COUNT(*) AS students, ROUND(AVG(cgpa), 2) AS avg_cgpa
FROM students
GROUP BY dept_id
ORDER BY dept_id;
```

```text
 dept_id | students | avg_cgpa
---------+----------+----------
       1 |        4 |     8.25
       2 |        3 |     7.22
       3 |        2 |     7.83
       4 |        1 |     6.45
```

Picture it as sorting the rows into buckets by `dept_id`, then writing one summary line per bucket.

### The GROUP BY rule

Every column in the `SELECT` list must either be **inside an aggregate** or **listed in GROUP BY**.

```sql
SELECT dept_id, full_name, COUNT(*) FROM students GROUP BY dept_id;   -- error
```

PostgreSQL rejects this: department 1 has four students, so which `full_name` should the single result row show? The
question has no answer, so the query is invalid. (Older MySQL settings allowed it and returned an arbitrary name, which
is a classic source of wrong reports.)

You can group by several columns, giving one row per combination:

```sql
SELECT dept_id, semester, COUNT(*) AS students
FROM students
GROUP BY dept_id, semester
ORDER BY dept_id, semester;
```

## WHERE versus HAVING

- `WHERE` filters **rows before** grouping. It cannot use aggregates.
- `HAVING` filters **groups after** grouping. It is where conditions on `COUNT`, `AVG` and so on go.

```sql
-- Departments with at least 2 students in semester 5
SELECT dept_id, COUNT(*) AS sem5_students
FROM students
WHERE semester = 5            -- row filter: only semester-5 students are grouped
GROUP BY dept_id
HAVING COUNT(*) >= 2          -- group filter: keep departments with 2 or more of them
ORDER BY sem5_students DESC;
```

Order of evaluation again: `FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT`. Because `HAVING` runs
before `SELECT`, PostgreSQL requires you to repeat the aggregate (`HAVING COUNT(*) >= 2`) rather than use the alias
`sem5_students`. `ORDER BY` runs after `SELECT`, so the alias works there.

| Question | Clause |
|---|---|
| Only students with CGPA above 7 | `WHERE cgpa > 7` |
| Only departments whose average CGPA is above 7 | `HAVING AVG(cgpa) > 7` |
| Only courses with more than 3 enrolments | `HAVING COUNT(*) > 3` |

## Reports that need two tables

Department codes are more readable than ids. Next week covers joins in depth; for now, this is the pattern:

```sql
SELECT d.code, COUNT(s.student_id) AS students, ROUND(AVG(s.cgpa), 2) AS avg_cgpa
FROM departments d
JOIN students s ON s.dept_id = d.dept_id
GROUP BY d.code
ORDER BY avg_cgpa DESC;
```

`d` and `s` are **table aliases**: short names that save typing and make it clear which table each column comes from.

Course-wise marks report:

```sql
SELECT c.code,
       c.title,
       COUNT(e.student_id)  AS enrolled,
       COUNT(e.marks)       AS graded,
       ROUND(AVG(e.marks), 1) AS avg_marks,
       MAX(e.marks)         AS top_marks
FROM courses c
JOIN enrolments e ON e.course_id = c.course_id
GROUP BY c.code, c.title
ORDER BY avg_marks DESC;
```

`enrolled` and `graded` differ for CS301 because one enrolment has no marks yet. Showing both makes the report honest.

## Conditional aggregation

You can count only some rows inside an aggregate with `FILTER` (PostgreSQL) or a `CASE` expression (works everywhere):

```sql
SELECT c.code,
       COUNT(*) FILTER (WHERE e.marks >= 40) AS passed,
       SUM(CASE WHEN e.marks < 40 THEN 1 ELSE 0 END) AS failed
FROM courses c
JOIN enrolments e ON e.course_id = c.course_id
GROUP BY c.code
ORDER BY c.code;
```

## Aliases and readability

- Column alias: `AVG(marks) AS avg_marks`. Use `AS`; it makes the intent obvious.
- Table alias: `FROM students s`. Use short, meaningful letters.
- Round only for display (`ROUND(AVG(cgpa), 2)`). In PostgreSQL, `ROUND(x, 2)` needs a `NUMERIC` value; `AVG` of a
  `NUMERIC` or integer column already returns one.
- Integer division truncates: `SELECT 7 / 2;` gives `3`. Use `7.0 / 2` or `100.0 * part / total` for percentages.

## Lab: department-wise and course-wise reports

Add these to `queries.sql`, each with a comment stating the question:

1. Total number of students, and how many have a CGPA recorded.
2. Number of students per department code, largest first.
3. Average, highest and lowest CGPA per department code.
4. Number of students per city, only for cities with more than one student.
5. Number of students per (department, semester) pair.
6. For each course: enrolled count, graded count, average marks rounded to one decimal.
7. Courses whose average marks are above 75.
8. Total credits each student is enrolled in (`SUM(c.credits)`), highest first.
9. Departments whose average CGPA is below the overall average CGPA (hard-code 7.6 for now; next week you will
   compute it with a subquery).
10. Pass and fail counts per course (pass mark 40).

Together with S3's twenty queries this gives you 30. Pick your best 25 for the Weekly Build `queries.sql`.

## Check yourself

1. A table has 10 rows and one NULL in `cgpa`. What do `COUNT(*)`, `COUNT(cgpa)` and `AVG(cgpa)` each use?
2. Why is `SELECT dept_id, full_name, COUNT(*) FROM students GROUP BY dept_id;` rejected?
3. You want "departments with more than 3 students". Does the condition go in `WHERE` or `HAVING`? Why?
