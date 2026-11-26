---
type: notes
title: "W4 · DSA · Arrays: Traversal, In-Place Updates, Rotation and Kadane"
slug: w04-dsa-arrays
topic: Arrays
subject: dsa
minutes: 40
description: Array traversal, insertion and deletion costs, two-index reversal, rotation by the reversal trick, the write-index pattern, running minimum and Kadane's algorithm, with this week's five problems worked through.
---
# DSA stream · Week 4: arrays

An **array** is a block of items stored next to each other, reachable by index. In Python, the `list` plays this role.
Most interview problems are array problems in disguise, and almost all of this week's solutions share one idea:
**one pass, carrying a well-chosen running value**.

## How to recognise the pattern

Signals: *in place*, *subarray*, *rotate*, *maximum profit*, *move all X to the end*, *O(1) extra space*. When you see
them, ask: "What single value (or index) can I carry through one loop that gives me the answer?"

## Costs to know

| Operation | Cost | Why |
|---|---|---|
| read or write `a[i]` | O(1) | direct address |
| append at the end | O(1) amortised | usually spare room at the end |
| insert or delete at index `i` | O(n − i) | every later item shifts by one |
| insert or delete at the front | O(n) | everything shifts |
| search for a value | O(n) | unless the array is sorted |

So "delete every zero with `a.remove(0)` in a loop" is O(n²). The **write index** pattern below does it in O(n).

## Reversal with two indexes

```python
def reverse_range(a, lo, hi):
    """Reverse a[lo..hi] in place (both ends included)."""
    while lo < hi:
        a[lo], a[hi] = a[hi], a[lo]
        lo += 1
        hi -= 1
```

O(n) time and O(1) extra space. You need to be able to write this by hand; it is the building block for rotation.

## Rotate Array: the reversal trick

[Rotate Array (LeetCode 189)](https://leetcode.com/problems/rotate-array/): rotate `nums` to the right by `k` steps,
in place.

`[1, 2, 3, 4, 5, 6, 7]`, `k = 3` → `[5, 6, 7, 1, 2, 3, 4]`

1. `k %= n` (rotating by `n` changes nothing, and `k` may be larger than `n`).
2. Reverse the whole array: `[7, 6, 5, 4, 3, 2, 1]`
3. Reverse the first `k` items: `[5, 6, 7, 4, 3, 2, 1]`
4. Reverse the rest: `[5, 6, 7, 1, 2, 3, 4]`

```python
def rotate(nums, k):
    n = len(nums)
    k %= n
    reverse_range(nums, 0, n - 1)
    reverse_range(nums, 0, k - 1)
    reverse_range(nums, k, n - 1)
```

O(n) time, O(1) space. `nums[:] = nums[-k:] + nums[:-k]` also passes, but it builds new lists (O(n) extra space);
know both and say which one you are using.

## The write index: Move Zeroes

[Move Zeroes (LeetCode 283)](https://leetcode.com/problems/move-zeroes/): move all zeros to the end, keeping the
order of the other values, in place.

Keep a **write index** `w`: the position where the next non-zero value belongs. Read every item; when it is non-zero,
swap it into position `w` and move `w` forward.

```python
def move_zeroes(nums):
    w = 0
    for r in range(len(nums)):
        if nums[r] != 0:
            nums[w], nums[r] = nums[r], nums[w]
            w += 1
```

| r | nums[r] | action | nums after | w |
|---|---|---|---|---|
| 0 | 0 | skip | [0, 1, 0, 3, 12] | 0 |
| 1 | 1 | swap 0↔1 | [1, 0, 0, 3, 12] | 1 |
| 2 | 0 | skip | [1, 0, 0, 3, 12] | 1 |
| 3 | 3 | swap 1↔3 | [1, 3, 0, 0, 12] | 2 |
| 4 | 12 | swap 2↔4 | [1, 3, 12, 0, 0] | 3 |

O(n) time, O(1) space. The same write index solves Remove Element (LC 27) and Remove Duplicates from Sorted Array
(LC 26).

## Running minimum: Best Time to Buy and Sell Stock

[Best Time to Buy and Sell Stock (LeetCode 121)](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/):
buy on one day and sell on a later day; return the maximum profit (0 if no profit is possible).

Brute force tries every pair of days: O(n²). Instead, walk once, carrying **the cheapest price so far**. On each day,
the best you could do by selling today is `price - min_price`.

```python
def max_profit(prices):
    min_price = float("inf")
    best = 0
    for p in prices:
        if p < min_price:
            min_price = p
        elif p - min_price > best:
            best = p - min_price
    return best

assert max_profit([7, 1, 5, 3, 6, 4]) == 5     # buy at 1, sell at 6
assert max_profit([7, 6, 4, 3, 1]) == 0
```

O(n) time, O(1) space.

## Kadane's algorithm: Maximum Subarray

[Maximum Subarray (LeetCode 53)](https://leetcode.com/problems/maximum-subarray/): find the contiguous subarray with
the largest sum (it must contain at least one number).

Carry `current`: the best sum of a subarray **ending at this index**. At each item, either extend the previous
subarray or start fresh here, whichever is larger. If `current` has gone negative, it can only drag the next sum down,
so starting fresh wins.

```python
def max_subarray(nums):
    current = best = nums[0]
    for x in nums[1:]:
        current = max(x, current + x)
        best = max(best, current)
    return best

assert max_subarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]) == 6    # [4, -1, 2, 1]
assert max_subarray([-3, -1, -2]) == -1                       # all negative
```

Starting from `nums[0]` (not 0) is what makes the all-negative case correct. O(n) time, O(1) space.
(`nums[1:]` copies the list; loop with `for i in range(1, len(nums))` if you want strictly O(1) extra space.)

## Missing Number: three approaches

[Missing Number (LeetCode 268)](https://leetcode.com/problems/missing-number/): `nums` holds `n` distinct numbers from
the range `0..n`; one is missing.

| Approach | Idea | Time | Space |
|---|---|---|---|
| Set | put all in a set, check `0..n` | O(n) | O(n) |
| Sum formula | `n(n+1)/2 - sum(nums)` | O(n) | O(1) |
| XOR | `x ^ x = 0`, so XOR all indexes and values; pairs cancel | O(n) | O(1) |

```python
def missing_number(nums):
    n = len(nums)
    return n * (n + 1) // 2 - sum(nums)

assert missing_number([3, 0, 1]) == 2
assert missing_number([0, 1]) == 2
```

## This week's problems

| Problem | Pattern | Hint |
|---|---|---|
| [Best Time to Buy and Sell Stock (LeetCode 121)](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/) | running minimum | profit if sold today = price − cheapest so far |
| [Rotate Array (LeetCode 189)](https://leetcode.com/problems/rotate-array/) | reversal | `k %= n`, then three reversals |
| [Move Zeroes (LeetCode 283)](https://leetcode.com/problems/move-zeroes/) | write index | swap non-zeros forward |
| [Maximum Subarray (LeetCode 53)](https://leetcode.com/problems/maximum-subarray/) | Kadane | extend or restart; start from `nums[0]` |
| [Missing Number (LeetCode 268)](https://leetcode.com/problems/missing-number/) | math / set / XOR | expected sum minus actual sum |

**Pattern Path extras** (optional):
[Remove Element (LeetCode 27)](https://leetcode.com/problems/remove-element/),
[Remove Duplicates from Sorted Array (LeetCode 26)](https://leetcode.com/problems/remove-duplicates-from-sorted-array/),
[Contains Duplicate II (LeetCode 219)](https://leetcode.com/problems/contains-duplicate-ii/),
[Maximum Sum Circular Subarray (LeetCode 918)](https://leetcode.com/problems/maximum-sum-circular-subarray/).

## Edge-case checklist for array problems

- [ ] a single element, and (if allowed) an empty array
- [ ] all negative, all zero, or all equal values
- [ ] `k` larger than the length (rotation)
- [ ] the answer at the very first or very last index

## Practice beyond class

The Phase 1 test includes array and hashing problems, so finish this week's five before it. For extra practice beyond
the Pattern Path, the **DSA Sheet 150** in DSA Practice has the full topic-wise problem list; start with its array
problems.
