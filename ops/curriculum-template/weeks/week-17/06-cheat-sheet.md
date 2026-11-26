---
type: resource
title: "W17 · Cheat Sheet: Chart Choice, Matplotlib, Seaborn, EDA and Streamlit"
slug: w17-cheat-sheet
topic: Week 17 Reference
subject: programming-fundamentals
minutes: 10
description: One-page reference for Week 17: which chart answers which question, Matplotlib and Seaborn syntax, the EDA method, outlier rules, a Streamlit skeleton, graph templates and this week's tasks.
---
# Week 17 cheat sheet

## Which chart?

| Question | Chart |
|---|---|
| Change over time | line |
| Compare categories | bar (sorted; horizontal for long labels; starts at zero) |
| Distribution of one number | histogram, box plot |
| Number across groups | box plot, violin, bar of means |
| Relationship of two numbers | scatter (add `hue` for a third variable) |
| All pairwise correlations | heatmap (diverging palette, −1 to 1) |
| Part of a whole | sorted bar of shares; pie only for 2–3 parts |

## Matplotlib

```python
fig, ax = plt.subplots(figsize=(8, 4))         # or nrows=2, ncols=2 -> axes[r, c]
ax.plot(x, y, marker="o", label="2026"); ax.bar(cats, vals); ax.barh(...)
ax.hist(vals, bins=20); ax.scatter(x, y, alpha=0.6)
ax.set_title("Finding as a title"); ax.set_xlabel("X (unit)"); ax.set_ylabel("Y (unit)")
ax.legend(); ax.bar_label(bars); fig.tight_layout()
fig.savefig("charts/name.png", dpi=150, bbox_inches="tight")   # before plt.show()
```

## Seaborn

```python
sns.set_theme(style="whitegrid", palette="colorblind")
sns.histplot(data=df, x="col", hue="grp", kde=True, ax=ax)
sns.countplot(data=df, x="cat", order=df["cat"].value_counts().index, ax=ax)
sns.barplot(data=df, x="cat", y="num", errorbar=None, ax=ax)     # mean per category
sns.boxplot(data=df, x="cat", y="num", ax=ax)
sns.scatterplot(data=df, x="a", y="b", hue="cat", ax=ax)
sns.heatmap(df.corr(numeric_only=True), annot=True, fmt=".2f", cmap="vlag", vmin=-1, vmax=1)
sns.pairplot(df, vars=["a", "b", "c"], hue="cat", corner=True)
```

## EDA method

Questions → univariate → bivariate → multivariate → 3–5 findings (number + chart + caveat).

| Statistic | Pandas | Note |
|---|---|---|
| centre | `mean()`, `median()` | mean ≫ median means right skew; report the median |
| spread | `std()`, `quantile([.25, .75])` | IQR = Q3 − Q1 |
| shape | `skew()` | > 0: long right tail |
| relationship | `corr()`, `corr(method="spearman")` | linear only; not causation |
| outliers (IQR) | below Q1 − 1.5·IQR or above Q3 + 1.5·IQR | fix, remove, keep or cap, with a reason |
| outliers (z) | `abs((x - mean) / std) > 3` | assumes a roughly normal shape |

Normal distribution: about 68% / 95% / 99.7% within 1 / 2 / 3 standard deviations.

## Streamlit skeleton

```python
import streamlit as st
@st.cache_data
def load(path): return pd.read_csv(path)
df = load("clean.csv")
choice = st.sidebar.multiselect("City", sorted(df.city.unique()), default=sorted(df.city.unique()))
view = df[df.city.isin(choice)]
st.metric("Revenue", f"₹{view.revenue.sum():,.0f}")
st.bar_chart(view.groupby("city")["revenue"].sum()); st.pyplot(fig)
# run: streamlit run dashboard.py   (the script re-runs on every widget change)
```

## Graph templates

| Need | Tool | Time |
|---|---|---|
| order with prerequisites / cycle check | Kahn: in-degree 0 queue | O(V + E) |
| cheapest path, weights ≥ 0 | Dijkstra: min-heap, skip stale entries | O((V + E) log V) |
| merge groups, connectivity queries | union–find with path compression + union by size | nearly O(1) per operation |

## Aptitude this week

| Topic | Remember |
|---|---|
| Profit % | profit / cost price × 100 |
| Discount % | discount / marked price × 100 |
| Time and work | if A takes a days and B takes b days, together they take ab / (a + b) days |
| Ratio a : b split of a total T | first part = T × a / (a + b) |
| Series | check differences, then ratios, then alternating patterns |

## This week

| Item | Details |
|---|---|
| **Deliverable** | `week-17/eda.ipynb` with 8+ labelled charts, `insights.pdf` (one page) and `dashboard.py` with 2+ filters and 3+ charts (Weekly Build WB-17) |
| **Practice quiz** | Data Visualisation & Exploratory Data Analysis (untimed, retakes allowed) |
| **Weekly test** | 15 questions on chart selection, Matplotlib, Seaborn, statistics and graph algorithms, 25 minutes |
| **DSA** | Course Schedule, Number of Provinces, Redundant Connection, Network Delay Time, Pacific Atlantic Water Flow |
| **Career task** | Aptitude: ratio and proportion, profit and loss, time and work; logical reasoning: number/letter series and coding–decoding |
