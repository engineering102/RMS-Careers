---
type: notes
title: "W17 · S4 · Data Storytelling, Insights Reports and Streamlit Dashboards"
slug: w17-s4-storytelling-streamlit
topic: Data Storytelling
subject: programming-fundamentals
minutes: 40
description: Turning EDA into decisions: the structure of a one-page insights report, chart titles that carry the message, and a filterable Streamlit dashboard built from a cleaned CSV.
---
# Data storytelling, insights reports and Streamlit dashboards

An analysis that nobody reads changes nothing. This session turns your EDA into two things other people use: a
**one-page insights report** for a manager, and a **dashboard** they can explore themselves.

## From finding to insight

A **finding** describes the data. An **insight** says what it means and what to do about it.

| Level | Example |
|---|---|
| Observation | "Kochi has 190 orders." |
| Finding | "Kochi has the fewest orders, less than half of Hyderabad's." |
| Insight | "Kochi's orders are low but its average order value is the highest; a targeted campaign there may return more per rupee than in Pune." |

Each insight needs **evidence** (a number or chart), a **so what** (why the reader should care) and, where you can,
a **next step**. Keep caveats: "synthetic data", "three months only", "association, not cause".

## Charts that tell the story

- **Put the message in the title.** "Orders fell 18% after the price change" instead of "Orders by week".
- **Highlight one thing.** Grey for context, one strong colour for the bar or line the story is about.
- **Remove what does not help.** Gridlines, borders, 3-D effects and legends that repeat the axis labels.
- **Annotate** the point that matters directly on the chart.

```python
import matplotlib.pyplot as plt

cities = ["Hyderabad", "Pune", "Chennai", "Kochi"]
orders = [510, 420, 380, 190]
colours = ["lightgrey"] * 3 + ["tab:orange"]

fig, ax = plt.subplots(figsize=(7, 4))
ax.barh(cities[::-1], orders[::-1], color=colours[::-1])
ax.set_title("Kochi has the fewest orders: half of Hyderabad's")
ax.set_xlabel("Orders, Q1 2026")
ax.spines[["top", "right"]].set_visible(False)
ax.annotate("190", xy=(190, 0), xytext=(200, 0), va="center")
fig.tight_layout()
```

## The one-page insights report

Managers read the top of a page and skim the rest. Structure the page so the first lines are enough.

```text
Title         Q1 2026 sales: three actions for the regional team
Context       One sentence: data source, period, size, any caveat.
Key insights  3–5 numbered insights. Each: one bold sentence, the evidence (number + small chart), the so-what.
Recommendations  What to do, in priority order, each tied to an insight.
Limitations   What the data cannot tell us; what to collect next.
```

Rules: one page, a readable font size, at most three small charts, numbers rounded sensibly (₹4.2 lakh, not
₹4,21,873.46), and no jargon a manager would have to look up. Export to PDF from Word, Google Docs or a Markdown editor.

## Streamlit: a dashboard in one Python file

**Streamlit** turns a Python script into a web app. Each time a user changes a widget, Streamlit **re-runs the whole
script from top to bottom** with the new widget values. That single idea explains how it works.

```bash
pip install streamlit
streamlit run dashboard.py          # opens http://localhost:8501
```

A complete dashboard over a cleaned sales CSV with columns `order_date`, `city`, `category`, `revenue`:

```python
# dashboard.py
import matplotlib.pyplot as plt
import pandas as pd
import streamlit as st

st.set_page_config(page_title="Sales dashboard", layout="wide")


@st.cache_data
def load_data(path: str) -> pd.DataFrame:
    return pd.read_csv(path, parse_dates=["order_date"])


df = load_data("clean.csv")

st.title("Sales dashboard, Q1 2026")
st.caption("Synthetic data for training purposes.")

# Filters in the sidebar
cities = st.sidebar.multiselect("City", sorted(df["city"].unique()), default=sorted(df["city"].unique()))
categories = st.sidebar.multiselect("Category", sorted(df["category"].unique()),
                                    default=sorted(df["category"].unique()))
dates = st.sidebar.date_input("Date range", value=(df["order_date"].min(), df["order_date"].max()))
if len(dates) != 2:                 # the user has picked a start date but not yet an end date
    st.info("Choose an end date.")
    st.stop()
start, end = dates

view = df[
    df["city"].isin(cities)
    & df["category"].isin(categories)
    & df["order_date"].between(pd.Timestamp(start), pd.Timestamp(end))
]

if view.empty:
    st.warning("No orders match these filters.")
    st.stop()

# Headline numbers
c1, c2, c3 = st.columns(3)
c1.metric("Revenue", f"₹{view['revenue'].sum():,.0f}")
c2.metric("Orders", f"{len(view):,}")
c3.metric("Average order", f"₹{view['revenue'].mean():,.0f}")

# Charts
left, right = st.columns(2)
with left:
    st.subheader("Revenue by city")
    st.bar_chart(view.groupby("city")["revenue"].sum().sort_values(ascending=False))
with right:
    st.subheader("Revenue by week")
    weekly = view.set_index("order_date").resample("W")["revenue"].sum()
    st.line_chart(weekly)

st.subheader("Order value distribution")
fig, ax = plt.subplots(figsize=(8, 3))
ax.hist(view["revenue"], bins=30)
ax.set_xlabel("Order value (₹)")
ax.set_ylabel("Orders")
st.pyplot(fig)

with st.expander("Show filtered data"):
    st.dataframe(view)
```

| Piece | Purpose |
|---|---|
| `@st.cache_data` | loads the CSV once instead of on every re-run |
| `st.sidebar.*` | widgets in the side panel; each returns the user's current choice |
| `st.columns` | side-by-side layout |
| `st.metric` | a large headline number |
| `st.bar_chart`, `st.line_chart` | quick built-in charts from a Series or DataFrame |
| `st.pyplot(fig)` | shows any Matplotlib or Seaborn figure |
| `st.stop()` | ends this run early, here to avoid errors and empty charts |

Put the run instructions in your README:

```text
pip install -r requirements.txt
streamlit run week-17/dashboard.py
```

**Power BI** (optional) is a widely used business tool for the same job: you import the CSV, drag fields onto
visuals and publish a report. The same storytelling rules apply. Streamlit is required for this week's deliverable
because it keeps the analysis in Python and in Git.

To share a Streamlit app publicly, Streamlit Community Cloud can deploy it from a public GitHub repository (the
stretch goal this week). Never put secrets or personal data in a public dashboard.

## Lab: a one-page Streamlit dashboard

Build `week-17/dashboard.py` over your own cleaned dataset with **at least two filters and three charts**, plus at
least two headline metrics. Each chart needs a subheader that states what it answers. Then draft `insights.pdf`: one
page, 3–5 insights, each backed by a number or chart from your EDA.

## Check yourself

1. Why does a Streamlit app need `@st.cache_data` on the function that loads the CSV?
2. Rewrite the title "Revenue by month" as a title that tells the reader the finding.
3. Your report has nine insights. What should you do before sending it, and why?
