---
type: notes
title: "W6 · S2 · Subqueries, EXISTS and Set Operations"
slug: w06-s2-subqueries-exists-set-operations
topic: Subqueries & Set Operations
subject: core-cs
minutes: 40
description: Scalar, IN and correlated subqueries, EXISTS and NOT EXISTS, the NOT IN NULL trap, derived tables, and combining results with UNION, UNION ALL, INTERSECT and EXCEPT.
---
# Subqueries, EXISTS and set operations

A **subquery** is a `SELECT` inside another statement. It lets you answer a question in steps: first compute
something, then use it. All examples use the `shop` database from S1.

## Scalar subqueries: one value

A scalar subquery returns exactly one row and one column, so you can use it anywhere a single value fits.

```sql
-- Products priced above the average product price
SELECT name, price
FROM products
WHERE price > (SELECT AVG(price) FROM products)
ORDER BY price DESC;
```

```text
       name        |  price
-------------------+---------
 Running Shoes     | 2999.00
 Bluetooth Speaker | 2499.00
 USB-C Charger     | 1299.00
```

The inner query runs once (average 1255.38), then the outer query compares every row with it. You cannot write
`WHERE price > AVG(price)` directly, because aggregates are not allowed in `WHERE`.

If a "scalar" subquery returns more than one row, PostgreSQL raises an error:
`more than one row returned by a subquery used as an expression`.

## IN subqueries: a list of values

```sql
-- Customers who ordered in March 2026
SELECT full_name
FROM customers
WHERE customer_id IN (SELECT customer_id FROM orders WHERE order_date >= '2026-03-01')
ORDER BY full_name;
```

The subquery produces a list of customer ids; `IN` checks membership. Duplicates in the list do not matter.

## Correlated subqueries: run once per outer row

A **correlated** subquery refers to a column of the outer query, so its result changes from row to row.

```sql
-- Products priced above the average of THEIR OWN category
SELECT p.name, p.price, p.category_id
FROM products p
WHERE p.price > (
    SELECT AVG(p2.price)
    FROM products p2
    WHERE p2.category_id = p.category_id      -- refers to the outer row
)
ORDER BY p.category_id;
```

```text
       name        |  price  | category_id
-------------------+---------+-------------
 Bluetooth Speaker | 2499.00 |           1
 SQL Handbook      |  549.00 |           2
 Running Shoes     | 2999.00 |           3
```

Read it as: "for each product `p`, compute the average price of products in `p`'s category, and keep `p` if it is more
expensive." The Gift Card is never kept: its category is NULL, so `p2.category_id = NULL` matches nothing and the
average is NULL.

Conceptually the inner query runs once per outer row. The planner often rewrites it into something faster, but on
large tables a correlated subquery can be slow; next session you will write the same query with a CTE or window
function.

## EXISTS and NOT EXISTS

`EXISTS (subquery)` is true if the subquery returns **at least one row**. The selected columns do not matter, so the
convention is `SELECT 1`.

```sql
-- Customers who never ordered
SELECT c.full_name
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id
);

-- Products never sold
SELECT p.name
FROM products p
WHERE NOT EXISTS (
    SELECT 1 FROM order_items oi WHERE oi.product_id = p.product_id
);
```

The first returns Karthik Iyer, Meera Joshi and Asha R; the second returns the Gift Card. You now have two ways to write
an anti-join: `LEFT JOIN ... IS NULL` (S1) and `NOT EXISTS`. Both are fine; `NOT EXISTS` often reads more like the
question.

### The NOT IN NULL trap

Find categories that have no products. This looks right but returns **nothing**:

```sql
SELECT name FROM categories
WHERE category_id NOT IN (SELECT category_id FROM products);     -- 0 rows!
```

The subquery's list contains a NULL (the Gift Card). `4 NOT IN (1, 2, 3, NULL)` means
`4 <> 1 AND 4 <> 2 AND 4 <> 3 AND 4 <> NULL`, and `4 <> NULL` is unknown, so the whole condition is never true.

Fixes:

```sql
SELECT name FROM categories
WHERE category_id NOT IN (SELECT category_id FROM products WHERE category_id IS NOT NULL);

SELECT c.name FROM categories c
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.category_id = c.category_id);
```

Both return Toys. Prefer `NOT EXISTS` whenever the subquery column can be NULL.

## Derived tables: a subquery in FROM

A subquery in `FROM` acts as a temporary table. It must have an alias.

```sql
-- Average order value: first total each order, then average the totals
SELECT ROUND(AVG(order_total), 2) AS avg_order_value
FROM (
    SELECT order_id, SUM(quantity * unit_price) AS order_total
    FROM order_items
    GROUP BY order_id
) AS t;
```

Result: `2432.90`. Averaging `quantity * unit_price` directly would give the average **line**, not the average
**order**. Aggregating in two steps is a pattern you will use constantly.

## Set operations

Set operations stack the results of two queries **vertically**. Both queries must return the same number of columns
with compatible types; the column names come from the first query.

| Operator | Returns | Duplicates |
|---|---|---|
| `UNION` | Rows in either result | Removed |
| `UNION ALL` | Rows in either result | Kept (faster: no de-duplication) |
| `INTERSECT` | Rows in both results | Removed |
| `EXCEPT` | Rows in the first result but not the second | Removed |

```sql
-- Customers who ordered in January AND in March
SELECT customer_id FROM orders WHERE order_date < '2026-02-01'
INTERSECT
SELECT customer_id FROM orders WHERE order_date >= '2026-03-01'
ORDER BY 1;                     -- returns 1 and 2

-- Customers who ordered in January but NOT in February
SELECT customer_id FROM orders WHERE order_date < '2026-02-01'
EXCEPT
SELECT customer_id FROM orders WHERE order_date >= '2026-02-01' AND order_date < '2026-03-01'
ORDER BY 1;                     -- returns 2
```

An `ORDER BY` at the end sorts the combined result. Oracle calls `EXCEPT` `MINUS`; MySQL supports `INTERSECT` and
`EXCEPT` only in recent 8.0 releases, so check your version.

Joins versus set operations: a join adds **columns** from another table side by side; a set operation adds **rows** from
another query underneath.

## Choosing a tool

| Question shape | Usual tool |
|---|---|
| Compare each row with one overall number | Scalar subquery |
| Keep rows whose key appears in another table | `IN` or `EXISTS` (or an inner join) |
| Keep rows whose key does **not** appear elsewhere | `NOT EXISTS` or `LEFT JOIN ... IS NULL` |
| Compare each row with its own group's number | Correlated subquery (or a window function, S3) |
| Aggregate an aggregate | Derived table or CTE |
| Combine two lists of the same shape | `UNION` / `INTERSECT` / `EXCEPT` |

## Lab

Write each in your scratch file with a comment, and say which tool from the table you used:

1. Customers who never ordered: write it three ways (`LEFT JOIN`, `NOT EXISTS`, `NOT IN`), and explain why `NOT IN` is
   safe here but not in general.
2. Products priced above their category average (correlated subquery).
3. The most expensive product in each category (correlated subquery comparing with `MAX`).
4. Customers whose total spend is above the average customer spend (derived table).
5. Orders whose total is larger than every order placed in January (`> ALL (...)` or `> (SELECT MAX ...)`).
6. Categories sold in both January and March (`INTERSECT`).
7. Cities that have customers but no orders from that city (`EXCEPT`).
8. A single list of names from `customers` and `employees`, labelled with a `source` column, using `UNION ALL`.

## Check yourself

1. What is the difference between a correlated and a non-correlated subquery?
2. `NOT IN (SELECT category_id FROM products)` returns no rows even though Toys has no products. Explain why.
3. When would you choose `UNION ALL` over `UNION`?
