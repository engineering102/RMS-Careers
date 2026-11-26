---
type: notes
title: "W16 · S4 · groupby, merge and Pivot Tables"
slug: w16-s4-groupby-merge-pivot
topic: Pandas Aggregation
subject: programming-fundamentals
minutes: 40
description: Summarising and combining data in Pandas with groupby and named aggregation, merge and concat, pivot tables and crosstab, each mapped to SQL, ending with ten business questions.
---
# groupby, merge and pivot tables

Cleaning gave you trustworthy rows. Now you turn rows into answers: totals per city, the best month, the share of each
category. This is SQL's `GROUP BY` and `JOIN`, in Pandas.

## The data

```python
import pandas as pd

orders = pd.DataFrame({
    "order_id": [1, 2, 3, 4, 5, 6, 7, 8],
    "customer_id": [10, 11, 10, 12, 13, 11, 10, 14],
    "product_id": ["P1", "P2", "P2", "P3", "P1", "P3", "P3", "P9"],
    "qty": [1, 2, 1, 5, 1, 3, 2, 1],
    "order_date": pd.to_datetime(["2026-01-03", "2026-01-15", "2026-02-02", "2026-02-09",
                                  "2026-02-20", "2026-03-04", "2026-03-18", "2026-03-30"]),
})
products = pd.DataFrame({
    "product_id": ["P1", "P2", "P3"],
    "category": ["Laptop", "Phone", "Accessory"],
    "price": [55000, 20000, 800],
})
customers = pd.DataFrame({
    "customer_id": [10, 11, 12, 13, 14],
    "city": ["Pune", "Chennai", "Pune", "Hyderabad", "Chennai"],
})
```

## merge: joining tables

```python
sales = orders.merge(products, on="product_id", how="left")
sales["revenue"] = sales["qty"] * sales["price"]
sales = sales.merge(customers, on="customer_id", how="left")
```

| SQL | Pandas `how=` | Keeps |
|---|---|---|
| `INNER JOIN` | `"inner"` (the default) | only keys present in both |
| `LEFT JOIN` | `"left"` | every left row; missing right values become `NaN` |
| `RIGHT JOIN` | `"right"` | every right row |
| `FULL OUTER JOIN` | `"outer"` | everything |

Order 8 refers to product `P9`, which is not in `products`. With `how="left"` it survives with `NaN` price; with
`how="inner"` it silently disappears. Find such rows before you decide:

```python
check = orders.merge(products, on="product_id", how="left", indicator=True)
print(check["_merge"].value_counts())        # both: 7, left_only: 1
```

Two more options worth using:

- `left_on="cust", right_on="customer_id"` when the key columns have different names.
- `validate="many_to_one"` raises an error if the right table has duplicate keys. A duplicated key in a lookup table
  multiplies your rows, which inflates every total afterwards.

## concat: stacking tables

`merge` joins side by side on a key; `concat` stacks frames that share columns (SQL `UNION ALL`):

```python
jan = pd.DataFrame({"city": ["Pune"], "revenue": [55000]})
feb = pd.DataFrame({"city": ["Chennai"], "revenue": [40000]})
both = pd.concat([jan, feb], ignore_index=True)
```

## groupby: split, apply, combine

`groupby` **splits** rows into groups, **applies** an aggregation to each group and **combines** the results.

```python
sales.groupby("city")["revenue"].sum()                 # one Series, indexed by city
sales.groupby("city")["revenue"].agg(["sum", "mean", "count"])
```

**Named aggregation** gives clear column names and a flat result, which is the form to use in reports:

```python
summary = (
    sales.groupby("city", as_index=False)
    .agg(orders=("order_id", "count"),
         units=("qty", "sum"),
         revenue=("revenue", "sum"),
         avg_order=("revenue", "mean"))
    .sort_values("revenue", ascending=False)
)
```

Group by several columns or by a date part:

```python
sales.groupby(["city", "category"], as_index=False)["revenue"].sum()
sales.groupby(sales["order_date"].dt.to_period("M"))["revenue"].sum()     # revenue per month
```

| SQL | Pandas |
|---|---|
| `GROUP BY city` + `SUM(revenue)` | `groupby("city")["revenue"].sum()` |
| `COUNT(DISTINCT customer_id)` | `groupby("city")["customer_id"].nunique()` |
| `HAVING SUM(revenue) > 50000` | `.agg(...)` then filter the result: `summary[summary["revenue"] > 50000]` |

### transform: a group value on every row

`agg` returns one row per group. `transform` returns a value for **every original row**, which is how you compute
shares or compare a row with its group (like a SQL window function `SUM(...) OVER (PARTITION BY city)`):

```python
sales["city_total"] = sales.groupby("city")["revenue"].transform("sum")
sales["share_of_city"] = (sales["revenue"] / sales["city_total"]).round(3)
```

## pivot_table and crosstab

A **pivot table** puts one variable down the rows, another across the columns, and an aggregate in each cell:

```python
pivot = pd.pivot_table(
    sales.dropna(subset=["category"]),
    index="city",
    columns="category",
    values="revenue",
    aggfunc="sum",
    fill_value=0,
    margins=True,           # adds an "All" row and column with totals
)
```

`pd.crosstab` counts how often combinations occur. `normalize="index"` turns counts into row percentages:

```python
pd.crosstab(sales["city"], sales["category"])
pd.crosstab(sales["city"], sales["category"], normalize="index").round(2)
```

Use a **pivot table** when you need sums or averages of a value, and **crosstab** when you need counts or shares.

## Reading the output correctly

- A `groupby` result is indexed by the group keys. Use `as_index=False` or `.reset_index()` to get them back as columns.
- `count` ignores `NaN`; `size` counts rows including `NaN`.
- `mean` of a 0/1 column is a rate: `groupby("branch")["placed"].mean()` is the placement rate per branch.

## Lab: ten business questions

Using your own cleaned dataset (or the sales data above), answer ten questions in `data_wrangling.ipynb`. Use
`groupby`, `merge`, `pivot_table` and `crosstab` **at least once each**, and write the equivalent SQL in a comment next
to each answer. Example set for sales data:

1. Total revenue, and number of orders.
2. Revenue per city, highest first.
3. Average order value per category.
4. Number of distinct customers per city.
5. The best month by revenue.
6. Cities whose revenue is above ₹50,000 (the `HAVING` question).
7. Each order's share of its city's revenue (`transform`).
8. A city × category revenue pivot with totals.
9. The share of orders per category within each city (`crosstab` with `normalize`).
10. Orders whose product is missing from the catalogue (`indicator=True`), and what you did about them.

```python
# Q2. SELECT city, SUM(revenue) AS revenue FROM sales GROUP BY city ORDER BY revenue DESC;
q2 = sales.groupby("city", as_index=False)["revenue"].sum().sort_values("revenue", ascending=False)
q2
```

Finish the notebook with a short Markdown summary of your three most interesting findings.

## Check yourself

1. You merge 1,000 orders with a products table and get 1,040 rows. What most likely happened, and which `merge`
   option would have caught it?
2. What is the difference between `groupby("city")["revenue"].agg("sum")` and `.transform("sum")`?
3. Which would you use to show the percentage of students placed in each branch by company tier: `pivot_table` or
   `crosstab`? Why?
