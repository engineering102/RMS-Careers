---
type: notes
title: "W7 · S2 · Functional Dependencies and Normalisation (1NF to BCNF)"
slug: w07-s2-functional-dependencies-normalisation
topic: Normalisation
subject: core-cs
minutes: 45
description: Anomalies in badly designed tables, functional dependencies, step-by-step normalisation to 1NF, 2NF, 3NF and BCNF on a worked example, and when deliberate denormalisation is justified.
---
# Functional dependencies and normalisation (1NF to BCNF)

**Normalisation** is a set of rules for splitting tables so that each fact is stored exactly once. It is one of the
most common DBMS interview topics, and the reasoning matters more than the definitions: be ready to point at a column
and say *which* rule it breaks and *why* that causes trouble.

## A messy spreadsheet

The exam cell keeps marks in one sheet:

| roll_no | name | dept | hod | phones | course_code | course_title | credits | marks |
|---|---|---|---|---|---|---|---|---|
| 22CS001 | Asha Rao | CSE | Dr. Lakshmi | 98480 11111, 90000 22222 | CS301 | DBMS | 4 | 88 |
| 22CS001 | Asha Rao | CSE | Dr. Lakshmi | 98480 11111, 90000 22222 | CS302 | Operating Systems | 4 | 79 |
| 22CS002 | Rahul Verma | CSE | Dr. Lakshmi | 97000 33333 | CS301 | DBMS | 4 | 72 |
| 22EC001 | Imran Khan | ECE | Dr. Prakash | 96000 44444 | EC301 | DSP | 3 | 58 |

## The three anomalies

| Anomaly | What goes wrong here |
|---|---|
| **Insertion** | You cannot record a new course (say CS401) until some student takes it, because every row needs a roll number |
| **Update** | When CSE's HOD changes, you must edit every CSE row; miss one and the data contradicts itself |
| **Deletion** | If Imran drops EC301 and you delete his row, you also lose the fact that ECE's HOD is Dr. Prakash and that EC301 exists |

All three come from the same cause: **facts about different things are stored in one row**.

## Functional dependencies

A **functional dependency (FD)** `X → Y` means: if two rows agree on `X`, they must agree on `Y`. "`X` determines
`Y`."

FDs in the sheet (from the meaning of the data, not from the sample rows):

```text
roll_no               → name, dept, phones
dept                  → hod
course_code           → course_title, credits
roll_no, course_code  → marks
```

The **key** of the sheet is `(roll_no, course_code)`: together they determine every column.

Vocabulary you need:

| Term | Meaning |
|---|---|
| Prime attribute | Part of some candidate key (`roll_no`, `course_code`) |
| Non-prime attribute | Not part of any candidate key (`name`, `hod`, `marks` …) |
| Partial dependency | A non-prime attribute depends on **part** of a composite key (`roll_no → name`) |
| Transitive dependency | A non-prime attribute depends on another non-prime attribute (`roll_no → dept → hod`) |
| Determinant | The left side of an FD |

## First normal form (1NF)

**Rule:** every cell holds a single, atomic value; no repeating groups.

`phones` holds two numbers in one cell, so the sheet is not in 1NF. Fix it by moving phones to their own table:

```text
student_phones(roll_no, phone)          key: (roll_no, phone)
```

(Putting `phone1`, `phone2` columns instead is a repeating group and only moves the problem.)

## Second normal form (2NF)

**Rule:** 1NF, and no **partial** dependency: every non-prime attribute depends on the **whole** key.

With key `(roll_no, course_code)`:

- `name`, `dept` depend only on `roll_no` → partial.
- `course_title`, `credits` depend only on `course_code` → partial.
- `marks` depends on both → fine.

Split each partial dependency into its own table:

```text
students(roll_no, name, dept, hod)               key: roll_no
courses(course_code, course_title, credits)      key: course_code
results(roll_no, course_code, marks)             key: (roll_no, course_code)
```

A table whose key is a **single column** is automatically in 2NF, because there is no "part" of the key to depend on.

## Third normal form (3NF)

**Rule:** 2NF, and no **transitive** dependency: non-prime attributes depend on the key, the whole key and **nothing
but the key**.

In `students`, `roll_no → dept` and `dept → hod`, so `hod` depends on the key only through `dept`. Split it out:

```text
departments(dept, hod)                          key: dept
students(roll_no, name, dept)                   key: roll_no, dept → departments
```

The final 3NF design:

```sql
CREATE TABLE departments (
    dept  VARCHAR(10)  PRIMARY KEY,
    hod   VARCHAR(100)
);
CREATE TABLE students (
    roll_no  VARCHAR(12)  PRIMARY KEY,
    name     VARCHAR(100) NOT NULL,
    dept     VARCHAR(10)  NOT NULL REFERENCES departments (dept)
);
CREATE TABLE student_phones (
    roll_no  VARCHAR(12) REFERENCES students (roll_no) ON DELETE CASCADE,
    phone    VARCHAR(15),
    PRIMARY KEY (roll_no, phone)
);
CREATE TABLE courses (
    course_code   VARCHAR(10)  PRIMARY KEY,
    course_title  VARCHAR(120) NOT NULL,
    credits       SMALLINT     NOT NULL
);
CREATE TABLE results (
    roll_no      VARCHAR(12) REFERENCES students (roll_no),
    course_code  VARCHAR(10) REFERENCES courses (course_code),
    marks        SMALLINT CHECK (marks BETWEEN 0 AND 100),
    PRIMARY KEY (roll_no, course_code)
);
```

Check the anomalies again: a new course is one row in `courses`; a HOD change is one `UPDATE` in `departments`;
deleting a result removes nothing else. The original sheet can be rebuilt exactly with joins, so no information was
lost (a **lossless** decomposition).

## Boyce–Codd normal form (BCNF)

**Rule:** for every non-trivial FD `X → Y`, `X` is a **super key**. (3NF allows one exception: `Y` may be a prime
attribute. BCNF removes it.)

Classic example: `teaching(student, subject, teacher)` with the rules

```text
student, subject → teacher      (each student has one teacher per subject)
teacher          → subject      (each teacher teaches only one subject)
```

The candidate keys are `(student, subject)` and `(student, teacher)`. Every attribute is prime, so the table is in
3NF. But `teacher → subject` has a determinant (`teacher`) that is not a super key, so it violates BCNF: the fact
"Mr. Rao teaches DBMS" is repeated for every student he teaches.

BCNF decomposition:

```text
teacher_subject(teacher, subject)       key: teacher
student_teacher(student, teacher)       key: (student, teacher)
```

The trade-off: the rule "one teacher per student per subject" can no longer be checked inside a single table. That is
why designers sometimes stop at 3NF. Know this trade-off; interviewers like it.

## Summary table

| Normal form | Removes | One-line test |
|---|---|---|
| 1NF | Multi-valued cells, repeating groups | Every cell holds one value |
| 2NF | Partial dependencies | No non-key column depends on part of a composite key |
| 3NF | Transitive dependencies | No non-key column depends on another non-key column |
| BCNF | Any FD whose determinant is not a super key | Every determinant is a super key |

## When to denormalise

Normalised designs are the right **default** for transactional data (orders, payments, marks). Deliberate
**denormalisation** (storing a value redundantly) can be justified when:

- a read-heavy report joins many tables on every page view, and you store a precomputed total (for example
  `orders.total_amount`) to avoid summing `order_items` each time;
- you need a historical snapshot: `order_items.unit_price` copies the product price at the time of sale, because the
  product's price will change later (this one is not really redundancy: it is a different fact);
- an analytics warehouse uses wide, flattened tables built from the normalised source.

Every denormalised value needs a plan to keep it correct (update it in the same transaction, a trigger, or a scheduled
rebuild), and a note in your design document saying why it exists.

## Lab: normalise three messy spreadsheets

For each sheet: list the FDs, name the key, state the highest normal form it is in and why, then decompose to 3NF and
write the `CREATE TABLE` statements.

1. **Hostel sheet:** `(student_id, student_name, room_no, block, warden_name, mess_plan, mess_fee)` where
   `room_no → block`, `block → warden_name`, `mess_plan → mess_fee`.
2. **Orders sheet:** `(order_id, order_date, customer_id, customer_name, customer_city, product_id, product_name,
   unit_price, quantity)`.
3. **Training sheet:** `(employee_id, employee_name, skills, trainer, training_date)` where `skills` holds a
   comma-separated list.

Then answer: is there any place in your designs where you would denormalise? Why?

## Check yourself

1. Give an example of an update anomaly and explain which normal form prevents it.
2. A table has a single-column primary key. Can it violate 2NF? Can it violate 3NF?
3. What is the difference between 3NF and BCNF? Give a dependency that is allowed in 3NF but not in BCNF.
