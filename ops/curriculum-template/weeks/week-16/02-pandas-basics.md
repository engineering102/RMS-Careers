---
type: notes
title: "W16 · S2 · Pandas Series and DataFrames"
slug: w16-s2-pandas-series-dataframes
topic: Pandas
subject: programming-fundamentals
minutes: 40
description: Pandas Series and DataFrames, reading CSV, Excel and SQL, inspecting a dataset, selecting with loc and iloc, boolean filtering and sorting, each shown next to its SQL equivalent.
---
# Pandas Series and DataFrames

You spent Phase 2 asking questions of tables with SQL. **Pandas** gives you the same power inside Python: a table is a
**DataFrame**, and every SQL clause you know has a Pandas method. This session shows them side by side.

## Series and DataFrame

A **Series** is one labelled column: values plus an **index** (the row labels).

```python
import pandas as pd

cgpa = pd.Series([8.1, 7.4, 9.0], index=["Asha", "Ravi", "Meena"], name="cgpa")
cgpa["Ravi"]        # 7.4
cgpa.mean()         # 8.166...
cgpa[cgpa > 8]      # Asha 8.1, Meena 9.0
```

A **DataFrame** is a table of Series that share one index. Each column has its own dtype.

```python
orders = pd.DataFrame({
    "order_id": [101, 102, 103, 104, 105, 106],
    "city": ["Pune", "Chennai", "Pune", "Hyderabad", "Chennai", "Pune"],
    "category": ["Laptop", "Phone", "Phone", "Laptop", "Accessory", "Accessory"],
    "amount": [58000, 21000, 18500, 61000, 1200, 900],
    "order_date": pd.to_datetime(["2026-01-05", "2026-01-07", "2026-02-02",
                                  "2026-02-10", "2026-02-11", "2026-03-01"]),
})
orders.to_csv("orders.csv", index=False)
```

## Reading data

| Source | Pandas | Notes |
|---|---|---|
| CSV | `pd.read_csv("orders.csv", parse_dates=["order_date"])` | `sep=";"`, `encoding="latin-1"`, `usecols=[...]` when needed |
| Excel | `pd.read_excel("sales.xlsx", sheet_name="2026")` | needs `pip install openpyxl` |
| SQL | `pd.read_sql("SELECT * FROM students", conn)` | `conn` is a database connection |
| JSON | `pd.read_json("data.json")` | |
| Parquet | `pd.read_parquet("data.parquet")` | fast, keeps dtypes; needs `pyarrow` |

Reading from SQLite needs nothing extra, because Pandas accepts a `sqlite3` connection directly:

```python
import sqlite3

conn = sqlite3.connect("college.db")
students = pd.read_sql("SELECT * FROM students WHERE cgpa >= ?", conn, params=(7.0,))
```

For PostgreSQL, pass a SQLAlchemy engine instead of a raw connection. Use `params` for values, never string
formatting: the same SQL-injection rule from Week 7 applies here.

## First look at any dataset

Run these every time you open a new dataset, before any analysis:

```python
df = pd.read_csv("orders.csv", parse_dates=["order_date"])
df.shape            # (6, 5): rows, columns
df.head()           # first 5 rows (df.tail(), df.sample(5) also useful)
df.info()           # column names, non-null counts, dtypes, memory
df.describe()       # count, mean, std, min, quartiles, max of numeric columns
df.columns          # Index([...])
df.dtypes
df["city"].value_counts()     # frequency of each value
df["city"].nunique()          # number of distinct values
```

`info()` is the most useful: a non-null count lower than the row count means missing values, and a numeric column
with dtype `object` means some values are text (for example `"1,200"` or `"NA"`). Both are cleaning jobs for S3.

## Selecting columns and rows

```python
df["amount"]                     # one column -> Series
df[["city", "amount"]]           # list of columns -> DataFrame (note the double brackets)
```

**`loc` selects by label, `iloc` by position.**

```python
df.loc[0, "city"]                        # row label 0, column "city"
df.loc[0:2, ["order_id", "amount"]]      # labels 0 to 2 INCLUSIVE
df.iloc[0:2, 0:2]                        # positions 0 and 1, EXCLUSIVE end
df.iloc[-1]                              # last row
df.loc[df["amount"] > 20000, "city"]     # filter rows, pick a column
```

| | `loc` | `iloc` |
|---|---|---|
| Uses | index labels and column names | integer positions |
| Slice end | included | excluded |
| Accepts a boolean mask | yes | only a NumPy array or list, not a Series |

After filtering, row labels keep their old values (for example 0, 3, 5). That is why `loc[0]` and `iloc[0]` can
return different rows. `df.reset_index(drop=True)` renumbers from 0.

## Boolean filtering

```python
df[df["city"] == "Pune"]
df[(df["city"] == "Pune") & (df["amount"] > 1000)]      # AND: & with brackets
df[(df["category"] == "Laptop") | (df["amount"] > 20000)]   # OR: |
df[~(df["city"] == "Pune")]                              # NOT: ~
df[df["city"].isin(["Pune", "Chennai"])]
df[df["amount"].between(1000, 25000)]                    # inclusive on both ends
df.query("city == 'Pune' and amount > 1000")             # same filter as a string
```

## Sorting and adding columns

```python
df.sort_values("amount", ascending=False)
df.sort_values(["city", "amount"], ascending=[True, False])
df.nlargest(3, "amount")

df["amount_with_gst"] = df["amount"] * 1.18           # vectorised, like NumPy
df["month"] = df["order_date"].dt.month
df = df.rename(columns={"amount": "amount_inr"})
df = df.drop(columns=["amount_with_gst"])
```

Most methods **return a new DataFrame** and leave the original alone, so assign the result back (`df = df.sort_values(...)`).
To change some cells of a filtered selection, use one `loc` call:

```python
df.loc[df["city"] == "Pune", "region"] = "West"       # correct
# df[df["city"] == "Pune"]["region"] = "West"         # chained indexing: does not update df
```

## Pandas next to SQL

| SQL | Pandas |
|---|---|
| `SELECT city, amount FROM orders` | `df[["city", "amount"]]` |
| `WHERE amount > 20000` | `df[df["amount"] > 20000]` |
| `WHERE city IN ('Pune','Chennai')` | `df[df["city"].isin(["Pune", "Chennai"])]` |
| `WHERE amount BETWEEN 1000 AND 25000` | `df[df["amount"].between(1000, 25000)]` |
| `ORDER BY amount DESC LIMIT 3` | `df.sort_values("amount", ascending=False).head(3)` |
| `SELECT DISTINCT city` | `df["city"].unique()` or `df["city"].drop_duplicates()` |
| `SELECT COUNT(*)` | `len(df)` |
| `WHERE city IS NULL` | `df[df["city"].isna()]` |

## Lab: explore a public dataset

Choose the dataset you will keep until Mini Project 4: at least 5,000 rows and 8 columns, from data.gov.in, Kaggle or
generated synthetically. It must not contain real personal data. In `week-16/data_wrangling.ipynb`:

1. A Markdown cell with the source link (or generator script), the licence, and what each column means.
2. Load it and run the first-look checklist: `shape`, `head`, `info`, `describe`, `value_counts` on two text columns.
3. Write five questions the data could answer, and answer three of them with filtering and sorting only.
4. Next to each answer, write the equivalent SQL in a comment.
5. List every problem you noticed (missing values, odd types, duplicates, inconsistent spellings). That list is your
   cleaning plan for S3.

## Check yourself

1. After `small = df[df["amount"] > 20000]`, why does `small.loc[2]` raise a `KeyError` on the `orders` data while `small.iloc[2]` works?
2. Why does `df[df["city"] == "Pune" & df["amount"] > 1000]` fail, and how do you fix it?
3. `df.info()` shows `amount` as `object`. What does that tell you?
