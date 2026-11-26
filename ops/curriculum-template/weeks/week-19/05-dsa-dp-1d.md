---
type: notes
title: "W19 · DSA · Dynamic Programming I: 1-D"
slug: w19-dsa-dynamic-programming-1d
topic: Dynamic Programming
subject: dsa
minutes: 40
description: Dynamic programming from recursion to memoisation to a table to two variables, the four-question method for defining dp[i], worked solutions to Climbing Stairs, House Robber, Coin Change and Longest Increasing Subsequence, and this week's problem ladder.
---
# DSA stream · Week 19: dynamic programming I (1-D)

**Dynamic programming (DP)** solves a problem by combining answers to smaller versions of the same problem, and
**storing** each smaller answer so it is computed only once. You have already met the idea: Fibonacci in Week 2 and
recursion in Week 10.

## Pattern card

- **Signal:** "number of ways", "minimum cost", "maximum you can take", "is it possible", with a **choice at each
  step**.
- **Core move:** define `dp[i]`, write how it depends on smaller `i`, fill the table in order.
- **Builds on:** Week 2 Fibonacci; Week 10 recursion (memoise first, then turn it into a table); Week 4 Kadane.
- **Trap:** jumping to the table before you can say in one sentence what `dp[i]` means.

## When is DP the right tool?

Two properties:

1. **Overlapping subproblems:** a plain recursion solves the same smaller problem many times.
2. **Optimal substructure:** the best answer for size `i` is built from the best answers for smaller sizes.

Greedy (Week 18) commits to one choice per step. DP **tries every choice** at each step, but reuses stored results, so
it stays fast.

## The four questions

For every DP problem, write these before coding:

| Question | Climbing Stairs (LC 70) |
|---|---|
| 1. **State:** what does `dp[i]` mean, in one sentence? | number of distinct ways to reach step `i` |
| 2. **Transition:** how does `dp[i]` use smaller states? | the last move was 1 step or 2: `dp[i] = dp[i-1] + dp[i-2]` |
| 3. **Base cases:** the smallest answers you know directly | `dp[0] = 1` (one way: do nothing), `dp[1] = 1` |
| 4. **Answer and order:** which state is the answer; fill in what order? | `dp[n]`; `i` from 2 up to `n` |

## From recursion to two variables

The same problem in four stages. Learn this progression; it works for every 1-D problem this week.

```python
from functools import cache

# 1. Plain recursion: correct, but O(2^n) because subproblems repeat
def climb_rec(n):
    if n <= 1:
        return 1
    return climb_rec(n - 1) + climb_rec(n - 2)

# 2. Memoisation (top-down): store each answer the first time it is computed, O(n)
@cache
def climb_memo(n):
    if n <= 1:
        return 1
    return climb_memo(n - 1) + climb_memo(n - 2)

# 3. Tabulation (bottom-up): fill an array from the base cases up, O(n) time and space
def climb_table(n):
    dp = [0] * (n + 1)
    dp[0] = 1
    if n >= 1:
        dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]
    return dp[n]

# 4. Space optimised: dp[i] needs only the previous two values, O(1) space
def climb(n):
    prev2, prev1 = 1, 1          # dp[i-2], dp[i-1]
    for _ in range(2, n + 1):
        prev2, prev1 = prev1, prev1 + prev2
    return prev1
```

Memoisation is easiest to write from a recursive idea. Tabulation avoids Python's recursion limit (about 1,000 deep)
and makes the space optimisation visible.

## Worked approach: Min Cost Climbing Stairs (LC 746)

`cost[i]` is paid when you step on stair `i`; you may start at stair 0 or 1 and climb 1 or 2 at a time; the top is
just past the last stair.

- **State:** `dp[i]` = minimum cost to stand on position `i` (the top is position `n`), not yet paying `cost[i]`.
- **Transition:** `dp[i] = min(dp[i-1] + cost[i-1], dp[i-2] + cost[i-2])`.
- **Base:** `dp[0] = dp[1] = 0` (you may start on either for free).

```python
def min_cost_climbing_stairs(cost):
    prev2, prev1 = 0, 0                               # dp[i-2], dp[i-1]
    for i in range(2, len(cost) + 1):
        prev2, prev1 = prev1, min(prev1 + cost[i - 1], prev2 + cost[i - 2])
    return prev1
```

The same recurrence as Climbing Stairs, with `min` and costs instead of `+`.

## Worked approach: House Robber (LC 198)

Adjacent houses cannot both be robbed. Maximise the total.

- **State:** `dp[i]` = the most you can rob from the first `i` houses.
- **Transition:** for house `i - 1`, either **skip** it (`dp[i-1]`) or **take** it and skip its neighbour
  (`dp[i-2] + nums[i-1]`): `dp[i] = max(dp[i-1], dp[i-2] + nums[i-1])`.
- **Base:** `dp[0] = 0` (no houses).

```python
def rob(nums):
    prev2, prev1 = 0, 0
    for money in nums:
        prev2, prev1 = prev1, max(prev1, prev2 + money)
    return prev1
```

Trace `[2, 7, 9, 3, 1]`: best totals go 2, 7, 11, 11, 12. Answer 12 (2 + 9 + 1).

## Worked approach: Coin Change (LC 322)

Fewest coins to make `amount`, or -1. Greedy fails here (Week 18: coins `[1, 3, 4]`, amount 6).

- **State:** `dp[a]` = fewest coins that make amount `a`.
- **Transition:** try every coin as the last one: `dp[a] = min(dp[a - c] + 1)` over coins `c <= a`.
- **Base:** `dp[0] = 0`; everything else starts at infinity (not yet reachable).

```python
def coin_change(coins, amount):
    INF = amount + 1                        # more coins than could ever be needed
    dp = [0] + [INF] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
    return dp[amount] if dp[amount] != INF else -1
```

Time O(amount × number of coins). Here the "index" is an amount, not a position in an array: 1-D DP is about one
changing quantity, whatever it measures.

## Worked approach: Longest Increasing Subsequence (LC 300)

- **State:** `dp[i]` = length of the longest strictly increasing subsequence that **ends at** index `i`.
- **Transition:** `dp[i] = 1 + max(dp[j])` over `j < i` with `nums[j] < nums[i]` (or 1 if there is none).
- **Answer:** `max(dp)`, not `dp[-1]`, because the best subsequence can end anywhere.

```python
def length_of_lis(nums):
    dp = [1] * len(nums)
    for i in range(len(nums)):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)
```

This is O(n²). An O(n log n) version keeps, for each length, the smallest possible tail value and updates it with
binary search (Week 9, `bisect_left`); try it as a stretch.

## This week's problems

| Problem | Role | Hint |
|---|---|---|
| [Climbing Stairs (LC 70)](https://leetcode.com/problems/climbing-stairs/) | Lab | recursion → memo → table → two variables |
| [Min Cost Climbing Stairs (LC 746)](https://leetcode.com/problems/min-cost-climbing-stairs/) | Lab | the top is position `n` |
| [House Robber (LC 198)](https://leetcode.com/problems/house-robber/) | Lab | take or skip |
| [House Robber II (LC 213)](https://leetcode.com/problems/house-robber-ii/) | Twist | run House Robber without the first house, then without the last |
| [Decode Ways (LC 91)](https://leetcode.com/problems/decode-ways/) | Twist | Climbing Stairs with conditions; watch for "0" |
| [Coin Change (LC 322)](https://leetcode.com/problems/coin-change/) | Lab | minimum over every coin as the last one |
| [Maximum Product Subarray (LC 152)](https://leetcode.com/problems/maximum-product-subarray/) | Combine | Kadane tracking both max and min |
| [Word Break (LC 139)](https://leetcode.com/problems/word-break/) | Combine | `dp[i]` = the first `i` letters can be split; use a word set |
| [Longest Increasing Subsequence (LC 300)](https://leetcode.com/problems/longest-increasing-subsequence/) | Lab | answer is `max(dp)` |
| [Longest Palindromic Substring (LC 5)](https://leetcode.com/problems/longest-palindromic-substring/) | Stretch | expand around each centre |

## Practice beyond class

These match Week 19 of the **Pattern Path** sheet. For each problem, write the four answers (state, transition, base,
order) in your tracker **before** coding. Revise the 1-D DP problems on the **Blind 75** sheet; Week 20 builds 2-D DP
on top of this.
