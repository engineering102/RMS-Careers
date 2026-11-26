---
type: notes
title: "W18 · S1 · Machine Learning Foundations"
slug: w18-s1-ml-foundations
topic: Machine Learning
subject: programming-fundamentals
minutes: 40
description: What machine learning is, supervised versus unsupervised learning, features and labels, the train/test split, baselines, overfitting and underfitting, and the bias–variance trade-off.
---
# Machine learning foundations

In ordinary programming you write the rules: `if cgpa >= 7 and backlogs == 0: eligible`. In **machine learning (ML)**
you give the computer examples with known answers, and an algorithm **learns the rules** (a model) that best map
inputs to answers. The model is then used on new examples whose answers you do not know.

## The vocabulary

| Term | Meaning | Placement example |
|---|---|---|
| Sample (row) | one example | one student |
| **Feature** (X) | an input column | CGPA, branch, DSA problems solved |
| **Label / target** (y) | the answer to predict | placed: yes or no |
| Model | the learned mapping from X to y | a fitted logistic regression |
| Training | fitting the model to labelled examples | `model.fit(X_train, y_train)` |
| Prediction | applying the model to new rows | `model.predict(X_new)` |

## Kinds of machine learning

| Type | Has labels? | Task | Example |
|---|---|---|---|
| Supervised: **regression** | yes, numeric | predict a number | house price, salary, delivery time |
| Supervised: **classification** | yes, categories | predict a class | placed or not, spam or not |
| **Unsupervised** | no | find structure | customer segments (clustering), compressing features (PCA) |

A quick test: if the target is a number where "how far off" matters, it is regression. If it is one of a fixed set of
labels, it is classification. If there is no target, it is unsupervised.

## The workflow

```text
1. Frame the problem     target, type (regression/classification), the business question, how it will be used
2. Prepare data          cleaning (Week 16), choosing features, keeping only information known at prediction time
3. Split                 train / test (and cross-validation on the training part)
4. Baseline              the score of a trivial model
5. Train models          start simple, then more flexible
6. Evaluate              on data the model has never seen, with the right metric
7. Iterate and conclude  pick a model, explain why, and state what it gets wrong
```

## The scikit-learn pattern

Every scikit-learn model has the same interface, so once you know one you know them all:

```python
model = SomeModel(settings)        # 1. create, with hyperparameters
model.fit(X_train, y_train)        # 2. learn from training data
pred = model.predict(X_test)       # 3. predict
model.score(X_test, y_test)        # 4. default metric (accuracy or R²)
```

## Train/test split: why you never grade on training data

A model can memorise its training rows. Scoring it on those rows is like giving students the exam paper in advance:
the score says nothing about new questions. Hold out a **test set** that the model never sees during training or
tuning, and use it **once**, at the end.

```python
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

rng = np.random.default_rng(42)
n = 1000
df = pd.DataFrame({
    "cgpa": np.clip(rng.normal(7.4, 0.9, n), 5, 10),
    "dsa_solved": rng.integers(0, 400, n),
    "internships": rng.integers(0, 3, n),
})
score = 0.9 * df["cgpa"] + 0.006 * df["dsa_solved"] + 0.5 * df["internships"] + rng.normal(0, 0.8, n)
df["placed"] = (score > 8.6).astype(int)          # synthetic label for practice only

X = df[["cgpa", "dsa_solved", "internships"]]
y = df["placed"]
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(X_train.shape, X_test.shape, y_train.mean().round(2), y_test.mean().round(2))
```

- `test_size=0.2` keeps 20% aside; 70–80% for training is typical.
- `random_state` makes the split repeatable.
- `stratify=y` keeps the class proportions equal in both parts, which matters when one class is rare.
- For **time-ordered** data (sales by date), do not shuffle: train on the past and test on the most recent period.

## Baselines: the first number to beat

A **baseline** is what you would score with no learning at all: always predict the most common class, or always
predict the mean. Any model must beat it clearly to be worth anything.

```python
from sklearn.dummy import DummyClassifier

baseline = DummyClassifier(strategy="most_frequent").fit(X_train, y_train)
print("baseline accuracy:", round(baseline.score(X_test, y_test), 3))
```

If 80% of students in the data are not placed, predicting "not placed" for everyone scores 80% accuracy while being
useless. Always report the baseline next to your model. (`DummyRegressor(strategy="mean")` is the regression version.)

## Overfitting and underfitting

| | Training score | Test score | What happened | Fix |
|---|---|---|---|---|
| **Underfitting** | low | low | the model is too simple to capture the pattern | more flexible model, better features |
| Good fit | high | close to training | it learned the general pattern | |
| **Overfitting** | very high | much lower | it memorised noise in the training rows | simpler model, more data, regularisation |

```python
from sklearn.tree import DecisionTreeClassifier

for depth in [1, 3, 5, 10, None]:
    tree = DecisionTreeClassifier(max_depth=depth, random_state=42).fit(X_train, y_train)
    print(depth, round(tree.score(X_train, y_train), 3), round(tree.score(X_test, y_test), 3))
```

Typically a depth-1 tree underfits (both scores modest), while an unlimited tree reaches training accuracy near 1.0
but a lower test score: the gap is overfitting. Somewhere in between is the best depth.

## Bias–variance trade-off

Prediction error on new data comes from two sources you can control:

- **Bias**: error from wrong assumptions. A straight line fitted to a curved pattern is wrong in the same way every
  time. High bias means underfitting.
- **Variance**: error from being too sensitive to the particular training rows. Train a deep tree on two different
  samples and you get two very different trees. High variance means overfitting.

Making a model more flexible lowers bias and raises variance. The goal is the complexity where **total** error on
unseen data is lowest, and the test score (or cross-validation, S3) is how you find it.

## Data leakage, in one paragraph

**Leakage** happens when information that would not be available at prediction time reaches training, so the test
score looks better than reality. Examples: a feature like "offer_letter_date" when predicting placement (it exists only
after placement), or scaling the data using statistics of the whole dataset before splitting. Pipelines in S4 fix the
second kind; your judgement fixes the first.

## Lab: split and baseline a dataset

In `week-18/ml.ipynb`, using your Weeks 16–17 dataset (or the synthetic placement data above):

1. State the target, whether it is regression or classification, and the business question in one sentence each.
2. List features you must **exclude** because they would leak the answer.
3. Split with `train_test_split` (stratified for classification); print both shapes and class balance.
4. Fit a `DummyClassifier` or `DummyRegressor` and record its test score.
5. Fit decision trees of depth 1, 3, 5, 10 and unlimited; tabulate training and test scores; mark where underfitting
   and overfitting appear.

## Check yourself

1. Predicting a student's CTC in ₹ lakh: regression or classification? Predicting "will they get an offer above ₹6
   lakh": which?
2. A model scores 0.99 on training data and 0.71 on test data. Name the problem and two ways to reduce it.
3. Why is a feature such as `number_of_offers` leakage when predicting `placed`?
