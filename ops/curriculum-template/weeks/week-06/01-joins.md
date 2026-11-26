---
type: notes
title: "W6 · S1 · Joins: Inner, Outer, Self and Cross"
slug: w06-s1-joins-inner-outer-self-cross
topic: SQL Joins
subject: core-cs
minutes: 45
description: Combine tables with INNER, LEFT, RIGHT and FULL OUTER joins, self joins and cross joins. Sets up the e-commerce sample schema used all week and shows how to predict a join's result before running it.
---
# Joins: inner, outer, self and cross

Real data is split across tables (that is the point of the relational model), so almost every useful question needs a
**join**. Most join mistakes are conceptual, not syntax errors: the query runs and returns the wrong rows. The cure is
to predict the result on paper before you run it.

## The e-commerce sample schema

You will use this schema all week and in the Weekly Build. Create a database `shop` and run the script.

```sql
DROP TABLE IF EXISTS order_items, orders, products, categories, customers, employees;

CREATE TABLE customers (
    customer_id INT PRIMARY KEY,
    full_name   VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    city        VARCHAR(60),
    signed_up   DATE NOT NULL
);

CREATE TABLE categories (
    category_id INT PRIMARY KEY,
    name        VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE products (
    product_id  INT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    category_id INT REFERENCES categories (category_id),
    price       NUMERIC(10,2) NOT NULL CHECK (price > 0)
);

CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers (customer_id),
    order_date  DATE NOT NULL
);

CREATE TABLE order_items (
    order_id   INT NOT NULL REFERENCES orders (order_id),
    product_id INT NOT NULL REFERENCES products (product_id),
    quantity   INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL,
    PRIMARY KEY (order_id, product_id)
);

CREATE TABLE employees (
    emp_id     INT PRIMARY KEY,
    full_name  VARCHAR(100) NOT NULL,
    department VARCHAR(40) NOT NULL,
    salary     NUMERIC(10,2) NOT NULL,
    manager_id INT REFERENCES employees (emp_id)
);

INSERT INTO customers VALUES
    (1, 'Asha Rao',     'asha@example.com',    'Hyderabad', '2025-11-02'),
    (2, 'Rahul Verma',  'rahul@example.com',   'Pune',      '2025-12-10'),
    (3, 'Imran Khan',   'imran@example.com',   'Bengaluru', '2025-12-15'),
    (4, 'Sneha Patil',  'sneha@example.com',   'Pune',      '2026-01-08'),
    (5, 'Karthik Iyer', 'karthik@example.com', 'Chennai',   '2026-01-20'),
    (6, 'Meera Joshi',  'meera@example.com',   NULL,        '2026-02-11'),
    (7, 'Asha R',       'asha@example.com',    'Hyderabad', '2026-03-01');

INSERT INTO categories VALUES (1, 'Electronics'), (2, 'Books'), (3, 'Fashion'), (4, 'Toys');

INSERT INTO products VALUES
    (1, 'Wireless Mouse',     1,  799.00),
    (2, 'USB-C Charger',      1, 1299.00),
    (3, 'Bluetooth Speaker',  1, 2499.00),
    (4, 'SQL Handbook',       2,  549.00),
    (5, 'Python Notes',       2,  399.00),
    (6, 'Cotton Kurta',       3,  999.00),
    (7, 'Running Shoes',      3, 2999.00),
    (8, 'Gift Card',          NULL, 500.00);

INSERT INTO orders VALUES
    (1, 1, '2026-01-05'), (2, 2, '2026-01-12'), (3, 1, '2026-01-20'),
    (4, 3, '2026-02-03'), (5, 4, '2026-02-14'), (6, 1, '2026-02-25'),
    (7, 2, '2026-03-02'), (8, 3, '2026-03-15'), (9, 1, '2026-03-28'),
    (10, 4, '2026-03-30');

INSERT INTO order_items VALUES
    (1, 1, 2,  799.00), (1, 4, 1,  549.00),
    (2, 3, 1, 2499.00),
    (3, 6, 2,  999.00),
    (4, 2, 1, 1299.00), (4, 5, 3,  399.00),
    (5, 7, 1, 2999.00),
    (6, 4, 2,  549.00), (6, 1, 1,  799.00),
    (7, 6, 1,  999.00), (7, 2, 2, 1299.00),
    (8, 3, 1, 2499.00), (8, 7, 1, 2999.00),
    (9, 5, 1,  399.00),
    (10, 1, 1, 799.00);

INSERT INTO employees VALUES
    (1, 'Lakshmi', 'Engineering', 150000, NULL),
    (2, 'Prakash', 'Engineering', 110000, 1),
    (3, 'Nisha',   'Engineering',  95000, 2),
    (4, 'Vikram',  'Engineering',  95000, 2),
    (5, 'Ananya',  'Sales',        90000, 1),
    (6, 'Rohit',   'Sales',        70000, 5),
    (7, 'Pooja',   'Sales',        65000, 5),
    (8, 'Sameer',  'Support',      50000, 1);
```

The data has deliberate edge cases: the **Gift Card** has no category, **Toys** has no products, three customers
have never ordered, and two customers share an email address.

## How a join works

A join pairs rows from two tables and keeps the pairs that satisfy the `ON` condition. The join **type** decides what
happens to rows that find **no partner**.

| Join | Keeps |
|---|---|
| `INNER JOIN` (or just `JOIN`) | Only rows that matched on both sides |
| `LEFT JOIN` | Every row of the left table; NULLs where the right side had no match |
| `RIGHT JOIN` | Every row of the right table; NULLs where the left side had no match |
| `FULL OUTER JOIN` | Every row of both tables, matched where possible |
| `CROSS JOIN` | Every combination (no `ON`) |

## INNER JOIN

```sql
SELECT p.name AS product, c.name AS category
FROM products p
INNER JOIN categories c ON c.category_id = p.category_id
ORDER BY p.product_id;
```

7 rows. The Gift Card disappears (its `category_id` is NULL, which matches nothing) and Toys disappears (no product
points to it).

## LEFT JOIN

```sql
SELECT p.name AS product, c.name AS category
FROM products p
LEFT JOIN categories c ON c.category_id = p.category_id
ORDER BY p.product_id;
```

8 rows: all products, and the Gift Card's category shows as NULL.

### The anti-join: "rows with no match"

`LEFT JOIN` plus `WHERE right_side.key IS NULL` finds rows that have **no** partner. This is one of the most common
interview queries.

```sql
-- Customers who have never ordered
SELECT c.full_name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_id IS NULL;
```

```text
  full_name
--------------
 Karthik Iyer
 Meera Joshi
 Asha R
```

### The ON versus WHERE trap

With an outer join, a condition on the right table behaves differently in `ON` and in `WHERE`:

```sql
-- Every customer, with their March orders if any (customers without March orders are kept)
SELECT c.full_name, o.order_id
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.order_date >= '2026-03-01'
ORDER BY c.customer_id;

-- Only customers who HAVE March orders (the WHERE removes the NULL rows: this is now an inner join)
SELECT c.full_name, o.order_id
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_date >= '2026-03-01'
ORDER BY c.customer_id;
```

Rule: conditions that decide **which rows match** go in `ON`; conditions that decide **which result rows you keep** go
in `WHERE`.

## RIGHT and FULL OUTER JOIN

`A RIGHT JOIN B` is the same as `B LEFT JOIN A`. Most teams write only `LEFT JOIN` and put the "keep everything" table
first, which is easier to read.

```sql
SELECT p.name AS product, c.name AS category
FROM products p
FULL OUTER JOIN categories c ON c.category_id = p.category_id
ORDER BY c.category_id, p.product_id;
```

9 rows: the 7 matches, Toys with a NULL product, and the Gift Card with a NULL category. MySQL has no `FULL OUTER
JOIN`; there you combine a `LEFT JOIN` and a `RIGHT JOIN` with `UNION`.

## Joining more than two tables

Follow the foreign keys one step at a time. Revenue per category walks `order_items → products → categories`:

```sql
SELECT c.name AS category, SUM(oi.quantity * oi.unit_price) AS revenue
FROM order_items oi
JOIN products p   ON p.product_id = oi.product_id
JOIN categories c ON c.category_id = p.category_id
GROUP BY c.name
ORDER BY revenue DESC;
```

```text
  category   | revenue
-------------+----------
 Electronics | 12091.00
 Fashion     |  8995.00
 Books       |  3243.00
```

### Counting with outer joins

```sql
SELECT c.full_name, COUNT(o.order_id) AS orders
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.full_name
ORDER BY orders DESC, c.full_name;
```

Use `COUNT(o.order_id)`, not `COUNT(*)`. For a customer with no orders, the joined row still exists (with NULLs), so
`COUNT(*)` would wrongly report 1.

## Self join

A table joined to itself, using two aliases. Classic case: employees and their managers live in the same table.

```sql
SELECT e.full_name AS employee, m.full_name AS manager
FROM employees e
LEFT JOIN employees m ON m.emp_id = e.manager_id
ORDER BY e.emp_id;
```

`LEFT JOIN` keeps Lakshmi, who has no manager. With an inner join she would vanish.

## Cross join

Every row paired with every row: 7 customers × 4 categories = 28 rows.

```sql
SELECT c.full_name, cat.name
FROM customers c
CROSS JOIN categories cat;
```

Useful for generating combinations (every student × every subject for a marks sheet). Dangerous by accident: a join
with a missing or wrong `ON` condition multiplies rows the same way.

## Predicting a join result

Before running a join, sketch it:

1. Write the key column of each table side by side.
2. Draw lines between matching keys. A key that appears twice on one side **duplicates** rows on the other.
3. For each unmatched row, decide from the join type whether it survives with NULLs or disappears.
4. Count the rows you expect. Then run the query and compare.

If the count is larger than expected, you probably joined on a non-unique column or forgot a condition.

## Lab: join drills on the shop schema

Write each as a commented query in a scratch file. Predict the row count first.

1. Every order with the customer's name and the order date.
2. Every order line with product name, quantity and line total (`quantity * unit_price`).
3. All products with their category name, including products without a category.
4. All categories with the number of products in each, including Toys with 0.
5. Customers who have never placed an order (anti-join).
6. Products that have never been sold (anti-join on `order_items`).
7. Every employee with their manager's name, and the manager's salary.
8. Employees who earn more than their manager (self join).
9. Total amount spent by each customer, including customers who spent nothing (show 0 with `COALESCE`).
10. Every customer–category pair (cross join), then explain why it has 28 rows.

## Check yourself

1. `products` has 8 rows and `categories` has 4. How many rows does `products FULL OUTER JOIN categories` return on
   this data, and why?
2. Why does `COUNT(*)` give the wrong answer for customers with no orders in a `LEFT JOIN`?
3. You moved `o.order_date >= '2026-03-01'` from `ON` to `WHERE` in a `LEFT JOIN`. What changed in the result?
