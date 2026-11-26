---
type: notes
title: "W5 · S3 · DML and SELECT: Filtering, Sorting and NULLs"
slug: w05-s3-dml-select-filtering
topic: DML & SELECT
subject: core-cs
minutes: 45
description: Insert, update and delete rows safely, then read them back with SELECT, WHERE, ORDER BY, LIMIT, DISTINCT, LIKE, IN, BETWEEN and correct NULL handling. Includes seed data and twenty guided queries.
---
# DML and SELECT: filtering, sorting and NULLs

## Inserting rows

```sql
INSERT INTO departments (code, name, hod_name) VALUES
    ('CSE',   'Computer Science and Engineering',        'Dr. K. Lakshmi'),
    ('ECE',   'Electronics and Communication Engineering', 'Dr. S. Prakash'),
    ('MECH',  'Mechanical Engineering',                  NULL),
    ('CIVIL', 'Civil Engineering',                       'Dr. R. Nair');
```

Always list the columns. `INSERT INTO departments VALUES (...)` without a column list breaks the day someone adds a
column. The identity column `dept_id` is filled in automatically (1, 2, 3, 4 on an empty table).

The seed data used in this session's examples:

```sql
INSERT INTO students (roll_no, full_name, email, dept_id, semester, cgpa, city) VALUES
    ('22CS001', 'Asha Rao',       'asha.rao@example.com',     1, 5, 8.40, 'Hyderabad'),
    ('22CS002', 'Rahul Verma',    'rahul.verma@example.com',  1, 5, 7.25, 'Pune'),
    ('22CS003', 'Divya Menon',    'divya.menon@example.com',  1, 5, NULL, 'Kochi'),
    ('23CS004', 'Arjun Reddy',    'arjun.reddy@example.com',  1, 3, 9.10, 'Hyderabad'),
    ('22EC001', 'Imran Khan',     'imran.khan@example.com',   2, 5, 6.80, 'Bengaluru'),
    ('22EC002', 'Sneha Patil',    'sneha.patil@example.com',  2, 5, 8.95, 'Pune'),
    ('23EC003', 'Aditya Singh',   'aditya.singh@example.com', 2, 3, 5.90, NULL),
    ('22ME001', 'Karthik Iyer',   'karthik.iyer@example.com', 3, 5, 7.60, 'Chennai'),
    ('23ME002', 'Meera Joshi',    'meera.joshi@example.com',  3, 3, 8.05, 'Nagpur'),
    ('22CV001', 'Farhan Ali',     'farhan.ali@example.com',   4, 5, 6.45, 'Hyderabad');

INSERT INTO courses (code, title, credits, dept_id) VALUES
    ('CS301', 'Database Management Systems', 4, 1),
    ('CS302', 'Operating Systems',           4, 1),
    ('CS201', 'Data Structures',             4, 1),
    ('EC301', 'Digital Signal Processing',   3, 2),
    ('ME301', 'Thermodynamics',              3, 3),
    ('HS101', 'Professional Communication',  2, 4);

INSERT INTO enrolments (student_id, course_id, marks) VALUES
    (1, 1, 88), (1, 2, 79), (1, 6, 91),
    (2, 1, 72), (2, 2, 65),
    (3, 1, NULL), (3, 3, 81),
    (4, 3, 95), (4, 6, 84),
    (5, 4, 58), (5, 6, 70),
    (6, 4, 90), (6, 1, 83),
    (7, 4, 41),
    (8, 5, 76), (8, 6, 68),
    (9, 5, 87),
    (10, 6, 62);
```

## Updating and deleting: always WHERE first

```sql
UPDATE students SET city = 'Secunderabad' WHERE roll_no = '22CV001';
UPDATE enrolments SET marks = marks + 5 WHERE course_id = 4 AND marks < 60;   -- grace marks
DELETE FROM enrolments WHERE student_id = 10 AND course_id = 6;
```

`UPDATE students SET city = 'Pune';` with no `WHERE` changes **every** row. A safe habit:

1. Write the `WHERE` clause as a `SELECT` first: `SELECT * FROM students WHERE roll_no = '22CV001';`
2. Check that it returns exactly the rows you expect.
3. Only then change `SELECT *` to `UPDATE ... SET ...` or `DELETE`.

PostgreSQL can show you what changed with `RETURNING`:

```sql
UPDATE students SET semester = semester + 1 WHERE roll_no = '23ME002' RETURNING roll_no, semester;
```

(`RETURNING` is a PostgreSQL feature; MySQL does not support it on `UPDATE`.)

## SELECT: the shape of every query

```text
SELECT   columns or expressions
FROM     table
WHERE    row filter
ORDER BY sort columns
LIMIT    number of rows;
```

```sql
SELECT full_name, cgpa FROM students;                   -- chosen columns
SELECT * FROM courses;                                  -- all columns (fine for exploring, not for code)
SELECT full_name, cgpa * 9.5 AS approx_percent FROM students;   -- expression with an alias
```

### WHERE: comparison and logic

| Operator | Meaning | Example |
|---|---|---|
| `=`, `<>` (or `!=`) | Equal, not equal | `dept_id = 1` |
| `<`, `<=`, `>`, `>=` | Comparison | `cgpa >= 8` |
| `AND`, `OR`, `NOT` | Combine conditions | `semester = 5 AND cgpa > 7` |
| `BETWEEN a AND b` | Inclusive range | `cgpa BETWEEN 7 AND 8.5` |
| `IN (...)` | Any of a list | `city IN ('Pune', 'Chennai')` |
| `LIKE` | Pattern: `%` any characters, `_` exactly one | `email LIKE '%@example.com'` |
| `IS NULL`, `IS NOT NULL` | Test for NULL | `cgpa IS NULL` |

`AND` binds tighter than `OR`, so use brackets when you mix them:

```sql
-- Fifth-semester students from CSE or ECE
SELECT full_name FROM students
WHERE semester = 5 AND (dept_id = 1 OR dept_id = 2);
```

Without the brackets this would mean "(semester 5 and CSE) or (any ECE student)".

`LIKE` is case-sensitive in PostgreSQL. Use `ILIKE` (PostgreSQL only) or compare `LOWER(full_name) LIKE 'a%'` for a
case-insensitive match. MySQL's default collations make `LIKE` case-insensitive already.

### NULL handling

`NULL` means unknown, so any comparison with it is also unknown, and `WHERE` keeps only rows where the condition is
**true**.

```sql
SELECT full_name FROM students WHERE cgpa = NULL;      -- returns nothing, always
SELECT full_name FROM students WHERE cgpa IS NULL;     -- Divya Menon
SELECT full_name, COALESCE(city, 'Not given') AS city FROM students;   -- replace NULL for display
```

A sneaky case: `WHERE cgpa < 7` does **not** return Divya, and neither does `WHERE cgpa >= 7`. Rows with NULL fall
out of both. If you need them, add `OR cgpa IS NULL` explicitly.

### ORDER BY, LIMIT, DISTINCT

```sql
SELECT full_name, cgpa FROM students ORDER BY cgpa DESC;            -- highest first
SELECT full_name, dept_id, cgpa FROM students ORDER BY dept_id, cgpa DESC;   -- then by cgpa within each dept
SELECT full_name, cgpa FROM students ORDER BY cgpa DESC NULLS LAST LIMIT 3;  -- top three
SELECT DISTINCT city FROM students ORDER BY city;                   -- each city once
```

- In PostgreSQL, NULLs sort as if **larger** than every value, so they come first in `DESC` order. `NULLS LAST`
  fixes that (MySQL sorts NULLs as smallest and has no `NULLS LAST`).
- `LIMIT 5 OFFSET 10` skips 10 rows and returns the next 5; this is how pages of results are fetched.
- `DISTINCT` applies to the whole selected row: `SELECT DISTINCT city, semester` gives unique *pairs*.

## The logical order of a query

You write `SELECT` first, but the database evaluates it in this order:

```text
FROM → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT
```

That is why a column alias defined in `SELECT` can be used in `ORDER BY` but **not** in `WHERE`: `WHERE` runs before
the alias exists.

## Lab: twenty guided queries

Load the seed data above, then write each query in `queries.sql` with a comment above it stating the question. Predict
the number of rows before you run each one.

1. All columns of all courses.
2. Name and email of every student, sorted by name.
3. Students in semester 5.
4. Students with a CGPA of 8 or more, highest first.
5. Students from Hyderabad or Pune (use `IN`).
6. Students whose CGPA is between 6.5 and 8.0.
7. Students whose name starts with "A".
8. Students whose roll number contains "EC".
9. Students with no CGPA recorded.
10. Students with no city recorded; show "Not given" in the output instead of NULL.
11. The distinct cities students come from.
12. The top three students by CGPA, with NULLs last.
13. Courses with 4 credits, sorted by title.
14. Enrolments with marks below 60.
15. Students who are in semester 3 and not in CSE.
16. Each student's name and CGPA as an approximate percentage (`cgpa * 9.5`), rounded with `ROUND(..., 1)`.
17. Give every enrolment in course 4 five grace marks, but never above 100 (`LEAST(marks + 5, 100)`).
18. Change Aditya Singh's city to Lucknow, using `RETURNING` to confirm.
19. Delete the enrolment of student 7 in course 4; check with a `SELECT` first.
20. Rows 4 to 6 of students ordered by `student_id` (use `LIMIT` and `OFFSET`).

## Check yourself

1. Why does `WHERE cgpa = NULL` never return a row?
2. Rewrite `WHERE city = 'Pune' OR city = 'Chennai' OR city = 'Kochi'` more simply.
3. Can you use a `SELECT` alias in the `WHERE` clause of the same query? Explain using the logical order.
