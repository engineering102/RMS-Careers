---
type: notes
title: "W18 · S2 · Regression, Metrics and Feature Engineering"
slug: w18-s2-regression-metrics-features
topic: Regression
subject: programming-fundamentals
minutes: 40
description: Linear regression and how to read it, the MAE, RMSE and R² metrics, and the feature work most models need: engineered features, scaling and one-hot encoding with ColumnTransformer.
---
# Regression, metrics and feature engineering

**Regression** predicts a number: a flat's rent, a delivery time, next month's sales. This session fits the simplest
regression model, measures it properly and prepares features the way real projects do.

## A dataset: flat rents

```python
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

rng = np.random.default_rng(7)
n = 1200
flats = pd.DataFrame({
    "area_sqft": rng.integers(350, 2200, n),
    "bedrooms": rng.integers(1, 5, n),
    "age_years": rng.integers(0, 30, n),
    "city": rng.choice(["Pune", "Chennai", "Hyderabad", "Kochi"], n),
    "furnished": rng.choice(["none", "semi", "full"], n),
})
city_premium = flats["city"].map({"Pune": 4000, "Chennai": 3000, "Hyderabad": 3500, "Kochi": 1500})
flats["rent"] = (6000 + 14 * flats["area_sqft"] + 1500 * flats["bedrooms"] - 120 * flats["age_years"]
                 + city_premium + rng.normal(0, 2500, n)).round(-2)        # synthetic monthly rent, ₹

X = flats.drop(columns="rent")
y = flats["rent"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
```

## Linear regression

Linear regression fits

```text
prediction = b0 + b1·x1 + b2·x2 + … + bk·xk
```

choosing the intercept `b0` and coefficients `b1…bk` that minimise the **sum of squared errors** on the training data.
Each coefficient reads as: "holding the other features fixed, one more unit of this feature changes the prediction by
`b` units".

```python
from sklearn.linear_model import LinearRegression

numeric = ["area_sqft", "bedrooms", "age_years"]
lin = LinearRegression().fit(X_train[numeric], y_train)
print(dict(zip(numeric, lin.coef_.round(1))), round(lin.intercept_))
```

You should see a coefficient near 14 for `area_sqft`: about ₹14 more rent per extra square foot. That
interpretability is why linear regression is the first model to try, and the baseline for fancier ones.

Linear regression assumes the relationship is roughly linear. Plot **residuals** (actual − predicted) against
predictions: a random cloud around zero is good; a curve or a funnel shape means the model is missing something.

## Regression metrics

| Metric | Formula (in words) | Units | Read it as |
|---|---|---|---|
| **MAE** | average of \|actual − predicted\| | same as the target (₹) | "on average we are off by ₹X" |
| **RMSE** | square root of the average squared error | same as the target | like MAE but punishes large misses more |
| **R²** | 1 − (model's squared error / squared error of predicting the mean) | none, at most 1 | share of variation explained; 0 = no better than the mean, negative = worse |

```python
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

pred = lin.predict(X_test[numeric])
mae = mean_absolute_error(y_test, pred)
rmse = np.sqrt(mean_squared_error(y_test, pred))
r2 = r2_score(y_test, pred)
print(f"MAE ₹{mae:,.0f}   RMSE ₹{rmse:,.0f}   R² {r2:.3f}")
```

Recent scikit-learn versions also provide `root_mean_squared_error` directly. RMSE is always at least MAE; a large gap
means a few predictions are badly wrong. Report MAE to a business audience because it is easiest to explain, and
always compare with the baseline (`DummyRegressor(strategy="mean")`).

## Feature engineering

Models only see the columns you give them. Better features often help more than a fancier model.

| Idea | Example |
|---|---|
| Ratios | `area_per_bedroom = area_sqft / bedrooms` |
| Dates to parts | `order_date` → month, weekday, is_weekend, days since launch |
| Binning | age in years → "new / mid / old" |
| Log transform for right-skewed values | `np.log1p(income)` |
| Domain flags | `is_metro`, `has_parking` |

```python
flats["area_per_bedroom"] = flats["area_sqft"] / flats["bedrooms"]
```

Create features from information available **at prediction time** only.

## Scaling

Features on very different scales (area in thousands, bedrooms 1–4) matter for models that use distances or
gradient-based fitting: k-NN, k-means, regularised linear models, logistic regression. Tree models do not need it.

| Scaler | Transforms to | Use |
|---|---|---|
| `StandardScaler` | mean 0, standard deviation 1 | the default choice |
| `MinMaxScaler` | range 0 to 1 | bounded features, some neural networks |

Fit the scaler on **training data only**, then apply the same transformation to the test data. Fitting on all data
first lets test-set statistics leak into training.

## One-hot encoding

Models need numbers. Replacing cities with 0, 1, 2, 3 would wrongly tell a linear model that Kochi is "three times"
Chennai. **One-hot encoding** creates one 0/1 column per category instead.

| city | city_Chennai | city_Hyderabad | city_Kochi | city_Pune |
|---|---|---|---|---|
| Pune | 0 | 0 | 0 | 1 |
| Kochi | 0 | 0 | 1 | 0 |

For categories with a real order (none < semi < full), `OrdinalEncoder` with an explicit `categories=` list is fine.

## ColumnTransformer: different preparation for different columns

```python
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

numeric = ["area_sqft", "bedrooms", "age_years"]
categorical = ["city", "furnished"]

prep = ColumnTransformer([
    ("num", StandardScaler(), numeric),
    ("cat", OneHotEncoder(handle_unknown="ignore"), categorical),
])

model = Pipeline([("prep", prep), ("reg", LinearRegression())])
model.fit(X_train, y_train)                       # the scaler and encoder learn from training rows only
pred = model.predict(X_test)
print(f"MAE ₹{mean_absolute_error(y_test, pred):,.0f}   R² {r2_score(y_test, pred):.3f}")
```

`handle_unknown="ignore"` stops the model crashing if the test data contains a city it never saw in training (all
city columns become 0). Adding `city` should lower the MAE compared with the numeric-only model, because city carries
real information about rent in this data.

## Lab: house-price or salary regression

In `week-18/ml.ipynb` (or a separate `regression.ipynb` if your main target is a class):

1. Use the rent data above, or a regression target from your own dataset.
2. Baseline with `DummyRegressor(strategy="mean")`: record MAE, RMSE and R².
3. Linear regression on numeric features only; then with a `ColumnTransformer` adding categorical features.
4. Engineer one new feature and test whether it improves the test MAE.
5. Plot residuals against predictions and write one sentence on what you see.
6. A table of the three models with MAE, RMSE and R², and one paragraph saying which you would use and why.

## Check yourself

1. MAE is ₹1,900 and RMSE is ₹6,800. What does the gap tell you?
2. A model has R² = −0.2 on the test set. What does that mean in plain words?
3. Why must `StandardScaler` be fitted on the training set only?
