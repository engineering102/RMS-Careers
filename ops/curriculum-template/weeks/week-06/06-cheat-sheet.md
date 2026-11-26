---
type: resource
title: "W6 · Cheat Sheet: Joins, Subqueries, CTEs and Window Functions"
slug: w06-cheat-sheet
topic: Week 6 Reference
subject: core-cs
minutes: 10
description: One-page reference for Week 6 — join types, anti-joins, subqueries and the NOT IN trap, set operations, CTEs, window functions, interview patterns, and this week's deliverable and career task.
---
# Week 6 cheat sheet

## Joins

| Join | Keeps |
|---|---|
| `INNER JOIN` | Matches only |
| `LEFT JOIN` | All left rows; NULLs for missing right |
| `RIGHT JOIN` | All right rows (prefer rewriting as `LEFT JOIN`) |
| `FULL OUTER JOIN` | All rows from both (not in MySQL) |
| `CROSS JOIN` | Every combination: rows(A) × rows(B) |
| Self join | Same table twice with two aliases (employee → manager) |

```sql
-- Anti-join: rows in A with no match in B
SELECT a.* FROM a LEFT JOIN b ON b.a_id = a.id WHERE b.a_id IS NULL;
SELECT a.* FROM a WHERE NOT EXISTS (SELECT 1 FROM b WHERE b.a_id = a.id);
```

- Outer join + condition on the right table: in `ON` keeps unmatched rows; in `WHERE` removes them.
- Count children with `COUNT(child.id)`, not `COUNT(*)`, after a `LEFT JOIN`.

## Subqueries

| Kind | Example |
|---|---|
| Scalar | `WHERE price > (SELECT AVG(price) FROM products)` |
| `IN` | `WHERE id IN (SELECT customer_id FROM orders)` |
| Correlated | `WHERE p.price > (SELECT AVG(p2.price) FROM products p2 WHERE p2.category_id = p.category_id)` |
| `EXISTS` | `WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)` |
| Derived table | `FROM (SELECT ... GROUP BY ...) AS t` (alias required) |

**NOT IN trap:** if the subquery returns any NULL, `NOT IN` returns no rows. Use `NOT EXISTS`.

## Set operations

`UNION` (dedupe) · `UNION ALL` (keep duplicates, faster) · `INTERSECT` (in both) · `EXCEPT` (in first, not second).
Same number of columns, compatible types; names come from the first query.

## CTEs

```sql
WITH step1 AS (SELECT ...),
     step2 AS (SELECT ... FROM step1)
SELECT ... FROM step2;

WITH RECURSIVE r AS (
    SELECT ... WHERE parent_id IS NULL          -- anchor
    UNION ALL
    SELECT ... FROM t JOIN r ON t.parent_id = r.id   -- recursive step
)
SELECT * FROM r;
```

## Window functions

```sql
fn() OVER (PARTITION BY group_col ORDER BY sort_col)
```

| Function | Use |
|---|---|
| `ROW_NUMBER()` | Unique 1, 2, 3 (top-N per group, dedupe) |
| `RANK()` | Ties share, then gap: 1, 2, 2, 4 |
| `DENSE_RANK()` | Ties share, no gap: 1, 2, 2, 3 (Nth highest) |
| `LAG(col, n)` / `LEAD(col, n)` | Value n rows before / after (growth, gaps) |
| `SUM(col) OVER (ORDER BY d)` | Running total |
| `AVG(col) OVER (PARTITION BY g)` | Group value next to every row |

Filter on a window result in an outer query or CTE, never in `WHERE`.

## Interview patterns

| Question | Tool |
|---|---|
| Nth highest salary | `DENSE_RANK() ... WHERE dr = N` or `DISTINCT ... LIMIT 1 OFFSET N-1` |
| Duplicates | `GROUP BY col HAVING COUNT(*) > 1`; extras via `ROW_NUMBER() ... rn > 1` |
| Top N per group | `ROW_NUMBER() OVER (PARTITION BY g ORDER BY x DESC)` in a CTE |
| Month-over-month | `DATE_TRUNC('month', d)` + `LAG` |
| Consecutive records | `LAG(col, 1)`, `LAG(col, 2)` or gaps and islands |
| Buckets / pivots | `CASE WHEN ... THEN ... END` (inside `SUM` for pivots) |

## This week

| Item | Details |
|---|---|
| **Deliverable** | `/week-06/analytics_queries.sql` answering the 15-question business brief on the shop schema, plus a README with one-line answers (Weekly Build WB-06) |
| **Practice quiz** | Joins, Subqueries, CTEs & Window Functions (untimed, retakes allowed) |
| **Weekly test** | 15 questions on join results, subqueries, CTEs, window functions and hashing, 25 minutes |
| **DSA** | Hashing: Two Sum, Group Anagrams, Top K Frequent Elements, Longest Consecutive Sequence, Subarray Sum Equals K |
| **Career task** | Solve 10 more SQL practice problems and add an "SQL" section to your DSA tracker |
