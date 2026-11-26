---
type: resource
title: "W7 · Cheat Sheet: ER Design, Normal Forms, Indexes and Transactions"
slug: w07-cheat-sheet
topic: Week 7 Reference
subject: core-cs
minutes: 10
description: One-page reference for Week 7 — ER-to-table mapping, normal forms, index rules and EXPLAIN, ACID and isolation levels, psycopg parameterised queries, and this week's deliverable and career task.
---
# Week 7 cheat sheet

## ER → tables

| ER element | Table design |
|---|---|
| Entity | Table with a primary key |
| 1 : N | Foreign key on the N side |
| 1 : 1 | Foreign key + `UNIQUE` on one side |
| M : N | Junction table `(a_id, b_id)` with a composite primary key |
| Weak entity | Primary key includes the owner's key; `ON DELETE CASCADE` |
| Multivalued attribute | Own table `(owner_id, value)` |
| Derived attribute | Do not store; compute it |
| Relationship attributes | On the relationship (junction) table |

## Normal forms

| Form | Rule | Removes |
|---|---|---|
| 1NF | Atomic values, no repeating groups | Lists in a cell |
| 2NF | 1NF + no partial dependency on part of a composite key | `roll_no → name` in `(roll_no, course)` table |
| 3NF | 2NF + no transitive dependency (non-key → non-key) | `roll_no → dept → hod` |
| BCNF | Every determinant is a super key | `teacher → subject` when teacher is not a key |

Anomalies: **insertion** (cannot add a fact without an unrelated one), **update** (same fact in many rows),
**deletion** (deleting one fact loses another). Denormalise only on purpose, with a plan to keep copies correct.

## Indexes

```sql
CREATE INDEX idx_t_col ON t (col);
CREATE INDEX idx_t_a_b ON t (a, b);          -- leftmost prefix: helps a, and a + b; not b alone
CREATE UNIQUE INDEX idx_t_email ON t (email);
CREATE INDEX idx_t_lower_email ON t (LOWER(email));   -- expression index
EXPLAIN ANALYZE SELECT ...;                   -- runs the query; shows real time and rows
```

- PK and `UNIQUE` create indexes automatically; foreign keys do **not** (PostgreSQL).
- Index is skipped for: low selectivity, functions on the column, `LIKE '%x'`, tiny tables, stale stats (`ANALYZE`).
- Every index slows `INSERT` / `UPDATE` / `DELETE`.

| Plan node | Meaning |
|---|---|
| `Seq Scan` | Reads every row |
| `Index Scan` / `Index Only Scan` | Uses the index (only-scan: never touches the table) |
| `Bitmap Heap Scan` | Index finds row locations, then reads them in order |

## Transactions

```sql
BEGIN;
UPDATE accounts SET balance = balance - 500 WHERE account_id = 1;
UPDATE accounts SET balance = balance + 500 WHERE account_id = 2;
COMMIT;                      -- or ROLLBACK;
SELECT ... FOR UPDATE;       -- lock rows you will change
```

**ACID:** Atomicity (all or nothing) · Consistency (constraints hold) · Isolation (no half-done work visible) ·
Durability (committed data survives crashes; write-ahead log).

| Level | Dirty | Non-repeatable | Phantom |
|---|---|---|---|
| Read Uncommitted | yes | yes | yes |
| Read Committed (PostgreSQL default) | no | yes | yes |
| Repeatable Read | no | no | yes (no in PostgreSQL) |
| Serializable | no | no | no |

Deadlock: two transactions wait on each other's locks; the database aborts one. Prevent by locking in a fixed order.

## psycopg

```python
import os, psycopg
with psycopg.connect(os.environ["DATABASE_URL"]) as conn:     # commit on success, rollback on error
    rows = conn.execute("SELECT * FROM students WHERE dept_id = %s", (1,)).fetchall()
```

Never build SQL with `+` or f-strings from user input: that is SQL injection. Placeholders are for values only.

## This week

| Item | Details |
|---|---|
| **Deliverable** | `/week-07`: requirements, ER diagram (PNG), normalised `schema.sql`, design notes, indexing experiment and `safe_query.py` for your chosen domain (Weekly Build WB-07) |
| **Practice quiz** | Database Design, Normalisation, Indexing & Transactions (untimed, retakes allowed) |
| **Weekly test** | 15 questions on ER mapping, normal forms, indexes, ACID and two pointers / sliding window, 25 minutes |
| **DSA** | Two pointers and sliding window: Container With Most Water, 3Sum, Longest Substring Without Repeating Characters, Minimum Size Subarray Sum, Permutation in String |
| **Career task** | DBMS interview theory sheet: answer questions on keys, normalisation, ACID and indexing in your own words |
