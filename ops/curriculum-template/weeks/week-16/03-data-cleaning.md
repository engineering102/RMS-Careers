---
type: notes
title: "W16 · S3 · Data Cleaning with Pandas"
slug: w16-s3-data-cleaning
topic: Data Cleaning
subject: programming-fundamentals
minutes: 40
description: A repeatable cleaning routine in Pandas: missing values, duplicates, type fixes, string and date operations, and apply and map, with a cleaning log you can defend.
---
# Data cleaning with Pandas

Real datasets are messy. Most of the time in a data project goes into cleaning, and the quality of every chart and
model later depends on it. The goal today is a **repeatable routine** and a **cleaning log** that says what you found,
what you did and why.

## A messy dataset to practise on

```python
import numpy as np
import pandas as pd

raw = pd.DataFrame({
    "student_id": ["S01", "S02", "S03", "S03", "S04", "S05", "S06"],
    "name": [" asha rao", "Ravi K", "meena", "meena", "John  ", None, "Priya S"],
    "branch": ["CSE", "cse ", "ECE", "ECE", "Mech", "CSE", "IT"],
    "cgpa": ["8.1", "7.4", "9.0", "9.0", "NA", "6.9", "8,5"],
    "backlogs": [0, 1, 0, 0, 2, np.nan, 0],
    "joined": ["2023-08-01", "01/08/2023", "2023-08-01", "2023-08-01", "2023-08-03", "unknown", "2023-08-02"],
})
raw.info()
```

Every common problem is here: inconsistent case and spaces, a duplicate row, numbers stored as text (with `"NA"` and a
comma decimal), missing values and mixed date formats. Work on a copy so the raw data stays untouched:

```python
df = raw.copy()
```

## Step 1: duplicates

```python
df.duplicated().sum()                        # fully identical rows
df[df.duplicated(subset=["student_id"], keep=False)]   # show every row sharing an id
df = df.drop_duplicates(subset=["student_id"], keep="first")
```

Decide what "duplicate" means for your data. Two orders with the same amount on the same day may both be real; two
rows with the same primary key are not.

## Step 2: text columns

String methods live under `.str` and work on the whole column (missing values stay missing):

```python
df["name"] = df["name"].str.strip().str.replace(r"\s+", " ", regex=True).str.title()
df["branch"] = df["branch"].str.strip().str.upper()
```

| Method | Does |
|---|---|
| `.str.strip()` | removes spaces at both ends |
| `.str.lower()` / `.upper()` / `.title()` | changes case |
| `.str.replace(pat, repl, regex=True)` | replaces a pattern |
| `.str.contains("Lap", case=False, na=False)` | boolean mask, safe with missing values |
| `.str.split("-", expand=True)` | splits into several columns |
| `.str.len()` | length of each string |

After cleaning, check the categories again: `df["branch"].value_counts()`. "CSE" and "cse " should now be one value.

## Step 3: fix types

`cgpa` is text. `pd.to_numeric` with `errors="coerce"` converts what it can and turns the rest into `NaN`, so a single
bad value cannot crash the conversion:

```python
df["cgpa"] = pd.to_numeric(df["cgpa"].str.replace(",", ".", regex=False), errors="coerce")
df["backlogs"] = df["backlogs"].astype("Int64")       # capital I: integer that allows missing values
```

When cleaning is finished, a text column with a few repeated values (such as `branch`) can be stored as
`astype("category")` to save memory on large files.

Dates come in many formats. Parse each known format explicitly, then fill the gaps:

```python
iso = pd.to_datetime(df["joined"], format="%Y-%m-%d", errors="coerce")
dmy = pd.to_datetime(df["joined"], format="%d/%m/%Y", errors="coerce")
df["joined"] = iso.fillna(dmy)        # "unknown" stays NaT (missing date)
```

Being explicit matters in India-style data: `01/08/2023` is 1 August with `%d/%m/%Y` but 8 January with `%m/%d/%Y`.
Never let a library guess silently.

Once a column is datetime, the `.dt` accessor gives you parts and differences:

```python
df["join_month"] = df["joined"].dt.month_name()
df["days_since_join"] = (pd.Timestamp("2026-06-01") - df["joined"]).dt.days
```

## Step 4: missing values

```python
df.isna().sum()                   # missing count per column
df.isna().mean().round(2)         # missing share per column
```

There are three choices, and the right one depends on why the value is missing:

| Choice | Code | When |
|---|---|---|
| Drop rows | `df.dropna(subset=["cgpa"])` | few rows affected, and the column is essential |
| Fill with a statistic | `df["cgpa"].fillna(df["cgpa"].median())` | numeric, roughly random gaps; median resists outliers |
| Fill with a constant | `df["name"].fillna("Unknown")` | text or category; "missing" is itself meaningful |
| Fill per group | `df["cgpa"].fillna(df.groupby("branch")["cgpa"].transform("median"))` | values differ by group |
| Leave it | | the model or chart can handle `NaN`, and filling would invent data |

```python
df = df.fillna({"name": "Unknown", "backlogs": 0})
df = df.dropna(subset=["cgpa"])
```

Prefer `df = df.fillna({...})` or `df["col"] = df["col"].fillna(...)`. Avoid `df["col"].fillna(..., inplace=True)`:
it acts on an intermediate object, so it may not update `df`, and recent pandas versions warn about it.

## Step 5: derived columns with map and apply

`map` translates each value of one column using a dictionary or function:

```python
dept = {"CSE": "Computing", "IT": "Computing", "ECE": "Electronics", "MECH": "Core"}
df["stream"] = df["branch"].map(dept)          # values not in the dict become NaN
```

`apply` runs a function on each value (Series) or each row (`axis=1`):

```python
def eligibility(row):
    return "Eligible" if row["cgpa"] >= 7.0 and row["backlogs"] == 0 else "Not eligible"

df["status"] = df.apply(eligibility, axis=1)
```

`apply(axis=1)` is a Python loop in disguise, so it is slow on large data. Prefer a vectorised version when one exists:

```python
df["status"] = np.where((df["cgpa"] >= 7.0) & (df["backlogs"] == 0), "Eligible", "Not eligible")
df["band"] = pd.cut(df["cgpa"], bins=[0, 6, 7.5, 9, 10], labels=["<6", "6-7.5", "7.5-9", "9+"])
```

## Step 6: validate

Finish with checks that fail loudly if the data is wrong:

```python
assert df["student_id"].is_unique
assert df["cgpa"].between(0, 10).all()
assert df["backlogs"].ge(0).all()
df.to_csv("clean.csv", index=False)
```

## The cleaning log

Keep a table in a Markdown cell. Tutors grade the reasoning, not just the code.

| Column | Found | Action | Why |
|---|---|---|---|
| student_id | S03 appears twice, identical | dropped the second row | same primary key |
| cgpa | text; "NA"; "8,5" | comma to dot, `to_numeric(errors="coerce")`, dropped missing | cgpa is needed for every question |
| joined | two date formats, one "unknown" | parsed both formats explicitly; kept NaT | guessing a date would invent data |

## Lab: clean a deliberately messy dataset

Your tutor shares a messy file (or use the `raw` frame above, scaled up). In your `data_wrangling.ipynb`:

1. Record `shape` and `isna().sum()` before you start.
2. Apply the six steps; one Markdown cell per step explaining the decision.
3. Write the cleaning log table.
4. Record `shape` and `isna().sum()` after, and add the `assert` checks.
5. Save `clean.csv` and confirm the notebook passes Restart and Run All.

## Check yourself

1. Why is `errors="coerce"` safer than the default when converting a column with `pd.to_numeric`?
2. When would you fill missing CGPA values with the branch median rather than the overall median?
3. What is wrong with `df["cgpa"].fillna(df["cgpa"].mean())` on a column that has a few values of 99 entered by mistake?
