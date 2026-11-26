---
type: notes
title: "W6 · S3 · CTEs and Window Functions"
slug: w06-s3-ctes-window-functions
topic: CTEs & Window Functions
subject: core-cs
minutes: 50
description: Break queries into named steps with WITH, walk hierarchies with a recursive CTE, and use ROW_NUMBER, RANK, DENSE_RANK, LAG, LEAD and running totals for top-N per group and month-over-month growth.
---
# CTEs and window functions

Window functions are one of the most frequently tested SQL topics in placement interviews and online assessments.
CTEs make them readable. Both use the `shop` database from S1.

## Common Table Expressions (WITH)

A **CTE** gives a name to a subquery so the main query can use it like a table. It turns a nested query into a list of
steps you can read top to bottom.

```sql
WITH customer_spend AS (
    SELECT o.customer_id, SUM(oi.quantity * oi.unit_price) AS spend
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY o.customer_id
)
SELECT c.full_name, cs.spend
FROM customer_spend cs
JOIN customers c ON c.customer_id = cs.customer_id
WHERE cs.spend > (SELECT AVG(spend) FROM customer_spend)
ORDER BY cs.spend DESC;
```

```text
  full_name  |  spend
-------------+---------
 Imran Khan  | 7994.00
 Asha Rao    | 6441.00
 Rahul Verma | 6096.00
```

Notice that `customer_spend` is used **twice**: once as a table and once inside the scalar subquery. With a derived
table you would have to write the same subquery twice.

Several CTEs are separated by commas, and each may use the ones before it:

```text
WITH step_one AS (...),
     step_two AS (SELECT ... FROM step_one ...)
SELECT ... FROM step_two;
```

A CTE exists only for the single statement that follows it.

## Recursive CTEs

A recursive CTE has two parts joined by `UNION ALL`: an **anchor** query that produces the starting rows, and a
**recursive** query that refers to the CTE itself and produces the next level. It stops when the recursive part returns
no new rows.

```sql
-- The reporting chain: level 1 is the person with no manager
WITH RECURSIVE chain AS (
    SELECT emp_id, full_name, manager_id, 1 AS level
    FROM employees
    WHERE manager_id IS NULL                       -- anchor
    UNION ALL
    SELECT e.emp_id, e.full_name, e.manager_id, ch.level + 1
    FROM employees e
    JOIN chain ch ON e.manager_id = ch.emp_id      -- recursive step
)
SELECT level, full_name FROM chain ORDER BY level, emp_id;
```

```text
 level | full_name
-------+-----------
     1 | Lakshmi
     2 | Prakash
     2 | Ananya
     2 | Sameer
     3 | Nisha
     3 | Vikram
     3 | Rohit
     3 | Pooja
```

A simpler example generates numbers, which is handy for filling in missing dates or months:

```sql
WITH RECURSIVE n AS (
    SELECT 1 AS x
    UNION ALL
    SELECT x + 1 FROM n WHERE x < 5
)
SELECT x FROM n;
```

Always make sure the recursive step moves towards a stopping condition, or the query runs until it errors out.

## Window functions

An aggregate with `GROUP BY` collapses each group into **one** row. A **window function** computes across a set of
related rows but keeps **every** row. That is what lets you show a value next to its group's total, rank, or previous
value.

```text
function(...) OVER (
    PARTITION BY ...   -- split rows into groups (optional)
    ORDER BY ...       -- order inside each group (needed for ranking, LAG/LEAD, running totals)
)
```

### Aggregate as a window

```sql
SELECT full_name, department, salary,
       ROUND(AVG(salary) OVER (PARTITION BY department), 0) AS dept_avg
FROM employees
ORDER BY department, salary DESC;
```

Every employee row stays, and each one shows its department's average next to it. With `GROUP BY department` you
would get only three rows.

### ROW_NUMBER, RANK and DENSE_RANK

```sql
SELECT full_name, salary,
       ROW_NUMBER() OVER (ORDER BY salary DESC, emp_id) AS row_num,
       RANK()       OVER (ORDER BY salary DESC)         AS rnk,
       DENSE_RANK() OVER (ORDER BY salary DESC)         AS dense
FROM employees
ORDER BY salary DESC, emp_id;
```

```text
 full_name |  salary   | row_num | rnk | dense
-----------+-----------+---------+-----+-------
 Lakshmi   | 150000.00 |       1 |   1 |     1
 Prakash   | 110000.00 |       2 |   2 |     2
 Nisha     |  95000.00 |       3 |   3 |     3
 Vikram    |  95000.00 |       4 |   3 |     3
 Ananya    |  90000.00 |       5 |   5 |     4
 Rohit     |  70000.00 |       6 |   6 |     5
 Pooja     |  65000.00 |       7 |   7 |     6
 Sameer    |  50000.00 |       8 |   8 |     7
```

| Function | Ties | After a tie of two at 3 |
|---|---|---|
| `ROW_NUMBER()` | Always unique (ties broken arbitrarily unless you add a tie-breaker) | 3, 4, 5 |
| `RANK()` | Same rank, then **skips** | 3, 3, 5 |
| `DENSE_RANK()` | Same rank, **no gap** | 3, 3, 4 |

Interview tip: "Nth highest salary" means Nth highest **distinct** salary, which is `DENSE_RANK`.

### Top-N per group

You cannot use a window function in `WHERE` (windows are computed in the `SELECT` step, after `WHERE`). So compute the
rank in a CTE, then filter:

```sql
-- Top 2 products by revenue in each category
WITH product_revenue AS (
    SELECT p.category_id, p.name, SUM(oi.quantity * oi.unit_price) AS revenue
    FROM order_items oi
    JOIN products p ON p.product_id = oi.product_id
    GROUP BY p.category_id, p.name
),
ranked AS (
    SELECT category_id, name, revenue,
           ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY revenue DESC) AS rn
    FROM product_revenue
)
SELECT category_id, name, revenue
FROM ranked
WHERE rn <= 2
ORDER BY category_id, rn;
```

Use `RANK` or `DENSE_RANK` instead of `ROW_NUMBER` if tied products should all be included.

### LAG and LEAD: the previous and next row

`LAG(col)` reads `col` from the previous row in the window's order; `LEAD(col)` reads the next row. The first row's
`LAG` is NULL.

```sql
-- Month-over-month revenue growth
WITH monthly AS (
    SELECT DATE_TRUNC('month', o.order_date)::date AS month,
           SUM(oi.quantity * oi.unit_price) AS revenue
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY 1
)
SELECT month,
       revenue,
       LAG(revenue) OVER (ORDER BY month) AS prev_revenue,
       ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))
             / LAG(revenue) OVER (ORDER BY month), 1) AS growth_pct
FROM monthly
ORDER BY month;
```

```text
   month    | revenue  | prev_revenue | growth_pct
------------+----------+--------------+------------
 2026-01-01 |  6644.00 |              |
 2026-02-01 |  7392.00 |      6644.00 |       11.3
 2026-03-01 | 10293.00 |      7392.00 |       39.2
```

`DATE_TRUNC('month', d)` rounds a date down to the first of its month (PostgreSQL; in MySQL use
`DATE_FORMAT(d, '%Y-%m-01')`). `::date` casts the result back to a date. `GROUP BY 1` means "group by the first
selected column".

With `PARTITION BY`, `LAG` stays inside each group. Days between a customer's consecutive orders:

```sql
SELECT order_id, order_date,
       order_date - LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date) AS days_gap
FROM orders
WHERE customer_id = 1
ORDER BY order_date;
```

Subtracting two `DATE` values in PostgreSQL gives a number of days.

### Running totals

`SUM(...) OVER (ORDER BY ...)` adds up everything from the first row to the current row:

```sql
WITH daily AS (
    SELECT o.order_date, SUM(oi.quantity * oi.unit_price) AS revenue
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY o.order_date
)
SELECT order_date, revenue,
       SUM(revenue) OVER (ORDER BY order_date) AS running_total
FROM daily
ORDER BY order_date;
```

The last row's running total is the total revenue, 24329.00.

One subtlety: with `ORDER BY` and no explicit frame, the default frame is "from the start up to the current row
**and its ties**". If two rows share the same `order_date`, both show the combined total. For a strict row-by-row
total, write `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. Here `daily` has one row per date, so the two agree.

## Lab: top-N per group and month-over-month growth

1. The highest-paid employee in each department (`ROW_NUMBER` with `PARTITION BY department`).
2. Every employee with their rank inside their department, using `DENSE_RANK`.
3. The top 2 products by revenue in each category, then change it to include ties.
4. Month-over-month revenue growth as a percentage.
5. A running total of revenue by day, using an explicit `ROWS` frame.
6. Each customer's first and latest order dates, and the number of days between them.
7. For each order, the customer's previous order date (`LAG`) and next order date (`LEAD`).
8. Each employee's salary as a percentage of their department's total (`SUM(...) OVER (PARTITION BY ...)`).
9. Rewrite S2's "products above their category average" with a window function instead of a correlated subquery.
10. The full management chain as a recursive CTE, adding a `path` column like `Lakshmi > Prakash > Nisha`
    (hint: carry `full_name::text` in the anchor and `ch.path || ' > ' || e.full_name` in the recursive step).

## Check yourself

1. What is the key difference between `SUM(salary) ... GROUP BY department` and
   `SUM(salary) OVER (PARTITION BY department)`?
2. Salaries are 100, 90, 90, 80. What do `RANK()` and `DENSE_RANK()` give the value 80?
3. Why must "top 3 per group" filter the rank in an outer query or CTE rather than in `WHERE`?
