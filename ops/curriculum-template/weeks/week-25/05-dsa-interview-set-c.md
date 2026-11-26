---
type: notes
title: "W25 · DSA · Interview Set C: Mixed Problems Including Dynamic Programming"
slug: w25-dsa-interview-set-c
topic: Interview Problem Sets
subject: dsa
minutes: 35
description: Decide between greedy and dynamic programming under interview conditions, with worked solutions for Stock with Cooldown (state DP), Valid Parenthesis String (greedy range) and Interleaving String (2-D DP), plus this week's company-style set C.
---
# DSA stream · Week 25: interview set C

Set C mixes everything, with an emphasis on **dynamic programming**, the topic students most often freeze on in
interviews. The aim this week is not to memorise solutions, but to have a reliable way of **finding the DP** (or
noticing that a greedy idea is enough).

## Greedy or DP?

| Ask yourself | If yes |
|---|---|
| Can I make the best local choice and never regret it? Can I argue why? | **Greedy** (sort, then sweep; or track a range) |
| Does today's best choice depend on what I did earlier (a cooldown, a used item, a position in two strings)? | **DP** with that "what I did earlier" as part of the state |
| Am I counting the number of ways? | Almost always **DP** |
| Is it "minimum/maximum over choices" with overlapping subproblems? | **DP** |

### The four DP questions

1. **State**: what do I need to know to continue from here? (index, previous action, positions in two strings)
2. **Transition**: how does a state depend on smaller states?
3. **Base case**: what is known for free (empty string, day 0)?
4. **Answer**: which state holds the final result?

Write these four lines before coding. In an interview, saying them aloud earns credit even before the code works.

## Worked approach 1: Best Time to Buy and Sell Stock with Cooldown (state DP)

You may complete as many transactions as you like, but after selling you must wait one day before buying again.

The cooldown means today's options depend on yesterday's action, so the **state** is "what am I doing at the end of
day i":

| State | Meaning | Transition |
|---|---|---|
| `hold` | I own a share | keep holding, or buy today from `rest` (not from `sold`: cooldown) |
| `sold` | I sold today | sell today from `hold` |
| `rest` | I own nothing and did not sell today | rest again, or yesterday was `sold` |

```python
def max_profit(prices: list[int]) -> int:
    hold, sold, rest = float("-inf"), 0, 0
    for p in prices:
        prev_hold, prev_sold, prev_rest = hold, sold, rest
        hold = max(prev_hold, prev_rest - p)   # keep, or buy after a rest day
        sold = prev_hold + p                    # sell what I hold
        rest = max(prev_rest, prev_sold)        # stay out, or cool down after a sale
    return max(sold, rest)


print(max_profit([1, 2, 3, 0, 2]))  # 3  (buy 1, sell 2, cooldown, buy 0, sell 2)
print(max_profit([]))               # 0
```

Time O(n), space O(1). Saving the previous values before updating is essential: every new state must be computed from
**yesterday's** states, not from ones already updated today.

## Worked approach 2: Valid Parenthesis String (greedy range)

The string has `(`, `)` and `*`, where `*` can be `(`, `)` or empty. Is it valid?

A DP over (index, open count) works, but there is a neater greedy idea. Track the **range** of possible open-bracket
counts: `lo` (fewest possible) and `hi` (most possible).

```python
def check_valid_string(s: str) -> bool:
    lo = hi = 0
    for ch in s:
        if ch == "(":
            lo, hi = lo + 1, hi + 1
        elif ch == ")":
            lo, hi = lo - 1, hi - 1
        else:                      # '*' could close, open, or be empty
            lo, hi = lo - 1, hi + 1
        if hi < 0:                 # even using every '*' as '(' is not enough
            return False
        lo = max(lo, 0)            # open count can never be negative
    return lo == 0                 # some choice closes everything


print(check_valid_string("(*))"))  # True
print(check_valid_string(")("))    # False
```

O(n) time, O(1) space. Why is it correct? Every count between `lo` and `hi` is achievable by some choice of the stars,
so the string is valid exactly when zero is still in the range at the end and `hi` never went negative.

## Worked approach 3: Interleaving String (2-D DP)

Can `s3` be formed by interleaving `s1` and `s2` while keeping each one's character order?

- **State**: `dp[i][j]` is True if the first `i` characters of `s1` and the first `j` of `s2` can form the first
  `i + j` characters of `s3`.
- **Transition**: the last character of that prefix of `s3` came either from `s1` (then `dp[i-1][j]` must be True) or
  from `s2` (then `dp[i][j-1]` must be True).
- **Base case**: `dp[0][0] = True`.
- **Answer**: `dp[len(s1)][len(s2)]`.

```python
def is_interleave(s1: str, s2: str, s3: str) -> bool:
    m, n = len(s1), len(s2)
    if m + n != len(s3):
        return False
    dp = [[False] * (n + 1) for _ in range(m + 1)]
    dp[0][0] = True
    for i in range(m + 1):
        for j in range(n + 1):
            if i > 0 and dp[i - 1][j] and s1[i - 1] == s3[i + j - 1]:
                dp[i][j] = True
            if j > 0 and dp[i][j - 1] and s2[j - 1] == s3[i + j - 1]:
                dp[i][j] = True
    return dp[m][n]


print(is_interleave("aabcc", "dbbca", "aadbbcbcac"))  # True
print(is_interleave("aabcc", "dbbca", "aadbbbaccc"))  # False
```

Time and space O(m·n); the space can be reduced to one row, a good follow-up to mention. **Distinct Subsequences** in
this week's set uses the same two-string grid, but counts ways instead of returning True or False.

## This week's problems (company-style set C)

| # | Problem | Difficulty | Hint |
|---|---|---|---|
| 1 | [Multiply Strings (LC 43)](https://leetcode.com/problems/multiply-strings/) | Medium | digit `i` times digit `j` lands at positions `i + j` and `i + j + 1` |
| 2 | [Game of Life (LC 289)](https://leetcode.com/problems/game-of-life/) | Medium | encode old and new state in the same cell |
| 3 | [Valid Parenthesis String (LC 678)](https://leetcode.com/problems/valid-parenthesis-string/) | Medium | greedy range of open counts |
| 4 | [Best Time to Buy and Sell Stock with Cooldown (LC 309)](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/) | Medium | three states: hold, sold, rest |
| 5 | [Interleaving String (LC 97)](https://leetcode.com/problems/interleaving-string/) | Medium | 2-D DP over prefixes |
| 6 | [Minimum Interval to Include Each Query (LC 1851)](https://leetcode.com/problems/minimum-interval-to-include-each-query/) | Hard | sort intervals and queries; min-heap by interval size |
| 7 | [Distinct Subsequences (LC 115)](https://leetcode.com/problems/distinct-subsequences/) | Hard | 2-D DP counting; use or skip each character of `s` |

Weekly timed contest: 90 minutes, run by your tutor.

## Practice beyond class

For every DP problem you solve this week, write the four lines (state, transition, base case, answer) in your tracker
**before** the code. Then try two DP problems from the **LeetCode 150** sheet using only those four lines as your
starting point.
