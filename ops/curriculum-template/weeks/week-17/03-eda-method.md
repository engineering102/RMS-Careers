---
type: notes
title: "W17 · S3 · The EDA Method and Descriptive Statistics"
slug: w17-s3-eda-method-statistics
topic: Exploratory Data Analysis
subject: programming-fundamentals
minutes: 45
description: A structured exploratory data analysis from questions to univariate, bivariate and multivariate views, with descriptive statistics, correlation, outlier checks and the probability distributions you will meet most.
---
# The EDA method and descriptive statistics

**Exploratory data analysis (EDA)** is how you get to know a dataset before you trust any conclusion or model built
on it. Done without a method, it becomes fifty random charts. Done with one, it becomes a short list of findings you
can defend.

## The method

```text
1. Questions      What do we want to know? Who will act on it?
2. Univariate     Each column on its own: centre, spread, shape, missing values, oddities
3. Bivariate      Pairs: does Y change with X? Does a number differ across groups?
4. Multivariate   Three or more at once: does the relationship hold within each group?
5. Findings       3–5 statements, each backed by a number or chart, with caveats
```

Write the questions first. "Which branches have the lowest placement rate, and is it explained by CGPA or by
practice?" tells you which columns and charts you need. "Explore the data" does not.

## Descriptive statistics

| Measure | What it tells you | Pandas |
|---|---|---|
| Mean | the average; pulled by extreme values | `s.mean()` |
| Median | the middle value; robust to outliers | `s.median()` |
| Mode | the most common value (useful for categories) | `s.mode()` |
| Standard deviation | typical distance from the mean | `s.std()` |
| Quartiles, IQR | Q1 (25%), Q3 (75%); IQR = Q3 − Q1 is the spread of the middle half | `s.quantile([0.25, 0.75])` |
| Skewness | lopsidedness: positive means a long right tail | `s.skew()` |

```python
df.describe()                                 # numeric columns
df.describe(include="object")                 # text columns: count, unique, top, freq
df.groupby("branch")["cgpa"].describe()       # the same summary per group
```

**Mean versus median is a quick shape test.** If the mean is well above the median, a few large values pull it up
(right skew). Salaries, order values and delivery times are usually right-skewed, so report the median for them.

## Distributions you will meet

| Distribution | Shape | Typical example |
|---|---|---|
| Normal | symmetric bell; about 68% within 1 std of the mean, 95% within 2, 99.7% within 3 | heights, measurement error, many test scores |
| Uniform | every value equally likely | a fair die, random IDs |
| Binomial | number of successes in n yes/no trials with probability p | placed students out of 60 if each has p = 0.7 |
| Right-skewed (for example log-normal) | long tail to the right | incomes, order values, time on page |

```python
import numpy as np

rng = np.random.default_rng(0)
heights = rng.normal(165, 8, 10_000)
print(((heights > 157) & (heights < 173)).mean())     # close to 0.68
placed_out_of_60 = rng.binomial(n=60, p=0.7, size=10_000)
print(placed_out_of_60.mean())                        # close to 60 * 0.7 = 42
```

Basic probability you need: a probability is a number from 0 to 1; P(not A) = 1 − P(A); for **independent** events
P(A and B) = P(A) × P(B). In data, an observed rate (placed / total) is an estimate of a probability, and estimates
from small groups are unreliable: 3 out of 4 is 75%, but it is only four students.

## Correlation

The **Pearson correlation** `r` measures how well two numeric variables fit a straight line, from −1 to +1.

| r | Reading |
|---|---|
| near +1 | strong positive linear relationship |
| near 0 | no **linear** relationship (there may still be a curved one) |
| near −1 | strong negative linear relationship |

```python
df[["cgpa", "practice", "aptitude"]].corr()                    # Pearson
df[["cgpa", "practice", "aptitude"]].corr(method="spearman")   # rank-based, robust to outliers
```

Three warnings to write into every EDA:

1. **Correlation is not causation.** Ice-cream sales and drowning both rise in summer; the hidden third variable is heat.
2. A single outlier can create or destroy a correlation. Always look at the scatter plot.
3. `r` near 0 does not mean "unrelated": a U-shaped pattern has `r` close to 0.

## Outliers

An **outlier** is a value far from the rest. It may be an error (CGPA 85), a rare but real case (a ₹40 lakh offer), or
the most interesting row in the dataset. Detect, then **decide with a reason**.

```python
q1, q3 = df["order_value"].quantile([0.25, 0.75])
iqr = q3 - q1
low, high = q1 - 1.5 * iqr, q3 + 1.5 * iqr
outliers = df[(df["order_value"] < low) | (df["order_value"] > high)]
print(len(outliers), "possible outliers")

z = (df["order_value"] - df["order_value"].mean()) / df["order_value"].std()
print((z.abs() > 3).sum(), "rows more than 3 std from the mean")
```

| Decision | When |
|---|---|
| Fix | clearly a typing or unit error and the right value is known |
| Remove | impossible values (negative age), documented in the cleaning log |
| Keep and report separately | real but rare; show results with and without them |
| Cap (winsorise) | for models sensitive to extremes; say so |

The 1.5 × IQR rule is the same rule a box plot uses for its whiskers.

## Univariate, bivariate, multivariate in code

```python
import pandas as pd

df = pd.read_csv("placements.csv")      # your dataset, already cleaned

# Univariate
df["cgpa"].describe(); df["branch"].value_counts(normalize=True)

# Bivariate: numeric vs category, category vs category, numeric vs numeric
df.groupby("branch")["cgpa"].median()
pd.crosstab(df["branch"], df["placed"], normalize="index")
df[["practice", "aptitude"]].corr()

# Multivariate: does the practice → placement link hold inside each branch?
df.groupby(["branch", pd.cut(df["practice"], [0, 4, 8, 15])], observed=True)["placed"].mean().unstack()
```

The last line is a check for **Simpson's paradox**: a trend that appears in the whole dataset can weaken or reverse
inside every group when the groups differ in size. Splitting by a third variable is how you catch it.

## Writing findings

A good finding is **specific, quantified and honest about limits**:

- Weak: "Practice is important."
- Strong (illustrative numbers): "Students solving 8 or more DSA problems a week were placed at 81% versus 52% for fewer than 4 (n = 600,
  synthetic data). The gap holds in every branch, so branch does not explain it. This is an association, not proof
  that practice causes placement."

## Lab: guided EDA on a placement or sales dataset

Use the synthetic placement data from S2 (or a sales dataset from your tutor) in `week-17/eda.ipynb`:

1. Write four questions in a Markdown cell.
2. Univariate: `describe()`, skewness and a histogram for each numeric column; `value_counts` for each category.
3. Bivariate: a correlation table and heatmap; placement rate by branch; a box plot of CGPA by outcome.
4. Outliers: apply the IQR rule to two columns and record your decision for each.
5. Multivariate: one grouped table or `hue` chart that checks whether a relationship holds within groups.
6. Finish with three findings in the strong format above.

## Check yourself

1. Mean order value is ₹2,400 and the median is ₹900. What does that tell you about the distribution, and which number
   would you report to a manager?
2. Two variables have r = 0.05. Can you conclude they are unrelated? What would you check?
3. Give one example each of an outlier you would remove, one you would fix and one you would keep.
