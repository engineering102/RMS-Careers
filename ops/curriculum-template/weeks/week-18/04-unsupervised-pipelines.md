---
type: notes
title: "W18 · S4 · k-means, PCA, Pipelines, Saving Models and Tuning"
slug: w18-s4-kmeans-pca-pipelines-tuning
topic: Unsupervised Learning
subject: programming-fundamentals
minutes: 45
description: Unsupervised learning with k-means clustering and an introduction to PCA, then production habits: full scikit-learn Pipelines, saving and loading models with joblib, and simple hyperparameter tuning with GridSearchCV.
---
# k-means, PCA, pipelines, saving models and tuning

So far every dataset had a label. **Unsupervised learning** finds structure without one. This session covers the two
methods you will meet most, then the habits that turn a notebook experiment into a model someone else can use.

## k-means clustering

**k-means** splits rows into `k` groups (clusters) so that rows in a group are close to their group's centre:

```text
1. Pick k starting centres.
2. Assign every row to its nearest centre.
3. Move each centre to the mean of the rows assigned to it.
4. Repeat 2–3 until assignments stop changing.
```

Because it uses distances, **scale the features first**; otherwise the column with the biggest numbers decides
everything.

```python
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

rng = np.random.default_rng(3)
# Synthetic customers of an online store: three hidden behaviour groups
groups = [
    (rng.normal(2, 0.8, 200), rng.normal(800, 200, 200)),      # rare, small orders
    (rng.normal(10, 2.0, 150), rng.normal(1200, 300, 150)),    # frequent, medium orders
    (rng.normal(4, 1.0, 100), rng.normal(6000, 1200, 100)),    # occasional, large orders
]
customers = pd.DataFrame({
    "orders_per_year": np.concatenate([g[0] for g in groups]).clip(0.5),
    "avg_order_value": np.concatenate([g[1] for g in groups]).clip(100),
})

kmeans = make_pipeline(StandardScaler(), KMeans(n_clusters=3, n_init=10, random_state=42))
customers["segment"] = kmeans.fit_predict(customers)
print(customers.groupby("segment").agg(["mean", "count"]).round(0))
```

Set `n_init` explicitly: k-means depends on the starting centres, so it runs several starts and keeps the best.

### Choosing k

There is no label to check against, so use two heuristics and business sense:

```python
from sklearn.metrics import silhouette_score

X_scaled = StandardScaler().fit_transform(customers[["orders_per_year", "avg_order_value"]])
for k in range(2, 7):
    km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(X_scaled)
    print(k, round(km.inertia_), round(silhouette_score(X_scaled, km.labels_), 3))
```

- **Elbow method:** `inertia_` (within-cluster spread) always falls as k grows; look for the k where the fall slows
  sharply.
- **Silhouette score** (−1 to 1): higher means rows sit clearly in their own cluster rather than between two.
- **Usefulness:** four segments the marketing team can act on beat nine that nobody can name.

Then **profile** each cluster with `groupby("segment").mean()` and give it a name ("high-value occasional buyers").
k-means works best on roughly round clusters of similar size, and it always returns `k` clusters, even when the data
has no real groups.

## PCA: an introduction

**Principal component analysis (PCA)** creates new axes, the **principal components**, that capture as much of the
variation as possible: the first component points along the direction of greatest spread, the second along the next
greatest at right angles to it, and so on. Keeping the first few components compresses many correlated features
into a few.

```python
from sklearn.decomposition import PCA

rng = np.random.default_rng(0)
base = rng.normal(size=(500, 2))
# six measured features that are really driven by two underlying factors
features = np.column_stack([base[:, 0], base[:, 0] * 0.9, base[:, 0] * 1.1,
                            base[:, 1], base[:, 1] * 0.8, base[:, 1] * 1.2]) + rng.normal(0, 0.1, (500, 6))

pca = make_pipeline(StandardScaler(), PCA(n_components=2))
reduced = pca.fit_transform(features)
print(reduced.shape)                                              # (500, 2)
print(pca.named_steps["pca"].explained_variance_ratio_.round(3))  # most of the variance in 2 components
```

Uses: plotting high-dimensional data in 2-D (colour the points by k-means segment), removing redundancy before a model,
and speeding up training. The cost is interpretability: a component is a mix of original features. Scale first, as
with k-means.

## Pipelines, all the way

A **Pipeline** chains preparation and a model into one object with `fit` and `predict`. You used it in S2 and S3;
here is why it is non-negotiable:

| Without a pipeline | With a pipeline |
|---|---|
| Easy to fit the scaler on all data and leak test information | each `fit` learns only from the rows it is given |
| Cross-validation scales once, outside the folds (leakage) | each fold re-fits the preprocessing |
| You must repeat every preparation step by hand at prediction time | `pipe.predict(new_rows)` applies the same steps |
| Saving the model forgets the encoder | one saved object contains everything |

Step parameters are addressed as `<step name>__<parameter>`, with **two** underscores: `model__max_depth`,
`prep__num__with_mean`.

## Simple hyperparameter tuning

**Parameters** are learned during `fit` (coefficients, tree splits). **Hyperparameters** are settings you choose
before training (`max_depth`, `n_neighbors`, `C`). `GridSearchCV` tries every combination with cross-validation on the
training set:

```python
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

# X, y: the placement data from S3
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
prep = ColumnTransformer([
    ("num", StandardScaler(), ["cgpa", "dsa_solved", "aptitude", "internships"]),
    ("cat", OneHotEncoder(handle_unknown="ignore"), ["branch"]),
])
pipe = Pipeline([("prep", prep), ("model", RandomForestClassifier(random_state=42))])

grid = GridSearchCV(
    pipe,
    param_grid={"model__n_estimators": [100, 300], "model__max_depth": [4, 8, None],
                "model__min_samples_leaf": [1, 5]},
    cv=5, scoring="f1", n_jobs=-1,
)
grid.fit(X_train, y_train)
print(grid.best_params_, round(grid.best_score_, 3))
print("test F1:", round(grid.score(X_test, y_test), 3))      # one final check on unseen data
```

This grid has 2 × 3 × 2 = 12 combinations × 5 folds = 60 fits, so grids grow fast. Start small around sensible
values. For larger searches, `RandomizedSearchCV` samples a fixed number of combinations. Never tune on the test set:
the best score on data you tuned against is optimistic.

## Saving and loading models with joblib

```python
import joblib
from pathlib import Path

Path("models").mkdir(exist_ok=True)
joblib.dump(grid.best_estimator_, "models/placement_model.joblib")

model = joblib.load("models/placement_model.joblib")
new_student = pd.DataFrame([{"cgpa": 8.1, "dsa_solved": 220, "aptitude": 70, "internships": 1, "branch": "ECE"}])
print(model.predict(new_student), model.predict_proba(new_student).round(2))
```

Because the whole pipeline was saved, the new row goes in as raw columns and is scaled and encoded exactly as in
training. Load models with the same scikit-learn version you saved them with (pin it in `requirements.txt`), and only
load `.joblib` files you created or trust: loading runs code from the file.

## Lab: customer segmentation

In `week-18/segmentation.ipynb` (or as the stretch part of `ml.ipynb`):

1. Use the synthetic customers above, or numeric behaviour columns from your own dataset.
2. Scale, then run k-means for k = 2 to 6; record inertia and silhouette; choose k and justify it in two sentences.
3. Profile each segment (mean of each feature, size) and give it a business name and one suggested action.
4. Use PCA to project to 2-D and draw a scatter plot coloured by segment.
5. Back in your classifier: tune the best model with a small `GridSearchCV`, save it with joblib, reload it and
   predict one new row.

## Check yourself

1. Why must features be scaled before k-means, and why do decision trees not care?
2. In `GridSearchCV`, how do you name the `max_depth` of a step called `model` inside a Pipeline?
3. You saved only the fitted classifier, not the pipeline. What goes wrong when you predict on a raw new row?
