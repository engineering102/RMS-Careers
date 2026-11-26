---
type: notes
title: "W17 · S2 · Seaborn: Statistical Plots from DataFrames"
slug: w17-s2-seaborn-statistical-plots
topic: Seaborn
subject: programming-fundamentals
minutes: 40
description: Seaborn distribution, categorical and relational plots, heatmaps and pair plots built straight from a DataFrame, plus colour and readability rules for charts people can trust.
---
# Seaborn: statistical plots from DataFrames

Matplotlib gives you full control. **Seaborn** sits on top of it and draws statistical charts straight from a
DataFrame in one line: you name the columns, and it handles grouping, colours and legends. Because Seaborn draws on
Matplotlib axes, everything you learned in S1 (titles, labels, `savefig`) still applies.

## A dataset for the session

```python
import numpy as np
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

rng = np.random.default_rng(17)
n = 600
branch = rng.choice(["CSE", "IT", "ECE", "MECH"], size=n, p=[0.35, 0.2, 0.25, 0.2])
cgpa = np.clip(rng.normal(7.4, 0.9, n), 5, 10).round(2)
practice = np.clip(rng.normal(6, 2.5, n), 0, 15).round(1)        # DSA problems per week
aptitude = np.clip(40 + 3 * practice + rng.normal(0, 10, n), 0, 100).round()
placed = (0.6 * cgpa + 0.25 * practice + rng.normal(0, 1, n)) > 6.2

students = pd.DataFrame({"branch": branch, "cgpa": cgpa, "practice": practice,
                         "aptitude": aptitude, "placed": placed})
sns.set_theme(style="whitegrid")
```

The data is synthetic, generated for practice. It is not a real placement record.

## The Seaborn pattern

Almost every function has the same shape:

```python
sns.<plot>(data=df, x="column", y="column", hue="column", ax=ax)
```

- `data` is the DataFrame; `x` and `y` are column names.
- `hue` colours by a third column and adds a legend automatically.
- `ax` places the plot on a Matplotlib axes you created, so you can label and combine it.

## Distribution plots: one variable

```python
fig, axes = plt.subplots(1, 2, figsize=(11, 4))
sns.histplot(data=students, x="cgpa", bins=20, kde=True, ax=axes[0])
axes[0].set_title("CGPA distribution")
sns.histplot(data=students, x="cgpa", hue="placed", element="step", stat="density",
             common_norm=False, ax=axes[1])
axes[1].set_title("CGPA by placement outcome")
fig.tight_layout()
```

| Function | Shows |
|---|---|
| `histplot` | counts in bins; `kde=True` adds a smooth density curve |
| `kdeplot` | smooth density only; good for overlaying groups |
| `ecdfplot` | the share of values at or below each point; no bin choice needed |

`stat="density"` with `common_norm=False` normalises each group separately, so a small group is not hidden by a large
one.

## Categorical plots: a number across groups

```python
fig, axes = plt.subplots(1, 3, figsize=(15, 4))
sns.countplot(data=students, x="branch", order=["CSE", "IT", "ECE", "MECH"], ax=axes[0])
axes[0].set_title("Students per branch")
rates = students.assign(placed=students["placed"].astype(int))    # 1 = placed, 0 = not
sns.barplot(data=rates, x="branch", y="placed", errorbar=None, ax=axes[1])
axes[1].set_title("Placement rate by branch")
axes[1].set_ylabel("Share placed")
sns.boxplot(data=students, x="branch", y="cgpa", ax=axes[2])
axes[2].set_title("CGPA spread by branch")
fig.tight_layout()
```

| Function | Shows | Note |
|---|---|---|
| `countplot` | how many rows per category | the bar version of `value_counts()` |
| `barplot` | the **mean** of `y` per category | the mean of a True/False column is a rate; by default it adds a 95% confidence interval, `errorbar=None` removes it |
| `boxplot` | median, quartiles and outliers | best for comparing spreads |
| `violinplot` | the full distribution shape per group | use when the shape matters |
| `stripplot` | every point | small datasets only |

**Reading a box plot:** the line inside the box is the median, the box spans the middle 50% (the first to third
quartile, called the **IQR**), the whiskers reach the furthest points within 1.5 × IQR, and dots beyond them are
potential outliers.

## Relational plots: two numeric variables

```python
fig, ax = plt.subplots(figsize=(7, 5))
sns.scatterplot(data=students, x="practice", y="aptitude", hue="placed", alpha=0.6, ax=ax)
ax.set_title("Weekly DSA practice vs aptitude score")
ax.set_xlabel("DSA problems per week")
ax.set_ylabel("Aptitude score (out of 100)")
```

`sns.regplot(data=students, x="practice", y="aptitude", ax=ax)` adds a fitted line with a confidence band.
`sns.lineplot` aggregates repeated `x` values (for example many orders per date) and plots the mean with an interval.

## Heatmaps

A **correlation heatmap** summarises how every pair of numeric columns moves together:

```python
corr = students[["cgpa", "practice", "aptitude"]].corr()
fig, ax = plt.subplots(figsize=(5, 4))
sns.heatmap(corr, annot=True, fmt=".2f", cmap="vlag", vmin=-1, vmax=1, ax=ax)
ax.set_title("Correlation between numeric features")
```

Fix `vmin=-1, vmax=1` and use a **diverging** palette, so that zero is the neutral colour and positive and negative
correlations look different. Heatmaps also work for pivot tables, such as orders by weekday and hour:
`sns.heatmap(pd.pivot_table(df, index="weekday", columns="hour", values="order_id", aggfunc="count"))`.

## Pair plots

```python
grid = sns.pairplot(students, vars=["cgpa", "practice", "aptitude"], hue="placed", corner=True)
grid.figure.suptitle("Pairwise relationships", y=1.02)
```

A pair plot draws a scatter for every pair of columns and a distribution on the diagonal: a fast first look for
relationships. With more than five or six columns it becomes unreadable; choose columns first. `pairplot` creates its
own figure, so it does not take `ax`.

## Colour and readability

| Rule | Why |
|---|---|
| Use colour only when it encodes something | decoration distracts from the answer |
| **Qualitative** palette for categories (`"Set2"`, `"colorblind"`) | categories have no order |
| **Sequential** palette for low → high (`"viridis"`, `"Blues"`) | darker means more |
| **Diverging** palette around a midpoint (`"vlag"`, `"coolwarm"`) | correlation, change from target |
| Avoid red-versus-green as the only difference | common colour-vision deficiency |
| Keep the same colour for the same category across charts | readers learn the mapping once |

`sns.set_theme(palette="colorblind")` is a safe default for a whole notebook. Increase text size for slides with
`sns.set_theme(context="talk")`.

## Lab: visual exploration of your Week 16 dataset

Load your `clean.csv` from Week 16 into `week-17/eda.ipynb` and produce:

1. A histogram (with `kde=True`) for your two most important numeric columns.
2. A `countplot` of your main category, sorted by frequency (`order=df["col"].value_counts().index`).
3. A `boxplot` comparing one numeric column across categories.
4. A `scatterplot` of two numeric columns with `hue` set to a category.
5. A correlation `heatmap` of all numeric columns.
6. A `pairplot` of at most four columns.

Under each chart write the question it answers and a one-line takeaway. These charts feed straight into the EDA in S3.

## Check yourself

1. `sns.barplot(data=df, x="branch", y="placed")` draws bars of different heights. What exactly does each height
   represent?
2. Which palette type would you use for a heatmap of correlations, and why fix `vmin` and `vmax`?
3. Two groups have the same median CGPA but very different box widths. What does that tell you?
