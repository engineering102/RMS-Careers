---
type: resource
title: "W18 · Cheat Sheet: scikit-learn Workflow, Metrics and Greedy Templates"
slug: w18-cheat-sheet
topic: Week 18 Reference
subject: programming-fundamentals
minutes: 10
description: One-page reference for Week 18: the ML workflow, scikit-learn pipeline and cross-validation code, regression and classification metrics, k-means and PCA, saving models, greedy templates and this week's tasks.
---
# Week 18 cheat sheet

## Workflow

Frame (target, type, question) → prepare (no leakage) → split → **baseline** → pipelines → cross-validate on train →
pick → test **once** → conclude.

| Target | Type | Baseline |
|---|---|---|
| a number | regression | `DummyRegressor(strategy="mean")` |
| a category | classification | `DummyClassifier(strategy="most_frequent")` |
| none | unsupervised | (business usefulness, silhouette) |

## Pipeline + cross-validation

```python
prep = ColumnTransformer([
    ("num", StandardScaler(), numeric_cols),
    ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_cols),
])
pipe = Pipeline([("prep", prep), ("model", RandomForestClassifier(random_state=42))])

X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cross_validate(pipe, X_tr, y_tr, cv=cv, scoring=["accuracy", "precision", "recall", "f1"])

grid = GridSearchCV(pipe, {"model__max_depth": [4, 8, None]}, cv=cv, scoring="f1").fit(X_tr, y_tr)
grid.best_params_; grid.score(X_te, y_te)
joblib.dump(grid.best_estimator_, "models/model.joblib"); joblib.load("models/model.joblib")
```

Step parameters use **two** underscores: `model__max_depth`.

## Regression metrics

| Metric | Code | Note |
|---|---|---|
| MAE | `mean_absolute_error(y, p)` | average miss, in target units |
| RMSE | `np.sqrt(mean_squared_error(y, p))` | punishes big misses; ≥ MAE |
| R² | `r2_score(y, p)` | 1 is perfect, 0 = predicting the mean, < 0 is worse |

## Classification metrics

| | Pred − | Pred + |
|---|---|---|
| **Actual −** | TN | FP |
| **Actual +** | FN | TP |

| Metric | Formula | Prioritise when |
|---|---|---|
| Accuracy | (TP + TN) / all | balanced classes, equal error costs |
| Precision | TP / (TP + FP) | false alarms are costly |
| Recall | TP / (TP + FN) | misses are costly |
| F1 | 2PR / (P + R) | imbalanced classes; one balanced number |

`classification_report(y, p)` · `ConfusionMatrixDisplay.from_estimator(pipe, X_te, y_te)`

## Models at a glance

| Model | Scale? | Key hyperparameters |
|---|---|---|
| Linear / logistic regression | yes | `C` (logistic; smaller = simpler) |
| k-NN | yes | `n_neighbors` |
| Decision tree | no | `max_depth`, `min_samples_leaf` |
| Random forest | no | `n_estimators`, `max_depth` |
| k-means | yes | `n_clusters`, `n_init` |
| PCA | yes | `n_components` |

Overfitting = train ≫ test (simplify, more data). Underfitting = both low (more flexible model, better features).

## Greedy templates

| Template | Problems |
|---|---|
| sort by the right key, then scan | Assign Cookies, Non-overlapping Intervals (sort by **end**), Arrows |
| furthest reach | Jump Game, Jump Game II |
| reset when the running sum goes negative | Gas Station |
| last-index map, cut when the window closes | Partition Labels |

Always try a small counter-example first. Coins `[1, 3, 4]`, amount 6 breaks largest-first.

## Aptitude this week

| Topic | Remember |
|---|---|
| Speed | distance / time; km/h × 5/18 = m/s |
| Average speed, equal distances | 2xy / (x + y), not (x + y) / 2 |
| Relative speed | same direction: subtract; opposite directions: add |
| Simple interest | P × R × T / 100 |
| Compound amount | P × (1 + R/100)^T |

## This week

| Item | Details |
|---|---|
| **Deliverable** | `week-18/ml.ipynb`: baseline, 3+ models in pipelines, 5-fold CV, comparison table, leakage check, saved model and conclusion (Weekly Build WB-18) |
| **Practice quiz** | Machine Learning with scikit-learn (untimed, retakes allowed) |
| **Weekly test** | 15 questions on the ML workflow, metrics, overfitting, pipelines and greedy algorithms, 25 minutes |
| **DSA** | Assign Cookies, Jump Game, Gas Station, Non-overlapping Intervals, Partition Labels |
| **Career task** | Set up your Naukri profile (headline, key skills, latest resume, job alerts for 2–3 target roles); aptitude: time, speed and distance, interest, seating arrangement |
