---
type: quiz
title: "W16 · Weekly Test: NumPy, Pandas and Graph Traversal"
slug: w16-weekly-test
topic: Week 16 Assessment
subject: programming-fundamentals
quizType: formal
timeLimit: 25
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt test on NumPy arrays, Pandas selection, cleaning, groupby, merge and pivot tables, and BFS/DFS on graphs. 15 questions, 25 minutes.
---
Q: What is the shape of `np.ones((3, 1)) + np.arange(4)`?
A) (3, 1)
B) (4,)
*C) (3, 4)
D) It raises an error because the shapes differ
Explanation: Broadcasting compares shapes from the right: 1 stretches to 4, and the missing dimension of (4,) is treated as 1 and stretches to 3.

Q: `a = np.arange(6)`, then `b = a[1:4]` and `b[0] = 100`. What is `a[1]` now?
A) 1
*B) 100
C) 0
D) It raises an error
Explanation: A basic slice is a view of the same memory, so changing b changes a.

Q: `m = np.array([[1, 2, 3], [4, 5, 6]])`. What does `m.sum(axis=0)` return?
A) [6 15]
*B) [5 7 9]
C) 21
D) [1 4]
Explanation: axis=0 collapses the rows, giving one total per column.

Q: Which line correctly selects rows where `city` is "Pune" and `amount` is above 1000?
A) df[df["city"] == "Pune" and df["amount"] > 1000]
B) df[df["city"] == "Pune" & df["amount"] > 1000]
*C) df[(df["city"] == "Pune") & (df["amount"] > 1000)]
D) df.loc["Pune", 1000]
Explanation: Use & between Series and wrap each comparison in brackets, because & binds more tightly than == and >.

Q: After filtering, a DataFrame has index labels 4, 7 and 9. What does `df.iloc[0]` return?
*A) The row with label 4
B) A KeyError, because there is no label 0
C) The row with label 0 from the original DataFrame
D) The first column
Explanation: iloc uses positions, so position 0 is the first remaining row, whose label is 4. df.loc[0] would raise the KeyError.

Q: A column `price` contains values such as "1200", "950" and "NA". Which call converts it to numbers and turns "NA" into a missing value?
A) df["price"].astype(int)
*B) pd.to_numeric(df["price"], errors="coerce")
C) df["price"].str.strip()
D) df["price"].fillna(0)
Explanation: errors="coerce" converts what it can and makes the rest NaN. astype(int) would raise an error on "NA".

Q: A CGPA column has 3% missing values and a few extreme typing errors such as 85. Which fill value is the most defensible?
A) The mean of the column
*B) The median of the column, after fixing or removing the impossible values
C) 0
D) The maximum of the column
Explanation: Fix values outside 0 to 10 first; the median is not pulled by the remaining outliers, unlike the mean. 0 would invent failing students.

Q: Which statements about `df.groupby("city")["revenue"].transform("sum")` are true? (Select all that apply.)
*A) It returns one value for every original row
*B) Each row gets the total revenue of its own city
C) It returns one row per city
*D) It is similar to SUM(revenue) OVER (PARTITION BY city) in SQL
Explanation: transform broadcasts the group result back to every row, like a window function; agg returns one row per group.

Q: You merge 500 orders with a products table using `how="left"` and get 530 rows. What is the most likely cause?
A) Some orders have no matching product
*B) Some product_id values appear more than once in the products table
C) A left merge always adds rows
D) The orders table has missing order dates
Explanation: Duplicate keys on the right side multiply matching rows. validate="many_to_one" would raise an error and reveal it.

Q: Which Pandas call is the equivalent of `SELECT branch, COUNT(*) AS n FROM students GROUP BY branch`?
A) students["branch"].unique()
*B) students.groupby("branch", as_index=False).agg(n=("branch", "size"))
C) students.pivot_table(index="branch")
D) students.sort_values("branch")
Explanation: Named aggregation with size counts the rows in each group and keeps branch as a column.

Q: You need the percentage of students in each branch who were placed in each company tier, with each branch's row adding up to 100%. Which tool fits best?
A) pd.concat
B) pd.merge
*C) pd.crosstab(df["branch"], df["tier"], normalize="index")
D) df.describe()
Explanation: crosstab counts combinations, and normalize="index" turns each row into shares that sum to 1.

Q: Which practices make a data-wrangling notebook trustworthy? (Select all that apply.)
*A) It passes Restart Kernel and Run All without errors
*B) Parsing dates with an explicit format such as format="%d/%m/%Y"
C) Editing the raw CSV by hand in Excel and not recording the changes
*D) Adding assert checks such as df["id"].is_unique after cleaning
Explanation: Reproducible runs, explicit parsing and validation checks let someone else repeat and trust the result; undocumented manual edits cannot be reproduced.

Q: In an unweighted grid, you need the fewest steps from the top-left to the bottom-right cell. Which traversal guarantees the shortest path the first time it reaches the target?
A) DFS with recursion
*B) BFS with a queue
C) Either, they always give the same answer
D) Sorting the cells first
Explanation: BFS explores in order of distance, so the first visit to a cell is by a shortest path. DFS may reach it by a long route first.

Q: In BFS, why should a cell be marked visited when it is added to the queue rather than when it is removed?
A) It makes the code shorter but has no other effect
*B) Otherwise the same cell can be added to the queue several times by different neighbours
C) Marking on removal gives the wrong traversal order
D) deque cannot store visited cells
Explanation: Marking on add guarantees each cell is queued once, keeping BFS at O(V + E).

Q: For Number of Islands on an m × n grid, what is the time complexity of the scan-and-DFS approach?
A) O(m + n)
*B) O(m × n)
C) O((m × n)²)
D) O(log(m × n))
Explanation: Every cell is scanned once and sunk at most once, and each cell has at most four neighbours.
