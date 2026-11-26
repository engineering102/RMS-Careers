---
type: notes
title: "W17 · S1 · Matplotlib: Figures, Axes and Core Charts"
slug: w17-s1-matplotlib-core-charts
topic: Matplotlib
subject: programming-fundamentals
minutes: 40
description: The Matplotlib figure and axes model, line, bar, scatter and histogram charts, subplots, titles, labels, legends and saving figures, plus how to choose a chart for a question.
---
# Matplotlib: figures, axes and core charts

A chart is an answer to a question. This week you learn to draw charts in Python, but the skill that is graded is
choosing **the chart that answers the question** and labelling it so nobody has to guess what it shows.

## The two objects: Figure and Axes

Matplotlib draws on a **Figure** (the whole image) that contains one or more **Axes** (individual plots, each with
its own x-axis and y-axis). Use the explicit, object-oriented style: create both with `plt.subplots()` and call
methods on `ax`.

```python
import matplotlib.pyplot as plt
import numpy as np

months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
revenue = [4.2, 4.8, 5.1, 4.6, 5.9, 6.3]          # ₹ lakh

fig, ax = plt.subplots(figsize=(8, 4))
ax.plot(months, revenue, marker="o")
ax.set_title("Monthly revenue, Jan–Jun 2026")
ax.set_xlabel("Month")
ax.set_ylabel("Revenue (₹ lakh)")
fig.tight_layout()
plt.show()
```

You will also see the shorter `plt.plot(...)`, `plt.title(...)` style. It works for one quick chart but becomes
confusing with several subplots, so prefer `ax.` methods.

## Choosing a chart

Start from the question, not from the chart type.

| Question | Chart | Matplotlib |
|---|---|---|
| How does a value change over time? | line | `ax.plot(x, y)` |
| How do categories compare? | bar (horizontal if labels are long) | `ax.bar(cats, vals)` / `ax.barh(...)` |
| How is one numeric variable distributed? | histogram | `ax.hist(values, bins=20)` |
| Are two numeric variables related? | scatter | `ax.scatter(x, y)` |
| How do distributions compare across groups? | box plot | `ax.boxplot([...])` or Seaborn (S2) |
| What share does each part have? | bar chart of shares; pie only for 2–3 parts | `ax.bar(...)` |

People compare lengths on a common baseline far more accurately than angles or areas, which is why a sorted bar
chart usually beats a pie chart.

## Line chart

```python
fig, ax = plt.subplots(figsize=(8, 4))
ax.plot(months, [4.2, 4.8, 5.1, 4.6, 5.9, 6.3], marker="o", label="2026")
ax.plot(months, [3.9, 4.1, 4.4, 4.5, 4.9, 5.2], marker="s", linestyle="--", label="2025")
ax.set_title("Revenue by month: 2026 is ahead of 2025 from February")
ax.set_ylabel("Revenue (₹ lakh)")
ax.legend()
ax.grid(alpha=0.3)
```

A title that states the finding ("2026 is ahead…") is more useful than one that only names the variables.

## Bar chart

```python
cities = ["Pune", "Chennai", "Hyderabad", "Kochi"]
orders = [420, 380, 510, 190]

order = np.argsort(orders)[::-1]                 # sort bars, largest first
fig, ax = plt.subplots(figsize=(7, 4))
bars = ax.bar(np.array(cities)[order], np.array(orders)[order], color="steelblue")
ax.bar_label(bars)                               # value on top of each bar
ax.set_title("Orders by city, Q1 2026")
ax.set_ylabel("Orders")
```

Bar charts must start at zero: a cut y-axis makes small differences look huge. Sort bars unless the categories have a
natural order (months, grades).

## Histogram

```python
rng = np.random.default_rng(1)
marks = rng.normal(62, 12, 500).clip(0, 100)

fig, ax = plt.subplots(figsize=(7, 4))
ax.hist(marks, bins=20, edgecolor="white")
ax.axvline(marks.mean(), color="red", linestyle="--", label=f"mean {marks.mean():.1f}")
ax.set_title("Distribution of test marks (n = 500)")
ax.set_xlabel("Marks")
ax.set_ylabel("Number of students")
ax.legend()
```

The number of `bins` changes the story: too few hides shape, too many shows noise. Try two or three values.

## Scatter plot

```python
hours = rng.uniform(0, 10, 200)
score = 40 + 5 * hours + rng.normal(0, 8, 200)

fig, ax = plt.subplots(figsize=(6, 5))
ax.scatter(hours, score, alpha=0.6, s=20)
ax.set_title("More practice hours, higher scores")
ax.set_xlabel("Weekly practice hours")
ax.set_ylabel("Test score")
```

`alpha` (transparency) reveals where many points overlap. A scatter shows **association**, not cause.

## Subplots

```python
fig, axes = plt.subplots(nrows=1, ncols=2, figsize=(11, 4))
axes[0].hist(marks, bins=20)
axes[0].set_title("Marks distribution")
axes[1].scatter(hours, score, alpha=0.6)
axes[1].set_title("Practice vs score")
fig.suptitle("Batch overview")
fig.tight_layout()
```

With a grid (`nrows=2, ncols=2`), `axes` is a 2-D array: use `axes[0, 1]`, or loop over `axes.flat`. Pass
`sharey=True` when the panels must be compared on the same scale.

## Saving figures

```python
from pathlib import Path

Path("charts").mkdir(exist_ok=True)       # savefig does not create folders
fig.savefig("charts/revenue_by_month.png", dpi=150, bbox_inches="tight")
```

Call `savefig` **before** `plt.show()`; in scripts `show()` can leave an empty figure behind. `bbox_inches="tight"`
stops labels being cut off. Use PNG for reports and slides, SVG or PDF when the chart must scale.

## The labelling checklist

Every chart you submit this phase must pass:

- [ ] A title that says what the chart shows (or the finding).
- [ ] Both axes labelled, **with units** (₹ lakh, %, minutes).
- [ ] A legend whenever there is more than one series.
- [ ] A readable size (`figsize`) and no overlapping tick labels (rotate with `ax.tick_params(axis="x", rotation=45)`).
- [ ] Bars start at zero; categories sorted unless they have a natural order.
- [ ] A one-line takeaway written under the chart in the notebook.

## Lab: recreate five reference charts

Your tutor shares five reference images (line, sorted bar, histogram, scatter, 2 × 2 subplots). Recreate each from
the data provided, in `week-17/matplotlib_lab.ipynb`. Match the chart type, titles, labels and legend exactly; colours
can differ. Save each with `savefig` into `week-17/charts/` and write one sentence under each saying what question it
answers.

## Check yourself

1. You want to show how 2,000 delivery times are spread out. Which chart, and which parameter would you experiment with?
2. Why is `fig, ax = plt.subplots()` preferred over calling `plt.title()` and `plt.xlabel()` when a figure has
   several panels?
3. A colleague's bar chart starts its y-axis at 380. What is the problem?
