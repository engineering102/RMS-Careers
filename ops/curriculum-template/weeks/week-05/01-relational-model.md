---
type: notes
title: "W5 · S1 · Why Databases and the Relational Model"
slug: w05-s1-why-databases-relational-model
topic: Relational Model
subject: core-cs
minutes: 35
description: Why applications use a DBMS instead of files, how the relational model organises data into tables, rows, columns and keys, and how to install PostgreSQL and create the college database.
---
# Why databases and the relational model

## The problem with files

In Phase 1 you saved data in JSON and CSV files. That works for one user and a few hundred records. It breaks down
when an application grows:

| Problem with plain files | What goes wrong | How a DBMS helps |
|---|---|---|
| **Redundancy** | The same student's phone number is copied into five files and they drift apart | Store each fact once and link to it |
| **Concurrent access** | Two people save at the same time and one write is lost | Transactions and locking |
| **Integrity** | Nothing stops `marks = 250` or a course code that does not exist | Constraints checked on every write |
| **Querying** | Every question ("toppers in CSE") needs new loop code | One declarative query language: SQL |
| **Security** | Anyone who can open the file can read all of it | Users, roles and permissions |
| **Recovery** | A crash halfway through a save corrupts the file | Write-ahead logs and crash recovery |

A **database** is an organised collection of data. A **database management system (DBMS)** is the software that stores
it, answers queries, enforces rules and keeps it safe. PostgreSQL, MySQL, Oracle and SQL Server are relational DBMSs
(RDBMS); MongoDB, which you meet in Week 8, is a document database.

## The relational model

The relational model, proposed by E. F. Codd, stores data in **relations**, which you will mostly call **tables**.

```text
students
+------------+--------------+---------+----------+------+
| student_id | full_name    | dept_id | semester | cgpa |
+------------+--------------+---------+----------+------+
| 1          | Asha Rao     | 1       | 5        | 8.40 |
| 2          | Imran Khan   | 2       | 3        | 7.10 |
| 3          | Divya Menon  | 1       | 5        | NULL |
+------------+--------------+---------+----------+------+
```

| Term (formal) | Everyday term | Meaning |
|---|---|---|
| Relation | Table | A set of rows with the same columns |
| Tuple | Row / record | One entity, e.g. one student |
| Attribute | Column / field | One property, e.g. `cgpa` |
| Domain | Data type | The allowed values for a column |
| Degree | Number of columns | 5 in the example |
| Cardinality | Number of rows | 3 in the example |

Two rules matter immediately:

- Each cell holds **one value** (no lists of phone numbers in one cell).
- Row order has no meaning. If you want an order, you ask for it with `ORDER BY`.

`NULL` means "unknown or not applicable". It is **not** zero and **not** an empty string. Divya's CGPA above is
unknown, which is different from a CGPA of 0.

## Keys

Keys are how rows are identified and how tables are linked. Interviewers ask about them constantly.

| Key | Definition | Example in `students` |
|---|---|---|
| **Super key** | Any set of columns that uniquely identifies a row | `{student_id}`, `{student_id, full_name}`, `{email}` |
| **Candidate key** | A minimal super key: remove any column and it stops being unique | `{student_id}`, `{email}`, `{roll_no}` |
| **Primary key** | The candidate key you choose as the main identifier; never NULL | `student_id` |
| **Alternate key** | A candidate key that was not chosen as primary | `email`, `roll_no` |
| **Foreign key** | A column whose values must match a key in another table | `dept_id` → `departments.dept_id` |
| **Composite key** | A key made of two or more columns | `{student_id, course_id}` in `enrolments` |

A **surrogate key** is an artificial identifier such as an auto-generated number (`student_id`). A **natural key**
comes from the real world (`roll_no`, `email`). Most applications use a surrogate primary key and keep natural keys
unique with a `UNIQUE` constraint, because real-world values sometimes change.

### How foreign keys link tables

```text
departments                       students
+---------+------------+          +------------+-------------+---------+
| dept_id | name       |          | student_id | full_name   | dept_id |
+---------+------------+          +------------+-------------+---------+
| 1       | CSE        | <------- | 1          | Asha Rao    | 1       |
| 2       | ECE        | <------- | 2          | Imran Khan  | 2       |
+---------+------------+          +------------+-------------+---------+
```

The foreign key guarantees **referential integrity**: you cannot add a student with `dept_id = 9` if department 9 does
not exist, and you cannot delete a department that still has students (unless you tell the database what to do
instead, which you will see in S2).

## SQL in one paragraph

**SQL** (Structured Query Language) is how you talk to a relational database. It is **declarative**: you describe
the result you want, and the database works out how to get it. SQL statements fall into groups:

| Group | Purpose | Statements |
|---|---|---|
| DDL (definition) | Create and change structure | `CREATE`, `ALTER`, `DROP`, `TRUNCATE` |
| DML (manipulation) | Change data | `INSERT`, `UPDATE`, `DELETE` |
| DQL (query) | Read data | `SELECT` |
| DCL (control) | Permissions | `GRANT`, `REVOKE` |
| TCL (transactions) | Group changes | `BEGIN`, `COMMIT`, `ROLLBACK` |

Keywords are not case-sensitive, but the convention is UPPERCASE keywords and lowercase `snake_case` names. Every
statement ends with a semicolon.

## Installing PostgreSQL

We use **PostgreSQL** for the whole programme; you will use it again in the full stack phase.

1. Download the installer for your operating system from the official PostgreSQL website (on Windows, the EDB
   installer). Accept the default port **5432**.
2. Set a password for the `postgres` superuser and **write it down**. This is a local development password; never
   reuse a real one.
3. Install a graphical client: **pgAdmin** (bundled with the Windows installer) or **DBeaver**.
4. Check the command-line client: `psql --version`.

If `psql` is "not recognized" on Windows, add the PostgreSQL `bin` folder (for example
`C:\Program Files\PostgreSQL\<version>\bin`) to your PATH and restart the terminal.

### MySQL equivalents

Most of what you learn transfers directly. Where PostgreSQL and MySQL differ, the notes say so.

| Task | PostgreSQL | MySQL |
|---|---|---|
| Command-line client | `psql -U postgres` | `mysql -u root -p` |
| List databases | `\l` | `SHOW DATABASES;` |
| Switch database | `\c college` | `USE college;` |
| List tables | `\dt` | `SHOW TABLES;` |
| Describe a table | `\d students` | `DESCRIBE students;` |
| Quit | `\q` | `exit` |

Commands starting with a backslash are `psql` shortcuts, not SQL, so they do not need a semicolon.

## Lab: create the college database

1. Open a terminal and connect as the superuser:

```bash
psql -U postgres
```

2. Create the database, connect to it and check that it is empty:

```sql
CREATE DATABASE college;
```

```text
\c college
\dt
```

`\dt` should print "Did not find any relations." That is correct: there are no tables yet.

3. Run a first query that needs no tables:

```sql
SELECT current_database(), current_user, version();
```

4. Connect to the same database from pgAdmin or DBeaver (host `localhost`, port `5432`, database `college`, user
   `postgres`) and find it in the object tree.
5. Create the folder `week-05/` in your `rms-weekly-labs` repository with an empty `schema.sql`, `seed.sql` and
   `queries.sql`. You will fill them during the week. Commit.

## Check yourself

1. Give two problems that a DBMS solves which a folder of CSV files does not.
2. In a `students` table with `student_id`, `email` and `roll_no`, which are candidate keys, and which would you pick
   as the primary key? Why?
3. Is `NULL` the same as `0` for a CGPA column? What does `NULL` mean?
