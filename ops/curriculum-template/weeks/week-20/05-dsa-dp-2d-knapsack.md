---
type: notes
title: "W20 · DSA · Dynamic Programming II: Grids, Two Strings and Knapsack"
slug: w20-dsa-dp-2d-knapsack
topic: Dynamic Programming II
subject: dsa
minutes: 40
description: Two-dimensional DP tables for grids and pairs of strings, the 0/1 knapsack take-or-skip choice, how to shrink a 2-D table to one row, and this week's problems with worked solutions.
---
# DSA stream · Week 20: dynamic programming II (2-D and knapsack)

Last week every state was one number: `dp[i]`. This week a state needs **two numbers**: a row and a column in a grid,
a position in each of two strings, or "items considered so far" and "capacity left".

## Pattern card

- **Signal:** a grid you move through; two strings compared; "choose a subset with sum / weight at most W";
  "capacity".
- **Core move:** define `dp[i][j]` in one sentence, compute it from neighbours (top, left, diagonal), fill the table
  in an order where those neighbours are already known.
- **Builds on:** Week 19 1-D DP; Week 1 pyramids (thinking row by row); Week 16 grids.
- **Trap:** in a 1-D knapsack, looping capacity **upwards** lets one item be used twice.

## The four-step DP recipe (with two indices)

1. **State**: write in words what `dp[i][j]` means. If you cannot, stop and think again.
2. **Transition**: how `dp[i][j]` is built from smaller states.
3. **Base cases**: the first row, the first column, or empty strings.
4. **Order and answer**: which loop order guarantees the inputs are ready, and which cell holds the answer.

## Worked approach 1: Unique Paths (grid DP)

A robot starts at the top-left of an `m × n` grid and can move only right or down. How many paths reach the
bottom-right?

- **State**: `dp[r][c]` = number of paths from the start to cell `(r, c)`.
- **Transition**: you arrive from above or from the left, so `dp[r][c] = dp[r-1][c] + dp[r][c-1]`.
- **Base cases**: every cell in the first row and first column has exactly one path.
- **Answer**: `dp[m-1][n-1]`.

Table for `m = 3, n = 4`:

| | c0 | c1 | c2 | c3 |
|---|---|---|---|---|
| r0 | 1 | 1 | 1 | 1 |
| r1 | 1 | 2 | 3 | 4 |
| r2 | 1 | 3 | 6 | 10 |

```python
def unique_paths(m: int, n: int) -> int:
    dp = [[1] * n for _ in range(m)]
    for r in range(1, m):
        for c in range(1, n):
            dp[r][c] = dp[r - 1][c] + dp[r][c - 1]
    return dp[m - 1][n - 1]

print(unique_paths(3, 4))  # 10
print(unique_paths(3, 7))  # 28
```

**Space trick**: each row only needs the row above, so one list is enough. `row[c]` still holds the value from the row
above when you read it, and `row[c - 1]` already holds this row's left neighbour:

```python
def unique_paths_1d(m: int, n: int) -> int:
    row = [1] * n
    for _ in range(1, m):
        for c in range(1, n):
            row[c] += row[c - 1]
    return row[-1]
```

Time `O(m·n)`, space `O(n)`. Unique Paths II (obstacles) is the same table with `dp = 0` on blocked cells; Minimum
Path Sum replaces `+` with `min` and adds the cell's cost.

## Worked approach 2: Longest Common Subsequence (two strings)

A **subsequence** keeps the order of characters but may skip some: `"ace"` is a subsequence of `"abcde"`.

- **State**: `dp[i][j]` = length of the LCS of the first `i` characters of `a` and the first `j` characters of `b`.
- **Transition**:
  - if `a[i-1] == b[j-1]`: `dp[i][j] = dp[i-1][j-1] + 1` (take the match, move diagonally);
  - otherwise: `dp[i][j] = max(dp[i-1][j], dp[i][j-1])` (drop a character from one string).
- **Base cases**: an empty string has LCS 0 with anything, so row 0 and column 0 are zeros. This is why the table has
  size `(len(a) + 1) × (len(b) + 1)`.
- **Answer**: `dp[len(a)][len(b)]`.

```python
def lcs(a: str, b: str) -> int:
    rows, cols = len(a) + 1, len(b) + 1
    dp = [[0] * cols for _ in range(rows)]
    for i in range(1, rows):
        for j in range(1, cols):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[-1][-1]

print(lcs("abcde", "ace"))   # 3
print(lcs("abc", "def"))     # 0
```

**Edit Distance** uses the same table shape. With `dp[i][j]` = minimum operations to turn the first `i` characters of
`a` into the first `j` of `b`: on a match copy the diagonal; otherwise take `1 + min(insert, delete, replace)` =
`1 + min(dp[i][j-1], dp[i-1][j], dp[i-1][j-1])`. The base cases differ: `dp[i][0] = i` and `dp[0][j] = j`.

## Worked approach 3: 0/1 knapsack

You have items with weights and values and a bag of capacity `W`. Each item can be taken **at most once**. Maximise the
total value.

- **State**: `dp[i][w]` = best value using the first `i` items with capacity `w`.
- **Transition**: for item `i` (weight `wt`, value `val`), either skip it or take it if it fits:
  `dp[i][w] = max(dp[i-1][w], dp[i-1][w - wt] + val)`.
- **Base cases**: no items or no capacity gives value 0.

The take branch reads from row `i - 1`, which is what stops an item being used twice. In the one-row version you keep
that guarantee by looping capacity **downwards**, so `dp[w - wt]` is still the previous row's value:

```python
def knapsack(weights: list[int], values: list[int], capacity: int) -> int:
    dp = [0] * (capacity + 1)
    for wt, val in zip(weights, values):
        for w in range(capacity, wt - 1, -1):      # downwards: each item used at most once
            dp[w] = max(dp[w], dp[w - wt] + val)
    return dp[capacity]

print(knapsack([1, 3, 4, 5], [1, 4, 5, 7], 7))  # 9  (weights 3 + 4)
```

If you loop `w` upwards instead, `dp[w - wt]` may already include this item, and you get the **unbounded** knapsack
(items reusable). That is exactly what Coin Change II needs, and exactly what 0/1 knapsack must avoid.

### Partition Equal Subset Sum as knapsack

Can the array be split into two parts with equal sums? Only if the total is even and some subset sums to `total // 2`.
That is a 0/1 knapsack with booleans instead of values:

```python
def can_partition(nums: list[int]) -> bool:
    total = sum(nums)
    if total % 2:
        return False
    target = total // 2
    reachable = [False] * (target + 1)
    reachable[0] = True                       # the empty subset sums to 0
    for x in nums:
        for s in range(target, x - 1, -1):    # downwards again
            reachable[s] = reachable[s] or reachable[s - x]
    return reachable[target]

print(can_partition([1, 5, 11, 5]))  # True  (11 and 1 + 5 + 5)
print(can_partition([1, 2, 3, 5]))   # False (total 11 is odd)
```

## This week's problems

| # | Problem | Role | Hint |
|---|---|---|---|
| 1 | [Unique Paths (LeetCode 62)](https://leetcode.com/problems/unique-paths/) | Lab | top + left |
| 2 | [Unique Paths II (LeetCode 63)](https://leetcode.com/problems/unique-paths-ii/) | Twist | obstacle cell = 0 |
| 3 | [Minimum Path Sum (LeetCode 64)](https://leetcode.com/problems/minimum-path-sum/) | Twist | `min` instead of `+` |
| 4 | [Triangle (LeetCode 120)](https://leetcode.com/problems/triangle/) | Combine | fill from the bottom row upwards |
| 5 | [Longest Common Subsequence (LeetCode 1143)](https://leetcode.com/problems/longest-common-subsequence/) | Lab | match → diagonal + 1 |
| 6 | 0/1 Knapsack (classic, on the Pattern Path) | Lab | take or skip; capacity loop downwards |
| 7 | [Partition Equal Subset Sum (LeetCode 416)](https://leetcode.com/problems/partition-equal-subset-sum/) | Lab | knapsack with target = total / 2 |
| 8 | Coin Change II (LeetCode 518) | Twist | unbounded: capacity loop upwards, count ways |
| 9 | [Target Sum (LeetCode 494)](https://leetcode.com/problems/target-sum/) | Combine | rewrite as "subset with sum (total + target) / 2" |
| 10 | [Edit Distance (LeetCode 72)](https://leetcode.com/problems/edit-distance/) | Lab | LCS table with three moves |
| 11 | [Maximal Square (LeetCode 221)](https://leetcode.com/problems/maximal-square/) | Stretch | 1 + min of three neighbours |
| 12 | [Longest Increasing Path in a Matrix (LeetCode 329)](https://leetcode.com/problems/longest-increasing-path-in-a-matrix/) | Stretch | grid DFS + memo |

The weekly test includes two DP questions. Before it, make sure you can write Unique Paths and LCS from a blank file
and explain why the knapsack capacity loop runs downwards.

## Practice beyond class

Continue the **Pattern Path** sheet (Week 20 group). For each problem, write the one-sentence state definition as a
comment above your code before you write anything else.
