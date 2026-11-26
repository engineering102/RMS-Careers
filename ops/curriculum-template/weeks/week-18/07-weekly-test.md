---
type: quiz
title: "W18 · Weekly Test: Machine Learning Workflow, Metrics and Greedy"
slug: w18-weekly-test
topic: Week 18 Assessment
subject: programming-fundamentals
quizType: formal
timeLimit: 25
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt test on the ML workflow, overfitting, regression and classification metrics, pipelines, cross-validation, k-means and greedy algorithms. 15 questions, 25 minutes.
---
Q: Which of these is a classification problem?
A) Predicting a flat's monthly rent in rupees
*B) Predicting whether a customer will cancel their subscription this month
C) Grouping customers by behaviour without any labels
D) Predicting tomorrow's temperature in °C
Explanation: Cancel or not is a category. Rent and temperature are numbers (regression); grouping without labels is unsupervised.

Q: 85% of students in a dataset are "not placed". A model reaches 85% test accuracy. What is the best conclusion?
A) The model is excellent
*B) It may be no better than always predicting "not placed"; compare with the baseline and check recall
C) The model is overfitting
D) Accuracy must be wrong
Explanation: A majority-class baseline already scores 85%, so accuracy alone shows no learning here.

Q: A decision tree scores 0.99 on training data and 0.72 on test data. What is happening?
A) Underfitting
*B) Overfitting
C) Data leakage that inflates the test score
D) The test set is too large
Explanation: A large gap between training and test performance means the model memorised training noise.

Q: Which actions usually reduce overfitting in a decision tree? (Select all that apply.)
*A) Limiting max_depth
*B) Increasing min_samples_leaf
C) Evaluating on the training set instead
*D) Collecting more training data
Explanation: Simpler trees and more data reduce variance. Scoring on training data only hides the problem.

Q: A regression model has MAE ₹1,500 and RMSE ₹6,000. What does the gap suggest?
A) The model is perfect
B) MAE was computed incorrectly, because RMSE can never exceed MAE
*C) A few predictions have very large errors
D) R² must be negative
Explanation: RMSE squares errors before averaging, so a few big misses raise it far above MAE.

Q: A model's R² on the test set is 0. What does that mean?
A) It predicts every value perfectly
*B) It does no better than always predicting the mean of the target
C) It is worse than predicting the mean
D) The target has no variance
Explanation: R² compares the model's squared error with that of predicting the mean; 0 means equal.

Q: TP = 40, FP = 10, FN = 40, TN = 110. What are precision and recall?
A) Precision 0.50, recall 0.80
*B) Precision 0.80, recall 0.50
C) Precision 0.75, recall 0.75
D) Precision 0.40, recall 0.40
Explanation: Precision = 40 / (40 + 10) = 0.80. Recall = 40 / (40 + 40) = 0.50.

Q: A college wants to flag students who need extra placement coaching. Missing a student who needs help is the costliest error. Which metric should be prioritised?
A) Precision
*B) Recall
C) Accuracy
D) R²
Explanation: Recall measures how many of the actual positives are found, so it directly penalises misses (false negatives).

Q: Why should a StandardScaler sit inside a Pipeline when you run cross_val_score?
A) Pipelines make scaling faster
*B) So the scaler is fitted only on each fold's training part, without seeing the validation fold
C) StandardScaler cannot run on its own
D) It is required for tree models
Explanation: Fitting the scaler on all rows before cross-validation leaks validation statistics into training.

Q: Which practices avoid data leakage? (Select all that apply.)
*A) Splitting off the test set before any fitting
*B) Dropping features that are only known after the outcome, such as offer_letter_date when predicting placement
C) Tuning hyperparameters by checking which value scores best on the test set
*D) Fitting encoders and scalers inside a Pipeline
Explanation: Tuning on the test set makes its score optimistic; tune with cross-validation on the training set instead.

Q: In a Pipeline whose final step is named "model", how do you refer to the random forest's n_estimators in GridSearchCV?
A) "n_estimators"
B) "model.n_estimators"
*C) "model__n_estimators"
D) "model_n_estimators"
Explanation: scikit-learn uses the step name, two underscores, then the parameter name.

Q: Why must features be scaled before running k-means?
A) k-means only accepts values between 0 and 1
*B) k-means uses distances, so features with large numeric ranges would dominate the clusters
C) Scaling chooses k automatically
D) Scaling is not needed for k-means
Explanation: Without scaling, a column in thousands outweighs a column in single digits in every distance.

Q: You saved only the fitted RandomForestClassifier, not the Pipeline that one-hot encoded "branch". What happens when you call predict on a raw new row?
A) It works, because random forests handle text
*B) It fails or gives wrong results, because the row is not encoded the way the model was trained
C) It retrains automatically
D) joblib applies the encoder for you
Explanation: Save the whole pipeline so the same preparation is applied at prediction time.

Q: Coins are [1, 3, 4] and the amount is 6. What does "always take the largest coin that fits" return, and is it optimal?
A) 2 coins, optimal
*B) 3 coins (4 + 1 + 1), not optimal; 3 + 3 uses 2
C) 3 coins, optimal
D) It cannot make 6
Explanation: Greedy fails for this coin set, which is why Coin Change needs dynamic programming.

Q: For Non-overlapping Intervals (remove the fewest intervals so the rest do not overlap), which greedy rule is correct?
A) Sort by start and keep the first of each overlapping pair
*B) Sort by end and keep each interval that starts at or after the last kept end
C) Sort by length and keep the longest intervals
D) Remove the interval with the most overlaps first, without sorting
Explanation: Finishing earliest leaves the most room for later intervals; sorting by start fails on [[1,100],[2,3],[4,5]].
