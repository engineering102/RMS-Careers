---
type: notes
title: "W18 · S3 · Classification Models, Metrics and Cross-Validation"
slug: w18-s3-classification-cross-validation
topic: Classification
subject: programming-fundamentals
minutes: 45
description: Logistic regression, k-NN, decision trees and random forests; accuracy, precision, recall, F1 and the confusion matrix; and k-fold cross-validation for comparing models fairly.
---
# Classification models, metrics and cross-validation

**Classification** predicts a category: placed or not, fraud or genuine, which of five product types. This session
covers four classic models, the metrics that tell you whether a classifier is actually useful, and cross-validation
for comparing models without fooling yourself.

## A dataset: synthetic placement outcomes

```python
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

rng = np.random.default_rng(42)
n = 1500
students = pd.DataFrame({
    "cgpa": np.clip(rng.normal(7.3, 0.9, n), 5, 10).round(2),
    "dsa_solved": rng.integers(0, 400, n),
    "aptitude": np.clip(rng.normal(60, 15, n), 0, 100).round(),
    "internships": rng.integers(0, 3, n),
    "branch": rng.choice(["CSE", "IT", "ECE", "MECH"], n),
})
signal = (0.8 * students["cgpa"] + 0.006 * students["dsa_solved"] + 0.02 * students["aptitude"]
          + 0.4 * students["internships"] + rng.normal(0, 0.9, n))
students["placed"] = (signal > 9.4).astype(int)           # synthetic; roughly 30% placed

X = students.drop(columns="placed")
y = students["placed"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
```

This data is generated for practice. Never train models on real students' personal data without consent and approval.

## Four classic classifiers

| Model | Idea | Needs scaling? | Strengths | Watch out for |
|---|---|---|---|---|
| **Logistic regression** | a linear score turned into a probability with the sigmoid function | yes | fast, interpretable coefficients, good baseline | only linear boundaries unless you add features |
| **k-nearest neighbours** | predict the majority class among the k closest training rows | **yes** (distances) | simple, no training step | slow on big data; poor with many features |
| **Decision tree** | a sequence of yes/no questions on features | no | readable rules, handles non-linear patterns | overfits when deep |
| **Random forest** | many trees on random samples of rows and features, voting together | no | strong default, less overfitting than one tree | less interpretable, larger |

Logistic regression outputs a **probability**. `predict` uses a 0.5 threshold; `predict_proba` gives the probability
itself, which lets you choose a different threshold when one kind of error is costlier.

## Pipelines for each model

```python
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier

numeric = ["cgpa", "dsa_solved", "aptitude", "internships"]
categorical = ["branch"]
prep = ColumnTransformer([
    ("num", StandardScaler(), numeric),
    ("cat", OneHotEncoder(handle_unknown="ignore"), categorical),
])

models = {
    "logistic": LogisticRegression(max_iter=1000),
    "knn": KNeighborsClassifier(n_neighbors=15),
    "tree": DecisionTreeClassifier(max_depth=4, random_state=42),
    "forest": RandomForestClassifier(n_estimators=300, random_state=42),
}
pipes = {name: Pipeline([("prep", prep), ("model", m)]) for name, m in models.items()}
```

Scaling does no harm to trees, so one shared `prep` keeps the comparison simple.

## The confusion matrix

For a yes/no problem, every prediction lands in one of four cells (positive = "placed"):

| | Predicted not placed | Predicted placed |
|---|---|---|
| **Actually not placed** | True negative (TN) | False positive (FP) |
| **Actually placed** | False negative (FN) | True positive (TP) |

```python
from sklearn.metrics import ConfusionMatrixDisplay, classification_report, confusion_matrix

pipe = pipes["logistic"].fit(X_train, y_train)
pred = pipe.predict(X_test)
print(confusion_matrix(y_test, pred))          # rows = actual, columns = predicted
print(classification_report(y_test, pred, digits=3))
ConfusionMatrixDisplay.from_estimator(pipe, X_test, y_test)
```

## Metrics from the matrix

| Metric | Formula | Question it answers |
|---|---|---|
| Accuracy | (TP + TN) / all | What share of predictions are right? |
| **Precision** | TP / (TP + FP) | When the model says "placed", how often is it right? |
| **Recall** | TP / (TP + FN) | Of the students actually placed, how many did it find? |
| **F1** | 2 · P · R / (P + R) | One number balancing precision and recall |

Worked example: TP = 40, FP = 10, FN = 20, TN = 130 (200 students).
Accuracy = 170/200 = 0.85. Precision = 40/50 = 0.80. Recall = 40/60 ≈ 0.67. F1 = 2·0.80·0.67/(0.80+0.67) ≈ 0.73.

**Which metric matters depends on the cost of each error:**

| Situation | Costlier error | Prioritise |
|---|---|---|
| Flagging students who need extra placement coaching | missing a student who needs help (FN) | recall |
| Spam filter moving mail to junk | a real email hidden (FP) | precision |
| Rare-event detection (fraud is 1% of rows) | accuracy is misleading: 99% by predicting "no fraud" | precision, recall, F1 |

Accuracy alone is safe only when classes are roughly balanced and both errors cost about the same.

## Cross-validation

One train/test split is one roll of the dice: a lucky split flatters a model. **k-fold cross-validation** splits the
**training** data into k folds, trains on k − 1 and scores on the remaining one, k times, then averages.

```text
Fold 1: [test][train][train][train][train]
Fold 2: [train][test][train][train][train]
...                                         -> 5 scores -> mean ± std
```

```python
from sklearn.dummy import DummyClassifier
from sklearn.model_selection import StratifiedKFold, cross_validate

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
rows = []
for name, pipe in {"baseline": Pipeline([("model", DummyClassifier(strategy="most_frequent"))]), **pipes}.items():
    scores = cross_validate(pipe, X_train, y_train, cv=cv,
                            scoring=["accuracy", "precision", "recall", "f1"])
    rows.append({"model": name, **{m: scores[f"test_{m}"].mean().round(3)
                                   for m in ["accuracy", "precision", "recall", "f1"]}})
print(pd.DataFrame(rows).sort_values("f1", ascending=False))
```

The baseline never predicts "placed", so its precision is undefined; scikit-learn reports 0 with a warning. That is
expected and is exactly why accuracy alone can mislead.

Rules:

- Cross-validate on the **training set only**. Keep the test set for one final check of the chosen model.
- Put preprocessing **inside the pipeline**, so each fold fits its scaler on that fold's training part. Scaling before
  cross-validation leaks information from the validation fold.
- Use `StratifiedKFold` for classification so each fold keeps the class balance.
- Look at the spread too: a model at 0.80 ± 0.01 is more trustworthy than one at 0.81 ± 0.08.

## Lab: placement-prediction classifier

In `week-18/ml.ipynb`, with the synthetic data above or your own anonymised or synthetic dataset:

1. Baseline: `DummyClassifier(strategy="most_frequent")`, with accuracy and F1.
2. The four model pipelines, compared with 5-fold stratified cross-validation on the training set: a table of
   accuracy, precision, recall and F1 (mean of the folds).
3. Choose a model, fit it on the full training set and evaluate **once** on the test set: classification report and
   confusion matrix.
4. Write which error (FP or FN) matters more for your use case and which metric you therefore prioritised.
5. For the random forest, show `pipe.named_steps["model"].feature_importances_` next to the feature names from
   `pipe.named_steps["prep"].get_feature_names_out()`.

## Check yourself

1. TP = 30, FP = 30, FN = 10, TN = 130. Compute precision and recall.
2. A fraud model has 99% accuracy on data where 1% of transactions are fraud. Why is that not good news on its own?
3. Why does fitting a `StandardScaler` on all the training data before running `cross_val_score` cause leakage, and
   how does a Pipeline prevent it?
