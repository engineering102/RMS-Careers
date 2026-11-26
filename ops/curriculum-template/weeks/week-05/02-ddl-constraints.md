---
type: notes
title: "W5 · S2 · DDL, Data Types and Constraints"
slug: w05-s2-ddl-data-types-constraints
topic: DDL & Constraints
subject: core-cs
minutes: 40
description: Create, alter and drop tables; choose PostgreSQL data types; and protect data with PRIMARY KEY, FOREIGN KEY, UNIQUE, NOT NULL, CHECK and DEFAULT. Builds the four college tables.
---
# DDL, data types and constraints

**DDL** (Data Definition Language) describes the *shape* of your data: which tables exist, which columns they have and
which rules every row must follow. Good DDL is the cheapest bug prevention you will ever write: a rule enforced by the
database cannot be skipped by a buggy script.

## Choosing data types

| Need | PostgreSQL type | Notes | MySQL equivalent |
|---|---|---|---|
| Whole numbers | `SMALLINT`, `INT`, `BIGINT` | 2, 4 and 8 bytes | same |
| Exact decimals (money, CGPA) | `NUMERIC(p, s)` | `NUMERIC(4,2)` holds up to `99.99` | `DECIMAL(p, s)` |
| Approximate decimals | `REAL`, `DOUBLE PRECISION` | Rounding errors; never for money | `FLOAT`, `DOUBLE` |
| Short text with a limit | `VARCHAR(n)` | Error if longer than `n` | same |
| Text without a limit | `TEXT` | Same speed as `VARCHAR` in PostgreSQL | `TEXT` |
| True / false | `BOOLEAN` | `TRUE`, `FALSE`, `NULL` | `BOOLEAN` (stored as `TINYINT(1)`) |
| Date only | `DATE` | `'2027-01-15'` (ISO format) | same |
| Date and time | `TIMESTAMP`, `TIMESTAMPTZ` | Prefer `TIMESTAMPTZ` for events | `DATETIME`, `TIMESTAMP` |
| Auto-generated id | `INT GENERATED ALWAYS AS IDENTITY` | SQL-standard; older code uses `SERIAL` | `INT AUTO_INCREMENT` |

Rule of thumb: use `NUMERIC` for anything you would be embarrassed to get wrong by 0.01, and `DATE` for dates. Storing
dates as text (`'15/01/2027'`) makes sorting and date arithmetic wrong.

## The six constraints

| Constraint | Guarantees | Example |
|---|---|---|
| `PRIMARY KEY` | Unique and not NULL; identifies the row | `student_id INT ... PRIMARY KEY` |
| `FOREIGN KEY` / `REFERENCES` | Value must exist in the referenced table | `dept_id INT REFERENCES departments (dept_id)` |
| `UNIQUE` | No two rows share the value (NULLs are allowed) | `email VARCHAR(255) UNIQUE` |
| `NOT NULL` | A value is always present | `full_name VARCHAR(100) NOT NULL` |
| `CHECK` | A condition is true (or NULL) for every row | `CHECK (semester BETWEEN 1 AND 8)` |
| `DEFAULT` | Value used when the insert does not give one | `joined_on DATE DEFAULT CURRENT_DATE` |

Two details that catch people out:

- A `CHECK` passes when its expression is **NULL**. `CHECK (cgpa BETWEEN 0 AND 10)` allows a NULL CGPA. Add `NOT NULL`
  if the value is mandatory.
- `UNIQUE` allows several NULLs in PostgreSQL, because NULL is never equal to NULL.

## The college schema

Create the tables **parents first**: a table can only reference a table that already exists.

```sql
CREATE TABLE departments (
    dept_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code      VARCHAR(10)  NOT NULL UNIQUE,
    name      VARCHAR(100) NOT NULL,
    hod_name  VARCHAR(100)
);

CREATE TABLE students (
    student_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    roll_no     VARCHAR(12)  NOT NULL UNIQUE,
    full_name   VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    dept_id     INT          NOT NULL REFERENCES departments (dept_id),
    semester    SMALLINT     NOT NULL CHECK (semester BETWEEN 1 AND 8),
    cgpa        NUMERIC(4,2) CHECK (cgpa BETWEEN 0 AND 10),
    city        VARCHAR(60),
    joined_on   DATE         NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE courses (
    course_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code       VARCHAR(10)  NOT NULL UNIQUE,
    title      VARCHAR(120) NOT NULL,
    credits    SMALLINT     NOT NULL CHECK (credits BETWEEN 1 AND 5),
    dept_id    INT          NOT NULL REFERENCES departments (dept_id)
);

CREATE TABLE enrolments (
    student_id   INT      NOT NULL REFERENCES students (student_id) ON DELETE CASCADE,
    course_id    INT      NOT NULL REFERENCES courses (course_id),
    marks        SMALLINT CHECK (marks BETWEEN 0 AND 100),
    enrolled_on  DATE     NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (student_id, course_id)
);
```

Read the design decisions out loud:

- `enrolments` has a **composite primary key** `(student_id, course_id)`: a student can take many courses and a course
  has many students, but the same student cannot enrol in the same course twice.
- `ON DELETE CASCADE` on `enrolments.student_id`: deleting a student deletes their enrolments too.
- `courses.dept_id` has no `ON DELETE` rule, so the default (`NO ACTION`) applies: deleting a department that still has
  courses fails with an error. That is what you want; it stops accidental data loss.

### Foreign key actions

| Action | When the parent row is deleted |
|---|---|
| `NO ACTION` / `RESTRICT` (default behaviour) | The delete fails while child rows exist |
| `CASCADE` | Child rows are deleted too |
| `SET NULL` | The child's foreign key becomes NULL (column must allow NULL) |
| `SET DEFAULT` | The child's foreign key becomes its default value |

## Watching constraints work

Constraints are only convincing when you see them reject bad data. Each statement below fails, with the reason in the
comment. Run them one at a time.

```sql
INSERT INTO departments (code, name) VALUES ('CSE', 'Computer Science and Engineering');
INSERT INTO departments (code, name) VALUES ('CSE', 'Duplicate');            -- fails: UNIQUE (code)
INSERT INTO students (roll_no, full_name, email, dept_id, semester)
VALUES ('21CS001', 'Asha Rao', 'asha@example.com', 99, 5);                 -- fails: FOREIGN KEY (no dept 99)
INSERT INTO students (roll_no, full_name, email, dept_id, semester)
VALUES ('21CS002', 'Ravi Teja', 'ravi@example.com', 1, 9);                 -- fails: CHECK (semester 1-8)
INSERT INTO students (roll_no, email, dept_id, semester)
VALUES ('21CS003', 'no.name@example.com', 1, 3);                           -- fails: NOT NULL (full_name)
```

Read each error message. PostgreSQL names the constraint that failed, for example
`students_semester_check`. Naming the constraint yourself makes errors easier to read:

```sql
ALTER TABLE students ADD CONSTRAINT chk_email_has_at CHECK (email LIKE '%@%');
```

## Changing structure: ALTER, DROP, TRUNCATE

```sql
ALTER TABLE students ADD COLUMN phone VARCHAR(15);          -- add a column
ALTER TABLE students ALTER COLUMN city SET DEFAULT 'Hyderabad';
ALTER TABLE students RENAME COLUMN phone TO mobile;
ALTER TABLE students DROP COLUMN mobile;                    -- removes the column and its data
```

| Statement | Removes | Can it be undone inside a transaction? |
|---|---|---|
| `DELETE FROM t;` | All rows (one by one; `WHERE` allowed) | Yes |
| `TRUNCATE t;` | All rows (fast; no `WHERE`) | Yes in PostgreSQL; not in MySQL |
| `DROP TABLE t;` | The table itself, its rows and its structure | Yes in PostgreSQL; not in MySQL |

`DROP TABLE departments;` fails while other tables reference it. `DROP TABLE departments CASCADE;` would also drop the
foreign key constraints that point at it. Avoid `CASCADE` on `DROP` unless you have read what it will remove.

For scripts that you re-run, start `schema.sql` with drops in **child-first** order:

```sql
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS departments;
```

## Running a .sql file

From the terminal, in the folder that contains the file:

```bash
psql -U postgres -d college -f schema.sql
```

In pgAdmin or DBeaver, open the file in the query tool and run the whole script.

## Lab: build the college tables

1. Put the four `DROP TABLE IF EXISTS` lines and the four `CREATE TABLE` statements into `week-05/schema.sql`.
2. Run it twice. The second run must also succeed; that proves the drops are in the right order.
3. Check the structure with `\d students` and `\d enrolments`. Find the primary key, the foreign keys and the checks in
   the output.
4. Run each failing insert from "Watching constraints work" and copy the error message as a comment next to it in a
   scratch file. Then re-run `schema.sql` so you start S3 with empty tables and identity counters back at 1.
5. Add one constraint of your own, for example a check that department codes are upper case:
   `CHECK (code = UPPER(code))`. Commit `schema.sql`.

## Check yourself

1. Why must `departments` be created before `students`, and dropped after it?
2. A `CHECK (cgpa BETWEEN 0 AND 10)` constraint exists. Can a row have `cgpa = NULL`? Why?
3. What is the difference between `DELETE FROM enrolments;`, `TRUNCATE enrolments;` and `DROP TABLE enrolments;`?
