---
type: notes
title: "W16 · S1 · Jupyter, Colab and NumPy Arrays"
slug: w16-s1-numpy-arrays-vectorisation
topic: NumPy
subject: programming-fundamentals
minutes: 40
description: Working in Jupyter and Google Colab, then NumPy arrays, dtypes, vectorisation, broadcasting, indexing and slicing, with a lab that times a Python loop against vectorised code.
---
# Jupyter, Colab and NumPy arrays

Phase 4 brings Python back, this time for data. Every tool in the next four weeks (Pandas, Matplotlib, scikit-learn)
is built on one idea from NumPy: **store numbers in a compact array and operate on the whole array at once**.

## Notebooks: Jupyter and Google Colab

A **notebook** is a document made of **cells**. A code cell runs Python and shows its output underneath; a Markdown
cell holds your explanation. Data work lives in notebooks because you can see each step's result and explain it.

| Option | How to start | Good for |
|---|---|---|
| Jupyter in VS Code | Install the Jupyter extension, create `analysis.ipynb`, pick your `.venv` as the kernel | Work saved in your Git repo |
| JupyterLab | `pip install jupyterlab`, then `jupyter lab` | A browser-based editor on your machine |
| Google Colab | colab.research.google.com, sign in, New notebook | No installation; runs in the cloud |

Set up a local environment once for the whole phase:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate     macOS/Linux: source .venv/bin/activate
pip install numpy pandas matplotlib seaborn scikit-learn jupyter openpyxl
pip freeze > requirements.txt
```

Habits that save marks:

- Cells can run in any order, so a notebook can "work" only because of a cell you deleted. Before you commit, use
  **Restart Kernel and Run All**. If it fails, fix it.
- Keep imports in the first cell and constants (file paths, random seeds) in the second.
- Write a Markdown cell before each step saying *what* you are doing and *why*.

## Why NumPy?

A Python list holds references to separate objects, and a `for` loop handles them one at a time in the interpreter.
A NumPy **array** stores values of **one type** in one contiguous block of memory, and its operations run in compiled
code. The same arithmetic is usually many times faster and much shorter to write.

```python
import numpy as np

marks = np.array([72, 85, 64, 91, 58])
print(marks * 1.1)          # every element scaled, no loop
print(marks.mean(), marks.max(), marks.argmax())   # 74.0 91 3
```

## Creating arrays

```python
np.array([1, 2, 3])                 # from a list
np.zeros(5)                         # [0. 0. 0. 0. 0.]
np.ones((2, 3))                     # 2 rows, 3 columns of 1.0
np.arange(0, 10, 2)                 # [0 2 4 6 8]  (stop is excluded)
np.linspace(0, 1, 5)                # [0.   0.25 0.5  0.75 1.  ]  (5 evenly spaced, stop included)

rng = np.random.default_rng(42)     # seeded generator: same numbers every run
rng.integers(1, 7, size=10)         # 10 dice rolls
rng.normal(loc=60, scale=12, size=1000)   # 1,000 marks around 60
```

Use `np.random.default_rng(seed)`; it is the current recommended way to generate random numbers.

## Shape, dimensions and dtype

```python
m = np.array([[70, 80, 90],
              [65, 75, 85]])
m.shape     # (2, 3)  -> 2 rows, 3 columns
m.ndim      # 2
m.size      # 6
m.dtype     # int64 on most systems (int32 on some Windows setups)
m.reshape(3, 2)        # same data, new shape; sizes must match
m.T                    # transpose: shape (3, 2)
```

Every element has the same **dtype**. Mixing types forces an upcast:

| Input | Resulting dtype |
|---|---|
| `np.array([1, 2, 3])` | integer |
| `np.array([1, 2.5])` | `float64` |
| `np.array([1, "a"])` | a string dtype (`<U21`); arithmetic no longer works |
| `np.array([True, 2])` | integer (`True` becomes 1) |

Convert with `astype`: `np.array([1.9, 2.2]).astype(int)` gives `[1 2]` (truncation, as with `int()`).

## Vectorisation

**Vectorised** code expresses the operation on the whole array, not element by element.

```python
prices = np.array([499.0, 1299.0, 249.0, 899.0])
qty = np.array([2, 1, 4, 3])

revenue = prices * qty                  # element-wise multiply
total = revenue.sum()                   # 6091.0
with_gst = prices * 1.18                # 18% GST on every price
discounted = np.where(prices > 500, prices * 0.9, prices)   # vectorised if/else
```

Aggregations take an `axis`: `axis=0` works **down the rows** (one result per column), `axis=1` works **across the
columns** (one result per row).

```python
scores = np.array([[70, 80, 90],     # student 0
                   [65, 75, 85]])    # student 1
scores.mean(axis=0)   # per subject: [67.5 77.5 87.5]
scores.mean(axis=1)   # per student: [80. 75.]
```

## Broadcasting

**Broadcasting** lets arrays of different shapes combine without copying. Compare shapes from the **right**; two
dimensions are compatible if they are **equal or one of them is 1**.

```python
scores = np.array([[70, 80, 90],
                   [65, 75, 85]])        # shape (2, 3)
weights = np.array([0.2, 0.3, 0.5])      # shape (3,)  -> treated as (1, 3)
weighted = scores * weights              # shape (2, 3)
print(weighted.sum(axis=1))              # [83. 78.]

col_means = scores.mean(axis=0)          # shape (3,)
centred = scores - col_means             # subtract each subject's mean
```

`(2, 3)` with `(2,)` fails: the last dimensions are 3 and 2. Reshape to `(2, 1)` if you meant "one value per row":
`scores - np.array([5, 10]).reshape(2, 1)`.

## Indexing and slicing

```python
a = np.arange(10)          # [0 1 2 3 4 5 6 7 8 9]
a[2:5]                     # [2 3 4]
a[::-1]                    # reversed
a[a % 2 == 0]              # boolean mask: [0 2 4 6 8]
a[[1, 3, 5]]               # fancy indexing: [1 3 5]

m = np.arange(12).reshape(3, 4)
m[1, 2]                    # row 1, column 2 -> 6
m[:, 0]                    # first column -> [0 4 8]
m[0:2, 1:3]                # rows 0-1, columns 1-2
m[m > 6] = 0               # set every value above 6 to 0
```

Combine masks with `&`, `|` and `~`, and wrap each condition in brackets: `a[(a > 2) & (a < 7)]`. Python's
`and`/`or` raise an error on arrays.

**Views versus copies.** A basic slice such as `a[2:5]` is a **view**: changing it changes `a`. Boolean and fancy
indexing return **copies**. Use `.copy()` when you need an independent array.

```python
b = a[2:5]
b[0] = 99
print(a[2])        # 99: b was a view of a
```

## Lab: loop versus vectorised, timed

Create `week-16/numpy_lab.ipynb` and work through these cells.

```python
import time
import numpy as np

rng = np.random.default_rng(7)
marks = rng.integers(0, 101, size=1_000_000)

# 1. Python loop
start = time.perf_counter()
total = 0
for m in marks.tolist():
    total += m * m
loop_seconds = time.perf_counter() - start

# 2. Vectorised
start = time.perf_counter()
total_vec = int((marks.astype(np.int64) ** 2).sum())
vec_seconds = time.perf_counter() - start

print(total == total_vec)
print(f"loop {loop_seconds:.4f}s  vectorised {vec_seconds:.4f}s  speed-up {loop_seconds / vec_seconds:.0f}x")
```

In Jupyter you can also use the `%timeit` magic: `%timeit (marks ** 2).sum()`.

Then, without loops:

1. Count how many marks are 40 or above (hint: `(marks >= 40).sum()`).
2. Convert marks to grades with `np.select([marks >= 90, marks >= 75, marks >= 40], ["A", "B", "C"], default="F")`.
3. Build a `(1000, 5)` matrix of five subject scores, compute each student's weighted total with broadcasting, and find
   the index of the top student with `argmax`.
4. Write a Markdown cell explaining why the vectorised version is faster and record your measured speed-up.

## Check yourself

1. What is the shape of `np.ones((4, 1)) + np.arange(3)`, and why?
2. Why does `np.array([1, 2, "3"]) * 2` not give `[2 4 6]`?
3. After `b = a[1:4]; b[:] = 0`, has `a` changed? What about `c = a[a > 2]; c[:] = 0`?
