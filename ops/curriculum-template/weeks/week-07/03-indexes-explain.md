---
type: notes
title: "W7 · S3 · Indexes, EXPLAIN and Query Optimisation"
slug: w07-s3-indexes-explain-optimisation
topic: Indexing & Query Plans
subject: core-cs
minutes: 45
description: How B-tree indexes speed up lookups, single-column, composite and unique indexes, reading EXPLAIN and EXPLAIN ANALYZE output, when the planner ignores an index, and a before-and-after experiment on 100,000 generated rows.
---
# Indexes, EXPLAIN and query optimisation

A query that takes 5 ms on 50 rows can take seconds on 5 million. The usual fix is not a faster server but an
**index**, and the tool that tells you whether an index is used is **EXPLAIN**.

## What an index is

Think of the index at the back of a textbook. To find "normalisation" you do not read every page; you look it up in a
sorted list that points to page numbers. A database index is the same: a separate, sorted structure that maps column
values to the locations of rows.

Without an index, PostgreSQL must do a **sequential scan**: read every row and test the condition. With an index on the
filtered column, it can jump straight to the matching rows.

### B-tree: the default index

`CREATE INDEX` builds a **B-tree** unless you ask for something else. A B-tree is a balanced tree whose nodes hold many
sorted keys, so it stays shallow: even millions of rows need only a few levels. That gives:

| Operation | Without index | With B-tree index |
|---|---|---|
| Find rows where `col = value` | O(n) scan | O(log n) descent, then the matches |
| Range `col BETWEEN a AND b` | O(n) scan | Descend to `a`, walk the sorted leaves to `b` |
| `ORDER BY col` | Sort the rows | Read the index in order (sometimes) |

B-trees support `=`, `<`, `<=`, `>`, `>=`, `BETWEEN`, `IN`, and `LIKE 'prefix%'` (with suitable collation
settings). PostgreSQL has other index types (Hash, GIN for arrays and full-text search, GiST for geometry), but B-tree
covers most needs.

### Kinds of index

```sql
CREATE INDEX idx_students_city ON students (city);                       -- single column
CREATE UNIQUE INDEX idx_students_email ON students (email);              -- also enforces uniqueness
CREATE INDEX idx_enrol_course_marks ON enrolments (course_id, marks);    -- composite (multi-column)
DROP INDEX idx_students_city;
```

- `PRIMARY KEY` and `UNIQUE` constraints **automatically** create a unique index.
- Foreign keys do **not** get an index automatically in PostgreSQL (MySQL's InnoDB does create one). Index foreign key
  columns you join or filter on.

### Composite indexes and the leftmost prefix rule

An index on `(company, applied_on)` is sorted by `company` first, then by `applied_on` within each company, like a
phone book sorted by surname and then first name.

| Query condition | Can it use the `(company, applied_on)` index well? |
|---|---|
| `company = 'X'` | Yes (leftmost column) |
| `company = 'X' AND applied_on >= '2026-03-01'` | Yes, both columns |
| `applied_on = '2026-03-01'` alone | Not efficiently: skipping the first column is like finding everyone named "Ravi" in a phone book sorted by surname |

Put the column used with `=` first and the range column second.

## The cost of indexes

Indexes are not free:

- every `INSERT`, `UPDATE` and `DELETE` must also update every index on the table;
- they use disk space and memory;
- an index the planner never uses is pure overhead.

Index columns that appear in frequent `WHERE`, `JOIN` and `ORDER BY` clauses, and that are **selective** (each value
matches a small fraction of rows). A column like `is_active`, where 90% of rows are `true`, is a poor candidate for
that value: reading most of the table through an index is slower than one sequential scan.

## Reading EXPLAIN

`EXPLAIN` shows the **plan** the planner chose, with estimated costs. `EXPLAIN ANALYZE` actually **runs** the query and
adds real timings and row counts. (Because it runs the query, wrap `EXPLAIN ANALYZE` of an `UPDATE` or `DELETE` in a
transaction you roll back.)

```text
Seq Scan on applications  (cost=0.00..2136.00 rows=10 width=38) (actual time=2.014..6.874 rows=5 loops=1)
  Filter: (student_id = 4242)
  Rows Removed by Filter: 99995
Execution Time: 6.894 ms
```

| Part | Meaning |
|---|---|
| `Seq Scan` | The node type: read the whole table |
| `cost=0.00..2136.00` | Planner's estimate in arbitrary units: startup cost .. total cost |
| `rows=10` (first) | Estimated rows |
| `actual time=... rows=5` | Real time in ms and the real row count (ANALYZE only) |
| `Rows Removed by Filter: 99995` | Work wasted reading rows that did not match: the signal that an index may help |

Common node types:

| Node | What it does |
|---|---|
| `Seq Scan` | Reads every row |
| `Index Scan` | Walks the index, fetches each matching row |
| `Index Only Scan` | Answers from the index alone, never touching the table |
| `Bitmap Index Scan` + `Bitmap Heap Scan` | Collects matching row locations from the index, then reads them in physical order (good for a moderate number of rows) |
| `Hash Join`, `Nested Loop`, `Merge Join` | The three ways to join two inputs |
| `Sort`, `HashAggregate` | Sorting and `GROUP BY` |

Plans are trees: read from the most indented line outwards.

## The experiment: 100,000 rows

Create a test table and fill it with `generate_series`, which produces a row per number:

```sql
CREATE TABLE applications (
    app_id      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id  INT          NOT NULL,
    company     VARCHAR(40)  NOT NULL,
    status      VARCHAR(12)  NOT NULL,
    applied_on  DATE         NOT NULL,
    cgpa        NUMERIC(4,2) NOT NULL
);

INSERT INTO applications (student_id, company, status, applied_on, cgpa)
SELECT (random() * 9999)::int + 1,
       'Company ' || ((random() * 199)::int + 1),
       (ARRAY['applied', 'shortlisted', 'rejected', 'offered'])[(random() * 3)::int + 1],
       DATE '2026-01-01' + (random() * 180)::int,
       ROUND((5 + random() * 5)::numeric, 2)
FROM generate_series(1, 100000);

ANALYZE applications;      -- refresh the planner's statistics
```

**Before:**

```sql
EXPLAIN ANALYZE SELECT * FROM applications WHERE student_id = 4242;
```

You get a `Seq Scan` that removes about 99,990 rows. Note the execution time.

**Add the index and measure again:**

```sql
CREATE INDEX idx_applications_student ON applications (student_id);
EXPLAIN ANALYZE SELECT * FROM applications WHERE student_id = 4242;
```

```text
Bitmap Heap Scan on applications  (cost=4.37..41.31 rows=10 width=38) (actual time=0.061..0.068 rows=5 loops=1)
  Recheck Cond: (student_id = 4242)
  ->  Bitmap Index Scan on idx_applications_student  (cost=0.00..4.37 rows=10 width=0) (actual ...)
        Index Cond: (student_id = 4242)
Execution Time: 0.402 ms
```

On one laptop the time dropped from about 7 ms to under 1 ms. Your numbers will differ; what matters is the change of
plan and the order-of-magnitude difference, which grows with the table. Run each query a few times: the first run may
be slower while data is loaded into memory.

## When the planner ignores your index

| Situation | Example | Why |
|---|---|---|
| Low selectivity | A value that matches most of the table | A sequential scan is cheaper |
| Function or arithmetic on the column | `WHERE student_id + 0 = 4242`, `WHERE LOWER(email) = ...` | The index stores `student_id`, not `student_id + 0`; use an **expression index** such as `ON students (LOWER(email))` |
| Leading wildcard | `WHERE name LIKE '%rao'` | A sorted index cannot help find a suffix |
| Skipping the first column of a composite index | `WHERE applied_on = ...` on `(company, applied_on)` | Leftmost prefix rule |
| Tiny table | 50 rows | Reading everything is already cheap |
| Stale statistics | After a bulk load | Run `ANALYZE` |

## Basic optimisation checklist

1. Measure first with `EXPLAIN ANALYZE`; do not guess.
2. Select only the columns you need instead of `SELECT *`.
3. Index foreign keys used in joins and columns used in selective filters.
4. Keep the indexed column bare in `WHERE` (move arithmetic to the other side: `created >= NOW() - INTERVAL '7 days'`).
5. Avoid `OFFSET` on huge page numbers; use "keyset" pagination (`WHERE id > last_seen_id ORDER BY id LIMIT 20`).
6. Re-measure after every change, and drop indexes that do not help.

## Lab

1. Build the `applications` table with 100,000 rows as above.
2. Record `EXPLAIN ANALYZE` output and time for `WHERE student_id = 4242`, add the index, and record it again.
3. Create a composite index `(company, applied_on)`. Show with `EXPLAIN` that
   `WHERE company = 'Company 17' AND applied_on >= '2026-03-01'` uses it and that `WHERE applied_on = '2026-03-01'`
   alone does not.
4. Index `status` and compare `EXPLAIN ANALYZE` for `WHERE status = 'offered'` before and after. Each status matches
   tens of thousands of rows: is the gain worth the extra write cost? Explain your decision.
5. Write the results in `indexing.md`: each query, both plans, both timings, and one sentence of explanation.

## Check yourself

1. Why does an index make `INSERT` slower?
2. You have an index on `(company, applied_on)`. Which of these can use it efficiently: `company = 'X'`,
   `applied_on = '2026-03-01'`, `company = 'X' AND applied_on > '2026-03-01'`?
3. What is the difference between `EXPLAIN` and `EXPLAIN ANALYZE`?
