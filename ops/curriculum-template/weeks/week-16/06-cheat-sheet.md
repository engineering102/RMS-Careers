---
type: resource
title: "W16 · Cheat Sheet: NumPy, Pandas and SQL Equivalents"
slug: w16-cheat-sheet
topic: Week 16 Reference
subject: programming-fundamentals
minutes: 10
description: One-page reference for Week 16: NumPy essentials, the Pandas first-look and cleaning routine, groupby, merge and pivot syntax next to SQL, BFS and DFS templates, and this week's tasks.
---
# Week 16 cheat sheet

## Setup

```bash
python -m venv .venv && pip install numpy pandas matplotlib seaborn scikit-learn jupyter openpyxl
```

Before every commit: **Restart Kernel and Run All**.

## NumPy

```python
import numpy as np
rng = np.random.default_rng(42)
a = np.arange(10); m = a.reshape(2, 5)
m.shape, m.ndim, m.dtype           # (2, 5) 2 int64
m.sum(axis=0)   # down rows -> one value per column
m.sum(axis=1)   # across columns -> one value per row
a[a > 5]                            # boolean mask (copy)
a[2:5]                              # slice (view!)
np.where(a > 5, "hi", "lo")         # vectorised if/else
(a > 2) & (a < 7)                   # combine masks with & | ~ and brackets
```

Broadcasting: compare shapes from the right; each pair must be equal or contain a 1.

## Pandas first look

```python
df = pd.read_csv("data.csv", parse_dates=["date"])
df.shape; df.head(); df.info(); df.describe()
df["col"].value_counts(); df.isna().sum(); df.duplicated().sum()
```

## Selecting

| Need | Code |
|---|---|
| Columns | `df["a"]` · `df[["a", "b"]]` |
| By label (end included) | `df.loc[rows, cols]` |
| By position (end excluded) | `df.iloc[0:5, 0:2]` |
| Filter | `df[(df.a > 5) & (df.b == "x")]` · `df[df.c.isin([...])]` |
| Set values on a filter | `df.loc[df.a > 5, "flag"] = True` |
| Sort | `df.sort_values(["a", "b"], ascending=[True, False])` |

## Cleaning

```python
df = df.drop_duplicates(subset=["id"])
df["s"] = df["s"].str.strip().str.title()
df["n"] = pd.to_numeric(df["n"], errors="coerce")
df["d"] = pd.to_datetime(df["d"], format="%d/%m/%Y", errors="coerce")
df = df.fillna({"n": df["n"].median(), "s": "Unknown"})
df["band"] = pd.cut(df["n"], bins=[0, 50, 75, 100])
df["code"] = df["s"].map({"A": 1, "B": 2})
```

## Pandas next to SQL

| SQL | Pandas |
|---|---|
| `GROUP BY c` + `SUM(x)` | `df.groupby("c")["x"].sum()` |
| several aggregates | `df.groupby("c", as_index=False).agg(total=("x", "sum"), n=("id", "count"))` |
| `HAVING SUM(x) > 100` | aggregate, then filter the result |
| `SUM(x) OVER (PARTITION BY c)` | `df.groupby("c")["x"].transform("sum")` |
| `LEFT JOIN p USING (k)` | `df.merge(p, on="k", how="left", validate="many_to_one")` |
| `UNION ALL` | `pd.concat([a, b], ignore_index=True)` |
| counts of combinations | `pd.crosstab(df.r, df.c, normalize="index")` |
| sums in a grid | `pd.pivot_table(df, index="r", columns="c", values="x", aggfunc="sum", fill_value=0)` |

## Graph templates

```python
graph = defaultdict(list)               # adjacency list
for u, v in edges: graph[u].append(v); graph[v].append(u)
# BFS: deque, mark visited when you ADD to the queue
# Grid neighbours: (r+1,c) (r-1,c) (r,c+1) (r,c-1), check bounds first
```

## Aptitude starts this week

| Topic | Remember |
|---|---|
| Percentage change | (new − old) / old × 100 |
| Successive changes of a% and b% | a + b + ab/100 (use negatives for decreases) |
| Average | sum / count; adding a value x changes the average by (x − old average) / new count |
| Divisibility by 3 or 9 | sum of digits divisible by 3 or 9 |
| Divisibility by 11 | difference of alternate digit sums is 0 or a multiple of 11 |

## This week

| Item | Details |
|---|---|
| **Deliverable** | `week-16/data_wrangling.ipynb` with Markdown explanations, a cleaning log, ten business questions with SQL equivalents and `clean.csv` (Weekly Build WB-16) |
| **Practice quiz** | NumPy & Pandas: Data Wrangling (untimed, retakes allowed) |
| **Weekly test** | 15 questions on NumPy and Pandas operations, cleaning and graph traversal, 25 minutes |
| **DSA** | Find if Path Exists, Flood Fill, Number of Islands, Rotting Oranges, Clone Graph; Blind 75 sheet added for revision |
| **Career task** | Aptitude stream begins: number system, percentages and averages; solve one timed set and log your score |
