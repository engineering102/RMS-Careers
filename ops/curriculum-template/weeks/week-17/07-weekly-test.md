---
type: quiz
title: "W17 · Weekly Test: Charts, Statistics and Graph Algorithms"
slug: w17-weekly-test
topic: Week 17 Assessment
subject: programming-fundamentals
quizType: formal
timeLimit: 25
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt test on choosing charts, Matplotlib and Seaborn, descriptive statistics, correlation and outliers, Streamlit, and topological sort, Dijkstra and union–find. 15 questions, 25 minutes.
---
Q: A manager asks: "How did weekly sign-ups change over the last six months?" Which chart answers this best?
A) Pie chart
*B) Line chart with weeks on the x-axis
C) Histogram of sign-ups
D) Scatter plot of sign-ups against city
Explanation: Change over time is shown best by a line over an ordered time axis.

Q: You want to compare the spread and median of delivery times across five cities, including outliers. Which chart fits best?
A) Stacked bar chart
B) Pie chart per city
*C) Box plot of delivery time by city
D) Line chart
Explanation: Box plots show median, quartiles and outliers for each group side by side.

Q: A bar chart of orders per city has its y-axis starting at 380 instead of 0. What is the problem?
A) Nothing, it saves space
*B) It exaggerates differences between bars, because bar length no longer represents the value
C) Matplotlib will raise an error
D) Bars must always be horizontal
Explanation: Readers compare bar lengths, so a bar chart's value axis must start at zero.

Q: In `fig, axes = plt.subplots(2, 2)`, how do you set the title of the bottom-left panel?
A) axes[0, 1].set_title("...")
*B) axes[1, 0].set_title("...")
C) plt.title("...")
D) fig.set_title("...")
Explanation: axes is a 2-D array indexed [row, column]; bottom-left is row 1, column 0.

Q: Why should `fig.savefig(...)` be called before `plt.show()` in a script?
A) savefig is faster before show
*B) After show() closes the figure, savefig can write an empty image
C) show() deletes the file
D) The order never matters
Explanation: In a script, show() displays and then releases the figure, so save first.

Q: What does `sns.barplot(data=df, x="branch", y="placed_flag", errorbar=None)` show when placed_flag is 1 for placed students and 0 otherwise?
A) The number of students in each branch
*B) The placement rate in each branch
C) The total number of placed students across all branches
D) The median CGPA by branch
Explanation: barplot shows the mean of y per category, and the mean of a 0/1 column is a rate.

Q: Order values have a mean of ₹2,400 and a median of ₹900. What does this most likely indicate?
A) The data is symmetric
*B) The distribution is right-skewed by some large orders
C) The distribution is left-skewed
D) There are no outliers
Explanation: A mean far above the median means a long right tail pulls the mean upward.

Q: Q1 = 40 and Q3 = 60 for a column. Using the 1.5 × IQR rule, which values are flagged as possible outliers? (Select all that apply.)
*A) 5
B) 15
C) 85
*D) 95
Explanation: IQR = 20, so the fences are 40 − 30 = 10 and 60 + 30 = 90. Only 5 and 95 lie outside them.

Q: Two variables have a Pearson correlation of 0.02. Which conclusion is correct?
A) They are definitely unrelated
*B) There is no linear relationship, but a curved relationship is still possible
C) One causes the other weakly
D) The data must contain errors
Explanation: Pearson r measures linear association only; check the scatter plot for other shapes.

Q: Which statements about correlation are true? (Select all that apply.)
*A) Correlation does not prove that one variable causes the other
*B) A single extreme point can change a correlation noticeably
C) A correlation of −0.8 is weaker than one of +0.3
*D) Spearman correlation is based on ranks and is less sensitive to outliers
Explanation: −0.8 is a strong negative relationship, stronger than +0.3. The other three statements are correct.

Q: In a Streamlit app, why is the CSV-loading function decorated with `@st.cache_data`?
A) It makes the data public
*B) Streamlit re-runs the whole script on every widget change, and caching avoids reloading the file each time
C) It is required for st.bar_chart to work
D) It encrypts the data
Explanation: Every interaction re-runs the script top to bottom; the cache returns the stored result instead of reading the file again.

Q: Which title best follows data-storytelling practice?
A) Chart 3
B) Revenue by month
*C) Revenue fell 18% after the March price change
D) Revenue (₹)
Explanation: A title that states the finding tells the reader what to take away.

Q: In Kahn's algorithm for Course Schedule, the queue empties after 4 of 6 courses are taken. What does this mean?
A) The answer is True; the last two courses have no prerequisites
*B) The remaining courses are part of, or depend on, a cycle, so not all courses can be finished
C) The algorithm should restart from course 0
D) The graph is undirected
Explanation: Vertices in a cycle never reach in-degree 0, so they never enter the queue.

Q: Why can Dijkstra's algorithm give wrong answers when some edge weights are negative?
A) heapq cannot store negative numbers
*B) It treats a vertex as final once popped, but a later negative edge could make its distance smaller
C) It only works on undirected graphs
D) Negative weights make the graph infinite
Explanation: Dijkstra's greedy choice assumes distances only grow along a path, which negative edges break.

Q: Adding edges one at a time to a union–find, `union(a, b)` returns False for an edge. What does that tell you?
A) a or b does not exist
*B) a and b were already connected, so this edge closes a cycle
C) The two groups were merged
D) The graph is disconnected
Explanation: If a and b already share a representative, the edge is redundant; that is the idea behind Redundant Connection.
