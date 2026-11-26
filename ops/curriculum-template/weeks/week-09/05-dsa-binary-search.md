---
type: notes
title: "W9 · DSA · Binary Search: Halving the Range and Searching on the Answer"
slug: w09-dsa-binary-search
topic: Binary Search
subject: dsa
minutes: 35
description: One reliable binary search template, the "first index where a condition becomes true" idea, rotated arrays, binary search on the answer (Koko Eating Bananas), and this week's problems.
---
# DSA stream · Week 9: binary search

Linear search checks every element: O(n). If the data is **sorted**, you can do far better. Look at the middle; it
tells you which half cannot contain the answer, so you throw that half away. Each step halves the range, so the work
is **O(log n)**: about 20 steps for a million elements.

## How to recognise it

- The input is **sorted** (or sorted in pieces, like a rotated array).
- The problem says "in O(log n)".
- It asks for the **minimum or maximum value such that** some condition holds ("the smallest speed that finishes in
  h hours"). The answer space is sorted even when no array is.

## Template 1: find an exact value

```python
def binary_search(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums) - 1          # the answer, if it exists, is inside [lo, hi]
    while lo <= hi:                    # the range is not empty
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1               # mid and everything left of it are too small
        else:
            hi = mid - 1               # mid and everything right of it are too big
    return -1
```

Trace `nums = [-1, 0, 3, 5, 9, 12]`, `target = 9`:

| lo | hi | mid | nums[mid] | action |
|---|---|---|---|---|
| 0 | 5 | 2 | 3 | 3 < 9 → lo = 3 |
| 3 | 5 | 4 | 9 | found → return 4 |

In Python `(lo + hi) // 2` is safe. In Java or C++, write `lo + (hi - lo) / 2` to avoid integer overflow.

## Template 2: the first index where a condition is true

Most binary search problems are really this question: given a condition that is **false, false, …, false, true,
true, …, true** across the range, where does it first become true?

```python
def first_true(lo: int, hi: int, ok) -> int:
    """Smallest x in [lo, hi] with ok(x) True. Returns hi + 1 if none."""
    hi += 1                            # search the half-open range [lo, hi)
    while lo < hi:
        mid = (lo + hi) // 2
        if ok(mid):
            hi = mid                   # mid might be the answer; keep it
        else:
            lo = mid + 1               # mid is not the answer
    return lo
```

When the loop ends, `lo == hi` and it points at the first `True`. Pick this template and **always** use it; most
binary search bugs come from mixing `<` with `<=` or `mid` with `mid - 1` between templates.

### Search Insert Position (LC 35)

"Index of the target, or where it would be inserted" is the first index with `nums[i] >= target`:

```python
def search_insert(nums: list[int], target: int) -> int:
    return first_true(0, len(nums) - 1, lambda i: nums[i] >= target)
```

If every element is smaller, the function returns `len(nums)`, which is exactly the insert position.

### Find First and Last Position (LC 34)

Run "first true" twice:

```python
def search_range(nums: list[int], target: int) -> list[int]:
    n = len(nums)
    left = first_true(0, n - 1, lambda i: nums[i] >= target)
    if left == n or nums[left] != target:
        return [-1, -1]
    right = first_true(0, n - 1, lambda i: nums[i] > target) - 1
    return [left, right]
```

## Rotated sorted arrays (LC 33)

`[4, 5, 6, 7, 0, 1, 2]` is a sorted array rotated at some point. Pick any `mid`: **at least one half is sorted**.
Check whether the target lies inside the sorted half's range; if yes go there, otherwise go to the other half.

```python
def search_rotated(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:                 # left half is sorted
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:                                     # right half is sorted
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1
```

The `<=` in `nums[lo] <= nums[mid]` matters when `lo == mid` (a range of one or two elements).

## Binary search on the answer: Koko Eating Bananas (LC 875)

Koko has piles of bananas and `h` hours. At speed `k` she eats `k` bananas per hour from one pile (a pile smaller
than `k` still takes a full hour). Find the **smallest** `k` that finishes in time.

There is no sorted array, but the answer space is sorted: if speed `k` works, every faster speed works too. So
`ok(k)` goes false … false, true … true, and we want the first true.

- Smallest possible speed: 1. Largest needed: `max(piles)` (one pile per hour).
- Hours at speed `k`: the sum of `ceil(pile / k)`, written in integers as `(pile + k - 1) // k`.

```python
def min_eating_speed(piles: list[int], h: int) -> int:
    def ok(k: int) -> bool:
        hours = sum((p + k - 1) // k for p in piles)
        return hours <= h
    return first_true(1, max(piles), ok)

print(min_eating_speed([3, 6, 7, 11], 8))   # 4
```

Cost: O(n log m), where m is the largest pile. This "binary search on the answer with a feasibility check" shape
returns in many interview problems (shipping capacity, splitting arrays, minimum days).

## Common traps

| Trap | Fix |
|---|---|
| Infinite loop | with `lo < hi`, always move `lo = mid + 1` or `hi = mid`, never `lo = mid` |
| Off-by-one at the end | decide what `lo` means when the loop stops, and write it in a comment |
| Wrong search range on the answer | the range must contain the answer: `[1, max(piles)]`, not `[0, len(piles)]` |
| Using it on unsorted data | binary search needs order, either in the array or in the yes/no condition |

## This week's problems

| Problem | Pattern | Hint |
|---|---|---|
| [Binary Search (LeetCode 704)](https://leetcode.com/problems/binary-search/) | exact match | Template 1 |
| [Search Insert Position (LeetCode 35)](https://leetcode.com/problems/search-insert-position/) | first true | first index with `nums[i] >= target` |
| [First Bad Version (LeetCode 278)](https://leetcode.com/problems/first-bad-version/) | first true | warm-up: the condition is given to you |
| [Find First and Last Position of Element in Sorted Array (LeetCode 34)](https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/) | first true, twice | `>= target`, then `> target` minus one |
| [Find Minimum in Rotated Sorted Array (LeetCode 153)](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/) | rotated | stretch: compare `nums[mid]` with `nums[hi]` |
| [Search in Rotated Sorted Array (LeetCode 33)](https://leetcode.com/problems/search-in-rotated-sorted-array/) | rotated | one half is always sorted |
| [Koko Eating Bananas (LeetCode 875)](https://leetcode.com/problems/koko-eating-bananas/) | search on the answer | range `[1, max(piles)]`, check with ceiling division |

This week's assessment includes two binary search problems, so solve every one without looking at the code above first, then compare.

## Practice beyond class

Week 9 of the **Pattern Path** sheet has the full set, including Sqrt(x) and Search a 2D Matrix. For each problem,
write in your DSA tracker what the yes/no condition was. Spotting that condition is the whole skill.
