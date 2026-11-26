---
type: quiz
title: "Phase 4 Test: Python for Data & AI"
slug: phase-4-test
topic: Phase 4 Assessment
subject: programming-fundamentals
quizType: formal
timeLimit: 45
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt phase test covering Weeks 16–19: NumPy and Pandas, visualisation and EDA, machine learning with scikit-learn, LLMs and RAG, and graphs, greedy and 1-D DP. 30 questions, 45 minutes.
---
Q: What is the shape of `np.zeros((2, 3)) + np.array([10, 20, 30])`?
A) (3,)
B) (2,)
*C) (2, 3)
D) It raises an error
Explanation: The (3,) array is broadcast across both rows of the (2, 3) array.

Q: Why is `(marks ** 2).sum()` on a NumPy array usually much faster than a Python for loop over the same values?
A) NumPy uses fewer decimal places
*B) The operation runs in compiled code over a contiguous block of same-typed values, not one Python object at a time
C) NumPy skips some elements
D) Python loops are limited to 1,000 iterations
Explanation: Vectorised operations avoid per-element interpreter overhead.

Q: Which statement about `df.loc` and `df.iloc` is correct?
A) Both select by position
*B) loc selects by label and includes the slice end; iloc selects by position and excludes it
C) iloc selects by label; loc by position
D) Both exclude the slice end
Explanation: loc[0:2] includes label 2; iloc[0:2] returns positions 0 and 1.

Q: A column of dates contains values like "01/08/2023", meaning 1 August. Which call parses it safely?
A) pd.to_datetime(df["d"])
*B) pd.to_datetime(df["d"], format="%d/%m/%Y", errors="coerce")
C) df["d"].astype(int)
D) pd.to_numeric(df["d"])
Explanation: An explicit day-first format avoids reading it as 8 January; coerce turns invalid values into NaT.

Q: Which SQL clause corresponds to filtering the result of `df.groupby("city").agg(total=("revenue", "sum"))` on total > 50000?
A) WHERE
*B) HAVING
C) ORDER BY
D) JOIN
Explanation: Filtering on an aggregate after grouping is what HAVING does in SQL.

Q: Which Pandas operations combine or reshape data? (Select all that apply.)
*A) merge
*B) concat
*C) pivot_table
D) isna
Explanation: merge joins, concat stacks and pivot_table reshapes; isna only detects missing values.

Q: After a left merge of orders with a customers table, the row count increases. What is the most likely cause?
A) Some orders have no customer
*B) The customers table has duplicate customer_id values
C) Left merges always add one row
D) The orders table is sorted
Explanation: Duplicate keys on the right side multiply the matching rows; validate="many_to_one" catches this.

Q: Which chart best shows whether weekly study hours are related to test scores for 300 students?
A) Pie chart
B) Bar chart of averages
*C) Scatter plot
D) Line chart of student IDs
Explanation: A scatter plot shows the relationship between two numeric variables.

Q: In a box plot, what does the line inside the box show?
A) The mean
*B) The median
C) The maximum
D) The mode
Explanation: The box spans Q1 to Q3 and the inner line is the median.

Q: Salaries in a dataset have mean ₹9 lakh and median ₹5 lakh. Which statements are reasonable? (Select all that apply.)
*A) The distribution is right-skewed
*B) The median is a better summary of a typical salary here
C) The mean and median prove there are no outliers
*D) A few high salaries pull the mean upward
Explanation: A mean well above the median indicates a long right tail of large values.

Q: Q1 = 20 and Q3 = 40. Under the 1.5 × IQR rule, which value is flagged as a possible outlier?
A) 0
B) 50
*C) 75
D) 65
Explanation: IQR = 20, so the fences are −10 and 70; only 75 lies outside.

Q: Which colour palette suits a correlation heatmap ranging from −1 to +1?
A) Qualitative
B) Sequential
*C) Diverging, centred on 0
D) Random colours per cell
Explanation: A diverging palette makes zero neutral and distinguishes positive from negative correlations.

Q: In Streamlit, what happens when a user changes a widget value?
A) Only the widget's line re-runs
*B) The whole script re-runs from top to bottom with the new value
C) The page reloads from the server cache without running code
D) Nothing until the user presses Save
Explanation: This re-run model is why expensive loads are wrapped in st.cache_data or st.cache_resource.

Q: A dataset has 90% negative cases. Which baseline should a classifier be compared with?
A) A random forest with default settings
*B) Always predicting the majority class (about 90% accuracy)
C) A model trained on the test set
D) No baseline is needed for classification
Explanation: Any useful model must clearly beat the majority-class baseline.

Q: Training accuracy 0.62, test accuracy 0.60, and the baseline is 0.58. What is the most likely diagnosis?
*A) Underfitting: the model is too simple or the features are weak
B) Overfitting
C) Data leakage
D) The model is excellent
Explanation: Both scores are low and close to the baseline, which indicates high bias.

Q: Which are regression metrics? (Select all that apply.)
*A) MAE
*B) RMSE
*C) R²
D) Recall
Explanation: Recall is a classification metric.

Q: TP = 50, FP = 50, FN = 0, TN = 100. What are precision and recall?
*A) Precision 0.50, recall 1.00
B) Precision 1.00, recall 0.50
C) Precision 0.75, recall 0.75
D) Precision 0.50, recall 0.50
Explanation: Precision = 50 / 100 = 0.50; recall = 50 / 50 = 1.00.

Q: Why should one-hot encoding be used for a "city" feature instead of mapping cities to 0, 1, 2, 3?
A) It uses less memory
*B) Integer codes imply an order and distances between cities that do not exist
C) scikit-learn cannot read integers
D) Trees require one-hot encoding
Explanation: A linear model would treat city 3 as three times city 1; one-hot columns avoid that false ordering.

Q: What does 5-fold cross-validation on the training set give you that a single train/test split does not?
A) A larger test set
*B) Five scores from different splits, so the estimate is less dependent on one lucky or unlucky split
C) Automatic feature engineering
D) A guarantee against overfitting
Explanation: Averaging over folds, and seeing the spread, gives a more reliable comparison between models.

Q: Which is an example of data leakage when predicting whether a student will be placed?
A) Using CGPA as a feature
B) Using a stratified split
*C) Using "offer_accepted_date" as a feature
D) Using cross-validation
Explanation: The offer date exists only after placement, so it reveals the answer.

Q: In k-means, what does increasing k always do to inertia (within-cluster spread)?
*A) It decreases or stays the same
B) It increases
C) It has no effect
D) It becomes negative
Explanation: More centres let rows sit closer to a centre, which is why the elbow method looks for diminishing returns.

Q: What is the main purpose of PCA as introduced in this phase?
A) Predicting a label
*B) Creating a few new components that capture most of the variation in many correlated features
C) Removing missing values
D) Encrypting data
Explanation: PCA reduces dimensions, for example to plot data in 2-D.

Q: What is a context window?
A) The browser window where the chat runs
*B) The maximum number of tokens the model can consider at once, including the prompt and its answer
C) The time limit for an API call
D) The number of users who can call the API
Explanation: Text beyond the context window is not seen by the model.

Q: Which are known failure modes of LLMs? (Select all that apply.)
*A) Hallucinated facts and citations
*B) Bias inherited from training data
*C) Following instructions hidden inside documents (prompt injection)
D) Being unable to produce any text without internet access
Explanation: Generation itself does not need internet access; the other three are real risks to design against.

Q: In a RAG pipeline, what happens immediately before generation?
A) Fine-tuning the model
*B) Retrieving the most similar chunks for the question
C) Deleting the vector store
D) Raising the temperature
Explanation: Retrieved chunks are placed in the prompt so the model answers from them.

Q: Your RAG app gives wrong answers. What should you check first?
A) Change to a model with a bigger context window
*B) Whether retrieval returned the passages that actually contain the answer
C) Increase the temperature
D) Add more emojis to the prompt
Explanation: Most bad RAG answers come from bad retrieval; check it separately from generation.

Q: According to the programme's policy, which use of AI tools is NOT allowed?
A) Asking an assistant to explain an error message
B) Asking for hints while practising
*C) Using an AI assistant during the Phase 4 Test
D) Asking for extra test cases for your project
Explanation: AI assistants are not allowed in tests unless the paper explicitly permits them.

Q: Which problem needs BFS rather than DFS to guarantee the correct answer directly?
A) Counting islands in a grid
*B) The minimum number of minutes for all oranges to rot
C) Checking whether a path exists
D) Cloning a graph
Explanation: Levels of a multi-source BFS correspond to minutes; the others can be solved with either traversal.

Q: Which algorithm fits "find the cheapest travel time from one city to all others, with non-negative edge times"?
A) Kahn's topological sort
*B) Dijkstra's algorithm with a min-heap
C) Union–find
D) Greedy by largest edge
Explanation: Dijkstra finds shortest weighted paths when weights are non-negative.

Q: For Coin Change with coins [1, 5, 6, 9] and amount 11, how many coins are needed at minimum?
A) 3 (9 + 1 + 1)
*B) 2 (5 + 6)
C) 4
D) It is impossible
Explanation: Greedy would take 9 + 1 + 1, but dp finds 5 + 6 = 11 with two coins.
