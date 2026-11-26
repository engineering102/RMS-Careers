---
type: notes
title: "W6 · S4 · CASE, Functions, Views and Classic Interview SQL"
slug: w06-s4-case-functions-views-interview-sql
topic: Interview SQL
subject: core-cs
minutes: 45
description: CASE expressions, everyday string and date functions, views, and the classic interview questions: Nth highest salary, duplicate detection and consecutive records, each solved more than one way.
---
# CASE, functions, views and classic interview SQL

This session collects the tools that turn correct queries into useful reports, then applies everything from the week to
the questions interviewers ask most often. Examples use the `shop` database from S1.

## CASE: if/else inside a query

```sql
SELECT o.order_id,
       SUM(oi.quantity * oi.unit_price) AS total,
       CASE
           WHEN SUM(oi.quantity * oi.unit_price) >= 3000 THEN 'large'
           WHEN SUM(oi.quantity * oi.unit_price) >= 1500 THEN 'medium'
           ELSE 'small'
       END AS size
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
GROUP BY o.order_id
ORDER BY o.order_id;
```

- Conditions are checked **top to bottom**; the first true one wins. Put the strictest condition first (the same rule
  as Fizz Buzz in Week 1).
- Without `ELSE`, unmatched rows get NULL.
- `CASE` works anywhere an expression does: `SELECT`, `WHERE`, `ORDER BY`, and inside aggregates.

`CASE` inside an aggregate is the portable way to **pivot** rows into columns:

```sql
SELECT category_id,
       SUM(CASE WHEN price >= 1000 THEN 1 ELSE 0 END) AS premium,
       SUM(CASE WHEN price <  1000 THEN 1 ELSE 0 END) AS budget
FROM products
GROUP BY category_id
ORDER BY category_id;
```

## String functions

| Function | Example | Result |
|---|---|---|
| `UPPER`, `LOWER` | `UPPER('asha')` | `ASHA` |
| `LENGTH` | `LENGTH('Asha Rao')` | `8` |
| `TRIM` | `TRIM('  hi  ')` | `hi` |
| `SUBSTRING` | `SUBSTRING('Asha Rao' FROM 1 FOR 4)` | `Asha` |
| `POSITION` | `POSITION('@' IN 'a@b.com')` | `2` |
| `REPLACE` | `REPLACE('a-b-c', '-', '/')` | `a/b/c` |
| `\|\|` or `CONCAT` | `'Asha' \|\| ' ' \|\| 'Rao'` | `Asha Rao` |
| `SPLIT_PART` (PostgreSQL) | `SPLIT_PART('asha@example.com', '@', 2)` | `example.com` |

`'a' || NULL` is NULL, while `CONCAT('a', NULL)` is `'a'`. Wrap nullable columns in `COALESCE` when concatenating
with `||`. In MySQL, `||` means logical OR by default, so use `CONCAT` there.

## Date functions (PostgreSQL)

| Function | Example | Result |
|---|---|---|
| `CURRENT_DATE`, `NOW()` | today's date, current timestamp | |
| `EXTRACT(part FROM d)` | `EXTRACT(MONTH FROM DATE '2026-03-30')` | `3` |
| `DATE_TRUNC('month', d)` | `DATE_TRUNC('month', DATE '2026-03-30')::date` | `2026-03-01` (without `::date` you get a timestamp) |
| `TO_CHAR(d, fmt)` | `TO_CHAR(DATE '2026-03-30', 'Mon YYYY')` | `Mar 2026` |
| Date arithmetic | `DATE '2026-03-30' + 7` | `2026-04-06` |
| Difference in days | `DATE '2026-03-30' - DATE '2026-03-02'` | `28` |
| Intervals | `DATE '2026-01-31' + INTERVAL '1 month'` | `2026-02-28 00:00:00` |

Filter date ranges with a half-open interval so you never miss the last day's times:
`WHERE order_date >= '2026-03-01' AND order_date < '2026-04-01'`.

## Views

A **view** is a saved query with a name. It stores no data of its own; every time you select from it, the query runs.

```sql
CREATE VIEW customer_summary AS
SELECT c.customer_id,
       c.full_name,
       COUNT(DISTINCT o.order_id)                     AS orders,
       COALESCE(SUM(oi.quantity * oi.unit_price), 0)  AS total_spend
FROM customers c
LEFT JOIN orders o       ON o.customer_id = c.customer_id
LEFT JOIN order_items oi ON oi.order_id = o.order_id
GROUP BY c.customer_id, c.full_name;

SELECT * FROM customer_summary WHERE orders = 0;
```

Why teams use views: they hide complex joins behind a simple name, give every report the same definition of a metric,
and can expose only some columns to some users. Change one with `CREATE OR REPLACE VIEW`, remove it with `DROP VIEW`.
A **materialized view** (PostgreSQL) does store the result and must be refreshed; it trades freshness for speed.

## Classic interview questions

### 1. Nth highest salary

Second highest distinct salary (the answer is 110000.00). Three ways, from simplest to most general:

```sql
-- a) Subquery: highest salary below the maximum
SELECT MAX(salary) FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);

-- b) DISTINCT + OFFSET (N - 1 rows skipped)
SELECT DISTINCT salary FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 1;

-- c) DENSE_RANK: works for any N and per department with PARTITION BY
WITH ranked AS (
    SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS dr
    FROM employees
)
SELECT DISTINCT salary FROM ranked WHERE dr = 2;
```

Follow-ups to expect: "What if there is no second salary?" (a returns NULL; b and c return no row), "What about
ties?" (that is why `DISTINCT` and `DENSE_RANK`, not `ROW_NUMBER`), "Do it per department" (add `PARTITION BY
department` to c).

### 2. Duplicate detection

```sql
-- Which emails appear more than once?
SELECT email, COUNT(*) AS n
FROM customers
GROUP BY email
HAVING COUNT(*) > 1;

-- Which rows are the extra copies? Keep the earliest sign-up, flag the rest
SELECT customer_id, full_name, email
FROM (
    SELECT c.*, ROW_NUMBER() OVER (PARTITION BY email ORDER BY signed_up) AS rn
    FROM customers c
) t
WHERE rn > 1;
```

The first finds `asha@example.com` twice; the second returns customer 7, the later sign-up. To delete the copies you
would use the second query's ids in a `DELETE ... WHERE customer_id IN (...)` (after checking the rows first).

### 3. Consecutive records

"Customers who ordered in three consecutive months." Reduce the data to one row per customer per month, then look back
with `LAG`:

```sql
WITH months AS (
    SELECT DISTINCT customer_id, DATE_TRUNC('month', order_date)::date AS month
    FROM orders
),
w AS (
    SELECT customer_id, month,
           LAG(month, 1) OVER (PARTITION BY customer_id ORDER BY month) AS prev1,
           LAG(month, 2) OVER (PARTITION BY customer_id ORDER BY month) AS prev2
    FROM months
)
SELECT DISTINCT customer_id
FROM w
WHERE prev1 = month - INTERVAL '1 month'
  AND prev2 = month - INTERVAL '2 months';
```

Customer 1 ordered in January, February and March. `LAG(month, 2)` looks two rows back. The general technique for
runs of any length is called **gaps and islands**: subtract `ROW_NUMBER()` months from each month, and consecutive
months end up with the same value, which you can `GROUP BY`.

## How to approach any SQL interview question

1. **Restate** the output: which columns, one row per what?
2. **Find the tables** and the join path between them.
3. **Decide the grain**: do you need to aggregate first (CTE), then compare or rank?
4. **Watch for traps**: NULLs, ties, customers with zero rows (outer joins), duplicates from joins.
5. **Write it in steps** with CTEs, run each step, then combine.

## Lab: interview SQL set (15 questions)

Answer each on the `shop` data, with a comment stating the question:

1. Second highest salary, three ways.
2. Third highest salary in each department (no row if a department has fewer than three distinct salaries).
3. Employees earning more than their department's average.
4. Duplicate customer emails and the ids of the extra copies.
5. Customers who ordered in consecutive months.
6. Orders bucketed as small, medium and large with `CASE`, and the count of each bucket.
7. Each customer's email domain (`SPLIT_PART`).
8. Number of orders per weekday name (`TO_CHAR(order_date, 'Day')`).
9. Products whose name contains a space, in upper case.
10. A view `category_revenue` and a query that returns its top category.
11. Customers who signed up but did not order within 30 days of signing up.
12. Month with the highest revenue.
13. Pivot: one row per customer, with January, February and March revenue as three columns.
14. Each order's share of its month's revenue as a percentage.
15. The department with the largest gap between its highest and lowest salary.

## Check yourself

1. What does a `CASE` expression return for a row that matches no `WHEN` and has no `ELSE`?
2. Does a view store data? What happens when you query one?
3. Why is `DENSE_RANK` the right choice for "Nth highest salary" rather than `ROW_NUMBER`?
