---
type: notes
title: "W10 · DSA · Recursion and Backtracking: Choose, Explore, Undo"
slug: w10-dsa-recursion-backtracking
topic: Recursion & Backtracking
subject: dsa
minutes: 35
description: Base case and recursive case, the call stack, recursion trees, and the backtracking template (choose, explore, undo) applied to Subsets, Permutations, Combination Sum and Generate Parentheses.
---
# DSA stream · Week 10: recursion and backtracking

## Recursion in one sentence

A recursive function solves a problem by **solving a smaller copy of the same problem** and building on the result.
Every recursive function needs:

1. a **base case** that answers directly without recursing, and
2. a **recursive case** that moves towards the base case.

```python
def factorial(n: int) -> int:
    if n <= 1:            # base case
        return 1
    return n * factorial(n - 1)   # smaller problem
```

The key mindset: **trust the smaller call**. When writing `factorial(n)`, assume `factorial(n - 1)` already works and
ask only "how do I use it?".

### The call stack

Each call waits for the one below it. `factorial(4)`:

```text
factorial(4) = 4 * factorial(3)
                   factorial(3) = 3 * factorial(2)
                                      factorial(2) = 2 * factorial(1)
                                                         factorial(1) = 1     ← base case
                                      = 2 * 1 = 2
                   = 3 * 2 = 6
= 4 * 6 = 24
```

Forget the base case and the calls never stop: Python raises `RecursionError` after about 1000 nested calls (the
default limit).

### Power: halving the work

`x ** n` by multiplying `n` times is O(n). Halve the exponent instead:

```python
def power(x: float, n: int) -> float:
    if n == 0:
        return 1.0
    if n < 0:
        return 1 / power(x, -n)
    half = power(x, n // 2)
    return half * half if n % 2 == 0 else half * half * x

print(power(2, 10))   # 1024.0
```

Each call halves `n`, so this is O(log n): the same halving idea as last week's binary search. This is LeetCode 50,
Pow(x, n).

## From recursion to backtracking

Backtracking problems ask for **all** answers: every subset, every arrangement, every valid combination. The signal
words are "all possible", "generate", "every combination".

The template is **choose → explore → undo**:

```python
def backtrack(state, choices):
    if is_complete(state):
        results.append(copy_of(state))
        return
    for choice in choices:
        if not allowed(choice):
            continue
        state.append(choice)        # choose
        backtrack(state, ...)       # explore
        state.pop()                 # undo
```

**Draw the recursion tree first, every time.** Each node is a partial answer; each edge is a choice. The tree tells you
the base case, the choices at each level and when to stop.

## Subsets (LC 78)

For each element, there are two choices: **include it or leave it out**. With `[1, 2, 3]`:

```text
                         []
             include 1 /    \ skip 1
                    [1]      []
                   /   \     /  \
               [1,2]  [1] [2]   []
               / \    / \  / \   / \
         [1,2,3][1,2][1,3][1][2,3][2][3][]   ← 8 leaves = 2^3 subsets
```

```python
def subsets(nums: list[int]) -> list[list[int]]:
    result: list[list[int]] = []
    path: list[int] = []

    def dfs(i: int) -> None:
        if i == len(nums):
            result.append(path[:])      # a COPY of path
            return
        path.append(nums[i])            # choose: include nums[i]
        dfs(i + 1)
        path.pop()                      # undo
        dfs(i + 1)                      # skip nums[i]

    dfs(0)
    return result

print(subsets([1, 2, 3]))
# [[1, 2, 3], [1, 2], [1, 3], [1], [2, 3], [2], [3], []]
```

**The number one bug:** `result.append(path)` instead of `path[:]`. That stores the same list object every time; by
the end it is empty, and so is every "answer". Always append a copy.

Complexity: 2^n subsets, each up to n long, so O(n · 2^n). That is fine: the output itself is that big.

## Permutations (LC 46)

At each level, choose any element **not used yet**:

```python
def permute(nums: list[int]) -> list[list[int]]:
    result: list[list[int]] = []
    path: list[int] = []
    used = [False] * len(nums)

    def dfs() -> None:
        if len(path) == len(nums):
            result.append(path[:])
            return
        for i, x in enumerate(nums):
            if used[i]:
                continue
            used[i] = True
            path.append(x)              # choose
            dfs()                       # explore
            path.pop()                  # undo
            used[i] = False

    dfs()
    return result

print(len(permute([1, 2, 3])))   # 6 = 3!
```

The tree has n choices at the first level, n − 1 at the next, and so on: n! leaves.

## Combination Sum (LC 39)

Find all combinations of `candidates` (distinct positive numbers) that add up to `target`. A number may be reused.

Two ideas keep the tree small and free of duplicates:

- Pass a `start` index so you never go back to earlier candidates: `[2, 3]` and `[3, 2]` are the same combination.
- **Prune**: stop exploring as soon as the remaining target goes below zero. Sorting first lets you `break` early.

```python
def combination_sum(candidates: list[int], target: int) -> list[list[int]]:
    candidates.sort()
    result: list[list[int]] = []
    path: list[int] = []

    def dfs(start: int, remaining: int) -> None:
        if remaining == 0:
            result.append(path[:])
            return
        for i in range(start, len(candidates)):
            c = candidates[i]
            if c > remaining:
                break                    # sorted, so every later candidate is too big as well
            path.append(c)
            dfs(i, remaining - c)        # i, not i + 1: c may be reused
            path.pop()

    dfs(0, target)
    return result

print(combination_sum([2, 3, 6, 7], 7))   # [[2, 2, 3], [7]]
```

## Generate Parentheses (LC 22)

Generate all valid strings of `n` pairs. The choices are limited by two rules:

- you may add `(` while `open < n`;
- you may add `)` only while `close < open` (never close more than you have opened).

```python
def generate_parenthesis(n: int) -> list[str]:
    result: list[str] = []

    def dfs(s: str, open_: int, close: int) -> None:
        if len(s) == 2 * n:
            result.append(s)
            return
        if open_ < n:
            dfs(s + "(", open_ + 1, close)
        if close < open_:
            dfs(s + ")", open_, close + 1)

    dfs("", 0, 0)
    return result

print(generate_parenthesis(3))
# ['((()))', '(()())', '(())()', '()(())', '()()()']
```

Strings are immutable, so `s + "("` already creates a new string and there is nothing to undo. The same "close only
if something is open" rule comes back in Week 12, checked with a stack.

## Recognising the variant

| Question shape | Choice at each step | Key detail |
|---|---|---|
| all subsets | include / skip | 2^n results |
| all orderings | any unused element | `used` array, n! results |
| combinations adding to a target | candidates from `start` onwards | `start` prevents duplicates; prune on sum |
| strings that follow a rule | only the moves the rule allows | the rule is the pruning |

## This week's problems

| Problem | Pattern | Hint |
|---|---|---|
| Power and factorial with recursion | base case + smaller call | redo your Week 2 loop versions recursively |
| [Pow(x, n) (LeetCode 50)](https://leetcode.com/problems/powx-n/) | halving recursion | stretch: handle negative `n` |
| [Subsets (LeetCode 78)](https://leetcode.com/problems/subsets/) | include / skip | append `path[:]`, not `path` |
| [Permutations (LeetCode 46)](https://leetcode.com/problems/permutations/) | unused choices | a `used` list, undo both changes |
| [Combination Sum (LeetCode 39)](https://leetcode.com/problems/combination-sum/) | choices from `start` | recurse with `i` to allow reuse; sort and break |
| [Generate Parentheses (LeetCode 22)](https://leetcode.com/problems/generate-parentheses/) | rule-limited choices | `open < n`, `close < open` |

Draw the recursion tree on paper for each problem before you code it, with at least the first two levels.

## Practice beyond class

Week 10 of the **Pattern Path** sheet adds Combinations, Subsets II and Letter Combinations of a Phone Number. For
Subsets II, you will need the sort-and-skip-duplicates trick from 3Sum in Week 7.
